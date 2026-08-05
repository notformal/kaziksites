/**
 * External Odds API — Mock provider для коэффициентов в реальном времени
 * 
 * Эмулирует интеграцию с внешним провайдером odds (например, Sportradar, BetGenius)
 * 
 * Endpoints:
 *   GET    /api/sports/odds/providers      — Список доступных провайдеров
 *   GET    /api/sports/odds/fetch          — Получить коэффициенты от провайдера
 *   POST   /api/sports/odds/sync           — Синхронизировать с провайдером
 *   GET    /api/sports/odds/market-types   — Типы рынков доступных у провайдера
 */

import crypto from 'node:crypto';

function uuid() {
  return crypto.randomBytes(16).toString('hex');
}

// ─── Mock Odds Providers ──────────────────────────────────────

const PROVIDERS = {
  sportradar: {
    id: 'sportradar',
    name: 'SportRadar',
    status: 'active',
    latency: 45, // ms
    coverage: ['football', 'basketball', 'tennis', 'hockey'],
    markets: ['moneyline', 'spread', 'overUnder', 'btts', 'correctScore']
  },
  betgenius: {
    id: 'betgenius',
    name: 'BetGenius',
    status: 'active',
    latency: 62, // ms
    coverage: ['football', 'tennis'],
    markets: ['moneyline', 'spread', 'overUnder', 'btts']
  },
  feedz: {
    id: 'feedz',
    name: 'Feedzz Sports Data',
    status: 'active',
    latency: 38, // ms
    coverage: ['football', 'basketball', 'tennis', 'hockey', 'baseball'],
    markets: ['moneyline', 'spread', 'overUnder', 'btts', 'correctScore', 'firstScorer']
  }
};

// ─── Mock Data Generator ──────────────────────────────────────

class MockOddsProvider {
  constructor(providerId) {
    this.providerId = providerId;
    this.lastSync = null;
    this.syncCount = 0;
    this.errorRate = 0.02; // 2% error rate for realism
  }
  
  /** Fetch live odds for upcoming events */
  async fetchOdds(sport, leagueId = null) {
    // Simulate network latency
    await new Promise(r => setTimeout(r, 30 + Math.random() * 50));
    
    // Simulate occasional errors
    if (Math.random() < this.errorRate) {
      throw new Error(`Provider ${this.providerId} temporary error`);
    }
    
    const events = this.generateMockEvents(sport, leagueId);
    
    this.lastSync = new Date().toISOString();
    this.syncCount++;
    
    return {
      provider: this.providerId,
      timestamp: new Date().toISOString(),
      events: events.map(evt => ({
        id: evt.id,
        sport: evt.sport,
        league: evt.league,
        homeTeam: evt.homeTeam,
        awayTeam: evt.awayTeam,
        startTime: evt.startTime,
        odds: this.generateProviderOdds(evt)
      }))
    };
  }
  
  /** Generate mock events from provider perspective */
  generateMockEvents(sport, leagueId) {
    const teams = {
      football: ['Manchester United', 'Liverpool', 'Arsenal', 'Chelsea', 'Man City', 'Barcelona', 'Real Madrid', 'Bayern Munich'],
      basketball: ['Lakers', 'Celtics', 'Warriors', 'Bulls', 'Heat', 'Nets', 'Mavericks'],
      tennis: ['Djokovic N.', 'Alcaraz C.', 'Sinner J.', 'Medvedev D.', 'Rublev A.'],
      hockey: ['Edmonton', 'Colorado', 'Carolina', 'Boston', 'NY Rangers', 'Toronto']
    };
    
    const leagues = {
      football: ['Premier League', 'La Liga', 'Serie A', 'Bundesliga', 'Champions League'],
      basketball: ['NBA', 'EuroLeague'],
      tennis: ['ATP Tour', 'WTA Tour', 'Wimbledon'],
      hockey: ['NHL', 'KHL']
    };
    
    const teamList = teams[sport] || teams.football;
    const leagueList = leagues[sport] || leagues.football;
    
    const events = [];
    const now = Date.now();
    const eventCount = Math.floor(Math.random() * 8) + 5;
    
    for (let i = 0; i < eventCount; i++) {
      const homeTeam = teamList[Math.floor(Math.random() * teamList.length)];
      let awayTeam = teamList[Math.floor(Math.random() * teamList.length)];
      while (awayTeam === homeTeam) {
        awayTeam = teamList[Math.floor(Math.random() * teamList.length)];
      }
      
      events.push({
        id: `ext_${this.providerId}_${uuid().slice(0, 8)}`,
        sport,
        league: leagueId || leagueList[Math.floor(Math.random() * leagueList.length)],
        homeTeam,
        awayTeam,
        startTime: new Date(now + Math.random() * 3 * 24 * 60 * 60 * 1000).toISOString()
      });
    }
    
    return events;
  }
  
  /** Generate provider-specific odds format */
  generateProviderOdds(event) {
    const baseOdds = {
      moneyline: [],
      spread: [],
      overUnder: [],
      btts: []
    };
    
    // Moneyline
    const homeProb = 0.3 + Math.random() * 0.4;
    const drawProb = event.sport === 'football' ? 0.2 + Math.random() * 0.1 : 0;
    const awayProb = 1 - homeProb - (drawProb || 0);
    
    baseOdds.moneyline.push({
      selection: event.homeTeam,
      odds: parseFloat((1 / homeProb).toFixed(2))
    });
    
    if (drawProb > 0) {
      baseOdds.moneyline.push({
        selection: 'Draw',
        odds: parseFloat((1 / drawProb).toFixed(2))
      });
    }
    
    baseOdds.moneyline.push({
      selection: event.awayTeam,
      odds: parseFloat((1 / Math.max(awayProb, 0.15)).toFixed(2))
    });
    
    // Over/Under
    const lines = event.sport === 'basketball' ? [195.5, 205.5, 215.5] :
                  event.sport === 'hockey' ? [5.5, 6.5] :
                  [1.5, 2.5, 3.5];
    
    for (const line of lines) {
      const overProb = 0.4 + Math.random() * 0.2;
      baseOdds.overUnder.push({
        line,
        over: parseFloat((1 / overProb).toFixed(2)),
        under: parseFloat((1 / (1 - overProb)).toFixed(2))
      });
    }
    
    // BTTS (football only)
    if (event.sport === 'football') {
      const bttsYesProb = 0.45 + Math.random() * 0.15;
      baseOdds.btts.push({
        selection: 'Yes',
        odds: parseFloat((1 / bttsYesProb).toFixed(2))
      });
      baseOdds.btts.push({
        selection: 'No',
        odds: parseFloat((1 / (1 - bttsYesProb)).toFixed(2))
      });
    }
    
    // Spread
    const spreadLines = event.sport === 'basketball' ? [-3.5, 3.5] :
                       event.sport === 'hockey' ? [-1.5, 1.5] :
                       [-1, 1];
    
    for (const line of spreadLines) {
      baseOdds.spread.push({
        line: Math.abs(line),
        selection: line < 0 ? event.homeTeam : event.awayTeam,
        odds: 1.91
      });
    }
    
    return baseOdds;
  }
  
  /** Get provider statistics */
  getStats() {
    return {
      providerId: this.providerId,
      lastSync: this.lastSync,
      syncCount: this.syncCount,
      errorRate: this.errorRate
    };
  }
}

// ─── Odds API Router ──────────────────────────────────────────

function createOddsApiRoutes() {
  const providers = {};
  const providerNames = Object.keys(PROVIDERS);
  
  // Initialize providers
  for (const name of providerNames) {
    providers[name] = new MockOddsProvider(name);
  }
  
  const router = {};
  
  /**
   * GET /api/sports/odds/providers
   * List available odds providers
   */
  router.getProviders = (req, res) => {
    const providerList = Object.values(PROVIDERS).map(p => ({
      ...p,
      stats: providers[p.id]?.getStats() || {}
    }));
    
    res.json({
      providers: providerList,
      count: providerList.length,
      timestamp: new Date().toISOString()
    });
  };
  
  /**
   * GET /api/sports/odds/fetch?provider=sportradar&sport=football&leagueId=epl
   * Fetch odds from a specific provider
   */
  router.fetchOdds = async (req, res) => {
    const { provider, sport, leagueId } = req.query;
    
    if (!provider || !providers[provider]) {
      return res.status(400).json({
        error: 'Invalid or missing provider parameter',
        availableProviders: providerNames
      });
    }
    
    if (!sport || !['football', 'basketball', 'tennis', 'hockey'].includes(sport)) {
      return res.status(400).json({
        error: 'Invalid or missing sport parameter',
        validSports: ['football', 'basketball', 'tennis', 'hockey']
      });
    }
    
    try {
      const odds = await providers[provider].fetchOdds(sport, leagueId);
      res.json(odds);
    } catch (e) {
      res.status(502).json({
        error: 'Provider fetch failed',
        message: e.message,
        provider
      });
    }
  };
  
  /**
   * POST /api/sports/odds/sync
   * Sync odds from all providers (or specific one)
   */
  router.syncOdds = async (req, res) => {
    const { provider, sport } = req.body || {};
    
    const results = [];
    const providerKeys = provider ? [provider] : providerNames;
    
    for (const key of providerKeys) {
      if (!providers[key]) {
        results.push({
          provider: key,
          status: 'error',
          message: 'Provider not found'
        });
        continue;
      }
      
      try {
        const odds = await providers[key].fetchOdds(sport);
        results.push({
          provider: key,
          status: 'success',
          eventCount: odds.events.length,
          timestamp: odds.timestamp
        });
      } catch (e) {
        results.push({
          provider: key,
          status: 'error',
          message: e.message
        });
      }
    }
    
    res.json({
      syncResults: results,
      timestamp: new Date().toISOString()
    });
  };
  
  /**
   * GET /api/sports/odds/market-types
   * Get available market types by provider
   */
  router.getMarketTypes = (req, res) => {
    const { provider } = req.query;
    
    if (provider && !providers[provider]) {
      return res.status(400).json({ error: 'Provider not found' });
    }
    
    const marketTypes = {};
    const keys = provider ? [provider] : providerNames;
    
    for (const key of keys) {
      marketTypes[key] = {
        markets: PROVIDERS[key].markets,
        coverage: PROVIDERS[key].coverage
      };
    }
    
    res.json({ marketTypes });
  };
  
  /**
   * GET /api/sports/odds/stats
   * Get overall odds API statistics
   */
  router.getStats = (req, res) => {
    const stats = {};
    
    for (const [name, provider] of Object.entries(providers)) {
      stats[name] = provider.getStats();
    }
    
    res.json({
      api: 'odds-provider-mock',
      status: 'active',
      providers: stats,
      timestamp: new Date().toISOString()
    });
  };
  
  return router;
}

export { createOddsApiRoutes, MockOddsProvider, PROVIDERS };
export default createOddsApiRoutes;