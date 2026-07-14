# ARCUS Professional - Hydraulic Exposure Validation

## Scope

This document validates the backend communication between ARCUS Professional and the ISPRA WFS service used for Path 01 official hydraulic exposure.

The implementation remains in shadow mode:

- no change to `buildTerritoryProfiles`;
- no change to `buildAssetScreening`;
- no change to Final Priority Index or 70/30 weights;
- no numeric score assigned to P1, P2 or P3;
- no WMS `GetMap` used for calculation;
- `normalized_score` remains `null`.

## Provider

- File: `server/hazard/providers/ispraFloodProvider.js`
- Endpoint: `https://sdi.isprambiente.it/geoserver/nz1/wfs`
- Method: `GET`
- Requested WFS version: `2.0.0`
- Fallback version: `1.1.0`, only after a provider/configuration exception
- Timeout: `15000 ms`
- Format: `outputFormat=application/json`
- CRS: `srsName=EPSG:4326`
- Cache wrapper: `server/hazard/hazardExposureService.js`
- Provider version: `ispra-flood-wfs-v2`

Queried layers:

```text
nz1:aree_peric_idraulica_p1
nz1:aree_peric_idraulica_p2
nz1:aree_peric_idraulica_p3
```

## WFS BBOX order validated live

The ISPRA service is reachable and the three layers exist. Live positive validation showed that the `nz1` hydraulic WFS layers return candidate features when the BBOX is sent in longitude/latitude order with `EPSG:4326`.

The request now uses:

```text
bbox=west,south,east,north,EPSG:4326
```

For example, the validated P1/P2 point uses:

```text
bbox=12.586318213846154,37.659454120384616,12.586558213846155,37.65969412038462,EPSG:4326
```

Reproducible diagnostic comparison for the same P1 point:

| Request | BBOX | HTTP | Content type | Feature count |
|---------|------|------|--------------|---------------|
| Provider convention | `12.58631821,37.65945412,12.586558210000002,37.659694120000005,EPSG:4326` | `200` | `application/json;charset=UTF-8` | `1` |
| Inverted axes | `37.65945412,12.58631821,37.659694120000005,12.586558210000002,EPSG:4326` | `200` | `application/json;charset=UTF-8` | `0` |

ARCUS therefore uses one convention across provider, tests and documentation:

```json
{
  "request_crs": "EPSG:4326",
  "bbox_axis_order": "longitude_latitude",
  "bbox_parameter_order": "west_south_east_north"
}
```

The earlier latitude/longitude wording came from applying generic EPSG:4326 axis-order expectations before the backend validation against this specific ISPRA GeoServer endpoint. The code now follows the observed endpoint behavior, not a generic CRS assumption.

## Status model

The provider now distinguishes:

- `available`: valid GeoJSON and at least one layer intersects the point;
- `no_intersection`: valid GeoJSON, but no configured layer intersects the point;
- `partial`: at least one layer returned a usable result and at least one layer failed;
- `service_unreachable`: network/DNS/TLS/fetch failure;
- `request_timeout`: request aborted by timeout;
- `http_error`: non-2xx HTTP response;
- `invalid_response`: empty, malformed or unexpected non-GeoJSON response;
- `provider_exception`: XML OGC/GeoServer exception, including HTTP 200 XML exception payloads;
- `configuration_error`: reserved for explicit provider configuration failures.

`no_intersection` is not equivalent to unavailable. It means ISPRA returned a valid source response and ARCUS found no point intersection in P1/P2/P3.

## Fallback behavior

Primary request:

```json
{
  "requested_version": "2.0.0",
  "resolved_version": "2.0.0",
  "fallback_used": false
}
```

Fallback is attempted only when WFS 2.0.0 produces a provider/configuration exception. WFS 1.1.0 uses `typeName`; WFS 2.0.0 uses `typeNames`. The original error is preserved under `original_error`.

## Development cache behavior

The hazard service cache key includes:

- latitude rounded to 5 decimals;
- longitude rounded to 5 decimals;
- requested hazards;
- provider version.

Development requests can bypass cache via `bypassCache`. This prevents old `service_unreachable` responses from being reused during diagnosis.

## Live WFS/WMS validation matrix

Points were selected deterministically from real ISPRA WFS geometries:

1. `GetFeature` was executed on the expected source layer.
2. A real returned `Polygon`/`MultiPolygon` geometry was read.
3. ARCUS selected an interior grid point with maximum approximate clearance from polygon edges.
4. The point was verified through the ARCUS provider and the authenticated Professional endpoint.

| Case | Coordinates | WMS | WFS matched classes | Highest class | Result |
|------|-------------|-----|---------------------|---------------|--------|
| P1 source feature `aree_peric_idraulica_p1.23539` | `37.65957412, 12.58643821` | GetMap returned PNG overlay around the point (`5505` bytes) | `P1`, `P2`, `P3` | `P3` | `available`; all three layer candidates intersect the point |
| P2 source feature `aree_peric_idraulica_p2.25972` | `37.65957412, 12.58643821` | Same visual footprint as P1 because the WFS features are spatially coincident at this point | `P1`, `P2`, `P3` | `P3` | `available`; all three layer candidates intersect the point |
| P3 source feature `aree_peric_idraulica_p3.27546` | `37.63424229, 12.63078187` | GetMap returned PNG overlay around the point (`4160` bytes) | `P1`, `P2`, `P3` | `P3` | `available`; all three layer candidates intersect the point |
| Torino control | `45.28970, 7.94194` | GetMap returned a nearly empty/transparent PNG around the point (`1784` bytes) | none | `null` | `no_intersection`; candidate features are returned but local point-in-polygon rejects them |

The positive cases confirm that the ISPRA hydraulic datasets can be cumulative or overlapping at the selected points. ARCUS therefore preserves all matched classes and derives the highest observed class instead of assuming that a point sourced from P1, P2 or P3 will return only that class.

WMS remains visual-only. It was used as a visual consistency check through `GetMap`, not as a calculation source. The authoritative analytical path remains WFS candidate retrieval plus ARCUS local point-in-polygon.

## Hydraulic Class Overlap Characterisation

### Method

ARCUS ran a deterministic geometric search against real ISPRA WFS responses:

1. Fetched `120` real features from each configured layer.
2. Read `Polygon` and `MultiPolygon` geometries from the WFS GeoJSON.
3. Sampled internal grid points and selected points away from the nearest polygon boundary.
4. Re-ran each candidate through the ARCUS provider, which independently queries all three layers and performs local point-in-polygon.
5. Stopped once three different class signatures were confirmed.

The search checked `27` candidates before finding three signatures. Observed signature counts in that run:

```json
{
  "[\"P1\",\"P2\",\"P3\"]": 22,
  "[\"P1\",\"P2\"]": 4,
  "[\"P1\"]": 1
}
```

### Signatures Found

| Case | Coordinates | Expected signature | Actual signature | Highest | WMS check | Result |
|------|-------------|--------------------|------------------|---------|-----------|--------|
| P1-only, source `aree_peric_idraulica_p1.23565` | `38.94973151, 8.72300141` | `["P1"]` | `["P1"]` | `P1` | `GetMap`, `CRS:84`, BBOX `8.71300141,38.93973151,8.73300141,38.95973151`, 512x512 PNG [saved](assets/hydraulic-validation/p1-only.png) | `available`; P1 intersects, P2/P3 do not |
| P1/P2, source `aree_peric_idraulica_p1.23553` | `38.94340710, 8.91222919` | `["P1","P2"]` | `["P1","P2"]` | `P2` | `GetMap`, `CRS:84`, BBOX `8.90222919,38.933407100000004,8.92222919,38.9534071`, 512x512 PNG [saved](assets/hydraulic-validation/p1-p2.png) | `available`; P1/P2 intersect, P3 does not |
| P1/P2/P3, source `aree_peric_idraulica_p1.23539` | `37.67112259, 12.58006927` | `["P1","P2","P3"]` | `["P1","P2","P3"]` | `P3` | `GetMap`, `CRS:84`, BBOX `12.57006927,37.661122590000005,12.590069269999999,37.68112259`, 512x512 PNG [saved](assets/hydraulic-validation/p1-p2-p3.png) | `available`; all three layers intersect |
| Torino control | `45.28970, 7.94194` | `[]` | `[]` | `null` | `GetMap`, `CRS:84`, BBOX `7.93194,45.279700000000005,7.95194,45.2997`, 512x512 PNG [saved](assets/hydraulic-validation/torino-control.png) | `no_intersection`; candidate features are returned but point-in-polygon is false |

### Interpretation

The ISPRA layers are not globally identical. The validated sample shows nested or partially overlapping behaviour:

- some points intersect only `P1`;
- some points intersect `P1` and `P2`;
- some points intersect `P1`, `P2` and `P3`;
- candidate retrieval can return features even when the point itself does not intersect any geometry.

ARCUS therefore preserves every matched class and derives `highest_class` through the single flood-class severity order in `server/hazard/normalizers/floodNormalizer.js`. No numeric P1/P2/P3 score is assigned.

### WMS Visual Check

For each validation point, WMS was queried with:

```text
service=WMS
version=1.3.0
request=GetMap
layers=nz1:aree_peric_idraulica_p1,nz1:aree_peric_idraulica_p2,nz1:aree_peric_idraulica_p3
crs=CRS:84
width=512
height=512
format=image/png
transparent=true
```

The WMS result is recorded as a visual consistency check only. ARCUS does not classify exposure from tile color, rendered opacity or PNG byte size. Where available, byte length is retained only as a diagnostic that a tile was returned.

## Real endpoint outputs

Authenticated endpoint:

```text
POST /api/professional/hazard-exposure/point
```

P1/P2 point:

```json
{
  "latitude": 37.65957412,
  "longitude": 12.58643821,
  "province": "Trapani",
  "expected_layer": "P1/P2",
  "overall_status": "available",
  "matched_classes": ["P1", "P2", "P3"],
  "highest_class": "P3",
  "normalized_score": null,
  "p1": { "status": "available", "feature_count": 1, "intersects": true },
  "p2": { "status": "available", "feature_count": 1, "intersects": true },
  "p3": { "status": "available", "feature_count": 1, "intersects": true }
}
```

P3 point:

```json
{
  "latitude": 37.63424229,
  "longitude": 12.63078187,
  "province": "Trapani",
  "expected_layer": "P3",
  "overall_status": "available",
  "matched_classes": ["P1", "P2", "P3"],
  "highest_class": "P3",
  "normalized_score": null,
  "p1": { "status": "available", "feature_count": 1, "intersects": true },
  "p2": { "status": "available", "feature_count": 1, "intersects": true },
  "p3": { "status": "available", "feature_count": 1, "intersects": true }
}
```

Torino control:

Point:

```text
latitude: 45.28970
longitude: 7.94194
```

Live Node backend result:

```json
{
  "status": "no_intersection",
  "normalized_score": null,
  "source": {
    "provider": "ISPRA",
    "provider_version": "ispra-flood-wfs-v2",
    "source_dataset_version": null,
    "service_type": "WFS",
    "endpoint_identifier": "ispra-nz1-wfs",
    "requested_version": "2.0.0",
    "resolved_version": "2.0.0",
    "fallback_used": false,
    "request_crs": "EPSG:4326",
    "bbox_axis_order": "longitude_latitude",
    "bbox_parameter_order": "west_south_east_north"
  },
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

The Torino control is important because `feature_count` is non-zero after the corrected WFS BBOX retrieval, but the local point-in-polygon result remains false. This confirms that ARCUS does not equate candidate retrieval with exposure.

## Point-In-Polygon Validation

The provider does not treat `feature_count > 0` as an intersection.

The analytical sequence is:

```text
WFS BBOX
  -> GeoJSON candidate features
  -> local point-in-polygon on each candidate geometry
  -> matched_classes / highest_class
```

Supported cases:

- `Polygon`;
- `MultiPolygon`;
- inner rings / holes;
- boundary points;
- missing or invalid geometries as non-intersections.

The deterministic test suite validates:

- point inside a polygon;
- point outside the polygon but inside the returned FeatureCollection;
- point on polygon boundary;
- point inside a MultiPolygon member;
- point inside an inner ring, correctly treated as no intersection;
- P1, P2 and P3 matched classes;
- `highest_class` selection.

Live positive P1/P2/P3 validation is complete. The current live check also confirmed the no-intersection case for Torino with HTTP 200 on all three layers.

## Report behavior

When ISPRA is unavailable, ARCUS must still generate the report. The official hydraulic exposure remains separate from the provincial historical context and must be shown as unavailable with its technical status. ARCUS must not convert source unavailability into zero hazard and must not substitute a provincial proxy silently.

## Tests

Run:

```text
npm run test:hazard
```

Covered cases:

1. valid GeoJSON with feature;
2. valid GeoJSON without feature;
3. XML ServiceException with HTTP 200;
4. HTTP 400;
5. HTTP 404;
6. HTTP 500;
7. timeout;
8. DNS/network failure;
9. unexpected content-type;
10. WFS 2.0.0 -> 1.1.0 fallback;
11. cache bypass in development;
12. one layer error with other layers available;
13. `no_intersection` distinct from unavailable;
14. deterministic output.

## Limits

- Remote ISPRA availability is outside ARCUS control.
- Area, route and batch inventory intersections are not implemented in this milestone.
- No P1/P2/P3 scoring or weighting has been approved yet.
- WMS overlays remain visual-only.
