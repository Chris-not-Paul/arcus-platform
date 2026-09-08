import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const PRIVATE_ROOT = path.join(ROOT, "private-data", "professional");
const AUDIT_PATH = path.join(PRIVATE_ROOT, "event-media-audit.json");
const EVENTS_PATH = path.join(PRIVATE_ROOT, "professional-events.json");
const SOURCES_PATH = path.join(PRIVATE_ROOT, "professional-sources.json");
const SOURCE_MEDIA_PATH = path.join(PRIVATE_ROOT, "event-source-media-candidates.json");
const OUTPUT_PATH = path.join(PRIVATE_ROOT, "event-media-candidates.json");
const COMMONS_API = "https://commons.wikimedia.org/w/api.php";
const USER_AGENT = "ARCUS event-media research/2.0 (manual review workflow)";
const REQUEST_INTERVAL_MS = 450;
const MAX_ATTEMPTS = 2;
const RESULTS_PER_QUERY = 8;
const REQUEST_TIMEOUT_MS = 15_000;

function numericArgument(name, fallback) {
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

async function mapLimit(items, concurrency, worker) {
  const results = new Array(items.length);
  let cursor = 0;
  async function run() {
    while (cursor < items.length) {
      const index = cursor;
      cursor += 1;
      results[index] = await worker(items[index]);
      await new Promise((resolve) => setTimeout(resolve, REQUEST_INTERVAL_MS));
    }
  }
  await Promise.all(Array.from({ length: Math.min(concurrency, items.length) }, run));
  return results;
}

function plainText(value = "") {
  return String(value)
    .replace(/<[^>]*>/g, " ")
    .replace(/&quot;/g, '"')
    .replace(/&#039;|&apos;/g, "'")
    .replace(/&amp;/g, "&")
    .replace(/\s+/g, " ")
    .trim();
}

function normalized(value = "") {
  return plainText(value)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function rows(filePath, key) {
  const payload = JSON.parse(fs.readFileSync(filePath, "utf8"));
  return Array.isArray(payload) ? payload : payload[key] || [];
}

function eventId(record) {
  return record.research_event_id || record.event_id;
}

function quoted(value) {
  const clean = plainText(value).replace(/["<>]/g, " ").replace(/\s+/g, " ").trim();
  return clean ? `"${clean}"` : null;
}

function discoveryQueries(record, event, sourceRows) {
  const year = String(record.event_date || "").slice(0, 4);
  const municipality = record.municipality;
  const bridge = record.bridge_name;
  const crossing = record.crossing_name;
  const queries = [];

  if (bridge) queries.push([quoted(bridge), quoted(municipality)].filter(Boolean).join(" "));
  if (crossing) {
    queries.push([quoted(crossing), quoted(municipality), "ponte"].filter(Boolean).join(" "));
  }
  queries.push([quoted(municipality), "ponte crollato", year].filter(Boolean).join(" "));

  const descriptiveTitle = sourceRows
    .map((source) => source.source_title)
    .filter(Boolean)
    .find((title) => {
      const text = normalized(title);
      return [bridge, crossing, municipality]
        .filter(Boolean)
        .some((term) => text.includes(normalized(term)));
    });
  if (descriptiveTitle) {
    queries.push([quoted(descriptiveTitle), quoted(municipality)].filter(Boolean).join(" "));
  } else if (event?.description) {
    const placeTokens = [bridge, crossing, municipality].filter(Boolean).join(" ");
    queries.push([quoted(placeTokens), "alluvione OR crollo"].filter(Boolean).join(" "));
  }

  return [...new Set(queries.filter(Boolean))].slice(0, 4);
}

function candidate(page) {
  const info = page.imageinfo?.[0] || {};
  const metadata = info.extmetadata || {};
  return {
    title: page.title,
    source_page_url: info.descriptionurl || null,
    original_media_url: info.url || null,
    thumbnail_url: info.thumburl || null,
    width: info.width || null,
    height: info.height || null,
    mime_type: info.mime || null,
    creator: plainText(metadata.Artist?.value),
    captured_at: metadata.DateTimeOriginal?.value || metadata.DateTime?.value || null,
    license_id: metadata.LicenseShortName?.value || null,
    license_url: metadata.LicenseUrl?.value || null,
    description: plainText(metadata.ImageDescription?.value),
  };
}

function evidenceScore(item, record) {
  const haystack = normalized(
    [item.title, item.description, item.creator, item.captured_at].filter(Boolean).join(" ")
  );
  const year = String(record.event_date || "").slice(0, 4);
  let score = 0;
  if (record.bridge_name && haystack.includes(normalized(record.bridge_name))) score += 6;
  if (record.crossing_name && haystack.includes(normalized(record.crossing_name))) score += 5;
  if (record.municipality && haystack.includes(normalized(record.municipality))) score += 3;
  if (year && haystack.includes(year)) score += 2;
  if (/croll|collaps|alluv|flood|piena|dannegg|cediment/.test(haystack)) score += 2;
  if (!String(item.mime_type || "").startsWith("image/")) score -= 20;
  return score;
}

async function fetchCommons(query) {
  const params = new URLSearchParams({
    action: "query",
    format: "json",
    formatversion: "2",
    generator: "search",
    gsrnamespace: "6",
    gsrlimit: String(RESULTS_PER_QUERY),
    gsrsearch: query,
    prop: "imageinfo",
    iiprop: "url|size|mime|extmetadata",
    iiurlwidth: "960",
    origin: "*",
  });
  let response;
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt += 1) {
    response = await fetch(`${COMMONS_API}?${params}`, {
      headers: { "User-Agent": USER_AGENT },
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
    if (response.ok) break;
    if (response.status !== 429 || attempt === MAX_ATTEMPTS) {
      throw new Error(`Commons API ${response.status}`);
    }
    const retryAfter = Number(response.headers.get("retry-after"));
    const waitMs = Number.isFinite(retryAfter)
      ? Math.min(15_000, Math.max(1_000, retryAfter * 1_000))
      : attempt * 2_000;
    await new Promise((resolve) => setTimeout(resolve, waitMs));
  }
  const payload = await response.json();
  return (payload.query?.pages || []).map(candidate);
}

async function searchCommons(record, event, sourceRows) {
  const queries = discoveryQueries(record, event, sourceRows);
  const merged = new Map();
  const errors = [];
  const results = await Promise.allSettled(queries.map((query) => fetchCommons(query)));
  for (const [index, result] of results.entries()) {
    const query = queries[index];
    if (result.status === "fulfilled") {
      const candidates = result.value;
      for (const item of candidates) {
        if (!String(item.mime_type || "").startsWith("image/")) continue;
        const key = item.source_page_url || item.original_media_url || item.title;
        const current = merged.get(key) || { ...item, matched_queries: [] };
        current.matched_queries.push(query);
        merged.set(key, current);
      }
    } else {
      errors.push({ query, error: result.reason?.message || String(result.reason) });
    }
  }
  const candidates = [...merged.values()]
    .map((item) => ({ ...item, discovery_score: evidenceScore(item, record) }))
    .sort(
      (left, right) =>
        right.discovery_score - left.discovery_score ||
        right.matched_queries.length - left.matched_queries.length ||
        left.title.localeCompare(right.title)
    );
  return {
    event_id: record.event_id,
    queries,
    searched_at: new Date().toISOString(),
    candidates,
    ...(errors.length ? { errors } : {}),
  };
}

const offset = numericArgument("offset", 0);
const limit = numericArgument("limit", 25);
const concurrency = Math.max(1, Math.min(4, numericArgument("concurrency", 2)));
const sourceImagesOnly = booleanArgument("source-images-only");
const audit = JSON.parse(fs.readFileSync(AUDIT_PATH, "utf8"));
const events = rows(EVENTS_PATH, "events");
const sources = rows(SOURCES_PATH, "sources");
const eventsById = new Map(events.map((event) => [eventId(event), event]));
const sourcesById = new Map();
for (const source of sources) {
  const id = eventId(source);
  sourcesById.set(id, [...(sourcesById.get(id) || []), source]);
}
const previous = fs.existsSync(OUTPUT_PATH)
  ? JSON.parse(fs.readFileSync(OUTPUT_PATH, "utf8"))
  : { schema_version: "arcus-event-media-candidates-v2", records: [] };
const sourceMedia = fs.existsSync(SOURCE_MEDIA_PATH)
  ? JSON.parse(fs.readFileSync(SOURCE_MEDIA_PATH, "utf8"))
  : { records: [] };
const sourceImageIds = new Set(
  sourceMedia.records
    .filter((record) => record.media_candidates?.some((candidate) => candidate.media_url))
    .map((record) => record.event_id)
);
const eligible = audit.records.filter(
  (record) =>
    record.review_status === "review_required" &&
    (!sourceImagesOnly || sourceImageIds.has(record.event_id))
);
const batch = eligible.slice(offset, offset + limit);
const discovered = await mapLimit(batch, concurrency, (record) =>
  searchCommons(record, eventsById.get(record.event_id), sourcesById.get(record.event_id) || [])
);

const merged = new Map(previous.records.map((record) => [record.event_id, record]));
for (const record of discovered) merged.set(record.event_id, record);
const output = {
  schema_version: "arcus-event-media-candidates-v2",
  updated_at: new Date().toISOString(),
  source: "Wikimedia Commons MediaWiki API",
  notice:
    "Discovery output only. Every candidate requires manual asset-identity, event-phase and rights review before publication.",
  records: [...merged.values()].sort((a, b) => a.event_id.localeCompare(b.event_id)),
};

fs.writeFileSync(OUTPUT_PATH, `${JSON.stringify(output, null, 2)}\n`);
console.log(
  JSON.stringify(
    {
      offset,
      concurrency,
      source_images_only: sourceImagesOnly,
      requested: batch.length,
      completed: discovered.filter((record) => !record.errors?.length).length,
      events_with_errors: discovered.filter((record) => record.errors?.length).length,
      queries: discovered.reduce((sum, record) => sum + record.queries.length, 0),
      candidates: discovered.reduce((sum, record) => sum + record.candidates.length, 0),
      scored_candidates: discovered.reduce(
        (sum, record) => sum + record.candidates.filter((item) => item.discovery_score > 0).length,
        0
      ),
      output: path.relative(ROOT, OUTPUT_PATH),
    },
    null,
    2
  )
);
