# ARCUS Path 01 Priority Formula Audit

> **SUPERSEDED AUDIT RECORD.** The audited formula was retired and removed; ARCUS no longer produces this priority index. See `ARCUS_Product_Definition.md`.

Status: legacy formula isolated; v2 candidate implemented in controlled
validation.

Formula version: `path01-priority-legacy-v1`.

## Current formula

```text
HCI score = min(100, round(relative_to_national * 16.67))

Final Priority Index = round(
  territorial proxy * 0.70 +
  HCI score * 0.30
)
```

The formula is now implemented once in `src/utils/path01Priority.js`. UI and
PDF consume the same result through `ProfessionalPage`. Missing or invalid
inputs return `not_computable`; Mitigation Intelligence and official point
hazard remain excluded, preserving the current production behavior.

## Dataset audit

`npm run audit:path01-priority` evaluated the current Professional province
profiles and AINOP index:

| Finding | Count |
|---|---:|
| Province profiles evaluated | 79 |
| Computable legacy FPI | 69 |
| Not computable because HCI denominator is unavailable | 10 |
| ARCUS historical dependency overlap | 69 |
| Linear HCI normalization saturated at 100 | 11 |
| Low or very-low denominator size class | 13 |

Every evaluated 70% component resolved to
`territorial_risk_historical_proxy`; none resolved to official point hazard.
The Pearson correlation between territorial proxy and HCI score is 0.2822,
but statistical correlation is not the main issue: both components are derived
from the same ARCUS collapse-event family and therefore are not independent
evidence layers.

## Defects requiring methodology change

1. The 70% component is labelled exposure/priority but is historical ARCUS
   context, not live ISPRA/INGV point exposure.
2. ARCUS event history enters both the territorial proxy and HCI, producing a
   dependency overlap.
3. `relative_to_national * 16.67` saturates every value above roughly six times
   the national rate and hides differences among outliers.
4. Small or very-small AINOP denominators can create a high HCI score; the
   confidence label is currently descriptive only.
5. A purely additive score can dilute P3 Hydraulic or P4 Landslide official
   exposure with low values from unrelated components.

## Recommended direction

Do not replace the legacy 70/30 formula with another arbitrary weighted sum.
The recommended Path 01 contract is:

- official Hydraulic, Landslide and Seismic exposure kept as separate source
  components;
- non-compensatory screening tiers for P3 Hydraulic, P4 Landslide and severe
  multi-hazard combinations;
- provider failures represented as `incomplete_assessment`, never zero;
- Historical Collapse Incidence shown as a separate evidence band or modifier,
  normalized empirically and accompanied by a denominator size class;
- Mitigation Intelligence kept outside the Final Priority Index;
- explicit calibration and engineering approval before a new numeric index is
  labelled production-ready.

The recommended contract is now implemented as
`path01-preliminary-point-screening-v2.1-candidate` and documented in
`docs/ARCUS_PATH01_SCREENING_V2.md`. UI and reports present its
non-compensatory tier as the primary Path 01 screening output while retaining
`path01-priority-legacy-v1` only as an explicit audit comparison. The v2
candidate does not claim production calibration until the documented expert
review and real-point acceptance are complete.
