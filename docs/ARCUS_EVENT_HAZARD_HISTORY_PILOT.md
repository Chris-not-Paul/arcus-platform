# ARCUS event hazard-history catalogue

## Decision

The historical ISPRA comparison pipeline is technically viable and reproducible. The public Atlas exposes the **raw class chronology at the same documented coordinate** for all 250 events with an exact location in the current 261-event catalogue. The 11 events with an approximate coordinate are intentionally excluded from point classification.

The catalogue supplies observations rather than an automatic engineering conclusion. The original 17-event regression subset still shows why that separation is useful:

- the four hydraulic cases that appear to become mapped between 2017 and 2020 are all boundary-sensitive under the conservative 50 m ARCUS review threshold;
- the only landslide case with a release before the event and a release after it (IT19.11.01) is also boundary-sensitive;
- the 2024 landslide point results do not currently include distance from the nearest polygon boundary;
- a difference between two official mosaics documents a cartographic comparison, not a physical change in hazard and not an effect caused by the collapse.

The current official ISPRA/INGV territorial context remains available in the Atlas. A separate `Classes over time` view reports release year, complete class membership, highest class, and temporal relation to the event without publishing the derived transition interpretation. The full comparison and review status remain in the private Research dataset.

## Purpose and interpretation limits

The catalogue asks a narrow question: **what official hazard classes intersect the documented event coordinate in different dated ISPRA mosaics?**

It does not estimate collapse probability, reconstruct historical site conditions, assign a normalized score, or infer causation. In particular:

- `no_intersection` means only that the coordinate does not intersect a polygon in that release;
- a mapped-class change can derive from plan updates, improved mapping, geometry changes, classification changes, or a real territorial change;
- a bridge collapse must not be described as the cause of reclassification without an explicit official planning or technical source;
- classes are compared as complete memberships (`P1/P2/P3` for hydraulic hazard and `AA/P1/P2/P3/P4` for landslide hazard), not only as a single highest class.

## Official inputs

| Release | Reference period | CRS used | License | Archive bytes | SHA-256 |
|---|---:|---|---|---:|---|
| ISPRA hydraulic v4 | Dec 2017 | WGS 84 / UTM 32N | CC BY-SA 4.0 | 447,283,981 | `0a095218c9c300cbcbee32e9074db80379104d6ce1ddcfd094651560c4d73bf3` |
| ISPRA hydraulic v5 | 2020 | ETRS89 / LAEA Europe | CC BY-SA 4.0 | 753,540,488 | `341bd743093e5e409cea561ca372cf1e06616c03d26571aa311be70c1eca714c` |
| ISPRA landslide v3 | Dec 2017 | WGS 84 / UTM 32N | CC BY-SA 4.0 | 801,836,818 | `b3c920bc769b9dfe3e80d9bbb0c745eeda8ba7f4ad30cd283b706910776c4e69` |
| ISPRA landslide v4 | 2020–2021 | WGS 84 / UTM 32N | CC BY-SA 4.0 | 1,169,100,031 | `e4419abc6a96e0f1c8ad315855a2d2a8008c5f92b485511ca0e96e9226513107` |

Download URLs, release metadata, layer names, projections, regression IDs, licenses, and archive fingerprints are versioned in `config/event-hazard-history-pilot.json`. The archives and their extracted shapefiles remain outside the repository.

The current landslide observation is appended from ARCUS's release-bound ISPRA WFS point result and is explicitly marked as lacking boundary-distance information.

## Method

1. Use only events whose Open release marks the coordinate as exact.
2. Reproject the WGS84 point into the native CRS of each official release.
3. Query polygon membership directly from the release shapefiles.
4. Preserve every class intersecting the point and separately derive the highest class.
5. Compute the minimum point-to-boundary distance for the archived geometries.
6. Mark any intersection or non-intersection within 50 m of a boundary as requiring manual GIS review. This is an ARCUS screening tolerance, not a claim about ISPRA positional accuracy.
7. Describe release timing as `before_event`, `after_event`, or `same_or_overlapping_reference_period` using only the documented reference period.
8. Store the complete comparison in `private-data/research/event-hazard-history-pilot.json` and publish only the observation timeline in `public/data/event-context/hazard-history/index.json`.

The custom shapefile reader is independently tested with a synthetic polygon containing an exterior ring and a hole, including inside, outside, near-boundary, and exact-boundary points.

## Current-context summary

The current ISPRA cards include a compact `Map evolution` indicator so users do not need to compare repeated release cards manually. It compares the latest official observation strictly before the collapse with the configured current release: hydraulic 2020 v5 or landslide 2024 v5.

The indicator has three neutral states:

- `Classes changed`: complete class membership differs between the pre-event baseline and current release;
- `Classes unchanged`: complete membership is identical;
- `Not comparable`: no pre-event release, no post-event current release, or the current observation is unavailable.

It never describes the difference as an increase or decrease in risk and does not attribute it to the collapse. The UI always shows the two reference periods and raw memberships used by the comparison. In the current catalogue, the hydraulic summaries contain 4 changed, 12 unchanged, and 234 not-comparable records; the landslide summaries contain 5 changed, 71 unchanged, and 174 not-comparable records.

## Regression subset results

### Hydraulic — 2017 to 2020

All ten event dates lie between the two releases.

| Event | 2017 | 2020 | Observed comparison | Robustness decision |
|---|---|---|---|---|
| IT18.02.01 | P1/P2/P3 | P1/P2/P3 | unchanged membership | manual review; 40.15/40.22 m from boundary |
| IT18.02.02 | none | none | unchanged no-intersection | robust at 50 m; no directional claim |
| IT18.10.01 | P1/P2/P3 | P1/P2/P3 | unchanged membership | interior in both releases |
| IT18.10.02 | P1 | P1 | unchanged membership | manual review; 2.31/5.28 m |
| IT18.10.03 | none | P1/P2 | newly mapped at point | manual review; 2020 distance 46.50 m |
| IT18.10.04 | none | P1/P2 | newly mapped at point | manual review; 2020 distance 23.96 m |
| IT18.10.05 | none | P1/P2/P3 | newly mapped at point | manual review; 2020 distance 24.38 m |
| IT18.10.06 | P1/P2/P3 | P1/P2/P3 | unchanged membership | interior in both releases |
| IT18.10.07 | none | P1/P2 | newly mapped at point | manual review; 26.59/26.16 m |
| IT19.10.01 | P1/P2/P3 | P1/P2/P3 | unchanged membership | manual review; 12.03/12.01 m |

Summary: 5 unchanged memberships, 1 unchanged no-intersection, and 4 newly mapped-at-point comparisons. Seven of ten comparisons require manual GIS review; all four directional differences are in that group.

As an implementation cross-check, 2020 archive memberships match the independently stored current WFS memberships for all ten events (10/10). This supports the parser and projection implementation; it does not independently validate the 2017 dataset or convert the comparison into a causal result.

### Landslide — 2017, 2020–2021, and current 2024 point result

| Event | Release sequence | Temporal usefulness | Robustness decision |
|---|---|---|---|
| IT13.02.01 | none → none → none | all releases after event | no historical pre-event baseline; current boundary distance unavailable |
| IT13.12.03 | none → none → none | all releases after event | no historical pre-event baseline; current boundary distance unavailable |
| IT15.04.01 | P2 → none → P2 | all releases after event | both archived states within about 30 m; manual review |
| IT16.11.04 | none → none → none | all releases after event | no historical pre-event baseline; current boundary distance unavailable |
| IT19.11.01 | P1 → none → P4 | 2017 before; later releases after | only true pre/post sequence, but about 3.45 m from archived boundary; manual review |
| IT20.04.02 | none → none → none | 2017 before; 2020–2021 overlaps event period | no directional change; current boundary distance unavailable |
| IT24.05.01 | none → none → none | first two before; 2024 overlaps event year | no directional change; current boundary distance unavailable |

Summary: ten unchanged no-intersection transitions, two no-longer-mapped transitions, and two newly-mapped transitions. Four transitions require manual GIS review and five involving the current result have incomplete boundary robustness. No directional landslide comparison passes the publication gate.

## Publication gates

Raw observations can be shown when the coordinate, official release, reference period, source, and complete class membership remain visible. A release is labelled pre- or post-collapse only from its documented temporal relation to the event; a release after the collapse is never presented as a pre-collapse reconstruction.

A directional or interpreted historical comparison requires the additional gates below:

1. the event coordinate is exact and documented;
2. both compared releases are official, dated, and geometrically queryable;
3. the temporal relation is useful for the stated comparison;
4. a directional difference is not boundary-sensitive after manual GIS review;
5. class semantics are comparable between releases;
6. wording remains cartographic and non-causal unless an explicit source supports a stronger interpretation;
7. source, version, license, raw memberships, boundary distance, and limitations remain visible.

Analytics aggregation requires a declared denominator. The 250 exact-location records cover the current ARCUS collapse-event catalogue, not the Italian bridge population; any future aggregation must be labelled accordingly and must not be presented as bridge-population prevalence.

## Reproduction and validation

```text
npm run build:event-hazard-history
npm run test:point-shapefile-query
npm run test:event-hazard-history
```

The build runs release queries in parallel and writes the private output only after every release completes. The test verifies schema constraints, absence of risk/normalized scores, archive provenance fields, temporal labels, transition review states, and the 10/10 hydraulic archive/WFS agreement.

## Next evidence step

Before any directional change label or Analytics aggregation is enabled:

- manually inspect the boundary-sensitive cases in desktop GIS with the native geometries and coordinate marker;
- calculate boundary distance from the 2024 landslide geometry rather than relying only on a WFS point response;
- resolve or improve the 11 approximate event coordinates before assigning point classes;
- incorporate future official ISPRA releases without overwriting earlier observations;
- record any release-to-release semantic differences from official metadata;
- re-run the publication gates and expose only cases that pass, leaving the others as explicit abstentions.
