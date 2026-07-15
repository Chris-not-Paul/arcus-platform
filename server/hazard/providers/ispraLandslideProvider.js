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
  buildWfsGetFeatureUrl,
  combinedStatus,
  contentTypeOf,
  hasJsonContentType,
  layerStatusFromError,
  looksLikeXmlProviderException,
  previewText,
} from "../shared/ogcWfsClient.js";
import {
  providerModulePath,
  traceHazardStage,
} from "../hazardTrace.js";

const DEFAULT_WFS_URL = "https://idrogeo.isprambiente.it/geoserver/idrogeo/ows";
const DEFAULT_WMS_URL = "https://idrogeo.isprambiente.it/geoserver/idrogeo/wms";
const ENDPOINT_IDENTIFIER = "idrogeo-pai-landslide-wfs";
const REQUEST_TIMEOUT_MS = 15000;
const BBOX_EPSILON_DEGREES = 0.00012;
const DEFAULT_WFS_VERSION = "2.0.0";
const FALLBACK_WFS_VERSION = "1.1.0";
const REQUEST_CRS = "EPSG:4326";
const BBOX_AXIS_ORDER = "longitude_latitude";
const BBOX_PARAMETER_ORDER = "west_south_east_north";
const SERVICE_TYPE = "WFS";
const SOURCE_NAME = "Mosaicatura della pericolosita da frana PAI";
const SOURCE_DATASET_VERSION = "5.0";
const SOURCE_REFERENCE_YEAR = 2024;
const SOURCE_MATCHES_LATEST_OFFICIAL_RELEASE = true;
const LICENCE = "See IdroGEO terms of service and open-data licence";
const CLASS_ATTRIBUTE = "cod_per_it";
const LAYER = {
  classAttribute: CLASS_ATTRIBUTE,
  layerName: "idrogeo:pericolosita_frane",
};
export const LANDSLIDE_PROVIDER_MODULE_PATH = providerModulePath(import.meta.url);

function bboxForPoint({ latitude, longitude }) {
  return [
    longitude - BBOX_EPSILON_DEGREES,
    latitude - BBOX_EPSILON_DEGREES,
    longitude + BBOX_EPSILON_DEGREES,
    latitude + BBOX_EPSILON_DEGREES,
  ];
}

function urlForLayer({
  latitude,
  longitude,
  serviceUrl,
  version,
}) {
  return buildWfsGetFeatureUrl({
    bbox: bboxForPoint({ latitude, longitude }),
    layerName: LAYER.layerName,
    requestCrs: REQUEST_CRS,
    serviceUrl,
    version,
  });
}

function requestMetadata() {
  return {
    analysis_mode: "point_intersection",
    bbox_axis_order: BBOX_AXIS_ORDER,
    bbox_parameter_order: BBOX_PARAMETER_ORDER,
    endpoint_identifier: ENDPOINT_IDENTIFIER,
    request_crs: REQUEST_CRS,
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
    bbox_axis_order: BBOX_AXIS_ORDER,
    bbox_parameter_order: BBOX_PARAMETER_ORDER,
    class_attribute: CLASS_ATTRIBUTE,
    endpoint_identifier: ENDPOINT_IDENTIFIER,
    fallback_used: fallbackUsed,
    layers: [LAYER.layerName],
    licence: LICENCE,
    provider: "ISPRA",
    provider_version: LANDSLIDE_PROVIDER_VERSION,
    queried_at: queriedAt,
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
    resolved_version: version,
    stage: stage || null,
    status,
  };
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
  const matchedHazardClasses = [
    ...new Set(matched.filter((item) => item !== "AA")),
  ];
  const matchedAttentionClasses = [
    ...new Set(matched.filter((item) => item === "AA")),
  ];

  return {
    matchedAttentionClasses,
    matchedHazardClasses,
    unknownValues,
  };
}

async function fetchLayerVersion({
  fetchImpl,
  latitude,
  longitude,
  requestId = "unknown",
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
      durationMs: Date.now() - startedAt,
      hazard: "landslide",
      latitude,
      longitude,
      providerVersion: LANDSLIDE_PROVIDER_VERSION,
      requestId,
      stage: "request_built",
    });

    currentStage = "fetch_started";
    traceHazardStage({
      durationMs: Date.now() - startedAt,
      hazard: "landslide",
      latitude,
      longitude,
      providerVersion: LANDSLIDE_PROVIDER_VERSION,
      requestId,
      stage: "fetch_started",
    });
    const response = await fetchImpl(requestUrl, {
      headers: {
        Accept: "application/json, application/geo+json",
      },
      signal: controller.signal,
    });
    const durationMs = Date.now() - startedAt;
    const contentType = contentTypeOf(response);
    currentStage = "response_received";
    traceHazardStage({
      durationMs,
      hazard: "landslide",
      latitude,
      longitude,
      providerVersion: LANDSLIDE_PROVIDER_VERSION,
      requestId,
      stage: "response_received",
    });

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
    traceHazardStage({
      durationMs: Date.now() - startedAt,
      hazard: "landslide",
      latitude,
      longitude,
      providerVersion: LANDSLIDE_PROVIDER_VERSION,
      requestId,
      stage: "response_parsed",
    });
    currentStage = "geometry_processed";
    const intersectingFeatures = featureCollectionIntersections(
      geojson,
      [longitude, latitude]
    );
    traceHazardStage({
      durationMs: Date.now() - startedAt,
      hazard: "landslide",
      latitude,
      longitude,
      providerVersion: LANDSLIDE_PROVIDER_VERSION,
      requestId,
      stage: "geometry_processed",
    });
    const featureCount = Array.isArray(geojson.features)
      ? geojson.features.length
      : null;
    currentStage = "class_normalized";
    const {
      matchedAttentionClasses,
      matchedHazardClasses,
      unknownValues,
    } = classesFromFeatures(intersectingFeatures);
    traceHazardStage({
      durationMs: Date.now() - startedAt,
      hazard: "landslide",
      latitude,
      longitude,
      providerVersion: LANDSLIDE_PROVIDER_VERSION,
      requestId,
      stage: "class_normalized",
    });
    const intersects =
      matchedHazardClasses.length > 0 ||
      matchedAttentionClasses.length > 0;
    const status =
      unknownValues.length && !intersects
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
      feature_count: featureCount,
      http_status: response.status,
      http_status_text: response.statusText,
      intersects,
      layer: LAYER.layerName,
      matched_attention_classes: matchedAttentionClasses,
      matched_hazard_classes: matchedHazardClasses,
      queried_at: queriedAt,
      request: {
        method: "GET",
        ...requestMetadata(),
        requested_version: DEFAULT_WFS_VERSION,
        resolved_version: version,
        url: requestUrl.toString(),
      },
      requested_version: DEFAULT_WFS_VERSION,
      resolved_version: version,
      stage: "class_normalized",
      status,
      unknown_class_values: unknownValues,
    };
  } catch (error) {
    const durationMs = Date.now() - startedAt;

    return {
      ...errorPayload({
        contentType: null,
        durationMs,
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

export async function queryIspraLandslideExposure(point, options = {}) {
  const optionsShapeValid =
    options === undefined ||
    (options !== null && typeof options === "object" && !Array.isArray(options));
  const safeOptions = optionsShapeValid ? options || {} : {};
  const {
    fetchImpl = globalThis.fetch,
    requestId = "unknown",
    serviceUrl = DEFAULT_WFS_URL,
    timeoutMs = REQUEST_TIMEOUT_MS,
  } = safeOptions;
  const pointShapeValid =
    point !== null && typeof point === "object" && !Array.isArray(point);
  const providerStartedAt = Date.now();
  traceHazardStage({
    hazard: "landslide",
    latitude: point?.latitude,
    longitude: point?.longitude,
    providerVersion: LANDSLIDE_PROVIDER_VERSION,
    requestId,
    stage: "provider_entered",
  });
  const validated = pointShapeValid && optionsShapeValid
    ? validateWgs84Point(point)
    : { ok: false };
  traceHazardStage({
    durationMs: Date.now() - providerStartedAt,
    hazard: "landslide",
    latitude: point?.latitude,
    longitude: point?.longitude,
    providerVersion: LANDSLIDE_PROVIDER_VERSION,
    requestId,
    stage: "coordinates_validated",
  });

  if (!validated.ok) {
    const attemptedAt = new Date().toISOString();
    const signatureMismatch = !pointShapeValid || !optionsShapeValid;

    return {
      attempted_at: attemptedAt,
      attention_area: false,
      confidence: "invalid_query",
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
        fallback_used: false,
        resolved_version: null,
      },
      status: "invalid_coordinates",
    };
  }

  if (typeof fetchImpl !== "function") {
    return {
      attention_area: false,
      confidence: "source_unavailable",
      explanation: [
        "The landslide exposure service is not available in this runtime.",
      ],
      highest_hazard_class: null,
      matched_attention_classes: [],
      matched_hazard_classes: [],
      normalized_score: null,
      source: {
        ...sourceMetadata({
          queriedAt: new Date().toISOString(),
          resolvedVersion: null,
          serviceUrl,
        }),
        fallback_used: false,
        resolved_version: null,
      },
      status: "service_unreachable",
    };
  }

  const layerResult = await fetchLayer({
    fetchImpl,
    latitude: validated.latitude,
    longitude: validated.longitude,
    requestId,
    serviceUrl,
    timeoutMs,
  });
  const matchedHazardClasses = layerResult.matched_hazard_classes || [];
  const matchedAttentionClasses = layerResult.matched_attention_classes || [];
  const highestHazardClass =
    highestLandslideHazardClass(matchedHazardClasses);
  const status = combinedStatus([layerResult]);
  const sourceAvailableStatuses = ["available", "no_intersection", "partial"];
  const fallbackUsed = Boolean(layerResult.fallback_used);
  const queriedAt = new Date().toISOString();

  return {
    attention_area: matchedAttentionClasses.length > 0,
    confidence: sourceAvailableStatuses.includes(status)
      ? "source_available"
      : "source_unavailable",
    explanation: landslideExplanation({
      attentionArea: matchedAttentionClasses.length > 0,
      highestHazardClass,
      matchedAttentionClasses,
      matchedHazardClasses,
      status,
    }),
    highest_hazard_class: highestHazardClass,
    layer_results: [layerResult],
    matched_attention_classes: matchedAttentionClasses,
    matched_hazard_classes: matchedHazardClasses,
    normalized_score: null,
    source: {
      ...sourceMetadata({
        fallbackUsed,
        queriedAt,
        resolvedVersion: layerResult.resolved_version || null,
        serviceUrl,
      }),
      wfs_version: DEFAULT_WFS_VERSION,
    },
    status,
  };
}
