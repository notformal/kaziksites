/**
 * Analytics System — Платформенная аналитика и отслеживание событий
 * 
 * Компоненты:
 * - Event Tracking (игровые события, пользовательские действия)
 * - Real-time Dashboard (текущая статистика платформы)
 * - Player Profiling (профили игроков)
 * - Game Analytics (аналитика по играм)
 * - Revenue Reports (финансовые отчеты)
 * - Fraud Detection (базовое обнаружение мошенничества)
 */

import crypto from 'node:crypto';

// ─── Event Types ──────────────────────────────────────────────

const EVENT_TYPES = {
  // Game events
  GAME_SESSION_START: 'game_session_start',
  GAME_SPIN: 'game_spin',
  GAME_WIN: 'game_win',
  GAME_BIG_WIN: 'game_big_win',
  GAME_SESSION_END: 'game_session_end',
  
  // User events
  USER_REGISTER: 'user_register',
  USER_LOGIN: 'user_login',
  USER_LOGOUT: 'user_logout',
  USER_DAILY_REWARD: 'user_daily_reward',
  
  // Betting events (sports)
  BET_PLACED: 'bet_placed',
  BET_SETTLED: 'bet_settled',
  BET_CASHED_OUT: 'bet_cashed_out',
  
  // Financial events
  DEPOSIT: 'deposit',
  WITHDRAWAL: 'withdrawal',
  
  // System events
  SYSTEM_HEALTH_CHECK: 'system_health_check'
};

// ─── Analytics Event Class ────────────────────────────────────

class AnalyticsEvent {
  constructor(userId, eventType, properties = {}) {
    this.eventId = crypto.randomBytes(16).toString('hex');
    this.userId = userId || 'anonymous';
    this.eventType = eventType;
    this.properties = {
      timestamp: new Date().toISOString(),
      platform: properties.platform || 'web',
      userAgent: properties.userAgent || 'unknown',
      ...properties
    };
    this.sessionId = properties.sessionId || crypto.randomBytes(8).toString('hex');
  }
  
  toJSON() {
    return {
      eventId: this.eventId,
      userId: this.userId,
      eventType: this.eventType,
      properties: this.properties,
      sessionId: this.sessionId
    };
  }
}

// ─── Event Stream (In-memory buffer) ─────────────────────────

class EventStream {
  constructor(maxSize = 10000) {
    this.events = [];
    this.maxSize = maxSize;
    this.listeners = new Map();
  }
  
  /** Add event to stream */
  push(event) {
    this.events.push(event);
    
    // Trim if too large
    if (this.events.length > this.maxSize) {
      this.events = this.events.slice(-Math.floor(this.maxSize * 0.7));
    }
    
    // Notify listeners
    for (const [name, listener] of this.listeners) {
      try {
        listener(event);
      } catch (e) {
        console.error(`[EventStream] Error in listener "${name}":`, e.message);
      }
    }
  }
  
  /** Subscribe to events */
  subscribe(name, listener) {
    this.listeners.set(name, listener);
    return () => this.listeners.delete(name); // Unsubscribe
  }
  
  /** Get recent events */
  getRecent(limit = 100, eventType = null) {
    let events = this.events;
    if (eventType) {
      events = events.filter(e => e.eventType === eventType);
    }
    return events.slice(-limit).reverse();
  }
  
  /** Get event count by type */
  getCountByType() {
    const counts = {};
    for (const event of this.events) {
      counts[event.eventType] = (counts[event.eventType] || 0) + 1;
    }
    return counts;
  }
  
  /** Clear old events (keep last hour) */
  cleanup() {
    const oneHourAgo = Date.now() - 3600000;
    this.events = this.events.filter(e => new Date(e.properties.timestamp).getTime() > oneHourAgo);
  }
}

// ─── Player Profile Tracker ──────────────────────────────────

class PlayerProfileTracker {
  constructor(db) {
    this.db = db;
    this.profiles = new Map(); // In-memory cache
  }
  
  /** Track a player action */
  trackAction(userId, action, metadata = {}) {
    if (!this.profiles.has(userId)) {
      this.profiles.set(userId, this.loadOrCreateProfile(userId));
    }
    
    const profile = this.profiles.get(userId);
    
    // Update profile stats
    profile.lastAction = Date.now();
    profile.totalActions++;
    profile.actions.push({ action, metadata, timestamp: Date.now() });
    
    // Keep actions manageable
    if (profile.actions.length > 100) {
      profile.actions = profile.actions.slice(-50);
    }
    
    // Track specific metrics
    if (action === 'game_spin') {
      profile.totalSpins++;
      profile.totalBet += metadata.betAmount || 0;
      profile.totalWon += metadata.winAmount || 0;
      
      if (metadata.gameId) {
        profile.gamesPlayed[metadata.gameId] = (profile.gamesPlayed[metadata.gameId] || 0) + 1;
      }
    }
    
    if (action === 'big_win') {
      profile.bigWins++;
      profile.biggestWin = Math.max(profile.biggestWin || 0, metadata.winAmount || 0);
    }
  }
  
  /** Load or create player profile */
  loadOrCreateProfile(userId) {
    // Try to load from database
    if (this.db) {
      const row = this.db.prepare(
        'SELECT * FROM player_profiles WHERE user_id = ?'
      ).get(userId);
      
      if (row) {
        return JSON.parse(row.profile_data);
      }
    }
    
    // Create new profile
    return {
      userId,
      firstSeen: Date.now(),
      lastAction: Date.now(),
      totalActions: 0,
      totalSpins: 0,
      totalBet: 0,
      totalWon: 0,
      bigWins: 0,
      biggestWin: 0,
      gamesPlayed: {},
      actions: [],
      sessions: 0,
      avgSessionDuration: 0
    };
  }
  
  /** Get player profile */
  getProfile(userId) {
    if (!this.profiles.has(userId)) {
      this.profiles.set(userId, this.loadOrCreateProfile(userId));
    }
    
    const profile = this.profiles.get(userId);
    
    return {
      ...profile,
      rtp: profile.totalBet > 0 ? (profile.totalWon / profile.totalBet).toFixed(4) : '0.0000',
      sessionCount: profile.sessions,
      favoriteGames: Object.entries(profile.gamesPlayed)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([gameId, count]) => ({ gameId, count }))
    };
  }
  
  /** Save profile to database */
  saveProfile(userId) {
    if (!this.db) return;
    
    const profile = this.profiles.get(userId);
    if (!profile) return;
    
    this.db.prepare(
      'INSERT OR REPLACE INTO player_profiles(user_id, profile_data, updated_at) VALUES(?, ?, datetime(\'now\'))'
    ).run(userId, JSON.stringify(profile));
  }
  
  /** Flush all profiles to database */
  flushToDatabase() {
    for (const [userId] of this.profiles) {
      this.saveProfile(userId);
    }
  }
}

// ─── Real-time Stats Calculator ──────────────────────────────

class RealTimeStats {
  constructor() {
    this.window = {
      last5Min: { bets: 0, wins: 0, wagered: 0, paidOut: 0, uniquePlayers: new Set() },
      last1Hour: { bets: 0, wins: 0, wagered: 0, paidOut: 0, uniquePlayers: new Set() },
      today: { bets: 0, wins: 0, wagered: 0, paidOut: 0, uniquePlayers: new Set(), newPlayers: 0 }
    };
    
    this.timestamps = [];
  }
  
  /** Record a bet event */
  recordBet(playerId, betAmount, winAmount) {
    const now = Date.now();
    this.timestamps.push(now);
    
    // Cleanup old timestamps (keep 2 hours)
    while (this.timestamps.length > 0 && this.timestamps[0] < now - 7200000) {
      this.timestamps.shift();
    }
    
    // Update all windows
    for (const window of Object.values(this.window)) {
      window.bets++;
      window.wagered += betAmount;
      window.paidOut += winAmount;
      if (winAmount > 0) window.wins++;
      window.uniquePlayers.add(playerId);
    }
    
    // Count new players separately for today
    this.window.today.uniquePlayers.add(playerId);
  }
  
  /** Record new player registration */
  recordNewPlayer() {
    this.window.today.newPlayers++;
  }
  
  /** Get current stats */
  getStats() {
    const now = Date.now();
    
    return {
      activeNow: this.getActiveCount(now, 30000), // Last 30 seconds
      activeLast5Min: this.getActiveCount(now, 300000),
      activeLast1Hour: this.getActiveCount(now, 3600000),
      windows: {
        last5Min: this.formatWindow(this.window.last5Min),
        last1Hour: this.formatWindow(this.window.last1Hour),
        today: {
          ...this.formatWindow(this.window.today),
          newPlayers: this.window.today.newPlayers
        }
      },
      liveRTP: this.calculateLiveRTP(),
      timestamp: new Date().toISOString()
    };
  }
  
  /** Count active users in time window */
  getActiveCount(now, windowMs) {
    const cutoff = now - windowMs;
    return this.timestamps.filter(t => t > cutoff).length;
  }
  
  /** Format window stats */
  formatWindow(window) {
    const houseEdge = window.wagered > 0 
      ? ((window.wagered - window.paidOut) / window.wagered * 100).toFixed(2)
      : '0.00';
    
    return {
      bets: window.bets,
      wins: window.wins,
      wagered: window.wagered,
      paidOut: window.paidOut,
      uniquePlayers: window.uniquePlayers.size,
      houseEdge: `${houseEdge}%`
    };
  }
  
  /** Calculate live RTP */
  calculateLiveRTP() {
    const w = this.window.last1Hour;
    if (w.wagered === 0) return '0.00';
    return ((w.paidOut / w.wagered) * 100).toFixed(2);
  }
}

// ─── Fraud Detection Engine ──────────────────────────────────

class FraudDetection {
  constructor() {
    this.flags = [];
  }
  
  /** Analyze player behavior for fraud indicators */
  analyze(userId, behavior) {
    const score = 0;
    const detectedFlags = [];
    
    // Check bet velocity (too many bets in short time)
    if (behavior.betVelocity > 60) { // More than 1 bet per second
      score += 30;
      detectedFlags.push({
        type: 'HIGH_BET_VELOCITY',
        severity: 'medium',
        value: behavior.betVelocity,
        description: 'Excessive bet frequency detected'
      });
    }
    
    // Check for round-tripping (betting same amount repeatedly)
    if (behavior.repeatedBetAmount && behavior.betCount > 10) {
      score += 25;
      detectedFlags.push({
        type: 'POTENTIAL_ROUND_TRIPPING',
        severity: 'high',
        value: behavior.repeatedBetAmount,
        description: 'Same bet amount repeated many times'
      });
    }
    
    // Check for bonus abuse pattern
    if (behavior.bonusUsageRate > 0.8 && behavior.wagerCount > 20) {
      score += 35;
      detectedFlags.push({
        type: 'POTENTIAL_BONUS_ABUSE',
        severity: 'high',
        value: behavior.bonusUsageRate,
        description: 'High bonus usage with rapid wagering'
      });
    }
    
    // Check for unusual win patterns
    if (behavior.winRate > 0.85 && behavior.betCount > 20) {
      score += 40;
      detectedFlags.push({
        type: 'UNUSUAL_WIN_RATE',
        severity: 'high',
        value: behavior.winRate,
        description: 'Win rate significantly above expected RTP'
      });
    }
    
    // Check for martingale pattern (doubling after losses)
    if (behavior.martingaleLikelihood > 0.7) {
      score += 15;
      detectedFlags.push({
        type: 'MARTINGALE_PATTERN',
        severity: 'low',
        value: behavior.martingaleLikelihood,
        description: 'Martingale betting pattern detected'
      });
    }
    
    // Determine risk level
    let riskLevel;
    if (score >= 70) riskLevel = 'critical';
    else if (score >= 40) riskLevel = 'high';
    else if (score >= 20) riskLevel = 'medium';
    else riskLevel = 'low';
    
    const analysis = {
      userId,
      riskScore: Math.min(100, score),
      riskLevel,
      flags: detectedFlags,
      timestamp: new Date().toISOString(),
      requiresReview: score >= 40
    };
    
    if (score >= 40) {
      this.flags.push(analysis);
    }
    
    return analysis;
  }
  
  /** Get all fraud flags */
  getFlags(limit = 50) {
    return this.flags.slice(-limit).reverse();
  }
  
  /** Clear old flags (older than 24 hours) */
  cleanup() {
    const cutoff = Date.now() - 86400000;
    this.flags = this.flags.filter(f => new Date(f.timestamp).getTime() > cutoff);
  }
}

// ─── Main Analytics Engine ───────────────────────────────────

class AnalyticsEngine {
  constructor(db) {
    this.db = db;
    this.eventStream = new EventStream();
    this.playerTracker = new PlayerProfileTracker(db);
    this.realtimeStats = new RealTimeStats();
    this.fraudDetector = new FraudDetection();
    
    // External analytics integrations
    this.integrations = {
      ga4: false,
      mixpanel: false,
      customWebhooks: []
    };
    
    // Start cleanup interval
    this.cleanupInterval = setInterval(() => this.cleanup(), 3600000); // Every hour
    
    // Start profile flush interval
    this.flushInterval = setInterval(() => this.playerTracker.flushToDatabase(), 300000); // Every 5 min
  }
  
  /** Track an event */
  track(userId, eventType, properties = {}) {
    const event = new AnalyticsEvent(userId, eventType, properties);
    
    // Add to stream
    this.eventStream.push(event);
    
    // Update player profile
    this.playerTracker.trackAction(userId, eventType, properties);
    
    // Update real-time stats
    if (eventType === EVENT_TYPES.GAME_SPIN) {
      this.realtimeStats.recordBet(
        userId,
        properties.betAmount || 0,
        properties.winAmount || 0
      );
    }
    
    if (eventType === EVENT_TYPES.USER_REGISTER) {
      this.realtimeStats.recordNewPlayer();
    }
    
    // Check for fraud
    if (eventType === EVENT_TYPES.GAME_SPIN || eventType === EVENT_TYPES.GAME_WIN) {
      this.checkFraud(userId, eventType, properties);
    }
    
    // Forward to external integrations
    this.forwardToIntegrations(event);
    
    return event;
  }
  
  /** Check for potential fraud */
  checkFraud(userId, eventType, properties) {
    // Get recent behavior for this user
    const profile = this.playerTracker.getProfile(userId);
    
    const behavior = {
      betVelocity: profile.totalSpins > 0 
        ? Math.min(profile.totalSpins / Math.max(1, (Date.now() - profile.firstSeen) / 60000), 120)
        : 0,
      repeatedBetAmount: this.detectRepeatedBets(userId),
      bonusUsageRate: 0, // Would need bonus tracking
      wagerCount: profile.totalSpins,
      winRate: profile.totalBet > 0 ? profile.totalWon / profile.totalBet : 0,
      martingaleLikelihood: this.estimateMartingale(userId)
    };
    
    return this.fraudDetector.analyze(userId, behavior);
  }
  
  /** Detect repeated bet amounts */
  detectRepeatedBets(userId) {
    const profile = this.playerTracker.getProfile(userId);
    if (profile.actions.length < 5) return null;
    
    const recentBets = profile.actions
      .filter(a => a.action === 'game_spin')
      .slice(-20)
      .map(a => a.metadata.betAmount);
    
    const uniqueBets = new Set(recentBets);
    if (uniqueBets.size === 1 && recentBets.length > 5) {
      return recentBets[0];
    }
    return null;
  }
  
  /** Estimate martingale pattern likelihood */
  estimateMartingale(userId) {
    const profile = this.playerTracker.getProfile(userId);
    if (profile.actions.length < 10) return 0;
    
    const recentBets = profile.actions
      .filter(a => a.action === 'game_spin')
      .slice(-20)
      .map(a => a.metadata.betAmount);
    
    let doublingCount = 0;
    for (let i = 1; i < recentBets.length; i++) {
      if (recentBets[i] >= recentBets[i-1] * 1.8 && recentBets[i] <= recentBets[i-1] * 2.2) {
        doublingCount++;
      }
    }
    
    return doublingCount / (recentBets.length - 1);
  }
  
  /** Forward event to external integrations */
  forwardToIntegrations(event) {
    // GA4 (would use measurement protocol)
    if (this.integrations.ga4) {
      this.forwardToGA4(event);
    }
    
    // Mixpanel
    if (this.integrations.mixpanel) {
      this.forwardToMixpanel(event);
    }
    
    // Custom webhooks
    for (const webhook of this.integrations.customWebhooks) {
      this.forwardToWebhook(webhook, event);
    }
  }
  
  /** Forward to GA4 Measurement Protocol */
  async forwardToGA4(event) {
    // Implementation would send POST to:
    // https://www.google-analytics.com/mp/collect?measurement_id=G-XXXX&api_secret=XXXX
    console.log(`[Analytics] GA4 event: ${event.eventType}`);
  }
  
  /** Forward to Mixpanel */
  async forwardToMixpanel(event) {
    // Implementation would send POST to:
    // https://api.mixpanel.com/track
    console.log(`[Analytics] Mixpanel event: ${event.eventType}`);
  }
  
  /** Forward to custom webhook */
  async forwardToWebhook(webhook, event) {
    try {
      await fetch(webhook.url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          source: 'casino-analytics',
          event: event.toJSON()
        })
      });
    } catch (e) {
      console.error(`[Analytics] Webhook failed (${webhook.url}):`, e.message);
    }
  }
  
  /** Get recent events */
  getEvents(limit = 50, eventType = null) {
    return this.eventStream.getRecent(limit, eventType);
  }
  
  /** Get real-time stats */
  getRealTimeStats() {
    return this.realtimeStats.getStats();
  }
  
  /** Get player profile */
  getPlayerProfile(userId) {
    return this.playerTracker.getProfile(userId);
  }
  
  /** Get fraud flags */
  getFraudFlags(limit = 20) {
    return this.fraudDetector.getFlags(limit);
  }
  
  /** Get event statistics */
  getEventStats() {
    return {
      byType: this.eventStream.getCountByType(),
      totalEvents: this.eventStream.events.length,
      recentPerMinute: this.getRecentPerMinute()
    };
  }
  
  /** Calculate events per minute (last 5 min) */
  getRecentPerMinute() {
    const now = Date.now();
    const fiveMinAgo = now - 300000;
    const recentEvents = this.eventStream.events.filter(e => 
      new Date(e.properties.timestamp).getTime() > fiveMinAgo
    );
    
    // Group by minute
    const perMinute = {};
    for (const event of recentEvents) {
      const minute = Math.floor(
        (new Date(event.properties.timestamp).getTime() - fiveMinAgo) / 60000
      );
      perMinute[minute] = (perMinute[minute] || 0) + 1;
    }
    
    return Object.values(perMinute);
  }
  
  /** Configure external integrations */
  configureIntegrations(config) {
    if (config.ga4) this.integrations.ga4 = true;
    if (config.mixpanel) this.integrations.mixpanel = true;
    if (config.webhooks) {
      this.integrations.customWebhooks.push(...config.webhooks);
    }
  }
  
  /** Get comprehensive analytics report */
  getReport() {
    return {
      realtime: this.getRealTimeStats(),
      events: this.getEventStats(),
      fraudFlags: this.getFraudFlags(10),
      topGames: this.getTopGames(),
      timestamp: new Date().toISOString()
    };
  }
  
  /** Get top games by wagered amount */
  getTopGames() {
    // Would aggregate from database or in-memory tracking
    return [];
  }
  
  /** Cleanup old data */
  cleanup() {
    this.eventStream.cleanup();
    this.fraudDetector.cleanup();
  }
  
  /** Shutdown analytics engine */
  shutdown() {
    clearInterval(this.cleanupInterval);
    clearInterval(this.flushInterval);
    this.playerTracker.flushToDatabase();
  }
}

// ─── API Routes for Analytics ─────────────────────────────────

export function createAnalyticsRoutes() {
  let analyticsInstance = null;

  function setAnalytics(analytics) {
    analyticsInstance = analytics;
  }

  const router = { setAnalytics };

  /** GET /api/analytics/realtime */
  router.realtime = (req, res) => {
    if (!analyticsInstance) {
      return res.json({ error: 'Analytics not initialized', realtime: null });
    }
    res.json(analyticsInstance.getRealTimeStats());
  };

  /** GET /api/analytics/events */
  router.events = (req, res) => {
    if (!analyticsInstance) {
      return res.json({ events: [], error: 'Analytics not initialized' });
    }
    const limit = Math.min(100, parseInt(req.query.limit) || 50);
    const eventType = req.query.eventType || null;
    res.json({
      events: analyticsInstance.getEvents(limit, eventType),
      count: limit
    });
  };

  /** GET /api/analytics/stats */
  router.stats = (req, res) => {
    if (!analyticsInstance) {
      return res.json({ error: 'Analytics not initialized' });
    }
    res.json(analyticsInstance.getEventStats());
  };

  /** GET /api/analytics/report */
  router.report = (req, res) => {
    if (!analyticsInstance) {
      return res.status(503).json({ error: 'Analytics not initialized' });
    }
    res.json(analyticsInstance.getReport());
  };

  /** GET /api/analytics/fraud */
  router.fraud = (req, res) => {
    if (!analyticsInstance) {
      return res.json({ flags: [], error: 'Analytics not initialized' });
    }
    const limit = Math.min(50, parseInt(req.query.limit) || 20);
    res.json({ flags: analyticsInstance.getFraudFlags(limit) });
  };

  /** GET /api/analytics/player/:userId */
  router.playerProfile = (req, res) => {
    if (!analyticsInstance) {
      return res.json({ error: 'Analytics not initialized' });
    }
    const profile = analyticsInstance.getPlayerProfile(req.params.userId);
    if (!profile) {
      return res.status(404).json({ error: 'Player not found' });
    }
    res.json(profile);
  };

  return router;
}

// ─── Exports ──────────────────────────────────────────────────

export {
  AnalyticsEngine,
  AnalyticsEvent,
  EventStream,
  PlayerProfileTracker,
  RealTimeStats,
  FraudDetection,
  EVENT_TYPES
};

export default AnalyticsEngine;