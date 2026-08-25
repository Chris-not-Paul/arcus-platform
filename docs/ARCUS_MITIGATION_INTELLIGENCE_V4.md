# ARCUS Mitigation Intelligence v4

Status: implemented and deterministically validated with explicit scientific
limitations.

Engine version: `arcus-mitigation-intelligence-v4`.

## Scope

Version 4 preserves the Hydraulic v3 strategy engine and adds two independent,
abstention-only support contracts:

- `landslide-support-contract-v1`;
- `seismic-support-contract-v1`.

Hydraulic remains the only hazard family allowed to emit collapse-learned
investigation strategies. Landslide and seismic return evidence totals,
episode independence, abstention reasons and zero strategies. None of the three
tracks modifies the Final Priority Index.

## Seismic support contract

The seismic registry covers all three Earthquake-classified ARCUS records.
They belong to the same 6 April 2009 L'Aquila earthquake. Fossa is excluded
from process learning because technical sources retain competing structural and
geotechnical interpretations; Scoppito is excluded because a case-specific
mechanism is not authenticated; the bridge near Onna is the only provisional
eligible outcome.

The resulting support is:

```text
3 registered cases
1 eligible case
1 independent episode
1 episode-effective evidence unit
0 strategies
status: abstained
```

The engine does not promote PGA thresholds, assign attention classes or infer
retrofit priorities. Current MPS04 exposure is kept separate from historical
outcomes and present bridge vulnerability.

## API, UI and report

The Mitigation Intelligence response now includes:

```text
landslide_support
seismic_support
```

Both objects expose contract version/status, official-exposure state, evidence
totals, process support, abstention reasons, required site-assessment dimensions,
zero strategies and `final_priority_index_contribution: none`.

Professional Path 01 displays separate Hydraulic, Landslide and Seismic
support blocks. The structured PDF repeats both abstention summaries and the
non-prescriptive/FPI warning.

## Runtime contract

The API contract identifier is `arcus-api-contract-v2`. The development
frontend refuses to accept a running backend with a missing or older contract
identifier, preventing a stale API from silently omitting the v4 support data.

## Scientific limits

- Landslide has three eligible independent episodes, below its provisional
  evidence and expert-validation gates.
- Seismic has one eligible episode, all registered cases coming from one
  earthquake.
- No current official hazard value is historical-at-event evidence.
- No support contract is a collapse-probability model or engineering design
  prescription.
- Additional independent, source-backed episodes and external expert review
  are required before Landslide or Seismic can emit strategies.

## Seismic evidence acquisition

Version 4 also includes the non-production `seismic-evidence-intake-v1` gate.
It validates candidate identity, outcome, mechanism, episode independence,
technical sources and structural/geotechnical/editorial reviews. Candidates
cannot enter the production registry automatically, and the gate has no effect
on strategies or the Final Priority Index. Current MPS04 values are rejected if
presented as historical ground-motion measurements.
