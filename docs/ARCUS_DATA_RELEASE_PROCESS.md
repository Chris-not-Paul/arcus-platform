# ARCUS Data Release Process

## Lineage

```text
MASTER_RESEARCH.xlsx (internal, read-only)
  -> common header-based validation and lossless normalization
     -> Open release candidate + quality gate
        -> private-data/open/releases/arcus-open-2026.15 (immutable)
        -> public read-only API and downloads
     -> Professional live superset
        -> professional-events.json + professional-sources.json
        -> derived decision resources
        -> authenticated Professional API
```

`npm run build:open-release` builds only the next Open candidate without rewriting Professional data. `npm run build-data` builds both products without serving the workbook. The Open release directory contains `manifest.json`, `events.json`, `sources.json`, `taxonomy.json`, `data-dictionary.json`, `changelog.json`, `statistics.json`, `quality-audit.json`, `id-mapping.json`, `events.csv` and `events.geojson`. `current.json` selects the active immutable snapshot.

During normalization, ARCUS adds one contextual citation of D'Angelo, Ballio and Ravazzani (2025) to each event classified `Hydraulic`, unless that DOI is already linked in the workbook. The generated records have stable `CTX-HYD-ITxx.xx.xx` IDs and the role `Scientific context`; the original workbook rows remain unchanged.

If the selected release already exists, the build verifies normalized events, sources and taxonomy, reads the existing files and does not rewrite the directory. Any content difference requires a new Open version. Releases through `arcus-open-2026.13` remain immutable historical snapshots. `arcus-open-2026.14` restores Rio Bavera as a documented PC with explicit timing caveats, adds the separately sourced road Ponte dei Crivellari as a hydraulic TC, and corrects the distinct cycle-footbridge collapse date to 7 September 2023. The invalid Fontanelice/P206 association remains excluded; no fields were transferred automatically to the new Crivellari record.

The manifest declares version, generation time, data cutoff, counts, taxonomy and schema versions, license, citation, changelog, limitations and SHA-256 workbook fingerprint.

Structural errors block publication: duplicate IDs/slugs/sources, orphan sources, events without sources, missing required fields, invalid taxonomy values, ID conflicts and invalid coordinates/dates. Editorial warnings are retained in the audit without dropping records.

The Professional gate additionally requires Open ID subset integrity and equality of all shared public fields after the explicit `IT`-to-legacy internal ID translation. Professional may add live records or operational attributes without changing the pinned Open release.

## Versioning and changes

Release `arcus-open-2026.15` is the current publication candidate (260 events, 1057 sources, schema v3). It supersedes earlier ARCUS versions for consultation; only the current static package is included in `dist`. Historical private snapshots and the pre-publication backup remain recoverable. Old hosted previews/deploys must be retired separately, and their retirement must be verified on Netlify. External DOI datasets are outside this process and remain untouched.

Release names use `arcus-open-YYYY.N`. A new release must receive a new directory and changelog entry. Do not overwrite a cited release. Delta audit lists new, updated and removed events/sources when a preceding release exists.

## Curator decisions — 15 October 2026

For an event documented within a multi-day window, store its first day in `EVENTS.date` as a conventional date and retain the complete interval and the convention in `EVENTS.description`. A month-only date is not automatically assigned its first day. An independently specified bridge-collapse day must not be replaced by the start of a wider flood or an earlier damage stage. Event IDs and slugs remain stable when the stored date changes.

The curator closed the outstanding TC/PC coding questions by retaining the Master classifications current on 15 October 2026. Record this as a curator decision in `CURATION_LOG`, not as newly verified technical evidence. This does not change the taxonomy definitions, upgrade evidence/confidence flags, or resolve separate questions about event identity, bridge-dataset eligibility, sources, materials, mechanisms or duplicate records. Archived records remain archived. Later evidence-based corrections remain possible and must be logged individually.

The local Master review sheets show these decisions in columns G–H; the accompanying updated review workbooks show them in O–P. Earlier task and evidence text is preserved as review history. These local edits do not publish a release automatically.

### Restricted approach-embankment extension

The subsequent curator-approved ARCUS operational extension applies exclusively to documented physical collapse of an approach embankment directly connected to the bridge. It is not the literal NYSDOT primary-span-member definition. Operational TC requires total physical interruption of every lane/the relevant passage from complete approach loss, or immediate undermining and destructive collapse of the adjacent abutment caused by the approach collapse. Operational PC requires partial approach collapse, residual physical access/passability, and evident immediate danger to users. An administrative closure alone never establishes either outcome. Erosion without collapse, inundation, an unrelated road failure, or retaining-wall damage without demonstrated collapse of the approach embankment does not qualify.

`approach_extension_status` records `Applicable`, `Needs review`, `Not applicable` or `Not assessed` independently of `collapse_severity` and `component_involved`. `Applicable` establishes the documented approach-collapse scope, not the correctness of a retained TC/PC value. Unknown lane passability must remain a limitation; the code must not be inferred from the component or a closure. `Not assessed` is not a verified structural-only comparison group. Release statistics expose status counts and the severity distribution within the applicable subset, and dossiers/downloads preserve the status. Existing IDs, dates and severity codes are retained unless an individual evidence-based correction is explicitly supported. Archived records are not automatically restored by this rule; Novara in particular requires proof of approach-embankment collapse, not just retaining-wall detachment.
