/**
 * ═══════════════════════════════════════════════════════════
 * REEL STRIPS & MATH-MODEL ASSEMBLY
 *
 * A game definition states *design intent* — which symbols exist, roughly how
 * often each should appear on each reel, and the shape of the paytable. This
 * module turns that intent into the concrete reel strips the engine spins, and
 * calibrates the paytable so the finished game lands on its RTP target exactly.
 *
 * The division of labour matters and is easy to get backwards: reel
 * frequencies decide how a game *feels* — its volatility, its hit rate, how
 * often the bonus lands — while the paytable decides what it *returns*. See
 * `calibratePaytable` for why the return target is dialled in there and not by
 * nudging symbol frequencies.
 * ═══════════════════════════════════════════════════════════
 */

import { SYMBOL_KIND, computeRtp } from './math.js';

/** Default strip length. Longer strips give finer control over frequencies. */
export const DEFAULT_STRIP_LENGTH = 96;

// ═══════════════════════════════════════════════════════════
// PAYLINES
// ═══════════════════════════════════════════════════════════

/**
 * Canonical payline set for a 5×3 board, ordered the way players expect:
 * the three straight lines first, then V and inverted-V, then the zigzags.
 * A game asks for the first N of these.
 */
export const PAYLINES_5x3 = Object.freeze([
  [1, 1, 1, 1, 1],
  [0, 0, 0, 0, 0],
  [2, 2, 2, 2, 2],
  [0, 1, 2, 1, 0],
  [2, 1, 0, 1, 2],
  [0, 0, 1, 2, 2],
  [2, 2, 1, 0, 0],
  [1, 0, 0, 0, 1],
  [1, 2, 2, 2, 1],
  [0, 1, 1, 1, 0],
  [2, 1, 1, 1, 2],
  [1, 0, 1, 2, 1],
  [1, 2, 1, 0, 1],
  [0, 0, 1, 0, 0],
  [2, 2, 1, 2, 2],
  [1, 1, 0, 1, 1],
  [1, 1, 2, 1, 1],
  [0, 1, 0, 1, 0],
  [2, 1, 2, 1, 2],
  [0, 2, 0, 2, 0],
]);

/** @returns {number[][]} the first `count` paylines for a 5×3 board. */
export function paylines5x3(count) {
  if (count > PAYLINES_5x3.length) {
    throw new Error(`Only ${PAYLINES_5x3.length} paylines are defined, asked for ${count}`);
  }
  return PAYLINES_5x3.slice(0, count).map((p) => [...p]);
}

// ═══════════════════════════════════════════════════════════
// STRIP CONSTRUCTION
// ═══════════════════════════════════════════════════════════

/**
 * Small deterministic PRNG. Strip layout must be reproducible: the same spec
 * has to yield the same strips on every machine, or the certified RTP would
 * not describe what actually ships.
 */
function seededRandom(seed) {
  let a = (seed >>> 0) || 1;
  return function next() {
    a ^= a << 13; a >>>= 0;
    a ^= a >> 17;
    a ^= a << 5; a >>>= 0;
    return a / 4294967296;
  };
}

/**
 * Exact symbol counts for a strip of `length`, by largest-remainder
 * apportionment — the counts sum to `length` with no rounding drift.
 */
function apportion(weights, length) {
  const entries = Object.entries(weights).filter(([, w]) => w > 0);
  if (entries.length === 0) throw new Error('Strip needs at least one weighted symbol');

  const total = entries.reduce((sum, [, w]) => sum + w, 0);
  const quotas = entries.map(([id, w]) => {
    const exact = (w / total) * length;
    return { id, count: Math.floor(exact), remainder: exact - Math.floor(exact) };
  });

  let assigned = quotas.reduce((sum, q) => sum + q.count, 0);
  const byRemainder = [...quotas].sort((a, b) => b.remainder - a.remainder);
  for (let i = 0; assigned < length; i++, assigned++) byRemainder[i % byRemainder.length].count++;

  return quotas;
}

/**
 * Expand relative weights into a concrete strip of `length` symbols.
 *
 * Two constraints shape the layout, and both matter:
 *
 *  1. **Spaced specials.** Symbols named in `spaceOut` (scatters, usually the
 *     wild too) are placed on an even lattice with a per-reel phase, so they
 *     can never stack inside one visible window. Real cabinets do exactly this;
 *     without it a shuffle occasionally deals three scatters into one reel and
 *     the bonus rate stops matching the design.
 *  2. **Independent reels.** Everything else is shuffled with a per-reel seed.
 *     Reels with identical weights would otherwise produce byte-identical
 *     strips, and five reels showing the same symbol on every row is not a
 *     slot machine — it is a bug with a payout attached.
 *
 * Composition is unaffected either way, and the build recomputes the exact RTP
 * and scatter distribution from the finished strips, so layout can never
 * silently drift away from the certified figures.
 *
 * @param {Record<string, number>} weights symbolId → relative weight
 * @param {number} length
 * @param {{seed?: number, spaceOut?: string[], minGap?: number}} [options]
 * @returns {string[]}
 */
export function expandStrip(weights, length = DEFAULT_STRIP_LENGTH, options = {}) {
  const { seed = 1, spaceOut = [], minGap = 3 } = options;
  const random = seededRandom(seed * 2654435761 + 12345);
  const quotas = apportion(weights, length);
  const strip = new Array(length).fill(null);

  // ── 1. Lattice-place the spaced symbols ──
  const spaced = new Set(spaceOut);
  // Use per-symbol-type phase offset derived from the PRNG to avoid collisions
  // between different spaced symbols (wild, scatter) sharing the same lattice.
  let basePhase = seed % Math.max(1, length);
  for (const { id, count } of quotas) {
    if (!spaced.has(id) || count === 0) continue;
    const step = length / count;
    if (step < minGap) {
      throw new Error(
        `Symbol "${id}" appears ${count}× on a ${length}-position strip — ` +
          `spacing ${step.toFixed(1)} is below the ${minGap}-position minimum`,
      );
    }
    // Each spaced symbol type gets its own phase offset to prevent lattice collisions
    const symbolPhase = basePhase;
    for (let i = 0; i < count; i++) {
      let slot = Math.round(i * step + symbolPhase) % length;
      let probes = 0;
      while (strip[slot] !== null && probes++ < length) slot = (slot + 1) % length;
      strip[slot] = id;
    }
    // Advance basePhase for next spaced symbol type, but don't reuse the same phase
    basePhase = (basePhase + Math.floor(step / 2)) % length;
  }

  // ── 2. Shuffle the remainder into the gaps ──
  const bag = [];
  for (const { id, count } of quotas) {
    if (spaced.has(id)) continue;
    for (let i = 0; i < count; i++) bag.push(id);
  }
  for (let i = bag.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [bag[i], bag[j]] = [bag[j], bag[i]];
  }

  let cursor = 0;
  for (let i = 0; i < length; i++) {
    if (strip[i] === null) strip[i] = bag[cursor++] ?? bag[0];
  }

  return strip;
}

/**
 * Build one strip per reel from a per-reel weight table.
 *
 * @param {Array<Record<string, number>>} reelWeights one entry per reel
 * @param {number} length
 * @param {{spaceOut?: string[], minGap?: number}} [options]
 */
export function buildStrips(reelWeights, length = DEFAULT_STRIP_LENGTH, options = {}) {
  // The reel index seeds the shuffle, which is what makes the reels independent.
  return reelWeights.map((w, reel) => expandStrip(w, length, { ...options, seed: reel + 1 }));
}

// ═══════════════════════════════════════════════════════════
// PAYTABLE CALIBRATION
// ═══════════════════════════════════════════════════════════

/**
 * Round a pay value to something a player would expect to read on a paytable.
 *
 * Slot paytables are published documents. "5× 500" is a number a player can
 * hold in their head; "5× 1681.33" tells them the value fell out of a solver,
 * which is not the impression a casino product should give. Whole coins above
 * ten, one decimal below — the convention real paytables use.
 */
export function niceRound(v) {
  return v >= 10 ? Math.round(v) : Math.round(v * 10) / 10;
}

/**
 * Round to `digits` significant figures — 1624 → 1600, 103 → 100, 53 → 53.
 *
 * This is what turns a solver's output into a paytable a designer would sign
 * off on. The rounding introduces an RTP error, which `tuneFrequencies` then
 * removes without touching the published numbers again.
 */
export function significantRound(v, digits = 2) {
  if (v === 0) return 0;
  const magnitude = 10 ** (Math.floor(Math.log10(Math.abs(v))) - (digits - 1));
  const rounded = Math.round(v / magnitude) * magnitude;
  // Keep sub-unit values readable rather than collapsing them to 0.
  return rounded >= 10 ? Math.round(rounded) : Number(rounded.toFixed(1));
}

/** Deep copy of a model with every pay value passed through `transform`. */
function mapPaytable(model, transform) {
  const map = (pays) => Object.fromEntries(Object.entries(pays).map(([k, v]) => [k, transform(v)]));
  return {
    ...model,
    symbols: model.symbols.map((s) => (s.pays ? { ...s, pays: map(s.pays) } : { ...s })),
    scatter: model.scatter ? { ...model.scatter, pays: map(model.scatter.pays || {}) } : model.scatter,
  };
}

/**
 * Calibrate a designed paytable onto an RTP target, keeping every published
 * value a whole coin.
 *
 * Expected return is exactly *linear* in a uniform paytable scale: the
 * free-spin multiplier depends only on scatter frequency, which the scale does
 * not touch. So the ideal scalar is a single division. Rounding to whole coins
 * then reintroduces a small error, and because the relationship is linear, one
 * more division corrects it — the passes converge geometrically, and in
 * practice two or three land inside a hundredth of a percent.
 *
 * Reel composition is deliberately *not* used as the corrective lever. It looks
 * like the obvious knob, but the RTP surface over symbol frequencies is not
 * monotone: making the premiums rarer also makes the low symbols commoner, and
 * their own five-of-a-kind pays enough to push return back up. A bisection over
 * that surface silently converges on the wrong root. Frequencies set how a game
 * *feels* (volatility, hit rate); the paytable sets what it *returns*.
 *
 * @param {object} model      assembled model with design-intent pay values
 * @param {number} targetRtp
 * @param {{tolerance?: number, maxPasses?: number, round?: boolean}} [options]
 * @returns {{model: object, scale: number, achieved: number, design: number, passes: number}}
 */
export function calibratePaytable(model, targetRtp, options = {}) {
  const { tolerance = 0.0002, maxPasses = 12, round = true } = options;

  const design = computeRtp(model).rtp;
  if (!(design > 0)) {
    throw new Error('Design paytable returns nothing — cannot calibrate to a target');
  }

  const quantise = round ? niceRound : (v) => Number(v.toFixed(4));

  let current = model;
  let achieved = design;
  let totalScale = 1;
  let passes = 0;

  while (passes < maxPasses && Math.abs(achieved - targetRtp) > tolerance) {
    const step = targetRtp / achieved;
    const next = mapPaytable(current, (v) => quantise(v * step));
    const nextRtp = computeRtp(next).rtp;

    // Rounding can, rarely, make a pass worse than the one before it — keep the
    // better of the two rather than oscillating around the target.
    if (Math.abs(nextRtp - targetRtp) >= Math.abs(achieved - targetRtp) && passes > 0) break;

    current = next;
    achieved = nextRtp;
    totalScale *= step;
    passes++;
  }

  return { model: current, scale: totalScale, achieved, design, passes };
}

// ═══════════════════════════════════════════════════════════
// FREQUENCY TUNING
// ═══════════════════════════════════════════════════════════

/** Symbol → count map for one strip. */
function stripCounts(strip) {
  const counts = {};
  for (const id of strip) counts[id] = (counts[id] || 0) + 1;
  return counts;
}

/**
 * Land the RTP target by adjusting how often symbols appear, leaving the
 * published paytable untouched.
 *
 * This is the real tuning loop of slot design. Once the paytable is a round,
 * signed-off document, the only remaining freedom is reel composition — so the
 * build moves single strip positions between symbols and keeps whichever move
 * takes the return closest to target.
 *
 * It is a *greedy search over measured RTP*, not a bisection, and that matters:
 * the return surface over symbol frequencies is not monotone (making premiums
 * rarer makes low symbols commoner, and their own five-of-a-kind pays enough to
 * push return back up), so a bisection over it would converge on the wrong
 * root. Evaluating each candidate move directly sidesteps the problem entirely.
 *
 * Moves apply to every reel at once, which keeps the candidate set small enough
 * to evaluate exhaustively each round while preserving the per-reel weighting
 * the volatility profile established.
 *
 * @param {object} args
 * @param {object} args.model         model carrying the final paytable
 * @param {number} args.targetRtp
 * @param {string[]} args.donors      symbols that may lose a position
 * @param {string[]} args.recipients  symbols that may gain one
 * @param {object} args.stripOptions
 * @param {number} [args.tolerance]
 * @param {number} [args.maxRounds]
 * @returns {{model:object, achieved:number, moves:Array, rounds:number}}
 */
export function tuneFrequencies({
  model,
  targetRtp,
  donors,
  recipients,
  stripOptions,
  tolerance = 0.0008,
  maxRounds = 24,
}) {
  let counts = model.strips.map(stripCounts);
  let strips = model.strips;
  let achieved = computeRtp(model).rtp;
  const moves = [];

  const build = (nextCounts) =>
    nextCounts.map((c, reel) =>
      expandStrip(c, Object.values(c).reduce((a, b) => a + b, 0), {
        ...stripOptions,
        seed: reel + 1,
      }),
    );

  /**
   * Apply a move: shift one position from `from` to `to`, either on every reel
   * (coarse) or on a single reel (fine, roughly a fifth of the step). Returns
   * null when the move is not legal on the current composition.
   */
  const applyMove = (current, from, to, reel) => {
    const next = current.map((c, i) => {
      if (reel !== null && i !== reel) return { ...c };
      if (!c[from] || c[from] <= 1) return reel === null ? { ...c } : null;
      return { ...c, [from]: c[from] - 1, [to]: (c[to] || 0) + 1 };
    });
    if (next.some((c) => c === null)) return null;
    // An all-reel move that changed nothing is not a move.
    return next.some((c, i) => c[from] !== current[i][from]) ? next : null;
  };

  const evaluate = (candidate) => {
    try {
      return computeRtp({ ...model, strips: build(candidate) }).rtp;
    } catch {
      return null; // Violates a spacing constraint — not a usable composition.
    }
  };

  for (let round = 0; round < maxRounds; round++) {
    const currentError = Math.abs(achieved - targetRtp);
    if (currentError <= tolerance) break;

    // Coarse moves first; only fall back to per-reel moves when no whole-board
    // move gets closer, which is where the last fraction of a percent lives.
    const reelSets = [[null], model.strips.map((_, i) => i)];
    let best = null;

    for (const reels of reelSets) {
      for (const from of donors) {
        for (const to of recipients) {
          if (from === to) continue;
          for (const reel of reels) {
            const candidate = applyMove(counts, from, to, reel);
            if (!candidate) continue;
            const rtp = evaluate(candidate);
            if (rtp === null) continue;
            const error = Math.abs(rtp - targetRtp);
            if (!best || error < best.error) best = { from, to, reel, rtp, error, counts: candidate };
          }
        }
      }
      if (best && best.error < currentError) break; // Coarse phase sufficed.
    }

    if (!best || best.error >= currentError) break; // Nothing left that helps.

    counts = best.counts;
    strips = build(counts);
    achieved = best.rtp;
    moves.push({
      from: best.from,
      to: best.to,
      reel: best.reel,
      rtp: Number(best.rtp.toFixed(5)),
    });
  }

  return { model: { ...model, strips }, achieved, moves, rounds: moves.length };
}

// ═══════════════════════════════════════════════════════════
// MODEL ASSEMBLY
// ═══════════════════════════════════════════════════════════

/**
 * Assemble and calibrate a complete math model from a game's design spec.
 *
 * @param {object} spec
 * @param {number} spec.rows
 * @param {number} spec.paylineCount
 * @param {Array} spec.symbols          symbol definitions incl. design pays
 * @param {Array<Record<string,number>>} spec.reelWeights per-reel weights
 * @param {number} [spec.stripLength]
 * @param {number} [spec.freeSpinMultiplier]
 * @param {number} [spec.maxWinMultiplier]
 * @param {number} spec.targetRtp
 * @returns {{model:object, report:object}}
 */
export function buildMathModel(spec) {
  const {
    rows = 3,
    paylineCount,
    symbols,
    reelWeights,
    stripLength = DEFAULT_STRIP_LENGTH,
    freeSpinMultiplier = 1,
    maxWinMultiplier,
    targetRtp,
    /** Symbols the frequency tuner may move positions between. */
    tuning = {},
  } = spec;

  const wild = symbols.find((s) => s.kind === SYMBOL_KIND.WILD) || null;
  const scatterSymbol = symbols.find((s) => s.kind === SYMBOL_KIND.SCATTER) || null;

  const declared = new Set(symbols.map((s) => s.id));
  reelWeights.forEach((weights, reel) => {
    for (const id of Object.keys(weights)) {
      if (!declared.has(id)) {
        throw new Error(`Reel ${reel} weights reference unknown symbol "${id}"`);
      }
    }
  });

  const stripOptions = {
    spaceOut: [wild?.id, scatterSymbol?.id].filter(Boolean),
    minGap: rows,
  };

  const raw = {
    rows,
    paylines: paylines5x3(paylineCount),
    symbols,
    wild: wild ? { id: wild.id } : null,
    scatter: scatterSymbol
      ? {
          id: scatterSymbol.id,
          pays: scatterSymbol.scatterPays || {},
          freeSpins: scatterSymbol.freeSpins || {},
          retrigger: Boolean(scatterSymbol.retrigger),
        }
      : null,
    // Scatters and wilds are lattice-placed so neither can stack within one
    // visible window; everything else is shuffled per reel.
    strips: buildStrips(reelWeights, stripLength, stripOptions),
    freeSpinMultiplier,
    maxWinMultiplier,
  };

  // ── Stage 1: price the paytable onto the target, then round it to the
  //    two-significant-figure values a designer would actually publish.
  const { model: priced, scale, design, passes } = calibratePaytable(raw, targetRtp);
  const published = mapPaytable(priced, (v) => significantRound(v, 2));

  // ── Stage 2: recover the RTP that rounding cost, through reel frequencies.
  const donors = tuning.donors ?? [];
  const recipients = tuning.recipients ?? [];
  const tuned =
    donors.length && recipients.length
      ? tuneFrequencies({ model: published, targetRtp, donors, recipients, stripOptions })
      : { model: published, achieved: computeRtp(published).rtp, moves: [], rounds: 0 };

  return {
    model: Object.freeze(tuned.model),
    report: {
      targetRtp,
      achievedRtp: tuned.achieved,
      designRtp: design,
      payScale: scale,
      pricingPasses: passes,
      roundedRtp: computeRtp(published).rtp,
      tuningMoves: tuned.moves.length,
    },
  };
}

export default {
  DEFAULT_STRIP_LENGTH,
  PAYLINES_5x3,
  paylines5x3,
  expandStrip,
  buildStrips,
  calibratePaytable,
  buildMathModel,
};
