import crypto from "node:crypto";

import { buildHydraulicEpisodeRegistry } from "../../server/collapseEpisodeService.js";

function publicEventId(value) {
  return String(value || "")
    .trim()
    .replace(/^B(?=\d)/, "IT");
}

function stableEpisodeId(type, startDate, eventIds) {
  const digest = crypto
    .createHash("sha256")
    .update(eventIds.slice().sort().join("|"))
    .digest("hex")
    .slice(0, 8);
  const datePart = String(startDate || "undated").replace(/-/g, "");

  return `OEP-${String(type || "event").toUpperCase()}-${datePart}-${digest}`;
}

function episodeKind(events, fallback) {
  const triggers = [...new Set(
    events
      .map((event) => String(event.failure_trigger || "").trim().toLowerCase())
      .filter(Boolean)
  )];

  if (triggers.length === 1) {
    if (triggers[0] === "flood") return "flood";
    if (triggers[0] === "earthquake") return "earthquake";
    if (triggers[0].includes("landslide") || triggers[0].includes("slope")) return "landslide";
  }

  return fallback;
}

function episodeRecord({
  assignmentStatus,
  events,
  groupingBasis,
  sourceLinkage = null,
  type,
}) {
  const sorted = events.slice().sort((left, right) =>
    String(left.date || "").localeCompare(String(right.date || "")) ||
    String(left.event_id).localeCompare(String(right.event_id))
  );
  const eventIds = sorted.map((event) => event.event_id);
  const dates = sorted.map((event) => event.date).filter(Boolean);
  const startDate = dates[0] || null;
  const endDate = dates.at(-1) || null;
  const episodeType = episodeKind(sorted, type);

  return {
    assignment_status: assignmentStatus,
    date_end: endDate,
    date_start: startDate,
    episode_id: stableEpisodeId(episodeType, startDate, eventIds),
    episode_type: episodeType,
    event_count: eventIds.length,
    event_ids: eventIds,
    grouping_basis: groupingBasis,
    provinces: [...new Set(sorted.map((event) => event.province).filter(Boolean))].sort(),
    regions: [...new Set(sorted.map((event) => event.region).filter(Boolean))].sort(),
    source_linkage: sourceLinkage,
  };
}

function curatedHazardEpisodes(events, registries) {
  const eventById = new Map(events.map((event) => [event.event_id, event]));
  const groups = new Map();

  registries.forEach(({ registry, type }) => {
    (registry?.cases || []).forEach((entry) => {
      const eventId = publicEventId(entry.event_id);
      const event = eventById.get(eventId);
      const episodeId = String(entry.episode_id || "").trim();

      if (!event || !episodeId) return;

      const key = `${type}:${episodeId}`;
      const group = groups.get(key) || { events: [], type };
      group.events.push(event);
      groups.set(key, group);
    });
  });

  return [...groups.values()]
    .filter((group) => group.events.length > 1)
    .map((group) => episodeRecord({
      assignmentStatus: "curated_hazard_registry",
      events: group.events,
      groupingBasis: ["curated_hazard_registry"],
      type: group.type,
    }));
}

export function buildOpenSharedEpisodes({
  events = [],
  landslideRegistry = null,
  release = null,
  seismicRegistry = null,
  sources = [],
} = {}) {
  const eventById = new Map(events.map((event) => [event.event_id, event]));
  const hydraulic = buildHydraulicEpisodeRegistry(events, sources).episodes
    .filter((episode) =>
      episode.event_count > 1 &&
      ["supported_by_shared_sources", "curated"].includes(episode.review_status)
    )
    .map((episode) => episodeRecord({
      assignmentStatus: episode.review_status === "curated"
        ? "curated_hazard_registry"
        : "supported_by_shared_sources",
      events: episode.event_ids.map((eventId) => eventById.get(eventId)).filter(Boolean),
      groupingBasis: episode.review_status === "curated"
        ? ["curated_hazard_registry"]
        : ["documented_date_proximity", "shared_documentary_sources"],
      sourceLinkage: {
        linked_event_count: episode.source_linkage?.linked_event_count || 0,
        shared_reference_count: episode.source_linkage?.shared_reference_count || 0,
      },
      type: "hydraulic",
    }));
  const curated = curatedHazardEpisodes(events, [
    { registry: seismicRegistry, type: "seismic" },
    { registry: landslideRegistry, type: "landslide" },
  ]);
  const episodes = [...hydraulic, ...curated]
    .filter((episode) => episode.event_count > 1)
    .sort((left, right) =>
      String(left.date_start || "").localeCompare(String(right.date_start || "")) ||
      left.episode_id.localeCompare(right.episode_id)
    );
  const eventToEpisode = {};

  episodes.forEach((episode) => {
    episode.event_ids.forEach((eventId) => {
      if (eventToEpisode[eventId]) {
        throw new Error(`Open event ${eventId} belongs to more than one published shared episode`);
      }
      eventToEpisode[eventId] = episode.episode_id;
    });
  });

  return {
    event_to_episode: eventToEpisode,
    episodes,
    methodology: {
      caveat: "Published groups identify source-supported or curated shared hazard episodes. They reduce false record independence but do not prove an identical structural failure mechanism across bridges.",
      excluded: [
        "single-record episodes",
        "date-only associations",
        "temporal-regional groups without shared documentary support",
      ],
      inclusion: [
        "multi-record hydraulic groups connected by shared documentary sources",
        "multi-record hazard episodes assigned by a curated registry",
      ],
      unit: "published_shared_hazard_episode",
      version: "arcus-open-shared-episodes-v1",
    },
    release,
    summary: {
      episode_count: episodes.length,
      grouped_event_count: Object.keys(eventToEpisode).length,
      largest_episode_event_count: Math.max(0, ...episodes.map((episode) => episode.event_count)),
      by_type: episodes.reduce((counts, episode) => {
        counts[episode.episode_type] = (counts[episode.episode_type] || 0) + 1;
        return counts;
      }, {}),
    },
  };
}
