# ARCUS Failure Learning Benchmark v1

Status: `frozen_ready_for_independent_expert_pilot`

Current freeze ID: `flb-40f590cbedc0f6b1fe9a`

## Purpose

This benchmark tests whether ARCUS retrieves historically documented bridge
collapses that experts consider useful analogues for investigation learning.
It also tests whether ARCUS abstains clearly when the project point has no
official hydraulic class intersection. It does not estimate collapse
probability, classify bridge safety or establish intervention priority.

## Frozen sample

The sample contains 40 outcome-withheld target contexts selected only from the
current official hydraulic signature and a deterministic geographic
round-robin. Collapse cause, process, component and severity are not used for
target sampling.

| Stratum | Available in frozen signatures | Selected |
| --- | ---: | ---: |
| P1 | 8 | 8 |
| P2 | 27 | 10 |
| P3 | 137 | 10 |
| No hydraulic class intersection | 84 | 12 |
| **Total** | **256** | **40** |

The remaining five signatures have provider failures (`circuit_open` or
`service_unreachable`) and are excluded rather than interpreted as
no-intersection controls.

For the 28 class-intersection targets, ARCUS freezes the first eight national
analogues after removing the target collapse from the candidate archive. This
produces 224 unique target–analogue pairs.

## Reviewer allocation

Five reviewer slots receive a workload-balanced package. Every target is
assigned once. Eight analogue-relevance cases are assigned to three reviewers,
and two abstention controls are assigned to two reviewers. The frozen plan
therefore contains:

- 58 target reviews;
- 352 assigned analogue judgements;
- 128 repeated judgements across 64 unique overlapping analogue pairs;
- 28.6% of unique analogue pairs reviewed by more than one expert.

An abstention control is counted as four workload units only for assignment
balancing; this number has no scientific or evidential meaning.

Recommended panel composition is at least two hydraulic/scour specialists, two
bridge/structural engineers and one geotechnical or infrastructure-management
expert. `insufficient_information` is a valid and important response whenever
the case falls outside a reviewer’s competence or the evidence is inadequate.

## Distribution protocol

Each expert receives only:

1. their `reviewer-0X-package.json`;
2. the matching `reviewer-0X-response-template.json`;
3. the instruction to work independently before any panel discussion.

Do not distribute `confidential-key.json`, `reviewer-master-package.json`, the
other reviewer packages or completed responses before all responses are
locked. The confidential key contains target and analogue event identities and
is necessary only for controlled ingestion and analysis.

Reviewer packages deliberately withhold target identity, coordinates, event
identifier and collapse outcome. Analogue identity is also hidden, while the
post-retrieval documented failure observation and aggregate source-role counts
are shown because they are the evidence being judged. Source titles and links
remain withheld during the first blind review. Current official classes remain
explicitly described as present-day context, not historical reconstruction.

## Response rules

For every analogue, the reviewer must provide:

- one rating: `useful`, `partially_useful`, `not_useful` or
  `insufficient_information`;
- at least one controlled reason code;
- a technical note of at least 20 characters for `partially_useful` and
  `not_useful`.

For no-intersection controls, the reviewer assesses whether abstention and its
wording are appropriate and whether the output could be misread as zero hazard
or safety. A rationale of at least 25 characters is required.

The signed declaration must confirm independent completion, human authorship
and consent for pseudonymised calibration use.

Validate a completed response before acceptance:

```text
npm run validate:failure-learning-benchmark-response -- reviewer-01 <response.json>
```

## Files and reproducibility

The generated benchmark is stored privately under
`private-data/professional/collapse-intelligence/failure-learning-benchmark-v1`.
The manifest records SHA-256 checksums for the professional event dataset,
current hazard signatures and historical-signature registry. Rebuilding from
the same inputs and sampling seed reproduces the same freeze ID and case
selection. The manifest also blocks the `ready` status unless all anti-leakage,
self-retrieval, pair-uniqueness, cohort-size and workload-balance checks pass.

```text
npm run build:failure-learning-benchmark
```

If any input checksum changes, the result is a new freeze and must not be mixed
silently with responses from the previous one.

## Interpretation boundary

Targets are collapsed bridges used as outcome-withheld proxy project contexts.
They are not a representative sample of standing bridges. The benchmark can
support calibration of analogue usefulness and evaluation of abstention, but
cannot validate failure probability, causal transferability or bridge safety.
Passing the collection gates permits only an offline comparison against the
deterministic ARCUS baseline. Production activation remains prohibited.
