import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";

import {
  contributionsDir,
  contributionsFilePath,
  contributionUploadsDir,
} from "./config.js";
import { writeJsonFile } from "./fileStore.js";

const allowedStatuses = new Set([
  "new",
  "under_review",
  "needs_clarification",
  "accepted",
  "rejected",
  "archived",
]);
const allowedEvidence = new Set([
  "published_source",
  "professional_knowledge",
  "eyewitness",
  "archival_research",
  "other",
]);
const allowedTypes = new Set([
  "factual_correction",
  "new_source",
  "technical_context",
  "missing_event",
  "photo_media",
]);
const imageTypes = {
  "image/jpeg": { extension: "jpg", signature: (buffer) => buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff },
  "image/png": { extension: "png", signature: (buffer) => buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) },
  "image/webp": { extension: "webp", signature: (buffer) => buffer.subarray(0, 4).toString() === "RIFF" && buffer.subarray(8, 12).toString() === "WEBP" },
};

let cache = null;

function clean(value, length) {
  return String(value || "").trim().slice(0, length);
}

function invalid(code) {
  const error = new Error(code);
  error.statusCode = 400;
  throw error;
}

function validUrl(value) {
  try {
    const url = new URL(value);
    return ["http:", "https:"].includes(url.protocol);
  } catch {
    return false;
  }
}

function parseAttachment(attachment) {
  if (!attachment?.dataUrl) return null;
  const match = String(attachment.dataUrl).match(/^data:(image\/(?:jpeg|png|webp));base64,([a-zA-Z0-9+/=]+)$/);
  if (!match || !imageTypes[match[1]]) invalid("invalid_contribution_image");
  const buffer = Buffer.from(match[2], "base64");
  if (!buffer.length || buffer.length > 5 * 1024 * 1024 || !imageTypes[match[1]].signature(buffer)) {
    invalid("invalid_contribution_image");
  }
  const rightsBasis = clean(attachment.rightsBasis, 80);
  const creator = clean(attachment.creator, 160);
  const creditLine = clean(attachment.creditLine, 240);
  if (!rightsBasis || !creator || !creditLine) invalid("image_rights_metadata_required");
  return {
    buffer,
    caption: clean(attachment.caption, 500),
    creditLine,
    creator,
    extension: imageTypes[match[1]].extension,
    mediaType: match[1],
    originalFilename: path.basename(clean(attachment.filename, 180)).replace(/[^a-zA-Z0-9._-]/g, "_"),
    rightsBasis,
    sourceUrl: clean(attachment.sourceUrl, 500),
  };
}

function parseDocumentAttachment(attachment) {
  if (!attachment?.dataUrl) return null;
  const match = String(attachment.dataUrl).match(
    /^data:application\/pdf;base64,([a-zA-Z0-9+/=]+)$/
  );
  if (!match) invalid("invalid_contribution_document");
  const buffer = Buffer.from(match[1], "base64");
  if (
    !buffer.length ||
    buffer.length > 10 * 1024 * 1024 ||
    buffer.subarray(0, 5).toString() !== "%PDF-"
  ) {
    invalid("invalid_contribution_document");
  }
  if (!attachment.rightsConfirmed) {
    invalid("document_sharing_rights_required");
  }
  return {
    buffer,
    mediaType: "application/pdf",
    originalFilename: path.basename(clean(attachment.filename, 180))
      .replace(/[^a-zA-Z0-9._-]/g, "_"),
  };
}

export function validateContribution(payload = {}) {
  if (clean(payload.website, 200)) invalid("contribution_rejected");
  const email = clean(payload.email, 160).toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) invalid("valid_email_required");
  const targetType = clean(payload.targetType, 40);
  if (!["existing_event", "missing_event"].includes(targetType)) invalid("contribution_target_required");
  const eventId = clean(payload.eventId, 40);
  if (targetType === "existing_event" && !/^IT\d{2}\.\d{2}\.\d{2}$/.test(eventId)) invalid("valid_event_id_required");
  const contributionTypes = [...new Set((Array.isArray(payload.contributionTypes) ? payload.contributionTypes : []).filter((value) => allowedTypes.has(value)))];
  if (!contributionTypes.length) invalid("contribution_type_required");
  const evidenceBasis = clean(payload.evidenceBasis, 60);
  if (!allowedEvidence.has(evidenceBasis)) invalid("evidence_basis_required");
  const summary = clean(payload.summary, 5000);
  if (summary.length < 40) invalid("contribution_summary_too_short");
  const sources = (Array.isArray(payload.sources) ? payload.sources : [])
    .map((value) => clean(value, 500))
    .filter(Boolean);
  if (sources.some((value) => !validUrl(value))) invalid("invalid_source_url");
  const sourceAvailability = ["online", "offline_document", "mixed"].includes(
    clean(payload.sourceAvailability, 40)
  ) ? clean(payload.sourceAvailability, 40) : "online";
  const documentSource = {
    accessBasis: clean(payload.documentSource?.accessBasis, 60),
    date: clean(payload.documentSource?.date, 40),
    documentType: clean(payload.documentSource?.documentType, 100),
    issuer: clean(payload.documentSource?.issuer, 240),
    pages: clean(payload.documentSource?.pages, 80),
    reference: clean(payload.documentSource?.reference, 500),
    title: clean(payload.documentSource?.title, 300),
  };
  if (
    ["offline_document", "mixed"].includes(sourceAvailability) &&
    (!documentSource.title || !documentSource.issuer || !documentSource.documentType)
  ) {
    invalid("offline_document_metadata_required");
  }
  if (!payload.termsAccepted) invalid("contribution_terms_required");

  return {
    affiliation: clean(payload.affiliation, 180),
    bridgeName: clean(payload.bridgeName, 240),
    contributionTypes,
    creditPreference: clean(payload.creditPreference, 40) === "anonymous" ? "anonymous" : "public",
    documentSource,
    email,
    evidenceBasis,
    eventDate: clean(payload.eventDate, 40),
    eventId,
    expertRole: clean(payload.expertRole, 160),
    latitude: clean(payload.latitude, 30),
    longitude: clean(payload.longitude, 30),
    name: clean(payload.name, 160),
    orcid: clean(payload.orcid, 40),
    place: clean(payload.place, 240),
    sources,
    sourceAvailability,
    summary,
    targetType,
  };
}

async function load() {
  if (cache) return cache;
  try {
    cache = JSON.parse(await fs.readFile(contributionsFilePath, "utf8")).contributions || [];
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
    cache = [];
  }
  return cache;
}

async function persist(items) {
  await fs.mkdir(contributionsDir, { recursive: true });
  await writeJsonFile(contributionsFilePath, { contributions: items });
  cache = items;
}

export async function createContribution(payload) {
  const data = validateContribution(payload);
  const attachment = parseAttachment(payload.attachment);
  const documentAttachment = parseDocumentAttachment(payload.documentAttachment);
  const id = `contribution-${crypto.randomUUID()}`;
  let storedAttachment = null;
  if (attachment) {
    await fs.mkdir(contributionUploadsDir, { recursive: true });
    const storageName = `${id}.${attachment.extension}`;
    await fs.writeFile(path.join(contributionUploadsDir, storageName), attachment.buffer, { flag: "wx" });
    storedAttachment = {
      bytes: attachment.buffer.length,
      caption: attachment.caption,
      creditLine: attachment.creditLine,
      creator: attachment.creator,
      mediaType: attachment.mediaType,
      originalFilename: attachment.originalFilename,
      rightsBasis: attachment.rightsBasis,
      sha256: crypto.createHash("sha256").update(attachment.buffer).digest("hex"),
      sourceUrl: attachment.sourceUrl,
      storageName,
    };
  }
  let storedDocumentAttachment = null;
  if (documentAttachment) {
    await fs.mkdir(contributionUploadsDir, { recursive: true });
    const storageName = `${id}-document.pdf`;
    await fs.writeFile(
      path.join(contributionUploadsDir, storageName),
      documentAttachment.buffer,
      { flag: "wx" }
    );
    storedDocumentAttachment = {
      bytes: documentAttachment.buffer.length,
      mediaType: documentAttachment.mediaType,
      originalFilename: documentAttachment.originalFilename,
      sha256: crypto.createHash("sha256")
        .update(documentAttachment.buffer)
        .digest("hex"),
      storageName,
    };
  }
  const now = new Date().toISOString();
  const record = { ...data, attachment: storedAttachment, createdAt: now, documentAttachment: storedDocumentAttachment, id, reviewNote: "", reviewedAt: null, reviewedBy: "", status: "new", updatedAt: now };
  const items = await load();
  items.unshift(record);
  await persist(items);
  return record;
}

export async function listContributionsForAdmin(limit = 100) {
  return (await load()).slice(0, Math.max(1, Math.min(Number(limit) || 100, 300)));
}

export async function listPublicContributionAcknowledgements() {
  return (await load())
    .filter((item) => item.status === "accepted" && item.creditPreference === "public")
    .map((item) => ({
      acceptedAt: item.reviewedAt,
      affiliation: item.affiliation,
      contributionTypes: item.contributionTypes,
      eventId: item.eventId,
      id: item.id,
      name: item.name,
      orcid: item.orcid,
    }));
}

export async function getPublicContributionStatus(id) {
  const item = (await load()).find((entry) => entry.id === id);
  if (!item) return null;
  return {
    id: item.id,
    status: item.status,
    updatedAt: item.updatedAt,
  };
}

export async function updateContributionStatus(id, status, reviewer, reviewNote = "") {
  if (!allowedStatuses.has(status)) invalid("invalid_contribution_status");
  const items = await load();
  const index = items.findIndex((item) => item.id === id);
  if (index < 0) return null;
  const now = new Date().toISOString();
  items[index] = { ...items[index], reviewNote: clean(reviewNote, 1000), reviewedAt: status === "new" ? null : now, reviewedBy: status === "new" ? "" : reviewer?.username || "", status, updatedAt: now };
  await persist(items);
  return items[index];
}

export async function getContributionAttachment(id, kind = "image") {
  const item = (await load()).find((entry) => entry.id === id);
  const attachment = kind === "document" ? item?.documentAttachment : item?.attachment;
  if (!attachment?.storageName) return null;
  return { ...attachment, content: await fs.readFile(path.join(contributionUploadsDir, path.basename(attachment.storageName))) };
}
