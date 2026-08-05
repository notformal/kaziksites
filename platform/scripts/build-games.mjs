// Собирает production-бандл каждой игры. Список воркспейсов берётся из
// config/games.config.json, поэтому новая игра подключается одной строкой в конфиге.
import { spawnSync } from "node:child_process";
import { GAME_BUNDLES, PLATFORM_ROOT } from "../config/index.mjs";

for (const bundle of GAME_BUNDLES) {
  // shell:true обязателен на Windows: с Node 20+ npm.cmd не запускается напрямую.
  const result = spawnSync("npm", ["run", "build", "-w", bundle.workspace], {
    cwd: PLATFORM_ROOT,
    stdio: "inherit",
    shell: true,
  });
  if (result.status !== 0) {
    console.error(`Сборка игры провалилась: ${bundle.workspace}`, result.error ?? "");
    process.exit(result.status ?? 1);
  }
}

console.log(`Игровых бандлов собрано: ${GAME_BUNDLES.length}`);
