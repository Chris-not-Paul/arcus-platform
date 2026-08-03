# ARCUS Mitigation Intelligence v2

Status: implemented with a controlled production gate.

Engine version: `arcus-mitigation-intelligence-v2`.

This document records the v2 national analogue foundation. The active engine
is v3; its episode-independence control and current thresholds are documented
in `ARCUS_MITIGATION_INTELLIGENCE_V3.md`.

## Decision question

The hydraulic vertical slice answers:

> Which documented bridge collapses across Italy have a current official hazard signature most comparable with the validated project point, and which investigation priorities are supported by the outcomes observed in that fixed analogue cohort?

The engine does not estimate collapse probability, classify a bridge as safe or
unsafe, prescribe a design solution, or modify the Final Priority Index.

## Three evidence layers

ARCUS keeps three concepts separate:

1. **Current official signature**: current ISPRA hydraulic and landslide
   exposure and current INGV MPS04 PGA at the project or collapse location.
   It supports present-day comparability only.
2. **Historical class at the event date**: an official classification valid
   when the collapse occurred. It is reported only when an authenticated,
   dated source is registered.
3. **Observed or curated outcome**: trigger, failure process and affected
   component in the ARCUS collapse record.

The current class is never back-cast to the collapse year. A similar current
signature is not proof that the same historical loading occurred or caused the
collapse.

## Retrieval contract

The candidate cohort is national. Province is retained as local historical
context but is not a retrieval filter.

Candidates are selected and ranked before any collapse outcome field is read.
The deterministic lexicographic order is:

1. equality of current hydraulic `highest_class`;
2. distance between current hydraulic classes;
3. overlap of current hydraulic classes;
4. equality of the current landslide point class;
5. absolute difference in current MPS04 PGA;
6. source reliability;
7. event ID as deterministic tie-breaker.

This is not a composite risk score. The following outcome fields are explicitly
excluded from selection:

- trigger;
- failure process;
- affected component;
- evidence level;
- specific cause.

Only after the analogue cohort is fixed may ARCUS aggregate these outcomes to
support process-specific or generic hydraulic investigation pathways.

## Production gate

National retrieval is used for mitigation only when:

- current official hydraulic signatures cover at least 80% of the collapse
  database; and
- at least three eligible analogues are available for the selected point.

Below the gate, ARCUS uses the existing point-derived provincial cohort and
labels it `controlled provincial fallback`. It never silently mixes a partially
enriched national sample with the production evidence cohort.

The historical-at-event registry is not required to activate current-signature
retrieval. Missing historical classes remain an explicit interpretive
limitation and are returned as `not_available_not_reconstructed`.

## Current readiness

The reproducible audit command is:

```powershell
npm run audit:collapse-analogues
```

At the latest local audit:

| Field | Coverage |
| --- | ---: |
| Collapse coordinates | 263 / 263 (100%) |
| Exact locations | 249 / 263 (94.68%) |
| Curated hydraulic intelligence | 211 / 263 (80.23%) |
| Observed or curated triggers | 263 / 263 (100%) |
| Structural material and typology | 263 / 263 (100%) |
| Current official hydraulic signatures | 263 / 263 (100%) |
| Current official landslide signatures | 263 / 263 (100%) |
| Current official seismic signatures | 263 / 263 (100%) |
| Authenticated historical-at-event classes | 0 / 263 (0%) |

The authorised enrichment completed on 2026-08-03 for all 263 coordinates with
zero process errors. Hydraulic outcomes are 176 `available` and 87
`no_intersection`; highest classes are P3 for 141 events, P2 for 27 and P1 for
8. Landslide outcomes are 44 `available` and 219 `no_intersection`. Seismic
outcomes are 248 `available` and 15 `outside_coverage` from the local MPS04
grid.

The national production gate is therefore open. An individual Path 01 request
still requires an official hydraulic intersection at the project point and at
least three eligible analogues; otherwise the engine abstains or uses its
explicit fallback according to the documented contract.

## Path 01 and report

Path 01 shows:

- whether the evidence cohort is national or the controlled provincial
  fallback;
- current national signature coverage and the 80% activation threshold;
- local provincial collapse context separately from national analogues;
- up to five analogue records when national retrieval is active;
- the current hydraulic class, PGA difference and historical-class
  availability for each displayed analogue;
- the non-retrospective and non-causal caveat.

The Professional report repeats the cohort basis, analogue table when active,
raw/effective evidence, strategies or abstention, and the warning that the
output is non-prescriptive and does not change the Final Priority Index.

## Supported scope

The first production strategy slice remains hydraulic. Landslide and seismic
signatures improve analogue comparison but do not yet generate independent
mitigation strategies. Path 02, the 70/30 formula and Historical Collapse
Incidence remain outside this engine.
