import assert from "node:assert/strict";
import fs from "node:fs";

import {
  buildHydraulicGeometryValueAudit,
  HYDRAULIC_GEOMETRY_VALUE_AUDIT_VERSION,
} from "./lib/hydraulic-geometry-value-audit.js";

function readCollection(filePath, key) {
  const resource = JSON.parse(fs.readFileSync(filePath, "utf8"));
  return Array.isArray(resource) ? resource : resource[key] || [];
}

const events = readCollection(
  "private-data/professional/professional-events.json",
  "events"
);
const sources = readCollection(
  "private-data/professional/professional-sources.json",
  "sources"
);
const audit = buildHydraulicGeometryValueAudit({
  bootstrapIterations: 250,
  events,
  sources,
});
const repeated = buildHydraulicGeometryValueAudit({
  bootstrapIterations: 250,
  events,
  sources,
});

assert.equal(audit.audit_version, HYDRAULIC_GEOMETRY_VALUE_AUDIT_VERSION);
assert.equal(audit.dataset.geometry_event_count, 158);
assert.equal(audit.dataset.length_available, 158);
assert.equal(audit.dataset.piers_available, 155);
assert.deepEqual(audit, repeated);
assert.equal(audit.boundaries.production_feature_authorized, false);
assert.equal(audit.decision.production_status, "not_authorized");

for (const task of Object.values(audit.tasks)) {
  const validation = task.validation.episode_holdout;
  const supports = Object.values(validation).map((item) => item.support);

  assert.equal(new Set(supports).size, 1);
  assert.equal(task.sample_size, supports[0]);
  assert.equal(task.primary_comparison.bootstrap_iterations, 250);
  assert.equal(task.primary_comparison.episode_count > 1, true);
  assert.deepEqual(
    Object.keys(task.comparisons_to_majority).sort(),
    [
      "bridge_length",
      "bridge_length_and_piers",
      "piers_in_active_riverbed",
    ]
  );
  assert.equal(validation.majority.coverage, 1);
  assert.equal(validation.bridge_length.coverage, 1);
  assert.equal(
    validation.bridge_length_and_piers.accuracy_all_eligible >= 0 &&
      validation.bridge_length_and_piers.accuracy_all_eligible <= 1,
    true
  );
}

[
  "scripts/analyze-collapse-intelligence.js",
  "scripts/analyze-hazard-gated-collapse-intelligence.js",
  "server/mitigationIntelligenceService.js",
].forEach((filePath) => {
  const productionCode = fs.readFileSync(filePath, "utf8");
  assert.equal(
    productionCode.includes("hydraulic_geometry"),
    false,
    `${filePath} must not consume experimental geometry`
  );
});

console.log(JSON.stringify({
  judgement: audit.decision.judgement,
  ok: true,
  process_sample: audit.tasks.failure_process.sample_size,
  component_sample: audit.tasks.component_involved.sample_size,
}, null, 2));
