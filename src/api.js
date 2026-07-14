const API=import.meta.env.VITE_API_URL||'http://127.0.0.1:8787/api';
let token=sessionStorage.getItem('arcade_session')||'';
async function request(path,options={}){const r=await fetch(`${API}${path}`,{...options,headers:{'Content-Type':'application/json',...(token?{Authorization:`Bearer ${token}`}:{}) ,...options.headers}});if(r.status===204)return null;const body=await r.json().catch(()=>({error:'invalid_response'}));if(!r.ok)throw new Error(body.error||`request_${r.status}`);return body}
export const api={
 register:async data=>{const r=await request('/auth/register',{method:'POST',body:JSON.stringify(data)});token=r.token;sessionStorage.setItem('arcade_session',token);return r},
 login:async data=>{const r=await request('/auth/login',{method:'POST',body:JSON.stringify(data)});token=r.token;sessionStorage.setItem('arcade_session',token);return r},
 logout:async()=>{try{await request('/auth/logout',{method:'POST'})}finally{token='';sessionStorage.removeItem('arcade_session')}},
 profile:()=>request('/profile'),wallet:()=>request('/wallet'),reward:()=>request('/wallet/daily-reward',{method:'POST'}),
 favorites:()=>request('/favorites'),addFavorite:id=>request(`/favorites/${encodeURIComponent(id)}`,{method:'PUT'}),removeFavorite:id=>request(`/favorites/${encodeURIComponent(id)}`,{method:'DELETE'}),
 recents:()=>request('/recents'),played:id=>request(`/recents/${encodeURIComponent(id)}`,{method:'POST'}),hasSession:()=>Boolean(token)
};
