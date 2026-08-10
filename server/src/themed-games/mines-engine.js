/**
 * mines-premium-engine.js — Minesweeper-style Casino Game
 * 
 * Grid-based: pick safe tiles to reveal multipliers, avoid mines.
 * Cash out anytime before hitting a mine.
 * Configurable mine count (1-24) and grid size (5×5 = 25 tiles).
 */

import crypto from 'node:crypto';

const GRID_SIZE = 25; // 5x5

/** Calculate multiplier based on remaining safe tiles */
function calculateMultiplier(mines, tilesRevealed) {
  let mult = 1;
  for (let i = 0; i < tilesRevealed; i++) {
    const remaining = GRID_SIZE - i;
    const safeRemaining = GRID_SIZE - mines - i;
    mult *= remaining / Math.max(safeRemaining, 1);
  }
  return Math.round(mult * 97) / 100; // 3% house edge
}

/** Get next tile multiplier for display */
function getNextMultiplier(mines, tilesRevealed) {
  return calculateMultiplier(mines, tilesRevealed + 1);
}

export class MinesPremiumEngine {
  constructor(config = {}) {
    this.gridSize = config.gridSize || GRID_SIZE;
    this.maxMines = Math.min(config.maxMines || 24, this.gridSize - 1);
    this.minMines = config.minMines || 1;
    this.history = [];
    this.maxHistory = 50;
  }

  /** Generate provably fair mine positions */
  generateMinefield(serverSeed, clientSeed, nonce) {
    const data = `${serverSeed}:${clientSeed}:${nonce}`;
    const hash = crypto.createHmac('sha256', serverSeed).update(data).digest('hex');
    
    // Use hash to deterministically place mines
    const minePositions = new Set();
    let hashIndex = 0;
    
    while (minePositions.size < this.currentMines) {
      const pos = parseInt(hash.substring(hashIndex, hashIndex + 4), 16) % this.gridSize;
      hashIndex += 4;
      if (hashIndex >= hash.length) hashIndex = 0;
      minePositions.add(pos);
    }

    return Array.from(minePositions).sort((a, b) => a - b);
  }

  /** Start a new game round */
  startRound(betCents = 100, mines = 3, serverSeed = 'default', clientSeed = 'client', nonce = 0) {
    if (mines < this.minMines || mines > this.maxMines) {
      throw new Error(`Mines must be between ${this.minMines} and ${this.maxMines}`);
    }

    this.currentMines = mines;
    const minefield = this.generateMinefield(serverSeed, clientSeed, nonce);
    
    const state = {
      id: `mines-${Date.now()}-${nonce}`,
      betCents,
      mines,
      minefield, // hidden — revealed on game over
      revealedTiles: [],
      isRunning: true,
      currentMultiplier: 1.0,
      startTime: Date.now(),
    };

    this.currentMines = mines;
    return state;
  }

  /** Reveal a tile (0-24) */
  revealTile(gameState, tileIndex) {
    if (!gameState.isRunning) throw new Error('Game not running');
    if (gameState.revealedTiles.includes(tileIndex)) throw new Error('Already revealed');
    if (tileIndex < 0 || tileIndex >= this.gridSize) throw new Error('Invalid tile');

    gameState.revealedTiles.push(tileIndex);
    const isMine = gameState.minefield.includes(tileIndex);

    if (isMine) {
      gameState.isRunning = false;
      return {
        tileIndex,
        isMine: true,
        revealedAll: true,
        currentMultiplier: 1.0,
        payoutCents: 0,
      };
    }

    const mult = calculateMultiplier(gameState.mines, gameState.revealedTiles.length);
    gameState.currentMultiplier = mult;

    // Auto-win if all safe tiles revealed
    const allSafeRevealed = (this.gridSize - gameState.mines) === gameState.revealedTiles.length;
    
    return {
      tileIndex,
      isMine: false,
      multiplier: mult,
      nextMultiplier: getNextMultiplier(gameState.mines, gameState.revealedTiles.length),
      revealedAll: allSafeRevealed,
      canCashout: true,
    };
  }

  /** Cash out current round */
  cashOut(gameState) {
    if (!gameState.isRunning) throw new Error('Game not running');
    
    gameState.isRunning = false;
    const payoutCents = Math.round(gameState.betCents * gameState.currentMultiplier);

    const round = {
      id: gameState.id,
      betCents: gameState.betCents,
      mines: gameState.mines,
      tilesRevealed: gameState.revealedTiles.length,
      multiplier: gameState.currentMultiplier,
      payoutCents,
      won: true,
      endedBy: 'cashout',
    };

    this.history.unshift(round);
    if (this.history.length > this.maxHistory) this.history.pop();

    return round;
  }

  /** Get grid state for UI (revealed tiles + mine indicators only after game over) */
  getGridState(gameState) {
    const grid = Array.from({ length: this.gridSize }, (_, i) => ({
      index: i,
      revealed: gameState.revealedTiles.includes(i),
      isMine: !gameState.isRunning && gameState.minefield.includes(i),
      multiplier: null,
    }));

    // Add multipliers for revealed safe tiles
    let multIndex = 1;
    for (const tile of gameState.revealedTiles) {
      grid[tile].multiplier = calculateMultiplier(gameState.mines, multIndex);
      multIndex++;
    }

    return { grid, isRunning: gameState.isRunning, currentMultiplier: gameState.currentMultiplier };
  }

  /** Get round history */
  getHistory(limit = 20) {
    return this.history.slice(0, limit).map(h => ({
      tilesRevealed: h.tilesRevealed,
      multiplier: h.multiplier,
      payoutCents: h.payoutCents,
      won: h.won,
      endedBy: h.endedBy,
      timestamp: Date.now(),
    }));
  }

  /** Get statistics */
  getStats() {
    const total = this.history.length;
    if (!total) return { totalRounds: 0, winRate: '0.0', avgMultiplier: '0.00' };
    
    const wins = this.history.filter(h => h.won).length;
    const avgMult = this.history.reduce((s, h) => s + h.multiplier, 0) / total;
    
    return {
      totalRounds: total,
      winRate: (wins / total * 100).toFixed(1),
      avgMultiplier: avgMult.toFixed(2),
      maxMultiplier: Math.max(...this.history.map(h => h.multiplier)).toFixed(2),
    };
  }
}

const minesEngine = new MinesPremiumEngine();
export { minesEngine };
export default minesEngine;
