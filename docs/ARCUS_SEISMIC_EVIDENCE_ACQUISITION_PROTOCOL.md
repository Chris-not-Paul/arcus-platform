# ARCUS Seismic Evidence Acquisition Protocol

Status: implemented as a non-production intake gate.

## Purpose

The seismic strategy track is evidence-limited, not software-limited. This
protocol allows ARCUS to collect additional earthquake-associated bridge
outcomes without silently promoting incomplete cases into the production
registry.

The intake gate never changes Mitigation Intelligence, never emits a strategy
and never modifies the Final Priority Index. Its only admissible output is a
review status.

## Three admission states

| Status | Meaning | Production effect |
|---|---|---|
| `blocked_evidence_gaps` | identity, outcome, mechanism, episode independence or technical evidence is incomplete | none |
| `ready_for_expert_review` | the documentary package is complete, but engineering reviews are pending | none |
| `ready_for_registry_review` | structural, geotechnical and registry reviews are approved | none; a separate editorial action is still required |

There is no automatic path from candidate intake to the production seismic
outcome registry.

## Minimum candidate package

A candidate requires:

1. a stable candidate identifier and dated earthquake episode;
2. coordinates and a source-backed bridge identity;
3. a confirmed full or partial bridge collapse outcome;
4. a coherent source-backed failure mechanism;
5. trigger, failure process, affected component, interaction type and evidence
   level;
6. at least one case-specific technical source stating what it supports;
7. an explicit basis for treating the earthquake as an independent episode;
8. separate structural, geotechnical and registry-editor reviews.

The editable starting point is
`docs/templates/seismic-evidence-candidate.template.json`. The contract is
`config/collapse-intelligence/seismic-evidence-intake-contract.json`.

## Historical shaking rule

Current MPS04 values remain present-day reference hazard. They cannot be copied
into `historical_ground_motion`. A historical shaking value is accepted only
when its measurement type and source are recorded. `not_available` is a valid
and preferable value when no authenticated historical measurement exists.

## Reproducible audit

Place working candidates in the ignored Professional path:

```text
private-data/professional/collapse-intelligence/seismic-evidence-candidates.json
```

The file shape is:

```json
{
  "candidates": []
}
```

Run:

```text
npm run audit:seismic-intake
npm run test:seismic-intake
```

An alternate file can be checked without moving it:

```text
node scripts/audit-seismic-evidence-intake.js --input path/to/candidates.json
```

## Review boundary

`ready_for_registry_review` means that the intake package passed the declared
documentary and review gates. It does not mean that the case is eligible for
learning, that the episode thresholds are scientifically validated, or that a
seismic strategy may be activated. Registry inclusion and any future contract
change remain separately reviewed decisions.
