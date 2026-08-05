# Execution Plan — Poker: hand evaluator + Casino Hold'em

**Started:** 2026-07-25 · Continues `qa-artifacts/08-competitive-gap-stake.md`.

Reusable poker hand evaluator (the correctness core), then Casino Hold'em (stateful: deal → call/fold →
showdown) following the Blackjack pattern (server engine + client).

## Rules / payouts

- Single deterministic 52-card deck shuffled from the committed server seed (Fisher-Yates).
- Deal: player 2 hole, dealer 2 hole, 5 community. Player sees hole + flop, then **call** (bet 2× ante) or
  **fold** (lose ante). Best 5-of-7 each; dealer qualifies with a pair of 4s or better.
- Ante paytable: royal 100:1, straight-flush 20:1, quads 10:1, full-house 3:1, flush 2:1, else 1:1.
  Dealer no-qualify → ante pays, call pushes. Dealer qualifies → compare; call pays 1:1 on a win.

## Phases

- [x] **PK-0** — `poker.js` (evaluate5 / best5of7 / compare / anteOdds / qualifies / shuffledDeck) +
  `poker.test.js` (5): every category, ordering, best-5-of-7, ante odds, qualification, deterministic deck.
- [x] **PK-1** — `migrations/015_holdem.sql`, `/api/holdem/start|action`, `holdem.test.js` (4): deal/debit,
  fold, call-resolve consistency (payouts recomputed from revealed cards across 12 hands), validation, RP.
  Full API suite **83/83**.
- [x] **PK-2** — client: `CH_START/CH_ACTION` protocol + host + lobby api + `games/holdem` (custom
  `HoldemBridge` + call/fold UI, hand names + dealer-qualify) + catalog key 19 / `coreGames` 20 /
  `catalog.test.js` 209→210.
- [x] **PK-V** — full re-verification: all green.

## Result

Casino Hold'em is fully playable (game #210). Gates: api **83/83** (stable across repeated runs),
game-sdk **10/10**, lobby 6/6 (catalog 210), all 18 game workspaces build+test, memory.js boots 16
migrations, root lint/vitest/server + `verify:dist` PASS.

### Progress log

- 2026-07-25 — PK-0 + PK-1 complete (evaluator + Casino Hold'em server, tested). Starting PK-2 (client).
- 2026-07-25 — **PK-2 + PK-V complete.** Extended game-sdk protocol (`CH_*`, +1 validator test → 10/10),
  host + lobby api client, built `games/holdem`, catalog 210. Full re-verification green. (One transient
  non-reproducible test flake observed once in a concurrent full-suite run; not seen again across 5 runs.)
