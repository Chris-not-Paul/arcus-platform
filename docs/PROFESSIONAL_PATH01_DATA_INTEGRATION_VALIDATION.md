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
- BBOX candidate retrieval using `west,south,east,north,EPSG:4326`;
- local point-in-polygon for `Polygon`, `MultiPolygon`, holes and boundary points;
- `feature_count > 0` never implies `intersects = true`;
- `normalized_score = null`;
- `no_intersection` remains distinct from unavailable/error statuses.

Provider metadata exposed with each result:

```json
{
  "provider": "ISPRA",
  "provider_version": "ispra-flood-wfs-v2",
  "source_dataset_version": null,
  "service_type": "WFS",
  "endpoint_identifier": "ispra-nz1-wfs",
  "request_crs": "EPSG:4326",
  "bbox_axis_order": "longitude_latitude",
  "bbox_parameter_order": "west_south_east_north"
}
```

### Live P1/P2/P3 Positive Validation

The hydraulic vertical slice has now been validated with real positive ISPRA points. Points were not chosen manually: they were selected from real WFS geometries, moved to an interior grid point away from polygon edges, then verified by the ARCUS provider and by the authenticated Professional endpoint.

| Case | Coordinates | WMS | WFS matched classes | Highest class | Result |
|------|-------------|-----|---------------------|---------------|--------|
| P1-only, source feature `aree_peric_idraulica_p1.23565` | `38.94973151, 8.72300141` | [PNG saved](assets/hydraulic-validation/p1-only.png), visual-only WMS control | `P1` | `P1` | Professional endpoint returns `available`; P2/P3 do not intersect |
| P1/P2, source feature `aree_peric_idraulica_p1.23553` | `38.94340710, 8.91222919` | [PNG saved](assets/hydraulic-validation/p1-p2.png), visual-only WMS control | `P1`, `P2` | `P2` | Professional endpoint returns `available`; P3 does not intersect |
| P1/P2/P3, source feature `aree_peric_idraulica_p1.23539` | `37.67112259, 12.58006927` | [PNG saved](assets/hydraulic-validation/p1-p2-p3.png), visual-only WMS control | `P1`, `P2`, `P3` | `P3` | Professional endpoint returns `available`; all three layers intersect |
| Torino control | `45.28970, 7.94194` | [PNG saved](assets/hydraulic-validation/torino-control.png), visual-only WMS control | none | `null` | Professional endpoint returns `no_intersection` |

The WFS layers are not all globally coincident. The live sample contains P1-only, P1/P2 and P1/P2/P3 signatures. ARCUS therefore displays all matched classes and computes the highest class from the matched set; it does not force the output to match only the layer used to discover the candidate point.

Current live positive endpoint result for the P1/P2/P3 point:

```json
{
  "status": "available",
  "matched_classes": ["P1", "P2", "P3"],
  "highest_class": "P3",
  "normalized_score": null,
  "p1": {
    "status": "available",
    "feature_count": 1,
    "intersects": true
  },
  "p2": {
    "status": "available",
    "feature_count": 1,
    "intersects": true
  },
  "p3": {
    "status": "available",
    "feature_count": 1,
    "intersects": true
  }
}
```

Current live Torino result:

```json
{
  "status": "no_intersection",
  "p1": {
    "status": "no_intersection",
    "http_status": 200,
    "feature_count": 1,
    "intersects": false
  },
  "p2": {
    "status": "no_intersection",
    "http_status": 200,
    "feature_count": 1,
    "intersects": false
  },
  "p3": {
    "status": "no_intersection",
    "http_status": 200,
    "feature_count": 1,
    "intersects": false
  }
}
```

This confirms the intended distinction between candidate feature retrieval and actual point intersection.

### Manual UI Validation

The interface was checked through the Professional login and Path 01 entry flow:

- Professional login opened correctly with the local development account;
- Path 01 opened on `Define project location`;
- the page exposed the expected sections: `Project location`, `Official geospatial exposure`, `Provincial historical context`, working package and disabled report state before point validation;
- the same positive coordinates were then validated through the authenticated endpoint used by the UI.

Repeatable UI check:

1. Sign in as `arcus` / `professional`.
2. Open `Professional`.
3. Choose `01 / New territory - Screen area`.
4. Enter latitude `37.67112259` and longitude `12.58006927`.
5. Click `Check point`.
6. Confirm that Project Location derives `Trapani`, Official Geospatial Exposure shows `available`, matched classes show `P1`, `P2`, `P3`, highest class shows `P3`, `queried_at` is populated, Provincial Historical Context is still shown separately, and report generation remains tied to the validated project point.

Deterministic mocked tests continue to cover P1, P2, P3, MultiPolygon, boundary and inner-ring cases in addition to the live ISPRA checks above.

### Hydraulic Class Overlap Characterisation

The live class-overlap validation used real ISPRA WFS geometries and then re-ran every candidate through the ARCUS provider. The search checked `27` internal candidate points from fetched `Polygon`/`MultiPolygon` geometries and found three distinct signatures.

| Case | Coordinates | Expected signature | Actual signature | Highest | WMS check | Result |
|------|-------------|--------------------|------------------|---------|-----------|--------|
| P1-only | `38.94973151, 8.72300141` | `["P1"]` | `["P1"]` | `P1` | `GetMap`, `CRS:84`, 512x512 PNG returned for visual inspection | `available`; only P1 intersects |
| P1/P2 | `38.94340710, 8.91222919` | `["P1","P2"]` | `["P1","P2"]` | `P2` | `GetMap`, `CRS:84`, 512x512 PNG returned for visual inspection | `available`; P1/P2 intersect |
| P1/P2/P3 | `37.67112259, 12.58006927` | `["P1","P2","P3"]` | `["P1","P2","P3"]` | `P3` | `GetMap`, `CRS:84`, 512x512 PNG returned for visual inspection | `available`; all three layers intersect |
| Torino control | `45.28970, 7.94194` | `[]` | `[]` | `null` | `GetMap`, `CRS:84`, 512x512 PNG returned for visual inspection | `no_intersection`; candidate features are not point exposure |

Observed candidate-signature counts in the live run:

```json
{
  "[\"P1\",\"P2\",\"P3\"]": 22,
  "[\"P1\",\"P2\"]": 4,
  "[\"P1\"]": 1
}
```

This means the layers are not globally coincident. They behave as nested or partially overlapping geometries in the sampled regions, and ARCUS correctly preserves all matched classes before deriving `highest_class`.

WMS remains a visual control only. Path 01, reports and exports must continue to treat WFS plus local point-in-polygon as the analytical source of truth.

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

### Official Landslide Exposure - ISPRA PAI

Path 01 now also exposes official point-level landslide hazard in shadow mode through the ISPRA IdroGEO PAI WFS layer.

| Element | Value |
|---------|-------|
| Provider | ISPRA / IdroGEO |
| WFS endpoint | `https://idrogeo.isprambiente.it/geoserver/idrogeo/ows` |
| WFS layer | `idrogeo:pericolosita_frane` |
| WMS visual layer | `https://idrogeo.isprambiente.it/geoserver/idrogeo/wms`, `idrogeo:pericolosita_frane` |
| Source version | `5.0` |
| Reference year | `2024` |
| Class attribute | `cod_per_it` |
| Classes | `AA`, `P1`, `P2`, `P3`, `P4` |
| Analysis mode | `point_intersection` |
| Score behavior | `normalized_score = null` |

The analytical chain is:

```text
project point
-> ISPRA PAI WFS candidate retrieval
-> ARCUS point-in-polygon
-> matched PAI classes
-> highest ordered class P1-P4
-> Path 01 UI/report/export metadata
```

The `frane` WMS/IFFI inventory layer is not used as the analytical PAI hazard source. It has been replaced in the ARCUS WMS controls by the visual PAI layer `idrogeo:pericolosita_frane`.

Live validation points:

| Case | Coordinates | WMS | WFS matched classes | Highest class | Result |
|------|-------------|-----|---------------------|---------------|--------|
| AA attention area | `36.82837857, 14.72710000` | [PNG](assets/landslide-validation/aa.png) | `AA` attention area | `null` | `available` |
| P1 moderate hazard | `43.50846429, 10.33828571` | [PNG](assets/landslide-validation/p1.png) | `P1` | `P1` | `available` |
| P2 medium hazard | `44.40296071, 9.53897143` | [PNG](assets/landslide-validation/p2.png) | `P2` | `P2` | `available` |
| P3 high hazard | `38.92257500, 8.78543214` | [PNG](assets/landslide-validation/p3.png) | `P3` | `P3` | `available` |
| P4 very high hazard | `40.10005714, 16.00375000` | [PNG](assets/landslide-validation/p4.png) | `P4` | `P4` | `available` |
| Torino control | `45.28970000, 7.94194000` | [PNG](assets/landslide-validation/torino-control.png) | none | `null` | `no_intersection` |

Detailed discovery and validation are documented in:

- `docs/PROFESSIONAL_LANDSLIDE_SOURCE_DISCOVERY.md`
- `docs/PROFESSIONAL_LANDSLIDE_EXPOSURE_VALIDATION.md`

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

- `hazard-exposure-preview` remains a provincial ARCUS proxy and is not removed.
- Seismic, river network and capable-fault analytical providers are not part of this milestone.
- Landslide PAI is implemented only for Path 01 point exposure in shadow mode; it is not yet part of Final Priority Index scoring or Path 02 ranking.
