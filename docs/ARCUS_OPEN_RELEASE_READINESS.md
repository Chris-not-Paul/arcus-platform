# ARCUS Open — release readiness

Status: release candidate under final acceptance

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
Professional routes. Professional remains available in local/platform builds
and is not represented as an active public service in the initial Open release.

## Data boundary

The deployable build contains the immutable public release
`arcus-open-2026.3`: 261 events and 716 documentary sources. It does not include
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

1. Aruba must complete inbound provisioning for the domain mailboxes.
2. The site owner must approve the final privacy notice and the public identity
   of the data controller; personal details must not be inferred from account
   screens or inserted automatically.
3. A public social-sharing image should be approved before launch.
4. Deploy the Open build to a temporary hosting URL and complete desktop/mobile
   acceptance before changing DNS.
5. After acceptance, connect `www.arcusbridges.org`, enable HTTPS and configure
   the root-domain redirect.

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
