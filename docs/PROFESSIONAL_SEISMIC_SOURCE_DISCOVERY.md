# ARCUS Professional Seismic Source Discovery

Verified at: 2026-07-15

## Scope

This discovery covers the seismic vertical slice for ARCUS Professional Path 01. The milestone target is INGV MPS04 PGA median, 10% probability of exceedance in 50 years, reported as a shadow-mode official geospatial exposure for the validated project point.

The discovery explicitly separates:

- MPS04: reference regulatory model used by ARCUS as `reference_regulatory_model`.
- MPS19: updated scientific model, source-discovery only unless an official reproducible access path is integrated.

## MPS04 Official Source

```json
{
  "model": "MPS04",
  "doi": "https://doi.org/10.13127/sh/mps04/ag",
  "official_dataset_page": "http://zonesismiche.mi.ingv.it/elaborazioni/download.php",
  "official_download_url": "http://zonesismiche.mi.ingv.it/elaborazioni/dati/OPCM3519_1B_ag_005_txt.zip",
  "distribution_format": "ZIP containing TXT grid",
  "grid_spacing_degrees": 0.05,
  "coordinate_reference_system": "geographic coordinates",
  "datum": "ED50",
  "shaking_parameter": "PGA",
  "unit": "g",
  "probability_of_exceedance_50_years": 10,
  "percentile": 50,
  "reference_return_period_years": 475,
  "reference_ground_condition": "rigid/reference ground condition as documented by the MPS04 source",
  "available_percentiles": [16, 50, 84],
  "available_probabilities": [2, 5, 10, 22, 30, 39, 50, 63, 81],
  "licence": "Creative Commons Attribution 4.0 International (CC BY 4.0)",
  "redistribution_allowed": "not committed in ARCUS repository; local setup required in private-data",
  "last_verified_at": "2026-07-15"
}
```

Evidence found on official INGV pages:

- `zonesismiche.mi.ingv.it` identifies the dataset citation as MPS04 and provides the DOI.
- `elaborazioni/download.php` exposes `OPCM3519_1B_ag_005_txt.zip` for standard ag values on a 0.05 degree grid.
- The official help page states that the WebGIS visualizes/querys a regular 0.05 degree grid, supports PGA and Sa, uses unit `g`, and exposes PGA maps for exceedance probabilities in 50 years with percentiles 16, 50 and 84.
- The same official page states that geographic coordinates are in ED50. ARCUS therefore does not treat ED50 and WGS84 as identical.

## MPS04 File Schema

The official TXT inside `OPCM3519_1B_ag_005_txt.zip` was inspected in a temporary directory only. The repository does not commit the downloaded dataset.

Header:

```text
id lon lat ag 16perc 84perc
```

Meaning used by ARCUS:

- `id`: INGV grid node id.
- `lon`, `lat`: node coordinates in ED50.
- `ag`: PGA median, p50, in g.
- `16perc`: p16 uncertainty value, in g.
- `84perc`: p84 uncertainty value, in g.

## ARCUS Pipeline Decision

Implemented pipeline:

```text
official INGV ZIP
-> checksum
-> TXT schema validation
-> ED50 EPSG:4230 to WGS84 EPSG:4326 conversion with proj4
-> processed private local grid
-> manifest
-> nearest-node grid sampling provider
```

Runtime reads:

- `private-data/professional/seismic/mps04-manifest.json`
- `private-data/professional/seismic/mps04-grid.json`

These files are not committed because `private-data` is ignored. If they are missing, the provider returns `configuration_error` and `pga_p50_g: null`.

Setup commands:

```bash
npm run download:ingv-mps04
npm run build:ingv-mps04-grid
```

## CRS And Datum

ARCUS project points are WGS84 (`EPSG:4326`). The official MPS04 TXT source declares ED50. The processing script converts the source grid once into WGS84 using `proj4`, then the runtime samples the processed WGS84 grid.

Metadata retained in the manifest:

```json
{
  "input_crs": "EPSG:4326",
  "source_crs": "EPSG:4230",
  "processed_crs": "EPSG:4326",
  "coordinate_transform_applied": true,
  "transform_method": "EPSG:4230 -> EPSG:4326",
  "transform_library": "proj4",
  "transform_accuracy_note": "ED50 to WGS84 conversion is explicit; site-scale design use requires authoritative geodetic review."
}
```

## Sampling Decision

No official interpolation method was integrated in this milestone. ARCUS therefore uses:

```json
{
  "analysis_mode": "grid_sampling",
  "sampling_method": "nearest_grid_node",
  "interpolated": false,
  "interpolated_pga_g": null
}
```

The output retains the nearest node distance and the four closest surrounding nodes. It does not invent bilinear or IDW interpolation.

## MPS19 Discovery

```json
{
  "model_version": null,
  "release_date": null,
  "replaces_mps04_for_ntc": false,
  "official_data_access": "not integrated",
  "integration_decision": "not_integrated"
}
```

The INGV WebGIS exposes a 2019 option in the UI, but this milestone did not identify an official, reproducible downloadable/API path suitable for ARCUS runtime sampling. ARCUS therefore reports MPS19 only as:

```json
{
  "status": "not_integrated",
  "model": "MPS19",
  "model_role": "updated_scientific_model"
}
```

MPS19 does not replace MPS04, does not modify scoring and is not combined mathematically with MPS04.

## Caveats

MPS04 PGA is:

- a probabilistic grid value;
- referred to the model reference ground condition;
- not local site amplification;
- not topographic amplification;
- not liquefaction;
- not capable-fault assessment;
- not microzonation;
- not bridge vulnerability;
- not NTC project verification;
- not bridge collapse probability.
