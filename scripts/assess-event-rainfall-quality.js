import fs from "node:fs";
import path from "node:path";
import { assessEventRainfallQuality } from "./lib/event-rainfall-quality.js";

const ROOT = process.cwd();
const CONTEXT_ROOT = path.join(
  ROOT,
  "public",
  "data",
  "event-context",
  "rainfall"
);
const index = JSON.parse(
  fs.readFileSync(path.join(CONTEXT_ROOT, "index.json"), "utf8")
);
const counts = {};

for (const [eventId, entry] of Object.entries(index.events)) {
  const filePath = path.join(CONTEXT_ROOT, entry.file);
  const context = JSON.parse(fs.readFileSync(filePath, "utf8"));
  context.quality_assessment = assessEventRainfallQuality({
    aggregates: context.aggregates,
    eventId,
    source: context.source,
  });
  counts[context.quality_assessment.status] =
    (counts[context.quality_assessment.status] || 0) + 1;
  fs.writeFileSync(filePath, `${JSON.stringify(context, null, 2)}\n`, "utf8");
}

index.quality_assessment = {
  assessed_events: Object.keys(index.events).length,
  counts,
  method: "Dataset-role rules with event-specific source and chronology overrides",
};
index.updated_at = new Date().toISOString();
fs.writeFileSync(
  path.join(CONTEXT_ROOT, "index.json"),
  `${JSON.stringify(index, null, 2)}\n`,
  "utf8"
);

console.log(
  JSON.stringify(
    {
      assessment_version: "arcus-event-rainfall-quality-v1",
      assessed_events: Object.keys(index.events).length,
      counts,
    },
    null,
    2
  )
);
