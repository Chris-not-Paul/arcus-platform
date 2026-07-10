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
- Timeout: `8000 ms`
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

## Cause of the previous `service_unreachable`

The ISPRA service was reachable and the three layers existed. The problem was the WFS BBOX axis order.

The previous request used longitude/latitude order with `EPSG:4326`:

```text
bbox=7.94182,45.28958,7.94206,45.28982,EPSG:4326
```

In the ISPRA GeoServer WFS KVP context, `EPSG:4326` is interpreted with latitude/longitude axis order. The wrong order returned unrelated features and slow responses, often exceeding the ARCUS timeout. ARCUS then collapsed timeout/network-like failures into `service_unreachable`.

The corrected request uses latitude/longitude order:

```text
bbox=45.28958,7.94182,45.28982,7.94206,EPSG:4326
```

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

## Real Torino output

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
    "service_type": "WFS",
    "requested_version": "2.0.0",
    "resolved_version": "2.0.0",
    "fallback_used": false
  },
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

Live positive P1/P2/P3 point validation must be repeated when external ISPRA access is available. The current live check confirmed the no-intersection case for Torino with HTTP 200 on all three layers.

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
