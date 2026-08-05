// Mines: stateful provably-fair original. Pure-engine + state-machine E2E.
import test from 'node:test';
import assert from 'node:assert/strict';
import { makeFixture, registerPlayer, authHeader } from './_fixture.js';
import { minePositions, mineMultiplier, mineMultiplierMilli, TILES } from '../src/mines.js';
import { seedHash } from '../src/provablyFair.js';

test('mines engine: deterministic positions and multiplier curve', () => {
  const a = minePositions('server-seed-abc', 'client', 0, 3);
  assert.deepEqual(a, minePositions('server-seed-abc', 'client', 0, 3));
  assert.equal(a.length, 3);
  assert.equal(new Set(a).size, 3);
  assert.ok(a.every((tile) => tile >= 0 && tile < TILES));
  assert.notDeepEqual(minePositions('server-seed-xyz', 'client', 0, 3), a);
  assert.ok(Math.abs(mineMultiplier(0, 3) - 0.99) < 1e-9);
  assert.ok(mineMultiplier(2, 3) > mineMultiplier(1, 3));
  assert.equal(mineMultiplierMilli(1, 1), 1031);
});

const bal = async (c, h) => (await (await c('/api/wallet/balance', { headers: h })).json()).balance;
const start = (c, h, mines) => c('/api/mines/start', { method: 'POST', headers: h, body: JSON.stringify({ bet: 100, mines, clientSeed: 'mines-client-seed' }) });
const reveal = (c, h, sessionId, tile) => c('/api/mines/reveal', { method: 'POST', headers: h, body: JSON.stringify({ sessionId, tile }) });
const cashout = (c, h, sessionId) => c('/api/mines/cashout', { method: 'POST', headers: h, body: JSON.stringify({ sessionId }) });

test('mines start debits the bet and validates input', async (t) => {
  const c = await makeFixture(t), h = authHeader(await registerPlayer(c));
  for (const mines of [0, 25, 30]) assert.equal((await start(c, h, mines)).status, 400);
  assert.equal((await c('/api/mines/start', { method: 'POST', headers: h, body: JSON.stringify({ bet: 0, mines: 3, clientSeed: 'mines-client-seed' }) })).status, 400);
  const before = await bal(c, h);
  const r = await start(c, h, 3);
  assert.equal(r.status, 201);
  assert.match((await r.json()).serverSeedHash, /^[a-f0-9]{64}$/);
  assert.equal(await bal(c, h), before - 100);
});

test('mines bust ends the game with no win and reveals the seed', async (t) => {
  const c = await makeFixture(t), h = authHeader(await registerPlayer(c));
  let busted = null;
  for (let i = 0; i < 40 && !busted; i++) {
    const s = await (await start(c, h, 24)).json(); // 24 mines -> tile 0 is a mine 24/25 of the time
    const r = await (await reveal(c, h, s.sessionId, 0)).json();
    if (r.status === 'busted') busted = { s, r };
  }
  assert.ok(busted, 'expected a bust within 40 attempts');
  assert.equal(busted.r.win, 0);
  assert.equal(busted.r.minePositions.length, 24);
  assert.ok(busted.r.minePositions.includes(0));
  assert.equal(seedHash(busted.r.serverSeed), busted.s.serverSeedHash);
  assert.deepEqual(minePositions(busted.r.serverSeed, 'mines-client-seed', 0, 24), busted.r.minePositions);
});

test('mines cashout pays the fair multiplier and locks the settled game', async (t) => {
  const c = await makeFixture(t), h = authHeader(await registerPlayer(c));
  const s0 = await (await start(c, h, 1)).json();
  assert.equal((await cashout(c, h, s0.sessionId)).status, 400); // no tiles revealed yet

  let done = null;
  for (let i = 0; i < 40 && !done; i++) {
    const before = await bal(c, h);
    const s = await (await start(c, h, 1)).json(); // 1 mine -> tile 0 safe 24/25 of the time
    const r = await (await reveal(c, h, s.sessionId, 0)).json();
    if (r.status !== 'active') continue; // busted; try again
    const co = await (await cashout(c, h, s.sessionId)).json();
    assert.equal(co.win, Math.floor((100 * mineMultiplierMilli(1, 1)) / 1000)); // 103
    assert.equal(await bal(c, h), before - 100 + co.win);
    assert.equal(seedHash(co.serverSeed), s.serverSeedHash);
    assert.equal((await cashout(c, h, s.sessionId)).status, 409); // already settled
    assert.equal((await reveal(c, h, s.sessionId, 1)).status, 409);
    done = true;
  }
  assert.ok(done, 'expected a safe first reveal within 40 attempts');
});

test('mines rejects double reveal and enforces responsible-play', async (t) => {
  const c = await makeFixture(t), h = authHeader(await registerPlayer(c));
  let safe = null;
  for (let i = 0; i < 40 && !safe; i++) {
    const s = await (await start(c, h, 1)).json();
    const r = await (await reveal(c, h, s.sessionId, 0)).json();
    if (r.status === 'active') safe = s;
  }
  assert.ok(safe);
  assert.equal((await reveal(c, h, safe.sessionId, 0)).status, 400); // already revealed

  await c('/api/account/responsible-play', { headers: h });
  await c('/api/account/responsible-play', { method: 'POST', headers: h, body: JSON.stringify({ selfExclusionHours: 168 }) });
  const blocked = await start(c, h, 3);
  assert.equal(blocked.status, 403);
  assert.equal((await blocked.json()).reason, 'self_excluded');
});
