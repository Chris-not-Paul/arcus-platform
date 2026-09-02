import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  buildHazardGatedCollapseIntelligence,
} from "./analyze-hazard-gated-collapse-intelligence.js";

const __filename = fileURLToPath(import.meta.url);

function parseArgs(argv = process.argv.slice(2)) {
  const options = {
    dryRun: false,
    eventId: null,
    limit: null,
    outputPath: undefined,
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

function compactValidation(result) {
  const summary = { ...(result || {}) };

  delete summary.rows;
  delete summary.per_failure_pattern;

  return summary;
}

export function validateCollapseAnalogues(options = {}) {
  const outputPath = options.outputPath;
  const outputDirectory = outputPath ? path.dirname(outputPath) : null;
  const outputStem = outputPath
    ? path.basename(outputPath, path.extname(outputPath))
    : null;
  const result = buildHazardGatedCollapseIntelligence(outputPath
    ? {
        analysisPath: outputPath,
        expertReviewPath: path.join(
          outputDirectory,
          `${outputStem}-expert-review.json`
        ),
        validationPath: path.join(
          outputDirectory,
          `${outputStem}-retrieval.json`
        ),
      }
    : undefined);
  const analysis = result.analysis;
  const validation = result.retrievalValidation.hydraulic_project_informed;

  return {
    baseline_comparison: analysis.value_add_benchmark,
    geographical_holdout: compactValidation(
      analysis.geographical_holdout.without_geography_features
    ),
    strict_geographical_holdout: {
      leave_province_out: compactValidation(
        analysis.geographical_holdout.leave_province_out
      ),
      leave_region_out: compactValidation(
        analysis.geographical_holdout.leave_region_out
      ),
    },
    episode_holdout: compactValidation(
      analysis.episode_holdout.validation
    ),
    feature_ablation: {
      grouped: Object.fromEntries(
        Object.entries(analysis.feature_ablation.grouped).map(
          ([name, value]) => [name, compactValidation(value)]
        )
      ),
      leave_one_feature_out: Object.fromEntries(
        Object.entries(analysis.feature_ablation.leave_one_feature_out).map(
          ([name, value]) => [name, compactValidation(value)]
        )
      ),
      reference_features: analysis.feature_ablation.reference_features,
    },
    leave_one_out: compactValidation(validation),
    leakage_check:
      "Target outcomes and documented causes are excluded from routing and similarity; duplicate groups are excluded and fair baselines use the same eligible hydraulic-track folds.",
    status: analysis.value_add_benchmark.decision,
    temporal_holdout: Object.fromEntries(
      Object.entries(analysis.temporal_holdout).map(([cutoff, holdout]) => [
        cutoff,
        compactValidation(holdout),
      ])
    ),
  };
}

if (process.argv[1] && path.resolve(process.argv[1]) === __filename) {
  const options = parseArgs();
  const result = validateCollapseAnalogues(options);

  console.log(JSON.stringify(result, null, 2));
}
