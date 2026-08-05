// Operator backoffice (PAM): admin-key gate, metrics, player search/detail,
// append-only virtual-credit adjustment, and operator responsible-play control.
import test from 'node:test';
import assert from 'node:assert/strict';
import { makeFixture, registerPlayer, authHeader } from './_fixture.js';

// The fixture config sets analyticsAdminKey: 'test-analytics-secret'; admin.js
// falls back to it when no dedicated adminKey is configured.
const ADMIN = { 'x-admin-key': 'test-analytics-secret' };
const uidOf = async (c, h) => (await (await c('/api/profile', { headers: h })).json()).user.id;

test('every admin route rejects a missing or wrong key with 401', async (t) => {
  const c = await makeFixture(t);
  for (const path of ['/api/admin/metrics', '/api/admin/players', '/api/admin/players/1']) {
    assert.equal((await c(path)).status, 401, `${path} unauthenticated`);
    assert.equal((await c(path, { headers: { 'x-admin-key': 'nope' } })).status, 401, `${path} wrong key`);
  }
});

test('metrics reports players, wager and GGR from the ledger', async (t) => {
  const c = await makeFixture(t);
  const h = authHeader(await registerPlayer(c));
  const uid = await uidOf(c, h);
  // Player wagered 1000, won 900 back -> house GGR = 100, RTP = 90%.
  await c.db.query("INSERT INTO wallet_ledger(user_id,amount,kind,idempotency_key,metadata)VALUES($1,-1000,'bet','b1',$2)", [uid, {}]);
  await c.db.query("INSERT INTO wallet_ledger(user_id,amount,kind,idempotency_key,metadata)VALUES($1,900,'win','w1',$2)", [uid, {}]);
  const m = await (await c('/api/admin/metrics', { headers: ADMIN })).json();
  assert.equal(m.players, 1);
  assert.equal(m.totalWagered, 1000);
  assert.equal(m.ggr, 100);
  assert.equal(m.rtpPct, 90);
});

test('player search returns balance, level and rg status; supports a query filter', async (t) => {
  const c = await makeFixture(t);
  await registerPlayer(c, { email: 'alice@ex.com', displayName: 'Alice' });
  await registerPlayer(c, { email: 'bob@ex.com', displayName: 'Bobby' });
  const all = await (await c('/api/admin/players', { headers: ADMIN })).json();
  assert.equal(all.total, 2);
  assert.equal(all.players.length, 2);
  const filtered = await (await c('/api/admin/players?q=alic', { headers: ADMIN })).json();
  assert.equal(filtered.total, 1);
  assert.equal(filtered.players[0].displayName, 'Alice');
  assert.equal(typeof filtered.players[0].balance, 'number');
  assert.equal(typeof filtered.players[0].level, 'number');
});

test('adjust posts an append-only ledger row and is idempotent by key', async (t) => {
  const c = await makeFixture(t);
  const h = authHeader(await registerPlayer(c));
  const uid = await uidOf(c, h);
  const body = JSON.stringify({ amount: 500, reason: 'goodwill', key: 'ticket-42' });
  const r1 = await (await c(`/api/admin/players/${uid}/adjust`, { method: 'POST', headers: ADMIN, body })).json();
  assert.equal(r1.adjusted, 500);
  assert.equal(r1.balance, 5500); // welcome 5000 + 500
  const r2 = await (await c(`/api/admin/players/${uid}/adjust`, { method: 'POST', headers: ADMIN, body })).json();
  assert.equal(r2.balance, 5500); // same key -> no double credit
  // The player really sees the credited balance.
  const w = await (await c('/api/wallet', { headers: h })).json();
  assert.equal(w.balance, 5500);
});

test('adjust validates amount and reason, and 404s unknown players', async (t) => {
  const c = await makeFixture(t);
  const h = authHeader(await registerPlayer(c));
  const uid = await uidOf(c, h);
  assert.equal((await c(`/api/admin/players/${uid}/adjust`, { method: 'POST', headers: ADMIN, body: JSON.stringify({ amount: 0, reason: 'x' }) })).status, 400);
  assert.equal((await c(`/api/admin/players/${uid}/adjust`, { method: 'POST', headers: ADMIN, body: JSON.stringify({ amount: 100 }) })).status, 400);
  assert.equal((await c(`/api/admin/players/999999/adjust`, { method: 'POST', headers: ADMIN, body: JSON.stringify({ amount: 100, reason: 'x' }) })).status, 404);
});

test('operator can impose a self-exclusion that the player cannot shorten', async (t) => {
  const c = await makeFixture(t);
  const h = authHeader(await registerPlayer(c));
  const uid = await uidOf(c, h);
  // Operator sets a 48h self-exclusion.
  const set = await (await c(`/api/admin/players/${uid}/responsible-play`, { method: 'POST', headers: ADMIN, body: JSON.stringify({ selfExclusionHours: 48 }) })).json();
  assert.ok(set.responsiblePlay.selfExcludedUntil);
  const imposed = new Date(set.responsiblePlay.selfExcludedUntil).getTime();
  // Player attempts to shorten it to 1h -> must be ignored (extend-only rule).
  await c('/api/account/responsible-play', { method: 'POST', headers: h, body: JSON.stringify({ selfExclusionHours: 1 }) });
  const after = await (await c('/api/account/responsible-play', { headers: h })).json();
  assert.equal(new Date(after.selfExcludedUntil).getTime(), imposed);
  // And the shared responsible-play gate now reports the player as blocked.
  const check = await (await c('/api/account/responsible-play/check', { headers: h })).json();
  assert.equal(check.allowed, false);
  assert.equal(check.reason, 'self_excluded');
});

test('the operator console is served as HTML at /admin (no key needed to load it)', async (t) => {
  const c = await makeFixture(t);
  const r = await c('/admin');
  assert.equal(r.status, 200);
  assert.match(r.headers.get('content-type'), /text\/html/);
  const html = await r.text();
  assert.match(html, /Operator Console/);
  assert.equal(html.includes('test-analytics-secret'), false); // the key is never embedded
});

test('player detail exposes wallet, rg and recent ledger', async (t) => {
  const c = await makeFixture(t);
  const h = authHeader(await registerPlayer(c, { displayName: 'Detailed' }));
  const uid = await uidOf(c, h);
  const d = await (await c(`/api/admin/players/${uid}`, { headers: ADMIN })).json();
  assert.equal(d.player.displayName, 'Detailed');
  assert.equal(d.wallet.balance, 5000); // welcome credit
  assert.ok(Array.isArray(d.recentLedger));
  assert.ok(d.recentLedger.some((r) => r.kind === 'welcome'));
});
