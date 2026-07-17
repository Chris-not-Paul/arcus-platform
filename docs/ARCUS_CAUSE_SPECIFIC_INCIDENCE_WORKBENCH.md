# ARCUS Cause-Specific Incidence Workbench

This workbench keeps the production Historical Collapse Incidence unchanged and designs experimental cause-specific indicators.

## Formula

```text
cause_specific_rate_per_100 =
documented cases in cause family / bridge denominator * 100

cause_specific_relative_to_national =
provincial cause-specific rate / national cause-specific rate
```

This is historical evidence, not probability.

## Families

Computed families:

- hydraulic;
- landslide_ground_movement;
- seismic;
- design_construction;
- impact;
- deterioration_maintenance;
- overload.

## Output Shape

Each province/family record includes:

```json
{
  "cause_family": "...",
  "numerator_count": 0,
  "denominator_count": null,
  "rate_per_100": null,
  "national_rate_per_100": null,
  "relative_to_national": null,
  "dataset_version": "...",
  "data_cutoff_date": "...",
  "denominator_confidence": "...",
  "numerator_evidence_strength": "...",
  "minimum_support_met": false
}
```

## Edge Cases

Handled explicitly:

- zero cases;
- denominator missing;
- small denominator;
- single event;
- uncertain taxonomy;
- unspecified cause.

## Normalization Families Compared

- raw rate;
- empirical percentile;
- log transform;
- winsorization;
- exploratory Bayesian smoothing.

Smoothing remains experimental. It preserves the raw value and exposes formula and prior. It must not be called collapse probability.

## Minimum Support

Current experimental support flag:

```text
minimum_support_met = numerator_count >= 3 and denominator_count >= 100
```

This threshold is not production-approved.
