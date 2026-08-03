# ARCUS Landslide Mitigation Readiness

Date: 2026-08-03

Scope: Professional Path 01, readiness gate for collapse-learned landslide
Mitigation Intelligence. This gate does not change Hydraulic, Seismic, Path 02
or the Final Priority Index.

## Decision

```text
not_ready_for_collapse_learned_strategies
```

The official ISPRA PAI exposure provider is operational and suitable for
present-day point context. The historical outcome dataset is not yet suitable
for process-specific landslide strategy generation.

This is a controlled abstention, not a missing-data failure. ARCUS must keep
showing the official PAI point result and provenance while withholding claims
that the collapse database cannot currently support.

## Why PAI Alone Is Not Enough

The ReLUIS/CSLLPP landslide manual separates territorial and local
susceptibility from bridge-landslide interaction, vulnerability and exposure.
At Level 3, interaction intensity also depends on severity and movement
velocity. Foundation type, landslide thickness or impact geometry can become
material to the assessment.

Therefore a current PAI class cannot by itself establish:

- that a landslide interacted with the historical bridge at collapse time;
- the movement mechanism or activity state;
- the component affected or interaction type;
- a Level 2 or Level 3 attention class;
- an automatic monitoring interval or design prescription.

`no_intersection` means that ISPRA returned no PAI/AA polygon for the exact
coordinate. It does not prove absence of landslide susceptibility, and nearby
official context must remain visibly separate from the point assignment.

## Production Dataset Audit

The deterministic audit identifies candidates only when `specific_cause` is
`Landslide` or `failure_trigger` explicitly contains `landslide`. Mere mentions
in descriptions are excluded.

| Measure | Observed |
|---|---:|
| Candidate historical outcomes | 7 |
| Primary landslide cause | 6 |
| Landslide-mediated trigger | 1 |
| Complete present-day PAI observations | 7 |
| Present-day PAI intersections | 2 |
| Present-day `no_intersection` | 5 |
| Authenticated PAI class at collapse date | 0 |
| Cases with Official/Technical source | 3 |
| Cases with complete landslide outcome taxonomy | 0 |

The two present-day intersections are one P2 and one P4. They remain current
signatures, not reconstructed historical classes.

## Minimum Outcome Contract

Before an historical case can inform a collapse-learned landslide process, it
must carry an auditable `landslide_intelligence` record with at least:

```text
movement_type
interaction_type
component_involved
activity_state_at_event
evidence_level
```

Further information such as expected velocity, foundation type, landslide
thickness, affected geometry and direct/indirect interaction should be kept
when the sources support it. Unknown values remain unknown; they are never
inferred from current PAI polygons.

Outcome fields must not be used to retrieve analogues. The cohort is selected
from independent project and official hazard features first; documented
outcomes may be aggregated only afterwards.

## Allowed And Blocked Outputs

Allowed now:

- official current PAI point exposure and separately labelled nearby context;
- source-backed curation of historical landslide outcomes;
- explicit abstention from collapse-learned strategies;
- non-prescriptive explanation of which project information is missing.

Blocked now:

- automatic Level 2 or Level 3 attention-class assignment;
- back-casting the present PAI class to the collapse year;
- process-specific or prescriptive landslide mitigation strategies;
- interpreting `no_intersection` as no landslide susceptibility;
- automatic monitoring frequencies without the manual’s required assessment.

## Reproducible Gate

Run:

```text
npm run audit:landslide-readiness
npm run test:landslide-mitigation
```

The audit writes the machine-readable result to the ignored Professional data
area:

```text
private-data/professional/collapse-intelligence/landslide-mitigation-readiness.json
```

The next admissible step is source-by-source curation of the seven candidates,
starting from cases with Official/Technical evidence. Production strategies
remain disabled until the taxonomy and engineering basis pass expert review.
