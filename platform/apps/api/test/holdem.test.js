// Casino Hold'em: stateful provably-fair poker vs dealer. E2E consistency.
import test from 'node:test';
import assert from 'node:assert/strict';
import { makeFixture, registerPlayer, authHeader } from './_fixture.js';
import { best5of7, compare, anteOdds, qualifies } from '../src/poker.js';
import { seedHash } from '../src/provablyFair.js';

const bal = async (c, h) => (await (await c('/api/wallet/balance', { headers: h })).json()).balance;
const start = (c, h, bet = 100) => c('/api/holdem/start', { method: 'POST', headers: h, body: JSON.stringify({ bet, clientSeed: 'holdem-client-seed' }) });
const action = (c, h, sessionId, move) => c('/api/holdem/action', { method: 'POST', headers: h, body: JSON.stringify({ sessionId, move }) });

// Recompute the expected result from the fully-revealed cards.
function expected(playerCards, dealerCards, community, ante = 100) {
  const call = ante * 2;
  const pBest = best5of7([...playerCards, ...community]);
  const dBest = best5of7([...dealerCards, ...community]);
  const dq = qualifies(dBest), cmp = compare(pBest, dBest), odds = anteOdds(pBest);
  if (!dq) return { status: 'won', win: ante * (1 + odds) + call };
  if (cmp > 0) return { status: 'won', win: ante * (1 + odds) + call * 2 };
  if (cmp < 0) return { status: 'lost', win: 0 };
  return { status: 'push', win: ante + call };
}

test('holdem start deals hole + flop and debits the ante', async (t) => {
  const c = await makeFixture(t), h = authHeader(await registerPlayer(c));
  const r = await start(c, h);
  assert.equal(r.status, 201);
  const b = await r.json();
  assert.equal(b.playerCards.length, 2);
  assert.equal(b.flop.length, 3);
  assert.match(b.serverSeedHash, /^[a-f0-9]{64}$/);
  assert.equal(b.balance, 4900);
});

test('holdem fold loses the ante only', async (t) => {
  const c = await makeFixture(t), h = authHeader(await registerPlayer(c));
  const st = await (await start(c, h)).json();
  const r = await (await action(c, h, st.sessionId, 'fold')).json();
  assert.equal(r.status, 'lost');
  assert.equal(r.win, 0);
  assert.equal(await bal(c, h), 4900); // ante gone, no call placed
});

test('holdem call resolves with the correct paytable and dealer qualification', async (t) => {
  const c = await makeFixture(t), h = authHeader(await registerPlayer(c));
  // Play several hands to exercise win/lose/push/no-qualify branches.
  for (let i = 0; i < 12; i++) {
    const st = await (await start(c, h)).json();
    const before = st.balance;
    const r = await (await action(c, h, st.sessionId, 'call')).json();
    const exp = expected(r.playerCards, r.dealerCards, r.community);
    assert.equal(r.status, exp.status, `hand ${i}`);
    assert.equal(r.win, exp.win, `hand ${i} win`);
    assert.equal(r.balance, before - 200 + exp.win, `hand ${i} balance`);
    assert.equal(seedHash(r.serverSeed), st.serverSeedHash);
    assert.equal((await action(c, h, st.sessionId, 'call')).status, 409); // settled
  }
});

test('holdem validation and responsible-play enforcement', async (t) => {
  const c = await makeFixture(t), h = authHeader(await registerPlayer(c));
  const st = await (await start(c, h)).json();
  assert.equal((await action(c, h, st.sessionId, 'raise')).status, 400);
  assert.equal((await action(c, h, 'holdem_missing', 'call')).status, 404);

  await c('/api/account/responsible-play', { headers: h });
  await c('/api/account/responsible-play', { method: 'POST', headers: h, body: JSON.stringify({ selfExclusionHours: 168 }) });
  const blocked = await start(c, h);
  assert.equal(blocked.status, 403);
  assert.equal((await blocked.json()).reason, 'self_excluded');
});
