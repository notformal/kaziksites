# Demo social-casino API

Node 20+ API with SQLite persistence. It uses scrypt password hashing, opaque bearer sessions (only token hashes are persisted), an append-only virtual-credit ledger, favorites, recents and an idempotent UTC daily reward. Credits have no cash value and there are no deposits, withdrawals or real-money wagering.

```powershell
cd server
npm install
Copy-Item .env.example .env
npm test
npm start
```

Routes are under `/api`: `auth/register`, `auth/login`, `auth/logout`, `profile`, `favorites/:gameId`, `recents/:gameId`, `wallet`, and `wallet/daily-reward`. Send `Authorization: Bearer <token>` on authenticated routes. Configure exact frontend origins through `ALLOWED_ORIGINS`; never use `*` in production.

Operational notes: put the API behind TLS, set `TRUST_PROXY=true` only behind a trusted reverse proxy, back up the SQLite database and use a shared rate-limit store if deploying multiple API replicas. The in-memory limiter is deliberately per-process.
