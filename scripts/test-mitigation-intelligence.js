import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  buildMitigationIntelligence,
  synchronizeMitigationProjectLocation,
} from "../server/mitigationIntelligenceService.js";
import {
  buildNationalHazardAnalogueCohort,
} from "../server/collapseAnalogueService.js";
import {
  buildHydraulicEpisodeRegistry,
} from "../server/collapseEpisodeService.js";
import {
  runValidation,
} from "./validate-mitigation-intelligence.js";
import {
  buildMitigationReportSummary,
} from "../src/utils/mitigationReportSummary.js";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function fixtureDate(eventId) {
  const values = [...String(eventId).matchAll(/\d+/g)].map((match) =>
    Number(match[0])
  );
  const year = 2000 + ((values[0] || 0) % 25);
  const month = ((values[1] || 1) - 1) % 12 + 1;
  const ordinal = values[2] || values.at(-1) || 1;
  const day = ((ordinal - 1) * 4) % 28 + 1;

  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function hydraulicEvent(eventId, {
  date = undefined,
  evidence = "documented",
  episodeId = null,
  process = "scour",
  province = "Alessandria",
  region = "Piemonte",
} = {}) {
  return {
    date: date === undefined ? fixtureDate(eventId) : date,
    event_id: eventId,
    hydraulic_intelligence: {
      component_involved: "pier_foundation",
      evidence_level: evidence,
      ...(episodeId ? { episode_id: episodeId } : {}),
      failure_process: process,
      trigger: "flood",
    },
    province,
    region,
    specific_cause: "Hydraulic",
  };
}

const events = [
  hydraulicEvent("B01.01.01"),
  hydraulicEvent("B01.01.02"),
  hydraulicEvent("B01.01.03", { evidence: "probable" }),
  hydraulicEvent("B01.01.04", { process: "overtopping_or_hydrodynamic_action" }),
  hydraulicEvent("B01.01.05"),
  hydraulicEvent("B01.01.06", { evidence: "probable" }),
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

function build(
  payload = basePayload,
  fixtureEvents = events,
  {
    historicalSignatures = [],
    signatures = [],
  } = {}
) {
  return buildMitigationIntelligence({
    events: fixtureEvents,
    historicalSignatures,
    payload,
    signatures,
    sources,
  });
}

const available = build();

assert.equal(available.status, "available");
assert.equal(available.active_hazard_tracks[0].track, "hydraulic");
assert.equal(available.attention_tracks.some((item) => item.track === "seismic"), true);
assert.equal(available.evidence_cohort.province, "Alessandria");
assert.equal(available.evidence_cohort.event_count, 6);
assert.equal(available.evidence_cohort.event_ids.includes("B02.01.01"), false);
assert.equal(available.strategies[0].process, "scour");
assert.equal(available.strategies[0].arcus_evidence.raw_count, 5);
assert.equal(available.strategies[0].arcus_evidence.effective_evidence_count, 4);
assert.equal(available.strategies[0].external_validation_required, true);
assert.equal(available.forbidden_outputs.includes("final_priority_index_modification"), true);
assert.equal(Object.hasOwn(available, "score"), false);
assert.equal(Object.hasOwn(available, "final_priority_index"), false);
assert.equal(available.landslide_support.status, "abstained");
assert.equal(available.landslide_support.strategies.length, 0);
assert.equal(
  available.landslide_support.final_priority_index_contribution,
  "none"
);
assert.equal(available.seismic_support.status, "abstained");
assert.equal(available.seismic_support.strategies.length, 0);
assert.equal(
  available.seismic_support.final_priority_index_contribution,
  "none"
);
assert.equal(
  available.evidence_cohort.selection_mode,
  "point_derived_province_fallback_until_national_signature_coverage_ready"
);

function currentSignature(
  eventId,
  {
    hydraulicClass = "P2",
    landslideClass = null,
    pga = 0.145,
  } = {}
) {
  return {
    event_id: eventId,
    hydraulic: {
      highest_class: hydraulicClass,
      matched_classes:
        hydraulicClass === "P3"
          ? ["P1", "P2", "P3"]
          : hydraulicClass === "P2"
            ? ["P1", "P2"]
            : ["P1"],
      status: "available",
    },
    landslide: landslideClass
      ? {
          attention_area: false,
          highest_hazard_class: landslideClass,
          matched_hazard_classes: [landslideClass],
          status: "available",
        }
      : {
          attention_area: false,
          highest_hazard_class: null,
          matched_hazard_classes: [],
          status: "no_intersection",
        },
    seismic: {
      pga_p50_g: pga,
      status: "available",
    },
  };
}

const nationalSignatures = [
  currentSignature("B01.01.01", { pga: 0.146 }),
  currentSignature("B01.01.02", { pga: 0.151 }),
  currentSignature("B01.01.03", {
    hydraulicClass: "P1",
    pga: 0.142,
  }),
  currentSignature("B01.01.04", {
    hydraulicClass: "P3",
    landslideClass: "P1",
    pga: 0.19,
  }),
  currentSignature("B01.01.05", { pga: 0.147 }),
  currentSignature("B01.01.06", { pga: 0.149 }),
  currentSignature("B02.01.01", { pga: 0.14 }),
];
const historicalSignatures = [
  {
    event_id: "B02.01.01",
    historical_at_event: {
      classification_year: 2001,
      source: {
        title: "Authenticated historical fixture",
      },
      status: "available_documented",
    },
  },
];
const national = build(basePayload, events, {
  historicalSignatures,
  signatures: nationalSignatures,
});

assert.equal(
  national.evidence_cohort.selection_mode,
  "national_current_hazard_signature_fixed_before_outcome_synthesis"
);
assert.equal(national.evidence_cohort.analogue_retrieval.production_ready, true);
assert.equal(
  national.evidence_cohort.analogue_retrieval.retrieval_contract
    .geography_filter,
  "none_national_scope"
);
assert.deepEqual(
  national.evidence_cohort.analogue_retrieval.retrieval_contract
    .outcome_fields_used_for_selection,
  []
);
assert.equal(
  national.evidence_cohort.event_ids.includes("B02.01.01"),
  true
);
assert.equal(
  national.evidence_cohort.analogue_retrieval.analogues.find(
    (item) => item.event.event_id === "B02.01.01"
  ).temporal_evidence.historical_at_event.status,
  "available_documented"
);
assert.equal(
  national.evidence_cohort.analogue_retrieval.analogues.find(
    (item) => item.event.event_id === "B01.01.01"
  ).temporal_evidence.historical_at_event.status,
  "not_available_not_reconstructed"
);
assert.equal(national.strategies[0].process, "scour");
assert.equal(
  national.evidence_cohort.retrieval_robustness.applied,
  true
);
assert.equal(
  national.strategies[0].arcus_evidence.retrieval_window_support
    .consensus_reached,
  true
);
assert.equal(
  national.strategies[0].arcus_evidence.retrieval_window_support
    .qualifying_window_count >= 2,
  true
);
assert.equal(
  national.strategies[0].applicability_conditions.some((item) =>
    item.includes("national current-hazard analogue cohort")
  ),
  true
);
const nationalReportSummary = buildMitigationReportSummary(national);
assert.equal(
  nationalReportSummary.landslideSupportText.includes("zero strategies"),
  true
);
assert.equal(
  nationalReportSummary.seismicSupportText.includes("zero strategies"),
  true
);
assert.equal(
  nationalReportSummary.cohortText.includes("national analogues"),
  true
);
assert.equal(
  nationalReportSummary.cohortText.includes(
    "Causes and processes are read after retrieval"
  ),
  true
);
assert.equal(
  nationalReportSummary.registryQualityText.includes(
    "Episode-registry quality"
  ),
  true
);
assert.equal(
  national.strategies[0].arcus_evidence.episode_support.every(
    (episode) =>
      Boolean(episode.confidence) &&
      Boolean(episode.review_status) &&
      Array.isArray(episode.grouping_basis)
  ),
  true
);

const outcomeMutatedEvents = events.map((event) =>
  event.event_id === "B02.01.01"
    ? hydraulicEvent("B02.01.01", {
        process: "debris_flow_or_solid_transport",
        province: "Torino",
      })
    : event
);
const beforeOutcomeMutation = buildNationalHazardAnalogueCohort({
  events,
  historicalSignatures,
  officialExposure: basePayload.official_exposure,
  signatures: nationalSignatures,
});
const afterOutcomeMutation = buildNationalHazardAnalogueCohort({
  events: outcomeMutatedEvents,
  historicalSignatures,
  officialExposure: basePayload.official_exposure,
  signatures: nationalSignatures,
});
assert.deepEqual(
  beforeOutcomeMutation.analogues.map((item) => item.event.event_id),
  afterOutcomeMutation.analogues.map((item) => item.event.event_id)
);

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
assert.equal(
  limitedReportSummary.evidenceText.includes(
    "independent hydraulic episodes: 2"
  ),
  true
);
assert.equal(limitedReportSummary.outcomeText.includes("Site-specific hydraulic"), true);
assert.equal(
  limitedReportSummary.warningText.includes("do not modify the Final Priority Index"),
  true
);
assert.equal(
  limitedReportSummary.cohortText.includes(
    "controlled provincial fallback"
  ),
  true
);
assert.equal(limitedReportSummary.cohortText.includes("80%"), true);

const abstainedReportSummary = buildMitigationReportSummary(noIntersection);
assert.equal(abstainedReportSummary.status, "abstained");
assert.equal(
  noIntersection.evidence_cohort.selection_mode,
  "point_derived_province_context_only_official_point_not_intersected"
);
assert.equal(
  abstainedReportSummary.cohortText.includes(
    "national retrieval was not activated"
  ),
  true
);
assert.equal(
  abstainedReportSummary.cohortText.includes(
    "territorial historical context only"
  ),
  true
);
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

const episodeFixture = [
  hydraulicEvent("EP.01", { date: "2020-10-03", region: "Piemonte" }),
  hydraulicEvent("EP.02", { date: "2020-10-03", region: "Liguria" }),
  hydraulicEvent("EP.03", { date: "2020-10-05", region: "Piemonte" }),
  hydraulicEvent("EP.04", { date: "2020-10-04", region: "Sicilia" }),
  hydraulicEvent("EP.05", { date: "2021-01-01", region: "Piemonte" }),
];
const episodeRegistry = buildHydraulicEpisodeRegistry(episodeFixture);
const reversedEpisodeRegistry = buildHydraulicEpisodeRegistry(
  [...episodeFixture].reverse()
);

assert.deepEqual(episodeRegistry, reversedEpisodeRegistry);
assert.equal(episodeRegistry.episode_count, 3);
assert.equal(
  episodeRegistry.event_to_episode["EP.01"],
  episodeRegistry.event_to_episode["EP.02"]
);
assert.equal(
  episodeRegistry.event_to_episode["EP.01"],
  episodeRegistry.event_to_episode["EP.03"]
);
assert.notEqual(
  episodeRegistry.event_to_episode["EP.01"],
  episodeRegistry.event_to_episode["EP.04"]
);

const sourceLinkedRegistry = buildHydraulicEpisodeRegistry(
  [
    hydraulicEvent("SOURCE.01", {
      date: "2020-10-03",
      region: "Piemonte",
    }),
    hydraulicEvent("SOURCE.02", {
      date: "2020-10-03",
      region: "Liguria",
    }),
  ],
  [
    {
      event_id: "SOURCE.01",
      source_role: "Official/Technical",
      source_title: "Shared flood report",
      source_url: "https://example.test/flood-report",
    },
    {
      event_id: "SOURCE.02",
      source_role: "Official/Technical",
      source_title: "Shared flood report",
      source_url: "https://example.test/flood-report",
    },
  ]
);

assert.equal(
  sourceLinkedRegistry.episodes[0].confidence,
  "source_linked_documentation"
);
assert.equal(
  sourceLinkedRegistry.episodes[0].review_status,
  "supported_by_shared_sources"
);

const curatedSeparation = buildHydraulicEpisodeRegistry([
  hydraulicEvent("CURATED.01", {
    date: "2020-10-03",
    episodeId: "hydraulic:curated:north",
  }),
  hydraulicEvent("CURATED.02", {
    date: "2020-10-03",
    episodeId: "hydraulic:curated:south",
  }),
]);

assert.equal(curatedSeparation.episode_count, 2);
assert.notEqual(
  curatedSeparation.event_to_episode["CURATED.01"],
  curatedSeparation.event_to_episode["CURATED.02"]
);

const curatedMerge = buildHydraulicEpisodeRegistry([
  hydraulicEvent("CURATED.03", {
    date: "2020-10-03",
    episodeId: "hydraulic:curated:verified",
  }),
  hydraulicEvent("CURATED.04", {
    date: "2020-10-10",
    episodeId: "hydraulic:curated:verified",
  }),
]);

assert.equal(curatedMerge.episode_count, 1);
assert.equal(
  curatedMerge.episodes[0].confidence,
  "curated_episode_assignment"
);
assert.throws(
  () =>
    buildHydraulicEpisodeRegistry([
      hydraulicEvent("CURATED.INVALID", {
        episodeId: "hydraulic:2020-10-03",
      }),
    ]),
  /Invalid curated hydraulic episode ID/
);

const repeatedBridgeEpisode = build(
  basePayload,
  [
    hydraulicEvent("REPEAT.01", { date: "2020-10-03" }),
    hydraulicEvent("REPEAT.02", { date: "2020-10-03" }),
    hydraulicEvent("REPEAT.03", { date: "2020-10-03" }),
    hydraulicEvent("REPEAT.04", { date: "2020-10-03" }),
  ]
);

assert.equal(repeatedBridgeEpisode.status, "abstained");
assert.equal(repeatedBridgeEpisode.evidence_cohort.episode_count, 1);
assert.equal(
  repeatedBridgeEpisode.evidence_cohort
    .episode_effective_evidence_count,
  1
);
assert.equal(
  repeatedBridgeEpisode.abstention_reasons.includes(
    "insufficient_independent_hydraulic_episode_evidence"
  ),
  true
);

const undatedEvidence = build(
  basePayload,
  [
    hydraulicEvent("UNDATED.01", { date: null }),
    hydraulicEvent("UNDATED.02", { date: null }),
    hydraulicEvent("UNDATED.03", { date: null }),
    hydraulicEvent("UNDATED.04", { date: null }),
    hydraulicEvent("UNDATED.05", { date: null }),
  ]
);

assert.equal(undatedEvidence.status, "abstained");
assert.equal(undatedEvidence.evidence_cohort.event_count, 5);
assert.equal(undatedEvidence.evidence_cohort.episode_count, 0);
assert.equal(undatedEvidence.evidence_cohort.undated_event_count, 5);

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
