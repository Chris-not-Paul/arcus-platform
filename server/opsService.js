import {
  emailTransport,
} from "./config.js";
import { backupFreshnessStatus } from "./backupService.js";
import { databaseHealth, isDatabaseEnabled } from "./database.js";
import { getCurrentDataRelease } from "./dataReleaseService.js";
import { emailDeliveryStatus } from "./emailService.js";
import { requestStats } from "./observability.js";
import {
  hydraulicObservationStoreStatus,
} from "./hazard/hydraulicObservationStore.js";
import {
  landslideObservationStoreStatus,
} from "./hazard/landslideObservationStore.js";

function aggregateStatus(checks) {
  if (checks.some((check) => check.status === "critical")) {
    return "critical";
  }

  if (checks.some((check) => check.status === "warning")) {
    return "warning";
  }

  return "ok";
}

function check(status, key, message, details = {}) {
  return {
    details,
    key,
    message,
    status,
  };
}

export async function operationalStatus() {
  const checks = [];
  let storage = null;

  try {
    const health = await databaseHealth();

    storage = health.storage;
    checks.push(
      check("ok", "storage", `${health.storage} storage is reachable`, health)
    );
  } catch (error) {
    checks.push(
      check("critical", "storage", "Storage health check failed", {
        error: error.message,
      })
    );
  }

  const backup = await backupFreshnessStatus();

  checks.push(
    check(
      backup.ok ? "ok" : "warning",
      "backup_freshness",
      backup.ok
        ? "Latest backup is within the freshness window"
        : backup.latest
          ? "Latest backup is older than the freshness window"
          : "No ARCUS backup has been found",
      {
        ageHours: backup.ageHours,
        count: backup.count,
        latest: backup.latest,
        maxAgeHours: backup.maxAgeHours,
        status: backup.status,
      }
    )
  );

  try {
    const release = await getCurrentDataRelease();

    checks.push(
      check(
        release?.id ? "ok" : "warning",
        "data_release",
        release?.id
          ? "Active Professional data release is available"
          : "No active Professional data release was found",
        {
          id: release?.id || null,
          status: release?.status || null,
        }
      )
    );
  } catch (error) {
    checks.push(
      check("warning", "data_release", "Data release check failed", {
        error: error.message,
      })
    );
  }

  if (process.env.NODE_ENV === "production" && !isDatabaseEnabled()) {
    checks.push(
      check(
        "critical",
        "production_database",
        "Production requires PostgreSQL-backed persistence"
      )
    );
  }

  if (process.env.NODE_ENV === "production" && emailTransport === "outbox") {
    checks.push(
      check(
        "warning",
        "email_transport",
        "Production email transport is still set to local outbox"
      )
    );
  }

  const email = await emailDeliveryStatus();

  checks.push(
    check(
      email.failed ? "warning" : "ok",
      "email_delivery",
      email.failed
        ? "Recent transactional email failures were detected"
        : "No recent transactional email failures detected",
      email
    )
  );

  const hydraulicObservationStore =
    await hydraulicObservationStoreStatus();

  checks.push(
    check(
      hydraulicObservationStore.ok ? "ok" : "warning",
      "hydraulic_observation_store",
      hydraulicObservationStore.ok
        ? hydraulicObservationStore.observation_count
          ? "Hydraulic last-known-good observations are available"
          : "Hydraulic observation store is reachable and currently empty"
        : "Hydraulic observation store is unavailable",
      hydraulicObservationStore
    )
  );

  const landslideObservationStore =
    await landslideObservationStoreStatus();

  checks.push(
    check(
      landslideObservationStore.ok ? "ok" : "warning",
      "landslide_observation_store",
      landslideObservationStore.ok
        ? landslideObservationStore.observation_count
          ? "Landslide last-known-good observations are available"
          : "Landslide observation store is reachable and currently empty"
        : "Landslide observation store is unavailable",
      landslideObservationStore
    )
  );

  const status = aggregateStatus(checks);

  return {
    backup,
    checks,
    email,
    generatedAt: new Date().toISOString(),
    hydraulicObservationStore,
    landslideObservationStore,
    ok: status !== "critical",
    requestStats: requestStats(),
    status,
    storage,
  };
}

export function operationalGauges(status) {
  const latestHydraulicObservationMs = Date.parse(
    status.hydraulicObservationStore?.latest_observed_at || ""
  );
  const latestLandslideObservationMs = Date.parse(
    status.landslideObservationStore?.latest_observed_at || ""
  );

  return {
    arcus_backup_age_seconds:
      status.backup.ageHours === null
        ? -1
        : Math.round(status.backup.ageHours * 60 * 60),
    arcus_backup_fresh:
      status.backup.ok ? 1 : 0,
    arcus_email_recent_failures:
      status.email?.failed || 0,
    arcus_hydraulic_observation_age_seconds:
      Number.isFinite(latestHydraulicObservationMs)
        ? Math.max(
            0,
            Math.round((Date.now() - latestHydraulicObservationMs) / 1000)
          )
        : -1,
    arcus_hydraulic_observation_count:
      status.hydraulicObservationStore?.observation_count || 0,
    arcus_landslide_observation_age_seconds:
      Number.isFinite(latestLandslideObservationMs)
        ? Math.max(
            0,
            Math.round((Date.now() - latestLandslideObservationMs) / 1000)
          )
        : -1,
    arcus_landslide_observation_count:
      status.landslideObservationStore?.observation_count || 0,
    arcus_operational_status:
      status.status === "ok" ? 1 : status.status === "warning" ? 0.5 : 0,
  };
}
