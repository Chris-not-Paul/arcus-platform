import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  validateFailureLearningBenchmarkResponse,
} from "./lib/failure-learning-benchmark.js";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const benchmarkDir = path.join(
  ROOT,
  "private-data",
  "professional",
  "collapse-intelligence",
  "failure-learning-benchmark-v1"
);
const reviewerSlot = String(process.argv[2] || "").trim();
const responsePath = process.argv[3]
  ? path.resolve(process.argv[3])
  : "";

if (!/^reviewer-0[1-5]$/.test(reviewerSlot) || !responsePath) {
  console.error(
    "Usage: npm run validate:failure-learning-benchmark-response -- reviewer-01 <response.json>"
  );
  process.exitCode = 2;
} else {
  const reviewerPackage = JSON.parse(fs.readFileSync(
    path.join(benchmarkDir, `${reviewerSlot}-package.json`),
    "utf8"
  ));
  const response = JSON.parse(fs.readFileSync(responsePath, "utf8"));
  const result = validateFailureLearningBenchmarkResponse(
    response,
    reviewerPackage
  );
  console.log(JSON.stringify({
    errors: result.errors,
    response: responsePath,
    reviewer_slot: reviewerSlot,
    valid: result.valid,
  }, null, 2));
  if (!result.valid) process.exitCode = 1;
}
