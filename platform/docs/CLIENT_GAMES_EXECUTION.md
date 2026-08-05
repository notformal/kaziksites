# Execution Plan — Client Game UIs for the New Originals

**Owner:** QA/build automation · **Started:** 2026-07-23 · **Status:** IN PROGRESS

This is a living plan+progress log. The server engines for Dice, Limbo, Wheel and Mines are already
implemented and regression-tested (`platform/apps/api`, see `qa-artifacts/08-competitive-gap-stake.md`).
This stage builds the **playable client UIs** so those engines are visible on the sites.

## Architecture (verified)

- Each server game is an iframe mini-app at `platform/games/<slug>/` with `index.html`, `game.js`,
  `style.css`, `sdk.js` (`CasinoBridge`), `build.mjs`, `package.json`, `test/static.test.js`.
- The lobby's `GameFrame.jsx` loads `/games/<slug>/index.html`; `GameHost` (game-sdk) bridges postMessage
  to the API: `BET_PLACED → api.bet({...,clientSeed})` and `ROUND_RESULT → api.settle()`.
- `validBet` in the SDK protocol **carries `choice`**, so choice-based single-round games work unchanged
  (roulette/keno prove this).
- Games are registered in `apps/lobby/src/catalog.js` (`{title,studio,category,icon,slug,serverGame,license}`)
  and served at `/games/<slug>/` by the staging step (`scripts/*`, PowerShell on Windows).

## Scope split

- **Single-round (fit the current SDK):** Dice, Limbo, Wheel → build as standard mini-apps. ✅ tractable.
- **Stateful (needs protocol extension):** Mines (reveal/cashout) → requires new SDK messages
  (`MINES_START/REVEAL/CASHOUT`) + host handlers + a stateful client. Separate phase.

## Verification per phase

1. `node build.mjs` in the game → produces `dist/`.
2. `node --test` (game static test).
3. `catalog.js` entry + `catalog.test.js` count bump → lobby `vitest run`.
4. Register game in `platform/package.json` workspaces + build/test scripts.
5. Full platform workspace `npm test` stays green.

Full in-browser E2E (iframe load + real postMessage bet) requires the staging pipeline
(build game dists → assemble → run API + lobby); it is out of scope for the unit gates here, exactly as the
existing server games are covered by static tests rather than browser E2E in the unit suite.

## Phases & progress

- [x] **P1 — Dice client** — over/under, live chance/multiplier preview, roll animation.
- [x] **P2 — Limbo client** — target-multiplier launch with rising-number animation.
- [x] **P3 — Wheel client** — canvas wheel, server-driven segments + spin-to-result.
- [x] **P4 — Mines client** — SDK protocol extended (`MINES_START/REVEAL/CASHOUT` +
  `MINES_STARTED/UPDATE/ENDED` + validators), host handlers, lobby api client, stateful 5×5 grid UI.
- [x] **P5 — Full re-verification** — all workspaces green, builds pass, catalog updated, gates green.

## Result

All four new engines are now playable client mini-apps registered in the catalog (204 games total):

| Game | Slug | Type | Client |
|---|---|---|---|
| Nova Dice | `dice` | single-round + choice | over/under, live chance/multiplier, roll animation |
| Limbo | `limbo` | single-round + choice | target multiplier, rising-number animation |
| Fortune Wheel | `wheel` | single-round, no choice | canvas wheel, server segments, spin-to-result |
| Mines | `mines` | **stateful** | 5×5 grid, reveal/cashout, live multiplier, mine reveal on end |

SDK protocol was extended once (backward-compatible) to support the stateful Mines flow; the three
single-round games reuse the existing `BET_PLACED → ROUND_RESULT` flow unchanged.

### Progress log

- 2026-07-23 — Investigated game integration (game-sdk, GameFrame, catalog, build/serve). Confirmed
  single-round games fit the SDK as-is; Mines needs a protocol extension. Plan written. Starting P1 (Dice).
- 2026-07-23 — **P1–P3 complete.** Built `games/dice`, `games/limbo`, `games/wheel` (index.html/style.css/
  game.js/sdk.js/build.mjs/test). Registered in `platform/package.json` (workspaces + build + test) and in
  `apps/lobby/src/catalog.js` (keys 10–12, `coreGames` length 13). Updated `catalog.test.js` 200→203.
  Verified: each game builds + static test passes; lobby vitest 6/6; full platform suite green.
- 2026-07-23 — **P4 complete (Mines).** Extended `packages/game-sdk`: added `MINES_START/REVEAL/CASHOUT`
  (game→host) + `MINES_STARTED/UPDATE/ENDED` (host→game) + `validMinesStart/Reveal/Cashout`; host.js now
  bridges them to `api.minesStart/minesReveal/minesCashout` (added to `apps/lobby/src/api.js`). Built
  `games/mines` with a custom `MinesBridge` (type-matched waits) and a stateful 5×5 grid client. Catalog key
  13, `coreGames` length 14, `catalog.test.js` 203→204. Added 3 protocol-validator tests to the game-sdk suite.
- 2026-07-23 — **P5 complete.** Full re-verification green: game-sdk **7/7**, lobby **6/6**, api **55/55**,
  slots-studio 8, crash/plinko/roulette/keno 1 each, dice/limbo/wheel/mines 1 each; root lint/vitest/server
  and `verify:dist` (3 brands) all PASS. Stage done.

### Out of scope (documented)

Full in-browser E2E (real iframe postMessage bet through the staging pipeline) is not part of these unit
gates — consistent with the existing server games, which ship with static + API tests rather than browser
E2E. The Mines host wiring is covered by the protocol validator tests + the server `mines.test.js`
(5 tests) + syntax/build checks; a browser walk-through remains the one manual step before release.
