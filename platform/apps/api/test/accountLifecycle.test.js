// Regression tests for the account-lifecycle + responsible-play endpoints.
// Each test pins a specific defect found during QA so it cannot silently return.
import test from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import { makeFixture, registerPlayer, authHeader as bearer } from './_fixture.js';

const fixture = (t) => makeFixture(t);
const sha = (v) => crypto.createHash('sha256').update(v).digest('hex');
const register = (c, email = 'player@example.com', password = 'correct horse battery') => registerPlayer(c, { email, password });

test('responsible-play POST works on first call with no existing row (upsert)', async (t) => {
  const c = await fixture(t), h = bearer(await register(c));
  const r = await c('/api/account/responsible-play', { method: 'POST', headers: h, body: JSON.stringify({ dailyLossLimit: 500 }) });
  assert.equal(r.status, 200);
  const settings = await (await c('/api/account/responsible-play', { headers: h })).json();
  assert.equal(settings.dailyLossLimit, 500);
});

test('self-exclusion cannot be cleared or shortened by an unrelated save', async (t) => {
  const c = await fixture(t), h = bearer(await register(c));
  await c('/api/account/responsible-play', { headers: h }); // create row
  assert.equal((await c('/api/account/responsible-play', { method: 'POST', headers: h, body: JSON.stringify({ selfExclusionHours: 168 }) })).status, 200);
  const before = await (await c('/api/account/responsible-play', { headers: h })).json();
  assert.ok(before.selfExcludedUntil, 'exclusion should be set');
  // An innocent save of a loss limit must NOT wipe the exclusion.
  await c('/api/account/responsible-play', { method: 'POST', headers: h, body: JSON.stringify({ dailyLossLimit: 100 }) });
  const after = await (await c('/api/account/responsible-play', { headers: h })).json();
  assert.equal(after.selfExcludedUntil, before.selfExcludedUntil, 'exclusion must survive unrelated save');
  // A shorter exclusion must not reduce the active window.
  await c('/api/account/responsible-play', { method: 'POST', headers: h, body: JSON.stringify({ selfExclusionHours: 1 }) });
  const after2 = await (await c('/api/account/responsible-play', { headers: h })).json();
  assert.equal(after2.selfExcludedUntil, before.selfExcludedUntil, 'exclusion must not be shortened');
});

test('bet is rejected during self-exclusion (server-side enforcement)', async (t) => {
  const c = await fixture(t), h = bearer(await register(c));
  await c('/api/account/responsible-play', { headers: h });
  await c('/api/account/responsible-play', { method: 'POST', headers: h, body: JSON.stringify({ selfExclusionHours: 168 }) });
  const bet = await c('/api/wallet/bet', { method: 'POST', headers: h, body: JSON.stringify({ amount: 100, gameId: 'slots-classic', roundId: 'round_excluded_1', clientSeed: 'client-seed-1' }) });
  assert.equal(bet.status, 403);
  assert.equal((await bet.json()).reason, 'self_excluded');
  // Balance untouched.
  assert.equal((await (await c('/api/wallet/balance', { headers: h })).json()).balance, 5000);
});

test('free bonus spins are blocked during self-exclusion but not by money limits', async (t) => {
  const c = await fixture(t), h = bearer(await register(c));
  await c('/api/account/responsible-play', { headers: h });
  // A daily wager limit alone must NOT block a (free) bonus spin — it should fall
  // through to normal bonus handling (here: no active session).
  await c('/api/account/responsible-play', { method: 'POST', headers: h, body: JSON.stringify({ dailyWagerLimit: 1 }) });
  const noSession = await c('/api/wallet/bonus-spin', { method: 'POST', headers: h, body: JSON.stringify({ gameId: 'slots-classic', sessionId: 'bs_missing_session_1', roundId: 'round_bonus_x1' }) });
  assert.notEqual(noSession.status, 403);
  // Self-exclusion must block it before any session lookup.
  await c('/api/account/responsible-play', { method: 'POST', headers: h, body: JSON.stringify({ selfExclusionHours: 168 }) });
  const blocked = await c('/api/wallet/bonus-spin', { method: 'POST', headers: h, body: JSON.stringify({ gameId: 'slots-classic', sessionId: 'bs_missing_session_1', roundId: 'round_bonus_x2' }) });
  assert.equal(blocked.status, 403);
  assert.equal((await blocked.json()).reason, 'self_excluded');
});

test('daily wager limit blocks further bets once reached', async (t) => {
  const c = await fixture(t), h = bearer(await register(c));
  await c('/api/account/responsible-play', { headers: h });
  await c('/api/account/responsible-play', { method: 'POST', headers: h, body: JSON.stringify({ dailyWagerLimit: 100 }) });
  assert.equal((await c('/api/wallet/bet', { method: 'POST', headers: h, body: JSON.stringify({ amount: 100, gameId: 'slots-classic', roundId: 'round_wager_1', clientSeed: 'client-seed-1' }) })).status, 201);
  const second = await c('/api/wallet/bet', { method: 'POST', headers: h, body: JSON.stringify({ amount: 10, gameId: 'slots-classic', roundId: 'round_wager_2', clientSeed: 'client-seed-2' }) });
  assert.equal(second.status, 403);
  assert.equal((await second.json()).reason, 'daily_wager_limit');
});

test('password change succeeds, keeps current session, invalidates others', async (t) => {
  const c = await fixture(t);
  const tokenA = await register(c, 'pw@example.com');
  const tokenB = (await (await c('/api/auth/login', { method: 'POST', body: JSON.stringify({ email: 'pw@example.com', password: 'correct horse battery' }) })).json()).token;
  const changed = await c('/api/account/password/change', { method: 'POST', headers: bearer(tokenB), body: JSON.stringify({ currentPassword: 'correct horse battery', newPassword: 'brand new password' }) });
  assert.equal(changed.status, 200);
  // Current session (B) still valid; the other session (A) is invalidated.
  assert.equal((await c('/api/profile', { headers: bearer(tokenB) })).status, 200);
  assert.equal((await c('/api/profile', { headers: bearer(tokenA) })).status, 401);
  // Old password rejected, new password accepted.
  assert.equal((await c('/api/auth/login', { method: 'POST', body: JSON.stringify({ email: 'pw@example.com', password: 'correct horse battery' }) })).status, 401);
  assert.equal((await c('/api/auth/login', { method: 'POST', body: JSON.stringify({ email: 'pw@example.com', password: 'brand new password' }) })).status, 200);
});

test('password change still requires the correct current password when one is set', async (t) => {
  const c = await fixture(t), h = bearer(await register(c, 'pw2@example.com'));
  const bad = await c('/api/account/password/change', { method: 'POST', headers: h, body: JSON.stringify({ currentPassword: 'wrong wrong wrong', newPassword: 'a fresh new password' }) });
  assert.equal(bad.status, 401);
  const noCur = await c('/api/account/password/change', { method: 'POST', headers: h, body: JSON.stringify({ newPassword: 'a fresh new password' }) });
  assert.equal(noCur.status, 400); // current password is mandatory for a password account
});

test('an OAuth-only account (no password) can SET an initial password without a current one', async (t) => {
  const c = await fixture(t);
  // Seed a password-less account + a valid session, as OAuth signup would produce.
  const uid = (await c.db.query("INSERT INTO users(email,display_name,password_hash)VALUES($1,$2,'')RETURNING id", ['social@example.com', 'Social'])).rows[0].id;
  const token = 'z'.repeat(48);
  await c.db.query('INSERT INTO sessions(user_id,token_hash,expires_at)VALUES($1,$2,$3)', [uid, sha(token), new Date(Date.UTC(2027, 0, 1))]);
  // No currentPassword needed — this sets the first one.
  const set = await c('/api/account/password/change', { method: 'POST', headers: bearer(token), body: JSON.stringify({ newPassword: 'my first password' }) });
  assert.equal(set.status, 200);
  assert.equal((await set.json()).wasSet, true);
  // The password now works for a normal login.
  assert.equal((await c('/api/auth/login', { method: 'POST', body: JSON.stringify({ email: 'social@example.com', password: 'my first password' }) })).status, 200);
  // And a second change now DOES require the (just-set) current password.
  const second = await c('/api/account/password/change', { method: 'POST', headers: bearer(token), body: JSON.stringify({ newPassword: 'another new password' }) });
  assert.equal(second.status, 400);
});

test('account delete anonymises the user and preserves the append-only ledger', async (t) => {
  const c = await fixture(t);
  const token = await register(c, 'gone@example.com');
  const h = bearer(token);
  await c('/api/wallet/daily-reward', { method: 'POST', headers: h }); // ledger entry
  const uid = (await c.db.query("SELECT id FROM users WHERE email='gone@example.com'")).rows[0].id;
  // Wrong / missing password rejected.
  assert.equal((await c('/api/account/delete', { method: 'POST', headers: h, body: JSON.stringify({ password: 'wrong' }) })).status, 401);
  assert.equal((await c('/api/account/delete', { method: 'POST', headers: h, body: JSON.stringify({}) })).status, 401);
  // Correct password succeeds (would 500 if it tried to delete the append-only ledger).
  assert.equal((await c('/api/account/delete', { method: 'POST', headers: h, body: JSON.stringify({ password: 'correct horse battery' }) })).status, 200);
  // Session revoked, PII anonymised, ledger preserved.
  assert.equal((await c('/api/profile', { headers: h })).status, 401);
  const u = (await c.db.query('SELECT email,display_name FROM users WHERE id=$1', [uid])).rows[0];
  assert.match(u.email, /_deleted_/);
  assert.equal(u.display_name, 'Deleted User');
  assert.ok(Number((await c.db.query('SELECT COUNT(*) n FROM wallet_ledger WHERE user_id=$1', [uid])).rows[0].n) > 0);
});

test('devices are recorded per session and revoke-others keeps only the current one', async (t) => {
  const c = await fixture(t);
  const tokenA = await register(c, 'dev@example.com');
  const tokenB = (await (await c('/api/auth/login', { method: 'POST', body: JSON.stringify({ email: 'dev@example.com', password: 'correct horse battery' }) })).json()).token;
  const list1 = await (await c('/api/account/devices', { headers: bearer(tokenB) })).json();
  assert.equal(list1.devices.length, 2, 'both sessions recorded as devices');
  assert.equal(list1.devices.filter((d) => d.current).length, 1);
  assert.equal((await c('/api/account/devices/revoke-others', { method: 'POST', headers: bearer(tokenB) })).status, 200);
  const list2 = await (await c('/api/account/devices', { headers: bearer(tokenB) })).json();
  assert.equal(list2.devices.length, 1);
  assert.equal(list2.devices[0].current, true);
  // The other session is now signed out.
  assert.equal((await c('/api/profile', { headers: bearer(tokenA) })).status, 401);
});

test('email change is rejected when the address is already taken', async (t) => {
  const c = await fixture(t);
  await register(c, 'taken@example.com');
  const h = bearer(await register(c, 'mover@example.com'));
  const r = await c('/api/account/email/request-verify', { method: 'POST', headers: h, body: JSON.stringify({ email: 'taken@example.com' }) });
  assert.equal(r.status, 409);
  assert.equal((await r.json()).error, 'email_exists');
});
