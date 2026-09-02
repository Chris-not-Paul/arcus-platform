# ARCUS Data Release Process

## Lineage

```text
MASTER_RESEARCH.xlsx (internal, read-only)
  -> common header-based validation and lossless normalization
     -> Open release candidate + quality gate
        -> private-data/open/releases/arcus-open-2026.2 (immutable)
        -> public read-only API and downloads
     -> Professional live superset
        -> professional-events.json + professional-sources.json
        -> derived decision resources
        -> authenticated Professional API
```

`npm run build:open-release` builds only the next Open candidate without rewriting Professional data. `npm run build-data` builds both products without serving the workbook. The Open release directory contains `manifest.json`, `events.json`, `sources.json`, `taxonomy.json`, `data-dictionary.json`, `changelog.json`, `statistics.json`, `quality-audit.json`, `id-mapping.json`, `events.csv` and `events.geojson`. `current.json` selects the active immutable snapshot.

If the selected release already exists, the build verifies normalized events, sources and taxonomy, reads the existing files and does not rewrite the directory. Any content difference requires a new Open version. `arcus-open-2026.1` remains unchanged as the reproducible legacy-ID release; `arcus-open-2026.2` is the first schema-v2 release with canonical `IT` identifiers.

The manifest declares version, generation time, data cutoff, counts, taxonomy and schema versions, license, citation, changelog, limitations and SHA-256 workbook fingerprint.

Structural errors block publication: duplicate IDs/slugs/sources, orphan sources, events without sources, missing required fields, invalid taxonomy values, ID conflicts and invalid coordinates/dates. Editorial warnings are retained in the audit without dropping records.

The Professional gate additionally requires Open ID subset integrity and equality of all shared public fields after the explicit `IT`-to-legacy internal ID translation. Professional may add live records or operational attributes without changing the pinned Open release.

## Versioning and changes

Release names use `arcus-open-YYYY.N`. A new release must receive a new directory and changelog entry. Do not overwrite a cited release. Delta audit lists new, updated and removed events/sources when a preceding release exists.
