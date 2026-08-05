-- Social login (OAuth 2.0 / OIDC). Provider-agnostic: providers are configured
-- at runtime (client id/secret + endpoints), so this schema only holds the
-- short-lived CSRF/PKCE state and the durable identity → user links.
CREATE TABLE oauth_states (
  state text PRIMARY KEY,
  provider text NOT NULL,
  code_verifier text NOT NULL,
  redirect_to text,
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL
);

CREATE TABLE oauth_identities (
  id bigserial PRIMARY KEY,
  provider text NOT NULL,
  provider_user_id text NOT NULL,
  user_id bigint NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  email text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(provider, provider_user_id)
);
CREATE INDEX oauth_identities_user ON oauth_identities(user_id);
