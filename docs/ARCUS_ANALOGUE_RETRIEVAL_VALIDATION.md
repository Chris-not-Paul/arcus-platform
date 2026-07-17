# ARCUS Analogue Retrieval Validation

Date: 2026-07-17

Output:

```text
private-data/professional/collapse-intelligence/analogue-retrieval-validation.json
```

## Metric Reframe

The workbench now uses retrospective analogue retrieval performance, not cause-classification accuracy.

Metrics implemented:

- failure-pattern hit@1;
- failure-pattern hit@3;
- failure-pattern hit@5;
- component hit@3;
- component hit@5;
- mean reciprocal rank;
- precision@3;
- precision@5;
- recall@5;
- nDCG@5;
- pattern coverage;
- abstention rate;
- effective evidence support through source reliability;
- all-eligible and evaluated-only denominators.

## Validation Guardrails

Implemented guardrails:

- target event excluded;
- duplicate/same-event groups excluded;
- outcome fields excluded from matching;
- documented outcomes added only after ranking;
- fold-specific temporal candidate restriction;
- geography can be disabled for geographical validation;
- insufficient evidence produces abstention.

## Current Results

With dry-run hazard signatures, all hazard-gated tracks abstain.

| Track | Evaluated | Abstention rate | hit@3 |
| --- | ---: | ---: | ---: |
| hydraulic | 0 | 1 | null |
| landslide | 0 | 1 | null |
| seismic contextual | 0 | 1 | null |
| multi-hazard | 0 | 1 | null |

This is expected because hazard routing must not fall back to documented cause when official hazard signatures are unavailable.

## Baseline Policy

The validation compares:

- public hazard description only;
- public hazard + general HCI;
- hazard-gated random cohort;
- hazard-gated most-frequent-pattern baseline;
- ARCUS hazard-gated retrieval;
- ARCUS project-informed retrieval.

Value add is not demonstrated until ARCUS retrieval beats baselines on the same fold, same eligible set and same abstention policy.

## Decision

Decision: `validation incomplete`.
