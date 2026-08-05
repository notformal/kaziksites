-- Stateful provably-fair Video Poker (Jacks or Better). 10 cards committed at
-- start (0-4 dealt, 5-9 the draw pile); the final hand is stored on draw.
CREATE TABLE videopoker_sessions (
  id text PRIMARY KEY,
  user_id bigint NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  bet bigint NOT NULL,
  server_seed text NOT NULL,
  server_seed_hash text NOT NULL,
  client_seed text NOT NULL,
  nonce int NOT NULL DEFAULT 0,
  cards jsonb NOT NULL,
  status text NOT NULL DEFAULT 'active' CHECK(status IN ('active', 'won', 'lost')),
  win bigint NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  settled_at timestamptz
);
CREATE INDEX videopoker_sessions_user ON videopoker_sessions(user_id, status);
