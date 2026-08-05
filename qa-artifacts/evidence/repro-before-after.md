# Runtime evidence — before vs after

Captured with `evidence/repro.mjs` (pg-mem + `createApp()`), Node v24.14.0.

## BEFORE (defective WIP)

```
008 tables created OK

=== BUG A: self-exclusion wiped by a normal save ===
POST self-exclude 168h: { status: 200, body: { updated: true } }
AFTER exclude -> selfExcludedUntil = 2026-07-24T13:01:00.686Z
POST just a loss limit: { status: 200, body: { updated: true } }
AFTER innocent save -> selfExcludedUntil = null
>>> CONFIRMED: self-exclusion WIPED to null.

=== BUG B: POST responsible-play WITHOUT prior GET (insert branch) ===
POST (no prior row): { status: 500, body: { error: 'internal_error' } }
   ReferenceError: sets is not defined  at app.js:1004

=== BUG C: password change invalid SQL + password still changes ===
POST password/change HTTP: { status: 500, body: { error: 'internal_error' } }
login with OLD password: 401
login with NEW password: 200   <- password DID change despite the 500

=== BUG D: devices list always empty ===
GET devices: { status: 200, body: { devices: [] } }
```

Additionally (verified statically / by migration): `POST /api/account/delete` runs
`DELETE FROM wallet_ledger`, which the `ledger_no_delete` trigger (migration 001) rejects, so account
deletion returns 500 in real PostgreSQL; and the bet endpoint contained **no** responsible-play check.

## AFTER (fixed)

Behaviour is now asserted by `platform/apps/api/test/accountLifecycle.test.js` (8/8 pass):

- Self-exclusion survives an unrelated save and cannot be shortened.
- First-time responsible-play save returns 200 (upsert).
- Password change returns 200, keeps the current session, invalidates the others; new password works.
- Account delete returns 200, anonymises the user, and **preserves** the append-only ledger.
- `POST /api/wallet/bet` returns 403 during self-exclusion and once a daily wager limit is reached.
- Devices are recorded per session; `revoke-others` leaves only the current one.
