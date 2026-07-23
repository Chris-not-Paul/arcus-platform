import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  buildMitigationIntelligence,
  synchronizeMitigationProjectLocation,
} from "../server/mitigationIntelligenceService.js";
import {
  runValidation,
} from "./validate-mitigation-intelligence.js";
import {
  buildMitigationReportSummary,
} from "../src/utils/mitigationReportSummary.js";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function hydraulicEvent(eventId, {
  evidence = "documented",
  process = "scour",
  province = "Alessandria",
} = {}) {
  return {
    event_id: eventId,
    hydraulic_intelligence: {
      component_involved: "pier_foundation",
      evidence_level: evidence,
      failure_process: process,
      trigger: "flood",
    },
    province,
    specific_cause: "Hydraulic",
  };
}

const events = [
  hydraulicEvent("B01.01.01"),
  hydraulicEvent("B01.01.02"),
  hydraulicEvent("B01.01.03", { evidence: "probable" }),
  hydraulicEvent("B01.01.04", { process: "overtopping_or_hydrodynamic_action" }),
  hydraulicEvent("B02.01.01", { province: "Torino" }),
];
const sources = events.flatMap((event) => [
  { event_id: event.event_id, source_id: `${event.event_id}-S1` },
  { event_id: event.event_id, source_id: `${event.event_id}-S2` },
]);
const basePayload = {
  official_exposure: {
    hydraulic: {
      highest_class: "P2",
      matched_classes: ["P1", "P2"],
      status: "available",
    },
    landslide: {
      matched_hazard_classes: [],
      status: "no_intersection",
    },
    seismic: {
      pga_p50_g: 0.145,
      status: "available",
    },
  },
  project_context: "bridge",
  project_location: {
    derived_province: "Alessandria",
    latitude: 44.93406,
    longitude: 8.56362,
    validated: true,
  },
};
const provinceFeatures = [
  {
    geometry: {
      coordinates: [
        [
          [13.0, 43.2],
          [14.0, 43.2],
          [14.0, 44.0],
          [13.0, 44.0],
          [13.0, 43.2],
        ],
      ],
      type: "Polygon",
    },
    properties: {
      den_uts: "Ancona",
      sigla: "AN",
    },
    type: "Feature",
  },
];

function build(payload = basePayload, fixtureEvents = events) {
  return buildMitigationIntelligence({
    events: fixtureEvents,
    payload,
    sources,
  });
}

const available = build();

assert.equal(available.status, "available");
assert.equal(available.active_hazard_tracks[0].track, "hydraulic");
assert.equal(available.attention_tracks.some((item) => item.track === "seismic"), true);
assert.equal(available.evidence_cohort.province, "Alessandria");
assert.equal(available.evidence_cohort.event_count, 4);
assert.equal(available.evidence_cohort.event_ids.includes("B02.01.01"), false);
assert.equal(available.strategies[0].process, "scour");
assert.equal(available.strategies[0].arcus_evidence.raw_count, 3);
assert.equal(available.strategies[0].arcus_evidence.effective_evidence_count, 2.5);
assert.equal(available.strategies[0].external_validation_required, true);
assert.equal(available.forbidden_outputs.includes("final_priority_index_modification"), true);
assert.equal(Object.hasOwn(available, "score"), false);
assert.equal(Object.hasOwn(available, "final_priority_index"), false);

const synchronized = synchronizeMitigationProjectLocation(
  {
    ...basePayload,
    project_location: {
      ...basePayload.project_location,
      derived_province: "Torino",
      latitude: 43.6158,
      longitude: 13.5189,
    },
  },
  provinceFeatures
);
assert.equal(synchronized.project_location.derived_province, "Ancona");
assert.equal(synchronized.project_location.province_mismatch_corrected, true);
assert.equal(synchronized.project_location.validation_source, "server_point_in_polygon");

const synchronizedOutside = synchronizeMitigationProjectLocation(
  {
    ...basePayload,
    project_location: {
      ...basePayload.project_location,
      latitude: 48,
      longitude: 2,
    },
  },
  provinceFeatures
);
assert.equal(synchronizedOutside.project_location.validated, false);
assert.equal(synchronizedOutside.project_location.error, "point_outside_italy");

const deterministicLeft = build();
const deterministicRight = build();
delete deterministicLeft.generated_at;
delete deterministicRight.generated_at;
assert.deepEqual(deterministicLeft, deterministicRight);

const noIntersection = build({
  ...basePayload,
  official_exposure: {
    ...basePayload.official_exposure,
    hydraulic: {
      highest_class: null,
      matched_classes: [],
      status: "no_intersection",
    },
  },
});
assert.equal(noIntersection.status, "abstained");
assert.equal(noIntersection.strategies.length, 0);
assert.equal(
  noIntersection.abstention_reasons.includes("official_hydraulic_exposure_not_intersected"),
  true
);

const partialAvailable = build({
  ...basePayload,
  official_exposure: {
    ...basePayload.official_exposure,
    hydraulic: {
      assessment_complete: false,
      coverage: {
        failed_layers: [
          { class_name: "P1", status: "request_timeout" },
          { class_name: "P2", status: "request_timeout" },
        ],
      },
      decision_status: "available_partial",
      highest_class: "P3",
      matched_classes: ["P3"],
      status: "partial",
    },
  },
});
assert.equal(partialAvailable.status, "available_partial");
assert.equal(partialAvailable.strategies.length > 0, true);
assert.equal(
  partialAvailable.source_warnings.includes(
    "official_hydraulic_exposure_partial"
  ),
  true
);
assert.equal(
  partialAvailable.source_completeness.hydraulic.assessment_complete,
  false
);

const partialUnavailable = build({
  ...basePayload,
  official_exposure: {
    ...basePayload.official_exposure,
    hydraulic: {
      assessment_complete: false,
      coverage: {
        failed_layers: [
          { class_name: "P1", status: "request_timeout" },
        ],
      },
      decision_status: "source_incomplete",
      highest_class: null,
      matched_classes: [],
      status: "partial",
    },
  },
});
assert.equal(partialUnavailable.status, "abstained");
assert.equal(partialUnavailable.strategies.length, 0);
assert.equal(
  partialUnavailable.abstention_reasons.includes(
    "official_hydraulic_exposure_incomplete"
  ),
  true
);

const persistentCacheAvailable = build({
  ...basePayload,
  official_exposure: {
    ...basePayload.official_exposure,
    hydraulic: {
      ...basePayload.official_exposure.hydraulic,
      assessment_complete: true,
      decision_status: "available_complete",
      source: {
        freshness_status: "current",
        observation_mode: "persistent_cache",
        observed_at: "2026-07-23T06:45:00.000Z",
      },
    },
  },
});
assert.equal(persistentCacheAvailable.status, "available");
assert.equal(
  persistentCacheAvailable.source_warnings.includes(
    "official_hydraulic_exposure_from_persistent_cache"
  ),
  true
);
assert.equal(
  persistentCacheAvailable.source_completeness.hydraulic.observation_mode,
  "persistent_cache"
);
assert.equal(
  buildMitigationReportSummary(persistentCacheAvailable).sourceText.includes(
    "Provenance: persistent cache"
  ),
  true
);

const invalidLocation = build({
  ...basePayload,
  project_location: {
    derived_province: "",
    latitude: null,
    longitude: null,
    validated: false,
  },
});
assert.equal(invalidLocation.status, "abstained");
assert.equal(invalidLocation.abstention_reasons.includes("validated_project_location_required"), true);

const sparse = build(
  basePayload,
  [
    hydraulicEvent("B01.02.01"),
    hydraulicEvent("B01.02.02"),
  ]
);
assert.equal(sparse.status, "limited_evidence");
assert.equal(sparse.strategies[0].strategy_id, "hydraulic-generic-investigation");

const limitedReportSummary = buildMitigationReportSummary(sparse);
assert.equal(limitedReportSummary.status, "limited_evidence");
assert.equal(limitedReportSummary.evidenceText.includes("Raw evidence: 2"), true);
assert.equal(limitedReportSummary.evidenceText.includes("effective evidence: 2"), true);
assert.equal(limitedReportSummary.outcomeText.includes("Site-specific hydraulic"), true);
assert.equal(
  limitedReportSummary.warningText.includes("do not modify the Final Priority Index"),
  true
);

const abstainedReportSummary = buildMitigationReportSummary(noIntersection);
assert.equal(abstainedReportSummary.status, "abstained");
assert.equal(abstainedReportSummary.outcomeText.includes("zero strategies"), true);
assert.equal(
  abstainedReportSummary.outcomeText.includes(
    "official hydraulic exposure not intersected"
  ),
  true
);

const partialReportSummary = buildMitigationReportSummary(partialAvailable);
assert.equal(partialReportSummary.status, "available_partial");
assert.equal(partialReportSummary.sourceText.includes("ISPRA coverage: partial"), true);
assert.equal(partialReportSummary.sourceText.includes("P1, P2"), true);

const insufficient = build(
  basePayload,
  [hydraulicEvent("B01.03.01", { evidence: "probable" })]
);
assert.equal(insufficient.status, "abstained");
assert.equal(insufficient.strategies.length, 0);

const professionalEventsResource = JSON.parse(
  fs.readFileSync(
    path.join(ROOT, "private-data", "professional", "professional-events.json"),
    "utf8"
  )
);
const professionalEvents = Array.isArray(professionalEventsResource)
  ? professionalEventsResource
  : professionalEventsResource.events || [];

assert.equal(professionalEvents.length, 263);
assert.equal(
  professionalEvents.filter((event) => event.hydraulic_intelligence).length >= 200,
  true
);

const endToEndValidation = runValidation();
assert.equal(endToEndValidation.judgement, "validated_with_limitations");
assert.equal(endToEndValidation.results.length, 11);
assert.equal(
  endToEndValidation.checks.authenticated_professional_endpoint,
  true
);
assert.equal(endToEndValidation.checks.fpi_and_path02_anti_leakage, true);
assert.equal(endToEndValidation.checks.deterministic_event_order, true);

console.log(
  JSON.stringify(
    {
      engine_version: available.engine_version,
      fixture_status: available.status,
      production_event_count: professionalEvents.length,
      production_hydraulic_evidence_count: professionalEvents.filter(
        (event) => event.hydraulic_intelligence
      ).length,
      validation_cases: endToEndValidation.results.length,
      validation_judgement: endToEndValidation.judgement,
      tests: "passed",
    },
    null,
    2
  )
);
