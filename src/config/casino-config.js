// ═══════════════════════════════════════════════════════════
// CASINO CONFIG — House Edge, RNG, RTP, Balance Control
// Designed for casino profitability while maintaining engagement
// ═══════════════════════════════════════════════════════════

const CASINO_CONFIG = Object.freeze({
  // ─── Core Casino Settings ───
  version: '1.0.0',
  name: 'KazikSites Casino Platform',
  
  // ─── RNG Configuration ───
  rng: {
    // Cryptographically secure seed refresh interval (ms)
    seedRefreshInterval: 60000,
    // Minimum entropy requirement
    minEntropy: 128,
    // Provably fair config
    provablyFair: {
      serverSeed: null,  // Set at runtime
      clientSeed: null,  // Set at runtime
      nonce: 0,
    },
  },
  
  // ─── RTP (Return to Player) Configuration ───
  // Each game can have its own RTP, but default is here
  rtp: {
    default: 0.96,       // 96% RTP (4% house edge)
    min: 0.92,           // Minimum allowed RTP (8% house edge)
    max: 0.975,          // Maximum allowed RTP (2.5% house edge)
    // Target RTP per game type
    slots: 0.96,
    tableGames: 0.98,
    instant: 0.95,
    liveCasino: 0.97,
  },
  
  // ─── House Edge Configuration ───
  houseEdge: {
    default: 0.04,       // 4% default house edge
    min: 0.02,           // Minimum 2% house edge
    max: 0.08,           // Maximum 8% house edge
    // Per-game overrides (controlled by admin)
    gameOverrides: {
      'crash-pro': 0.04,
      'plinko-master': 0.03,
      'blackjack-pro': 0.01,
      'baccarat-pro': 0.01,
      'roulette-royale': 0.027,
      'slots-royal': 0.04,
      'dragons-fortune': 0.035,
      'cosmic-queen': 0.03,
      'pharaohs-treasure': 0.038,
      'fruit-shop': 0.04,
      'gold-caravan': 0.04,
      'lucky-streak': 0.045,
      'magic-crystal': 0.04,
      'hot-navigator': 0.04,
      'book-of-gold': 0.04,
      'lightning-dice': 0.05,
      'diamond-rush': 0.04,
      'wild-west-gold': 0.04,
    },
  },
  
  // ─── Balance Control System ───
  balanceControl: {
    // Enable/disable global balance control
    enabled: true,
    // Target house profit percentage (positive = casino profit)
    targetHouseProfitPct: 0.04,
    // Balance threshold for adjusting RTP
    balanceThresholds: {
      // If casino balance drops below this, increase house edge
      lowBalance: {
        threshold: 50000,
        houseEdgeBoost: 0.01,  // +1% house edge
      },
      // If casino balance exceeds this, decrease house edge (for retention)
      highBalance: {
        threshold: 500000,
        houseEdgeReduction: 0.005,  // -0.5% house edge
      },
    },
    // Payout caps per game
    maxPayout: {
      'crash-pro': 100000,
      'plinko-master': 50000,
      'slots-royal': 25000,
      'dragons-fortune': 25000,
      'cosmic-queen': 50000,
      'book-of-gold': 20000,
      'lightning-dice': 100000,
      'hot-navigator': 25000,
      'lucky-streak': 50000,
      default: 25000,
    },
  },
  
  // ─── Session Management ───
  session: {
    // Max session duration (ms)
    maxSessionTime: 3600000, // 1 hour
    // Auto-reset interval (ms)
    resetInterval: 1800000,  // 30 minutes
    // Initial player balance
    initialBalance: 10000,
    // Minimum/maximum bet ratios relative to balance
    minBetRatio: 0.001,
    maxBetRatio: 0.1,
  },
  
  // ─── Bonus & Engagement System ───
  bonus: {
    // Welcome bonus
    welcomeBonus: {
      enabled: true,
      amount: 1000,          // $1000 bonus
      type: 'deposit',       // deposit / free / matched
      wageringRequirement: 20, // x20 wagering
    },
    // Daily bonus
    dailyBonus: {
      enabled: true,
      amounts: [100, 200, 500, 1000, 2500], // Progressive daily amounts
      dayResetHour: 0,        // UTC hour
    },
    // Streak bonus (for consecutive plays)
    streakBonus: {
      enabled: true,
      thresholds: [3, 5, 10, 20],
      rewards: [50, 150, 500, 1500],
    },
    // Loss recovery bonus (small incentive after losses)
    lossRecovery: {
      enabled: true,
      triggerThreshold: 500,  // Loss $500+
      bonusAmount: 50,        // Give $50 bonus
      cooldownMs: 3600000,     // 1 hour cooldown
    },
    // VIP / Loyalty program
    vip: {
      enabled: true,
      levels: [
        { name: 'Bronze', minPoints: 0, cashback: 0.01, bonusMult: 1 },
        { name: 'Silver', minPoints: 1000, cashback: 0.02, bonusMult: 1.2 },
        { name: 'Gold', minPoints: 5000, cashback: 0.03, bonusMult: 1.5 },
        { name: 'Platinum', minPoints: 25000, cashback: 0.05, bonusMult: 2 },
        { name: 'Diamond', minPoints: 100000, cashback: 0.08, bonusMult: 3 },
      ],
    },
  },
  
  // ─── Engagement & Retention ───
  engagement: {
    // Near-miss detection (trigger bonus elements)
    nearMiss: {
      enabled: true,
      threshold: 0.95,  // 95% match = near miss
      bonusTrigger: true,
    },
    // Big win frequency target
    bigWinFrequency: {
      targetPerHour: 2,   // ~2 big wins per hour per player
      minBetRatio: 0.05,   // Minimum bet to qualify
    },
    // Loss limit protection (responsible gambling)
    lossLimit: {
      enabled: true,
      daily: 5000,
      weekly: 20000,
    },
    // Session warnings
    sessionWarning: {
      at5Min: true,
      at30Min: true,
      at60Min: true,
    },
  },
  
  // ─── Multi-language Support ───
  languages: {
    supported: ['en', 'ru', 'es', 'pt', 'fr', 'de', 'ja', 'ko', 'zh', 'ar'],
    default: 'en',
    rtl: ['ar'],  // Right-to-left languages
  },
  
  // ─── Sound & Visual Effects ───
  effects: {
    sound: {
      enabled: true,
      masterVolume: 0.5,
      maxConcurrentSounds: 8,
      // Sound categories
      categories: {
        win: { volume: 0.8, pitch: 1.0 },
        bigWin: { volume: 1.0, pitch: 1.2 },
        jackpot: { volume: 1.0, pitch: 1.5 },
        spin: { volume: 0.4, pitch: 1.0 },
        ui: { volume: 0.3, pitch: 1.0 },
        ambient: { volume: 0.2, pitch: 1.0 },
      },
    },
    vfx: {
      enabled: true,
      particles: {
        maxParticles: 100,
        winParticles: 30,
        bigWinParticles: 80,
        jackpotParticles: 150,
      },
      screenShake: {
        enabled: true,
        maxIntensity: 5,
      },
      flashEffects: {
        enabled: true,
        maxFlashes: 3,
      },
    },
  },
  
  // ─── Game-Specific Config ───
  games: Object.freeze({
    'crash-pro': {
      rtp: 0.96,
      houseEdge: 0.04,
      maxMultiplier: 1000,
      minBet: 0.10,
      maxBet: 25000,
      turboMode: true,
      autoCashout: { min: 1.1, max: 100 },
      provablyFair: true,
    },
    'plinko-master': {
      rtp: 0.97,
      houseEdge: 0.03,
      maxMultiplier: 1000,
      minBet: 0.10,
      maxBet: 10000,
      riskLevels: ['low', 'medium', 'high'],
      provablyFair: true,
    },
    'blackjack-pro': {
      rtp: 0.995,
      houseEdge: 0.005,
      maxBet: 25000,
      sideBets: true,
      perfectPairs: true,
      multiHand: true,
      provablyFair: false,
    },
    'baccarat-pro': {
      rtp: 0.9894,
      houseEdge: 0.0106,
      maxBet: 25000,
      sideBets: true,
      perfectPair: true,
      provablyFair: false,
    },
    'roulette-royale': {
      rtp: 0.973,
      houseEdge: 0.027,
      maxBet: 50000,
      wheels: ['european', 'american', 'french'],
      progressiveJackpot: true,
      provablyFair: false,
    },
    'slots-royal': {
      rtp: 0.96,
      houseEdge: 0.04,
      reels: 5,
      rows: 3,
      paylines: 10,
      maxJackpot: 50,
      freeSpins: 15,
      wildSymbols: true,
      provablyFair: true,
    },
    'dragons-fortune': {
      rtp: 0.965,
      houseEdge: 0.035,
      reels: 5,
      rows: 3,
      paylines: 20,
      maxJackpot: 100,
      freeSpins: 15,
      progressiveJackpot: true,
      bonusRounds: ['lantern', 'dragon'],
      provablyFair: true,
    },
    'cosmic-queen': {
      rtp: 0.968,
      houseEdge: 0.032,
      reels: 6,
      rows: 3,
      paylines: 40,
      maxMultiplier: 100,
      freeSpins: 20,
      stackedWilds: true,
      cosmicMeter: true,
      provablyFair: true,
    },
    'pharaohs-treasure': {
      rtp: 0.962,
      houseEdge: 0.038,
      reels: 5,
      rows: 3,
      paylines: 15,
      maxJackpot: 75,
      freeSpins: 10,
      pyramidBonus: true,
      provablyFair: true,
    },
    'fruit-shop': {
      rtp: 0.96,
      houseEdge: 0.04,
      reels: 5,
      rows: 3,
      paylines: 10,
      maxMultiplier: 50,
      freeSpins: 10,
      wildMultipliers: true,
      provablyFair: true,
    },
    'gold-caravan': {
      rtp: 0.96,
      houseEdge: 0.04,
      reels: 5,
      rows: 3,
      paylines: 15,
      maxMultiplier: 100,
      caravanBonus: true,
      provablyFair: true,
    },
    'lucky-streak': {
      rtp: 0.955,
      houseEdge: 0.045,
      dice: 2,
      maxMultiplier: 14,
      streakBonus: true,
      autoPlay: true,
      provablyFair: true,
    },
    'magic-crystal': {
      rtp: 0.96,
      houseEdge: 0.04,
      reels: 5,
      rows: 3,
      paylines: 20,
      maxMultiplier: 75,
      crystalBonus: true,
      provablyFair: true,
    },
    'hot-navigator': {
      rtp: 0.96,
      houseEdge: 0.04,
      reels: 5,
      rows: 3,
      paylines: 25,
      maxMultiplier: 200,
      hotStreak: true,
      fireMultipliers: true,
      freeFireSpins: 12,
      provablyFair: true,
    },
    'book-of-gold': {
      rtp: 0.96,
      houseEdge: 0.04,
      reels: 5,
      rows: 3,
      paylines: 10,
      maxMultiplier: 150,
      expandingSymbols: true,
      freeGames: 10,
      bookBonus: true,
      provablyFair: true,
    },
    'lightning-dice': {
      rtp: 0.95,
      houseEdge: 0.05,
      dice: 3,
      sumRange: [3, 18],
      maxLightningMult: 100,
      lightningZones: 3,
      progressiveJackpot: true,
      provablyFair: true,
    },
    'diamond-rush': {
      rtp: 0.96,
      houseEdge: 0.04,
      reels: 5,
      rows: 3,
      paylines: 20,
      maxMultiplier: 100,
      diamondBonus: true,
      provablyFair: true,
    },
    'wild-west-gold': {
      rtp: 0.962,
      houseEdge: 0.038,
      reels: 5,
      rows: 3,
      paylines: 15,
      maxMultiplier: 150,
      goldRushBonus: true,
      freeSpins: 10,
      provablyFair: true,
    },

    // ── Live Casino — Evolution Gaming ───────────────────────
    'lightning-blackjack': {
      rtp: 0.985,
      houseEdge: 0.015,
      maxBet: 10000,
      lightningMultipliers: [2, 3, 5, 10, 50, 100],
      sideBets: true,
      provablyFair: false,
    },
    'mega-roulette': {
      rtp: 0.973,
      houseEdge: 0.027,
      maxBet: 25000,
      progressiveJackpot: true,
      wheelType: 'european',
      provablyFair: false,
    },
    'speed-baccarat': {
      rtp: 0.989,
      houseEdge: 0.011,
      maxBet: 15000,
      roundDuration: 15000,
      noCommission: true,
      provablyFair: false,
    },
    'crazy-time': {
      rtp: 0.955,
      houseEdge: 0.045,
      maxBet: 5000,
      bonusRounds: ['coin-flip', 'cash-hunt', 'pachinko', 'crazy-time'],
      topSlotMultipliers: [2, 5, 10, 50, 100],
      provablyFair: false,
    },
    'monopoly-live': {
      rtp: 0.962,
      houseEdge: 0.038,
      maxBet: 5000,
      bonusType: '3d-board',
      doubleSegments: true,
      provablyFair: false,
    },
    'dream-catcher': {
      rtp: 0.9608,
      houseEdge: 0.0392,
      maxBet: 5000,
      wheelSegments: [1, 2, 5, 10, 20, 40, 70],
      doubleFlappers: true,
      provablyFair: false,
    },
    'lightning-roulette': {
      rtp: 0.973,
      houseEdge: 0.027,
      maxBet: 10000,
      lightningNumbers: 5,
      lightningMultipliers: [50, 100, 200, 300, 500],
      provablyFair: false,
    },
    'infinite-blackjack': {
      rtp: 0.996,
      houseEdge: 0.004,
      maxBet: 5000,
      unlimitedSeats: true,
      dealerStandsOn17: true,
      provablyFair: false,
    },
    'auto-roulette': {
      rtp: 0.973,
      houseEdge: 0.027,
      maxBet: 5000,
      automated: true,
      wheelType: 'european',
      provablyFair: false,
    },
    'casino-holdem': {
      rtp: 0.978,
      houseEdge: 0.022,
      maxBet: 5000,
      sideBet: 'ace-five',
      dealerQualifies: true,
      provablyFair: false,
    },
    'three-card-poker': {
      rtp: 0.9643,
      houseEdge: 0.0357,
      maxBet: 5000,
      sideBet: 'pair-plus',
      dealerQualifies: 'queen-or-better',
      provablyFair: false,
    },
    'power-blackjack': {
      rtp: 0.9928,
      houseEdge: 0.0072,
      maxBet: 10000,
      doubleOnAnyCards: true,
      splitOnce: true,
      provablyFair: false,
    },

    // ── Live Casino — Pragmatic Play Live ────────────────────
    'pragmatic-lightning-baccarat': {
      rtp: 0.9894,
      houseEdge: 0.0106,
      maxBet: 10000,
      lightningMultipliers: [2, 3, 5, 10, 25, 50, 100],
      provablyFair: false,
    },
    'pragmatic-speed-roulette': {
      rtp: 0.973,
      houseEdge: 0.027,
      maxBet: 10000,
      spinDuration: 25000,
      wheelType: 'european',
      provablyFair: false,
    },
    'pragmatic-auto-roulette': {
      rtp: 0.973,
      houseEdge: 0.027,
      maxBet: 5000,
      automated: true,
      wheelType: 'european',
      provablyFair: false,
    },
    'pragmatic-blackjack-vip': {
      rtp: 0.995,
      houseEdge: 0.005,
      maxBet: 25000,
      vipTable: true,
      sideBets: true,
      provablyFair: false,
    },
    'pragmatic-standard-blackjack': {
      rtp: 0.995,
      houseEdge: 0.005,
      maxBet: 5000,
      decks: 6,
      dealerStandsOn17: true,
      provablyFair: false,
    },
    'pragmatic-super-sic-bo': {
      rtp: 0.972,
      houseEdge: 0.028,
      maxBet: 5000,
      lightningMultipliers: [2, 5, 10, 25, 50, 100],
      diceCount: 3,
      provablyFair: false,
    },
    'pragmatic-lucky-6-baccarat': {
      rtp: 0.975,
      houseEdge: 0.025,
      maxBet: 5000,
      sideBets: ['lucky-6', 'dragon-bonus'],
      provablyFair: false,
    },
    'pragmatic-dragon-tiger-pro': {
      rtp: 0.9681,
      houseEdge: 0.0319,
      maxBet: 5000,
      sideBets: ['ora', 'perfect-pair'],
      provablyFair: false,
    },
    'pragmatic-cash-or-crash': {
      rtp: 0.958,
      houseEdge: 0.042,
      maxBet: 5000,
      multiplierLadder: true,
      crashMechanic: true,
      provablyFair: false,
    },
    'pragmatic-wheel-fortune': {
      rtp: 0.96,
      houseEdge: 0.04,
      maxBet: 5000,
      wheelSegments: [2, 5, 10, 20, 50, 100],
      bonusRounds: true,
      provablyFair: false,
    },

    // ── Live Casino — Ezugi ──────────────────────────────────
    'ezugi-lightning-sic-bo': {
      rtp: 0.972,
      houseEdge: 0.028,
      maxBet: 5000,
      lightningMultipliers: [2, 5, 10, 25, 50, 100],
      diceCount: 3,
      provablyFair: false,
    },
    'ezugi-speed-baccarat': {
      rtp: 0.989,
      houseEdge: 0.011,
      maxBet: 10000,
      roundDuration: 15000,
      noCommission: true,
      provablyFair: false,
    },
    'ezugi-asian-blackjack': {
      rtp: 0.985,
      houseEdge: 0.015,
      maxBet: 3000,
      doubleAfterSplit: true,
      asianRules: true,
      provablyFair: false,
    },
    'ezugi-auto-roulette': {
      rtp: 0.973,
      houseEdge: 0.027,
      maxBet: 5000,
      automated: true,
      wheelType: 'european',
      provablyFair: false,
    },
    'ezugi-super-and-bachet': {
      rtp: 0.96,
      houseEdge: 0.04,
      maxBet: 5000,
      asianCardGame: true,
      sideBets: true,
      provablyFair: false,
    },
    'ezugi-casino-stud-poker': {
      rtp: 0.9662,
      houseEdge: 0.0338,
      maxBet: 5000,
      variant: 'five-card-stud',
      anteBonus: true,
      provablyFair: false,
    },
    'ezugi-no-commission-baccarat': {
      rtp: 0.9894,
      houseEdge: 0.0106,
      maxBet: 10000,
      noCommission: true,
      dragonBonus: true,
      provablyFair: false,
    },
    'ezugi-fast-play-roulette': {
      rtp: 0.973,
      houseEdge: 0.027,
      maxBet: 5000,
      fastSpin: true,
      wheelType: 'european',
      provablyFair: false,
    },

    // ── Live Casino — Vivo Gaming ────────────────────────────
    'vivo-blackjack': {
      rtp: 0.995,
      houseEdge: 0.005,
      maxBet: 5000,
      decks: 6,
      dealerStandsOn17: true,
      provablyFair: false,
    },
    'vivo-roulette': {
      rtp: 0.973,
      houseEdge: 0.027,
      maxBet: 5000,
      wheelType: 'european',
      provablyFair: false,
    },
    'vivo-baccarat': {
      rtp: 0.989,
      houseEdge: 0.011,
      maxBet: 10000,
      decks: 8,
      commission: 0.05,
      provablyFair: false,
    },
    'vivo-casino-poker': {
      rtp: 0.965,
      houseEdge: 0.035,
      maxBet: 5000,
      variant: 'texas-holdem-style',
      communityCards: true,
      provablyFair: false,
    },
    'vivo-sic-bo': {
      rtp: 0.972,
      houseEdge: 0.028,
      maxBet: 5000,
      diceCount: 3,
      bigSmallBets: true,
      provablyFair: false,
    },

    // ── Live Casino — Endorphina ─────────────────────────────
    'endorphina-live-poker': {
      rtp: 0.973,
      houseEdge: 0.027,
      maxBet: 5000,
      multiHand: true,
      videoPokerStyle: true,
      provablyFair: false,
    },
    'endorphina-lightning-dice': {
      rtp: 0.962,
      houseEdge: 0.038,
      maxBet: 10000,
      lightningMultipliers: [10, 25, 50, 100],
      diceCount: 3,
      provablyFair: false,
    },
    'endorphina-speed-roulette': {
      rtp: 0.973,
      houseEdge: 0.027,
      maxBet: 5000,
      rapidSpin: true,
      wheelType: 'european',
      provablyFair: false,
    },
    'endorphina-baccarat-gold': {
      rtp: 0.989,
      houseEdge: 0.011,
      maxBet: 10000,
      noCommission: true,
      goldCardEffects: true,
      provablyFair: false,
    },
    'endorphina-blackjack-vip': {
      rtp: 0.995,
      houseEdge: 0.005,
      maxBet: 25000,
      vipRoom: true,
      premiumDealer: true,
      provablyFair: false,
    },
  }),
  
  // ─── Security ───
  security: {
    // Rate limiting
    maxBetsPerMinute: 60,
    maxTransactionsPerHour: 1000,
    // Anti-cheat
    detectBotBehavior: true,
    botDetectionThreshold: 0.9,
    // IP restrictions
    allowMultipleAccounts: false,
    geoRestrictions: [],
  },
  
  // ─── Player Engagement System ───
  // Players MUST win periodically to stay, but house wins long-term
  playerEngagement: {
    // Win frequency targets — players should win ~35-40% of spins
    winFrequency: {
      small: 0.25,      // 25% small wins (1x-3x bet) — feels frequent
      medium: 0.10,     // 10% medium wins (3x-10x bet) — feels exciting  
      big: 0.03,        // 3% big wins (10x-50x bet) — feels special
      jackpot: 0.001,   // 0.1% jackpot (50x+ bet) — feels legendary
      noWin: 0.619,     // 61.9% no win — balanced
    },

    // Loss recovery triggers — keep players from churning
    lossRecovery: {
      enabled: true,
      // After 3 losses, boost win probability
      threshold: 3,
      boostAmount: 0.15,      // +15% win probability
      maxBoost: 0.35,         // Max +35% boost
      decayRate: 0.5,         // Decay per spin
      // Guaranteed win after 7 consecutive losses
      guaranteedWin: {
        enabled: true,
        maxConsecutiveLosses: 7,
        minWinAmount: 0.5,    // At least 0.5x bet
        maxWinAmount: 2.0,    // At most 2x bet
      },
    },

    // Big win drought protection
    bigWinProtection: {
      enabled: true,
      maxBetsWithoutBigWin: 150,  // Max 150 bets without big win
      probabilityBoost: 0.01,     // +1% per spin after threshold
      maxBoost: 0.05,             // Max +5% boost
    },

    // Near-miss system — "almost won!" feels exciting
    nearMiss: {
      enabled: true,
      frequency: 0.08,          // 8% of non-wins are near-misses
      visualEffect: true,
      psychologicalBoost: true, // Near-misses increase next win probability
      boostAmount: 0.03,        // +3% win probability after near-miss
    },

    // Session length bonus — longer sessions = more small wins
    sessionBonus: {
      enabled: true,
      thresholdMinutes: 30,
      bonusMultiplier: 1.1,     // +10% win frequency after 30 min
      maxMultiplier: 1.25,      // Max +25%
    },

    // Autoplay engagement — keep autoplay interesting
    autoplay: {
      periodicWinInterval: 8,       // Win every ~8 spins in autoplay
      periodicWinRange: [0.8, 2.5], // 0.8x - 2.5x bet
      bigWinGuarantee: 50,          // Big win every ~50 autoplay spins
    },
  },

  // ─── Analytics ───
  analytics: {
    enabled: true,
    trackEvents: [
      'bet_placed',
      'spin_result',
      'win_achieved',
      'bonus_triggered',
      'free_spins_started',
      'session_start',
      'session_end',
      'deposit_made',
      'withdrawal_requested',
      'near_miss',
      'big_win',
      'loss_streak',
      'engagement_bonus',
    ],
    // Report interval (ms)
    reportInterval: 300000,  // 5 minutes
  },
});

// ─── Helper Functions ───

/**
 * Get effective house edge for a game
 */
function getEffectiveHouseEdge(gameId) {
  const baseEdge = CASINO_CONFIG.houseEdge.gameOverrides[gameId] || CASINO_CONFIG.houseEdge.default;
  
  if (!CASINO_CONFIG.balanceControl.enabled) return baseEdge;
  
  // Apply balance-based adjustments
  let adjustment = 0;
  const casinoBalance = getCasinoBalance();
  
  if (casinoBalance < CASINO_CONFIG.balanceControl.balanceThresholds.lowBalance.threshold) {
    adjustment += CASINO_CONFIG.balanceControl.balanceThresholds.lowBalance.houseEdgeBoost;
  } else if (casinoBalance > CASINO_CONFIG.balanceControl.balanceThresholds.highBalance.threshold) {
    adjustment -= CASINO_CONFIG.balanceControl.balanceThresholds.highBalance.houseEdgeReduction;
  }
  
  return Math.max(CASINO_CONFIG.houseEdge.min, Math.min(CASINO_CONFIG.houseEdge.max, baseEdge + adjustment));
}

/**
 * Get effective RTP for a game
 */
function getEffectiveRTP(gameId) {
  const houseEdge = getEffectiveHouseEdge(gameId);
  return 1 - houseEdge;
}

/**
 * Get max payout for a game
 */
function getMaxPayout(gameId) {
  return CASINO_CONFIG.games[gameId]?.maxPayout || CASINO_CONFIG.balanceControl.maxPayout.default || 25000;
}

/**
 * Calculate target RTP based on casino balance
 */
function calculateTargetRTP() {
  const casinoBalance = getCasinoBalance();
  const targetProfit = CASINO_CONFIG.balanceControl.targetHouseProfitPct;
  
  if (!casinoBalance) return CASINO_CONFIG.rtp.default;
  
  // Simple adjustment: if casino is losing, increase edge; if winning, decrease edge
  const balanceRatio = casinoBalance / 100000; // Normalized
  return Math.max(CASINO_CONFIG.rtp.min, Math.min(CASINO_CONFIG.rtp.max, targetProfit + balanceRatio * 0.01));
}

// ─── Casino Balance Tracker ───
let casinoBalance = 0;

function getCasinoBalance() {
  return casinoBalance;
}

function updateCasinoBalance(amount) {
  casinoBalance += amount;
}

// ─── Provably Fair RNG ───
class ProvablyFairRNG {
  constructor() {
    this.serverSeed = null;
    this.clientSeed = null;
    this.nonce = 0;
    this.refreshSeeds();
  }
  
  refreshSeeds() {
    // Generate cryptographically secure random seeds
    this.serverSeed = crypto.getRandomValues(new Uint8Array(32));
    this.clientSeed = crypto.getRandomValues(new Uint8Array(32));
    this.nonce = 0;
  }
  
  // Generate random number using HMAC-SHA256
  generateRandom() {
    // In production: use Web Crypto API with actual HMAC
    // For now, use crypto.getRandomValues
    const array = crypto.getRandomValues(new Uint32Array(1));
    this.nonce++;
    return array[0] / (0xFFFFFFFF + 1);
  }
  
  // Generate number in range [min, max)
  generateInt(min, max) {
    return Math.floor(this.generateRandom() * (max - min)) + min;
  }
  
  // Get hash for verification
  getHash() {
    return crypto.subtle.digest('SHA-256', this.serverSeed).then(h => {
      const arr = new Uint8Array(h);
      return Array.from(arr).map(b => b.toString(16).padStart(2, '0')).join('');
    });
  }
}

// ─── Game State Manager ───
class GameStateManager {
  constructor() {
    this.sessions = new Map();
  }
  
  createSession(userId) {
    const session = {
      userId,
      balance: CASINO_CONFIG.session.initialBalance,
      betCount: 0,
      totalBet: 0,
      totalWon: 0,
      startTime: Date.now(),
      lastActivity: Date.now(),
      streak: { current: 0, best: 0 },
      bonus: { lastLossRecovery: 0 },
      vip: { points: 0, level: 0 },
    };
    this.sessions.set(userId, session);
    return session;
  }
  
  getSession(userId) {
    let session = this.sessions.get(userId);
    if (!session) session = this.createSession(userId);
    session.lastActivity = Date.now();
    return session;
  }
  
  updateSession(userId, bet, win) {
    const session = this.getSession(userId);
    session.betCount++;
    session.totalBet += bet;
    session.totalWon += win;
    
    // Track streak
    if (win > bet) {
      session.streak.current++;
      if (session.streak.current > session.streak.best) {
        session.streak.best = session.streak.current;
      }
    } else {
      session.streak.current = 0;
    }
    
    // VIP points
    session.vip.points += bet * 0.01;
    
    // Check loss recovery bonus
    const netLoss = session.totalBet - session.totalWon;
    if (netLoss >= 500) {
      const now = Date.now();
      if (now - session.bonus.lastLossRecovery > 3600000) {
        session.bonus.lastLossRecovery = now;
        session.balance += 50;
      }
    }
    
    return session;
  }
  
  getNetProfit(userId) {
    const session = this.getSession(userId);
    return session.totalBet - session.totalWon;
  }
}

// ─── Export ───
const provablyFairRNG = new ProvablyFairRNG();
const gameStateManager = new GameStateManager();

export {
  CASINO_CONFIG,
  getEffectiveHouseEdge,
  getEffectiveRTP,
  getMaxPayout,
  calculateTargetRTP,
  getCasinoBalance,
  updateCasinoBalance,
  provablyFairRNG,
  gameStateManager,
};