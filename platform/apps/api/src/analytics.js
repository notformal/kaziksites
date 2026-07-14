import crypto from "node:crypto";
import { tokenHash, rateLimiter } from "./security.js";

const EVENTS = new Set(["page","brand","search","filter","game_open","game_ready","bet","settle","auth","daily","favorite"]);
const BRANDS = new Set(["aurora","ember","royale"]);
const PROPERTY_RULES = {
  page: { referrer: "short" }, brand: { selected: "brand" }, search: { queryLength: "int", resultCount: "int" },
  filter: { category: "short" }, game_open: { category: "short" }, game_ready: { loadMs: "int" },
  bet: { amount: "int", accepted: "bool" }, settle: { win: "int", multiplier: "number" },
  auth: { action: "authAction", success: "bool" }, daily: { claimed: "bool", reward: "int" },
  favorite: { action: "favoriteAction" }
};
const sha = value => crypto.createHash("sha256").update(value).digest("hex");
const safeEqual = (a,b) => { const x=Buffer.from(a||""),y=Buffer.from(b||""); return x.length===y.length && crypto.timingSafeEqual(x,y); };
const validValue = (type, value) => type === "short" ? typeof value === "string" && value.length <= 64
  : type === "brand" ? BRANDS.has(value)
  : type === "int" ? Number.isInteger(value) && value >= 0 && value <= 10_000_000
  : type === "number" ? Number.isFinite(value) && value >= 0 && value <= 1_000_000
  : type === "bool" ? typeof value === "boolean"
  : type === "authAction" ? ["register","login","logout"].includes(value)
  : type === "favoriteAction" ? ["add","remove"].includes(value) : false;

export function validateAnalyticsEvent(input) {
  if (!input || typeof input !== "object" || Array.isArray(input) || !EVENTS.has(input.event)) return null;
  if (!BRANDS.has(input.brand) || typeof input.sessionId !== "string" || !/^[A-Za-z0-9_-]{16,80}$/.test(input.sessionId)) return null;
  if (input.path != null && (typeof input.path !== "string" || input.path.length > 160 || /[?#]/.test(input.path))) return null;
  if (input.gameId != null && (typeof input.gameId !== "string" || !/^[\w-]{1,64}$/.test(input.gameId))) return null;
  if (input.ts != null && (!Number.isFinite(Date.parse(input.ts)) || Math.abs(Date.now()-Date.parse(input.ts)) > 7*864e5)) return null;
  const props=input.properties ?? {}, rules=PROPERTY_RULES[input.event];
  if (!props || typeof props !== "object" || Array.isArray(props) || Object.keys(props).some(k=>!rules[k] || !validValue(rules[k],props[k]))) return null;
  if (["game_open","game_ready","bet","settle","favorite"].includes(input.event) && !input.gameId) return null;
  return { event:input.event, brand:input.brand, sessionHash:sha(input.sessionId), gameId:input.gameId||null, path:input.path||null, properties:props, clientTs:input.ts ? new Date(input.ts) : null };
}

export function mountAnalytics(app,{db,config,now=()=>Date.now()}) {
  const optionalUser=async q=>{let token=q.headers.authorization?.match(/^Bearer ([\w-]{40,})$/)?.[1]||(q.headers.cookie||"").split(";").map(x=>x.trim().split("=")).find(x=>x[0]==="arcade_session")?.[1];if(!token)return null;return (await db.query("SELECT user_id FROM sessions WHERE token_hash=$1 AND expires_at>$2",[tokenHash(token),new Date(now())])).rows[0]?.user_id||null};
  app.post("/api/analytics/events",rateLimiter({windowMs:60_000,limit:120}),async(q,s,n)=>{try{
    const batch=Array.isArray(q.body?.events)?q.body.events:null;
    if(!batch||batch.length<1||batch.length>25)return s.status(400).json({error:"invalid_batch"});
    const events=batch.map(validateAnalyticsEvent);if(events.some(x=>!x))return s.status(400).json({error:"invalid_event"});
    const userId=await optionalUser(q), client=await db.connect();try{await client.query("BEGIN");for(const e of events)await client.query("INSERT INTO analytics_events(user_id,session_hash,event_name,brand,game_id,path,properties,client_ts)VALUES($1,$2,$3,$4,$5,$6,$7,$8)",[userId,e.sessionHash,e.event,e.brand,e.gameId,e.path,e.properties,e.clientTs]);await client.query("COMMIT")}catch(e){await client.query("ROLLBACK");throw e}finally{client.release()}
    s.status(202).json({accepted:events.length});
  }catch(e){n(e)}});
  const admin=(q,s,n)=>{const key=q.headers.authorization?.match(/^Bearer (.{16,})$/)?.[1];if(!config.analyticsAdminKey||!safeEqual(key,config.analyticsAdminKey))return s.status(401).json({error:"unauthorized"});n()};
  app.get("/api/admin/analytics/summary",admin,async(q,s,n)=>{try{const hours=Math.min(720,Math.max(1,Number(q.query.hours)||24)),{rows}=await db.query("SELECT brand,event_name \"event\",count(*)::int events,count(DISTINCT session_hash)::int sessions FROM analytics_events WHERE created_at>=now()-($1*interval '1 hour') GROUP BY brand,event_name ORDER BY brand,event_name",[hours]);s.json({hours,rows})}catch(e){n(e)}});
  app.get("/api/admin/analytics/funnel",admin,async(q,s,n)=>{try{const hours=Math.min(720,Math.max(1,Number(q.query.hours)||24)),{rows}=await db.query("SELECT brand,count(DISTINCT session_hash) FILTER(WHERE event_name='page')::int visitors,count(DISTINCT session_hash) FILTER(WHERE event_name='game_open')::int opened,count(DISTINCT session_hash) FILTER(WHERE event_name='game_ready')::int ready,count(DISTINCT session_hash) FILTER(WHERE event_name='bet' AND properties->>'accepted'='true')::int bettors,count(DISTINCT session_hash) FILTER(WHERE event_name='settle')::int settled FROM analytics_events WHERE created_at>=now()-($1*interval '1 hour') GROUP BY brand ORDER BY brand",[hours]);s.json({hours,rows})}catch(e){n(e)}});
}
