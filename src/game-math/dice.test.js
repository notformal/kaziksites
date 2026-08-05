import { describe, expect, it } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

import {
  TOTALS,
  COMBINATIONS,
  TOTAL_OUTCOMES,
  probability,
  fairOdds,
  expectedLightningFactor,
  validateLightning,
  buildPaytable,
  computeDiceRtp,
  drawLightning,
  rollDice,
  settle,
  simulateDice,
} from '../../public/games/_engine/core/dice-math.js';
import { MATH } from '../../public/games/_engine/config/engine.config.js';

const LIGHTNING = {
  strikeCounts: { 1: 0.55, 2: 0.32, 3: 0.13 },
  multipliers: { 2: 0.5, 3: 0.25, 5: 0.15, 10: 0.08, 50: 0.02 },
};

describe('three-dice distribution', () => {
  it('covers every total from 3 to 18', () => {
    expect(TOTALS[0]).toBe(3);
    expect(TOTALS[TOTALS.length - 1]).toBe(18);
    expect(TOTALS).toHaveLength(16);
  });

  it('combinations sum to 216', () => {
    expect(Object.values(COMBINATIONS).reduce((a, b) => a + b, 0)).toBe(TOTAL_OUTCOMES);
    expect(TOTAL_OUTCOMES).toBe(216);
  });

  it('matches the known 3d6 frequencies', () => {
    expect(COMBINATIONS[3]).toBe(1);
    expect(COMBINATIONS[10]).toBe(27);
    expect(COMBINATIONS[11]).toBe(27);
    expect(COMBINATIONS[18]).toBe(1);
  });

  it('is symmetric about 10.5', () => {
    for (const t of TOTALS) expect(COMBINATIONS[t]).toBe(COMBINATIONS[21 - t]);
  });

  it('probabilities form a distribution', () => {
    expect(TOTALS.reduce((s, t) => s + probability(t), 0)).toBeCloseTo(1, 12);
  });

  it('fair odds are the reciprocal of probability', () => {
    for (const t of TOTALS) expect(fairOdds(t)).toBeCloseTo(1 / probability(t), 9);
  });
});

describe('lightning table', () => {
  it('accepts a well-formed table', () => {
    expect(validateLightning(LIGHTNING)).toEqual([]);
  });

  it('rejects probabilities that do not sum to one', () => {
    expect(validateLightning({ ...LIGHTNING, multipliers: { 2: 0.5 } })).not.toEqual([]);
  });

  it('is worth more than one and less than the top multiplier', () => {
    const factor = expectedLightningFactor(LIGHTNING);
    expect(factor).toBeGreaterThan(1);
    expect(factor).toBeLessThan(50);
  });

  it('never strikes the same total twice in a round', () => {
    let random = 0;
    const seq = () => {
      random = (random * 1103515245 + 12345) % 2147483648;
      return random / 2147483648;
    };
    for (let i = 0; i < 500; i++) {
      const struck = drawLightning(LIGHTNING, seq);
      const totals = Object.keys(struck);
      expect(new Set(totals).size).toBe(totals.length);
      expect(totals.length).toBeLessThanOrEqual(3);
      expect(totals.length).toBeGreaterThanOrEqual(1);
    }
  });
});

describe('paytable', () => {
  const { payouts } = buildPaytable(0.962, LIGHTNING);
  const rtp = computeDiceRtp(payouts, LIGHTNING);

  it('prices every total below true odds', () => {
    for (const t of TOTALS) expect(payouts[t]).toBeLessThan(fairOdds(t));
  });

  it('never lets a single bet beat the house', () => {
    expect(rtp.max).toBeLessThanOrEqual(MATH.maxRtp);
  });

  it('never buries a total below the house floor', () => {
    expect(rtp.min).toBeGreaterThanOrEqual(MATH.minRtp);
  });

  it('keeps the spread between bets narrow', () => {
    expect(rtp.spread).toBeLessThan(0.05);
  });

  it('averages onto the target', () => {
    expect(Math.abs(rtp.average - 0.962)).toBeLessThan(MATH.rtpTolerance * 2);
  });
});

describe('round settlement', () => {
  const { payouts } = buildPaytable(0.962, LIGHTNING);
  const model = { payouts, lightning: LIGHTNING, maxWinMultiplier: 2000 };

  it('pays only the total that came in', () => {
    const result = settle(model, { 10: 5, 11: 5 }, {}, 10);
    expect(result.wager).toBe(5);
    expect(result.stake).toBe(10);
    expect(result.payout).toBeCloseTo(5 * payouts[10], 9);
  });

  it('pays nothing when no bet covers the roll', () => {
    expect(settle(model, { 10: 5 }, {}, 7).payout).toBe(0);
  });

  it('applies a lightning multiplier when the struck total lands', () => {
    const plain = settle(model, { 12: 2 }, {}, 12).payout;
    const struck = settle(model, { 12: 2 }, { 12: 10 }, 12).payout;
    expect(struck).toBeCloseTo(plain * 10, 9);
  });

  it('caps a round at the configured ceiling', () => {
    const capped = { ...model, maxWinMultiplier: 3 };
    expect(settle(capped, { 3: 1 }, { 3: 50 }, 3).payout).toBe(3);
  });

  it('rolls only legal dice', () => {
    for (let i = 0; i < 300; i++) {
      const { dice, total } = rollDice(Math.random);
      expect(dice).toHaveLength(3);
      expect(dice.every((d) => d >= 1 && d <= 6)).toBe(true);
      expect(total).toBe(dice.reduce((a, b) => a + b, 0));
    }
  });
});

describe('built dice artefact', () => {
  const path = resolve(process.cwd(), 'public/games/lightning-dice/math.json');

  it('exists', () => {
    expect(existsSync(path), 'run `npm run build:dice`').toBe(true);
  });

  if (!existsSync(path)) return;
  const manifest = JSON.parse(readFileSync(path, 'utf8'));

  it('recomputes to the certified return', () => {
    const rtp = computeDiceRtp(manifest.math.payouts, manifest.math.lightning);
    expect(rtp.average).toBeCloseTo(manifest.certification.averageRtp, 5);
  });

  it('keeps every bet inside the house band', () => {
    const rtp = computeDiceRtp(manifest.math.payouts, manifest.math.lightning);
    expect(rtp.max).toBeLessThanOrEqual(MATH.maxRtp);
    expect(rtp.min).toBeGreaterThanOrEqual(MATH.minRtp);
  });

  it('agrees with a fresh simulation', () => {
    let a = 0xd1ce;
    const rng = () => {
      a = (a + 0x6d2b79f5) >>> 0;
      let t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
    const sim = simulateDice(manifest.math, 200000, rng);
    expect(Math.abs(sim.rtp - manifest.certification.averageRtp)).toBeLessThan(0.015);
  });
});
