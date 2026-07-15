import { fileURLToPath } from "node:url";

import {
  FLOOD_PROVIDER_VERSION,
} from "./normalizers/floodNormalizer.js";
import {
  LANDSLIDE_PROVIDER_VERSION,
} from "./normalizers/landslideNormalizer.js";

export const hazardBackendStartedAt = new Date().toISOString();
export const hazardBuildIdentifier =
  process.env.VITE_COMMIT_SHA ||
  process.env.GITHUB_SHA ||
  process.env.COMMIT_SHA ||
  "local-dev";

export const hazardRuntimeMetadata = Object.freeze({
  build_identifier: hazardBuildIdentifier,
  node_version: process.version,
  process_start_time: hazardBackendStartedAt,
  provider_versions: {
    hydraulic: FLOOD_PROVIDER_VERSION,
    landslide: LANDSLIDE_PROVIDER_VERSION,
  },
});

export function providerModulePath(importMetaUrl) {
  return fileURLToPath(importMetaUrl);
}

export function isHazardTraceEnabled() {
  return process.env.NODE_ENV === "development" ||
    process.env.ARCUS_HAZARD_TRACE === "true";
}

export function safeError(error) {
  if (!error) {
    return null;
  }

  return {
    code: error.code || null,
    content_type: error.content_type || error.contentType || null,
    http_status: error.http_status || error.httpStatus || null,
    message: error.message || String(error),
    name: error.name || "Error",
    retryable: error.retryable ?? true,
    stage: error.stage || null,
    ...(isHazardTraceEnabled() && error.stack
      ? { error_stack_development_only: error.stack }
      : {}),
    wfs_exception_code: error.wfs_exception_code || null,
    wfs_exception_text: error.wfs_exception_text || null,
  };
}

export function traceHazardStage({
  durationMs = null,
  error = null,
  hazard,
  latitude,
  longitude,
  providerVersion = null,
  requestId = "unknown",
  stage,
}) {
  if (!isHazardTraceEnabled()) {
    return;
  }

  const payload = {
    duration_ms: durationMs,
    error: safeError(error),
    hazard,
    latitude: Number.isFinite(Number(latitude)) ? Number(latitude) : null,
    longitude: Number.isFinite(Number(longitude)) ? Number(longitude) : null,
    provider_version: providerVersion,
    request_id: requestId,
    stage,
  };

  console.info(`[arcus-hazard-trace] ${JSON.stringify(payload)}`);
}
