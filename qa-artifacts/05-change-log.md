# Change Log — QA fixes (2026-07-17)

All changes are confined to the uncommitted WIP feature and its tooling. No committed business logic,
public API contract, data schema, or design system was altered. The wallet ledger's append-only invariant
was **respected** (the fix stopped code that violated it).

## Backend — `platform/apps/api/src/app.js`

- **Added `rpStatus(userId)` helper** — single source of truth for responsible-play status (cooling-off,
  self-exclusion, daily loss, daily wager). Used by both `/check` and the bet endpoint. (DEF-001, DEF-010)
- **Wired enforcement into `POST /api/wallet/bet`** — returns `403 responsible_play_block` before any debit
  when the player is restricted. (DEF-001)
- **Rewrote `POST /api/account/responsible-play`** — `INSERT ... ON CONFLICT DO NOTHING` then a single
  `UPDATE`; self-exclusion is **set/extend-only** (never cleared or shortened); cooling-off only set when a
  positive duration is supplied. Removed the broken insert branch. (DEF-002, DEF-003)
- **Simplified `GET /api/account/responsible-play/check`** to delegate to `rpStatus`. (DEF-001)
- **Fixed `POST /api/account/password/change`** — transactional; `DELETE FROM sessions WHERE token_hash<>current`
  keeps the caller signed in and revokes the rest (valid SQL). (DEF-004)
- **Fixed `POST /api/account/delete`** — anonymises the user in one `UPDATE` and deletes sessions /
  device_sessions / favorites; **no longer deletes the append-only `wallet_ledger`**. (DEF-005)
- **Populated `device_sessions`** on register + login via a `recordDevice()` helper; fixed
  `revoke-others` (match on `token_hash<>current`) and single-device revoke (read `token_hash` before delete);
  devices list flags the current session and truncates the UA in JS. (DEF-009)
- **Added email-uniqueness guards** to email request-verify/verify → `409 email_exists`. (DEF-011)

## Backend tooling — `platform/apps/api/src/memory.js`, `test/api.test.js`

- `memory.js`: load migrations 007 + 008 (indexes stripped for pg-mem) and register `gen_random_uuid`. (DEF-013)
- `test/api.test.js`: fixture now loads migration 008 + registers `gen_random_uuid` (schema parity). (DEF-014)
- **New** `test/accountLifecycle.test.js`: 8 regression tests covering every Critical/High fix. (DEF-014)

## Frontend — `platform/apps/lobby/`

- `AccountPanel.jsx`: removed a stray `}` that broke `vite build` (DEF-006); wired a **"Play responsibly"**
  button and the **`ResponsibleCheckBanner`** into the profile view (DEF-007).
- `AccountSettings.jsx`: Danger tab now collects and sends the account **password** to delete (DEF-008);
  split the shared Reset/Verify email input into two states (DEF-015).
- `main.jsx`: removed the dead `settings`/`respPlay` state, their never-triggered modal renders, and the
  now-unused imports — this reverted the file to its committed state (DEF-007, DEF-017).

## Root project

- `eslint.config.js`: rewritten as a runnable flat config (correctness-focused; stylistic rules deferred to
  Prettier); removed nonexistent/uninstalled rules and plugins; global `ignores`. (DEF-012)
- `package.json`: pinned `eslint ^9.15.0` (+ `@eslint/js`, `eslint-plugin-react`, `-react-hooks`,
  `-react-refresh`, `globals`) — ESLint 10 is incompatible with the React plugin. (DEF-012)
- `src/main.jsx`: removed one unused `History` import surfaced by the now-working lint gate. (DEF-012)
