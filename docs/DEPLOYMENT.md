# Deployment runbook

## Architecture

- Three immutable static frontends: `dist/aurora`, `dist/ember`, `dist/royale`.
- One Node API in `server/` with a persistent SQLite volume.
- Frontends call the API configured at build time with `VITE_API_URL=https://api.example.com/api`.
- API accepts only exact deployed frontend origins through `ALLOWED_ORIGINS`.

## Build and verify

```powershell
npm ci
npm ci --prefix server
npm run build
npm run verify:dist
npm test
npm audit --omit=dev
npm audit --prefix server --omit=dev
```

Publish each `dist/<brand>` directory as the document root of its own static-hosting project. Do not publish `vendor-candidates`, `server/data`, `.env`, test screenshots or development databases.

## API deployment

```powershell
cd server
Copy-Item .env.example .env
npm ci --omit=dev
npm start
```

Required production values:

```dotenv
PORT=8787
DATABASE_PATH=/data/casino.sqlite
ALLOWED_ORIGINS=https://aurora.example.com,https://ember.example.com,https://royale.example.com
SESSION_TTL_HOURS=168
TRUST_PROXY=true
```

Mount `/data` on persistent encrypted storage, terminate TLS at a trusted reverse proxy, back up SQLite, restrict filesystem permissions and monitor `/health`. Set `TRUST_PROXY=true` only when the immediate proxy is controlled. For multiple API replicas, migrate SQLite and the in-process rate limiter to shared production services first.

## Post-deploy canary

For every domain verify page/title, security headers, registration, login/logout, wallet balance, first and repeated daily reward, favorite add/remove, recent-game update, all five real games, legal pages, mobile bottom navigation and zero browser-console errors. Never log passwords, bearer tokens or raw authorization headers.
