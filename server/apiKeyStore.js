import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";

import { authDataDir } from "./config.js";
import {
  getDatabase,
  isDatabaseEnabled,
} from "./database.js";
import { writeJsonFile } from "./fileStore.js";
import {
  ensureDefaultOrganization,
  getOrganizationAccount,
  organizationIsActive,
} from "./organizationService.js";

const apiKeysFilePath = path.join(authDataDir, "api-keys.json");
const allowedApiKeyPermissions = new Set([
  "professional:read",
  "professional:export",
  "professional:report",
]);
let cachedApiKeys = null;
let writeQueue = Promise.resolve();

function hashApiKey(value) {
  return crypto
    .createHash("sha256")
    .update(String(value))
    .digest("hex");
}

function generateApiKey() {
  return `arcus_${crypto.randomBytes(32).toString("base64url")}`;
}

function cleanLabel(value) {
  return String(value || "").trim().slice(0, 120);
}

function normalizePermissions(value) {
  const permissions = Array.isArray(value)
    ? value
    : ["professional:read"];
  const normalized = [
    ...new Set(
      permissions
        .map((permission) => String(permission || "").trim())
        .filter((permission) =>
          allowedApiKeyPermissions.has(permission)
        )
    ),
  ];

  return normalized.length ? normalized : ["professional:read"];
}

function normalizeApiKeyRecord(record) {
  return {
    createdAt: record.created_at?.toISOString?.() || record.createdAt,
    expiresAt: record.expires_at?.toISOString?.() || record.expiresAt || null,
    id: record.id,
    label: record.label,
    organizationId: record.organization_id || record.organizationId,
    permissions: record.permissions || [],
    revokedAt: record.revoked_at?.toISOString?.() || record.revokedAt || null,
  };
}

async function loadApiKeys() {
  if (cachedApiKeys) {
    return cachedApiKeys;
  }

  try {
    const content = await fs.readFile(apiKeysFilePath, "utf8");
    const parsed = JSON.parse(content);

    cachedApiKeys = parsed.apiKeys || [];
  } catch (error) {
    if (error.code !== "ENOENT") {
      throw error;
    }

    cachedApiKeys = [];
  }

  return cachedApiKeys;
}

async function persistApiKeys(apiKeys) {
  cachedApiKeys = apiKeys;
  writeQueue = writeQueue.then(() =>
    writeJsonFile(apiKeysFilePath, { apiKeys })
  );

  return writeQueue;
}

export async function createApiKey(session, payload = {}) {
  const label = cleanLabel(payload.label);

  if (!label) {
    const error = new Error("api_key_label_required");

    error.statusCode = 400;
    throw error;
  }

  const key = generateApiKey();
  const record = {
    createdAt: new Date().toISOString(),
    expiresAt: payload.expiresAt || null,
    id: `key-${crypto.randomUUID()}`,
    keyHash: hashApiKey(key),
    label,
    organizationId: session.organizationId || "org-local-arcus",
    permissions: normalizePermissions(payload.permissions),
    revokedAt: null,
  };

  if (isDatabaseEnabled()) {
    const database = await getDatabase();

    await database.query(
      `INSERT INTO api_keys
        (id, organization_id, label, key_hash, permissions, expires_at)
        VALUES ($1, $2, $3, $4, $5::jsonb, $6)`,
      [
        record.id,
        record.organizationId,
        record.label,
        record.keyHash,
        JSON.stringify(record.permissions),
        record.expiresAt,
      ]
    );
  } else {
    const apiKeys = await loadApiKeys();

    await persistApiKeys([record, ...apiKeys]);
  }

  return {
    key,
    record: normalizeApiKeyRecord(record),
  };
}

export async function listApiKeysForAdmin(session) {
  if (isDatabaseEnabled()) {
    const database = await getDatabase();
    const result = await database.query(
      `SELECT id, organization_id, label, permissions, expires_at, revoked_at, created_at
        FROM api_keys
        WHERE organization_id = $1
        ORDER BY created_at DESC`,
      [session.organizationId]
    );

    return result.rows.map(normalizeApiKeyRecord);
  }

  const apiKeys = await loadApiKeys();

  return apiKeys
    .filter(
      (record) =>
        record.organizationId ===
        (session.organizationId || "org-local-arcus")
    )
    .map(normalizeApiKeyRecord);
}

export async function revokeApiKey(session, keyId) {
  if (isDatabaseEnabled()) {
    const database = await getDatabase();
    const result = await database.query(
      `UPDATE api_keys
        SET revoked_at = NOW()
        WHERE id = $1 AND organization_id = $2
        RETURNING id, organization_id, label, permissions, expires_at, revoked_at, created_at`,
      [keyId, session.organizationId]
    );

    return result.rows[0]
      ? normalizeApiKeyRecord(result.rows[0])
      : null;
  }

  const apiKeys = await loadApiKeys();
  const index = apiKeys.findIndex(
    (record) =>
      record.id === keyId &&
      record.organizationId ===
        (session.organizationId || "org-local-arcus")
  );

  if (index === -1) {
    return null;
  }

  const updated = {
    ...apiKeys[index],
    revokedAt: new Date().toISOString(),
  };
  const nextApiKeys = [...apiKeys];

  nextApiKeys[index] = updated;
  await persistApiKeys(nextApiKeys);

  return normalizeApiKeyRecord(updated);
}

function apiKeyFromRequest(request) {
  const authorization = String(request.headers.authorization || "");
  const bearer = authorization.match(/^Bearer\s+(.+)$/i);

  return String(
    request.headers["x-arcus-api-key"] ||
      bearer?.[1] ||
      ""
  ).trim();
}

export async function authenticateApiKeyRequest(request) {
  const key = apiKeyFromRequest(request);

  if (!key) {
    return null;
  }

  const keyHash = hashApiKey(key);
  let record;

  if (isDatabaseEnabled()) {
    const database = await getDatabase();
    const result = await database.query(
      `SELECT id, organization_id, label, permissions, expires_at, revoked_at, created_at
        FROM api_keys
        WHERE key_hash = $1`,
      [keyHash]
    );

    record = result.rows[0]
      ? normalizeApiKeyRecord(result.rows[0])
      : null;
  } else {
    record = (await loadApiKeys())
      .map(normalizeApiKeyRecordWithHash)
      .find((item) => item.keyHash === keyHash);
  }

  if (!record || record.revokedAt) {
    return null;
  }

  if (record.expiresAt && new Date(record.expiresAt).getTime() <= Date.now()) {
    return null;
  }

  const organization = isDatabaseEnabled()
    ? await getOrganizationAccount(record.organizationId)
    : await ensureDefaultOrganization();

  if (!organizationIsActive(organization)) {
    return null;
  }

  return {
    apiKeyId: record.id,
    apiKeyLabel: record.label,
    csrfToken: null,
    exportLimit: organization.exportLimit,
    id: `api-key:${record.id}`,
    organizationId: organization.id,
    organizationName: organization.name,
    organizationPlan: organization.plan,
    organizationStatus: organization.status,
    permissions: record.permissions,
    role: "api",
    userId: record.id,
    username: `api-key:${record.label}`,
  };
}

function normalizeApiKeyRecordWithHash(record) {
  return {
    ...normalizeApiKeyRecord(record),
    keyHash: record.keyHash,
  };
}
