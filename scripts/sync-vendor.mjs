/**
 * Vendor browser-side third-party ESM bundles into `public/vendor/`.
 *
 * Games under `public/games/` are plain static files — Vite copies them
 * verbatim and never rewrites their imports. They therefore cannot use bare
 * specifiers (`import 'pixi.js'`); they need a real, relative URL. This script
 * is the single place that bridges `node_modules` → `public/vendor`, so the
 * runtime copy is always reproducible from package.json rather than a blob
 * checked in by hand.
 *
 * Run via `npm run sync:vendor` (wired into prebuild + predev).
 */
import { copyFileSync, mkdirSync, existsSync, statSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');

/** source (relative to repo root) → destination (relative to repo root) */
const VENDOR_FILES = [
  { from: 'node_modules/pixi.js/dist/pixi.min.mjs', to: 'public/vendor/pixi.mjs' },
];

let failed = false;

for (const { from, to } of VENDOR_FILES) {
  const src = resolve(ROOT, from);
  const dest = resolve(ROOT, to);

  if (!existsSync(src)) {
    console.error(`✗ missing source: ${from} — run \`npm install\` first`);
    failed = true;
    continue;
  }

  mkdirSync(dirname(dest), { recursive: true });
  copyFileSync(src, dest);
  const kb = Math.round(statSync(dest).size / 1024);
  console.log(`✓ ${from} → ${to} (${kb} KB)`);
}

process.exit(failed ? 1 : 0);
