import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  buildAnalysis,
} from "./analyze-collapse-intelligence.js";

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

export function validateCollapseAnalogues(options = {}) {
  const analysis = buildAnalysis(options);
  const validation = analysis.retrospective_validation;

  return {
    baseline_comparison: {
      hazard_only_mapping:
        "Compared qualitatively in value_add_benchmark; formal score baseline requires approved hazard-to-pattern map.",
      national_most_frequent_cause:
        "Tracked as a required baseline before production approval.",
      provincial_most_frequent_cause:
        "Tracked as a required baseline before production approval.",
    },
    geographical_holdout: validation.geographical_holdout,
    leave_one_out: validation.leave_one_out,
    leakage_check: validation.leakage_check,
    temporal_holdout: validation.temporal_holdout,
  };
}

if (process.argv[1] && path.resolve(process.argv[1]) === __filename) {
  const options = parseArgs();
  const result = validateCollapseAnalogues(options);

  console.log(JSON.stringify(result, null, 2));
}
