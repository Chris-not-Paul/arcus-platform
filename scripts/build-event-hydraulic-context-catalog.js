import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const EVENTS_PATH = path.join(
  ROOT,
  "private-data",
  "professional",
  "professional-events.json"
);
const SOURCES_PATH = path.join(
  ROOT,
  "private-data",
  "professional",
  "professional-sources.json"
);
const CONTEXT_ROOT = path.join(
  ROOT,
  "public",
  "data",
  "event-context",
  "hydraulic"
);
const INDEX_PATH = path.join(CONTEXT_ROOT, "index.json");

const CURATED_METHOD_PREFIX = "Manual extraction";
const SOURCE_ROLE_RANK = {
  "Official/Technical": 0,
  primary: 1,
  Scientific: 2,
  secondary: 3,
  News: 4,
};

function resourceItems(resource, key) {
  if (Array.isArray(resource)) return resource;
  return resource?.[key] || [];
}

function hydraulicEvent(event) {
  return Boolean(
    event.hydraulic_intelligence || event.specific_cause === "Hydraulic"
  );
}

function researchEventId(event) {
  return event.research_event_id || String(event.event_id || "").replace(/^B(?=\d)/, "IT");
}

function sourceRank(source) {
  return SOURCE_ROLE_RANK[source.source_role] ?? 9;
}

function selectSources(sources) {
  return [...sources]
    .sort(
      (left, right) =>
        sourceRank(left) - sourceRank(right) ||
        String(left.source_id).localeCompare(String(right.source_id))
    )
    .slice(0, 3)
    .map((source) => ({
      source_id: source.source_id,
      provider: source.source_type || source.source_role,
      title: source.source_title,
      role: "event_identification_and_failure_process_context",
      source_class: source.source_role,
      url: source.source_url,
      reference: source.source_reference || null,
      accessed_at: source.access_date || null,
    }));
}

function crossingName(event) {
  return (
    event.bridge_crossing_name ||
    event.bridge_name ||
    `${event.municipality || "Unknown location"} bridge`
  );
}

function reviewPriority(event) {
  if (event.hydraulic_intelligence?.evidence_level === "needs_review") return "critical";
  if (event.exact_location !== true || !/^\d{4}-\d{2}-\d{2}$/.test(String(event.date || ""))) {
    return "high";
  }
  if (event.source_confidence === "High") return "standard";
  return "high";
}

function generatedContext(event, sources) {
  const eventId = researchEventId(event);
  const evidenceLevel = event.hydraulic_intelligence?.evidence_level || "unspecified";
  const failureProcess = event.hydraulic_intelligence?.failure_process || null;
  const component = event.hydraulic_intelligence?.component_involved || null;
  const selectedSources = selectSources(sources);
  const sourceRegistryAccessedThrough = selectedSources
    .map((source) => source.accessed_at)
    .filter(Boolean)
    .sort()
    .at(-1) || null;

  return {
    schema_version: "arcus-event-hydraulic-context-v1",
    event_id: eventId,
    event_date: event.date,
    status: "source_review_required",
    display_badge: "Source review",
    coverage_level: "event_record_only",
    event_section: {
      crossing_name: crossingName(event),
      latitude: event.latitude,
      longitude: event.longitude,
      municipality: event.municipality,
      hydrographic_context: event.bridge_crossing_name || null,
      location_precision: event.exact_location === true ? "exact" : "approximate_or_unverified",
    },
    event_hydrometry: {
      observation_status: "not_verified",
      reason_code: "event_specific_hydrometry_not_curated",
      observed_discharge_m3s: null,
      observed_stage_m: null,
      hydrograph: null,
    },
    reference_station: null,
    modelled_event_watercourse: null,
    modelled_reference_section: null,
    process_evidence: {
      failure_process: failureProcess,
      component_involved: component,
      evidence_level: evidenceLevel,
      taxonomy_version: event.hydraulic_intelligence?.taxonomy_version || "hydraulic-v2",
    },
    documented_basin_processes:
      evidenceLevel === "documented" && failureProcess ? [failureProcess] : [],
    sources: selectedSources,
    curation_note: {
      it: "Le fonti identificano l’evento e, quando indicato, il processo di cedimento. Non è ancora stata verificata una stazione idrometrica compatibile per corso d’acqua, posizione e periodo dell’evento; ARCUS non assegna livelli, portate o idrogrammi.",
      en: "The sources identify the event and, where available, its failure process. A hydrometric station compatible by watercourse, position and event period has not yet been verified; ARCUS assigns no stage, discharge or hydrograph.",
    },
    review: {
      priority: reviewPriority(event),
      required_checks: [
        "crossing_and_watercourse_identity",
        "station_hydraulic_relationship",
        "event_time_observation_coverage",
        "event_report_hydrometric_values",
      ],
    },
    provenance: {
      method: "Deterministic catalogue build from the ARCUS event and source registries",
      source_registry_accessed_through: sourceRegistryAccessedThrough,
    },
    caveats: [
      "No event-specific hydrometric observation has been curated for this bridge.",
      "A geographically nearby station must not be treated as hydraulically representative without watercourse and network verification.",
      "The encoded failure process retains its database evidence level and does not prove causation beyond the cited sources.",
      "Rainfall reanalysis, when available, remains a separate meteorological context and is not converted into discharge.",
    ],
  };
}

const eventResource = JSON.parse(fs.readFileSync(EVENTS_PATH, "utf8"));
const sourceResource = JSON.parse(fs.readFileSync(SOURCES_PATH, "utf8"));
const events = resourceItems(eventResource, "events").filter(hydraulicEvent);
const sources = resourceItems(sourceResource, "sources");
const sourcesByEvent = new Map();

for (const source of sources) {
  const eventSources = sourcesByEvent.get(source.event_id) || [];
  eventSources.push(source);
  sourcesByEvent.set(source.event_id, eventSources);
}

fs.mkdirSync(CONTEXT_ROOT, { recursive: true });

const existingIndex = fs.existsSync(INDEX_PATH)
  ? JSON.parse(fs.readFileSync(INDEX_PATH, "utf8"))
  : { schema_version: "arcus-event-hydraulic-index-v1", events: {} };
const indexEvents = {};
let curated = 0;
let generated = 0;
const versionDates = [];

for (const event of events.sort((left, right) =>
  researchEventId(left).localeCompare(researchEventId(right))
)) {
  const eventId = researchEventId(event);
  const file = `${eventId}.json`;
  const filePath = path.join(CONTEXT_ROOT, file);
  let context = null;

  if (fs.existsSync(filePath)) {
    const candidate = JSON.parse(fs.readFileSync(filePath, "utf8"));
    if (candidate.provenance?.method?.startsWith(CURATED_METHOD_PREFIX)) {
      context = candidate;
      curated += 1;
    }
  }

  if (!context) {
    context = generatedContext(event, sourcesByEvent.get(event.event_id) || []);
    fs.writeFileSync(filePath, `${JSON.stringify(context, null, 2)}\n`, "utf8");
    generated += 1;
  }

  indexEvents[eventId] = {
    event_date: context.event_date,
    file,
    observation_status: context.event_hydrometry.observation_status,
    status: context.status,
    coverage_level: context.coverage_level || "curated_hydraulic_context",
  };
  versionDates.push(
    String(
      context.provenance?.curated_at ||
        context.provenance?.source_registry_accessed_through ||
        context.event_date
    ).slice(0, 10)
  );
}

const index = {
  schema_version: "arcus-event-hydraulic-index-v1",
  events: indexEvents,
  coverage: {
    hydraulic_events: events.length,
    curated_hydraulic_contexts: curated,
    source_review_records: generated,
  },
  updated_at: `${versionDates.filter(Boolean).sort().at(-1)}T00:00:00.000Z`,
};

fs.writeFileSync(INDEX_PATH, `${JSON.stringify(index, null, 2)}\n`, "utf8");

console.log(
  JSON.stringify(
    {
      build_version: "arcus-event-hydraulic-catalog-v1",
      hydraulic_events: events.length,
      curated_hydraulic_contexts: curated,
      source_review_records: generated,
      indexed_events: Object.keys(indexEvents).length,
      previous_indexed_events: Object.keys(existingIndex.events || {}).length,
    },
    null,
    2
  )
);
