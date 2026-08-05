-- Time-boxed wager races. Standings are derived from the wallet ledger; this
-- table only defines the window + prize pool and records that it was settled.
CREATE TABLE races (
  id text PRIMARY KEY,
  name text NOT NULL,
  starts_at timestamptz NOT NULL,
  ends_at timestamptz NOT NULL,
  prize_pool bigint NOT NULL,
  settled boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX races_window ON races(ends_at DESC);
