// Раскладывает общие модули SDK по играм и следит, чтобы build.mjs каждой игры
// их копировал в dist. Игры собираются копированием файлов (без бандлера), поэтому
// единственный способ иметь один источник — синхронизировать его этим скриптом.
import { copyFile, readFile, writeFile, access } from "node:fs/promises";
import path from "node:path";
import { GAME_BUNDLES, resolveFromRoot } from "../config/index.mjs";

// Файлы, которые должны быть одинаковыми во всех играх: протокольный i18n и
// дизайн-система (токены, каркас, эффекты, звук).
const SHARED = [
  { from: "packages/game-sdk/src/i18n.js", to: "i18n.js" },
  { from: "packages/game-ui/src/symbols.mjs", to: "ui-symbols.js" },
  { from: "packages/game-ui/src/tokens.css", to: "ui-tokens.css" },
  { from: "packages/game-ui/src/shell.css", to: "ui-shell.css" },
  { from: "packages/game-ui/src/fx.js", to: "ui-fx.js" },
  { from: "packages/game-ui/src/audio.js", to: "ui-audio.js" },
];

let copied = 0,
  patched = 0;

for (const bundle of GAME_BUNDLES) {
  const dir = resolveFromRoot(bundle.dir);
  const buildScript = path.join(dir, "build.mjs");
  try {
    await access(buildScript);
  } catch {
    continue; // игра со своим бандлером (webpack) — общие файлы ей не копируем
  }
  for (const file of SHARED) {
    await copyFile(resolveFromRoot(file.from), path.join(dir, file.to));
    copied++;
  }
  const source = await readFile(buildScript, "utf8");
  let next = source;
  for (const file of SHARED) {
    if (!next.includes(`'${file.to}'`)) {
      next = next.replace("'sdk.js'", `'sdk.js','${file.to}'`);
    }
  }
  // Тема и арт генерируются под каждую игру отдельно — их тоже нужно нести в dist.
  if (!next.includes("theme.generated.css")) {
    next = next.replace("'sdk.js'", "'sdk.js','theme.generated.css'");
  }
  if (!next.includes("'art'")) {
    next = next.replace(
      "await cp(f,`dist/${f}`)",
      "await cp(f,`dist/${f}`);await cp('art','dist/art',{recursive:true,force:true}).catch(()=>{})",
    );
  }
  if (next !== source) {
    await writeFile(buildScript, next);
    patched++;
  }
}

console.log(`Общих модулей скопировано: ${copied}, build-скриптов обновлено: ${patched}`);
