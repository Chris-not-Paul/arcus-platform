function hasValue(value) {
  return value !== null && value !== undefined && String(value).trim() !== "";
}

function finiteCoordinate(value, minimum, maximum) {
  const number = Number(value);
  return Number.isFinite(number) && number >= minimum && number <= maximum;
}

function pushGap(gaps, code, field, detail = null) {
  gaps.push({ code, field, ...(detail ? { detail } : {}) });
}

function normalizeProvider(value) {
  return String(value || "").trim().toLowerCase();
}

function isApprovedReview(review = {}) {
  return review.status === "approved" && hasValue(review.reviewer);
}

export function evaluateSeismicEvidenceCandidate(candidate = {}, contract = {}) {
  const gaps = [];
  const warnings = [];
  const candidateId = candidate.candidate_id || null;
  const bridge = candidate.bridge || {};
  const event = candidate.event || {};
  const location = candidate.location || {};
  const mechanism = candidate.mechanism || {};
  const outcome = candidate.outcome || {};
  const references = Array.isArray(candidate.evidence_references)
    ? candidate.evidence_references
    : [];

  if (!hasValue(candidateId)) {
    pushGap(gaps, "missing_candidate_id", "candidate_id");
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(event.date || ""))) {
    pushGap(gaps, "invalid_or_missing_event_date", "event.date");
  }
  if (!hasValue(event.earthquake_episode_id)) {
    pushGap(gaps, "missing_earthquake_episode_id", "event.earthquake_episode_id");
  }
  if (!hasValue(event.episode_independence_basis)) {
    pushGap(
      gaps,
      "missing_episode_independence_basis",
      "event.episode_independence_basis"
    );
  }
  if (!finiteCoordinate(location.latitude, -90, 90)) {
    pushGap(gaps, "invalid_latitude", "location.latitude");
  }
  if (!finiteCoordinate(location.longitude, -180, 180)) {
    pushGap(gaps, "invalid_longitude", "location.longitude");
  }
  if (!hasValue(location.country)) {
    pushGap(gaps, "missing_country", "location.country");
  }
  if (!hasValue(bridge.name)) {
    pushGap(gaps, "missing_bridge_name", "bridge.name");
  }
  if (!(contract.allowed_identity_statuses || []).includes(bridge.identity_status)) {
    pushGap(gaps, "bridge_identity_not_admissible", "bridge.identity_status");
  }
  if (!hasValue(bridge.identity_reference)) {
    pushGap(gaps, "missing_bridge_identity_reference", "bridge.identity_reference");
  }
  if (!(contract.allowed_outcome_statuses || []).includes(outcome.status)) {
    pushGap(gaps, "bridge_outcome_not_confirmed", "outcome.status");
  }
  if (!(contract.allowed_mechanism_statuses || []).includes(mechanism.status)) {
    pushGap(gaps, "mechanism_not_coherent", "mechanism.status");
  }

  (contract.required_core_fields || []).forEach((field) => {
    if (!hasValue(mechanism[field])) {
      pushGap(gaps, "missing_mechanism_core_field", `mechanism.${field}`);
    }
  });

  references.forEach((reference, index) => {
    ["role", "title", "url"].forEach((field) => {
      if (!hasValue(reference?.[field])) {
        pushGap(
          gaps,
          "incomplete_evidence_reference",
          `evidence_references[${index}].${field}`
        );
      }
    });
    if (!Array.isArray(reference?.supports) || reference.supports.length === 0) {
      pushGap(
        gaps,
        "evidence_reference_without_support_scope",
        `evidence_references[${index}].supports`
      );
    }
  });

  const technicalRoles = new Set(contract.technical_source_roles || []);
  const caseSpecificTechnicalSources = references.filter(
    (reference) => technicalRoles.has(reference?.role) && reference?.case_specific === true
  );
  const minimumTechnicalSources = Number(
    contract.minimum_case_specific_technical_sources || 1
  );
  if (caseSpecificTechnicalSources.length < minimumTechnicalSources) {
    pushGap(
      gaps,
      "insufficient_case_specific_technical_sources",
      "evidence_references",
      `${caseSpecificTechnicalSources.length}/${minimumTechnicalSources}`
    );
  }

  const historicalGroundMotion = candidate.historical_ground_motion || {};
  if (historicalGroundMotion.status === "source_backed") {
    const blockedProviders = new Set(
      (contract.blocked_historical_hazard_providers || []).map(normalizeProvider)
    );
    if (blockedProviders.has(normalizeProvider(historicalGroundMotion.provider))) {
      pushGap(
        gaps,
        "current_reference_hazard_used_as_historical_measurement",
        "historical_ground_motion.provider"
      );
    }
    if (!hasValue(historicalGroundMotion.source_url)) {
      pushGap(
        gaps,
        "historical_ground_motion_without_source",
        "historical_ground_motion.source_url"
      );
    }
    if (!hasValue(historicalGroundMotion.measurement_type)) {
      pushGap(
        gaps,
        "historical_ground_motion_type_missing",
        "historical_ground_motion.measurement_type"
      );
    }
  } else if (historicalGroundMotion.status !== "not_available") {
    warnings.push({
      code: "historical_ground_motion_status_not_recognized",
      field: "historical_ground_motion.status",
    });
  }

  const scientificEvidenceComplete = gaps.length === 0;
  const requiredReviews = contract.required_reviews || [];
  const pendingReviews = requiredReviews.filter(
    (review) => !isApprovedReview(candidate.reviews?.[review])
  );
  const readyForRegistryReview = scientificEvidenceComplete && pendingReviews.length === 0;

  return {
    admission_status: readyForRegistryReview
      ? "ready_for_registry_review"
      : scientificEvidenceComplete
        ? "ready_for_expert_review"
        : "blocked_evidence_gaps",
    blocking_gaps: gaps,
    candidate_id: candidateId,
    expert_reviews: {
      pending: pendingReviews,
      required: requiredReviews,
    },
    production_effect: "none",
    ready_for_registry_review: readyForRegistryReview,
    scientific_evidence_complete: scientificEvidenceComplete,
    warnings,
  };
}

export function auditSeismicEvidenceCandidates(candidates = [], contract = {}) {
  const rows = (Array.isArray(candidates) ? candidates : []).map((candidate) =>
    evaluateSeismicEvidenceCandidate(candidate, contract)
  );
  const seen = new Set();
  const duplicateCandidateIds = [];

  rows.forEach((row) => {
    if (!row.candidate_id) return;
    if (seen.has(row.candidate_id)) duplicateCandidateIds.push(row.candidate_id);
    seen.add(row.candidate_id);
  });

  if (duplicateCandidateIds.length) {
    rows.forEach((row) => {
      if (!duplicateCandidateIds.includes(row.candidate_id)) return;
      row.blocking_gaps.push({
        code: "duplicate_candidate_id",
        field: "candidate_id",
      });
      row.admission_status = "blocked_evidence_gaps";
      row.ready_for_registry_review = false;
      row.scientific_evidence_complete = false;
    });
  }

  return {
    contract_version: contract.version || null,
    counts: {
      blocked: rows.filter((row) => row.admission_status === "blocked_evidence_gaps").length,
      candidate_count: rows.length,
      ready_for_expert_review: rows.filter(
        (row) => row.admission_status === "ready_for_expert_review"
      ).length,
      ready_for_registry_review: rows.filter(
        (row) => row.admission_status === "ready_for_registry_review"
      ).length,
    },
    decision: rows.length === 0
      ? "no_candidates_supplied"
      : rows.some((row) => row.ready_for_registry_review)
        ? "registry_review_candidates_available"
        : rows.some((row) => row.scientific_evidence_complete)
          ? "expert_review_candidates_available"
          : "candidate_evidence_gaps_remain",
    duplicate_candidate_ids: [...new Set(duplicateCandidateIds)],
    production_effect: "none",
    rows,
  };
}
