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
]);
const contextStatuses = new Set(["context_available", "source_review_required"]);

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

  if (observationStatus === "observed") {
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
          observation.source_id
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
    observationStatus !== "observed" &&
    observationStatus !== "not_verified"
  ) {
    assert.equal(
      context.event_hydrometry.reason_code,
      "monitoring_network_failed_during_flood"
    );
    assert.ok(context.event_hydrometry.network_status?.network);
    assert.ok(context.event_hydrometry.network_status?.summary_it);
    assert.ok(context.event_hydrometry.network_status?.summary_en);
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

console.log(
  `Validated ${Object.keys(index.events).length} event hydraulic context record(s)`
);
