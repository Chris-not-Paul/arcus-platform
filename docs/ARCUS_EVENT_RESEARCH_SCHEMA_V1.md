# ARCUS Event Research Schema v1

Status: implemented baseline and coverage audit; progressive curation required

Machine-readable contract:

```text
config/research/event-research-schema.json
```

Generated controlled resources:

```text
private-data/professional/event-research-profiles.json
private-data/professional/event-research-readiness-audit.json
```

## Purpose

The schema prepares one evidence base for three different uses:

1. the event dossier presents documented facts without filling gaps;
2. Research Analytics measures comparability and missingness;
3. Learning from Failures consumes only fields that pass an explicit value and
   leakage audit.

The schema does not authorize a collapse-probability model, a safety class or
an automatic intervention prescription.

## Temporal separation

| Phase | Examples | Permitted role |
|---|---|---|
| Pre-event | bridge configuration, foundations, inspection, warnings, previous interventions | candidate comparison or learning input after validation |
| Event | trigger, process, component, event intensity, episode identity | mechanism interpretation and episode-independence control |
| Post-event | closure duration, reopening, replacement, service disruption | consequences, resilience and lessons learned |
| Record metadata | location/date precision, provenance and missingness | quality control and sensitivity |

Post-event information is never used as a pre-event matching feature. This
prevents target leakage: a model must not learn from information that became
available only after the collapse.

## Evidence and missingness

Every new value is designed to retain an evidence state:

```text
documented
reported
inferred_reviewed
inferred_unreviewed
unknown
```

Missing values remain distinguishable:

```text
not_assessed
not_found
not_applicable
conflicting_sources
withheld
```

`0`, `false` and missing are therefore different states. Inferred values must
not be displayed or exported as documented observations.

## Current baseline

The first generated profile contains all 261 current controlled events.

| Field | Structured availability | Current use |
|---|---:|---|
| Location precision | 261 | dossier quality and analytical filtering |
| Episode control | 217 | grouped holdout and evidence independence |
| Hydraulic bridge length | 157 | controlled descriptive research only |
| Piers in the active riverbed | 154 | controlled descriptive research only |
| Span configuration / count | 4 / 3 | source-backed pilot; domain review required |
| Maximum span | 2 | source-backed pilot; descriptive only |
| Foundation type | 0 | awaiting curation |
| Pre-collapse condition / warning / intervention | 1 / 1 / 1 | source-backed pilot; excluded from production learning |
| Recovery action / reopening / service disruption | 4 / 2 / 1 | post-event outcomes only |

The master also contains 291 curation-log entries. Research profiles publish a
traceability summary, not internal rationales, rejected values or editorial
working notes.

### Controlled enrichment pilot

The first source-backed cohort is stored in
`config/research/event-research-enrichment-v1.json`, separately from the
canonical `EVENTS` sheet. This keeps the master compact while retaining stable
event identity, field-level provenance and review status.

The pilot currently contains four cases:

- `IT13.02.01` — Ponte sul fiume Verdura;
- `IT15.04.01` — Viadotto Himera I;
- `IT18.08.01` — Viadotto Polcevera / Ponte Morandi;
- `IT20.04.02` — Ponte di Albiano Magra.

Every record remains `source_backed_pending_domain_review`. The values are
visible in the controlled Research workbench but cannot enter production
learning until domain review and a field-specific value audit are complete.

## Learning gate

Episode identity is already usable as an independence control. It is not proof
that records share the same meteorological event or cause.

Bridge length and active-riverbed pier presence remain experimental. The
existing episode-held-out value audit did not justify enabling them in the
production analogue or mitigation logic. They may be displayed descriptively
inside the controlled Research layer, but they must not change production
retrieval or strategy qualification.

The following fields cannot enter Learning from Failures until they have
sufficient coverage and pass a field-specific audit. Pilot population alone
does not unlock them:

- span configuration and span count;
- maximum span;
- foundation type;
- number of piers in the active riverbed;
- pre-collapse inspection and condition;
- documented prior warnings;
- prior interventions and protective measures.

## Visibility boundary

The schema follows the ARCUS data-access policy:

- `O1`: approved Open record metadata;
- `R1`: controlled Research data;
- `P1`: project-specific Professional output;
- `I1`: internal editorial evidence.

Record-level hydraulic geometry and the complete working episode registry
remain `R1`. The Open release publishes a separate, conservative projection
(`episodes.json`) containing only multi-collapse groups that are either linked
by shared documentary sources or assigned through a curated hazard registry.
Date-only and unsupported temporal-regional associations remain excluded. The
public projection is a clustering and independence control; it is not proof of
an identical failure mechanism across bridges.

## Commands

```text
npm run build:event-research-profiles
npm run test:event-research-profiles
```

The build reports coverage only. Coverage is not a quality score, vulnerability
score, safety assessment or statement of model readiness.
