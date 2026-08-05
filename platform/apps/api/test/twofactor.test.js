// Two-factor authentication (TOTP, RFC 6238) — unit vectors + full enrol/login flow.
import test from 'node:test';
import assert from 'node:assert/strict';
import { makeFixture, registerPlayer, authHeader } from './_fixture.js';
import { totp, verifyTotp, base32Encode } from '../src/totp.js';

const NOW = Date.UTC(2026, 6, 13); // matches the fixture clock

test('TOTP matches the RFC 6238 test vectors (SHA-1, 6 digits)', () => {
  const secret = base32Encode(Buffer.from('12345678901234567890'));
  assert.equal(secret, 'GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ');
  assert.equal(totp(secret, 59_000), '287082');
  assert.equal(totp(secret, 1111111109_000), '081804');
  assert.equal(totp(secret, 1234567890_000), '005924');
  assert.equal(totp(secret, 2000000000_000), '279037');
  assert.equal(verifyTotp(secret, '287082', 59_000), true);
  assert.equal(verifyTotp(secret, '000000', 59_000), false);
  assert.equal(verifyTotp(secret, 'abc', 59_000), false);
});

test('2FA enrolment gates login on a valid code', async (t) => {
  const c = await makeFixture(t);
  const h = authHeader(await registerPlayer(c));
  const creds = { email: 'player@example.com', password: 'correct horse battery' };

  const setup = await (await c('/api/account/2fa/setup', { method: 'POST', headers: h })).json();
  assert.ok(setup.secret);
  assert.match(setup.otpauth, /^otpauth:\/\/totp\/Nova%20Casino:/);

  // Wrong code cannot enable.
  assert.equal((await c('/api/account/2fa/enable', { method: 'POST', headers: h, body: JSON.stringify({ code: '000000' }) })).status, 401);
  // Correct code enables.
  assert.equal((await c('/api/account/2fa/enable', { method: 'POST', headers: h, body: JSON.stringify({ code: totp(setup.secret, NOW) }) })).status, 200);
  assert.equal((await (await c('/api/account/2fa', { headers: h })).json()).enabled, true);

  // Login now requires the code.
  const noCode = await c('/api/auth/login', { method: 'POST', body: JSON.stringify(creds) });
  assert.equal(noCode.status, 401);
  assert.equal((await noCode.json()).error, 'totp_required');
  assert.equal((await c('/api/auth/login', { method: 'POST', body: JSON.stringify({ ...creds, totp: totp(setup.secret, NOW) }) })).status, 200);

  // Disable (needs a code), then plain login works again.
  assert.equal((await c('/api/account/2fa/disable', { method: 'POST', headers: h, body: JSON.stringify({ code: totp(setup.secret, NOW) }) })).status, 200);
  assert.equal((await c('/api/auth/login', { method: 'POST', body: JSON.stringify(creds) })).status, 200);
});

test('cannot re-setup while 2FA is already enabled', async (t) => {
  const c = await makeFixture(t);
  const h = authHeader(await registerPlayer(c));
  const setup = await (await c('/api/account/2fa/setup', { method: 'POST', headers: h })).json();
  await c('/api/account/2fa/enable', { method: 'POST', headers: h, body: JSON.stringify({ code: totp(setup.secret, NOW) }) });
  assert.equal((await c('/api/account/2fa/setup', { method: 'POST', headers: h })).status, 409);
});
