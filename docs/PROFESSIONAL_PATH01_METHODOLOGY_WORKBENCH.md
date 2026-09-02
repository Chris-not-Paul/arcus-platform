# ARCUS Professional Path 01 - Methodology Workbench

> **SUPERSEDED AUDIT RECORD.** This workbench is retained for traceability only; it is not an active ARCUS method or product specification. See `ARCUS_Product_Definition.md`.

This document records the methodology workbench used to derive the Path 01 v2.1
candidate screening system. The candidate is now visible in ARCUS Professional
under controlled validation; it is not a structural-risk or
collapse-probability formula.

## Decision Question

**Quanto il sito selezionato richiede approfondimenti specialistici e misure di mitigazione prima della progettazione o realizzazione di una nuova infrastruttura di attraversamento?**

Temporary candidate name:

```text
Preliminary Point Screening Priority
```

The candidate output must not be described as:

- structural risk;
- collapse probability;
- safety verification;
- NTC conformity;
- final site suitability.

## Current Controlled-Validation Boundary

The current boundary is:

- `Preliminary Point Screening v2.1` is the primary Path 01 UI/report reading;
- the old `Final Priority Index` 70/30 calculation is preserved only in
  internal legacy audit tooling;
- `buildTerritoryProfiles` is not changed.
- `buildAssetScreening` is not changed.
- `Historical Collapse Incidence` is not changed.
- Official ISPRA/INGV provider outputs keep `normalized_score = null`.
- Path 02 ranking is not changed.

The canonical v2.1 implementation is `src/utils/path01Priority.js`; its contract
is documented in `docs/ARCUS_PATH01_SCREENING_V2.md`.

The workbench output is saved separately in:

```text
private-data/professional/methodology/path01-methodology-analysis.json
```

## Source Inventory

| Source | Current role | Scope | Count |
|---|---:|---:|---:|
| AINOP bridge index | Historical denominator for provincial incidence | Professional | 118 provinces |
| ARCUS documented collapses | Historical evidence numerator | Professional | 253 cases |
| INGV MPS04 grid | Official seismic exposure candidate | Local processed grid | 16,921 nodes |
| ISPRA hydraulic WFS | Official point exposure in shadow mode | Live provider | P1/P2/P3 |
| ISPRA PAI landslide WFS | Official point exposure in shadow mode | Live provider | AA/P1/P2/P3/P4 |

## Canonical Input Schema

The workbench is intentionally independent from the UI state.

```json
{
  "official_hazard_exposure": {
    "hydraulic": {
      "status": "available | no_intersection | partial | provider_exception | ...",
      "matched_classes": ["P1"],
      "highest_class": "P1 | P2 | P3 | null"
    },
    "landslide": {
      "status": "available | no_intersection | partial | provider_exception | ...",
      "matched_hazard_classes": ["P3"],
      "matched_attention_classes": ["AA"],
      "highest_hazard_class": "P1 | P2 | P3 | P4 | null",
      "attention_area": true
    },
    "seismic": {
      "status": "available | outside_coverage | configuration_error | ...",
      "pga_p16_g": 0.12,
      "pga_p50_g": 0.17,
      "pga_p84_g": 0.21,
      "nearest_node_distance_m": 2945
    }
  },
  "historical_evidence": {
    "numerator_count": 9,
    "denominator_count": 224,
    "provincial_rate_per_100": 4.018,
    "relative_to_national": 7.15
  },
  "confidence": {
    "provider_statuses": {},
    "denominator_confidence": "high | medium | low | very_low | unavailable",
    "nearest_node_distance_m": 2945
  },
  "screening_flags": []
}
```

## Separation Of Meanings

### A. Official Hazard Exposure

Official point-level evidence includes:

- ISPRA hydraulic P1/P2/P3;
- ISPRA PAI landslide AA/P1/P2/P3/P4;
- INGV MPS04 PGA p50 in `g`, as a separate reference-grid axis that does not
  determine the ISPRA tier.

These are source observations at the selected project point. They are not currently production scores.

### B. Historical Evidence

Historical Collapse Incidence is based on documented ARCUS collapses divided by an infrastructure denominator at province level.

It is historical evidence, not hazard, not collapse probability and not a point-level site condition.

### C. Data Quality

Data quality includes:

- source availability;
- provider status;
- source freshness;
- spatial resolution;
- nearest MPS04 node distance;
- denominator size class;
- missing data.

Confidence must remain separate from hazard. It must not silently reduce a hazard value.

### D. Screening Flags

The workbench derives flags such as:

- `hydraulic_p3_major_constraint`;
- `landslide_p4_critical_hazard`;
- `landslide_attention_area`;
- `multi_hazard_integrated_study_required`;
- `incomplete_assessment`;
- `source_unavailable_or_incomplete`;
- `historical_denominator_missing`;
- `detailed_study_required`.

## Observed Distributions

### INGV MPS04 PGA p50

| Metric | Value |
|---|---:|
| Count | 16,921 |
| Min | 0 g |
| p5 | 0.0257 g |
| p25 | 0.0527 g |
| Median | 0.0869 g |
| p75 | 0.1551 g |
| p90 | 0.2046 g |
| p95 | 0.2417 g |
| Max | 0.278 g |
| Mean | 0.106265 g |
| Stddev | 0.066869 g |

### Historical Collapse Incidence

| Variable | Count | Median | p90 | p95 | Max |
|---|---:|---:|---:|---:|---:|
| Denominator count | 118 | 246 | 996.8 | 1282.45 | 2595 |
| Numerator count | 118 | 1 | 5 | 6.15 | 40 |
| Provincial rate per 100 | 106 | 0.294 | 3.753 | 18.6425 | 100 |
| Relative to national | 106 | 0.525 | 6.68 | 33.1675 | 177.94 |

Missing AINOP denominator: `12` provinces.

Interpretation: Historical Collapse Incidence is highly skewed. Any direct linear use can over-amplify outliers and small denominators.

## Candidate Aggregation Models Compared

| Model | Description | Main benefit | Main risk |
|---|---|---|---|
| Weighted additive | Transparent weighted blend of normalized components | Easy to explain and tune | Can compensate severe hazard with low values elsewhere |
| Max-dominant | Uses the maximum official hazard component | Keeps severe point hazard visible | Can ignore historical context and multi-source nuance |
| Rule-based tier + modifier | Uses non-compensatory triggers, then modifiers | Best for professional screening language | Requires explicit expert approval of rules |

## Non-Compensatory Rules Tested

The workbench tests experimental alternatives alongside the canonical v2.1
contract:

- landslide `P4` forces specialist review;
- hydraulic `P3` forces major constraint review;
- multi-hazard severe combinations require integrated study without an
  automatic tier increase;
- unavailable/partial sources create an incomplete assessment flag;
- AA attention area remains separate from P1-P4;
- historical outliers do not become official hazard.

## Synthetic Scenario Matrix Summary

The workbench generated `32` deterministic scenarios. Key examples:

| ID | Scenario | Weighted additive | Max-dominant | Rule-based tier | Paradox / note |
|---|---|---:|---:|---|---|
| S05 | Hydraulic P1/P2/P3 overlap | 39.66 | 100 | major_constraint_review | P3 needs non-compensatory handling |
| S10 | Landslide P4 | 37.39 | 100 | critical_specialist_review | Additive model can make P4 look moderate |
| S14 | High PGA only | 35.14 | 85.04 | ordinary_screening | Rank is sensitive to seismic weighting |
| S21 | All official components elevated | 93.35 | 100 | critical_specialist_review | Stable top scenario |
| S22 | Historical outlier, no official intersections | 22.02 | 20.05 | ordinary_screening | Historical evidence must not become hazard |
| S24 | Missing denominator with moderate hazards | 48.54 | 55 | ordinary_screening | Missing denominator is a confidence gap |
| S28 | All providers unavailable | 50.94 | 0 | incomplete_assessment | Unavailable sources must not be zero hazard |
| S32 | P4 with zero historical incidence | 37.39 | 100 | critical_specialist_review | Zero HCI cannot neutralize P4 |

## Sensitivity And Rank Stability

Five experimental weighting configurations were compared:

- hazard balanced;
- hydraulic sensitive;
- landslide sensitive;
- seismic sensitive;
- historical sensitive.

Maximum rank delta: `12`.

Unstable scenarios:

```text
S04, S05, S14, S15, S16, S17, S19
```

Interpretation: scenarios with P2/P3 hydraulic exposure or high PGA move materially when weights change. This supports a rule/tier design for severe official hazard rather than relying only on additive weights.

## Paradoxical Behaviors Identified

- P4 landslide can appear moderate in weighted additive models.
- P3 hydraulic can be diluted if the other components are low.
- Historical outliers can outrank no-intersection official hazard cases if historical evidence is treated as hazard.
- Provider unavailable can produce misleading scores if converted to zero.
- Small denominators can inflate Historical Collapse Incidence.
- Nearest-node distance affects confidence, not physical PGA.

## Human Approvals Required

Before any production scoring change, ARCUS needs explicit approval for:

- selected normalization family per source;
- non-compensatory rules;
- treatment of unavailable/partial providers;
- whether HCI is only a modifier or a separate evidence band;
- confidence vocabulary in report language;
- validation acceptance criteria with domain experts.
