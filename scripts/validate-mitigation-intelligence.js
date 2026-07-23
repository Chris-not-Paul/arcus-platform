import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  buildMitigationIntelligence,
  synchronizeMitigationProjectLocation,
} from "../server/mitigationIntelligenceService.js";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const THRESHOLDS = Object.freeze({
  evidence_weights: {
    documented: 1,
    needs_review: 0,
    probable: 0.5,
  },
  moderate: { effective_minimum: 5, raw_minimum: 8 },
  process_qualification: { effective_minimum: 2, raw_minimum: 3 },
  usable_cohort: { effective_minimum: 2 },
});

function readCollection(relativePath, key) {
  const resource = JSON.parse(
    fs.readFileSync(path.join(ROOT, relativePath), "utf8")
  );

  return Array.isArray(resource) ? resource : resource[key] || [];
}

const professionalEvents = readCollection(
  "private-data/professional/professional-events.json",
  "events"
);
const professionalSources = readCollection(
  "private-data/professional/professional-sources.json",
  "sources"
);
const provinceFeatures = readCollection(
  "public/data/geo/italy-provinces.geojson",
  "features"
);

const OFFICIAL_HYDRAULIC_SNAPSHOTS = Object.freeze({
  p1: {
    highest_class: "P1",
    matched_classes: ["P1"],
    status: "available",
    validation_reference:
      "docs/PROFESSIONAL_HYDRAULIC_EXPOSURE_VALIDATION.md#strict-class-signature-validation",
  },
  p2: {
    highest_class: "P2",
    matched_classes: ["P1", "P2"],
    status: "available",
    validation_reference:
      "docs/PROFESSIONAL_HYDRAULIC_EXPOSURE_VALIDATION.md#strict-class-signature-validation",
  },
  p3: {
    highest_class: "P3",
    matched_classes: ["P1", "P2", "P3"],
    status: "available",
    validation_reference:
      "docs/PROFESSIONAL_HYDRAULIC_EXPOSURE_VALIDATION.md#strict-class-signature-validation",
  },
  no_intersection: {
    highest_class: null,
    matched_classes: [],
    status: "no_intersection",
    validation_reference:
      "docs/PROFESSIONAL_HYDRAULIC_EXPOSURE_VALIDATION.md#strict-class-signature-validation",
  },
});

const CASES = Object.freeze([
  {
    coordinates: { latitude: 38.94973151, longitude: 8.72300141 },
    expected: { province: "Sud Sardegna", status: "abstained" },
    exposure: OFFICIAL_HYDRAULIC_SNAPSHOTS.p1,
    exposureBasis: "documented_live_ispra_snapshot",
    id: "ispra_real_p1",
    requestedProvince: "Cagliari",
  },
  {
    coordinates: { latitude: 38.9434071, longitude: 8.91222919 },
    expected: { province: "Cagliari", status: "limited_evidence" },
    exposure: OFFICIAL_HYDRAULIC_SNAPSHOTS.p2,
    exposureBasis: "documented_live_ispra_snapshot",
    id: "ispra_real_p2",
    requestedProvince: "Cagliari",
  },
  {
    coordinates: { latitude: 37.67112259, longitude: 12.58006927 },
    expected: { province: "Trapani", status: "abstained" },
    exposure: OFFICIAL_HYDRAULIC_SNAPSHOTS.p3,
    exposureBasis: "documented_live_ispra_snapshot",
    id: "ispra_real_p3",
    requestedProvince: "Palermo",
  },
  {
    coordinates: { latitude: 45.2897, longitude: 7.94194 },
    expected: { province: "Torino", status: "abstained" },
    exposure: OFFICIAL_HYDRAULIC_SNAPSHOTS.no_intersection,
    exposureBasis: "documented_live_ispra_snapshot",
    id: "ispra_no_intersection_torino",
    requestedProvince: "Torino",
  },
  {
    coordinates: { latitude: 45.0703, longitude: 7.6869 },
    expected: { province: "Torino", status: "available" },
    exposure: OFFICIAL_HYDRAULIC_SNAPSHOTS.p2,
    exposureBasis: "controlled_available_exposure_fixture",
    id: "abundant_hydraulic_evidence",
    requestedProvince: "Torino",
  },
  {
    coordinates: { latitude: 44.1025, longitude: 9.8241 },
    expected: { province: "La Spezia", status: "limited_evidence" },
    exposure: OFFICIAL_HYDRAULIC_SNAPSHOTS.p2,
    exposureBasis: "controlled_available_exposure_fixture",
    id: "limited_hydraulic_evidence",
    requestedProvince: "La Spezia",
  },
  {
    coordinates: { latitude: 44.9129, longitude: 8.6152 },
    expected: { province: "Alessandria", status: "abstained" },
    exposure: OFFICIAL_HYDRAULIC_SNAPSHOTS.p2,
    exposureBasis: "controlled_available_exposure_fixture",
    id: "insufficient_hydraulic_evidence",
    requestedProvince: "Alessandria",
  },
  {
    coordinates: { latitude: 48.8566, longitude: 2.3522 },
    expected: {
      locationError: "point_outside_italy",
      province: null,
      status: "abstained",
    },
    exposure: OFFICIAL_HYDRAULIC_SNAPSHOTS.p2,
    exposureBasis: "controlled_available_exposure_fixture",
    id: "outside_italy",
    requestedProvince: "Torino",
  },
  {
    coordinates: { latitude: 41.9, longitude: 12.5 },
    expected: {
      locationError: "province_not_resolved",
      province: null,
      status: "abstained",
    },
    exposure: OFFICIAL_HYDRAULIC_SNAPSHOTS.p2,
    exposureBasis: "controlled_available_exposure_fixture",
    id: "province_not_associable",
    requestedProvince: "Roma",
    resolverFeatures: [
      {
        geometry: {
          coordinates: [[
            [12.4, 41.8],
            [12.6, 41.8],
            [12.6, 42],
            [12.4, 42],
            [12.4, 41.8],
          ]],
          type: "Polygon",
        },
        properties: {},
        type: "Feature",
      },
    ],
  },
  {
    coordinates: { latitude: "not-a-coordinate", longitude: 12.5 },
    expected: {
      locationError: "invalid_coordinates",
      province: null,
      status: "abstained",
    },
    exposure: OFFICIAL_HYDRAULIC_SNAPSHOTS.p2,
    exposureBasis: "controlled_available_exposure_fixture",
    id: "invalid_coordinates",
    requestedProvince: "Roma",
  },
  {
    coordinates: { latitude: 43.6158, longitude: 13.5189 },
    expected: { province: "Ancona", status: "available" },
    exposure: OFFICIAL_HYDRAULIC_SNAPSHOTS.p2,
    exposureBasis: "controlled_available_exposure_fixture",
    id: "territorial_mismatch_ignored",
    requestedProvince: "Torino",
  },
]);

function stripVolatile(value) {
  const copy = structuredClone(value);
  delete copy.generated_at;
  delete copy.request_id;
  return copy;
}

function payloadFor(testCase) {
  return {
    official_exposure: {
      hydraulic: testCase.exposure,
      landslide: { matched_hazard_classes: [], status: "no_intersection" },
      seismic: { pga_p50_g: 0.1, status: "available" },
    },
    project_context: "bridge",
    project_location: {
      derived_province: testCase.requestedProvince,
      latitude: testCase.coordinates.latitude,
      longitude: testCase.coordinates.longitude,
      validated: true,
    },
  };
}

function evidenceLevelDistribution(eventIds) {
  const selected = new Set(eventIds);
  const distribution = {};

  professionalEvents.forEach((event) => {
    if (!selected.has(event.event_id)) {
      return;
    }

    const level = event.hydraulic_intelligence?.evidence_level || "unspecified";
    distribution[level] = (distribution[level] || 0) + 1;
  });

  return Object.fromEntries(
    Object.entries(distribution).sort(([left], [right]) =>
      left.localeCompare(right)
    )
  );
}

function linkedSources(eventIds) {
  const selected = new Set(eventIds);

  return professionalSources
    .filter((source) => selected.has(source.event_id))
    .map((source) => ({
      event_id: source.event_id,
      source_id: source.source_id,
      source_title: source.source_title,
      source_type: source.source_type,
      source_url: source.source_url,
    }))
    .sort((left, right) =>
      String(left.source_id).localeCompare(String(right.source_id))
    );
}

function summarizeCase(testCase, synchronizedPayload, intelligence) {
  const sources = linkedSources(intelligence.evidence_cohort.event_ids);
  const qualifiedProcesses = intelligence.evidence_cohort.processes
    .filter(
      (process) =>
        process.raw_count >= THRESHOLDS.process_qualification.raw_minimum &&
        process.effective_evidence_count >=
          THRESHOLDS.process_qualification.effective_minimum
    )
    .map((process) => process.process);

  return {
    abstention_reasons: intelligence.abstention_reasons,
    client_province: testCase.requestedProvince || null,
    coordinates: testCase.coordinates,
    derived_province:
      intelligence.decision_context.project_location.derived_province,
    effective_weighted_evidence:
      intelligence.evidence_cohort.effective_evidence_count,
    evidence_level_distribution: evidenceLevelDistribution(
      intelligence.evidence_cohort.event_ids
    ),
    external_validation_required: intelligence.strategies.length
      ? intelligence.strategies.every(
          (strategy) => strategy.external_validation_required === true
        )
      : null,
    final_status: intelligence.status,
    id: testCase.id,
    ispra: {
      basis: testCase.exposureBasis,
      highest_class: testCase.exposure.highest_class,
      matched_classes: testCase.exposure.matched_classes,
      status: testCase.exposure.status,
      validation_reference: testCase.exposure.validation_reference,
    },
    limitations: intelligence.limitations,
    location_error: synchronizedPayload.project_location.error || null,
    process_strength_distribution: intelligence.evidence_cohort.processes.map(
      (process) => ({
        effective_evidence_count: process.effective_evidence_count,
        evidence_strength: process.evidence_strength,
        process: process.process,
        raw_count: process.raw_count,
      })
    ),
    province_mismatch_corrected: Boolean(
      intelligence.decision_context.project_location.province_mismatch_corrected
    ),
    qualified_processes: qualifiedProcesses,
    raw_cohort: {
      event_count: intelligence.evidence_cohort.event_count,
      event_ids: intelligence.evidence_cohort.event_ids,
    },
    sources,
    strategies: intelligence.strategies.map((strategy) => ({
      event_ids: strategy.arcus_evidence.event_ids,
      external_validation_required: strategy.external_validation_required,
      process: strategy.process,
      strategy_id: strategy.strategy_id,
    })),
  };
}

function validateCase(testCase) {
  const synchronizedPayload = synchronizeMitigationProjectLocation(
    payloadFor(testCase),
    testCase.resolverFeatures || provinceFeatures
  );
  const intelligence = buildMitigationIntelligence({
    events: professionalEvents,
    payload: synchronizedPayload,
    sources: professionalSources,
  });

  assert.equal(intelligence.status, testCase.expected.status, testCase.id);
  assert.equal(
    intelligence.decision_context.project_location.derived_province,
    testCase.expected.province,
    `${testCase.id}: derived province`
  );

  if (testCase.expected.locationError) {
    assert.equal(
      synchronizedPayload.project_location.error,
      testCase.expected.locationError,
      `${testCase.id}: location error`
    );
  }

  if (testCase.exposure.status === "no_intersection") {
    assert.equal(intelligence.strategies.length, 0);
    assert.equal(
      intelligence.abstention_reasons.includes(
        "official_hydraulic_exposure_not_intersected"
      ),
      true
    );
  }

  return { intelligence, synchronizedPayload };
}

function syntheticEvent(eventId, {
  evidence = "documented",
  process = "scour",
  province = "Test Province",
} = {}) {
  return {
    event_id: eventId,
    hydraulic_intelligence: {
      component_involved: "pier_foundation",
      evidence_level: evidence,
      failure_process: process,
    },
    province,
  };
}

function syntheticBuild(events) {
  return buildMitigationIntelligence({
    events,
    payload: {
      official_exposure: {
        hydraulic: OFFICIAL_HYDRAULIC_SNAPSHOTS.p2,
      },
      project_location: {
        derived_province: "Test Province",
        latitude: 44,
        longitude: 10,
        validated: true,
      },
    },
    sources: [],
  });
}

function validateThresholdsAndInvariants() {
  const exactThreshold = syntheticBuild([
    syntheticEvent("T03"),
    syntheticEvent("T01", { evidence: "probable" }),
    syntheticEvent("T02", { evidence: "probable" }),
  ]);
  assert.equal(exactThreshold.status, "available");
  assert.equal(exactThreshold.strategies[0].arcus_evidence.raw_count, 3);
  assert.equal(
    exactThreshold.strategies[0].arcus_evidence.effective_evidence_count,
    2
  );

  const belowEffectiveThreshold = syntheticBuild([
    syntheticEvent("P01", { evidence: "probable" }),
    syntheticEvent("P02", { evidence: "probable" }),
    syntheticEvent("P03", { evidence: "probable" }),
  ]);
  assert.equal(belowEffectiveThreshold.status, "abstained");
  assert.equal(belowEffectiveThreshold.strategies.length, 0);

  const genericFallback = syntheticBuild([
    syntheticEvent("G01", { process: "scour" }),
    syntheticEvent("G02", {
      process: "bank_erosion_or_embankment_failure",
    }),
  ]);
  assert.equal(genericFallback.status, "limited_evidence");
  assert.equal(
    genericFallback.strategies[0].strategy_id,
    "hydraulic-generic-investigation"
  );

  const needsReview = syntheticBuild([
    syntheticEvent("N01", { evidence: "needs_review" }),
    syntheticEvent("N02", { evidence: "needs_review" }),
    syntheticEvent("N03", { process: "debris_flow_or_solid_transport" }),
    syntheticEvent("N04", {
      process: "bank_erosion_or_embankment_failure",
    }),
  ]);
  const needsReviewProcess = needsReview.evidence_cohort.processes.find(
    (process) => process.process === "scour"
  );
  assert.equal(needsReviewProcess.effective_evidence_count, 0);
  assert.equal(needsReview.status, "limited_evidence");

  const underRawThreshold = syntheticBuild([
    syntheticEvent("R01", { process: "scour" }),
    syntheticEvent("R02", { process: "scour" }),
    syntheticEvent("R03", {
      process: "bank_erosion_or_embankment_failure",
    }),
    syntheticEvent("R04", {
      process: "bank_erosion_or_embankment_failure",
    }),
    syntheticEvent("R05", {
      process: "bank_erosion_or_embankment_failure",
    }),
  ]);
  assert.equal(
    underRawThreshold.strategies.some((strategy) => strategy.process === "scour"),
    false
  );
  assert.equal(
    underRawThreshold.strategies.some(
      (strategy) =>
        strategy.process === "bank_erosion_or_embankment_failure"
    ),
    true
  );

  const ordered = syntheticBuild([
    syntheticEvent("D03"),
    syntheticEvent("D01"),
    syntheticEvent("D02"),
  ]);
  const reversed = syntheticBuild([
    syntheticEvent("D02"),
    syntheticEvent("D01"),
    syntheticEvent("D03"),
  ]);
  assert.deepEqual(stripVolatile(ordered), stripVolatile(reversed));

  const foreignOutcomes = syntheticBuild([
    syntheticEvent("C01"),
    syntheticEvent("C02"),
    syntheticEvent("C03"),
    syntheticEvent("FOREIGN", {
      process: "debris_flow_or_solid_transport",
      province: "Foreign Province",
    }),
  ]);
  assert.equal(foreignOutcomes.evidence_cohort.event_ids.includes("FOREIGN"), false);
  assert.equal(
    foreignOutcomes.evidence_cohort.selection_mode,
    "point_derived_province_fixed_before_outcome_synthesis"
  );
  assert.deepEqual(
    foreignOutcomes.evidence_cohort.outcome_fields_read_after_context_fixed,
    [
      "hydraulic_intelligence.failure_process",
      "hydraulic_intelligence.component_involved",
      "hydraulic_intelligence.evidence_level",
    ]
  );

  return {
    deterministic_event_order: true,
    documented_weight: 1,
    generic_fallback_only_for_usable_cohort: true,
    needs_review_weight: 0,
    no_under_threshold_process_strategy: true,
    outcomes_read_after_cohort_fixed: true,
    probable_weight: 0.5,
    process_threshold: THRESHOLDS.process_qualification,
  };
}

function validateStaticIntegration() {
  const server = fs.readFileSync(path.join(ROOT, "server/server.js"), "utf8");
  const apiClient = fs.readFileSync(
    path.join(ROOT, "src/utils/apiClient.js"),
    "utf8"
  );
  const professionalPage = fs.readFileSync(
    path.join(ROOT, "src/pages/ProfessionalPage.jsx"),
    "utf8"
  );
  const professionalData = fs.readFileSync(
    path.join(ROOT, "src/utils/analytics.js"),
    "utf8"
  );
  const endpointBlock = server.slice(
    server.indexOf('if (url.pathname === "/api/professional/mitigation-intelligence")'),
    server.indexOf('if (url.pathname === "/api/professional/report-jobs")')
  );
  assert.match(endpointBlock, /getAuthorisedSession\(request, "professional:read"\)/);
  assert.equal(
    endpointBlock.indexOf("synchronizeMitigationProjectLocation") <
      endpointBlock.indexOf("buildMitigationIntelligence"),
    true
  );
  assert.match(apiClient, /professionalMitigationIntelligence/);
  assert.match(apiClient, /X-ARCUS-CSRF-Token/);
  assert.match(professionalPage, /platform-mitigation-intelligence/);
  assert.match(professionalPage, /MITIGATION INTELLIGENCE/);
  assert.match(professionalPage, /effective weighted cases/);

  const path02Report = professionalPage.slice(
    professionalPage.indexOf("} else if (activeEntryPath === 1)"),
    professionalPage.indexOf("} else if (activeEntryPath === 2)")
  );
  assert.doesNotMatch(path02Report, /path01MitigationIntelligence/);
  assert.doesNotMatch(professionalData, /mitigationIntelligence/);
  assert.doesNotMatch(professionalData, /hydraulic_intelligence/);

  return {
    api_client_csrf: true,
    authenticated_professional_endpoint: true,
    endpoint_server_location_sync_before_cohort: true,
    fpi_and_path02_anti_leakage: true,
    report_section: true,
    ui_path01_card: true,
  };
}

export function runValidation() {
  const results = CASES.map((testCase) => {
    const first = validateCase(testCase);
    const second = validateCase(testCase);
    assert.deepEqual(
      stripVolatile(first.intelligence),
      stripVolatile(second.intelligence),
      `${testCase.id}: deterministic repeat`
    );

    return summarizeCase(
      testCase,
      first.synchronizedPayload,
      first.intelligence
    );
  });

  const mismatch = results.find(
    (result) => result.id === "territorial_mismatch_ignored"
  );
  assert.equal(mismatch.derived_province, "Ancona");
  assert.equal(mismatch.client_province, "Torino");
  assert.equal(mismatch.province_mismatch_corrected, true);

  const checks = {
    ...validateThresholdsAndInvariants(),
    ...validateStaticIntegration(),
  };

  return {
    checks,
    dataset: {
      hydraulic_evidence_events: professionalEvents.filter(
        (event) => event.hydraulic_intelligence
      ).length,
      professional_events: professionalEvents.length,
      professional_sources: professionalSources.length,
      province_features: provinceFeatures.length,
    },
    judgement: "validated_with_limitations",
    limitations: [
      "The deterministic harness replays locked signatures from previously documented live ISPRA checks; it is not a fresh network availability test.",
      "Mitigation Intelligence v1 is hydraulic-only and province-cohort coverage is uneven.",
      "An abstention or strategy is contextual decision support and cannot establish asset condition, safety, probability or a design prescription.",
    ],
    results,
    thresholds: THRESHOLDS,
    validation_version: "arcus-mitigation-intelligence-validation-v1",
  };
}

const invokedDirectly = process.argv[1] &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (invokedDirectly) {
  console.log(JSON.stringify(runValidation(), null, 2));
}
