import fs from "node:fs";
import zlib from "node:zlib";
import pg from "pg";
import { migrate } from "../../apps/api/src/db.js";
const [mode, file, url] = process.argv.slice(2);
if (!file || !url || !["backup", "restore"].includes(mode)) throw new Error("usage: logical-backup.mjs backup|restore file database-url");
const db = new pg.Pool({ connectionString: url, max: 2 });
const client = await db.connect();
let primaryReleased = false;
try {
  if (mode === "backup") {
    await client.query("BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY");
    const { rows: tables } = await client.query("SELECT tablename FROM pg_tables WHERE schemaname='public' ORDER BY tablename");
    const data = { format: "virtual-arcade-logical-v1", createdAt: new Date().toISOString(), tables: {} };
    for (const { tablename } of tables) {
      if (!/^[a-z][a-z0-9_]*$/.test(tablename)) throw new Error(`unsafe table name ${tablename}`);
      data.tables[tablename] = (await client.query(`SELECT * FROM "${tablename}"`)).rows;
    }
    await client.query("COMMIT");
    fs.writeFileSync(file, zlib.gzipSync(JSON.stringify(data), { level: 9 }), { flag: "wx" });
  } else {
    client.release(); primaryReleased = true;
    await migrate(db);
    const restoreClient = await db.connect();
    try {
      const data = JSON.parse(zlib.gunzipSync(fs.readFileSync(file)));
      if (data.format !== "virtual-arcade-logical-v1" || !data.tables) throw new Error("unsupported backup format");
      const existing = new Set((await restoreClient.query("SELECT tablename FROM pg_tables WHERE schemaname='public'")).rows.map(x => x.tablename));
      const order = ["schema_migrations", "users", "sessions", "wallet_ledger", "game_rounds", "slot_bonus_sessions", "analytics_events"];
      const names = [...new Set([...order, ...Object.keys(data.tables)])].filter(name => data.tables[name] && existing.has(name));
      await restoreClient.query("BEGIN");
      if (names.length) await restoreClient.query(`TRUNCATE ${names.map(n => `"${n}"`).join(",")} RESTART IDENTITY CASCADE`);
      for (const name of names) for (const row of data.tables[name]) {
        const columns = Object.keys(row); if (!columns.length) continue;
        await restoreClient.query(`INSERT INTO "${name}" (${columns.map(c => `"${c}"`).join(",")}) OVERRIDING SYSTEM VALUE VALUES (${columns.map((_, i) => `$${i + 1}`).join(",")})`, columns.map(c => row[c]));
      }
      const sequences = (await restoreClient.query("SELECT table_name,column_name FROM information_schema.columns WHERE table_schema='public' AND (identity_generation IS NOT NULL OR column_default LIKE 'nextval(%')")).rows;
      for (const { table_name: table, column_name: column } of sequences) {
        if (!/^[a-z][a-z0-9_]*$/.test(table) || !/^[a-z][a-z0-9_]*$/.test(column)) throw new Error("unsafe sequence identifier");
        const { rows: [range] } = await restoreClient.query(`SELECT max("${column}") value,count(*)::int count FROM "${table}"`);
        if (range.count) await restoreClient.query("SELECT setval(pg_get_serial_sequence($1,$2),$3,true)", [table, column, range.value]);
      }
      await restoreClient.query("COMMIT");
    } catch (error) { await restoreClient.query("ROLLBACK"); throw error; } finally { restoreClient.release(); }
  }
} finally { if (!primaryReleased) client.release(); await db.end(); }
