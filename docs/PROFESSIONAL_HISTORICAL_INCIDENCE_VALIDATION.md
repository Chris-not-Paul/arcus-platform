# ARCUS Professional - Historical Collapse Incidence Validation

## Scope Separation

ARCUS now keeps two distinct dataset scopes.

**Open dataset scope**

- Source of truth: `server/dataService.js` -> `getOpenEvents()` / `getOpenSources()`.
- Uses `server/config.js` -> `publicReleaseEndYear = 2025`.
- Used by public Open/Atlas surfaces.

**Professional dataset scope**

- Source of truth: `private-data/processed/events.json` and `private-data/processed/sources.json`.
- Exposed to authenticated Professional users through:
  - `/api/professional/professional-events`;
  - `/api/professional/professional-sources`.
- Used by ARCUS Professional Path 01, Path 02, report maps, report text and exports.
- Includes all curated internal events, including 2026 when present.

The Professional scope must not be inferred from `openEvents()`.

## Professional Dataset Snapshot

Current Professional snapshot:

```json
{
  "dataset_scope": "professional",
  "dataset_version": "arcus-professional-2026.07.10",
  "data_cutoff_date": "2026-07-10T14:20:00.000Z",
  "latest_event_date": "2026-04-02",
  "included_year_min": 2000,
  "included_year_max": 2026,
  "total_events": 253,
  "total_sources": 688,
  "events_2026": 1,
  "provinces_with_2026_events": ["Campobasso"]
}
```

Open comparison:

```json
{
  "open_total_events": 252,
  "professional_total_events": 253,
  "professional_minus_open": 1
}
```

## Formula

The methodology is unchanged:

```text
provincial_rate =
  documented ARCUS cases in province /
  bridges counted in province * 100

relative_to_national =
  provincial_rate / national_rate
```

The numerator and national rate must use the same scope.

## Generator

Reproducible generator:

```text
scripts/build-ainop-bridge-index.js
```

Default behavior:

```text
npm run build:ainop-index
```

Equivalent to:

```text
node scripts/build-ainop-bridge-index.js --scope=professional
```

Open regression snapshot:

```text
node scripts/build-ainop-bridge-index.js --scope=open --write=false
```

`--scope professional` includes all curated internal events. `--scope open` applies `publicReleaseEndYear`.

The generator preserves existing AINOP denominators and recalculates:

- `numerator_count`;
- `denominator_count`;
- `provincial_rate_per_100`;
- `national_rate_per_100`;
- `relative_to_national`;
- `dataset_scope`;
- `dataset_version`;
- `data_cutoff_date`;
- `latest_event_date`;
- `included_year_min`;
- `included_year_max`;
- confidence fields.

## Torino

Torino has no additional 2026 event in the current internal dataset, so the provincial numerator remains 40. The national rate changes because Professional includes the 2026 Campobasso event.

```json
{
  "province": "Torino",
  "numerator_count": 40,
  "denominator_count": 1285,
  "provincial_rate_per_100": 3.113,
  "national_rate_per_100": 0.562,
  "relative_to_national": 5.54,
  "dataset_scope": "professional",
  "dataset_version": "arcus-professional-2026.07.10",
  "data_cutoff_date": "2026-07-10T14:20:00.000Z",
  "latest_event_date": "2026-04-02",
  "included_year_max": 2026,
  "denominator_confidence": "high",
  "confidence_type": "denominator_sample_size",
  "numerator_evidence_confidence": "documented",
  "overall_data_confidence": null
}
```

Open snapshot for comparison:

```json
{
  "scope": "open",
  "total_events": 252,
  "national_rate_per_100": 0.56,
  "torino_relative_to_national": 5.56
}
```

## Previous Inconsistency

The old `5.82x` value was mathematically consistent with a stale index numerator:

```text
42 / 1285 * 100 = 3.268
3.268 / 0.562 = 5.82
```

The UI displayed 40 Torino events, so UI and index were using different snapshots. The generator now prevents this by recalculating every provincial numerator and the national rate from one explicit scope.

## UI, Report And Export Alignment

Path 01 now uses the same Professional record for:

- Working Package;
- Provincial Historical Context block;
- Full Report;
- One-Page Brief;
- standalone report export;
- GIS/export metadata.

Visible fields include:

- documented ARCUS cases;
- denominator;
- provincial rate;
- national Professional reference rate;
- relative incidence;
- dataset version;
- data cutoff date;
- latest included event date/year;
- confidence and caveat.

The visible confidence refers to AINOP denominator availability and sample size. It must not be presented as a collapse probability, a structural reliability statement or an overall risk confidence.

Current confidence fields:

```json
{
  "denominator_confidence": "high",
  "confidence_type": "denominator_sample_size",
  "numerator_evidence_confidence": "documented",
  "overall_data_confidence": null,
  "collapse_rate_confidence": "high"
}
```

`overall_data_confidence` is intentionally `null` because no approved methodology currently combines denominator coverage, numerator evidence quality and source traceability into one overall confidence level for Historical Collapse Incidence.

## Tests

Run:

```text
npm run test:historical-incidence
```

Covered cases:

- Open scope applies `publicReleaseEndYear`;
- Professional scope includes post-2025 events;
- 2026 event enters Professional provincial numerator and national rate;
- 2026 event is excluded from Open scope;
- dataset version, data cutoff, latest event date and included year max are derived;
- numerator, denominator, provincial rate and relative incidence are mathematically coherent;
- UI/report/export use the same numerator field;
- denominator confidence is explicitly typed as `denominator_sample_size`;
- `overall_data_confidence` remains `null`;
- zero-case and missing-denominator provinces are handled;
- incoherent records are rejected.

## Limits

- AINOP remains a denominator candidate, not a complete certified bridge inventory.
- Provinces with no AINOP denominator keep incidence unavailable.
- This layer does not change Final Priority Index formula or Path 02 ranking.
