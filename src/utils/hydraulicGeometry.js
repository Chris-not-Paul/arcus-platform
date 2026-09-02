export const HYDRAULIC_GEOMETRY_SOURCE_URL =
  "https://ars.els-cdn.com/content/image/1-s2.0-S2212420925004315-mmc3.xlsx";
export const HYDRAULIC_GEOMETRY_DATASET_ID =
  "dangelo-ballio-ravazzani-2025-s3";

const ALLOWED_MATCH_METHODS = new Set([
  "coordinate_year",
  "explicit_source_record",
]);
const ALLOWED_MATCH_CONFIDENCE = new Set(["high", "medium"]);

function cleanString(value) {
  if (value === undefined || value === null) {
    return null;
  }

  const cleaned = String(value).trim();

  if (
    !cleaned ||
    ["n/a", "na", "null", "unknown", "-"].includes(cleaned.toLowerCase())
  ) {
    return null;
  }

  return cleaned;
}

function normalizeNumber(value) {
  const cleaned = cleanString(value);

  if (cleaned === null) {
    return null;
  }

  const number = Number(cleaned.replace(",", "."));
  return Number.isFinite(number) ? number : null;
}

function normalizeBoolean(value) {
  if (typeof value === "boolean") {
    return value;
  }

  const cleaned = cleanString(value)?.toLowerCase();

  if (["true", "1", "yes", "si", "sì"].includes(cleaned)) {
    return true;
  }

  if (["false", "0", "no"].includes(cleaned)) {
    return false;
  }

  return null;
}

export function normalizeHydraulicGeometry(
  eventRow = {},
  linkRow = {},
  datasetRow = {}
) {
  const warnings = [];
  const sourceRecordId = cleanString(
    linkRow.source_record_id
  )?.toUpperCase();
  const matchMethod = cleanString(linkRow.match_method);
  const matchConfidence = cleanString(
    linkRow.match_confidence
  )?.toLowerCase();
  const datasetId = cleanString(linkRow.dataset_id);
  const sourceUrl = cleanString(datasetRow.source_url);
  const rawLength = normalizeNumber(eventRow.bridge_length_m);
  const rawDistance = normalizeNumber(linkRow.match_distance_m);
  const bridgeLengthM = rawLength !== null && rawLength > 0
    ? rawLength
    : null;
  const piersInActiveRiverbed = normalizeBoolean(
    eventRow.piers_in_active_riverbed
  );
  const hasAnyValue = [
    sourceRecordId,
    datasetId,
    matchMethod,
    matchConfidence,
    sourceUrl,
    rawLength,
    rawDistance,
    piersInActiveRiverbed,
  ].some((value) => value !== null && value !== undefined);

  if (!hasAnyValue) {
    return { hydraulic_geometry: null, warnings };
  }

  if (rawLength !== null && bridgeLengthM === null) {
    warnings.push("invalid_bridge_length_m");
  }

  if (!sourceRecordId || !/^P\d{3}$/.test(sourceRecordId)) {
    warnings.push("invalid_source_record_id");
  }

  if (datasetId !== HYDRAULIC_GEOMETRY_DATASET_ID) {
    warnings.push("unexpected_dataset_id");
  }

  if (!ALLOWED_MATCH_METHODS.has(matchMethod)) {
    warnings.push("invalid_match_method");
  }

  if (!ALLOWED_MATCH_CONFIDENCE.has(matchConfidence)) {
    warnings.push("invalid_match_confidence");
  }

  if (rawDistance === null || rawDistance < 0) {
    warnings.push("invalid_match_distance_m");
  }

  if (sourceUrl !== HYDRAULIC_GEOMETRY_SOURCE_URL) {
    warnings.push("unexpected_source_url");
  }

  if (bridgeLengthM === null && piersInActiveRiverbed === null) {
    warnings.push("geometry_values_missing");
  }

  if (warnings.length) {
    return { hydraulic_geometry: null, warnings };
  }

  return {
    hydraulic_geometry: {
      bridge_length_m: bridgeLengthM,
      piers_in_active_riverbed: piersInActiveRiverbed,
      provenance: {
        dataset_id: datasetId,
        match_confidence: matchConfidence,
        match_distance_m: Number(rawDistance.toFixed(1)),
        match_method: matchMethod,
        source_record_id: sourceRecordId,
        source_url: sourceUrl,
      },
      role:
        "documented historical bridge geometry; not a score and not proof of causal equivalence",
    },
    warnings,
  };
}

export function enrichEventsWithHydraulicGeometry(
  events = [],
  eventRows = [],
  linkRows = [],
  datasetRows = []
) {
  const eventRowsByResearchId = new Map(
    eventRows.map((row) => [cleanString(row.event_id), row])
  );
  const linksByResearchId = new Map(
    linkRows.map((row) => [cleanString(row.event_id), row])
  );
  const datasetsById = new Map(
    datasetRows.map((row) => [cleanString(row.dataset_id), row])
  );

  return events.map((event) => {
    const researchId = cleanString(event.research_event_id)
      || cleanString(event.event_id)?.replace(/^B/, "IT");
    const eventRow = eventRowsByResearchId.get(researchId);
    const linkRow = linksByResearchId.get(researchId);

    if (!eventRow || !linkRow || event.specific_cause !== "Hydraulic") {
      return {
        ...event,
        hydraulic_geometry: null,
      };
    }

    const datasetRow = datasetsById.get(cleanString(linkRow.dataset_id));
    const normalized = normalizeHydraulicGeometry(
      eventRow,
      linkRow,
      datasetRow
    );
    const next = {
      ...event,
      hydraulic_geometry: normalized.hydraulic_geometry,
    };

    if (normalized.warnings.length) {
      next.hydraulic_geometry_warnings = normalized.warnings;
    }

    return next;
  });
}
