/**
 * ═══════════════════════════════════════════════════════════
 * COVER ART BUILD
 *
 * Renders a lobby cover for every built slot into
 * public/games/<id>/cover.png.
 *
 * The covers are drawn by the *same* procedural art code the games run
 * (art/symbol-art.js + art/palette.js), executed in a headless browser rather
 * than reimplemented in SVG. That is the point: a second drawing
 * implementation would drift, and a lobby tile that promises art the game does
 * not deliver is worse than no tile at all. Here the tile is literally the
 * game's own hero symbol on the game's own palette.
 *
 * Serves public/ itself, so the build has no dependency on a dev server being
 * up — `npm run build:covers` works from a clean checkout and in CI.
 *
 * Usage: node scripts/build-covers.mjs [--game id]
 */
import { createServer } from 'node:http';
import { createReadStream, readFileSync, writeFileSync, existsSync, statSync } from 'node:fs';
import { dirname, extname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from '../platform/node_modules/playwright/index.mjs';

import { SPECS } from '../src/game-math/specs.js';
import { COVER_SPECS } from '../src/game-math/cover-specs.js';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const PUBLIC = resolve(ROOT, 'public');
const args = process.argv.slice(2);
const argValue = (flag, fallback) => {
  const i = args.indexOf(flag);
  return i >= 0 && args[i + 1] ? args[i + 1] : fallback;
};
const ONLY = argValue('--game', null);

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.css': 'text/css; charset=utf-8',
};

/** Minimal static server over public/, with traversal refused. */
function servePublic() {
  return new Promise((ready) => {
    const server = createServer((req, res) => {
      const path = decodeURIComponent(new URL(req.url, 'http://x').pathname);
      const target = resolve(join(PUBLIC, path));
      if (!target.startsWith(PUBLIC) || !existsSync(target) || statSync(target).isDirectory()) {
        res.writeHead(404).end('not found');
        return;
      }
      res.writeHead(200, { 'Content-Type': MIME[extname(target)] || 'application/octet-stream' });
      createReadStream(target).pipe(res);
    });
    server.listen(0, '127.0.0.1', () => ready({ server, port: server.address().port }));
  });
}

const WIDTH = 480;
const HEIGHT = 360;

/**
 * Page that draws one cover and hands back a PNG data URL.
 *
 * Composition: a radial wash in the theme's own background hue, a ring of the
 * game's supporting symbols orbiting behind, and the premium symbol as hero.
 * The arrangement is derived from the manifest, so every game composes itself.
 */
const HARNESS = `<!DOCTYPE html><html><head><meta charset="utf-8"><style>
  html,body{margin:0;background:#000}
</style></head><body><script type="module">
import { Application, Container, Graphics, Rectangle, Text, TextStyle } from '/vendor/pixi.mjs';
import { buildTheme, ramp, mix } from '/games/_engine/art/palette.js';
import { drawSymbol } from '/games/_engine/art/symbol-art.js';

window.renderCover = async (spec, W, H) => {
  const app = new Application();
  await app.init({ width: W, height: H, antialias: true, backgroundAlpha: 1, resolution: 2, autoDensity: false });
  const theme = buildTheme(spec.theme);
  const hero = spec.hero;
  const supporting = spec.supporting;

  // Everything is drawn inside a clipped frame — the ray fan deliberately
  // overshoots the canvas, and without a mask the stage bounds would grow with
  // it and the extracted image would be padded with empty space.
  const frame = new Container();
  const clip = new Graphics().rect(0, 0, W, H).fill({ color: 0xffffff });
  frame.addChild(clip);
  frame.mask = clip;
  app.stage.addChild(frame);

  const focusY = H * 0.40;

  // ── Backdrop: concentric wash warming towards the accent at the centre ──
  frame.addChild(new Graphics().rect(0, 0, W, H).fill({ color: theme.backgroundDeep }));
  for (let i = 7; i > 0; i--) {
    frame.addChild(new Graphics()
      .circle(W * 0.5, focusY, (W * 0.72) * (i / 7))
      .fill({ color: mix(theme.backgroundDeep, theme.accent.base, 0.14 * (1 - i / 8)), alpha: 0.95 }));
  }

  // ── Ray fan ──
  const rays = new Graphics();
  for (let i = 0; i < 18; i++) {
    const a = (i / 18) * Math.PI * 2;
    rays.moveTo(W / 2, focusY)
      .lineTo(W / 2 + Math.cos(a) * W * 1.4, focusY + Math.sin(a) * W * 1.4)
      .lineTo(W / 2 + Math.cos(a + 0.1) * W * 1.4, focusY + Math.sin(a + 0.1) * W * 1.4)
      .closePath();
  }
  rays.fill({ color: theme.accent.light, alpha: 0.06 });
  frame.addChild(rays);

  // One symbol = its vector figure plus, for card ranks, the letterform the
  // game layers on top. Without this the rank family renders as a bare plate,
  // because the glyph is text rather than geometry.
  const placeSymbol = (art, size, x, y, alpha) => {
    const node = new Container();
    const g = new Graphics();
    drawSymbol(g, { ...art, ramp: ramp(art.hue) }, size, theme);
    node.addChild(g);
    if (art.glyph) {
      const label = new Text({ text: art.glyph, style: new TextStyle({
        fontFamily: 'Georgia, "Times New Roman", serif', fontSize: size * 0.46, fontWeight: '700',
        fill: theme.text, stroke: { color: theme.metal.rim, width: size * 0.028 },
        dropShadow: { color: 0x000000, alpha: 0.6, blur: 4, distance: size * 0.02, angle: Math.PI / 2 },
      })});
      label.anchor.set(0.5);
      node.addChild(label);
    }
    node.position.set(x, y);
    node.alpha = alpha;
    frame.addChild(node);
  };

  // ── Supporting symbols on a shallow arc behind the hero ──
  supporting.forEach((s, i) => {
    const t = supporting.length === 1 ? 0.5 : i / (supporting.length - 1);
    const angle = Math.PI * (1.18 + t * 0.64); // upper arc, left to right
    placeSymbol(
      s, W * 0.17,
      W / 2 + Math.cos(angle) * W * 0.34,
      focusY + Math.sin(angle) * H * 0.34,
      0.72,
    );
  });

  // ── Hero ──
  placeSymbol(hero, W * 0.36, W / 2, focusY + H * 0.06, 1);

  // No title is drawn on the tile: the lobby card already captions it, and a
  // baked-in title would be cropped by the card's aspect ratio and read as a
  // duplicate next to the caption. The tile is pure art.
  // A vignette keeps the caption below it legible against bright art.
  for (let i = 0; i < 5; i++) {
    frame.addChild(new Graphics()
      .rect(0, H - 40 - i * 14, W, 14 + i * 14)
      .fill({ color: theme.backgroundDeep, alpha: 0.12 }));
  }

  app.render();
  const url = await app.renderer.extract.base64({
    target: app.stage,
    format: 'png',
    frame: new Rectangle(0, 0, W, H),
  });
  app.destroy(true, { children: true });
  return url;
};
window.__harnessReady = true;
</script></body></html>`;

// ═══════════════════════════════════════════════════════════

/**
 * Normalise both sources into one descriptor the harness understands:
 * engine-driven slots derive theirs from the built manifest, everything else
 * declares it in cover-specs.js.
 */
function descriptors() {
  const out = [];

  for (const spec of SPECS) {
    const manifestPath = resolve(ROOT, 'public/games', spec.id, 'math.json');
    if (!existsSync(manifestPath)) continue;
    const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
    const symbols = manifest.presentation.symbols;
    const hero = symbols.find((s) => s.kind === 'wild') || symbols[0];
    const supporting = symbols
      .filter((s) => (s.tier === 'premium' || s.tier === 'high') && s.id !== hero.id)
      .slice(0, 4)
      .map((s) => s.art);
    out.push({
      id: spec.id,
      source: 'manifest',
      theme: manifest.presentation.theme,
      hero: hero.art,
      supporting,
    });
  }

  for (const spec of COVER_SPECS) {
    out.push({
      id: spec.id,
      source: 'cover-spec',
      theme: spec.theme,
      hero: spec.hero,
      supporting: spec.supporting,
    });
  }

  return ONLY ? out.filter((d) => d.id === ONLY) : out;
}

const targets = descriptors();

if (!targets.length) {
  console.error(ONLY ? `No cover source for --game ${ONLY}` : 'No games found — run `npm run build:math` first.');
  process.exit(1);
}

const { server, port } = await servePublic();
const BASE = `http://127.0.0.1:${port}`;

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: WIDTH, height: HEIGHT } });

// The harness must load from the same origin as public/ so its bare-relative
// module imports (/vendor/pixi.mjs, /games/_engine/...) resolve.
await page.route('**/__cover-harness', (route) =>
  route.fulfill({ status: 200, contentType: 'text/html', body: HARNESS }),
);

let failures = 0;
try {
  await page.goto(`${BASE}/__cover-harness`, { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => window.__harnessReady, { timeout: 20000 });

  for (const descriptor of targets) {
    try {
      const dataUrl = await page.evaluate(
        ([d, w, h]) => window.renderCover(d, w, h),
        [descriptor, WIDTH, HEIGHT],
      );
      const base64 = dataUrl.split(',')[1];
      writeFileSync(
        resolve(ROOT, 'public/games', descriptor.id, 'cover.png'),
        Buffer.from(base64, 'base64'),
      );
      console.log(`✓ ${descriptor.id}/cover.png  (${descriptor.source})`);
    } catch (err) {
      console.error(`✗ ${descriptor.id}: ${err.message}`);
      failures++;
    }
  }
} finally {
  await browser.close();
  server.close();
}

console.log(`\n${targets.length - failures} cover(s) written.`);
if (failures) process.exit(1);
