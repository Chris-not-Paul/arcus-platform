# ARCUS Hydraulic Intelligence MVP

Date: 2026-07-17

Status: candidate module. Official hazard enrichment remains separate from historical outcome features.

## Purpose

Hydraulic is the first candidate track because ARCUS contains 202 documented hydraulic-family cases. The MVP does not predict hydraulic collapse. It retrieves documented analogues inside a hydraulic hazard-gated path and reports failure patterns, components, evidence coverage and investigation priorities.

The source workbook now provides curated Hydraulic Intelligence outcome fields:

```text
hydraulic_trigger
hydraulic_failure_process
hydraulic_component_involved
hydraulic_evidence_level
```

They are available in Professional as `hydraulic_intelligence` and are excluded from retrieval.

## Documented Hydraulic Mechanism Support

Current mechanism extraction is conservative and does not infer missing mechanisms.

| Mechanism | Count |
| --- | ---: |
| scour | 4 |
| foundation_undermining | 0 |
| pier_instability | 3 |
| abutment_instability | 1 |
| overtopping | 0 |
| debris_obstruction | 2 |
| channel_migration | 0 |
| approach_embankment_erosion | 1 |
| flood_impact | 170 |
| unspecified_hydraulic_mechanism | 21 |

The current structured audit from `MASTER_RESEARCH.xlsx` finds:

| Structured evidence | Count |
|---|---:|
| hydraulic events | 202 |
| specific process available | 29 |
| documented evidence | 9 |
| probable evidence | 18 |
| unspecified evidence | 175 |
| specific component available | 0 |

## Compared Retrieval Modes

- hazard class only;
- project profile only;
- hazard + project profile;
- hazard + project profile + limited territorial context;
- geography only;
- random hydraulic cohort.

Baselines:

- random within hydraulic family;
- most frequent hydraulic mechanism/pattern;
- nearest geographical cases;
- same material only;
- same typology only.

## Current Result

Because the historical corpus is still dry-run for official hazard signatures, the hazard-gated hydraulic retrieval has:

| Metric | Value |
| --- | ---: |
| evaluated cases | 0 |
| abstention rate | 1 |
| failure-pattern hit@3 | null |
| component hit@3 | null |

Outcome: `no_demonstrated_value_over_baseline`.

This is the correct conservative result. The module should become a candidate for expert validation only after live hydraulic signatures activate a sufficient cohort.

## Output Boundary

The MVP may report:

- analogue cases;
- documented mechanisms;
- components involved;
- share within documented analogue cohort;
- evidence strength;
- evidence documentation coverage;
- investigation priorities.

It must not report probability of a failure pattern or site safety.
