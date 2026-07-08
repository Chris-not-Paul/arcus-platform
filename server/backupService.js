import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";

import {
  backupDir,
  backupFreshnessMaxAgeHours,
  backupRetentionCount,
  backupRetentionDays,
  privateDataDir,
} from "./config.js";
import {
  getDatabase,
  isDatabaseEnabled,
} from "./database.js";

const backupManifestName = "arcus-backup-manifest.json";
const databaseTables = [
  "organizations",
  "users",
  "sessions",
  "workspaces",
  "report_jobs",
  "audit_events",
  "data_releases",
  "api_keys",
  "access_requests",
  "usage_quotas",
  "export_records",
  "password_reset_tokens",
];
const restoreDeleteOrder = [...databaseTables].reverse();

function timestampSlug(date = new Date()) {
  return date.toISOString().replace(/[:.]/g, "-");
}

function sha256(buffer) {
  return crypto
    .createHash("sha256")
    .update(buffer)
    .digest("hex");
}

async function pathExists(target) {
  try {
    await fs.access(target);
    return true;
  } catch {
    return false;
  }
}

async function listFilesRecursive(directory, base = directory) {
  if (!(await pathExists(directory))) {
    return [];
  }

  const entries = await fs.readdir(directory, {
    withFileTypes: true,
  });
  const files = [];

  for (const entry of entries) {
    const fullPath = path.join(directory, entry.name);

    if (entry.isDirectory()) {
      files.push(...(await listFilesRecursive(fullPath, base)));
    } else if (entry.isFile()) {
      files.push(path.relative(base, fullPath).replaceAll("\\", "/"));
    }
  }

  return files.sort();
}

async function copyFileWithChecksum(sourceRoot, relativePath, targetRoot) {
  const source = path.join(sourceRoot, relativePath);
  const target = path.join(targetRoot, relativePath);
  const content = await fs.readFile(source);

  await fs.mkdir(path.dirname(target), {
    recursive: true,
  });
  await fs.writeFile(target, content);

  return {
    bytes: content.length,
    path: relativePath,
    sha256: sha256(content),
  };
}

async function snapshotFileStorage(destination) {
  const dataRoot = path.join(destination, "private-data");
  const files = await listFilesRecursive(privateDataDir);
  const manifestFiles = [];

  for (const relativePath of files) {
    const copied = await copyFileWithChecksum(
      privateDataDir,
      relativePath,
      dataRoot
    );

    manifestFiles.push({
      ...copied,
      path: `private-data/${copied.path}`,
    });
  }

  return {
    files: manifestFiles,
    storage: "file",
  };
}

async function snapshotPostgres(destination) {
  const database = await getDatabase();
  const databaseRoot = path.join(destination, "postgres");
  const tables = [];

  await fs.mkdir(databaseRoot, {
    recursive: true,
  });

  for (const table of databaseTables) {
    const result = await database.query(
      `SELECT * FROM ${table}`
    );
    const payload = {
      rows: result.rows,
      table,
    };
    const content = Buffer.from(
      `${JSON.stringify(payload, null, 2)}\n`,
      "utf8"
    );
    const relativePath = `postgres/${table}.json`;

    await fs.writeFile(
      path.join(destination, relativePath),
      content
    );

    tables.push({
      bytes: content.length,
      path: relativePath,
      rows: result.rows.length,
      sha256: sha256(content),
      table,
    });
  }

  return {
    storage: "postgres",
    tables,
  };
}

async function readManifest(backupPath) {
  const manifestPath = path.join(backupPath, backupManifestName);
  const content = await fs.readFile(manifestPath, "utf8");

  return JSON.parse(content);
}

async function verifyFileList(backupPath, files) {
  const failures = [];

  for (const file of files || []) {
    const content = await fs.readFile(path.join(backupPath, file.path));
    const digest = sha256(content);

    if (digest !== file.sha256) {
      failures.push(file.path);
    }
  }

  return failures;
}

function quoteIdentifier(value) {
  return `"${String(value).replaceAll("\"", "\"\"")}"`;
}

async function tableColumns(database, table) {
  const result = await database.query(
    `SELECT column_name, data_type
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = $1
      ORDER BY ordinal_position`,
    [table]
  );

  return result.rows.map((row) => ({
    name: row.column_name,
    type: row.data_type,
  }));
}

async function insertRows(client, table, rows) {
  if (!rows.length) {
    return;
  }

  const database = await getDatabase();
  const columns = await tableColumns(database, table);
  const insertable = columns.filter((column) =>
    rows.some((row) => Object.hasOwn(row, column.name))
  );
  const quotedColumns = insertable
    .map((column) => quoteIdentifier(column.name))
    .join(", ");

  for (const row of rows) {
    const values = insertable.map((column) =>
      Object.hasOwn(row, column.name) ? row[column.name] : null
    );
    const placeholders = insertable
      .map((column, index) =>
        column.type === "jsonb" || column.type === "json"
          ? `$${index + 1}::${column.type}`
          : `$${index + 1}`
      )
      .join(", ");
    const normalizedValues = values.map((value, index) => {
      const type = insertable[index].type;

      if ((type === "jsonb" || type === "json") &&
        value !== null &&
        typeof value !== "string") {
        return JSON.stringify(value);
      }

      return value;
    });

    await client.query(
      `INSERT INTO ${quoteIdentifier(table)} (${quotedColumns})
        VALUES (${placeholders})`,
      normalizedValues
    );
  }
}

async function restorePostgresSnapshot(backupPath, manifest) {
  const database = await getDatabase();
  const client = await database.connect();

  try {
    await client.query("BEGIN");

    for (const table of restoreDeleteOrder) {
      await client.query(`DELETE FROM ${quoteIdentifier(table)}`);
    }

    for (const table of databaseTables) {
      const tableEntry = manifest.tables.find((item) => item.table === table);

      if (!tableEntry) {
        continue;
      }

      const content = await fs.readFile(
        path.join(backupPath, tableEntry.path),
        "utf8"
      );
      const payload = JSON.parse(content);

      await insertRows(client, table, payload.rows || []);
    }

    await client.query(`
      SELECT setval(
        pg_get_serial_sequence('audit_events', 'id'),
        GREATEST(COALESCE((SELECT MAX(id) FROM audit_events), 0), 1),
        TRUE
      )
    `);
    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

async function clearDirectoryContents(directory) {
  await fs.mkdir(directory, {
    recursive: true,
  });

  const entries = await fs.readdir(directory);

  await Promise.all(
    entries.map((entry) =>
      fs.rm(path.join(directory, entry), {
        force: true,
        recursive: true,
      })
    )
  );
}

async function restoreFileSnapshot(backupPath) {
  const source = path.join(backupPath, "private-data");
  const files = await listFilesRecursive(source);

  await clearDirectoryContents(privateDataDir);

  for (const relativePath of files) {
    await copyFileWithChecksum(source, relativePath, privateDataDir);
  }
}

export async function createBackup(options = {}) {
  const createdAt = new Date();
  const storage = isDatabaseEnabled() ? "postgres" : "file";
  const label = String(options.label || "manual")
    .trim()
    .replace(/[^a-z0-9._-]+/gi, "-")
    .slice(0, 80) || "manual";
  const id = `arcus-${storage}-${timestampSlug(createdAt)}-${label}`;
  const destination = path.resolve(options.destination || backupDir, id);

  await fs.mkdir(destination, {
    recursive: true,
  });

  const snapshot = storage === "postgres"
    ? await snapshotPostgres(destination)
    : await snapshotFileStorage(destination);
  const manifest = {
    createdAt: createdAt.toISOString(),
    id,
    label,
    privateDataDir,
    schemaVersion: 1,
    storage,
    ...snapshot,
  };

  await fs.writeFile(
    path.join(destination, backupManifestName),
    `${JSON.stringify(manifest, null, 2)}\n`,
    "utf8"
  );

  return {
    backupPath: destination,
    manifest,
  };
}

export async function verifyBackup(backupPath) {
  const resolved = path.resolve(backupPath);
  const manifest = await readManifest(resolved);
  const entries = manifest.storage === "postgres"
    ? manifest.tables
    : manifest.files;
  const failures = await verifyFileList(resolved, entries);

  return {
    failures,
    manifest,
    ok: failures.length === 0,
  };
}

export async function restoreBackup(backupPath, options = {}) {
  if (options.confirm !== true) {
    const error = new Error("restore_confirmation_required");

    error.statusCode = 400;
    throw error;
  }

  const verified = await verifyBackup(backupPath);

  if (!verified.ok) {
    const error = new Error("backup_checksum_verification_failed");

    error.failures = verified.failures;
    throw error;
  }

  if (verified.manifest.storage !== (isDatabaseEnabled() ? "postgres" : "file")) {
    const error = new Error("backup_storage_mismatch");

    error.backupStorage = verified.manifest.storage;
    error.currentStorage = isDatabaseEnabled() ? "postgres" : "file";
    throw error;
  }

  if (verified.manifest.storage === "postgres") {
    await restorePostgresSnapshot(path.resolve(backupPath), verified.manifest);
  } else {
    await restoreFileSnapshot(path.resolve(backupPath));
  }

  return {
    manifest: verified.manifest,
    restored: true,
  };
}

export async function applyBackupRetention(options = {}) {
  const root = path.resolve(options.destination || backupDir);
  const maxAgeDays = Number(options.maxAgeDays || backupRetentionDays);
  const maxCount = Number(options.maxCount || backupRetentionCount);

  if (!(await pathExists(root))) {
    return {
      deleted: [],
      kept: [],
    };
  }

  const entries = await fs.readdir(root, {
    withFileTypes: true,
  });
  const backups = [];

  for (const entry of entries) {
    if (!entry.isDirectory()) {
      continue;
    }

    const backupPath = path.join(root, entry.name);

    try {
      const manifest = await readManifest(backupPath);

      backups.push({
        createdAt: new Date(manifest.createdAt).getTime(),
        id: manifest.id || entry.name,
        path: backupPath,
      });
    } catch {
      continue;
    }
  }

  backups.sort((first, second) => second.createdAt - first.createdAt);

  const cutoff = Date.now() - maxAgeDays * 24 * 60 * 60 * 1000;
  const deleted = [];
  const kept = [];

  for (const [index, backup] of backups.entries()) {
    const expiredByCount = index >= maxCount;
    const expiredByAge = backup.createdAt < cutoff;

    if (expiredByCount || expiredByAge) {
      await fs.rm(backup.path, {
        force: true,
        recursive: true,
      });
      deleted.push(backup.id);
    } else {
      kept.push(backup.id);
    }
  }

  return {
    deleted,
    kept,
  };
}

export async function listBackups(options = {}) {
  const root = path.resolve(options.destination || backupDir);

  if (!(await pathExists(root))) {
    return [];
  }

  const entries = await fs.readdir(root, {
    withFileTypes: true,
  });
  const backups = [];

  for (const entry of entries) {
    if (!entry.isDirectory()) {
      continue;
    }

    const backupPath = path.join(root, entry.name);

    try {
      const manifest = await readManifest(backupPath);

      backups.push({
        backupPath,
        createdAt: manifest.createdAt,
        id: manifest.id || entry.name,
        label: manifest.label || "",
        storage: manifest.storage,
      });
    } catch {
      continue;
    }
  }

  return backups.sort(
    (first, second) =>
      new Date(second.createdAt).getTime() -
      new Date(first.createdAt).getTime()
  );
}

export async function backupFreshnessStatus(options = {}) {
  const maxAgeHours = Number(
    options.maxAgeHours || backupFreshnessMaxAgeHours
  );
  const backups = await listBackups(options);
  const latest = backups[0] || null;

  if (!latest) {
    return {
      ageHours: null,
      count: 0,
      latest: null,
      maxAgeHours,
      ok: false,
      status: "missing",
    };
  }

  const ageHours =
    (Date.now() - new Date(latest.createdAt).getTime()) /
    (60 * 60 * 1000);

  return {
    ageHours,
    count: backups.length,
    latest,
    maxAgeHours,
    ok: ageHours <= maxAgeHours,
    status: ageHours <= maxAgeHours ? "fresh" : "stale",
  };
}
