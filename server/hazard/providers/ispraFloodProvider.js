import {
  FLOOD_PROVIDER_VERSION,
  highestFloodClass,
  ISPRA_FLOOD_LAYERS,
  floodExplanation,
} from "../normalizers/floodNormalizer.js";

const DEFAULT_WFS_URL = "https://sdi.isprambiente.it/geoserver/nz1/wfs";
const REQUEST_TIMEOUT_MS = 8000;
const BBOX_EPSILON_DEGREES = 0.00012;
const DEFAULT_WFS_VERSION = "2.0.0";
const FALLBACK_WFS_VERSION = "1.1.0";
const ERROR_PREVIEW_LENGTH = 500;
const VALID_JSON_CONTENT_TYPES = [
  "application/json",
  "application/geo+json",
  "application/vnd.geo+json",
];

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
  layerName,
  latitude,
  longitude,
  serviceUrl,
  version,
}) {
  const url = new URL(serviceUrl);
  const west = longitude - BBOX_EPSILON_DEGREES;
  const south = latitude - BBOX_EPSILON_DEGREES;
  const east = longitude + BBOX_EPSILON_DEGREES;
  const north = latitude + BBOX_EPSILON_DEGREES;

  url.searchParams.set("service", "WFS");
  url.searchParams.set("version", version);
  url.searchParams.set("request", "GetFeature");
  url.searchParams.set(version === "2.0.0" ? "typeNames" : "typeName", layerName);
  url.searchParams.set("outputFormat", "application/json");
  url.searchParams.set("srsName", "EPSG:4326");
  // ISPRA GeoServer honors EPSG:4326 axis order in this WFS context:
  // latitude,longitude. Sending longitude,latitude returns unrelated
  // geometries and can push the request past ARCUS' timeout.
  url.searchParams.set(
    "bbox",
    `${south},${west},${north},${east},EPSG:4326`
  );

  return url;
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

  return payload.features.some((feature) =>
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
      requested_version: DEFAULT_WFS_VERSION,
      resolved_version: version,
      url: requestUrl ? requestUrl.toString() : null,
    },
    requested_version: DEFAULT_WFS_VERSION,
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
        requested_version: DEFAULT_WFS_VERSION,
        resolved_version: version,
        url: requestUrl.toString(),
      },
      requested_version: DEFAULT_WFS_VERSION,
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

async function fetchLayer(params) {
  const primary = await fetchLayerVersion({
    ...params,
    version: DEFAULT_WFS_VERSION,
  });

  if (!["provider_exception", "configuration_error"].includes(primary.status)) {
    return primary;
  }

  const fallback = await fetchLayerVersion({
    ...params,
    version: FALLBACK_WFS_VERSION,
  });

  return {
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
    fetchImpl = globalThis.fetch,
    serviceUrl = DEFAULT_WFS_URL,
    timeoutMs = REQUEST_TIMEOUT_MS,
  } = {}
) {
  const validated = validateWgs84Point(point);

  if (!validated.ok) {
    return {
      confidence: "invalid_query",
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
        layers: ISPRA_FLOOD_LAYERS.map((layer) => layer.layerName),
        provider: "ISPRA",
        provider_version: FLOOD_PROVIDER_VERSION,
        queried_at: new Date().toISOString(),
        requested_version: DEFAULT_WFS_VERSION,
        resolved_version: null,
        fallback_used: false,
        service_type: "WFS",
        service_url: serviceUrl,
      },
      status: "invalid_coordinates",
    };
  }

  if (typeof fetchImpl !== "function") {
    return {
      confidence: "source_unavailable",
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
        layers: ISPRA_FLOOD_LAYERS.map((layer) => layer.layerName),
        provider: "ISPRA",
        provider_version: FLOOD_PROVIDER_VERSION,
        queried_at: new Date().toISOString(),
        requested_version: DEFAULT_WFS_VERSION,
        resolved_version: null,
        fallback_used: false,
        service_type: "WFS",
        service_url: serviceUrl,
      },
      status: "service_unreachable",
    };
  }

  const layerResults = await Promise.all(
    ISPRA_FLOOD_LAYERS.map((layer) =>
      fetchLayer({
        fetchImpl,
        latitude: validated.latitude,
        layer,
        longitude: validated.longitude,
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
  const sourceAvailableStatuses = ["available", "no_intersection", "partial"];
  const fallbackUsed = layerResults.some((item) => item.fallback_used);
  const resolvedVersions = [
    ...new Set(layerResults.map((item) => item.resolved_version).filter(Boolean)),
  ];

  return {
    confidence: sourceAvailableStatuses.includes(status)
      ? "source_available"
      : "source_unavailable",
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
      layers: ISPRA_FLOOD_LAYERS.map((layer) => layer.layerName),
      provider: "ISPRA",
      provider_version: FLOOD_PROVIDER_VERSION,
      queried_at: new Date().toISOString(),
      service_type: "WFS",
      service_url: serviceUrl,
      fallback_used: fallbackUsed,
      requested_version: DEFAULT_WFS_VERSION,
      resolved_version: resolvedVersions.length === 1 ? resolvedVersions[0] : resolvedVersions,
      wfs_version: DEFAULT_WFS_VERSION,
    },
    status,
  };
}
