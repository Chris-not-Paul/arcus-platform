import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  buildFailureLearningBenchmark,
} from "./lib/failure-learning-benchmark.js";
import { readProfessionalDataset } from "./lib/professional-dataset.js";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const SOURCE_DIR = path.join(
  ROOT,
  "private-data",
  "professional",
  "collapse-intelligence"
);
const OUTPUT_DIR = path.join(SOURCE_DIR, "failure-learning-benchmark-v1");

function readJson(filePath, fallback) {
  if (!fs.existsSync(filePath)) return fallback;
  return JSON.parse(fs.readFileSync(filePath, "utf8").replace(/^\uFEFF/, ""));
}

function rows(resource, field) {
  return Array.isArray(resource) ? resource : resource?.[field] || [];
}

function checksum(filePath) {
  return crypto.createHash("sha256")
    .update(fs.readFileSync(filePath))
    .digest("hex");
}

function writeJsonAtomic(filePath, value) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  const temporaryPath = `${filePath}.${crypto.randomUUID()}.tmp`;
  fs.writeFileSync(temporaryPath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
  try {
    fs.renameSync(temporaryPath, filePath);
  } catch (error) {
    if (!["EBUSY", "EEXIST", "EPERM"].includes(error.code)) throw error;
    fs.rmSync(filePath, { force: true });
    fs.renameSync(temporaryPath, filePath);
  }
}

export function buildAndWriteFailureLearningBenchmark({
  generatedAt = new Date().toISOString(),
  outputDir = OUTPUT_DIR,
} = {}) {
  const eventPath = path.join(
    ROOT,
    "private-data",
    "professional",
    "professional-events.json"
  );
  const signaturePath = path.join(SOURCE_DIR, "collapse-hazard-signatures.json");
  const historicalPath = path.join(SOURCE_DIR, "historical-hazard-signatures.json");
  const sourcePath = path.join(
    ROOT,
    "private-data",
    "professional",
    "professional-sources.json"
  );
  const { events, sources } = readProfessionalDataset(ROOT);
  const signatures = rows(readJson(signaturePath, {}), "signatures");
  const historicalSignatures = rows(readJson(historicalPath, {}), "signatures");
  const result = buildFailureLearningBenchmark({
    datasetChecksums: {
      collapse_hazard_signatures_sha256: checksum(signaturePath),
      historical_hazard_signatures_sha256: checksum(historicalPath),
      professional_events_sha256: checksum(eventPath),
      professional_sources_sha256: checksum(sourcePath),
    },
    events,
    generatedAt,
    historicalSignatures,
    signatures,
    sources,
  });

  const paths = {
    assignments: path.join(outputDir, "assignments.json"),
    confidentialKey: path.join(outputDir, "confidential-key.json"),
    manifest: path.join(outputDir, "manifest.json"),
    reviewerMaster: path.join(outputDir, "reviewer-master-package.json"),
  };
  writeJsonAtomic(paths.manifest, result.manifest);
  writeJsonAtomic(paths.assignments, result.assignments);
  writeJsonAtomic(paths.confidentialKey, result.confidentialKey);
  writeJsonAtomic(paths.reviewerMaster, result.reviewerMasterPackage);
  Object.entries(result.reviewerPackages).forEach(([slot, reviewerPackage]) => {
    writeJsonAtomic(
      path.join(outputDir, `${slot}-package.json`),
      reviewerPackage
    );
    writeJsonAtomic(
      path.join(outputDir, `${slot}-response-template.json`),
      result.responseTemplates[slot]
    );
  });

  return { ...result, outputDir, paths };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const result = buildAndWriteFailureLearningBenchmark();
  console.log(JSON.stringify({
    benchmark_freeze_id: result.manifest.benchmark_freeze_id,
    expected_collection: result.manifest.expected_collection,
    output: result.outputDir,
    sampling: result.manifest.sampling,
    status: result.manifest.status,
  }, null, 2));
}
