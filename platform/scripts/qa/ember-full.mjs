import { chromium } from 'playwright';
import fs from 'node:fs/promises';

const base = process.env.EMBER_BASE_URL || 'http://127.0.0.1:8382';
const expectedApi = process.env.EXPECTED_API_ORIGIN || 'http://127.0.0.1:8887';
const expectedGames = process.env.EXPECTED_GAMES_ORIGIN || 'http://127.0.0.1:8181';
const failures = [], evidence = {};
const check = (ok, message) => { if (!ok) failures.push(message); };
const browser = await chromium.launch({ headless: true });

async function dismissOnboarding(page, consent = 'allow') {
  while (await page.getByRole('button', { name: 'NEXT' }).count()) await page.getByRole('button', { name: 'NEXT' }).click();
  if (await page.getByRole('button', { name: 'START EXPLORING' }).count()) await page.getByRole('button', { name: 'START EXPLORING' }).click();
  const choice = consent === 'allow' ? 'ALLOW' : 'No thanks';
  if (await page.getByRole('button', { name: choice }).count()) await page.getByRole('button', { name: choice }).click();
}

async function newAuditedPage(context, viewport) {
  const page = await context.newPage();
  await page.setViewportSize(viewport);
  const errors = [];
  page.on('console', m => { if (m.type() === 'error') errors.push(`console ${m.text()}`); });
  page.on('pageerror', e => errors.push(`page ${e.message}`));
  page.on('requestfailed', r => { if (!r.failure()?.errorText?.includes('ERR_ABORTED')) errors.push(`request ${r.url()} ${r.failure()?.errorText}`); });
  return { page, errors };
}

const context = await browser.newContext();
const { page, errors } = await newAuditedPage(context, { width: 1440, height: 1000 });
await page.goto(base, { waitUntil: 'networkidle' });
await dismissOnboarding(page, 'allow');
check((await page.locator('main').getAttribute('data-brand')) === 'ember', 'bundle is not fixed to Ember');
check((await page.title()).startsWith('Ember Club'), 'Ember document title missing');
check(!new URL(page.url()).searchParams.has('brand'), 'Ember requires a brand query parameter');
check((await page.getByText('200 PLAYABLE GAMES').count()) === 1, '200-game trust statement missing');

// Search, category, pagination and anonymous auth gate.
await page.getByLabel('Search games').fill('Nova Classic');
check((await page.getByRole('button', { name: 'Play Nova Classic Slots' }).count()) === 1, 'search did not find core slot');
await page.getByLabel('Search games').fill('definitely-not-a-game');
check((await page.getByText('Nothing here yet').count()) === 1, 'empty search state missing');
await page.getByLabel('Search games').fill('');
await page.getByRole('button', { name: 'Slots', exact: true }).click();
check((await page.getByRole('button', { name: /^Play / }).count()) > 0, 'Slots category empty');
await page.getByRole('button', { name: 'All', exact: true }).click();
while (await page.getByRole('button', { name: 'LOAD MORE' }).count()) await page.getByRole('button', { name: 'LOAD MORE' }).click();
check((await page.getByRole('button', { name: /^Play / }).count()) === 200, 'not exactly 200 cards after pagination');

await page.getByRole('button', { name: 'Play Nova Classic Slots' }).click();
check((await page.getByRole('dialog', { name: 'Account' }).count()) === 1, 'anonymous wallet game did not open auth gate');
const suffix = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
const email = `ember-qa-${suffix}@example.invalid`, password = `Ember-${suffix}-Qa!`;
await page.getByLabel('Display name').fill('Ember Browser QA');
await page.getByLabel('Email').fill(email);
await page.getByLabel('Password').fill(password);
await page.getByRole('button', { name: 'CREATE ACCOUNT' }).click();
await page.getByText('DEMO CREDITS').waitFor();
check((await page.locator('.balance b').innerText()) === '5000', 'starting balance is not 5000');
await page.getByRole('button', { name: 'Close' }).click();

// Favorites and recent list round trip.
await page.getByRole('button', { name: 'Add Nova Classic Slots to favorites' }).click();
await page.getByRole('button', { name: 'Favorites', exact: true }).click();
check((await page.getByRole('button', { name: 'Play Nova Classic Slots' }).count()) === 1, 'favorite was not persisted in UI');
await page.getByRole('button', { name: 'All', exact: true }).click();

// Open each core game in the real cross-origin iframe and exercise a wager control.
const core = ['Nova Classic Slots', 'Skyline Crash', 'Prism Plinko', 'European Roulette', 'Keno Plus'];
for (const title of core) {
  await page.getByRole('button', { name: `Play ${title}` }).click();
  const frame = page.locator('iframe');
  await frame.waitFor();
  const src = await frame.getAttribute('src');
  check(src?.startsWith(expectedGames), `${title} iframe does not use games origin`);
  const child = page.frames().find(f => f.url() === src || f.url().startsWith(src.split('?')[0]));
  await page.waitForTimeout(350);
  if (child) {
    const play = child.locator('#play');
    if (await play.count()) {
      await play.waitFor({ state: 'visible' });
      if (title === 'Keno Plus') {
        const pick = child.locator('#grid button').first();
        if (await pick.count()) await pick.click();
      }
      check(!(await play.isDisabled()), `${title} play control remained disabled`);
      if (!(await play.isDisabled())) await play.click();
      await page.waitForTimeout(title === 'Skyline Crash' ? 1400 : 650);
    }
  }
  await page.locator('.demoHead button').last().click();
}

await page.getByRole('button', { name: 'Recent', exact: true }).click();
check((await page.getByRole('button', { name: /^Play / }).count()) >= 5, 'recent games did not record all core launches');
await page.getByRole('button', { name: 'All', exact: true }).click();

// Account/history, daily reward, fairness affordance, logout/login.
await page.getByRole('button', { name: 'Account' }).click();
await page.getByText('Round history').waitFor();
check((await page.locator('.roundHistory article').count()) > 0, 'round history empty after core interactions');
const daily = page.getByRole('button', { name: /COLLECT DAILY 250/ });
if (await daily.count()) await daily.click();
check((await page.locator('.balance b').innerText()).match(/^\d+$/), 'balance is not numeric after daily reward');
check((await page.getByText('Verify fairness').count()) > 0, 'fairness verification affordance missing');
await page.getByRole('button', { name: 'Sign out' }).click();
await page.getByLabel('Email').fill(email);
await page.getByLabel('Password').fill(password);
await page.getByRole('button', { name: 'SIGN IN' }).click();
await page.getByText('DEMO CREDITS').waitFor();
await page.getByRole('button', { name: 'Close' }).click();

// Help, reminder and social period controls.
await page.getByRole('button', { name: 'Help', exact: true }).click();
check((await page.getByRole('heading', { name: 'Straight answers' }).count()) === 1, 'help center missing');
await page.getByLabel('Session reminder interval').selectOption('15');
check(await page.getByText('Do credits have monetary value?').isVisible(), 'FAQ missing');
await page.getByRole('button', { name: 'Close help' }).click();
for (const label of ['Today', '7 days', 'All time']) await page.getByRole('button', { name: label }).click();

// Enumerate all 200 launch destinations through the actual card UI.
while (await page.getByRole('button', { name: 'LOAD MORE' }).count()) await page.getByRole('button', { name: 'LOAD MORE' }).click();
const playButtons = page.getByRole('button', { name: /^Play / });
const names = await playButtons.evaluateAll(nodes => nodes.map(n => n.getAttribute('aria-label')));
const destinations = [];
for (let index = 0; index < names.length; index++) {
  await playButtons.nth(index).click();
  const iframe = page.locator('iframe');
  await iframe.waitFor();
  destinations.push({ name: names[index], src: await iframe.getAttribute('src') });
  await page.locator('.demoHead button').last().click();
}
check(destinations.length === 200, `only ${destinations.length}/200 launch dialogs opened`);
check(new Set(destinations.map(x => x.src)).size === 200, 'launch destinations are not unique');
check(destinations.every(x => x.src?.startsWith(expectedGames)), 'one or more games escape the configured games origin');

// Every emitted path must return HTML successfully.
let pathPass = 0;
for (const { src } of destinations) {
  const response = await context.request.get(src);
  if (response.ok() && (response.headers()['content-type'] || '').includes('text/html')) pathPass++;
  else failures.push(`launch path failed ${response.status()} ${src}`);
}
evidence.desktop = { cards: names.length, uniqueLaunches: new Set(destinations.map(x => x.src)).size, launchHttpPass: pathPass };

// Mobile fixed-bundle smoke and basic accessibility/overflow checks.
const mobileContext = await browser.newContext();
await mobileContext.addInitScript(() => { localStorage.setItem('arcade_onboarding_v1', 'done'); localStorage.setItem('arcade_analytics_consent', 'false'); });
const mobileAudit = await newAuditedPage(mobileContext, { width: 390, height: 844 });
await mobileAudit.page.goto(base, { waitUntil: 'networkidle' });
check((await mobileAudit.page.locator('main').getAttribute('data-brand')) === 'ember', 'mobile bundle is not Ember');
check((await mobileAudit.page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)) <= 2, 'mobile horizontal overflow');
check((await mobileAudit.page.getByRole('button', { name: 'Open navigation' }).count()) === 1, 'mobile navigation control missing');
await mobileAudit.page.getByRole('button', { name: 'Open navigation' }).click();
check(await mobileAudit.page.getByRole('button', { name: 'Help', exact: true }).last().isVisible(), 'mobile navigation did not open');
evidence.mobile = { viewport: '390x844', overflow: await mobileAudit.page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth) };

check(errors.length === 0, `desktop runtime errors: ${errors.slice(0, 10).join(' | ')}`);
check(mobileAudit.errors.length === 0, `mobile runtime errors: ${mobileAudit.errors.slice(0, 10).join(' | ')}`);
evidence.runtime = { desktopErrors: errors, mobileErrors: mobileAudit.errors, apiOrigin: expectedApi, gamesOrigin: expectedGames };

await mobileContext.close();
await context.close();
await browser.close();
await fs.mkdir('output/playwright', { recursive: true });
const report = { brand: 'ember', base, passed: failures.length === 0, failures, evidence, generatedAt: new Date().toISOString() };
await fs.writeFile('output/playwright/ember-full-report.json', JSON.stringify(report, null, 2));
if (failures.length) throw new Error(`Ember full QA failed:\n- ${failures.join('\n- ')}`);
console.log(`Ember full QA PASS: 200/200 UI launches and HTTP paths, core wallet interactions, auth/personalization/trust desktop+mobile, zero runtime errors.`);
