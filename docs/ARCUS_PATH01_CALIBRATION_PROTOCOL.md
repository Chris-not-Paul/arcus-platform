# ARCUS Professional Path 01 - Calibration Protocol v1

> **SUPERSEDED AUDIT RECORD.** The associated calibration engine and commands were removed from the active repository surface. See `ARCUS_Product_Definition.md`.

Status: calibration infrastructure implemented; scientific calibration not yet
performed.

## Decision being calibrated

The benchmark evaluates the minimum technical follow-up justified by the
official point observations before the design or construction of a crossing.
It does not estimate collapse probability, structural safety, design demand or
final site suitability.

The target is agreement between Preliminary Point Screening v2.1 and an
independent specialist panel on:

- follow-up level 0-4;
- hazard-specific follow-up flags;
- data sufficiency;
- governing observations and material omissions.

## Current pilot corpus

The candidate registry contains 14 real, traceable Italian points already used
in ARCUS validation. A live ISPRA enrichment on 2026-08-25 completed the nine
missing Hydraulic/Landslide counterparts; together with the five previously
frozen cases, all 14 are admitted to the pilot:

| Case | Hydraulic | Landslide | Seismic | ARCUS v2.1 pilot result |
| --- | --- | --- | --- | --- |
| Sud Sardegna P1 | P1 | no intersection | outside coverage | L1, incomplete |
| Cagliari P2 | P2 | P1 | outside coverage | L2, incomplete |
| Trapani P3 | P3 | no intersection | available | L3 |
| Ragusa AA | no intersection | AA | available | L0 + specialist flags |
| Livorno P1 | P3 | P1 | available | L3, governed by Hydraulic |
| Genova P2 | no intersection | P2 | available | L2 |
| Sud Sardegna P3 | no intersection | P3 | outside coverage | L3, incomplete |
| Potenza P4 | no intersection | P4 | available | L4 |
| Torino control | no intersection | no intersection | available | L0 |
| Torino seismic reference | no intersection | no intersection | available | L0 |
| Ancona seismic reference | no intersection | no intersection | available | L0 + seismic review |
| Messina seismic reference | no intersection | no intersection | available | L0 + seismic review |
| L'Aquila seismic reference | no intersection | no intersection | available | L0 + seismic review |
| Himera mixed case | no intersection | P2 | available | L2 |

The three Sardinian cases are intentionally admitted as traceable incomplete
assessments: the processed MPS04 grid returns `outside_coverage`, so no PGA is
assigned and the known ISPRA level remains only an evidence floor. This is a
missing-data calibration stratum, not a fabricated seismic value.

The 14 admitted points are a software and reviewer-workflow pilot only. They
are too few for calibration, contain no locked holdout or boundary cases and
provide fewer than five observations for every ordered ISPRA class. No fixture
or inferred class was used to fill a live-source gap.

## Blind review workflow

1. Freeze official observations and provenance before review.
2. Assign blind identifiers and withhold the ARCUS result and internal mapping.
3. Obtain one independent review from each role: Hydraulic, Geotechnical,
   Seismic and Bridge Integration.
4. Record sufficiency, follow-up level, required flags and a substantive
   rationale before any panel discussion.
5. Resolve disagreements through an explicit panel adjudication approved by
   all four roles. Individual responses remain preserved.
6. Evaluate the frozen ARCUS output against adjudication without retuning the
   holdout.

Automated, simulated or model-generated responses are not expert evidence and
are rejected by the assessment contract. Consensus must not be manufactured by
averaging reviewer levels.

## Corpus requirements before a calibration claim

The initial governance proposal requires at least:

- 60 admitted real cases;
- 20 locked holdout cases;
- 10 class-boundary cases;
- 10 multi-hazard severe cases;
- 8 incomplete-assessment cases;
- 8 dual no-intersection controls;
- 5 observations for each ordered Hydraulic P1-P3 and Landslide P1-P4 class;
- four valid independent reviews and one fully approved adjudication per case.

These counts and the metric thresholds are provisional acceptance criteria,
not scientific facts. They must be approved by the methodology governance
owner before the first production review. The small current pilot must not be
split into a nominal train/test set.

Recruitment should also balance INGV PGA bands, geography, river and slope
settings, and points close to official polygon boundaries. A point observation
never substitutes for the bridge footprint, alignment, piers, abutments or
approaches.

## Metrics and safety rule

The assessment reports exact agreement, agreement within one level,
quadratic-weighted kappa, under-triage, over-triage and recall of required
follow-up flags. The provisional gates are:

- exact level agreement at least 0.65;
- agreement within one level at least 0.90;
- quadratic-weighted kappa at least 0.70;
- zero cases where an expert level of 3 or 4 is under-triaged.

Zero severe under-triage is the primary safety constraint. Passing aggregate
agreement does not compensate for a severe missed follow-up. Results must also
be inspected by hazard and stratum; no single global statistic proves fitness
for use.

## Controlled artifacts

- `path01-calibration-candidate-sites.json`: real candidate registry;
- `path01-calibration-benchmark.json`: internal mapping and frozen ARCUS output;
- `path01-calibration-expert-review-package.json`: blind reviewer package;
- `path01-calibration-review-responses.json`: real reviews and adjudications;
- `path01-calibration-assessment.json`: fail-closed readiness and metrics.

They are stored under `private-data/professional/methodology/`. The internal
mapping must not be provided to reviewers.

Build and verify with:

```text
npm run enrich:path01-calibration:live
npm run build:path01-calibration
npm run test:path01-calibration
npm run validate:professional-path01
```

## Current judgement

The current assessment is `not_ready_for_calibration`: 14 of the proposed 60
cases are admitted, including three traceable incomplete assessments, but there
are zero boundary cases, zero holdout cases, zero independent reviews and zero
adjudications. Therefore `calibration_claim_allowed` is false.

The implementation is ready to support a controlled pilot. The v2.1 engine
remains an auditable, conservative rule set and must not be presented as an
expert-calibrated risk model.
