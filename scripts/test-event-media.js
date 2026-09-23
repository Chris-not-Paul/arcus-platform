import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const CATALOG_PATH = path.join(ROOT, "public", "data", "event-media", "index.json");
const EVENTS_PATH = path.join(ROOT, "private-data", "professional", "professional-events.json");
const DECISIONS_PATH = path.join(
  ROOT,
  "private-data",
  "professional",
  "event-media-review-decisions.json"
);
const ALLOWED_RIGHTS = new Set([
  "cleared_open",
  "cleared_permission",
  "cleared_restricted",
  "link_only",
  "rejected_unknown",
]);
const ALLOWED_OPEN_LICENSES = new Set([
  "CC0-1.0",
  "CC-BY-2.0",
  "CC-BY-3.0",
  "CC-BY-4.0",
  "CC-BY-SA-3.0",
  "CC-BY-SA-4.0",
  "PDM-1.0",
]);
const AUTHOR_PERMISSION_LICENSE = "ARR-AUTHOR-PERMISSION";

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function localPath(publicUrl) {
  assert.match(publicUrl, /^\/data\/event-media\/[A-Za-z0-9._-]+$/);
  return path.join(ROOT, "public", ...publicUrl.split("/").filter(Boolean));
}

function sha256(filePath) {
  return crypto.createHash("sha256").update(fs.readFileSync(filePath)).digest("hex");
}

const catalog = readJson(CATALOG_PATH);
const eventResource = readJson(EVENTS_PATH);
const events = eventResource.events || eventResource;
const eventIds = new Set(events.map((event) => event.research_event_id || event.event_id));
const reviewCatalog = readJson(DECISIONS_PATH);

assert.equal(catalog.schema_version, "arcus-event-media-v1");
assert.ok(Array.isArray(catalog.assets));
assert.ok(catalog.assets.length > 0);
assert.equal(new Set(catalog.assets.map((asset) => asset.media_id)).size, catalog.assets.length);
assert.equal(reviewCatalog.schema_version, "arcus-event-media-review-v1");
assert.ok(Array.isArray(reviewCatalog.decisions));
assert.equal(
  new Set(reviewCatalog.decisions.map((decision) => decision.event_id)).size,
  reviewCatalog.decisions.length
);

for (const decision of reviewCatalog.decisions) {
  assert.ok(eventIds.has(decision.event_id), `${decision.event_id}: unknown review event`);
  assert.match(decision.reviewed_at, /^\d{4}-\d{2}-\d{2}$/);
  assert.ok(decision.review_status !== "published");
  assert.ok(decision.note.trim());
  assert.ok(Array.isArray(decision.candidate_urls));
  for (const url of decision.candidate_urls) assert.match(url, /^https:\/\//);
}

for (const asset of catalog.assets) {
  assert.match(asset.event_id, /^IT\d{2}\.\d{2}\.\d{2}$/);
  assert.ok(eventIds.has(asset.event_id), `${asset.media_id}: unknown event`);
  assert.ok(ALLOWED_RIGHTS.has(asset.rights_status));
  assert.match(asset.source_page_url, /^https:\/\//);
  if (asset.original_media_url) assert.match(asset.original_media_url, /^https:\/\//);
  assert.match(asset.rights_evidence_url, /^https:\/\//);
  if (asset.license_url) assert.match(asset.license_url, /^https:\/\//);
  assert.ok(asset.creator.trim());
  assert.ok(asset.rights_holder.trim());
  assert.ok(asset.credit_line.includes(asset.creator));
  assert.ok(asset.caption_it.trim() && asset.caption_en.trim());
  assert.ok(asset.alt_it.trim() && asset.alt_en.trim());
  assert.ok(Array.isArray(asset.publication_scope));
  assert.ok(Array.isArray(asset.arcus_modifications));
  assert.equal(asset.causal_evidence, false);

  if (asset.rights_status === "link_only") {
    assert.equal(asset.file, null);
    assert.equal(asset.original_media_url, null);
    assert.equal(asset.license_id, "NOT-CLEARED");
    assert.equal(asset.license_url, null);
    assert.ok(asset.rights_note.trim());
  }

  if (asset.publication_scope.includes("open") && asset.file) {
    assert.ok(
      ["cleared_open", "cleared_permission"].includes(asset.rights_status),
      `${asset.media_id}: public binary requires open terms or direct publication permission`
    );
    if (asset.rights_status === "cleared_open") {
      assert.ok(ALLOWED_OPEN_LICENSES.has(asset.license_id));
    } else {
      assert.equal(asset.license_id, AUTHOR_PERMISSION_LICENSE);
      assert.equal(asset.license_url, null);
      assert.ok(asset.rights_note?.trim());
    }
    assert.ok(asset.file, `${asset.media_id}: public asset requires a local file`);
  }

  if (asset.file) {
    assert.ok(["cleared_open", "cleared_permission"].includes(asset.rights_status));
    const filePath = localPath(asset.file);
    assert.ok(fs.existsSync(filePath), `${asset.media_id}: missing local file`);
    assert.equal(sha256(filePath), asset.checksum_sha256);
    assert.ok(fs.statSync(filePath).size <= 750_000, `${asset.media_id}: image exceeds 750 kB`);
    assert.ok(asset.width > 0 && asset.height > 0);
  }
}

const primaryCounts = catalog.assets.reduce((counts, asset) => {
  if (asset.is_primary) {
    counts.set(asset.event_id, (counts.get(asset.event_id) || 0) + 1);
  }
  return counts;
}, new Map());

assert.equal([...primaryCounts.values()].every((count) => count === 1), true);

const embeddedCount = catalog.assets.filter((asset) => asset.file).length;
const linkOnlyCount = catalog.assets.filter((asset) => asset.rights_status === "link_only").length;
const vvfWebsiteAssets = catalog.assets.filter((asset) =>
  asset.source_page_url.includes("vigilfuoco.tv/")
);
for (const asset of vvfWebsiteAssets) {
  assert.equal(asset.rights_status, "link_only", `${asset.media_id}: VVF website media must remain link-only without written publication permission`);
  assert.equal(asset.file, null);
  assert.equal(asset.original_media_url, null);
}

const directPermissionAssets = catalog.assets.filter(
  (asset) => asset.rights_status === "cleared_permission"
);
assert.equal(directPermissionAssets.length, 4);
assert.equal(
  directPermissionAssets.every(
    (asset) =>
      asset.creator === "Manuel D’Angelo" &&
      asset.license_id === AUTHOR_PERMISSION_LICENSE &&
      asset.rights_holder === "Manuel D’Angelo"
  ),
  true
);
console.log(
  `Event media checks passed (${embeddedCount} embedded assets; ${linkOnlyCount} source-only links).`
);
