export const LANDSLIDE_TAXONOMY_VERSION = "landslide-v1";

export const LANDSLIDE_CORE_FIELDS = Object.freeze([
  "movement_type",
  "interaction_type",
  "component_involved",
  "activity_state_at_event",
  "evidence_level",
]);

export const LANDSLIDE_MATCHER_BLOCKED_FIELDS = Object.freeze([
  "landslide_intelligence",
  ...LANDSLIDE_CORE_FIELDS.map((field) => `landslide_intelligence.${field}`),
  "landslide_intelligence.episode_id",
  "landslide_intelligence.outcome_status",
  "landslide_intelligence.learning_eligibility",
  "landslide_intelligence.cross_hazard_reclassification",
]);

const ELIGIBLE_STATUS = "confirmed_landslide_collapse";
const ELIGIBLE_VALUE = "eligible";

function hasValue(value) {
  return value !== null && value !== undefined && String(value).trim() !== "";
}

export function validateLandslideOutcomeRegistry(registry = {}) {
  const errors = [];
  const cases = Array.isArray(registry.cases) ? registry.cases : [];
  const seen = new Set();

  cases.forEach((entry) => {
    if (!hasValue(entry.event_id)) {
      errors.push({ code: "missing_event_id" });
      return;
    }

    if (seen.has(entry.event_id)) {
      errors.push({ code: "duplicate_event_id", event_id: entry.event_id });
    }
    seen.add(entry.event_id);

    const intelligence = entry.landslide_intelligence || {};
    const missingCoreFields = LANDSLIDE_CORE_FIELDS.filter(
      (field) => !hasValue(intelligence[field])
    );
    const markedEligible = entry.learning_eligibility === ELIGIBLE_VALUE;
    const excludedForInsufficientEvidence = String(entry.curation_status || "")
      .startsWith("excluded_insufficient_");

    if (markedEligible && entry.outcome_status !== ELIGIBLE_STATUS) {
      errors.push({
        code: "eligible_without_confirmed_collapse",
        event_id: entry.event_id,
      });
    }
    if (markedEligible && !hasValue(entry.episode_id)) {
      errors.push({ code: "eligible_without_episode", event_id: entry.event_id });
    }
    if (markedEligible && missingCoreFields.length) {
      errors.push({
        code: "eligible_with_missing_core_fields",
        event_id: entry.event_id,
        fields: missingCoreFields,
      });
    }
    if (excludedForInsufficientEvidence && markedEligible) {
      errors.push({
        code: "insufficient_evidence_case_marked_eligible",
        event_id: entry.event_id,
      });
    }
    if (excludedForInsufficientEvidence && hasValue(entry.episode_id)) {
      errors.push({
        code: "insufficient_evidence_case_has_episode",
        event_id: entry.event_id,
      });
    }
    if (!Array.isArray(entry.evidence_references) || entry.evidence_references.length === 0) {
      errors.push({ code: "missing_evidence_references", event_id: entry.event_id });
    }
  });

  return {
    errors,
    ok: errors.length === 0,
    registered_cases: cases.length,
    taxonomy_version: registry.taxonomy_version || null,
  };
}

export function buildLandslideRegistryIndex(registry = {}) {
  const validation = validateLandslideOutcomeRegistry(registry);

  if (!validation.ok) {
    throw new Error(`Invalid landslide outcome registry: ${JSON.stringify(validation.errors)}`);
  }

  return new Map((registry.cases || []).map((entry) => [entry.event_id, entry]));
}

export function landslideIntelligenceForEvent(event = {}, registryIndex = new Map()) {
  const entry = registryIndex.get(event.event_id);

  if (!entry) {
    return null;
  }

  return {
    ...entry.landslide_intelligence,
    curation_status: entry.curation_status,
    cross_hazard_reclassification: entry.cross_hazard_reclassification || null,
    episode_id: entry.episode_id,
    evidence_references: entry.evidence_references,
    learning_eligibility: entry.learning_eligibility,
    limitations: entry.limitations,
    outcome_status: entry.outcome_status,
    taxonomy_version: LANDSLIDE_TAXONOMY_VERSION,
  };
}

export function enrichEventsWithLandslideIntelligence(events = [], registry = {}) {
  const index = buildLandslideRegistryIndex(registry);

  return events.map((event) => ({
    ...event,
    landslide_intelligence: landslideIntelligenceForEvent(event, index),
  }));
}

export function summarizeLandslideRegistry(registry = {}) {
  const validation = validateLandslideOutcomeRegistry(registry);
  const cases = registry.cases || [];
  const eligible = cases.filter((entry) => entry.learning_eligibility === ELIGIBLE_VALUE);

  return {
    disputed_cases: cases.filter((entry) => entry.curation_status === "disputed").length,
    eligible_cases: eligible.length,
    eligible_effective_evidence: eligible.reduce((total, entry) => {
      const level = entry.landslide_intelligence?.evidence_level;
      return total + (level === "documented" ? 1 : level === "probable" ? 0.5 : 0);
    }, 0),
    eligible_episodes: new Set(eligible.map((entry) => entry.episode_id).filter(Boolean)).size,
    excluded_insufficient_evidence_cases: cases.filter(
      (entry) => String(entry.curation_status || "").startsWith("excluded_insufficient_")
    ).length,
    movement_distribution: eligible.reduce((counts, entry) => {
      const movement = entry.landslide_intelligence?.movement_type || "unspecified";
      counts[movement] = (counts[movement] || 0) + 1;
      return counts;
    }, {}),
    multicausal_cases: cases.filter((entry) => entry.curation_status === "curated_multicausal")
      .length,
    needs_review_cases: cases.filter((entry) => entry.curation_status === "needs_review").length,
    reclassified_cross_hazard_cases: cases.filter(
      (entry) => entry.curation_status === "reclassified_cross_hazard"
    ).length,
    registered_cases: cases.length,
    taxonomy_version: registry.taxonomy_version || null,
    validation,
  };
}
