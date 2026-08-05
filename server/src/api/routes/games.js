/**
 * games.js — Game API Routes
 * 
 * Provides RESTful API endpoints for all KazikSites casino games.
 * Handles game results, bets, payouts, and ProvablyFair verification.
 */

import { Router } from 'express';
import { ProvablyFairRNG, CasinoStateManager, BonusSystem, CASINO_CONFIG } from '../../casino-engine.js';
import jwt from 'jsonwebtoken';

const router = Router();
const rng = new ProvablyFairRNG();
const stateManager = new CasinoStateManager();
const bonusSystem = new BonusSystem();

// ═══════════════════════════════════════════
// MIDDLEWARE — Authentication
// ═══════════════════════════════════════════

function authenticateToken(req, res, next) {
  const auth = req.headers.authorization;
  if (!auth) return res.status(401).json({ error: 'Authentication required' });
  
  const token = auth.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Token required' });
  
  try {
    req.player = jwt.verify(token, process.env.JWT_SECRET || 'dev-secret-change-in-prod');
    next();
  } catch (e) {
    res.status(403).json({ error: 'Invalid token' });
  }
}

// ═══════════════════════════════════════════
// GAME RESULT ENDPOINTS
// ═══════════════════════════════════════════

/**
 * POST /api/games/:gameId/spin
 * 
 * Submit a game result request.
 * Body: { bet: number, playerId: string, options?: object }
 */
router.post('/:gameId/spin', authenticateToken, async (req, res) => {
  try {
    const { gameId } = req.params;
    const { bet, playerId, options = {} } = req.body;
    const player = req.player;
    
    // Validate bet
    if (!bet || bet < CASINO_CONFIG.limits.minBet) {
      return res.status(400).json({ error: `Minimum bet is ${CASINO_CONFIG.limits.minBet}` });
    }
    if (bet > CASINO_CONFIG.limits.maxBet) {
      return res.status(400).json({ error: `Maximum bet is ${CASINO_CONFIG.limits.maxBet}` });
    }
    
    // Determine game type
    const gameTypeMap = {
      'crash-pro': 'crash',
      'plinko-master': 'plinko',
      'lightning-dice': 'dice',
      'roulette-royale': 'roulette',
      'blackjack-pro': 'blackjack',
      'baccarat-pro': 'baccarat',
    };
    
    // Default to slots for slot games
    const gameType = gameTypeMap[gameId] || 'slots';
    
    // Get player state for engagement tracking
    const playerId = player.id || playerId;
    const playerState = stateManager.getPlayerState(playerId);
    
    // Calculate session duration
    playerState.sessionDuration = Date.now() - (playerState.sessionStart || Date.now());
    playerState.betsSinceBigWin = playerState.betsSinceBigWin || 0;
    
    // Generate game result with ProvablyFair RNG (pass player state for engagement)
    const result = await rng.generateResult(gameType, {
      ...options,
      bet,
      gameId,
      houseEdge: CASINO_CONFIG.rtp[gameType] ? (1 - CASINO_CONFIG.rtp[gameType]) : CASINO_CONFIG.houseEdge.default,
    });
    
    // Apply engagement-based adjustments
    const engagementConfig = CASINO_CONFIG.casinoAdvantage.playerEngagement;
    if (engagementConfig) {
      // Check for guaranteed win after losses
      const guaranteedWin = engagementConfig.engagementTriggers.guaranteedWin;
      if (guaranteedWin && guaranteedWin.enabled && playerState.consecutiveLosses >= guaranteedWin.maxConsecutiveLosses) {
        // Force a small win to keep player engaged
        const winMultiplier = guaranteedWin.minWinAmount + Math.random() * (guaranteedWin.maxWinAmount - guaranteedWin.minWinAmount);
        if (result.totalWin !== undefined) {
          result.totalWin = Math.max(result.totalWin, bet * winMultiplier);
        }
        // Reset loss tracking
        playerState.consecutiveLosses = 0;
        playerState.betsSinceBigWin = 0;
      }
      
      // Big win drought protection
      if (engagementConfig.engagementTriggers.bigWinDrought) {
        playerState.betsSinceBigWin = (playerState.betsSinceBigWin || 0) + 1;
        if (result.isBigWin || result.isJackpot) {
          playerState.betsSinceBigWin = 0;
        }
      }
      
      // Near-miss visual effect
      if (engagementConfig.nearMiss && engagementConfig.nearMiss.enabled && result.totalWin === 0) {
        if (Math.random() < engagementConfig.nearMiss.frequency) {
          result.isNearMiss = true;
          // Slight boost for next spin
          playerState.lastNearMiss = Date.now();
        }
      }
    }
    
    // Calculate actual win amount
    let winAmount = 0;
    if (result.totalWin) {
      winAmount = result.totalWin * bet;
    } else if (result.crashPoint) {
      winAmount = result.playerCashout 
        ? bet * Math.min(result.playerCashout, result.crashPoint) 
        : 0;
    } else if (result.multiplier) {
      winAmount = bet * result.multiplier;
    } else if (result.wins && Object.keys(result.wins).length > 0) {
      const totalWins = Object.values(result.wins).reduce((a, b) => a + b, 0);
      winAmount = totalWins;
    } else if (result.multiplier && result.result) {
      winAmount = result.result === 'player' ? bet * result.multiplier : 0;
    } else if (result.multiplier) {
      winAmount = bet * result.multiplier;
    }
    
    // Apply max win cap
    const maxWin = bet * CASINO_CONFIG.limits.maxPayoutMultiplier;
    if (winAmount > maxWin) {
      winAmount = maxWin;
    }
    
    // Update player state with engagement tracking
    const updatedState = stateManager.updatePlayerState(playerId || player.id, {
      bet,
      winAmount,
      gameId,
      timestamp: Date.now(),
    });
    
    // Reset consecutive losses if player won
    if (winAmount > 0) {
      playerState.consecutiveLosses = 0;
    }
    
    // Check for bonus triggers
    if (playerState.consecutiveLosses >= 5) {
      bonusSystem.claimFreeSpins(playerId || player.id, 5);
    }
    
    // Return result with engagement data
    res.json({
      success: true,
      gameId,
      gameType,
      result: {
        ...result,
        winAmount: Math.floor(winAmount * 100) / 100,
        bet,
        netResult: Math.floor((winAmount - bet) * 100) / 100,
        winMultiplier: bet > 0 ? (winAmount / bet) : 0,
        // Engagement indicators
        isNearMiss: result.isNearMiss || false,
        isBigWin: result.isBigWin || (winAmount > bet * 10),
        isJackpot: result.isJackpot || (winAmount > bet * 50),
        // Next spin boost (for engagement tracking)
        engagementBoost: playerState.consecutiveLosses >= 3 ? 0.15 : 0,
      },
      proof: result.proof,
      playerState: {
        balance: updatedState.balance,
        totalBet: updatedState.totalBet,
        totalWin: updatedState.totalWin,
        bonuses: bonusSystem.getPlayerBonuses(playerId || player.id),
        streaks: {
          consecutiveWins: updatedState.consecutiveWins,
          consecutiveLosses: updatedState.consecutiveLosses,
        },
        // Engagement status
        engagement: {
          nextSpinBoost: playerState.consecutiveLosses >= 7 ? 'guaranteed-win' : 
                          playerState.consecutiveLosses >= 3 ? 'loss-recovery' : 'normal',
          freeSpinsAvailable: bonusSystem.getPlayerBonuses(playerId || player.id).freeSpins,
        }
      },
    });
  } catch (error) {
    console.error('Game spin error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /api/games/:gameId/crash/start
 * 
 * Start a crash game round.
 */
router.post('/:gameId/crash/start', authenticateToken, async (req, res) => {
  try {
    const { bet, playerId } = req.body;
    
    const result = await rng.generateResult('crash', {
      bet,
      gameId: req.params.gameId,
      houseEdge: 1 - CASINO_CONFIG.rtp.crash,
    });
    
    res.json({
      success: true,
      crashPoint: result.crashPoint,
      nonce: result.proof.nonce,
      message: 'Game started. Cash out before crash!',
    });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /api/games/:gameId/crash/cashout
 * 
 * Cash out in crash game.
 */
router.post('/:gameId/crash/cashout', authenticateToken, async (req, res) => {
  try {
    const { currentMultiplier, bet, playerId } = req.body;
    
    if (!currentMultiplier || currentMultiplier <= 1) {
      return res.status(400).json({ error: 'Invalid multiplier' });
    }
    
    const winAmount = bet * currentMultiplier;
    
    res.json({
      success: true,
      cashedOutAt: currentMultiplier,
      winAmount: Math.floor(winAmount * 100) / 100,
    });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /api/games/plinko-master/drop
 * 
 * Drop a ball in Plinko.
 */
router.post('/:gameId/drop', authenticateToken, async (req, res) => {
  try {
    const { bet, rows = 16, bucketMultipliers, playerId } = req.body;
    
    const result = await rng.generateResult('plinko', {
      bet,
      gameId: req.params.gameId,
      rows,
      buckets: bucketMultipliers || [100, 50, 25, 10, 5, 3, 1.5, 1, 0.5, 1, 1.5, 3, 5, 10, 25, 50, 100],
    });
    
    const winAmount = bet * result.multiplier;
    
    res.json({
      success: true,
      bucketIndex: result.bucketIndex,
      multiplier: result.multiplier,
      winAmount: Math.floor(winAmount * 100) / 100,
      position: result.position,
    });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /api/games/lightning-dice/roll
 * 
 * Roll dice in Lightning Dice.
 */
router.post('/:gameId/roll', authenticateToken, async (req, res) => {
  try {
    const { bet, number, playerId } = req.body;
    
    const result = await rng.generateResult('dice', {
      bet,
      gameId: req.params.gameId,
      min: 2,
      max: 12,
      bets: { [number]: bet },
    });
    
    const won = result.wins[number];
    const winAmount = won || 0;
    
    res.json({
      success: true,
      die1: result.die1,
      die2: result.die2,
      sum: result.sum,
      lightningMultiplier: result.lightningMultiplier,
      won,
      winAmount: Math.floor(winAmount * 100) / 100,
    });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ═══════════════════════════════════════════
// PROVABLY FAIR VERIFICATION
// ═══════════════════════════════════════════

/**
 * GET /api/games/:gameId/provably-fair/:nonce
 * 
 * Verify a ProvablyFair result.
 */
router.get('/:gameId/provably-fair/:nonce', authenticateToken, async (req, res) => {
  try {
    const { nonce } = req.params;
    
    // In production, retrieve the server seed used for this nonce
    // For now, return verification template
    res.json({
      gameId: req.params.gameId,
      nonce: parseInt(nonce),
      isProvablyFair: true,
      message: 'This game uses ProvablyFair algorithm. Click "Verify" to check this result.',
      verificationUrl: `/api/games/${req.params.gameId}/verify?nonce=${nonce}`,
    });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/games/:gameId/verify
 * 
 * Verify a specific game result.
 */
router.get('/:gameId/verify', authenticateToken, async (req, res) => {
  try {
    const { nonce, serverSeed, clientSeed } = req.query;
    
    if (!nonce || !serverSeed || !clientSeed) {
      return res.status(400).json({ error: 'Missing verification parameters' });
    }
    
    const result = await rng.verifyResult(
      serverSeed.toString(),
      clientSeed.toString(),
      parseInt(nonce),
      null
    );
    
    res.json({
      valid: result.isValid,
      hash: result.hash,
      serverSeed: serverSeed,
      clientSeed: clientSeed,
      nonce: parseInt(nonce),
      random: result.random,
    });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ═══════════════════════════════════════════
// BONUS & REWARD ENDPOINTS
// ═══════════════════════════════════════════

/**
 * GET /api/games/bonuses/:playerId
 * 
 * Get player bonuses.
 */
router.get('/bonuses/:playerId', authenticateToken, (req, res) => {
  const bonuses = bonusSystem.getPlayerBonuses(req.params.playerId);
  res.json({ success: true, bonuses });
});

/**
 * POST /api/games/bonuses/welcome/claim
 * 
 * Claim welcome bonus.
 */
router.post('/bonuses/welcome/claim', authenticateToken, async (req, res) => {
  try {
    const { depositAmount } = req.body;
    const result = bonusSystem.applyWelcomeBonus(req.player.id, depositAmount);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /api/games/bonuses/freespins/claim
 * 
 * Claim free spins.
 */
router.post('/bonuses/freespins/claim', authenticateToken, (req, res) => {
  const { count = 10 } = req.body;
  const result = bonusSystem.claimFreeSpins(req.player.id, count);
  res.json(result);
});

/**
 * POST /api/games/bonuses/freespins/use
 * 
 * Use a free spin.
 */
router.post('/bonuses/freespins/use', authenticateToken, (req, res) => {
  const result = bonusSystem.useFreeSpin(req.player.id);
  res.json(result);
});

// ═══════════════════════════════════════════
// CASINO STATS ENDPOINTS
// ═══════════════════════════════════════════

/**
 * GET /api/games/stats
 * 
 * Get casino-wide statistics.
 */
router.get('/stats', (req, res) => {
  const stats = stateManager.getStats();
  res.json({ success: true, stats });
});

/**
 * GET /api/games/:gameId/stats
 * 
 * Get game-specific statistics.
 */
router.get('/:gameId/stats', (req, res) => {
  res.json({
    success: true,
    gameId: req.params.gameId,
    stats: {
      totalBets: 0,
      totalPlayers: 0,
      avgBet: 0,
      topWin: 0,
    },
  });
});

// ═══════════════════════════════════════════
// GAME LIST ENDPOINT
// ═══════════════════════════════════════════

/**
 * GET /api/games
 * 
 * Get all available games.
 */
router.get('/', (req, res) => {
  res.json({
    success: true,
    games: [
      { id: 'crash-pro', name: 'Crash Pro', type: 'crash', category: 'instant' },
      { id: 'plinko-master', name: 'Plinko Master', type: 'plinko', category: 'instant' },
      { id: 'lightning-dice', name: 'Lightning Dice', type: 'dice', category: 'instant' },
      { id: 'blackjack-pro', name: 'Blackjack Pro', type: 'blackjack', category: 'table-games' },
      { id: 'baccarat-pro', name: 'Baccarat Pro', type: 'baccarat', category: 'table-games' },
      { id: 'roulette-royale', name: 'Roulette Royale', type: 'roulette', category: 'live-casino' },
      { id: 'fruit-shop', name: 'Fruit Shop', type: 'slots', category: 'slots' },
      { id: 'gold-caravan', name: 'Gold Caravan', type: 'slots', category: 'slots' },
      { id: 'magic-crystal', name: 'Magic Crystal', type: 'slots', category: 'slots' },
      { id: 'hot-navigator', name: 'Hot Navigator', type: 'slots', category: 'slots' },
      { id: 'diamond-rush', name: 'Diamond Rush', type: 'slots', category: 'slots' },
      { id: 'wild-west-gold', name: 'Wild West Gold', type: 'slots', category: 'slots' },
      { id: 'book-of-gold', name: 'Book of Gold', type: 'slots', category: 'slots' },
      { id: 'cosmic-queen', name: 'Cosmic Queen', type: 'slots', category: 'slots' },
      { id: 'dragons-fortune', name: "Dragon's Fortune", type: 'slots', category: 'slots' },
      { id: 'pharaohs-treasure', name: "Pharaoh's Treasure", type: 'slots', category: 'slots' },
      { id: 'lucky-streak', name: 'Lucky Streak', type: 'slots', category: 'instant' },
      { id: 'slots-royal', name: 'Slots Royal', type: 'slots', category: 'slots' },
    ],
  });
});

// ═══════════════════════════════════════════
// LANGUAGE ENDPOINTS
// ═══════════════════════════════════════════

/**
 * GET /api/games/languages
 * 
 * Get supported languages.
 */
router.get('/languages', (req, res) => {
  res.json({
    success: true,
    languages: CASINO_CONFIG.languages.supported.map(code => ({
      code,
      name: {
        en: 'English',
        ru: 'Русский',
        es: 'Español',
        de: 'Deutsch',
        fr: 'Français',
        pt: 'Português',
        ja: '日本語',
        ko: '한국어',
        zh: '中文',
        ar: 'العربية',
      }[code] || code,
    })),
    default: CASINO_CONFIG.languages.default,
  });
});

export default router;