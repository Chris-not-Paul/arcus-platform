import assert from "node:assert/strict";
import fs from "node:fs";

import {
  buildCollapseIntelligenceReportModel,
} from "../src/utils/collapseIntelligenceReport.js";

const point = {
  derivedProvince: "Alessandria",
  derivedProvinceCode: "6",
  latitude: 44.9123,
  longitude: 8.6123,
  validated: true,
};

const exposure = {
  hydraulic: {
    highest_class: "P3",
    matched_classes: ["P1", "P2", "P3"],
    nearby_context: { status: "not_requested" },
    status: "available",
  },
  landslide: {
    highest_hazard_class: "P2",
    matched_attention_classes: [],
    matched_hazard_classes: ["P2"],
    nearby_context: { status: "not_requested" },
    status: "available",
  },
  seismic: {
    pga_p50_g: 0.1432,
    sampling_method: "nearest_grid_node",
    source: { provider: "INGV" },
    status: "available",
  },
};

const intelligence = {
  abstention_reasons: [],
  evidence_cohort: {
    analogue_retrieval: {
      analogues: [
        {
          current_official_signature: {
            hydraulic: { highest_class: "P3" },
          },
          event: {
            event_id: "B01.01.01",
            municipality: "Example",
            province: "Torino",
          },
          retrieval_comparison: {
            project_bridge_profile: {
              compared_field_count: 2,
              exact_match_count: 2,
            },
          },
          retrieval_rank: 1,
        },
      ],
      hydraulic_signature_coverage_ratio: 0.92,
    },
    effective_evidence_count: 4,
    episode_count: 3,
    episode_effective_evidence_count: 2.5,
    event_count: 5,
    selection_mode: "national_hazard_analogue",
  },
  failure_learning_matrix: {
    abstention_reasons: [],
    caveat:
      "Failure Learning Matrix converts fixed-cohort outcomes into auditable questions.",
    cohort_contract: {
      cohort_fixed_before_outcome_read: true,
      geometry_used_for_qualification: false,
    },
    matrix_version: "arcus-failure-learning-matrix-v1",
    qualified_priority_count: 1,
    row_count: 1,
    rows: [
      {
        affected_components: [
          {
            component: "pier_foundation",
            effective_evidence_count: 3,
            episode_count: 3,
            raw_count: 4,
          },
        ],
        evidence: {
          effective_evidence_count: 4,
          episode_count: 3,
          episode_effective_evidence_count: 3.5,
          raw_count: 5,
        },
        geometry_context: {
          bridge_length_m: { median: 72 },
          geometry_event_count: 3,
          piers_in_active_riverbed: {
            available_count: 2,
            true_count: 2,
          },
          role: "post_retrieval_descriptive_evidence_only",
        },
        investigation_priority: {
          en: "Hydraulic, scour and foundation-support assessment",
          it: "Valutazione idraulica, dello scalzamento e del supporto fondazionale",
        },
        investigation_question: {
          en: "Test whether foundation support is vulnerable to scour.",
          it: "Verificare la vulnerabilita del supporto fondazionale allo scalzamento.",
        },
        learning_statement: {
          en: "Scour recurs across independent episodes.",
          it: "Lo scalzamento ricorre in episodi indipendenti.",
        },
        learning_status: "qualified_investigation_priority",
        process: "scour",
        qualification: { qualified: true },
      },
    ],
    status: "available",
  },
  landslide_support: {
    abstention_reasons: ["insufficient_independent_episodes"],
    status: "abstained",
  },
  project_bridge_profile: {
    descriptive_fields_provided: ["bridge_length_m"],
    invalid_fields: [],
    match_fields_provided: ["material_type", "structural_type"],
    matching_mode:
      "hydraulic_signature_then_unweighted_project_profile_tie_breaker",
    profile_version: "arcus-project-bridge-profile-v1",
    provided_fields: {
      bridge_length_m: 84.5,
      material_type: "Steel",
      structural_type: "Truss",
    },
    selection_boundary: {
      modifies_evidence_thresholds: false,
    },
  },
  seismic_support: {
    abstention_reasons: ["single_independent_earthquake_episode"],
    status: "abstained",
  },
  status: "available",
  strategies: [
    {
      applicability_conditions: ["official_point_intersection"],
      arcus_evidence: {
        effective_evidence_count: 4,
        episode_count: 3,
        raw_count: 5,
      },
      external_validation_required: true,
      investigation_priority: {
        en: "Site-specific hydraulic investigation",
        it: "Indagine idraulica sito-specifica",
      },
      monitoring_consideration: {
        en: "Monitor hydraulic changes",
        it: "Monitorare le variazioni idrauliche",
      },
      process: "scour",
      purpose: {
        en: "Challenge foundation vulnerability",
        it: "Verificare la vulnerabilita delle fondazioni",
      },
      risk_control_theme: {
        en: "Scour and foundation response",
        it: "Scalzamento e risposta delle fondazioni",
      },
      strategy_id: "hydraulic-scour-investigation",
    },
  ],
};

const reportSummary = {
  cohortText: "National analogue cohort.",
  evidenceText: "Raw and effective evidence.",
  outcomeText: "One supported investigation priority.",
  registryQualityText: "Episode registry is reviewable.",
  retrievalRobustnessText: "Retrieval windows agree.",
  sourceText: "Official provider provenance.",
  warningText:
    "Non-prescriptive output: no collapse probability or automatic intervention priority.",
};

const eventSources = {
  "B01.01.01": [
    {
      event_id: "B01.01.01",
      source_role: "technical",
      title: "Technical source",
      url: "https://example.test/source",
    },
  ],
};

const model = buildCollapseIntelligenceReportModel({
  eventSources,
  exposure,
  generatedAt: "2026-08-25T12:00:00.000Z",
  intelligence,
  language: "en",
  point,
  reportSummary,
});

assert.equal(model.product, "ARCUS Collapse Intelligence - Lessons from Failures");
assert.equal(model.project.province, "Alessandria");
assert.equal(model.project.validated, true);
assert.equal(model.projectBridgeProfile.matchFields.length, 2);
assert.equal(model.projectBridgeProfile.descriptiveFields.length, 1);
assert.equal(model.projectBridgeProfile.thresholdsModified, false);
assert.equal(model.officialExposure[0].pointValue, "P1, P2, P3");
assert.equal(model.officialExposure[0].highestClass, "P3");
assert.equal(model.officialExposure[2].pointValue, "0.1432 g");
assert.equal(model.intelligence.rawEvidence, 5);
assert.equal(model.intelligence.effectiveEvidence, 4);
assert.equal(model.intelligence.independentEpisodes, 3);
assert.equal(model.intelligence.analogueCount, 1);
assert.equal(model.failureLearning.status, "available");
assert.equal(model.failureLearning.contractAvailable, true);
assert.equal(model.failureLearning.version, "arcus-failure-learning-matrix-v1");
assert.equal(model.failureLearning.rows.length, 1);
assert.equal(model.failureLearning.rows[0].qualified, true);
assert.equal(model.failureLearning.rows[0].geometry.medianLengthM, 72);
assert.equal(model.failureLearning.geometryUsedForQualification, false);
assert.equal(model.strategies.length, 1);
assert.equal(model.strategies[0].process, "scour");
assert.equal(model.strategies[0].externalValidationRequired, true);
assert.equal(model.analogues[0].eventId, "B01.01.01");
assert.equal(model.analogues[0].profileExactMatches, 2);
assert.equal(model.analogues[0].profileComparedFields, 2);
assert.equal(model.analogues[0].sourceCount, 1);
assert.equal(model.sources[0].title, "Technical source");
assert.equal(model.domainSupport[0].status, "abstained");
assert.equal(model.warnings.length, 3);

const abstainedModel = buildCollapseIntelligenceReportModel({
  exposure,
  intelligence: {
    ...intelligence,
    abstention_reasons: ["insufficient_effective_hydraulic_evidence"],
    failure_learning_matrix: {
      abstention_reasons: ["official_hydraulic_exposure_not_intersected"],
      caveat: "No project lesson is generated without usable support.",
      cohort_contract: {
        cohort_fixed_before_outcome_read: true,
        geometry_used_for_qualification: false,
      },
      matrix_version: "arcus-failure-learning-matrix-v1",
      qualified_priority_count: 0,
      row_count: 0,
      rows: [],
      status: "abstained",
    },
    status: "abstained",
    strategies: [],
  },
  point: {
    derivedProvince: "Torino",
    latitude: null,
    longitude: null,
    validated: false,
  },
  reportSummary,
});

assert.equal(abstainedModel.intelligence.status, "abstained");
assert.equal(abstainedModel.strategies.length, 0);
assert.equal(abstainedModel.failureLearning.status, "abstained");
assert.equal(abstainedModel.failureLearning.contractAvailable, true);
assert.equal(abstainedModel.failureLearning.rows.length, 0);
assert.deepEqual(abstainedModel.intelligence.abstentionReasons, [
  "insufficient effective hydraulic evidence",
]);
assert.equal(abstainedModel.project.coordinates, "not available");

const staleContractModel = buildCollapseIntelligenceReportModel({
  exposure,
  intelligence: {
    ...intelligence,
    failure_learning_matrix: undefined,
  },
  point,
  reportSummary,
});

assert.equal(staleContractModel.failureLearning.contractAvailable, false);
assert.equal(staleContractModel.failureLearning.status, "contract unavailable");
assert.match(staleContractModel.failureLearning.caveat, /No engineering interpretation/);

const serialized = JSON.stringify(model);
for (const retiredOutput of [
  /Final Priority Index/i,
  /Infrastructure Priority Index/i,
  /L[0-4]\/4/i,
  /normalized mitigation score/i,
  /safe classification/i,
  /unsafe classification/i,
]) {
  assert.doesNotMatch(serialized, retiredOutput);
}

const utilitySource = fs.readFileSync(
  "src/utils/collapseIntelligenceReport.js",
  "utf8"
);
assert.match(utilitySource, /ABSTAINED - ZERO STRATEGIES/);
assert.match(utilitySource, /Official point exposure/);
assert.match(utilitySource, /Current hydraulic class/);
assert.match(utilitySource, /Non-prescriptive evidence package/i);
assert.match(utilitySource, /Failure Learning Matrix v1/i);
assert.match(utilitySource, /Geometry used for qualification/i);
assert.match(utilitySource, /Project Bridge Profile v1/i);
assert.match(utilitySource, /profile matches/i);

console.log(JSON.stringify({
  analogues: model.analogues.length,
  ok: true,
  sources: model.sources.length,
  strategies: model.strategies.length,
}, null, 2));
