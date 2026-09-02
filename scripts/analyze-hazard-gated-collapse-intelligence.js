import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  buildSourceReliabilityByEvent,
} from "../src/utils/analytics.js";
import {
  buildFailurePatternTaxonomy,
  causeFamilyForEvent,
} from "./analyze-collapse-intelligence.js";
import { readProfessionalDataset } from "./lib/professional-dataset.js";
import {
  HYDRAULIC_MATCHER_BLOCKED_FIELDS,
} from "../src/utils/hydraulicIntelligence.js";
import {
  LANDSLIDE_MATCHER_BLOCKED_FIELDS,
} from "../src/utils/landslideIntelligence.js";
import {
  buildHydraulicEpisodeRegistry,
} from "../server/collapseEpisodeService.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, "..");
const OUTPUT_DIR = path.join(
  ROOT,
  "private-data",
  "professional",
  "collapse-intelligence"
);
const ANALYSIS_PATH = path.join(OUTPUT_DIR, "hazard-gated-intelligence-analysis.json");
const VALIDATION_PATH = path.join(OUTPUT_DIR, "analogue-retrieval-validation.json");
const EXPERT_REVIEW_PATH = path.join(OUTPUT_DIR, "expert-review-package.json");
const CAVEAT =
  "Current official hazard context at the documented collapse location; not retrospective proof of causation.";

const TRACKS = ["hydraulic", "landslide", "seismic", "multi_hazard"];
const COMPLETED_STATUSES = new Set(["available", "no_intersection", "outside_coverage"]);
const ERROR_STATUSES = new Set([
  "configuration_error",
  "http_error",
  "invalid_coordinates",
  "invalid_response",
  "provider_exception",
  "request_timeout",
  "schema_mismatch",
  "service_unreachable",
]);
const HYDRAULIC_PATTERNS = [
  "scour",
  "foundation_undermining",
  "pier_instability",
  "abutment_instability",
  "overtopping",
  "debris_obstruction",
  "channel_migration",
  "approach_embankment_erosion",
  "flood_impact",
  "unspecified_hydraulic_mechanism",
];
const MATCHING_FEATURES = [
  "hazard_signature",
  "bridge_use",
  "crossing_type",
  "material",
  "structural_typology",
  "construction_age",
  "span_count",
  "waterway_context",
  "province",
  "region",
];
const BLOCKED_OUTCOME_FIELDS = [
  "cause_category",
  "specific_cause",
  ...HYDRAULIC_MATCHER_BLOCKED_FIELDS,
  ...LANDSLIDE_MATCHER_BLOCKED_FIELDS,
  "triggered",
  "failure_mechanism",
  "failed_component",
  "collapse_severity",
  "victims",
  "injuries",
  "description",
  "source_title",
  "source_text",
  "source_keywords",
];
const FEATURE_WEIGHTS = {
  bridge_use: 8,
  construction_age: 4,
  crossing_type: 12,
  hazard_signature: 24,
  material: 12,
  province: 2,
  region: 3,
  span_count: 4,
  structural_typology: 12,
  waterway_context: 6,
};
const RETRIEVAL_MODES = {
  geography_only: ["province", "region"],
  hazard_class_only: ["hazard_signature"],
  hazard_project_profile: [
    "hazard_signature",
    "bridge_use",
    "crossing_type",
    "material",
    "structural_typology",
    "waterway_context",
  ],
  hazard_project_profile_limited_territory: [
    "hazard_signature",
    "bridge_use",
    "crossing_type",
    "material",
    "structural_typology",
    "waterway_context",
    "province",
    "region",
  ],
  project_profile_only: [
    "bridge_use",
    "crossing_type",
    "material",
    "structural_typology",
    "waterway_context",
  ],
  project_informed_retrieval: [
    "hazard_signature",
    "bridge_use",
    "crossing_type",
    "material",
    "structural_typology",
    "waterway_context",
    "province",
    "region",
  ],
};

function readJson(filePath, fallback = null) {
  if (!fs.existsSync(filePath)) {
    return fallback;
  }

  return JSON.parse(fs.readFileSync(filePath, "utf8").replace(/^\uFEFF/, ""));
}

function writeJson(filePath, value) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(`${filePath}.tmp`, JSON.stringify(value, null, 2), "utf8");
  fs.renameSync(`${filePath}.tmp`, filePath);
}

function normalize(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();
}

function key(value) {
  return normalize(value).replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "");
}

function round(value, decimals = 4) {
  if (!Number.isFinite(value)) {
    return null;
  }

  const factor = 10 ** decimals;

  return Math.round(value * factor) / factor;
}

function countBy(values) {
  return values.reduce((accumulator, value) => {
    accumulator[value] = (accumulator[value] || 0) + 1;

    return accumulator;
  }, {});
}

function eventYear(event) {
  const match = String(event?.date || "").match(/\d{4}/);

  return match ? Number(match[0]) : null;
}

function sourceWeight(reliability) {
  const grade = reliability?.grade || "D";

  return {
    A: 1,
    B: 0.85,
    C: 0.6,
    D: 0.35,
  }[grade] || 0.35;
}

function stableIndex(seed, length) {
  if (!length) {
    return 0;
  }

  let hash = 0;

  for (const char of String(seed)) {
    hash = (hash * 33 + char.charCodeAt(0)) >>> 0;
  }

  return hash % length;
}

function highestHydraulicClass(signature) {
  const classes = signature?.hydraulic?.matched_classes || [];

  if (classes.includes("P3")) {
    return "P3";
  }

  if (classes.includes("P2")) {
    return "P2";
  }

  if (classes.includes("P1")) {
    return "P1";
  }

  if (signature?.hydraulic?.status === "no_intersection") {
    return "no_intersection";
  }

  return signature?.hydraulic?.status || "unavailable";
}

function highestLandslideClass(signature) {
  const classes = signature?.landslide?.matched_hazard_classes || [];

  for (const hazardClass of ["P4", "P3", "P2", "P1"]) {
    if (classes.includes(hazardClass)) {
      return hazardClass;
    }
  }

  if (signature?.landslide?.attention_area) {
    return "AA";
  }

  if (signature?.landslide?.status === "no_intersection") {
    return "no_intersection";
  }

  return signature?.landslide?.status || "unavailable";
}

function seismicBand(signature, percentiles) {
  const pga = signature?.seismic?.pga_p50_g;

  if (signature?.seismic?.status === "outside_coverage") {
    return "outside_coverage";
  }

  if (signature?.seismic?.status !== "available" || !Number.isFinite(Number(pga))) {
    return signature?.seismic?.status || "unavailable";
  }

  if (pga >= percentiles.p75) {
    return "empirical_p75_p100";
  }

  if (pga >= percentiles.p50) {
    return "empirical_p50_p75";
  }

  if (pga >= percentiles.p25) {
    return "empirical_p25_p50";
  }

  return "empirical_p0_p25";
}

function computeSeismicPercentiles(signatures) {
  const values = signatures
    .map((signature) => Number(signature?.seismic?.pga_p50_g))
    .filter(Number.isFinite)
    .sort((left, right) => left - right);

  function percentile(p) {
    if (!values.length) {
      return null;
    }

    return values[Math.min(values.length - 1, Math.floor((values.length - 1) * p))];
  }

  return {
    available_count: values.length,
    p25: percentile(0.25),
    p50: percentile(0.5),
    p75: percentile(0.75),
  };
}

export function routeHazardsForSignature(signature, { projectProfile = {}, seismicPercentiles = {} } = {}) {
  const activeTracks = [];
  const attentionTracks = [];
  const unavailableTracks = [];
  const hydraulic = signature?.hydraulic || {};
  const landslide = signature?.landslide || {};
  const seismic = signature?.seismic || {};
  const hydraulicClasses = hydraulic.matched_classes || [];
  const landslideClasses = landslide.matched_hazard_classes || [];
  const seismicSensitive = Boolean(
    projectProfile.seismic_sensitive ||
      /masonry|arch|bearing|simply supported/i.test(String(projectProfile.structural_typology || ""))
  );

  if (hydraulicClasses.some((item) => ["P1", "P2", "P3"].includes(item))) {
    activeTracks.push({
      activation_basis: hydraulicClasses.map((item) => `ISPRA ${item} intersection`),
      status: "active",
      track: "hydraulic",
    });
  } else if (!COMPLETED_STATUSES.has(hydraulic.status)) {
    unavailableTracks.push({
      status: hydraulic.status || "unavailable",
      track: "hydraulic",
    });
  }

  if (landslideClasses.some((item) => ["P1", "P2", "P3", "P4"].includes(item))) {
    activeTracks.push({
      activation_basis: landslideClasses.map((item) => `ISPRA PAI ${item} intersection`),
      status: "active",
      track: "landslide",
    });
  } else if (!COMPLETED_STATUSES.has(landslide.status)) {
    unavailableTracks.push({
      status: landslide.status || "unavailable",
      track: "landslide",
    });
  }

  if (landslide.attention_area || (landslide.matched_attention_classes || []).includes("AA")) {
    attentionTracks.push({
      activation_basis: ["ISPRA PAI AA attention area"],
      status: "attention",
      track: "landslide_attention_area",
    });
  }

  if (seismic.status === "available") {
    attentionTracks.push({
      activation_basis: ["INGV MPS04 available contextual exposure"],
      rule_status: "candidate_rule_not_approved",
      status: "contextual",
      track: "seismic_context",
    });

    if (
      Number.isFinite(Number(seismic.pga_p50_g)) &&
      Number.isFinite(Number(seismicPercentiles.p75)) &&
      Number(seismic.pga_p50_g) >= Number(seismicPercentiles.p75)
    ) {
      attentionTracks.push({
        activation_basis: ["INGV MPS04 empirical p75-p100 band"],
        rule_status: "candidate_rule_not_approved",
        status: "attention",
        track: "seismic_percentile_band",
      });
    }

    if (seismicSensitive) {
      attentionTracks.push({
        activation_basis: ["project profile includes seismic-sensitive characteristics"],
        rule_status: "candidate_rule_not_approved",
        status: "attention",
        track: "seismic_project_profile",
      });
    }
  } else if (!COMPLETED_STATUSES.has(seismic.status)) {
    unavailableTracks.push({
      status: seismic.status || "unavailable",
      track: "seismic",
    });
  }

  if (activeTracks.length >= 2) {
    activeTracks.push({
      activation_basis: activeTracks
        .filter((item) => item.track !== "multi_hazard")
        .map((item) => item.track),
      status: "active",
      track: "multi_hazard",
    });
  }

  return {
    active_tracks: activeTracks,
    attention_tracks: attentionTracks,
    unavailable_tracks: unavailableTracks,
  };
}

function signatureByEvent(signatures) {
  return new Map((signatures || []).map((signature) => [signature.event_id, signature]));
}

function completedProvider(result) {
  return COMPLETED_STATUSES.has(result?.status);
}

function enrichmentStatus(signatures, manifest) {
  const rows = signatures || [];
  const dryRunEvents = rows.filter((signature) =>
    ["hydraulic", "landslide", "seismic"].some((provider) =>
      signature?.[provider]?.status === "not_queried_dry_run"
    )
  ).length;
  const hydraulicCompleted = rows.filter((signature) => completedProvider(signature.hydraulic)).length;
  const landslideCompleted = rows.filter((signature) => completedProvider(signature.landslide)).length;
  const seismicCompleted = rows.filter((signature) => completedProvider(signature.seismic)).length;
  const fullyEnriched = rows.filter((signature) =>
    completedProvider(signature.hydraulic) &&
    completedProvider(signature.landslide) &&
    completedProvider(signature.seismic)
  ).length;
  const partial = rows.filter((signature) =>
    !(
      completedProvider(signature.hydraulic) &&
      completedProvider(signature.landslide) &&
      completedProvider(signature.seismic)
    ) &&
    (
      completedProvider(signature.hydraulic) ||
      completedProvider(signature.landslide) ||
      completedProvider(signature.seismic)
    )
  ).length;

  return {
    dry_run_events: manifest?.dry_run_events ?? dryRunEvents,
    eligible_events: manifest?.eligible_events ?? rows.length,
    failed: manifest?.failed ?? manifest?.errors ?? rows.filter((signature) =>
      ["hydraulic", "landslide", "seismic"].some((provider) =>
        ERROR_STATUSES.has(signature?.[provider]?.status)
      )
    ).length,
    fully_enriched: manifest?.fully_enriched ?? fullyEnriched,
    hydraulic_completed: manifest?.hydraulic_completed ?? hydraulicCompleted,
    landslide_completed: manifest?.landslide_completed ?? landslideCompleted,
    partially_enriched: manifest?.partially_enriched ?? partial,
    pending: manifest?.pending ?? Math.max(rows.length - fullyEnriched - partial, 0),
    seismic_completed: manifest?.seismic_completed ?? seismicCompleted,
    total_events: manifest?.total_events ?? rows.length,
  };
}

function hazardSignatureForTrack(signature, track, seismicPercentiles) {
  if (track === "hydraulic") {
    return highestHydraulicClass(signature);
  }

  if (track === "landslide") {
    return highestLandslideClass(signature);
  }

  if (track === "seismic") {
    return seismicBand(signature, seismicPercentiles);
  }

  if (track === "multi_hazard") {
    return [
      highestHydraulicClass(signature),
      highestLandslideClass(signature),
      seismicBand(signature, seismicPercentiles),
    ].filter((item) => !["no_intersection", "unavailable", "not_queried_dry_run"].includes(item)).join("+") || "unavailable";
  }

  return "unavailable";
}

function eventProfile(event, signature, track, seismicPercentiles) {
  const year = eventYear(event);

  return {
    bridge_use: event.destination_use || null,
    construction_age: year && Number(event.construction_year)
      ? String(Math.max(year - Number(event.construction_year), 0))
      : null,
    crossing_type: event.bridge_crossing_type || null,
    hazard_signature: hazardSignatureForTrack(signature, track, seismicPercentiles),
    material: event.material_type || null,
    province: event.province || null,
    region: event.region || null,
    span_count: null,
    structural_typology: event.structural_type || null,
    waterway_context: event.bridge_crossing_name ? key(event.bridge_crossing_name).split("_").slice(0, 3).join("_") : null,
  };
}

function similarity({
  candidate,
  candidateSignature,
  features,
  seismicPercentiles,
  target,
  targetSignature,
  track,
}) {
  const targetProfile = eventProfile(target, targetSignature, track, seismicPercentiles);
  const candidateProfile = eventProfile(candidate, candidateSignature, track, seismicPercentiles);
  const matched = [];
  const mismatched = [];
  const missing = [];
  let score = 0;
  let possible = 0;

  for (const feature of features) {
    const weight = FEATURE_WEIGHTS[feature] || 0;

    if (!weight) {
      continue;
    }

    const targetValue = targetProfile[feature];
    const candidateValue = candidateProfile[feature];

    if (!targetValue || !candidateValue || ["unavailable", "not_queried_dry_run"].includes(targetValue) || ["unavailable", "not_queried_dry_run"].includes(candidateValue)) {
      missing.push({ candidate_value: candidateValue || null, feature, target_value: targetValue || null });
      continue;
    }

    possible += weight;

    if (key(targetValue) === key(candidateValue)) {
      score += weight;
      matched.push({ candidate_value: candidateValue, contribution: weight, feature, target_value: targetValue });
    } else {
      mismatched.push({ candidate_value: candidateValue, feature, target_value: targetValue });
    }
  }

  return {
    matched,
    missing,
    mismatched,
    similarity: possible ? round((score / possible) * 100, 3) : 0,
  };
}

function duplicateGroups(events, sources) {
  const byDateLocality = groupsBy(events, (event) =>
    `${event.date || ""}|${event.municipality || ""}|${event.province || ""}`
  );
  const byCrossing = groupsBy(events, (event) => key(event.bridge_name || event.bridge_crossing_name || ""));
  const bySource = groupsBy(sources, (source) => key(source.source_title || ""))
    .filter((group) => new Set(group.items.map((item) => item.event_id)).size > 1);
  const groupByEvent = {};

  [...byDateLocality, ...byCrossing, ...bySource].forEach((group, groupIndex) => {
    const id = `G${String(groupIndex + 1).padStart(4, "0")}`;

    group.event_ids.forEach((eventId) => {
      if (!groupByEvent[eventId]) {
        groupByEvent[eventId] = [];
      }

      groupByEvent[eventId].push(id);
    });
  });

  return {
    by_event: groupByEvent,
    same_crossing_groups: byCrossing.length,
    same_date_locality_groups: byDateLocality.length,
    same_source_title_groups: bySource.length,
  };
}

function groupsBy(items, getter) {
  const grouped = {};

  for (const item of items) {
    const groupKey = getter(item);

    if (!groupKey) {
      continue;
    }

    if (!grouped[groupKey]) {
      grouped[groupKey] = [];
    }

    grouped[groupKey].push(item);
  }

  return Object.entries(grouped)
    .filter(([, groupItems]) => groupItems.length > 1)
    .map(([groupKey, groupItems]) => ({
      event_ids: [...new Set(groupItems.map((item) => item.event_id).filter(Boolean))],
      items: groupItems,
      key: groupKey,
      size: groupItems.length,
    }));
}

function excludeDuplicateGroup(target, candidate, groupMap) {
  const targetGroups = new Set(groupMap[target.event_id] || []);

  if (!targetGroups.size) {
    return false;
  }

  return (groupMap[candidate.event_id] || []).some((groupId) => targetGroups.has(groupId));
}

function eventTrackActive(event, signature, track, seismicPercentiles) {
  const routed = routeHazardsForSignature(signature, {
    projectProfile: {
      structural_typology: event.structural_type,
    },
    seismicPercentiles,
  });

  if (track === "seismic") {
    return routed.attention_tracks.some((item) => item.track.startsWith("seismic"));
  }

  return routed.active_tracks.some((item) => item.track === track);
}

function outcomeForEvent(event, taxonomyMap) {
  const mapped = taxonomyMap.get(event.event_id);

  return {
    collapse_extent: event.collapse_severity || null,
    components_involved: componentsForEvent(event, mapped?.failure_pattern),
    evidence_confidence: mapped?.confidence || "unspecified",
    failure_pattern: mapped?.failure_pattern || "unspecified",
    specific_cause: event.specific_cause || null,
  };
}

function componentsForEvent(event, pattern) {
  const description = normalize(event.description);
  const components = [];

  if (/foundation|scour|undermin/.test(description) || String(pattern).includes("foundation")) {
    components.push("foundation/support");
  }

  if (/pier|pile/.test(description) || String(pattern).includes("pier")) {
    components.push("pier");
  }

  if (/abutment/.test(description)) {
    components.push("abutment");
  }

  if (/embankment|approach|retaining wall/.test(description) || String(pattern).includes("embankment")) {
    components.push("approach/embankment");
  }

  if (/deck|span|superstructure|beam/.test(description) || String(pattern).includes("superstructure")) {
    components.push("superstructure");
  }

  return components.length ? [...new Set(components)] : ["unspecified"];
}

function hydraulicMechanism(event, outcome) {
  const failureProcess = event.hydraulic_intelligence?.failure_process;

  if (failureProcess === "scour") {
    return "scour";
  }

  if (failureProcess === "bank_erosion_or_embankment_failure") {
    return "approach_embankment_erosion";
  }

  if (
    failureProcess === "debris_accumulation_or_obstruction" ||
    failureProcess === "debris_flow_or_solid_transport"
  ) {
    return "debris_obstruction";
  }

  if (failureProcess === "overtopping_or_hydrodynamic_action") {
    return "overtopping";
  }

  const description = normalize(event.description);

  if (/scour/.test(description)) {
    return "scour";
  }

  if (/foundation|undermin/.test(description)) {
    return "foundation_undermining";
  }

  if (/pier/.test(description)) {
    return "pier_instability";
  }

  if (/abutment/.test(description)) {
    return "abutment_instability";
  }

  if (/overtopping/.test(description)) {
    return "overtopping";
  }

  if (/debris|wood|trunk|ostru/.test(description)) {
    return "debris_obstruction";
  }

  if (/channel|alveo|migration/.test(description)) {
    return "channel_migration";
  }

  if (/embankment|approach|retaining wall/.test(description) || outcome.failure_pattern?.includes("embankment")) {
    return "approach_embankment_erosion";
  }

  if (/flood|alluvion|river|torrent/.test(description)) {
    return "flood_impact";
  }

  return "unspecified_hydraulic_mechanism";
}

function rankAnalogues({
  episodeByEvent = null,
  events,
  excludeSameEpisode = false,
  excludeSameGeographyField = null,
  features,
  groupMap,
  limit = 8,
  seismicPercentiles,
  signaturesByEvent,
  target,
  temporalCutoff = null,
  track,
  withoutGeography = false,
}) {
  const targetSignature = signaturesByEvent.get(target.event_id);
  const usableFeatures = withoutGeography
    ? features.filter((feature) => !["province", "region"].includes(feature))
    : features;
  const candidates = events.filter((candidate) => {
    if (candidate.event_id === target.event_id) {
      return false;
    }

    if (excludeDuplicateGroup(target, candidate, groupMap)) {
      return false;
    }

    if (
      excludeSameEpisode &&
      episodeByEvent?.[target.event_id] &&
      episodeByEvent[target.event_id] === episodeByEvent[candidate.event_id]
    ) {
      return false;
    }

    if (
      excludeSameGeographyField &&
      key(target[excludeSameGeographyField]) &&
      key(target[excludeSameGeographyField]) ===
        key(candidate[excludeSameGeographyField])
    ) {
      return false;
    }

    if (temporalCutoff && eventYear(candidate) > temporalCutoff) {
      return false;
    }

    const signature = signaturesByEvent.get(candidate.event_id);

    return eventTrackActive(candidate, signature, track, seismicPercentiles);
  });

  return candidates
    .map((candidate) => {
      const candidateSignature = signaturesByEvent.get(candidate.event_id);
      const scored = similarity({
        candidate,
        candidateSignature,
        features: usableFeatures,
        seismicPercentiles,
        target,
        targetSignature,
        track,
      });

      return {
        event_id: candidate.event_id,
        evidence_quality: candidate.source_confidence || "unavailable",
        matched_features: scored.matched,
        mismatched_features: scored.mismatched,
        missing_features: scored.missing,
        similarity: scored.similarity,
        track,
      };
    })
    .filter((analogue) => analogue.similarity > 0)
    .sort((left, right) => right.similarity - left.similarity || left.event_id.localeCompare(right.event_id))
    .slice(0, limit);
}

function enrichAnalogueOutcomes(analogues, eventsById, taxonomyMap) {
  return analogues.map((analogue) => {
    const event = eventsById.get(analogue.event_id);

    return {
      ...analogue,
      documented_outcomes: outcomeForEvent(event, taxonomyMap),
    };
  });
}

function cohortOutput({ analogues, eventsById, reliabilityByEvent, taxonomyMap, track }) {
  const enriched = enrichAnalogueOutcomes(analogues, eventsById, taxonomyMap);
  const patternCounts = countBy(enriched.map((item) => item.documented_outcomes.failure_pattern));
  const components = countBy(enriched.flatMap((item) => item.documented_outcomes.components_involved));
  const collapseExtent = countBy(enriched.map((item) => item.documented_outcomes.collapse_extent || "unspecified"));
  const effectiveEvidence = round(enriched.reduce((total, item) =>
    total + sourceWeight(reliabilityByEvent[item.event_id]), 0
  ), 3);

  return {
    analogue_cases: enriched,
    cohort_size: enriched.length,
    collapse_extent: collapseExtent,
    components_involved: Object.entries(components)
      .sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0]))
      .map(([component, count]) => ({ component, count })),
    documented_failure_patterns: Object.entries(patternCounts)
      .sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0]))
      .map(([pattern, count]) => ({
        count,
        effective_count: round(enriched
          .filter((item) => item.documented_outcomes.failure_pattern === pattern)
          .reduce((total, item) => total + sourceWeight(reliabilityByEvent[item.event_id]), 0), 3),
        evidence_strength: count >= 8 ? "moderate" : count >= 3 ? "limited" : "single_or_sparse",
        pattern,
        share_within_documented_cohort: enriched.length ? round(count / enriched.length, 4) : null,
      })),
    effective_evidence_count: effectiveEvidence,
    limitations: [
      enriched.length < 3 ? "Fewer than three analogue cases." : null,
      effectiveEvidence < 3 ? "Effective evidence count below three." : null,
      "Shares are within the documented analogue cohort, not probabilities for the selected site.",
    ].filter(Boolean),
    retrieval_mode: "hazard_gated_explainable_retrieval",
    track,
  };
}

function retrieveTrackCohort({
  events,
  groupMap,
  reliabilityByEvent,
  seismicPercentiles,
  signaturesByEvent,
  target,
  taxonomyMap,
  track,
  mode = "project_informed_retrieval",
}) {
  const analogues = rankAnalogues({
    events,
    features: RETRIEVAL_MODES[mode],
    groupMap,
    seismicPercentiles,
    signaturesByEvent,
    target,
    track,
  });

  return cohortOutput({
    analogues,
    eventsById: new Map(events.map((event) => [event.event_id, event])),
    reliabilityByEvent,
    taxonomyMap,
    track,
  });
}

function hitAtK(analogues, targetOutcome, field, k) {
  const targetValues = Array.isArray(targetOutcome[field])
    ? targetOutcome[field]
    : [targetOutcome[field]];
  const values = targetValues.filter((item) => item && item !== "unspecified");

  if (!values.length) {
    return null;
  }

  return analogues.slice(0, k).some((analogue) => {
    const analogueValues = Array.isArray(analogue.documented_outcomes[field])
      ? analogue.documented_outcomes[field]
      : [analogue.documented_outcomes[field]];

    return analogueValues.some((item) => values.includes(item));
  });
}

function reciprocalRank(analogues, targetOutcome) {
  const pattern = targetOutcome.failure_pattern;

  if (!pattern || pattern.includes("unspecified")) {
    return null;
  }

  const index = analogues.findIndex((analogue) =>
    analogue.documented_outcomes.failure_pattern === pattern
  );

  return index >= 0 ? round(1 / (index + 1), 4) : 0;
}

function precisionAtK(analogues, targetOutcome, k) {
  const pattern = targetOutcome.failure_pattern;

  if (!pattern || pattern.includes("unspecified")) {
    return null;
  }

  const top = analogues.slice(0, k);

  return top.length
    ? round(top.filter((analogue) => analogue.documented_outcomes.failure_pattern === pattern).length / top.length)
    : 0;
}

function recallAtK(analogues, targetOutcome, allCandidates, taxonomyMap, k) {
  const pattern = targetOutcome.failure_pattern;

  if (!pattern || pattern.includes("unspecified")) {
    return null;
  }

  const relevantTotal = allCandidates.filter((candidate) =>
    taxonomyMap.get(candidate.event_id)?.failure_pattern === pattern
  ).length;

  if (!relevantTotal) {
    return null;
  }

  return round(
    analogues.slice(0, k).filter((analogue) => analogue.documented_outcomes.failure_pattern === pattern).length /
      relevantTotal
  );
}

function dcgAtK(analogues, targetOutcome, k) {
  const pattern = targetOutcome.failure_pattern;

  if (!pattern || pattern.includes("unspecified")) {
    return null;
  }

  return round(analogues.slice(0, k).reduce((total, analogue, index) =>
    total + (analogue.documented_outcomes.failure_pattern === pattern ? 1 / Math.log2(index + 2) : 0), 0
  ));
}

function evaluateRetrieval({
  episodeByEvent = null,
  events,
  excludeSameEpisode = false,
  excludeSameGeographyField = null,
  features = null,
  groupMap,
  mode,
  reliabilityByEvent,
  seismicPercentiles,
  signaturesByEvent,
  taxonomyMap,
  temporalCutoff = null,
  track,
  withoutGeography = false,
}) {
  const eventsById = new Map(events.map((event) => [event.event_id, event]));
  const rows = [];

  for (const target of events) {
    if (temporalCutoff && eventYear(target) <= temporalCutoff) {
      continue;
    }

    const targetSignature = signaturesByEvent.get(target.event_id);

    if (!eventTrackActive(target, targetSignature, track, seismicPercentiles)) {
      rows.push({
        abstained: true,
        abstention_reason: "track_not_active_or_unavailable",
        event_id: target.event_id,
        track,
      });
      continue;
    }

    const targetOutcome = outcomeForEvent(target, taxonomyMap);

    if (!targetOutcome.failure_pattern || targetOutcome.failure_pattern.includes("unspecified")) {
      rows.push({
        abstained: true,
        abstention_reason: "target_failure_pattern_unspecified",
        event_id: target.event_id,
        track,
      });
      continue;
    }

    const allCandidates = events.filter((candidate) =>
      candidate.event_id !== target.event_id &&
      !excludeDuplicateGroup(target, candidate, groupMap) &&
      (!excludeSameEpisode ||
        !episodeByEvent?.[target.event_id] ||
        episodeByEvent[target.event_id] !== episodeByEvent[candidate.event_id]) &&
      (!excludeSameGeographyField ||
        !key(target[excludeSameGeographyField]) ||
        key(target[excludeSameGeographyField]) !==
          key(candidate[excludeSameGeographyField])) &&
      (!temporalCutoff || eventYear(candidate) <= temporalCutoff) &&
      eventTrackActive(candidate, signaturesByEvent.get(candidate.event_id), track, seismicPercentiles)
    );
    const analogues = rankAnalogues({
      episodeByEvent,
      events,
      excludeSameEpisode,
      excludeSameGeographyField,
      features: features || RETRIEVAL_MODES[mode],
      groupMap,
      limit: 8,
      seismicPercentiles,
      signaturesByEvent,
      target,
      temporalCutoff,
      track,
      withoutGeography,
    });
    const enriched = enrichAnalogueOutcomes(analogues, eventsById, taxonomyMap);

    if (enriched.length < 3) {
      rows.push({
        abstained: true,
        abstention_reason: "insufficient_analogue_support",
        analogue_count: enriched.length,
        event_id: target.event_id,
        track,
      });
      continue;
    }

    rows.push({
      abstained: false,
      analogue_count: enriched.length,
      analogue_event_ids: enriched.map((analogue) => analogue.event_id),
      component_hit_at_3: hitAtK(enriched, targetOutcome, "components_involved", 3),
      component_hit_at_5: hitAtK(enriched, targetOutcome, "components_involved", 5),
      event_id: target.event_id,
      evidence_quality: reliabilityByEvent[target.event_id]?.grade || "D",
      failure_pattern: targetOutcome.failure_pattern,
      failure_pattern_hit_at_1: hitAtK(enriched, targetOutcome, "failure_pattern", 1),
      failure_pattern_hit_at_3: hitAtK(enriched, targetOutcome, "failure_pattern", 3),
      failure_pattern_hit_at_5: hitAtK(enriched, targetOutcome, "failure_pattern", 5),
      mrr: reciprocalRank(enriched, targetOutcome),
      ndcg_at_5: dcgAtK(enriched, targetOutcome, 5),
      precision_at_3: precisionAtK(enriched, targetOutcome, 3),
      precision_at_5: precisionAtK(enriched, targetOutcome, 5),
      recall_at_5: recallAtK(enriched, targetOutcome, allCandidates, taxonomyMap, 5),
      track,
    });
  }

  return summarizeRetrieval(rows, `${track}:${mode}`);
}

function mean(values) {
  const filtered = values.filter((value) => value !== null && value !== undefined && Number.isFinite(Number(value)));

  return filtered.length ? round(filtered.reduce((total, value) => total + Number(value), 0) / filtered.length) : null;
}

function wilsonInterval(rows, field, z = 1.96) {
  const values = rows
    .map((row) => row[field])
    .filter((value) => typeof value === "boolean")
    .map(Number);
  const sampleSize = values.length;

  if (!sampleSize) {
    return {
      confidence_level: 0.95,
      lower: null,
      method: "wilson_score",
      sample_size: 0,
      upper: null,
    };
  }

  const proportion = values.reduce((total, value) => total + value, 0) /
    sampleSize;
  const zSquared = z ** 2;
  const denominator = 1 + zSquared / sampleSize;
  const center = (proportion + zSquared / (2 * sampleSize)) / denominator;
  const margin = z * Math.sqrt(
    (proportion * (1 - proportion) + zSquared / (4 * sampleSize)) /
      sampleSize
  ) / denominator;

  return {
    confidence_level: 0.95,
    lower: round(Math.max(0, center - margin)),
    method: "wilson_score",
    sample_size: sampleSize,
    upper: round(Math.min(1, center + margin)),
  };
}

function summarizeRetrieval(rows, name) {
  const evaluated = rows.filter((row) => !row.abstained);
  const eligible = rows;
  const patterns = [...new Set(evaluated.map((row) => row.failure_pattern))].sort();
  const byPattern = Object.fromEntries(
    patterns.map((pattern) => {
      const subset = evaluated.filter((row) => row.failure_pattern === pattern);

      return [
        pattern,
        {
          failure_pattern_hit_at_3: mean(subset.map((row) => Number(row.failure_pattern_hit_at_3))),
          support: subset.length,
        },
      ];
    })
  );

  return {
    abstained_cases: rows.filter((row) => row.abstained).length,
    abstention_rate: eligible.length ? round(rows.filter((row) => row.abstained).length / eligible.length) : null,
    component_hit_at_3: mean(evaluated.map((row) => Number(row.component_hit_at_3))),
    component_hit_at_5: mean(evaluated.map((row) => Number(row.component_hit_at_5))),
    evaluated_cases: evaluated.length,
    failure_pattern_hit_at_1: mean(evaluated.map((row) => Number(row.failure_pattern_hit_at_1))),
    failure_pattern_hit_at_3: mean(evaluated.map((row) => Number(row.failure_pattern_hit_at_3))),
    failure_pattern_hit_at_3_ci_95: wilsonInterval(
      evaluated,
      "failure_pattern_hit_at_3"
    ),
    failure_pattern_hit_at_5: mean(evaluated.map((row) => Number(row.failure_pattern_hit_at_5))),
    macro_failure_pattern_hit_at_3: mean(Object.values(byPattern).map((item) => item.failure_pattern_hit_at_3)),
    mean_reciprocal_rank: mean(evaluated.map((row) => row.mrr)),
    name,
    ndcg_at_5: mean(evaluated.map((row) => row.ndcg_at_5)),
    pattern_coverage: patterns.length,
    per_failure_pattern: byPattern,
    precision_at_3: mean(evaluated.map((row) => row.precision_at_3)),
    precision_at_5: mean(evaluated.map((row) => row.precision_at_5)),
    recall_at_5: mean(evaluated.map((row) => row.recall_at_5)),
    rows,
    total_cases: rows.length,
    unspecified_outcome_rate: rows.length
      ? round(rows.filter((row) => row.abstention_reason === "target_failure_pattern_unspecified").length / rows.length)
      : null,
  };
}

function baselineContext({
  events,
  groupMap,
  seismicPercentiles,
  signaturesByEvent,
  target,
  taxonomyMap,
}) {
  if (!eventTrackActive(
    target,
    signaturesByEvent.get(target.event_id),
    "hydraulic",
    seismicPercentiles
  )) {
    return {
      abstention: {
        abstained: true,
        abstention_reason: "track_not_active_or_unavailable",
        event_id: target.event_id,
        track: "hydraulic",
      },
    };
  }

  const targetOutcome = outcomeForEvent(target, taxonomyMap);

  if (!targetOutcome.failure_pattern || targetOutcome.failure_pattern.includes("unspecified")) {
    return {
      abstention: {
        abstained: true,
        abstention_reason: "target_failure_pattern_unspecified",
        event_id: target.event_id,
        track: "hydraulic",
      },
    };
  }

  return {
    candidates: events.filter((candidate) =>
      candidate.event_id !== target.event_id &&
      !excludeDuplicateGroup(target, candidate, groupMap) &&
      eventTrackActive(
        candidate,
        signaturesByEvent.get(candidate.event_id),
        "hydraulic",
        seismicPercentiles
      )
    ),
    targetOutcome,
  };
}

function baselineEvaluationRow({
  candidates,
  eventId,
  reliabilityByEvent,
  selected,
  targetOutcome,
  taxonomyMap,
}) {
  const analogues = selected.map((candidate) => ({
    documented_outcomes: outcomeForEvent(candidate, taxonomyMap),
    event_id: candidate.event_id,
    similarity: null,
  }));

  if (analogues.length < 3) {
    return {
      abstained: true,
      abstention_reason: "insufficient_analogue_support",
      analogue_count: analogues.length,
      event_id: eventId,
      track: "hydraulic",
    };
  }

  return {
    abstained: false,
    analogue_count: analogues.length,
    component_hit_at_3: hitAtK(analogues, targetOutcome, "components_involved", 3),
    component_hit_at_5: hitAtK(analogues, targetOutcome, "components_involved", 5),
    event_id: eventId,
    evidence_quality: reliabilityByEvent[eventId]?.grade || "D",
    failure_pattern: targetOutcome.failure_pattern,
    failure_pattern_hit_at_1: hitAtK(analogues, targetOutcome, "failure_pattern", 1),
    failure_pattern_hit_at_3: hitAtK(analogues, targetOutcome, "failure_pattern", 3),
    failure_pattern_hit_at_5: hitAtK(analogues, targetOutcome, "failure_pattern", 5),
    mrr: reciprocalRank(analogues, targetOutcome),
    ndcg_at_5: dcgAtK(analogues, targetOutcome, 5),
    precision_at_3: precisionAtK(analogues, targetOutcome, 3),
    precision_at_5: precisionAtK(analogues, targetOutcome, 5),
    recall_at_5: recallAtK(analogues, targetOutcome, candidates, taxonomyMap, 5),
    track: "hydraulic",
  };
}

function deterministicCandidateOrder(candidates, targetId, salt) {
  return [...candidates].sort((left, right) =>
    stableIndex(`${targetId}:${salt}:${left.event_id}`, 4_294_967_291) -
      stableIndex(`${targetId}:${salt}:${right.event_id}`, 4_294_967_291) ||
    left.event_id.localeCompare(right.event_id)
  );
}

function randomHydraulicBaseline({
  events,
  groupMap,
  reliabilityByEvent,
  seismicPercentiles,
  signaturesByEvent,
  taxonomyMap,
}) {
  const rows = events.map((target) => {
    const context = baselineContext({
      events,
      groupMap,
      seismicPercentiles,
      signaturesByEvent,
      target,
      taxonomyMap,
    });

    if (context.abstention) {
      return context.abstention;
    }

    return baselineEvaluationRow({
      candidates: context.candidates,
      eventId: target.event_id,
      reliabilityByEvent,
      selected: deterministicCandidateOrder(
        context.candidates,
        target.event_id,
        "random"
      ).slice(0, 8),
      targetOutcome: context.targetOutcome,
      taxonomyMap,
    });
  });

  return {
    comparison_contract: "same hydraulic-track targets, candidates and abstention denominator as ARCUS; target outcomes excluded from selection",
    ...summarizeRetrieval(rows, "hazard_gated_random_hydraulic_cohort"),
  };
}

function mostFrequentPatternBaseline({
  events,
  groupMap,
  reliabilityByEvent,
  seismicPercentiles,
  signaturesByEvent,
  taxonomyMap,
}) {
  const rows = events.map((target) => {
    const context = baselineContext({
      events,
      groupMap,
      seismicPercentiles,
      signaturesByEvent,
      target,
      taxonomyMap,
    });

    if (context.abstention) {
      return context.abstention;
    }

    const counts = countBy(context.candidates.map((candidate) =>
      taxonomyMap.get(candidate.event_id)?.failure_pattern || "unspecified"
    ));
    const predictedPattern = Object.entries(counts)
      .filter(([pattern]) => !pattern.includes("unspecified"))
      .sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0]))[0]?.[0] || null;
    const row = baselineEvaluationRow({
      candidates: context.candidates,
      eventId: target.event_id,
      reliabilityByEvent,
      selected: context.candidates
        .filter((candidate) =>
          taxonomyMap.get(candidate.event_id)?.failure_pattern === predictedPattern
        )
        .sort((left, right) => left.event_id.localeCompare(right.event_id))
        .slice(0, 8),
      targetOutcome: context.targetOutcome,
      taxonomyMap,
    });

    return { ...row, predicted_pattern: predictedPattern };
  });
  const predictedCounts = countBy(
    rows.map((row) => row.predicted_pattern).filter(Boolean)
  );
  const mostFrequent = Object.entries(predictedCounts)
    .sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0]))[0]?.[0] || null;

  return {
    comparison_contract: "same hydraulic-track targets, candidates and abstention denominator as ARCUS; majority learned from each target-excluded candidate fold",
    most_frequent_pattern: mostFrequent,
    ...summarizeRetrieval(rows, "hazard_gated_most_frequent_hydraulic_pattern"),
  };
}

function sameFieldBaseline({
  events,
  field,
  groupMap,
  reliabilityByEvent,
  seismicPercentiles,
  signaturesByEvent,
  taxonomyMap,
}) {
  const rows = events.map((target) => {
    const context = baselineContext({
      events,
      groupMap,
      seismicPercentiles,
      signaturesByEvent,
      target,
      taxonomyMap,
    });

    if (context.abstention) {
      return context.abstention;
    }

    return baselineEvaluationRow({
      candidates: context.candidates,
      eventId: target.event_id,
      reliabilityByEvent,
      selected: context.candidates.filter((candidate) =>
        key(candidate[field]) === key(target[field])
      ).slice(0, 8),
      targetOutcome: context.targetOutcome,
      taxonomyMap,
    });
  });

  return {
    comparison_contract: "same hydraulic-track targets and candidates as ARCUS; one pre-event field only",
    ...summarizeRetrieval(rows, `same_${field}_hydraulic_baseline`),
  };
}

function hazardCauseConcordance({ events, seismicPercentiles, signaturesByEvent }) {
  const rows = [];

  for (const event of events) {
    const signature = signaturesByEvent.get(event.event_id);
    const family = causeFamilyForEvent(event);

    rows.push({
      documented_cause_family: family,
      hydraulic_signature: highestHydraulicClass(signature),
      landslide_signature: highestLandslideClass(signature),
      province: event.province,
      region: event.region,
      seismic_signature: seismicBand(signature, seismicPercentiles),
    });
  }

  function matrixFor(field) {
    const grouped = {};

    for (const row of rows) {
      const keyName = `${row.documented_cause_family}|${row[field]}`;

      grouped[keyName] = (grouped[keyName] || 0) + 1;
    }

    return Object.entries(grouped)
      .map(([groupKey, count]) => {
        const [documentedCauseFamily, signature] = groupKey.split("|");
        const familyTotal = rows.filter((row) => row.documented_cause_family === documentedCauseFamily).length;

        return {
          count,
          documented_cause_family: documentedCauseFamily,
          share_within_documented_family: familyTotal ? round(count / familyTotal) : null,
          signature,
        };
      })
      .sort((left, right) =>
        left.documented_cause_family.localeCompare(right.documented_cause_family) ||
        String(left.signature).localeCompare(String(right.signature))
      );
  }

  return {
    caveat: CAVEAT,
    hydraulic: matrixFor("hydraulic_signature").map((item) => ({
      ...item,
      hydraulic_signature: item.signature,
      signature: undefined,
    })),
    landslide: matrixFor("landslide_signature").map((item) => ({
      ...item,
      landslide_signature: item.signature,
      signature: undefined,
    })),
    notes: [
      "Concordance is descriptive only.",
      "Current official hazard signatures may differ from historical event conditions because of scale, updates and mapping date.",
      "Discordant cases are retained; they are not automatically removed.",
    ],
    seismic: matrixFor("seismic_signature").map((item) => ({
      ...item,
      seismic_signature: item.signature,
      signature: undefined,
    })),
  };
}

function supportByTrack({ events, seismicPercentiles, signaturesByEvent, taxonomyMap }) {
  return Object.fromEntries(
    TRACKS.map((track) => {
      const active = events.filter((event) =>
        eventTrackActive(event, signaturesByEvent.get(event.event_id), track, seismicPercentiles)
      );
      const documentedPatterns = countBy(
        active.map((event) => taxonomyMap.get(event.event_id)?.failure_pattern || "unspecified")
      );

      return [
        track,
        {
          complete_feature_support: active.filter((event) =>
            event.destination_use && event.bridge_crossing_type && event.material_type && event.structural_type
          ).length,
          documented_pattern_support: Object.values(documentedPatterns).reduce((total, count) => total + count, 0) -
            (documentedPatterns.unspecified || 0),
          effective_support: active.length,
          insufficient_evidence: active.length < 5,
          total_support: active.length,
        },
      ];
    })
  );
}

function hydraulicMvp({
  events,
  groupMap,
  reliabilityByEvent,
  seismicPercentiles,
  signaturesByEvent,
  taxonomyMap,
}) {
  const hydraulicEvents = events.filter((event) => causeFamilyForEvent(event) === "hydraulic");
  const mechanismSupport = countBy(hydraulicEvents.map((event) =>
    hydraulicMechanism(event, outcomeForEvent(event, taxonomyMap))
  ));
  const arcus = evaluateRetrieval({
    events,
    groupMap,
    mode: "hazard_project_profile_limited_territory",
    reliabilityByEvent,
    seismicPercentiles,
    signaturesByEvent,
    taxonomyMap,
    track: "hydraulic",
  });
  const baselines = {
    geography_only: evaluateRetrieval({
      events,
      groupMap,
      mode: "geography_only",
      reliabilityByEvent,
      seismicPercentiles,
      signaturesByEvent,
      taxonomyMap,
      track: "hydraulic",
    }),
    most_frequent_hydraulic_mechanism: mostFrequentPatternBaseline({
      events,
      groupMap,
      reliabilityByEvent,
      seismicPercentiles,
      signaturesByEvent,
      taxonomyMap,
    }),
    random_within_hydraulic_family: randomHydraulicBaseline({
      events,
      groupMap,
      reliabilityByEvent,
      seismicPercentiles,
      signaturesByEvent,
      taxonomyMap,
    }),
    same_material_only: sameFieldBaseline({
      events,
      field: "material_type",
      groupMap,
      reliabilityByEvent,
      seismicPercentiles,
      signaturesByEvent,
      taxonomyMap,
    }),
    same_typology_only: sameFieldBaseline({
      events,
      field: "structural_type",
      groupMap,
      reliabilityByEvent,
      seismicPercentiles,
      signaturesByEvent,
      taxonomyMap,
    }),
  };

  return {
    baselines,
    documented_hydraulic_mechanisms: Object.fromEntries(
      HYDRAULIC_PATTERNS.map((pattern) => [pattern, mechanismSupport[pattern] || 0])
    ),
    evaluation: {
      hazard_class_only: evaluateRetrieval({
        events,
        groupMap,
        mode: "hazard_class_only",
        reliabilityByEvent,
        seismicPercentiles,
        signaturesByEvent,
        taxonomyMap,
        track: "hydraulic",
      }),
      hazard_project_profile: evaluateRetrieval({
        events,
        groupMap,
        mode: "hazard_project_profile",
        reliabilityByEvent,
        seismicPercentiles,
        signaturesByEvent,
        taxonomyMap,
        track: "hydraulic",
      }),
      hazard_project_profile_limited_territory: arcus,
      project_profile_only: evaluateRetrieval({
        events,
        groupMap,
        mode: "project_profile_only",
        reliabilityByEvent,
        seismicPercentiles,
        signaturesByEvent,
        taxonomyMap,
        track: "hydraulic",
      }),
    },
    outcome:
      arcus.failure_pattern_hit_at_3 > Math.max(
        baselines.most_frequent_hydraulic_mechanism.failure_pattern_hit_at_3 || 0,
        baselines.random_within_hydraulic_family.failure_pattern_hit_at_3 || 0
      )
        ? "candidate_for_expert_validation"
        : "no_demonstrated_value_over_baselines",
    support: {
      documented_hydraulic_events: hydraulicEvents.length,
      mechanisms: mechanismSupport,
    },
  };
}

function temporalHoldoutValidation(args) {
  return Object.fromEntries(
    [2015, 2018, 2020].map((cutoff) => [
      cutoff,
      evaluateRetrieval({
        ...args,
        mode: "hazard_project_profile_limited_territory",
        temporalCutoff: cutoff,
        track: "hydraulic",
      }),
    ])
  );
}

function geographicalHoldoutValidation(args) {
  return {
    leave_province_out: evaluateRetrieval({
      ...args,
      excludeSameGeographyField: "province",
      mode: "hazard_project_profile_limited_territory",
      track: "hydraulic",
      withoutGeography: true,
    }),
    leave_region_out: evaluateRetrieval({
      ...args,
      excludeSameGeographyField: "region",
      mode: "hazard_project_profile_limited_territory",
      track: "hydraulic",
      withoutGeography: true,
    }),
    without_geography_features: evaluateRetrieval({
      ...args,
      mode: "hazard_project_profile_limited_territory",
      track: "hydraulic",
      withoutGeography: true,
    }),
  };
}

function episodeHoldoutValidation(args) {
  return evaluateRetrieval({
    ...args,
    excludeSameEpisode: true,
    mode: "hazard_project_profile_limited_territory",
    track: "hydraulic",
  });
}

function featureAblation(args) {
  const referenceFeatures = [
    ...RETRIEVAL_MODES.hazard_project_profile_limited_territory,
  ];
  const evaluate = (name, removedFeatures) => evaluateRetrieval({
    ...args,
    features: referenceFeatures.filter(
      (feature) => !removedFeatures.includes(feature)
    ),
    mode: name,
    track: "hydraulic",
  });

  return {
    grouped: {
      without_hazard_signature: evaluate(
        "ablation_without_hazard_signature",
        ["hazard_signature"]
      ),
      without_project_profile: evaluate(
        "ablation_without_project_profile",
        [
          "bridge_use",
          "crossing_type",
          "material",
          "structural_typology",
          "waterway_context",
        ]
      ),
      without_territory: evaluate(
        "ablation_without_territory",
        ["province", "region"]
      ),
    },
    leave_one_feature_out: Object.fromEntries(
      referenceFeatures.map((feature) => [
        feature,
        evaluate(`ablation_without_${feature}`, [feature]),
      ])
    ),
    reference_features: referenceFeatures,
  };
}

function mitigationIntelligence({ cohort, mitigationKnowledge }) {
  const entries = mitigationKnowledge.entries || [];

  return cohort.documented_failure_patterns.map((pattern) => {
    const entry = entries.find((item) => item.failure_pattern === pattern.pattern);

    return {
      arcus_empirical_basis: {
        analogue_count: pattern.count,
        components: cohort.components_involved,
        documented_mechanisms: [pattern.pattern],
        evidence_strength: pattern.evidence_strength,
      },
      external_engineering_basis: entry?.external_engineering_basis || [],
      external_validation_required: !(entry?.external_engineering_basis || []).length,
      failure_pattern: pattern.pattern,
      investigation_priorities: entry?.investigation_priorities || [],
      monitoring_considerations: entry?.monitoring_considerations || [],
      status: entry?.status || "draft",
    };
  });
}

function pairedBootstrapDifference(
  candidate,
  baseline,
  field = "failure_pattern_hit_at_3",
  iterations = 2000
) {
  const baselineRows = new Map(
    (baseline.rows || []).map((row) => [row.event_id, row])
  );
  const pairs = (candidate.rows || [])
    .map((row) => ({
      baseline: baselineRows.get(row.event_id),
      candidate: row,
    }))
    .filter(({ baseline: baselineRow, candidate: candidateRow }) =>
      !baselineRow?.abstained &&
      !candidateRow.abstained &&
      typeof baselineRow[field] === "boolean" &&
      typeof candidateRow[field] === "boolean"
    )
    .map(({ baseline: baselineRow, candidate: candidateRow }) =>
      Number(candidateRow[field]) - Number(baselineRow[field])
    );

  if (!pairs.length) {
    return {
      confidence_level: 0.95,
      difference: null,
      lower: null,
      method: "paired_deterministic_bootstrap",
      sample_size: 0,
      upper: null,
    };
  }

  let state = 0x4f1bbcdc;
  const nextIndex = () => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    return state % pairs.length;
  };
  const bootstrap = [];

  for (let iteration = 0; iteration < iterations; iteration += 1) {
    let total = 0;

    for (let draw = 0; draw < pairs.length; draw += 1) {
      total += pairs[nextIndex()];
    }

    bootstrap.push(total / pairs.length);
  }

  bootstrap.sort((left, right) => left - right);
  const quantile = (probability) =>
    bootstrap[Math.floor((bootstrap.length - 1) * probability)];

  return {
    confidence_level: 0.95,
    difference: round(mean(pairs)),
    iterations,
    lower: round(quantile(0.025)),
    method: "paired_deterministic_bootstrap",
    sample_size: pairs.length,
    upper: round(quantile(0.975)),
  };
}

function valueAddBenchmark({ arcus, baselines }) {
  const majorityBaseline = baselines.most_frequent_hydraulic_mechanism;
  const randomBaseline = baselines.random_within_hydraulic_family;
  const majorityRows = new Map(
    (majorityBaseline.rows || []).map((row) => [row.event_id, row])
  );
  const randomRows = new Map(
    (randomBaseline.rows || []).map((row) => [row.event_id, row])
  );
  const sameEligibleDenominator = [majorityBaseline, randomBaseline].every(
    (baseline) =>
      baseline.total_cases === arcus.total_cases &&
      baseline.rows?.every((row, index) =>
        row.event_id === arcus.rows?.[index]?.event_id
      )
  );
  const improved = (arcus.rows || []).filter((row) => {
    if (row.abstained) {
      return false;
    }

    const majorityRow = majorityRows.get(row.event_id);
    const randomRow = randomRows.get(row.event_id);

    return row.failure_pattern_hit_at_3 &&
      !majorityRow?.failure_pattern_hit_at_3 &&
      !randomRow?.failure_pattern_hit_at_3;
  }).length;
  const comparisonFloor = Math.max(
    majorityBaseline.failure_pattern_hit_at_3 || 0,
    randomBaseline.failure_pattern_hit_at_3 || 0
  );
  const macroComparisonFloor = Math.max(
    majorityBaseline.macro_failure_pattern_hit_at_3 || 0,
    randomBaseline.macro_failure_pattern_hit_at_3 || 0
  );
  const differenceVsMajority = pairedBootstrapDifference(
    arcus,
    majorityBaseline
  );
  const differenceVsRandom = pairedBootstrapDifference(
    arcus,
    randomBaseline
  );
  const beatsBaselines =
    sameEligibleDenominator &&
    arcus.failure_pattern_hit_at_3 > comparisonFloor &&
    arcus.macro_failure_pattern_hit_at_3 > macroComparisonFloor &&
    differenceVsMajority.lower > 0 &&
    differenceVsRandom.lower > 0;

  return {
    arcus_hazard_gated_retrieval: {
      coverage: arcus.evaluated_cases,
      failure_pattern_hit_at_3: arcus.failure_pattern_hit_at_3,
      macro_failure_pattern_hit_at_3: arcus.macro_failure_pattern_hit_at_3,
    },
    comparison_contract: {
      candidate_pool: "officially active hydraulic track",
      duplicate_groups_excluded: true,
      same_eligible_denominator: sameEligibleDenominator,
      target_outcome_used_for_selection: false,
    },
    hazard_gated_most_frequent_pattern_baseline: {
      failure_pattern_hit_at_3: majorityBaseline.failure_pattern_hit_at_3,
      macro_failure_pattern_hit_at_3:
        majorityBaseline.macro_failure_pattern_hit_at_3,
      most_frequent_pattern: majorityBaseline.most_frequent_pattern,
    },
    hazard_gated_random_cohort: {
      failure_pattern_hit_at_3: randomBaseline.failure_pattern_hit_at_3,
      macro_failure_pattern_hit_at_3:
        randomBaseline.macro_failure_pattern_hit_at_3,
    },
    paired_hit_at_3_difference: {
      versus_majority: differenceVsMajority,
      versus_random: differenceVsRandom,
    },
    cases_arcus_improves_over_baseline: improved,
    cases_with_no_measurable_value: Math.max((arcus.evaluated_cases || 0) - improved, 0),
    decision: beatsBaselines
      ? "value_add_candidate_for_expert_review"
      : "no_demonstrated_value_over_fair_baselines",
  };
}

function expertReviewPackage({
  events,
  groupMap,
  reliabilityByEvent,
  seismicPercentiles,
  signaturesByEvent,
  taxonomyMap,
}) {
  const selectEvenly = (items, limit) => {
    const ordered = [...items].sort((left, right) =>
      left.event_id.localeCompare(right.event_id)
    );

    if (ordered.length <= limit) {
      return ordered;
    }

    return Array.from({ length: limit }, (_, index) =>
      ordered[Math.round((index * (ordered.length - 1)) / (limit - 1))]
    );
  };
  const selected = ["P1", "P2", "P3"].flatMap((hazardClass) =>
    selectEvenly(
      events.filter((event) => {
        const hydraulic = signaturesByEvent.get(event.event_id)?.hydraulic;

        return hydraulic?.status === "available" &&
          hydraulic.highest_class === hazardClass;
      }),
      10
    )
  );

  return {
    caveat: "Blind review package; do not reveal which output is ARCUS retrieval before expert scoring.",
    cases: selected.map((event) => {
      const arcus = retrieveTrackCohort({
        events,
        groupMap,
        mode: "project_informed_retrieval",
        reliabilityByEvent,
        seismicPercentiles,
        signaturesByEvent,
        target: event,
        taxonomyMap,
        track: "hydraulic",
      });
      const baseline = randomBaselineCohortForEvent({
        events,
        groupMap,
        reliabilityByEvent,
        seismicPercentiles,
        signaturesByEvent,
        target: event,
        taxonomyMap,
      });
      const arcusFirst = stableIndex(event.event_id, 2) === 0;

      return {
        anonymized_case_id: `review_${selected.indexOf(event) + 1}`,
        event_id: event.event_id,
        official_hydraulic_class:
          signaturesByEvent.get(event.event_id)?.hydraulic?.highest_class ||
          null,
        outputs: arcusFirst
          ? { A: arcus, B: baseline }
          : { A: baseline, B: arcus },
        scoring_schema: [
          "relevance_of_analogues",
          "engineering_similarity",
          "usefulness_of_failure_patterns",
          "usefulness_of_investigation_priorities",
          "misleading_content",
          "missing_critical_information",
          "preference_A_B_tie",
        ],
      };
    }),
    minimum_sample_policy: [
      "up to 10 outcome-blind targets per official hydraulic class P1/P2/P3",
      "targets selected from current official hydraulic intersection only",
      "selection does not use documented collapse cause or failure process",
      "ARCUS and baseline cohorts are both routed through the hydraulic track",
    ],
    review_track: "hydraulic",
    sampling_basis:
      "current_official_hydraulic_class_stratified_without_outcome_fields",
    sampling_summary: Object.fromEntries(
      ["P1", "P2", "P3"].map((hazardClass) => [
        hazardClass,
        selected.filter(
          (event) =>
            signaturesByEvent.get(event.event_id)?.hydraulic
              ?.highest_class === hazardClass
        ).length,
      ])
    ),
    simulated_expert_responses: false,
  };
}

function randomBaselineCohortForEvent({
  events,
  groupMap,
  reliabilityByEvent,
  seismicPercentiles,
  signaturesByEvent,
  target,
  taxonomyMap,
}) {
  const eventsById = new Map(events.map((event) => [event.event_id, event]));
  const candidates = events.filter((candidate) =>
    candidate.event_id !== target.event_id &&
    eventTrackActive(
      candidate,
      signaturesByEvent.get(candidate.event_id),
      "hydraulic",
      seismicPercentiles
    ) &&
    !excludeDuplicateGroup(target, candidate, groupMap)
  );
  const selected = [...candidates]
    .sort((left, right) =>
      stableIndex(
        `${target.event_id}:review-baseline:${left.event_id}`,
        1_000_003
      ) -
        stableIndex(
          `${target.event_id}:review-baseline:${right.event_id}`,
          1_000_003
        ) ||
      left.event_id.localeCompare(right.event_id)
    )
    .slice(0, Math.min(8, candidates.length));
  const analogues = selected.map((candidate) => ({
    event_id: candidate.event_id,
    evidence_quality: candidate.source_confidence || "unavailable",
    matched_features: [
      {
        candidate_value: "active",
        contribution: null,
        feature: "official_hydraulic_track",
        target_value: "active",
      },
    ],
    mismatched_features: [],
    missing_features: [],
    similarity: null,
    track: "hydraulic",
  }));

  return {
    ...cohortOutput({
      analogues,
      eventsById,
      reliabilityByEvent,
      taxonomyMap,
      track: "hydraulic",
    }),
    retrieval_mode: "hazard_gated_random_hydraulic_baseline",
  };
}

export function buildHazardGatedCollapseIntelligence({
  analysisPath = ANALYSIS_PATH,
  expertReviewPath = EXPERT_REVIEW_PATH,
  validationPath = VALIDATION_PATH,
} = {}) {
  const { events, sources } = readProfessionalDataset(ROOT);
  const signaturesPayload = readJson(path.join(OUTPUT_DIR, "collapse-hazard-signatures.json"), { signatures: [] });
  const manifest = readJson(path.join(OUTPUT_DIR, "collapse-hazard-signatures-manifest.json"), {});
  const mitigationKnowledge = readJson(path.join(ROOT, "config", "collapse-intelligence", "mitigation-knowledge-base.json"), { entries: [] });
  const signatures = signaturesPayload.signatures || [];
  const signaturesByEvent = signatureByEvent(signatures);
  const seismicPercentiles = computeSeismicPercentiles(signatures);
  const taxonomy = buildFailurePatternTaxonomy(events);
  const taxonomyMap = new Map(taxonomy.mapping.map((item) => [item.event_id, item]));
  const reliabilityByEvent = buildSourceReliabilityByEvent(events, sources);
  const duplicateAudit = duplicateGroups(events, sources);
  const groupMap = duplicateAudit.by_event;
  const episodeRegistry = buildHydraulicEpisodeRegistry(events, sources);
  const commonArgs = {
    episodeByEvent: episodeRegistry.event_to_episode,
    events,
    groupMap,
    reliabilityByEvent,
    seismicPercentiles,
    signaturesByEvent,
    taxonomyMap,
  };
  const retrievalValidation = {
    hydraulic_project_informed: evaluateRetrieval({
      ...commonArgs,
      mode: "hazard_project_profile_limited_territory",
      track: "hydraulic",
    }),
    landslide_project_informed: evaluateRetrieval({
      ...commonArgs,
      mode: "hazard_project_profile_limited_territory",
      track: "landslide",
    }),
    multi_hazard_project_informed: evaluateRetrieval({
      ...commonArgs,
      mode: "hazard_project_profile_limited_territory",
      track: "multi_hazard",
    }),
    seismic_contextual: evaluateRetrieval({
      ...commonArgs,
      mode: "project_profile_only",
      track: "seismic",
    }),
  };
  const hydraulic = hydraulicMvp(commonArgs);
  const sampleTarget = events.find((event) =>
    eventTrackActive(event, signaturesByEvent.get(event.event_id), "hydraulic", seismicPercentiles)
  ) || events.find((event) => causeFamilyForEvent(event) === "hydraulic") || events[0];
  const sampleCohort = retrieveTrackCohort({
    ...commonArgs,
    mode: "project_informed_retrieval",
    target: sampleTarget,
    track: "hydraulic",
  });
  const analysis = {
    caveat: CAVEAT,
    decision_problem:
      "Given the official site hazard context, which documented collapses are empirically relevant, which failure patterns appear in the cohort and which investigations should be prioritised?",
    duplicate_group_holdout: duplicateAudit,
    episode_holdout: {
      registry: {
        episode_count: episodeRegistry.episode_count,
        methodology: episodeRegistry.methodology,
        review_required_episode_count:
          episodeRegistry.review_required_episode_count,
      },
      validation: episodeHoldoutValidation(commonArgs),
    },
    enrichment_status: enrichmentStatus(signatures, manifest),
    hazard_routing: {
      leakage_guard: {
        blocked_outcome_fields: BLOCKED_OUTCOME_FIELDS,
        router_uses_documented_cause: false,
      },
      rules: {
        hydraulic: "active when ISPRA hydraulic P1/P2/P3 intersects",
        landslide: "active when ISPRA PAI P1/P2/P3/P4 intersects; AA is attention only",
        multi_hazard: "active when at least two active hazard tracks are present",
        seismic:
          "candidate alternatives only: empirical percentile band, contextual track, or project-profile-sensitive activation",
      },
    },
    hazard_to_cause_concordance: hazardCauseConcordance({
      events,
      seismicPercentiles,
      signaturesByEvent,
    }),
    feature_ablation: featureAblation(commonArgs),
    hydraulic_intelligence_mvp: hydraulic,
    mitigation_intelligence: mitigationIntelligence({
      cohort: sampleCohort,
      mitigationKnowledge,
    }),
    reframing: {
      forbidden_outputs: [
        "collapse probability",
        "cause prediction",
        "safety classification",
        "single risk score",
        "safe/unsafe output",
      ],
      replacement_question:
        "Which documented analogue collapses are relevant within the active hazard track?",
    },
    retrieval_validation: retrievalValidation,
    support_by_track: supportByTrack({
      events,
      seismicPercentiles,
      signaturesByEvent,
      taxonomyMap,
    }),
    temporal_holdout: temporalHoldoutValidation(commonArgs),
    geographical_holdout: geographicalHoldoutValidation(commonArgs),
    value_add_benchmark: valueAddBenchmark({
      arcus: hydraulic.evaluation.hazard_project_profile_limited_territory,
      baselines: hydraulic.baselines,
    }),
  };
  const expertPackage = expertReviewPackage({
    events,
    groupMap,
    reliabilityByEvent,
    seismicPercentiles,
    signaturesByEvent,
    taxonomyMap,
  });

  writeJson(analysisPath, analysis);
  writeJson(validationPath, retrievalValidation);
  writeJson(expertReviewPath, expertPackage);

  return {
    analysis,
    expertPackage,
    retrievalValidation,
  };
}

if (process.argv[1] && path.resolve(process.argv[1]) === __filename) {
  const result = buildHazardGatedCollapseIntelligence();

  console.log(
    JSON.stringify(
      {
        decision:
          result.analysis.value_add_benchmark.decision === "value_add_candidate_for_expert_review"
            ? "hydraulic intelligence candidate for expert validation"
            : "validation incomplete",
        fully_enriched: result.analysis.enrichment_status.fully_enriched,
        hydraulic_support: result.analysis.support_by_track.hydraulic.total_support,
        output: ANALYSIS_PATH,
      },
      null,
      2
    )
  );
}

export {
  BLOCKED_OUTCOME_FIELDS,
  MATCHING_FEATURES,
  RETRIEVAL_MODES,
  completedProvider,
  evaluateRetrieval,
  highestHydraulicClass,
  highestLandslideClass,
  hydraulicMechanism,
};
