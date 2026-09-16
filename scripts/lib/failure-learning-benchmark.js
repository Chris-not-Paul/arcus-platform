import crypto from "node:crypto";

import {
  buildNationalHazardAnalogueCohort,
} from "../../server/collapseAnalogueService.js";
import {
  failureLearningFingerprints,
} from "../../server/failureLearningFeedbackStore.js";
import {
  normalizeHistoricalBridgeProfile,
} from "../../src/utils/projectBridgeProfile.js";

export const FAILURE_LEARNING_BENCHMARK_VERSION =
  "arcus-failure-learning-benchmark-v1";
export const FAILURE_LEARNING_BENCHMARK_SEED =
  "arcus-hydraulic-pilot-2026-09-v1";

const RATING_OPTIONS = Object.freeze([
  "useful",
  "partially_useful",
  "not_useful",
  "insufficient_information",
]);
const REASON_OPTIONS = Object.freeze([
  "hazard_comparable",
  "structural_profile_comparable",
  "mechanism_relevant",
  "evidence_strong",
  "key_feature_mismatch",
  "insufficient_data",
  "same_episode_concern",
  "other",
]);
const TARGETS_BY_STRATUM = Object.freeze({
  P1: 8,
  P2: 10,
  P3: 10,
  no_intersection: 12,
});
const REVIEWER_SLOTS = Object.freeze([
  "reviewer-01",
  "reviewer-02",
  "reviewer-03",
  "reviewer-04",
  "reviewer-05",
]);

function stableNumber(value) {
  return Number.parseInt(
    crypto.createHash("sha256")
      .update(`${FAILURE_LEARNING_BENCHMARK_SEED}:${value}`)
      .digest("hex")
      .slice(0, 12),
    16
  );
}

function stableDigest(value) {
  return crypto.createHash("sha256")
    .update(JSON.stringify(value))
    .digest("hex");
}

function text(value) {
  return String(value || "").trim();
}

function hydraulicStratum(signature) {
  const hydraulic = signature?.hydraulic || {};
  if (["available", "partial"].includes(hydraulic.status) && hydraulic.highest_class) {
    return text(hydraulic.highest_class).toUpperCase();
  }
  return hydraulic.status === "no_intersection" ? "no_intersection" : null;
}

function selectGeographicallyDiverse(items, limit) {
  const groups = new Map();
  [...items]
    .sort((left, right) =>
      stableNumber(left.event_id) - stableNumber(right.event_id) ||
      text(left.event_id).localeCompare(text(right.event_id))
    )
    .forEach((event) => {
      const region = text(event.region) || "region_not_documented";
      const group = groups.get(region) || [];
      group.push(event);
      groups.set(region, group);
    });

  const orderedRegions = [...groups.keys()].sort((left, right) =>
    stableNumber(left) - stableNumber(right) || left.localeCompare(right)
  );
  const selected = [];
  let pass = 0;
  while (selected.length < limit) {
    let added = false;
    orderedRegions.forEach((region) => {
      const candidate = groups.get(region)?.[pass];
      if (candidate && selected.length < limit) {
        selected.push(candidate);
        added = true;
      }
    });
    if (!added) break;
    pass += 1;
  }
  return selected;
}

function officialExposure(signature = {}) {
  return {
    hydraulic: signature.hydraulic || null,
    landslide: signature.landslide || null,
    seismic: signature.seismic || null,
  };
}

function targetHazardSnapshot(signature = {}) {
  return {
    hydraulic: {
      highestClass: signature.hydraulic?.highest_class || null,
      matchedClasses: signature.hydraulic?.matched_classes || [],
      status: signature.hydraulic?.status || "not_available",
    },
    landslide: {
      highestClass: signature.landslide?.highest_hazard_class || null,
      matchedClasses: signature.landslide?.matched_hazard_classes || [],
      status: signature.landslide?.status || "not_available",
    },
    seismic: {
      pgaP50G: signature.seismic?.pga_p50_g ?? null,
      status: signature.seismic?.status || "not_available",
    },
  };
}

function reviewerTargetContext(event, signature, profile) {
  return {
    bridge_profile: profile,
    current_official_context: targetHazardSnapshot(signature),
    interpretation_boundary: [
      "The target is sampled from the ARCUS historical archive, but its identity and collapse outcome are withheld.",
      "Current official classes support present-day comparability and are not a reconstruction of hazard at collapse time.",
      "A no-intersection result means no official class was assigned at the point; it is not evidence of zero hazard or safety.",
    ],
  };
}

function sourceSummary(sources = []) {
  const roles = sources.reduce((counts, source) => {
    const role = text(source.source_role).toLowerCase() || "not_documented";
    counts[role] = (counts[role] || 0) + 1;
    return counts;
  }, {});
  return {
    boundary:
      "Source titles and links are withheld during blinded review; use insufficient_information when aggregate support is inadequate.",
    official_or_technical_count: roles["official/technical"] || 0,
    scientific_count: roles.scientific || 0,
    source_count: sources.length,
    source_role_counts: roles,
  };
}

function reviewerAnalogue(caseId, analogue, index, sources) {
  const observed = analogue.temporal_evidence?.observed_trigger || {};
  return {
    analogue_id: `${caseId}-A${String(index + 1).padStart(2, "0")}`,
    current_official_context: {
      hydraulic: {
        highest_class:
          analogue.current_official_signature?.hydraulic?.highest_class || null,
        matched_classes:
          analogue.current_official_signature?.hydraulic?.matched_classes || [],
        status:
          analogue.current_official_signature?.hydraulic?.status || "not_available",
      },
      landslide: {
        highest_class:
          analogue.current_official_signature?.landslide?.highest_hazard_class || null,
        status:
          analogue.current_official_signature?.landslide?.status || "not_available",
      },
      seismic: {
        pga_p50_g:
          analogue.current_official_signature?.seismic?.pga_p50_g ?? null,
        status:
          analogue.current_official_signature?.seismic?.status || "not_available",
      },
    },
    documented_failure_observation: {
      component_involved: observed.component_involved || null,
      evidence_level: observed.evidence_level || "unspecified",
      failure_process: observed.failure_process || null,
      trigger: observed.trigger || null,
    },
    documentary_support: sourceSummary(sources),
    evidence_quality: analogue.evidence_quality || {},
    neutral_feature_comparison: analogue.retrieval_comparison || {},
    retrieval_rank: analogue.retrieval_rank,
  };
}

function knownOutcome(event) {
  return {
    collapse_extent: event.collapse_extent || event.collapse_severity || null,
    component_involved:
      event.hydraulic_intelligence?.component_involved ||
      event.component_involved || null,
    evidence_level:
      event.hydraulic_intelligence?.evidence_level ||
      event.failure_cause_evidence || null,
    failure_process:
      event.hydraulic_intelligence?.failure_process ||
      event.failure_process || null,
    trigger:
      event.hydraulic_intelligence?.trigger || event.failure_trigger || null,
  };
}

function analogueQuestion(analogueId) {
  return {
    analogue_id: analogueId,
    rating: null,
    rating_options: RATING_OPTIONS,
    reason_codes: [],
    reason_options: REASON_OPTIONS,
    technical_note: null,
  };
}

function controlQuestion() {
  return {
    abstention_appropriate: null,
    context_wording_clear: null,
    missing_critical_information: null,
    rationale: null,
    zero_hazard_or_safety_inference_present: null,
  };
}

function buildCase({
  event,
  events,
  historicalSignatures,
  index,
  signature,
  signatures,
  sourcesByEvent,
  stratum,
}) {
  const caseId = `FLB-${String(index + 1).padStart(3, "0")}`;
  const profile = normalizeHistoricalBridgeProfile(event);
  const retrieval = buildNationalHazardAnalogueCohort({
    events: events.filter((candidate) => candidate.event_id !== event.event_id),
    historicalSignatures: historicalSignatures.filter(
      (item) => item.event_id !== event.event_id
    ),
    limit: 8,
    officialExposure: officialExposure(signature),
    projectBridgeProfile: profile,
    signatures: signatures.filter((item) => item.event_id !== event.event_id),
  });
  const fingerprintInput = {
    projectBridgeProfile: profile,
    projectLocation: {
      latitude: event.latitude,
      longitude: event.longitude,
      province: event.province,
    },
    targetHazardSnapshot: targetHazardSnapshot(signature),
  };
  const targetFingerprint = failureLearningFingerprints({
    ...fingerprintInput,
    analogueEventId: "IT00.00.00",
  }).targetContextFingerprint;
  const reviewerAnalogues = retrieval.analogues.map((analogue, analogueIndex) =>
    reviewerAnalogue(
      caseId,
      analogue,
      analogueIndex,
      sourcesByEvent.get(analogue.event?.event_id) || []
    )
  );
  const analogueKey = retrieval.analogues.map((analogue, analogueIndex) => {
    const analogueEventId = analogue.event?.event_id;
    const fingerprints = failureLearningFingerprints({
      ...fingerprintInput,
      analogueEventId,
    });
    return {
      analogue_event_id: analogueEventId,
      analogue_id: reviewerAnalogues[analogueIndex].analogue_id,
      analogue_pair_fingerprint: fingerprints.analoguePairFingerprint,
      retrieval_rank: analogue.retrieval_rank,
    };
  });
  const type = stratum === "no_intersection"
    ? "abstention_control"
    : "analogue_relevance";

  return {
    key: {
      analogue_key: analogueKey,
      case_id: caseId,
      known_target_outcome: knownOutcome(event),
      target_context_fingerprint: targetFingerprint,
      target_event_id: event.event_id,
      target_location: {
        latitude: event.latitude,
        longitude: event.longitude,
        province: event.province,
        region: event.region,
      },
    },
    reviewer: {
      analogues: reviewerAnalogues,
      case_id: caseId,
      expected_engine_behaviour: type === "abstention_control"
        ? "explicit_abstention_with_zero_analogues"
        : "ranked_analogues_for_expert_relevance_review",
      response: type === "abstention_control"
        ? { abstention_assessment: controlQuestion() }
        : {
            analogue_judgements: reviewerAnalogues.map((analogue) =>
              analogueQuestion(analogue.analogue_id)
            ),
          },
      review_type: type,
      target_context: reviewerTargetContext(event, signature, profile),
    },
    summary: {
      analogue_count: reviewerAnalogues.length,
      case_id: caseId,
      region: text(event.region) || "not_documented",
      review_type: type,
      stratum,
    },
  };
}

function caseAssignments(cases) {
  const baseAssignments = new Map(
    REVIEWER_SLOTS.map((slot) => [slot, []])
  );
  const workload = new Map(REVIEWER_SLOTS.map((slot) => [slot, 0]));
  const weight = (item) => item.summary.review_type === "abstention_control"
    ? 4
    : Math.max(1, item.summary.analogue_count);
  const orderedRetrievalCases = cases
    .filter((item) => item.summary.review_type === "analogue_relevance")
    .sort((left, right) =>
    stableNumber(left.summary.case_id) - stableNumber(right.summary.case_id)
  );
  const addToLeastLoaded = (item, copies = 1) => {
    for (let copy = 0; copy < copies; copy += 1) {
      const slot = [...REVIEWER_SLOTS]
        .filter((candidate) =>
          !baseAssignments.get(candidate).includes(item.summary.case_id)
        )
        .sort((left, right) =>
          workload.get(left) - workload.get(right) ||
          baseAssignments.get(left).length - baseAssignments.get(right).length ||
          stableNumber(`${item.summary.case_id}:${left}`) -
            stableNumber(`${item.summary.case_id}:${right}`)
        )[0];
      baseAssignments.get(slot).push(item.summary.case_id);
      workload.set(slot, workload.get(slot) + weight(item));
    }
  };
  const retrievalOverlap = ["P1", "P2", "P3"].flatMap((stratum) =>
    selectGeographicallyDiverse(
      cases.filter((item) => item.summary.stratum === stratum)
        .map((item) => ({
          event_id: item.summary.case_id,
          region: item.summary.region,
        })),
      stratum === "P1" ? 2 : 3
    ).map((item) => item.event_id)
  );
  const controlOverlap = selectGeographicallyDiverse(
    cases.filter((item) => item.summary.stratum === "no_intersection")
      .map((item) => ({
        event_id: item.summary.case_id,
        region: item.summary.region,
      })),
    2
  ).map((item) => item.event_id);

  const caseById = new Map(cases.map((item) => [item.summary.case_id, item]));
  orderedRetrievalCases.forEach((item) => addToLeastLoaded(item));
  retrievalOverlap.forEach((caseId) => addToLeastLoaded(caseById.get(caseId), 2));
  cases
    .filter((item) => item.summary.review_type === "abstention_control")
    .sort((left, right) =>
      stableNumber(left.summary.case_id) - stableNumber(right.summary.case_id)
    )
    .forEach((item) => addToLeastLoaded(item));
  controlOverlap.forEach((caseId) => addToLeastLoaded(caseById.get(caseId), 1));

  return {
    assignments: Object.fromEntries(
      [...baseAssignments.entries()].map(([slot, caseIds]) => [
        slot,
        [...new Set(caseIds)].sort(),
      ])
    ),
    controlOverlap,
    retrievalOverlap,
    workload: Object.fromEntries(REVIEWER_SLOTS.map((slot) => [
      slot,
      {
        analogue_judgements: baseAssignments.get(slot).reduce(
          (total, caseId) => total + caseById.get(caseId).summary.analogue_count,
          0
        ),
        assigned_cases: baseAssignments.get(slot).length,
        control_reviews: baseAssignments.get(slot).filter(
          (caseId) => caseById.get(caseId).summary.review_type === "abstention_control"
        ).length,
        workload_units: workload.get(slot),
      },
    ])),
  };
}

function reviewerResponseTemplate(slot, assignedCases, benchmarkFreezeId) {
  return {
    benchmark_freeze_id: benchmarkFreezeId,
    cases: assignedCases.map((item) => ({
      case_id: item.case_id,
      response: item.response,
      review_type: item.review_type,
    })),
    declaration: {
      completed_independently_before_panel: null,
      consent_for_pseudonymised_calibration_use: null,
      conflict_of_interest: null,
      model_generated: false,
      signed_at: null,
      signature: null,
    },
    reviewer: {
      discipline: null,
      experience_years: null,
      reviewer_id: null,
      reviewer_slot: slot,
    },
    version: FAILURE_LEARNING_BENCHMARK_VERSION,
  };
}

export function validateFailureLearningBenchmarkResponse(
  response,
  reviewerPackage
) {
  const errors = [];
  if (response?.version !== FAILURE_LEARNING_BENCHMARK_VERSION) {
    errors.push("benchmark_version_mismatch");
  }
  if (response?.benchmark_freeze_id !== reviewerPackage?.benchmark_freeze_id) {
    errors.push("benchmark_freeze_id_mismatch");
  }
  if (!response?.reviewer?.reviewer_id) errors.push("reviewer_id_required");
  if (!response?.reviewer?.discipline) errors.push("reviewer_discipline_required");
  if (response?.reviewer?.reviewer_slot !== reviewerPackage?.reviewer_slot) {
    errors.push("reviewer_slot_mismatch");
  }
  if (response?.declaration?.model_generated !== false) {
    errors.push("model_generated_response_rejected");
  }
  if (response?.declaration?.completed_independently_before_panel !== true) {
    errors.push("independent_completion_declaration_required");
  }
  if (response?.declaration?.consent_for_pseudonymised_calibration_use !== true) {
    errors.push("pseudonymised_calibration_consent_required");
  }
  if (!response?.declaration?.signature) errors.push("reviewer_signature_required");

  const expectedById = new Map(
    (reviewerPackage?.cases || []).map((item) => [item.case_id, item])
  );
  const received = Array.isArray(response?.cases) ? response.cases : [];
  const receivedIds = new Set(received.map((item) => item.case_id));
  [...expectedById.keys()].forEach((caseId) => {
    if (!receivedIds.has(caseId)) errors.push(`case_response_missing:${caseId}`);
  });
  received.forEach((item) => {
    const expected = expectedById.get(item.case_id);
    if (!expected) {
      errors.push(`unknown_case:${item.case_id}`);
      return;
    }
    if (item.review_type !== expected.review_type) {
      errors.push(`review_type_mismatch:${item.case_id}`);
      return;
    }
    if (expected.review_type === "analogue_relevance") {
      const expectedAnalogueIds = new Set(
        expected.analogues.map((analogue) => analogue.analogue_id)
      );
      const judgements = item.response?.analogue_judgements || [];
      const receivedAnalogueIds = new Set(
        judgements.map((judgement) => judgement.analogue_id)
      );
      [...expectedAnalogueIds].forEach((analogueId) => {
        if (!receivedAnalogueIds.has(analogueId)) {
          errors.push(`analogue_judgement_missing:${item.case_id}:${analogueId}`);
        }
      });
      judgements.forEach((judgement) => {
        const prefix = `${item.case_id}:${judgement.analogue_id}`;
        if (!expectedAnalogueIds.has(judgement.analogue_id)) {
          errors.push(`unknown_analogue:${prefix}`);
        }
        if (!RATING_OPTIONS.includes(judgement.rating)) {
          errors.push(`invalid_rating:${prefix}`);
        }
        const reasonCodes = Array.isArray(judgement.reason_codes)
          ? judgement.reason_codes
          : [];
        if (!reasonCodes.length || reasonCodes.some(
          (reason) => !REASON_OPTIONS.includes(reason)
        )) {
          errors.push(`invalid_reason_codes:${prefix}`);
        }
        if (["partially_useful", "not_useful"].includes(judgement.rating) &&
          text(judgement.technical_note).length < 20) {
          errors.push(`technical_note_required:${prefix}`);
        }
      });
      return;
    }
    const control = item.response?.abstention_assessment || {};
    [
      "abstention_appropriate",
      "context_wording_clear",
      "zero_hazard_or_safety_inference_present",
    ].forEach((field) => {
      if (typeof control[field] !== "boolean") {
        errors.push(`invalid_control_boolean:${item.case_id}:${field}`);
      }
    });
    if (text(control.rationale).length < 25) {
      errors.push(`control_rationale_required:${item.case_id}`);
    }
  });

  return {
    errors,
    valid: errors.length === 0,
  };
}

export function buildFailureLearningBenchmark({
  datasetChecksums = {},
  events = [],
  generatedAt = new Date().toISOString(),
  historicalSignatures = [],
  signatures = [],
  sources = [],
} = {}) {
  const signatureById = new Map(
    signatures.map((signature) => [signature.event_id, signature])
  );
  const sourcesByEvent = sources.reduce((index, source) => {
    const eventId = source.event_id;
    if (!eventId) return index;
    const rows = index.get(eventId) || [];
    rows.push(source);
    index.set(eventId, rows);
    return index;
  }, new Map());
  const selected = Object.entries(TARGETS_BY_STRATUM).flatMap(
    ([stratum, limit]) => selectGeographicallyDiverse(
      events.filter((event) =>
        Number.isFinite(Number(event.latitude)) &&
        Number.isFinite(Number(event.longitude)) &&
        hydraulicStratum(signatureById.get(event.event_id)) === stratum
      ),
      limit
    ).map((event) => ({ event, stratum }))
  );
  const builtCases = selected.map(({ event, stratum }, index) => buildCase({
    event,
    events,
    historicalSignatures,
    index,
    signature: signatureById.get(event.event_id),
    signatures,
    sourcesByEvent,
    stratum,
  }));
  const reviewerCases = builtCases.map((item) => item.reviewer);
  const assignmentPlan = caseAssignments(builtCases);
  const inputFingerprint = stableDigest({
    assignments: assignmentPlan.assignments,
    caseKey: builtCases.map((item) => ({
      analogueKey: item.key.analogue_key,
      caseId: item.key.case_id,
      targetEventId: item.key.target_event_id,
      targetFingerprint: item.key.target_context_fingerprint,
    })),
    datasetChecksums,
    eventIds: selected.map((item) => item.event.event_id),
    seed: FAILURE_LEARNING_BENCHMARK_SEED,
    signatureStates: selected.map((item) => ({
      eventId: item.event.event_id,
      stratum: item.stratum,
    })),
    version: FAILURE_LEARNING_BENCHMARK_VERSION,
  });
  const benchmarkFreezeId = `flb-${inputFingerprint.slice(0, 20)}`;
  const caseById = new Map(reviewerCases.map((item) => [item.case_id, item]));
  const reviewerPackages = Object.fromEntries(
    REVIEWER_SLOTS.map((slot) => {
      const cases = assignmentPlan.assignments[slot].map((caseId) =>
        caseById.get(caseId)
      );
      return [slot, {
        benchmark_freeze_id: benchmarkFreezeId,
        benchmark_version: FAILURE_LEARNING_BENCHMARK_VERSION,
        cases,
        instructions: [
          "Complete the package independently before any panel discussion.",
          "Judge analogue usefulness for investigation learning, not collapse probability or structural safety.",
          "Treat current official hazard classes as present-day context only.",
          "Do not infer zero hazard from a no-intersection control.",
          "Declare insufficient information whenever the evidence does not support a technical judgement.",
        ],
        reviewer_slot: slot,
        simulated_responses: false,
      }];
    })
  );
  const responseTemplates = Object.fromEntries(
    REVIEWER_SLOTS.map((slot) => [
      slot,
      reviewerResponseTemplate(
        slot,
        reviewerPackages[slot].cases,
        benchmarkFreezeId
      ),
    ])
  );
  const uniqueRetrievalCases = builtCases.filter(
    (item) => item.summary.review_type === "analogue_relevance"
  );
  const uniqueAnaloguePairs = uniqueRetrievalCases.reduce(
    (total, item) => total + item.summary.analogue_count,
    0
  );
  const assignedAnalogueJudgements = REVIEWER_SLOTS.reduce(
    (total, slot) => total + reviewerPackages[slot].cases.reduce(
      (subtotal, item) => subtotal + item.analogues.length,
      0
    ),
    0
  );
  const repeatedPairJudgements = assignedAnalogueJudgements - uniqueAnaloguePairs;
  const reviewerPayload = JSON.stringify(reviewerPackages);
  const workloadValues = Object.values(assignmentPlan.workload).map(
    (item) => item.workload_units
  );
  const qualityChecks = {
    abstention_controls_have_zero_analogues: builtCases
      .filter((item) => item.summary.review_type === "abstention_control")
      .every((item) => item.summary.analogue_count === 0),
    all_retrieval_targets_have_eight_analogues: uniqueRetrievalCases.every(
      (item) => item.summary.analogue_count === 8
    ),
    assigned_analogue_judgements_at_least_300:
      assignedAnalogueJudgements >= 300,
    reviewer_package_has_no_direct_identity_keys:
      !/"(?:event_id|province|region|target_location)"/.test(reviewerPayload),
    reviewer_package_has_no_target_event_identifiers: selected.every(
      (item) => !reviewerPayload.includes(item.event.event_id)
    ),
    target_never_retrieved_as_own_analogue: builtCases.every((item) =>
      item.key.analogue_key.every(
        (analogue) => analogue.analogue_event_id !== item.key.target_event_id
      )
    ),
    target_sample_has_40_contexts: builtCases.length === 40,
    unique_pair_fingerprints_complete:
      new Set(builtCases.flatMap((item) =>
        item.key.analogue_key.map((analogue) =>
          analogue.analogue_pair_fingerprint
        )
      )).size === uniqueAnaloguePairs,
    workload_unit_span_at_most_4:
      Math.max(...workloadValues) - Math.min(...workloadValues) <= 4,
  };
  const qualityChecksPassed = Object.values(qualityChecks).every(Boolean);
  return {
    assignments: {
      overlap: {
        abstention_control_workload_units: 4,
        abstention_control_case_ids: assignmentPlan.controlOverlap,
        analogue_relevance_case_ids: assignmentPlan.retrievalOverlap,
        policy:
          "Eight retrieval cases are assigned to three reviewers and two abstention controls to two reviewers. One abstention control is balanced as four analogue-rating workload units.",
      },
      reviewers: assignmentPlan.assignments,
      workload: assignmentPlan.workload,
    },
    confidentialKey: {
      benchmark_freeze_id: benchmarkFreezeId,
      cases: builtCases.map((item) => item.key),
      caveat: "CONFIDENTIAL — never distribute this key before all reviewer responses are locked.",
      version: FAILURE_LEARNING_BENCHMARK_VERSION,
    },
    manifest: {
      benchmark_freeze_id: benchmarkFreezeId,
      dataset_checksums: datasetChecksums,
      expected_collection: {
        assigned_analogue_judgements: assignedAnalogueJudgements,
        assigned_target_reviews: REVIEWER_SLOTS.reduce(
          (total, slot) => total + reviewerPackages[slot].cases.length,
          0
        ),
        repeated_pair_judgements: repeatedPairJudgements,
        unique_analogue_pairs: uniqueAnaloguePairs,
      },
      generated_at: generatedAt,
      governance: {
        automatic_production_activation: false,
        outcome_fields_used_for_target_sampling: [],
        reviewer_identity_blinded: true,
        target_collapse_identity_and_outcome_withheld: true,
      },
      limitations: [
        "Targets are historical collapsed bridges used as outcome-withheld proxy project contexts; they are not a representative inventory of standing bridges.",
        "Current official hazard signatures are not reconstructed historical exposure at collapse time.",
        "The benchmark assesses analogue usefulness and abstention wording, not collapse probability, safety or intervention priority.",
        "Pilot sample targets are governance choices and do not establish statistical representativeness.",
      ],
      quality_checks: qualityChecks,
      reviewer_slots: REVIEWER_SLOTS,
      sampling: {
        available_by_stratum: Object.fromEntries(
          Object.keys(TARGETS_BY_STRATUM).map((stratum) => [
            stratum,
            events.filter((event) =>
              hydraulicStratum(signatureById.get(event.event_id)) === stratum
            ).length,
          ])
        ),
        method:
          "deterministic_current_hydraulic_stratum_then_geographic_round_robin_without_outcome_fields",
        seed: FAILURE_LEARNING_BENCHMARK_SEED,
        selected_by_stratum: Object.fromEntries(
          Object.keys(TARGETS_BY_STRATUM).map((stratum) => [
            stratum,
            builtCases.filter((item) => item.summary.stratum === stratum).length,
          ])
        ),
      },
      status: qualityChecksPassed
        ? "frozen_ready_for_independent_expert_pilot"
        : "benchmark_incomplete",
      version: FAILURE_LEARNING_BENCHMARK_VERSION,
    },
    responseTemplates,
    reviewerMasterPackage: {
      benchmark_freeze_id: benchmarkFreezeId,
      cases: reviewerCases,
      rating_options: RATING_OPTIONS,
      reason_options: REASON_OPTIONS,
      simulated_responses: false,
      version: FAILURE_LEARNING_BENCHMARK_VERSION,
    },
    reviewerPackages,
  };
}
