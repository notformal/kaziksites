// Progression / VIP + virtual bonuses (level-up, faucet). Entertainment-only.
import test from 'node:test';
import assert from 'node:assert/strict';
import { makeFixture, registerPlayer, authHeader } from './_fixture.js';
import { xpForLevel, levelFromXp, rankOf, levelUpReward } from '../src/progression.js';

test('progression math: thresholds, level and rank', () => {
  assert.equal(xpForLevel(1), 0);
  assert.equal(xpForLevel(2), 1000);
  assert.equal(xpForLevel(3), 3000);
  assert.equal(levelFromXp(0), 1);
  assert.equal(levelFromXp(999), 1);
  assert.equal(levelFromXp(1000), 2);
  assert.equal(levelFromXp(2999), 2);
  assert.equal(levelFromXp(3000), 3);
  assert.deepEqual([rankOf(1), rankOf(5), rankOf(10), rankOf(20), rankOf(40)], ['Bronze', 'Silver', 'Gold', 'Platinum', 'Diamond']);
  assert.equal(levelUpReward(3), 300);
});

const bet = (c, h, amount, roundId) =>
  c('/api/wallet/bet', { method: 'POST', headers: h, body: JSON.stringify({ amount, gameId: 'slots-classic', roundId, clientSeed: 'progression-seed' }) });

test('progression reflects wagered XP and level', async (t) => {
  const c = await makeFixture(t), h = authHeader(await registerPlayer(c));
  let p = await (await c('/api/account/progression', { headers: h })).json();
  assert.equal(p.level, 1); assert.equal(p.xp, 0); assert.equal(p.rank, 'Bronze');
  assert.equal((await bet(c, h, 1000, 'round_prog_1')).status, 201);
  p = await (await c('/api/account/progression', { headers: h })).json();
  assert.equal(p.xp, 1000); assert.equal(p.level, 2); assert.equal(p.unclaimedLevels, 1);
});

test('level-up bonus grants each reached level once (idempotent)', async (t) => {
  const c = await makeFixture(t), h = authHeader(await registerPlayer(c));
  await bet(c, h, 3000, 'round_lvl_1'); // wagered 3000 -> level 3
  const first = await (await c('/api/account/bonus/level-up', { method: 'POST', headers: h })).json();
  assert.equal(first.level, 3);
  assert.equal(first.granted, levelUpReward(2) + levelUpReward(3)); // 200 + 300
  const again = await (await c('/api/account/bonus/level-up', { method: 'POST', headers: h })).json();
  assert.equal(again.granted, 0);
});

test('faucet tops up a low balance, respects threshold and cooldown', async (t) => {
  const c = await makeFixture(t), h = authHeader(await registerPlayer(c));
  assert.equal((await c('/api/account/bonus/faucet', { method: 'POST', headers: h })).status, 400); // 5000 > threshold
  await bet(c, h, 4600, 'round_faucet_drain'); // balance -> 400
  const ok = await c('/api/account/bonus/faucet', { method: 'POST', headers: h });
  assert.equal(ok.status, 200);
  assert.equal((await ok.json()).granted, 200);
  assert.equal((await c('/api/account/bonus/faucet', { method: 'POST', headers: h })).status, 429); // cooldown
});

const cashback = (c, h) => c('/api/account/bonus/cashback', { method: 'POST', headers: h });
test('cashback refunds 5% of net losses since the last claim', async (t) => {
  const c = await makeFixture(t), h = authHeader(await registerPlayer(c));
  assert.equal((await (await cashback(c, h)).json()).granted, 0); // no losses yet
  await bet(c, h, 1000, 'round_cb_1'); // unsettled bet -> net loss 1000 in the window
  const balBefore = (await (await c('/api/wallet/balance', { headers: h })).json()).balance;
  const first = await (await cashback(c, h)).json();
  assert.equal(first.loss, 1000);
  assert.equal(first.granted, 50); // 5% of 1000
  assert.equal(first.balance, balBefore + 50);
  // Window reset: an immediate second claim finds no new losses.
  assert.equal((await (await cashback(c, h)).json()).granted, 0);
});
