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

All 20 allowed values come from the workbook `TAXONOMY` sheet. `Rainfall-induced landslide` is preserved as the documented trigger chain and is not automatically reclassified. `Unspecified` produces `null` for process or component. `Needs review` remains the distinct canonical class `needs_review`.

## Release coverage

The `arcus-open-2026.1` quality gate records 211 Hydraulic events: 172 have a specific process, 166 have a specific component, and the evidence distribution is 124 Documented, 43 Probable, 8 Needs review and 36 Unspecified.

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
