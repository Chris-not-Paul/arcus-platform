import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const AUDIT_PATH = path.join(ROOT, "private-data", "professional", "event-media-audit.json");
const SOURCES_PATH = path.join(ROOT, "private-data", "professional", "professional-sources.json");
const OUTPUT_PATH = path.join(
  ROOT,
  "private-data",
  "professional",
  "event-source-media-candidates.json"
);
const USER_AGENT = "ARCUS event-source media rights review/1.0";

function argument(name, fallback) {
  const prefix = `--${name}=`;
  const raw = process.argv.find((value) => value.startsWith(prefix));
  return raw ? Number(raw.slice(prefix.length)) : fallback;
}

function booleanArgument(name, fallback = false) {
  const prefix = `--${name}=`;
  const raw = process.argv.find((value) => value.startsWith(prefix));
  if (!raw) return fallback;
  return ["1", "true", "yes"].includes(raw.slice(prefix.length).toLowerCase());
}

function decodeHtml(value = "") {
  return String(value)
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#039;|&apos;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}

function metaContent(html, key) {
  const escaped = key.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const patterns = [
    new RegExp(`<meta[^>]+(?:property|name)=["']${escaped}["'][^>]+content=["']([^"']+)`, "i"),
    new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+(?:property|name)=["']${escaped}["']`, "i"),
  ];
  for (const pattern of patterns) {
    const match = html.match(pattern);
    if (match) return decodeHtml(match[1]);
  }
  return null;
}

function rightsSignals(html) {
  const compact = html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ");
  const matches = compact.match(
    /.{0,100}(?:creative commons|CC[- ]BY(?:[- ]SA)?|all rights reserved|tutti i diritti riservati|diritto d.autore).{0,160}/gi
  );
  return [...new Set((matches || []).map((value) => value.trim()))].slice(0, 6);
}

async function inspectSource(source) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15_000);
  try {
    const response = await fetch(source.source_url, {
      headers: { "User-Agent": USER_AGENT },
      signal: controller.signal,
    });
    const contentType = response.headers.get("content-type") || "";
    if (!response.ok || !contentType.includes("text/html")) {
      return {
        source_url: source.source_url,
        source_title: source.source_title,
        publisher: source.source_publisher || source.source_type || null,
        http_status: response.status,
        content_type: contentType,
        media_url: null,
        rights_signals: [],
      };
    }
    const html = await response.text();
    return {
      source_url: source.source_url,
      source_title: source.source_title,
      publisher: source.source_publisher || source.source_type || null,
      http_status: response.status,
      content_type: contentType,
      media_url:
        metaContent(html, "og:image") ||
        metaContent(html, "twitter:image") ||
        metaContent(html, "twitter:image:src"),
      media_type: metaContent(html, "og:type"),
      rights_signals: rightsSignals(html),
    };
  } catch (error) {
    return {
      source_url: source.source_url,
      source_title: source.source_title,
      publisher: source.source_publisher || source.source_type || null,
      media_url: null,
      rights_signals: [],
      error: error.name === "AbortError" ? "timeout" : error.message,
    };
  } finally {
    clearTimeout(timeout);
  }
}

const offset = argument("offset", 0);
const limit = argument("limit", 20);
const onlyUnscanned = booleanArgument("only-unscanned");
const audit = JSON.parse(fs.readFileSync(AUDIT_PATH, "utf8"));
const sourcePayload = JSON.parse(fs.readFileSync(SOURCES_PATH, "utf8"));
const sources = sourcePayload.sources || sourcePayload;
const previous = fs.existsSync(OUTPUT_PATH)
  ? JSON.parse(fs.readFileSync(OUTPUT_PATH, "utf8"))
  : { schema_version: "arcus-event-source-media-candidates-v1", records: [] };
const previouslyScannedIds = new Set(previous.records.map((record) => record.event_id));
const eventBatch = audit.records
  .filter(
    (record) =>
      record.review_status === "review_required" &&
      (!onlyUnscanned || !previouslyScannedIds.has(record.event_id))
  )
  .slice(offset, offset + limit);
const selectedIds = new Set(eventBatch.map((record) => record.event_id));
const sourcesByEvent = new Map();

for (const source of sources) {
  const id = source.research_event_id || source.event_id;
  if (!selectedIds.has(id) || !/^https?:\/\//.test(source.source_url || "")) continue;
  const items = sourcesByEvent.get(id) || [];
  if (items.length < 6) items.push(source);
  sourcesByEvent.set(id, items);
}

const discovered = [];
for (const event of eventBatch) {
  const eventSources = sourcesByEvent.get(event.event_id) || [];
  const candidates = [];
  for (const source of eventSources) {
    candidates.push(await inspectSource(source));
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  discovered.push({
    event_id: event.event_id,
    inspected_at: new Date().toISOString(),
    source_count: eventSources.length,
    media_candidates: candidates,
  });
}

const merged = new Map(previous.records.map((record) => [record.event_id, record]));
for (const record of discovered) merged.set(record.event_id, record);
const output = {
  schema_version: "arcus-event-source-media-candidates-v1",
  updated_at: new Date().toISOString(),
  notice: "Discovery output only. Media URLs must not be copied, embedded or downloaded until manual identity and rights review confirms permission.",
  records: [...merged.values()].sort((a, b) => a.event_id.localeCompare(b.event_id)),
};

fs.writeFileSync(OUTPUT_PATH, `${JSON.stringify(output, null, 2)}\n`);
console.log(
  JSON.stringify(
    {
      events: eventBatch.length,
      only_unscanned: onlyUnscanned,
      sources: discovered.reduce((sum, record) => sum + record.source_count, 0),
      pages_with_media: discovered.reduce(
        (sum, record) =>
          sum + record.media_candidates.filter((candidate) => candidate.media_url).length,
        0
      ),
      pages_with_rights_signals: discovered.reduce(
        (sum, record) =>
          sum + record.media_candidates.filter((candidate) => candidate.rights_signals.length).length,
        0
      ),
      output: path.relative(ROOT, OUTPUT_PATH),
    },
    null,
    2
  )
);
