import json, os, re
from collections import defaultdict
from pathlib import Path
from models.schemas import (
    ExtractedBiomarker, VerifiedBiomarker,
    RangeSource
)

_DB_PATH = Path(__file__).parent.parent / "data" / "clinical_abbreviations_reference.json"
with open(_DB_PATH, encoding="utf-8") as f:
    _RAW = json.load(f)
ICMR_DB = {k: v for k, v in _RAW.items() if not k.startswith("_")}


def _validate_icmr_db() -> None:
    """
    Startup checks after loading the ICMR DB JSON: schema hints + alias collisions.
    Set ICMR_STRICT=1 to raise on collisions (CI); default is warn-only.
    """
    strict = os.getenv("ICMR_STRICT", "").strip() in ("1", "true", "yes")

    required_keys = ("aliases", "ranges", "default_range")
    pick_range_keys = frozenset(
        {"male_adult", "female_adult", "child_6_14", "child"},
    )

    for key, entry in ICMR_DB.items():
        missing = [f for f in required_keys if f not in entry]
        if missing:
            print(f"  [icmr] WARNING: {key!r} missing top-level keys: {missing}")

        aliases = entry.get("aliases")
        if not aliases or not isinstance(aliases, list):
            print(f"  [icmr] WARNING: {key!r} has no usable aliases list")

        dr = entry.get("default_range")
        if isinstance(dr, dict):
            if "low" not in dr or "high" not in dr:
                print(
                    f"  [icmr] WARNING: {key!r} default_range must have numeric "
                    f"'low' and 'high' (got keys: {list(dr.keys())})"
                )
        elif dr is not None:
            print(f"  [icmr] WARNING: {key!r} default_range should be a dict with low/high")

        ranges = entry.get("ranges") or {}
        has_pick = isinstance(ranges, dict) and any(
            k in ranges for k in pick_range_keys
        )
        dr_ok = isinstance(dr, dict) and "low" in dr and "high" in dr
        if isinstance(ranges, dict) and ranges and not has_pick and not dr_ok:
            print(
                f"  [icmr] WARNING: {key!r} has no male_adult/female_adult/child ranges "
                f"and no valid default_range — _pick_range() will return None"
            )

        if "physiological_min" not in entry or "physiological_max" not in entry:
            print(
                f"  [icmr] WARNING: {key!r} missing physiological_min / physiological_max "
                f"(physiology check skipped for this test)"
            )
        elif entry["physiological_min"] is None or entry["physiological_max"] is None:
            print(
                f"  [icmr] WARNING: {key!r} physiological_min/max are null "
                f"(physiology check skipped)"
            )

    alias_hits: dict[str, list[str]] = defaultdict(list)
    for key, entry in ICMR_DB.items():
        for alias in entry.get("aliases", []) or []:
            if not isinstance(alias, str) or not alias.strip():
                continue
            a = alias.lower().strip()
            alias_hits[a].append(key)

    collisions: dict[str, list[str]] = {}
    for alias, keys in alias_hits.items():
        uniq = list(dict.fromkeys(keys))
        if len(uniq) > 1:
            collisions[alias] = uniq

    if collisions:
        msg = f"[icmr] ALIAS COLLISIONS ({len(collisions)} aliases map to multiple keys):"
        if strict:
            raise ValueError(f"{msg} {collisions!r}")
        print(f"  {msg}")
        for al, keys in sorted(collisions.items(), key=lambda x: x[0])[:25]:
            print(f"    {al!r} -> {keys}")
        if len(collisions) > 25:
            print(f"    ... and {len(collisions) - 25} more")


_validate_icmr_db()

# Build alias map (last alias occurrence wins — collisions should be fixed in JSON)
ALIAS_MAP: dict[str, str] = {}
for key, entry in ICMR_DB.items():
    for alias in entry.get("aliases", []):
        ALIAS_MAP[alias.lower().strip()] = key

PHYSIO_BOUNDS: dict[str, tuple[float, float]] = {
    k: (v["physiological_min"], v["physiological_max"])
    for k, v in ICMR_DB.items()
    if "physiological_min" in v
    and v.get("physiological_min") is not None
    and v.get("physiological_max") is not None
}


def normalize_name(raw_name: str) -> tuple[str | None, str | None]:
    cleaned = raw_name.lower().strip()
    cleaned = re.sub(r"[:\-.,;()/]+", " ", cleaned)
    cleaned = re.sub(r"\s+", " ", cleaned).strip()

    if cleaned in ALIAS_MAP:
        key = ALIAS_MAP[cleaned]
        return key, ICMR_DB[key].get("loinc_code")

    words = cleaned.split()
    for length in range(len(words), 0, -1):
        for start in range(len(words) - length + 1):
            phrase = " ".join(words[start:start + length])
            if len(phrase) >= 3 and phrase in ALIAS_MAP:
                key = ALIAS_MAP[phrase]
                return key, ICMR_DB[key].get("loinc_code")

    return None, None


def _unit_normalize(value: float, unit: str, key: str | None) -> tuple[float, float]:
    """
    Returns (normalized_value, conversion_factor).
    Handles K/uL, Lakhs, M/uL etc.
    """
    factor = 1.0
    # Normalize unit string for comparison
    u = unit.lower().strip()
    u_no_slash = u.replace("/", "").replace(" ", "").replace("µ", "u")

    if key == "PLATELETS":
        if "lakh" in u:
            factor = 100_000
        elif u_no_slash in ("kul", "kuL", "thou") or "k/u" in u or "10^3" in u or "10³" in u:
            factor = 1_000
        elif value < 100:
            # almost certainly in Lakhs if value < 100
            factor = 100_000
        elif value < 2000:
            # K/uL reported as 149 etc.
            factor = 1_000

    elif key == "WBC":
        if u_no_slash in ("kul",) or "k/u" in u or "10^3" in u or "10³" in u:
            factor = 1_000
        elif value < 100:
            factor = 1_000

    # Generic: any K/uL unit with small value is thousands
    elif ("k/u" in u or u_no_slash == "kul") and value < 1000:
        factor = 1_000

    return value * factor, factor


def _is_physiologically_valid(key: str | None, value: float) -> bool:
    if key is None or key not in PHYSIO_BOUNDS:
        return True
    lo, hi = PHYSIO_BOUNDS[key]
    return lo <= value <= hi


def _pick_range(entry: dict, age: int, gender: str) -> tuple[float | None, float | None]:
    ranges = entry.get("ranges", {})
    if age < 15:
        r = ranges.get("child_6_14") or ranges.get("child")
        if r:
            return r["low"], r["high"]
    if gender == "female":
        r = ranges.get("female_adult")
        if r:
            return r["low"], r["high"]
    if gender == "male":
        r = ranges.get("male_adult")
        if r:
            return r["low"], r["high"]
    r = entry.get("default_range")
    if r:
        return r["low"], r["high"]
    return None, None


def verify(bio: ExtractedBiomarker, age: int = 35, gender: str = "male") -> VerifiedBiomarker:
    # 1. Normalize name
    norm_name = bio.normalized_name
    loinc_code = bio.loinc_code
    if not norm_name:
        norm_name, loinc_code = normalize_name(bio.raw_name)

    # 2. Unit normalize FIRST — before any validity check
    value, unit_factor = _unit_normalize(bio.value, bio.unit, norm_name)

    # Apply same factor to lab ranges
    lab_ref_low = bio.lab_ref_low * unit_factor if bio.lab_ref_low is not None else None
    lab_ref_high = bio.lab_ref_high * unit_factor if bio.lab_ref_high is not None else None

    # Fix display unit (ICMR uses /µL for counts after scaling from K/µL or Lakhs)
    u = bio.unit.lower().strip()
    if unit_factor in (1_000, 100_000) and ("k/u" in u or "lakh" in u or "thou" in u):
        display_unit = "/µL"
    elif norm_name in ("PLATELETS", "WBC") and unit_factor in (1_000, 100_000):
        # Extraction sometimes drops to placeholder "units" even when value was scaled
        display_unit = "/µL"
    else:
        display_unit = bio.unit

    # 3. Physiological check on CONVERTED value
    is_valid = _is_physiologically_valid(norm_name, value)

    # 4. Range — 3-tier
    active_low: float | None = None
    active_high: float | None = None
    range_source = RangeSource.UNAVAILABLE
    needs_review = not is_valid

    if lab_ref_low is not None and lab_ref_high is not None:
        active_low = lab_ref_low
        active_high = lab_ref_high
        range_source = RangeSource.LAB
    elif norm_name and norm_name in ICMR_DB:
        active_low, active_high = _pick_range(ICMR_DB[norm_name], age, gender)
        if active_low is not None:
            range_source = RangeSource.ICMR

    if active_low is None:
        range_source = RangeSource.UNAVAILABLE
        needs_review = True

    if bio.extraction_confidence < 0.75:
        needs_review = True

    return VerifiedBiomarker(
        **bio.model_dump(exclude={
            "normalized_name", "loinc_code", "value",
            "lab_ref_low", "lab_ref_high", "unit"
        }),
        unit=display_unit,
        normalized_name=norm_name,
        loinc_code=loinc_code,
        value=value,
        lab_ref_low=lab_ref_low,
        lab_ref_high=lab_ref_high,
        active_ref_low=active_low,
        active_ref_high=active_high,
        range_source=range_source,
        is_physiologically_valid=is_valid,
        needs_manual_review=needs_review,
    )


def verify_all(biomarkers: list[ExtractedBiomarker], age: int = 35, gender: str = "male") -> list[VerifiedBiomarker]:
    return [verify(b, age, gender) for b in biomarkers]


def get_coverage_stats(verified: list[VerifiedBiomarker]) -> dict:
    total = len(verified)
    recognized = sum(1 for b in verified if b.normalized_name in ICMR_DB)
    unknown = sum(1 for b in verified if not b.normalized_name or b.normalized_name not in ICMR_DB)
    flagged = [b.raw_name for b in verified if b.needs_manual_review]
    return {
        "total": total,
        "recognized_icmr": recognized,
        "unknown": unknown,
        "flagged_for_review": flagged,
    }

