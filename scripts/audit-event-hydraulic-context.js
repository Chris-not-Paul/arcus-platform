import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { researchEventId } from "../src/utils/eventIdentity.js";

const ROOT = process.cwd();
const EVENTS_PATH = path.join(
  ROOT,
  "private-data",
  "professional",
  "professional-events.json"
);
const CONTEXT_ROOT = path.join(
  ROOT,
  "public",
  "data",
  "event-context",
  "hydraulic"
);
const RAINFALL_INDEX_PATH = path.join(
  ROOT,
  "public",
  "data",
  "event-context",
  "rainfall",
  "index.json"
);

const eventResource = JSON.parse(fs.readFileSync(EVENTS_PATH, "utf8"));
const events = Array.isArray(eventResource)
  ? eventResource
  : eventResource.events || [];
const contextIndex = JSON.parse(
  fs.readFileSync(path.join(CONTEXT_ROOT, "index.json"), "utf8")
);
const hydraulicEvents = events.filter(
  (event) => event.hydraulic_intelligence || event.specific_cause === "Hydraulic"
);
const hydraulicIds = new Set(hydraulicEvents.map((event) => researchEventId(event)));
const publishedIds = new Set(Object.keys(contextIndex.events));
const rainfallIndex = JSON.parse(fs.readFileSync(RAINFALL_INDEX_PATH, "utf8"));
const publishedRainfallIds = new Set(Object.keys(rainfallIndex.events));
const isCompleteDate = (value) => /^\d{4}-\d{2}-\d{2}$/.test(String(value || ""));
const hasExactPoint = (event) =>
  event.exact_location === true &&
  Number.isFinite(event.latitude) &&
  Number.isFinite(event.longitude);
const withinCerraCoverage = (date) => date >= "1985-01-01" && date <= "2021-06-30";

for (const eventId of publishedIds) {
  assert.ok(
    hydraulicIds.has(eventId),
    `Published hydraulic context ${eventId} is not a hydraulic collapse event`
  );
}

for (const eventId of publishedRainfallIds) {
  assert.ok(
    hydraulicIds.has(eventId),
    `Published rainfall context ${eventId} is not a hydraulic collapse event`
  );
}

const contextsById = new Map(
  Object.entries(contextIndex.events).map(([eventId, entry]) => [
    eventId,
    JSON.parse(fs.readFileSync(path.join(CONTEXT_ROOT, entry.file), "utf8")),
  ])
);
const missingDossiers = hydraulicEvents.filter(
  (event) => !publishedIds.has(researchEventId(event))
);
const sourceReviewEvents = hydraulicEvents.filter(
  (event) =>
    contextsById.get(researchEventId(event))?.status === "source_review_required"
);
const curatedContexts = [...contextsById.values()].filter(
  (context) => context.status === "context_available"
);
const rainfallCandidates = hydraulicEvents.filter(
  (event) =>
    hasExactPoint(event) &&
    isCompleteDate(event.date) &&
    withinCerraCoverage(event.date)
);
const rainfallMissing = rainfallCandidates.filter(
  (event) => !publishedRainfallIds.has(researchEventId(event))
);
const rainfallEligibleAllModels = hydraulicEvents.filter(
  (event) =>
    hasExactPoint(event) &&
    isCompleteDate(event.date) &&
    event.date >= "1940-01-01"
);
const rainfallMissingAllModels = rainfallEligibleAllModels.filter(
  (event) => !publishedRainfallIds.has(researchEventId(event))
);
const rainfallDatasetCounts = Object.values(rainfallIndex.events).reduce(
  (counts, entry) => {
    counts[entry.dataset] = (counts[entry.dataset] || 0) + 1;
    return counts;
  },
  {}
);
const rainfallQualityCounts = [...publishedRainfallIds].reduce((counts, eventId) => {
  const entry = rainfallIndex.events[eventId];
  const context = JSON.parse(
    fs.readFileSync(
      path.join(ROOT, "public", "data", "event-context", "rainfall", entry.file),
      "utf8"
    )
  );
  const status = context.quality_assessment?.status || "not_assessed";
  counts[status] = (counts[status] || 0) + 1;
  return counts;
}, {});
const sourceReviewQueue = sourceReviewEvents
  .sort((left, right) => {
    const confidenceRank = { High: 0, Medium: 1, Low: 2 };
    const confidenceDifference =
      (confidenceRank[left.source_confidence] ?? 3) -
      (confidenceRank[right.source_confidence] ?? 3);

    return confidenceDifference || String(right.date).localeCompare(String(left.date));
  })
  .slice(0, 20)
  .map((event) => ({
    date: event.date,
    event_id: researchEventId(event),
    municipality: event.municipality,
    province: event.province,
    source_confidence: event.source_confidence,
  }));

console.log(JSON.stringify({
  audit_version: "arcus-event-hydraulic-context-coverage-v2",
  rules: {
    hydrometric_observation_requires_event_time_coverage: true,
    modelled_values_remain_separate_from_observations: true,
    nearest_station_does_not_imply_hydraulic_equivalence: true,
  },
  source_review_queue: sourceReviewQueue,
  summary: {
    complete_date_and_exact_point: hydraulicEvents.filter(
      (event) => hasExactPoint(event) && isCompleteDate(event.date)
    ).length,
    hydraulic_event_count: hydraulicEvents.length,
    published_context_count: publishedIds.size,
    missing_dossier_count: missingDossiers.length,
    curated_hydraulic_context_count: curatedContexts.length,
    rainfall_reanalysis_eligible_count: rainfallCandidates.length,
    rainfall_reanalysis_missing_count: rainfallMissing.length,
    rainfall_reanalysis_published_count: publishedRainfallIds.size,
    rainfall_reanalysis_by_dataset: rainfallDatasetCounts,
    rainfall_quality_assessment: rainfallQualityCounts,
    rainfall_reanalysis_total_eligible_count: rainfallEligibleAllModels.length,
    rainfall_reanalysis_total_missing_count: rainfallMissingAllModels.length,
    source_review_required_count: sourceReviewEvents.length,
  },
}, null, 2));
