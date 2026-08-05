# Production Hardening — Example Sites & Delivery (2026-07-22)

Second QA round, focused on making the three brand showcase sites and the delivery
pipeline production-ready. Covers DEF-018 through DEF-026.

## 1. Quality gate made real (DEF-019)

The strict senior ESLint config (added by the team) surfaced genuine defects, not just
style. All fixed so `npm run lint` passes at `--max-warnings=0`:

- `catch(e)` in `AccountPanel.submit` **shadowed the event parameter `e`** → renamed.
- An **empty `catch {}`** silently swallowed favorite-toggle failures → now logs a warning.
- `useMemo`/`useEffect` **missing dependencies** → `favIds`/`recentIds`/`matches`/`load`
  stabilised with `useMemo`/`useCallback`; `accountData` memoised.

## 2. SEO & social — every brand is now first-class (DEF-020, DEF-021)

Root cause: crawlers and social scrapers never execute the runtime `document.title`
swap, so all three brands shipped identical `<title>Arcade Showcase</title>` and a
placeholder description, with no Open Graph / Twitter / canonical / structured data.

Fix — a brand-aware Vite plugin (`scripts/site-assets.mjs` + `vite.config.js`), driven
by the single source of truth `src/themes.js`:

- Per-brand `<title>`, `<meta description>`, `theme-color`, canonical, Open Graph,
  Twitter Card and `WebSite` JSON-LD injected at build time.
- Generated assets emitted into every brand build: `robots.txt`, `sitemap.xml`
  (when `SITE_URL` is set), `site.webmanifest`, `icon.svg`, and a **valid 1200×630
  `og-image.png`** rendered with a dependency-free PNG encoder.
- `SITE_URL` is optional: set → absolute canonical/og:url/sitemap; unset → omitted
  rather than pointing at a placeholder domain.

Verified: `aurora`/`ember`/`royale` each carry a unique title, theme-color, canonical,
and a valid OG PNG.

## 3. Performance & privacy — fonts (DEF-022)

Google Fonts were loaded through a CSS `@import` (render-blocking
HTML→CSS→@import→font waterfall, and an IP leak to Google before consent). Moved to
`<link rel="preconnect">` + a non-blocking stylesheet `<link>` in `<head>`. The
`verify:dist` gate now **fails** if a CSS `@import url(...)` reappears.

## 4. Delivery hardening (DEF-023)

- `netlify.toml` documented for **all three** brands (per-site `command`/`publish`/
  `SITE_URL`) instead of building only Aurora.
- Cache tiers: content-hashed `/assets/*` → `immutable, max-age=31536000`; HTML →
  `max-age=0, must-revalidate` (deploys land immediately). Mirrored in `public/_headers`
  so non-Netlify hosts get identical behaviour.
- Added `Strict-Transport-Security` and `X-Frame-Options: DENY` to the header set.

## 5. CI (DEF-024)

`.github/workflows/ci.yml` — two jobs on push/PR:

- **Showcase**: `npm ci` (root + server) → lint → tests → build all 3 brands →
  `verify:dist` → production `npm audit` → upload brand builds.
- **Platform**: `npm ci` (workspaces) → full workspace test suite (api, lobby, sdk,
  slots-studio, crash, plinko, roulette, keno) → brand lobby build → production audit.

## 6. Supply chain (DEF-025)

`concurrently@10.0.3` pinned the vulnerable `shell-quote@1.8.4` (2 high-severity
advisories). Resolved with an npm `overrides` entry → `shell-quote@^1.10.0`.
`npm audit` is now **0 vulnerabilities including dev dependencies** (was 0 prod / 2 high dev).

## 7. Accessibility (DEF-026)

- `useDialog` hook: modals close on **Escape**, move focus into the dialog on open and
  **restore focus** to the trigger on close — applied to the game demo modal and the
  account panel.
- `aria-label`/`aria-pressed` on the previously unlabelled **mute** and **close** icon
  buttons in the game modal; `aria-label` on the game dialog.
- **Skip-to-games** link as the first focusable element.
- `@media (prefers-reduced-motion: reduce)` disables smooth scroll, card hover transforms
  and animations.
- `:focus-visible` outline on the search field.

## 8. Compliance completeness (DEF-018)

Bonus (free) spins are now blocked during cooling-off / self-exclusion via
`rpStatus(userId, { moneyLimits: false })` — daily money limits stay exempt because a
free spin places no wager. Regression test asserts `403 self_excluded` on bonus-spin
while a wager-limited (but not excluded) player is not blocked.

## Gate results (this round)

| Gate | Result |
|---|---|
| Root lint (strict senior config, `--max-warnings=0`) | **PASS** |
| Root unit / server unit | 3/3 · 5/5 |
| Platform API tests | **33/33** (+1 bonus-spin regression) |
| Platform full workspace suite | 54 tests pass |
| Build 3 brands + `verify:dist` (with & without SITE_URL) | **PASS** |
| `npm audit` (prod + dev, root/server/platform) | **0 vulnerabilities** |
| `npm ci` (lockfile integrity) | **PASS** |
