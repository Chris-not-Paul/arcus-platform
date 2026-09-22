const OPEN_EVENT_FIELDS = [
  "event_id",
  "event_slug",
  "date",
  "municipality",
  "province",
  "province_code",
  "province_key",
  "province_raw",
  "province_validation_status",
  "region",
  "latitude",
  "longitude",
  "bridge_crossing_type",
  "bridge_crossing_name",
  "destination_use",
  "collapse_severity",
  "victims",
  "injuries",
  "triggered",
  "cause_category",
  "specific_cause",
  "failure_trigger",
  "failure_process",
  "component_involved",
  "failure_cause_evidence",
  "hydraulic_intelligence",
  "source_confidence",
  "exact_location",
  "bridge_name",
  "structural_type",
  "material_type",
  "construction_year",
  "construction_year_numeric",
  "construction_year_raw",
  "curation_level",
  "description",
];

const OPEN_SOURCE_FIELDS = [
  "source_id",
  "event_id",
  "source_role",
  "source_type",
  "source_title",
  "source_url",
  "source_reference",
  "publication_date",
  "access_date",
  "language",
];

function selectFields(record, allowlist) {
  return Object.fromEntries(
    allowlist
      .filter((field) => Object.hasOwn(record || {}, field))
      .map((field) => [field, record[field]])
  );
}

const RESEARCH_COMPLETENESS_GROUPS = {
  identity: [
    "event_id",
    "date",
    "municipality",
    "province",
    "region",
    "latitude",
    "longitude",
  ],
  failure_mechanism: [
    "specific_cause",
    "failure_trigger",
    "failure_process",
    "component_involved",
    "failure_cause_evidence",
  ],
  bridge_profile: [
    "structural_type",
    "material_type",
    "destination_use",
    "bridge_crossing_type",
    "bridge_crossing_name",
    "construction_year_numeric",
  ],
  observed_outcome: [
    "collapse_severity",
    "victims",
    "injuries",
  ],
};

function hasResearchValue(value) {
  if (value === null || value === undefined) return false;
  if (typeof value === "number" || typeof value === "boolean") return true;

  const normalized = String(value).trim().toLowerCase();
  return normalized !== "" && ![
    "-",
    "n/a",
    "na",
    "not documented",
    "non documentato",
    "unknown",
    "unspecified",
  ].includes(normalized);
}

export function classifyOpenSource(source) {
  const role = String(source?.source_role || "").trim().toLowerCase();

  if (role.includes("official") || role.includes("technical") || role === "primary") {
    return "official";
  }

  if (role.includes("scientific")) return "scientific";
  if (role.includes("news") || role === "secondary") return "news";
  return "other";
}

export function buildOpenEventResearchSummary({ event, sources = [] }) {
  const groups = Object.entries(RESEARCH_COMPLETENESS_GROUPS).map(([id, fields]) => {
    const missingFields = fields.filter((field) => !hasResearchValue(event?.[field]));
    const available = fields.length - missingFields.length;

    return {
      id,
      available,
      total: fields.length,
      coverage_percent: Math.round((available / fields.length) * 100),
      missing_fields: missingFields,
    };
  });
  const sourceComposition = sources.reduce(
    (counts, source) => ({
      ...counts,
      [classifyOpenSource(source)]: counts[classifyOpenSource(source)] + 1,
    }),
    { official: 0, scientific: 0, news: 0, other: 0 }
  );
  const totalFields = groups.reduce((sum, group) => sum + group.total, 0);
  const availableFields = groups.reduce((sum, group) => sum + group.available, 0);

  return {
    completeness: {
      available_fields: availableFields,
      total_fields: totalFields,
      coverage_percent: Math.round((availableFields / totalFields) * 100),
      groups,
    },
    documentary_basis: {
      linked_sources: sources.length,
      source_composition: sourceComposition,
    },
    interpretation_boundary:
      "Completeness measures record compilation only. Source counts measure documentary volume, not source independence, reliability, causal certainty, asset quality or safety.",
  };
}

export function buildOpenEventCitation({
  event,
  permalink,
  releaseCitation,
  releaseVersion,
}) {
  const recordId = event?.event_id || "ARCUS event";
  const recordTitle =
    event?.bridge_name ||
    event?.bridge_crossing_name ||
    event?.municipality ||
    recordId;
  const datasetCitation = releaseCitation ||
    `ARCUS Open Research (${releaseVersion}). Bridge collapse events in Italy.`;

  return `${datasetCitation} Event record ${recordId}: ${recordTitle}. ${permalink}`;
}

export function buildOpenEventDossier({
  dataCutoff,
  event,
  license,
  permalink,
  releaseCitation,
  releaseVersion,
  sharedEpisode = null,
  sources = [],
}) {
  return {
    schema_version: "arcus-open-event-dossier-v3",
    release: releaseVersion,
    release_metadata: {
      data_cutoff: dataCutoff || null,
      license: license || null,
    },
    citation: buildOpenEventCitation({
      event,
      permalink,
      releaseCitation,
      releaseVersion,
    }),
    permalink,
    event: selectFields(event, OPEN_EVENT_FIELDS),
    shared_episode: sharedEpisode ? {
      assignment_status: sharedEpisode.assignment_status,
      date_end: sharedEpisode.date_end,
      date_start: sharedEpisode.date_start,
      episode_id: sharedEpisode.episode_id,
      episode_type: sharedEpisode.episode_type,
      event_count: sharedEpisode.event_count,
      event_ids: sharedEpisode.event_ids,
      grouping_basis: sharedEpisode.grouping_basis,
      regions: sharedEpisode.regions,
    } : null,
    sources: sources.map((source) =>
      selectFields(source, OPEN_SOURCE_FIELDS)
    ),
    research_metadata: buildOpenEventResearchSummary({ event, sources }),
    rights_note:
      "ARCUS-authored metadata is CC BY 4.0. Linked third-party sources retain their original rights and terms.",
  };
}
