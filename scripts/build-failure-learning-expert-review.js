import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  buildHazardGatedCollapseIntelligence,
} from "./analyze-hazard-gated-collapse-intelligence.js";
import {
  buildFailureLearningExpertReview,
  buildFailureLearningResponseTemplate,
} from "./lib/failure-learning-expert-review.js";
import { readProfessionalDataset } from "./lib/professional-dataset.js";

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
function rows(resource, field) {
  return Array.isArray(resource) ? resource : resource?.[field] || [];
}

function writeJsonAtomic(filePath, value) {
  const temporaryPath = `${filePath}.tmp`;

  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(temporaryPath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
  fs.renameSync(temporaryPath, filePath);
}

export function buildAndWriteFailureLearningExpertReview({
  generatedAt = new Date().toISOString(),
  outputDir = OUTPUT_DIR,
  refreshRawPackage = true,
} = {}) {
  const { events, sources } = readProfessionalDataset(ROOT);
  const rawResult = refreshRawPackage
    ? buildHazardGatedCollapseIntelligence()
    : null;
  const rawPackage = rawResult?.expertPackage || readJson(
    path.join(OUTPUT_DIR, "expert-review-package.json"),
    { cases: [] }
  );
  const signaturePayload = readJson(
    path.join(OUTPUT_DIR, "collapse-hazard-signatures.json"),
    { signatures: [] }
  );
  const historicalPayload = readJson(
    path.join(OUTPUT_DIR, "historical-hazard-signatures.json"),
    { signatures: [] }
  );
  const knowledgeBase = readJson(
    path.join(
      ROOT,
      "config",
      "collapse-intelligence",
      "mitigation-knowledge-base.json"
    ),
    { entries: [] }
  );
  const result = buildFailureLearningExpertReview({
    events,
    generatedAt,
    historicalSignatures: rows(historicalPayload, "signatures"),
    knowledgeBase,
    rawPackage,
    signatures: rows(signaturePayload, "signatures"),
    sources,
  });
  const responseTemplate = buildFailureLearningResponseTemplate(
    result.reviewerPackage
  );
  const paths = {
    audit: path.join(outputDir, "failure-learning-expert-review-audit.json"),
    key: path.join(outputDir, "failure-learning-expert-review-key.json"),
    package: path.join(outputDir, "failure-learning-expert-review-package.json"),
    responseTemplate: path.join(
      outputDir,
      "failure-learning-expert-review-response-template.json"
    ),
  };

  writeJsonAtomic(paths.audit, result.audit);
  writeJsonAtomic(paths.key, result.key);
  writeJsonAtomic(paths.package, result.reviewerPackage);
  writeJsonAtomic(paths.responseTemplate, responseTemplate);

  return {
    ...result,
    paths,
    responseTemplate,
  };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const result = buildAndWriteFailureLearningExpertReview();

  console.log(JSON.stringify({
    anti_unblinding_audit: result.audit,
    matrix_cases:
      result.reviewerPackage.arms.matrix_appropriateness.cases.length,
    output: result.paths.package,
    retrieval_cases:
      result.reviewerPackage.arms.retrieval_preference.cases.length,
    status: result.reviewerPackage.status,
  }, null, 2));
}
