// Social login (OAuth 2.0 authorization-code + PKCE, OIDC userinfo). Providers
// are supplied via config.oauthProviders (id/secret/endpoints); with none set the
// routes 404 and the providers list is empty, so the UI shows nothing. The HTTP
// calls to the provider are done through an injectable `transport` so the whole
// flow is testable without a real provider — production uses the default fetch
// transport. Session issuance is delegated to the host via `issueSession` so an
// OAuth login is identical to a password login (same cookie, same device row).
import crypto from "node:crypto";
import { rateLimiter } from "./security.js";
import { transaction } from "./db.js";

const b64url = (buf) => Buffer.from(buf).toString("base64url");
const rand = (n = 32) => b64url(crypto.randomBytes(n));
const challenge = (verifier) => b64url(crypto.createHash("sha256").update(verifier).digest());
const pick = (obj, path, fallback) => (path && obj && obj[path] != null ? obj[path] : fallback);

// Default transport: real OAuth token exchange + OIDC userinfo over fetch.
const defaultTransport = {
  async exchange(p, code, verifier, redirectUri) {
    const body = new URLSearchParams({
      grant_type: "authorization_code",
      code,
      redirect_uri: redirectUri,
      client_id: p.clientId,
      client_secret: p.clientSecret,
      code_verifier: verifier,
    });
    const r = await fetch(p.tokenUrl, {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded", accept: "application/json" },
      body,
    });
    if (!r.ok) throw new Error("token_exchange_failed");
    return r.json();
  },
  async fetchUser(p, tokens) {
    const r = await fetch(p.userInfoUrl, { headers: { authorization: `Bearer ${tokens.access_token}` } });
    if (!r.ok) throw new Error("userinfo_failed");
    return r.json();
  },
};

export function mountOauth(app, { db, config = {}, now = () => Date.now(), issueSession, auth }) {
  const providers = config.oauthProviders || {};
  const appUrl = config.oauthAppUrl || config.appUrl || "/";
  const callbackBase = config.oauthCallbackBase || "";
  const ar = (fn) => (q, s, n) => Promise.resolve(fn(q, s, n)).catch(n);
  const redirectUri = (name) => `${callbackBase}/api/auth/oauth/${name}/callback`;
  const provider = (name) => (Object.prototype.hasOwnProperty.call(providers, name) ? providers[name] : null);
  const transportFor = (p) => p.transport || config.oauthTransport || defaultTransport;

  // Best-effort: the current user id from a session cookie/bearer, or null.
  const sessionUser = async (q) => {
    const m = q.headers.authorization?.match(/^Bearer ([\w-]{40,})$/);
    const token = m?.[1] || (q.headers.cookie || "").split(";").map((x) => x.trim().split("=")).find((x) => x[0] === "casino_session")?.[1];
    if (!token || !/^[\w-]{40,}$/.test(token)) return null;
    const { rows: [r] } = await db.query(
      "SELECT user_id FROM sessions WHERE token_hash=$1 AND expires_at>$2",
      [crypto.createHash("sha256").update(token).digest("hex"), new Date(now())],
    );
    return r?.user_id ?? null;
  };

  // Public: which providers the client may show a button for.
  app.get("/api/auth/oauth/providers", (q, s) =>
    s.json({ providers: Object.keys(providers).map((id) => ({ id, label: providers[id].label || id })) }),
  );

  // Step 1 — build the authorization URL (state + PKCE) and redirect the browser.
  app.get(
    "/api/auth/oauth/:provider/start",
    rateLimiter({ limit: 30 }),
    ar(async (q, s) => {
      const name = q.params.provider;
      const p = provider(name);
      if (!p) return s.status(404).json({ error: "provider_not_found" });
      const state = rand();
      const verifier = rand(48);
      // Link intent: if the caller is already signed in and asked to link, bind
      // this flow to their account so the callback links rather than logs in.
      const linkUserId = q.query.intent === "link" ? await sessionUser(q) : null;
      await db.query(
        "INSERT INTO oauth_states(state,provider,code_verifier,redirect_to,link_user_id,expires_at)VALUES($1,$2,$3,$4,$5,$6)",
        [state, name, verifier, typeof q.query.redirect === "string" ? q.query.redirect.slice(0, 512) : null, linkUserId, new Date(now() + 600_000)],
      );
      const url = new URL(p.authUrl);
      url.searchParams.set("client_id", p.clientId);
      url.searchParams.set("redirect_uri", redirectUri(name));
      url.searchParams.set("response_type", "code");
      url.searchParams.set("scope", p.scope || "openid email profile");
      url.searchParams.set("state", state);
      url.searchParams.set("code_challenge", challenge(verifier));
      url.searchParams.set("code_challenge_method", "S256");
      s.redirect(url.toString());
    }),
  );

  // Step 2 — validate state, exchange the code, resolve the identity → user, and
  // issue a normal session, then bounce back to the app.
  app.get(
    "/api/auth/oauth/:provider/callback",
    rateLimiter({ limit: 30 }),
    ar(async (q, s) => {
      const name = q.params.provider;
      const p = provider(name);
      if (!p) return s.status(404).json({ error: "provider_not_found" });
      const { code, state } = q.query;
      if (typeof code !== "string" || typeof state !== "string") return s.status(400).json({ error: "missing_code_or_state" });

      // One-time state: consume it and verify it matches this provider + window.
      const row = (await db.query("DELETE FROM oauth_states WHERE state=$1 RETURNING *", [state])).rows[0];
      if (!row || row.provider !== name) return s.status(400).json({ error: "invalid_state" });
      if (new Date(row.expires_at) < new Date(now())) return s.status(400).json({ error: "state_expired" });

      const transport = transportFor(p);
      let profile;
      try {
        const tokens = await transport.exchange(p, code, row.code_verifier, redirectUri(name));
        profile = await transport.fetchUser(p, tokens);
      } catch {
        return s.status(502).json({ error: "oauth_exchange_failed" });
      }
      const map = p.map || {};
      const providerUserId = String(pick(profile, map.id || "sub", ""));
      const email = pick(profile, map.email || "email", null);
      const emailVerified = pick(profile, map.emailVerified || "email_verified", true) !== false;
      const name0 = pick(profile, map.name || "name", null);
      if (!providerUserId) return s.status(502).json({ error: "no_subject" });

      // Link intent: attach this identity to the already-signed-in account and
      // keep their current session (don't create a second one).
      if (row.link_user_id != null) {
        const owner = (await db.query("SELECT user_id FROM oauth_identities WHERE provider=$1 AND provider_user_id=$2", [name, providerUserId])).rows[0];
        if (owner && String(owner.user_id) !== String(row.link_user_id))
          return s.status(409).json({ error: "identity_in_use" });
        if (!owner)
          await db.query(
            "INSERT INTO oauth_identities(provider,provider_user_id,user_id,email)VALUES($1,$2,$3,$4)ON CONFLICT(provider,provider_user_id)DO NOTHING",
            [name, providerUserId, row.link_user_id, email || null],
          );
        return s.redirect(row.redirect_to && row.redirect_to.startsWith("/") ? row.redirect_to : appUrl);
      }

      const userId = await transaction(db, async (c) => {
        // 1) Known identity → that user.
        const linked = (await c.query("SELECT user_id FROM oauth_identities WHERE provider=$1 AND provider_user_id=$2", [name, providerUserId])).rows[0];
        if (linked) return linked.user_id;
        // 2) Verified email that matches an existing account → link to it.
        let uid = null;
        if (email && emailVerified) {
          const existing = (await c.query("SELECT id FROM users WHERE lower(email)=lower($1)", [email])).rows[0];
          if (existing) uid = existing.id;
        }
        // 3) Otherwise create a fresh account (OAuth-only: empty password hash).
        if (!uid) {
          let dn = String(name0 || (email ? email.split("@")[0] : "") || "Player").trim().slice(0, 40);
          if (dn.length < 2) dn = "Player";
          const syntheticEmail = email && emailVerified ? email.trim().toLowerCase() : `${name}_${providerUserId}@oauth.local`;
          const created = (await c.query(
            "INSERT INTO users(email,display_name,password_hash)VALUES($1,$2,'')RETURNING id",
            [syntheticEmail, dn],
          )).rows[0];
          uid = created.id;
          await c.query("INSERT INTO wallet_ledger(user_id,amount,kind,idempotency_key)VALUES($1,5000,'welcome',$2)", [uid, `welcome:oauth:${uid}`]);
        }
        await c.query(
          "INSERT INTO oauth_identities(provider,provider_user_id,user_id,email)VALUES($1,$2,$3,$4)ON CONFLICT(provider,provider_user_id)DO NOTHING",
          [name, providerUserId, uid, email || null],
        );
        return uid;
      });

      await issueSession(userId, q, s);
      const dest = row.redirect_to && row.redirect_to.startsWith("/") ? row.redirect_to : appUrl;
      s.redirect(dest);
    }),
  );

  // ----- Linked-account management (requires the host `auth` middleware) ------
  if (auth) {
    app.get(
      "/api/account/oauth",
      auth,
      ar(async (q, s) => {
        const rows = (await db.query(
          "SELECT provider,email,created_at FROM oauth_identities WHERE user_id=$1 ORDER BY id",
          [q.user.id],
        )).rows;
        // hasPassword tells the client whether unlinking the last identity is safe.
        const hasPassword = (await db.query("SELECT (password_hash <> '') AS v FROM users WHERE id=$1", [q.user.id])).rows[0]?.v === true;
        s.json({
          linked: rows.map((r) => ({ provider: r.provider, email: r.email, linkedAt: r.created_at })),
          hasPassword,
          available: Object.keys(providers),
        });
      }),
    );

    app.delete(
      "/api/account/oauth/:provider",
      auth,
      ar(async (q, s) => {
        const name = q.params.provider;
        const owned = (await db.query("SELECT COUNT(*) v FROM oauth_identities WHERE user_id=$1", [q.user.id])).rows[0].v;
        const hasPassword = (await db.query("SELECT (password_hash <> '') AS v FROM users WHERE id=$1", [q.user.id])).rows[0]?.v === true;
        // Never let a player strip their only means of signing in.
        if (!hasPassword && Number(owned) <= 1)
          return s.status(400).json({ error: "last_login_method" });
        await db.query("DELETE FROM oauth_identities WHERE user_id=$1 AND provider=$2", [q.user.id, name]);
        s.json({ unlinked: name });
      }),
    );
  }
}
