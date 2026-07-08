import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";

import {
  authDataDir,
  defaultOrganizationName,
  defaultOrganizationPlanRenewsAt,
  defaultOrganizationSlug,
} from "./config.js";
import { writeJsonFile } from "./fileStore.js";
import {
  getDatabase,
  isDatabaseEnabled,
} from "./database.js";

const localOrganization = {
  cancelAtPeriodEnd: false,
  cancellationRequestedAt: null,
  exportLimit: 25,
  id: "org-local-arcus",
  name: defaultOrganizationName,
  plan: "professional",
  planRenewsAt: defaultOrganizationPlanRenewsAt || null,
  slug: defaultOrganizationSlug,
  status: "active",
};
const localOrganizationFilePath = path.join(
  authDataDir,
  "organization.json"
);
let cachedLocalOrganization = null;

async function loadLocalOrganization() {
  if (cachedLocalOrganization) {
    return cachedLocalOrganization;
  }

  try {
    const content = await fs.readFile(
      localOrganizationFilePath,
      "utf8"
    );

    cachedLocalOrganization = {
      ...localOrganization,
      ...JSON.parse(content),
    };
  } catch (error) {
    if (error.code !== "ENOENT") {
      throw error;
    }

    cachedLocalOrganization = localOrganization;
  }

  return cachedLocalOrganization;
}

async function persistLocalOrganization(organization) {
  cachedLocalOrganization = organization;
  await writeJsonFile(localOrganizationFilePath, organization);
}

function normalizeOrganization(row) {
  return {
    cancelAtPeriodEnd: Boolean(row.cancel_at_period_end),
    cancellationRequestedAt:
      row.cancellation_requested_at?.toISOString?.() || null,
    exportLimit: row.export_limit,
    id: row.id,
    name: row.name,
    plan: row.plan,
    planRenewsAt: row.plan_renews_at?.toISOString?.() || null,
    slug: row.slug,
    status: row.status,
  };
}

export async function ensureDefaultOrganization() {
  if (!isDatabaseEnabled()) {
    return loadLocalOrganization();
  }

  const database = await getDatabase();
  const existing = await database.query(
    `SELECT id, slug, name, plan, status, export_limit,
      plan_renews_at, cancel_at_period_end, cancellation_requested_at
      FROM organizations WHERE slug = $1`,
    [defaultOrganizationSlug]
  );

  if (existing.rows[0]) {
    const row = existing.rows[0];

    return normalizeOrganization(row);
  }

  const organization = {
    ...localOrganization,
    id: `org-${crypto.randomUUID()}`,
  };

  await database.query(
    `INSERT INTO organizations
      (id, slug, name, plan, status, export_limit, plan_renews_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7)`,
    [
      organization.id,
      organization.slug,
      organization.name,
      organization.plan,
      organization.status,
      organization.exportLimit,
      organization.planRenewsAt,
    ]
  );

  return organization;
}

export async function getOrganizationAccount(organizationId) {
  if (!isDatabaseEnabled()) {
    return loadLocalOrganization();
  }

  const database = await getDatabase();
  const result = await database.query(
    `SELECT id, slug, name, plan, status, export_limit,
      plan_renews_at, cancel_at_period_end, cancellation_requested_at
      FROM organizations WHERE id = $1`,
    [organizationId]
  );

  return result.rows[0] ? normalizeOrganization(result.rows[0]) : null;
}

export async function requestOrganizationCancellation(organizationId) {
  if (!isDatabaseEnabled()) {
    const organization = await loadLocalOrganization();
    const updated = {
      ...organization,
      cancelAtPeriodEnd: true,
      cancellationRequestedAt: new Date().toISOString(),
    };

    await persistLocalOrganization(updated);
    return updated;
  }

  const database = await getDatabase();
  const result = await database.query(
    `UPDATE organizations
      SET cancel_at_period_end = TRUE,
          cancellation_requested_at = NOW(),
          updated_at = NOW()
      WHERE id = $1
      RETURNING id, slug, name, plan, status, export_limit,
        plan_renews_at, cancel_at_period_end, cancellation_requested_at`,
    [organizationId]
  );

  return result.rows[0] ? normalizeOrganization(result.rows[0]) : null;
}

export async function resumeOrganizationSubscription(organizationId) {
  if (!isDatabaseEnabled()) {
    const organization = await loadLocalOrganization();
    const updated = {
      ...organization,
      cancelAtPeriodEnd: false,
      cancellationRequestedAt: null,
    };

    await persistLocalOrganization(updated);
    return updated;
  }

  const database = await getDatabase();
  const result = await database.query(
    `UPDATE organizations
      SET cancel_at_period_end = FALSE,
          cancellation_requested_at = NULL,
          updated_at = NOW()
      WHERE id = $1
      RETURNING id, slug, name, plan, status, export_limit,
        plan_renews_at, cancel_at_period_end, cancellation_requested_at`,
    [organizationId]
  );

  return result.rows[0] ? normalizeOrganization(result.rows[0]) : null;
}

export function organizationIsActive(organization) {
  return organization?.status === "active";
}
