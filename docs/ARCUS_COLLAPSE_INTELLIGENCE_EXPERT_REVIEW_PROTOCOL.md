# ARCUS Failure Learning Expert Review Protocol

Date: 2026-08-26

Version: `arcus-failure-learning-expert-review-v1`

Status: implemented; awaiting independent human review.

## Objective

The protocol tests two different questions without changing the production
engine or its thresholds:

1. does the candidate retrieval produce more useful hydraulic analogues than a
   fair hazard-gated random baseline?
2. is the Failure Learning Matrix engineering-relevant, safely worded and
   appropriately abstaining?

Passing this review does not validate collapse probability, approve a design
measure or authorize automatic asset ranking.

## Generated artifacts

```text
private-data/professional/collapse-intelligence/
  failure-learning-expert-review-package.json
  failure-learning-expert-review-response-template.json
  failure-learning-expert-review-key.json
  failure-learning-expert-review-audit.json
```

The reviewer package and response template may be distributed to reviewers.
The key must remain confidential until every independent response is locked.

Generate or refresh them with:

```text
npm run build:failure-learning-expert-review
```

The command first regenerates the hazard-gated analysis and its raw comparison
cohorts, then creates the neutralized package.

After locked human responses are collected in
`failure-learning-expert-review-responses.json`, assess them with:

```text
npm run assess:failure-learning-expert-review
```

With no authentic responses the assessment returns `not_assessable`; it never
fills or simulates reviewer judgments.

## Outcome-blind sampling

Retrieval cases are selected using only the current official hydraulic class:

- up to 10 P1 targets;
- up to 10 P2 targets;
- up to 10 P3 targets.

The selection does not use documented collapse cause, failure process,
component or severity. Targets are deterministically spread within each class
instead of being chosen for a desirable outcome.

The matrix arm uses:

- up to 6 targets for each P1/P2/P3 class;
- up to 6 official `no_intersection` controls.

The target event is removed from the event and signature pools before its
matrix is calculated. This is a true target holdout: its own collapse outcome
cannot contribute to its investigation priorities.

The target outcome is stored only in the confidential key for later analysis.

## Fair baseline

Both retrieval candidates are routed through the hydraulic track. The baseline
is sampled only from records with an active official hydraulic intersection.
It does not use the target's known historical cause to choose a family.

This corrects a methodological defect in the previous draft package, where the
baseline family could reveal and use the target outcome.

## Anti-unblinding contract

Reviewer outputs A and B use the same schema. The distributed package removes:

- event identifiers;
- retrieval mode;
- similarity scores available to only one candidate;
- `project_informed` labels;
- random-baseline labels;
- target-event identifiers;
- municipalities, dates and narratives that could reveal famous collapses.

Analogue identifiers are local aliases. Feature comparisons are recomputed
with the same neutral rule for A and B. Candidate placement is balanced between
A and B, and the package contains an automated anti-unblinding audit.

If this audit fails, the package is not reviewable.

## Review arm A: retrieval preference

For every A/B pair reviewers score from 1 to 5:

- analogue relevance;
- engineering coherence;
- usefulness of failure learning;
- usefulness of investigation priorities;
- traceability and comprehensibility.

They must also record:

- misleading content for A and B separately;
- missing critical information;
- preference `A`, `B` or `tie`;
- confidence from 1 to 5;
- a substantive rationale.

The scale anchors are:

| Score | Meaning |
|---:|---|
| 1 | Unusable or materially misleading |
| 2 | Weak; major engineering omissions |
| 3 | Conditionally useful with material qualifications |
| 4 | Useful and coherent with minor qualifications |
| 5 | Highly useful, clear and appropriately bounded |

## Review arm B: matrix appropriateness

Reviewers receive the target profile and sanitized production matrix, with the
historical target outcome withheld. They assess:

- overall usefulness from 1 to 5;
- whether the evidence interpretation is safe;
- whether qualified investigation priorities are engineering-relevant;
- whether an abstention is appropriate;
- missing critical information;
- rationale.

Current hazard remains explicitly identified as current context, not a
reconstruction at the historical event date.

## Reviewer governance

The minimum pilot requires:

- 3 independent human reviewers;
- at least one Hydraulic Engineering reviewer;
- at least one Bridge Engineering reviewer;
- reviewer identity, experience and conflict declaration;
- independent completion before panel discussion;
- complete responses for every case;
- a locked reviewer signature.

Automated, simulated or model-generated responses are rejected and cannot be
used as expert evidence.

## Prespecified provisional gates

These are governance gates, not scientific effect sizes:

| Metric | Provisional gate |
|---|---:|
| Candidate preference among non-ties | >= 60% |
| Mean paired analogue-relevance improvement | >= 0.25 points |
| Mean paired failure-learning usefulness improvement | >= 0.25 points |
| Candidate misleading rate versus baseline | no more than +5 percentage points |
| Matrix median usefulness | >= 3.5 / 5 |
| Safe evidence interpretation | >= 90% |
| Qualified priority relevance | >= 80% |
| Abstention appropriateness | >= 80% |

Passing every gate produces only:

```text
candidate_for_human_methodology_governance_review
```

It does not change thresholds or approve production automatically. Failure of
one or more gates produces `expert_review_gate_not_met`. Invalid or incomplete
review governance produces `not_assessable`.

## Calibration firewall

Infrastructure-inventory denominators, provincial collapse rates and Historical
Collapse Incidence are outside both review arms. They do not select targets,
rank analogues, qualify matrix rows or enter reviewer scoring. Reintroducing any
such feature requires a separate preregistered study with a compatible exposure
population and time basis.

Project Bridge Profile v1 is outside the currently generated review package.
Its unweighted tie-breaker must be evaluated in a separately locked extension
that exposes declared fields, missingness and per-case match counts to
reviewers. Results from the current package cannot be used to claim that the
profile improves retrieval. Any weighting or candidate exclusion is a further
method change and requires another review package.

Until responses are locked:

- production thresholds remain frozen;
- the abstention policy remains frozen;
- no case is removed because it gives an unfavorable result;
- no reviewer output may be simulated;
- no holdout is retuned;
- reviewer disagreements remain visible.

If the gates are not met, the next action is diagnosis. Thresholds may be
proposed only in a separate calibration dataset and must be re-evaluated on a
new locked holdout.

## Current interpretation

The automated engine and package construction can be tested now. The expert
validation result cannot be manufactured in software: ARCUS remains
`validated_with_limitations` until authentic independent responses are
completed and locked.
