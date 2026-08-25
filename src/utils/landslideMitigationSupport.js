export const LANDSLIDE_SUPPORT_ENGINE_VERSION = "arcus-landslide-support-v1";

const ELIGIBLE = "eligible";

function number(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function evidenceWeight(level, contract = {}) {
  return number(contract.evidence_weights?.[level]);
}

function exposureState(exposure = {}) {
  const matchedClasses = Array.isArray(exposure.matched_hazard_classes)
    ? exposure.matched_hazard_classes.filter(Boolean)
    : [];
  const active = ["available", "partial"].includes(exposure.status) &&
    matchedClasses.length > 0;

  return {
    active,
    attention_only: Boolean(exposure.attention_area) && matchedClasses.length === 0,
    highest_class: exposure.highest_hazard_class || null,
    matched_classes: matchedClasses,
    provider_status: exposure.status || "not_queried",
  };
}

function summarizeEligibleOutcomes(events = [], contract = {}) {
  const eligible = events.filter(
    (event) => event.landslide_intelligence?.learning_eligibility === ELIGIBLE
  );
  const episodes = new Map();
  const processes = new Map();

  eligible.forEach((event) => {
    const intelligence = event.landslide_intelligence;
    const episodeId = intelligence.episode_id;
    const movement = intelligence.movement_type || "unspecified";
    const weight = evidenceWeight(intelligence.evidence_level, contract);

    if (!episodeId) {
      return;
    }

    const priorEpisode = episodes.get(episodeId);
    episodes.set(episodeId, {
      effective_evidence: Math.max(priorEpisode?.effective_evidence || 0, weight),
      episode_id: episodeId,
      event_ids: [...new Set([...(priorEpisode?.event_ids || []), event.event_id])],
    });

    const process = processes.get(movement) || {
      effective_evidence: 0,
      episode_effective_evidence: 0,
      episode_ids: new Set(),
      event_ids: [],
      movement_type: movement,
      raw_cases: 0,
    };
    process.raw_cases += 1;
    process.effective_evidence += weight;
    process.event_ids.push(event.event_id);
    if (!process.episode_ids.has(episodeId)) {
      process.episode_ids.add(episodeId);
      process.episode_effective_evidence += weight;
    }
    processes.set(movement, process);
  });

  const processMinimum = contract.process_activation_minimum || {};
  const processSupport = [...processes.values()]
    .map((process) => ({
      effective_evidence: Number(process.effective_evidence.toFixed(2)),
      episode_effective_evidence: Number(
        process.episode_effective_evidence.toFixed(2)
      ),
      independent_episodes: process.episode_ids.size,
      movement_type: process.movement_type,
      raw_cases: process.raw_cases,
      status:
        process.raw_cases >= number(processMinimum.raw_cases) &&
        process.episode_ids.size >= number(processMinimum.independent_episodes) &&
        process.episode_effective_evidence >=
          number(processMinimum.episode_effective_evidence)
          ? "threshold_observed_expert_review_still_required"
          : "insufficient",
    }))
    .sort((left, right) =>
      right.episode_effective_evidence - left.episode_effective_evidence ||
      left.movement_type.localeCompare(right.movement_type)
    );
  const episodeEffectiveEvidence = [...episodes.values()].reduce(
    (total, episode) => total + episode.effective_evidence,
    0
  );

  return {
    effective_evidence: Number(
      eligible.reduce(
        (total, event) =>
          total + evidenceWeight(event.landslide_intelligence?.evidence_level, contract),
        0
      ).toFixed(2)
    ),
    eligible_cases: eligible.length,
    episode_effective_evidence: Number(episodeEffectiveEvidence.toFixed(2)),
    independent_episodes: episodes.size,
    process_support: processSupport,
  };
}

export function buildLandslideMitigationSupport({
  contract = {},
  events = [],
  exposure = {},
} = {}) {
  const officialExposure = exposureState(exposure);
  const evidence = summarizeEligibleOutcomes(events, contract);
  const cohortMinimum = contract.cohort_activation_minimum || {};
  const cohortThresholdObserved =
    evidence.independent_episodes >= number(cohortMinimum.independent_episodes) &&
    evidence.episode_effective_evidence >=
      number(cohortMinimum.episode_effective_evidence);
  const expertValidated = contract.status === "expert_validated" &&
    contract.expert_validation_required === false;
  const abstentionReasons = [];

  if (!officialExposure.active) {
    abstentionReasons.push(
      officialExposure.attention_only
        ? "official_landslide_attention_area_requires_dedicated_assessment"
        : officialExposure.provider_status === "no_intersection"
          ? "official_landslide_point_not_intersected"
          : ["partial", "source_incomplete"].includes(officialExposure.provider_status)
            ? "official_landslide_exposure_incomplete"
            : "official_landslide_exposure_unavailable"
    );
  }
  if (officialExposure.active && !cohortThresholdObserved) {
    abstentionReasons.push("insufficient_independent_landslide_episode_evidence");
  }
  if (officialExposure.active && !expertValidated) {
    abstentionReasons.push("landslide_support_contract_not_expert_validated");
  }

  return {
    abstention_reasons: abstentionReasons,
    caveat:
      "This support layer reports why collapse-learned landslide strategies are withheld. It does not assign a Level 2 or Level 3 attention class, estimate collapse probability or prescribe monitoring or design measures.",
    contract: {
      activation_mode: contract.activation_mode || "abstention_only",
      cohort_activation_minimum: contract.cohort_activation_minimum || null,
      expert_validation_required: contract.expert_validation_required !== false,
      process_activation_minimum: contract.process_activation_minimum || null,
      status: contract.status || "missing",
      version: contract.version || null,
    },
    engine_version: LANDSLIDE_SUPPORT_ENGINE_VERSION,
    evidence,
    final_priority_index_contribution: "none",
    official_exposure: officialExposure,
    required_site_assessment_dimensions:
      contract.required_site_assessment_dimensions || [],
    status: "abstained",
    strategies: [],
  };
}
