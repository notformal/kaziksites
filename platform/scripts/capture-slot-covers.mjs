import { chromium } from 'playwright';
import fs from 'node:fs/promises';
import path from 'node:path';

const origin = process.env.GAMES_URL || 'http://127.0.0.1:8181';
const titles = JSON.parse(await fs.readFile(new URL('../apps/lobby/src/slot-titles.generated.json', import.meta.url), 'utf8'));
const out = path.resolve('apps/lobby/public/covers');
await fs.mkdir(out, { recursive: true });
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 640, height: 400 }, deviceScaleFactor: 1 });
for (const [index, game] of titles.entries()) {
  const url = `${origin}/games/slots-studio/index.html?title=${encodeURIComponent(game.titleId)}&parentOrigin=http://127.0.0.1:8280`;
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 15_000 });
  await page.screenshot({ path: path.join(out, `${game.id}.jpg`), type: 'jpeg', quality: 76, clip: { x: 0, y: 0, width: 640, height: 400 } });
  if ((index + 1) % 20 === 0) console.log(`${index + 1}/${titles.length}`);
}
await browser.close();
console.log(`Captured ${titles.length} original slot covers in ${out}`);
