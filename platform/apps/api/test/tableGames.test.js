// Table games: Sic Bo, Baccarat, American Roulette. Engine + house-edge + E2E.
import test from 'node:test';
import assert from 'node:assert/strict';
import { makeFixture, registerPlayer, authHeader } from './_fixture.js';
import { outcome } from '../src/provablyFair.js';
import { baccaratResult, bacValue } from '../src/baccarat.js';
import { SICBO_PAYOUTS_MILLI } from '../src/mathProfiles.js';

const card = (rank, suit = 0) => ({ rank, suit });

test('baccarat resolver: naturals, third-card rule, tie', () => {
  assert.equal(bacValue(13), 0);
  assert.equal(bacValue(1), 1);
  // Natural player win, no draws.
  let r = baccaratResult([card(8), card(5), card(10), card(2), card(9), card(9)]);
  assert.deepEqual([r.playerTotal, r.bankerTotal, r.result, r.playerCards.length], [8, 7, 'player', 2]);
  // Player draws (5 -> +4 = 9), banker draws (2 -> +5 = 7).
  r = baccaratResult([card(2), card(1), card(3), card(1), card(4), card(5)]);
  assert.deepEqual([r.playerTotal, r.bankerTotal, r.result, r.playerCards.length, r.bankerCards.length], [9, 7, 'player', 3, 3]);
  // Banker natural.
  r = baccaratResult([card(3), card(9), card(4), card(10), card(1), card(1)]);
  assert.deepEqual([r.bankerTotal, r.result, r.bankerCards.length], [9, 'banker', 2]);
});

function meanPayout(gameId, kind, choice, n = 50000) {
  const ss = '9f'.repeat(32); // fixed seed -> deterministic mean (avoids tail-variance flakes)
  let paid = 0;
  for (let nonce = 0; nonce < n; nonce++) paid += outcome({ serverSeed: ss, clientSeed: 'edge', nonce, gameId, kind, choice }).multiplierMilli / 1000;
  return paid / n;
}

test('table games keep a house edge (mean payout < 1)', () => {
  assert.ok(meanPayout('sicbo', 'sicbo', { bet: 'small' }) > 0.9 && meanPayout('sicbo', 'sicbo', { bet: 'small' }) < 1.0);
  assert.ok(meanPayout('baccarat', 'baccarat', { bet: 'banker' }) > 0.85 && meanPayout('baccarat', 'baccarat', { bet: 'banker' }) < 1.0);
  assert.ok(meanPayout('baccarat', 'baccarat', { bet: 'player' }) > 0.85 && meanPayout('baccarat', 'baccarat', { bet: 'player' }) < 1.0);
  assert.ok(meanPayout('roulette-us', 'roulette-us', { type: 'red' }) > 0.9 && meanPayout('roulette-us', 'roulette-us', { type: 'red' }) < 1.0);
});

const betReq = (c, h, gameId, roundId, choice) =>
  c('/api/wallet/bet', { method: 'POST', headers: h, body: JSON.stringify({ amount: 100, gameId, roundId, clientSeed: 'table-seed', choice }) });
const settleReq = (c, h, gameId, roundId) =>
  c('/api/wallet/settle', { method: 'POST', headers: h, body: JSON.stringify({ gameId, roundId }) });

test('sicbo bet -> settle is consistent (small, lose on triple)', async (t) => {
  const c = await makeFixture(t), h = authHeader(await registerPlayer(c));
  assert.equal((await betReq(c, h, 'sicbo', 'round_sic_1', { bet: 'small' })).status, 201);
  const s = await (await settleReq(c, h, 'sicbo', 'round_sic_1')).json();
  assert.equal(s.outcome.dice.length, 3);
  const shouldWin = !s.outcome.triple && s.outcome.sum >= 4 && s.outcome.sum <= 10;
  assert.equal(s.win > 0, shouldWin);
  // Выплата берётся из матпрофиля (1.95× вместо 2×: при честных 2× у sicbo
  // не оставалось преимущества казино). Тест сверяется с профилем, а не с числом.
  if (shouldWin) assert.equal(s.win, Math.floor((100 * SICBO_PAYOUTS_MILLI.smallBig) / 1000));
});

test('baccarat bet -> settle pays by result (banker 0.95:1, tie pushes)', async (t) => {
  const c = await makeFixture(t), h = authHeader(await registerPlayer(c));
  assert.equal((await betReq(c, h, 'baccarat', 'round_bac_1', { bet: 'banker' })).status, 201);
  const s = await (await settleReq(c, h, 'baccarat', 'round_bac_1')).json();
  const expected = s.outcome.result === 'banker' ? 195 : s.outcome.result === 'tie' ? 100 : 0;
  assert.equal(s.win, expected);
});

test('american roulette has 38 pockets incl. 00', async (t) => {
  const c = await makeFixture(t), h = authHeader(await registerPlayer(c));
  assert.equal((await betReq(c, h, 'roulette-us', 'round_rus_1', { type: 'red' })).status, 201);
  const s = await (await settleReq(c, h, 'roulette-us', 'round_rus_1')).json();
  assert.ok(s.outcome.number >= 0 && s.outcome.number <= 37);
  const red = new Set([1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36]);
  assert.equal(s.win > 0, red.has(s.outcome.number));
  if (s.win > 0) assert.equal(s.win, 200);
});

test('invalid table-game choices are rejected before debit', async (t) => {
  const c = await makeFixture(t), h = authHeader(await registerPlayer(c));
  const bad = [
    ['sicbo', { bet: 'nope' }],
    ['sicbo', { bet: 'single', number: 7 }],
    ['baccarat', { bet: 'dealer' }],
    ['roulette-us', { type: 'straight', number: 38 }],
  ];
  for (const [i, [gameId, choice]] of bad.entries())
    assert.equal((await betReq(c, h, gameId, `round_badtg_${i}`, choice)).status, 400);
  assert.equal((await (await c('/api/wallet/balance', { headers: h })).json()).balance, 5000);
});
