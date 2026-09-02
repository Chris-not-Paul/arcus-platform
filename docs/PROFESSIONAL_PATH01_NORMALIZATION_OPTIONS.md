# ARCUS Professional Path 01 - Normalization Options

> **SUPERSEDED AUDIT RECORD.** These options are not part of the canonical ARCUS product. See `ARCUS_Product_Definition.md`.

This document compares normalization families for a future Path 01 methodology. It does not approve or implement a production formula.

## Output Boundary

Candidate label:

```text
Preliminary Point Screening Priority
```

The candidate output answers a screening question: whether the selected site requires specialist studies and mitigation attention before design or realization of a new crossing infrastructure.

It must not be presented as structural risk, collapse probability, safety verification, NTC conformity or final site suitability.

## Hydraulic Exposure

Current official input:

```text
ISPRA WFS P1/P2/P3 -> matched_classes -> highest_class
```

Current production status:

```text
normalized_score = null
```

### Option H1 - Ordinal Linear

| Input | Experimental normalized value |
|---|---:|
| no_intersection | 0 |
| P1 | 33.33 |
| P2 | 66.67 |
| P3 | 100 |
| partial/unavailable | null + incomplete flag |

Pros: simple and transparent.

Cons: assumes equal distance between P1, P2 and P3.

### Option H2 - Conservative Nonlinear

| Input | Experimental normalized value |
|---|---:|
| no_intersection | 0 |
| P1 | 20 |
| P2 | 55 |
| P3 | 100 |
| partial/unavailable | null + incomplete flag |

Pros: makes P3 visibly dominant.

Cons: still requires expert approval of the curve.

### Option H3 - Rule-Based P3 Flag

P3 produces:

```text
hydraulic_p3_major_constraint
detailed_study_required
```

Pros: prevents P3 from being diluted by low values elsewhere.

Cons: requires explicit governance because it changes interpretation from continuous score to tier/constraint.

## Landslide Exposure

Current official input:

```text
ISPRA PAI WFS -> AA/P1/P2/P3/P4 -> highest_hazard_class + attention_area
```

Current production status:

```text
normalized_score = null
```

AA is not part of the ordered P1-P4 scale and must remain separate.

### Option L1 - Ordinal Linear

| Input | Experimental normalized value |
|---|---:|
| no_intersection | 0 |
| P1 | 25 |
| P2 | 50 |
| P3 | 75 |
| P4 | 100 |
| AA only | 0 + attention flag |
| partial/unavailable | null + incomplete flag |

Pros: easy to explain.

Cons: P4 can still be compensated in additive models.

### Option L2 - Conservative Nonlinear

| Input | Experimental normalized value |
|---|---:|
| no_intersection | 0 |
| P1 | 15 |
| P2 | 40 |
| P3 | 70 |
| P4 | 100 |
| AA only | 0 + attention flag |
| partial/unavailable | null + incomplete flag |

Pros: better expresses increasing concern without treating AA as hazard.

Cons: still needs calibration.

### Option L3 - Rule-Based P4 Flag

P4 produces:

```text
landslide_p4_critical_hazard
critical_specialist_review
detailed_study_required
```

P3+AA produces a separate attention note but not automatic P4 equivalence.

Pros: prevents P4 from becoming low because other components are low.

Cons: requires domain approval and report wording discipline.

## Seismic Exposure

Current official input:

```text
INGV MPS04 PGA p50 in g, 10% probability of exceedance in 50 years
```

Current production status:

```text
normalized_score = null
```

Observed MPS04 p50 distribution:

| Metric | Value |
|---|---:|
| Count | 16,921 |
| Min | 0 g |
| Median | 0.0869 g |
| p75 | 0.1551 g |
| p90 | 0.2046 g |
| p95 | 0.2417 g |
| Max | 0.278 g |

### Option S1 - Empirical Percentile / CDF

The score is the percentile rank of the selected PGA inside the processed MPS04 grid.

Pros:

- national-distribution aware;
- avoids arbitrary low/medium/high thresholds;
- deterministic with the current grid.

Cons:

- percentile is relative to the selected dataset, not a physical engineering threshold.

### Option S2 - Robust Min-Max p5-p95

```text
score = clamp((pga - p5) / (p95 - p5) * 100)
```

Pros:

- reduces influence of extreme tails;
- easy to reproduce.

Cons:

- values above p95 saturate;
- requires acceptance of p5/p95 as clipping bounds.

### Option S3 - Nonlinear Percentile

```text
score = sqrt(empirical_percentile / 100) * 100
```

Pros:

- gives mid-high values more attention.

Cons:

- more subjective;
- requires a clear policy reason.

### Seismic Confidence

Nearest-node distance affects confidence, not physical PGA. It should be reported as data quality, not as a hazard reduction factor.

## Historical Collapse Incidence

Current input:

```text
ARCUS documented collapses / bridge denominator * 100
relative_to_national = provincial_rate / national_rate
```

This is historical evidence, not hazard and not collapse probability.

Observed distribution:

| Variable | Median | p90 | p95 | Max |
|---|---:|---:|---:|---:|
| Provincial rate per 100 | 0.294 | 3.753 | 18.6425 | 100 |
| Relative to national | 0.525 | 6.68 | 33.1675 | 177.94 |

### Option C1 - Percentile Rank

Ranks the selected province against available provinces.

Pros: robust for skewed distributions.

Cons: hides absolute magnitude.

### Option C2 - Log Transform

```text
score = log1p(relative_to_national) / log1p(max_relative_to_national) * 100
```

Pros: compresses outliers.

Cons: depends on current maximum.

### Option C3 - Winsorized Relative Incidence

```text
score = min(relative_to_national, p95) / p95 * 100
```

Pros: limits extreme outlier leverage.

Cons: p95 choice needs approval.

### Option C4 - Empirical Classes

| Percentile | Experimental class |
|---|---:|
| 0 | 0 |
| >0 to <50 | 25 |
| 50 to <75 | 50 |
| 75 to <90 | 75 |
| >=90 | 100 |

Pros: stable and explainable.

Cons: coarse.

## Missing And Partial Data

Mandatory treatment:

- `no_intersection` is a valid source result.
- `partial` is not zero.
- `provider_exception` is not zero.
- `outside_coverage` is not zero.
- missing denominator is not zero incidence.
- zero documented events is distinct from missing denominator.

## Selected Direction For Controlled Validation

The v2.1 candidate combines:

- an empirical reference band for seismic PGA, kept outside the ISPRA tier;
- non-compensatory triggers for P3 hydraulic and P4 landslide;
- HCI as a separate historical evidence band with no effect on the site tier;
- explicit confidence flags.

The point tier itself is the maximum ISPRA Hydraulic/Landslide class. Severe
multi-hazard signals produce an integrated-study flag and never a numerical
`+1`.

The canonical contract is documented in
`docs/ARCUS_PATH01_SCREENING_V2.md`. It remains a controlled-validation
candidate until specialist review and real-point UI/report acceptance are
complete.
