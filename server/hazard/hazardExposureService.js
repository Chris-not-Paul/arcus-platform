import {
  FLOOD_PROVIDER_VERSION,
} from "./normalizers/floodNormalizer.js";
import {
  LANDSLIDE_PROVIDER_VERSION,
} from "./normalizers/landslideNormalizer.js";
import {
  SEISMIC_ANALYSIS_MODE,
  SEISMIC_PROVIDER_VERSION,
} from "./normalizers/seismicNormalizer.js";
import {
  clearIspraFloodLayerCache,
  queryIspraFloodExposure,
  validateWgs84Point,
} from "./providers/ispraFloodProvider.js";
import {
  clearIspraLandslideLayerCache,
  queryIspraLandslideExposure,
} from "./providers/ispraLandslideProvider.js";
import {
  queryIngvSeismicExposure,
} from "./providers/ingvSeismicProvider.js";
import {
  safeError,
  traceHazardStage,
} from "./hazardTrace.js";
import {
  clearNearbyHazardContextCache,
  enrichNoIntersectionWithNearbyContext,
} from "./nearbyHazardContextService.js";

const CACHE_TTL_MS = 1000 * 60 * 60 * 6;
const CACHE_MAX_ITEMS = 500;
const DEFAULT_HAZARDS = Object.freeze([
  "hydraulic",
  "landslide",
  "seismic",
]);
const POINT_EXPOSURE_CONTRACT = "arcus-point-hazard-exposure-v1";
const cache = new Map();
const PROVIDER_REGISTRY = {
  hydraulic: {
    analysisMode: "point_intersection",
    datasetVersion: "source-null",
    providerVersion: FLOOD_PROVIDER_VERSION,
    query: queryIspraFloodExposure,
  },
  landslide: {
    analysisMode: "point_intersection",
    datasetVersion: "source-5.0-2024",
    providerVersion: LANDSLIDE_PROVIDER_VERSION,
    query: queryIspraLandslideExposure,
  },
  seismic: {
    analysisMode: SEISMIC_ANALYSIS_MODE,
    datasetVersion: "MPS04-OPCM3519-1B-ag-005-local-grid",
    providerVersion: SEISMIC_PROVIDER_VERSION,
    query: queryIngvSeismicExposure,
  },
};

function normalizeCoordinate(value) {
  return Number(value).toFixed(5);
}

function cacheKeyFor({
  hazards,
  includeNearbyContext,
  latitude,
  longitude,
}) {
  const requestedHazards = [...new Set(hazards)]
    .sort()
    .map((hazard) => {
      const provider = PROVIDER_REGISTRY[hazard];

      return [
        hazard,
        provider.providerVersion,
        provider.datasetVersion,
        provider.analysisMode || "point_intersection",
      ].join("@");
    })
    .join(",");

  return [
    "point",
    normalizeCoordinate(latitude),
    normalizeCoordinate(longitude),
    requestedHazards,
    includeNearbyContext ? "nearby-context" : "point-only",
  ].join(":");
}

function readCache(key) {
  const hit = cache.get(key);

  if (!hit) {
    return null;
  }

  if (Date.now() - hit.createdAt > CACHE_TTL_MS) {
    cache.delete(key);

    return null;
  }

  cache.delete(key);
  cache.set(key, hit);

  return {
    ...hit.value,
    cache: {
      hit: true,
      key,
      ttl_seconds: Math.round(
        (CACHE_TTL_MS - (Date.now() - hit.createdAt)) / 1000
      ),
    },
  };
}

function writeCache(key, value) {
  cache.set(key, {
    createdAt: Date.now(),
    value,
  });

  while (cache.size > CACHE_MAX_ITEMS) {
    const firstKey = cache.keys().next().value;

    cache.delete(firstKey);
  }
}

function isCacheableResult(value, hazards) {
  const cacheableStatuses = new Set(["available", "no_intersection"]);

  return hazards.every((hazard) =>
    cacheableStatuses.has(value?.[hazard]?.status)
  );
}

function normalizeHazards(hazards) {
  if (!Array.isArray(hazards) || hazards.length === 0) {
    return [...DEFAULT_HAZARDS];
  }

  return [...new Set(hazards.map((hazard) => String(hazard).toLowerCase()))]
    .filter((hazard) => Object.hasOwn(PROVIDER_REGISTRY, hazard));
}

function coverageFor(results, hazards) {
  const returnedHazards = hazards.filter((hazard) =>
    Boolean(results?.[hazard])
  );
  const resolvedStatuses = new Set([
    "available",
    "no_intersection",
    "outside_coverage",
  ]);
  const resolvedHazards = returnedHazards.filter((hazard) =>
    resolvedStatuses.has(results[hazard]?.status)
  );
  const partialHazards = returnedHazards.filter(
    (hazard) => results[hazard]?.status === "partial"
  );
  const unresolvedHazards = hazards.filter(
    (hazard) =>
      !resolvedHazards.includes(hazard) &&
      !partialHazards.includes(hazard)
  );

  return {
    complete_response: returnedHazards.length === hazards.length,
    official_data_complete:
      resolvedHazards.length === hazards.length,
    partial_hazards: partialHazards,
    requested_hazards: hazards,
    resolved_hazards: resolvedHazards,
    returned_hazards: returnedHazards,
    unresolved_hazards: unresolvedHazards,
  };
}

function overallStatusFor(results) {
  const statuses = Object.values(results)
    .map((result) => result?.status)
    .filter(Boolean);

  if (!statuses.length) {
    return "not_requested";
  }

  if (statuses.every((status) => status === "available")) {
    return "available";
  }

  if (statuses.every((status) => status === "no_intersection")) {
    return "no_intersection";
  }

  if (
    statuses.every((status) =>
      ["available", "no_intersection", "partial"].includes(status)
    )
  ) {
    return statuses.includes("partial") ? "partial" : "available";
  }

  if (
    statuses.some((status) =>
      ["available", "no_intersection", "partial"].includes(status)
    )
  ) {
    return "partial";
  }

  if (statuses.every((status) => status === "point_not_selected")) {
    return "point_not_selected";
  }

  if (statuses.every((status) => status === "request_timeout")) {
    return "request_timeout";
  }

  return "unavailable";
}

function pointNotSelectedResult(hazard, query) {
  const base = {
    confidence: "not_selected",
    explanation: [
      "The hazard exposure query was not executed because no validated project point was provided.",
    ],
    normalized_score: null,
    status: "point_not_selected",
  };

  if (hazard === "landslide") {
    return {
      ...base,
      attention_area: false,
      highest_hazard_class: null,
      matched_attention_classes: [],
      matched_hazard_classes: [],
      query,
    };
  }

  if (hazard === "seismic") {
    return {
      ...base,
      analysis_mode: "grid_sampling",
      interpolated: false,
      interpolated_pga_g: null,
      model: "MPS04",
      model_role: "reference_regulatory_model",
      nearest_node: null,
      pga_p16_g: null,
      pga_p50_g: null,
      pga_p84_g: null,
      probability_of_exceedance_50_years: 10,
      reference_ground_condition: null,
      sampling_method: "nearest_grid_node",
      scientific_comparison: {
        model: "MPS19",
        model_role: "updated_scientific_model",
        normalized_score: null,
        reason: "MPS19 is not integrated in this Path 01 vertical slice.",
        status: "not_integrated",
      },
      surrounding_nodes: [],
      unit: "g",
      percentile: 50,
      shaking_parameter: "PGA",
    };
  }

  return {
    ...base,
    highest_class: null,
    matched_classes: [],
    query,
  };
}

function providerExceptionResult(hazard, error) {
  const attemptedAt = new Date().toISOString();
  const diagnosticError = safeError(error);
  const provider = PROVIDER_REGISTRY[hazard] || {};
  const base = {
    attempted_at: attemptedAt,
    confidence: "source_unavailable",
    error: {
      ...diagnosticError,
      code: diagnosticError?.code ||
        (error?.name === "AbortError"
          ? "request_timeout"
          : "provider_exception"),
      http_status: diagnosticError?.http_status || null,
      message: diagnosticError?.message ||
        "The provider failed before returning a normalized hazard result.",
      name: diagnosticError?.name || error?.name || "Error",
      original_error_type: error?.name || "Error",
      retryable: diagnosticError?.retryable ?? true,
      stage: diagnosticError?.stage || "provider_result_returned",
      wfs_exception_code: diagnosticError?.wfs_exception_code || null,
      wfs_exception_text: diagnosticError?.wfs_exception_text || null,
    },
    explanation: [
      "The provider failed before returning a normalized hazard result.",
    ],
    normalized_score: null,
    source: {
      provider: hazard === "seismic" ? "INGV" : "ISPRA",
      provider_version: provider.providerVersion || null,
      queried_at: attemptedAt,
      service_type: hazard === "seismic" ? "local_grid" : "WFS",
      source_dataset_version:
        hazard === "landslide"
          ? "5.0"
          : hazard === "seismic"
            ? provider.datasetVersion || null
            : null,
      source_reference_year:
        hazard === "landslide" ? 2024 : null,
    },
    status: error?.name === "AbortError"
      ? "request_timeout"
      : "provider_exception",
  };

  if (hazard === "landslide") {
    return {
      ...base,
      attention_area: false,
      highest_hazard_class: null,
      matched_attention_classes: [],
      matched_hazard_classes: [],
    };
  }

  if (hazard === "seismic") {
    return {
      ...base,
      analysis_mode: "grid_sampling",
      interpolated: false,
      interpolated_pga_g: null,
      model: "MPS04",
      model_role: "reference_regulatory_model",
      nearest_node: null,
      pga_p16_g: null,
      pga_p50_g: null,
      pga_p84_g: null,
      probability_of_exceedance_50_years: 10,
      reference_ground_condition: null,
      sampling_method: "nearest_grid_node",
      scientific_comparison: {
        model: "MPS19",
        model_role: "updated_scientific_model",
        normalized_score: null,
        reason: "MPS19 is not integrated in this Path 01 vertical slice.",
        status: "not_integrated",
      },
      surrounding_nodes: [],
      unit: "g",
      percentile: 50,
      shaking_parameter: "PGA",
    };
  }

  return {
    ...base,
    highest_class: null,
    matched_classes: [],
  };
}

async function runProviders({ hazards, options, point }) {
  const settled = await Promise.allSettled(
    hazards.map(async (hazard) => {
      const result = await queryRegisteredHazardProvider(hazard, point, options);

      return [hazard, result];
    })
  );
  const results = {};

  settled.forEach((item, index) => {
    const hazard = hazards[index];

    if (item.status === "fulfilled") {
      const [fulfilledHazard, providerResult] = item.value;

      results[fulfilledHazard] = providerResult;
    } else {
      const provider = PROVIDER_REGISTRY[hazard];

      traceHazardStage({
        error: item.reason,
        hazard,
        latitude: point.latitude,
        longitude: point.longitude,
        providerVersion: provider.providerVersion,
        requestId: options.requestId,
        stage: "provider_result_returned",
      });
      results[hazard] = providerExceptionResult(hazard, item.reason);
    }
  });

  return results;
}

export async function queryRegisteredHazardProvider(
  hazard,
  point,
  options = {}
) {
  const provider = PROVIDER_REGISTRY[hazard];

  if (!provider) {
    const error = new Error(`Unknown hazard provider: ${hazard}`);

    error.code = "unknown_hazard_provider";
    error.stage = "service_dispatch_started";
    throw error;
  }

  const startedAt = Date.now();

  traceHazardStage({
    hazard,
    latitude: point?.latitude,
    longitude: point?.longitude,
    providerVersion: provider.providerVersion,
    requestId: options.requestId,
    stage: "service_dispatch_started",
  });

  const result = await provider.query(point, {
    ...options,
    providerVersion: provider.providerVersion,
    requestId: options.requestId,
  });

  traceHazardStage({
    durationMs: Date.now() - startedAt,
    hazard,
    latitude: point?.latitude,
    longitude: point?.longitude,
    providerVersion: provider.providerVersion,
    requestId: options.requestId,
    stage: "provider_result_returned",
  });

  return result;
}

export async function evaluatePointHazardExposure(payload, options = {}) {
  const validated = validateWgs84Point(payload || {});
  const hazards = normalizeHazards(payload?.hazards);
  const requestId = options.requestId || payload?.request_id || "unknown";
  const isDevelopment = process.env.NODE_ENV !== "production";
  const bypassCache = Boolean(
    options.bypassCache || (isDevelopment && payload?.bypassCache)
  );
  const persistentCache = options.persistentCache ??
    (!options.fetchImpl || options.fetchImpl === globalThis.fetch);
  const query = {
    crs: "EPSG:4326",
    latitude: Number(payload?.latitude),
    longitude: Number(payload?.longitude),
    request_id: requestId,
  };

  if (!validated.ok) {
    const result = {
      data_contract: POINT_EXPOSURE_CONTRACT,
      query: {
        ...query,
        hazards,
      },
    };

    hazards.forEach((hazard) => {
      result[hazard] = pointNotSelectedResult(hazard, result.query);
    });
    result.overall_status = overallStatusFor(result);
    result.coverage = coverageFor(result, hazards);

    return result;
  }

  const key = cacheKeyFor({
    hazards,
    includeNearbyContext: payload?.include_nearby_context === true,
    latitude: validated.latitude,
    longitude: validated.longitude,
  });
  const cached = bypassCache ? null : readCache(key);

  if (cached) {
    return cached;
  }

  const result = {
    cache: {
      bypass: bypassCache,
      hit: false,
      key,
      ttl_seconds: Math.round(CACHE_TTL_MS / 1000),
    },
    data_contract: POINT_EXPOSURE_CONTRACT,
    query: {
      crs: "EPSG:4326",
      hazards,
      latitude: validated.latitude,
      longitude: validated.longitude,
      request_id: requestId,
    },
    request_id: requestId,
  };

  const providerResults = await runProviders({
    hazards,
    options: {
      ...options,
      bypassCache,
      persistentCache,
      requestId,
    },
    point: {
      latitude: validated.latitude,
      longitude: validated.longitude,
    },
  });

  if (payload?.include_nearby_context === true) {
    await enrichNoIntersectionWithNearbyContext(
      providerResults,
      {
        latitude: validated.latitude,
        longitude: validated.longitude,
      },
      {
        bypassCache,
        fetchImpl: options.fetchImpl || globalThis.fetch,
        timeoutMs: options.timeoutMs,
      }
    );
  }

  hazards.forEach((hazard) => {
    result[hazard] = providerResults[hazard] ||
      providerExceptionResult(hazard);
  });
  result.overall_status = overallStatusFor(providerResults);
  result.coverage = coverageFor(providerResults, hazards);
  hazards.forEach((hazard) => {
    traceHazardStage({
      hazard,
      latitude: validated.latitude,
      longitude: validated.longitude,
      providerVersion: PROVIDER_REGISTRY[hazard]?.providerVersion || null,
      requestId,
      stage: "service_result_mapped",
    });
  });

  if (!bypassCache) {
    if (isCacheableResult(result, hazards)) {
      writeCache(key, result);
    }
  }

  return result;
}

export function clearHazardExposureCache() {
  cache.clear();
  clearNearbyHazardContextCache();
  clearIspraFloodLayerCache();
  clearIspraLandslideLayerCache();
}
