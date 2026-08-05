// Копирует production-бандл каждой игры в public-директорию лобби, чтобы vite
// разложил их во все брендовые сборки и чтобы dev-сервер отдавал те же пути.
// Список игр берётся из config/games.config.json — здесь ничего не захардкожено.
import { cp, mkdir, rm, access } from "node:fs/promises";
import path from "node:path";
import { GAME_BUNDLES, platformConfig, resolveFromRoot } from "../config/index.mjs";

const destinationRoot = resolveFromRoot(platformConfig.staticGamesDir);
const missing = [];
const staged = [];

await mkdir(destinationRoot, { recursive: true });

for (const bundle of GAME_BUNDLES) {
  const source = resolveFromRoot(bundle.dir, "dist");
  const destination = path.join(destinationRoot, bundle.slug);
  try {
    await access(path.join(source, "index.html"));
  } catch {
    missing.push(bundle.slug);
    continue;
  }
  await rm(destination, { recursive: true, force: true });
  await cp(source, destination, { recursive: true });
  staged.push(bundle.slug);
}

if (missing.length) {
  console.error(
    `Отсутствует production-сборка: ${missing.join(", ")}. Запустите "npm run build" в platform/.`,
  );
  process.exit(1);
}

console.log(
  `Игровых бандлов застейджено: ${staged.length}/${GAME_BUNDLES.length} → ${path.relative(process.cwd(), destinationRoot)}`,
);
