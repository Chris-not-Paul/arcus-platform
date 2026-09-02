# ARCUS Professional Path 01 - Variable Dependency Map

> **SUPERSEDED AUDIT RECORD.** This dependency map does not describe the active Collapse Intelligence product. See `ARCUS_Product_Definition.md`.

This document maps variable dependencies for a future Path 01 methodology workbench. It is designed to prevent double counting and semantic overlap.

## Top-Level Groups

```text
Official Hazard Exposure
Historical Evidence
Data Quality / Confidence
Screening Flags
```

These groups must remain conceptually separate.

## Dependency Map

### Official Hazard Exposure

| Variable | Source | Unit / class | Current role | Scoring status |
|---|---|---|---|---|
| Hydraulic matched classes | ISPRA WFS P1/P2/P3 | P1, P2, P3 | Official point exposure | Shadow mode |
| Hydraulic highest class | Derived from matched classes | P1, P2, P3, null | Constraint indicator | Shadow mode |
| Landslide matched hazard classes | ISPRA PAI WFS | P1, P2, P3, P4 | Official point exposure | Shadow mode |
| Landslide attention area | ISPRA PAI WFS | AA true/false | Attention flag | Shadow mode |
| Landslide highest class | Derived from P1-P4 | P1-P4, null | Constraint indicator | Shadow mode |
| Seismic PGA p50 | INGV MPS04 local grid | g | Official point exposure | Shadow mode |
| Seismic p16/p84 | INGV MPS04 local grid | g | Uncertainty context | Shadow mode |

Dependencies:

```text
ISPRA/INGV source -> provider -> normalizer -> Official Geospatial Exposure block
```

Avoid double counting:

- do not combine hydraulic P3 and historical hydraulic collapses as if independent hazard measurements without review;
- do not treat MPS04 PGA and seismic collapse history as the same kind of evidence;
- do not treat AA as ordered landslide hazard.

### Historical Evidence

| Variable | Source | Unit | Current role | Scoring status |
|---|---|---|---|---|
| numerator_count | ARCUS Professional documented events | count | Historical evidence | Current HCI input |
| denominator_count | AINOP-derived bridge denominator | count | Exposure denominator | Current HCI input |
| provincial_rate_per_100 | numerator / denominator * 100 | cases per 100 bridges | Historical Collapse Incidence | Current HCI input |
| relative_to_national | provincial rate / national rate | multiplier | Benchmark | Current HCI input |

Dependencies:

```text
ARCUS events + denominator -> Historical Collapse Incidence
```

Avoid double counting:

- HCI is not official hazard exposure;
- HCI is not collapse probability;
- HCI is province-level, not point-level;
- HCI should not be merged with `buildTerritoryProfiles.riskScore` without explicit review because both derive from ARCUS event history.

### Data Quality / Confidence

| Variable | Source | Meaning | Must affect |
|---|---|---|---|
| provider status | ISPRA/INGV provider result | Source availability | Confidence / incomplete flag |
| queried_at | provider | Freshness trace | Audit trail |
| source version | provider/manifest | Dataset identity | Audit trail |
| nearest_node_distance_m | INGV grid sampling | Spatial sampling confidence | Confidence only |
| denominator_confidence | AINOP index | Denominator reliability | Confidence only |
| missing denominator | AINOP index | HCI unavailable | Data-quality flag |

Dependencies:

```text
Provider result / manifest / denominator metadata -> Confidence
```

Avoid double counting:

- confidence must not silently reduce hazard;
- confidence must not create reassuring scores when sources fail;
- missing data must be explicit.

### Screening Flags

| Flag | Trigger | Meaning |
|---|---|---|
| `hydraulic_p3_major_constraint` | hydraulic highest class P3 | Major hydraulic constraint |
| `landslide_p4_critical_hazard` | landslide highest class P4 | Critical landslide hazard |
| `landslide_attention_area` | AA intersects point | Attention area separate from P1-P4 |
| `multi_hazard_integrated_study_required` | two or more severe signals | Integrated review required; no tier increase |
| `incomplete_assessment` | partial source | Output incomplete |
| `source_unavailable_or_incomplete` | provider unavailable/partial/outside coverage | Do not score as zero |
| `historical_denominator_missing` | denominator null | HCI unavailable |
| `detailed_study_required` | governing ISPRA level 3 or 4 | Specialist review language |

Dependencies:

```text
Official exposure + data availability -> flags
```

## Current Production Dependencies To Avoid Reusing Blindly

### `buildTerritoryProfiles`

Current variables:

- recurrence;
- total collapse share;
- triggered-event share;
- human impact;
- evidence strength;
- `riskScore`.

Dependency source:

```text
ARCUS event history + sources
```

Risk: double counting with HCI because both use ARCUS event history.

### `hazard-exposure-preview`

Current variables:

- province-level hazard proxy;
- dominant hazard;
- score by cause group.

Dependency source:

```text
ARCUS cause counts + territory profile score
```

Risk: it is not an official ISPRA/INGV overlay and should not be mixed with official exposure without labeling it as proxy.

### `buildAssetScreening`

Current variables:

- profile score;
- hazard preview score;
- proximity to ARCUS events;
- vulnerability matches;
- age and use heuristics.

Dependency source:

```text
asset inventory + ARCUS events + hazard-exposure-preview
```

Risk: Path 02 ranking is asset-level and should not be changed by Path 01 methodology work unless explicitly scoped.

## Flow Diagram

```text
ISPRA hydraulic WFS
  -> provider point-in-polygon
  -> hydraulic highest class
  -> official hazard exposure
  -> non-compensatory flags

ISPRA PAI landslide WFS
  -> provider point-in-polygon
  -> P1-P4 + AA
  -> official hazard exposure + attention area
  -> non-compensatory flags

INGV MPS04 grid
  -> nearest-node sampling
  -> PGA p50 in g
  -> optional empirical normalization workbench
  -> confidence keeps nearest-node distance separate

ARCUS Professional events + AINOP denominator
  -> Historical Collapse Incidence
  -> historical evidence modifier or separate band
  -> never official hazard

Provider status + source version + denominator confidence
  -> confidence / audit trail
  -> never silent hazard reduction
```

## Recommended Governance Rule

Before a variable enters a final score, it should be tagged as one of:

```text
official_hazard
historical_evidence
confidence
screening_flag
context_only
```

A variable should not belong to more than one scoring family without explicit methodology approval.
