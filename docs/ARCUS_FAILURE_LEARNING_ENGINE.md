# ARCUS Failure Learning Engine

Status: expert-labelled ranking foundation implemented; no predictive model

## Scientific objective

The engine is intended to learn which documented historical failures are useful
analogues for a current bridge problem and why. It does not estimate collapse
probability, classify bridges as safe or unsafe, or prescribe intervention.

## Current learning loop

The deterministic ARCUS retrieval engine first produces a hazard- and
profile-comparable national cohort. An authenticated expert may then label each
retrieved analogue as useful, partially useful, not useful or insufficiently
documented. Every judgement includes a controlled reason, the retrieval rank,
the target location, bridge profile, compact hazard signature, comparison
snapshot, engine version and optional technical note.

Judgements are stored privately under schema
`arcus-analogue-judgement-v1`. Revisions are append-only: a later judgement
supersedes the earlier record without deleting it. Consent is explicit and
limits reuse to pseudonymised calibration and validation of analogue ranking,
not automated decisions.

Each active judgement receives two server-derived SHA-256 identifiers: a
target-context fingerprint built from rounded coordinates, the declared bridge
profile and the official-hazard snapshot; and a target–analogue pair
fingerprint built from that target context and the collapse event identifier.
They allow ARCUS to recognise independent reviews of the same comparison even
when browser query identifiers differ. They are matching aids, not proof that
two projects are equivalent.

The private administration panel reports calibration readiness, including
active and superseded judgements, reviewers, target contexts, analogue events,
overlapping reviews and descriptive exact pairwise agreement. The status stays
`not_ready_for_model_training` until every declared pilot gate is met. Passing
all gates changes the status only to
`ready_for_offline_baseline_assessment`; it never activates a model in
production.

The administration-only calibration export excludes superseded judgements and
removes usernames, organizations, query identifiers, exact project locations
and technical free-text notes. Reviewer identity is replaced by a
server-secret HMAC pseudonym. The manifest deliberately declares the result
`pseudonymised_and_deidentified_not_anonymous`: pseudonymisation is not
anonymity. The export remains restricted to offline analogue-ranking
calibration and validation.

The readiness snapshot can be reproduced locally with
`npm run audit:failure-learning-readiness`.

## Pilot governance targets

| Measure | Target |
| --- | ---: |
| Active judgements | 300 |
| Distinct reviewers | 5 |
| Distinct target contexts | 30 |
| Distinct analogue events | 20 |
| Target–analogue pairs reviewed by at least two experts | 20 |
| Share of pairs reviewed by at least two experts | 20% |
| Decision ratings represented (`useful`, `partially_useful`, `not_useful`) | 3/3 |

These are operational pilot gates, not validated scientific cut-offs. Exact
pairwise agreement is a descriptive diagnostic and must not be presented as an
inter-rater reliability coefficient.

The frozen 40-context pilot design, reviewer allocation and response rules are
defined in `docs/ARCUS_FAILURE_LEARNING_BENCHMARK_V1.md`.

## Why labels precede machine learning

The collapse archive contains historical outcomes but no representative
population of equivalent non-collapsed bridges. It therefore cannot support a
defensible supervised collapse-probability model. Expert relevance judgements
create a target that ARCUS can legitimately learn: analogue usefulness.

## Evidence gates before model activation

1. Define a frozen, versioned feature dictionary and prevent historical outcome
   fields from leaking into retrieval inputs.
2. Collect independently reviewed judgements across hazards, bridge types,
   regions and evidence-quality levels.
3. Measure inter-rater agreement and adjudicate systematic disagreement.
4. Compare any learned ranker against the deterministic baseline using grouped
   validation by collapse episode and temporal holdout.
5. Require improvements in top-k expert relevance without loss of explanation,
   stability or abstention behaviour.
6. Keep the learned model in shadow mode until those gates pass.

## Candidate modelling path

Start with an interpretable pairwise learning-to-rank model using only approved
retrieval features. Embeddings or language models may assist document
extraction, but source citations and human confirmation remain mandatory. A
generative interface may explain results only from retrieved ARCUS evidence and
must disclose missing data and abstention.
