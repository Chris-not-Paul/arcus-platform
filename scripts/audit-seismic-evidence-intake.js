import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { auditSeismicEvidenceCandidates } from "../src/utils/seismicEvidenceIntake.js";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const CONTRACT_PATH = path.join(
  ROOT,
  "config",
  "collapse-intelligence",
  "seismic-evidence-intake-contract.json"
);
const DEFAULT_INPUT_PATH = path.join(
  ROOT,
  "private-data",
  "professional",
  "collapse-intelligence",
  "seismic-evidence-candidates.json"
);

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8").replace(/^\uFEFF/, ""));
}

function inputPathFromArgs(args) {
  const inputIndex = args.indexOf("--input");
  if (inputIndex < 0) return DEFAULT_INPUT_PATH;
  const supplied = args[inputIndex + 1];
  if (!supplied) throw new Error("--input requires a JSON file path");
  return path.resolve(ROOT, supplied);
}

export function runSeismicEvidenceIntakeAudit({ inputPath = DEFAULT_INPUT_PATH } = {}) {
  const contract = readJson(CONTRACT_PATH);
  const payload = fs.existsSync(inputPath) ? readJson(inputPath) : { candidates: [] };
  const report = auditSeismicEvidenceCandidates(payload.candidates || [], contract);

  return {
    ...report,
    input: {
      exists: fs.existsSync(inputPath),
      path: path.relative(ROOT, inputPath).replaceAll("\\", "/"),
    },
    schema_version: "arcus-seismic-evidence-intake-audit-v1",
  };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const report = runSeismicEvidenceIntakeAudit({
    inputPath: inputPathFromArgs(process.argv.slice(2)),
  });
  console.log(JSON.stringify(report, null, 2));
}
