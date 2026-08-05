# Execution Plan — Races / Tournaments

**Started:** 2026-07-25 · Continues `qa-artifacts/08-competitive-gap-stake.md`.

Time-boxed wager races with a virtual prize pool. Standings are DERIVED from the append-only ledger
(total wagered in the race window); prizes are distributed once, idempotently, to the top 3
(50% / 30% / 20% of the pool). Entertainment-only virtual credits.

## Settlement without a cron

Settlement is an explicit, idempotent operation (`POST /api/races/:id/settle`) guarded by an
`UPDATE races SET settled=true WHERE id=$1 AND settled=false` claim, so it can be triggered by a cron, an
operator, or lazily — calling it twice never double-pays. The race must be past `ends_at` to settle.

## Phases

- [x] **RC-1** — `migrations/017_races.sql`, standings helper, `GET /api/races`, `GET /api/races/:id`,
  `POST /api/races/:id/settle`, `races.test.js` (3): derived aliased standings + self marker, idempotent
  50/30/20% settlement, not-ended/404 guards.
- [x] **RC-V** — full re-verification: all green.

## Result

Wager races are functional: derived standings, privacy-aliased leaderboard, and idempotent prize
settlement (cron-free — the claim-guarded `settle` is safe to call repeatedly). Gates: api **91/91**
(stable across runs), memory.js boots 18 migrations, full platform + root battery green, `npm audit` 0.

Player-facing race UI lives in the lobby (out of scope for the API unit gates), like the leaderboard.

### Progress log

- 2026-07-25 — Plan written. Starting RC-1.
- 2026-07-25 — **RC-1 + RC-V complete.** Races table + standings/leaderboard + idempotent settlement,
  tested; full re-verification green (api 91/91, platform workspace, root battery, audit 0).
