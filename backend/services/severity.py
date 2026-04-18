"""Deterministic severity scoring and specialist routing."""

import json
from pathlib import Path

from models.schemas import ScoredBiomarker, SeverityLevel, VerifiedBiomarker

# Load ICMR DB once.
_DB_PATH = Path(__file__).parent.parent / "data" / "clinical_abbreviations_reference.json"
with open(_DB_PATH, encoding="utf-8") as f:
    _RAW = json.load(f)
ICMR_DB = {k: v for k, v in _RAW.items() if not k.startswith("_")}

# Critical thresholds (hardcoded; not AI-derived).
CRITICAL_THRESHOLDS: dict[str, dict] = {
    "HGB": {"critical_low": 7.0, "critical_high": 20.0, "emergency_low": None},
    "HBA1C": {"critical_low": None, "critical_high": 14.0, "emergency_low": None},
    "GLUCOSE_F": {"critical_low": 40.0, "critical_high": 450.0, "emergency_low": None},
    "TSH": {"critical_low": 0.01, "critical_high": 50.0, "emergency_low": None},
    "CHOL_TOTAL": {"critical_low": None, "critical_high": 500.0, "emergency_low": None},
    "LDL": {"critical_low": None, "critical_high": 300.0, "emergency_low": None},
    "HDL": {"critical_low": 20.0, "critical_high": None, "emergency_low": None},
    "TRIGLYCERIDES": {"critical_low": None, "critical_high": 1000.0, "emergency_low": None},
    "CREATININE": {"critical_low": None, "critical_high": 10.0, "emergency_low": None},
    "UREA": {"critical_low": None, "critical_high": 100.0, "emergency_low": None},
    "ALT": {"critical_low": None, "critical_high": 500.0, "emergency_low": None},
    "AST": {"critical_low": None, "critical_high": 500.0, "emergency_low": None},
    "URIC_ACID": {"critical_low": None, "critical_high": 12.0, "emergency_low": None},
    "PLATELETS": {
        "critical_low": 50_000,
        "critical_high": 1_000_000,
        "emergency_low": 20_000,
    },
    "WBC": {"critical_low": 2_000, "critical_high": 30_000, "emergency_low": None},
}

EMERGENCY_FLAGS = {"crit", "critical", "c", "panic", "h*", "l*", "hh", "ll"}
ABNORMAL_FLAGS = {"h", "l", "high", "low", "a", "abnormal", "e", "elevated"}

SPECIALIST_TREE = [
    (
        {"HGB": "low", "WBC": "low", "PLATELETS": "low"},
        "Hematologist",
        "within 1 week",
    ),
    (
        {"CREATININE": "high", "UREA": "high", "URIC_ACID": "high"},
        "Nephrologist",
        "within 48 hours",
    ),
    (
        {"ALT": "high", "AST": "high"},
        "Hepatologist / Gastroenterologist",
        "within 1 week",
    ),
    (
        {"HBA1C": "high", "GLUCOSE_F": "high"},
        "Diabetologist",
        "within 1 week",
    ),
    (
        {"CHOL_TOTAL": "high", "LDL": "high", "TRIGLYCERIDES": "high"},
        "Cardiologist",
        "within 2 weeks",
    ),
    ({"HGB": "low"}, "General Physician", "within 1 week"),
    ({"PLATELETS": "low"}, "Hematologist", "within 3 days"),
    ({"CREATININE": "high"}, "Nephrologist", "within 1 week"),
    ({"UREA": "high"}, "Nephrologist", "within 1 week"),
    ({"TSH": "high"}, "Endocrinologist", "within 2 weeks"),
    ({"TSH": "low"}, "Endocrinologist", "within 2 weeks"),
    ({"HBA1C": "high"}, "Diabetologist", "within 1 week"),
    ({"GLUCOSE_F": "high"}, "Diabetologist", "within 1 week"),
    ({"ALT": "high"}, "Hepatologist", "within 1 week"),
    ({"AST": "high"}, "Hepatologist", "within 1 week"),
    ({"CHOL_TOTAL": "high"}, "Cardiologist / General Physician", "within 2 weeks"),
    ({"LDL": "high"}, "Cardiologist / General Physician", "within 2 weeks"),
    ({"WBC": "high"}, "General Physician", "within 3 days — possible infection"),
    ({"WBC": "low"}, "Hematologist", "within 3 days"),
    ({"URIC_ACID": "high"}, "Rheumatologist / General Physician", "within 2 weeks"),
    ({"HDL": "low"}, "Cardiologist / General Physician", "within 2 weeks"),
]

EMERGENCY_MESSAGES: dict[str, str] = {
    "HGB": "Critically low hemoglobin. Severe anemia — go to a hospital today.",
    "GLUCOSE_F": "Blood sugar is at a dangerous level. Go to a hospital immediately.",
    "PLATELETS": (
        "Platelet count is critically low — severe bleeding risk. "
        "Go to hospital today. Possible dengue or blood disorder."
    ),
    "CREATININE": "Creatinine is critically high — possible acute kidney failure. Go to a hospital today.",
    "WBC": "White blood cell count is critically abnormal. Go to a hospital today.",
    "TSH": "Thyroid hormone level is critically abnormal. See a doctor urgently.",
    "ALT": "Liver enzymes are critically elevated — possible acute liver injury. Go to a hospital today.",
    "AST": "Liver enzymes are critically elevated — possible acute liver injury. Go to a hospital today.",
    "TRIGLYCERIDES": "Triglycerides are dangerously high — risk of acute pancreatitis. Go to a hospital today.",
    "HBA1C": "HbA1c is critically high — very poorly controlled diabetes. See a diabetologist urgently.",
}

GENERIC_EMERGENCY_MESSAGE = (
    "One or more values are critically abnormal. "
    "Go to a hospital or doctor today. Show them this screen."
)


def score(bio: VerifiedBiomarker) -> ScoredBiomarker:
    """
    Deterministic severity classification.
    """
    key = bio.normalized_name

    if not bio.is_physiologically_valid:
        return ScoredBiomarker(
            **bio.model_dump(exclude={"needs_manual_review"}),
            needs_manual_review=bio.needs_manual_review,
            severity=SeverityLevel.UNKNOWN,
            deviation_score=0.0,
        )

    if bio.active_ref_low is None or bio.active_ref_high is None:
        flag = (bio.lab_flag or "").lower().strip()
        if flag in EMERGENCY_FLAGS:
            return ScoredBiomarker(
                **bio.model_dump(exclude={"needs_manual_review"}),
                needs_manual_review=bio.needs_manual_review,
                severity=SeverityLevel.EMERGENCY,
                deviation_score=99.0,
            )
        if flag in ABNORMAL_FLAGS:
            return ScoredBiomarker(
                **bio.model_dump(exclude={"needs_manual_review"}),
                needs_manual_review=bio.needs_manual_review,
                severity=SeverityLevel.WATCH,
                deviation_score=1.0,
            )
        return ScoredBiomarker(
            **bio.model_dump(exclude={"needs_manual_review"}),
            needs_manual_review=bio.needs_manual_review,
            severity=SeverityLevel.UNKNOWN,
            deviation_score=0.0,
        )

    value = bio.value
    flag = (bio.lab_flag or "").lower().strip()

    if flag in EMERGENCY_FLAGS:
        return ScoredBiomarker(
            **bio.model_dump(exclude={"needs_manual_review"}),
            needs_manual_review=bio.needs_manual_review,
            severity=SeverityLevel.EMERGENCY,
            deviation_score=99.0,
        )

    if key and key in CRITICAL_THRESHOLDS:
        t = CRITICAL_THRESHOLDS[key]
        if t.get("emergency_low") and value <= t["emergency_low"]:
            return ScoredBiomarker(
                **bio.model_dump(exclude={"needs_manual_review"}),
                needs_manual_review=bio.needs_manual_review,
                severity=SeverityLevel.EMERGENCY,
                deviation_score=99.0,
            )
        if t.get("critical_low") is not None and value <= t["critical_low"]:
            return ScoredBiomarker(
                **bio.model_dump(exclude={"needs_manual_review"}),
                needs_manual_review=bio.needs_manual_review,
                severity=SeverityLevel.EMERGENCY,
                deviation_score=95.0,
            )
        if t.get("critical_high") is not None and value >= t["critical_high"]:
            return ScoredBiomarker(
                **bio.model_dump(exclude={"needs_manual_review"}),
                needs_manual_review=bio.needs_manual_review,
                severity=SeverityLevel.EMERGENCY,
                deviation_score=95.0,
            )

    lo = bio.active_ref_low
    hi = bio.active_ref_high
    mid = (lo + hi) / 2
    half_range = (hi - lo) / 2
    deviation = 0.0 if half_range == 0 else abs(value - mid) / half_range

    # HDL is directional: low is bad, high is generally protective.
    if key == "HDL" and value >= lo:
        return ScoredBiomarker(
            **bio.model_dump(exclude={"needs_manual_review"}),
            needs_manual_review=bio.needs_manual_review,
            severity=SeverityLevel.NORMAL,
            deviation_score=round(deviation, 2),
        )

    if deviation > 2.0:
        severity = SeverityLevel.ACT_NOW
    elif deviation > 0.8:
        severity = SeverityLevel.WATCH
    else:
        severity = SeverityLevel.NORMAL

    if flag in ABNORMAL_FLAGS and severity == SeverityLevel.NORMAL:
        severity = SeverityLevel.WATCH

    return ScoredBiomarker(
        **bio.model_dump(exclude={"needs_manual_review"}),
        needs_manual_review=bio.needs_manual_review,
        severity=severity,
        deviation_score=round(deviation, 2),
    )


def score_all(biomarkers: list[VerifiedBiomarker]) -> list[ScoredBiomarker]:
    return [score(b) for b in biomarkers]


def overall_severity(scored: list[ScoredBiomarker]) -> SeverityLevel:
    """
    Worst biomarker determines overall severity.
    UNKNOWN is lowest priority (data-quality signal).
    """
    priority = {
        SeverityLevel.EMERGENCY: 4,
        SeverityLevel.ACT_NOW: 3,
        SeverityLevel.WATCH: 2,
        SeverityLevel.NORMAL: 1,
        SeverityLevel.UNKNOWN: 0,
    }
    if not scored:
        return SeverityLevel.UNKNOWN
    return max((b.severity for b in scored), key=lambda s: priority[s])


def get_emergency_message(scored: list[ScoredBiomarker]) -> str | None:
    """
    Return specific emergency message when possible, else generic.
    """
    critical = [b for b in scored if b.severity == SeverityLevel.EMERGENCY]
    if not critical:
        return None
    if len(critical) == 1 and critical[0].normalized_name in EMERGENCY_MESSAGES:
        return EMERGENCY_MESSAGES[critical[0].normalized_name]
    return GENERIC_EMERGENCY_MESSAGE


def recommend_specialist(scored: list[ScoredBiomarker]) -> tuple[str | None, str | None]:
    """
    Match abnormal biomarkers against specialist tree.
    """
    flagged: dict[str, str] = {}

    for b in scored:
        if b.severity in (SeverityLevel.WATCH, SeverityLevel.ACT_NOW, SeverityLevel.EMERGENCY):
            if b.normalized_name and b.active_ref_low is not None:
                if b.value < b.active_ref_low:
                    flagged[b.normalized_name] = "low"
                elif b.active_ref_high is not None and b.value > b.active_ref_high:
                    flagged[b.normalized_name] = "high"
                elif b.lab_flag:
                    fl = b.lab_flag.lower()
                    if fl in ("l", "low", "ll"):
                        flagged[b.normalized_name] = "low"
                    elif fl in ("h", "high", "hh"):
                        flagged[b.normalized_name] = "high"

    if not flagged:
        return None, None

    for pattern, specialist, urgency in SPECIALIST_TREE:
        if all(flagged.get(k) == v for k, v in pattern.items()):
            return specialist, urgency

    return "General Physician", "within 2 weeks"

