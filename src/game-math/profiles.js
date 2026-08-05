/**
 * ═══════════════════════════════════════════════════════════
 * MATH DESIGN PROFILES
 *
 * Shared, named building blocks every slot spec composes from. A game states
 * *which* profile it wants, never the raw numbers — so retuning house-wide
 * volatility is one edit here rather than nineteen edits across the catalogue.
 * ═══════════════════════════════════════════════════════════
 */

/** Symbol tiers, highest-paying first. */
export const TIERS = Object.freeze(['premium', 'high', 'mid', 'low']);

/**
 * Design paytables per tier, in line-bet units, keyed by match count.
 *
 * These are *design intent*: the build step scales the whole table by a single
 * factor so the finished game lands on its RTP target. Ratios between tiers are
 * what shape how a win feels, and those survive the scaling untouched.
 */
export const TIER_PAYS = Object.freeze({
  premium: { 3: 50, 4: 200, 5: 800 },
  high: { 3: 25, 4: 100, 5: 400 },
  mid: { 3: 15, 4: 50, 5: 160 },
  low: { 3: 8, 4: 25, 5: 70 },
  wild: { 3: 60, 4: 250, 5: 1000 },
});

/**
 * Rank within a tier.
 *
 * Two symbols in the same tier paying identically is a tell that the paytable
 * was generated rather than designed — real tables step down through every
 * symbol. The first symbol of a tier pays its full value, the second slightly
 * less, and so on.
 */
export const TIER_RANK_STEP = Object.freeze([1, 0.78, 0.62, 0.5]);

/** Apply the within-tier step to a tier's design pays. */
export function rankedPays(tier, indexInTier) {
  const base = TIER_PAYS[tier];
  const k = TIER_RANK_STEP[Math.min(indexInTier, TIER_RANK_STEP.length - 1)];
  return Object.fromEntries(Object.entries(base).map(([n, v]) => [n, v * k]));
}

/**
 * Volatility profiles.
 *
 * `weights` are relative reel frequencies per tier. Rarer premiums plus a
 * fatter low tier means longer dry spells and bigger peaks — that is the whole
 * of what "high volatility" means mechanically.
 *
 * `lineHitTarget` is the band a *single payline* is expected to pay within.
 * Stating it per line rather than per spin is what makes the gate meaningful
 * across games with different payline counts — a ten-line game and a
 * twenty-line game with identical reels have very different spin hit rates but
 * identical per-line behaviour. `hitBandForPaylines` converts it back.
 */
export const VOLATILITY_PROFILES = Object.freeze({
  medium: {
    weights: { premium: 6, high: 8, mid: 11, low: 15 },
    wildWeight: 4,
    scatterWeight: 3.8,
    lineHitTarget: { min: 0.014, max: 0.03 },
    freeSpinMultiplier: 2,
  },
  high: {
    weights: { premium: 4.5, high: 6.5, mid: 10, low: 16 },
    wildWeight: 3.2,
    scatterWeight: 3.6,
    lineHitTarget: { min: 0.012, max: 0.026 },
    freeSpinMultiplier: 3,
  },
  'very-high': {
    weights: { premium: 3.2, high: 5, mid: 9, low: 18 },
    wildWeight: 2.6,
    scatterWeight: 3.4,
    lineHitTarget: { min: 0.009, max: 0.032 },
    freeSpinMultiplier: 5,
  },
});

/**
 * Convert a profile's per-line expectation into the whole-spin hit-frequency
 * band for a game with `paylines` lines.
 *
 * Paylines overlap, so treating them as independent slightly overstates the
 * band — which is the safe direction for a gate whose job is to catch a game
 * that has gone dead or gone loose, not to certify a precise figure.
 */
export function hitBandForPaylines(profile, paylines) {
  const { min, max } = profile.lineHitTarget;
  return {
    min: 1 - (1 - min) ** paylines,
    max: 1 - (1 - max) ** paylines,
  };
}

/**
 * Scatter award tables. `pays` are in total-bet units; `freeSpins` is the
 * award count. Retriggers are on by default — the geometric series is bounded
 * and checked at build time.
 */
export const SCATTER_AWARDS = Object.freeze({
  standard: {
    pays: { 3: 2, 4: 10, 5: 50 },
    freeSpins: { 3: 10, 4: 15, 5: 20 },
    retrigger: true,
  },
  generous: {
    pays: { 3: 3, 4: 15, 5: 100 },
    freeSpins: { 3: 12, 4: 18, 5: 25 },
    retrigger: true,
  },
});

/**
 * Wilds are traditionally absent from the outer reels so a five-wild line stays
 * a theoretical rather than a routine event. `reels` lists the 0-based reels a
 * wild may land on.
 */
export const WILD_PLACEMENTS = Object.freeze({
  middleThree: [1, 2, 3],
  allButFirst: [1, 2, 3, 4],
  everywhere: [0, 1, 2, 3, 4],
});

/**
 * Per-game tuning applied on top of a volatility profile.
 *
 * Two games can share a profile and still need to *play* differently — that is
 * what this is for. Every field is optional and multiplies (or replaces) the
 * profile value, so a spec states only its deviation from house standard.
 */
export const DEFAULT_TUNING = Object.freeze({
  /** How sharply premium symbols thin out towards the right-hand reels. */
  premiumTaper: 0.06,
  /** Multipliers on the profile's tier weights. */
  tierScale: { premium: 1, high: 1, mid: 1, low: 1 },
  /** Multipliers on the profile's wild and scatter weights. */
  wildScale: 1,
  scatterScale: 1,
  /** Overrides the profile's free-spin multiplier outright when set. */
  freeSpinMultiplier: null,
});

/**
 * Expand a tier assignment plus a volatility profile into the per-reel weight
 * table `buildMathModel` consumes.
 *
 * @param {object} args
 * @param {Array<{id:string, tier:string}>} args.paying paying symbols in tier order
 * @param {string} args.wildId
 * @param {string} args.scatterId
 * @param {string} args.volatility key of VOLATILITY_PROFILES
 * @param {number[]} args.wildReels reels the wild may occupy
 * @param {object} [args.tuning] per-game deviations, see DEFAULT_TUNING
 * @param {number} [args.reels]
 * @returns {Array<Record<string, number>>}
 */
export function buildReelWeights({
  paying,
  wildId,
  scatterId,
  volatility,
  wildReels,
  tuning = {},
  reels = 5,
}) {
  const profile = VOLATILITY_PROFILES[volatility];
  if (!profile) throw new Error(`Unknown volatility profile "${volatility}"`);

  const t = {
    ...DEFAULT_TUNING,
    ...tuning,
    tierScale: { ...DEFAULT_TUNING.tierScale, ...(tuning.tierScale || {}) },
  };

  return Array.from({ length: reels }, (_, reel) => {
    const weights = {};
    for (const symbol of paying) {
      const base = profile.weights[symbol.tier];
      if (base === undefined) {
        throw new Error(`Symbol "${symbol.id}" has unknown tier "${symbol.tier}"`);
      }
      // Premiums thin out towards the right-hand reels, which is what makes
      // four- and five-of-a-kind meaningfully rarer than three.
      const tapered = symbol.tier === 'premium' || symbol.tier === 'high';
      const taper = tapered ? 1 - reel * t.premiumTaper : 1;
      weights[symbol.id] = Number((base * t.tierScale[symbol.tier] * taper).toFixed(3));
    }
    weights[wildId] = wildReels.includes(reel)
      ? Number((profile.wildWeight * t.wildScale).toFixed(3))
      : 0;
    weights[scatterId] = Number((profile.scatterWeight * t.scatterScale).toFixed(3));
    return weights;
  });
}

export default { TIERS, TIER_PAYS, VOLATILITY_PROFILES, SCATTER_AWARDS, WILD_PLACEMENTS, buildReelWeights };
