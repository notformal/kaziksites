const KEY='casino_consent';
export const consent=()=>localStorage.getItem(KEY)==='yes';
export const setConsent=v=>localStorage.setItem(KEY,v?'yes':'no');
export function track(event,properties={}){
  if(!consent()) return;
  const payload={event,properties,path:location.pathname,brand:import.meta.env.VITE_BRAND||'aurora',ts:new Date().toISOString()};
  window.dispatchEvent(new CustomEvent('casino:analytics',{detail:payload}));
  if(import.meta.env.VITE_ANALYTICS_ENDPOINT) navigator.sendBeacon(import.meta.env.VITE_ANALYTICS_ENDPOINT,JSON.stringify(payload));
}
