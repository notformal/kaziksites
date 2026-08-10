/**
 * Bot Simulation System — Имитация активности реальных игроков
 * Enhanced: More realistic behavior patterns, emotional states, brand-specific names
 */

import crypto from 'node:crypto';

// ─── Brand-Specific Bot Names & Avatars ──────────────────

const BRAND_CONFIGS = {
  aurora: {
    prefix: ['Nebula','Star','Cosmic','Aurora','Polaris','Nova','Orion','Zenith'],
    suffix: ['Voyager','Drifter','Wanderer','Seeker','Chaser','Runner','Flyer','Rider'],
    avatars: ['🌌','✨','💫','🔮','🌀','⚡','🪐','🌠'],
    colors: ['#7c3aed','#06b6d4','#a78bfa','#22d3ee'],
  },
  ember: {
    prefix: ['Flame','Blaze','Ember','Inferno','Pyro','Scorch','Sear','Cinder'],
    suffix: ['Blazer','Burner','Smasher','Crusher','Howler','Roarer','Stoker','Welder'],
    avatars: ['🔥','💥','⚡','🌋','☄️','🎆','🎇','💢'],
    colors: ['#ef4444','#f59e0b','#dc2626','#fb923c'],
  },
  royale: {
    prefix: ['Royal','Noble','Grand','Majestic','Imperial','Regal','Sovereign','Crown'],
    suffix: ['Monarch','Emperor','Queen','Duke','Lord','Baron','Knight','Prince'],
    avatars: ['👑','💎','🏆','🎩','⚜️','🦅','🛡️','🗡️'],
    colors: ['#d4a843','#f5d77a','#b8941f','#e8c547'],
  },
};

// ─── Global Fallback Names ──────────────────────────────

const GLOBAL_PREFIXES = ['Lucky','Win','Gold','Star','Royal','Mega','Super','Pro','Ace','Diamond','Platinum','Silver'];
const GLOBAL_SUFFIXES = ['Player','Gamer','Pro','Master','King','Queen','Ace','Chaser','Hunter','Boss','Wizard','Mage'];
const GLOBAL_AVATARS = ['🎰','🎲','🃏','♠️','♥️','♦️','♣️','🎯','💎','🔥','⚡','🌟','👑','🦁','🐉','🍀','🌈','⭐'];

/** Generate random bot name with brand context */
function generateName(brand) {
  const config = brand ? BRAND_CONFIGS[brand] : null;
  const pfx = config ? config.prefix : GLOBAL_PREFIXES;
  const sfx = config ? config.suffix : GLOBAL_SUFFIXES;
  const prefix = pfx[Math.floor(Math.random() * pfx.length)];
  const suffix = sfx[Math.floor(Math.random() * sfx.length)];
  const num = Math.floor(Math.random() * 999) + 1;
  return `${prefix}${num}_${suffix}`;
}

/** Generate random avatar with brand context */
function generateAvatar(brand) {
  const config = brand ? BRAND_CONFIGS[brand] : null;
  const avatars = config ? config.avatars : GLOBAL_AVATARS;
  return avatars[Math.floor(Math.random() * avatars.length)];
}

/** Generate accent color for brand */
function generateColor(brand) {
  const config = brand ? BRAND_CONFIGS[brand] : null;
  return config ? config.colors[Math.floor(Math.random() * config.colors.length)] : '#7c3aed';
}

// ─── Bot Profiles ─────────────────────────────────────────────

const BOT_PROFILES = {
  casual: {
    weight: 0.30,
    playStyle: 'conservative',
    betRange: [10, 500],      // cents
    sessionDuration: [300000, 1200000], // 5min - 20hr
    avgGamesPerSession: [5, 30],
    breakInterval: [30000, 180000], // 30s - 3min
  },
  regular: {
    weight: 0.40,
    playStyle: 'balanced',
    betRange: [50, 2000],
    sessionDuration: [600000, 3600000], // 10min - 1hr
    avgGamesPerSession: [10, 50],
    breakInterval: [60000, 300000], // 1min - 5min
  },
  highRoller: {
    weight: 0.20,
    playStyle: 'aggressive',
    betRange: [1000, 50000],
    sessionDuration: [900000, 7200000], // 15min - 2hr
    avgGamesPerSession: [20, 100],
    breakInterval: [15000, 120000], // 15s - 2min
  },
  bonusHunter: {
    weight: 0.10,
    playStyle: 'varied',
    betRange: [10, 1000],
    sessionDuration: [300000, 600000], // 5min - 10min
    avgGamesPerSession: [15, 40],
    breakInterval: [30000, 120000],
  }
};

function selectProfile() {
  const r = Math.random();
  let cumulative = 0;
  for (const [name, profile] of Object.entries(BOT_PROFILES)) {
    cumulative += profile.weight;
    if (r <= cumulative) return { name, ...profile };
  }
  return { name: 'regular', ...BOT_PROFILES.regular };
}

// ─── Bot Player Class ─────────────────────────────────────────

class BotPlayer {
  constructor(availableGames, config, brand) {
    this.id = `bot_${crypto.randomBytes(8).toString('hex')}`;
    this.name = generateName(brand);
    this.avatar = generateAvatar(brand);
    this.accentColor = generateColor(brand);
    
    const profile = selectProfile();
    this.profile = profile.name;
    this.playStyle = profile.playStyle;
    this.mood = 'happy'; // happy, cautious, excited, tired, greedy
    this.sessionDuration = config.randomRange(...profile.sessionDuration);
    this.balance = config.calculateStartingBalance(this.profile);
    this.favoriteGames = this.selectFavoriteGames(availableGames);
    this.currentGame = null;
    this.currentBet = 0;
    this.gamesPlayedInSession = 0;
    this.maxGamesInSession = config.randomRange(profile.avgGamesPerSession[0], profile.avgGamesPerSession[1]);
    this.isOnline = false;
    this.sessionStart = null;
    this.lastActive = Date.now();
    this.winningsHistory = [];
    
    // Emotional behavior flags with enhanced state machine
    this.onLossStreak = false;
    this.lossStreakCount = 0;
    this.onWinStreak = false;
    this.winStreakCount = 0;
    this.lastDecision = null;
    this.thinkingDelay = config.randomRange(500, 3000); // Simulate "thinking" time
    this.playSpeed = config.randomRange(2000, 8000); // Time between games
    
    // Personality traits
    this.tolerance = config.randomRange(0.1, 0.9); // How tolerant to losses before quitting
    this.winsNeededForQuit = config.randomRange(3, 8); // Wins needed after big loss to leave
    this.lossesBeforeQuit = Math.floor(config.randomRange(2, 6) * (1 + (1 - this.tolerance) * 3));
  }
  
  selectFavoriteGames(games) {
    // Each bot prefers 1-3 games
    const count = Math.floor(Math.random() * 3) + 1;
    const shuffled = [...games].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, count);
  }
  
  startSession() {
    this.isOnline = true;
    this.sessionStart = Date.now();
    this.gamesPlayedInSession = 0;
    this.onLossStreak = false;
    this.onWinStreak = false;
    this.lossStreakCount = 0;
    this.winStreakCount = 0;
    this.mood = 'happy';
    this.lastActive = Date.now();
  }
  
  /** Update emotional mood based on recent results */
  updateMood(lastWin, lastBet) {
    if (lastWin > lastBet * 5) this.mood = 'excited';
    else if (lastWin > lastBet * 2) this.mood = 'happy';
    else if (lastWin < lastBet * 0.1 && !this.onLossStreak) this.mood = 'cautious';
    else if (this.lossStreakCount >= 3) this.mood = 'greedy';
    else if (this.gamesPlayedInSession > this.maxGamesInSession * 0.8) this.mood = 'tired';
    else this.mood = 'happy';
    
    // Adjust play style based on mood
    if (this.mood === 'greedy') {
      // Increase bet sizes when greedy after loss streak
      const profile = BOT_PROFILES[this.profile];
      this.currentBet = Math.min(
        this.currentBet * 1.5, 
        profile.betRange[1]
      );
    } else if (this.mood === 'tired') {
      // Decrease bet sizes when tired
      this.currentBet = Math.max(
        this.currentBet * 0.7, 
        profile.betRange[0]
      );
    }
  }
  
  calculateBet() {
    const [min, max] = BOT_PROFILES[this.profile].betRange;
    let bet = config.randomRange(min, max);
    
    // Emotional betting: increase after losses (martingale-lite)
    if (this.onLossStreak && this.playStyle !== 'conservative') {
      bet = Math.min(bet * (1 + this.lossStreakCount * 0.2), max);
    }
    
    // After big win, decrease bet
    if (this.onWinStreak && this.winStreakCount > 2) {
      bet = Math.max(bet * 0.5, min);
    }
    
    return Math.round(bet / 10) * 10; // Round to nearest 10 cents
  }
  
  async playGame(gameId, mathEngine) {
    if (!this.isOnline) return null;
    
    this.currentGame = gameId;
    this.currentBet = this.calculateBet();
    
    // Ensure balance is enough
    if (this.currentBet > this.balance) {
      this.currentBet = Math.min(this.balance, BOT_PROFILES[this.profile].betRange[1]);
    }
    if (this.currentBet < 10) return null; // Min bet $0.10
    
    // Simulate game result using math engine
    let result;
    try {
      result = await mathEngine(gameId, this.currentBet);
    } catch (e) {
      // Fallback: simple slot simulation
      result = this.fallbackSimulation(this.currentBet);
    }
    
    const winAmount = result.totalWin || 0;
    const multiplier = this.currentBet > 0 ? winAmount / this.currentBet : 0;
    
    // Update balance
    this.balance = this.balance - this.currentBet + winAmount;
    
    // Track streaks
    if (winAmount > this.currentBet * 2) {
      this.onWinStreak = true;
      this.winStreakCount++;
      this.onLossStreak = false;
      this.lossStreakCount = 0;
    } else if (winAmount === 0) {
      this.onLossStreak = true;
      this.lossStreakCount++;
      this.onWinStreak = false;
      this.winStreakCount = 0;
    } else {
      this.onLossStreak = false;
      this.onWinStreak = false;
      this.lossStreakCount = 0;
      this.winStreakCount = 0;
    }
    
    this.winningsHistory.push({
      gameId,
      bet: this.currentBet,
      win: winAmount,
      multiplier,
      timestamp: Date.now()
    });
    
    this.gamesPlayedInSession++;
    this.lastActive = Date.now();
    
    return {
      botId: this.id,
      name: this.name,
      avatar: this.avatar,
      profile: this.profile,
      gameId,
      bet: this.currentBet / 100, // Convert to dollars
      win: winAmount / 100,
      multiplier: parseFloat(multiplier.toFixed(2)),
      balance: this.balance / 100,
      timestamp: new Date().toISOString()
    };
  }
  
  fallbackSimulation(bet) {
    // Simple slot-like simulation with ~96% RTP
    const rtp = 0.96;
    const isWin = Math.random() < (1 - Math.pow(1 - rtp, 1));
    
    if (!isWin || Math.random() > 0.05) { // 95% chance of no win or small win
      const winRate = 0.35; // 35% chance of any win
      if (Math.random() < winRate) {
        const multiplier = [1.5, 2, 3, 5, 10, 25][Math.floor(Math.random() * 6)];
        return { totalWin: Math.round(bet * multiplier) };
      }
    }
    
    return { totalWin: 0 };
  }
  
  shouldTakeBreak() {
    return Math.random() < 0.15; // 15% chance to take a break
  }
  
  shouldLeaveGame() {
    // Leave if on loss streak of 5+ or session end
    if (this.lossStreakCount >= 8 && this.playStyle !== 'aggressive') return true;
    if (this.gamesPlayedInSession >= this.maxGamesInSession) return true;
    if (Date.now() - this.sessionStart > this.sessionDuration) return true;
    return false;
  }
  
  endSession() {
    this.isOnline = false;
    this.currentGame = null;
    this.lastActive = Date.now();
  }
}

// ─── Bot Manager ──────────────────────────────────────────────

class BotManager {
  constructor(config) {
    this.config = config;
    this.bots = new Map();
    this.simulationFeed = [];
    this.maxBots = config.maxBots || 200;
    this.checkInterval = config.checkInterval || 5000; // 5 seconds
    this.running = false;
    this.intervalId = null;
    
    // Stats
    this.stats = {
      totalBotsCreated: 0,
      totalSimulatedBets: 0,
      totalSimulatedWinnings: 0,
      peakOnlineBots: 0
    };
  }
  
  /** Initialize bot manager */
  initialize(availableGames, mathEngine, brand) {
    this.availableGames = availableGames;
    this.mathEngine = mathEngine;
    this.brand = brand || null;
    
    // Create initial bot population with brand context
    this.spawnBots();
    
    return this;
  }
  
  /** Spawn new bots up to max */
  spawnBots() {
    const onlineCount = this.getOnlineCount();
    const targetOnline = Math.min(
      this.getMaxTargetOnline(),
      this.maxBots - this.bots.size
    );
    
    for (let i = 0; i < targetOnline; i++) {
      if (this.availableGames.length === 0) break;
      
      const bot = new BotPlayer(this.availableGames, {
        randomRange: (min, max) => Math.floor(Math.random() * (max - min + 1)) + min,
        calculateStartingBalance: (profile) => {
          switch (profile) {
            case 'highRoller': return config.randomRange(500000, 5000000); // $5k-$50k
            case 'regular': return config.randomRange(100000, 1000000);    // $1k-$10k
            case 'bonusHunter': return config.randomRange(200000, 500000); // $2k-$5k
            default: return config.randomRange(10000, 500000);             // $100-$5k
          }
        }
      }, this.brand);
      
      bot.startSession();
      this.bots.set(bot.id, bot);
      this.stats.totalBotsCreated++;
    }
    
    const online = this.getOnlineCount();
    if (online > this.stats.peakOnlineBots) {
      this.stats.peakOnlineBots = online;
    }
  }
  
  getMaxTargetOnline() {
    // Dynamic: scale based on config, min 20 bots always
    return Math.max(20, Math.floor(this.maxBots * (0.3 + Math.random() * 0.4)));
  }
  
  /** Main simulation loop */
  start() {
    if (this.running) return;
    this.running = true;
    
    this.intervalId = setInterval(() => this.tick(), this.checkInterval);
    console.log(`[BotManager] Started with ${this.getOnlineCount()} bots`);
  }
  
  stop() {
    this.running = false;
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    
    // End all bot sessions gracefully
    for (const bot of this.bots.values()) {
      bot.endSession();
    }
    console.log(`[BotManager] Stopped. Total simulated: ${this.stats.totalSimulatedBets} bets`);
  }
  
  /** Single simulation tick */
  async tick() {
    const onlineBots = Array.from(this.bots.values()).filter(b => b.isOnline);
    
    for (const bot of onlineBots) {
      // Decide: play, switch game, or leave
      const action = this.decideBotAction(bot);
      
      if (action === 'play' && !bot.currentGame) {
        const gameId = bot.favoriteGames[Math.floor(Math.random() * bot.favoriteGames.length)];
        try {
          // Simulate "thinking" delay for realism
          await new Promise(r => setTimeout(r, bot.thinkingDelay));
          
          const result = await bot.playGame(gameId, this.mathEngine);
          if (result) {
            // Update mood based on result
            bot.updateMood(result.win || 0, bot.currentBet);
            
            this.simulationFeed.push(result);
            this.stats.totalSimulatedBets += bot.currentBet;
            this.stats.totalSimulatedWinnings += result.win || 0;
            
            // Keep feed manageable
            if (this.simulationFeed.length > 100) {
              this.simulationFeed = this.simulationFeed.slice(-50);
            }
          }
        } catch (e) {
          console.error(`[BotManager] Error playing for ${bot.name}:`, e.message);
        }
      } else if (action === 'leave' && bot.currentGame) {
        bot.endSession();
      } else if (action === 'respawn') {
        bot.endSession();
      }
    }
    
    // Spawn new bots if needed
    if (this.bots.size < this.maxBots * 0.8) {
      this.spawnBots();
    }
    
    // Clean up offline bots that have been idle too long
    this.cleanupIdleBots();
  }
  
  decideBotAction(bot) {
    if (bot.shouldLeaveGame()) return 'leave';
    if (Math.random() < 0.02) return 'respawn'; // 2% chance to respawn
    
    // 40% chance to play each tick if not currently playing
    if (!bot.currentGame && Math.random() < 0.4) {
      return 'play';
    }
    
    return 'continue';
  }
  
  cleanupIdleBots() {
    const now = Date.now();
    for (const [id, bot] of this.bots) {
      if (!bot.isOnline && now - bot.lastActive > 3600000) { // 1 hour
        this.bots.delete(id);
      }
    }
  }
  
  /** Get simulated live players for display */
  getLivePlayers() {
    return Array.from(this.bots.values())
      .filter(b => b.isOnline)
      .map(b => ({
        id: b.id,
        name: b.name,
        avatar: b.avatar,
        accentColor: b.accentColor,
        profile: b.profile,
        mood: b.mood,
        currentGame: b.currentGame,
        balance: b.balance / 100,
        lastWin: b.winningsHistory[b.winningsHistory.length - 1]?.win / 100 || 0,
        gamesPlayed: b.winningsHistory.length,
        playSpeed: b.playSpeed,
        online: true,
        joinTimestamp: b.sessionStart,
      }));
  }
  
  /** Get recent simulation feed */
  getRecentFeed(limit = 20) {
    return this.simulationFeed.slice(-limit).reverse();
  }
  
  /** Get bot stats */
  getStats() {
    return {
      ...this.stats,
      onlineBots: this.getOnlineCount(),
      totalBots: this.bots.size,
      feedSize: this.simulationFeed.length
    };
  }
  
  getOnlineCount() {
    return Array.from(this.bots.values()).filter(b => b.isOnline).length;
  }
  
  /** Get bot data formatted for client display */
  getClientData() {
    return {
      bots: this.getLivePlayers(),
      recentFeed: this.getRecentFeed(10),
      stats: this.getStats()
    };
  }
}

// ─── Config Helpers ───────────────────────────────────────────

const config = {
  randomRange(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }
};

export { BotManager, BotPlayer, BOT_PROFILES };
export default BotManager;