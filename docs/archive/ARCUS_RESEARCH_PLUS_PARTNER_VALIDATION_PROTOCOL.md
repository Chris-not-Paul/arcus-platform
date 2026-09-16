# ARCUS Research Plus — Founding Partner Validation Protocol

Status: archived — moderated pilot paused

Target: 5–8 bridge, hydraulic or infrastructure-risk researchers

Session duration: 60–75 minutes

## Objective

Determine whether Research Plus produces a material research benefit over a
manual CSV workflow without creating unjustified confidence in inferred
episodes, analogue ranking or descriptive failure patterns.

The pilot evaluates usefulness, interpretability and reproducibility. It is
not a validation of collapse prediction because the workbench does not produce
collapse probabilities.

## Session preparation

Each participant receives:

- access to one frozen ARCUS Professional data release;
- the Open dataset and CSV as the comparison workflow;
- the public taxonomy and field definitions;
- no explanation of the expected result before completing each task.

The moderator records completion time, requests for help, interpretation errors,
unexpected assumptions and requested outputs. No customer or unpublished bridge
inventory is entered during this pilot.

## Five evaluation tasks

### Task 1 — Episode sensitivity

Question: how much does the apparent number of hydraulic events change under
strict, reference and broad grouping assumptions?

Required output:

- record and episode denominators;
- chosen thresholds;
- difference across the three scenarios;
- one sentence explaining why an inferred episode is not meteorological truth.

### Task 2 — Failure-chain exploration

Question: which documented trigger–process–component chains are most represented
in the selected hydraulic cohort, and where are the missing links concentrated?

Required output:

- three leading chains;
- record and episode counts;
- explicit treatment of `Not documented`;
- links back to the underlying cases and sources.

### Task 3 — Analogue retrieval

Question: select one assigned historical case, retrieve comparable collapses and
explain why the first five appear.

Required output:

- enabled features and weights;
- similarity and feature coverage;
- number of equivalent candidates;
- leave-one-feature-out sensitivity;
- statement that similarity is not collapse probability or safety.

### Task 4 — Robustness check

Question: does the leading documented failure process remain the same when the
analysis is restricted by evidence quality, source role and one representative
per episode?

Required output:

- denominator for every scenario;
- leading category and share;
- leave-one-episode-out stability;
- identification of any sensitive result.

### Task 5 — Reproducibility hand-off

Question: can another researcher reconstruct the analytical choices without
speaking to the original analyst?

Required output:

- saved notebook;
- downloaded ZIP package;
- verified manifest and checksums;
- one independently reproduced table;
- release identifier and interpretation boundary in the written result.

## Comparison with the manual workflow

Participants repeat either Task 1 or Task 3 using the CSV and ordinary analysis
software. Record:

- completion time;
- number of manual transformations;
- unresolved methodological choices;
- whether the result can be handed to another researcher reproducibly.

ARCUS should not be considered materially valuable merely because it is faster.
It must also make assumptions and limitations more visible than the manual path.

## Participant scoring

After each task, collect a 1–5 score for:

- usefulness for a real research question;
- clarity of denominators;
- transparency of method;
- confidence in reproducing the result;
- risk of over-interpreting the result, where 1 is low and 5 is high.

Also ask two open questions:

1. Which statement or control could be misunderstood by a competent researcher?
2. Which output would you cite or reuse, and which would you refuse to use?

## Acceptance gates

The prototype advances to a paid research pilot only if:

- at least 80% of tasks are completed without moderator intervention;
- no participant interprets similarity as probability after reading the interface;
- no participant interprets episode concordance as meteorological validation;
- median usefulness and transparency are at least 4/5;
- at least 4 of 5 independent package hand-offs reproduce the selected result;
- the workbench reduces median completion time without hiding transformations;
- every critical scientific objection is resolved or recorded as a visible limitation.

Failure of a gate leads to interface or method revision, not to lowering the
gate or adding promotional language.

## Evidence record

For each session retain:

- anonymous participant role and domain;
- data-release and method versions;
- task timings and outcomes;
- exported research package checksum;
- interpretation errors;
- feature and threshold changes requested;
- moderator notes;
- participant approval for any attributed quotation.

Pricing and token rules should be tested only after the scientific workflow
passes these gates. The first pilot should evaluate research value, not willingness
to pay.
