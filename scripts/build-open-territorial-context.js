import fs from "node:fs";
import path from "node:path";

const ROOT = path.resolve(import.meta.dirname, "..");
const RELEASE_ROOT = path.join(ROOT, "private-data", "open", "releases");
const CURRENT_RELEASE_PATH = path.join(RELEASE_ROOT, "current.json");
const SIGNATURES_PATH = path.join(
  ROOT,
  "private-data",
  "professional",
  "collapse-intelligence",
  "collapse-hazard-signatures.json"
);
const OUTPUT_PATH = path.join(
  ROOT,
  "public",
  "data",
  "event-context",
  "territorial",
  "index.json"
);

const RESOLVED_STATUSES = new Set([
  "available",
  "no_intersection",
  "outside_coverage",
]);

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8").replace(/^\uFEFF/, ""));
}

function selectHazardFields(hazard, fields) {
  return Object.fromEntries(fields.map((field) => [field, hazard?.[field] ?? null]));
}

function coordinateDifference(left, right) {
  return Math.abs(Number(left) - Number(right));
}

export function buildOpenTerritorialContext({
  currentReleasePath = CURRENT_RELEASE_PATH,
  outputPath = OUTPUT_PATH,
  signaturesPath = SIGNATURES_PATH,
} = {}) {
  const current = readJson(currentReleasePath);
  const releaseDirectory = path.join(RELEASE_ROOT, current.version);
  const mappings = readJson(path.join(releaseDirectory, "id-mapping.json")).mappings;
  const openEvents = readJson(path.join(releaseDirectory, "events.json")).events;
  const signaturePayload = readJson(signaturesPath);
  const mappingByLegacyId = new Map(
    mappings.map((mapping) => [mapping.legacy_event_id, mapping.event_id])
  );
  const eventById = new Map(openEvents.map((event) => [event.event_id, event]));
  const events = {};

  for (const signature of signaturePayload.signatures || []) {
    const eventId = mappingByLegacyId.get(signature.event_id);

    if (!eventId) {
      throw new Error(`No public ID mapping for ${signature.event_id}`);
    }

    if (events[eventId]) {
      throw new Error(`Duplicate territorial context for ${eventId}`);
    }

    const openEvent = eventById.get(eventId);

    if (!openEvent) {
      throw new Error(`No Open event for ${eventId}`);
    }

    if (
      coordinateDifference(openEvent.latitude, signature.coordinates?.latitude) > 0.000001 ||
      coordinateDifference(openEvent.longitude, signature.coordinates?.longitude) > 0.000001
    ) {
      throw new Error(`Coordinate mismatch for ${eventId}`);
    }

    events[eventId] = {
      coordinates: {
        latitude: Number(signature.coordinates.latitude),
        longitude: Number(signature.coordinates.longitude),
      },
      event_id: eventId,
      hydraulic: selectHazardFields(signature.hydraulic, [
        "status",
        "highest_class",
        "matched_classes",
        "provider_version",
        "source_dataset_version",
        "queried_at",
      ]),
      landslide: selectHazardFields(signature.landslide, [
        "status",
        "attention_area",
        "highest_hazard_class",
        "matched_hazard_classes",
        "provider_version",
        "source_dataset_version",
        "queried_at",
      ]),
      seismic: selectHazardFields(signature.seismic, [
        "status",
        "pga_p50_g",
        "sampling_method",
        "provider_version",
        "source_dataset_version",
        "queried_at",
      ]),
    };
  }

  if (Object.keys(events).length !== openEvents.length) {
    throw new Error(
      `Territorial coverage mismatch: ${Object.keys(events).length}/${openEvents.length}`
    );
  }

  const allHazards = Object.values(events).flatMap((event) => [
    event.hydraulic,
    event.landslide,
    event.seismic,
  ]);
  const queryTimes = allHazards
    .map((hazard) => hazard.queried_at)
    .filter(Boolean)
    .sort();
  const unresolvedEvents = Object.values(events).filter((event) =>
    [event.hydraulic, event.landslide, event.seismic].some(
      (hazard) => !RESOLVED_STATUSES.has(hazard.status)
    )
  ).length;
  const output = {
    schema_version: "arcus-open-territorial-context-v1",
    release: current.version,
    context_role: "current_official_context_at_documented_collapse_location",
    caveat:
      "Current official hazard context at the documented collapse location; not retrospective causal proof, a safety classification or a risk score.",
    rights_note:
      "ARCUS publishes a release-bound contextual synthesis. Underlying official datasets remain subject to the respective provider terms and attribution requirements.",
    snapshot_latest_query_at: queryTimes.at(-1) || null,
    coverage: {
      events: Object.keys(events).length,
      fully_resolved_events: Object.keys(events).length - unresolvedEvents,
      unresolved_events: unresolvedEvents,
    },
    sources: {
      hydraulic: {
        provider: "ISPRA",
        source_name: "National flood hazard mosaic P1/P2/P3",
        service_type: "WFS point intersection",
        service_url: "https://sdi.isprambiente.it/geoserver/nz1/wfs",
        source_url: "https://www.isprambiente.gov.it/it/pubblicazioni/rapporti/resolveuid/45038ac361854b5789473ad8876b87bf",
      },
      landslide: {
        provider: "ISPRA",
        source_name: "PAI landslide hazard mosaic v.5.0 (2024)",
        service_type: "WFS point intersection",
        service_url: "https://idrogeo.isprambiente.it/geoserver/idrogeo/ows",
        source_url: "https://www.isprambiente.gov.it/it/attivita/suolo-e-territorio/dissesto-idrogeologico/le-frane-1/mosaicatura-della-pericolosita-da-frana-dei-piani-di-assetto-idrogeologico-pai",
      },
      seismic: {
        provider: "INGV",
        source_name: "MPS04 reference hazard model",
        service_type: "Nearest local grid node",
        source_url: "https://esse1-gis.mi.ingv.it/",
      },
    },
    events,
  };

  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, `${JSON.stringify(output, null, 2)}\n`, "utf8");

  return output;
}

if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(import.meta.filename)) {
  const output = buildOpenTerritorialContext();

  console.log(JSON.stringify({
    events: output.coverage.events,
    fully_resolved_events: output.coverage.fully_resolved_events,
    output: path.relative(ROOT, OUTPUT_PATH),
    release: output.release,
    unresolved_events: output.coverage.unresolved_events,
  }, null, 2));
}
