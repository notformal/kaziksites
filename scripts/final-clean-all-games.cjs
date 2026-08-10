/**
 * FINAL COMPREHENSIVE CLEANUP — ensures every game has exactly ONE clean bot overlay
 */

const fs = require('fs');
const path = require('path');

const GAMES_DIR = path.join(__dirname, '..', 'public', 'games');

const CONTAINER_MAP = {
  'blackjack-pro': '#bg', 'baccarat-pro': '#bg', 'fruit-shop': '#bg', 'roulette-royale': '#bg',
  'crash-pro': '#game-wrap', 'gold-caravan': '#game', 'magic-crystal': '#game', 'hot-navigator': '#game',
  'pharaohs-treasure': '#game', 'wild-west-gold': '#game', 'dragons-fortune': '#game', 'book-of-gold': '#game',
  'lucky-streak': '#game', 'diamond-rush': '#game', 'lightning-dice': '#game', 'super-line-fruit-bomb': '#game',
  'slots-royale': '#game', 'crazy-time-pro': '#balance', 'pragmatic-live': '#balance', 'lightning-roulette-pro': '#balance',
};

function getContainerId(name) { return CONTAINER_MAP[name] || '#app'; }

function cleanGame(gameDir) {
  const fp = path.join(gameDir, 'index.html');
  if (!fs.existsSync(fp)) return null;
  const name = path.basename(gameDir);
  let html = fs.readFileSync(fp, 'utf8');
  
  // Step 1: Remove ALL bot-overlay related content (imports, calls, try/catch fragments)
  html = html.replace(/\s*import\s*\{\s*setupBotOverlay\s*\}\s*from\s*['"].*bot-overlay\.js['"];?\s*/g, '\n');
  html = html.replace(/\s*try\s*\{[^}]*setupBotOverlay[^}]*\}[^;]*;/g, '');
  html = html.replace(/^[ \t]*\}\s*catch\s*\(\s*e\s*\)\s*\{\s*console\.warn\s*\(\s*['"]\[BotOverlay]/gm, '');
  
  // Step 2: Remove the now-orphaned <script type="module"> that ONLY contained bot overlay
  html = html.replace(/<script\s+type=["']module["']>\s*\n?\s*try\s*\{[^}]*setupBotOverlay[^}]*\}[^;]*;\s*\n?<\/script>/gi, '');
  
  // Step 3: Clean up blank lines (max 2 consecutive)
  html = html.replace(/\n{4,}/g, '\n\n\n');
  
  const containerId = getContainerId(name);
  const botScript = `\n<script type="module">\nimport { setupBotOverlay } from '../_engine/core/bot-overlay.js';\ntry { setupBotOverlay('${containerId}', { gameName: '${name}', refreshInterval: 3000 }); } catch(e) { console.warn('[BotOverlay]', e.message); }\n</script>`;
  
  // Step 4: Insert before </body> (or </html> if no body)
  if (html.includes('</body>')) {
    html = html.replace('</body>', botScript + '\n</body>');
  } else if (html.includes('</html>')) {
    html = html.replace('</html>', botScript + '\n</html>');
  } else {
    html += botScript;
  }
  
  fs.writeFileSync(fp, html, 'utf8');
  return { game: name, status: 'cleaned', container: containerId };
}

console.log('🏭 FINAL CLEAN — All games to exactly ONE clean bot overlay...\n');

const entries = fs.readdirSync(GAMES_DIR).filter(e => {
  const dirPath = path.join(GAMES_DIR, e);
  return fs.statSync(dirPath).isDirectory() && !e.startsWith('_');
});

let ok = 0, err = 0;
for (const entry of entries) {
  try {
    cleanGame(path.join(GAMES_DIR, entry));
    ok++;
  } catch(e) { console.error(`  [ERR] ${entry}: ${e.message}`); err++; }
}

console.log(`✅ Cleaned ${ok}/${entries.length} games`);
if (err > 0) console.log(`❌ ${err} errors\n`);