// Поднимает локальный стенд целиком: in-memory API + по статическому origin на каждый бренд.
// Порты и список брендов берутся из config/games.config.json.
import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import path from "node:path";
import { BRANDS, LOCAL_PREVIEW, resolveFromRoot, PLATFORM_ROOT } from "../config/index.mjs";

const { host, apiPort, brandPorts } = LOCAL_PREVIEW;
const children = [];

function start(name, command, args, env) {
  const child = spawn(command, args, {
    cwd: PLATFORM_ROOT,
    env: { ...process.env, ...env },
    stdio: ["ignore", "pipe", "pipe"],
  });
  const prefix = (stream) => (chunk) =>
    String(chunk)
      .split("\n")
      .filter(Boolean)
      .forEach((line) => stream(`[${name}] ${line}`));
  child.stdout.on("data", prefix(console.log));
  child.stderr.on("data", prefix(console.error));
  child.on("exit", (code) => console.log(`[${name}] завершился с кодом ${code}`));
  children.push(child);
  return child;
}

const origins = BRANDS.map(({ id }) => `http://${host}:${brandPorts[id]}`);

start("api", process.execPath, [resolveFromRoot("apps/api/src/memory.js")], {
  PORT: String(apiPort),
  ALLOWED_ORIGINS: origins.join(","),
  GLOBAL_RATE_LIMIT: String(LOCAL_PREVIEW.apiRateLimit ?? 300),
});

for (const brand of BRANDS) {
  const root = resolveFromRoot("apps/lobby/dist", brand.id);
  if (!existsSync(path.join(root, "index.html"))) {
    console.error(`Нет сборки бренда ${brand.id} — запустите "npm run build:brands".`);
    process.exit(1);
  }
  start(brand.id, process.execPath, [resolveFromRoot("scripts/native/static-server.mjs")], {
    STATIC_ROOT: root,
    STATIC_PORT: String(brandPorts[brand.id]),
    STATIC_ROLE: "lobby",
    API_PROXY_ORIGIN: `http://${host}:${apiPort}`,
  });
}

console.log("\n=== Локальный стенд ===");
console.log(`API      http://${host}:${apiPort}`);
for (const brand of BRANDS)
  console.log(`${brand.name.padEnd(14)} http://${host}:${brandPorts[brand.id]}/`);
console.log("");

const stop = () => {
  children.forEach((child) => child.kill());
  process.exit(0);
};
process.on("SIGINT", stop);
process.on("SIGTERM", stop);
