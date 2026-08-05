import EmbeddedPostgres from "embedded-postgres";
import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import http from "node:http";

const root = path.resolve(import.meta.dirname, "../..");
const runtime = path.join(root, ".runtime");
const logs = path.join(runtime, "logs");
const pids = path.join(runtime, "pids");
fs.mkdirSync(logs, { recursive: true });
fs.mkdirSync(pids, { recursive: true });
const env = process.env;
const pgPort = Number(env.NATIVE_PG_PORT || 55432);
const apiPort = Number(env.PORT || 8787);
const controlPort = Number(env.CONTROL_PORT || 8788);
const lobbyPort = Number(env.LOBBY_PORT || 8080);
const gamesPort = Number(env.GAMES_PORT || 8081);
const user = env.POSTGRES_USER || "casino";
const password = env.POSTGRES_PASSWORD;
const database = env.POSTGRES_DB || "casino";
const maxLogBytes = Number(env.LOG_MAX_BYTES || 10 * 1024 * 1024);
const logCopies = Math.max(1, Number(env.LOG_RETENTION_FILES || 5));
if (!password || password.length < 16) throw new Error("POSTGRES_PASSWORD must contain at least 16 characters");

function rotate(file) {
  try {
    if (!fs.existsSync(file) || fs.statSync(file).size < maxLogBytes) return;
    fs.rmSync(`${file}.${logCopies}`, { force: true });
    for (let i = logCopies - 1; i >= 1; i--) if (fs.existsSync(`${file}.${i}`)) fs.renameSync(`${file}.${i}`, `${file}.${i + 1}`);
    fs.renameSync(file, `${file}.1`);
  } catch (error) { console.error(`log rotation failed for ${file}: ${error.message}`); }
}
function writeLog(name, message) {
  const file = path.join(logs, `${name}.log`);
  rotate(file);
  fs.appendFileSync(file, `[${new Date().toISOString()}] ${String(message)}${String(message).endsWith("\n") ? "" : "\n"}`);
}
function pipeLog(name, stream) {
  stream.on("data", chunk => writeLog(name, chunk.toString()));
}
function writePid(name, value) { fs.writeFileSync(path.join(pids, `${name}.pid`), String(value)); }

const postgres = new EmbeddedPostgres({
  databaseDir: path.join(runtime, "postgres"), user, password, port: pgPort,
  persistent: true, authMethod: "scram-sha-256",
  postgresFlags: ["-c", "listen_addresses=127.0.0.1"],
  onLog: m => writeLog("postgres", m), onError: m => writeLog("postgres-error", m),
});
const services = new Map();
let stopping = false;
let control;

async function shutdown(code = 0) {
  if (stopping) return;
  stopping = true;
  control?.close();
  for (const state of services.values()) { if (state.timer) clearTimeout(state.timer); try { state.proc?.kill("SIGTERM"); } catch {} }
  await new Promise(resolve => setTimeout(resolve, 500));
  try { await postgres.stop(); } catch (error) { writeLog("supervisor", `postgres stop: ${error.message}`); }
  for (const file of fs.readdirSync(pids)) { try { fs.unlinkSync(path.join(pids, file)); } catch {} }
  process.exit(code);
}
function launch(name, args, extra = {}) {
  const previous = services.get(name) || { failures: 0 };
  const startedAt = Date.now();
  const proc = spawn(process.execPath, args, { cwd: root, env: { ...env, ...extra }, stdio: ["ignore", "pipe", "pipe"], windowsHide: true });
  const state = { ...previous, proc, startedAt, args, extra, timer: null };
  services.set(name, state);
  pipeLog(name, proc.stdout); pipeLog(name, proc.stderr); writePid(name, proc.pid);
  writeLog("supervisor", `${name} started pid=${proc.pid}`);
  proc.on("exit", (code, signal) => {
    try { fs.unlinkSync(path.join(pids, `${name}.pid`)); } catch {}
    writeLog("supervisor", `${name} exited code=${code} signal=${signal}`);
    if (stopping) return;
    state.failures = Date.now() - startedAt > 60_000 ? 1 : state.failures + 1;
    const delay = Math.min(30_000, 500 * (2 ** Math.min(state.failures - 1, 6)));
    writeLog("supervisor", `${name} restart in ${delay}ms (failure ${state.failures})`);
    state.timer = setTimeout(() => launch(name, args, extra), delay);
  });
  return proc;
}
async function probeApi() {
  return new Promise(resolve => {
    const request = http.get({ hostname: "127.0.0.1", port: apiPort, path: "/health", timeout: 1500 }, response => {
      response.resume(); resolve(response.statusCode === 200);
    });
    request.on("timeout", () => { request.destroy(); resolve(false); });
    request.on("error", () => resolve(false));
  });
}

writePid("supervisor", process.pid); writeLog("supervisor", `start pid=${process.pid}`);
if (!fs.existsSync(path.join(runtime, "postgres", "PG_VERSION"))) await postgres.initialise();
await postgres.start();
const admin = postgres.getPgClient(); await admin.connect();
const found = await admin.query("SELECT 1 FROM pg_database WHERE datname=$1", [database]); await admin.end();
if (!found.rowCount) await postgres.createDatabase(database);
const dbUrl = `postgres://${encodeURIComponent(user)}:${encodeURIComponent(password)}@127.0.0.1:${pgPort}/${encodeURIComponent(database)}`;
launch("api", ["apps/api/src/index.js"], {
  PORT: String(apiPort),
  DATABASE_URL: dbUrl,
  DATABASE_SSL: "false",
  ALLOWED_ORIGINS: env.ALLOWED_ORIGINS || `http://127.0.0.1:${lobbyPort}`,
  TRUST_PROXY: env.TRUST_PROXY || "false"
});
launch("lobby", ["scripts/native/static-server.mjs"], { STATIC_PORT: String(lobbyPort), STATIC_ROOT: "apps/lobby/dist", STATIC_ROLE: "lobby" });
launch("games", ["scripts/native/static-server.mjs"], { STATIC_PORT: String(gamesPort), STATIC_ROOT: "apps/lobby/dist", STATIC_ROLE: "games" });
control = http.createServer(async (req, res) => {
  if (req.method === "POST" && req.url === "/stop" && req.headers.authorization === `Bearer ${env.SESSION_SECRET}`) {
    res.writeHead(202).end("stopping"); setImmediate(() => shutdown()); return;
  }
  if (req.method === "GET" && req.url === "/ready") {
    const children = [...services.entries()].every(([, state]) => state.proc && state.proc.exitCode === null);
    const api = children && await probeApi();
    res.writeHead(api ? 200 : 503, { "Content-Type": "application/json", "Cache-Control": "no-store" });
    res.end(JSON.stringify({ ok: api, database: true, children, uptimeSeconds: Math.floor(process.uptime()) })); return;
  }
  res.writeHead(404).end();
});
control.listen(controlPort, "127.0.0.1");
process.on("SIGINT", () => shutdown()); process.on("SIGTERM", () => shutdown());
setInterval(() => { for (const name of ["supervisor", ...services.keys(), "postgres", "postgres-error"]) rotate(path.join(logs, `${name}.log`)); }, 60_000).unref();
