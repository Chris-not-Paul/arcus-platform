import crypto from "node:crypto";
import fs from "node:fs/promises";

import {
  failureLearningDir,
  failureLearningFeedbackFilePath,
  failureLearningPseudonymSecretFilePath,
} from "./config.js";
import { writeJsonFile } from "./fileStore.js";

const ratings = new Set([
  "useful",
  "partially_useful",
  "not_useful",
  "insufficient_information",
]);
const reasons = new Set([
  "hazard_comparable",
  "structural_profile_comparable",
  "mechanism_relevant",
  "evidence_strong",
  "key_feature_mismatch",
  "insufficient_data",
  "same_episode_concern",
  "other",
]);
let cache = null;

export const FAILURE_LEARNING_PILOT_TARGETS = Object.freeze({
  activeJudgements: 300,
  decisionRatingsRepresented: 3,
  multiRatedPairRatio: 0.2,
  multiRatedPairs: 20,
  uniqueAnalogueEvents: 20,
  uniqueReviewers: 5,
  uniqueTargetContexts: 30,
});

function clean(value, maximum) {
  return String(value || "").trim().slice(0, maximum);
}

function invalid(code) {
  const error = new Error(code);
  error.statusCode = 400;
  throw error;
}

function finiteCoordinate(value, minimum, maximum) {
  const number = Number(value);
  return Number.isFinite(number) && number >= minimum && number <= maximum
    ? number
    : null;
}

function boundedSnapshot(value, depth = 0) {
  if (depth > 5 || value === null || value === undefined) return null;
  if (["boolean", "number"].includes(typeof value)) {
    return Number.isFinite(value) || typeof value === "boolean" ? value : null;
  }
  if (typeof value === "string") return clean(value, 240);
  if (Array.isArray(value)) {
    return value.slice(0, 40).map((item) => boundedSnapshot(item, depth + 1));
  }
  if (typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value)
        .slice(0, 80)
        .map(([key, item]) => [clean(key, 120), boundedSnapshot(item, depth + 1)])
        .filter(([key]) => key)
    );
  }
  return null;
}

function canonicalize(value) {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.keys(value).sort().map((key) => [key, canonicalize(value[key])])
    );
  }
  return value;
}

function digest(value) {
  return crypto
    .createHash("sha256")
    .update(JSON.stringify(canonicalize(value)))
    .digest("hex");
}

function roundedCoordinate(value) {
  return Math.round(Number(value) * 100000) / 100000;
}

export function failureLearningFingerprints(record) {
  const targetContextFingerprint = `target-${digest({
    projectBridgeProfile: boundedSnapshot(record.projectBridgeProfile || {}),
    projectLocation: {
      latitude: roundedCoordinate(record.projectLocation?.latitude),
      longitude: roundedCoordinate(record.projectLocation?.longitude),
    },
    targetHazardSnapshot: boundedSnapshot(record.targetHazardSnapshot || {}),
  }).slice(0, 24)}`;

  return {
    analoguePairFingerprint: `pair-${digest({
      analogueEventId: record.analogueEventId,
      targetContextFingerprint,
    }).slice(0, 24)}`,
    targetContextFingerprint,
  };
}

export function validateFailureLearningFeedback(payload = {}) {
  const rating = clean(payload.rating, 40);
  if (!ratings.has(rating)) invalid("valid_analogue_rating_required");
  const analogueEventId = clean(payload.analogueEventId, 40);
  if (!/^(?:IT|B)\d{2}\.\d{2}\.\d{2}$/.test(analogueEventId)) {
    invalid("valid_analogue_event_id_required");
  }
  const queryId = clean(payload.queryId, 120);
  if (!queryId) invalid("failure_learning_query_id_required");
  const reasonCodes = [...new Set(
    (Array.isArray(payload.reasonCodes) ? payload.reasonCodes : [])
      .filter((reason) => reasons.has(reason))
  )];
  if (!reasonCodes.length) invalid("analogue_feedback_reason_required");
  const note = clean(payload.note, 1600);
  if (["partially_useful", "not_useful"].includes(rating) && note.length < 20) {
    invalid("analogue_feedback_note_required");
  }
  if (!payload.consentForModelDevelopment) {
    invalid("model_development_consent_required");
  }
  const latitude = finiteCoordinate(payload.projectLocation?.latitude, -90, 90);
  const longitude = finiteCoordinate(payload.projectLocation?.longitude, -180, 180);
  if (latitude === null || longitude === null) {
    invalid("valid_project_location_required");
  }

  return {
    analogueEventId,
    comparisonSnapshot: payload.comparisonSnapshot && typeof payload.comparisonSnapshot === "object"
      ? boundedSnapshot(payload.comparisonSnapshot)
      : {},
    consentForModelDevelopment: true,
    engineVersion: clean(payload.engineVersion, 120),
    projectBridgeProfile: payload.projectBridgeProfile && typeof payload.projectBridgeProfile === "object"
      ? boundedSnapshot(payload.projectBridgeProfile)
      : {},
    projectLocation: {
      latitude,
      longitude,
      province: clean(payload.projectLocation?.province, 120),
    },
    queryId,
    rating,
    reasonCodes,
    retrievalRank: Math.max(1, Math.min(Number(payload.retrievalRank) || 1, 100)),
    targetHazardSnapshot: payload.targetHazardSnapshot && typeof payload.targetHazardSnapshot === "object"
      ? boundedSnapshot(payload.targetHazardSnapshot)
      : {},
    note,
  };
}

async function load() {
  if (cache) return cache;
  try {
    cache = JSON.parse(
      await fs.readFile(failureLearningFeedbackFilePath, "utf8")
    ).judgements || [];
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
    cache = [];
  }
  return cache;
}

async function persist(judgements) {
  await fs.mkdir(failureLearningDir, { recursive: true });
  await writeJsonFile(failureLearningFeedbackFilePath, { judgements });
  cache = judgements;
}

export async function createFailureLearningFeedback(payload, session) {
  const validated = validateFailureLearningFeedback(payload);
  const fingerprints = failureLearningFingerprints(validated);
  const judgements = await load();
  const previous = judgements.find((item) =>
    failureLearningFingerprints(item).analoguePairFingerprint ===
      fingerprints.analoguePairFingerprint &&
    item.reviewerUsername === session?.username &&
    !item.supersededAt
  );
  const now = new Date().toISOString();
  if (previous) previous.supersededAt = now;
  const record = {
    ...validated,
    ...fingerprints,
    createdAt: now,
    id: `analogue-judgement-${crypto.randomUUID()}`,
    reviewerOrganizationId: session?.organizationId || "",
    reviewerRole: session?.role || "professional",
    reviewerUsername: session?.username || "",
    schemaVersion: "arcus-analogue-judgement-v1",
    supersedes: previous?.id || null,
    supersededAt: null,
  };
  judgements.unshift(record);
  await persist(judgements);
  return record;
}

export async function listFailureLearningFeedbackForAdmin(limit = 500) {
  return (await load())
    .map((item) => ({ ...item, ...failureLearningFingerprints(item) }))
    .slice(0, Math.max(1, Math.min(Number(limit) || 500, 2000)));
}

function countBy(items, selector) {
  return items.reduce((counts, item) => {
    const key = selector(item) || "unknown";
    counts[key] = (counts[key] || 0) + 1;
    return counts;
  }, {});
}

function ratio(numerator, denominator) {
  return denominator ? Number((numerator / denominator).toFixed(3)) : 0;
}

function effectiveActiveJudgements(records) {
  const seen = new Set();
  return records
    .filter((item) => !item.supersededAt)
    .sort((left, right) => String(right.createdAt || "").localeCompare(
      String(left.createdAt || "")
    ))
    .filter((item) => {
      const key = `${item.reviewerUsername || "unknown"}:${item.analoguePairFingerprint}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
}

export function buildFailureLearningReadiness(judgements = []) {
  const records = judgements.map((item) => ({
    ...item,
    ...failureLearningFingerprints(item),
  }));
  const nominalActive = records.filter((item) => !item.supersededAt);
  const active = effectiveActiveJudgements(records);
  const reviewerIds = new Set(active.map((item) => item.reviewerUsername).filter(Boolean));
  const targetIds = new Set(active.map((item) => item.targetContextFingerprint));
  const analogueIds = new Set(active.map((item) => item.analogueEventId));
  const pairGroups = new Map();

  active.forEach((item) => {
    const group = pairGroups.get(item.analoguePairFingerprint) || [];
    group.push(item);
    pairGroups.set(item.analoguePairFingerprint, group);
  });

  const multiRatedGroups = [...pairGroups.values()].filter((group) =>
    new Set(group.map((item) => item.reviewerUsername).filter(Boolean)).size >= 2
  );
  let comparisons = 0;
  let agreements = 0;
  multiRatedGroups.forEach((group) => {
    const latestByReviewer = [...new Map(
      group.map((item) => [item.reviewerUsername, item])
    ).values()];
    for (let left = 0; left < latestByReviewer.length; left += 1) {
      for (let right = left + 1; right < latestByReviewer.length; right += 1) {
        comparisons += 1;
        if (latestByReviewer[left].rating === latestByReviewer[right].rating) {
          agreements += 1;
        }
      }
    }
  });

  const ratingDistribution = countBy(active, (item) => item.rating);
  const reasonDistribution = active.reduce((counts, item) => {
    (item.reasonCodes || []).forEach((reason) => {
      counts[reason] = (counts[reason] || 0) + 1;
    });
    return counts;
  }, {});
  const decisionRatingsRepresented = [
    "useful",
    "partially_useful",
    "not_useful",
  ].filter((rating) => ratingDistribution[rating] > 0).length;
  const multiRatedPairRatio = ratio(multiRatedGroups.length, pairGroups.size);
  const observed = {
    activeJudgements: active.length,
    decisionRatingsRepresented,
    multiRatedPairRatio,
    multiRatedPairs: multiRatedGroups.length,
    uniqueAnalogueEvents: analogueIds.size,
    uniqueReviewers: reviewerIds.size,
    uniqueTargetContexts: targetIds.size,
  };
  const gates = Object.fromEntries(
    Object.entries(FAILURE_LEARNING_PILOT_TARGETS).map(([key, target]) => [
      key,
      { met: observed[key] >= target, observed: observed[key], target },
    ])
  );
  const ready = Object.values(gates).every((gate) => gate.met);

  return {
    agreement: {
      exactPairwiseAgreement: comparisons ? ratio(agreements, comparisons) : null,
      pairwiseComparisons: comparisons,
      scope: "same_target_analogue_pair_different_reviewers",
    },
    distributions: {
      ratings: ratingDistribution,
      reasons: reasonDistribution,
    },
    gates,
    limitations: [
      "Pilot targets are governance thresholds, not validated scientific cut-offs.",
      "Exact pairwise agreement is descriptive and is not an inter-rater reliability coefficient.",
      "Passing all gates permits only an offline baseline comparison, never production prediction.",
    ],
    observed,
    schemaVersion: "arcus-failure-learning-readiness-v1",
    status: ready
      ? "ready_for_offline_baseline_assessment"
      : "not_ready_for_model_training",
    supersededJudgements: records.filter((item) => item.supersededAt).length,
    unresolvedDuplicateActiveJudgements: nominalActive.length - active.length,
  };
}

async function pseudonymSecret() {
  try {
    return (await fs.readFile(failureLearningPseudonymSecretFilePath, "utf8")).trim();
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
  }
  await fs.mkdir(failureLearningDir, { recursive: true });
  const value = crypto.randomBytes(32).toString("hex");
  try {
    await fs.writeFile(failureLearningPseudonymSecretFilePath, value, {
      encoding: "utf8",
      flag: "wx",
    });
    return value;
  } catch (error) {
    if (error.code !== "EEXIST") throw error;
    return (await fs.readFile(failureLearningPseudonymSecretFilePath, "utf8")).trim();
  }
}

export async function buildDeidentifiedFailureLearningDataset(judgements = []) {
  const secret = await pseudonymSecret();
  const active = effectiveActiveJudgements(
    judgements.map((item) => ({ ...item, ...failureLearningFingerprints(item) }))
  );
  const reviewerCode = (username) => `expert-${crypto
    .createHmac("sha256", secret)
    .update(String(username || "unknown").trim().toLowerCase())
    .digest("hex")
    .slice(0, 16)}`;

  return {
    generatedAt: new Date().toISOString(),
    manifest: {
      excludedFields: [
        "exact_project_location",
        "organization",
        "query_id",
        "reviewer_identity",
        "technical_free_text_note",
      ],
      intendedUse: "offline_analogue_ranking_calibration_and_validation_only",
      privacyStatus: "pseudonymised_and_deidentified_not_anonymous",
      recordCount: active.length,
      schemaVersion: "arcus-failure-learning-calibration-export-v1",
    },
    readiness: buildFailureLearningReadiness(judgements),
    records: active.map((item) => ({
      analogueEventId: item.analogueEventId,
      analoguePairFingerprint: item.analoguePairFingerprint,
      comparisonSnapshot: item.comparisonSnapshot,
      createdAt: item.createdAt,
      engineVersion: item.engineVersion,
      projectBridgeProfile: item.projectBridgeProfile,
      rating: item.rating,
      reasonCodes: item.reasonCodes,
      retrievalRank: item.retrievalRank,
      reviewerCode: reviewerCode(item.reviewerUsername),
      schemaVersion: item.schemaVersion,
      targetContextFingerprint: item.targetContextFingerprint,
      targetHazardSnapshot: item.targetHazardSnapshot,
    })),
  };
}

export async function getFailureLearningReadinessForAdmin() {
  return buildFailureLearningReadiness(await load());
}

export async function getDeidentifiedFailureLearningDatasetForAdmin() {
  return buildDeidentifiedFailureLearningDataset(await load());
}
