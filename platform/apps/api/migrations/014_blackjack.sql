-- Stateful provably-fair Blackjack sessions. Server seed committed at start,
-- revealed on settle. `staked` doubles after a double-down.
CREATE TABLE blackjack_sessions (
  id text PRIMARY KEY,
  user_id bigint NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  bet bigint NOT NULL,
  staked bigint NOT NULL,
  server_seed text NOT NULL,
  server_seed_hash text NOT NULL,
  client_seed text NOT NULL,
  nonce int NOT NULL DEFAULT 0,
  next_index int NOT NULL DEFAULT 4,
  player_cards jsonb NOT NULL,
  dealer_cards jsonb NOT NULL,
  status text NOT NULL DEFAULT 'active' CHECK(status IN ('active', 'won', 'lost', 'push')),
  doubled boolean NOT NULL DEFAULT false,
  win bigint NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  settled_at timestamptz
);
CREATE INDEX blackjack_sessions_user ON blackjack_sessions(user_id, status);
