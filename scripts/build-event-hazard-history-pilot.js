import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { isMainThread, parentPort, Worker, workerData } from "node:worker_threads";
import proj4 from "proj4";
import { queryPolygonShapefile } from "./lib/point-shapefile-query.js";

const ROOT = path.resolve(import.meta.dirname, "..");
const CONFIG_PATH = path.join(ROOT, "config", "event-hazard-history-pilot.json");
const CURRENT_RELEASE_PATH = path.join(ROOT, "private-data", "open", "releases", "current.json");
const CURRENT_CONTEXT_PATH = path.join(
  ROOT,
  "public",
  "data",
  "event-context",
  "territorial",
  "index.json"
);
const OUTPUT_PATH = path.join(
  ROOT,
  "private-data",
  "research",
  "event-hazard-history-pilot.json"
);
const PUBLIC_OUTPUT_PATH = path.join(
  ROOT,
  "public",
  "data",
  "event-context",
  "hazard-history",
  "index.json"
);
const DEFAULT_DATA_DIRECTORY = path.join(os.tmpdir(), "arcus-ispra-history");
const HYDRAULIC_ORDER = ["P1", "P2", "P3"];
const LANDSLIDE_ORDER = ["AA", "P1", "P2", "P3", "P4"];
const CURRENT_RELEASE_BY_HAZARD = {
  hydraulic: "ispra-hydraulic-2020-v5",
  landslide: "ispra-landslide-2024-v5",
};

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8").replace(/^\uFEFF/, ""));
}

function temporalRelation(eventDate, referencePeriod) {
  const eventYear = Number(String(eventDate).slice(0, 4));

  if (eventYear > referencePeriod.end_year) return "before_event";
  if (eventYear < referencePeriod.start_year) return "after_event";
  return "same_or_overlapping_reference_period";
}

function highestClass(classes, order) {
  return [...classes].sort((left, right) => order.indexOf(right) - order.indexOf(left))[0] || null;
}

function positionalAssessment(classes, distance, tolerance) {
  if (distance !== null && distance <= tolerance) {
    return classes.length ? "boundary_sensitive_intersection" : "boundary_adjacent_no_intersection";
  }

  return classes.length ? "interior_intersection" : "no_intersection_not_boundary_adjacent";
}

function parseLandslideClass(properties, preferredAttribute) {
  const raw = String(
    properties[preferredAttribute] ??
      properties.PERIC_ITA ??
      properties.COD_PER_IT ??
      properties.COD_PER ??
      ""
  ).toUpperCase();
  const match = raw.match(/(?:^|\s)(P[1-4]|AA)(?:\s|$)/);

  return match?.[1] || null;
}

function classifyTransition(left, right, hazard) {
  const leftSet = new Set(left.classes);
  const rightSet = new Set(right.classes);

  if (!left.classes.length && !right.classes.length) return "unchanged_no_intersection";
  if (!left.classes.length && right.classes.length) return "newly_mapped_at_point";
  if (left.classes.length && !right.classes.length) return "no_longer_mapped_at_point";
  if (
    left.classes.length === right.classes.length &&
    left.classes.every((item) => rightSet.has(item))
  ) {
    return "unchanged_class_membership";
  }

  if (hazard === "hydraulic") {
    const leftContained = [...leftSet].every((item) => rightSet.has(item));
    const rightContained = [...rightSet].every((item) => leftSet.has(item));

    if (leftContained) return "class_membership_expanded";
    if (rightContained) return "class_membership_reduced";
    return "class_membership_changed";
  }

  const leftRank = LANDSLIDE_ORDER.indexOf(left.highest_class);
  const rightRank = LANDSLIDE_ORDER.indexOf(right.highest_class);

  if (rightRank > leftRank) return "higher_mapped_class";
  if (rightRank < leftRank) return "lower_mapped_class";
  return "class_membership_changed";
}

function buildTransitions(observations, hazard) {
  return observations.slice(1).map((right, index) => {
    const left = observations[index];
    const boundarySensitive = [left, right].some((item) =>
      ["boundary_adjacent_no_intersection", "boundary_sensitive_intersection"].includes(
        item.positional_assessment
      )
    );
    const boundaryRobustnessIncomplete = [left, right].some((item) =>
      item.positional_assessment.includes("not_available")
    );

    return {
      from_release: left.release_id,
      to_release: right.release_id,
      observed_change: classifyTransition(left, right, hazard),
      interpretation_status: boundarySensitive
        ? "manual_gis_review_required"
        : boundaryRobustnessIncomplete
          ? "boundary_robustness_incomplete"
          : "cartographic_comparison_only",
    };
  });
}

function sameClassMembership(left, right) {
  return (
    left.length === right.length &&
    left.every((className) => right.includes(className))
  );
}

function publicComparisonSummary(observations, hazard) {
  const currentReleaseId = CURRENT_RELEASE_BY_HAZARD[hazard];
  const currentObservation = observations.find(
    (observation) => observation.release_id === currentReleaseId
  );
  const preEventObservations = observations.filter(
    (observation) => observation.temporal_relation_to_event === "before_event"
  );
  const baseline = preEventObservations.at(-1) || null;

  if (!currentObservation) {
    return {
      reason: "current_release_observation_unavailable",
      status: "not_comparable",
    };
  }

  if (currentObservation.temporal_relation_to_event !== "after_event") {
    return {
      current_release: currentObservation.release_id,
      current_reference_period: currentObservation.reference_period,
      reason: "no_post_event_release",
      status: "not_comparable",
    };
  }

  if (!baseline) {
    return {
      current_classes: currentObservation.classes,
      current_release: currentObservation.release_id,
      current_reference_period: currentObservation.reference_period,
      reason: "no_pre_event_release",
      status: "not_comparable",
    };

  }

  return {
    baseline_classes: baseline.classes,
    baseline_release: baseline.release_id,
    baseline_reference_period: baseline.reference_period,
    current_classes: currentObservation.classes,
    current_release: currentObservation.release_id,
    current_reference_period: currentObservation.reference_period,
    status: sameClassMembership(baseline.classes, currentObservation.classes)
      ? "unchanged"
      : "changed",
  };
}

function buildObservation({ classes, event, release, tolerance }) {
  const order = release.hazard === "hydraulic" ? HYDRAULIC_ORDER : LANDSLIDE_ORDER;
  const sortedClasses = [...new Set(classes.classes)].sort(
    (left, right) => order.indexOf(left) - order.indexOf(right)
  );

  return {
    classes: sortedClasses,
    highest_class: highestClass(sortedClasses, order),
    minimum_boundary_distance_m: classes.minimum_boundary_distance_m,
    point_status: sortedClasses.length ? "intersection" : "no_intersection",
    positional_assessment: positionalAssessment(
      sortedClasses,
      classes.minimum_boundary_distance_m,
      tolerance
    ),
    reference_period: release.reference_period,
    release_id: release.id,
    temporal_relation_to_event: temporalRelation(event.date, release.reference_period),
  };
}

function ensureInputs(release, dataDirectory) {
  for (const layer of release.layers) {
    const shpPath = path.join(dataDirectory, release.extracted_root, `${layer.basename}.shp`);
    const dbfPath = path.join(dataDirectory, release.extracted_root, `${layer.basename}.dbf`);

    if (!fs.existsSync(shpPath)) {
      throw new Error(
        `Missing extracted input for ${release.id}: ${shpPath}. Download ${release.source_url} and extract it outside the repository.`
      );
    }

    if (release.hazard === "landslide" && !fs.existsSync(dbfPath)) {
      throw new Error(`Missing DBF input for ${release.id}: ${dbfPath}`);
    }
  }
}

function queryRelease(release, candidates, dataDirectory, tolerance, onProgress = null) {
  ensureInputs(release, dataDirectory);
  const projectedCandidates = candidates.map((candidate) => ({
    ...candidate,
    projected: proj4("EPSG:4326", release.projection, [
      candidate.longitude,
      candidate.latitude,
    ]),
  }));
  const combined = Object.fromEntries(
    candidates.map((candidate) => [
      candidate.id,
      { classes: new Set(), minimum_boundary_distance_m: Number.POSITIVE_INFINITY },
    ])
  );

  for (const layer of release.layers) {
    const basePath = path.join(dataDirectory, release.extracted_root, layer.basename);
    const result = queryPolygonShapefile({
      candidates: projectedCandidates,
      classResolver:
        release.hazard === "hydraulic"
          ? () => layer.class
          : (properties) => parseLandslideClass(properties, layer.attribute),
      dbfPath: release.hazard === "landslide" ? `${basePath}.dbf` : null,
      onProgress: onProgress
        ? (progress) => onProgress({ ...progress, layer: layer.class || layer.basename })
        : null,
      shpPath: `${basePath}.shp`,
      toleranceMeters: tolerance,
    });

    for (const candidate of candidates) {
      const target = combined[candidate.id];
      const item = result[candidate.id];
      item.classes.forEach((className) => target.classes.add(className));
      target.minimum_boundary_distance_m = Math.min(
        target.minimum_boundary_distance_m,
        item.minimum_boundary_distance_m ?? Number.POSITIVE_INFINITY
      );
    }
  }

  return Object.fromEntries(
    Object.entries(combined).map(([id, item]) => [
      id,
      {
        classes: [...item.classes],
        minimum_boundary_distance_m: Number.isFinite(item.minimum_boundary_distance_m)
          ? item.minimum_boundary_distance_m
          : null,
      },
    ])
  );
}

function runReleaseWorkers(config, pilotEvents, dataDirectory) {
  return Promise.all(
    config.releases.map(
      (release) =>
        new Promise((resolve, reject) => {
          const selectedIds = new Set(
            config.scope?.event_selection === "all_exact_location_events"
              ? pilotEvents.map((event) => event.event_id)
              : release.hazard === "hydraulic"
                ? config.regression_cases.hydraulic_event_ids
                : config.regression_cases.landslide_event_ids
          );
          const candidates = pilotEvents
            .filter((event) => selectedIds.has(event.event_id))
            .map((event) => ({
              date: event.date,
              id: event.event_id,
              latitude: event.latitude,
              longitude: event.longitude,
            }));
          const worker = new Worker(new URL(import.meta.url), {
            workerData: {
              candidates,
              dataDirectory,
              release,
              tolerance: config.boundary_tolerance_m,
              type: "query_release",
            },
          });

          worker.on("message", (message) => {
            if (message.type === "progress") {
              console.log(
                `[${release.id}] ${message.layer}: ${message.processed}/${message.total}`
              );
              return;
            }

            if (message.type === "result") resolve(message);
          });
          worker.on("error", reject);
          worker.on("exit", (code) => {
            if (code !== 0) reject(new Error(`Worker ${release.id} exited with code ${code}`));
          });
        })
    )
  );
}

function currentLandslideObservation(event, currentContext, tolerance) {
  const item = currentContext.events[event.event_id]?.landslide;

  if (!item || !["available", "no_intersection"].includes(item.status)) return null;

  const classes = item.matched_hazard_classes || [];

  return {
    classes,
    highest_class: item.highest_hazard_class || null,
    minimum_boundary_distance_m: null,
    point_status: classes.length ? "intersection" : "no_intersection",
    positional_assessment: classes.length
      ? "boundary_distance_not_available"
      : "no_intersection_boundary_distance_not_available",
    reference_period: {
      start_year: 2024,
      end_year: 2024,
      precision: "year",
      label: "2024",
    },
    release_id: "ispra-landslide-2024-v5",
    temporal_relation_to_event: temporalRelation(event.date, {
      start_year: 2024,
      end_year: 2024,
    }),
    source_observation: "release_bound_current_WFS_point_result",
    tolerance_m: tolerance,
  };
}

export async function buildEventHazardHistoryPilot({
  configPath = CONFIG_PATH,
  dataDirectory = process.env.ARCUS_ISPRA_HISTORY_DIR || DEFAULT_DATA_DIRECTORY,
  outputPath = OUTPUT_PATH,
  publicOutputPath = PUBLIC_OUTPUT_PATH,
} = {}) {
  const config = readJson(configPath);
  const current = readJson(CURRENT_RELEASE_PATH);
  const releaseDirectory = path.join(ROOT, "private-data", "open", "releases", current.version);
  const events = readJson(path.join(releaseDirectory, "events.json")).events;
  const currentContext = readJson(CURRENT_CONTEXT_PATH);
  const eventById = new Map(events.map((event) => [event.event_id, event]));
  const pilotEvents =
    config.scope?.event_selection === "all_exact_location_events"
      ? events.filter((event) => event.exact_location).map((event) => ({
          ...event,
          id: event.event_id,
        }))
      : [...new Set([
          ...config.regression_cases.hydraulic_event_ids,
          ...config.regression_cases.landslide_event_ids,
        ])].map((eventId) => {
          const event = eventById.get(eventId);

          if (!event) throw new Error(`Unknown pilot event ${eventId}`);
          if (!event.exact_location) {
            throw new Error(`Pilot event lacks exact coordinates: ${eventId}`);
          }

          return { ...event, id: event.event_id };
        });
  const observationsByEvent = Object.fromEntries(
    pilotEvents.map((event) => [event.event_id, { hydraulic: [], landslide: [] }])
  );

  const releasePayloads = await runReleaseWorkers(config, pilotEvents, dataDirectory);

  for (const payload of releasePayloads) {
    const release = config.releases.find((item) => item.id === payload.release_id);
    const candidates = pilotEvents.filter((event) => payload.event_ids.includes(event.event_id));

    for (const event of candidates) {
      observationsByEvent[event.event_id][release.hazard].push(
        buildObservation({
          classes: payload.results[event.event_id],
          event,
          release,
          tolerance: config.boundary_tolerance_m,
        })
      );
    }
  }

  for (const event of pilotEvents) {
    const eventId = event.event_id;
    const currentObservation = currentLandslideObservation(
      event,
      currentContext,
      config.boundary_tolerance_m
    );

    if (currentObservation) observationsByEvent[eventId].landslide.push(currentObservation);
  }

  const outputEvents = Object.fromEntries(
    pilotEvents.map((event) => {
      const hazards = {};

      for (const hazard of ["hydraulic", "landslide"]) {
        const observations = observationsByEvent[event.event_id][hazard];
        if (!observations.length) continue;
        hazards[hazard] = {
          observations,
          transitions: buildTransitions(observations, hazard),
        };
      }

      return [
        event.event_id,
        {
          coordinates: { latitude: event.latitude, longitude: event.longitude },
          coordinate_quality: "exact_location_in_open_release",
          event_date: event.date,
          event_id: event.event_id,
          hazards,
          municipality: event.municipality,
          province: event.province,
        },
      ];
    })
  );
  const output = {
    schema_version: "arcus-event-hazard-history-catalog-v2",
    generated_at: new Date().toISOString(),
    open_release: current.version,
    analysis_role: config.analysis_role,
    boundary_tolerance_m: config.boundary_tolerance_m,
    caveats: config.caveats,
    coverage: {
      events: pilotEvents.length,
      hydraulic_events: pilotEvents.length,
      landslide_events: pilotEvents.length,
      catalogue_events: events.length,
      excluded_approximate_coordinates: events.length - pilotEvents.length,
      releases_processed: config.releases.length,
    },
    sources: config.releases.map((release) => ({
      archive_bytes: release.archive_bytes,
      archive_sha256: release.archive_sha256,
      hazard: release.hazard,
      id: release.id,
      license: release.license,
      reference_period: release.reference_period,
      source_url: release.source_url,
      title: release.title,
      version: release.version,
    })),
    events: outputEvents,
  };

  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, `${JSON.stringify(output, null, 2)}\n`, "utf8");

  const publicSources = Object.fromEntries(
    output.sources.map((source) => [source.id, source])
  );
  publicSources["ispra-landslide-2024-v5"] = {
    hazard: "landslide",
    id: "ispra-landslide-2024-v5",
    license: "CC BY 4.0",
    provider: "ISPRA",
    reference_period: {
      start_year: 2024,
      end_year: 2024,
      precision: "year",
      label: "2024",
    },
    source_url: currentContext.sources?.landslide?.source_url,
    title: currentContext.sources?.landslide?.source_name,
    version: "v5.0",
  };
  const publicOutput = {
    schema_version: "arcus-event-hazard-history-public-v1",
    generated_at: output.generated_at,
    open_release: output.open_release,
    observation_role: "official_class_membership_at_documented_event_coordinate",
    caveat:
      "Each observation reports polygon membership at the same documented coordinate in the named official release. It is not a causal interpretation of the collapse.",
    coverage: output.coverage,
    sources: publicSources,
    events: Object.fromEntries(
      Object.entries(output.events).map(([eventId, event]) => [
        eventId,
        {
          coordinates: event.coordinates,
          event_date: event.event_date,
          event_id: event.event_id,
          hazards: Object.fromEntries(
            Object.entries(event.hazards).map(([hazard, history]) => [
              hazard,
              {
                comparison_summary: publicComparisonSummary(
                  history.observations,
                  hazard
                ),
                observations: history.observations.map((observation) => ({
                  classes: observation.classes,
                  highest_class: observation.highest_class,
                  minimum_boundary_distance_m: observation.minimum_boundary_distance_m,
                  point_status: observation.point_status,
                  positional_assessment: observation.positional_assessment,
                  reference_period: observation.reference_period,
                  release_id: observation.release_id,
                  temporal_relation_to_event: observation.temporal_relation_to_event,
                })),
              },
            ])
          ),
        },
      ])
    ),
  };

  fs.mkdirSync(path.dirname(publicOutputPath), { recursive: true });
  fs.writeFileSync(publicOutputPath, `${JSON.stringify(publicOutput, null, 2)}\n`, "utf8");

  return output;
}

if (!isMainThread && workerData?.type === "query_release") {
  const results = queryRelease(
    workerData.release,
    workerData.candidates,
    workerData.dataDirectory,
    workerData.tolerance,
    (progress) => parentPort.postMessage({ type: "progress", ...progress })
  );
  parentPort.postMessage({
    event_ids: workerData.candidates.map((candidate) => candidate.id),
    release_id: workerData.release.id,
    results,
    type: "result",
  });
} else if (
  process.argv[1] &&
  path.resolve(process.argv[1]) === path.resolve(import.meta.filename)
) {
  const output = await buildEventHazardHistoryPilot();
  console.log(
    JSON.stringify(
      {
        coverage: output.coverage,
        data_directory: process.env.ARCUS_ISPRA_HISTORY_DIR || DEFAULT_DATA_DIRECTORY,
        output: path.relative(ROOT, OUTPUT_PATH),
        public_output: path.relative(ROOT, PUBLIC_OUTPUT_PATH),
      },
      null,
      2
    )
  );
}
