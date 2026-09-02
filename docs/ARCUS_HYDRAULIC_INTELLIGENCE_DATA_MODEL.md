# ARCUS Hydraulic Intelligence Data Model

Status: public historical-outcome model, version `hydraulic-v2` (2026-07-22).

## Purpose and source

`MASTER_RESEARCH.xlsx` is the editorial source of truth. Its header-named fields `failure_trigger`, `failure_process`, `component_involved` and `failure_cause_evidence` are compatible with the legacy aliases `hydraulic_trigger`, `hydraulic_failure_process`, `hydraulic_component_involved` and `hydraulic_evidence_level`.

For Hydraulic events the canonical object is:

```json
{
  "hydraulic_intelligence": {
    "trigger": "flood",
    "failure_process": "scour",
    "component_involved": "pier_foundation",
    "evidence_level": "documented",
    "taxonomy_version": "hydraulic-v2"
  }
}
```

An authenticated editorial review may also assign an optional stable episode
identifier:

```json
{
  "hydraulic_episode_id": "hydraulic:curated:2020-10-north-west-flood"
}
```

The legacy-compatible location
`hydraulic_intelligence.episode_id` is accepted as an alias. A curated ID may
merge records on different dates or keep same-date records separate. It affects
only the independence control used after analogue retrieval; it is forbidden as
a retrieval feature, probability, severity value or Final Priority Index input.
Curated identifiers must follow `hydraulic:curated:<stable-id>`; the
`hydraulic:inferred:` namespace is reserved for deterministic fallback groups.

All 20 allowed values come from the workbook `TAXONOMY` sheet. `Rainfall-induced landslide` is preserved as the documented trigger chain and is not automatically reclassified. `Unspecified` produces `null` for process or component. `Needs review` remains the distinct canonical class `needs_review`.

## Release coverage

The `arcus-open-2026.1` quality gate records 211 Hydraulic events: 172 have a specific process, 166 have a specific component, and the current evidence distribution is 123 Documented, 44 Probable, 8 Needs review and 36 Unspecified.

## Professional bridge-geometry enrichment

The official supplementary damaged-bridge database S3 published with D'Angelo,
Ballio & Ravazzani (2025), *Geomorphological risk factors for river bridges*, is
the source for two additional historical bridge attributes:

```text
bridge_length_m
piers_in_active_riverbed
```

The source file is
`https://ars.els-cdn.com/content/image/1-s2.0-S2212420925004315-mmc3.xlsx`
(DOI `10.1016/j.ijdrr.2025.105607`). The master workbook keeps the two technical
attributes in `EVENTS`, adjacent to bridge typology, material and construction
year. Record-level matching metadata is normalized in
`HYDRAULIC_GEOMETRY_LINKS`, keyed by `event_id` and `dataset_id`; dataset-level
DOI, URL, local archive and checksum are stored once in `DATASETS`. No matching
or source-provenance columns are duplicated across `EVENTS`. The Professional
API joins these sheets and exposes the normalized result as
`hydraulic_geometry`; the Open Research release deliberately excludes it pending
a separate rights and release decision.

The locally archived source is
`private-data/raw/source-material/dangelo-ballio-ravazzani-2025-s3.xlsx`
(SHA-256 `7AC68D484FFF2402AF7DE185CAD936741FCAA1E4AF02546C624DAE272B288F71`).

Current accepted coverage is 158 unique ARCUS/S3 pairs: 112 use an explicit S3
record already cited in the ARCUS description and 46 use a unique coordinate +
event-year match. Bridge length is available for all 158; active-riverbed pier
presence is available for 155. Five spatially inconsistent explicit references
and three duplicate candidate assignments abstain and remain blank.

`piers_in_active_riverbed = false` is a documented negative value. A blank value
means unavailable or rejected mapping and must never be converted to `false`.
Neither bridge length nor pier presence currently changes retrieval, similarity,
mitigation status or any score. Their incremental value and correlation with
river width and basin area require validation first.

The first episode-held-out value audit is documented in
`docs/ARCUS_HYDRAULIC_GEOMETRY_VALUE_AUDIT.md`. Length and combined geometry do
not outperform the fair majority baseline. Pier presence alone shows a small
failure-process signal, but its paired uncertainty interval crosses zero. The
audit status is `exploratory_signal_only` and the production status remains
`not_authorized`; both attributes remain descriptive post-retrieval evidence.

## Scientific interpretation

These fields describe outcomes observed after historical collapses. They are neither asset vulnerability attributes nor future-mechanism predictions. Open Atlas and Open Analytics label them as historical evidence and publish sample size and missing values.

## Anti-leakage contract

All flat aliases and `hydraulic_intelligence` are forbidden inputs for Final Priority Index, 70/30 weights, territory profiles, asset screening, Historical Collapse Incidence, Official Geospatial Exposure, initial analogue retrieval, similarity, and Path 02 ranking. They may be read only after retrieval to summarize analogue outcomes. Raw counts remain available; experimental evidence weights never enter production scoring.

The rain/flood trigger, process, component and evidence class can support contextual mitigation research only after retrieval. Any strategy must state applicability, limitations, evidence references and the need for external engineering validation.

## Limitations

- Absence of a process or component is not evidence of absence.
- Probable and Needs review records must not be presented as definitive mechanisms.
- Cohort shares are database frequencies, not site probabilities.
- ISPRA/INGV official exposure is a separate Professional input.
- Missing curated episode IDs invoke the versioned conservative registry rule;
  they are not silently represented as meteorologically verified events.
- S3 does not provide a systematic span count or single-/multi-span field; the
  presence of piers in the active riverbed must not be relabelled as span count.
