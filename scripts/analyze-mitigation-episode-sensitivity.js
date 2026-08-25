import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  buildMitigationIntelligence,
} from "../server/mitigationIntelligenceService.js";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function readCollection(relativePath, key) {
  const resource = JSON.parse(
    fs.readFileSync(path.join(ROOT, relativePath), "utf8")
  );

  return Array.isArray(resource) ? resource : resource[key] || [];
}

const events = readCollection(
  "private-data/professional/professional-events.json",
  "events"
);
const sources = readCollection(
  "private-data/professional/professional-sources.json",
  "sources"
);
const signatures = readCollection(
  "private-data/professional/collapse-intelligence/collapse-hazard-signatures.json",
  "signatures"
);
const historicalSignatures = readCollection(
  "private-data/professional/collapse-intelligence/historical-hazard-signatures.json",
  "signatures"
);

const SCENARIOS = Object.freeze([
  {
    hydraulic: { highest_class: "P1", matched_classes: ["P1"] },
    id: "hydraulic_p1_archetype",
    pga_p50_g: 0.1053,
  },
  {
    hydraulic: {
      highest_class: "P2",
      matched_classes: ["P1", "P2"],
    },
    id: "hydraulic_p2_archetype",
    pga_p50_g: 0.104,
  },
  {
    hydraulic: {
      highest_class: "P3",
      matched_classes: ["P1", "P2", "P3"],
    },
    id: "hydraulic_p3_archetype",
    pga_p50_g: 0.1047,
  },
]);

function payloadFor(scenario, perturbation = {}) {
  return {
    official_exposure: {
      hydraulic: {
        ...scenario.hydraulic,
        ...(perturbation.hydraulic || {}),
        status: "available",
      },
      landslide: {
        attention_area: false,
        highest_hazard_class: null,
        matched_hazard_classes: [],
        status: "no_intersection",
        ...(perturbation.landslide || {}),
      },
      seismic: {
        pga_p50_g:
          scenario.pga_p50_g + (perturbation.pga_delta_g || 0),
        status: "available",
      },
    },
    project_context: "bridge",
    project_location: {
      derived_province: "National sensitivity archetype",
      latitude: 42,
      longitude: 12,
      validated: true,
    },
  };
}

function build(
  scenario,
  candidateEvents = events,
  { perturbation = {} } = {}
) {
  return buildMitigationIntelligence({
    events: candidateEvents,
    historicalSignatures,
    payload: payloadFor(scenario, perturbation),
    signatures,
    sources,
  });
}

function jaccard(left, right) {
  const leftSet = new Set(left);
  const rightSet = new Set(right);
  const union = new Set([...leftSet, ...rightSet]);
  const intersection = [...leftSet].filter((value) =>
    rightSet.has(value)
  );

  return union.size
    ? Number((intersection.length / union.size).toFixed(3))
    : 1;
}

function strategyProcesses(intelligence) {
  return intelligence.strategies
    .map((strategy) => strategy.process)
    .sort((left, right) => left.localeCompare(right));
}

function analogueIds(intelligence) {
  return intelligence.evidence_cohort.analogue_retrieval.analogues.map(
    (analogue) => analogue.event.event_id
  );
}

function processSummary(process) {
  return {
    cases: process.raw_count,
    effective_cases: process.effective_evidence_count,
    episode_effective_evidence:
      process.episode_effective_evidence_count,
    episodes: process.episode_count,
    process: process.process,
    strength: process.evidence_strength,
  };
}

function analyzeScenario(scenario) {
  const baseline = build(scenario);
  const baselineAnalogues = analogueIds(baseline);
  const baselineStrategies = strategyProcesses(baseline);
  const evidenceEventIds = baseline.evidence_cohort.event_ids;
  let stableStatus = 0;
  let stableStrategies = 0;

  const leaveOneOut = evidenceEventIds.map((eventId) => {
    const candidateEvents = events.map((event) => {
      if (event.event_id !== eventId) {
        return event;
      }

      const clone = structuredClone(event);
      delete clone.hydraulic_intelligence;
      return clone;
    });
    const candidate = build(scenario, candidateEvents);
    const candidateStrategies = strategyProcesses(candidate);

    assert.deepEqual(
      analogueIds(candidate),
      baselineAnalogues,
      `${scenario.id}: retrieval must not depend on hydraulic outcome fields`
    );

    const statusStable = candidate.status === baseline.status;
    const strategiesStable =
      JSON.stringify(candidateStrategies) ===
      JSON.stringify(baselineStrategies);

    stableStatus += Number(statusStable);
    stableStrategies += Number(strategiesStable);

    return {
      event_id: eventId,
      status: candidate.status,
      status_stable: statusStable,
      strategies: candidateStrategies,
      strategies_stable: strategiesStable,
    };
  });
  const denominator = Math.max(1, leaveOneOut.length);
  const evidence = baseline.evidence_cohort;
  const stressCases = [
    {
      id: "pga_minus_0_02g",
      perturbation: { pga_delta_g: -0.02 },
    },
    {
      id: "pga_plus_0_02g",
      perturbation: { pga_delta_g: 0.02 },
    },
    {
      id: "landslide_p1_context",
      perturbation: {
        landslide: {
          attention_area: false,
          highest_hazard_class: "P1",
          matched_hazard_classes: ["P1"],
          status: "available",
        },
      },
    },
  ].map((variant) => {
    const candidate = build(scenario, events, variant);
    const candidateAnalogueIds = analogueIds(candidate);
    const candidateStrategies = strategyProcesses(candidate);

    return {
      analogue_count: candidateAnalogueIds.length,
      analogue_jaccard_vs_baseline: jaccard(
        candidateAnalogueIds,
        baselineAnalogues
      ),
      episode_effective_evidence:
        candidate.evidence_cohort.episode_effective_evidence_count,
      hydraulic_cases: candidate.evidence_cohort.event_count,
      id: variant.id,
      independent_episodes:
        candidate.evidence_cohort.episode_count,
      status: candidate.status,
      status_stable: candidate.status === baseline.status,
      strategies: candidateStrategies,
      strategies_stable:
        JSON.stringify(candidateStrategies) ===
        JSON.stringify(baselineStrategies),
    };
  });
  const signatureCases = stressCases;
  const retrievalRobustness =
    evidence.retrieval_robustness || {};

  return {
    baseline: {
      analogue_count:
        evidence.analogue_retrieval.analogues.length,
      compression_ratio:
        evidence.effective_evidence_count > 0
          ? Number((
              evidence.episode_effective_evidence_count /
              evidence.effective_evidence_count
            ).toFixed(3))
          : null,
      effective_cases: evidence.effective_evidence_count,
      episode_effective_evidence:
        evidence.episode_effective_evidence_count,
      hydraulic_cases: evidence.event_count,
      independent_episodes: evidence.episode_count,
      processes: evidence.processes.map(processSummary),
      status: baseline.status,
      strategies: baselineStrategies,
      supported_episodes: evidence.supported_episode_count,
    },
    leave_one_out: {
      cases: leaveOneOut,
      evidence_cases_tested: leaveOneOut.length,
      retrieval_stability_ratio: 1,
      status_stability_ratio: Number(
        (stableStatus / denominator).toFixed(3)
      ),
      strategy_stability_ratio: Number(
        (stableStrategies / denominator).toFixed(3)
      ),
    },
    stress: {
      cases: stressCases,
      retrieval_window_consensus: retrievalRobustness,
      signature_status_stability_ratio: Number((
        signatureCases.filter((item) => item.status_stable).length /
        signatureCases.length
      ).toFixed(3)),
      signature_strategy_stability_ratio: Number((
        signatureCases.filter((item) => item.strategies_stable).length /
        signatureCases.length
      ).toFixed(3)),
    },
    scenario: scenario.id,
  };
}

const results = SCENARIOS.map(analyzeScenario);

console.log(JSON.stringify({
  caveat:
    "These are deterministic current-signature archetypes for sensitivity analysis, not new live ISPRA point observations and not a collapse-probability model.",
  engine_version: results[0]?.baseline ? "arcus-mitigation-intelligence-v4" : null,
  final_priority_index_contribution: "none",
  results,
}, null, 2));
