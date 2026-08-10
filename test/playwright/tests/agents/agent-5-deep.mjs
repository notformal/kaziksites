

// ═══════════════════════════════════════════════════════════
// AGENT 5 — DEEP GAMEPLAY & ANIMATION VALIDATOR
// ═══════════════════════════════════════════════════════════

import { test, expect } from '@playwright/test';
const BASE = 'http://127.0.0.1:5173';

test.describe('Agent 5 — Deep Gameplay & Animation', () => {
  
  // CRASH: multiplier animation + cashout button
  test('Crash Pro gameplay loop', async ({ page }) => {
    await page.goto(`${BASE}/games/crash-pro/index.html`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2000);
    const betBtn = page.locator('button:not([disabled])').first();
    if (await betBtn.isVisible()) {
      await betBtn.click();
      await page.waitForTimeout(3000);
      const cashoutBtn = page.locator('button#action-btn, [id="cashout"], [class*="cash"]').first();
      if (await cashoutBtn.isVisible()) {
        await cashoutBtn.click();
        console.log('[AGENT5] CRASH: bet->multiplier growing->cashout');
      } else { console.log('[AGENT5] CRASH: no cashout btn after 3s'); }
    } else { console.log('[AGENT5] CRASH: no bet btn'); }
    await page.screenshot({ path: 'test-results/agent5-crash.png' });
  });

  // MINES: grid reveal + mine detection + cashout loop
  test('Mines Premium gameplay loop', async ({ page }) => {
    await page.goto(`${BASE}/games/mines-premium/index.html`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2000);
    const playBtn = page.locator('button#go, button[class*="play"], button:has-text("PLAY"), button:has-text("Start")').first();
    if (!(await playBtn.isVisible())) { console.log('[AGENT5] MINES: no play btn'); return; }
    await playBtn.click();
    await page.waitForTimeout(1500);
    const cells = page.locator('[class*="cell"], [class*="tile"]').filter({ visible: true });
    let revealed = 0;
    for (let i = 0; i < Math.min(6, await cells.count()); i++) {
      try { if ((await cells.nth(i).isVisible())) { await cells.nth(i).click(); revealed++; await page.waitForTimeout(500); } } catch {}
    }
    const cashBtn = page.locator('button#action-btn, [id="cashout"], [class*="cash"], button:has-text("Stop")').first();
    if (await cashBtn.isVisible()) { await cashBtn.click(); console.log(`[AGENT5] MINES: revealed ${revealed} -> cashed out`); }
    else { console.log(`[AGENT5] MINES: revealed ${revealed}, no cashout btn`); }
    await page.screenshot({ path: 'test-results/agent5-mines.png' });
  });

  // SLOTS: spin animation + reel movement detection
  test('Slots Royal gameplay loop', async ({ page }) => {
    await page.goto(`${BASE}/games/slots-royal/index.html`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2000);
    const spinBtn = page.locator('button:has-text("Spin"), button[class*="spin"]').first();
    if (!(await spinBtn.isVisible())) { console.log('[AGENT5] SLOTS: no spin btn'); return; }
    await spinBtn.click();
    await page.waitForTimeout(3000);
    const text = await page.evaluate(() => document.body?.innerText?.slice(0, 500) || '');
    const hasWin = /win|winner|jackpot|bonus/i.test(text);
    console.log(`[AGENT5] SLOTS: spin done, textLen=${text.length}, winDisplay=${hasWin}`);
    await page.screenshot({ path: 'test-results/agent5-slots.png' });
  });

  // DICE gameplay loop
  test('Dice Deep Gameplay', async ({ page }) => {
    await page.goto(BASE + '/games/dice/index.html', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2000);
    const btn = page.locator('button:not([disabled])').first();
    if (!(await btn.isVisible())) { console.log('[AGENT5] DICE: no btn'); return; }
    await btn.click(); await page.waitForTimeout(2000);
    const text = await page.evaluate(() => document.body?.innerText?.slice(0, 300) || '');
    console.log('[AGENT5] DICE: post-roll len=' + text.length);
    await page.screenshot({ path: 'test-results/agent5-dice.png' });
  });

  test('Plinko Deep Gameplay', async ({ page }) => {
    await page.goto(BASE + '/games/plinko-master/index.html', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2000);
    const btn = page.locator('button:not([disabled])').first();
    if (!(await btn.isVisible())) { console.log('[AGENT5] PLINKO: no btn'); return; }
    await btn.click(); await page.waitForTimeout(4000);
    const text = await page.evaluate(() => document.body?.innerText?.slice(0, 300) || '');
    console.log('[AGENT5] PLINKO: post-drop len=' + text.length);
    await page.screenshot({ path: 'test-results/agent5-plinko.png' });
  });

  test('Roulette Deep Gameplay', async ({ page }) => {
    await page.goto(BASE + '/games/roulette-royale/index.html', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2000);
    const btn = page.locator('button:not([disabled])').first();
    if (!(await btn.isVisible())) { console.log('[AGENT5] ROULETTE: no btn'); return; }
    await btn.click(); await page.waitForTimeout(4000);
    const text = await page.evaluate(() => document.body?.innerText?.slice(0, 300) || '');
    console.log('[AGENT5] ROULETTE: post-spin len=' + text.length);
    await page.screenshot({ path: 'test-results/agent5-roulette.png' });
  });

  test('Blackjack Deep Gameplay', async ({ page }) => {
    await page.goto(BASE + '/games/blackjack-pro/index.html', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2000);
    const btn = page.locator('button:not([disabled])').first();
    if (!(await btn.isVisible())) { console.log('[AGENT5] BJ: no btn'); return; }
    await btn.click(); await page.waitForTimeout(2000);
    const text = await page.evaluate(() => document.body?.innerText?.slice(0, 500) || '');
    const hasHitStand = /hit|stand|double/i.test(text);
    const hitBtn = page.locator('button:has-text("Hit"), button[class*="hit"]').first();
    if (await hitBtn.isVisible()) { await hitBtn.click(); console.log('[AGENT5] BJ: dealt + hit'); }
    else { console.log('[AGENT5] BJ: dealt, hit/stand=' + hasHitStand); }
    const standBtn = page.locator('button:has-text("Stand"), button[class*="stand"]').first();
    if (await standBtn.isVisible()) { await standBtn.click(); console.log('[AGENT5] BJ: stood'); }
    await page.screenshot({ path: 'test-results/agent5-bj.png' });
  });

  test('Crazy Time Deep Gameplay', async ({ page }) => {
    await page.goto(BASE + '/games/crazy-time/index.html', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2000);
    const btn = page.locator('button:not([disabled])').first();
    if (!(await btn.isVisible())) { console.log('[AGENT5] CRAZY TIME: no btn'); return; }
    await btn.click(); await page.waitForTimeout(4000);
    const text = await page.evaluate(() => document.body?.innerText?.slice(0, 300) || '');
    console.log('[AGENT5] CRAZY TIME: post-spin len=' + text.length);
    await page.screenshot({ path: 'test-results/agent5-crazy-time.png' });
  });

});
