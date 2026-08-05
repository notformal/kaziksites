// Premium engine slots played through the real bet/settle path: registration,
// win crediting, provably-fair reveal + reproduction, and all three mechanics.
import test from 'node:test';
import assert from 'node:assert/strict';
import { makeFixture, registerPlayer, authHeader } from './_fixture.js';
import { seedHash } from '../src/provablyFair.js';
import { makeHmacRng, spin } from '../src/slotEngine.js';
import { WAYS_243 } from '../src/slotLibrary.js';

async function play(c, h, gameId, roundId, { amount = 100, clientSeed = 'seed-xyz' } = {}) {
  const bet = await (await c('/api/wallet/bet', { method: 'POST', headers: h, body: JSON.stringify({ amount, gameId, roundId, clientSeed }) })).json();
  const settle = await (await c('/api/wallet/settle', { method: 'POST', headers: h, body: JSON.stringify({ gameId, roundId }) })).json();
  return { bet, settle, clientSeed };
}

test('an engine slot registers + plays: bet debits, settle credits the exact win', async (t) => {
  const c = await makeFixture(t), h = authHeader(await registerPlayer(c));
  const { bet, settle } = await play(c, h, 'ways-243', 'r_ways_1');
  assert.equal(bet.balance, 4900); // 5000 welcome − 100 bet
  assert.equal(bet.mathProfileId, 'ways-243');
  assert.equal(bet.mathVersion, 1);
  assert.equal(bet.serverSeedHash.length, 64);
  // Outcome shape from the engine.
  assert.ok(Array.isArray(settle.outcome.grids) && settle.outcome.grids.length >= 1);
  assert.equal(typeof settle.outcome.win, 'number');
  // Win credited exactly = floor(bet × multiplier), and balance reflects it.
  assert.equal(settle.win, Math.floor(100 * settle.multiplier));
  assert.equal(settle.balance, 4900 + settle.win);
});

test('a settled slot round reveals its seed and is reproducible from the chain', async (t) => {
  const c = await makeFixture(t), h = authHeader(await registerPlayer(c));
  const { bet, settle, clientSeed } = await play(c, h, 'ways-243', 'r_ways_2', { clientSeed: 'reproduce-me' });
  // Commit/reveal integrity.
  assert.equal(settle.proof.serverSeed.length, 64);
  assert.equal(seedHash(settle.proof.serverSeed), bet.serverSeedHash);
  // Anyone can recompute the spin from (serverSeed, clientSeed, nonce).
  const rng = makeHmacRng(settle.proof.serverSeed, clientSeed, bet.nonce);
  const rep = spin(WAYS_243, rng);
  assert.equal(rep.win, settle.outcome.win);
  assert.deepEqual(rep.grids, settle.outcome.grids);
});

test('all three engine profiles are playable (lines / ways / cascade)', async (t) => {
  const c = await makeFixture(t), h = authHeader(await registerPlayer(c));
  for (const id of ['classic-lines', 'ways-243', 'cascade-ways']) {
    const { settle } = await play(c, h, id, `r_${id}`);
    assert.ok(settle.multiplier >= 0, `${id} multiplier`);
    assert.ok(Array.isArray(settle.outcome.grids) && settle.outcome.grids.length >= 1, `${id} grids`);
  }
});

test('engine slots are exposed by the registry without leaking their math', async (t) => {
  const c = await makeFixture(t);
  const r = await (await c('/api/games/registry')).json();
  const engine = r.games.filter((g) => ['classic-lines', 'ways-243', 'cascade-ways'].includes(g.id));
  assert.equal(engine.length, 3);
  assert.ok(engine.every((g) => !('math' in g)), 'reel strips/paytable are never sent to the client');
});
