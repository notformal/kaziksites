// Reusable, data-driven slot mechanics engine — our own "base" for building slots.
//
// Pure + deterministic given an `rng` (a `() => float in [0,1)`), so it is:
//   • provably-fair compatible  — wire `rng` to an HMAC byte stream (makeHmacRng),
//   • fully testable            — inject a seeded PRNG for Monte-Carlo RTP checks,
//   • transport-agnostic        — no I/O, no globals, no Date/Math.random.
//
// Supported mechanics (opt-in per definition):
//   • reel-strip grids (symbol frequency + adjacency come from the strips),
//   • fixed paylines OR ways-to-win (243/1024) evaluation,
//   • wild substitution (+ optional wild win multiplier),
//   • scatter pays and scatter-triggered free spins (with a spin multiplier),
//   • cascading / tumbling reels with a per-step win multiplier ladder.
//
// A SlotDef:
// {
//   id, cols, rows,
//   reels:      [[symbolId, …] × cols],     // reel strips; repetition = weight
//   paytable:   { symbolId: { 3:x, 4:y, 5:z } },  // payout (× line/total bet) by match count
//   wild, scatter,                          // symbol ids or null
//   mode:       'lines' | 'ways',
//   paylines:   [[rowPerCol], …],           // required for 'lines'
//   wildMultiplier?: n,                      // multiply a line/way win that used a wild
//   scatterPays?: { 3:x, 4:y, 5:z },        // × total bet, added on top
//   freeSpins?: { trigger:3, count:10, multiplier:2, retrigger?:false },
//   cascade?:   true, cascadeLadder?: [1,2,3,5],  // multiplier per cascade step (clamped)
// }
import crypto from "node:crypto";

const clampIndex = (arr, i) => arr[Math.min(i, arr.length - 1)];

// ---- Provably-fair RNG: a float stream derived from an HMAC keyed by the server
// seed. Deterministic given (serverSeed, clientSeed, nonce) so a spin is verifiable.
export function makeHmacRng(serverSeed, clientSeed, nonce) {
  let counter = 0, block = Buffer.alloc(0), offset = 0;
  const refill = () => {
    block = crypto.createHmac("sha256", serverSeed).update(`${clientSeed}:${nonce}:${counter++}`).digest();
    offset = 0;
  };
  return () => {
    if (offset + 4 > block.length) refill();
    const v = block.readUInt32BE(offset);
    offset += 4;
    return v / 0x100000000; // [0,1)
  };
}

// Build the visible grid[col][row] by spinning each reel to a random stop.
export function spinGrid(def, rng) {
  const grid = [];
  for (let c = 0; c < def.cols; c++) {
    const reel = def.reels[c];
    const stop = Math.floor(rng() * reel.length);
    const col = [];
    for (let r = 0; r < def.rows; r++) col.push(reel[(stop + r) % reel.length]);
    grid.push(col);
  }
  return grid;
}

// Refill a grid after a cascade: `keep[col]` is the list of surviving symbols
// (top-anchored); the gaps at the bottom are filled from fresh reel draws.
function refillGrid(def, keep, rng) {
  const grid = [];
  for (let c = 0; c < def.cols; c++) {
    const survivors = keep[c];
    const need = def.rows - survivors.length;
    const reel = def.reels[c];
    const stop = Math.floor(rng() * reel.length);
    const fresh = [];
    for (let r = 0; r < need; r++) fresh.push(reel[(stop + r) % reel.length]);
    grid.push([...fresh, ...survivors]); // new symbols drop in from the top
  }
  return grid;
}

const isWild = (def, id) => id === def.wild;
const isScatter = (def, id) => id === def.scatter;

// Evaluate one spin's grid (no cascade/free-spins) → { win, hits } where each hit
// carries the winning cells so the client can animate and the cascade can remove them.
export function evaluateGrid(def, grid) {
  const scale = def.payoutScale ?? 1; // single knob to tune paytable shape → target RTP
  const hits = [];
  if (def.mode === "ways") {
    // Ways-to-win: for each payable symbol, multiply the count of that symbol
    // (or a wild) across consecutive columns from the left; needs ≥3 columns.
    for (const sym of Object.keys(def.paytable)) {
      let ways = 1, run = 0;
      const cells = [];
      for (let c = 0; c < def.cols; c++) {
        const matches = [];
        for (let r = 0; r < def.rows; r++) {
          const id = grid[c][r];
          if (id === sym || isWild(def, id)) matches.push(r);
        }
        if (!matches.length) break;
        ways *= matches.length;
        run++;
        cells.push(...matches.map((r) => [c, r]));
      }
      const pay = def.paytable[sym][run];
      if (run >= 3 && pay) {
        const usedWild = cells.some(([c, r]) => isWild(def, grid[c][r]));
        hits.push({ symbol: sym, count: run, ways, win: pay * ways * (usedWild ? def.wildMultiplier || 1 : 1) * scale, cells });
      }
    }
  } else {
    // Fixed paylines: consecutive matches from the leftmost reel, wild-substituted.
    for (const [lineIndex, line] of def.paylines.entries()) {
      const ids = line.map((row, col) => grid[col][row]);
      const base = ids.find((id) => !isWild(def, id) && !isScatter(def, id));
      if (base === undefined) continue;
      let count = 0;
      const cells = [];
      for (let c = 0; c < def.cols; c++) {
        const id = ids[c];
        if (id === base || isWild(def, id)) {
          count++;
          cells.push([c, line[c]]);
        } else break;
      }
      const pay = def.paytable[base]?.[count];
      if (pay) {
        const usedWild = cells.some(([c, r]) => isWild(def, grid[c][r]));
        hits.push({ line: lineIndex, symbol: base, count, win: pay * (usedWild ? def.wildMultiplier || 1 : 1) * scale, cells });
      }
    }
  }
  const win = hits.reduce((n, h) => n + h.win, 0);
  return { win, hits };
}

function countScatters(def, grid) {
  if (!def.scatter) return 0;
  let n = 0;
  for (let c = 0; c < def.cols; c++) for (let r = 0; r < def.rows; r++) if (isScatter(def, grid[c][r])) n++;
  return n;
}

// Resolve a single base spin, including cascades. Returns the win (× bet units),
// the sequence of grids, and the scatter count (for free-spin triggering).
function resolveSpin(def, rng, spinMultiplier = 1) {
  let grid = spinGrid(def, rng);
  const scatters = countScatters(def, grid);
  const grids = [grid];
  let total = 0, step = 0;
  for (;;) {
    const { win, hits } = evaluateGrid(def, grid);
    const stepMult = def.cascade ? clampIndex(def.cascadeLadder || [1], step) : 1;
    total += win * stepMult;
    if (!def.cascade || !hits.length) break;
    // Remove winning cells; drop survivors down; refill from the top.
    const winning = new Set(hits.flatMap((h) => h.cells.map(([c, r]) => `${c},${r}`)));
    const keep = grid.map((col, c) => col.filter((_, r) => !winning.has(`${c},${r}`)));
    grid = refillGrid(def, keep, rng);
    grids.push(grid);
    step++;
    if (step > 50) break; // safety: never loop forever
  }
  // Scatter pays are flat (× total bet), independent of lines.
  const scatterPay = (def.scatterPays?.[scatters] || 0) * (def.payoutScale ?? 1);
  return { win: total * spinMultiplier + scatterPay, scatters, grids };
}

// Full spin: base spin + any free-spin round it triggers. `win` is the total
// return in bet-multiple units (1.0 == staked amount returned).
export function spin(def, rng) {
  const base = resolveSpin(def, rng);
  const result = { grids: base.grids, baseWin: base.win, win: base.win, scatters: base.scatters, freeSpins: null };
  const fs = def.freeSpins;
  if (fs && base.scatters >= fs.trigger) {
    let awarded = fs.count, played = 0, fsWin = 0;
    const rounds = [];
    while (played < awarded && played < 500) {
      const r = resolveSpin(def, rng, fs.multiplier || 1);
      fsWin += r.win;
      rounds.push(r.win);
      if (fs.retrigger && r.scatters >= fs.trigger) awarded += fs.count;
      played++;
    }
    result.freeSpins = { count: fs.count, played, multiplier: fs.multiplier || 1, win: fsWin, rounds };
    result.win += fsWin;
  }
  return result;
}

// Monte-Carlo RTP: average total return per unit bet over N spins. Used to tune
// and to guard (a regression that breaks the math shows up as an RTP shift).
export function computeRTP(def, iterations, rng) {
  let sum = 0;
  for (let i = 0; i < iterations; i++) sum += spin(def, rng).win;
  return sum / iterations;
}
