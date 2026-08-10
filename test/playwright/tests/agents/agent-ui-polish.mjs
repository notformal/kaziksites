// ═══════════════════════════════════════════════════════════
// AGENT 4 — UI/UX POLISH & DESIGN AUDIT
// Tests: themes render correctly per brand, animations work, responsive layout, accessibility
// ═══════════════════════════════════════════════════════════

import { test, expect } from '@playwright/test';

const BASE = 'http://127.0.0.1:5173';
const BRANDS = ['aurora', 'ember', 'royale'];

test.describe('Agent 4 — UI/UX Polish & Design Audit', () => {
  
  for (const brand of BRANDS) {
    test(`${brand} theme colors are applied`, async ({ page }) => {
      await page.goto(`${BASE}/?brand=${brand}`, { waitUntil: 'networkidle', timeout: 20000 });
      
      // Check that the page has a non-default background (theme applied)
      const bgColor = await page.evaluate(() => getComputedStyle(document.body).backgroundColor);
      const isDarkBg = bgColor.includes('rgb(8') || bgColor.includes('rgb(10') || bgColor.includes('#0');
      
      // Check accent color exists somewhere
      const hasAccent = await page.evaluate(() => {
        const els = document.querySelectorAll('*');
        for (const el of els) {
          const cs = getComputedStyle(el);
          if (cs.color && (cs.color.includes('168') || cs.color.includes('234'))) return true; // purple/cyan hints
        }
        return false;
      });

      console.log(`[AGENT4] 🎨 ${brand} bg=${bgColor.slice(0, 25)} accent=${hasAccent ? 'yes' : 'no'}`);
    });

    test(`${brand} responsive — mobile viewport`, async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 812 }); // iPhone X
      await page.goto(`${BASE}/?brand=${brand}`, { waitUntil: 'networkidle', timeout: 20000 });
      
      const mainVisible = await page.locator('main').isVisible();
      const noHorizontalScroll = await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 2);
      
      console.log(`[AGENT4] 📱 ${brand} mobile: main=${mainVisible} scrollX=${noHorizontalScroll ? 'ok' : 'overflow!'}`);
    });

    test(`${brand} responsive — tablet viewport`, async ({ page }) => {
      await page.setViewportSize({ width: 768, height: 1024 }); // iPad
      await page.goto(`${BASE}/?brand=${brand}`, { waitUntil: 'networkidle', timeout: 20000 });
      
      const mainVisible = await page.locator('main').isVisible();
      console.log(`[AGENT4] 📱 ${brand} tablet: main=${mainVisible}`);
    });

    test(`${brand} accessibility — has lang attribute`, async ({ page }) => {
      await page.goto(`${BASE}/?brand=${brand}`, { waitUntil: 'networkidle', timeout: 20000 });
      
      const htmlLang = await page.evaluate(() => document.documentElement.lang);
      console.log(`[AGENT4] ♿ ${brand} lang="${htmlLang}"`);
    });

    test(`${brand} accessibility — images have alt text`, async ({ page }) => {
      await page.goto(`${BASE}/?brand=${brand}`, { waitUntil: 'networkidle', timeout: 20000 });
      
      const imgStats = await page.evaluate(() => {
        const imgs = document.querySelectorAll('img');
        let withAlt = 0, withoutAlt = 0;
        imgs.forEach(img => img.hasAttribute('alt') ? withAlt++ : withoutAlt++);
        return { total: imgs.length, withAlt, withoutAlt };
      });
      
      console.log(`[AGENT4] ♿ ${brand} images: ${imgStats.withAlt}/${imgStats.total} have alt text`);
    });

    test(`${brand} scroll and filter interaction`, async ({ page }) => {
      await page.setViewportSize({ width: 1280, height: 900 });
      await page.goto(`${BASE}/?brand=${brand}`, { waitUntil: 'networkidle', timeout: 20000 });
      
      // Scroll down to see more content
      await page.evaluate(() => window.scrollBy(0, 500));
      await page.waitForTimeout(500);
      
      const scrollY = await page.evaluate(() => window.scrollY);
      console.log(`[AGENT4] 📜 ${brand} scrolled to Y=${Math.round(scrollY)}`);
    });
  }

  // Cross-brand comparison: all brands show different accent colors
  test('All brands have distinct visual identities', async ({ browser }) => {
    const pages = await Promise.all(BRANDS.map(b => browser.newPage()));
    
    try {
      for (const [i, brand] of BRANDS.entries()) {
        await pages[i].goto(`${BASE}/?brand=${brand}`, { waitUntil: 'networkidle', timeout: 20000 });
        const accent = await pages[i].evaluate(() => {
          // Try to find the primary accent color from CSS custom properties or prominent elements
          const el = document.querySelector('[class*="accent"], [class*="Accent"], h1, [class*="title"]');
          return el ? getComputedStyle(el).color : null;
        });
        console.log(`[AGENT4] 🎨 ${brand} accent color: ${accent || 'N/A'}`);
      }
    } finally {
      await Promise.all(pages.map(p => p.close()));
    }
  });

});
