/**
 * Deduplicate bot overlay imports in all games
 * Run after fix-bot-overlay to clean up any duplicates
 */

const fs = require('fs');
const path = require('path');

const GAMES_DIR = path.join(__dirname, '..', 'public', 'games');

// Container ID mapping per game
const CONTAINER_MAP = {
  'blackjack-pro': '#bg',
  'baccarat-pro': '#bg',
  'fruit-shop': '#bg',
  'roulette-royale': '#bg',
  'crash-pro': '#game-wrap',
  'gold-caravan': '#game',
  'magic-crystal': '#game',
  'hot-navigator': '#game',
  'pharaohs-treasure': '#game',
  'wild-west-gold': '#game',
  'dragons-fortune': '#game',
  'book-of-gold': '#game',
  'lucky-streak': '#game',
  'diamond-rush': '#game',
  'lightning-dice': '#game',
  'super-line-fruit-bomb': '#game',
  'slots-royale': '#game',
  'crazy-time-pro': '#balance',
  'pragmatic-live': '#balance',
  'lightning-roulette-pro': '#balance',
};

function getContainerId(gameName) {
  if (CONTAINER_MAP[gameName]) return CONTAINER_MAP[gameName];
  return '#app';
}

function cleanContent(content, gameName) {
  const containerId = getContainerId(gameName);

  // Remove ALL bot overlay related code (both proper and broken)
  content = content.replace(
    /import\s*\{\s*setupBotOverlay\s*\}\s*from\s*['"].*bot-overlay\.js['"];?\s*\n?/g,
    ''
  );
  content = content.replace(
    /try\s*\{[^}]*setupBotOverlay[^}]*\}[^;]*;/g,
    ''
  );

  // Clean up triple newlines to double
  content = content.replace(/\n{3,}/g, '\n\n');

  // Find the last <script type="module">...</script> block
  const moduleRegex = /(<script\s+type=["']module["'][^>]*>)([\s\S]*?)(<\/script>)/gi;
  const matches = [...content.matchAll(moduleRegex)];

  if (matches.length > 0) {
    // Add bot overlay setup to the last module script
    const lastMatch = matches[matches.length - 1];
    const botOverlayCode = `try { setupBotOverlay('${containerId}', { gameName: '${gameName}', refreshInterval: 3000 }); } catch(e) { console.warn('[BotOverlay]', e.message); }\n`;

    const newContent = content.replace(
      lastMatch[0],
      `${lastMatch[1]}${lastMatch[2]}\nimport { setupBotOverlay } from '../_engine/core/bot-overlay.js';\n${botOverlayCode}${lastMatch[3]}`
    );
    return { content: newContent, changed: true };
  }

  // No module script found - append before </body>
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

  return { content, changed: true };
}

// Main execution
console.log('🧹 Deduplicating bot overlay imports...\n');

const entries = fs.readdirSync(GAMES_DIR).filter(e => {
  const dirPath = path.join(GAMES_DIR, e);
  return fs.statSync(dirPath).isDirectory() && !e.startsWith('_');
});

const results = [];
for (const entry of entries) {
  const gameDir = path.join(GAMES_DIR, entry);
  const indexPath = path.join(gameDir, 'index.html');
  if (!fs.existsSync(indexPath)) continue;

  let content = fs.readFileSync(indexPath, 'utf8');
  const gameName = path.basename(gameDir);

  // Check for duplicates
  const botCount = (content.match(/setupBotOverlay/g) || []).length;
  if (botCount <= 1) {
    console.log(`  [CLEAN] ${gameName} (${botCount} ref)`);
    results.push({ game: gameName, status: 'clean', refs: botCount });
    continue;
  }

  const result = cleanContent(content, gameName);
  if (result.changed) {
    fs.writeFileSync(indexPath, result.content, 'utf8');
    console.log(`  [DEDUP] ${gameName} (${botCount} -> 1 ref)`);
    results.push({ game: gameName, status: 'deduped', oldRefs: botCount });
  } else {
    console.log(`  [OK] ${gameName}`);
    results.push({ game: gameName, status: 'ok' });
  }
}

const clean = results.filter(r => r.status === 'clean').length;
const deduped = results.filter(r => r.status === 'deduped').length;
const ok = results.filter(r => r.status === 'ok').length;

console.log(`\n✅ Done!`);
console.log(`   Clean (no dupes): ${clean}`);
console.log(`   Deduplicated: ${deduped}`);
console.log(`   Already OK: ${ok}`);