# ARCUS Professional Path 01 - Data Integration Validation

## Professional Dataset Freshness And Versioning

ARCUS separates Open and Professional data scopes.

### Open Dataset Scope

- Source of truth: `server/dataService.js` -> `getOpenEvents()` and `getOpenSources()`.
- Applies `server/config.js` -> `publicReleaseEndYear = 2025`.
- Used by public Open/Atlas surfaces.

### Professional Dataset Scope

- Source of truth:
  - `private-data/processed/events.json`;
  - `private-data/processed/sources.json`.
- Protected API resources:
  - `/api/professional/professional-events`;
  - `/api/professional/professional-sources`.
- Used by:
  - `src/pages/ProfessionalPage.jsx`;
  - `src/pages/ReportMapPath01.jsx`;
  - `scripts/export-path01-report.js`;
  - `private-data/professional/ainop-bridge-index.json`.

Professional Path 01 no longer uses `openEvents()` as its event source.

## Current Professional Snapshot

```json
{
  "dataset_scope": "professional",
  "dataset_version": "arcus-professional-2026.07.10",
  "data_cutoff_date": "2026-07-10T14:20:00.000Z",
  "latest_event_date": "2026-04-02",
  "included_year_min": 2000,
  "included_year_max": 2026,
  "total_events": 253,
  "total_sources": 688
}
```

2026 coverage:

```json
{
  "events_2026": 1,
  "provinces_with_2026_events": ["Campobasso"],
  "open_total_events": 252,
  "professional_total_events": 253,
  "professional_minus_open": 1
}
```

The 2026 event is included in Professional Path 01 numerators, national rate and report scope. It remains excluded from Open scope while `publicReleaseEndYear = 2025`.

## Path 01 Screen Structure

Path 01 remains divided into:

### A. Project Location

- latitude;
- longitude;
- derived province;
- province code;
- municipality where available.

The project point remains the source of truth for province derivation.

### B. Official Geospatial Exposure

- ISPRA WFS status;
- P1/P2/P3 layer results;
- matched classes;
- highest class;
- provider;
- `queried_at`;
- `normalized_score = null`.

This is point-level official exposure and is independent from the ARCUS collapse dataset year range.

### C. Provincial Historical Context

- documented ARCUS cases in current Professional scope;
- denominator;
- provincial rate;
- national Professional reference rate;
- relative incidence;
- dataset version;
- data cutoff date;
- latest included event date/year;
- confidence;
- AINOP caveat.

This is provincial historical context, not point-level collapse probability.

## Historical Collapse Incidence

Generator:

```text
scripts/build-ainop-bridge-index.js
```

Production Professional build:

```text
npm run build:ainop-index
```

Explicit scopes:

```text
node scripts/build-ainop-bridge-index.js --scope=professional
node scripts/build-ainop-bridge-index.js --scope=open --write=false
```

Current Torino Professional values:

```json
{
  "numerator_count": 40,
  "denominator_count": 1285,
  "provincial_rate_per_100": 3.113,
  "national_rate_per_100": 0.562,
  "relative_to_national": 5.54,
  "dataset_scope": "professional",
  "included_year_max": 2026
}
```

## Official Hydraulic Exposure

Provider:

```text
server/hazard/providers/ispraFloodProvider.js
```

Layers:

```text
nz1:aree_peric_idraulica_p1
nz1:aree_peric_idraulica_p2
nz1:aree_peric_idraulica_p3
```

Rules:

- WFS 2.0.0 primary;
- controlled WFS 1.1.0 fallback;
- WMS not used for calculation;
- BBOX candidate retrieval;
- local point-in-polygon for `Polygon`, `MultiPolygon`, holes and boundary points;
- `feature_count > 0` never implies `intersects = true`;
- `normalized_score = null`;
- `no_intersection` remains distinct from unavailable/error statuses.

Current live Torino result:

```json
{
  "status": "no_intersection",
  "p1": {
    "status": "no_intersection",
    "http_status": 200,
    "feature_count": 0,
    "intersects": false
  },
  "p2": {
    "status": "no_intersection",
    "http_status": 200,
    "feature_count": 0,
    "intersects": false
  },
  "p3": {
    "status": "no_intersection",
    "http_status": 200,
    "feature_count": 0,
    "intersects": false
  }
}
```

Live positive P1/P2/P3 validation is still pending because the last external ISPRA verification run was blocked by the execution limit. Deterministic mocked tests cover P1, P2, P3, MultiPolygon, boundary and inner-ring cases.

## Report And Export Behavior

Full Report, One-Page Brief and standalone export now use the Professional scope and include:

### Professional Dataset Information

- dataset scope;
- dataset version;
- data cutoff date;
- latest included event date;
- included year range;
- total event count.

### Provincial Historical Context

- numerator;
- denominator;
- provincial rate;
- national Professional rate;
- relative incidence;
- confidence;
- caveat.

### Official Hydraulic Exposure

- status;
- P1/P2/P3;
- matched classes;
- highest class;
- `queried_at`;
- `normalized_score = null`.

Reports must not describe Professional data freshness as real-time/live. The database is a curated snapshot.

## Tests

Relevant commands:

```text
npm run test:historical-incidence
npm run test:hazard
npm run test:location
npm run test:backend
npm run lint
npm run build
```

Validated:

- Open and Professional scopes are distinct;
- Professional includes 2026;
- Open excludes 2026 while configured to 2025;
- Professional AINOP national rate uses the Professional numerator total;
- UI/report/export use the same numerator source;
- report map uses Professional events;
- no fixed `release end year = 2025` wording remains in Professional report/export code;
- point/province synchronization tests still pass;
- hazard provider keeps `no_intersection` distinct from unavailable.

## Technical Debt

- Live positive P1/P2/P3 ISPRA points still need to be confirmed once external requests are available again.
- `hazard-exposure-preview` remains a provincial ARCUS proxy and is not removed.
- Landslide, seismic, river network and capable-fault analytical providers are not part of this milestone.
