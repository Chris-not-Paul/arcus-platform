import fs from "node:fs";
import path from "node:path";

import {
  buildHydraulicGeometryValueAudit,
} from "./lib/hydraulic-geometry-value-audit.js";

function readCollection(filePath, key) {
  const resource = JSON.parse(
    fs.readFileSync(filePath, "utf8").replace(/^\uFEFF/, "")
  );

  return Array.isArray(resource) ? resource : resource[key] || [];
}

const events = readCollection(
  path.resolve("private-data/professional/professional-events.json"),
  "events"
);
const sources = readCollection(
  path.resolve("private-data/professional/professional-sources.json"),
  "sources"
);
const outputPath = path.resolve(
  "private-data/professional/hydraulic-geometry-value-audit.json"
);
const audit = buildHydraulicGeometryValueAudit({ events, sources });

fs.writeFileSync(outputPath, JSON.stringify(audit, null, 2));

console.log(JSON.stringify({
  audit_version: audit.audit_version,
  component_value_add:
    audit.tasks.component_involved.primary_comparison,
  failure_process_value_add:
    audit.tasks.failure_process.primary_comparison,
  failure_process_piers_value_add:
    audit.tasks.failure_process.comparisons_to_majority
      .piers_in_active_riverbed,
  judgement: audit.decision.judgement,
  output: path.relative(process.cwd(), outputPath).replaceAll("\\", "/"),
  production_status: audit.decision.production_status,
}, null, 2));
