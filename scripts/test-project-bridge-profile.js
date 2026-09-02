import assert from "node:assert/strict";

import {
  compareProjectBridgeProfile,
  normalizeProjectBridgeProfile,
  PROJECT_BRIDGE_PROFILE_VERSION,
} from "../src/utils/projectBridgeProfile.js";

const empty = normalizeProjectBridgeProfile();

assert.equal(empty.profile_version, PROJECT_BRIDGE_PROFILE_VERSION);
assert.equal(empty.provided_field_count, 0);
assert.equal(empty.matching_mode, "hydraulic_signature_only");
assert.deepEqual(empty.selection_boundary.outcome_fields_used, []);
assert.equal(empty.selection_boundary.inventory_denominators_used, false);

const complete = normalizeProjectBridgeProfile({
  bridge_crossing_type: "Waterway",
  bridge_length_m: "84.567",
  destination_use: "national",
  material_type: "steel",
  piers_in_active_riverbed: "yes",
  structural_type: "truss",
});

assert.equal(complete.match_field_count, 4);
assert.equal(complete.descriptive_field_count, 2);
assert.equal(complete.provided_fields.bridge_length_m, 84.57);
assert.equal(complete.provided_fields.piers_in_active_riverbed, true);
assert.equal(complete.invalid_fields.length, 0);
assert.deepEqual(
  complete.selection_boundary.descriptive_fields_used_for_selection,
  []
);
assert.equal(
  complete.selection_boundary.modifies_failure_learning_qualification,
  false
);

const comparison = compareProjectBridgeProfile(complete, {
  bridge_crossing_type: "waterway",
  destination_use: "National",
  material_type: "Steel",
  structural_type: "Beam bridge",
});

assert.equal(comparison.compared_field_count, 4);
assert.equal(comparison.exact_match_count, 3);
assert.equal(comparison.exact_match_ratio, 0.75);
assert.equal(comparison.fields.structural_type.exact, false);
assert.equal(
  Object.hasOwn(comparison.fields, "bridge_length_m"),
  false
);

const partial = normalizeProjectBridgeProfile({
  material_type: "Masonry",
});

assert.equal(partial.match_field_count, 1);
assert.deepEqual(partial.match_fields_provided, ["material_type"]);

const invalid = normalizeProjectBridgeProfile({
  bridge_length_m: 0,
  material_type: "Unknown composite",
  piers_in_active_riverbed: "maybe",
});

assert.equal(invalid.provided_field_count, 0);
assert.equal(invalid.invalid_fields.length, 3);

console.log(JSON.stringify({
  complete_fields: complete.provided_field_count,
  exact_matches: comparison.exact_match_count,
  test: "passed",
  version: PROJECT_BRIDGE_PROFILE_VERSION,
}, null, 2));
