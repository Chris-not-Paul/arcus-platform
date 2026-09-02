import {
  buildHydraulicEpisodeRegistry,
} from "../../server/collapseEpisodeService.js";

export const HYDRAULIC_GEOMETRY_VALUE_AUDIT_VERSION =
  "arcus-hydraulic-geometry-value-audit-v1";

const PRIMARY_EVIDENCE = new Set(["documented", "probable"]);
const FEATURE_SETS = {
  bridge_length: ["bridge_length_m"],
  bridge_length_and_piers: [
    "bridge_length_m",
    "piers_in_active_riverbed",
  ],
  piers_in_active_riverbed: ["piers_in_active_riverbed"],
};

function countBy(rows, field) {
  return rows.reduce((counts, row) => {
    const value = row[field];
    counts[value] = (counts[value] || 0) + 1;
    return counts;
  }, {});
}

function sortedCounts(rows, field) {
  return Object.fromEntries(
    Object.entries(countBy(rows, field))
      .sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0]))
  );
}

function quantile(values, probability) {
  if (!values.length) {
    return null;
  }

  const sorted = [...values].sort((left, right) => left - right);
  const index = (sorted.length - 1) * probability;
  const lower = Math.floor(index);
  const upper = Math.ceil(index);

  if (lower === upper) {
    return sorted[lower];
  }

  return sorted[lower] + (sorted[upper] - sorted[lower]) * (index - lower);
}

function rounded(value, digits = 4) {
  if (!Number.isFinite(value)) {
    return null;
  }

  return Number(value.toFixed(digits));
}

function descriptive(values) {
  const numeric = values.filter(Number.isFinite);
  const mean = numeric.length
    ? numeric.reduce((total, value) => total + value, 0) / numeric.length
    : null;

  return {
    iqr: rounded(quantile(numeric, 0.75) - quantile(numeric, 0.25), 2),
    max: numeric.length ? rounded(Math.max(...numeric), 2) : null,
    mean: rounded(mean, 2),
    median: rounded(quantile(numeric, 0.5), 2),
    min: numeric.length ? rounded(Math.min(...numeric), 2) : null,
    n: numeric.length,
    q1: rounded(quantile(numeric, 0.25), 2),
    q3: rounded(quantile(numeric, 0.75), 2),
  };
}

function rankValues(values) {
  const indexed = values
    .map((value, index) => ({ index, value }))
    .sort((left, right) => left.value - right.value);
  const ranks = Array(values.length);
  let tieCorrectionNumerator = 0;

  for (let start = 0; start < indexed.length;) {
    let end = start + 1;

    while (end < indexed.length && indexed[end].value === indexed[start].value) {
      end += 1;
    }

    const averageRank = (start + 1 + end) / 2;
    const tieSize = end - start;

    for (let index = start; index < end; index += 1) {
      ranks[indexed[index].index] = averageRank;
    }

    tieCorrectionNumerator += tieSize ** 3 - tieSize;
    start = end;
  }

  return { ranks, tieCorrectionNumerator };
}

function kruskalWallis(rows, targetField) {
  const usable = rows.filter((row) => Number.isFinite(row.bridge_length_m));
  const groups = [...new Set(usable.map((row) => row[targetField]))].sort();

  if (usable.length < 2 || groups.length < 2) {
    return null;
  }

  const { ranks, tieCorrectionNumerator } = rankValues(
    usable.map((row) => row.bridge_length_m)
  );
  const rankSums = Object.fromEntries(groups.map((group) => [group, 0]));
  const sizes = Object.fromEntries(groups.map((group) => [group, 0]));

  usable.forEach((row, index) => {
    rankSums[row[targetField]] += ranks[index];
    sizes[row[targetField]] += 1;
  });

  const n = usable.length;
  const rawH = (12 / (n * (n + 1))) * groups.reduce(
    (total, group) => total + rankSums[group] ** 2 / sizes[group],
    0
  ) - 3 * (n + 1);
  const correction = 1 - tieCorrectionNumerator / (n ** 3 - n);
  const statistic = correction > 0 ? rawH / correction : rawH;
  const epsilonSquared = Math.max(0, (statistic - groups.length + 1) / (n - groups.length));

  return {
    degrees_of_freedom: groups.length - 1,
    effect_size_epsilon_squared: rounded(epsilonSquared),
    interpretation:
      "Descriptive multi-group association only; it is not a causal effect or a collapse-risk estimate.",
    n,
    statistic_h: rounded(statistic),
  };
}

function cramersV(rows, targetField) {
  const usable = rows.filter(
    (row) => typeof row.piers_in_active_riverbed === "boolean"
  );
  const classes = [...new Set(usable.map((row) => row[targetField]))].sort();

  if (usable.length < 2 || classes.length < 2) {
    return null;
  }

  const table = Object.fromEntries(
    classes.map((className) => [className, { false: 0, true: 0 }])
  );

  usable.forEach((row) => {
    table[row[targetField]][String(row.piers_in_active_riverbed)] += 1;
  });

  const columnTotals = {
    false: usable.filter((row) => row.piers_in_active_riverbed === false).length,
    true: usable.filter((row) => row.piers_in_active_riverbed === true).length,
  };
  let chiSquare = 0;
  let minimumExpectedCount = Number.POSITIVE_INFINITY;

  classes.forEach((className) => {
    const rowTotal = table[className].false + table[className].true;

    ["false", "true"].forEach((column) => {
      const expected = rowTotal * columnTotals[column] / usable.length;
      minimumExpectedCount = Math.min(minimumExpectedCount, expected);

      if (expected > 0) {
        chiSquare += (table[className][column] - expected) ** 2 / expected;
      }
    });
  });

  return {
    chi_square: rounded(chiSquare),
    contingency: table,
    cramers_v: rounded(Math.sqrt(chiSquare / usable.length)),
    degrees_of_freedom: classes.length - 1,
    minimum_expected_count: rounded(minimumExpectedCount, 2),
    n: usable.length,
    sparse_table_warning: minimumExpectedCount < 5,
  };
}

function modePrediction(training, targetField) {
  const counts = countBy(training, targetField);

  return Object.entries(counts)
    .sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0]))
    .at(0)?.[0] || null;
}

function conditionalPierPrediction(target, training, targetField) {
  if (typeof target.piers_in_active_riverbed !== "boolean") {
    return null;
  }

  return modePrediction(
    training.filter(
      (candidate) =>
        candidate.piers_in_active_riverbed === target.piers_in_active_riverbed
    ),
    targetField
  );
}

function featureDistance(target, candidate, features, lengthScale) {
  const distances = [];

  if (features.includes("bridge_length_m")) {
    if (
      !Number.isFinite(target.bridge_length_m) ||
      !Number.isFinite(candidate.bridge_length_m)
    ) {
      return null;
    }

    distances.push(Math.min(
      3,
      Math.abs(
        Math.log1p(target.bridge_length_m) -
          Math.log1p(candidate.bridge_length_m)
      ) / lengthScale
    ));
  }

  if (features.includes("piers_in_active_riverbed")) {
    if (typeof target.piers_in_active_riverbed !== "boolean") {
      return features.length === 1 ? null : distances.at(0) ?? null;
    }

    if (typeof candidate.piers_in_active_riverbed === "boolean") {
      distances.push(
        target.piers_in_active_riverbed === candidate.piers_in_active_riverbed
          ? 0
          : 1
      );
    } else if (features.length === 1) {
      return null;
    }
  }

  return distances.length
    ? distances.reduce((total, value) => total + value, 0) / distances.length
    : null;
}

function knnPrediction(target, training, targetField, features, k) {
  const logs = features.includes("bridge_length_m")
    ? training
        .map((row) => Math.log1p(row.bridge_length_m))
        .filter(Number.isFinite)
    : [];
  const lengthScale = logs.length
    ? quantile(logs, 0.75) - quantile(logs, 0.25) || 1
    : 1;
  const candidates = training
    .map((candidate) => ({
      candidate,
      distance: featureDistance(target, candidate, features, lengthScale),
    }))
    .filter((entry) => entry.distance !== null)
    .sort((left, right) =>
      left.distance - right.distance ||
      left.candidate.event_id.localeCompare(right.candidate.event_id)
    )
    .slice(0, k);

  if (!candidates.length) {
    return null;
  }

  const votes = new Map();

  candidates.forEach(({ candidate, distance }) => {
    const current = votes.get(candidate[targetField]) || {
      count: 0,
      distance: 0,
    };
    current.count += 1;
    current.distance += distance;
    votes.set(candidate[targetField], current);
  });

  return [...votes.entries()]
    .sort((left, right) =>
      right[1].count - left[1].count ||
      left[1].distance - right[1].distance ||
      left[0].localeCompare(right[0])
    )
    .at(0)?.[0] || null;
}

function classificationMetrics(predictions, classes) {
  const predicted = predictions.filter((row) => row.prediction !== null);
  const correct = predictions.filter((row) => row.prediction === row.actual).length;
  const perClass = Object.fromEntries(classes.map((className) => {
    const truePositive = predictions.filter(
      (row) => row.actual === className && row.prediction === className
    ).length;
    const falsePositive = predictions.filter(
      (row) => row.actual !== className && row.prediction === className
    ).length;
    const falseNegative = predictions.filter(
      (row) => row.actual === className && row.prediction !== className
    ).length;
    const precision = truePositive + falsePositive
      ? truePositive / (truePositive + falsePositive)
      : 0;
    const recall = truePositive + falseNegative
      ? truePositive / (truePositive + falseNegative)
      : 0;
    const f1 = precision + recall ? 2 * precision * recall / (precision + recall) : 0;

    return [className, {
      f1: rounded(f1),
      precision: rounded(precision),
      recall: rounded(recall),
      support: predictions.filter((row) => row.actual === className).length,
    }];
  }));
  const episodeAccuracy = [...predictions.reduce((groups, row) => {
    const group = groups.get(row.episode_id) || [];
    group.push(row);
    groups.set(row.episode_id, group);
    return groups;
  }, new Map()).entries()].map(([episodeId, rows]) => ({
    accuracy: rows.filter((row) => row.prediction === row.actual).length / rows.length,
    episode_id: episodeId,
    support: rows.length,
  }));

  return {
    accuracy_all_eligible: rounded(correct / predictions.length),
    accuracy_predicted: predicted.length ? rounded(correct / predicted.length) : null,
    balanced_accuracy: rounded(
      Object.values(perClass).reduce((total, item) => total + item.recall, 0) /
        classes.length
    ),
    coverage: rounded(predicted.length / predictions.length),
    correct,
    episode_macro_accuracy: rounded(
      episodeAccuracy.reduce((total, item) => total + item.accuracy, 0) /
        episodeAccuracy.length
    ),
    episode_results: episodeAccuracy,
    macro_f1: rounded(
      Object.values(perClass).reduce((total, item) => total + item.f1, 0) /
        classes.length
    ),
    per_class: perClass,
    predicted: predicted.length,
    support: predictions.length,
  };
}

function evaluate(rows, targetField, foldMode, featureSet, k = 5) {
  const classes = [...new Set(rows.map((row) => row[targetField]))].sort();
  const predictions = rows.map((target) => {
    const training = rows.filter((candidate) =>
      foldMode === "episode_holdout"
        ? candidate.episode_id !== target.episode_id
        : candidate.event_id !== target.event_id
    );
    const prediction = featureSet === "majority"
      ? modePrediction(training, targetField)
      : featureSet === "piers_in_active_riverbed"
        ? conditionalPierPrediction(target, training, targetField)
        : knnPrediction(
          target,
          training,
          targetField,
          FEATURE_SETS[featureSet],
          k
        );

    return {
      actual: target[targetField],
      episode_id: target.episode_id,
      event_id: target.event_id,
      prediction,
    };
  });

  return classificationMetrics(predictions, classes);
}

function seededRandom(seed = 104729) {
  let state = seed >>> 0;

  return () => {
    state ^= state << 13;
    state ^= state >>> 17;
    state ^= state << 5;
    return (state >>> 0) / 4294967296;
  };
}

function pairedEpisodeBootstrap(reference, challenger, iterations) {
  const challengerByEpisode = new Map(
    challenger.episode_results.map((item) => [item.episode_id, item.accuracy])
  );
  const pairs = reference.episode_results
    .filter((item) => challengerByEpisode.has(item.episode_id))
    .map((item) => ({
      challenger: challengerByEpisode.get(item.episode_id),
      reference: item.accuracy,
    }));
  const observed = pairs.reduce(
    (total, pair) => total + pair.challenger - pair.reference,
    0
  ) / pairs.length;
  const random = seededRandom();
  const samples = [];

  for (let iteration = 0; iteration < iterations; iteration += 1) {
    let difference = 0;

    for (let index = 0; index < pairs.length; index += 1) {
      const pair = pairs[Math.floor(random() * pairs.length)];
      difference += pair.challenger - pair.reference;
    }

    samples.push(difference / pairs.length);
  }

  return {
    bootstrap_iterations: iterations,
    confidence_interval_95: [
      rounded(quantile(samples, 0.025)),
      rounded(quantile(samples, 0.975)),
    ],
    episode_count: pairs.length,
    observed_episode_macro_accuracy_difference: rounded(observed),
  };
}

function publicMetrics(metrics) {
  const summary = { ...metrics };

  delete summary.episode_results;
  return summary;
}

function prepareRows(events, sources, targetField, minimumClassSupport) {
  const registry = buildHydraulicEpisodeRegistry(events, sources);
  const eligibleEpisodes = new Set(
    registry.episodes
      .filter((episode) => episode.independence_eligible)
      .map((episode) => episode.episode_id)
  );
  const initial = events
    .filter((event) =>
      event.hydraulic_geometry &&
      event.hydraulic_intelligence?.[targetField] &&
      PRIMARY_EVIDENCE.has(event.hydraulic_intelligence.evidence_level) &&
      Number.isFinite(event.hydraulic_geometry.bridge_length_m)
    )
    .map((event) => ({
      bridge_length_m: event.hydraulic_geometry.bridge_length_m,
      episode_id: registry.event_to_episode[event.event_id],
      event_id: event.event_id,
      match_confidence: event.hydraulic_geometry.provenance.match_confidence,
      piers_in_active_riverbed: event.hydraulic_geometry.piers_in_active_riverbed,
      [targetField]: event.hydraulic_intelligence[targetField],
    }))
    .filter((row) => eligibleEpisodes.has(row.episode_id));
  const rawClassCounts = countBy(initial, targetField);
  const retainedClasses = Object.entries(rawClassCounts)
    .filter(([, count]) => count >= minimumClassSupport)
    .map(([className]) => className)
    .sort();
  const rows = initial.filter((row) => retainedClasses.includes(row[targetField]));

  return {
    excluded_classes: Object.fromEntries(
      Object.entries(rawClassCounts).filter(([, count]) => count < minimumClassSupport)
    ),
    registry,
    retained_classes: retainedClasses,
    rows,
  };
}

function taskAudit(events, sources, targetField, minimumClassSupport, bootstrapIterations) {
  const prepared = prepareRows(
    events,
    sources,
    targetField,
    minimumClassSupport
  );
  const { rows } = prepared;
  const eventLooInternal = Object.fromEntries(
    ["majority", ...Object.keys(FEATURE_SETS)].map((featureSet) => [
      featureSet,
      evaluate(rows, targetField, "event_loo", featureSet),
    ])
  );
  const episodeHoldoutInternal = Object.fromEntries(
    ["majority", ...Object.keys(FEATURE_SETS)].map((featureSet) => [
      featureSet,
      evaluate(rows, targetField, "episode_holdout", featureSet),
    ])
  );
  const primaryComparison = pairedEpisodeBootstrap(
    episodeHoldoutInternal.majority,
    episodeHoldoutInternal.bridge_length_and_piers,
    bootstrapIterations
  );
  const comparisonsToMajority = Object.fromEntries(
    Object.keys(FEATURE_SETS).map((featureSet) => [
      featureSet,
      pairedEpisodeBootstrap(
        episodeHoldoutInternal.majority,
        episodeHoldoutInternal[featureSet],
        bootstrapIterations
      ),
    ])
  );

  return {
    associations: {
      bridge_length_by_class: Object.fromEntries(
        prepared.retained_classes.map((className) => [
          className,
          descriptive(
            rows
              .filter((row) => row[targetField] === className)
              .map((row) => row.bridge_length_m)
          ),
        ])
      ),
      bridge_length_kruskal_wallis: kruskalWallis(rows, targetField),
      piers_by_class: cramersV(rows, targetField),
    },
    class_distribution: sortedCounts(rows, targetField),
    comparisons_to_majority: comparisonsToMajority,
    excluded_classes_below_minimum_support: prepared.excluded_classes,
    feature_availability: {
      bridge_length_m: rows.filter((row) => Number.isFinite(row.bridge_length_m)).length,
      piers_in_active_riverbed: rows.filter(
        (row) => typeof row.piers_in_active_riverbed === "boolean"
      ).length,
    },
    minimum_class_support: minimumClassSupport,
    primary_comparison: primaryComparison,
    primary_validation: "episode_holdout",
    retained_classes: prepared.retained_classes,
    sample_size: rows.length,
    sensitivity_k_combined_episode_holdout: Object.fromEntries(
      [3, 5, 7, 9].map((k) => [
        k,
        publicMetrics(
          evaluate(
            rows,
            targetField,
            "episode_holdout",
            "bridge_length_and_piers",
            k
          )
        ),
      ])
    ),
    validation: {
      episode_holdout: Object.fromEntries(
        Object.entries(episodeHoldoutInternal).map(([name, metrics]) => [
          name,
          publicMetrics(metrics),
        ])
      ),
      event_leave_one_out_optimistic: Object.fromEntries(
        Object.entries(eventLooInternal).map(([name, metrics]) => [
          name,
          publicMetrics(metrics),
        ])
      ),
    },
  };
}

function judgementFor(processAudit, componentAudit) {
  const comparisons = [processAudit, componentAudit].flatMap((task) =>
    Object.values(task.comparisons_to_majority)
  );
  const positive = comparisons.filter(
    (item) => item.observed_episode_macro_accuracy_difference > 0
  );
  const robust = comparisons.filter(
    (item) => item.confidence_interval_95[0] > 0
  );

  if (robust.length) {
    return "feature_specific_signal_for_external_validation";
  }

  if (positive.length) {
    return "exploratory_signal_only";
  }

  return "no_demonstrated_incremental_value";
}

export function buildHydraulicGeometryValueAudit({
  bootstrapIterations = 2000,
  events = [],
  sources = [],
} = {}) {
  const geometryEvents = events.filter((event) => event.hydraulic_geometry);
  const process = taskAudit(
    events,
    sources,
    "failure_process",
    10,
    bootstrapIterations
  );
  const component = taskAudit(
    events,
    sources,
    "component_involved",
    8,
    bootstrapIterations
  );
  const judgement = judgementFor(process, component);

  return {
    audit_version: HYDRAULIC_GEOMETRY_VALUE_AUDIT_VERSION,
    boundaries: {
      allowed_use:
        "Offline hypothesis testing and external-validation planning only.",
      blocked_use: [
        "production analogue retrieval",
        "mitigation status or strategy qualification",
        "Final Priority Index or any score",
        "collapse probability",
        "safe/unsafe classification",
      ],
      production_feature_authorized: false,
    },
    caveats: [
      "The database contains damaged or collapsed bridges and no representative non-collapse control group; this audit cannot estimate collapse risk.",
      "Geometry and many mechanism labels derive from the same S3 source, so source-conditioned association is not external validation.",
      "Episode grouping is rule-based and is not a meteorological reanalysis.",
      "Path 01 cannot use bridge geometry unless the selected project asset supplies the corresponding attributes.",
    ],
    dataset: {
      geometry_event_count: geometryEvents.length,
      length_available: geometryEvents.filter(
        (event) => Number.isFinite(event.hydraulic_geometry.bridge_length_m)
      ).length,
      match_confidence_distribution: sortedCounts(
        geometryEvents.map((event) => ({
          value: event.hydraulic_geometry.provenance.match_confidence,
        })),
        "value"
      ),
      piers_available: geometryEvents.filter(
        (event) => typeof event.hydraulic_geometry.piers_in_active_riverbed === "boolean"
      ).length,
      source_dataset_id: "dangelo-ballio-ravazzani-2025-s3",
    },
    decision: {
      judgement,
      next_gate:
        judgement === "no_demonstrated_incremental_value"
          ? "Do not add the fields to retrieval; retain them as descriptive evidence only."
          : "Keep production blocked and externally validate only the feature-task combinations that improve the episode-held-out baseline.",
      production_status: "not_authorized",
    },
    methodology: {
      bootstrap_iterations: bootstrapIterations,
      classifier:
        "Deterministic unweighted k-nearest-neighbour classifier (primary k=5) using log-length robust distance and pier-presence mismatch; the pier-only ablation uses training-fold conditional majority by pier status.",
      comparator:
        "Training-fold majority class on the identical eligible targets.",
      evidence_scope: ["documented", "probable"],
      primary_fold:
        "Leave one inferred/curated hydraulic episode out, excluding all bridges in the target episode from training.",
      sensitivity_k: [3, 5, 7, 9],
    },
    tasks: {
      component_involved: component,
      failure_process: process,
    },
  };
}
