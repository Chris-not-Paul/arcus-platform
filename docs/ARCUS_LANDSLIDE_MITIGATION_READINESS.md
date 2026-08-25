# ARCUS Landslide Mitigation Readiness

Date: 2026-08-24

Scope: Professional Path 01, readiness gate for collapse-learned landslide
Mitigation Intelligence. This gate does not change Hydraulic, Seismic, Path 02
or the Final Priority Index.

## Decision

```text
not_ready_for_collapse_learned_strategies
```

The official ISPRA PAI exposure provider is operational and suitable for
present-day point context. The historical outcome dataset now has a first
source-backed curation registry, but it is not yet suitable for
process-specific production strategy generation.

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

The deterministic audit reads the seven explicitly registered candidates.
Initial discovery required `specific_cause = Landslide` or an explicit
landslide trigger; the registry now controls eligibility independently from
that legacy classification. Mere mentions in descriptions remain excluded.

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
| Cases with complete landslide outcome taxonomy | 4 |
| Cases eligible for outcome learning | 3 |
| Independent eligible episodes | 3 |
| Cross-hazard reclassifications | 1 |
| Explicitly multicausal and excluded cases | 1 |
| Excluded for insufficient direct evidence | 2 |
| Review-pending cases | 0 |

The two present-day intersections are one P2 and one P4. They remain current
signatures, not reconstructed historical classes.

### Case disposition

| Event | Disposition | Reason |
|---|---|---|
| `B13.12.03` Costa di Serina | eligible | source-backed rockfall and direct bridge impact; evidence remains probable because no technical investigation is registered |
| `B15.04.01` Himera I | eligible | source-backed rotational movement evolving into rapid debris/mud flow, with pier and foundation displacement |
| `B19.11.01` Madonna del Monte | eligible | technical evidence of rotational movement evolving into rapid debris flow and direct dynamic pier impact |
| `B16.11.04` Monesi | excluded: bridge outcome unverified | official records confirm road destruction and bridge works, but not the identity and total-collapse chronology recorded by ARCUS |
| `B24.05.01` Santa Sofia | excluded: interaction unverified | official inventories connect the location to a wide 2023 landslide and a 2024 bridge-collapse intervention, but do not document the direct interaction mechanism or reconcile the dates |
| `B13.02.01` Verdura | reclassified hydraulic; excluded | the user-provided summary of the court expert reports attributes foundation instability to prolonged-flood scour and erosion, not to a landslide |
| `B20.04.02` Albiano Magra | confirmed multicausal; excluded | the user-provided CTU summary attributes thrust on the east abutment to an ancient paleolandslide, alongside structural widening, insufficient strengthening and historical management deficiencies |

For Verdura and Albiano, ARCUS records the summaries as user-provided evidence
received on 2026-08-24. The underlying expert reports were not attached and
have not been independently inspected. Their primary-document verification
therefore remains pending, and the summaries must not be represented as a
direct ARCUS review of the CTU or court-appointed reports.

Because no further primary material is obtainable, Verdura is also integrated
into the Professional Hydraulic cohort as `probable` scour evidence, weighted
0.5. Its prior normalized classification is retained in the audit metadata.
This correction does not modify the source workbook or the Open release.

The machine-readable source of this disposition is:

```text
config/collapse-intelligence/landslide-outcome-registry.json
```

The original event cause field is not silently overwritten. Professional data
adds a versioned `landslide_intelligence` overlay containing the curation
status, eligibility, evidence references and limitations.

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

## Provisional Support Contract

ARCUS now applies `landslide-support-contract-v1` as an abstention-only
barrier. It does not activate strategies and is not represented as an
expert-validated statistical threshold.

| Requirement | Provisional minimum | Observed |
|---|---:|---:|
| Independent eligible episodes | 5 | 3 |
| Episode-effective evidence | 4 | 2.5 |
| Independent episodes for one movement process | 5 | 1 maximum |
| Episode-effective evidence for one movement process | 4 | 1 maximum |

Documented evidence has experimental weight 1 and probable evidence weight
0.5. Each independent episode can contribute at most once to a movement
process. None of the three observed processes is repeated across independent
eligible episodes, so no process-specific conclusion is admissible.

The contract retains the previously reviewed ReLUIS/CSLLPP manual principles:
territorial susceptibility, local susceptibility, interaction, vulnerability
and exposure must remain separate; severity and velocity, interaction
geometry, affected components and foundation context require site-specific
assessment. The source PDF was no longer available at its original local path
during this implementation pass, so this basis remains explicitly pending
repeatable document verification.

For every Path 01 point the landslide support engine therefore returns an
auditable status, evidence totals and abstention reasons, always with zero
strategies. It does not assign Level 2 or Level 3 attention classes and does
not contribute to the Final Priority Index.

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

The seven-case curation is closed on the evidence currently obtainable: three
cases are eligible, while four have explicit and auditable exclusion reasons.
Excluded cases can be reopened only if materially stronger evidence becomes
available; they are not an open blocker.

The next admissible step is external expert review of the provisional contract
and engineering basis, together with acquisition of additional independent,
source-backed collapse episodes. Production strategies remain disabled until
both the evidence minimum and expert-validation requirements are satisfied.
