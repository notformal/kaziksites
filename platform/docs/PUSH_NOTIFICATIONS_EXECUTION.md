# Execution: Web Push Notifications

**Date:** 2026-07-26
**Scope:** The buildable, testable half of push notifications — VAPID key exposure, subscription
management, a dispatch/prune layer, a service worker, and a lobby opt-in. The only part that
cannot be exercised in this harness is the encrypted POST to a real browser push service
(Google/Mozilla), so that transport is a **dependency-injected `sender`**: production wires a
web-push-backed sender; the app owns everything else.

Constraints unchanged: entertainment-only, virtual-credit. Push carries the same reward
notifications already produced (level-up, cashback, race prize) — no new data, no PII beyond the
opaque push endpoint the browser issues.

---

## Server

- **`migrations/019_push_subscriptions.sql`** — `push_subscriptions(user_id, endpoint UNIQUE,
  p256dh, auth, …)`, cascade-deleted with the user.
- **`src/push.js` → `mountPush(app, {db, config, now})`**:
  - VAPID application-server key: `config.vapidPublicKey`, else a P-256 key generated per process
    (raw uncompressed point, base64url — exactly what `pushManager.subscribe()` needs).
  - `GET /api/push/vapid` → `{ publicKey, configured }` (public).
  - `POST /api/push/subscribe` (auth) — validates `{endpoint, keys:{p256dh, auth}}`, **upserts by
    endpoint** (re-subscribing re-homes it, never duplicates).
  - `POST /api/push/unsubscribe` (auth) — removes the caller's endpoint.
  - `GET /api/push/status` (auth) — subscription count + whether delivery is configured.
  - **`dispatch(userId, payload)`** — fans the payload out to every subscription via the injected
    sender; a `404`/`410` ("gone") response **prunes** that dead endpoint. Best-effort, never throws.
- **Wiring:** `dispatch()` fires **post-commit** from the level-up, cashback and race-prize handlers
  (after the DB transaction, so a rolled-back reward never pushes). The race handler also stops
  leaking winner user ids — the settle response is alias-only again.

## Client (lobby)

- **`public/sw.js`** — service worker: renders an OS notification per `push` event (payload shape
  matches `dispatch()`), and on `notificationclick` focuses an existing lobby window or opens one.
- **`src/push.js`** — `pushSupported()`, `pushState()`, `enablePush()`, `disablePush()`: registers
  `/sw.js`, subscribes with the VAPID key (base64url → `Uint8Array`), and mirrors the subscription
  to the API. Every path guarded so an unsupported browser or denied permission degrades quietly.
- **`NotificationBell`** — an "Enable / Disable push notifications" toggle at the foot of the
  dropdown, shown only when the browser supports push and permission isn't denied. Localised
  (`push.enable` / `push.disable` added to all 7 locales).

## Tests — `test/push.test.js` (5)

- VAPID endpoint returns a base64url key; `configured:false` with no sender.
- Subscribe requires auth, is idempotent by endpoint; unsubscribe + status reflect it.
- Subscribe rejects malformed payloads (400).
- **A level-up claim dispatches a push** to the subscribed device (injected sender receives the
  `level-up` payload) — proves the post-commit wiring.
- **A `410` from the sender prunes** the dead subscription.

`_fixture.js` now accepts a `config` override so a test can inject `pushSender`.

## Verification (2026-07-26)

| Battery | Result |
|---|---|
| Platform API | **116 pass / 0 fail** (+5 push) |
| lobby (build + tests) | ✓ built · 13 pass · `sw.js` ships to `dist/` |
| game-sdk | 11 pass |
| platform build / root lint / root tests / build+`verify:dist` | ✓ clean / clean / 8 pass / 3 brands verified |

## To go fully live in production

1. Generate a stable VAPID keypair once; set `config.vapidPublicKey` (+ keep the private key for
   the sender).
2. Inject `config.pushSender = (subscription, payloadString) => webpush.sendNotification(...)`
   using the `web-push` package with those VAPID details and a bounded timeout.

Everything else — subscribe, store, dispatch, prune, service worker, opt-in UI — is already done
and tested.

## Remaining roadmap

- **OAuth social login** is now the only untouched item, and it is hard-blocked on external
  provider (Google/etc.) client credentials — not buildable or verifiable in this harness.
