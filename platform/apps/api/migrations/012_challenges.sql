-- One-off wager challenges. A row means the reward has been claimed (idempotent).
CREATE TABLE challenge_claims (
  user_id bigint NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  challenge_id text NOT NULL,
  claimed_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, challenge_id)
);
