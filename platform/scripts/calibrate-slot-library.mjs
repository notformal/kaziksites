// Калибрует payoutScale премиум-профилей apps/api/src/slotLibrary.js под их
// targetRtp методом Монте-Карло.
//
// Нужна после любого изменения лент, весов или таблиц выплат: RTP зависит от
// соседства символов на ленте, а не только от их частоты, поэтому «на глаз»
// его подобрать нельзя.
//
//   node scripts/calibrate-slot-library.mjs [--rounds 200000] [--passes 4]
import { readFile, writeFile } from "node:fs/promises";
import { computeRTP } from "../apps/api/src/slotEngine.js";
import { SLOT_LIBRARY } from "../apps/api/src/slotLibrary.js";
import { resolveFromRoot } from "../config/index.mjs";

const args = Object.fromEntries(
  process.argv.slice(2).join(" ").split("--").filter(Boolean)
    .map((c) => c.trim().split(/\s+/)).map(([k, v]) => [k, v ?? "true"]),
);
const ROUNDS = Number(args.rounds || 200000);
const PASSES = Number(args.passes || 4);
const SEEDS = [7, 11, 13, 29];
const TOLERANCE = 0.004;

/** Быстрый сид-PRNG — тот же, что в тестах движка. */
function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Средний RTP по нескольким сидам — гасит дисперсию одиночного прогона. */
const measure = (def) =>
  SEEDS.reduce((sum, seed) => sum + computeRTP(def, ROUNDS, mulberry32(seed)) / def.betUnits, 0) / SEEDS.length;

const file = resolveFromRoot("apps/api/src/slotLibrary.js");
let source = await readFile(file, "utf8");
const report = [];

for (const def of SLOT_LIBRARY) {
  const before = measure(def);
  let rtp = before;
  // Выплаты линейны по payoutScale, но округления и потолки каскадов вносят
  // нелинейность — поэтому уточняем в несколько проходов.
  for (let pass = 0; pass < PASSES && Math.abs(rtp - def.targetRtp) > TOLERANCE; pass++) {
    def.payoutScale = Number((def.payoutScale * (def.targetRtp / rtp)).toFixed(6));
    rtp = measure(def);
  }
  const pattern = new RegExp(`(id: "${def.id}"[\\s\\S]*?payoutScale: )([0-9.]+)`);
  if (!pattern.test(source)) {
    console.error(`${def.id}: не нашёл payoutScale в исходнике`);
    process.exitCode = 1;
    continue;
  }
  source = source.replace(pattern, `$1${def.payoutScale}`);
  report.push({ id: def.id, before, after: rtp, scale: def.payoutScale });
  console.log(
    `${def.id}: ${(before * 100).toFixed(2)}% → ${(rtp * 100).toFixed(2)}% (цель ${(def.targetRtp * 100).toFixed(1)}%), payoutScale ${def.payoutScale}`,
  );
}

await writeFile(file, source);
const off = report.filter((r) => Math.abs(r.after - SLOT_LIBRARY.find((d) => d.id === r.id).targetRtp) > TOLERANCE * 2);
if (off.length) {
  console.error(`Не сошлись: ${off.map((o) => o.id).join(", ")}`);
  process.exitCode = 1;
} else {
  console.log("\nВсе профили в допуске. Обновите витрину: node scripts/generate-game-art.mjs --game slots-premium");
}
