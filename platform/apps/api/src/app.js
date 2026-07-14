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
import { assertRoundState, assertRoundTransition } from "./roundState.js";
const ar = (f) => (q, s, n) => Promise.resolve(f(q, s, n)).catch(n),
  emailOk = (v) =>
    typeof v === "string" &&
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v) &&
    v.length < 255,
  gameOk = (v) => typeof v === "string" && /^[\w-]{1,64}$/.test(v),
  roundOk = (v) => typeof v === "string" && /^[\w-]{8,80}$/.test(v),
  choiceOk=(gameId,c)=>gameId==='roulette'?(c&&(['red','black','even','odd'].includes(c.type)||(c.type==='straight'&&Number.isInteger(c.number)&&c.number>=0&&c.number<=36))):gameId==='keno'?(c&&Array.isArray(c.numbers)&&c.numbers.length>=1&&c.numbers.length<=10&&new Set(c.numbers).size===c.numbers.length&&c.numbers.every(n=>Number.isInteger(n)&&n>=1&&n<=80)):c===undefined||c===null,
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
      .find(([name]) => name === "arcade_session")?.[1],
  setSessionCookie = (q, s, token, ttlMs) => {
    const secure = q.secure || q.headers["x-forwarded-proto"] === "https";
    s.set(
      "Set-Cookie",
      `arcade_session=${token}; Path=/api; HttpOnly; SameSite=Lax; Max-Age=${Math.floor(ttlMs / 1000)}${secure ? "; Secure" : ""}`,
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
    if (o && config.allowedOrigins.has(o)) {
      s.set("Access-Control-Allow-Origin", o);
      s.set("Vary", "Origin");
      s.set("Access-Control-Allow-Credentials", "true");
      s.set("Access-Control-Allow-Headers", "Content-Type, Authorization");
      s.set("Access-Control-Allow-Methods", "GET,POST,PUT,DELETE,OPTIONS");
    }
    if (q.method === "OPTIONS")
      return o && config.allowedOrigins.has(o)
        ? s.sendStatus(204)
        : s.sendStatus(403);
    if (o && !config.allowedOrigins.has(o) && !["GET", "HEAD", "OPTIONS"].includes(q.method))
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
      let token = newToken(),
        exp = now() + config.sessionTtlMs;
      await db.query(
        "INSERT INTO sessions(user_id,token_hash,expires_at)VALUES($1,$2,$3)",
        [u.id, tokenHash(token), new Date(exp)],
      );
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
      s.set("Set-Cookie", "arcade_session=; Path=/api; HttpOnly; SameSite=Lax; Max-Age=0");
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
  a.use((q, s) => s.status(404).json({ error: "not_found" }));
  a.use((e, q, s, n) => {
    console.error(e);
    s.status(500).json({ error: "internal_error" });
  });
  return a;
}
