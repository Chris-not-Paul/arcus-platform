# ARCUS Open — launch checklist

Target publication: 1 October 2026

Release: `arcus-open-2026.6`

Canonical address: `https://www.arcusbridges.org`

## Release rule

From 24 September onward, ARCUS Open is under feature freeze. Only release
blockers, factual corrections, accessibility fixes and deployment corrections
may enter the launch branch.

## Completed locally — 24 September

- [x] Public data package: 261 events and 716 sources.
- [x] Canonical `ITxx.xx.xx` identifiers across UI and downloads.
- [x] Open/Professional boundary and unavailable private routes.
- [x] Production Open build.
- [x] Desktop and mobile public-page acceptance.
- [x] Atlas desktop, tablet and mobile acceptance.
- [x] Analytics workflow, downloads and reproducibility checks.
- [x] Privacy route and controller identity implemented.
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
- [ ] Connect `www.arcusbridges.org`.
- [ ] Redirect `arcusbridges.org` permanently to the `www` address.
- [ ] Confirm a valid HTTPS certificate on both host names.
- [x] Verify that `_headers` and `_redirects` are applied by the provider.

## Owner review

- [ ] Approve the final bilingual Privacy page.
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

- [ ] Repeat every command in `ARCUS_OPEN_RELEASE_READINESS.md`.
- [ ] Verify canonical URLs, sitemap, social preview and 404 on production.
- [ ] Create a Git release tag for the approved commit.
- [ ] Record the last known-good commit and provider rollback procedure.
- [ ] Prepare screenshots and links using the real HTTPS domain, not localhost.
- [ ] Confirm launch copy and first comment links.

## Launch — 1 October

- [ ] Verify Home, Atlas, one event record, Analytics and one download.
- [ ] Verify the site from a mobile network.
- [ ] Publish the launch communication only after the live checks pass.
- [ ] Monitor errors, broken links, email and user reports during the first day.
