/**
 * Final cleanup of orphaned fragments from previous bot overlay attempts
 */

const fs = require('fs');
const path = require('path');

const GAMES_DIR = path.join(__dirname, '..', 'public', 'games');

function cleanupFile(gameDir) {
  const indexPath = path.join(gameDir, 'index.html');
  if (!fs.existsSync(indexPath)) return null;

  let content = fs.readFileSync(indexPath, 'utf8');
  const gameName = path.basename(gameDir);
  let changed = false;

  // Remove orphaned bot overlay fragments (lines that are just catch/try without script tags)
  // Pattern: standalone "import { setupBotOverlay..." or "try { setupBotOverlay..." lines outside <script> tags
  const lines = content.split('\n');
  const cleaned = [];
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    
    // Skip orphaned bot overlay import lines (not inside script tags)
    if (/^import\s*\{\s*setupBotOverlay/.test(line)) continue;
    // Skip orphaned try/catch for bot overlay outside script tags
    if (/^(try|}\s*catch)\s*\{[^}]*setupBotOverlay/.test(line)) continue;
    
    cleaned.push(lines[i]);
  }

  content = cleaned.join('\n');

  // Clean up multiple consecutive empty lines (>2) to (<=2)
  const cleaned2 = content.replace(/\n{4,}/g, '\n\n\n');
  if (cleaned2 !== content) {
    content = cleaned2;
    changed = true;
  }

  // Clean trailing whitespace on each line
  const cleaned3 = content.replace(/[ \t]+$/g, '');
  if (cleaned3 !== content) {
    content = cleaned3;
    changed = true;
  }

  if (changed) {
    fs.writeFileSync(indexPath, content, 'utf8');
    return { game: gameName, status: 'cleaned' };
  } else {
    return { game: gameName, status: 'already-clean' };
  }
}

// Main
console.log('🧽 Final cleanup of orphaned fragments...\n');

const entries = fs.readdirSync(GAMES_DIR).filter(e => {
  const dirPath = path.join(GAMES_DIR, e);
  return fs.statSync(dirPath).isDirectory() && !e.startsWith('_');
});

let cleaned = 0;
for (const entry of entries) {
  try {
    const result = cleanupFile(path.join(GAMES_DIR, entry));
    if (result?.status === 'cleaned') cleaned++;
  } catch(e) {
    console.error(`  [ERR] ${entry}: ${e.message}`);
  }
}

console.log(`\n✅ Done! Cleaned: ${cleaned} / ${entries.length}`);