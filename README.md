# EASM Proxy

Secure backend for the EASM Scanner web app. Holds `GITHUB_TOKEN`
server-side so the public static page never sees it.

## Endpoints

- `GET /api/health` → `{ ok, github: bool }`
- `GET /api/github/search?q=<query>` → proxied GitHub code search
  (top 5 hits: repo, path, url)

## Security

- Token lives in Render env var (`sync: false` — entered in dashboard).
- Per-IP rate limit: 30 req/min on `/api/*`.
- Strict query validation; never logs the token; minimal response fields.

## Deploy (Render, free)

1. Push this directory to a GitHub repo.
2. Render dashboard → New → Web Service → connect repo.
3. Build: `npm install`, Start: `npm start`, Health check: `/api/health`.
4. Add env var `GITHUB_TOKEN`.
5. Point the EASM web app at `https://<service>.onrender.com/api`.
