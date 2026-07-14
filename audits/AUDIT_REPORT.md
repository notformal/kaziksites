# Upstream casino-game audit

Audited 2026-07-13. A public repository is not permission to redistribute. “No license” means all rights remain reserved; those sources are excluded from product code.

| # | Repository | Evidence / commit | License | Stack / server | Out-of-box assessment | Decision |
|---|---|---|---|---|---|---|
| 1 | Igamingdev1/Casinogames-script | Git clone returns `Repository not found` | Unavailable | Unknown | Cannot retrieve or verify | Reject |
| 2 | MortalSoft/CASINO-SITE | `b3fccfd…`; no LICENSE | No license | PHP/Composer; external slot API | Template is present but legal redistribution and provider rights are absent | Reject |
| 3 | LucasHazardous/OpenSourceCasino | `9fbe376…`; root LICENSE | GPL-3.0 | Vue 3/Vite, client-side games | Buildable SPA, but copyleft is incompatible with the requested permissive integration policy | Reject unless entire derivative is GPL-compatible |
| 4 | zeusbyte/goldsvet | GitHub README says repository is only preview and full source is distributed via Telegram | No visible license | Claimed Laravel/PHP/MySQL/Redis/Node | Incomplete preview; installer/supply-chain and third-party game-rights risk | Reject |
| 5 | johakr/html5-slot-machine | `347fc31…`; LICENSE retained | MIT | Vanilla JS/Web Animations, Webpack; no server | Clear build scripts and small adaptation surface | **Accept: slots-classic** |
| 6 | TopSoftdeveloper/Casino-Slot-Machine-Games | `2de322a…`; README: “advertisement materials”, “No source code included” | No license | Images/marketing only | Not an installable game | Reject |
| 7 | michaelkolesidis/cherry-charm | `da6027a…`; package + LICENSE | AGPL-3.0-or-later | React 19, Three.js, Vite; no server | Modern build, but README explicitly requires the entire derivative source under AGPL | Reject for this monorepo; usable only with AGPL compliance |
| 8 | clintbellanger/Karma-Slots | `995dcf2…`; README license notice | MIT code; CC-BY-3.0 art/audio | Static Canvas JS; no server | Opens statically; attribution required | **Accept: second classic slot candidate** |
| 9 | marksantiago290/Aviator_Crash | `bee5875…`; no LICENSE | No license | React 18, PixiJS, Socket.IO client; expects backend | Cannot legally redistribute; backend contract is missing from repo | Reject / request author permission |
| 10 | Casino-Crash-Game/aviator-crash | `2f0918b…`; no LICENSE | No license | CRA/React, Unity WebGL, Socket.IO/ethers | Heavy client with missing rights and unclear server/game assets | Reject |
| 11 | cryptolandorg/Casino-Crash-Telegram-App | `e0130e2…`; no LICENSE | No license | TypeScript WS server, Prisma/Postgres, Redis, Telegram auth | Server-authoritative architecture exists, but cannot be copied without permission | Reject; implement clean-room crash logic |
| 12 | AnsonH/plinko-game | `3c9b61a…`; no LICENSE file/package license | No license | Svelte 5, Matter.js, static adapter, Vitest/Playwright | Quality project, but README describes client-side nondeterministic outcomes and no redistribution grant | Reject / request explicit license |
| 13 | kayooliveira/plinko-game | `b06f887…`; no LICENSE | No license | React/Vite, Matter.js, Firebase, Zustand | Build scripts exist; rights absent and client-side balance/outcome unsuitable | Reject |
| 14 | milsaware/javascript-roulette | `fb91751…`; root LICENSE | GPL-3.0 | Static JS/CSS; no server | Opens directly; copyleft incompatible with permissive-only integration policy | Reject or isolate under GPL-compliant distribution |
| 15 | kewlinnn/keno-plus | GitHub source inspected; clone remained incomplete; no LICENSE shown | No license | Vue 3/TypeScript/Pinia/Element Plus | Documented build, but redistribution permission absent and outcome is client-generated | Reject / request author license |

## Replacements and clean-room plan

- Slots: use `johakr/html5-slot-machine` (MIT) and optionally Karma Slots with visible CC-BY attribution.
- Crash, Plinko and Keno: implement original clean-room renderers against the platform’s server-authoritative round API; do not copy unlicensed source/assets.
- Roulette: either obtain permission from the listed GPL author and comply with GPL, or implement an original renderer using standard European roulette rules and original assets.
- A generic MIT fortune-wheel component is not a drop-in casino roulette implementation; it may be used only as a rendering primitive while the outcome remains server-authoritative.

## Security notes

No installer, Telegram-distributed archive or unknown provider bundle was executed. No upstream `.env`, keys, databases or binaries are trusted. Accepted code must be vendored at a pinned commit, retain LICENSE/attribution, pass dependency review and run inside a sandboxed iframe with an exact-origin `postMessage` protocol.
