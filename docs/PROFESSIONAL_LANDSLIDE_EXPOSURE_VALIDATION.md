# ARCUS Professional - ISPRA PAI Landslide Exposure Validation

Date: 2026-07-14

Scope: Professional Path 01 official landslide exposure, live ISPRA WFS validation. The provider is implemented in shadow mode and does not assign a normalized score.

## Provider Chain

```text
Validated project point
-> ISPRA IdroGEO WFS `idrogeo:pericolosita_frane`
-> GeoJSON candidate features
-> ARCUS local point-in-polygon
-> read `cod_per_it`
-> normalize classes AA/P1/P2/P3/P4
-> preserve matched classes
-> derive highest ordered class P1-P4
-> expose result in Path 01 UI/report/export metadata
```

The provider version is `ispra-landslide-pai-wfs-v1`.

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

| Case | Status | Feature count | Intersects | Attention classes | Hazard classes | Normalized score |
|------|--------|---------------|------------|-------------------|----------------|------------------|
| AA | `available` | `1` | `true` | `AA` | none | `null` |
| P1 | `available` | `2` | `true` | none | `P1` | `null` |
| P2 | `available` | `5` | `true` | none | `P2` | `null` |
| P3 | `available` | `5` | `true` | none | `P3` | `null` |
| P4 | `available` | `1` | `true` | none | `P4` | `null` |
| Torino | `no_intersection` | `0` | `false` | none | none | `null` |

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

The point result must be displayed as official ISPRA PAI landslide exposure and must not be merged into the current ARCUS final score.

## Validation Command

```text
npm run test:hazard:landslide:live
```

Validated on 2026-07-14 against the live ISPRA IdroGEO WFS service.
