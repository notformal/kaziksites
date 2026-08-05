// Provably-fair Hi-Lo engine (pure). Each card is an independent uniform draw
// derived from the server seed; verifiable once the seed is revealed.
import { createHmac } from "node:crypto";

export const RANKS = 13; // 1..13 = A..K

/** Deterministic card at a given step index: { rank: 1..13, suit: 0..3 }. */
export function cardAt(serverSeed, clientSeed, nonce, index) {
  const h = createHmac("sha256", serverSeed).update(`${clientSeed}:${nonce}:hilo:${index}`).digest();
  const v = ((h[0] << 24) | (h[1] << 16) | (h[2] << 8) | h[3]) >>> 0;
  return { rank: (v % RANKS) + 1, suit: h[4] % 4 };
}

/** Win probability of a guess at the current rank. `hi` = higher-or-same, `lo` = lower-or-same. */
export function winProbability(currentRank, direction) {
  return direction === "hi" ? (RANKS + 1 - currentRank) / RANKS : currentRank / RANKS;
}

/** Per-step payout multiplier in milli (×1000), a 1% house edge over the win probability. */
export const stepMultiplierMilli = (currentRank, direction) =>
  Math.round((0.99 / winProbability(currentRank, direction)) * 1000);

/** Did the next card win the guess? Ties win for both directions (Hi-Lo convention). */
export const isWin = (nextRank, currentRank, direction) =>
  direction === "hi" ? nextRank >= currentRank : nextRank <= currentRank;
