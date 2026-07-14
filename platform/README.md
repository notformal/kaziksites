# Virtual Arcade Platform

Monorepo for an entertainment-only casino-style arcade using virtual credits. There are no deposits, withdrawals, cryptocurrency flows or cash-value prizes.

## Current workspace

```text
apps/lobby          React/Vite lobby migrated from the verified showcase
apps/api            Auth, wallet ledger, daily bonus, bet/settle/history API
games/slots-classic MIT slot adapted to original symbols and Game SDK
games/slots-karma   MIT/CC-BY candidate retained with attribution
games/crash         reserved for clean-room implementation
games/plinko        reserved for clean-room implementation
games/roulette      reserved for clean-room implementation
games/keno          reserved for clean-room implementation
packages/game-sdk   strict iframe/postMessage host and game adapters
```

Slot free-spin and respin lifecycle: [docs/SLOT_BONUSES.md](docs/SLOT_BONUSES.md).

## Install and test

```powershell
cd platform
npm install
npm test
npm run build -w @arcade/slots-classic
npm audit
```

The accepted slot build and SDK/API tests currently pass with zero known dependency vulnerabilities. See `../audits/AUDIT_REPORT.md` before adding upstream code: most repositories from the supplied list have no redistribution license and are intentionally excluded.

## Trust model

- The server is authoritative for credits, bets, round outcomes and settlements.
- The game sends intent (`BET_PLACED`), never an amount it claims to have won.
- A committed server-seed hash is returned when the bet opens; the server seed is revealed at settlement for HMAC-SHA256 verification.
- `roundId` makes both bet and settlement idempotent.
- Game frames and the lobby communicate only with exact configured origins and validated message shapes.

The catalog contains 200 playable titles: 132 server-authoritative games (127 original manifest-driven slots plus Slots Classic, Crash, Plinko, Roulette and Keno), 63 self-hosted MIT LittleJS games and 5 legacy MIT arcade games. PostgreSQL migrations, Nginx/Docker Compose and cross-game browser E2E are implemented. Local QA uses the in-memory PostgreSQL-compatible harness; before DNS cutover, run `scripts/verify-production.ps1` on a host with Docker to execute the real container/PostgreSQL canary.
