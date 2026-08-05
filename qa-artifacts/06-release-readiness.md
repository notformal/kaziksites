# Release Readiness

**Scope:** the audited feature (Account Lifecycle + Responsible Play) and the brand
showcase sites + delivery pipeline (round 2, see `07-production-hardening.md`). Broader
platform launch gates remain as documented in `platform/docs/PLATFORM_READINESS_REPORT.md`.

## Round-2 gates (showcase sites & delivery)

| Gate | Status |
|---|---|
| Per-brand SEO/social meta present & unique | ✅ enforced by `verify:dist` |
| PWA/crawler assets valid (manifest JSON, 1200×630 OG PNG, robots, sitemap) | ✅ enforced by `verify:dist` |
| No render-blocking font `@import` | ✅ enforced by `verify:dist` |
| Cache/security headers (immutable assets, revalidate HTML, HSTS, X-Frame-Options) | ✅ `_headers` + `netlify.toml` |
| CI on push/PR (lint, test, build, verify, audit) | ✅ `.github/workflows/ci.yml` |
| Dependency audit (prod + dev) | ✅ 0 vulnerabilities |
| Accessibility (Escape/focus modals, labels, skip link, reduced-motion) | ✅ code + build verified |
| Responsible-play enforcement on all play paths (bet + bonus-spin) | ✅ regression-tested |

## Quality gates

| Gate | Status | Note |
|---|---|---|
| Project inventory complete (audited surface) | ✅ | See `02-traceability-matrix.csv` (30 items, no NOT_TESTED) |
| All Blocker/Critical/High fixed & re-verified | ✅ | 5 Critical + 4 High → Fixed; 6/7 Medium/Low fixed |
| No unexplained failing/skipped tests | ✅ | 32/32 API, 3/3 root, 5/5 server, 6/6 lobby |
| Lint / build pass | ✅ | lint exit 0; lobby + root builds pass |
| Critical flows have automated tests | ✅ | 8 regression tests (enforcement, exclusion integrity, delete, password, devices) |
| Security: deps + secrets + access control | ✅ | 0 vulns; no committed secrets; all account routes `auth`-gated + ownership-scoped |
| Migrations reversible / safe | ⚠️ | `008` has no explicit `down`; forward-only, additive (consistent with 001–007) |
| Monitoring / health | ⚠️ | `/health` exists; app-level alerting still pending (platform-wide item) |
| UI click-through E2E of new flows | ⚠️ | **Residual** — see below |

## Residual verification (recommended before shipping the UI)

Run the new flows in a real browser against a same-origin deployment (nginx proxies `/api`, or set
`VITE_API_URL`). Suggested script:

1. Register → open **Account → Play responsibly**.
2. Set **Self-exclusion = 1 week** → Save. Reopen: the exclusion banner shows and the value persists.
3. Save a **Daily loss limit** without touching exclusion → confirm the exclusion **still shows** (DEF-002).
4. Launch any game and attempt a bet → expect the wager to be **refused** (server 403) and the restriction
   banner visible (DEF-001).
5. **Account → Settings → Danger Zone** → confirm a **password field** is required and deletion signs you
   out (DEF-005, DEF-008).
6. **Settings → Devices** → a second login appears as a device; **Revoke all others** leaves only "current".

A fast in-process approximation is already automated in `platform/apps/api/test/accountLifecycle.test.js`
and via `qa-artifacts/evidence/repro.mjs` (pg-mem).

## Rollback

Changes are limited to the feature files listed in `05-change-log.md`. Rollback = revert those files;
migration `008` is additive (new tables only) and safe to leave in place, or drop the five new tables.

## Go / No-Go

- **Feature (API):** GO — enforcement and data-integrity defects fixed and test-covered.
- **Feature (UI):** GO WITH CONDITIONS — complete the click-through above on staging.
- **Platform-wide production launch:** unchanged — NO-GO until the P0 items in the platform readiness
  report (pen-test, load/concurrency test, monitoring/alerting) are closed.
