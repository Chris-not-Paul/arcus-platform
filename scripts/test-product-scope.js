import assert from "node:assert/strict";
import fs from "node:fs";

const app = fs.readFileSync("src/App.jsx", "utf8");
const page = fs.readFileSync("src/pages/CollapseIntelligencePage.jsx", "utf8");
const definition = fs.readFileSync("docs/ARCUS_Product_Definition.md", "utf8");
const reportSummary = fs.readFileSync("src/utils/mitigationReportSummary.js", "utf8");
const report = fs.readFileSync("src/utils/collapseIntelligenceReport.js", "utf8");
const methodology = fs.readFileSync("src/pages/MethodologyPage.jsx", "utf8");
const hazardGatedAnalysis = fs.readFileSync(
  "scripts/analyze-hazard-gated-collapse-intelligence.js",
  "utf8"
);

assert.match(app, /CollapseIntelligencePage/);
assert.doesNotMatch(app, /ProfessionalPage/);
assert.doesNotMatch(app, /ReportMapPath01/);
assert.doesNotMatch(app, /report-map\/path01/);

for (const retiredFile of [
  "src/pages/ProfessionalPage.jsx",
  "src/pages/ReportMapPath01.jsx",
  "src/utils/path01Priority.js",
  "src/utils/path01Calibration.js",
  "scripts/test-path01-methodology.js",
  "scripts/validate-professional-path01-release.js",
  "scripts/export-path01-report.js",
]) {
  assert.equal(fs.existsSync(retiredFile), false, `${retiredFile} must remain retired`);
}

for (const retiredClaim of [
  /Path 02/i,
  /Final Priority Index/i,
  /Infrastructure Priority Index/i,
  /asset watchlist/i,
  /asset ranking/i,
  /L0.?L4/i,
]) {
  assert.doesNotMatch(page, retiredClaim);
}

assert.match(page, /deriveProvinceForPoint/);
assert.match(page, /professionalHazardExposurePoint/);
assert.match(page, /professionalMitigationIntelligence/);
assert.match(page, /official_hydraulic|official exposure|Esposizione ufficiale/i);
assert.match(page, /Abstention|Astensione/);
assert.match(reportSummary, /Non-prescriptive|non prescrittivo/i);
assert.match(page, /current hazard signature|firma hazard attuale/i);
assert.match(page, /PROJECT BRIDGE PROFILE V1/);
assert.match(page, /No missing value is inferred|Nessun dato mancante viene inferito/i);
assert.match(report, /Project Bridge Profile v1/);

for (const activeOutput of [page, report, reportSummary]) {
  assert.doesNotMatch(activeOutput, /AINOP/i);
  assert.doesNotMatch(activeOutput, /Historical Collapse Incidence/i);
  assert.doesNotMatch(activeOutput, /collapse_rate_per_100|provincial_rate_per_100/i);
}

assert.match(methodology, /denominators and provincial collapse rates are not used/i);
assert.match(methodology, /Denominatori inventariali e tassi provinciali di collasso non sono usati/i);
assert.doesNotMatch(hazardGatedAnalysis, /cause_specific_hci_context|hci_ablation/i);

assert.match(definition, /Collapse Intelligence — Lessons from Failures/);
assert.match(definition, /Explicitly retired from the product/);
assert.match(definition, /Learning-grade/);
assert.match(definition, /Context-grade/);
assert.match(definition, /Record-grade/);
assert.match(definition, /Global IABSE database/);

console.log(JSON.stringify({
  ok: true,
  product: "ARCUS Collapse Intelligence - Lessons from Failures",
  route: "/professional",
}, null, 2));
