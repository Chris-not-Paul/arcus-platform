# ARCUS Professional - ISPRA PAI Landslide Exposure Validation

Date: 2026-07-23

Scope: Professional Path 01 official landslide exposure, live ISPRA WFS validation. The provider is implemented in shadow mode and does not assign a normalized score.

## Provider Chain

```text
Validated project point
-> ISPRA IdroGEO WFS `idrogeo:pericolosita_frane`
-> exact ECQL `INTERSECTS(geom, SRID=4326;POINT(lon lat))`
-> property-only GeoJSON response (`cod_per_it`, polygons omitted)
-> read `cod_per_it`
-> normalize classes AA/P1/P2/P3/P4
-> preserve matched classes
-> derive highest ordered class P1-P4
-> expose result in Path 01 UI/report/export metadata
```

The provider version is `ispra-landslide-pai-wfs-v2`.

Before the canonical points are accepted, the live gate probes
`DescribeFeatureType` and requires both `geom` and `cod_per_it`. The provider
does not fall back to interpreting a source error as no intersection.

## Live Validation Matrix

The following points were selected deterministically from real WFS geometries and then accepted only after the ARCUS provider confirmed the result end-to-end. They are not random coordinates.

| Case | Coordinates | WMS | WFS matched classes | Highest class | Result |
|------|-------------|-----|---------------------|---------------|--------|
| AA attention area | `36.82837857, 14.72710000` | [PNG](assets/landslide-validation/aa.png) | `AA` attention area | `null` | `available`; attention area kept separate |
| P1 moderate hazard | `43.50846429, 10.33828571` | [PNG](assets/landslide-validation/p1.png) | `P1` | `P1` | `available` |
| P2 medium hazard | `44.40296071, 9.53897143` | [PNG](assets/landslide-validation/p2.png) | `P2` | `P2` | `available` |
| P3 high hazard | `38.92257500, 8.78543214` | [PNG](assets/landslide-validation/p3.png) | `P3` | `P3` | `available` |
| P4 very high hazard | `40.10005714, 16.00375000` | [PNG](assets/landslide-validation/p4.png) | `P4` | `P4` | `available` |
| Torino no-intersection control | `45.28970000, 7.94194000` | [PNG](assets/landslide-validation/torino-control.png) | none | `null` | `no_intersection` |

The raw live output is saved in:

```text
docs/assets/landslide-validation/live-results.json
```

## Live Output Summary

| Case | Status | Decision | Feature count | Response | Duration | Attention classes | Hazard classes |
|------|--------|----------|---------------|----------|----------|-------------------|----------------|
| AA | `available` | `available_complete` | `1` | `308 B` | `1509 ms` | `AA` | none |
| P1 | `available` | `available_complete` | `1` | `309 B` | `1479 ms` | none | `P1` |
| P2 | `available` | `available_complete` | `1` | `306 B` | `1462 ms` | none | `P2` |
| P3 | `available` | `available_complete` | `1` | `307 B` | `1458 ms` | none | `P3` |
| P4 | `available` | `available_complete` | `1` | `308 B` | `1385 ms` | none | `P4` |
| Torino | `no_intersection` | `no_intersection` | `0` | `147 B` | `1418 ms` | none | none |

Timings are the observations recorded by the live gate on 2026-07-23 and are
not an SLA. All responses were below the 16 KiB guard.

## Reliability And Completeness Contract

Landslide v2 aligns the point provider with the reliability controls already
validated for Hydraulic:

- six-hour in-memory cache and in-flight request deduplication;
- six-hour persistent current-observation cache, surviving backend restarts;
- last-known-good context retained for up to 30 days;
- stale observations never become a current hazard decision;
- two bounded attempts with jitter for retryable transport/502/503/504 errors;
- six-request remote concurrency bulkhead;
- per-layer circuit breaker after three consecutive technical failures, with
  a 30-second cooldown;
- explicit `assessment_complete`, `decision_status` and `coverage`;
- source provenance through `observation_mode`, `freshness_status`,
  `observed_at`, `live_provider_status`, retry and circuit metadata.

Only `available` and `no_intersection` are complete observations. A timeout,
provider error, schema mismatch or open circuit returns
`assessment_complete=false`, `decision_status=source_incomplete`, zero
decision classes and, when present, a separately labelled stale
`last_known_good` reference. This prevents missing data from being represented
as absence of PAI hazard.

Persistent observations are stored by default under
`private-data/hazard/landslide-observations`; deployments can override this
with `ARCUS_LANDSLIDE_OBSERVATION_DIR`. The operational status and metrics
endpoints expose reachability, observation count and latest-observation age.

## WMS/WFS Comparison

WMS was queried only as a visual control around the validation coordinates. ARCUS does not classify hazard from rendered pixels.

Observed behavior:

- WFS and WMS are consistent enough for visual review at the selected points.
- WFS remains the analytical source of truth.
- WMS can show generalized or scale-dependent rendering and must not be used for point classification.
- Overlap must be handled by preserving all matched classes and deriving the highest ordered class.

## UI And Report Check

Manual UI verification path:

1. Open ARCUS Professional.
2. Select Path 01 / New territory.
3. Define project location with one of the positive coordinates above.
4. Run `Check point`.
5. Confirm that `Project location`, derived province, `Official geospatial exposure`, matched classes, highest class, `queried_at`, Provincial Historical Context and report preview remain synchronized.

The point result displays completeness and observation provenance. The report
preview carries the decision status, current/stale provenance and the explicit
statement that the Landslide observation remains in shadow mode and does not
modify the Final Priority Index.

### Manual browser acceptance - 2026-07-23

| Case | Derived province | ISPRA result | Provenance | UI/report result |
|------|------------------|--------------|------------|------------------|
| P4 `40.10005714, 16.00375000` | Potenza | `available`, `available_complete`, P4, complete | `live`, `current` | UI coherent; report template includes status, class, provenance and shadow-mode role |
| Control `45.28970000, 7.94194000` | Torino | `no_intersection`, complete, zero PAI classes | `live`, `current` | UI coherent; no-intersection remains distinct from source unavailability |

The browser showed no console errors after the acceptance run. A pre-existing
duplicate React key in the shared footer (`Identity` and `Contact` both target
`/about`) was observed during the first run and fixed minimally by including
the link label in the key. No failed ARCUS API request was surfaced; both live
point checks completed and populated all three hazard cards.

## Validation Command

```text
npm run test:hazard:landslide:live
```

Validated on 2026-07-23 against the live ISPRA IdroGEO WFS service.

Residual limitation: the persistent point store is not a national mirror of
the ISPRA PAI dataset. During a total upstream outage, a previously unseen
point remains `source_incomplete`.

### Path 01 nearby official context

From 2026-07-30, when a complete point query falls outside PAI/AA polygons,
Path 01 performs bounded WFS `DWITHIN` searches and reports the first nearby
official PAI context with its search radius. The original point result is not
rewritten: the nearby class is contextual evidence and is never attributed to
the coordinate.

The response records `point_intersection=false`,
`distance_basis=within_search_radius_not_exact_distance` and
`presentation_status=nearby_official_context`. Nearby classes remain in shadow
mode and do not modify Mitigation Intelligence or the Final Priority Index.

For the Torino control point `45.28970000, 7.94194000`, the live validation
returned nearby P4 context within 5 km while preserving the official point
outcome separately.

The Path 01 presentation now separates the point outcome from territorial
context. A radius of 25 km or more is labelled as wide-area context, while
closer results are labelled nearby. Raw provider status and analysis mode are
kept under collapsed technical details and the primary view explicitly states
that the contextual PAI class is not assigned to the selected point.
