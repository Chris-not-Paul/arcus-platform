# ARCUS Professional Path 01 - Critical Review of Screening v2.1

> **SUPERSEDED AUDIT RECORD.** This review is retained as evidence for the decision to retire the screening model. See `ARCUS_Product_Definition.md`.

Date: 2026-08-25.

Status: objective methodology review; no production-calibration claim.

## Executive judgement

The v2 candidate is materially safer and more truthful than the legacy 70/30
index. It removes double counting, prevents severe official classes from being
diluted, separates historical context and fails closed on missing provider
data.

It is not yet a calibrated risk model. Its current 0-4 output is a deterministic
workflow rule that maps heterogeneous observations onto a common ordinal scale.
The implementation is coherent with its own contract, but that contract has
not yet been validated against independent engineering decisions.

The recommended direction is not to search for better weights. ARCUS should
retain three separate decision axes:

1. official hazard observations and hazard-specific follow-up flags;
2. documented historical and analogue evidence, with coverage limitations;
3. data completeness and provenance.

An overall client-facing output may summarize required follow-up, but it should
not imply a universal physical severity score.

## What is already defensible

- ISPRA Hydraulic and Landslide observations remain raw and traceable.
- INGV MPS04 PGA remains visible in `g` and is not called collapse probability.
- `no_intersection`, provider failure and missing denominator are distinct.
- P3 Hydraulic and P4 Landslide are not averaged with lower values.
- Historical Collapse Incidence does not modify the v2 site tier.
- Mitigation Intelligence remains outside the screening result.
- A provider failure produces `incomplete_assessment`, not zero.
- The legacy 70/30 formula is isolated as an audit comparison.

## Critical findings

### 1. A point is not a bridge footprint

Path 01 queries one coordinate. A real crossing can extend across abutments,
piers, approaches and a corridor that intersects polygons not assigned to the
selected centre point. Therefore `no_intersection` is a valid point result, but
not a complete site or asset result.

Risk: false reassurance near polygon boundaries or for long crossings.

Recommendation:

- call the current result `official point screening`;
- retain nearby context as non-scoring evidence;
- add footprint, alignment or multi-point sampling only in a separately
  validated future version.

### 2. The common 0-4 scale has no demonstrated cross-hazard equivalence

Hydraulic P2, Landslide P2 and a central/high seismic percentile do not measure
the same physical quantity. Assigning them the same workflow level is useful
for UI ordering, but it is not evidence that they require equivalent technical
effort or represent equivalent risk.

Risk: users interpret ordinal workflow levels as comparable hazard severity.

Recommendation:

- keep the numeric level internal during validation;
- show the governing raw observation and hazard-specific action in the UI;
- validate any common follow-up class against independent specialist judgement.

### 3. Seismic bands are relative, not engineering thresholds

The current cut points are empirical percentiles of 16,921 MPS04 grid nodes:
`p25 = 0.0527 g`, `p75 = 0.1551 g`, `p90 = 0.2046 g`. They describe position
inside the processed national distribution, not NTC design classes, local site
response or structural demand. The grid spacing is 0.05 degrees and the value
is sampled from the nearest reference-ground node.

Risk:

- a small change across a percentile boundary changes the displayed reference
  band, although it no longer changes the ISPRA tier;
- the same PGA can change band if the reference grid or sampled population
  changes;
- a nearest-node regional value appears comparable to polygon intersection at
  the project point.

Recommendation:

- display PGA and national percentile as reference context;
- do not let the seismic percentile set a universal action level until seismic
  specialists approve the decision link;
- rename its source role from point exposure to reference-grid hazard.

### 4. Multi-hazard `+1` escalation was precautionary but uncalibrated

The earlier v2 candidate increased the overall level by one when two
components reached level 3. That avoided compensation, but assumed an
interaction magnitude not derived from observed outcomes or engineering
guidance. V2.1 removes this increase.

Risk: Hydraulic P3 plus Landslide P3 is labelled critical even though the
evidence currently supports only the need for an integrated study, not a
quantified increase in severity.

Recommendation:

- retain `multi_hazard_integrated_study_required` as an explicit flag;
- do not increase the universal level unless expert review supports that rule.

### 5. HCI is not a temporal incidence rate

The numerator contains documented collapses over 2000-2026. The denominator is
the currently available AINOP bridge count. It is not bridge-years at risk and
does not reconstruct changes in the bridge stock over time.

Additional limitations:

- documentation completeness varies by territory and period;
- the numerator may contain asset categories whose alignment with the AINOP
  road-plus-rail denominator has not been proved; 27 of 263 current records are
  labelled `Cycle-pedestrian` and 9 are labelled `Railway`;
- current confidence is based only on denominator size, not AINOP coverage,
  numerator completeness or temporal comparability.

Risk: the term `Historical Collapse Incidence` sounds more inferential than the
data support.

Recommendation:

- rename the client-facing measure to `Documented Collapse Context` or
  `documented events per 100 currently listed AINOP bridges`;
- keep numerator and denominator visible;
- do not interpret it as probability, frequency per year or complete stock
  vulnerability;
- audit numerator/denominator asset-scope compatibility before using rankings.

### 6. Small denominators create extreme raw values

Current examples include:

| Province | Events | AINOP denominator | Raw events per 100 | Relative to national | Size confidence |
|---|---:|---:|---:|---:|---|
| Crotone | 2 | 2 | 100.00 | 171.23x | very low |
| Enna | 3 | 4 | 75.00 | 128.42x | very low |
| Palermo | 3 | 13 | 23.08 | 39.52x | very low |

The UI discloses low confidence, but a `very high` band can still dominate the
reader's attention.

Recommendation:

- suppress national ranking when denominator quality is low or very low;
- show the raw fraction first;
- evaluate interval or shrinkage methods only after the denominator is proven
  to represent a compatible bridge stock.

Implemented client rule: national rank and percentile are suppressed when the
denominator size class is `low` or `very_low`; the raw numerator, denominator
and ratio remain visible, with the raw fraction shown first. Those cases use
the band `limited_denominator_documented_context` instead of an extreme
national-incidence label. This is a presentation safeguard, not a statistical
correction of the underlying coverage limitation.

### 7. Percentile ties were ranked arbitrarily - corrected

The previous AINOP index assigned sequential ranks after sorting equal rates
alphabetically. Thirty-seven zero-rate provinces consequently received
different ranks and percentiles despite having the same observed rate.

Risk: false differences between statistically tied provinces.

Implemented result: the 37 zero-rate provinces now share rank 70, percentile
17.1 and tie count 37. Provinces without an AINOP denominator have explicit
`null` rank, percentile and tie count; they are no longer coerced to rate zero.

### 8. Current validation proves consistency, not efficacy

The 32 synthetic scenarios and seven canonical checks verify that the code
implements the written rules. The three live points verify provider/UI/report
coherence. Neither test establishes that the resulting follow-up class matches
independent engineering judgement or improves decisions.

Seven scenarios were unstable under the experimental additive alternatives:
S04, S05, S14, S15, S16, S17 and S19. This supports rejecting weighted sums,
but it does not validate the selected tier boundaries.

Recommendation: use a blinded specialist benchmark before removing the
`candidate` suffix.

## Proposed v2.1 architecture

### Axis A - Official observations

Keep separate, without a blended physical score:

- Hydraulic: point class, matched classes, completeness and nearby context;
- Landslide: point class, AA, completeness and nearby context;
- Seismic: PGA, reference distribution band, nearest-node distance and dataset
  version.

### Axis B - Required follow-up

Return hazard-specific flags rather than inferred prescriptions:

- `hydraulic_specialist_screening`;
- `landslide_specialist_screening`;
- `seismic_reference_review`;
- `detailed_hazard_study_required`;
- `multi_hazard_integrated_study_required`;
- `assessment_incomplete`.

Any overall label should describe workflow urgency, not risk or safety. The
governing observation must always be shown beside it.

### Axis C - Historical and mitigation evidence

Keep separate from the official point result:

- documented event numerator and current AINOP denominator;
- denominator coverage/size status;
- analogue retrieval status;
- raw and effective evidence;
- strategies or explicit abstention.

Historical evidence may shape the investigation checklist and evidence search.
It should not change the official point hazard class.

## Recommended revision sequence

### Phase 1 - Methodologically neutral corrections - implemented

1. provider `assessment_complete` is honoured explicitly in the v2 engine;
2. equal HCI rates share rank and percentile, while unavailable rates have no
   ranking;
3. client-facing denominator `confidence` is labelled denominator-size class;
4. the legacy 70/30 value is removed from the client-facing UI and point report
   while remaining available to internal audit tools;
5. the current output is named `point screening` until geometry is supported;
6. the standalone province-only exporter is explicitly marked as a legacy
   provincial briefing and not as the v2 point result.

### Phase 2 - Conservative v2.1 rule revision - implemented

1. retain maximum known official observation without averaging;
2. replace multi-hazard `+1` with an integrated-study flag;
3. keep seismic PGA/band separate from the common tier pending specialist
   approval;
4. expose the governing hazard and complete reasoning chain in UI and PDF.

### Phase 3 - Independent calibration - infrastructure implemented, review pending

Build a stratified benchmark of real points and boundary cases. Hydraulic,
geotechnical and seismic specialists should independently assign required
follow-up before seeing the ARCUS output. Evaluate under-triage, over-triage,
agreement and disagreement by hazard. Acceptance criteria must be fixed before
the review begins.

The fail-closed benchmark infrastructure is now implemented and documented in
`docs/ARCUS_PATH01_CALIBRATION_PROTOCOL.md`. It registers and admits 14 real
candidate points to a blind-workflow pilot after live Hydraulic/Landslide
enrichment. Three Sardinian cases preserve the official seismic
`outside_coverage` outcome as incomplete assessments instead of inventing PGA.
No independent specialist review or adjudication has yet been collected, so
the generated assessment correctly remains `not_ready_for_calibration` and
forbids a calibration claim.

### Phase 4 - Historical-context rehabilitation

Audit AINOP coverage and numerator compatibility, correct tied rankings, and
decide whether an uncertainty model is defensible. Until then, use descriptive
historical context rather than a risk modifier.

## Current decision

Phases 1 and 2 are implemented in the controlled-validation candidate. The
level is now governed only by the maximum ISPRA Hydraulic/Landslide point
class; INGV PGA is a separate reference axis; multi-hazard combinations add an
integrated-study flag without a `+1`. Governing observations, required
follow-up and the deterministic reasoning trace are exposed to the UI and PDF.

Do not tune weights or convert historical or seismic context back into the
ISPRA point tier. Phase 3 independent calibration remains necessary before the
`candidate` suffix can be removed.

The new calibration gate verifies corpus provenance, blind-output separation,
metric calculation and fail-closed claims. Passing that software gate does not
mean the scientific calibration has passed; it means the system refuses to
claim calibration while the documented evidence is insufficient.

The v2.1 browser regression used a real L'Aquila point with no ISPRA Hydraulic
or Landslide class and `0.261 g` in the high national seismic reference band.
The result remained level 0 on the ISPRA axis, exposed the high PGA separately
and required `seismic_reference_review`, confirming that seismic context no
longer inflates the point tier.
