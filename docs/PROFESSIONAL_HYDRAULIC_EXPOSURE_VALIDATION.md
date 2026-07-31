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

## WFS server-side point intersection validated live

The ISPRA service is reachable and the three layers exist. `DescribeFeatureType`
confirms `geom` as the geometry field and `scenariop1`, `scenariop2` and
`scenariop3` as the small scenario attributes.

The production query evaluates the exact point intersection inside GeoServer:

```text
CQL_FILTER=INTERSECTS(geom,SRID=4326;POINT(longitude latitude))
count=1
propertyName=scenariopN
```

The explicit `SRID=4326` is required to remove axis-order ambiguity. The
response omits polygon geometry because the spatial predicate has already been
evaluated by the authoritative WFS.

ARCUS records the convention in source and request provenance:

```json
{
  "request_crs": "EPSG:4326",
  "query_method": "server_side_point_intersection",
  "filter_crs": "EPSG:4326",
  "filter_axis_order": "longitude_latitude",
  "filter_geometry_property": "geom",
  "response_property": "scenariop1"
}
```

This replaces the earlier BBOX candidate-download path. At the Torino control,
that path downloaded approximately 90 MB for P1 and 70 MB for P3 while P2
timed out. The server-side predicate returns 147-byte empty FeatureCollections
for all three layers and completes the assessment without weakening the
intersection semantics.

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
| P1 source feature `aree_peric_idraulica_p1.23539` | `37.65957412, 12.58643821` | GetMap returned PNG overlay around the point (`5505` bytes) | `P1`, `P2`, `P3` | `P3` | `available`; all three server-side predicates match |
| P2 source feature `aree_peric_idraulica_p2.25972` | `37.65957412, 12.58643821` | Same visual footprint as P1 because the WFS features are spatially coincident at this point | `P1`, `P2`, `P3` | `P3` | `available`; all three server-side predicates match |
| P3 source feature `aree_peric_idraulica_p3.27546` | `37.63424229, 12.63078187` | GetMap returned PNG overlay around the point (`4160` bytes) | `P1`, `P2`, `P3` | `P3` | `available`; all three server-side predicates match |
| Torino control | `45.28970, 7.94194` | GetMap returned a nearly empty/transparent PNG around the point (`1784` bytes) | none | `null` | `no_intersection`; all three exact point predicates return zero features |

The positive cases confirm that the ISPRA hydraulic datasets can be cumulative or overlapping at the selected points. ARCUS therefore preserves all matched classes and derives the highest observed class instead of assuming that a point sourced from P1, P2 or P3 will return only that class.

WMS remains visual-only. It was used as a visual consistency check through `GetMap`, not as a calculation source. The authoritative analytical path remains WFS candidate retrieval plus ARCUS local point-in-polygon.

## Hydraulic Class Overlap Characterisation

### Method

ARCUS ran a deterministic geometric search against real ISPRA WFS responses:

1. Fetched `120` real features from each configured layer.
2. Read `Polygon` and `MultiPolygon` geometries from the WFS GeoJSON.
3. Sampled internal grid points and selected points away from the nearest polygon boundary.
4. Re-ran each candidate through the ARCUS provider, which independently applies an exact server-side point-intersection predicate to all three layers.
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
| Torino control | `45.28970, 7.94194` | `[]` | `[]` | `null` | `GetMap`, `CRS:84`, BBOX `7.93194,45.279700000000005,7.95194,45.2997`, 512x512 PNG [saved](assets/hydraulic-validation/torino-control.png) | `no_intersection`; all three exact WFS predicates return zero features |

### Interpretation

The ISPRA layers are not globally identical. The validated sample shows nested or partially overlapping behaviour:

- some points intersect only `P1`;
- some points intersect `P1` and `P2`;
- some points intersect `P1`, `P2` and `P3`;
- a complete exact query can return no matching feature for all three classes.

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
    "query_method": "server_side_point_intersection",
    "filter_crs": "EPSG:4326",
    "filter_axis_order": "longitude_latitude"
  },
  "p1": {
    "status": "no_intersection",
    "http_status": 200,
    "feature_count": 0,
    "response_size_bytes": 147,
    "intersects": false
  },
  "p2": {
    "status": "no_intersection",
    "http_status": 200,
    "feature_count": 0,
    "response_size_bytes": 147,
    "intersects": false
  },
  "p3": {
    "status": "no_intersection",
    "http_status": 200,
    "feature_count": 0,
    "response_size_bytes": 147,
    "intersects": false
  }
}
```

The Torino control now completes in about 0.3 seconds per layer during the
2026-07-23 live gate. All responses are valid and empty, so ARCUS can
distinguish a complete `no_intersection` from source incompleteness.

## Intersection semantics

The production analytical sequence is:

```text
WFS exact ECQL point predicate
  -> property-only GeoJSON FeatureCollection
  -> feature_count > 0 means the authoritative predicate matched
  -> matched_classes / highest_class
```

For compatibility and defense in depth, if an endpoint or deterministic test
returns geometry despite `propertyName`, ARCUS still verifies that geometry
locally:

```text
Polygon / MultiPolygon geometry present
  -> local point-in-polygon
  -> holes and boundary points handled explicitly
```

Supported cases:

- `Polygon`;
- `MultiPolygon`;
- inner rings / holes;
- boundary points;
- geometry omitted after the authoritative server filter as an exact match.

The deterministic test suite validates:

- point inside a polygon;
- point outside the polygon but inside the returned FeatureCollection;
- point on polygon boundary;
- point inside a MultiPolygon member;
- point inside an inner ring, correctly treated as no intersection;
- P1, P2 and P3 matched classes;
- `highest_class` selection.

Live positive P1/P2/P3 validation is complete. The current live gate also
confirmed Torino `no_intersection`, HTTP 200 on all three layers and response
payloads below 1 KB per layer.

## Report behavior

When ISPRA is unavailable, ARCUS must still generate the report. The official hydraulic exposure remains separate from the provincial historical context and must be shown as unavailable with its technical status. ARCUS must not convert source unavailability into zero hazard and must not substitute a provincial proxy silently.

## Tests

Run:

```text
npm run test:hazard
npm run test:hazard:hydraulic:live
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
14. deterministic output;
15. bounded retry, per-layer cache recovery and concurrent request deduplication;
16. exact ECQL filter, explicit CRS/axis order and geometry-free response;
17. live P1-only, P1/P2, P1/P2/P3 and Torino signatures;
18. live payload ceiling of 5 KB per layer and three-layer cache hit probe.

## Limits

- Remote ISPRA availability is outside ARCUS control.
- Area, route and batch inventory intersections are not implemented in this milestone.
- No P1/P2/P3 scoring or weighting has been approved yet.
- WMS overlays remain visual-only.

## Reliability hardening v1.1

Implemented on 2026-07-23 after the final Mitigation Intelligence UI acceptance exposed repeatable P1/P2 timeouts for northern test points.

The existing provider `status` remains backward compatible. The hydraulic payload now also exposes:

| Field | Meaning |
|---|---|
| `assessment_complete` | `true` only when all P1/P2/P3 layers returned `available` or `no_intersection` |
| `decision_status: available_complete` | complete assessment with at least one observed intersection |
| `decision_status: available_partial` | at least one observed intersection, with one or more failed layers |
| `decision_status: no_intersection` | all three layers completed and none intersects |
| `decision_status: source_incomplete` | no observed intersection, but at least one layer failed |
| `coverage.successful_layers` | layer-level usable results |
| `coverage.failed_layers` | class, status, HTTP status and error for incomplete layers |

Operational hardening:

- production intersections use the WFS server-side `INTERSECTS` predicate;
- only the scenario attribute is returned, so large polygon geometries are not
  transferred to ARCUS;
- successful P1/P2/P3 layer results are cached independently for six hours;
- a partial aggregate result therefore retains successful layer work for the next request;
- concurrent requests for the same point/layer are deduplicated;
- `request_timeout`, `service_unreachable` and HTTP 502/503/504 receive one bounded retry;
- each layer records attempt count, response byte size, duration, HTTP status and cache provenance;
- aggregate cache bypass also bypasses the per-layer cache;
- no failed or partial layer result is cached as a successful observation.

Live gate result on 2026-07-23:

| Case | Classes | Decision | Largest layer response | Result |
|---|---|---|---:|---|
| `38.94973151, 8.72300141` | P1 | `available_complete` | 692 B | pass |
| `38.94340710, 8.91222919` | P1, P2 | `available_complete` | 694 B | pass |
| `37.67112259, 12.58006927` | P1, P2, P3 | `available_complete` | 696 B | pass |
| `45.28970000, 7.94194000` | none | `no_intersection` | 147 B | pass |

The repeated P1/P2 probe returned three per-layer cache hits. Final live
judgement: `live_hydraulic_ready`.

The same Torino coordinate was then verified in the local Professional Path 01
browser flow. The point-derived province was Torino; the UI displayed
`Status: no_intersection`, `Decision status: no_intersection`,
`Assessment: complete`, P1/P2/P3 all `no_intersection`, no mitigation strategy
and an explicit abstention message. The working package retained the validated
coordinates. No hydraulic API failure was observed. A pre-existing React
duplicate-key warning for the footer entry `About-/about` was unrelated to the
hydraulic flow.

Mitigation Intelligence may emit strategies from an observed class in an incomplete official response, but the result is labelled `available_partial` or `limited_evidence_partial`. If no class is observed and any ISPRA layer failed, ARCUS abstains with `official_hydraulic_exposure_incomplete`; it does not claim `no_intersection`.

Automated coverage is in `scripts/test-hazard-exposure.js`. The canonical non-mocked readiness command is:

```text
npm run test:hazard:hydraulic:live
```

It verifies the documented P1-only, P1/P2, P1/P2/P3 and Torino no-intersection points and fails unless every case is complete. A future local official-data mirror remains the recommended production step; it is not implemented or represented as live ISPRA by this hardening change.

## Data availability hardening v1.2

Hydraulic v1.2 closes the process-restart gap without representing a partial
cache as a national dataset mirror.

Resolution order:

```text
current in-memory layer observation
  -> current persisted point/layer observation
  -> ISPRA live exact point query
  -> stale last-known-good context only
  -> source_incomplete
```

Persistent observations:

- are written only for complete `available` or `no_intersection` layer results;
- are stored atomically under
  `private-data/hazard/hydraulic-observations`;
- use a key containing endpoint, layer and coordinates rounded to five decimal
  places;
- remain decision-usable for six hours;
- remain visible as non-decision `last_known_good` context for at most 30 days;
- are retained for at most 30 days and capped at 5,000 layer observations;
- record `observation_mode`, `observed_at`, `retrieved_at`,
  `freshness_status`, age and cache tier;
- are included automatically in the existing `private-data` backup scope.

An expired observation cannot supply a current matched class, a
`no_intersection` decision or a Mitigation Intelligence strategy. The live
error remains visible and the final decision is `source_incomplete`.

Remote-provider protection:

| Control | Value |
|---|---:|
| Maximum concurrent Hydraulic WFS calls | 6 |
| Retry attempts | 2 total |
| Retry jitter | up to 25% |
| Circuit failure threshold | 3 consecutive technical failures per layer |
| Circuit cooldown | 30 seconds |

The circuit breaker is cleared by a successful response and never converts an
open circuit into a valid exposure observation. A stale observation may still
be shown alongside the failure for operator context.

Operational visibility:

- `/api/admin/ops/status` includes `hydraulic_observation_store`;
- `/api/admin/metrics` includes observation count and latest-observation age;
- the Path 01 UI displays observation mode, freshness, observation timestamp,
  live-provider status and any stale last-known-good layers;
- the Professional report repeats provenance and freshness in the Mitigation
  Intelligence source summary;
- `npm run test:hazard:hydraulic:live` now checks `geom` and `scenariopN`
  through live `DescribeFeatureType` responses before running the point matrix.

Deterministic tests cover process-restart recovery, total outage with a fresh
persistent observation, stale observation abstention, explicit cache bypass,
circuit opening and the remote concurrency limit.

The local browser acceptance repeated the canonical P1/P2 point
`38.94340710, 8.91222919` across an actual backend restart:

| Run | Observation mode | Live provider | Classes | Decision | Result |
|---|---|---|---|---|---|
| Before restart | `live` | `available` | P1, P2 | `available_complete` | pass |
| After restart | `persistent_cache` | `not_queried_cache_hit` | P1, P2 | `available_complete` | pass |

Both runs displayed `Freshness: current`, the original observation timestamp
and a distinct query timestamp. The second run completed without contacting
ISPRA. No browser console warning or error was recorded during this v1.2
acceptance.

### Remaining architectural boundary

The point observation store improves continuity for previously evaluated
locations. It is not a complete local copy of the official P1/P2/P3 datasets
and therefore cannot evaluate a new coordinate during a total ISPRA outage.
A national offline fallback requires an independently acquired, versioned and
checksummed official dataset snapshot, plus a spatial database import and
documented update policy. No fixture, WMS rendering or accumulated point cache
is represented as that mirror.

### Path 01 nearby official context

From 2026-07-30, a complete point result outside the classified P1/P2/P3
polygons no longer leaves an empty Hydraulic card in Path 01. ARCUS runs
bounded WFS `DWITHIN` searches at progressively larger radii and reports the
first official classes found as `nearby_context`, including the search radius.

This context is explicitly non-intersecting:

- `point_intersection=false`;
- `distance_basis=within_search_radius_not_exact_distance`;
- `presentation_status=nearby_official_context`;
- the original point status remains scientifically preserved;
- nearby classes do not activate Mitigation Intelligence, modify the Final
  Priority Index or become a class attributed to the selected point.

For the Torino control point `45.28970000, 7.94194000`, the live validation
returned Hydraulic P1/P2/P3 context within 1 km while preserving the official
point outcome separately.

The Path 01 presentation gives priority to the point outcome. Nearby classes
are shown in a separate contextual callout and radii of 25 km or more are
labelled as wide-area context. Raw provider and decision codes are collapsed
under technical details; the primary view uses human-readable query and
assessment labels. Repeated P1/P2/P3 non-assignment rows are replaced by one
completed-layer-query statement.
