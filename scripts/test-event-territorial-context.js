import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const ROOT = path.resolve(import.meta.dirname, "..");
const contextPath = path.join(
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
]);

assert.equal(context.schema_version, "arcus-open-territorial-context-v1");
assert.equal(context.release, current.version);
assert.equal(Object.keys(context.events).length, openEvents.length);
assert.equal(context.coverage.events, openEvents.length);
assert.equal(context.coverage.fully_resolved_events, 256);
assert.equal(context.coverage.unresolved_events, 5);
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
