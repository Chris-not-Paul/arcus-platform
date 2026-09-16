import {
  getFailureLearningReadinessForAdmin,
} from "../server/failureLearningFeedbackStore.js";

const readiness = await getFailureLearningReadinessForAdmin();

console.log(JSON.stringify({
  agreement: readiness.agreement,
  gates: readiness.gates,
  limitations: readiness.limitations,
  observed: readiness.observed,
  schema_version: readiness.schemaVersion,
  status: readiness.status,
  superseded_judgements: readiness.supersededJudgements,
  unresolved_duplicate_active_judgements:
    readiness.unresolvedDuplicateActiveJudgements,
}, null, 2));
