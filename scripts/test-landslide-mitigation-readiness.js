import assert from "node:assert/strict";

import {
  LANDSLIDE_CORE_FIELDS,
  auditLandslideMitigationReadiness,
  isLandslideOutcomeCandidate,
  loadAndAuditLandslideMitigationReadiness,
} from "./audit-landslide-mitigation-readiness.js";

const checks = [];

function check(name, fn) {
  fn();
  checks.push(name);
}

check("candidate-selection-is-explicit", () => {
  assert.equal(isLandslideOutcomeCandidate({ specific_cause: "Landslide" }), true);
  assert.equal(
    isLandslideOutcomeCandidate({
      failure_trigger: "Rainfall-induced landslide",
      specific_cause: "Hydraulic",
    }),
    true
  );
  assert.equal(
    isLandslideOutcomeCandidate({ description: "road near a landslide" }),
    false
  );
});

check("complete-fixture-reaches-expert-validation-gate", () => {
  const intelligence = Object.fromEntries(
    LANDSLIDE_CORE_FIELDS.map((field) => [field, "documented"])
  );
  const result = auditLandslideMitigationReadiness({
    events: [
      {
        date: "2020-01-01",
        event_id: "TEST-1",
        landslide_intelligence: intelligence,
        province: "Test",
        specific_cause: "Landslide",
      },
    ],
    historicalSignatures: [
      {
        event_id: "TEST-1",
        historical_at_event: { status: "available_documented" },
      },
    ],
    knowledgeBase: {
      entries: [
        {
          external_engineering_basis: ["reviewed-manual"],
          external_validation_required: false,
          hazard_family: "landslide",
          status: "validated",
        },
      ],
    },
    signatures: [
      {
        event_id: "TEST-1",
        landslide: {
          attention_area: false,
          highest_hazard_class: "P3",
          matched_hazard_classes: ["P3"],
          status: "available",
        },
      },
    ],
    sources: [
      { event_id: "TEST-1", source_role: "Official/Technical" },
    ],
  });

  assert.equal(result.decision, "ready_for_expert_validation");
  assert.equal(result.coverage.core_taxonomy_complete, 1);
});

check("production-dataset-abstains", () => {
  const result = loadAndAuditLandslideMitigationReadiness();

  assert.equal(result.schema_version, "arcus-landslide-mitigation-readiness-v1");
  assert.equal(result.coverage.candidate_cases, 7);
  assert.equal(result.coverage.primary_landslide_cause_cases, 6);
  assert.equal(result.coverage.trigger_mediated_cases, 1);
  assert.equal(result.coverage.current_pai_complete, 7);
  assert.equal(result.coverage.current_pai_intersections, 2);
  assert.equal(result.coverage.historical_pai_at_event, 0);
  assert.equal(result.coverage.core_taxonomy_complete, 0);
  assert.equal(result.coverage.official_or_technical_source_cases, 3);
  assert.deepEqual(result.current_pai_class_distribution, {
    no_intersection: 5,
    P2: 1,
    P4: 1,
  });
  assert.equal(
    result.decision,
    "not_ready_for_collapse_learned_strategies"
  );
  assert.equal(
    result.gate.blocked_now.some((item) => item.includes("no_intersection")),
    true
  );
});

console.log(JSON.stringify({ checks, ok: true }, null, 2));
