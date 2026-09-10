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
  event,
  permalink,
  releaseCitation,
  releaseVersion,
  sources = [],
}) {
  return {
    schema_version: "arcus-open-event-dossier-v1",
    release: releaseVersion,
    citation: buildOpenEventCitation({
      event,
      permalink,
      releaseCitation,
      releaseVersion,
    }),
    permalink,
    event: selectFields(event, OPEN_EVENT_FIELDS),
    sources: sources.map((source) =>
      selectFields(source, OPEN_SOURCE_FIELDS)
    ),
    rights_note:
      "ARCUS-authored metadata is CC BY 4.0. Linked third-party sources retain their original rights and terms.",
  };
}
