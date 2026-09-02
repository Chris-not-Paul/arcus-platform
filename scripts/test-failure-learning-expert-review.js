import assert from "node:assert/strict";

import {
  assessFailureLearningExpertReview,
  buildFailureLearningExpertReview,
  buildFailureLearningResponseTemplate,
  validateFailureLearningResponse,
} from "./lib/failure-learning-expert-review.js";

function event(eventId, province, process, component) {
  return {
    bridge_crossing_type: "waterway",
    destination_use: "National",
    event_id: eventId,
    hydraulic_intelligence: {
      component_involved: component,
      evidence_level: "documented",
      failure_process: process,
    },
    latitude: 40 + Number(eventId.slice(-1)) * 0.1,
    longitude: 10 + Number(eventId.slice(-1)) * 0.1,
    material_type: "Reinforced concrete",
    province,
    source_confidence: "High",
    specific_cause: "Hydraulic",
    structural_type: "Beam bridge",
  };
}

function signature(eventId, highestClass) {
  return {
    event_id: eventId,
    hydraulic: highestClass
      ? {
          highest_class: highestClass,
          matched_classes: [highestClass],
          status: "available",
        }
      : {
          highest_class: null,
          matched_classes: [],
          status: "no_intersection",
        },
    landslide: {
      attention_area: false,
      highest_hazard_class: null,
      matched_hazard_classes: [],
      status: "no_intersection",
    },
    seismic: {
      pga_p50_g: 0.15,
      status: "available",
    },
  };
}

const events = [
  event("T1", "Alpha", "scour", "pier_foundation"),
  event("T2", "Beta", "scour", "abutment"),
  event("T3", "Gamma", "overtopping_or_hydrodynamic_action", "deck_or_superstructure"),
  event("T4", "Delta", "bank_erosion_or_embankment_failure", "approach_embankment"),
];
const signatures = [
  signature("T1", "P1"),
  signature("T2", "P2"),
  signature("T3", "P3"),
  signature("T4", null),
];

function output(analogueId, mode, pattern) {
  return {
    analogue_cases: [
      {
        documented_outcomes: {
          collapse_extent: "TC",
          components_involved: ["pier"],
          evidence_confidence: "documented",
          failure_pattern: pattern,
        },
        event_id: analogueId,
        evidence_quality: "High",
      },
    ],
    cohort_size: 1,
    components_involved: [{ component: "pier", count: 1 }],
    documented_failure_patterns: [
      {
        count: 1,
        effective_count: 1,
        evidence_strength: "single_or_sparse",
        pattern,
      },
    ],
    effective_evidence_count: 1,
    retrieval_mode: mode,
    track: "hydraulic",
  };
}

const rawPackage = {
  cases: ["T1", "T2", "T3"].map((eventId, index) => ({
    event_id: eventId,
    outputs: {
      A: output(
        index === 0 ? "T2" : "T1",
        "hazard_gated_explainable_retrieval",
        "hydraulic_scour_or_foundation_loss"
      ),
      B: output(
        index === 2 ? "T2" : "T3",
        "hazard_gated_random_hydraulic_baseline",
        "hydraulic_overtopping_or_hydrodynamic_action"
      ),
    },
  })),
  review_track: "hydraulic",
};
const knowledgeBase = {
  entries: [
    {
      failure_pattern: "hydraulic_scour_or_foundation_loss",
      investigation_priorities: [
        {
          action_id: "scour_assessment",
          external_validation_required: true,
          label: "Scour assessment",
          purpose: "Challenge foundation-support vulnerability.",
        },
      ],
    },
  ],
};
const built = buildFailureLearningExpertReview({
  events,
  generatedAt: "2026-08-26T12:00:00.000Z",
  knowledgeBase,
  rawPackage,
  signatures,
  sources: [],
});

assert.equal(built.audit.passed, true);
assert.equal(built.audit.output_schema_symmetric, true);
assert.deepEqual(built.audit.forbidden_terms_found, []);
assert.equal(
  Math.abs(
    built.audit.candidate_position_balance.A -
      built.audit.candidate_position_balance.B
  ) <= 1,
  true
);
assert.equal(
  built.reviewerPackage.arms.retrieval_preference.cases.length,
  3
);
assert.equal(
  built.reviewerPackage.arms.matrix_appropriateness.cases.length,
  4
);
assert.equal(built.key.matrix_cases[0].known_outcome.failure_process, "scour");

const serializedReviewerPackage = JSON.stringify(built.reviewerPackage);
for (const forbidden of [
  /event_id/i,
  /retrieval_mode/i,
  /project_informed/i,
  /random_baseline/i,
  /target_event/i,
]) {
  assert.doesNotMatch(serializedReviewerPackage, forbidden);
}

const template = buildFailureLearningResponseTemplate(built.reviewerPackage);
assert.equal(
  validateFailureLearningResponse(template, built.reviewerPackage).valid,
  false
);

template.reviewer = {
  discipline: "hydraulic_engineering",
  experience_years: 12,
  reviewer_id: "reviewer-01",
};
template.declaration = {
  completed_independently_before_panel: true,
  conflict_of_interest: "none",
  model_generated: false,
  signature: "reviewer-01-locked",
};
template.arms.retrieval_preference.forEach((item) => {
  item.response.confidence_1_to_5 = 4;
  item.response.preference = "A";
  item.response.rationale =
    "The analogue set is technically coherent and the stated limitations are adequate.";
  item.response.misleading_content.A = false;
  item.response.misleading_content.B = false;
  Object.values(item.response.scores_1_to_5).forEach((score) => {
    score.A = 4;
    score.B = 3;
  });
});
template.arms.matrix_appropriateness.forEach((item) => {
  item.response.abstention_appropriate = true;
  item.response.evidence_interpretation_safe = true;
  item.response.investigation_priorities_engineering_relevant = true;
  item.response.overall_usefulness_score_1_to_5 = 4;
  item.response.rationale =
    "The output is appropriately bounded and supports a defensible investigation question.";
});

assert.equal(
  validateFailureLearningResponse(template, built.reviewerPackage).valid,
  true
);

const responses = [
  structuredClone(template),
  structuredClone(template),
  structuredClone(template),
];
responses.forEach((response, reviewerIndex) => {
  response.reviewer.reviewer_id = `reviewer-0${reviewerIndex + 1}`;
  response.reviewer.discipline = reviewerIndex === 1
    ? "bridge_engineering"
    : "hydraulic_engineering";
  response.declaration.signature = `reviewer-0${reviewerIndex + 1}-locked`;
  response.arms.retrieval_preference.forEach((item) => {
    const mapping = built.key.retrieval_cases.find(
      (keyItem) => keyItem.case_id === item.case_id
    ).output_mapping;
    const candidateLabel = Object.entries(mapping).find(
      ([, value]) => value === "candidate_system"
    )[0];
    const baselineLabel = candidateLabel === "A" ? "B" : "A";

    item.response.preference = candidateLabel;
    Object.values(item.response.scores_1_to_5).forEach((score) => {
      score[candidateLabel] = 4;
      score[baselineLabel] = 3;
    });
  });
});

const assessment = assessFailureLearningExpertReview({
  key: built.key,
  responses,
  reviewerPackage: built.reviewerPackage,
});

assert.equal(
  assessment.decision,
  "candidate_for_human_methodology_governance_review"
);
assert.equal(assessment.production_approval, false);
assert.equal(assessment.thresholds_changed, false);

console.log(JSON.stringify({
  audit: built.audit,
  matrix_cases: built.reviewerPackage.arms.matrix_appropriateness.cases.length,
  retrieval_cases: built.reviewerPackage.arms.retrieval_preference.cases.length,
  test: "passed",
}, null, 2));
