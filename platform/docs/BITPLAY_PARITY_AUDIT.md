# BitPlay functional parity audit

Audit date: 2026-07-14. Reference: `https://bitplay.ag/`.

This is a read-only product audit of the publicly accessible experience. It is
not permission to copy BitPlay trademarks, artwork, text, testimonials, game
clients, payment flows, or private account functionality. The local product
remains an independent entertainment platform using non-redeemable virtual
credits only.

## Evidence and limitations

- The public home page, navigation, platform page, FAQ, support, responsible
  gaming and sign-up promotion pages were inspected.
- Desktop at 1440 px and mobile at 390 px were rendered in Chromium. Evidence is
  stored in `output/bitplay-parity-desktop.png` and
  `output/bitplay-parity-mobile.png`.
- The audit did not create an account, transfer funds, request a withdrawal, or
  enter third-party platform credentials. Public labels are not proof that the
  corresponding private workflow works.
- BitPlay currently presents real-money/crypto language. Those mechanics are
  intentionally outside the local platform's virtual-only scope.

## Information architecture

BitPlay uses an application shell rather than a conventional casino-game grid.

### Global shell

- Desktop: persistent left rail with Deposit, Express deposit, Platforms,
  Withdrawal, Promotions, User Role Bonuses, Events, How it works, Buy Crypto,
  FAQ, Support, Blog, Responsible Gaming and app download.
- Header: brand, account entry points, awards/royal-feature shortcuts and a chat
  affordance.
- Mobile: compact brand/header with Sign in, Sign up and hamburger navigation.
  Content becomes a single column; the platform search and card actions remain
  reachable.
- Footer: resources, pages, promotion index, platform index, policy links and an
  age/payment disclosure row.

### Home-page sequence

1. Account/signup incentive and rotating full-screen promotion.
2. Hero campaigns and welcome offer.
3. Quick transaction module.
4. Platform/deposit cards and platform search.
5. Full platform directory.
6. Promotion carousel.
7. Three-step How it works explanation.
8. Hot games.
9. Player testimonial carousel.
10. Deep link footer.

The main commercial object is a **platform account**, not an individual game.
For example, the public Vegas X page describes a deposit-first access flow in
which credentials and a platform URL are delivered separately. Its catalog is
described as slots, fish tables, keno and card games. This model must not be
represented locally unless real first-party platform provisioning exists.

## Navigation and discovery

- Platform directory: roughly three dozen named platforms, each with a public
  game count. Some counts are zero, which indicates this is a directory rather
  than a normalized playable catalog.
- Quick platform cards: image, name, quantity controls and a primary action.
- Search: emphasized inside the platform/deposit section. Mobile exposes a
  dedicated Search control before the list.
- Game discovery: a smaller Hot Games rail appears much later on the page.
- Platform detail: breadcrumb, explanatory content, access prerequisites,
  supported devices, category overview, troubleshooting and repeated CTA.

### Current platform comparison

The local product is stronger at direct game discovery: 200 playable entries,
title search, categories, Popular, Favorites, Recent and incremental loading.
It lacks a first-class provider/studio index and provider detail pages. A safe
parity implementation should add original provider/studio groupings, factual
counts and descriptive pages, while keeping every Play action first-party.

## Authentication and onboarding

Publicly observable BitPlay behavior:

- Sign in and Sign up are always visible in the header.
- A large first-visit signup promotion can block most of the page on desktop and
  mobile; it includes close, previous/next and a single conversion CTA.
- Signup value is repeated in hero, promotion modules and How it works.
- The public content describes registration followed by approval, funding and
  delivery of third-party platform credentials.

Current local behavior:

- Cookie-backed registration, login, logout and profile are implemented.
- Registration asks for display name, email and a minimum 10-character password.
- New players receive 5,000 virtual credits.
- A three-step first-visit walkthrough exists without fully hiding the lobby.
- Missing: email verification, password reset, change password, session/device
  management, account deletion/export and verified operator support.

The local onboarding should remain less obstructive than BitPlay's popup, but it
should gain a visible progress path: create profile, collect virtual welcome
credits, choose a game and complete the first server round.

## Catalog, game detail and player

BitPlay's public home is not a unified embedded player. It promotes third-party
platforms, then sends users through separately provisioned platform access. Its
public platform pages are largely acquisition and troubleshooting content.

The local platform currently provides a more integrated flow:

- 200 self-hosted catalog entries.
- Game cards open a controlled player/frame directly.
- 132 titles participate in the server wallet protocol; 68 arcade titles do not
  wager credits.
- Favorites, recently played and authenticated round history.
- Server-authoritative debit/outcome/settlement for wallet games.
- Commitment and HMAC verification data for settled server rounds.

Applicable parity gaps:

- no intermediate game-detail view with mechanics, volatility, RTP/model
  disclosure, bet range, controls, session type and fairness version;
- no provider/studio browse pages or Related games rail;
- no Continue playing rail backed by last-played state in every brand layout;
- player chrome does not yet expose a consistent game title, favorite, help,
  sound/fullscreen controls and recent round receipt around every game;
- the 127 slot variants share one manifest-driven studio engine and must not be
  marketed as 127 independently engineered commercial games;
- the 68 arcade games must be visibly labelled as score games rather than wallet
  games.

## Wallet and rewards

BitPlay publicly exposes quick deposit, quantity adjustment, payment selection,
bonus-code entry, multiple deposit bonuses, withdrawal, crypto purchase and
express deposit. These are real-money-oriented features and are not parity
targets for this project.

Safe local equivalents:

- persistent virtual-credit balance;
- welcome grant and once-per-UTC-day reward;
- immutable wallet ledger and idempotent round identifiers;
- virtual reward center with expiry/status/rules;
- no purchase, deposit, withdrawal, redemption or cash-value language.

The local wallet has the underlying balance and daily reward, but lacks a ledger
UI that explains every credit/debit, reward inventory, reward expiry, and a
clear insufficient-credit recovery path using free virtual grants.

## Promotions, social and retention

BitPlay publicly advertises signup, first/second/third deposit, leaderboard,
live marbles, wheel, awards, referral, happy hours, birthday, express deposit,
social-media and role-based programs. These campaigns repeat across navigation,
home modules and dedicated detail pages.

The local platform has a daily reward and privacy-thresholded social endpoints:

- `/api/social/activity` derives activity from settled rounds;
- `/api/social/leaderboard?period=daily|weekly|all-time` produces anonymous,
  virtual-only rankings;
- both suppress output until at least three distinct players qualify.

This is a sound truthfulness model, but promotion depth remains low. Safe
commercial-quality additions are a campaign center, virtual missions, streaks,
level/XP progression, a free daily wheel with server-issued outcomes and virtual
rewards, and an opt-in referral badge with no monetary value. Campaign rules,
start/end time, eligibility, claim state and audit history must be server-owned.

## Support, trust and responsible play

BitPlay exposes FAQ, support, chat, responsible gaming, privacy and terms. The
public responsible-gaming surface signals an age restriction and provides
educational content; private enforcement was not verified.

Local strengths:

- explicit virtual-only and no-cash-value language;
- consent-gated, allowlisted first-party analytics without session replay;
- local 15/30/60-minute reminders;
- browser-side commitment verification;
- FAQ-style Help Center.

Local gaps:

- no verified support contact, searchable knowledge base or ticket lifecycle;
- no API-enforced time/spend limits, cooling-off or self-exclusion;
- no email verification/recovery;
- policy content still needs operator and jurisdiction review;
- no complete independent browser recreation of each versioned payout table.

## Mobile behavior

Observed BitPlay mobile behavior:

- a compact top bar keeps brand, Sign in, Sign up and menu visible;
- the first-visit promotional interstitial occupies nearly the full viewport;
- the same content order is retained in one column;
- desktop rail navigation collapses behind the menu;
- quick actions and platform Search become explicit full-width controls;
- platform cards reduce to a short initial set followed by Show more.

Local mobile parity should be judged by task completion, not visual copying:
header/account access, bottom navigation, search, category switching, game launch,
wallet visibility, reward claim, history and player exit must all work at 360 px
without horizontal scroll or hidden controls.

## Gap checklist

Status legend: `[x]` present, `[~]` partial, `[ ]` absent, `[-]` intentionally
excluded.

### P0: commercial-quality core

- [x] Direct catalog with 200 unique entries.
- [x] Search, categories, favorites and recent games.
- [x] Registration/login/profile and virtual balance.
- [x] Server-authoritative wallet rounds for 132 entries.
- [x] Idempotent settlement and round history.
- [~] Consistent commercial player shell around every title.
- [ ] Game-detail route with factual mechanics, controls, bet range and fairness
  disclosure.
- [ ] Explicit catalog labels separating wallet games from score-only arcade.
- [ ] Per-game automated acceptance suite covering load, first interaction,
  restart, resize, audio pause, insufficient balance and reconnect behavior.
- [ ] Versioned math specification and statistically tested payout model for each
  distinct wallet mechanic.
- [ ] Save/resume behavior for interrupted bonus sessions across all applicable
  games.

### P1: BitPlay-equivalent product depth, virtual-only

- [~] Persistent navigation and mobile task navigation.
- [ ] Original provider/studio directory with factual playable counts.
- [ ] Provider/studio detail pages and Related games.
- [ ] Campaign center with scheduled, server-owned virtual campaigns.
- [ ] Server-owned missions, streaks, XP/levels and claim states.
- [ ] Free virtual daily wheel with auditable server outcome.
- [x] Truthful, privacy-thresholded activity and leaderboard APIs.
- [~] Social panels across all brand layouts and meaningful empty states.
- [ ] Wallet ledger UI and virtual reward inventory.
- [ ] First-round onboarding checklist and progress persistence.

### P1: account, support and safety

- [ ] Email verification and password recovery.
- [ ] Change password, active sessions/devices and revoke-all.
- [ ] Account export and deletion workflow.
- [ ] Searchable help center and verified support ticket workflow.
- [ ] API-enforced play/time limits, cooling-off and self-exclusion.
- [~] Terms/privacy/responsible-play content pending operator legal review.

### P2: operations and measurement

- [x] Consent-gated acquisition-to-settlement analytics funnel.
- [ ] Campaign attribution and cohort/retention reporting.
- [ ] Real target-domain TLS, headers and cookie verification.
- [ ] Off-host backup and demonstrated restore drill.
- [ ] External uptime/error monitoring with alert delivery.
- [ ] Load, soak and chaos tests for wallet settlement and reconnects.
- [ ] Accessibility audit against WCAG 2.2 AA on lobby and each game family.

### Explicit non-targets

- [-] Deposits, cryptocurrency purchase and payment methods.
- [-] Withdrawals, prize redemption or cash-value balances.
- [-] Donor platform credential provisioning.
- [-] BitPlay names, copy, artwork, testimonials and game binaries.
- [-] Fabricated winners, counters, reviews or social activity.

## Recommended implementation order

1. Standardize the player shell and add game-detail/provider routes.
2. Label catalog economics accurately and create a per-game acceptance matrix.
3. Upgrade distinct game mechanics with versioned math specs, server state,
   reconnect and statistical simulation tests.
4. Add the virtual campaign/reward engine and surface the already implemented
   truthful social APIs.
5. Complete account recovery, support and server-enforced safety controls.
6. Run desktop/mobile browser QA, accessibility, load and production-host checks
   before claiming production readiness.

Functional parity should mean equivalent discovery, conversion clarity,
retention depth, account confidence and mobile task completion. It should not
mean copying BitPlay's protected presentation or adding real-money mechanics.
