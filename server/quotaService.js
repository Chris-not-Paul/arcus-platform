import fs from "node:fs/promises";
import path from "node:path";

import { authDataDir } from "./config.js";
import { writeJsonFile } from "./fileStore.js";
import {
  getDatabase,
  isDatabaseEnabled,
} from "./database.js";

const quotaFilePath = path.join(authDataDir, "usage-quotas.json");
let cachedUsage = null;
let writeQueue = Promise.resolve();

function dayKey(date = new Date()) {
  return date.toISOString().slice(0, 10);
}

function usageKey({ day, organizationId, resource, userId }) {
  return [
    day,
    organizationId || "org-local-arcus",
    userId || "unknown-user",
    resource,
  ].join(":");
}

async function loadUsage() {
  if (cachedUsage) {
    return cachedUsage;
  }

  try {
    const content = await fs.readFile(quotaFilePath, "utf8");
    const parsed = JSON.parse(content);

    cachedUsage = parsed.usage || {};
  } catch (error) {
    if (error.code !== "ENOENT") {
      throw error;
    }

    cachedUsage = {};
  }

  return cachedUsage;
}

async function persistUsage(usage) {
  cachedUsage = usage;
  writeQueue = writeQueue.then(async () => {
    await writeJsonFile(quotaFilePath, { usage });
  });

  return writeQueue;
}

function quotaError({ count, limit, resource }) {
  const error = new Error("quota_exceeded");

  error.code = "quota_exceeded";
  error.statusCode = 429;
  error.quota = {
    count,
    limit,
    resource,
  };

  return error;
}

export async function assertQuotaAvailable(
  session,
  resource,
  limit
) {
  const boundedLimit = Number(limit) || 0;

  if (session?.role === "admin") {
    return {
      count: 0,
      limit: boundedLimit,
      resource,
      remaining: Number.POSITIVE_INFINITY,
    };
  }

  if (boundedLimit <= 0) {
    throw quotaError({
      count: 0,
      limit: boundedLimit,
      resource,
    });
  }

  const day = dayKey();

  if (isDatabaseEnabled()) {
    const database = await getDatabase();
    const result = await database.query(
      `SELECT count FROM usage_quotas
        WHERE day = $1
          AND organization_id = $2
          AND user_id = $3
          AND resource = $4`,
      [day, session.organizationId, session.userId, resource]
    );
    const count = Number(result.rows[0]?.count || 0);

    if (count >= boundedLimit) {
      throw quotaError({
        count,
        limit: boundedLimit,
        resource,
      });
    }

    return {
      count,
      limit: boundedLimit,
      resource,
      remaining: boundedLimit - count,
    };
  }

  const usage = await loadUsage();
  const key = usageKey({
    day,
    organizationId: session.organizationId,
    resource,
    userId: session.userId,
  });
  const count = Number(usage[key]?.count || 0);

  if (count >= boundedLimit) {
    throw quotaError({
      count,
      limit: boundedLimit,
      resource,
    });
  }

  return {
    count,
    limit: boundedLimit,
    resource,
    remaining: boundedLimit - count,
  };
}

export async function recordQuotaUsage(session, resource, amount = 1) {
  if (session?.role === "admin") {
    return {
      count: 0,
      resource,
    };
  }

  const day = dayKey();
  const increment = Math.max(1, Number(amount) || 1);

  if (isDatabaseEnabled()) {
    const database = await getDatabase();
    const result = await database.query(
      `INSERT INTO usage_quotas
        (day, organization_id, user_id, username, resource, count)
        VALUES ($1, $2, $3, $4, $5, $6)
        ON CONFLICT (day, organization_id, user_id, resource)
        DO UPDATE SET
          count = usage_quotas.count + EXCLUDED.count,
          updated_at = NOW()
        RETURNING count`,
      [
        day,
        session.organizationId,
        session.userId,
        session.username,
        resource,
        increment,
      ]
    );

    return {
      count: Number(result.rows[0]?.count || increment),
      resource,
    };
  }

  const usage = await loadUsage();
  const key = usageKey({
    day,
    organizationId: session.organizationId,
    resource,
    userId: session.userId,
  });
  const current = usage[key] || {
    count: 0,
    day,
    organizationId: session.organizationId,
    resource,
    updatedAt: null,
    userId: session.userId,
    username: session.username,
  };

  usage[key] = {
    ...current,
    count: Number(current.count || 0) + increment,
    updatedAt: new Date().toISOString(),
  };

  await persistUsage(usage);

  return {
    count: usage[key].count,
    resource,
  };
}

export async function usageForSession(session, entitlements) {
  const resources = [
    {
      key: "professional_export",
      label: "Professional exports",
      limit: Number(entitlements?.exportLimitPerDay) || 0,
    },
    {
      key: "professional_report",
      label: "Professional reports",
      limit: Number(entitlements?.reportLimitPerDay) || 0,
    },
  ];
  const day = dayKey();

  if (session?.role === "admin") {
    return {
      day,
      resources: resources.map((resource) => ({
        ...resource,
        remaining: Number.POSITIVE_INFINITY,
        used: 0,
      })),
    };
  }

  if (isDatabaseEnabled()) {
    const database = await getDatabase();
    const result = await database.query(
      `SELECT resource, count FROM usage_quotas
        WHERE day = $1
          AND organization_id = $2
          AND user_id = $3`,
      [day, session.organizationId, session.userId]
    );
    const counts = new Map(
      result.rows.map((row) => [row.resource, Number(row.count || 0)])
    );

    return {
      day,
      resources: resources.map((resource) => {
        const used = counts.get(resource.key) || 0;

        return {
          ...resource,
          remaining: Math.max(resource.limit - used, 0),
          used,
        };
      }),
    };
  }

  const usage = await loadUsage();

  return {
    day,
    resources: resources.map((resource) => {
      const key = usageKey({
        day,
        organizationId: session.organizationId,
        resource: resource.key,
        userId: session.userId,
      });
      const used = Number(usage[key]?.count || 0);

      return {
        ...resource,
        remaining: Math.max(resource.limit - used, 0),
        used,
      };
    }),
  };
}
