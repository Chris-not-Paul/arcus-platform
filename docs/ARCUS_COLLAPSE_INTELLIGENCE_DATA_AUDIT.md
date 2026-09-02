# ARCUS Collapse Intelligence - Data Audit

Audit source:

```text
private-data/processed/events.json
private-data/processed/sources.json
private-data/professional/professional-events.json
private-data/professional/ainop-bridge-index.json
```

## Dataset Snapshot

| Metric | Value |
|---|---:|
| Events | 253 |
| Sources | 688 |
| Source coverage | 100% |
| Events with valid coordinates | 253 |
| Enrichable with official hazard providers | 100% |

## Usable Fields

Fields with sufficient coverage include:

```text
event_id
event_slug
date
municipality
province
region
latitude
longitude
bridge_crossing_name
bridge_crossing_type
destination_use
collapse_severity
victims
injuries
triggered
cause_category
specific_cause
source_confidence
exact_location
structural_type
material_type
curation_level
description
source_count
```

## Insufficiently Filled Fields

Current weak fields:

```text
bridge_name
construction_year
```

Missing or not available as structured fields:

```text
failure_mechanism
component_involved
span_count
foundation_concept
indicative_length_m
ownership
waterway as structured field
source_quality beyond current reliability model
```

`span_count` remains unavailable. The Professional dataset now includes a
separate, non-equivalent hydraulic geometry object for source-backed bridge
length and presence of piers in the active riverbed.

## Input / Outcome / Evidence Split

### Matching Features

Potentially knowable before event or design:

- coordinates;
- province/region;
- bridge crossing type;
- destination use;
- structural type;
- material type;
- construction year where available;
- exact-location flag;
- future official hazard signature.

### Outcome Features

Known after the event:

- cause category;
- specific cause;
- collapse severity;
- triggered event;
- victims;
- injuries;
- narrative description.

Outcome fields must not be used to increase similarity in analogue matching.

### Hydraulic Intelligence Outcome Fields

`MASTER_RESEARCH.xlsx` now provides four Professional-only Hydraulic Intelligence fields for events classified as `Hydraulic`:

```text
hydraulic_trigger
hydraulic_failure_process
hydraulic_component_involved
hydraulic_evidence_level
```

They are normalized into `hydraulic_intelligence` during `scripts/build-data.js`.

Current audit:

| Metric | Value |
|---|---:|
| Hydraulic events | 202 |
| Trigger available | 202 |
| Specific process available | 29 |
| Specific component available | 0 |
| Documented evidence | 9 |
| Probable evidence | 18 |
| Unspecified evidence | 175 |
| Validation warnings | 4 |

These fields are outcome features. They may be used for cohort interpretation after analogue retrieval, but not for retrieval, filtering, ranking, HCI, hazard signatures or route activation.

### Hydraulic Geometry Evidence

The D'Angelo, Ballio & Ravazzani (2025) S3 supplement has been matched
conservatively to ARCUS without filling gaps by inference:

| Metric | Value |
|---|---:|
| Accepted unique ARCUS/S3 pairs | 158 |
| Explicit source-record matches | 112 |
| Unique coordinate + year matches | 46 |
| Bridge length available | 158 |
| Piers-in-active-riverbed available | 155 |
| Rejected spatial inconsistencies | 5 |
| Rejected duplicate assignments | 3 |

The normalized `hydraulic_geometry` object is Professional-only and includes
record-level provenance. It is evidence context, not a vulnerability score.
Current matching, analogue retrieval and mitigation logic do not consume these
fields. This prevents an unvalidated feature from changing production outputs
and avoids double counting correlated basin/river-size information.

The master workbook uses a normalized structure: `EVENTS` contains only
`bridge_length_m` and `piers_in_active_riverbed`; the 158 accepted joins are in
`HYDRAULIC_GEOMETRY_LINKS`; the S3 citation, DOI, archive path and checksum occur
once in `DATASETS`. This keeps the event table flat and analysis-ready without
discarding audit provenance.

### Evidence Quality

- source count;
- source role/type;
- source confidence;
- curation level;
- exact location;
- reliability grade derived by ARCUS.

## Taxonomy Issues

- `specific_cause` is usable but coarse.
- `description` contains useful mechanism hints but is unstructured.
- `construction_year` coverage is too low for primary matching.
- component-level and failure-mechanism fields should be added as curated structured fields.
- Hydraulic mechanism fields now exist for Hydraulic cases, but most remain unspecified and must stay outcome-only.

## Analog Matching Criticalities

- Many engineering-mechanism details are narrative only.
- Site-only matching can be too generic.
- Project-informed matching improves specificity only if users provide material, typology and use.
- Province/region must not dominate similarity.
- ARCUS must be able to abstain when the analogue cohort is too weak.
