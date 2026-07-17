# ARCUS Analog Case Matching Method

The workbench compares deterministic, explainable analogue methods. It does not use black-box ML, embeddings, neural networks or generative similarity.

## Leakage Rule

Outcome features are excluded from similarity:

```text
specific_cause
hydraulic_trigger
hydraulic_failure_process
hydraulic_component_involved
hydraulic_evidence_level
hydraulic_intelligence
failure_pattern
collapse_extent
fatalities
injuries
consequences
```

These are analyzed only after analogue selection.

Hydraulic Intelligence is therefore used only in this sequence:

```text
project/site features
-> analogue retrieval and ranking
-> ranked cohort fixed
-> hydraulic_intelligence read as outcome evidence
-> cohort process/component/evidence aggregation
```

The matcher exposes an automatic audit that verifies none of the Hydraulic Intelligence fields is present in the matching feature list.

## Methods Compared

### A. Rule-Based Filter + Rank

Future method: filter by minimum compatible official hazard/project profile and rank with explicit rules.

### B. Weighted Explainable Similarity

Implemented in the workbench for:

- `site_only`;
- `project_informed`.

Every selected analogue includes matched, mismatched and missing features.

### C. Cohort-First

Used to study cohort outcomes by cause family. It is useful for research but would leak target outcome if used as target-case matching.

## Current Demonstrative Result

| Method | Cohort size | Effective count | Evidence strength | Leading pattern |
|---|---:|---:|---|---|
| Site-only explainable similarity | 3 | 2.6 | limited | hydraulic_flood_action_unspecified |
| Project-informed explainable similarity | 8 | 7.2 | moderate | hydraulic_flood_action_unspecified |
| Cohort-first research baseline | 12 | 12 | moderate | hydraulic_unspecified |

Best research behavior today:

```text
project_informed gives the best explainable behavior when preliminary project fields exist.
```

Site-only remains useful but weaker. Cohort-first is useful for aggregate pattern research, not as a no-leakage matcher.

## Geographic Contribution

Geography is limited:

```text
province = 4
region = 6
```

It must not replace engineering similarity.
