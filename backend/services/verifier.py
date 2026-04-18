import json, re
from pathlib import Path
from models.schemas import (
    ExtractedBiomarker, VerifiedBiomarker,
    RangeSource
)

_DB_PATH = Path(__file__).parent.parent / "data" / "icmr_ranges.json"
with open(_DB_PATH, encoding="utf-8") as f:
    _RAW = json.load(f)
ICMR_DB = {k: v for k, v in _RAW.items() if not k.startswith("_")}

# Build alias map
ALIAS_MAP: dict[str, str] = {}
for key, entry in ICMR_DB.items():
    for alias in entry.get("aliases", []):
        ALIAS_MAP[alias.lower().strip()] = key

PHYSIO_BOUNDS: dict[str, tuple[float, float]] = {
    k: (v["physiological_min"], v["physiological_max"])
    for k, v in ICMR_DB.items()
    if "physiological_min" in v
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

    # Fix display unit
    u = bio.unit.lower().strip()
    if unit_factor in (1_000, 100_000) and ("k/u" in u or "lakh" in u or "thou" in u):
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

