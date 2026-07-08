import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";

import { authDataDir } from "./config.js";
import { writeJsonFile } from "./fileStore.js";
import {
  getDatabase,
  isDatabaseEnabled,
} from "./database.js";

const workspacesFilePath = path.join(
  authDataDir,
  "workspaces.json"
);
let cachedWorkspaces = null;
let writeQueue = Promise.resolve();

function normalizeWorkspace(payload = {}) {
  const name = String(payload.name || "").trim().slice(0, 120);

  if (!name) {
    const error = new Error("workspace_name_required");

    error.code = "workspace_name_required";
    error.statusCode = 400;
    throw error;
  }

  const serialized = JSON.stringify(payload);

  if (serialized.length > 64 * 1024) {
    const error = new Error("workspace_payload_too_large");

    error.code = "workspace_payload_too_large";
    error.statusCode = 413;
    throw error;
  }

  return {
    ...payload,
    name,
  };
}

async function loadFileWorkspaces() {
  if (cachedWorkspaces) {
    return cachedWorkspaces;
  }

  try {
    const content = await fs.readFile(workspacesFilePath, "utf8");
    const parsed = JSON.parse(content);

    cachedWorkspaces = parsed.workspaces || [];
  } catch (error) {
    if (error.code !== "ENOENT") {
      throw error;
    }

    cachedWorkspaces = [];
  }

  return cachedWorkspaces;
}

async function persistFileWorkspaces(workspaces) {
  cachedWorkspaces = workspaces;
  writeQueue = writeQueue.then(async () => {
    await writeJsonFile(workspacesFilePath, { workspaces });
  });

  return writeQueue;
}

function publicWorkspace(row) {
  return {
    ...row.payload,
    created_at: row.created_at || row.createdAt,
    id: row.id,
    name: row.name || row.payload?.name,
    updated_at: row.updated_at || row.updatedAt || null,
  };
}

export async function listWorkspaces(session) {
  if (isDatabaseEnabled()) {
    const database = await getDatabase();
    const result = await database.query(
      `SELECT id, name, payload, created_at, updated_at
        FROM workspaces
        WHERE organization_id = $1
        ORDER BY updated_at DESC`,
      [session.organizationId]
    );

    return result.rows.map(publicWorkspace);
  }

  const workspaces = await loadFileWorkspaces();

  return workspaces
    .filter(
      (workspace) => workspace.organizationId === (session.organizationId || "org-local-arcus")
    )
    .map((workspace) => workspace.payload);
}

export async function createWorkspace(session, payload) {
  const workspace = normalizeWorkspace(payload);
  const id = `ws-${crypto.randomUUID()}`;

  if (isDatabaseEnabled()) {
    const database = await getDatabase();
    const result = await database.query(
      `INSERT INTO workspaces
        (id, organization_id, owner_user_id, name, payload)
        VALUES ($1, $2, $3, $4, $5::jsonb)
        RETURNING id, name, payload, created_at, updated_at`,
      [
        id,
        session.organizationId,
        session.userId,
        workspace.name,
        JSON.stringify(workspace),
      ]
    );

    return publicWorkspace(result.rows[0]);
  }

  const workspaces = await loadFileWorkspaces();
  const record = {
    createdAt: new Date().toISOString(),
    id,
    organizationId: session.organizationId || "org-local-arcus",
    ownerUserId: session.userId,
    payload: {
      ...workspace,
      id,
    },
    updatedAt: new Date().toISOString(),
  };

  await persistFileWorkspaces([record, ...workspaces]);

  return record.payload;
}

export async function deleteWorkspace(session, workspaceId) {
  if (isDatabaseEnabled()) {
    const database = await getDatabase();
    const result = await database.query(
      "DELETE FROM workspaces WHERE id = $1 AND organization_id = $2",
      [workspaceId, session.organizationId]
    );

    return (result.rowCount || 0) > 0;
  }

  const workspaces = await loadFileWorkspaces();
  const nextWorkspaces = workspaces.filter(
    (workspace) =>
      !(
        workspace.id === workspaceId &&
        workspace.organizationId === (session.organizationId || "org-local-arcus")
      )
  );
  const deleted = nextWorkspaces.length !== workspaces.length;

  if (deleted) {
    await persistFileWorkspaces(nextWorkspaces);
  }

  return deleted;
}
