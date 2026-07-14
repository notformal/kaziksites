# Arcade Showcase Trilogy

Three original, independently deployable social-arcade concepts built from one maintainable codebase.

## Run

```sh
npm install
npm run dev
```

Use `?brand=aurora`, `?brand=ember`, or `?brand=royale` during development. Production builds:

```sh
npm run build
```

Outputs are written to `dist/aurora`, `dist/ember`, and `dist/royale`. Each folder is a complete static site and can be uploaded directly to static hosting.

## Product boundaries

The included 240-item catalog is original demo metadata and the playable modal is a no-money interaction prototype. Before connecting third-party games, verify each game's license and host only assets you are entitled to distribute. Real-money wagering, payments, wallets, identity verification, and jurisdiction-specific compliance are intentionally out of scope.

## Analytics

Analytics is consent-gated. Set `VITE_ANALYTICS_ENDPOINT` to a first-party HTTPS collector accepting `sendBeacon` JSON. Without it, events remain in-browser as `arcade:analytics` custom events for demos and QA.
