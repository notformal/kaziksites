# Project Inventory & Audit Boundary

## Architecture (two parallel stacks)

1. **Root showcase app** — React 19 + Vite, multi-brand (Aurora / Ember / Royale), 3 separate builds.
   Backend: `server/` (Express 5 + better-sqlite3). Tests: vitest (root) + node:test (server).
2. **Platform monorepo** (`platform/`) — the advanced product:
   - `apps/lobby` — React/Vite lobby (multi-brand). Consumes the API at `/api` (`VITE_API_URL||'/api'`).
   - `apps/api` — Express 5 + PostgreSQL (`pg`); server-authoritative wallet, provably-fair rounds,
     analytics, social. Dev/E2E harness uses `pg-mem` (`src/memory.js`). Tests: node:test.
   - `games/` (slots-classic, slots-karma, slots-studio, crash, plinko, roulette, keno), `packages/game-sdk`
     (iframe/postMessage), `infra/` (Docker/nginx).
   - Classification: **virtual-credit social arcade — entertainment only** (no real money, deposits, KYC).

## API surface audited this pass (all under `/api`, `auth`-gated unless noted)

Account lifecycle: `email/request-verify`, `email/verify` (token), `password/request-reset` (anon),
`password/reset` (token), `password/change`, `devices` (GET), `devices/:id` (DELETE),
`devices/revoke-others`, `export/request`, `export/status`, `delete`.
Responsible play: `responsible-play` (GET/POST), `responsible-play/check`.
Enforcement touchpoint: `POST /api/wallet/bet`.

Data (migration `008_account_lifecycle.sql`): `email_verification`, `password_reset`, `device_sessions`,
`responsible_play`, `account_export_requests`. Wallet ledger (`001`) is **append-only** (triggers reject
UPDATE/DELETE) — a load-bearing invariant this audit had to respect.

## Roles

Anonymous (register/login, password-reset request/confirm, email-verify confirm) and authenticated player
(all other account + wallet operations). No admin surface in the audited feature. Ownership is enforced by
`WHERE user_id = $1` on every account query.

## What was in-scope vs out-of-scope

- **In scope (fixed + tested):** the uncommitted account-lifecycle + responsible-play feature (API + lobby UI)
  and the project quality gates (lint, dev/E2E harness).
- **Verified but not re-audited line-by-line:** committed platform API (24 passing tests + prior audit docs),
  root app + server (8 passing tests), 200-title catalog, game SDK.
- **Out of scope (tracked elsewhere):** penetration test, load/concurrency test, monitoring/alerting,
  operator legal review — all P0/P1 items in `platform/docs/PLATFORM_READINESS_REPORT.md`.

## How to run

- Platform API tests: `cd platform/apps/api && npm test`
- Lobby: `cd platform/apps/lobby && npm test && npm run build`
- Dev API (in-memory): `cd platform/apps/api && npm run start:memory`
- Root: `npm run lint && npm test && npm run build:aurora`
