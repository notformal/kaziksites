-- Stateful provably-fair Mines sessions. The server seed is committed (hash) at
-- start and only revealed when the game ends (bust or cashout).
CREATE TABLE mines_sessions (
  id text PRIMARY KEY,
  user_id bigint NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  bet bigint NOT NULL,
  mines int NOT NULL,
  server_seed text NOT NULL,
  server_seed_hash text NOT NULL,
  client_seed text NOT NULL,
  nonce int NOT NULL DEFAULT 0,
  revealed jsonb NOT NULL DEFAULT '[]',
  status text NOT NULL DEFAULT 'active' CHECK(status IN ('active', 'busted', 'cashed')),
  win bigint NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  settled_at timestamptz
);
CREATE INDEX mines_sessions_user ON mines_sessions(user_id, status);
