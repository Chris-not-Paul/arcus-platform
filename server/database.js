import fs from "node:fs/promises";
import path from "node:path";

import {
  databaseSsl,
  databaseUrl,
  rootDir,
} from "./config.js";

let databasePromise = null;

export function isDatabaseEnabled() {
  return Boolean(databaseUrl);
}

export async function getDatabase() {
  if (!isDatabaseEnabled()) {
    return null;
  }

  if (!databasePromise) {
    databasePromise = import("pg").then(({ Pool }) =>
      new Pool({
        connectionString: databaseUrl,
        ssl: databaseSsl
          ? { rejectUnauthorized: false }
          : false,
      })
    );
  }

  return databasePromise;
}

export async function closeDatabase() {
  if (!databasePromise) {
    return;
  }

  const database = await databasePromise;

  await database.end();
  databasePromise = null;
}

export async function runDatabaseMigrations() {
  const database = await getDatabase();

  if (!database) {
    return {
      storage: "file",
      migrated: [],
    };
  }

  await database.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      id TEXT PRIMARY KEY,
      applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);

  const migrationsDirectory = path.join(
    rootDir,
    "server",
    "migrations"
  );
  const migrationFiles = (await fs.readdir(migrationsDirectory))
    .filter((file) => file.endsWith(".sql"))
    .sort();
  const applied = await database.query(
    "SELECT id FROM schema_migrations"
  );
  const appliedIds = new Set(
    applied.rows.map((row) => row.id)
  );
  const migrated = [];

  for (const file of migrationFiles) {
    if (appliedIds.has(file)) {
      continue;
    }

    const sql = await fs.readFile(
      path.join(migrationsDirectory, file),
      "utf8"
    );
    const client = await database.connect();

    try {
      await client.query("BEGIN");
      await client.query(sql);
      await client.query(
        "INSERT INTO schema_migrations (id) VALUES ($1)",
        [file]
      );
      await client.query("COMMIT");
      migrated.push(file);
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }

  return {
    storage: "postgres",
    migrated,
  };
}

export async function databaseHealth() {
  const database = await getDatabase();

  if (!database) {
    return {
      ok: true,
      storage: "file",
    };
  }

  await database.query("SELECT 1");

  return {
    ok: true,
    storage: "postgres",
  };
}
