import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const ROOT = path.resolve(import.meta.dirname, "..");
const contextPath = process.env.ARCUS_TERRITORIAL_TEST_PATH || path.join(
  ROOT,
  "public",
  "data",
  "event-context",
  "territorial",
  "index.json"
);
const context = JSON.parse(fs.readFileSync(contextPath, "utf8"));
const current = JSON.parse(
  fs.readFileSync(path.join(ROOT, "private-data", "open", "releases", "current.json"), "utf8")
);
const releaseDirectory = path.join(ROOT, "private-data", "open", "releases", current.version);
const openEvents = JSON.parse(
  fs.readFileSync(path.join(releaseDirectory, "events.json"), "utf8")
).events;
const allowedEventFields = new Set([
  "coordinates",
  "event_id",
  "hydraulic",
  "landslide",
  "seismic",
]);
const allowedStatuses = new Set([
  "available",
  "no_intersection",
  "outside_coverage",
  "service_unreachable",
  "circuit_open",
  "location_not_precise",
]);

assert.equal(context.schema_version, "arcus-open-territorial-context-v1");
assert.equal(context.release, current.version);
assert.equal(Object.keys(context.events).length, openEvents.length);
assert.equal(context.coverage.events, openEvents.length);
const resolved = new Set(["available", "no_intersection", "outside_coverage"]);
const resolvedCount = Object.values(context.events).filter((row) =>
  ["hydraulic", "landslide", "seismic"].every((key) => resolved.has(row[key].status))).length;
assert.equal(context.coverage.fully_resolved_events, resolvedCount);
assert.equal(context.coverage.unresolved_events, openEvents.length - resolvedCount);
assert.match(context.caveat, /not retrospective causal proof/i);
assert.match(context.rights_note, /provider terms/i);

for (const event of openEvents) {
  const item = context.events[event.event_id];

  assert.ok(item, `Missing territorial context for ${event.event_id}`);
  assert.match(item.event_id, /^IT\d{2}\.\d{2}\.\d{2}$/);
  assert.deepEqual(Object.keys(item).sort(), [...allowedEventFields].sort());
  assert.equal(Math.abs(item.coordinates.latitude - event.latitude) <= 0.000001, true);
  assert.equal(Math.abs(item.coordinates.longitude - event.longitude) <= 0.000001, true);
  assert.equal(allowedStatuses.has(item.hydraulic.status), true);
  assert.equal(allowedStatuses.has(item.landslide.status), true);
  assert.equal(allowedStatuses.has(item.seismic.status), true);
  if (!event.exact_location) {
    for (const key of ["hydraulic", "landslide", "seismic"]) {
      assert.deepEqual(item[key], { status: "location_not_precise", queried_at: null });
    }
  } else {
    const classes = item.hydraulic.matched_classes;
    assert.equal(item.hydraulic.source_dataset_version, "v5.0 (2020)");
    assert.equal(item.hydraulic.status, classes.length ? "available" : "no_intersection");
    assert.equal(item.hydraulic.highest_class, classes.at(-1) ?? null);
    assert.deepEqual(classes, [...new Set(classes)].sort());
    assert.ok(classes.every((name) => ["P1", "P2", "P3"].includes(name)));
    if (item.landslide.verification === "live_wfs") {
      assert.equal(item.landslide.source_dataset_version, "5.0");
      assert.ok(resolved.has(item.landslide.status));
    }
    if (item.seismic.status === "available") {
      assert.ok(Number.isFinite(item.seismic.pga_p50_g) && item.seismic.pga_p50_g >= 0);
      assert.equal(item.seismic.sampling_method, "nearest_grid_node");
    }
  }
  assert.equal(Object.hasOwn(item.hydraulic, "normalized_score"), false);
  assert.equal(Object.hasOwn(item.landslide, "normalized_score"), false);
  assert.equal(Object.hasOwn(item.seismic, "normalized_score"), false);
}

const component = fs.readFileSync(
  path.join(ROOT, "src", "components", "popup", "EventTerritorialContext.jsx"),
  "utf8"
);

assert.match(component, /Contesto territoriale attuale/);
assert.match(component, /non ricostruisce la pericolosità alla data dell.evento/i);
assert.match(component, /non certifica assenza di pericolo idraulico/i);
assert.match(component, /matched_hazard_classes/);
assert.match(component, /highest_hazard_class/);
assert.match(component, /non una classe sismica inventata da ARCUS/i);
assert.match(component, /Nessun valore ricostruisce la condizione alla data del collasso/i);

console.log(`Validated ${Object.keys(context.events).length} territorial context records`);
