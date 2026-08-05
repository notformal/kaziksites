# Execution: Game Assets + Live Win Feed (SSE)

**Date:** 2026-07-26
**Scope:** Two parallel tracks requested together ("делай и то и то"): (A) studio-grade
game **cover art** for the 11 new games, and (B) a real-time **live win feed** — the first
piece of the P2 "realtime infra" tier (SSE transport).

Constraints unchanged: virtual-credit / entertainment-only. No real-money, KYC, payments,
provider aggregation, or bots. `wallet_ledger` stays append-only (the feed only *reads* it).

---

## Part A — Cover art

The lobby renders `/covers-v2/game-<id>.jpg` for every catalog entry. Games 11–21 (dice,
limbo, wheel, mines, hilo, sicbo, baccarat, roulette-us, blackjack, holdem, videopoker) had
no cover → broken images.

**Shipped now (GPU-independent):**

1. **11 procedural covers** generated via the existing SVG→JPG Playwright pipeline
   (`scripts/generate-cover-art.mjs`, extended with game-11…game-21 categories + a
   `[slug…]`/`node … <ids>` selective-render mode). Output: `apps/lobby/public/covers-v2/game-11.jpg`
   … `game-21.jpg` (400×520 baseline JPEG, verified valid, copied into `dist/` on build).
2. **`onError` fallback** on the cover `<img>` in `apps/lobby/src/main.jsx` — any future
   missing/failed cover hides gracefully instead of showing a broken-image icon.

**Upgrade path (photorealistic, runs when the GPU is free):**

- `scripts/generate-covers.mjs` rewritten to drive a local **ComfyUI** (SDXL / JuggernautXL),
  poll `/history`, and convert the resulting PNG → the exact `covers-v2/game-<id>.jpg` the lobby
  serves (Playwright JPEG re-encode at q90). Includes the slug→id map + per-game art prompts.
  Usage: `node scripts/generate-covers.mjs` (all) or `… dice blackjack` (subset). Env overrides:
  `COMFY_URL`, `COMFY_OUTPUT`, `COMFY_CKPT`.
- This is a **drop-in replacement** — same filenames — so re-running it upgrades the covers with
  zero code/catalog changes. It was left un-run because the user's own long WAN22_S2V video job
  currently occupies the GPU (not cancelled).

## Part B — Live win feed (SSE)

Real-time ticker of recent wins as social proof. Derived entirely from the append-only ledger —
no new writable state.

**Server (`apps/api/src/app.js`):**

- `liveAlias(userId)` → `Player #XXXX` (SHA-256 of `live<id>`, first 4 hex, upper). **No PII** —
  no email, no display name ever leaves the server.
- `liveRow(r)` → `{ id, alias, gameId, win, at }` from a `win` ledger row + its `metadata.gameId`.
- `GET /api/live/recent` — last 20 positive `win` rows, newest first.
- `GET /api/live/feed` — **SSE** (`text/event-stream`): replays recent wins as `event: win`,
  emits `event: ready`, then polls every 2 s for `id > lastId` and pushes new wins; clears the
  interval on connection close.
- Both endpoints are **public** (privacy-aliased, read-only) so a logged-out visitor still sees
  the ticker. Tests: `test/livefeed.test.js` — 2/2 (aliasing/no-PII + event-stream shape).

**Client (`apps/lobby/src`):**

- `LiveFeed.jsx` — subscribes via `EventSource(/api/live/feed)`, dedupes by id, keeps the latest
  15, renders a seamless CSS marquee (`live-feed.css`; pauses on hover, respects
  `prefers-reduced-motion`). Renders nothing until the first win / if `EventSource` is
  unavailable — zero layout impact when empty.
- Mounted above the "THE COLLECTION" section in `main.jsx`.

---

## Verification (2026-07-26)

| Battery | Result |
|---|---|
| Platform API (`node --test apps/api/test/*.test.js`) | **92 pass / 0 fail** |
| game-sdk | 11 pass |
| lobby (catalog + components) | 6 pass |
| game mini-apps (static) | 16/16 suites pass |
| platform build (all games + lobby + landing) | ✓ clean |
| root lint (`eslint src --max-warnings=0`) | ✓ clean |
| root tests (vitest 3 + server 5) | 8 pass |
| root build (aurora/ember/royale) + `verify:dist` | ✓ all 3 brands verified |

## Follow-ups (infra-gated, unchanged)

- Realtime **chat** + **notifications** would extend the same SSE transport now proven here.
- Run `generate-covers.mjs` once the GPU frees to swap in photorealistic covers.
- i18n extraction, admin/PAM surface, OAuth — still credential/infra-dependent.
