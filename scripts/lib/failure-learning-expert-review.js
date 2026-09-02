import crypto from "node:crypto";

import {
  buildMitigationIntelligence,
} from "../../server/mitigationIntelligenceService.js";

export const FAILURE_LEARNING_EXPERT_REVIEW_VERSION =
  "arcus-failure-learning-expert-review-v1";

const SCORE_DIMENSIONS = Object.freeze([
  "analogue_relevance",
  "engineering_coherence",
  "failure_learning_usefulness",
  "investigation_priority_usefulness",
  "traceability_and_comprehensibility",
]);

const DECISION_GATES = Object.freeze({
  candidate_preference_share_non_tie_minimum: 0.6,
  matrix_abstention_appropriateness_minimum: 0.8,
  matrix_evidence_interpretation_safe_minimum: 0.9,
  matrix_investigation_relevance_minimum: 0.8,
  matrix_median_usefulness_minimum: 3.5,
  misleading_rate_margin_maximum: 0.05,
  paired_relevance_improvement_minimum: 0.25,
  paired_usefulness_improvement_minimum: 0.25,
});

function stableNumber(value) {
  return Number.parseInt(
    crypto.createHash("sha256").update(String(value)).digest("hex").slice(0, 12),
    16
  );
}

function selectEvenly(items, limit) {
  const ordered = [...items].sort((left, right) =>
    stableNumber(left.event_id) - stableNumber(right.event_id) ||
      left.event_id.localeCompare(right.event_id)
  );

  if (ordered.length <= limit) {
    return ordered;
  }

  return Array.from({ length: limit }, (_, index) =>
    ordered[Math.round((index * (ordered.length - 1)) / (limit - 1))]
  );
}

function safeTargetContext(event, signature) {
  const hydraulic = signature?.hydraulic || {};

  return {
    bridge_profile: {
      construction_year: event.construction_year_numeric || null,
      crossing_type: event.bridge_crossing_type || null,
      destination_use: event.destination_use || null,
      material: event.material_type || null,
      structural_typology: event.structural_type || null,
    },
    current_official_hydraulic_context: {
      highest_class: hydraulic.highest_class || null,
      matched_classes: hydraulic.matched_classes || [],
      status: hydraulic.status || "unavailable",
    },
    geometry_context: event.hydraulic_geometry
      ? {
          bridge_length_m:
            Number(event.hydraulic_geometry.bridge_length_m) || null,
          piers_in_active_riverbed:
            typeof event.hydraulic_geometry.piers_in_active_riverbed ===
            "boolean"
              ? event.hydraulic_geometry.piers_in_active_riverbed
              : null,
          role: "reviewer_context_only_not_used_to_select_or_qualify",
        }
      : null,
    interpretation_boundary:
      "The official hazard signature is current context, not a reconstruction at the historical event date. Target collapse outcomes are withheld from the reviewer.",
  };
}

function candidateProfile(event, signature) {
  return {
    bridge_profile: {
      crossing_type: event?.bridge_crossing_type || null,
      destination_use: event?.destination_use || null,
      material: event?.material_type || null,
      structural_typology: event?.structural_type || null,
    },
    current_official_hydraulic_context: {
      highest_class: signature?.hydraulic?.highest_class || null,
      matched_classes: signature?.hydraulic?.matched_classes || [],
      status: signature?.hydraulic?.status || "unavailable",
    },
  };
}

function neutralComparison(target, candidate) {
  const pairs = [
    [
      "hydraulic_highest_class",
      target.current_official_hydraulic_context.highest_class,
      candidate.current_official_hydraulic_context.highest_class,
    ],
    [
      "crossing_type",
      target.bridge_profile.crossing_type,
      candidate.bridge_profile.crossing_type,
    ],
    [
      "destination_use",
      target.bridge_profile.destination_use,
      candidate.bridge_profile.destination_use,
    ],
    ["material", target.bridge_profile.material, candidate.bridge_profile.material],
    [
      "structural_typology",
      target.bridge_profile.structural_typology,
      candidate.bridge_profile.structural_typology,
    ],
  ];

  return pairs.map(([field, targetValue, candidateValue]) => ({
    candidate_value: candidateValue,
    field,
    relation:
      targetValue === null || candidateValue === null
        ? "missing"
        : String(targetValue) === String(candidateValue)
          ? "match"
          : "different",
    target_value: targetValue,
  }));
}

function investigationThemes(patterns, knowledgeByPattern) {
  const themes = new Map();

  patterns.forEach((pattern) => {
    const entry = knowledgeByPattern.get(pattern.pattern);

    (entry?.investigation_priorities || []).forEach((priority) => {
      themes.set(priority.action_id, {
        action_id: priority.action_id,
        external_validation_required:
          priority.external_validation_required !== false,
        label: priority.label,
        purpose: priority.purpose,
        role: "candidate_theme_for_expert_review_not_a_prescription",
      });
    });
  });

  return [...themes.values()].sort((left, right) =>
    left.action_id.localeCompare(right.action_id)
  );
}

function normalizeRetrievalOutput({
  caseId,
  eventById,
  knowledgeByPattern,
  label,
  output,
  signatureById,
  targetContext,
}) {
  const patterns = (output.documented_failure_patterns || []).map((pattern) => ({
    effective_evidence: pattern.effective_count || 0,
    evidence_strength: pattern.evidence_strength || "unavailable",
    pattern: pattern.pattern,
    raw_count: pattern.count || 0,
  }));

  return {
    analogue_cases: (output.analogue_cases || []).map((analogue, index) => {
      const event = eventById.get(analogue.event_id);
      const profile = candidateProfile(
        event,
        signatureById.get(analogue.event_id)
      );

      return {
        analogue_id: `${caseId}-${label}-${String(index + 1).padStart(2, "0")}`,
        documented_outcomes: {
          collapse_extent:
            analogue.documented_outcomes?.collapse_extent || "unavailable",
          components_involved:
            analogue.documented_outcomes?.components_involved || [],
          evidence_confidence:
            analogue.documented_outcomes?.evidence_confidence || "unavailable",
          failure_pattern:
            analogue.documented_outcomes?.failure_pattern || "unavailable",
        },
        evidence_quality: analogue.evidence_quality || "unavailable",
        neutral_feature_comparison: neutralComparison(targetContext, profile),
        profile,
      };
    }),
    cohort_summary: {
      cohort_size: output.cohort_size || 0,
      effective_evidence_count: output.effective_evidence_count || 0,
      observed_components: (output.components_involved || []).map((item) => ({
        component: item.component,
        raw_count: item.count,
      })),
      observed_failure_patterns: patterns,
    },
    investigation_themes: investigationThemes(patterns, knowledgeByPattern),
    limitations: [
      "Historical cohort shares are not project failure probabilities.",
      "Candidate investigation themes are non-prescriptive and require project-specific professional validation.",
    ],
  };
}

function matrixReviewerOutput(intelligence) {
  const matrix = intelligence.failure_learning_matrix || {};

  return {
    abstention_reasons: matrix.abstention_reasons || [],
    caveat: matrix.caveat || null,
    evidence_summary: matrix.evidence_summary || {
      effective_evidence_count: 0,
      episode_count: 0,
      episode_effective_evidence_count: 0,
      event_count: 0,
    },
    generic_investigation_priority:
      matrix.generic_investigation_priority || null,
    qualified_priority_count: matrix.qualified_priority_count || 0,
    rows: (matrix.rows || []).map((row) => ({
      affected_components: (row.affected_components || []).map((component) => ({
        component: component.component,
        effective_evidence_count: component.effective_evidence_count,
        episode_count: component.episode_count,
        raw_count: component.raw_count,
      })),
      evidence: {
        documented_count: row.evidence?.documented_count || 0,
        effective_evidence_count:
          row.evidence?.effective_evidence_count || 0,
        episode_count: row.evidence?.episode_count || 0,
        episode_effective_evidence_count:
          row.evidence?.episode_effective_evidence_count || 0,
        evidence_strength: row.evidence?.evidence_strength || "unavailable",
        probable_count: row.evidence?.probable_count || 0,
        raw_count: row.evidence?.raw_count || 0,
      },
      geometry_context: {
        bridge_length_m: row.geometry_context?.bridge_length_m || null,
        geometry_event_count:
          row.geometry_context?.geometry_event_count || 0,
        piers_in_active_riverbed:
          row.geometry_context?.piers_in_active_riverbed || null,
        role: row.geometry_context?.role || null,
      },
      investigation_priority: row.investigation_priority || null,
      investigation_question: row.investigation_question || null,
      learning_statement: row.learning_statement || null,
      learning_status: row.learning_status,
      process: row.process,
      qualification: {
        episode_effective_threshold_met:
          row.qualification?.episode_effective_threshold_met === true,
        independent_episode_threshold_met:
          row.qualification?.independent_episode_threshold_met === true,
        qualified: row.qualification?.qualified === true,
        retrieval_window_consensus:
          row.qualification?.retrieval_window_consensus || null,
      },
    })),
    status: matrix.status || "contract_unavailable",
    version: matrix.matrix_version || null,
  };
}

function officialExposure(signature) {
  const hydraulic = signature?.hydraulic || {};

  return {
    hydraulic: {
      assessment_complete: true,
      decision_status:
        hydraulic.status === "available"
          ? "available_complete"
          : hydraulic.status || "unavailable",
      highest_class: hydraulic.highest_class || null,
      matched_classes: hydraulic.matched_classes || [],
      source: {
        freshness_status: "frozen_validation_signature",
        observation_mode: "frozen_validation_signature",
        observed_at: hydraulic.queried_at || null,
      },
      status: hydraulic.status || "unavailable",
    },
    landslide: signature?.landslide || null,
    seismic: signature?.seismic || null,
  };
}

function knownOutcome(event) {
  return {
    component_involved:
      event.hydraulic_intelligence?.component_involved || null,
    evidence_level: event.hydraulic_intelligence?.evidence_level || null,
    failure_process: event.hydraulic_intelligence?.failure_process || null,
    historical_cause_family: event.specific_cause || null,
  };
}

function matrixCases({
  events,
  historicalSignatures,
  signatures,
  sources,
}) {
  const signatureById = new Map(
    signatures.map((signature) => [signature.event_id, signature])
  );
  const activeTargets = ["P1", "P2", "P3"].flatMap((hazardClass) =>
    selectEvenly(
      events.filter((event) => {
        const hydraulic = signatureById.get(event.event_id)?.hydraulic;

        return hydraulic?.status === "available" &&
          hydraulic.highest_class === hazardClass;
      }),
      6
    )
  );
  const controls = selectEvenly(
    events.filter(
      (event) =>
        signatureById.get(event.event_id)?.hydraulic?.status ===
        "no_intersection"
    ),
    6
  );
  const targets = [...activeTargets, ...controls];

  return targets.map((target, index) => {
    const signature = signatureById.get(target.event_id);
    const targetRemovedEvents = events.filter(
      (event) => event.event_id !== target.event_id
    );
    const targetRemovedSignatures = signatures.filter(
      (item) => item.event_id !== target.event_id
    );
    const intelligence = buildMitigationIntelligence({
      events: targetRemovedEvents,
      historicalSignatures: historicalSignatures.filter(
        (item) => item.event_id !== target.event_id
      ),
      payload: {
        official_exposure: officialExposure(signature),
        project_context: "bridge",
        project_location: {
          derived_province: target.province,
          latitude: target.latitude,
          longitude: target.longitude,
          validated: true,
        },
      },
      signatures: targetRemovedSignatures,
      sources,
    });
    const caseId = `FLM-M-${String(index + 1).padStart(3, "0")}`;

    return {
      key: {
        case_id: caseId,
        known_outcome: knownOutcome(target),
        target_event_id: target.event_id,
      },
      reviewer: {
        case_id: caseId,
        output: matrixReviewerOutput(intelligence),
        review_questions: {
          abstention_appropriate: null,
          evidence_interpretation_safe: null,
          investigation_priorities_engineering_relevant: null,
          missing_critical_information: null,
          overall_usefulness_score_1_to_5: null,
          rationale: null,
        },
        target_context: safeTargetContext(target, signature),
      },
    };
  });
}

function retrievalCases({
  events,
  knowledgeBase,
  rawPackage,
  signatures,
}) {
  const eventById = new Map(events.map((event) => [event.event_id, event]));
  const signatureById = new Map(
    signatures.map((signature) => [signature.event_id, signature])
  );
  const knowledgeByPattern = new Map(
    (knowledgeBase.entries || []).map((entry) => [entry.failure_pattern, entry])
  );
  const eligible = (rawPackage.cases || [])
    .filter((item) => {
      const signature = signatureById.get(item.event_id);

      return rawPackage.review_track === "hydraulic" &&
        signature?.hydraulic?.status === "available" &&
        signature.hydraulic.highest_class;
    })
    .sort((left, right) =>
      stableNumber(left.event_id) - stableNumber(right.event_id) ||
        left.event_id.localeCompare(right.event_id)
    );

  return eligible.map((item, index) => {
    const event = eventById.get(item.event_id);
    const targetContext = safeTargetContext(
      event,
      signatureById.get(item.event_id)
    );
    const rawArcusLabel = item.outputs.A.retrieval_mode?.includes("random")
      ? "B"
      : "A";
    const rawBaselineLabel = rawArcusLabel === "A" ? "B" : "A";
    const arcusReviewerLabel = index % 2 === 0 ? "A" : "B";
    const baselineReviewerLabel = arcusReviewerLabel === "A" ? "B" : "A";
    const caseId = `FLM-R-${String(index + 1).padStart(3, "0")}`;
    const normalizedArcus = normalizeRetrievalOutput({
      caseId,
      eventById,
      knowledgeByPattern,
      label: arcusReviewerLabel,
      output: item.outputs[rawArcusLabel],
      signatureById,
      targetContext,
    });
    const normalizedBaseline = normalizeRetrievalOutput({
      caseId,
      eventById,
      knowledgeByPattern,
      label: baselineReviewerLabel,
      output: item.outputs[rawBaselineLabel],
      signatureById,
      targetContext,
    });

    return {
      key: {
        case_id: caseId,
        output_mapping: {
          [arcusReviewerLabel]: "candidate_system",
          [baselineReviewerLabel]: "hydraulic_random_baseline",
        },
        target_event_id: item.event_id,
      },
      reviewer: {
        case_id: caseId,
        outputs: {
          [arcusReviewerLabel]: normalizedArcus,
          [baselineReviewerLabel]: normalizedBaseline,
        },
        review_questions: {
          confidence_1_to_5: null,
          misleading_content: {
            A: null,
            B: null,
            details: null,
          },
          missing_critical_information: null,
          preference: null,
          rationale: null,
          scores_1_to_5: Object.fromEntries(
            SCORE_DIMENSIONS.map((dimension) => [
              dimension,
              { A: null, B: null },
            ])
          ),
        },
        target_context: targetContext,
      },
    };
  });
}

function packageAudit(reviewerPackage, retrievalKeys) {
  const serialized = JSON.stringify(reviewerPackage);
  const forbiddenTerms = [
    "event_id",
    "retrieval_mode",
    "project_informed",
    "random_baseline",
    "target_event",
  ];
  const forbiddenTermsFound = forbiddenTerms.filter((term) =>
    serialized.toLowerCase().includes(term)
  );
  const positionCounts = retrievalKeys.reduce(
    (counts, item) => {
      const label = Object.entries(item.output_mapping).find(
        ([, value]) => value === "candidate_system"
      )?.[0];

      if (label) {
        counts[label] += 1;
      }

      return counts;
    },
    { A: 0, B: 0 }
  );
  const outputSchemaSymmetric =
    reviewerPackage.arms.retrieval_preference.cases.every((item) => {
      const topLevelA = Object.keys(item.outputs.A).sort();
      const topLevelB = Object.keys(item.outputs.B).sort();
      const cohortA = Object.keys(item.outputs.A.cohort_summary || {}).sort();
      const cohortB = Object.keys(item.outputs.B.cohort_summary || {}).sort();
      const analogueA = Object.keys(item.outputs.A.analogue_cases?.[0] || {}).sort();
      const analogueB = Object.keys(item.outputs.B.analogue_cases?.[0] || {}).sort();

      return JSON.stringify(topLevelA) === JSON.stringify(topLevelB) &&
        JSON.stringify(cohortA) === JSON.stringify(cohortB) &&
        JSON.stringify(analogueA) === JSON.stringify(analogueB);
    });

  return {
    candidate_position_balance: positionCounts,
    forbidden_terms_found: forbiddenTermsFound,
    output_position_balanced:
      Math.abs(positionCounts.A - positionCounts.B) <= 1,
    output_schema_symmetric: outputSchemaSymmetric,
    passed:
      forbiddenTermsFound.length === 0 &&
      Math.abs(positionCounts.A - positionCounts.B) <= 1 &&
      outputSchemaSymmetric,
  };
}

export function buildFailureLearningExpertReview({
  events,
  generatedAt = new Date().toISOString(),
  historicalSignatures = [],
  knowledgeBase,
  rawPackage,
  signatures,
  sources,
}) {
  const retrieval = retrievalCases({
    events,
    knowledgeBase,
    rawPackage,
    signatures,
  });
  const matrix = matrixCases({
    events,
    historicalSignatures,
    signatures,
    sources,
  });
  const reviewerPackage = {
    arms: {
      matrix_appropriateness: {
        cases: matrix.map((item) => item.reviewer),
        objective:
          "Assess whether the evidence interpretation, abstention and investigation questions are engineering-relevant and safely worded.",
      },
      retrieval_preference: {
        cases: retrieval.map((item) => item.reviewer),
        objective:
          "Compare two structurally identical hydraulic analogue outputs without knowing their origin.",
      },
    },
    generated_at: generatedAt,
    instructions: [
      "Complete every score independently before panel discussion.",
      "Do not attempt to identify the origin of output A or B.",
      "Judge investigation usefulness, not whether an intervention should be prescribed.",
      "Record misleading content and missing critical information explicitly.",
      "Automated or model-generated responses are not expert evidence.",
    ],
    reviewer_requirements: {
      independent_reviewers_minimum: 3,
      required_disciplines: ["hydraulic_engineering", "bridge_engineering"],
      reviewer_identity_and_conflict_declaration_required: true,
    },
    decision_gates: {
      ...DECISION_GATES,
      governance_status:
        "prespecified_provisional_gate_not_a_scientific_effect_size",
      passing_role:
        "candidate_for_human_methodology_governance_review_not_automatic_production_approval",
    },
    rubric: {
      score_1: "unusable or materially misleading",
      score_2: "weak; major engineering omissions",
      score_3: "conditionally useful with material qualifications",
      score_4: "useful and technically coherent with minor qualifications",
      score_5: "highly useful, clear and appropriately bounded",
    },
    simulated_expert_responses: false,
    status: "awaiting_independent_human_review",
    version: FAILURE_LEARNING_EXPERT_REVIEW_VERSION,
  };
  const key = {
    caveat: "CONFIDENTIAL - do not distribute to reviewers before lock.",
    generated_at: generatedAt,
    matrix_cases: matrix.map((item) => item.key),
    retrieval_cases: retrieval.map((item) => item.key),
    version: FAILURE_LEARNING_EXPERT_REVIEW_VERSION,
  };
  const audit = packageAudit(reviewerPackage, key.retrieval_cases);

  return {
    audit,
    key,
    reviewerPackage: {
      ...reviewerPackage,
      anti_unblinding_audit: audit,
    },
  };
}

export function buildFailureLearningResponseTemplate(reviewerPackage) {
  return {
    arms: {
      matrix_appropriateness: reviewerPackage.arms.matrix_appropriateness.cases.map(
        (item) => ({
          case_id: item.case_id,
          response: item.review_questions,
        })
      ),
      retrieval_preference: reviewerPackage.arms.retrieval_preference.cases.map(
        (item) => ({
          case_id: item.case_id,
          response: item.review_questions,
        })
      ),
    },
    declaration: {
      conflict_of_interest: null,
      completed_independently_before_panel: null,
      model_generated: false,
      signature: null,
    },
    reviewer: {
      discipline: null,
      experience_years: null,
      reviewer_id: null,
    },
    version: reviewerPackage.version,
  };
}

export function validateFailureLearningResponse(response, reviewerPackage) {
  const errors = [];
  const retrievalIds = new Set(
    reviewerPackage.arms.retrieval_preference.cases.map((item) => item.case_id)
  );
  const matrixIds = new Set(
    reviewerPackage.arms.matrix_appropriateness.cases.map((item) => item.case_id)
  );

  if (!response?.reviewer?.reviewer_id) {
    errors.push("reviewer_id_required");
  }
  if (!response?.reviewer?.discipline) {
    errors.push("reviewer_discipline_required");
  }
  if (response?.declaration?.model_generated !== false) {
    errors.push("model_generated_response_rejected");
  }
  if (response?.declaration?.completed_independently_before_panel !== true) {
    errors.push("independent_completion_declaration_required");
  }
  if (!response?.declaration?.signature) {
    errors.push("reviewer_signature_required");
  }

  const retrievalResponses = response?.arms?.retrieval_preference || [];
  const matrixResponses = response?.arms?.matrix_appropriateness || [];
  const receivedRetrievalIds = new Set(
    retrievalResponses.map((item) => item.case_id)
  );
  const receivedMatrixIds = new Set(matrixResponses.map((item) => item.case_id));

  if ([...retrievalIds].some((id) => !receivedRetrievalIds.has(id))) {
    errors.push("retrieval_case_responses_incomplete");
  }
  if ([...matrixIds].some((id) => !receivedMatrixIds.has(id))) {
    errors.push("matrix_case_responses_incomplete");
  }

  retrievalResponses.forEach((item) => {
    const value = item.response || {};

    if (!retrievalIds.has(item.case_id)) {
      errors.push(`unknown_retrieval_case:${item.case_id}`);
    }
    if (!["A", "B", "tie"].includes(value.preference)) {
      errors.push(`invalid_preference:${item.case_id}`);
    }
    if (!Number.isInteger(value.confidence_1_to_5) ||
      value.confidence_1_to_5 < 1 || value.confidence_1_to_5 > 5) {
      errors.push(`invalid_confidence:${item.case_id}`);
    }
    ["A", "B"].forEach((label) => {
      if (typeof value.misleading_content?.[label] !== "boolean") {
        errors.push(`invalid_misleading_flag:${item.case_id}:${label}`);
      }
    });
    SCORE_DIMENSIONS.forEach((dimension) => {
      ["A", "B"].forEach((label) => {
        const score = value.scores_1_to_5?.[dimension]?.[label];

        if (!Number.isInteger(score) || score < 1 || score > 5) {
          errors.push(`invalid_score:${item.case_id}:${dimension}:${label}`);
        }
      });
    });
    if (String(value.rationale || "").trim().length < 25) {
      errors.push(`rationale_too_short:${item.case_id}`);
    }
  });

  matrixResponses.forEach((item) => {
    const value = item.response || {};

    if (!matrixIds.has(item.case_id)) {
      errors.push(`unknown_matrix_case:${item.case_id}`);
    }
    if (!Number.isInteger(value.overall_usefulness_score_1_to_5) ||
      value.overall_usefulness_score_1_to_5 < 1 ||
      value.overall_usefulness_score_1_to_5 > 5) {
      errors.push(`invalid_matrix_score:${item.case_id}`);
    }
    [
      "abstention_appropriate",
      "evidence_interpretation_safe",
      "investigation_priorities_engineering_relevant",
    ].forEach((field) => {
      if (typeof value[field] !== "boolean") {
        errors.push(`invalid_matrix_boolean:${item.case_id}:${field}`);
      }
    });
    if (String(value.rationale || "").trim().length < 25) {
      errors.push(`matrix_rationale_too_short:${item.case_id}`);
    }
  });

  return {
    errors,
    valid: errors.length === 0,
  };
}

function average(values) {
  return values.length
    ? values.reduce((total, value) => total + value, 0) / values.length
    : null;
}

function median(values) {
  if (!values.length) {
    return null;
  }

  const sorted = [...values].sort((left, right) => left - right);
  const middle = Math.floor(sorted.length / 2);

  return sorted.length % 2
    ? sorted[middle]
    : (sorted[middle - 1] + sorted[middle]) / 2;
}

function ratio(values) {
  return values.length
    ? values.filter(Boolean).length / values.length
    : null;
}

export function assessFailureLearningExpertReview({
  key,
  responses,
  reviewerPackage,
}) {
  const validations = responses.map((response) => ({
    reviewer_id: response?.reviewer?.reviewer_id || null,
    ...validateFailureLearningResponse(response, reviewerPackage),
  }));
  const reviewerIds = responses.map(
    (response) => response?.reviewer?.reviewer_id
  );
  const disciplines = new Set(
    responses.map((response) => response?.reviewer?.discipline)
  );
  const governanceErrors = [];

  if (validations.some((item) => !item.valid)) {
    governanceErrors.push("one_or_more_reviewer_responses_invalid");
  }
  if (new Set(reviewerIds).size !== reviewerIds.length) {
    governanceErrors.push("duplicate_reviewer_id");
  }
  if (responses.length <
    reviewerPackage.reviewer_requirements.independent_reviewers_minimum) {
    governanceErrors.push("insufficient_independent_reviewers");
  }
  reviewerPackage.reviewer_requirements.required_disciplines.forEach(
    (discipline) => {
      if (!disciplines.has(discipline)) {
        governanceErrors.push(`required_discipline_missing:${discipline}`);
      }
    }
  );

  if (governanceErrors.length) {
    return {
      decision: "not_assessable",
      governance_errors: governanceErrors,
      reviewer_validations: validations,
      thresholds_changed: false,
    };
  }

  const retrievalKey = new Map(
    key.retrieval_cases.map((item) => [item.case_id, item])
  );
  const matrixCase = new Map(
    reviewerPackage.arms.matrix_appropriateness.cases.map((item) => [
      item.case_id,
      item,
    ])
  );
  const preferences = [];
  const misleadingCandidate = [];
  const misleadingBaseline = [];
  const pairedDifferences = Object.fromEntries(
    SCORE_DIMENSIONS.map((dimension) => [dimension, []])
  );
  const matrixUsefulness = [];
  const matrixSafety = [];
  const matrixPriorityRelevance = [];
  const matrixAbstention = [];

  responses.forEach((response) => {
    response.arms.retrieval_preference.forEach((item) => {
      const mapping = retrievalKey.get(item.case_id)?.output_mapping || {};
      const candidateLabel = Object.entries(mapping).find(
        ([, value]) => value === "candidate_system"
      )?.[0];
      const baselineLabel = candidateLabel === "A" ? "B" : "A";

      preferences.push(
        item.response.preference === "tie"
          ? "tie"
          : item.response.preference === candidateLabel
            ? "candidate"
            : "baseline"
      );
      misleadingCandidate.push(
        item.response.misleading_content[candidateLabel]
      );
      misleadingBaseline.push(
        item.response.misleading_content[baselineLabel]
      );
      SCORE_DIMENSIONS.forEach((dimension) => {
        const scores = item.response.scores_1_to_5[dimension];

        pairedDifferences[dimension].push(
          scores[candidateLabel] - scores[baselineLabel]
        );
      });
    });

    response.arms.matrix_appropriateness.forEach((item) => {
      const matrix = matrixCase.get(item.case_id)?.output;

      matrixUsefulness.push(item.response.overall_usefulness_score_1_to_5);
      matrixSafety.push(item.response.evidence_interpretation_safe);
      if ((matrix?.qualified_priority_count || 0) > 0) {
        matrixPriorityRelevance.push(
          item.response.investigation_priorities_engineering_relevant
        );
      }
      if (matrix?.status === "abstained") {
        matrixAbstention.push(item.response.abstention_appropriate);
      }
    });
  });

  const nonTiePreferences = preferences.filter((item) => item !== "tie");
  const metrics = {
    matrix: {
      abstention_appropriateness_rate: ratio(matrixAbstention),
      evidence_interpretation_safe_rate: ratio(matrixSafety),
      investigation_priority_relevance_rate: ratio(matrixPriorityRelevance),
      median_usefulness: median(matrixUsefulness),
      reviewed_case_ratings: matrixUsefulness.length,
    },
    retrieval: {
      baseline_preference_count: preferences.filter(
        (item) => item === "baseline"
      ).length,
      candidate_preference_count: preferences.filter(
        (item) => item === "candidate"
      ).length,
      candidate_preference_share_non_tie: nonTiePreferences.length
        ? nonTiePreferences.filter((item) => item === "candidate").length /
          nonTiePreferences.length
        : null,
      misleading_rate_baseline: ratio(misleadingBaseline),
      misleading_rate_candidate: ratio(misleadingCandidate),
      paired_mean_score_difference: Object.fromEntries(
        SCORE_DIMENSIONS.map((dimension) => [
          dimension,
          average(pairedDifferences[dimension]),
        ])
      ),
      tie_count: preferences.filter((item) => item === "tie").length,
    },
  };
  const gates = {
    candidate_preference:
      metrics.retrieval.candidate_preference_share_non_tie >=
      DECISION_GATES.candidate_preference_share_non_tie_minimum,
    matrix_abstention:
      metrics.matrix.abstention_appropriateness_rate === null ||
      metrics.matrix.abstention_appropriateness_rate >=
        DECISION_GATES.matrix_abstention_appropriateness_minimum,
    matrix_safety:
      metrics.matrix.evidence_interpretation_safe_rate >=
      DECISION_GATES.matrix_evidence_interpretation_safe_minimum,
    matrix_usefulness:
      metrics.matrix.median_usefulness >=
      DECISION_GATES.matrix_median_usefulness_minimum,
    misleading_content:
      metrics.retrieval.misleading_rate_candidate <=
      metrics.retrieval.misleading_rate_baseline +
        DECISION_GATES.misleading_rate_margin_maximum,
    priority_relevance:
      metrics.matrix.investigation_priority_relevance_rate === null ||
      metrics.matrix.investigation_priority_relevance_rate >=
        DECISION_GATES.matrix_investigation_relevance_minimum,
    relevance_improvement:
      metrics.retrieval.paired_mean_score_difference.analogue_relevance >=
      DECISION_GATES.paired_relevance_improvement_minimum,
    usefulness_improvement:
      metrics.retrieval.paired_mean_score_difference
        .failure_learning_usefulness >=
      DECISION_GATES.paired_usefulness_improvement_minimum,
  };
  const passed = Object.values(gates).every(Boolean);

  return {
    decision: passed
      ? "candidate_for_human_methodology_governance_review"
      : "expert_review_gate_not_met",
    gates,
    governance_errors: [],
    metrics,
    production_approval: false,
    reviewer_validations: validations,
    thresholds_changed: false,
  };
}
