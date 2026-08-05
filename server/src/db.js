import fs from 'node:fs';
import path from 'node:path';
import Database from 'better-sqlite3';

export function createDb(filename) {
  if (filename !== ':memory:') fs.mkdirSync(path.dirname(filename), { recursive: true });
  const db = new Database(filename);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY, email TEXT NOT NULL UNIQUE COLLATE NOCASE,
      display_name TEXT NOT NULL, password_hash TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'player' CHECK(role IN ('player', 'admin')),
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS sessions (
      id INTEGER PRIMARY KEY, user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      token_hash TEXT NOT NULL UNIQUE, expires_at INTEGER NOT NULL, created_at INTEGER NOT NULL
    );
    CREATE INDEX IF NOT EXISTS sessions_expiry ON sessions(expires_at);
    CREATE TABLE IF NOT EXISTS favorites (
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE, game_id TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')), PRIMARY KEY(user_id, game_id)
    );
    CREATE TABLE IF NOT EXISTS recents (
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE, game_id TEXT NOT NULL,
      played_at TEXT NOT NULL DEFAULT (datetime('now')), play_count INTEGER NOT NULL DEFAULT 1,
      PRIMARY KEY(user_id, game_id)
    );
    CREATE TABLE IF NOT EXISTS wallet_ledger (
      id INTEGER PRIMARY KEY, user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
      amount INTEGER NOT NULL CHECK(amount != 0), kind TEXT NOT NULL,
      idempotency_key TEXT NOT NULL, metadata TEXT, created_at TEXT NOT NULL DEFAULT (datetime('now')),
      UNIQUE(user_id, idempotency_key)
    );
    CREATE INDEX IF NOT EXISTS ledger_user ON wallet_ledger(user_id, id DESC);
    CREATE TRIGGER IF NOT EXISTS ledger_no_update BEFORE UPDATE ON wallet_ledger BEGIN SELECT RAISE(ABORT, 'ledger is immutable'); END;
    CREATE TRIGGER IF NOT EXISTS ledger_no_delete BEFORE DELETE ON wallet_ledger BEGIN SELECT RAISE(ABORT, 'ledger is immutable'); END;

    -- Game sessions — tracks active session per game per user
    CREATE TABLE IF NOT EXISTS game_sessions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      game_id TEXT NOT NULL,
      session_token TEXT NOT NULL UNIQUE,
      balance_before INTEGER NOT NULL,  -- in cents (integer to avoid float issues)
      created_at INTEGER NOT NULL,
      expires_at INTEGER NOT NULL,
      is_active INTEGER NOT NULL DEFAULT 1
    );
    CREATE INDEX IF NOT EXISTS sessions_game ON game_sessions(user_id, game_id, is_active);

    -- Game history — every spin/hand/round recorded
    CREATE TABLE IF NOT EXISTS game_history (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      session_id INTEGER NOT NULL REFERENCES game_sessions(id) ON DELETE CASCADE,
      game_id TEXT NOT NULL,
      bet_amount INTEGER NOT NULL,  -- in cents
      win_amount INTEGER NOT NULL DEFAULT 0,  -- in cents
      multiplier REAL NOT NULL DEFAULT 0,
      game_state TEXT,  -- JSON: reels, cards, dice result etc.
      events TEXT,  -- JSON: bonus triggers, free spins etc.
      created_at INTEGER NOT NULL
    );
    CREATE INDEX IF NOT EXISTS history_user ON game_history(user_id, id DESC);
    CREATE INDEX IF NOT EXISTS history_session ON game_history(session_id);

    -- Provably fair seeds — server seed hashes stored, client seeds submitted by client
    CREATE TABLE IF NOT EXISTS provably_fair_seeds (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      session_id INTEGER NOT NULL REFERENCES game_sessions(id) ON DELETE CASCADE,
      game_id TEXT NOT NULL,
      server_seed_hash TEXT NOT NULL,  -- SHA-256 hash of server seed
      client_seed TEXT NOT NULL,
      nonce INTEGER NOT NULL DEFAULT 0,
      created_at INTEGER NOT NULL
    );
    CREATE INDEX IF NOT EXISTS pf_session ON provably_fair_seeds(session_id);

    -- Game configurations — centralized settings for all games
    CREATE TABLE IF NOT EXISTS game_configs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      game_id TEXT NOT NULL UNIQUE,
      name TEXT NOT NULL,
      category TEXT NOT NULL DEFAULT 'slots',
      rtp REAL NOT NULL DEFAULT 0.96,
      volatility TEXT NOT NULL DEFAULT 'medium' CHECK(volatility IN ('low', 'medium', 'high')),
      min_bet INTEGER NOT NULL DEFAULT 10,
      max_bet INTEGER NOT NULL DEFAULT 50000,
      is_active INTEGER NOT NULL DEFAULT 1,
      config_json TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE INDEX IF NOT EXISTS configs_game ON game_configs(game_id);

    -- Admin audit log — track all admin actions
    CREATE TABLE IF NOT EXISTS admin_audit_log (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      admin_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      action TEXT NOT NULL,
      target_type TEXT,
      target_id TEXT,
      details TEXT,
      ip_address TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE INDEX IF NOT EXISTS audit_admin ON admin_audit_log(admin_id);
    CREATE INDEX IF NOT EXISTS audit_created ON admin_audit_log(created_at);
  `);
  return db;
}
