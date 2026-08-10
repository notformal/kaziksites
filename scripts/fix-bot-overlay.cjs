/**
 * Fixer script for bot overlay in all games
 * Fixes: wrong selectors, un-wrapped imports, duplicate scripts
 */

const fs = require('fs');
const path = require('path');

const GAMES_DIR = path.join(__dirname, '..', 'public', 'games');

// Container ID mapping per game (detected from actual HTML structure)
const CONTAINER_MAP = {
  // #bg containers (game board / background)
  'blackjack-pro': '#bg',
  'baccarat-pro': '#bg',
  'fruit-shop': '#bg',
  'roulette-royale': '#bg',
  // #game containers  
  'slots-royale': '#game',
  'crash-pro': '#game-wrap',
  'gold-caravan': '#game',
  'magic-crystal': '#game',
  'hot-navigator': '#game',
  'pharaohs-treasure': '#game',
  'wild-west-gold': '#game',
  'dragon-fortune': '#game',
  'book-of-gold': '#game',
  'lucky-streak': '#game',
  'diamond-rush': '#game',
  'lightning-dice': '#game',
  'super-line-fruit-bomb': '#game',
  // #balance containers
  'crazy-time-pro': '#balance',
  'pragmatic-live': '#balance',
  'lightning-roulette-pro': '#balance',
  // default: #app
};

function getContainerId(gameName) {
  if (CONTAINER_MAP[gameName]) return CONTAINER_MAP[gameName];
  return '#app';
}

function fixGameFile(gameDir) {
  const indexPath = path.join(gameDir, 'index.html');
  if (!fs.existsSync(indexPath)) return null;

  const gameName = path.basename(gameDir);
  let content = fs.readFileSync(indexPath, 'utf8');

  // Step 1: Remove broken bot overlay injection (text between HTML tags without <script>)
  // Pattern: import { setupBotOverlay } ... followed by try/catch block, outside script tags
  content = content.replace(
    /import\s*\{\s*setupBotOverlay\s*\}\s*from\s*['"]\.\.\/_engine\/core\/bot-overlay\.js['"];\s*\n?\s*\n?try\s*\{[^}]*setupBotOverlay[^}]*\}[^;]*;/g,
    ''
  );
  // Clean up any remaining blank lines left behind
  content = content.replace(/\n{3,}/g, '\n\n');

  // Step 2: Check if the file already has a proper module script with bot overlay
  const hasProperBotOverlay = /<script\s+type=["']module["'][^>]*>[\s\S]*?setupBotOverlay/.test(content);
  if (hasProperBotOverlay) {
    console.log(`  [KEEP] ${gameName}`);
    return { game: gameName, status: 'already-good' };
  }

  // Step 3: Determine the correct container ID
  const containerId = getContainerId(gameName);

  // Step 4: Find existing <script type="module"> tags to add bot overlay before their closing tag
  const moduleScriptRegex = /<script\s+type=["']module["'][^>]*>([\s\S]*?)<\/script>/gi;
  const moduleMatches = [...content.matchAll(moduleScriptRegex)];

  if (moduleMatches.length > 0) {
    // Add bot overlay import and setup BEFORE the closing tag of the last module script
    const lastMatch = moduleMatches[moduleMatches.length - 1];
    const botOverlayCode = `\nimport { setupBotOverlay } from '../_engine/core/bot-overlay.js';\ntry { setupBotOverlay('${containerId}', { gameName: '${gameName}', refreshInterval: 3000 }); } catch(e) { console.warn('[BotOverlay]', e.message); }\n`;
    const newContent = content.replace(
      lastMatch[0],
      lastMatch[1] + botOverlayCode + '</script>'
    );
    fs.writeFileSync(indexPath, newContent, 'utf8');
    console.log(`  [FIXED] ${gameName} -> container=${containerId}`);
    return { game: gameName, status: 'fixed' };
  }

  // Step 5: No module script found - append before </body> or </html>
  const botOverlayScript = `<script type="module">
import { setupBotOverlay } from '../_engine/core/bot-overlay.js';
try { setupBotOverlay('${containerId}', { gameName: '${gameName}', refreshInterval: 3000 }); } catch(e) { console.warn('[BotOverlay]', e.message); }
</script>`;

  if (content.includes('</body>')) {
    content = content.replace('</body>', botOverlayScript + '\n</body>');
  } else if (content.includes('</html>')) {
    content = content.replace('</html>', botOverlayScript + '\n</html>');
  } else {
    content += botOverlayScript;
  }

  fs.writeFileSync(indexPath, content, 'utf8');
  console.log(`  [ADDED] ${gameName} -> container=${containerId}`);
  return { game: gameName, status: 'added' };
}

// Main execution
console.log('🔧 Fixing bot overlay in all games...\n');

const entries = fs.readdirSync(GAMES_DIR).filter(e => {
  const dirPath = path.join(GAMES_DIR, e);
  return fs.statSync(dirPath).isDirectory() && !e.startsWith('_');
});

console.log(`Processing ${entries.length} game folders.\n`);

const results = [];
for (const entry of entries) {
  const gameDir = path.join(GAMES_DIR, entry);
  try {
    const result = fixGameFile(gameDir);
    if (result) results.push(result);
  } catch (e) {
    console.error(`  [ERROR] ${entry}: ${e.message}`);
    results.push({ game: entry, status: 'error', error: e.message });
  }
}

const good = results.filter(r => r.status === 'already-good').length;
const fixed = results.filter(r => r.status === 'fixed').length;
const added = results.filter(r => r.status === 'added').length;
const errors = results.filter(r => r.status === 'error').length;

console.log(`\n✅ Done! Summary:`);
console.log(`   Already good: ${good}`);
console.log(`   Fixed (corrected): ${fixed}`);
console.log(`   Added (new): ${added}`);
console.log(`   Errors: ${errors}`);

// Print container distribution
const containers = {};
for (const r of results) {
  if (r.status !== 'error') {
    const cid = getContainerId(r.game);
    containers[cid] = (containers[cid] || 0) + 1;
  }
}
console.log('\n📦 Container ID distribution:');
for (const [cid, count] of Object.entries(containers)) {
  console.log(`   ${cid}: ${count} games`);
}