-- Support linking a provider to an ALREADY-authenticated account (not just
-- login). When /start is hit with a session + link intent, the resulting state
-- carries the user id so the callback links the identity to that user instead of
-- finding/creating one.
ALTER TABLE oauth_states ADD COLUMN link_user_id bigint;
