// Shared test fixture: boots createApp() against an in-memory Postgres (pg-mem)
// with EVERY migration applied in order. Because it loads the migrations directory
// dynamically, new migrations are picked up automatically — no per-test-file list to
// keep in sync (the drift that caused DEF-013).
import { newDb } from 'pg-mem';
import { readdir, readFile } from 'node:fs/promises';
import { createApp } from '../src/app.js';

/**
 * pg-mem cannot execute the PL/pgSQL append-only trigger, nor partial/expression
 * indexes (WHERE / IS NULL). Both are stripped for the in-memory schema; the
 * functional UNIQUE index (lower(email)) is preserved because correctness depends
 * on it and pg-mem supports it.
 */
function pgMemSafe(sql) {
  return sql
    .replace(/CREATE FUNCTION reject_ledger_mutation[\s\S]*?END \$\$;[\s\S]*?CREATE TRIGGER ledger_no_delete[^;]+;/, '')
    .replace(/CREATE INDEX[^;]+;/g, ''); // non-unique perf indexes only; "CREATE UNIQUE INDEX" is left intact
}

export async function loadSchema(db) {
  const dir = new URL('../migrations/', import.meta.url);
  const files = (await readdir(dir)).filter((f) => f.endsWith('.sql')).sort();
  for (const name of files) {
    const sql = pgMemSafe(await readFile(new URL(name, dir), 'utf8'));
    // Skip files that are empty after stripping (e.g. index-only migrations) —
    // pg-mem throws "Unexpected end of input" on a statement-less query.
    if (sql.replace(/--[^\n]*/g, '').trim()) await db.query(sql);
  }
  return files;
}

export async function makeFixture(t, { now = () => Date.UTC(2026, 6, 13), config: extraConfig = {} } = {}) {
  const mem = newDb();
  mem.public.registerFunction({ name: 'pg_advisory_xact_lock', args: ['bigint'], returns: 'integer', implementation: () => 1 });
  mem.public.registerFunction({ name: 'gen_random_uuid', returns: 'text', implementation: () => globalThis.crypto.randomUUID() });
  const db = new (mem.adapters.createPg()).Pool();
  await loadSchema(db);
  // bjStartLimit lifted so statistical hunts (e.g. finding a natural blackjack)
  // aren't throttled by the production 60/min cap and made flaky.
  const config = { allowedOrigins: new Set(['http://localhost:5173']), sessionTtlMs: 36e5, trustProxy: false, analyticsAdminKey: 'test-analytics-secret', bjStartLimit: 100000, ...extraConfig };
  const app = createApp({ db, config, now });
  const server = app.listen(0);
  await new Promise((r) => server.once('listening', r));
  t.after(async () => { await new Promise((r) => server.close(r)); await db.end(); });
  const base = `http://127.0.0.1:${server.address().port}`;
  const call = (p, o = {}) => fetch(base + p, { ...o, headers: { 'content-type': 'application/json', ...o.headers } });
  call.db = db;
  return call;
}

export async function registerPlayer(call, { email = 'player@example.com', password = 'correct horse battery', displayName = 'Player' } = {}) {
  const r = await call('/api/auth/register', { method: 'POST', body: JSON.stringify({ email, password, displayName }) });
  return (await r.json()).token;
}

export const authHeader = (token) => ({ authorization: `Bearer ${token}` });
