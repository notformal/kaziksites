import { tokenHash, rateLimiter } from "./security.js";

const PERIODS = { daily: "1 day", weekly: "7 days", "all-time": null };
const MIN_PLAYERS = 3;
const aliasFor = (id, secret) => `Player • ${tokenHash(`social:${secret}:${id}`).slice(0, 4).toUpperCase()}`;

export function mountSocial(a, { db, config }) {
  const limited = rateLimiter({ windowMs: 60_000, limit: 60 });
  a.get("/api/social/activity", limited, async (q, s, n) => { try {
    const { rows: totals } = await db.query(`SELECT COUNT(*)::int rounds, COUNT(DISTINCT user_id)::int players, COALESCE(SUM(win),0)::bigint credits_won FROM game_rounds WHERE status='settled' AND settled_at >= now() - interval '24 hours'`);
    const total = totals[0];
    if (Number(total.players) < MIN_PLAYERS) return s.json({ available:false, minimumPlayers:MIN_PLAYERS, window:"24h", games:[] });
    const { rows } = await db.query(`SELECT game_id,COUNT(*)::int rounds,COUNT(DISTINCT user_id)::int players,COALESCE(SUM(win),0)::bigint credits_won FROM game_rounds WHERE status='settled' AND settled_at >= now() - interval '24 hours' GROUP BY game_id ORDER BY rounds DESC,game_id ASC`);
    const publicGames=rows.filter(x=>Number(x.players)>=MIN_PLAYERS).slice(0,6);
    s.json({available:true,window:"24h",rounds:Number(total.rounds),players:Number(total.players),creditsWon:Number(total.credits_won),games:publicGames.map(x=>({gameId:x.game_id,rounds:Number(x.rounds),players:Number(x.players),creditsWon:Number(x.credits_won)}))});
  } catch(e){ n(e); }});

  a.get("/api/social/leaderboard", limited, async (q, s, n) => { try {
    const period=typeof q.query.period==="string"?q.query.period:"daily";
    if(!(period in PERIODS))return s.status(400).json({error:"invalid_period"});
    const where=PERIODS[period]?`status='settled' AND settled_at >= now() - interval '${PERIODS[period]}'`:"status='settled'";
    const {rows}=await db.query(`SELECT user_id,COUNT(*)::int rounds,COALESCE(SUM(win),0)::bigint credits_won FROM game_rounds WHERE ${where} GROUP BY user_id ORDER BY credits_won DESC,rounds DESC,user_id ASC LIMIT 10`);
    if(rows.length<MIN_PLAYERS)return s.json({available:false,period,minimumPlayers:MIN_PLAYERS,entries:[]});
    const secret=config.socialAliasSecret||config.analyticsAdminKey||"development-social-alias";
    s.json({available:true,period,entries:rows.map((x,i)=>({rank:i+1,alias:aliasFor(x.user_id,secret),rounds:Number(x.rounds),creditsWon:Number(x.credits_won)}))});
  } catch(e){ n(e); }});
}
