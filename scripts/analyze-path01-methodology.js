import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DEFAULT_ROOT = path.resolve(__dirname, "..");
const DEFAULT_OUTPUT = path.join(
  DEFAULT_ROOT,
  "private-data",
  "professional",
  "methodology",
  "path01-methodology-analysis.json"
);

const ANALYSIS_VERSION = "path01-methodology-workbench-v1";

export const DECISION_QUESTION =
  "Quanto il sito selezionato richiede approfondimenti specialistici e misure di mitigazione prima della progettazione o realizzazione di una nuova infrastruttura di attraversamento?";

export const TEMPORARY_OUTPUT_NAME = "Preliminary Site Screening Priority";

const HYDRAULIC_SEVERITY = ["P1", "P2", "P3"];
const LANDSLIDE_SEVERITY = ["P1", "P2", "P3", "P4"];
const INCOMPLETE_STATUSES = new Set([
  "partial",
  "service_unreachable",
  "request_timeout",
  "http_error",
  "invalid_response",
  "provider_exception",
  "configuration_error",
  "outside_coverage",
]);

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8").replace(/^\uFEFF/, ""));
}

function round(value, decimals = 2) {
  if (!Number.isFinite(value)) {
    return null;
  }

  const factor = 10 ** decimals;

  return Math.round(value * factor) / factor;
}

function clamp(value, min = 0, max = 100) {
  return Math.max(min, Math.min(max, value));
}

function finiteNumbers(values) {
  return values.map(Number).filter(Number.isFinite);
}

function sortedNumbers(values) {
  return finiteNumbers(values).sort((left, right) => left - right);
}

function percentile(sortedValues, percentileValue) {
  if (!sortedValues.length) {
    return null;
  }

  if (sortedValues.length === 1) {
    return sortedValues[0];
  }

  const position = (percentileValue / 100) * (sortedValues.length - 1);
  const lower = Math.floor(position);
  const upper = Math.ceil(position);
  const weight = position - lower;

  return sortedValues[lower] * (1 - weight) + sortedValues[upper] * weight;
}

function empiricalPercentile(sortedValues, value) {
  if (!Number.isFinite(value) || !sortedValues.length) {
    return null;
  }

  const lowerOrEqual = sortedValues.filter((item) => item <= value).length;

  return (lowerOrEqual / sortedValues.length) * 100;
}

function distribution(values) {
  const sorted = sortedNumbers(values);

  if (!sorted.length) {
    return {
      count: 0,
      max: null,
      mean: null,
      median: null,
      min: null,
      p5: null,
      p10: null,
      p25: null,
      p50: null,
      p75: null,
      p90: null,
      p95: null,
      stddev: null,
    };
  }

  const mean =
    sorted.reduce((total, value) => total + value, 0) / sorted.length;
  const variance =
    sorted.reduce((total, value) => total + (value - mean) ** 2, 0) /
    sorted.length;

  return {
    count: sorted.length,
    max: round(sorted.at(-1), 6),
    mean: round(mean, 6),
    median: round(percentile(sorted, 50), 6),
    min: round(sorted[0], 6),
    p5: round(percentile(sorted, 5), 6),
    p10: round(percentile(sorted, 10), 6),
    p25: round(percentile(sorted, 25), 6),
    p50: round(percentile(sorted, 50), 6),
    p75: round(percentile(sorted, 75), 6),
    p90: round(percentile(sorted, 90), 6),
    p95: round(percentile(sorted, 95), 6),
    stddev: round(Math.sqrt(variance), 6),
  };
}

function classScore(className, order, valuesByClass, emptyScore = 0) {
  if (!className) {
    return emptyScore;
  }

  if (!order.includes(className)) {
    return null;
  }

  return valuesByClass[className];
}

function hydraulicScores(hydraulic) {
  const status = hydraulic?.status || "unavailable";
  const highestClass = hydraulic?.highest_class || null;

  if (INCOMPLETE_STATUSES.has(status)) {
    return {
      conservative_nonlinear: null,
      linear_ordinal: null,
      rule_based: null,
    };
  }

  return {
    conservative_nonlinear: classScore(
      highestClass,
      HYDRAULIC_SEVERITY,
      { P1: 20, P2: 55, P3: 100 },
      0
    ),
    linear_ordinal: classScore(
      highestClass,
      HYDRAULIC_SEVERITY,
      { P1: 33.33, P2: 66.67, P3: 100 },
      0
    ),
    rule_based: classScore(
      highestClass,
      HYDRAULIC_SEVERITY,
      { P1: 20, P2: 55, P3: 100 },
      0
    ),
  };
}

function landslideScores(landslide) {
  const status = landslide?.status || "unavailable";
  const highestClass = landslide?.highest_hazard_class || null;

  if (INCOMPLETE_STATUSES.has(status)) {
    return {
      conservative_nonlinear: null,
      linear_ordinal: null,
      rule_based: null,
    };
  }

  return {
    conservative_nonlinear: classScore(
      highestClass,
      LANDSLIDE_SEVERITY,
      { P1: 15, P2: 40, P3: 70, P4: 100 },
      0
    ),
    linear_ordinal: classScore(
      highestClass,
      LANDSLIDE_SEVERITY,
      { P1: 25, P2: 50, P3: 75, P4: 100 },
      0
    ),
    rule_based: classScore(
      highestClass,
      LANDSLIDE_SEVERITY,
      { P1: 15, P2: 40, P3: 70, P4: 100 },
      0
    ),
  };
}

function robustMinMax(value, stats) {
  if (!Number.isFinite(value) || !Number.isFinite(stats.p5) || !Number.isFinite(stats.p95)) {
    return null;
  }

  if (stats.p95 === stats.p5) {
    return 0;
  }

  return clamp(((value - stats.p5) / (stats.p95 - stats.p5)) * 100);
}

function seismicScores(seismic, context) {
  const pga = Number(seismic?.pga_p50_g);

  if (seismic?.status !== "available" || !Number.isFinite(pga)) {
    return {
      empirical_percentile: null,
      nonlinear_percentile_sqrt: null,
      robust_minmax_p5_p95: null,
    };
  }

  const empirical = empiricalPercentile(context.seismicSortedPga, pga);

  return {
    empirical_percentile: round(empirical, 2),
    nonlinear_percentile_sqrt: round(Math.sqrt(empirical / 100) * 100, 2),
    robust_minmax_p5_p95: round(robustMinMax(pga, context.seismicDistribution), 2),
  };
}

function logNormalize(value, maxValue) {
  if (!Number.isFinite(value) || value <= 0 || !Number.isFinite(maxValue) || maxValue <= 0) {
    return value === 0 ? 0 : null;
  }

  return clamp((Math.log1p(value) / Math.log1p(maxValue)) * 100);
}

function historicalScores(historical, context) {
  const relative = Number(historical?.relative_to_national);
  const rate = Number(historical?.provincial_rate_per_100);
  const denominator = Number(historical?.denominator_count);

  if (!Number.isFinite(denominator) || denominator <= 0) {
    return {
      empirical_class: null,
      log_relative: null,
      percentile_rank: null,
      winsorized_relative: null,
    };
  }

  const percentileRank = empiricalPercentile(context.hciSortedRelative, relative);
  const winsorCap = context.hciDistribution.relative_to_national.p95;

  return {
    empirical_class: round(empiricalClass(percentileRank), 2),
    log_relative: round(
      logNormalize(relative, context.hciDistribution.relative_to_national.max),
      2
    ),
    percentile_rank: round(percentileRank, 2),
    winsorized_relative: round(
      clamp((Math.min(relative, winsorCap) / winsorCap) * 100),
      2
    ),
    provincial_rate_percentile: round(
      empiricalPercentile(context.hciSortedRate, rate),
      2
    ),
  };
}

function empiricalClass(percentileRank) {
  if (!Number.isFinite(percentileRank)) {
    return null;
  }

  if (percentileRank >= 90) {
    return 100;
  }

  if (percentileRank >= 75) {
    return 75;
  }

  if (percentileRank >= 50) {
    return 50;
  }

  if (percentileRank > 0) {
    return 25;
  }

  return 0;
}

function statusFlags(scenario) {
  const flags = [];
  const hydraulicClass = scenario.hydraulic?.highest_class || null;
  const landslideClass = scenario.landslide?.highest_hazard_class || null;
  const attentionArea = Boolean(scenario.landslide?.attention_area);
  const statuses = [
    scenario.hydraulic?.status,
    scenario.landslide?.status,
    scenario.seismic?.status,
  ].filter(Boolean);

  if (hydraulicClass === "P3") {
    flags.push("hydraulic_p3_major_constraint");
  }

  if (landslideClass === "P4") {
    flags.push("landslide_p4_critical_hazard");
  }

  if (attentionArea) {
    flags.push("landslide_attention_area");
  }

  if (statuses.some((status) => status === "partial")) {
    flags.push("incomplete_assessment");
  }

  if (statuses.some((status) => INCOMPLETE_STATUSES.has(status))) {
    flags.push("source_unavailable_or_incomplete");
  }

  const severeCount = [
    hydraulicClass === "P3",
    ["P3", "P4"].includes(landslideClass),
    Number(scenario.seismic?.pga_p50_g) >= 0.2,
  ].filter(Boolean).length;

  if (severeCount >= 2) {
    flags.push("multi_hazard_escalation");
  }

  if (
    flags.includes("hydraulic_p3_major_constraint") ||
    flags.includes("landslide_p4_critical_hazard") ||
    flags.includes("multi_hazard_escalation")
  ) {
    flags.push("detailed_study_required");
  }

  if (
    scenario.historical?.denominator_count === null ||
    scenario.historical?.denominator_count === undefined ||
    !Number.isFinite(Number(scenario.historical.denominator_count))
  ) {
    flags.push("historical_denominator_missing");
  }

  return [...new Set(flags)].sort();
}

function meanAvailable(values) {
  const numbers = finiteNumbers(values);

  if (!numbers.length) {
    return null;
  }

  return numbers.reduce((total, value) => total + value, 0) / numbers.length;
}

function aggregateModels(components, flags) {
  const additiveWeights = {
    historical_evidence_modifier: 0.15,
    hydraulic: 0.25,
    landslide: 0.25,
    seismic: 0.35,
  };
  const weightedComponents = [
    [components.hydraulic.conservative_nonlinear, additiveWeights.hydraulic],
    [components.landslide.conservative_nonlinear, additiveWeights.landslide],
    [components.seismic.empirical_percentile, additiveWeights.seismic],
    [components.historical.percentile_rank, additiveWeights.historical_evidence_modifier],
  ];
  const availableWeighted = weightedComponents.filter(([value]) =>
    Number.isFinite(value)
  );
  const weightTotal = availableWeighted.reduce(
    (total, [, weight]) => total + weight,
    0
  );
  const weightedAdditive =
    weightTotal > 0
      ? availableWeighted.reduce(
          (total, [value, weight]) => total + value * weight,
          0
        ) / weightTotal
      : null;
  const maxDominant = meanAvailable([
    components.hydraulic.conservative_nonlinear,
    components.landslide.conservative_nonlinear,
    components.seismic.empirical_percentile,
  ]);
  const maxDominantScore = Math.max(
    ...finiteNumbers([
      components.hydraulic.conservative_nonlinear,
      components.landslide.conservative_nonlinear,
      components.seismic.empirical_percentile,
      maxDominant === null ? null : maxDominant,
    ])
  );
  const ruleTier = ruleBasedTier(components, flags);

  return {
    max_dominant: {
      rationale:
        "Uses the maximum official hazard component; historical evidence remains a separate modifier.",
      score: Number.isFinite(maxDominantScore) ? round(maxDominantScore, 2) : null,
    },
    rule_based_tier_plus_modifier: ruleTier,
    weighted_additive: {
      rationale:
        "Experimental transparent weighted blend; exposes compensation risk when one severe hazard is offset by low values elsewhere.",
      score: round(weightedAdditive, 2),
      weights: additiveWeights,
    },
  };
}

function ruleBasedTier(components, flags) {
  let tier = "ordinary_screening";
  let score = Math.max(
    ...finiteNumbers([
      components.hydraulic.rule_based,
      components.landslide.rule_based,
      components.seismic.empirical_percentile,
      components.historical.percentile_rank,
    ]),
    0
  );
  const reasons = [];

  if (flags.includes("landslide_p4_critical_hazard")) {
    tier = "critical_specialist_review";
    score = Math.max(score, 90);
    reasons.push("P4 landslide cannot be compensated by low values elsewhere.");
  }

  if (flags.includes("hydraulic_p3_major_constraint")) {
    tier = tier === "critical_specialist_review"
      ? tier
      : "major_constraint_review";
    score = Math.max(score, 82);
    reasons.push("P3 hydraulic exposure triggers major constraint review.");
  }

  if (flags.includes("multi_hazard_escalation")) {
    tier = tier === "ordinary_screening"
      ? "multi_hazard_review"
      : tier;
    score = Math.max(score, 78);
    reasons.push("Multiple severe components trigger escalation.");
  }

  if (flags.includes("source_unavailable_or_incomplete")) {
    tier = tier === "ordinary_screening" ? "incomplete_assessment" : tier;
    reasons.push("Missing or partial source data must be explicit, not converted to zero.");
  }

  if (flags.includes("landslide_attention_area")) {
    reasons.push("AA attention area is reported separately from P1-P4 hazard.");
  }

  return {
    rationale: reasons.length
      ? reasons.join(" ")
      : "No non-compensatory trigger fired in this synthetic scenario.",
    score: round(score, 2),
    tier,
  };
}

function scenarioMatrix(context) {
  const hci = context.hciReferenceValues;
  const pga = context.seismicReferenceValues;

  return [
    scenario("S01", "No official intersections, low PGA, low HCI", null, null, pga.low, hci.low),
    scenario("S02", "No official intersections, high HCI outlier", null, null, pga.low, hci.high),
    scenario("S03", "Hydraulic P1 only", "P1", null, pga.low, hci.low),
    scenario("S04", "Hydraulic P1/P2 overlap", "P2", null, pga.low, hci.medium),
    scenario("S05", "Hydraulic P1/P2/P3 overlap", "P3", null, pga.low, hci.medium),
    scenario("S06", "Landslide AA only", null, "AA", pga.low, hci.low),
    scenario("S07", "Landslide P1", null, "P1", pga.low, hci.medium),
    scenario("S08", "Landslide P2", null, "P2", pga.medium, hci.medium),
    scenario("S09", "Landslide P3", null, "P3", pga.medium, hci.medium),
    scenario("S10", "Landslide P4", null, "P4", pga.low, hci.low),
    scenario("S11", "Landslide P3 plus AA", null, "P3+AA", pga.medium, hci.medium),
    scenario("S12", "Landslide P4 plus AA", null, "P4+AA", pga.low, hci.low),
    scenario("S13", "Medium PGA only", null, null, pga.medium, hci.low),
    scenario("S14", "High PGA only", null, null, pga.high, hci.low),
    scenario("S15", "Very high PGA only", null, null, pga.veryHigh, hci.low),
    scenario("S16", "Hydraulic P2 and landslide P2", "P2", "P2", pga.low, hci.medium),
    scenario("S17", "Hydraulic P3 and landslide P1", "P3", "P1", pga.low, hci.medium),
    scenario("S18", "Hydraulic P3 and landslide P3", "P3", "P3", pga.medium, hci.medium),
    scenario("S19", "Hydraulic P1 and high PGA", "P1", null, pga.high, hci.low),
    scenario("S20", "Landslide P4 and high PGA", null, "P4", pga.high, hci.low),
    scenario("S21", "All official components elevated", "P3", "P4", pga.high, hci.high),
    scenario("S22", "Historical outlier with no official intersections", null, null, pga.low, hci.outlier),
    scenario("S23", "Zero HCI distinct from missing", null, null, pga.medium, hci.zero),
    scenario("S24", "Missing denominator with moderate hazards", "P2", "P2", pga.medium, hci.missingDenominator),
    scenario("S25", "Hydraulic source unavailable", "unavailable", null, pga.medium, hci.medium),
    scenario("S26", "Landslide source partial", null, "partial", pga.medium, hci.medium),
    scenario("S27", "Seismic outside coverage", "P1", "P1", null, hci.medium, "outside_coverage"),
    scenario("S28", "All providers unavailable", "unavailable", "partial", null, hci.medium, "configuration_error"),
    scenario("S29", "Low hazards, high confidence denominator", null, null, pga.low, hci.highConfidenceLow),
    scenario("S30", "Single-event small denominator influence", null, null, pga.low, hci.smallDenominator),
    scenario("S31", "Hydraulic P3 with unavailable landslide", "P3", "partial", pga.medium, hci.medium),
    scenario("S32", "P4 with zero historical incidence", null, "P4", pga.low, hci.zero),
  ];
}

function scenario(
  id,
  label,
  hydraulicClass,
  landslideClass,
  pga,
  historical,
  seismicStatus = "available"
) {
  return {
    historical,
    hydraulic: hydraulicInput(hydraulicClass),
    id,
    label,
    landslide: landslideInput(landslideClass),
    seismic: seismicInput(pga, seismicStatus),
  };
}

function hydraulicInput(className) {
  if (className === "unavailable") {
    return {
      highest_class: null,
      matched_classes: [],
      status: "provider_exception",
    };
  }

  if (!className) {
    return {
      highest_class: null,
      matched_classes: [],
      status: "no_intersection",
    };
  }

  const index = HYDRAULIC_SEVERITY.indexOf(className);

  return {
    highest_class: className,
    matched_classes: HYDRAULIC_SEVERITY.slice(0, index + 1),
    status: "available",
  };
}

function landslideInput(className) {
  if (className === "partial") {
    return {
      attention_area: false,
      highest_hazard_class: null,
      matched_attention_classes: [],
      matched_hazard_classes: [],
      status: "partial",
    };
  }

  if (!className) {
    return {
      attention_area: false,
      highest_hazard_class: null,
      matched_attention_classes: [],
      matched_hazard_classes: [],
      status: "no_intersection",
    };
  }

  const hasAttention = className.includes("AA");
  const hazardClass = LANDSLIDE_SEVERITY.find((item) => className.includes(item)) || null;

  return {
    attention_area: hasAttention || className === "AA",
    highest_hazard_class: hazardClass,
    matched_attention_classes: hasAttention || className === "AA" ? ["AA"] : [],
    matched_hazard_classes: hazardClass ? [hazardClass] : [],
    status: "available",
  };
}

function seismicInput(pga, status) {
  if (status !== "available") {
    return {
      nearest_node_distance_m: null,
      pga_p16_g: null,
      pga_p50_g: null,
      pga_p84_g: null,
      status,
    };
  }

  return {
    nearest_node_distance_m: 2500,
    pga_p16_g: Number.isFinite(pga) ? round(pga * 0.78, 4) : null,
    pga_p50_g: Number.isFinite(pga) ? round(pga, 4) : null,
    pga_p84_g: Number.isFinite(pga) ? round(pga * 1.22, 4) : null,
    status: "available",
  };
}

function scenarioHistorical(values, kind) {
  return {
    denominator_count: values.denominator_count,
    denominator_confidence: values.denominator_confidence,
    kind,
    numerator_count: values.numerator_count,
    provincial_rate_per_100: values.provincial_rate_per_100,
    relative_to_national: values.relative_to_national,
  };
}

function buildContext(rootDir) {
  const ainop = readJson(
    path.join(rootDir, "private-data", "professional", "ainop-bridge-index.json")
  );
  const seismicGrid = readJson(
    path.join(rootDir, "private-data", "professional", "seismic", "mps04-grid.json")
  );
  const seismicManifest = readJson(
    path.join(rootDir, "private-data", "professional", "seismic", "mps04-manifest.json")
  );
  const pgaValues = seismicGrid.nodes.map((node) => Number(node.pga_p50_g));
  const hciRows = ainop.provinces || [];
  const hciAvailable = hciRows.filter(
    (row) => Number(row.denominator_count) > 0 &&
      Number.isFinite(Number(row.relative_to_national))
  );
  const hciSortedRelative = sortedNumbers(
    hciAvailable.map((row) => row.relative_to_national)
  );
  const hciSortedRate = sortedNumbers(
    hciAvailable.map((row) => row.provincial_rate_per_100)
  );
  const hciByKind = historicalReferenceValues(hciRows, hciAvailable);

  return {
    ainop,
    hciDistribution: {
      denominator_count: distribution(hciRows.map((row) => row.denominator_count)),
      numerator_count: distribution(hciRows.map((row) => row.numerator_count)),
      provincial_rate_per_100: distribution(
        hciAvailable.map((row) => row.provincial_rate_per_100)
      ),
      relative_to_national: distribution(
        hciAvailable.map((row) => row.relative_to_national)
      ),
      unavailable_denominator_count: hciRows.filter(
        (row) => !Number(row.denominator_count)
      ).length,
    },
    hciReferenceValues: hciByKind,
    hciSortedRate,
    hciSortedRelative,
    seismicDistribution: distribution(pgaValues),
    seismicManifest,
    seismicReferenceValues: seismicReferenceValues(pgaValues),
    seismicSortedPga: sortedNumbers(pgaValues),
  };
}

function historicalReferenceValues(allRows, availableRows) {
  const sortedByRelative = [...availableRows].sort(
    (left, right) => Number(left.relative_to_national) - Number(right.relative_to_national)
  );
  const rowAt = (percentileValue) =>
    sortedByRelative[
      Math.min(
        sortedByRelative.length - 1,
        Math.max(0, Math.round((percentileValue / 100) * (sortedByRelative.length - 1)))
      )
    ];
  const zeroRow = availableRows.find(
    (row) => Number(row.numerator_count) === 0 && Number(row.denominator_count) > 0
  ) || rowAt(0);
  const missingRow = allRows.find((row) => !Number(row.denominator_count)) || {};
  const smallDenominator = availableRows
    .filter((row) => Number(row.denominator_count) > 0 && Number(row.denominator_count) < 25)
    .sort((left, right) => Number(right.relative_to_national) - Number(left.relative_to_national))[0] ||
    rowAt(95);

  return {
    high: scenarioHistorical(rowAt(90), "p90_relative_incidence"),
    highConfidenceLow: scenarioHistorical(
      availableRows.find(
        (row) => row.denominator_confidence === "high" && Number(row.relative_to_national) < 1
      ) || rowAt(25),
      "high_confidence_low_incidence"
    ),
    low: scenarioHistorical(rowAt(20), "p20_relative_incidence"),
    medium: scenarioHistorical(rowAt(50), "p50_relative_incidence"),
    missingDenominator: scenarioHistorical(
      {
        denominator_confidence: "unavailable",
        denominator_count: null,
        numerator_count: Number(missingRow.numerator_count) || 1,
        provincial_rate_per_100: null,
        relative_to_national: null,
      },
      "missing_denominator"
    ),
    outlier: scenarioHistorical(rowAt(100), "max_relative_incidence"),
    smallDenominator: scenarioHistorical(
      smallDenominator,
      "small_denominator_high_leverage"
    ),
    zero: scenarioHistorical(zeroRow, "zero_documented_events"),
  };
}

function seismicReferenceValues(pgaValues) {
  const sorted = sortedNumbers(pgaValues);

  return {
    high: percentile(sorted, 85),
    low: percentile(sorted, 20),
    medium: percentile(sorted, 50),
    veryHigh: percentile(sorted, 95),
  };
}

function evaluateScenarios(scenarios, context) {
  return scenarios.map((item) => {
    const components = {
      historical: historicalScores(item.historical, context),
      hydraulic: hydraulicScores(item.hydraulic),
      landslide: landslideScores(item.landslide),
      seismic: seismicScores(item.seismic, context),
    };
    const flags = statusFlags(item);
    const models = aggregateModels(components, flags);

    return {
      ...item,
      experimental_components: components,
      flags,
      model_results: models,
      paradox_notes: paradoxNotes(item, components, models, flags),
    };
  });
}

function paradoxNotes(scenarioItem, components, models, flags) {
  const notes = [];

  if (
    scenarioItem.landslide?.highest_hazard_class === "P4" &&
    models.weighted_additive.score < 70
  ) {
    notes.push("Weighted additive can make P4 look moderate when other components are low.");
  }

  if (
    !scenarioItem.hydraulic?.highest_class &&
    !scenarioItem.landslide?.highest_hazard_class &&
    components.historical.percentile_rank >= 90
  ) {
    notes.push("Historical outlier can outrank official low/no-intersection scenarios; label as evidence, not hazard.");
  }

  if (flags.includes("source_unavailable_or_incomplete")) {
    notes.push("Unavailable official source must not be scored as zero.");
  }

  if (scenarioItem.historical?.kind === "small_denominator_high_leverage") {
    notes.push("Small denominator can amplify Historical Collapse Incidence.");
  }

  if (scenarioItem.landslide?.attention_area) {
    notes.push("AA is a separate attention flag, not an ordered P1-P4 hazard class.");
  }

  return notes;
}

function sensitivityAnalysis(evaluatedScenarios) {
  const configs = [
    { historical: 0.1, hydraulic: 0.3, landslide: 0.3, name: "hazard_balanced", seismic: 0.3 },
    { historical: 0.05, hydraulic: 0.45, landslide: 0.25, name: "hydraulic_sensitive", seismic: 0.25 },
    { historical: 0.05, hydraulic: 0.2, landslide: 0.45, name: "landslide_sensitive", seismic: 0.3 },
    { historical: 0.05, hydraulic: 0.2, landslide: 0.2, name: "seismic_sensitive", seismic: 0.55 },
    { historical: 0.3, hydraulic: 0.23, landslide: 0.23, name: "historical_sensitive", seismic: 0.24 },
  ];
  const rankings = configs.map((config) => ({
    config,
    ranking: rankByScore(
      evaluatedScenarios.map((item) => ({
        id: item.id,
        score: weightedScenario(item.experimental_components, config),
      }))
    ),
  }));
  const baseline = rankings[0].ranking;
  const rankDeltas = evaluatedScenarios.map((item) => {
    const baselineRank = baseline.find((ranked) => ranked.id === item.id)?.rank;
    const ranks = rankings.map((entry) =>
      entry.ranking.find((ranked) => ranked.id === item.id)?.rank
    );
    const deltas = ranks.map((rankValue) => Math.abs(rankValue - baselineRank));

    return {
      id: item.id,
      max_rank_delta: Math.max(...deltas),
      ranks_by_config: Object.fromEntries(
        rankings.map((entry, index) => [entry.config.name, ranks[index]])
      ),
    };
  });

  return {
    configurations: configs,
    max_rank_delta: Math.max(...rankDeltas.map((item) => item.max_rank_delta)),
    rank_deltas: rankDeltas,
    unstable_scenarios: rankDeltas
      .filter((item) => item.max_rank_delta >= 8)
      .map((item) => item.id),
  };
}

function weightedScenario(components, weights) {
  const values = [
    [components.hydraulic.conservative_nonlinear, weights.hydraulic],
    [components.landslide.conservative_nonlinear, weights.landslide],
    [components.seismic.empirical_percentile, weights.seismic],
    [components.historical.percentile_rank, weights.historical],
  ].filter(([value]) => Number.isFinite(value));
  const totalWeight = values.reduce((total, [, weight]) => total + weight, 0);

  return values.reduce((total, [value, weight]) => total + value * weight, 0) /
    totalWeight;
}

function rankByScore(rows) {
  return rows
    .map((row) => ({ ...row, score: round(row.score, 4) }))
    .sort((left, right) => right.score - left.score || left.id.localeCompare(right.id))
    .map((row, index) => ({ ...row, rank: index + 1 }));
}

function dependencyMap() {
  return {
    confidence: [
      "provider status",
      "source availability",
      "nearest MPS04 node distance",
      "AINOP denominator confidence",
      "dataset freshness",
    ],
    data_quality: [
      "source availability",
      "source freshness",
      "spatial resolution",
      "provider status",
      "denominator confidence",
      "missing data",
    ],
    historical_evidence: [
      "ARCUS documented collapses by province",
      "AINOP denominator by province",
      "national reference rate",
    ],
    official_hazard_exposure: [
      "ISPRA hydraulic point intersection",
      "ISPRA PAI landslide point intersection",
      "INGV MPS04 nearest-node PGA p50",
    ],
    screening_flags: [
      "critical hazard",
      "attention area",
      "incomplete assessment",
      "source unavailable",
      "detailed study required",
    ],
  };
}

function gapAnalysis() {
  return {
    future: [
      "Area and route/tracciato exposure, not only point sampling.",
      "Formal calibration with expert review and retrospective validation.",
      "Path 02 asset-level overlay against official hazard datasets.",
    ],
    not_required_for_workbench: [
      "Production Final Priority Index change.",
      "Structural safety verification or NTC conformity language.",
      "Collapse probability model.",
    ],
    required_before_production_scoring: [
      "Human approval of normalization family per hazard.",
      "Human approval of non-compensatory trigger rules.",
      "Treatment of unavailable/partial official sources.",
      "Calibration protocol and acceptance criteria.",
    ],
    useful_next: [
      "Expert-labelled benchmark sites.",
      "Sensitivity review with domain experts.",
      "Confidence vocabulary for reports.",
      "Explicit disclaimer separating hazard, historical evidence and confidence.",
    ],
  };
}

export function runPath01MethodologyAnalysis({
  outputPath = DEFAULT_OUTPUT,
  rootDir = DEFAULT_ROOT,
  write = true,
} = {}) {
  const context = buildContext(rootDir);
  const scenarios = scenarioMatrix(context);
  const evaluatedScenarios = evaluateScenarios(scenarios, context);
  const analysis = {
    analysis_version: ANALYSIS_VERSION,
    candidate_output_name: TEMPORARY_OUTPUT_NAME,
    decision_question: DECISION_QUESTION,
    disclaimers: [
      "This file is a methodology workbench, not a production scoring formula.",
      "It does not modify ARCUS Final Priority Index, 70/30 weights or provider outputs.",
      "Official hazard exposure, historical evidence and confidence are kept separate.",
    ],
    distributions: {
      historical_collapse_incidence: context.hciDistribution,
      seismic_pga_p50_g: context.seismicDistribution,
    },
    gap_analysis: gapAnalysis(),
    input_schema: {
      confidence: {
        denominator_confidence: "high | medium | low | very_low | unavailable",
        nearest_node_distance_m: "number | null",
        provider_statuses: "per-source status values",
      },
      historical_evidence: {
        denominator_count: "number | null",
        numerator_count: "number",
        provincial_rate_per_100: "number | null",
        relative_to_national: "number | null",
      },
      official_hazard_exposure: {
        hydraulic: "status, matched_classes, highest_class",
        landslide: "status, matched_hazard_classes, matched_attention_classes, highest_hazard_class, attention_area",
        seismic: "status, pga_p16_g, pga_p50_g, pga_p84_g, nearest_node_distance_m",
      },
      screening_flags: "derived from official exposure and data availability",
    },
    normalization_options: {
      historical_evidence: [
        "percentile_rank",
        "log_relative",
        "winsorized_relative",
        "empirical_class",
      ],
      hydraulic: [
        "linear_ordinal",
        "conservative_nonlinear",
        "rule_based_p3_flag",
      ],
      landslide: [
        "linear_ordinal",
        "conservative_nonlinear",
        "rule_based_p4_flag",
        "AA_attention_area_separate",
      ],
      seismic: [
        "empirical_percentile",
        "robust_minmax_p5_p95",
        "nonlinear_percentile_sqrt",
      ],
    },
    source_inventory: {
      ainop_bridge_index: {
        dataset_scope: context.ainop.metadata?.dataset_scope,
        provinces: context.ainop.provinces?.length || 0,
        total_arcus_cases: context.ainop.metadata?.total_arcus_cases,
        total_ainop_bridges: context.ainop.metadata?.total_ainop_bridges,
      },
      mps04_grid: {
        bbox: context.seismicManifest.coverage_bbox_wgs84,
        dataset_version: context.seismicManifest.dataset_version,
        node_count: context.seismicManifest.node_count,
        unit: context.seismicManifest.unit,
      },
    },
    variable_dependency_map: dependencyMap(),
    scenario_matrix: evaluatedScenarios,
    sensitivity: sensitivityAnalysis(evaluatedScenarios),
  };

  if (write) {
    fs.mkdirSync(path.dirname(outputPath), { recursive: true });
    fs.writeFileSync(`${outputPath}.tmp`, JSON.stringify(analysis, null, 2), "utf8");
    fs.renameSync(`${outputPath}.tmp`, outputPath);
  }

  return analysis;
}

if (process.argv[1] && path.resolve(process.argv[1]) === __filename) {
  const analysis = runPath01MethodologyAnalysis();

  console.log(
    JSON.stringify(
      {
        output: DEFAULT_OUTPUT,
        scenarios: analysis.scenario_matrix.length,
        seismic_nodes: analysis.source_inventory.mps04_grid.node_count,
        unstable_scenarios: analysis.sensitivity.unstable_scenarios,
      },
      null,
      2
    )
  );
}
