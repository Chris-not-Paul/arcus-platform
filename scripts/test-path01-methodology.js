import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import {
  runPath01MethodologyAnalysis,
} from "./analyze-path01-methodology.js";

function sha256(filePath) {
  return crypto
    .createHash("sha256")
    .update(fs.readFileSync(filePath))
    .digest("hex");
}

function scenario(analysis, id) {
  const item = analysis.scenario_matrix.find((entry) => entry.id === id);

  assert.ok(item, `Missing scenario ${id}`);

  return item;
}

const productionFiles = [
  "private-data/professional/ainop-bridge-index.json",
  "private-data/professional/seismic/mps04-grid.json",
  "private-data/professional/seismic/mps04-manifest.json",
  "private-data/professional/hazard-exposure-preview.json",
  "src/pages/ProfessionalPage.jsx",
  "src/utils/analytics.js",
  "server/hazard/hazardExposureService.js",
].map((filePath) => path.resolve(filePath));
const before = Object.fromEntries(
  productionFiles.map((filePath) => [filePath, sha256(filePath)])
);
const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "arcus-path01-method-"));
const outputPath = path.join(tmpDir, "analysis.json");
const first = runPath01MethodologyAnalysis({ outputPath });
const firstText = fs.readFileSync(outputPath, "utf8");
const second = runPath01MethodologyAnalysis({ outputPath, write: false });
const secondText = JSON.stringify(second, null, 2);

assert.equal(firstText, secondText);
assert.equal(first.scenario_matrix.length >= 30, true);
assert.equal(first.decision_question.includes("misure di mitigazione"), true);
assert.equal(
  first.candidate_output_name,
  "Preliminary Site Screening Priority"
);

for (const filePath of productionFiles) {
  assert.equal(sha256(filePath), before[filePath], `${filePath} was modified`);
}

const p4 = scenario(first, "S10");
assert.equal(
  p4.model_results.rule_based_tier_plus_modifier.tier,
  "critical_specialist_review"
);
assert.equal(
  p4.model_results.rule_based_tier_plus_modifier.score >= 90,
  true
);
assert.equal(
  p4.paradox_notes.some((note) => note.includes("P4")),
  true
);

const aa = scenario(first, "S06");
assert.equal(aa.landslide.attention_area, true);
assert.equal(aa.landslide.highest_hazard_class, null);
assert.equal(aa.flags.includes("landslide_attention_area"), true);
assert.equal(
  aa.experimental_components.landslide.conservative_nonlinear,
  0
);

const unavailable = scenario(first, "S25");
assert.equal(unavailable.experimental_components.hydraulic.linear_ordinal, null);
assert.equal(
  unavailable.flags.includes("source_unavailable_or_incomplete"),
  true
);

const partial = scenario(first, "S26");
assert.equal(partial.experimental_components.landslide.linear_ordinal, null);
assert.equal(partial.flags.includes("incomplete_assessment"), true);

const seismicHigh = scenario(first, "S15");
assert.equal(
  Number.isFinite(seismicHigh.experimental_components.seismic.empirical_percentile),
  true
);
assert.equal(
  seismicHigh.experimental_components.seismic.empirical_percentile > 90,
  true
);
assert.equal(first.distributions.seismic_pga_p50_g.count > 1000, true);
assert.equal(
  first.distributions.seismic_pga_p50_g.p95 >
    first.distributions.seismic_pga_p50_g.p50,
  true
);

const zero = scenario(first, "S23");
assert.equal(zero.historical.numerator_count, 0);
assert.equal(
  Number.isFinite(zero.experimental_components.historical.percentile_rank),
  true
);

const missing = scenario(first, "S24");
assert.equal(missing.historical.denominator_count, null);
assert.equal(missing.experimental_components.historical.percentile_rank, null);
assert.equal(missing.flags.includes("historical_denominator_missing"), true);

const hciOutlier = scenario(first, "S22");
assert.equal(
  hciOutlier.experimental_components.historical.percentile_rank >= 90,
  true
);
assert.equal(
  hciOutlier.paradox_notes.some((note) =>
    note.includes("Historical outlier")
  ),
  true
);

assert.deepEqual(
  first.variable_dependency_map.confidence.includes("nearest MPS04 node distance"),
  true
);
assert.equal(
  first.variable_dependency_map.official_hazard_exposure.includes(
    "INGV MPS04 nearest-node PGA p50"
  ),
  true
);

const scriptSource = fs.readFileSync(
  "scripts/analyze-path01-methodology.js",
  "utf8"
);

assert.equal(scriptSource.includes("hazard-exposure-preview"), false);
assert.equal(scriptSource.includes("riskScore"), false);

console.log(
  JSON.stringify(
    {
      outputPath,
      scenarios: first.scenario_matrix.length,
      unstable_scenarios: first.sensitivity.unstable_scenarios,
    },
    null,
    2
  )
);
