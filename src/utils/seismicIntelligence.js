export const SEISMIC_TAXONOMY_VERSION = "seismic-v1";

export const SEISMIC_CORE_FIELDS = Object.freeze([
  "trigger",
  "failure_process",
  "component_involved",
  "interaction_type",
  "evidence_level",
]);

export const SEISMIC_MATCHER_BLOCKED_FIELDS = Object.freeze([
  "seismic_intelligence",
  ...SEISMIC_CORE_FIELDS.map((field) => `seismic_intelligence.${field}`),
  "seismic_intelligence.episode_id",
  "seismic_intelligence.outcome_status",
  "seismic_intelligence.learning_eligibility",
]);

const ELIGIBLE_OUTCOME = "confirmed_earthquake_associated_bridge_collapse";
const ELIGIBLE_VALUE = "eligible";

function hasValue(value) {
  return value !== null && value !== undefined && String(value).trim() !== "";
}

export function validateSeismicOutcomeRegistry(registry = {}) {
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

    const intelligence = entry.seismic_intelligence || {};
    const missingCoreFields = SEISMIC_CORE_FIELDS.filter(
      (field) => !hasValue(intelligence[field])
    );
    const markedEligible = entry.learning_eligibility === ELIGIBLE_VALUE;
    const insufficient = String(entry.curation_status || "")
      .startsWith("excluded_insufficient_");

    if (markedEligible && entry.outcome_status !== ELIGIBLE_OUTCOME) {
      errors.push({ code: "eligible_without_confirmed_collapse", event_id: entry.event_id });
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
    if (insufficient && markedEligible) {
      errors.push({ code: "insufficient_evidence_case_marked_eligible", event_id: entry.event_id });
    }
    if (insufficient && hasValue(entry.episode_id)) {
      errors.push({ code: "insufficient_evidence_case_has_episode", event_id: entry.event_id });
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

export function buildSeismicRegistryIndex(registry = {}) {
  const validation = validateSeismicOutcomeRegistry(registry);

  if (!validation.ok) {
    throw new Error(`Invalid seismic outcome registry: ${JSON.stringify(validation.errors)}`);
  }

  return new Map((registry.cases || []).map((entry) => [entry.event_id, entry]));
}

export function seismicIntelligenceForEvent(event = {}, registryIndex = new Map()) {
  const entry = registryIndex.get(event.event_id);

  if (!entry) {
    return null;
  }

  return {
    ...entry.seismic_intelligence,
    curation_status: entry.curation_status,
    episode_id: entry.episode_id,
    evidence_references: entry.evidence_references,
    learning_eligibility: entry.learning_eligibility,
    limitations: entry.limitations,
    outcome_status: entry.outcome_status,
    taxonomy_version: SEISMIC_TAXONOMY_VERSION,
  };
}

export function enrichEventsWithSeismicIntelligence(events = [], registry = {}) {
  const index = buildSeismicRegistryIndex(registry);

  return events.map((event) => ({
    ...event,
    seismic_intelligence: seismicIntelligenceForEvent(event, index),
  }));
}

export function summarizeSeismicRegistry(registry = {}) {
  const validation = validateSeismicOutcomeRegistry(registry);
  const cases = registry.cases || [];
  const eligible = cases.filter((entry) => entry.learning_eligibility === ELIGIBLE_VALUE);
  const weights = registry.production_support_contract?.evidence_weights || {};

  return {
    eligible_cases: eligible.length,
    eligible_effective_evidence: eligible.reduce(
      (total, entry) => total + Number(weights[entry.seismic_intelligence?.evidence_level] || 0),
      0
    ),
    eligible_episodes: new Set(eligible.map((entry) => entry.episode_id).filter(Boolean)).size,
    excluded_insufficient_evidence_cases: cases.filter(
      (entry) => String(entry.curation_status || "").startsWith("excluded_insufficient_")
    ).length,
    failure_process_distribution: eligible.reduce((counts, entry) => {
      const process = entry.seismic_intelligence?.failure_process || "unspecified";
      counts[process] = (counts[process] || 0) + 1;
      return counts;
    }, {}),
    multicausal_or_disputed_cases: cases.filter((entry) =>
      String(entry.curation_status || "").includes("multicausal") ||
      String(entry.curation_status || "").includes("disputed")
    ).length,
    registered_cases: cases.length,
    taxonomy_version: registry.taxonomy_version || null,
    validation,
  };
}
