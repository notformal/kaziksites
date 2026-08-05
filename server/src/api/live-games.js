/**
 * Live Games API — Endpoints for 40+ live dealer games
 * 
 * Providers: Evolution Gaming • Pragmatic Play Live • Ezugi • Vivo Gaming • Endorphina
 * 
 * Endpoints:
 *   GET    /api/live-games/status              — System status
 *   GET    /api/live-games/tables              — List all tables
 *   POST   /api/live-games/tables              — Create a new table
 *   POST   /api/live-games/tables/:id/start    — Start a round
 *   GET    /api/live-games/tables/:id/history  — Game history
 *   GET    /api/live-games/players             — Active players (bots)
 *   GET    /api/live-games/providers           — Provider list
 *   GET    /api/live-games/games               — All 40+ games list
 *   POST   /api/live-games/simulate            — Simulate a round
 */

import { getLiveGamesEngine } from '../live-games/engine.js';

export function createLiveGameRoutes() {
  const router = {};

  /**
   * GET /api/live-games/status
   */
  router.status = (req, res) => {
    try {
      const engine = getLiveGamesEngine();
      res.json(engine.getStatus());
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  };

  /**
   * GET /api/live-games/tables
   */
  router.tables = (req, res) => {
    try {
      const engine = getLiveGamesEngine();
      res.json({ tables: engine.getTableList() });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  };

  /**
   * POST /api/live-games/create (legacy alias for tables)
   */
  router.create = (req, res) => {
    try {
      const engine = getLiveGamesEngine();
      const body = req.body || {};
      
      // Support both legacy format and new format
      const gameType = body.type || body.gameType || 'blackjack';
      const gameId = body.gameId || `${gameType}-table`;
      
      const table = engine.createTable({
        gameId,
        gameType,
        name: body.name || `${gameType} Table`,
        maxPlayers: body.maxPlayers || 200,
        minBet: body.minBet ? Math.floor(body.minBet * 100) : 50,
        maxBet: body.maxBet ? Math.floor(body.maxBet * 100) : 1000000,
        dealer: body.dealer,
        engineConfig: body.engineConfig || {},
      });
      
      res.status(201).json({
        tableId: table.id,
        gameId: table.gameId,
        gameType: table.gameType,
        name: table.name,
        minBet: table.minBet / 100,
        maxBet: table.maxBet / 100,
        message: 'Table created successfully',
      });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  };

  /**
   * POST /api/live-games/blackjack/start
   */
  router.startBlackjack = (req, res) => {
    try {
      const engine = getLiveGamesEngine();
      const body = req.body || {};
      const tableId = body.tableId;
      
      if (!tableId) {
        // Create a default blackjack table
        const table = engine.createTable({
          gameId: 'blackjack-table',
          gameType: 'blackjack',
          name: 'Blackjack Table',
          engineConfig: { decks: 6, dealerStandsOn17: true },
        });
        const result = engine.startRound(table.id);
        return res.json({ ...result, tableId: table.id });
      }
      
      const result = engine.startRound(tableId);
      if (!result) {
        return res.status(404).json({ error: 'Table not found' });
      }
      res.json(result);
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  };

  /**
   * POST /api/live-games/blackjack/deal
   */
  router.dealBlackjack = (req, res) => {
    try {
      const engine = getLiveGamesEngine();
      const body = req.body || {};
      const tableId = body.tableId;
      
      if (!tableId) {
        const table = engine.createTable({
          gameId: 'blackjack-deal',
          gameType: 'blackjack',
          name: 'Blackjack Deal Table',
          engineConfig: { decks: 6 },
        });
        const result = engine.startRound(table.id);
        return res.json({ ...result, tableId: table.id });
      }
      
      const result = engine.startRound(tableId);
      if (!result) {
        return res.status(404).json({ error: 'Table not found' });
      }
      res.json(result);
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  };

  /**
   * POST /api/live-games/roulette/spin
   */
  router.spinRoulette = (req, res) => {
    try {
      const engine = getLiveGamesEngine();
      const body = req.body || {};
      let tableId = body.tableId;
      
      if (!tableId) {
        // Find or create roulette table
        let table = Array.from(engine.tables.values()).find(t => t.gameType === 'roulette');
        if (!table) {
          table = engine.createTable({
            gameId: 'roulette-table',
            gameType: 'roulette',
            name: 'Roulette Table',
            engineConfig: { lightningNumbers: 0 },
          });
        }
        tableId = table.id;
      }
      
      const result = engine.startRound(tableId);
      if (!result) {
        return res.status(404).json({ error: 'Table not found' });
      }
      res.json(result);
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  };

  /**
   * POST /api/live-games/baccarat/play
   */
  router.playBaccarat = (req, res) => {
    try {
      const engine = getLiveGamesEngine();
      const body = req.body || {};
      let tableId = body.tableId;
      
      if (!tableId) {
        let table = Array.from(engine.tables.values()).find(t => t.gameType === 'baccarat');
        if (!table) {
          table = engine.createTable({
            gameId: 'baccarat-table',
            gameType: 'baccarat',
            name: 'Baccarat Table',
            engineConfig: { decks: 8 },
          });
        }
        tableId = table.id;
      }
      
      const result = engine.startRound(tableId);
      if (!result) {
        return res.status(404).json({ error: 'Table not found' });
      }
      res.json(result);
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  };

  /**
   * POST /api/live-games/gameshow/spin
   */
  router.spinGameShow = (req, res) => {
    try {
      const engine = getLiveGamesEngine();
      const body = req.body || {};
      const gameType = body.gameType || 'crazy-time';
      let tableId = body.tableId;
      
      if (!tableId) {
        let table = Array.from(engine.tables.values()).find(t => t.gameId === `${gameType}-table`);
        if (!table) {
          table = engine.createTable({
            gameId: `${gameType}-table`,
            gameType,
            name: `${gameType} Table`,
          });
        }
        tableId = table.id;
      }
      
      // Route to specific game show method
      let result;
      if (gameType === 'dream-catcher') {
        result = engine.spinDreamCatcher(tableId);
      } else if (gameType === 'crazy-time') {
        result = engine.playCrazyTime(tableId);
      } else if (gameType === 'monopoly-live') {
        result = engine.playMonopolyLive(tableId);
      } else {
        result = engine.startRound(tableId);
      }
      
      if (!result) {
        return res.status(404).json({ error: 'Table not found' });
      }
      res.json(result);
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  };

  /**
   * GET /api/live-games/:type/history
   */
  router.history = (req, res) => {
    try {
      const engine = getLiveGamesEngine();
      const { type } = req.params;
      const { tableId } = req.query;
      
      let table;
      if (tableId) {
        table = Array.from(engine.tables.values()).find(t => t.id === tableId);
      } else {
        table = Array.from(engine.tables.values()).find(t => t.gameType === type);
      }
      
      if (!table) {
        return res.json({ history: [], message: 'No tables found' });
      }
      
      res.json({ 
        type, 
        history: table.history.slice(0, 50), 
        count: table.history.length 
      });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  };

  /**
   * GET /api/live-games/:type/stats
   */
  router.stats = (req, res) => {
    try {
      const engine = getLiveGamesEngine();
      const { type } = req.params;
      
      const tablesOfType = Array.from(engine.tables.values()).filter(t => t.gameType === type);
      
      let stats = {
        totalTables: tablesOfType.length,
        totalRounds: tablesOfType.reduce((sum, t) => sum + t.history.length, 0),
        onlineAgents: engine.agentManager.getOnlineCount(),
      };
      
      res.json({ type, stats });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  };

  /**
   * GET /api/live-games/:type/tables
   */
  router.tablesByType = (req, res) => {
    try {
      const engine = getLiveGamesEngine();
      const { type } = req.params;
      
      const tables = Array.from(engine.tables.values())
        .filter(t => t.gameType === type)
        .map(t => ({
          id: t.id,
          name: t.name,
          minBet: t.minBet / 100,
          maxBet: t.maxBet / 100,
          status: t.status,
        }));
      
      res.json({ type, tables });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  };

  /**
   * DELETE /api/live-games/table/:tableId
   */
  router.deleteTable = (req, res) => {
    try {
      const engine = getLiveGamesEngine();
      const { tableId } = req.params;
      const deleted = engine.tables.delete(tableId);
      
      if (deleted) {
        res.json({ message: 'Table deleted', tableId });
      } else {
        res.status(404).json({ error: 'Table not found' });
      }
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  };

  return router;
}