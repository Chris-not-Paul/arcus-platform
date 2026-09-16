const DAY_MS = 24 * 60 * 60 * 1000;

export const ANALOGUE_FEATURES = [
  { key: "specific_cause", label: "Cause family", weight: 2 },
  { key: "failure_trigger", label: "Trigger", weight: 2 },
  { key: "failure_process", label: "Failure process", weight: 3 },
  { key: "component_involved", label: "Component", weight: 3 },
  { key: "structural_type", label: "Structural type", weight: 2 },
  { key: "material_type", label: "Material", weight: 2 },
  { key: "destination_use", label: "Use", weight: 1 },
  { key: "collapse_severity", label: "Observed severity", weight: 1 },
];

function normalized(value) {
  return String(value ?? "").trim().toLowerCase();
}

function timestamp(value) {
  const parsed = Date.parse(String(value || ""));
  return Number.isFinite(parsed) ? parsed : null;
}

function strictDayTimestamp(value) {
  const match = String(value || "").match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return null;
  const parsed = Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  return Number.isFinite(parsed) && new Date(parsed).toISOString().slice(0, 10) === match[0]
    ? parsed
    : null;
}

function coordinates(event) {
  const latitude = Number(event?.latitude);
  const longitude = Number(event?.longitude);
  return Number.isFinite(latitude) && Number.isFinite(longitude)
    ? [latitude, longitude]
    : null;
}

function toRadians(value) {
  return (value * Math.PI) / 180;
}

export function haversineKm(left, right) {
  const a = coordinates(left);
  const b = coordinates(right);
  if (!a || !b) return null;

  const latitudeDelta = toRadians(b[0] - a[0]);
  const longitudeDelta = toRadians(b[1] - a[1]);
  const value =
    Math.sin(latitudeDelta / 2) ** 2 +
    Math.cos(toRadians(a[0])) *
      Math.cos(toRadians(b[0])) *
      Math.sin(longitudeDelta / 2) ** 2;

  return 6371 * 2 * Math.atan2(Math.sqrt(value), Math.sqrt(1 - value));
}

function curatedEpisodeId(event) {
  return String(
    event?.hydraulic_episode_id || event?.hydraulic_intelligence?.episode_id || ""
  ).trim() || null;
}

function canShareEpisode(left, right, maximumGapDays, maximumDistanceKm) {
  const leftCurated = curatedEpisodeId(left);
  const rightCurated = curatedEpisodeId(right);

  if (leftCurated || rightCurated) {
    return Boolean(leftCurated && leftCurated === rightCurated);
  }

  const leftTime = timestamp(left.date);
  const rightTime = timestamp(right.date);
  if (leftTime === null || rightTime === null) return false;

  const gapDays = Math.abs(leftTime - rightTime) / DAY_MS;
  if (gapDays > maximumGapDays) return false;

  const distance = haversineKm(left, right);
  if (distance !== null) return distance <= maximumDistanceKm;

  return gapDays === 0 && normalized(left.region) === normalized(right.region);
}

function publicEventId(event) {
  return event?.research_event_id || event?.event_id || "unknown";
}

export function buildResearchEpisodes(events = [], options = {}) {
  const maximumGapDays = Math.max(0, Number(options.maximumGapDays ?? 2));
  const maximumDistanceKm = Math.max(1, Number(options.maximumDistanceKm ?? 150));
  const eligible = events
    .filter((event) => event?.hydraulic_intelligence && event?.date)
    .slice()
    .sort((left, right) =>
      String(left.date).localeCompare(String(right.date)) ||
      publicEventId(left).localeCompare(publicEventId(right))
    );
  const parents = eligible.map((_, index) => index);

  function find(index) {
    if (parents[index] !== index) parents[index] = find(parents[index]);
    return parents[index];
  }

  function union(left, right) {
    const leftRoot = find(left);
    const rightRoot = find(right);
    if (leftRoot !== rightRoot) parents[rightRoot] = leftRoot;
  }

  for (let left = 0; left < eligible.length; left += 1) {
    for (let right = left + 1; right < eligible.length; right += 1) {
      const leftTime = timestamp(eligible[left].date);
      const rightTime = timestamp(eligible[right].date);
      if (
        leftTime !== null &&
        rightTime !== null &&
        (rightTime - leftTime) / DAY_MS > maximumGapDays &&
        !curatedEpisodeId(eligible[left])
      ) break;

      if (canShareEpisode(eligible[left], eligible[right], maximumGapDays, maximumDistanceKm)) {
        union(left, right);
      }
    }
  }

  const grouped = new Map();
  eligible.forEach((event, index) => {
    const root = find(index);
    const members = grouped.get(root) || [];
    members.push(event);
    grouped.set(root, members);
  });

  const episodes = [...grouped.values()]
    .map((members) => {
      const sorted = members.slice().sort((left, right) =>
        String(left.date).localeCompare(String(right.date)) ||
        publicEventId(left).localeCompare(publicEventId(right))
      );
      const curatedIds = [...new Set(sorted.map(curatedEpisodeId).filter(Boolean))];
      const id = curatedIds[0] || `research:inferred:${sorted[0].date}:${publicEventId(sorted[0])}`;
      const regions = [...new Set(sorted.map((event) => event.region).filter(Boolean))].sort();

      return {
        confidence: curatedIds.length
          ? "curated"
          : sorted.length === 1
            ? "dated_singleton"
            : "rule_based_research_group",
        endDate: sorted.at(-1).date,
        eventCount: sorted.length,
        eventIds: sorted.map(publicEventId),
        id,
        members: sorted,
        regions,
        startDate: sorted[0].date,
      };
    })
    .sort((left, right) => right.eventCount - left.eventCount || left.startDate.localeCompare(right.startDate));

  const eventToEpisode = Object.fromEntries(
    episodes.flatMap((episode) => episode.members.map((event) => [event.event_id, episode.id]))
  );
  const undatedCount = events.filter(
    (event) => event?.hydraulic_intelligence && !event?.date
  ).length;

  return {
    eventCount: eligible.length,
    eventToEpisode,
    episodes,
    maximumDistanceKm,
    maximumGapDays,
    multiEventEpisodeCount: episodes.filter((episode) => episode.eventCount > 1).length,
    undatedCount,
    version: "arcus-research-episode-sensitivity-v1",
  };
}

export function buildEpisodeSensitivity(events = []) {
  return [
    { key: "strict", label: "Strict", maximumGapDays: 0, maximumDistanceKm: 50 },
    { key: "reference", label: "Working baseline", maximumGapDays: 2, maximumDistanceKm: 150 },
    { key: "broad", label: "Broad", maximumGapDays: 3, maximumDistanceKm: 300 },
  ].map((scenario) => {
    const registry = buildResearchEpisodes(events, scenario);
    return {
      ...scenario,
      episodeCount: registry.episodes.length,
      largestEpisode: registry.episodes[0]?.eventCount || 0,
      multiEventEpisodeCount: registry.multiEventEpisodeCount,
    };
  });
}

export function buildReferenceHydraulicEpisodes(events = []) {
  const eligible = events
    .filter((event) => event?.hydraulic_intelligence)
    .slice()
    .sort((left, right) =>
      String(left.date).localeCompare(String(right.date)) ||
      publicEventId(left).localeCompare(publicEventId(right))
    );
  const parents = eligible.map((_, index) => index);

  function find(index) {
    if (parents[index] !== index) parents[index] = find(parents[index]);
    return parents[index];
  }

  function union(left, right) {
    const leftRoot = find(left);
    const rightRoot = find(right);
    if (leftRoot !== rightRoot) parents[rightRoot] = leftRoot;
  }

  for (let left = 0; left < eligible.length; left += 1) {
    for (let right = left + 1; right < eligible.length; right += 1) {
      const leftTime = strictDayTimestamp(eligible[left].date);
      const rightTime = strictDayTimestamp(eligible[right].date);
      if (leftTime === null || rightTime === null) continue;
      const gapDays = Math.abs(leftTime - rightTime) / DAY_MS;
      if (gapDays > 2) break;

      const sameDate = gapDays === 0;
      const sameRegion = normalized(eligible[left].region) === normalized(eligible[right].region);
      if (sameDate || (gapDays <= 2 && sameRegion)) union(left, right);
    }
  }

  const groups = new Map();
  eligible.forEach((event, index) => {
    const root = find(index);
    const members = groups.get(root) || [];
    members.push(event);
    groups.set(root, members);
  });
  const episodes = [...groups.values()].map((members, index) => ({
    eventCount: members.length,
    id: `controlled-reference:${String(index + 1).padStart(3, "0")}`,
    members,
  }));

  return {
    episodes,
    eventToEpisode: Object.fromEntries(
      episodes.flatMap((episode) => episode.members.map((event) => [event.event_id, episode.id]))
    ),
    version: "arcus-controlled-reference-concordance-v1",
  };
}

export function compareEpisodeRegistries(candidate, reference) {
  const ids = Object.keys(reference?.eventToEpisode || {}).filter((id) =>
    candidate?.eventToEpisode?.[id]
  );
  let candidatePairs = 0;
  let referencePairs = 0;
  let sharedPairs = 0;

  for (let left = 0; left < ids.length; left += 1) {
    for (let right = left + 1; right < ids.length; right += 1) {
      const candidateSame = candidate.eventToEpisode[ids[left]] === candidate.eventToEpisode[ids[right]];
      const referenceSame = reference.eventToEpisode[ids[left]] === reference.eventToEpisode[ids[right]];
      if (candidateSame) candidatePairs += 1;
      if (referenceSame) referencePairs += 1;
      if (candidateSame && referenceSame) sharedPairs += 1;
    }
  }

  const precision = candidatePairs ? sharedPairs / candidatePairs : 0;
  const recall = referencePairs ? sharedPairs / referencePairs : 0;
  const f1 = precision + recall ? (2 * precision * recall) / (precision + recall) : 0;

  return {
    candidateEpisodeCount: candidate.episodes.length,
    candidatePairs,
    commonEventCount: ids.length,
    f1: Math.round(f1 * 1000) / 1000,
    precision: Math.round(precision * 1000) / 1000,
    recall: Math.round(recall * 1000) / 1000,
    referenceEpisodeCount: reference.episodes.length,
    referencePairs,
    sharedPairs,
  };
}

export function buildEpisodeCalibration(events = []) {
  const reference = buildReferenceHydraulicEpisodes(events);
  const gaps = [0, 1, 2, 3];
  const distances = [50, 150, 300, 600];
  const rows = gaps.flatMap((maximumGapDays) => distances.map((maximumDistanceKm) => {
    const candidate = buildResearchEpisodes(events, { maximumDistanceKm, maximumGapDays });
    return {
      maximumDistanceKm,
      maximumGapDays,
      ...compareEpisodeRegistries(candidate, reference),
    };
  }));

  return {
    best: rows.slice().sort((left, right) =>
      right.f1 - left.f1 ||
      Math.abs(left.candidateEpisodeCount - left.referenceEpisodeCount) -
        Math.abs(right.candidateEpisodeCount - right.referenceEpisodeCount) ||
      left.maximumGapDays - right.maximumGapDays ||
      left.maximumDistanceKm - right.maximumDistanceKm
    )[0] || null,
    reference,
    rows,
  };
}

function valueOrMissing(value) {
  return String(value || "Not documented");
}

export function buildFailureChains(events = [], eventToEpisode = {}) {
  const chains = new Map();

  events.forEach((event) => {
    const trigger = valueOrMissing(event.failure_trigger);
    const process = valueOrMissing(event.failure_process);
    const component = valueOrMissing(event.component_involved);
    const key = [trigger, process, component].join("||");
    const current = chains.get(key) || {
      component,
      eventIds: [],
      episodeIds: new Set(),
      process,
      trigger,
    };
    current.eventIds.push(publicEventId(event));
    const episodeId = eventToEpisode[event.event_id];
    if (episodeId) current.episodeIds.add(episodeId);
    chains.set(key, current);
  });

  return [...chains.values()]
    .map((chain) => ({
      ...chain,
      count: chain.eventIds.length,
      episodeCount: chain.episodeIds.size || null,
      episodeIds: [...chain.episodeIds],
      share: events.length ? Math.round((chain.eventIds.length / events.length) * 1000) / 10 : 0,
    }))
    .sort((left, right) => right.count - left.count || left.trigger.localeCompare(right.trigger));
}

export function retrieveAnalogues(target, candidates = [], options = {}) {
  if (!target) return [];
  const features = options.features?.length ? options.features : ANALOGUE_FEATURES;
  const excludedEpisodeId = options.eventToEpisode?.[target.event_id];

  const sorted = candidates
    .filter((candidate) => candidate.event_id !== target.event_id)
    .filter((candidate) =>
      !options.excludeSameEpisode ||
      !excludedEpisodeId ||
      options.eventToEpisode?.[candidate.event_id] !== excludedEpisodeId
    )
    .map((candidate) => {
      let comparableWeight = 0;
      let matchedWeight = 0;
      const contributions = [];

      features.forEach((feature) => {
        const targetValue = normalized(target[feature.key]);
        const candidateValue = normalized(candidate[feature.key]);
        if (!targetValue || !candidateValue) return;

        const matched = targetValue === candidateValue;
        comparableWeight += feature.weight;
        if (matched) matchedWeight += feature.weight;
        contributions.push({
          key: feature.key,
          label: feature.label,
          matched,
          target: target[feature.key],
          value: candidate[feature.key],
          weight: feature.weight,
        });
      });

      const totalWeight = features.reduce((total, feature) => total + feature.weight, 0);
      return {
        candidate,
        comparableFeatureCount: contributions.length,
        contributions,
        coverage: totalWeight ? Math.round((comparableWeight / totalWeight) * 100) : 0,
        matchedFeatureCount: contributions.filter((item) => item.matched).length,
        score: comparableWeight ? Math.round((matchedWeight / comparableWeight) * 100) : 0,
      };
    })
    .filter((result) => result.comparableFeatureCount >= (options.minimumComparableFeatures || 2))
    .sort((left, right) =>
      right.score - left.score ||
      right.coverage - left.coverage ||
      publicEventId(left.candidate).localeCompare(publicEventId(right.candidate))
    );

  return sorted.map((result) => ({
    ...result,
    equivalentCandidateCount: sorted.filter((candidate) =>
      candidate.score === result.score && candidate.coverage === result.coverage
    ).length,
  }));
}

export function buildAnalogueSensitivity(target, candidates = [], options = {}) {
  const features = options.features?.length ? options.features : ANALOGUE_FEATURES;
  const topK = Math.max(1, Number(options.topK || 5));
  const base = retrieveAnalogues(target, candidates, {
    ...options,
    features,
  }).slice(0, topK);
  const baseIds = new Set(base.map((result) => result.candidate.event_id));
  const rows = features.map((removedFeature) => {
    const reduced = retrieveAnalogues(target, candidates, {
      ...options,
      features: features.filter((feature) => feature.key !== removedFeature.key),
    }).slice(0, topK);
    const retained = reduced.filter((result) => baseIds.has(result.candidate.event_id)).length;

    return {
      removedFeatureKey: removedFeature.key,
      removedFeatureLabel: removedFeature.label,
      retained,
      retention: baseIds.size ? Math.round((retained / baseIds.size) * 100) : 0,
    };
  });

  return {
    baseCount: base.length,
    meanRetention: rows.length
      ? Math.round(rows.reduce((total, row) => total + row.retention, 0) / rows.length)
      : null,
    minimumRetention: rows.length ? Math.min(...rows.map((row) => row.retention)) : null,
    rows,
    topK,
  };
}

function topValue(events, key) {
  const counts = events.reduce((map, event) => {
    const value = event[key];
    if (value) map.set(value, (map.get(value) || 0) + 1);
    return map;
  }, new Map());
  const top = [...counts.entries()].sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0]))[0];
  return top ? { count: top[1], label: top[0], share: Math.round((top[1] / events.length) * 1000) / 10 } : null;
}

export function buildRobustnessScenarios(events = [], sources = [], registry = null) {
  const rolesByEvent = sources.reduce((map, source) => {
    const roles = map.get(source.event_id) || new Set();
    if (source.source_role) roles.add(source.source_role);
    map.set(source.event_id, roles);
    return map;
  }, new Map());
  const evidenceKnown = events.filter((event) =>
    event.failure_cause_evidence && normalized(event.failure_cause_evidence) !== "unspecified"
  );
  const highConfidence = events.filter((event) => normalized(event.source_confidence) === "high");
  const technicalSource = events.filter((event) =>
    [...(rolesByEvent.get(event.event_id) || [])].some((role) =>
      ["official/technical", "scientific"].includes(normalized(role))
    )
  );
  const representativeIds = new Set(
    (registry?.episodes || []).map((episode) => episode.members[0]?.event_id).filter(Boolean)
  );
  const episodeRepresentatives = representativeIds.size
    ? events.filter((event) => representativeIds.has(event.event_id))
    : [];
  const baseTop = topValue(events, "failure_process");

  const scenarios = [
    { key: "all", label: "All records", records: events },
    { key: "evidence", label: "Documented mechanism evidence", records: evidenceKnown },
    { key: "confidence", label: "High source confidence", records: highConfidence },
    { key: "technical", label: "Technical/scientific source", records: technicalSource },
    { key: "episodes", label: "One record per inferred episode", records: episodeRepresentatives },
  ].map((scenario) => {
    const top = topValue(scenario.records, "failure_process");
    return {
      ...scenario,
      records: undefined,
      count: scenario.records.length,
      retention: events.length ? Math.round((scenario.records.length / events.length) * 100) : 0,
      top,
      topRetained: Boolean(baseTop && top && baseTop.label === top.label),
    };
  });

  const eligibleEpisodes = registry?.episodes || [];
  const leaveOneOut = eligibleEpisodes.length && baseTop
    ? eligibleEpisodes.map((episode) => {
        const excluded = new Set(episode.members.map((event) => event.event_id));
        return topValue(events.filter((event) => !excluded.has(event.event_id)), "failure_process")?.label === baseTop.label;
      })
    : [];

  return {
    baseTop,
    leaveOneEpisodeOutStability: leaveOneOut.length
      ? Math.round((leaveOneOut.filter(Boolean).length / leaveOneOut.length) * 100)
      : null,
    scenarios,
  };
}

export function csvValue(value) {
  const text = value === null || value === undefined ? "" : String(value);
  return `"${text.replaceAll('"', '""')}"`;
}

export function rowsToCsv(columns, rows) {
  return [
    columns.join(","),
    ...rows.map((row) => columns.map((column) => csvValue(row[column])).join(",")),
  ].join("\n");
}
