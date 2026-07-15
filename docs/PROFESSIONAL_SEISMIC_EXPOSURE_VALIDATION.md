# ARCUS Professional Seismic Exposure Validation

Verified at: 2026-07-15

## Definition

ARCUS Path 01 reports INGV MPS04 seismic hazard as official point-level geospatial exposure. The selected value is PGA p50 in `g`, 10% probability of exceedance in 50 years, reference return period 475 years.

The value remains shadow-mode:

- `normalized_score: null`;
- no low/medium/high class;
- no Final Priority Index contribution;
- no bridge collapse probability.

## Implemented Chain

```text
INGV MPS04 official ZIP
-> scripts/download-ingv-mps04.js
-> scripts/build-ingv-mps04-grid.js
-> private-data/professional/seismic/mps04-manifest.json
-> private-data/professional/seismic/mps04-grid.json
-> server/hazard/providers/ingvSeismicProvider.js
-> server/hazard/hazardExposureService.js registry key seismic
-> POST /api/professional/hazard-exposure/point
-> src/pages/ProfessionalPage.jsx Official Geospatial Exposure
```

## Provider Output

Available output shape:

```json
{
  "status": "available",
  "analysis_mode": "grid_sampling",
  "model": "MPS04",
  "model_role": "reference_regulatory_model",
  "shaking_parameter": "PGA",
  "probability_of_exceedance_50_years": 10,
  "percentile": 50,
  "reference_return_period_years": 475,
  "unit": "g",
  "pga_p16_g": null,
  "pga_p50_g": null,
  "pga_p84_g": null,
  "sampling_method": "nearest_grid_node",
  "nearest_node": null,
  "surrounding_nodes": [],
  "interpolated": false,
  "interpolated_pga_g": null,
  "normalized_score": null
}
```

Missing local data output:

```json
{
  "status": "configuration_error",
  "pga_p50_g": null,
  "normalized_score": null
}
```

Outside coverage output:

```json
{
  "status": "outside_coverage",
  "pga_p50_g": null,
  "normalized_score": null
}
```

## Validation Status

Deterministic tests use a local fixture grid and validate:

- valid manifest;
- missing grid;
- schema mismatch;
- duplicate nodes;
- zero PGA distinct from missing;
- invalid coordinates;
- outside coverage;
- nearest-node sampling;
- surrounding nodes;
- provider registry invocation;
- service invocation;
- seismic-only request;
- hydraulic + landslide + seismic request;
- cache key includes seismic provider, dataset version and `grid_sampling`;
- previous hydraulic + landslide request is distinct from hydraulic + landslide + seismic.

Live validation status:

- `npm run test:hazard:seismic:live` executes the real provider against default local paths.
- If the local processed MPS04 files are absent, the script reports setup instructions and exits without inventing PGA values.
- Full live PGA validation requires running:

```bash
npm run download:ingv-mps04
npm run build:ingv-mps04-grid
npm run test:hazard:seismic:live
```

Current local live validation, after downloading and building the official MPS04 grid:

| Case | Coordinates | Nearest node | PGA p16 | PGA p50 | PGA p84 | Distance | Status |
|------|-------------|--------------|---------|---------|---------|----------|--------|
| Low reference area | `45.070300, 7.686900` | `13571` | `0.0319 g` | `0.0537 g` | `0.0634 g` | `2611 m` | `available` |
| Intermediate reference area | `43.616700, 13.516700` | `20757` | `0.1560 g` | `0.1738 g` | `0.2105 g` | `2945 m` | `available` |
| Higher reference area | `38.111300, 15.647300` | `45211` | `0.2337 g` | `0.2697 g` | `0.2944 g` | `238 m` | `available` |
| Outside coverage | `52.000000, 7.000000` | `-` | `-` | `-` | `-` | `-` | `outside_coverage` |

## UI Integration

`src/pages/ProfessionalPage.jsx` now requests:

```json
["hydraulic", "landslide", "seismic"]
```

Inside `Official Geospatial Exposure`, ARCUS shows:

- status;
- model;
- role;
- PGA median;
- unit;
- probability;
- percentile;
- reference ground;
- sampling method;
- nearest grid-node distance;
- dataset version;
- source;
- queried_at;
- normalized score not assigned.

The UI does not show seismic zone as the primary result, does not show safe/unsafe language and does not call PGA a collapse probability.

## Report And Export Plumbing

The Professional controlled GIS export metadata now declares INGV MPS04 as an official hazard source. The Path 01 static report generator notes that MPS04 point exposure is evaluated through the protected local grid when configured.

No report visual redesign was performed.

## Endpoint Validation Shape

Expected authenticated endpoint payload:

```json
{
  "latitude": 45.0703,
  "longitude": 7.6869,
  "hazards": ["hydraulic", "landslide", "seismic"],
  "bypassCache": true
}
```

Expected behavior:

- hydraulic result is preserved;
- landslide result is preserved;
- seismic returns PGA when the local MPS04 grid is configured;
- seismic `configuration_error` does not remove hydraulic or landslide;
- missing seismic value is not converted into zero.

Authenticated endpoint validation performed locally on port `4418`:

```json
{
  "status": 200,
  "overall_status": "available",
  "hydraulic": "no_intersection",
  "landslide": "no_intersection",
  "seismic": "available",
  "pga_p50_g": 0.1738,
  "seismic_score": null,
  "hazards": ["hydraulic", "landslide", "seismic"]
}
```

## Technical Debt

- Live validation points with low/intermediate/high PGA require local processed MPS04 data in `private-data`.
- No official interpolation procedure was implemented; ARCUS uses nearest grid node.
- MPS19 remains `not_integrated`.
- ED50 to WGS84 transform uses an explicit proj4 definition; design-scale use requires geodetic review.
