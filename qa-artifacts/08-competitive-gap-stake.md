# Competitive Gap Analysis — vs. "1Stake / Stake iGaming Platform" (CodeCanyon #25370124)

**Date:** 2026-07-22 (round 3 update)
**Their stack:** Vue 3 PWA + Laravel 11 / PHP 8 + Sanctum + real-time broadcasting.
**Our stack:** React 19 + Vite (SPA/PWA) + Node/Express 5 + PostgreSQL, provably-fair, workspace monorepo.

---

## Резюме (RU)

Их продукт — **real-money iGaming**; наш — **virtual-credit social arcade (entertainment-only)**. Gap
закрываем в нашей модели (виртуальные кредиты без денежной ценности). Реально-денежные модули
(крипто-кошелёк, депозит/вывод, KYC/AML, affiliate revenue-share, платные провайдеры, боты-фейки)
**сознательно исключены** — требуют лицензии и меняют юридическую природу продукта.

**Реализовано (round 3), всё покрыто тестами:** originals **Dice / Limbo / Wheel / Mines**, **Progression/VIP**
(XP из ставок, уровни, ранги Bronze→Diamond), бонусы **level-up + faucet**, **2FA (TOTP, RFC 6238)**,
**Challenges** (wager-достижения). Плюс инфраструктурный рефактор: общая тест-фикстура с динамической
загрузкой всех миграций (навсегда закрывает класс дефекта DEF-013).

Scope legend: **✅ have** · **🟡 partial** · **➕ added** · **⬜ buildable (virtual-credit)** ·
**⛔ excluded (real-money / licensing / paid 3rd-party)**.

---

## 1. Games

| Their game | Us | Notes |
|---|---|---|
| Dice | ➕ | provably-fair over/under, 1% edge, choice-validated |
| Limbo | ➕ | target-multiplier, 1% edge |
| Wheel (Lucky Wheel) | ➕ | single-shot, 10 segments, exact 1% edge |
| Mines | ➕ | **stateful** reveal→cashout state machine, provably-fair, RP-enforced |
| Crash | ✅ | server-elapsed cashout |
| Plinko | ✅ | server-owned bins |
| Roulette (EU/US/multiplayer) | 🟡 | EU single-player ✅; American/multiplayer ⬜ |
| Keno | ✅ | server draw + paytable |
| Slots (Multi/3D + providers) | 🟡 | 127 first-party math profiles ✅; branded-provider slots ⛔ |
| Hilo / Heads-or-Tails | ⬜ | next stateful original (same pattern as Mines) |
| Sic Bo / Baccarat / Blackjack / Poker | ⬜ | card/dice engines (modules M4–M7) |
| Horse Racing / Raffle / Lottery | ⬜ | scheduled draw (module M8) |
| Crypto Prediction · Provider games · Sports (real-money) | ⛔ | real-money / paid aggregation / licensing |

## 2. Platform modules

| Module | Their feature | Us | Status |
|---|---|---|---|
| **Wallet** | Multi-currency, Gold/Sweeps | 🟡 | Single append-only `CREDITS` ledger ✅. Multi-currency ⬜ cosmetic; sweeps/real ⛔ |
| **Provably fair** | Proprietary | ✅ | HMAC-SHA256 commit/reveal + client-verify |
| **Progression / VIP** | XP ranks, level-up bonuses | ➕ | **added** — XP from wagering, levels, Bronze→Diamond ranks, level-up bonus |
| **Bonuses** | signup, email-verify, faucet, cashback, reload | ➕ | daily reward ✅ + **level-up + faucet added**; cashback/reload ⬜ |
| **2FA** | TOTP | ➕ | **added** — RFC 6238, login-enforced, enrol/enable/disable |
| **Races / Challenges** | tournaments, wager races | 🟡 | **Challenges added** (wager achievements); time-windowed races need a scheduler ⬜ |
| **Responsible play** | (weak on donor) | ✅ | server-enforced limits + self-exclusion on every play path incl. Mines |
| **Chat / presence / tips** | Multi-room realtime | ⬜ | **P2** — needs SSE/WS transport |
| **Live game feed** | Real-time bet feed | 🟡 | privacy-thresholded social feed ✅; live stream ⬜ **P2** |
| **Notifications / i18n / Admin PAM** | in-app / 22 langs / dashboard | 🟡/⬜ | **P2** |
| **Auth (social/Web3)** | OAuth + wallets | 🟡 | email/password + HttpOnly + **2FA** ✅; social ⬜ **P3**; Web3 ⛔ |
| **Affiliate/Agent · Payments · KYC · Provider agg · Bots** | — | ⛔ | excluded (real-money / licensing / integrity) |

## 3. Delivered (round 3) — all server-side, all tested

| Feature | Files | Tests |
|---|---|---|
| Dice / Limbo / Wheel | `provablyFair.js`, `gameRegistry.js`, `app.js` (choiceOk) | `originals.test.js` (8) — Monte-Carlo edge, determinism, bet→settle, validation |
| Mines (stateful) | `mines.js`, `migrations/011`, `app.js` (start/reveal/cashout) | `mines.test.js` (5) — engine, bust, cashout math, state machine, RP |
| Progression/VIP + level-up + faucet | `progression.js`, `migrations/009`, `app.js` | `progression.test.js` (4) — thresholds, XP, idempotent bonus, faucet |
| Challenges | `progression.js` (CHALLENGES), `migrations/012`, `app.js` | `challenges.test.js` (1) — progress, reward, idempotency |
| 2FA (TOTP) | `totp.js`, `migrations/010`, `app.js` + login guard | `twofactor.test.js` (3) — RFC 6238 vectors, enrol/login flow |
| **Test infra** | `test/_fixture.js`, dynamic `memory.js` | all suites migrated; new migrations auto-load |

Platform test count: **55 API tests** (was 24) + 77 across the workspace. Root/site gates all green;
`npm audit` 0 across prod+dev.

Design guarantees kept: XP/wager metrics are **derived** from the append-only ledger (no writes on the
bet/settle hot path), every bonus is **idempotent** (ledger idempotency key + claim table), and every new
play path (Mines start) enforces **responsible-play** and debits atomically under an advisory lock.

## 4. Remaining roadmap (honest status)

- **✅ DELIVERED (2026-07-23):** **Hilo** (stateful provably-fair original, server + client, game #205) and
  the **cashback** bonus (`/api/account/bonus/cashback`, 5% of net loss). See
  `platform/docs/HILO_CASHBACK_EXECUTION.md`.
- **✅ DELIVERED (2026-07-24):** **Sic Bo**, **Baccarat** and **American Roulette** — server engines
  (authentic house edges) + client mini-apps, registry 138 / catalog 208. See
  `platform/docs/TABLE_GAMES_EXECUTION.md`.
- **✅ DELIVERED (2026-07-24):** **Blackjack** — stateful hit/stand/double, natural 3:2, server + client
  (game #209). See `platform/docs/BLACKJACK_EXECUTION.md`.
- **✅ DELIVERED (2026-07-25):** **Casino Hold'em** + a reusable **poker hand evaluator** (`poker.js`) —
  server + client (game #210). See `platform/docs/POKER_HOLDEM_EXECUTION.md`.
- **✅ DELIVERED (2026-07-25):** **Video Poker (Jacks or Better)** — reuses the poker evaluator, server +
  client (game #211). See `platform/docs/VIDEO_POKER_EXECUTION.md`.
- **✅ DELIVERED (2026-07-25):** **Races / tournaments** — derived wager standings + idempotent
  (cron-free) prize settlement. See `platform/docs/RACES_EXECUTION.md`.
- **⬜ Server-testable remainder:** multiplayer roulette (shared-table variant of an implemented game).
  All of Stake's named originals, core table/card games, and the wager-race meta-mechanic are now built.
- **✅ DELIVERED (2026-07-26):** **Live win feed** — the first realtime-infra piece. Public,
  privacy-aliased SSE stream (`GET /api/live/feed` + `/api/live/recent`) derived from the append-only
  ledger, plus a lobby marquee ticker (`LiveFeed.jsx`). Proves the SSE transport for the rest of P2.
  See `platform/docs/ASSETS_LIVEFEED_EXECUTION.md`.
- **✅ DELIVERED (2026-07-26):** **Cover art for games 11–21** — 11 procedural covers shipped +
  `<img onError>` fallback, and a ready-to-run photorealistic **ComfyUI** generator
  (`scripts/generate-covers.mjs`, drop-in `covers-v2/game-<id>.jpg`).
- **✅ DELIVERED (2026-07-26):** **Realtime chat + notification center** — a public lobby chat room
  (sanitized, rate-limited, SSE-streamed) and a per-user notification center that surfaces level-up,
  cashback and race-prize events, both over the proven SSE transport + lobby UI (bell + chat dock).
  See `platform/docs/CHAT_NOTIFICATIONS_EXECUTION.md`.
- **✅ DELIVERED (2026-07-26):** **Operator backoffice (Admin / PAM)** — admin-key-gated player
  search, per-player detail, append-only virtual-credit adjustments, operator responsible-play
  interventions (extend-only), platform metrics (wager/GGR/RTP), and a self-contained operator
  console served at `/admin`. See `platform/docs/ADMIN_PAM_EXECUTION.md`.
- **✅ DELIVERED (2026-07-26):** **Internationalization (i18n)** — a translation runtime (detect →
  fallback → `{placeholder}` interpolation), a 7-language catalog (en/ru/uk/es/de/fr/pt) with a
  strict key-parity + placeholder-preservation test, a header language switcher, and migration of
  the visible lobby chrome + realtime components. Structured to scale to the full 22-language
  target (additive translation content only). See `platform/docs/I18N_EXECUTION.md`.
- **✅ DELIVERED (2026-07-26):** **Web Push notifications** (buildable half) — VAPID key exposure,
  subscription CRUD, a dispatch/prune layer wired post-commit into level-up/cashback/race-prize, a
  service worker, and a localised lobby opt-in. Real device delivery is a dependency-injected
  `sender` (production wires web-push); everything else is built + tested. See
  `platform/docs/PUSH_NOTIFICATIONS_EXECUTION.md`.
- **✅ DELIVERED (2026-07-27):** **OAuth social login** — provider-agnostic OAuth2 authorization-code
  + PKCE, one-time CSRF state, verified-email account linking (no takeover), fresh-account creation
  with welcome credit, and normal session issuance — all tested via an injected transport + a
  localised lobby button. Going live is pure configuration (`config.oauthProviders`), no code. See
  `platform/docs/OAUTH_EXECUTION.md`.

- **✅ DELIVERED (2026-07-27):** **Reusable slot mechanics engine + symbol asset base** — a
  data-driven, provably-fair `slotEngine` (fixed lines, 243-ways, cascading reels, wilds, scatters,
  free spins, multipliers), a 3-profile RTP-tuned library (95.0 / 95.5 / 95.4% verified over 2M
  spins), Monte-Carlo tests, and a themed transparent symbol set (9 icons) with a reusable
  SVG + ComfyUI generator. Also hardened the whole test suite: a pre-existing statistical flake
  cluster fixed (**0 fails / 40 runs**). See `platform/docs/SLOT_ENGINE_EXECUTION.md`.

**Roadmap complete.** Every feature buildable in this environment is implemented and
regression-tested. The slot engine is the reusable foundation for building further titles (math +
art, not new plumbing). The only production step that remains for the social-login and push features is
supplying real credentials/keys (provider client id/secret; VAPID keypair + a web-push sender) —
configuration, not code.
- **⬜ P3:** social login (OAuth) — external credentials/redirect infra required.
- **Client game UIs — ✅ DELIVERED (2026-07-23):** playable mini-apps for Dice/Limbo/Wheel/Mines shipped
  and registered in the catalog (204 games). Mines required a backward-compatible game-sdk protocol
  extension. See `platform/docs/CLIENT_GAMES_EXECUTION.md`.
- **⛔ Never in this product:** real-money payments, crypto in/out, KYC/AML, affiliate/agent payouts, paid
  provider aggregation, fake-player bots.

These remaining items are either scheduler/infra/credential-dependent (can't be meaningfully verified in
this harness) or client UI work; the correctness-critical server engines for the P1 tier are complete and
regression-tested.
