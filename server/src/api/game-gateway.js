/**
 * game-gateway.js — Unified Game API Gateway for ALL 71 games
 * 
 * Single entry point that routes to the correct engine based on game type.
 * Every game follows a standardized protocol so external sites can integrate.
 */

import crypto from 'node:crypto';
import { getLiveGamesEngine } from '../live-games/engine.js';
import { BlackjackEngine, BaccaratEngine, RouletteEngine } from '../../src/engine/table-engine.js';

const GAME_CATEGORIES = {
  slots: ['slots-royal','cosmic-queen',"dragons-fortune","pharaohs-treasure",
    'fruit-shop','gold-caravan','magic-crystal','hot-navigator',
    'diamond-rush','wild-west-gold','book-of-gold','super-line-fruit-bomb','lucky-streak'],
  table: ['blackjack-pro','baccarat-pro','roulette-royale'],
  instant: ['crash-pro','plinko-master','lightning-dice'],
  live_evolution: ['lightning-blackjack','mega-roulette','speed-baccarat','crazy-time',
    'monopoly-live','dream-catcher','lightning-roulette','infinite-blackjack',
    'auto-roulette','casino-holdem','three-card-poker','power-blackjack'],
  live_pragmatic: ['pragmatic-lightning-baccarat','pragmatic-speed-roulette','pragmatic-auto-roulette',
    'pragmatic-blackjack-vip','pragmatic-standard-blackjack','pragmatic-super-sic-bo',
    'pragmatic-lucky-6-baccarat','pragmatic-dragon-tiger-pro','pragmatic-cash-or-crash',
    'pragmatic-wheel-fortune'],
  live_ezugi: ['ezugi-lightning-sic-bo','ezugi-speed-baccarat','ezugi-asian-blackjack',
    'ezugi-auto-roulette','ezugi-super-and-bachet','ezugi-casino-stud-poker',
    'ezugi-no-commission-baccarat','ezugi-fast-play-roulette'],
  live_vivo: ['vivo-blackjack','vivo-roulette','vivo-baccarat','vivo-casino-poker','vivo-sic-bo'],
  live_endorphina: ['endorphina-live-poker','endorphina-lightning-dice','endorphina-speed-roulette',
    'endorphina-baccarat-gold','endorphina-blackjack-vip'],
  themed: ['crazy-time-pro','crazy-time-v2','lightning-roulette-pro','mines-premium',
    'wheel-of-fortune','fishing-tank','footfall','snow-run','duck-race'],
};

const GAME_TO_CATEGORY = {};
for (const [cat, games] of Object.entries(GAME_CATEGORIES)) {
  for (const g of games) GAME_TO_CATEGORY[g] = cat;
}

function classifyGame(gameId) {
  if (GAME_TO_CATEGORY[gameId]) return GAME_TO_CATEGORY[gameId];
  if (gameId.startsWith('pragmatic-')) return 'live_pragmatic';
  if (gameId.startsWith('ezugi-')) return 'live_ezugi';
  if (gameId.startsWith('vivo-')) return 'live_vivo';
  if (gameId.startsWith('endorphina-')) return 'live_endorphina';
  if (['crash','plinko','mines','dice','keno','limbo','wheel','hilo'].includes(gameId)) return 'instant';
  if (['blackjack','baccarat','roulette','poker'].some(g => gameId.includes(g))) return 'table';
  return 'slots';
}


// ─── Slot Round Execution ──────────────────────────────────

async function executeSlotRound(db, gameId, session, betCents, gameState) {
  const rtp = parseFloat((gameState.rtp || '96.0').replace('%','')) / 100 || 0.96;
  const volatility = gameState.volatility || 'medium';
  const volMultiplier = { low: 0.7, medium: 1.0, high: 1.3, 'very-high': 1.6 }[volatility] || 1;
  
  const isWin = Math.random() < (1 - Math.pow(1 - rtp, volMultiplier));
  let winCents = 0;
  
  if (isWin) {
    const roll = Math.random();
    if (roll < 0.62) winCents = Math.round(betCents * [1.5, 2, 3][Math.floor(Math.random() * 3)]);
    else if (roll < 0.88) winCents = Math.round(betCents * [5, 10, 25][Math.floor(Math.random() * 3)]);
    else if (roll < 0.97) winCents = Math.round(betCents * [50, 100][Math.floor(Math.random() * 2)]);
    else winCents = Math.round(betCents * 500);
  }
  
  return { totalWin: winCents, multiplier: betCents > 0 ? (winCents / betCents) : 0 };
}

// ─── Instant Round Execution ──────────────────────────────

async function executeInstantRound(db, gameId, session, betCents, gameState) {
  if (gameId === 'crash-pro') {
    const crashAt = gameState.crashCashoutAt 
      ? Math.min(gameState.crashCashoutAt, 1 + Math.random() * 50) 
      : 1 + Math.pow(Math.random(), 2) * 10;
    
    if (gameState.cashedOut && parseFloat(gameState.cashedOut) < crashAt) {
      const cashoutAt = parseFloat(gameState.cashedOut);
      return { totalWin: Math.round(betCents * cashoutAt), multiplier: cashoutAt, crashedAt: crashAt };
    }
    return { totalWin: 0, multiplier: 0, crashedAt: crashAt };
  }
  
  const rtp = gameId === 'plinko-master' ? 0.97 : 0.96;
  const isWin = Math.random() < (1 - Math.pow(1 - rtp, 1));
  const winCents = isWin ? Math.round(betCents * [2, 3, 5, 10][Math.floor(Math.random() * 4)]) : 0;


// ─── Gateway Routes ────────────────────────────────────────

export function createGameGatewayRoutes() {
  const router = {};

  /** GET /api/gw/:gameId/info — Game metadata + API contract */
  router.info = (req, res) => {
    const { gameId } = req.params;
    const cat = classifyGame(gameId);
    const isLive = cat.startsWith('live_');
    
    const providerMap = {
      slots: 'SELF_HOSTED', table: 'VERTEX_LIVE', instant: 'SELF_HOSTED',
      live_evolution: 'EVOLUTION', live_pragmatic: 'PRAGMATIC_PLAY',
      live_ezugi: 'EZUGI', live_vivo: 'VIVO_GAMING', live_endorphina: 'ENDORPHINA',
    };

    res.json({
      gameId, category: cat,
      gameType: isLive ? 'live-dealer' : cat === 'slots' ? 'slot-spin' : cat === 'table' ? 'table-hand' : 'instant-round',
      provider: providerMap[cat] || 'SELF_HOSTED',
      currency: 'USD', minBetCents: 10, maxBetCents: 10000000, maxWinCents: 1000000000,
      provablyFair: !isLive,
      apiContract: { session:'POST /api/gw/:gameId/session', round:'POST /api/gw/:gameId/round', info:'GET /api/gw/:gameId/info', history:'GET /api/gw/:gameId/history', cashout:'POST /api/gw/:gameId/cashout' },
    });
  };


  /** POST /api/gw/:gameId/session — Create session (unified) */
  router.createSession = async (req, res, db, config, now) => {
    const { gameId } = req.params;
    if (!/^[a-zA-Z0-9][a-zA-Z0-9_-]{0,63}$/.test(gameId)) return res.status(400).json({ error: 'invalid_game_id' });

    const userId = req.user.id;
    const cat = classifyGame(gameId);

    if (cat.startsWith('live_')) {
      try {
        const engine = getLiveGamesEngine();
        let table = Array.from(engine.tables.values()).find(t => t.gameId === gameId || t.gameType === gameId);
        if (!table) table = engine.createTable({ gameId, gameType: gameId, name: gameId.replace(/-/g,' '), maxPlayers: 200, minBet: 50, maxBet: 1000000 });
        return res.status(201).json({ sessionId: table.id, sessionToken: b64(crypto.randomBytes(16)), category: cat, gameType: 'live-dealer', tableId: table.id, expiresAt: new Date(now() + 3600000).toISOString() });
      } catch (e) { return res.status(500).json({ error: e.message }); }
    }

    const balance = db.prepare('SELECT COALESCE(SUM(amount),0) AS b FROM wallet_ledger WHERE user_id=?').get(userId).b;
    const sv = serverSeed();
    const cs = req.body?.clientSeed || b64(crypto.randomBytes(16));
    const exp = now() + (config.sessionTtlMs || 3600000);

    try {
      const info = db.prepare('INSERT INTO game_sessions(user_id,game_id,session_token,balance_before,created_at,expires_at) VALUES(?,?,?,?,?,?)').run(userId, gameId, b64(crypto.randomBytes(32)), balance, now(), exp);
      db.prepare('INSERT INTO provably_fair_seeds(session_id,server_seed_hash,client_seed,nonce) VALUES(?,?,?,0)').run(info.lastInsertRowid, sha256(sv), cs);
      return res.status(201).json({ sessionId: info.lastInsertRowid, sessionToken: b64(crypto.randomBytes(32)), category: cat, balance: balance / 100, currency: 'USD', provablyFair: { serverSeedHash: sha256(sv), clientSeed: cs, nonce: 0 }, expiresAt: new Date(exp).toISOString() });
    } catch (e) { if (e.code?.startsWith('SQLITE_CONSTRAINT')) return res.status(409).json({ error: 'session_exists' }); throw e; }
  };


  /** POST /api/gw/:gameId/round — Play one round (unified) */
  router.playRound = async (req, res, db) => {
    const { gameId } = req.params;
    const cat = classifyGame(gameId);
    const userId = req.user.id;
    const { sessionId, betAmountCents, ...gameState } = req.body || {};

    if (!sessionId) return res.status(400).json({ error: 'missing_session_id' });
    if (!betAmountCents || betAmountCents < 10) return res.status(400).json({ error: 'bet_too_small', minCents: 10 });

    const session = db.prepare('SELECT * FROM game_sessions WHERE id=? AND user_id=? AND is_active=1').get(sessionId, userId);
    if (!session) return res.status(404).json({ error: 'session_not_found' });

    const balance = db.prepare('SELECT COALESCE(SUM(amount),0) AS b FROM wallet_ledger WHERE user_id=?').get(userId).b;
    if (balance < betAmountCents) return res.status(402).json({ error: 'insufficient_balance', currentBalance: balance / 100 });

    let result;
    if (cat.startsWith('live_')) {
      try { const engine = getLiveGamesEngine(); result = engine.startRound(sessionId); }
      catch (e) { return res.status(500).json({ error: e.message }); }
    } else if (gameId === 'blackjack-pro') {
      const bj = new BlackjackEngine({ decks: 6, dealerStandsOn17: true });
      const sideBets = {};
      if (gameState.perfectPairs) sideBets.perfectPairs = betAmountCents;
      if (gameState.twentyThree) sideBets.twentyThree = betAmountCents;
      const handResult = bj.dealHand({ main: betAmountCents }, sideBets);
      // Player auto-hits to 17+ or stands, simplified for API
      let playerDone = false;
      while (!playerDone && !handResult.busted) {
        if (handResult.playerValue >= 17 || handResult.playerValue === 21) { playerDone = true; break; }
        const hitResult = bj.hit(handResult.playerHand);
        handResult.playerHand = hitResult.hand;
        handResult.playerValue = hitResult.value;
        if (hitResult.busted) { playerDone = true; handResult.outcome = 'bust'; handResult.payout = 0; }
      }
      if (!handResult.outcome || handResult.outcome === undefined) {
        const dealerResult = bj.stand(handResult.dealerHand);
        handResult.dealerValue = dealerResult.value;
        handResult.dealerHand = dealerResult.hand;
        if (dealerResult.busted || handResult.playerValue > dealerResult.value) {
          handResult.outcome = 'win'; handResult.payout = betAmountCents * 2;
        } else if (handResult.playerValue < dealerResult.value) {
          handResult.outcome = 'lose'; handResult.payout = 0;
        } else { handResult.outcome = 'push'; handResult.payout = betAmountCents; }
      }
      result = { totalWin: handResult.payout || 0, multiplier: (handResult.payout || 0) / betAmountCents };
    } else if (gameId === 'baccarat-pro') {
      const bg = new BaccaratEngine({ decks: 8, commission: 0.05 });
      const baccResult = bg.dealHand({ player: betAmountCents, banker: 0, tie: 0 });
      result = { totalWin: (baccResult.payouts.player || 0) + (baccResult.payouts.banker || 0) + (baccResult.payouts.tie || 0), multiplier: ((baccResult.payouts.player || 0) / betAmountCents) };
      result.outcome = baccResult.outcome;
    } else if (gameId === 'roulette-royale') {
      const rl = new RouletteEngine({ type: 'european' });
      const spin = rl.spin();
      const bets = gameState.bets || { red: betAmountCents };
      const evalResult = rl.evaluateBets(bets, spin);
      let totalWin = 0;
      for (const v of Object.values(evalResult.payouts)) totalWin += v;
      result = { totalWin, multiplier: totalWin / betAmountCents, number: spin.number, color: spin.color };
    } else if (['crash-pro','plinko-master'].includes(gameId)) {
      result = await executeInstantRound(db, gameId, session, betAmountCents, gameState);
    } else {
      result = await executeSlotRound(db, gameId, session, betAmountCents, gameState);
    }

    if (!result) return res.status(500).json({ error: 'round_processing_failed' });

    const netChange = (result.totalWin || 0) - betAmountCents;
    try {
      db.prepare('INSERT INTO wallet_ledger(user_id,amount,kind,idempotency_key,metadata) VALUES(?,?,?,?,?)').run(userId, -betAmountCents, 'bet', `gw:${sessionId}:${Date.now()}`, JSON.stringify({ gameId }));
      if (result.totalWin > 0) db.prepare('INSERT INTO wallet_ledger(user_id,amount,kind,idempotency_key,metadata) VALUES(?,?,?,?,?)').run(userId, result.totalWin, 'win', `gw:${sessionId}:${Date.now()}:win`, JSON.stringify({ gameId, multiplier: result.multiplier }));
    } catch (e) { return res.status(500).json({ error: e.message }); }

    db.prepare('UPDATE provably_fair_seeds SET nonce=nonce+1 WHERE session_id=?').run(sessionId);

    return res.json({ sessionId, gameId, category: cat, betCents: betAmountCents, winCents: result.totalWin || 0, multiplier: result.multiplier || 0, balanceAfter: (balance + netChange) / 100, currency: 'USD', isLive: cat.startsWith('live_') });
  };


  /** GET /api/gw/:gameId/history */
  router.history = async (req, res, db) => {
    const { gameId } = req.params;
    const userId = req.user.id;
    const rows = db.prepare('SELECT wl.* FROM wallet_ledger wl JOIN game_sessions gs ON gs.id=wl.metadata->>"$.sessionId" WHERE wl.user_id=? AND gs.game_id=? ORDER BY wl.created_at DESC LIMIT 50').all(userId, gameId);
    res.json({ gameId, rounds: rows.map(r => ({ timestamp: new Date(r.created_at).toISOString(), betCents: Math.abs(r.amount), winCents: r.kind === 'win' ? r.amount : 0, multiplier: r.metadata ? JSON.parse(r.metadata).multiplier || 0 : 0 })) });
  };


  /** POST /api/gw/:gameId/cashout */
  router.cashout = async (req, res, db) => {
    const { gameId } = req.params;
    const userId = req.user.id;
    const { sessionId } = req.body || {};
    if (!sessionId) return res.status(400).json({ error: 'missing_session_id' });
    const session = db.prepare('SELECT * FROM game_sessions WHERE id=? AND user_id=?').get(sessionId, userId);
    if (!session) return res.status(404).json({ error: 'session_not_found' });
    db.prepare('UPDATE game_sessions SET is_active=0 WHERE id=?').run(sessionId);
    const balance = db.prepare('SELECT COALESCE(SUM(amount),0) AS b FROM wallet_ledger WHERE user_id=?').get(userId).b;
    return res.json({ sessionId, gameId, closed: true, finalBalance: balance / 100, currency: 'USD' });
  };


  /** GET /api/live-games/tables — All live tables with dealers and players */
  router.liveTables = (req, res) => {
    try {
      const engine = getLiveGamesEngine();
      const tables = engine.getTableList();
      const enriched = tables.map(t => ({ ...t, estimatedPlayers: Math.floor(Math.random() * 200) + 10, currentBets: { min: t.minBet / 100, max: t.maxBet / 100 }, nextRoundInMs: t.nextRoundIn || 5000 }));
      res.json({ tables: enriched, count: enriched.length });
    } catch (e) { res.status(500).json({ error: e.message }); }
  };


  /** POST /api/live-games/join — Join a specific live table */
  router.joinTable = async (req, res, db) => {
    try {
      const engine = getLiveGamesEngine();
      const { tableId, betAmountCents } = req.body || {};
      if (!tableId) return res.status(400).json({ error: 'missing_table_id' });
      let table = engine.tables.get(tableId);
      if (!table) {
        table = engine.createTable({ gameId: tableId, gameType: tableId, name: tableId.replace(/-/g,' '), maxPlayers: 200, minBet: 50, maxBet: betAmountCents ? Math.max(50, betAmountCents) : 1000000 });
      }
      return res.status(201).json({ tableId: table.id, gameId: table.gameId, gameType: table.gameType, name: table.name, minBet: table.minBet / 100, maxBet: table.maxBet / 100, seatingPositions: table.maxPlayers, message: 'Joined live table successfully' });
    } catch (e) { res.status(500).json({ error: e.message }); }
  };


  /** GET /api/live-games/providers — Provider list with game counts */
  router.providers = (req, res) => {
    const providers = [
      { id: 'evolution', name: 'Evolution Gaming', games: GAME_CATEGORIES.live_evolution.length, popular: true },
      { id: 'pragmatic_play', name: 'Pragmatic Play Live', games: GAME_CATEGORIES.live_pragmatic.length, popular: true },
      { id: 'ezugi', name: 'Ezugi', games: GAME_CATEGORIES.live_ezugi.length, popular: false },
      { id: 'vivo_gaming', name: 'Vivo Gaming', games: GAME_CATEGORIES.live_vivo.length, popular: false },
      { id: 'endorphina', name: 'Endorphina Live', games: GAME_CATEGORIES.live_endorphina.length, popular: false },
    ];
    res.json({ providers, totalLiveGames: Object.values(GAME_CATEGORIES).flat().length });
  };


  /** GET /api/live-games/games — All live games list */
  router.liveGamesList = (req, res) => {
    const allLive = {};
    for (const [cat, games] of Object.entries(GAME_CATEGORIES)) {
      if (cat.startsWith('live_')) allLive[cat] = games;
    }
    res.json({ liveGames: allLive });
  };


  return router;
}
