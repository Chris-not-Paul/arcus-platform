# ARCUS Professional Path 01 - Release Readiness

> **SUPERSEDED AUDIT RECORD.** Path 01 and its priority/screening implementation were retired from the canonical ARCUS product on 2026-08-25. See `ARCUS_Product_Definition.md`.

Status: functionally complete for controlled Professional Path 01 use;
Preliminary Point Screening v2.1 remains a controlled-validation candidate.

Target closure window: 2026-08-25, with 2026-08-26 reserved only for live
provider rechecks or presentation corrections.

## Frozen scope

The release scope is Professional Path 01. It includes point-derived location,
official Hydraulic/Landslide/Seismic exposure, provincial historical context,
Mitigation Intelligence, working package and structured report.

It does not include Path 02, new collapse records, back-cast historical
classes or automatic prescriptions. The legacy Final Priority Index 70/30 is
preserved only in internal audit tooling; the primary Path 01 output is the
non-compensatory Preliminary Point Screening v2.1 candidate.

## Definition of done

Path 01 is considered functionally complete when:

1. the province and working package derive from the validated point;
2. official exposure distinguishes intersection, nearby context, outside
   coverage and provider failure without converting one state into another;
3. Hydraulic Mitigation Intelligence emits only qualified or generic outputs
   under its validated contract;
4. Landslide and Seismic support abstain explicitly while evidence or expert
   validation is insufficient;
5. UI, API and PDF report the same status, evidence totals, strategies or
   abstention reasons;
6. no output claims collapse probability, safe/unsafe classification,
   normalized mitigation score or automatic design prescription;
7. every mitigation output remains separate from both v2.1 screening and the
   legacy Final Priority Index;
8. navigation and report export stay blocked while official queries are
   loading;
9. the deterministic release gate and documented live acceptance pass.

## Single release gate

Run:

```text
npm run validate:professional-path01
```

The gate executes location, hazard exposure, historical incidence, Path 01
methodology, the fail-closed calibration benchmark, Hydraulic/Landslide/Seismic
intelligence, evidence-intake, Open/Professional boundary, backend, lint,
production build and whitespace checks. A failed check returns `not_ready`.

Live provider availability is deliberately not made a deterministic build
dependency. It is covered by the recorded browser acceptance and must be
rechecked when provider behavior or the UI/API contract changes.

## Accepted scientific limits

- Hydraulic is the only strategy-producing hazard track.
- Landslide has three eligible independent episodes and remains abstention-only.
- Seismic has one eligible independent episode and remains abstention-only.
- Current MPS04 PGA is reference exposure, not historical shaking or collapse
  probability.
- Eleven inferred Hydraulic episode groups retain editorial review or review
  recommendation.
- Remote ISPRA availability can be intermittent; provider failure is surfaced
  rather than replaced with invented data.

These are declared evidence or provider limitations. They do not represent
silent software fallback or missing UI/report propagation.

## Release judgement

The admissible judgement remains `validated_with_limitations` when all
deterministic checks pass and the latest recorded live acceptance remains
coherent. This judgement covers the Professional workflow, not expert
calibration of the v2 tier rules. `validated` would overstate the available
Landslide and Seismic mitigation evidence and the current calibration status;
`not_ready` applies if a software, API, UI, report or release-gate check fails.

## Final gate execution

Execution date: 2026-08-25.

`npm run validate:professional-path01` completed with 17 of 17 checks passing:
location, multi-hazard exposure, seismic reference exposure, historical
incidence, Path 01 methodology, Path 01 priority contract, the calibration
benchmark contract, Hydraulic Intelligence, Landslide support, Seismic support,
Seismic evidence intake, Mitigation Intelligence v4, Open/Professional
separation, backend, lint, production build and `git diff --check`.

The calibration check passes because it verifies deterministic generation,
blind-package separation, metric behavior and the refusal to claim calibration
with insufficient evidence. Its scientific assessment remains
`not_ready_for_calibration`: 14/60 pilot cases, including three traceable
incomplete seismic assessments, 0 expert reviews, 0 adjudications and 0 holdout
cases. This does not invalidate the software release gate, but it prevents
removal of the controlled-validation limitation.

The first execution exposed one stale test assumption: it expected the Open
Hydraulic outcome and an audited Professional correction to be identical. The
test now permits that difference only when the Open value is preserved exactly
as `previous_hydraulic_intelligence` in the Professional curation provenance.
The underlying Open record, Professional correction, retrieval exclusions,
strategies and Final Priority Index were not changed.

Final release judgement: `validated_with_limitations`.
