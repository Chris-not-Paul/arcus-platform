# ARCUS Collapse Intelligence Validation Plan

Validation metrics are retrospective pattern-retrieval performance, not collapse prediction accuracy.

## Current Results

### Leave-One-Out

| Metric | Value |
|---|---:|
| Total cases | 253 |
| Evaluated cases | 253 |
| Insufficient evidence | 0 |
| Top-1 cause-family hit rate | 0.822 |
| Top-3 cause-family coverage | 0.874 |

### Temporal Holdout

| Metric | Value |
|---|---:|
| Cutoff year | 2018 |
| Training cases | 176 |
| Validation cases | 77 |
| Abstention rate | 0.052 |
| Evaluated cases | 73 |
| Top-1 cause-family hit rate | 1 |
| Top-3 cause-family coverage | 1 |

### Geographical Holdout

| Metric | Value |
|---|---:|
| Cases | 80 |
| Abstention rate | 0 |
| Top-1 cause-family hit rate | 1 |
| Top-3 cause-family coverage | 1 |

## Interpretation

The validation currently proves that the offline pipeline is deterministic and leakage-guarded at field level. It does not yet prove production readiness because simple baselines still need formal scoring.

## Baselines To Formalize

- national most frequent cause;
- provincial most frequent cause;
- hazard-only mapping;
- HCI-only.

## Abstention Policies To Compare

- permissive;
- balanced;
- conservative.

Criteria:

- minimum analogue count;
- effective evidence count;
- minimum similarity;
- maximum missing-feature share;
- source-quality minimum;
- no excessive concentration in one event or territory.

## Production Gates

Do not productionize until:

- target leakage is excluded;
- abstention policy exists;
- analogues are explainable;
- metrics beat simple baselines;
- mitigation links are expert-validated;
- cohort percentages are not confused with site probabilities.
