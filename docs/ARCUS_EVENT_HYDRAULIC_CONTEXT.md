# ARCUS Event Hydraulic Context

## Purpose

The event hydraulic context complements the rainfall module with documented information about catchment response, hydrometric observations and hydraulic reference values. It does not reconstruct missing hydrographs, assign an event return period or infer collapse causation.

The catalogue contains a manually reviewed dossier for all 211 hydraulic-collapse records. Sixty-eight dossiers publish one or more observed or explicitly estimated hydraulic values; 143 use `not_available` after source review because no compatible numerical observation was published, the failure was not tied to one hydrometric peak, the monitoring chain failed, or the event/crossing identity remains unresolved. The source-review queue is therefore empty, but numerical hydrometric coverage is intentionally incomplete.

The 211 manually curated records exercise complementary evidence paths:

- `IT08.10.03`, Rio Corongiu at Tertenia: modelled PAI context and no compatible observation;
- `IT20.10.05`, Romagnano Sesia: observed flood evidence at an upstream basin station and no value assigned to the bridge section.
- `IT20.10.17`, Campertogno: local same-watercourse observation with an explicitly approximate bridge position and no computed station distance.
- `IT20.10.02`, `IT20.10.14` to `IT20.10.16` and `IT20.10.19`: completed review of the official October 2020 report, with an explicit compatible-station gap rather than a fabricated local value.
- `IT20.10.03`, `IT20.10.07`, `IT20.10.09`, `IT20.10.10` and `IT20.10.18`: reported event peaks retained as upstream, downstream or basin reference observations and never assigned to the bridge section.
- `IT22.09.01` to `IT22.09.03`, Misa-Nevola: documented monitoring-network failure during the flood, with no reconstructed peak.
- `IT23.05.02`, Ponte della Motta: a gauge installed on the bridge records a lower-bound stage before being destroyed with the structure.
- `IT23.05.03` and `IT23.05.04`, Magni canal and Fosso Ghiaia: the official report was reviewed but contains no compatible gauge section, so the absence is a documented result rather than an unreviewed blank.
- `IT23.05.05`, Ca' Stronchino on the Marzeno: a validated peak at the local same-watercourse Modigliana station is retained as flood context, with an explicit event-date caveat.
- `IT23.05.06`, Villa Sassonero on the Sillaro: the collapse occurred on 24 May, outside the 16-18 May validated report, so antecedent Sillaro peaks are not reassigned to the later local flood.
- `IT23.05.07`, Santerno near Fontanelice: the Borgo Tossignano peak is retained as same-watercourse basin context, without a computed distance because the bridge position remains unverified.
- `IT22.09.04` to `IT22.09.10`, Marche tributaries and the upper Cesano: the official report hydrographs are retained as reviewed basin coverage, but no plotted value is digitised or transferred to a different tributary or bridge section.
- `IT00.10.01` to `IT00.10.43`, the October 2000 Piemonte/Aosta group: all event records have been reviewed against the official hydrological report; recorded peaks, published technical estimates, verified measurement gaps and event-identity conflicts remain separate.
- the remaining historical cases have been reviewed individually against their registered event sources and, where found, additional institutional material; an explicit reviewed gap replaces the former generic pending state when no defensible numerical value exists.
- chronology and identity conflicts remain first-class outcomes: examples include the Enna Panoramica slope failures, the delayed Monchiero and Becca pier failures, the unresolved SS647 crossing, the Nuoro/Galtelli watercourse mismatch, and the Apice Miscano/Ufita naming conflict.

## Evidence classes

Every event must keep these evidence classes separate:

1. `observed`: a contemporaneous measurement from a station whose temporal coverage includes the event;
2. `modelled`: design discharge or stage published for a named watercourse and section;
3. `documented_process`: qualitative basin behaviour reported by an attributable technical source;
4. `not_available`: source review has established that the curated evidence contains no observation compatible by watercourse and event time, or documents why the measurement chain failed;
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

## Piemonte October 2020 event group

The official ARPA Piemonte report was reviewed as one event source, but every collapse remains an independent hydraulic assignment. Five further dossiers retain reported gauge peaks only where the station relationship is stated:

- Crevacuore on the Strona: Cossato is a downstream same-watercourse reference (3.36 m above the local gauge datum), not the bridge section;
- Bagnasco on the Tanaro: Garessio is an upstream reference (5.93 m), not the bridge section;
- Valdieri in the Gesso basin: Andonno is a downstream basin reference (2.53 m), not a local observation;
- Valstrona on the Strona: Gravellona is a downstream same-watercourse reference (4.07 m), not the bridge section;
- Barchi di Ormea on the Tanaro: Ponte di Nava is an upstream reference (5.32 m), not the collapsed bridge section.

For Piedicavallo/Cervaro, the three Pianale crossings at Varallo and Entracque/Gesso della Barra, source review was completed but no compatible local station was published. Those dossiers therefore use `not_available`; the downstream Gesso observation at Andonno is deliberately not transferred to the upper Gesso della Barra branch. Reported warning or danger levels remain station thresholds and are not interpreted as bridge thresholds.

## Piemonte and Aosta Valley October 2000 event group

The 43 ARCUS records dated 13 October 2000 represent collapses and severe bridge damage distributed across the multi-day flood of 13-16 October. The event start date in the database must therefore not be confused with the timestamp of each basin peak.

The ARPA Piemonte hydrological report publishes different kinds of evidence, which ARCUS keeps visibly distinct:

- Chisone at San Martino: recorded 4.05 m peak and published 980 m³/s peak discharge, with high reported reliability;
- Orco at Cuorgnè: recorded 4.29 m peak and published 1,650 m³/s peak discharge, with high reported reliability;
- Soana at Pont Canavese: recorded 4.28 m peak;
- Stura di Lanzo at Lanzo: 4.37 m recorded before instrument failure and 2,000 m³/s reconstructed by the report with low reliability;
- Dora Baltea at Tavagnasco: 3,100 m³/s reconstructed after instrument failure from flood marks and hydrological reasoning, with low reliability;
- Po at Cardè: published 900 m³/s technical peak estimate.

The same station may provide event-scale context for several collapses on one river system, but it never becomes a bridge-section measurement. The Stura di Lanzo station is therefore labelled as a basin reference for the upper Stura di Ala and Stura di Valgrande records. No station distance is invented where the station coordinates have not been encoded and verified.

Eleven records remain value-free after completed review. This includes the Sangone, for which the report explicitly states that measured data were unavailable, minor waterways without a compatible published gauge, and records whose bridge, municipality or watercourse identity conflicts with the controlled sources. These are `not_available` outcomes, not pending generic blanks. In particular, the Susa or Beaulard measurements are not attached to the Bussoleno and Bardonecchia records while their event identity remains unresolved.

## Misa-Nevola instrument-loss cases

The Regione Marche report for 15-17 September 2022 documents a rapid transition from centimetres of water to missing data because almost every gauge in the Misa-Nevola network was overtopped, damaged or swept away. Bettolelle, downstream of the confluence, is the stated exception.

For the three curated collapse points on the Misa and Nevola, ARCUS records why the peak is unavailable. It does not substitute Bettolelle for an upstream bridge, interpolate the missing hydrograph or treat absence of measurement as absence of flooding. The result is an explicit measurement-chain limitation rather than an unexplained empty panel.

## Marche 2022 tributary and section-review cases

The same Regione Marche report publishes hydrometric graphs for the Burano-Candigliano, Cesano and Sentino-Esino systems. Seven further collapse dossiers were reviewed against those graphs and the documented river network:

- the two Cantiano points are on the Bevano, a tributary entering the Burano system; the Pontedazzo hydrograph is downstream on the Burano and is not reassigned to either bridge;
- the Serra Sant'Abbondio point is on the Cesano, but none of the plotted Cesano stations is the collapsed bridge section;
- the Arcevia point is on the Acquaviva; the Arcevia rain gauge documents the forcing but is not a stream gauge and rainfall is not converted into discharge;
- the three Sassoferrato-area points are on the Sanguerone, which joins the Sentino; the Colleponi hydrograph is on the receiving Sentino and is not treated as a local Sanguerone observation.

All seven dossiers therefore use `not_available` with `no_compatible_station_in_validated_event_report`. This is a completed source-review outcome: the relevant basin response is documented, while local stage, discharge and hydrograph remain null. Values visible only as curves in the report are not manually digitised into false-precision peaks.

## Ponte della Motta bridge-station case

The ARPAE validated event report places the S. Martino gauge on the Ponte della Motta. The stage exceeded 14.36 m relative to the local gauge datum, against a published threshold 3 of 11.00 m. The instrument entered its measurement window during the rising flood and was then swept away with the bridge.

ARCUS stores `>14.36 m` as a lower bound, not as the flood peak. It does not reconstruct the missing hydrograph or infer discharge without a validated event-specific rating curve. This case is separately labelled as an observation at the bridge section rather than basin context.

## Emilia-Romagna May 2023 extension

The ARPAE report for 16-18 May provides validated peaks and threshold-3 levels for named stations. ARCUS uses those values only where the event watercourse and period are compatible:

- Modigliana on the Marzeno: 3.07 m above the local gauge datum at 15:30 on 16 May, compared with threshold 3 at 1.00 m. The station is about 1.8 km from the ARCUS point. Because the controlled event record is dated 19 May, the value is labelled as context for the documented 16-18 May damage window, not the stage at the instant of collapse.
- Borgo Tossignano on the Santerno: 2.49 m above the local gauge datum at 16:15 on 16 May, compared with threshold 3 at 2.00 m. The bridge position is approximate or unverified, so the station-to-bridge distance is deliberately left null.

For the Magni canal and Fosso Ghiaia, the same report documents the regional flood but publishes no compatible gauge section on those minor waterways. Their dossiers now use `not_available` with reason `no_compatible_station_in_validated_event_report`; this means “reviewed source gap”, not zero flow or absence of flooding.

The Villa Sassonero bridge failed on 24 May during a new local flood. Although the earlier ARPAE report publishes Sillaro peaks for 16-17 May, ARCUS does not reassign them to the later event. The dossier uses `event_date_outside_validated_flood_report` and keeps all observed fields null until a validated series covering 24 May is curated.

## Extension to other hydraulic collapses

Population is event-by-event and source-gated. For each collapse ARCUS must verify:

- event coordinates and crossing identity;
- station coordinates, watercourse and network relationship;
- observation start/end dates and missing intervals;
- whether stage can be converted to discharge using a valid rating curve;
- exact model section and return-period definition;
- provenance, licence and publication stability.

Every hydraulic event receives a dossier, but a dossier does not imply that a compatible hydrometric observation exists. For a newly added event, until station, watercourse and event-period compatibility are checked, the build pipeline uses:

- `status: source_review_required`;
- `observation_status: not_verified`;
- null stage, discharge and hydrograph fields;
- event sources and the failure-process evidence level already present in the controlled database;
- an explicit review checklist.

This makes incompleteness visible in the interface without filling it with a spatially near but hydraulically unrelated value. Manual review promotes the dossier to `context_available` either with a traceable observation/estimate or with an explicit `not_available` reason. In the current 211-event catalogue, no dossier remains in `source_review_required`.

Build or refresh the complete catalogue without overwriting manually curated records:

```text
npm run build:event-hydraulic-catalog
```

The coverage audit lists events ready for rainfall reconstruction separately from the station and hydraulic-study review queue. The current queue is empty; future database additions re-enter it automatically:

```text
npm run audit:event-hydraulic-context
```

## Validation

Run:

```text
npm run test:event-hydraulic-context
```

The validator prevents an unavailable station from being represented as observed, requires observed values to identify their station and source, checks ordering and monotonicity of optional design flows, requires traceable sources and verifies the explicit null-value contract for both reviewed gaps and any future dossier awaiting source review.
