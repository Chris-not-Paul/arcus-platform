import {
  LANDSLIDE_CLASS_BY_CODE,
  LANDSLIDE_PROVIDER_VERSION,
  highestLandslideHazardClass,
  landslideExplanation,
  normalizeLandslideClass,
} from "../normalizers/landslideNormalizer.js";
import {
  featureCollectionIntersections,
  validateWgs84Point,
} from "../shared/geometry.js";
import {
  contentTypeOf,
  hasJsonContentType,
  layerStatusFromError,
  looksLikeXmlProviderException,
  previewText,
} from "../shared/ogcWfsClient.js";
import {
  readLandslideObservation,
  writeLandslideObservation,
} from "../landslideObservationStore.js";
import {
  providerModulePath,
  traceHazardStage,
} from "../hazardTrace.js";

const DEFAULT_WFS_URL = "https://idrogeo.isprambiente.it/geoserver/idrogeo/ows";
const DEFAULT_WMS_URL = "https://idrogeo.isprambiente.it/geoserver/idrogeo/wms";
const ENDPOINT_IDENTIFIER = "idrogeo-pai-landslide-wfs";
const REQUEST_TIMEOUT_MS = 15000;
const DEFAULT_RETRY_ATTEMPTS = 2;
const DEFAULT_RETRY_DELAY_MS = 200;
const DEFAULT_RETRY_JITTER_RATIO = 0.25;
const REMOTE_CONCURRENCY_LIMIT = 6;
const CIRCUIT_FAILURE_THRESHOLD = 3;
const CIRCUIT_COOLDOWN_MS = 30_000;
const LAYER_CACHE_TTL_MS = 1000 * 60 * 60 * 6;
const LAYER_CACHE_MAX_ITEMS = 1500;
const PERSISTENT_CACHE_TTL_MS = 1000 * 60 * 60 * 6;
const LAST_KNOWN_GOOD_MAX_AGE_MS = 1000 * 60 * 60 * 24 * 30;
const DEFAULT_WFS_VERSION = "2.0.0";
const FALLBACK_WFS_VERSION = "1.1.0";
const REQUEST_CRS = "EPSG:4326";
const FILTER_AXIS_ORDER = "longitude_latitude";
const FILTER_CRS = "EPSG:4326";
const QUERY_METHOD = "server_side_point_intersection";
const SERVICE_TYPE = "WFS";
const SOURCE_NAME = "Mosaicatura della pericolosita da frana PAI";
const SOURCE_DATASET_VERSION = "5.0";
const SOURCE_REFERENCE_YEAR = 2024;
const SOURCE_MATCHES_LATEST_OFFICIAL_RELEASE = true;
const LICENCE = "See IdroGEO terms of service and open-data licence";
const CLASS_ATTRIBUTE = "cod_per_it";
const GEOMETRY_ATTRIBUTE = "geom";
const LAYER = {
  classAttribute: CLASS_ATTRIBUTE,
  geometryAttribute: GEOMETRY_ATTRIBUTE,
  layerName: "idrogeo:pericolosita_frane",
};
const layerCache = new Map();
const inFlightLayerRequests = new Map();
const circuitBreakers = new Map();
const remoteQueue = [];
let activeRemoteRequests = 0;

export const LANDSLIDE_PROVIDER_MODULE_PATH = providerModulePath(import.meta.url);

function normalizedCoordinate(value) {
  return Number(value).toFixed(5);
}

function layerCacheKey({ latitude, longitude, serviceUrl }) {
  return [
    ENDPOINT_IDENTIFIER,
    LANDSLIDE_PROVIDER_VERSION,
    serviceUrl,
    LAYER.layerName,
    normalizedCoordinate(latitude),
    normalizedCoordinate(longitude),
  ].join(":");
}

function readLayerCache(key) {
  const hit = layerCache.get(key);

  if (!hit) {
    return null;
  }

  const ageMs = Date.now() - hit.createdAt;

  if (ageMs > LAYER_CACHE_TTL_MS) {
    layerCache.delete(key);
    return null;
  }

  layerCache.delete(key);
  layerCache.set(key, hit);

  return {
    ...hit.value,
    cache: {
      age_seconds: Math.round(ageMs / 1000),
      hit: true,
      key,
      tier: "memory",
      ttl_seconds: Math.max(
        0,
        Math.round((LAYER_CACHE_TTL_MS - ageMs) / 1000)
      ),
    },
    observation: {
      ...(hit.value.observation || {}),
      age_seconds: Math.round(ageMs / 1000),
      origin_mode: hit.value.observation?.mode || "live",
      mode: "memory_cache",
      retrieved_at: new Date().toISOString(),
    },
  };
}

function writeLayerCache(key, value) {
  layerCache.set(key, {
    createdAt: Date.now(),
    value,
  });

  while (layerCache.size > LAYER_CACHE_MAX_ITEMS) {
    layerCache.delete(layerCache.keys().next().value);
  }
}

function cacheableLayerResult(result) {
  return ["available", "no_intersection"].includes(result?.status);
}

function freshnessStatus(ageMs) {
  if (ageMs <= PERSISTENT_CACHE_TTL_MS) {
    return "current";
  }

  if (ageMs <= LAST_KNOWN_GOOD_MAX_AGE_MS) {
    return "stale";
  }

  return "expired";
}

function lastKnownGoodSummary(observation) {
  if (!observation || observation.age_ms > LAST_KNOWN_GOOD_MAX_AGE_MS) {
    return null;
  }

  return {
    age_seconds: Math.round(observation.age_ms / 1000),
    available: true,
    attention_area:
      (observation.result.matched_attention_classes || []).includes("AA"),
    freshness_status: freshnessStatus(observation.age_ms),
    matched_attention_classes:
      observation.result.matched_attention_classes || [],
    matched_hazard_classes:
      observation.result.matched_hazard_classes || [],
    observed_at: observation.observed_at,
    status: observation.result.status,
  };
}

async function persistLayerObservation({
  directory,
  enabled,
  key,
  result,
}) {
  if (!enabled || !cacheableLayerResult(result)) {
    return false;
  }

  const persistableResult = {
    ...result,
  };

  delete persistableResult.cache;
  delete persistableResult.last_known_good;

  try {
    return await writeLandslideObservation({
      cacheKey: key,
      directory,
      observedAt: result.queried_at,
      result: persistableResult,
    });
  } catch {
    return false;
  }
}

export function clearIspraLandslideLayerCache() {
  layerCache.clear();
  inFlightLayerRequests.clear();
  circuitBreakers.clear();
}

function releaseRemoteSlot() {
  activeRemoteRequests = Math.max(0, activeRemoteRequests - 1);
  const next = remoteQueue.shift();

  if (next) {
    activeRemoteRequests += 1;
    next();
  }
}

async function withRemoteSlot(operation) {
  if (activeRemoteRequests >= REMOTE_CONCURRENCY_LIMIT) {
    await new Promise((resolve) => remoteQueue.push(resolve));
  } else {
    activeRemoteRequests += 1;
  }

  try {
    return await operation();
  } finally {
    releaseRemoteSlot();
  }
}

function circuitKey(serviceUrl) {
  return `${serviceUrl}:${LAYER.layerName}`;
}

function circuitState(key, now) {
  const state = circuitBreakers.get(key);

  if (!state) {
    return null;
  }

  if (state.open_until > now) {
    return state;
  }

  if (state.open_until) {
    circuitBreakers.delete(key);
  }

  return null;
}

function circuitFailure(result) {
  return ["request_timeout", "service_unreachable"].includes(result?.status) ||
    (result?.status === "http_error" && Number(result.http_status) >= 500);
}

function recordCircuitResult(key, result, now) {
  if (!circuitFailure(result)) {
    circuitBreakers.delete(key);
    return;
  }

  const failures = Number(circuitBreakers.get(key)?.failures || 0) + 1;

  circuitBreakers.set(key, {
    failures,
    open_until:
      failures >= CIRCUIT_FAILURE_THRESHOLD
        ? now + CIRCUIT_COOLDOWN_MS
        : 0,
  });
}

function urlForLayer({ latitude, longitude, serviceUrl, version }) {
  const url = new URL(serviceUrl);

  url.searchParams.set("service", "WFS");
  url.searchParams.set("version", version);
  url.searchParams.set("request", "GetFeature");
  url.searchParams.set(
    version === "2.0.0" ? "typeNames" : "typeName",
    LAYER.layerName
  );
  url.searchParams.set("outputFormat", "application/json");
  url.searchParams.set("srsName", REQUEST_CRS);
  url.searchParams.set("propertyName", CLASS_ATTRIBUTE);
  url.searchParams.set(
    "CQL_FILTER",
    `INTERSECTS(${GEOMETRY_ATTRIBUTE},SRID=4326;POINT(${longitude} ${latitude}))`
  );

  return url;
}

function requestMetadata() {
  return {
    endpoint_identifier: ENDPOINT_IDENTIFIER,
    filter_axis_order: FILTER_AXIS_ORDER,
    filter_crs: FILTER_CRS,
    filter_geometry_property: GEOMETRY_ATTRIBUTE,
    query_method: QUERY_METHOD,
    request_crs: REQUEST_CRS,
    response_property: CLASS_ATTRIBUTE,
  };
}

function sourceMetadata({
  fallbackUsed = false,
  queriedAt,
  resolvedVersion,
  serviceUrl,
}) {
  return {
    analysis_mode: "point_intersection",
    class_attribute: CLASS_ATTRIBUTE,
    endpoint_identifier: ENDPOINT_IDENTIFIER,
    fallback_used: fallbackUsed,
    filter_axis_order: FILTER_AXIS_ORDER,
    filter_crs: FILTER_CRS,
    layers: [LAYER.layerName],
    licence: LICENCE,
    provider: "ISPRA",
    provider_version: LANDSLIDE_PROVIDER_VERSION,
    queried_at: queriedAt,
    query_method: QUERY_METHOD,
    request_crs: REQUEST_CRS,
    requested_version: DEFAULT_WFS_VERSION,
    resolved_version: resolvedVersion,
    service_type: SERVICE_TYPE,
    service_url: serviceUrl,
    source_dataset_version: SOURCE_DATASET_VERSION,
    source_matches_latest_official_release:
      SOURCE_MATCHES_LATEST_OFFICIAL_RELEASE,
    source_name: SOURCE_NAME,
    source_reference_year: SOURCE_REFERENCE_YEAR,
    wms_url: DEFAULT_WMS_URL,
  };
}

function errorPayload({
  contentType,
  durationMs,
  error,
  httpStatus,
  httpStatusText,
  queriedAt,
  requestUrl,
  stage,
  status,
  version,
}) {
  return {
    class_attribute: CLASS_ATTRIBUTE,
    content_type: contentType || null,
    duration_ms: durationMs,
    error: error || status,
    fallback_used: false,
    feature_count: null,
    http_status: httpStatus || null,
    http_status_text: httpStatusText || null,
    intersects: false,
    layer: LAYER.layerName,
    matched_attention_classes: [],
    matched_hazard_classes: [],
    queried_at: queriedAt,
    request: {
      method: "GET",
      ...requestMetadata(),
      requested_version: DEFAULT_WFS_VERSION,
      resolved_version: version,
      url: requestUrl ? requestUrl.toString() : null,
    },
    requested_version: DEFAULT_WFS_VERSION,
    response_size_bytes: null,
    resolved_version: version,
    stage: stage || null,
    status,
  };
}

function responseFeaturesAtPoint(geojson, point) {
  if (
    geojson?.type !== "FeatureCollection" ||
    !Array.isArray(geojson.features)
  ) {
    const error = new Error("invalid_geojson");

    error.code = "invalid_geojson";
    throw error;
  }

  if (!geojson.features.length) {
    return [];
  }

  const featuresWithGeometry = geojson.features.filter(
    (feature) => feature?.geometry
  );

  // Production responses intentionally omit polygons after GeoServer applies
  // the exact point filter. Keep local verification for compatible endpoints
  // and tests that still return geometry.
  return featuresWithGeometry.length
    ? featureCollectionIntersections(geojson, point)
    : geojson.features;
}

function classesFromFeatures(features) {
  const unknownValues = [];
  const matched = features
    .map((feature) => feature?.properties?.[CLASS_ATTRIBUTE])
    .map((value) => {
      const normalized = normalizeLandslideClass(value);

      if (!normalized) {
        unknownValues.push(value);
      }

      return normalized;
    })
    .filter(Boolean);

  return {
    matchedAttentionClasses: [
      ...new Set(matched.filter((item) => item === "AA")),
    ],
    matchedHazardClasses: [
      ...new Set(matched.filter((item) => item !== "AA")),
    ],
    unknownValues,
  };
}

async function fetchLayerVersion({
  fetchImpl,
  latitude,
  longitude,
  requestId,
  serviceUrl,
  timeoutMs,
  version,
}) {
  const queriedAt = new Date().toISOString();
  const controller = new AbortController();
  const startedAt = Date.now();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  let requestUrl;
  let currentStage = "request_built";

  try {
    requestUrl = urlForLayer({
      latitude,
      longitude,
      serviceUrl,
      version,
    });
    traceHazardStage({
      hazard: "landslide",
      latitude,
      longitude,
      providerVersion: LANDSLIDE_PROVIDER_VERSION,
      requestId,
      stage: "request_built",
    });
    currentStage = "fetch_started";
    const response = await fetchImpl(requestUrl, {
      headers: {
        Accept: "application/json, application/geo+json",
      },
      signal: controller.signal,
    });
    const durationMs = Date.now() - startedAt;
    const contentType = contentTypeOf(response);
    currentStage = "response_received";

    if (!response.ok) {
      let bodyPreview = "";

      try {
        bodyPreview = previewText(await response.text());
      } catch {
        bodyPreview = "";
      }

      return {
        ...errorPayload({
          contentType,
          durationMs,
          error: `http_${response.status}`,
          httpStatus: response.status,
          httpStatusText: response.statusText,
          queriedAt,
          requestUrl,
          stage: currentStage,
          status: "http_error",
          version,
        }),
        response_preview: bodyPreview,
      };
    }

    const text = await response.text();
    currentStage = "response_parsed";

    if (looksLikeXmlProviderException(text, contentType)) {
      return {
        ...errorPayload({
          contentType,
          durationMs,
          error: "provider_exception",
          httpStatus: response.status,
          httpStatusText: response.statusText,
          queriedAt,
          requestUrl,
          stage: currentStage,
          status: "provider_exception",
          version,
        }),
        response_preview: previewText(text),
      };
    }

    if (!hasJsonContentType(contentType)) {
      return {
        ...errorPayload({
          contentType,
          durationMs,
          error: "unexpected_content_type",
          httpStatus: response.status,
          httpStatusText: response.statusText,
          queriedAt,
          requestUrl,
          stage: currentStage,
          status: "invalid_response",
          version,
        }),
        response_preview: previewText(text),
      };
    }

    if (!text.trim()) {
      const error = new Error("empty_response");

      error.code = "empty_response";
      throw error;
    }

    const geojson = JSON.parse(text);
    const intersectingFeatures = responseFeaturesAtPoint(
      geojson,
      [longitude, latitude]
    );
    currentStage = "class_normalized";
    const {
      matchedAttentionClasses,
      matchedHazardClasses,
      unknownValues,
    } = classesFromFeatures(intersectingFeatures);
    const intersects =
      matchedHazardClasses.length > 0 ||
      matchedAttentionClasses.length > 0;
    const status = unknownValues.length
      ? "schema_mismatch"
      : intersects
        ? "available"
        : "no_intersection";

    return {
      class_attribute: CLASS_ATTRIBUTE,
      class_mapping: LANDSLIDE_CLASS_BY_CODE,
      content_type: contentType,
      duration_ms: durationMs,
      fallback_used: false,
      feature_count: geojson.features.length,
      http_status: response.status,
      http_status_text: response.statusText,
      intersects,
      layer: LAYER.layerName,
      matched_attention_classes: matchedAttentionClasses,
      matched_hazard_classes: matchedHazardClasses,
      observation: {
        age_seconds: 0,
        freshness_status: "current",
        mode: "live",
        observed_at: queriedAt,
        retrieved_at: queriedAt,
      },
      queried_at: queriedAt,
      request: {
        method: "GET",
        ...requestMetadata(),
        requested_version: DEFAULT_WFS_VERSION,
        resolved_version: version,
        url: requestUrl.toString(),
      },
      requested_version: DEFAULT_WFS_VERSION,
      response_size_bytes: new TextEncoder().encode(text).byteLength,
      resolved_version: version,
      stage: currentStage,
      status,
      unknown_class_values: unknownValues,
    };
  } catch (error) {
    return {
      ...errorPayload({
        contentType: null,
        durationMs: Date.now() - startedAt,
        error: error?.message || "request_failed",
        httpStatus: null,
        httpStatusText: null,
        queriedAt,
        requestUrl,
        stage: currentStage,
        status: layerStatusFromError(error),
        version,
      }),
      exception: {
        message: error?.message || "request_failed",
        name: error?.name || "Error",
      },
    };
  } finally {
    clearTimeout(timeout);
  }
}

function retryableLayerResult(result) {
  return ["request_timeout", "service_unreachable"].includes(result?.status) ||
    (result?.status === "http_error" &&
      [502, 503, 504].includes(Number(result.http_status)));
}

function wait(milliseconds) {
  return milliseconds
    ? new Promise((resolve) => setTimeout(resolve, milliseconds))
    : Promise.resolve();
}

async function fetchLayerVersionWithRetry({
  randomImpl,
  retryAttempts,
  retryDelayMs,
  retryJitterRatio,
  ...params
}) {
  const attemptCount = Math.max(1, Number(retryAttempts) || 1);
  let result;

  for (let attempt = 1; attempt <= attemptCount; attempt += 1) {
    result = await withRemoteSlot(() => fetchLayerVersion(params));
    result = {
      ...result,
      attempt,
      attempts: attempt,
      retry_exhausted:
        attempt === attemptCount && retryableLayerResult(result),
    };

    if (!retryableLayerResult(result) || attempt === attemptCount) {
      return result;
    }

    const jitter = Math.max(0, Number(retryJitterRatio) || 0) *
      Math.max(0, Number(randomImpl?.()) || 0);

    await wait(Math.round(retryDelayMs * attempt * (1 + jitter)));
  }

  return result;
}

function circuitOpenResult({ now, serviceUrl, state }) {
  const queriedAt = new Date(now).toISOString();

  return {
    ...errorPayload({
      contentType: null,
      durationMs: 0,
      error: "circuit_open",
      httpStatus: null,
      httpStatusText: null,
      queriedAt,
      requestUrl: null,
      status: "circuit_open",
      version: DEFAULT_WFS_VERSION,
    }),
    circuit_breaker: {
      failure_count: state.failures,
      retry_after_seconds: Math.max(
        0,
        Math.ceil((state.open_until - now) / 1000)
      ),
      status: "open",
    },
    service_url: serviceUrl,
  };
}

async function fetchLayer({ nowImpl, serviceUrl, ...params }) {
  const key = circuitKey(serviceUrl);
  const now = nowImpl();
  const openCircuit = circuitState(key, now);

  if (openCircuit) {
    return circuitOpenResult({
      now,
      serviceUrl,
      state: openCircuit,
    });
  }

  const primary = await fetchLayerVersionWithRetry({
    ...params,
    serviceUrl,
    version: DEFAULT_WFS_VERSION,
  });

  if (!["provider_exception", "configuration_error"].includes(primary.status)) {
    recordCircuitResult(key, primary, nowImpl());
    return primary;
  }

  const fallback = await fetchLayerVersionWithRetry({
    ...params,
    serviceUrl,
    version: FALLBACK_WFS_VERSION,
  });
  const result = {
    ...fallback,
    fallback_used: true,
    original_error: {
      error: primary.error,
      http_status: primary.http_status,
      response_preview: primary.response_preview || null,
      status: primary.status,
    },
    request: {
      ...fallback.request,
      requested_version: DEFAULT_WFS_VERSION,
      resolved_version: FALLBACK_WFS_VERSION,
    },
    requested_version: DEFAULT_WFS_VERSION,
    resolved_version: FALLBACK_WFS_VERSION,
  };

  recordCircuitResult(key, result, nowImpl());
  return result;
}

async function fetchLayerResilient({
  bypassCache,
  latitude,
  longitude,
  nowImpl,
  persistentCache,
  persistentCacheDir,
  serviceUrl,
  ...params
}) {
  const key = layerCacheKey({
    latitude,
    longitude,
    serviceUrl,
  });
  const memoryHit = bypassCache ? null : readLayerCache(key);

  if (memoryHit) {
    return memoryHit;
  }

  const persistentObservation = bypassCache || !persistentCache
    ? null
    : await readLandslideObservation({
        cacheKey: key,
        directory: persistentCacheDir,
        now: nowImpl(),
      });

  if (
    persistentObservation &&
    persistentObservation.age_ms <= PERSISTENT_CACHE_TTL_MS
  ) {
    const persistentResult = {
      ...persistentObservation.result,
      cache: {
        age_seconds: Math.round(persistentObservation.age_ms / 1000),
        hit: true,
        key,
        tier: "persistent",
        ttl_seconds: Math.max(
          0,
          Math.round(
            (PERSISTENT_CACHE_TTL_MS - persistentObservation.age_ms) / 1000
          )
        ),
      },
      observation: {
        age_seconds: Math.round(persistentObservation.age_ms / 1000),
        freshness_status: "current",
        mode: "persistent_cache",
        observed_at: persistentObservation.observed_at,
        retrieved_at: new Date(nowImpl()).toISOString(),
      },
    };

    writeLayerCache(key, persistentResult);
    return persistentResult;
  }

  const lastKnownGood = lastKnownGoodSummary(persistentObservation);

  if (!bypassCache && inFlightLayerRequests.has(key)) {
    const shared = await inFlightLayerRequests.get(key);

    return {
      ...shared,
      cache: {
        ...(shared.cache || {}),
        deduplicated: true,
        hit: false,
        key,
        tier: "in_flight",
      },
    };
  }

  const request = fetchLayer({
    latitude,
    longitude,
    nowImpl,
    serviceUrl,
    ...params,
  }).then((result) => {
    const decorated = {
      ...result,
      ...(cacheableLayerResult(result) || !lastKnownGood
        ? {}
        : {
            last_known_good: lastKnownGood,
          }),
      cache: {
        hit: false,
        key,
        tier: "live",
        ttl_seconds: Math.round(LAYER_CACHE_TTL_MS / 1000),
      },
    };

    if (!bypassCache && cacheableLayerResult(decorated)) {
      writeLayerCache(key, decorated);
    }

    return decorated;
  }).then(async (decorated) => {
    if (!bypassCache) {
      await persistLayerObservation({
        directory: persistentCacheDir,
        enabled: persistentCache,
        key,
        result: decorated,
      });
    }

    return decorated;
  });

  if (!bypassCache) {
    inFlightLayerRequests.set(key, request);
  }

  try {
    return await request;
  } finally {
    if (!bypassCache) {
      inFlightLayerRequests.delete(key);
    }
  }
}

export async function queryIspraLandslideExposure(point, options = {}) {
  const optionsShapeValid =
    options === undefined ||
    (options !== null && typeof options === "object" && !Array.isArray(options));
  const safeOptions = optionsShapeValid ? options || {} : {};
  const {
    bypassCache = false,
    fetchImpl = globalThis.fetch,
    nowImpl = Date.now,
    persistentCache = true,
    persistentCacheDir,
    randomImpl = Math.random,
    requestId = "unknown",
    retryAttempts = DEFAULT_RETRY_ATTEMPTS,
    retryDelayMs = DEFAULT_RETRY_DELAY_MS,
    retryJitterRatio = DEFAULT_RETRY_JITTER_RATIO,
    serviceUrl = DEFAULT_WFS_URL,
    timeoutMs = REQUEST_TIMEOUT_MS,
  } = safeOptions;
  const pointShapeValid =
    point !== null && typeof point === "object" && !Array.isArray(point);
  const validated = pointShapeValid && optionsShapeValid
    ? validateWgs84Point(point)
    : { ok: false };
  const attemptedAt = new Date().toISOString();

  traceHazardStage({
    hazard: "landslide",
    latitude: point?.latitude,
    longitude: point?.longitude,
    providerVersion: LANDSLIDE_PROVIDER_VERSION,
    requestId,
    stage: "provider_entered",
  });

  if (!validated.ok) {
    const signatureMismatch = !pointShapeValid || !optionsShapeValid;

    return {
      assessment_complete: false,
      attempted_at: attemptedAt,
      attention_area: false,
      confidence: "invalid_query",
      coverage: {
        failed_layer_count: 1,
        requested_layer_count: 1,
        successful_layer_count: 0,
      },
      decision_status: "invalid_coordinates",
      ...(signatureMismatch
        ? {
            error: {
              code: "signature_mismatch",
              message:
                "queryIspraLandslideExposure expects point object { latitude, longitude } and options object.",
              name: "TypeError",
              retryable: false,
              stage: "coordinates_validated",
            },
          }
        : {}),
      explanation: [
        "The landslide exposure query was not executed because the coordinates are invalid.",
      ],
      highest_hazard_class: null,
      matched_attention_classes: [],
      matched_hazard_classes: [],
      normalized_score: null,
      source: {
        ...sourceMetadata({
          queriedAt: attemptedAt,
          resolvedVersion: null,
          serviceUrl,
        }),
        resolved_version: null,
      },
      status: "invalid_coordinates",
    };
  }

  if (typeof fetchImpl !== "function") {
    return {
      assessment_complete: false,
      attention_area: false,
      confidence: "source_unavailable",
      coverage: {
        failed_layer_count: 1,
        requested_layer_count: 1,
        successful_layer_count: 0,
      },
      decision_status: "service_unreachable",
      explanation: [
        "The landslide exposure service is not available in this runtime.",
      ],
      highest_hazard_class: null,
      matched_attention_classes: [],
      matched_hazard_classes: [],
      normalized_score: null,
      source: sourceMetadata({
        queriedAt: attemptedAt,
        resolvedVersion: null,
        serviceUrl,
      }),
      status: "service_unreachable",
    };
  }

  const layerResult = await fetchLayerResilient({
    bypassCache,
    fetchImpl,
    latitude: validated.latitude,
    longitude: validated.longitude,
    nowImpl,
    persistentCache,
    persistentCacheDir,
    randomImpl,
    requestId,
    retryAttempts,
    retryDelayMs,
    retryJitterRatio,
    serviceUrl,
    timeoutMs,
  });
  const assessmentComplete = cacheableLayerResult(layerResult);
  const matchedHazardClasses = assessmentComplete
    ? layerResult.matched_hazard_classes || []
    : [];
  const matchedAttentionClasses = assessmentComplete
    ? layerResult.matched_attention_classes || []
    : [];
  const highestHazardClass =
    highestLandslideHazardClass(matchedHazardClasses);
  const status = layerResult.status;
  const decisionStatus = assessmentComplete
    ? status === "available"
      ? "available_complete"
      : "no_intersection"
    : "source_incomplete";
  const queriedAt = new Date().toISOString();
  const lastKnownGood = layerResult.last_known_good
    ? [layerResult.last_known_good]
    : [];
  const observationMode = layerResult.observation?.mode || "unavailable";

  return {
    assessment_complete: assessmentComplete,
    attention_area: matchedAttentionClasses.length > 0,
    confidence: assessmentComplete
      ? "source_available"
      : "source_unavailable",
    coverage: {
      failed_layer_count: assessmentComplete ? 0 : 1,
      failed_layers: assessmentComplete
        ? []
        : [{
            error: layerResult.error || layerResult.status,
            http_status: layerResult.http_status || null,
            layer: LAYER.layerName,
            status: layerResult.status,
          }],
      requested_layer_count: 1,
      successful_layer_count: assessmentComplete ? 1 : 0,
      successful_layers: assessmentComplete
        ? [{
            intersects: Boolean(layerResult.intersects),
            layer: LAYER.layerName,
            status: layerResult.status,
          }]
        : [],
    },
    decision_status: decisionStatus,
    explanation: assessmentComplete
      ? landslideExplanation({
          attentionArea: matchedAttentionClasses.length > 0,
          highestHazardClass,
          matchedAttentionClasses,
          matchedHazardClasses,
          status,
        })
      : [
          "The ISPRA PAI landslide source could not provide a complete current observation.",
          "ARCUS does not convert source unavailability into zero landslide hazard.",
        ],
    highest_hazard_class: highestHazardClass,
    layer_results: [layerResult],
    matched_attention_classes: matchedAttentionClasses,
    matched_hazard_classes: matchedHazardClasses,
    normalized_score: null,
    source: {
      ...sourceMetadata({
        fallbackUsed: Boolean(layerResult.fallback_used),
        queriedAt,
        resolvedVersion: layerResult.resolved_version || null,
        serviceUrl,
      }),
      circuit_breaker: {
        cooldown_seconds: Math.round(CIRCUIT_COOLDOWN_MS / 1000),
        failure_threshold: CIRCUIT_FAILURE_THRESHOLD,
        open_layer_count: status === "circuit_open" ? 1 : 0,
        remote_concurrency_limit: REMOTE_CONCURRENCY_LIMIT,
      },
      freshness_status: assessmentComplete
        ? layerResult.observation?.freshness_status || "current"
        : lastKnownGood.length
          ? "stale_reference_available"
          : "unavailable",
      last_known_good_layers: lastKnownGood,
      layer_cache: {
        hit_count: layerResult.cache?.hit ? 1 : 0,
        miss_count: layerResult.cache?.hit ? 0 : 1,
        persistent_hit_count:
          layerResult.cache?.tier === "persistent" ? 1 : 0,
        ttl_seconds: Math.round(LAYER_CACHE_TTL_MS / 1000),
      },
      live_provider_status:
        ["memory_cache", "persistent_cache"].includes(observationMode)
          ? "not_queried_cache_hit"
          : status,
      observation_mode: observationMode,
      observed_at: layerResult.observation?.observed_at || null,
      persistent_cache: {
        enabled: Boolean(persistentCache),
        freshness_ttl_seconds: Math.round(PERSISTENT_CACHE_TTL_MS / 1000),
        last_known_good_max_age_seconds: Math.round(
          LAST_KNOWN_GOOD_MAX_AGE_MS / 1000
        ),
      },
      retry: {
        attempted_layer_count: Number(layerResult.attempts) > 1 ? 1 : 0,
        jitter_ratio: retryJitterRatio,
        max_attempts_per_layer: Number(layerResult.attempts) || 1,
      },
      wfs_version: DEFAULT_WFS_VERSION,
    },
    status,
  };
}
