# ARCUS Collapse Intelligence Workbench

This workbench is a research and validation layer for ARCUS Professional. It is not connected to the UI, does not expose a public endpoint and does not change production scoring.

## Strategic Purpose

ARCUS should not only aggregate public ISPRA and INGV layers. The intended value is:

1. read official site conditions;
2. compare them with documented ARCUS collapses;
3. identify empirically relevant failure patterns;
4. indicate priority investigations;
5. support risk mitigation strategies;
6. explain conclusions through cases and verifiable sources.

Public data describes territorial hazard. ARCUS Collapse Intelligence studies how analogous contexts have appeared in documented collapse records.

## Production Boundary

Unchanged:

- Final Priority Index;
- 70/30 weights;
- hydraulic, landslide and seismic providers;
- production Historical Collapse Incidence;
- Path 02 ranking;
- report graphics;
- production `normalized_score = null` for official hazard providers;
- Professional UI.

## Main Output

Private workbench output:

```text
private-data/professional/collapse-intelligence/collapse-intelligence-analysis.json
```

Generated supporting resources:

```text
config/collapse-intelligence/failure-pattern-taxonomy.json
config/collapse-intelligence/mitigation-knowledge-base.json
config/geography/province-crosswalk.json
```

## Current Results

| Item | Result |
|---|---:|
| Events analyzed | 253 |
| Sources analyzed | 688 |
| Events with valid coordinates | 253 |
| Enrichable events | 100% |
| Source coverage | 100% |
| AINOP records reconciled exactly | 105 |
| AINOP records unresolved | 13 |

## Workbench Modules

- database audit;
- historical collapse hazard-signature pipeline design;
- failure-pattern taxonomy;
- cause-specific incidence;
- site hazard signature schema;
- analog case matching;
- analog cohort outcome analysis;
- evidence-strength model;
- mitigation knowledge model;
- value-add benchmark;
- retrospective validation;
- territorial reconciliation.

## Caveat

Historical hazard signatures must be described as:

```text
current official hazard context at documented collapse location
```

They are not proof that the current mapped hazard caused the historical collapse.

## Human Decisions Required

- approve failure-pattern taxonomy;
- approve abstention policy;
- decide whether cause-specific incidence enters reports and how it is labelled;
- validate mitigation mapping through literature, standards and experts;
- define accepted retrospective pattern-retrieval performance above simple baselines.
