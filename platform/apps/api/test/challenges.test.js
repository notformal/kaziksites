// Wager challenges (achievement-style, virtual rewards).
import test from 'node:test';
import assert from 'node:assert/strict';
import { makeFixture, registerPlayer, authHeader } from './_fixture.js';

const bet = (c, h, amount, roundId) =>
  c('/api/wallet/bet', { method: 'POST', headers: h, body: JSON.stringify({ amount, gameId: 'slots-classic', roundId, clientSeed: 'challenge-seed' }) });
const get = async (c, h) => (await (await c('/api/challenges', { headers: h })).json());
const claim = (c, h, id) => c(`/api/challenges/${id}/claim`, { method: 'POST', headers: h });

test('challenges report progress and reward once completed and claimed', async (t) => {
  const c = await makeFixture(t), h = authHeader(await registerPlayer(c));
  let list = await get(c, h);
  assert.equal(list.wagered, 0);
  assert.ok(list.challenges.every((x) => !x.completed && !x.claimed && x.progress === 0));

  // Wager exactly the first target.
  assert.equal((await bet(c, h, 1000, 'round_ch_1')).status, 201);
  list = await get(c, h);
  const first = list.challenges.find((x) => x.id === 'wager-1k');
  assert.equal(first.completed, true);
  assert.equal(first.claimed, false);
  assert.ok(list.challenges.find((x) => x.id === 'wager-5k').completed === false);

  // Claiming an uncompleted challenge is rejected.
  assert.equal((await claim(c, h, 'wager-5k')).status, 400);
  // Unknown challenge -> 404.
  assert.equal((await claim(c, h, 'nope')).status, 404);

  // Claim the completed one, idempotently.
  const balBefore = (await (await c('/api/wallet/balance', { headers: h })).json()).balance;
  const first1 = await (await claim(c, h, 'wager-1k')).json();
  assert.equal(first1.granted, 100);
  assert.equal(first1.balance, balBefore + 100);
  assert.equal((await (await claim(c, h, 'wager-1k')).json()).granted, 0);
  assert.equal((await get(c, h)).challenges.find((x) => x.id === 'wager-1k').claimed, true);
});
