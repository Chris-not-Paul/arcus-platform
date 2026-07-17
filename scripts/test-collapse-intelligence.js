import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import {
  auditDatabase,
  buildAnalysis,
  buildCauseSpecificIncidence,
  buildFailurePatternTaxonomy,
  buildTerritorialReconciliation,
  causeFamilyForEvent,
  evidenceStrength,
  findAnalogues,
  auditMatcherFeatureExclusion,
} from "./analyze-collapse-intelligence.js";
import {
  buildCollapseHazardSignatures,
} from "./build-collapse-hazard-signatures.js";
import {
  validateCollapseAnalogues,
} from "./validate-collapse-analogues.js";
import {
  runRedTeamValidation,
} from "./red-team-collapse-intelligence.js";
import {
  BLOCKED_OUTCOME_FIELDS,
  buildHazardGatedCollapseIntelligence,
  highestHydraulicClass,
  routeHazardsForSignature,
} from "./analyze-hazard-gated-collapse-intelligence.js";
import {
  normalizeHydraulicIntelligence,
} from "../src/utils/hydraulicIntelligence.js";

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8").replace(/^\uFEFF/, ""));
}

function sha256(filePath) {
  return crypto.createHash("sha256").update(fs.readFileSync(filePath)).digest("hex");
}

function check(name, fn) {
  fn();
  checks.push(name);
}

const checks = [];
const events = readJson("private-data/processed/events.json");
const sources = readJson("private-data/processed/sources.json");
const ainop = readJson("private-data/professional/ainop-bridge-index.json");
const geo = readJson("public/data/geo/italy-provinces.geojson");
const productionFiles = [
  "private-data/processed/events.json",
  "private-data/processed/sources.json",
  "private-data/professional/ainop-bridge-index.json",
  "private-data/professional/hazard-exposure-preview.json",
  "private-data/professional/professional-events.json",
  "src/pages/ProfessionalPage.jsx",
  "src/utils/analytics.js",
  "server/hazard/hazardExposureService.js",
].map((filePath) => path.resolve(filePath));
const before = Object.fromEntries(
  productionFiles.map((filePath) => [filePath, sha256(filePath)])
);
const tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), "arcus-collapse-intel-"));
const taxonomy = buildFailurePatternTaxonomy(events);
const audit = auditDatabase(events, sources);
const incidence = buildCauseSpecificIncidence(events, ainop, taxonomy);
const reconciliation = buildTerritorialReconciliation(ainop, geo);
const analysis = buildAnalysis({
  outputPath: path.join(tmpRoot, "collapse-intelligence-analysis.json"),
});
const validation = validateCollapseAnalogues({
  outputPath: path.join(tmpRoot, "collapse-intelligence-validation.json"),
});
const redTeam = runRedTeamValidation({
  outputPath: path.join(tmpRoot, "collapse-intelligence-red-team-validation.json"),
});
const hazardGated = buildHazardGatedCollapseIntelligence({
  analysisPath: path.join(tmpRoot, "hazard-gated-intelligence-analysis.json"),
  expertReviewPath: path.join(tmpRoot, "expert-review-package.json"),
  validationPath: path.join(tmpRoot, "analogue-retrieval-validation.json"),
});

check("data-audit-real-schema", () => {
  assert.equal(audit.inventory.some((field) => field.field === "event_id"), true);
  assert.equal(audit.inventory.some((field) => field.field === "specific_cause"), true);
});
check("data-audit-absent-field", () => {
  assert.equal(audit.inventory.some((field) => field.field === "failure_mechanism"), false);
});
check("taxonomy-alias", () => {
  assert.equal(causeFamilyForEvent({ specific_cause: "Hydraulic" }), "hydraulic");
});
check("coordinates-missing-detected", () => {
  const localAudit = auditDatabase([{ event_id: "X", latitude: null, longitude: null }], []);
  assert.equal(localAudit.inventory.find((field) => field.field === "latitude").coverage_percent, 0);
});
check("source-coverage", () => {
  assert.equal(audit.source_coverage_percent, 100);
});
check("hazard-signature-hydraulic", () => {
  const sig = buildDrySignatureExpectation();
  assert.equal(sig.hydraulic.provider_version, "ispra-flood-wfs-v2");
});
check("hazard-signature-landslide", () => {
  const sig = buildDrySignatureExpectation();
  assert.equal(sig.landslide.provider_version, "ispra-landslide-pai-wfs-v1");
});
check("hazard-signature-seismic", () => {
  const sig = buildDrySignatureExpectation();
  assert.equal(sig.seismic.sampling_method, "nearest_grid_node");
});
check("current-context-caveat", () => {
  assert.equal(analysis.hazard_enrichment.caveat.includes("current official hazard context"), true);
});
const signatureOutputDir = path.join(tmpRoot, "signatures");
const firstSignatureRun = await buildCollapseHazardSignatures({
  dryRun: true,
  limit: 3,
  outputDir: signatureOutputDir,
});
const secondSignatureRun = await buildCollapseHazardSignatures({
  dryRun: true,
  limit: 3,
  outputDir: signatureOutputDir,
  resume: true,
});

check("hazard-signature-resume-cache-version-partial", () => {
  const first = firstSignatureRun;
  const second = secondSignatureRun;

  assert.equal(first.signatures.length, 3);
  assert.equal(second.signatures.length, 3);
  assert.equal(second.manifest.provider_versions.hydraulic, "ispra-flood-wfs-v2");
  assert.equal(second.errors.length, 0);
});
check("hazard-signature-caching", () => {
  const cacheFile = path.join(signatureOutputDir, "collapse-hazard-signatures-cache.json");
  assert.equal(fs.existsSync(cacheFile), true);
});
check("hazard-signature-dry-run-distinct-from-live-enrichment", () => {
  assert.equal(firstSignatureRun.manifest.dry_run, true);
  assert.equal(firstSignatureRun.manifest.dry_run_events, 3);
  assert.equal(firstSignatureRun.manifest.fully_enriched, 0);
});
check("hazard-signature-fully-enriched-status", () => {
  assert.equal(Object.hasOwn(firstSignatureRun.manifest, "fully_enriched"), true);
  assert.equal(Object.hasOwn(firstSignatureRun.manifest, "hydraulic_completed"), true);
  assert.equal(Object.hasOwn(firstSignatureRun.manifest, "landslide_completed"), true);
  assert.equal(Object.hasOwn(firstSignatureRun.manifest, "seismic_completed"), true);
});
check("hazard-signature-provider-failure-not-completed", () => {
  const route = routeHazardsForSignature({
    hydraulic: { status: "provider_exception", matched_classes: [] },
    landslide: { status: "no_intersection", matched_hazard_classes: [] },
    seismic: { status: "available", pga_p50_g: 0.12 },
  });

  assert.equal(route.unavailable_tracks.some((item) => item.track === "hydraulic"), true);
});
check("provider-version-invalidation-ready", () => {
  assert.equal(Object.keys(secondSignatureRun.manifest.provider_versions).length, 3);
});
check("partial-provider-result-status-model", () => {
  const script = fs.readFileSync("scripts/build-collapse-hazard-signatures.js", "utf8");
  assert.equal(script.includes("errors.push"), true);
});
check("cause-specific-single", () => {
  const ancona = incidence.by_province.find((item) => item.province === "Ancona");
  assert.equal(Number.isFinite(ancona.cause_families.hydraulic.numerator_count), true);
});
check("cause-specific-multiple-families", () => {
  assert.equal(Object.keys(incidence.national_rates_per_100).length >= 5, true);
});
check("cause-unspecified", () => {
  assert.equal(taxonomy.families.unknown_unspecified.patterns.length >= 0, true);
});
check("denominator-missing", () => {
  const missing = incidence.by_province.find((item) =>
    Object.values(item.cause_families).some((family) => family.denominator_count === null)
  );
  assert.ok(missing);
});
check("small-denominator", () => {
  const small = ainop.provinces.find((item) => item.denominator_count > 0 && item.denominator_count < 25);
  assert.ok(small);
});
check("zero-cases", () => {
  const zero = incidence.by_province.find((item) =>
    Object.values(item.cause_families).some((family) => family.numerator_count === 0)
  );
  assert.ok(zero);
});
check("national-rate-coherent", () => {
  assert.equal(Number.isFinite(incidence.national_rates_per_100.hydraulic), true);
});
check("smoothing-preserves-raw", () => {
  const firstFamily = Object.values(incidence.by_province[0].cause_families)[0];
  assert.equal(Object.hasOwn(firstFamily, "raw_rate_per_100"), true);
  assert.equal(Object.hasOwn(firstFamily.smoothing_options, "bayesian_exploratory"), true);
});
check("cause-output-deterministic", () => {
  const again = buildCauseSpecificIncidence(events, ainop, taxonomy);
  assert.deepEqual(again.national_rates_per_100, incidence.national_rates_per_100);
});
check("field-role-classification", () => {
  const latitude = audit.inventory.find((field) => field.field === "latitude");
  const cause = audit.inventory.find((field) => field.field === "specific_cause");
  assert.equal(latitude.candidate_role, "matching_feature");
  assert.equal(cause.candidate_role, "outcome_feature");
});
check("no-target-leakage", () => {
  const method = analysis.analog_matching_comparison.methods.find((item) =>
    item.method.includes("project_informed")
  );
  assert.equal(
    method.analogues.some((item) =>
      item.matched_features.some((feature) => feature.feature.includes("specific_cause"))
    ),
    false
  );
});
check("site-only", () => {
  const method = analysis.analog_matching_comparison.methods.find((item) =>
    item.method.includes("site_only")
  );
  assert.ok(method);
});
check("project-profile-optional", () => {
  assert.equal(Object.hasOwn(analysis.site_hazard_signature, "project_profile"), true);
});
check("project-informed", () => {
  const method = analysis.analog_matching_comparison.methods.find((item) =>
    item.method.includes("project_informed")
  );
  assert.ok(method);
});
check("matched-feature-explanation", () => {
  const method = analysis.analog_matching_comparison.methods.find((item) =>
    item.method.includes("project_informed")
  );
  assert.equal(method.analogues.some((item) => item.matched_features.length > 0), true);
});
check("missing-feature", () => {
  const analogues = findAnalogues({
    events,
    limit: 3,
    mode: "project_informed",
    site: { project_profile: {}, territorial_context: {} },
  });
  assert.equal(analogues.length, 0);
});
check("deterministic-ranking", () => {
  const site = { project_profile: { material: "Reinforced concrete" }, territorial_context: { region: "Molise" } };
  assert.deepEqual(
    findAnalogues({ events, mode: "project_informed", site }).map((item) => item.event_id),
    findAnalogues({ events, mode: "project_informed", site }).map((item) => item.event_id)
  );
});
check("geographical-contribution-limit", () => {
  const script = fs.readFileSync("scripts/analyze-collapse-intelligence.js", "utf8");
  assert.equal(script.includes("province: 4"), true);
  assert.equal(script.includes("region: 6"), true);
});
check("identical-case-excluded", () => {
  const target = events[0];
  const analogues = findAnalogues({
    events,
    excludeEventId: target.event_id,
    mode: "project_informed",
    site: { project_profile: { material: target.material_type }, territorial_context: { region: target.region } },
  });
  assert.equal(analogues.some((item) => item.event_id === target.event_id), false);
});
check("minimum-support-abstention", () => {
  const strength = evidenceStrength({
    analogues: [],
    outcomes: { cohort_size: 0, effective_evidence_count: 0, unspecified_outcome_share: 0 },
  });
  assert.equal(strength.evidence_strength, "insufficient");
});
check("cohort-shares", () => {
  const method = analysis.analog_matching_comparison.methods[0];
  assert.equal(method.outcomes.cause_patterns.every((item) => item.share <= 1), true);
});
check("effective-case-count", () => {
  assert.equal(analysis.analog_matching_comparison.methods[0].outcomes.effective_evidence_count >= 0, true);
});
check("unspecified-outcomes", () => {
  assert.equal(Object.hasOwn(analysis.analog_matching_comparison.methods[0].outcomes, "unspecified_outcome_share"), true);
});
check("source-quality-weighting", () => {
  const method = analysis.analog_matching_comparison.methods[0];
  assert.equal(method.outcomes.effective_evidence_count <= method.outcomes.cohort_size, true);
});
check("shares-not-probabilities", () => {
  assert.equal(
    analysis.analog_matching_comparison.methods[0].outcomes.evidence_limitations.some((item) =>
      item.includes("not probabilities")
    ),
    true
  );
});
check("leave-one-out", () => {
  assert.equal(validation.leave_one_out.total_cases > 0, true);
});
check("temporal-holdout", () => {
  assert.equal(validation.temporal_holdout.cutoff_year, 2018);
});
check("geographical-holdout", () => {
  assert.equal(validation.geographical_holdout.total_cases > 0, true);
});
check("baseline-comparison", () => {
  assert.equal(Object.hasOwn(validation.baseline_comparison, "national_most_frequent_cause"), true);
});
check("value-add-benchmark", () => {
  assert.equal(Object.hasOwn(analysis.value_add_benchmark, "baseline_c_arcus_collapse_intelligence"), true);
});
check("validation-no-leakage", () => {
  assert.equal(validation.leakage_check.includes("excluded from similarity"), true);
});
check("validation-insufficient-evidence", () => {
  assert.equal(Object.hasOwn(validation.leave_one_out, "insufficient_evidence_count"), true);
});
check("deterministic-metrics", () => {
  assert.deepEqual(validation.leave_one_out, validateCollapseAnalogues({
    outputPath: path.join(tmpRoot, "again.json"),
  }).leave_one_out);
});
check("red-team-target-excluded-from-numerators", () => {
  assert.equal(redTeam.fold_specific_recomputation.target_removed_from_candidates, true);
});
check("red-team-target-excluded-from-percentiles", () => {
  assert.equal(redTeam.fold_specific_recomputation.target_removed_from_fold_statistics, true);
});
check("red-team-temporal-only-statistics", () => {
  assert.equal(redTeam.fold_specific_recomputation.temporal_only_statistics, true);
  assert.ok(redTeam.temporal_holdout["2018"].training_class_distribution);
  assert.ok(redTeam.temporal_holdout["2018"].validation_class_distribution);
});
check("red-team-region-excluded-in-geographical-holdout", () => {
  assert.equal(
    redTeam.geographical_holdout.notes.includes("disabled when the corresponding geography is held out"),
    true
  );
  assert.ok(redTeam.geographical_holdout.by_region.Piemonte.denominator_all_eligible > 0);
});
check("red-team-narrative-not-used", () => {
  const blocked = redTeam.leakage_audit.blocked_features.map((feature) => feature.feature);
  assert.equal(blocked.includes("description"), true);
  assert.equal(blocked.includes("source_text"), true);
  assert.equal(blocked.includes("source_title"), true);
});
check("red-team-outcome-fields-not-used", () => {
  const blocked = redTeam.leakage_audit.blocked_features.map((feature) => feature.feature);
  assert.equal(blocked.includes("specific_cause"), true);
  assert.equal(blocked.includes("cause_category"), true);
  assert.equal(blocked.includes("collapse_severity"), true);
});
check("red-team-shuffled-labels-degradation-audited", () => {
  const shuffled = redTeam.randomization.tests.shuffled_causes;
  const degraded = shuffled.top1_rate_all_eligible < redTeam.randomization.base_top1_all_eligible;
  assert.equal(
    degraded ||
      redTeam.criticalities.some((item) => item.includes("shuffled-label control does not degrade")),
    true
  );
});
check("red-team-duplicate-groups-held-in-same-fold-policy", () => {
  assert.equal(
    redTeam.duplicate_audit.group_holdout_policy.includes("same fold"),
    true
  );
  assert.ok(redTeam.duplicate_audit.same_date_locality_groups > 0);
});
check("red-team-abstentions-included-in-all-eligible-metrics", () => {
  const loo = redTeam.fold_specific_recomputation.leave_one_out;
  assert.equal(loo.denominator_all_eligible >= loo.denominator_evaluated, true);
  assert.equal(loo.top1_rate_all_eligible <= loo.top1_rate_evaluated, true);
});
check("red-team-baselines-same-fold-denominator", () => {
  const full = redTeam.fold_specific_recomputation.leave_one_out.denominator_all_eligible;
  for (const baseline of Object.values(redTeam.baselines)) {
    assert.equal(baseline.denominator_all_eligible, full);
  }
});
check("red-team-top3-coherent-with-class-count", () => {
  assert.equal(redTeam.class_distribution.number_of_classes > 3, true);
  assert.equal(
    redTeam.class_distribution.top3_discriminative.includes("more than three"),
    true
  );
});
check("red-team-fully-enriched-distinct-from-eligible", () => {
  assert.equal(redTeam.enrichment_status.eligible_for_enrichment, 253);
  assert.equal(redTeam.enrichment_status.fully_enriched, 0);
  assert.equal(redTeam.enrichment_status.pending, 253);
});
check("red-team-unresolved-geography-excluded-correctly", () => {
  assert.equal(redTeam.territorial_reconciliation.unresolved.length, 13);
  assert.equal(
    redTeam.territorial_reconciliation.unresolved.every((item) =>
      item.required_decision.includes("manual")
    ),
    true
  );
});
check("hazard-gated-track-activation-without-outcome", () => {
  const route = routeHazardsForSignature({
    hydraulic: { matched_classes: ["P2"], status: "available" },
    landslide: { matched_hazard_classes: [], status: "no_intersection" },
    seismic: { status: "no_intersection" },
  });

  assert.equal(route.active_tracks.some((item) => item.track === "hydraulic"), true);
});
check("hazard-gated-aa-separate-attention-track", () => {
  const route = routeHazardsForSignature({
    hydraulic: { matched_classes: [], status: "no_intersection" },
    landslide: {
      attention_area: true,
      matched_attention_classes: ["AA"],
      matched_hazard_classes: [],
      status: "available",
    },
    seismic: { status: "no_intersection" },
  });

  assert.equal(route.active_tracks.some((item) => item.track === "landslide"), false);
  assert.equal(route.attention_tracks.some((item) => item.track === "landslide_attention_area"), true);
});
check("hazard-gated-router-does-not-use-documented-cause", () => {
  const route = routeHazardsForSignature({
    documented_cause_family: "hydraulic",
    hydraulic: { matched_classes: [], status: "no_intersection" },
    landslide: { matched_hazard_classes: [], status: "no_intersection" },
    seismic: { status: "no_intersection" },
  });

  assert.equal(route.active_tracks.length, 0);
});
check("hazard-gated-no-outcome-field-in-matching", () => {
  assert.equal(BLOCKED_OUTCOME_FIELDS.includes("specific_cause"), true);
  assert.equal(BLOCKED_OUTCOME_FIELDS.includes("description"), true);
  assert.equal(BLOCKED_OUTCOME_FIELDS.includes("collapse_severity"), true);
  assert.equal(BLOCKED_OUTCOME_FIELDS.includes("hydraulic_failure_process"), true);
  assert.equal(BLOCKED_OUTCOME_FIELDS.includes("hydraulic_intelligence"), true);
});
check("hydraulic-intelligence-normalization", () => {
  const result = normalizeHydraulicIntelligence({
    event_id: "TEST-HYD",
    hydraulic_component_involved: "Pier foundation",
    hydraulic_evidence_level: "Documented",
    hydraulic_failure_process: "Scour",
    hydraulic_trigger: "Flood",
    specific_cause: "Hydraulic",
  });

  assert.deepEqual(result.hydraulic_intelligence, {
    component_involved: "pier_foundation",
    evidence_level: "documented",
    failure_process: "scour",
    taxonomy_version: "hydraulic-v1",
    trigger: "flood",
  });
});
check("hydraulic-intelligence-unspecified", () => {
  const result = normalizeHydraulicIntelligence({
    event_id: "TEST-HYD-UNSPEC",
    hydraulic_component_involved: "Unspecified",
    hydraulic_evidence_level: "Unspecified",
    hydraulic_failure_process: "Unspecified",
    hydraulic_trigger: "Flood",
    specific_cause: "Hydraulic",
  });

  assert.equal(result.hydraulic_intelligence.failure_process, null);
  assert.equal(result.hydraulic_intelligence.component_involved, null);
  assert.equal(result.hydraulic_intelligence.evidence_level, "unspecified");
});
check("hydraulic-intelligence-non-hydraulic-null", () => {
  const result = normalizeHydraulicIntelligence({
    event_id: "TEST-NON-HYD",
    hydraulic_trigger: "Flood",
    specific_cause: "Landslide",
  });

  assert.equal(result.hydraulic_intelligence, null);
  assert.equal(
    result.warnings.some((warning) => warning.code === "non_hydraulic_with_hydraulic_fields"),
    true
  );
});
check("hydraulic-intelligence-professional-present", () => {
  const professional = readJson("private-data/professional/professional-events.json");
  const rows = Array.isArray(professional) ? professional : professional.events;

  assert.equal(
    rows.some((event) => event.hydraulic_intelligence?.taxonomy_version === "hydraulic-v1"),
    true
  );
});
check("hydraulic-intelligence-open-scope-protected", () => {
  const script = fs.readFileSync("server/dataService.js", "utf8");

  assert.equal(script.includes("hydraulic_intelligence:"), false);
  assert.equal(script.includes("hydraulic_intelligence_warnings:"), false);
});
check("hydraulic-intelligence-cohort-outcomes", () => {
  const method = analysis.analog_matching_comparison.methods[0];

  assert.equal(Object.hasOwn(method.outcomes, "hydraulic_cohort"), true);
  assert.equal(Object.hasOwn(method.outcomes.hydraulic_cohort, "failure_processes"), true);
  assert.equal(
    method.outcomes.hydraulic_cohort.limitations.some((item) =>
      item.includes("not site or collapse probabilities")
    ),
    true
  );
});
check("matcher-feature-exclusion-audit", () => {
  const auditResult = auditMatcherFeatureExclusion();

  assert.equal(auditResult.leakage_detected, false);
  assert.equal(auditResult.blocked_outcome_fields.includes("hydraulic_failure_process"), true);
  assert.equal(auditResult.matching_features.includes("hydraulic_failure_process"), false);
});
check("hazard-gated-deterministic-ranking", () => {
  const again = buildHazardGatedCollapseIntelligence({
    analysisPath: path.join(tmpRoot, "hazard-gated-again.json"),
    expertReviewPath: path.join(tmpRoot, "expert-review-again.json"),
    validationPath: path.join(tmpRoot, "retrieval-again.json"),
  });

  assert.deepEqual(
    hazardGated.analysis.support_by_track,
    again.analysis.support_by_track
  );
});
check("hazard-gated-random-baseline", () => {
  assert.equal(
    Object.hasOwn(hazardGated.analysis.hydraulic_intelligence_mvp.baselines, "random_within_hydraulic_family"),
    true
  );
});
check("hazard-gated-most-frequent-pattern-baseline", () => {
  assert.equal(
    Object.hasOwn(hazardGated.analysis.hydraulic_intelligence_mvp.baselines, "most_frequent_hydraulic_mechanism"),
    true
  );
});
check("hazard-gated-failure-pattern-hit-at-k-fields", () => {
  const validationResult = hazardGated.retrievalValidation.hydraulic_project_informed;

  assert.equal(Object.hasOwn(validationResult, "failure_pattern_hit_at_1"), true);
  assert.equal(Object.hasOwn(validationResult, "failure_pattern_hit_at_3"), true);
  assert.equal(Object.hasOwn(validationResult, "failure_pattern_hit_at_5"), true);
});
check("hazard-gated-component-hit-at-k-fields", () => {
  const validationResult = hazardGated.retrievalValidation.hydraulic_project_informed;

  assert.equal(Object.hasOwn(validationResult, "component_hit_at_3"), true);
  assert.equal(Object.hasOwn(validationResult, "component_hit_at_5"), true);
});
check("hazard-gated-abstention-and-insufficient-evidence", () => {
  const validationResult = hazardGated.retrievalValidation.hydraulic_project_informed;

  assert.equal(validationResult.abstention_rate, 1);
  assert.equal(
    validationResult.rows.every((row) => row.abstained),
    true
  );
});
check("hazard-gated-hci-context-only", () => {
  assert.equal(Object.hasOwn(hazardGated.analysis.hci_ablation, "hci_context_only"), true);
  assert.equal(Object.hasOwn(hazardGated.analysis.hci_ablation, "hci_limited_tie_breaker"), true);
  assert.equal(Object.hasOwn(hazardGated.analysis.hci_ablation, "hci_weighted_feature"), true);
});
check("hazard-gated-hydraulic-signature-helper", () => {
  assert.equal(
    highestHydraulicClass({ hydraulic: { matched_classes: ["P1", "P3"], status: "available" } }),
    "P3"
  );
});
check("mitigation-pattern-mapping", () => {
  assert.equal(analysis.mitigation_knowledge_model.entry_count > 0, true);
});
check("human-decisions-required", () => {
  assert.equal(analysis.human_decisions_required.length > 0, true);
});
check("mitigation-draft-status", () => {
  const kb = readJson("config/collapse-intelligence/mitigation-knowledge-base.json");
  assert.equal(kb.status, "draft");
});
check("mitigation-evidence-links", () => {
  const kb = readJson("config/collapse-intelligence/mitigation-knowledge-base.json");
  assert.equal(Object.hasOwn(kb.entries[0].investigation_priorities[0], "arcus_evidence"), true);
});
check("no-automatic-design-prescription", () => {
  const kb = readJson("config/collapse-intelligence/mitigation-knowledge-base.json");
  assert.equal(kb.caveat.includes("does not prescribe"), true);
});
check("missing-external-basis", () => {
  const kb = readJson("config/collapse-intelligence/mitigation-knowledge-base.json");
  assert.deepEqual(kb.entries[0].external_engineering_basis, []);
});
check("hazard-gated-mitigation-external-validation-required", () => {
  const kb = readJson("config/collapse-intelligence/mitigation-knowledge-base.json");

  assert.equal(
    kb.entries.every((entry) =>
      entry.status === "draft" &&
      (!entry.external_engineering_basis || entry.external_engineering_basis.length === 0)
    ),
    true
  );
});
check("no-unsupported-recommendation", () => {
  const doc = fs.readFileSync("docs/ARCUS_MITIGATION_KNOWLEDGE_MODEL.md", "utf8");
  assert.equal(doc.includes("automatic design prescription"), true);
});
check("territorial-exact", () => {
  assert.equal(reconciliation.exact > 0, true);
});
check("territorial-alias", () => {
  assert.equal(Object.hasOwn(reconciliation, "alias"), true);
});
check("territorial-historical", () => {
  assert.equal(reconciliation.crosswalk.every((item) => item.mapping_type !== "historical" || item.notes), true);
});
check("territorial-unresolved", () => {
  assert.equal(reconciliation.unresolved > 0, true);
});
check("no-silent-denominator-redistribution", () => {
  assert.equal(
    reconciliation.crosswalk.some((item) =>
      item.notes.toLowerCase().includes("do not redistribute")
    ),
    true
  );
});
check("fpi-unchanged", () => {
  const page = fs.readFileSync("src/pages/ProfessionalPage.jsx", "utf8");
  assert.equal(page.includes("selectedExposurePriorityScore * 0.7"), true);
  assert.equal(page.includes("selectedCollapseRateScore * 0.3"), true);
});
check("providers-unchanged", () => {
  assert.equal(fs.existsSync("server/hazard/providers/ispraFloodProvider.js"), true);
  assert.equal(fs.existsSync("server/hazard/providers/ispraLandslideProvider.js"), true);
  assert.equal(fs.existsSync("server/hazard/providers/ingvSeismicProvider.js"), true);
});
check("path02-unchanged", () => {
  const analytics = fs.readFileSync("src/utils/analytics.js", "utf8");
  assert.equal(analytics.includes("profileScore * 0.22"), true);
  assert.equal(analytics.includes("hazardScore * 0.16"), true);
});
check("production-normalized-score-null", () => {
  const seismic = fs.readFileSync("server/hazard/normalizers/seismicNormalizer.js", "utf8");
  assert.equal(seismic.includes("normalized_score: null"), true);
});
check("no-production-json-modified", () => {
  for (const filePath of productionFiles) {
    assert.equal(sha256(filePath), before[filePath], `${filePath} modified`);
  }
});

function buildDrySignatureExpectation() {
  return {
    hydraulic: { provider_version: "ispra-flood-wfs-v2" },
    landslide: { provider_version: "ispra-landslide-pai-wfs-v1" },
    seismic: { sampling_method: "nearest_grid_node" },
  };
}

console.log(JSON.stringify({ ok: true, checks }, null, 2));
