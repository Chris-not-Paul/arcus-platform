import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  auditSeismicMitigationReadiness,
  isSeismicOutcomeCandidate,
} from "./audit-seismic-mitigation-readiness.js";
import {
  SEISMIC_MATCHER_BLOCKED_FIELDS,
  enrichEventsWithSeismicIntelligence,
  summarizeSeismicRegistry,
  validateSeismicOutcomeRegistry,
} from "../src/utils/seismicIntelligence.js";
import {
  buildSeismicMitigationSupport,
} from "../src/utils/seismicMitigationSupport.js";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function readJson(relativePath) {
  return JSON.parse(
    fs.readFileSync(path.join(ROOT, relativePath), "utf8").replace(/^\uFEFF/, "")
  );
}

const registry = readJson("config/collapse-intelligence/seismic-outcome-registry.json");
const eventPayload = readJson("private-data/professional/professional-events.json");
const sourcePayload = readJson("private-data/professional/professional-sources.json");
const signaturePayload = readJson(
  "private-data/professional/collapse-intelligence/collapse-hazard-signatures.json"
);
const knowledgeBase = readJson(
  "config/collapse-intelligence/mitigation-knowledge-base.json"
);
const events = eventPayload.events || [];
const sources = sourcePayload.sources || [];
const signatures = signaturePayload.signatures || [];

const validation = validateSeismicOutcomeRegistry(registry);
assert.equal(validation.ok, true);
assert.equal(validation.registered_cases, 3);

const earthquakeEvents = events.filter(isSeismicOutcomeCandidate);
assert.equal(earthquakeEvents.length, 3);
assert.deepEqual(
  earthquakeEvents.map((event) => event.event_id).sort(),
  registry.cases.map((entry) => entry.event_id).sort()
);

const summary = summarizeSeismicRegistry(registry);
assert.equal(summary.eligible_cases, 1);
assert.equal(summary.eligible_episodes, 1);
assert.equal(summary.eligible_effective_evidence, 1);
assert.equal(summary.multicausal_or_disputed_cases, 1);
assert.equal(summary.excluded_insufficient_evidence_cases, 1);

const enriched = enrichEventsWithSeismicIntelligence(events, registry);
const fossa = enriched.find((event) => event.event_id === "B09.04.01");
const onna = enriched.find((event) => event.event_id === "B09.04.02");
const scoppito = enriched.find((event) => event.event_id === "B09.04.03");
assert.equal(fossa.seismic_intelligence.learning_eligibility, "excluded_multicausal_mechanism");
assert.equal(onna.seismic_intelligence.learning_eligibility, "eligible");
assert.equal(onna.seismic_intelligence.episode_id, "EQ-2009-04-06-LAQUILA");
assert.equal(scoppito.seismic_intelligence.failure_process, null);
assert.equal(
  enriched.find((event) => event.event_id !== "B09.04.01" &&
    event.event_id !== "B09.04.02" && event.event_id !== "B09.04.03")
    .seismic_intelligence,
  null
);

const audit = auditSeismicMitigationReadiness({
  events,
  knowledgeBase,
  registry,
  signatures,
  sources,
});
assert.equal(audit.decision, "not_ready_for_collapse_learned_seismic_strategies");
assert.equal(audit.coverage.candidate_cases, 3);
assert.equal(audit.coverage.eligible_cases, 1);
assert.equal(audit.coverage.eligible_independent_episodes, 1);
assert.equal(audit.coverage.episode_effective_evidence, 1);
assert.equal(audit.coverage.current_mps04_available, 3);
assert.equal(audit.coverage.single_historical_episode, true);
assert.equal(audit.gate.blocked_now.some((item) => item.includes("independent")), true);

const support = buildSeismicMitigationSupport({
  contract: registry.production_support_contract,
  events: enriched,
  exposure: {
    model: "MPS04",
    pga_p50_g: 0.145,
    sampling_method: "nearest_grid_node",
    status: "available",
  },
});
assert.equal(support.status, "abstained");
assert.equal(support.strategies.length, 0);
assert.equal(support.final_priority_index_contribution, "none");
assert.equal(support.evidence.registered_seismic_cases, 3);
assert.equal(support.evidence.eligible_cases, 1);
assert.equal(support.evidence.independent_episodes, 1);
assert.equal(support.evidence.episode_effective_evidence, 1);
assert.equal(
  support.abstention_reasons.includes(
    "insufficient_independent_seismic_episode_evidence"
  ),
  true
);
assert.equal(
  support.abstention_reasons.includes(
    "seismic_support_contract_not_expert_validated"
  ),
  true
);

const missingExposure = buildSeismicMitigationSupport({
  contract: registry.production_support_contract,
  events: enriched,
  exposure: { status: "outside_coverage" },
});
assert.deepEqual(missingExposure.strategies, []);
assert.equal(
  missingExposure.abstention_reasons.includes(
    "official_seismic_point_outside_model_coverage"
  ),
  true
);

const forcedExpertContract = {
  ...registry.production_support_contract,
  cohort_activation_minimum: {
    episode_effective_evidence: 1,
    independent_episodes: 1,
  },
  expert_validation_required: false,
  status: "expert_validated",
};
const stillAbstained = buildSeismicMitigationSupport({
  contract: forcedExpertContract,
  events: enriched,
  exposure: { model: "MPS04", pga_p50_g: 0.2, status: "available" },
});
assert.equal(stillAbstained.status, "abstained");
assert.deepEqual(stillAbstained.strategies, []);

const invalidRegistry = structuredClone(registry);
invalidRegistry.cases.push(structuredClone(invalidRegistry.cases[0]));
assert.equal(validateSeismicOutcomeRegistry(invalidRegistry).ok, false);
assert.equal(
  SEISMIC_MATCHER_BLOCKED_FIELDS.includes("seismic_intelligence.failure_process"),
  true
);

console.log(JSON.stringify({
  audit_decision: audit.decision,
  eligible_cases: summary.eligible_cases,
  independent_episodes: summary.eligible_episodes,
  registered_cases: summary.registered_cases,
  support_status: support.status,
  tests: "passed",
}, null, 2));
