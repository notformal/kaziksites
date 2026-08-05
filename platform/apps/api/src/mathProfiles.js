// Калиброванные математические профили игр. Здесь и только здесь живут числа,
// определяющие RTP: любое изменение баланса делается тут, проверяется
// `node scripts/qa/rtp-sim.mjs` и обязано оставаться в коридоре
// «казино в плюсе, но игрок выигрывает достаточно часто».
//
// Целевой коридор: преимущество казино 1–8%, регулярные мелкие выигрыши,
// редкий крупный приз, который держит интерес.

/** Целевой RTP по умолчанию для новых профилей. */
export const TARGET_RTP = 0.96;

/**
 * Plinko: 8 рядов колышков → 9 корзин с биномиальным распределением
 * C(8,k)/256 = [1,8,28,56,70,56,28,8,1]/256. Раньше корзина выбиралась
 * равномерно, из-за чего RTP составлял 310% и казино теряло на каждой ставке.
 */
export const PLINKO = {
  rows: 8,
  weights: [1, 8, 28, 56, 70, 56, 28, 8, 1],
  multipliersMilli: [29000, 3000, 1200, 500, 280, 500, 1200, 3000, 29000],
};

/**
 * Классический слот (kind "slot"): пять уровней исхода. Веса подобраны под
 * RTP ≈ 96% при множителях [0, 1.5, 2.5, 10, 50]; выигрышный спин — примерно
 * каждый третий, джекпот 50× — раз в ~250 спинов.
 */
export const CLASSIC_SLOT = {
  lossWeight: 6827,
  smallWeight: 1733,
  mediumWeight: 1200,
  largeWeight: 200,
  jackpotWeight: 40,
  multipliersMilli: [0, 1500, 2500, 10000, 50000],
};

/**
 * Кено: таблица получена `node scripts/build-keno-table.mjs --rtp 0.94`
 * (точное гипергеометрическое распределение). Индекс — число попаданий.
 */
export const KENO_PAYTABLE = {
  1: [0, 3.8],
  2: [0, 1.6, 5.3],
  3: [0, 0, 5.1, 16],
  4: [0, 0, 2.5, 7.9, 25],
  5: [0, 0, 1.4, 4.4, 14, 45],
  6: [0, 0, 0, 3.7, 12, 37, 120],
  7: [0, 0, 0, 2.1, 6.6, 21, 67, 216],
  8: [0, 0, 0, 1.2, 4, 13, 41, 130, 416],
  9: [0, 0, 0, 0.8, 2.5, 8, 26, 82, 261, 837],
  10: [0, 0, 0, 0, 1.9, 6, 19, 62, 198, 633, 2024],
};

/** Колесо: 10 равных секторов, средний множитель 0.96. */
export const WHEEL_SEGMENTS_MILLI = [0, 1500, 0, 1800, 0, 1500, 0, 2600, 0, 2200];

/** Sic Bo: выплаты (в милли-множителях ставки). */
export const SICBO_PAYOUTS_MILLI = {
  smallBig: 1950,
  anyTriple: 30000,
  specificTriple: 180000,
  singlePerMatch: 1000,
};

/** Баккара: банкир с комиссией 5%, ничья 8:1, ничья возвращает ставку. */
export const BACCARAT_PAYOUTS_MILLI = { player: 2000, banker: 1950, tie: 9000, push: 1000 };

/** Число колод в шузе баккары. */
export const BACCARAT_DECKS = 8;

/**
 * Равномерное целое [0, max) из хеша без modulo-bias.
 * Берём 16 бит на значение: смещение падает с ~1.5% (8 бит) до ~0.006%.
 */
export function uniformFromHash(hash, index, max) {
  const offset = (index * 4) % (hash.length - 4);
  const value = Number.parseInt(hash.slice(offset, offset + 4), 16);
  return Math.floor((value / 0x10000) * max);
}

/** Индекс из массива весов по числу [0,1). */
export function weightedIndex(weights, unit) {
  const total = weights.reduce((sum, w) => sum + w, 0);
  let point = unit * total;
  for (let i = 0; i < weights.length; i++) {
    point -= weights[i];
    if (point <= 0) return i;
  }
  return weights.length - 1;
}
