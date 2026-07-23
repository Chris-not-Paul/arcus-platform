# ARCUS Data Release Process

## Lineage

```text
MASTER_RESEARCH.xlsx (internal, read-only)
  -> common header-based validation and lossless normalization
     -> Open release candidate + quality gate
        -> private-data/open/releases/arcus-open-2026.1 (immutable)
        -> public read-only API and downloads
     -> Professional live superset
        -> professional-events.json + professional-sources.json
        -> derived decision resources
        -> authenticated Professional API
```

`npm run build-data` builds both products without serving the workbook. The Open release directory contains `manifest.json`, `events.json`, `sources.json`, `taxonomy.json`, `data-dictionary.json`, `changelog.json`, `statistics.json`, `quality-audit.json`, `id-mapping.json`, `events.csv` and `events.geojson`. `current.json` selects the active immutable snapshot.

If `arcus-open-2026.1` already exists, the build verifies workbook fingerprint and normalized content, reads the existing files and does not rewrite the directory. Any content difference requires a new Open version. The same normalized in-memory dataset independently regenerates the Professional live files and derived resources.

The manifest declares version, generation time, data cutoff, counts, taxonomy and schema versions, license, citation, changelog, limitations and SHA-256 workbook fingerprint.

Structural errors block publication: duplicate IDs/slugs/sources, orphan sources, events without sources, missing required fields, invalid taxonomy values, ID conflicts and invalid coordinates/dates. Editorial warnings are retained in the audit without dropping records.

The Professional gate additionally requires Open ID subset integrity and equality of all shared public fields. Professional may add live records or operational attributes without changing the pinned Open release.

## Versioning and changes

Release names use `arcus-open-YYYY.N`. A new release must receive a new directory and changelog entry. Do not overwrite a cited release. Delta audit lists new, updated and removed events/sources when a preceding release exists.
