// A library of worked-out slot math profiles built on slotEngine.js — our own
// reusable "base". Each profile targets a realistic RTP (verified by Monte-Carlo
// in slotEngine.test.js) and exercises a distinct mechanic, so new slots can be
// cloned from the closest archetype and re-tuned.
//
// Payout convention: all payouts are in LINE-BET units. Total bet = `betUnits`
// (number of paylines for 'lines' mode, 1 for 'ways'/cascade). RTP = E[win]/betUnits.

// Helper: expand a {symbol: weight} map into a reel strip, repeated per column.
//
// Порядок символов на ленте важен так же, как их частота: видимое окно — это
// `rows` ПОДРЯД идущих позиций. Несортированная лента (все "ten", потом все
// "jack", …) давала однородные колонки — на экране стояли вертикальные полосы
// одного символа, а соседство символов не имело ничего общего с их весами.
// Поэтому лента детерминированно перемешивается: частоты сохраняются, а
// соседство становится равномерным. Сид фиксирован — раскладка воспроизводима
// и одинакова у сервера и у любого аудита.
const stripRng = (seed) => () => {
  seed = (seed * 1664525 + 1013904223) >>> 0;
  return seed / 4294967296;
};

/** Фишер–Йетс на детерминированном потоке: тасует, не меняя состав ленты. */
const shuffled = (items, seed) => {
  const out = [...items];
  const rand = stripRng(seed);
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
};

const strip = (weights, seed) =>
  shuffled(Object.entries(weights).flatMap(([sym, w]) => Array(w).fill(sym)), seed);

// Каждая колонка получает СВОЙ сид: ленты барабанов не идентичны, как и в
// настоящем автомате, иначе все пять колонок останавливались бы синхронно.
const reels5 = (weights, seedBase = 1) =>
  Array.from({ length: 5 }, (_, col) => strip(weights, seedBase * 7919 + col * 104729));

// 10 standard paylines over a 5×3 grid (row index per column).
const LINES_10 = [
  [1, 1, 1, 1, 1], [0, 0, 0, 0, 0], [2, 2, 2, 2, 2],
  [0, 1, 2, 1, 0], [2, 1, 0, 1, 2], [0, 0, 1, 2, 2],
  [2, 2, 1, 0, 0], [1, 0, 1, 2, 1], [1, 2, 1, 0, 1], [0, 1, 1, 1, 2],
];

// ── 1) Classic 5×3, 10 lines, wild + scatter + free spins (low volatility) ──────
export const CLASSIC_LINES = {
  id: "classic-lines",
  name: "Royal Lines",
  cols: 5,
  rows: 3,
  mode: "lines",
  betUnits: 10,
  targetRtp: 0.95,
  payoutScale: 7.51566,
  paylines: LINES_10,
  wild: "wild",
  scatter: "scatter",
  wildMultiplier: 2,
  reels: reels5({ ten: 14, jack: 13, queen: 12, king: 10, ace: 9, ruby: 6, crown: 4, wild: 3, scatter: 3 }, 11),
  paytable: {
    ten: { 3: 0.4, 4: 1, 5: 3 },
    jack: { 3: 0.4, 4: 1, 5: 3 },
    queen: { 3: 0.6, 4: 1.5, 5: 5 },
    king: { 3: 0.8, 4: 2, 5: 7 },
    ace: { 3: 1, 4: 3, 5: 10 },
    ruby: { 3: 2, 4: 6, 5: 20 },
    crown: { 3: 4, 4: 12, 5: 50 },
  },
  scatterPays: { 3: 8, 4: 20, 5: 100 },
  freeSpins: { trigger: 3, count: 10, multiplier: 2 },
};

// ── 2) Ways-to-win 5×3 (243 ways), wild + scatter (medium volatility) ───────────
export const WAYS_243 = {
  id: "ways-243",
  name: "Gem Ways 243",
  cols: 5,
  rows: 3,
  mode: "ways",
  betUnits: 1,
  targetRtp: 0.955,
  payoutScale: 0.670049,
  wild: "wild",
  scatter: "scatter",
  wildMultiplier: 1,
  reels: reels5({ ten: 16, jack: 14, queen: 12, king: 11, ace: 9, ruby: 7, crown: 5, wild: 3, scatter: 3 }, 23),
  paytable: {
    ten: { 3: 0.15, 4: 0.4, 5: 1 },
    jack: { 3: 0.15, 4: 0.4, 5: 1 },
    queen: { 3: 0.25, 4: 0.6, 5: 1.5 },
    king: { 3: 0.3, 4: 0.8, 5: 2 },
    ace: { 3: 0.4, 4: 1, 5: 3 },
    ruby: { 3: 0.8, 4: 2, 5: 6 },
    crown: { 3: 1.5, 4: 5, 5: 15 },
  },
  scatterPays: { 3: 4, 4: 12, 5: 60 },
  freeSpins: { trigger: 3, count: 8, multiplier: 3 },
};

// ── 3) Cascading 5×5, ways, multiplier ladder (high volatility) ─────────────────
const reels5x5 = (weights, seedBase = 1) =>
  Array.from({ length: 5 }, (_, col) => strip(weights, seedBase * 7919 + col * 104729));
export const CASCADE = {
  id: "cascade-ways",
  name: "Tumble Peaks",
  cols: 5,
  rows: 5,
  mode: "ways",
  betUnits: 1,
  targetRtp: 0.955,
  payoutScale: 0.009305,
  wild: "wild",
  scatter: "scatter",
  wildMultiplier: 1,
  cascade: true,
  cascadeLadder: [1, 2, 3, 5, 8],
  reels: reels5x5({ ten: 20, jack: 18, queen: 16, king: 14, ace: 12, ruby: 9, crown: 6, wild: 3, scatter: 3 }, 37),
  // Поле 5×5 в режиме ways даёт слишком много крошечных комбинаций: сервер платит
  // floor(bet × multiplier), поэтому выигрыши мельче кредита исчезали (28% раундов
  // на ставке 10 подсвечивались, но не платили). Низкие символы платят с ЧЕТЫРЁХ,
  // а сами выплаты крупнее: реже, но всегда видимой суммой.
  paytable: {
    ten: { 4: 0.6, 5: 2 },
    jack: { 4: 0.6, 5: 2 },
    queen: { 4: 0.9, 5: 3 },
    king: { 4: 1.2, 5: 4 },
    ace: { 3: 0.5, 4: 1.8, 5: 6 },
    ruby: { 3: 1, 4: 3.5, 5: 12 },
    crown: { 3: 2, 4: 8, 5: 28 },
  },
  scatterPays: { 3: 3, 4: 10, 5: 40 },
  freeSpins: { trigger: 3, count: 8, multiplier: 2 },
};

export const SLOT_LIBRARY = [CLASSIC_LINES, WAYS_243, CASCADE];
