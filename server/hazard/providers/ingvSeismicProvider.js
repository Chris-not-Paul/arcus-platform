import fs from "node:fs/promises";
import path from "node:path";

import { privateDataDir } from "../../config.js";
import {
  SEISMIC_ANALYSIS_MODE,
  SEISMIC_MODEL,
  SEISMIC_MODEL_ROLE,
  SEISMIC_PARAMETER,
  SEISMIC_PERCENTILE,
  SEISMIC_PROBABILITY_50_YEARS,
  SEISMIC_PROVIDER_VERSION,
  SEISMIC_REFERENCE_RETURN_PERIOD_YEARS,
  SEISMIC_REQUIRED_PROCESSED_CRS,
  SEISMIC_REQUIRED_SOURCE_CRS,
  SEISMIC_SOURCE,
  SEISMIC_UNIT,
  requiredSeismicMetadata,
  seismicExplanation,
  seismicScientificComparison,
} from "../normalizers/seismicNormalizer.js";
import { validateWgs84Point } from "../shared/geometry.js";

const DEFAULT_SEISMIC_DIR = path.join(
  privateDataDir,
  "professional",
  "seismic"
);
const DEFAULT_MANIFEST_PATH = path.join(
  DEFAULT_SEISMIC_DIR,
  "mps04-manifest.json"
);
const DEFAULT_GRID_PATH = path.join(
  DEFAULT_SEISMIC_DIR,
  "mps04-grid.json"
);
const DEFAULT_MAX_NEAREST_NODE_DISTANCE_M = 9000;

function nowIso() {
  return new Date().toISOString();
}

function baseSource({
  manifest = null,
  queriedAt = nowIso(),
  serviceType = "local_grid",
} = {}) {
  return {
    analysis_mode: SEISMIC_ANALYSIS_MODE,
    coordinate_transform_applied:
      manifest?.coordinate_transform_applied ?? null,
    doi: manifest?.doi ?? SEISMIC_SOURCE.doi,
    grid_spacing_degrees: manifest?.grid_spacing_degrees ?? null,
    input_crs: "EPSG:4326",
    licence: manifest?.licence ?? SEISMIC_SOURCE.licence,
    model: SEISMIC_MODEL,
    model_role: SEISMIC_MODEL_ROLE,
    percentile: SEISMIC_PERCENTILE,
    probability_of_exceedance_50_years: SEISMIC_PROBABILITY_50_YEARS,
    processed_checksum_sha256:
      manifest?.processed_checksum_sha256 ?? null,
    processed_crs: manifest?.processed_crs ?? null,
    provider: "INGV",
    provider_version: SEISMIC_PROVIDER_VERSION,
    queried_at: queriedAt,
    reference_ground_condition:
      manifest?.reference_ground_condition ?? null,
    service_type: serviceType,
    shaking_parameter: SEISMIC_PARAMETER,
    source_checksum_sha256: manifest?.source_checksum_sha256 ?? null,
    source_crs: manifest?.source_crs ?? null,
    source_dataset_version:
      manifest?.dataset_version ?? "MPS04-OPCM3519-1B-ag-005",
    source_name: manifest?.source_name ?? SEISMIC_SOURCE.sourceName,
    source_url: manifest?.source_url ?? SEISMIC_SOURCE.downloadUrl,
    transform_accuracy_note:
      manifest?.transform_accuracy_note ?? null,
    transform_library: manifest?.transform_library ?? null,
    transform_method: manifest?.transform_method ?? null,
    unit: SEISMIC_UNIT,
  };
}

function emptySeismicResult({
  error = null,
  manifest = null,
  query = null,
  serviceType = "local_grid",
  status,
}) {
  const result = {
    analysis_mode: SEISMIC_ANALYSIS_MODE,
    confidence: ["configuration_error", "source_unavailable"].includes(status)
      ? "source_unavailable"
      : "invalid_query",
    error,
    interpolated: false,
    interpolated_pga_g: null,
    model: SEISMIC_MODEL,
    model_role: SEISMIC_MODEL_ROLE,
    nearest_node: null,
    normalized_score: null,
    pga_p16_g: null,
    pga_p50_g: null,
    pga_p84_g: null,
    probability_of_exceedance_50_years: SEISMIC_PROBABILITY_50_YEARS,
    query,
    reference_return_period_years: SEISMIC_REFERENCE_RETURN_PERIOD_YEARS,
    sampling_method: "nearest_grid_node",
    scientific_comparison: seismicScientificComparison(),
    source: baseSource({ manifest, serviceType }),
    status,
    surrounding_nodes: [],
    unit: SEISMIC_UNIT,
    percentile: SEISMIC_PERCENTILE,
    shaking_parameter: SEISMIC_PARAMETER,
  };

  return {
    ...result,
    explanation: seismicExplanation(result),
  };
}

async function readJsonFile(filePath) {
  try {
    return JSON.parse(await fs.readFile(filePath, "utf8"));
  } catch (error) {
    if (error?.code === "ENOENT") {
      const configurationError = new Error(
        `Missing local MPS04 seismic resource: ${filePath}`
      );

      configurationError.code = "configuration_error";
      configurationError.stage = "local_resource_loaded";
      configurationError.retryable = false;
      throw configurationError;
    }

    if (error instanceof SyntaxError) {
      error.code = "invalid_response";
      error.stage = "local_resource_parsed";
    }

    throw error;
  }
}

function finiteNumber(value) {
  const number = Number(value);

  return Number.isFinite(number) ? number : null;
}

function validateManifest(manifest) {
  const errors = [];

  if (manifest?.model !== SEISMIC_MODEL) {
    errors.push("model");
  }

  if (manifest?.source_crs !== SEISMIC_REQUIRED_SOURCE_CRS) {
    errors.push("source_crs");
  }

  if (manifest?.processed_crs !== SEISMIC_REQUIRED_PROCESSED_CRS) {
    errors.push("processed_crs");
  }

  if (manifest?.shaking_parameter !== SEISMIC_PARAMETER) {
    errors.push("shaking_parameter");
  }

  if (Number(manifest?.probability_of_exceedance_50_years) !==
    SEISMIC_PROBABILITY_50_YEARS) {
    errors.push("probability_of_exceedance_50_years");
  }

  if (Number(manifest?.percentile) !== SEISMIC_PERCENTILE) {
    errors.push("percentile");
  }

  if (manifest?.unit !== SEISMIC_UNIT) {
    errors.push("unit");
  }

  if (manifest?.coordinate_transform_applied !== true) {
    errors.push("coordinate_transform_applied");
  }

  if (errors.length) {
    const error = new Error(
      `MPS04 manifest schema mismatch: ${errors.join(", ")}`
    );

    error.code = "schema_mismatch";
    error.stage = "manifest_validated";
    error.retryable = false;
    throw error;
  }
}

function normalizeNode(node) {
  return {
    id: String(node.id ?? ""),
    latitude: finiteNumber(node.latitude),
    longitude: finiteNumber(node.longitude),
    pga_g: finiteNumber(node.pga_p50_g ?? node.pga_g),
    pga_p16_g: finiteNumber(node.pga_p16_g),
    pga_p50_g: finiteNumber(node.pga_p50_g ?? node.pga_g),
    pga_p84_g: finiteNumber(node.pga_p84_g),
    source_latitude: finiteNumber(node.source_latitude),
    source_longitude: finiteNumber(node.source_longitude),
  };
}

function validateGrid(grid) {
  if (!grid || !Array.isArray(grid.nodes)) {
    const error = new Error("MPS04 grid must contain a nodes array.");

    error.code = "schema_mismatch";
    error.stage = "grid_validated";
    error.retryable = false;
    throw error;
  }

  const normalized = grid.nodes.map(normalizeNode);
  const seen = new Set();

  normalized.forEach((node) => {
    const key = `${node.latitude}:${node.longitude}`;

    if (
      !node.id ||
      !Number.isFinite(node.latitude) ||
      !Number.isFinite(node.longitude) ||
      !Number.isFinite(node.pga_p50_g)
    ) {
      const error = new Error("MPS04 grid contains invalid node values.");

      error.code = "schema_mismatch";
      error.stage = "grid_validated";
      error.retryable = false;
      throw error;
    }

    if (seen.has(key)) {
      const error = new Error("MPS04 grid contains duplicate nodes.");

      error.code = "schema_mismatch";
      error.stage = "grid_validated";
      error.retryable = false;
      throw error;
    }

    seen.add(key);
  });

  return normalized;
}

function haversineDistanceMeters(left, right) {
  const toRadians = (value) => (value * Math.PI) / 180;
  const radius = 6371008.8;
  const lat1 = toRadians(left.latitude);
  const lat2 = toRadians(right.latitude);
  const deltaLat = toRadians(right.latitude - left.latitude);
  const deltaLon = toRadians(right.longitude - left.longitude);
  const a =
    Math.sin(deltaLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) *
      Math.sin(deltaLon / 2) ** 2;

  return 2 * radius * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function bboxForNodes(nodes) {
  return {
    east: Math.max(...nodes.map((node) => node.longitude)),
    north: Math.max(...nodes.map((node) => node.latitude)),
    south: Math.min(...nodes.map((node) => node.latitude)),
    west: Math.min(...nodes.map((node) => node.longitude)),
  };
}

function pointInsideBbox(point, bbox, paddingDegrees = 0.08) {
  return (
    point.latitude >= bbox.south - paddingDegrees &&
    point.latitude <= bbox.north + paddingDegrees &&
    point.longitude >= bbox.west - paddingDegrees &&
    point.longitude <= bbox.east + paddingDegrees
  );
}

function publicNode(node, distanceM = null) {
  return {
    distance_m: Number.isFinite(distanceM)
      ? Math.round(distanceM)
      : null,
    id: node.id,
    latitude: node.latitude,
    longitude: node.longitude,
    pga_g: node.pga_p50_g,
    pga_p16_g: node.pga_p16_g,
    pga_p50_g: node.pga_p50_g,
    pga_p84_g: node.pga_p84_g,
  };
}

function sampleNearestNode({ manifest, nodes, point }) {
  const bbox =
    manifest?.coverage_bbox_wgs84 ||
    manifest?.coverage_bbox ||
    bboxForNodes(nodes);

  if (!pointInsideBbox(point, bbox)) {
    return {
      nearest: null,
      outsideCoverage: true,
      surrounding: [],
    };
  }

  const ranked = nodes
    .map((node) => ({
      distanceM: haversineDistanceMeters(point, node),
      node,
    }))
    .sort((left, right) => left.distanceM - right.distanceM);
  const nearest = ranked[0];
  const maxDistance =
    Number(manifest?.max_nearest_node_distance_m) ||
    DEFAULT_MAX_NEAREST_NODE_DISTANCE_M;

  return {
    nearest,
    outsideCoverage:
      !nearest || nearest.distanceM > maxDistance,
    surrounding: ranked.slice(0, 4),
  };
}

function providerErrorStatus(error) {
  if (error?.code === "configuration_error") {
    return "configuration_error";
  }

  if (error?.code === "schema_mismatch") {
    return "schema_mismatch";
  }

  return "provider_exception";
}

export async function queryIngvSeismicExposure(
  point,
  {
    gridPath = DEFAULT_GRID_PATH,
    manifestPath = DEFAULT_MANIFEST_PATH,
  } = {}
) {
  const query = {
    crs: "EPSG:4326",
    latitude: Number(point?.latitude),
    longitude: Number(point?.longitude),
  };
  const validated = validateWgs84Point(point || {});

  if (!validated.ok) {
    return emptySeismicResult({
      error: {
        code: validated.error || "invalid_coordinates",
        message:
          "queryIngvSeismicExposure expects WGS84 coordinates { latitude, longitude }.",
        retryable: false,
        stage: "coordinates_validated",
      },
      query,
      status: "invalid_coordinates",
    });
  }

  let manifest;
  let grid;

  try {
    manifest = await readJsonFile(manifestPath);
    validateManifest(manifest);
    grid = await readJsonFile(gridPath);
    const nodes = validateGrid(grid);
    const sampled = sampleNearestNode({
      manifest,
      nodes,
      point: {
        latitude: validated.latitude,
        longitude: validated.longitude,
      },
    });

    if (sampled.outsideCoverage) {
      return emptySeismicResult({
        manifest,
        query,
        status: "outside_coverage",
      });
    }

    const nearestNode = publicNode(
      sampled.nearest.node,
      sampled.nearest.distanceM
    );
    const result = {
      ...requiredSeismicMetadata(),
      confidence: "source_available",
      interpolated: false,
      interpolated_pga_g: null,
      model: SEISMIC_MODEL,
      model_role: SEISMIC_MODEL_ROLE,
      nearest_node: nearestNode,
      normalized_score: null,
      pga_p16_g: nearestNode.pga_p16_g,
      pga_p50_g: nearestNode.pga_p50_g,
      pga_p84_g: nearestNode.pga_p84_g,
      query,
      reference_ground_condition:
        manifest.reference_ground_condition || null,
      sampling_method: "nearest_grid_node",
      scientific_comparison: seismicScientificComparison(),
      source: baseSource({ manifest }),
      status: "available",
      surrounding_nodes: sampled.surrounding.map((item) =>
        publicNode(item.node, item.distanceM)
      ),
    };

    return {
      ...result,
      explanation: seismicExplanation(result),
    };
  } catch (error) {
    return emptySeismicResult({
      error: {
        code: error?.code || "provider_exception",
        message:
          error?.message ||
          "The INGV MPS04 provider failed before returning a normalized result.",
        name: error?.name || "Error",
        retryable: error?.retryable ?? false,
        stage: error?.stage || "provider_result_returned",
      },
      manifest,
      query,
      status: providerErrorStatus(error),
    });
  }
}

export const INGV_MPS04_DEFAULT_GRID_PATH = DEFAULT_GRID_PATH;
export const INGV_MPS04_DEFAULT_MANIFEST_PATH = DEFAULT_MANIFEST_PATH;
