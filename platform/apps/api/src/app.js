import express from "express";
import helmet from "helmet";
import {
  hashPassword,
  verifyPassword,
  newToken,
  tokenHash,
  rateLimiter,
} from "./security.js";
import { newServerSeed, seedHash, outcome } from "./provablyFair.js";
import { transaction } from "./db.js";
import { gameDefinition, publicGameRegistry } from "./gameRegistry.js";
import { mountAnalytics } from "./analytics.js";
import { mountSocial } from "./social.js";
import { mountAdmin } from "./admin.js";
import { mountPush } from "./push.js";
import { mountOauth } from "./oauth.js";
import { assertRoundState, assertRoundTransition } from "./roundState.js";
import { xpForLevel, levelFromXp, rankOf, levelUpReward, CHALLENGES } from "./progression.js";
import { generateSecret, verifyTotp, otpauthUri } from "./totp.js";
import { minePositions, mineMultiplier, mineMultiplierMilli, TILES } from "./mines.js";
import { cardAt, stepMultiplierMilli, isWin } from "./hilo.js";
import { cardAt as bjCardAt, handValue as bjValue, isBlackjack, dealerShouldHit, resolve as bjResolve } from "./blackjack.js";
import { shuffledDeck, best5of7, compare as pokerCompare, anteOdds, qualifies, evaluate5, videoPokerPayout, CATEGORIES as POKER_CATEGORIES } from "./poker.js";
import { sanitizeChat, CHAT_MAX } from "./chat.js";
import crypto from "node:crypto";
const ar = (f) => (q, s, n) => Promise.resolve(f(q, s, n)).catch(n),
  emailOk = (v) =>
    typeof v === "string" &&
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v) &&
    v.length < 255,
  gameOk = (v) => typeof v === "string" && /^[\w-]{1,64}$/.test(v),
  roundOk = (v) => typeof v === "string" && /^[\w-]{8,80}$/.test(v),
  choiceOk=(gameId,c)=>gameId==='roulette'?(c&&(['red','black','even','odd'].includes(c.type)||(c.type==='straight'&&Number.isInteger(c.number)&&c.number>=0&&c.number<=36))):gameId==='keno'?(c&&Array.isArray(c.numbers)&&c.numbers.length>=1&&c.numbers.length<=10&&new Set(c.numbers).size===c.numbers.length&&c.numbers.every(n=>Number.isInteger(n)&&n>=1&&n<=80)):gameId==='dice'?(c&&(c.type==='over'||c.type==='under')&&Number.isInteger(c.target)&&c.target>=1&&c.target<=9998):gameId==='limbo'?(c&&typeof c.target==='number'&&Number.isFinite(c.target)&&c.target>=1.01&&c.target<=1000):gameId==='roulette-us'?(c&&(['red','black','even','odd'].includes(c.type)||(c.type==='straight'&&Number.isInteger(c.number)&&c.number>=0&&c.number<=37))):gameId==='sicbo'?(c&&(['small','big','anytriple'].includes(c.bet)||((c.bet==='single'||c.bet==='triple')&&Number.isInteger(c.number)&&c.number>=1&&c.number<=6))):gameId==='baccarat'?(c&&['player','banker','tie'].includes(c.bet)):c===undefined||c===null,
  num = Number,
  user = (u) => ({
    id: String(u.id),
    email: u.email,
    displayName: u.display_name,
    createdAt: u.created_at,
  }),
  cookieToken = (q) =>
    (q.headers.cookie || "")
      .split(";")
      .map((part) => part.trim().split("="))
      .find(([name]) => name === "casino_session")?.[1],
  setSessionCookie = (q, s, token, ttlMs) => {
    const secure = q.secure || q.headers["x-forwarded-proto"] === "https";
    s.set(
      "Set-Cookie",
      `casino_session=${token}; Path=/api; HttpOnly; SameSite=Lax; Max-Age=${Math.floor(ttlMs / 1000)}${secure ? "; Secure" : ""}`,
    );
  };
async function wallet(db, id, c = db) {
  let [
    {
      rows: [b],
    },
    { rows: l },
  ] = await Promise.all([
    c.query(
      "SELECT COALESCE(SUM(amount),0) balance FROM wallet_ledger WHERE user_id=$1",
      [id],
    ),
    c.query(
      'SELECT id,amount,kind,idempotency_key "idempotencyKey",metadata,created_at "createdAt" FROM wallet_ledger WHERE user_id=$1 ORDER BY id DESC LIMIT 100',
      [id],
    ),
  ]);
  return {
    balance: num(b.balance),
    ledger: l.map((x) => ({ ...x, id: String(x.id), amount: num(x.amount) })),
  };
}
export function createApp({ db, config, now = () => Date.now() }) {
  const a = express();
  a.disable("x-powered-by");
  a.set("trust proxy", config.trustProxy);
  a.use(helmet());
  a.use((q, s, n) => {
    let o = q.headers.origin;
    // A same-origin request (Origin host === Host) is never cross-site, so it is
    // always allowed — this lets a page the API itself serves (e.g. /admin) POST.
    let sameOrigin = false;
    try { sameOrigin = !!o && new URL(o).host === q.headers.host; } catch { sameOrigin = false; }
    const allowed = !!o && (config.allowedOrigins.has(o) || sameOrigin);
    if (allowed) {
      s.set("Access-Control-Allow-Origin", o);
      s.set("Vary", "Origin");
      s.set("Access-Control-Allow-Credentials", "true");
      s.set("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Admin-Key");
      s.set("Access-Control-Allow-Methods", "GET,POST,PUT,DELETE,OPTIONS");
    }
    if (q.method === "OPTIONS") return allowed ? s.sendStatus(204) : s.sendStatus(403);
    if (o && !allowed && !["GET", "HEAD", "OPTIONS"].includes(q.method))
      return s.status(403).json({ error: "origin_not_allowed" });
    n();
  });
  a.use(express.json({ limit: "16kb" }));
  a.use(rateLimiter({ limit: config.globalRateLimit || 300 }));
  const auth = ar(async (q, s, n) => {
    let m = q.headers.authorization?.match(/^Bearer ([\w-]{40,})$/), token = m?.[1] || cookieToken(q);
    if (!token || !/^[\w-]{40,}$/.test(token)) return s.status(401).json({ error: "unauthorized" });
    let {
      rows: [u],
    } = await db.query(
      "SELECT u.* FROM sessions s JOIN users u ON u.id=s.user_id WHERE s.token_hash=$1 AND s.expires_at>$2",
      [tokenHash(token), new Date(now())],
    );
    if (!u) return s.status(401).json({ error: "unauthorized" });
    q.user = u;
    q.token = token;
    n();
  });
  // Record a per-user notification. Pass a transaction client `client` to make it
  // atomic with the event that triggered it; otherwise it uses the pool. Never a
  // hard dependency of the triggering action — callers await it inside their own tx.
  const notify = (userId, { kind, title, body = null, data = {} }, client = db) =>
    client.query(
      "INSERT INTO notifications(user_id,kind,title,body,data)VALUES($1,$2,$3,$4,$5)",
      [userId, kind, title, body, data],
    );
  // Responsible-play status, shared by the /check endpoint and bet enforcement so
  // the rule is applied identically wherever it matters.
  // `moneyLimits:false` checks only the hard "no play at all" states (cooling-off,
  // self-exclusion) and skips the daily loss/wager caps — used for free bonus spins,
  // which place no wager but must still be blocked during an exclusion window.
  const rpStatus = async (userId, { moneyLimits = true } = {}) => {
    const row = (
      await db.query("SELECT * FROM responsible_play WHERE user_id=$1", [userId])
    ).rows[0];
    if (!row) return { allowed: true, reason: null };
    const nowDate = new Date(now());
    if (row.cooling_off_until && new Date(row.cooling_off_until) > nowDate)
      return { allowed: false, reason: "cooling_off", coolingOffUntil: row.cooling_off_until };
    if (row.self_excluded_until && new Date(row.self_excluded_until) > nowDate)
      return { allowed: false, reason: "self_excluded", selfExcludedUntil: row.self_excluded_until };
    if (!moneyLimits) return { allowed: true, reason: null };
    const dayStart = new Date(
      Date.UTC(nowDate.getUTCFullYear(), nowDate.getUTCMonth(), nowDate.getUTCDate()),
    );
    if (row.daily_loss_limit != null) {
      const { rows: [r] } = await db.query(
        "SELECT COALESCE(SUM(amount),0) AS net FROM wallet_ledger WHERE user_id=$1 AND kind IN ('bet','win') AND created_at>=$2",
        [userId, dayStart],
      );
      const currentLoss = Math.max(0, -Number(r.net));
      if (currentLoss >= Number(row.daily_loss_limit))
        return { allowed: false, reason: "daily_loss_limit", limit: Number(row.daily_loss_limit), currentLoss };
    }
    if (row.daily_wager_limit != null) {
      // Bet rows are stored as negative amounts, so total wagered = -SUM(amount).
      const { rows: [r] } = await db.query(
        "SELECT COALESCE(SUM(amount),0) AS s FROM wallet_ledger WHERE user_id=$1 AND kind='bet' AND created_at>=$2",
        [userId, dayStart],
      );
      const currentWager = Math.max(0, -Number(r.s));
      if (currentWager >= Number(row.daily_wager_limit))
        return { allowed: false, reason: "daily_wager_limit", limit: Number(row.daily_wager_limit), currentWager };
    }
    return { allowed: true, reason: null };
  };
  const recordDevice = (executor, userId, token, q) =>
    executor.query(
      "INSERT INTO device_sessions(user_id,session_id,token_hash,ip,user_agent)VALUES($1,$2,$3,$4,$5)",
      [userId, crypto.randomUUID(), tokenHash(token), q.ip || null, (q.headers["user-agent"] || "").slice(0, 255)],
    );
  // Create a session + device row + cookie for a user. Shared by OAuth login so a
  // social login is indistinguishable from a password login downstream.
  const issueSession = async (userId, q, s) => {
    const token = newToken(), exp = now() + config.sessionTtlMs;
    await db.query("INSERT INTO sessions(user_id,token_hash,expires_at)VALUES($1,$2,$3)", [userId, tokenHash(token), new Date(exp)]);
    await recordDevice(db, userId, token, q);
    setSessionCookie(q, s, token, config.sessionTtlMs);
    return { token, exp };
  };
  // XP = total credits wagered (bet rows are stored negative, so -SUM(amount)).
  const wageredTotal = async (userId, executor = db) => {
    const { rows: [r] } = await executor.query(
      "SELECT COALESCE(SUM(amount),0) AS s FROM wallet_ledger WHERE user_id=$1 AND kind='bet'",
      [userId],
    );
    return Math.max(0, -Number(r.s));
  };
  const ensureBonusRow = (executor, userId) =>
    executor.query("INSERT INTO player_bonus(user_id) VALUES($1) ON CONFLICT(user_id) DO NOTHING", [userId]);
  a.get(
    "/health",
    ar(async (q, s) => {
      await db.query("SELECT 1");
      s.json({ ok: true, database: "postgresql" });
    }),
  );
  a.get("/api/games/registry", (q, s) =>
    s.json({ games: publicGameRegistry() }),
  );
  mountAnalytics(a,{db,config,now});
  mountSocial(a,{db,config});
  mountAdmin(a,{db,config,now});
  // Web Push: dispatch() fans reward notifications out to a player's devices when
  // they are offline; delivery uses config.pushSender (no-op if unconfigured).
  const push = mountPush(a,{db,config,now});
  mountOauth(a,{db,config,now,issueSession,auth});
  a.post(
    "/api/auth/register",
    rateLimiter({ limit: 10 }),
    ar(async (q, s) => {
      let { email, password, displayName } = q.body || {};
      if (
        !emailOk(email) ||
        typeof password !== "string" ||
        password.length < 10 ||
        password.length > 128 ||
        typeof displayName !== "string" ||
        displayName.trim().length < 2 ||
        displayName.trim().length > 40
      )
        return s.status(400).json({ error: "invalid_input" });
      let hash = await hashPassword(password),
        token = newToken(),
        exp = now() + config.sessionTtlMs;
      try {
        let u = await transaction(db, async (c) => {
          let {
            rows: [u],
          } = await c.query(
            "INSERT INTO users(email,display_name,password_hash) VALUES($1,$2,$3) RETURNING *",
            [email.trim().toLowerCase(), displayName.trim(), hash],
          );
          await c.query(
            "INSERT INTO wallet_ledger(user_id,amount,kind,idempotency_key)VALUES($1,5000,'welcome','welcome')",
            [u.id],
          );
          await c.query(
            "INSERT INTO sessions(user_id,token_hash,expires_at)VALUES($1,$2,$3)",
            [u.id, tokenHash(token), new Date(exp)],
          );
          await recordDevice(c, u.id, token, q);
          return u;
        });
        setSessionCookie(q, s, token, config.sessionTtlMs);
        s.status(201).json({
          token,
          expiresAt: new Date(exp).toISOString(),
          user: user(u),
        });
      } catch (e) {
        if (e.code === "23505")
          return s.status(409).json({ error: "email_exists" });
        throw e;
      }
    }),
  );
  a.post(
    "/api/auth/login",
    rateLimiter({ limit: 10 }),
    ar(async (q, s) => {
      let r = emailOk(q.body?.email)
          ? await db.query("SELECT * FROM users WHERE lower(email)=lower($1)", [
              q.body.email.trim(),
            ])
          : { rows: [] },
        u = r.rows[0];
      if (
        !u ||
        typeof q.body?.password !== "string" ||
        !(await verifyPassword(q.body.password, u.password_hash))
      )
        return s.status(401).json({ error: "invalid_credentials" });
      const totpRow = (
        await db.query("SELECT secret FROM user_totp WHERE user_id=$1 AND enabled=true", [u.id])
      ).rows[0];
      if (totpRow && !verifyTotp(totpRow.secret, String(q.body?.totp || ""), now()))
        return s.status(401).json({ error: "totp_required" });
      let token = newToken(),
        exp = now() + config.sessionTtlMs;
      await db.query(
        "INSERT INTO sessions(user_id,token_hash,expires_at)VALUES($1,$2,$3)",
        [u.id, tokenHash(token), new Date(exp)],
      );
      await recordDevice(db, u.id, token, q);
      setSessionCookie(q, s, token, config.sessionTtlMs);
      s.json({ token, expiresAt: new Date(exp).toISOString(), user: user(u) });
    }),
  );
  a.post(
    "/api/auth/logout",
    auth,
    ar(async (q, s) => {
      await db.query("DELETE FROM sessions WHERE token_hash=$1", [
        tokenHash(q.token),
      ]);
      s.set("Set-Cookie", "casino_session=; Path=/api; HttpOnly; SameSite=Lax; Max-Age=0");
      s.sendStatus(204);
    }),
  );
  a.get("/api/profile", auth, (q, s) => s.json({ user: user(q.user) }));
  a.put(
    "/api/profile",
    auth,
    ar(async (q, s) => {
      let n = q.body?.displayName;
      if (typeof n !== "string" || n.trim().length < 2 || n.trim().length > 40)
        return s.status(400).json({ error: "invalid_input" });
      let {
        rows: [u],
      } = await db.query(
        "UPDATE users SET display_name=$1 WHERE id=$2 RETURNING *",
        [n.trim(), q.user.id],
      );
      s.json({ user: user(u) });
    }),
  );
  a.get(
    "/api/favorites",
    auth,
    ar(async (q, s) =>
      s.json({
        games: (
          await db.query(
            'SELECT game_id "gameId",created_at "createdAt" FROM favorites WHERE user_id=$1 ORDER BY created_at DESC',
            [q.user.id],
          )
        ).rows,
      }),
    ),
  );
  a.put(
    "/api/favorites/:gameId",
    auth,
    ar(async (q, s) => {
      if (!gameOk(q.params.gameId))
        return s.status(400).json({ error: "invalid_game" });
      await db.query(
        "INSERT INTO favorites(user_id,game_id)VALUES($1,$2)ON CONFLICT DO NOTHING",
        [q.user.id, q.params.gameId],
      );
      s.sendStatus(204);
    }),
  );
  a.delete(
    "/api/favorites/:gameId",
    auth,
    ar(async (q, s) => {
      await db.query("DELETE FROM favorites WHERE user_id=$1 AND game_id=$2", [
        q.user.id,
        q.params.gameId,
      ]);
      s.sendStatus(204);
    }),
  );
  a.post(
    "/api/recents/:gameId",
    auth,
    ar(async (q, s) => {
      if (!gameOk(q.params.gameId))
        return s.status(400).json({ error: "invalid_game" });
      await db.query(
        "INSERT INTO recents(user_id,game_id)VALUES($1,$2)ON CONFLICT(user_id,game_id)DO UPDATE SET played_at=now(),play_count=recents.play_count+1",
        [q.user.id, q.params.gameId],
      );
      s.sendStatus(204);
    }),
  );
  a.get(
    "/api/recents",
    auth,
    ar(async (q, s) =>
      s.json({
        games: (
          await db.query(
            'SELECT game_id "gameId",played_at "playedAt",play_count "playCount" FROM recents WHERE user_id=$1 ORDER BY played_at DESC LIMIT 50',
            [q.user.id],
          )
        ).rows,
      }),
    ),
  );
  a.get(
    "/api/wallet",
    auth,
    ar(async (q, s) => s.json(await wallet(db, q.user.id))),
  );
  a.get(
    "/api/wallet/balance",
    auth,
    ar(async (q, s) =>
      s.json({
        balance: (await wallet(db, q.user.id)).balance,
        currency: "CREDITS",
      }),
    ),
  );
  a.get(
    "/api/wallet/bonus-session",
    auth,
    ar(async (q, s) => {
      if (!gameOk(q.query.gameId)) return s.status(400).json({ error: "invalid_game" });
      const state = (
        await db.query(
          'SELECT id "sessionId",bonus_type "type",remaining,status FROM slot_bonus_sessions WHERE user_id=$1 AND game_id=$2 AND status=\'active\' ORDER BY created_at DESC LIMIT 1',
          [q.user.id, q.query.gameId],
        )
      ).rows[0];
      s.json({ bonusState: state ? { ...state, remaining: num(state.remaining) } : null });
    }),
  );
  a.post(
    "/api/wallet/bet",
    auth,
    ar(async (q, s) => {
      let { amount, gameId, roundId, clientSeed, choice } = q.body || {},
        definition = gameDefinition(gameId);
      if (
        !Number.isSafeInteger(amount) ||
        amount < 1 ||
        amount > 1e5 ||
        !gameOk(gameId) ||
        !roundOk(roundId) ||
        typeof clientSeed !== "string" ||
        clientSeed.length < 8 ||
        clientSeed.length > 128 || !choiceOk(gameId,choice)
      )
        return s.status(400).json({ error: "invalid_bet" });
      if (!definition) return s.status(400).json({ error: "game_not_allowed" });
      // Responsible-play enforcement: reject the bet if the player is in a
      // cooling-off / self-exclusion window or has reached a daily limit.
      const rp = await rpStatus(q.user.id);
      if (!rp.allowed)
        return s.status(403).json({ error: "responsible_play_block", ...rp });
      let r = await transaction(db, async (c) => {
        await c.query("SELECT pg_advisory_xact_lock($1)", [q.user.id]);
        let e = (
            await c.query(
              "SELECT * FROM game_rounds WHERE id=$1 AND user_id=$2",
              [roundId, q.user.id],
            )
          ).rows[0],
          bal = (await wallet(db, q.user.id, c)).balance;
        if (e)
          return e.game_id === gameId &&
            num(e.bet) === amount &&
            e.client_seed === clientSeed && JSON.stringify(e.choice||null)===JSON.stringify(choice||null)
            ? { e, bal }
            : { conflict: true };
        if (bal < amount) return { poor: true };
        let nonce = num(
            (
              await c.query(
                "SELECT COUNT(*) n FROM game_rounds WHERE user_id=$1 AND game_id=$2",
                [q.user.id, gameId],
              )
            ).rows[0].n,
          ),
          seed = newServerSeed(),
          commit = seedHash(seed);
        await c.query(
          "INSERT INTO game_rounds(id,user_id,game_id,bet,status,client_seed,server_seed,server_seed_hash,nonce,math_profile_id,math_version,choice)VALUES($1,$2,$3,$4,'open',$5,$6,$7,$8,$9,$10,$11)",
          [
            roundId,
            q.user.id,
            gameId,
            amount,
            clientSeed,
            seed,
            commit,
            nonce,
            definition.mathProfileId,
            definition.mathVersion,
            choice||null,
          ],
        );
        await c.query(
          "INSERT INTO wallet_ledger(user_id,amount,kind,idempotency_key,metadata)VALUES($1,$2,'bet',$3,$4)",
          [
            q.user.id,
            -amount,
            `bet:${roundId}`,
            {
              gameId,
              roundId,
              mathProfileId: definition.mathProfileId,
              mathVersion: definition.mathVersion,
            },
          ],
        );
        return { bal: bal - amount, commit, nonce, definition };
      });
      if (r.conflict) return s.status(409).json({ error: "round_id_conflict" });
      if (r.poor) return s.status(409).json({ error: "insufficient_funds" });
      if (r.e)
        return s.json({
          roundId,
          balance: r.bal,
          serverSeedHash: r.e.server_seed_hash,
          nonce: num(r.e.nonce),
          mathProfileId: r.e.math_profile_id,
          mathVersion: num(r.e.math_version),
          idempotent: true,
        });
      s.status(201).json({
        roundId,
        balance: r.bal,
        serverSeedHash: r.commit,
        nonce: r.nonce,
        mathProfileId: r.definition.mathProfileId,
        mathVersion: r.definition.mathVersion,
      });
    }),
  );
  a.post(
    "/api/wallet/settle",
    auth,
    ar(async (q, s) => {
      let { gameId, roundId, action } = q.body || {};
      if (!gameOk(gameId) || !roundOk(roundId))
        return s.status(400).json({ error: "invalid_round" });
      let r = await transaction(db, async (c) => {
        await c.query("SELECT pg_advisory_xact_lock($1)", [q.user.id]);
        let x = (
          await c.query(
            "SELECT * FROM game_rounds WHERE id=$1 AND user_id=$2 AND game_id=$3 FOR UPDATE",
            [roundId, q.user.id, gameId],
          )
        ).rows[0];
        if (!x) return null;
        assertRoundState(x.status);
        if (x.status === "open") {
          assertRoundTransition(x.status, "settled");
          let definition = gameDefinition(
            x.game_id,
            x.math_profile_id,
            x.math_version,
          );
          if (!definition)
            throw new Error(
              `Unsupported persisted math profile ${x.math_profile_id}@${x.math_version}`,
            );
          let o = outcome({
              serverSeed: x.server_seed,
              clientSeed: x.client_seed,
              nonce: num(x.nonce),
              gameId,
              kind: definition.kind,
              math: definition.math,
              choice:x.choice,
            }),
            effectiveMultiplier=o.multiplierMilli;
          if(gameId==='crash'){
            const crash=o.multiplierMilli/1000,elapsed=Math.max(0,Date.now()-new Date(x.created_at).getTime()),current=Math.max(1,Math.exp(elapsed/10000));
            effectiveMultiplier=action?.type==='cashout'&&current<crash?Math.floor(current*1000):0;
            o.value=JSON.stringify({crashPoint:crash,cashoutMultiplier:effectiveMultiplier/1000,cashedOut:effectiveMultiplier>0});o.multiplierMilli=effectiveMultiplier;
          }
          let win = Math.floor((num(x.bet) * effectiveMultiplier) / 1000);
          if (win)
            await c.query(
              "INSERT INTO wallet_ledger(user_id,amount,kind,idempotency_key,metadata)VALUES($1,$2,'win',$3,$4)ON CONFLICT DO NOTHING",
              [
                q.user.id,
                win,
                `win:${roundId}`,
                {
                  gameId,
                  roundId,
                  mathProfileId: x.math_profile_id,
                  mathVersion: num(x.math_version),
                },
              ],
            );
          const transitioned = (
            await c.query(
              "UPDATE game_rounds SET status='settled',outcome=$1,multiplier_milli=$2,win=$3,settled_at=now()WHERE id=$4 AND status='open' RETURNING *",
              [o.value, o.multiplierMilli, win, roundId],
            )
          ).rows[0];
          if (!transitioned) {
            const error = new Error("round_transition_conflict");
            error.code = "round_transition_conflict";
            throw error;
          }
          x = transitioned;
          const parsedOutcome =
            typeof o.value === "string" && o.value.startsWith("{")
              ? JSON.parse(o.value)
              : null;
          const awardedSpins = num(parsedOutcome?.bonus?.awardedSpins || 0);
          if (awardedSpins > 0 && x.game_id.startsWith("slot-original-")) {
            await c.query(
              "INSERT INTO slot_bonus_sessions(id,base_round_id,user_id,game_id,bonus_type,funded_bet,remaining,client_seed,next_nonce,status)VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,'active')ON CONFLICT(base_round_id)DO NOTHING",
              [
                `bs_${roundId}`,
                roundId,
                q.user.id,
                gameId,
                parsedOutcome.bonus.type,
                num(x.bet),
                awardedSpins,
                x.client_seed,
                num(x.nonce) + 1,
              ],
            );
          }
        }
        const bonusState = (
          await c.query(
            'SELECT id "sessionId",bonus_type "type",remaining,status FROM slot_bonus_sessions WHERE base_round_id=$1',
            [roundId],
          )
        ).rows[0] || null;
        return { ...x, bonusState, bal: (await wallet(db, q.user.id, c)).balance };
      });
      if (!r) return s.status(404).json({ error: "round_not_found" });
      s.json({
        roundId,
        gameId,
        win: num(r.win),
        multiplier: r.multiplier_milli / 1000,
        outcome:
          typeof r.outcome === "string" && r.outcome.startsWith("{")
            ? JSON.parse(r.outcome)
            : r.outcome,
        balance: r.bal,
        mathProfileId: r.math_profile_id,
        mathVersion: num(r.math_version),
        bonusState: r.bonusState
          ? { ...r.bonusState, remaining: num(r.bonusState.remaining) }
          : null,
        proof: {
          serverSeed: r.server_seed,
          serverSeedHash: r.server_seed_hash,
          clientSeed: r.client_seed,
          nonce: num(r.nonce),
          choice: r.choice || null,
        },
      });
    }),
  );
  a.get(
    "/api/wallet/rounds/:roundId",
    auth,
    ar(async (q, s) => {
      const { roundId } = q.params;
      if (!roundOk(roundId))
        return s.status(400).json({ error: "invalid_round" });
      const x = (
        await db.query(
          `SELECT id "roundId",game_id "gameId",bet,status,outcome,
             multiplier_milli "multiplierMilli",win,
             server_seed_hash "serverSeedHash",
             CASE WHEN status='settled' THEN server_seed ELSE NULL END "serverSeed",
             CASE WHEN status='settled' THEN client_seed ELSE NULL END "clientSeed",
             nonce,math_profile_id "mathProfileId",math_version "mathVersion",
             created_at "createdAt",settled_at "settledAt"
           FROM game_rounds WHERE id=$1 AND user_id=$2`,
          [roundId, q.user.id],
        )
      ).rows[0];
      if (!x) return s.status(404).json({ error: "round_not_found" });
      const parsed =
        typeof x.outcome === "string" && x.outcome.startsWith("{")
          ? JSON.parse(x.outcome)
          : x.outcome;
      s.json({
        ...x,
        bet: num(x.bet),
        nonce: num(x.nonce),
        mathVersion: num(x.mathVersion),
        multiplier:
          x.multiplierMilli == null ? null : num(x.multiplierMilli) / 1000,
        win: x.win == null ? null : num(x.win),
        outcome: parsed,
        proof:
          x.status === "settled"
            ? {
                serverSeed: x.serverSeed,
                serverSeedHash: x.serverSeedHash,
                clientSeed: x.clientSeed,
                nonce: num(x.nonce),
              }
            : { serverSeedHash: x.serverSeedHash, nonce: num(x.nonce) },
      });
    }),
  );
  a.post(
    "/api/wallet/bonus-spin",
    auth,
    ar(async (q, s) => {
      const { gameId, sessionId, roundId } = q.body || {};
      if (!gameOk(gameId) || !roundOk(roundId) || !/^bs_[\w-]{8,83}$/.test(sessionId || ""))
        return s.status(400).json({ error: "invalid_bonus_spin" });
      // Free spins place no wager, but a self-excluded / cooling-off player must
      // not be able to play at all.
      const rp = await rpStatus(q.user.id, { moneyLimits: false });
      if (!rp.allowed)
        return s.status(403).json({ error: "responsible_play_block", ...rp });
      const r = await transaction(db, async (c) => {
        await c.query("SELECT pg_advisory_xact_lock($1)", [q.user.id]);
        let existing = (
          await c.query(
            "SELECT * FROM game_rounds WHERE id=$1 AND user_id=$2 AND game_id=$3",
            [roundId, q.user.id, gameId],
          )
        ).rows[0];
        if (existing) {
          if (!existing.is_bonus || existing.bonus_session_id !== sessionId)
            return { conflict: true };
          const state = (
            await c.query(
              'SELECT id "sessionId",bonus_type "type",remaining,status FROM slot_bonus_sessions WHERE id=$1',
              [sessionId],
            )
          ).rows[0];
          return { round: existing, state, idempotent: true };
        }
        const session = (
          await c.query(
            "SELECT * FROM slot_bonus_sessions WHERE id=$1 AND user_id=$2 AND game_id=$3 FOR UPDATE",
            [sessionId, q.user.id, gameId],
          )
        ).rows[0];
        if (!session) return { missing: true };
        if (session.status !== "active" || num(session.remaining) < 1)
          return { complete: true };
        const definition = gameDefinition(gameId);
        if (!definition?.math?.symbols) return { invalid: true };
        const seed = newServerSeed(), commit = seedHash(seed), nonce = num((await c.query("SELECT COALESCE(MAX(nonce),-1)+1 nonce FROM game_rounds WHERE user_id=$1 AND game_id=$2",[q.user.id,gameId])).rows[0].nonce);
        const result = outcome({
          serverSeed: seed,
          clientSeed: session.client_seed,
          nonce,
          gameId,
          kind: definition.kind,
          math: definition.math,
        });
        const win = Math.floor((num(session.funded_bet) * result.multiplierMilli) / 1000);
        const remaining = num(session.remaining) - 1;
        await c.query(
          "INSERT INTO game_rounds(id,user_id,game_id,bet,status,client_seed,server_seed,server_seed_hash,nonce,outcome,multiplier_milli,win,settled_at,math_profile_id,math_version,is_bonus,bonus_session_id)VALUES($1,$2,$3,$4,'settled',$5,$6,$7,$8,$9,$10,$11,now(),$12,$13,true,$14)",
          [roundId,q.user.id,gameId,session.funded_bet,session.client_seed,seed,commit,nonce,result.value,result.multiplierMilli,win,definition.mathProfileId,definition.mathVersion,sessionId],
        );
        if (win)
          await c.query(
            "INSERT INTO wallet_ledger(user_id,amount,kind,idempotency_key,metadata)VALUES($1,$2,'win',$3,$4)",
            [q.user.id,win,`win:${roundId}`,{gameId,roundId,bonusSessionId:sessionId,bonusType:session.bonus_type}],
          );
        const state = (
          await c.query(
            "UPDATE slot_bonus_sessions SET remaining=$1,next_nonce=$2,status=CASE WHEN $1=0 THEN 'complete' ELSE 'active' END,completed_at=CASE WHEN $1=0 THEN now() ELSE NULL END WHERE id=$3 RETURNING id \"sessionId\",bonus_type \"type\",remaining,status",
            [remaining, nonce + 1, sessionId],
          )
        ).rows[0];
        return {
          round: {id:roundId,game_id:gameId,win,multiplier_milli:result.multiplierMilli,outcome:result.value,server_seed:seed,server_seed_hash:commit,client_seed:session.client_seed,nonce,math_profile_id:definition.mathProfileId,math_version:definition.mathVersion},
          state,
        };
      });
      if (r.conflict) return s.status(409).json({ error: "round_id_conflict" });
      if (r.missing) return s.status(404).json({ error: "bonus_session_not_found" });
      if (r.complete) return s.status(409).json({ error: "bonus_session_complete" });
      if (r.invalid) return s.status(400).json({ error: "invalid_bonus_game" });
      const x = r.round;
      const parsed = typeof x.outcome === "string" && x.outcome.startsWith("{") ? JSON.parse(x.outcome) : x.outcome;
      s.status(r.idempotent ? 200 : 201).json({
        roundId,gameId,win:num(x.win),multiplier:num(x.multiplier_milli)/1000,outcome:parsed,
        balance:(await wallet(db,q.user.id)).balance,
        mathProfileId:x.math_profile_id,mathVersion:num(x.math_version),
        bonusState:{...r.state,remaining:num(r.state.remaining)},idempotent:Boolean(r.idempotent),
        proof:{serverSeed:x.server_seed,serverSeedHash:x.server_seed_hash,clientSeed:x.client_seed,nonce:num(x.nonce)},
      });
    }),
  );
  a.get(
    "/api/history/rounds",
    auth,
    ar(async (q, s) => {
      let rows = (
        await db.query(
          `SELECT id "roundId",game_id "gameId",math_profile_id "mathProfileId",math_version "mathVersion",
            CASE WHEN is_bonus THEN 0 ELSE bet END bet,is_bonus "isBonus",bonus_session_id "bonusSessionId",status,
            multiplier_milli/1000.0 multiplier,win,server_seed_hash "serverSeedHash",
            CASE WHEN status='settled' THEN server_seed ELSE NULL END "serverSeed",
            CASE WHEN status='settled' THEN client_seed ELSE NULL END "clientSeed",
            nonce,created_at "createdAt",settled_at "settledAt"
           FROM game_rounds WHERE user_id=$1 ORDER BY created_at DESC LIMIT 250`,
          [q.user.id],
        )
      ).rows;
      s.json({
        rounds: rows.map((x) => ({
          ...x,
          bet: num(x.bet),
          win: x.win == null ? null : num(x.win),
          nonce: num(x.nonce),
          mathVersion: num(x.mathVersion),
          multiplier: x.multiplier == null ? null : num(x.multiplier),
        })),
      });
    }),
  );
  a.post(
    "/api/wallet/daily-reward",
    auth,
    ar(async (q, s) => {
      let key = `daily:${new Date(now()).toISOString().slice(0, 10)}`,
        r = await transaction(db, async (c) => {
          await c.query("SELECT pg_advisory_xact_lock($1)", [q.user.id]);
          let x = await c.query(
            "INSERT INTO wallet_ledger(user_id,amount,kind,idempotency_key)VALUES($1,250,'daily_reward',$2)ON CONFLICT DO NOTHING",
            [q.user.id, key],
          );
          return {
            claimed: x.rowCount === 1,
            ...(await wallet(db, q.user.id, c)),
          };
        });
      s.json({
        claimed: r.claimed,
        reward: r.claimed ? 250 : 0,
        balance: r.balance,
        ledger: r.ledger,
      });
    }),
  );
  // ===== Account Lifecycle Endpoints =====
  
  // Email verification request
  a.post(
    "/api/account/email/request-verify",
    auth,
    rateLimiter({ limit: 5 }),
    ar(async (q, s) => {
      const newEmail = q.body?.email;
      if (!emailOk(newEmail)) return s.status(400).json({ error: "invalid_email" });
      const taken = (await db.query(
        "SELECT 1 FROM users WHERE lower(email)=lower($1) AND id<>$2",
        [newEmail.trim(), q.user.id],
      )).rows[0];
      if (taken) return s.status(409).json({ error: "email_exists" });
      const token = newToken(), exp = now() + 3600_000; // 1 hour
      await db.query(
        "INSERT INTO email_verification(user_id,email,token_hash,expires_at) VALUES($1,$2,$3,$4)",
        [q.user.id, newEmail.trim().toLowerCase(), tokenHash(token), new Date(exp)],
      );
      // In production, send verification email here with token
      s.json({ sent: true, expiresAt: new Date(exp).toISOString() });
    }),
  );
  
  // Email verification confirm
  a.post(
    "/api/account/email/verify",
    rateLimiter({ limit: 10 }),
    ar(async (q, s) => {
      const { token, newPassword } = q.body || {};
      if (!token || typeof token !== "string") return s.status(400).json({ error: "invalid_token" });
      const rec = (await db.query(
        "SELECT * FROM email_verification WHERE token_hash=$1 AND used_at IS NULL AND expires_at>$2",
        [tokenHash(token), new Date(now())],
      )).rows[0];
      if (!rec) return s.status(400).json({ error: "invalid_or_expired_token" });
      const taken = (await db.query(
        "SELECT 1 FROM users WHERE lower(email)=lower($1) AND id<>$2",
        [rec.email, rec.user_id],
      )).rows[0];
      if (taken) return s.status(409).json({ error: "email_exists" });
      await transaction(db, async (c) => {
        await c.query("UPDATE email_verification SET used_at=now() WHERE id=$1", [rec.id]);
        await c.query("UPDATE users SET email=$1 WHERE id=$2", [rec.email, rec.user_id]);
        if (newPassword && typeof newPassword === "string" && newPassword.length >= 10) {
          const hash = await hashPassword(newPassword);
          await c.query("UPDATE users SET password_hash=$1 WHERE id=$2", [hash, rec.user_id]);
        }
      });
      s.json({ verified: true });
    }),
  );
  
  // Password reset request
  a.post(
    "/api/account/password/request-reset",
    rateLimiter({ limit: 5 }),
    ar(async (q, s) => {
      const email = q.body?.email;
      if (!emailOk(email)) return s.status(400).json({ error: "invalid_email" });
      const user = await db.query("SELECT id FROM users WHERE lower(email)=lower($1)", [email.trim()]);
      if (user.rows.length) {
        const token = newToken(), exp = now() + 3600_000;
        await db.query(
          "INSERT INTO password_reset(user_id,token_hash,expires_at) VALUES($1,$2,$3)",
          [user.rows[0].id, tokenHash(token), new Date(exp)],
        );
      }
      // Always return sent (security: don't reveal if email exists)
      s.json({ sent: true, expiresAt: new Date(now() + 3600_000).toISOString() });
    }),
  );
  
  // Password reset confirm
  a.post(
    "/api/account/password/reset",
    rateLimiter({ limit: 10 }),
    ar(async (q, s) => {
      const { token, newPassword } = q.body || {};
      if (!token || typeof token !== "string") return s.status(400).json({ error: "invalid_token" });
      if (typeof newPassword !== "string" || newPassword.length < 10 || newPassword.length > 128)
        return s.status(400).json({ error: "invalid_password" });
      const rec = (await db.query(
        "SELECT * FROM password_reset WHERE token_hash=$1 AND used_at IS NULL AND expires_at>$2",
        [tokenHash(token), new Date(now())],
      )).rows[0];
      if (!rec) return s.status(400).json({ error: "invalid_or_expired_token" });
      const hash = await hashPassword(newPassword);
      await transaction(db, async (c) => {
        await c.query("UPDATE password_reset SET used_at=now() WHERE id=$1", [rec.id]);
        await c.query("UPDATE users SET password_hash=$1 WHERE id=$2", [hash, rec.user_id]);
        // Invalidate all sessions
        await c.query("DELETE FROM sessions WHERE user_id=$1", [rec.user_id]);
      });
      s.json({ reset: true });
    }),
  );
  
  // Change password (logged in)
  a.post(
    "/api/account/password/change",
    auth,
    rateLimiter({ limit: 5 }),
    ar(async (q, s) => {
      const { currentPassword, newPassword } = q.body || {};
      if (typeof newPassword !== "string" || newPassword.length < 10 || newPassword.length > 128)
        return s.status(400).json({ error: "invalid_password" });
      // An OAuth-only account has an empty password hash — this call SETS the
      // first password (no current password to prove). Otherwise the current
      // password must be supplied and verified.
      const hasPassword = !!(q.user.password_hash && q.user.password_hash.length);
      if (hasPassword) {
        if (typeof currentPassword !== "string")
          return s.status(400).json({ error: "invalid_input" });
        if (!(await verifyPassword(currentPassword, q.user.password_hash)))
          return s.status(401).json({ error: "invalid_current_password" });
      }
      const hash = await hashPassword(newPassword);
      const currentHash = tokenHash(q.token);
      await transaction(db, async (c) => {
        await c.query("UPDATE users SET password_hash=$1 WHERE id=$2", [hash, q.user.id]);
        // Invalidate every other session, keeping the caller's current one signed in.
        await c.query("DELETE FROM sessions WHERE user_id=$1 AND token_hash<>$2", [q.user.id, currentHash]);
        await c.query("DELETE FROM device_sessions WHERE user_id=$1 AND token_hash<>$2", [q.user.id, currentHash]);
      });
      s.json({ changed: true, wasSet: !hasPassword });
    }),
  );

  // List device sessions
  a.get(
    "/api/account/devices",
    auth,
    ar(async (q, s) => {
      const currentHash = tokenHash(q.token);
      const rows = (await db.query(
        "SELECT session_id,ip,device_name,user_agent,last_active,created_at,token_hash FROM device_sessions WHERE user_id=$1 ORDER BY last_active DESC",
        [q.user.id],
      )).rows;
      s.json({
        devices: rows.map(({ token_hash, user_agent, device_name, ...d }) => ({
          ...d,
          device_name: device_name || (user_agent || "").slice(0, 50) || "Unknown device",
          current: token_hash === currentHash,
        })),
      });
    }),
  );
  
  // Revoke device session
  a.delete(
    "/api/account/devices/:sessionId",
    auth,
    ar(async (q, s) => {
      const { sessionId } = q.params;
      // Read the device's token_hash BEFORE deleting the row, then invalidate both
      // the underlying session and the device record.
      const dev = (await db.query(
        "SELECT token_hash FROM device_sessions WHERE session_id=$1 AND user_id=$2",
        [sessionId, q.user.id],
      )).rows[0];
      if (dev) {
        await db.query("DELETE FROM sessions WHERE user_id=$1 AND token_hash=$2", [q.user.id, dev.token_hash]);
        await db.query("DELETE FROM device_sessions WHERE session_id=$1 AND user_id=$2", [sessionId, q.user.id]);
      }
      s.json({ revoked: true });
    }),
  );
  
  // Revoke all other devices
  a.post(
    "/api/account/devices/revoke-others",
    auth,
    ar(async (q, s) => {
      const currentHash = tokenHash(q.token);
      await db.query("DELETE FROM sessions WHERE user_id=$1 AND token_hash<>$2", [q.user.id, currentHash]);
      await db.query("DELETE FROM device_sessions WHERE user_id=$1 AND token_hash<>$2", [q.user.id, currentHash]);
      s.json({ revokedOthers: true });
    }),
  );
  
  // Request account data export
  a.post(
    "/api/account/export/request",
    auth,
    rateLimiter({ limit: 3 }),
    ar(async (q, s) => {
      const token = newToken(), exp = now() + 86400_000; // 24 hours
      await db.query(
        "INSERT INTO account_export_requests(user_id,token_hash,expires_at) VALUES($1,$2,$3)",
        [q.user.id, tokenHash(token), new Date(exp)],
      );
      s.json({ sent: true, expiresAt: new Date(exp).toISOString() });
    }),
  );
  
  // Get account export status
  a.get(
    "/api/account/export/status",
    auth,
    ar(async (q, s) => {
      const rec = (await db.query(
        "SELECT status,created_at FROM account_export_requests WHERE user_id=$1 AND status='pending' ORDER BY created_at DESC LIMIT 1",
        [q.user.id],
      )).rows[0];
      s.json(rec ? { status: rec.status, createdAt: rec.created_at } : { status: "none" });
    }),
  );
  
  // Delete account (soft delete)
  a.post(
    "/api/account/delete",
    auth,
    rateLimiter({ limit: 3 }),
    ar(async (q, s) => {
      const { password } = q.body || {};
      if (typeof password !== "string" || !(await verifyPassword(password, q.user.password_hash)))
        return s.status(401).json({ error: "invalid_password" });
      // Soft delete: anonymise personal data but keep the append-only wallet ledger
      // intact (the ledger triggers reject DELETE by design).
      await transaction(db, async (c) => {
        await c.query(
          "UPDATE users SET email=CONCAT(email,'_deleted_',gen_random_uuid()::text), display_name='Deleted User', password_hash='' WHERE id=$1",
          [q.user.id],
        );
        await c.query("DELETE FROM sessions WHERE user_id=$1", [q.user.id]);
        await c.query("DELETE FROM device_sessions WHERE user_id=$1", [q.user.id]);
        await c.query("DELETE FROM favorites WHERE user_id=$1", [q.user.id]);
        await c.query("DELETE FROM user_totp WHERE user_id=$1", [q.user.id]);
      });
      s.json({ deleted: true });
    }),
  );
  
  // ===== Responsible Play Controls =====
  
  // Get responsible play settings
  a.get(
    "/api/account/responsible-play",
    auth,
    ar(async (q, s) => {
      let row = (await db.query(
        "SELECT * FROM responsible_play WHERE user_id=$1", [q.user.id],
      )).rows[0];
      if (!row) {
        await db.query(
          "INSERT INTO responsible_play(user_id) VALUES($1)", [q.user.id],
        );
        row = { user_id: q.user.id };
      }
      s.json({
        dailyLossLimit: row.daily_loss_limit ?? null,
        dailyWagerLimit: row.daily_wager_limit ?? null,
        coolingOffUntil: row.cooling_off_until ?? null,
        selfExcludedUntil: row.self_excluded_until ?? null,
      });
    }),
  );
  
  // Update responsible play settings
  a.post(
    "/api/account/responsible-play",
    auth,
    rateLimiter({ limit: 10 }),
    ar(async (q, s) => {
      const body = q.body || {};
      const has = (k) => Object.prototype.hasOwnProperty.call(body, k);
      const { dailyLossLimit, dailyWagerLimit, coolingOffHours, selfExclusionHours } = body;
      await transaction(db, async (c) => {
        // Guarantee a row exists, then only ever UPDATE — no fragile INSERT branch.
        await c.query(
          "INSERT INTO responsible_play(user_id) VALUES($1) ON CONFLICT(user_id) DO NOTHING",
          [q.user.id],
        );
        const current = (await c.query(
          "SELECT self_excluded_until FROM responsible_play WHERE user_id=$1",
          [q.user.id],
        )).rows[0];
        const sets = ["updated_at=now()"], params = [];
        let p = 2;
        // Daily limits: the player may set or clear these freely.
        if (has("dailyLossLimit")) {
          if (typeof dailyLossLimit === "number" && dailyLossLimit > 0) {
            sets.push(`daily_loss_limit=$${p++}`);
            params.push(Math.floor(dailyLossLimit));
          } else sets.push("daily_loss_limit=NULL");
        }
        if (has("dailyWagerLimit")) {
          if (typeof dailyWagerLimit === "number" && dailyWagerLimit > 0) {
            sets.push(`daily_wager_limit=$${p++}`);
            params.push(Math.floor(dailyWagerLimit));
          } else sets.push("daily_wager_limit=NULL");
        }
        // Cooling-off: only ever set when a positive duration is supplied. An
        // unrelated save must never silently clear an active cooling-off period.
        if (typeof coolingOffHours === "number" && coolingOffHours > 0) {
          sets.push(`cooling_off_until=$${p++}`);
          params.push(new Date(now() + coolingOffHours * 3600_000));
        }
        // Self-exclusion: may be set or EXTENDED only, never shortened or cleared
        // while active — a responsible-play control must not be trivially bypassable.
        if (typeof selfExclusionHours === "number" && selfExclusionHours > 0) {
          const target = new Date(now() + selfExclusionHours * 3600_000);
          const currentEnd = current?.self_excluded_until
            ? new Date(current.self_excluded_until)
            : null;
          if (!currentEnd || target > currentEnd) {
            sets.push(`self_excluded_until=$${p++}`);
            params.push(target);
          }
        }
        await c.query(
          `UPDATE responsible_play SET ${sets.join(", ")} WHERE user_id=$1`,
          [q.user.id, ...params],
        );
      });
      s.json({ updated: true });
    }),
  );
  
  // Check if user can play (advisory endpoint; the bet endpoint enforces the same rule)
  a.get(
    "/api/account/responsible-play/check",
    auth,
    ar(async (q, s) => {
      s.json(await rpStatus(q.user.id));
    }),
  );

  // ===== Progression / VIP + virtual bonuses (entertainment-only) =====

  a.get(
    "/api/account/progression",
    auth,
    ar(async (q, s) => {
      await ensureBonusRow(db, q.user.id);
      const xp = await wageredTotal(q.user.id);
      const level = levelFromXp(xp);
      const claimed = (
        await db.query("SELECT level_claimed FROM player_bonus WHERE user_id=$1", [q.user.id])
      ).rows[0].level_claimed;
      s.json({
        xp,
        level,
        rank: rankOf(level),
        levelClaimed: claimed,
        unclaimedLevels: Math.max(0, level - claimed),
        levelStartXp: xpForLevel(level),
        nextLevelXp: xpForLevel(level + 1),
      });
    }),
  );

  // Claim the level-up bonus for every level reached since the last claim.
  a.post(
    "/api/account/bonus/level-up",
    auth,
    rateLimiter({ limit: 10 }),
    ar(async (q, s) => {
      const level = levelFromXp(await wageredTotal(q.user.id));
      const result = await transaction(db, async (c) => {
        await ensureBonusRow(c, q.user.id);
        const from = (
          await c.query("SELECT level_claimed FROM player_bonus WHERE user_id=$1 FOR UPDATE", [q.user.id])
        ).rows[0].level_claimed;
        if (level <= from) return { granted: 0, from };
        let granted = 0;
        for (let lvl = from + 1; lvl <= level; lvl++) granted += levelUpReward(lvl);
        await c.query(
          "INSERT INTO wallet_ledger(user_id,amount,kind,idempotency_key,metadata)VALUES($1,$2,'adjustment',$3,$4)ON CONFLICT DO NOTHING",
          [q.user.id, granted, `levelup:${q.user.id}:${level}`, { reason: "level-up", fromLevel: from, toLevel: level }],
        );
        await c.query("UPDATE player_bonus SET level_claimed=$2, updated_at=now() WHERE user_id=$1", [q.user.id, level]);
        if (granted > 0)
          await notify(q.user.id, { kind: "level-up", title: `Level ${level} reached`, body: `You earned ${granted} credits — you're now ${rankOf(level)}.`, data: { level, rank: rankOf(level), granted } }, c);
        return { granted, from };
      });
      const w = await wallet(db, q.user.id);
      if (result.granted > 0)
        await push.dispatch(q.user.id, { kind: "level-up", title: `Level ${level} reached`, body: `You earned ${result.granted} credits — you're now ${rankOf(level)}.`, data: { level } }).catch(() => {});
      s.json({ granted: result.granted, level, rank: rankOf(level), balance: w.balance });
    }),
  );

  // Faucet: a small top-up for players who have run their virtual balance low,
  // available once per hour.
  a.post(
    "/api/account/bonus/faucet",
    auth,
    rateLimiter({ limit: 6 }),
    ar(async (q, s) => {
      const INTERVAL = 3600_000, THRESHOLD = 500, AMOUNT = 200, nowMs = now();
      await ensureBonusRow(db, q.user.id);
      const last = (
        await db.query("SELECT last_faucet_at FROM player_bonus WHERE user_id=$1", [q.user.id])
      ).rows[0].last_faucet_at;
      if (last && new Date(last).getTime() > nowMs - INTERVAL)
        return s.status(429).json({ error: "faucet_cooldown", availableAt: new Date(new Date(last).getTime() + INTERVAL).toISOString() });
      if ((await wallet(db, q.user.id)).balance >= THRESHOLD)
        return s.status(400).json({ error: "balance_too_high", threshold: THRESHOLD });
      await transaction(db, async (c) => {
        await c.query(
          "INSERT INTO wallet_ledger(user_id,amount,kind,idempotency_key,metadata)VALUES($1,$2,'adjustment',$3,$4)ON CONFLICT DO NOTHING",
          [q.user.id, AMOUNT, `faucet:${q.user.id}:${Math.floor(nowMs / INTERVAL)}`, { reason: "faucet" }],
        );
        await c.query("UPDATE player_bonus SET last_faucet_at=$2, updated_at=now() WHERE user_id=$1", [q.user.id, new Date(nowMs)]);
      });
      s.json({ granted: AMOUNT, balance: (await wallet(db, q.user.id)).balance });
    }),
  );

  // Cashback: refund a small share of net losses since the last claim.
  a.post(
    "/api/account/bonus/cashback",
    auth,
    rateLimiter({ limit: 6 }),
    ar(async (q, s) => {
      const RATE = 0.05;
      const out = await transaction(db, async (c) => {
        await c.query("SELECT pg_advisory_xact_lock($1)", [q.user.id]);
        await ensureBonusRow(c, q.user.id);
        const since = (
          await c.query("SELECT cashback_through FROM player_bonus WHERE user_id=$1 FOR UPDATE", [q.user.id])
        ).rows[0].cashback_through;
        const { rows: [r] } = await c.query(
          "SELECT COALESCE(SUM(amount),0) AS net FROM wallet_ledger WHERE user_id=$1 AND kind IN ('bet','win') AND created_at>=$2",
          [q.user.id, since],
        );
        const loss = Math.max(0, -Number(r.net)), granted = Math.floor(loss * RATE);
        if (granted > 0) {
          await c.query(
            "INSERT INTO wallet_ledger(user_id,amount,kind,idempotency_key,metadata)VALUES($1,$2,'adjustment',$3,$4)ON CONFLICT DO NOTHING",
            [q.user.id, granted, `cashback:${q.user.id}:${new Date(since).getTime()}`, { reason: "cashback", loss }],
          );
          await notify(q.user.id, { kind: "cashback", title: `Cashback: +${granted} credits`, body: `You got 5% back on ${loss} in net losses.`, data: { granted, loss } }, c);
        }
        await c.query("UPDATE player_bonus SET cashback_through=now(), updated_at=now() WHERE user_id=$1", [q.user.id]);
        return { granted, loss };
      });
      if (out.granted > 0)
        await push.dispatch(q.user.id, { kind: "cashback", title: `Cashback: +${out.granted} credits`, body: `You got 5% back on your recent net losses.`, data: { granted: out.granted } }).catch(() => {});
      s.json({ granted: out.granted, loss: out.loss, balance: (await wallet(db, q.user.id)).balance });
    }),
  );

  // ===== Wager challenges (achievement-style, virtual rewards) =====

  a.get(
    "/api/challenges",
    auth,
    ar(async (q, s) => {
      const wagered = await wageredTotal(q.user.id);
      const claimed = new Set(
        (await db.query("SELECT challenge_id FROM challenge_claims WHERE user_id=$1", [q.user.id])).rows.map((r) => r.challenge_id),
      );
      s.json({
        wagered,
        challenges: CHALLENGES.map((ch) => ({
          id: ch.id,
          target: ch.target,
          reward: ch.reward,
          completed: wagered >= ch.target,
          claimed: claimed.has(ch.id),
          progress: Math.min(1, wagered / ch.target),
        })),
      });
    }),
  );

  a.post(
    "/api/challenges/:id/claim",
    auth,
    rateLimiter({ limit: 20 }),
    ar(async (q, s) => {
      const ch = CHALLENGES.find((x) => x.id === q.params.id);
      if (!ch) return s.status(404).json({ error: "unknown_challenge" });
      const wagered = await wageredTotal(q.user.id);
      if (wagered < ch.target) return s.status(400).json({ error: "not_completed", wagered, target: ch.target });
      const result = await transaction(db, async (c) => {
        const ins = await c.query(
          "INSERT INTO challenge_claims(user_id,challenge_id) VALUES($1,$2) ON CONFLICT DO NOTHING RETURNING challenge_id",
          [q.user.id, ch.id],
        );
        if (!ins.rows.length) return { granted: 0 };
        await c.query(
          "INSERT INTO wallet_ledger(user_id,amount,kind,idempotency_key,metadata)VALUES($1,$2,'adjustment',$3,$4)ON CONFLICT DO NOTHING",
          [q.user.id, ch.reward, `challenge:${q.user.id}:${ch.id}`, { reason: "challenge", challengeId: ch.id }],
        );
        return { granted: ch.reward };
      });
      s.json({ granted: result.granted, balance: (await wallet(db, q.user.id)).balance });
    }),
  );

  // ===== Two-factor authentication (TOTP) =====

  a.get(
    "/api/account/2fa",
    auth,
    ar(async (q, s) => {
      const row = (await db.query("SELECT enabled FROM user_totp WHERE user_id=$1", [q.user.id])).rows[0];
      s.json({ enabled: !!row?.enabled });
    }),
  );

  // Begin enrolment: mint a fresh secret (disabled until confirmed).
  a.post(
    "/api/account/2fa/setup",
    auth,
    rateLimiter({ limit: 5 }),
    ar(async (q, s) => {
      const existing = (await db.query("SELECT enabled FROM user_totp WHERE user_id=$1", [q.user.id])).rows[0];
      if (existing?.enabled) return s.status(409).json({ error: "already_enabled" });
      const secret = generateSecret();
      await db.query(
        "INSERT INTO user_totp(user_id,secret,enabled) VALUES($1,$2,false) ON CONFLICT(user_id) DO UPDATE SET secret=$2,enabled=false,confirmed_at=NULL",
        [q.user.id, secret],
      );
      s.json({ secret, otpauth: otpauthUri(secret, { label: q.user.email, issuer: "Nova Casino" }) });
    }),
  );

  // Confirm enrolment with a valid code.
  a.post(
    "/api/account/2fa/enable",
    auth,
    rateLimiter({ limit: 10 }),
    ar(async (q, s) => {
      const row = (await db.query("SELECT secret,enabled FROM user_totp WHERE user_id=$1", [q.user.id])).rows[0];
      if (!row) return s.status(400).json({ error: "not_initialised" });
      if (row.enabled) return s.json({ enabled: true });
      if (!verifyTotp(row.secret, String(q.body?.code || ""), now()))
        return s.status(401).json({ error: "invalid_code" });
      await db.query("UPDATE user_totp SET enabled=true, confirmed_at=now() WHERE user_id=$1", [q.user.id]);
      s.json({ enabled: true });
    }),
  );

  // Turn 2FA off (requires a current code).
  a.post(
    "/api/account/2fa/disable",
    auth,
    rateLimiter({ limit: 10 }),
    ar(async (q, s) => {
      const row = (await db.query("SELECT secret,enabled FROM user_totp WHERE user_id=$1", [q.user.id])).rows[0];
      if (!row?.enabled) return s.json({ enabled: false });
      if (!verifyTotp(row.secret, String(q.body?.code || ""), now()))
        return s.status(401).json({ error: "invalid_code" });
      await db.query("DELETE FROM user_totp WHERE user_id=$1", [q.user.id]);
      s.json({ enabled: false });
    }),
  );

  // ===== Mines (stateful provably-fair original) =====

  a.post(
    "/api/mines/start",
    auth,
    rateLimiter({ limit: 60 }),
    ar(async (q, s) => {
      const { bet, mines, clientSeed } = q.body || {};
      if (
        !Number.isSafeInteger(bet) || bet < 1 || bet > 1e5 ||
        !Number.isInteger(mines) || mines < 1 || mines > TILES - 1 ||
        typeof clientSeed !== "string" || clientSeed.length < 8 || clientSeed.length > 128
      )
        return s.status(400).json({ error: "invalid_mines_start" });
      const rp = await rpStatus(q.user.id);
      if (!rp.allowed) return s.status(403).json({ error: "responsible_play_block", ...rp });
      const id = `mines_${crypto.randomUUID()}`, seed = newServerSeed(), hash = seedHash(seed);
      const result = await transaction(db, async (c) => {
        await c.query("SELECT pg_advisory_xact_lock($1)", [q.user.id]);
        if ((await wallet(db, q.user.id, c)).balance < bet) return { poor: true };
        await c.query(
          "INSERT INTO wallet_ledger(user_id,amount,kind,idempotency_key,metadata)VALUES($1,$2,'bet',$3,$4)",
          [q.user.id, -bet, `mines-bet:${id}`, { gameId: "mines", sessionId: id, mines }],
        );
        await c.query(
          "INSERT INTO mines_sessions(id,user_id,bet,mines,server_seed,server_seed_hash,client_seed)VALUES($1,$2,$3,$4,$5,$6,$7)",
          [id, q.user.id, bet, mines, seed, hash, clientSeed],
        );
        return { ok: true };
      });
      if (result.poor) return s.status(402).json({ error: "insufficient_funds" });
      s.status(201).json({
        sessionId: id,
        serverSeedHash: hash,
        mines,
        revealed: [],
        status: "active",
        multiplierNext: mineMultiplier(1, mines),
        balance: (await wallet(db, q.user.id)).balance,
      });
    }),
  );

  a.post(
    "/api/mines/reveal",
    auth,
    rateLimiter({ limit: 300 }),
    ar(async (q, s) => {
      const { sessionId, tile } = q.body || {};
      if (typeof sessionId !== "string" || !Number.isInteger(tile) || tile < 0 || tile >= TILES)
        return s.status(400).json({ error: "invalid_reveal" });
      const out = await transaction(db, async (c) => {
        await c.query("SELECT pg_advisory_xact_lock($1)", [q.user.id]);
        const x = (
          await c.query("SELECT * FROM mines_sessions WHERE id=$1 AND user_id=$2 FOR UPDATE", [sessionId, q.user.id])
        ).rows[0];
        if (!x) return { notFound: true };
        if (x.status !== "active") return { inactive: true };
        const revealed = Array.isArray(x.revealed) ? x.revealed : JSON.parse(x.revealed || "[]");
        if (revealed.includes(tile)) return { dup: true };
        const positions = minePositions(x.server_seed, x.client_seed, num(x.nonce), x.mines);
        if (positions.includes(tile)) {
          await c.query("UPDATE mines_sessions SET status='busted',settled_at=now() WHERE id=$1 AND status='active'", [sessionId]);
          return { busted: true, positions, serverSeed: x.server_seed };
        }
        const next = [...revealed, tile];
        if (next.length >= TILES - x.mines) {
          const win = Math.floor((num(x.bet) * mineMultiplierMilli(next.length, x.mines)) / 1000);
          await c.query(
            "INSERT INTO wallet_ledger(user_id,amount,kind,idempotency_key,metadata)VALUES($1,$2,'win',$3,$4)ON CONFLICT DO NOTHING",
            [q.user.id, win, `mines-win:${sessionId}`, { gameId: "mines", sessionId }],
          );
          await c.query("UPDATE mines_sessions SET revealed=$2,status='cashed',win=$3,settled_at=now() WHERE id=$1 AND status='active'", [sessionId, JSON.stringify(next), win]);
          return { cashed: true, revealed: next, win, positions, serverSeed: x.server_seed, mines: x.mines };
        }
        await c.query("UPDATE mines_sessions SET revealed=$2 WHERE id=$1 AND status='active'", [sessionId, JSON.stringify(next)]);
        return { safe: true, revealed: next, mines: x.mines };
      });
      if (out.notFound) return s.status(404).json({ error: "session_not_found" });
      if (out.inactive) return s.status(409).json({ error: "session_not_active" });
      if (out.dup) return s.status(400).json({ error: "already_revealed" });
      if (out.busted) return s.json({ status: "busted", isMine: true, minePositions: out.positions, serverSeed: out.serverSeed, win: 0 });
      if (out.cashed)
        return s.json({ status: "cashed", isMine: false, revealed: out.revealed, win: out.win, multiplier: mineMultiplier(out.revealed.length, out.mines), minePositions: out.positions, serverSeed: out.serverSeed, balance: (await wallet(db, q.user.id)).balance });
      return s.json({ status: "active", isMine: false, revealed: out.revealed, multiplier: mineMultiplier(out.revealed.length, out.mines), multiplierNext: mineMultiplier(out.revealed.length + 1, out.mines) });
    }),
  );

  a.post(
    "/api/mines/cashout",
    auth,
    rateLimiter({ limit: 60 }),
    ar(async (q, s) => {
      const { sessionId } = q.body || {};
      if (typeof sessionId !== "string") return s.status(400).json({ error: "invalid_cashout" });
      const out = await transaction(db, async (c) => {
        await c.query("SELECT pg_advisory_xact_lock($1)", [q.user.id]);
        const x = (
          await c.query("SELECT * FROM mines_sessions WHERE id=$1 AND user_id=$2 FOR UPDATE", [sessionId, q.user.id])
        ).rows[0];
        if (!x) return { notFound: true };
        if (x.status !== "active") return { inactive: true };
        const revealed = Array.isArray(x.revealed) ? x.revealed : JSON.parse(x.revealed || "[]");
        if (revealed.length < 1) return { tooEarly: true };
        const win = Math.floor((num(x.bet) * mineMultiplierMilli(revealed.length, x.mines)) / 1000);
        await c.query(
          "INSERT INTO wallet_ledger(user_id,amount,kind,idempotency_key,metadata)VALUES($1,$2,'win',$3,$4)ON CONFLICT DO NOTHING",
          [q.user.id, win, `mines-win:${sessionId}`, { gameId: "mines", sessionId }],
        );
        await c.query("UPDATE mines_sessions SET status='cashed',win=$2,settled_at=now() WHERE id=$1 AND status='active'", [sessionId, win]);
        return { win, k: revealed.length, mines: x.mines, positions: minePositions(x.server_seed, x.client_seed, num(x.nonce), x.mines), serverSeed: x.server_seed };
      });
      if (out.notFound) return s.status(404).json({ error: "session_not_found" });
      if (out.inactive) return s.status(409).json({ error: "session_not_active" });
      if (out.tooEarly) return s.status(400).json({ error: "no_tiles_revealed" });
      s.json({ status: "cashed", win: out.win, multiplier: mineMultiplier(out.k, out.mines), minePositions: out.positions, serverSeed: out.serverSeed, balance: (await wallet(db, q.user.id)).balance });
    }),
  );

  // ===== Hi-Lo (stateful provably-fair original) =====

  const hiloOptions = (rank) => ({
    higher: stepMultiplierMilli(rank, "hi") / 1000,
    lower: stepMultiplierMilli(rank, "lo") / 1000,
  });

  a.post(
    "/api/hilo/start",
    auth,
    rateLimiter({ limit: 60 }),
    ar(async (q, s) => {
      const { bet, clientSeed } = q.body || {};
      if (!Number.isSafeInteger(bet) || bet < 1 || bet > 1e5 || typeof clientSeed !== "string" || clientSeed.length < 8 || clientSeed.length > 128)
        return s.status(400).json({ error: "invalid_hilo_start" });
      const rp = await rpStatus(q.user.id);
      if (!rp.allowed) return s.status(403).json({ error: "responsible_play_block", ...rp });
      const id = `hilo_${crypto.randomUUID()}`, seed = newServerSeed(), hash = seedHash(seed);
      const card = cardAt(seed, clientSeed, 0, 0);
      const result = await transaction(db, async (c) => {
        await c.query("SELECT pg_advisory_xact_lock($1)", [q.user.id]);
        if ((await wallet(db, q.user.id, c)).balance < bet) return { poor: true };
        await c.query("INSERT INTO wallet_ledger(user_id,amount,kind,idempotency_key,metadata)VALUES($1,$2,'bet',$3,$4)", [q.user.id, -bet, `hilo-bet:${id}`, { gameId: "hilo", sessionId: id }]);
        await c.query("INSERT INTO hilo_sessions(id,user_id,bet,server_seed,server_seed_hash,client_seed,current_rank,current_suit)VALUES($1,$2,$3,$4,$5,$6,$7,$8)", [id, q.user.id, bet, seed, hash, clientSeed, card.rank, card.suit]);
        return { ok: true };
      });
      if (result.poor) return s.status(402).json({ error: "insufficient_funds" });
      s.status(201).json({ sessionId: id, serverSeedHash: hash, card, multiplier: 1, options: hiloOptions(card.rank), balance: (await wallet(db, q.user.id)).balance });
    }),
  );

  a.post(
    "/api/hilo/guess",
    auth,
    rateLimiter({ limit: 300 }),
    ar(async (q, s) => {
      const { sessionId, direction } = q.body || {};
      if (typeof sessionId !== "string" || (direction !== "hi" && direction !== "lo"))
        return s.status(400).json({ error: "invalid_guess" });
      const out = await transaction(db, async (c) => {
        await c.query("SELECT pg_advisory_xact_lock($1)", [q.user.id]);
        const x = (await c.query("SELECT * FROM hilo_sessions WHERE id=$1 AND user_id=$2 FOR UPDATE", [sessionId, q.user.id])).rows[0];
        if (!x) return { notFound: true };
        if (x.status !== "active") return { inactive: true };
        const next = cardAt(x.server_seed, x.client_seed, num(x.nonce), num(x.steps) + 1);
        if (!isWin(next.rank, x.current_rank, direction)) {
          await c.query("UPDATE hilo_sessions SET status='busted',settled_at=now() WHERE id=$1 AND status='active'", [sessionId]);
          return { busted: true, card: next, serverSeed: x.server_seed };
        }
        const newMult = Math.round((num(x.mult_milli) * stepMultiplierMilli(x.current_rank, direction)) / 1000);
        await c.query("UPDATE hilo_sessions SET steps=steps+1,current_rank=$2,current_suit=$3,mult_milli=$4 WHERE id=$1 AND status='active'", [sessionId, next.rank, next.suit, newMult]);
        return { correct: true, card: next, multMilli: newMult };
      });
      if (out.notFound) return s.status(404).json({ error: "session_not_found" });
      if (out.inactive) return s.status(409).json({ error: "session_not_active" });
      if (out.busted) return s.json({ status: "busted", correct: false, card: out.card, serverSeed: out.serverSeed, win: 0 });
      return s.json({ status: "active", correct: true, card: out.card, multiplier: out.multMilli / 1000, options: hiloOptions(out.card.rank) });
    }),
  );

  a.post(
    "/api/hilo/cashout",
    auth,
    rateLimiter({ limit: 60 }),
    ar(async (q, s) => {
      const { sessionId } = q.body || {};
      if (typeof sessionId !== "string") return s.status(400).json({ error: "invalid_cashout" });
      const out = await transaction(db, async (c) => {
        await c.query("SELECT pg_advisory_xact_lock($1)", [q.user.id]);
        const x = (await c.query("SELECT * FROM hilo_sessions WHERE id=$1 AND user_id=$2 FOR UPDATE", [sessionId, q.user.id])).rows[0];
        if (!x) return { notFound: true };
        if (x.status !== "active") return { inactive: true };
        if (num(x.steps) < 1) return { tooEarly: true };
        const win = Math.floor((num(x.bet) * num(x.mult_milli)) / 1000);
        await c.query("INSERT INTO wallet_ledger(user_id,amount,kind,idempotency_key,metadata)VALUES($1,$2,'win',$3,$4)ON CONFLICT DO NOTHING", [q.user.id, win, `hilo-win:${sessionId}`, { gameId: "hilo", sessionId }]);
        await c.query("UPDATE hilo_sessions SET status='cashed',win=$2,settled_at=now() WHERE id=$1 AND status='active'", [sessionId, win]);
        return { win, multMilli: num(x.mult_milli), serverSeed: x.server_seed };
      });
      if (out.notFound) return s.status(404).json({ error: "session_not_found" });
      if (out.inactive) return s.status(409).json({ error: "session_not_active" });
      if (out.tooEarly) return s.status(400).json({ error: "no_guesses_made" });
      s.json({ status: "cashed", win: out.win, multiplier: out.multMilli / 1000, serverSeed: out.serverSeed, balance: (await wallet(db, q.user.id)).balance });
    }),
  );

  // ===== Blackjack (stateful provably-fair) =====

  const bjTotal = (cards) => bjValue(cards).total;
  const bjArr = (v) => (Array.isArray(v) ? v : JSON.parse(v || "[]"));

  a.post(
    "/api/blackjack/start",
    auth,
    rateLimiter({ limit: config.bjStartLimit || 60 }),
    ar(async (q, s) => {
      const { bet, clientSeed } = q.body || {};
      if (!Number.isSafeInteger(bet) || bet < 1 || bet > 1e5 || typeof clientSeed !== "string" || clientSeed.length < 8 || clientSeed.length > 128)
        return s.status(400).json({ error: "invalid_blackjack_start" });
      const rp = await rpStatus(q.user.id);
      if (!rp.allowed) return s.status(403).json({ error: "responsible_play_block", ...rp });
      const id = `bj_${crypto.randomUUID()}`, seed = newServerSeed(), hash = seedHash(seed);
      const draw = (i) => bjCardAt(seed, clientSeed, 0, i);
      const player = [draw(0), draw(1)], dealer = [draw(2), draw(3)];
      const pBJ = isBlackjack(player), dBJ = isBlackjack(dealer);
      const out = await transaction(db, async (c) => {
        await c.query("SELECT pg_advisory_xact_lock($1)", [q.user.id]);
        if ((await wallet(db, q.user.id, c)).balance < bet) return { poor: true };
        await c.query("INSERT INTO wallet_ledger(user_id,amount,kind,idempotency_key,metadata)VALUES($1,$2,'bet',$3,$4)", [q.user.id, -bet, `bj-bet:${id}`, { gameId: "blackjack", sessionId: id }]);
        if (pBJ || dBJ) {
          const result = pBJ && dBJ ? "push" : pBJ ? "won" : "lost";
          const win = Math.floor((bet * (result === "push" ? 1000 : result === "won" ? 2500 : 0)) / 1000);
          if (win > 0) await c.query("INSERT INTO wallet_ledger(user_id,amount,kind,idempotency_key,metadata)VALUES($1,$2,'win',$3,$4)ON CONFLICT DO NOTHING", [q.user.id, win, `bj-win:${id}`, { gameId: "blackjack", sessionId: id }]);
          await c.query("INSERT INTO blackjack_sessions(id,user_id,bet,staked,server_seed,server_seed_hash,client_seed,player_cards,dealer_cards,status,win,settled_at)VALUES($1,$2,$3,$3,$4,$5,$6,$7,$8,$9,$10,now())", [id, q.user.id, bet, seed, hash, clientSeed, JSON.stringify(player), JSON.stringify(dealer), result, win]);
          return { terminal: true, result, win };
        }
        await c.query("INSERT INTO blackjack_sessions(id,user_id,bet,staked,server_seed,server_seed_hash,client_seed,player_cards,dealer_cards)VALUES($1,$2,$3,$3,$4,$5,$6,$7,$8)", [id, q.user.id, bet, seed, hash, clientSeed, JSON.stringify(player), JSON.stringify(dealer)]);
        return { terminal: false };
      });
      if (out.poor) return s.status(402).json({ error: "insufficient_funds" });
      const balance = (await wallet(db, q.user.id)).balance;
      if (out.terminal)
        return s.status(201).json({ status: out.result, sessionId: id, serverSeedHash: hash, playerCards: player, playerValue: bjTotal(player), dealerCards: dealer, dealerValue: bjTotal(dealer), win: out.win, blackjack: pBJ, serverSeed: seed, balance });
      s.status(201).json({ status: "active", sessionId: id, serverSeedHash: hash, playerCards: player, playerValue: bjTotal(player), dealerUpCard: dealer[0], canDouble: true, balance });
    }),
  );

  a.post(
    "/api/blackjack/action",
    auth,
    rateLimiter({ limit: 300 }),
    ar(async (q, s) => {
      const { sessionId, move } = q.body || {};
      if (typeof sessionId !== "string" || !["hit", "stand", "double"].includes(move))
        return s.status(400).json({ error: "invalid_action" });
      const out = await transaction(db, async (c) => {
        await c.query("SELECT pg_advisory_xact_lock($1)", [q.user.id]);
        const x = (await c.query("SELECT * FROM blackjack_sessions WHERE id=$1 AND user_id=$2 FOR UPDATE", [sessionId, q.user.id])).rows[0];
        if (!x) return { notFound: true };
        if (x.status !== "active") return { inactive: true };
        const player = bjArr(x.player_cards), dealer = bjArr(x.dealer_cards);
        let next = num(x.next_index), staked = num(x.staked);
        const drawCard = () => bjCardAt(x.server_seed, x.client_seed, num(x.nonce), next++);
        const finish = async (doubled) => {
          if (bjTotal(player) <= 21) while (dealerShouldHit(dealer)) dealer.push(drawCard());
          const result = bjResolve(player, dealer);
          const win = Math.floor((staked * (result === "won" ? 2000 : result === "push" ? 1000 : 0)) / 1000);
          if (win > 0) await c.query("INSERT INTO wallet_ledger(user_id,amount,kind,idempotency_key,metadata)VALUES($1,$2,'win',$3,$4)ON CONFLICT DO NOTHING", [q.user.id, win, `bj-win:${sessionId}`, { gameId: "blackjack", sessionId }]);
          await c.query("UPDATE blackjack_sessions SET player_cards=$2,dealer_cards=$3,next_index=$4,staked=$5,doubled=$6,status=$7,win=$8,settled_at=now() WHERE id=$1 AND status='active'", [sessionId, JSON.stringify(player), JSON.stringify(dealer), next, staked, !!doubled, result, win]);
          return { terminal: true, result, win, player, dealer, serverSeed: x.server_seed };
        };
        if (move === "hit") {
          player.push(drawCard());
          if (bjTotal(player) > 21) return finish(false);
          await c.query("UPDATE blackjack_sessions SET player_cards=$2,next_index=$3 WHERE id=$1 AND status='active'", [sessionId, JSON.stringify(player), next]);
          return { terminal: false, player };
        }
        if (move === "double") {
          if (player.length !== 2) return { cannotDouble: true };
          if ((await wallet(db, q.user.id, c)).balance < num(x.bet)) return { poor: true };
          await c.query("INSERT INTO wallet_ledger(user_id,amount,kind,idempotency_key,metadata)VALUES($1,$2,'bet',$3,$4)", [q.user.id, -num(x.bet), `bj-double:${sessionId}`, { gameId: "blackjack", sessionId }]);
          staked = num(x.bet) * 2;
          player.push(drawCard());
          return finish(true);
        }
        return finish(false); // stand
      });
      if (out.notFound) return s.status(404).json({ error: "session_not_found" });
      if (out.inactive) return s.status(409).json({ error: "session_not_active" });
      if (out.cannotDouble) return s.status(400).json({ error: "cannot_double" });
      if (out.poor) return s.status(402).json({ error: "insufficient_funds" });
      const balance = (await wallet(db, q.user.id)).balance;
      if (out.terminal)
        return s.json({ status: out.result, playerCards: out.player, playerValue: bjTotal(out.player), dealerCards: out.dealer, dealerValue: bjTotal(out.dealer), win: out.win, serverSeed: out.serverSeed, balance });
      s.json({ status: "active", playerCards: out.player, playerValue: bjTotal(out.player), canDouble: false, balance });
    }),
  );

  // ===== Casino Hold'em (stateful provably-fair poker) =====

  const handName = (h) => POKER_CATEGORIES[h.category];

  a.post(
    "/api/holdem/start",
    auth,
    rateLimiter({ limit: 60 }),
    ar(async (q, s) => {
      const { bet, clientSeed } = q.body || {};
      if (!Number.isSafeInteger(bet) || bet < 1 || bet > 1e5 || typeof clientSeed !== "string" || clientSeed.length < 8 || clientSeed.length > 128)
        return s.status(400).json({ error: "invalid_holdem_start" });
      const rp = await rpStatus(q.user.id);
      if (!rp.allowed) return s.status(403).json({ error: "responsible_play_block", ...rp });
      const id = `holdem_${crypto.randomUUID()}`, seed = newServerSeed(), hash = seedHash(seed);
      const deck = shuffledDeck(seed, clientSeed, 0);
      const player = [deck[0], deck[1]], dealer = [deck[2], deck[3]], community = deck.slice(4, 9);
      const out = await transaction(db, async (c) => {
        await c.query("SELECT pg_advisory_xact_lock($1)", [q.user.id]);
        if ((await wallet(db, q.user.id, c)).balance < bet) return { poor: true };
        await c.query("INSERT INTO wallet_ledger(user_id,amount,kind,idempotency_key,metadata)VALUES($1,$2,'bet',$3,$4)", [q.user.id, -bet, `ch-bet:${id}`, { gameId: "holdem", sessionId: id }]);
        await c.query("INSERT INTO holdem_sessions(id,user_id,ante,staked,server_seed,server_seed_hash,client_seed,player_cards,dealer_cards,community)VALUES($1,$2,$3,$3,$4,$5,$6,$7,$8,$9)", [id, q.user.id, bet, seed, hash, clientSeed, JSON.stringify(player), JSON.stringify(dealer), JSON.stringify(community)]);
        return { ok: true };
      });
      if (out.poor) return s.status(402).json({ error: "insufficient_funds" });
      s.status(201).json({ sessionId: id, serverSeedHash: hash, playerCards: player, flop: community.slice(0, 3), status: "active", balance: (await wallet(db, q.user.id)).balance });
    }),
  );

  a.post(
    "/api/holdem/action",
    auth,
    rateLimiter({ limit: 120 }),
    ar(async (q, s) => {
      const { sessionId, move } = q.body || {};
      if (typeof sessionId !== "string" || (move !== "call" && move !== "fold"))
        return s.status(400).json({ error: "invalid_action" });
      const out = await transaction(db, async (c) => {
        await c.query("SELECT pg_advisory_xact_lock($1)", [q.user.id]);
        const x = (await c.query("SELECT * FROM holdem_sessions WHERE id=$1 AND user_id=$2 FOR UPDATE", [sessionId, q.user.id])).rows[0];
        if (!x) return { notFound: true };
        if (x.status !== "active") return { inactive: true };
        const player = bjArr(x.player_cards), dealer = bjArr(x.dealer_cards), community = bjArr(x.community), ante = num(x.ante);
        if (move === "fold") {
          await c.query("UPDATE holdem_sessions SET status='lost',settled_at=now() WHERE id=$1 AND status='active'", [sessionId]);
          return { terminal: true, status: "lost", win: 0, player, dealer, community, serverSeed: x.server_seed };
        }
        const call = ante * 2;
        if ((await wallet(db, q.user.id, c)).balance < call) return { poor: true };
        await c.query("INSERT INTO wallet_ledger(user_id,amount,kind,idempotency_key,metadata)VALUES($1,$2,'bet',$3,$4)", [q.user.id, -call, `ch-call:${sessionId}`, { gameId: "holdem", sessionId }]);
        const pBest = best5of7([...player, ...community]), dBest = best5of7([...dealer, ...community]);
        const cmp = pokerCompare(pBest, dBest), dq = qualifies(dBest), odds = anteOdds(pBest);
        let status, win;
        if (!dq) { status = "won"; win = ante * (1 + odds) + call; }
        else if (cmp > 0) { status = "won"; win = ante * (1 + odds) + call * 2; }
        else if (cmp < 0) { status = "lost"; win = 0; }
        else { status = "push"; win = ante + call; }
        if (win > 0) await c.query("INSERT INTO wallet_ledger(user_id,amount,kind,idempotency_key,metadata)VALUES($1,$2,'win',$3,$4)ON CONFLICT DO NOTHING", [q.user.id, win, `ch-win:${sessionId}`, { gameId: "holdem", sessionId }]);
        await c.query("UPDATE holdem_sessions SET staked=$2,status=$3,win=$4,settled_at=now() WHERE id=$1 AND status='active'", [sessionId, ante + call, status, win]);
        return { terminal: true, status, win, player, dealer, community, serverSeed: x.server_seed, dealerQualified: dq, pBest, dBest };
      });
      if (out.notFound) return s.status(404).json({ error: "session_not_found" });
      if (out.inactive) return s.status(409).json({ error: "session_not_active" });
      if (out.poor) return s.status(402).json({ error: "insufficient_funds" });
      const balance = (await wallet(db, q.user.id)).balance;
      s.json({ status: out.status, win: out.win, playerCards: out.player, dealerCards: out.dealer, community: out.community, playerHand: out.pBest ? handName(out.pBest) : null, dealerHand: out.dBest ? handName(out.dBest) : null, dealerQualified: out.dealerQualified ?? null, serverSeed: out.serverSeed, balance });
    }),
  );

  // ===== Video Poker (Jacks or Better) =====

  a.post(
    "/api/videopoker/start",
    auth,
    rateLimiter({ limit: 60 }),
    ar(async (q, s) => {
      const { bet, clientSeed } = q.body || {};
      if (!Number.isSafeInteger(bet) || bet < 1 || bet > 1e5 || typeof clientSeed !== "string" || clientSeed.length < 8 || clientSeed.length > 128)
        return s.status(400).json({ error: "invalid_videopoker_start" });
      const rp = await rpStatus(q.user.id);
      if (!rp.allowed) return s.status(403).json({ error: "responsible_play_block", ...rp });
      const id = `vp_${crypto.randomUUID()}`, seed = newServerSeed(), hash = seedHash(seed);
      const cards = shuffledDeck(seed, clientSeed, 0, "vpoker").slice(0, 10);
      const out = await transaction(db, async (c) => {
        await c.query("SELECT pg_advisory_xact_lock($1)", [q.user.id]);
        if ((await wallet(db, q.user.id, c)).balance < bet) return { poor: true };
        await c.query("INSERT INTO wallet_ledger(user_id,amount,kind,idempotency_key,metadata)VALUES($1,$2,'bet',$3,$4)", [q.user.id, -bet, `vp-bet:${id}`, { gameId: "videopoker", sessionId: id }]);
        await c.query("INSERT INTO videopoker_sessions(id,user_id,bet,server_seed,server_seed_hash,client_seed,cards)VALUES($1,$2,$3,$4,$5,$6,$7)", [id, q.user.id, bet, seed, hash, clientSeed, JSON.stringify(cards)]);
        return { ok: true };
      });
      if (out.poor) return s.status(402).json({ error: "insufficient_funds" });
      s.status(201).json({ sessionId: id, serverSeedHash: hash, cards: cards.slice(0, 5), status: "active", balance: (await wallet(db, q.user.id)).balance });
    }),
  );

  a.post(
    "/api/videopoker/draw",
    auth,
    rateLimiter({ limit: 120 }),
    ar(async (q, s) => {
      const { sessionId, hold } = q.body || {};
      if (typeof sessionId !== "string" || !Array.isArray(hold) || hold.length > 5 || !hold.every((i) => Number.isInteger(i) && i >= 0 && i < 5) || new Set(hold).size !== hold.length)
        return s.status(400).json({ error: "invalid_draw" });
      const out = await transaction(db, async (c) => {
        await c.query("SELECT pg_advisory_xact_lock($1)", [q.user.id]);
        const x = (await c.query("SELECT * FROM videopoker_sessions WHERE id=$1 AND user_id=$2 FOR UPDATE", [sessionId, q.user.id])).rows[0];
        if (!x) return { notFound: true };
        if (x.status !== "active") return { inactive: true };
        const cards = bjArr(x.cards), dealt = cards.slice(0, 5), drawPile = cards.slice(5), bet = num(x.bet);
        let di = 0;
        const final = dealt.map((card, i) => (hold.includes(i) ? card : drawPile[di++]));
        const hand = evaluate5(final), pay = videoPokerPayout(hand), win = bet * pay;
        if (win > 0) await c.query("INSERT INTO wallet_ledger(user_id,amount,kind,idempotency_key,metadata)VALUES($1,$2,'win',$3,$4)ON CONFLICT DO NOTHING", [q.user.id, win, `vp-win:${sessionId}`, { gameId: "videopoker", sessionId }]);
        const status = pay > 0 ? "won" : "lost";
        await c.query("UPDATE videopoker_sessions SET cards=$2,status=$3,win=$4,settled_at=now() WHERE id=$1 AND status='active'", [sessionId, JSON.stringify(final), status, win]);
        return { terminal: true, status, win, final, hand, pay, serverSeed: x.server_seed };
      });
      if (out.notFound) return s.status(404).json({ error: "session_not_found" });
      if (out.inactive) return s.status(409).json({ error: "session_not_active" });
      s.json({ status: out.status, cards: out.final, hand: handName(out.hand), payout: out.pay, win: out.win, serverSeed: out.serverSeed, balance: (await wallet(db, q.user.id)).balance });
    }),
  );

  // ===== Races / tournaments (wager leaderboard with a virtual prize pool) =====

  const RACE_PRIZE_PCT = [0.5, 0.3, 0.2];
  const raceAlias = (userId) =>
    "Player #" + crypto.createHash("sha256").update(`race${userId}`).digest("hex").slice(0, 4).toUpperCase();
  const raceStandings = async (race, limit, executor = db) => {
    const rows = (await executor.query(
      `SELECT user_id, COALESCE(SUM(amount),0) AS s FROM wallet_ledger WHERE kind='bet' AND created_at>=$1 AND created_at<$2 GROUP BY user_id ORDER BY SUM(amount) ASC LIMIT ${Math.floor(limit)}`,
      [race.starts_at, race.ends_at],
    )).rows;
    return rows.map((r, i) => ({ rank: i + 1, userId: String(r.user_id), alias: raceAlias(r.user_id), wagered: -Number(r.s) }));
  };

  a.get(
    "/api/races",
    auth,
    ar(async (q, s) => {
      const dbNow = new Date((await db.query("SELECT now() AS t")).rows[0].t);
      const races = (await db.query("SELECT id,name,starts_at,ends_at,prize_pool,settled FROM races ORDER BY ends_at DESC LIMIT 20")).rows;
      const list = [];
      for (const r of races) {
        const active = new Date(r.starts_at) <= dbNow && new Date(r.ends_at) > dbNow;
        const entry = { id: r.id, name: r.name, startsAt: r.starts_at, endsAt: r.ends_at, prizePool: Number(r.prize_pool), settled: r.settled, active };
        if (active) {
          const st = await raceStandings(r, 100);
          const mine = st.find((x) => x.userId === String(q.user.id));
          entry.players = st.length;
          entry.myRank = mine ? mine.rank : null;
          entry.myWagered = mine ? mine.wagered : 0;
        }
        list.push(entry);
      }
      s.json({ races: list });
    }),
  );

  a.get(
    "/api/races/:id",
    auth,
    ar(async (q, s) => {
      const r = (await db.query("SELECT * FROM races WHERE id=$1", [q.params.id])).rows[0];
      if (!r) return s.status(404).json({ error: "race_not_found" });
      const st = await raceStandings(r, 20);
      const mine = st.find((x) => x.userId === String(q.user.id));
      s.json({
        id: r.id, name: r.name, startsAt: r.starts_at, endsAt: r.ends_at, prizePool: Number(r.prize_pool), settled: r.settled,
        prizes: RACE_PRIZE_PCT.map((p, i) => ({ rank: i + 1, prize: Math.floor(Number(r.prize_pool) * p) })),
        standings: st.map((x) => ({ rank: x.rank, alias: x.alias, wagered: x.wagered, you: x.userId === String(q.user.id) })),
        myRank: mine ? mine.rank : null,
        myWagered: mine ? mine.wagered : 0,
      });
    }),
  );

  a.post(
    "/api/races/:id/settle",
    auth,
    rateLimiter({ limit: 30 }),
    ar(async (q, s) => {
      const out = await transaction(db, async (c) => {
        const r = (await c.query("SELECT * FROM races WHERE id=$1 FOR UPDATE", [q.params.id])).rows[0];
        if (!r) return { notFound: true };
        if (r.settled) return { already: true };
        const dbNow = new Date((await c.query("SELECT now() AS t")).rows[0].t);
        if (new Date(r.ends_at) > dbNow) return { notEnded: true };
        const claimed = (await c.query("UPDATE races SET settled=true WHERE id=$1 AND settled=false RETURNING id", [r.id])).rows[0];
        if (!claimed) return { already: true };
        const top = await raceStandings(r, RACE_PRIZE_PCT.length, c);
        const payouts = [];
        for (let i = 0; i < top.length; i++) {
          const prize = Math.floor(Number(r.prize_pool) * RACE_PRIZE_PCT[i]);
          if (prize > 0) {
            await c.query(
              "INSERT INTO wallet_ledger(user_id,amount,kind,idempotency_key,metadata)VALUES($1,$2,'adjustment',$3,$4)ON CONFLICT DO NOTHING",
              [top[i].userId, prize, `race:${r.id}:${top[i].userId}`, { reason: "race-prize", raceId: r.id, rank: i + 1 }],
            );
            await notify(top[i].userId, { kind: "race-prize", title: `Race prize: +${prize} credits`, body: `You finished #${i + 1} in ${r.name}.`, data: { raceId: r.id, rank: i + 1, prize } }, c);
          }
          payouts.push({ rank: i + 1, alias: top[i].alias, prize, userId: top[i].userId });
        }
        return { payouts };
      });
      if (out.notFound) return s.status(404).json({ error: "race_not_found" });
      if (out.already) return s.status(409).json({ error: "already_settled" });
      if (out.notEnded) return s.status(400).json({ error: "race_not_ended" });
      for (const p of out.payouts)
        if (p.prize > 0)
          await push.dispatch(p.userId, { kind: "race-prize", title: `Race prize: +${p.prize} credits`, body: `You finished #${p.rank} in the race.`, data: { rank: p.rank, prize: p.prize } }).catch(() => {});
      // Don't leak other players' user ids in the response — alias only.
      s.json({ settled: true, payouts: out.payouts.map(({ userId, ...rest }) => rest) });
    }),
  );

  // ===== Public lobby chat (single shared room) =====
  const SSE_HEADERS = { "Content-Type": "text/event-stream", "Cache-Control": "no-cache", Connection: "keep-alive", "X-Accel-Buffering": "no" };
  const chatRow = (r) => ({ id: String(r.id), userId: Number(r.user_id), name: r.display_name, body: r.body, at: r.created_at });
  const CHAT_SELECT = "SELECT m.id,m.user_id,m.body,m.created_at,u.display_name FROM chat_messages m JOIN users u ON u.id=m.user_id";

  // Readable by everyone; posting requires auth. Aliased? No — chat is opt-in and
  // players type under their own display name.
  a.get(
    "/api/chat/recent",
    ar(async (q, s) => {
      const rows = (await db.query(CHAT_SELECT + " ORDER BY m.id DESC LIMIT 50")).rows.reverse();
      s.json({ messages: rows.map(chatRow) });
    }),
  );

  a.post(
    "/api/chat",
    auth,
    rateLimiter({ limit: 20 }),
    ar(async (q, s) => {
      const body = sanitizeChat(q.body?.body);
      if (!body) return s.status(400).json({ error: "empty_message", max: CHAT_MAX });
      const { rows: [m] } = await db.query(
        "INSERT INTO chat_messages(user_id,body)VALUES($1,$2)RETURNING id,user_id,body,created_at",
        [q.user.id, body],
      );
      s.status(201).json({ message: chatRow({ ...m, display_name: q.user.display_name }) });
    }),
  );

  a.get(
    "/api/chat/feed",
    ar(async (q, s) => {
      s.set(SSE_HEADERS);
      s.flushHeaders?.();
      let lastId = 0;
      const emit = (event, data) => s.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
      const recent = (await db.query(CHAT_SELECT + " ORDER BY m.id DESC LIMIT 30")).rows.reverse();
      for (const r of recent) { lastId = Math.max(lastId, Number(r.id)); emit("message", chatRow(r)); }
      emit("ready", { since: lastId });
      const poll = async () => {
        const rows = (await db.query(CHAT_SELECT + " WHERE m.id>$1 ORDER BY m.id ASC LIMIT 50", [lastId])).rows;
        for (const r of rows) { lastId = Math.max(lastId, Number(r.id)); emit("message", chatRow(r)); }
      };
      const iv = setInterval(() => poll().catch(() => {}), 2000);
      q.on("close", () => { clearInterval(iv); s.end(); });
    }),
  );

  // ===== Notification center (per-user) =====
  const notifRow = (r) => ({ id: String(r.id), kind: r.kind, title: r.title, body: r.body, data: r.data || {}, read: !!r.read_at, at: r.created_at });
  const unreadCount = async (userId) =>
    Number((await db.query("SELECT COUNT(*) AS n FROM notifications WHERE user_id=$1 AND read_at IS NULL", [userId])).rows[0].n);

  a.get(
    "/api/notifications",
    auth,
    ar(async (q, s) => {
      const rows = (await db.query(
        "SELECT id,kind,title,body,data,read_at,created_at FROM notifications WHERE user_id=$1 ORDER BY id DESC LIMIT 50",
        [q.user.id],
      )).rows;
      s.json({ notifications: rows.map(notifRow), unread: await unreadCount(q.user.id) });
    }),
  );

  // Mark specific ids read, or (no ids) mark every unread notification read.
  a.post(
    "/api/notifications/read",
    auth,
    rateLimiter({ limit: 30 }),
    ar(async (q, s) => {
      const ids = Array.isArray(q.body?.ids) ? q.body.ids.map(Number).filter(Number.isInteger) : null;
      if (ids && ids.length) {
        const ph = ids.map((_, i) => `$${i + 2}`).join(",");
        await db.query(`UPDATE notifications SET read_at=now() WHERE user_id=$1 AND read_at IS NULL AND id IN (${ph})`, [q.user.id, ...ids]);
      } else {
        await db.query("UPDATE notifications SET read_at=now() WHERE user_id=$1 AND read_at IS NULL", [q.user.id]);
      }
      s.json({ unread: await unreadCount(q.user.id) });
    }),
  );

  a.get(
    "/api/notifications/feed",
    auth,
    ar(async (q, s) => {
      s.set(SSE_HEADERS);
      s.flushHeaders?.();
      const emit = (event, data) => s.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
      let lastId = Number((await db.query("SELECT COALESCE(MAX(id),0) AS m FROM notifications WHERE user_id=$1", [q.user.id])).rows[0].m);
      emit("ready", { unread: await unreadCount(q.user.id) });
      const poll = async () => {
        const rows = (await db.query(
          "SELECT id,kind,title,body,data,read_at,created_at FROM notifications WHERE user_id=$1 AND id>$2 ORDER BY id ASC LIMIT 50",
          [q.user.id, lastId],
        )).rows;
        for (const r of rows) { lastId = Math.max(lastId, Number(r.id)); emit("notification", notifRow(r)); }
      };
      const iv = setInterval(() => poll().catch(() => {}), 3000);
      q.on("close", () => { clearInterval(iv); s.end(); });
    }),
  );

  // ===== Live win feed (derived from the ledger; privacy-aliased) =====

  const liveAlias = (userId) =>
    "Player #" + crypto.createHash("sha256").update(`live${userId}`).digest("hex").slice(0, 4).toUpperCase();
  const liveRow = (r) => ({ id: String(r.id), alias: liveAlias(r.user_id), gameId: r.metadata?.gameId || null, win: Number(r.amount), at: r.created_at });

  // Public, privacy-aliased social proof (no PII), so a logged-out visitor sees it too.
  a.get(
    "/api/live/recent",
    ar(async (q, s) => {
      const rows = (await db.query(
        "SELECT id,user_id,amount,metadata,created_at FROM wallet_ledger WHERE kind='win' AND amount>0 ORDER BY id DESC LIMIT 20",
      )).rows;
      s.json({ feed: rows.map(liveRow) });
    }),
  );

  a.get(
    "/api/live/feed",
    ar(async (q, s) => {
      s.set({ "Content-Type": "text/event-stream", "Cache-Control": "no-cache", Connection: "keep-alive", "X-Accel-Buffering": "no" });
      s.flushHeaders?.();
      let lastId = 0;
      const emit = (event, data) => s.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
      const recent = (await db.query(
        "SELECT id,user_id,amount,metadata,created_at FROM wallet_ledger WHERE kind='win' AND amount>0 ORDER BY id DESC LIMIT 15",
      )).rows.reverse();
      for (const r of recent) { lastId = Math.max(lastId, Number(r.id)); emit("win", liveRow(r)); }
      emit("ready", { since: lastId });
      const poll = async () => {
        const rows = (await db.query(
          "SELECT id,user_id,amount,metadata,created_at FROM wallet_ledger WHERE kind='win' AND amount>0 AND id>$1 ORDER BY id ASC LIMIT 50",
          [lastId],
        )).rows;
        for (const r of rows) { lastId = Math.max(lastId, Number(r.id)); emit("win", liveRow(r)); }
      };
      const iv = setInterval(() => poll().catch(() => {}), 2000);
      q.on("close", () => { clearInterval(iv); s.end(); });
    }),
  );
  
  a.use((q, s) => s.status(404).json({ error: "not_found" }));
  a.use((e, q, s, n) => {
    console.error(e);
    s.status(500).json({ error: "internal_error" });
  });
  return a;
}
