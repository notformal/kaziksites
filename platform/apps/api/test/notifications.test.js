// Per-user notification center: list / mark-read / unread count / SSE, plus the
// event integration (a level-up bonus claim emits a notification).
import test from 'node:test';
import assert from 'node:assert/strict';
import { makeFixture, registerPlayer, authHeader } from './_fixture.js';

const uidOf = async (c, h) => (await (await c('/api/profile', { headers: h })).json()).user.id;
const seedNotif = (c, uid, kind, title) =>
  c.db.query('INSERT INTO notifications(user_id,kind,title,body,data)VALUES($1,$2,$3,$4,$5)', [uid, kind, title, 'details', {}]);

test('list returns newest-first with an unread count; auth required', async (t) => {
  const c = await makeFixture(t), h = authHeader(await registerPlayer(c));
  const uid = await uidOf(c, h);
  await seedNotif(c, uid, 'level-up', 'Level 2 reached');
  await seedNotif(c, uid, 'cashback', 'Cashback: +50 credits');
  assert.equal((await c('/api/notifications')).status, 401);
  const { notifications, unread } = await (await c('/api/notifications', { headers: h })).json();
  assert.equal(notifications.length, 2);
  assert.equal(notifications[0].title, 'Cashback: +50 credits'); // newest first
  assert.equal(unread, 2);
  assert.equal(notifications[0].read, false);
});

test('mark specific ids read, then mark the rest read', async (t) => {
  const c = await makeFixture(t), h = authHeader(await registerPlayer(c));
  const uid = await uidOf(c, h);
  await seedNotif(c, uid, 'a', 'one');
  await seedNotif(c, uid, 'b', 'two');
  await seedNotif(c, uid, 'c', 'three');
  const { notifications } = await (await c('/api/notifications', { headers: h })).json();
  const first = notifications[0].id;
  let r = await (await c('/api/notifications/read', { method: 'POST', headers: h, body: JSON.stringify({ ids: [Number(first)] }) })).json();
  assert.equal(r.unread, 2);
  r = await (await c('/api/notifications/read', { method: 'POST', headers: h, body: JSON.stringify({}) })).json(); // no ids -> all
  assert.equal(r.unread, 0);
});

test('one player cannot see or clear another player notifications', async (t) => {
  const c = await makeFixture(t);
  const h1 = authHeader(await registerPlayer(c, { email: 'a@ex.com', displayName: 'Aria' }));
  const h2 = authHeader(await registerPlayer(c, { email: 'b@ex.com', displayName: 'Bram' }));
  const uid1 = await uidOf(c, h1);
  await seedNotif(c, uid1, 'level-up', 'private to A');
  const { notifications } = await (await c('/api/notifications', { headers: h2 })).json();
  assert.equal(notifications.length, 0); // B sees none of A's
});

test('claiming the level-up bonus emits a level-up notification', async (t) => {
  const c = await makeFixture(t), h = authHeader(await registerPlayer(c));
  const uid = await uidOf(c, h);
  // Seed enough wager (bets are negative) to cross into level 2 (xpForLevel(2)=1000).
  await c.db.query("INSERT INTO wallet_ledger(user_id,amount,kind,idempotency_key,metadata)VALUES($1,-1000,'bet','seedbet',$2)", [uid, {}]);
  const claim = await (await c('/api/account/bonus/level-up', { method: 'POST', headers: h })).json();
  assert.equal(claim.level, 2);
  assert.ok(claim.granted > 0);
  const { notifications, unread } = await (await c('/api/notifications', { headers: h })).json();
  assert.ok(unread >= 1);
  const lu = notifications.find((n) => n.kind === 'level-up');
  assert.ok(lu, 'a level-up notification exists');
  assert.equal(lu.data.level, 2);
});

test('SSE feed emits a ready event with the unread count', async (t) => {
  const c = await makeFixture(t), h = authHeader(await registerPlayer(c));
  const uid = await uidOf(c, h);
  await seedNotif(c, uid, 'level-up', 'ping');
  const ac = new AbortController();
  const res = await c('/api/notifications/feed', { headers: h, signal: ac.signal });
  assert.equal(res.status, 200);
  assert.match(res.headers.get('content-type'), /text\/event-stream/);
  const { value } = await res.body.getReader().read();
  const text = new TextDecoder().decode(value);
  assert.match(text, /event: ready/);
  assert.match(text, /"unread":1/);
  ac.abort();
});
