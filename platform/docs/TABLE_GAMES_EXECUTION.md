# Execution Plan — Table games (Sic Bo, Baccarat, American Roulette)

**Started:** 2026-07-24 · **Status:** IN PROGRESS · Continues `qa-artifacts/08-competitive-gap-stake.md`.

Three single-round, choice-based games that fit the existing `BET_PLACED → ROUND_RESULT` SDK unchanged
(like roulette/keno). Authentic payouts (each game keeps its own natural house edge).

## Designs

- **Sic Bo** (`sicbo`) — 3 dice. Bets: `small`/`big` (1:1, lose on any triple), `single`{number} (1:1/2:1/3:1
  by matches), `anytriple` (30:1), `triple`{number} (180:1).
- **Baccarat** (`baccarat`) — standard third-card rules. Bets: `player` (1:1), `banker` (0.95:1), `tie`
  (8:1); a tie pushes player/banker bets.
- **American Roulette** (`roulette-us`) — 38 pockets (0, 00, 1–36). Same bet types as European roulette;
  straight 36×, even-money 2×; 0 and 00 lose even-money bets (authentic 5.26% edge).

## Phases & progress

- [x] **TG-1** — server: `baccarat.js`, outcome branches (`sicbo`/`baccarat`/`roulette-us`), `choiceOk`,
  registry, `tableGames.test.js` (6). Full API suite **68/68**.
- [x] **TG-2** — clients: `games/sicbo`, `games/baccarat`, `games/roulette-us` (mini-apps + build + static
  test); catalog keys 15–17, `coreGames` length 18, `catalog.test.js` 205→208.
- [x] **TG-V** — full re-verification: all green.

Blackjack (stateful hit/stand) and Poker remain larger follow-ups (documented in `08`).

## Result

Three authentic table games now playable end-to-end (registry 138, catalog 208): Sic Bo, Baccarat and
American Roulette — server engines with real house edges + choice-based client mini-apps, reusing the
existing single-round SDK unchanged.

Gates: api **68/68**, game-sdk 8/8, lobby 6/6, all 16 game workspaces build+test, memory.js boots all 14
migrations, root lint/vitest/server + `verify:dist` PASS.

### Progress log

- 2026-07-24 — Plan written. Starting TG-1 (server engines + tests).
- 2026-07-24 — **TG-1 complete.** `baccarat.js` resolver + outcome branches (`sicbo`/`baccarat`/
  `roulette-us`) + `choiceOk` + registry. `tableGames.test.js` (6): resolver, house edge for all three,
  bet→settle consistency, validation. api 68/68.
- 2026-07-24 — **TG-2 + TG-V complete.** Built the three client mini-apps, wired workspaces/build/test and
  catalog (208). Full re-verification green across the platform workspace, memory boot (14 migrations) and
  the root/site battery.
