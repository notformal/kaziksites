// ═══════════════════════════════════════════════════════════
// TEXAS HOLD'EM POKER ENGINE (Casino Holdem)
// Player vs House — Ante, Call bet, 5-card community cards
// ═══════════════════════════════════════════════════════════

import { randomUUID } from 'crypto';

class TexasHoldemEngine {
  constructor(config = {}) {
    this.decks = config.decks || 1;
    this.deck = [];
    this.shoePenetration = config.shoePenetration || 0.75;
  }

  createDeck() {
    const suits = ['spades', 'hearts', 'diamonds', 'clubs'];
    const ranks = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];
    const deck = [];
    
    for (const suit of suits) {
      for (const rank of ranks) {
        let value;
        if (['J', 'Q', 'K'].includes(rank)) value = 10;
        else if (rank === 'A') value = 14;
        else value = parseInt(rank);
        
        deck.push({ suit, rank, value });
      }
    }
    
    // Fisher-Yates shuffle
    for (let i = deck.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [deck[i], deck[j]] = [deck[j], deck[i]];
    }
    
    return deck;
  }

  dealRound(playerBets = [{ amount: 50, hand: [] }]) {
    // Reshuffle if needed
    if (this.deck.length < this.decks * 52 * (1 - this.shoePenetration)) {
      this.deck = this.createDeck();
    }

    // Deal player hole cards
    const playerHand = [this.deck.pop(), this.deck.pop()];
    
    // Deal community cards (flop, turn, river)
    const communityCards = [this.deck.pop(), this.deck.pop(), this.deck.pop()]; // Flop
    communityCards.push(this.deck.pop()); // Turn
    communityCards.push(this.deck.pop()); // River

    // Evaluate hands (simplified — in production would use full poker evaluator)
    const playerHandValue = this.evaluateHand([...playerHand, ...communityCards]);
    
    // Dealer hand (house plays against players)
    const dealerHand = [this.deck.pop(), this.deck.pop()];
    const dealerHandValue = this.evaluateHand([...dealerHand, ...communityCards]);

    // Determine winners and payouts
    const results = playerBets.map(bet => {
      let win = 0;
      
      if (playerHandValue > dealerHandValue) {
        // Player wins — pays 1:1 on ante, 4:1 on call
        win = bet.amount * 0.5 + bet.amount * 2; // ante + call
      } else if (playerHandValue === dealerHandValue) {
        // Push — return bets
        win = bet.amount;
      } else {
        // Dealer wins — lose all bets
        win = 0;
      }

      return {
        ...bet,
        win,
        won: win > bet.amount,
        playerHandValue: playerHandValue.rank,
        dealerHandValue: dealerHandValue.rank,
      };
    });

    return {
      playerHand,
      dealerHand,
      communityCards,
      results,
      cardsRemaining: this.deck.length,
    };
  }

  evaluateHand(cards) {
    // Simplified hand evaluator — returns rank and value
    // In production, use a full poker hand evaluator library
    const values = cards.map(c => c.value).sort((a, b) => b - a);
    
    // Check for pairs, two pair, three of a kind, etc.
    const counts = {};
    for (const v of values) {
      counts[v] = (counts[v] || 0) + 1;
    }

    const countValues = Object.values(counts).sort((a, b) => b - a);
    
    let rank = 'high_card';
    let handValue = values[0];

    if (countValues[0] === 4) {
      rank = 'four_of_a_kind';
      handValue = parseInt(Object.keys(counts).find(k => counts[k] === 4));
    } else if (countValues[0] === 3 && countValues[1] >= 2) {
      rank = 'full_house';
      handValue = parseInt(Object.keys(counts).find(k => counts[k] === 3));
    } else if (countValues[0] === 3) {
      rank = 'three_of_a_kind';
      handValue = parseInt(Object.keys(counts).find(k => counts[k] === 3));
    } else if (countValues[0] === 2 && countValues[1] === 2) {
      rank = 'two_pair';
      const pairs = Object.keys(counts).filter(k => counts[k] === 2).map(Number);
      handValue = Math.max(...pairs);
    } else if (countValues[0] === 2) {
      rank = 'one_pair';
      handValue = parseInt(Object.keys(counts).find(k => counts[k] === 2));
    }

    return { rank, value: handValue };
  }
}

const texasHoldemEngine = new TexasHoldemEngine();
export { texasHoldemEngine, TexasHoldemEngine };
export default texasHoldemEngine;


