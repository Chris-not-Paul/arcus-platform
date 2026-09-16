import assert from "node:assert/strict";

import {
  buildFailureLearningBenchmark,
  FAILURE_LEARNING_BENCHMARK_VERSION,
  validateFailureLearningBenchmarkResponse,
} from "./lib/failure-learning-benchmark.js";

const strata = [
  ...Array(8).fill("P1"),
  ...Array(10).fill("P2"),
  ...Array(10).fill("P3"),
  ...Array(12).fill("no_intersection"),
];
const events = strata.map((stratum, index) => ({
  bridge_crossing_type: "waterway",
  collapse_severity: index % 2 ? "Partial" : "Total",
  destination_use: index % 3 ? "National" : "Provincial/Regional",
  event_id: `IT01.01.${String(index + 1).padStart(2, "0")}`,
  hydraulic_intelligence: {
    component_involved: index % 2 ? "pier_foundation" : "abutment",
    evidence_level: index % 4 ? "documented" : "probable",
    failure_process: index % 2 ? "scour" : "bank_erosion_or_embankment_failure",
    trigger: "flood",
  },
  latitude: 36.5 + index * 0.2,
  longitude: 8.2 + index * 0.15,
  material_type: index % 2 ? "Reinforced concrete" : "Masonry",
  province: `Province ${index + 1}`,
  region: `Region ${(index % 10) + 1}`,
  structural_type: index % 2 ? "Beam bridge" : "Arch bridge",
}));
const signatures = events.map((event, index) => {
  const stratum = strata[index];
  return {
    event_id: event.event_id,
    hydraulic: stratum === "no_intersection"
      ? { highest_class: null, matched_classes: [], status: "no_intersection" }
      : { highest_class: stratum, matched_classes: [stratum], status: "available" },
    landslide: {
      attention_area: false,
      highest_hazard_class: null,
      matched_hazard_classes: [],
      status: "no_intersection",
    },
    seismic: {
      pga_p50_g: 0.08 + (index % 5) * 0.03,
      status: "available",
    },
  };
});
const sources = events.map((event, index) => ({
  event_id: event.event_id,
  source_id: `SRC-${index + 1}`,
  source_role: index % 2 ? "Scientific" : "Official/Technical",
}));

const benchmark = buildFailureLearningBenchmark({
  datasetChecksums: { fixture: "fixture-checksum-v1" },
  events,
  generatedAt: "2026-09-15T12:00:00.000Z",
  signatures,
  sources,
});

assert.equal(benchmark.manifest.version, FAILURE_LEARNING_BENCHMARK_VERSION);
assert.equal(benchmark.manifest.status, "frozen_ready_for_independent_expert_pilot");
assert.equal(Object.values(benchmark.manifest.quality_checks).every(Boolean), true);
assert.equal(benchmark.reviewerMasterPackage.cases.length, 40);
assert.deepEqual(benchmark.manifest.sampling.selected_by_stratum, {
  P1: 8,
  P2: 10,
  P3: 10,
  no_intersection: 12,
});
assert.equal(benchmark.manifest.expected_collection.unique_analogue_pairs, 224);
assert.equal(benchmark.manifest.expected_collection.repeated_pair_judgements, 128);
assert.equal(benchmark.manifest.expected_collection.assigned_analogue_judgements, 352);
assert.equal(benchmark.manifest.expected_collection.assigned_target_reviews, 58);
assert.equal(Object.keys(benchmark.reviewerPackages).length, 5);
assert.equal(benchmark.assignments.overlap.analogue_relevance_case_ids.length, 8);
assert.equal(benchmark.assignments.overlap.abstention_control_case_ids.length, 2);
const workloads = Object.values(benchmark.assignments.workload).map(
  (item) => item.workload_units
);
assert.ok(Math.max(...workloads) - Math.min(...workloads) <= 4);

benchmark.reviewerMasterPackage.cases.forEach((item) => {
  if (item.review_type === "abstention_control") {
    assert.equal(item.analogues.length, 0);
    assert.equal(item.expected_engine_behaviour, "explicit_abstention_with_zero_analogues");
  } else {
    assert.equal(item.analogues.length, 8);
    assert.ok(item.analogues.every(
      (analogue) => analogue.documentary_support.source_count === 1
    ));
  }
});

const reviewerPayload = JSON.stringify(benchmark.reviewerMasterPackage);
assert.doesNotMatch(reviewerPayload, /IT01\.01\./);
assert.doesNotMatch(reviewerPayload, /target_event_id|known_target_outcome|target_location/);

const slot = "reviewer-01";
const template = structuredClone(benchmark.responseTemplates[slot]);
assert.equal(template.benchmark_freeze_id, benchmark.manifest.benchmark_freeze_id);
assert.equal(
  validateFailureLearningBenchmarkResponse(
    template,
    benchmark.reviewerPackages[slot]
  ).valid,
  false
);
template.reviewer.reviewer_id = "expert-fixture-01";
template.reviewer.discipline = "hydraulic_engineering";
template.reviewer.experience_years = 15;
template.declaration.completed_independently_before_panel = true;
template.declaration.consent_for_pseudonymised_calibration_use = true;
template.declaration.conflict_of_interest = "none";
template.declaration.signed_at = "2026-09-16T10:00:00.000Z";
template.declaration.signature = "expert-fixture-01-locked";
template.cases.forEach((item) => {
  if (item.review_type === "analogue_relevance") {
    item.response.analogue_judgements.forEach((judgement) => {
      judgement.rating = "useful";
      judgement.reason_codes = ["hazard_comparable"];
      judgement.technical_note = "";
    });
  } else {
    item.response.abstention_assessment.abstention_appropriate = true;
    item.response.abstention_assessment.context_wording_clear = true;
    item.response.abstention_assessment.zero_hazard_or_safety_inference_present = false;
    item.response.abstention_assessment.missing_critical_information = "none";
    item.response.abstention_assessment.rationale =
      "The abstention is explicit and does not imply zero hydraulic hazard or safety.";
  }
});
assert.equal(
  validateFailureLearningBenchmarkResponse(
    template,
    benchmark.reviewerPackages[slot]
  ).valid,
  true
);

const rebuilt = buildFailureLearningBenchmark({
  datasetChecksums: { fixture: "fixture-checksum-v1" },
  events,
  generatedAt: "2026-09-16T12:00:00.000Z",
  signatures,
  sources,
});
assert.equal(
  rebuilt.manifest.benchmark_freeze_id,
  benchmark.manifest.benchmark_freeze_id
);

console.log(JSON.stringify({
  assigned_analogue_judgements:
    benchmark.manifest.expected_collection.assigned_analogue_judgements,
  benchmark_freeze_id: benchmark.manifest.benchmark_freeze_id,
  cases: benchmark.reviewerMasterPackage.cases.length,
  status: benchmark.manifest.status,
  test: "passed",
}, null, 2));
