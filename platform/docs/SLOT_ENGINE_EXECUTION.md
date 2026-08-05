# Execution: Reusable Slot Mechanics Engine + Symbol Asset Base

**Date:** 2026-07-27
**Scope:** Build our own **"base"** for slots — a data-driven, provably-fair slot mechanics engine
covering the mechanics real casino slots use (fixed lines, ways-to-win, cascades, wilds, scatters,
free spins, symbol multipliers), a library of RTP-tuned example profiles, Monte-Carlo verification,
and a reusable **symbol asset pipeline** that produces themed, transparent icons keyed to the
engine's symbol ids. Constraints unchanged (entertainment-only, virtual credits; the engine returns
multipliers, never money).

---

## 1. Engine — `apps/api/src/slotEngine.js`

Pure and deterministic given an `rng: () => float in [0,1)`, so it is provably-fair compatible,
transport-agnostic, and Monte-Carlo testable. No I/O, no `Date`/`Math.random`.

- **`makeHmacRng(serverSeed, clientSeed, nonce)`** — a float stream from an HMAC-SHA256 counter
  chain; a spin is fully reproducible/verifiable from its seeds.
- **`spinGrid(def, rng)`** — builds the visible grid from **reel strips** (symbol frequency and
  adjacency come from the strips, as in real machines).
- **`evaluateGrid(def, grid)`** — two modes:
  - `lines`: consecutive matches from the leftmost reel along each payline, **wild-substituted**;
  - `ways`: 243/1024-style — product of per-column matches over consecutive columns.
  Applies an optional **wild win multiplier**; returns per-hit winning cells (for animation +
  cascades).
- **`spin(def, rng)`** — orchestrates a base spin, **cascading/tumbling reels** (winning symbols
  removed, survivors drop, refill from strips, per-step **multiplier ladder**), scatter pays, and
  **scatter-triggered free spins** (with a spin multiplier and optional retrigger). Returns the grid
  sequence + total return in bet-multiple units.
- **`computeRTP(def, iterations, rng)`** — average return per unit bet; used to tune and to guard
  against math drift.

**RTP tuning knob:** each profile carries a single `payoutScale`. You design the paytable *shape*,
measure RTP, and set `payoutScale = target / measured` — exactly how slot math is tuned in practice.

## 2. Library — `apps/api/src/slotLibrary.js`

Three worked-out archetypes to clone from, each tuned to target and verified:

| Profile | Grid | Mechanic | Volatility | Measured RTP (2M spins) |
|---|---|---|---|---|
| `classic-lines` (Royal Lines) | 5×3, 10 lines | wild ×2, scatter, free spins | low | **95.00%** |
| `ways-243` (Gem Ways 243) | 5×3, 243 ways | wild, scatter, free spins ×3 | medium | **95.50%** |
| `cascade-ways` (Tumble Peaks) | 5×5 ways | cascades, ladder ×[1,2,3,5,8] | high | **95.43%** |

## 3. Tests — `apps/api/test/slotEngine.test.js` (7)

Evaluation correctness (3-of-a-kind, wild substitution + multiplier, a miss; ways multiplication;
flat scatter pays); provably-fair determinism (same seed ⇒ identical spin, `[0,1)` range, nonce
sensitivity); cascades tumble and every win is finite & non-negative; and **every library profile
pays its target RTP within ±3%** over Monte-Carlo (~1M+ spins, runs in ~1.4 s). This is the
"отработка" — the math is guarded so a regression shows up as an RTP shift.

## 4. Symbol asset base — `assets/slot-symbols/`

Reusable themed symbol sets, **symbol ids matching the engine's reel ids**, so a theme drops into a
slot definition. Shipped: **`royal-gems`** — 9 symbols (faceted gems for the card ranks, a jewelled
crown, a WILD starburst, a scatter star), **512×512 transparent PNG**, plus `manifest.json` + README.

Two interchangeable generators write the same layout:
- **`scripts/generate-slot-symbols-svg.mjs`** — procedural SVG → PNG via Playwright. GPU-independent,
  crisp, transparent (`royal-gems`, 512²).
- **`scripts/generate-slot-symbols.mjs`** — **ComfyUI / FLUX.1-dev photoreal** (`royal-gems-flux`,
  1024²). SDXL decodes all-black on this GPU (UNet fp16 NaN), so the pipeline uses **FLUX** with the
  canonical `FluxGuidance` + KSampler `cfg=1` setup (fp8 weights to fit VRAM) — sharp, casino-grade
  symbols, and FLUX renders clean symbol text (WILD/scatter) that SDXL couldn't. A full themed set
  (9 symbols) was generated and shipped.

## Verification (2026-07-27)

| Battery | Result |
|---|---|
| Platform API | **139 pass / 0 fail** (+7 slot engine) |
| symbol asset base | 9 transparent PNGs generated + validated |
| game-sdk / lobby / platform build | 11 / 13 / ✓ clean |
| root lint / vitest+server / build+`verify:dist` | ✓ / 8 pass / 3 brands verified |

## Bonus: test-suite flake hardening

While verifying, a pre-existing cluster of statistical Monte-Carlo tests was found to flake
(~1–5% each) and was fixed at the root — **0 failures across 40 full-suite runs** afterwards:

- **dice / limbo / hilo / table-games house-edge** — used a *random* seed with a tight `≤ 1.0`
  upper bound only ~2 SE above the 0.99 mean. Switched to a **fixed seed** (deterministic sample) +
  a symmetric band around the true mean.
- **blackjack "start deals"** — asserted a flat post-bet balance, which broke whenever the deal was
  a natural (immediate payout). Replaced with the always-true invariant `balance == 4900 + win`.
- **natural blackjack pays 3:2** — the real cause was the **60/min rate limit** on `blackjack/start`
  (real-clock, IP-keyed): a fast test got only ~60 hands ⇒ ~5% natural-miss. Made the limit
  configurable (`config.bjStartLimit`, default 60 unchanged) and lifted it in the test fixture, so
  the hunt gets its full 300 independent hands (miss ≈ 5e-7).

## How this is the "base" going forward

A new slot = pick the nearest archetype in `slotLibrary`, adjust reel strips + paytable shape,
retune `payoutScale` against `computeRTP`, and point it at a symbol theme in the asset base. The
engine, RNG, RTP harness and asset pipeline are shared — each new title is math + art, not new
plumbing.

## Live integration — the engine is now playable (2026-07-27)

The engine is wired into the **existing** server play-path — no new endpoint, no duplicated
ledger/responsible-play/idempotency logic:

- **`gameRegistry.js`** — `SLOT_LIBRARY` is registered as three server games (`classic-lines`,
  `ways-243`, `cascade-ways`) with `kind: "slot-engine"`, `mathProfileId = def.id`, `mathVersion: 1`,
  and the whole slot definition as `math`. `publicGameRegistry()` still strips `math`, so reel
  strips / paytables never reach the client.
- **`provablyFair.outcome()`** — a `kind === "slot-engine"` branch builds
  `makeHmacRng(serverSeed, clientSeed, nonce)`, runs `spin(math, rng)`, and returns
  `multiplierMilli = round((win / betUnits) × 1000)` with the grids/free-spins as `value`. Because
  it keys off the same `(serverSeed, clientSeed, nonce)`, a revealed round is fully reproducible.
- Result: slots play through the ordinary `POST /wallet/bet` → `POST /wallet/settle` flow. The
  generic `win = floor(bet × multiplier)` + append-only ledger, responsible-play gate, idempotency
  and commit/reveal all apply unchanged. Any bet size works (betUnits normalises RTP).
- **Tests — `test/slotPlay.test.js` (4):** an engine slot debits on bet and credits the exact win on
  settle; a settled round reveals its seed and is reproducible from the chain; all three profiles
  (lines / ways / cascade) are playable; and the registry exposes them without leaking `math`. Full
  platform API suite: **143 pass / 0 fail**.

**Remaining next step — the client:** a `slot-premium` mini-app (rendered via the lobby's
`engineSlug` mechanism, so one mini-app serves all three `gameId`s) that draws the grid with the
`royal-gems-flux` FLUX symbols, animates the spin, and shows wins / free spins. The server side is
done and tested; this is pure front-end.
