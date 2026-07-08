# ARCUS Backend Platform

## Runtime modes

ARCUS supports two persistence modes through one service contract:

- Local development: private JSON files under `private-data/`.
- Production: PostgreSQL through `ARCUS_DATABASE_URL`.

PostgreSQL is the required production mode. It persists organizations, users, sessions, workspaces, report jobs, audit events, data release metadata and integration API keys. Migrations are applied automatically at startup and can be run explicitly with `npm run migrate`.

## Tenant and access model

Every user belongs to an organization. An organization has a plan, status and export limit. `professional` has read, controlled-export and report rights; `admin` adds access operations. A disabled user or inactive organization invalidates access even when an old session cookie exists.

Machine-to-machine integrations use organization API keys rather than browser cookies. API keys are hash-stored, scoped to explicit Professional permissions, returned in clear text only at creation time and revocable by administrators. They are intended for controlled Professional reads/exports/reports, not account governance.

Password and session lifecycle are handled by the API rather than by local file edits. Users can rotate their own password after CSRF validation, list active sessions and revoke other open sessions while keeping the current one alive. Administrators can reset a user's password from the access panel. Password rotation and administrative reset revoke sessions and are written to the audit trail.

## Data and output boundary

The public API exposes only the Data in Brief release. Professional exports are bounded server outputs with an explicit scope, a maximum number of events, an export id, active data-release metadata, methodology version metadata and audit logging. Export records are retained in a Professional export history so outputs can be traced back to their release context. The current browser PDF remains available for its visual quality, but each generation is registered server-side with a report reference.

## Operational endpoints

- `GET /api/health` and `GET /api/health/ready`
- `GET /api/openapi.json`
- `/api/v1/...` aliases for all current API routes
- `GET|POST /api/professional/workspaces`
- `GET|POST /api/professional/report-jobs`
- `GET /api/admin/users`
- `GET /api/admin/metrics`

## Production checklist

1. Provision PostgreSQL and set `ARCUS_DATABASE_URL`.
2. Run `npm run migrate` in deployment CI.
3. Store secrets outside the repository.
4. Set `ARCUS_COOKIE_SECURE=true` behind HTTPS.
5. Restrict `ARCUS_ALLOWED_ORIGINS` to the deployed frontend.
6. Back up PostgreSQL and test restore procedures.
7. Scrape `/api/admin/metrics` only from a protected monitoring network.

`docker-compose -f docker-compose.postgres.yml up -d` starts a local PostgreSQL 16 instance for integration testing. It is intentionally not a production deployment definition.
