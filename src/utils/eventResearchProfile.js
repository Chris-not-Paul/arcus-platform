const LOCATION_PRECISION_ALIASES = new Map([
  ["exact / curated", "exact_curated"],
  ["exact / external reference", "exact_external_reference"],
  ["exact / same structure", "exact_same_structure"],
  ["high-confidence source match", "high_confidence_source_match"],
  ["approximate / site-level", "approximate_site"],
  ["approximate / locality-level", "approximate_locality"],
  ["approximate / frazione-level", "approximate_frazione"],
  ["approximate / unresolved", "approximate_unresolved"],
  ["grouped / collective location", "grouped_collective_location"],
]);

function cleanString(value) {
  if (value === undefined || value === null) return null;

  const text = String(value).replace(/\s+/g, " ").trim();
  return text && !["n/a", "na", "null", "unknown", "-"].includes(text.toLowerCase())
    ? text
    : null;
}

function normalizeNumber(value) {
  const text = cleanString(value);
  if (text === null) return null;

  const number = Number(text.replace(",", "."));
  return Number.isFinite(number) ? number : null;
}

function normalizeBoolean(value) {
  if (typeof value === "boolean") return value;

  const text = cleanString(value)?.toLowerCase();
  if (["true", "1", "yes", "si", "sì"].includes(text)) return true;
  if (["false", "0", "no"].includes(text)) return false;
  return null;
}

function canonicalEventId(event = {}, rawRow = {}) {
  const value = cleanString(
    event.research_event_id || rawRow.event_id || event.event_id
  );

  if (/^IT\d{2}\.\d{2}\.\d{2}$/i.test(value || "")) {
    return value.toUpperCase();
  }

  if (/^B\d{2}\.\d{2}\.\d{2}$/i.test(value || "")) {
    return `IT${value.slice(1)}`.toUpperCase();
  }

  return null;
}

function arcusEventId(event = {}, rawRow = {}) {
  const researchId = canonicalEventId(event, rawRow);
  return researchId ? `B${researchId.slice(2)}` : cleanString(event.event_id);
}

function normalizeLocationPrecision(value) {
  const raw = cleanString(value);

  return {
    raw,
    value: raw ? LOCATION_PRECISION_ALIASES.get(raw.toLowerCase()) || "other_reviewed" : null,
  };
}

function curationSummary(entries = []) {
  const dated = entries
    .map((entry) => cleanString(entry.curation_date))
    .filter(Boolean)
    .sort();
  const evidenceStates = [...new Set(
    entries.map((entry) => cleanString(entry.evidence_level)).filter(Boolean)
  )].sort();
  const fields = [...new Set(
    entries.map((entry) => cleanString(entry.field)).filter(Boolean)
  )].sort();

  return {
    curated_field_count: fields.length,
    curation_entry_count: entries.length,
    evidence_states: evidenceStates,
    fields,
    latest_curation_date: dated.at(-1) || null,
    role:
      "internal traceability summary; rationales and rejected values remain in the controlled curation log",
  };
}

function hydraulicEpisode(event, registry) {
  const eventId = arcusEventId(event);
  const episodeId = registry?.event_to_episode?.[eventId];
  if (!episodeId) return null;

  const episode = registry.episodes?.find((item) => item.episode_id === episodeId);
  return {
    assignment_basis: episode?.grouping_basis || [],
    assignment_confidence: episode?.confidence || null,
    episode_id: episodeId,
    episode_type: "hydraulic",
    independence_eligible: episode?.independence_eligible ?? null,
    review_status: episode?.review_status || null,
  };
}

function hazardRegistryEpisode(event) {
  const cause = cleanString(event.specific_cause);
  const intelligence = cause === "Landslide"
    ? event.landslide_intelligence
    : cause === "Earthquake"
      ? event.seismic_intelligence
      : null;
  const episodeId = cleanString(intelligence?.episode_id);

  if (!episodeId) return null;

  return {
    assignment_basis: ["curated_hazard_registry"],
    assignment_confidence: "curated",
    episode_id: episodeId,
    episode_type: cause === "Landslide" ? "landslide" : "seismic",
    independence_eligible: intelligence?.learning_eligibility?.startsWith("eligible") ?? null,
    review_status: cleanString(intelligence?.curation_status),
  };
}

function fieldRecord(value, options = {}) {
  return {
    evidence_state: value === null ? "unknown" : options.evidenceState || "documented",
    missing_state: value === null ? options.missingState || "not_assessed" : null,
    provenance: options.provenance || null,
    value,
  };
}

const ENRICHABLE_SECTIONS = new Set([
  "bridge_configuration",
  "consequences_and_recovery",
  "event_context",
  "pre_collapse_management",
  "record_precision",
]);

function applyResearchEnrichment(profile, enrichment) {
  if (!enrichment?.fields || typeof enrichment.fields !== "object") {
    return profile;
  }

  const appliedFields = [];
  Object.entries(enrichment.fields).forEach(([path, entry]) => {
    const [section, field, ...remainder] = path.split(".");
    if (
      remainder.length ||
      !ENRICHABLE_SECTIONS.has(section) ||
      !(field in (profile[section] || {}))
    ) {
      return;
    }

    profile[section][field] = fieldRecord(entry?.value ?? null, {
      evidenceState: entry?.evidence_state || "reported",
      missingState: entry?.missing_state,
      provenance: {
        note: cleanString(entry?.note),
        registry_version: enrichment.registry_version || null,
        sources: Array.isArray(entry?.sources) ? entry.sources : [],
      },
    });
    appliedFields.push(path);
  });

  profile.enrichment_summary = {
    applied_field_count: appliedFields.length,
    applied_fields: appliedFields.sort(),
    registry_version: enrichment.registry_version || null,
    review_note: cleanString(enrichment.review_note),
    review_status: cleanString(enrichment.review_status) || "pending_domain_review",
  };

  return profile;
}

export function buildEventResearchProfile({
  curationEntries = [],
  event = {},
  hydraulicEpisodeRegistry = null,
  rawRow = {},
  researchEnrichment = null,
} = {}) {
  const eventId = canonicalEventId(event, rawRow);
  const locationPrecision = normalizeLocationPrecision(rawRow.location_precision);
  const geometry = event.hydraulic_geometry || null;
  const bridgeLength = normalizeNumber(geometry?.bridge_length_m);
  const piersInRiverbed = normalizeBoolean(geometry?.piers_in_active_riverbed);
  const episode = hydraulicEpisode(event, hydraulicEpisodeRegistry) || hazardRegistryEpisode(event);
  const profile = {
    schema_version: "arcus-event-research-schema-v1",
    event_id: eventId,
    bridge_configuration: {
      active_riverbed_pier_count: fieldRecord(null),
      bridge_length_m: fieldRecord(bridgeLength, {
        provenance: geometry?.provenance || null,
      }),
      foundation_type: fieldRecord(null),
      maximum_span_m: fieldRecord(null),
      piers_in_active_riverbed: fieldRecord(piersInRiverbed, {
        provenance: geometry?.provenance || null,
      }),
      span_configuration: fieldRecord(null),
      span_count: fieldRecord(null),
    },
    consequences_and_recovery: {
      closure_duration_days: fieldRecord(null),
      recovery_action: fieldRecord(null),
      reopening_date: fieldRecord(null),
      service_disruption_summary: fieldRecord(null),
    },
    event_context: {
      event_intensity_summary: fieldRecord(null),
    },
    event_episode: episode,
    pre_collapse_management: {
      documented_warning_before_collapse: fieldRecord(null),
      last_inspection_date: fieldRecord(null),
      pre_collapse_condition: fieldRecord(null),
      prior_intervention_summary: fieldRecord(null),
      protective_measure_present: fieldRecord(null),
    },
    provenance_summary: curationSummary(curationEntries),
    record_precision: {
      coordinate_notes: cleanString(rawRow.coordinate_notes),
      coordinate_source_url: cleanString(rawRow.coordinate_source_url),
      coordinate_uncertainty_m: fieldRecord(null),
      event_date_precision: fieldRecord(null),
      location_precision: fieldRecord(locationPrecision.value, {
        provenance: {
          source_field: "EVENTS.location_precision",
          source_value: locationPrecision.raw,
        },
      }),
    },
    readiness: {
      populated_priority_fields: 0,
      role:
        "availability summary only; it is not a quality, vulnerability or safety score",
    },
  };

  applyResearchEnrichment(profile, researchEnrichment);
  profile.readiness.populated_priority_fields = [
    ...Object.values(profile.bridge_configuration),
    ...Object.values(profile.consequences_and_recovery),
    ...Object.values(profile.event_context),
    ...Object.values(profile.pre_collapse_management),
    profile.record_precision.coordinate_uncertainty_m,
    profile.record_precision.event_date_precision,
    profile.record_precision.location_precision,
    profile.record_precision.coordinate_source_url,
    episode?.episode_id,
  ].filter((record) => {
    const value = record && typeof record === "object" && "value" in record
      ? record.value
      : record;
    return value !== null && value !== undefined && String(value).trim() !== "";
  }).length;

  return profile;
}

export function buildEventResearchProfiles({
  curationRows = [],
  events = [],
  hydraulicEpisodeRegistry = null,
  rawRows = [],
  researchEnrichments = [],
} = {}) {
  const rawById = new Map(
    rawRows.map((row) => [canonicalEventId({}, row), row])
  );
  const curationById = curationRows.reduce((index, row) => {
    const eventId = canonicalEventId({}, { event_id: row.event_id });
    if (!eventId) return index;

    const entries = index.get(eventId) || [];
    entries.push(row);
    index.set(eventId, entries);
    return index;
  }, new Map());
  const enrichmentById = new Map(
    researchEnrichments.map((record) => [cleanString(record.event_id)?.toUpperCase(), record])
  );

  return events.map((event) => {
    const eventId = canonicalEventId(event);
    return buildEventResearchProfile({
      curationEntries: curationById.get(eventId) || [],
      event,
      hydraulicEpisodeRegistry,
      rawRow: rawById.get(eventId) || {},
      researchEnrichment: enrichmentById.get(eventId) || null,
    });
  });
}

export function researchFieldValue(profile, field) {
  const paths = {
    active_riverbed_pier_count: ["bridge_configuration", "active_riverbed_pier_count"],
    bridge_length_m: ["bridge_configuration", "bridge_length_m"],
    closure_duration_days: ["consequences_and_recovery", "closure_duration_days"],
    coordinate_source_url: ["record_precision", "coordinate_source_url"],
    coordinate_uncertainty_m: ["record_precision", "coordinate_uncertainty_m"],
    documented_warning_before_collapse: ["pre_collapse_management", "documented_warning_before_collapse"],
    episode_assignment_status: ["event_episode", "review_status"],
    episode_id: ["event_episode", "episode_id"],
    event_intensity_summary: ["event_context", "event_intensity_summary"],
    event_date_precision: ["record_precision", "event_date_precision"],
    foundation_type: ["bridge_configuration", "foundation_type"],
    last_inspection_date: ["pre_collapse_management", "last_inspection_date"],
    location_precision: ["record_precision", "location_precision"],
    maximum_span_m: ["bridge_configuration", "maximum_span_m"],
    piers_in_active_riverbed: ["bridge_configuration", "piers_in_active_riverbed"],
    pre_collapse_condition: ["pre_collapse_management", "pre_collapse_condition"],
    prior_intervention_summary: ["pre_collapse_management", "prior_intervention_summary"],
    protective_measure_present: ["pre_collapse_management", "protective_measure_present"],
    recovery_action: ["consequences_and_recovery", "recovery_action"],
    reopening_date: ["consequences_and_recovery", "reopening_date"],
    service_disruption_summary: ["consequences_and_recovery", "service_disruption_summary"],
    span_configuration: ["bridge_configuration", "span_configuration"],
    span_count: ["bridge_configuration", "span_count"],
  };
  const path = paths[field];
  if (!path) return null;

  const value = path.reduce((current, key) => current?.[key], profile);
  return value && typeof value === "object" && "value" in value ? value.value : value ?? null;
}
