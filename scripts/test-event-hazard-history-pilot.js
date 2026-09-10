import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const ROOT = path.resolve(import.meta.dirname, "..");
const CONFIG_PATH = path.join(ROOT, "config", "event-hazard-history-pilot.json");
const OUTPUT_PATH = path.join(
  ROOT,
  "private-data",
  "research",
  "event-hazard-history-pilot.json"
);
const CURRENT_CONTEXT_PATH = path.join(
  ROOT,
  "public",
  "data",
  "event-context",
  "territorial",
  "index.json"
);
const CURRENT_RELEASE_POINTER_PATH = path.join(
  ROOT,
  "private-data",
  "open",
  "releases",
  "current.json"
);
const PUBLIC_OUTPUT_PATH = path.join(
  ROOT,
  "public",
  "data",
  "event-context",
  "hazard-history",
  "index.json"
);
const config = JSON.parse(fs.readFileSync(CONFIG_PATH, "utf8"));
const output = JSON.parse(fs.readFileSync(OUTPUT_PATH, "utf8"));
const currentContext = JSON.parse(fs.readFileSync(CURRENT_CONTEXT_PATH, "utf8"));
const publicOutput = JSON.parse(fs.readFileSync(PUBLIC_OUTPUT_PATH, "utf8"));
const currentReleasePointer = JSON.parse(
  fs.readFileSync(CURRENT_RELEASE_POINTER_PATH, "utf8")
);
const currentEvents = JSON.parse(
  fs.readFileSync(
    path.join(
      ROOT,
      "private-data",
      "open",
      "releases",
      currentReleasePointer.version,
      "events.json"
    ),
    "utf8"
  )
).events;
const exactEventCount = currentEvents.filter((event) => event.exact_location).length;
const allowedRelations = new Set([
  "after_event",
  "before_event",
  "same_or_overlapping_reference_period",
]);

assert.equal(output.schema_version, "arcus-event-hazard-history-catalog-v2");
assert.equal(output.analysis_role, "versioned_cartographic_context_not_collapse_causation");
assert.equal(output.boundary_tolerance_m, 50);
assert.equal(output.coverage.hydraulic_events, exactEventCount);
assert.equal(output.coverage.landslide_events, exactEventCount);
assert.equal(output.coverage.events, exactEventCount);
assert.equal(output.coverage.catalogue_events, currentEvents.length);
assert.equal(
  output.coverage.excluded_approximate_coordinates,
  currentEvents.length - exactEventCount
);
assert.equal(output.coverage.releases_processed, 4);
assert.match(output.caveats.join(" "), /not proof/i);
assert.match(output.caveats.join(" "), /does not prove absence of hazard/i);
assert.equal(publicOutput.schema_version, "arcus-event-hazard-history-public-v1");
assert.equal(
  publicOutput.observation_role,
  "official_class_membership_at_documented_event_coordinate"
);
assert.equal(Object.keys(publicOutput.events).length, output.coverage.events);
assert.equal(Object.hasOwn(publicOutput.events["IT18.10.03"].hazards.hydraulic, "transitions"), false);
assert.equal(Object.hasOwn(publicOutput.sources, "ispra-landslide-2024-v5"), true);
assert.equal(
  publicOutput.events["IT18.10.03"].hazards.hydraulic.comparison_summary.status,
  "changed"
);
assert.equal(
  publicOutput.events["IT18.10.01"].hazards.hydraulic.comparison_summary.status,
  "unchanged"
);
assert.deepEqual(
  publicOutput.events["IT18.10.03"].hazards.hydraulic.comparison_summary.current_classes,
  ["P1", "P2"]
);
assert.equal(
  publicOutput.events["IT13.02.01"].hazards.landslide.comparison_summary.reason,
  "no_pre_event_release"
);
assert.equal(
  publicOutput.events["IT24.05.02"].hazards.hydraulic.comparison_summary.reason,
  "no_post_event_release"
);

for (const source of output.sources) {
  assert.equal(Number.isSafeInteger(source.archive_bytes), true);
  assert.match(source.archive_sha256, /^[a-f0-9]{64}$/);
}

for (const event of Object.values(output.events)) {
  assert.match(event.event_id, /^IT\d{2}\.\d{2}\.\d{2}$/);
  assert.equal(event.coordinate_quality, "exact_location_in_open_release");
  assert.deepEqual(Object.keys(event.hazards).sort(), ["hydraulic", "landslide"]);

  for (const [hazard, history] of Object.entries(event.hazards)) {
    assert.equal(["hydraulic", "landslide"].includes(hazard), true);
    assert.equal(history.observations.length >= 2, true);
    assert.equal(history.transitions.length, history.observations.length - 1);

    for (const observation of history.observations) {
      assert.equal(allowedRelations.has(observation.temporal_relation_to_event), true);
      assert.equal(["intersection", "no_intersection"].includes(observation.point_status), true);
      assert.equal(Array.isArray(observation.classes), true);
      assert.equal(Object.hasOwn(observation, "normalized_score"), false);
      assert.equal(Object.hasOwn(observation, "risk_score"), false);
    }

    for (const transition of history.transitions) {
      assert.equal(
        [
          "boundary_robustness_incomplete",
          "cartographic_comparison_only",
          "manual_gis_review_required",
        ].includes(
          transition.interpretation_status
        ),
        true
      );
    }
  }
}

for (const event of Object.values(publicOutput.events)) {
  for (const history of Object.values(event.hazards)) {
    const summary = history.comparison_summary;
    assert.equal(["changed", "unchanged", "not_comparable"].includes(summary.status), true);

    if (["changed", "unchanged"].includes(summary.status)) {
      assert.equal(Array.isArray(summary.baseline_classes), true);
      assert.equal(Array.isArray(summary.current_classes), true);
      assert.ok(summary.baseline_release);
      assert.ok(summary.current_release);
    } else {
      assert.equal(
        [
          "current_release_observation_unavailable",
          "no_post_event_release",
          "no_pre_event_release",
        ].includes(summary.reason),
        true
      );
    }
  }
}

const regressionIds = new Set([
  ...config.regression_cases.hydraulic_event_ids,
  ...config.regression_cases.landslide_event_ids,
]);
const expandedCatalogueEvent = currentEvents.find(
  (event) => event.exact_location && !regressionIds.has(event.event_id)
);
assert.ok(expandedCatalogueEvent, "Expected at least one event outside the regression subset");
assert.ok(output.events[expandedCatalogueEvent.event_id]);
assert.ok(publicOutput.events[expandedCatalogueEvent.event_id]);

for (const event of currentEvents.filter((item) => !item.exact_location)) {
  assert.equal(Object.hasOwn(output.events, event.event_id), false);
  assert.equal(Object.hasOwn(publicOutput.events, event.event_id), false);
}

for (const eventId of config.regression_cases.hydraulic_event_ids) {
  assert.equal(output.events[eventId].hazards.hydraulic.observations.length, 2);
  const archiveObservation = output.events[eventId].hazards.hydraulic.observations.find(
    (item) => item.release_id === "ispra-hydraulic-2020-v5"
  );
  assert.deepEqual(
    archiveObservation.classes,
    currentContext.events[eventId].hydraulic.matched_classes,
    `2020 archive/current WFS mismatch for ${eventId}`
  );
}

for (const eventId of config.regression_cases.landslide_event_ids) {
  assert.equal(output.events[eventId].hazards.landslide.observations.length >= 2, true);
}

console.log(`Validated ${output.coverage.events} event hazard-history catalogue records`);
