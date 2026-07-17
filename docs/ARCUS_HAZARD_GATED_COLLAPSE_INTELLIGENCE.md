# ARCUS Hazard-Gated Collapse Intelligence

Date: 2026-07-17

Status: experimental workbench, not production UI.

## Reframed Decision Problem

ARCUS Collapse Intelligence is no longer framed as:

```text
Which collapse cause does the model predict?
```

The new question is:

```text
Given the official site hazard context, which documented collapses are empirically relevant, which failure patterns appear in the analogue cohort and which investigations should be prioritised?
```

The workbench must not produce collapse probabilities, cause predictions, safety classifications, a single risk score or safe/unsafe outputs.

## Architecture

```text
Official hazard signature
  -> hazard router
  -> active / attention / unavailable tracks
  -> track-specific analogue retrieval
  -> documented failure patterns after ranking
  -> investigation and mitigation intelligence
```

Output file:

```text
private-data/professional/collapse-intelligence/hazard-gated-intelligence-analysis.json
```

## Live Enrichment Status

The current safe run did not execute full external live enrichment because sending all private event coordinates to external ISPRA WFS endpoints requires explicit approval.

Current manifest:

| Counter | Value |
| --- | ---: |
| total_events | 253 |
| eligible_events | 253 |
| dry_run_events | 253 |
| hydraulic_completed | 0 |
| landslide_completed | 0 |
| seismic_completed | 0 |
| fully_enriched | 0 |
| partially_enriched | 0 |
| failed | 0 |
| pending | 253 |

The caveat remains:

```text
Current official hazard context at the documented collapse location; not retrospective proof of causation.
```

## Hazard Router

Hydraulic track is active when ISPRA P1, P2 or P3 intersects.

Landslide track is active when ISPRA PAI P1, P2, P3 or P4 intersects.

AA is kept as a separate attention track and does not automatically equal P1-P4.

Seismic is not classified with engineering low/medium/high thresholds. The workbench compares candidate rules only:

- empirical percentile band;
- always-available contextual track;
- project-profile-sensitive activation.

Multi-hazard track activates when at least two active hazard tracks are present.

The router does not use documented primary cause, specific cause, trigger, mechanism, narrative or source content.

Hydraulic Intelligence fields introduced in `hydraulic-v1` are also excluded from routing and retrieval:

```text
hydraulic_trigger
hydraulic_failure_process
hydraulic_component_involved
hydraulic_evidence_level
hydraulic_intelligence
```

They are read only after the analogue cohort is fixed, to summarize documented processes, components, evidence coverage and limitations.

## Support By Track

With current dry-run signatures, all tracks correctly abstain:

| Track | Total support | Effective support | Insufficient evidence |
| --- | ---: | ---: | --- |
| hydraulic | 0 | 0 | true |
| landslide | 0 | 0 | true |
| seismic | 0 | 0 | true |
| multi_hazard | 0 | 0 | true |

## Decision

Decision: `validation incomplete`.

The architecture is ready for live enrichment and expert validation, but no production value claim is allowed until official hazard signatures are live for the historical corpus.
