// Add VFX + Sound to all instant games
const fs = require('fs');
const path = require('path');

const games = ['crash-pro', 'plinko-master', 'mines-premium', 'lightning-dice'];

games.forEach(function(name) {
  const file = path.join(__dirname, '..', 'public', 'games', name, 'index.html');
  let content = fs.readFileSync(file, 'utf8');
  
  if (!content.includes('vfx.js')) {
    const vfxScript = `<script type="module">import{initVFX}from'../_engine/core/vfx.js';import{playSound}from'../_engine/core/audio.js';document.querySelectorAll('#game-wrap button').forEach(function(b){b.addEventListener('click',function(){try{playSound('click')}catch(e){}})});try{initVFX({container:document.getElementById('game-wrap'),intensity:'medium'})}catch(e){console.warn('[VFX]',e.message)}</script>`;
    content = content.replace('</body>', vfxScript + '</body>');
    fs.writeFileSync(file, content, 'utf8');
    console.log('✓ VFX+Sound added to', name);
  } else {
    console.log('  Already has VFX:', name);
  }
});

console.log('\nDone!');
