# ARCUS Project Bridge Profile v1

Date: 2026-08-27

Version: `arcus-project-bridge-profile-v1`

## Purpose

The Project Bridge Profile lets a Professional user declare known bridge
characteristics for a selected project point. It improves the ordering of
otherwise hazard-comparable historical failures without converting missing
asset information into inferred facts.

The profile is optional. A coordinates-only query remains valid and uses the
official point hazard signature without bridge-profile matching.

## Matching fields

The v1 matching contract accepts:

| Field | Production database coverage | v1 role |
|---|---:|---|
| `bridge_crossing_type` | 263 / 263 | unweighted tie-breaker |
| `material_type` | 263 / 263 | unweighted tie-breaker |
| `structural_type` | 263 / 263 | unweighted tie-breaker |
| `destination_use` | 263 / 263 | unweighted tie-breaker |

Only fields explicitly declared by the user are compared. All four fields have
equal status in v1: there is no fitted or expert-assigned weight.

## Descriptive fields

The interface also accepts:

- `bridge_length_m`;
- `piers_in_active_riverbed`.

They remain descriptive because production coverage is partial and the current
geometry audit classifies their value as `exploratory_signal_only`. They do not
select or rank analogues, qualify a Failure Learning Matrix row or modify an
evidence threshold.

Single-span versus multi-span is not included in v1 because the corresponding
historical field is not populated in the current 263-event database. ARCUS must
not expose a matching control that has no historical comparison basis.

## Retrieval order

The active hydraulic ordering is:

1. exact current official hydraulic highest class;
2. hydraulic class distance;
3. hydraulic class overlap;
4. number of exact matches among the declared bridge-profile fields;
5. number of declared fields that can be compared;
6. current landslide-class equality;
7. current seismic PGA distance;
8. source reliability;
9. deterministic event identifier.

The bridge profile therefore acts only after the hydraulic signature. It does
not exclude a candidate and cannot create an analogue where the official
hydraulic track is inactive.

## Safety and interpretation contract

- Missing target fields are not inferred or imputed.
- Invalid values are ignored and returned as explicit validation warnings.
- Historical collapse outcomes remain blocked during cohort selection.
- Inventory denominators and provincial collapse rates are not used.
- The profile does not modify evidence, episode or process thresholds.
- The profile does not modify the Failure Learning Matrix qualification.
- A profile match is similarity context, not evidence of causation or collapse
  probability.

## Output

The API, UI, JSON evidence package and PDF report expose:

- profile version;
- fields provided;
- fields used for matching;
- descriptive-only fields;
- invalid fields;
- candidate coverage;
- matching mode;
- exact profile matches for each retrieved analogue;
- confirmation that thresholds were not modified.

## Validation status

Implementation and deterministic behavior are covered by automated tests. The
engineering usefulness of the profile tie-breaker must be evaluated in the
blind expert-review workflow before stronger weights, filters or claims are
introduced.

### Local acceptance evidence — 2026-08-27

- The authenticated Professional UI exposed all six optional fields and kept
  their declared values through a map query. Explicit control identifiers and
  label associations were added after the browser acceptance pass identified
  an accessibility gap.
- A real map-selected Palermo point with no official hydraulic intersection
  preserved the four matching fields, abstained with zero strategies and did
  not emit browser console warnings or errors.
- The authenticated live endpoint was queried at P3
  (`37.67112259, 12.58006927`). ISPRA returned P1, P2 and P3, with P3 as the
  highest class and complete three-layer coverage. Collapse Intelligence
  returned `available`, one qualified scour investigation priority, 19
  hydraulic events and 13 independent episodes.
- For the same P3 query the profile remained an unweighted tie-breaker across
  176 eligible candidates; all four matching fields had 176 / 176 candidate
  coverage. Length and riverbed-pier fields remained descriptive and the output
  explicitly confirmed that no evidence or Failure Learning Matrix threshold
  was modified.
- The exact P3 coordinate was verified through the authenticated API in this
  pass; the browser UI remains click-only and does not provide a coordinate
  entry control. Exact coordinate rendering is therefore covered by the
  deterministic UI/report tests rather than a manual keyed-coordinate flow.

The implementation judgement remains `validated_with_limitations`: software
behavior is validated, but the engineering value of the tie-breaker is not yet
supported by a locked blind expert review.

Run:

```text
npm run test:project-bridge-profile
npm run test:mitigation-intelligence
npm run test:collapse-intelligence-report
npm run test:product-scope
```
