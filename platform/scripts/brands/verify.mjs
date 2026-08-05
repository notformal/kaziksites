import fs from "node:fs";
import path from "node:path";
import { BRANDS, GAME_BUNDLES, resolveFromRoot } from "../../config/index.mjs";

const root = resolveFromRoot("apps/lobby/dist");
let checked = 0;

for (const { id: brand, name } of BRANDS) {
  const directory = path.join(root, brand);
  const index = path.join(directory, "index.html");
  if (!fs.existsSync(index)) throw new Error(`Missing ${brand} bundle: ${index}`);
  const html = fs.readFileSync(index, "utf8");
  const assertions = [
    [`data-build-brand="${brand}"`, "HTML build marker"],
    [`name="casino-brand" content="${brand}"`, "brand metadata"],
    [`<title>${name} — Social Casino</title>`, "fixed title"],
    ['<div id="root"></div>', "application root"],
  ];
  for (const [needle, label] of assertions) {
    if (!html.includes(needle)) throw new Error(`${brand}: missing ${label}`);
    checked++;
  }
  const assets = [...html.matchAll(/(?:src|href)="\.\/([^"#?]+)"/g)].map((match) => match[1]);
  for (const asset of assets) {
    if (!fs.existsSync(path.join(directory, asset)))
      throw new Error(`${brand}: missing asset ${asset}`);
    checked++;
  }
  const scripts = assets.filter((asset) => asset.endsWith(".js"));
  if (!scripts.length) throw new Error(`${brand}: no JavaScript entrypoint`);
  const javascript = scripts
    .map((asset) => fs.readFileSync(path.join(directory, asset), "utf8"))
    .join("\n");
  if (!javascript.includes(brand)) throw new Error(`${brand}: compiled brand identity is absent`);
  checked++;

  // Каждый серверный игровой бандл обязан присутствовать внутри брендовой сборки —
  // иначе iframe игры отдаст 404 уже в проде.
  for (const bundle of GAME_BUNDLES) {
    const entry = path.join(directory, "games", bundle.slug, "index.html");
    if (!fs.existsSync(entry)) throw new Error(`${brand}: missing game bundle ${bundle.slug}`);
    checked++;
  }
  console.log(`PASS ${brand}: ${path.relative(process.cwd(), directory)}`);
}
console.log(`Brand bundles verified: ${BRANDS.length}/${BRANDS.length} (${checked} checks)`);
