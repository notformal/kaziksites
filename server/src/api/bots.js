/**
 * Bots API — Endpoints for bot simulation system
 * 
 * Endpoints:
 *   GET  /api/bots/live        — Get list of live (simulated) players
 *   GET  /api/bots/feed        — Get recent simulation feed
 *   GET  /api/bots/stats       — Get bot system statistics
 *   POST /api/bots/spawn       — Manually spawn a new bot (admin)
 *   POST /api/bots/stop        — Stop all bots (admin)
 *   POST /api/bots/start       — Start bots (admin)
 */

export function createBotRoutes() {
  let botManagerInstance = null;

  /** Set bot manager instance (called from app.js) */
  function setBotManager(manager) {
    botManagerInstance = manager;
  }

  const router = { setBotManager };

  /**
   * GET /api/bots/live
   * Get list of currently "online" simulated players
   */
  router.live = (req, res) => {
    if (!botManagerInstance) {
      return res.json({ bots: [], message: 'Bot system not initialized' });
    }
    
    const livePlayers = botManagerInstance.getLivePlayers();
    
    // Shuffle to make it look more dynamic
    const shuffled = [...livePlayers].sort(() => Math.random() - 0.5);
    
    res.json({
      count: shuffled.length,
      players: shuffled.slice(0, 50), // Max 50 for performance
      timestamp: new Date().toISOString()
    });
  };

  /**
   * GET /api/bots/feed
   * Get recent simulation feed (bot actions)
   */
  router.feed = (req, res) => {
    if (!botManagerInstance) {
      return res.json({ feed: [], message: 'Bot system not initialized' });
    }
    
    const limit = Math.min(50, parseInt(req.query.limit) || 20);
    const feed = botManagerInstance.getRecentFeed(limit);
    
    res.json({
      feed,
      count: feed.length,
      timestamp: new Date().toISOString()
    });
  };

  /**
   * GET /api/bots/stats
   * Get bot system statistics
   */
  router.stats = (req, res) => {
    if (!botManagerInstance) {
      return res.json({ 
        error: 'Bot system not initialized',
        stats: { onlineBots: 0, totalBots: 0 }
      });
    }
    
    const stats = botManagerInstance.getStats();
    
    res.json({
      stats,
      timestamp: new Date().toISOString()
    });
  };

  /**
   * POST /api/bots/spawn
   * Manually spawn a new bot (admin only)
   */
  router.spawn = (req, res) => {
    if (!botManagerInstance) {
      return res.status(503).json({ error: 'Bot system not initialized' });
    }
    
    // Spawn logic is handled by the manager's tick cycle
    // This just triggers immediate spawn
    botManagerInstance.spawnBots();
    
    res.json({
      message: 'Bots spawned',
      onlineCount: botManagerInstance.getOnlineCount(),
      timestamp: new Date().toISOString()
    });
  };

  /**
   * POST /api/bots/start
   * Start the bot simulation (admin)
   */
  router.start = (req, res) => {
    if (!botManagerInstance) {
      return res.status(503).json({ error: 'Bot system not initialized' });
    }
    
    botManagerInstance.start();
    
    res.json({
      message: 'Bot simulation started',
      onlineCount: botManagerInstance.getOnlineCount(),
      timestamp: new Date().toISOString()
    });
  };

  /**
   * POST /api/bots/stop
   * Stop the bot simulation (admin)
   */
  router.stop = (req, res) => {
    if (!botManagerInstance) {
      return res.status(503).json({ error: 'Bot system not initialized' });
    }
    
    botManagerInstance.stop();
    
    res.json({
      message: 'Bot simulation stopped',
      timestamp: new Date().toISOString()
    });
  };

  return router;
}