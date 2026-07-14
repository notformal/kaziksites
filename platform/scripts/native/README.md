# Native Windows runtime (no Docker)

This runtime launches four supervised processes: persistent embedded PostgreSQL,
the Express API, the lobby static origin, and a separate game static origin.
PostgreSQL binds to loopback only. Runtime data, PID files, and logs live in
`.runtime/` and are excluded from git.

1. Copy `.env.native.example` to `.env.native` and replace both `CHANGE_ME`
   secrets. Do not commit this file.
2. Run `npm run native:start`. The first start builds all bundles and can take
   longer while the native PostgreSQL package is prepared.
3. Run `npm run native:status` to inspect process and database health.
4. Run `npm run native:stop` for a graceful database shutdown. Data is retained.

The default endpoints are lobby `http://127.0.0.1:8080`, games `:8081`, API
`:8787`, and PostgreSQL `:55432`. Change all ports in `.env.native` if occupied.
Logs are written to `.runtime/logs/`.

## Operations

`npm run native:status` checks both the API/database health endpoint and the
supervisor readiness endpoint. The supervisor restarts a crashed API or static
server with exponential backoff (0.5–30 seconds). Logs rotate at 10 MiB by
default and retain five archives; tune `LOG_MAX_BYTES` and
`LOG_RETENTION_FILES` in `.env.native`.

Create a verified, gzip-compressed application-level PostgreSQL logical backup
with `npm run native:backup`. This version-neutral format is used because the
embedded PostgreSQL 18 distribution intentionally omits `pg_dump`.
Backups and SHA-256 sidecars are restricted to `.runtime/backups/`. Run
`npm run native:backup:drill` regularly: it restores into a newly-created,
isolated database, verifies the schema, and removes only that drill database.
It never replaces the live database. A deliberate live restore requires an
explicit confirmation switch:

```powershell
.\scripts\native\restore.ps1 -BackupFile .\.runtime\backups\arcade-....json.gz -ConfirmRestore
```

Keep encrypted off-host copies of backups and test a restore after every schema
change. The isolated drill requires PostgreSQL client tools (`createdb`,
`dropdb`, and `psql`); backup and restore themselves use the platform's pinned
Node PostgreSQL driver and migrations.

Windows startup scripts are dry-run by default and were intentionally not
installed by the build process. Review their output, then explicitly use
`install-autostart.ps1 -Apply` or `uninstall-autostart.ps1 -Apply`. The task runs
under the current user at logon; protect `.env.native` with an appropriate NTFS
ACL before enabling it.

The lobby origin uses a strict script CSP. The isolated games origin permits
inline scripts and dynamic evaluation because the imported LittleJS games use
both; it remains isolated from the authenticated lobby origin.

For a public reverse proxy, set `PUBLIC_API_URL`, `PUBLIC_GAME_ORIGIN`, and the
exact comma-separated `ALLOWED_ORIGINS` before building. Set `TRUST_PROXY=true`
only when the API is reachable exclusively through the trusted local proxy;
this makes HTTPS session cookies carry the `Secure` attribute. TLS and DNS are
terminated outside this loopback-only runtime.
