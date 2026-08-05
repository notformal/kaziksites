// Web Push: VAPID key exposure, subscription CRUD, and dispatch() fan-out +
// prune-on-gone. Delivery is exercised through an injected fake sender.
import test from 'node:test';
import assert from 'node:assert/strict';
import { makeFixture, registerPlayer, authHeader } from './_fixture.js';

const SUB = { endpoint: 'https://push.example.com/ep/abc', keys: { p256dh: 'BPk_p256dh_key', auth: 'auth_secret' } };

test('vapid endpoint exposes a base64url application server key', async (t) => {
  const c = await makeFixture(t);
  const r = await (await c('/api/push/vapid')).json();
  assert.match(r.publicKey, /^[\w-]{80,}$/); // 65-byte point, base64url
  assert.equal(r.configured, false); // no sender injected in this fixture
});

test('subscribe stores the subscription; unsubscribe removes it; status reflects it', async (t) => {
  const c = await makeFixture(t);
  const h = authHeader(await registerPlayer(c));
  assert.equal((await c('/api/push/subscribe', { method: 'POST', body: JSON.stringify(SUB) })).status, 401); // auth required
  const sub = await c('/api/push/subscribe', { method: 'POST', headers: h, body: JSON.stringify(SUB) });
  assert.equal(sub.status, 201);
  assert.equal((await (await c('/api/push/status', { headers: h })).json()).subscriptions, 1);
  // Re-subscribing the same endpoint is idempotent (upsert), not a duplicate.
  await c('/api/push/subscribe', { method: 'POST', headers: h, body: JSON.stringify(SUB) });
  assert.equal((await (await c('/api/push/status', { headers: h })).json()).subscriptions, 1);
  await c('/api/push/unsubscribe', { method: 'POST', headers: h, body: JSON.stringify({ endpoint: SUB.endpoint }) });
  assert.equal((await (await c('/api/push/status', { headers: h })).json()).subscriptions, 0);
});

test('subscribe validates the payload shape', async (t) => {
  const c = await makeFixture(t);
  const h = authHeader(await registerPlayer(c));
  for (const bad of [{}, { endpoint: 'x' }, { endpoint: 'x', keys: {} }, { endpoint: 'x', keys: { p256dh: 'a' } }])
    assert.equal((await c('/api/push/subscribe', { method: 'POST', headers: h, body: JSON.stringify(bad) })).status, 400);
});

test('a reward event dispatches a push to the subscribed device', async (t) => {
  const sent = [];
  const c = await makeFixture(t, { config: { pushSender: async (sub, body) => { sent.push({ sub, body }); } } });
  const h = authHeader(await registerPlayer(c));
  const uid = (await (await c('/api/profile', { headers: h })).json()).user.id;
  await c('/api/push/subscribe', { method: 'POST', headers: h, body: JSON.stringify(SUB) });
  // Cross into level 2, then claim -> the handler awaits push.dispatch post-commit.
  await c.db.query("INSERT INTO wallet_ledger(user_id,amount,kind,idempotency_key,metadata)VALUES($1,-1000,'bet','b1',$2)", [uid, {}]);
  await c('/api/account/bonus/level-up', { method: 'POST', headers: h });
  assert.equal(sent.length, 1);
  assert.equal(sent[0].sub.endpoint, SUB.endpoint);
  const payload = JSON.parse(sent[0].body);
  assert.equal(payload.kind, 'level-up');
  assert.match(payload.title, /Level 2/);
});

test('dispatch prunes an endpoint the push service reports as gone (410)', async (t) => {
  const gone = new Error('gone'); gone.statusCode = 410;
  const c = await makeFixture(t, { config: { pushSender: async () => { throw gone; } } });
  const h = authHeader(await registerPlayer(c));
  const uid = (await (await c('/api/profile', { headers: h })).json()).user.id;
  await c('/api/push/subscribe', { method: 'POST', headers: h, body: JSON.stringify(SUB) });
  await c.db.query("INSERT INTO wallet_ledger(user_id,amount,kind,idempotency_key,metadata)VALUES($1,-1000,'bet','b1',$2)", [uid, {}]);
  await c('/api/account/bonus/level-up', { method: 'POST', headers: h });
  // The dead subscription was removed.
  assert.equal((await (await c('/api/push/status', { headers: h })).json()).subscriptions, 0);
});
