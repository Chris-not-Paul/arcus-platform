import assert from "node:assert/strict";
import fs from "node:fs";

import {
  auditMatcherFeatureExclusion,
  buildFailurePatternTaxonomy,
  buildMitigationKnowledgeBase,
} from "./analyze-collapse-intelligence.js";
import {
  readXlsxHeaders,
} from "./lib/xlsx-reader.js";
import {
  getOpenEvents,
  getProfessionalResource,
} from "../server/dataService.js";
import {
  applyHydraulicOutcomeOverrides,
  normalizeHydraulicIntelligence,
  summarizeHydraulicCohort,
  validateHydraulicOutcomeOverrides,
} from "../src/utils/hydraulicIntelligence.js";

const checks = [];
const pendingChecks = [];
const SOURCE_HEADERS = [
  "failure_trigger",
  "failure_process",
  "component_involved",
  "failure_cause_evidence",
];

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8").replace(/^\uFEFF/, ""));
}

function check(name, fn) {
  const result = fn();

  if (result && typeof result.then === "function") {
    pendingChecks.push(result);
  }

  checks.push(name);
}

function requiredHeaderCheck(headers) {
  const missing = SOURCE_HEADERS.filter(
    (field) => !headers.includes(field)
  );

  if (missing.length) {
    throw new Error(`Missing hydraulic header(s): ${missing.join(", ")}`);
  }

  return true;
}

const excelPath = "private-data/raw/MASTER_RESEARCH.xlsx";
const headers = readXlsxHeaders(excelPath, "EVENTS");
const professional = readJson("private-data/professional/professional-events.json").events;
const events = professional;
const sources = readJson("private-data/professional/professional-sources.json").sources;
const audit = readJson("private-data/professional/hydraulic-intelligence-audit.json");
const overrides = readJson("config/collapse-intelligence/hydraulic-outcome-overrides.json");

check("excel-columns-by-header", () => {
  assert.equal(requiredHeaderCheck(headers), true);
});
check("excel-missing-column-detected", () => {
  assert.throws(
    () => requiredHeaderCheck(headers.filter((field) => field !== "failure_process")),
    /failure_process/
  );
});
check("trim-values", () => {
  const result = normalizeHydraulicIntelligence({
    hydraulic_component_involved: " Unspecified ",
    hydraulic_evidence_level: " Documented ",
    hydraulic_failure_process: " Scour ",
    hydraulic_trigger: " Flood ",
    specific_cause: "Hydraulic",
  });

  assert.equal(result.hydraulic_intelligence.failure_process, "scour");
  assert.equal(result.hydraulic_intelligence.evidence_level, "documented");
});
check("alias-normalized", () => {
  const result = normalizeHydraulicIntelligence({
    hydraulic_component_involved: "Unspecified",
    hydraulic_evidence_level: "Unspecified",
    hydraulic_failure_process: "Unspecified",
    hydraulic_trigger: "Hydraulic event - unspecified",
    specific_cause: "Hydraulic",
  });

  assert.equal(result.hydraulic_intelligence.trigger, "hydraulic_event_unspecified");
});
check("invalid-enum-warning", () => {
  const result = normalizeHydraulicIntelligence({
    hydraulic_component_involved: "Unspecified",
    hydraulic_evidence_level: "High",
    hydraulic_failure_process: "Scour",
    hydraulic_trigger: "Flood",
    specific_cause: "Hydraulic",
  });

  assert.equal(
    result.warnings.some((warning) => warning.code === "hydraulic_evidence_level_unrecognized"),
    true
  );
});
check("non-hydraulic-null", () => {
  const result = normalizeHydraulicIntelligence({
    hydraulic_failure_process: "Scour",
    specific_cause: "Landslide",
  });

  assert.equal(result.hydraulic_intelligence, null);
});
check("specific-process", () => {
  const result = normalizeHydraulicIntelligence({
    hydraulic_component_involved: "Unspecified",
    hydraulic_evidence_level: "Probable",
    hydraulic_failure_process: "Bank erosion / embankment failure",
    hydraulic_trigger: "Flood",
    specific_cause: "Hydraulic",
  });

  assert.equal(result.hydraulic_intelligence.failure_process, "bank_erosion_or_embankment_failure");
});
check("unspecified-process-null", () => {
  const result = normalizeHydraulicIntelligence({
    hydraulic_component_involved: "Unspecified",
    hydraulic_evidence_level: "Unspecified",
    hydraulic_failure_process: "Unspecified",
    hydraulic_trigger: "Flood",
    specific_cause: "Hydraulic",
  });

  assert.equal(result.hydraulic_intelligence.failure_process, null);
});
check("missing-component-null", () => {
  const result = normalizeHydraulicIntelligence({
    hydraulic_evidence_level: "Documented",
    hydraulic_failure_process: "Scour",
    hydraulic_trigger: "Flood",
    specific_cause: "Hydraulic",
  });

  assert.equal(result.hydraulic_intelligence.component_involved, null);
});
check("missing-evidence-warning", () => {
  const result = normalizeHydraulicIntelligence({
    hydraulic_failure_process: "Scour",
    hydraulic_trigger: "Flood",
    specific_cause: "Hydraulic",
  });

  assert.equal(
    result.warnings.some((warning) => warning.code === "hydraulic_evidence_level_missing"),
    true
  );
});
check("deterministic-output", () => {
  const event = {
    hydraulic_component_involved: "Unspecified",
    hydraulic_evidence_level: "Probable",
    hydraulic_failure_process: "Scour",
    hydraulic_trigger: "Flood",
    specific_cause: "Hydraulic",
  };

  assert.deepEqual(
    normalizeHydraulicIntelligence(event),
    normalizeHydraulicIntelligence(event)
  );
});
check("canonical-structure-and-taxonomy-version", () => {
  const sample = events.find((event) => event.hydraulic_intelligence);

  assert.equal(sample.hydraulic_intelligence.taxonomy_version, "hydraulic-v2");
  assert.deepEqual(
    Object.keys(sample.hydraulic_intelligence).sort(),
    [
      "component_involved",
      "evidence_level",
      "failure_process",
      "taxonomy_version",
      "trigger",
    ]
  );
});
check("no-physical-value-invented", () => {
  const unspecified = events.find(
    (event) =>
      event.specific_cause === "Hydraulic" &&
      event.hydraulic_intelligence?.failure_process === null
  );

  assert.equal(unspecified.hydraulic_intelligence.component_involved, null);
});
check("event-and-source-counts", () => {
  assert.equal(events.length, 260);
  assert.equal(professional.length, 260);
  assert.equal(sources.length, 1057);
});
check("audit-counts", () => {
  assert.equal(audit.hydraulic_events, 210);
  assert.equal(audit.summary.documented, 145);
  assert.equal(audit.summary.probable, 14);
  assert.equal(audit.summary.needs_review, 22);
  assert.equal(audit.summary.unspecified, 29);
});
check("verdura-superseded-override-is-archived-not-applied", async () => {
  const verdura = professional.find((event) => event.event_id === "B13.02.01");

  assert.equal(validateHydraulicOutcomeOverrides(overrides).ok, true);
  assert.equal(verdura.hydraulic_intelligence.failure_process, "scour");
  assert.equal(overrides.overrides.length, 0);
  assert.equal(overrides.archived_overrides[0].event_id, "B13.02.01");
  assert.equal(verdura.hydraulic_outcome_curation, undefined);
  const openVerdura = (await getOpenEvents()).find((event) => event.event_id === "IT13.02.01");
  assert.deepEqual(verdura.hydraulic_intelligence, openVerdura.hydraulic_intelligence);
});
check("hydraulic-override-rejects-source-drift", () => {
  assert.throws(
    () => applyHydraulicOutcomeOverrides([
      {
        event_id: "B13.02.01",
        hydraulic_intelligence: {
          ...overrides.archived_overrides[0].previous_hydraulic_intelligence,
          failure_process: "scour",
        },
      },
    ], { ...overrides, overrides: overrides.archived_overrides }),
    /source values changed/
  );
});
check("professional-scope-includes-hydraulic-intelligence", () => {
  assert.equal(
    professional.some((event) => event.hydraulic_intelligence?.taxonomy_version === "hydraulic-v2"),
    true
  );
});
check("professional-resource-includes-hydraulic-intelligence", async () => {
  const resource = await getProfessionalResource("professional-events");

  assert.equal(
    resource.events.some((event) => event.hydraulic_intelligence?.taxonomy_version === "hydraulic-v2"),
    true
  );
});
check("open-scope-includes-historical-hydraulic-intelligence", async () => {
  const openEvents = await getOpenEvents();
  const openVerdura = openEvents.find((event) => event.event_id === "IT13.02.01");

  assert.equal(openEvents.length, 260);
  assert.equal(openEvents.some((event) => event.hydraulic_intelligence?.taxonomy_version === "hydraulic-v2"), true);
  assert.equal(openEvents.some((event) => event.hydraulic_outcome_curation), false);
  assert.equal(openVerdura.hydraulic_intelligence.failure_process, "scour");
});
check("matcher-feature-audit", () => {
  const result = auditMatcherFeatureExclusion();

  assert.equal(result.leakage_detected, false);
  assert.equal(result.matching_features.includes("hydraulic_failure_process"), false);
  assert.equal(result.blocked_outcome_fields.includes("hydraulic_failure_process"), true);
});
check("cohort-aggregation", () => {
  const cohort = summarizeHydraulicCohort(events);

  assert.equal(cohort.total_cases, 210);
  assert.equal(cohort.mechanism_documented_cases, 145);
  assert.equal(cohort.mechanism_probable_cases, 14);
  assert.equal(cohort.mechanism_needs_review_cases, 22);
  assert.equal(cohort.mechanism_unspecified_cases, 29);
  assert.equal(cohort.failure_processes.some((item) => item.raw_count > 0), true);
  assert.equal(cohort.effective_evidence_count, 152);
});
check("mitigation-draft-and-external-validation", () => {
  const knowledge = buildMitigationKnowledgeBase(
    buildFailurePatternTaxonomy(events),
    events
  );
  const entry = knowledge.entries.find((item) => item.hazard_family === "hydraulic");

  assert.equal(entry.status, "draft");
  assert.equal(entry.external_validation_required, true);
  assert.equal(
    entry.investigation_priorities.every((item) => item.status === "draft" && item.external_validation_required),
    true
  );
});

await Promise.all(pendingChecks);

console.log(
  JSON.stringify(
    {
      checks,
      ok: true,
    },
    null,
    2
  )
);
