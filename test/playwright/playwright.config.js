// @ts-check
import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright Configuration — Professional QA Suite
 * 
 * Tests all 8 instant games + live dealer games with full API verification,
 * visual regression checks, and game logic validation.
 */
export default defineConfig({
  testDir: './test/playwright/tests',
  
  // Timeout settings for different operation types
  timeout: 30_000,          // Global test timeout
  expect: {
    timeout: 5000,          // Assertion timeout
  },
  
  // Fail build on CI if there are lingering test warnings
  forbidOnly: !!process.env.CI,
  
  // Retry flaky tests up to 2 times (not on CI)
  retries: process.env.CI ? 0 : 1,
  
  // Parallelism — run tests in parallel across workers
  workers: process.env.CI ? 1 : undefined,
  
  // Reporter configuration
  reporter: [
    ['html', { outputFolder: 'test/playwright/report/html' }],
    ['json', { outputFile: 'test/playwright/report/results.json' }],
    ['list'],  // Live terminal output
  ],
  
  use: {
    // Base URL for all tests
    baseURL: 'http://127.0.0.1:8787',
    
    // Collect trace on failure
    trace: 'retain-on-failure',
    
    // Screenshot on failure
    screenshot: 'only-on-failure',
    
    // Video on failure
    video: 'retain-on-failure',
    
    // Actionability checks
    actionTimeout: 5_000,
    navigationTimeout: 10_000,
  },
  
  projects: [
    {
      name: 'api-instant-games',
      testMatch: /api\.instant\.spec\.js/,
      grepInvert: /@visual/,  // Skip visual tests in API suite
    },
    {
      name: 'live-games-api',
      testMatch: /api\.live\.spec\.js/,
    },
    {
      name: 'game-logic',
      testMatch: /gamespec\.js/,
    },
    {
      name: 'visual-regression',
      testMatch: /visual\.spec\.js/,
      grep: /@visual/,
    },
  ],
  
  // Web server setup — start API server for tests
  webServer: {
    command: 'cd server && node src/index.js',
    port: 8787,
    reuseExistingServer: !process.env.CI,
    timeout: 30_000,
    stdout: 'pipe',
    stderr: 'pipe',
  },
});
