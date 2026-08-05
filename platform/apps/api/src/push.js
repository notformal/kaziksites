// Web Push layer. What lives here (and is tested): VAPID application-server key
// exposure, subscription CRUD, and dispatch() — which fans a payload out to a
// user's subscriptions and prunes endpoints the push service reports as gone
// (404/410). The actual encrypted POST to the push service is delegated to an
// injected `sender` (config.pushSender), so the platform stays dependency-free;
// a production deployment wires a web-push-backed sender. Without one, delivery
// is a no-op but every subscription/prune path still works.
import crypto from "node:crypto";
import { rateLimiter } from "./security.js";

// A P-256 keypair whose raw public point (04||X||Y, base64url) is the key a
// browser needs to subscribe. Generated per-process when none is configured —
// fine for dev; production sets config.vapidPublicKey (+ a matching sender).
function generateVapid() {
  const { publicKey } = crypto.generateKeyPairSync("ec", { namedCurve: "prime256v1" });
  const der = publicKey.export({ type: "spki", format: "der" });
  return der.subarray(der.length - 65).toString("base64url"); // last 65 bytes = uncompressed point
}

const isStr = (v, max = 2048) => typeof v === "string" && v.length > 0 && v.length <= max;

export function mountPush(app, { db, config = {}, now = () => Date.now() }) {
  const vapidPublicKey = config.vapidPublicKey || generateVapid();
  const sender = typeof config.pushSender === "function" ? config.pushSender : null;
  const ar = (fn) => (q, s, n) => Promise.resolve(fn(q, s, n)).catch(n);

  const auth = ar(async (q, s, n) => {
    const m = q.headers.authorization?.match(/^Bearer ([\w-]{40,})$/);
    const token = m?.[1] || (q.headers.cookie || "").split(";").map((x) => x.trim().split("=")).find((x) => x[0] === "casino_session")?.[1];
    if (!token || !/^[\w-]{40,}$/.test(token)) return s.status(401).json({ error: "unauthorized" });
    const { rows: [u] } = await db.query(
      "SELECT user_id FROM sessions WHERE token_hash=$1 AND expires_at>$2",
      [crypto.createHash("sha256").update(token).digest("hex"), new Date(now())],
    );
    if (!u) return s.status(401).json({ error: "unauthorized" });
    q.userId = u.user_id;
    n();
  });

  // The key a browser passes to pushManager.subscribe(). Public by design.
  app.get("/api/push/vapid", (q, s) => s.json({ publicKey: vapidPublicKey, configured: !!sender }));

  app.post(
    "/api/push/subscribe",
    auth,
    rateLimiter({ limit: 30 }),
    ar(async (q, s) => {
      const { endpoint, keys } = q.body || {};
      if (!isStr(endpoint) || !keys || !isStr(keys.p256dh, 256) || !isStr(keys.auth, 256))
        return s.status(400).json({ error: "invalid_subscription" });
      // Endpoint is globally unique; re-subscribing re-homes it to this user.
      await db.query(
        "INSERT INTO push_subscriptions(user_id,endpoint,p256dh,auth)VALUES($1,$2,$3,$4)" +
          "ON CONFLICT(endpoint)DO UPDATE SET user_id=EXCLUDED.user_id,p256dh=EXCLUDED.p256dh,auth=EXCLUDED.auth",
        [q.userId, endpoint, keys.p256dh, keys.auth],
      );
      s.status(201).json({ subscribed: true });
    }),
  );

  app.post(
    "/api/push/unsubscribe",
    auth,
    rateLimiter({ limit: 30 }),
    ar(async (q, s) => {
      const { endpoint } = q.body || {};
      if (!isStr(endpoint)) return s.status(400).json({ error: "invalid_subscription" });
      await db.query("DELETE FROM push_subscriptions WHERE user_id=$1 AND endpoint=$2", [q.userId, endpoint]);
      s.json({ unsubscribed: true });
    }),
  );

  app.get(
    "/api/push/status",
    auth,
    ar(async (q, s) => {
      const n = Number((await db.query("SELECT COUNT(*) v FROM push_subscriptions WHERE user_id=$1", [q.userId])).rows[0].v);
      s.json({ subscriptions: n, configured: !!sender });
    }),
  );

  // Fan a payload out to every subscription of `userId`. Best-effort: each send
  // is independent; a 404/410 ("gone") prunes that dead endpoint. Returns the
  // number of live sends attempted. Never throws.
  async function dispatch(userId, payload) {
    if (!sender) return 0;
    const subs = (await db.query("SELECT id,endpoint,p256dh,auth FROM push_subscriptions WHERE user_id=$1", [userId])).rows;
    if (!subs.length) return 0;
    const body = JSON.stringify(payload);
    const dead = [];
    await Promise.all(
      subs.map(async (row) => {
        const sub = { endpoint: row.endpoint, keys: { p256dh: row.p256dh, auth: row.auth } };
        try {
          await sender(sub, body);
        } catch (e) {
          const code = e?.statusCode || e?.status;
          if (code === 404 || code === 410) dead.push(row.id);
        }
      }),
    );
    if (dead.length) await db.query(`DELETE FROM push_subscriptions WHERE id IN (${dead.map((_, i) => `$${i + 1}`).join(",")})`, dead);
    return subs.length - dead.length;
  }

  return { dispatch, vapidPublicKey, hasSender: !!sender };
}
