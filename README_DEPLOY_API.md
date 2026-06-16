Vercel / Local - API for `/api/analyze`

Files added:
- `api/analyze.js` — Vercel-compatible serverless function (POST `/api/analyze`).
- `server.js` — Minimal local HTTP server for testing (no external deps).

Local test

1. Run the local server:

```bash
node server.js
```

2. Send a test request:

```bash
curl -sS -X POST http://localhost:3000/api/analyze -H "Content-Type: application/json" -d '{"zone":"ALL","stats":{"n":50,"bp":0.1,"bt":2,"cov":[["Cover-2",0.34]]}}'
```

Deploy to Vercel

1. Install Vercel CLI if you want: `npm i -g vercel` (optional).
2. From the project root (this folder), run:

```bash
vercel --prod
```

Vercel will detect `api/analyze.js` and deploy it as a serverless function at `https://<your-deployment>/api/analyze`.

Notes
- The function returns JSON `{ comment: string }`. It is a lightweight heuristic summary to support the frontend.
- For production-grade AI analysis, replace the implementation in `api/analyze.js` with calls to your ML model or external API.
