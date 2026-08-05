-- Web Push subscriptions (RFC 8030/8291). One row per browser push endpoint;
-- `p256dh`/`auth` are the client's public encryption keys. Delivery itself is
-- performed by an injected sender (production wires a web-push transport); this
-- table + the dispatch/prune logic are the parts that live in the app.
CREATE TABLE push_subscriptions (
  id bigserial PRIMARY KEY,
  user_id bigint NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  endpoint text NOT NULL UNIQUE,
  p256dh text NOT NULL,
  auth text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  last_used timestamptz
);
CREATE INDEX push_subs_user ON push_subscriptions(user_id);
