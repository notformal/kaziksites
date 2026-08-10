// @ts-check
import { defineConfig, devices } from '@playwright/test';

/**
 * Multi-Agent Parallel QA Suite
 * 
 * 4 AI agents running in parallel:
 *   Agent 1 — Lobby & Catalog Smoke Test (3 brands)
 *   Agent 2 — Game Interaction Tester (35+ games)  
 *   Agent 3 — Live Games & Bot Integration
 *   Agent 4 — UI/UX Polish & Design Audit
 */
export default defineConfig({
  testDir: '.',

  timeout: 60_000,
  expect: { timeout: 10_000 },
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 0 : 1,
  workers: 4, // 4 parallel agents

  reporter: [
    ['list'],
    ['html', { outputFolder: 'test/playwright/report/agents-html', open: 'never' }],
    ['json', { outputFile: 'test/playwright/report/agents-results.json' }],
  ],

  use: {
    baseURL: 'http://127.0.0.1:5173',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    actionTimeout: 8_000,
    navigationTimeout: 20_000,
  },

  projects: [
    { name: 'agents-lobby', testMatch: '**/agent-lobby*' },
    { name: 'agents-games', testMatch: '**/agent-games*' },
    { name: 'agents-live', testMatch: '**/agent-live*' },
    { name: 'agents-ui', testMatch: '**/agent-ui*' },
    { name: 'agents-deep', testMatch: '**/agent-5-deep*' },
  ],

  // Start Vite dev server for frontend + API server in parallel
  webServer: [
    {
      command: 'cd platform && npx vite --host 127.0.0.1 --port 5173',
      port: 5173,
      reuseExistingServer: true,
      timeout: 30_000,
      stdout: 'pipe',
    },
    {
      command: 'cd server && node src/index.js',
      port: 8787,
      reuseExistingServer: !process.env.CI,
      timeout: 15_000,
      stdout: 'ignore',
      stderr: 'pipe',
    },
  ],
});
