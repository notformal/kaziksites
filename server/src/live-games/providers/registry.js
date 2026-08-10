// ═══════════════════════════════════════════════════════════
// LIVE GAMES PROVIDER REGISTRY
// Aggregates all provider configurations for easy access
// ═══════════════════════════════════════════════════════════

import EVOLUTION_CONFIG from './evolution.js';
import PRAGMATIC_CONFIG from './pragmatic.js';
import EZUGI_CONFIG from './ezugi.js';
import VIVO_CONFIG from './vivo.js';
import ENDORPHINA_CONFIG from './endorphina.js';

const PROVIDERS = {
  evolution: EVOLUTION_CONFIG,
  pragmatic: PRAGMATIC_CONFIG,
  ezugi: EZUGI_CONFIG,
  vivo: VIVO_CONFIG,
  endorphina: ENDORPHINA_CONFIG,
};

/**
 * Get all games from a specific provider
 */
function getProviderGames(providerId) {
  const provider = PROVIDERS[providerId];
  if (!provider) return [];
  return provider.games;
}

/**
 * Get all games across all providers
 */
function getAllGames() {
  const allGames = [];
  for (const [providerId, provider] of Object.entries(PROVIDERS)) {
    for (const game of provider.games) {
      allGames.push({ ...game, provider: providerId });
    }
  }
  return allGames;
}

/**
 * Get a specific game by ID
 */
function getGameById(gameId) {
  const allGames = getAllGames();
  return allGames.find(g => g.id === gameId) || null;
}

/**
 * Get games by type (blackjack, roulette, baccarat, etc.)
 */
function getGamesByType(type) {
  const allGames = getAllGames();
  return allGames.filter(g => g.type === type);
}

/**
 * Get provider summary statistics
 */
function getProviderStats() {
  const stats = {};
  for (const [providerId, provider] of Object.entries(PROVIDERS)) {
    stats[providerId] = {
      name: provider.name,
      gameCount: provider.games.length,
      types: [...new Set(provider.games.map(g => g.type))],
    };
  }
  return stats;
}

export { PROVIDERS, getProviderGames, getAllGames, getGameById, getGamesByType, getProviderStats };


