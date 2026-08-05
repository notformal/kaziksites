// Hi-Lo: stateful provably-fair original. Pure engine + state-machine E2E.
import test from 'node:test';
import assert from 'node:assert/strict';
import { makeFixture, registerPlayer, authHeader } from './_fixture.js';
import { cardAt, stepMultiplierMilli, isWin } from '../src/hilo.js';
import { newServerSeed, seedHash } from '../src/provablyFair.js';

test('hilo engine: cards, multipliers, win rule', () => {
  const seed = newServerSeed();
  assert.deepEqual(cardAt(seed, 'c', 0, 0), cardAt(seed, 'c', 0, 0));
  for (let i = 0; i < 200; i++) {
    const card = cardAt(seed, 'c', 0, i);
    assert.ok(card.rank >= 1 && card.rank <= 13 && card.suit >= 0 && card.suit <= 3);
  }
  assert.equal(stepMultiplierMilli(13, 'hi'), 12870);
  assert.equal(stepMultiplierMilli(1, 'hi'), 990);
  assert.equal(stepMultiplierMilli(1, 'lo'), 12870);
  assert.equal(isWin(10, 5, 'hi'), true);
  assert.equal(isWin(3, 5, 'hi'), false);
  assert.equal(isWin(5, 5, 'hi'), true);
  assert.equal(isWin(5, 5, 'lo'), true); // ties win both directions
});

test('hilo holds a ~1% house edge per guess', () => {
  // Fixed seed -> deterministic sample (a random seed with the tight `<= 1.0`
  // upper bound flaked on variance).
  const ss = '9f'.repeat(32), rank = 7, dir = 'hi', mult = stepMultiplierMilli(rank, dir) / 1000, n = 40000;
  let paid = 0, wins = 0;
  for (let i = 0; i < n; i++) {
    if (isWin(cardAt(ss, 'probe', i, 1).rank, rank, dir)) { wins++; paid += mult; }
  }
  assert.ok(paid / n > 0.97 && paid / n < 1.01, `mean payout ${paid / n}`);
  assert.ok(Math.abs(wins / n - 7 / 13) < 0.03, `win rate ${wins / n}`);
});

const bal = async (c, h) => (await (await c('/api/wallet/balance', { headers: h })).json()).balance;
const start = (c, h) => c('/api/hilo/start', { method: 'POST', headers: h, body: JSON.stringify({ bet: 100, clientSeed: 'hilo-client-seed' }) });
const guess = (c, h, sessionId, direction) => c('/api/hilo/guess', { method: 'POST', headers: h, body: JSON.stringify({ sessionId, direction }) });
const cashout = (c, h, sessionId) => c('/api/hilo/cashout', { method: 'POST', headers: h, body: JSON.stringify({ sessionId }) });

test('hilo start debits the bet and returns a card with options', async (t) => {
  const c = await makeFixture(t), h = authHeader(await registerPlayer(c));
  const before = await bal(c, h);
  const r = await start(c, h);
  assert.equal(r.status, 201);
  const b = await r.json();
  assert.ok(b.card.rank >= 1 && b.card.rank <= 13);
  assert.equal(typeof b.options.higher, 'number');
  assert.match(b.serverSeedHash, /^[a-f0-9]{64}$/);
  assert.equal(await bal(c, h), before - 100);
});

test('hilo guess is consistent with the server card; a bust reveals the seed', async (t) => {
  const c = await makeFixture(t), h = authHeader(await registerPlayer(c));
  let busted = null;
  for (let i = 0; i < 40 && !busted; i++) {
    const s = await (await start(c, h)).json();
    const r = await (await guess(c, h, s.sessionId, 'hi')).json();
    assert.equal(r.correct, isWin(r.card.rank, s.card.rank, 'hi'));
    assert.equal(r.status === 'active', r.correct);
    if (r.status === 'busted') busted = { s, r };
  }
  assert.ok(busted, 'expected a bust within 40 attempts');
  assert.equal(busted.r.win, 0);
  assert.equal(seedHash(busted.r.serverSeed), busted.s.serverSeedHash);
});

test('hilo cashout pays the cumulative multiplier and enforces the state machine', async (t) => {
  const c = await makeFixture(t), h = authHeader(await registerPlayer(c));
  // Empty cashout is rejected.
  const s0 = await (await start(c, h)).json();
  assert.equal((await cashout(c, h, s0.sessionId)).status, 400);

  let done = null;
  for (let i = 0; i < 40 && !done; i++) {
    const before = await bal(c, h);
    const s = await (await start(c, h)).json();
    const dir = s.card.rank <= 7 ? 'hi' : 'lo'; // higher-probability guess
    const g = await (await guess(c, h, s.sessionId, dir)).json();
    if (g.status !== 'active') continue; // busted; retry
    const co = await (await cashout(c, h, s.sessionId)).json();
    assert.equal(co.win, Math.floor((100 * stepMultiplierMilli(s.card.rank, dir)) / 1000));
    assert.equal(co.win, Math.floor(100 * g.multiplier));
    assert.equal(await bal(c, h), before - 100 + co.win);
    assert.equal(seedHash(co.serverSeed), s.serverSeedHash);
    assert.equal((await cashout(c, h, s.sessionId)).status, 409); // already settled
    assert.equal((await guess(c, h, s.sessionId, 'hi')).status, 409);
    done = true;
  }
  assert.ok(done, 'expected a surviving first guess within 40 attempts');
});

test('hilo validation and responsible-play enforcement', async (t) => {
  const c = await makeFixture(t), h = authHeader(await registerPlayer(c));
  const s = await (await start(c, h)).json();
  assert.equal((await guess(c, h, s.sessionId, 'sideways')).status, 400);
  assert.equal((await guess(c, h, 'hilo_missing', 'hi')).status, 404);

  await c('/api/account/responsible-play', { headers: h });
  await c('/api/account/responsible-play', { method: 'POST', headers: h, body: JSON.stringify({ selfExclusionHours: 168 }) });
  const blocked = await start(c, h);
  assert.equal(blocked.status, 403);
  assert.equal((await blocked.json()).reason, 'self_excluded');
});
