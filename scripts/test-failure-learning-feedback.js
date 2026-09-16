import assert from "node:assert/strict";
import fs from "node:fs/promises";

import {
  buildFailureLearningReadiness,
  failureLearningFingerprints,
  validateFailureLearningFeedback,
} from "../server/failureLearningFeedbackStore.js";

const valid = {
  analogueEventId: "IT20.01.01",
  comparisonSnapshot: { hydraulic: { highest_class_exact: true } },
  consentForModelDevelopment: true,
  engineVersion: "arcus-mitigation-intelligence-v4",
  note: "The hydraulic context and structural profile are comparable.",
  projectBridgeProfile: { material_type: "concrete" },
  projectLocation: { latitude: 44.1, longitude: 9.2, province: "Genova" },
  queryId: "req-12345678",
  rating: "useful",
  reasonCodes: ["hazard_comparable"],
  retrievalRank: 1,
  targetHazardSnapshot: { hydraulic: { highestClass: "P2" } },
};

const result = validateFailureLearningFeedback(valid);
assert.equal(result.rating, "useful");
assert.equal(result.consentForModelDevelopment, true);
assert.equal(result.projectLocation.province, "Genova");
const fingerprints = failureLearningFingerprints(result);
const reorderedFingerprints = failureLearningFingerprints({
  ...result,
  projectBridgeProfile: { material_type: "concrete" },
  targetHazardSnapshot: { hydraulic: { highestClass: "P2" } },
});
assert.deepEqual(fingerprints, reorderedFingerprints);
assert.match(fingerprints.targetContextFingerprint, /^target-[a-f0-9]{24}$/);
assert.match(fingerprints.analoguePairFingerprint, /^pair-[a-f0-9]{24}$/);
assert.throws(
  () => validateFailureLearningFeedback({ ...valid, consentForModelDevelopment: false }),
  /model_development_consent_required/
);

const readiness = buildFailureLearningReadiness([
  {
    ...result,
    createdAt: "2026-09-01T10:00:00.000Z",
    reviewerUsername: "expert-a@example.test",
    supersededAt: null,
  },
  {
    ...result,
    createdAt: "2026-09-02T10:00:00.000Z",
    reviewerUsername: "expert-b@example.test",
    supersededAt: null,
  },
  {
    ...result,
    createdAt: "2026-08-01T10:00:00.000Z",
    reviewerUsername: "expert-a@example.test",
    supersededAt: "2026-09-01T10:00:00.000Z",
  },
  {
    ...result,
    createdAt: "2026-08-15T10:00:00.000Z",
    queryId: "legacy-duplicate-query",
    reviewerUsername: "expert-a@example.test",
    supersededAt: null,
  },
]);
assert.equal(readiness.status, "not_ready_for_model_training");
assert.equal(readiness.observed.activeJudgements, 2);
assert.equal(readiness.observed.uniqueReviewers, 2);
assert.equal(readiness.observed.multiRatedPairs, 1);
assert.equal(readiness.agreement.exactPairwiseAgreement, 1);
assert.equal(readiness.supersededJudgements, 1);
assert.equal(readiness.unresolvedDuplicateActiveJudgements, 1);
assert.throws(
  () => validateFailureLearningFeedback({ ...valid, reasonCodes: [] }),
  /analogue_feedback_reason_required/
);
assert.throws(
  () => validateFailureLearningFeedback({ ...valid, note: "too short", rating: "not_useful" }),
  /analogue_feedback_note_required/
);
assert.throws(
  () => validateFailureLearningFeedback({ ...valid, analogueEventId: "unknown" }),
  /valid_analogue_event_id_required/
);

const page = await fs.readFile(
  new URL("../src/pages/CollapseIntelligencePage.jsx", import.meta.url),
  "utf8"
);
const adminPage = await fs.readFile(
  new URL("../src/pages/AdminPage.jsx", import.meta.url),
  "utf8"
);
assert.match(page, /Giudizio esperto sull’analogo/);
assert.match(page, /non per decisioni automatiche/);
assert.match(page, /submitFailureLearningFeedback/);
assert.match(adminPage, /CALIBRATION READINESS/);
assert.match(adminPage, /not_ready_for_model_training|learningReadiness\.status/);
assert.match(adminPage, /Esporta dataset pseudonimizzato/);

console.log("Failure Learning expert-feedback tests passed.");
