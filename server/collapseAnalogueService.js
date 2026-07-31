const SEMANTIC_COMPLETION_STATUSES = new Set([
  "available",
  "no_intersection",
  "outside_coverage",
  "partial",
]);

const HYDRAULIC_CLASS_ORDER = Object.freeze({
  P1: 1,
  P2: 2,
  P3: 3,
});

function finiteNumber(value) {
  const number = Number(value);

  return Number.isFinite(number) ? number : null;
}

function normalizedClasses(values) {
  return [...new Set(
    (Array.isArray(values) ? values : [])
      .map((value) => String(value || "").trim().toUpperCase())
      .filter(Boolean)
  )].sort();
}

function highestHydraulicClass(signature = {}) {
  if (signature.highest_class) {
    return String(signature.highest_class).toUpperCase();
  }

  return normalizedClasses(signature.matched_classes)
    .sort((left, right) =>
      (HYDRAULIC_CLASS_ORDER[right] || 0) -
      (HYDRAULIC_CLASS_ORDER[left] || 0)
    )[0] || null;
}

function landslideClass(signature = {}) {
  if (signature.highest_hazard_class) {
    return String(signature.highest_hazard_class).toUpperCase();
  }

  const classes = normalizedClasses(signature.matched_hazard_classes);

  if (classes.length) {
    return classes.sort((left, right) =>
      Number(String(right).replace(/\D/g, "")) -
      Number(String(left).replace(/\D/g, ""))
    )[0];
  }

  if (signature.attention_area) {
    return "AA";
  }

  if (signature.status === "no_intersection") {
    return "NO_CLASS_AT_POINT";
  }

  return null;
}

function currentTargetSignature(officialExposure = {}) {
  const hydraulic = officialExposure.hydraulic || {};
  const landslide = officialExposure.landslide || {};
  const seismic = officialExposure.seismic || {};

  return {
    hydraulic: {
      highest_class: highestHydraulicClass(hydraulic),
      matched_classes: normalizedClasses(hydraulic.matched_classes),
      status: hydraulic.status || "not_available",
    },
    landslide: {
      attention_area: Boolean(landslide.attention_area),
      highest_hazard_class: landslideClass(landslide),
      matched_hazard_classes: normalizedClasses(
        landslide.matched_hazard_classes
      ),
      status: landslide.status || "not_available",
    },
    seismic: {
      pga_p50_g: finiteNumber(seismic.pga_p50_g),
      status: seismic.status || "not_available",
    },
  };
}

function providerComplete(signature) {
  return SEMANTIC_COMPLETION_STATUSES.has(signature?.status);
}

function intersectingHydraulicSignature(signature = {}) {
  return (
    ["available", "partial"].includes(signature.status) &&
    Boolean(
      highestHydraulicClass(signature) ||
      normalizedClasses(signature.matched_classes).length
    )
  );
}

function jaccard(leftValues, rightValues) {
  const left = new Set(normalizedClasses(leftValues));
  const right = new Set(normalizedClasses(rightValues));
  const union = new Set([...left, ...right]);

  if (!union.size) {
    return null;
  }

  const intersection = [...left].filter((value) => right.has(value)).length;

  return {
    intersection,
    ratio: Number((intersection / union.size).toFixed(4)),
  };
}

function temporalEvidenceFor(event, historicalByEvent) {
  const registered = historicalByEvent.get(event.event_id);

  return {
    current_official_context_caveat:
      "The current official hazard signature supports present-day comparability and is not retrospective causal proof.",
    historical_at_event: registered || {
      classification_date: null,
      classification_year: null,
      limitations: [
        "No authenticated year-specific official classification is registered for this collapse.",
        "ARCUS does not back-cast the current ISPRA or INGV class to the event year.",
      ],
      source: null,
      status: "not_available_not_reconstructed",
    },
    observed_trigger: {
      component_involved:
        event.hydraulic_intelligence?.component_involved ||
        event.component_involved ||
        null,
      evidence_level:
        event.hydraulic_intelligence?.evidence_level ||
        event.failure_cause_evidence ||
        "unspecified",
      failure_process:
        event.hydraulic_intelligence?.failure_process ||
        event.failure_process ||
        null,
      source_basis: "ARCUS curated collapse record",
      specific_cause: event.specific_cause || null,
      status:
        event.failure_trigger ||
        event.hydraulic_intelligence?.trigger ||
        event.specific_cause
          ? "documented_or_curated"
          : "not_documented",
      trigger:
        event.failure_trigger ||
        event.hydraulic_intelligence?.trigger ||
        null,
      observed_intensity: null,
      caveat:
        "The curated trigger and process are historical outcomes read only after the analogue cohort is fixed. They are not used to select the cohort.",
    },
  };
}

function comparisonFor(target, candidate) {
  const targetHydraulic = target.hydraulic || {};
  const candidateHydraulic = candidate.hydraulic || {};
  const targetHighest = highestHydraulicClass(targetHydraulic);
  const candidateHighest = highestHydraulicClass(candidateHydraulic);
  const classOverlap = jaccard(
    targetHydraulic.matched_classes,
    candidateHydraulic.matched_classes
  );
  const targetOrder = HYDRAULIC_CLASS_ORDER[targetHighest] || null;
  const candidateOrder = HYDRAULIC_CLASS_ORDER[candidateHighest] || null;
  const targetLandslide = landslideClass(target.landslide);
  const candidateLandslide = landslideClass(candidate.landslide);
  const targetPga = finiteNumber(target.seismic?.pga_p50_g);
  const candidatePga = finiteNumber(candidate.seismic?.pga_p50_g);

  return {
    hydraulic: {
      candidate_highest_class: candidateHighest,
      class_overlap_count: classOverlap?.intersection ?? 0,
      class_overlap_ratio: classOverlap?.ratio ?? null,
      highest_class_distance:
        targetOrder && candidateOrder
          ? Math.abs(targetOrder - candidateOrder)
          : null,
      highest_class_exact:
        Boolean(targetHighest) && targetHighest === candidateHighest,
      target_highest_class: targetHighest,
    },
    landslide: {
      candidate_class: candidateLandslide,
      comparable: Boolean(targetLandslide && candidateLandslide),
      exact:
        Boolean(targetLandslide) &&
        Boolean(candidateLandslide) &&
        targetLandslide === candidateLandslide,
      target_class: targetLandslide,
    },
    seismic: {
      candidate_pga_p50_g: candidatePga,
      comparable: targetPga !== null && candidatePga !== null,
      pga_delta_g:
        targetPga !== null && candidatePga !== null
          ? Number(Math.abs(targetPga - candidatePga).toFixed(5))
          : null,
      target_pga_p50_g: targetPga,
    },
  };
}

function compareCandidates(left, right) {
  const leftHydraulic = left.comparison.hydraulic;
  const rightHydraulic = right.comparison.hydraulic;

  return (
    Number(rightHydraulic.highest_class_exact) -
      Number(leftHydraulic.highest_class_exact) ||
    (leftHydraulic.highest_class_distance ?? Number.POSITIVE_INFINITY) -
      (rightHydraulic.highest_class_distance ?? Number.POSITIVE_INFINITY) ||
    rightHydraulic.class_overlap_count -
      leftHydraulic.class_overlap_count ||
    (rightHydraulic.class_overlap_ratio ?? -1) -
      (leftHydraulic.class_overlap_ratio ?? -1) ||
    Number(right.comparison.landslide.exact) -
      Number(left.comparison.landslide.exact) ||
    (left.comparison.seismic.pga_delta_g ?? Number.POSITIVE_INFINITY) -
      (right.comparison.seismic.pga_delta_g ?? Number.POSITIVE_INFINITY) ||
    right.reliability_score - left.reliability_score ||
    String(left.event.event_id).localeCompare(String(right.event.event_id))
  );
}

function retrievalExplanation(comparison) {
  const matched = [];
  const different = [];
  const missing = [];

  if (comparison.hydraulic.highest_class_exact) {
    matched.push("same_current_hydraulic_highest_class");
  } else if (comparison.hydraulic.highest_class_distance !== null) {
    different.push("different_current_hydraulic_highest_class");
  } else {
    missing.push("hydraulic_highest_class");
  }

  if (comparison.hydraulic.class_overlap_count > 0) {
    matched.push("overlapping_current_hydraulic_classes");
  }

  if (comparison.landslide.comparable) {
    (comparison.landslide.exact ? matched : different).push(
      "current_landslide_point_class"
    );
  } else {
    missing.push("landslide_point_class");
  }

  if (comparison.seismic.comparable) {
    matched.push("current_seismic_pga_compared");
  } else {
    missing.push("seismic_pga");
  }

  return {
    different_features: different,
    matched_features: matched,
    missing_features: missing,
  };
}

export function buildNationalHazardAnalogueCohort({
  events = [],
  historicalSignatures = [],
  limit = 20,
  officialExposure = {},
  signatures = [],
} = {}) {
  const target = currentTargetSignature(officialExposure);
  const signaturesByEvent = new Map(
    signatures.map((signature) => [signature.event_id, signature])
  );
  const historicalByEvent = new Map(
    historicalSignatures.map((signature) => [
      signature.event_id,
      signature.historical_at_event || signature,
    ])
  );
  const targetHydraulicActive = intersectingHydraulicSignature(
    target.hydraulic
  );
  const signatureCoverage = {
    hydraulic_complete: signatures.filter((item) =>
      providerComplete(item.hydraulic)
    ).length,
    landslide_complete: signatures.filter((item) =>
      providerComplete(item.landslide)
    ).length,
    seismic_complete: signatures.filter((item) =>
      providerComplete(item.seismic)
    ).length,
    signatures: signatures.length,
    total_events: events.length,
  };

  if (!targetHydraulicActive) {
    return {
      analogues: [],
      available: false,
      reason: "official_hydraulic_point_intersection_required",
      retrieval_contract: {
        geography_filter: "none_national_scope",
        outcome_fields_used_for_selection: [],
        ranking_order: [
          "hydraulic highest-class equality",
          "hydraulic class distance",
          "hydraulic class overlap",
          "landslide point-class equality",
          "absolute PGA difference",
          "source reliability",
        ],
        selection_fields: [
          "current_official_signature.hydraulic",
          "current_official_signature.landslide",
          "current_official_signature.seismic",
        ],
      },
      signature_coverage: signatureCoverage,
      target_current_official_signature: target,
    };
  }

  const candidates = events
    .map((event) => {
      const signature = signaturesByEvent.get(event.event_id);

      if (!signature || !intersectingHydraulicSignature(signature.hydraulic)) {
        return null;
      }

      const comparison = comparisonFor(target, signature);

      return {
        comparison,
        event,
        signature,
        reliability_score: finiteNumber(event.reliability?.score) || 0,
      };
    })
    .filter(Boolean)
    .sort(compareCandidates)
    .slice(0, Math.max(1, Number(limit) || 20));
  const analogues = candidates.map((candidate, index) => ({
    current_official_signature: candidate.signature,
    event: {
      date: candidate.event.date || null,
      event_id: candidate.event.event_id,
      municipality: candidate.event.municipality || null,
      province: candidate.event.province || null,
      region: candidate.event.region || null,
    },
    evidence_quality: {
      curation_level: candidate.event.curation_level || null,
      exact_location: Boolean(candidate.event.exact_location),
      reliability_grade: candidate.event.reliability?.grade || null,
      reliability_score: candidate.reliability_score,
      source_confidence: candidate.event.source_confidence || null,
    },
    explanation: retrievalExplanation(candidate.comparison),
    retrieval_comparison: candidate.comparison,
    retrieval_rank: index + 1,
    temporal_evidence: temporalEvidenceFor(
      candidate.event,
      historicalByEvent
    ),
  }));

  return {
    analogues,
    available: analogues.length > 0,
    reason: analogues.length
      ? null
      : "no_currently_enriched_national_analogues",
    retrieval_contract: {
      geography_filter: "none_national_scope",
      outcome_fields_read_after_cohort_fixed: [
        "hydraulic_intelligence.failure_process",
        "hydraulic_intelligence.component_involved",
        "hydraulic_intelligence.evidence_level",
        "failure_trigger",
        "specific_cause",
      ],
      outcome_fields_used_for_selection: [],
      ranking_order: [
        "hydraulic highest-class equality",
        "hydraulic class distance",
        "hydraulic class overlap",
        "landslide point-class equality",
        "absolute PGA difference",
        "source reliability",
      ],
      selection_fields: [
        "current_official_signature.hydraulic",
        "current_official_signature.landslide",
        "current_official_signature.seismic",
      ],
    },
    signature_coverage: signatureCoverage,
    target_current_official_signature: target,
  };
}
