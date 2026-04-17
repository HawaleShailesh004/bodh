# backend/test_mock.py
# Run: python test_mock.py

import asyncio
import sys
from pathlib import Path

from dotenv import load_dotenv

load_dotenv()
sys.stdout.reconfigure(encoding="utf-8")
from models.schemas import ExtractedBiomarker, ExtractionSource
from services.verifier  import verify_all
from services.severity  import score_all, overall_severity, get_emergency_message, recommend_specialist
from services.explainer import explain_all

# Simulate a CBC report with mild anemia
MOCK_CBC = [
    ExtractedBiomarker(
        raw_name="Hemoglobin", normalized_name=None, loinc_code=None,
        value=9.8, unit="g/dL",
        lab_ref_low=13.0, lab_ref_high=17.0, lab_flag="L",
        extraction_source=ExtractionSource.MANUAL,
        extraction_confidence=1.0
    ),
    ExtractedBiomarker(
        raw_name="Platelet Count", normalized_name=None, loinc_code=None,
        value=1.8, unit="Lakhs/cumm",
        lab_ref_low=1.5, lab_ref_high=4.0, lab_flag=None,
        extraction_source=ExtractionSource.MANUAL,
        extraction_confidence=1.0
    ),
    ExtractedBiomarker(
        raw_name="TLC", normalized_name=None, loinc_code=None,
        value=7200, unit="/cumm",
        lab_ref_low=4000, lab_ref_high=10000, lab_flag=None,
        extraction_source=ExtractionSource.MANUAL,
        extraction_confidence=1.0
    ),
    ExtractedBiomarker(
        raw_name="FBS", normalized_name=None, loinc_code=None,
        value=112, unit="mg/dL",
        lab_ref_low=70, lab_ref_high=100, lab_flag="H",
        extraction_source=ExtractionSource.MANUAL,
        extraction_confidence=1.0
    ),
    ExtractedBiomarker(
        raw_name="SGPT", normalized_name=None, loinc_code=None,
        value=38, unit="U/L",
        lab_ref_low=7, lab_ref_high=56, lab_flag=None,
        extraction_source=ExtractionSource.MANUAL,
        extraction_confidence=1.0
    ),
]

async def run():
    print("\n── VERIFYING ───────────────────────────────")
    verified = verify_all(MOCK_CBC, age=42, gender="male")
    for v in verified:
        print(f"  {v.raw_name:20} → norm: {v.normalized_name:12} "
              f"range: {v.active_ref_low}-{v.active_ref_high} "
              f"src: {v.range_source}")

    print("\n── SCORING ─────────────────────────────────")
    scored = score_all(verified)
    for s in scored:
        print(f"  {s.raw_name:20} value: {s.value:8} "
              f"severity: {s.severity:10} dev: {s.deviation_score:.2f}")

    print(f"\n  Overall severity : {overall_severity(scored)}")
    print(f"  Emergency msg    : {get_emergency_message(scored)}")
    spec, urg = recommend_specialist(scored)
    print(f"  Specialist       : {spec}")
    print(f"  Urgency          : {urg}")

    print("\n── EXPLAINING (calls real APIs) ────────────")
    explained, diverged = await explain_all(scored)
    for e in explained:
        print(f"\n  [{e.severity}] {e.raw_name}")
        print(f"  EN: {e.explanation_en}")
        print(f"  HI: {e.explanation_hi}")
        print(f"  TIP: {e.diet_tip_en}")
    print(f"\n  AI diverged: {diverged}")


async def test_pdf():
    from services.extractor import extract

    pdf_path = Path("test_report.pdf")
    if not pdf_path.exists():
        print("\n── PDF TEST SKIPPED (no test_report.pdf found) ──")
        return

    print("\n── PDF EXTRACTION TEST ──────────────────────────")
    with open(pdf_path, "rb") as f:
        content = f.read()

    raw = await extract(content, "application/pdf")
    print(f"  Extracted {len(raw)} biomarkers:")
    for b in raw:
        print(
            f"  {b.raw_name:25} {b.value:10} {b.unit:12} "
            f"ref: {b.lab_ref_low}-{b.lab_ref_high}  "
            f"conf: {b.extraction_confidence:.2f}  "
            f"src: {b.extraction_source}"
        )


asyncio.run(run())
# asyncio.run(test_pdf())