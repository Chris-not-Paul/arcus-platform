import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const checks = [
  { id: "project-location", executable: process.execPath, args: ["scripts/test-project-location.js"] },
  { id: "hazard-exposure", executable: process.execPath, args: ["scripts/test-hazard-exposure.js"] },
  { id: "seismic-exposure", executable: process.execPath, args: ["scripts/test-seismic-exposure.js"] },
  { id: "historical-incidence", executable: process.execPath, args: ["scripts/test-historical-incidence.js"] },
  { id: "path01-methodology", executable: process.execPath, args: ["scripts/test-path01-methodology.js"] },
  { id: "hydraulic-intelligence", executable: process.execPath, args: ["scripts/test-hydraulic-intelligence.js"] },
  { id: "landslide-mitigation", executable: process.execPath, args: ["scripts/test-landslide-mitigation-readiness.js"] },
  { id: "seismic-mitigation", executable: process.execPath, args: ["scripts/test-seismic-mitigation-readiness.js"] },
  { id: "seismic-intake", executable: process.execPath, args: ["scripts/test-seismic-evidence-intake.js"] },
  { id: "mitigation-intelligence", executable: process.execPath, args: ["scripts/test-mitigation-intelligence.js"] },
  { id: "open-release-boundary", executable: process.execPath, args: ["scripts/test-open-research-release.js"] },
  { id: "backend", executable: process.execPath, args: ["scripts/test-backend.js"] },
  { id: "lint", executable: process.execPath, args: ["node_modules/eslint/bin/eslint.js", "."] },
  { id: "build", executable: process.execPath, args: ["node_modules/vite/bin/vite.js", "build"] },
  { id: "diff-check", executable: "git", args: ["diff", "--check"] },
];

const results = [];

for (const check of checks) {
  const startedAt = Date.now();
  console.log(`\n[Path 01 release gate] ${check.id}`);
  const result = spawnSync(check.executable, check.args, {
    cwd: ROOT,
    encoding: "utf8",
    env: process.env,
    shell: false,
  });
  const stdout = result.stdout || "";
  const stderr = result.stderr || "";
  if (stdout) process.stdout.write(stdout);
  if (stderr) process.stderr.write(stderr);

  results.push({
    duration_ms: Date.now() - startedAt,
    exit_code: Number.isInteger(result.status) ? result.status : 1,
    id: check.id,
    passed: result.status === 0,
    signal: result.signal || null,
  });
}

const failed = results.filter((result) => !result.passed);
const summary = {
  checks: results,
  failed: failed.map((result) => result.id),
  judgement: failed.length
    ? "not_ready"
    : "validated_with_limitations",
  live_provider_note:
    "This gate is deterministic. Current external-provider availability remains covered by the documented manual Path 01 acceptance evidence.",
  passed: results.length - failed.length,
  release_scope: "arcus-professional-path01",
  schema_version: "arcus-professional-path01-release-gate-v1",
  total: results.length,
};

console.log(`\n${JSON.stringify(summary, null, 2)}`);
if (failed.length) process.exitCode = 1;
