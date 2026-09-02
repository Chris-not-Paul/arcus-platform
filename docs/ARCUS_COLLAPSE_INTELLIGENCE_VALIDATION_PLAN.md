# ARCUS Collapse Intelligence Validation Plan

Date: 2026-08-26

Status: **promising research signal; value add not demonstrated over fair baselines**.

Validation metrics describe retrospective analogue-retrieval performance. They
are not collapse probabilities, safety classifications or prediction accuracy.

## Invalidated legacy result

The former cause-family holdouts that reported perfect temporal and geographical
scores are invalidated. Those routines selected candidates from the target's
documented cause family and therefore leaked the outcome into the cohort.

They must not be cited as evidence of ARCUS performance. The canonical command
`npm run validate:collapse-intelligence` now executes the hazard-gated,
target-excluded validation instead.

## Canonical hydraulic benchmark

All figures below use the same 263 target folds for ARCUS and both baselines:

- the hydraulic track is activated only from the official current signature;
- the target event and linked duplicate episode groups are excluded;
- documented cause and failure process are not matching features;
- target outcomes are read only after retrieval;
- ARCUS, majority and deterministic-random baselines share candidate pools and
  abstention denominators.

| Metric | ARCUS | Majority baseline | Random baseline |
| --- | ---: | ---: | ---: |
| Total folds | 263 | 263 | 263 |
| Evaluated folds | 148 | 148 | 148 |
| Failure-pattern hit@3 | 0.4730 | 0.3851 | 0.4595 |
| Macro failure-pattern hit@3 | 0.2670 | 0.0909 | 0.1833 |

ARCUS improves on both fair baselines at the point estimate, but the micro hit@3
margin over the random baseline is only 0.0135. Its paired deterministic-bootstrap
95% interval is `[-0.0811, 0.1149]` and therefore includes zero. The corresponding
margin over the majority baseline is 0.0878 with interval `[0.0068, 0.1757]`.

The correct decision is consequently `no_demonstrated_value_over_fair_baselines`.
Twenty-four evaluated folds are wins where ARCUS hits and both baselines miss,
but this is a promising research signal rather than robust superiority.

## Feature ablation

The full candidate uses the current hazard signature, project-profile fields and
limited territorial context.

| Configuration | Hit@3 | Macro hit@3 | nDCG@5 |
| --- | ---: | ---: | ---: |
| Full candidate | 0.4730 | 0.2670 | 0.7388 |
| Without hazard signature | 0.4257 | 0.2479 | 0.7388 |
| Without project profile | 0.5135 | 0.2738 | 0.8041 |
| Without territory | 0.4257 | 0.2701 | 0.5916 |

Interpretation:

- the official hazard signature contributes to hit@3;
- the current project-profile block reduces aggregate performance and must not
  be assigned greater weight without field-level review;
- removing `bridge_use` alone increases hit@3 from 0.4730 to 0.5000;
- removing structural typology or waterway context does not change hit@3;
- province adds some retrieval signal, while region does not improve the point
  estimate and may encode unstable spatial clustering.

## Holdout observations

The temporal and geographical outputs are now produced by the same leakage-free
retrieval path. Current examples include:

- temporal cutoff 2015: hit@3 0.3774, macro hit@3 0.2490, abstention 0.5310;
- temporal cutoff 2020: hit@3 0.5000, macro hit@3 0.4018, abstention 0.6471;
- geography-disabled test: hit@3 0.4257, macro hit@3 0.2701, abstention 0.4373.
- leave-province-out: hit@3 0.4189, macro hit@3 0.2664;
- leave-region-out: hit@3 0.4324, macro hit@3 0.2324;
- hydraulic episode holdout: hit@3 0.4730, macro hit@3 0.2670, with nDCG@5
  decreasing from 0.7388 to 0.7239.

The high abstention rates are not defects to hide: they expose how often the
available pre-event evidence cannot support a sufficiently comparable cohort.

## Next scientific questions

1. Why do bridge-use and the combined project-profile block reduce performance?
2. Does the hazard-signature contribution persist by class and evidence grade?
3. Can weak or non-discriminating project fields be converted to optional
   tie-breakers rather than primary similarity inputs?
4. Can thresholds improve reliability without creating selective reporting?
5. Do independent bridge experts prefer ARCUS cohorts to blinded baselines?

## Production gates

Do not claim validated value add until:

- ARCUS beats fair baselines across prespecified holdouts, not only in aggregate;
- uncertainty intervals and pattern-level support are reported;
- the abstention policy is frozen before final evaluation;
- sensitivity to feature weights and duplicate grouping is documented;
- a blinded expert-review protocol is completed;
- mitigation links are externally validated.
