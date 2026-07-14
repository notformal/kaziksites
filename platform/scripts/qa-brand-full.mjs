import { chromium } from 'playwright';
import assert from 'node:assert/strict';

const base = process.env.BRAND_URL || 'http://127.0.0.1:8282';
const expected = process.env.BRAND_NAME || 'Royale';
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
const errors = [];
page.on('console', m => m.type() === 'error' && errors.push(`console ${m.text()}`));
page.on('pageerror', e => errors.push(`page ${e.message}`));
page.on('requestfailed', r => {
  const why = r.failure()?.errorText || '';
  if (!why.includes('ERR_ABORTED')) errors.push(`request ${r.url()} ${why}`);
});
const dismissIntro = async () => {
  if (await page.getByRole('button', { name: 'NEXT' }).count()) {
    await page.getByRole('button', { name: 'NEXT' }).click();
    await page.getByRole('button', { name: 'NEXT' }).click();
    await page.getByRole('button', { name: 'START EXPLORING' }).click();
  }
  if (await page.getByRole('button', { name: 'No thanks' }).count()) await page.getByRole('button', { name: 'No thanks' }).click();
};

try {
  await page.goto(base, { waitUntil: 'networkidle' });
  assert.match(await page.title(), new RegExp(expected, 'i'));
  await dismissIntro();

  await page.getByRole('button', { name: 'Help', exact: true }).click();
  await page.getByRole('heading', { name: 'Straight answers' }).waitFor();
  await page.getByLabel('Session reminder interval').selectOption('15');
  await page.getByRole('button', { name: 'Close help' }).click();

  await page.getByRole('button', { name: 'JOIN FREE' }).click();
  const stamp = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  await page.getByLabel('Display name').fill(`${expected} QA`);
  await page.getByLabel('Email').fill(`${expected.toLowerCase()}-${stamp}@example.invalid`);
  await page.getByLabel('Password').fill(`Full-QA-${stamp}!`);
  await page.getByRole('button', { name: 'CREATE ACCOUNT' }).click();
  await page.getByText('DEMO CREDITS').waitFor();
  assert.equal((await page.locator('.balance b').innerText()).trim(), '5000');
  await page.getByRole('button', { name: /COLLECT DAILY 250/ }).click();
  await page.getByRole('button', { name: /DAILY REWARD COLLECTED/ }).waitFor();
  await page.getByRole('button', { name: 'Close' }).click();

  const firstFavorite = page.getByRole('button', { name: /^Add .* to favorites$/ }).first();
  await firstFavorite.click();
  await page.getByRole('button', { name: 'Favorites', exact: true }).click();
  assert.ok(await page.getByRole('button', { name: /^Play / }).count());
  await page.getByRole('button', { name: 'All', exact: true }).click();
  await page.getByLabel('Search games').fill('roulette');
  assert.equal(await page.getByRole('button', { name: 'Play European Roulette' }).count(), 1);
  await page.getByLabel('Search games').fill('');

  while (await page.getByRole('button', { name: 'LOAD MORE' }).count()) await page.getByRole('button', { name: 'LOAD MORE' }).click();
  const buttons = page.getByRole('button', { name: /^Play / });
  assert.equal(await buttons.count(), 200);
  let launched = 0;
  for (let index = 0; index < 200; index++) {
    await buttons.nth(index).click();
    const frame = page.locator('iframe');
    await frame.waitFor({ state: 'attached', timeout: 5000 });
    await frame.evaluate(el => new Promise((resolve, reject) => {
      if (el.contentWindow?.document?.readyState === 'complete') return resolve();
      const timer = setTimeout(() => reject(new Error('iframe load timeout')), 5000);
      el.addEventListener('load', () => { clearTimeout(timer); resolve(); }, { once: true });
    })).catch(() => {});
    assert.ok((await frame.getAttribute('src'))?.includes('/games/'));
    launched++;
    await page.locator('.demoHead button').last().click();
  }
  assert.equal(launched, 200);

  await page.getByRole('button', { name: 'Account' }).click();
  await page.getByRole('button', { name: 'Sign out' }).click();
  await page.getByLabel('Email').fill(`${expected.toLowerCase()}-${stamp}@example.invalid`);
  await page.getByLabel('Password').fill(`Full-QA-${stamp}!`);
  await page.getByRole('button', { name: 'SIGN IN' }).click();
  await page.getByText('DEMO CREDITS').waitFor();
  await page.getByRole('button', { name: 'Close' }).click();

  await page.setViewportSize({ width: 390, height: 844 });
  await page.reload({ waitUntil: 'networkidle' });
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  assert.ok(overflow <= 2, `mobile overflow ${overflow}`);
  assert.ok(await page.getByRole('button', { name: /^Play / }).count());
  assert.deepEqual(errors, []);
  console.log(`FULL BRAND QA PASS ${expected}: auth/daily/personalization/help/mobile; launched ${launched}/200; runtime errors 0.`);
} finally {
  await browser.close();
}
