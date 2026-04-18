from dotenv import load_dotenv; load_dotenv()
from services.extractor import _call_groq
from models.schemas import ScoredBiomarker, SeverityLevel, RangeSource, ExtractionSource, VerifiedBiomarker

import asyncio, json

# Paste the cleaned text from your CBC report manually
test_text = """
White Blood Cell Count  5.4  K/uL  4.0 - 11.0
Red Blood Cell Count  5.20  M/uL  4.40 - 6.00
Hemoglobin  16.0  g/dL  13.5 - 18.0
Platelet Count  149  K/uL  150 - 400  L
Lymphocyte %  23  %  26.0 - 46.0  L
Monocyte %  13  %  2.0 - 12.0  H
"""

async def test():
    from services.extractor import _call_groq
    result = _call_groq(test_text)
    print(json.dumps(result, indent=2))

asyncio.run(test())