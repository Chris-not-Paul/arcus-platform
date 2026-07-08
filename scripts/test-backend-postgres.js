import fs from "node:fs/promises";
import path from "node:path";

if (!process.env.ARCUS_DATABASE_URL) {
  console.log(
    JSON.stringify({
      ok: true,
      skipped: true,
      reason: "ARCUS_DATABASE_URL is not configured",
    })
  );
  process.exit(0);
}

const runId = `${Date.now()}-${Math.floor(Math.random() * 10000)}`;
const port = 4600 + Math.floor(Math.random() * 200);
const testDataDir = path.resolve(
  ".tmp",
  `backend-postgres-suite-${runId}`
);
const organizationSlug = `arcus-pg-suite-${runId}`;
const professionalUsername = `pg-pro-${runId}@example.test`;
const adminUsername = `pg-admin-${runId}@example.test`;
const freeUsername = `pg-free-${runId}@example.test`;

process.env.ARCUS_API_PORT = String(port);
process.env.ARCUS_PRIVATE_DATA_DIR = testDataDir;
process.env.ARCUS_PROFESSIONAL_USERNAME = professionalUsername;
process.env.ARCUS_PROFESSIONAL_PASSWORD = "pg-professional-password";
process.env.ARCUS_DEFAULT_ORGANIZATION_SLUG = organizationSlug;
process.env.ARCUS_DEFAULT_ORGANIZATION_NAME = `ARCUS PG Suite ${runId}`;
process.env.ARCUS_EMAIL_TRANSPORT = "outbox";
process.env.ARCUS_APP_BASE_URL = `http://127.0.0.1:${port}`;

const { closeDatabase, getDatabase } = await import("../server/database.js");
const { startArcusApiServer } = await import("../server/server.js");
const { upsertUser } = await import("../server/userStore.js");

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
        event_id: "BPG.00.01",
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
        event_id: "BPG.00.01",
        publication_date: "2024-01-02",
        source_role: "primary",
        source_title: "Postgres bridge event",
        source_type: "news",
        source_url: "https://example.test/postgres",
      },
    ],
    null,
    2
  )}\n`,
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

async function getJson(pathname, session = null) {
  return json(
    await fetch(`${base}${pathname}`, {
      headers: session ? { Cookie: session.cookie } : {},
    })
  );
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

async function cleanupDatabase() {
  const database = await getDatabase();
  const organization = await database.query(
    "SELECT id FROM organizations WHERE slug = $1",
    [organizationSlug]
  );
  const organizationId = organization.rows[0]?.id;

  await database.query(
    "DELETE FROM access_requests WHERE email = ANY($1::text[])",
    [[freeUsername, adminUsername, professionalUsername]]
  );
  await database.query(
    "DELETE FROM password_reset_tokens WHERE username = ANY($1::text[])",
    [[freeUsername, adminUsername, professionalUsername]]
  );

  if (!organizationId) {
    return;
  }

  await database.query(
    "DELETE FROM audit_events WHERE organization_id = $1",
    [organizationId]
  );
  await database.query(
    "DELETE FROM export_records WHERE organization_id = $1",
    [organizationId]
  );
  await database.query(
    "DELETE FROM usage_quotas WHERE organization_id = $1",
    [organizationId]
  );
  await database.query(
    "DELETE FROM report_jobs WHERE organization_id = $1",
    [organizationId]
  );
  await database.query(
    "DELETE FROM workspaces WHERE organization_id = $1",
    [organizationId]
  );
  await database.query(
    "DELETE FROM api_keys WHERE organization_id = $1",
    [organizationId]
  );
  await database.query(
    "DELETE FROM sessions WHERE organization_id = $1",
    [organizationId]
  );
  await database.query(
    "DELETE FROM users WHERE organization_id = $1",
    [organizationId]
  );
  await database.query("DELETE FROM organizations WHERE id = $1", [
    organizationId,
  ]);
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

let server = null;

try {
  server = await startArcusApiServer();

  await upsertUser({
    password: "pg-admin-password",
    role: "admin",
    username: adminUsername,
  });

  const health = await getJson("/api/health");

  assert(health.storage === "postgres", "health does not report postgres");

  const adminSession = await login(adminUsername, "pg-admin-password");
  const registered = await json(
    await postJson("/api/auth/register", {
      password: "pg-free-password",
      username: freeUsername,
    })
  );

  assert(registered.role === "free", "postgres free registration failed");

  const accessRequest = await json(
    await postJson("/api/access-requests", {
      email: freeUsername,
      message: "Postgres suite needs Professional access.",
      organization: "ARCUS PostgreSQL Suite",
      role: "Technical user",
    })
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
    "postgres access request was not promoted"
  );

  const professionalSession = await login(
    freeUsername,
    "pg-free-password"
  );

  assert(
    professionalSession.permissions.includes("professional:read"),
    "postgres promoted user lacks professional read"
  );

  const resetRequest = await json(
    await postJson("/api/auth/password/request-reset", {
      username: freeUsername,
    })
  );

  assert(resetRequest.accepted === true, "postgres reset not accepted");

  const outbox = await getJson("/api/admin/email-outbox", adminSession);
  const resetEmail = outbox.emails.find(
    (email) =>
      email.template === "password-reset" &&
      email.to === freeUsername
  );
  const resetToken = resetEmail?.metadata?.resetUrl
    ? new URL(resetEmail.metadata.resetUrl).searchParams.get("resetToken")
    : "";

  assert(Boolean(resetToken), "postgres reset email token missing");

  const reset = await json(
    await postJson("/api/auth/password/reset", {
      newPassword: "pg-free-password-2",
      token: resetToken,
    })
  );

  assert(reset.passwordReset === true, "postgres reset failed");
  assert(
    (await loginStatus(freeUsername, "pg-free-password")) === 401,
    "postgres old password still works"
  );

  const rotatedSession = await login(freeUsername, "pg-free-password-2");
  const apiKey = await json(
    await postJson(
      "/api/admin/api-keys",
      {
        label: "Postgres suite integration",
        permissions: ["professional:read", "professional:export"],
      },
      adminSession
    )
  );

  assert(apiKey.key?.startsWith("arcus_"), "postgres api key missing");

  const exportResponse = await fetch(`${base}/api/professional/exports`, {
    body: JSON.stringify({
      scope: { province: "Ancona" },
      type: "territory-brief",
    }),
    headers: {
      "Content-Type": "application/json",
      Cookie: rotatedSession.cookie,
      "X-ARCUS-CSRF-Token": rotatedSession.csrfToken,
    },
    method: "POST",
  });

  assert(exportResponse.status === 200, "postgres export failed");

  const exportHistory = await getJson(
    "/api/professional/exports/recent",
    rotatedSession
  );

  assert(
    exportHistory.exports.length >= 1,
    "postgres export history missing"
  );

  const audit = await getJson("/api/admin/audit-events", adminSession);

  assert(
    audit.events.some(
      (event) => event.event === "password_reset_completed"
    ),
    "postgres reset audit missing"
  );

  console.log(
    JSON.stringify({
      ok: true,
      checks: [
        "postgres-migrations",
        "postgres-health",
        "postgres-registration",
        "postgres-access-promotion",
        "postgres-password-reset",
        "postgres-api-key",
        "postgres-export-history",
        "postgres-audit",
      ],
    })
  );
} finally {
  if (server) {
    await new Promise((resolve) => server.close(resolve));
  }

  try {
    await cleanupDatabase();
  } finally {
    await closeDatabase();
    await fs.rm(testDataDir, {
      force: true,
      recursive: true,
    });
  }
}
