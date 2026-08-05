// Social login (OAuth2 + PKCE) — full flow exercised through an injected fake
// transport so no real provider is contacted. Covers state/PKCE, find-or-create,
// email linking, identity reuse, and session issuance.
import test from 'node:test';
import assert from 'node:assert/strict';
import { makeFixture, registerPlayer } from './_fixture.js';

const makeTransport = (userinfo) => ({
  exchange: async () => ({ access_token: 'tok', id_token: 'jwt' }),
  fetchUser: async () => userinfo,
});
const providersWith = (userinfo) => ({
  mock: {
    label: 'Mock',
    clientId: 'cid',
    clientSecret: 'secret',
    authUrl: 'https://mock.test/authorize',
    tokenUrl: 'https://mock.test/token',
    userInfoUrl: 'https://mock.test/userinfo',
    transport: makeTransport(userinfo),
  },
});
const oauthFixture = (t, userinfo) =>
  makeFixture(t, {
    config: {
      oauthProviders: providersWith(userinfo),
      oauthAppUrl: 'https://app.test/',
      oauthCallbackBase: 'https://api.test',
    },
  });

// Drive start -> extract state -> callback; return the callback Response.
async function login(c, opts = {}) {
  const start = await c('/api/auth/oauth/mock/start', { redirect: 'manual' });
  assert.equal(start.status, 302, 'start redirects');
  const url = new URL(start.headers.get('location'));
  const state = url.searchParams.get('state');
  return c(`/api/auth/oauth/mock/callback?code=abc123&state=${encodeURIComponent(state)}`, { redirect: 'manual', ...opts });
}
const cookieOf = (res) => (res.headers.get('set-cookie') || '').match(/casino_session=([^;]+)/)?.[1];

test('start redirects to the provider with PKCE + state', async (t) => {
  const c = await oauthFixture(t, { sub: '1', email: 'a@ex.com', email_verified: true, name: 'Aria' });
  const r = await c('/api/auth/oauth/mock/start', { redirect: 'manual' });
  assert.equal(r.status, 302);
  const u = new URL(r.headers.get('location'));
  assert.equal(u.origin + u.pathname, 'https://mock.test/authorize');
  assert.equal(u.searchParams.get('client_id'), 'cid');
  assert.equal(u.searchParams.get('redirect_uri'), 'https://api.test/api/auth/oauth/mock/callback');
  assert.equal(u.searchParams.get('code_challenge_method'), 'S256');
  assert.match(u.searchParams.get('code_challenge'), /^[\w-]{43}$/); // base64url SHA-256
  assert.ok(u.searchParams.get('state'));
});

test('callback creates a user, links the identity, and issues a working session', async (t) => {
  const c = await oauthFixture(t, { sub: '42', email: 'newbie@ex.com', email_verified: true, name: 'Newbie' });
  const cb = await login(c);
  assert.equal(cb.status, 302);
  assert.equal(cb.headers.get('location'), 'https://app.test/');
  const token = cookieOf(cb);
  assert.ok(token, 'a session cookie is set');
  const prof = await (await c('/api/profile', { headers: { cookie: `casino_session=${token}` } })).json();
  assert.equal(prof.user.email, 'newbie@ex.com');
  assert.equal(prof.user.displayName, 'Newbie');
  // The welcome credit was granted like a normal signup.
  const w = await (await c('/api/wallet', { headers: { cookie: `casino_session=${token}` } })).json();
  assert.equal(w.balance, 5000);
});

test('a second login with the same identity reuses the account (no duplicate)', async (t) => {
  const c = await oauthFixture(t, { sub: '42', email: 'again@ex.com', email_verified: true, name: 'Again' });
  await login(c);
  await login(c);
  const n = Number((await c.db.query('SELECT COUNT(*) v FROM users')).rows[0].v);
  assert.equal(n, 1);
  const ids = Number((await c.db.query('SELECT COUNT(*) v FROM oauth_identities')).rows[0].v);
  assert.equal(ids, 1);
});

test('a verified email links to an existing password account instead of forking it', async (t) => {
  const c = await oauthFixture(t, { sub: '77', email: 'linkme@ex.com', email_verified: true, name: 'Linked' });
  await registerPlayer(c, { email: 'linkme@ex.com', displayName: 'Original' });
  await login(c);
  const n = Number((await c.db.query('SELECT COUNT(*) v FROM users')).rows[0].v);
  assert.equal(n, 1, 'linked, not duplicated');
  const link = (await c.db.query('SELECT user_id FROM oauth_identities WHERE provider=$1 AND provider_user_id=$2', ['mock', '77'])).rows[0];
  assert.ok(link);
});

test('an unverified email does NOT auto-link; a fresh account is made', async (t) => {
  const c = await oauthFixture(t, { sub: '88', email: 'takeover@ex.com', email_verified: false, name: 'Sneaky' });
  await registerPlayer(c, { email: 'takeover@ex.com', displayName: 'Victim' });
  await login(c);
  const n = Number((await c.db.query('SELECT COUNT(*) v FROM users')).rows[0].v);
  assert.equal(n, 2, 'no takeover: a separate account is created');
});

test('a bad or missing state is rejected', async (t) => {
  const c = await oauthFixture(t, { sub: '1', email: 'a@ex.com', email_verified: true });
  const r = await c('/api/auth/oauth/mock/callback?code=x&state=forged', { redirect: 'manual' });
  assert.equal(r.status, 400);
  const r2 = await c('/api/auth/oauth/mock/callback?code=x', { redirect: 'manual' });
  assert.equal(r2.status, 400);
});

test('state is single-use (a replayed callback fails)', async (t) => {
  const c = await oauthFixture(t, { sub: '5', email: 'once@ex.com', email_verified: true });
  const start = await c('/api/auth/oauth/mock/start', { redirect: 'manual' });
  const state = new URL(start.headers.get('location')).searchParams.get('state');
  const first = await c(`/api/auth/oauth/mock/callback?code=a&state=${encodeURIComponent(state)}`, { redirect: 'manual' });
  assert.equal(first.status, 302);
  const replay = await c(`/api/auth/oauth/mock/callback?code=a&state=${encodeURIComponent(state)}`, { redirect: 'manual' });
  assert.equal(replay.status, 400, 'state already consumed');
});

test('providers list is public; unknown/unconfigured providers 404', async (t) => {
  const c = await oauthFixture(t, { sub: '1', email: 'a@ex.com' });
  const list = await (await c('/api/auth/oauth/providers')).json();
  assert.deepEqual(list.providers, [{ id: 'mock', label: 'Mock' }]);
  assert.equal((await c('/api/auth/oauth/unknown/start', { redirect: 'manual' })).status, 404);

  const plain = await makeFixture(t); // no providers configured
  assert.deepEqual((await (await plain('/api/auth/oauth/providers')).json()).providers, []);
  assert.equal((await plain('/api/auth/oauth/mock/start', { redirect: 'manual' })).status, 404);
});
