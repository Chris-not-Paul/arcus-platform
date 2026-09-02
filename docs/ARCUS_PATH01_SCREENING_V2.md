# ARCUS Professional Path 01 - Preliminary Point Screening v2.1

> **SUPERSEDED AUDIT RECORD.** This candidate screening model was retired and is not part of the canonical product. See `ARCUS_Product_Definition.md`.

Status: candidate engine in controlled validation.

Version: `path01-preliminary-point-screening-v2.1-candidate`.

## Decision supported

The engine answers one bounded question:

> How strongly do the official observations available at the selected point
> require specialist follow-up before design or construction of a crossing?

It does not estimate structural risk, collapse probability, safety, design
compliance or final site suitability.

## Why the output is not a 0-100 score

The available inputs have different meanings and are not interchangeable:

- ISPRA hydraulic and landslide classes are official point intersections;
- INGV MPS04 PGA is a reference-ground seismic hazard value;
- ARCUS/AINOP Historical Collapse Incidence is province-level historical
  context;
- provider availability and denominator size class describe data quality.

Adding these values would introduce false precision. It could also dilute a
severe official class with unrelated low values. V2.1 therefore derives its
tier only from ISPRA point classes and keeps seismic, historical and mitigation
evidence visible as separate axes.

## Official component levels

The numeric level is an ordinal workflow level, not a physical risk score.

| Level | Workflow meaning |
|---:|---|
| 0 | Baseline screening |
| 1 | Targeted screening |
| 2 | Elevated review |
| 3 | Major constraint review |
| 4 | Critical specialist review |

### Hydraulic - ISPRA

| Point result | Level |
|---|---:|
| `no_intersection` | 0 |
| P1 | 1 |
| P2 | 2 |
| P3 | 3 |
| incomplete/provider failure | unknown, assessment incomplete |

`no_intersection` means that the selected point is not assigned an official
P1/P2/P3 class in the queried dataset. It is a valid observation, but it is
not proof of zero hydraulic hazard.

### Landslide - ISPRA PAI

| Point result | Level |
|---|---:|
| `no_intersection` | 0 |
| P1 | 1 |
| P2 | 2 |
| P3 | 3 |
| P4 | 4 |
| incomplete/provider failure | unknown, assessment incomplete |

AA remains a separate attention-area flag. It is never converted into or
silently ranked as a P1-P4 class.

### Seismic - INGV MPS04

The raw `pga_p50_g` remains the authoritative displayed value. For reference
context only, v2.1 assigns a relative national band using the processed
`MPS04-OPCM3519-1B-ag-005` distribution:

| PGA p50 | Relative band | Internal reference index |
|---|---|---:|
| up to national p25, 0.0527 g | lower national band | 0 |
| above p25 through p75, 0.1551 g | central national band | 1 |
| above p75 through p90, 0.2046 g | elevated national band | 2 |
| above p90 | high national band | 3 |

These are dataset-relative workflow bands, not NTC site classifications and
not physical safety thresholds. They never set or increase the ISPRA point
screening tier. An elevated or high band creates
`seismic_reference_review`; it does not create a common risk level.
Nearest-node distance affects confidence, not
the PGA value. ARCUS applies the band only when the observation declares the
same dataset version used to derive the thresholds and the PGA lies inside the
documented grid range `0-0.278 g`. A missing or different version blocks the
classification. A missing nearest-node distance preserves the known PGA band
as an evidence floor but marks the assessment incomplete.

## Aggregation contract

The screening level is the maximum known ISPRA Hydraulic or Landslide point
class. It is not an average. INGV PGA, historical context and Mitigation
Intelligence are explicitly excluded from the tier.

Non-compensatory rules:

- hydraulic P3 creates the `hydraulic_p3_major_constraint` trigger;
- landslide P4 creates the `landslide_p4_critical_hazard` trigger;
- two or more severe signals create
  `multi_hazard_integrated_study_required` without raising the tier;
- a level of 3 or 4 creates `detailed_study_required`;
- any missing official provider creates `incomplete_assessment`.

The output also returns:

- `decision_basis.governing_observations`, including hazard, raw point result
  and governing level;
- `required_follow_up`, with hazard-specific and integrated-study actions;
- `decision_trace`, a deterministic reasoning chain suitable for UI, report
  and audit comparison;
- `components.seismic.influence_on_screening_tier = none`.

When one source is missing, ARCUS preserves the maximum level observed from
the sources that did respond. This value is a known evidence floor, not a
complete assessment. Missing data is never converted to zero.

The same fail-closed rule applies when `highest_class` conflicts with the
returned class list, a class is returned without its matched-class provenance,
or a provider reports `no_intersection` together with an assigned class.

## Historical Collapse Incidence

HCI remains visible as a separate evidence band with:

- numerator;
- AINOP denominator;
- relative-to-national rate;
- national percentile when available;
- denominator size class;
- warnings for unavailable, low or very-low denominator size.

Its influence on the v2.1 point tier is always `none`. This prevents a historical
outlier or an under-counted denominator from inflating official point hazard,
without hiding the historical evidence from the user.

Zero documented collapses and missing denominator remain distinct outcomes.
Neither is interpreted as proof of safety or absence of hazard.
The historical band is not computable unless numerator, positive denominator
and relative-to-national rate are all present. A missing numerator is not
silently interpreted as zero documented collapses.

## Workflow gating

Validating the project point starts the official Hydraulic, Landslide and
Seismic query. Navigation to the following steps and report downloads remain
blocked while those sources are still loading. A completed provider failure
may still produce a report, but it is explicitly labelled
`incomplete_assessment`; the known tier is shown only as an evidence floor.

`baseline_screening` is not a safety judgement and does not mean zero hazard.
It means only that the completed official observations did not produce a
higher workflow level under this contract.

## Internal legacy audit

`path01-priority-legacy-v1` remains available to internal audit scripts during
controlled validation. The former 70/30 value is not shown in the Path 01 UI or
client report and must not be presented as a current decision output.

## Excluded from the engine

- Mitigation Intelligence strategies;
- nearby official context not assigned to the selected point;
- collapse probability;
- safe/unsafe classification;
- automatic prescriptions;
- normalized mitigation score;
- Path 02 asset ranking.

## Validation requirements

Before removing the `candidate` suffix, ARCUS must complete:

1. deterministic tests for every class, provider failure and boundary;
2. the 32-scenario methodology matrix;
3. UI and PDF coherence checks on real points;
4. retrospective review of representative sites by hydraulic, geotechnical
   and seismic specialists;
5. acceptance of terminology and escalation rules by the methodology owner.

## Live UI spot acceptance - 2026-08-25

The current candidate was exercised through the local Professional Path 01 UI
against live ISPRA responses and the local INGV reference grid.

| Case | Coordinates | Official observations | Historical context | V2.1 result | Coherence |
|---|---|---|---|---|---|
| Torino no-intersection control | `45.28970000, 7.94194000` | Hydraulic no class at point; Landslide no class at point; PGA `0.041 g` | 40 documented events; HCI `5.33x`, high-confidence denominator | `baseline_screening`, level 0/4, complete | High HCI did not inflate the site tier; the UI explicitly states that baseline is not proof of safety or zero hazard. |
| Trapani hydraulic P3 | `37.67112259, 12.58006927` | Hydraulic `P1, P2, P3`, highest `P3`; Landslide no class at point; PGA `0.062 g` | 2 documented events; HCI `1.1x`, high-confidence denominator | `major_constraint_review`, level 3/4, complete | P3 remained non-compensatory and was not diluted by the other components. |
| Potenza landslide P4 | `40.10005714, 16.00375000` | Hydraulic no class at point; Landslide `P4`; PGA `0.262 g` | 0 documented events; HCI `0x`, high-confidence denominator | `critical_specialist_review`, level 4/4, complete | Zero documented collapses did not reduce P4. |
| L'Aquila high-seismic separation | `42.34980000, 13.39950000` | Hydraulic no class at point; Landslide no class at point; PGA `0.261 g`, high national reference band | 4 documented events / 192 current AINOP denominator | `baseline_screening`, level 0/4, complete; `seismic_reference_review` | High PGA remained visible and created follow-up without changing the ISPRA tier. Governing observations and the full decision trace were coherent in UI, working package and five-page PDF. |

For all three cases the point-derived province, source completion, working
package and report summary were coherent. Navigation and downloads were
disabled while providers were loading. No browser console errors or warnings
were observed during the checks. The v2.1 L'Aquila check also found and fixed
one report wording defect: a concentrated earthquake cluster had inherited a
hydraulic-only `flood scenario` sentence. The corrected text now follows the
dominant trigger and is covered by a deterministic regression check.
