// Blackjack: stateful provably-fair. Pure engine + state-machine E2E.
import test from 'node:test';
import assert from 'node:assert/strict';
import { makeFixture, registerPlayer, authHeader } from './_fixture.js';
import { handValue, isBlackjack, dealerShouldHit, resolve } from '../src/blackjack.js';
import { seedHash } from '../src/provablyFair.js';

const card = (rank, suit = 0) => ({ rank, suit });

test('blackjack engine: values, soft aces, blackjack, dealer rule, resolve', () => {
  assert.equal(handValue([card(1), card(13)]).total, 21); // A + K
  assert.equal(isBlackjack([card(1), card(13)]), true);
  assert.equal(handValue([card(1), card(6), card(13)]).total, 17); // A demotes: 1+6+10
  assert.equal(handValue([card(1), card(1), card(9)]).total, 21); // A,A,9 = 21 soft
  assert.equal(dealerShouldHit([card(10), card(6)]), true); // 16 -> hit
  assert.equal(dealerShouldHit([card(10), card(7)]), false); // 17 -> stand
  assert.equal(dealerShouldHit([card(1), card(6)]), false); // soft 17 -> stand (S17)
  assert.equal(resolve([card(10), card(10)], [card(10), card(9)]), 'won'); // 20 vs 19
  assert.equal(resolve([card(10), card(10)], [card(10), card(10)]), 'push');
  assert.equal(resolve([card(10), card(5), card(9)], [card(10), card(7)]), 'lost'); // player 24 bust
});

const bal = async (c, h) => (await (await c('/api/wallet/balance', { headers: h })).json()).balance;
const start = (c, h, bet = 100) => c('/api/blackjack/start', { method: 'POST', headers: h, body: JSON.stringify({ bet, clientSeed: 'blackjack-seed' }) });
const action = (c, h, sessionId, move) => c('/api/blackjack/action', { method: 'POST', headers: h, body: JSON.stringify({ sessionId, move }) });
const expectedWin = (result, staked) => Math.floor((staked * (result === 'won' ? 2000 : result === 'push' ? 1000 : 0)) / 1000);

test('blackjack start deals two cards and debits the bet', async (t) => {
  const c = await makeFixture(t), h = authHeader(await registerPlayer(c));
  const r = await start(c, h);
  assert.equal(r.status, 201);
  const b = await r.json();
  assert.equal(b.playerCards.length, 2);
  assert.equal(b.playerValue, handValue(b.playerCards).total);
  assert.match(b.serverSeedHash, /^[a-f0-9]{64}$/);
  // The bet (100) is always debited; if the deal is a natural it also resolves +
  // pays immediately. This invariant holds for every case — active (win
  // undefined → 4900), player-BJ win (5150), push (5000), dealer-BJ loss (4900).
  assert.equal(await bal(c, h), 4900 + (b.win || 0));
});

test('blackjack stand resolves consistently and pays the rule', async (t) => {
  const c = await makeFixture(t), h = authHeader(await registerPlayer(c));
  let done = null;
  for (let i = 0; i < 20 && !done; i++) {
    const before = await bal(c, h);
    const st = await (await start(c, h)).json();
    if (st.status !== 'active') continue; // resolved at start (natural)
    const r = await (await action(c, h, st.sessionId, 'stand')).json();
    assert.equal(r.status, resolve(r.playerCards, r.dealerCards));
    assert.equal(r.win, expectedWin(r.status, 100));
    assert.equal(r.balance, before - 100 + r.win);
    assert.equal(seedHash(r.serverSeed), st.serverSeedHash);
    assert.equal((await action(c, h, st.sessionId, 'hit')).status, 409); // settled
    done = true;
  }
  assert.ok(done, 'expected an active hand within 20 starts');
});

test('blackjack hit busts over 21 and double stakes two bets', async (t) => {
  const c = await makeFixture(t), h = authHeader(await registerPlayer(c));
  // Hit path.
  let hitOk = null;
  for (let i = 0; i < 20 && !hitOk; i++) {
    const st = await (await start(c, h)).json();
    if (st.status !== 'active') continue;
    const r = await (await action(c, h, st.sessionId, 'hit')).json();
    if (handValue(r.playerCards).total > 21) assert.equal(r.status, 'lost');
    else assert.equal(r.status, 'active');
    hitOk = true;
  }
  assert.ok(hitOk);
  // Double path.
  let dblOk = null;
  for (let i = 0; i < 20 && !dblOk; i++) {
    const before = await bal(c, h);
    const st = await (await start(c, h)).json();
    if (st.status !== 'active') continue;
    const r = await (await action(c, h, st.sessionId, 'double')).json();
    assert.ok(['won', 'lost', 'push'].includes(r.status));
    assert.equal(r.win, expectedWin(r.status, 200)); // doubled stake
    assert.equal(r.balance, before - 200 + r.win);
    dblOk = true;
  }
  assert.ok(dblOk);
});

test('natural blackjack pays 3:2 (or pushes vs dealer blackjack)', async (t) => {
  const c = await makeFixture(t), h = authHeader(await registerPlayer(c));
  let bj = null;
  // Vary the client seed each hand so the 300 trials are INDEPENDENT (a fixed
  // seed correlates the deals and made this hunt flaky). ~4.8%/hand ⇒ miss ≈ 5e-7.
  for (let i = 0; i < 300 && !bj; i++) {
    const st = await (await c('/api/blackjack/start', { method: 'POST', headers: h, body: JSON.stringify({ bet: 1, clientSeed: `bj-natural-${i}` }) })).json();
    if (st.blackjack) bj = st;
  }
  assert.ok(bj, 'expected a natural blackjack');
  assert.equal(bj.win, bj.status === 'won' ? 2 : 1); // 3:2 on 1 credit, or push
  assert.equal(seedHash(bj.serverSeed), bj.serverSeedHash);
});

test('blackjack validation and responsible-play enforcement', async (t) => {
  const c = await makeFixture(t), h = authHeader(await registerPlayer(c));
  const st = await (await start(c, h)).json();
  if (st.status === 'active') {
    assert.equal((await action(c, h, st.sessionId, 'jump')).status, 400); // invalid move
    const afterHit = await (await action(c, h, st.sessionId, 'hit')).json();
    if (afterHit.status === 'active') // only if the hit didn't bust the hand
      assert.equal((await action(c, h, st.sessionId, 'double')).status, 400); // can't double after a hit
  }
  assert.equal((await action(c, h, 'bj_missing', 'hit')).status, 404);

  await c('/api/account/responsible-play', { headers: h });
  await c('/api/account/responsible-play', { method: 'POST', headers: h, body: JSON.stringify({ selfExclusionHours: 168 }) });
  const blocked = await start(c, h);
  assert.equal(blocked.status, 403);
  assert.equal((await blocked.json()).reason, 'self_excluded');
});
