# Test Results — Kaziksites QA (AUDIT_AND_FIX)

**Environment:** Windows 11, Node v24.14.0, npm 11.9.0. DB for platform API tests: `pg-mem` (in-memory Postgres) with production migrations 001–005, 007, 008 applied.

---

## 1. Gate battery (after fixes)

| Gate | Command | Result |
|---|---|---|
| Root lint | `npm run lint` | **PASS (exit 0)** — was crashing before |
| Root unit | `npx vitest run` | **3/3 pass** |
| Root build (aurora) | `npm run build:aurora` | **PASS** — 1782 modules |
| Server unit | `npm test --prefix server` | **5/5 pass** |
| Platform API | `npm test` in `platform/apps/api` | **32/32 pass** (24 existing + 8 new) |
| Platform lobby unit | `npm test` in `platform/apps/lobby` | **6/6 pass** |
| Platform lobby build | `npm run build` in `platform/apps/lobby` | **PASS** — was FAILING (syntax error) |
| Dependency audit | `npm audit --omit=dev` × 4 workspaces | **0 vulnerabilities** |
| Dev/E2E harness | `node src/memory.js` | **Boots**, serves `/health` + `/api/account/*` |

## 2. New regression tests (`platform/apps/api/test/accountLifecycle.test.js`)

```
✔ responsible-play POST works on first call with no existing row (upsert)
✔ self-exclusion cannot be cleared or shortened by an unrelated save
✔ bet is rejected during self-exclusion (server-side enforcement)
✔ daily wager limit blocks further bets once reached
✔ password change succeeds, keeps current session, invalidates others
✔ account delete anonymises the user and preserves the append-only ledger
✔ devices are recorded per session and revoke-others keeps only the current one
✔ email change is rejected when the address is already taken
tests 8 | pass 8 | fail 0
```

## 3. Full platform API suite

```
tests 32 | pass 32 | fail 0
```
(24 pre-existing tests — auth, wallet bet/settle/history, provably-fair, idempotency, bonus spins,
analytics, social, slot math, round-state — all still pass; fixture extended to load migration 008.)

## 4. Runtime evidence captured (before fix)

Harness `evidence/repro.mjs` booted `createApp()` against pg-mem with the account tables and exercised the
broken endpoints. Confirmed at runtime:

- Self-exclusion set to a future date, then **wiped to `null`** by an unrelated save (HTTP 200 both times).
- First-time responsible-play save → **500** `ReferenceError: sets is not defined` at `app.js:1004`.
- Password change → **500**, yet login with the **old** password → 401 and with the **new** password → 200
  (the password changed despite the error response).
- `GET /api/account/devices` → always `{ devices: [] }`.

After the fixes, these behaviours are asserted correct by the regression tests above.

## 5. Not executed (documented gaps)

- **UI click-through E2E** of the new flows in a real browser was **not run**: the lobby has no `/api` dev
  proxy and the session cookie is `SameSite=Lax`, so faithful auth requires a same-origin deployment
  (nginx/Docker/Postgres) not stood up in this environment. Frontend verified via clean `vite build` +
  static review. Repro steps to complete this check are in `06-release-readiness.md`.
- **Load / concurrency** and **penetration testing** — out of scope for this pass; already tracked as P0
  launch items in `platform/docs/PLATFORM_READINESS_REPORT.md`.
- The root `server/` (SQLite) stack and the 200-title catalog were not re-audited beyond their passing
  test suites and prior audit docs; this pass targeted the uncommitted WIP feature.
