# ARCUS Professional Path 01 - Validation Plan

> **SUPERSEDED AUDIT RECORD.** Path 01 was retired before production calibration; this plan is retained only to document prior reasoning. See `ARCUS_Product_Definition.md`.

This plan describes how to validate a future Path 01 screening methodology before any production scoring change.

No current formula, report structure or provider architecture is changed by this plan.

## Validation Goals

The methodology must prove that it:

- answers the screening question, not a structural safety question;
- keeps official hazard exposure separate from historical evidence;
- keeps confidence separate from hazard;
- does not treat unavailable data as zero;
- does not allow severe official hazard to be hidden by additive compensation;
- remains stable enough under reasonable weight changes;
- can be explained to technical and institutional clients.

## Minimum Test Corpus

The current workbench includes `32` deterministic synthetic scenarios. The set covers:

- hydraulic no-intersection, P1, P1/P2, P1/P2/P3;
- landslide AA-only, P1, P2, P3, P4, P3+AA, P4+AA;
- low, median, high and p95 PGA;
- zero HCI;
- missing denominator;
- high-confidence low incidence;
- small-denominator high leverage;
- provider partial/unavailable states;
- all-provider unavailable state;
- multi-hazard severe combinations.

## Required Live Reference Cases

The following already exist as live validation points and should be retained as regression references.

### Hydraulic ISPRA

| Case | Coordinates | Expected |
|---|---|---|
| P1-only | `38.94973151, 8.72300141` | P1 |
| P1/P2 | `38.94340710, 8.91222919` | P1, P2 |
| P1/P2/P3 | `37.67112259, 12.58006927` | P1, P2, P3 |
| Torino control | `45.28970, 7.94194` | no_intersection |

### Landslide ISPRA PAI

| Case | Coordinates | Expected |
|---|---|---|
| AA attention area | `36.82837857, 14.72710000` | AA only |
| P1 | `43.50846429, 10.33828571` | P1 |
| P2 | `44.40296071, 9.53897143` | P2 |
| P3 | `38.92257500, 8.78543214` | P3 |
| P4 | `40.10005714, 16.00375000` | P4 |
| Torino control | `45.28970000, 7.94194000` | no_intersection |

### Seismic INGV MPS04

| Case | Coordinates | Expected |
|---|---|---|
| Low reference area | `45.070300, 7.686900` | available PGA |
| Intermediate reference area | `43.616700, 13.516700` | available PGA |
| Higher reference area | `38.111300, 15.647300` | available PGA |
| Outside coverage | `52.000000, 7.000000` | outside_coverage |

## Acceptance Criteria

### Official Hazard Exposure

- P3 hydraulic must be visibly escalated in any candidate methodology.
- P4 landslide must not be downgraded by low HCI or low seismic exposure.
- AA must remain an attention flag and not be folded into P1-P4.
- PGA must be normalized only from documented MPS04 distribution logic.
- nearest-node distance must affect confidence only.
- a missing or mismatched MPS04 dataset version must block seismic banding;
- an official class without its matched-class provenance must make the
  assessment incomplete;

### Historical Evidence

- HCI must not be called hazard.
- zero documented collapses must remain distinct from missing denominator.
- missing denominator must create a data-quality flag.
- small denominator leverage must be visible in explanations.
- outlier provinces must not dominate official hazard exposure without review.

### Missing Data

- provider exception is not zero;
- partial source is not zero;
- outside coverage is not zero;
- all-provider unavailable produces incomplete assessment, not reassuring score.
- report navigation remains blocked while official queries are still loading;
- an incomplete assessment may expose a known evidence floor, never a complete
  or reassuring result.

### Client-Facing Language

Outputs must avoid:

- "safe";
- "unsafe";
- "probability of collapse";
- "structural adequacy";
- "NTC compliant";
- "site approved".

Allowed language:

- "requires specialist review";
- "major constraint";
- "official exposure";
- "historical evidence";
- "data availability";
- "screening priority".

## Sensitivity Review

The workbench compared five experimental weight configurations. Maximum rank delta was `12`.

Unstable scenarios:

```text
S04, S05, S14, S15, S16, S17, S19
```

Before production, each unstable scenario should be reviewed with domain experts. In particular:

- hydraulic P2/P3 sensitivity;
- high PGA-only sensitivity;
- combined hydraulic + seismic sensitivity.

## Manual Review Checklist

For each candidate methodology:

1. Confirm the decision question is still respected.
2. Confirm no official hazard source receives a production score unless approved.
3. Confirm P4 landslide cannot be compensated away.
4. Confirm P3 hydraulic cannot be compensated away.
5. Confirm AA is separate.
6. Confirm unavailable data is flagged.
7. Confirm HCI is evidence/modifier, not hazard.
8. Confirm report wording is compatible with institutional clients.
9. Confirm audit trail lists source, timestamp and provider status.
10. Confirm Path 02 ranking is unchanged unless explicitly scoped.

## Regression Commands

Current commands to run before and after any future scoring work:

```bash
npm run analyze:path01-methodology
npm run test:path01-methodology
npm run build:path01-calibration
npm run test:path01-calibration
npm run test:hazard
npm run test:hazard:seismic
npm run test:historical-incidence
npm run test:location
npm run test:backend
npm run lint
npm run build
```

## Human Approval Gates

No production scoring should be implemented until these are approved:

- normalization family per hazard;
- non-compensatory rule set;
- HCI role;
- confidence model;
- missing-data policy;
- report language;
- validation benchmark set;
- governance owner for future methodology changes.

The benchmark workflow and its provisional, fail-closed minimums are defined in
`docs/ARCUS_PATH01_CALIBRATION_PROTOCOL.md`. The infrastructure is implemented,
but the human approval gates remain open until the acceptance criteria are
governance-approved and the required independent reviews are completed.
