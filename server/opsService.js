import {
  emailTransport,
} from "./config.js";
import { backupFreshnessStatus } from "./backupService.js";
import { databaseHealth, isDatabaseEnabled } from "./database.js";
import { getCurrentDataRelease } from "./dataReleaseService.js";
import { emailDeliveryStatus } from "./emailService.js";
import { requestStats } from "./observability.js";

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

  const status = aggregateStatus(checks);

  return {
    backup,
    checks,
    email,
    generatedAt: new Date().toISOString(),
    ok: status !== "critical",
    requestStats: requestStats(),
    status,
    storage,
  };
}

export function operationalGauges(status) {
  return {
    arcus_backup_age_seconds:
      status.backup.ageHours === null
        ? -1
        : Math.round(status.backup.ageHours * 60 * 60),
    arcus_backup_fresh:
      status.backup.ok ? 1 : 0,
    arcus_email_recent_failures:
      status.email?.failed || 0,
    arcus_operational_status:
      status.status === "ok" ? 1 : status.status === "warning" ? 0.5 : 0,
  };
}
