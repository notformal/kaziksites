// Operator backoffice (Player Account Management). Admin-key gated. Everything
// here stays inside the entertainment-only / virtual-credit model: balance
// changes are append-only `adjustment` ledger rows (never UPDATE/DELETE), and
// responsible-play interventions reuse the same extend-only self-exclusion rule
// as the player-facing control so an operator can help but not weaken it.
import crypto from "node:crypto";
import { readFileSync } from "node:fs";
import { rateLimiter } from "./security.js";
import { transaction } from "./db.js";
import { levelFromXp, rankOf } from "./progression.js";

// The operator console is a single self-contained page; the admin key is entered
// in the UI and sent as X-Admin-Key (it is never embedded here). Served from the
// API so it is same-origin with the endpoints it calls.
const CONSOLE_HTML = readFileSync(new URL("./admin-console.html", import.meta.url), "utf8");

const safeEqual = (a, b) => {
  const x = Buffer.from(a || ""), y = Buffer.from(b || "");
  return x.length === y.length && crypto.timingSafeEqual(x, y);
};
const intOr = (v, d) => (Number.isFinite(+v) ? Math.trunc(+v) : d);
const clamp = (n, lo, hi) => Math.min(hi, Math.max(lo, n));

export function mountAdmin(app, { db, config, now = () => Date.now() }) {
  const ADMIN_KEY = config.adminKey || config.analyticsAdminKey || null;
  // Distinct header so an admin secret can never be confused with a player token.
  const admin = (q, s, n) => {
    const key = q.headers["x-admin-key"] || q.headers.authorization?.match(/^Bearer (.{16,})$/)?.[1];
    if (!ADMIN_KEY || !safeEqual(key, ADMIN_KEY)) return s.status(401).json({ error: "unauthorized" });
    n();
  };
  const ar = (fn) => (q, s, n) => Promise.resolve(fn(q, s, n)).catch(n);
  const gate = [admin, rateLimiter({ limit: 120 })];

  // The console itself is public HTML (no data, no key); it gates on the API calls.
  app.get("/admin", (q, s) => s.type("html").send(CONSOLE_HTML));

  // ---- Platform metrics -----------------------------------------------------
  app.get(
    "/api/admin/metrics",
    ...gate,
    ar(async (q, s) => {
      const one = async (sql) => Number((await db.query(sql)).rows[0].v);
      const [players, activeSessions, wagered, ggr, notifications, chat, rounds] = await Promise.all([
        one("SELECT COUNT(*) v FROM users"),
        one("SELECT COUNT(*) v FROM sessions WHERE expires_at>now()"),
        one("SELECT COALESCE(SUM(CASE WHEN kind='bet' THEN -amount ELSE 0 END),0) v FROM wallet_ledger"),
        one("SELECT COALESCE(-SUM(amount),0) v FROM wallet_ledger WHERE kind IN ('bet','win')"),
        one("SELECT COUNT(*) v FROM notifications"),
        one("SELECT COUNT(*) v FROM chat_messages"),
        one("SELECT COUNT(*) v FROM game_rounds"),
      ]);
      const selfExcluded = await one("SELECT COUNT(*) v FROM responsible_play WHERE self_excluded_until>now()");
      s.json({
        players,
        activeSessions,
        totalWagered: wagered,
        ggr, // house gross gaming result across all virtual play
        rtpPct: wagered > 0 ? Math.round(((wagered - ggr) / wagered) * 1000) / 10 : null,
        rounds,
        notifications,
        chatMessages: chat,
        selfExcluded,
      });
    }),
  );

  // ---- Player search / list -------------------------------------------------
  app.get(
    "/api/admin/players",
    ...gate,
    ar(async (q, s) => {
      const like = "%" + String(q.query.q || "").toLowerCase() + "%";
      const limit = clamp(intOr(q.query.limit, 25), 1, 100);
      const offset = clamp(intOr(q.query.offset, 0), 0, 1e9);
      const where = "WHERE lower(email) LIKE $1 OR lower(display_name) LIKE $1";
      const total = Number((await db.query(`SELECT COUNT(*) v FROM users ${where}`, [like])).rows[0].v);
      const users = (await db.query(
        `SELECT id,email,display_name,created_at FROM users ${where} ORDER BY id DESC LIMIT ${limit} OFFSET ${offset}`,
        [like],
      )).rows;
      const ids = users.map((u) => Number(u.id));
      const idList = ids.join(",");
      const bal = ids.length
        ? (await db.query(
            `SELECT user_id, COALESCE(SUM(amount),0) balance, COALESCE(SUM(CASE WHEN kind='bet' THEN -amount ELSE 0 END),0) wagered FROM wallet_ledger WHERE user_id IN (${idList}) GROUP BY user_id`,
          )).rows
        : [];
      const rg = ids.length
        ? (await db.query(
            `SELECT user_id, cooling_off_until, self_excluded_until FROM responsible_play WHERE user_id IN (${idList})`,
          )).rows
        : [];
      const balBy = new Map(bal.map((r) => [Number(r.user_id), r]));
      const rgBy = new Map(rg.map((r) => [Number(r.user_id), r]));
      const nowDate = new Date(now());
      const flag = (r) =>
        r && r.self_excluded_until && new Date(r.self_excluded_until) > nowDate
          ? "self_excluded"
          : r && r.cooling_off_until && new Date(r.cooling_off_until) > nowDate
            ? "cooling_off"
            : null;
      const players = users.map((u) => {
        const b = balBy.get(Number(u.id)) || { balance: 0, wagered: 0 };
        const wagered = Number(b.wagered);
        const level = levelFromXp(wagered);
        return {
          id: Number(u.id),
          email: u.email,
          displayName: u.display_name,
          createdAt: u.created_at,
          balance: Number(b.balance),
          wagered,
          level,
          rank: rankOf(level),
          rgStatus: flag(rgBy.get(Number(u.id))),
        };
      });
      s.json({ players, total, limit, offset });
    }),
  );

  // ---- Player detail --------------------------------------------------------
  app.get(
    "/api/admin/players/:id",
    ...gate,
    ar(async (q, s) => {
      const id = intOr(q.params.id, 0);
      const u = (await db.query("SELECT id,email,display_name,created_at FROM users WHERE id=$1", [id])).rows[0];
      if (!u) return s.status(404).json({ error: "player_not_found" });
      const num = async (sql, p = [id]) => Number((await db.query(sql, p)).rows[0].v);
      const [balance, wagered, devices, unread, chatCount, rg, ledger] = await Promise.all([
        num("SELECT COALESCE(SUM(amount),0) v FROM wallet_ledger WHERE user_id=$1"),
        num("SELECT COALESCE(SUM(CASE WHEN kind='bet' THEN -amount ELSE 0 END),0) v FROM wallet_ledger WHERE user_id=$1"),
        num("SELECT COUNT(*) v FROM device_sessions WHERE user_id=$1"),
        num("SELECT COUNT(*) v FROM notifications WHERE user_id=$1 AND read_at IS NULL"),
        num("SELECT COUNT(*) v FROM chat_messages WHERE user_id=$1"),
        db.query("SELECT daily_loss_limit,daily_wager_limit,cooling_off_until,self_excluded_until FROM responsible_play WHERE user_id=$1", [id]).then((r) => r.rows[0] || null),
        db.query("SELECT id,amount,kind,metadata,created_at FROM wallet_ledger WHERE user_id=$1 ORDER BY id DESC LIMIT 20", [id]).then((r) => r.rows),
      ]);
      const level = levelFromXp(wagered);
      s.json({
        player: { id: Number(u.id), email: u.email, displayName: u.display_name, createdAt: u.created_at },
        wallet: { balance, wagered, level, rank: rankOf(level) },
        devices,
        unreadNotifications: unread,
        chatMessages: chatCount,
        responsiblePlay: rg && {
          dailyLossLimit: rg.daily_loss_limit ?? null,
          dailyWagerLimit: rg.daily_wager_limit ?? null,
          coolingOffUntil: rg.cooling_off_until ?? null,
          selfExcludedUntil: rg.self_excluded_until ?? null,
        },
        recentLedger: ledger.map((r) => ({ id: String(r.id), amount: Number(r.amount), kind: r.kind, metadata: r.metadata || {}, at: r.created_at })),
      });
    }),
  );

  // ---- Virtual-credit adjustment (append-only) ------------------------------
  app.post(
    "/api/admin/players/:id/adjust",
    ...gate,
    ar(async (q, s) => {
      const id = intOr(q.params.id, 0);
      const amount = intOr(q.body?.amount, 0);
      const reason = String(q.body?.reason || "").slice(0, 200);
      if (!amount) return s.status(400).json({ error: "amount_required" }); // ledger CHECK: amount <> 0
      if (!reason) return s.status(400).json({ error: "reason_required" });
      const u = (await db.query("SELECT id FROM users WHERE id=$1", [id])).rows[0];
      if (!u) return s.status(404).json({ error: "player_not_found" });
      // Idempotency: an explicit key lets a retried request be a no-op; otherwise
      // a per-second key still de-dupes accidental double-clicks.
      const key = q.body?.key ? `admin:${id}:${String(q.body.key).slice(0, 80)}` : `admin:${id}:${amount}:${Math.floor(now() / 1000)}`;
      const balance = await transaction(db, async (c) => {
        await c.query(
          "INSERT INTO wallet_ledger(user_id,amount,kind,idempotency_key,metadata)VALUES($1,$2,'adjustment',$3,$4)ON CONFLICT DO NOTHING",
          [id, amount, key, { reason: "admin-adjustment", note: reason }],
        );
        return Number((await c.query("SELECT COALESCE(SUM(amount),0) v FROM wallet_ledger WHERE user_id=$1", [id])).rows[0].v);
      });
      s.json({ adjusted: amount, balance, key });
    }),
  );

  // ---- Responsible-play intervention (operator-initiated) -------------------
  app.post(
    "/api/admin/players/:id/responsible-play",
    ...gate,
    ar(async (q, s) => {
      const id = intOr(q.params.id, 0);
      const body = q.body || {};
      const has = (k) => Object.prototype.hasOwnProperty.call(body, k);
      const u = (await db.query("SELECT id FROM users WHERE id=$1", [id])).rows[0];
      if (!u) return s.status(404).json({ error: "player_not_found" });
      await transaction(db, async (c) => {
        await c.query("INSERT INTO responsible_play(user_id) VALUES($1) ON CONFLICT(user_id) DO NOTHING", [id]);
        const current = (await c.query("SELECT self_excluded_until FROM responsible_play WHERE user_id=$1", [id])).rows[0];
        const sets = ["updated_at=now()"], params = [];
        let p = 2;
        if (has("dailyLossLimit")) {
          if (typeof body.dailyLossLimit === "number" && body.dailyLossLimit > 0) { sets.push(`daily_loss_limit=$${p++}`); params.push(Math.floor(body.dailyLossLimit)); }
          else sets.push("daily_loss_limit=NULL");
        }
        if (has("dailyWagerLimit")) {
          if (typeof body.dailyWagerLimit === "number" && body.dailyWagerLimit > 0) { sets.push(`daily_wager_limit=$${p++}`); params.push(Math.floor(body.dailyWagerLimit)); }
          else sets.push("daily_wager_limit=NULL");
        }
        if (typeof body.coolingOffHours === "number" && body.coolingOffHours > 0) {
          sets.push(`cooling_off_until=$${p++}`); params.push(new Date(now() + body.coolingOffHours * 3600_000));
        }
        // Extend-only: an operator can lengthen a self-exclusion but never shorten it.
        if (typeof body.selfExclusionHours === "number" && body.selfExclusionHours > 0) {
          const target = new Date(now() + body.selfExclusionHours * 3600_000);
          const currentEnd = current?.self_excluded_until ? new Date(current.self_excluded_until) : null;
          if (!currentEnd || target > currentEnd) { sets.push(`self_excluded_until=$${p++}`); params.push(target); }
        }
        await c.query(`UPDATE responsible_play SET ${sets.join(", ")} WHERE user_id=$1`, [id, ...params]);
      });
      const rg = (await db.query("SELECT daily_loss_limit,daily_wager_limit,cooling_off_until,self_excluded_until FROM responsible_play WHERE user_id=$1", [id])).rows[0];
      s.json({
        responsiblePlay: {
          dailyLossLimit: rg.daily_loss_limit ?? null,
          dailyWagerLimit: rg.daily_wager_limit ?? null,
          coolingOffUntil: rg.cooling_off_until ?? null,
          selfExcludedUntil: rg.self_excluded_until ?? null,
        },
      });
    }),
  );
}
