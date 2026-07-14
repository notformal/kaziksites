# Server-authoritative slot bonuses

`slots-studio` titles whose manifest declares `free-spins` or `respin` use persisted bonus sessions. The browser cannot award spins, choose an outcome, or credit a win.

1. A paid round is created through `POST /api/wallet/bet` and settled through `POST /api/wallet/settle`.
2. When the server-generated grid contains the configured scatter count, settlement creates one `slot_bonus_sessions` row. `free-spins` awards the manifest count; `respin` awards one additional spin.
3. The iframe sends `BONUS_SPIN` with the opaque session and a new idempotency `roundId`. The host calls `POST /api/wallet/bonus-spin`.
4. In one database transaction the API locks the player, consumes exactly one remaining spin, generates and stores a provably-fair grid, appends any win to the ledger, and returns the remaining state.
5. Repeating a consumed `roundId` returns the stored round and never credits the ledger twice. Refresh recovery uses `GET /api/wallet/bonus-session?gameId=...`.

Bonus rounds appear in round history with `isBonus: true`, `bonusSessionId`, and `bet: 0`. Payout calculation uses the paid triggering round's funded bet, which is stored only on the server. Bonus state survives API and browser restarts because PostgreSQL is the source of truth.

Multiplier bonuses remain immediate modifiers of the triggering server outcome; they do not create a session.
