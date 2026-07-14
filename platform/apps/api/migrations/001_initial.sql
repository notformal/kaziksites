CREATE TABLE users (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  email text NOT NULL,
  display_name text NOT NULL,
  password_hash text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX users_email_ci ON users (lower(email));

CREATE TABLE sessions (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id bigint NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash text NOT NULL UNIQUE,
  expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX sessions_expiry ON sessions(expires_at);

CREATE TABLE favorites (
  user_id bigint NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  game_id text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY(user_id, game_id)
);
CREATE TABLE recents (
  user_id bigint NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  game_id text NOT NULL,
  played_at timestamptz NOT NULL DEFAULT now(),
  play_count integer NOT NULL DEFAULT 1 CHECK(play_count > 0),
  PRIMARY KEY(user_id, game_id)
);

CREATE TABLE wallet_ledger (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id bigint NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  amount bigint NOT NULL CHECK(amount <> 0),
  kind text NOT NULL CHECK(kind IN ('welcome','daily_reward','bet','win','adjustment')),
  idempotency_key text NOT NULL,
  metadata jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, idempotency_key)
);
CREATE INDEX ledger_user ON wallet_ledger(user_id, id DESC);

CREATE TABLE game_rounds (
  id text PRIMARY KEY,
  user_id bigint NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  game_id text NOT NULL,
  bet bigint NOT NULL CHECK(bet > 0),
  status text NOT NULL CHECK(status IN ('open','settled')),
  client_seed text NOT NULL,
  server_seed text NOT NULL,
  server_seed_hash text NOT NULL,
  nonce bigint NOT NULL,
  outcome text,
  multiplier_milli integer,
  win bigint,
  created_at timestamptz NOT NULL DEFAULT now(),
  settled_at timestamptz,
  UNIQUE(user_id, game_id, nonce)
);
CREATE INDEX rounds_user ON game_rounds(user_id, created_at DESC);

CREATE FUNCTION reject_ledger_mutation() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN RAISE EXCEPTION 'wallet ledger is append-only'; END $$;
CREATE TRIGGER ledger_no_update BEFORE UPDATE ON wallet_ledger FOR EACH ROW EXECUTE FUNCTION reject_ledger_mutation();
CREATE TRIGGER ledger_no_delete BEFORE DELETE ON wallet_ledger FOR EACH ROW EXECUTE FUNCTION reject_ledger_mutation();
