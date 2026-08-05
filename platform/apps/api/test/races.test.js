// Races / tournaments: derived standings + idempotent prize settlement.
import test from 'node:test';
import assert from 'node:assert/strict';
import { makeFixture, registerPlayer, authHeader } from './_fixture.js';

const uidOf = async (c, h) => (await (await c('/api/profile', { headers: h })).json()).user.id;
const bal = async (c, h) => (await (await c('/api/wallet/balance', { headers: h })).json()).balance;

async function setup(c) {
  const t0 = Date.now();
  const betAt = new Date(t0 - 5 * 86400e3); // 5 days ago (inside the window)
  const startsAt = new Date(t0 - 6 * 86400e3).toISOString();
  const endsAt = new Date(t0 - 4 * 86400e3).toISOString(); // already ended
  const players = [];
  for (const [email, wager] of [['a@ex.com', 5000], ['b@ex.com', 3000], ['c@ex.com', 1000]]) {
    const h = authHeader(await registerPlayer(c, { email }));
    const uid = await uidOf(c, h);
    await c.db.query("INSERT INTO wallet_ledger(user_id,amount,kind,idempotency_key,created_at)VALUES($1,$2,'bet',$3,$4)", [uid, -wager, `seed:${uid}`, betAt]);
    players.push({ email, wager, h, uid });
  }
  await c.db.query("INSERT INTO races(id,name,starts_at,ends_at,prize_pool)VALUES($1,'Weekly Race',$2,$3,$4)", ['race_1', startsAt, endsAt, 10000]);
  return players;
}

test('race standings rank players by wagered, aliased, with a self marker', async (t) => {
  const c = await makeFixture(t);
  const players = await setup(c);
  const r = await (await c('/api/races/race_1', { headers: players[0].h })).json();
  assert.equal(r.standings.length, 3);
  assert.deepEqual(r.standings.map((x) => x.wagered), [5000, 3000, 1000]);
  assert.match(r.standings[0].alias, /^Player #[0-9A-F]{4}$/);
  assert.equal(r.standings[0].you, true); // player a is the caller
  assert.equal(r.myRank, 1);
  assert.deepEqual(r.prizes, [{ rank: 1, prize: 5000 }, { rank: 2, prize: 3000 }, { rank: 3, prize: 2000 }]);
});

test('race settlement pays the pool to the top 3, idempotently', async (t) => {
  const c = await makeFixture(t);
  const players = await setup(c);
  const before = await Promise.all(players.map((p) => bal(c, p.h)));
  const settle = await (await c('/api/races/race_1/settle', { method: 'POST', headers: players[0].h })).json();
  assert.deepEqual(settle.payouts.map((p) => p.prize), [5000, 3000, 2000]); // 50/30/20% of 10000
  const after = await Promise.all(players.map((p) => bal(c, p.h)));
  assert.equal(after[0] - before[0], 5000);
  assert.equal(after[1] - before[1], 3000);
  assert.equal(after[2] - before[2], 2000);
  // Settling again is a no-op.
  assert.equal((await c('/api/races/race_1/settle', { method: 'POST', headers: players[0].h })).status, 409);
  assert.deepEqual(await Promise.all(players.map((p) => bal(c, p.h))), after);
});

test('an active race cannot be settled early; unknown race is 404', async (t) => {
  const c = await makeFixture(t);
  const h = authHeader(await registerPlayer(c));
  const t0 = Date.now();
  await c.db.query("INSERT INTO races(id,name,starts_at,ends_at,prize_pool)VALUES($1,'Live',$2,$3,$4)", ['race_live', new Date(t0 - 86400e3).toISOString(), new Date(t0 + 86400e3).toISOString(), 5000]);
  assert.equal((await c('/api/races/race_live/settle', { method: 'POST', headers: h })).status, 400); // not ended
  assert.equal((await c('/api/races/nope/settle', { method: 'POST', headers: h })).status, 404);
  const list = await (await c('/api/races', { headers: h })).json();
  assert.ok(list.races.find((x) => x.id === 'race_live')?.active);
});
