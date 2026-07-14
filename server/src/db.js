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
  `);
  return db;
}
