# Bodh — prototype explanation

This document describes **what the current repository demonstrates**, how to **run and demo** it, and where **prototype boundaries** lie. It is aimed at hackathon judges, pilot partners, and contributors.

For full engineering detail, see [architecture.md](./architecture.md), [design.md](./design.md), and [PROJECT_IMPLEMENTATION.md](./PROJECT_IMPLEMENTATION.md).

---

## 1. What this prototype is

Bodh is a **working end-to-end prototype**: a web app that accepts an Indian lab report (PDF or image), calls a **FastAPI** backend to extract and verify values against **ICMR-oriented reference data**, applies **deterministic severity**, then returns **multilingual explanations**, a **report summary**, **suggested doctor questions**, **chat starter prompts**, and a **report-grounded chatbot**.

**In scope for the prototype**

- Upload flow with **perceived-progress** loading UI and trust messaging.
- **Manual entry** when uploads fail or users prefer typing.
- **Results** dashboard: summary, priority cards, full biomarker list with gauges/range bars, jargon sheet, doctor questions, WhatsApp text share, print view.
- **Session-scoped** result storage in the browser (`sessionStorage`); print handoff via `localStorage` snapshot for a new tab.

**Explicitly out of scope (today)**

- No persistent patient accounts or hospital EMR integration.
- No regulated clinical decision support certification; outputs are **health literacy**, not diagnosis.

---

## 2. How to run the prototype locally

### Backend

From `backend/` (with Python env and dependencies installed per `requirements.txt`):

1. Set **`GROQ_API_KEY`** and **`OPENAI_API_KEY`** (required for explanation pipeline).
2. Set **Azure Document Intelligence** credentials if you want OCR on scans (optional for text-only PDFs via PyMuPDF).
3. Run: `uvicorn main:app --reload --port 8000`.

Health check: `GET http://localhost:8000/health`.

### Frontend

From `frontend/`:

1. Set **`NEXT_PUBLIC_API_URL`** to your API base (e.g. `http://localhost:8000`).
2. Run: `npm install` then `npm run dev`.

Open the app URL (default Next dev port). Landing is **`/`**; analysis starts at **`/analyze`**.

---

## 3. Demo script (5–7 minutes)

| Step | Action | What to highlight |
| :--- | :--- | :--- |
| 1 | Open **`/`** | Positioning, ICMR trust line, language familiarity (navbar on inner pages). |
| 2 | **Start** → **`/analyze`** | Age/gender, drag-drop or camera, trust chips (PII, no storage). |
| 3 | Upload a **clear CBC / metabolic panel** PDF or photo | Loader stages and tips while `POST /api/analyze` runs. |
| 4 | Land on **`/results`** | Overall severity tint, summary in EN/HI/MR, top priority rows. |
| 5 | Expand a biomarker | Range bar (middle-third normal band), gauge when abnormal, diet tip if present. |
| 6 | Tap a **underlined jargon** term | Bottom sheet definition. |
| 7 | Open **chat**, ask something about the report | Grounded answers only; off-topic refusal. |
| 8 | **Share** (WhatsApp) | Pre-filled plain text summary. |
| 9 | **Print** | Opens **`/print`** with snapshot; doctor-friendly layout. |
| 10 | Optional: **`/manual`** | Same API pipeline without file upload. |

**Fallback if OCR fails:** use manual entry with a few rows, then same results experience.

---

## 4. API surface the prototype exercises

| Call | Purpose |
| :--- | :--- |
| `POST /api/analyze` | Multipart: file + age + gender → full `AnalysisResult`. |
| `POST /api/analyze/manual` | JSON biomarkers → same shape as analyze. |
| `POST /api/chat` | User message + report dict → short Groq reply. |

---

## 5. Prototype limitations (honest)

- **Stage text during upload** advances on a **timer** for UX; it does not map 1:1 to server phases.
- **Chat** is **Groq-only**; rate limits and keys apply.
- **Jargon sheet** entries are a **curated subset** (not every acronym on every lab).
- **CORS** on the API is wide open in code; production should lock origins.
- **No automated E2E suite** in repo is assumed; manual demo is the validation path for hackathons.

---

## 6. What judges / stakeholders should verify

1. **Safety story:** severity on screen matches rule engine intent (not “whatever the LLM felt”).  
2. **India fit:** Hindi/Marathi copy, ICMR wording, share/print for real-world follow-up.  
3. **Trust UX:** loader, flags for unknown/manual review, no silent failures on empty extraction.  
4. **Technical depth:** parallel LLM reconciliation for explanations, deterministic verifier (see architecture doc).

---

## 7. Related documents

- [README.md](./README.md) — product summary and stack pointers  
- [architecture.md](./architecture.md) — system and data flow  
- [design.md](./design.md) — UI tokens and UX patterns  
- [PROJECT_IMPLEMENTATION.md](./PROJECT_IMPLEMENTATION.md) — file-level implementation handbook  
