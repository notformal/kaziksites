// Pure Blackjack engine. Cards derived from the committed server seed.
import { createHmac } from "node:crypto";

export function cardAt(serverSeed, clientSeed, nonce, index) {
  const h = createHmac("sha256", serverSeed).update(`${clientSeed}:${nonce}:bj:${index}`).digest();
  const v = ((h[0] << 24) | (h[1] << 16) | (h[2] << 8) | h[3]) >>> 0;
  return { rank: (v % 13) + 1, suit: h[4] % 4 };
}

export const cardValue = (rank) => (rank === 1 ? 11 : rank >= 10 ? 10 : rank);

/** Best hand total (aces demote 11→1 to avoid busting) plus whether an ace is still soft. */
export function handValue(cards) {
  let total = 0, aces = 0;
  for (const c of cards) { total += cardValue(c.rank); if (c.rank === 1) aces++; }
  while (total > 21 && aces > 0) { total -= 10; aces--; }
  return { total, soft: aces > 0 };
}

export const isBlackjack = (cards) => cards.length === 2 && handValue(cards).total === 21;

/** Dealer stands on all 17 (S17). */
export const dealerShouldHit = (cards) => handValue(cards).total < 17;

/** Terminal result of a finished hand from the player's perspective. */
export function resolve(player, dealer) {
  const pt = handValue(player).total, dt = handValue(dealer).total;
  if (pt > 21) return "lost";
  if (dt > 21) return "won";
  return pt > dt ? "won" : pt < dt ? "lost" : "push";
}
