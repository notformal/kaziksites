# Security audit — production candidate

Reviewed 2026-07-14 against the Express and React web-security baselines.

## Result

No known critical, high or medium application vulnerability remains in the reviewed source. `npm audit` reports zero known dependency vulnerabilities. Production still requires TLS termination, secret-managed PostgreSQL credentials and the post-deploy checks in `infra/README.md`.

## Controls verified

- Browser authentication uses an opaque 256-bit session in an `HttpOnly`, `SameSite=Lax` cookie; only SHA-256 token hashes are persisted. JavaScript stores only a non-secret UI hydration marker. Bearer authentication remains available for controlled API clients and canary automation.
- Passwords use Node `scrypt` with per-password random salts and timing-safe comparison.
- Every protected API route resolves the session server-side. Frontend state is not an authorization boundary.
- Credentialed CORS is restricted to exact configured origins. Unsafe requests carrying an unapproved `Origin` are rejected, and `SameSite=Lax` provides an additional CSRF boundary.
- Registration/login and global traffic have rate limits; JSON bodies are limited to 16 KB.
- CORS reflects only an exact configured origin allowlist and never enables credentialed wildcard requests.
- SQL uses positional parameters. Wallet mutations run inside PostgreSQL transactions with per-user advisory locks.
- The ledger is append-only through PostgreSQL triggers; bet, settlement and daily rewards have unique idempotency keys.
- The client submits bet intent only. The API uses the immutable versioned manifest profile to generate the 5×3 grid, paylines, bonus award and payout with HMAC-SHA256; settlement reveals the committed seed for verification.
- `postMessage` validates exact `origin`, exact iframe/window source, message type and bet schema. No wildcard target origins are used.
- Production separates lobby and game origins, so `allow-scripts allow-same-origin` does not grant a same-origin frame access to its parent.
- Edge Nginx sets CSP, nosniff, referrer and permissions policies; API uses Helmet and disables `X-Powered-By`.
- Custom JSON 404/error responses avoid Express default pages and stack disclosure.
- Containers run with no-new-privileges; static containers are read-only; PostgreSQL and API are not exposed on public ports.

## Accepted residual risks

1. The in-process rate limiter is per API replica. Before horizontal scaling, use a shared Redis-backed limiter.
2. Docker runtime could not be executed on this workstation because Docker Engine is absent. Compose YAML, builds, application tests and a two-origin browser simulation were verified; run `npm run infra:up` and `scripts/verify-production.ps1` on the deployment host before DNS cutover.
