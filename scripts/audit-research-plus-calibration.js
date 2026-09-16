import assert from "node:assert/strict";
import fs from "node:fs";

import {
  ANALOGUE_FEATURES,
  buildAnalogueSensitivity,
  buildEpisodeCalibration,
  buildReferenceHydraulicEpisodes,
  buildRobustnessScenarios,
  retrieveAnalogues,
} from "../src/utils/researchWorkbench.js";

function collection(path, key) {
  const resource = JSON.parse(fs.readFileSync(path, "utf8"));
  return Array.isArray(resource) ? resource : resource[key] || [];
}

const events = collection("private-data/professional/professional-events.json", "events");
const sources = collection("private-data/professional/professional-sources.json", "sources");
const hydraulicEvents = events.filter((event) => event.hydraulic_intelligence);
const calibration = buildEpisodeCalibration(hydraulicEvents);
const reference = buildReferenceHydraulicEpisodes(hydraulicEvents);
const analogueRuns = hydraulicEvents.map((target) => {
  const retrievalOptions = {
    eventToEpisode: reference.eventToEpisode,
    excludeSameEpisode: true,
    features: ANALOGUE_FEATURES,
    minimumComparableFeatures: 2,
  };
  const results = retrieveAnalogues(target, hydraulicEvents, retrievalOptions);
  const sensitivity = buildAnalogueSensitivity(target, hydraulicEvents, {
    ...retrievalOptions,
    topK: 5,
  });
  return {
    event_id: target.research_event_id || target.event_id,
    mean_top_five_retention_percent: sensitivity.meanRetention,
    minimum_top_five_retention_percent: sensitivity.minimumRetention,
    retrieved_candidate_count: results.length,
    top_candidate_coverage_percent: results[0]?.coverage ?? null,
    top_candidate_equivalent_count: results[0]?.equivalentCandidateCount ?? null,
    top_candidate_similarity_percent: results[0]?.score ?? null,
  };
});
const robustness = buildRobustnessScenarios(hydraulicEvents, sources, reference);
const mean = (values) => values.length
  ? Math.round((values.reduce((total, value) => total + value, 0) / values.length) * 10) / 10
  : null;

assert.equal(hydraulicEvents.length, 211);
assert.equal(reference.episodes.length, 99);
assert.equal(calibration.rows.length, 16);
assert.equal(analogueRuns.length, hydraulicEvents.length);
assert.ok(analogueRuns.every((run) => run.retrieved_candidate_count > 0));

console.log(JSON.stringify({
  audit_version: "arcus-research-plus-calibration-audit-v1",
  boundary: [
    "Concordance is measured against the current controlled rule-based registry, not meteorological ground truth.",
    "Analogue stability measures top-k retention under feature removal, not predictive performance.",
    "No result estimates probability, safety, causal effect or population risk.",
  ],
  checks: {
    all_hydraulic_events_audited: true,
    deterministic_episode_sweep_completed: true,
    same_episode_analogues_excluded: true,
    leave_one_feature_out_completed: true,
  },
  episode_calibration: {
    best_pairwise_concordance: calibration.best,
    controlled_reference_episode_count: reference.episodes.length,
    current_ui_reference_setting: calibration.rows.find(
      (row) => row.maximumGapDays === 2 && row.maximumDistanceKm === 150
    ),
    parameter_grid: calibration.rows,
  },
  analogue_sensitivity: {
    audited_index_cases: analogueRuns.length,
    mean_of_case_mean_retention_percent: mean(
      analogueRuns.map((run) => run.mean_top_five_retention_percent)
    ),
    mean_top_candidate_coverage_percent: mean(
      analogueRuns.map((run) => run.top_candidate_coverage_percent).filter(Number.isFinite)
    ),
    mean_top_candidate_equivalent_count: mean(
      analogueRuns.map((run) => run.top_candidate_equivalent_count).filter(Number.isFinite)
    ),
    minimum_case_mean_retention_percent: Math.min(
      ...analogueRuns.map((run) => run.mean_top_five_retention_percent)
    ),
    most_sensitive_cases: analogueRuns
      .slice()
      .sort((left, right) =>
        left.mean_top_five_retention_percent - right.mean_top_five_retention_percent ||
        left.event_id.localeCompare(right.event_id)
      )
      .slice(0, 10),
  },
  robustness: {
    leading_process: robustness.baseTop,
    leave_one_episode_out_stability_percent: robustness.leaveOneEpisodeOutStability,
    scenarios: robustness.scenarios,
  },
  status: "validated_as_deterministic_research_prototype_with_methodological_limitations",
}, null, 2));
