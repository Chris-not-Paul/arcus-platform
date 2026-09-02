import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  assessFailureLearningExpertReview,
} from "./lib/failure-learning-expert-review.js";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUTPUT_DIR = path.join(
  ROOT,
  "private-data",
  "professional",
  "collapse-intelligence"
);

function readJson(filePath, fallback) {
  if (!fs.existsSync(filePath)) {
    return fallback;
  }

  return JSON.parse(fs.readFileSync(filePath, "utf8").replace(/^\uFEFF/, ""));
}
function writeJsonAtomic(filePath, value) {
  const temporaryPath = `${filePath}.tmp`;

  fs.writeFileSync(temporaryPath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
  fs.renameSync(temporaryPath, filePath);
}

export function assessAndWriteFailureLearningExpertReview({
  outputDir = OUTPUT_DIR,
  responsesPath = path.join(
    OUTPUT_DIR,
    "failure-learning-expert-review-responses.json"
  ),
} = {}) {
  const reviewerPackage = readJson(
    path.join(outputDir, "failure-learning-expert-review-package.json"),
    null
  );
  const key = readJson(
    path.join(outputDir, "failure-learning-expert-review-key.json"),
    null
  );
  const responsePayload = readJson(responsesPath, { responses: [] });

  if (!reviewerPackage || !key) {
    throw new Error(
      "failure_learning_expert_review_package_required_run_build_first"
    );
  }

  const assessment = assessFailureLearningExpertReview({
    key,
    responses: responsePayload.responses || [],
    reviewerPackage,
  });
  const outputPath = path.join(
    outputDir,
    "failure-learning-expert-review-assessment.json"
  );

  writeJsonAtomic(outputPath, {
    ...assessment,
    assessed_at: new Date().toISOString(),
    expert_responses_received: (responsePayload.responses || []).length,
    version: reviewerPackage.version,
  });

  return {
    assessment,
    outputPath,
  };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const result = assessAndWriteFailureLearningExpertReview();

  console.log(JSON.stringify({
    decision: result.assessment.decision,
    governance_errors: result.assessment.governance_errors,
    output: result.outputPath,
    production_approval: result.assessment.production_approval || false,
  }, null, 2));
}
