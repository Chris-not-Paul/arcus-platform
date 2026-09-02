# ARCUS Mitigation Knowledge Model

Versioned draft:

```text
config/collapse-intelligence/mitigation-knowledge-base.json
```

Status:

```text
draft
```

## Purpose

The model links:

```text
official hazard
-> documented collapse pattern
-> investigation objective
-> candidate mitigation pathway
```

It does not create automatic design prescriptions.

## Failure Learning Matrix v1

The production-facing intermediate layer is now the versioned Failure Learning
Matrix documented in:

```text
docs/ARCUS_FAILURE_LEARNING_MATRIX_V1.md
```

It keeps cohort selection separate from outcome reading, exposes qualified and
below-threshold processes without conflating them, and converts only qualified
repeatable evidence into non-prescriptive investigation priorities. Geometry
remains post-retrieval descriptive evidence and is not used for selection,
qualification or scoring.

## Levels

### A. Priority Investigations

Examples:

- hydraulic modelling;
- scour and foundation-support assessment;
- slope stability investigation;
- seismic site-response and detailing review;
- documented case review.

For Hydraulic cases, the data plumbing can now receive:

```text
event_id
failure_process
component_involved
evidence_level
```

These inputs are attached only as draft evidence context. They do not approve a mitigation pathway automatically.

For Landslide cases, production strategy generation remains gated by the
readiness contract documented in:

```text
docs/ARCUS_LANDSLIDE_MITIGATION_READINESS.md
```

The current ISPRA PAI signature is territorial context, not a reconstruction
of the class or bridge-landslide interaction at the collapse date. Until the
historical outcomes carry a source-backed landslide taxonomy, the admissible
Mitigation Intelligence result is explicit abstention.

The first versioned curation registry is available at:

```text
config/collapse-intelligence/landslide-outcome-registry.json
```

Only entries marked `learning_eligibility = eligible` may contribute outcome
evidence after independent cohort retrieval. Disputed and review-pending cases
remain visible for audit but contribute zero evidence.

### B. Design Risk-Control Options

These are intentionally left as future expert-reviewed options. ARCUS data alone must not prescribe design solutions.

### C. Monitoring And Operational Considerations

Draft entries include focused inspection after relevant triggering events.

## Required Validation

Before production:

- link each mitigation pathway to literature, standards or guidelines;
- add expert review status;
- connect analogue event IDs only where evidence is strong enough;
- avoid unsupported recommendations.
- keep `external_validation_required = true` unless a human-reviewed engineering basis is documented.

## Caveat

ARCUS can identify recurring documented patterns. Technical measures must be validated through external engineering basis and domain experts.
