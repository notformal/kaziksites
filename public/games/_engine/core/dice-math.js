/**
 * ═══════════════════════════════════════════════════════════
 * LIGHTNING DICE MATHEMATICS
 *
 * Three dice, totals 3–18, a straight bet on any total. Before each roll a
 * handful of totals are struck by lightning and carry a multiplier; base
 * payouts are set below fair odds by exactly enough to fund those strikes.
 *
 * Like the slot maths, this module is pure and shared between the browser, the
 * build-time verifier and the tests — the payout a player receives is computed
 * by the same function that certified the game.
 *
 * Every quantity here is exact. A 3d6 total distribution has 216 outcomes, so
 * there is no reason to estimate anything by simulation.
 * ═══════════════════════════════════════════════════════════
 */

export const DICE_COUNT = 3;
export const DIE_FACES = 6;
export const MIN_TOTAL = DICE_COUNT;
export const MAX_TOTAL = DICE_COUNT * DIE_FACES;

/** Every total a bet can be placed on, in ascending order. */
export const TOTALS = Object.freeze(
  Array.from({ length: MAX_TOTAL - MIN_TOTAL + 1 }, (_, i) => MIN_TOTAL + i),
);

/**
 * Exact number of the 216 dice combinations producing each total.
 * Computed rather than tabulated so changing the dice count stays a one-line edit.
 */
export const COMBINATIONS = Object.freeze(
  (() => {
    let dist = [1];
    for (let d = 0; d < DICE_COUNT; d++) {
      const next = new Array(dist.length + DIE_FACES).fill(0);
      for (let i = 0; i < dist.length; i++) {
        if (!dist[i]) continue;
        for (let face = 1; face <= DIE_FACES; face++) next[i + face] += dist[i];
      }
      dist = next;
    }
    return Object.fromEntries(TOTALS.map((t) => [t, dist[t]]));
  })(),
);

export const TOTAL_OUTCOMES = DIE_FACES ** DICE_COUNT;

/** Exact probability of a given total. */
export function probability(total) {
  return (COMBINATIONS[total] || 0) / TOTAL_OUTCOMES;
}

/** Payout at true odds, before the house takes anything. */
export function fairOdds(total) {
  return TOTAL_OUTCOMES / COMBINATIONS[total];
}

// ═══════════════════════════════════════════════════════════
// LIGHTNING
// ═══════════════════════════════════════════════════════════

/**
 * Expected multiplier applied to a bet, averaged over every round.
 *
 * A total is struck with probability E[strikes]/|totals|, and a struck total's
 * payout is multiplied by a value drawn from the multiplier table. Unstruck
 * totals keep their base payout — a multiplier of one.
 *
 * @param {{strikeCounts: Record<number, number>, multipliers: Record<number, number>}} lightning
 */
export function expectedLightningFactor(lightning) {
  const expectedStrikes = Object.entries(lightning.strikeCounts).reduce(
    (sum, [count, p]) => sum + Number(count) * p,
    0,
  );
  const expectedMultiplier = Object.entries(lightning.multipliers).reduce(
    (sum, [m, p]) => sum + Number(m) * p,
    0,
  );
  const strikeChance = expectedStrikes / TOTALS.length;
  return 1 + strikeChance * (expectedMultiplier - 1);
}

/** Validates that a lightning table is a pair of proper probability distributions. */
export function validateLightning(lightning) {
  const problems = [];
  for (const [name, table] of [
    ['strikeCounts', lightning.strikeCounts],
    ['multipliers', lightning.multipliers],
  ]) {
    const sum = Object.values(table).reduce((a, b) => a + b, 0);
    if (Math.abs(sum - 1) > 1e-9) problems.push(`${name} probabilities sum to ${sum}, not 1`);
    if (Object.values(table).some((p) => p < 0)) problems.push(`${name} has a negative probability`);
  }
  if (Object.keys(lightning.strikeCounts).some((n) => Number(n) > TOTALS.length)) {
    problems.push('cannot strike more totals than exist');
  }
  return problems;
}

// ═══════════════════════════════════════════════════════════
// PAYTABLE
// ═══════════════════════════════════════════════════════════

/** Round a published payout: whole numbers above twenty, one decimal below. */
function publishable(v) {
  return v >= 20 ? Math.round(v) : Math.round(v * 10) / 10;
}

/**
 * Derive the published payout for every total.
 *
 * Base payouts sit below fair odds by exactly the amount the lightning strikes
 * hand back, so the game's return comes out at its target rather than the
 * strikes being a giveaway bolted on top.
 *
 * @param {number} targetRtp
 * @param {object} lightning
 * @returns {{payouts: Record<number, number>, baseFraction: number, lightningFactor: number}}
 */
export function buildPaytable(targetRtp, lightning) {
  const lightningFactor = expectedLightningFactor(lightning);
  const baseFraction = targetRtp / lightningFactor;
  const payouts = Object.fromEntries(
    TOTALS.map((t) => [t, publishable(fairOdds(t) * baseFraction)]),
  );
  return { payouts, baseFraction, lightningFactor };
}

/**
 * Exact return for a stake on one total.
 *
 * @returns {number} RTP for that specific bet
 */
export function totalRtp(total, payouts, lightning) {
  return probability(total) * payouts[total] * expectedLightningFactor(lightning);
}

/**
 * Full return profile: the RTP of every bet plus the spread across them.
 *
 * Straight-bet games cannot give every total *identical* return unless the
 * payouts are irrational numbers, so what matters is that the spread stays
 * narrow and no total ever favours the player. Both are asserted at build time.
 */
export function computeDiceRtp(payouts, lightning) {
  const perTotal = Object.fromEntries(TOTALS.map((t) => [t, totalRtp(t, payouts, lightning)]));
  const values = Object.values(perTotal);
  return {
    perTotal,
    min: Math.min(...values),
    max: Math.max(...values),
    /** Return to a player spreading their stake evenly across all totals. */
    average: values.reduce((a, b) => a + b, 0) / values.length,
    spread: Math.max(...values) - Math.min(...values),
  };
}

// ═══════════════════════════════════════════════════════════
// ROUND RESOLUTION
// ═══════════════════════════════════════════════════════════

/** Draw a value from a `{value: probability}` table. */
function drawFrom(table, random) {
  let r = random();
  const entries = Object.entries(table);
  for (const [value, p] of entries) {
    r -= p;
    if (r <= 0) return Number(value);
  }
  return Number(entries[entries.length - 1][0]);
}

/**
 * Pick which totals lightning strikes this round, and how hard.
 *
 * @returns {Record<number, number>} total → multiplier
 */
export function drawLightning(lightning, random) {
  const strikes = drawFrom(lightning.strikeCounts, random);
  const pool = [...TOTALS];
  const struck = {};
  for (let i = 0; i < strikes && pool.length; i++) {
    const index = Math.floor(random() * pool.length) % pool.length;
    const [total] = pool.splice(index, 1);
    struck[total] = drawFrom(lightning.multipliers, random);
  }
  return struck;
}

/** Roll the dice. */
export function rollDice(random) {
  const dice = Array.from({ length: DICE_COUNT }, () => 1 + Math.floor(random() * DIE_FACES));
  return { dice, total: dice.reduce((a, b) => a + b, 0) };
}

/**
 * Settle a round.
 *
 * @param {object} model    built dice model (payouts + lightning table)
 * @param {Record<number, number>} bets  total → stake
 * @param {Record<number, number>} struck total → multiplier
 * @param {number} total    the rolled total
 */
export function settle(model, bets, struck, total) {
  const stake = Object.values(bets).reduce((a, b) => a + b, 0);
  const wager = bets[total] || 0;
  const multiplier = struck[total] || 1;
  const payout = wager * model.payouts[total] * multiplier;
  return {
    stake,
    wager,
    total,
    multiplier,
    struck: Boolean(struck[total]),
    payout: Math.min(payout, (model.maxWinMultiplier ?? Infinity) * stake),
    net: payout - stake,
  };
}

/**
 * Empirical check that the shipped model returns what the analysis claims.
 * Used by the build and the tests; the game itself never calls it.
 */
export function simulateDice(model, rounds, random = Math.random) {
  let staked = 0;
  let returned = 0;
  let hits = 0;
  let strikesHit = 0;

  for (let i = 0; i < rounds; i++) {
    // A player betting one unit on every total — the neutral reference bettor.
    const bets = Object.fromEntries(TOTALS.map((t) => [t, 1]));
    const struck = drawLightning(model.lightning, random);
    const { total } = rollDice(random);
    const result = settle(model, bets, struck, total);
    staked += result.stake;
    returned += result.payout;
    if (result.payout > 0) hits++;
    if (result.struck && result.wager > 0) strikesHit++;
  }

  return {
    rounds,
    rtp: returned / staked,
    hitFrequency: hits / rounds,
    strikeHitFrequency: strikesHit / rounds,
  };
}

export default {
  TOTALS,
  COMBINATIONS,
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
};
