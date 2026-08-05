/**
 * admin.js — Admin API routes
 * 
 * Endpoints:
 *   GET    /api/admin/dashboard          — Dashboard statistics
 *   GET    /api/admin/users              — List users (paginated)
 *   GET    /api/admin/users/:id          — User details
 *   PUT    /api/admin/users/:id/role     — Update user role
 *   GET    /api/admin/games              — List game configurations
 *   GET    /api/admin/games/:gameId      — Game configuration details
 *   PUT    /api/admin/games/:gameId      — Update game configuration
 *   POST   /api/admin/games/:gameId/init — Initialize default config
 *   GET    /api/admin/sessions           — Active sessions
 *   GET    /api/admin/wallet/ledger      — All wallet transactions
 *   GET    /api/admin/game-history       — Game history (all users)
 *   GET    /api/admin/audit-log          — Admin audit log
 *   GET    /api/admin/stats/trends       — Trending statistics
 * 
 * All monetary values in cents (integers).
 */

import crypto from 'node:crypto';

// ─── Helpers ──────────────────────────────────────────────────

/** Convert dollars to cents (integer). */
function toCents(dollars) {
  return Math.round(parseFloat(dollars) * 100);
}

/** Convert cents to dollars (float). */
function toDollars(cents) {
  return cents / 100;
}

/** Get admin IP address from request. */
function getIp(req) {
  return req.headers['x-forwarded-for']?.split(',')[0]?.trim() 
    || req.connection.remoteAddress || 'unknown';
}

/** Log admin action to audit log. */
function logAudit(db, adminId, action, targetType, targetId, details, ipAddress) {
  try {
    db.prepare(
      'INSERT INTO admin_audit_log(admin_id, action, target_type, target_id, details, ip_address, created_at)' +
      ' VALUES(?,?,?,?,?,?,?)'
    ).run(
      adminId, action, targetType, targetId || null, 
      details ? JSON.stringify(details) : null, ipAddress,
      Math.floor(Date.now() / 1000)
    );
  } catch (e) {
    console.error('[Admin] Audit log error:', e);
  }
}

/** Admin authentication middleware (inline). */
export function adminAuth(req, res, db) {
  const m = req.headers.authorization?.match(/^Bearer ([A-Za-z0-9_-]{40,})$/);
  if (!m) return res.status(401).json({ error: 'unauthorized' });
  
  const row = db.prepare(
    'SELECT u.* FROM sessions s JOIN users u ON u.id=s.user_id ' +
    'WHERE s.token_hash=? AND s.expires_at>? AND u.role="admin"'
  ).get(crypto.createHash('sha256').update(m[1]).digest('hex'), Date.now());
  
  if (!row) return res.status(403).json({ error: 'forbidden_admin_required' });
  
  req.admin = row;
  req.token = m[1];
  return null;
}

// ─── Default game configurations ──────────────────────────────

const DEFAULT_GAME_CONFIGS = [
  // Slots
  { gameId: 'fruit-shop', name: 'Fruit Shop', category: 'slots', rtp: 0.96, volatility: 'medium', minBet: 10, maxBet: 50000 },
  { gameId: 'slots-royal', name: 'Slots Royal', category: 'slots', rtp: 0.96, volatility: 'high', minBet: 10, maxBet: 50000 },
  { gameId: 'gold-caravan', name: 'Gold Caravan', category: 'slots', rtp: 0.95, volatility: 'medium', minBet: 10, maxBet: 50000 },
  { gameId: 'magic-crystal', name: 'Magic Crystal', category: 'slots', rtp: 0.96, volatility: 'high', minBet: 10, maxBet: 50000 },
  { gameId: 'hot-navigator', name: 'Hot Navigator', category: 'slots', rtp: 0.95, volatility: 'low', minBet: 10, maxBet: 50000 },
  { gameId: 'diamond-rush', name: 'Diamond Rush', category: 'slots', rtp: 0.96, volatility: 'medium', minBet: 10, maxBet: 50000 },
  { gameId: 'wild-west-gold', name: 'Wild West Gold', category: 'slots', rtp: 0.96, volatility: 'high', minBet: 10, maxBet: 50000 },
  { gameId: 'lucky-streak', name: 'Lucky Streak', category: 'slots', rtp: 0.95, volatility: 'medium', minBet: 10, maxBet: 50000 },
  { gameId: 'pharaohs-treasure', name: "Pharaoh's Treasure", category: 'slots', rtp: 0.96, volatility: 'high', minBet: 10, maxBet: 50000 },
  { gameId: 'book-of-gold', name: 'Book of Gold', category: 'slots', rtp: 0.96, volatility: 'high', minBet: 10, maxBet: 50000 },
  { gameId: 'cosmic-queen', name: 'Cosmic Queen', category: 'slots', rtp: 0.96, volatility: 'medium', minBet: 10, maxBet: 50000 },
  { gameId: 'dragons-fortune', name: "Dragon's Fortune", category: 'slots', rtp: 0.95, volatility: 'high', minBet: 10, maxBet: 50000 },
  // Table games
  { gameId: 'blackjack-pro', name: 'Blackjack Pro', category: 'table', rtp: 0.99, volatility: 'low', minBet: 10, maxBet: 100000 },
  { gameId: 'baccarat-pro', name: 'Baccarat Pro', category: 'table', rtp: 0.98, volatility: 'medium', minBet: 10, maxBet: 100000 },
  // Crash / Dice
  { gameId: 'crash-pro', name: 'Crash Pro', category: 'crash', rtp: 0.97, volatility: 'high', minBet: 10, maxBet: 50000 },
  { gameId: 'lightning-dice', name: 'Lightning Dice', category: 'dice', rtp: 0.96, volatility: 'high', minBet: 10, maxBet: 50000 },
  // Arcade
  { gameId: 'plinko-master', name: 'Plinko Master', category: 'arcade', rtp: 0.95, volatility: 'medium', minBet: 10, maxBet: 50000 },
];

// ─── Routes ───────────────────────────────────────────────────

export function createAdminRoutes() {
  const router = {};

  /**
   * GET /api/admin/dashboard
   * Dashboard statistics overview.
   */
  router.dashboard = (req, res, db, now) => {
    const adminId = req.admin.id;
    
    // User statistics
    const userStats = db.prepare(`
      SELECT 
        COUNT(*) as totalUsers,
        (SELECT COUNT(*) FROM users WHERE created_at >= datetime('now', '-7 days')) as newUsers7d,
        (SELECT COUNT(*) FROM users WHERE created_at >= datetime('now', '-30 days')) as newUsers30d
      FROM users
    `).get();
    
    // Wallet statistics
    const walletStats = db.prepare(`
      SELECT 
        COALESCE(SUM(CASE WHEN amount > 0 THEN amount ELSE 0 END), 0) as totalDeposits,
        COALESCE(SUM(CASE WHEN amount < 0 THEN ABS(amount) ELSE 0 END), 0) as totalWithdrawals,
        COUNT(*) as totalTransactions
      FROM wallet_ledger
    `).get();
    
    // Game statistics
    const gameStats = db.prepare(`
      SELECT 
        COUNT(DISTINCT user_id) as activeUsers,
        COUNT(*) as totalRounds,
        COALESCE(SUM(bet_amount), 0) as totalBets,
        COALESCE(SUM(win_amount), 0) as totalWins,
        MAX(created_at) as lastActivity
      FROM game_history
    `).get();
    
    // Session statistics
    const sessionStats = db.prepare(`
      SELECT 
        COUNT(*) as activeSessions,
        COUNT(DISTINCT user_id) as activeUsers
      FROM game_sessions 
      WHERE is_active = 1 AND expires_at > ?
    `).get(Math.floor(now() / 1000));
    
    // Top games by volume
    const topGames = db.prepare(`
      SELECT game_id, COUNT(*) as rounds, 
             SUM(bet_amount) as totalBet, 
             SUM(win_amount) as totalWin
      FROM game_history
      GROUP BY game_id
      ORDER BY totalBet DESC
      LIMIT 10
    `).all();
    
    // Recent activity (last 24 hours)
    const recentActivity = db.prepare(`
      SELECT 'bet' as type, user_id, bet_amount, win_amount, game_id, created_at
      FROM game_history WHERE created_at > ?
      UNION ALL
      SELECT 'transaction' as type, user_id, ABS(amount) as bet_amount, 0, NULL, created_at
      FROM wallet_ledger WHERE created_at > ?
      ORDER BY created_at DESC
      LIMIT 50
    `).get(datetime('-24 hours'), datetime('-24 hours'));
    
    // Calculate house edge (revenue)
    const houseEdge = totalBets - totalWins;
    const rtp = totalBets > 0 ? ((totalWins / totalBets) * 100).toFixed(2) + '%' : 'N/A';
    
    logAudit(db, adminId, 'dashboard_view', null, null, { stats: 'overview' }, getIp(req));
    
    return res.json({
      users: userStats,
      wallet: {
        ...walletStats,
        totalDepositsDollars: toDollars(walletStats.totalDeposits),
        totalWithdrawalsDollars: toDollars(walletStats.totalWithdrawals),
      },
      games: {
        ...gameStats,
        totalBetsDollars: toDollars(gameStats.totalBets),
        totalWinsDollars: toDollars(gameStats.totalWins),
        houseEdge: toDollars(houseEdge),
        rtp: rtp,
      },
      sessions: sessionStats,
      topGames: topGames.map(g => ({
        ...g,
        totalBetDollars: toDollars(g.totalBet),
        totalWinDollars: toDollars(g.totalWin),
      })),
      timestamp: new Date(now()).toISOString(),
    });
  };

  /**
   * GET /api/admin/users
   * List users with pagination.
   */
  router.users = (req, res, db) => {
    const adminId = req.admin.id;
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 20));
    const offset = (page - 1) * limit;
    const search = req.query.search || '';
    
    const where = search ? 'WHERE email LIKE ? OR display_name LIKE ?' : '';
    const params = search ? [`%${search}%`, `%${search}%`] : [];
    
    const total = db.prepare(`SELECT COUNT(*) as count FROM users ${where}`).get(...params);
    
    const users = db.prepare(`
      SELECT u.id, u.email, u.display_name, u.role, u.created_at,
        (SELECT COALESCE(SUM(amount), 0) FROM wallet_ledger WHERE user_id = u.id) as balance,
        (SELECT COUNT(*) FROM game_history WHERE user_id = u.id) as totalGames,
        (SELECT MAX(created_at) FROM game_history WHERE user_id = u.id) as lastPlayed
      FROM users u ${where}
      ORDER BY u.created_at DESC
      LIMIT ? OFFSET ?
    `).all(...params, limit, offset);
    
    logAudit(db, adminId, 'users_list', 'list', null, { page, limit, search }, getIp(req));
    
    return res.json({
      data: users.map(u => ({
        ...u,
        balanceDollars: toDollars(u.balance),
      })),
      pagination: {
        page, limit, total: total.count, pages: Math.ceil(total.count / limit),
      },
    });
  };

  /**
   * GET /api/admin/users/:id
   * User details with wallet and game history.
   */
  router.userDetails = (req, res, db) => {
    const adminId = req.admin.id;
    const userId = parseInt(req.params.id);
    
    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(userId);
    if (!user) return res.status(404).json({ error: 'user_not_found' });
    
    const balance = db.prepare(
      'SELECT COALESCE(SUM(amount), 0) as balance FROM wallet_ledger WHERE user_id = ?'
    ).get(userId).balance;
    
    const totalGames = db.prepare(
      'SELECT COUNT(*) as count FROM game_history WHERE user_id = ?'
    ).get(userId).count;
    
    const totalBet = db.prepare(
      'SELECT COALESCE(SUM(bet_amount), 0) as total FROM game_history WHERE user_id = ?'
    ).get(userId).total;
    
    const totalWin = db.prepare(
      'SELECT COALESCE(SUM(win_amount), 0) as total FROM game_history WHERE user_id = ?'
    ).get(userId).total;
    
    const recentHistory = db.prepare(`
      SELECT id, game_id, bet_amount, win_amount, multiplier, created_at
      FROM game_history WHERE user_id = ? ORDER BY id DESC LIMIT 20
    `).all(userId);
    
    const walletLedger = db.prepare(`
      SELECT id, amount, kind, idempotency_key, metadata, created_at
      FROM wallet_ledger WHERE user_id = ? ORDER BY id DESC LIMIT 50
    `).all(userId);
    
    logAudit(db, adminId, 'user_view', 'user', userId, { email: user.email }, getIp(req));
    
    return res.json({
      user: {
        ...user,
        balanceDollars: toDollars(balance),
        totalGames,
        totalBetDollars: toDollars(totalBet),
        totalWinDollars: toDollars(totalWin),
        netPositionDollars: toDollars(balance + (totalWin - totalBet)),
      },
      recentHistory: recentHistory.map(h => ({
        ...h,
        betDollars: toDollars(h.bet_amount),
        winDollars: toDollars(h.win_amount),
      })),
      wallet: walletLedger.map(w => ({
        ...w,
        amountDollars: toDollars(w.amount),
      })),
    });
  };

  /**
   * PUT /api/admin/users/:id/role
   * Update user role (player <-> admin).
   */
  router.updateUserRole = (req, res, db) => {
    const adminId = req.admin.id;
    const userId = parseInt(req.params.id);
    const { role } = req.body || {};
    
    if (!['player', 'admin'].includes(role)) {
      return res.status(400).json({ error: 'invalid_role' });
    }
    
    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(userId);
    if (!user) return res.status(404).json({ error: 'user_not_found' });
    
    db.prepare('UPDATE users SET role = ? WHERE id = ?').run(role, userId);
    
    logAudit(db, adminId, 'user_role_update', 'user', userId, { 
      fromRole: user.role, toRole: role, email: user.email 
    }, getIp(req));
    
    return res.json({ success: true, user: { id: user.id, email: user.email, role } });
  };

  /**
   * GET /api/admin/games
   * List all game configurations.
   */
  router.games = (req, res, db) => {
    const adminId = req.admin.id;
    
    // Initialize default configs if table is empty
    const count = db.prepare('SELECT COUNT(*) as count FROM game_configs').get();
    if (count.count === 0) {
      const insert = db.prepare(
        'INSERT INTO game_configs(game_id, name, category, rtp, volatility, min_bet, max_bet) VALUES(?,?,?,?,?,?,?)'
      );
      for (const cfg of DEFAULT_GAME_CONFIGS) {
        insert.run(cfg.gameId, cfg.name, cfg.category, cfg.rtp, cfg.volatility, cfg.minBet, cfg.maxBet);
      }
    }
    
    const games = db.prepare(`
      SELECT gc.*, 
        (SELECT COUNT(*) FROM game_history WHERE game_id = gc.game_id) as totalRounds,
        (SELECT COALESCE(SUM(bet_amount), 0) FROM game_history WHERE game_id = gc.game_id) as totalBet,
        (SELECT COALESCE(SUM(win_amount), 0) FROM game_history WHERE game_id = gc.game_id) as totalWin,
        (SELECT COUNT(DISTINCT user_id) FROM game_history WHERE game_id = gc.game_id) as activePlayers
      FROM game_configs gc
      ORDER BY gc.name
    `).all();
    
    logAudit(db, adminId, 'games_list', 'list', null, null, getIp(req));
    
    return res.json({
      data: games.map(g => ({
        ...g,
        totalBetDollars: toDollars(g.totalBet),
        totalWinDollars: toDollars(g.totalWin),
        rtpPercent: (g.rtp * 100).toFixed(2) + '%',
      })),
      total: games.length,
    });
  };

  /**
   * GET /api/admin/games/:gameId
   * Get specific game configuration.
   */
  router.gameDetails = (req, res, db) => {
    const adminId = req.admin.id;
    const { gameId } = req.params;
    
    const game = db.prepare(`
      SELECT gc.*, 
        (SELECT COUNT(*) FROM game_history WHERE game_id = gc.game_id) as totalRounds,
        (SELECT COALESCE(SUM(bet_amount), 0) FROM game_history WHERE game_id = gc.game_id) as totalBet,
        (SELECT COALESCE(SUM(win_amount), 0) FROM game_history WHERE game_id = gc.game_id) as totalWin,
        (SELECT COUNT(DISTINCT user_id) FROM game_history WHERE game_id = gc.game_id) as activePlayers
      FROM game_configs gc WHERE gc.game_id = ?
    `).get(gameId);
    
    if (!game) {
      // Try to initialize from defaults
      const def = DEFAULT_GAME_CONFIGS.find(g => g.gameId === gameId);
      if (def) {
        db.prepare(
          'INSERT INTO game_configs(game_id, name, category, rtp, volatility, min_bet, max_bet) VALUES(?,?,?,?,?,?,?)'
        ).run(def.gameId, def.name, def.category, def.rtp, def.volatility, def.minBet, def.maxBet);
        return res.json({ config: { ...def, totalRounds: 0, totalBet: 0, totalWin: 0, activePlayers: 0 } });
      }
      return res.status(404).json({ error: 'game_not_found' });
    }
    
    // Get game stats breakdown by volatility
    const statsByVol = db.prepare(`
      SELECT volatility, COUNT(*) as rounds, 
             SUM(bet_amount) as totalBet, SUM(win_amount) as totalWin
      FROM game_history gh JOIN game_configs gc ON gh.game_id = gc.game_id
      WHERE gc.game_id = ?
      GROUP BY gc.volatility
    `).all(gameId);
    
    // Recent rounds
    const recentRounds = db.prepare(`
      SELECT bet_amount, win_amount, multiplier, created_at
      FROM game_history WHERE game_id = ? ORDER BY id DESC LIMIT 50
    `).all(gameId);
    
    logAudit(db, adminId, 'game_view', 'game', gameId, null, getIp(req));
    
    return res.json({
      config: {
        ...game,
        totalBetDollars: toDollars(game.totalBet),
        totalWinDollars: toDollars(game.totalWin),
        rtpPercent: (game.rtp * 100).toFixed(2) + '%',
      },
      statsByVolatility: statsByVol.map(v => ({
        ...v,
        totalBetDollars: toDollars(v.totalBet),
        totalWinDollars: toDollars(v.totalWin),
      })),
      recentRounds: recentRounds.map(r => ({
        ...r,
        betDollars: toDollars(r.bet_amount),
        winDollars: toDollars(r.win_amount),
      })),
    });
  };

  /**
   * PUT /api/admin/games/:gameId
   * Update game configuration.
   */
  router.updateGame = (req, res, db) => {
    const adminId = req.admin.id;
    const { gameId } = req.params;
    const { rtp, volatility, minBet, maxBet, isActive, configJson } = req.body || {};
    
    // Check if game exists
    const existing = db.prepare('SELECT * FROM game_configs WHERE game_id = ?').get(gameId);
    if (!existing) {
      const def = DEFAULT_GAME_CONFIGS.find(g => g.gameId === gameId);
      if (!def) return res.status(404).json({ error: 'game_not_found' });
      
      // Insert new config
      const insert = db.prepare(`
        INSERT INTO game_configs(game_id, name, category, rtp, volatility, min_bet, max_bet, is_active, config_json)
        VALUES(?,?,?,?,?,?,?, ?,?)
      `);
      insert.run(
        gameId, def.name, def.category,
        rtp ?? def.rtp, volatility ?? def.volatility,
        minBet ?? def.minBet, maxBet ?? def.maxBet,
        isActive !== undefined ? (isActive ? 1 : 0) : 1,
        configJson || null
      );
    } else {
      // Update existing
      const updates = [];
      const values = [];
      
      if (rtp !== undefined) { updates.push('rtp = ?'); values.push(rtp); }
      if (volatility !== undefined) { updates.push('volatility = ?'); values.push(volatility); }
      if (minBet !== undefined) { updates.push('min_bet = ?'); values.push(minBet); }
      if (maxBet !== undefined) { updates.push('max_bet = ?'); values.push(maxBet); }
      if (isActive !== undefined) { updates.push('is_active = ?'); values.push(isActive ? 1 : 0); }
      if (configJson !== undefined) { updates.push('config_json = ?'); values.push(configJson); }
      
      if (updates.length > 0) {
        updates.push("updated_at = datetime('now')");
        values.push(gameId);
        db.prepare(`UPDATE game_configs SET ${updates.join(', ')} WHERE game_id = ?`).run(...values);
      }
    }
    
    logAudit(db, adminId, 'game_update', 'game', gameId, { rtp, volatility, minBet, maxBet }, getIp(req));
    
    return res.json({ success: true, gameId });
  };

  /**
   * POST /api/admin/games/:gameId/init
   * Initialize default configuration for a game.
   */
  router.initGameConfig = (req, res, db) => {
    const adminId = req.admin.id;
    const { gameId } = req.params;
    
    const def = DEFAULT_GAME_CONFIGS.find(g => g.gameId === gameId);
    if (!def) return res.status(404).json({ error: 'game_not_found' });
    
    const existing = db.prepare('SELECT id FROM game_configs WHERE game_id = ?').get(gameId);
    if (existing) return res.status(409).json({ error: 'config_already_exists' });
    
    db.prepare(
      'INSERT INTO game_configs(game_id, name, category, rtp, volatility, min_bet, max_bet) VALUES(?,?,?,?,?,?,?)'
    ).run(def.gameId, def.name, def.category, def.rtp, def.volatility, def.minBet, def.maxBet);
    
    logAudit(db, adminId, 'game_init', 'game', gameId, null, getIp(req));
    
    return res.status(201).json({ success: true, config: def });
  };

  /**
   * GET /api/admin/sessions
   * List active game sessions.
   */
  router.sessions = (req, res, db) => {
    const adminId = req.admin.id;
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 50));
    const offset = (page - 1) * limit;
    
    const total = db.prepare(`
      SELECT COUNT(*) as count FROM game_sessions WHERE is_active = 1 AND expires_at > ?
    `).get(Math.floor(Date.now() / 1000));
    
    const sessions = db.prepare(`
      SELECT gs.id, gs.game_id, gs.session_token, gs.balance_before, 
             gs.created_at, gs.expires_at, u.id as user_id, u.email, u.display_name,
             (SELECT COUNT(*) FROM game_history WHERE session_id = gs.id) as roundsPlayed
      FROM game_sessions gs
      JOIN users u ON u.id = gs.user_id
      WHERE gs.is_active = 1 AND gs.expires_at > ?
      ORDER BY gs.created_at DESC
      LIMIT ? OFFSET ?
    `).all(Math.floor(Date.now() / 1000), limit, offset);
    
    logAudit(db, adminId, 'sessions_list', 'list', null, { page, limit }, getIp(req));
    
    return res.json({
      data: sessions.map(s => ({
        ...s,
        balanceBeforeDollars: toDollars(s.balance_before),
      })),
      pagination: {
        page, limit, total: total.count, pages: Math.ceil(total.count / limit),
      },
    });
  };

  /**
   * GET /api/admin/wallet/ledger
   * All wallet transactions with filtering.
   */
  router.walletLedger = (req, res, db) => {
    const adminId = req.admin.id;
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(200, Math.max(1, parseInt(req.query.limit) || 50));
    const offset = (page - 1) * limit;
    const kind = req.query.kind || null;
    const userId = req.query.userId ? parseInt(req.query.userId) : null;
    
    let where = '';
    const params = [];
    
    if (kind) { where += 'WHERE kind = ?'; params.push(kind); }
    if (userId) {
      where += where ? ' AND user_id = ?' : 'WHERE user_id = ?';
      params.push(userId);
    }
    
    const total = db.prepare(`SELECT COUNT(*) as count FROM wallet_ledger ${where}`).get(...params);
    
    const ledger = db.prepare(`
      SELECT wl.*, u.email, u.display_name
      FROM wallet_ledger wl
      JOIN users u ON u.id = wl.user_id
      ${where}
      ORDER BY wl.id DESC
      LIMIT ? OFFSET ?
    `).all(...params, limit, offset);
    
    logAudit(db, adminId, 'wallet_view', 'list', null, { kind, userId }, getIp(req));
    
    return res.json({
      data: ledger.map(l => ({
        ...l,
        amountDollars: toDollars(l.amount),
      })),
      pagination: {
        page, limit, total: total.count, pages: Math.ceil(total.count / limit),
      },
    });
  };

  /**
   * GET /api/admin/game-history
   * Game history for all users with filtering.
   */
  router.gameHistory = (req, res, db) => {
    const adminId = req.admin.id;
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 50));
    const offset = (page - 1) * limit;
    const gameId = req.query.gameId || null;
    const userId = req.query.userId ? parseInt(req.query.userId) : null;
    
    let where = '';
    const params = [];
    
    if (gameId) { where += 'WHERE gh.game_id = ?'; params.push(gameId); }
    if (userId) {
      where += where ? ' AND gh.user_id = ?' : 'WHERE gh.user_id = ?';
      params.push(userId);
    }
    
    const total = db.prepare(`SELECT COUNT(*) as count FROM game_history gh ${where}`).get(...params);
    
    const history = db.prepare(`
      SELECT gh.*, u.email, u.display_name
      FROM game_history gh
      JOIN users u ON u.id = gh.user_id
      ${where}
      ORDER BY gh.id DESC
      LIMIT ? OFFSET ?
    `).all(...params, limit, offset);
    
    logAudit(db, adminId, 'game_history_view', 'list', null, { gameId, userId }, getIp(req));
    
    return res.json({
      data: history.map(h => ({
        ...h,
        betDollars: toDollars(h.bet_amount),
        winDollars: toDollars(h.win_amount),
      })),
      pagination: {
        page, limit, total: total.count, pages: Math.ceil(total.count / limit),
      },
    });
  };

  /**
   * GET /api/admin/audit-log
   * Admin audit log.
   */
  router.auditLog = (req, res, db) => {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 50));
    const offset = (page - 1) * limit;
    
    const total = db.prepare('SELECT COUNT(*) as count FROM admin_audit_log').get();
    
    const logs = db.prepare(`
      SELECT al.*, u.email as admin_email, u.display_name as admin_name
      FROM admin_audit_log al
      JOIN users u ON u.id = al.admin_id
      ORDER BY al.id DESC
      LIMIT ? OFFSET ?
    `).all(limit, offset);
    
    return res.json({
      data: logs,
      pagination: {
        page, limit, total: total.count, pages: Math.ceil(total.count / limit),
      },
    });
  };

  /**
   * GET /api/admin/stats/trends
   * Trending statistics (daily/weekly/monthly).
   */
  router.trends = (req, res, db) => {
    const adminId = req.admin.id;
    
    // Daily stats for last 30 days
    const dailyStats = db.prepare(`
      SELECT 
        date(wl.created_at) as day,
        COUNT(*) as transactions,
        SUM(CASE WHEN wl.amount > 0 THEN wl.amount ELSE 0 END) as deposits,
        SUM(CASE WHEN wl.amount < 0 THEN ABS(wl.amount) ELSE 0 END) as withdrawals
      FROM wallet_ledger wl
      WHERE wl.created_at >= datetime('now', '-30 days')
      GROUP BY date(wl.created_at)
      ORDER BY day DESC
    `).all();
    
    // Game activity for last 30 days
    const gameDailyStats = db.prepare(`
      SELECT 
        date(gh.created_at) as day,
        COUNT(*) as rounds,
        SUM(gh.bet_amount) as totalBet,
        SUM(gh.win_amount) as totalWin,
        COUNT(DISTINCT gh.user_id) as uniquePlayers
      FROM game_history gh
      WHERE gh.created_at >= datetime('now', '-30 days')
      GROUP BY date(gh.created_at)
      ORDER BY day DESC
    `).all();
    
    // User registrations for last 30 days
    const userRegistrations = db.prepare(`
      SELECT 
        date(created_at) as day,
        COUNT(*) as newUsers
      FROM users
      WHERE created_at >= datetime('now', '-30 days')
      GROUP BY date(created_at)
      ORDER BY day DESC
    `).all();
    
    logAudit(db, adminId, 'trends_view', 'list', null, null, getIp(req));
    
    return res.json({
      dailyStats: dailyStats.map(d => ({
        ...d,
        depositsDollars: toDollars(d.deposits),
        withdrawalsDollars: toDollars(d.withdrawals),
      })),
      gameDailyStats: gameDailyStats.map(g => ({
        ...g,
        totalBetDollars: toDollars(g.totalBet),
        totalWinDollars: toDollars(g.totalWin),
      })),
      userRegistrations,
    });
  };

  return router;
}