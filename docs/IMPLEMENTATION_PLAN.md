# Implementation and launch plan

## Delivered foundation

- Three independently buildable brands: Aurora Play, Ember Club, Royale House.
- 240-entry searchable/filterable catalog with deterministic original demo art.
- Interactive no-money game demo and responsive desktop/mobile layouts.
- Consent-gated analytics event adapter and first-party collector hook.
- Static hosting configuration with restrictive security headers.

## Production content integration

1. Approve game sources and record title, repository URL, license/SPDX ID, attribution, version/commit, thumbnail rights, and allowed hosting territories.
2. Vendor approved game builds under the site origin; do not iframe arbitrary HTTP sites or copy provider assets.
3. Add a catalog validation job that rejects missing licenses, duplicate IDs, insecure URLs, and unknown providers.
4. Add lazy loading and per-game performance budgets; test touch, keyboard, pause/resume, and audio behavior.

## Analytics funnel

Recommended events: page view, hero CTA, category select, search (never store raw sensitive text), game impression, game open, demo spin, join CTA, consent update. Use anonymous short-lived session IDs only after consent. Build funnel dashboards for landing → catalog interaction → game open → repeat visit; segment by brand, device class, category, and source campaign.

## Verification gates

- Build all three outputs with a lockfile.
- Desktop 1440×900 and mobile 390×844 browser smoke tests.
- Keyboard navigation, visible focus, dialog behavior, contrast, reduced-motion pass.
- Lighthouse performance/accessibility/SEO budgets.
- Dependency audit, secret scan, CSP/header runtime validation, and license inventory.
- Deploy each `dist/<brand>` folder to an isolated hosting project/domain.
