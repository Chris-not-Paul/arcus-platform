const ERROR_PREVIEW_LENGTH = 500;
const VALID_JSON_CONTENT_TYPES = [
  "application/json",
  "application/geo+json",
  "application/vnd.geo+json",
];

export function buildWfsGetFeatureUrl({
  bbox,
  layerName,
  outputFormat = "application/json",
  requestCrs,
  serviceUrl,
  version,
}) {
  const url = new URL(serviceUrl);

  url.searchParams.set("service", "WFS");
  url.searchParams.set("version", version);
  url.searchParams.set("request", "GetFeature");
  url.searchParams.set(version === "2.0.0" ? "typeNames" : "typeName", layerName);
  url.searchParams.set("outputFormat", outputFormat);
  url.searchParams.set("srsName", requestCrs);
  url.searchParams.set("bbox", `${bbox.join(",")},${requestCrs}`);

  return url;
}

export function contentTypeOf(response) {
  return response?.headers?.get?.("content-type") || "";
}

export function previewText(text) {
  return String(text || "").slice(0, ERROR_PREVIEW_LENGTH);
}

export function hasJsonContentType(contentType) {
  const normalized = String(contentType || "").toLowerCase();

  return VALID_JSON_CONTENT_TYPES.some((item) =>
    normalized.includes(item)
  );
}

export function looksLikeXmlProviderException(text, contentType) {
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

export function layerStatusFromError(error) {
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

export function combinedStatus(layerResults) {
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
