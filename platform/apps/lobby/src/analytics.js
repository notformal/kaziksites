const KEY="arcade_consent", SESSION="arcade_analytics_session", API=import.meta.env.VITE_API_URL||"/api";
const ALLOWED=new Set(["page","brand","search","filter","game_open","game_ready","bet","settle","auth","daily","favorite"]);
let queue=[],timer;
const sessionId=()=>{let id=sessionStorage.getItem(SESSION);if(!id){id=crypto.randomUUID().replaceAll("-","");sessionStorage.setItem(SESSION,id)}return id};
export const consent=()=>localStorage.getItem(KEY)==="yes";
export const setConsent=v=>{localStorage.setItem(KEY,v?"yes":"no");if(v)flush()};
export function track(event,properties={},context={}){
  if(!consent()||!ALLOWED.has(event))return;
  const requestedBrand=import.meta.env.VITE_BRAND||new URLSearchParams(location.search).get("brand")||"aurora",brand=["aurora","ember","royale"].includes(requestedBrand)?requestedBrand:"aurora";
  queue.push({event,properties,gameId:context.gameId,sessionId:sessionId(),path:location.pathname.slice(0,160),brand,ts:new Date().toISOString()});
  if(queue.length>=10)flush();else{clearTimeout(timer);timer=setTimeout(flush,5000)}
}
export function flush({beacon=false}={}){
  if(!queue.length||!consent())return;const events=queue.splice(0,25),body=JSON.stringify({events}),url=`${API}/analytics/events`;
  if(beacon&&navigator.sendBeacon){const ok=navigator.sendBeacon(url,new Blob([body],{type:"application/json"}));if(ok)return}
  fetch(url,{method:"POST",credentials:"include",headers:{"Content-Type":"application/json"},body,keepalive:true}).catch(()=>{queue=events.concat(queue).slice(-100)});
  if(queue.length)timer=setTimeout(flush,1000);
}
addEventListener("visibilitychange",()=>{if(document.visibilityState==="hidden")flush({beacon:true})});
addEventListener("pagehide",()=>flush({beacon:true}));
