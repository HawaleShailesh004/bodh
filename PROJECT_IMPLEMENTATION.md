# Bodh — Project Implementation

Single reference for architecture, APIs, frontend routes, and operational notes (updated for the routed Next.js app and current backend orchestration).

## 1) Goal

Bodh ingests Indian lab reports (PDF or photo), normalizes biomarkers, applies deterministic severity, and returns multilingual explanations plus a short report summary and doctor-style questions.

Pipeline: **Extract → Verify → Score → Explain → Report summary** → `AnalysisResult`.

## 2) Stack

| Layer | Tech |
|--------|------|
| API | FastAPI, Pydantic v2 |
| OCR / PDF | PyMuPDF (text PDF), Azure Document Intelligence (scanned) |
| LLM | Groq Llama (extraction + report summary), GPT-4o + Groq (per-marker explanations) |
| Web | Next.js 16 (App Router), React 19, TypeScript, Tailwind v4, Framer Motion |

## 3) Backend routes (`routers/analyze.py`)

- **`POST /api/analyze`** — multipart `file`, form `age`, `gender`. Validates MIME and size (20 MB cap). Runs extract → verify → score → **`explain_all(scored)`** → **`generate_report_summary(...)`** with pipeline timing → builds **`AnalysisResult`**. Uses **`_from_report_meta`** so summary and question lists are always strings/lists.
- **`POST /api/analyze/manual`** — JSON biomarker rows; same pipeline without file upload.

Patient context: **`extract(...)`** returns **`(biomarkers, {age, gender})`**. Router prefers detected header values when valid, else form defaults.

## 4) Schemas (`models/schemas.py`)

- Pipeline types: **`ExtractedBiomarker`** → **`VerifiedBiomarker`** → **`ScoredBiomarker`** → **`ExplainedBiomarker`**.
- **`AnalysisResult`**: includes **`report_summary_{en,hi,mr}`** (default `""`) and **`doctor_questions_{en,hi,mr}`** (default empty lists via **`Field(default_factory=list)`**).
- **`PatientContext`**: age 1–119, gender `male` / `female` / `child`.

## 5) Extraction (`services/extractor.py`)

- Text PDF → PyMuPDF; scans / images → Azure DI (optional cache under **`backend/.cache/azure_di/`**).
- **`strip_pii`** before Groq structured extraction.
- **`extract_patient_context`**: OCR-friendly age/gender from the first portion of raw text (English + Hindi labels, Age/Sex lines, yrs., compact `41 / F` style in a narrow window).

## 6) Verification & severity

- **`verifier.py`**: normalization, ICMR-aware ranges, unit harmonization, manual-review flags.
- **`severity.py`**: deterministic severity, specialist recommendation, emergency copy.

## 7) Explanation (`services/explainer.py`)

- **`explain_one` / `explain_all`**: dual-model explanations per marker; reconciliation; ICMR diet tip override when present.
- **`generate_report_summary`**: one Groq JSON call for EN/HI/MR summaries and three doctor questions each; invoked from the **router** after all markers are explained.

## 8) Frontend routes

| Path | Role |
|------|------|
| **`/`** | Landing; CTA navigates to **`/analyze`**. |
| **`/analyze`** | Age/gender, file drop or camera, link to **`/manual`**; uses **`useAnalyze`** (compresses large images client-side before upload). |
| **`/results`** | Reads **`AnalysisResult`** from context / **`sessionStorage`**; summary, priorities, full report, doctor questions. |
| **`/manual`** | Typed biomarkers → **`POST /api/analyze/manual`**. |

## 9) Frontend structure

- **`app/providers.tsx`**: wraps **`AppProvider`** (language, age, gender, elderly, result persistence in **`sessionStorage`**).
- **`context/AppContext.tsx`**: global UI state.
- **`hooks/useAnalyze.ts`**: multipart upload with **`maybeCompressImageForUpload`** for heavy **`image/*`** files.
- **`lib/types.ts`**, **`lib/helpers.ts`** (`normalizeAnalysisResult`), **`lib/constants.ts`**, **`lib/compressImage.ts`**.
- **`components/`**: **`AppShell`**, **`Navbar`**, **`SiteFooter`**, **`LandingPage`**, **`AnalyzeUpload`**, **`AnalyzeScannerLoader`**, results widgets (**`PersonalMessage`**, **`SummaryCard`**, **`TopPriorityCards`**, **`FullReport`**, **`DoctorQuestions`**, **`JargonSheet`**, **`BioCard`**, **`RangeBar`**, **`Gauge`**, **`ScoreRing`**, **`LangToggle`**, **`Logo`**).
- **`app/layout.tsx`**: **`suppressHydrationWarning`** on **`<html>`** / **`<body>`** to tolerate browser extension attribute injection. Icons point at **`/public/brand/`**.

## 10) End-to-end upload

1. User picks file; large photos are re-encoded in-browser (JPEG, bounded dimensions) before **`FormData`**.
2. Backend extracts text, detects demographics when possible, strips PII, Groq extracts markers.
3. Verify → score → explain markers → **`generate_report_summary`**.
4. JSON **`AnalysisResult`** stored in context + **`bodh_result`** session key; **`/results`** renders.

## 11) Security & reliability

- PII stripped before extraction LLM; severity is rule-based, not LLM-decided.
- Dual-model explanation reconciliation; fallbacks on model failure.
- Manual review flags surfaced on markers.

## 12) Environment

Backend **`.env`**: `GROQ_API_KEY`, `OPENAI_API_KEY`, `AZURE_DI_ENDPOINT`, `AZURE_DI_KEY`.  
Frontend: **`NEXT_PUBLIC_API_URL`** (optional; defaults to local backend).

## 13) Run

```bash
# Backend (from backend/)
uvicorn main:app --reload --port 8000

# Frontend (from frontend/)
npm install && npm run dev
```

## 14) Follow-ups

- Deduplicate any legacy duplicate blocks in **`extractor.py`** when safe.
- Add automated tests for verifier, severity, and explainer contracts.
- Structured logging and request IDs for production.
