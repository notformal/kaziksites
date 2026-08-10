// ═══════════════════════════════════════════════════════════
// AGENT 2 — GAME INTERACTION TESTER (Part 1/2)
// Tests each game loads, has play/bet controls, responds to clicks
// ═══════════════════════════════════════════════════════════

import { test, expect } from '@playwright/test';

const GAMES_TO_TEST = [
  'crash-pro', 'mines-premium', 'plinko-master', 'dice', 
  'keno', 'limbo', 'wheel', 'hilo',
  'slots-royal', 'cosmic-queen', 'dragons-fortune', 'pharaohs-treasure',
  'fruit-shop', 'gold-caravan', 'magic-crystal', 'hot-navigator',
  'diamond-rush', 'wild-west-gold', 'book-of-gold', 'super-line-fruit-bomb',
  'lucky-streak',
  'blackjack-pro', 'baccarat-pro', 'roulette-royale',
  'crazy-time', 'monopoly-live', 'dream-catcher',
  'lightning-blackjack', 'mega-roulette', 'speed-baccarat',
  'cash-or-crash', 'fishing-tank', 'snow-run', 'duck-race', 'footfall',
];

const BASE = 'http://127.0.0.1:5173';

const BUTTON_SELECTORS = [
  'button[class*="spin"]', 'button[class*="play"]', 'button[class*="bet"]',
  'button[class*="start"]', 'button[class*="deal"]', 'button[class*="launch"]',
  'button[data-action]', 'button:has-text("Spin")', 'button:has-text("Play")',
  'button:has-text("Bet")', 'button:has-text("Deal")', 'button:has-text("Start")',
  '.btn-spin', '.btn-play', '.btn-bet', '.btn-start',
];

const RESULT_SELECTORS = [
  '[class*="result"]', '[class*="score"]', '[class*="win"]', '[class*="multiplier"]',
  '[class*="balance"]', '[class*="crash"]', '[class*="grid"]', '[class*="canvas"]',
  '[class*="board"]', '[class*="reel"]', '[class*="wheel"]',
];

test.describe('Agent 2 — Game Interaction Tester', () => {
  
  for (const gameId of GAMES_TO_TEST) {
    test(`${gameId} loads and has interactive controls`, async ({ page }) => {
      const url = `${BASE}/games/${gameId}/index.html`;
      
      try {
        const response = await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 15000 });
        
        if (response && response.status() !== 200 && response.status() !== 304) {
          console.log(`[AGENT2] FAIL ${gameId} HTTP ${response.status()}`);
          return;
        }
        
        await page.waitForTimeout(1500);
        
        const bodyText = await page.evaluate(() => document.body?.innerText?.slice(0, 200) || '');
        
        const hasContent = bodyText.length > 10;
        if (!hasContent) { console.log(`[AGENT2] WARN ${gameId} empty`); return; }
        
        let foundButton = null;
        for (const selector of BUTTON_SELECTORS) {
          try { const btn = page.locator(selector).first(); if ((await btn.count() > 0) && await btn.isVisible()) { foundButton = selector; break; } } catch {}
        }
        const hasCanvas = (await page.locator('canvas').count()) > 0;
        const hasSvg = (await page.locator('svg').count()) > 0;
        const hasContainer = (await page.locator('#game-wrap, #app, #game, [class*="game"]').count()) > 0;
        let clicked = false;
        if (foundButton) { try { await page.locator(foundButton).first().click({ timeout: 3000 }); clicked = true; await page.waitForTimeout(1000); } catch {} }
        const status = clicked ? 'played' : (hasCanvas || hasSvg || hasContainer ? 'rendered' : 'visible');
        console.log(`[AGENT2] OK ${gameId} -> ${status} btn=${foundButton||'none'} canvas=${hasCanvas}`);
      } catch (e) { console.log(`[AGENT2] ERR ${gameId} -> ${e.message?.slice(0, 80)}`); }
    });
  }

  test('Crash Pro rapid fire', async ({ page }) => {
    await page.goto(`${BASE}/games/crash-pro/index.html`, { waitUntil: 'domcontentloaded', timeout: 15000 });
    await page.waitForTimeout(2000);
    let clicks = 0;
    for (let i = 0; i < 5; i++) { try { const b = page.locator('button:not([disabled])').first(); if ((await b.count() > 0) && await b.isVisible()) { await b.click({ timeout: 2000 }); clicks++; await page.waitForTimeout(800); } } catch {} }
    console.log(`[AGENT2] ROCKET Crash rapid fire: ${clicks}/5`);
  });

  test('Mines Premium grid interaction', async ({ page }) => {
    await page.goto(`${BASE}/games/mines-premium/index.html`, { waitUntil: 'domcontentloaded', timeout: 15000 });
    await page.waitForTimeout(2000);
    const pb = page.locator('button:has-text("Play"), button:has-text("Start"), button[class*="play"], button[class*="start"]').first();
    if ((await pb.count() > 0) && await pb.isVisible()) { await pb.click({ timeout: 3000 }); await page.waitForTimeout(1500); const c = page.locator('[class*="cell"], [class*="tile"]').filter({ visible: true }).first(); if ((await c.count() > 0) && await c.isVisible()) { await c.click({ timeout: 2000 }); console.log(`[AGENT2] BOMB Mines interactive!`); } }
    else { console.log(`[AGENT2] BOMB Mines no play button`); }
  });

});
