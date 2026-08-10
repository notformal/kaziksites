// ═══════════════════════════════════════════════════════════
// CASH OR CRASH ENGINE (Pragmatic Play Live Game Show)
// Crash-style multiplier game — cash out before the crash
// ═══════════════════════════════════════════════════════════

class CashOrCrashEngine {
  constructor() {
    this.activeGames = new Map();
  }

  /**
   * Generate crash point using exponential distribution
   */
  generateCrashPoint(houseEdge = 0.03) {
    const rand = Math.random();
    const crashPoint = (1 - houseEdge) / (1 - rand);
    return Math.max(1.0, Math.floor(crashPoint * 100) / 100);
  }

  /**
   * Start a new Cash or Crash game round
   */
  startRound(gameId) {
    const crashPoint = this.generateCrashPoint();
    
    const state = {
      id: gameId || `cash-crash-${Date.now()}`,
      status: 'waiting', // waiting | running | crashed
      currentMultiplier: 1.0,
      crashPoint,
      startTime: null,
      bets: new Map(),
      history: [],
    };

    this.activeGames.set(state.id, state);
    return state;
  }

  /**
   * Place a bet on the next round
   */
  placeBet(gameId, betAmount) {
    const game = this.activeGames.get(gameId);
    if (!game || game.status !== 'waiting') {
      throw new Error('Game not available for betting');
    }

    const minBet = 50;
    const maxBet = 1000000;

    if (betAmount < minBet) throw new Error(`Minimum bet: ${minBet}`);
    if (betAmount > maxBet) throw new Error(`Maximum bet: ${maxBet}`);

    const betId = `cc-bet-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    game.bets.set(betId, {
      amount: betAmount,
      cashedOut: false,
      cashoutMultiplier: null,
      payout: null,
      placedAt: Date.now(),
    });

    return { betId, game };
  }

  /**
   * Start the crash round (after betting phase)
   */
  startRoundPlay(gameId) {
    const game = this.activeGames.get(gameId);
    if (!game || game.status !== 'waiting') {
      throw new Error('Game not in waiting state');
    }

    game.status = 'running';
    game.startTime = Date.now();

    return { gameId, crashPoint: game.crashPoint };
  }

  /**
   * Cash out a bet at current multiplier
   */
  cashOut(gameId, betId) {
    const game = this.activeGames.get(gameId);
    if (!game || game.status !== 'running') {
      throw new Error('Cannot cashout: game not running');
    }

    const bet = game.bets.get(betId);
    if (!bet || bet.cashedOut) {
      throw new Error('Bet already cashed out or not found');
    }

    // Cash out at current multiplier (with small delay for fairness)
    const cashoutMultiplier = Math.max(1.0, game.currentMultiplier - 0.01);
    
    bet.cashedOut = true;
    bet.cashoutMultiplier = cashoutMultiplier;
    bet.payout = Math.round(bet.amount * cashoutMultiplier);

    return { betId, multiplier: cashoutMultiplier, payout: bet.payout };
  }

  /**
   * Get current game state for UI
   */
  getGameState(gameId) {
    const game = this.activeGames.get(gameId);
    if (!game) return null;

    return {
      id: game.id,
      status: game.status,
      currentMultiplier: game.currentMultiplier.toFixed(2),
      crashPoint: game.crashPoint?.toFixed(2),
      activeBets: Array.from(game.bets.values()).map(b => ({
        amount: b.amount,
        cashedOut: b.cashedOut,
        payout: b.payout,
      })),
    };
  }

  /**
   * Get crash history for game
   */
  getHistory(gameId, limit = 20) {
    const game = this.activeGames.get(gameId);
    if (!game) return [];
    
    return game.history.slice(-limit).map(h => ({
      multiplier: h.multiplier.toFixed(2),
      timestamp: h.timestamp,
    }));
  }

  /**
   * Remove finished game from active games
   */
  cleanup(gameId) {
    this.activeGames.delete(gameId);
  }
}

const cashOrCrashEngine = new CashOrCrashEngine();
export { cashOrCrashEngine, CashOrCrashEngine };
export default cashOrCrashEngine;


