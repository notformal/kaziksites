const fs = require('fs');
const html = [
'<!DOCTYPE html><html lang="en"><head>',
'<meta charset="UTF-8">',
'<meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no">',
'<title>Crazy Time - Edge Game Show</title>',
'<link rel="stylesheet" href="../_live-engine/style.css">',
'<style>@import url("https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&family=Poppins:wght@600;700;800&display=swap");',
':root{--bg:#07071a;--purp:#a855f7;--gold:#fbbf24;--txt:#f8fafc}*{margin:0;padding:0;box-sizing:border-box}',
'html,body{width:100%;height:100%;background:var(--bg);font-family:Inter,system-ui,sans-serif;color:var(--txt)}',
'#app{max-width:1200px;margin:0 auto;height:100vh;display:flex;flex-direction:column;padding:8px;gap:8px}',
'.ct-header{display:flex;align-items:center;justify-content:space-between;padding:12px 20px;background:linear-gradient(135deg,rgba(124,58,237,.2),rgba(236,72,153,.1));border-radius:16px;border:1px solid rgba(168,85,247,.2);flex-shrink:0}',
'.ct-title{font-family:Poppins,sans-serif;font-size:22px;font-weight:900;background:linear-gradient(135deg,#ec4899,#fbbf24,#a855f7);-webkit-background-clip:text;-webkit-text-fill-color:transparent;display:flex;align-items:center;gap:10px}',
'.ct-badge{padding:4px 12px;border-radius:20px;background:rgba(236,72,153,.2);border:1px solid rgba(236,72,153,.3);font-size:11px;font-weight:700;color:#f472b6}',
'.ct-main{flex:1;display:flex;gap:8px;padding:4px 0;overflow:hidden}',
'.wheel-section{flex:1.3;display:flex;align-items:center;justify-content:center;position:relative;min-height:0}',
'.wheel-wrap{position:relative;width:100%;max-width:520px;aspect-ratio:1}',
'.wheel-wrap canvas{width:100%;height:100%;border-radius:50%;display:block}',
'.pointer{position:absolute;top:-16px;left:50%;transform:translateX(-50%);z-index:5;font-size:36px;filter:drop-shadow(0 4px 8px rgba(0,0,0,.7))}',
'</style></head><body><div id="app" class="lge-root">',
'<div class="ct-header"><div class="ct-title">&#x1F3AE; CRAZY TIME</div><div class="ct-badge">EDGE GAME SHOW</div></div>',
'<div class="ct-main"><div class="wheel-section"><div class="wheel-wrap"><div class="pointer">&#x25BC;</div><canvas id="wheel"></canvas></div></div></div></div>',
'<script src="../_live-engine/game-engine.js"></script><script type="module" src="./game.js"></script></body></html>'
].join('\n');
fs.writeFileSync('public/games/crazy-time-v2/index.html', html, 'utf8');
console.log('HTML written:', html.length);
