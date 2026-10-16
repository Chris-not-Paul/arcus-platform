# Google discovery and canonical-URL alignment — 16 October 2026

## Observations before intervention

- Search Console property: `https://www.arcusbridges.org/`.
- Page indexing report updated 12 October: 1 indexed URL and 270 discovered/currently not indexed URLs. This is a delayed report, not a current crawl inventory.
- Sitemap reported successful, last read 2 October, 271 discovered URLs at that time. The current public sitemap contains 270 URLs after the curation changes.
- Search performance through 13 October: 1 impression and 0 clicks. This is Google organic search traffic, not all website traffic.
- Live checks found all 10 core pages and the Trasta dossier reachable, with crawlable static HTML and no noindex directive. The static Atlas links to all 260 current dossiers.
- Directory pages redirect to the trailing-slash form, while the previous canonical metadata and sitemap used slashless URLs. This is a signal inconsistency, not an established cause of Google's crawl delay.

## Intervention

- Align static and client-rendered canonical URLs, sitemap URLs, core static navigation and Atlas dossier links with the served trailing-slash pages.
- Keep the scientific release `arcus-open-2026.17`, all event data and source files unchanged. Old slashless links continue to work through the hosting redirect.
- Add automated checks for all 270 generated sitemap/canonical pairs and all 260 direct dossier links from the Atlas.
- Add `scripts/audit-public-indexability.mjs` for read-only production checks of canonical targets, navigation, sitemap membership, static HTML, robots and the apex-domain redirect.

## Search Console requests

Google displayed “Indexing requested” for these three submissions on 16 October:

1. `https://www.arcusbridges.org/atlas` (hosting redirects to `/atlas/`).
2. `https://www.arcusbridges.org/methodology` (hosting redirects to `/methodology/`).
3. `https://www.arcusbridges.org/data-access/`.

Accepted requests add URLs to a priority crawl queue; they do not confirm indexing or guarantee ranking. Do not repeatedly submit the same pages to try to increase their priority.

The proposed link from the MASTER association website requires its own webmaster; no third-party website or account has been modified.
