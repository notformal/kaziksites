/**
 * KAZIKSITES PREMIUM OVERLAY v5.0 - Live player overlay with bot simulation
 */
function genBot(){const a=['Lucky','Win','Gold','Star','Royal','Mega','Pro','Ace'],b=['Player','Gamer','Master','King','Hunter'],e=[String.fromCodePoint(0x1F3B0),String.fromCodePoint(0x1F3B2),String.fromCodePoint(0x1F3CF),String.fromCodePoint(0x2660),String.fromCodePoint(0x2665)];return{name:a[Math.random()*a.length|0]+((Math.random()*999|0)+1)+'_'+b[Math.random()*b.length|0],emoji:e[Math.random()*e.length|0]}}
function genWin(t){const p=['casual','regular','high'][Math.random()*3|0],b=genBot(),m=p==='high'?+(Math.random()*50+5).toFixed(2):p==='regular'?+(Math.random()*8+2).toFixed(2):+(Math.random()*3+1).toFixed(2);return{name:b.name,emoji:b.emoji,m:m+'x',g:(t||'Game').split(' ')[0]}}
export function initOverlay(o={}){
  const br=o.brand||'aurora';let bots=[],wins=[];
  function refresh(){const a=bots.filter(()=>Math.random()>.12);if(a.length<10)a.push(genBot());bots=a.slice(0,12);const e=document.getElementById('kz-c');if(e)e.textContent=bots.length}
  function addWin(){const w=genWin(document.title);wins.unshift(w);if(wins.length>6)wins.pop();const f=document.getElementById('kz-f');if(!f)return;f.innerHTML=wins.map(x=>'<div class="kw"><span>'+x.emoji+'</span><b>'+x.name+'</b><span>'+x.m+'</span></div>').join('')}
  async function api(){try{const r=await fetch('/api/bots/live');if(r.ok){const d=await r.json();if(d.players)bots=d.players.slice(0,12).map(p=>({name:p.name,emoji:p.avatar||String.fromCodePoint(0x1F3B0)}));const e=document.getElementById('kz-c');if(e)e.textContent=d.count}}catch(e){}}
  if(!document.getElementById('ko')){
    const d=document.createElement('div');d.id='ko';d.dataset.brand=br;
    d.innerHTML='<div class="kb"><span class="kd"></span><strong id="kz-c">0</strong></div><div class="kj"><small>POOL</small><strong id="kz-j">$1,247,893</strong></div><div class="kf" id="kz-f"></div>';
    document.body.appendChild(d);
    if(!document.getElementById('kc')){const s=document.createElement('style');s.id='kc';s.textContent=[
      '[data-brand="aurora"]{--ac:#a855f7}','[data-brand="ember"]{--ac:#ef4444}','[data-brand="royale"]{--ac:#3b82f6}',
      '#ko{position:fixed;top:12px;right:12px;z-index:9999;display:flex;flex-direction:column;gap:6px;font-family:Inter,system-ui,sans-serif;pointer-events:none}',
      '.kb{display:flex;align-items:center;gap:5px;padding:5px 12px;border-radius:999px;background:rgba(0,0,0,.7);backdrop-filter:blur(12px);border:1px solid rgba(255,255,255,.1);font-size:11px;color:#f8fafc;pointer-events:auto}',
      '.kd{width:7px;height:7px;border-radius:50%;background:#10b981;box-shadow:0 0 6px #10b981;animation:pulse 1.5s infinite}',
      '@keyframes pulse{0%,100%{opacity:1}50%{opacity:.5}}',
      '.kj{text-align:center;padding:8px 14px;border-radius:10px;background:linear-gradient(135deg,rgba(124,58,237,.18),rgba(251,191,36,.12));border:1px solid rgba(168,85,247,.2);pointer-events:auto}',
      '.kj small{font-size:8px;color:#94a3b8;text-transform:uppercase;letter-spacing:.15em;display:block}',
      '.kj strong{color:#fbbf24;font-size:16px;font-weight:800}',
      '.kf{display:flex;flex-direction:column;gap:3px;max-height:150px;overflow:hidden}',
      '.kw{display:flex;align-items:center;gap:4px;padding:4px 8px;border-radius:6px;background:rgba(0,0,0,.55);backdrop-filter:blur(6px);border:1px solid rgba(255,255,255,.04);font-size:10px;color:#cbd5e1;animation:si .35s ease}',
      '@keyframes si{from{opacity:0;transform:translateX(16px)}to{opacity:1;transform:translateX(0)}}',
      '.kw b{color:#f8fafc;font-weight:600}','@media(max-width:768px){#ko{top:auto;bottom:55px;right:6px}.kj strong{font-size:13px}}'
    ].join('\n');document.head.appendChild(s)}
  }
  refresh();addWin();addWin();setInterval(addWin,3500);setInterval(refresh,10000);api();
  setInterval(()=>{const e=document.getElementById('kz-j');if(!e)return;let v=parseFloat(e.textContent.replace(/[$,]/g,''))||1247893;v+=Math.random()*30+3;e.textContent='$'+Math.floor(v).toLocaleString()},2500);
}
