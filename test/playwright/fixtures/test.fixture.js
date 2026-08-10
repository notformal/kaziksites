// @ts-check
import { test as base } from '@playwright/test';

/**
 * Test Fixtures — Shared state and utilities for all tests
 */
export const test = base.extend({
  // Test user credentials (mock)
  async apiKey({ }, use) {
    await use('test-api-key-' + Date.now());
  },
  
  // Mock player session data
  async playerSession({ }, use) {
    const session = {
      id: `player_${Date.now()}`,
      token: 'mock-token-' + Math.random().toString(36).slice(2),
      balance: 10000, // 100.00 USD in cents
    };
    await use(session);
  },
  
  // API client helper for game tests
  async api({ baseURL }, use) {
    const http = await import('node:http');
    
    const get = async (path, headers = {}) => {
      const url = new URL(path, baseURL);
      return fetch(url.toString(), { headers });
    };
    
    const post = async (path, body, headers = {}) => {
      const url = new URL(path, baseURL);
      return fetch(url.toString(), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...headers },
        body: JSON.stringify(body),
      });
    };
    
    await use({ get, post });
  },
  
  // Server health check fixture
  async serverStatus({ baseURL }, use) {
    const check = async () => {
      try {
        const res = await fetch(`${baseURL}/health`);
        return res.ok && (await res.json()).ok;
      } catch {
        return false;
      }
    };
    
    await use(check);
  },
});

export { expect } from '@playwright/test';
