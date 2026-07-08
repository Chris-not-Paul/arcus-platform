import crypto from "node:crypto";
import fs from "node:fs/promises";

import {
  accessRequestsFilePath,
  authDataDir,
} from "./config.js";
import { writeJsonFile } from "./fileStore.js";
import {
  getDatabase,
  isDatabaseEnabled,
} from "./database.js";

const allowedStatuses = new Set([
  "new",
  "reviewed",
  "approved",
  "rejected",
]);

let cachedAccessRequests = null;

function normalizeEmail(value) {
  return String(value || "").trim().toLowerCase();
}

function cleanText(value, maxLength) {
  return String(value || "").trim().slice(0, maxLength);
}

function validateAccessRequest(payload) {
  const email = normalizeEmail(payload.email);

  if (
    !email ||
    email.length > 120 ||
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
  ) {
    const error = new Error("valid_email_required");

    error.statusCode = 400;
    throw error;
  }

  return {
    email,
    message: cleanText(payload.message, 900),
    organization: cleanText(payload.organization, 160),
    role: cleanText(payload.role, 120),
    source: cleanText(payload.source || "account", 60),
  };
}

async function loadAccessRequestFile() {
  if (cachedAccessRequests) {
    return cachedAccessRequests;
  }

  try {
    const content = await fs.readFile(
      accessRequestsFilePath,
      "utf8"
    );
    const parsed = JSON.parse(content);

    cachedAccessRequests = parsed.requests || [];
  } catch (error) {
    if (error.code !== "ENOENT") {
      throw error;
    }

    cachedAccessRequests = [];
  }

  return cachedAccessRequests;
}

async function persistAccessRequestFile(requests) {
  await fs.mkdir(authDataDir, {
    recursive: true,
  });
  await writeJsonFile(accessRequestsFilePath, { requests });
  cachedAccessRequests = requests;
}

function mapDatabaseAccessRequest(row) {
  return {
    createdAt: row.created_at?.toISOString(),
    email: row.email,
    id: row.id,
    message: row.message || "",
    organization: row.organization || "",
    promotedUsername: row.promoted_username || "",
    promotionStatus: row.promotion_status || "",
    requestedByRole: row.requested_by_role || "",
    requestedByUsername: row.requested_by_username || "",
    reviewedAt: row.reviewed_at?.toISOString() || null,
    reviewedByUsername: row.reviewed_by_username || "",
    role: row.requester_role || "",
    source: row.source || "account",
    status: row.status,
    updatedAt: row.updated_at?.toISOString(),
  };
}

export async function createAccessRequest(payload, session = null) {
  const requestPayload = validateAccessRequest(payload);
  const now = new Date().toISOString();
  const requestRecord = {
    ...requestPayload,
    createdAt: now,
    id: `access-${crypto.randomUUID()}`,
    requestedByRole: session?.role || "open",
    requestedByUsername:
      session?.username || requestPayload.email,
    reviewedAt: null,
    reviewedByUsername: "",
    promotedUsername: "",
    promotionStatus: "",
    status: "new",
    updatedAt: now,
  };

  if (isDatabaseEnabled()) {
    const database = await getDatabase();
    const result = await database.query(
      `INSERT INTO access_requests
        (id, email, organization, requester_role, message, source,
         status, requested_by_username, requested_by_role)
        VALUES ($1, $2, $3, $4, $5, $6, 'new', $7, $8)
        RETURNING *`,
      [
        requestRecord.id,
        requestRecord.email,
        requestRecord.organization,
        requestRecord.role,
        requestRecord.message,
        requestRecord.source,
        requestRecord.requestedByUsername,
        requestRecord.requestedByRole,
      ]
    );

    return mapDatabaseAccessRequest(result.rows[0]);
  }

  const requests = await loadAccessRequestFile();

  requests.unshift(requestRecord);
  await persistAccessRequestFile(requests);

  return requestRecord;
}

export async function listAccessRequestsForAdmin(limit = 80) {
  if (isDatabaseEnabled()) {
    const database = await getDatabase();
    const result = await database.query(
      `SELECT * FROM access_requests
       ORDER BY created_at DESC
       LIMIT $1`,
      [Math.max(1, Math.min(Number(limit) || 80, 200))]
    );

    return result.rows.map(mapDatabaseAccessRequest);
  }

  const requests = await loadAccessRequestFile();

  return requests.slice(0, Math.max(1, Math.min(Number(limit) || 80, 200)));
}

export async function updateAccessRequestStatus(
  id,
  status,
  reviewer,
  promotion = {}
) {
  if (!allowedStatuses.has(status)) {
    const error = new Error("invalid_access_request_status");

    error.statusCode = 400;
    throw error;
  }

  if (isDatabaseEnabled()) {
    const database = await getDatabase();
    const result = await database.query(
      `UPDATE access_requests
       SET status = $2,
           reviewed_by_username = $3,
           reviewed_at = CASE WHEN $2 = 'new' THEN NULL ELSE NOW() END,
           promoted_username = $4,
           promotion_status = $5,
           updated_at = NOW()
       WHERE id = $1
       RETURNING *`,
      [
        id,
        status,
        reviewer?.username || "",
        promotion.promotedUsername || "",
        promotion.promotionStatus || "",
      ]
    );

    return result.rows[0]
      ? mapDatabaseAccessRequest(result.rows[0])
      : null;
  }

  const requests = await loadAccessRequestFile();
  const now = new Date().toISOString();
  const index = requests.findIndex((item) => item.id === id);

  if (index < 0) {
    return null;
  }

  requests[index] = {
    ...requests[index],
    reviewedAt: status === "new" ? null : now,
    reviewedByUsername:
      status === "new" ? "" : reviewer?.username || "",
    promotedUsername: promotion.promotedUsername || "",
    promotionStatus: promotion.promotionStatus || "",
    status,
    updatedAt: now,
  };

  await persistAccessRequestFile(requests);

  return requests[index];
}
