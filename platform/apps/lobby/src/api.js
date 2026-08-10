import{track}from'./analytics';
const API=import.meta.env.VITE_API_URL||'/api';
let active=sessionStorage.getItem('casino_authenticated')==='1';

// ═══════════════════════════════════════════
// REQUEST CACHING — deduplicate identical calls
// ═══════════════════════════════════════════
const cache=new Map();
const CACHE_TTL=5000; // 5s for social/activity, leaderboard, etc.
function cached(key,fn){
  const hit=cache.get(key);
  if(hit&&hit.ts>Date.now()-CACHE_TTL)return Promise.resolve(hit.val);
  return fn().then(r=>{cache.set(key,{val:r,ts:Date.now()});return r});
}

// ═══════════════════════════════════════════
// HTTP CLIENT — timeout + retry + JSON typed
// ═══════════════════════════════════════════
const DEFAULT_TIMEOUT=8000; // 8s per request
const RETRY_MAX=2;          // up to 1 reattempt (not on auth errors)

function jsonParse(body){
  try{return body.json()}catch{return Promise.resolve({error:'invalid_response'})}
}

async function request(path,options={}){
  const timeout=options.timeout??DEFAULT_TIMEOUT;
  let lastErr;
  for(let attempt=0;attempt<=RETRY_MAX;attempt++){
    const ctl=new AbortController();
    const timer=setTimeout(()=>ctl.abort(),timeout);
    try{
      const r=await fetch(`${API}${path}`,{
        ...options,
        credentials:'include',
        headers:{'Content-Type':'application/json',...options.headers},
        signal:ctl.signal,
      });
      clearTimeout(timer);

      if(r.status===204){sessionStorage.clear();return null}
      const body=await jsonParse(r);

      // 401 — invalidate session globally
      if(r.status===401){
        active=false;
        sessionStorage.removeItem('casino_authenticated');
        track('auth',{action:'expired',success:false});
      }

      // Retry on server errors (5xx) and timeouts — NOT on client errors (4xx)
      if(!r.ok&&(attempt<RETRY_MAX)){
        const isRetryable=r.status>=500||!r.bodyUsed&&ctl.signal.aborted;
        if(!isRetryable)throw new Error(body.error||`request_${r.status}`);
        // Exponential backoff 200ms → 400ms
        await new Promise(r=>setTimeout(r,200*Math.pow(2,attempt)));
        lastErr=new Error(body.error||'retry_failed');
        continue;
      }

      if(!r.ok)throw new Error(body.error||`request_${r.status}`);
      return body;
    }catch(e){
      clearTimeout(timer);
      lastErr=e;
      if(attempt>=RETRY_MAX)break;
      await new Promise(r=>setTimeout(r,200*Math.pow(2,attempt)));
    }
  }
  throw lastErr;
}
export const api={
 register:async data=>{try{const r=await request('/auth/register',{method:'POST',body:JSON.stringify(data)});active=true;sessionStorage.setItem('casino_authenticated','1');track('auth',{action:'register',success:true});return r}catch(e){track('auth',{action:'register',success:false});throw e}},
 login:async data=>{try{const r=await request('/auth/login',{method:'POST',body:JSON.stringify(data)});active=true;sessionStorage.setItem('casino_authenticated','1');track('auth',{action:'login',success:true});return r}catch(e){track('auth',{action:'login',success:false});throw e}},
 logout:async()=>{try{await request('/auth/logout',{method:'POST'});track('auth',{action:'logout',success:true})}finally{active=false;sessionStorage.removeItem('casino_authenticated')}},
 profile:()=>request('/profile'),wallet:()=>request('/wallet'),balance:()=>request('/wallet/balance'),bonusSession:gameId=>request(`/wallet/bonus-session?gameId=${encodeURIComponent(gameId)}`),reward:async()=>{const r=await request('/wallet/daily-reward',{method:'POST'});track('daily',{claimed:r.claimed,reward:r.reward});return r},
 bet:async data=>{try{const r=await request('/wallet/bet',{method:'POST',body:JSON.stringify(data)});track('bet',{amount:data.amount,accepted:true},{gameId:data.gameId});return r}catch(e){track('bet',{amount:data.amount,accepted:false},{gameId:data.gameId});throw e}},round:roundId=>request(`/wallet/rounds/${encodeURIComponent(roundId)}`),settle:async data=>{const r=await request('/wallet/settle',{method:'POST',body:JSON.stringify(data)});track('settle',{win:r.win,multiplier:r.multiplier},{gameId:data.gameId});return r},bonusSpin:async data=>{const r=await request('/wallet/bonus-spin',{method:'POST',body:JSON.stringify(data)});track('settle',{win:r.win,multiplier:r.multiplier},{gameId:data.gameId});return r},
 minesStart:data=>request('/mines/start',{method:'POST',body:JSON.stringify(data)}),minesReveal:data=>request('/mines/reveal',{method:'POST',body:JSON.stringify(data)}),minesCashout:data=>request('/mines/cashout',{method:'POST',body:JSON.stringify(data)}),
 hiloStart:data=>request('/hilo/start',{method:'POST',body:JSON.stringify(data)}),hiloGuess:data=>request('/hilo/guess',{method:'POST',body:JSON.stringify(data)}),hiloCashout:data=>request('/hilo/cashout',{method:'POST',body:JSON.stringify(data)}),
 blackjackStart:data=>request('/blackjack/start',{method:'POST',body:JSON.stringify(data)}),blackjackAction:data=>request('/blackjack/action',{method:'POST',body:JSON.stringify(data)}),
 holdemStart:data=>request('/holdem/start',{method:'POST',body:JSON.stringify(data)}),holdemAction:data=>request('/holdem/action',{method:'POST',body:JSON.stringify(data)}),
 videopokerStart:data=>request('/videopoker/start',{method:'POST',body:JSON.stringify(data)}),videopokerDraw:data=>request('/videopoker/draw',{method:'POST',body:JSON.stringify(data)}),
 history:()=>request('/history/rounds'),
  favorites:()=>request('/favorites'),addFavorite:async id=>{const r=await request(`/favorites/${encodeURIComponent(id)}`,{method:'PUT'});track('favorite',{action:'add'},{gameId:id});return r},removeFavorite:async id=>{const r=await request(`/favorites/${encodeURIComponent(id)}`,{method:'DELETE'});track('favorite',{action:'remove'},{gameId:id});return r},
  recents:()=>request('/recents'),played:id=>request(`/recents/${encodeURIComponent(id)}`,{method:'POST'}),socialActivity:()=>request('/social/activity'),leaderboard:period=>request(`/social/leaderboard?period=${encodeURIComponent(period)}`),
  // Account lifecycle
  changeProfile:async data=>request('/profile',{method:'PUT',body:JSON.stringify(data)}),
  changePassword:async data=>request('/account/password/change',{method:'POST',body:JSON.stringify(data)}),
  requestPasswordReset:async data=>request('/account/password/request-reset',{method:'POST',body:JSON.stringify(data)}),
  resetPassword:async data=>request('/account/password/reset',{method:'POST',body:JSON.stringify(data)}),
  requestEmailVerify:async data=>request('/account/email/request-verify',{method:'POST',body:JSON.stringify(data)}),
  verifyEmail:async data=>request('/account/email/verify',{method:'POST',body:JSON.stringify(data)}),
  devices:()=>request('/account/devices'),revokeDevice:id=>request(`/account/devices/${encodeURIComponent(id)}`,{method:'DELETE'}),revokeOthers:()=>request('/account/devices/revoke-others',{method:'POST'}),
  requestExport:()=>request('/account/export/request',{method:'POST'}),exportStatus:()=>request('/account/export/status'),
  deleteAccount:async password=>request('/account/delete',{method:'POST',body:JSON.stringify({password})}),
  // Responsible play
  responsiblePlay:()=>request('/account/responsible-play'),
  updateResponsiblePlay:async data=>request('/account/responsible-play',{method:'POST',body:JSON.stringify(data)}),
  responsiblePlayCheck:()=>request('/account/responsible-play/check'),
  // Social layer: public chat + per-user notifications (both also stream over SSE)
  chatRecent:()=>request('/chat/recent'),
  chatSend:body=>request('/chat',{method:'POST',body:JSON.stringify({body})}),
  notifications:()=>request('/notifications'),
  notificationsRead:ids=>request('/notifications/read',{method:'POST',body:JSON.stringify(ids?{ids}:{})}),
  // Web Push subscription management
  pushVapid:()=>request('/push/vapid'),
  pushSubscribe:data=>request('/push/subscribe',{method:'POST',body:JSON.stringify(data)}),
  pushUnsubscribe:data=>request('/push/unsubscribe',{method:'POST',body:JSON.stringify(data)}),
  pushStatus:()=>request('/push/status'),
  oauthProviders:()=>request('/auth/oauth/providers'),
  linkedAccounts:()=>request('/account/oauth'),
  unlinkAccount:provider=>request(`/account/oauth/${encodeURIComponent(provider)}`,{method:'DELETE'}),
  hasSession:()=>active
};
// Base for EventSource streams (SSE can't use fetch/request()).
export const apiBase=API;
