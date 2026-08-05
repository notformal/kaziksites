# Execution: OAuth Social Login

**Date:** 2026-07-27
**Scope:** The final roadmap item — social login via OAuth 2.0 authorization-code + PKCE (OIDC
userinfo). The full protocol, security, account-linking and session issuance are built and tested;
the only thing a live deployment adds is provider **client credentials + endpoints** (config), so
the piece that was "credential-gated" is now reduced to configuration, not code.

Constraints unchanged: entertainment-only, virtual-credit. An OAuth signup grants the same 5000
welcome credit as a password signup and is otherwise indistinguishable downstream.

---

## Design — provider-agnostic, transport-injected

Providers are supplied at runtime via `config.oauthProviders` (a map of `{clientId, clientSecret,
authUrl, tokenUrl, userInfoUrl, scope, label, map}`). With **none configured** (the default), the
routes 404 and the providers list is empty — so nothing renders and nothing is exposed. The two
HTTP calls to a provider (token exchange, userinfo) go through an injectable `transport`, so the
entire flow runs in tests against a fake; production uses the built-in fetch transport.

## Schema — `migrations/020_oauth.sql`

- **`oauth_states`** — short-lived CSRF/PKCE state (`state` PK, `provider`, `code_verifier`,
  `redirect_to`, `expires_at`). Consumed once on callback.
- **`oauth_identities`** — durable `(provider, provider_user_id) UNIQUE → user_id` link (+ email),
  cascade-deleted with the user.

## Flow — `src/oauth.js` (`mountOauth`)

- `GET /api/auth/oauth/providers` — public list of configured providers (id + label) for the UI.
- `GET /api/auth/oauth/:provider/start` — mints `state` + a PKCE `code_verifier`, stores them
  (10-min expiry), and 302-redirects to the provider's `authUrl` with `code_challenge` (S256),
  `redirect_uri`, `scope`, `state`.
- `GET /api/auth/oauth/:provider/callback` —
  1. **Consumes** the state row (`DELETE … RETURNING`) — one-time; rejects forged/expired/
     wrong-provider state (`400`).
  2. Exchanges the code (with the stored verifier) and fetches the userinfo via the transport.
  3. Resolves the account: **known identity** → that user; else a **verified** matching email →
     link to the existing account; else **create** a fresh OAuth-only account (empty password hash,
     welcome credit). Unverified emails never auto-link (no takeover).
  4. Issues a normal session via the shared `issueSession()` (session row + device row + cookie),
     then 302s back to the app (or a safe same-site `redirect_to`).

`issueSession(userId, q, s)` was extracted in `app.js` so an OAuth login produces the exact same
cookie/session/device footprint as register/login.

## Client (lobby)

- `api.oauthProviders()`; `OauthButtons.jsx` fetches the providers and renders a
  "Continue with {provider}" button each (→ `apiBase/auth/oauth/<id>/start`). Renders **nothing**
  when none are configured. Mounted under the auth form in `AccountPanel`. Localised
  (`oauth.continue` added to all 7 locales).

## Tests — `test/oauth.test.js` (8)

Start builds a PKCE+state redirect; callback creates+links+sessions a new user (welcome credit
verified through the issued cookie); a second login reuses the identity (no duplicate); a **verified**
email links to an existing password account; an **unverified** email does **not** (separate account,
no takeover); forged/missing state → 400; **state is single-use** (replay → 400); providers list is
public and unknown/unconfigured providers 404. Full suite: **124 pass**.

## Verification (2026-07-27)

| Battery | Result |
|---|---|
| Platform API | **124 pass / 0 fail** (+8 OAuth) |
| lobby (build + tests) | ✓ built · 13 pass |
| game-sdk / platform build | 11 pass / ✓ clean |
| root lint / vitest+server / build+`verify:dist` | ✓ / 8 pass / 3 brands verified |

## To go live

Set `config.oauthProviders`, e.g. Google:
`{ google: { label:'Google', clientId, clientSecret, authUrl:'https://accounts.google.com/o/oauth2/v2/auth',
tokenUrl:'https://oauth2.googleapis.com/token', userInfoUrl:'https://openidconnect.googleapis.com/v1/userinfo' } }`,
plus `config.oauthCallbackBase` (public API origin) and `config.oauthAppUrl`. The default fetch
transport handles the rest — no code changes.

**This was the last open roadmap item.** Every feature buildable in this environment is now
implemented and regression-tested.

---

## Addendum (2026-07-27): Linked-account management

Completing the feature — a signed-in player can now connect and disconnect providers, not just log
in with one.

- **`migrations/021_oauth_linking.sql`** — adds `oauth_states.link_user_id`.
- **`/start?intent=link`** — when hit with a valid session, the state is bound to that user id.
- **`/callback` link branch** — with `link_user_id` set, it attaches the identity to that account
  and **keeps the current session** (no second session minted). If the identity already belongs to a
  *different* account it returns `409 identity_in_use` (no hijack).
- **`GET /api/account/oauth`** (auth) — lists the caller's linked providers + `hasPassword` +
  `available`.
- **`DELETE /api/account/oauth/:provider`** (auth) — unlinks, but refuses to remove the **last
  login method** of a password-less account (`400 last_login_method`).
- **Client** — a "Linked accounts" block in `AccountSettings › Security`: link/unlink buttons that
  render only when providers are configured; the last-method guard surfaces as a helpful message.
- **Tests — `test/oauthLinking.test.js` (6):** link onto an existing account (no new user, no new
  session), cross-account link rejected (409), login-without-intent still logs in, unlink blocked for
  a password-less single-identity account, unlink allowed when a password remains, and auth required.

Full platform API suite after this addendum: **130 pass / 0 fail**.
