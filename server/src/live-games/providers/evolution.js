// ═══════════════════════════════════════════════════════════
// EVOLUTION GAMING PROVIDER CONFIGURATION
// 20 Live Dealer Games — Blackjack, Roulette, Baccarat, Poker, Game Shows
// ═══════════════════════════════════════════════════════════

const EVOLUTION_CONFIG = {
  id: 'evolution',
  name: 'Evolution Gaming',
  
  games: [
    // ── Blackjack (4) ──────────────────────────────────────
    { id: 'lightning-blackjack', type: 'blackjack', variant: 'lightning', decks: 6, maxPlayers: 7, minBet: 50, maxBet: 100000, features: ['lightningMultipliers'] },
    { id: 'infinite-blackjack', type: 'blackjack', variant: 'infinite', decks: 6, maxPlayers: Infinity, minBet: 50, maxBet: 100000, features: ['unlimitedSeats'] },
    { id: 'power-blackjack', type: 'blackjack', variant: 'power', decks: 8, maxPlayers: 7, minBet: 50, maxBet: 100000, features: ['doubleAfterSplit'] },
    { id: 'standard-blackjack', type: 'blackjack', variant: 'classic', decks: 6, maxPlayers: 7, minBet: 50, maxBet: 100000 },
    
    // ── Roulette (4) ───────────────────────────────────────
    { id: 'mega-roulette', type: 'roulette', variant: 'mega', maxPlayers: 100, minBet: 25, maxBet: 1000000, features: ['straightUpJackpot'] },
    { id: 'lightning-roulette', type: 'roulette', variant: 'lightning', maxPlayers: 100, minBet: 25, maxBet: 500000, features: ['lightningNumbers'], lightningConfig: { numbersCount: 5, multipliers: [50, 100, 200, 300, 400, 500] } },
    { id: 'auto-roulette', type: 'roulette', variant: 'auto', maxPlayers: 100, minBet: 25, maxBet: 1000000, features: ['noDealer'] },
    { id: 'speed-roulette', type: 'roulette', variant: 'speed', maxPlayers: 100, minBet: 25, maxBet: 1000000, spinDuration: 3000 },
    
    // ── Baccarat (2) ───────────────────────────────────────
    { id: 'speed-baccarat', type: 'baccarat', variant: 'speed', decks: 8, maxPlayers: 15, minBet: 50, maxBet: 500000 },
    { id: 'vip-baccarat', type: 'baccarat', variant: 'vip', decks: 8, maxPlayers: 5, minBet: 1000, maxBet: 5000000 },
    
    // ── Poker (3) ──────────────────────────────────────────
    { id: 'casino-holdem', type: 'poker', variant: 'texas-holdem', maxPlayers: 7, minBet: 50, maxBet: 100000 },
    { id: 'three-card-poker', type: 'poker', variant: 'three-card', maxPlayers: 7, minBet: 50, maxBet: 100000 },
    { id: 'caribbean-stud', type: 'poker', variant: 'caribbean-stud', maxPlayers: 7, minBet: 50, maxBet: 100000 },
    
    // ── Game Shows (4) ─────────────────────────────────────
    { id: 'crazy-time', type: 'game-show', variant: 'wheel-bonus', maxPlayers: 200, minBet: 50, maxBet: 1000000, bonusRounds: ['coin-flip', 'cash-hunt', 'pachinko', 'crazy-time'] },
    { id: 'monopoly-live', type: 'game-show', variant: 'wheel-bonus', maxPlayers: 200, minBet: 50, maxBet: 1000000 },
    { id: 'dream-catcher', type: 'game-show', variant: 'money-wheel', maxPlayers: 200, minBet: 10, maxBet: 500000 },
    { id: 'deal-or-no-deal-live', type: 'game-show', variant: 'case-selection', maxPlayers: 200, minBet: 50, maxBet: 1000000 },
    
    // ── Other (3) ──────────────────────────────────────────
    { id: 'sic-bo-supreme', type: 'sic-bo', variant: 'supreme', maxPlayers: 50, minBet: 25, maxBet: 250000 },
    { id: 'dragon-tiger-supreme', type: 'dragon-tiger', variant: 'supreme', maxPlayers: 50, minBet: 25, maxBet: 250000 },
    { id: 'blackjack-switzerland', type: 'blackjack', variant: 'regional', decks: 6, maxPlayers: 7, minBet: 50, maxBet: 100000 },
  ],
  
  defaultConfig: {
    decks: 6,
    dealerLanguages: ['EN', 'RU', 'ES', 'PT', 'DE'],
    streamQuality: '1080p',
    tablesPerGame: 3,
  },
};

export default EVOLUTION_CONFIG;


