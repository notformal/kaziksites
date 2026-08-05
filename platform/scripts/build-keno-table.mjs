// Считает таблицу выплат кено под заданный RTP. Гипергеометрическое распределение
// точное, поэтому таблица получается математически обоснованной, а не подобранной
// на глаз. Результат вставляется в apps/api/src/mathProfiles.js.
//
//   node scripts/build-keno-table.mjs [--rtp 0.94]
const args = Object.fromEntries(
  process.argv.slice(2).join(" ").split("--").filter(Boolean)
    .map((c) => c.trim().split(/\s+/)).map(([k, v]) => [k, v ?? "true"]),
);
const TARGET_RTP = Number(args.rtp || 0.94);
const POOL = 80, DRAWN = 20, MAX_PICKS = 10;

const logFactorial = [0];
for (let i = 1; i <= POOL; i++) logFactorial[i] = logFactorial[i - 1] + Math.log(i);
const choose = (n, k) =>
  k < 0 || k > n ? 0 : Math.exp(logFactorial[n] - logFactorial[k] - logFactorial[n - k]);

/** P(ровно k совпадений при выборе picks чисел). */
const probability = (picks, k) =>
  (choose(DRAWN, k) * choose(POOL - DRAWN, picks - k)) / choose(POOL, picks);

const table = {};
for (let picks = 1; picks <= MAX_PICKS; picks++) {
  // Платим начиная с числа попаданий, которое встречается не чаще, чем в 45%
  // раундов: частые мелкие возвраты делают игру скучной, слишком редкие — злой.
  let from = picks;
  for (let k = picks; k >= 1; k--) {
    const tail = Array.from({ length: picks - k + 1 }, (_, i) => probability(picks, k + i)).reduce((a, b) => a + b, 0);
    if (tail > 0.45) break;
    from = k;
  }
  // Вес выплаты растёт геометрически с числом попаданий — крупный приз держит интерес.
  const weights = [];
  for (let k = from; k <= picks; k++) weights.push({ k, w: Math.pow(3.2, k - from) });
  const norm = weights.reduce((sum, { k, w }) => sum + w * probability(picks, k), 0);
  const row = Array.from({ length: picks + 1 }, () => 0);
  for (const { k, w } of weights) {
    const raw = (TARGET_RTP * w) / norm;
    row[k] = raw >= 10 ? Math.round(raw) : Math.round(raw * 10) / 10;
  }
  table[picks] = row;
}

// Отчёт: фактический RTP после округления множителей.
for (let picks = 1; picks <= MAX_PICKS; picks++) {
  const rtp = table[picks].reduce((sum, mult, k) => sum + mult * probability(picks, k), 0);
  console.log(`picks ${String(picks).padStart(2)}: RTP ${(rtp * 100).toFixed(2)}%  ${JSON.stringify(table[picks])}`);
}
console.log("\nexport const KENO_PAYTABLE = " + JSON.stringify(table) + ";");
