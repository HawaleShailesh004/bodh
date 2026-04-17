"""Biomarker verification with lab/ICMR/unavailable range fallback."""

import json
import re
from pathlib import Path

from models.schemas import ExtractedBiomarker, RangeSource, VerifiedBiomarker

# Load ICMR DB once at startup.
_DB_PATH = Path(__file__).parent.parent / "data" / "icmr_ranges.json"

with open(_DB_PATH, encoding="utf-8") as f:
    _RAW = json.load(f)

# Strip metadata keys.
ICMR_DB = {k: v for k, v in _RAW.items() if not k.startswith("_")}

# Build alias -> normalized_key lookup.
ALIAS_MAP: dict[str, str] = {}
for key, entry in ICMR_DB.items():
    for alias in entry.get("aliases", []):
        ALIAS_MAP[alias.lower().strip()] = key

# Physiological impossibility bounds.
PHYSIO_BOUNDS: dict[str, tuple[float, float]] = {
    k: (v["physiological_min"], v["physiological_max"])
    for k, v in ICMR_DB.items()
    if "physiological_min" in v and "physiological_max" in v
}


def normalize_name(raw_name: str) -> tuple[str | None, str | None]:
    """
    Strict matching only.
    Pass 1: exact alias match
    Pass 2: full-word phrase match (no substring fragments)
    """
    cleaned = raw_name.lower().strip()
    cleaned = re.sub(r"[-:.,;()/]+", " ", cleaned)
    cleaned = re.sub(r"\s+", " ", cleaned).strip()

    if cleaned in ALIAS_MAP:
        key = ALIAS_MAP[cleaned]
        return key, ICMR_DB[key].get("loinc_code")

    words = cleaned.split()
    for length in range(len(words), 0, -1):
        for start in range(len(words) - length + 1):
            phrase = " ".join(words[start : start + length])
            if len(phrase) >= 3 and phrase in ALIAS_MAP:
                key = ALIAS_MAP[phrase]
                return key, ICMR_DB[key].get("loinc_code")

    return None, None


def _pick_range(entry: dict, age: int, gender: str) -> tuple[float | None, float | None]:
    """
    Pick the most specific reference range from ICMR entry by demographics.
    Priority: gender+age specific -> gender specific -> default.
    """
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


def _is_physiologically_valid(key: str | None, value: float) -> bool:
    """
    Hard gate for impossible values.
    If key is unknown, return True (cannot validate).
    """
    if key is None or key not in PHYSIO_BOUNDS:
        return True
    lo, hi = PHYSIO_BOUNDS[key]
    return lo <= value <= hi


def _unit_normalize(value: float, unit: str, key: str | None) -> tuple[float, float]:
    """Return (normalized_value, conversion_factor)."""
    factor = 1.0

    if key == "PLATELETS":
        unit_clean = unit.lower().replace(" ", "")
        if "lakh" in unit_clean or (
            value < 100 and unit_clean in ["lakhs/cumm", "lakhs/µl", "l/cumm"]
        ):
            factor = 100_000
        elif "10³" in unit or "10^3" in unit or (
            value < 2000 and "/µl" in unit_clean
        ):
            factor = 1_000

    if key == "WBC":
        unit_clean = unit.lower().replace(" ", "")
        if "10³" in unit or "10^3" in unit or (
            value < 100 and unit_clean in ["thou/µl", "k/µl"]
        ):
            factor = 1_000

    return value * factor, factor


def verify(bio: ExtractedBiomarker, age: int = 35, gender: str = "male") -> VerifiedBiomarker:
    """
    Verify one biomarker with 3-tier range fallback:
    Tier 1: lab printed range
    Tier 2: ICMR range
    Tier 3: unavailable
    """
    norm_name = bio.normalized_name
    loinc_code = bio.loinc_code
    if not norm_name:
        norm_name, loinc_code = normalize_name(bio.raw_name)

    value, unit_factor = _unit_normalize(bio.value, bio.unit, norm_name)
    if unit_factor == 100_000 and "lakh" in bio.unit.lower():
        display_unit = "/µL"
    elif unit_factor == 1_000:
        display_unit = "/µL"
    else:
        display_unit = bio.unit

    lab_ref_low = bio.lab_ref_low * unit_factor if bio.lab_ref_low is not None else None
    lab_ref_high = bio.lab_ref_high * unit_factor if bio.lab_ref_high is not None else None
    is_valid = _is_physiologically_valid(norm_name, value)

    active_low: float | None = None
    active_high: float | None = None
    range_source = RangeSource.UNAVAILABLE
    needs_review = not is_valid

    # Tier 1: lab's own printed range (unit-converted).
    if lab_ref_low is not None and lab_ref_high is not None:
        active_low = lab_ref_low
        active_high = lab_ref_high
        range_source = RangeSource.LAB
    # Tier 2: ICMR fallback.
    elif norm_name and norm_name in ICMR_DB:
        active_low, active_high = _pick_range(ICMR_DB[norm_name], age, gender)
        if active_low is not None and active_high is not None:
            range_source = RangeSource.ICMR

    # Tier 3: unavailable.
    if active_low is None or active_high is None:
        range_source = RangeSource.UNAVAILABLE
        needs_review = True

    if bio.extraction_confidence < 0.75:
        needs_review = True

    if not is_valid:
        needs_review = True

    return VerifiedBiomarker(
        **bio.model_dump(
            exclude={
                "normalized_name",
                "loinc_code",
                "value",
                "lab_ref_low",
                "lab_ref_high",
                "unit",
            }
        ),
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


def verify_all(
    biomarkers: list[ExtractedBiomarker], age: int = 35, gender: str = "male"
) -> list[VerifiedBiomarker]:
    return [verify(b, age, gender) for b in biomarkers]


def get_coverage_stats(verified: list[VerifiedBiomarker]) -> dict:
    """
    Return transparent coverage stats for UI/reporting.
    """
    total = len(verified)
    recognized = sum(1 for b in verified if b.normalized_name in ICMR_DB)
    unknown = sum(1 for b in verified if b.normalized_name is None or b.normalized_name not in ICMR_DB)
    flagged = [b.raw_name for b in verified if b.needs_manual_review]

    return {
        "total": total,
        "recognized_icmr": recognized,
        "unknown": unknown,
        "flagged_for_review": flagged,
    }

