export const SEISMIC_SUPPORT_ENGINE_VERSION = "arcus-seismic-support-v1";

function number(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function exposureState(exposure = {}) {
  const pga = Number(exposure.pga_p50_g);
  const active = exposure.status === "available" && Number.isFinite(pga) && pga >= 0;

  return {
    active,
    model: exposure.model || null,
    pga_p50_g: active ? pga : null,
    provider_status: exposure.status || "not_queried",
    sampling_method: exposure.sampling_method || null,
  };
}

function summarizeEligibleOutcomes(events = [], contract = {}) {
  const eligible = events.filter(
    (event) => event.seismic_intelligence?.learning_eligibility === "eligible"
  );
  const episodes = new Map();
  const processes = new Map();

  eligible.forEach((event) => {
    const intelligence = event.seismic_intelligence;
    const episodeId = intelligence.episode_id;
    const processName = intelligence.failure_process || "unspecified";
    const weight = number(contract.evidence_weights?.[intelligence.evidence_level]);

    if (!episodeId) {
      return;
    }

    const priorEpisode = episodes.get(episodeId);
    episodes.set(episodeId, {
      effective_evidence: Math.max(priorEpisode?.effective_evidence || 0, weight),
      episode_id: episodeId,
      event_ids: [...new Set([...(priorEpisode?.event_ids || []), event.event_id])],
    });

    const process = processes.get(processName) || {
      effective_evidence: 0,
      episode_effective_evidence: 0,
      episode_ids: new Set(),
      event_ids: [],
      failure_process: processName,
      raw_cases: 0,
    };
    process.raw_cases += 1;
    process.effective_evidence += weight;
    process.event_ids.push(event.event_id);
    if (!process.episode_ids.has(episodeId)) {
      process.episode_ids.add(episodeId);
      process.episode_effective_evidence += weight;
    }
    processes.set(processName, process);
  });

  const processMinimum = contract.process_activation_minimum || {};
  const processSupport = [...processes.values()].map((process) => ({
    effective_evidence: Number(process.effective_evidence.toFixed(2)),
    episode_effective_evidence: Number(process.episode_effective_evidence.toFixed(2)),
    failure_process: process.failure_process,
    independent_episodes: process.episode_ids.size,
    raw_cases: process.raw_cases,
    status:
      process.raw_cases >= number(processMinimum.raw_cases) &&
      process.episode_ids.size >= number(processMinimum.independent_episodes) &&
      process.episode_effective_evidence >= number(processMinimum.episode_effective_evidence)
        ? "threshold_observed_expert_review_still_required"
        : "insufficient",
  }));
  const episodeEffectiveEvidence = [...episodes.values()].reduce(
    (total, episode) => total + episode.effective_evidence,
    0
  );

  return {
    effective_evidence: Number(eligible.reduce(
      (total, event) => total + number(
        contract.evidence_weights?.[event.seismic_intelligence?.evidence_level]
      ),
      0
    ).toFixed(2)),
    eligible_cases: eligible.length,
    episode_effective_evidence: Number(episodeEffectiveEvidence.toFixed(2)),
    independent_episodes: episodes.size,
    process_support: processSupport,
    registered_seismic_cases: events.filter(
      (event) => event.seismic_intelligence
    ).length,
  };
}

export function buildSeismicMitigationSupport({
  contract = {},
  events = [],
  exposure = {},
} = {}) {
  const officialExposure = exposureState(exposure);
  const evidence = summarizeEligibleOutcomes(events, contract);
  const minimum = contract.cohort_activation_minimum || {};
  const thresholdObserved =
    evidence.independent_episodes >= number(minimum.independent_episodes) &&
    evidence.episode_effective_evidence >= number(minimum.episode_effective_evidence);
  const expertValidated = contract.status === "expert_validated" &&
    contract.expert_validation_required === false;
  const abstentionReasons = [];

  if (!officialExposure.active) {
    abstentionReasons.push(
      officialExposure.provider_status === "outside_coverage"
        ? "official_seismic_point_outside_model_coverage"
        : "official_seismic_exposure_unavailable"
    );
  }
  if (officialExposure.active && !thresholdObserved) {
    abstentionReasons.push("insufficient_independent_seismic_episode_evidence");
  }
  if (officialExposure.active && !expertValidated) {
    abstentionReasons.push("seismic_support_contract_not_expert_validated");
  }

  return {
    abstention_reasons: abstentionReasons,
    caveat:
      "This layer explains why collapse-learned seismic strategies are withheld. It does not estimate collapse probability, assign a seismic attention class, prescribe retrofit priorities or modify the Final Priority Index.",
    contract: {
      activation_mode: contract.activation_mode || "abstention_only",
      cohort_activation_minimum: contract.cohort_activation_minimum || null,
      expert_validation_required: contract.expert_validation_required !== false,
      process_activation_minimum: contract.process_activation_minimum || null,
      status: contract.status || "missing",
      version: contract.version || null,
    },
    engine_version: SEISMIC_SUPPORT_ENGINE_VERSION,
    evidence,
    final_priority_index_contribution: "none",
    official_exposure: officialExposure,
    required_site_assessment_dimensions:
      contract.required_site_assessment_dimensions || [],
    status: "abstained",
    strategies: [],
  };
}
