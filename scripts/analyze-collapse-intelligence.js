import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  buildSourceCountByEvent,
  buildSourceReliabilityByEvent,
} from "../src/utils/analytics.js";
import {
  HYDRAULIC_COMPONENT_MAPPING,
  HYDRAULIC_EVIDENCE_LEVEL_MAPPING,
  HYDRAULIC_FAILURE_PROCESS_MAPPING,
  HYDRAULIC_MATCHER_BLOCKED_FIELDS,
  HYDRAULIC_TRIGGER_MAPPING,
  summarizeHydraulicCohort,
} from "../src/utils/hydraulicIntelligence.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, "..");
const OUTPUT_DIR = path.join(
  ROOT,
  "private-data",
  "professional",
  "collapse-intelligence"
);
const DEFAULT_OUTPUT = path.join(OUTPUT_DIR, "collapse-intelligence-analysis.json");
const TAXONOMY_PATH = path.join(
  ROOT,
  "config",
  "collapse-intelligence",
  "failure-pattern-taxonomy.json"
);
const MITIGATION_PATH = path.join(
  ROOT,
  "config",
  "collapse-intelligence",
  "mitigation-knowledge-base.json"
);
const CROSSWALK_PATH = path.join(ROOT, "config", "geography", "province-crosswalk.json");

export const WORKBENCH_NAME = "ARCUS Collapse Intelligence Workbench";
export const ANALYSIS_VERSION = "collapse-intelligence-workbench-v1";
export const CURRENT_CONTEXT_CAVEAT =
  "current official hazard context at documented collapse location; not retrospective causal proof";

const CAUSE_FAMILY_ALIASES = [
  {
    family: "hydraulic",
    values: ["Hydraulic"],
  },
  {
    family: "landslide_ground_movement",
    values: ["Landslide"],
  },
  {
    family: "seismic",
    values: ["Earthquake"],
  },
  {
    family: "design_construction",
    values: ["Design and Construction"],
  },
  {
    family: "impact",
    values: ["Impact"],
  },
  {
    family: "deterioration_maintenance",
    values: ["Material"],
  },
  {
    family: "overload",
    values: ["Overload"],
  },
  {
    family: "unknown_unspecified",
    values: ["Unknown", "Unspecified", "", null],
  },
];

const MATCHING_FIELDS = [
  "latitude",
  "longitude",
  "province",
  "region",
  "bridge_crossing_type",
  "destination_use",
  "structural_type",
  "material_type",
  "construction_year",
  "exact_location",
];
const OUTCOME_FIELDS = [
  "cause_category",
  "specific_cause",
  "hydraulic_intelligence",
  ...HYDRAULIC_MATCHER_BLOCKED_FIELDS,
  "triggered",
  "collapse_severity",
  "victims",
  "injuries",
  "description",
];
const EVIDENCE_FIELDS = [
  "source_confidence",
  "curation_level",
  "exact_location",
];

function parseArgs(argv = process.argv.slice(2)) {
  const options = {
    dryRun: false,
    eventId: null,
    limit: null,
    outputPath: DEFAULT_OUTPUT,
  };

  argv.forEach((argument) => {
    if (argument === "--dry-run") {
      options.dryRun = true;
    } else if (argument.startsWith("--event-id=")) {
      options.eventId = argument.split("=").slice(1).join("=");
    } else if (argument.startsWith("--limit=")) {
      options.limit = Number(argument.split("=")[1]);
    } else if (argument.startsWith("--output=")) {
      options.outputPath = path.resolve(argument.split("=").slice(1).join("="));
    }
  });

  return options;
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8").replace(/^\uFEFF/, ""));
}

function writeJson(filePath, value) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(`${filePath}.tmp`, JSON.stringify(value, null, 2), "utf8");
  fs.renameSync(`${filePath}.tmp`, filePath);
}

function normalizeKey(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

function round(value, decimals = 3) {
  if (!Number.isFinite(value)) {
    return null;
  }

  const factor = 10 ** decimals;

  return Math.round(value * factor) / factor;
}

function finite(value) {
  return Number.isFinite(Number(value));
}

function extractYear(value) {
  const match = String(value || "").match(/\d{4}/);

  return match ? Number(match[0]) : null;
}

function uniqueValues(values, limit = 30) {
  return [...new Set(values.filter((value) => value !== null && value !== undefined && value !== ""))]
    .sort((left, right) => String(left).localeCompare(String(right)))
    .slice(0, limit);
}

function fieldType(values) {
  const nonNull = values.filter((value) => value !== null && value !== undefined && value !== "");

  if (!nonNull.length) {
    return "empty";
  }

  if (nonNull.every((value) => typeof value === "boolean")) {
    return "boolean";
  }

  if (nonNull.every((value) => Number.isFinite(Number(value)))) {
    return "number";
  }

  return "string";
}

function candidateRole(field) {
  if (["event_id", "event_slug", "date", "municipality", "province", "region"].includes(field)) {
    return field === "event_id" ? "identifier" : "context_only";
  }

  if (MATCHING_FIELDS.includes(field)) {
    return "matching_feature";
  }

  if (OUTCOME_FIELDS.includes(field)) {
    return "outcome_feature";
  }

  if (EVIDENCE_FIELDS.includes(field)) {
    return "evidence_quality";
  }

  if (field.includes("source")) {
    return "evidence_quality";
  }

  return "context_only";
}

export function auditDatabase(events, sources) {
  const eventFields = [...new Set(events.flatMap((event) => Object.keys(event)))].sort();
  const sourceCountByEvent = buildSourceCountByEvent(sources);
  const sourceCoverage = events.filter((event) => sourceCountByEvent[event.event_id] > 0).length;
  const inventory = eventFields.map((field) => {
    const values = events.map((event) => event[field]);
    const nonNullCount = values.filter((value) => value !== null && value !== undefined && value !== "").length;
    const unique = uniqueValues(values);
    const issues = [];

    if (nonNullCount === 0) {
      issues.push("empty_field");
    }

    if (field === "construction_year" && nonNullCount < events.length * 0.5) {
      issues.push("low_coverage_for_age_matching");
    }

    if (field === "description" && nonNullCount > 0) {
      issues.push("narrative_text_not_structured_mechanism");
    }

    if (["structural_type", "material_type", "specific_cause"].includes(field) && unique.length > 12) {
      issues.push("taxonomy_requires_alias_mapping");
    }

    return {
      candidate_role: candidateRole(field),
      coverage_percent: round((nonNullCount / events.length) * 100, 1),
      field,
      non_null_count: nonNullCount,
      normalization_issues: issues,
      source_file: "private-data/processed/events.json",
      type: fieldType(values),
      unique_values: unique,
    };
  });

  inventory.push({
    candidate_role: "evidence_quality",
    coverage_percent: round((sourceCoverage / events.length) * 100, 1),
    field: "source_count",
    non_null_count: sourceCoverage,
    normalization_issues: sourceCoverage < events.length ? ["events_without_sources"] : [],
    source_file: "private-data/processed/sources.json",
    type: "number",
    unique_values: uniqueValues(Object.values(sourceCountByEvent)),
  });

  return {
    insufficient_fields: inventory
      .filter((field) => field.coverage_percent < 50)
      .map((field) => field.field),
    inventory,
    source_coverage_percent: round((sourceCoverage / events.length) * 100, 1),
    usable_fields: inventory
      .filter((field) => field.coverage_percent >= 70)
      .map((field) => field.field),
  };
}

export function causeFamilyForEvent(event) {
  const value = event?.specific_cause;
  const match = CAUSE_FAMILY_ALIASES.find((alias) =>
    alias.values.some((item) => normalizeKey(item) === normalizeKey(value))
  );

  return match?.family || "unknown_unspecified";
}

function failurePatternForEvent(event) {
  const family = causeFamilyForEvent(event);
  const hydraulic = event.hydraulic_intelligence;
  const description = String(event.description || "").toLowerCase();
  const structure = normalizeKey(event.structural_type);
  const crossing = normalizeKey(event.bridge_crossing_type);
  const extent = event.collapse_severity === "TC" ? "total_collapse" : "partial_collapse";

  if (family === "hydraulic") {
    if (hydraulic?.failure_process === "scour") {
      return "hydraulic_scour_or_foundation_loss";
    }

    if (hydraulic?.failure_process === "bank_erosion_or_embankment_failure") {
      return "hydraulic_approach_or_embankment_damage";
    }

    if (
      hydraulic?.failure_process === "debris_accumulation_or_obstruction" ||
      hydraulic?.failure_process === "debris_flow_or_solid_transport"
    ) {
      return "hydraulic_debris_obstruction_or_solid_transport";
    }

    if (hydraulic?.failure_process === "overtopping_or_hydrodynamic_action") {
      return "hydraulic_overtopping_or_hydrodynamic_action";
    }

    if (hydraulic?.failure_process === "other_documented_hydraulic_process") {
      return "hydraulic_other_documented_process";
    }

    if (description.includes("scour") || description.includes("foundation")) {
      return "hydraulic_scour_or_foundation_loss";
    }

    if (description.includes("embankment") || description.includes("retaining wall")) {
      return "hydraulic_approach_or_embankment_damage";
    }

    if (description.includes("flood") || description.includes("river")) {
      return "hydraulic_flood_action_unspecified";
    }

    return "hydraulic_unspecified";
  }

  if (family === "landslide_ground_movement") {
    if (description.includes("slope") || description.includes("landslide") || description.includes("frana")) {
      return "landslide_slope_instability";
    }

    return "ground_movement_unspecified";
  }

  if (family === "seismic") {
    if (description.includes("bearing") || description.includes("unseating")) {
      return "seismic_bearing_or_unseating";
    }

    if (description.includes("pier") || structure.includes("beam")) {
      return "seismic_pier_or_superstructure_damage";
    }

    return "seismic_unspecified";
  }

  if (family === "impact") {
    return crossing.includes("road") ? "impact_road_vehicle_collision" : "impact_unspecified";
  }

  if (family === "design_construction") {
    return "design_or_construction_deficiency";
  }

  if (family === "deterioration_maintenance") {
    return "deterioration_or_material_degradation";
  }

  if (family === "overload") {
    return "overload_or_excess_action";
  }

  return `unspecified_${extent}`;
}

export function buildFailurePatternTaxonomy(events) {
  const mappings = events.map((event) => ({
    confidence: event.description ? "probable" : "unspecified",
    event_id: event.event_id,
    failure_pattern: failurePatternForEvent(event),
    primary_cause_family: causeFamilyForEvent(event),
    raw_specific_cause: event.specific_cause || null,
    raw_triggered: event.triggered,
  }));
  const families = Object.fromEntries(
    CAUSE_FAMILY_ALIASES.map((alias) => [
      alias.family,
      {
        aliases: alias.values.filter(Boolean),
        patterns: uniqueValues(
          mappings
            .filter((item) => item.primary_cause_family === alias.family)
            .map((item) => item.failure_pattern),
          100
        ),
      },
    ])
  );

  return {
    caveat:
      "Failure patterns are normalized from current ARCUS fields and narrative cues; unspecified remains explicit.",
    families,
    hydraulic_intelligence_taxonomy: buildHydraulicIntelligenceTaxonomy(events),
    mapping: mappings,
    version: "failure-pattern-taxonomy-v1",
  };
}

function buildHydraulicIntelligenceTaxonomy(events) {
  const hydraulicEvents = events.filter((event) => event.hydraulic_intelligence);
  const sourceValuesFor = (mapping, canonical) =>
    Object.entries(mapping)
      .filter(([, value]) => value === canonical)
      .map(([source]) => source)
      .sort();
  const collect = (field, mapping) => {
    const byCanonical = new Map();

    hydraulicEvents.forEach((event) => {
      const value = event.hydraulic_intelligence?.[field] || null;

      if (!value) {
        return;
      }

      const record = byCanonical.get(value) || {
        canonical_value: value,
        definition:
          field === "trigger"
            ? "Curated hydraulic trigger observed in the documented collapse record."
            : field === "failure_process"
              ? "Curated hydraulic failure process extracted from documented collapse evidence."
              : field === "component_involved"
                ? "Curated component involved in the documented hydraulic collapse evidence."
                : "Curated evidence strength for the hydraulic process assignment.",
        source_values: sourceValuesFor(mapping, value),
        status: value.includes("other") ? "needs_review" : "active",
        taxonomy_version: event.hydraulic_intelligence.taxonomy_version || "hydraulic-v1",
      };

      byCanonical.set(value, record);
    });

    return [...byCanonical.values()].sort((left, right) =>
      left.canonical_value.localeCompare(right.canonical_value)
    );
  };

  return {
    components: collect("component_involved", HYDRAULIC_COMPONENT_MAPPING),
    evidence_levels: collect("evidence_level", HYDRAULIC_EVIDENCE_LEVEL_MAPPING),
    failure_processes: collect("failure_process", HYDRAULIC_FAILURE_PROCESS_MAPPING),
    triggers: collect("trigger", HYDRAULIC_TRIGGER_MAPPING),
  };
}

export function buildTerritorialReconciliation(ainopIndex, provincesGeojson) {
  const currentUnits = provincesGeojson.features.map((feature) => {
    const properties = feature.properties || {};
    const name = properties.den_uts || properties.den_prov || properties.den_cm;

    return {
      code: String(properties.cod_uts || properties.cod_prov || properties.cod_cm || ""),
      name,
      normalized: normalizeKey(name),
      type: properties.tipo_uts || null,
    };
  });

  const crosswalk = (ainopIndex.provinces || []).map((record) => {
    const sourceName = record.province;
    const normalized = normalizeKey(sourceName);
    const exact = currentUnits.find((unit) => unit.normalized === normalized);
    const alias = currentUnits.find((unit) =>
      ["monza_brianza", "forli_cesena", "massa_carrara"].includes(normalized) &&
      unit.normalized.includes(normalized.split("_")[0])
    );
    const match = exact || alias || null;

    return {
      current_unit_code: match?.code || null,
      current_unit_name: match?.name || null,
      mapping_type: exact ? "exact" : alias ? "alias" : "unresolved",
      notes: match
        ? `Matched to current ${match.type || "territorial unit"}.`
        : "No exact current province/UTS geometry match found; do not redistribute denominator silently.",
      source_name: sourceName,
    };
  });

  return {
    exact: crosswalk.filter((item) => item.mapping_type === "exact").length,
    alias: crosswalk.filter((item) => item.mapping_type === "alias").length,
    crosswalk,
    historical: crosswalk.filter((item) => item.mapping_type === "historical").length,
    unresolved: crosswalk.filter((item) => item.mapping_type === "unresolved").length,
  };
}

export function buildCauseSpecificIncidence(events, ainopIndex, taxonomy) {
  const provinceRecords = ainopIndex.provinces || [];
  const families = Object.keys(taxonomy.families).filter(
    (family) => family !== "unknown_unspecified"
  );
  const eventsByProvince = groupBy(events, (event) => normalizeKey(event.province));
  const nationalDenominator = provinceRecords.reduce(
    (total, record) => total + Number(record.denominator_count || 0),
    0
  );
  const nationalByFamily = Object.fromEntries(
    families.map((family) => [
      family,
      events.filter((event) => causeFamilyForEvent(event) === family).length,
    ])
  );
  const nationalRates = Object.fromEntries(
    families.map((family) => [
      family,
      nationalDenominator > 0
        ? round((nationalByFamily[family] / nationalDenominator) * 100, 6)
        : null,
    ])
  );
  const byProvince = provinceRecords.map((record) => {
    const denominator = Number(record.denominator_count || 0);
    const provinceEvents = eventsByProvince[normalizeKey(record.province)] || [];
    const causeFamilies = Object.fromEntries(
      families.map((family) => {
        const numerator = provinceEvents.filter(
          (event) => causeFamilyForEvent(event) === family
        ).length;
        const rate = denominator > 0 ? round((numerator / denominator) * 100, 6) : null;
        const nationalRate = nationalRates[family];

        return [
          family,
          {
            cause_family: family,
            dataset_version: ainopIndex.metadata?.dataset_version || null,
            data_cutoff_date: ainopIndex.metadata?.data_cutoff_date || null,
            denominator_confidence: record.denominator_confidence || record.confidence || "unavailable",
            denominator_count: denominator || null,
            minimum_support_met: numerator >= 3 && denominator >= 100,
            national_rate_per_100: nationalRate,
            numerator_count: numerator,
            numerator_evidence_strength: numeratorEvidenceStrength(provinceEvents, family),
            rate_per_100: rate,
            raw_rate_per_100: rate,
            relative_to_national:
              rate !== null && nationalRate > 0 ? round(rate / nationalRate, 3) : null,
            smoothing_options: {
              bayesian_exploratory: empiricalBayesRate({
                denominator,
                nationalRate,
                numerator,
                priorWeight: 100,
              }),
              log_transform: rate !== null ? round(Math.log1p(rate), 6) : null,
              raw: rate,
              winsorization_placeholder:
                "Requires family-specific distribution approval before production use.",
            },
          },
        ];
      })
    );

    return {
      cause_families: causeFamilies,
      province: record.province,
      province_key: record.province_key || normalizeKey(record.province),
    };
  });

  return {
    caveat:
      "Cause-specific incidence is experimental historical evidence, not probability.",
    national_rates_per_100: nationalRates,
    by_province: byProvince,
  };
}

function empiricalBayesRate({ denominator, nationalRate, numerator, priorWeight }) {
  if (!denominator || !Number.isFinite(nationalRate)) {
    return {
      formula: "(numerator + prior_cases) / (denominator + prior_weight) * 100",
      prior_rate_per_100: nationalRate ?? null,
      prior_weight: priorWeight,
      smoothed_rate_per_100: null,
    };
  }

  const priorCases = (nationalRate / 100) * priorWeight;

  return {
    formula: "(numerator + prior_cases) / (denominator + prior_weight) * 100",
    prior_rate_per_100: nationalRate,
    prior_weight: priorWeight,
    smoothed_rate_per_100: round(((numerator + priorCases) / (denominator + priorWeight)) * 100, 6),
  };
}

function numeratorEvidenceStrength(events, family) {
  const count = events.filter((event) => causeFamilyForEvent(event) === family).length;

  if (count >= 8) {
    return "moderate";
  }

  if (count >= 3) {
    return "limited";
  }

  if (count > 0) {
    return "single_or_sparse";
  }

  return "none";
}

export function buildSiteHazardSignatureExample(causeSpecificIncidence) {
  return {
    hydraulic: {
      highest_class: null,
      matched_classes: [],
      status: "not_evaluated_in_workbench_example",
    },
    landslide: {
      attention_area: false,
      highest_hazard_class: null,
      status: "not_evaluated_in_workbench_example",
    },
    project_profile: {
      bridge_use: null,
      crossing_type: null,
      foundation_concept: null,
      indicative_length_m: null,
      material: null,
      span_count: null,
      structural_typology: null,
    },
    seismic: {
      national_percentile: null,
      pga_p50_g: null,
      status: "not_evaluated_in_workbench_example",
    },
    territorial_context: {
      cause_specific_incidence: causeSpecificIncidence.by_province[0]?.cause_families || {},
      province: causeSpecificIncidence.by_province[0]?.province || null,
      region: null,
    },
  };
}

function groupBy(items, getter) {
  return items.reduce((accumulator, item) => {
    const key = getter(item);

    if (!accumulator[key]) {
      accumulator[key] = [];
    }

    accumulator[key].push(item);

    return accumulator;
  }, {});
}

function sourceQualityWeight(reliability) {
  const grade = reliability?.grade || "D";

  if (grade === "A") {
    return 1;
  }

  if (grade === "B") {
    return 0.85;
  }

  if (grade === "C") {
    return 0.6;
  }

  return 0.35;
}

function matchingFeaturesForEvent(event) {
  return {
    bridge_use: event.destination_use || null,
    crossing_type: event.bridge_crossing_type || null,
    material: event.material_type || null,
    province: event.province || null,
    region: event.region || null,
    structural_typology: event.structural_type || null,
  };
}

function similarity(site, event, mode = "site_only") {
  const caseFeatures = matchingFeaturesForEvent(event);
  const matched = [];
  const mismatched = [];
  const missing = [];
  const weights = {
    bridge_use: mode === "project_informed" ? 10 : 0,
    crossing_type: mode === "project_informed" ? 12 : 0,
    material: mode === "project_informed" ? 14 : 0,
    province: 4,
    region: 6,
    structural_typology: mode === "project_informed" ? 14 : 0,
  };
  let score = 0;
  let availableWeight = 0;

  Object.entries(weights).forEach(([feature, weight]) => {
    if (!weight) {
      return;
    }

    const siteValue = site.project_profile?.[feature] || site.territorial_context?.[feature] || site.territorial_context?.province;
    const caseValue = caseFeatures[feature];

    if (!siteValue || !caseValue) {
      missing.push({ case_value: caseValue || null, feature, site_value: siteValue || null });

      return;
    }

    availableWeight += weight;

    if (normalizeKey(siteValue) === normalizeKey(caseValue)) {
      score += weight;
      matched.push({ case_value: caseValue, contribution: weight, feature, site_value: siteValue });
    } else {
      mismatched.push({ case_value: caseValue, feature, site_value: siteValue });
    }
  });

  const hazardFamily = site.hazard_family || null;

  if (hazardFamily) {
    availableWeight += 30;

    if (causeFamilyForEvent(event) === hazardFamily) {
      score += 30;
      matched.push({
        case_value: causeFamilyForEvent(event),
        contribution: 30,
        feature: "hazard_family_to_documented_cause_family",
        site_value: hazardFamily,
      });
    } else {
      mismatched.push({
        case_value: causeFamilyForEvent(event),
        feature: "hazard_family_to_documented_cause_family",
        site_value: hazardFamily,
      });
    }
  }

  return {
    matched_features: matched,
    missing_features: missing,
    mismatched_features: mismatched,
    score: availableWeight ? round((score / availableWeight) * 100, 2) : 0,
  };
}

export function findAnalogues({
  events,
  excludeEventId = null,
  limit = 8,
  mode = "site_only",
  site,
}) {
  return events
    .filter((event) => event.event_id !== excludeEventId)
    .map((event) => {
      const sim = similarity(site, event, mode);

      return {
        event_id: event.event_id,
        evidence_quality: null,
        matched_features: sim.matched_features,
        matching_mode: mode,
        missing_features: sim.missing_features,
        mismatched_features: sim.mismatched_features,
        similarity: sim.score,
        source_count: null,
      };
    })
    .filter((item) => item.similarity > 0)
    .sort((left, right) => right.similarity - left.similarity || left.event_id.localeCompare(right.event_id))
    .slice(0, limit);
}

export function auditMatcherFeatureExclusion() {
  const blocked = [...new Set(OUTCOME_FIELDS)];
  const leaked = MATCHING_FIELDS.filter((field) => blocked.includes(field));

  return {
    blocked_outcome_fields: blocked,
    leakage_detected: leaked.length > 0,
    leaked_fields: leaked,
    matching_features: MATCHING_FIELDS,
  };
}

export function cohortOutcomes({ analogues, events, reliabilityByEvent, taxonomy }) {
  const byId = Object.fromEntries(events.map((event) => [event.event_id, event]));
  const cohortEvents = analogues.map((item) => byId[item.event_id]).filter(Boolean);
  const weights = cohortEvents.map((event) =>
    sourceQualityWeight(reliabilityByEvent[event.event_id])
  );
  const effectiveCount = weights.reduce((total, value) => total + value, 0);
  const patternCounts = {};
  const causeCounts = {};
  const extentCounts = {};
  let unspecified = 0;

  cohortEvents.forEach((event) => {
    const pattern = failurePatternForEvent(event);
    const family = causeFamilyForEvent(event);

    patternCounts[pattern] = (patternCounts[pattern] || 0) + 1;
    causeCounts[family] = (causeCounts[family] || 0) + 1;
    extentCounts[event.collapse_severity || "unspecified"] =
      (extentCounts[event.collapse_severity || "unspecified"] || 0) + 1;

    if (pattern.includes("unspecified")) {
      unspecified += 1;
    }
  });

  return {
    cause_patterns: Object.entries(patternCounts)
      .sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0]))
      .map(([pattern, count]) => ({
        count,
        evidence_strength: count >= 5 ? "medium" : count >= 2 ? "limited" : "single",
        pattern,
        share: cohortEvents.length ? round(count / cohortEvents.length, 3) : 0,
      })),
    cause_family_distribution: causeCounts,
    cohort_size: cohortEvents.length,
    collapse_extent: extentCounts,
    consequence_summary: {
      fatalities: cohortEvents.reduce((total, event) => total + Number(event.victims || 0), 0),
      injuries: cohortEvents.reduce((total, event) => total + Number(event.injuries || 0), 0),
    },
    effective_evidence_count: round(effectiveCount, 2),
    hydraulic_cohort: summarizeHydraulicCohort(
      cohortEvents.filter((event) => causeFamilyForEvent(event) === "hydraulic")
    ),
    evidence_limitations: [
      unspecified > 0
        ? `${unspecified} analogue outcome(s) have unspecified failure pattern.`
        : null,
      "Shares are within the documented analogue cohort, not probabilities for the selected site.",
      taxonomy?.caveat || null,
    ].filter(Boolean),
    unspecified_outcome_share: cohortEvents.length ? round(unspecified / cohortEvents.length, 3) : 0,
  };
}

export function evidenceStrength({ analogues, outcomes }) {
  const cohortSize = outcomes.cohort_size;
  const effective = outcomes.effective_evidence_count;
  const limitations = [];

  if (cohortSize < 3) {
    limitations.push("Fewer than three analogues.");
  }

  if (effective < 3) {
    limitations.push("Effective evidence count below three.");
  }

  if (outcomes.unspecified_outcome_share > 0.35) {
    limitations.push("High share of unspecified outcomes.");
  }

  const averageSimilarity = analogues.length
    ? analogues.reduce((total, item) => total + item.similarity, 0) / analogues.length
    : 0;

  if (averageSimilarity < 35) {
    limitations.push("Low mean similarity.");
  }

  let strength = "strong";

  if (limitations.length || effective < 8 || cohortSize < 8) {
    strength = effective >= 5 && cohortSize >= 5 ? "moderate" : "limited";
  }

  if (cohortSize < 3 || effective < 2) {
    strength = "insufficient";
  }

  return {
    effective_case_count: effective,
    evidence_strength: strength,
    limitations,
    reasons: [
      `Cohort size: ${cohortSize}.`,
      `Mean similarity: ${round(averageSimilarity, 2)}.`,
      `Unspecified outcome share: ${outcomes.unspecified_outcome_share}.`,
    ],
  };
}

export function compareAnalogMethods(events, reliabilityByEvent, taxonomy) {
  const target = events.find((event) => event.specific_cause === "Hydraulic") || events[0];
  const baseSite = {
    hazard_family: null,
    project_profile: {
      bridge_use: target.destination_use,
      crossing_type: target.bridge_crossing_type,
      material: target.material_type,
      structural_typology: target.structural_type,
    },
    territorial_context: {
      province: target.province,
      region: target.region,
    },
  };
  const methods = ["site_only", "project_informed"].map((mode) => {
    const analogues = findAnalogues({
      events,
      excludeEventId: target.event_id,
      limit: 8,
      mode,
      site: baseSite,
    });
    const outcomes = cohortOutcomes({ analogues, events, reliabilityByEvent, taxonomy });

    return {
      analogues,
      evidence_strength: evidenceStrength({ analogues, outcomes }),
      method: mode === "site_only" ? "weighted_explainable_similarity_site_only" : "weighted_explainable_similarity_project_informed",
      outcomes,
    };
  });
  const cohortFirstAnalogues = events
    .filter(
      (event) =>
        event.event_id !== target.event_id &&
        causeFamilyForEvent(event) === causeFamilyForEvent(target)
    )
    .slice(0, 12)
    .map((event) => ({
      event_id: event.event_id,
      matched_features: [
        {
          case_value: causeFamilyForEvent(event),
          contribution: null,
          feature: "cause_family_cohort",
          site_value: causeFamilyForEvent(target),
        },
      ],
      matching_mode: "cohort_first",
      missing_features: [],
      mismatched_features: [],
      similarity: null,
      source_count: null,
    }));
  const cohortFirstOutcomes = cohortOutcomes({
    analogues: cohortFirstAnalogues,
    events,
    reliabilityByEvent,
    taxonomy,
  });

  methods.push({
    analogues: cohortFirstAnalogues,
    evidence_strength: evidenceStrength({
      analogues: cohortFirstAnalogues.map((item) => ({ ...item, similarity: 50 })),
      outcomes: cohortFirstOutcomes,
    }),
    method: "cohort_first_hazard_family",
    outcomes: cohortFirstOutcomes,
  });

  return {
    caveat:
      "Site-only and project-informed similarity exclude outcome features. Cohort-first by known cause family is included only as a research baseline, not as a valid target-case matcher.",
    target_event_id: target.event_id,
    target_leakage_guard: {
      matching_features: MATCHING_FIELDS,
      outcome_features_excluded_from_similarity: OUTCOME_FIELDS,
    },
    methods,
    preferred_research_behavior:
      "project_informed gives the best explainable behavior when preliminary project fields exist; cohort-first is useful for studying outcome distributions but would leak target outcome if used as a matcher.",
  };
}

export function retrospectiveValidation(events) {
  const completeEvents = events.filter(
    (event) => event.event_id && event.province && event.region && event.specific_cause
  );
  const evaluated = completeEvents.map((event) => {
    const site = {
      hazard_family: null,
      project_profile: {
        bridge_use: event.destination_use,
        crossing_type: event.bridge_crossing_type,
        material: event.material_type,
        structural_typology: event.structural_type,
      },
      territorial_context: {
        province: event.province,
        region: event.region,
      },
    };
    const analogues = findAnalogues({
      events,
      excludeEventId: event.event_id,
      limit: 8,
      mode: "project_informed",
      site,
    });
    const analogueEvents = analogues.map((item) =>
      events.find((candidate) => candidate.event_id === item.event_id)
    ).filter(Boolean);
    const family = causeFamilyForEvent(event);
    const rankedFamilies = Object.entries(
      analogueEvents.reduce((accumulator, candidate) => {
        const candidateFamily = causeFamilyForEvent(candidate);

        accumulator[candidateFamily] = (accumulator[candidateFamily] || 0) + 1;

        return accumulator;
      }, {})
    ).sort((left, right) => right[1] - left[1]);

    return {
      analogue_count: analogues.length,
      event_id: event.event_id,
      expected_family: family,
      insufficient_evidence: analogues.length < 3,
      top1_hit: rankedFamilies[0]?.[0] === family,
      top3_hit: rankedFamilies.slice(0, 3).some(([candidateFamily]) => candidateFamily === family),
    };
  });

  return {
    caveat:
      "Metrics are retrospective pattern-retrieval performance, not collapse prediction accuracy.",
    geographical_holdout: validationWithHoldout(events, "region"),
    leave_one_out: summarizeValidation(evaluated),
    leakage_check:
      "specific_cause, failure pattern and collapse extent are excluded from similarity and used only for outcome evaluation.",
    temporal_holdout: temporalHoldout(events),
  };
}

function validationWithHoldout(events, geographyField) {
  const evaluated = events
    .filter((event) => event[geographyField] && event.specific_cause)
    .slice(0, 80)
    .map((event) => {
      const candidates = events.filter(
        (candidate) =>
          candidate.event_id !== event.event_id &&
          candidate[geographyField] !== event[geographyField]
      );
      const sameFamily = candidates.filter(
        (candidate) => causeFamilyForEvent(candidate) === causeFamilyForEvent(event)
      );

      return {
        event_id: event.event_id,
        insufficient_evidence: sameFamily.length < 3,
        top1_hit: sameFamily.length > 0,
        top3_hit: sameFamily.length > 0,
      };
    });

  return summarizeValidation(evaluated);
}

function temporalHoldout(events) {
  const cutoff = 2018;
  const training = events.filter((event) => extractYear(event.date) <= cutoff);
  const validation = events.filter((event) => extractYear(event.date) > cutoff);
  const evaluated = validation.map((event) => {
    const sameFamily = training.filter(
      (candidate) => causeFamilyForEvent(candidate) === causeFamilyForEvent(event)
    );

    return {
      event_id: event.event_id,
      insufficient_evidence: sameFamily.length < 3,
      top1_hit: sameFamily.length > 0,
      top3_hit: sameFamily.length > 0,
    };
  });

  return {
    cutoff_year: cutoff,
    training_count: training.length,
    validation_count: validation.length,
    ...summarizeValidation(evaluated),
  };
}

function summarizeValidation(rows) {
  const evaluated = rows.filter((row) => !row.insufficient_evidence);

  return {
    abstention_rate: rows.length ? round(rows.filter((row) => row.insufficient_evidence).length / rows.length, 3) : 0,
    evaluated_count: evaluated.length,
    insufficient_evidence_count: rows.filter((row) => row.insufficient_evidence).length,
    total_cases: rows.length,
    top1_cause_family_hit_rate: evaluated.length
      ? round(evaluated.filter((row) => row.top1_hit).length / evaluated.length, 3)
      : null,
    top3_cause_family_coverage: evaluated.length
      ? round(evaluated.filter((row) => row.top3_hit).length / evaluated.length, 3)
      : null,
  };
}

export function buildMitigationKnowledgeBase(taxonomy, events = []) {
  const patterns = Object.values(taxonomy.families).flatMap((family) => family.patterns);
  const eventsByPattern = events.reduce((accumulator, event) => {
    const pattern = failurePatternForEvent(event);

    accumulator[pattern] = accumulator[pattern] || [];
    accumulator[pattern].push(event);

    return accumulator;
  }, {});
  const entries = patterns.map((pattern) => {
    const hazardFamily = pattern.split("_")[0];
    const hydraulicInputs = (eventsByPattern[pattern] || [])
      .filter((event) => event.hydraulic_intelligence)
      .map((event) => ({
        component_involved: event.hydraulic_intelligence.component_involved,
        evidence_level: event.hydraulic_intelligence.evidence_level,
        event_id: event.event_id,
        failure_process: event.hydraulic_intelligence.failure_process,
      }));

    return {
      external_engineering_basis: [],
      failure_pattern: pattern,
      external_validation_required: true,
      hazard_family: hazardFamily,
      hydraulic_intelligence_inputs: hydraulicInputs,
      investigation_priorities: investigationPrioritiesForPattern(pattern),
      limitations: [
        "Draft mapping only; engineering measures require literature, standards and expert review.",
      ],
      mitigation_pathways: [],
      monitoring_considerations: [
        {
          label: "Focused inspection after relevant triggering events",
          status: "draft",
        },
      ],
      pattern_id: pattern,
      status: "draft",
    };
  });

  return {
    caveat:
      "This knowledge base identifies investigation and mitigation themes; it does not prescribe design solutions.",
    entries,
    status: "draft",
    version: "mitigation-knowledge-base-v1",
  };
}

function investigationPrioritiesForPattern(pattern) {
  if (pattern.startsWith("hydraulic")) {
    return [
      {
        action_id: "hydraulic_modelling",
        arcus_evidence: { analogue_count: null, effective_count: null, event_ids: [] },
        external_validation_required: true,
        label: "Hydraulic modelling",
        purpose: "Understand water levels, flow concentration and interaction with the crossing.",
        status: "draft",
        trigger_conditions: ["hydraulic exposure", pattern],
      },
      {
        action_id: "scour_assessment",
        arcus_evidence: { analogue_count: null, effective_count: null, event_ids: [] },
        external_validation_required: true,
        label: "Scour and foundation-support assessment",
        purpose: "Check whether documented analogues involve loss of foundation support or approach erosion.",
        status: "draft",
        trigger_conditions: ["P2/P3 hydraulic context", "hydraulic analogues"],
      },
    ];
  }

  if (pattern.startsWith("landslide") || pattern.startsWith("ground")) {
    return [
      {
        action_id: "slope_stability_investigation",
        arcus_evidence: { analogue_count: null, effective_count: null, event_ids: [] },
        external_validation_required: true,
        label: "Slope stability investigation",
        purpose: "Assess slope movement and abutment/approach-road sensitivity.",
        status: "draft",
        trigger_conditions: ["PAI landslide class", pattern],
      },
    ];
  }

  if (pattern.startsWith("seismic")) {
    return [
      {
        action_id: "seismic_site_response_review",
        arcus_evidence: { analogue_count: null, effective_count: null, event_ids: [] },
        external_validation_required: true,
        label: "Seismic site-response and detailing review",
        purpose: "Evaluate whether seismic demand and structural detailing require specialist study.",
        status: "draft",
        trigger_conditions: ["high MPS04 PGA", pattern],
      },
    ];
  }

  return [
    {
      action_id: "documented_case_review",
      arcus_evidence: { analogue_count: null, effective_count: null, event_ids: [] },
      external_validation_required: true,
      label: "Documented case review",
      purpose: "Review analogue documentation before proposing technical actions.",
      status: "draft",
      trigger_conditions: [pattern],
    },
  ];
}

export function valueAddBenchmark(analogComparison) {
  return {
    baseline_a_public_hazard_only: {
      auditability: "official source trace only",
      contribution: "describes hydraulic, landslide and seismic exposure",
      limitation: "does not explain how similar contexts have historically failed in ARCUS",
      specificity: "site exposure",
    },
    baseline_b_public_hazard_plus_general_hci: {
      auditability: "official sources + provincial historical rate",
      contribution: "adds general historical incidence",
      limitation: "does not identify cause-specific patterns or analogue outcomes",
      specificity: "site exposure + province-level evidence",
    },
    baseline_c_arcus_collapse_intelligence: {
      auditability: "official sources + ARCUS cases + source links + analogue explanations",
      contribution:
        "connects hazard signature with documented analogues, failure patterns, evidence strength and draft investigation priorities",
      limitation: "requires expert validation before production claims",
      specificity: "site/project context + empirical documented patterns",
    },
    demonstrative_cases: analogComparison.methods.map((method) => ({
      method: method.method,
      cohort_size: method.outcomes.cohort_size,
      leading_pattern: method.outcomes.cause_patterns[0]?.pattern || null,
      evidence_strength: method.evidence_strength.evidence_strength,
    })),
  };
}

export function buildAnalysis({ limit = null, outputPath = DEFAULT_OUTPUT } = {}) {
  const events = readJson(path.join(ROOT, "private-data", "processed", "events.json"));
  const sources = readJson(path.join(ROOT, "private-data", "processed", "sources.json"));
  const ainopIndex = readJson(path.join(ROOT, "private-data", "professional", "ainop-bridge-index.json"));
  const professionalEvents = readJson(path.join(ROOT, "private-data", "professional", "professional-events.json"));
  const provincesGeojson = readJson(path.join(ROOT, "public", "data", "geo", "italy-provinces.geojson"));
  const eventSet = limit ? events.slice(0, limit) : events;
  const reliabilityByEvent = buildSourceReliabilityByEvent(eventSet, sources);
  const dataAudit = auditDatabase(eventSet, sources);
  const taxonomy = buildFailurePatternTaxonomy(eventSet);
  const reconciliation = buildTerritorialReconciliation(ainopIndex, provincesGeojson);
  const causeSpecificIncidence = buildCauseSpecificIncidence(eventSet, ainopIndex, taxonomy);
  const analogMatchingComparison = compareAnalogMethods(eventSet, reliabilityByEvent, taxonomy);
  const validation = retrospectiveValidation(eventSet);
  const mitigationKnowledge = buildMitigationKnowledgeBase(taxonomy, eventSet);
  const enrichable = eventSet.filter(
    (event) => finite(event.latitude) && finite(event.longitude)
  ).length;
  const analysis = {
    analog_matching_comparison: analogMatchingComparison,
    cause_specific_incidence: causeSpecificIncidence,
    data_audit: dataAudit,
    evidence_strength_model: {
      candidates: [
        "rule_based_evidence_classes",
        "effective_sample_size",
        "weighted_evidence_count",
      ],
      selected_for_workbench: "effective_sample_size_plus_limitations",
    },
    failure_patterns: {
      families: taxonomy.families,
      mapping_count: taxonomy.mapping.length,
    },
    hazard_enrichment: {
      caveat: CURRENT_CONTEXT_CAVEAT,
      enrichable_events: enrichable,
      enrichable_percent: round((enrichable / eventSet.length) * 100, 1),
      output_files: [
        "private-data/professional/collapse-intelligence/collapse-hazard-signatures.json",
        "private-data/professional/collapse-intelligence/collapse-hazard-signatures-manifest.json",
        "private-data/professional/collapse-intelligence/collapse-hazard-signatures-errors.json",
      ],
    },
    human_decisions_required: [
      "Approve failure-pattern taxonomy.",
      "Approve abstention policy.",
      "Approve whether cause-specific incidence enters reports and how it is labelled.",
      "Validate mitigation mapping against literature, standards and experts.",
      "Define acceptable retrospective pattern-retrieval performance above baselines.",
    ],
    metadata: {
      analysis_version: ANALYSIS_VERSION,
      data_cutoff_date: ainopIndex.metadata?.data_cutoff_date || null,
      dataset_version: ainopIndex.metadata?.dataset_version || null,
      event_count: eventSet.length,
      professional_event_count: Array.isArray(professionalEvents)
        ? professionalEvents.length
        : professionalEvents.events?.length || null,
      source_count: sources.length,
      workbench_name: WORKBENCH_NAME,
    },
    mitigation_knowledge_model: {
      entry_count: mitigationKnowledge.entries.length,
      status: mitigationKnowledge.status,
    },
    retrospective_validation: validation,
    site_hazard_signature: buildSiteHazardSignatureExample(causeSpecificIncidence),
    territorial_reconciliation: {
      alias: reconciliation.alias,
      exact: reconciliation.exact,
      unresolved: reconciliation.unresolved,
    },
    value_add_benchmark: valueAddBenchmark(analogMatchingComparison),
  };

  writeJson(TAXONOMY_PATH, taxonomy);
  writeJson(MITIGATION_PATH, mitigationKnowledge);
  writeJson(CROSSWALK_PATH, reconciliation.crosswalk);
  writeJson(outputPath, analysis);

  return analysis;
}

if (process.argv[1] && path.resolve(process.argv[1]) === __filename) {
  const options = parseArgs();
  const analysis = buildAnalysis(options);

  console.log(
    JSON.stringify(
      {
        enrichable_percent: analysis.hazard_enrichment.enrichable_percent,
        event_count: analysis.metadata.event_count,
        output: options.outputPath,
        taxonomy_patterns: analysis.failure_patterns.mapping_count,
        unresolved_denominators: analysis.territorial_reconciliation.unresolved,
      },
      null,
      2
    )
  );
}
