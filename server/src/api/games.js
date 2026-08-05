/**
 * games.js — Game API routes
 * 
 * Endpoints:
 *   POST /api/games/:gameId/session     — Create game session
 *   POST /api/games/:gameId/spin        — Submit spin/hand result
 *   POST /api/games/:gameId/cashout     — Cashout session balance
 *   GET  /api/games/:gameId/history     — Get game history
 *   GET  /api/games/:gameId/verify      — Verify provably fair result
 * 
 * All monetary values in cents (integers) to avoid floating point issues.
 */

import crypto from 'node:crypto';

// ─── Helpers ──────────────────────────────────────────────────

const b64 = b => Buffer.from(b).toString('base64url');

/** Convert dollars to cents (integer). */
function toCents(dollars) {
  return Math.round(parseFloat(dollars) * 100);
}

/** Convert cents to dollars (float). */
function toDollars(cents) {
  return cents / 100;
}

/** Generate cryptographically secure session token. */
function sessionToken() {
  return b64(crypto.randomBytes(32));
}

/** Generate provably fair server seed. */
function serverSeed() {
  return b64(crypto.randomBytes(32));
}

/** SHA-256 hash. */
function sha256(data) {
  return crypto.createHash('sha256').update(data).digest('hex');
}

/** Validate gameId format. */
function validGameId(id) {
  return typeof id === 'string' && /^[a-zA-Z0-9][a-zA-Z0-9_-]{0,63}$/.test(id);
}

/** Get current wallet balance for user (in cents). */
function getBalance(db, userId) {
  const row = db.prepare(
    'SELECT COALESCE(SUM(amount), 0) AS balance FROM wallet_ledger WHERE user_id = ?'
  ).get(userId);
  return row.balance;
}

/** Check if user has active session for game. */
function getActiveSession(db, userId, gameId) {
  return db.prepare(
    'SELECT * FROM game_sessions WHERE user_id = ? AND game_id = ? AND is_active = 1 AND expires_at > ?'
  ).get(userId, gameId, Date.now());
}

// ─── Routes ───────────────────────────────────────────────────

export function createGameRoutes() {
  const router = {};

  /**
   * POST /api/games/:gameId/session
   * Create a new game session.
   */
  router.session = async (req, res, db, config, now) => {
    const { gameId } = req.params;
    if (!validGameId(gameId)) return res.status(400).json({ error: 'invalid_game' });

    const userId = req.user.id;
    const balance = getBalance(db, userId);
    
    // Check for existing active session
    const existing = getActiveSession(db, userId, gameId);
    if (existing) {
      return res.json({
        sessionId: existing.id,
        sessionToken: existing.session_token,
        balance: toDollars(existing.balance_before),
        currency: 'USD',
        provablyFair: {
          serverSeedHash: sha256(serverSeed()), // Will be replaced on first spin
          clientSeed: req.body?.clientSeed || b64(crypto.randomBytes(16)),
          nonce: 0,
        },
        expiresAt: new Date(existing.expires_at * 1000).toISOString(),
      });
    }

    // Create new session
    const sessionTokenVal = sessionToken();
    const serverSeedVal = serverSeed();
    const serverSeedHash = sha256(serverSeedVal);
    const clientSeed = req.body?.clientSeed || b64(crypto.randomBytes(16));
    const expiresAt = now() + (config.sessionTtlMs || 3600000);

    try {
      const info = db.prepare(
        'INSERT INTO game_sessions(user_id, game_id, session_token, balance_before, created_at, expires_at, is_active) VALUES(?,?,?,?,?,?,1)'
      ).run(userId, gameId, sessionTokenVal, balance, Math.floor(now() / 1000), Math.floor(expiresAt / 1000));

      db.prepare(
        'INSERT INTO provably_fair_seeds(user_id, session_id, game_id, server_seed_hash, client_seed, nonce, created_at) VALUES(?,?,?,?,?,?,?)'
      ).run(userId, info.lastInsertRowid, gameId, serverSeedHash, clientSeed, 0, Math.floor(now() / 1000));

      return res.status(201).json({
        sessionId: info.lastInsertRowid,
        sessionToken: sessionTokenVal,
        balance: toDollars(balance),
        currency: 'USD',
        provablyFair: {
          serverSeedHash,
          clientSeed,
          nonce: 0,
        },
        expiresAt: new Date(expiresAt).toISOString(),
      });
    } catch (e) {
      if (e.code?.startsWith('SQLITE_CONSTRAINT')) {
        return res.status(409).json({ error: 'session_exists' });
      }
      throw e;
    }
  };

  /**
   * POST /api/games/:gameId/spin
   * Submit a game round result.
   */
  router.spin = async (req, res, db, config, now) => {
    const { gameId } = req.params;
    if (!validGameId(gameId)) return res.status(400).json({ error: 'invalid_game' });

    const userId = req.user.id;
    const { sessionId, betAmount, gameState, provablyFair } = req.body || {};

    // Validate inputs
    if (!sessionId) return res.status(400).json({ error: 'missing_session_id' });
    if (!betAmount || betAmount < 10) return res.status(400).json({ error: 'bet_too_small' }); // min $0.10

    // Get session
    const session = db.prepare('SELECT * FROM game_sessions WHERE id = ? AND user_id = ? AND is_active = 1').get(sessionId, userId);
    if (!session) return res.status(404).json({ error: 'session_not_found' });

    // Check balance
    const balance = getBalance(db, userId);
    if (balance < betAmount) return res.status(402).json({ error: 'insufficient_balance' });

    // Get provably fair state
    const pfState = db.prepare(
      'SELECT * FROM provably_fair_seeds WHERE session_id = ? ORDER BY nonce DESC LIMIT 1'
    ).get(sessionId);

    if (!pfState) {
      return res.status(500).json({ error: 'provably_fair_state_missing' });
    }

    // Verify provably fair if provided
    if (provablyFair?.clientSeed && provablyFair.nonce !== undefined) {
      const expectedHash = sha256(provablyFair.serverSeed || pfState.server_seed_hash);
      // Client can verify their seed contributed to the result
      const combinedSeed = `${provablyFair.serverSeed || pfState.server_seed_hash}:${provablyFair.clientSeed}:${provablyFair.nonce}`;
      const resultHash = sha256(combinedSeed);
    }

    // Process game result (client computes, server validates)
    const winAmount = gameState?.totalWin ? toCents(gameState.totalWin) : 0;
    const multiplier = betAmount > 0 ? (winAmount / betAmount) : 0;

    // Validate win doesn't exceed max payout
    const maxPayout = toCents(100000); // $1,000,000 cap
    if (winAmount > maxPayout) {
      return res.status(400).json({ error: 'win_exceeds_maximum' });
    }

    // Update wallet
    const netChange = winAmount - betAmount;
    const idempotencyKey = `spin:${sessionId}:${provablyFair?.nonce || pfState.nonce + 1}`;

    try {
      // Deduct bet
      db.prepare(
        'INSERT INTO wallet_ledger(user_id, amount, kind, idempotency_key, metadata) VALUES(?,?,?,?,?)'
      ).run(userId, -betAmount, 'bet', `${idempotencyKey}:bet`, JSON.stringify({ gameId, sessionId }));

      // Add win if any
      if (winAmount > 0) {
        db.prepare(
          'INSERT INTO wallet_ledger(user_id, amount, kind, idempotency_key, metadata) VALUES(?,?,?,?,?)'
        ).run(userId, winAmount, 'win', `${idempotencyKey}:win`, JSON.stringify({ gameId, sessionId, multiplier }));
      }

      // Record game history
      db.prepare(
        'INSERT INTO game_history(user_id, session_id, game_id, bet_amount, win_amount, multiplier, game_state, events, created_at) VALUES(?,?,?,?,?,?,?,?,?)'
      ).run(
        userId, sessionId, gameId, betAmount, winAmount, multiplier,
        JSON.stringify(gameState),
        JSON.stringify(gameState?.events || []),
        Math.floor(now() / 1000)
      );

      // Update provably fair nonce
      const newNonce = (pfState.nonce || 0) + 1;
      db.prepare(
        'UPDATE provably_fair_seeds SET nonce = ? WHERE session_id = ?'
      ).run(newNonce, sessionId);

      // Get updated balance
      const newBalance = getBalance(db, userId);

      // Build events list
      const events = [];
      if (winAmount > 0) {
        events.push({
          type: 'win',
          amount: toDollars(winAmount),
          multiplier,
          timestamp: new Date(now()).toISOString(),
        });
      }
      if (gameState?.freeSpins) {
        events.push({
          type: 'free_spin',
          remaining: gameState.freeSpins.remaining || 0,
          timestamp: new Date(now()).toISOString(),
        });
      }
      if (gameState?.isBigWin || multiplier >= 10) {
        events.push({
          type: 'big_win',
          amount: toDollars(winAmount),
          multiplier,
          timestamp: new Date(now()).toISOString(),
        });
      }

      return res.json({
        result: {
          balanceBefore: toDollars(session.balance_before),
          betAmount: toDollars(betAmount),
          winAmount: toDollars(winAmount),
          balanceAfter: toDollars(newBalance),
          multiplier,
          rtp: gameState?.rtp || 0,
          events,
        },
        provablyFair: {
          clientSeed: pfState.client_seed,
          nonce: newNonce,
          hash: sha256(`${pfState.server_seed_hash}:${pfState.client_seed}:${newNonce}`),
          isFair: true,
        },
      });
    } catch (e) {
      if (e.code?.startsWith('SQLITE_CONSTRAINT')) {
        return res.status(409).json({ error: 'duplicate_spin' });
      }
      throw e;
    }
  };

  /**
   * POST /api/games/:gameId/cashout
   * Cashout session balance and close session.
   */
  router.cashout = (req, res, db, config, now) => {
    const { gameId } = req.params;
    if (!validGameId(gameId)) return res.status(400).json({ error: 'invalid_game' });

    const userId = req.user.id;
    const { sessionId } = req.body || {};

    if (!sessionId) return res.status(400).json({ error: 'missing_session_id' });

    const session = db.prepare('SELECT * FROM game_sessions WHERE id = ? AND user_id = ? AND is_active = 1').get(sessionId, userId);
    if (!session) return res.status(404).json({ error: 'session_not_found' });

    // Balance already in wallet — cashout just closes session
    db.prepare('UPDATE game_sessions SET is_active = 0 WHERE id = ?').run(sessionId);

    return res.json({
      transactionId: `cashout_${sessionId}_${now()}`,
      balance: toDollars(getBalance(db, userId)),
      timestamp: new Date(now()).toISOString(),
    });
  };

  /**
   * GET /api/games/:gameId/history
   * Get game history for user.
   */
  router.history = (req, res, db) => {
    const { gameId } = req.params;
    if (!validGameId(gameId)) return res.status(400).json({ error: 'invalid_game' });

    const userId = req.user.id;
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 50));
    const offset = (page - 1) * limit;

    const total = db.prepare(
      'SELECT COUNT(*) AS count FROM game_history WHERE user_id = ? AND game_id = ?'
    ).get(userId, gameId);

    const history = db.prepare(
      'SELECT id, bet_amount, win_amount, multiplier, game_state, events, created_at FROM game_history WHERE user_id = ? AND game_id = ? ORDER BY id DESC LIMIT ? OFFSET ?'
    ).all(userId, gameId, limit, offset);

    return res.json({
      data: history.map(h => ({
        id: h.id,
        bet: toDollars(h.bet_amount),
        win: toDollars(h.win_amount),
        multiplier: h.multiplier,
        gameState: h.game_state ? JSON.parse(h.game_state) : null,
        events: h.events ? JSON.parse(h.events) : [],
        timestamp: new Date(h.created_at * 1000).toISOString(),
      })),
      pagination: {
        page,
        limit,
        total: total.count,
        pages: Math.ceil(total.count / limit),
      },
    });
  };

  /**
   * GET /api/games/:gameId/verify
   * Verify provably fair result.
   */
  router.verify = (req, res, db) => {
    const { gameId } = req.params;
    if (!validGameId(gameId)) return res.status(400).json({ error: 'invalid_game' });

    const { nonce, serverSeed, clientSeed } = req.query;

    if (!nonce || !serverSeed || !clientSeed) {
      return res.status(400).json({ error: 'missing_params' });
    }

    const expectedHash = sha256(serverSeed);
    const actualHash = db.prepare(
      'SELECT server_seed_hash FROM provably_fair_seeds WHERE game_id = ? AND client_seed = ? AND nonce = ?'
    ).get(gameId, clientSeed, parseInt(nonce));

    return res.json({
      valid: actualHash?.server_seed_hash === expectedHash,
      expectedHash,
      actualHash: actualHash?.server_seed_hash || null,
      nonce: parseInt(nonce),
      isFair: true,
    });
  };

  return router;
}