import fs from "node:fs/promises";

import {
  authDataDir,
  sessionsFilePath,
} from "./config.js";
import { writeJsonFile } from "./fileStore.js";
import {
  getDatabase,
  isDatabaseEnabled,
} from "./database.js";

let cachedSessions = null;
let writeQueue = Promise.resolve();

async function readSessionsFile() {
  try {
    const content = await fs.readFile(
      sessionsFilePath,
      "utf8"
    );
    const parsed = JSON.parse(content);

    return parsed.sessions || [];
  } catch (error) {
    if (error.code !== "ENOENT") {
      throw error;
    }

    return [];
  }
}

async function loadSessions() {
  if (!cachedSessions) {
    cachedSessions = await readSessionsFile();
  }

  return cachedSessions;
}

async function persistSessions(sessions) {
  cachedSessions = sessions;
  writeQueue = writeQueue.then(async () => {
    await fs.mkdir(authDataDir, {
      recursive: true,
    });
    await writeJsonFile(sessionsFilePath, { sessions });
  });

  return writeQueue;
}

function withoutExpiredSessions(sessions) {
  const now = Date.now();

  return sessions.filter(
    (session) => Number(session.expiresAt) > now
  );
}

export async function createSessionRecord(session) {
  if (isDatabaseEnabled()) {
    const database = await getDatabase();

    await database.query(
      "DELETE FROM sessions WHERE expires_at <= NOW()"
    );
    await database.query(
      `INSERT INTO sessions
        (id, user_id, username, role, organization_id, csrf_token, expires_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [
        session.id,
        session.userId,
        session.username,
        session.role,
        session.organizationId || "org-local-arcus",
        session.csrfToken,
        new Date(Number(session.expiresAt)),
      ]
    );
    return;
  }

  const sessions = withoutExpiredSessions(
    await loadSessions()
  );

  sessions.push({
    ...session,
    createdAt: new Date().toISOString(),
  });

  await persistSessions(sessions);
}

export async function deleteSessionRecord(sessionId) {
  if (isDatabaseEnabled()) {
    const database = await getDatabase();

    await database.query("DELETE FROM sessions WHERE id = $1", [
      sessionId,
    ]);
    return;
  }

  const sessions = await loadSessions();
  const nextSessions = sessions.filter(
    (session) => session.id !== sessionId
  );

  if (nextSessions.length !== sessions.length) {
    await persistSessions(nextSessions);
  }
}

export async function getSessionRecord(sessionId) {
  if (isDatabaseEnabled()) {
    const database = await getDatabase();
    const result = await database.query(
      `SELECT id, user_id, username, role, organization_id, csrf_token, expires_at, created_at
        FROM sessions
        WHERE id = $1 AND expires_at > NOW()`,
      [sessionId]
    );
    const row = result.rows[0];

    if (!row) {
      return null;
    }

    return {
      createdAt: row.created_at.toISOString(),
      csrfToken: row.csrf_token,
      expiresAt: row.expires_at.getTime(),
      id: row.id,
      organizationId: row.organization_id,
      role: row.role,
      userId: row.user_id,
      username: row.username,
    };
  }

  const sessions = await loadSessions();
  const session = sessions.find(
    (item) => item.id === sessionId
  );

  if (!session) {
    return null;
  }

  if (Number(session.expiresAt) <= Date.now()) {
    await deleteSessionRecord(sessionId);
    return null;
  }

  return session;
}

export async function listSessionSummaries() {
  if (isDatabaseEnabled()) {
    const database = await getDatabase();
    const result = await database.query(
      `SELECT username, role, created_at, expires_at
        FROM sessions
        WHERE expires_at > NOW()
        ORDER BY created_at DESC`
    );

    return result.rows.map((row) => ({
      createdAt: row.created_at.toISOString(),
      expiresAt: row.expires_at.getTime(),
      role: row.role,
      username: row.username,
    }));
  }

  const sessions = withoutExpiredSessions(await loadSessions());

  return sessions.map((session) => ({
    createdAt: session.createdAt,
    expiresAt: session.expiresAt,
    role: session.role,
    username: session.username,
  }));
}

export async function listSessionsForUsername(username) {
  const normalizedUsername = String(username || "").toLowerCase();

  if (isDatabaseEnabled()) {
    const database = await getDatabase();
    const result = await database.query(
      `SELECT id, username, role, created_at, expires_at
        FROM sessions
        WHERE LOWER(username) = LOWER($1)
          AND expires_at > NOW()
        ORDER BY created_at DESC`,
      [normalizedUsername]
    );

    return result.rows.map((row) => ({
      createdAt: row.created_at.toISOString(),
      expiresAt: row.expires_at.getTime(),
      id: row.id,
      role: row.role,
      username: row.username,
    }));
  }

  return withoutExpiredSessions(await loadSessions())
    .filter(
      (session) =>
        String(session.username || "").toLowerCase() ===
        normalizedUsername
    )
    .sort(
      (left, right) =>
        Number(right.expiresAt || 0) - Number(left.expiresAt || 0)
    )
    .map((session) => ({
      createdAt: session.createdAt,
      expiresAt: session.expiresAt,
      id: session.id,
      role: session.role,
      username: session.username,
    }));
}

export async function deleteSessionsForUsername(username) {
  if (isDatabaseEnabled()) {
    const database = await getDatabase();
    const result = await database.query(
      "DELETE FROM sessions WHERE LOWER(username) = LOWER($1)",
      [username]
    );

    return result.rowCount || 0;
  }

  const sessions = await loadSessions();
  const normalizedUsername = String(username || "").toLowerCase();
  const nextSessions = sessions.filter(
    (session) =>
      String(session.username || "").toLowerCase() !==
      normalizedUsername
  );
  const revoked = sessions.length - nextSessions.length;

  if (revoked) {
    await persistSessions(nextSessions);
  }

  return revoked;
}

export async function deleteOtherSessionsForUsername(
  username,
  keepSessionId
) {
  if (!keepSessionId) {
    return 0;
  }

  if (isDatabaseEnabled()) {
    const database = await getDatabase();
    const result = await database.query(
      `DELETE FROM sessions
        WHERE LOWER(username) = LOWER($1)
          AND id <> $2`,
      [username, keepSessionId]
    );

    return result.rowCount || 0;
  }

  const sessions = await loadSessions();
  const normalizedUsername = String(username || "").toLowerCase();
  const nextSessions = sessions.filter(
    (session) =>
      String(session.username || "").toLowerCase() !==
        normalizedUsername ||
      session.id === keepSessionId
  );
  const revoked = sessions.length - nextSessions.length;

  if (revoked) {
    await persistSessions(nextSessions);
  }

  return revoked;
}
