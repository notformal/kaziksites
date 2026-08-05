# Game Engine

How the casino games are built, how their maths is verified, and what to run
when you change either.

> Supersedes the claims in `docs/COMPLETION-REPORT.md`,
> `docs/FINAL-COMPLETION-REPORT.md` and `docs/PROJECT-COMPLETION-REPORT.md`.
> Those documents described games that did not run: the shared engine imported a
> package (`pixi.dev`) that does not exist, PIXI was never installed, and the
> engine lived outside `public/` so it would have 404'd in production even once
> the import was fixed. Treat this file as the state of the code; verify against
> `npm test` and `npm run build`, not against a report.

---

## Layout

```
public/
  vendor/pixi.mjs                 vendored PIXI v8 ESM (npm run sync:vendor)
  games/
    _engine/
      config/engine.config.js     every tunable the engine reads
      core/math.js                slot evaluation + exact RTP analysis
      core/strips.js              reel strips, paytable calibration
      core/dice-math.js           three-dice evaluation + exact RTP
      core/rng.js                 provably-fair commit–reveal RNG
      core/i18n.js                ten interface languages
      core/audio.js               synthesised audio (no asset files)
      core/vfx.js                 tweening, particles, shake, flash
      art/palette.js              colour ramps and themes
      art/symbol-art.js           procedural vector symbol families
      ui/shell.js                 shared HTML/CSS chrome
      slot-engine.js              slot renderer and game loop
      dice-engine.js              Lightning Dice renderer and game loop
    <game-id>/
      index.html                  generated (npm run build:pages)
      math.json                   generated + verified (npm run build:math)
      cover.png                   generated (npm run build:covers)

src/game-math/
  specs.js                        slot design intent, one entry per title
  profiles.js                     shared paytable/volatility building blocks
  cover-specs.js                  cover art for non-engine casino titles
  math.test.js, dice.test.js      the maths test suite
```

The engine lives under `public/` deliberately. Vite copies `public/` verbatim
and does not rewrite imports inside it, so the engine is plain ESM with relative
paths and no bare specifiers — which is why PIXI is vendored to
`public/vendor/` rather than imported from `node_modules`.

---

## Where the numbers come from

**Reel frequencies decide how a game feels. The paytable decides what it
returns.** Getting that backwards is the single easiest way to break a slot.

- **Exact, not estimated.** Every reel stops independently and uniformly, so a
  payline's symbol distribution *is* its strip composition. `computeRtp()`
  enumerates it exactly. Scatter counts are dependent within a reel and
  independent across reels, so they are enumerated per reel and convolved.
  Simulation is used only for the things exact analysis cannot cheaply give —
  hit frequency across overlapping paylines, variance, observed max win.

- **Calibration is a division, not a search.** Expected return is exactly linear
  in a uniform paytable scale, so the correct scalar is `target / current`.
  Rounding to whole coins reintroduces a small error; because the relationship
  is linear, another division removes it, and the passes converge geometrically.

- **Reel composition is not the corrective lever.** It looks like the obvious
  knob and it is a trap: the RTP surface over symbol frequencies is *not*
  monotone. Making premiums rarer makes the low symbols commoner, and their own
  five-of-a-kind pays enough to push return back up. Measured directly, scaling
  the low tier on one game gave 2.74 → 1.02 → 0.93 → 0.92 → 1.09 → 1.21 as the
  weight rose. A bisection over that converges on the wrong root. The final
  polish — recovering the RTP that two-significant-figure rounding costs — is a
  *greedy search over measured RTP* (`tuneFrequencies`), which does not care
  whether the surface is monotone.

- **Nothing adjusts at runtime.** The browser loads a frozen, verified
  `math.json`. There is no code path that reads a player's balance or session
  history and changes their odds. The house edge is in the strips and the
  paytable, where a regulator would expect to find it.

### Build gates

`npm run build:math` fails the build — and writes no artefact — unless every
game passes:

1. exact RTP within 0.5pp of its declared target, inside the 90–97.5% house band
2. simulated RTP agreeing with the exact figure inside Monte-Carlo error
3. hit frequency inside the band its volatility profile promises, scaled to the
   game's payline count

`npm run build:dice` additionally requires that no single bet returns above the
house ceiling and that the spread across the sixteen totals stays under 5pp.

### Current figures

| Game | Lines | RTP (exact) | Hit % | Bonus % | Volatility | Max win seen |
|---|---|---|---|---|---|---|
| cosmic-queen | 15 | 96.18 | 24.6 | 0.38 | 4.58 | 413× |
| dragons-fortune | 20 | 96.13 | 24.9 | 0.82 | 5.29 | 605× |
| pharaohs-treasure | 20 | 96.00 | 26.2 | 0.86 | 4.50 | 501× |
| slots-royal | 20 | 96.00 | 23.2 | 0.82 | 3.73 | 136× |
| book-of-gold | 10 | 96.39 | 24.1 | 0.43 | 5.29 | 300× |
| gold-caravan | 10 | 95.99 | 18.5 | 0.86 | 4.66 | 215× |
| magic-crystal | 10 | 96.14 | 17.5 | 0.87 | 4.28 | 206× |
| hot-navigator | 20 | 95.99 | 26.0 | 0.99 | 3.75 | 168× |
| diamond-rush | 20 | 95.98 | 26.5 | 0.82 | 4.48 | 492× |
| wild-west-gold | 20 | 96.20 | 27.0 | 0.86 | 5.53 | 655× |
| lucky-streak | 15 | 96.02 | 21.2 | 0.86 | 4.59 | 448× |
| super-line-fruit-bomb | 20 | 96.04 | 23.7 | 0.79 | 5.06 | 622× |
| lightning-dice | 16 bets | 96.19 avg (95.76–96.68) | — | — | high | 2000× cap |

Every game keeps a ~4% house edge while returning something on roughly one
spin in four and running a bonus round every 100–260 spins. That combination is
the point: the house wins over the long run *because of the maths*, and the
player keeps getting results often enough for a session to stay alive.

---

## Art

All symbol art is procedural vector geometry drawn at runtime — no emoji, no
sprite sheets, no licensed artwork. A symbol is a *family* (`gem`, `crown`,
`orb`, `sigil`, `vessel`, `beast`, `instrument`, `flora`, `coin`, `tome`,
`ordnance`, `bolt`, `rank`) plus parameters plus a hue. Two games can share a
family and look nothing alike, because facet counts, proportions, ornament and
palette all vary.

Lobby covers are rendered by the *same* code, executed in a headless browser by
`npm run build:covers` — not reimplemented in SVG, because a second drawing
implementation would drift from the first. All nineteen casino titles have one;
the imported arcade games keep their glyph tile, since dressing a third-party
retro game in our art would misrepresent it.

---

## Commands

```bash
npm run sync:vendor     # node_modules → public/vendor
npm run build:math      # slot models, verified; writes math.json
npm run build:dice      # Lightning Dice model, verified
npm run build:pages     # generate each game's index.html
npm run build:covers    # render lobby cover art (self-serving, no dev server needed)
npm run build:games     # all four of the above
npm run build           # sync + build:games + all three brand sites
npm test                # 165 unit tests, incl. assertions on the shipped artefacts
```

The tests assert on the *built artefacts*, not just the source: every
`math.json` is recomputed from its shipped strips and checked against its own
certification, so a regression in the build cannot reach production unnoticed.

---

## Adding a slot

1. Add an entry to `src/game-math/specs.js` — palette, symbol cast, volatility,
   payline count, RTP target. Nothing about strips or pay values.
2. `npm run build:games`. The build derives, calibrates, verifies and writes
   `math.json`, `index.html` and `cover.png`.
3. Add the game to `src/catalog.js` (and to `COVERED` if it has cover art).
4. `npm test`.

If the build refuses the game, it will say which gate failed and by how much.
