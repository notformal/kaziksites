# Execution: Internationalization (i18n)

**Date:** 2026-07-26
**Scope:** A production-grade i18n layer for the lobby — a translation runtime, a locale catalog
with **7 fully-translated languages**, a header language switcher, and migration of the
high-visibility UI chrome to translated strings. This addresses the "i18n string extraction" P2
gap. Constraints unchanged (entertainment-only, virtual-credit); i18n is presentation-only.

---

## Runtime — `src/i18n.jsx`

- **`translate(locale, key, vars)`** — pure, unit-tested. Looks up `key` in the locale, falls back
  to English, then to the raw key; substitutes `{placeholder}` tokens (an unknown placeholder is
  left literal rather than throwing).
- **`detectLocale()`** — saved choice (`localStorage`) → browser `navigator.languages` (base-tag
  matched, e.g. `pt-BR` → `pt`) → default `en`. Storage/`navigator` access is guarded so it is
  SSR/test safe.
- **`I18nProvider` / `useI18n` / `useT`** — React context; switching locale is instant (re-render),
  persisted, and updates `document.documentElement.lang`.

## Catalog — `src/locales.js`

- `en` is the source of truth. **7 languages** shipped: **en, ru, uk, es, de, fr, pt** — each a
  complete, hand-translated block. `LOCALES` carries display metadata (native name + flag) for the
  switcher.
- ~30 keys covering the visible chrome: nav, header actions, trust badges, platform hub, the
  collection header/search, footer (incl. the compliance line), and the realtime components.
- **Adding a language** = one `LOCALES` entry + one `messages` block; the parity test fails loudly
  until every key is present, so a translation can never ship half-done.

## Switcher — `src/LanguageSwitcher.jsx` (+ css)

Header globe button showing the active code; dropdown lists every locale by native name + flag,
`role="listbox"` with `aria-selected`. Mounted first in the header actions.

## Migration

`main.jsx` wrapped in `<I18nProvider>`; `App` uses `useT()`. Migrated strings: header + mobile nav,
trust badges (`{count}` interpolated), platform hub (title/subtitle/`{count}` titles), collection
header + search, footer tagline/help/age. The three realtime components — `LiveFeed`, `ChatPanel`,
`NotificationBell` — now translate their own labels via `useT()`.

## Tests — `src/i18n.test.js` (7)

- Every declared locale has a message block.
- **Every locale defines EXACTLY the English key set** — no missing, no extra.
- No blank values.
- **Every `{placeholder}` is preserved across all translations** (catches a translator dropping
  `{count}`/`{amount}`).
- `translate()` substitutes named vars, falls back (unknown locale → English → raw key), and leaves
  an unknown placeholder untouched.

## Verification (2026-07-26)

| Battery | Result |
|---|---|
| lobby (build + tests) | ✓ built · **13 pass** (+7 i18n) |
| Platform API / game-sdk | 111 / 11 pass |
| platform build (games + lobby + landing) | ✓ clean |
| root lint / vitest+server / build+`verify:dist` | ✓ clean / 8 pass / 3 brands verified |

## Follow-ups

- The catalog is structured to grow to the full ~22-language target — each new language is purely
  additive translation content; the runtime, switcher and parity guarantee already scale.
- Deeper coverage (account panel, responsible-play, help center bodies) can be migrated key-by-key
  against the same catalog with no runtime changes.
- Remaining roadmap: **push notifications** (service-worker + opt-in) and **OAuth** social login —
  both dependent on delivery infra / external provider credentials.
