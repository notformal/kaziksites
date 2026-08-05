// Browser-E2E development server. Production always uses PostgreSQL via src/index.js.
// Loads EVERY migration dynamically so the in-memory schema never drifts from prod.
import { newDb } from "pg-mem";
import { readdir, readFile } from "node:fs/promises";
import { createApp } from "./app.js";
import { config } from "./config.js";

const mem = newDb();
mem.public.registerFunction({ name: "pg_advisory_xact_lock", args: ["bigint"], returns: "integer", implementation: () => 1 });
mem.public.registerFunction({ name: "gen_random_uuid", returns: "text", implementation: () => globalThis.crypto.randomUUID() });
const db = new (mem.adapters.createPg()).Pool();

// pg-mem can't run the PL/pgSQL append-only trigger or partial/expression indexes;
// strip those (and all non-unique perf indexes) while keeping UNIQUE indexes.
const dir = new URL("../migrations/", import.meta.url);
for (const name of (await readdir(dir)).filter((f) => f.endsWith(".sql")).sort()) {
  const sql = (await readFile(new URL(name, dir), "utf8"))
    .replace(/CREATE FUNCTION reject_ledger_mutation[\s\S]*?END \$\$;[\s\S]*?CREATE TRIGGER ledger_no_delete[^;]+;/, "")
    .replace(/CREATE INDEX[^;]+;/g, "");
  // Skip files with no executable statement after stripping (index-only migrations).
  if (sql.replace(/--[^\n]*/g, "").trim()) await db.query(sql);
}

const cfg = config({ ...process.env, ALLOWED_ORIGINS: process.env.ALLOWED_ORIGINS || "http://127.0.0.1:4173" });
const app = createApp({ db, config: cfg });
const server = app.listen(cfg.port, () => console.log(`Memory E2E API http://127.0.0.1:${cfg.port}`));
const stop = () => server.close(async () => { await db.end(); process.exit(0); });
process.on("SIGINT", stop);
process.on("SIGTERM", stop);
