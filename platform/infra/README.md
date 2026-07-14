# Production container deployment

The stack contains an edge Nginx proxy, a lobby server, a separately published game origin, the API, and PostgreSQL. PostgreSQL and the API remain on an internal Docker network. Route the lobby domain to `HTTP_PORT` and the isolated games domain to `GAMES_PORT`.

## First start

```powershell
Copy-Item .env.production.example .env
# Replace every CHANGE_ME and set PUBLIC_ORIGIN/GAMES_ORIGIN to their final HTTPS origins.
docker compose config --quiet
docker compose build --pull
docker compose up -d
docker compose ps
Invoke-RestMethod http://127.0.0.1:8080/healthz
Invoke-RestMethod http://127.0.0.1:8080/api/health
```

TLS should terminate at a managed load balancer/CDN or HTTPS host proxy. Never expose ports 5432, 8787, or the lobby container directly. `GAMES_PORT` is intentionally routed through the dedicated games hostname so iframe code is cross-origin from the lobby.

## Release gate

1. Use unique 32+ byte database and session secrets. Do not commit `.env`.
2. Run unit, build, dependency-audit, and browser E2E suites.
3. Verify registration, login, wallet idempotency, every game round, daily reward, logout, and session restoration against the built containers.
4. Back up PostgreSQL and test a restore before allowing production traffic.
5. Confirm migrations completed and the API uses `DATABASE_URL`; verify a new account survives an API container replacement.
6. Put HTTPS/HSTS at the public edge and set `PUBLIC_ORIGIN` to that exact origin.

## Operations

```powershell
docker compose logs -f --tail=200
docker compose pull
docker compose build --pull
docker compose up -d --remove-orphans
docker compose exec postgres pg_dump -U $env:POSTGRES_USER -d $env:POSTGRES_DB -Fc -f /tmp/arcade.dump
```

Images run without extra Linux capabilities (`no-new-privileges`), static containers have read-only root filesystems, request bodies are capped, and API traffic has an edge rate limit. Application-level authorization, validation, idempotency, and rate limits remain mandatory.
