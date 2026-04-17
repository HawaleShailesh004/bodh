import hashlib
import json
import os
import re
from pathlib import Path

import pymupdf
from azure.ai.documentintelligence import DocumentIntelligenceClient
from azure.core.credentials import AzureKeyCredential
from groq import Groq

from models.schemas import ExtractedBiomarker, ExtractionSource

_groq_client: Groq | None = None
_azure_client: DocumentIntelligenceClient | None = None
_AZURE_CACHE_DIR = Path(__file__).parent.parent / ".cache" / "azure_di"


def _get_groq() -> Groq:
    global _groq_client
    if _groq_client is None:
        key = os.getenv("GROQ_API_KEY")
        if not key:
            raise RuntimeError("GROQ_API_KEY not set in .env")
        _groq_client = Groq(api_key=key)
    return _groq_client


def _get_azure() -> DocumentIntelligenceClient:
    global _azure_client
    if _azure_client is None:
        endpoint = os.getenv("AZURE_DI_ENDPOINT")
        key = os.getenv("AZURE_DI_KEY")
        if not endpoint or not key:
            raise RuntimeError("AZURE_DI_ENDPOINT and AZURE_DI_KEY not set")
        _azure_client = DocumentIntelligenceClient(
            endpoint=endpoint,
            credential=AzureKeyCredential(key),
        )
    return _azure_client


_PII_PATTERNS = [
    re.compile(r"\b(patient\s*(name|id)|name\s*:)", re.I),
    re.compile(r"\b(age\s*[:/]|dob\s*[:/]|date\s+of\s+birth)", re.I),
    re.compile(r"\b(mobile|phone|contact|tel|fax)\s*[:/]?\s*[\d\-+\s]{8,}", re.I),
    re.compile(r"\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z]{2,}\b", re.I),
    re.compile(r"\b(mr\.?|mrs\.?|ms\.?|dr\.?)\s+[A-Z][a-z]+\s+[A-Z][a-z]+"),
    re.compile(r"\b(address|add\s*:|flat|house|plot|sector|nagar|colony|road|street)\b", re.I),
    re.compile(r"\b(uhid|pid|mrn|reg\s*no|patient\s*id|accession|barcode)\s*[:/]?\s*\w+", re.I),
    re.compile(r"\b(ref\s*by|referred\s*by|consultant|doctor\s*name)\b", re.I),
    re.compile(r"\b\d{6}\b"),
    re.compile(r"\b\d{10}\b"),
]

_METADATA_LINE_PATTERNS = [
    re.compile(r"(collected|reported|received|printed)\s*(on|at|by)\s*[:\-]?\s*[\d/\-:APM\s]+", re.I),
    re.compile(r"(processing\s+location|lab\s+address|branch)", re.I),
    re.compile(r"(page\s+\d+\s+of\s+\d+)", re.I),
    re.compile(r"\*{2,}"),
    re.compile(r"^[-=_]{3,}$"),
]


def strip_pii(text: str) -> str:
    lines = text.split("\n")
    total = len(lines)
    skip_top = min(15, total // 6)
    body_lines = lines[skip_top:]

    clean = []
    for line in body_lines:
        stripped = line.strip()
        if not stripped:
            continue
        if any(p.search(stripped) for p in _METADATA_LINE_PATTERNS):
            continue
        if any(p.search(stripped) for p in _PII_PATTERNS):
            continue
        clean.append(stripped)
    return "\n".join(clean)


_EXTRACTION_SYSTEM = """You are a medical lab report parser. You extract biomarker test results from Indian lab report text.
Extract ONLY true biomarker results with numeric values.
Ignore metadata, patient info, and section titles.
Return JSON only."""

_EXTRACTION_USER = """Extract all biomarker test results from this lab report text. Return JSON only.

REPORT TEXT:
{text}"""


def _call_groq(clean_text: str) -> list[dict]:
    client = _get_groq()
    response = client.chat.completions.create(
        model="llama-3.3-70b-versatile",
        temperature=0.0,
        max_tokens=2048,
        messages=[
            {"role": "system", "content": _EXTRACTION_SYSTEM},
            {"role": "user", "content": _EXTRACTION_USER.format(text=clean_text)},
        ],
        response_format={"type": "json_object"},
    )
    raw = response.choices[0].message.content.strip()
    parsed = json.loads(raw)
    if isinstance(parsed, list):
        return parsed
    for key in ["results", "biomarkers", "tests", "data", "items"]:
        if key in parsed and isinstance(parsed[key], list):
            return parsed[key]
    if isinstance(parsed, dict) and "name" in parsed:
        return [parsed]
    return []


def _parse_ref_range(text: str) -> tuple[float | None, float | None]:
    if not text:
        return None, None
    text = text.strip()
    m = re.search(r"([\d.]+)\s*[-–to]+\s*([\d.]+)", text, re.IGNORECASE)
    if m:
        try:
            return float(m.group(1)), float(m.group(2))
        except ValueError:
            pass
    m = re.search(r"(?:<|upto|up\s+to)\s*([\d.]+)", text, re.IGNORECASE)
    if m:
        return 0.0, float(m.group(1))
    m = re.search(r">\s*([\d.]+)", text)
    if m:
        return float(m.group(1)), 99999.0
    return None, None


def _parse_flag(text: str | None) -> str | None:
    if not text:
        return None
    clean = text.strip().upper()
    known = {"H", "L", "HH", "LL", "C", "CRIT", "CRITICAL", "HIGH", "LOW", "ABNORMAL", "A", "E", "PANIC", "H*", "L*"}
    return clean if clean in known else None


_VALID_UNIT_PATTERN = re.compile(
    r"^(g/dl|g/l|mg/dl|mg/l|mmol/l|µmol/l|umol/l|"
    r"iu/l|u/l|miu/l|uiu/ml|ng/ml|pg/ml|pg|fl|"
    r"%|/µl|/ul|/cumm|/hpf|/lpf|lakhs/cumm|"
    r"million/cu\.mm|thou/µl|k/µl|meq/l|mmhg|"
    r"units|unit|cells/µl|10\^3/µl|10\^6/µl)$",
    re.IGNORECASE,
)


def _clean_unit(unit: str) -> str:
    if not unit:
        return ""
    cleaned = unit.strip()
    if re.match(r"^\d+\.?\d*\s*%$", cleaned):
        return ""
    if re.match(r"^\d+\.?\d*$", cleaned):
        return ""
    lower = cleaned.lower().replace(" ", "")
    if _VALID_UNIT_PATTERN.match(lower):
        return cleaned
    return ""


def _groq_items_to_biomarkers(items: list[dict]) -> list[ExtractedBiomarker]:
    biomarkers = []
    for item in items:
        try:
            name = str(item.get("name", "")).strip()
            value_raw = item.get("value")
            unit = _clean_unit(str(item.get("unit", "")).strip())
            ref_str = str(item.get("ref_range", "")).strip()
            flag_raw = item.get("flag")
            if not name or value_raw is None:
                continue
            try:
                value = float(str(value_raw).replace(",", "").strip())
            except (ValueError, TypeError):
                continue
            if value <= 0 and ref_str == "":
                continue
            ref_low, ref_high = _parse_ref_range(ref_str)
            flag = _parse_flag(flag_raw)
            confidence = 0.80
            if ref_low is not None:
                confidence += 0.12
            if unit:
                confidence += 0.08
            biomarkers.append(
                ExtractedBiomarker(
                    raw_name=name,
                    normalized_name=None,
                    loinc_code=None,
                    value=value,
                    unit=unit or "units",
                    lab_ref_low=ref_low,
                    lab_ref_high=ref_high,
                    lab_flag=flag,
                    extraction_source=ExtractionSource.PYMUPDF,
                    extraction_confidence=round(confidence, 2),
                )
            )
        except Exception:
            continue
    return biomarkers


def _get_pdf_text(pdf_bytes: bytes) -> str:
    doc = pymupdf.open(stream=pdf_bytes, filetype="pdf")
    text = "\n".join(page.get_text() for page in doc)
    doc.close()
    return text


def _is_text_pdf(pdf_bytes: bytes) -> bool:
    doc = pymupdf.open(stream=pdf_bytes, filetype="pdf")
    chars = sum(len(page.get_text()) for page in doc)
    doc.close()
    return chars > 200


def _cache_key(file_bytes: bytes, content_type: str) -> str:
    digest = hashlib.sha256(file_bytes + b"::" + content_type.encode("utf-8")).hexdigest()
    return f"{digest}.txt"


def _extract_azure_di(file_bytes: bytes, content_type: str) -> str:
    _AZURE_CACHE_DIR.mkdir(parents=True, exist_ok=True)
    cache_file = _AZURE_CACHE_DIR / _cache_key(file_bytes, content_type)
    if cache_file.exists():
        print(f"[extractor] azure cache hit: {cache_file.name}")
        return cache_file.read_text(encoding="utf-8")

    print("[extractor] azure cache miss -> calling Azure DI")
    client = _get_azure()
    poller = client.begin_analyze_document(
        "prebuilt-layout",
        body=file_bytes,
        content_type=content_type,
    )
    result = poller.result()
    lines = []
    for table in result.tables:
        grid: dict[int, dict[int, str]] = {}
        for cell in table.cells:
            grid.setdefault(cell.row_index, {})[cell.column_index] = (
                cell.content.strip() if cell.content else ""
            )
        for row_idx in sorted(grid.keys()):
            row = grid[row_idx]
            row_text = "\t".join(row.get(c, "") for c in sorted(row.keys()))
            lines.append(row_text)
    if not lines and result.paragraphs:
        lines = [p.content for p in result.paragraphs if p.content]
    text = "\n".join(lines)
    cache_file.write_text(text, encoding="utf-8")
    print(f"[extractor] azure cached: {cache_file.name}")
    return text


async def extract(file_bytes: bytes, content_type: str) -> list[ExtractedBiomarker]:
    if content_type == "application/pdf":
        if _is_text_pdf(file_bytes):
            raw_text = _get_pdf_text(file_bytes)
        else:
            raw_text = _extract_azure_di(file_bytes, content_type)
    else:
        raw_text = _extract_azure_di(file_bytes, content_type)

    if not raw_text.strip():
        return []

    clean_text = strip_pii(raw_text)
    if not clean_text.strip():
        return []

    try:
        items = _call_groq(clean_text)
        biomarkers = _groq_items_to_biomarkers(items)
    except Exception as e:
        print(f"[extractor] Groq failed: {e}")
        return []

    return biomarkers
import hashlib
import json
import os
import re
from pathlib import Path

import pymupdf
from azure.ai.documentintelligence import DocumentIntelligenceClient
from azure.core.credentials import AzureKeyCredential
from groq import Groq

from models.schemas import ExtractedBiomarker, ExtractionSource

_groq_client: Groq | None = None
_azure_client: DocumentIntelligenceClient | None = None
_AZURE_CACHE_DIR = Path(__file__).parent.parent / ".cache" / "azure_di"


def _get_groq() -> Groq:
    global _groq_client
    if _groq_client is None:
        key = os.getenv("GROQ_API_KEY")
        if not key:
            raise RuntimeError("GROQ_API_KEY not set in .env")
        _groq_client = Groq(api_key=key)
    return _groq_client


def _get_azure() -> DocumentIntelligenceClient:
    global _azure_client
    if _azure_client is None:
        endpoint = os.getenv("AZURE_DI_ENDPOINT")
        key = os.getenv("AZURE_DI_KEY")
        if not endpoint or not key:
            raise RuntimeError("AZURE_DI_ENDPOINT and AZURE_DI_KEY not set")
        _azure_client = DocumentIntelligenceClient(
            endpoint=endpoint,
            credential=AzureKeyCredential(key),
        )
    return _azure_client


_PII_PATTERNS = [
    re.compile(r"\b(patient\s*(name|id)|name\s*:)", re.I),
    re.compile(r"\b(age\s*[:/]|dob\s*[:/]|date\s+of\s+birth)", re.I),
    re.compile(r"\b(mobile|phone|contact|tel|fax)\s*[:/]?\s*[\d\-+\s]{8,}", re.I),
    re.compile(r"\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z]{2,}\b", re.I),
    re.compile(r"\b(mr\.?|mrs\.?|ms\.?|dr\.?)\s+[A-Z][a-z]+\s+[A-Z][a-z]+"),
    re.compile(r"\b(address|add\s*:|flat|house|plot|sector|nagar|colony|road|street)\b", re.I),
    re.compile(r"\b(uhid|pid|mrn|reg\s*no|patient\s*id|accession|barcode)\s*[:/]?\s*\w+", re.I),
    re.compile(r"\b(ref\s*by|referred\s*by|consultant|doctor\s*name)\b", re.I),
    re.compile(r"\b\d{6}\b"),
    re.compile(r"\b\d{10}\b"),
]

_METADATA_LINE_PATTERNS = [
    re.compile(r"(collected|reported|received|printed)\s*(on|at|by)\s*[:\-]?\s*[\d/\-:APM\s]+", re.I),
    re.compile(r"(processing\s+location|lab\s+address|branch)", re.I),
    re.compile(r"(page\s+\d+\s+of\s+\d+)", re.I),
    re.compile(r"\*{2,}"),
    re.compile(r"^[-=_]{3,}$"),
]


def strip_pii(text: str) -> str:
    lines = text.split("\n")
    total = len(lines)
    skip_top = min(15, total // 6)
    body_lines = lines[skip_top:]

    clean = []
    for line in body_lines:
        stripped = line.strip()
        if not stripped:
            continue
        if any(p.search(stripped) for p in _METADATA_LINE_PATTERNS):
            continue
        if any(p.search(stripped) for p in _PII_PATTERNS):
            continue
        clean.append(stripped)

    return "\n".join(clean)


_EXTRACTION_SYSTEM = """You are a medical lab report parser. You extract biomarker test results from Indian lab report text.

RULES:
1. Extract ONLY actual test results — biomarker name, numeric value, unit, reference range, flag.
2. IGNORE all patient personal information, dates, addresses, lab locations, page numbers.
3. IGNORE section headers like "HAEMATOLOGY", "BIOCHEMISTRY", "URINE EXAMINATION".
4. IGNORE rows where the value is not a number (e.g. "Positive", "Negative", "NIL" — skip those).
5. For reference range: extract exactly as printed. If printed as "13.0-17.0" keep it. If printed as "< 200" keep it.
6. Flag: extract only if explicitly printed — H, L, HH, LL, HIGH, LOW, ABNORMAL, C, CRIT.
7. Return ONLY valid JSON. No explanation. No markdown. No preamble.
"""

_EXTRACTION_USER = """Extract all biomarker test results from this lab report text. Return JSON only.

REPORT TEXT:
{text}"""


def _call_groq(clean_text: str) -> list[dict]:
    client = _get_groq()
    response = client.chat.completions.create(
        model="llama-3.3-70b-versatile",
        temperature=0.0,
        max_tokens=2048,
        messages=[
            {"role": "system", "content": _EXTRACTION_SYSTEM},
            {"role": "user", "content": _EXTRACTION_USER.format(text=clean_text)},
        ],
        response_format={"type": "json_object"},
    )

    raw = response.choices[0].message.content.strip()
    parsed = json.loads(raw)
    if isinstance(parsed, list):
        return parsed
    for key in ["results", "biomarkers", "tests", "data", "items"]:
        if key in parsed and isinstance(parsed[key], list):
            return parsed[key]
    if isinstance(parsed, dict) and "name" in parsed:
        return [parsed]
    return []


def _parse_ref_range(text: str) -> tuple[float | None, float | None]:
    if not text:
        return None, None
    text = text.strip()
    m = re.search(r"([\d.]+)\s*[-–to]+\s*([\d.]+)", text, re.IGNORECASE)
    if m:
        try:
            return float(m.group(1)), float(m.group(2))
        except ValueError:
            pass
    m = re.search(r"(?:<|upto|up\s+to)\s*([\d.]+)", text, re.IGNORECASE)
    if m:
        return 0.0, float(m.group(1))
    m = re.search(r">\s*([\d.]+)", text)
    if m:
        return float(m.group(1)), 99999.0
    return None, None


def _parse_flag(text: str | None) -> str | None:
    if not text:
        return None
    clean = text.strip().upper()
    known = {"H", "L", "HH", "LL", "C", "CRIT", "CRITICAL", "HIGH", "LOW", "ABNORMAL", "A", "E", "PANIC", "H*", "L*"}
    return clean if clean in known else None


_VALID_UNIT_PATTERN = re.compile(
    r"^(g/dl|g/l|mg/dl|mg/l|mmol/l|µmol/l|umol/l|"
    r"iu/l|u/l|miu/l|uiu/ml|ng/ml|pg/ml|pg|fl|"
    r"%|/µl|/ul|/cumm|/hpf|/lpf|lakhs/cumm|"
    r"million/cu\.mm|thou/µl|k/µl|meq/l|mmhg|"
    r"units|unit|cells/µl|10\^3/µl|10\^6/µl)$",
    re.IGNORECASE,
)


def _clean_unit(unit: str) -> str:
    if not unit:
        return ""
    cleaned = unit.strip().lower()
    cleaned = re.sub(r"^[^a-z%]+|[^a-z%µ³0-9.^]+$", "", cleaned)
    if re.match(r"^\d+%$", cleaned):
        return ""
    if _VALID_UNIT_PATTERN.match(cleaned):
        return unit.strip()
    return ""


def _groq_items_to_biomarkers(items: list[dict]) -> list[ExtractedBiomarker]:
    biomarkers = []
    for item in items:
        try:
            name = str(item.get("name", "")).strip()
            value_raw = item.get("value")
            unit = _clean_unit(str(item.get("unit", "")).strip())
            ref_str = str(item.get("ref_range", "")).strip()
            flag_raw = item.get("flag")

            if not name or value_raw is None:
                continue

            try:
                value = float(str(value_raw).replace(",", "").strip())
            except (ValueError, TypeError):
                continue

            if value <= 0 and ref_str == "":
                continue

            ref_low, ref_high = _parse_ref_range(ref_str)
            flag = _parse_flag(flag_raw)

            confidence = 0.80
            if ref_low is not None:
                confidence += 0.12
            if unit:
                confidence += 0.08

            biomarkers.append(
                ExtractedBiomarker(
                    raw_name=name,
                    normalized_name=None,
                    loinc_code=None,
                    value=value,
                    unit=unit or "units",
                    lab_ref_low=ref_low,
                    lab_ref_high=ref_high,
                    lab_flag=flag,
                    extraction_source=ExtractionSource.PYMUPDF,
                    extraction_confidence=round(confidence, 2),
                )
            )
        except Exception:
            continue
    return biomarkers


def _get_pdf_text(pdf_bytes: bytes) -> str:
    doc = pymupdf.open(stream=pdf_bytes, filetype="pdf")
    text = "\n".join(page.get_text() for page in doc)
    doc.close()
    return text


def _is_text_pdf(pdf_bytes: bytes) -> bool:
    doc = pymupdf.open(stream=pdf_bytes, filetype="pdf")
    chars = sum(len(page.get_text()) for page in doc)
    doc.close()
    return chars > 200


def _cache_key(file_bytes: bytes, content_type: str) -> str:
    digest = hashlib.sha256(file_bytes + b"::" + content_type.encode("utf-8")).hexdigest()
    return f"{digest}.txt"


def _extract_azure_di(file_bytes: bytes, content_type: str) -> str:
    _AZURE_CACHE_DIR.mkdir(parents=True, exist_ok=True)
    cache_file = _AZURE_CACHE_DIR / _cache_key(file_bytes, content_type)
    if cache_file.exists():
        print(f"[extractor] azure cache hit: {cache_file.name}")
        return cache_file.read_text(encoding="utf-8")

    print("[extractor] azure cache miss -> calling Azure DI")
    client = _get_azure()
    poller = client.begin_analyze_document(
        "prebuilt-layout",
        body=file_bytes,
        content_type=content_type,
    )
    result = poller.result()

    lines = []
    for table in result.tables:
        grid: dict[int, dict[int, str]] = {}
        for cell in table.cells:
            grid.setdefault(cell.row_index, {})[cell.column_index] = (
                cell.content.strip() if cell.content else ""
            )
        for row_idx in sorted(grid.keys()):
            row = grid[row_idx]
            row_text = "\t".join(row.get(c, "") for c in sorted(row.keys()))
            lines.append(row_text)

    if not lines and result.paragraphs:
        lines = [p.content for p in result.paragraphs if p.content]

    text = "\n".join(lines)
    cache_file.write_text(text, encoding="utf-8")
    print(f"[extractor] azure cached: {cache_file.name}")
    return text


async def extract(file_bytes: bytes, content_type: str) -> list[ExtractedBiomarker]:
    if content_type == "application/pdf":
        if _is_text_pdf(file_bytes):
            raw_text = _get_pdf_text(file_bytes)
        else:
            raw_text = _extract_azure_di(file_bytes, content_type)
    else:
        raw_text = _extract_azure_di(file_bytes, content_type)

    if not raw_text.strip():
        return []

    clean_text = strip_pii(raw_text)
    if not clean_text.strip():
        return []

    try:
        items = _call_groq(clean_text)
        biomarkers = _groq_items_to_biomarkers(items)
    except Exception as e:
        print(f"[extractor] Groq failed: {e}")
        return []

    return biomarkers
import hashlib
import json
import os
import re
from pathlib import Path

import pymupdf
from azure.ai.documentintelligence import DocumentIntelligenceClient
from azure.core.credentials import AzureKeyCredential
from groq import Groq

from models.schemas import ExtractedBiomarker, ExtractionSource

_groq_client: Groq | None = None
_azure_client: DocumentIntelligenceClient | None = None
_AZURE_CACHE_DIR = Path(__file__).parent.parent / ".cache" / "azure_di"


def _get_groq() -> Groq:
    global _groq_client
    if _groq_client is None:
        key = os.getenv("GROQ_API_KEY")
        if not key:
            raise RuntimeError("GROQ_API_KEY not set in .env")
        _groq_client = Groq(api_key=key)
    return _groq_client


def _get_azure() -> DocumentIntelligenceClient:
    global _azure_client
    if _azure_client is None:
        endpoint = os.getenv("AZURE_DI_ENDPOINT")
        key = os.getenv("AZURE_DI_KEY")
        if not endpoint or not key:
            raise RuntimeError("AZURE_DI_ENDPOINT and AZURE_DI_KEY not set")
        _azure_client = DocumentIntelligenceClient(
            endpoint=endpoint,
            credential=AzureKeyCredential(key),
        )
    return _azure_client


_PII_PATTERNS = [
    re.compile(r"\b(patient\s*(name|id)|name\s*:)", re.I),
    re.compile(r"\b(age\s*[:/]|dob\s*[:/]|date\s+of\s+birth)", re.I),
    re.compile(r"\b(mobile|phone|contact|tel|fax)\s*[:/]?\s*[\d\-+\s]{8,}", re.I),
    re.compile(r"\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z]{2,}\b", re.I),
    re.compile(r"\b(mr\.?|mrs\.?|ms\.?|dr\.?)\s+[A-Z][a-z]+\s+[A-Z][a-z]+"),
    re.compile(r"\b(address|add\s*:|flat|house|plot|sector|nagar|colony|road|street)\b", re.I),
    re.compile(r"\b(uhid|pid|mrn|reg\s*no|patient\s*id|accession|barcode)\s*[:/]?\s*\w+", re.I),
    re.compile(r"\b(ref\s*by|referred\s*by|consultant|doctor\s*name)\b", re.I),
    re.compile(r"\b\d{6}\b"),
    re.compile(r"\b\d{10}\b"),
]

_METADATA_LINE_PATTERNS = [
    re.compile(r"(collected|reported|received|printed)\s*(on|at|by)\s*[:\-]?\s*[\d/\-:APM\s]+", re.I),
    re.compile(r"(processing\s+location|lab\s+address|branch)", re.I),
    re.compile(r"(page\s+\d+\s+of\s+\d+)", re.I),
    re.compile(r"\*{2,}"),
    re.compile(r"^[-=_]{3,}$"),
]


def strip_pii(text: str) -> str:
    lines = text.split("\n")
    total = len(lines)
    skip_top = min(15, total // 6)
    body_lines = lines[skip_top:]
    clean = []
    for line in body_lines:
        stripped = line.strip()
        if not stripped:
            continue
        if any(p.search(stripped) for p in _METADATA_LINE_PATTERNS):
            continue
        if any(p.search(stripped) for p in _PII_PATTERNS):
            continue
        clean.append(stripped)
    return "\n".join(clean)


_EXTRACTION_SYSTEM = """You are a medical lab report parser. You extract biomarker test results from Indian lab report text.

RULES:
1. Extract ONLY actual test results — biomarker name, numeric value, unit, reference range, flag.
2. IGNORE all patient personal information, dates, addresses, lab locations, page numbers.
3. IGNORE section headers like "HAEMATOLOGY", "BIOCHEMISTRY", "URINE EXAMINATION".
4. IGNORE rows where the value is not a number (e.g. "Positive", "Negative", "NIL" — skip those).
5. For reference range: extract exactly as printed. If printed as "13.0-17.0" keep it. If printed as "< 200" keep it.
6. Flag: extract only if explicitly printed — H, L, HH, LL, HIGH, LOW, ABNORMAL, C, CRIT.
7. Return ONLY valid JSON. No explanation. No markdown. No preamble.
"""

_EXTRACTION_USER = """Extract all biomarker test results from this lab report text. Return JSON only.

REPORT TEXT:
{text}"""


def _call_groq(clean_text: str) -> list[dict]:
    client = _get_groq()
    response = client.chat.completions.create(
        model="llama-3.3-70b-versatile",
        temperature=0.0,
        max_tokens=2048,
        messages=[
            {"role": "system", "content": _EXTRACTION_SYSTEM},
            {"role": "user", "content": _EXTRACTION_USER.format(text=clean_text)},
        ],
        response_format={"type": "json_object"},
    )
    raw = response.choices[0].message.content.strip()
    parsed = json.loads(raw)
    if isinstance(parsed, list):
        return parsed
    for key in ["results", "biomarkers", "tests", "data", "items"]:
        if key in parsed and isinstance(parsed[key], list):
            return parsed[key]
    if isinstance(parsed, dict) and "name" in parsed:
        return [parsed]
    return []


def _parse_ref_range(text: str) -> tuple[float | None, float | None]:
    if not text:
        return None, None
    text = text.strip()
    m = re.search(r"([\d.]+)\s*[-–to]+\s*([\d.]+)", text, re.IGNORECASE)
    if m:
        try:
            return float(m.group(1)), float(m.group(2))
        except ValueError:
            pass
    m = re.search(r"(?:<|upto|up\s+to)\s*([\d.]+)", text, re.IGNORECASE)
    if m:
        return 0.0, float(m.group(1))
    m = re.search(r">\s*([\d.]+)", text)
    if m:
        return float(m.group(1)), 99999.0
    return None, None


def _parse_flag(text: str | None) -> str | None:
    if not text:
        return None
    clean = text.strip().upper()
    known = {"H", "L", "HH", "LL", "C", "CRIT", "CRITICAL", "HIGH", "LOW", "ABNORMAL", "A", "E", "PANIC", "H*", "L*"}
    return clean if clean in known else None


_VALID_UNIT_PATTERN = re.compile(
    r"^(g/dl|g/l|mg/dl|mg/l|mmol/l|µmol/l|umol/l|"
    r"iu/l|u/l|miu/l|uiu/ml|ng/ml|pg/ml|pg|fl|"
    r"%|/µl|/ul|/cumm|/hpf|/lpf|lakhs/cumm|"
    r"million/cu\.mm|thou/µl|k/µl|meq/l|mmhg|"
    r"units|unit|cells/µl|10\^3/µl|10\^6/µl)$",
    re.IGNORECASE,
)


def _clean_unit(unit: str) -> str:
    if not unit:
        return ""
    cleaned = unit.strip().lower()
    cleaned = re.sub(r"^[^a-z%]+|[^a-z%µ³0-9.^]+$", "", cleaned)
    if _VALID_UNIT_PATTERN.match(cleaned):
        return unit.strip()
    return ""


def _groq_items_to_biomarkers(items: list[dict]) -> list[ExtractedBiomarker]:
    biomarkers = []
    for item in items:
        try:
            name = str(item.get("name", "")).strip()
            value_raw = item.get("value")
            unit = _clean_unit(str(item.get("unit", "")).strip())
            ref_str = str(item.get("ref_range", "")).strip()
            flag_raw = item.get("flag")
            if not name or value_raw is None:
                continue
            try:
                value = float(str(value_raw).replace(",", "").strip())
            except (ValueError, TypeError):
                continue
            if value <= 0 and ref_str == "":
                continue
            ref_low, ref_high = _parse_ref_range(ref_str)
            flag = _parse_flag(flag_raw)
            confidence = 0.80
            if ref_low is not None:
                confidence += 0.12
            if unit:
                confidence += 0.08
            biomarkers.append(
                ExtractedBiomarker(
                    raw_name=name,
                    normalized_name=None,
                    loinc_code=None,
                    value=value,
                    unit=unit or "units",
                    lab_ref_low=ref_low,
                    lab_ref_high=ref_high,
                    lab_flag=flag,
                    extraction_source=ExtractionSource.PYMUPDF,
                    extraction_confidence=round(confidence, 2),
                )
            )
        except Exception:
            continue
    return biomarkers


def _get_pdf_text(pdf_bytes: bytes) -> str:
    doc = pymupdf.open(stream=pdf_bytes, filetype="pdf")
    text = "\n".join(page.get_text() for page in doc)
    doc.close()
    return text


def _is_text_pdf(pdf_bytes: bytes) -> bool:
    doc = pymupdf.open(stream=pdf_bytes, filetype="pdf")
    chars = sum(len(page.get_text()) for page in doc)
    doc.close()
    return chars > 200


def _cache_key(file_bytes: bytes, content_type: str) -> str:
    digest = hashlib.sha256(file_bytes + b"::" + content_type.encode("utf-8")).hexdigest()
    return f"{digest}.txt"


def _extract_azure_di(file_bytes: bytes, content_type: str) -> str:
    _AZURE_CACHE_DIR.mkdir(parents=True, exist_ok=True)
    cache_file = _AZURE_CACHE_DIR / _cache_key(file_bytes, content_type)
    if cache_file.exists():
        print(f"[extractor] azure cache hit: {cache_file.name}")
        return cache_file.read_text(encoding="utf-8")

    print("[extractor] azure cache miss -> calling Azure DI")
    client = _get_azure()
    poller = client.begin_analyze_document(
        "prebuilt-layout",
        body=file_bytes,
        content_type=content_type,
    )
    result = poller.result()

    lines = []
    for table in result.tables:
        grid: dict[int, dict[int, str]] = {}
        for cell in table.cells:
            grid.setdefault(cell.row_index, {})[cell.column_index] = (
                cell.content.strip() if cell.content else ""
            )
        for row_idx in sorted(grid.keys()):
            row = grid[row_idx]
            row_text = "\t".join(row.get(c, "") for c in sorted(row.keys()))
            lines.append(row_text)

    if not lines and result.paragraphs:
        lines = [p.content for p in result.paragraphs if p.content]

    text = "\n".join(lines)
    cache_file.write_text(text, encoding="utf-8")
    print(f"[extractor] azure cached: {cache_file.name}")
    return text


async def extract(file_bytes: bytes, content_type: str) -> list[ExtractedBiomarker]:
    if content_type == "application/pdf":
        if _is_text_pdf(file_bytes):
            raw_text = _get_pdf_text(file_bytes)
        else:
            raw_text = _extract_azure_di(file_bytes, content_type)
    else:
        raw_text = _extract_azure_di(file_bytes, content_type)

    if not raw_text.strip():
        return []

    clean_text = strip_pii(raw_text)
    if not clean_text.strip():
        return []

    try:
        items = _call_groq(clean_text)
        biomarkers = _groq_items_to_biomarkers(items)
    except Exception as e:
        print(f"[extractor] Groq failed: {e}")
        return []

    return biomarkers
import hashlib
import json
import os
import re
from pathlib import Path

import pymupdf
from azure.ai.documentintelligence import DocumentIntelligenceClient
from azure.core.credentials import AzureKeyCredential
from groq import Groq

from models.schemas import ExtractedBiomarker, ExtractionSource

_groq_client: Groq | None = None
_azure_client: DocumentIntelligenceClient | None = None
_AZURE_CACHE_DIR = Path(__file__).parent.parent / ".cache" / "azure_di"


def _get_groq() -> Groq:
    global _groq_client
    if _groq_client is None:
        key = os.getenv("GROQ_API_KEY")
        if not key:
            raise RuntimeError("GROQ_API_KEY not set in .env")
        _groq_client = Groq(api_key=key)
    return _groq_client


def _get_azure() -> DocumentIntelligenceClient:
    global _azure_client
    if _azure_client is None:
        endpoint = os.getenv("AZURE_DI_ENDPOINT")
        key = os.getenv("AZURE_DI_KEY")
        if not endpoint or not key:
            raise RuntimeError("AZURE_DI_ENDPOINT and AZURE_DI_KEY not set")
        _azure_client = DocumentIntelligenceClient(
            endpoint=endpoint,
            credential=AzureKeyCredential(key),
        )
    return _azure_client


_PII_PATTERNS = [
    re.compile(r"\b(patient\s*(name|id)|name\s*:)", re.I),
    re.compile(r"\b(age\s*[:/]|dob\s*[:/]|date\s+of\s+birth)", re.I),
    re.compile(r"\b(mobile|phone|contact|tel|fax)\s*[:/]?\s*[\d\-+\s]{8,}", re.I),
    re.compile(r"\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z]{2,}\b", re.I),
    re.compile(r"\b(mr\.?|mrs\.?|ms\.?|dr\.?)\s+[A-Z][a-z]+\s+[A-Z][a-z]+"),
    re.compile(r"\b(address|add\s*:|flat|house|plot|sector|nagar|colony|road|street)\b", re.I),
    re.compile(r"\b(uhid|pid|mrn|reg\s*no|patient\s*id|accession|barcode)\s*[:/]?\s*\w+", re.I),
    re.compile(r"\b(ref\s*by|referred\s*by|consultant|doctor\s*name)\b", re.I),
    re.compile(r"\b\d{6}\b"),
    re.compile(r"\b\d{10}\b"),
]

_METADATA_LINE_PATTERNS = [
    re.compile(r"(collected|reported|received|printed)\s*(on|at|by)\s*[:\-]?\s*[\d/\-:APM\s]+", re.I),
    re.compile(r"(processing\s+location|lab\s+address|branch)", re.I),
    re.compile(r"(page\s+\d+\s+of\s+\d+)", re.I),
    re.compile(r"\*{2,}"),
    re.compile(r"^[-=_]{3,}$"),
]


def strip_pii(text: str) -> str:
    lines = text.split("\n")
    total = len(lines)
    skip_top = min(15, total // 6)
    body_lines = lines[skip_top:]

    clean = []
    for line in body_lines:
        stripped = line.strip()
        if not stripped:
            continue
        if any(p.search(stripped) for p in _METADATA_LINE_PATTERNS):
            continue
        if any(p.search(stripped) for p in _PII_PATTERNS):
            continue
        clean.append(stripped)
    return "\n".join(clean)


_EXTRACTION_SYSTEM = """You are a medical lab report parser. You extract biomarker test results from Indian lab report text.

RULES:
1. Extract ONLY actual test results — biomarker name, numeric value, unit, reference range, flag.
2. IGNORE all patient personal information, dates, addresses, lab locations, page numbers.
3. IGNORE section headers like "HAEMATOLOGY", "BIOCHEMISTRY", "URINE EXAMINATION".
4. IGNORE rows where the value is not a number (e.g. "Positive", "Negative", "NIL" — skip those).
5. For reference range: extract exactly as printed. If printed as "13.0-17.0" keep it. If printed as "< 200" keep it.
6. Flag: extract only if explicitly printed — H, L, HH, LL, HIGH, LOW, ABNORMAL, C, CRIT.
7. Return ONLY valid JSON. No explanation. No markdown. No preamble.
"""

_EXTRACTION_USER = """Extract all biomarker test results from this lab report text. Return JSON only.

REPORT TEXT:
{text}"""


def _call_groq(clean_text: str) -> list[dict]:
    client = _get_groq()
    response = client.chat.completions.create(
        model="llama-3.3-70b-versatile",
        temperature=0.0,
        max_tokens=2048,
        messages=[
            {"role": "system", "content": _EXTRACTION_SYSTEM},
            {"role": "user", "content": _EXTRACTION_USER.format(text=clean_text)},
        ],
        response_format={"type": "json_object"},
    )

    raw = response.choices[0].message.content.strip()
    parsed = json.loads(raw)

    if isinstance(parsed, list):
        return parsed
    for key in ["results", "biomarkers", "tests", "data", "items"]:
        if key in parsed and isinstance(parsed[key], list):
            return parsed[key]
    if isinstance(parsed, dict) and "name" in parsed:
        return [parsed]
    return []


def _parse_ref_range(text: str) -> tuple[float | None, float | None]:
    if not text:
        return None, None
    text = text.strip()

    m = re.search(r"([\d.]+)\s*[-–to]+\s*([\d.]+)", text, re.IGNORECASE)
    if m:
        try:
            return float(m.group(1)), float(m.group(2))
        except ValueError:
            pass

    m = re.search(r"(?:<|upto|up\s+to)\s*([\d.]+)", text, re.IGNORECASE)
    if m:
        return 0.0, float(m.group(1))

    m = re.search(r">\s*([\d.]+)", text)
    if m:
        return float(m.group(1)), 99999.0

    return None, None


def _parse_flag(text: str | None) -> str | None:
    if not text:
        return None
    clean = text.strip().upper()
    known = {"H", "L", "HH", "LL", "C", "CRIT", "CRITICAL", "HIGH", "LOW", "ABNORMAL", "A", "E", "PANIC", "H*", "L*"}
    return clean if clean in known else None


_VALID_UNIT_PATTERN = re.compile(
    r"^(g/dl|g/l|mg/dl|mg/l|mmol/l|µmol/l|umol/l|"
    r"iu/l|u/l|miu/l|uiu/ml|ng/ml|pg/ml|pg|fl|"
    r"%|/µl|/ul|/cumm|/hpf|/lpf|lakhs/cumm|"
    r"million/cu\.mm|thou/µl|k/µl|meq/l|mmhg|"
    r"units|unit|cells/µl|10\^3/µl|10\^6/µl)$",
    re.IGNORECASE,
)


def _clean_unit(unit: str) -> str:
    """Return unit if valid, else empty string."""
    if not unit:
        return ""
    cleaned = unit.strip().lower()
    cleaned = re.sub(r"^[^a-z%]+|[^a-z%µ³0-9.^]+$", "", cleaned)
    if _VALID_UNIT_PATTERN.match(cleaned):
        return unit.strip()
    return ""


def _groq_items_to_biomarkers(items: list[dict]) -> list[ExtractedBiomarker]:
    biomarkers = []

    for item in items:
        try:
            name = str(item.get("name", "")).strip()
            value_raw = item.get("value")
            unit = _clean_unit(str(item.get("unit", "")).strip())
            ref_str = str(item.get("ref_range", "")).strip()
            flag_raw = item.get("flag")

            if not name or value_raw is None:
                continue

            try:
                value = float(str(value_raw).replace(",", "").strip())
            except (ValueError, TypeError):
                continue

            if value <= 0 and ref_str == "":
                continue

            ref_low, ref_high = _parse_ref_range(ref_str)
            flag = _parse_flag(flag_raw)

            confidence = 0.80
            if ref_low is not None:
                confidence += 0.12
            if unit:
                confidence += 0.08

            biomarkers.append(
                ExtractedBiomarker(
                    raw_name=name,
                    normalized_name=None,
                    loinc_code=None,
                    value=value,
                    unit=unit or "units",
                    lab_ref_low=ref_low,
                    lab_ref_high=ref_high,
                    lab_flag=flag,
                    extraction_source=ExtractionSource.PYMUPDF,
                    extraction_confidence=round(confidence, 2),
                )
            )
        except Exception:
            continue

    return biomarkers


def _get_pdf_text(pdf_bytes: bytes) -> str:
    doc = pymupdf.open(stream=pdf_bytes, filetype="pdf")
    text = "\n".join(page.get_text() for page in doc)
    doc.close()
    return text


def _is_text_pdf(pdf_bytes: bytes) -> bool:
    doc = pymupdf.open(stream=pdf_bytes, filetype="pdf")
    chars = sum(len(page.get_text()) for page in doc)
    doc.close()
    return chars > 200


def _cache_key(file_bytes: bytes, content_type: str) -> str:
    digest = hashlib.sha256(file_bytes + b"::" + content_type.encode("utf-8")).hexdigest()
    return f"{digest}.txt"


def _extract_azure_di(file_bytes: bytes, content_type: str) -> str:
    """
    Extract raw text from Azure DI and cache by file hash to avoid repeat cost.
    """
    _AZURE_CACHE_DIR.mkdir(parents=True, exist_ok=True)
    cache_file = _AZURE_CACHE_DIR / _cache_key(file_bytes, content_type)
    if cache_file.exists():
        return cache_file.read_text(encoding="utf-8")

    client = _get_azure()
    poller = client.begin_analyze_document(
        "prebuilt-layout",
        body=file_bytes,
        content_type=content_type,
    )
    result = poller.result()

    lines = []
    for table in result.tables:
        grid: dict[int, dict[int, str]] = {}
        for cell in table.cells:
            grid.setdefault(cell.row_index, {})[cell.column_index] = (
                cell.content.strip() if cell.content else ""
            )
        for row_idx in sorted(grid.keys()):
            row = grid[row_idx]
            row_text = "\t".join(row.get(c, "") for c in sorted(row.keys()))
            lines.append(row_text)

    if not lines and result.paragraphs:
        lines = [p.content for p in result.paragraphs if p.content]

    text = "\n".join(lines)
    cache_file.write_text(text, encoding="utf-8")
    return text


async def extract(file_bytes: bytes, content_type: str) -> list[ExtractedBiomarker]:
    if content_type == "application/pdf":
        if _is_text_pdf(file_bytes):
            raw_text = _get_pdf_text(file_bytes)
        else:
            raw_text = _extract_azure_di(file_bytes, content_type)
    else:
        raw_text = _extract_azure_di(file_bytes, content_type)

    if not raw_text.strip():
        return []

    clean_text = strip_pii(raw_text)
    if not clean_text.strip():
        return []

    try:
        items = _call_groq(clean_text)
        biomarkers = _groq_items_to_biomarkers(items)
    except Exception as e:
        print(f"  [extractor] Groq failed: {e}")
        return []

    return biomarkers
import json
import os
import re

import pymupdf
from azure.ai.documentintelligence import DocumentIntelligenceClient
from azure.core.credentials import AzureKeyCredential
from groq import Groq

from models.schemas import ExtractedBiomarker, ExtractionSource

# Clients
_groq_client: Groq | None = None
_azure_client: DocumentIntelligenceClient | None = None


def _get_groq() -> Groq:
    global _groq_client
    if _groq_client is None:
        key = os.getenv("GROQ_API_KEY")
        if not key:
            raise RuntimeError("GROQ_API_KEY not set in .env")
        _groq_client = Groq(api_key=key)
    return _groq_client


def _get_azure() -> DocumentIntelligenceClient:
    global _azure_client
    if _azure_client is None:
        endpoint = os.getenv("AZURE_DI_ENDPOINT")
        key = os.getenv("AZURE_DI_KEY")
        if not endpoint or not key:
            raise RuntimeError("AZURE_DI_ENDPOINT and AZURE_DI_KEY not set")
        _azure_client = DocumentIntelligenceClient(
            endpoint=endpoint,
            credential=AzureKeyCredential(key),
        )
    return _azure_client


# PII Stripper
_PII_PATTERNS = [
    re.compile(r"\b(patient\s*(name|id)|name\s*:)", re.I),
    re.compile(r"\b(age\s*[:/]|dob\s*[:/]|date\s+of\s+birth)", re.I),
    re.compile(r"\b(mobile|phone|contact|tel|fax)\s*[:/]?\s*[\d\-+\s]{8,}", re.I),
    re.compile(r"\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z]{2,}\b", re.I),
    re.compile(r"\b(mr\.?|mrs\.?|ms\.?|dr\.?)\s+[A-Z][a-z]+\s+[A-Z][a-z]+"),
    re.compile(r"\b(address|add\s*:|flat|house|plot|sector|nagar|colony|road|street)\b", re.I),
    re.compile(r"\b(uhid|pid|mrn|reg\s*no|patient\s*id|accession|barcode)\s*[:/]?\s*\w+", re.I),
    re.compile(r"\b(ref\s*by|referred\s*by|consultant|doctor\s*name)\b", re.I),
    re.compile(r"\b\d{6}\b"),
    re.compile(r"\b\d{10}\b"),
]

_METADATA_LINE_PATTERNS = [
    re.compile(r"(collected|reported|received|printed)\s*(on|at|by)\s*[:\-]?\s*[\d/\-:APM\s]+", re.I),
    re.compile(r"(processing\s+location|lab\s+address|branch)", re.I),
    re.compile(r"(page\s+\d+\s+of\s+\d+)", re.I),
    re.compile(r"\*{2,}"),
    re.compile(r"^[-=_]{3,}$"),
]


def strip_pii(text: str) -> str:
    """
    Remove personally identifiable information from raw report text.
    """
    lines = text.split("\n")
    total = len(lines)

    skip_top = min(15, total // 6)
    body_lines = lines[skip_top:]

    clean = []
    for line in body_lines:
        stripped = line.strip()
        if not stripped:
            continue

        is_meta = any(p.search(stripped) for p in _METADATA_LINE_PATTERNS)
        if is_meta:
            continue

        has_pii = any(p.search(stripped) for p in _PII_PATTERNS)
        if has_pii:
            continue

        clean.append(stripped)

    return "\n".join(clean)


# Groq extraction prompt
_EXTRACTION_SYSTEM = """You are a medical lab report parser. You extract biomarker test results from Indian lab report text.

RULES:
1. Extract ONLY actual test results — biomarker name, numeric value, unit, reference range, flag.
2. IGNORE all patient personal information, dates, addresses, lab locations, page numbers.
3. IGNORE section headers like "HAEMATOLOGY", "BIOCHEMISTRY", "URINE EXAMINATION".
4. IGNORE rows where the value is not a number (e.g. "Positive", "Negative", "NIL" — skip those).
5. For reference range: extract exactly as printed. If printed as "13.0-17.0" keep it. If printed as "< 200" keep it.
6. Flag: extract only if explicitly printed — H, L, HH, LL, HIGH, LOW, ABNORMAL, C, CRIT.
7. Return ONLY valid JSON. No explanation. No markdown. No preamble.

OUTPUT SCHEMA (array of objects):
[
  {
    "name": "exact test name as printed",
    "value": 14.2,
    "unit": "g/dL",
    "ref_range": "13.0-17.0",
    "flag": "L"
  }
]

If flag is not printed, set "flag": null.
If unit is not printed, set "unit": "".
If ref_range is not printed, set "ref_range": "".
"""

_EXTRACTION_USER = """Extract all biomarker test results from this lab report text. Return JSON only.

REPORT TEXT:
{text}"""


def _call_groq(clean_text: str) -> list[dict]:
    """
    Send PII-stripped text to Groq Llama for structured extraction.
    """
    client = _get_groq()

    response = client.chat.completions.create(
        model="llama-3.3-70b-versatile",
        temperature=0.0,
        max_tokens=2048,
        messages=[
            {"role": "system", "content": _EXTRACTION_SYSTEM},
            {"role": "user", "content": _EXTRACTION_USER.format(text=clean_text)},
        ],
        response_format={"type": "json_object"},
    )

    raw = response.choices[0].message.content.strip()
    parsed = json.loads(raw)

    if isinstance(parsed, list):
        return parsed
    for key in ["results", "biomarkers", "tests", "data", "items"]:
        if key in parsed and isinstance(parsed[key], list):
            return parsed[key]

    if isinstance(parsed, dict) and "name" in parsed:
        return [parsed]

    return []


def _parse_ref_range(text: str) -> tuple[float | None, float | None]:
    if not text:
        return None, None
    text = text.strip()

    m = re.search(r"([\d.]+)\s*[-–to]+\s*([\d.]+)", text, re.IGNORECASE)
    if m:
        try:
            return float(m.group(1)), float(m.group(2))
        except ValueError:
            pass

    m = re.search(r"(?:<|upto|up\s+to)\s*([\d.]+)", text, re.IGNORECASE)
    if m:
        return 0.0, float(m.group(1))

    m = re.search(r">\s*([\d.]+)", text)
    if m:
        return float(m.group(1)), 99999.0

    return None, None


def _parse_flag(text: str | None) -> str | None:
    if not text:
        return None
    clean = text.strip().upper()
    known = {"H", "L", "HH", "LL", "C", "CRIT", "CRITICAL", "HIGH", "LOW", "ABNORMAL", "A", "E", "PANIC", "H*", "L*"}
    return clean if clean in known else None


def _groq_items_to_biomarkers(items: list[dict]) -> list[ExtractedBiomarker]:
    biomarkers = []

    for item in items:
        try:
            name = str(item.get("name", "")).strip()
            value_raw = item.get("value")
            unit = str(item.get("unit", "")).strip()
            ref_str = str(item.get("ref_range", "")).strip()
            flag_raw = item.get("flag")

            if not name or value_raw is None:
                continue

            try:
                value = float(str(value_raw).replace(",", "").strip())
            except (ValueError, TypeError):
                continue

            if value <= 0 and ref_str == "":
                continue

            ref_low, ref_high = _parse_ref_range(ref_str)
            flag = _parse_flag(flag_raw)

            confidence = 0.80
            if ref_low is not None:
                confidence += 0.12
            if unit:
                confidence += 0.08

            biomarkers.append(
                ExtractedBiomarker(
                    raw_name=name,
                    normalized_name=None,
                    loinc_code=None,
                    value=value,
                    unit=unit or "units",
                    lab_ref_low=ref_low,
                    lab_ref_high=ref_high,
                    lab_flag=flag,
                    extraction_source=ExtractionSource.PYMUPDF,
                    extraction_confidence=round(confidence, 2),
                )
            )

        except Exception:
            continue

    return biomarkers


# PDF text extraction (PyMuPDF - just get text, no parsing)
def _get_pdf_text(pdf_bytes: bytes) -> str:
    doc = pymupdf.open(stream=pdf_bytes, filetype="pdf")
    text = "\n".join(page.get_text() for page in doc)
    doc.close()
    return text


def _is_text_pdf(pdf_bytes: bytes) -> bool:
    """Check if PDF has extractable text layer (not scanned)."""
    doc = pymupdf.open(stream=pdf_bytes, filetype="pdf")
    chars = sum(len(page.get_text()) for page in doc)
    doc.close()
    return chars > 200


# Azure DI (images + scanned PDFs)
def _extract_azure_di(file_bytes: bytes, content_type: str) -> str:
    """Extract raw text from Azure DI, return as string for Groq."""
    client = _get_azure()

    poller = client.begin_analyze_document(
        "prebuilt-layout",
        body=file_bytes,
        content_type=content_type,
    )
    result = poller.result()

    lines = []

    for table in result.tables:
        grid: dict[int, dict[int, str]] = {}
        for cell in table.cells:
            grid.setdefault(cell.row_index, {})[cell.column_index] = (
                cell.content.strip() if cell.content else ""
            )
        for row_idx in sorted(grid.keys()):
            row = grid[row_idx]
            row_text = "\t".join(row.get(c, "") for c in sorted(row.keys()))
            lines.append(row_text)

    if not lines and result.paragraphs:
        lines = [p.content for p in result.paragraphs if p.content]

    return "\n".join(lines)


async def extract(file_bytes: bytes, content_type: str) -> list[ExtractedBiomarker]:
    """
    Pipeline:
    1. Get raw text (PyMuPDF for text PDFs, Azure DI for images/scanned)
    2. Strip PII
    3. Send clean text to Groq Llama
    4. Convert Groq output to ExtractedBiomarker[]
    """

    if content_type == "application/pdf":
        if _is_text_pdf(file_bytes):
            raw_text = _get_pdf_text(file_bytes)
        else:
            raw_text = _extract_azure_di(file_bytes, content_type)
    else:
        raw_text = _extract_azure_di(file_bytes, content_type)

    if not raw_text.strip():
        return []

    clean_text = strip_pii(raw_text)
    if not clean_text.strip():
        return []

    try:
        items = _call_groq(clean_text)
        biomarkers = _groq_items_to_biomarkers(items)
    except Exception as e:
        print(f"  [extractor] Groq failed: {e}")
        return []

    return biomarkers
# backend/services/extractor.py

import os
import re
import pymupdf
from pathlib import Path
from azure.ai.documentintelligence import DocumentIntelligenceClient
from azure.ai.documentintelligence.models import AnalyzeDocumentRequest
from azure.core.credentials import AzureKeyCredential
from models.schemas import ExtractedBiomarker, ExtractionSource

# ── Azure DI client (lazy init) ──────────────────────────────────

_azure_client: DocumentIntelligenceClient | None = None

def _get_azure_client() -> DocumentIntelligenceClient:
    global _azure_client
    if _azure_client is None:
        endpoint = os.getenv("AZURE_DI_ENDPOINT")
        key      = os.getenv("AZURE_DI_KEY")
        if not endpoint or not key:
            raise RuntimeError("AZURE_DI_ENDPOINT and AZURE_DI_KEY must be set in .env")
        _azure_client = DocumentIntelligenceClient(
            endpoint   = endpoint,
            credential = AzureKeyCredential(key)
        )
    return _azure_client


# ── Noise filter ─────────────────────────────────────────────────

_NOISE_NAMES = {
    "patient", "name", "age", "gender", "sex", "date", "report", "lab",
    "doctor", "dr", "sample", "collected", "received", "printed", "page",
    "method", "remarks", "note", "reference", "normal", "abnormal",
    "unit", "result", "test", "barcode", "id", "accession", "hospital",
    "address", "phone", "email", "signature", "approved", "checked",
    "technician", "pathologist", "time", "department", "ward", "bed",
    "uhid", "pid", "mrn", "reg", "registration", "visit", "opd", "ipd",
}

_SECTION_HEADERS = {
    "haematology", "hematology", "biochemistry", "serology", "urine",
    "lipid profile", "liver function", "kidney function", "thyroid",
    "diabetes", "complete blood count", "cbc", "lft", "kft", "rft",
    "blood sugar", "hormone", "immunology", "microbiology",
    "complete hemogram", "hemogram"
}

def _is_noise(name: str, value: float | None) -> bool:
    lower = name.lower().strip()
    if lower in _NOISE_NAMES:
        return True
    if lower in _SECTION_HEADERS:
        return True
    if len(lower) < 2:
        return True
    if len(lower) > 60:
        return True
    # Pure numbers as names
    if re.match(r"^\d+$", lower):
        return True
    # Value is None or zero with no context
    if value is None:
        return True
    return False


# ── Shared parsers ───────────────────────────────────────────────

def _parse_value(text: str) -> float | None:
    if not text:
        return None
    clean = re.sub(r"[^\d.]", "", text.strip())
    if not clean or clean == ".":
        return None
    try:
        return float(clean)
    except ValueError:
        return None


def _parse_ref_range(text: str) -> tuple[float | None, float | None]:
    if not text:
        return None, None
    text = text.strip()

    # 13.0 - 17.0 / 13.0–17.0 / 13.0 to 17.0
    m = re.search(r"([\d.]+)\s*[-–to]+\s*([\d.]+)", text, re.IGNORECASE)
    if m:
        try:
            return float(m.group(1)), float(m.group(2))
        except ValueError:
            pass

    # < 200 / Upto 200 / Up to 5.0
    m = re.search(r"(?:<|upto|up\s+to)\s*([\d.]+)", text, re.IGNORECASE)
    if m:
        return 0.0, float(m.group(1))

    # > 40
    m = re.search(r">\s*([\d.]+)", text)
    if m:
        return float(m.group(1)), 99999.0

    return None, None


def _parse_flag(text: str) -> str | None:
    if not text:
        return None
    clean = text.strip().upper()
    known = {
        "H", "L", "HH", "LL", "C", "CRIT", "CRITICAL",
        "HIGH", "LOW", "ABNORMAL", "A", "E", "PANIC", "H*", "L*",
        "*H", "*L", "HIGH*", "LOW*"
    }
    # Direct match
    if clean in known:
        return clean
    # Contains flag marker
    for flag in known:
        if flag in clean:
            return flag
    return None


def _make_bio(
    name: str,
    value: float,
    unit: str,
    ref_low: float | None,
    ref_high: float | None,
    flag: str | None,
    source: ExtractionSource,
    confidence: float,
) -> ExtractedBiomarker | None:
    if _is_noise(name, value):
        return None
    return ExtractedBiomarker(
        raw_name              = name.strip(),
        normalized_name       = None,
        loinc_code            = None,
        value                 = value,
        unit                  = unit.strip() or "units",
        lab_ref_low           = ref_low,
        lab_ref_high          = ref_high,
        lab_flag              = flag,
        extraction_source     = source,
        extraction_confidence = round(min(confidence, 1.0), 2),
    )


# ════════════════════════════════════════════════════════════════
# PYMUPDF MULTI-STRATEGY EXTRACTION
# ════════════════════════════════════════════════════════════════

def _extract_pymupdf(pdf_bytes: bytes) -> list[ExtractedBiomarker]:
    doc = pymupdf.open(stream=pdf_bytes, filetype="pdf")

    all_results: list[list[ExtractedBiomarker]] = []

    for page in doc:
        # Strategy 1: position-based column detection (most robust)
        results_pos = _strategy_positional(page)
        all_results.append(results_pos)

        # Strategy 2: regex on plain text lines
        text = page.get_text()
        results_regex = _strategy_regex_lines(text, ExtractionSource.PYMUPDF)
        all_results.append(results_regex)

        # Strategy 3: PyMuPDF native table finder (v1.23+)
        try:
            results_table = _strategy_pymupdf_tables(page)
            all_results.append(results_table)
        except Exception:
            pass

    doc.close()

    # Pick best strategy result per page, merge across pages
    # "Best" = most biomarkers with reference ranges
    return _merge_and_deduplicate(all_results)


def _score_results(results: list[ExtractedBiomarker]) -> float:
    """Score a strategy result. Higher = better."""
    if not results:
        return 0.0
    score = len(results) * 1.0
    # Bonus for having reference ranges (more structured extraction)
    score += sum(1 for b in results if b.lab_ref_low is not None) * 0.5
    # Bonus for having units
    score += sum(1 for b in results if b.unit != "units") * 0.3
    return score


# ── Strategy 1: Positional (word-level X alignment) ─────────────

def _strategy_positional(page) -> list[ExtractedBiomarker]:
    """
    Uses word bounding boxes to detect column alignment.
    Works on PDFs where text looks tabular but has no actual table structure.
    This is how Lal PathLabs and many standalone lab PDFs are generated.
    """
    words = page.get_text("words")
    # words: (x0, y0, x1, y1, text, block_no, line_no, word_no)

    if not words:
        return []

    # Group words by line (same y0 within 3 points)
    lines: dict[int, list] = {}
    for w in words:
        y_key = round(w[1] / 3) * 3  # bucket y coordinates
        lines.setdefault(y_key, []).append(w)

    # Sort each line by x position
    sorted_lines = []
    for y_key in sorted(lines.keys()):
        line_words = sorted(lines[y_key], key=lambda w: w[0])
        sorted_lines.append(line_words)

    biomarkers = []
    for line_words in sorted_lines:
        bio = _parse_positional_line(line_words)
        if bio:
            biomarkers.append(bio)

    return biomarkers


def _parse_positional_line(
    words: list
) -> ExtractedBiomarker | None:
    """
    From a sorted list of words on one line, extract biomarker fields.

    Typical layout:
    [Name words...] [numeric value] [unit] [ref range or ref_low ref_high] [flag?]

    Key insight: the value is the FIRST purely numeric token.
    Everything before it = name. Everything after = unit/range/flag.
    """
    if len(words) < 2:
        return None

    texts = [w[4] for w in words]
    full_line = " ".join(texts)

    # Find first numeric token index
    value_idx = None
    for i, t in enumerate(texts):
        clean = re.sub(r"[^\d.]", "", t)
        if clean and re.match(r"^\d+\.?\d*$", clean) and len(t) <= 12:
            # Make sure it's a reasonable value, not a date or ID
            try:
                val = float(clean)
                if 0.001 <= val <= 999999:
                    value_idx = i
                    break
            except ValueError:
                continue

    if value_idx is None or value_idx == 0:
        return None

    # Name = everything before value_idx
    name = " ".join(texts[:value_idx]).strip()
    name = re.sub(r"[:\-]+$", "", name).strip()

    if not name or len(name) < 2:
        return None

    value = float(re.sub(r"[^\d.]", "", texts[value_idx]))

    # Remaining tokens after value
    remaining = texts[value_idx + 1:]

    unit      = ""
    ref_low   = None
    ref_high  = None
    flag      = None

    if remaining:
        # First remaining token: likely unit if not numeric
        first = remaining[0]
        if not re.match(r"^[\d.]+$", first):
            unit      = first
            remaining = remaining[1:]
        
        # Look for reference range in remaining
        remaining_str = " ".join(remaining)
        ref_low, ref_high = _parse_ref_range(remaining_str)

        # Look for flag in last token
        if remaining:
            flag = _parse_flag(remaining[-1])

    # Confidence: higher if we have unit and range
    confidence = 0.70
    if ref_low is not None:
        confidence += 0.15
    if unit:
        confidence += 0.10

    return _make_bio(name, value, unit, ref_low, ref_high, flag,
                     ExtractionSource.PYMUPDF, confidence)


# ── Strategy 2: Regex on plain text lines ───────────────────────

# Handles inline format: "Hemoglobin: 14.2 g/dL (13.0-17.0)"
_INLINE_RE = re.compile(
    r"^([A-Za-z][A-Za-z0-9\s/().,'%-]{1,50}?)"
    r"\s*[:\-]\s*"
    r"([\d.]+)"
    r"\s*([A-Za-z/%µ*^³]{0,15})"
    r"(?:\s*[\[(]([^\])\n]{3,30})[\])])?"
    r"(?:\s+(H|L|HH|LL|HIGH|LOW|C|A))?",
    re.IGNORECASE
)

# Handles tabular: "Hemoglobin   14.2   g/dL   13.0-17.0   L"
_TABULAR_RE = re.compile(
    r"^([A-Za-z][A-Za-z0-9\s/().,'%-]{1,50}?)"
    r"\s{2,}"
    r"([\d.]+)"
    r"(?:\s+([A-Za-z/%µ*^³]{1,15}))?"
    r"(?:\s+([\d.\s\-–<>]+(?:[\d.]+)))?"
    r"(?:\s+(H\b|L\b|HH|LL|HIGH|LOW|CRIT|ABNORMAL))?\s*$",
    re.IGNORECASE
)


def _strategy_regex_lines(
    text: str,
    source: ExtractionSource
) -> list[ExtractedBiomarker]:
    biomarkers = []
    current_section = ""

    for raw_line in text.split("\n"):
        line = raw_line.strip()
        if not line:
            continue

        # Track section headers for context (future use)
        if line.lower() in _SECTION_HEADERS or any(
            h in line.lower() for h in _SECTION_HEADERS
        ):
            current_section = line
            continue

        # Try inline pattern first
        m = _INLINE_RE.match(line)
        if m:
            name     = m.group(1).strip().rstrip(":-")
            value    = _parse_value(m.group(2))
            unit     = (m.group(3) or "").strip()
            ref_str  = (m.group(4) or "").strip()
            flag_str = (m.group(5) or "").strip()

            if value is not None:
                ref_low, ref_high = _parse_ref_range(ref_str)
                bio = _make_bio(
                    name, value, unit, ref_low, ref_high,
                    _parse_flag(flag_str), source, 0.75
                )
                if bio:
                    biomarkers.append(bio)
            continue

        # Try tabular pattern
        m = _TABULAR_RE.match(line)
        if m:
            name     = m.group(1).strip()
            value    = _parse_value(m.group(2))
            unit     = (m.group(3) or "").strip()
            ref_str  = (m.group(4) or "").strip()
            flag_str = (m.group(5) or "").strip()

            if value is not None:
                ref_low, ref_high = _parse_ref_range(ref_str)
                confidence = 0.80
                if ref_low is not None:
                    confidence += 0.10
                bio = _make_bio(
                    name, value, unit, ref_low, ref_high,
                    _parse_flag(flag_str), source, confidence
                )
                if bio:
                    biomarkers.append(bio)

    return biomarkers


# ── Strategy 3: PyMuPDF native table finder ──────────────────────

def _strategy_pymupdf_tables(page) -> list[ExtractedBiomarker]:
    """
    PyMuPDF 1.23+ has a built-in table finder.
    Works on PDFs with actual table borders/lines.
    """
    biomarkers = []
    tabs = page.find_tables()

    for tab in tabs:
        df = tab.to_pandas()
        if df.empty or len(df.columns) < 2:
            continue

        # Detect column roles from headers
        headers = [str(c).lower() for c in df.columns]
        col_roles = _detect_df_column_roles(headers)

        for _, row in df.iterrows():
            bio = _df_row_to_biomarker(row, col_roles)
            if bio:
                biomarkers.append(bio)

    return biomarkers


def _detect_df_column_roles(headers: list[str]) -> dict[str, int]:
    roles: dict[str, int] = {}
    name_kw  = {"test", "investigation", "parameter", "analyte", "name", "description", "particulars"}
    value_kw = {"result", "value", "observed", "your", "found", "reported"}
    unit_kw  = {"unit", "units"}
    range_kw = {"reference", "normal", "range", "ref", "biological", "interval"}
    flag_kw  = {"flag", "remark", "status", "interpretation", "remarks"}

    for i, h in enumerate(headers):
        if any(k in h for k in name_kw)  and "name"  not in roles: roles["name"]  = i
        elif any(k in h for k in value_kw) and "value" not in roles: roles["value"] = i
        elif any(k in h for k in unit_kw)  and "unit"  not in roles: roles["unit"]  = i
        elif any(k in h for k in range_kw) and "range" not in roles: roles["range"] = i
        elif any(k in h for k in flag_kw)  and "flag"  not in roles: roles["flag"]  = i

    # Positional fallback
    if "name"  not in roles: roles["name"]  = 0
    if "value" not in roles: roles["value"] = 1
    if "unit"  not in roles and len(headers) > 2: roles["unit"]  = 2
    if "range" not in roles and len(headers) > 3: roles["range"] = 3
    if "flag"  not in roles and len(headers) > 4: roles["flag"]  = 4

    return roles


def _df_row_to_biomarker(row, col_roles: dict[str, int]) -> ExtractedBiomarker | None:
    try:
        cols = list(row)
        name     = str(cols[col_roles["name"]]).strip()  if col_roles.get("name")  is not None else ""
        val_str  = str(cols[col_roles["value"]]).strip() if col_roles.get("value") is not None else ""
        unit     = str(cols[col_roles.get("unit",  -1)]).strip() if col_roles.get("unit")  is not None else ""
        ref_str  = str(cols[col_roles.get("range", -1)]).strip() if col_roles.get("range") is not None else ""
        flag_str = str(cols[col_roles.get("flag",  -1)]).strip() if col_roles.get("flag")  is not None else ""
    except (IndexError, KeyError):
        return None

    if not name or not val_str:
        return None

    value = _parse_value(val_str)
    if value is None:
        return None

    ref_low, ref_high = _parse_ref_range(ref_str)
    flag = _parse_flag(flag_str)

    confidence = 0.80
    if ref_low is not None: confidence += 0.10
    if unit and unit not in ("None", "nan"): confidence += 0.05

    unit = "" if unit in ("None", "nan") else unit

    return _make_bio(name, value, unit, ref_low, ref_high,
                     flag, ExtractionSource.PYMUPDF, confidence)


# ── Merge and deduplicate across strategies ──────────────────────

def _merge_and_deduplicate(
    all_results: list[list[ExtractedBiomarker]]
) -> list[ExtractedBiomarker]:
    """
    For each biomarker name, keep the extraction with highest confidence.
    This means if positional found it with ref range (conf 0.95) and
    regex found it without ref range (conf 0.75), we keep positional.
    """
    best: dict[str, ExtractedBiomarker] = {}

    for results in all_results:
        for bio in results:
            key = bio.raw_name.lower().strip()
            if key not in best:
                best[key] = bio
            elif bio.extraction_confidence > best[key].extraction_confidence:
                best[key] = bio
            # If same confidence but new one has ref range and old doesn't
            elif (
                bio.extraction_confidence == best[key].extraction_confidence
                and bio.lab_ref_low is not None
                and best[key].lab_ref_low is None
            ):
                best[key] = bio

    return list(best.values())


# ════════════════════════════════════════════════════════════════
# AZURE DI EXTRACTION
# ════════════════════════════════════════════════════════════════

def _extract_azure_di(
    file_bytes: bytes,
    content_type: str
) -> list[ExtractedBiomarker]:
    client = _get_azure_client()

    poller = client.begin_analyze_document(
        "prebuilt-layout",
        body         = file_bytes,
        content_type = content_type,
    )
    result = poller.result()

    biomarkers: list[ExtractedBiomarker] = []

    # Pass 1: extract from detected tables
    for table in result.tables:
        rows = _parse_azure_table(table)
        biomarkers.extend(rows)

    # Pass 2: extract from key-value pairs (Azure DI detects these)
    if hasattr(result, "key_value_pairs") and result.key_value_pairs:
        for kv in result.key_value_pairs:
            bio = _parse_azure_kv(kv)
            if bio:
                biomarkers.append(bio)

    # Pass 3: if still sparse, fall back to paragraph text strategies
    if len(biomarkers) < 3 and result.paragraphs:
        full_text = "\n".join(
            p.content for p in result.paragraphs if p.content
        )
        text_results = _strategy_regex_lines(
            full_text, ExtractionSource.AZURE_DI
        )
        biomarkers.extend(text_results)

    return _merge_and_deduplicate([biomarkers])


def _parse_azure_table(table) -> list[ExtractedBiomarker]:
    if table.row_count < 2:
        return []

    grid: dict[int, dict[int, str]] = {}
    for cell in table.cells:
        grid.setdefault(cell.row_index, {})[cell.column_index] = (
            cell.content.strip() if cell.content else ""
        )

    header_row = grid.get(0, {})
    col_roles  = _detect_azure_column_roles(header_row)

    biomarkers = []
    for row_idx in range(1, table.row_count):
        row = grid.get(row_idx, {})
        bio = _azure_row_to_biomarker(row, col_roles)
        if bio:
            biomarkers.append(bio)

    return biomarkers


def _detect_azure_column_roles(header: dict[int, str]) -> dict[str, int]:
    roles: dict[str, int] = {}
    name_kw  = {"test", "investigation", "parameter", "analyte", "name", "description", "particulars"}
    value_kw = {"result", "value", "observed", "your", "found", "reported"}
    unit_kw  = {"unit", "units"}
    range_kw = {"reference", "normal", "range", "ref", "biological", "interval"}
    flag_kw  = {"flag", "remark", "status", "interpretation"}

    for col_idx, text in header.items():
        lower = text.lower()
        if any(k in lower for k in name_kw)  and "name"  not in roles: roles["name"]  = col_idx
        elif any(k in lower for k in value_kw) and "value" not in roles: roles["value"] = col_idx
        elif any(k in lower for k in unit_kw)  and "unit"  not in roles: roles["unit"]  = col_idx
        elif any(k in lower for k in range_kw) and "range" not in roles: roles["range"] = col_idx
        elif any(k in lower for k in flag_kw)  and "flag"  not in roles: roles["flag"]  = col_idx

    # Positional fallback
    if "name"  not in roles: roles["name"]  = 0
    if "value" not in roles: roles["value"] = 1
    if "unit"  not in roles and len(header) > 2: roles["unit"]  = 2
    if "range" not in roles and len(header) > 3: roles["range"] = 3
    if "flag"  not in roles and len(header) > 4: roles["flag"]  = 4

    return roles


def _azure_row_to_biomarker(
    row: dict[int, str],
    col_roles: dict[str, int]
) -> ExtractedBiomarker | None:
    name_col  = col_roles.get("name",  0)
    value_col = col_roles.get("value", 1)
    unit_col  = col_roles.get("unit")
    range_col = col_roles.get("range")
    flag_col  = col_roles.get("flag")

    raw_name = row.get(name_col, "").strip()
    val_str  = row.get(value_col, "").strip()
    unit     = row.get(unit_col,  "").strip() if unit_col  is not None else ""
    ref_str  = row.get(range_col, "").strip() if range_col is not None else ""
    flag_str = row.get(flag_col,  "").strip() if flag_col  is not None else ""

    if not raw_name or not val_str:
        return None
    if raw_name.lower() in {"test", "investigation", "parameter", "analyte"}:
        return None

    value = _parse_value(val_str)
    if value is None:
        return None

    ref_low, ref_high = _parse_ref_range(ref_str)
    flag = _parse_flag(flag_str)

    confidence = 0.75
    if ref_low is not None: confidence += 0.15
    if unit:                confidence += 0.10

    return _make_bio(raw_name, value, unit, ref_low, ref_high,
                     flag, ExtractionSource.AZURE_DI,
                     round(confidence, 2))


def _parse_azure_kv(kv) -> ExtractedBiomarker | None:
    """
    Azure DI key-value pairs — handles inline label:value format.
    """
    try:
        key   = kv.key.content.strip()   if kv.key   else ""
        value_text = kv.value.content.strip() if kv.value else ""
    except AttributeError:
        return None

    if not key or not value_text:
        return None

    value = _parse_value(value_text)
    if value is None:
        return None

    # Try to extract unit from value_text e.g. "14.2 g/dL"
    unit_match = re.search(r"[\d.]+\s*([A-Za-z/%µ]+)", value_text)
    unit = unit_match.group(1).strip() if unit_match else ""

    return _make_bio(
        key, value, unit, None, None, None,
        ExtractionSource.AZURE_DI, 0.65
    )


# ════════════════════════════════════════════════════════════════
# PUBLIC ENTRY POINT
# ════════════════════════════════════════════════════════════════

async def extract(
    file_bytes:   bytes,
    content_type: str,
) -> list[ExtractedBiomarker]:
    """
    Strategy:
    PDF  → PyMuPDF multi-strategy (3 approaches, best wins)
           If < 3 biomarkers → Azure DI
    Image → Azure DI directly (3 passes: tables, KV pairs, text)
    """
    biomarkers: list[ExtractedBiomarker] = []

    if content_type == "application/pdf":
        biomarkers = _extract_pymupdf(file_bytes)

        if len(biomarkers) < 3:
            # Scanned PDF — escalate to Azure DI
            try:
                biomarkers = _extract_azure_di(file_bytes, content_type)
            except Exception as e:
                # Azure not configured or failed — return what we have
                print(f"  [extractor] Azure DI fallback failed: {e}")

    else:
        # Image — Azure DI only
        biomarkers = _extract_azure_di(file_bytes, content_type)

    # Final noise filter
    biomarkers = [
        b for b in biomarkers
        if not _is_noise(b.raw_name, b.value)
    ]

    # Flag low confidence for manual review
    for bio in biomarkers:
        if bio.extraction_confidence < 0.6:
            object.__setattr__(bio, "needs_manual_review", True)

    return biomarkers