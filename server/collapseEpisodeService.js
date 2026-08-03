const DAY_MS = 24 * 60 * 60 * 1000;
const SAME_REGION_GAP_DAYS = 2;

function normalize(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function sourceReference(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/\/+$/, "");
}

function curatedEpisodeId(event = {}) {
  const value = String(
    event.hydraulic_episode_id ||
      event.hydraulic_intelligence?.episode_id ||
      ""
  ).trim();

  if (!value) {
    return null;
  }

  if (!/^hydraulic:curated:[a-z0-9][a-z0-9:_-]*$/i.test(value)) {
    throw new Error(
      `Invalid curated hydraulic episode ID for ${event.event_id || "unknown event"}: ${value}`
    );
  }

  return value;
}

function parsedDay(value) {
  const match = String(value || "").match(
    /^(\d{4})-(\d{2})-(\d{2})$/
  );

  if (!match) {
    return null;
  }

  const timestamp = Date.UTC(
    Number(match[1]),
    Number(match[2]) - 1,
    Number(match[3])
  );

  return Number.isFinite(timestamp) &&
    new Date(timestamp).toISOString().slice(0, 10) === match[0]
    ? timestamp
    : null;
}

function formattedDay(timestamp) {
  return new Date(timestamp).toISOString().slice(0, 10);
}

function shouldShareEpisode(left, right) {
  if (left.curated_episode_id || right.curated_episode_id) {
    return (
      Boolean(left.curated_episode_id) &&
      left.curated_episode_id === right.curated_episode_id
    );
  }

  if (left.day === null || right.day === null) {
    return false;
  }

  const gapDays = Math.abs(left.day - right.day) / DAY_MS;

  if (gapDays === 0) {
    return true;
  }

  return (
    gapDays <= SAME_REGION_GAP_DAYS &&
    Boolean(left.region) &&
    left.region === right.region
  );
}

function referencesByEvent(sources = []) {
  return sources.reduce((index, source) => {
    if (
      !source?.event_id ||
      source.source_role === "Scientific" ||
      source.source_type === "Journal Paper"
    ) {
      return index;
    }

    const references = index.get(source.event_id) || new Set();
    const url = sourceReference(source.source_url);
    const title = normalize(source.source_title);

    if (url) {
      references.add(`url:${url}`);
    }

    if (title) {
      references.add(`title:${title}`);
    }

    index.set(source.event_id, references);
    return index;
  }, new Map());
}

function sourceConnection(entries, eventReferences) {
  const eventIds = entries.map((entry) => String(entry.event.event_id));

  if (eventIds.length < 2) {
    return {
      fully_connected: false,
      linked_event_count: 0,
      shared_reference_count: 0,
    };
  }

  const referenceCounts = new Map();

  eventIds.forEach((eventId) => {
    (eventReferences.get(eventId) || new Set()).forEach((reference) => {
      referenceCounts.set(
        reference,
        (referenceCounts.get(reference) || 0) + 1
      );
    });
  });
  const sharedReferences = new Set(
    [...referenceCounts.entries()]
      .filter(([, count]) => count > 1)
      .map(([reference]) => reference)
  );
  const adjacency = new Map(
    eventIds.map((eventId) => [eventId, new Set()])
  );

  for (let left = 0; left < eventIds.length; left += 1) {
    for (let right = left + 1; right < eventIds.length; right += 1) {
      const leftReferences = eventReferences.get(eventIds[left]) || new Set();
      const rightReferences = eventReferences.get(eventIds[right]) || new Set();
      const linked = [...leftReferences].some(
        (reference) =>
          sharedReferences.has(reference) &&
          rightReferences.has(reference)
      );

      if (linked) {
        adjacency.get(eventIds[left]).add(eventIds[right]);
        adjacency.get(eventIds[right]).add(eventIds[left]);
      }
    }
  }

  const visited = new Set();
  const queue = [eventIds[0]];

  while (queue.length) {
    const eventId = queue.shift();

    if (visited.has(eventId)) {
      continue;
    }

    visited.add(eventId);
    adjacency.get(eventId).forEach((linkedEventId) => {
      if (!visited.has(linkedEventId)) {
        queue.push(linkedEventId);
      }
    });
  }

  return {
    fully_connected: visited.size === eventIds.length,
    linked_event_count: [...adjacency.values()].filter(
      (linked) => linked.size > 0
    ).length,
    shared_reference_count: sharedReferences.size,
  };
}

function episodeAssessment({
  curatedIds,
  eventCount,
  regions,
  sourceLink,
}) {
  if (curatedIds.length === 1) {
    return {
      confidence: "curated_episode_assignment",
      review_status: "curated",
    };
  }

  if (eventCount === 1) {
    return {
      confidence: "dated_singleton",
      review_status: "not_required_singleton",
    };
  }

  if (sourceLink.fully_connected) {
    return {
      confidence: "source_linked_documentation",
      review_status: "supported_by_shared_sources",
    };
  }

  if (regions.length > 1) {
    return {
      confidence: "conservative_cross_region_inference",
      review_status: "review_required",
    };
  }

  return {
    confidence: "temporal_regional_inference",
    review_status: "rule_based_review_recommended",
  };
}

export function buildHydraulicEpisodeRegistry(events = [], sources = []) {
  const eventReferences = referencesByEvent(sources);
  const hydraulicEvents = events
    .filter((event) => event?.event_id && event.hydraulic_intelligence)
    .map((event) => ({
      day: parsedDay(event.date),
      curated_episode_id: curatedEpisodeId(event),
      event,
      region: normalize(event.region),
    }))
    .sort((left, right) =>
      (left.day ?? Number.POSITIVE_INFINITY) -
        (right.day ?? Number.POSITIVE_INFINITY) ||
      String(left.event.event_id).localeCompare(
        String(right.event.event_id)
      )
    );
  const parents = hydraulicEvents.map((_, index) => index);

  function find(index) {
    if (parents[index] !== index) {
      parents[index] = find(parents[index]);
    }

    return parents[index];
  }

  function union(left, right) {
    const leftRoot = find(left);
    const rightRoot = find(right);

    if (leftRoot !== rightRoot) {
      parents[rightRoot] = leftRoot;
    }
  }

  for (let left = 0; left < hydraulicEvents.length; left += 1) {
    for (
      let right = left + 1;
      right < hydraulicEvents.length;
      right += 1
    ) {
      if (shouldShareEpisode(hydraulicEvents[left], hydraulicEvents[right])) {
        union(left, right);
      }
    }
  }

  const grouped = new Map();

  hydraulicEvents.forEach((entry, index) => {
    const root = find(index);
    const group = grouped.get(root) || [];

    group.push(entry);
    grouped.set(root, group);
  });

  const episodes = [...grouped.values()]
    .map((entries) => {
      const dated = entries
        .map((entry) => entry.day)
        .filter((day) => day !== null)
        .sort((left, right) => left - right);
      const eventIds = entries
        .map((entry) => String(entry.event.event_id))
        .sort((left, right) => left.localeCompare(right));
      const startDate = dated.length ? formattedDay(dated[0]) : null;
      const endDate = dated.length
        ? formattedDay(dated[dated.length - 1])
        : null;
      const curatedIds = [...new Set(
        entries
          .map((entry) => entry.curated_episode_id)
          .filter(Boolean)
      )];
      const episodeId = curatedIds.length === 1
        ? curatedIds[0]
        : startDate
          ? `hydraulic:inferred:${startDate}`
          : `hydraulic:undated:${eventIds[0]}`;
      const regions = [...new Set(
        entries
          .map((entry) => entry.event.region)
          .filter(Boolean)
      )].sort((left, right) => left.localeCompare(right));
      const sourceLink = sourceConnection(entries, eventReferences);
      const assessment = episodeAssessment({
        curatedIds,
        eventCount: eventIds.length,
        regions,
        sourceLink,
      });
      const groupingBasis = [];

      if (curatedIds.length === 1) {
        groupingBasis.push("curated_event_field");
      } else if (eventIds.length > 1 && dated.length) {
        if (new Set(dated).size === 1) {
          groupingBasis.push("same_date_national");
        } else {
          groupingBasis.push("same_region_within_48_hours");
        }
      } else if (startDate) {
        groupingBasis.push("dated_singleton");
      } else {
        groupingBasis.push("undated_singleton");
      }

      return {
        confidence: startDate
          ? assessment.confidence
          : "undated_not_independently_counted",
        end_date: endDate,
        episode_id: episodeId,
        event_count: eventIds.length,
        event_ids: eventIds,
        grouping_basis: groupingBasis,
        independence_eligible: Boolean(startDate),
        regions,
        review_status: startDate
          ? assessment.review_status
          : "date_required",
        source_linkage: sourceLink,
        start_date: startDate,
      };
    })
    .sort((left, right) =>
      String(left.start_date || "9999-99-99").localeCompare(
        String(right.start_date || "9999-99-99")
      ) || left.episode_id.localeCompare(right.episode_id)
    );
  const eventToEpisode = {};

  episodes.forEach((episode) => {
    episode.event_ids.forEach((eventId) => {
      eventToEpisode[eventId] = episode.episode_id;
    });
  });

  return {
    episode_count: episodes.length,
    episodes,
    event_to_episode: eventToEpisode,
    methodology: {
      caveat:
        "Episode grouping is a conservative rule-based independence control, not a meteorological reanalysis or proof of common causation.",
      curated_assignment_fields: [
        "hydraulic_episode_id",
        "hydraulic_intelligence.episode_id",
      ],
      curated_id_pattern: "hydraulic:curated:<stable-id>",
      same_date_scope: "national",
      same_region_maximum_gap_days: SAME_REGION_GAP_DAYS,
      source_linkage_exclusions: [
        "source_role:Scientific",
        "source_type:Journal Paper",
      ],
      undated_handling:
        "retained_as_event_evidence_but_excluded_from_independent_episode_support",
      version: "arcus-hydraulic-episode-registry-v2",
    },
    review_required_episode_count: episodes.filter(
      (episode) => episode.review_status === "review_required"
    ).length,
  };
}
