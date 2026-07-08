import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";

import { authDataDir } from "./config.js";
import { writeJsonFile } from "./fileStore.js";
import {
  getDatabase,
  isDatabaseEnabled,
} from "./database.js";

const jobsFilePath = path.join(authDataDir, "report-jobs.json");
let cachedJobs = null;
let writeQueue = Promise.resolve();

async function loadJobs() {
  if (cachedJobs) {
    return cachedJobs;
  }

  try {
    const content = await fs.readFile(jobsFilePath, "utf8");
    const parsed = JSON.parse(content);

    cachedJobs = parsed.jobs || [];
  } catch (error) {
    if (error.code !== "ENOENT") {
      throw error;
    }

    cachedJobs = [];
  }

  return cachedJobs;
}

async function persistJobs(jobs) {
  cachedJobs = jobs;
  writeQueue = writeQueue.then(async () => {
    await writeJsonFile(jobsFilePath, { jobs });
  });

  return writeQueue;
}

export async function createReportJob(session, payload) {
  const id = `rpt-${crypto.randomUUID()}`;
  const createdAt = new Date().toISOString();
  const job = {
    completedAt: null,
    id,
    jobType: "professional-report",
    payload,
    result: null,
    status: "queued",
  };

  if (isDatabaseEnabled()) {
    const database = await getDatabase();

    await database.query(
      `INSERT INTO report_jobs
        (id, organization_id, user_id, job_type, status, payload, result, completed_at)
        VALUES ($1, $2, $3, $4, $5, $6::jsonb, $7::jsonb, NULL)`,
      [
        id,
        session.organizationId,
        session.userId,
        job.jobType,
        job.status,
        JSON.stringify(payload),
        JSON.stringify(null),
      ]
    );
  } else {
    const jobs = await loadJobs();

    await persistJobs([
      {
        ...job,
        createdAt,
        organizationId: session.organizationId || "org-local-arcus",
        userId: session.userId,
      },
      ...jobs,
    ]);
  }

  return {
    reference: id,
    status: job.status,
  };
}

function normalizeJob(row) {
  return {
    completedAt: row.completed_at?.toISOString?.() || null,
    createdAt: row.created_at?.toISOString?.() || row.createdAt,
    id: row.id,
    payload: row.payload || {},
    result: row.result || null,
    status: row.status,
    type: row.job_type || row.jobType,
  };
}

export async function completeReportJob(session, jobId, result = {}) {
  if (isDatabaseEnabled()) {
    const database = await getDatabase();
    const queryResult = await database.query(
      `UPDATE report_jobs
        SET status = 'completed',
            result = $3::jsonb,
            completed_at = NOW()
        WHERE id = $1 AND organization_id = $2
        RETURNING id, job_type, status, payload, result, created_at, completed_at`,
      [
        jobId,
        session.organizationId,
        JSON.stringify({
          ...result,
          completedBy: session.username,
          reference: jobId,
        }),
      ]
    );

    return queryResult.rows[0]
      ? normalizeJob(queryResult.rows[0])
      : null;
  }

  const jobs = await loadJobs();
  const index = jobs.findIndex(
    (job) =>
      job.id === jobId &&
      job.organizationId ===
        (session.organizationId || "org-local-arcus")
  );

  if (index === -1) {
    return null;
  }

  const completedJob = {
    ...jobs[index],
    completedAt: new Date().toISOString(),
    result: {
      ...result,
      completedBy: session.username,
      reference: jobId,
    },
    status: "completed",
  };
  const nextJobs = [...jobs];

  nextJobs[index] = completedJob;
  await persistJobs(nextJobs);

  return normalizeJob(completedJob);
}

export async function getReportJob(session, jobId) {
  if (isDatabaseEnabled()) {
    const database = await getDatabase();
    const result = await database.query(
      `SELECT id, job_type, status, payload, result, created_at, completed_at
        FROM report_jobs
        WHERE id = $1 AND organization_id = $2`,
      [jobId, session.organizationId]
    );

    return result.rows[0] ? normalizeJob(result.rows[0]) : null;
  }

  const jobs = await loadJobs();
  const job = jobs.find(
    (item) =>
      item.id === jobId &&
      item.organizationId ===
        (session.organizationId || "org-local-arcus")
  );

  return job ? normalizeJob(job) : null;
}

export async function listRecentReportJobs(session, limit = 20) {
  if (isDatabaseEnabled()) {
    const database = await getDatabase();
    const result = await database.query(
      `SELECT id, job_type, status, payload, created_at, completed_at
        FROM report_jobs
        WHERE organization_id = $1
        ORDER BY created_at DESC
        LIMIT $2`,
      [session.organizationId, limit]
    );

    return result.rows.map(normalizeJob);
  }

  const jobs = await loadJobs();

  return jobs
    .filter(
      (job) => job.organizationId === (session.organizationId || "org-local-arcus")
    )
    .slice(0, limit)
    .map(normalizeJob);
}
