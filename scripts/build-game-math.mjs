/**
 * ═══════════════════════════════════════════════════════════
 * GAME MATH BUILD
 *
 * Turns each design spec in src/game-math/specs.js into a frozen, verified
 * math model written to public/games/<id>/math.json.
 *
 * Why build-time: calibration and verification are expensive and must be
 * *identical* for every player. A certified slot ships fixed reel strips and a
 * fixed paytable; it does not recompute its own RTP on the player's machine.
 * The browser therefore loads a finished model and never calibrates.
 *
 * Every game is gated on three checks and the build fails loudly if any misses:
 *   1. exact RTP within tolerance of the declared target
 *   2. simulated RTP agreeing with the exact figure inside Monte-Carlo error
 *   3. hit frequency inside the band its volatility profile promises
 *
 * Usage: node scripts/build-game-math.mjs [--rounds N] [--game id]
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { SPECS } from '../src/game-math/specs.js';
import {
  TIER_PAYS,
  VOLATILITY_PROFILES,
  SCATTER_AWARDS,
  WILD_PLACEMENTS,
  buildReelWeights,
  hitBandForPaylines,
  rankedPays,
} from '../src/game-math/profiles.js';
import { buildMathModel } from '../public/games/_engine/core/strips.js';
import { computeRtp, simulate } from '../public/games/_engine/core/math.js';
import { MATH } from '../public/games/_engine/config/engine.config.js';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');

// ─── CLI ────────────────────────────────────────────────────
const args = process.argv.slice(2);
const argValue = (flag, fallback) => {
  const i = args.indexOf(flag);
  return i >= 0 && args[i + 1] ? args[i + 1] : fallback;
};
const ROUNDS = Number(argValue('--rounds', 400000));
const ONLY = argValue('--game', null);
const STRIP_LENGTH = Number(argValue('--strip', 120));

/**
 * Deterministic uniform source so a build is reproducible: the same specs
 * always produce the same verification numbers, which makes a CI failure mean
 * "the maths changed", never "the dice were unkind today".
 */
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

/** Assemble the full symbol cast: paying symbols, then wild, then scatter. */
function assembleSymbols(spec) {
  const seenInTier = new Map();
  const paying = spec.symbols.map((s) => {
    const index = seenInTier.get(s.tier) ?? 0;
    seenInTier.set(s.tier, index + 1);
    return {
      id: s.id,
      kind: 'normal',
      tier: s.tier,
      name: s.name,
      art: s.art,
      pays: rankedPays(s.tier, index),
    };
  });

  const wild = {
    id: spec.wild.id,
    kind: 'wild',
    tier: spec.wild.tier,
    name: spec.wild.name,
    art: spec.wild.art,
    pays: { ...TIER_PAYS.wild },
  };

  const award = SCATTER_AWARDS[spec.scatterAward];
  if (!award) throw new Error(`${spec.id}: unknown scatter award "${spec.scatterAward}"`);

  const scatter = {
    id: spec.scatter.id,
    kind: 'scatter',
    tier: spec.scatter.tier,
    name: spec.scatter.name,
    art: spec.scatter.art,
    scatterPays: { ...award.pays },
    freeSpins: { ...award.freeSpins },
    retrigger: award.retrigger,
  };

  return { paying, wild, scatter, symbols: [...paying, wild, scatter] };
}

function buildGame(spec) {
  const profile = VOLATILITY_PROFILES[spec.volatility];
  if (!profile) throw new Error(`${spec.id}: unknown volatility "${spec.volatility}"`);

  const wildReels = WILD_PLACEMENTS[spec.wildPlacement];
  if (!wildReels) throw new Error(`${spec.id}: unknown wild placement "${spec.wildPlacement}"`);

  const { paying, wild, scatter, symbols } = assembleSymbols(spec);

  const tuning = spec.tuning || {};
  const reelWeights = buildReelWeights({
    paying: paying.map((s) => ({ id: s.id, tier: s.tier })),
    wildId: wild.id,
    scatterId: scatter.id,
    volatility: spec.volatility,
    wildReels,
    tuning,
  });

  const { model, report } = buildMathModel({
    rows: 3,
    paylineCount: spec.paylines,
    symbols,
    reelWeights,
    stripLength: STRIP_LENGTH,
    freeSpinMultiplier: tuning.freeSpinMultiplier ?? profile.freeSpinMultiplier,
    maxWinMultiplier: MATH.maxWinMultiplier,
    targetRtp: spec.targetRtp,
    // The tuner trades positions between the tiers at the two ends of the
    // paytable. Those are the moves with the largest effect on return and the
    // smallest effect on how the reels read to a player.
    tuning: {
      donors: paying.filter((s) => s.tier === 'premium' || s.tier === 'high').map((s) => s.id),
      recipients: paying.filter((s) => s.tier === 'low' || s.tier === 'mid').map((s) => s.id),
    },
  });

  const exact = computeRtp(model);
  const sim = simulate(model, ROUNDS, mulberry32(0xc0ffee));

  // ── Gate 1: exact RTP hits its target ──
  const rtpError = Math.abs(exact.rtp - spec.targetRtp);
  const problems = [];
  if (rtpError > MATH.rtpTolerance) {
    problems.push(
      `exact RTP ${(exact.rtp * 100).toFixed(3)}% misses target ${(spec.targetRtp * 100).toFixed(2)}%`,
    );
  }
  if (exact.rtp < MATH.minRtp || exact.rtp > MATH.maxRtp) {
    problems.push(`exact RTP ${(exact.rtp * 100).toFixed(3)}% outside house band`);
  }

  // ── Gate 2: simulation agrees with the analysis ──
  // Three standard errors of the mean; anything wider means the runtime
  // evaluator and the analytic model have drifted apart.
  const stderr = sim.volatilityIndex / Math.sqrt(ROUNDS);
  if (Math.abs(sim.rtp - exact.rtp) > 3 * stderr + 0.002) {
    problems.push(
      `simulated RTP ${(sim.rtp * 100).toFixed(3)}% disagrees with exact ` +
        `${(exact.rtp * 100).toFixed(3)}% (3σ = ${(3 * stderr * 100).toFixed(3)}%)`,
    );
  }

  // ── Gate 3: the game pays out often enough to feel alive ──
  const { min, max } = hitBandForPaylines(profile, spec.paylines);
  if (sim.hitFrequency < min || sim.hitFrequency > max) {
    problems.push(
      `hit frequency ${(sim.hitFrequency * 100).toFixed(2)}% outside ` +
        `${(min * 100).toFixed(1)}–${(max * 100).toFixed(1)}% expected for ` +
        `"${spec.volatility}" over ${spec.paylines} lines`,
    );
  }
  if (sim.hitFrequency < MATH.hitFrequency.min || sim.hitFrequency > MATH.hitFrequency.max) {
    problems.push(`hit frequency ${(sim.hitFrequency * 100).toFixed(2)}% outside house band`);
  }

  return { spec, model, report, exact, sim, problems, symbols };
}

/** The artefact a game's front end loads. */
function serialise({ spec, model, report, exact, sim, symbols }) {
  return {
    $schema: 'kaziksites/game-math@1',
    id: spec.id,
    title: spec.title,
    generatedBy: 'scripts/build-game-math.mjs',
    presentation: {
      theme: spec.theme,
      feature: spec.feature,
      volatility: spec.volatility,
      symbols: symbols.map((s) => ({ id: s.id, name: s.name, tier: s.tier, kind: s.kind, art: s.art })),
    },
    math: {
      rows: model.rows,
      paylines: model.paylines,
      strips: model.strips,
      freeSpinMultiplier: model.freeSpinMultiplier,
      maxWinMultiplier: model.maxWinMultiplier,
      wild: model.wild,
      scatter: model.scatter,
      symbols: model.symbols.map((s) => ({
        id: s.id,
        kind: s.kind,
        ...(s.pays ? { pays: s.pays } : {}),
      })),
    },
    certification: {
      targetRtp: spec.targetRtp,
      exactRtp: Number(exact.rtp.toFixed(6)),
      breakdown: {
        lines: Number(exact.lines.toFixed(6)),
        scatters: Number(exact.scatters.toFixed(6)),
        freeSpins: Number(exact.freeSpins.toFixed(6)),
        expectedFreeSpinsPerSpin: Number(exact.expectedFreeSpins.toFixed(6)),
      },
      payScale: Number(report.payScale.toFixed(6)),
      simulation: {
        rounds: sim.rounds,
        rtp: Number(sim.rtp.toFixed(6)),
        hitFrequency: Number(sim.hitFrequency.toFixed(5)),
        bonusFrequency: Number(sim.bonusFrequency.toFixed(5)),
        volatilityIndex: Number(sim.volatilityIndex.toFixed(4)),
        maxWinMultiplier: Number(sim.maxWinMultiplier.toFixed(2)),
      },
    },
  };
}

// ═══════════════════════════════════════════════════════════

const targets = ONLY ? SPECS.filter((s) => s.id === ONLY) : SPECS;
if (targets.length === 0) {
  console.error(`No spec matches --game ${ONLY}`);
  process.exit(1);
}

console.log(`Building math for ${targets.length} game(s) — ${ROUNDS.toLocaleString()} verification rounds each\n`);
console.log(
  'game'.padEnd(24) +
    'RTP(exact)'.padEnd(12) +
    'RTP(sim)'.padEnd(11) +
    'hit%'.padEnd(8) +
    'bonus%'.padEnd(9) +
    'vol'.padEnd(7) +
    'maxWin',
);
console.log('─'.repeat(84));

let failures = 0;

for (const spec of targets) {
  let built;
  try {
    built = buildGame(spec);
  } catch (err) {
    console.log(`${spec.id.padEnd(24)}BUILD ERROR: ${err.message}`);
    failures++;
    continue;
  }

  const { exact, sim, problems } = built;
  console.log(
    spec.id.padEnd(24) +
      `${(exact.rtp * 100).toFixed(3)}%`.padEnd(12) +
      `${(sim.rtp * 100).toFixed(2)}%`.padEnd(11) +
      `${(sim.hitFrequency * 100).toFixed(1)}`.padEnd(8) +
      `${(sim.bonusFrequency * 100).toFixed(2)}`.padEnd(9) +
      `${sim.volatilityIndex.toFixed(2)}`.padEnd(7) +
      `${sim.maxWinMultiplier.toFixed(0)}x`,
  );

  for (const p of problems) console.log(`   ✗ ${p}`);
  if (problems.length) {
    failures++;
    continue;
  }

  const dir = resolve(ROOT, 'public/games', spec.id);
  mkdirSync(dir, { recursive: true });
  writeFileSync(resolve(dir, 'math.json'), `${JSON.stringify(serialise(built), null, 2)}\n`);
}

console.log('─'.repeat(84));
if (failures) {
  console.error(`\n${failures} game(s) failed verification — no artefact written for those.`);
  process.exit(1);
}
console.log(`\n✓ ${targets.length} game(s) verified and written.`);
