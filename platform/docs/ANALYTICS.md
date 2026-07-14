# First-party analytics

Analytics is consent-gated and sent only to this platform's API. The browser batches up to 25 events, retries transient failures, and uses `sendBeacon` when the page is hidden. No email, display name, IP address, search text, or authentication token is stored. Anonymous session identifiers are SHA-256 hashed before storage; authenticated events may be associated with the internal numeric user ID.

Allowed events are `page`, `brand`, `search`, `filter`, `game_open`, `game_ready`, `bet`, `settle`, `auth`, `daily`, and `favorite`. Each event has a small property allowlist. The ingestion endpoint rejects unknown properties, invalid game/session identifiers, timestamps outside seven days, batches above 25, bodies above 16 KiB, and excessive requests.

Set a random `ANALYTICS_ADMIN_KEY` of at least 32 characters. Aggregated reports do not return individual sessions or PII:

```bash
curl -H "Authorization: Bearer $ANALYTICS_ADMIN_KEY" "http://localhost:8787/api/admin/analytics/summary?hours=24"
curl -H "Authorization: Bearer $ANALYTICS_ADMIN_KEY" "http://localhost:8787/api/admin/analytics/funnel?hours=168"
```

Retention should be enforced by the operator, for example deleting rows older than 90 days in a scheduled PostgreSQL job. Rotate the admin key like any other production secret.
