# Execution: Auth Hardening (set-password) + i18n Depth

**Date:** 2026-07-27
**Scope:** Two functional-completeness items after the feature roadmap closed: (1) let an
**OAuth-only account set a first password**, and (2) **localise the login/registration screen**
(the highest-traffic surface still hardcoded in English). Constraints unchanged.

---

## 1. Set a password for OAuth-only accounts

An account created purely via social login has an **empty password hash**, so the existing
`change-password` flow (which requires the current password) locked those users out of ever adding
one — leaving them dependent on the provider and unable to unlink it.

- **`POST /api/account/password/change`** now doubles as "set initial password": when the account
  has no password (`password_hash = ''`), it sets the first one **without** requiring a current
  password (the endpoint is already auth-gated, so only the owner acts). When a password exists,
  the current one is still mandatory and verified — unchanged. Response gains `wasSet`.
- **Client** — `AccountSettings › Security` detects `hasPassword` (via `/api/account/oauth`) and
  renders **"Set Password"** (no current-password field, explanatory hint) vs **"Change Password"**.
  Once set, unlinking the last provider is no longer blocked.
- **Tests (`accountLifecycle.test.js`, +2):** a password account still rejects a wrong/absent current
  password; a seeded password-less account sets an initial password with no current one, then logs
  in with it, and a subsequent change correctly requires the just-set password.

This closes the last edge in the auth model: **every account can always reach a state with at least
one usable, self-owned login method.**

## 2. i18n depth — the auth screen

The login/registration view in `AccountPanel` was still English. Added **13 `auth.*` keys** across
all **7 locales** (en/ru/uk/es/de/fr/pt) — eyebrow, title, field labels (display name / email /
password), the submit button (incl. the busy state), the register⇄login toggle, and the legal line
("18+ · Entertainment only · Credits have no cash value") — and migrated the JSX to `t()`. The
strict parity + placeholder tests already guard the new keys (46 keys × 7 locales, all equal).

---

## Verification (2026-07-27)

| Battery | Result |
|---|---|
| Platform API | **132 pass / 0 fail** (+2 password) |
| lobby (build + tests) | ✓ built · 13 pass (i18n parity now 46 keys × 7) |
| game-sdk / platform build | 11 pass / ✓ clean |
| root lint / vitest+server / build+`verify:dist` | ✓ clean / 8 pass / 3 brands verified |

## Remaining depth (optional, non-blocking)

- Continue i18n into the rest of `AccountPanel` (profile view), `AccountSettings`, and
  `ResponsiblePlay` — purely additive translation work against the same catalog + parity guard.
- Photorealistic ComfyUI cover pass when the GPU frees (`scripts/generate-covers.mjs` is ready).
