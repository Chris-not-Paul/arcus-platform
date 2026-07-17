# ARCUS Hydraulic Intelligence Data Model

Date: 2026-07-17

Status: Professional-only outcome feature model, version `hydraulic-v1`.

## 1. Purpose

Hydraulic Intelligence captures curated evidence about documented historical bridge collapses whose `specific_cause` is `Hydraulic`. The fields describe what is known from sources after the collapse happened. They are not site predictors, not official hazard classes, and not similarity inputs.

## 2. Source Excel Columns

Source workbook:

```text
private-data/raw/MASTER_RESEARCH.xlsx
```

Source sheet:

```text
EVENTS
```

Headers are resolved by name, not by Excel column position:

```text
hydraulic_trigger
hydraulic_failure_process
hydraulic_component_involved
hydraulic_evidence_level
```

Current audit from the workbook:

| Metric | Value |
|---|---:|
| Total events | 253 |
| Hydraulic events | 202 |
| Trigger available | 202 |
| Specific process available | 29 |
| Specific component available | 0 |
| Documented evidence | 9 |
| Probable evidence | 18 |
| Unspecified evidence | 175 |
| Validation warnings | 4 |

## 3. Trigger, Process, Component, Evidence

The four concepts are intentionally separate:

- `trigger`: external initiating context, for example flood.
- `failure_process`: documented physical process, for example scour.
- `component_involved`: bridge component identified by sources.
- `evidence_level`: strength of the curated mechanism assignment.

`Flood` is a trigger. It is not converted into `scour`, `overtopping`, or any other physical process.

## 4. Canonical Schema

Hydraulic events expose one nested Professional object:

```json
{
  "hydraulic_intelligence": {
    "trigger": "flood",
    "failure_process": "scour",
    "component_involved": "pier_foundation",
    "evidence_level": "documented",
    "taxonomy_version": "hydraulic-v1"
  }
}
```

When the process or component is unknown:

```json
{
  "hydraulic_intelligence": {
    "trigger": "flood",
    "failure_process": null,
    "component_involved": null,
    "evidence_level": "unspecified",
    "taxonomy_version": "hydraulic-v1"
  }
}
```

Non-Hydraulic events receive:

```json
{
  "hydraulic_intelligence": null
}
```

The source flat Excel fields are not duplicated in processed events.

## 5. Mapping Excel To ARCUS

Trigger mapping:

| Excel value | ARCUS value |
|---|---|
| Flood | `flood` |
| Hydraulic event - unspecified | `hydraulic_event_unspecified` |

Failure process mapping:

| Excel value | ARCUS value |
|---|---|
| Bank erosion / embankment failure | `bank_erosion_or_embankment_failure` |
| Debris accumulation / obstruction | `debris_accumulation_or_obstruction` |
| Debris flow / solid transport | `debris_flow_or_solid_transport` |
| Other documented hydraulic process | `other_documented_hydraulic_process` |
| Overtopping / hydrodynamic action | `overtopping_or_hydrodynamic_action` |
| Scour | `scour` |
| Unspecified | `null` |

Component mapping:

| Excel value | ARCUS value |
|---|---|
| Pier foundation | `pier_foundation` |
| Unspecified | `null` |

Current workbook audit finds only `Unspecified` for `hydraulic_component_involved`.

Evidence mapping:

| Excel value | ARCUS value |
|---|---|
| Documented | `documented` |
| Probable | `probable` |
| Unspecified | `unspecified` |
| Needs review | `unspecified` with validation warning |

`Needs review` is not treated as a positive evidence class. It is normalized conservatively and audited.

## 6. Allowed Values

Allowed `evidence_level` values:

```text
documented
probable
unspecified
```

Allowed process/component/trigger values are defined in:

```text
src/utils/hydraulicIntelligence.js
```

## 7. Validation Rules

Implemented checks:

- non-Hydraulic events must not import Hydraulic Intelligence;
- non-Hydraulic rows with hydraulic source values produce warnings;
- missing trigger on Hydraulic rows produces warnings;
- specific process with `unspecified` evidence produces warnings;
- component specified while process is unspecified produces warnings;
- unrecognized Excel values produce warnings;
- `Unspecified`, empty values, `N/A`, `Unknown`, and similar placeholders are not converted into physical mechanisms.

Current audit warnings:

```text
B15.11.01: Needs review evidence normalized as unspecified; specific scour process with unspecified evidence.
B20.10.04: Needs review evidence normalized as unspecified; specific scour process with unspecified evidence.
```

## 8. Professional And Open Scope

Professional scope:

- `private-data/professional/professional-events.json` includes `hydraulic_intelligence`.
- `/api/professional/professional-events` exposes the normalized object to authenticated Professional users.
- `/api/professional/hydraulic-intelligence-audit` exposes the audit resource.

Open scope:

- `/api/open/events` uses an explicit whitelist in `server/dataService.js`.
- `hydraulic_intelligence` and source flat fields are not exposed in Open events.
- Public ARCUS can still expose fields already in public scope, such as `specific_cause`.

## 9. Role In Matching

Hydraulic Intelligence is an outcome feature. It can be read only after analogue retrieval is complete.

Allowed:

```text
site hazard + project profile
-> analogue retrieval
-> ranked cohort
-> read hydraulic_intelligence
-> aggregate documented processes and components
```

Forbidden:

```text
hydraulic_failure_process
-> candidate filtering
-> similarity ranking
```

## 10. Target Leakage Prevention

Blocked fields include:

```text
hydraulic_trigger
hydraulic_failure_process
hydraulic_component_involved
hydraulic_evidence_level
hydraulic_intelligence
```

The matcher feature audit is implemented in:

```text
scripts/analyze-collapse-intelligence.js
```

and covered by:

```text
npm run test:collapse-intelligence
```

## 11. Cohort Aggregation

After analogue selection, Hydraulic Intelligence supports:

- documented mechanism count;
- probable mechanism count;
- unspecified mechanism count;
- mechanism documentation coverage;
- failure process distribution;
- component distribution;
- evidence-strength summaries.

Shares must be described as:

```text
share within the documented analogue cohort
```

They must not be described as:

```text
site probability
collapse probability
predicted mechanism probability
```

## 12. Treatment Of Unspecified

Unspecified cases:

- remain inside the analogue cohort;
- do not get redistributed into known mechanisms;
- reduce documentation coverage;
- appear in limitations;
- receive evidence weight `0.0` only in the experimental evidence-count view.

## 13. Experimental Evidence Weighting

The current experimental weighting is:

| Evidence level | Weight |
|---|---:|
| documented | 1.0 |
| probable | 0.5 |
| unspecified | 0.0 |

Raw counts remain available. Evidence weighting is not production scoring and does not modify official hazard exposure.

## 14. Taxonomy Version

Current version:

```text
hydraulic-v1
```

The version is attached to every normalized Hydraulic Intelligence object.

## 15. Limits

- Component coverage is currently zero for specific components.
- Most Hydraulic events remain mechanism-unspecified.
- `Needs review` rows require human curation before being treated as documented or probable.
- Current official ISPRA/INGV hazard exposure remains separate from historical collapse outcomes.
- No normalized score is assigned.

## 16. Technical Debt

- Add an explicit release note when the Excel workbook becomes the full canonical source instead of a source for Hydraulic Intelligence fields only.
- Replace terminal-dependent character rendering for dash variants with a workbook-level text encoding audit if needed.
- Add human-reviewed component values when sources support them.
- Add expert-reviewed mitigation mappings before any design guidance is presented.
