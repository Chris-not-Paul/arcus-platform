# Atlas robustness and editorial acceptance — 10 September 2026

Scope: Open Atlas loading, performance, editorial presentation and responsive interactions. The master workbook and the immutable Open release are preserved.

## Loading and performance

- Contexts are requested when the full dossier opens; the initial map and marker preview do not download them.
- The five context/media catalogues share an in-memory cache, including in-flight requests and parsed JSON. Entries expire after five minutes; the cache is bounded to 300 entries. Failures are evicted so retry works.
- Loading, catalogue absence, request failure and a context that no longer matches the event have separate visible states. Tabs remain reachable. HTTP errors and malformed payloads do not become missing scientific evidence.
- Requests have a timeout (15 seconds for UI data; 20 seconds for the rainfall builder). Changing the selected event cannot display the previous event's context.
- Point/grid contexts are checked against the current record's coordinates and date. Hydrometric reports retain their explicitly documented approximate section; they are not treated as point-grid products.
- Open event/source/manifest failures produce a banner with retry. An unavailable event count is shown as a dash. Record-and-source export is disabled while sources are unavailable.
- Direct Atlas entry bypasses the 4.55-second introductory animation. Research/download controls are collapsed initially and accessible on small screens.
- Focus navigation is marked complete only after it has actually executed. Cancelling a pending timer during a metadata render no longer loses the move to the bridge. Mobile/tablet focus accounts for the preview's occupied area.
- The mobile national view fits Italy including Sicily and Sardinia. The mobile preview sits at the bottom, with a reachable full-record button and space for the selected marker.

## Editorial decisions

The existing 74 warnings were reviewed as categories; this work does not claim that all underlying records are scientifically resolved.

| Existing finding | Count | Decision |
|---|---:|---|
| Non-hydraulic records with shared failure-detail fields | 50 | Retain the information. Presence of a common process/component field is not sufficient grounds for deletion. |
| Administrative naming variants resolved by coordinates | 14 | Retain original names and existing coordinate resolution/provenance. Do not silently rewrite the historical province. |
| Declared province differs from point-derived province | 5 | Remain reviewable. A bridge may lie at an administrative boundary; the discrepancy alone does not justify moving coordinates. |
| Coordinates unresolved by the province geometry | 1 | Remains unresolved: IT17.09.01. |
| Hydraulic evidence requires review | 2 | IT00.10.22 and IT00.10.23: the record's own notes question documentary confirmation at Bussoleno. A review notice now precedes the full narrative. |
| Known component, unspecified process | 1 | IT20.10.18: retain the documented whole-structure loss without inventing a specific mechanism. |
| Hydraulic trigger outside old vocabulary | 1 | IT22.02.01: retain “No identifiable external trigger”; the record explicitly distinguishes progressive scour from a discrete flood at collapse time. |

Display-only changes: translated the two remaining English bridge labels; canonical IT references replace legacy B references in displayed prose; the description is labelled as original-language record text, including mixed-language notes. The JSON export is labelled “record and sources” because environmental contexts are not part of that download. Current territorial data are described by their retrieval date, rather than being presented as live data from today.

### Corrected rainfall context

IT00.10.41 had a CERRA context requested at an obsolete coordinate (45.3031431459588, 8.47076161504581), inconsistent with the current master-derived release. It was retrieved again from the actual Open-Meteo archive service using the current event coordinates and the same 14-day CERRA product. The event-day value changed from 10.2 mm to 28.3 mm. These are reanalysis estimates, not rain-gauge observations. Retrieval URL, timestamp and grid coordinates are retained in `public/data/event-context/rainfall/IT00.10.41.json`.

The rainfall builder now rejects null, non-numeric, negative or incomplete/incorrectly dated daily values rather than converting missing precipitation into zero.

## Verification

`npm run test:event-context-loading` checks shared concurrent fetches, reuse, HTTP/JSON failure recovery, timeout, absent catalogue entries, incorrect event identity and coordinates/date consistency. It also reads the complete real local catalogue: 199 rainfall contexts, 211 hydraulic dossiers, 261 territorial contexts, 250 class histories and media/link entries for 38 events.

`npm run test:atlas-ui` uses Chromium against the running local server (`ARCUS_TEST_BASE_URL`, default `http://127.0.0.1:5173`). It covers desktop 1280×800, tablet 768×1024, mobile 390×844 and small mobile 360×640; overview/selection/dossier layout; marker and sidebar selection; current/history/bridge/source tabs; cache reuse across distant events; CSV and event JSON downloads; keyboard focus and Escape; review/approximate-coordinate states; explicit HTTP 503 failures followed by retry and recovery. The failure cases are deliberately intercepted test responses; normal scenarios use real local published data.

Final result: **passed** for the implemented scope. All 16 browser checks passed, with 20 screenshots, no unexpected local request failures or uncaught browser errors, and no external request failures in the final network-enabled run. Manual screenshot inspection covered the national overview, visible selected marker, shared-episode panel, dossier layout and current/history controls. User zoom is preserved while toggling the sidebar.

Checks passed: `test:event-context-loading`, `test:event-weather-context`, `test:event-hydraulic-context`, `test:event-territorial-context`, `test:event-hazard-history`, `test:event-media`, `test:open-release`, `test:atlas-ui`, `lint`, `build`, and `git diff --check`. Build emitted a plugin-timing advisory without build errors.

Screenshots and machine-readable results are generated in `outputs/atlas-acceptance/` (local, ignored by Git). Initial sandbox-only browser runs could not retrieve external tiles/fonts; the accepted visual run uses network-enabled Chromium and real Esri tiles. This is an Atlas UI acceptance check against published snapshots, not a new live ISPRA/INGV validation.

## Remaining limitations

- Documentary gaps and the province discrepancies above remain visible; no new event evidence was invented.
- Automated responsive testing covers Chromium viewport sizes. Safari/iOS and physical touch-device testing remain outstanding.
- Cache reuse is verified by request counts, not a claimed performance percentile or external load test.
- Basemap/font availability still depends on their external providers. A successful test run does not guarantee future provider uptime.
- The Open release's 74 historical warnings remain in its audit; this work neither republishes the release nor edits the master.

## Research legibility refinement — 21 September 2026

The full event page now exposes a field-level compilation summary in the
**Sources and quality** tab. Identity/location, failure mechanism, bridge
profile and observed outcome are reported separately, with available and
missing fields made explicit. Numeric zero and boolean false remain valid
observations and are not counted as missing.

The same surface publishes the stable event identifier, Open release version,
data cutoff, licence and full record citation. The downloadable event dossier
uses `arcus-open-event-dossier-v3` and includes these release metadata plus the
machine-readable completeness and source-composition summary. The calculation
is descriptive only: it is not a quality, reliability, safety or model-readiness
score.

The dedicated record page uses a persistent section navigator. On wide screens,
record quality is presented as a compact horizontal audit, completeness and
citation share one editorial row, and documentary sources use the full page
width. Tablet and mobile layouts collapse progressively without hiding fields
or introducing horizontal scrolling.

Open Analytics now exposes documentary provenance for every filtered cohort:
source counts by official/technical, scientific, news and other roles, together
with event-level official/scientific coverage and records without linked
sources. Documentary volume remains explicitly separated from source
independence, reliability and causal certainty.

Verification passed: `test:open-release`, `test:open-production`,
`test:backend`, `test:atlas-ui`, `test:analytics-ui`, `lint`, `build` and
`git diff --check`. Dedicated visual checks are generated as
`outputs/atlas-acceptance/desktop-research-quality.png` and
`outputs/atlas-acceptance/desktop-shared-episode.png`.

## Shared hazard episode control — 22 September 2026

The Open release now includes `episodes.json`, a deliberately conservative
projection of shared hazard episodes. Publication is limited to multi-collapse
groups supported by shared documentary sources or a curated hazard registry;
singletons, date-only matches and unsupported temporal-regional inferences are
excluded. The current release publishes 14 groups (13 flood episodes and one
earthquake episode), covering 108 event records.

For member records, the Atlas dossier identifies the shared episode, its date,
territorial coverage and other linked records. The interface explicitly states
that episode membership controls clustering and does not establish an identical
structural failure mechanism. Open Analytics reports the number of records,
published episodes and the sensitivity count obtained when every published
episode is counted once. The same data and caveat are included in event dossiers
and reproducible research packages.
