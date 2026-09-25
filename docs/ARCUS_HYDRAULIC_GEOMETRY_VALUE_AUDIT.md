# ARCUS Hydraulic Geometry Value Audit

Status: `exploratory_signal_only`
Audit version: `arcus-hydraulic-geometry-value-audit-v1`

## Objective

This audit tests whether the two S3 bridge-geometry attributes currently stored
in ARCUS add repeatable discrimination of documented historical Hydraulic
outcomes:

- `bridge_length_m`;
- `piers_in_active_riverbed`.

It is an offline hypothesis test. It does not estimate collapse probability,
asset safety or vulnerability and does not authorize either field for production
retrieval, mitigation qualification or scoring.

## Validation contract

The primary validation leaves out an entire inferred or curated Hydraulic
episode. All bridges assigned to the target episode are removed from training,
limiting leakage between bridges damaged by the same event.

The comparison uses the same eligible targets for:

1. training-fold majority class;
2. bridge length only;
3. active-riverbed pier presence only;
4. bridge length and pier presence combined.

Length and combined geometry use deterministic unweighted k-nearest neighbours.
The primary value is `k=5`; `k=3, 7, 9` are reported as sensitivity checks. The
binary pier-only ablation uses the training-fold majority within the matching
pier-status group. Only Documented and Probable outcome records are included.
Classes below the declared minimum support are excluded before validation.
Confidence intervals are paired, episode-level deterministic bootstrap intervals
with 2,000 repetitions.

## Dataset

| Item | Value |
|---|---:|
| Geometry-enriched events | 159 |
| Bridge length available | 159 |
| Pier presence available | 156 |
| Process validation sample | 147 |
| Process episodes | 68 |
| Component validation sample | 148 |
| Component episodes | 69 |

The process task retains `scour` (68),
`bank_erosion_or_embankment_failure` (50) and
`overtopping_or_hydrodynamic_action` (29). Rare process classes remain visible
in the database but are excluded from classification because support is below
10.

## Failure-process result

| Model | Accuracy | Balanced accuracy | Macro F1 | Episode-macro accuracy |
|---|---:|---:|---:|---:|
| Majority baseline | 46.26% | 33.33% | 21.09% | 65.38% |
| Bridge length | 36.05% | 30.03% | 29.35% | 42.89% |
| Pier presence | 55.10% | 43.24% | 38.35% | 67.52% |
| Length + piers, k=5 | 35.37% | 30.02% | 29.29% | 43.04% |

The combined model changes episode-macro accuracy by `-22.34` percentage points
relative to the baseline. The paired 95% bootstrap interval is
`[-34.33, -9.79]` percentage points. The sensitivity values for combined
geometry remain below the baseline: 46.90% (`k=3`), 43.04% (`k=5`), 53.55%
(`k=7`) and 53.66% (`k=9`).

Pier presence alone produces a small process-specific signal: episode-macro
accuracy improves by `+2.14` percentage points, with a 95% interval of
`[-3.46, +8.09]`. Because the interval crosses zero, this is exploratory and not
a demonstrated improvement.

## Component result

| Model | Accuracy | Balanced accuracy | Macro F1 | Episode-macro accuracy |
|---|---:|---:|---:|---:|
| Majority baseline | 52.03% | 16.67% | 11.41% | 55.65% |
| Bridge length | 39.86% | 18.73% | 19.09% | 40.89% |
| Pier presence | 50.68% | 16.23% | 11.21% | 54.20% |
| Length + piers, k=5 | 37.16% | 13.60% | 12.11% | 38.48% |

The combined model changes episode-macro accuracy by `-17.17` percentage points.
The paired 95% bootstrap interval is `[-27.25, -7.73]` percentage points. The
best sensitivity result, 49.06% at `k=7`, still remains below the 55.65%
baseline.

## Descriptive signal

The negative predictive result does not mean the fields carry no engineering
information. It means they do not form a sufficiently reliable standalone
retrieval space in this dataset.

- Scour cases have a median bridge length of 65.5 m, versus 37 m for bank or
  embankment failure and 31.41 m for overtopping or hydrodynamic action.
- Active-riverbed piers occur in 61 of 68 Scour cases, 29 of 49 bank or
  embankment cases with pier data, and 16 of 28 overtopping cases with pier data.
- The descriptive process association is moderate in this sample: length
  epsilon-squared `0.1257`; pier-presence Cramer's V `0.3522`.
- Pier/foundation component cases have a median bridge length of 91 m and all 26
  records with this outcome have active-riverbed piers. The component contingency
  table is sparse and cannot support a general rule.

These are frequencies among documented damaged or collapsed bridges, not risk
rates for the bridge population.

## Critical interpretation

The audit judgement is `exploratory_signal_only`, while the production decision
remains `not_authorized`, for four reasons:

1. length and combined geometry perform below the fair episode-held-out
   baseline; the small pier-only process improvement is not statistically robust;
2. ARCUS has no representative non-collapse control group;
3. geometry and many outcome labels derive from the same S3 source, so the
   observed association is source-conditioned rather than externally validated;
4. Path 01 cannot use asset geometry unless the selected project bridge supplies
   the corresponding attributes.

The fields should remain descriptive post-retrieval evidence. A future
project-informed experiment is justified only after obtaining independent target
asset geometry and an external or temporally independent validation cohort.

## Reproduction

Run:

```text
npm run audit:hydraulic-geometry-value
npm run test:hydraulic-geometry-value
```

The machine-readable result is generated at
`private-data/professional/hydraulic-geometry-value-audit.json`.
