'use strict';
/**
 * easm-proxy — secure backend for the EASM Scanner web app.
 *
 * Holds SHODAN_API_KEY and GITHUB_TOKEN server-side (Render env vars).
 * The public web app calls these endpoints instead of the third-party
 * APIs directly, so keys are never exposed in client-side code.
 *
 * Endpoints:
 *   GET /api/health
 *   GET /api/github/search?q=<query>        → GitHub code search
 *
 * Defenses: per-IP rate limiting, strict query validation, no key logging.
 */
const express = require('express');
const cors = require('cors');
const rateLimit = require('express-rate-limit');

const PORT = process.env.PORT || 3000;
const GITHUB_TOKEN = process.env.GITHUB_TOKEN || '';
const FETCH_TIMEOUT_MS = 25000;

const app = express();
app.use(cors()); // public app calls from the browser
app.use(express.json());

// --- rate limiting: 30 requests/min per IP across API routes ---
const apiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { ok: false, error: 'rate_limited', message: 'Too many requests, slow down.' },
});
app.use('/api/', apiLimiter);

app.get('/api/health', (_req, res) => {
  res.json({
    ok: true,
    github: Boolean(GITHUB_TOKEN),
    time: new Date().toISOString(),
  });
});

async function fetchWithTimeout(url, options = {}) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), FETCH_TIMEOUT_MS);
  try {
    return await fetch(url, { ...options, signal: ctrl.signal });
  } finally {
    clearTimeout(t);
  }
}

// --- GitHub code search proxy ---
// q must be a short, sane search string (domain + keyword).
app.get('/api/github/search', async (req, res) => {
  if (!GITHUB_TOKEN) {
    return res.status(503).json({ ok: false, error: 'github_not_configured' });
  }
  const q = String(req.query.q || '').trim();
  if (!q || q.length > 200 || /[<>"'\\]/.test(q)) {
    return res.status(400).json({ ok: false, error: 'bad_query' });
  }
  try {
    const url = 'https://api.github.com/search/code?q=' + encodeURIComponent(q) + '&per_page=5';
    const resp = await fetchWithTimeout(url, {
      headers: {
        'User-Agent': 'easm-proxy/1.0',
        'Accept': 'application/vnd.github+json',
        'Authorization': 'Bearer ' + GITHUB_TOKEN,
      },
    });
    if (!resp.ok) {
      const status = resp.status;
      return res.status(502).json({ ok: false, error: 'github_error', status });
    }
    const data = await resp.json();
    // Return only the fields the scanner needs — never raw token metadata.
    const items = (data.items || []).map((it) => ({
      repo: (it.repository || {}).full_name || '',
      path: it.path || '',
      url: it.html_url || '',
    }));
    res.json({ ok: true, total_count: data.total_count || 0, items });
  } catch (err) {
    res.status(502).json({ ok: false, error: 'github_unreachable' });
  }
});

// 404 for everything else
app.use((_req, res) => res.status(404).json({ ok: false, error: 'not_found' }));

app.listen(PORT, () => {
  console.log(`[easm-proxy] listening on ${PORT} (github=${Boolean(GITHUB_TOKEN)})`);
});
