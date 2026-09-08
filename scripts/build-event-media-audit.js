import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const EVENTS_PATH = path.join(ROOT, "private-data", "professional", "professional-events.json");
const SOURCES_PATH = path.join(ROOT, "private-data", "professional", "professional-sources.json");
const MEDIA_PATH = path.join(ROOT, "public", "data", "event-media", "index.json");
const DECISIONS_PATH = path.join(
  ROOT,
  "private-data",
  "professional",
  "event-media-review-decisions.json"
);
const OUTPUT_PATH = path.join(ROOT, "private-data", "professional", "event-media-audit.json");

function readRows(filePath, key) {
  const payload = JSON.parse(fs.readFileSync(filePath, "utf8"));
  return Array.isArray(payload) ? payload : payload[key] || [];
}

function eventId(event) {
  return event.research_event_id || event.event_id;
}

function priorityScore(event, sourceCount) {
  return (
    (event.bridge_name ? 6 : 0) +
    (event.exact_location === true ? 3 : 0) +
    (event.curation_level === "Flagship" ? 4 : 0) +
    (event.failure_cause_evidence === "Documented" ? 2 : 0) +
    Math.min(sourceCount, 5)
  );
}

const events = readRows(EVENTS_PATH, "events");
const sources = readRows(SOURCES_PATH, "sources");
const mediaCatalog = JSON.parse(fs.readFileSync(MEDIA_PATH, "utf8"));
const reviewCatalog = JSON.parse(fs.readFileSync(DECISIONS_PATH, "utf8"));
const sourcesByEvent = new Map();
const mediaByEvent = new Map();
const decisionsByEvent = new Map(
  reviewCatalog.decisions.map((decision) => [decision.event_id, decision])
);

for (const source of sources) {
  const id = source.research_event_id || source.event_id;
  sourcesByEvent.set(id, (sourcesByEvent.get(id) || 0) + 1);
}

for (const asset of mediaCatalog.assets) {
  const items = mediaByEvent.get(asset.event_id) || [];
  items.push(asset);
  mediaByEvent.set(asset.event_id, items);
}

const records = events
  .map((event) => {
    const id = eventId(event);
    const eventMedia = mediaByEvent.get(id) || [];
    const embeddedMedia = eventMedia.filter(
      (asset) => asset.rights_status === "cleared_open" && asset.file
    );
    const linkedMedia = eventMedia.filter((asset) => asset.rights_status === "link_only");
    const decision = decisionsByEvent.get(id) || null;
    const sourceCount = sourcesByEvent.get(id) || 0;

    return {
      event_id: id,
      event_date: event.date,
      bridge_name: event.bridge_name || null,
      crossing_name: event.bridge_crossing_name || null,
      municipality: event.municipality || null,
      province: event.province || null,
      cause: event.specific_cause || null,
      source_count: sourceCount,
      review_priority: priorityScore(event, sourceCount),
      review_status:
        embeddedMedia.length > 0
          ? "published"
          : linkedMedia.length > 0
            ? "source_link_only"
            : decision?.review_status || "review_required",
      reviewed_at: eventMedia.length > 0 ? mediaCatalog.release : decision?.reviewed_at || null,
      review_note: eventMedia.length > 0 ? null : decision?.note || null,
      candidate_urls: eventMedia.length > 0 ? [] : decision?.candidate_urls || [],
      media_ids: eventMedia.map((asset) => asset.media_id),
      media_phases: [...new Set(eventMedia.map((asset) => asset.event_phase))],
      rights_statuses: [...new Set(eventMedia.map((asset) => asset.rights_status))],
      search_terms: [
        event.bridge_name,
        event.bridge_crossing_name,
        event.municipality,
        String(event.date || "").slice(0, 4),
      ].filter(Boolean),
    };
  })
  .sort(
    (left, right) =>
      (left.review_status === "published") - (right.review_status === "published") ||
      right.review_priority - left.review_priority ||
      String(right.event_date).localeCompare(String(left.event_date)) ||
      left.event_id.localeCompare(right.event_id)
  );

const published = records.filter((record) => record.review_status === "published");
const sourceLinkOnly = records.filter((record) => record.review_status === "source_link_only");
const reviewedWithoutPublication = records.filter(
  (record) =>
    record.review_status !== "published" &&
    record.review_status !== "source_link_only" &&
    record.review_status !== "review_required"
);
const payload = {
  schema_version: "arcus-event-media-audit-v1",
  generated_at: new Date().toISOString(),
  policy_document: "docs/ARCUS_EVENT_MEDIA_POLICY.md",
  summary: {
    total_events: records.length,
    published_events: published.length,
    published_assets: mediaCatalog.assets.filter((asset) => asset.file).length,
    source_link_only_events: sourceLinkOnly.length,
    source_link_only_records: mediaCatalog.assets.filter(
      (asset) => asset.rights_status === "link_only"
    ).length,
    reviewed_without_publication: reviewedWithoutPublication.length,
    review_required: records.filter((record) => record.review_status === "review_required").length,
    causal_evidence_assets: mediaCatalog.assets.filter((asset) => asset.causal_evidence).length,
  },
  records,
};

fs.writeFileSync(OUTPUT_PATH, `${JSON.stringify(payload, null, 2)}\n`);
console.log(JSON.stringify(payload.summary, null, 2));
