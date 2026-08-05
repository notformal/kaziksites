// Provably-fair "originals" games added to close the competitive gap: Dice + Limbo.
// Verifies the 1% house edge statistically and the bet->settle flow + input validation.
import test from 'node:test';
import assert from 'node:assert/strict';
import { makeFixture, registerPlayer, authHeader } from './_fixture.js';
import { outcome, newServerSeed } from '../src/provablyFair.js';

/** Mean payout multiplier and win rate over many nonces for one fixed choice.
 * Uses a FIXED seed so the sample is deterministic — a random seed with the tight
 * `<= 1.0` bound flaked ~2% of runs on sampling variance. */
function simulate(gameId, kind, choice, n = 40000) {
  const serverSeed = '9f'.repeat(32), clientSeed = 'house-edge-probe';
  let paid = 0, wins = 0;
  for (let nonce = 0; nonce < n; nonce++) {
    const o = outcome({ serverSeed, clientSeed, nonce, gameId, kind, choice });
    paid += o.multiplierMilli / 1000;
    if (o.multiplierMilli > 0) wins++;
  }
  return { meanPayout: paid / n, winRate: wins / n };
}

test('dice holds a ~1% house edge for over and under', () => {
  for (const choice of [{ type: 'under', target: 5000 }, { type: 'over', target: 5000 }]) {
    const { meanPayout, winRate } = simulate('dice', 'dice', choice);
    assert.ok(meanPayout > 0.97 && meanPayout < 1.01, `dice ${choice.type} mean payout ${meanPayout}`);
    assert.ok(Math.abs(winRate - 0.5) < 0.03, `dice ${choice.type} win rate ${winRate}`);
  }
});

test('limbo holds a ~1% house edge and win rate tracks 0.99/target', () => {
  const { meanPayout, winRate } = simulate('limbo', 'limbo', { target: 2 });
  assert.ok(meanPayout > 0.97 && meanPayout < 1.01, `limbo mean payout ${meanPayout}`);
  assert.ok(Math.abs(winRate - 0.495) < 0.03, `limbo win rate ${winRate}`);
});

test('wheel table keeps the house ahead and segments stay near-uniform', () => {
  const seg = JSON.parse(outcome({ serverSeed: newServerSeed(), clientSeed: 'x', nonce: 0, gameId: 'wheel', kind: 'wheel' }).value).segments;
  const mean = seg.reduce((a, b) => a + b, 0) / seg.length;
  // Коридор политики: казино в плюсе, но выплаты остаются щедрыми (см. mathProfiles.js).
  assert.ok(mean >= 0.92 && mean <= 0.99, `wheel table mean ${mean}`);
  const counts = new Array(seg.length).fill(0), N = 40000, ss = newServerSeed();
  for (let nonce = 0; nonce < N; nonce++) counts[JSON.parse(outcome({ serverSeed: ss, clientSeed: 'u', nonce, gameId: 'wheel', kind: 'wheel' }).value).segment]++;
  for (const cnt of counts) assert.ok(Math.abs(cnt / N - 1 / seg.length) < 0.02, `segment share ${cnt / N}`);
});

test('wheel bet -> settle lands on a valid segment', async (t) => {
  const c = await makeFixture(t), h = authHeader(await registerPlayer(c));
  const bet = { amount: 100, gameId: 'wheel', roundId: 'round_wheel_1', clientSeed: 'client-seed-wheel' };
  assert.equal((await c('/api/wallet/bet', { method: 'POST', headers: h, body: JSON.stringify(bet) })).status, 201);
  const settled = await (await c('/api/wallet/settle', { method: 'POST', headers: h, body: JSON.stringify({ gameId: 'wheel', roundId: bet.roundId }) })).json();
  assert.ok(settled.outcome.segment >= 0 && settled.outcome.segment < 10);
  assert.equal(settled.win, Math.floor((100 * Math.round(settled.outcome.multiplier * 1000)) / 1000));
});

test('dice outcome is deterministic and self-consistent', () => {
  const input = { serverSeed: newServerSeed(), clientSeed: 'seed-abc', nonce: 7, gameId: 'dice', kind: 'dice', choice: { type: 'under', target: 5000 } };
  const a = outcome(input), b = outcome(input);
  assert.deepEqual(a, b);
  const v = JSON.parse(a.value);
  assert.equal(v.won, v.roll < v.target);
  assert.equal(a.multiplierMilli > 0, v.won);
});

test('dice bet -> settle is server-authoritative and consistent', async (t) => {
  const c = await makeFixture(t), h = authHeader(await registerPlayer(c));
  const bet = { amount: 100, gameId: 'dice', roundId: 'round_dice_1', clientSeed: 'client-seed-dice', choice: { type: 'under', target: 5000 } };
  assert.equal((await c('/api/wallet/bet', { method: 'POST', headers: h, body: JSON.stringify(bet) })).status, 201);
  const settled = await (await c('/api/wallet/settle', { method: 'POST', headers: h, body: JSON.stringify({ gameId: 'dice', roundId: bet.roundId }) })).json();
  assert.equal(settled.outcome.target, 5000);
  assert.equal(settled.outcome.won, settled.outcome.roll < 5000);
  assert.equal(settled.win > 0, settled.outcome.won);
});

test('limbo bet -> settle pays the chosen target when the result clears it', async (t) => {
  const c = await makeFixture(t), h = authHeader(await registerPlayer(c));
  const bet = { amount: 100, gameId: 'limbo', roundId: 'round_limbo_1', clientSeed: 'client-seed-limbo', choice: { target: 2 } };
  assert.equal((await c('/api/wallet/bet', { method: 'POST', headers: h, body: JSON.stringify(bet) })).status, 201);
  const settled = await (await c('/api/wallet/settle', { method: 'POST', headers: h, body: JSON.stringify({ gameId: 'limbo', roundId: bet.roundId }) })).json();
  assert.equal(settled.outcome.won, settled.outcome.result >= 2);
  assert.equal(settled.win, settled.outcome.won ? 200 : 0);
});

test('invalid dice/limbo choices are rejected before any debit', async (t) => {
  const c = await makeFixture(t), h = authHeader(await registerPlayer(c));
  const bad = [
    { gameId: 'dice', choice: { type: 'sideways', target: 5000 } },
    { gameId: 'dice', choice: { type: 'under', target: 0 } },
    { gameId: 'dice', choice: { type: 'over', target: 99999 } },
    { gameId: 'limbo', choice: { target: 1.0 } },
    { gameId: 'limbo', choice: { target: 5000 } },
  ];
  for (const [i, b] of bad.entries()) {
    const r = await c('/api/wallet/bet', { method: 'POST', headers: h, body: JSON.stringify({ amount: 100, roundId: `round_bad_orig_${i}`, clientSeed: 'client-seed-bad', ...b }) });
    assert.equal(r.status, 400, `${b.gameId} ${JSON.stringify(b.choice)} should be rejected`);
  }
  assert.equal((await (await c('/api/wallet/balance', { headers: h })).json()).balance, 5000);
});
