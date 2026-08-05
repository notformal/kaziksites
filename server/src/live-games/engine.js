// ═══════════════════════════════════════════════════════════
// LIVE GAMES ENGINE — 40+ Live Dealer Games from Top Providers
// Evolution Gaming • Pragmatic Play Live • Ezugi • Vivo Gaming • Endorphina
// ═══════════════════════════════════════════════════════════

import { randomUUID } from 'crypto';

// ─── Utility Functions ────────────────────────────────────────
function random(min, max) {
  return Math.random() * (max - min) + min;
}

function randomInt(min, max) {
  return Math.floor(random(min, max + 1));
}

function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function weightedPick(items) {
  const totalWeight = items.reduce((sum, item) => sum + (item.weight || 1), 0);
  let r = Math.random() * totalWeight;
  for (const item of items) {
    r -= (item.weight || 1);
    if (r <= 0) return item;
  }
  return items[items.length - 1];
}

// ─── Card Deck ────────────────────────────────────────────────
const SUITS = ['♠', '♥', '♦', '♣'];
const RANKS = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];

function createDeck(decks = 6) {
  const deck = [];
  for (let d = 0; d < decks; d++) {
    for (const suit of SUITS) {
      for (const rank of RANKS) {
        deck.push({
          suit,
          rank,
          value: rank === 'A' ? 1 : (['J', 'Q', 'K'].includes(rank) ? 10 : parseInt(rank)),
        });
      }
    }
  }
  // Fisher-Yates shuffle
  for (let i = deck.length - 1; i > 0; i--) {
    const j = randomInt(0, i);
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }
  return deck;
}

function cardValue(card) {
  return card.value;
}

function cardName(card) {
  return `${card.rank}${card.suit}`;
}

function handValue(hand) {
  let total = hand.reduce((sum, c) => sum + cardValue(c), 0);
  let aces = hand.filter(c => c.rank === 'A').length;
  while (total <= 11 && aces > 0) {
    total += 10;
    aces--;
  }
  return total;
}

// ─── European Roulette Wheel ──────────────────────────────────
const ROULETTE_NUMBERS = [
  0, 32, 15, 19, 4, 21, 2, 25, 17, 34, 6, 27, 13, 36,
  11, 30, 8, 23, 10, 5, 24, 16, 33, 1, 20, 14, 31, 9,
  22, 18, 29, 7, 28, 12, 35, 3, 26
];

const ROULETTE_RED = new Set([
  1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36
]);

function spinRoulette() {
  const result = pick(ROULETTE_NUMBERS);
  const color = result === 0 ? 'green' : (ROULETTE_RED.has(result) ? 'red' : 'black');
  return { number: result, color };
}

// ─── Baccarat Card Values ─────────────────────────────────────
function baccaratCardValue(card) {
  if (['J', 'Q', 'K', '10'].includes(card.rank)) return 0;
  if (card.rank === 'A') return 1;
  if (['2', '3', '4', '5', '6', '7', '8', '9'].includes(card.rank)) return parseInt(card.rank);
  return 0;
}

function baccaratHandValue(hand) {
  const total = hand.reduce((sum, c) => sum + baccaratCardValue(c), 0);
  return total % 10;
}

// Third card rules for Baccarat
function shouldDrawThirdCard(type, playerHand, bankerHand) {
  const playerValue = baccaratHandValue(playerHand);
  
  if (type === 'player') {
    // Player draws on 0-5, stands on 6-7
    return playerValue <= 5;
  }
  
  if (type === 'banker' && playerHand.length === 3) {
    const playerThird = playerHand[2];
    const playerThirdValue = baccaratCardValue(playerThird);
    const bankerValue = baccaratHandValue(bankerHand);
    
    // Complex banker third card rules
    if (playerThirdValue >= 8 || playerThirdValue <= 5) {
      // Player third card ignored
      return bankerValue <= 5;
    }
    
    const rules = {
      0: [0, 1, 2, 3, 4, 5],
      1: [0, 1, 2, 3, 4, 5],
      6: [0, 1, 6, 7],
      7: [0, 1],
    };
    
    const drawRanges = rules[playerThirdValue] || [];
    return drawRanges.includes(bankerValue);
  }
  
  return false;
}

// ─── Sic Bo ───────────────────────────────────────────────────
function rollSicBo() {
  return [randomInt(1, 6), randomInt(1, 6), randomInt(1, 6)];
}

function sicBoResult(dice) {
  const total = dice.reduce((a, b) => a + b, 0);
  const isTriple = dice[0] === dice[1] && dice[1] === dice[2];
  const isDouble = dice[0] === dice[1] || dice[1] === dice[2] || dice[0] === dice[2];
  const even = total % 2 === 0;
  const big = total >= 11 && total <= 17;
  
  return { total, isTriple, isDouble, even, big: !even && big };
}

// ─── Money Wheel (Dream Catcher / Crazy Time) ──────────────────
const DREAM_CATCHER_SEGMENTS = [
  { value: 1, weight: 24 },
  { value: 2, weight: 16 },
  { value: 5, weight: 8 },
  { value: 10, weight: 4 },
  { value: 20, weight: 2 },
  { value: 40, weight: 1 },
  { value: 70, weight: 1 },
  { type: 'double', multiplier: 2, weight: 2 },
  { type: 'double', multiplier: 7, weight: 1 },
];

function spinMoneyWheel(segments = DREAM_CATCHER_SEGMENTS) {
  const result = weightedPick(segments);
  return result;
}

// ─── CRAZY TIME BONUS ROUNDS ──────────────────────────────────
function coinFlip() {
  const sides = ['red', 'blue'];
  const redMult = random(1, 5);
  const blueMult = random(1, 5);
  const result = pick(sides);
  return {
    type: 'coin-flip',
    winner: result,
    multiplier: result === 'red' ? redMult : blueMult,
    details: { red: redMult, blue: blueMult },
  };
}

function cashHunt() {
  const prizes = [5, 10, 20, 25, 50, 75, 100, 150, 250, 500];
  const selected = Array.from({ length: 54 }, () => pick(prizes));
  const chosen = pick(selected);
  return { type: 'cash-hunt', prize: chosen, targets: selected.slice(0, 9) };
}

function pachinko() {
  let multiplier = 1;
  const path = [];
  while (multiplier < 100 && Math.random() > 0.3) {
    const hitDouble = Math.random() > 0.6;
    if (hitDouble) {
      multiplier *= 2;
      path.push('DOUBLE');
    } else {
      path.push(pick([1, 2, 5, 10, 20]));
      break;
    }
  }
  return { type: 'pachinko', finalMultiplier: multiplier, path };
}

function crazyTimeBonus() {
  const multipliers = [2, 5, 10, 15, 20, 50];
  return {
    type: 'crazy-time',
    finalMultiplier: pick(multipliers),
    flapColor: pick(['red', 'blue', 'green', 'yellow']),
  };
}

function runCrazyTimeBonus() {
  const bonuses = ['coin-flip', 'cash-hunt', 'pachinko', 'crazy-time'];
  const bonusType = pick(bonuses);
  
  switch (bonusType) {
    case 'coin-flip': return coinFlip();
    case 'cash-hunt': return cashHunt();
    case 'pachinko': return pachinko();
    case 'crazy-time': return crazyTimeBonus();
  }
}

// ─── MONOPOLY LIVE BONUS ──────────────────────────────────────
function monopolyBonus(doublesLimit = 3) {
  const path = [];
  let totalMultiplier = 0;
  let doubles = 0;
  let rolledDoubles = false;
  
  while (doubles < doublesLimit && !rolledDoubles) {
    const d1 = randomInt(1, 6);
    const d2 = randomInt(1, 6);
    const isDouble = d1 === d2;
    
    if (isDouble) {
      doubles++;
      rolledDoubles = false;
      path.push({ position: doubles * 5, dice: [d1, d2], isDouble: true });
      
      if (doubles >= doublesLimit) {
        // Final double = Super Bonus
        totalMultiplier = pick([10, 15, 20, 30, 50]);
        path.push({ bonus: 'SUPER_BONUS', multiplier: totalMultiplier });
        break;
      }
    } else {
      rolledDoubles = true;
      const spaces = d1 + d2;
      const properties = ['Community Chest', 'Chance', 'Tax', 'Jail', 'Free Parking'];
      path.push({ position: spaces, dice: [d1, d2], isDouble: false, property: pick(properties) });
    }
  }
  
  return { type: 'monopoly', path, totalMultiplier };
}

// ─── BLACKJACK ENGINE ─────────────────────────────────────────
class BlackjackEngine {
  constructor(config = {}) {
    this.decks = config.decks || 6;
    this.blackjackPays = config.blackjackPays || 1.5; // 3:2
    this.dealerStandsOn17 = config.dealerStandsOn17 !== false;
    this.maxHands = config.maxHands || 3;
    this.lightningMultipliers = config.lightningMultipliers || [];
    this.deck = [];
    this.shoePenetration = config.shoePenetration || 0.75;
  }
  
  dealRound(playerBets = [{ amount: 10, hand: [0] }]) {
    // Reshuffle if needed
    if (this.deck.length < this.decks * 52 * (1 - this.shoePenetration)) {
      this.deck = createDeck(this.decks);
    }
    
    const playerHand = [this.deck.pop(), this.deck.pop()];
    const dealerUp = this.deck.pop();
    const dealerDown = this.deck.pop();
    const dealerHand = [dealerUp, dealerDown];
    
    // Check for lightning multipliers on player bets
    const lightningBoost = this.lightningMultipliers.length > 0 && Math.random() < 0.15;
    const activeMultiplier = lightningBoost ? pick(this.lightningMultipliers) : 1;
    
    // Resolve player hands
    const results = playerBets.map((bet, idx) => {
      let playerVal = handValue(playerHand);
      let dealerVal = handValue(dealerHand);
      
      // Check blackjack
      const playerBlackjack = playerHand.length === 2 && playerVal === 21;
      const dealerBlackjack = dealerHand.length === 2 && dealerVal === 21;
      
      if (playerBlackjack && !dealerBlackjack) {
        const win = bet.amount * this.blackjackPays * activeMultiplier;
        return { win, multiplier: activeMultiplier, result: 'blackjack', busted: false };
      }
      
      if (dealerBlackjack && !playerBlackjack) {
        return { win: 0, multiplier: 1, result: 'dealer-blackjack', busted: false };
      }
      
      // Player draws
      while (playerVal < 17) {
        playerHand.push(this.deck.pop());
        playerVal = handValue(playerHand);
      }
      
      if (playerVal > 21) {
        return { win: 0, multiplier: 1, result: 'bust', busted: true };
      }
      
      // Dealer draws
      const dealerDraws = this.dealerStandsOn17 ? dealerVal < 17 : dealerVal < 17;
      while (dealerDraws && dealerVal < 17) {
        dealerHand.push(this.deck.pop());
        dealerVal = handValue(dealerHand);
      }
      
      if (dealerVal > 21 || playerVal > dealerVal) {
        const win = bet.amount * 2 * activeMultiplier;
        return { win, multiplier: activeMultiplier, result: 'win', busted: false };
      } else if (playerVal === dealerVal) {
        return { win: bet.amount, multiplier: 1, result: 'push', busted: false };
      } else {
        return { win: 0, multiplier: 1, result: 'lose', busted: false };
      }
    });
    
    return {
      playerHand,
      dealerHand,
      dealerUp,
      results,
      lightningBoost,
      activeMultiplier,
      cardsRemaining: this.deck.length,
    };
  }
}

// ─── ROULETTE ENGINE ──────────────────────────────────────────
class RouletteEngine {
  constructor(config = {}) {
    this.lightningNumbers = config.lightningNumbers || 0;
    this.lightningMultipliers = config.lightningMultipliers || [];
    this.progressiveJackpot = config.progressiveJackpot || false;
    this.spinDuration = config.spinDuration || 5000; // ms simulation
  }
  
  spin() {
    const result = spinRoulette();
    
    // Lightning numbers (if applicable)
    let lightningNumbers = [];
    let lightningMultipliers = {};
    
    if (this.lightningNumbers > 0 && this.lightningMultipliers.length > 0) {
      lightningNumbers = [];
      const available = ROULETTE_NUMBERS.filter(n => n !== 0);
      for (let i = 0; i < this.lightningNumbers; i++) {
        const num = pick(available.filter(n => !lightningNumbers.includes(n)));
        if (num !== undefined) lightningNumbers.push(num);
      }
      lightningMultipliers = Object.fromEntries(
        lightningNumbers.map(n => [n, pick(this.lightningMultipliers)])
      );
    }
    
    return {
      ...result,
      lightningNumbers,
      lightningMultipliers,
      timestamp: Date.now(),
    };
  }
  
  resolveBets(spinsResult, bets = []) {
    return bets.map(bet => {
      let win = 0;
      
      switch (bet.type) {
        case 'straight':
          if (bet.number === spinsResult.number) {
            win = bet.amount * 36;
            if (lightningMultipliers[spinsResult.number]) {
              win *= lightningMultipliers[spinsResult.number];
            }
          }
          break;
        case 'red':
          if (spinsResult.color === 'red') win = bet.amount * 2;
          break;
        case 'black':
          if (spinsResult.color === 'black') win = bet.amount * 2;
          break;
        case 'odd':
          if (spinsResult.number > 0 && spinsResult.number % 2 !== 0) win = bet.amount * 2;
          break;
        case 'even':
          if (spinsResult.number > 0 && spinsResult.number % 2 === 0) win = bet.amount * 2;
          break;
        case 'dozen':
          if (spinsResult.number > 0) {
            const dozen = Math.floor((spinsResult.number - 1) / 12) + 1;
            if (dozen === bet.dozen) win = bet.amount * 3;
          }
          break;
        case 'column':
          if (spinsResult.number > 0 && spinsResult.number % 3 === bet.column % 3) {
            win = bet.amount * 3;
          }
          break;
        case 'split':
          if (bet.numbers.includes(spinsResult.number)) win = bet.amount * 12;
          break;
        default:
          break;
      }
      
      return { ...bet, win, won: win > 0 };
    });
  }
}

// ─── BACCARAT ENGINE ──────────────────────────────────────────
class BaccaratEngine {
  constructor(config = {}) {
    this.decks = config.decks || 8;
    this.commission = config.commission || 0.05; // 5% on Banker
    this.lightningMultipliers = config.lightningMultipliers || [];
    this.noCommission = config.noCommission || false;
    this.sideBets = config.sideBets || false;
  }
  
  deal() {
    const deck = createDeck(this.decks);
    const playerHand = [deck.pop(), deck.pop()];
    const bankerHand = [deck.pop(), deck.pop()];
    
    // Third card rule
    if (shouldDrawThirdCard('player', playerHand, bankerHand)) {
      playerHand.push(deck.pop());
      if (shouldDrawThirdCard('banker', playerHand, bankerHand)) {
        bankerHand.push(deck.pop());
      }
    }
    
    const playerValue = baccaratHandValue(playerHand);
    const bankerValue = baccaratHandValue(bankerHand);
    
    let result = 'tie';
    if (playerValue > bankerValue) result = 'player';
    else if (bankerValue > playerValue) result = 'banker';
    
    // Lightning multipliers
    let lightningMultiplier = 1;
    if (this.lightningMultipliers.length > 0 && Math.random() < 0.2) {
      lightningMultiplier = pick(this.lightningMultipliers);
    }
    
    return {
      playerHand,
      bankerHand,
      playerValue,
      bankerValue,
      result,
      lightningMultiplier,
      cardsUsed: this.decks * 52 - deck.length,
    };
  }
  
  resolveBets(dealResult, bets = []) {
    return bets.map(bet => {
      let win = 0;
      
      switch (bet.side) {
        case 'player':
          if (dealResult.result === 'player') {
            win = bet.amount * 2;
          }
          break;
        case 'banker':
          if (dealResult.result === 'banker') {
            const commission = this.noCommission ? 0 : this.commission;
            win = bet.amount * (2 - commission);
          }
          break;
        case 'tie':
          if (dealResult.result === 'tie') {
            win = bet.amount * 9;
          }
          break;
        case 'player-pair':
          if (dealResult.playerHand.length >= 2 && 
              baccaratCardValue(dealResult.playerHand[0]) === baccaratCardValue(dealResult.playerHand[1])) {
            win = bet.amount * 9;
          }
          break;
        case 'banker-pair':
          if (dealResult.bankerHand.length >= 2 && 
              baccaratCardValue(dealResult.bankerHand[0]) === baccaratCardValue(dealResult.bankerHand[1])) {
            win = bet.amount * 9;
          }
          break;
        default:
          break;
      }
      
      // Apply lightning multiplier
      if (dealResult.lightningMultiplier > 1 && 
          (bet.side === dealResult.result || (bet.side === 'tie' && dealResult.result === 'tie'))) {
        win *= dealResult.lightningMultiplier;
      }
      
      return { ...bet, win, won: win > 0 };
    });
  }
}

// ─── SIC BO ENGINE ────────────────────────────────────────────
class SicBoEngine {
  constructor(config = {}) {
    this.lightningMultipliers = config.lightningMultipliers || [];
  }
  
  roll() {
    const dice = rollSicBo();
    const result = sicBoResult(dice);
    
    // Lightning multipliers on specific totals
    let lightningBonus = null;
    if (this.lightningMultipliers.length > 0 && Math.random() < 0.25) {
      const luckyTotal = randomInt(4, 17);
      lightningBonus = { total: luckyTotal, multiplier: pick(this.lightningMultipliers) };
    }
    
    return { dice, ...result, lightningBonus, timestamp: Date.now() };
  }
  
  resolveBets(rollResult, bets = []) {
    return bets.map(bet => {
      let win = 0;
      
      switch (bet.type) {
        case 'big':
          if (rollResult.big && !rollResult.isTriple) win = bet.amount * 2;
          break;
        case 'small':
          if (!rollResult.big && !rollResult.isTriple && rollResult.total <= 10) win = bet.amount * 2;
          break;
        case 'even':
          if (rollResult.even && !rollResult.isTriple) win = bet.amount * 2;
          break;
        case 'odd':
          if (!rollResult.even && !rollResult.isTriple) win = bet.amount * 2;
          break;
        case 'total':
          if (rollResult.total === bet.total) {
            const payout = [0, 0, 150, 180, 170, 140, 120, 100, 70, 60, 35, 30, 30, 35, 60, 70, 100, 150][rollResult.total] || 150;
            win = bet.amount * (payout / 10);
          }
          break;
        case 'triple':
          if (rollResult.isTriple) win = bet.amount * 150;
          break;
        case 'double':
          if (rollResult.isDouble && !rollResult.isTriple) win = bet.amount * 30;
          break;
        case 'specific-dice':
          if (dice.includes(bet.value)) {
            const count = rollResult.dice.filter(d => d === bet.value).length;
            win = bet.amount * (count === 3 ? 250 : count === 2 ? 50 : count === 1 ? 1 : 0);
          }
          break;
        default:
          break;
      }
      
      // Lightning bonus
      if (rollResult.lightningBonus && bet.type === 'total' && bet.total === rollResult.lightningBonus.total) {
        win *= rollResult.lightningBonus.multiplier;
      }
      
      return { ...bet, win, won: win > 0 };
    });
  }
}

// ─── DRAGON TIGER ENGINE ──────────────────────────────────────
class DragonTigerEngine {
  constructor() {
    this.deck = createDeck(8);
  }
  
  deal() {
    if (this.deck.length < 100) this.deck = createDeck(8);
    
    const dragonCard = this.deck.pop();
    const tigerCard = this.deck.pop();
    
    let result = 'tie';
    if (cardValue(dragonCard) > cardValue(tigerCard)) result = 'dragon';
    else if (cardValue(tigerCard) > cardValue(dragonCard)) result = 'tiger';
    
    return {
      dragon: dragonCard,
      tiger: tigerCard,
      result,
      timestamp: Date.now(),
    };
  }
  
  resolveBets(dealResult, bets = []) {
    return bets.map(bet => {
      let win = 0;
      
      switch (bet.side) {
        case 'dragon':
          if (dealResult.result === 'dragon') win = bet.amount * 2;
          break;
        case 'tiger':
          if (dealResult.result === 'tiger') win = bet.amount * 2;
          break;
        case 'tie':
          if (dealResult.result === 'tie') win = bet.amount * 9;
          break;
        case 'dragon-perfect-pair':
          if (dealResult.result === 'dragon' && dealResult.dragon.suit === dealResult.tiger.suit) {
            win = bet.amount * 12;
          }
          break;
        case 'tiger-perfect-pair':
          if (dealResult.result === 'tiger' && dealResult.dragon.suit === dealResult.tiger.suit) {
            win = bet.amount * 12;
          }
          break;
        default:
          break;
      }
      
      return { ...bet, win, won: win > 0 };
    });
  }
}

// ─── THREE CARD POKER ENGINE ──────────────────────────────────
class ThreeCardPokerEngine {
  constructor() {
    this.deck = createDeck(6);
  }
  
  deal() {
    if (this.deck.length < 50) this.deck = createDeck(6);
    
    const playerHand = [this.deck.pop(), this.deck.pop(), this.deck.pop()];
    const dealerHand = [this.deck.pop(), this.deck.pop(), this.deck.pop()];
    
    // Dealer qualifies with Queen or better
    const dealerHighCard = Math.max(...dealerHand.map(c => cardValue(c)));
    const dealerQualifies = dealerHighCard >= 12; // Q=12, K=13, A=14
    
    return {
      playerHand,
      dealerHand,
      dealerQualifies,
      timestamp: Date.now(),
    };
  }
  
  resolveBets(dealResult, bets = []) {
    return bets.map(bet => {
      let win = 0;
      
      switch (bet.type) {
        case 'ante':
          if (!dealResult.dealerQualifies) {
            win = bet.amount * 2;
          } else if (handValue(dealResult.playerHand) > handValue(dealResult.dealerHand)) {
            win = bet.amount * 2;
          }
          break;
        case 'play':
          if (dealResult.dealerQualifies && handValue(dealResult.playerHand) > handValue(dealResult.dealerHand)) {
            win = bet.amount * 2;
          }
          break;
        case 'pair-plus':
          const playerVals = dealResult.playerHand.map(c => c.rank);
          if (playerVals[0] === playerVals[1] || playerVals[1] === playerVals[2] || playerVals[0] === playerVals[2]) {
            win = bet.amount * 3; // Pair pays 1:1, but we add bet back
          }
          if (playerVals[0] === playerVals[1] && playerVals[1] === playerVals[2]) {
            win = bet.amount * 30; // Three of a kind
          }
          break;
        default:
          break;
      }
      
      return { ...bet, win, won: win > 0 };
    });
  }
}

// ─── LIVE GAME AGENT MANAGER (100+ simulated players) ─────────
class LiveGameAgentManager {
  constructor() {
    this.maxAgents = 200;
    this.agents = new Map();
    this.agentProfiles = {
      casual: { weight: 40, betRange: [1, 50], playSpeed: 'slow' },
      regular: { weight: 35, betRange: [10, 200], playSpeed: 'medium' },
      highRoller: { weight: 15, betRange: [100, 5000], playSpeed: 'fast' },
      vip: { weight: 5, betRange: [500, 50000], playSpeed: 'fast' },
    };
    this.emotionalState = new Map();
    this.sessionHistory = new Map();
  }
  
  generateName() {
    const prefixes = ['Lucky', 'Win', 'Gold', 'Star', 'Royal', 'Mega', 'Super', 'Ace', 'Pro'];
    const suffixes = ['Player', 'Gamer', 'Pro', 'Master', 'King', 'Queen', 'Ace', 'Boss', 'Champ'];
    return `${pick(prefixes)}${pick(suffixes)}${randomInt(1, 999)}`;
  }
  
  randomAvatar() {
    const avatars = ['🧑', '👨', '👩', '🧔', '👱', '👲', '🤵', '👰', '🕺', '💃'];
    return pick(avatars);
  }
  
  randomBalance(profile) {
    const [min, max] = profile.betRange;
    const tier = Math.random();
    if (tier < 0.6) return random(min * 10, min * 50);
    if (tier < 0.85) return random(min * 50, max * 5);
    if (tier < 0.95) return random(max * 5, max * 20);
    return random(max * 20, max * 50);
  }
  
  createAgent(profileType = 'regular') {
    const profile = this.agentProfiles[profileType] || this.agentProfiles.regular;
    
    const agent = {
      id: `agent_${randomUUID()}`,
      name: this.generateName(),
      avatar: this.randomAvatar(),
      profile,
      profileType,
      balance: this.randomBalance(profile),
      emotionalState: 'neutral',
      winStreak: 0,
      lossStreak: 0,
      currentBet: 0,
      totalWagered: 0,
      totalWon: 0,
      sessionStart: Date.now(),
      lastActivity: Date.now(),
      isActive: true,
    };
    
    this.agents.set(agent.id, agent);
    return agent;
  }
  
  updateEmotionalState(agent, result) {
    if (result.won) {
      agent.winStreak++;
      agent.lossStreak = 0;
      
      const winMult = result.win / agent.currentBet;
      if (winMult >= 10) {
        agent.emotionalState = 'excited';
        agent.currentBet = Math.min(agent.balance * 0.1, agent.currentBet * 1.5);
      } else if (agent.winStreak >= 3) {
        agent.emotionalState = 'happy';
        agent.currentBet = Math.min(agent.balance * 0.08, agent.currentBet * 1.2);
      }
    } else {
      agent.lossStreak++;
      agent.winStreak = 0;
      
      if (agent.lossStreak >= 5) {
        agent.emotionalState = 'tilted';
        agent.currentBet = Math.min(agent.balance * 0.15, agent.currentBet * 2);
      } else if (agent.lossStreak >= 3) {
        agent.emotionalState = 'sad';
        agent.currentBet = Math.max(agent.profile.betRange[0], agent.currentBet * 0.7);
      }
    }
    
    agent.totalWagered += agent.currentBet;
    agent.totalWon += result.win || 0;
    agent.balance += (result.win || 0) - agent.currentBet;
    agent.lastActivity = Date.now();
    
    if (agent.balance < agent.profile.betRange[0]) {
      agent.isActive = false;
      agent.emotionalState = 'offline';
    }
  }
  
  generateBets(gameType, count = 20) {
    const bets = [];
    const activeAgents = Array.from(this.agents.values())
      .filter(a => a.isActive && a.balance >= a.profile.betRange[0])
      .slice(0, count);
    
    for (const agent of activeAgents) {
      const baseBet = random(agent.profile.betRange[0], Math.min(agent.profile.betRange[1], agent.balance));
      
      let betMultiplier = 1.0;
      switch (agent.emotionalState) {
        case 'excited': betMultiplier = 1.5; break;
        case 'tilted': betMultiplier = 2.0; break;
        case 'sad': betMultiplier = 0.5; break;
        case 'happy': betMultiplier = 1.2; break;
      }
      
      agent.currentBet = Math.round(baseBet * betMultiplier * 100) / 100;
      
      const bet = this.createGameBet(gameType, agent, agent.currentBet);
      bets.push({ ...bet, agentId: agent.id, name: agent.name, avatar: agent.avatar });
    }
    
    return bets;
  }
  
  createGameBet(gameType, agent, amount) {
    switch (gameType) {
      case 'blackjack':
        return { type: 'blackjack', amount };
      case 'roulette':
        const betTypes = ['red', 'black', 'odd', 'even', 'straight'];
        const chosenType = pick(betTypes);
        if (chosenType === 'straight') {
          return { type: 'straight', number: randomInt(0, 36), amount };
        }
        return { type: chosenType, amount };
      case 'baccarat':
        const sides = ['player', 'banker', 'tie'];
        return { type: 'baccarat', side: pick(sides), amount };
      case 'sic-bo':
        const diceTypes = ['big', 'small', 'odd', 'even', 'total'];
        const chosenDiceType = pick(diceTypes);
        if (chosenDiceType === 'total') {
          return { type: 'total', total: randomInt(4, 17), amount };
        }
        return { type: chosenDiceType, amount };
      case 'dragon-tiger':
        return { type: 'dragon-tiger', side: pick(['dragon', 'tiger', 'tie']), amount };
      case 'three-card-poker':
        return { type: 'three-card-poker', ante: amount * 0.6, play: amount * 0.4, 'pair-plus': amount * 0.2 };
      case 'dream-catcher':
      case 'crazy-time':
        return { type: 'wheel', amount };
      default:
        return { type: 'generic', amount };
    }
  }
  
  getOnlineCount() {
    return Array.from(this.agents.values()).filter(a => a.isActive).length;
  }
  
  getActivePlayers() {
    return Array.from(this.agents.values())
      .filter(a => a.isActive)
      .map(a => ({
        id: a.id,
        name: a.name,
        avatar: a.avatar,
        balance: Math.round(a.balance),
        emotionalState: a.emotionalState,
        lastWin: a.totalWon - a.totalWagered,
        gamesPlayed: a.totalWagered > 0 ? Math.floor(a.totalWagered / a.currentBet) : 0,
      }));
  }
}

// ─── MAIN LIVE GAMES ENGINE ───────────────────────────────────
class LiveGamesEngine {
  constructor() {
    this.tables = new Map();
    this.agentManager = new LiveGameAgentManager();
    this.gameEngines = {
      blackjack: BlackjackEngine,
      roulette: RouletteEngine,
      baccarat: BaccaratEngine,
      'three-card-poker': ThreeCardPokerEngine,
      'dragon-tiger': DragonTigerEngine,
      'sic-bo': SicBoEngine,
    };
    this.status = 'running';
    this.totalRounds = 0;
    this.startSimulation();
  }
  
  createTable(config) {
    const tableId = `table_${randomUUID()}`;
    const engineClass = this.gameEngines[config.gameType];
    
    const table = {
      id: tableId,
      gameId: config.gameId,
      gameType: config.gameType,
      name: config.name || `${config.gameId} Table`,
      dealer: config.dealer || this.randomDealer(),
      maxPlayers: config.maxPlayers || 200,
      minBet: config.minBet || 0.5,
      maxBet: config.maxBet || 10000,
      status: 'waiting',
      players: [],
      history: [],
      createdAt: Date.now(),
      engine: engineClass ? new engineClass(config.engineConfig) : null,
    };
    
    this.tables.set(tableId, table);
    return table;
  }
  
  randomDealer() {
    const names = ['Sofia', 'Emma', 'Isabella', 'Mia', 'Charlotte', 'Amelia', 'Harper', 'Evelyn', 'Abigail', 'Emily'];
    const languages = ['EN', 'RU', 'ES', 'PT', 'DE', 'JA', 'KO', 'ZH'];
    return {
      name: pick(names),
      language: pick(languages),
      avatar: `https://i.pravatar.cc/100?u=${pick(names)}`,
      experience: randomInt(1, 10),
    };
  }
  
  startRound(tableId) {
    const table = this.tables.get(tableId);
    if (!table) return null;
    
    table.status = 'dealing';
    
    // Generate bot bets
    const botBets = this.agentManager.generateBets(table.gameType, randomInt(10, 80));
    
    // Resolve game
    let result;
    if (table.engine) {
      switch (table.gameType) {
        case 'blackjack': {
          const bets = botBets.map(b => ({ amount: b.amount, hand: [0] }));
          result = table.engine.dealRound(bets);
          break;
        }
        case 'roulette': {
          const spinResult = table.engine.spin();
          const resolvedBets = table.engine.resolveBets(spinResult, botBets);
          result = { ...spinResult, bets: resolvedBets };
          break;
        }
        case 'baccarat': {
          const dealResult = table.engine.deal();
          const resolvedBets = table.engine.resolveBets(dealResult, botBets);
          result = { ...dealResult, bets: resolvedBets };
          break;
        }
        case 'three-card-poker': {
          const dealResult = table.engine.deal();
          const resolvedBets = table.engine.resolveBets(dealResult, botBets);
          result = { ...dealResult, bets: resolvedBets };
          break;
        }
        case 'dragon-tiger': {
          const dealResult = table.engine.deal();
          const resolvedBets = table.engine.resolveBets(dealResult, botBets);
          result = { ...dealResult, bets: resolvedBets };
          break;
        }
        case 'sic-bo': {
          const rollResult = table.engine.roll();
          const resolvedBets = table.engine.resolveBets(rollResult, botBets);
          result = { ...rollResult, bets: resolvedBets };
          break;
        }
      }
    }
    
    // Update agent states
    if (result && result.bets) {
      for (const bet of result.bets) {
        const agent = Array.from(this.agentManager.agents.values()).find(a => a.id === bet.agentId);
        if (agent) {
          this.agentManager.updateEmotionalState(agent, {
            won: bet.won,
            win: bet.win || 0,
            amount: bet.amount,
          });
        }
      }
    }
    
    // Add to history
    table.history.unshift({ ...result, timestamp: Date.now(), botCount: botBets.length });
    if (table.history.length > 50) table.history.pop();
    
    table.status = 'completed';
    this.totalRounds++;
    
    return { ...result, tableId, botsOnline: this.agentManager.getOnlineCount() };
  }
  
  // Game Show specific methods
  spinDreamCatcher(tableId) {
    const table = this.tables.get(tableId);
    if (!table) return null;
    
    const result = spinMoneyWheel();
    const multiplier = result.type === 'double' ? result.multiplier : result.value;
    
    // Run bonus round on double
    let bonusResult = null;
    if (result.type === 'double') {
      bonusResult = { type: 'double', multiplier };
    }
    
    return {
      segment: result.value,
      multiplier,
      isDouble: result.type === 'double',
      bonusResult,
      timestamp: Date.now(),
    };
  }
  
  playCrazyTime(tableId) {
    const table = this.tables.get(tableId);
    if (!table) return null;
    
    // Main wheel spin
    const mainResult = spinMoneyWheel();
    const mainMultiplier = mainResult.type === 'double' ? mainResult.multiplier : mainResult.value;
    
    // If bonus segment, run bonus round
    let bonusRound = null;
    if (mainResult.type === 'double' || Math.random() < 0.15) {
      bonusRound = runCrazyTimeBonus();
    }
    
    return {
      mainMultiplier,
      isDouble: mainResult.type === 'double',
      bonusRound,
      timestamp: Date.now(),
    };
  }
  
  playMonopolyLive(tableId) {
    const table = this.tables.get(tableId);
    if (!table) return null;
    
    const mainSpin = spinMoneyWheel();
    const mainMultiplier = mainSpin.type === 'double' ? mainSpin.multiplier : mainSpin.value;
    
    let bonusRound = null;
    if (mainSpin.type === 'double' || Math.random() < 0.1) {
      bonusRound = monopolyBonus();
    }
    
    return {
      mainMultiplier,
      isDouble: mainSpin.type === 'double',
      bonusRound,
      timestamp: Date.now(),
    };
  }
  
  getStatus() {
    try {
      const tables = this.tables instanceof Map ? this.tables : new Map();
      const result = {
        status: this.status || 'unknown',
        totalTables: tables.size || 0,
        tablesByType: {},
        onlineAgents: 0,
        totalRounds: this.totalRounds || 0,
        timestamp: Date.now(),
      };
      
      try {
        result.tablesByType = Object.fromEntries(
          Array.from(tables.values()).reduce((acc, t) => {
            acc[t.gameType] = (acc[t.gameType] || 0) + 1;
            return acc;
          }, {})
        );
      } catch (e) {
        console.warn('getStatus tablesByType error:', e.message);
      }
      
      try {
        if (this.agentManager && typeof this.agentManager.getOnlineCount === 'function') {
          result.onlineAgents = this.agentManager.getOnlineCount();
        }
      } catch (e) {
        console.warn('getStatus onlineAgents error:', e.message);
      }
      
      return result;
    } catch (e) {
      console.error('getStatus fatal error:', e);
      return {
        status: 'error',
        error: e.message,
        totalTables: 0,
        tablesByType: {},
        onlineAgents: 0,
        totalRounds: 0,
        timestamp: Date.now(),
      };
    }
  }
  
  getTableList() {
    try {
      const tables = this.tables instanceof Map ? this.tables : new Map();
      return Array.from(tables.values()).map(t => ({
        id: t.id,
        gameId: t.gameId,
        name: t.name,
        gameType: t.gameType,
        dealer: t.dealer,
        minBet: t.minBet,
        maxBet: t.maxBet,
        status: t.status,
        playersCount: t.players?.length || 0,
        historyCount: t.history.length,
      }));
    } catch (e) {
      console.error('getTableList fatal error:', e);
      return [];
    }
  }
  
  // Start background simulation loop
  startSimulation() {
    setInterval(() => {
      for (const [tableId, table] of this.tables) {
        if (table.status === 'completed' || table.status === 'waiting') {
          this.startRound(tableId);
        }
      }
      
      // Clean up inactive agents periodically
      if (this.agentManager.agents.size > this.maxAgents) {
        const inactive = Array.from(this.agentManager.agents.entries())
          .filter(([_, a]) => !a.isActive);
        for (const [id] of inactive.slice(0, 50)) {
          this.agentManager.agents.delete(id);
        }
      }
      
      // Create new agents if needed
      const activeCount = this.agentManager.getOnlineCount();
      if (activeCount < 50 && this.agentManager.agents.size < this.maxAgents) {
        const profileTypes = Object.keys(this.agentManager.agentProfiles);
        for (let i = 0; i < 5; i++) {
          const profileType = pick(profileTypes);
          this.agentManager.createAgent(profileType);
        }
      }
    }, 8000); // New round every 8 seconds
  }
}

// ─── Singleton Instance ───────────────────────────────────────
let instance = null;

function getLiveGamesEngine() {
  if (!instance) {
    instance = new LiveGamesEngine();
  }
  return instance;
}

// ─── Export ───────────────────────────────────────────────────
export {
  LiveGamesEngine,
  LiveGameAgentManager,
  BlackjackEngine,
  RouletteEngine,
  BaccaratEngine,
  SicBoEngine,
  DragonTigerEngine,
  ThreeCardPokerEngine,
  getLiveGamesEngine,
  createDeck,
  spinRoulette,
  rollSicBo,
  spinMoneyWheel,
  runCrazyTimeBonus,
  monopolyBonus,
};