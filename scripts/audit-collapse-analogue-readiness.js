import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  ".."
);
const INTELLIGENCE_DIR = path.join(
  ROOT,
  "private-data",
  "professional",
  "collapse-intelligence"
);
const OUTPUT_PATH = path.join(
  INTELLIGENCE_DIR,
  "collapse-analogue-readiness.json"
);
const COMPLETED = new Set([
  "available",
  "no_intersection",
  "outside_coverage",
  "partial",
]);

function readJson(filePath, fallback) {
  if (!fs.existsSync(filePath)) {
    return fallback;
  }

  return JSON.parse(
    fs.readFileSync(filePath, "utf8").replace(/^\uFEFF/, "")
  );
}

function percentage(value, total) {
  return total
    ? Number(((value / total) * 100).toFixed(2))
    : 0;
}

function countBy(items, getter) {
  const counts = {};

  items.forEach((item) => {
    const key = getter(item) || "unspecified";

    counts[key] = (counts[key] || 0) + 1;
  });

  return Object.entries(counts)
    .map(([key, count]) => ({ count, key }))
    .sort(
      (left, right) =>
        right.count - left.count ||
        left.key.localeCompare(right.key)
    );
}

export function auditCollapseAnalogueReadiness() {
  const eventPayload = readJson(
    path.join(
      ROOT,
      "private-data",
      "professional",
      "professional-events.json"
    ),
    { events: [] }
  );
  const signaturePayload = readJson(
    path.join(INTELLIGENCE_DIR, "collapse-hazard-signatures.json"),
    { signatures: [] }
  );
  const historicalPayload = readJson(
    path.join(INTELLIGENCE_DIR, "historical-hazard-signatures.json"),
    { signatures: [] }
  );
  const events = eventPayload.events || [];
  const signatures = signaturePayload.signatures || [];
  const historical = historicalPayload.signatures || [];
  const total = events.length;
  const hydraulicCompleted = signatures.filter((signature) =>
    COMPLETED.has(signature?.hydraulic?.status)
  ).length;
  const landslideCompleted = signatures.filter((signature) =>
    COMPLETED.has(signature?.landslide?.status)
  ).length;
  const seismicCompleted = signatures.filter((signature) =>
    COMPLETED.has(signature?.seismic?.status)
  ).length;
  const coordinates = events.filter(
    (event) =>
      Number.isFinite(Number(event.latitude)) &&
      Number.isFinite(Number(event.longitude))
  ).length;
  const exactLocations = events.filter(
    (event) => event.exact_location === true
  ).length;
  const hydraulicIntelligence = events.filter(
    (event) => Boolean(event.hydraulic_intelligence)
  );
  const documentedTriggers = events.filter(
    (event) =>
      event.failure_trigger ||
      event.hydraulic_intelligence?.trigger ||
      event.specific_cause
  ).length;
  const historicalAvailable = historical.filter(
    (item) =>
      item?.historical_at_event?.status === "available_documented" ||
      item?.status === "available_documented"
  ).length;
  const hydraulicCoverageRatio = total
    ? hydraulicCompleted / total
    : 0;
  const readiness = {
    minimum_hydraulic_signature_coverage_ratio: 0.8,
    national_retrieval_production_ready:
      hydraulicCoverageRatio >= 0.8,
    blockers: [
      hydraulicCoverageRatio < 0.8
        ? "Current official hydraulic signatures cover less than 80% of the collapse database."
        : null,
    ].filter(Boolean),
    limitations: [
      historicalAvailable === 0
        ? "No authenticated year-specific historical hazard classification is currently registered; this does not block current-signature retrieval, but limits retrospective interpretation."
        : null,
    ].filter(Boolean),
  };

  return {
    caveats: [
      "Current official signatures support present-day national comparability and are not retrospective causal proof.",
      "Historical-at-event classes are counted only when an authenticated dated source is registered; missing classes are not reconstructed.",
      "Triggers and failure processes are outcomes and are not used to select the analogue cohort.",
    ],
    coverage: {
      coordinates: {
        count: coordinates,
        percent: percentage(coordinates, total),
      },
      exact_locations: {
        count: exactLocations,
        percent: percentage(exactLocations, total),
      },
      historical_at_event_classifications: {
        count: historicalAvailable,
        percent: percentage(historicalAvailable, total),
      },
      hydraulic_intelligence: {
        count: hydraulicIntelligence.length,
        percent: percentage(hydraulicIntelligence.length, total),
      },
      observed_or_curated_triggers: {
        count: documentedTriggers,
        percent: percentage(documentedTriggers, total),
      },
      official_current_signatures: {
        hydraulic: {
          count: hydraulicCompleted,
          percent: percentage(hydraulicCompleted, total),
        },
        landslide: {
          count: landslideCompleted,
          percent: percentage(landslideCompleted, total),
        },
        seismic: {
          count: seismicCompleted,
          percent: percentage(seismicCompleted, total),
        },
      },
      structural_material: {
        count: events.filter((event) => event.material_type).length,
        percent: percentage(
          events.filter((event) => event.material_type).length,
          total
        ),
      },
      structural_typology: {
        count: events.filter((event) => event.structural_type).length,
        percent: percentage(
          events.filter((event) => event.structural_type).length,
          total
        ),
      },
    },
    generated_at: new Date().toISOString(),
    hydraulic_process_distribution: countBy(
      hydraulicIntelligence,
      (event) => event.hydraulic_intelligence?.failure_process
    ),
    readiness,
    schema_version: "arcus-collapse-analogue-readiness-v1",
    total_events: total,
  };
}

const audit = auditCollapseAnalogueReadiness();

fs.writeFileSync(
  OUTPUT_PATH,
  `${JSON.stringify(audit, null, 2)}\n`,
  "utf8"
);
console.log(JSON.stringify(audit, null, 2));
