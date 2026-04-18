# Bodh frontend

Next.js (**App Router**) UI for [Bodh](../README.md): upload Indian lab reports, view verified severity and multilingual explanations, print, and report-grounded chat.

## Docs

| Document | Contents |
| :--- | :--- |
| [../README.md](../README.md) | Product summary, pipeline overview, repo map |
| [../PROJECT_IMPLEMENTATION.md](../PROJECT_IMPLEMENTATION.md) | Full handbook: routes, APIs, storage, deployment |
| [../architecture.md](../architecture.md) | System diagram and request lifecycle |
| [../design.md](../design.md) | Severity tokens, typography, UX patterns |

## Setup

1. Copy env: use **`NEXT_PUBLIC_API_URL`** pointing at the FastAPI base (e.g. `http://localhost:8000` or `https://your-api.example.com`). Bare hostname is allowed; **`lib/apiBase.ts`** normalizes it for `fetch`, and **`next.config.ts`** normalizes rewrites for production builds.
2. Install and run:

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). Flow: **`/`** → **`/analyze`** → **`/results`**; **`/manual`** for typed values; **`/print`** for a print layout (uses a `localStorage` snapshot when opened from results in a new tab).

## Scripts

- **`npm run dev`** — development server  
- **`npm run build`** — production build (run before deploy; catches invalid Next rewrites)  
- **`npm run lint`** — ESLint  

See root **`PROJECT_IMPLEMENTATION.md`** §12 for Vercel / Railway pairing with the backend.
