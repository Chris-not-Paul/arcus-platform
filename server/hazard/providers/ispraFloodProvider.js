import {
  FLOOD_PROVIDER_VERSION,
  highestFloodClass,
  ISPRA_FLOOD_LAYERS,
  floodExplanation,
} from "../normalizers/floodNormalizer.js";
import {
  readHydraulicObservation,
  writeHydraulicObservation,
} from "../hydraulicObservationStore.js";

const DEFAULT_WFS_URL = "https://sdi.isprambiente.it/geoserver/nz1/wfs";
const ENDPOINT_IDENTIFIER = "ispra-nz1-wfs";
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
const SOURCE_DATASET_VERSION = null;
const ERROR_PREVIEW_LENGTH = 500;
const VALID_JSON_CONTENT_TYPES = [
  "application/json",
  "application/geo+json",
  "application/vnd.geo+json",
];
const layerCache = new Map();
const inFlightLayerRequests = new Map();
const circuitBreakers = new Map();
const remoteQueue = [];
let activeRemoteRequests = 0;

function normalizedCoordinate(value) {
  return Number(value).toFixed(5);
}

function layerCacheKey({
  latitude,
  layerName,
  longitude,
  serviceUrl,
}) {
  return [
    ENDPOINT_IDENTIFIER,
    serviceUrl,
    layerName,
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
    observation: {
      ...(hit.value.observation || {}),
      age_seconds: Math.round(ageMs / 1000),
      origin_mode: hit.value.observation?.mode || "live",
      mode: "memory_cache",
      retrieved_at: new Date().toISOString(),
    },
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
  };
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
  if (
    !observation ||
    observation.age_ms > LAST_KNOWN_GOOD_MAX_AGE_MS
  ) {
    return null;
  }

  return {
    age_seconds: Math.round(observation.age_ms / 1000),
    available: true,
    class_name: observation.result.className,
    freshness_status: freshnessStatus(observation.age_ms),
    intersects: Boolean(observation.result.intersects),
    observed_at: observation.observed_at,
    status: observation.result.status,
  };
}

async function readPersistentLayerObservation({
  directory,
  enabled,
  key,
  now,
}) {
  if (!enabled) {
    return null;
  }

  return readHydraulicObservation({
    cacheKey: key,
    directory,
    now,
  });
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
    return await writeHydraulicObservation({
      cacheKey: key,
      directory,
      observedAt: result.queried_at,
      result: persistableResult,
    });
  } catch {
    return false;
  }
}

function writeLayerCache(key, value) {
  layerCache.set(key, {
    createdAt: Date.now(),
    value,
  });

  while (layerCache.size > LAYER_CACHE_MAX_ITEMS) {
    const firstKey = layerCache.keys().next().value;

    layerCache.delete(firstKey);
  }
}

function cacheableLayerResult(result) {
  return ["available", "no_intersection"].includes(result?.status);
}

export function clearIspraFloodLayerCache() {
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

function circuitKey({ layer, serviceUrl }) {
  return `${serviceUrl}:${layer.layerName}`;
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

  const previous = circuitBreakers.get(key);
  const failures = Number(previous?.failures || 0) + 1;

  circuitBreakers.set(key, {
    failures,
    open_until:
      failures >= CIRCUIT_FAILURE_THRESHOLD
        ? now + CIRCUIT_COOLDOWN_MS
        : 0,
  });
}

function circuitOpenResult({
  layer,
  now,
  serviceUrl,
  state,
}) {
  const queriedAt = new Date(now).toISOString();

  return {
    ...errorPayload({
      className: layer.className,
      contentType: null,
      durationMs: 0,
      error: "circuit_open",
      httpStatus: null,
      httpStatusText: null,
      layerName: layer.layerName,
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

export function validateWgs84Point({ latitude, longitude }) {
  const lat = Number(latitude);
  const lon = Number(longitude);

  if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
    return {
      ok: false,
      error: "coordinates_not_numeric",
    };
  }

  if (lat < -90 || lat > 90 || lon < -180 || lon > 180) {
    return {
      ok: false,
      error: "coordinates_out_of_range",
    };
  }

  return {
    latitude: lat,
    longitude: lon,
    ok: true,
  };
}

function urlForLayer({
  attributeName,
  geometryName,
  layerName,
  latitude,
  longitude,
  serviceUrl,
  version,
}) {
  const url = new URL(serviceUrl);

  url.searchParams.set("service", "WFS");
  url.searchParams.set("version", version);
  url.searchParams.set("request", "GetFeature");
  url.searchParams.set(version === "2.0.0" ? "typeNames" : "typeName", layerName);
  url.searchParams.set("outputFormat", "application/json");
  url.searchParams.set("srsName", REQUEST_CRS);
  url.searchParams.set(version === "2.0.0" ? "count" : "maxFeatures", "1");
  url.searchParams.set("propertyName", attributeName);
  // ECQL honors the explicit SRID and longitude/latitude point order.
  // propertyName omits the very large polygon geometry from the response.
  url.searchParams.set(
    "CQL_FILTER",
    `INTERSECTS(${geometryName},SRID=4326;POINT(${longitude} ${latitude}))`
  );

  return url;
}

function requestMetadata({ attributeName, geometryName, layerName } = {}) {
  const classSuffix = String(layerName || "").match(/_p([123])$/i)?.[1];
  const resolvedAttributeName =
    attributeName || (classSuffix ? `scenariop${classSuffix}` : null);
  const resolvedGeometryName =
    geometryName || (layerName ? "geom" : null);

  return {
    endpoint_identifier: ENDPOINT_IDENTIFIER,
    filter_axis_order: FILTER_AXIS_ORDER,
    filter_crs: FILTER_CRS,
    filter_geometry_property: resolvedGeometryName,
    query_method: QUERY_METHOD,
    request_crs: REQUEST_CRS,
    response_property: resolvedAttributeName,
  };
}

function sourceMetadata({
  fallbackUsed = false,
  queriedAt,
  resolvedVersion,
  serviceUrl,
}) {
  return {
    endpoint_identifier: ENDPOINT_IDENTIFIER,
    filter_axis_order: FILTER_AXIS_ORDER,
    filter_crs: FILTER_CRS,
    query_method: QUERY_METHOD,
    fallback_used: fallbackUsed,
    layers: ISPRA_FLOOD_LAYERS.map((layer) => layer.layerName),
    provider: "ISPRA",
    provider_version: FLOOD_PROVIDER_VERSION,
    queried_at: queriedAt,
    request_crs: REQUEST_CRS,
    requested_version: DEFAULT_WFS_VERSION,
    resolved_version: resolvedVersion,
    service_type: SERVICE_TYPE,
    service_url: serviceUrl,
    source_dataset_version: SOURCE_DATASET_VERSION,
  };
}

function pointOnSegment(point, start, end) {
  const minX = Math.min(start[0], end[0]);
  const maxX = Math.max(start[0], end[0]);
  const minY = Math.min(start[1], end[1]);
  const maxY = Math.max(start[1], end[1]);

  if (
    point[0] < minX - 1e-10 ||
    point[0] > maxX + 1e-10 ||
    point[1] < minY - 1e-10 ||
    point[1] > maxY + 1e-10
  ) {
    return false;
  }

  const cross =
    (point[1] - start[1]) * (end[0] - start[0]) -
    (point[0] - start[0]) * (end[1] - start[1]);

  if (Math.abs(cross) > 1e-10) {
    return false;
  }

  const dot =
    (point[0] - start[0]) * (end[0] - start[0]) +
    (point[1] - start[1]) * (end[1] - start[1]);

  if (dot < 0) {
    return false;
  }

  const squaredLength =
    (end[0] - start[0]) ** 2 + (end[1] - start[1]) ** 2;

  return dot <= squaredLength;
}

function pointInRing(point, ring) {
  let inside = false;

  for (let index = 0, previous = ring.length - 1; index < ring.length; previous = index, index += 1) {
    const currentPoint = ring[index];
    const previousPoint = ring[previous];

    if (pointOnSegment(point, previousPoint, currentPoint)) {
      return true;
    }

    const intersects =
      currentPoint[1] > point[1] !== previousPoint[1] > point[1] &&
      point[0] <
        ((previousPoint[0] - currentPoint[0]) *
          (point[1] - currentPoint[1])) /
          (previousPoint[1] - currentPoint[1]) +
          currentPoint[0];

    if (intersects) {
      inside = !inside;
    }
  }

  return inside;
}

function pointInPolygon(point, polygon) {
  if (!Array.isArray(polygon?.[0])) {
    return false;
  }

  if (!pointInRing(point, polygon[0])) {
    return false;
  }

  return !polygon
    .slice(1)
    .some((hole) => pointInRing(point, hole));
}

function geometryIntersectsPoint(geometry, point) {
  if (!geometry || !geometry.type) {
    return false;
  }

  if (geometry.type === "Polygon") {
    return pointInPolygon(point, geometry.coordinates);
  }

  if (geometry.type === "MultiPolygon") {
    return geometry.coordinates.some((polygon) =>
      pointInPolygon(point, polygon)
    );
  }

  if (geometry.type === "GeometryCollection") {
    return (geometry.geometries || []).some((item) =>
      geometryIntersectsPoint(item, point)
    );
  }

  return false;
}

function featureCollectionIntersectsPoint(payload, point) {
  if (payload?.type !== "FeatureCollection" || !Array.isArray(payload.features)) {
    const error = new Error("invalid_geojson");

    error.code = "invalid_geojson";
    throw error;
  }

  if (!payload.features.length) {
    return false;
  }

  const featuresWithGeometry = payload.features.filter(
    (feature) => feature?.geometry
  );

  // The production query is already spatially filtered by GeoServer and asks
  // only for a small scenario attribute. GeoJSON therefore carries
  // geometry:null. Retain local point-in-polygon verification whenever a test,
  // compatible endpoint or fallback response includes geometry.
  if (!featuresWithGeometry.length) {
    return true;
  }

  return featuresWithGeometry.some((feature) =>
    geometryIntersectsPoint(feature.geometry, point)
  );
}

function contentTypeOf(response) {
  return response?.headers?.get?.("content-type") || "";
}

function previewText(text) {
  return String(text || "").slice(0, ERROR_PREVIEW_LENGTH);
}

function hasJsonContentType(contentType) {
  const normalized = String(contentType || "").toLowerCase();

  return VALID_JSON_CONTENT_TYPES.some((item) =>
    normalized.includes(item)
  );
}

function looksLikeXmlProviderException(text, contentType) {
  const normalizedContentType = String(contentType || "").toLowerCase();
  const body = String(text || "");

  if (
    !normalizedContentType.includes("xml") &&
    !body.trim().startsWith("<")
  ) {
    return false;
  }

  return /ExceptionReport|ServiceException|ExceptionText|ows:Exception/i.test(
    body
  );
}

function errorPayload({
  className,
  contentType,
  durationMs,
  error,
  httpStatus,
  httpStatusText,
  layerName,
  queriedAt,
  requestUrl,
  status,
  version,
}) {
  return {
    className,
    content_type: contentType || null,
    duration_ms: durationMs,
    error: error || status,
    fallback_used: false,
    feature_count: null,
    http_status: httpStatus || null,
    http_status_text: httpStatusText || null,
    intersects: false,
    layer: layerName,
    queried_at: queriedAt,
    request: {
      method: "GET",
      ...requestMetadata({ layerName }),
      requested_version: DEFAULT_WFS_VERSION,
      resolved_version: version,
      url: requestUrl ? requestUrl.toString() : null,
    },
    requested_version: DEFAULT_WFS_VERSION,
    response_size_bytes: null,
    resolved_version: version,
    status,
  };
}

function layerStatusFromError(error) {
  if (error?.name === "AbortError") {
    return "request_timeout";
  }

  if (
    error instanceof SyntaxError ||
    error?.code === "invalid_geojson" ||
    error?.code === "empty_response"
  ) {
    return "invalid_response";
  }

  if (error instanceof TypeError) {
    return "service_unreachable";
  }

  return "service_unreachable";
}

async function fetchLayerVersion({
  fetchImpl,
  latitude,
  layer,
  longitude,
  serviceUrl,
  timeoutMs,
  version,
}) {
  const queriedAt = new Date().toISOString();
  const controller = new AbortController();
  const startedAt = Date.now();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  let requestUrl;

  try {
    requestUrl = urlForLayer({
      attributeName: layer.attributeName,
      geometryName: layer.geometryName,
      latitude,
      layerName: layer.layerName,
      longitude,
      serviceUrl,
      version,
    });

    const response = await fetchImpl(requestUrl, {
      headers: {
        Accept: "application/json, application/geo+json",
      },
      signal: controller.signal,
    });
    const durationMs = Date.now() - startedAt;
    const contentType = contentTypeOf(response);

    if (!response.ok) {
      let bodyPreview = "";

      try {
        bodyPreview = previewText(await response.text());
      } catch {
        bodyPreview = "";
      }

      return {
        ...errorPayload({
          className: layer.className,
          contentType,
          durationMs,
          error: `http_${response.status}`,
          httpStatus: response.status,
          httpStatusText: response.statusText,
          layerName: layer.layerName,
          queriedAt,
          requestUrl,
          status: "http_error",
          version,
        }),
        response_preview: bodyPreview,
      };
    }

    const text = await response.text();

    if (looksLikeXmlProviderException(text, contentType)) {
      return {
        ...errorPayload({
          className: layer.className,
          contentType,
          durationMs,
          error: "provider_exception",
          httpStatus: response.status,
          httpStatusText: response.statusText,
          layerName: layer.layerName,
          queriedAt,
          requestUrl,
          status: "provider_exception",
          version,
        }),
        response_preview: previewText(text),
      };
    }

    if (!hasJsonContentType(contentType)) {
      return {
        ...errorPayload({
          className: layer.className,
          contentType,
          durationMs,
          error: "unexpected_content_type",
          httpStatus: response.status,
          httpStatusText: response.statusText,
          layerName: layer.layerName,
          queriedAt,
          requestUrl,
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
    const intersects = featureCollectionIntersectsPoint(
      geojson,
      [longitude, latitude]
    );
    const featureCount = Array.isArray(geojson.features)
      ? geojson.features.length
      : null;

    return {
      className: layer.className,
      content_type: contentType,
      duration_ms: durationMs,
      fallback_used: false,
      feature_count: featureCount,
      http_status: response.status,
      http_status_text: response.statusText,
      intersects,
      layer: layer.layerName,
      queried_at: queriedAt,
      request: {
        method: "GET",
        ...requestMetadata({
          attributeName: layer.attributeName,
          geometryName: layer.geometryName,
        }),
        requested_version: DEFAULT_WFS_VERSION,
        resolved_version: version,
        url: requestUrl.toString(),
      },
      requested_version: DEFAULT_WFS_VERSION,
      observation: {
        age_seconds: 0,
        freshness_status: "current",
        mode: "live",
        observed_at: queriedAt,
        retrieved_at: queriedAt,
      },
      response_size_bytes: new TextEncoder().encode(text).byteLength,
      resolved_version: version,
      status: intersects ? "available" : "no_intersection",
    };
  } catch (error) {
    const durationMs = Date.now() - startedAt;

    return {
      ...errorPayload({
        className: layer.className,
        contentType: null,
        durationMs,
        error: error?.message || "request_failed",
        httpStatus: null,
        httpStatusText: null,
        layerName: layer.layerName,
        queriedAt,
        requestUrl,
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
  if (["request_timeout", "service_unreachable"].includes(result?.status)) {
    return true;
  }

  return result?.status === "http_error" &&
    [502, 503, 504].includes(Number(result.http_status));
}

function wait(milliseconds) {
  if (!milliseconds) {
    return Promise.resolve();
  }

  return new Promise((resolve) => setTimeout(resolve, milliseconds));
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

async function fetchLayer({
  nowImpl,
  ...params
}) {
  const key = circuitKey(params);
  const now = nowImpl();
  const openCircuit = circuitState(key, now);

  if (openCircuit) {
    return circuitOpenResult({
      layer: params.layer,
      now,
      serviceUrl: params.serviceUrl,
      state: openCircuit,
    });
  }

  const primary = await fetchLayerVersionWithRetry({
    ...params,
    version: DEFAULT_WFS_VERSION,
  });

  if (!["provider_exception", "configuration_error"].includes(primary.status)) {
    recordCircuitResult(key, primary, nowImpl());

    return primary;
  }

  const fallback = await fetchLayerVersionWithRetry({
    ...params,
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
  layer,
  longitude,
  nowImpl,
  persistentCache,
  persistentCacheDir,
  serviceUrl,
  ...params
}) {
  const key = layerCacheKey({
    latitude,
    layerName: layer.layerName,
    longitude,
    serviceUrl,
  });
  const cached = bypassCache ? null : readLayerCache(key);

  if (cached) {
    return cached;
  }

  const persistentObservation = bypassCache
    ? null
    : await readPersistentLayerObservation({
        directory: persistentCacheDir,
        enabled: persistentCache,
        key,
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
    layer,
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

function combinedStatus(layerResults) {
  const statuses = layerResults.map((item) => item.status);
  const usableStatuses = ["available", "no_intersection"];
  const hasAvailable = statuses.includes("available");
  const hasNoIntersection = statuses.includes("no_intersection");
  const hasError = statuses.some((status) => !usableStatuses.includes(status));

  if (hasError && (hasAvailable || hasNoIntersection)) {
    return "partial";
  }

  if (hasAvailable) {
    return "available";
  }

  if (statuses.every((status) => status === "no_intersection")) {
    return "no_intersection";
  }

  if (statuses.every((status) => status === statuses[0])) {
    return statuses[0];
  }

  return "partial";
}

export async function queryIspraFloodExposure(
  point,
  {
    bypassCache = false,
    fetchImpl = globalThis.fetch,
    nowImpl = Date.now,
    persistentCache = true,
    persistentCacheDir,
    randomImpl = Math.random,
    retryAttempts = DEFAULT_RETRY_ATTEMPTS,
    retryDelayMs = DEFAULT_RETRY_DELAY_MS,
    retryJitterRatio = DEFAULT_RETRY_JITTER_RATIO,
    serviceUrl = DEFAULT_WFS_URL,
    timeoutMs = REQUEST_TIMEOUT_MS,
  } = {}
) {
  const validated = validateWgs84Point(point);

  if (!validated.ok) {
    return {
      confidence: "invalid_query",
      assessment_complete: false,
      decision_status: "invalid_coordinates",
      explanation: [
        "The hydraulic exposure query was not executed because the coordinates are invalid.",
      ],
      highest_class: null,
      intersects_p1: false,
      intersects_p2: false,
      intersects_p3: false,
      matched_classes: [],
      normalized_score: null,
      source: {
        ...sourceMetadata({
          queriedAt: new Date().toISOString(),
          resolvedVersion: null,
          serviceUrl,
        }),
        resolved_version: null,
        fallback_used: false,
      },
      status: "invalid_coordinates",
    };
  }

  if (typeof fetchImpl !== "function") {
    return {
      confidence: "source_unavailable",
      assessment_complete: false,
      decision_status: "service_unreachable",
      explanation: [
        "The hydraulic exposure service is not available in this runtime.",
      ],
      highest_class: null,
      intersects_p1: false,
      intersects_p2: false,
      intersects_p3: false,
      matched_classes: [],
      normalized_score: null,
      source: {
        ...sourceMetadata({
          queriedAt: new Date().toISOString(),
          resolvedVersion: null,
          serviceUrl,
        }),
        resolved_version: null,
        fallback_used: false,
      },
      status: "service_unreachable",
    };
  }

  const layerResults = await Promise.all(
    ISPRA_FLOOD_LAYERS.map((layer) =>
      fetchLayerResilient({
        bypassCache,
        fetchImpl,
        latitude: validated.latitude,
        layer,
        longitude: validated.longitude,
        nowImpl,
        persistentCache,
        persistentCacheDir,
        randomImpl,
        retryAttempts,
        retryDelayMs,
        retryJitterRatio,
        serviceUrl,
        timeoutMs,
      })
    )
  );
  const matchedClasses = layerResults
    .filter((item) => item.status === "available" && item.intersects)
    .map((item) => item.className);
  const highestClass = highestFloodClass(matchedClasses);
  const status = combinedStatus(layerResults);
  const usableLayerStatuses = new Set(["available", "no_intersection"]);
  const failedLayers = layerResults
    .filter((item) => !usableLayerStatuses.has(item.status))
    .map((item) => ({
      class_name: item.className,
      error: item.error || item.status,
      http_status: item.http_status || null,
      status: item.status,
    }));
  const successfulLayers = layerResults
    .filter((item) => usableLayerStatuses.has(item.status))
    .map((item) => ({
      class_name: item.className,
      intersects: Boolean(item.intersects),
      status: item.status,
    }));
  const assessmentComplete = failedLayers.length === 0;
  const decisionStatus = assessmentComplete
    ? matchedClasses.length
      ? "available_complete"
      : "no_intersection"
    : matchedClasses.length
      ? "available_partial"
      : "source_incomplete";
  const sourceAvailableStatuses = ["available", "no_intersection", "partial"];
  const fallbackUsed = layerResults.some((item) => item.fallback_used);
  const resolvedVersions = [
    ...new Set(layerResults.map((item) => item.resolved_version).filter(Boolean)),
  ];
  const resolvedVersion =
    resolvedVersions.length === 1 ? resolvedVersions[0] : resolvedVersions;
  const queriedAt = new Date().toISOString();
  const observationModes = [
    ...new Set(
      layerResults
        .map((item) => item.observation?.mode)
        .filter(Boolean)
    ),
  ];
  const lastKnownGoodLayers = layerResults
    .filter((item) => item.last_known_good)
    .map((item) => item.last_known_good);
  const observedAtValues = layerResults
    .map((item) => item.observation?.observed_at)
    .filter(Boolean)
    .sort();
  const aggregateFreshnessStatus = assessmentComplete
    ? layerResults.every(
        (item) => item.observation?.freshness_status === "current"
      )
      ? "current"
      : "mixed"
    : lastKnownGoodLayers.length
      ? "stale_reference_available"
      : "unavailable";

  return {
    assessment_complete: assessmentComplete,
    confidence: sourceAvailableStatuses.includes(status)
      ? "source_available"
      : "source_unavailable",
    coverage: {
      failed_layer_count: failedLayers.length,
      failed_layers: failedLayers,
      requested_layer_count: ISPRA_FLOOD_LAYERS.length,
      successful_layer_count: successfulLayers.length,
      successful_layers: successfulLayers,
    },
    decision_status: decisionStatus,
    explanation: sourceAvailableStatuses.includes(status)
        ? floodExplanation({
            highestClass,
            matchedClasses,
          })
        : [
            "The ISPRA WFS source could not be used for this query.",
            "ARCUS does not convert source unavailability into zero hazard.",
          ],
    highest_class: highestClass,
    intersects_p1: matchedClasses.includes("P1"),
    intersects_p2: matchedClasses.includes("P2"),
    intersects_p3: matchedClasses.includes("P3"),
    layer_results: layerResults,
    matched_classes: matchedClasses,
    normalized_score: null,
    source: {
      ...sourceMetadata({
        fallbackUsed,
        queriedAt,
        resolvedVersion,
        serviceUrl,
      }),
      layer_cache: {
        hit_count: layerResults.filter((item) => item.cache?.hit).length,
        miss_count: layerResults.filter((item) => !item.cache?.hit).length,
        persistent_hit_count: layerResults.filter(
          (item) => item.cache?.tier === "persistent"
        ).length,
        ttl_seconds: Math.round(LAYER_CACHE_TTL_MS / 1000),
      },
      last_known_good_layers: lastKnownGoodLayers,
      freshness_status: aggregateFreshnessStatus,
      live_provider_status:
        observationModes.every(
          (mode) => ["memory_cache", "persistent_cache"].includes(mode)
        )
          ? "not_queried_cache_hit"
          : status,
      observation_mode:
        observationModes.length === 1
          ? observationModes[0]
          : observationModes.length
            ? "mixed"
            : "unavailable",
      observed_at: observedAtValues[0] || null,
      persistent_cache: {
        enabled: Boolean(persistentCache),
        freshness_ttl_seconds: Math.round(PERSISTENT_CACHE_TTL_MS / 1000),
        last_known_good_max_age_seconds: Math.round(
          LAST_KNOWN_GOOD_MAX_AGE_MS / 1000
        ),
      },
      retry: {
        attempted_layer_count: layerResults.filter(
          (item) => Number(item.attempts) > 1
        ).length,
        max_attempts_per_layer: Math.max(
          ...layerResults.map((item) => Number(item.attempts) || 1)
        ),
        jitter_ratio: retryJitterRatio,
      },
      circuit_breaker: {
        cooldown_seconds: Math.round(CIRCUIT_COOLDOWN_MS / 1000),
        failure_threshold: CIRCUIT_FAILURE_THRESHOLD,
        open_layer_count: layerResults.filter(
          (item) => item.status === "circuit_open"
        ).length,
        remote_concurrency_limit: REMOTE_CONCURRENCY_LIMIT,
      },
      wfs_version: DEFAULT_WFS_VERSION,
    },
    status,
  };
}
