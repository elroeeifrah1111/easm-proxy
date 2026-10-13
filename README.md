# EASM Proxy

Secure backend for the EASM Scanner web app. Holds `SHODAN_API_KEY` and
`GITHUB_TOKEN` server-side so the public static page never sees them.

## Endpoints

- `GET /api/health` → `{ ok, github: bool, shodan: bool }`
- `GET /api/github/search?q=<query>` → proxied GitHub code search
  (top 5 hits: repo, path, url)
- `GET /api/shodan/search?query=<query>` → proxied Shodan host search
  (top 50 matches: ip, port, product, hostnames)

## Security

- Keys live in Render env vars (`sync: false` — entered in dashboard).
- Per-IP rate limit: 30 req/min on `/api/*`.
- Strict query validation; never logs keys; minimal response fields.

## Deploy (Render, free)

1. Push this directory to a GitHub repo.
2. Render dashboard → New → Web Service → connect repo.
3. Build: `npm install`, Start: `npm start`, Health check: `/api/health`.
4. Add env vars `SHODAN_API_KEY` and `GITHUB_TOKEN`.
5. Point the EASM web app at `https://<service>.onrender.com/api`.
