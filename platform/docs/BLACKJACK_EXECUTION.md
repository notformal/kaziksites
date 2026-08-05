# Execution Plan — Blackjack (stateful)

**Started:** 2026-07-24 · **Status:** IN PROGRESS · Continues `qa-artifacts/08-competitive-gap-stake.md`.

Stateful provably-fair blackjack vs dealer (hit / stand / double). Same architecture as Mines / Hi-Lo:
pure engine + migration + endpoints + tests, then a client (SDK protocol extension + UI).

## Rules

- Cards from the committed server seed (`HMAC(...:bj:index)`). Deal order: P1, D1(up), P2, D2(hole).
- Values: A = 11/1 (soft), 10/J/Q/K = 10. Dealer stands on all 17 (S17).
- Payouts (`win = staked × mult/1000`, stake already debited): natural blackjack **3:2** (2500),
  regular win **1:1** (2000), push (1000), loss (0). Double = second bet, one card, then dealer plays.

## Phases

- [x] **BJ-1** — server: `blackjack.js`, `migrations/014_blackjack.sql`, `/api/blackjack/start|action`,
  `blackjack.test.js` (6): engine, deal/debit, stand-resolve consistency, hit-bust, double-stake, natural
  3:2, validation, RP. Full API suite **74/74** (stable across repeated runs).
- [x] **BJ-2** — client: `BJ_START/BJ_ACTION` protocol + host + lobby api + `games/blackjack` (custom
  `BlackjackBridge` + hit/stand/double UI) + catalog key 18 / `coreGames` 19 / `catalog.test.js` 208→209.
- [x] **BJ-V** — full re-verification: all green.

## Result

Blackjack is fully playable: stateful server engine (natural 3:2, S17 dealer, double) + client. Gates:
api **74/74**, game-sdk **9/9**, lobby 6/6 (catalog 209), all 17 game workspaces build+test, memory.js boots
15 migrations, root lint/vitest/server + `verify:dist` PASS.

### Progress log

- 2026-07-24 — Plan written. Starting BJ-1.
- 2026-07-24 — **BJ-1 complete.** `blackjack.js` + migration 014 + `/api/blackjack/start|action`
  (advisory-locked, RP-enforced, idempotent, natural 3:2). `blackjack.test.js` (6), stable across runs; two
  initial flaky assertions (double-after-bust, natural-BJ search) hardened. api 74/74.
- 2026-07-24 — **BJ-2 + BJ-V complete.** Extended game-sdk protocol (`BJ_*`, +1 validator test → 9/9), host
  + lobby api client, built `games/blackjack`, catalog 209. Full re-verification green.
