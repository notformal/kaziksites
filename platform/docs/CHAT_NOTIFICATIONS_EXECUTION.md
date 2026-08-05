# Execution: Realtime Chat + Notification Center

**Date:** 2026-07-26
**Scope:** The next two P2 realtime-infra items, built on the SSE transport proven by the
live win feed: (1) a **public lobby chat** room, and (2) a per-user **notification center**
that surfaces the reward events the platform already fires. This closes the "realtime chat +
notifications" gap from `qa-artifacts/08`.

Constraints unchanged: virtual-credit / entertainment-only. Chat is a single public room —
**no DMs, no attachments, no external delivery**. `wallet_ledger` untouched (notifications are a
separate, freely-writable table; the reward grants themselves remain append-only ledger rows).

---

## Schema — `migrations/018_chat_notifications.sql`

- **`chat_messages`** — `id bigserial`, `user_id → users`, `body text`, `created_at`. Index
  `chat_messages_recent(id DESC)`.
- **`notifications`** — `id bigserial`, `user_id → users`, `kind`, `title`, `body`, `data jsonb`,
  `read_at` (NULL = unread), `created_at`. Index `notifications_user(user_id, id DESC)`.

Both `ON DELETE CASCADE` from `users`, so an account deletion cleans them up.

## Chat

- **`src/chat.js`** — `sanitizeChat(raw)`: strips control chars → spaces, collapses whitespace,
  trims, hard-caps at `CHAT_MAX = 280`, masks a small profanity list (keeps the first letter,
  word-boundary matched so "classic" is untouched). Pure + unit-tested.
- **`GET /api/chat/recent`** — last 50 messages, chronological, **public**. Joins the sender's
  `display_name` (players type under their own name — chat is opt-in, unlike the aliased feed).
- **`POST /api/chat`** — auth + `rateLimiter({limit:20})`; sanitizes, rejects empty (`400`),
  returns the created message.
- **`GET /api/chat/feed`** — public SSE: replays the last 30 as `event: message`, `event: ready`,
  then polls every 2 s for new messages.

## Notifications

- **`notify(userId, {kind,title,body,data}, client)`** helper — inserts a notification, accepting
  an optional transaction client so it is **atomic with the triggering event**. Wired into three
  existing reward paths, all inside their own transactions:
  - **level-up** bonus claim → `level-up` ("Level N reached", data `{level,rank,granted}`)
  - **cashback** claim (when `granted>0`) → `cashback`
  - **race settle** (per prize winner) → `race-prize`
- **`GET /api/notifications`** — auth: latest 50 + `unread` count.
- **`POST /api/notifications/read`** — auth: `{ids:[…]}` marks those read, or no body marks all
  unread read; returns the new `unread` count. (Scoped to `user_id` — a player can only clear
  their own; verified by test.)
- **`GET /api/notifications/feed`** — auth SSE: `event: ready` with the unread count, then polls
  every 3 s pushing new rows as `event: notification`.

## Client (lobby)

- **`api.js`** — added `chatRecent`, `chatSend`, `notifications`, `notificationsRead`, and exported
  `apiBase` (EventSource can't go through the fetch wrapper).
- **`NotificationBell.jsx` / `notifications.css`** — header bell (rendered only when signed in),
  unread badge, dropdown list, "Mark all read", live via `EventSource(/notifications/feed,
  {withCredentials})`. Falls back to the one-shot fetch if SSE is unavailable.
- **`ChatPanel.jsx` / `chat.css`** — floating bottom-right dock (FAB → window), live over
  `EventSource(/chat/feed)`; input disabled until signed in; optimistic append + id-dedupe so a
  sent message never double-renders when the poll echoes it.
- Mounted in `main.jsx`: `<NotificationBell/>` in the header actions, `<ChatPanel/>` at app root.

---

## Verification (2026-07-26)

| Battery | Result |
|---|---|
| Platform API (`apps/api/test/*.test.js`) | **103 pass / 0 fail** (+11: chat 6, notifications 6, sanitizer units) |
| game-sdk | 11 pass |
| lobby (build + tests) | ✓ built · 6 pass |
| platform build (all games + lobby + landing) | ✓ clean |
| root lint / vitest+server / build+`verify:dist` | ✓ clean / 8 pass / 3 brands verified |

New tests: `test/chat.test.js` (sanitizer units + post/recent/SSE + auth/ownership),
`test/notifications.test.js` (list/read/count, per-user isolation, level-up integration, SSE).

## Follow-ups (unchanged, infra-gated)

- The same SSE transport now covers **feed + chat + notifications** — a push-notification /
  service-worker layer would be the next extension, but needs delivery infra + user opt-in.
- i18n string extraction (22 langs), admin/PAM surface, OAuth social login remain
  credential/infra-dependent.
