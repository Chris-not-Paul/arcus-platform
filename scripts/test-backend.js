import fs from "node:fs/promises";
import path from "node:path";

const port = 4300 + Math.floor(Math.random() * 200);
const testDataDir = path.resolve(
  ".tmp",
  `backend-suite-${Date.now()}`
);

process.env.ARCUS_API_PORT = String(port);
process.env.ARCUS_PRIVATE_DATA_DIR = testDataDir;
process.env.ARCUS_PROFESSIONAL_USERNAME = "suite-pro@example.test";
process.env.ARCUS_PROFESSIONAL_PASSWORD = "suite-professional-password";

const { startArcusApiServer } = await import("../server/server.js");
const { upsertUser } = await import("../server/userStore.js");
const { createBackup } = await import("../server/backupService.js");

const base = `http://127.0.0.1:${port}`;

await fs.mkdir(path.join(testDataDir, "processed"), {
  recursive: true,
});
await fs.writeFile(
  path.join(testDataDir, "processed", "events.json"),
  `${JSON.stringify(
    [
      {
        cause_category: "hydraulic",
        collapse_severity: "Partial",
        date: "2024-01-01",
        event_id: "B00.00.01",
        latitude: 43.6158,
        longitude: 13.5189,
        municipality: "Ancona",
        province: "Ancona",
        region: "Marche",
        specific_cause: "scour",
        triggered: true,
        victims: 0,
      },
    ],
    null,
    2
  )}\n`,
  "utf8"
);
await fs.writeFile(
  path.join(testDataDir, "processed", "sources.json"),
  `${JSON.stringify(
    [
      {
        event_id: "B00.00.01",
        publication_date: "2024-01-02",
        source_role: "primary",
        source_title: "Ancona bridge event",
        source_type: "news",
        source_url: "https://example.test/ancona",
      },
    ],
    null,
    2
  )}\n`,
  "utf8"
);
await fs.mkdir(path.join(testDataDir, "professional"), {
  recursive: true,
});
const mitigationFixtureEvents = [1, 2, 3].map((index) => ({
  date: `${2018 + index * 2}-01-01`,
  event_id: `B00.00.0${index}`,
  hydraulic_intelligence: {
    component_involved: "pier_foundation",
    evidence_level: "documented",
    failure_process: "scour",
    trigger: "flood",
  },
  province: "Ancona",
  specific_cause: "Hydraulic",
}));
const mitigationFixtureSources = mitigationFixtureEvents.map((event, index) => ({
  event_id: event.event_id,
  source_id: `S00.00.0${index + 1}`,
}));

await fs.writeFile(
  path.join(testDataDir, "professional", "professional-events.json"),
  `${JSON.stringify({ events: mitigationFixtureEvents }, null, 2)}\n`,
  "utf8"
);
await fs.writeFile(
  path.join(testDataDir, "professional", "professional-sources.json"),
  `${JSON.stringify({ sources: mitigationFixtureSources }, null, 2)}\n`,
  "utf8"
);
await fs.mkdir(
  path.join(testDataDir, "professional", "collapse-intelligence"),
  {
    recursive: true,
  }
);
await fs.writeFile(
  path.join(
    testDataDir,
    "professional",
    "collapse-intelligence",
    "collapse-hazard-signatures.json"
  ),
  `${JSON.stringify({ signatures: [] }, null, 2)}\n`,
  "utf8"
);
await fs.writeFile(
  path.join(
    testDataDir,
    "professional",
    "collapse-intelligence",
    "historical-hazard-signatures.json"
  ),
  `${JSON.stringify({ signatures: [] }, null, 2)}\n`,
  "utf8"
);

async function json(response) {
  const payload = await response.json();

  if (!response.ok) {
    const error = new Error(
      `${response.status} ${JSON.stringify(payload)}`
    );

    error.payload = payload;
    error.status = response.status;
    throw error;
  }

  return payload;
}

async function postJson(pathname, payload, session = null) {
  return fetch(`${base}${pathname}`, {
    body: JSON.stringify(payload),
    headers: {
      "Content-Type": "application/json",
      ...(session
        ? {
            Cookie: session.cookie,
            "X-ARCUS-CSRF-Token": session.csrfToken,
          }
        : {}),
    },
    method: "POST",
  });
}

async function login(username, password) {
  const response = await postJson("/api/auth/login", {
    password,
    username,
  });
  const payload = await json(response);

  return {
    ...payload,
    cookie: response.headers.get("set-cookie").split(";")[0],
  };
}

async function loginStatus(username, password) {
  const response = await postJson("/api/auth/login", {
    password,
    username,
  });

  return response.status;
}

async function getJson(pathname, session) {
  return json(
    await fetch(`${base}${pathname}`, {
      headers: session ? { Cookie: session.cookie } : {},
    })
  );
}

async function getStatus(pathname, session) {
  const response = await fetch(`${base}${pathname}`, {
    headers: session ? { Cookie: session.cookie } : {},
  });

  return response.status;
}

async function postDownload(pathname, payload, session) {
  return fetch(`${base}${pathname}`, {
    body: JSON.stringify(payload),
    headers: {
      "Content-Type": "application/json",
      Cookie: session.cookie,
      "X-ARCUS-CSRF-Token": session.csrfToken,
    },
    method: "POST",
  });
}

async function getJsonWithApiKey(pathname, apiKey) {
  return json(
    await fetch(`${base}${pathname}`, {
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
    })
  );
}

async function postDownloadWithApiKey(pathname, payload, apiKey) {
  return fetch(`${base}${pathname}`, {
    body: JSON.stringify(payload),
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    method: "POST",
  });
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

const p4Point = {
  latitude: 40.10005714,
  longitude: 16.00375,
};

function hazardFeatureCollection(features = []) {
  return {
    features,
    type: "FeatureCollection",
  };
}

function p4LandslideFeature() {
  return {
    geometry: {
      coordinates: [
        [
          [15.99, 40.09],
          [16.02, 40.09],
          [16.02, 40.11],
          [15.99, 40.11],
          [15.99, 40.09],
        ],
      ],
      type: "Polygon",
    },
    properties: {
      cod_per_it: 4,
      id: "mock-p4",
    },
    type: "Feature",
  };
}

async function withMockedHazardFetch(callback) {
  const originalFetch = globalThis.fetch;

  globalThis.fetch = async (url, options) => {
    const value = new URL(url.toString());
    const layerName =
      value.searchParams.get("typeNames") ||
      value.searchParams.get("typeName");

    if (
      layerName === "idrogeo:pericolosita_frane" ||
      String(url).includes("pericolosita_frane")
    ) {
      return new Response(
        JSON.stringify(hazardFeatureCollection([p4LandslideFeature()])),
        {
          headers: {
            "Content-Type": "application/json",
          },
          status: 200,
        }
      );
    }

    if (String(layerName || "").startsWith("nz1:aree_peric_idraulica")) {
      return new Response(JSON.stringify(hazardFeatureCollection()), {
        headers: {
          "Content-Type": "application/json",
        },
        status: 200,
      });
    }

    return originalFetch(url, options);
  };

  try {
    return await callback();
  } finally {
    globalThis.fetch = originalFetch;
  }
}

await upsertUser({
  password: "suite-admin-password",
  role: "admin",
  username: "suite-admin@example.test",
});

const server = await startArcusApiServer();

try {
  const freeRegistration = await json(
    await postJson("/api/auth/register", {
      password: "suite-free-password",
      username: "suite-free@example.test",
    })
  );

  assert(freeRegistration.role === "free", "free registration failed");
  assert(
    freeRegistration.permissions.length === 0,
    "free user received Professional permissions"
  );

  const accessRequest = await json(
    await postJson("/api/access-requests", {
      email: "suite-free@example.test",
      message: "Need Professional access for backend suite.",
      organization: "ARCUS Test Suite",
      role: "Technical user",
    })
  );

  const adminSession = await login(
    "suite-admin@example.test",
    "suite-admin-password"
  );

  const approved = await json(
    await postJson(
      `/api/admin/access-requests/${encodeURIComponent(accessRequest.request.id)}/status`,
      { status: "approved" },
      adminSession
    )
  );

  assert(
    approved.request.promotionStatus === "promoted",
    "approved request did not promote user"
  );

  const promotedSession = await login(
    "suite-free@example.test",
    "suite-free-password"
  );

  assert(
    promotedSession.role === "professional",
    "promoted user cannot log in as Professional"
  );
  assert(
    promotedSession.permissions.includes("professional:report"),
    "promoted user lacks report permission"
  );

  const mitigationUnauthorized = await postJson(
    "/api/professional/mitigation-intelligence",
    {}
  );
  assert(
    mitigationUnauthorized.status === 401,
    "mitigation endpoint allowed an unauthenticated request"
  );

  const mitigation = await json(
    await postJson(
      "/api/professional/mitigation-intelligence",
      {
        official_exposure: {
          hydraulic: {
            highest_class: "P2",
            matched_classes: ["P2"],
            status: "available",
          },
        },
        project_context: "bridge",
        project_location: {
          derived_province: "Ancona",
          latitude: 43.6158,
          longitude: 13.5189,
          validated: true,
        },
      },
      promotedSession
    )
  );
  assert(mitigation.status === "limited_evidence", "mitigation endpoint did not preserve the episode-aware limited result");
  assert(mitigation.strategies[0].process === "hydraulic_process_not_resolved", "mitigation endpoint returned the wrong episode-aware fallback");
  assert(mitigation.evidence_cohort.event_count === 3, "mitigation endpoint used the wrong evidence cohort");
  assert(mitigation.evidence_cohort.episode_count === 3, "mitigation endpoint used the wrong independent-episode count");

  const passwordChange = await json(
    await postJson(
      "/api/auth/password",
      {
        currentPassword: "suite-free-password",
        newPassword: "suite-free-password-2",
      },
      promotedSession
    )
  );

  assert(
    passwordChange.passwordChanged === true,
    "self-service password change failed"
  );
  assert(
    (await loginStatus(
      "suite-free@example.test",
      "suite-free-password"
    )) === 401,
    "old password still works after password change"
  );

  const rotatedSession = await login(
    "suite-free@example.test",
    "suite-free-password-2"
  );
  const secondarySession = await login(
    "suite-free@example.test",
    "suite-free-password-2"
  );
  const activeSessions = await getJson(
    "/api/auth/sessions",
    rotatedSession
  );

  assert(
    activeSessions.sessions.length >= 2,
    "active session list does not include multiple sessions"
  );
  assert(
    activeSessions.sessions.some((session) => session.current),
    "active session list does not mark the current session"
  );

  const revokedOtherSessions = await json(
    await postJson(
      "/api/auth/sessions/revoke-other",
      {},
      rotatedSession
    )
  );

  assert(
    revokedOtherSessions.revokedSessions >= 1,
    "other sessions were not revoked"
  );
  assert(
    (await getStatus("/api/professional/usage", secondarySession)) === 401,
    "revoked secondary session still has access"
  );
  assert(
    (await getStatus("/api/professional/usage", rotatedSession)) === 200,
    "current session was revoked unexpectedly"
  );

  const resetRequest = await json(
    await postJson("/api/auth/password/request-reset", {
      username: "suite-free@example.test",
    })
  );

  assert(
    resetRequest.accepted === true,
    "password reset request was not accepted"
  );

  const emailOutbox = await getJson(
    "/api/admin/email-outbox",
    adminSession
  );
  const resetEmail = emailOutbox.emails.find(
    (email) =>
      email.template === "password-reset" &&
      email.to === "suite-free@example.test"
  );
  const resetUrl = resetEmail?.metadata?.resetUrl;
  const resetToken = resetUrl
    ? new URL(resetUrl).searchParams.get("resetToken")
    : "";

  assert(Boolean(resetToken), "password reset email did not include token");

  const selfServiceReset = await json(
    await postJson("/api/auth/password/reset", {
      newPassword: "suite-free-password-3",
      token: resetToken,
    })
  );

  assert(
    selfServiceReset.passwordReset === true,
    "password reset token did not change the password"
  );
  assert(
    (await getStatus("/api/professional/usage", rotatedSession)) === 401,
    "password reset did not revoke active sessions"
  );
  assert(
    (await loginStatus(
      "suite-free@example.test",
      "suite-free-password-2"
    )) === 401,
    "pre-reset password still works after token reset"
  );

  const reusedReset = await postJson("/api/auth/password/reset", {
    newPassword: "suite-free-password-reused",
    token: resetToken,
  });

  assert(
    reusedReset.status === 400,
    "password reset token was reusable"
  );

  const resetFlowSession = await login(
    "suite-free@example.test",
    "suite-free-password-3"
  );

  await withMockedHazardFetch(async () => {
    const landslideOnly = await json(
      await postJson(
        "/api/professional/hazard-exposure/point",
        {
          ...p4Point,
          bypassCache: true,
          hazards: ["landslide"],
        },
        resetFlowSession
      )
    );

    assert(
      landslideOnly.landslide.status === "available",
      `landslide-only endpoint did not return available: ${JSON.stringify(landslideOnly.landslide)}`
    );
    assert(
      landslideOnly.landslide.highest_hazard_class === "P4",
      "landslide-only endpoint did not preserve P4"
    );
    assert(
      landslideOnly.landslide.normalized_score === null,
      "landslide-only endpoint assigned a normalized score"
    );
    assert(
      typeof landslideOnly.request_id === "string" &&
        landslideOnly.request_id.length >= 8,
      "landslide-only endpoint did not expose request_id"
    );

    const multiHazard = await json(
      await postJson(
        "/api/professional/hazard-exposure/point",
        {
          ...p4Point,
          bypassCache: true,
          hazards: ["hydraulic", "landslide"],
        },
        resetFlowSession
      )
    );

    assert(
      multiHazard.hydraulic.status === "no_intersection",
      "multi-hazard endpoint did not preserve hydraulic no_intersection"
    );
    assert(
      multiHazard.landslide.status === "available",
      "multi-hazard endpoint did not return landslide available"
    );
    assert(
      multiHazard.landslide.highest_hazard_class === "P4",
      "multi-hazard endpoint did not preserve landslide P4"
    );
    assert(
      typeof multiHazard.request_id === "string" &&
        multiHazard.query.request_id === multiHazard.request_id,
      "multi-hazard endpoint did not preserve query request_id"
    );
    assert(
      multiHazard.query.hazards.includes("hydraulic") &&
        multiHazard.query.hazards.includes("landslide"),
      "multi-hazard endpoint did not echo requested hazards"
    );
  });

  const exportResponse = await postDownload(
    "/api/professional/exports",
    {
      scope: { province: "Ancona" },
      type: "territory-brief",
    },
    resetFlowSession
  );
  const exportContent = await exportResponse.text();

  assert(exportResponse.status === 200, "professional export failed");
  assert(
    /^exp-/.test(exportResponse.headers.get("x-arcus-export-id") || ""),
    "professional export id header missing"
  );
  assert(
    Boolean(exportResponse.headers.get("x-arcus-data-release")),
    "professional export data release header missing"
  );
  assert(
    exportContent.includes("Export id: exp-") &&
      exportContent.includes("Data release: ") &&
      exportContent.includes("B00.00.01"),
    "professional export content lacks traceability metadata"
  );
  const dataRelease = await getJson(
    "/api/professional/data-release",
    resetFlowSession
  );

  assert(
    Boolean(dataRelease.release?.id),
    "professional data release endpoint returned no release id"
  );

  const exportHistory = await getJson(
    "/api/professional/exports/recent",
    resetFlowSession
  );

  assert(
    exportHistory.exports.some(
      (item) =>
        item.exportId ===
        exportResponse.headers.get("x-arcus-export-id")
    ),
    "professional export history does not include generated export"
  );

  const createdApiKey = await json(
    await postJson(
      "/api/admin/api-keys",
      {
        label: "Backend suite integration",
        permissions: ["professional:read", "professional:export"],
      },
      adminSession
    )
  );

  assert(
    createdApiKey.key?.startsWith("arcus_"),
    "api key secret was not returned at creation"
  );
  assert(
    createdApiKey.apiKey.permissions.includes("professional:read"),
    "api key permissions were not persisted"
  );

  const apiKeyRelease = await getJsonWithApiKey(
    "/api/professional/data-release",
    createdApiKey.key
  );

  assert(
    Boolean(apiKeyRelease.release?.id),
    "api key could not read professional data release"
  );

  const apiKeyExport = await postDownloadWithApiKey(
    "/api/professional/exports",
    {
      scope: { province: "Ancona" },
      type: "gis-summary",
    },
    createdApiKey.key
  );

  assert(
    apiKeyExport.status === 200,
    "api key could not generate controlled export"
  );

  const listedApiKeys = await getJson(
    "/api/admin/api-keys",
    adminSession
  );

  assert(
    listedApiKeys.apiKeys.some(
      (item) => item.id === createdApiKey.apiKey.id
    ),
    "created api key is missing from admin list"
  );

  const revokedApiKey = await json(
    await postJson(
      `/api/admin/api-keys/${encodeURIComponent(createdApiKey.apiKey.id)}/revoke`,
      {},
      adminSession
    )
  );

  assert(revokedApiKey.revoked === true, "api key was not revoked");

  const revokedApiKeyResponse = await fetch(
    `${base}/api/professional/data-release`,
    {
      headers: {
        Authorization: `Bearer ${createdApiKey.key}`,
      },
    }
  );

  assert(
    revokedApiKeyResponse.status === 401,
    "revoked api key still has professional access"
  );

  const createdJob = await json(
    await postJson(
      "/api/professional/report-jobs",
      {
        path: "path-01",
        territory: "Ancona",
        variant: "brief",
      },
      resetFlowSession
    )
  );

  assert(createdJob.status === "queued", "report job is not queued");

  const completedJob = await json(
    await postJson(
      `/api/professional/report-jobs/${encodeURIComponent(createdJob.reference)}/complete`,
      {
        filename: "arcus-suite.pdf",
        outputType: "pdf",
        variant: "brief",
      },
      resetFlowSession
    )
  );

  assert(
    completedJob.job.status === "completed",
    "report job was not completed"
  );

  const jobDetail = await getJson(
    `/api/professional/report-jobs/${encodeURIComponent(createdJob.reference)}`,
    resetFlowSession
  );

  assert(
    jobDetail.job.status === "completed",
    "report job detail does not reflect completion"
  );

  for (let index = 0; index < 9; index += 1) {
    await json(
      await postJson(
        "/api/professional/report-jobs",
        {
          path: "path-01",
          territory: `Quota ${index}`,
          variant: "brief",
        },
        resetFlowSession
      )
    );
  }

  const quotaResponse = await postJson(
    "/api/professional/report-jobs",
    {
      path: "path-01",
      territory: "Quota overflow",
      variant: "brief",
    },
    resetFlowSession
  );
  const quotaPayload = await quotaResponse.json();

  assert(quotaResponse.status === 429, "quota overflow was not rejected");
  assert(
    quotaPayload.error === "quota_exceeded",
    "quota overflow returned wrong error"
  );

  const audit = await getJson("/api/admin/audit-events", adminSession);

  assert(
    audit.events.some(
      (event) => event.event === "professional_report_completed"
    ),
    "completed report audit event missing"
  );

  await createBackup({
    label: "backend-suite",
  });

  const opsStatus = await getJson("/api/admin/ops/status", adminSession);

  assert(
    opsStatus.ok === true,
    "operational status is not healthy enough"
  );
  assert(
    opsStatus.checks.some((item) => item.key === "backup_freshness"),
    "operational status lacks backup freshness check"
  );
  assert(
    opsStatus.checks.some(
      (item) => item.key === "hydraulic_observation_store"
    ),
    "operational status lacks hydraulic observation store check"
  );
  assert(
    opsStatus.hydraulicObservationStore?.ok === true,
    "hydraulic observation store is not reachable"
  );
  assert(
    opsStatus.checks.some(
      (item) => item.key === "landslide_observation_store"
    ),
    "operational status lacks landslide observation store check"
  );
  assert(
    opsStatus.landslideObservationStore?.ok === true,
    "landslide observation store is not reachable"
  );
  assert(
    opsStatus.backup.ok === true,
    "fresh backup was not detected"
  );

  const metricsResponse = await fetch(`${base}/api/admin/metrics`, {
    headers: { Cookie: adminSession.cookie },
  });
  const metricsText = await metricsResponse.text();

  assert(metricsResponse.status === 200, "admin metrics unavailable");
  assert(
    metricsText.includes("arcus_backup_fresh"),
    "operational backup metric missing"
  );
  assert(
    metricsText.includes("arcus_hydraulic_observation_count"),
    "operational hydraulic observation metric missing"
  );
  assert(
    metricsText.includes("arcus_landslide_observation_count"),
    "operational landslide observation metric missing"
  );

  const passwordReset = await json(
    await postJson(
      "/api/admin/users/suite-free%40example.test/password",
      { newPassword: "suite-free-password-admin-reset" },
      adminSession
    )
  );

  assert(
    passwordReset.passwordReset === true,
    "admin password reset failed"
  );

  const staleSessionResponse = await fetch(
    `${base}/api/professional/usage`,
    {
      headers: { Cookie: resetFlowSession.cookie },
    }
  );

  assert(
    staleSessionResponse.status === 401,
    "admin password reset did not revoke existing sessions"
  );
  assert(
    (await loginStatus(
      "suite-free@example.test",
      "suite-free-password-3"
    )) === 401,
    "pre-reset password still works"
  );

  const resetSession = await login(
    "suite-free@example.test",
    "suite-free-password-admin-reset"
  );

  assert(
    resetSession.role === "professional",
    "user cannot log in after admin password reset"
  );

  console.log(
    JSON.stringify({
      ok: true,
      checks: [
        "free-registration",
        "access-request-promotion",
        "entitlements",
        "password-change",
        "self-session-management",
        "password-reset-email",
        "hazard-endpoint-p4",
        "mitigation-intelligence-endpoint",
        "controlled-export-traceability",
        "data-release-export-history",
        "api-key-machine-access",
        "report-job-lifecycle",
        "quota-boundary",
        "operational-status",
        "admin-password-reset",
        "audit-events",
      ],
    })
  );
} finally {
  await new Promise((resolve) => server.close(resolve));
  await fs.rm(testDataDir, {
    force: true,
    recursive: true,
  });
}
