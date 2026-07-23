import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";

import {
  landslideObservationDir,
} from "../config.js";
import {
  writeJsonFile,
} from "../fileStore.js";

const STORE_SCHEMA_VERSION = 1;
const STORE_MAX_ITEMS = 5000;
const STORE_RETENTION_MS = 1000 * 60 * 60 * 24 * 30;
const STORE_PRUNE_INTERVAL_MS = 1000 * 60 * 60;
let lastPrunedAt = 0;
let prunePromise = null;

function fileNameForKey(cacheKey) {
  return `${crypto
    .createHash("sha256")
    .update(String(cacheKey))
    .digest("hex")}.json`;
}

function observationPath(cacheKey, directory) {
  return path.join(directory, fileNameForKey(cacheKey));
}

function validObservedAt(value) {
  const timestamp = Date.parse(value);

  return Number.isFinite(timestamp) ? timestamp : null;
}

async function pruneObservationStore(directory) {
  if (prunePromise) {
    return prunePromise;
  }

  if (Date.now() - lastPrunedAt < STORE_PRUNE_INTERVAL_MS) {
    return;
  }

  prunePromise = pruneObservationStoreNow(directory);

  try {
    await prunePromise;
    lastPrunedAt = Date.now();
  } finally {
    prunePromise = null;
  }
}

async function pruneObservationStoreNow(directory) {
  const entries = await fs.readdir(directory, {
    withFileTypes: true,
  });
  const files = entries.filter(
    (entry) => entry.isFile() && entry.name.endsWith(".json")
  );

  if (!files.length) {
    return;
  }

  const now = Date.now();
  const metadata = await Promise.all(
    files.map(async (entry) => {
      const filePath = path.join(directory, entry.name);
      const stat = await fs.stat(filePath);

      return {
        filePath,
        modifiedAt: stat.mtimeMs,
      };
    })
  );
  const expired = metadata.filter(
    (item) => now - item.modifiedAt > STORE_RETENTION_MS
  );

  await Promise.all(
    expired.map((item) => fs.rm(item.filePath, {
      force: true,
    }))
  );

  const expiredPaths = new Set(expired.map((item) => item.filePath));
  const retained = metadata
    .filter((item) => !expiredPaths.has(item.filePath))
    .sort((left, right) => right.modifiedAt - left.modifiedAt);

  await Promise.all(
    retained.slice(STORE_MAX_ITEMS).map((item) => fs.rm(item.filePath, {
      force: true,
    }))
  );
}

export async function readLandslideObservation({
  cacheKey,
  directory = landslideObservationDir,
  now = Date.now(),
} = {}) {
  if (!cacheKey) {
    return null;
  }

  try {
    const content = await fs.readFile(
      observationPath(cacheKey, directory),
      "utf8"
    );
    const payload = JSON.parse(content);
    const observedAtMs = validObservedAt(payload?.observed_at);

    if (
      payload?.schema_version !== STORE_SCHEMA_VERSION ||
      payload?.cache_key !== cacheKey ||
      !observedAtMs ||
      !["available", "no_intersection"].includes(payload?.result?.status)
    ) {
      return null;
    }

    return {
      age_ms: Math.max(0, Number(now) - observedAtMs),
      observed_at: new Date(observedAtMs).toISOString(),
      result: payload.result,
      stored_at: payload.stored_at || null,
    };
  } catch {
    return null;
  }
}

export async function writeLandslideObservation({
  cacheKey,
  directory = landslideObservationDir,
  observedAt,
  result,
} = {}) {
  if (
    !cacheKey ||
    !["available", "no_intersection"].includes(result?.status)
  ) {
    return false;
  }

  const normalizedObservedAt = validObservedAt(observedAt)
    ? new Date(observedAt).toISOString()
    : new Date().toISOString();

  await writeJsonFile(
    observationPath(cacheKey, directory),
    {
      cache_key: cacheKey,
      observed_at: normalizedObservedAt,
      result,
      schema_version: STORE_SCHEMA_VERSION,
      stored_at: new Date().toISOString(),
    }
  );
  await pruneObservationStore(directory);

  return true;
}

export async function landslideObservationStoreStatus({
  directory = landslideObservationDir,
} = {}) {
  try {
    const entries = await fs.readdir(directory, {
      withFileTypes: true,
    });
    const files = entries.filter(
      (entry) => entry.isFile() && entry.name.endsWith(".json")
    );
    let latestObservedAt = null;

    for (const entry of files) {
      try {
        const payload = JSON.parse(
          await fs.readFile(path.join(directory, entry.name), "utf8")
        );
        const observedAtMs = validObservedAt(payload?.observed_at);

        if (
          observedAtMs &&
          (!latestObservedAt || observedAtMs > Date.parse(latestObservedAt))
        ) {
          latestObservedAt = new Date(observedAtMs).toISOString();
        }
      } catch {
        // Corrupt observations are ignored and never used as fallback.
      }
    }

    return {
      latest_observed_at: latestObservedAt,
      observation_count: files.length,
      ok: true,
      schema_version: STORE_SCHEMA_VERSION,
      max_items: STORE_MAX_ITEMS,
      retention_days: Math.round(STORE_RETENTION_MS / (1000 * 60 * 60 * 24)),
      status: files.length ? "available" : "empty",
    };
  } catch (error) {
    if (error?.code === "ENOENT") {
      return {
        latest_observed_at: null,
        observation_count: 0,
        ok: true,
        schema_version: STORE_SCHEMA_VERSION,
        max_items: STORE_MAX_ITEMS,
        retention_days: Math.round(
          STORE_RETENTION_MS / (1000 * 60 * 60 * 24)
        ),
        status: "empty",
      };
    }

    return {
      error: error?.message || "observation_store_unavailable",
      latest_observed_at: null,
      observation_count: 0,
      ok: false,
      schema_version: STORE_SCHEMA_VERSION,
      max_items: STORE_MAX_ITEMS,
      retention_days: Math.round(STORE_RETENTION_MS / (1000 * 60 * 60 * 24)),
      status: "unavailable",
    };
  }
}

export const LANDSLIDE_OBSERVATION_STORE_SCHEMA_VERSION =
  STORE_SCHEMA_VERSION;
