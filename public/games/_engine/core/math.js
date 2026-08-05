/**
 * ═══════════════════════════════════════════════════════════
 * SLOT MATHEMATICS — pure, deterministic, environment-free.
 *
 * This module is the only place that decides what a spin is worth. It has no
 * DOM and no PIXI dependency, so the exact same code that pays a player in the
 * browser is what the simulator and the unit tests run in Node.
 *
 * The return-to-player of a game is a *property of its reel strips and
 * paytable*, computed here exactly — never a runtime fudge factor, never a
 * "make the house win" thumb on the scale. The house edge comes from the strip
 * composition, which is where a regulator would expect to find it.
 * ═══════════════════════════════════════════════════════════
 */

/** Symbol roles. */
export const SYMBOL_KIND = Object.freeze({
  NORMAL: 'normal',
  WILD: 'wild',
  SCATTER: 'scatter',
});

// ═══════════════════════════════════════════════════════════
// GRID CONSTRUCTION
// ═══════════════════════════════════════════════════════════

/**
 * Read the visible window off each reel strip for the given stop positions.
 * Strips are circular, so a stop near the end wraps to the start.
 *
 * @returns {string[][]} grid[column][row] — symbol ids
 */
export function buildGrid(model, stops) {
  const { rows, strips } = model;
  const grid = [];
  for (let col = 0; col < strips.length; col++) {
    const strip = strips[col];
    const stop = stops[col] % strip.length;
    const column = [];
    for (let row = 0; row < rows; row++) column.push(strip[(stop + row) % strip.length]);
    grid.push(column);
  }
  return grid;
}

/**
 * Random stop position per reel, drawn from the supplied uniform source.
 * 
 * Uses floor(random * length) directly — no modulo needed since random() 
 * returns [0,1), making floor always produce a valid index [0, length-1].
 * The redundant modulo was harmless but misleading about the intent.
 */
export function drawStops(model, random) {
  return model.strips.map((strip) => Math.floor(random() * strip.length));
}

// ═══════════════════════════════════════════════════════════
// LINE EVALUATION
// ═══════════════════════════════════════════════════════════

/** Index a model's symbol list by id, once, for hot-path lookups. */
export function indexSymbols(model) {
  const byId = new Map();
  for (const s of model.symbols) byId.set(s.id, s);
  return byId;
}

/**
 * Value of a single payline, in units of the *line bet*.
 *
 * Leftmost rule: a symbol pays when it occupies an unbroken run of reels
 * starting at reel 0. Wilds substitute for every symbol except the scatter. A
 * run made only of wilds pays as the wild if the wild has its own paytable, and
 * otherwise as whichever symbol scores highest — which is what taking the max
 * over all candidate symbols gives us for free.
 */
export function evaluateLine(lineSymbols, model, symbolIndex = indexSymbols(model)) {
  const wildId = model.wild?.id ?? null;
  let best = 0;
  let bestSymbol = null;
  let bestCount = 0;

  for (const candidate of model.symbols) {
    if (candidate.kind === SYMBOL_KIND.SCATTER) continue;
    if (!candidate.pays) continue;

    let run = 0;
    for (const id of lineSymbols) {
      if (id === candidate.id || (wildId !== null && id === wildId)) run++;
      else break;
    }

    const pay = candidate.pays[run] || 0;
    if (pay > best) {
      best = pay;
      bestSymbol = candidate.id;
      bestCount = run;
    }
  }

  return { pay: best, symbol: bestSymbol, count: bestCount };
}

/**
 * Evaluate a whole grid.
 *
 * Uses integer-centavo arithmetic internally to avoid floating-point drift:
 * all monetary values are scaled by 10000 (ten-thousandths of a unit) during
 * computation and divided back at the end. This eliminates the classic
 * 0.1 + 0.2 !== 0.3 problem that could accumulate over hundreds of paylines.
 *
 * @param {object} model    game math model
 * @param {string[][]} grid grid[column][row]
 * @param {number} totalBet stake for the round
 * @param {number} multiplier global multiplier (free-spin rounds pass > 1)
 * @returns {{totalWin:number, lineWins:Array, scatterCount:number,
 *            scatterWin:number, freeSpinsAwarded:number, multiplier:number}}
 */
export function evaluateGrid(model, grid, totalBet, multiplier = 1) {
  const symbolIndex = indexSymbols(model);
  
  // Use fixed-point arithmetic (10000ths) to avoid floating-point drift
  const SCALE = 10000;
  const scaledTotalBet = Math.round(totalBet * SCALE);
  const scaledMultiplier = Math.round(multiplier * SCALE);
  
  const lineWins = [];
  let totalWinScaled = 0;

  for (let i = 0; i < model.paylines.length; i++) {
    const path = model.paylines[i];
    const lineSymbols = path.map((row, col) => grid[col][row]);
    const { pay, symbol, count } = evaluateLine(lineSymbols, model, symbolIndex);
    if (pay <= 0) continue;

    // lineBet * pay * multiplier, all in scaled units
    const lineBetScaled = Math.round(scaledTotalBet / model.paylines.length);
    const amountScaled = Math.round((pay * lineBetScaled * scaledMultiplier) / SCALE);
    totalWinScaled += amountScaled;
    
    lineWins.push({
      line: i,
      path,
      symbol,
      count,
      amount: amountScaled / SCALE,
      positions: path.slice(0, count).map((row, col) => ({ col, row })),
    });
  }

  // ── Scatters pay from anywhere on the grid, in units of the total bet ──
  let scatterCount = 0;
  const scatterPositions = [];
  const scatterId = model.scatter?.id;
  if (scatterId) {
    for (let col = 0; col < grid.length; col++) {
      for (let row = 0; row < grid[col].length; row++) {
        if (grid[col][row] === scatterId) {
          scatterCount++;
          scatterPositions.push({ col, row });
        }
      }
    }
  }

  const scatterWinScaled = Math.round(
    ((model.scatter?.pays?.[scatterCount] || 0) * scaledTotalBet * scaledMultiplier) / SCALE
  );
  totalWinScaled += scatterWinScaled;

  const freeSpinsAwarded = model.scatter?.freeSpins?.[scatterCount] || 0;

  // Round-level cap. Reached only by pathological configurations, but a payout
  // ceiling is a licensing requirement, so it is enforced in the maths, not the UI.
  const capScaled = Math.round((model.maxWinMultiplier ?? Infinity) * scaledTotalBet);
  const cappedScaled = Math.min(totalWinScaled, capScaled);

  return {
    totalWin: cappedScaled / SCALE,
    cappedAt: cappedScaled < totalWinScaled ? capScaled / SCALE : null,
    lineWins,
    scatterCount,
    scatterPositions,
    scatterWin: scatterWinScaled / SCALE,
    freeSpinsAwarded,
    multiplier,
  };
}

// ═══════════════════════════════════════════════════════════
// EXACT RETURN ANALYSIS
//
// Because every reel stops independently and uniformly, the symbol on a given
// payline position is distributed exactly as that reel's strip composition.
// That makes the line return exactly enumerable rather than merely estimable.
// ═══════════════════════════════════════════════════════════

/** Per-reel symbol probability vector, straight from strip composition. */
export function stripDistributions(model) {
  return model.strips.map((strip) => {
    const counts = new Map();
    for (const id of strip) counts.set(id, (counts.get(id) || 0) + 1);
    const dist = new Map();
    for (const [id, n] of counts) dist.set(id, n / strip.length);
    return dist;
  });
}

/**
 * Exact expected line return per spin, in units of the total bet.
 *
 * Every payline shares the same distribution (one row per reel, and the row
 * choice does not change a reel's marginal), so one enumeration covers them
 * all: the per-line expectation in line-bet units *is* the total-bet return.
 */
export function exactLineReturn(model) {
  const dists = stripDistributions(model);
  const symbolIndex = indexSymbols(model);
  const alphabets = dists.map((d) => [...d.entries()]);

  let expected = 0;
  const line = new Array(model.strips.length);

  const walk = (col, probability) => {
    if (probability === 0) return;
    if (col === alphabets.length) {
      const { pay } = evaluateLine(line, model, symbolIndex);
      if (pay > 0) expected += probability * pay;
      return;
    }
    for (const [id, p] of alphabets[col]) {
      line[col] = id;
      walk(col + 1, probability * p);
    }
  };
  walk(0, 1);

  return expected;
}

/**
 * Exact distribution of the number of scatters visible on the whole grid.
 *
 * Within one reel the visible cells are consecutive strip positions, so they
 * are *not* independent — we enumerate that reel's windows directly — and then
 * convolve across reels, which genuinely are independent.
 */
export function exactScatterDistribution(model) {
  const scatterId = model.scatter?.id;
  if (!scatterId) return [1];

  const perReel = model.strips.map((strip) => {
    const counts = new Array(model.rows + 1).fill(0);
    for (let stop = 0; stop < strip.length; stop++) {
      let n = 0;
      for (let row = 0; row < model.rows; row++) {
        if (strip[(stop + row) % strip.length] === scatterId) n++;
      }
      counts[n]++;
    }
    return counts.map((c) => c / strip.length);
  });

  let dist = [1];
  for (const reel of perReel) {
    const next = new Array(dist.length + reel.length - 1).fill(0);
    for (let i = 0; i < dist.length; i++) {
      if (dist[i] === 0) continue;
      for (let j = 0; j < reel.length; j++) {
        if (reel[j] === 0) continue;
        next[i + j] += dist[i] * reel[j];
      }
    }
    dist = next;
  }
  return dist;
}

/** Exact expected scatter pay per spin, in units of the total bet. */
export function exactScatterReturn(model) {
  const dist = exactScatterDistribution(model);
  let expected = 0;
  for (let k = 0; k < dist.length; k++) {
    expected += dist[k] * (model.scatter?.pays?.[k] || 0);
  }
  return expected;
}

/**
 * Expected number of free spins awarded per *base* spin.
 *
 * When retriggers are enabled a free spin can award more free spins on the same
 * reels, so the total is the sum of a geometric series rather than a single
 * award. `a` is the per-spin award expectation; the series converges as long as
 * a < 1, which any sane configuration satisfies by a wide margin.
 */
export function expectedFreeSpins(model) {
  const dist = exactScatterDistribution(model);
  let a = 0;
  for (let k = 0; k < dist.length; k++) {
    a += dist[k] * (model.scatter?.freeSpins?.[k] || 0);
  }
  if (!model.scatter?.retrigger) return { perBaseSpin: a, awardRate: a };
  if (a >= 1) {
    throw new Error(
      `Free-spin retrigger diverges (award expectation ${a.toFixed(3)} ≥ 1). ` +
        'Reduce scatter frequency or the award table.',
    );
  }
  return { perBaseSpin: a / (1 - a), awardRate: a };
}

/**
 * Exact theoretical RTP, decomposed by source.
 *
 * @returns {{rtp:number, base:number, lines:number, scatters:number,
 *            freeSpins:number, expectedFreeSpins:number}}
 */
export function computeRtp(model) {
  const lines = exactLineReturn(model);
  const scatters = exactScatterReturn(model);
  const base = lines + scatters;
  const { perBaseSpin } = expectedFreeSpins(model);
  const multiplier = model.freeSpinMultiplier ?? 1;
  const freeSpins = perBaseSpin * base * multiplier;

  return {
    rtp: base + freeSpins,
    base,
    lines,
    scatters,
    freeSpins,
    expectedFreeSpins: perBaseSpin,
  };
}

// ═══════════════════════════════════════════════════════════
// SIMULATION — for the statistics exact analysis cannot give cheaply
// (hit frequency across dependent paylines, variance, max observed win)
// ═══════════════════════════════════════════════════════════

/**
 * Play `rounds` complete rounds (base spin plus any free-spin sequence it
 * triggers) and report the empirical profile.
 *
 * @param {object} model
 * @param {number} rounds
 * @param {() => number} random uniform [0,1) source
 */
export function simulate(model, rounds, random = Math.random) {
  const bet = 1;
  let staked = 0;
  let returned = 0;
  let hits = 0;
  let bonusRounds = 0;
  let maxWin = 0;
  let sumSq = 0;

  for (let i = 0; i < rounds; i++) {
    staked += bet;
    let roundWin = 0;

    const spin = evaluateGrid(model, buildGrid(model, drawStops(model, random)), bet, 1);
    roundWin += spin.totalWin;

    let pending = spin.freeSpinsAwarded;
    if (pending > 0) bonusRounds++;
    const fsMultiplier = model.freeSpinMultiplier ?? 1;
    let guard = 0;
    while (pending > 0 && guard++ < 10000) {
      pending--;
      const fs = evaluateGrid(model, buildGrid(model, drawStops(model, random)), bet, fsMultiplier);
      roundWin += fs.totalWin;
      if (model.scatter?.retrigger) pending += fs.freeSpinsAwarded;
    }

    returned += roundWin;
    if (roundWin > 0) hits++;
    if (roundWin > maxWin) maxWin = roundWin;
    sumSq += (roundWin / bet) ** 2;
  }

  const rtp = returned / staked;
  const meanReturn = returned / rounds;
  const variance = sumSq / rounds - meanReturn ** 2;

  return {
    rounds,
    rtp,
    hitFrequency: hits / rounds,
    bonusFrequency: bonusRounds / rounds,
    maxWinMultiplier: maxWin / bet,
    /** Standard deviation of round return in stake units — the industry's volatility index. */
    volatilityIndex: Math.sqrt(Math.max(0, variance)),
  };
}

export default {
  SYMBOL_KIND,
  buildGrid,
  drawStops,
  evaluateLine,
  evaluateGrid,
  stripDistributions,
  exactLineReturn,
  exactScatterDistribution,
  exactScatterReturn,
  expectedFreeSpins,
  computeRtp,
  simulate,
};
