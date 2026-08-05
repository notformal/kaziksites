import { describe, expect, it } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

import {
  SYMBOL_KIND,

  evaluateLine,
  evaluateGrid,
  exactLineReturn,
  exactScatterDistribution,
  computeRtp,
  simulate,
} from '../../public/games/_engine/core/math.js';
import {
  expandStrip,
  buildStrips,
  paylines5x3,
  niceRound,
  significantRound,
  calibratePaytable,
} from '../../public/games/_engine/core/strips.js';
import { MATH } from '../../public/games/_engine/config/engine.config.js';
import { SPECS } from './specs.js';
import { VOLATILITY_PROFILES, hitBandForPaylines, rankedPays, TIER_PAYS } from './profiles.js';

// ═══════════════════════════════════════════════════════════
// Fixture: a deliberately small model so expectations stay hand-checkable.
// ═══════════════════════════════════════════════════════════

const fixture = () => ({
  rows: 3,
  paylines: paylines5x3(5),
  symbols: [
    { id: 'hi', kind: SYMBOL_KIND.NORMAL, pays: { 3: 10, 4: 40, 5: 100 } },
    { id: 'lo', kind: SYMBOL_KIND.NORMAL, pays: { 3: 2, 4: 6, 5: 20 } },
    { id: 'w', kind: SYMBOL_KIND.WILD, pays: { 3: 20, 4: 80, 5: 200 } },
    { id: 's', kind: SYMBOL_KIND.SCATTER },
  ],
  wild: { id: 'w' },
  scatter: { id: 's', pays: { 3: 2, 4: 10 }, freeSpins: { 3: 10, 4: 15 }, retrigger: false },
  strips: buildStrips(
    Array.from({ length: 5 }, () => ({ hi: 2, lo: 6, w: 1, s: 1 })),
    40,
    { spaceOut: ['w', 's'], minGap: 3 },
  ),
  freeSpinMultiplier: 2,
  maxWinMultiplier: 5000,
});

// ═══════════════════════════════════════════════════════════

describe('line evaluation', () => {
  const model = fixture();

  it('pays a left-aligned run of three', () => {
    expect(evaluateLine(['hi', 'hi', 'hi', 'lo', 'lo'], model)).toMatchObject({
      pay: 10,
      symbol: 'hi',
      count: 3,
    });
  });

  it('does not pay a run that starts away from reel one', () => {
    expect(evaluateLine(['lo', 'hi', 'hi', 'hi', 'lo'], model).symbol).not.toBe('hi');
  });

  it('substitutes wilds into a run', () => {
    expect(evaluateLine(['hi', 'w', 'hi', 'lo', 'lo'], model)).toMatchObject({
      pay: 10,
      symbol: 'hi',
      count: 3,
    });
  });

  it('pays a full line of wilds as the wild', () => {
    const result = evaluateLine(['w', 'w', 'w', 'w', 'w'], model);
    expect(result.symbol).toBe('w');
    expect(result.pay).toBe(200);
  });

  it('pays leading wilds as whichever symbol scores highest', () => {
    // w,w,w,hi,lo: three wilds alone pay 20, but reading them as `hi` makes a
    // run of four worth 40 — the player is always paid the better reading.
    const result = evaluateLine(['w', 'w', 'w', 'hi', 'lo'], model);
    expect(result.symbol).toBe('hi');
    expect(result.pay).toBe(40);
  });

  it('never counts the scatter into a line run', () => {
    expect(evaluateLine(['s', 's', 's', 's', 's'], model).pay).toBe(0);
  });

  it('pays nothing for a run of two', () => {
    expect(evaluateLine(['hi', 'hi', 'lo', 'lo', 'lo'], model).pay).toBe(0);
  });
});

describe('grid evaluation', () => {
  const model = fixture();

  it('scales line pays by the line bet, not the total bet', () => {
    const grid = [
      ['lo', 'hi', 'lo'],
      ['lo', 'hi', 'lo'],
      ['lo', 'hi', 'lo'],
      ['lo', 'lo', 'lo'],
      ['lo', 'lo', 'lo'],
    ];
    const totalBet = 10;
    const result = evaluateGrid(model, grid, totalBet);
    const lineBet = totalBet / model.paylines.length;
    // Payline 0 runs along the middle row: hi, hi, hi, lo, lo.
    expect(result.lineWins.some((w) => w.symbol === 'hi' && w.count === 3)).toBe(true);
    expect(result.lineWins.find((w) => w.symbol === 'hi').amount).toBeCloseTo(10 * lineBet, 10);
  });

  it('applies the free-spin multiplier to everything the round pays', () => {
    const grid = [
      ['lo', 'hi', 'lo'], ['lo', 'hi', 'lo'], ['lo', 'hi', 'lo'],
      ['lo', 'lo', 'lo'], ['lo', 'lo', 'lo'],
    ];
    const single = evaluateGrid(model, grid, 10, 1).totalWin;
    const doubled = evaluateGrid(model, grid, 10, 2).totalWin;
    expect(doubled).toBeCloseTo(single * 2, 10);
  });

  it('pays scatters from anywhere and awards free spins', () => {
    const grid = [
      ['s', 'lo', 'lo'], ['lo', 's', 'lo'], ['lo', 'lo', 's'],
      ['lo', 'lo', 'lo'], ['lo', 'lo', 'lo'],
    ];
    const result = evaluateGrid(model, grid, 10);
    expect(result.scatterCount).toBe(3);
    expect(result.scatterWin).toBeCloseTo(2 * 10, 10);
    expect(result.freeSpinsAwarded).toBe(10);
  });

  it('caps a round at the configured maximum win', () => {
    const capped = { ...model, maxWinMultiplier: 1 };
    const grid = [
      ['w', 'w', 'w'], ['w', 'w', 'w'], ['w', 'w', 'w'],
      ['w', 'w', 'w'], ['w', 'w', 'w'],
    ];
    const result = evaluateGrid(capped, grid, 10);
    expect(result.totalWin).toBe(10);
    expect(result.cappedAt).toBe(10);
  });
});

describe('reel strips', () => {
  it('produces exactly the requested length', () => {
    expect(expandStrip({ a: 3, b: 5, c: 2 }, 64)).toHaveLength(64);
  });

  it('honours the requested composition', () => {
    const strip = expandStrip({ a: 1, b: 3 }, 100);
    const b = strip.filter((s) => s === 'b').length;
    expect(b).toBe(75);
  });

  it('gives every reel a different arrangement from identical weights', () => {
    const strips = buildStrips(Array.from({ length: 5 }, () => ({ a: 3, b: 5, c: 2 })), 60);
    const distinct = new Set(strips.map((s) => s.join(',')));
    expect(distinct.size).toBe(5);
  });

  it('keeps spaced symbols out of a single visible window', () => {
    const strip = expandStrip({ a: 20, s: 3 }, 90, { spaceOut: ['s'], minGap: 3 });
    const positions = strip.map((sym, i) => (sym === 's' ? i : -1)).filter((i) => i >= 0);
    for (let i = 1; i < positions.length; i++) {
      expect(positions[i] - positions[i - 1]).toBeGreaterThanOrEqual(3);
    }
  });

  it('refuses a composition that cannot satisfy the spacing constraint', () => {
    expect(() => expandStrip({ a: 1, s: 1 }, 20, { spaceOut: ['s'], minGap: 5 })).toThrow(/spacing/);
  });
});

describe('exact return analysis', () => {
  const model = fixture();

  it('agrees with simulation within Monte-Carlo error', () => {
    const exact = computeRtp(model);
    const sim = simulate(model, 200000, mulberry(7));
    const stderr = sim.volatilityIndex / Math.sqrt(sim.rounds);
    expect(Math.abs(sim.rtp - exact.rtp)).toBeLessThan(4 * stderr + 0.004);
  });

  it('decomposes return into lines, scatters and free spins', () => {
    const r = computeRtp(model);
    expect(r.lines).toBeGreaterThan(0);
    expect(r.rtp).toBeCloseTo(r.base + r.freeSpins, 10);
    expect(r.base).toBeCloseTo(r.lines + r.scatters, 10);
  });

  it('scatter distribution is a probability distribution', () => {
    const dist = exactScatterDistribution(model);
    expect(dist.reduce((a, b) => a + b, 0)).toBeCloseTo(1, 10);
    expect(dist.every((p) => p >= 0)).toBe(true);
  });

  it('return scales linearly with a uniform paytable scale', () => {
    const doubled = {
      ...model,
      symbols: model.symbols.map((s) =>
        s.pays
          ? { ...s, pays: Object.fromEntries(Object.entries(s.pays).map(([k, v]) => [k, v * 2])) }
          : s,
      ),
    };
    expect(exactLineReturn(doubled)).toBeCloseTo(exactLineReturn(model) * 2, 10);
  });

  it('rejects a free-spin configuration whose retriggers diverge', () => {
    const runaway = {
      ...model,
      scatter: { ...model.scatter, freeSpins: { 3: 5000, 4: 9000 }, retrigger: true },
    };
    expect(() => computeRtp(runaway)).toThrow(/diverge/);
  });
});

describe('paytable rounding', () => {
  it('keeps whole coins above ten and one decimal below', () => {
    expect(niceRound(1624.4)).toBe(1624);
    expect(niceRound(4.23)).toBe(4.2);
  });

  it('rounds to publishable significant figures', () => {
    expect(significantRound(1624, 2)).toBe(1600);
    expect(significantRound(103, 2)).toBe(100);
    expect(significantRound(53, 2)).toBe(53);
  });

  it('prices a design paytable exactly onto its target when unrounded', () => {
    const { achieved } = calibratePaytable(fixture(), 0.94, { round: false });
    expect(achieved).toBeCloseTo(0.94, 4);
  });

  it('stays inside the house tolerance once rounded to whole coins', () => {
    const { achieved } = calibratePaytable(fixture(), 0.94);
    expect(Math.abs(achieved - 0.94)).toBeLessThanOrEqual(MATH.rtpTolerance);
  });
});

describe('design profiles', () => {
  it('steps pays down within a tier so no two symbols are identical', () => {
    const first = rankedPays('premium', 0);
    const second = rankedPays('premium', 1);
    expect(first[5]).toBe(TIER_PAYS.premium[5]);
    expect(second[5]).toBeLessThan(first[5]);
  });

  it('scales the hit-frequency band with payline count', () => {
    const profile = VOLATILITY_PROFILES.high;
    const ten = hitBandForPaylines(profile, 10);
    const twenty = hitBandForPaylines(profile, 20);
    expect(twenty.min).toBeGreaterThan(ten.min);
    expect(ten.min).toBeGreaterThan(0);
    expect(twenty.max).toBeLessThan(1);
  });
});

// ═══════════════════════════════════════════════════════════
// The shipped artefacts. These assert on what players actually get, so a
// regression in the build cannot reach production unnoticed.
// ═══════════════════════════════════════════════════════════

describe('built game artefacts', () => {
  const built = SPECS.map((spec) => {
    const path = resolve(process.cwd(), 'public/games', spec.id, 'math.json');
    return { spec, path, exists: existsSync(path) };
  });

  it('every spec has a built math artefact', () => {
    const missing = built.filter((b) => !b.exists).map((b) => b.spec.id);
    expect(missing, 'run `npm run build:math`').toEqual([]);
  });

  for (const { spec, path, exists } of built) {
    if (!exists) continue;
    const manifest = JSON.parse(readFileSync(path, 'utf8'));

    describe(spec.id, () => {
      it('returns its declared RTP when recomputed from the shipped strips', () => {
        const recomputed = computeRtp(manifest.math).rtp;
        expect(recomputed).toBeCloseTo(manifest.certification.exactRtp, 5);
        expect(Math.abs(recomputed - spec.targetRtp)).toBeLessThanOrEqual(MATH.rtpTolerance);
      });

      it('keeps the house edge inside the published band', () => {
        expect(manifest.certification.exactRtp).toBeGreaterThanOrEqual(MATH.minRtp);
        expect(manifest.certification.exactRtp).toBeLessThanOrEqual(MATH.maxRtp);
      });

      it('pays often enough for the session to stay alive', () => {
        const { min, max } = hitBandForPaylines(VOLATILITY_PROFILES[spec.volatility], spec.paylines);
        const hit = manifest.certification.simulation.hitFrequency;
        expect(hit).toBeGreaterThanOrEqual(Math.min(min, MATH.hitFrequency.min));
        expect(hit).toBeLessThanOrEqual(Math.max(max, MATH.hitFrequency.min));
        expect(hit).toBeGreaterThanOrEqual(MATH.hitFrequency.min);
      });

      it('triggers its bonus often enough to be a real feature', () => {
        expect(manifest.certification.simulation.bonusFrequency).toBeGreaterThan(0.002);
      });

      it('ships one strip per reel, all distinct', () => {
        expect(manifest.math.strips).toHaveLength(5);
        expect(new Set(manifest.math.strips.map((s) => s.join(','))).size).toBe(5);
      });

      it('ships art for every symbol in the model', () => {
        const art = new Set(manifest.presentation.symbols.map((s) => s.id));
        expect(manifest.math.symbols.every((s) => art.has(s.id))).toBe(true);
      });

      it('uses no emoji anywhere in its symbol art', () => {
        const serialised = JSON.stringify(manifest.presentation.symbols);
        expect(serialised).not.toMatch(/\p{Extended_Pictographic}/u);
      });

      it('publishes whole-coin pay values', () => {
        for (const s of manifest.math.symbols) {
          if (!s.pays) continue;
          for (const v of Object.values(s.pays)) {
            expect(v, `${s.id} pays ${v}`).toBe(v >= 10 ? Math.round(v) : v);
          }
        }
      });
    });
  }
});

/** Deterministic uniform source for the simulation assertions. */
function mulberry(seed) {
  let a = seed >>> 0;
  return function next() {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
