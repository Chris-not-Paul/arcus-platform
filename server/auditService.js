import fs from "node:fs/promises";

import {
  auditLogPath,
  authDataDir,
} from "./config.js";
import {
  getDatabase,
  isDatabaseEnabled,
} from "./database.js";

export async function appendAuditEvent(event) {
  if (isDatabaseEnabled()) {
    const database = await getDatabase();
    const {
      organizationId = null,
      userId = null,
      event: eventType,
      ...metadata
    } = event;

    await database.query(
      `INSERT INTO audit_events
        (organization_id, user_id, event_type, metadata)
        VALUES ($1, $2, $3, $4::jsonb)`,
      [
        organizationId,
        userId,
        eventType || "unknown",
        JSON.stringify(metadata),
      ]
    );
    return;
  }

  await fs.mkdir(authDataDir, {
    recursive: true,
  });

  const record = {
    at: new Date().toISOString(),
    ...event,
  };

  await fs.appendFile(
    auditLogPath,
    `${JSON.stringify(record)}\n`,
    "utf8"
  );
}

function normalizeAuditEvent(record) {
  const {
    at,
    event,
    eventType,
    metadata,
    occurredAt,
    organizationId,
    userId,
    ...details
  } = record;

  return {
    at: at || occurredAt || null,
    details: metadata || details || {},
    event: event || eventType || "unknown",
    organizationId: organizationId || null,
    userId: userId || null,
  };
}

export async function listAuditEventsForAdmin(limit = 80) {
  const boundedLimit = Math.max(1, Math.min(Number(limit) || 80, 200));

  if (isDatabaseEnabled()) {
    const database = await getDatabase();
    const result = await database.query(
      `SELECT occurred_at, organization_id, user_id, event_type, metadata
        FROM audit_events
        ORDER BY occurred_at DESC
        LIMIT $1`,
      [boundedLimit]
    );

    return result.rows.map((row) =>
      normalizeAuditEvent({
        eventType: row.event_type,
        metadata: row.metadata,
        occurredAt: row.occurred_at?.toISOString(),
        organizationId: row.organization_id,
        userId: row.user_id,
      })
    );
  }

  let content;

  try {
    content = await fs.readFile(auditLogPath, "utf8");
  } catch (error) {
    if (error.code !== "ENOENT") {
      throw error;
    }

    return [];
  }

  return content
    .split(/\r?\n/)
    .filter(Boolean)
    .slice(-boundedLimit)
    .reverse()
    .map((line) => {
      try {
        return normalizeAuditEvent(JSON.parse(line));
      } catch {
        return normalizeAuditEvent({
          at: null,
          event: "unreadable_audit_record",
          raw: line.slice(0, 240),
        });
      }
    });
}
