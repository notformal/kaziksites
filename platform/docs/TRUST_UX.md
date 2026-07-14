# Trust, help, and responsible-session UX

The lobby includes a concise first-visit walkthrough, an in-product help center,
a local session-duration reminder, and a browser-side round commitment verifier.
All three brand bundles share this behavior.

## Round verification

For a settled wallet round, Profile → Round history exposes the pre-round SHA-256
commitment, revealed server seed, client seed, and nonce. “Recalculate in browser”
uses Web Crypto to:

1. hash the revealed server seed and compare it to the stored commitment;
2. calculate `HMAC-SHA256(serverSeed, clientSeed:nonce:gameId)` and display its
   digest.

The API reveals `serverSeed` and `clientSeed` only after a round has settled.
The verifier proves commitment integrity and the deterministic random digest. It
does not independently reimplement every versioned game payout table in the
lobby, so it must not be described as a full payout auditor.

## Session reminder

The default reminder is 30 minutes. A visitor can select 15, 30, 60 minutes or
Off in Help. The preference is stored in `localStorage`; the current session
start is stored in `sessionStorage`. Continuing resets the timer. This is a
wellbeing prompt, not an operator-enforced limit, cooling-off period, or
self-exclusion mechanism.

## Honest remaining gaps

- password reset, verified support contact, and support-ticket workflow;
- API-enforced play limits, cooling-off, and self-exclusion;
- independent payout-table verification in the browser;
- jurisdiction/operator review and localization of legal/help content.
