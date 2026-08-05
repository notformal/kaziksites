// Калибрует таблицы выплат слот-титулов под целевой RTP.
//
// Титулы генерировались с «на глаз» подобранными выплатами, из-за чего RTP гулял
// от 56% до 109%: половина игр обирала игрока, половина разоряла казино. Скрипт
// измеряет фактический RTP той же функцией outcome(), что работает в проде,
// масштабирует выплаты и повторяет, пока каждый титул не попадёт в коридор.
//
//   node scripts/calibrate-slot-math.mjs [--rtp 0.955] [--spins 40000] [--tolerance 0.006]
import { readdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { outcome } from "../apps/api/src/provablyFair.js";
import { resolveFromRoot } from "../config/index.mjs";

const args = Object.fromEntries(
  process.argv.slice(2).join(" ").split("--").filter(Boolean)
    .map((c) => c.trim().split(/\s+/)).map(([k, v]) => [k, v ?? "true"]),
);
const TARGET = Number(args.rtp || 0.955);
const SPINS = Number(args.spins || 40000);
const TOLERANCE = Number(args.tolerance || 0.006);
const MAX_PASSES = 6;

const titlesDir = resolveFromRoot("games/slots-studio/titles");
const files = (await readdir(titlesDir)).filter((f) => /^slot-original-\d+\.json$/.test(f)).sort();

/** RTP титула по фиксированному сиду — сравнимо между проходами. */
function measure(title) {
  const math = {
    symbols: title.symbols.map(({ id, kind }) => ({ id, kind })),
    weights: title.mathProfile.weights,
    paytable: title.paytable,
    lines: title.lines,
    bonus: title.mathProfile.bonus,
  };
  let returned = 0;
  for (let nonce = 0; nonce < SPINS; nonce++) {
    returned += outcome({
      serverSeed: "c0ffee".repeat(10) + "abcd",
      clientSeed: `calibrate-${title.id}`,
      nonce,
      gameId: title.id,
      kind: "slot",
      math,
    }).multiplierMilli / 1000;
  }
  return returned / SPINS;
}

/** Масштабирует выплаты, сохраняя форму таблицы и целые значения. */
function scalePaytable(paytable, factor) {
  return Object.fromEntries(
    Object.entries(paytable).map(([symbol, row]) => [
      symbol,
      row.map((value) => (value === 0 ? 0 : Math.max(1, Math.round(value * factor)))),
    ]),
  );
}

const report = [];
for (const file of files) {
  const filePath = path.join(titlesDir, file);
  const title = JSON.parse(await readFile(filePath, "utf8"));
  const before = measure(title);
  let rtp = before;
  for (let pass = 0; pass < MAX_PASSES && Math.abs(rtp - TARGET) > TOLERANCE; pass++) {
    if (rtp <= 0) break;
    title.paytable = scalePaytable(title.paytable, TARGET / rtp);
    rtp = measure(title);
  }
  title.mathProfile.measuredRtp = Number(rtp.toFixed(4));
  title.mathProfile.version = "1.1.0";
  await writeFile(filePath, `${JSON.stringify(title, null, 2)}\n`);
  report.push({ id: title.id, before, after: rtp });
  console.log(
    `${title.id}: ${(before * 100).toFixed(2)}% → ${(rtp * 100).toFixed(2)}%`,
  );
}

// index.json — агрегат манифестов, из которого генерируется серверная математика.
// Без его перезаписи калибровка осталась бы только в отдельных файлах.
const manifests = [];
for (const file of files) manifests.push(JSON.parse(await readFile(path.join(titlesDir, file), "utf8")));
await writeFile(path.join(titlesDir, "index.json"), `${JSON.stringify(manifests, null, 2)}\n`);

const after = report.map((r) => r.after).sort((a, b) => a - b);
const pct = (v) => `${(v * 100).toFixed(2)}%`;
console.log(
  `\nТитулов: ${report.length}. RTP после калибровки: min ${pct(after[0])}, медиана ${pct(after[Math.floor(after.length / 2)])}, max ${pct(after.at(-1))}`,
);
const outliers = report.filter((r) => Math.abs(r.after - TARGET) > TOLERANCE * 2);
if (outliers.length) {
  console.log(`Не уложились в коридор: ${outliers.map((o) => `${o.id} (${pct(o.after)})`).join(", ")}`);
  process.exitCode = 1;
}
