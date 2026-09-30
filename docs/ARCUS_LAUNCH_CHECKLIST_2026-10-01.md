# ARCUS Open — launch checklist

Target publication: 1 October 2026

Release: `arcus-open-2026.10`

Canonical address: `https://www.arcusbridges.org`

## Release rule

From 24 September onward, ARCUS Open is under feature freeze. Only release
blockers, factual corrections, accessibility fixes and deployment corrections
may enter the launch branch.

## Completed locally — updated 30 September

- [x] Public data package: 261 events and 718 sources.
- [x] Shared-event registry: 14 documented episodes covering 108 event
  records, with operational definitions separated from the public taxonomy.
- [x] Coordinate-dependent rainfall, hydraulic and historical hazard context
  regenerated or checked against the final release coordinates.
- [x] Canonical `ITxx.xx.xx` identifiers across UI and downloads.
- [x] Open/Professional boundary and unavailable private routes.
- [x] Compile-time Open/Professional separation and automatic public-bundle
  inspection for reserved routes, implementation signatures and source maps.
- [x] Production Open build.
- [x] Desktop and mobile public-page acceptance.
- [x] Atlas desktop, tablet and mobile acceptance.
- [x] Analytics workflow, downloads and reproducibility checks.
- [x] Privacy route and controller identity implemented.
- [x] Bilingual Rights & Reuse page plus separate code, data and identity
  notices implemented.
- [x] Sitemap, robots, SPA fallback, security and cache headers.
- [x] Permanent 1200 × 630 social-sharing image and metadata.
- [x] Domain email channels implemented in the public interface.

## Hosting and domain — next gate

- [x] Connect the Git repository to Netlify for controlled repeatable deploys.
- [x] Build command: `npm run build:open`.
- [x] Publish directory: `dist`.
- [x] Deploy privately to `https://arcus-open-staging.netlify.app` before
  changing DNS.
- [x] Complete initial acceptance against the temporary HTTPS URL: Home,
  Atlas, direct event dossier, Analytics, Data Access, CSV download and private
  route boundary.
- [x] Connect `www.arcusbridges.org`.
- [x] Redirect `arcusbridges.org` automatically to the primary `www` address.
- [x] Confirm a valid HTTPS certificate on both host names.
- [x] Verify that `_headers` and `_redirects` are applied by the provider.

## Owner review

- [ ] Approve the final bilingual Privacy page.
- [ ] Approve the final bilingual Rights & Reuse page and licence wording.
- [ ] Approve `/arcus-social-card.png` as the permanent sharing preview.
- [ ] Confirm final wording on Home, Identity and Publications.
- [ ] Confirm that all four domain mailboxes still receive external messages.
- [ ] Confirm publication rights and attribution for every local event image.

## Scientific publication gate

- [ ] Confirm release citation, license and known limitations.
- [ ] Decide whether to publish the release deposit before launch or mark its
  persistent identifier as forthcoming.
- [ ] If deposited, record the persistent identifier without publishing the
  internal master workbook.
- [ ] Download and archive the exact public release package served at launch.

## External acceptance — 28–29 September

- [ ] One researcher can find, understand, cite and download an event record.
- [ ] One civil engineer can interpret scope and limitations without guidance.
- [ ] One independent mobile user can navigate Atlas and Analytics without
  horizontal overflow or hidden actions.
- [ ] Only confirmed launch blockers are corrected after this test.

## Final rehearsal — 30 September

- [x] Repeat every command in `ARCUS_OPEN_RELEASE_READINESS.md`.
- [ ] Verify canonical URLs, sitemap, social preview and 404 on production.
- [x] Create a Git release tag for the approved commit:
  `arcus-open-2026.10` at `873b8843a9d79f7e8e71a59aea1bce4306b5e19b`.
- [x] Record the last known-good commit and provider rollback procedure:
  restore the tagged deploy from Netlify Deploys if the public activation fails.
- [ ] Prepare screenshots and links using the real HTTPS domain, not localhost.
- [ ] Confirm launch copy and first comment links.

## Launch — 1 October

- [ ] Verify Home, Atlas, one event record, Analytics and one download.
- [ ] Verify the site from a mobile network.
- [ ] Publish the launch communication only after the live checks pass.
- [ ] Monitor errors, broken links, email and user reports during the first day.
