/**
 * Sports API — Endpoints for sports betting system
 * 
 * Endpoints:
 *   GET    /api/sports                  — List all available sports
 *   GET    /api/sports/events           — Get upcoming events
 *   GET    /api/sports/events/:id       — Get event details with odds
 *   GET    /api/sports/live             — Get live events
 *   POST   /api/sports/bets/slip        — Add bet to slip
 *   GET    /api/sports/bets/slip        — Get bet slip
 *   POST   /api/sports/bets/submit      — Submit bet
 *   GET    /api/sports/bets/user        — Get user's bets
 *   POST   /api/sports/bets/:id/cashout — Cash out a bet
 */

import { SportsBettingEngine } from '../sports-betting/engine.js';

// Store engine instances (one per server instance)
let engineInstance = null;

export function createSportsRoutes() {
  const router = {};

  /** Set sports betting engine instance (called from app.js) */
  function setEngine(engine) {
    engineInstance = engine;
  }

  router.setEngine = setEngine;

  /**
   * GET /api/sports
   * List all available sports
   */
  router.sports = (req, res) => {
    if (!engineInstance) {
      return res.json({ sports: {}, message: 'Sports system not initialized' });
    }
    
    const sports = engineInstance.getSports();
    const formatted = {};
    
    for (const [key, sport] of Object.entries(sports)) {
      formatted[key] = {
        ...sport,
        eventCount: 0 // Will be populated by events endpoint
      };
    }
    
    res.json({ sports: formatted });
  };

  /**
   * GET /api/sports/events
   * Get upcoming/live events
   */
  router.events = (req, res) => {
    if (!engineInstance) {
      return res.json({ events: [], message: 'Sports system not initialized' });
    }
    
    const sport = req.query.sport || null;
    const status = req.query.status || 'upcoming';
    
    const events = engineInstance.getEvents(sport, status);
    
    // Add league info to each event
    const formatted = events.map(event => ({
      ...event,
      league: event.league || { name: 'Unknown' }
    }));
    
    res.json({ 
      events: formatted.slice(0, 100),
      count: formatted.length,
      sport,
      status
    });
  };

  /**
   * GET /api/sports/events/:id
   * Get event details with odds
   */
  router.eventDetails = (req, res) => {
    if (!engineInstance) {
      return res.json({ error: 'Sports system not initialized' });
    }
    
    const { id } = req.params;
    const event = engineInstance.getEvent(id);
    
    if (!event) {
      return res.status(404).json({ error: 'Event not found' });
    }
    
    const odds = engineInstance.getOdds(id);
    const isLive = event.status === 'live';
    const liveOdds = isLive ? engineInstance.getLiveOdds(id) : null;
    
    res.json({
      event: {
        ...event,
        league: event.league || { name: 'Unknown' }
      },
      odds: isLive && liveOdds ? liveOdds : odds,
      isLive
    });
  };

  /**
   * GET /api/sports/live
   * Get all live events
   */
  router.live = (req, res) => {
    if (!engineInstance) {
      return res.json({ events: [], message: 'Sports system not initialized' });
    }
    
    const liveEvents = engineInstance.getLiveEvents();
    
    res.json({
      events: liveEvents,
      count: liveEvents.length
    });
  };

  /**
   * POST /api/sports/bets/slip
   * Add bet to slip
   */
  router.addToSlip = (req, res) => {
    if (!engineInstance) {
      return res.status(503).json({ error: 'Sports system not initialized' });
    }
    
    const userId = req.user?.id || 'anonymous';
    const { selection, eventId, odds, betType, stake } = req.body;
    
    if (!selection || !eventId || !odds || !betType || !stake) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    
    try {
      const bet = engineInstance.addBetToSlip(userId, selection, eventId, odds, betType, stake);
      res.json({ bet });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  };

  /**
   * GET /api/sports/bets/slip
   * Get user's bet slip
   */
  router.getSlip = (req, res) => {
    if (!engineInstance) {
      return res.json({ error: 'Sports system not initialized' });
    }
    
    const userId = req.user?.id || 'anonymous';
    const summary = engineInstance.getSlipSummary(userId);
    
    res.json(summary);
  };

  /**
   * POST /api/sports/bets/slip/remove
   * Remove bet from slip
   */
  router.removeFromSlip = (req, res) => {
    if (!engineInstance) {
      return res.status(503).json({ error: 'Sports system not initialized' });
    }
    
    const userId = req.user?.id || 'anonymous';
    const { betId } = req.body;
    
    if (!betId) {
      return res.status(400).json({ error: 'betId required' });
    }
    
    engineInstance.removeBetFromSlip(userId, betId);
    res.json({ message: 'Bet removed from slip' });
  };

  /**
   * POST /api/sports/bets/submit
   * Submit bet for processing
   */
  router.submitBet = (req, res) => {
    if (!engineInstance) {
      return res.status(503).json({ error: 'Sports system not initialized' });
    }
    
    const userId = req.user?.id || 'anonymous';
    const { betId, idempotencyKey } = req.body;
    
    if (!betId) {
      return res.status(400).json({ error: 'betId required' });
    }
    
    try {
      const result = engineInstance.submitBet(userId, betId, idempotencyKey);
      
      if (result.error) {
        return res.status(400).json(result);
      }
      
      res.json(result);
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  };

  /**
   * GET /api/sports/bets/user
   * Get user's bet history
   */
  router.getUserBets = (req, res) => {
    if (!engineInstance) {
      return res.json({ bets: [], message: 'Sports system not initialized' });
    }
    
    const userId = req.user?.id || 'anonymous';
    const bets = engineInstance.getUserBets(userId);
    
    res.json({
      bets: bets.slice(0, 100),
      count: bets.length
    });
  };

  /**
   * POST /api/sports/bets/:id/cashout
   * Cash out a bet
   */
  router.cashout = (req, res) => {
    if (!engineInstance) {
      return res.status(503).json({ error: 'Sports system not initialized' });
    }
    
    const userId = req.user?.id || 'anonymous';
    const { id: betId } = req.params;
    const { currentOdds } = req.body;
    
    if (!currentOdds) {
      return res.status(400).json({ error: 'currentOdds required' });
    }
    
    try {
      const result = engineInstance.processCashout(userId, betId, currentOdds);
      
      if (result.error) {
        return res.status(400).json(result);
      }
      
      res.json(result);
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  };

  /**
   * GET /api/sports/bets/:id/cashout-value
   * Get cashout value for a bet
   */
  router.cashoutValue = (req, res) => {
    if (!engineInstance) {
      return res.json({ error: 'Sports system not initialized' });
    }
    
    const userId = req.user?.id || 'anonymous';
    const { id: betId } = req.params;
    const { currentOdds } = req.query;
    
    if (!currentOdds) {
      return res.status(400).json({ error: 'currentOdds query param required' });
    }
    
    const value = engineInstance.getCashoutValue(userId, betId, parseFloat(currentOdds));
    
    if (!value) {
      return res.status(404).json({ error: 'Cashout not available' });
    }
    
    res.json(value);
  };

  /**
   * POST /api/sports/live/start
   * Start live event simulation (admin)
   */
  router.startLive = (req, res) => {
    if (!engineInstance) {
      return res.status(503).json({ error: 'Sports system not initialized' });
    }
    
    engineInstance.startLiveSimulation();
    
    res.json({
      message: 'Live simulation started',
      liveEvents: engineInstance.getLiveEvents().length
    });
  };

  /**
   * POST /api/sports/live/stop
   * Stop live event simulation (admin)
   */
  router.stopLive = (req, res) => {
    if (!engineInstance) {
      return res.status(503).json({ error: 'Sports system not initialized' });
    }
    
    engineInstance.stopLiveSimulation();
    
    res.json({ message: 'Live simulation stopped' });
  };

  /**
   * GET /api/sports/leagues/:sport
   * Get leagues for a sport
   */
  router.leagues = (req, res) => {
    if (!engineInstance) {
      return res.json({ leagues: [], message: 'Sports system not initialized' });
    }
    
    const { sport } = req.params;
    const leagues = engineInstance.getLeagues(sport);
    
    res.json({ sport, leagues });
  };

  /**
   * GET /api/sports/status
   * Get system status
   */
  router.status = (req, res) => {
    if (!engineInstance) {
      return res.json({ status: 'not_initialized' });
    }
    
    res.json({
      status: 'running',
      liveEvents: engineInstance.getLiveEvents().length,
      timestamp: new Date().toISOString()
    });
  };

  return router;
}