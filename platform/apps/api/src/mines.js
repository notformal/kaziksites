// Provably-fair Mines engine (pure). A 5x5 grid (25 tiles); `mines` of them are
// mines. Mine positions are a deterministic Fisher-Yates shuffle seeded by an
// HMAC of the server seed — verifiable once the server seed is revealed.
import { createHmac } from "node:crypto";

export const TILES = 25;

function byteStream(serverSeed, clientSeed, nonce, needed) {
  const out = [];
  for (let block = 0; out.length < needed; block++) {
    const h = createHmac("sha256", serverSeed).update(`${clientSeed}:${nonce}:mines:${block}`).digest();
    for (const b of h) out.push(b);
  }
  return out;
}

/** Deterministic sorted array of mine tile indices (0..24). */
export function minePositions(serverSeed, clientSeed, nonce, mineCount) {
  const tiles = Array.from({ length: TILES }, (_, i) => i);
  const bytes = byteStream(serverSeed, clientSeed, nonce, TILES * 4);
  let p = 0;
  const nextInt = (max) => {
    const v = ((bytes[p] << 24) | (bytes[p + 1] << 16) | (bytes[p + 2] << 8) | bytes[p + 3]) >>> 0;
    p += 4;
    return v % max;
  };
  for (let i = tiles.length - 1; i > 0; i--) {
    const j = nextInt(i + 1);
    [tiles[i], tiles[j]] = [tiles[j], tiles[i]];
  }
  return tiles.slice(0, mineCount).sort((a, b) => a - b);
}

/** Fair cashout multiplier after `revealed` safe tiles with `mines` mines (1% edge). */
export function mineMultiplier(revealed, mines) {
  let m = 0.99;
  for (let i = 0; i < revealed; i++) m *= (TILES - i) / (TILES - mines - i);
  return m;
}

/** Payout multiplier in milli (×1000), matching the wallet's fixed-point convention. */
export const mineMultiplierMilli = (revealed, mines) => Math.round(mineMultiplier(revealed, mines) * 1000);
