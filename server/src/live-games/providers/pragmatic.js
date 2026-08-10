// ═══════════════════════════════════════════════════════════
// PRAGMATIC PLAY LIVE PROVIDER CONFIGURATION  
// 9 Live Dealer Games — Baccarat, Roulette, Blackjack, Sic Bo, Game Shows
// ═══════════════════════════════════════════════════════════

const PRAGMATIC_CONFIG = {
  id: 'pragmatic',
  name: 'Pragmatic Play Live',
  
  games: [
    // ── Baccarat (3) ───────────────────────────────────────
    { id: 'pragmatic-lightning-baccarat', type: 'baccarat', variant: 'lightning', decks: 8, maxPlayers: 15, minBet: 50, maxBet: 500000, features: ['lightningMultipliers'], lightningConfig: { enabled: true, multipliers: [2, 3, 4, 5, 8] } },
    { id: 'pragmatic-speed-roulette', type: 'roulette', variant: 'speed', maxPlayers: 100, minBet: 25, maxBet: 1000000, spinDuration: 3000 },
    { id: 'pragmatic-auto-roulette', type: 'roulette', variant: 'auto', maxPlayers: 100, minBet: 25, maxBet: 1000000 },
    
    // ── Blackjack (2) ──────────────────────────────────────
    { id: 'pragmatic-blackjack-vip', type: 'blackjack', variant: 'vip', decks: 6, maxPlayers: 5, minBet: 1000, maxBet: 5000000, features: ['highLimits'] },
    { id: 'pragmatic-standard-blackjack', type: 'blackjack', variant: 'classic', decks: 6, maxPlayers: 7, minBet: 50, maxBet: 100000 },
    
    // ── Sic Bo (1) ─────────────────────────────────────────
    { id: 'pragmatic-super-sic-bo', type: 'sic-bo', variant: 'super', maxPlayers: 50, minBet: 25, maxBet: 250000, features: ['enhancedPayouts'] },
    
    // ── Baccarat Variants (2) ──────────────────────────────
    { id: 'pragmatic-lucky-6-baccarat', type: 'baccarat', variant: 'lucky-6', decks: 8, maxPlayers: 15, minBet: 50, maxBet: 500000, features: ['lucky6SideBet'] },
    { id: 'pragmatic-dragon-tiger-pro', type: 'dragon-tiger', variant: 'pro', maxPlayers: 50, minBet: 25, maxBet: 250000 },
    
    // ── Game Shows (1) ─────────────────────────────────────
    { id: 'pragmatic-cash-or-crash', type: 'game-show', variant: 'crash-game', maxPlayers: 200, minBet: 50, maxBet: 1000000, features: ['multiplierCrash'] },
  ],
  
  defaultConfig: {
    decks: 6,
    dealerLanguages: ['EN', 'RU', 'ES', 'PT'],
    streamQuality: '1080p',
    tablesPerGame: 2,
  },
};

export default PRAGMATIC_CONFIG;


