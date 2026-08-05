# Execution Plan — Video Poker (Jacks or Better)

**Started:** 2026-07-25 · Continues `qa-artifacts/08-competitive-gap-stake.md`.

Reuses the `poker.js` evaluator. Stateful: deal 5 → hold/discard → draw → pay per the Jacks-or-Better
9/6 paytable. Provably fair: single deck shuffled from the committed server seed (cards 0–4 dealt, 5–9 the
draw pile).

## Paytable (return per 1 unit bet: win = bet × payout)

Royal flush 250 · straight flush 50 · four of a kind 25 · full house 9 · flush 6 · straight 4 ·
three of a kind 3 · two pair 2 · pair of Jacks-or-better 1 · else 0.

## Phases

- [x] **VP-0** — `poker.js`: `videoPokerPayout()` + `shuffledDeck(tag)` param; `poker.test.js` extended (6).
- [x] **VP-1** — `migrations/016_videopoker.sql`, `/api/videopoker/start|draw`, `videopoker.test.js` (4):
  deal/debit, hold-all keeps hand + JoB paytable, discard-all draws pile, validation, RP. api **88/88**.
- [x] **VP-2** — client: `VP_START/VP_DRAW` protocol + host + lobby api + `games/videopoker` (hold-toggle
  UI + paytable) + catalog key 20 / `coreGames` 21 / `catalog.test.js` 210→211.
- [x] **VP-V** — full re-verification: all green.

## Result

Video Poker (Jacks or Better) is fully playable (game #211). Gates: api **88/88**, game-sdk **11/11**,
lobby 6/6 (catalog 211), all 19 game workspaces build+test, memory.js boots 17 migrations, root
lint/vitest/server + `verify:dist` PASS.

### Progress log

- 2026-07-25 — Plan written. Starting VP-0.
- 2026-07-25 — **VP-0 → VP-V complete.** `videoPokerPayout` + tagged deck (Hold'em stayed backward
  compatible), migration 016 + `/api/videopoker/start|draw`, tests; extended game-sdk protocol (`VP_*`,
  +1 validator test → 11/11), host + lobby api, built `games/videopoker`, catalog 211. Full re-verify green.
