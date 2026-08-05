-- Realtime social layer: a single public lobby chat room + a per-user
-- notification center. Both are streamed over the existing SSE transport.
-- Entertainment-only: text-only, no DMs, no attachments, no external delivery.
CREATE TABLE chat_messages (
  id bigserial PRIMARY KEY,
  user_id bigint NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  body text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX chat_messages_recent ON chat_messages(id DESC);

-- System notifications (level-ups, cashback, race prizes, …). `data` carries a
-- small payload the client can deep-link with; `read_at` NULL means unread.
CREATE TABLE notifications (
  id bigserial PRIMARY KEY,
  user_id bigint NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  kind text NOT NULL,
  title text NOT NULL,
  body text,
  data jsonb NOT NULL DEFAULT '{}'::jsonb,
  read_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX notifications_user ON notifications(user_id, id DESC);
