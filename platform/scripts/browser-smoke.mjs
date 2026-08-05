import { chromium } from 'playwright';

const base = process.env.BROWSER_BASE_URL || 'http://127.0.0.1:8180';
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
const errors = [];
page.on('console', message => { if (message.type() === 'error') errors.push(`console: ${message.text()}`); });
page.on('pageerror', error => errors.push(`page: ${error.message}`));
page.on('requestfailed', request => {
  const reason = request.failure()?.errorText || '';
  if (!reason.includes('ERR_ABORTED')) errors.push(`request: ${request.url()} ${reason}`);
});

for (const brand of ['aurora', 'ember', 'royale']) {
  await page.goto(`${base}/?brand=${brand}`, { waitUntil: 'networkidle' });
  if (await page.getByRole('button', { name: 'NEXT' }).count()) {
    await page.getByRole('button', { name: 'NEXT' }).click();
    await page.getByRole('button', { name: 'NEXT' }).click();
    await page.getByRole('button', { name: 'START EXPLORING' }).click();
  }
  if (await page.getByRole('button', { name: 'No thanks' }).count()) await page.getByRole('button', { name: 'No thanks' }).click();
  while (await page.getByRole('button', { name: 'LOAD MORE' }).count()) {
    await page.getByRole('button', { name: 'LOAD MORE' }).click();
  }
  const cards = await page.getByRole('button', { name: /^Play / }).count();
  if (cards < 140) throw new Error(`${brand}: only ${cards} game cards rendered`);
  if (!(await page.title())) throw new Error(`${brand}: document title missing`);
}

await page.setViewportSize({ width: 390, height: 844 });
for (const brand of ['aurora', 'ember', 'royale']) {
  await page.goto(`${base}/?brand=${brand}`, { waitUntil: 'networkidle' });
  if (!(await page.getByRole('button', { name: /^Play / }).count())) throw new Error(`${brand}: no mobile game cards`);
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  if (overflow > 2) throw new Error(`${brand}: mobile horizontal overflow ${overflow}px`);
}
await page.setViewportSize({ width: 1440, height: 1000 });

await page.goto(base, { waitUntil: 'networkidle' });
const suffix = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
await page.getByRole('button', { name: 'Play Nova Classic Slots' }).click();
await page.getByLabel('Display name').fill('Browser QA');
await page.getByLabel('Email').fill(`browser-${suffix}@example.invalid`);
await page.getByLabel('Password').fill(`Browser-${suffix}-Qa!`);
await page.getByRole('button', { name: 'CREATE ACCOUNT' }).click();
await page.getByText('DEMO CREDITS').waitFor();
await page.getByRole('button', { name: 'Close' }).click();
for (const title of ['Nova Classic Slots', 'Skyline Crash', 'Prism Plinko', 'European Roulette', 'Keno Plus']) {
  await page.getByRole('button', { name: `Play ${title}` }).click();
  await page.waitForTimeout(800);
  if (!(await page.locator('iframe').count())) throw new Error(`${title}: game iframe did not open`);
  await page.locator('.demoHead button').last().click();
}

await browser.close();
if (errors.length) throw new Error(errors.slice(0, 20).join('\n'));
console.log('Browser smoke PASS: 3 brands desktop/mobile, 200 cards each, core game frames, zero runtime errors.');
