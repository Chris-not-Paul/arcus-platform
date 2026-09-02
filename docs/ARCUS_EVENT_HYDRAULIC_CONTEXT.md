# ARCUS Event Hydraulic Context

## Purpose

The event hydraulic context complements the rainfall module with documented information about catchment response, hydrometric observations and hydraulic reference values. It does not reconstruct missing hydrographs, assign an event return period or infer collapse causation.

The catalogue now contains a dossier for all 211 hydraulic-collapse records. Seven dossiers contain manually curated hydraulic or hydrometric evidence; 204 contain the event sources and encoded failure-process evidence while explicitly retaining `not_verified` for event-specific hydrometry. Catalogue coverage is therefore complete, but verified hydrometric coverage is not.

The seven manually curated records exercise complementary evidence paths:

- `IT08.10.03`, Rio Corongiu at Tertenia: modelled PAI context and no compatible observation;
- `IT20.10.05`, Romagnano Sesia: observed flood evidence at an upstream basin station and no value assigned to the bridge section.
- `IT20.10.17`, Campertogno: local same-watercourse observation with an explicitly approximate bridge position and no computed station distance.
- `IT22.09.01` to `IT22.09.03`, Misa-Nevola: documented monitoring-network failure during the flood, with no reconstructed peak.
- `IT23.05.02`, Ponte della Motta: a gauge installed on the bridge records a lower-bound stage before being destroyed with the structure.

## Evidence classes

Every event must keep these evidence classes separate:

1. `observed`: a contemporaneous measurement from a station whose temporal coverage includes the event;
2. `modelled`: design discharge or stage published for a named watercourse and section;
3. `documented_process`: qualitative basin behaviour reported by an attributable technical source;
4. `not_available`: no compatible observation exists;
5. `not_verified`: a candidate source exists but station, section or temporal compatibility has not been established.

Modelled design values must never populate observed fields. Rainfall must not be converted into discharge without a reviewed event-specific hydrological reconstruction.

## Rio Corongiu prototype

For the collapse of 22 October 2008:

- the nearby official Rio di Quirra station is approximately 0.9 km from the event coordinates;
- its real-time observations start on 2 August 2017, so no 2008 stage, discharge or hydrograph is shown;
- PAI design flows for Riu Corongiu are displayed as modelled reference values only;
- reference-section levels from the Rio di Quirra station monograph remain explicitly separate from the collapsed bridge;
- no return period is assigned to the collapse event.

The PAI summary uses inconsistent reach codes for Rio Corongiu and Rio San Giorgio. The published flow row can support contextual display with this caveat, but analytical reuse requires review against the source maps and detailed hydraulic report.

## Romagnano Sesia observed-evidence case

For the collapse of 3 October 2020, the ARPA Piemonte event report documents the exceptional Sesia flood through the Borgosesia station. The report states that the water level exceeded the danger level by more than 4 m and that discharge exceeded 3,000 m³/s. These are reported lower-bound thresholds, not exact peaks.

The station is approximately 14.1 km upstream from the bridge coordinates. ARCUS therefore labels the values as observed basin context and does not populate bridge-section stage, discharge or hydrograph fields. The report's description of riverbed erosion and pier failure is retained as documented process evidence, separate from the hydrometric measurements.

## Campertogno observed-evidence case

The same ARPA Piemonte report records a 5.2 m hydrometric peak at Campertogno against a 4.0 m danger threshold. The documented collapse is also on the Sesia at Campertogno, but its database coordinates identify only an approximate area. ARCUS consequently displays the local observation without computing a station-to-bridge distance and without treating the station stage as a bridge-section stage.

## Misa-Nevola instrument-loss cases

The Regione Marche report for 15-17 September 2022 documents a rapid transition from centimetres of water to missing data because almost every gauge in the Misa-Nevola network was overtopped, damaged or swept away. Bettolelle, downstream of the confluence, is the stated exception.

For the three curated collapse points on the Misa and Nevola, ARCUS records why the peak is unavailable. It does not substitute Bettolelle for an upstream bridge, interpolate the missing hydrograph or treat absence of measurement as absence of flooding. The result is an explicit measurement-chain limitation rather than an unexplained empty panel.

## Ponte della Motta bridge-station case

The ARPAE validated event report places the S. Martino gauge on the Ponte della Motta. The stage exceeded 14.36 m relative to the local gauge datum, against a published threshold 3 of 11.00 m. The instrument entered its measurement window during the rising flood and was then swept away with the bridge.

ARCUS stores `>14.36 m` as a lower bound, not as the flood peak. It does not reconstruct the missing hydrograph or infer discharge without a validated event-specific rating curve. This case is separately labelled as an observation at the bridge section rather than basin context.

## Extension to other hydraulic collapses

Population is event-by-event and source-gated. For each collapse ARCUS must verify:

- event coordinates and crossing identity;
- station coordinates, watercourse and network relationship;
- observation start/end dates and missing intervals;
- whether stage can be converted to discharge using a valid rating curve;
- exact model section and return-period definition;
- provenance, licence and publication stability.

Every hydraulic event receives a dossier, but a dossier does not imply that a compatible hydrometric observation exists. Until station, watercourse and event-period compatibility are checked, the record uses:

- `status: source_review_required`;
- `observation_status: not_verified`;
- null stage, discharge and hydrograph fields;
- event sources and the failure-process evidence level already present in the controlled database;
- an explicit review checklist.

This makes the incompleteness visible in the interface without filling it with a spatially near but hydraulically unrelated value. Only manual source extraction can promote a dossier to `context_available`.

Build or refresh the complete catalogue without overwriting manually curated records:

```text
npm run build:event-hydraulic-catalog
```

The coverage audit lists events ready for rainfall reconstruction separately from the queue requiring station and hydraulic-study review:

```text
npm run audit:event-hydraulic-context
```

## Validation

Run:

```text
npm run test:event-hydraulic-context
```

The validator prevents an unavailable station from being represented as observed, requires observed values to identify their station and source, checks ordering and monotonicity of optional design flows, requires traceable sources and verifies the explicit null-value contract for every dossier still awaiting source review.
