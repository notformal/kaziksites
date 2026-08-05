-- Player progression / bonus bookkeeping. XP and level are DERIVED from the
-- append-only wallet ledger (total wagered); this table only records what has
-- already been granted so bonuses stay idempotent.
CREATE TABLE player_bonus (
  user_id bigint PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  level_claimed int NOT NULL DEFAULT 1,
  last_faucet_at timestamptz,
  -- Past default so a player's first cashback covers all losses to date.
  cashback_through timestamptz NOT NULL DEFAULT '1970-01-01T00:00:00Z',
  updated_at timestamptz NOT NULL DEFAULT now()
);
