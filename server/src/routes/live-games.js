// ═══════════════════════════════════════════════════════════
// LIVE GAMES API ROUTES
// Provides REST API for all 40+ live dealer games
// ═══════════════════════════════════════════════════════════

import { Router } from 'express';
import { getLiveGamesEngine } from '../live-games/engine.js';

const router = Router();

// ─── GET /api/live-games/status ──────────────────────────────
router.get('/status', (req, res) => {
  const engine = getLiveGamesEngine();
  res.json(engine.getStatus());
});

// ─── GET /api/live-games/tables ──────────────────────────────
router.get('/tables', (req, res) => {
  const engine = getLiveGamesEngine();
  res.json({ tables: engine.getTableList() });
});

// ─── POST /api/live-games/tables ─────────────────────────────
router.post('/tables', (req, res) => {
  const { gameId, gameType, name, maxPlayers, minBet, maxBet, dealer } = req.body;
  const engine = getLiveGamesEngine();
  
  const table = engine.createTable({
    gameId,
    gameType,
    name: name || `${gameId} Table`,
    maxPlayers: maxPlayers || 200,
    minBet: minBet || 0.5,
    maxBet: maxBet || 10000,
    dealer,
    engineConfig: req.body.engineConfig || {},
  });
  
  res.json({ table });
});

// ─── POST /api/live-games/tables/:tableId/start ──────────────
router.post('/tables/:tableId/start', (req, res) => {
  const { tableId } = req.params;
  const engine = getLiveGamesEngine();
  
  const result = engine.startRound(tableId);
  if (!result) {
    return res.status(404).json({ error: 'Table not found' });
  }
  
  res.json(result);
});

// ─── GET /api/live-games/tables/:tableId/history ─────────────
router.get('/tables/:tableId/history', (req, res) => {
  const { tableId } = req.params;
  const engine = getLiveGamesEngine();
  
  const table = Array.from(engine.tables.values()).find(t => t.id === tableId);
  if (!table) {
    return res.status(404).json({ error: 'Table not found' });
  }
  
  res.json({ history: table.history.slice(0, 50) });
});

// ─── GET /api/live-games/players ─────────────────────────────
router.get('/players', (req, res) => {
  const engine = getLiveGamesEngine();
  res.json({ players: engine.agentManager.getActivePlayers() });
});

// ─── GET /api/live-games/players/count ───────────────────────
router.get('/players/count', (req, res) => {
  const engine = getLiveGamesEngine();
  res.json({ count: engine.agentManager.getOnlineCount() });
});

// ─── POST /api/live-games/dream-catcher/:tableId/spin ────────
router.post('/dream-catcher/:tableId/spin', (req, res) => {
  const { tableId } = req.params;
  const engine = getLiveGamesEngine();
  
  const result = engine.spinDreamCatcher(tableId);
  if (!result) {
    return res.status(404).json({ error: 'Table not found' });
  }
  
  res.json(result);
});

// ─── POST /api/live-games/crazy-time/:tableId/play ───────────
router.post('/crazy-time/:tableId/play', (req, res) => {
  const { tableId } = req.params;
  const engine = getLiveGamesEngine();
  
  const result = engine.playCrazyTime(tableId);
  if (!result) {
    return res.status(404).json({ error: 'Table not found' });
  }
  
  res.json(result);
});

// ─── POST /api/live-games/monopoly-live/:tableId/play ────────
router.post('/monopoly-live/:tableId/play', (req, res) => {
  const { tableId } = req.params;
  const engine = getLiveGamesEngine();
  
  const result = engine.playMonopolyLive(tableId);
  if (!result) {
    return res.status(404).json({ error: 'Table not found' });
  }
  
  res.json(result);
});

// ─── GET /api/live-games/providers ───────────────────────────
router.get('/providers', (req, res) => {
  res.json({
    providers: [
      { id: 'evolution', name: 'Evolution Gaming', gameCount: 12 },
      { id: 'pragmatic', name: 'Pragmatic Play Live', gameCount: 10 },
      { id: 'ezugi', name: 'Ezugi', gameCount: 8 },
      { id: 'vivo', name: 'Vivo Gaming', gameCount: 5 },
      { id: 'endorphina', name: 'Endorphina', gameCount: 5 },
    ],
    totalGames: 40,
  });
});

// ─── GET /api/live-games/games ───────────────────────────────
router.get('/games', (req, res) => {
  res.json({
    games: [
      // Evolution Gaming
      { id: 'lightning-blackjack', name: 'Lightning Blackjack', provider: 'evolution', type: 'blackjack' },
      { id: 'mega-roulette', name: 'Mega Roulette', provider: 'evolution', type: 'roulette' },
      { id: 'speed-baccarat', name: 'Speed Baccarat', provider: 'evolution', type: 'baccarat' },
      { id: 'crazy-time', name: 'Crazy Time', provider: 'evolution', type: 'game-show' },
      { id: 'monopoly-live', name: 'Monopoly Live', provider: 'evolution', type: 'game-show' },
      { id: 'dream-catcher', name: 'Dream Catcher', provider: 'evolution', type: 'wheel' },
      { id: 'lightning-roulette', name: 'Lightning Roulette', provider: 'evolution', type: 'roulette' },
      { id: 'infinite-blackjack', name: 'Infinite Blackjack', provider: 'evolution', type: 'blackjack' },
      { id: 'auto-roulette', name: 'Auto Roulette', provider: 'evolution', type: 'roulette' },
      { id: 'casino-holdem', name: "Casino Hold'em", provider: 'evolution', type: 'poker' },
      { id: 'three-card-poker', name: 'Three Card Poker', provider: 'evolution', type: 'poker' },
      { id: 'power-blackjack', name: 'Power Blackjack', provider: 'evolution', type: 'blackjack' },
      // Pragmatic Play Live
      { id: 'pragmatic-lightning-baccarat', name: 'Pragmatic Lightning Baccarat', provider: 'pragmatic', type: 'baccarat' },
      { id: 'pragmatic-speed-roulette', name: 'Pragmatic Speed Roulette', provider: 'pragmatic', type: 'roulette' },
      { id: 'pragmatic-auto-roulette', name: 'Pragmatic Auto Roulette', provider: 'pragmatic', type: 'roulette' },
      { id: 'pragmatic-blackjack-vip', name: 'Pragmatic Blackjack VIP', provider: 'pragmatic', type: 'blackjack' },
      { id: 'pragmatic-standard-blackjack', name: 'Pragmatic Standard Blackjack', provider: 'pragmatic', type: 'blackjack' },
      { id: 'pragmatic-super-sic-bo', name: 'Pragmatic Super Sic Bo', provider: 'pragmatic', type: 'sic-bo' },
      { id: 'pragmatic-lucky-6-baccarat', name: 'Pragmatic Lucky 6 Baccarat', provider: 'pragmatic', type: 'baccarat' },
      { id: 'pragmatic-dragon-tiger-pro', name: 'Pragmatic Dragon Tiger Pro', provider: 'pragmatic', type: 'dragon-tiger' },
      { id: 'pragmatic-cash-or-crash', name: 'Pragmatic Cash or Crash Live', provider: 'pragmatic', type: 'game-show' },
      { id: 'pragmatic-wheel-fortune', name: 'Pragmatic Wheel of Fortune Live', provider: 'pragmatic', type: 'wheel' },
      // Ezugi
      { id: 'ezugi-lightning-sic-bo', name: 'Ezugi Lightning Sic Bo', provider: 'ezugi', type: 'sic-bo' },
      { id: 'ezugi-speed-baccarat', name: 'Ezugi Speed Baccarat', provider: 'ezugi', type: 'baccarat' },
      { id: 'ezugi-asian-blackjack', name: 'Ezugi Asian Blackjack', provider: 'ezugi', type: 'blackjack' },
      { id: 'ezugi-auto-roulette', name: 'Ezugi Auto Roulette', provider: 'ezugi', type: 'roulette' },
      { id: 'ezugi-super-and-bachet', name: 'Ezugi Super And Bachet', provider: 'ezugi', type: 'card-game' },
      { id: 'ezugi-casino-stud-poker', name: 'Ezugi Casino Stud Poker', provider: 'ezugi', type: 'poker' },
      { id: 'ezugi-no-commission-baccarat', name: 'Ezugi No Commission Baccarat', provider: 'ezugi', type: 'baccarat' },
      { id: 'ezugi-fast-play-roulette', name: 'Ezugi Fast Play Roulette', provider: 'ezugi', type: 'roulette' },
      // Vivo Gaming
      { id: 'vivo-blackjack', name: 'Vivo Live Blackjack', provider: 'vivo', type: 'blackjack' },
      { id: 'vivo-roulette', name: 'Vivo Live Roulette', provider: 'vivo', type: 'roulette' },
      { id: 'vivo-baccarat', name: 'Vivo Live Baccarat', provider: 'vivo', type: 'baccarat' },
      { id: 'vivo-casino-poker', name: 'Vivo Casino Poker', provider: 'vivo', type: 'poker' },
      { id: 'vivo-sic-bo', name: 'Vivo Sic Bo Live', provider: 'vivo', type: 'sic-bo' },
      // Endorphina
      { id: 'endorphina-live-poker', name: 'Endorphina Live Poker', provider: 'endorphina', type: 'poker' },
      { id: 'endorphina-lightning-dice', name: 'Endorphina Lightning Dice', provider: 'endorphina', type: 'dice' },
      { id: 'endorphina-speed-roulette', name: 'Endorphina Speed Roulette', provider: 'endorphina', type: 'roulette' },
      { id: 'endorphina-baccarat-gold', name: 'Endorphina Baccarat Gold', provider: 'endorphina', type: 'baccarat' },
      { id: 'endorphina-blackjack-vip', name: 'Endorphina Blackjack VIP Room', provider: 'endorphina', type: 'blackjack' },
    ],
  });
});

// ─── POST /api/live-games/simulate ───────────────────────────
router.post('/simulate', (req, res) => {
  const { gameType, gameId, agentCount = 50 } = req.body;
  const engine = getLiveGamesEngine();
  
  // Create table if needed
  let table = Array.from(engine.tables.values()).find(t => t.gameType === gameType);
  if (!table) {
    table = engine.createTable({
      gameId: gameId || `${gameType}-table`,
      gameType,
      name: `${gameType} Table`,
      engineConfig: req.body.engineConfig || {},
    });
  }
  
  // Ensure enough agents
  while (engine.agentManager.getOnlineCount() < agentCount) {
    const profileTypes = ['casual', 'regular', 'highRoller', 'vip'];
    engine.agentManager.createAgent(profileTypes[Math.floor(Math.random() * profileTypes.length)]);
  }
  
  // Start round
  const result = engine.startRound(table.id);
  
  res.json({
    tableId: table.id,
    gameType,
    result,
    botsOnline: engine.agentManager.getOnlineCount(),
    totalAgents: engine.agentManager.agents.size,
  });
});

export default router;