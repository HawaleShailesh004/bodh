# Bodh — बोध

> **Apni report, apni bhasha, apna faisla.**  
> Your report. Your language. Your decision.

---

My father got his CBC report last year. Twenty-two numbers on a printed sheet. He waited four days for a doctor's appointment — just to be told his haemoglobin was low and to eat more spinach. Four days of anxiety for a ten-second explanation.

That is not a personal story. That is 1.4 billion people.

**Bodh** is an AI-powered health literacy tool that takes any Indian lab report — PDF or photo — and explains every value in plain Hindi, Marathi, or English in under 20 seconds. Built for the patient who gets the report but never gets the explanation.

---

## 🔗 Live

**[bodh-pearl.vercel.app](https://bodh-pearl.vercel.app)**

---

## What it does

Upload a blood test from SRL, Lal PathLabs, Metropolis, Thyrocare, or any Indian lab — Bodh extracts every value, verifies it against **ICMR Indian population guidelines**, assigns a severity level using a **deterministic rule engine** (not AI guessing), and returns:

- A plain-language summary of the full report in English, Hindi, and Marathi
- Priority cards for the top 3 values that need attention most
- Expanded explanation per biomarker with diet tips
- 3 specific doctor questions generated from your actual abnormal values
- A print-ready clinical table for your doctor visit
- A report-grounded chatbot that answers questions only about your report
- One-tap WhatsApp share

**Severity is never decided by AI.** A deterministic rule engine using ICMR reference data decides NORMAL / WATCH / ACT_NOW / EMERGENCY. AI only writes the plain-language explanation after severity is fixed.

**Your name, phone number, and address are stripped before any AI model sees a single byte.**

---

## The problem in numbers

| Stat | Source |
|------|--------|
| ₹1.54 Trillion — India diagnostic lab market FY2024, growing to ₹2.98T by FY2030 | Research & Markets, 2025 |
| 95% of clinical decisions are influenced by diagnostics | Nat Health India / Expert Market Research |
| 57% of Indian women and 67% of children under 5 are anaemic | NFHS-5, Govt. of India PIB |
| 36% of women, 29% of men lack awareness of basic health indicators | NFHS-5 |
| Low health literacy → 25% higher hospital readmission rates | Rustagi & Gautam, 2021 |

There is no standalone, patient-facing tool that works with any Indian lab, explains results in Hindi or Marathi, and uses Indian population reference ranges. Bodh is first.

---

## Demo

**Live URL:** [bodh-pearl.vercel.app](https://bodh-pearl.vercel.app)

Use the sample report in `/demo/sample_CBC.pdf` or upload any real Indian lab report.

Suggested demo flow:
1. Upload a CBC report → watch the 5-stage scanner
2. See the personal message + health score
3. Read the AI summary → switch to Hindi → hit Listen
4. Expand a priority card → see the gauge needle + diet tip
5. Tap an underlined medical term → jargon sheet appears
6. Open the chat → ask "हीमोग्लोबिन कम क्यों है?"
7. Hit Print → clean doctor-ready table opens

---

## Tech stack

| Layer | Stack |
|-------|-------|
| Frontend | Next.js 16, React 19, TypeScript, Tailwind v4, Framer Motion, Lucide |
| Backend | FastAPI, Uvicorn, Python, Pydantic |
| OCR | Azure Document Intelligence (scanned PDFs + images) |
| Extraction | Groq Llama 3.3-70b (structured biomarker JSON) |
| Explanation | Groq Llama 3.3-70b + OpenAI GPT-4o (parallel, cross-validated) |
| Summary + Questions | Groq Llama 3.3-70b (single JSON, all 3 languages) |
| Chat | Groq Llama 3.3-70b (report-grounded, refuses off-report questions) |
| Reference data | ICMR Indian population guidelines (60+ biomarkers, LOINC codes) |
| Deployment | Vercel (frontend) + Railway (backend) |

---

## Privacy by design

```
[Your PDF / Photo]
       ↓
[PII Stripper]  ← name, phone, address removed HERE
       ↓
[AI sees only: {age, gender, biomarkers[]}]
       ↓
[Results displayed — deleted after session]
```

No patient database. No login. No data stored beyond your browser session. The AI never sees who you are — only what your blood values are.

---

## Run locally

**Backend**

```bash
cd backend
pip install -r requirements.txt

# Create .env with:
# GROQ_API_KEY=your_key
# OPENAI_API_KEY=your_key
# AZURE_DI_ENDPOINT=your_endpoint
# AZURE_DI_KEY=your_key

uvicorn main:app --reload --port 8000
```

**Frontend**

```bash
cd frontend
npm install

# Create .env with:
# NEXT_PUBLIC_API_URL=http://localhost:8000

npm run dev
```

Health check: `GET http://localhost:8000/health`

---

## Documentation

| Doc | What's inside |
|-----|---------------|
| [architecture.md](./architecture.md) | System design, pipeline stages, data flow diagrams |
| [PROJECT_IMPLEMENTATION.md](./PROJECT_IMPLEMENTATION.md) | Full file-by-file implementation handbook |
| [design.md](./design.md) | Design system, severity palette, UX patterns |
| [prototype.md](./prototype.md) | Demo script, API surface, prototype boundaries |

---

## Repository layout

```
bodh/
├── backend/
│   ├── main.py                  FastAPI app
│   ├── routers/analyze.py       POST /api/analyze, /api/analyze/manual
│   ├── routers/chat.py          POST /api/chat
│   ├── services/extractor.py    OCR, PII strip, Groq extraction
│   ├── services/verifier.py     ICMR ranges, normalization
│   ├── services/severity.py     Deterministic severity engine
│   ├── services/explainer.py    Dual-model explain + report summary
│   ├── data/icmr_ranges.json    60+ biomarkers, ICMR guidelines
│   └── Procfile                 Railway deployment
└── frontend/
    ├── app/                     Next.js App Router pages
    ├── components/              UI components
    ├── context/AppContext.tsx   Global state
    ├── hooks/useAnalyze.ts      Upload + analysis flow
    └── lib/                     Types, constants, helpers
```

---

## Roadmap

| Feature | Why |
|---------|-----|
| Family health dashboard | Multi-member profiles, track values over time |
| WhatsApp bot | Same pipeline — no app download needed |
| Tamil, Telugu, Bengali | 4 more Indian languages |
| Lab white-label API | B2B — labs embed Bodh's explanation engine, ₹2–5 per report |
| Authenticated report history | Opt-in for returning users who want trend tracking |

---

## What Bodh is not

Bodh is a health literacy tool. It explains what your values mean. It does not diagnose disease, prescribe medication, or replace a doctor. Every screen reminds users to consult a qualified physician before making medical decisions.

---

*Built for Quantum Arena 1.0 · Navsahyadri Institutes, Pune · April 2026*