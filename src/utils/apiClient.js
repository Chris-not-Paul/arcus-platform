let csrfToken = null;

function createRequestId() {
  if (globalThis.crypto?.randomUUID) {
    return `web-${globalThis.crypto.randomUUID()}`;
  }

  return `web-${Date.now().toString(36)}-${Math.random()
    .toString(36)
    .slice(2)}`;
}

export async function apiJson(path, options = {}) {
  const requestId = options.headers?.["X-Request-ID"] || createRequestId();
  const response = await fetch(path, {
    credentials: "include",
    ...options,
    headers: {
      "X-Request-ID": requestId,
      ...(options.headers || {}),
    },
  });

  if (!response.ok) {
    const error = new Error(
      `ARCUS API request failed: ${response.status} ${path}`
    );

    error.status = response.status;
    throw error;
  }

  return response.json();
}

export function getSession() {
  return apiJson("/api/auth/session").then((session) => {
    csrfToken = session.csrfToken || null;

    return session;
  });
}

export function loginProfessional({
  password,
  username,
}) {
  return apiJson("/api/auth/login", {
    body: JSON.stringify({
      password,
      username,
    }),
    headers: {
      "Content-Type": "application/json",
    },
    method: "POST",
  }).then((session) => {
    csrfToken = session.csrfToken || null;

    return session;
  });
}

export const loginAccount = loginProfessional;

export function registerFreeAccount({
  password,
  username,
}) {
  return apiJson("/api/auth/register", {
    body: JSON.stringify({
      password,
      username,
    }),
    headers: {
      "Content-Type": "application/json",
    },
    method: "POST",
  }).then((session) => {
    csrfToken = session.csrfToken || null;

    return session;
  });
}

export function logoutProfessional() {
  return apiJson("/api/auth/logout", {
    headers: {
      "X-ARCUS-CSRF-Token": csrfToken || "",
    },
    method: "POST",
  }).finally(() => {
    csrfToken = null;
  });
}

export function changeAccountPassword({
  currentPassword,
  newPassword,
}) {
  return apiJson("/api/auth/password", {
    body: JSON.stringify({
      currentPassword,
      newPassword,
    }),
    headers: {
      "Content-Type": "application/json",
      "X-ARCUS-CSRF-Token": csrfToken || "",
    },
    method: "POST",
  }).finally(() => {
    csrfToken = null;
  });
}

export function requestPasswordReset(username) {
  return apiJson("/api/auth/password/request-reset", {
    body: JSON.stringify({ username }),
    headers: {
      "Content-Type": "application/json",
    },
    method: "POST",
  });
}

export function resetPasswordWithToken({
  newPassword,
  token,
}) {
  return apiJson("/api/auth/password/reset", {
    body: JSON.stringify({
      newPassword,
      token,
    }),
    headers: {
      "Content-Type": "application/json",
    },
    method: "POST",
  });
}

export function accountSessions() {
  return apiJson("/api/auth/sessions").then(
    (data) => data.sessions || []
  );
}

export function revokeOtherAccountSessions() {
  return apiJson("/api/auth/sessions/revoke-other", {
    body: JSON.stringify({}),
    headers: {
      "Content-Type": "application/json",
      "X-ARCUS-CSRF-Token": csrfToken || "",
    },
    method: "POST",
  });
}

const openReleaseBaseUrl = "/data/open-release";

async function withTimeout(request, timeoutMs) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await request(controller.signal);
  } finally {
    clearTimeout(timeout);
  }
}

async function openReleaseJson(apiPath, staticFileName) {
  try {
    return await withTimeout(
      (signal) => apiJson(apiPath, { signal }),
      4000
    );
  } catch (apiError) {
    try {
      return await withTimeout(async (signal) => {
        const response = await fetch(
          `${openReleaseBaseUrl}/${staticFileName}`,
          { credentials: "same-origin", signal }
        );

        if (!response.ok) {
          throw new Error(
            `ARCUS Open release fallback failed: ${response.status} ${staticFileName}`
          );
        }

        return response.json();
      }, 15000);
    } catch (fallbackError) {
      fallbackError.cause = apiError;
      throw fallbackError;
    }
  }
}

export function openEvents() {
  return openReleaseJson("/api/open/events", "events.json").then((data) => {
    if (!Array.isArray(data.events)) throw new Error("Invalid Open events response");
    return data.events;
  });
}

export function openSources() {
  return openReleaseJson("/api/open/sources", "sources.json").then((data) => {
    if (!Array.isArray(data.sources)) throw new Error("Invalid Open sources response");
    return data.sources;
  });
}

export function openResource(resource) {
  return openReleaseJson(`/api/open/${resource}`, `${resource}.json`);
}

export function openManifest() {
  return openReleaseJson("/api/open/manifest", "manifest.json").then((data) => {
    if (!data?.version) throw new Error("Invalid Open manifest response");
    return data;
  });
}

export const openDownloadUrls = Object.freeze({
  csv: `${openReleaseBaseUrl}/events.csv`,
  geojson: `${openReleaseBaseUrl}/events.geojson`,
});

export const openResourceUrls = Object.freeze({
  changelog: `${openReleaseBaseUrl}/changelog.json`,
  dataDictionary: `${openReleaseBaseUrl}/data-dictionary.json`,
  idMapping: `${openReleaseBaseUrl}/id-mapping.json`,
  manifest: `${openReleaseBaseUrl}/manifest.json`,
  qualityAudit: `${openReleaseBaseUrl}/quality-audit.json`,
  sources: `${openReleaseBaseUrl}/sources.json`,
  statistics: `${openReleaseBaseUrl}/statistics.json`,
  taxonomy: `${openReleaseBaseUrl}/taxonomy.json`,
});

export function professionalResource(resource) {
  return apiJson(`/api/professional/${resource}`);
}

export function professionalHazardExposurePoint(payload) {
  return apiJson("/api/professional/hazard-exposure/point", {
    body: JSON.stringify(payload),
    headers: {
      "Content-Type": "application/json",
      "X-ARCUS-CSRF-Token": csrfToken || "",
    },
    method: "POST",
  });
}

export function professionalMitigationIntelligence(payload) {
  return apiJson("/api/professional/mitigation-intelligence", {
    body: JSON.stringify(payload),
    headers: {
      "Content-Type": "application/json",
      "X-ARCUS-CSRF-Token": csrfToken || "",
    },
    method: "POST",
  });
}

export function submitFailureLearningFeedback(payload) {
  return apiJson("/api/professional/failure-learning-feedback", {
    body: JSON.stringify(payload),
    headers: {
      "Content-Type": "application/json",
      "X-ARCUS-CSRF-Token": csrfToken || "",
    },
    method: "POST",
  }).then((data) => data.judgement);
}

function filenameFromDisposition(value) {
  const match = String(value || "").match(
    /filename="?([^";]+)"?/
  );

  return match ? match[1] : "arcus-professional-output";
}

export async function downloadProfessionalExport(payload) {
  const response = await fetch("/api/professional/exports", {
    body: JSON.stringify(payload),
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      "X-ARCUS-CSRF-Token": csrfToken || "",
    },
    method: "POST",
  });

  if (!response.ok) {
    const error = new Error(
      `ARCUS Professional export failed: ${response.status}`
    );

    error.status = response.status;
    throw error;
  }

  return {
    blob: await response.blob(),
    dataRelease: response.headers.get("x-arcus-data-release") || "",
    exportId: response.headers.get("x-arcus-export-id") || "",
    filename: filenameFromDisposition(
      response.headers.get("content-disposition")
    ),
  };
}

export function registerProfessionalReport(payload) {
  return apiJson("/api/professional/report-jobs", {
    body: JSON.stringify(payload),
    headers: {
      "Content-Type": "application/json",
      "X-ARCUS-CSRF-Token": csrfToken || "",
    },
    method: "POST",
  });
}

export function completeProfessionalReport(reference, payload) {
  return apiJson(
    `/api/professional/report-jobs/${encodeURIComponent(reference)}/complete`,
    {
      body: JSON.stringify(payload),
      headers: {
        "Content-Type": "application/json",
        "X-ARCUS-CSRF-Token": csrfToken || "",
      },
      method: "POST",
    }
  ).then((data) => data.job);
}

export function professionalReportJob(reference) {
  return apiJson(
    `/api/professional/report-jobs/${encodeURIComponent(reference)}`
  ).then((data) => data.job);
}

export function professionalWorkspaces() {
  return apiJson("/api/professional/workspaces").then(
    (data) => data.workspaces || []
  );
}

export function createProfessionalWorkspace(payload) {
  return apiJson("/api/professional/workspaces", {
    body: JSON.stringify(payload),
    headers: {
      "Content-Type": "application/json",
      "X-ARCUS-CSRF-Token": csrfToken || "",
    },
    method: "POST",
  }).then((data) => data.workspace);
}

export function deleteProfessionalWorkspace(workspaceId) {
  return apiJson(
    `/api/professional/workspaces/${encodeURIComponent(workspaceId)}/delete`,
    {
      body: JSON.stringify({}),
      headers: {
        "Content-Type": "application/json",
        "X-ARCUS-CSRF-Token": csrfToken || "",
      },
      method: "POST",
    }
  );
}

export function professionalAccount() {
  return apiJson("/api/professional/account").then(
    (data) => data.account
  );
}

export function professionalUsage() {
  return apiJson("/api/professional/usage");
}

export function professionalDataRelease() {
  return apiJson("/api/professional/data-release").then(
    (data) => data.release
  );
}

export function professionalExportHistory() {
  return apiJson("/api/professional/exports/recent").then(
    (data) => data.exports || []
  );
}

export function requestProfessionalCancellation() {
  return apiJson("/api/professional/account/cancel", {
    body: JSON.stringify({}),
    headers: {
      "Content-Type": "application/json",
      "X-ARCUS-CSRF-Token": csrfToken || "",
    },
    method: "POST",
  }).then((data) => data.organization);
}

export function resumeProfessionalSubscription() {
  return apiJson("/api/professional/account/resume", {
    body: JSON.stringify({}),
    headers: {
      "Content-Type": "application/json",
      "X-ARCUS-CSRF-Token": csrfToken || "",
    },
    method: "POST",
  }).then((data) => data.organization);
}

export function adminUsers() {
  return apiJson("/api/admin/users").then(
    (data) => data.users || []
  );
}

export function requestProfessionalAccess(payload) {
  return apiJson("/api/access-requests", {
    body: JSON.stringify(payload),
    headers: {
      "Content-Type": "application/json",
    },
    method: "POST",
  }).then((data) => data.request);
}

export function submitExpertContribution(payload) {
  return apiJson("/api/contributions", {
    body: JSON.stringify(payload),
    headers: { "Content-Type": "application/json" },
    method: "POST",
  }).then((data) => data.contribution);
}

export function contributionAcknowledgements() {
  return apiJson("/api/contributions/acknowledgements").then(
    (data) => data.acknowledgements || []
  );
}

export function getExpertContributionStatus(id) {
  return apiJson(
    `/api/contributions/${encodeURIComponent(id)}/status`
  ).then((data) => data.contribution);
}

export function adminContributions() {
  return apiJson("/api/admin/contributions").then(
    (data) => data.contributions || []
  );
}

export function adminFailureLearningFeedback() {
  return apiJson("/api/admin/failure-learning-feedback").then(
    (data) => data.judgements || []
  );
}

export function adminFailureLearningReadiness() {
  return apiJson("/api/admin/failure-learning-readiness").then(
    (data) => data.readiness
  );
}

export async function downloadAdminFailureLearningDataset() {
  const response = await fetch("/api/admin/failure-learning-export", {
    credentials: "include",
    headers: {
      "X-Request-ID": createRequestId(),
    },
  });
  if (!response.ok) {
    const error = new Error(
      `ARCUS Failure Learning export failed: ${response.status}`
    );
    error.status = response.status;
    throw error;
  }
  return {
    blob: await response.blob(),
    filename: filenameFromDisposition(
      response.headers.get("content-disposition")
    ),
  };
}

export function adminUpdateContributionStatus(id, status, reviewNote = "") {
  return apiJson(
    `/api/admin/contributions/${encodeURIComponent(id)}/status`,
    {
      body: JSON.stringify({ reviewNote, status }),
      headers: {
        "Content-Type": "application/json",
        "X-ARCUS-CSRF-Token": csrfToken || "",
      },
      method: "POST",
    }
  ).then((data) => data.contribution);
}

export function adminAccessRequests() {
  return apiJson("/api/admin/access-requests").then(
    (data) => data.requests || []
  );
}

export function adminAuditEvents() {
  return apiJson("/api/admin/audit-events").then(
    (data) => data.events || []
  );
}

export function adminEmailOutbox() {
  return apiJson("/api/admin/email-outbox").then(
    (data) => data.emails || []
  );
}

export function adminApiKeys() {
  return apiJson("/api/admin/api-keys").then(
    (data) => data.apiKeys || []
  );
}

export function adminCreateApiKey(payload) {
  return apiJson("/api/admin/api-keys", {
    body: JSON.stringify(payload),
    headers: {
      "Content-Type": "application/json",
      "X-ARCUS-CSRF-Token": csrfToken || "",
    },
    method: "POST",
  });
}

export function adminRevokeApiKey(id) {
  return apiJson(
    `/api/admin/api-keys/${encodeURIComponent(id)}/revoke`,
    {
      body: JSON.stringify({}),
      headers: {
        "Content-Type": "application/json",
        "X-ARCUS-CSRF-Token": csrfToken || "",
      },
      method: "POST",
    }
  ).then((data) => data.apiKey);
}

export function adminUpdateAccessRequestStatus(id, status) {
  return apiJson(
    `/api/admin/access-requests/${encodeURIComponent(id)}/status`,
    {
      body: JSON.stringify({ status }),
      headers: {
        "Content-Type": "application/json",
        "X-ARCUS-CSRF-Token": csrfToken || "",
      },
      method: "POST",
    }
  ).then((data) => data.request);
}

export function adminSetUserDisabled(username, disabled) {
  return apiJson(
    `/api/admin/users/${encodeURIComponent(username)}/disable`,
    {
      body: JSON.stringify({
        disabled: Boolean(disabled),
      }),
      headers: {
        "Content-Type": "application/json",
        "X-ARCUS-CSRF-Token": csrfToken || "",
      },
      method: "POST",
    }
  );
}

export function adminRevokeUserSessions(username) {
  return apiJson(
    `/api/admin/users/${encodeURIComponent(username)}/sessions`,
    {
      body: JSON.stringify({}),
      headers: {
        "Content-Type": "application/json",
        "X-ARCUS-CSRF-Token": csrfToken || "",
      },
      method: "POST",
    }
  );
}

export function adminResetUserPassword(username, newPassword) {
  return apiJson(
    `/api/admin/users/${encodeURIComponent(username)}/password`,
    {
      body: JSON.stringify({ newPassword }),
      headers: {
        "Content-Type": "application/json",
        "X-ARCUS-CSRF-Token": csrfToken || "",
      },
      method: "POST",
    }
  );
}
