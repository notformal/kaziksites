// ═══════════════════════════════════════════════════════════
// CRASH PRO ENGINE — Multiplayer Crash Game
// Features: Auto cashout, dual bet, turbo mode, provably fair
// ═══════════════════════════════════════════════════════════

import crypto from 'node:crypto';

class CrashEngine {
  constructor() {
    this.activeGames = new Map();
  }

  /**
   * Generate provably fair crash point using HMAC-SHA256
   */
  generateCrashPoint(serverSeed, clientSeed, nonce) {
    const data = `${serverSeed}:${clientSeed}:${nonce}`;
    const hash = crypto.createHmac('sha256', serverSeed).update(data).digest('hex');
    
    const num = parseInt(hash.substring(0, 8), 16);
    const rand = num / 0xFFFFFFFF;
    
    const houseEdge = 0.04;
    const crashPoint = (1 - houseEdge) / (1 - rand);
    
    return Math.max(1.0, Math.floor(crashPoint * 100) / 100);
  }

  /**
   * Start a new crash game session
   */
  startGame(gameId, config = {}) {
    const state = {
      id: gameId || `crash-${Date.now()}`,
      status: 'waiting',
      currentMultiplier: 1.0,
      crashPoint: null,
      startTime: null,
      bets: new Map(),
      history: [],
      turboMode: config.turbo || false,
    };

    this.activeGames.set(state.id, state);
    return state;
  }

  /**
   * Place a bet on current game
   */
  placeBet(gameId, betAmount, autoCashout = null) {
    const game = this.activeGames.get(gameId);
    if (!game || game.status !== 'waiting') {
      throw new Error('Game not available for betting');
    }

    const minBet = 0.1;
    const maxPayout = CASINO_CONFIG.balanceControl.maxPayout['crash-pro'] || 25000;

    if (betAmount < minBet) throw new Error(`Minimum bet: ${minBet}`);
    if (betAmount > maxPayout) throw new Error(`Maximum bet: ${maxPayout}`);

    const betId = `bet-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    game.bets.set(betId, {
      amount: betAmount,
      autoCashout,
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
  startRound(gameId, serverSeed, clientSeed, nonce) {
    const game = this.activeGames.get(gameId);
    if (!game || game.status !== 'waiting') {
      throw new Error('Game not in waiting state');
    }

    game.crashPoint = this.generateCrashPoint(serverSeed, clientSeed, nonce);
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

    let multiplier = game.currentMultiplier;
    
    // Check auto cashout first
    if (bet.autoCashout !== null && game.crashPoint <= bet.autoCashout) {
      multiplier = bet.autoCashout;
    } else if (game.crashPoint < multiplier) {
      throw new Error('Cannot cashout: game already crashed');
    }

    bet.cashedOut = true;
    bet.cashoutMultiplier = multiplier;
    bet.payout = Math.round(bet.amount * multiplier);

    return { betId, multiplier, payout: bet.payout };
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
        autoCashout: b.autoCashout,
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

import { CASINO_CONFIG } from '../config/casino-config.js';

const crashEngine = new CrashEngine();
export { crashEngine, CrashEngine };
export default crashEngine;

