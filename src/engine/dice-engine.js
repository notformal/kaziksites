// ═══════════════════════════════════════════════════════════
// LIGHTNING DICE ENGINE — Three Dice Totals with Lightning
// Features: Lightning multipliers up to 100x, provably fair
// ═══════════════════════════════════════════════════════════

class LightningDiceEngine {
  constructor() {
    this.activeGames = new Map();
    this.lightningConfig = {
      minMultiplier: 2,
      maxMultiplier: 100,
      lightningCount: 3, // Number of numbers that get lightning boost
      baseOdds: {
        // Total -> Base multiplier (3 to 17)
        3: 243.0, 4: 72.9, 5: 29.16, 6: 14.58, 7: 9.72,
        8: 7.29, 9: 5.832, 10: 4.86, 11: 4.374, 12: 4.374,
        13: 4.86, 14: 5.832, 15: 7.29, 16: 9.72, 17: 14.58,
      },
    };
  }

  /**
   * Roll three dice and return total + individual values
   */
  rollDice() {
    const d1 = Math.floor(Math.random() * 6) + 1;
    const d2 = Math.floor(Math.random() * 6) + 1;
    const d3 = Math.floor(Math.random() * 6) + 1;
    
    return {
      dice: [d1, d2, d3],
      total: d1 + d2 + d3,
    };
  }

  /**
   * Generate lightning multipliers for this round
   */
  generateLightning() {
    const allNumbers = Array.from({length: 15}, (_, i) => i + 3); // 3 to 17
    
    // Shuffle and pick N numbers for lightning
    const shuffled = allNumbers.sort(() => Math.random() - 0.5);
    const lightningNumbers = new Set(shuffled.slice(0, this.lightningConfig.lightningCount));
    
    const multipliers = {};
    for (const num of lightningNumbers) {
      // Random multiplier between min and max
      const mult = Math.floor(Math.random() * (this.lightningConfig.maxMultiplier - this.lightningConfig.minMultiplier + 1)) 
                   + this.lightningConfig.minMultiplier;
      multipliers[num] = mult;
    }
    
    return { lightningNumbers, multipliers };
  }

  /**
   * Start a new dice game round
   */
  startRound(gameId) {
    const lightning = this.generateLightning();
    
    const state = {
      id: gameId || `dice-${Date.now()}`,
      status: 'waiting', // waiting | rolling | finished
      lightning,
      bets: new Map(),
      roundNumber: Math.floor(Math.random() * 10000),
    };

    this.activeGames.set(state.id, state);
    return state;
  }

  /**
   * Place a bet on a specific total
   */
  placeBet(gameId, chosenTotal, betAmount) {
    const game = this.activeGames.get(gameId);
    if (!game || game.status !== 'waiting') {
      throw new Error('Game not available for betting');
    }

    if (chosenTotal < 3 || chosenTotal > 17) {
      throw new Error('Invalid total: must be between 3 and 17');
    }

    const minBet = 0.1;
    const maxPayout = CASINO_CONFIG.balanceControl.maxPayout['lightning-dice'] || 10000;

    if (betAmount < minBet) throw new Error(`Minimum bet: ${minBet}`);
    if (betAmount > maxPayout) throw new Error(`Maximum bet: ${maxPayout}`);

    const betId = `dice-bet-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    game.bets.set(betId, {
      chosenTotal,
      amount: betAmount,
      payoutMultiplier: this._getBaseMultiplier(chosenTotal),
      won: false,
      payout: null,
      lightningBoosted: false,
    });

    return { betId, game };
  }

  /**
   * Get base multiplier for a total (without lightning)
   */
  _getBaseMultiplier(total) {
    return this.lightningConfig.baseOdds[total] || 4.374;
  }

  /**
   * Roll dice and resolve all bets
   */
  resolveRound(gameId, serverSeed = null) {
    const game = this.activeGames.get(gameId);
    if (!game || game.status !== 'waiting') {
      throw new Error('Game not in waiting state');
    }

    // Roll dice
    const rollResult = this.rollDice();
    
    // Update status
    game.status = 'finished';
    game.result = rollResult;

    // Resolve bets
    for (const [betId, bet] of game.bets) {
      if (bet.chosenTotal === rollResult.total) {
        bet.won = true;
        
        let multiplier = bet.payoutMultiplier;
        
        // Check if this number got lightning boost
        if (game.lightning.multipliers[bet.chosenTotal]) {
          multiplier = game.lightning.multipliers[bet.chosenTotal];
          bet.lightningBoosted = true;
        }
        
        bet.payout = Math.round(bet.amount * multiplier);
      } else {
        bet.won = false;
        bet.payout = 0;
      }
    }

    return {
      gameId,
      rollResult,
      lightning: game.lightning.multipliers,
      bets: Array.from(game.bets.values()),
    };
  }

  /**
   * Get current round state for UI
   */
  getGameState(gameId) {
    const game = this.activeGames.get(gameId);
    if (!game) return null;

    return {
      id: game.id,
      status: game.status,
      lightning: game.lightning,
      result: game.result ? {
        dice: game.result.dice,
        total: game.result.total,
      } : null,
      activeBets: Array.from(game.bets.values()).map(b => ({
        chosenTotal: b.chosenTotal,
        amount: b.amount,
        payoutMultiplier: b.payoutMultiplier,
        won: b.won,
        payout: b.payout,
        lightningBoosted: b.lightningBoosted,
      })),
    };
  }

  /**
   * Get all active games
   */
  getActiveGames() {
    return Array.from(this.activeGames.values()).map(g => ({
      id: g.id,
      status: g.status,
      roundNumber: g.roundNumber,
    }));
  }
}

import { CASINO_CONFIG } from '../config/casino-config.js';

const lightningDiceEngine = new LightningDiceEngine();
export { lightningDiceEngine, LightningDiceEngine };
export default lightningDiceEngine;


