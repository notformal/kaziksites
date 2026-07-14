# Commercial game readiness gap

Scope: virtual-credit entertainment only. This review does not certify gambling, RNG, RTP, jurisdictional, accessibility, or responsible-gaming compliance.

## Executive assessment

The platform has a sound server-authoritative wallet foundation: atomic ledger mutations, idempotent round IDs, an allowlisted/versioned math registry, server-generated outcomes, commit/reveal proofs, persisted history, and server-owned bonus spins. It is materially stronger than a client-side demo, but it is not yet equivalent to a certified commercial game provider.

The highest operational gap was interrupted-round recovery. A bet could be accepted and debited, then an iframe refresh/network interruption would lose the client state. This change adds an authenticated round-status endpoint and SDK reconnect protocol. Open rounds expose only the seed commitment; the server seed remains secret until settlement.

## Capability matrix

| Area | Current state | Commercial gap / required work | Priority |
|---|---|---|---|
| Wallet authority | PostgreSQL ledger; debit/win in transactions; per-user advisory lock | Add ledger reconciliation jobs, accounting invariants/alerts and operator tooling | P0 |
| Idempotency | Round ID protects bet, settlement and bonus-spin retries | Add explicit request idempotency records/TTL and load/race tests across multiple API replicas | P0 |
| Round lifecycle | Formal `open → settled` state machine, atomic transition validation and database payload invariants; persisted outcome/proof | Add explicit cancelled/expired policies and deadlines without allowing refund abuse | P0 |
| Interrupted play | **Implemented in this slice:** private `GET /wallet/rounds/:roundId`, SDK `ROUND_STATUS_REQUEST/ROUND_STATUS` | Wire every game to persist its active round ID and resume/replay the correct animation | P0 |
| Provably fair | HMAC-SHA256 commitment/reveal with client seed and nonce | Seed rotation UI, external verifier vectors, canonical byte-to-number algorithm, bias analysis and independent audit | P0 |
| RNG/math | Server-generated, versioned math profiles | Statistical simulation per profile (billions of rounds), declared RTP/volatility/hit rate, max exposure, independent certification | P0 |
| Crash | Cashout is derived from server elapsed time | WebSocket clock sync, authoritative tick stream, latency policy, disconnect/auto-cashout rules, round scheduler shared by all players | P0 |
| Slots | Server produces grid, paylines, scatter bonus; free spins persisted | Reel strips/win ways per title, anticipation and line sequencing, wild/scatter edge cases, gamble/feature state machines | P1 |
| Roulette/Keno/Plinko | Outcomes and choices are server owned | Complete bet maps, limits, configurable paytables, animation mapping and statistical validation | P1 |
| Game UX | Functional controls and iframe SDK | Per-title paytable/help, sound controls, turbo, autoplay limits, keyboard/accessibility, win presentation, error/retry/offline states | P1 |
| History | 250 persisted rounds with proof fields | Cursor pagination, game-detail replay, downloadable verification data, localized display | P1 |
| Observability | Basic analytics and health | Correlation IDs, round latency/error metrics, audit logs, tracing, SLOs and alerts | P0 |
| Abuse/security | Auth, origin allowlist, rate limits, exact iframe origins | Bot/risk controls, device/session risk, CSP review, penetration testing, secret rotation and incident runbooks | P0 |

## Implemented vertical slice: safe round recovery

1. A game stores its active `roundId` locally after submitting a bet.
2. After reload it calls `GameSDK.recoverRound(roundId)`.
3. The host requests the authenticated API record and verifies that its `gameId` matches the iframe.
4. An open round returns bet metadata, nonce, math version and `serverSeedHash`, but never `serverSeed` or `clientSeed`.
5. A settled round returns outcome and the complete commitment/reveal proof, allowing the game to replay the result without paying twice.
6. Another account receives `404`, avoiding both data disclosure and round enumeration.

## Definition of commercial-level completion

Do not label a title commercial-ready until it has: documented math and limits; reproducible simulation reports; deterministic state-machine tests; retry/reconnect tests; concurrency/load tests; complete paytable/help; polished sound/animation/error states; accessibility checks; observability; security review; and, where legally relevant, independent lab certification and jurisdictional approval.

## Recommended next vertical slices

1. Wire recovery into slots, crash, roulette, keno and plinko, including persisted active round IDs and visual replay.
2. Replace crash request/response timing with an authoritative WebSocket round scheduler and explicit disconnect/auto-cashout rules.
3. Add canonical RNG sampling and per-profile Monte Carlo reports for RTP, volatility, hit frequency and maximum exposure.
4. Build a reusable finite-state game shell (`idle/betting/accepted/animating/settling/result/recovering/error`) with disabled duplicate actions.
5. Add complete paytable, autoplay/turbo limits, responsible play reminders, sound controls and localized error recovery to every production title.
