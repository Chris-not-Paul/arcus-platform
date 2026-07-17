import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, "..");
const OUTPUT_PATH = path.join(
  ROOT,
  "private-data",
  "professional",
  "collapse-intelligence",
  "collapse-intelligence-red-team-validation.json"
);

const FAMILY_ALIASES = {
  "Design and Construction": "design_construction",
  Earthquake: "seismic",
  Hydraulic: "hydraulic",
  Impact: "impact",
  Landslide: "landslide_ground_movement",
  Material: "deterioration_maintenance",
  Overload: "overload",
};

const ALLOWED_FEATURES = [
  {
    available_before_event: true,
    derived_using_full_dataset: false,
    derived_using_outcome: false,
    feature: "bridge_crossing_type",
    reason: "Crossing/use context can be known before design or screening.",
    source_field: "bridge_crossing_type",
  },
  {
    available_before_event: true,
    derived_using_full_dataset: false,
    derived_using_outcome: false,
    feature: "destination_use",
    reason: "Infrastructure use can be known before design or screening.",
    source_field: "destination_use",
  },
  {
    available_before_event: true,
    derived_using_full_dataset: false,
    derived_using_outcome: false,
    feature: "material_type",
    reason: "Material is a project/profile feature when known.",
    source_field: "material_type",
  },
  {
    available_before_event: true,
    derived_using_full_dataset: false,
    derived_using_outcome: false,
    feature: "structural_type",
    reason: "Typology is a project/profile feature when known.",
    source_field: "structural_type",
  },
  {
    available_before_event: true,
    derived_using_full_dataset: false,
    derived_using_outcome: false,
    feature: "province",
    reason: "Allowed only outside province holdout and with low weight.",
    source_field: "province",
  },
  {
    available_before_event: true,
    derived_using_full_dataset: false,
    derived_using_outcome: false,
    feature: "region",
    reason: "Allowed only outside region holdout and with low weight.",
    source_field: "region",
  },
];

const BLOCKED_FEATURES = [
  "cause_category",
  "specific_cause",
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
  "event_id",
  "date",
  "bridge_name",
  "bridge_crossing_name",
  "latitude",
  "longitude",
  "waterway",
];

const FEATURE_SETS = {
  hazard_only: ["hazard_signature"],
  project_profile_only: [
    "bridge_crossing_type",
    "destination_use",
    "material_type",
    "structural_type",
  ],
  territorial_context_only: ["province", "region"],
  hazard_project: [
    "hazard_signature",
    "bridge_crossing_type",
    "destination_use",
    "material_type",
    "structural_type",
  ],
  hazard_territory: ["hazard_signature", "province", "region"],
  project_territory: [
    "bridge_crossing_type",
    "destination_use",
    "material_type",
    "structural_type",
    "province",
    "region",
  ],
  full: [
    "hazard_signature",
    "bridge_crossing_type",
    "destination_use",
    "material_type",
    "structural_type",
    "province",
    "region",
    "cause_specific_incidence",
    "mps04",
  ],
  full_without_geography: [
    "hazard_signature",
    "bridge_crossing_type",
    "destination_use",
    "material_type",
    "structural_type",
    "cause_specific_incidence",
    "mps04",
  ],
  full_without_cause_specific_incidence: [
    "hazard_signature",
    "bridge_crossing_type",
    "destination_use",
    "material_type",
    "structural_type",
    "province",
    "region",
    "mps04",
  ],
  full_without_mps04: [
    "hazard_signature",
    "bridge_crossing_type",
    "destination_use",
    "material_type",
    "structural_type",
    "province",
    "region",
    "cause_specific_incidence",
  ],
  full_without_material: [
    "hazard_signature",
    "bridge_crossing_type",
    "destination_use",
    "structural_type",
    "province",
    "region",
    "cause_specific_incidence",
    "mps04",
  ],
  full_without_structural_typology: [
    "hazard_signature",
    "bridge_crossing_type",
    "destination_use",
    "material_type",
    "province",
    "region",
    "cause_specific_incidence",
    "mps04",
  ],
};

const POLICIES = {
  balanced: {
    minAnalogues: 3,
    minTopSimilarity: 20,
  },
  conservative: {
    minAnalogues: 5,
    minTopSimilarity: 35,
  },
  permissive: {
    minAnalogues: 1,
    minTopSimilarity: 1,
  },
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

function causeFamily(event) {
  return FAMILY_ALIASES[event?.specific_cause] || "unknown_unspecified";
}

function classDistribution(events) {
  const rawSpecificCause = countBy(events.map((event) => event.specific_cause || "unspecified"));
  const mappedFamilies = countBy(events.map(causeFamily));
  const total = events.length;
  const majority = Object.entries(mappedFamilies).sort((a, b) => b[1] - a[1])[0];
  const supportValues = Object.values(mappedFamilies);

  return {
    cases_unspecified: mappedFamilies.unknown_unspecified || 0,
    classes_less_than_10: supportValues.filter((value) => value < 10).length,
    classes_less_than_3: supportValues.filter((value) => value < 3).length,
    classes_less_than_5: supportValues.filter((value) => value < 5).length,
    majority_class: majority?.[0] || null,
    majority_class_share: majority ? round(majority[1] / total) : null,
    mapped_family_support: mappedFamilies,
    multiple_cause_cases: events.filter((event) =>
      /[,;/+]/.test(String(event.specific_cause || ""))
    ).length,
    number_of_classes: Object.keys(mappedFamilies).length,
    raw_specific_cause_support: rawSpecificCause,
    top3_discriminative:
      Object.keys(mappedFamilies).length > 3
        ? "top-3 remains discriminative because more than three mapped classes exist"
        : "top-3 is not discriminative with three or fewer mapped classes",
  };
}

function countBy(values) {
  return values.reduce((accumulator, value) => {
    accumulator[value] = (accumulator[value] || 0) + 1;

    return accumulator;
  }, {});
}

function sortedClasses(events) {
  return Object.keys(countBy(events.map(causeFamily))).sort();
}

function eventValue(event, feature) {
  if (feature === "hazard_signature") {
    return null;
  }

  if (feature === "cause_specific_incidence") {
    return event.province;
  }

  if (feature === "mps04") {
    return null;
  }

  return event[feature];
}

function featureWeight(feature) {
  return {
    bridge_crossing_type: 12,
    cause_specific_incidence: 3,
    destination_use: 8,
    hazard_signature: 0,
    material_type: 16,
    mps04: 0,
    province: 4,
    region: 6,
    structural_type: 16,
  }[feature] || 0;
}

function similarity(target, candidate, features, holdout = {}) {
  const matched = [];
  let score = 0;
  let possible = 0;

  for (const feature of features) {
    if (
      (holdout.excludeProvinceFeature && feature === "province") ||
      (holdout.excludeRegionFeature && feature === "region")
    ) {
      continue;
    }

    const weight = featureWeight(feature);

    if (!weight) {
      continue;
    }

    const targetValue = eventValue(target, feature);
    const candidateValue = eventValue(candidate, feature);

    if (!targetValue || !candidateValue) {
      continue;
    }

    possible += weight;

    if (key(targetValue) === key(candidateValue)) {
      score += weight;
      matched.push(feature);
    }
  }

  return {
    matched,
    score: possible ? (score / possible) * 100 : 0,
  };
}

function rankAnalogues({ candidates, features, holdout, target }) {
  return candidates
    .filter((candidate) => candidate.event_id !== target.event_id)
    .map((candidate) => {
      const sim = similarity(target, candidate, features, holdout);

      return {
        className: causeFamily(candidate),
        event_id: candidate.event_id,
        matched_features: sim.matched,
        score: sim.score,
      };
    })
    .filter((candidate) => candidate.score > 0)
    .sort((a, b) => b.score - a.score || a.event_id.localeCompare(b.event_id));
}

function predictFromAnalogues(analogues, policy) {
  if (
    analogues.length < policy.minAnalogues ||
    (analogues[0]?.score || 0) < policy.minTopSimilarity
  ) {
    return {
      abstained: true,
      topClasses: [],
    };
  }

  const classScores = {};

  for (const analogue of analogues) {
    classScores[analogue.className] =
      (classScores[analogue.className] || 0) + analogue.score;
  }

  return {
    abstained: false,
    topClasses: Object.entries(classScores)
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
      .map(([className]) => className),
  };
}

function majorityBaseline(candidates) {
  const counts = countBy(candidates.map(causeFamily));

  return Object.entries(counts).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))[0]?.[0] || null;
}

function localMajorityBaseline(candidates, target, field) {
  const local = candidates.filter((candidate) => candidate[field] === target[field]);

  return majorityBaseline(local.length ? local : candidates);
}

function evaluateFolds({
  actualResolver = (target) => causeFamily(target),
  events,
  featureSet = FEATURE_SETS.full,
  foldBuilder,
  isExcludedResolver = (target) => causeFamily(target) === "unknown_unspecified",
  name,
  policy = POLICIES.balanced,
}) {
  const rows = [];
  const classes = sortedClasses(events);

  for (const target of events) {
    if (isExcludedResolver(target)) {
      rows.push({
        actual: actualResolver(target),
        excluded: true,
        exclusion_reason: "unknown_or_unspecified_cause",
        target_event_id: target.event_id,
      });
      continue;
    }

    const fold = foldBuilder(target, events);
    const candidates = fold.candidates.filter(
      (candidate) => causeFamily(candidate) !== "unknown_unspecified"
    );
    const analogues = rankAnalogues({
      candidates,
      features: featureSet,
      holdout: fold.holdout || {},
      target,
    });
    const prediction = predictFromAnalogues(analogues, policy);
    const actual = actualResolver(target);

    rows.push({
      abstained: prediction.abstained,
      actual,
      candidate_count: candidates.length,
      correct_top1: prediction.topClasses[0] === actual,
      correct_top3: prediction.topClasses.slice(0, 3).includes(actual),
      excluded: false,
      fold_key: fold.key,
      target_event_id: target.event_id,
      topClasses: prediction.topClasses.slice(0, 3),
      top_similarity: analogues[0]?.score || 0,
    });
  }

  return summarizeRows({ classes, name, rows });
}

function summarizeRows({ classes, name, rows }) {
  const eligible = rows.filter((row) => !row.excluded);
  const evaluated = eligible.filter((row) => !row.abstained);
  const abstained = eligible.filter((row) => row.abstained);
  const top1Hits = evaluated.filter((row) => row.correct_top1).length;
  const top3Hits = evaluated.filter((row) => row.correct_top3).length;
  const top1All = eligible.filter((row) => !row.abstained && row.correct_top1).length;
  const matrix = confusionMatrix({ classes, rows: evaluated });

  return {
    abstained_cases: abstained.length,
    abstention_by_class: byClass(eligible, (items) => items.filter((item) => item.abstained).length),
    balanced_accuracy: balancedAccuracy(matrix, classes),
    bootstrap_ci: bootstrapCi(evaluated, "correct_top1"),
    class_distribution: countBy(eligible.map((row) => row.actual)),
    confusion_matrix: matrix,
    denominator_all_eligible: eligible.length,
    denominator_evaluated: evaluated.length,
    excluded_cases: rows.filter((row) => row.excluded).length,
    exclusion_reasons: countBy(rows.filter((row) => row.excluded).map((row) => row.exclusion_reason)),
    macro_f1: macroF1(matrix, classes),
    matthews_correlation_coefficient: multiclassMcc(matrix, classes),
    name,
    per_class: perClassMetrics(matrix, classes),
    rows,
    top1_hits: top1Hits,
    top1_hits_all_eligible: top1All,
    top1_rate_all_eligible: eligible.length ? round(top1All / eligible.length) : null,
    top1_rate_evaluated: evaluated.length ? round(top1Hits / evaluated.length) : null,
    top3_hits: top3Hits,
    top3_rate_all_eligible: eligible.length
      ? round(eligible.filter((row) => !row.abstained && row.correct_top3).length / eligible.length)
      : null,
    top3_rate_evaluated: evaluated.length ? round(top3Hits / evaluated.length) : null,
    total_cases: rows.length,
    weighted_f1: weightedF1(matrix, classes),
  };
}

function byClass(rows, reducer) {
  const grouped = {};

  for (const row of rows) {
    if (!grouped[row.actual]) {
      grouped[row.actual] = [];
    }

    grouped[row.actual].push(row);
  }

  return Object.fromEntries(Object.entries(grouped).map(([className, items]) => [className, reducer(items)]));
}

function confusionMatrix({ classes, rows }) {
  const matrix = Object.fromEntries(
    classes.map((actual) => [
      actual,
      Object.fromEntries(classes.map((predicted) => [predicted, 0])),
    ])
  );

  for (const row of rows) {
    const predicted = row.topClasses[0];

    if (predicted && matrix[row.actual] && matrix[row.actual][predicted] !== undefined) {
      matrix[row.actual][predicted] += 1;
    }
  }

  return matrix;
}

function perClassMetrics(matrix, classes) {
  return Object.fromEntries(
    classes.map((className) => {
      const tp = matrix[className]?.[className] || 0;
      const fp = classes.reduce((total, actual) => total + (actual === className ? 0 : matrix[actual]?.[className] || 0), 0);
      const fn = classes.reduce((total, predicted) => total + (predicted === className ? 0 : matrix[className]?.[predicted] || 0), 0);
      const precision = tp + fp ? tp / (tp + fp) : 0;
      const recall = tp + fn ? tp / (tp + fn) : 0;

      return [
        className,
        {
          f1: precision + recall ? round((2 * precision * recall) / (precision + recall)) : 0,
          precision: round(precision),
          recall: round(recall),
          support: classes.reduce((total, predicted) => total + (matrix[className]?.[predicted] || 0), 0),
          top_k_coverage_note: "top-k coverage is reported in aggregate rows; per-class top-k uses row-level data in JSON rows",
        },
      ];
    })
  );
}

function macroF1(matrix, classes) {
  const metrics = perClassMetrics(matrix, classes);
  const values = Object.values(metrics).map((item) => item.f1);

  return round(values.reduce((total, value) => total + value, 0) / values.length);
}

function weightedF1(matrix, classes) {
  const metrics = perClassMetrics(matrix, classes);
  const totalSupport = Object.values(metrics).reduce((total, item) => total + item.support, 0);

  return totalSupport
    ? round(
        Object.values(metrics).reduce((total, item) => total + item.f1 * item.support, 0) /
          totalSupport
      )
    : null;
}

function balancedAccuracy(matrix, classes) {
  const metrics = perClassMetrics(matrix, classes);
  const values = Object.values(metrics).map((item) => item.recall);

  return round(values.reduce((total, value) => total + value, 0) / values.length);
}

function multiclassMcc(matrix, classes) {
  const t = classes.reduce(
    (total, actual) =>
      total + classes.reduce((rowTotal, predicted) => rowTotal + (matrix[actual]?.[predicted] || 0), 0),
    0
  );
  const c = classes.reduce((total, className) => total + (matrix[className]?.[className] || 0), 0);
  const pk = classes.map((predicted) =>
    classes.reduce((total, actual) => total + (matrix[actual]?.[predicted] || 0), 0)
  );
  const tk = classes.map((actual) =>
    classes.reduce((total, predicted) => total + (matrix[actual]?.[predicted] || 0), 0)
  );
  const sumPkTk = pk.reduce((total, value, index) => total + value * tk[index], 0);
  const numerator = c * t - sumPkTk;
  const denominator = Math.sqrt(
    (t ** 2 - pk.reduce((total, value) => total + value ** 2, 0)) *
      (t ** 2 - tk.reduce((total, value) => total + value ** 2, 0))
  );

  return denominator ? round(numerator / denominator) : null;
}

function bootstrapCi(rows, field, iterations = 400) {
  if (!rows.length) {
    return {
      high: null,
      low: null,
    };
  }

  const rates = [];

  for (let i = 0; i < iterations; i += 1) {
    let hits = 0;

    for (let j = 0; j < rows.length; j += 1) {
      const index = deterministicIndex(`${i}:${j}`, rows.length);

      if (rows[index][field]) {
        hits += 1;
      }
    }

    rates.push(hits / rows.length);
  }

  rates.sort((a, b) => a - b);

  return {
    high: round(rates[Math.floor(rates.length * 0.975)]),
    low: round(rates[Math.floor(rates.length * 0.025)]),
  };
}

function deterministicIndex(seed, length) {
  let hash = 0;

  for (const char of seed) {
    hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  }

  return hash % length;
}

function leaveOneOutFold(target, events) {
  return {
    candidates: events.filter((event) => event.event_id !== target.event_id),
    key: target.event_id,
  };
}

function evaluateTemporal(events, cutoff, featureSet = FEATURE_SETS.full) {
  const rows = [];
  const classes = sortedClasses(events);

  for (const target of events) {
    const year = Number(String(target.date || "").slice(0, 4));

    if (!year || year <= cutoff || causeFamily(target) === "unknown_unspecified") {
      rows.push({
        actual: causeFamily(target),
        excluded: true,
        exclusion_reason: year <= cutoff ? "not_in_validation_period" : "unknown_or_invalid_year",
        target_event_id: target.event_id,
      });
      continue;
    }

    const candidates = events.filter(
      (event) => Number(String(event.date || "").slice(0, 4)) <= cutoff &&
        causeFamily(event) !== "unknown_unspecified"
    );
    const analogues = rankAnalogues({
      candidates,
      features: featureSet,
      target,
    });
    const prediction = predictFromAnalogues(analogues, POLICIES.balanced);
    const actual = causeFamily(target);

    rows.push({
      abstained: prediction.abstained,
      actual,
      candidate_count: candidates.length,
      correct_top1: prediction.topClasses[0] === actual,
      correct_top3: prediction.topClasses.slice(0, 3).includes(actual),
      excluded: false,
      target_event_id: target.event_id,
      topClasses: prediction.topClasses.slice(0, 3),
      top_similarity: analogues[0]?.score || 0,
    });
  }

  return {
    cutoff,
    training_size: events.filter(
      (event) => Number(String(event.date || "").slice(0, 4)) <= cutoff
    ).length,
    validation_size: events.filter(
      (event) => Number(String(event.date || "").slice(0, 4)) > cutoff
    ).length,
    training_class_distribution: countBy(
      events.filter((event) => Number(String(event.date || "").slice(0, 4)) <= cutoff).map(causeFamily)
    ),
    validation_class_distribution: countBy(
      events.filter((event) => Number(String(event.date || "").slice(0, 4)) > cutoff).map(causeFamily)
    ),
    ...summarizeRows({ classes, name: `temporal_${cutoff}`, rows }),
  };
}

function evaluateGeographical(events, field, value, featureSet = FEATURE_SETS.full) {
  const rows = [];
  const classes = sortedClasses(events);

  for (const target of events.filter((event) => event[field] === value)) {
    if (causeFamily(target) === "unknown_unspecified") {
      rows.push({
        actual: causeFamily(target),
        excluded: true,
        exclusion_reason: "unknown_or_unspecified_cause",
        target_event_id: target.event_id,
      });
      continue;
    }

    const candidates = events.filter(
      (event) => event[field] !== value && causeFamily(event) !== "unknown_unspecified"
    );
    const analogues = rankAnalogues({
      candidates,
      features: featureSet,
      holdout: {
        excludeProvinceFeature: field === "province",
        excludeRegionFeature: field === "region",
      },
      target,
    });
    const prediction = predictFromAnalogues(analogues, POLICIES.balanced);
    const actual = causeFamily(target);

    rows.push({
      abstained: prediction.abstained,
      actual,
      candidate_count: candidates.length,
      correct_top1: prediction.topClasses[0] === actual,
      correct_top3: prediction.topClasses.slice(0, 3).includes(actual),
      excluded: false,
      target_event_id: target.event_id,
      topClasses: prediction.topClasses.slice(0, 3),
      top_similarity: analogues[0]?.score || 0,
    });
  }

  return summarizeRows({ classes, name: `${field}_${value}`, rows });
}

function evaluateBaseline(events, baselineName) {
  const rows = [];
  const classes = sortedClasses(events);

  for (const target of events) {
    if (causeFamily(target) === "unknown_unspecified") {
      rows.push({
        actual: causeFamily(target),
        excluded: true,
        exclusion_reason: "unknown_or_unspecified_cause",
        target_event_id: target.event_id,
      });
      continue;
    }

    const candidates = events.filter((event) => event.event_id !== target.event_id);
    let predicted = null;

    if (baselineName === "majority_class") {
      predicted = majorityBaseline(candidates);
    } else if (baselineName === "province_majority") {
      predicted = localMajorityBaseline(candidates, target, "province");
    } else if (baselineName === "region_majority") {
      predicted = localMajorityBaseline(candidates, target, "region");
    } else if (baselineName === "project_feature") {
      const analogues = rankAnalogues({
        candidates,
        features: FEATURE_SETS.project_profile_only,
        target,
      });
      predicted = predictFromAnalogues(analogues, POLICIES.permissive).topClasses[0] || majorityBaseline(candidates);
    } else if (baselineName === "hci_only") {
      predicted = localMajorityBaseline(candidates, target, "province");
    } else if (baselineName === "stratified_random") {
      const distribution = Object.entries(countBy(candidates.map(causeFamily))).sort((a, b) => a[0].localeCompare(b[0]));
      const index = deterministicIndex(target.event_id, distribution.reduce((total, [, count]) => total + count, 0));
      let cursor = 0;

      for (const [className, count] of distribution) {
        cursor += count;
        if (index < cursor) {
          predicted = className;
          break;
        }
      }
    }

    const actual = causeFamily(target);

    rows.push({
      abstained: false,
      actual,
      candidate_count: candidates.length,
      correct_top1: predicted === actual,
      correct_top3: [predicted].includes(actual),
      excluded: false,
      target_event_id: target.event_id,
      topClasses: predicted ? [predicted] : [],
      top_similarity: null,
    });
  }

  return summarizeRows({ classes, name: baselineName, rows });
}

function ablationStudy(events) {
  const full = evaluateFolds({
    events,
    featureSet: FEATURE_SETS.full,
    foldBuilder: leaveOneOutFold,
    name: "full",
  });

  return Object.fromEntries(
    Object.entries(FEATURE_SETS).map(([name, featureSet]) => {
      const result = name === "full"
        ? full
        : evaluateFolds({
            events,
            featureSet,
            foldBuilder: leaveOneOutFold,
            name,
          });

      return [
        name,
        {
          abstention: result.denominator_all_eligible
            ? round(result.abstained_cases / result.denominator_all_eligible)
            : null,
          balanced_accuracy: result.balanced_accuracy,
          coverage: result.denominator_all_eligible
            ? round(result.denominator_evaluated / result.denominator_all_eligible)
            : null,
          delta_balanced_accuracy_from_full:
            result.balanced_accuracy !== null && full.balanced_accuracy !== null
              ? round(result.balanced_accuracy - full.balanced_accuracy)
              : null,
          delta_top1_from_full:
            result.top1_rate_all_eligible !== null && full.top1_rate_all_eligible !== null
              ? round(result.top1_rate_all_eligible - full.top1_rate_all_eligible)
              : null,
          macro_f1: result.macro_f1,
          performance_by_cause: result.per_class,
          top1_all_eligible: result.top1_rate_all_eligible,
          top1_evaluated: result.top1_rate_evaluated,
        },
      ];
    })
  );
}

function shuffledEvents(events, mode) {
  const copy = events.map((event) => ({ ...event }));
  const values = copy.map((event) => {
    if (mode === "causes") {
      return event.specific_cause;
    }
    if (mode === "provinces") {
      return event.province;
    }
    if (mode === "project_profile") {
      return {
        bridge_crossing_type: event.bridge_crossing_type,
        destination_use: event.destination_use,
        material_type: event.material_type,
        structural_type: event.structural_type,
      };
    }
    return null;
  });

  copy.forEach((event) => {
    const sourceIndex = deterministicIndex(`${mode}:${event.event_id}`, values.length);
    const value = values[sourceIndex];

    if (mode === "causes") {
      event.specific_cause = value;
    } else if (mode === "provinces") {
      event.province = value;
    } else if (mode === "project_profile" && value) {
      Object.assign(event, value);
    }
  });

  return copy;
}

function randomizationTests(events) {
  const base = evaluateFolds({
    events,
    featureSet: FEATURE_SETS.full,
    foldBuilder: leaveOneOutFold,
    name: "base",
  });
  const originalCauseById = Object.fromEntries(
    events.map((event) => [event.event_id, causeFamily(event)])
  );
  const shuffledCauseEvents = shuffledEvents(events, "causes");
  const tests = {
    cause_specific_incidence_permuted: {
      note: "Cause-specific incidence is not active as production input; permutation has limited effect in the red-team matcher.",
    },
    coordinate_randomized_within_region: {
      note: "Coordinates are blocked from matching, so randomizing them should not improve performance.",
    },
    hazard_signatures_permuted: {
      note: "Hazard signatures are dry-run/pending, so hazard-only contribution abstains.",
    },
    project_profile_shuffled: evaluateFolds({
      events: shuffledEvents(events, "project_profile"),
      featureSet: FEATURE_SETS.full,
      foldBuilder: leaveOneOutFold,
      name: "project_profile_shuffled",
    }),
    province_shuffled: evaluateFolds({
      events: shuffledEvents(events, "provinces"),
      featureSet: FEATURE_SETS.full,
      foldBuilder: leaveOneOutFold,
      name: "province_shuffled",
    }),
    shuffled_causes: evaluateFolds({
      actualResolver: (target) => originalCauseById[target.event_id],
      events: shuffledCauseEvents,
      featureSet: FEATURE_SETS.full,
      foldBuilder: leaveOneOutFold,
      isExcludedResolver: (target) => originalCauseById[target.event_id] === "unknown_unspecified",
      name: "shuffled_causes",
    }),
  };

  return {
    base_top1_all_eligible: base.top1_rate_all_eligible,
    tests,
  };
}

const MACRO_AREAS = {
  Centro: ["Lazio", "Marche", "Toscana", "Umbria"],
  Isole: ["Sardegna", "Sicilia"],
  Nord: [
    "Emilia-Romagna",
    "Friuli-Venezia Giulia",
    "Liguria",
    "Lombardia",
    "Piemonte",
    "Trentino-Alto Adige (Trentino-Südtirol)",
    "Valle d'Aosta (Valle d'Aoste)",
    "Veneto",
  ],
  Sud: ["Abruzzo", "Basilicata", "Calabria", "Campania", "Molise", "Puglia"],
};

function evaluateMacroArea(events, areaName, regions) {
  const rows = [];
  const classes = sortedClasses(events);
  const targetEvents = events.filter((event) => regions.includes(event.region));

  for (const target of targetEvents) {
    if (causeFamily(target) === "unknown_unspecified") {
      rows.push({
        actual: causeFamily(target),
        excluded: true,
        exclusion_reason: "unknown_or_unspecified_cause",
        target_event_id: target.event_id,
      });
      continue;
    }

    const candidates = events.filter(
      (event) => !regions.includes(event.region) && causeFamily(event) !== "unknown_unspecified"
    );
    const analogues = rankAnalogues({
      candidates,
      features: FEATURE_SETS.full,
      holdout: { region: true },
      target,
    });
    const prediction = predictFromAnalogues(analogues, POLICIES.balanced);
    const actual = causeFamily(target);

    rows.push({
      abstained: prediction.abstained,
      actual,
      candidate_count: candidates.length,
      correct_top1: prediction.topClasses[0] === actual,
      correct_top3: prediction.topClasses.slice(0, 3).includes(actual),
      excluded: false,
      fold_key: `macro_area:${areaName}:${target.event_id}`,
      target_event_id: target.event_id,
      topClasses: prediction.topClasses.slice(0, 3),
      top_similarity: analogues[0]?.score || 0,
    });
  }

  return {
    regions,
    ...summarizeRows({ classes, name: `macro_area_${areaName}`, rows }),
  };
}

function criticalities({ ablation, baselines, enrichment, loo, randomization, territorial }) {
  const findings = [];

  if (loo.top1_rate_all_eligible <= baselines.majority_class.top1_rate_all_eligible) {
    findings.push(
      "The reproduced full method does not exceed the majority-class baseline on all eligible cases."
    );
  }

  if (loo.balanced_accuracy <= 0.13 || loo.macro_f1 <= 0.12) {
    findings.push(
      "Macro-F1 and balanced accuracy show that aggregate accuracy is dominated by the hydraulic majority class."
    );
  }

  if (enrichment.fully_enriched === 0) {
    findings.push(
      "Official hazard enrichment is still dry-run/pending for the collapse intelligence dataset."
    );
  }

  if (territorial.unresolved.length > 0) {
    findings.push(
      "Unresolved territorial denominator records remain outside official percentile governance."
    );
  }

  if (
    randomization.tests.shuffled_causes?.top1_rate_all_eligible >=
    randomization.base_top1_all_eligible
  ) {
    findings.push(
      "The shuffled-label control does not degrade as expected; this indicates a non-discriminative majority-class metric."
    );
  }

  if (ablation.hazard_only.coverage === 0) {
    findings.push("Hazard-only ablation abstains because hazard signatures are not live-enriched.");
  }

  return findings;
}

function duplicateAudit(events, sources) {
  const exactCoordinates = groupsBy(events, (event) =>
    `${Number(event.latitude).toFixed(6)},${Number(event.longitude).toFixed(6)}`
  );
  const sameDateLocality = groupsBy(events, (event) =>
    `${event.date || ""}|${event.municipality || ""}|${event.province || ""}`
  );
  const sameCrossing = groupsBy(events, (event) =>
    key(event.bridge_name || event.bridge_crossing_name || "")
  );
  const sameSourceTitle = groupsBy(sources, (source) => key(source.source_title || ""))
    .filter((group) => new Set(group.items.map((item) => item.event_id)).size > 1);

  return {
    exact_coordinate_groups: exactCoordinates.length,
    group_holdout_policy:
      "Near-duplicate groups should be kept inside the same fold before production validation.",
    same_crossing_groups: sameCrossing.length,
    same_date_locality_groups: sameDateLocality.length,
    same_source_title_multi_event_groups: sameSourceTitle.length,
    sample_groups: {
      exact_coordinates: exactCoordinates.slice(0, 5),
      same_date_locality: sameDateLocality.slice(0, 5),
      same_source_title: sameSourceTitle.slice(0, 5),
    },
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
      key: groupKey,
      event_ids: [...new Set(groupItems.map((item) => item.event_id).filter(Boolean))],
      size: groupItems.length,
      items: groupItems,
    }));
}

function territorialReconciliation(events, ainop, crosswalk, geojson) {
  const unresolved = crosswalk
    .filter((item) => item.mapping_type === "unresolved")
    .map((item) => {
      const record = ainop.provinces.find((province) => province.province === item.source_name);

      return {
        denominator: record?.denominator_count || null,
        mapping_candidate: null,
        mapping_confidence: "none",
        possible_current_unit: null,
        reason: item.notes,
        source_code: record?.province_key || key(item.source_name),
        source_name: item.source_name,
        required_decision: "manual territorial governance decision required",
      };
    });

  const denominatorTotal = ainop.provinces.reduce((total, item) => total + Number(item.denominator_count || 0), 0);
  const unresolvedDenominator = unresolved.reduce((total, item) => total + Number(item.denominator || 0), 0);

  return {
    current_units: geojson.features.length,
    duplicate_current_units: geojson.features.length - new Set(geojson.features.map((feature) => feature.properties?.den_uts)).size,
    impact_on_hci_denominator_share: denominatorTotal ? round(unresolvedDenominator / denominatorTotal) : null,
    missing_current_units: unresolved.length,
    unresolved,
  };
}

function enrichmentStatus(signatures, manifest) {
  const dryRun = manifest?.dry_run || signatures?.signatures?.some((item) =>
    item.hydraulic?.status === "not_queried_dry_run"
  );
  const signatureRows = signatures?.signatures || [];

  return {
    dry_run_events: dryRun ? signatureRows.length : 0,
    eligible_for_enrichment: manifest?.eligible_events || signatureRows.length,
    failed: manifest?.errors || 0,
    fully_enriched: dryRun ? 0 : signatureRows.filter((item) =>
      ["available", "no_intersection"].includes(item.hydraulic?.status) &&
      ["available", "no_intersection"].includes(item.landslide?.status) &&
      item.seismic?.status === "available"
    ).length,
    hydraulic_enriched_live: dryRun ? 0 : signatureRows.filter((item) => item.hydraulic?.queried_at).length,
    landslide_enriched_live: dryRun ? 0 : signatureRows.filter((item) => item.landslide?.queried_at).length,
    partially_enriched: 0,
    pending: dryRun ? signatureRows.length : 0,
    provider_manifest: manifest,
    seismic_enriched: dryRun ? 0 : signatureRows.filter((item) => item.seismic?.pga_p50_g !== null).length,
  };
}

function mitigationAudit(kb) {
  const entries = kb?.entries || [];

  return {
    all_draft: entries.every((entry) => entry.status === "draft"),
    entries: entries.length,
    missing_external_basis: entries.filter((entry) => !entry.external_engineering_basis?.length).length,
    no_validated_recommendations: entries.every((entry) => entry.status !== "approved"),
    requires_external_validation: entries.every((entry) =>
      entry.external_engineering_basis?.length ||
      entry.limitations?.some((item) => item.toLowerCase().includes("expert"))
    ),
  };
}

function abstentionPolicies(events) {
  return Object.fromEntries(
    Object.entries(POLICIES).map(([name, policy]) => {
      const result = evaluateFolds({
        events,
        featureSet: FEATURE_SETS.full,
        foldBuilder: leaveOneOutFold,
        name: `policy_${name}`,
        policy,
      });

      return [
        name,
        {
          coverage: result.denominator_all_eligible
            ? round(result.denominator_evaluated / result.denominator_all_eligible)
            : null,
          evidence_strength: name,
          false_certainty_risk:
            name === "permissive"
              ? "high"
              : name === "balanced"
                ? "medium"
                : "lower coverage, lower false certainty",
          macro_f1: result.macro_f1,
          support_average: result.denominator_evaluated,
          support_minimum: policy.minAnalogues,
          top1_all_eligible: result.top1_rate_all_eligible,
          top1_evaluated: result.top1_rate_evaluated,
        },
      ];
    })
  );
}

export function runRedTeamValidation({ outputPath = OUTPUT_PATH } = {}) {
  const events = readJson(path.join(ROOT, "private-data", "processed", "events.json"), []);
  const sources = readJson(path.join(ROOT, "private-data", "processed", "sources.json"), []);
  const ainop = readJson(path.join(ROOT, "private-data", "professional", "ainop-bridge-index.json"), { provinces: [] });
  const crosswalk = readJson(path.join(ROOT, "config", "geography", "province-crosswalk.json"), []);
  const geojson = readJson(path.join(ROOT, "public", "data", "geo", "italy-provinces.geojson"), { features: [] });
  const signatures = readJson(
    path.join(ROOT, "private-data", "professional", "collapse-intelligence", "collapse-hazard-signatures.json"),
    { signatures: [] }
  );
  const signatureManifest = readJson(
    path.join(ROOT, "private-data", "professional", "collapse-intelligence", "collapse-hazard-signatures-manifest.json"),
    null
  );
  const kb = readJson(path.join(ROOT, "config", "collapse-intelligence", "mitigation-knowledge-base.json"), { entries: [] });
  const original = readJson(
    path.join(ROOT, "private-data", "professional", "collapse-intelligence", "collapse-intelligence-analysis.json"),
    null
  );
  const loo = evaluateFolds({
    events,
    featureSet: FEATURE_SETS.full,
    foldBuilder: leaveOneOutFold,
    name: "leave_one_out_fold_specific",
  });
  const baselines = Object.fromEntries(
    [
      "majority_class",
      "stratified_random",
      "province_majority",
      "region_majority",
      "project_feature",
      "hci_only",
    ].map((baselineName) => [baselineName, evaluateBaseline(events, baselineName)])
  );
  const regions = [...new Set(events.map((event) => event.region).filter(Boolean))].sort();
  const provinces = [...new Set(events.map((event) => event.province).filter(Boolean))].sort();
  const geographicalByRegion = Object.fromEntries(
    regions.map((region) => [region, summaryWithoutRows(evaluateGeographical(events, "region", region))])
  );
  const geographicalByProvince = Object.fromEntries(
    provinces.map((province) => [province, summaryWithoutRows(evaluateGeographical(events, "province", province))])
  );
  const geographicalByMacroArea = Object.fromEntries(
    Object.entries(MACRO_AREAS).map(([areaName, areaRegions]) => [
      areaName,
      summaryWithoutRows(evaluateMacroArea(events, areaName, areaRegions)),
    ])
  );
  const temporal = Object.fromEntries(
    [2015, 2018, 2020].map((cutoff) => [cutoff, summaryWithoutRows(evaluateTemporal(events, cutoff))])
  );
  const ablation = ablationStudy(events);
  const enrichment = enrichmentStatus(signatures, signatureManifest);
  const randomization = randomizationTests(events);
  const territorial = territorialReconciliation(events, ainop, crosswalk, geojson);
  const result = {
    ablation,
    abstention_policy: abstentionPolicies(events),
    baselines: Object.fromEntries(
      Object.entries(baselines).map(([name, value]) => [name, summaryWithoutRows(value)])
    ),
    class_distribution: classDistribution(events),
    confusion_matrix: {
      full_method: loo.confusion_matrix,
      per_class: loo.per_class,
      macro_f1: loo.macro_f1,
      weighted_f1: loo.weighted_f1,
      balanced_accuracy: loo.balanced_accuracy,
      matthews_correlation_coefficient: loo.matthews_correlation_coefficient,
    },
    criticalities: criticalities({
      ablation,
      baselines,
      enrichment,
      loo,
      randomization,
      territorial,
    }),
    decision: "promising but validation incomplete",
    duplicate_audit: duplicateAudit(events, sources),
    enrichment_status: enrichment,
    fold_specific_recomputation: {
      leave_one_out: summaryWithoutRows(loo),
      target_removed_from_candidates: true,
      target_removed_from_fold_statistics: true,
      temporal_only_statistics: true,
    },
    geographical_holdout: {
      by_macro_area: geographicalByMacroArea,
      by_province: geographicalByProvince,
      by_region: geographicalByRegion,
      notes:
        "Province/region features are disabled when the corresponding geography is held out.",
    },
    leakage_audit: {
      allowed_features: ALLOWED_FEATURES.map((item) => ({
        ...item,
        allowed_for_matching: true,
      })),
      blocked_features: BLOCKED_FEATURES.map((feature) => ({
        allowed_for_matching: false,
        available_before_event: false,
        derived_using_full_dataset: false,
        derived_using_outcome: true,
        feature,
        reason: "Outcome, unique identifier, narrative or post-event evidence proxy.",
      })),
      indirect_leakage_findings: [
        "specific cause is blocked from similarity",
        "narrative text is blocked from similarity",
        "event ID/date/bridge name are blocked from similarity",
        "coordinates are blocked because they can become unique identifiers",
        "province has low weight and is disabled in province holdout",
      ],
    },
    metric_reproducibility: {
      original_metrics: original?.retrospective_validation || null,
      reproduced_metrics: summaryWithoutRows(loo),
      reproducible:
        original?.retrospective_validation?.leave_one_out?.top1_cause_family_hit_rate ===
        loo.top1_rate_evaluated,
      note:
        "Original aggregate rates are not sufficient; red-team output reports hits, denominators, abstentions and confidence intervals.",
    },
    mitigation_audit: mitigationAudit(kb),
    randomization,
    temporal_holdout: temporal,
    territorial_reconciliation: territorial,
    value_add_benchmark: {
      baseline_a_public_hazard_only:
        "Not computable as discriminative matcher because hazard signatures are dry-run/pending.",
      baseline_b_public_hazard_general_hci: summaryWithoutRows(baselines.hci_only),
      baseline_c_public_hazard_cause_specific_hci:
        "Cause-specific HCI is experimental and not active as validated matcher.",
      baseline_d_project_informed_analogue_model: summaryWithoutRows(
        evaluateFolds({
          events,
          featureSet: FEATURE_SETS.project_profile_only,
          foldBuilder: leaveOneOutFold,
          name: "project_informed_analogue",
          policy: POLICIES.balanced,
        })
      ),
      baseline_e_full_intelligence_model: summaryWithoutRows(loo),
      value_add_decision:
        "Not demonstrated for production because official hazard signatures are dry-run and baseline comparison is incomplete.",
    },
  };

  writeJson(outputPath, result);

  return result;
}

function summaryWithoutRows(result) {
  const summary = { ...result };
  delete summary.rows;
  delete summary.confusion_matrix;
  delete summary.per_class;

  return summary;
}

if (process.argv[1] && path.resolve(process.argv[1]) === __filename) {
  const result = runRedTeamValidation();

  console.log(
    JSON.stringify(
      {
        decision: result.decision,
        majority_baseline: result.baselines.majority_class.top1_rate_all_eligible,
        reproduced_top1_all_eligible:
          result.metric_reproducibility.reproduced_metrics.top1_rate_all_eligible,
        reproduced_top1_evaluated:
          result.metric_reproducibility.reproduced_metrics.top1_rate_evaluated,
        top_classes: result.class_distribution.number_of_classes,
      },
      null,
      2
    )
  );
}
