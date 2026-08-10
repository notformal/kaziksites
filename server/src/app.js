import express from 'express';
import helmet from 'helmet';
import { hashPassword, verifyPassword, newToken, tokenHash, rateLimiter } from './security.js';
import { createGameRoutes } from './api/games.js';
import { createAdminRoutes, adminAuth as adminAuthMiddleware } from './api/admin.js';
import { createBotRoutes } from './api/bots.js';
import { BotManager } from './bots/index.js';
import { createAnalyticsRoutes, AnalyticsEngine } from './analytics/index.js';
import { createLiveGameRoutes } from './api/live-games.js';
import { getLiveGamesEngine } from './live-games/engine.js';
import { createSportsRoutes } from './api/sports.js';
import { SportsBettingEngine } from './sports-betting/engine.js';
import { createOddsApiRoutes } from './sports-betting/odds-api.js';
import { SportsBettingBotManager } from './sports-betting/bots.js';
import { createGameGatewayRoutes } from './api/game-gateway.js';
import crypto from 'node:crypto';
import { CrashEngine, PlinkoEngine, MinesEngine, DiceEngine, KenoEngine, LimboEngine, WheelEngine, HiLoEngine } from './casino-engine.js';
import { CrazyTimeEngine } from './crazy-time/engine.js';
import { MonopolyLiveEngine } from './monopoly-live/engine.js';
import { setCrazyTimeRoutes, setMonopolyLiveRoutes } from './routes/crazy-time-routes.js';

const emailOk = v => typeof v === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v) && v.length <= 254;
const gameOk = v => typeof v === 'string' && /^[a-zA-Z0-9][a-zA-Z0-9_-]{0,63}$/.test(v);
const publicUser = u => ({ id: u.id, email: u.email, displayName: u.display_name, createdAt: u.created_at });

export function createApp({ db, config, now = () => Date.now() }) {
  const app = express();
  app.disable('x-powered-by');
  app.set('trust proxy', config.trustProxy);
  app.use(helmet({ crossOriginResourcePolicy: { policy: 'same-site' } }));

  // в”Ђв”Ђв”Ђ Initialize Systems в”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђ
  
  const botManager = new BotManager({ db, config });
  const botRoutes = createBotRoutes();
  botRoutes.setBotManager(botManager);
  // Initialize bots with ALL available games from catalog and start simulation
  const allGameIds = [
    // Slots вЂ” Nova Reels
    'slots-royal', 'cosmic-queen', "dragons-fortune", "pharaohs-treasure",
    'fruit-shop', 'gold-caravan', 'magic-crystal', 'hot-navigator',
    'diamond-rush', 'wild-west-gold', 'book-of-gold',
    'super-line-fruit-bomb', 'lucky-streak',
    // Table Games вЂ” Vertex Live
    'blackjack-pro', 'baccarat-pro', 'roulette-royale',
    // Instant Games (core engine)
    'crash-pro', 'plinko-master', 'lightning-dice',
    // Live Casino вЂ” Evolution Gaming
    'lightning-blackjack', 'mega-roulette', 'speed-baccarat', 'crazy-time',
    'monopoly-live', 'dream-catcher', 'lightning-roulette', 'infinite-blackjack',
    'auto-roulette', 'casino-holdem', 'three-card-poker', 'power-blackjack',
    // Live Casino вЂ” Pragmatic Play Live
    'pragmatic-lightning-baccarat', 'pragmatic-speed-roulette', 'pragmatic-auto-roulette',
    'pragmatic-blackjack-vip', 'pragmatic-standard-blackjack', 'pragmatic-super-sic-bo',
    'pragmatic-lucky-6-baccarat', 'pragmatic-dragon-tiger-pro', 'pragmatic-cash-or-crash',
    'pragmatic-wheel-fortune',
    // Live Casino вЂ” Ezugi
    'ezugi-lightning-sic-bo', 'ezugi-speed-baccarat', 'ezugi-asian-blackjack',
    'ezugi-auto-roulette', 'ezugi-super-and-bachet', 'ezugi-casino-stud-poker',
    'ezugi-no-commission-baccarat', 'ezugi-fast-play-roulette',
    // Live Casino вЂ” Vivo Gaming
    'vivo-blackjack', 'vivo-roulette', 'vivo-baccarat', 'vivo-casino-poker', 'vivo-sic-bo',
    // Live Casino вЂ” Endorphina
    'endorphina-live-poker', 'endorphina-lightning-dice', 'endorphina-speed-roulette',
    'endorphina-baccarat-gold', 'endorphina-blackjack-vip',
    // Themed / Platform games
    'crazy-time-pro', 'crazy-time-v2', 'lightning-roulette-pro',
    'mines-premium', 'wheel-of-fortune',
    'fishing-tank', 'footfall', 'snow-run', 'duck-race',
    // Catch-all platform entries
    'pragmatic-live', 'betby-sports',
  ];

  botManager.initialize(
    allGameIds, // ALL game IDs from catalog вЂ” 69 games now covered by bots
    null, // mathEngine (not needed for simulation display)
    'aurora' // default brand
  );
  botManager.start(); // Start casino bot simulation immediately
  
  const analyticsEngine = new AnalyticsEngine({ db });
  const analyticsRoutes = createAnalyticsRoutes();
  analyticsRoutes.setAnalytics(analyticsEngine);
  
  const sportsEngine = new SportsBettingEngine({ margin: 0.05 });
  const sportsRoutes = createSportsRoutes();
  sportsRoutes.setEngine(sportsEngine);const sportsBotManager = new SportsBettingBotManager({ maxBots: 50, tickInterval: 8000 }); sportsBotManager.start(); // Start sports betting bots
  
  // Initialize Live Games routes with shared table storage
  const liveGameRoutes = createLiveGameRoutes();app.use('/api/live-games', liveGameRoutes);
  app.use('/api/crazy-time', crazyTimeRoutes);
  app.use('/api/monopoly-live', monopolyLiveRoutes);
  const crazyTimeEngine = new CrazyTimeEngine();
  const monopolyLiveEngine = new MonopolyLiveEngine();
  setCrazyTimeRoutes(crazyTimeEngine);
  setMonopolyLiveRoutes(monopolyLiveEngine);const liveEngine = getLiveGamesEngine(); liveEngine.startSimulation(); // Auto-create tables + agents every 8s

  // в”Ђв”Ђв”Ђ CORS Middleware в”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђ
  app.use((req, res, next) => {
    const origin = req.headers.origin;
    if (origin && config.allowedOrigins.has(origin)) {
      res.set('Access-Control-Allow-Origin', origin);
      res.set('Vary', 'Origin');
      res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
      res.set('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
    }
    if (req.method === 'OPTIONS') {
      return origin && config.allowedOrigins.has(origin) ? res.sendStatus(204) : res.sendStatus(403);
    }
    next();
  });

  // в”Ђв”Ђв”Ђ Body Parser & Rate Limiter в”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђ
  app.use(express.json({ limit: '16kb' }));
  app.use(rateLimiter());

  // в”Ђв”Ђв”Ђ Auth Middleware в”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђ
  const auth = (req, res, next) => {
    const m = req.headers.authorization?.match(/^Bearer ([A-Za-z0-9_-]{40,})$/);
    if (!m) return res.status(401).json({ error: 'unauthorized' });
    const row = db.prepare(
      'SELECT u.* FROM sessions s JOIN users u ON u.id=s.user_id WHERE s.token_hash=? AND s.expires_at>?'
    ).get(tokenHash(m[1]), now());
    if (!row) return res.status(401).json({ error: 'unauthorized' });
    req.user = row;
    req.token = m[1];
    next();
  };

  // в”Ђв”Ђв”Ђ Health Check в”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђ
  app.get('/health', (_req, res) => res.json({ ok: true }));

  // в”Ђв”Ђв”Ђ Bot API Routes (public) в”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђ
  app.get('/api/bots/status', (req, res) => botRoutes.stats(req, res));
  app.post('/api/bots/start', (req, res) => botRoutes.start(req, res));
  app.post('/api/bots/stop', (req, res) => botRoutes.stop(req, res));
  app.get('/api/bots/activity', (req, res) => botRoutes.feed(req, res));
  app.get('/api/bots/live', (req, res) => botRoutes.live(req, res));
app.get('/api/bots/stats', (req, res) => botRoutes.stats(req, res));
app.get('/api/bots/feed', (req, res) => botRoutes.feed(req, res));
app.post('/api/bots/spawn', (req, res) => botRoutes.spawn(req, res));

  // в”Ђв”Ђв”Ђ Analytics API Routes (public) в”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђ
  app.get('/api/analytics/overview', (req, res) => analyticsRoutes.report(req, res));
  app.get('/api/analytics/realtime', (req, res) => analyticsRoutes.realtime(req, res));
  app.get('/api/analytics/events', (req, res) => analyticsRoutes.events(req, res));
  app.get('/api/analytics/stats', (req, res) => analyticsRoutes.stats(req, res));
  app.get('/api/analytics/fraud', (req, res) => analyticsRoutes.fraud(req, res));
  app.post('/api/analytics/events/track', (req, res) => {
    if (!analyticsEngine) return res.status(503).json({ error: 'Analytics not initialized' });
    const { userId, eventType, properties } = req.body || {};
    analyticsEngine.track(userId, eventType, properties);
    res.json({ tracked: true });
  });

  // в”Ђв”Ђв”Ђ Sports Betting API Routes в”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђ
  app.get('/api/sports', (req, res) => sportsRoutes.sports(req, res));
  app.get('/api/sports/events', (req, res) => sportsRoutes.events(req, res));
  app.get('/api/sports/events/:id', (req, res) => sportsRoutes.eventDetails(req, res));
  app.get('/api/sports/live', (req, res) => sportsRoutes.live(req, res));
  app.post('/api/sports/bets/slip', auth, (req, res) => sportsRoutes.addToSlip(req, res));
  app.get('/api/sports/bets/slip', auth, (req, res) => sportsRoutes.getSlip(req, res));
  app.post('/api/sports/bets/slip/remove', auth, (req, res) => sportsRoutes.removeFromSlip(req, res));
  app.post('/api/sports/bets/submit', auth, (req, res) => sportsRoutes.submitBet(req, res));
  app.get('/api/sports/bets/user', auth, (req, res) => sportsRoutes.getUserBets(req, res));
  app.post('/api/sports/bets/:id/cashout', auth, (req, res) => sportsRoutes.cashout(req, res));
  app.get('/api/sports/bets/:id/cashout-value', auth, (req, res) => sportsRoutes.cashoutValue(req, res));
  app.post('/api/sports/live/start', (req, res) => sportsRoutes.startLive(req, res));
  app.post('/api/sports/live/stop', (req, res) => sportsRoutes.stopLive(req, res));
  app.get('/api/sports/leagues/:sport', (req, res) => sportsRoutes.leagues(req, res));
  app.get('/api/sports/status', (req, res) => sportsRoutes.status(req, res));

  // в”Ђв”Ђв”Ђ Sports Odds API Routes в”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђ
  const oddsApiRoutes = createOddsApiRoutes();
  app.get('/api/sports/odds/providers', (req, res) => oddsApiRoutes.getProviders(req, res));
  app.get('/api/sports/odds/fetch', (req, res) => oddsApiRoutes.fetchOdds(req, res));
  app.post('/api/sports/odds/sync', (req, res) => oddsApiRoutes.syncOdds(req, res));
  app.get('/api/sports/odds/market-types', (req, res) => oddsApiRoutes.getMarketTypes(req, res));
  app.get('/api/sports/odds/stats', (req, res) => oddsApiRoutes.getStats(req, res));

  // в”Ђв”Ђв”Ђ Live Games API Routes в”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђ
  app.get('/api/live-games/status', (req, res) => liveGameRoutes.status(req, res));
  app.get('/api/live-games/tables', (req, res) => liveGameRoutes.tables(req, res));
  app.post('/api/live-games/create', (req, res) => liveGameRoutes.create(req, res));
  app.post('/api/live-games/tables/:tableId/start', async (req, res) => {
    try {
      const engine = getLiveGamesEngine();
    const { tableId } = req.params;
      const result = engine.startRound(tableId);
      if (!result) return res.status(404).json({ error: 'Table not found' });
      res.json(result);
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
  app.post('/api/live-games/blackjack/start', (req, res) => liveGameRoutes.startBlackjack(req, res));
  app.post('/api/live-games/blackjack/deal', (req, res) => liveGameRoutes.dealBlackjack(req, res));
  app.post('/api/live-games/roulette/spin', (req, res) => liveGameRoutes.spinRoulette(req, res));
  app.post('/api/live-games/baccarat/play', (req, res) => liveGameRoutes.playBaccarat(req, res));
  app.post('/api/live-games/gameshow/spin', (req, res) => liveGameRoutes.spinGameShow(req, res));
  app.get('/api/live-games/providers', (req, res) => {
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
  app.get('/api/live-games/games', (req, res) => {
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
  app.get('/api/live-games/:type/history', (req, res) => liveGameRoutes.history(req, res));
  app.get('/api/live-games/:type/stats', (req, res) => liveGameRoutes.stats(req, res));
  app.get('/api/live-games/:type/tables', (req, res) => liveGameRoutes.tablesByType(req, res));
  app.delete('/api/live-games/table/:tableId', (req, res) => liveGameRoutes.deleteTable(req, res));

  // в”Ђв”Ђв”Ђ Game Gateway API Routes (unified for ALL 71 games) в”Ђв”Ђ
  const gw = createGameGatewayRoutes();
  app.get('/api/gw/:gameId/info', gw.info);
  app.post('/api/gw/:gameId/session', auth, (req, res) => gw.createSession(req, res, db, config, now));
  app.post('/api/gw/:gameId/round', auth, (req, res) => gw.playRound(req, res, db));
  app.get('/api/gw/:gameId/history', auth, (req, res) => gw.history(req, res, db));
  app.post('/api/gw/:gameId/cashout', auth, (req, res) => gw.cashout(req, res, db));
  app.get('/api/live-games/tables', gw.liveTables);
  app.post('/api/live-games/join', auth, (req, res) => gw.joinTable(req, res, db));
  app.get('/api/live-games/providers', gw.providers);
  app.get('/api/live-games/games', gw.liveGamesList);

// Live games agents/players endpoint
app.get('/api/live-games/players', (req, res) => {
  try {
    const e = getLiveGamesEngine();
    const agents = e.agentManager?.agents || new Map();
    const players = Array.from(agents.values()).map(a => ({
      id: a.id, name: a.name, profile: a.profileType,
      isActive: a.isActive, currentTable: a.currentTable,
    }));
    res.json({ players, count: players.length });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Live games manual simulate endpoint
app.get('/api/live-games/simulate', (req, res) => {
  try {
    const e = getLiveGamesEngine();
    for (const [tid] of e.tables) {
      const t = e.tables.get(tid);
      if (t.status === 'completed' || t.status === 'waiting') e.startRound(tid);
    }
    res.json({ simulated: true, tables: e.tables.size });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

  // в”Ђв”Ђв”Ђ Admin API Routes (require admin auth) в”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђ
  const adminRoutes = createAdminRoutes();
  const adminAuth = (req, res, next) => {
    const err = adminAuthMiddleware(req, res, db);
    if (err) return;
    req.admin = req.admin || req.user;
    next();
  };

  app.get('/api/admin/dashboard', adminAuth, (req, res) => adminRoutes.dashboard(req, res, db, now));
  app.get('/api/admin/users', adminAuth, (req, res) => adminRoutes.users(req, res, db));
  app.get('/api/admin/users/:id', adminAuth, (req, res) => adminRoutes.userDetails(req, res, db));
  app.put('/api/admin/users/:id/role', adminAuth, (req, res) => adminRoutes.updateUserRole(req, res, db));
  app.get('/api/admin/games', adminAuth, (req, res) => adminRoutes.games(req, res, db));
  app.get('/api/admin/games/:gameId', adminAuth, (req, res) => adminRoutes.gameDetails(req, res, db));
  app.put('/api/admin/games/:gameId', adminAuth, (req, res) => adminRoutes.updateGame(req, res, db));
  app.post('/api/admin/games/:gameId/init', adminAuth, (req, res) => adminRoutes.initGameConfig(req, res, db));
  app.get('/api/admin/sessions', adminAuth, (req, res) => adminRoutes.sessions(req, res, db));
  app.get('/api/admin/wallet/ledger', adminAuth, (req, res) => adminRoutes.walletLedger(req, res, db));
  app.get('/api/admin/game-history', adminAuth, (req, res) => adminRoutes.gameHistory(req, res, db));
  app.get('/api/admin/audit-log', adminAuth, (req, res) => adminRoutes.auditLog(req, res, db));
  app.get('/api/admin/stats/trends', adminAuth, (req, res) => adminRoutes.trends(req, res, db));

  // в•ђв•ђв•ђ PUBLIC Game Spin вЂ” demo mode, no auth required в•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђв•ђ
  // Game list endpoint
  app.get('/api/games', (req, res) => res.json({ success: true, games: [
    { id: 'crash', name: 'Skyline Crash', type: 'crash', category: 'instant' },
    { id: 'plinko', name: 'Prism Plinko', type: 'plinko', category: 'instant' },
    { id: 'mines', name: 'Nova Mines', type: 'mines', category: 'instant' },
    { id: 'dice', name: 'Nova Dice', type: 'dice', category: 'instant' },
    { id: 'keno', name: 'Keno Plus', type: 'keno', category: 'instant' },
    { id: 'limbo', name: 'Limbo', type: 'limbo', category: 'instant' },
    { id: 'wheel', name: 'Fortune Wheel', type: 'wheel', category: 'instant' },
    { id: 'hilo', name: 'Hi-Lo', type: 'hilo', category: 'instant' },
  ]}));

  // Instant games (crash, plinko, mines, dice, keno, limbo, wheel, hilo) are playable without login.
  app.post('/api/games/:gameId/spin', async (req, res) => {
    try {
      const gameId = req.params.gameId;
      const body = req.body || {};
      const bet = typeof body.bet === 'number' ? body.bet : parseFloat(body.bet);
      if (!bet || bet < 0.1) return res.status(400).json({ error: 'Min $0.10' });
      if (bet > 100000) return res.status(400).json({ error: 'Max $100k' });

      const ENGINE_MAP = { crash: CrashEngine, plinko: PlinkoEngine, mines: MinesEngine, dice: DiceEngine, keno: KenoEngine, limbo: LimboEngine, wheel: WheelEngine, hilo: HiLoEngine };
      if (!ENGINE_MAP[gameId]) return res.status(404).json({ error: 'Game not found: ' + gameId });

      if (!app.locals._pubEngines) {
        app.locals._pubEngines = {};
        for (const [key, Ctor] of Object.entries(ENGINE_MAP)) app.locals._pubEngines[key] = new Ctor();
      }
      const eng = app.locals._pubEngines[gameId];

      let result;
      switch (gameId) {
        case 'crash':   result = eng.play({ bet, serverSeed: body.serverSeed, clientSeed: body.clientSeed, nonce: body.nonce }); break;
        case 'plinko':  result = eng.play({ bet, rows: body.rows ?? 12, serverSeed: body.serverSeed, clientSeed: body.clientSeed, nonce: body.nonce }); break;
        case 'mines':   result = eng.play({ bet, mines: body.mines ?? 3, serverSeed: body.serverSeed, clientSeed: body.clientSeed, nonce: body.nonce }); break;
        case 'dice':    result = eng.play({ bet, rollUnder: body.rollUnder ?? 50, serverSeed: body.serverSeed, clientSeed: body.clientSeed, nonce: body.nonce }); break;
        case 'keno':    result = eng.play({ bet, picks: body.picks ?? [1, 2, 3], serverSeed: body.serverSeed, clientSeed: body.clientSeed, nonce: body.nonce }); break;
        case 'limbo':   result = eng.play({ bet, target: body.target ?? 2, serverSeed: body.serverSeed, clientSeed: body.clientSeed, nonce: body.nonce }); break;
        case 'wheel':   result = eng.play({ bet, serverSeed: body.serverSeed, clientSeed: body.clientSeed, nonce: body.nonce }); break;
        case 'hilo':    result = eng.play({ bet, guess: body.guess ?? 'higher', serverSeed: body.serverSeed, clientSeed: body.clientSeed, nonce: body.nonce }); break;
        default: return res.status(404).json({ error: 'Not implemented: ' + gameId });
      }

      const pfData = { serverSeed: crypto.randomBytes(16).toString('hex'), clientSeed: crypto.randomBytes(8).toString('hex'), nonce: Math.floor(Math.random() * 1e6) };
      const output = { success: true, gameId, bet, provablyFair: pfData, timestamp: new Date().toISOString() };
      Object.assign(output, result);
      res.json(output);
    } catch (e) { console.error('Public spin error:', e); res.status(500).json({ error: 'Internal server error' }); }
  });

  // в”Ђв”Ђв”Ђ Game API Routes (require auth) в”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђ
  const gameRoutes = createGameRoutes();
  app.post('/api/games/:gameId/session', auth, (req, res) => gameRoutes.session(req, res, db, config, now));
  app.post('/api/games/:gameId/spin', auth, (req, res) => gameRoutes.spin(req, res, db, config, now));
  app.post('/api/games/:gameId/cashout', auth, (req, res) => gameRoutes.cashout(req, res, db, config, now));
  app.get('/api/games/:gameId/history', auth, (req, res) => gameRoutes.history(req, res, db));
  app.get('/api/games/:gameId/verify', auth, (req, res) => gameRoutes.verify(req, res, db));

  // в”Ђв”Ђв”Ђ Auth Routes в”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђ
  app.post('/api/auth/register', rateLimiter({ limit: 10 }), async (req, res, next) => {
    try {
      const { email, password, displayName } = req.body || {};
      if (!emailOk(email) || typeof password !== 'string' || password.length < 10 || password.length > 128 ||
          typeof displayName !== 'string' || displayName.trim().length < 2 || displayName.trim().length > 40) {
        return res.status(400).json({ error: 'invalid_input' });
      }
      const hash = await hashPassword(password);
      let info;
      try {
        info = db.prepare('INSERT INTO users(email,display_name,password_hash) VALUES(?,?,?)')
          .run(email.trim().toLowerCase(), displayName.trim(), hash);
      } catch (e) {
        if (e.code?.startsWith('SQLITE_CONSTRAINT')) return res.status(409).json({ error: 'email_exists' });
        throw e;
      }
      db.prepare('INSERT INTO wallet_ledger(user_id,amount,kind,idempotency_key) VALUES(?,?,?,?)')
        .run(info.lastInsertRowid, 1000, 'welcome', 'welcome');
      const token = newToken(), expiresAt = now() + config.sessionTtlMs;
      db.prepare('INSERT INTO sessions(user_id,token_hash,expires_at,created_at) VALUES(?,?,?,?)')
        .run(info.lastInsertRowid, tokenHash(token), expiresAt, now());
      res.status(201).json({
        token,
        expiresAt: new Date(expiresAt).toISOString(),
        user: publicUser(db.prepare('SELECT * FROM users WHERE id=?').get(info.lastInsertRowid))
      });
    } catch (e) { next(e); }
  });

  app.post('/api/auth/login', rateLimiter({ limit: 10 }), async (req, res, next) => {
    try {
      const user = emailOk(req.body?.email) && db.prepare('SELECT * FROM users WHERE email=?')
        .get(req.body.email.trim().toLowerCase());
      if (!user || typeof req.body?.password !== 'string' ||
          !(await verifyPassword(req.body.password, user.password_hash))) {
        return res.status(401).json({ error: 'invalid_credentials' });
      }
      const token = newToken();
      db.prepare('DELETE FROM sessions WHERE expires_at<=?').run(now());
      db.prepare('INSERT INTO sessions(user_id,token_hash,expires_at,created_at) VALUES(?,?,?,?)')
        .run(user.id, tokenHash(token), now() + config.sessionTtlMs, now());
      res.json({
        token,
        expiresAt: new Date(now() + config.sessionTtlMs).toISOString(),
        user: publicUser(user)
      });
    } catch (e) { next(e); }
  });

  app.post('/api/auth/logout', auth, (req, res) => {
    db.prepare('DELETE FROM sessions WHERE token_hash=?').run(tokenHash(req.token));
    res.sendStatus(204);
  });

  // в”Ђв”Ђв”Ђ Profile Routes в”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђ
  app.get('/api/profile', auth, (req, res) => res.json({ user: publicUser(req.user) }));
  app.put('/api/profile', auth, (req, res) => {
    const n = req.body?.displayName;
    if (typeof n !== 'string' || n.trim().length < 2 || n.trim().length > 40) {
      return res.status(400).json({ error: 'invalid_input' });
    }
    db.prepare('UPDATE users SET display_name=? WHERE id=?').run(n.trim(), req.user.id);
    res.json({ user: publicUser(db.prepare('SELECT * FROM users WHERE id=?').get(req.user.id)) });
  });

  // в”Ђв”Ђв”Ђ Favorites Routes в”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђ
  app.get('/api/favorites', auth, (req, res) =>
    res.json({ games: db.prepare('SELECT game_id AS gameId,created_at AS createdAt FROM favorites WHERE user_id=? ORDER BY created_at DESC').all(req.user.id) }));
  app.put('/api/favorites/:gameId', auth, (req, res) => {
    if (!gameOk(req.params.gameId)) return res.status(400).json({ error: 'invalid_game' });
    db.prepare('INSERT OR IGNORE INTO favorites(user_id,game_id) VALUES(?,?)').run(req.user.id, req.params.gameId);
    res.sendStatus(204);
  });
  app.delete('/api/favorites/:gameId', auth, (req, res) => {
    db.prepare('DELETE FROM favorites WHERE user_id=? AND game_id=?').run(req.user.id, req.params.gameId);
    res.sendStatus(204);
  });

  // в”Ђв”Ђв”Ђ Recents Routes в”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђ
  app.post('/api/recents/:gameId', auth, (req, res) => {
    if (!gameOk(req.params.gameId)) return res.status(400).json({ error: 'invalid_game' });
    db.prepare("INSERT INTO recents(user_id,game_id) VALUES(?,?) ON CONFLICT(user_id,game_id) DO UPDATE SET played_at=datetime('now'),play_count=play_count+1")
      .run(req.user.id, req.params.gameId);
    res.sendStatus(204);
  });
  app.get('/api/recents', auth, (req, res) =>
    res.json({ games: db.prepare('SELECT game_id AS gameId,played_at AS playedAt,play_count AS playCount FROM recents WHERE user_id=? ORDER BY played_at DESC LIMIT 50').all(req.user.id) }));

  // в”Ђв”Ђв”Ђ Wallet Routes в”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђ
  const wallet = uid => ({
    balance: db.prepare('SELECT COALESCE(SUM(amount),0) balance FROM wallet_ledger WHERE user_id=?').get(uid).balance,
    ledger: db.prepare('SELECT id,amount,kind,idempotency_key AS idempotencyKey,metadata,created_at AS createdAt FROM wallet_ledger WHERE user_id=? ORDER BY id DESC LIMIT 100').all(uid)
  });
  app.get('/api/wallet', auth, (req, res) => res.json(wallet(req.user.id)));
  app.post('/api/wallet/daily-reward', auth, (req, res) => {
    const day = new Date(now()).toISOString().slice(0, 10);
    const key = `daily:${day}`;
    let claimed = true;
    try {
      db.prepare('INSERT INTO wallet_ledger(user_id,amount,kind,idempotency_key) VALUES(?,?,?,?)')
        .run(req.user.id, 250, 'daily_reward', key);
    } catch (e) {
      if (e.code?.startsWith('SQLITE_CONSTRAINT')) claimed = false;
      else throw e;
    }
    res.json({ claimed, reward: claimed ? 250 : 0, ...wallet(req.user.id) });
  });

  // в”Ђв”Ђв”Ђ Error Handler в”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђв”Ђ
  app.use((err, _req, res, _next) => { console.error(err); res.status(500).json({ error: 'internal_error' }); });

  return app;
}


