"""Typed schemas shared across extraction, verification, scoring and API layers."""

from enum import Enum
from typing import List, Optional

from pydantic import BaseModel, field_validator


class SeverityLevel(str, Enum):
    NORMAL = "NORMAL"
    WATCH = "WATCH"
    ACT_NOW = "ACT_NOW"
    EMERGENCY = "EMERGENCY"
    UNKNOWN = "UNKNOWN"


class RangeSource(str, Enum):
    LAB = "lab"
    ICMR = "icmr"
    UNAVAILABLE = "unavailable"


class ExtractionSource(str, Enum):
    PYMUPDF = "pymupdf"
    AZURE_DI = "azure_di"
    MANUAL = "manual"


class ExtractedBiomarker(BaseModel):
    raw_name: str
    normalized_name: Optional[str]
    loinc_code: Optional[str]
    value: float
    unit: str
    lab_ref_low: Optional[float]
    lab_ref_high: Optional[float]
    lab_flag: Optional[str]
    extraction_source: ExtractionSource
    extraction_confidence: float


class VerifiedBiomarker(ExtractedBiomarker):
    active_ref_low: Optional[float]
    active_ref_high: Optional[float]
    range_source: RangeSource
    is_physiologically_valid: bool
    needs_manual_review: bool


class ScoredBiomarker(VerifiedBiomarker):
    severity: SeverityLevel
    deviation_score: float


class ExplainedBiomarker(ScoredBiomarker):
    explanation_en: str
    explanation_hi: str
    explanation_mr: str
    diet_tip_en: Optional[str]
    diet_tip_hi: Optional[str]


class AnalysisResult(BaseModel):
    report_id: str
    overall_severity: SeverityLevel
    biomarkers: List[ExplainedBiomarker]
    flagged_for_review: List[str]
    specialist_recommendation: Optional[str]
    urgency_timeline: Optional[str]
    emergency_message: Optional[str]
    ai_diverged: bool
    processing_time_ms: int
    total_biomarkers: int
    recognized_biomarkers: int
    unknown_biomarkers: int


class PatientContext(BaseModel):
    age: int = 35
    gender: str = "male"

    @field_validator("gender")
    @classmethod
    def validate_gender(cls, v: str) -> str:
        if v.lower() not in ["male", "female", "child"]:
            raise ValueError("gender must be male, female, or child")
        return v.lower()

    @field_validator("age")
    @classmethod
    def validate_age(cls, v: int) -> int:
        if not (0 < v < 120):
            raise ValueError("age must be between 1 and 119")
        return v

