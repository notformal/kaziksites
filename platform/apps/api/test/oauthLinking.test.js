// Linked-account management: link a provider to a signed-in account, list links,
// safely unlink, and reject cross-account identity hijack.
import test from 'node:test';
import assert from 'node:assert/strict';
import { makeFixture, registerPlayer, authHeader } from './_fixture.js';

const providersWith = (userinfo) => ({
  mock: {
    label: 'Mock',
    clientId: 'cid',
    clientSecret: 'secret',
    authUrl: 'https://mock.test/authorize',
    tokenUrl: 'https://mock.test/token',
    userInfoUrl: 'https://mock.test/userinfo',
    transport: { exchange: async () => ({ access_token: 'tok' }), fetchUser: async () => userinfo },
  },
});
const fixture = (t, userinfo) =>
  makeFixture(t, { config: { oauthProviders: providersWith(userinfo), oauthAppUrl: 'https://app.test/', oauthCallbackBase: 'https://api.test' } });

// Run start (with optional headers, e.g. a session cookie + link intent) -> callback.
async function flow(c, { headers = {}, intent } = {}) {
  const startPath = `/api/auth/oauth/mock/start${intent ? `?intent=${intent}` : ''}`;
  const start = await c(startPath, { redirect: 'manual', headers });
  const state = new URL(start.headers.get('location')).searchParams.get('state');
  return c(`/api/auth/oauth/mock/callback?code=abc&state=${encodeURIComponent(state)}`, { redirect: 'manual', headers });
}

test('a signed-in user links a provider to their existing account (no new user)', async (t) => {
  const c = await fixture(t, { sub: 'g-1', email: 'social@ex.com', email_verified: true, name: 'Social' });
  const token = await registerPlayer(c, { email: 'me@ex.com', displayName: 'Me' });
  const h = authHeader(token);
  const uid = (await (await c('/api/profile', { headers: h })).json()).user.id;

  const cb = await flow(c, { headers: h, intent: 'link' });
  assert.equal(cb.status, 302);
  // No second session cookie is minted for a link.
  assert.equal(cb.headers.get('set-cookie'), null);
  const list = await (await c('/api/account/oauth', { headers: h })).json();
  assert.equal(list.linked.length, 1);
  assert.equal(list.linked[0].provider, 'mock');
  assert.equal(list.hasPassword, true);
  // Exactly one user exists, and the identity points at them.
  assert.equal(Number((await c.db.query('SELECT COUNT(*) v FROM users')).rows[0].v), 1);
  const owner = (await c.db.query('SELECT user_id FROM oauth_identities WHERE provider=$1 AND provider_user_id=$2', ['mock', 'g-1'])).rows[0];
  assert.equal(String(owner.user_id), String(uid));
});

test('linking an identity already owned by another account is rejected', async (t) => {
  const c = await fixture(t, { sub: 'shared-1', email: 'a@ex.com', email_verified: true, name: 'A' });
  // User A logs in via OAuth (creates + links identity shared-1).
  await flow(c);
  // User B (password account) tries to link the SAME identity.
  const hB = authHeader(await registerPlayer(c, { email: 'b@ex.com', displayName: 'Bee' }));
  const cb = await flow(c, { headers: hB, intent: 'link' });
  assert.equal(cb.status, 409);
});

test('without link intent, a signed-in user just logs in (identity resolves normally)', async (t) => {
  const c = await fixture(t, { sub: 'x-9', email: 'x@ex.com', email_verified: true, name: 'X' });
  const h = authHeader(await registerPlayer(c, { email: 'me@ex.com', displayName: 'Me' }));
  const cb = await flow(c, { headers: h }); // no intent -> login flow, new account for x@ex.com
  assert.equal(cb.status, 302);
  assert.ok(cb.headers.get('set-cookie')); // a fresh session was issued
  assert.equal(Number((await c.db.query('SELECT COUNT(*) v FROM users')).rows[0].v), 2);
});

test('unlink removes the link, but not the last login method of a password-less account', async (t) => {
  const c = await fixture(t, { sub: 'only-1', email: 'oauth@ex.com', email_verified: true, name: 'OAuthOnly' });
  // OAuth-only account (no password).
  const login = await flow(c);
  const cookie = login.headers.get('set-cookie').match(/casino_session=([^;]+)/)[1];
  const h = { cookie: `casino_session=${cookie}` };
  const before = await (await c('/api/account/oauth', { headers: h })).json();
  assert.equal(before.hasPassword, false);
  assert.equal(before.linked.length, 1);
  // Removing the only login method is blocked.
  assert.equal((await c('/api/account/oauth/mock', { method: 'DELETE', headers: h })).status, 400);
});

test('unlink succeeds when a password (or another identity) remains', async (t) => {
  const c = await fixture(t, { sub: 'p-1', email: 'me@ex.com', email_verified: true, name: 'Me' });
  const h = authHeader(await registerPlayer(c, { email: 'me@ex.com', displayName: 'Me' }));
  await flow(c, { headers: h, intent: 'link' }); // link onto a password account
  const del = await c('/api/account/oauth/mock', { method: 'DELETE', headers: h });
  assert.equal(del.status, 200);
  assert.equal((await (await c('/api/account/oauth', { headers: h })).json()).linked.length, 0);
});

test('the linked-accounts endpoint requires auth', async (t) => {
  const c = await fixture(t, { sub: '1', email: 'a@ex.com' });
  assert.equal((await c('/api/account/oauth')).status, 401);
});
