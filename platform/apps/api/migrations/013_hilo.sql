-- Stateful provably-fair Hi-Lo sessions. Server seed committed at start,
-- revealed on bust or cashout. The cumulative multiplier is server-owned.
CREATE TABLE hilo_sessions (
  id text PRIMARY KEY,
  user_id bigint NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  bet bigint NOT NULL,
  server_seed text NOT NULL,
  server_seed_hash text NOT NULL,
  client_seed text NOT NULL,
  nonce int NOT NULL DEFAULT 0,
  steps int NOT NULL DEFAULT 0,
  current_rank int NOT NULL,
  current_suit int NOT NULL,
  mult_milli bigint NOT NULL DEFAULT 1000,
  status text NOT NULL DEFAULT 'active' CHECK(status IN ('active', 'busted', 'cashed')),
  win bigint NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  settled_at timestamptz
);
CREATE INDEX hilo_sessions_user ON hilo_sessions(user_id, status);
