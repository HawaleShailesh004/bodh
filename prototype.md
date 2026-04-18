# Bodh — Prototype Scope & Demo Guide

This document describes **what the current build demonstrates**, how to **run and demo it**, and where **intentional design boundaries** lie. For full engineering detail, see [architecture.md](./architecture.md), [design.md](./design.md), and [PROJECT_IMPLEMENTATION.md](./PROJECT_IMPLEMENTATION.md).

---

## 1. What this prototype is

Bodh is a **working end-to-end product**: a web app that accepts any Indian lab report (PDF or photo), calls a FastAPI backend to extract and verify values against ICMR-oriented reference data, applies **deterministic severity** using a rule engine, then returns multilingual explanations, a conversational report summary, specific doctor questions generated from actual abnormal values, chat starter prompts, and a report-grounded chatbot — all in English, Hindi, and Marathi.

**In scope for this build:**

- Upload flow with staged loading UI, trust messaging, and image compression for large phone photos
- Manual entry fallback when uploads fail or users prefer typing values directly
- Full results dashboard: personal message, health score ring, AI summary with voice readout, top 3 priority cards with animated gauges, full collapsible report with search, doctor questions, WhatsApp share, print view for doctor visit
- Report-grounded chatbot: answers questions only about the patient's specific report, refuses off-topic medical advice
- Elderly mode (A+ toggle): larger text throughout all components
- Language toggle (EN/HI/MR) without page reload
- Session-scoped result storage — **no patient data is retained server-side by design**
- Print view opened in new tab using a localStorage handoff — also by design, since sessionStorage doesn't cross tabs

**Design decisions (not limitations):**

- **No persistent patient accounts** — Bodh is session-scoped intentionally. Zero data stored server-side means zero breach risk. This is the privacy architecture, not a missing feature.
- **No regulated clinical certification** — Bodh is a health literacy tool. Severity and routing are deterministic and auditable, but the product deliberately sits outside the medical device regulatory boundary while still being clinically meaningful.
- **No EMR integration** — out of scope for patient-facing v1; B2B API path is the roadmap entry point for this.

---

## 2. How to run locally

### Backend

From `backend/` (with Python env and `requirements.txt` installed):

1. Set `GROQ_API_KEY` and `OPENAI_API_KEY` — required for the explanation pipeline.
2. Set Azure Document Intelligence credentials — needed for scanned PDFs and image uploads. Text-layer PDFs work without it via PyMuPDF.
3. Run: `uvicorn main:app --reload --port 8000`

Health check: `GET http://localhost:8000/health` → `{"status":"ok","service":"bodh-api"}`

### Frontend

From `frontend/`:

1. Set `NEXT_PUBLIC_API_URL=http://localhost:8000` in `.env`
2. Run: `npm install` then `npm run dev`

Open the app (default Next dev port). Landing is `/`; analysis flow starts at `/analyze`.

---

## 3. Demo script (5–7 minutes)

| Step | Action | What to highlight |
|------|---------|-------------------|
| 1 | Open **bodh-pearl.vercel.app** | ICMR trust signal, language familiarity, clean landing |
| 2 | Click Analyze → `/analyze` | Age/gender inputs, drag-drop or camera, privacy trust chips |
| 3 | Upload a **real CBC PDF** (SRL / Lal PathLabs / Metropolis) | Scanner loader — 5 named stages, builds anticipation |
| 4 | Land on `/results` | Severity color tint, personal message, health score ring animation |
| 5 | Read the **AI summary** → switch to Hindi → tap **Listen** | Multilingual, voice readout, one-tap WhatsApp share |
| 6 | Open **Top 3 priority cards** | Animated gauge needle, deviation score, expandable explanation |
| 7 | Expand a biomarker in Full Report | Range bar, diet tip, jargon underline |
| 8 | Tap a **jargon term** (e.g. "platelet") | Bottom sheet definition — zero API call, instant |
| 9 | Open **chat**, ask *"हीमोग्लोबिन कम क्यों है?"* | Grounded answer about this patient's specific value; off-topic refusal |
| 10 | Hit **Print for Doctor** | Clean clinical table, LOINC codes, opens new tab |
| 11 | Toggle **A+** in navbar | Elderly mode — larger text across all components |
| 12 | Optional: `/manual` | Same full pipeline without file upload — demo backup |

**Fallback if OCR fails during demo:** switch to `/manual`, enter 4–5 values by hand, hit Analyze — same results experience, same AI pipeline.

**Strongest moment in the demo:** ask the chatbot a specific question about an abnormal value — "why is my platelet count low?" — and show it answers with the patient's actual number, not a generic response. Then ask something off-topic ("what medicine should I take?") and show it refuses cleanly.

---

## 4. API surface

| Call | Purpose |
|------|---------|
| `POST /api/analyze` | Multipart: file + age + gender → full `AnalysisResult` |
| `POST /api/analyze/manual` | JSON biomarkers → same `AnalysisResult` shape |
| `POST /api/chat` | `{message, history[], report}` → `{reply}` |
| `GET /health` | Liveness check |

---

## 5. Known prototype boundaries

- **Loader stage text** advances on a client timer (~2s per step) for perceived progress UX — it does not map 1:1 to server processing phases. This is intentional UX, not a bug.
- **Chat** is Groq-only; OpenAI is not used on the chat route. Rate limits and API key availability apply.
- **Jargon sheet** covers a curated subset of common CBC/LFT/KFT terms — not every abbreviation on every Indian lab. Marathi jargon definitions are not yet wired per-term in the sheet (UI is Marathi-ready; definitions are en/hi).
- **CORS** is wide open in the current build (`allow_origins=["*"]`). Tighten to specific origins for a hardened production deployment.
- **extractor.py** contains historical duplicate blocks from iterative development. Python binds the last definition — the active implementations are correct. Restart `uvicorn` after edits to extractor to pick up changes.
- **Chat payload** currently sends a fixed `age: 35` in `ReportChat.tsx` — this should be wired to `useApp()` context values for full grounding. Low-risk for demo; fix before B2B API launch.

---

## 6. What judges and evaluators should verify

1. **Safety story:** severity on screen matches the rule engine intent, not LLM output. Ask the team how severity is assigned — the answer should be "rules + ICMR data, not AI."
2. **India fit:** Hindi/Marathi copy throughout, ICMR wording, WhatsApp share for real-world patient behavior.
3. **Trust UX:** the loading stages, the PII trust chips, the `needs_manual_review` flag on low-confidence extractions, the disclaimer on every screen.
4. **Technical depth:** parallel Groq + GPT-4o reconciliation for per-biomarker explanations, deterministic verifier with LOINC codes, 60+ biomarker ICMR dataset.
5. **Demo resilience:** if the upload fails, the team can switch to manual entry without breaking the flow.

---

## 7. Roadmap (6 months)

| Feature | Why |
|---------|-----|
| Family health dashboard | Multi-member profiles, trend charts over time |
| WhatsApp bot | Same pipeline, no app download needed |
| Tamil, Telugu, Bengali | 4 more Indian languages |
| Lab white-label API | B2B revenue — labs embed Bodh's explanation engine |
| Authenticated report history | Opt-in for returning users |

---

## 8. Related documents

| Doc | Contents |
|-----|---------|
| [README.md](./README.md) | Product summary, live URL, quick start |
| [architecture.md](./architecture.md) | System design, pipeline, data flow |
| [design.md](./design.md) | Design system, severity tokens, UX patterns |
| [PROJECT_IMPLEMENTATION.md](./PROJECT_IMPLEMENTATION.md) | Full file-level implementation handbook |