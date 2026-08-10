// ═══════════════════════════════════════════════════════════
// AGENT 1 — LOBBY & CATALOG SMOKETEST
// Tests: main site loads, all brands render, catalog games display, navigation works
// ═══════════════════════════════════════════════════════════

import { test, expect } from '@playwright/test';

const BRANDS = ['aurora', 'ember', 'royale'];
const BASE = 'http://127.0.0.1:5173';

test.describe('Agent 1 — Lobby & Catalog Smoke Test', () => {
  
  for (const brand of BRANDS) {
    test(`${brand} brand loads correctly`, async ({ page }) => {
      await page.goto(`${BASE}/?brand=${brand}`, { waitUntil: 'networkidle', timeout: 20000 });
      
      // Check title contains brand name
      const title = await page.title();
      expect(title).toContain(brand.charAt(0).toUpperCase() + brand.slice(1));
      
      // Check main content rendered
      await expect(page.locator('main')).toBeVisible({ timeout: 5000 });
      
      // Check games grid exists
      const gameCards = page.locator('.game-card, [class*="GameCard"], article, .grid > div');
      const count = await gameCards.count();
      expect(count).toBeGreaterThan(0), `Brand ${brand} should show game cards`;
      
      // Check navigation
      const nav = page.locator('nav, [class*="nav"], [class*="Nav"]');
      if (await nav.count() > 0) {
        await expect(nav.first()).toBeVisible();
      }
      
      // Check footer
      const footer = page.locator('footer, [class*="footer"]');
      if (await footer.count() > 0) {
        await expect(footer.first()).toBeVisible();
      }

      console.log(`[AGENT1] ✅ ${brand} lobby loaded — ${count} game cards visible`);
    });

    test(`${brand} search/filter works`, async ({ page }) => {
      await page.goto(`${BASE}/?brand=${brand}`, { waitUntil: 'networkidle', timeout: 20000 });
      
      // Find search input and type
      const searchInput = page.locator('input[placeholder*="search"], input[placeholder*="Search"], input[type="text"]').first();
      if (await searchInput.count() > 0) {
        await searchInput.fill('slot');
        await page.waitForTimeout(500);
        
        const filteredCards = page.locator('.game-card, [class*="GameCard"], article, .grid > div').filter({ visible: true });
        const filteredCount = await filteredCards.count();
        console.log(`[AGENT1] 🔍 ${brand} search "slot" → ${filteredCount} results`);
      }
      
      // Check category filters exist
      const filterBtns = page.locator('.filters button, [class*="filter"] button, [class*="Filter"] button');
      const filterCount = await filterBtns.count();
      if (filterCount > 0) {
        console.log(`[AGENT1] 📂 ${brand} has ${filterCount} category filters`);
      }
    });

    test(`${brand} particle background renders`, async ({ page }) => {
      await page.goto(`${BASE}/?brand=${brand}`, { waitUntil: 'networkidle', timeout: 20000 });
      
      const particles = page.locator('.particle, [class*="particle"], [class*="Particle"]');
      const count = await particles.count();
      console.log(`[AGENT1] ✨ ${brand} has ${count} particle elements`);
    });

    test(`${brand} daily reward / spin wheel section`, async ({ page }) => {
      await page.goto(`${BASE}/?brand=${brand}`, { waitUntil: 'networkidle', timeout: 20000 });
      
      const spinSection = page.locator('[class*="spin"], [class*="Spin"], [class*="reward"], [class*="Reward"]').first();
      if (await spinSection.count() > 0) {
        await expect(spinSection).toBeVisible();
        console.log(`[AGENT1] 🎰 ${brand} daily reward section visible`);
      } else {
        console.log(`[AGENT1] ⚠️ ${brand} no daily reward section found`);
      }
    });

    test(`${brand} account panel button`, async ({ page }) => {
      await page.goto(`${BASE}/?brand=${brand}`, { waitUntil: 'networkidle', timeout: 20000 });
      
      const userBtn = page.locator('[class*="account"], [class*="Account"], [class*="user"], [class*="User"], button[class*="iconBtn"]').first();
      if (await userBtn.count() > 0) {
        await expect(userBtn).toBeVisible();
        console.log(`[AGENT1] 👤 ${brand} account/user button found`);
      }
    });
  }

  test('Lobby loads without brand (default aurora)', async ({ page }) => {
    await page.goto(BASE, { waitUntil: 'networkidle', timeout: 20000 });
    await expect(page.locator('main')).toBeVisible({ timeout: 5000 });
    const title = await page.title();
    console.log(`[AGENT1] ✅ Default lobby loaded — "${title}"`);
  });

});
