// ═══════════════════════════════════════════════════════════
// PLINKO MASTER ENGINE — Physics-based Ball Drop Game
// Features: Risk levels, row selection, real-time physics
// ═══════════════════════════════════════════════════════════

class PlinkoEngine {
  constructor() {
    this.activeGames = new Map();
    
    // Multiplier buckets based on risk level and rows
    this.riskConfig = {
      low: {
        multipliers: [8.6, 2.1, 1.1, 1.0, 0.5, 1.0, 1.1, 2.1, 8.6],
        volatility: 'low',
      },
      medium: {
        multipliers: [33, 4.2, 1.6, 1.1, 0.3, 1.1, 1.6, 4.2, 33],
        volatility: 'medium',
      },
      high: {
        multipliers: [110, 41, 10, 5, 1.5, 5, 10, 41, 110],
        volatility: 'high',
      },
    };

    this.gravity = 0.3;
    this.friction = 0.98;
  }

  /**
   * Create a plinko board with specified rows and risk level
   */
  createBoard(rows, riskLevel = 'medium') {
    const config = this.riskConfig[riskLevel] || this.riskConfig.medium;
    
    const pegs = [];
    for (let row = 0; row < rows; row++) {
      const cols = row + 3;
      for (let col = 0; col < cols; col++) {
        pegs.push({
          x: (col - (cols - 1) / 2) * 40,
          y: row * 40,
          radius: 3,
        });
      }
    }

    const bucketCount = config.multipliers.length;
    const buckets = [];
    for (let i = 0; i < bucketCount; i++) {
      buckets.push({
        x: (i - (bucketCount - 1) / 2) * 50,
        y: rows * 40 + 30,
        multiplier: config.multipliers[i],
      });
    }

    return { id: `plinko-${Date.now()}`, rows, riskLevel, pegs, buckets, multipliers: config.multipliers };
  }

  /**
   * Start a new plinko game with a board
   */
  startGame(gameId, config = {}) {
    const rows = config.rows || 12;
    const riskLevel = config.risk || 'medium';
    
    const board = this.createBoard(rows, riskLevel);
    
    const state = {
      id: gameId || `plinko-${Date.now()}`,
      board,
      status: 'waiting',
      currentBall: null,
      bets: new Map(),
      history: [],
    };

    this.activeGames.set(state.id, state);
    return state;
  }

  /**
   * Place a bet for the next ball drop
   */
  placeBet(gameId, betAmount) {
    const game = this.activeGames.get(gameId);
    if (!game || game.status !== 'waiting') throw new Error('Game not available');

    const minBet = 0.1;
    const maxPayout = CASINO_CONFIG.balanceControl.maxPayout['plinko-master'] || 50000;

    if (betAmount < minBet) throw new Error(`Minimum bet: ${minBet}`);
    if (betAmount > maxPayout) throw new Error(`Maximum bet: ${maxPayout}`);

    const betId = `plinko-bet-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    game.bets.set(betId, { amount: betAmount, bucketIndex: null, multiplier: null, payout: null });
    return { betId, game };
  }

  /**
   * Drop a ball from the top center with physics simulation
   */
  dropBall(gameId) {
    const game = this.activeGames.get(gameId);
    if (!game || game.status !== 'waiting') throw new Error('Game not in waiting state');

    const ball = { x: 0, y: -20, vx: (Math.random() - 0.5) * 2, vy: 0, radius: 4 };
    game.status = 'dropping';
    game.currentBall = ball;

    return { gameId, result: this._simulateDrop(game) };
  }

  /**
   * Simulate ball drop physics (simplified for server-side)
   */
  _simulateDrop(game) {
    let ball = { ...game.currentBall };
    
    for (let row = 0; row < game.board.rows; row++) {
      if (Math.random() > 0.5) ball.vx += 1.5;
      else ball.vx -= 1.5;
      
      ball.vy += this.gravity;
      ball.vx *= this.friction;
    }

    const finalX = ball.x + ball.vx * 10;
    let closestBucketIndex = 0;
    let minDistance = Infinity;

    for (let i = 0; i < game.board.buckets.length; i++) {
      const dist = Math.abs(finalX - game.board.buckets[i].x);
      if (dist < minDistance) { minDistance = dist; closestBucketIndex = i; }
    }

    closestBucketIndex = Math.max(0, Math.min(closestBucketIndex, game.board.buckets.length - 1));
    const landedBucket = game.board.buckets[closestBucketIndex];

    return { bucketIndex: closestBucketIndex, multiplier: landedBucket.multiplier };
  }

  /**
   * Resolve all bets with the drop result
   */
  resolveBets(gameId) {
    const game = this.activeGames.get(gameId);
    if (!game || !game.currentBall) throw new Error('No ball drop to resolve');

    const result = this._simulateDrop(game);
    
    for (const [betId, bet] of game.bets) {
      bet.bucketIndex = result.bucketIndex;
      bet.multiplier = result.multiplier;
      bet.payout = Math.round(bet.amount * result.multiplier);
    }

    game.history.push({ multiplier: result.multiplier, bucketIndex: result.bucketIndex, timestamp: Date.now() });
    game.status = 'waiting';
    game.currentBall = null;

    return { gameId, result, bets: Array.from(game.bets.values()) };
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
      board: { rows: game.board.rows, riskLevel: game.board.riskLevel, multipliers: game.board.multipliers },
      activeBets: Array.from(game.bets.values()).map(b => ({ amount: b.amount, bucketIndex: b.bucketIndex, multiplier: b.multiplier, payout: b.payout })),
      recentHistory: game.history.slice(-10).map(h => h.multiplier),
    };
  }

  /**
   * Get board configuration for frontend rendering
   */
  getBoardConfig(rows = 12, riskLevel = 'medium') {
    const board = this.createBoard(rows, riskLevel);
    return { rows: board.rows, riskLevel: board.riskLevel, multipliers: board.multipliers };
  }
}

import { CASINO_CONFIG } from '../config/casino-config.js';

const plinkoEngine = new PlinkoEngine();
export { plinkoEngine, PlinkoEngine };
export default plinkoEngine;


