# Production release status

Status: **RELEASE CANDIDATE — Docker runtime canary required before DNS cutover**

## Proven

- PostgreSQL schema/migrations, auth, hashed opaque sessions and 5000-credit welcome balance.
- Transactional append-only wallet, advisory locks, idempotent daily/bet/settle and server-authoritative HMAC-SHA256 outcomes.
- Game SDK exact-origin/source validation and no client-supplied wins.
- Adapted MIT classic slot plus original Crash, Plinko, European Roulette and Keno.
- Registration, all 132 registered bet/settle flows, balances, versioned manifest math, provably-fair proof and history are covered by automated and Chromium QA.
- Split lobby/game origins verified at runtime: zero browser console errors or warnings on desktop and mobile.
- Workspace build and 14 tests pass; dependency audit reports zero vulnerabilities.
- Compose YAML statically parses and contains Nginx, lobby, separate games origin, API and PostgreSQL; backend services have no public port.
- Framework-specific security audit recorded in `SECURITY_AUDIT.md`.

## Required on the deployment host

This workstation has no Docker, Podman or compatible container runtime, so container startup/health cannot honestly be claimed here.

```powershell
Copy-Item .env.production.example .env
# Replace every placeholder and set real HTTPS PUBLIC_ORIGIN/GAMES_ORIGIN
npm run infra:config
npm run infra:up
./scripts/verify-production.ps1
```

Then point the lobby domain at the edge service and the isolated game domain at the games service, terminate TLS, re-run the browser flows and only then perform DNS cutover.
