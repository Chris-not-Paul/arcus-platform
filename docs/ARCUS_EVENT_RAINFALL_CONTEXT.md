# ARCUS Event Rainfall Context

## Purpose

The rainfall module adds reproducible meteorological context to a documented collapse event. It does not estimate bridge risk, reconstruct discharge or prove collapse causation.

The first production-shaped prototype was `IT08.10.03`, Rio Corongiu, using the CERRA reanalysis. The source is explicitly shown in the UI and remains separate from the curated historical failure evidence.

The current population contains 199 hydraulic-collapse records: 164 CERRA records and 35 ERA5 records. Together they cover every hydraulic event in the professional dataset that has an exact coordinate and a complete date. CERRA is used first for its 1985-01-01 to 2021-06-30 coverage; ERA5 fills only the otherwise missing events from 1940 onwards. Events without those location/date gates remain unpublished rather than receiving an approximate location.

## Display contract

The event dossier may show the module only when a versioned context record exists. Missing context records produce no placeholder, failed request or synthetic value.

The module reports:

- the event calendar-day precipitation;
- the event day plus the two preceding calendar days;
- the event day plus the six preceding calendar days;
- the daily series used by those sums;
- dataset, nominal spatial resolution and model-grid distance;
- provider attribution and an explicit non-causation warning.

The event-day metric is labelled as precipitation in the bridge grid cell during the civil calendar day. It is not labelled as the rainfall that caused the collapse.

Because the time of collapse is not available in the master event dataset, the current accumulations use local calendar days. They must not be described as rolling 24-hour, 72-hour or 7-day windows.

## Source hierarchy

The long-term target is direct, versioned ingestion from Copernicus Climate Data Store products. ERA5-Land offers a consistent multi-decadal baseline at approximately 9 km, but direct programmatic retrieval requires managed CDS access.

For the prototype, ARCUS uses Open-Meteo as a transparent delivery layer and retains the upstream Copernicus/ECMWF provenance:

- CERRA, approximately 5.5 km, for events within its temporal coverage;
- ERA5, approximately 25 km, only when explicitly requested and labelled.

Models must never be switched silently. Context records store the model name, resolution, grid coordinate, event-to-grid distance, retrieval URL, retrieval time and transformation statement.

## Scientific limitations

Reanalysis is a model-observation reconstruction at grid scale. It is not a rain-gauge measurement at the bridge and can smooth local convective extremes, particularly in complex terrain. CERRA and ERA5 values are not directly interchangeable because their spatial resolutions and modelling systems differ.

The UI adds a prominent coarse-resolution warning to ERA5 records. A roughly 25 km cell sampled at the bridge can miss an upstream convective maximum and must not be described as catchment-average rainfall or the rainfall that generated the flood.

Rain-gauge or hydrometric observations may later be added as a higher evidence tier. They must retain station identity, distance, elevation difference, completeness and provider provenance. No threshold-based causal classification is currently authorised.

## Quality assessment

Every rainfall record carries a quality assessment. Most records remain descriptive reanalysis context only; ERA5 records receive an additional coarse-grid limitation. Event-specific overrides are allowed only when the chronology has been checked against attributable sources.

The current assessment contains:

- 161 CERRA records classified as reanalysis context only;
- 33 ERA5 records classified as coarse reanalysis context only;
- 2 Emilia-Romagna 2023 records where zero event-day rainfall is compatible with delayed catchment response and large preceding accumulation;
- 2 records where the reanalysis is explicitly considered non-representative of the documented flood (`IT10.06.01`, `IT11.11.03`);
- 1 record requiring event-chronology review before interpreting the zero (`IT04.10.01`).

Raw values are retained for reproducibility. A warning in the event dossier prevents a non-representative zero from being read as absence of rainfall or absence of hydraulic forcing.

Refresh quality assessments after rainfall generation:

```text
npm run assess:event-rainfall-quality
```

## Build and validation

Generate one reviewed context record explicitly:

```text
npm run build:event-weather-context -- --event IT08.10.03 --model cerra --days 14
```

Populate every missing, eligible hydraulic event with throttled, resumable retrieval:

```text
npm run build:event-weather-context:batch -- --model cerra --days 14 --delay-ms 300
npm run build:event-weather-context:batch -- --model era5 --days 14 --delay-ms 300
```

Run CERRA before ERA5. The batch command skips existing records, continues after individual provider failures and reports every failed event. Re-running it resumes only the missing population. The two datasets remain visibly labelled and must not be pooled into a common rainfall ranking or threshold without a dedicated harmonisation study.

Validate all published context records:

```text
npm run test:event-weather-context
```
