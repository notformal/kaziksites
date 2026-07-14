# Social activity and virtual leaderboard

The lobby social panels are derived exclusively from `game_rounds` rows with `status='settled'`. They never use seed data, analytics events, estimates, or fabricated counters. Credits are virtual entertainment counters with no cash value or rewards.

## Privacy

- Public activity and leaderboards remain unavailable until at least three distinct players qualify in the period.
- Game-level activity is independently suppressed unless that game has at least three distinct players.
- Leaderboard entries use a server-secret-derived pseudonym (`Player • XXXX`). Email, display name and user ID are never returned.
- The API returns explicit empty states when the privacy threshold is not reached.

## API

- `GET /api/social/activity` — privacy-thresholded aggregate for the last 24 hours.
- `GET /api/social/leaderboard?period=daily|weekly|all-time` — up to ten anonymous entries ranked by virtual credits won, then settled rounds.

Both routes have a dedicated limit of 60 requests per IP per minute in addition to the API-wide limiter. `SESSION_SECRET` is used as the production pseudonym salt; changing it rotates public aliases. No cash rewards, redemption, deposits, purchases, or withdrawals are attached to ranking.
