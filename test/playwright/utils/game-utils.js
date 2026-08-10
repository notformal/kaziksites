// @ts-check
/**
 * Game API Test Utilities — Helper functions for API testing
 */

const BASE_URL = 'http://127.0.0.1:8787';

/**
 * Generate ProvablyFair test data
 */
export function generateProvablyFairData() {
  return {
    serverSeed: Math.random().toString(36).slice(2),
    clientSeed: Math.random().toString(36).slice(2),
    nonce: Math.floor(Math.random() * 1000000),
  };
}

/**
 * Validate game result structure
 */
export function validateGameResult(result, gameId) {
  const required = ['gameId', 'win'];
  for (const field of required) {
    if (!(field in result)) {
      throw new Error(`Missing required field: ${field}`);
    }
  }
  
  if (result.gameId !== gameId) {
    throw new Error(`Expected gameId ${gameId}, got ${result.gameId}`);
  }
  
  if (typeof result.win !== 'number') {
    throw new Error('win must be a number');
  }
  
  return true;
}

/**
 * Validate provably fair response
 */
export function validateProvablyFair(response) {
  const pf = response.provablyFair || {};
  if (!pf.serverSeed && !pf.hash) {
    throw new Error('Missing server seed or hash');
  }
  return true;
}

/**
 * Calculate expected crash point for validation
 */
export function calculateCrashPoint(serverSeed, clientSeed, nonce, houseEdge = 0.04) {
  const crypto = require('crypto');
  const hash = crypto.createHash('sha256')
    .update(`${serverSeed}:${clientSeed}:${nonce}`)
    .digest('hex');
  const value = parseInt(hash.slice(0, 8), 16) / 0xffffffff;
  return Math.max(1, Math.floor((1 - houseEdge) / (1 - value) * 100) / 100);
}

/**
 * Wait for server to be ready
 */
export async function waitForServer(baseURL = BASE_URL, timeout = 30000) {
  const start = Date.now();
  while (Date.now() - start < timeout) {
    try {
      const res = await fetch(`${baseURL}/health`);
      if (res.ok) return true;
    } catch {}
    await new Promise(r => setTimeout(r, 500));
  }
  throw new Error('Server not ready');
}
