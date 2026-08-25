import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import {
  LANDSLIDE_CORE_FIELDS,
  auditLandslideMitigationReadiness,
  isLandslideOutcomeCandidate,
  loadAndAuditLandslideMitigationReadiness,
} from "./audit-landslide-mitigation-readiness.js";
import {
  buildLandslideRegistryIndex,
  landslideIntelligenceForEvent,
  summarizeLandslideRegistry,
  validateLandslideOutcomeRegistry,
} from "../src/utils/landslideIntelligence.js";
import {
  buildLandslideMitigationSupport,
} from "../src/utils/landslideMitigationSupport.js";
import {
  getOpenEvents,
  getProfessionalResource,
} from "../server/dataService.js";

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
    registry: {
      cases: [
        {
          curation_status: "curated_source_backed",
          episode_id: "TEST-EPISODE-1",
          event_id: "TEST-1",
          evidence_references: [{ role: "Official/Technical", url: "https://example.test" }],
          landslide_intelligence: intelligence,
          learning_eligibility: "eligible",
          outcome_status: "confirmed_landslide_collapse",
        },
      ],
      production_support_contract: { status: "expert_validated" },
      taxonomy_version: "landslide-v1",
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

check("registry-rejects-incomplete-eligible-case", () => {
  const validation = validateLandslideOutcomeRegistry({
    cases: [
      {
        event_id: "TEST-INCOMPLETE",
        evidence_references: [{ url: "https://example.test" }],
        landslide_intelligence: { movement_type: "rockfall" },
        learning_eligibility: "eligible",
        outcome_status: "confirmed_landslide_collapse",
      },
    ],
    taxonomy_version: "landslide-v1",
  });

  assert.equal(validation.ok, false);
  assert.equal(
    validation.errors.some((error) => error.code === "eligible_without_episode"),
    true
  );
  assert.equal(
    validation.errors.some((error) => error.code === "eligible_with_missing_core_fields"),
    true
  );
});

check("registry-rejects-episode-on-insufficient-evidence-case", () => {
  const validation = validateLandslideOutcomeRegistry({
    cases: [
      {
        curation_status: "excluded_insufficient_bridge_outcome",
        episode_id: "MUST-NOT-COUNT",
        event_id: "TEST-EXCLUDED",
        evidence_references: [{ url: "https://example.test" }],
        landslide_intelligence: {},
        learning_eligibility: "excluded_unverified_bridge_collapse",
        outcome_status: "unverified_specific_bridge_collapse",
      },
    ],
    taxonomy_version: "landslide-v1",
  });

  assert.equal(validation.ok, false);
  assert.equal(
    validation.errors.some((error) => error.code === "insufficient_evidence_case_has_episode"),
    true
  );
});

check("production-dataset-abstains", () => {
  const result = loadAndAuditLandslideMitigationReadiness();

  assert.equal(result.schema_version, "arcus-landslide-mitigation-readiness-v3");
  assert.equal(result.coverage.candidate_cases, 7);
  assert.equal(result.coverage.primary_landslide_cause_cases, 6);
  assert.equal(result.coverage.trigger_mediated_cases, 1);
  assert.equal(result.coverage.current_pai_complete, 7);
  assert.equal(result.coverage.current_pai_intersections, 2);
  assert.equal(result.coverage.historical_pai_at_event, 0);
  assert.equal(result.coverage.core_taxonomy_complete, 4);
  assert.equal(result.coverage.eligible_cases, 3);
  assert.equal(result.coverage.eligible_independent_episodes, 3);
  assert.equal(result.coverage.excluded_insufficient_evidence_cases, 2);
  assert.equal(result.coverage.disputed_cases, 0);
  assert.equal(result.coverage.multicausal_cases, 1);
  assert.equal(result.coverage.needs_review_cases, 0);
  assert.equal(result.coverage.reclassified_cross_hazard_cases, 1);
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
  assert.equal(result.registry_validation.ok, true);
  assert.equal(result.registry_summary.eligible_effective_evidence, 2.5);
  assert.equal(result.registry_summary.excluded_insufficient_evidence_cases, 2);
  assert.equal(
    result.gate.blockers.some((item) => item.includes("candidate registry")),
    false
  );
  assert.equal(
    result.candidate_cases.find((item) => item.event_id === "B20.04.02")
      .learning_eligibility,
    "excluded_multicausal"
  );
  assert.equal(
    result.candidate_cases.find((item) => item.event_id === "B13.02.01")
      .learning_eligibility,
    "excluded_reclassified_hydraulic"
  );
  assert.equal(
    result.candidate_cases.find((item) => item.event_id === "B15.04.01")
      .learning_eligibility,
    "eligible"
  );
  assert.equal(
    result.candidate_cases.find((item) => item.event_id === "B16.11.04")
      .learning_eligibility,
    "excluded_unverified_bridge_collapse"
  );
  assert.equal(
    result.candidate_cases.find((item) => item.event_id === "B24.05.01")
      .learning_eligibility,
    "excluded_unverified_landslide_interaction"
  );
});

check("professional-overlay-preserves-original-cause", () => {
  const registry = JSON.parse(
    requireRegistryText()
  );
  const index = buildLandslideRegistryIndex(registry);
  const original = { event_id: "B20.04.02", specific_cause: "Landslide" };
  const intelligence = landslideIntelligenceForEvent(original, index);

  assert.equal(original.specific_cause, "Landslide");
  assert.equal(
    intelligence.outcome_status,
    "confirmed_multicausal_landslide_structural_collapse"
  );
  assert.equal(intelligence.learning_eligibility, "excluded_multicausal");
  assert.equal(intelligence.evidence_level, "documented_summary_primary_pending");
  assert.equal(summarizeLandslideRegistry(registry).eligible_episodes, 3);
  assert.equal(summarizeLandslideRegistry(registry).multicausal_cases, 1);
  assert.equal(summarizeLandslideRegistry(registry).reclassified_cross_hazard_cases, 1);
});

check("verdura-cross-hazard-correction-remains-auditable", () => {
  const registry = JSON.parse(requireRegistryText());
  const index = buildLandslideRegistryIndex(registry);
  const intelligence = landslideIntelligenceForEvent(
    { event_id: "B13.02.01", specific_cause: "Hydraulic" },
    index
  );

  assert.equal(intelligence.outcome_status, "reclassified_hydraulic_scour");
  assert.equal(intelligence.learning_eligibility, "excluded_reclassified_hydraulic");
  assert.equal(intelligence.cross_hazard_reclassification.failure_process, "scour");
  assert.equal(
    intelligence.cross_hazard_reclassification.primary_document_status,
    "unavailable"
  );
});

const professionalResource = await getProfessionalResource("professional-events");
const professionalLandslideCases = professionalResource.events.filter(
  (event) => event.landslide_intelligence
);
assert.equal(professionalLandslideCases.length, 7);
assert.equal(
  professionalLandslideCases.filter(
    (event) => event.landslide_intelligence.learning_eligibility === "eligible"
  ).length,
  3
);
assert.equal(
  professionalLandslideCases.find((event) => event.event_id === "B20.04.02")
    .specific_cause,
  "Landslide"
);
checks.push("professional-resource-carries-seven-auditable-overlays");

const productionRegistry = JSON.parse(requireRegistryText());
const activeLandslideSupport = buildLandslideMitigationSupport({
  contract: productionRegistry.production_support_contract,
  events: professionalResource.events,
  exposure: {
    highest_hazard_class: "P4",
    matched_hazard_classes: ["P4"],
    status: "available",
  },
});
assert.equal(activeLandslideSupport.status, "abstained");
assert.equal(activeLandslideSupport.evidence.eligible_cases, 3);
assert.equal(activeLandslideSupport.evidence.independent_episodes, 3);
assert.equal(activeLandslideSupport.evidence.episode_effective_evidence, 2.5);
assert.equal(activeLandslideSupport.strategies.length, 0);
assert.equal(
  activeLandslideSupport.abstention_reasons.includes(
    "insufficient_independent_landslide_episode_evidence"
  ),
  true
);
assert.equal(
  activeLandslideSupport.abstention_reasons.includes(
    "landslide_support_contract_not_expert_validated"
  ),
  true
);
checks.push("active-pai-landslide-track-abstains-on-small-cohort");

const noIntersectionLandslideSupport = buildLandslideMitigationSupport({
  contract: productionRegistry.production_support_contract,
  events: professionalResource.events,
  exposure: { matched_hazard_classes: [], status: "no_intersection" },
});
assert.equal(
  noIntersectionLandslideSupport.abstention_reasons.includes(
    "official_landslide_point_not_intersected"
  ),
  true
);
assert.equal(noIntersectionLandslideSupport.strategies.length, 0);
checks.push("no-intersection-landslide-track-abstains-with-zero-strategies");

const openEvents = await getOpenEvents();
assert.equal(openEvents.some((event) => event.landslide_intelligence), false);
checks.push("open-release-does-not-publish-in-progress-landslide-curation");

function requireRegistryText() {
  return readFileSync(
    new URL("../config/collapse-intelligence/landslide-outcome-registry.json", import.meta.url),
    "utf8"
  );
}

console.log(JSON.stringify({ checks, ok: true }, null, 2));
