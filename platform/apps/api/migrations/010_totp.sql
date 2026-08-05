-- Optional TOTP two-factor authentication (RFC 6238). One secret per user;
-- `enabled` flips true only after the user confirms a valid code.
CREATE TABLE user_totp (
  user_id bigint PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  secret text NOT NULL,
  enabled boolean NOT NULL DEFAULT false,
  confirmed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
