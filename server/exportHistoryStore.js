import fs from "node:fs/promises";
import path from "node:path";

import { authDataDir } from "./config.js";
import {
  getDatabase,
  isDatabaseEnabled,
} from "./database.js";
import { writeJsonFile } from "./fileStore.js";

const exportHistoryPath = path.join(authDataDir, "export-history.json");
let cachedExports = null;
let writeQueue = Promise.resolve();

async function loadExportHistory() {
  if (cachedExports) {
    return cachedExports;
  }

  try {
    const content = await fs.readFile(exportHistoryPath, "utf8");
    const parsed = JSON.parse(content);

    cachedExports = parsed.exports || [];
  } catch (error) {
    if (error.code !== "ENOENT") {
      throw error;
    }

    cachedExports = [];
  }

  return cachedExports;
}

async function persistExportHistory(exports) {
  cachedExports = exports;
  writeQueue = writeQueue.then(() =>
    writeJsonFile(exportHistoryPath, { exports })
  );

  return writeQueue;
}

function normalizeExportRecord(row) {
  return {
    createdAt: row.created_at?.toISOString?.() || row.createdAt,
    dataReleaseId: row.data_release_id || row.dataReleaseId || "",
    eventCount: Number(row.event_count ?? row.eventCount ?? 0),
    exportId: row.export_id || row.exportId,
    filename: row.filename || "",
    methodologyVersion:
      row.methodology_version || row.methodologyVersion || "",
    organizationId: row.organization_id || row.organizationId,
    scopeLabel: row.scope_label || row.scopeLabel || "",
    sourceCount: Number(row.source_count ?? row.sourceCount ?? 0),
    type: row.export_type || row.type,
    userId: row.user_id || row.userId,
    username: row.username || "",
  };
}

export async function recordProfessionalExport(record) {
  const exportRecord = {
    createdAt: record.createdAt || new Date().toISOString(),
    dataReleaseId: record.dataReleaseId || "",
    eventCount: Number(record.eventCount || 0),
    exportId: record.exportId,
    filename: record.filename || "",
    methodologyVersion: record.methodologyVersion || "",
    organizationId: record.organizationId || "org-local-arcus",
    scopeLabel: record.scopeLabel || "",
    sourceCount: Number(record.sourceCount || 0),
    type: record.type || "unknown",
    userId: record.userId || "",
    username: record.username || "",
  };

  if (isDatabaseEnabled()) {
    const database = await getDatabase();

    await database.query(
      `INSERT INTO export_records
        (export_id, organization_id, user_id, username, export_type,
         filename, scope_label, event_count, source_count,
         data_release_id, methodology_version, created_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
      [
        exportRecord.exportId,
        exportRecord.organizationId,
        exportRecord.userId,
        exportRecord.username,
        exportRecord.type,
        exportRecord.filename,
        exportRecord.scopeLabel,
        exportRecord.eventCount,
        exportRecord.sourceCount,
        exportRecord.dataReleaseId,
        exportRecord.methodologyVersion,
        exportRecord.createdAt,
      ]
    );
    return exportRecord;
  }

  const exports = await loadExportHistory();

  await persistExportHistory([exportRecord, ...exports].slice(0, 500));

  return exportRecord;
}

export async function listProfessionalExports(session, limit = 12) {
  const boundedLimit = Math.max(1, Math.min(Number(limit) || 12, 50));

  if (isDatabaseEnabled()) {
    const database = await getDatabase();
    const result = await database.query(
      `SELECT export_id, organization_id, user_id, username, export_type,
        filename, scope_label, event_count, source_count,
        data_release_id, methodology_version, created_at
        FROM export_records
        WHERE organization_id = $1
          AND ($3 = TRUE OR user_id = $2)
        ORDER BY created_at DESC
        LIMIT $4`,
      [
        session.organizationId,
        session.userId,
        session.role === "admin",
        boundedLimit,
      ]
    );

    return result.rows.map(normalizeExportRecord);
  }

  const exports = await loadExportHistory();

  return exports
    .filter(
      (item) =>
        item.organizationId ===
          (session.organizationId || "org-local-arcus") &&
        (session.role === "admin" || item.userId === session.userId)
    )
    .slice(0, boundedLimit)
    .map(normalizeExportRecord);
}
