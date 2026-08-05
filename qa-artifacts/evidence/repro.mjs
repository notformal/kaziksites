// Reproduction harness for the account-lifecycle / responsible-play defects.
//
// USAGE: copy this file into  platform/apps/api/  and run:  node repro.mjs
// (bare `import 'pg-mem'` resolves from the file's own directory, so it must sit
//  inside the api package. Run BEFORE the fixes to see the failures; AFTER to see
//  them corrected.)
//
// Boots createApp() against pg-mem with migrations 001-005 + 008.
import { newDb } from 'pg-mem';
import fs from 'node:fs/promises';
import crypto from 'node:crypto';
import { createApp } from './src/app.js';
import { config } from './src/config.js';

const mem = newDb();
mem.public.registerFunction({ name: 'pg_advisory_xact_lock', args: ['bigint'], returns: 'integer', implementation: () => 1 });
mem.public.registerFunction({ name: 'gen_random_uuid', returns: 'text', implementation: () => crypto.randomUUID() });
const db = new (mem.adapters.createPg()).Pool();
for (const name of ['001_initial.sql','002_round_math_profile.sql','003_round_choice.sql','004_analytics.sql','005_slot_bonus_sessions.sql']) {
  let sql = await fs.readFile(new URL(`./migrations/${name}`, import.meta.url), 'utf8');
  sql = sql.replace(/CREATE FUNCTION reject_ledger_mutation[\s\S]*?END \$\$;[\s\S]*?CREATE TRIGGER ledger_no_delete[^;]+;/, '');
  await db.query(sql);
}
let sql008 = await fs.readFile(new URL('./migrations/008_account_lifecycle.sql', import.meta.url), 'utf8');
await db.query(sql008.replace(/CREATE INDEX[^;]+;/g, ''));

const cfg = config({ ...process.env, ALLOWED_ORIGINS: 'http://127.0.0.1:4173', PORT: '5599' });
const server = createApp({ db, config: cfg }).listen(5599, run);
const BASE = 'http://127.0.0.1:5599';
let cookie = '';
async function call(method, path, body) {
  const r = await fetch(BASE + path, { method, headers: { 'Content-Type': 'application/json', ...(cookie ? { Cookie: cookie } : {}) }, body: body ? JSON.stringify(body) : undefined });
  const sc = r.headers.get('set-cookie'); if (sc) cookie = sc.split(';')[0];
  let j; try { j = await r.json(); } catch { j = null; }
  return { status: r.status, body: j };
}
async function run() {
  try {
    await call('POST', '/api/auth/register', { email: `u${Date.now()}@ex.com`, password: 'password123', displayName: 'Alice' });
    await call('GET', '/api/account/responsible-play');
    await call('POST', '/api/account/responsible-play', { selfExclusionHours: 168 });
    console.log('after self-exclude ->', (await call('GET', '/api/account/responsible-play')).body.selfExcludedUntil);
    await call('POST', '/api/account/responsible-play', { dailyLossLimit: 100 });
    console.log('after innocent save ->', (await call('GET', '/api/account/responsible-play')).body.selfExcludedUntil, '(null = BUG present)');
    console.log('password/change status ->', (await call('POST', '/api/account/password/change', { currentPassword: 'password123', newPassword: 'newpassword123' })).status, '(500 = BUG present)');
    console.log('devices ->', (await call('GET', '/api/account/devices')).body);
  } finally { server.close(() => db.end().then(() => process.exit(0))); }
}
