import { chromium } from 'playwright';
import fs from 'node:fs/promises';
import path from 'node:path';

const origin = process.env.GAMES_URL || 'http://127.0.0.1:8181';
const out = path.resolve('apps/lobby/public/covers');
await fs.mkdir(out, { recursive: true });
const little = JSON.parse(await fs.readFile(new URL('../apps/lobby/src/littlejs.generated.json', import.meta.url), 'utf8'));
const entries = [
  ['game-1', '/games/2048/index.html'], ['game-2', '/games/tetris/index.html'],
  ['game-3', '/games/racer/index.html'], ['game-4', '/games/radius-raid/index.html'],
  ['game-5', '/games/pong/index.html'], ['game-6', '/games/slots-classic/index.html'],
  ['game-7', '/games/crash/index.html'], ['game-8', '/games/plinko/index.html'],
  ['game-9', '/games/roulette/index.html'], ['game-10', '/games/keno/index.html'],
  ...little.map(game => [game.id, game.url.replace(/^\./, '')]),
];
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 640, height: 400 }, deviceScaleFactor: 1 });
for (const [index, [id, relative]] of entries.entries()) {
  const url = new URL(relative, origin).href;
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 15_000 }).catch(() => {});
  await page.waitForTimeout(350);
  await page.screenshot({ path: path.join(out, `${id}.jpg`), type: 'jpeg', quality: 76 });
  if ((index + 1) % 20 === 0) console.log(`${index + 1}/${entries.length}`);
}
await browser.close();
console.log(`Captured ${entries.length} featured and arcade covers.`);
