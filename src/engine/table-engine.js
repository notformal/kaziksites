/**
 * table-engine.js - Dedicated Table Games Engine
 * 
 * Full implementations for:
 *   - Blackjack Pro (6-deck, S17, 3:2 BJ, Perfect Pairs, 21+3)
 *   - Baccarat Pro (8-deck, third-card rule, 5% commission, roadmaps)
 *   - Roulette Royale (European single-zero, racetrack, hot/cold stats)
 */

import crypto from 'node:crypto';

const SUITS = ['spades','hearts','diamonds','clubs'];
const RANKS = ['2','3','4','5','6','7','8','9','10','J','Q','K','A'];
const CARD_VALUES = {'2':2,'3':3,'4':4,'5':5,'6':6,'7':7,'8':8,'9':9,'10':10,'J':10,'Q':10,'K':10,'A':11};

function createShoe(decks) {
  const cards = [];
  for (let d = 0; d < decks; d++) {
    for (const suit of SUITS) {
      for (const rank of RANKS) {
        cards.push({ suit, rank, value: CARD_VALUES[rank] });
      }
    }
  }
  for (let i = cards.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [cards[i], cards[j]] = [cards[j], cards[i]];
  }
  return cards;
}

function cardValue(hand) {
  let total = 0, aces = 0;
  for (const c of hand) { total += c.value; if (c.rank === 'A') aces++; }
  while (total > 21 && aces > 0) { total -= 10; aces--; }
  return total;
}

function isBlackjack(hand) { return hand.length === 2 && cardValue(hand) === 21; }

export class BlackjackEngine {
  constructor(config = {}) {
    this.decks = config.decks || 6;
    this.dealerStandsOn17 = config.dealerStandsOn17 !== false;
    this.shoe = [];
    this.cutCard = Math.floor(this.decks * 52 * 0.75);
    this.resetShoe();
  }

  resetShoe() { this.shoe = createShoe(this.decks); }

  dealHand(playerBets, sideBets = {}) {
    if (this.shoe.length < 10) this.resetShoe();
    const playerHand = [this.drawCard(), this.drawCard()];
    const dealerUp = this.drawCard();
    const dealerDown = this.drawCard();
    const dealerHand = [dealerUp, dealerDown];

    const result = {
      playerHand: playerHand.map(c => ({ ...c, hidden: false })),
      dealerHand: [{ ...dealerUp, hidden: false }, { ...dealerDown, hidden: true }],
      playerValue: cardValue(playerHand),
      bet: playerBets.main || 0,
      sideBets: {},
    };

    if (isBlackjack(playerHand)) {
      if (isBlackjack(dealerHand)) {
        result.outcome = 'push'; result.payout = playerBets.main;
        result.playerValue = 21; result.dealerValue = 21; result.revealDealer = true;
      } else {
        result.outcome = 'blackjack'; result.payout = Math.round(playerBets.main * 2.5);
        result.playerValue = 21; result.dealerValue = cardValue(dealerHand); result.revealDealer = true;
      }
    }

    if (sideBets.perfectPairs !== undefined) {
      const ppPayout = this.evaluatePerfectPairs(playerHand, sideBets.perfectPairs);
      result.sideBets.perfectPairs = ppPayout;
    }
    if (sideBets.twentyThree !== undefined) {
      const t23Payout = this.evaluateTwentyThree([...playerHand, dealerUp], sideBets.twentyThree);
      result.sideBets.twentyThree = t23Payout;
    }
    return result;
  }

  hit(playerHand) {
    playerHand.push(this.drawCard());
    const value = cardValue(playerHand);
    if (value > 21) return { busted: true, hand: playerHand.map(c => ({ ...c, hidden: false })), value };
    return { busted: false, hand: playerHand.map(c => ({ ...c, hidden: false })), value };
  }

  stand(dealerHand) {
    while (cardValue(dealerHand) < (this.dealerStandsOn17 ? 17 : 16)) dealerHand.push(this.drawCard());
    const pv = cardValue(dealerHand);
    return { hand: dealerHand.map(c => ({ ...c, hidden: false })), value: pv, busted: pv > 21 };
  }

  evaluatePerfectPairs(hand, bet) {
    if (hand.length < 2) return { payout: -bet, result: 'no_pair' };
    const [c1, c2] = hand;
    if (c1.rank === c2.rank && c1.suit === c2.suit) return { payout: bet * 25, result: 'perfect_pair' };
    if (c1.rank === c2.rank) return { payout: bet * 10, result: 'colored_pair' };
    return { payout: -bet, result: 'no_pair' };
  }

  evaluateTwentyThree(playerCards, bet) {
    const values = playerCards.map(c => c.value);
    if (values.includes(11) && values.filter(v => v === 10).length >= 2) return { payout: bet * 100, result: 'suited_triple' };
    if (new Set(values).size === 1) return { payout: bet * 30, result: 'matched_triplet' };
    if (values.every(v => [10, 11].includes(v))) return { payout: bet * 9, result: 'flush_21' };
    if (values.reduce((a,b) => a+b, 0) === 21 && new Set(values).size === values.length) return { payout: bet * 8, result: 'straight_21' };
    return { payout: -bet, result: 'no_win' };
  }

  drawCard() { return this.shoe.pop(); }
}


export class BaccaratEngine {
  constructor(config = {}) {
    this.decks = config.decks || 8;
    this.commission = config.commission || 0.05;
    this.shoe = [];
    this.history = [];
    this.resetShoe();
  }

  resetShoe() { this.shoe = createShoe(this.decks); }

  getCardValue(card) {
    if (['10','J','Q','K'].includes(card.rank)) return 0;
    if (card.rank === 'A') return 1;
    return parseInt(card.rank);
  }

  handTotal(cards) { return this.getCardValue(cards[0]) + this.getCardValue(cards[1]); }

  drawThirdCard(hand, playerDrawn) {
    const total = this.handTotal(hand);
    if (total >= 8) return null;
    if (!playerDrawn) return null;
    const ptv = this.getCardValue(playerDrawn);
    let shouldDraw = false;
    if (total <= 2) shouldDraw = true;
    else if (total === 3 && ptv !== 8) shouldDraw = true;
    else if (total === 4 && [2,3,4,5,6,7].includes(ptv)) shouldDraw = true;
    else if (total === 5 && [4,5,6,7].includes(ptv)) shouldDraw = true;
    else if (total === 6 && [6,7].includes(ptv)) shouldDraw = true;
    return shouldDraw ? this.drawCard() : null;
  }

  dealHand(bets = {}) {
    if (this.shoe.length < 10) this.resetShoe();
    const playerHand = [this.drawCard(), this.drawCard()];
    const bankerHand = [this.drawCard(), this.drawCard()];
    let playerThird = null;
    const pt = this.handTotal(playerHand);
    if (pt <= 5) { playerThird = this.drawCard(); playerHand.push(playerThird); }
    const bt = this.handTotal(bankerHand);
    if (bt <= 2 || (playerThird && bt >= 3 && bt <= 6)) {
      const b3 = this.drawThirdCard(bankerHand, playerThird);
      if (b3) bankerHand.push(b3);
    }

    const pTotal = this.handTotal(playerHand) % 10;
    const bTotal = this.handTotal(bankerHand) % 10;
    let outcome = 'tie';
    if (pTotal > bTotal) outcome = 'player';
    else if (bTotal > pTotal) outcome = 'banker';

    const payouts = {};
    if (bets.player) payouts.player = outcome === 'player' ? bets.player * 2 : 0;
    if (bets.banker) payouts.banker = outcome === 'banker' ? Math.round(bets.banker * (1 + 1 - this.commission)) : 0;
    if (bets.tie) payouts.tie = outcome === 'tie' ? bets.tie * 9 : 0;

    this.history.push(outcome);
    return {
      playerHand: playerHand.map(c => ({ ...c, hidden: false })),
      bankerHand: bankerHand.map(c => ({ ...c, hidden: false })),
      playerTotal: pTotal, bankerTotal: bTotal, outcome, payouts, playerThirdCard: playerThird || null,
    };
  }

  drawCard() { return this.shoe.pop(); }

  getRoadmaps() {
    const beadPlate = this.history.slice(-30).map(h => h === 'player' ? 'P' : h === 'banker' ? 'B' : 'T');
    return { beadPlate, recent: this.history.slice(-10) };
  }
}


export class RouletteEngine {
  constructor(config = {}) {
    this.type = config.type || 'european';
    this.numbers = [0,32,15,19,4,21,2,25,17,34,6,27,13,36,11,30,8,23,10,5,24,16,33,1,20,14,31,9,22,18,29,7,28,12,35,3,26];
    this.hotNumbers = {};
    this.maxHistory = 100;
    this.history = [];
  }

  spin() {
    const index = Math.floor(Math.random() * this.numbers.length);
    const number = this.numbers[index];
    this.history.unshift(number);
    if (this.history.length > this.maxHistory) this.history.pop();
    this.hotNumbers[number] = (this.hotNumbers[number] || 0) + 1;
    return {
      number, color: number === 0 ? 'green' : [1,3,5,7,9,12,14,16,18,19,21,23,25,27,30,32,34,36].includes(number) ? 'red' : 'black',
      section: number === 0 ? 'zero' : number <= 12 ? 'first_dozen' : number <= 18 ? 'first_third' : number <= 24 ? 'second_dozen' : number <= 36 ? 'second_third' : 'unknown',
    };
  }

  evaluateBets(bets, spinResult) {
    const payouts = {};
    for (const [type, amount] of Object.entries(bets)) {
      let won = false, multiplier = 0;
      if (type === 'straight' && bets.target !== undefined) { won = spinResult.number === bets.target; multiplier = 36; }
      else if (type === 'red') { won = spinResult.color === 'red'; multiplier = 2; }
      else if (type === 'black') { won = spinResult.color === 'black'; multiplier = 2; }
      else if (type === 'odd') { won = spinResult.number > 0 && spinResult.number % 2 === 1; multiplier = 2; }
      else if (type === 'even') { won = spinResult.number > 0 && spinResult.number % 2 === 0; multiplier = 2; }
      else if (type === 'low') { won = spinResult.number >= 1 && spinResult.number <= 18; multiplier = 2; }
      else if (type === 'high') { won = spinResult.number >= 19 && spinResult.number <= 36; multiplier = 2; }
      else if (type.startsWith('dozen')) { const d = parseInt(type.split('_')[1]); const lo = (d-1)*12+1, hi = d*12; won = spinResult.number >= lo && spinResult.number <= hi; multiplier = 3; }
      else if (type.startsWith('column')) { const c = parseInt(type.split('_')[1]); won = spinResult.number > 0 && ((c===1 && spinResult.number%3===1) || (c===2 && spinResult.number%3===2) || (c===3 && spinResult.number%3===0)); multiplier = 3; }
      payouts[type] = won ? Math.round(amount * multiplier) : 0;
    }
    return { result: spinResult, payouts };
  }

  getHotCold(topN = 5) {
    const sorted = Object.entries(this.hotNumbers).sort((a,b) => b[1] - a[1]);
    return { hot: sorted.slice(0, topN), cold: sorted.slice(-topN).reverse() };
  }
}

