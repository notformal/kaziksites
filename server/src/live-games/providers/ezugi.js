// ═══════════════════════════════════════════════════════════
// EZUGI PROVIDER CONFIGURATION
// 6 Live Dealer Games — Sic Bo, Baccarat, Blackjack, Roulette, Poker
// ═══════════════════════════════════════════════════════════

const EZUGI_CONFIG = {
  id: 'ezugi',
  name: 'Ezugi',
  
  games: [
    { id: 'ezugi-lightning-sic-bo', type: 'sic-bo', variant: 'lightning', maxPlayers: 50, minBet: 25, maxBet: 250000, features: ['lightningBonus'] },
    { id: 'ezugi-speed-baccarat', type: 'baccarat', variant: 'speed', decks: 8, maxPlayers: 15, minBet: 50, maxBet: 500000 },
    { id: 'ezugi-asian-blackjack', type: 'blackjack', variant: 'asian', decks: 6, maxPlayers: 7, minBet: 50, maxBet: 100000, features: ['asianRules'] },
    { id: 'ezugi-auto-roulette', type: 'roulette', variant: 'auto', maxPlayers: 100, minBet: 25, maxBet: 1000000 },
    { id: 'ezugi-super-and-bachet', type: 'card-game', variant: 'and-bachet', maxPlayers: 7, minBet: 50, maxBet: 100000 },
    { id: 'ezugi-casino-stud-poker', type: 'poker', variant: 'stud', maxPlayers: 7, minBet: 50, maxBet: 100000 },
    { id: 'ezugi-no-commission-baccarat', type: 'baccarat', variant: 'no-commission', decks: 8, maxPlayers: 15, minBet: 50, maxBet: 500000, features: ['noCommission'] },
    { id: 'ezugi-fast-play-roulette', type: 'roulette', variant: 'fast', maxPlayers: 100, minBet: 25, maxBet: 1000000, spinDuration: 3000 },
  ],
  
  defaultConfig: {
    decks: 6,
    dealerLanguages: ['EN', 'RU', 'ES', 'PT'],
    streamQuality: '720p',
    tablesPerGame: 2,
  },
};

export default EZUGI_CONFIG;


