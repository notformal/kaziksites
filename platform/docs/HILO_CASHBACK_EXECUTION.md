# Execution Plan — Hilo original + Cashback bonus

**Started:** 2026-07-23 · **Status:** IN PROGRESS

Continues the roadmap in `qa-artifacts/08-competitive-gap-stake.md`. Living plan+progress log.

## Scope

- **Hilo** — provably-fair higher/lower card original. Stateful (start → guess* → cashout), same shape as
  Mines: pure engine + migration + 3 endpoints + tests; then a client (SDK protocol extension + UI).
- **Cashback** — the remaining engagement bonus: return a % of net losses over a period, once per period,
  idempotent, virtual credits.

## Hilo math (1% edge)

- Ranks 1..13 (A..K), suit 0..3, each card an independent uniform draw from the server seed
  (`HMAC(serverSeed, clientSeed:nonce:hilo:index)`).
- `higher/same`: win if next.rank ≥ current.rank → P = (14 − rank)/13.
- `lower/same`:  win if next.rank ≤ current.rank → P = rank/13.
- Per-step multiplier = 0.99 / P (EV = P·(0.99/P) = 0.99). Cumulative multiplier compounds over correct
  guesses; cashout pays `bet × cumulative` (requires ≥1 correct guess).

## Phases & progress

- [x] **HILO-1** — server: `src/hilo.js`, `migrations/013_hilo.sql`, `/api/hilo/start|guess|cashout`, tests.
- [x] **HILO-2** — client: `HILO_START/GUESS/CASHOUT` protocol + host + lobby api + `games/hilo` + catalog (205).
- [x] **CB-1** — cashback endpoint (`/api/account/bonus/cashback`) + test (5% of net loss since last claim, window-reset).
- [x] **V** — full re-verification: all green.

## Result

- **Hilo** is a fully playable provably-fair original: server engine + 3 endpoints (advisory-locked,
  RP-enforced, idempotent, cumulative multiplier) + stateful card client, registered as game #205.
- **Cashback** completes the bonus set (daily-reward + level-up + faucet + cashback).
- Gates: game-sdk **8/8**, api **62/62**, lobby 6/6, all 13 game workspaces build+test, memory.js boots all
  13 migrations, root lint/vitest/server + `verify:dist` PASS, `npm audit` 0 (prod+dev).

### Progress log

- 2026-07-23 — **HILO-2 + CB-1 + V complete.** Extended game-sdk protocol (`HILO_*`, +3 validator tests →
  8/8), host + lobby api client; built `games/hilo` (custom `HiloBridge` + card UI); catalog key 14,
  `coreGames` length 15, `catalog.test.js` 204→205. Added `/api/account/bonus/cashback` (migration 009
  `cashback_through` default moved to epoch so the first claim covers prior losses) + test. Full
  re-verification green across every workspace and the root/site battery.

### Progress log

- 2026-07-23 — Plan written. Starting HILO-1 (server engine + endpoints + tests).
- 2026-07-23 — **HILO-1 complete.** `hilo.js` (cardAt/stepMultiplierMilli/isWin), migration 013, and the
  three endpoints (advisory-locked, RP-enforced, idempotent ledger, cumulative multiplier server-owned).
  `hilo.test.js` (6): engine + Monte-Carlo 1% edge + start/guess/cashout state machine + validation + RP.
  Full API suite **61/61**. Starting HILO-2 (client).
