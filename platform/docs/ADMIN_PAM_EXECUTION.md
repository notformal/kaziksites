# Execution: Operator Backoffice (Player Account Management)

**Date:** 2026-07-26
**Scope:** The operator/admin surface a real platform needs — player search, per-player
inspection, virtual-credit adjustments, responsible-play interventions, and platform metrics —
plus a self-contained operator console UI. This closes the "admin/PAM surface" P2 gap.

Model constraints held throughout: **virtual-credit / entertainment-only**. Balance changes are
**append-only `adjustment` ledger rows** (never UPDATE/DELETE — the ledger triggers still hold);
responsible-play interventions reuse the same **extend-only self-exclusion** rule as the
player-facing control, so an operator can protect a player but never weaken a protection.

---

## Auth

- `src/admin.js` → `mountAdmin(app, {db, config, now})`, mounted alongside `mountAnalytics` /
  `mountSocial`.
- Gated by a shared **admin key** (`config.adminKey`, falling back to `config.analyticsAdminKey`),
  sent as the **`X-Admin-Key`** header (a `Bearer <key>` form is also accepted). Constant-time
  compared; a distinct header means an admin secret can never be mistaken for a player token.
- CORS layer updated: **same-origin requests are always allowed** (so a page the API serves can
  POST), and `X-Admin-Key` is added to `Access-Control-Allow-Headers`. Full API suite re-run to
  confirm no regression.

## Endpoints

| Method / path | Purpose |
|---|---|
| `GET /api/admin/metrics` | Players, active sessions, total wagered, **house GGR**, **RTP %**, rounds, chat messages, self-excluded count — all derived from the ledger + tables. |
| `GET /api/admin/players?q=&limit=&offset=` | Search by email/display-name; each row carries balance, wagered, level/rank and RG status. Paginated with a total. |
| `GET /api/admin/players/:id` | Full detail: wallet (balance/wagered/level/rank), device count, unread notifications, chat count, RG settings, last 20 ledger entries. |
| `POST /api/admin/players/:id/adjust` | `{amount, reason, key?}` → append-only `adjustment` ledger row. Non-zero amount + reason required; idempotent by key (explicit or per-second) so a retry never double-credits. |
| `POST /api/admin/players/:id/responsible-play` | Operator-set daily limits / cooling-off / self-exclusion. Self-exclusion is **extend-only**. |
| `GET /admin` | The operator console (public HTML shell; all data behind the key). |

## Operator console (`src/admin-console.html`)

A single self-contained page (inline CSS/JS, no build step, `noindex`) served at `/admin`:
key-gate → KPI dashboard → live player search table → click-through player dialog with an
**adjust-balance** form, a **responsible-play intervention** form, and the recent ledger. The
admin key is entered in the UI, kept in `sessionStorage`, and sent only as `X-Admin-Key` — it is
never embedded in the served HTML (asserted by test). All output is HTML-escaped.

---

## Tests — `test/admin.test.js` (8)

- Every admin route rejects a missing/wrong key (401).
- Metrics compute wager + GGR + RTP from seeded ledger rows.
- Search returns balance/level/RG and honours the `q` filter.
- Adjust posts an append-only row, is **idempotent by key**, and the player's own wallet reflects it.
- Adjust validates amount/reason and 404s unknown players.
- An operator self-exclusion **cannot be shortened by the player**, and the shared RG gate then
  reports the player blocked.
- Player detail exposes wallet/RG/recent-ledger.
- `/admin` serves HTML and never leaks the key.

## Verification (2026-07-26)

| Battery | Result |
|---|---|
| Platform API (`apps/api/test/*.test.js`) | **111 pass / 0 fail** (+8 admin) |
| game-sdk / lobby | 11 / 6 pass |
| platform build (games + lobby + landing) | ✓ clean |
| root lint / vitest+server / build+`verify:dist` | ✓ clean / 8 pass / 3 brands verified |

## Follow-ups (infra/credential-gated, unchanged)

- **Push notifications / service-worker delivery** — needs a service worker + user opt-in + a
  push service; the notification *data* already exists to power it.
- **i18n** string extraction (22 langs) and **OAuth** social login remain the last two P2/P3 items,
  both dependent on translation content / external provider credentials.
