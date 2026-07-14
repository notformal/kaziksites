ALTER TABLE game_rounds ADD COLUMN is_bonus boolean NOT NULL DEFAULT false;
ALTER TABLE game_rounds ADD COLUMN bonus_session_id text;

CREATE TABLE slot_bonus_sessions (
  id text PRIMARY KEY,
  base_round_id text NOT NULL UNIQUE REFERENCES game_rounds(id) ON DELETE RESTRICT,
  user_id bigint NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  game_id text NOT NULL,
  bonus_type text NOT NULL CHECK (bonus_type IN ('free-spins','respin')),
  funded_bet bigint NOT NULL CHECK (funded_bet > 0),
  remaining integer NOT NULL CHECK (remaining >= 0),
  client_seed text NOT NULL,
  next_nonce bigint NOT NULL CHECK (next_nonce >= 0),
  status text NOT NULL CHECK (status IN ('active','complete')),
  created_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz
);
CREATE INDEX slot_bonus_active_user ON slot_bonus_sessions(user_id, game_id, status);
ALTER TABLE game_rounds ADD CONSTRAINT game_rounds_bonus_session_fk
  FOREIGN KEY (bonus_session_id) REFERENCES slot_bonus_sessions(id) ON DELETE RESTRICT;
