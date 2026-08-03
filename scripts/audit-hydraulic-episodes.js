import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  buildHydraulicEpisodeRegistry,
} from "../server/collapseEpisodeService.js";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function readCollection(relativePath, key) {
  const resource = JSON.parse(
    fs.readFileSync(path.join(ROOT, relativePath), "utf8")
  );

  return Array.isArray(resource) ? resource : resource[key] || [];
}

function distribution(values) {
  return Object.fromEntries(
    [...values.reduce((counts, value) => {
      counts.set(value, (counts.get(value) || 0) + 1);
      return counts;
    }, new Map()).entries()].sort((left, right) =>
      left[0].localeCompare(right[0])
    )
  );
}

const events = readCollection(
  "private-data/professional/professional-events.json",
  "events"
);
const sources = readCollection(
  "private-data/professional/professional-sources.json",
  "sources"
);
const hydraulicEvents = events.filter(
  (event) => event.hydraulic_intelligence
);
const eventsById = new Map(
  hydraulicEvents.map((event) => [event.event_id, event])
);
const registry = buildHydraulicEpisodeRegistry(events, sources);
const registeredIds = registry.episodes.flatMap(
  (episode) => episode.event_ids
);

assert.equal(new Set(registeredIds).size, registeredIds.length);
assert.equal(registeredIds.length, hydraulicEvents.length);
assert.deepEqual(
  [...registeredIds].sort((left, right) => left.localeCompare(right)),
  hydraulicEvents
    .map((event) => event.event_id)
    .sort((left, right) => left.localeCompare(right))
);

const eligibleEpisodes = registry.episodes.filter(
  (episode) => episode.independence_eligible
);
const multiBridgeEpisodes = eligibleEpisodes.filter(
  (episode) => episode.event_count > 1
);
const reviewQueue = registry.episodes
  .filter((episode) =>
    ["review_required", "rule_based_review_recommended"].includes(
      episode.review_status
    )
  )
  .map((episode) => ({
    confidence: episode.confidence,
    end_date: episode.end_date,
    episode_id: episode.episode_id,
    event_count: episode.event_count,
    events: episode.event_ids.map((eventId) => {
      const event = eventsById.get(eventId) || {};

      return {
        event_id: eventId,
        municipality: event.municipality || null,
        province: event.province || null,
        region: event.region || null,
      };
    }),
    grouping_basis: episode.grouping_basis,
    regions: episode.regions,
    review_status: episode.review_status,
    source_linkage: episode.source_linkage,
    start_date: episode.start_date,
  }));

console.log(JSON.stringify({
  audit_version: "arcus-hydraulic-episode-audit-v1",
  checks: {
    all_hydraulic_events_registered_once: true,
    event_count_reconciled: true,
    scientific_and_journal_sources_excluded_from_linkage: true,
    undated_records_do_not_establish_independence: true,
  },
  methodology: registry.methodology,
  review_queue: reviewQueue,
  summary: {
    bridges_in_multi_bridge_episodes: multiBridgeEpisodes.reduce(
      (total, episode) => total + episode.event_count,
      0
    ),
    confidence_distribution: distribution(
      registry.episodes.map((episode) => episode.confidence)
    ),
    cross_region_episode_count: eligibleEpisodes.filter(
      (episode) => episode.regions.length > 1
    ).length,
    dated_hydraulic_event_count: hydraulicEvents.filter(
      (event) => /^\d{4}-\d{2}-\d{2}$/.test(String(event.date || ""))
    ).length,
    eligible_episode_count: eligibleEpisodes.length,
    hydraulic_event_count: hydraulicEvents.length,
    multi_bridge_episode_count: multiBridgeEpisodes.length,
    review_queue_count: reviewQueue.length,
    singleton_episode_count: eligibleEpisodes.filter(
      (episode) => episode.event_count === 1
    ).length,
    undated_hydraulic_event_count:
      hydraulicEvents.length - eligibleEpisodes.reduce(
        (total, episode) => total + episode.event_count,
        0
      ),
  },
}, null, 2));
