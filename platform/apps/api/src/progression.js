// Virtual-credit player progression (VIP-style). Entertainment-only: XP is simply
// the total number of credits a player has wagered; there is no monetary value.
//
// Cumulative XP required to REACH level n is triangular: 1000 * n*(n-1)/2.
//   level 1 -> 0, level 2 -> 1000, level 3 -> 3000, level 4 -> 6000, ...
export const xpForLevel = (n) => (1000 * n * (n - 1)) / 2;

/** Highest level whose XP threshold is satisfied by `xp` (>= 1). */
export function levelFromXp(xp) {
  let n = 1;
  while (xpForLevel(n + 1) <= xp) n++;
  return n;
}

/** Cosmetic rank band for a level. */
export function rankOf(level) {
  if (level >= 40) return "Diamond";
  if (level >= 20) return "Platinum";
  if (level >= 10) return "Gold";
  if (level >= 5) return "Silver";
  return "Bronze";
}

/** Virtual credits granted for reaching `level` (claimed via the level-up bonus). */
export const levelUpReward = (level) => level * 100;

// Wager-based challenges (achievement-style). Each pays a one-off virtual reward
// when the player's lifetime wagered crosses the target.
export const CHALLENGES = [
  { id: "wager-1k", target: 1000, reward: 100 },
  { id: "wager-5k", target: 5000, reward: 400 },
  { id: "wager-25k", target: 25000, reward: 1500 },
];
