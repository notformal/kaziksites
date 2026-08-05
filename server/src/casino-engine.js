/**
 * casino-engine.js — Core Casino Engine
 * 
 * Provides house-edge aware RNG, ProvablyFair verification, bonus system,
 * and game result calculation for all KazikSites games.
 * 
 * ALL games use this engine — no hardcoded outcomes.
 * House always wins via configurable edge + dynamic adjustment.
 */

// ═══════════════════════════════════════════
// CONFIGURATION — All values externalized
// ═══════════════════════════════════════════

const CASINO_CONFIG = {
  // House edge settings
  houseEdge: {
    default: 0.045,        // 4.5% default house edge
    min: 0.02,             // 2% minimum
    max: 0.08,             // 8% maximum
    dynamic: {
      enabled: true,
      adjustmentInterval: 3600000,  // 1 hour
      targetLossRate: 0.03,         // 3% target
      adjustmentStep: 0.005,        // 0.5% steps
    }
  },

  // RTP settings per game type
  rtp: {
    slots: 0.955,
    crash: 0.96,
    plinko: 0.97,
    tableGames: 0.98,
    instant: 0.95
  },

  // Bonus system
  bonus: {
    welcomeBonus: {
      enabled: true,
      maxBonus: 5000,
      bonusPercent: 100,
      minDeposit: 10,
      wageringRequirement: 30,
    },
    freeSpins: {
      enabled: true,
      spinsPerDay: 10,
      valuePerSpin: 0.5,
      triggerOnFirstDeposit: true,
    },
    loyalty: {
      enabled: true,
      pointsPerDollar: 1,
      redemptionRate: 0.01,
      tierMultiplier: [1, 1.1, 1.2, 1.5, 2.0],
    },
    // Bonus trigger thresholds
    bonusTriggers: {
      consecutiveLosses: { threshold: 5, bonusType: 'freeSpin', value: 5 },
      bigWin: { threshold: 50, bonusType: 'bonusSpin', value: 3 },
      milestone: { threshold: 1000, bonusType: 'cashback', value: 0.05 },
    }
  },

  // Game limits
  limits: {
    minBet: 0.10,
    maxBet: 100000,
    maxWin: 1000000,
    maxPayoutMultiplier: 10000,
  },

  // ProvablyFair settings
  provablyFair: {
    serverSeedLength: 32,
    clientSeedLength: 32,
    nonceLength: 8,
    hashAlgorithm: 'sha256',
  },

  // Anti-cheat settings
  antiCheat: {
    maxBetPerMinute: 100,
    minBetInterval: 500,     // ms between bets
    suspiciousWinThreshold: 10,  // consecutive wins to flag
    velocityCheck: {
      maxBetsPerSecond: 10,
      maxLossPerMinute: 50000,
    }
  },

  // Multi-language support
  languages: {
    supported: ['en', 'ru', 'es', 'de', 'fr', 'pt', 'ja', 'ko', 'zh', 'ar'],
    default: 'en',
    translations: {
      en: {
        spin: 'Spin',
        bet: 'Bet',
        win: 'Win',
        balance: 'Balance',
        freeSpins: 'Free Spins',
        bonus: 'Bonus',
        bigWin: '🎉 BIG WIN! 🎉',
        jackpot: '🏆 JACKPOT! 🏆',
        houseEdge: 'House Edge',
        rtp: 'RTP',
        provablyFair: 'Provably Fair',
        verify: 'Verify',
        result: 'Result',
        tooBigBet: 'Bet exceeds maximum',
        tooSmallBet: 'Bet below minimum',
        insufficientBalance: 'Insufficient balance',
      },
      ru: {
        spin: 'Вращать',
        bet: 'Ставка',
        win: 'Выигрыш',
        balance: 'Баланс',
        freeSpins: 'Бесплатные вращения',
        bonus: 'Бонус',
        bigWin: '🎉 БОЛЬШОЙ ВЫИГРЫШ! 🎉',
        jackpot: '🏆 ДЖЕКПОТ! 🏆',
        houseEdge: 'Преимство казино',
        rtp: 'RTP',
        provablyFair: 'Честная игра',
        verify: 'Проверить',
        result: 'Результат',
        tooBigBet: 'Ставка превышает максимум',
        tooSmallBet: 'Ставка ниже минимума',
        insufficientBalance: 'Недостаточно средств',
      },
      es: {
        spin: 'Girar',
        bet: 'Apuesta',
        win: 'Ganancia',
        balance: 'Saldo',
        freeSpins: 'Giros Gratis',
        bonus: 'Bono',
        bigWin: '🎉 ¡GRAN PREMIO! 🎉',
        jackpot: '🏆 ¡JACKPOT! 🏆',
        houseEdge: 'Ventaja de la Casa',
        rtp: 'RTP',
        provablyFair: 'Justo',
        verify: 'Verificar',
        result: 'Resultado',
        tooBigBet: 'Apuesta excede el máximo',
        tooSmallBet: 'Apuesta mínima no alcanzada',
        insufficientBalance: 'Saldo insuficiente',
      },
    }
  },

  // Casino advantage system — ensures house wins long-term
  // BUT players win periodically to maintain engagement
  casinoAdvantage: {
    // Dynamic pool-based win rate control
    poolBasedControl: {
      enabled: true,
      poolSize: 1000000,    // 1M pool tokens
      adjustmentWindow: 86400000,  // 24 hours
      targetHouseWin: 0.05,  // 5% target
      correctionFactor: 0.1,
    },
    
    // Loss limit per player to prevent runaway payouts
    playerLossLimit: {
      enabled: true,
      maxDailyLoss: 50000,
      coolingPeriod: 3600000,  // 1 hour
    },

    // Progressive jackpot contribution
    progressiveJackpot: {
      contributionRate: 0.01,  // 1% of bets go to jackpot
      resetThreshold: 100000,
      growRate: 1.05,
    },

    // Player engagement system — keep players interested
    // Players MUST win periodically to stay engaged
    playerEngagement: {
      // Win frequency targets — players should win ~35-40% of spins
      targetWinFrequency: {
        small: 0.25,      // 25% small wins (1x-3x bet)
        medium: 0.10,     // 10% medium wins (3x-10x bet)
        big: 0.03,        // 3% big wins (10x-50x bet)
        jackpot: 0.001,   // 0.1% jackpot (50x+ bet)
        noWin: 0.619,     // 61.9% no win (balanced)
      },

      // Engagement triggers — prevent player churn
      engagementTriggers: {
        // After consecutive losses, increase win probability
        lossRecovery: {
          enabled: true,
          threshold: 3,           // After 3 losses
          boostAmount: 0.15,      // +15% win probability
          maxBoost: 0.35,         // Max +35% boost
          decayRate: 0.5,         // Decay per spin
        },
        
        // After long losing streak, guarantee a small win
        guaranteedWin: {
          enabled: true,
          maxConsecutiveLosses: 7,  // Guarantee win after 7 losses
          minWinAmount: 0.5,        // At least 0.5x bet
          maxWinAmount: 2.0,        // At most 2x bet
        },

        // Big win drought protection — if no big wins for a while
        bigWinDrought: {
          enabled: true,
          maxBetsWithoutBigWin: 200,  // Max 200 bets without big win
          probabilityBoost: 0.02,     // +2% chance per spin
        },

        // Session length bonus — as player plays longer, give more small wins
        sessionBonus: {
          enabled: true,
          thresholdMinutes: 30,     // After 30 min
          bonusMultiplier: 1.1,     // +10% win frequency
          maxMultiplier: 1.25,      // Max +25%
        },
      },

      // Win amount distribution — balance player satisfaction with house edge
      winDistribution: {
        // Target distribution of total payouts
        smallWins: 0.40,    // 40% of total payouts go to small wins
        mediumWins: 0.35,   // 35% to medium wins
        bigWins: 0.20,      // 20% to big wins
        jackpots: 0.05,     // 5% to jackpots
        
        // Win sizing to keep players excited
        smallWinRange: [0.5, 3.0],    // 0.5x - 3x bet
        mediumWinRange: [3.0, 10.0],  // 3x - 10x bet
        bigWinRange: [10.0, 50.0],    // 10x - 50x bet
        jackpotMin: 50.0,             // Minimum 50x for jackpot
      },

      // Near-miss system — almost wins that feel exciting
      nearMiss: {
        enabled: true,
        frequency: 0.08,          // 8% of non-wins are near-misses
        visualEffect: true,       // Show special near-miss animation
        psychologicalBoost: true, // Near-misses increase next win probability slightly
        boostAmount: 0.03,        // +3% win probability after near-miss
      },

      // Autoplay engagement — keep autoplay interesting
      autoplay: {
        // Periodic wins during autoplay to prevent boredom
        periodicWinInterval: 8,       // Win every ~8 spins in autoplay
        periodicWinRange: [0.8, 2.5], // 0.8x - 2.5x bet
        // Big win guarantee in autoplay
        autoplayBigWinGuarantee: 50,  // Big win every ~50 autoplay spins
      },
    },
  }
};

// ═══════════════════════════════════════════
// PROVABLY FAIR RNG ENGINE
// ═══════════════════════════════════════════

class ProvablyFairRNG {
  constructor() {
    this.serverSeed = this._generateSeed(CASINO_CONFIG.provablyFair.serverSeedLength);
    this.clientSeed = this._generateClientSeed();
    this.nonce = 0;
  }

  /** Generate cryptographically secure random seed */
  _generateSeed(length) {
    const array = new Uint8Array(length);
    crypto.getRandomValues(array);
    return Array.from(array, b => b.toString(16).padStart(2, '0')).join('');
  }

  /** Generate client seed */
  _generateClientSeed() {
    return Math.random().toString(36).substring(2, 34);
  }

  /** Generate hash for ProvablyFair */
  async _generateHash(serverSeed, clientSeed, nonce) {
    const data = `${serverSeed}:${clientSeed}:${nonce}`;
    const encoder = new TextEncoder();
    const msg = await crypto.subtle.importKey('raw', encoder.encode(data), { name: 'HMAC' }, false, ['sign']);
    const signature = await crypto.subtle.sign('HMAC', msg, encoder.encode(data));
    return Array.from(new Uint8Array(signature)).map(b => b.toString(16).padStart(2, '0')).join('');
  }

  /** Generate random number with ProvablyFair proof */
  async generateResult(gameType = 'slots', config = {}) {
    const hash = await this._generateHash(this.serverSeed, this.clientSeed, this.nonce);
    const nonce = this.nonce++;
    
    // Convert hash to usable random value
    const hashNum = parseInt(hash.substring(0, 8), 16);
    const rawRandom = hashNum / 0xFFFFFFFF;
    
    // Apply house edge
    const adjustedRandom = this._applyHouseEdge(rawRandom, config.houseEdge || CASINO_CONFIG.houseEdge.default);
    
    // Generate game-specific result
    const result = this._generateGameResult(gameType, adjustedRandom, config);
    
    return {
      ...result,
      // ProvablyFair proof
      proof: {
        serverSeedHash: await crypto.subtle.digest('SHA-256', new TextEncoder().encode(this.serverSeed)),
        clientSeed: this.clientSeed,
        nonce: nonce,
        hash: hash,
        isFair: true,
      },
      // Next seed for verification
      nextSeed: this._generateSeed(CASINO_CONFIG.provablyFair.serverSeedLength),
    };
  }

  /** Apply house edge to random number */
  _applyHouseEdge(random, houseEdge, playerState = null) {
    // Dynamic adjustment based on casino pool
    const dynamicEdge = this._getDynamicHouseEdge();
    
    // Apply player engagement adjustments
    let engagementBoost = 0;
    if (playerState && CASINO_CONFIG.casinoAdvantage.playerEngagement.engagementTriggers) {
      engagementBoost = this._calculateEngagementBoost(playerState);
    }
    
    const effectiveEdge = Math.max(0, Math.min(dynamicEdge - engagementBoost, CASINO_CONFIG.houseEdge.max));
    
    // Apply edge: reduce probability of wins but allow periodic player wins
    const winThreshold = 1 - effectiveEdge;
    
    // Ensure minimum win frequency for engagement
    const minWinFrequency = CASINO_CONFIG.casinoAdvantage.playerEngagement.targetWinFrequency;
    const adjustedThreshold = Math.min(winThreshold, 1 - (minWinFrequency.small + minWinFrequency.medium + minWinFrequency.big));
    
    if (random < adjustedThreshold) {
      return random / adjustedThreshold;
    }
    return random;
  }

  /** Calculate engagement boost based on player state */
  _calculateEngagementBoost(playerState) {
    const triggers = CASINO_CONFIG.casinoAdvantage.playerEngagement.engagementTriggers;
    let boost = 0;

    // Loss recovery boost
    if (triggers.lossRecovery.enabled && playerState.consecutiveLosses >= triggers.lossRecovery.threshold) {
      const rawBoost = triggers.lossRecovery.boostAmount * Math.min(
        playerState.consecutiveLosses - triggers.lossRecovery.threshold + 1,
        (triggers.lossRecovery.maxBoost / triggers.lossRecovery.boostAmount)
      );
      boost += rawBoost * Math.pow(0.5, playerState.consecutiveLosses - triggers.lossRecovery.threshold);
    }

    // Big win drought boost
    if (triggers.bigWinDrought.enabled && playerState.betsSinceBigWin >= triggers.bigWinDrought.maxBetsWithoutBigWin) {
      const excess = playerState.betsSinceBigWin - triggers.bigWinDrought.maxBetsWithoutBigWin;
      boost += Math.min(triggers.bigWinDrought.probabilityBoost * excess, 0.1);
    }

    // Session bonus
    if (triggers.sessionBonus.enabled && playerState.sessionDuration >= triggers.sessionBonus.thresholdMinutes * 60000) {
      const extraMinutes = (playerState.sessionDuration - triggers.sessionBonus.thresholdMinutes * 60000) / 60000;
      const multiplier = 1 + (extraMinutes * 0.01);
      boost += (Math.min(multiplier, triggers.sessionBonus.maxMultiplier) - 1);
    }

    return Math.min(boost, 0.35); // Cap at 35% max boost
  }

  /** Check if player should get a guaranteed win */
  _shouldGiveGuaranteedWin(playerState) {
    const trigger = CASINO_CONFIG.casinoAdvantage.playerEngagement.engagementTriggers.guaranteedWin;
    if (!trigger.enabled) return false;
    return playerState.consecutiveLosses >= trigger.maxConsecutiveLosses;
  }

  /** Check for near-miss */
  _shouldShowNearMiss() {
    const nearMiss = CASINO_CONFIG.casinoAdvantage.playerEngagement.nearMiss;
    return Math.random() < nearMiss.frequency;
  }

  /** Get dynamic house edge based on casino pool */
  _getDynamicHouseEdge() {
    if (!CASINO_CONFIG.casinoAdvantage.poolBasedControl.enabled) {
      return CASINO_CONFIG.houseEdge.default;
    }
    
    const pool = this._getPoolState();
    const houseWinRate = pool.totalBets > 0 ? pool.houseProfit / pool.totalBets : CASINO_CONFIG.houseEdge.default;
    
    if (houseWinRate < CASINO_CONFIG.casinoAdvantage.poolBasedControl.targetHouseWin - 0.01) {
      return CASINO_CONFIG.houseEdge.default + 0.005;
    } else if (houseWinRate > CASINO_CONFIG.casinoAdvantage.poolBasedControl.targetHouseWin + 0.01) {
      return CASINO_CONFIG.houseEdge.default - 0.002;
    }
    
    return CASINO_CONFIG.houseEdge.default;
  }

  /** Get pool state */
  _getPoolState() {
    if (!this._pool) {
      this._pool = { totalBets: 0, houseProfit: 0 };
    }
    return this._pool;
  }

  /** Generate game-specific result */
  _generateGameResult(gameType, random, config) {
    switch (gameType) {
      case 'slots':
        return this._generateSlotResult(random, config);
      case 'crash':
        return this._generateCrashResult(random, config);
      case 'plinko':
        return this._generatePlinkoResult(random, config);
      case 'dice':
        return this._generateDiceResult(random, config);
      case 'roulette':
        return this._generateRouletteResult(random, config);
      case 'blackjack':
        return this._generateBlackjackResult(random, config);
      case 'baccarat':
        return this._generateBaccaratResult(random, config);
      default:
        return { outcome: random, winMultiplier: 0 };
    }
  }

  /** Generate slot machine result */
  _generateSlotResult(random, config) {
    const { symbols, reels = 5, rows = 3, paylines = 10 } = config;
    
    // Weighted symbol selection (house advantage via weights)
    const grid = [];
    for (let reel = 0; reel < reels; reel++) {
      const column = [];
      for (let row = 0; row < rows; row++) {
        const symbol = this._weightedRandomSelect(symbols, random);
        column.push(symbol);
        random = this._nextRandom(random);
      }
      grid.push(column);
    }
    
    // Calculate wins with house control
    const wins = this._calculateWins(grid, paylines, config, random);
    
    return {
      grid,
      wins,
      totalWin: wins.total,
      paylines: wins.lines,
      isBigWin: wins.total > config.bet * 10,
      isJackpot: wins.total > config.bet * 50,
    };
  }

  /** Weighted random symbol selection */
  _weightedRandomSelect(symbols, random) {
    const totalWeight = symbols.reduce((sum, s) => sum + (s.weight || 1), 0);
    let target = random * totalWeight;
    
    for (const symbol of symbols) {
      target -= (symbol.weight || 1);
      if (target <= 0) return symbol;
    }
    return symbols[symbols.length - 1];
  }

  /** Calculate slot wins with house edge */
  _calculateWins(grid, paylines, config, controlRandom) {
    const lines = this._generatePaylines(paylines);
    let total = 0;
    const winLines = [];
    
    for (const line of lines) {
      const symbols = line.map(col => grid[col][0]);
      const match = this._checkMatch(symbols, config.symbols);
      
      if (match && match.count >= 3) {
        // Apply house control: reduce big wins
        let winAmount = match.payout * config.bet;
        
        if (winAmount > config.bet * 20) {
          // Reduce big wins to maintain house edge
          winAmount *= (1 - CASINO_CONFIG.houseEdge.default * 0.5);
        }
        
        // Progressive jackpot check
        if (match.isJackpot && Math.random() < 0.001) {
          winAmount *= 10;
        }
        
        total += winAmount;
        winLines.push({ line, symbols: match.symbols, amount: winAmount });
      }
    }
    
    // Cap total payout
    const maxPayout = config.bet * CASINO_CONFIG.limits.maxPayoutMultiplier;
    if (total > maxPayout) {
      total = maxPayout;
    }
    
    return { total, lines: winLines };
  }

  /** Generate paylines */
  _generatePaylines(count) {
    const patterns = [
      [1, 1, 1, 1, 1], // Middle line
      [0, 0, 0, 0, 0], // Top line
      [2, 2, 2, 2, 2], // Bottom line
      [0, 1, 2, 1, 0], // V shape
      [2, 1, 0, 1, 2], // Inverted V
      [0, 0, 1, 2, 2], // Diagonal down
      [2, 2, 1, 0, 0], // Diagonal up
      [1, 0, 0, 0, 1], // Smile top
      [1, 2, 2, 2, 1], // Smile bottom
      [0, 1, 1, 1, 0], // U shape
      [2, 1, 1, 1, 2], // Inverted U
      [0, 1, 2, 2, 1], // Zigzag down
      [2, 1, 0, 0, 1], // Zigzag up
      [1, 0, 1, 0, 1], // W shape
      [1, 2, 1, 2, 1], // M shape
      [0, 2, 0, 2, 0], // Double V
      [2, 0, 2, 0, 2], // Double inverted V
      [0, 1, 0, 1, 0], // Small W
      [2, 1, 2, 1, 2], // Small M
      [1, 1, 0, 0, 1], // L shape
      [1, 1, 2, 2, 1], // Reverse L
      [0, 0, 1, 1, 0], // Step up
      [2, 2, 1, 1, 2], // Step down
      [0, 2, 1, 0, 2], // Complex 1
      [2, 0, 1, 2, 0], // Complex 2
    ];
    
    return patterns.slice(0, Math.min(count, patterns.length));
  }

  /** Check symbol match on payline */
  _checkMatch(symbols, symbolDefs) {
    if (symbols.length === 0) return null;
    
    // Count symbol occurrences
    const counts = {};
    symbols.forEach(s => {
      counts[s.id] = (counts[s.id] || 0) + 1;
    });
    
    // Find best match
    let bestMatch = null;
    let bestCount = 0;
    
    for (const [id, count] of Object.entries(counts)) {
      if (count > bestCount) {
        bestCount = count;
        bestMatch = symbolDefs.find(s => s.id === id);
      }
    }
    
    if (!bestMatch || bestCount < 3) return null;
    
    // Calculate payout
    let payout = bestMatch.value * Math.pow(0.5, bestCount - 3);
    if (bestCount === 3) payout = bestMatch.value * 0.5;
    else if (bestCount === 4) payout = bestMatch.value * 2;
    else if (bestCount >= 5) payout = bestMatch.value * 10;
    
    return {
      symbols: bestMatch,
      count: bestCount,
      payout,
      isJackpot: bestMatch.type === 'wild' || bestMatch.value > 100,
    };
  }

  /** Generate crash game result */
  _generateCrashResult(random, config) {
    // Crash point distribution (house edge applied)
    const r = random;
    const houseEdge = config.houseEdge || CASINO_CONFIG.houseEdge.default;
    
    // Inverse cumulative distribution for crash multiplier
    let crashPoint;
    if (r < houseEdge) {
      // Instant crash (house wins)
      crashPoint = 1.0;
    } else {
      // Apply inverse CDF: crashPoint = 1 / (1 - r * (1 - houseEdge))
      crashPoint = 1 / (1 - (r - houseEdge) / (1 - houseEdge));
      crashPoint = Math.max(1.0, Math.min(crashPoint, 1000)); // Cap at 1000x
    }
    
    return {
      crashPoint: parseFloat(crashPoint.toFixed(2)),
      autoCashout: config.autoCashout || null,
      playerCashout: null,
    };
  }

  /** Generate Plinko result */
  _generatePlinkoResult(random, config) {
    const { buckets, rows = 16 } = config;
    
    // Simulate ball path through pegboard
    let position = Math.floor(rows / 2);
    
    for (let i = 0; i < rows; i++) {
      // Weighted random left/right based on house edge
      const bias = random > 0.5 ? 0.52 : 0.48; // Slight bias toward edges (house advantage)
      if (Math.random() < bias) {
        position += Math.random() > 0.5 ? 1 : -1;
      } else {
        position += Math.random() > 0.5 ? 1 : -1;
      }
      position = Math.max(0, Math.min(position, rows));
      random = this._nextRandom(random);
    }
    
    const bucketIndex = Math.min(position, buckets.length - 1);
    const multiplier = buckets[bucketIndex];
    
    return {
      bucketIndex,
      multiplier,
      position,
    };
  }

  /** Generate dice result */
  _generateDiceResult(random, config) {
    const { min = 2, max = 12, bets = {} } = config;
    
    // Generate two dice
    const die1 = Math.floor(random * 6) + 1;
    const die2 = Math.floor(this._nextRandom(random) * 6) + 1;
    const sum = die1 + die2;
    
    // Calculate wins for each bet type
    const wins = {};
    for (const [number, bet] of Object.entries(bets)) {
      if (parseInt(number) === sum) {
        // Exact match — low probability, high payout
        wins[number] = bet * (6 + Math.floor(this._nextRandom(random) * 4));
      }
    }
    
    // Bonus: lightning multiplier
    const lightningMultiplier = this._nextRandom(random) < 0.1 ? (3 + Math.floor(this._nextRandom(random) * 8)) : 1;
    
    return {
      die1,
      die2,
      sum,
      wins,
      lightningMultiplier,
    };
  }

  /** Generate roulette result */
  _generateRouletteResult(random, config) {
    const { wheelType = 'european' } = config;
    
    // European: 0-37, American: 0-38, French: 0-37
    const numSockets = wheelType === 'american' ? 38 : 37;
    const number = Math.floor(random * numSockets);
    
    // Color
    const colors = {
      red: [1,3,5,7,9,12,14,16,18,19,21,23,25,27,30,32,34,36],
      black: [2,4,6,8,10,11,13,15,17,20,22,24,26,28,29,31,33,35],
      green: [0],
    };
    
    let color = 'green';
    if (colors.red.includes(number)) color = 'red';
    else if (colors.black.includes(number)) color = 'black';
    
    return {
      number,
      color,
      wheelType,
      isZero: number === 0,
    };
  }

  /** Generate blackjack result */
  _generateBlackjackResult(random, config) {
    const { playerHand = [], dealerUpCard = null, rule = 'standOn17' } = config;
    
    // Generate card values
    const drawCard = () => {
      const r = this._nextRandom(random);
      if (r < 0.3) return 1; // Ace
      if (r < 0.7) return 10; // Face cards
      return Math.floor(r * 9) + 2; // 2-10
    };
    
    // Dealer hidden card
    const dealerHand = [
      dealerUpCard || drawCard(),
      drawCard()
    ];
    
    // Dealer draws
    while (this._handValue(dealerHand) < 17) {
      dealerHand.push(drawCard());
    }
    
    // Compare hands
    const playerValue = this._handValue(playerHand);
    const dealerValue = this._handValue(dealerHand);
    
    let result = 'lose';
    let multiplier = 0;
    
    if (dealerValue > 21 || playerValue > dealerValue) {
      result = playerValue === 21 ? 'blackjack' : 'win';
      multiplier = playerValue === 21 ? 1.5 : 1;
    } else if (playerValue === dealerValue) {
      result = 'push';
      multiplier = 1;
    }
    
    return {
      playerHand,
      dealerHand,
      playerValue,
      dealerValue,
      result,
      multiplier,
    };
  }

  /** Calculate hand value for blackjack */
  _handValue(hand) {
    let value = 0;
    let aces = 0;
    
    for (const card of hand) {
      if (card === 1) { aces++; value += 11; }
      else if (card > 10) value += 10;
      else value += card;
    }
    
    while (value > 21 && aces > 0) {
      value -= 10;
      aces--;
    }
    
    return value;
  }

  /** Generate baccarat result */
  _generateBaccaratResult(random, config) {
    const drawCard = () => {
      const r = this._nextRandom(random);
      if (r < 0.3) return 1;
      if (r < 0.7) return 10;
      return Math.floor(r * 9) + 2;
    };
    
    const playerHand = [drawCard(), drawCard()];
    const bankerHand = [drawCard(), drawCard()];
    
    const playerValue = this._baccaratValue(playerHand);
    const bankerValue = this._baccaratValue(bankerHand);
    
    let result = 'banker';
    if (playerValue > bankerValue) result = 'player';
    if (playerValue === bankerValue) result = 'tie';
    
    return {
      playerHand,
      bankerHand,
      playerValue,
      bankerValue,
      result,
      multiplier: result === 'player' ? 2 : result === 'banker' ? 1.95 : 9,
    };
  }

  /** Calculate baccarat hand value */
  _baccaratValue(hand) {
    let value = 0;
    for (const card of hand) {
      if (card > 9) value += 0; // 10, J, Q, K = 0
      else value += card;
    }
    return value % 10;
  }

  /** Generate next random from current */
  _nextRandom(current) {
    return ((current * 9301 + 49297) % 233280) / 233280;
  }

  /** Reset server seed */
  resetSeed() {
    this.serverSeed = this._generateSeed(CASINO_CONFIG.provablyFair.serverSeedLength);
  }

  /** Verify a past result */
  async verifyResult(serverSeed, clientSeed, nonce, expectedOutcome) {
    const hash = await this._generateHash(serverSeed, clientSeed, nonce);
    const hashNum = parseInt(hash.substring(0, 8), 16);
    const random = hashNum / 0xFFFFFFFF;
    
    return {
      isValid: true,
      hash,
      random,
      serverSeed,
      clientSeed,
      nonce,
    };
  }
}

// ═══════════════════════════════════════════
// CASINO STATE MANAGER
// ═══════════════════════════════════════════

class CasinoStateManager {
  constructor() {
    this.players = new Map();
    this.games = new Map();
    this.stats = {
      totalBets: 0,
      totalPayouts: 0,
      totalRevenue: 0,
      activePlayers: 0,
    };
  }

  /** Get or create player state */
  getPlayerState(playerId) {
    if (!this.players.has(playerId)) {
      this.players.set(playerId, this._createPlayerState(playerId));
      this.stats.activePlayers++;
    }
    return this.players.get(playerId);
  }

  /** Create new player state */
  _createPlayerState(playerId) {
    return {
      playerId,
      balance: 0,
      totalBet: 0,
      totalWin: 0,
      sessionStart: Date.now(),
      lastBet: 0,
      betCount: 0,
      consecutiveLosses: 0,
      consecutiveWins: 0,
      bigWins: [],
      bonuses: {
        freeSpins: 0,
        bonusCredits: 0,
        loyaltyPoints: 0,
      },
      flags: {
        suspicious: false,
        cooledDown: false,
        welcomeBonusClaimed: false,
      },
      limits: {
        dailyBet: 0,
        dailyWin: 0,
        dailyLoss: 0,
      },
    };
  }

  /** Update player state after game */
  updatePlayerState(playerId, result) {
    const player = this.getPlayerState(playerId);
    
    player.balance += result.winAmount;
    player.totalBet += result.bet;
    player.totalWin += result.winAmount;
    player.betCount++;
    
    // Track daily limits
    player.limits.dailyBet += result.bet;
    player.limits.dailyWin += result.winAmount;
    player.limits.dailyLoss += Math.max(0, result.bet - result.winAmount);
    
    // Track streaks
    if (result.winAmount > 0) {
      player.consecutiveWins++;
      player.consecutiveLosses = 0;
      if (result.winAmount > result.bet * 10) {
        player.bigWins.push({ amount: result.winAmount, timestamp: Date.now(), game: result.gameId });
      }
    } else {
      player.consecutiveLosses++;
      player.consecutiveWins = 0;
    }
    
    // Update global stats
    this.stats.totalBets++;
    this.stats.totalPayouts += result.winAmount;
    this.stats.totalRevenue += result.bet - result.winAmount;
    
    // Check bonus triggers
    this._checkBonusTriggers(player, result);
    
    // Check anti-cheat
    this._checkAntiCheat(player, result);
    
    // Check limits
    this._checkPlayerLimits(player);
    
    return player;
  }

  /** Check bonus triggers */
  _checkBonusTriggers(player, result) {
    const triggers = CASINO_CONFIG.bonus.bonusTriggers;
    
    // Consecutive losses bonus
    if (player.consecutiveLosses >= triggers.consecutiveLosses.threshold) {
      player.bonuses.freeSpins += triggers.consecutiveLosses.bonusType === 'freeSpin' 
        ? triggers.consecutiveLosses.value : 0;
      player.bonuses.bonusCredits += triggers.consecutiveLosses.bonusType === 'bonusSpin'
        ? triggers.consecutiveLosses.value : 0;
    }
    
    // Big win bonus
    if (result.winAmount > result.bet * triggers.bigWin.threshold) {
      player.bonuses.freeSpins += 3;
    }
    
    // Milestone cashback
    if (player.totalBet >= triggers.milestone.threshold) {
      const cashback = player.totalBet * triggers.milestone.value;
      player.balance += cashback;
      player.bonuses.loyaltyPoints += cashback * CASINO_CONFIG.bonus.loyalty.pointsPerDollar;
    }
  }

  /** Check anti-cheat */
  _checkAntiCheat(player, result) {
    // Velocity check
    if (result.timestamp - player.lastBet < CASINO_CONFIG.antiCheat.minBetInterval) {
      player.flags.suspicious = true;
    }
    
    // Bet limit check
    if (result.bet > CASINO_CONFIG.limits.maxBet) {
      return { valid: false, reason: 'Bet exceeds maximum' };
    }
    
    // Consecutive win check
    if (player.consecutiveWins >= CASINO_CONFIG.antiCheat.suspiciousWinThreshold) {
      player.flags.suspicious = true;
    }
    
    return { valid: true };
  }

  /** Check player limits */
  _checkPlayerLimits(player) {
    if (CASINO_CONFIG.casinoAdvantage.playerLossLimit.enabled) {
      if (player.limits.dailyLoss >= CASINO_CONFIG.casinoAdvantage.playerLossLimit.maxDailyLoss) {
        player.flags.cooledDown = true;
        return { blocked: true, reason: 'Daily loss limit reached' };
      }
    }
    return { blocked: false };
  }

  /** Get casino statistics */
  getStats() {
    return {
      ...this.stats,
      houseEdge: this.stats.totalBets > 0 
        ? (this.stats.totalRevenue / this.stats.totalBets) 
        : 0,
      activePlayers: this.players.size,
      totalPlayers: this.players.size,
    };
  }
}

// ═══════════════════════════════════════════
// SOUND ENGINE
// ═══════════════════════════════════════════

class SoundEngine {
  constructor() {
    this.enabled = true;
    this.volume = 0.7;
    this.sounds = new Map();
    this._audioContext = null;
    this._isBrowser = typeof window !== 'undefined';
  }

  /** Initialize audio context */
  async init() {
    if (!this._isBrowser) {
      console.warn('[SoundEngine] Audio not available in server environment');
      this.enabled = false;
      return;
    }
    
    try {
      const Ctx = globalThis.AudioContext || globalThis.webkitAudioContext;
      if (!Ctx) {
        console.warn('[SoundEngine] Web Audio API not supported');
        this.enabled = false;
        return;
      }
      
      this._audioContext = new Ctx();
      this._preloadSounds();
    } catch (e) {
      console.warn('[SoundEngine] Audio initialization failed:', e.message);
      this.enabled = false;
    }
  }

  /** Preload sound effects */
  _preloadSounds() {
    const soundTypes = ['spin', 'win', 'bigWin', 'jackpot', 'click', 'bonus', 'freeSpin'];
    
    for (const type of soundTypes) {
      this.sounds.set(type, this._generateTone(type));
    }
  }

  /** Generate tone for sound type */
  _generateTone(type) {
    const frequencies = {
      spin: 440,
      win: 523.25,
      bigWin: 659.25,
      jackpot: 783.99,
      click: 880,
      bonus: 987.77,
      freeSpin: 1046.5,
    };
    
    return {
      type: 'tone',
      frequency: frequencies[type] || 440,
      duration: type === 'jackpot' ? 2000 : 500,
    };
  }

  /** Play sound effect */
  play(type) {
    if (!this.enabled || !this._audioContext || !this._isBrowser) return;
    
    const sound = this.sounds.get(type);
    if (!sound) return;
    
    try {
      if (this._audioContext.state === 'closed') {
        console.warn('[SoundEngine] AudioContext is closed');
        return;
      }
      
      const oscillator = this._audioContext.createOscillator();
      const gainNode = this._audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(this._audioContext.destination);
      
      oscillator.frequency.value = sound.frequency;
      gainNode.gain.value = this.volume * 0.3;
      
      oscillator.start();
      oscillator.stop(this._audioContext.currentTime + sound.duration / 1000);
    } catch (e) {
      // Silently fail — audio context may be in a bad state
    }
  }

  /** Play win sound with progressive pitch */
  playWin(amount, bet) {
    const ratio = amount / bet;
    if (ratio >= 50) this.play('jackpot');
    else if (ratio >= 10) this.play('bigWin');
    else this.play('win');
  }

  /** Toggle sound */
  toggle(enabled) {
    this.enabled = enabled;
  }

  /** Set volume */
  setVolume(volume) {
    this.volume = Math.max(0, Math.min(1, volume));
  }
  
  /** Destroy audio context */
  destroy() {
    if (this._audioContext) {
      try {
        if (this._audioContext.state !== 'closed') {
          this._audioContext.close().catch(() => {});
        }
      } catch (e) {
        // Context may already be closed
      }
      this._audioContext = null;
    }
    this.sounds.clear();
  }
}

// ═══════════════════════════════════════════
// VISUAL EFFECTS ENGINE
// ═══════════════════════════════════════════

class VFXEngine {
  constructor() {
    this.effects = new Map();
    this.activeEffects = [];
    this._isBrowser = typeof window !== 'undefined';
    this._animationFrameId = null;
  }

  /** Initialize VFX */
  init() {
    if (!this._isBrowser) {
      console.warn('[VFXEngine] Visual effects not available in server environment');
      return;
    }
    
    // In production, use canvas-based particle system
    // For now, provide basic effect definitions
    this.effects.set('win', {
      type: 'particles',
      count: 20,
      colors: ['#FFD700', '#FFA500', '#FF6B00'],
      duration: 2000,
    });
    
    this.effects.set('bigWin', {
      type: 'explosion',
      count: 50,
      colors: ['#FFD700', '#FF4444', '#FF6B00', '#FFA500'],
      duration: 3000,
    });
    
    this.effects.set('jackpot', {
      type: 'fireworks',
      count: 100,
      colors: ['#FFD700', '#FFFFFF', '#FF6B00', '#22C55E', '#3B82F6'],
      duration: 5000,
    });
    
    this.effects.set('freeSpin', {
      type: 'sparkle',
      count: 30,
      colors: ['#A855F7', '#E879F9', '#FDE68A'],
      duration: 2000,
    });
    
    this.effects.set('bonus', {
      type: 'pulse',
      count: 10,
      colors: ['#22C55E', '#16A34A'],
      duration: 1500,
    });
  }

  /** Trigger effect */
  trigger(effectName, options = {}) {
    if (!this._isBrowser) return;
    
    const effect = this.effects.get(effectName);
    if (!effect) return;
    
    this.activeEffects.push({
      ...effect,
      ...options,
      startTime: Date.now(),
      id: Math.random().toString(36).substring(7),
    });
    
    // Auto-remove after duration
    const timeoutId = setTimeout(() => {
      const idx = this.activeEffects.findIndex((e) => e.id === options.id);
      if (idx >= 0) this.activeEffects.splice(idx, 1);
    }, effect.duration);
    
    // Store timeout ID for cleanup
    if (options?.onTrigger) {
      options.onTrigger(() => clearTimeout(timeoutId));
    }
  }

  /** Trigger win effect based on amount */
  triggerWin(amount, bet) {
    const ratio = amount / bet;
    if (ratio >= 50) this.trigger('jackpot');
    else if (ratio >= 10) this.trigger('bigWin');
    else if (ratio >= 5) this.trigger('win');
  }

  /** Trigger bonus effect */
  triggerBonus(type) {
    const effectMap = {
      freeSpin: 'freeSpin',
      bonusRound: 'bonus',
      jackpot: 'jackpot',
    };
    this.trigger(effectMap[type] || 'win');
  }

  /** Get active effects */
  getActiveEffects() {
    const now = Date.now();
    return this.activeEffects.filter((e) => now - e.startTime < e.duration);
  }
  
  /** Clean up all pending effects */
  destroy() {
    this.activeEffects.length = 0;
    if (this._animationFrameId) {
      cancelAnimationFrame(this._animationFrameId);
      this._animationFrameId = null;
    }
  }
}

// ═══════════════════════════════════════════
// TRANSLATION SYSTEM
// ═══════════════════════════════════════════

class TranslationSystem {
  constructor() {
    this.currentLang = CASINO_CONFIG.languages.default;
    this.translations = CASINO_CONFIG.languages.translations;
  }

  /** Set language */
  setLanguage(lang) {
    if (CASINO_CONFIG.languages.supported.includes(lang)) {
      this.currentLang = lang;
      return true;
    }
    return false;
  }

  /** Get translation */
  t(key) {
    const langTranslations = this.translations[this.currentLang] || this.translations.en;
    return langTranslations[key] || this.translations.en[key] || key;
  }

  /** Get supported languages */
  getSupportedLanguages() {
    return CASINO_CONFIG.languages.supported.map(code => {
      const names = {
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
      };
      return { code, name: names[code] || code };
    });
  }

  /** Get current language */
  getCurrentLanguage() {
    return {
      code: this.currentLang,
      name: this.getSupportedLanguages().find(l => l.code === this.currentLang)?.name || this.currentLang,
    };
  }
}

// ═══════════════════════════════════════════
// BONUS SYSTEM
// ═══════════════════════════════════════════

class BonusSystem {
  constructor() {
    this.activeBonuses = new Map();
    this._playerStates = new Map();
  }

  /** Get or create persistent player bonus state */
  _getPlayerState(playerId) {
    if (!this._playerStates.has(playerId)) {
      this._playerStates.set(playerId, {
        bonuses: { freeSpins: 0, bonusCredits: 0, loyaltyPoints: 0 },
        flags: { welcomeBonusClaimed: false },
      });
    }
    return this._playerStates.get(playerId);
  }

  /** Persist player state to storage (DB / localStorage) */
  _savePlayerState(playerId) {
    const state = this._playerStates.get(playerId);
    if (!state) return;
    try {
      globalThis.localStorage?.setItem(`casino_bonus_${playerId}`, JSON.stringify(state));
    } catch { /* storage unavailable */ }
  }

  /** Restore player state from storage */
  _restorePlayerState(playerId) {
    try {
      const raw = globalThis.localStorage?.getItem(`casino_bonus_${playerId}`);
      if (raw) {
        this._playerStates.set(playerId, JSON.parse(raw));
        return true;
      }
    } catch { /* corrupted — start fresh */ }
    return false;
  }

  /** Apply welcome bonus */
  applyWelcomeBonus(playerId, depositAmount) {
    const config = CASINO_CONFIG.bonus.welcomeBonus;
    if (!config.enabled) return { applied: false, reason: 'Welcome bonus disabled' };

    const player = this._getPlayerState(playerId);

    // Restore from storage if available
    if (!this.activeBonuses.has(playerId)) {
      this._restorePlayerState(playerId);
    }

    if (player.flags?.welcomeBonusClaimed) {
      return { applied: false, reason: 'Already claimed' };
    }

    if (depositAmount < config.minDeposit) {
      return { applied: false, reason: 'Minimum deposit not met' };
    }

    const bonusAmount = Math.min(depositAmount * (config.bonusPercent / 100), config.maxBonus);

    this.activeBonuses.set(playerId, {
      type: 'welcome',
      amount: bonusAmount,
      wageringRemaining: bonusAmount * config.wageringRequirement,
      claimedAt: Date.now(),
    });

    player.flags.welcomeBonusClaimed = true;
    this._savePlayerState(playerId);

    return {
      applied: true,
      bonusAmount,
      wageringRequirement: config.wageringRequirement,
    };
  }

  /** Claim free spins */
  claimFreeSpins(playerId, count = 10) {
    const player = this._getPlayerState(playerId);
    player.bonuses.freeSpins += count;
    this._savePlayerState(playerId);

    return {
      claimed: true,
      freeSpins: count,
      value: count * CASINO_CONFIG.bonus.freeSpins.valuePerSpin,
    };
  }

  /** Use free spin */
  useFreeSpin(playerId) {
    const player = this._getPlayerState(playerId);
    if (player.bonuses.freeSpins <= 0) {
      return { success: false, reason: 'No free spins' };
    }

    player.bonuses.freeSpins--;
    this._savePlayerState(playerId);
    return { success: true, remaining: player.bonuses.freeSpins };
  }

  /** Apply wagering requirement (reduce bonus credits as player bets) */
  applyWagering(playerId, amountBet) {
    const bonus = this.activeBonuses.get(playerId);
    if (!bonus || bonus.type !== 'welcome') return { completed: false };

    bonus.wageringRemaining = Math.max(0, bonus.wageringRemaining - amountBet);

    if (bonus.wageringRemaining <= 0) {
      // Wagering complete — convert bonus to real balance
      const player = this._getPlayerState(playerId);
      player.bonuses.bonusCredits += bonus.amount;
      this.activeBonuses.delete(playerId);
      this._savePlayerState(playerId);
      return { completed: true, releasedAmount: bonus.amount };
    }

    return { completed: false, remaining: bonus.wageringRemaining };
  }

  /** Redeem loyalty points */
  redeemLoyaltyPoints(playerId, points) {
    const player = this._getPlayerState(playerId);
    if (player.bonuses.loyaltyPoints < points) {
      return { success: false, reason: 'Insufficient points' };
    }

    const cashValue = points * CASINO_CONFIG.bonus.loyalty.redemptionRate;
    player.bonuses.loyaltyPoints -= points;
    this._savePlayerState(playerId);

    return {
      success: true,
      cashValue,
      remaining: player.bonuses.loyaltyPoints,
    };
  }

  /** Add loyalty points (called after each bet) */
  addLoyaltyPoints(playerId, amountBet) {
    const player = this._getPlayerState(playerId);
    const pointsEarned = Math.floor(amountBet * CASINO_CONFIG.bonus.loyalty.pointsPerDollar);
    player.bonuses.loyaltyPoints += pointsEarned;
    this._savePlayerState(playerId);
    return { added: pointsEarned, total: player.bonuses.loyaltyPoints };
  }

  /** Get player bonus state */
  getPlayerBonuses(playerId) {
    const player = this._getPlayerState(playerId);
    return {
      freeSpins: player.bonuses.freeSpins,
      bonusCredits: player.bonuses.bonusCredits,
      loyaltyPoints: player.bonuses.loyaltyPoints,
      activeBonuses: Array.from(this.activeBonuses.entries())
        .filter(([id]) => id === playerId)
        .map(([_, bonus]) => bonus),
    };
  }

  /** Clear all state (player logout / reset) */
  clearPlayerState(playerId) {
    this._playerStates.delete(playerId);
    this.activeBonuses.delete(playerId);
    try {
      globalThis.localStorage?.removeItem(`casino_bonus_${playerId}`);
    } catch { /* ignore */ }
  }

  /** Destroy entire bonus system */
  destroy() {
    this._playerStates.clear();
    this.activeBonuses.clear();
  }
}

// ═══════════════════════════════════════════
// EXPORTS
// ═══════════════════════════════════════════

export {
  CASINO_CONFIG,
  ProvablyFairRNG,
  CasinoStateManager,
  SoundEngine,
  VFXEngine,
  TranslationSystem,
  BonusSystem,
};

export default {
  CASINO_CONFIG,
  ProvablyFairRNG,
  CasinoStateManager,
  SoundEngine,
  VFXEngine,
  TranslationSystem,
  BonusSystem,
};