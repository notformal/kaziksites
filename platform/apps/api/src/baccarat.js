// Pure Baccarat resolver implementing the standard third-card ("tableau") rules.
// `cards` is a sequence of {rank:1..13, suit:0..3}; at least 6 are consumed in the
// worst case. Deal order: Player1, Banker1, Player2, Banker2, [Player3], [Banker3].
export const bacValue = (rank) => (rank >= 10 ? 0 : rank); // 10/J/Q/K = 0, A = 1

export function baccaratResult(cards) {
  let i = 0;
  const next = () => cards[i++];
  const p1 = next(), b1 = next(), p2 = next(), b2 = next();
  const player = [p1, p2], banker = [b1, b2];
  const total = (hand) => hand.reduce((s, c) => s + bacValue(c.rank), 0) % 10;
  let pt = total(player), bt = total(banker), p3 = null;

  if (pt < 8 && bt < 8) {
    // Not a natural — apply the drawing rules.
    if (pt <= 5) { p3 = next(); player.push(p3); pt = total(player); }
    let bankerDraws;
    if (p3 === null) {
      bankerDraws = bt <= 5;
    } else {
      const v = bacValue(p3.rank);
      bankerDraws =
        bt <= 2 ||
        (bt === 3 && v !== 8) ||
        (bt === 4 && v >= 2 && v <= 7) ||
        (bt === 5 && v >= 4 && v <= 7) ||
        (bt === 6 && v >= 6 && v <= 7);
    }
    if (bankerDraws) { banker.push(next()); bt = total(banker); }
  }
  const result = pt > bt ? "player" : bt > pt ? "banker" : "tie";
  return { playerCards: player, bankerCards: banker, playerTotal: pt, bankerTotal: bt, result };
}
