// Session cache: share downloads and parsed JSON across dossiers. Failed requests
// are evicted so a retry can recover; the bounded cache expires after five minutes.
const cache = new Map();
const MAX_ENTRIES = 300;
const MAX_AGE_MS = 5 * 60 * 1000;

export function loadContextJson(url, { timeoutMs = 15000 } = {}) {
  const cached = cache.get(url);
  if (cached && cached.expires > Date.now()) return cached.promise;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  const entry = { expires: Date.now() + MAX_AGE_MS };
  entry.promise = (async () => {
    try {
      const response = await fetch(url, { signal: controller.signal });
      if (!response.ok) throw new Error(`Context request failed (${response.status})`);
      const payload = await response.json();
      if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
        throw new Error("Invalid context document");
      }
      return payload;
    } catch (error) {
      if (cache.get(url) === entry) cache.delete(url);
      throw error;
    } finally {
      clearTimeout(timer);
    }
  })();
  cache.set(url, entry);
  if (cache.size > MAX_ENTRIES) cache.delete(cache.keys().next().value);
  return entry.promise;
}

export function invalidateContextResource(kind, eventId) {
  cache.delete(contextIndexUrl(kind));
  if (["rainfall", "hydraulic"].includes(kind)) {
    cache.delete(`/data/event-context/${kind}/${encodeURIComponent(eventId)}.json`);
  }
}

function contextIndexUrl(kind) {
  return kind === "media"
    ? "/data/event-media/index.json"
    : `/data/event-context/${kind}/index.json`;
}

export function contextMatchesEvent(kind, data, event) {
  if (!data || !event || kind === "media") return true;
  if (data.event_date && data.event_date !== event.date) return false;
  // Hydrometric reports may intentionally describe an approximate river section,
  // identified as such by the dossier; grid and point queries must match exactly.
  const point = kind === "rainfall" ? data.requested_location
    : ["territorial", "hazard-history"].includes(kind) ? data.coordinates : null;
  if (!point) return !["rainfall", "territorial", "hazard-history"].includes(kind);
  return ["latitude", "longitude"].every((key) =>
    Number.isFinite(point[key]) && Number.isFinite(event[key]) && Math.abs(point[key] - event[key]) <= 0.000001
  );
}

export async function loadEventContext(kind, eventId) {
  const indexUrl = contextIndexUrl(kind);
  const index = await loadContextJson(indexUrl);
  if (kind === "media") {
    if (!Array.isArray(index.assets)) {
      cache.delete(indexUrl);
      throw new Error("Invalid media catalogue");
    }
    // The Atlas media surface contains only images ARCUS can actually publish.
    // Source-only references remain available through the event sources and do
    // not create an empty visual card or a misleading Media tab.
    const assets = index.assets.filter((asset) =>
      asset.event_id === eventId &&
      ["cleared_open", "cleared_permission"].includes(asset.rights_status) &&
      Boolean(asset.file)
    ).sort((a, b) => Number(b.is_primary) - Number(a.is_primary));
    return assets.length ? assets : null;
  }
  if (!index.events || typeof index.events !== "object" || Array.isArray(index.events)) {
    cache.delete(indexUrl);
    throw new Error("Invalid context catalogue");
  }
  const entry = index.events[eventId];
  if (!entry) return null;

  if (["rainfall", "hydraulic"].includes(kind)) {
    if (entry.file !== `${eventId}.json`) {
      cache.delete(indexUrl);
      throw new Error("Context file does not match event");
    }
    const url = `/data/event-context/${kind}/${encodeURIComponent(entry.file)}`;
    const payload = await loadContextJson(url);
    const valid = payload.event_id === eventId && (kind === "rainfall"
      ? payload.status === "context_available" && Array.isArray(payload.daily) && payload.daily.length > 0
      : ["context_available", "source_review_required"].includes(payload.status) &&
        payload.event_hydrometry && Array.isArray(payload.sources));
    if (!valid) {
      cache.delete(url);
      throw new Error("Invalid event context");
    }
    return payload;
  }
  const valid = kind === "territorial"
    ? entry.hydraulic && entry.landslide && entry.seismic
    : entry.hazards && Object.values(entry.hazards).every((hazard) => Array.isArray(hazard.observations));
  if (!valid) {
    cache.delete(indexUrl);
    throw new Error("Invalid point context");
  }
  return {
    ...entry,
    caveat: index.caveat,
    coverage: index.coverage,
    release: index.release,
    rights_note: index.rights_note,
    snapshot_latest_query_at: index.snapshot_latest_query_at,
    sources: index.sources,
  };
}
