// Live win feed: privacy-aliased recent wins + SSE stream (derived from ledger).
import test from 'node:test';
import assert from 'node:assert/strict';
import { makeFixture, registerPlayer, authHeader } from './_fixture.js';

const uidOf = async (c, h) => (await (await c('/api/profile', { headers: h })).json()).user.id;
const seedWin = (c, uid, amount, gameId, key) =>
  c.db.query("INSERT INTO wallet_ledger(user_id,amount,kind,idempotency_key,metadata)VALUES($1,$2,'win',$3,$4)", [uid, amount, key, { gameId, roundId: key }]);

test('recent feed lists wins newest-first, aliased, with gameId', async (t) => {
  const c = await makeFixture(t), h = authHeader(await registerPlayer(c));
  const uid = await uidOf(c, h);
  await seedWin(c, uid, 500, 'dice', 'w1');
  await seedWin(c, uid, 1200, 'blackjack', 'w2');
  const { feed } = await (await c('/api/live/recent', { headers: h })).json();
  assert.equal(feed.length, 2);
  assert.equal(feed[0].win, 1200); // newest first
  assert.equal(feed[0].gameId, 'blackjack');
  assert.equal(feed[1].win, 500);
  assert.match(feed[0].alias, /^Player #[0-9A-F]{4}$/); // aliased, no email/display name leaked
  assert.equal(JSON.stringify(feed).includes('@'), false); // no email anywhere in the payload
});

test('SSE feed streams an event-stream with the recent wins', async (t) => {
  const c = await makeFixture(t), h = authHeader(await registerPlayer(c));
  const uid = await uidOf(c, h);
  await seedWin(c, uid, 777, 'wheel', 'w1');
  const ac = new AbortController();
  const res = await c('/api/live/feed', { headers: h, signal: ac.signal });
  assert.equal(res.status, 200);
  assert.match(res.headers.get('content-type'), /text\/event-stream/);
  const { value } = await res.body.getReader().read();
  const text = new TextDecoder().decode(value);
  assert.match(text, /event: win/);
  assert.match(text, /"win":777/);
  assert.match(text, /event: ready/);
  ac.abort();
});
