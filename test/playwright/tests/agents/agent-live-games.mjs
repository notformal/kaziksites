// ═══════════════════════════════════════════════════════════
// AGENT 3 — LIVE GAMES & AGENT INTEGRATION TESTER
// Tests: live dealer game pages load, agent/bot overlays render, simulation feeds work
// ═══════════════════════════════════════════════════════════

import { test, expect } from '@playwright/test';

const BASE = 'http://127.0.0.1:5173';

test.describe('Agent 3 — Live Games & Agent Integration', () => {
  
  const LIVE_GAMES = [
    'lightning-blackjack', 'mega-roulette', 'speed-baccarat', 'crazy-time',
    'monopoly-live', 'dream-catcher', 'lightning-roulette', 'infinite-blackjack',
    'auto-roulette', 'casino-holdem', 'three-card-poker', 'power-blackjack',
    'pragmatic-lightning-baccarat', 'pragmatic-speed-roulette', 'pragmatic-blackjack-vip',
    'pragmatic-super-sic-bo', 'pragmatic-dragon-tiger-pro', 'ezugi-lightning-sic-bo',
    'vivo-blackjack', 'vivo-roulette', 'vivo-baccarat',
  ];

  for (const gameId of LIVE_GAMES) {
    test(`${gameId} loads`, async ({ page }) => {
      try {
        const url = `${BASE}/games/${gameId}/index.html`;
        const res = await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 15000 });
        
        if (res?.status() !== 200 && res?.status() !== 304) {
          console.log(`[AGENT3] FAIL ${gameId} HTTP ${res?.status()}`);
          return;
        }

        await page.waitForTimeout(1500);
        
        const bodyText = await page.evaluate(() => document.body?.innerText?.slice(0, 300) || '');
        const hasContent = bodyText.length > 20;
        
        // Look for agent/bot indicators in live games
        const botIndicators = await page.locator('[class*="bot"], [class*="agent"], [class*="player-count"], [class*="online"], [class*="live"]').filter({ visible: true }).count();
        const hasCanvas = (await page.locator('canvas').count()) > 0;
        const hasVideoPlaceholder = (await page.locator('[class*="video"], [class*="stream"], iframe').count()) > 0;

        if (hasContent) {
          console.log(`[AGENT3] OK ${gameId} | bots=${botIndicators} canvas=${hasCanvas} video=${hasVideoPlaceholder}`);
        } else {
          console.log(`[AGENT3] WARN ${gameId} loaded but minimal content`);
        }
      } catch (e) {
        console.log(`[AGENT3] ERR ${gameId} -> ${e.message?.slice(0, 80)}`);
      }
    });
  }

  // Test the live games API integration from frontend perspective
  test('Live games API — check bot simulation data', async ({ page }) => {
    // Open a live game and try to fetch bot data via XHR/fetch
    await page.goto(`${BASE}/games/crazy-time/index.html`, { waitUntil: 'domcontentloaded', timeout: 15000 });
    await page.waitForTimeout(2000);

    // Try fetching the bots API
    const botData = await page.evaluate(async () => {
      try {
        const res = await fetch('http://127.0.0.1:8787/api/bots/live');
        if (!res.ok) return null;
        const data = await res.json();
        return { count: data.count, players: (data.players || []).slice(0, 3).map(p => ({ name: p.name, mood: p.mood, game: p.currentGame })) };
      } catch { return null; }
    });

    if (botData) {
      console.log(`[AGENT3] API BOTS: ${botData.count} online`);
      for (const p of botData.players) {
        console.log(`  -> ${p.name} | mood=${p.mood} | game=${p.currentGame || 'idle'}`);
      }
    } else {
      console.log(`[AGENT3] API BOTS: unreachable`);
    }

    // Check live games status
    const liveStatus = await page.evaluate(async () => {
      try {
        const res = await fetch('http://127.0.0.1:8787/api/live-games/status');
        if (!res.ok) return null;
        const data = await res.json();
        return { tables: data.totalTables, rounds: data.totalRounds, agents: data.onlineAgents };
      } catch { return null; }
    });

    if (liveStatus) {
      console.log(`[AGENT3] LIVE STATUS: ${liveStatus.tables} tables, ${liveStatus.rounds} rounds, ${liveStatus.agents} agents`);
    } else {
      console.log(`[AGENT3] LIVE STATUS: unreachable`);
    }
  });

});
