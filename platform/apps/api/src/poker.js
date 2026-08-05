// Pure poker hand evaluation. Cards are {rank:1..13, suit:0..3} (Ace = rank 1,
// scored high = 14, and low only for the A-2-3-4-5 wheel).
import { createHmac } from "node:crypto";

/** Deterministic single-deck Fisher-Yates shuffle from the committed server seed.
 *  `tag` namespaces the stream so different games get independent shuffles. */
export function shuffledDeck(serverSeed, clientSeed, nonce, tag = "holdem") {
  const deck = Array.from({ length: 52 }, (_, i) => ({ rank: (i >> 2) + 1, suit: i & 3 }));
  const bytes = [];
  for (let b = 0; bytes.length < 52 * 4; b++) {
    const h = createHmac("sha256", serverSeed).update(`${clientSeed}:${nonce}:${tag}:${b}`).digest();
    for (const x of h) bytes.push(x);
  }
  let p = 0;
  const nextInt = (max) => {
    const v = ((bytes[p] << 24) | (bytes[p + 1] << 16) | (bytes[p + 2] << 8) | bytes[p + 3]) >>> 0;
    p += 4;
    return v % max;
  };
  for (let i = 51; i > 0; i--) { const j = nextInt(i + 1); [deck[i], deck[j]] = [deck[j], deck[i]]; }
  return deck;
}

export const CATEGORIES = [
  "high-card", "pair", "two-pair", "three-kind", "straight",
  "flush", "full-house", "four-kind", "straight-flush",
];

const pr = (card) => (card.rank === 1 ? 14 : card.rank); // poker rank

/** Evaluate exactly 5 cards → { category:0..8, tiebreak:[...] } (higher is better). */
export function evaluate5(cards) {
  const ranks = cards.map(pr).sort((a, b) => b - a);
  const flush = cards.every((c) => c.suit === cards[0].suit);
  const counts = {};
  for (const r of ranks) counts[r] = (counts[r] || 0) + 1;
  const groups = Object.entries(counts)
    .map(([r, c]) => [c, Number(r)])
    .sort((a, b) => b[0] - a[0] || b[1] - a[1]); // by count desc, then rank desc
  const pattern = groups.map((g) => g[0]).join("");
  const tiebreak = groups.map((g) => g[1]);

  const uniq = [...new Set(ranks)];
  let straightHigh = 0;
  if (uniq.length === 5) {
    if (uniq[0] - uniq[4] === 4) straightHigh = uniq[0];
    else if (uniq.join(",") === "14,5,4,3,2") straightHigh = 5; // wheel
  }

  if (straightHigh && flush) return { category: 8, tiebreak: [straightHigh] };
  if (pattern === "41") return { category: 7, tiebreak };
  if (pattern === "32") return { category: 6, tiebreak };
  if (flush) return { category: 5, tiebreak: ranks };
  if (straightHigh) return { category: 4, tiebreak: [straightHigh] };
  if (pattern === "311") return { category: 3, tiebreak };
  if (pattern === "221") return { category: 2, tiebreak };
  if (pattern === "2111") return { category: 1, tiebreak };
  return { category: 0, tiebreak: ranks };
}

const score = (h) => [h.category, ...h.tiebreak];

/** >0 if a beats b, <0 if b beats a, 0 tie. */
export function compare(a, b) {
  const sa = score(a), sb = score(b);
  for (let i = 0; i < Math.max(sa.length, sb.length); i++) {
    const d = (sa[i] || 0) - (sb[i] || 0);
    if (d) return d;
  }
  return 0;
}

/** Best 5-card hand out of 7 (2 hole + 5 community). */
export function best5of7(cards) {
  let best = null;
  for (let a = 0; a < cards.length; a++)
    for (let b = a + 1; b < cards.length; b++) {
      const five = cards.filter((_, i) => i !== a && i !== b);
      const h = evaluate5(five);
      if (!best || compare(h, best) > 0) best = h;
    }
  return best;
}

/** Casino Hold'em ante paytable multiplier (the ":1" part). */
export function anteOdds(hand) {
  if (hand.category === 8) return hand.tiebreak[0] === 14 ? 100 : 20; // royal vs straight flush
  if (hand.category === 7) return 10;
  if (hand.category === 6) return 3;
  if (hand.category === 5) return 2;
  return 1;
}

/** Casino Hold'em dealer qualifies with a pair of 4s or better. */
export function qualifies(hand) {
  if (hand.category >= 2) return true;
  if (hand.category === 1) return hand.tiebreak[0] >= 4;
  return false;
}

/** Jacks-or-Better 9/6 return multiplier (win = bet × payout). */
export function videoPokerPayout(hand) {
  if (hand.category === 8) return hand.tiebreak[0] === 14 ? 250 : 50; // royal / straight flush
  if (hand.category === 7) return 25; // four of a kind
  if (hand.category === 6) return 9; // full house
  if (hand.category === 5) return 6; // flush
  if (hand.category === 4) return 4; // straight
  if (hand.category === 3) return 3; // three of a kind
  if (hand.category === 2) return 2; // two pair
  if (hand.category === 1 && hand.tiebreak[0] >= 11) return 1; // jacks or better
  return 0;
}
