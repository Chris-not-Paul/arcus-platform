import path from "node:path";
import { fileURLToPath } from "node:url";

export const rootDir = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  ".."
);

export const privateDataDir = process.env.ARCUS_PRIVATE_DATA_DIR
  ? path.resolve(process.env.ARCUS_PRIVATE_DATA_DIR)
  : path.join(rootDir, "private-data");

export const backupDir = process.env.ARCUS_BACKUP_DIR
  ? path.resolve(process.env.ARCUS_BACKUP_DIR)
  : path.join(rootDir, "backups");

export const authDataDir = path.join(
  privateDataDir,
  "auth"
);

export const usersFilePath = path.join(
  authDataDir,
  "users.json"
);

export const auditLogPath = path.join(
  authDataDir,
  "audit.log"
);

export const sessionsFilePath = path.join(
  authDataDir,
  "sessions.json"
);

export const accessRequestsFilePath = path.join(
  authDataDir,
  "access-requests.json"
);

export const passwordResetTokensFilePath = path.join(
  authDataDir,
  "password-reset-tokens.json"
);

export const emailOutboxFilePath = path.join(
  authDataDir,
  "email-outbox.json"
);

export const publicReleaseEndYear = 2025;

export const serverPort = Number(
  process.env.ARCUS_API_PORT || 4174
);

export const professionalUsername =
  process.env.ARCUS_PROFESSIONAL_USERNAME ||
  "arcus";

export const professionalPassword =
  process.env.ARCUS_PROFESSIONAL_PASSWORD ||
  "professional";

export const sessionMaxAgeSeconds = Number(
  process.env.ARCUS_SESSION_MAX_AGE_SECONDS ||
    60 * 60 * 8
);

export const loginRateLimitMaxAttempts = Number(
  process.env.ARCUS_LOGIN_RATE_LIMIT_MAX_ATTEMPTS ||
    5
);

export const loginRateLimitWindowMs = Number(
  process.env.ARCUS_LOGIN_RATE_LIMIT_WINDOW_MS ||
    5 * 60 * 1000
);

export const loginRateLimitLockMs = Number(
  process.env.ARCUS_LOGIN_RATE_LIMIT_LOCK_MS ||
    15 * 60 * 1000
);

export const professionalExportMaxEvents = Number(
  process.env.ARCUS_PROFESSIONAL_EXPORT_MAX_EVENTS || 25
);

export const databaseUrl = process.env.ARCUS_DATABASE_URL || "";

export const databaseSsl =
  process.env.ARCUS_DATABASE_SSL === "true";

export const defaultOrganizationSlug =
  process.env.ARCUS_DEFAULT_ORGANIZATION_SLUG || "arcus-local";

export const defaultOrganizationName =
  process.env.ARCUS_DEFAULT_ORGANIZATION_NAME || "ARCUS Local";

export const defaultOrganizationPlanRenewsAt =
  process.env.ARCUS_DEFAULT_ORGANIZATION_PLAN_RENEWS_AT || "";

export const allowedOrigins = String(
  process.env.ARCUS_ALLOWED_ORIGINS || ""
)
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

export const secureSessionCookie =
  process.env.ARCUS_COOKIE_SECURE === "true";

export const accessLogsEnabled =
  process.env.ARCUS_ACCESS_LOGS === "true";

export const appBaseUrl =
  process.env.ARCUS_APP_BASE_URL || "http://127.0.0.1:5173";

export const emailFromAddress =
  process.env.ARCUS_EMAIL_FROM || "ARCUS <no-reply@arcus.local>";

export const emailTransport =
  process.env.ARCUS_EMAIL_TRANSPORT || "outbox";

export const emailWebhookUrl =
  process.env.ARCUS_EMAIL_WEBHOOK_URL || "";

export const emailWebhookApiKey =
  process.env.ARCUS_EMAIL_WEBHOOK_API_KEY || "";

export const emailWebhookTimeoutMs = Number(
  process.env.ARCUS_EMAIL_WEBHOOK_TIMEOUT_MS || 8000
);

export const passwordResetTokenTtlMinutes = Number(
  process.env.ARCUS_PASSWORD_RESET_TOKEN_TTL_MINUTES || 30
);

export const backupRetentionDays = Number(
  process.env.ARCUS_BACKUP_RETENTION_DAYS || 30
);

export const backupRetentionCount = Number(
  process.env.ARCUS_BACKUP_RETENTION_COUNT || 20
);

export const backupFreshnessMaxAgeHours = Number(
  process.env.ARCUS_BACKUP_FRESHNESS_MAX_AGE_HOURS || 26
);

export function validateServerConfiguration() {
  const errors = [];
  const warnings = [];
  const isProduction = process.env.NODE_ENV === "production";

  if (!Number.isFinite(serverPort) || serverPort <= 0) {
    errors.push("ARCUS_API_PORT must be a positive number.");
  }

  if (
    !Number.isFinite(sessionMaxAgeSeconds) ||
    sessionMaxAgeSeconds <= 0
  ) {
    errors.push(
      "ARCUS_SESSION_MAX_AGE_SECONDS must be a positive number."
    );
  }

  if (
    !Number.isFinite(professionalExportMaxEvents) ||
    professionalExportMaxEvents < 1 ||
    professionalExportMaxEvents > 100
  ) {
    errors.push(
      "ARCUS_PROFESSIONAL_EXPORT_MAX_EVENTS must be between 1 and 100."
    );
  }

  if (isProduction && professionalPassword === "professional") {
    errors.push(
      "ARCUS_PROFESSIONAL_PASSWORD must be changed before production."
    );
  }

  if (isProduction && !databaseUrl) {
    errors.push(
      "ARCUS_DATABASE_URL is required in production so users, sessions, audit logs and quotas are not stored in local files."
    );
  }

  if (isProduction && professionalUsername === "arcus") {
    warnings.push(
      "ARCUS_PROFESSIONAL_USERNAME should be changed from the local default in production."
    );
  }

  if (isProduction && defaultOrganizationName === "ARCUS Local") {
    warnings.push(
      "ARCUS_DEFAULT_ORGANIZATION_NAME should identify the deployed organization in production."
    );
  }

  if (isProduction && !secureSessionCookie) {
    warnings.push(
      "ARCUS_COOKIE_SECURE should be true behind HTTPS in production."
    );
  }

  if (isProduction && !allowedOrigins.length) {
    warnings.push(
      "ARCUS_ALLOWED_ORIGINS should be constrained in production."
    );
  }

  if (isProduction && sessionMaxAgeSeconds > 60 * 60 * 24) {
    warnings.push(
      "ARCUS_SESSION_MAX_AGE_SECONDS is longer than 24 hours."
    );
  }

  if (
    !Number.isFinite(loginRateLimitMaxAttempts) ||
    loginRateLimitMaxAttempts < 1 ||
    loginRateLimitMaxAttempts > 50
  ) {
    errors.push(
      "ARCUS_LOGIN_RATE_LIMIT_MAX_ATTEMPTS must be between 1 and 50."
    );
  }

  if (
    !Number.isFinite(loginRateLimitWindowMs) ||
    loginRateLimitWindowMs < 1000
  ) {
    errors.push(
      "ARCUS_LOGIN_RATE_LIMIT_WINDOW_MS must be at least 1000."
    );
  }

  if (
    !Number.isFinite(loginRateLimitLockMs) ||
    loginRateLimitLockMs < 1000
  ) {
    errors.push(
      "ARCUS_LOGIN_RATE_LIMIT_LOCK_MS must be at least 1000."
    );
  }

  if (!Number.isFinite(passwordResetTokenTtlMinutes) ||
    passwordResetTokenTtlMinutes < 5 ||
    passwordResetTokenTtlMinutes > 240) {
    errors.push(
      "ARCUS_PASSWORD_RESET_TOKEN_TTL_MINUTES must be between 5 and 240."
    );
  }

  if (!["outbox", "webhook"].includes(emailTransport)) {
    errors.push(
      "ARCUS_EMAIL_TRANSPORT must be either outbox or webhook."
    );
  }

  if (emailTransport === "webhook" && !emailWebhookUrl) {
    errors.push(
      "ARCUS_EMAIL_WEBHOOK_URL is required when ARCUS_EMAIL_TRANSPORT=webhook."
    );
  }

  if (!Number.isFinite(emailWebhookTimeoutMs) ||
    emailWebhookTimeoutMs < 1000 ||
    emailWebhookTimeoutMs > 30000) {
    errors.push(
      "ARCUS_EMAIL_WEBHOOK_TIMEOUT_MS must be between 1000 and 30000."
    );
  }

  if (!Number.isFinite(backupRetentionDays) ||
    backupRetentionDays < 1 ||
    backupRetentionDays > 3650) {
    errors.push(
      "ARCUS_BACKUP_RETENTION_DAYS must be between 1 and 3650."
    );
  }

  if (!Number.isFinite(backupRetentionCount) ||
    backupRetentionCount < 1 ||
    backupRetentionCount > 500) {
    errors.push(
      "ARCUS_BACKUP_RETENTION_COUNT must be between 1 and 500."
    );
  }

  if (!Number.isFinite(backupFreshnessMaxAgeHours) ||
    backupFreshnessMaxAgeHours < 1 ||
    backupFreshnessMaxAgeHours > 24 * 30) {
    errors.push(
      "ARCUS_BACKUP_FRESHNESS_MAX_AGE_HOURS must be between 1 and 720."
    );
  }

  if (isProduction && emailTransport === "outbox") {
    warnings.push(
      "ARCUS_EMAIL_TRANSPORT is using the local outbox; configure a transactional email provider before production."
    );
  }

  if (isProduction && emailTransport === "webhook") {
    if (!emailWebhookUrl.startsWith("https://")) {
      warnings.push(
        "ARCUS_EMAIL_WEBHOOK_URL should use HTTPS in production."
      );
    }

    if (!emailWebhookApiKey) {
      warnings.push(
        "ARCUS_EMAIL_WEBHOOK_API_KEY should be configured in production."
      );
    }
  }

  if (errors.length) {
    const error = new Error(
      `Invalid ARCUS server configuration: ${errors.join(" ")}`
    );

    error.code = "invalid_server_configuration";
    throw error;
  }

  return warnings;
}
