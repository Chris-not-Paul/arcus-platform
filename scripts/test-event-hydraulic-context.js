import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const CONTEXT_ROOT = path.join(
  ROOT,
  "public",
  "data",
  "event-context",
  "hydraulic"
);
const index = JSON.parse(
  fs.readFileSync(path.join(CONTEXT_ROOT, "index.json"), "utf8")
);
const eventResource = JSON.parse(
  fs.readFileSync(
    path.join(ROOT, "private-data", "professional", "professional-events.json"),
    "utf8"
  )
);
const hydraulicEventIds = (Array.isArray(eventResource)
  ? eventResource
  : eventResource.events || []
)
  .filter(
    (event) => event.hydraulic_intelligence || event.specific_cause === "Hydraulic"
  )
  .map((event) =>
    event.research_event_id || String(event.event_id || "").replace(/^B(?=\d)/, "IT")
  )
  .sort();
const observationStatuses = new Set([
  "not_available",
  "not_verified",
  "observed",
  "reported_estimate",
]);
const contextStatuses = new Set(["context_available", "source_review_required"]);
const reviewedUnavailableReasons = new Set([
  "monitoring_network_failed_during_flood",
  "no_compatible_station_in_validated_event_report",
  "event_date_outside_validated_flood_report",
  "no_measured_data_in_validated_event_report",
  "crossing_identity_conflict_in_validated_sources",
  "event_identity_not_confirmed_in_validated_sources",
  "receiving_river_station_not_transferable_to_tributary",
  "no_tabulated_value_in_validated_model_report",
  "no_tabulated_value_in_validated_event_report",
  "model_scope_does_not_cover_event_watercourse",
  "no_event_specific_value_in_validated_hydrological_annal",
  "no_hydrometric_value_in_validated_event_source",
  "crossing_watercourse_not_resolved_for_hydrometric_transfer",
  "failure_not_tied_to_single_hydrometric_peak_in_validated_source",
  "event_chronology_not_resolved_in_validated_sources",
  "failure_chronology_precludes_event_hydrometry",
  "event_date_conflict_in_validated_sources",
]);

assert.equal(index.schema_version, "arcus-event-hydraulic-index-v1");
assert.ok(Object.keys(index.events).length > 0);
assert.deepEqual(Object.keys(index.events).sort(), hydraulicEventIds);
assert.equal(index.coverage.hydraulic_events, hydraulicEventIds.length);
assert.equal(
  index.coverage.curated_hydraulic_contexts + index.coverage.source_review_records,
  hydraulicEventIds.length
);

for (const [eventId, entry] of Object.entries(index.events)) {
  const context = JSON.parse(
    fs.readFileSync(path.join(CONTEXT_ROOT, entry.file), "utf8")
  );
  const observationStatus = context.event_hydrometry.observation_status;

  assert.equal(context.schema_version, "arcus-event-hydraulic-context-v1");
  assert.equal(context.event_id, eventId);
  assert.equal(context.event_date, entry.event_date);
  assert.ok(contextStatuses.has(context.status));
  assert.equal(observationStatus, entry.observation_status);
  assert.equal(context.status, entry.status);
  assert.ok(observationStatuses.has(observationStatus));
  assert.ok(context.event_section.crossing_name);
  assert.ok(Number.isFinite(context.event_section.latitude));
  assert.ok(Number.isFinite(context.event_section.longitude));
  if (context.reference_station) {
    assert.ok(context.reference_station.name);
    assert.ok(
      context.reference_station.distance_from_event_km == null ||
        context.reference_station.distance_from_event_km >= 0
    );
    assert.ok(
      context.reference_station.station_code ||
        context.reference_station.station_reference
    );
  }

  if (context.reference_station?.available_for_event === false) {
    assert.notEqual(observationStatus, "observed");
    assert.equal(context.event_hydrometry.hydrograph, null);
    assert.equal(context.event_hydrometry.observed_discharge_m3s, null);
    assert.equal(context.event_hydrometry.observed_stage_m, null);
  }

  if (["observed", "reported_estimate"].includes(observationStatus)) {
    assert.ok(context.reference_station);
    assert.equal(context.reference_station.available_for_event, true);
    assert.ok(
      Array.isArray(context.event_hydrometry.observations) &&
        context.event_hydrometry.observations.length > 0
    );
    assert.ok(
      context.event_hydrometry.observations.every(
        (observation) =>
          (observation.station_code === context.reference_station.station_code ||
            observation.station_reference === context.reference_station.station_reference) &&
          Number.isFinite(observation.value) &&
          observation.value > 0 &&
          observation.unit &&
          observation.value_type &&
          observation.source_id &&
          (!observation.observed_at ||
            Number.isFinite(Date.parse(observation.observed_at)))
      )
    );
    assert.ok(
      context.event_hydrometry.interpretation,
      `${eventId} must state how the observation relates to the event section`
    );
  }

  if (context.modelled_event_watercourse) {
    const flows = context.modelled_event_watercourse.design_flows;
    assert.ok(flows.length >= 2);
    assert.deepEqual(
      flows.map((item) => item.return_period_years),
      [...flows.map((item) => item.return_period_years)].sort((a, b) => a - b)
    );
    assert.ok(
      flows.every(
        (item) =>
          Number.isFinite(item.return_period_years) &&
          item.return_period_years > 0 &&
          Number.isFinite(item.discharge_m3s) &&
          item.discharge_m3s > 0
      )
    );
    assert.ok(
      flows.every(
        (item, itemIndex) =>
          itemIndex === 0 || item.discharge_m3s >= flows[itemIndex - 1].discharge_m3s
      )
    );
  }

  if (
    !context.modelled_event_watercourse &&
    !["observed", "reported_estimate"].includes(observationStatus) &&
    observationStatus !== "not_verified"
  ) {
    assert.ok(
      reviewedUnavailableReasons.has(context.event_hydrometry.reason_code),
      `${eventId} must use a controlled reason for reviewed unavailable hydrometry`
    );
    assert.ok(context.event_hydrometry.network_status?.network);
    assert.ok(context.event_hydrometry.network_status?.summary_it);
    assert.ok(context.event_hydrometry.network_status?.summary_en);
    assert.equal(context.status, "context_available");
    assert.equal(context.event_hydrometry.hydrograph, null);
    assert.equal(context.event_hydrometry.observed_discharge_m3s, null);
    assert.equal(context.event_hydrometry.observed_stage_m, null);
  }

  if (observationStatus === "not_verified") {
    assert.equal(context.status, "source_review_required");
    assert.equal(
      context.event_hydrometry.reason_code,
      "event_specific_hydrometry_not_curated"
    );
    assert.equal(context.reference_station, null);
    assert.equal(context.event_hydrometry.hydrograph, null);
    assert.equal(context.event_hydrometry.observed_discharge_m3s, null);
    assert.equal(context.event_hydrometry.observed_stage_m, null);
    assert.ok(context.review?.required_checks?.length >= 3);
    assert.ok(context.process_evidence?.evidence_level);
  }

  assert.ok(context.sources.length >= 1);
  assert.ok(
    context.sources.every(
      (source) =>
        source.provider &&
        source.title &&
        (source.url == null || /^https?:\/\//.test(source.url))
    )
  );
  assert.ok(context.caveats.length >= 3);
  assert.ok(Array.isArray(context.documented_basin_processes));
}

const modigliana = JSON.parse(
  fs.readFileSync(path.join(CONTEXT_ROOT, "IT23.05.05.json"), "utf8")
);
assert.equal(modigliana.reference_station.station_code, "250500");
assert.equal(modigliana.reference_station.watercourse, "Marzeno");
assert.equal(modigliana.event_hydrometry.observations[0].value, 3.07);

const fontanelice = JSON.parse(
  fs.readFileSync(path.join(CONTEXT_ROOT, "IT23.05.07.json"), "utf8")
);
assert.equal(fontanelice.reference_station.station_code, "278700");
assert.equal(fontanelice.reference_station.distance_from_event_km, null);

for (const eventId of ["IT23.05.03", "IT23.05.04"]) {
  const reviewedGap = JSON.parse(
    fs.readFileSync(path.join(CONTEXT_ROOT, `${eventId}.json`), "utf8")
  );
  assert.equal(reviewedGap.event_hydrometry.observation_status, "not_available");
  assert.equal(
    reviewedGap.event_hydrometry.reason_code,
    "no_compatible_station_in_validated_event_report"
  );
  assert.equal(reviewedGap.reference_station, null);
}

const monterenzio = JSON.parse(
  fs.readFileSync(path.join(CONTEXT_ROOT, "IT23.05.06.json"), "utf8")
);
assert.equal(
  monterenzio.event_hydrometry.reason_code,
  "event_date_outside_validated_flood_report"
);

for (const eventId of [
  "IT22.09.04",
  "IT22.09.05",
  "IT22.09.06",
  "IT22.09.07",
  "IT22.09.08",
  "IT22.09.09",
  "IT22.09.10",
]) {
  const marcheReviewedGap = JSON.parse(
    fs.readFileSync(path.join(CONTEXT_ROOT, `${eventId}.json`), "utf8")
  );
  assert.equal(marcheReviewedGap.status, "context_available");
  assert.equal(marcheReviewedGap.event_hydrometry.observation_status, "not_available");
  assert.equal(
    marcheReviewedGap.event_hydrometry.reason_code,
    "no_compatible_station_in_validated_event_report"
  );
  assert.equal(marcheReviewedGap.reference_station, null);
  assert.equal(marcheReviewedGap.event_hydrometry.observed_stage_m, null);
  assert.equal(marcheReviewedGap.event_hydrometry.observed_discharge_m3s, null);
}

const piemonte2020Observed = {
  "IT20.10.03": ["COSSATO STRONA", 3.36],
  "IT20.10.07": ["GARESSIO TANARO", 5.93],
  "IT20.10.09": ["ANDONNO GESSO", 2.53],
  "IT20.10.10": ["GRAVELLONA STRONA", 4.07],
  "IT20.10.18": ["PONTE DI NAVA TANARO", 5.32],
};

for (const [eventId, [stationReference, peak]] of Object.entries(
  piemonte2020Observed
)) {
  const context = JSON.parse(
    fs.readFileSync(path.join(CONTEXT_ROOT, `${eventId}.json`), "utf8")
  );
  assert.equal(context.event_hydrometry.observation_status, "observed");
  assert.equal(context.reference_station.station_reference, stationReference);
  assert.equal(context.event_hydrometry.observations[0].value, peak);
  assert.match(context.event_hydrometry.interpretation, /not_bridge_section/);
}

for (const eventId of [
  "IT20.10.02",
  "IT20.10.14",
  "IT20.10.15",
  "IT20.10.16",
  "IT20.10.19",
]) {
  const context = JSON.parse(
    fs.readFileSync(path.join(CONTEXT_ROOT, `${eventId}.json`), "utf8")
  );
  assert.equal(context.event_hydrometry.observation_status, "not_available");
  assert.equal(
    context.event_hydrometry.reason_code,
    "no_compatible_station_in_validated_event_report"
  );
  assert.equal(context.reference_station, null);
}

const piemonte2000Groups = [
  {
    ids: [
      "IT00.10.03", "IT00.10.04", "IT00.10.05", "IT00.10.07",
      "IT00.10.08", "IT00.10.09", "IT00.10.10", "IT00.10.17",
      "IT00.10.24", "IT00.10.27",
    ],
    station: "LANZO STURA DI LANZO",
    values: [4.37, 2000],
  },
  {
    ids: [
      "IT00.10.11", "IT00.10.12", "IT00.10.13", "IT00.10.26",
      "IT00.10.30", "IT00.10.31", "IT00.10.34", "IT00.10.36",
      "IT00.10.38",
    ],
    station: "SAN MARTINO CHISONE",
    values: [4.05, 980],
  },
  {
    ids: [
      "IT00.10.06", "IT00.10.15", "IT00.10.16", "IT00.10.18",
      "IT00.10.28", "IT00.10.29", "IT00.10.32", "IT00.10.33",
      "IT00.10.35",
    ],
    station: "CUORGNE ORCO",
    values: [4.29, 1650],
  },
];

for (const group of piemonte2000Groups) {
  for (const eventId of group.ids) {
    const context = JSON.parse(
      fs.readFileSync(path.join(CONTEXT_ROOT, `${eventId}.json`), "utf8")
    );
    assert.equal(context.event_hydrometry.observation_status, "observed");
    assert.equal(context.reference_station.station_reference, group.station);
    assert.deepEqual(
      context.event_hydrometry.observations.map((observation) => observation.value),
      group.values
    );
    assert.match(context.event_hydrometry.interpretation, /not_bridge_section/);
  }
}

for (const eventId of ["IT00.10.19", "IT00.10.37"]) {
  const context = JSON.parse(
    fs.readFileSync(path.join(CONTEXT_ROOT, `${eventId}.json`), "utf8")
  );
  assert.equal(context.event_hydrometry.observation_status, "reported_estimate");
  assert.equal(context.event_hydrometry.observations[0].value, 3100);
  assert.equal(context.event_hydrometry.observations[0].reliability, "low");
}

const paesana2000 = JSON.parse(
  fs.readFileSync(path.join(CONTEXT_ROOT, "IT00.10.20.json"), "utf8")
);
assert.equal(paesana2000.event_hydrometry.observation_status, "reported_estimate");
assert.equal(paesana2000.event_hydrometry.observations[0].value, 900);

const soana2000 = JSON.parse(
  fs.readFileSync(path.join(CONTEXT_ROOT, "IT00.10.39.json"), "utf8")
);
assert.equal(soana2000.event_hydrometry.observations[0].value, 4.28);

const vessalico2020 = JSON.parse(
  fs.readFileSync(path.join(CONTEXT_ROOT, "IT20.10.06.json"), "utf8")
);
assert.equal(vessalico2020.reference_station.station_code, "POGLI");
assert.deepEqual(
  vessalico2020.event_hydrometry.observations.map((observation) => observation.value),
  [6.6, 6]
);

const ventimiglia2020 = JSON.parse(
  fs.readFileSync(path.join(CONTEXT_ROOT, "IT20.10.08.json"), "utf8")
);
assert.equal(ventimiglia2020.reference_station.station_code, "AIROL");
assert.deepEqual(
  ventimiglia2020.event_hydrometry.observations.map((observation) => observation.value),
  [8.37, 11.32]
);

for (const eventId of ["IT20.10.01", "IT20.10.04"]) {
  const context = JSON.parse(
    fs.readFileSync(path.join(CONTEXT_ROOT, `${eventId}.json`), "utf8")
  );
  assert.equal(context.event_hydrometry.observation_status, "not_available");
  assert.equal(
    context.event_hydrometry.reason_code,
    "no_compatible_station_in_validated_event_report"
  );
}

const colombiera2011 = JSON.parse(
  fs.readFileSync(path.join(CONTEXT_ROOT, "IT11.10.01.json"), "utf8")
);
assert.equal(colombiera2011.event_hydrometry.observations[0].value, 4.33);
assert.equal(
  colombiera2011.event_hydrometry.observations[0].parameter,
  "stage_before_collapse"
);

const aulla2011 = JSON.parse(
  fs.readFileSync(path.join(CONTEXT_ROOT, "IT11.10.02.json"), "utf8")
);
assert.equal(aulla2011.event_hydrometry.observation_status, "reported_estimate");
assert.deepEqual(
  aulla2011.event_hydrometry.observations.map((observation) => observation.value),
  [9.4, 9.6]
);

const pontremoli2011 = JSON.parse(
  fs.readFileSync(path.join(CONTEXT_ROOT, "IT11.10.08.json"), "utf8")
);
assert.equal(pontremoli2011.event_hydrometry.observations[0].value, 5.4);

for (const eventId of [
  "IT11.10.03", "IT11.10.04", "IT11.10.05", "IT11.10.06", "IT11.10.07",
]) {
  const context = JSON.parse(
    fs.readFileSync(path.join(CONTEXT_ROOT, `${eventId}.json`), "utf8")
  );
  assert.equal(context.event_hydrometry.observation_status, "not_available");
  assert.equal(context.reference_station, null);
}

for (const eventId of [
  "IT13.11.01", "IT13.11.02", "IT13.11.03",
  "IT13.11.04", "IT13.11.05", "IT13.11.06",
]) {
  const context = JSON.parse(
    fs.readFileSync(path.join(CONTEXT_ROOT, `${eventId}.json`), "utf8")
  );
  assert.equal(context.status, "context_available");
  assert.equal(context.event_hydrometry.observation_status, "not_available");
  assert.equal(context.reference_station, null);
  assert.ok(context.event_hydrometry.network_status.summary_it);
}

for (const eventId of [
  "IT15.10.01", "IT15.10.02", "IT15.10.03", "IT15.10.04",
]) {
  const context = JSON.parse(
    fs.readFileSync(path.join(CONTEXT_ROOT, `${eventId}.json`), "utf8")
  );
  assert.equal(context.event_hydrometry.observation_status, "not_available");
  assert.equal(context.reference_station, null);
}

const biella2002 = JSON.parse(
  fs.readFileSync(path.join(CONTEXT_ROOT, "IT02.06.03.json"), "utf8")
);
assert.equal(biella2002.reference_station.station_reference, "PASSOBREVE CERVO");
assert.deepEqual(
  biella2002.event_hydrometry.observations.map((observation) => observation.value),
  [6.46, 400, 500]
);

for (const eventId of ["IT02.06.01", "IT02.06.02", "IT02.06.04"]) {
  const context = JSON.parse(
    fs.readFileSync(path.join(CONTEXT_ROOT, `${eventId}.json`), "utf8")
  );
  assert.equal(context.event_hydrometry.observation_status, "not_available");
  assert.equal(context.reference_station, null);
}

for (const eventId of ["IT02.07.01", "IT02.07.02", "IT02.07.03"]) {
  const context = JSON.parse(
    fs.readFileSync(path.join(CONTEXT_ROOT, `${eventId}.json`), "utf8")
  );
  assert.equal(context.event_hydrometry.observation_status, "not_available");
  assert.equal(
    context.event_hydrometry.reason_code,
    "crossing_identity_conflict_in_validated_sources"
  );
  assert.equal(context.reference_station, null);
}

const ponteSamone2020 = JSON.parse(
  fs.readFileSync(path.join(CONTEXT_ROOT, "IT20.12.01.json"), "utf8")
);
assert.equal(ponteSamone2020.event_hydrometry.observation_status, "observed");
assert.equal(ponteSamone2020.reference_station.relationship, "installed_on_event_bridge");
assert.equal(ponteSamone2020.reference_station.distance_from_event_km, 0);
assert.equal(ponteSamone2020.event_hydrometry.observations[0].value, 1.82);

for (const eventId of ["IT20.12.02", "IT20.12.03"]) {
  const context = JSON.parse(
    fs.readFileSync(path.join(CONTEXT_ROOT, `${eventId}.json`), "utf8")
  );
  assert.equal(context.event_hydrometry.observation_status, "not_available");
  assert.equal(context.reference_station, null);
}

const murialdo2016 = JSON.parse(
  fs.readFileSync(path.join(CONTEXT_ROOT, "IT16.11.02.json"), "utf8")
);
assert.equal(murialdo2016.event_hydrometry.observation_status, "reported_estimate");
assert.equal(murialdo2016.event_hydrometry.observations[0].value, 480);
assert.equal(murialdo2016.reference_station.watercourse, "Bormida di Millesimo");

for (const eventId of ["IT16.11.03", "IT16.11.06"]) {
  const context = JSON.parse(
    fs.readFileSync(path.join(CONTEXT_ROOT, `${eventId}.json`), "utf8")
  );
  assert.equal(context.event_hydrometry.observation_status, "not_available");
  assert.equal(context.reference_station, null);
}

const calciano2011 = JSON.parse(
  fs.readFileSync(path.join(CONTEXT_ROOT, "IT11.03.01.json"), "utf8")
);
assert.equal(calciano2011.reference_station.station_reference, "CAMPOMAGGIORE BASENTO");
assert.equal(calciano2011.event_hydrometry.observations[0].value, 5.24);

const vibrata2011 = JSON.parse(
  fs.readFileSync(path.join(CONTEXT_ROOT, "IT11.03.02.json"), "utf8")
);
assert.equal(vibrata2011.event_hydrometry.observation_status, "not_available");
assert.equal(vibrata2011.reference_station, null);

const salinello2011 = JSON.parse(
  fs.readFileSync(path.join(CONTEXT_ROOT, "IT11.03.03.json"), "utf8")
);
assert.equal(salinello2011.reference_station.station_reference, "CAVATASSI SALINELLO");
assert.deepEqual(
  salinello2011.event_hydrometry.observations.map((observation) => observation.value),
  [2.86, 231]
);

for (const eventId of ["IT23.11.01", "IT23.11.02", "IT18.10.04", "IT18.10.05"]) {
  const context = JSON.parse(
    fs.readFileSync(path.join(CONTEXT_ROOT, `${eventId}.json`), "utf8")
  );
  assert.equal(context.event_hydrometry.observation_status, "not_available");
  assert.equal(context.reference_station, null);
}

const neto2020 = JSON.parse(
  fs.readFileSync(path.join(CONTEXT_ROOT, "IT20.11.02.json"), "utf8")
);
assert.equal(neto2020.event_hydrometry.observation_status, "observed");
assert.equal(neto2020.reference_station.station_reference, "ROCCA DI NETO NETO");
assert.equal(neto2020.event_hydrometry.observations[0].value, 1.12);

const iornito2020 = JSON.parse(
  fs.readFileSync(path.join(CONTEXT_ROOT, "IT20.11.03.json"), "utf8")
);
assert.equal(iornito2020.event_hydrometry.observation_status, "not_available");
assert.equal(iornito2020.reference_station, null);

const coccodi2018 = JSON.parse(
  fs.readFileSync(path.join(CONTEXT_ROOT, "IT18.10.01.json"), "utf8")
);
assert.equal(coccodi2018.event_hydrometry.observation_status, "not_available");
assert.equal(coccodi2018.reference_station, null);

const santaLucia2018 = JSON.parse(
  fs.readFileSync(path.join(CONTEXT_ROOT, "IT18.10.02.json"), "utf8")
);
assert.equal(santaLucia2018.event_hydrometry.observation_status, "observed");
assert.equal(santaLucia2018.reference_station.station_reference, "UTA GUTTURU MANNU");
assert.deepEqual(
  santaLucia2018.event_hydrometry.observations.map((observation) => observation.value),
  [4.02, 5.36]
);

for (const eventId of ["IT11.11.02", "IT11.11.03"]) {
  const context = JSON.parse(
    fs.readFileSync(path.join(CONTEXT_ROOT, `${eventId}.json`), "utf8")
  );
  assert.equal(context.event_hydrometry.observation_status, "not_available");
  assert.equal(context.reference_station, null);
}

const aulella2012 = JSON.parse(
  fs.readFileSync(path.join(CONTEXT_ROOT, "IT12.11.01.json"), "utf8")
);
assert.equal(aulella2012.reference_station.station_reference, "SOLIERA AULELLA");
assert.equal(aulella2012.event_hydrometry.observations[0].value, 6.49);

const albegna2012 = JSON.parse(
  fs.readFileSync(path.join(CONTEXT_ROOT, "IT12.11.03.json"), "utf8")
);
assert.equal(albegna2012.reference_station.station_reference, "MARSILIANA ALBEGNA");
assert.equal(albegna2012.event_hydrometry.observations[0].value, 9.13);

for (const eventId of ["IT12.11.02", "IT12.11.04"]) {
  const context = JSON.parse(
    fs.readFileSync(path.join(CONTEXT_ROOT, `${eventId}.json`), "utf8")
  );
  assert.equal(context.event_hydrometry.observation_status, "not_available");
  assert.equal(context.reference_station, null);
}

for (const eventId of ["IT13.10.01", "IT13.10.02"]) {
  const context = JSON.parse(
    fs.readFileSync(path.join(CONTEXT_ROOT, `${eventId}.json`), "utf8")
  );
  assert.equal(context.event_hydrometry.observation_status, "not_available");
  assert.equal(context.reference_station, null);
}

const trebbia2015 = JSON.parse(
  fs.readFileSync(path.join(CONTEXT_ROOT, "IT15.09.01.json"), "utf8")
);
assert.equal(trebbia2015.event_hydrometry.observation_status, "observed");
assert.equal(trebbia2015.reference_station.station_reference, "BOBBIO TREBBIA");
assert.equal(trebbia2015.reference_station.distance_from_event_km, 6);
assert.equal(trebbia2015.event_hydrometry.observations[0].value, 6.22);

const cervaro2015 = JSON.parse(
  fs.readFileSync(path.join(CONTEXT_ROOT, "IT15.10.05.json"), "utf8")
);
assert.equal(cervaro2015.event_hydrometry.observation_status, "not_available");
assert.equal(cervaro2015.reference_station, null);

for (const eventId of ["IT24.05.02", "IT24.05.03", "IT24.10.01"]) {
  const context = JSON.parse(
    fs.readFileSync(path.join(CONTEXT_ROOT, `${eventId}.json`), "utf8")
  );
  assert.equal(context.event_hydrometry.observation_status, "not_available");
  assert.equal(context.reference_station, null);
}

const grandEyvia2024 = JSON.parse(
  fs.readFileSync(path.join(CONTEXT_ROOT, "IT24.06.01.json"), "utf8")
);
assert.equal(grandEyvia2024.event_hydrometry.observation_status, "reported_estimate");
assert.equal(grandEyvia2024.reference_station.station_reference, "CRETAZ GRAND EYVIA");
assert.equal(grandEyvia2024.event_hydrometry.observations[0].value, 377);

const bormidaPallare2024 = JSON.parse(
  fs.readFileSync(path.join(CONTEXT_ROOT, "IT24.10.03.json"), "utf8")
);
assert.equal(bormidaPallare2024.event_hydrometry.observation_status, "observed");
assert.equal(bormidaPallare2024.reference_station.station_code, "CARCA");
assert.deepEqual(
  bormidaPallare2024.event_hydrometry.observations.map((observation) => observation.value),
  [2.9, 2.51]
);

for (const eventId of ["IT24.09.01", "IT25.07.01"]) {
  const context = JSON.parse(
    fs.readFileSync(path.join(CONTEXT_ROOT, `${eventId}.json`), "utf8")
  );
  assert.equal(context.event_hydrometry.observation_status, "not_available");
  assert.equal(context.reference_station, null);
}

const elvo2025 = JSON.parse(
  fs.readFileSync(path.join(CONTEXT_ROOT, "IT25.04.01.json"), "utf8")
);
assert.equal(elvo2025.event_hydrometry.observation_status, "observed");
assert.equal(elvo2025.reference_station.station_reference, "CARISIO ELVO");
assert.deepEqual(
  elvo2025.event_hydrometry.observations.map((observation) => observation.value),
  [4.4, 3]
);

const agno2025 = JSON.parse(
  fs.readFileSync(path.join(CONTEXT_ROOT, "IT25.04.02.json"), "utf8")
);
assert.equal(agno2025.event_hydrometry.observation_status, "observed");
assert.equal(agno2025.reference_station.station_reference, "PONTE BROGLIANO AGNO");
assert.equal(agno2025.event_hydrometry.observations[0].value, 2.73);

for (const eventId of ["IT21.10.02", "IT23.05.01", "IT23.10.01"]) {
  const context = JSON.parse(
    fs.readFileSync(path.join(CONTEXT_ROOT, `${eventId}.json`), "utf8")
  );
  assert.equal(context.event_hydrometry.observation_status, "not_available");
  assert.equal(context.reference_station, null);
}

for (const eventId of ["IT19.10.01", "IT20.11.04"]) {
  const context = JSON.parse(
    fs.readFileSync(path.join(CONTEXT_ROOT, `${eventId}.json`), "utf8")
  );
  assert.equal(context.status, "context_available");
  assert.equal(context.event_hydrometry.observation_status, "not_available");
  assert.equal(context.reference_station, null);
}

for (const eventId of ["IT18.10.03", "IT18.10.06", "IT18.10.07"]) {
  const context = JSON.parse(
    fs.readFileSync(path.join(CONTEXT_ROOT, `${eventId}.json`), "utf8")
  );
  assert.equal(context.status, "context_available");
  assert.equal(context.event_hydrometry.observation_status, "not_available");
  assert.equal(
    context.event_hydrometry.reason_code,
    "no_hydrometric_value_in_validated_event_source"
  );
  assert.equal(context.reference_station, null);
}

for (const eventId of ["IT17.01.01", "IT17.09.01", "IT17.09.02"]) {
  const context = JSON.parse(
    fs.readFileSync(path.join(CONTEXT_ROOT, `${eventId}.json`), "utf8")
  );
  assert.equal(context.status, "context_available");
  assert.equal(context.event_hydrometry.observation_status, "not_available");
  assert.equal(context.reference_station, null);
}

const allaro2017 = JSON.parse(
  fs.readFileSync(path.join(CONTEXT_ROOT, "IT17.01.01.json"), "utf8")
);
assert.equal(
  allaro2017.event_hydrometry.reason_code,
  "no_tabulated_value_in_validated_event_report"
);

for (const eventId of ["IT15.11.01", "IT16.03.01"]) {
  const context = JSON.parse(
    fs.readFileSync(path.join(CONTEXT_ROOT, `${eventId}.json`), "utf8")
  );
  assert.equal(context.status, "context_available");
  assert.equal(context.event_hydrometry.observation_status, "not_available");
  assert.equal(context.reference_station, null);
}

const baganza2014 = JSON.parse(
  fs.readFileSync(path.join(CONTEXT_ROOT, "IT14.10.01.json"), "utf8")
);
assert.equal(baganza2014.event_hydrometry.observation_status, "observed");
assert.equal(
  baganza2014.reference_station.station_reference,
  "BAGANZA A MARZOLARA"
);
assert.equal(baganza2014.event_hydrometry.observations[0].value, 3.12);
assert.equal(
  baganza2014.event_hydrometry.observations[0].value_type,
  "recorded_annual_maximum_on_event_date"
);

for (const eventId of ["IT14.11.01", "IT14.11.02"]) {
  const context = JSON.parse(
    fs.readFileSync(path.join(CONTEXT_ROOT, `${eventId}.json`), "utf8")
  );
  assert.equal(context.status, "context_available");
  assert.equal(context.event_hydrometry.observation_status, "not_available");
  assert.equal(
    context.event_hydrometry.reason_code,
    "no_compatible_station_in_validated_event_report"
  );
  assert.equal(context.reference_station, null);
}

const staffora2014 = JSON.parse(
  fs.readFileSync(path.join(CONTEXT_ROOT, "IT14.11.03.json"), "utf8")
);
assert.equal(staffora2014.status, "context_available");
assert.equal(staffora2014.event_hydrometry.observation_status, "not_available");
assert.equal(
  staffora2014.event_hydrometry.reason_code,
  "no_hydrometric_value_in_validated_event_source"
);
assert.equal(staffora2014.reference_station, null);

for (const eventId of ["IT11.03.04", "IT13.12.01", "IT14.05.01"]) {
  const context = JSON.parse(
    fs.readFileSync(path.join(CONTEXT_ROOT, `${eventId}.json`), "utf8")
  );
  assert.equal(context.status, "context_available");
  assert.equal(context.event_hydrometry.observation_status, "not_available");
  assert.equal(
    context.event_hydrometry.reason_code,
    "no_tabulated_value_in_validated_event_report"
  );
  assert.equal(context.reference_station, null);
}

const priola2016 = JSON.parse(
  fs.readFileSync(path.join(CONTEXT_ROOT, "IT16.11.05.json"), "utf8")
);
assert.equal(priola2016.event_hydrometry.observation_status, "observed");
assert.equal(priola2016.reference_station.station_reference, "GARESSIO TANARO");
assert.deepEqual(
  priola2016.event_hydrometry.observations.map(({ value }) => value),
  [5.19, 830]
);

const frassino2008 = JSON.parse(
  fs.readFileSync(path.join(CONTEXT_ROOT, "IT08.05.01.json"), "utf8")
);
assert.equal(frassino2008.event_hydrometry.observation_status, "observed");
assert.equal(frassino2008.reference_station.station_reference, "ROSSANA VARAITA");
assert.deepEqual(
  frassino2008.event_hydrometry.observations.map(({ value }) => value),
  [2.51, 250]
);

for (const eventId of ["IT08.05.02", "IT11.01.01", "IT14.09.01"]) {
  const context = JSON.parse(
    fs.readFileSync(path.join(CONTEXT_ROOT, `${eventId}.json`), "utf8")
  );
  assert.equal(context.status, "context_available");
  assert.equal(context.event_hydrometry.observation_status, "not_available");
  assert.equal(context.reference_station, null);
}

const arquata2002 = JSON.parse(
  fs.readFileSync(path.join(CONTEXT_ROOT, "IT02.11.01.json"), "utf8")
);
assert.equal(arquata2002.status, "context_available");
assert.equal(arquata2002.event_hydrometry.observation_status, "not_available");
assert.equal(
  arquata2002.event_hydrometry.reason_code,
  "no_compatible_station_in_validated_event_report"
);
assert.equal(arquata2002.reference_station, null);

for (const eventId of ["IT02.06.05", "IT02.06.06"]) {
  const context = JSON.parse(
    fs.readFileSync(path.join(CONTEXT_ROOT, `${eventId}.json`), "utf8")
  );
  assert.equal(context.status, "context_available");
  assert.equal(context.event_hydrometry.observation_status, "not_available");
  assert.equal(
    context.event_hydrometry.reason_code,
    "crossing_identity_conflict_in_validated_sources"
  );
  assert.equal(context.reference_station, null);
}

const pellice2011 = JSON.parse(
  fs.readFileSync(path.join(CONTEXT_ROOT, "IT11.11.01.json"), "utf8")
);
assert.equal(pellice2011.event_hydrometry.observation_status, "observed");
assert.equal(
  pellice2011.reference_station.station_reference,
  "LUSERNA S. GIOVANNI PELLICE"
);
assert.deepEqual(
  pellice2011.event_hydrometry.observations.map(({ value }) => value),
  [2.98, 350, 400]
);

const sanGirolamo2008 = JSON.parse(
  fs.readFileSync(path.join(CONTEXT_ROOT, "IT08.10.01.json"), "utf8")
);
assert.equal(
  sanGirolamo2008.event_hydrometry.observation_status,
  "reported_estimate"
);
assert.equal(sanGirolamo2008.event_hydrometry.observations[0].value, 409.3);
assert.equal(
  sanGirolamo2008.event_hydrometry.observations[0].value_type,
  "official_post_event_peak_discharge_reconstruction"
);

for (const eventId of ["IT08.10.02", "IT08.11.01"]) {
  const context = JSON.parse(
    fs.readFileSync(path.join(CONTEXT_ROOT, `${eventId}.json`), "utf8")
  );
  assert.equal(context.status, "context_available");
  assert.equal(context.event_hydrometry.observation_status, "not_available");
  assert.equal(
    context.event_hydrometry.reason_code,
    "no_hydrometric_value_in_validated_event_source"
  );
  assert.equal(context.reference_station, null);
}

for (const eventId of ["IT03.08.01", "IT03.09.01"]) {
  const context = JSON.parse(
    fs.readFileSync(path.join(CONTEXT_ROOT, `${eventId}.json`), "utf8")
  );
  assert.equal(context.status, "context_available");
  assert.equal(context.event_hydrometry.observation_status, "not_available");
  assert.equal(
    context.event_hydrometry.reason_code,
    "no_hydrometric_value_in_validated_event_source"
  );
  assert.equal(context.reference_station, null);
}

const picone2005 = JSON.parse(
  fs.readFileSync(path.join(CONTEXT_ROOT, "IT05.10.02.json"), "utf8")
);
assert.equal(picone2005.event_hydrometry.observation_status, "reported_estimate");
assert.equal(picone2005.event_hydrometry.observations[0].value, 280.22);
assert.equal(
  picone2005.reference_station.station_reference,
  "PICONE PRESSO PONTE CARBONARA-MODUGNO"
);

const adelfia2005 = JSON.parse(
  fs.readFileSync(path.join(CONTEXT_ROOT, "IT05.10.03.json"), "utf8")
);
assert.equal(adelfia2005.status, "context_available");
assert.equal(adelfia2005.event_hydrometry.observation_status, "not_available");
assert.equal(
  adelfia2005.event_hydrometry.reason_code,
  "crossing_watercourse_not_resolved_for_hydrometric_transfer"
);
assert.equal(adelfia2005.reference_station, null);

for (const eventId of ["IT09.12.01", "IT10.10.01", "IT13.03.01"]) {
  const context = JSON.parse(
    fs.readFileSync(path.join(CONTEXT_ROOT, `${eventId}.json`), "utf8")
  );
  assert.equal(context.status, "context_available");
  assert.equal(context.event_hydrometry.observation_status, "not_available");
  assert.equal(context.reference_station, null);
}

assert.equal(
  JSON.parse(fs.readFileSync(path.join(CONTEXT_ROOT, "IT09.12.01.json"), "utf8"))
    .event_hydrometry.reason_code,
  "event_chronology_not_resolved_in_validated_sources"
);
assert.equal(
  JSON.parse(fs.readFileSync(path.join(CONTEXT_ROOT, "IT13.03.01.json"), "utf8"))
    .event_hydrometry.reason_code,
  "failure_not_tied_to_single_hydrometric_peak_in_validated_source"
);

const piacenza2009 = JSON.parse(
  fs.readFileSync(path.join(CONTEXT_ROOT, "IT09.04.04.json"), "utf8")
);
assert.equal(piacenza2009.event_hydrometry.observation_status, "reported_estimate");
assert.equal(piacenza2009.reference_station.station_reference, "PIACENZA PO");
assert.equal(piacenza2009.event_hydrometry.observations[0].value, 7000);

for (const eventId of [
  "IT16.11.01",
  "IT17.06.01",
  "IT18.02.01",
  "IT20.05.01",
  "IT23.01.01",
]) {
  const context = JSON.parse(
    fs.readFileSync(path.join(CONTEXT_ROOT, `${eventId}.json`), "utf8")
  );
  assert.equal(context.status, "context_available");
  assert.equal(context.event_hydrometry.observation_status, "not_available");
  assert.equal(context.reference_station, null);
}

assert.equal(
  JSON.parse(fs.readFileSync(path.join(CONTEXT_ROOT, "IT16.11.01.json"), "utf8"))
    .event_hydrometry.reason_code,
  "failure_chronology_precludes_event_hydrometry"
);
assert.equal(
  JSON.parse(fs.readFileSync(path.join(CONTEXT_ROOT, "IT20.05.01.json"), "utf8"))
    .event_hydrometry.reason_code,
  "event_date_conflict_in_validated_sources"
);

const albedosa2019 = JSON.parse(
  fs.readFileSync(path.join(CONTEXT_ROOT, "IT19.10.01.json"), "utf8")
);
assert.equal(
  albedosa2019.event_hydrometry.reason_code,
  "receiving_river_station_not_transferable_to_tributary"
);

const bitti2020 = JSON.parse(
  fs.readFileSync(path.join(CONTEXT_ROOT, "IT20.11.04.json"), "utf8")
);
assert.equal(
  bitti2020.event_hydrometry.reason_code,
  "model_scope_does_not_cover_event_watercourse"
);

for (const eventId of [
  "IT00.10.01", "IT00.10.02", "IT00.10.14", "IT00.10.21",
  "IT00.10.22", "IT00.10.23", "IT00.10.25", "IT00.10.40",
  "IT00.10.41", "IT00.10.42", "IT00.10.43",
]) {
  const context = JSON.parse(
    fs.readFileSync(path.join(CONTEXT_ROOT, `${eventId}.json`), "utf8")
  );
  assert.equal(context.event_hydrometry.observation_status, "not_available");
  assert.equal(context.reference_station, null);
}

assert.equal(
  index.coverage.source_review_records,
  0,
  "The published hydraulic catalogue must not retain generic source-review placeholders"
);

const margorabbia2002 = JSON.parse(
  fs.readFileSync(path.join(CONTEXT_ROOT, "IT02.05.01.json"), "utf8")
);
assert.equal(
  margorabbia2002.event_hydrometry.reason_code,
  "monitoring_network_failed_during_flood"
);
assert.equal(margorabbia2002.sources.length, 1);

for (const eventId of ["IT09.02.01", "IT15.03.03"]) {
  const context = JSON.parse(
    fs.readFileSync(path.join(CONTEXT_ROOT, `${eventId}.json`), "utf8")
  );
  assert.equal(
    context.event_hydrometry.reason_code,
    "failure_not_tied_to_single_hydrometric_peak_in_validated_source"
  );
}

const termeVigliatore2022 = JSON.parse(
  fs.readFileSync(path.join(CONTEXT_ROOT, "IT22.12.02.json"), "utf8")
);
assert.equal(termeVigliatore2022.sources.length, 1);
assert.match(termeVigliatore2022.sources[0].title, /3 dicembre 2022/i);

const picinisco2020 = JSON.parse(
  fs.readFileSync(path.join(CONTEXT_ROOT, "IT20.10.13.json"), "utf8")
);
assert.equal(picinisco2020.sources.length, 1);
assert.match(picinisco2020.sources[0].title, /Picinisco/i);
assert.ok(
  picinisco2020.sources.every((source) => !/Piemonte/i.test(source.title))
);

console.log(
  `Validated ${Object.keys(index.events).length} event hydraulic context record(s)`
);
