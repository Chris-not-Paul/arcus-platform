# ARCUS Backend

This backend is the first data boundary for ARCUS.

## Endpoints

- `GET /api/health`
- `POST /api/auth/register`
- `POST /api/auth/password`
- `POST /api/auth/password/request-reset`
- `POST /api/auth/password/reset`
- `GET /api/auth/sessions`
- `POST /api/auth/sessions/revoke-other`
- `POST /api/access-requests`
- `GET /api/open/events`
- `GET /api/open/sources`
- `GET /api/professional/:resource`
- `POST /api/professional/exports`
- `GET /api/professional/exports/recent`
- `GET /api/professional/data-release`
- `POST /api/professional/hazard-exposure/point`
- `GET /api/professional/usage`
- `POST /api/professional/report-jobs`
- `GET /api/professional/report-jobs/recent`
- `GET /api/professional/report-jobs/:id`
- `POST /api/professional/report-jobs/:id/complete`
- `GET /api/admin/users` (admin only)
- `GET /api/admin/api-keys` (admin only)
- `POST /api/admin/api-keys` (admin only)
- `POST /api/admin/api-keys/:id/revoke` (admin only)
- `POST /api/admin/users/:username/disable` (admin only)
- `POST /api/admin/users/:username/password` (admin only)
- `POST /api/admin/users/:username/sessions` (admin only)
- `GET /api/admin/access-requests` (admin only)
- `POST /api/admin/access-requests/:id/status` (admin only)
- `GET /api/admin/audit-events` (admin only)
- `GET /api/admin/ops/status` (admin only)
- `GET /api/admin/email-outbox` (admin only)

Open endpoints return the public Data in Brief release only and keep the configured public cutoff. Professional endpoints require an authenticated ARCUS session cookie and expose the curated Professional scope, including `professional-events` and `professional-sources` resources when available.

`POST /api/auth/register` creates a free ARCUS Open account. Free users can keep an authenticated identity for Open-layer product features, but they receive no Professional permissions and cannot access Professional resources, exports or reports.

`POST /api/access-requests` records a Professional access request from an Open or unauthenticated user. Requests are stored server-side, listed in the Admin panel and can be marked `new`, `reviewed`, `approved` or `rejected` without automatically exposing Professional data.

## Local Development

```bash
npm run api
npm run dev
```

The frontend dev server proxies `/api` to `http://127.0.0.1:4174`.

## Production persistence

Set `ARCUS_DATABASE_URL` to use PostgreSQL. On startup, ARCUS applies the SQL migrations in `server/migrations/`; run `npm run migrate` explicitly in CI or during deployment. Without a database URL ARCUS uses its private file store, which is intended only for local development.

The initial PostgreSQL schema covers organizations, users, sessions, workspaces, report jobs, audit events, data releases and API keys. The API accepts both the current `/api/...` paths and versioned `/api/v1/...` paths. The machine-readable contract is available at `/api/openapi.json`.

Local PostgreSQL validation:

```bash
docker compose -f docker-compose.postgres.yml up -d
$env:ARCUS_DATABASE_URL="postgresql://arcus:change-me@127.0.0.1:5432/arcus"
npm run migrate
npm run test:backend:postgres
```

`npm run test:backend:postgres` skips when `ARCUS_DATABASE_URL` is not configured. When a database URL is available, it runs migrations, starts the API against PostgreSQL, exercises registration, access promotion, password reset, API keys, exports, export history and audit, then removes the test organization and users it created.

## Backup, restore and retention

ARCUS includes an application-level backup path for both local file storage and PostgreSQL storage:

```bash
npm run backup -- --label=manual-before-release
npm run restore:backup -- --backup=backups/arcus-file-... --verify-only
npm run restore:backup -- --backup=backups/arcus-file-... --confirm-restore
npm run test:backup
```

Backups are written to `ARCUS_BACKUP_DIR` or `backups/` by default. The backup folder is ignored by git because it can contain user records, API key hashes, audit events, export history, outbox metadata and restricted Professional data. Keep production backups outside the repository, on encrypted storage, with access limited to operators.

Each backup receives an `arcus-backup-manifest.json` with storage type, creation time and SHA-256 checksums for every file/table snapshot. `restore:backup --verify-only` validates the manifest without changing data. A restore requires `--confirm-restore`; file-storage restore replaces `ARCUS_PRIVATE_DATA_DIR`, while PostgreSQL restore replaces the known ARCUS application tables inside a transaction.

Retention is applied after backup creation using `ARCUS_BACKUP_RETENTION_DAYS` and `ARCUS_BACKUP_RETENTION_COUNT`. Defaults keep 30 days and at most 20 backups. `ARCUS_BACKUP_FRESHNESS_MAX_AGE_HOURS` controls when operations status reports the latest backup as stale. Managed production deployments should still add infrastructure-level encrypted snapshots and off-site retention; the ARCUS command gives a portable application-level recovery package.

## Monitoring and operations

`GET /api/admin/ops/status` returns an authenticated operational snapshot with storage health, backup freshness, active data release state, request counters and warning/critical checks. `GET /api/admin/metrics` exposes Prometheus-compatible counters plus operational gauges:

- `arcus_operational_status`
- `arcus_backup_fresh`
- `arcus_backup_age_seconds`
- `arcus_email_recent_failures`

Use `/api/health` for lightweight public service checks, `/api/health/ready` for storage readiness and `/api/admin/ops/status` for operator-facing diagnostics.

When HTTPS is terminated in front of the API, set `ARCUS_COOKIE_SECURE=true` and constrain `ARCUS_ALLOWED_ORIGINS` to the deployed application origin(s).

Every API response includes `X-Request-ID`. Clients may also submit an `X-Request-ID` header; ARCUS will reuse it when it matches the safe request-id format. Error responses keep the frontend-compatible `error` string and add `requestId` plus `statusCode`, so a client-side failure can be matched to server logs.

Enable `ARCUS_ACCESS_LOGS=true` to emit compact JSON access logs containing request id, method, path, status and duration. Admin metrics expose Prometheus-style request counters and duration sums with normalized paths to avoid leaking usernames or workspace ids into metric labels.

At startup ARCUS validates critical runtime configuration. In production (`NODE_ENV=production`), the default Professional password is rejected, `ARCUS_DATABASE_URL` is required, invalid numeric limits fail fast, and insecure cookie/CORS settings are reported as warnings. API responses include conservative security headers, and HSTS is emitted when `ARCUS_COOKIE_SECURE=true`.

On first run, the backend creates `private-data/auth/users.json` with a Professional user from `ARCUS_PROFESSIONAL_USERNAME` and `ARCUS_PROFESSIONAL_PASSWORD`. The password is stored as a PBKDF2 hash with a random salt, never as plain text. Local fallback credentials are `arcus` / `professional`.

Create or rotate users with:

```bash
npm run create-user -- --username=arcus --password=change-me --role=professional
```

Sessions are stored in `private-data/auth/sessions.json` and delivered through an HttpOnly `ARCUS_SESSION` cookie. The session endpoint also returns a CSRF token used for state-changing authenticated requests such as logout.

Authenticated users can change their own password with `POST /api/auth/password` by submitting the current password and the new password. The operation revokes active sessions and requires a fresh login. Users can also list their active sessions and revoke other open sessions while keeping the current session alive.

Unauthenticated users can request a password reset with `POST /api/auth/password/request-reset`. ARCUS returns a generic accepted response to avoid account enumeration, creates a single-use reset token when the account exists, stores only the token hash, writes a transactional email to the configured outbox/provider and audits the request. `POST /api/auth/password/reset` consumes the token, changes the password and revokes active sessions. Administrators can reset a user's password with `POST /api/admin/users/:username/password`; this also revokes all active sessions for that user and writes an audit event.

## Professional outputs

Professional CSV and GeoJSON outputs are generated by the server from an explicit scope, rather than from a full dataset shipped to the browser. The available outputs are a territory brief, an evidence register and a GIS summary. Each request is capped at 25 events (and 100 source records), includes a scope notice, receives `X-ARCUS-Export-ID` and `X-ARCUS-Data-Release` response headers, embeds the same traceability metadata in the output and is written to both the audit log and the Professional export history. These are controlled technical outputs, not database downloads.

`GET /api/professional/data-release` returns the active Professional release metadata used for output traceability. `GET /api/professional/exports/recent` returns the authenticated user's recent export records; administrators can see organization-level records.

`POST /api/professional/hazard-exposure/point` evaluates official point-level hazard exposure in shadow mode. The hydraulic provider queries ISPRA WFS layers `nz1:aree_peric_idraulica_p1`, `nz1:aree_peric_idraulica_p2` and `nz1:aree_peric_idraulica_p3`; the landslide provider queries the official IdroGEO PAI layer `idrogeo:pericolosita_frane` and reads `cod_per_it` classes `AA`, `P1`, `P2`, `P3`, `P4`. Both providers run from the backend, keep WMS strictly visual and return source status separately from current ARCUS historical proxy scores. `normalized_score` is intentionally `null` until a documented scoring calibration is approved.

PDF generation remains available in the browser so the existing visual report workflow is preserved. Each PDF generation creates a server-side report job, receives an ARCUS report reference in the footer, and is marked completed after the client save step. This provides status tracking and an audit trail without exposing additional data.

## Roles and access operations

`free` can authenticate for Open-layer product features only. `professional` can read Professional resources and generate controlled reports/exports. `admin` has the same rights plus access management. Create an administrator with:

```bash
npm run create-user -- --username=arcus-admin --password=change-me --role=admin
```

An authenticated administrator can list users, disable or re-enable an account, reset a user's password, revoke all active sessions for a user, review Professional access requests, inspect recent audit events and inspect the local transactional email outbox through the admin endpoints above. Disabling a user automatically revokes that user's sessions.

Administrators can create organization API keys for machine-to-machine integrations. API keys are returned in clear text only once, stored as SHA-256 hashes, scoped to explicit Professional permissions and revocable. They can authenticate Professional read/export/report endpoints through `Authorization: Bearer <key>` or `X-ARCUS-API-Key`, but they cannot access admin operations or browser account actions.

Login protection:

- Failed login attempts are rate-limited by username and client address.
- Defaults: 5 attempts within 5 minutes, then 15 minutes lock.
- Audit events are appended to `private-data/auth/audit.log`.

Transactional email defaults to a local JSON outbox for development and testability. For staging/production, set `ARCUS_EMAIL_TRANSPORT=webhook` and configure `ARCUS_EMAIL_WEBHOOK_URL` plus `ARCUS_EMAIL_WEBHOOK_API_KEY`. ARCUS will POST transactional email payloads to the webhook adapter, record `sent` or `failed` status in the outbox, and surface recent failures in `/api/admin/ops/status` and `arcus_email_recent_failures`. Configure `ARCUS_EMAIL_FROM`, `ARCUS_APP_BASE_URL`, `ARCUS_EMAIL_WEBHOOK_TIMEOUT_MS` and `ARCUS_PASSWORD_RESET_TOKEN_TTL_MINUTES` before deployment, then wire the webhook adapter to a production email provider such as SES, Postmark or SendGrid.

This is a production-shaped local boundary. The next hardening step is billing/payment provider integration and final security/deployment hardening.

## Data Boundary

Raw data, processed events, sources and Professional resources now live under `private-data/`, which is ignored by git and is not served by Vite as a static asset.

Set `ARCUS_PRIVATE_DATA_DIR` to an absolute protected location when the application and its data are deployed separately.

For the complete production architecture and deployment checklist, see `docs/BACKEND_PLATFORM.md`.
