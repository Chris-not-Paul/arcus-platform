# ARCUS Professional - ISPRA PAI Landslide Source Discovery

Date: 2026-07-14

Scope: Professional Path 01, official point-level landslide exposure, shadow mode. This document records the source discovery and freshness gate for the landslide vertical slice. It does not define scoring weights and does not change the Final Priority Index.

## Source Decision

ARCUS must not use the IdroGEO `frane` layer as the analytical source for official landslide hazard exposure. That layer is the IFFI landslide inventory context and does not expose the PAI hazard classes required by Path 01.

The analytical source selected for this milestone is:

| Item | Value |
|------|-------|
| Provider | ISPRA / IdroGEO |
| Analytical service | `https://idrogeo.isprambiente.it/geoserver/idrogeo/ows` |
| Visual service | `https://idrogeo.isprambiente.it/geoserver/idrogeo/wms` |
| WFS layer | `idrogeo:pericolosita_frane` |
| WMS layer | `idrogeo:pericolosita_frane` |
| Source name | Mosaicatura della pericolosita da frana PAI |
| Dataset version | `5.0` |
| Reference year | `2024` |
| Geometry | MultiPolygon |
| CRS requested by ARCUS | `EPSG:4326` |
| BBOX order used by ARCUS | `west,south,east,north,EPSG:4326` |
| Class attribute | `cod_per_it` |
| Provider version | `ispra-landslide-pai-wfs-v1` |
| Analysis mode | `point_intersection` |
| Score mode | Shadow mode, `normalized_score = null` |

## Official Class Mapping

The GeoServer style and IdroGEO portal metadata expose the following `cod_per_it` mapping:

| `cod_per_it` | ARCUS class | Meaning |
|--------------|-------------|---------|
| `0` | `AA` | Aree di Attenzione |
| `1` | `P1` | Pericolosita moderata |
| `2` | `P2` | Pericolosita media |
| `3` | `P3` | Pericolosita elevata |
| `4` | `P4` | Pericolosita molto elevata |

ARCUS stores `AA` separately from the ordered hazard classes. The ordered hazard severity for this milestone is:

```text
P1 < P2 < P3 < P4
```

`AA` is reported as an attention area and does not become the highest ordered hazard class.

## Freshness Gate

The IdroGEO portal metadata identifies the PAI landslide layer as national ISPRA mosaic version 5.0, reference year 2024. The source is therefore accepted for this milestone as the current official source used by ARCUS for Path 01 landslide point exposure.

ARCUS records:

```json
{
  "source_dataset_version": "5.0",
  "source_reference_year": 2024,
  "source_matches_latest_official_release": true
}
```

## WFS vs WMS

WFS is the analytical source:

```text
project point
-> WFS candidate retrieval
-> ARCUS local point-in-polygon
-> matched PAI classes
-> highest ordered class
-> normalized_score null
```

WMS is visual control only:

```text
project point / map viewport
-> WMS tile
-> user visual reference
-> no scoring
```

The WMS tile color or opacity is never parsed by ARCUS and never contributes to any score.

## Known Limits

- The service is remote; availability and response time can affect live evaluation.
- The requested WFS geometry is used only around the selected point BBOX.
- Some source geometries are small or generalized in visual tiles; WMS appearance can differ from WFS point intersection.
- This milestone does not assign `normalized_score`.
- This milestone does not alter `buildTerritoryProfiles`, `buildAssetScreening`, Historical Collapse Incidence, AINOP bridge index, Final Priority Index or the 70/30 scoring weights.
