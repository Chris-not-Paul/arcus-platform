import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

import {
  buildProvinceRegistry,
  deriveProvinceForPoint,
  findProvinceInRegistry,
  normalizeProvinceKey,
  provinceMatchesValue,
} from "../../src/utils/projectLocation.js";
import {
  HYDRAULIC_TAXONOMY_VERSION,
  normalizeHydraulicIntelligence,
} from "../../src/utils/hydraulicIntelligence.js";
import { readXlsxSheet } from "./xlsx-reader.js";

export const OPEN_RELEASE_VERSION = "arcus-open-2026.2";
export const OPEN_SCHEMA_VERSION = "arcus-open-schema-v2";

const OPEN_LICENSE = {
  id: "CC-BY-4.0",
  name: "Creative Commons Attribution 4.0 International",
  scope:
    "ARCUS-authored event metadata and taxonomy definitions. Linked third-party sources remain subject to their original rights and terms.",
  url: "https://creativecommons.org/licenses/by/4.0/",
};

const EVENT_REQUIRED_FIELDS = [
  "event_id",
  "event_slug",
  "date",
  "municipality",
  "province",
  "region",
  "latitude",
  "longitude",
  "collapse_severity",
  "specific_cause",
];

const TAXONOMY_FIELD_ALIASES = {
  component_involved: "hydraulic_component_involved",
  failure_cause_evidence: "hydraulic_evidence_level",
  failure_process: "hydraulic_failure_process",
  failure_trigger: "hydraulic_trigger",
};

function cleanString(value) {
  if (value === undefined || value === null) {
    return null;
  }

  const normalized = String(value).replace(/\s+/g, " ").trim();

  if (!normalized || ["n/a", "na", "null", "unknown", "-"].includes(normalized.toLowerCase())) {
    return null;
  }

  return normalized;
}

function normalizeNumber(value, { integer = false } = {}) {
  const text = cleanString(value);

  if (text === null) {
    return null;
  }

  const number = Number(text.replace(",", "."));

  if (!Number.isFinite(number)) {
    return null;
  }

  return integer ? Math.trunc(number) : number;
}

function normalizeBoolean(value) {
  if (typeof value === "boolean") {
    return value;
  }

  const text = cleanString(value)?.toLowerCase();

  if (["true", "1", "yes", "y", "si", "sì"].includes(text)) {
    return true;
  }

  if (["false", "0", "no", "n"].includes(text)) {
    return false;
  }

  return null;
}

function normalizeDate(value) {
  const text = cleanString(value);

  if (!text) {
    return null;
  }

  const match = text.match(/^(\d{4})-(\d{2})-(\d{2})$/);

  if (!match) {
    return null;
  }

  const date = new Date(`${text}T00:00:00.000Z`);

  return Number.isNaN(date.valueOf()) || date.toISOString().slice(0, 10) !== text
    ? null
    : text;
}

function normalizeLanguage(value) {
  const text = cleanString(value)?.toLowerCase();
  const aliases = {
    en: "EN",
    eng: "EN",
    english: "EN",
    it: "IT",
    ita: "IT",
    italian: "IT",
    italiano: "IT",
  };

  return aliases[text] || (text && /^[a-z]{2}$/.test(text) ? text.toUpperCase() : null);
}

function normalizeUrl(value) {
  const text = cleanString(value);

  if (!text) {
    return { source_reference: null, source_url: null, valid: true };
  }

  try {
    const parsed = new URL(text);

    if (!["http:", "https:"].includes(parsed.protocol)) {
      throw new Error("unsupported_protocol");
    }

    return { source_reference: null, source_url: parsed.href, valid: true };
  } catch {
    return { source_reference: text, source_url: null, valid: false };
  }
}

function arcusEventId(researchEventId) {
  const value = cleanString(researchEventId);

  if (!value || !/^IT\d{2}\.\d{2}\.\d{2}$/i.test(value)) {
    return null;
  }

  return `B${value.slice(2)}`;
}

function canonicalEventId(eventId, researchEventId = null) {
  const value = cleanString(researchEventId) || cleanString(eventId);

  if (/^IT\d{2}\.\d{2}\.\d{2}$/i.test(value || "")) {
    return value.toUpperCase();
  }

  if (/^B\d{2}\.\d{2}\.\d{2}$/i.test(value || "")) {
    return `IT${value.slice(1)}`.toUpperCase();
  }

  return null;
}

function projectCanonicalOpenDataset(normalized) {
  const legacyMappingById = new Map(
    normalized.idMapping.map((item) => [item.event_id, item])
  );
  const events = normalized.events.map((event) => {
    const {
      research_event_id: researchEventId,
      ...publicEvent
    } = event;

    return {
      ...publicEvent,
      event_id: canonicalEventId(event.event_id, researchEventId),
    };
  });
  const sources = normalized.sources.map((source) => {
    const {
      research_event_id: researchEventId,
      ...publicSource
    } = source;

    return {
      ...publicSource,
      event_id: canonicalEventId(source.event_id, researchEventId),
    };
  });
  const sourcesByEvent = sources.reduce((index, source) => {
    index.set(source.event_id, (index.get(source.event_id) || 0) + 1);
    return index;
  }, new Map());
  const idMapping = normalized.events.map((event) => {
    const legacy = legacyMappingById.get(event.event_id);

    return {
      event_id: canonicalEventId(event.event_id, event.research_event_id),
      legacy_event_id: event.event_id,
      event_slug: event.event_slug,
      legacy_compatible: legacy?.legacy_compatible ?? false,
      mapping_rule:
        "legacy B identifier retained for migration only; canonical public identifier uses the IT prefix",
    };
  });
  const warnings = normalized.warnings.map((warning) => {
    const publicWarning = { ...warning };
    delete publicWarning.research_event_id;

    return warning.event_id
      ? {
          ...publicWarning,
          event_id: canonicalEventId(
            warning.event_id,
            warning.research_event_id
          ),
        }
      : publicWarning;
  });

  return {
    events,
    idMapping,
    sources,
    sourcesByEvent,
    warnings,
  };
}

function sha256File(filePath) {
  return crypto.createHash("sha256").update(fs.readFileSync(filePath)).digest("hex");
}

function duplicateValues(rows, field) {
  const counts = rows.reduce((index, row) => {
    const value = row[field];
    index.set(value, (index.get(value) || 0) + 1);
    return index;
  }, new Map());

  return [...counts.entries()].filter(([, count]) => count > 1).map(([value]) => value);
}

function countBy(rows, getter) {
  return Object.fromEntries(
    [...rows.reduce((index, row) => {
      const value = getter(row) ?? "Unspecified";
      index.set(value, (index.get(value) || 0) + 1);
      return index;
    }, new Map()).entries()].sort((left, right) => right[1] - left[1])
  );
}

function csvCell(value) {
  const text = value === null || value === undefined
    ? ""
    : typeof value === "object"
      ? JSON.stringify(value)
      : String(value);

  return `"${text.replaceAll('"', '""')}"`;
}

function toCsv(rows) {
  const headers = [...new Set(rows.flatMap((row) => Object.keys(row)))];

  return [
    headers.map(csvCell).join(","),
    ...rows.map((row) => headers.map((header) => csvCell(row[header])).join(",")),
  ].join("\n");
}

function inferType(values) {
  const value = values.find((item) => item !== null && item !== undefined);

  if (value === undefined) {
    return "null";
  }

  if (Array.isArray(value)) {
    return "array";
  }

  return typeof value;
}

function buildDictionary(datasets) {
  return {
    schema_version: OPEN_SCHEMA_VERSION,
    datasets: Object.entries(datasets).map(([name, rows]) => ({
      name,
      record_count: rows.length,
      fields: [...new Set(rows.flatMap((row) => Object.keys(row)))].sort().map((field) => {
        const values = rows.map((row) => row[field]);
        const populated = values.filter((value) => value !== null && value !== undefined && value !== "").length;

        return {
          field,
          type: inferType(values),
          populated,
          missing: rows.length - populated,
          coverage: Number((populated / Math.max(rows.length, 1)).toFixed(4)),
        };
      }),
    })),
    notes: [
      "hydraulic_intelligence describes observed historical outcomes and is not a prediction.",
      "construction_year preserves the source value; construction_year_numeric is populated only for an exact four-digit year.",
      "source_reference preserves non-URL source descriptions; source_url contains HTTP/HTTPS URLs only.",
    ],
  };
}

function normalizeProvince(row, registry, features, warnings) {
  const provinceRaw = cleanString(row.province);
  const declared = findProvinceInRegistry(registry, provinceRaw);
  const coordinates = {
    latitude: normalizeNumber(row.latitude),
    longitude: normalizeNumber(row.longitude),
  };
  const derived = deriveProvinceForPoint(features, coordinates);
  let status = "unresolved";

  if (declared && derived.validated && provinceMatchesValue(declared, derived.derivedProvince)) {
    status = "validated";
  } else if (declared && !derived.validated) {
    status = "name_valid_coordinates_unresolved";
  } else if (!declared && derived.validated) {
    status = "name_mismatch_coordinates_resolved";
  } else if (declared && derived.validated) {
    status = "coordinate_mismatch";
  }

  if (status !== "validated") {
    warnings.push({
      code: "province_validation_warning",
      event_id: arcusEventId(row.event_id),
      municipality: cleanString(row.municipality),
      province_raw: provinceRaw,
      declared_official: declared?.name || null,
      coordinate_province: derived.validated ? derived.derivedProvince : null,
      coordinate_error: derived.validated ? null : derived.error,
      status,
    });
  }

  const reference = declared || (derived.validated ? {
    code: derived.derivedProvinceCode,
    key: derived.derivedProvinceKey,
    name: derived.derivedProvince,
  } : null);

  return {
    province: declared?.name || provinceRaw,
    province_code: reference?.code || null,
    province_key: reference?.key || normalizeProvinceKey(provinceRaw),
    province_raw: provinceRaw,
    province_validation_status: status,
  };
}

function normalizeEvent(row, context) {
  const warnings = [];
  const province = normalizeProvince(row, context.provinceRegistry, context.provinceFeatures, warnings);
  const constructionYearRaw = cleanString(row.construction_year);
  const hydraulic = normalizeHydraulicIntelligence(row, {
    taxonomyVersion: HYDRAULIC_TAXONOMY_VERSION,
  });
  const date = normalizeDate(row.date);
  const event = {
    event_id: arcusEventId(row.event_id),
    research_event_id: cleanString(row.event_id),
    event_slug: cleanString(row.event_slug),
    date,
    municipality: cleanString(row.municipality),
    ...province,
    region: cleanString(row.region),
    latitude: normalizeNumber(row.latitude),
    longitude: normalizeNumber(row.longitude),
    bridge_crossing_type: cleanString(row.bridge_crossing_type),
    bridge_crossing_name: cleanString(row.bridge_crossing_name),
    destination_use: cleanString(row.destination_use),
    collapse_severity: cleanString(row.collapse_severity),
    victims: normalizeNumber(row.victims, { integer: true }),
    injuries: normalizeNumber(row.injuries, { integer: true }),
    triggered: normalizeBoolean(row.triggered),
    cause_category: cleanString(row.cause_category),
    specific_cause: cleanString(row.specific_cause),
    failure_trigger: cleanString(row.failure_trigger),
    failure_process: cleanString(row.failure_process) === "Unspecified" ? null : cleanString(row.failure_process),
    component_involved: cleanString(row.component_involved) === "Unspecified" ? null : cleanString(row.component_involved),
    failure_cause_evidence: cleanString(row.failure_cause_evidence),
    hydraulic_intelligence: hydraulic.hydraulic_intelligence,
    source_confidence: cleanString(row.source_confidence),
    exact_location: normalizeBoolean(row.exact_location),
    bridge_name: cleanString(row.bridge_name),
    structural_type: cleanString(row.structural_type),
    material_type: cleanString(row.material_type),
    construction_year: constructionYearRaw,
    construction_year_numeric: /^\d{4}$/.test(constructionYearRaw || "")
      ? Number(constructionYearRaw)
      : null,
    construction_year_raw: constructionYearRaw,
    curation_level: cleanString(row.curation_level),
    description: cleanString(row.description),
  };

  if (!date && cleanString(row.date)) {
    warnings.push({ code: "invalid_date", event_id: event.event_id, source_value: row.date });
  }

  if (event.latitude === null || event.longitude === null ||
    event.latitude < -90 || event.latitude > 90 ||
    event.longitude < -180 || event.longitude > 180) {
    warnings.push({ code: "invalid_coordinates", event_id: event.event_id });
  }

  return { event, warnings: [...warnings, ...hydraulic.warnings] };
}

function normalizeSource(row, mapping) {
  const url = normalizeUrl(row.source_url);
  const eventId = mapping.get(cleanString(row.event_id)) || null;
  const source = {
    source_id: cleanString(row.source_id),
    event_id: eventId,
    research_event_id: cleanString(row.event_id),
    source_role: cleanString(row.source_role),
    source_type: cleanString(row.source_type),
    source_title: cleanString(row.source_title),
    source_url: url.source_url,
    source_reference: url.source_reference,
    publication_date: normalizeDate(row.publication_date),
    access_date: normalizeDate(row.access_date),
    language: normalizeLanguage(row.language),
  };

  return {
    source,
    warnings: [
      !url.valid ? {
        code: "invalid_source_url_preserved_as_reference",
        source_id: source.source_id,
        source_reference: source.source_reference,
      } : null,
      cleanString(row.language) && !source.language ? {
        code: "unrecognized_language",
        source_id: source.source_id,
        source_value: row.language,
      } : null,
    ].filter(Boolean),
  };
}

function readPreviousRelease(openRoot, version) {
  if (!fs.existsSync(openRoot)) {
    return null;
  }

  const versions = fs.readdirSync(openRoot, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && entry.name !== version)
    .map((entry) => entry.name)
    .sort()
    .reverse();
  const previousVersion = versions.find((item) =>
    fs.existsSync(path.join(openRoot, item, "events.json"))
  );

  if (!previousVersion) {
    return null;
  }

  const previousDirectory = path.join(openRoot, previousVersion);
  const previousEvents = JSON.parse(
    fs.readFileSync(path.join(previousDirectory, "events.json"), "utf8")
  );
  const previousSourcesPath = path.join(previousDirectory, "sources.json");
  const previousSources = fs.existsSync(previousSourcesPath)
    ? JSON.parse(fs.readFileSync(previousSourcesPath, "utf8"))
    : { sources: [] };

  return {
    events: previousEvents.events || [],
    release: previousEvents.release || previousVersion,
    sources: previousSources.sources || [],
  };
}

function deltaAudit(events, sources, previous) {
  const previousEvents = previous?.events || [];
  const previousEventById = new Map(previousEvents.map((event) => [
    canonicalEventId(event.event_id, event.research_event_id),
    event,
  ]));
  const currentIds = new Set(events.map((event) => event.event_id));
  const previousSourceIds = new Set(previous?.sources?.map((source) => source.source_id) || []);

  return {
    previous_release: previous?.release || null,
    new_events: events.filter((event) => !previousEventById.has(event.event_id)).map((event) => event.event_id),
    updated_events: events.filter((event) => {
      const old = previousEventById.get(event.event_id);
      return old && JSON.stringify(old) !== JSON.stringify(event);
    }).map((event) => event.event_id),
    removed_events: previousEvents
      .filter((event) => !currentIds.has(canonicalEventId(event.event_id, event.research_event_id)))
      .map((event) => canonicalEventId(event.event_id, event.research_event_id)),
    new_sources: sources.filter((source) => !previousSourceIds.has(source.source_id)).map((source) => source.source_id),
    removed_sources: [],
  };
}

export function normalizeResearchDataset({
  masterResearchPath,
  provinceGeoJsonPath,
  legacyEventsPath,
} = {}) {
  const fingerprint = sha256File(masterResearchPath);
  const eventRows = readXlsxSheet(masterResearchPath, "EVENTS");
  const sourceRows = readXlsxSheet(masterResearchPath, "SOURCES");
  const taxonomy = readXlsxSheet(masterResearchPath, "TAXONOMY").map((row) => ({
    field: cleanString(row.field),
    value: cleanString(row.value),
    definition_it: cleanString(row.definition_it),
  }));
  const provinceGeoJson = JSON.parse(fs.readFileSync(provinceGeoJsonPath, "utf8"));
  const provinceFeatures = provinceGeoJson.features || [];
  const provinceRegistry = buildProvinceRegistry(provinceFeatures);
  const mapping = new Map(eventRows.map((row) => [cleanString(row.event_id), arcusEventId(row.event_id)]));
  const normalizedEvents = eventRows.map((row) => normalizeEvent(row, {
    provinceFeatures,
    provinceRegistry,
  }));
  const events = normalizedEvents.map((item) => item.event);
  const normalizedSources = sourceRows.map((row) => normalizeSource(row, mapping));
  const sources = normalizedSources.map((item) => item.source);
  const warnings = [
    ...normalizedEvents.flatMap((item) => item.warnings),
    ...normalizedSources.flatMap((item) => item.warnings),
  ];
  const errors = [];
  const eventIds = new Set(events.map((event) => event.event_id));
  const sourcesByEvent = sources.reduce((index, source) => {
    index.set(source.event_id, (index.get(source.event_id) || 0) + 1);
    return index;
  }, new Map());
  const taxonomyIndex = taxonomy.reduce((index, item) => {
    if (!index.has(item.field)) {
      index.set(item.field, new Set());
    }
    index.get(item.field).add(item.value);
    return index;
  }, new Map());

  duplicateValues(events, "event_id").forEach((value) => errors.push({ code: "duplicate_event_id", value }));
  duplicateValues(events, "event_slug").forEach((value) => errors.push({ code: "duplicate_event_slug", value }));
  duplicateValues(sources, "source_id").forEach((value) => errors.push({ code: "duplicate_source_id", value }));
  events.filter((event) => !sourcesByEvent.has(event.event_id))
    .forEach((event) => errors.push({ code: "event_without_source", event_id: event.event_id }));
  sources.filter((source) => !eventIds.has(source.event_id))
    .forEach((source) => errors.push({ code: "orphan_source", source_id: source.source_id }));
  events.forEach((event) => EVENT_REQUIRED_FIELDS.forEach((field) => {
    if (event[field] === null || event[field] === undefined || event[field] === "") {
      errors.push({ code: "missing_required_field", event_id: event.event_id, field });
    }
  }));

  eventRows.forEach((row) => Object.entries(TAXONOMY_FIELD_ALIASES).forEach(([sourceField, taxonomyField]) => {
    const value = cleanString(row[sourceField]);

    if (value && cleanString(row.specific_cause) === "Hydraulic" && !taxonomyIndex.get(taxonomyField)?.has(value)) {
      errors.push({ code: "invalid_taxonomy_value", event_id: arcusEventId(row.event_id), field: sourceField, value });
    }
  }));

  const legacyEvents = legacyEventsPath && fs.existsSync(legacyEventsPath)
    ? JSON.parse(fs.readFileSync(legacyEventsPath, "utf8"))
    : [];
  const legacyBySlug = new Map(legacyEvents.map((event) => [event.event_slug, event.event_id]));
  const legacyById = new Map(legacyEvents.map((event) => [event.event_id, event.event_slug]));
  const idMapping = events.map((event) => {
    const expectedBySlug = legacyBySlug.get(event.event_slug) || null;
    const expectedSlug = legacyById.get(event.event_id) || null;
    const compatible = (!expectedBySlug || expectedBySlug === event.event_id) &&
      (!expectedSlug || expectedSlug === event.event_slug);

    if (!compatible) {
      errors.push({
        code: "legacy_id_mapping_conflict",
        event_id: event.event_id,
        event_slug: event.event_slug,
        expected_by_slug: expectedBySlug,
        expected_slug: expectedSlug,
      });
    }

    return {
      research_event_id: event.research_event_id,
      event_id: event.event_id,
      event_slug: event.event_slug,
      legacy_compatible: compatible,
      mapping_rule: "replace leading IT with B; validate event_slug against existing ARCUS identifiers",
    };
  });

  if (errors.length) {
    const error = new Error(`ARCUS normalized research dataset blocked by ${errors.length} structural quality error(s).`);
    error.errors = errors;
    throw error;
  }

  return {
    eventRows,
    events,
    fingerprint,
    idMapping,
    sourceRows,
    sources,
    sourcesByEvent,
    taxonomy,
    warnings,
  };
}

function readExistingOpenRelease(outputRoot, version) {
  const releaseDirectory = path.join(outputRoot, version);
  const read = (name) => JSON.parse(fs.readFileSync(path.join(releaseDirectory, name), "utf8"));

  return {
    audit: read("quality-audit.json"),
    events: read("events.json").events,
    manifest: read("manifest.json"),
    releaseDirectory,
    sources: read("sources.json").sources,
    statistics: read("statistics.json"),
    taxonomy: read("taxonomy.json").taxonomy,
  };
}

export function buildOpenResearchRelease({
  masterResearchPath,
  outputRoot,
  provinceGeoJsonPath,
  legacyEventsPath,
  normalizedData = null,
  generatedAt = new Date().toISOString(),
  version = OPEN_RELEASE_VERSION,
} = {}) {
  const normalized = normalizedData || normalizeResearchDataset({
    legacyEventsPath,
    masterResearchPath,
    provinceGeoJsonPath,
  });
  const releaseProjection = version === "arcus-open-2026.1"
    ? normalized
    : projectCanonicalOpenDataset(normalized);
  const {
    events,
    idMapping,
    sources,
    sourcesByEvent,
    warnings,
  } = releaseProjection;
  const {
    fingerprint,
    taxonomy,
  } = normalized;
  const existingManifestPath = path.join(outputRoot, version, "manifest.json");

  if (fs.existsSync(existingManifestPath)) {
    const existing = readExistingOpenRelease(outputRoot, version);

    if (
      JSON.stringify(existing.events) !== JSON.stringify(events) ||
      JSON.stringify(existing.sources) !== JSON.stringify(sources) ||
      JSON.stringify(existing.taxonomy) !== JSON.stringify(taxonomy)
    ) {
      throw new Error(
        `Open release ${version} content differs from the normalized workbook; create a new release version.`
      );
    }

    // Professional-only workbook columns and formatting may evolve without
    // changing the immutable Open projection. Content equality is therefore
    // authoritative; the original release fingerprint remains preserved.

    return existing;
  }
  const errors = [];

  const dataCutoff = events.map((event) => event.date).filter(Boolean).sort().at(-1) || null;
  const previous = readPreviousRelease(outputRoot, version);
  const delta = deltaAudit(events, sources, previous);
  const statistics = {
    release: version,
    sample_size: events.length,
    source_count: sources.length,
    interpretation:
      "Counts and percentages are observed frequencies in the ARCUS Open Research database, not collapse probabilities or causal estimates.",
    missing: Object.fromEntries([
      "failure_process",
      "component_involved",
      "failure_cause_evidence",
      "construction_year_numeric",
    ].map((field) => [field, events.filter((event) => event[field] === null).length])),
    temporal: countBy(events, (event) => event.date?.slice(0, 4)),
    territorial: {
      regions: countBy(events, (event) => event.region),
      provinces: countBy(events, (event) => event.province),
    },
    causes: countBy(events, (event) => event.specific_cause),
    processes: countBy(events, (event) => event.failure_process),
    components: countBy(events, (event) => event.component_involved),
    severity: countBy(events, (event) => event.collapse_severity),
    structures: countBy(events, (event) => event.structural_type),
    materials: countBy(events, (event) => event.material_type),
    evidence_level: countBy(
      events.filter((event) => event.specific_cause === "Hydraulic"),
      (event) => event.failure_cause_evidence
    ),
    source_coverage: countBy(events, (event) => sourcesByEvent.get(event.event_id) || 0),
  };
  const audit = {
    release: version,
    generated_at: generatedAt,
    status: errors.length ? "blocked" : "passed",
    counts: {
      events: events.length,
      sources: sources.length,
      taxonomy_entries: taxonomy.length,
      warnings: warnings.length,
      errors: errors.length,
      needs_review: events.filter((event) => event.failure_cause_evidence === "Needs review").length,
      process_available: events.filter((event) => event.failure_process).length,
      component_available: events.filter((event) => event.component_involved).length,
      evidence_available: events.filter((event) => event.failure_cause_evidence && event.failure_cause_evidence !== "Unspecified").length,
    },
    errors,
    warnings,
    delta,
    id_mapping: idMapping,
    invalid_urls: warnings.filter((warning) => warning.code === "invalid_source_url_preserved_as_reference"),
    territorial_warnings: warnings.filter((warning) => warning.code === "province_validation_warning"),
    needs_review_records: events.filter((event) => event.failure_cause_evidence === "Needs review").map((event) => event.event_id),
  };

  if (errors.length) {
    const error = new Error(`ARCUS Open release blocked by ${errors.length} structural quality error(s).`);
    error.audit = audit;
    throw error;
  }

  const citation = `ARCUS Open Research (${version}). Bridge collapse events in Italy, ${events[0]?.date?.slice(0, 4) || "2000"}-${dataCutoff?.slice(0, 4) || "2026"}. Version ${version}.`;
  const manifest = {
    version,
    generated_at: generatedAt,
    data_cutoff: dataCutoff,
    event_count: events.length,
    source_count: sources.length,
    taxonomy_version: HYDRAULIC_TAXONOMY_VERSION,
    schema_version: OPEN_SCHEMA_VERSION,
    license: OPEN_LICENSE,
    citation,
    changelog: "changelog.json",
    known_limitations: [
      "The database describes documented historical events and cannot estimate the probability of future collapse.",
      "Source coverage and location precision vary across records.",
      "Needs review is retained as a distinct editorial evidence class.",
      "Third-party source content is not redistributed; links and bibliographic metadata remain subject to provider terms.",
      "Province mismatches are flagged and never silently corrected.",
    ],
    source_workbook_fingerprint: `sha256:${fingerprint}`,
    access: "public_read_only_no_account_required",
    resources: {
      events: "events.json",
      sources: "sources.json",
      taxonomy: "taxonomy.json",
      data_dictionary: "data-dictionary.json",
      changelog: "changelog.json",
      statistics: "statistics.json",
      quality_audit: "quality-audit.json",
      id_mapping: "id-mapping.json",
      csv: "events.csv",
      geojson: "events.geojson",
    },
  };
  const releaseDirectory = path.join(outputRoot, version);
  const geojson = {
    type: "FeatureCollection",
    name: version,
    metadata: {
      version,
      generated_at: generatedAt,
      data_cutoff: dataCutoff,
      event_count: events.length,
    },
    features: events.map((event) => ({
      type: "Feature",
      id: event.event_id,
      geometry: {
        type: "Point",
        coordinates: [event.longitude, event.latitude],
      },
      properties: Object.fromEntries(
        Object.entries(event).filter(([field]) => !["latitude", "longitude"].includes(field))
      ),
    })),
  };
  const dictionary = buildDictionary({ events, sources, taxonomy });
  const changelog = {
    version,
    generated_at: generatedAt,
    changes: [
      "Promoted ITxx.xx.xx to the single canonical event_id across events, sources, CSV, GeoJSON and JSON.",
      "Moved the former Bxx.xx.xx identifier to the migration-only id-mapping resource.",
      "Removed the redundant research_event_id field from public event and source records.",
      "Preserved the complete 263-event and 712-source scientific release scope.",
    ],
    delta,
  };

  fs.mkdirSync(releaseDirectory, { recursive: true });
  const writeJson = (name, value) => fs.writeFileSync(
    path.join(releaseDirectory, name),
    `${JSON.stringify(value, null, 2)}\n`
  );

  writeJson("manifest.json", manifest);
  writeJson("events.json", { release: version, events });
  writeJson("sources.json", { release: version, sources });
  writeJson("taxonomy.json", { release: version, taxonomy });
  writeJson("data-dictionary.json", dictionary);
  writeJson("changelog.json", changelog);
  writeJson("statistics.json", statistics);
  writeJson("quality-audit.json", audit);
  writeJson("id-mapping.json", { release: version, mappings: idMapping });
  writeJson("events.geojson", geojson);
  fs.writeFileSync(path.join(releaseDirectory, "events.csv"), `${toCsv(events)}\n`);
  fs.writeFileSync(
    path.join(outputRoot, "current.json"),
    `${JSON.stringify({ version, manifest: `${version}/manifest.json` }, null, 2)}\n`
  );

  return { audit, events, manifest, releaseDirectory, sources, statistics, taxonomy };
}
