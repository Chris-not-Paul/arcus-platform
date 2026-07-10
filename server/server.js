import http from "node:http";
import crypto from "node:crypto";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  accessLogsEnabled,
  allowedOrigins,
  secureSessionCookie,
  serverPort,
  validateServerConfiguration,
} from "./config.js";
import {
  authenticateCredentials,
  clearSessionCookie,
  createSession,
  destroySession,
  getRequestSession,
  getSession,
  isCsrfTokenValid,
  isProfessionalRequestAuthorized,
} from "./authService.js";
import {
  appendAuditEvent,
  listAuditEventsForAdmin,
} from "./auditService.js";
import {
  createAccessRequest,
  listAccessRequestsForAdmin,
  updateAccessRequestStatus,
} from "./accessRequestStore.js";
import {
  getOpenEvents,
  getOpenSources,
  getProfessionalResource,
  getProfessionalResourceNames,
} from "./dataService.js";
import { createProfessionalExport } from "./exportService.js";
import {
  databaseHealth,
  runDatabaseMigrations,
} from "./database.js";
import {
  deleteOtherSessionsForUsername,
  deleteSessionsForUsername,
  listSessionsForUsername,
  listSessionSummaries,
} from "./sessionStore.js";
import {
  changeUserPassword,
  createFreeUser,
  listUsersForAdmin,
  promoteUserToProfessional,
  setUserPassword,
  setUserDisabled,
} from "./userStore.js";
import {
  entitlementsForSession,
  permissionsForSession,
} from "./accessPolicy.js";
import {
  createWorkspace,
  deleteWorkspace,
  listWorkspaces,
} from "./workspaceStore.js";
import {
  completeReportJob,
  createReportJob,
  getReportJob,
  listRecentReportJobs,
} from "./reportJobStore.js";
import {
  assertQuotaAvailable,
  recordQuotaUsage,
  usageForSession,
} from "./quotaService.js";
import { prometheusMetrics, recordRequest } from "./observability.js";
import {
  operationalGauges,
  operationalStatus,
} from "./opsService.js";
import { openApiDocument } from "./openapi.js";
import {
  getOrganizationAccount,
  requestOrganizationCancellation,
  resumeOrganizationSubscription,
} from "./organizationService.js";
import { getCurrentDataRelease } from "./dataReleaseService.js";
import {
  listProfessionalExports,
  recordProfessionalExport,
} from "./exportHistoryStore.js";
import {
  checkLoginRateLimit,
  loginAttemptKey,
  recordLoginFailure,
  recordLoginSuccess,
} from "./rateLimitService.js";
import {
  createApiKey,
  listApiKeysForAdmin,
  revokeApiKey,
} from "./apiKeyStore.js";
import {
  listEmailOutboxForAdmin,
  sendPasswordResetEmail,
} from "./emailService.js";
import {
  consumePasswordResetToken,
  createPasswordResetToken,
} from "./passwordResetStore.js";
import {
  evaluatePointHazardExposure,
} from "./hazard/hazardExposureService.js";

async function readJsonBody(request) {
  const contentType = String(request.headers["content-type"] || "");

  if (contentType && !contentType.includes("application/json")) {
    const error = new Error("unsupported_media_type");

    error.statusCode = 415;
    throw error;
  }

  const chunks = [];
  let bodySize = 0;

  for await (const chunk of request) {
    bodySize += chunk.length;

    if (bodySize > 64 * 1024) {
      const error = new Error("request_body_too_large");

      error.statusCode = 413;
      throw error;
    }

    chunks.push(chunk);
  }

  if (!chunks.length) {
    return {};
  }

  try {
    return JSON.parse(Buffer.concat(chunks).toString("utf8"));
  } catch {
    const error = new Error("invalid_json_body");

    error.statusCode = 400;
    throw error;
  }
}

function requestIdFor(request) {
  const incoming = String(
    request.headers["x-request-id"] || ""
  ).trim();

  if (/^[a-zA-Z0-9_.:-]{8,80}$/.test(incoming)) {
    return incoming;
  }

  return `req-${crypto.randomUUID()}`;
}

function corsOriginFor(request) {
  const requestOrigin = request.headers.origin;

  return allowedOrigins.length
    ? allowedOrigins.includes(requestOrigin)
      ? requestOrigin
      : ""
    : requestOrigin || "*";
}

function commonHeaders(request) {
  const headers = {
    "Access-Control-Allow-Credentials": "true",
    "Access-Control-Allow-Headers":
      "Content-Type, X-ARCUS-CSRF-Token, X-Request-ID",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Origin": corsOriginFor(request),
    "Cache-Control": "no-store",
    "Cross-Origin-Resource-Policy": "same-site",
    "Permissions-Policy":
      "camera=(), microphone=(), geolocation=()",
    "Referrer-Policy": "strict-origin-when-cross-origin",
    "Vary": "Origin",
    "X-Content-Type-Options": "nosniff",
    "X-DNS-Prefetch-Control": "off",
    "X-Frame-Options": "DENY",
    "X-Request-ID": request.requestId,
  };

  if (secureSessionCookie) {
    headers["Strict-Transport-Security"] =
      "max-age=31536000; includeSubDomains";
  }

  if (allowedOrigins.length && !headers["Access-Control-Allow-Origin"]) {
    delete headers["Access-Control-Allow-Origin"];
    delete headers["Access-Control-Allow-Credentials"];
  }

  return headers;
}

function enrichJsonPayload(request, statusCode, payload) {
  if (
    payload &&
    typeof payload === "object" &&
    typeof payload.error === "string"
  ) {
    return {
      ...payload,
      requestId: request.requestId,
      statusCode,
    };
  }

  return payload;
}

function metricPathFor(pathname) {
  return pathname
    .replace(/^\/api\/v1\//, "/api/")
    .replace(
      /^\/api\/admin\/users\/[^/]+\/(disable|password|sessions)$/,
      "/api/admin/users/:username/$1"
    )
    .replace(
      /^\/api\/auth\/sessions\/revoke-other$/,
      "/api/auth/sessions/revoke-other"
    )
    .replace(
      /^\/api\/admin\/access-requests\/[^/]+\/status$/,
      "/api/admin/access-requests/:id/status"
    )
    .replace(
      /^\/api\/admin\/audit-events$/,
      "/api/admin/audit-events"
    )
    .replace(
      /^\/api\/admin\/ops\/status$/,
      "/api/admin/ops/status"
    )
    .replace(
      /^\/api\/admin\/email-outbox$/,
      "/api/admin/email-outbox"
    )
    .replace(
      /^\/api\/auth\/password\/request-reset$/,
      "/api/auth/password/request-reset"
    )
    .replace(
      /^\/api\/auth\/password\/reset$/,
      "/api/auth/password/reset"
    )
    .replace(
      /^\/api\/admin\/api-keys\/[^/]+\/revoke$/,
      "/api/admin/api-keys/:id/revoke"
    )
    .replace(
      /^\/api\/professional\/workspaces\/[^/]+\/delete$/,
      "/api/professional/workspaces/:id/delete"
    )
    .replace(
      /^\/api\/professional\/report-jobs\/[^/]+\/complete$/,
      "/api/professional/report-jobs/:id/complete"
    )
    .replace(
      /^\/api\/professional\/report-jobs\/[^/]+$/,
      "/api/professional/report-jobs/:id"
    )
    .replace(
      /^\/api\/professional\/exports\/recent$/,
      "/api/professional/exports/recent"
    )
    .replace(
      /^\/api\/professional\/hazard-exposure\/point$/,
      "/api/professional/hazard-exposure/point"
    )
    .replace(
      /^\/api\/professional\/account\/(cancel|resume)$/,
      "/api/professional/account/:action"
    )
    .replace(
      /^\/api\/professional\/[a-z0-9-]+$/,
      "/api/professional/:resource"
    );
}

function sendJson(
  request,
  response,
  statusCode,
  payload,
  extraHeaders = {}
) {
  response.writeHead(statusCode, {
    "Content-Type": "application/json; charset=utf-8",
    ...commonHeaders(request),
    ...extraHeaders,
  });
  response.end(
    JSON.stringify(
      enrichJsonPayload(request, statusCode, payload)
    )
  );
}

function sendText(request, response, statusCode, content, contentType) {
  response.writeHead(statusCode, {
    "Content-Type": contentType,
    ...commonHeaders(request),
  });
  response.end(content);
}

function sendDownload(
  request,
  response,
  {
    content,
    contentType,
    filename,
    headers = {},
  }
) {
  response.writeHead(200, {
    "Content-Disposition": `attachment; filename="${filename}"`,
    "Content-Type": contentType,
    ...commonHeaders(request),
    ...headers,
  });
  response.end(content);
}

async function getAuthorisedSession(request, permission) {
  const session = await getRequestSession(request);

  if (
    !session ||
    !(await isProfessionalRequestAuthorized(request, permission))
  ) {
    return null;
  }

  return session;
}

function csrfRequiredFor(session) {
  return session?.role !== "api";
}

async function routeRequest(request, response) {
  if (request.method === "OPTIONS") {
    sendJson(request, response, 204, {});
    return;
  }

  const url = new URL(
    request.url,
    `http://${request.headers.host || "localhost"}`
  );

  if (url.pathname.startsWith("/api/v1/")) {
    url.pathname = `/api/${url.pathname.slice("/api/v1/".length)}`;
  }

  if (url.pathname === "/api/openapi.json") {
    sendJson(request, response, 200, openApiDocument);
    return;
  }

  if (url.pathname === "/api/health") {
    const health = await databaseHealth();

    sendJson(request, response, 200, {
      ...health,
      ok: true,
      service: "arcus-api",
    });
    return;
  }

  if (url.pathname === "/api/health/ready") {
    const health = await databaseHealth();

    sendJson(request, response, 200, health);
    return;
  }

  if (url.pathname === "/api/auth/session") {
    if (request.method !== "GET") {
      sendJson(request, response, 405, {
        error: "method_not_allowed",
      });
      return;
    }

    const session = await getSession(request);

    sendJson(request, response, 200, {
      authenticated: Boolean(session),
      csrfToken: session?.csrfToken || null,
      organization: session
        ? {
            id: session.organizationId,
            name: session.organizationName,
            plan: session.organizationPlan,
            status: session.organizationStatus,
          }
        : null,
      entitlements: session
        ? entitlementsForSession(session)
        : entitlementsForSession(null),
      permissions: session
        ? permissionsForSession(session)
        : [],
      role: session?.role || "open",
      username: session?.username || null,
    });
    return;
  }

  if (url.pathname === "/api/auth/login") {
    if (request.method !== "POST") {
      sendJson(request, response, 405, {
        error: "method_not_allowed",
      });
      return;
    }

    const credentials = await readJsonBody(request);
    const attemptKey = loginAttemptKey(
      request,
      credentials.username
    );
    const rateLimit =
      checkLoginRateLimit(attemptKey);

    if (!rateLimit.allowed) {
      await appendAuditEvent({
        event: "login_rate_limited",
        username: credentials.username || null,
      });

      sendJson(
        request,
        response,
        429,
        {
          error: "too_many_login_attempts",
          retryAfterSeconds:
            rateLimit.retryAfterSeconds,
        },
        {
          "Retry-After": String(
            rateLimit.retryAfterSeconds
          ),
        }
      );
      return;
    }

    const user = await authenticateCredentials(credentials);

    if (!user) {
      recordLoginFailure(attemptKey);
      await appendAuditEvent({
        event: "login_failed",
        username: credentials.username || null,
      });

      sendJson(request, response, 401, {
        error: "invalid_credentials",
      });
      return;
    }

    recordLoginSuccess(attemptKey);
    const { cookie, session } = await createSession(user);
    await appendAuditEvent({
      event: "login_succeeded",
      role: user.role,
      userId: user.id,
      username: user.username,
    });

    sendJson(
      request,
      response,
      200,
      {
        authenticated: true,
        csrfToken: session.csrfToken,
        organization: {
          id: session.organizationId,
          name: session.organizationName,
          plan: session.organizationPlan,
          status: session.organizationStatus,
        },
        entitlements: entitlementsForSession(session),
        permissions: permissionsForSession(session),
        role: session.role,
        username: session.username,
      },
      {
        "Set-Cookie": cookie,
      }
    );
    return;
  }

  if (url.pathname === "/api/auth/register") {
    if (request.method !== "POST") {
      sendJson(request, response, 405, {
        error: "method_not_allowed",
      });
      return;
    }

    const payload = await readJsonBody(request);
    const attemptKey = loginAttemptKey(
      request,
      payload.username
    );
    const rateLimit =
      checkLoginRateLimit(attemptKey);

    if (!rateLimit.allowed) {
      sendJson(
        request,
        response,
        429,
        {
          error: "too_many_account_attempts",
          retryAfterSeconds:
            rateLimit.retryAfterSeconds,
        },
        {
          "Retry-After": String(
            rateLimit.retryAfterSeconds
          ),
        }
      );
      return;
    }

    const user = await createFreeUser(payload);
    recordLoginSuccess(attemptKey);
    const { cookie, session } = await createSession(user);

    await appendAuditEvent({
      event: "free_account_registered",
      role: user.role,
      userId: user.id,
      username: user.username,
    });

    sendJson(
      request,
      response,
      201,
      {
        authenticated: true,
        csrfToken: session.csrfToken,
        organization: {
          id: session.organizationId,
          name: session.organizationName,
          plan: session.organizationPlan,
          status: session.organizationStatus,
        },
        entitlements: entitlementsForSession(session),
        permissions: permissionsForSession(session),
        role: session.role,
        username: session.username,
      },
      {
        "Set-Cookie": cookie,
      }
    );
    return;
  }

  if (url.pathname === "/api/auth/password/request-reset") {
    if (request.method !== "POST") {
      sendJson(request, response, 405, {
        error: "method_not_allowed",
      });
      return;
    }

    const payload = await readJsonBody(request);
    const username = String(payload.username || "").trim().toLowerCase();
    const attemptKey = loginAttemptKey(request, username);
    const rateLimit = checkLoginRateLimit(attemptKey);

    if (!rateLimit.allowed) {
      sendJson(
        request,
        response,
        429,
        {
          error: "too_many_password_reset_attempts",
          retryAfterSeconds: rateLimit.retryAfterSeconds,
        },
        {
          "Retry-After": String(rateLimit.retryAfterSeconds),
        }
      );
      return;
    }

    const reset = await createPasswordResetToken(username);

    if (reset) {
      recordLoginFailure(attemptKey);
      try {
        const email = await sendPasswordResetEmail({
          token: reset.token,
          username: reset.user.username,
        });

        await appendAuditEvent({
          emailId: email.id,
          emailStatus: email.status,
          event: "password_reset_requested",
          userId: reset.user.id,
          username: reset.user.username,
        });
      } catch (error) {
        await appendAuditEvent({
          emailStatus: error.email?.status || "failed",
          event: "password_reset_email_failed",
          userId: reset.user.id,
          username: reset.user.username,
        });
      }
    } else {
      recordLoginFailure(attemptKey);
      await appendAuditEvent({
        event: "password_reset_requested_unknown_account",
        username,
      });
    }

    sendJson(request, response, 202, {
      accepted: true,
    });
    return;
  }

  if (url.pathname === "/api/auth/password/reset") {
    if (request.method !== "POST") {
      sendJson(request, response, 405, {
        error: "method_not_allowed",
      });
      return;
    }

    const payload = await readJsonBody(request);
    const reset = await consumePasswordResetToken({
      newPassword: payload.newPassword,
      token: payload.token,
    });

    if (!reset) {
      await appendAuditEvent({
        event: "password_reset_failed",
      });
      sendJson(request, response, 400, {
        error: "invalid_or_expired_reset_token",
      });
      return;
    }

    const revoked = await deleteSessionsForUsername(reset.user.username);

    await appendAuditEvent({
      event: "password_reset_completed",
      revokedSessions: revoked,
      role: reset.user.role,
      userId: reset.user.id,
      username: reset.user.username,
    });

    sendJson(
      request,
      response,
      200,
      {
        passwordReset: true,
        revokedSessions: revoked,
      },
      {
        "Set-Cookie": clearSessionCookie(),
      }
    );
    return;
  }

  if (url.pathname === "/api/auth/logout") {
    if (request.method !== "POST") {
      sendJson(request, response, 405, {
        error: "method_not_allowed",
      });
      return;
    }

    if (!(await isCsrfTokenValid(request))) {
      await appendAuditEvent({
        event: "logout_csrf_rejected",
      });

      sendJson(request, response, 403, {
        error: "csrf_token_required",
      });
      return;
    }

    const session = await getSession(request);
    await destroySession(request);
    await appendAuditEvent({
      event: "logout_succeeded",
      role: session?.role || null,
      username: session?.username || null,
    });
    sendJson(
      request,
      response,
      200,
      {
        authenticated: false,
      },
      {
        "Set-Cookie": clearSessionCookie(),
      }
    );
    return;
  }

  if (url.pathname === "/api/auth/password") {
    if (request.method !== "POST") {
      sendJson(request, response, 405, {
        error: "method_not_allowed",
      });
      return;
    }

    const session = await getSession(request);

    if (!session) {
      sendJson(request, response, 401, {
        error: "authentication_required",
      });
      return;
    }

    if (!(await isCsrfTokenValid(request))) {
      await appendAuditEvent({
        event: "password_change_csrf_rejected",
        username: session.username,
      });
      sendJson(request, response, 403, {
        error: "csrf_token_required",
      });
      return;
    }

    const payload = await readJsonBody(request);
    const user = await changeUserPassword({
      currentPassword: payload.currentPassword,
      newPassword: payload.newPassword,
      username: session.username,
    });

    if (!user) {
      sendJson(request, response, 404, {
        error: "user_not_found",
      });
      return;
    }

    const revoked = await deleteSessionsForUsername(session.username);

    await appendAuditEvent({
      event: "password_changed",
      organizationId: session.organizationId,
      revokedSessions: revoked,
      role: session.role,
      userId: session.userId,
      username: session.username,
    });

    sendJson(
      request,
      response,
      200,
      {
        passwordChanged: true,
        revokedSessions: revoked,
      },
      {
        "Set-Cookie": clearSessionCookie(),
      }
    );
    return;
  }

  if (url.pathname === "/api/auth/sessions") {
    if (request.method !== "GET") {
      sendJson(request, response, 405, {
        error: "method_not_allowed",
      });
      return;
    }

    const session = await getSession(request);

    if (!session) {
      sendJson(request, response, 401, {
        error: "authentication_required",
      });
      return;
    }

    const sessions = await listSessionsForUsername(session.username);

    sendJson(request, response, 200, {
      sessions: sessions.map((item) => ({
        createdAt: item.createdAt,
        current: item.id === session.id,
        expiresAt: item.expiresAt,
        role: item.role,
      })),
    });
    return;
  }

  if (url.pathname === "/api/auth/sessions/revoke-other") {
    if (request.method !== "POST") {
      sendJson(request, response, 405, {
        error: "method_not_allowed",
      });
      return;
    }

    const session = await getSession(request);

    if (!session) {
      sendJson(request, response, 401, {
        error: "authentication_required",
      });
      return;
    }

    if (!(await isCsrfTokenValid(request))) {
      await appendAuditEvent({
        event: "session_revoke_other_csrf_rejected",
        username: session.username,
      });
      sendJson(request, response, 403, {
        error: "csrf_token_required",
      });
      return;
    }

    const revoked = await deleteOtherSessionsForUsername(
      session.username,
      session.id
    );

    await appendAuditEvent({
      event: "other_sessions_revoked",
      organizationId: session.organizationId,
      revokedSessions: revoked,
      role: session.role,
      userId: session.userId,
      username: session.username,
    });

    sendJson(request, response, 200, {
      revokedSessions: revoked,
    });
    return;
  }

  if (url.pathname === "/api/access-requests") {
    if (request.method !== "POST") {
      sendJson(request, response, 405, {
        error: "method_not_allowed",
      });
      return;
    }

    const session = await getSession(request);
    const accessRequest = await createAccessRequest(
      await readJsonBody(request),
      session
    );

    await appendAuditEvent({
      event: "professional_access_requested",
      requestedByRole: session?.role || "open",
      requestId: accessRequest.id,
      username: session?.username || accessRequest.email,
    });

    sendJson(request, response, 201, {
      request: accessRequest,
    });
    return;
  }

  if (url.pathname === "/api/professional/exports") {
    if (request.method !== "POST") {
      sendJson(request, response, 405, {
        error: "method_not_allowed",
      });
      return;
    }

    const session = await getAuthorisedSession(
      request,
      "professional:export"
    );

    if (!session) {
      sendJson(request, response, 401, {
        error: "professional_export_access_required",
      });
      return;
    }

    if (
      csrfRequiredFor(session) &&
      !(await isCsrfTokenValid(request))
    ) {
      await appendAuditEvent({
        event: "professional_export_csrf_rejected",
        username: session.username,
      });
      sendJson(request, response, 403, {
        error: "csrf_token_required",
      });
      return;
    }

    const entitlements = entitlementsForSession(session);

    try {
      await assertQuotaAvailable(
        session,
        "professional_export",
        entitlements.exportLimitPerDay
      );
    } catch (error) {
      await appendAuditEvent({
        event: "professional_export_quota_rejected",
        organizationId: session.organizationId,
        quota: error.quota || null,
        userId: session.userId,
        username: session.username,
      });
      sendJson(request, response, error.statusCode || 429, {
        error: error.code || "quota_exceeded",
        quota: error.quota || null,
      });
      return;
    }

    const payload = await readJsonBody(request);
    const exportId = `exp-${crypto.randomUUID()}`;
    const generatedAt = new Date().toISOString();
    const dataRelease = await getCurrentDataRelease();
    const output = await createProfessionalExport(payload, {
      dataRelease,
      exportId,
      generatedAt,
      maxEvents: session.exportLimit,
    });
    const quotaUsage = await recordQuotaUsage(
      session,
      "professional_export"
    );

    await appendAuditEvent({
      event: "professional_export_generated",
      eventCount: output.eventCount,
      exportId: output.exportId || exportId,
      exportType: output.type,
      generatedAt,
      organizationId: session.organizationId,
      quotaCount: quotaUsage.count,
      sourceCount: output.sourceCount || 0,
      userId: session.userId,
      username: session.username,
    });
    await recordProfessionalExport({
      createdAt: generatedAt,
      dataReleaseId: dataRelease.id,
      eventCount: output.eventCount,
      exportId: output.exportId || exportId,
      filename: output.filename,
      methodologyVersion: dataRelease.methodologyVersion,
      organizationId: session.organizationId,
      scopeLabel: output.scopeLabel,
      sourceCount: output.sourceCount || 0,
      type: output.type,
      userId: session.userId,
      username: session.username,
    });
    sendDownload(request, response, {
      ...output,
      headers: {
        "X-ARCUS-Data-Release": dataRelease.id,
        "X-ARCUS-Export-ID": output.exportId || exportId,
      },
    });
    return;
  }

  if (url.pathname === "/api/professional/hazard-exposure/point") {
    if (request.method !== "POST") {
      sendJson(request, response, 405, {
        error: "method_not_allowed",
      });
      return;
    }

    const session = await getAuthorisedSession(request, "professional:read");

    if (!session) {
      sendJson(request, response, 401, {
        error: "professional_access_required",
      });
      return;
    }

    if (
      csrfRequiredFor(session) &&
      !(await isCsrfTokenValid(request))
    ) {
      sendJson(request, response, 403, {
        error: "csrf_token_required",
      });
      return;
    }

    const payload = await readJsonBody(request);
    const exposure = await evaluatePointHazardExposure(payload);

    await appendAuditEvent({
      event: "professional_hazard_exposure_point_queried",
      hazardStatus: exposure.hydraulic?.status || null,
      organizationId: session.organizationId,
      userId: session.userId,
      username: session.username,
    });

    sendJson(request, response, 200, exposure);
    return;
  }

  if (url.pathname === "/api/professional/report-jobs") {
    if (request.method !== "POST") {
      sendJson(request, response, 405, {
        error: "method_not_allowed",
      });
      return;
    }

    const session = await getAuthorisedSession(
      request,
      "professional:report"
    );

    if (!session) {
      sendJson(request, response, 401, {
        error: "professional_report_access_required",
      });
      return;
    }

    if (
      csrfRequiredFor(session) &&
      !(await isCsrfTokenValid(request))
    ) {
      sendJson(request, response, 403, {
        error: "csrf_token_required",
      });
      return;
    }

    const entitlements = entitlementsForSession(session);

    try {
      await assertQuotaAvailable(
        session,
        "professional_report",
        entitlements.reportLimitPerDay
      );
    } catch (error) {
      await appendAuditEvent({
        event: "professional_report_quota_rejected",
        organizationId: session.organizationId,
        quota: error.quota || null,
        userId: session.userId,
        username: session.username,
      });
      sendJson(request, response, error.statusCode || 429, {
        error: error.code || "quota_exceeded",
        quota: error.quota || null,
      });
      return;
    }

    const payload = await readJsonBody(request);
    const job = await createReportJob(session, {
      path: String(payload.path || "unknown").slice(0, 32),
      territory: String(payload.territory || "").slice(0, 120),
      variant: String(payload.variant || "full").slice(0, 20),
    });
    const quotaUsage = await recordQuotaUsage(
      session,
      "professional_report"
    );

    await appendAuditEvent({
      event: "professional_report_registered",
      organizationId: session.organizationId,
      path: payload.path,
      quotaCount: quotaUsage.count,
      reference: job.reference,
      territory: payload.territory,
      userId: session.userId,
      username: session.username,
      variant: payload.variant,
    });
    sendJson(request, response, 201, {
      reference: job.reference,
      registered: true,
      status: job.status,
    });
    return;
  }

  if (url.pathname === "/api/professional/workspaces") {
    const session = await getAuthorisedSession(request, "professional:read");

    if (!session) {
      sendJson(request, response, 401, {
        error: "professional_access_required",
      });
      return;
    }

    if (request.method === "GET") {
      sendJson(request, response, 200, {
        workspaces: await listWorkspaces(session),
      });
      return;
    }

    if (request.method !== "POST") {
      sendJson(request, response, 405, {
        error: "method_not_allowed",
      });
      return;
    }

    if (!(await isCsrfTokenValid(request))) {
      sendJson(request, response, 403, {
        error: "csrf_token_required",
      });
      return;
    }

    const workspace = await createWorkspace(
      session,
      await readJsonBody(request)
    );

    await appendAuditEvent({
      event: "workspace_created",
      organizationId: session.organizationId,
      userId: session.userId,
      username: session.username,
      workspaceId: workspace.id,
    });
    sendJson(request, response, 201, { workspace });
    return;
  }

  if (url.pathname === "/api/professional/account") {
    if (request.method !== "GET") {
      sendJson(request, response, 405, {
        error: "method_not_allowed",
      });
      return;
    }

    const session = await getAuthorisedSession(request, "professional:read");

    if (!session) {
      sendJson(request, response, 401, {
        error: "professional_access_required",
      });
      return;
    }

    const organization = await getOrganizationAccount(
      session.organizationId
    );

    sendJson(request, response, 200, {
      account: {
        entitlements: entitlementsForSession(session),
        organization,
        role: session.role,
        username: session.username,
      },
    });
    return;
  }

  if (url.pathname === "/api/professional/data-release") {
    if (request.method !== "GET") {
      sendJson(request, response, 405, {
        error: "method_not_allowed",
      });
      return;
    }

    const session = await getAuthorisedSession(request, "professional:read");

    if (!session) {
      sendJson(request, response, 401, {
        error: "professional_access_required",
      });
      return;
    }

    sendJson(request, response, 200, {
      release: await getCurrentDataRelease(),
    });
    return;
  }

  if (url.pathname === "/api/professional/exports/recent") {
    if (request.method !== "GET") {
      sendJson(request, response, 405, {
        error: "method_not_allowed",
      });
      return;
    }

    const session = await getAuthorisedSession(request, "professional:read");

    if (!session) {
      sendJson(request, response, 401, {
        error: "professional_access_required",
      });
      return;
    }

    sendJson(request, response, 200, {
      exports: await listProfessionalExports(
        session,
        url.searchParams.get("limit") || 12
      ),
    });
    return;
  }

  if (url.pathname === "/api/professional/usage") {
    if (request.method !== "GET") {
      sendJson(request, response, 405, {
        error: "method_not_allowed",
      });
      return;
    }

    const session = await getAuthorisedSession(request, "professional:read");

    if (!session) {
      sendJson(request, response, 401, {
        error: "professional_access_required",
      });
      return;
    }

    const entitlements = entitlementsForSession(session);

    sendJson(request, response, 200, {
      entitlements,
      usage: await usageForSession(session, entitlements),
    });
    return;
  }

  const accountActionMatch = url.pathname.match(
    /^\/api\/professional\/account\/(cancel|resume)$/
  );

  if (accountActionMatch) {
    if (request.method !== "POST") {
      sendJson(request, response, 405, {
        error: "method_not_allowed",
      });
      return;
    }

    const session = await getAuthorisedSession(request, "professional:read");

    if (
      !session ||
      session.role === "api" ||
      !(await isCsrfTokenValid(request))
    ) {
      sendJson(request, response, 403, {
        error: "professional_access_required",
      });
      return;
    }

    const action = accountActionMatch[1];
    const organization = action === "cancel"
      ? await requestOrganizationCancellation(session.organizationId)
      : await resumeOrganizationSubscription(session.organizationId);

    await appendAuditEvent({
      event:
        action === "cancel"
          ? "organization_cancellation_requested"
          : "organization_cancellation_rescinded",
      organizationId: session.organizationId,
      userId: session.userId,
      username: session.username,
    });
    sendJson(request, response, 200, {
      organization,
    });
    return;
  }

  const workspaceDeleteMatch = url.pathname.match(
    /^\/api\/professional\/workspaces\/([^/]+)\/delete$/
  );

  if (workspaceDeleteMatch) {
    if (request.method !== "POST") {
      sendJson(request, response, 405, {
        error: "method_not_allowed",
      });
      return;
    }

    const session = await getAuthorisedSession(request, "professional:read");

    if (
      !session ||
      session.role === "api" ||
      !(await isCsrfTokenValid(request))
    ) {
      sendJson(request, response, 403, {
        error: "professional_access_required",
      });
      return;
    }

    const workspaceId = decodeURIComponent(workspaceDeleteMatch[1]);
    const deleted = await deleteWorkspace(session, workspaceId);

    if (!deleted) {
      sendJson(request, response, 404, {
        error: "workspace_not_found",
      });
      return;
    }

    await appendAuditEvent({
      event: "workspace_deleted",
      organizationId: session.organizationId,
      userId: session.userId,
      username: session.username,
      workspaceId,
    });
    sendJson(request, response, 200, { deleted: true });
    return;
  }

  if (url.pathname === "/api/professional/report-jobs/recent") {
    if (request.method !== "GET") {
      sendJson(request, response, 405, {
        error: "method_not_allowed",
      });
      return;
    }

    const session = await getAuthorisedSession(request, "professional:report");

    if (!session) {
      sendJson(request, response, 401, {
        error: "professional_report_access_required",
      });
      return;
    }

    sendJson(request, response, 200, {
      jobs: await listRecentReportJobs(session),
    });
    return;
  }

  const reportJobCompleteMatch = url.pathname.match(
    /^\/api\/professional\/report-jobs\/([^/]+)\/complete$/
  );

  if (reportJobCompleteMatch) {
    if (request.method !== "POST") {
      sendJson(request, response, 405, {
        error: "method_not_allowed",
      });
      return;
    }

    const session = await getAuthorisedSession(
      request,
      "professional:report"
    );

    if (
      !session ||
      (csrfRequiredFor(session) && !(await isCsrfTokenValid(request)))
    ) {
      sendJson(request, response, 403, {
        error: "professional_report_access_required",
      });
      return;
    }

    const payload = await readJsonBody(request);
    const job = await completeReportJob(
      session,
      decodeURIComponent(reportJobCompleteMatch[1]),
      {
        filename: String(payload.filename || "").slice(0, 180),
        outputType: String(payload.outputType || "pdf").slice(0, 40),
        variant: String(payload.variant || "").slice(0, 20),
      }
    );

    if (!job) {
      sendJson(request, response, 404, {
        error: "report_job_not_found",
      });
      return;
    }

    await appendAuditEvent({
      event: "professional_report_completed",
      organizationId: session.organizationId,
      reference: job.id,
      userId: session.userId,
      username: session.username,
      variant: job.result?.variant || null,
    });
    sendJson(request, response, 200, { job });
    return;
  }

  const reportJobMatch = url.pathname.match(
    /^\/api\/professional\/report-jobs\/([^/]+)$/
  );

  if (reportJobMatch) {
    if (request.method !== "GET") {
      sendJson(request, response, 405, {
        error: "method_not_allowed",
      });
      return;
    }

    const session = await getAuthorisedSession(
      request,
      "professional:report"
    );

    if (!session) {
      sendJson(request, response, 401, {
        error: "professional_report_access_required",
      });
      return;
    }

    const job = await getReportJob(
      session,
      decodeURIComponent(reportJobMatch[1])
    );

    if (!job) {
      sendJson(request, response, 404, {
        error: "report_job_not_found",
      });
      return;
    }

    sendJson(request, response, 200, { job });
    return;
  }

  if (url.pathname === "/api/admin/users") {
    if (request.method !== "GET") {
      sendJson(request, response, 405, {
        error: "method_not_allowed",
      });
      return;
    }

    const session = await getAuthorisedSession(request, "admin:access");

    if (!session) {
      sendJson(request, response, 403, {
        error: "admin_access_required",
      });
      return;
    }

    const [users, sessions] = await Promise.all([
      listUsersForAdmin(),
      listSessionSummaries(),
    ]);
    const sessionCounts = sessions.reduce((counts, item) => {
      counts[item.username] = (counts[item.username] || 0) + 1;

      return counts;
    }, {});

    sendJson(request, response, 200, {
      users: users.map((user) => ({
        ...user,
        activeSessions: sessionCounts[user.username] || 0,
      })),
    });
    return;
  }

  if (url.pathname === "/api/admin/access-requests") {
    if (request.method !== "GET") {
      sendJson(request, response, 405, {
        error: "method_not_allowed",
      });
      return;
    }

    const session = await getAuthorisedSession(request, "admin:access");

    if (!session) {
      sendJson(request, response, 403, {
        error: "admin_access_required",
      });
      return;
    }

    sendJson(request, response, 200, {
      requests: await listAccessRequestsForAdmin(
        url.searchParams.get("limit") || 80
      ),
    });
    return;
  }

  if (url.pathname === "/api/admin/metrics") {
    if (request.method !== "GET") {
      sendJson(request, response, 405, {
        error: "method_not_allowed",
      });
      return;
    }

    const session = await getAuthorisedSession(request, "admin:access");

    if (!session) {
      sendJson(request, response, 403, {
        error: "admin_access_required",
      });
      return;
    }

    const status = await operationalStatus();

    sendText(
      request,
      response,
      200,
      prometheusMetrics(operationalGauges(status)),
      "text/plain; version=0.0.4; charset=utf-8"
    );
    return;
  }

  if (url.pathname === "/api/admin/ops/status") {
    if (request.method !== "GET") {
      sendJson(request, response, 405, {
        error: "method_not_allowed",
      });
      return;
    }

    const session = await getAuthorisedSession(request, "admin:access");

    if (!session) {
      sendJson(request, response, 403, {
        error: "admin_access_required",
      });
      return;
    }

    sendJson(request, response, 200, await operationalStatus());
    return;
  }

  if (url.pathname === "/api/admin/audit-events") {
    if (request.method !== "GET") {
      sendJson(request, response, 405, {
        error: "method_not_allowed",
      });
      return;
    }

    const session = await getAuthorisedSession(request, "admin:access");

    if (!session) {
      sendJson(request, response, 403, {
        error: "admin_access_required",
      });
      return;
    }

    sendJson(request, response, 200, {
      events: await listAuditEventsForAdmin(
        url.searchParams.get("limit") || 80
      ),
    });
    return;
  }

  if (url.pathname === "/api/admin/email-outbox") {
    if (request.method !== "GET") {
      sendJson(request, response, 405, {
        error: "method_not_allowed",
      });
      return;
    }

    const session = await getAuthorisedSession(request, "admin:access");

    if (!session) {
      sendJson(request, response, 403, {
        error: "admin_access_required",
      });
      return;
    }

    sendJson(request, response, 200, {
      emails: await listEmailOutboxForAdmin(
        url.searchParams.get("limit") || 50
      ),
    });
    return;
  }

  if (url.pathname === "/api/admin/api-keys") {
    const session = await getAuthorisedSession(request, "admin:access");

    if (!session) {
      sendJson(request, response, 403, {
        error: "admin_access_required",
      });
      return;
    }

    if (request.method === "GET") {
      sendJson(request, response, 200, {
        apiKeys: await listApiKeysForAdmin(session),
      });
      return;
    }

    if (request.method !== "POST") {
      sendJson(request, response, 405, {
        error: "method_not_allowed",
      });
      return;
    }

    if (!(await isCsrfTokenValid(request))) {
      sendJson(request, response, 403, {
        error: "csrf_token_required",
      });
      return;
    }

    const payload = await readJsonBody(request);
    const created = await createApiKey(session, payload);

    await appendAuditEvent({
      apiKeyId: created.record.id,
      event: "admin_api_key_created",
      label: created.record.label,
      organizationId: session.organizationId,
      performedBy: session.username,
      permissions: created.record.permissions,
      userId: session.userId,
    });

    sendJson(request, response, 201, {
      apiKey: created.record,
      key: created.key,
    });
    return;
  }

  const adminApiKeyMatch = url.pathname.match(
    /^\/api\/admin\/api-keys\/([^/]+)\/revoke$/
  );

  if (adminApiKeyMatch) {
    if (request.method !== "POST") {
      sendJson(request, response, 405, {
        error: "method_not_allowed",
      });
      return;
    }

    const session = await getAuthorisedSession(request, "admin:access");

    if (!session) {
      sendJson(request, response, 403, {
        error: "admin_access_required",
      });
      return;
    }

    if (!(await isCsrfTokenValid(request))) {
      sendJson(request, response, 403, {
        error: "csrf_token_required",
      });
      return;
    }

    const apiKey = await revokeApiKey(
      session,
      decodeURIComponent(adminApiKeyMatch[1])
    );

    if (!apiKey) {
      sendJson(request, response, 404, {
        error: "api_key_not_found",
      });
      return;
    }

    await appendAuditEvent({
      apiKeyId: apiKey.id,
      event: "admin_api_key_revoked",
      label: apiKey.label,
      organizationId: session.organizationId,
      performedBy: session.username,
      userId: session.userId,
    });

    sendJson(request, response, 200, {
      apiKey,
      revoked: true,
    });
    return;
  }

  const adminUserMatch = url.pathname.match(
    /^\/api\/admin\/users\/([^/]+)\/(disable|password|sessions)$/
  );

  if (adminUserMatch) {
    if (request.method !== "POST") {
      sendJson(request, response, 405, {
        error: "method_not_allowed",
      });
      return;
    }

    const session = await getAuthorisedSession(request, "admin:access");

    if (!session) {
      sendJson(request, response, 403, {
        error: "admin_access_required",
      });
      return;
    }

    if (!(await isCsrfTokenValid(request))) {
      sendJson(request, response, 403, {
        error: "csrf_token_required",
      });
      return;
    }

    const username = decodeURIComponent(adminUserMatch[1]);
    const action = adminUserMatch[2];
    const payload = await readJsonBody(request);

    if (action === "disable") {
      const user = await setUserDisabled(username, payload.disabled);

      if (!user) {
        sendJson(request, response, 404, {
          error: "user_not_found",
        });
        return;
      }

      const revoked = user.disabled
        ? await deleteSessionsForUsername(username)
        : 0;

      await appendAuditEvent({
        event: user.disabled ? "admin_user_disabled" : "admin_user_enabled",
        performedBy: session.username,
        revokedSessions: revoked,
        username: user.username,
      });
      sendJson(request, response, 200, {
        ...user,
        revokedSessions: revoked,
      });
      return;
    }

    if (action === "password") {
      const user = await setUserPassword(
        username,
        payload.newPassword
      );

      if (!user) {
        sendJson(request, response, 404, {
          error: "user_not_found",
        });
        return;
      }

      const revoked = await deleteSessionsForUsername(username);

      await appendAuditEvent({
        event: "admin_user_password_reset",
        performedBy: session.username,
        revokedSessions: revoked,
        username: user.username,
      });
      sendJson(request, response, 200, {
        passwordReset: true,
        revokedSessions: revoked,
        username: user.username,
      });
      return;
    }

    const revoked = await deleteSessionsForUsername(username);

    await appendAuditEvent({
      event: "admin_user_sessions_revoked",
      performedBy: session.username,
      revokedSessions: revoked,
      username,
    });
    sendJson(request, response, 200, {
      revokedSessions: revoked,
      username,
    });
    return;
  }

  const adminAccessRequestMatch = url.pathname.match(
    /^\/api\/admin\/access-requests\/([^/]+)\/status$/
  );

  if (adminAccessRequestMatch) {
    if (request.method !== "POST") {
      sendJson(request, response, 405, {
        error: "method_not_allowed",
      });
      return;
    }

    const session = await getAuthorisedSession(request, "admin:access");

    if (!session) {
      sendJson(request, response, 403, {
        error: "admin_access_required",
      });
      return;
    }

    if (!(await isCsrfTokenValid(request))) {
      sendJson(request, response, 403, {
        error: "csrf_token_required",
      });
      return;
    }

    const payload = await readJsonBody(request);
    const nextStatus = String(payload.status || "");
    const requestId = decodeURIComponent(adminAccessRequestMatch[1]);
    let promotedUser = null;
    let promotionStatus = "";

    const existingRequests = nextStatus === "approved"
      ? await listAccessRequestsForAdmin(200)
      : [];
    const existingRequest = existingRequests.find(
      (item) => item.id === requestId
    );

    if (nextStatus === "approved" && existingRequest?.email) {
      promotedUser = await promoteUserToProfessional(
        existingRequest.email
      );
      promotionStatus = promotedUser
        ? "promoted"
        : "pending_account";

      if (promotedUser) {
        await deleteSessionsForUsername(promotedUser.username);
      }
    }

    const accessRequest = await updateAccessRequestStatus(
      requestId,
      nextStatus,
      session,
      {
        promotedUsername: promotedUser?.username || "",
        promotionStatus,
      }
    );

    if (!accessRequest) {
      sendJson(request, response, 404, {
        error: "access_request_not_found",
      });
      return;
    }

    await appendAuditEvent({
      event: "admin_access_request_status_changed",
      performedBy: session.username,
      promotedUsername: promotedUser?.username || null,
      promotionStatus: promotionStatus || null,
      requestId: accessRequest.id,
      status: accessRequest.status,
      username: accessRequest.email,
    });

    sendJson(request, response, 200, {
      request: accessRequest,
    });
    return;
  }

  if (request.method !== "GET") {
    sendJson(request, response, 405, {
      error: "method_not_allowed",
    });
    return;
  }

  if (url.pathname === "/api/open/events") {
    sendJson(request, response, 200, {
      release: "data-in-brief-public-2000-2025",
      events: await getOpenEvents(),
    });
    return;
  }

  if (url.pathname === "/api/open/sources") {
    sendJson(request, response, 200, {
      release: "data-in-brief-public-2000-2025",
      sources: await getOpenSources(),
    });
    return;
  }

  if (
    url.pathname ===
    "/api/professional/resources"
  ) {
    if (!(await isProfessionalRequestAuthorized(request, "professional:read"))) {
      sendJson(request, response, 401, {
        error: "professional_access_required",
      });
      return;
    }

    sendJson(request, response, 200, {
      resources: getProfessionalResourceNames(),
    });
    return;
  }

  const professionalMatch = url.pathname.match(
    /^\/api\/professional\/([a-z0-9-]+)$/
  );

  if (professionalMatch) {
    if (!(await isProfessionalRequestAuthorized(request, "professional:read"))) {
      sendJson(request, response, 401, {
        error: "professional_access_required",
      });
      return;
    }

    const resource = await getProfessionalResource(
      professionalMatch[1]
    );

    if (!resource) {
      sendJson(request, response, 404, {
        error: "resource_not_found",
      });
      return;
    }

    sendJson(request, response, 200, resource);
    return;
  }

  sendJson(request, response, 404, {
    error: "not_found",
  });
}

const server = http.createServer(
  (request, response) => {
    const startedAt = Date.now();
    request.requestId = requestIdFor(request);

    response.once("finish", () => {
      const pathname = new URL(
        request.url,
        `http://${request.headers.host || "localhost"}`
      ).pathname;
      const durationMs = Date.now() - startedAt;

      recordRequest({
        durationMs,
        method: request.method || "GET",
        path: metricPathFor(pathname),
        statusCode: response.statusCode,
      });

      if (accessLogsEnabled) {
        console.info(
          JSON.stringify({
            durationMs,
            method: request.method || "GET",
            path: pathname,
            requestId: request.requestId,
            statusCode: response.statusCode,
          })
        );
      }
    });

    routeRequest(request, response).catch((error) => {
      if (response.headersSent) {
        response.end();
        return;
      }

      const errorCode =
        error.code ||
        (typeof error.message === "string" &&
        /^[a-z0-9_:-]+$/.test(error.message)
          ? error.message
          : "internal_server_error");
      const statusCode = error.statusCode || 500;

      if (statusCode >= 500) {
        console.error(error);
      } else if (accessLogsEnabled) {
        console.warn(
          JSON.stringify({
            error: errorCode,
            method: request.method || "GET",
            path: new URL(
              request.url,
              `http://${request.headers.host || "localhost"}`
            ).pathname,
            requestId: request.requestId,
            statusCode,
          })
        );
      }

      sendJson(request, response, statusCode, {
        error: errorCode,
      });
    });
  }
);

let serverStartPromise = null;

export function startArcusApiServer() {
  if (serverStartPromise) {
    return serverStartPromise;
  }

  const configurationWarnings = validateServerConfiguration();

  serverStartPromise = runDatabaseMigrations()
    .then((result) =>
      new Promise((resolve, reject) => {
        server.once("error", reject);
        console.log(`ARCUS storage: ${result.storage}`);
        configurationWarnings.forEach((warning) => {
          console.warn(`ARCUS configuration warning: ${warning}`);
        });
        server.listen(serverPort, () => {
          console.log(
            `ARCUS API listening on http://127.0.0.1:${serverPort}`
          );
          resolve(server);
        });
      })
    )
    .catch((error) => {
      serverStartPromise = null;
      throw error;
    });

  return serverStartPromise;
}

const isDirectExecution =
  process.argv[1] &&
  path.resolve(process.argv[1]) ===
    fileURLToPath(import.meta.url);

if (isDirectExecution) {
  startArcusApiServer().catch((error) => {
    console.error("ARCUS database migration failed", error);
    process.exitCode = 1;
  });
}
