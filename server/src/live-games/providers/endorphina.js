// ═══════════════════════════════════════════════════════════
// ENDORPHINA PROVIDER CONFIGURATION
// 5 Live Dealer Games — Poker, Dice, Roulette, Baccarat, Blackjack
// ═══════════════════════════════════════════════════════════

const ENDORPHINA_CONFIG = {
  id: 'endorphina',
  name: 'Endorphina',
  
  games: [
    { id: 'endorphina-live-poker', type: 'poker', variant: 'video-poker', maxPlayers: 7, minBet: 50, maxBet: 100000 },
    { id: 'endorphina-lightning-dice', type: 'dice', variant: 'lightning', maxPlayers: 50, minBet: 25, maxBet: 100000, features: ['lightningMultipliers'] },
    { id: 'endorphina-speed-roulette', type: 'roulette', variant: 'speed', maxPlayers: 100, minBet: 25, maxBet: 1000000, spinDuration: 3000 },
    { id: 'endorphina-baccarat-gold', type: 'baccarat', variant: 'gold', decks: 8, maxPlayers: 15, minBet: 100, maxBet: 1000000, features: ['goldenTable'] },
    { id: 'endorphina-blackjack-vip', type: 'blackjack', variant: 'vip', decks: 6, maxPlayers: 3, minBet: 500, maxBet: 2500000, features: ['highLimits', 'privateTable'] },
  ],
  
  defaultConfig: {
    decks: 6,
    dealerLanguages: ['EN', 'DE'],
    streamQuality: '720p',
    tablesPerGame: 1,
  },
};

export default ENDORPHINA_CONFIG;


