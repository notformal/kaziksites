// ═══════════════════════════════════════════════════════════
// VIVO GAMING PROVIDER CONFIGURATION
// 5 Live Dealer Games — Blackjack, Roulette, Baccarat, Poker, Sic Bo
// ═══════════════════════════════════════════════════════════

const VIVO_CONFIG = {
  id: 'vivo',
  name: 'Vivo Gaming',
  
  games: [
    { id: 'vivo-blackjack', type: 'blackjack', variant: 'classic', decks: 6, maxPlayers: 7, minBet: 50, maxBet: 100000 },
    { id: 'vivo-roulette', type: 'roulette', variant: 'standard', maxPlayers: 100, minBet: 25, maxBet: 1000000 },
    { id: 'vivo-baccarat', type: 'baccarat', variant: 'classic', decks: 8, maxPlayers: 15, minBet: 50, maxBet: 500000 },
    { id: 'vivo-casino-poker', type: 'poker', variant: 'casino-poker', maxPlayers: 7, minBet: 50, maxBet: 100000 },
    { id: 'vivo-sic-bo-live', type: 'sic-bo', variant: 'standard', maxPlayers: 50, minBet: 25, maxBet: 250000 },
  ],
  
  defaultConfig: {
    decks: 6,
    dealerLanguages: ['EN', 'ES', 'PT'],
    streamQuality: '720p',
    tablesPerGame: 1,
  },
};

export default VIVO_CONFIG;


