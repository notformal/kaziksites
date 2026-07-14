# Security review

Reviewed: 2026-07-13 · Scope: React/Vite frontends, Express/SQLite API, authentication, virtual wallet, analytics adapter and hosting headers.

## Executive summary

No critical or high-severity findings were identified. The product has no payments, deposits, withdrawals or real-money wagering. The API stores `scrypt` password hashes, hashes opaque bearer tokens before persistence, validates inputs, rate-limits authentication and uses an append-only virtual-credit ledger. Browser sessions are stored only in `sessionStorage`, not persistent local storage. Analytics is disabled until explicit consent and transmits only a small event allowlist to an operator-configured first-party endpoint.

## Controls implemented

- Netlify response headers include CSP, `X-Content-Type-Options`, strict referrer policy, and a restrictive permissions policy.
- CSP does not allow inline scripts, eval, arbitrary frames, camera, microphone, geolocation, or payment APIs.
- React renders all catalog and search values as text; there is no `innerHTML`, `document.write`, eval, dynamic script creation, or untrusted navigation.
- Browser storage contains only the non-sensitive analytics consent choice.
- Production builds do not publish source maps.
- Repository ignores `.env`; no supplied donor credentials are present in source or configuration.
- Registration/login responses use short-lived opaque sessions; authorization values are never logged.
- CORS uses exact-origin allowlists and production deployment requires TLS.
- Daily rewards are protected by a database uniqueness constraint and ledger deletion/update triggers.
- Five third-party games retain their MIT license files and run in script-only sandboxed iframes.

## Residual findings

### SEC-001 — Low — Remote font stylesheet

Location: `src/styles.css:1`, `netlify.toml`

Evidence: fonts are loaded from Google Fonts and explicitly permitted by CSP.

Impact: a third-party font request discloses basic request metadata and adds supply-chain/availability dependency.

Fix: self-host licensed WOFF2 files and remove both Google domains from CSP before a privacy-sensitive production launch.

### SEC-002 — Informational — Analytics collector is operator supplied

Location: `src/analytics.js`, `.env.example`

Impact: an incorrectly configured collector could retain more metadata than intended at the network layer.

Mitigation: use a same-origin endpoint, short retention, IP truncation, documented event schema, and an accessible privacy notice. Never add password, payment, or free-text fields to analytics properties.

## Deployment checklist

1. Serve only over HTTPS and verify headers on the deployed response.
2. Set a same-origin `VITE_ANALYTICS_ENDPOINT`, or leave it unset.
3. Run dependency audit and rebuild from a locked dependency tree.
4. Add an age gate and jurisdiction-specific legal review before any gambling-related production use.
5. Do not embed the HTTP Fire Kirin endpoint in an HTTPS page.
6. Rotate any donor credentials that have been shared outside the authorized team.
