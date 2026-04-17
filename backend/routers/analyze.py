# backend/routers/analyze.py

import time
import uuid
from fastapi import APIRouter, UploadFile, File, Form, HTTPException
from models.schemas import AnalysisResult, PatientContext, SeverityLevel
from services.verifier  import verify_all, get_coverage_stats
from services.severity  import score_all, overall_severity, get_emergency_message, recommend_specialist
from services.explainer import explain_all

router = APIRouter()

ALLOWED_TYPES = {
    "application/pdf",
    "image/jpeg",
    "image/jpg",
    "image/png",
    "image/webp",
}

MAX_FILE_SIZE = 20 * 1024 * 1024  # 20MB


@router.post("/analyze", response_model=AnalysisResult)
async def analyze_report(
    file:   UploadFile = File(...),
    age:    int        = Form(default=35),
    gender: str        = Form(default="male"),
):
    start_ms = time.time()

    # ── Validate file ────────────────────────────────────────────
    if file.content_type not in ALLOWED_TYPES:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported file type: {file.content_type}. Send PDF, JPG, PNG, or WEBP."
        )

    content = await file.read()

    if len(content) > MAX_FILE_SIZE:
        raise HTTPException(
            status_code=400,
            detail="File too large. Maximum size is 20MB."
        )

    if len(content) < 100:
        raise HTTPException(
            status_code=400,
            detail="File appears empty or corrupt."
        )

    # ── Validate patient context ─────────────────────────────────
    try:
        ctx = PatientContext(age=age, gender=gender)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

    # ── Layer 1: Extract ─────────────────────────────────────────
    # Import here to avoid circular at module load
    from services.extractor import extract

    try:
        raw_biomarkers = await extract(content, file.content_type)
    except Exception as e:
        raise HTTPException(
            status_code=422,
            detail=f"Could not extract data from this file. Try a clearer scan or use manual entry. Detail: {str(e)}"
        )

    if not raw_biomarkers:
        raise HTTPException(
            status_code=422,
            detail="No biomarker values found in this file. Try a clearer scan or manual entry."
        )

    # ── Layer 2: Verify ──────────────────────────────────────────
    verified = verify_all(raw_biomarkers, age=ctx.age, gender=ctx.gender)

    # ── Layer 3: Score ───────────────────────────────────────────
    scored = score_all(verified)

    # ── Layer 4: Explain ─────────────────────────────────────────
    explained, ai_diverged = await explain_all(scored)

    # ── Aggregate ────────────────────────────────────────────────
    worst              = overall_severity(scored)
    emergency_msg      = get_emergency_message(scored)
    specialist, urgency = recommend_specialist(scored)
    stats              = get_coverage_stats(verified)

    return AnalysisResult(
        report_id              = str(uuid.uuid4()),
        overall_severity       = worst,
        biomarkers             = explained,
        flagged_for_review     = stats["flagged_for_review"],
        specialist_recommendation = specialist,
        urgency_timeline       = urgency,
        emergency_message      = emergency_msg,
        ai_diverged            = ai_diverged,
        processing_time_ms     = int((time.time() - start_ms) * 1000),
        total_biomarkers       = stats["total"],
        recognized_biomarkers  = stats["recognized_icmr"],
        unknown_biomarkers     = stats["unknown"],
    )


# ── Manual entry endpoint ────────────────────────────────────────
# For when OCR fails or user wants to type values directly

from pydantic import BaseModel
from typing import List, Optional

class ManualBiomarker(BaseModel):
    name:      str
    value:     float
    unit:      str
    ref_low:   Optional[float] = None
    ref_high:  Optional[float] = None
    flag:      Optional[str]   = None

class ManualEntryRequest(BaseModel):
    biomarkers: List[ManualBiomarker]
    age:        int  = 35
    gender:     str  = "male"

@router.post("/analyze/manual", response_model=AnalysisResult)
async def analyze_manual(req: ManualEntryRequest):
    start_ms = time.time()

    from models.schemas import ExtractedBiomarker, ExtractionSource

    try:
        ctx = PatientContext(age=req.age, gender=req.gender)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

    # Convert manual input → ExtractedBiomarker
    raw_biomarkers = [
        ExtractedBiomarker(
            raw_name              = b.name,
            normalized_name       = None,
            loinc_code            = None,
            value                 = b.value,
            unit                  = b.unit,
            lab_ref_low           = b.ref_low,
            lab_ref_high          = b.ref_high,
            lab_flag              = b.flag,
            extraction_source     = ExtractionSource.MANUAL,
            extraction_confidence = 1.0,  # user typed it — full confidence
        )
        for b in req.biomarkers
    ]

    verified           = verify_all(raw_biomarkers, ctx.age, ctx.gender)
    scored             = score_all(verified)
    explained, diverged = await explain_all(scored)
    worst              = overall_severity(scored)
    emergency_msg      = get_emergency_message(scored)
    specialist, urgency = recommend_specialist(scored)
    stats              = get_coverage_stats(verified)

    return AnalysisResult(
        report_id              = str(uuid.uuid4()),
        overall_severity       = worst,
        biomarkers             = explained,
        flagged_for_review     = stats["flagged_for_review"],
        specialist_recommendation = specialist,
        urgency_timeline       = urgency,
        emergency_message      = emergency_msg,
        ai_diverged            = diverged,
        processing_time_ms     = int((time.time() - start_ms) * 1000),
        total_biomarkers       = stats["total"],
        recognized_biomarkers  = stats["recognized_icmr"],
        unknown_biomarkers     = stats["unknown"],
    )