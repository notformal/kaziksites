// Video Poker (Jacks or Better): stateful provably-fair. E2E consistency.
import test from 'node:test';
import assert from 'node:assert/strict';
import { makeFixture, registerPlayer, authHeader } from './_fixture.js';
import { evaluate5, videoPokerPayout } from '../src/poker.js';
import { seedHash } from '../src/provablyFair.js';

const bal = async (c, h) => (await (await c('/api/wallet/balance', { headers: h })).json()).balance;
const start = (c, h, bet = 100) => c('/api/videopoker/start', { method: 'POST', headers: h, body: JSON.stringify({ bet, clientSeed: 'videopoker-seed' }) });
const draw = (c, h, sessionId, hold) => c('/api/videopoker/draw', { method: 'POST', headers: h, body: JSON.stringify({ sessionId, hold }) });

test('videopoker start deals five cards and debits the bet', async (t) => {
  const c = await makeFixture(t), h = authHeader(await registerPlayer(c));
  const r = await start(c, h);
  assert.equal(r.status, 201);
  const b = await r.json();
  assert.equal(b.cards.length, 5);
  assert.match(b.serverSeedHash, /^[a-f0-9]{64}$/);
  assert.equal(b.balance, 4900);
});

test('holding all keeps the dealt hand; payout matches the Jacks-or-Better table', async (t) => {
  const c = await makeFixture(t), h = authHeader(await registerPlayer(c));
  const st = await (await start(c, h)).json();
  const r = await (await draw(c, h, st.sessionId, [0, 1, 2, 3, 4])).json();
  assert.deepEqual(r.cards, st.cards); // held all -> no replacements
  const pay = videoPokerPayout(evaluate5(r.cards));
  assert.equal(r.payout, pay);
  assert.equal(r.win, 100 * pay);
  assert.equal(r.status, pay > 0 ? 'won' : 'lost');
  assert.equal(r.balance, 4900 + r.win);
  assert.equal(seedHash(r.serverSeed), st.serverSeedHash);
  assert.equal((await draw(c, h, st.sessionId, [])).status, 409); // settled
});

test('discarding all draws the pile and pays the resulting hand', async (t) => {
  const c = await makeFixture(t), h = authHeader(await registerPlayer(c));
  const st = await (await start(c, h)).json();
  const r = await (await draw(c, h, st.sessionId, [])).json();
  assert.equal(r.cards.length, 5);
  assert.equal(r.payout, videoPokerPayout(evaluate5(r.cards)));
  assert.equal(r.win, 100 * r.payout);
});

test('videopoker validation and responsible-play enforcement', async (t) => {
  const c = await makeFixture(t), h = authHeader(await registerPlayer(c));
  const st = await (await start(c, h)).json();
  for (const hold of [[0, 0], [5], [1, 2, 3, 4, 5, 0], 'nope'])
    assert.equal((await draw(c, h, st.sessionId, hold)).status, 400);
  assert.equal((await draw(c, h, 'vp_missing', [0])).status, 404);

  await c('/api/account/responsible-play', { headers: h });
  await c('/api/account/responsible-play', { method: 'POST', headers: h, body: JSON.stringify({ selfExclusionHours: 168 }) });
  const blocked = await start(c, h);
  assert.equal(blocked.status, 403);
  assert.equal((await blocked.json()).reason, 'self_excluded');
});
