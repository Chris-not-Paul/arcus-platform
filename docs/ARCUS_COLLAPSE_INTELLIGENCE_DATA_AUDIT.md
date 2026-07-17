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

## Analog Matching Criticalities

- Many engineering-mechanism details are narrative only.
- Site-only matching can be too generic.
- Project-informed matching improves specificity only if users provide material, typology and use.
- Province/region must not dominate similarity.
- ARCUS must be able to abstain when the analogue cohort is too weak.
