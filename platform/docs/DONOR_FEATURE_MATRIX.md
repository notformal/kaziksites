# Donor feature matrix

Audit date: 2026-07-14. This is a functional comparison, not a claim of visual,
content, trademark, or asset equivalence. The platform is an independent
virtual-credit social arcade. Donor artwork, copy, names, binaries, and private
game assets were not copied.

## Scope and evidence

| Reference | What was observable | Audit limitation |
|---|---|---|
| `https://bitplay.ag/` | Public home page returned HTTP 200. It exposes account CTAs, platform search, deposit/withdrawal navigation, promotions, leaderboard, hot games, testimonials, FAQ/support/responsible-gaming links, and mobile-app promotion. | Payment, withdrawal, account, and third-party platform flows were not exercised. Their presence on the public page is not proof that they work. |
| `https://playgames2026.netlify.app/` | Public page returned HTTP 200 and identifies itself as PlayGames2026. It exposes sign-in/up CTAs, live-game cards, platform/deposit cards, platform counts, promotions, leaderboard, how-it-works, hot games, testimonials, and policy/support links. | This audit treats displayed counters, winners, testimonials, payments, and promotions as presentation only; no backend behavior was verified. |
| `https://start.firekirin.xyz:8580/index.html` | Public page returned HTTP 200. It is a fixed-width mobile launch/download page with Android download, two iOS routes, and a web “Play now” route. The web route redirects to the separate H5 player client. | The supplied player account was not reproduced in this report and no private content was extracted. The start URL itself is not a catalog or marketing lobby, so it is not a like-for-like feature donor. |
| Current platform | Evidence is the source tree and executable checks: `apps/lobby/src`, `apps/api/src`, `games`, `packages/game-sdk`, catalog tests, API tests, brand verifier, and native verifier. | “Implemented” means present in this workspace. Public-domain operation still depends on deployment-specific DNS, TLS, secrets, backups, and monitoring. |

## Product and lobby comparison

Legend: **Yes** = implemented; **Partial** = useful subset exists; **N/A** = intentionally excluded by the virtual-only product boundary; **Gap** = applicable but absent.

| Capability / UX | BitPlay | PlayGames2026 | Fire Kirin start | Current platform | Evidence / honest gap |
|---|---:|---:|---:|---:|---|
| Responsive marketing landing | Yes | Yes | Mobile launcher only | Yes | Responsive breakpoints and mobile bottom navigation in `apps/lobby/src/styles.css` and `mobile-nav.css`. |
| Distinct deployable brands | One observed brand | One observed brand | One observed brand | Yes | Aurora, Ember, and Royale themes plus `npm run build:brands` and `npm run verify:brands`. These are three branded builds over shared product code, not three unrelated codebases. |
| Game catalog | Hot games plus external platform catalogs | Hot/live games plus platform counts | No catalog on start page | Yes | Catalog test asserts exactly 200 unique playable entries. Of these, 132 use the wallet/game protocol; 68 are self-hosted arcade titles and do not participate in wagering. |
| Search | Platform search | Platform-oriented discovery | No | Yes | Title search in `apps/lobby/src/main.jsx`; analytics stores query length/result count, not search text. |
| Category filters | Platform groups | Platform/live/hot sections | No | Yes | All, Popular, Favorites, Recent and generated game categories. Empty state and incremental “Load more” are implemented. |
| Favorites | Not evident on audited public page | Not evident | No | Yes | Authenticated favorites API and heart controls. |
| Recently played | Not evident on audited public page | Not evident | No | Yes | Authenticated recent-game API and Recent filter. |
| Registration / login | Public CTAs | Public CTAs | Login occurs in separate H5 client | Yes | Cookie-based register/login/logout/profile flows; start balance is 5,000 virtual credits. No third-party identity or password-reset/email-verification flow. |
| Account profile and balance | Account-oriented site | Sign-in/up presentation | Separate player client | Yes | Account panel shows profile, virtual balance, favorites, recents and round history. |
| Daily reward | Fortune/reward promotions | Promotions | Not on start page | Yes | Once-per-day server ledger credit of 250 virtual credits. This is not a cash prize. |
| Round history | Not visible publicly | Not visible publicly | Separate client | Yes | Authenticated history endpoint and account UI. |
| Promotions / campaign center | Extensive | Several cards | No | Partial | Daily reward and three themed reward blocks exist. There is no campaign CMS, scheduled promotions, referral program, reward wheel, quest system, or real leaderboard. |
| Live wins / social proof | Yes | Yes | No | Gap | No fabricated live-win ticker or testimonials. A truthful aggregate activity feed could be built from settled virtual rounds, with privacy thresholds. |
| Leaderboard | Promoted | Visible daily/weekly/monthly table | No | Gap | No leaderboard API/UI. An opt-in, virtual-credit leaderboard is applicable; cash prizes and unverifiable placeholder winners are not. |
| How-it-works onboarding | Yes | Yes | Device-specific launch choices | Yes | Accessible three-step first-session walkthrough explains virtual-only credits, server rounds, verification, and session reminders. |
| FAQ / support center | Yes | Links displayed | No | Partial | In-product FAQ covers credits, fairness, bonuses, analytics, and account recovery limitations. Search, verified operator contact, tickets, and chat remain absent. |
| Responsible play / age notice | Yes, 21+ | Responsible-gaming link | No | Partial | Local legal page, 18+ notice, and configurable 15/30/60-minute local session reminders exist. Cooling-off, play limits, and self-exclusion are not claimed because API enforcement is absent. |
| Privacy / terms | Yes | Links displayed | No | Partial | Local legal page exists. It must be reviewed and localized for the actual operator/jurisdiction before public launch. |
| Native Android/iOS download | Android promoted | App link displayed | Android and two iOS paths | N/A / Gap | A native binary is not required for a web demo. If promised commercially, use a PWA/install flow or separately signed apps; never redistribute donor APK/IPA files. |
| Browser “Play now” path | Through platform flows | Live-game cards | Dedicated H5 redirect | Yes | Lobby opens self-hosted games in controlled frames/routes without sending users to donor infrastructure. |

## Wallet, game, data, and trust comparison

| Capability | Current platform status | Evidence / boundary |
|---|---:|---|
| Virtual-credit-only wallet | Yes | No deposit, withdrawal, cryptocurrency, cash value, or prize redemption endpoints exist. Currency is `CREDITS`. |
| Server-authoritative wagers | Yes for 132 titles | API owns bet debit, outcome and settlement; `roundId` provides idempotency. Do not describe the other 68 arcade titles as wallet games. |
| Provably-fair verification | Yes for server games | Round history exposes commitment, revealed seed, client seed, and nonce. Web Crypto verifies the commitment and deterministic HMAC digest; it does not independently audit every game payout table. |
| Crash cashout and table-game choices | Yes | Crash, roulette, keno and plinko carry player choices through the server outcome path. |
| Slot bonus lifecycle | Yes | Persisted free-spin/respin sessions and zero-bet bonus rounds are documented in `docs/SLOT_BONUSES.md`. The 127 studio titles are manifest-driven variants sharing an engine, not 127 independently engineered slot engines. |
| Iframe isolation / wallet bridge | Yes | Exact-origin `postMessage` protocol in `packages/game-sdk`; client requests actions and does not award itself arbitrary wins. |
| First-party product analytics | Yes | Consent-gated batching, schema allowlist, hashed anonymous session identifier, authenticated internal user association, aggregate summary/funnel. See `docs/ANALYTICS.md`. It is not a full BI dashboard or session replay system. |
| Public operational readiness | Partial | Native and Docker-oriented tooling exists, but a local pass is not proof of production hosting. DNS/TLS, production PostgreSQL lifecycle, off-host backup restore drill, external uptime monitoring, alert delivery, log retention, and domain-specific security headers must be proven on the target host. |

## Intentionally not replicated

The following donor features conflict with the explicit entertainment-only scope and
must not be added merely to improve visual parity:

- deposits, express deposits, payment-method selection, cryptocurrency purchase,
  deposit bonuses, or bonus codes tied to payment;
- withdrawals, cashouts to external accounts, redeemable prizes, or cash-value
  balances;
- referral, cashback, birthday, social-media, or leaderboard rewards that can be
  converted to money or goods;
- donor platform accounts, trademarks, testimonials, winner identities, game art,
  Android/iOS binaries, or proprietary game clients;
- claims such as “production ready,” “secure,” or “200 wallet games” without the
  deployment evidence and catalog qualification recorded above.

## Applicable gaps, ordered by value

These are safe improvements that preserve virtual-only operation:

1. **Support operations:** connect a verified operator support channel, password
   recovery, searchable help, and ticket/chat workflow.
2. **Responsible-play controls:** the local session reminder is complete; optional
   play limits, cooling-off, and self-exclusion still require API enforcement.
3. **Truthful social activity:** replace donor-style hard-coded “live wins” with an
   opt-in, privacy-thresholded feed derived from actual virtual-round settlements.
4. **Virtual leaderboard:** daily/weekly/all-time rankings with opt-in display names,
   anti-abuse rules, reset jobs, and virtual-only rewards.
5. **Account lifecycle:** password reset, email verification, change-password,
   session/device management, and account deletion/export.
6. **Fairness UX depth:** commitment and HMAC verification are now visible in
   round history; independently reimplement versioned outcome/payout mapping for
   a complete client-side payout audit.
7. **Production operations:** create environment-specific runbooks and prove TLS,
   restore-from-backup, process restart, monitoring/alerts and rollback on the actual
   host before calling a public deployment production-ready.

## Acceptance interpretation

“Correspondence to donors” should mean comparable discovery, account access,
responsive presentation, fast game launch, and clear rewards—not cloning donor
branding or adding real-money functions. The current platform already exceeds the
public donor pages in favorites, recent games, server wallet integrity, round
history, and consent-gated analytics. It remains behind the marketing sites in
campaign depth, leaderboard/social proof, onboarding/help, and operational proof on
a real domain. Those gaps should remain visible in release reporting until tested.
