CREATE TABLE analytics_events (
  id bigserial PRIMARY KEY,
  user_id bigint REFERENCES users(id) ON DELETE SET NULL,
  session_hash char(64) NOT NULL,
  event_name varchar(32) NOT NULL CHECK (event_name IN ('page','brand','search','filter','game_open','game_ready','bet','settle','auth','daily','favorite')),
  brand varchar(24) NOT NULL,
  game_id varchar(64),
  path varchar(160),
  properties jsonb NOT NULL DEFAULT '{}'::jsonb,
  client_ts timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX analytics_events_created_idx ON analytics_events(created_at DESC);
CREATE INDEX analytics_events_funnel_idx ON analytics_events(brand,event_name,created_at DESC);
CREATE INDEX analytics_events_game_idx ON analytics_events(game_id,created_at DESC) WHERE game_id IS NOT NULL;
CREATE INDEX analytics_events_user_idx ON analytics_events(user_id,created_at DESC) WHERE user_id IS NOT NULL;
