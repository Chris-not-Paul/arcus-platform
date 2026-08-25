import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  auditSeismicEvidenceCandidates,
  evaluateSeismicEvidenceCandidate,
} from "../src/utils/seismicEvidenceIntake.js";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const contract = JSON.parse(
  fs.readFileSync(
    path.join(
      ROOT,
      "config",
      "collapse-intelligence",
      "seismic-evidence-intake-contract.json"
    ),
    "utf8"
  )
);

function completeCandidate() {
  return {
    bridge: {
      identity_reference: "https://authority.example/bridge/42",
      identity_status: "authenticated_asset",
      name: "Controlled test bridge",
    },
    candidate_id: "EQ-CANDIDATE-TEST-001",
    event: {
      date: "2016-08-24",
      earthquake_episode_id: "EQ-2016-08-24-CENTRAL-ITALY",
      episode_independence_basis: "Distinct dated earthquake episode",
    },
    evidence_references: [
      {
        case_specific: true,
        role: "Official/Technical",
        supports: ["bridge identity", "collapse outcome", "failure mechanism"],
        title: "Controlled technical investigation",
        url: "https://authority.example/report/42",
      },
    ],
    historical_ground_motion: { status: "not_available" },
    location: { country: "Italy", latitude: 42.7, longitude: 13.2 },
    mechanism: {
      component_involved: "bearings_and_superstructure",
      evidence_level: "documented",
      failure_process: "unseating",
      interaction_type: "bearing_displacement_and_loss_of_support",
      status: "coherent",
      trigger: "seismic_shaking",
    },
    outcome: { status: "confirmed_partial_bridge_collapse" },
    reviews: {
      geotechnical_engineer: { reviewer: null, status: "not_started" },
      registry_editor: { reviewer: null, status: "not_started" },
      structural_engineer: { reviewer: null, status: "not_started" },
    },
  };
}

const incomplete = evaluateSeismicEvidenceCandidate({}, contract);
assert.equal(incomplete.admission_status, "blocked_evidence_gaps");
assert.equal(incomplete.production_effect, "none");
assert.equal(incomplete.blocking_gaps.some((gap) => gap.code === "missing_candidate_id"), true);

const complete = completeCandidate();
const expertReady = evaluateSeismicEvidenceCandidate(complete, contract);
assert.equal(expertReady.admission_status, "ready_for_expert_review");
assert.equal(expertReady.scientific_evidence_complete, true);
assert.deepEqual(expertReady.expert_reviews.pending, contract.required_reviews);
assert.equal(expertReady.ready_for_registry_review, false);

const currentHazardLeak = structuredClone(complete);
currentHazardLeak.historical_ground_motion = {
  measurement_type: "PGA",
  provider: "ingv-mps04-grid-v1",
  source_url: "https://example.invalid/current-grid",
  status: "source_backed",
};
const leaked = evaluateSeismicEvidenceCandidate(currentHazardLeak, contract);
assert.equal(
  leaked.blocking_gaps.some(
    (gap) => gap.code === "current_reference_hazard_used_as_historical_measurement"
  ),
  true
);

const reviewed = structuredClone(complete);
contract.required_reviews.forEach((review) => {
  reviewed.reviews[review] = { reviewer: `reviewer-${review}`, status: "approved" };
});
const registryReady = evaluateSeismicEvidenceCandidate(reviewed, contract);
assert.equal(registryReady.admission_status, "ready_for_registry_review");
assert.equal(registryReady.ready_for_registry_review, true);
assert.equal(registryReady.production_effect, "none");

const duplicateReport = auditSeismicEvidenceCandidates(
  [reviewed, structuredClone(reviewed)],
  contract
);
assert.deepEqual(duplicateReport.duplicate_candidate_ids, [reviewed.candidate_id]);
assert.equal(duplicateReport.counts.blocked, 2);
assert.equal(duplicateReport.production_effect, "none");

const emptyReport = auditSeismicEvidenceCandidates([], contract);
assert.equal(emptyReport.decision, "no_candidates_supplied");
assert.equal(emptyReport.counts.candidate_count, 0);

console.log(JSON.stringify({
  checks: [
    "incomplete-candidate-blocked",
    "complete-evidence-requires-expert-review",
    "current-mps04-historical-leak-blocked",
    "three-reviews-required-before-registry-review",
    "duplicate-candidate-id-blocked",
    "no-automatic-production-effect",
  ],
  contract_version: contract.version,
  ok: true,
}, null, 2));
