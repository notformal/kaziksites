import { chromium } from 'playwright';
import path from 'node:path';

const base = process.env.LOBBY_URL || 'http://127.0.0.1:8280';
const games = [
  ['game-6','Nova Classic Slots'], ['game-7','Skyline Crash'], ['game-8','Prism Plinko'],
  ['game-9','European Roulette'], ['game-10','Keno Plus'],
];
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
await page.goto(base, { waitUntil: 'networkidle' });
if (await page.getByRole('button', { name: 'No thanks' }).count()) await page.getByRole('button', { name: 'No thanks' }).click();
await page.getByRole('button', { name: 'JOIN FREE' }).first().click();
const stamp = Date.now();
await page.getByLabel('Display name').fill('Cover Studio');
await page.getByLabel('Email').fill(`covers-${stamp}@example.invalid`);
await page.getByLabel('Password').fill(`Covers-${stamp}-Strong!`);
await page.getByRole('button', { name: 'CREATE ACCOUNT' }).click();
await page.getByText('DEMO CREDITS').waitFor();
await page.getByRole('button', { name: 'Close' }).click();
for (const [id,title] of games) {
  await page.getByLabel('Search games').fill(title);
  await page.getByRole('button', { name: `Play ${title}` }).click();
  const frame = page.locator('iframe');
  await frame.waitFor({ state: 'visible' });
  await page.waitForTimeout(700);
  await frame.screenshot({ path: path.resolve(`apps/lobby/public/covers/${id}.jpg`), type: 'jpeg', quality: 82 });
  await page.locator('.demoHead button').last().click();
}
await browser.close();
console.log('Captured five authenticated core game covers.');
