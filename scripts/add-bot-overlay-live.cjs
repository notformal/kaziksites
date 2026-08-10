// Add BotOverlay to all live casino games
const fs = require('fs');
const path = require('path');

const liveGamesDir = path.join(__dirname, '..', 'public', 'games');
const gameDirs = fs.readdirSync(liveGamesDir).filter(d => 
  d !== '_engine' && d !== '_live-engine' && fs.statSync(path.join(liveGamesDir, d)).isDirectory()
);

let added = 0;
gameDirs.forEach(function(dir) {
  const indexPath = path.join(liveGamesDir, dir, 'index.html');
  if (!fs.existsSync(indexPath)) return;
  
  let content = fs.readFileSync(indexPath, 'utf8');
  
  // Skip if already has bot-overlay or is too small (stub)
  if (content.includes('bot-overlay.js')) {
    console.log(`  ${dir}: Already has BotOverlay`);
    return;
  }
  
  if (content.length < 2000) {
    console.log(`  ${dir}: Skipping stub (${content.length} bytes)`);
    return;
  }

  // Add bot overlay before </body>
  const botScript = `<script type="module">import{setupBotOverlay}from'../_engine/core/bot-overlay.js';try{setupBotOverlay('#game-wrap',{gameName:'${dir}',refreshInterval:3000})}catch(e){console.warn('[BotOverlay]',e.message)}</script>`;
  
  if (content.includes('</body>')) {
    content = content.replace('</body>', botScript + '</body>');
    fs.writeFileSync(indexPath, content, 'utf8');
    console.log(`✓ ${dir}: BotOverlay added`);
    added++;
  } else {
    // Try common alternative endings
    ['</html>', '</div>'].forEach(function(tag) {
      if (content.includes(tag)) {
        content = content.replace(tag, botScript + tag);
      }
    });
    fs.writeFileSync(indexPath, content, 'utf8');
    console.log(`✓ ${dir}: BotOverlay appended`);
    added++;
  }
});

console.log(`\nDone! Added BotOverlay to ${added} games.`);
