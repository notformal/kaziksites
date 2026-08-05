/**
 * ═══════════════════════════════════════════════════════════
 * GAME PAGE BUILD
 *
 * Writes public/games/<id>/index.html for every slot spec.
 *
 * The pages are generated rather than hand-written because they are pure
 * boilerplate: mount point, engine import, error surface. Twelve hand-kept
 * copies of the same twenty lines is how a fleet drifts — one game quietly ends
 * up on a different import path and nobody notices until it 404s in production.
 *
 * Usage: node scripts/build-game-pages.mjs [--game id]
 */
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { SPECS } from '../src/game-math/specs.js';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const only = args.indexOf('--game') >= 0 ? args[args.indexOf('--game') + 1] : null;

const escapeHtml = (s) =>
  String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

/**
 * The page is intentionally thin. Everything that could differ between games
 * lives in math.json, which the engine fetches — so this template never needs
 * to know anything game-specific beyond the title.
 */
const page = (spec) => `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<meta name="color-scheme" content="dark">
<title>${escapeHtml(spec.title)}</title>
<meta name="description" content="${escapeHtml(spec.title)} — ${spec.paylines}-line video slot, ${(spec.targetRtp * 100).toFixed(2)}% RTP, ${spec.volatility} volatility. Demo credits only.">
<style>
  html,body{margin:0;height:100%;background:#06070c}
  #game{position:fixed;inset:0}
  #boot{position:fixed;inset:0;display:grid;place-items:center;color:#8d93ab;
    font:600 13px/1.6 "Segoe UI",system-ui,sans-serif;text-align:center;padding:24px}
  #boot[data-error="true"]{color:#ff6b81}
</style>
</head>
<body>
<div id="game"></div>
<div id="boot">Loading ${escapeHtml(spec.title)}…</div>
<script type="module">
  import { bootSlot } from '../_engine/slot-engine.js';

  const boot = document.getElementById('boot');
  try {
    const engine = await bootSlot({ parent: document.getElementById('game') });
    boot.remove();
    // Exposed for automated QA and for the lobby's iframe integration.
    window.__game = engine;
    window.dispatchEvent(new CustomEvent('game:ready', { detail: { id: ${JSON.stringify(spec.id)} } }));
  } catch (error) {
    boot.dataset.error = 'true';
    boot.textContent = 'Could not start ${escapeHtml(spec.title)}: ' + error.message;
    console.error(error);
  }
</script>
</body>
</html>
`;

const targets = only ? SPECS.filter((s) => s.id === only) : SPECS;
if (!targets.length) {
  console.error(`No spec matches --game ${only}`);
  process.exit(1);
}

let written = 0;
let missingMath = 0;

for (const spec of targets) {
  const dir = resolve(ROOT, 'public/games', spec.id);
  if (!existsSync(resolve(dir, 'math.json'))) {
    console.error(`✗ ${spec.id}: math.json missing — run \`npm run build:math\` first`);
    missingMath++;
    continue;
  }
  mkdirSync(dir, { recursive: true });
  writeFileSync(resolve(dir, 'index.html'), page(spec));
  console.log(`✓ ${spec.id}/index.html`);
  written++;
}

console.log(`\n${written} page(s) written.`);
if (missingMath) process.exit(1);
