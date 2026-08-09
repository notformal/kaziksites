/**
 * Script to add bot overlay integration to all games
 * Run with: node scripts/add-bot-overlay-to-games.js
 */

const fs = require('fs');
const path = require('path');

const GAMES_DIR = path.join(__dirname, '..', 'public', 'games');

// Games that already have bot overlay - skip them
const ALREADY_HAS_BOT = [
  'crash-pro',
  'pragmatic-live', // likely has it
];

function addBotOverlayToHtml(htmlContent, gameName) {
  const checks = ['bot-overlay', 'setupBotOverlay'];
  if (checks.some(c => htmlContent.includes(c))) {
    return null; // Already has bot overlay
  }

  // Strategy 1: If there's a script block, inject import + setup before closing tag
  const scriptBlockMatch = htmlContent.match(/<script[^>]*>([\s\S]*?)<\/script>/i);
  
  if (scriptBlockMatch) {
    const fullScript = scriptBlockMatch[0];
    const scriptBody = scriptBlockMatch[1].trim();
    
    // Check if it's a type="module" script
    const isModule = /type=["']module["']/.test(fullScript);
    
    let newScript;
    if (isModule) {
      // Add import at the top and setup call before end
      newScript = `import { setupBotOverlay } from '../_engine/core/bot-overlay.js';\n` + scriptBody + `\n\ntry { setupBotOverlay('#game-wrap', { gameName: '${gameName}', refreshInterval: 3000 }); } catch(e) { console.warn('[BotOverlay] Setup failed:', e.message); }`;
    } else {
      // Add at the bottom as regular script
      newScript = scriptBody + `\n\n(function() {\n  const s = document.createElement('script');\n  s.src = '/games/_engine/core/bot-overlay.js';\n  s.onload = function() {\n    try { setupBotOverlay('#game-wrap', { gameName: '${gameName}', refreshInterval: 3000 }); } catch(e) { console.warn('[BotOverlay]', e.message); }\n  };\n  document.body.appendChild(s);\n})();`;
    }
    
    return htmlContent.replace(fullScript, newScript);
  }
  
  // Strategy 2: Before </body> or </html>, add a loading script
  const botScriptTag = `<script type="module">
import { setupBotOverlay } from '../_engine/core/bot-overlay.js';
try { setupBotOverlay('#game-wrap', { gameName: '${gameName}', refreshInterval: 3000 }); } catch(e) { console.warn('[BotOverlay] Setup failed:', e.message); }
</script>`;

  if (htmlContent.includes('</body>')) {
    return htmlContent.replace('</body>', botScriptTag + '\n</body>');
  } else if (htmlContent.includes('</html>')) {
    return htmlContent.replace('</html>', botScriptTag + '\n</html>');
  }

  // Strategy 3: Append before closing tag as last resort
  return htmlContent + botScriptTag;
}

function processGameFolder(gameDir) {
  const indexPath = path.join(gameDir, 'index.html');
  if (!fs.existsSync(indexPath)) return null;

  const gameName = path.basename(gameDir);
  if (ALREADY_HAS_BOT.includes(gameName)) {
    console.log(`  [SKIP] ${gameName} — already has bot overlay`);
    return { game: gameName, status: 'skipped' };
  }

  let content = fs.readFileSync(indexPath, 'utf8');
  const modified = addBotOverlayToHtml(content, gameName);
  
  if (!modified) {
    console.log(`  [SKIP] ${gameName} — no modification needed or already integrated`);
    return { game: gameName, status: 'skip-no-mod' };
  }

  fs.writeFileSync(indexPath, modified, 'utf8');
  console.log(`  [ADDED] ${gameName}`);
  return { game: gameName, status: 'added' };
}

// Main execution
console.log('🤖 Adding bot overlay to all games...\n');

const entries = fs.readdirSync(GAMES_DIR).filter(e => {
  const dirPath = path.join(GAMES_DIR, e);
  return fs.statSync(dirPath).isDirectory() && !e.startsWith('_');
});

console.log(`Found ${entries.length} game folders to process.\n`);

const results = [];
for (const entry of entries) {
  const gameDir = path.join(GAMES_DIR, entry);
  try {
    const result = processGameFolder(gameDir);
    if (result) results.push(result);
  } catch (e) {
    console.error(`  [ERROR] ${entry}: ${e.message}`);
    results.push({ game: entry, status: 'error', error: e.message });
  }
}

const added = results.filter(r => r.status === 'added').length;
const skipped = results.filter(r => r.status === 'skipped' || r.status === 'skip-no-mod').length;
const errors = results.filter(r => r.status === 'error').length;

console.log(`\n✅ Done! Summary:`);
console.log(`   Added: ${added}`);
console.log(`   Skipped (already had): ${skipped}`);
console.log(`   Errors: ${errors}`);