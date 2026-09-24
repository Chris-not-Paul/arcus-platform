# ARCUS Open — release readiness

Status: private staging verified — owner review, repository connection and domain activation pending

Canonical domain: `https://www.arcusbridges.org`

Build command: `npm run build:open`

Output directory: `dist`

## Public release surface

- Home
- Atlas
- Open Analytics
- Methodology
- Data access and complete Open release package
- Publications
- Evidence contribution channel
- Identity and institutional contacts

The Open build disables accounts, the server-backed contribution form and all
Professional routes. Professional remains available in local/platform builds.
The public navigation identifies it only as a non-interactive
`Coming soon / Prossimamente` workstream: no access, registration flow or
feature promise is exposed.

The domain mailboxes have passed inbound and outbound delivery checks and are
considered operational for the release candidate.

## Data boundary

The deployable build contains the immutable public release
`arcus-open-2026.6`: 261 events and 716 documentary sources. It does not include
`private-data`, authentication stores, editorial submissions, expert feedback,
client workspaces or operational backups.

When the API is unavailable, Atlas, Analytics, Home and Data Access read the
same static Open release. Loading or failure states must never be represented as
zero events or zero sources.

## Hosting controls

- SPA fallback is declared in `public/_redirects`.
- Portable security and caching headers are declared in `public/_headers`.
- `robots.txt` exposes the sitemap and excludes private route names.
- `sitemap.xml` lists only the public release surface.
- Per-page canonical and social metadata use `www.arcusbridges.org`.

## Remaining launch gates

1. The bilingual privacy notice is implemented at `/privacy`, with Christian
   Paolini as the user-approved data-controller identity. The site owner must
   complete a final content review before publication.
2. The permanent public social-sharing image is implemented and approved at
   `/arcus-social-card.png`.
3. The Open build is deployed privately at
   `https://arcus-open-staging.netlify.app` and has passed initial online
   acceptance. Connect the repository before production activation.
4. After final acceptance, make the Netlify project public, connect
   `www.arcusbridges.org`, enable HTTPS and configure the root-domain redirect.

## Release checks

Run:

```text
npm run test:open-release
npm run test:open-production
npm run test:atlas-ui
npm run test:analytics-ui
npm run lint
git diff --check
```

## Verification log

### 24 September 2026

- `test:open-release`: passed — 261 events, 716 sources, canonical identifiers,
  source integrity, translations, downloads and public/private boundary.
- `lint`: passed.
- `test:open-production`: passed — `arcus-open-2026.6` and deployable Open
  artifacts verified.
- `test:open-production-ui`: passed on desktop and mobile across the complete
  public surface.
- `test:atlas-ui`: passed on desktop, tablet, mobile and small mobile, including
  controlled API/fallback failures.
- `test:analytics-ui`: passed, including exports, reproducibility packages,
  denominators and advanced descriptive diagnostics.
- `test:product-scope`: passed.
- `git diff --check`: passed.

The remaining release gates are repository connection, final owner and external
acceptance, public visibility, DNS, HTTPS and the root-domain redirect. Aruba
DNS and mail records remain unchanged during private staging.
