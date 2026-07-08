import {
  getPrivateEvents,
  getPrivateSources,
} from "./dataService.js";
import { professionalExportMaxEvents } from "./config.js";

const defaultMaxEventsPerExport = Math.min(
  Math.max(professionalExportMaxEvents, 1),
  100
);
const maxSourcesPerExport = 100;

function exportError(code, message) {
  const error = new Error(message || code);

  error.code = code;
  error.statusCode = 400;

  return error;
}

function normalizeText(value) {
  return String(value || "").trim();
}

function slugify(value) {
  return normalizeText(value)
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "") || "arcus-output";
}

function escapeCsv(value) {
  const text = String(value ?? "");

  return /[",\n\r]/.test(text)
    ? `"${text.replaceAll('"', '""')}"`
    : text;
}

function toCsv(rows, columns) {
  return [
    columns.join(","),
    ...rows.map((row) =>
      columns.map((column) => escapeCsv(row[column])).join(",")
    ),
  ].join("\n");
}

function exportMetadata({
  dataRelease,
  eventCount,
  exportId,
  generatedAt,
  maxEvents,
  scopeLabel,
  type,
}) {
  return [
    "ARCUS Professional controlled output",
    `Export id: ${exportId}`,
    `Data release: ${dataRelease?.id || "unknown"}`,
    `Methodology version: ${dataRelease?.methodologyVersion || "unknown"}`,
    `Public boundary: ${dataRelease?.publicRelease || "Data in Brief public release"}`,
    `Output type: ${type}`,
    `Scope: ${scopeLabel}`,
    `Events included: ${eventCount} (maximum ${maxEvents})`,
    `Generated at: ${generatedAt}`,
    "This is a scoped technical output, not a database release or a design-scale assessment.",
  ];
}

function resolveScope(events, scope = {}, maxEvents) {
  const province = normalizeText(scope.province);
  const eventIds = Array.isArray(scope.eventIds)
    ? [...new Set(scope.eventIds.map(normalizeText).filter(Boolean))]
    : [];

  if (!province && !eventIds.length) {
    throw exportError(
      "export_scope_required",
      "A province or a bounded set of event identifiers is required."
    );
  }

  if (eventIds.length > maxEvents) {
    throw exportError(
      "export_scope_too_large",
      `An export can contain at most ${maxEvents} events.`
    );
  }

  const scopedEvents = events
    .filter((event) => {
      if (province) {
        return normalizeText(event.province).toLowerCase() === province.toLowerCase();
      }

      return eventIds.includes(event.event_id);
    })
    .sort((left, right) =>
      String(right.date || "").localeCompare(String(left.date || ""))
    )
    .slice(0, maxEvents);

  if (!scopedEvents.length) {
    throw exportError(
      "export_scope_empty",
      "No ARCUS events match the requested export scope."
    );
  }

  return {
    events: scopedEvents,
    label: province || `${scopedEvents.length} selected events`,
  };
}

function limitedEvent(event, sourceCount) {
  return {
    cause: event.specific_cause || event.cause_category || "",
    date: event.date || "",
    event_id: event.event_id || "",
    municipality: event.municipality || "",
    province: event.province || "",
    region: event.region || "",
    severity: event.collapse_severity || "",
    source_count: sourceCount,
    triggered: Boolean(event.triggered),
    victims: Number(event.victims) || 0,
  };
}

function territoryBrief({
  events,
  dataRelease,
  exportId,
  generatedAt,
  label,
  maxEvents,
  sources,
}) {
  const sourceCounts = new Map();

  sources.forEach((source) => {
    sourceCounts.set(
      source.event_id,
      (sourceCounts.get(source.event_id) || 0) + 1
    );
  });

  const rows = events.map((event) =>
    limitedEvent(event, sourceCounts.get(event.event_id) || 0)
  );
  const header = exportMetadata({
    dataRelease,
    eventCount: rows.length,
    exportId,
    generatedAt,
    maxEvents,
    scopeLabel: label,
    type: "territory-brief",
  }).map((line) => `# ${line}`);
  const content = `${header.join("\n")}\n${toCsv(rows, [
    "event_id",
    "date",
    "municipality",
    "province",
    "region",
    "severity",
    "cause",
    "triggered",
    "victims",
    "source_count",
  ])}\n`;

  return {
    content,
    contentType: "text/csv; charset=utf-8",
    eventCount: rows.length,
    exportId,
    filename: `arcus-territory-brief-${slugify(label)}.csv`,
    scopeLabel: label,
    type: "territory-brief",
  };
}

function evidenceRegister({
  events,
  dataRelease,
  exportId,
  generatedAt,
  label,
  maxEvents,
  sources,
}) {
  const eventIndex = new Map(
    events.map((event) => [event.event_id, event])
  );
  const rows = sources
    .filter((source) => eventIndex.has(source.event_id))
    .slice(0, maxSourcesPerExport)
    .map((source) => ({
      event_id: source.event_id,
      municipality: eventIndex.get(source.event_id)?.municipality || "",
      publication_date: source.publication_date || "",
      source_role: source.source_role || "",
      source_title: source.source_title || "",
      source_type: source.source_type || "",
      source_url: source.source_url || "",
    }));
  const header = exportMetadata({
    dataRelease,
    eventCount: events.length,
    exportId,
    generatedAt,
    maxEvents,
    scopeLabel: label,
    type: "evidence-register",
  })
    .concat(`Sources included: ${rows.length} (maximum ${maxSourcesPerExport})`)
    .map((line) => `# ${line}`);
  const content = `${header.join("\n")}\n${toCsv(rows, [
    "event_id",
    "municipality",
    "source_title",
    "source_type",
    "source_role",
    "publication_date",
    "source_url",
  ])}\n`;

  return {
    content,
    contentType: "text/csv; charset=utf-8",
    eventCount: events.length,
    exportId,
    filename: `arcus-evidence-register-${slugify(label)}.csv`,
    scopeLabel: label,
    sourceCount: rows.length,
    type: "evidence-register",
  };
}

function gisSummary({
  events,
  dataRelease,
  exportId,
  generatedAt,
  label,
  maxEvents,
}) {
  const features = events
    .filter(
      (event) =>
        Number.isFinite(Number(event.latitude)) &&
        Number.isFinite(Number(event.longitude))
    )
    .map((event) => ({
      geometry: {
        coordinates: [Number(event.longitude), Number(event.latitude)],
        type: "Point",
      },
      properties: {
        cause: event.specific_cause || event.cause_category || "",
        date: event.date || "",
        event_id: event.event_id || "",
        municipality: event.municipality || "",
        province: event.province || "",
        severity: event.collapse_severity || "",
        triggered: Boolean(event.triggered),
      },
      type: "Feature",
    }));
  const content = `${JSON.stringify(
    {
      features,
      metadata: {
        data_release_id: dataRelease?.id || "",
        dataset_scope: label,
        event_limit: maxEvents,
        events_included: features.length,
        export_id: exportId,
        generated_at: generatedAt,
        methodology_version: dataRelease?.methodologyVersion || "",
        output_type: "gis-summary",
        public_boundary: dataRelease?.publicRelease || "",
        use: "Bounded territorial screening output; not cadastral or design-scale mapping.",
      },
      type: "FeatureCollection",
    },
    null,
    2
  )}\n`;

  return {
    content,
    contentType: "application/geo+json; charset=utf-8",
    eventCount: features.length,
    exportId,
    filename: `arcus-gis-summary-${slugify(label)}.geojson`,
    scopeLabel: label,
    type: "gis-summary",
  };
}

export async function createProfessionalExport(payload = {}, options = {}) {
  const type = normalizeText(payload.type);
  const dataRelease = options.dataRelease || {};
  const exportId = options.exportId || "exp-untracked";
  const generatedAt = options.generatedAt || new Date().toISOString();
  const maxEvents = Math.min(
    Math.max(Number(options.maxEvents) || defaultMaxEventsPerExport, 1),
    defaultMaxEventsPerExport
  );
  const [events, sources] = await Promise.all([
    getPrivateEvents(),
    getPrivateSources(),
  ]);
  const scope = {
    ...resolveScope(events, payload.scope, maxEvents),
    dataRelease,
    exportId,
    generatedAt,
    maxEvents,
  };

  if (type === "territory-brief") {
    return territoryBrief({ ...scope, sources });
  }

  if (type === "evidence-register") {
    return evidenceRegister({ ...scope, sources });
  }

  if (type === "gis-summary") {
    return gisSummary(scope);
  }

  throw exportError(
    "unsupported_export_type",
    "The requested Professional export is not available."
  );
}
