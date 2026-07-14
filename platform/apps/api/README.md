# Arcade API

Production PostgreSQL API for virtual credits only. It provides registration/session/profile, favorites, recents, an append-only wallet ledger, idempotent daily rewards and server-authoritative provably-fair rounds.

Set `DATABASE_URL`, run `npm start`; ordered SQL migrations in `migrations/` apply automatically. Production should use a dedicated least-privilege PostgreSQL role, TLS (`DATABASE_SSL=true`) and exact `ALLOWED_ORIGINS`.

Wallet mutations run in transactions under a per-user PostgreSQL advisory lock. `roundId` and ledger idempotency constraints prevent duplicate debits/credits. Clients submit a bet and identifiers only; settlement derives the outcome from HMAC-SHA256 server/client seeds and nonce. The server reveals its committed seed after settlement.

Routes: `/api/auth/register`, `/api/auth/login`, `/api/auth/logout`, `/api/profile`, `/api/favorites`, `/api/recents`, `/api/wallet`, `/api/wallet/balance`, `/api/wallet/bet`, `/api/wallet/settle`, `/api/wallet/daily-reward`, `/api/history/rounds`.

```sh
npm install
npm test
npm start
```
## Analytics

Privacy-conscious first-party analytics setup and aggregate reporting are documented in [`../../docs/ANALYTICS.md`](../../docs/ANALYTICS.md). Production requires a strong `ANALYTICS_ADMIN_KEY`; ingestion remains available for consented anonymous sessions, while report endpoints require that bearer key.
