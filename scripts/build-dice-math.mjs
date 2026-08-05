/**
 * ═══════════════════════════════════════════════════════════
 * DICE MATH BUILD
 *
 * Same contract as the slot build: derive a model from design intent, verify
 * it, and write a frozen artefact the browser loads without recomputing
 * anything.
 *
 * Gates:
 *   1. no single bet may return more than the house ceiling — a straight-bet
 *      game with one loose total is a game with one exploitable total
 *   2. the spread across bets stays narrow, so no total is a trap either
 *   3. the average return lands on target
 *   4. simulation agrees with the exact analysis
 *
 * Usage: node scripts/build-dice-math.mjs [--rounds N]
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  TOTALS,
  COMBINATIONS,
  probability,
  fairOdds,
  buildPaytable,
  computeDiceRtp,
  validateLightning,
  simulateDice,
  expectedLightningFactor,
} from '../public/games/_engine/core/dice-math.js';
import { MATH } from '../public/games/_engine/config/engine.config.js';
import { HUES } from '../public/games/_engine/art/palette.js';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const ROUNDS = Number(args.includes('--rounds') ? args[args.indexOf('--rounds') + 1] : 500000);

// ═══════════════════════════════════════════════════════════
// DESIGN SPEC
// ═══════════════════════════════════════════════════════════

const SPEC = {
  id: 'lightning-dice',
  title: 'Lightning Dice',
  targetRtp: 0.962,
  /** A single round's payout ceiling, as a multiple of the round's total stake. */
  maxWinMultiplier: 2000,
  theme: {
    backgroundHue: HUES.indigo,
    backgroundLightness: 0.07,
    accentHue: HUES.amber,
    secondaryHue: HUES.cyan,
    metal: 'silver',
  },
  /**
   * Lightning table.
   *
   * How many totals get struck each round, and how hard. Skewed towards small
   * multipliers with a thin tail: the ×2s are what make a round feel alive,
   * the ×50 is what people talk about. The base paytable is discounted by
   * exactly what this table gives back, so the strikes are funded rather than
   * free.
   */
  lightning: {
    strikeCounts: { 1: 0.55, 2: 0.32, 3: 0.13 },
    multipliers: { 2: 0.5, 3: 0.25, 5: 0.15, 10: 0.08, 50: 0.02 },
  },
};

// ═══════════════════════════════════════════════════════════

const lightningProblems = validateLightning(SPEC.lightning);
if (lightningProblems.length) {
  for (const p of lightningProblems) console.error(`✗ lightning table: ${p}`);
  process.exit(1);
}

const { payouts, baseFraction, lightningFactor } = buildPaytable(SPEC.targetRtp, SPEC.lightning);
const exact = computeDiceRtp(payouts, SPEC.lightning);

function mulberry32(seed) {
  let a = seed >>> 0;
  return function next() {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const model = {
  payouts,
  lightning: SPEC.lightning,
  maxWinMultiplier: SPEC.maxWinMultiplier,
};
const sim = simulateDice(model, ROUNDS, mulberry32(0xd1ce));

// ─── Report ─────────────────────────────────────────────────
console.log(`Lightning Dice — ${ROUNDS.toLocaleString()} verification rounds\n`);
console.log('total  combos  probability   fair    payout    RTP');
console.log('─'.repeat(56));
for (const t of TOTALS) {
  console.log(
    String(t).padStart(4) +
      String(COMBINATIONS[t]).padStart(8) +
      probability(t).toFixed(5).padStart(13) +
      fairOdds(t).toFixed(1).padStart(9) +
      String(payouts[t]).padStart(9) +
      `${(exact.perTotal[t] * 100).toFixed(2)}%`.padStart(9),
  );
}
console.log('─'.repeat(56));
console.log(
  `base fraction ${(baseFraction * 100).toFixed(2)}%  ·  lightning ×${lightningFactor.toFixed(4)}\n` +
    `RTP  min ${(exact.min * 100).toFixed(2)}%  max ${(exact.max * 100).toFixed(2)}%  ` +
    `avg ${(exact.average * 100).toFixed(3)}%  spread ${(exact.spread * 100).toFixed(2)}pp\n` +
    `simulated ${(sim.rtp * 100).toFixed(3)}%  ·  strike hit rate ${(sim.strikeHitFrequency * 100).toFixed(2)}%`,
);

// ─── Gates ──────────────────────────────────────────────────
const problems = [];
if (exact.max > MATH.maxRtp) {
  problems.push(`best bet returns ${(exact.max * 100).toFixed(2)}% — above the house ceiling`);
}
if (exact.min < MATH.minRtp) {
  problems.push(`worst bet returns ${(exact.min * 100).toFixed(2)}% — below the house floor`);
}
if (exact.spread > 0.05) {
  problems.push(`spread across bets is ${(exact.spread * 100).toFixed(2)}pp — too wide to be fair`);
}
if (Math.abs(exact.average - SPEC.targetRtp) > MATH.rtpTolerance * 2) {
  problems.push(
    `average return ${(exact.average * 100).toFixed(3)}% misses target ${(SPEC.targetRtp * 100).toFixed(2)}%`,
  );
}
if (Math.abs(sim.rtp - exact.average) > 0.01) {
  problems.push(
    `simulated ${(sim.rtp * 100).toFixed(3)}% disagrees with exact ${(exact.average * 100).toFixed(3)}%`,
  );
}

if (problems.length) {
  console.error('');
  for (const p of problems) console.error(`✗ ${p}`);
  process.exit(1);
}

// ─── Artefact ───────────────────────────────────────────────
const artefact = {
  $schema: 'kaziksites/dice-math@1',
  id: SPEC.id,
  title: SPEC.title,
  generatedBy: 'scripts/build-dice-math.mjs',
  presentation: { theme: SPEC.theme, volatility: 'high' },
  math: {
    diceCount: 3,
    totals: TOTALS,
    payouts,
    lightning: SPEC.lightning,
    maxWinMultiplier: SPEC.maxWinMultiplier,
  },
  certification: {
    targetRtp: SPEC.targetRtp,
    averageRtp: Number(exact.average.toFixed(6)),
    minRtp: Number(exact.min.toFixed(6)),
    maxRtp: Number(exact.max.toFixed(6)),
    perTotalRtp: Object.fromEntries(
      TOTALS.map((t) => [t, Number(exact.perTotal[t].toFixed(6))]),
    ),
    baseFraction: Number(baseFraction.toFixed(6)),
    lightningFactor: Number(expectedLightningFactor(SPEC.lightning).toFixed(6)),
    simulation: {
      rounds: sim.rounds,
      rtp: Number(sim.rtp.toFixed(6)),
      strikeHitFrequency: Number(sim.strikeHitFrequency.toFixed(5)),
    },
  },
};

const dir = resolve(ROOT, 'public/games', SPEC.id);
mkdirSync(dir, { recursive: true });
writeFileSync(resolve(dir, 'math.json'), `${JSON.stringify(artefact, null, 2)}\n`);
console.log(`\n✓ verified and written to public/games/${SPEC.id}/math.json`);
