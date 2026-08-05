-- Stateful provably-fair Casino Hold'em. Full deal committed at start (server seed
-- hash); only the player hole + flop are exposed until the call/fold decision.
CREATE TABLE holdem_sessions (
  id text PRIMARY KEY,
  user_id bigint NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  ante bigint NOT NULL,
  staked bigint NOT NULL,
  server_seed text NOT NULL,
  server_seed_hash text NOT NULL,
  client_seed text NOT NULL,
  nonce int NOT NULL DEFAULT 0,
  player_cards jsonb NOT NULL,
  dealer_cards jsonb NOT NULL,
  community jsonb NOT NULL,
  status text NOT NULL DEFAULT 'active' CHECK(status IN ('active', 'won', 'lost', 'push')),
  win bigint NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  settled_at timestamptz
);
CREATE INDEX holdem_sessions_user ON holdem_sessions(user_id, status);
