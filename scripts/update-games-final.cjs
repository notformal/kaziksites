const fs = require('fs');
const __d = 'f:/Kaziksites/landing/';
const brands = ['aurora', 'ember', 'royale'];
const C = {
  aurora: { p:'#7c3aed', s:'#06b6d4', ct:'var(--accent2)', gl:'rgba(124,58,237,0.3)' },
  ember: { p:'#ef4444', s:'#f59e0b', ct:'var(--fire2)', gl:'rgba(239,68,68,0.3)' },
  royale: { p:'#d4a843', s:'#f5d77a', ct:'#d4a843', gl:'rgba(212,168,67,0.3)' }
};

function build(c) {
  let h = '<div style="display:flex;gap:0.5rem;margin-bottom:2rem;flex-wrap:wrap" class="reveal">';
  ['all','instant','slots','live-dealer'].forEach((cat, i) => {
    const lbl = cat === 'all' ? 'All (27)' : `${cat.charAt(0).toUpperCase()}${cat.slice(1,-1)} (${i===1?14:i===2?4:9})`;
    h += `<button class="cat-tab ${i===0?'active':''}" data-cat="${cat}" style="padding:0.4rem 1rem;border-radius:100px;background:${i===0?c.p:'var(--surface)'};color:${i===0?'#fff':'var(--text)'};border:1px solid rgba(255,255,255,${i===0?'0.3':'0.08'});font-size:0.75rem;font-weight:600;cursor:pointer">${lbl}</button>`;
  });
  h += '</div><div class="games-grid" style="grid-template-columns:repeat(4,1fr);gap:1.2rem">';

  // INSTANT (14)
  const inst = [['🚀','Aviator Rocket',true],['🚀','Skyline Crash'],['🔻','Prism Plinko'],['💣','Nova Mines'],['🎲','Nova Dice'],['🎯','Keno Plus'],['⬆️','Limbo'],['🎡','Fortune Wheel'],['🃏','Hi-Lo'],['🗼','Tower Rise x5000'],['💥','Exploding Fruits x20'],['🎲','Dice Duel'],['🪙','Coin Flip Royale'],['🍒','Cherry Burst']];
  inst.forEach(([ic,nm,ht]) => {
    const b = ht ? `<span style="position:absolute;top:8px;right:8px;background:${c.p};color:#fff;padding:2px 6px;border-radius:100px;font-size:0.5rem;font-weight:700;z-index:3">HOT</span>` : '';
    h += `<div class="game-card reveal cat-instant" style="border:1px solid ${c.gl};position:relative">${b}<div class="game-thumb instant">${ic}</div><div class="game-info"><h4>${nm}</h4><span style="color:${c.ct}">⚡ Instant</span></div></div>`;
  });

  // SLOTS (4)
  const slts = [['🎰','Mega Slots Classic',true,'#4c1d95,#7c3aed'], ['✨','Premium Slots',false,'#6d28d9,#8b5cf6'],['🎪','Studio Slots',false,'#dc2626,#f59e0b'],['🍒','Cherry Burst',false,'#be123c,#f43f5e']];
  slts.forEach(([ic,nm,ft,gd]) => {
    const b = ft ? `<span style="position:absolute;top:8px;right:8px;background:${c.s};color:#000;padding:2px 6px;border-radius:100px;font-size:0.5rem;font-weight:700;z-index:3">⭐ FEATURED</span>` : '';
    h += `<div class="game-card reveal cat-slots" style="border:1px solid rgba(212,168,67,${ft?'0.4':'0.2'});position:relative">${b}<div class="game-thumb slots" style="background:linear-gradient(135deg,${gd})">${ic}</div><div class="game-info"><h4>${nm}</h4><span style="color:#d4a843">🎰 Slots</span></div></div>`;
  });

  // LIVE DEALER (9)
  const live = [['🂡','Blackjack Pro','98.5% RTP'],['🎡','European Roulette','97.3% RTP'],['🎡','American Roulette','Double Zero'],['🃏','Baccarat VIP','98.9% RTP'],['🃏','Video Poker Jacks+','Jacks or Better'],['♠️','Texas Holdem Pro','Poker Classic'],['🐉','Dragon Tiger','2x Win'],['🎴','Three Card Poker','3 Cards'],['🎲','Sic Bo Deluxe','Three Dice']];
  live.forEach(([ic,nm,dt]) => {
    h += `<div class="game-card reveal cat-live-dealer" style="border:1px solid rgba(212,168,67,0.3)"><div class="game-thumb table" style="background:linear-gradient(135deg,#92400e,#d97706)">${ic}</div><div class="game-info"><h4>${nm}</h4><span style="color:#d4a843">🎰 Live Dealer · ${dt}</span></div></div>`;
  });

  h += '</div>';
  // Category filter JS
  h += `<script>(()=>{document.querySelectorAll('.cat-tab').forEach(b=>{b.onclick=()=>{document.querySelectorAll('.cat-tab').forEach(x=>{x.style.background='var(--surface)';x.style.color='var(--text)'});b.style.background='${c.p}';b.style.color='#fff';const ct=b.dataset.cat;document.querySelectorAll('.game-card').forEach(gc=>{if(ct==='all'){gc.style.display=''}else{gc.style.display=gc.classList.contains('cat-'+ct)?'':'none'}})}}})();()<\/script>`;
  return h;
}

brands.forEach(br => {
  const fp = `${__d}${br}/index.html`;
  if (!fs.existsSync(fp)) return console.log(`SKIP ${br}`);
  
  let h = fs.readFileSync(fp, 'utf8');
  const grid = build(C[br]);
  
  // Find <div class="games-inner"> and replace everything until its closing </div>
  const si = h.indexOf('<div class="games-inner">');
  if (si < 0) return console.log(`W: ${br}: no games-inner`);
  
  const sf = si + 25; // skip past '<div class="games-inner">'
  let depth = 1, cp = -1;
  for (let i = sf; i < h.length && depth > 0; i++) {
    if (h[i] === '<') {
      if (h.substring(i, i + 5) === '<div ') depth++;
      else if (h.substring(i, i + 6) === '</div>') { depth--; if (depth === 0) { cp = i - 6; break; } }
    }
  }
  
  if (cp < 0) return console.log(`W: ${br}: no closing div`);
  
  h = h.substring(0, sf) + grid + h.substring(cp + 6);
  fs.writeFileSync(fp, h, 'utf8');
  console.log(`✅ ${br}: ${Math.round(fs.statSync(fp).size/1024)}KB (${h.split('game-card').length - 1} game cards)`);
});
