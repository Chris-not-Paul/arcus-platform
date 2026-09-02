import fs from "fs";
import path from "path";
import csv from "csv-parser";
import { readXlsxSheet } from "./lib/xlsx-reader.js";
import {
  buildOpenResearchRelease,
  normalizeResearchDataset,
} from "./lib/open-research-release.js";
import {
  buildSourceReliabilityByEvent,
  buildTerritoryProfiles,
  buildVulnerabilityByEvent,
} from "../src/utils/analytics.js";
import {
  applyHydraulicOutcomeOverrides,
  HYDRAULIC_INTELLIGENCE_FIELDS,
  HYDRAULIC_TAXONOMY_VERSION,
  normalizeHydraulicIntelligence,
  stripHydraulicSourceFields,
} from "../src/utils/hydraulicIntelligence.js";
import {
  enrichEventsWithHydraulicGeometry,
  HYDRAULIC_GEOMETRY_DATASET_ID,
  HYDRAULIC_GEOMETRY_SOURCE_URL,
} from "../src/utils/hydraulicGeometry.js";
import {
  enrichEventsWithLandslideIntelligence,
  summarizeLandslideRegistry,
} from "../src/utils/landslideIntelligence.js";
import {
  enrichEventsWithSeismicIntelligence,
  summarizeSeismicRegistry,
} from "../src/utils/seismicIntelligence.js";

/* ================================= */
/* DATA CONTAINERS */
/* ================================= */

const events = [];

const sources = [];

/* ================================= */
/* PATHS */
/* ================================= */

const eventsCsvPath = path.resolve(
  "private-data/raw/EVENTS.csv"
);

const sourcesCsvPath = path.resolve(
  "private-data/raw/SOURCES.csv"
);

const masterResearchPath = path.resolve(
  "private-data/raw/MASTER_RESEARCH.xlsx"
);

const outputEventsPath = path.resolve(
  "private-data/processed/events.json"
);

const outputSourcesPath = path.resolve(
  "private-data/processed/sources.json"
);

const professionalDataDir = path.resolve(
  "private-data/professional"
);

const professionalManifestPath = path.resolve(
  professionalDataDir,
  "api-manifest.json"
);

const professionalTerritoriesPath = path.resolve(
  professionalDataDir,
  "territory-profiles.json"
);

const professionalReliabilityPath = path.resolve(
  professionalDataDir,
  "event-reliability.json"
);

const professionalVulnerabilityPath = path.resolve(
  professionalDataDir,
  "event-vulnerability.json"
);

const professionalEventsPath = path.resolve(
  professionalDataDir,
  "professional-events.json"
);

const professionalSourcesPath = path.resolve(
  professionalDataDir,
  "professional-sources.json"
);

const professionalModelCardsPath = path.resolve(
  professionalDataDir,
  "model-cards.json"
);

const professionalDataQualityPath = path.resolve(
  professionalDataDir,
  "data-quality.json"
);

const professionalDataDictionaryPath = path.resolve(
  professionalDataDir,
  "data-dictionary.json"
);

const professionalReleasePath = path.resolve(
  professionalDataDir,
  "data-release.json"
);

const professionalExternalLayersPath = path.resolve(
  professionalDataDir,
  "external-hazard-layers.json"
);

const professionalHazardExposurePath = path.resolve(
  professionalDataDir,
  "hazard-exposure-preview.json"
);

const professionalAinopBridgeIndexPath = path.resolve(
  professionalDataDir,
  "ainop-bridge-index.json"
);

const professionalHydraulicIntelligenceAuditPath = path.resolve(
  professionalDataDir,
  "hydraulic-intelligence-audit.json"
);

const professionalLandslideIntelligenceAuditPath = path.resolve(
  professionalDataDir,
  "landslide-intelligence-audit.json"
);

const professionalSeismicIntelligenceAuditPath = path.resolve(
  professionalDataDir,
  "seismic-intelligence-audit.json"
);

const landslideOutcomeRegistryPath = path.resolve(
  "config/collapse-intelligence/landslide-outcome-registry.json"
);

const seismicOutcomeRegistryPath = path.resolve(
  "config/collapse-intelligence/seismic-outcome-registry.json"
);

const hydraulicOutcomeOverridesPath = path.resolve(
  "config/collapse-intelligence/hydraulic-outcome-overrides.json"
);

const openReleaseRoot = path.resolve(
  "private-data/open/releases"
);

const provinceGeoJsonPath = path.resolve(
  "public/data/geo/italy-provinces.geojson"
);

/* ================================= */
/* VALUE PARSER */
/* ================================= */

function parseValue(value) {

  if (
    value === undefined ||
    value === null
  ) {
    return null;
  }

  const trimmed =
    String(value).trim();

  if (trimmed === "") {
    return null;
  }

  if (trimmed === "TRUE") {
    return true;
  }

  if (trimmed === "FALSE") {
    return false;
  }

  const normalized =
    trimmed.replace(",", ".");

  const numeric =
    Number(normalized);

  if (
    !isNaN(numeric) &&
    trimmed !== ""
  ) {
    return numeric;
  }

  return normalized.trim();
}

function cleanKey(key) {

  return String(key)
    .replace(/^\uFEFF/, "")
    .replace(/^ï»¿/, "")
    .trim();
}

function yearFromDate(value) {
  const match = String(value || "").match(/\d{4}/);

  return match ? Number(match[0]) : null;
}

function latestDateFor(rows) {
  return rows
    .map((row) => String(row.date || ""))
    .filter(Boolean)
    .sort()
    .at(-1) || null;
}

function yearRangeFor(rows) {
  const years = rows.map((row) => yearFromDate(row.date)).filter(Boolean);

  return {
    includedYearMax: years.length ? Math.max(...years) : null,
    includedYearMin: years.length ? Math.min(...years) : null,
  };
}

/* ================================= */
/* ROW PROCESSING */
/* ================================= */

function processRow(row) {

  const processed = {};

  Object.keys(row).forEach(
    (key) => {

      const cleanKeyValue =
        cleanKey(key);

      if (!cleanKeyValue) {
        return;
      }

      processed[cleanKeyValue] =
        parseValue(row[key]);
    }
  );

  const hasValues =
    Object.values(processed).some(
      (value) => value !== null
    );

  if (!hasValues) {
    return null;
  }

  return processed;
}

function loadCsvRows(filePath) {
  return new Promise(
    (resolve, reject) => {
      const rows = [];

      fs.createReadStream(filePath)
        .pipe(
          csv({
            separator: ";",
          })
        )
        .on("data", (row) => {
          rows.push(row);
        })
        .on("end", () => resolve(rows))
        .on("error", reject);
    }
  );
}

function requireHeaders(rows, required, label) {
  const headers = new Set(
    rows.flatMap((row) => Object.keys(row))
  );
  const missing = required.filter((field) => !headers.has(field));

  if (missing.length) {
    throw new Error(
      `${label} is missing required header(s): ${missing.join(", ")}`
    );
  }
}

function sourceRowsToProcessed(rows) {
  return rows
    .map(processRow)
    .filter(Boolean);
}

function eventRowsToProcessed(rows) {
  requireHeaders(
    rows,
    [
      "event_id",
      "specific_cause",
    ],
    "EVENTS"
  );

  return rows
    .map(processRow)
    .filter(Boolean)
    .map((event) => {
      const {
        hydraulic_intelligence,
        warnings,
      } = normalizeHydraulicIntelligence(event);
      const next = stripHydraulicSourceFields(event);

      next.hydraulic_intelligence = hydraulic_intelligence;

      if (warnings.length) {
        next.hydraulic_intelligence_warnings = warnings;
      }

      return next;
    });
}

function mergeHydraulicExcelFields(baseRows, excelRows) {
  const excelById = new Map(
    excelRows.flatMap((row) => {
      const researchId = String(row.event_id || "").trim();
      const arcusId = researchId.replace(/^IT/, "B");

      return [[researchId, row], [arcusId, row]];
    })
  );

  return baseRows.map((row) => {
    const excelRow = excelById.get(String(row.event_id || "").trim());

    if (!excelRow) {
      return row;
    }

    return {
      ...row,
      failure_trigger: excelRow.failure_trigger,
      failure_process: excelRow.failure_process,
      component_involved: excelRow.component_involved,
      failure_cause_evidence: excelRow.failure_cause_evidence,
      hydraulic_trigger: excelRow.failure_trigger,
      hydraulic_failure_process: excelRow.failure_process,
      hydraulic_component_involved: excelRow.component_involved,
      hydraulic_evidence_level: excelRow.failure_cause_evidence,
    };
  });
}

function uniqueSorted(values) {
  return [...new Set(values)]
    .filter(
      (value) =>
        value !== null &&
        value !== undefined &&
        String(value).trim() !== ""
    )
    .sort((left, right) =>
      String(left).localeCompare(String(right))
    );
}

function buildHydraulicIntelligenceAudit(rawRows, processedRows, normalizationWarnings = []) {
  const processedById = new Map(
    processedRows.map((event) => [event.event_id, event])
  );
  const hydraulicRows = rawRows.filter(
    (row) => String(row.specific_cause || "").trim() === "Hydraulic"
  );
  const nonHydraulicRows = rawRows.filter(
    (row) => String(row.specific_cause || "").trim() !== "Hydraulic"
  );
  const warnings = normalizationWarnings.filter(
    (warning) => ![
      "invalid_source_url_preserved_as_reference",
      "province_validation_warning",
    ].includes(warning.code)
  );
  const canonicalFields = HYDRAULIC_INTELLIGENCE_FIELDS.slice(0, 4);
  const fieldStats = Object.fromEntries(
    canonicalFields.map((field) => {
      const values = rawRows.map((row) =>
        row[field] === undefined || row[field] === null
          ? null
          : String(row[field])
      );
      const nonNull = values.filter(
        (value) =>
          value !== null &&
          value.trim() !== ""
      );
      const trimmedDiffs = values
        .filter(
          (value) =>
            value !== null &&
            value !== value.trim()
        )
        .map((value) => value);
      const caseVariants = Object.entries(
        nonNull.reduce((accumulator, value) => {
          const key = value.trim().toLowerCase();
          accumulator[key] = accumulator[key] || new Set();
          accumulator[key].add(value.trim());
          return accumulator;
        }, {})
      )
        .filter(([, set]) => set.size > 1)
        .map(([key, set]) => ({
          normalized: key,
          variants: [...set].sort(),
        }));

      return [
        field,
        {
          non_null: nonNull.length,
          unique_values: uniqueSorted(nonNull.map((value) => value.trim())),
          case_variants: caseVariants,
          leading_or_trailing_space_values: uniqueSorted(trimmedDiffs),
        },
      ];
    })
  );
  const nonHydraulicWithValues = nonHydraulicRows
    .filter((row) =>
      canonicalFields.some(
        (field) =>
          row[field] !== undefined &&
          row[field] !== null &&
          String(row[field]).trim() !== ""
      )
    )
    .map((row) => row.event_id);
  const hydraulicWithoutTrigger = hydraulicRows
    .filter(
      (row) =>
        !row.failure_trigger ||
        String(row.failure_trigger).trim() === ""
    )
    .map((row) => row.event_id);
  const processSpecificMissingEvidence = hydraulicRows
    .filter((row) => {
      const process = String(row.failure_process || "").trim();
      const evidence = String(row.failure_cause_evidence || "").trim();

      return process && process !== "Unspecified" && !evidence;
    })
    .map((row) => row.event_id);
  const componentSpecificProcessUnspecified = hydraulicRows
    .filter((row) => {
      const process = String(row.failure_process || "").trim();
      const component = String(row.component_involved || "").trim();

      return component &&
        component !== "Unspecified" &&
        (!process || process === "Unspecified");
    })
    .map((row) => row.event_id);
  const evidenceCounts = processedRows.reduce(
    (accumulator, event) => {
      const level = event.hydraulic_intelligence?.evidence_level;

      if (level) {
        accumulator[level] = (accumulator[level] || 0) + 1;
      }

      return accumulator;
    },
    {}
  );
  const geometryEvents = processedRows.filter(
    (event) => event.hydraulic_geometry
  );
  const geometrySourceCounts = geometryEvents.reduce((counts, event) => {
    const sourceRecordId =
      event.hydraulic_geometry?.provenance?.source_record_id;

    if (sourceRecordId) {
      counts[sourceRecordId] = (counts[sourceRecordId] || 0) + 1;
    }

    return counts;
  }, {});
  const duplicateGeometrySourceRecords = Object.entries(geometrySourceCounts)
    .filter(([, count]) => count > 1)
    .map(([sourceRecordId]) => sourceRecordId);

  return {
    generated_at: new Date().toISOString(),
    source_file: "private-data/raw/MASTER_RESEARCH.xlsx",
    source_sheet: "EVENTS",
    taxonomy_version: HYDRAULIC_TAXONOMY_VERSION,
    total_events: rawRows.length,
    hydraulic_events: hydraulicRows.length,
    field_stats: fieldStats,
    semantic_checks: {
      component_specific_process_unspecified:
        componentSpecificProcessUnspecified,
      hydraulic_without_trigger: hydraulicWithoutTrigger,
      non_hydraulic_with_values: nonHydraulicWithValues,
      process_specific_missing_evidence:
        processSpecificMissingEvidence,
      warnings,
    },
    summary: {
      documented: evidenceCounts.documented || 0,
      needs_review: evidenceCounts.needs_review || 0,
      probable: evidenceCounts.probable || 0,
      specific_component_available: processedRows.filter(
        (event) => event.hydraulic_intelligence?.component_involved
      ).length,
      specific_process_available: processedRows.filter(
        (event) => event.hydraulic_intelligence?.failure_process
      ).length,
      trigger_available: processedRows.filter(
        (event) => event.hydraulic_intelligence?.trigger
      ).length,
      unspecified: evidenceCounts.unspecified || 0,
      validation_warnings: warnings.length,
    },
    hydraulic_geometry: {
      bridge_length_available: geometryEvents.filter(
        (event) => event.hydraulic_geometry.bridge_length_m !== null
      ).length,
      dataset_id: HYDRAULIC_GEOMETRY_DATASET_ID,
      dataset_sheet: "DATASETS",
      duplicate_source_record_ids: duplicateGeometrySourceRecords,
      link_sheet: "HYDRAULIC_GEOMETRY_LINKS",
      matched_events: geometryEvents.length,
      piers_in_active_riverbed_available: geometryEvents.filter(
        (event) => event.hydraulic_geometry.piers_in_active_riverbed !== null
      ).length,
      source_record_ids_unique:
        duplicateGeometrySourceRecords.length === 0,
      source_url: HYDRAULIC_GEOMETRY_SOURCE_URL,
      role:
        "Professional evidence context only; excluded from scoring and analogue retrieval pending validation.",
    },
    sample_processed_hydraulic_events: hydraulicRows.slice(0, 5).map((row) => {
      const eventId = String(row.event_id || "").replace(/^IT/, "B");

      return {
        event_id: eventId,
        hydraulic_intelligence:
          processedById.get(eventId)?.hydraulic_intelligence || null,
      };
    }),
  };
}

/* ================================= */
/* LOAD EVENTS */
/* ================================= */

export function loadEvents() {
  if (fs.existsSync(masterResearchPath)) {
    const excelRows = readXlsxSheet(masterResearchPath, "EVENTS");

    return loadCsvRows(eventsCsvPath).then((csvRows) => {
      const rows = mergeHydraulicExcelFields(
        csvRows,
        excelRows
      );

      events.push(
        ...eventRowsToProcessed(rows)
      );

      console.log(
        `Loaded ${events.length} events from EVENTS.csv with Hydraulic Intelligence from MASTER_RESEARCH.xlsx`
      );

      return rows;
    });
  }

  return loadCsvRows(eventsCsvPath).then((rows) => {
    events.push(
      ...sourceRowsToProcessed(rows)
    );

    console.log(
      `Loaded ${events.length} events from EVENTS.csv`
    );

    return null;
  });
}

/* ================================= */
/* LOAD SOURCES */
/* ================================= */

export function loadSources() {
  if (fs.existsSync(masterResearchPath)) {
    readXlsxSheet(masterResearchPath, "SOURCES");
  }

  return loadCsvRows(sourcesCsvPath).then((rows) => {
    sources.push(
      ...sourceRowsToProcessed(rows)
    );

    console.log(
      `Loaded ${sources.length} sources from SOURCES.csv`
    );
  });
}

/* ================================= */
/* SAVE JSON */
/* ================================= */

function saveJson() {

  fs.writeFileSync(
    outputEventsPath,
    JSON.stringify(
      events,
      null,
      2
    )
  );

  fs.writeFileSync(
    outputSourcesPath,
    JSON.stringify(
      sources,
      null,
      2
    )
  );

  console.log(
    "JSON files generated"
  );
}

/* ================================= */
/* PROFESSIONAL API DATA */
/* ================================= */

function writeJson(filePath, data) {

  fs.writeFileSync(
    filePath,
    JSON.stringify(
      data,
      null,
      2
    )
  );
}

function readJsonIfExists(filePath) {
  if (!fs.existsSync(filePath)) {
    return null;
  }

  return JSON.parse(
    fs.readFileSync(filePath, "utf8").replace(/^\uFEFF/, "")
  );
}

function saveProfessionalApiData() {

  if (!fs.existsSync(professionalDataDir)) {
    fs.mkdirSync(
      professionalDataDir,
      { recursive: true }
    );
  }

  const generatedAt =
    new Date().toISOString();
  const hydraulicOutcomeOverrides = readJsonIfExists(hydraulicOutcomeOverridesPath);

  if (!hydraulicOutcomeOverrides) {
    throw new Error(`Missing Hydraulic outcome overrides: ${hydraulicOutcomeOverridesPath}`);
  }
  const professionalGeometryEvents = enrichEventsWithHydraulicGeometry(
    events,
    saveProfessionalApiData.rawEventRows || [],
    saveProfessionalApiData.hydraulicGeometryLinkRows || [],
    saveProfessionalApiData.datasetRows || []
  );
  const professionalHydraulicEvents = applyHydraulicOutcomeOverrides(
    professionalGeometryEvents,
    hydraulicOutcomeOverrides
  );
  const hydraulicIntelligenceAudit = buildHydraulicIntelligenceAudit(
    saveProfessionalApiData.rawEventRows || [],
    professionalHydraulicEvents,
    saveProfessionalApiData.normalizationWarnings || []
  );
  const landslideRegistry = readJsonIfExists(landslideOutcomeRegistryPath);

  if (!landslideRegistry) {
    throw new Error(`Missing Landslide outcome registry: ${landslideOutcomeRegistryPath}`);
  }
  const landslideIntelligenceAudit = summarizeLandslideRegistry(landslideRegistry);
  const landslideEnrichedEvents = enrichEventsWithLandslideIntelligence(
    professionalHydraulicEvents,
    landslideRegistry
  );
  const seismicRegistry = readJsonIfExists(seismicOutcomeRegistryPath);

  if (!seismicRegistry) {
    throw new Error(`Missing Seismic outcome registry: ${seismicOutcomeRegistryPath}`);
  }
  const seismicIntelligenceAudit = summarizeSeismicRegistry(seismicRegistry);
  const seismicEnrichedEvents = enrichEventsWithSeismicIntelligence(
    landslideEnrichedEvents,
    seismicRegistry
  );
  const reliabilityByEvent =
    buildSourceReliabilityByEvent(
      events,
      sources
    );
  const vulnerabilityByEvent =
    buildVulnerabilityByEvent(
      events,
      reliabilityByEvent
    );
  const regionProfiles =
    buildTerritoryProfiles(
      events,
      sources,
      "region"
    );
  const provinceProfiles =
    buildTerritoryProfiles(
      events,
      sources,
      "province"
    );
  const reliability = Object.entries(
    reliabilityByEvent
  ).map(([eventId, profile]) => ({
    event_id: eventId,
    grade: profile.grade,
    label: profile.label,
    score: profile.score,
    source_count: profile.sourceCount,
    source_roles: profile.sourceRoles,
  }));
  const vulnerability = Object.entries(
    vulnerabilityByEvent
  ).map(([eventId, profile]) => ({
    event_id: eventId,
    class: profile.className,
    score: profile.score,
    breakdown: profile.breakdown,
  }));
  const warningsByEvent = (saveProfessionalApiData.normalizationWarnings || [])
    .filter((warning) => warning.event_id)
    .reduce((index, warning) => {
      const eventId = String(warning.event_id).replace(/^IT/, "B");

      index[eventId] = index[eventId] || [];
      index[eventId].push({
        ...warning,
        event_id: eventId,
        research_event_id: String(warning.event_id).startsWith("IT")
          ? warning.event_id
          : null,
      });
      return index;
    }, {});
  const professionalEvents = seismicEnrichedEvents.map(
    (event) => ({
      ...event,
      professional_warnings:
        warningsByEvent[event.event_id] || [],
      reliability:
        reliabilityByEvent[event.event_id],
      vulnerability:
        vulnerabilityByEvent[event.event_id],
    })
  );
  const manifest = {
    generated_at: generatedAt,
    name: "ARCUS Professional Data Layer Registry",
    version: "0.1.0",
    endpoints: [
      {
        description:
          "Curated bridge-collapse events enriched with reliability and vulnerability models.",
        access: "controlled_professional_workflow",
        resource: "professional_events",
      },
      {
        description:
          "Normalized Professional live source registry with lossless URL/reference handling.",
        access: "controlled_professional_workflow",
        resource: "professional_sources",
      },
      {
        description:
          "Regional and provincial risk profiles generated from ARCUS event and source data.",
        access: "controlled_professional_workflow",
        resource: "territory_profiles",
      },
      {
        description:
          "Event-level evidence reliability scores and classes.",
        access: "controlled_professional_workflow",
        resource: "event_reliability",
      },
      {
        description:
          "Event-level vulnerability scores and classes.",
        access: "controlled_professional_workflow",
        resource: "event_vulnerability",
      },
      {
        description:
          "Versioned model cards describing ARCUS Professional scoring logic, inputs and limitations.",
        access: "controlled_professional_workflow",
        resource: "model_cards",
      },
      {
        description:
          "Dataset completeness, coverage and professional-readiness audit.",
        access: "controlled_professional_workflow",
        resource: "data_quality",
      },
      {
        description:
          "Machine-readable data dictionary describing fields, types and coverage for ARCUS datasets.",
        access: "controlled_professional_workflow",
        resource: "data_dictionary",
      },
      {
        description:
          "Versioned data release metadata, counts and quality checks.",
        access: "controlled_professional_workflow",
        resource: "data_release",
      },
      {
        description:
          "Registry of external hazard layers planned for ARCUS Professional enrichment.",
        access: "controlled_professional_workflow",
        resource: "external_hazard_layers",
      },
      {
        description:
          "Province-level hazard exposure preview prepared for future external layer joins.",
        access: "controlled_professional_workflow",
        resource: "hazard_exposure_preview",
      },
      {
        description:
          "Audit and taxonomy coverage for curated Hydraulic Intelligence outcome features.",
        access: "controlled_professional_workflow",
        resource: "hydraulic_intelligence_audit",
      },
      {
        description:
          "Source-backed Landslide Intelligence registry coverage, eligibility and dispute audit.",
        access: "controlled_professional_workflow",
        resource: "landslide_intelligence_audit",
      },
      {
        description:
          "Source-backed Seismic Intelligence registry coverage, episode independence and abstention audit.",
        access: "controlled_professional_workflow",
        resource: "seismic_intelligence_audit",
      },
      {
        description:
          "Professional analogue retrieval, historical outcome summaries and mitigation evidence workbench.",
        access: "controlled_professional_workflow",
        resource: "collapse_intelligence",
      },
    ],
  };
  const modelCards = {
    generated_at: generatedAt,
    models: [
      {
        id: "territorial-risk-score",
        name: "Territorial Risk Score",
        status: "production-preview",
        version: "0.1.0",
        inputs: [
          "event recurrence",
          "total-collapse share",
          "triggered-event share",
          "human impact",
          "evidence strength",
        ],
        output:
          "0-100 territorial operational risk score",
        limitations: [
          "Computed from historical ARCUS data only.",
          "External hazard layers are not yet included.",
          "Sparse territories may be sensitive to individual events.",
        ],
      },
      {
        id: "source-reliability-score",
        name: "Source Reliability Score",
        status: "production-preview",
        version: "0.1.0",
        inputs: [
          "source volume",
          "source authority",
          "source type",
          "ARCUS confidence",
          "spatial precision",
          "curation level",
          "temporal traceability",
        ],
        output:
          "0-100 evidence score and A/B/C/D grade",
        limitations: [
          "Does not automatically verify source content.",
          "Source role classification depends on curated metadata.",
        ],
      },
      {
        id: "event-vulnerability-model",
        name: "Event Vulnerability Model",
        status: "production-preview",
        version: "0.1.0",
        inputs: [
          "collapse severity",
          "trigger condition",
          "failure mechanism",
          "structural typology",
          "material",
          "construction year",
          "human impact",
          "evidence penalty",
        ],
        output:
          "0-100 vulnerability score and Low/Medium/High/Critical class",
        limitations: [
          "Not a predictive structural safety model.",
          "Infrastructure condition and inspection data are not yet included.",
        ],
      },
      {
        id: "asset-screening-score",
        name: "Asset Screening Score",
        status: "prototype",
        version: "0.1.0",
        inputs: [
          "asset location",
          "province or region",
          "nearby ARCUS events",
          "local vulnerability matches",
          "asset typology",
          "material",
          "construction year",
        ],
        output:
          "0-100 screening priority and Priority 1/2/3/Baseline class",
        limitations: [
          "Asset inventory quality strongly affects results.",
          "External hazard exposure will be added in a later version.",
        ],
      },
      {
        id: "event-similarity-engine",
        name: "Event Similarity Engine",
        status: "prototype",
        version: "0.1.0",
        inputs: [
          "failure mechanism",
          "severity",
          "cause family",
          "structural typology",
          "material",
          "trigger condition",
          "territorial context",
          "distance when coordinates are available",
        ],
        output:
          "0-100 similarity score with explanatory match reasons",
        limitations: [
          "Similarity is rule-based, not machine learned.",
          "It identifies technical precedents, not causal equivalence.",
        ],
      },
    ],
  };
  const fieldCoverage = [
    "event_id",
    "date",
    "municipality",
    "province",
    "region",
    "latitude",
    "longitude",
    "collapse_severity",
    "specific_cause",
    "source_confidence",
    "exact_location",
    "structural_type",
    "material_type",
    "construction_year",
    "description",
  ].map((field) => {
    const complete = events.filter(
      (event) =>
        event[field] !== null &&
        event[field] !== undefined &&
        event[field] !== ""
    ).length;

    return {
      complete,
      field,
      missing: events.length - complete,
      coverage: Math.round(
        (complete / Math.max(events.length, 1)) *
          100
      ),
    };
  });
  const eventsWithoutSources = events.filter(
    (event) =>
      !sources.some(
        (source) =>
          source.event_id === event.event_id
      )
  );
  const lowEvidenceEvents = reliability.filter(
    (item) => item.grade === "D"
  );
  const incompleteCoordinates = events.filter(
    (event) =>
      !Number.isFinite(event.latitude) ||
      !Number.isFinite(event.longitude)
  );
  const readinessScore = Math.round(
    (fieldCoverage.reduce(
      (total, item) => total + item.coverage,
      0
    ) /
      fieldCoverage.length) *
      0.55 +
      (100 -
        Math.round(
          (eventsWithoutSources.length /
            Math.max(events.length, 1)) *
            100
        )) *
        0.20 +
      (100 -
        Math.round(
          (lowEvidenceEvents.length /
            Math.max(events.length, 1)) *
            100
        )) *
        0.15 +
      (100 -
        Math.round(
          (incompleteCoordinates.length /
            Math.max(events.length, 1)) *
            100
        )) *
        0.10
  );
  const dataQuality = {
    generated_at: generatedAt,
    readiness_score: readinessScore,
    summary: {
      events: events.length,
      sources: sources.length,
      avg_sources_per_event: Number(
        (
          sources.length /
          Math.max(events.length, 1)
        ).toFixed(2)
      ),
      events_without_sources:
        eventsWithoutSources.length,
      low_evidence_events:
        lowEvidenceEvents.length,
      incomplete_coordinates:
        incompleteCoordinates.length,
    },
    field_coverage: fieldCoverage,
    watch_items: [
      {
        label: "Events without linked sources",
        value: eventsWithoutSources.length,
      },
      {
        label: "Low evidence events",
        value: lowEvidenceEvents.length,
      },
      {
        label: "Incomplete coordinates",
        value: incompleteCoordinates.length,
      },
      {
        label: "Missing construction year",
        value:
          fieldCoverage.find(
            (item) =>
              item.field === "construction_year"
          )?.missing || 0,
      },
    ],
  };
  const fieldDescriptions = {
    bridge_crossing_name:
      "Named crossing, road, railway, river or infrastructure reference.",
    bridge_crossing_type:
      "Crossing or infrastructure context associated with the bridge.",
    bridge_name:
      "Bridge or viaduct name when available.",
    cause_category:
      "High-level cause family assigned by ARCUS.",
    collapse_severity:
      "Collapse severity classification, including TC and partial-collapse cases.",
    construction_year:
      "Known or estimated construction year when available.",
    curation_level:
      "ARCUS internal curation tier for the event record.",
    date: "Event date in ISO-like format when available.",
    description:
      "Curated narrative summary of the event.",
    destination_use:
      "Infrastructure use or network destination category.",
    event_id:
      "Stable ARCUS event identifier.",
    event_slug:
      "URL-safe event slug.",
    exact_location:
      "Whether the event has exact geospatial positioning.",
    injuries:
      "Reported injuries associated with the event.",
    language:
      "Language of the source record.",
    latitude:
      "Latitude in decimal degrees.",
    longitude:
      "Longitude in decimal degrees.",
    material_type:
      "Primary structural material category.",
    municipality:
      "Municipality associated with the event.",
    notes:
      "Curatorial notes associated with a source.",
    province:
      "Italian province associated with the event.",
    publication_date:
      "Publication date of the source.",
    region:
      "Italian region associated with the event.",
    source_confidence:
      "ARCUS confidence level for source-backed event evidence.",
    source_id:
      "Stable ARCUS source identifier.",
    source_role:
      "Source role classification, such as News, Scientific or Official/Technical.",
    source_title:
      "Title of the linked source.",
    source_type:
      "Source publisher or type.",
    source_url:
      "URL of the source when available.",
    specific_cause:
      "Specific ARCUS failure mechanism classification.",
    hydraulic_intelligence:
      "Normalized historical outcome features for Hydraulic events, including trigger, failure process, component and evidence level; excluded from scoring and retrieval inputs.",
    hydraulic_intelligence_warnings:
      "Internal semantic validation warnings produced during hydraulic-intelligence normalization.",
    hydraulic_geometry:
      "Professional-only source-backed bridge length and active-riverbed pier-presence evidence from D'Angelo, Ballio & Ravazzani (2025), with record-level matching provenance; excluded from scoring and analogue retrieval pending validation.",
    hydraulic_geometry_warnings:
      "Internal validation warnings for source-backed hydraulic geometry; invalid records abstain instead of being inferred.",
    hydraulic_outcome_curation:
      "Professional-only provenance and previous values for an audited historical-outcome correction; excluded from scoring and analogue retrieval inputs.",
    landslide_intelligence:
      "Versioned Professional-only historical landslide outcome curation, including eligibility, mechanism, interaction, component, episode and evidence references; excluded from scoring and analogue retrieval inputs.",
    seismic_intelligence:
      "Versioned Professional-only historical seismic outcome curation, including eligibility, mechanism, interaction, component, episode and evidence references; excluded from scoring and analogue retrieval inputs.",
    structural_type:
      "Bridge structural typology.",
    triggered:
      "Whether the event was associated with an external trigger.",
    victims:
      "Reported fatalities associated with the event.",
  };
  const inferType = (value) => {
    if (typeof value === "boolean") {
      return "boolean";
    }

    if (typeof value === "number") {
      return "number";
    }

    if (value === null || value === undefined) {
      return "unknown";
    }

    return "string";
  };
  const buildDatasetDictionary = (
    id,
    label,
    rows
  ) => {
    const keys = [
      ...new Set(
        rows.flatMap((row) => Object.keys(row))
      ),
    ].sort();

    return {
      id,
      label,
      records: rows.length,
      fields: keys.map((field) => {
        const values = rows
          .map((row) => row[field])
          .filter(
            (value) =>
              value !== null &&
              value !== undefined &&
              value !== ""
          );
        const typeCounts = values.reduce(
          (accumulator, value) => {
            const type = inferType(value);
            accumulator[type] =
              (accumulator[type] || 0) + 1;

            return accumulator;
          },
          {}
        );
        const type =
          Object.entries(typeCounts).sort(
            (a, b) => b[1] - a[1]
          )[0]?.[0] || "unknown";

        return {
          coverage: Math.round(
            (values.length /
              Math.max(rows.length, 1)) *
              100
          ),
          description:
            fieldDescriptions[field] ||
            "Derived or curated ARCUS field.",
          field,
          missing: rows.length - values.length,
          required:
            values.length === rows.length,
          type,
        };
      }),
    };
  };
  const dataDictionary = {
    generated_at: generatedAt,
    datasets: [
      buildDatasetDictionary(
        "events",
        "Processed ARCUS events",
        events
      ),
      buildDatasetDictionary(
        "sources",
        "Processed ARCUS sources",
        sources
      ),
      buildDatasetDictionary(
        "professional_events",
        "Professional enriched events",
        professionalEvents
      ),
      buildDatasetDictionary(
        "professional_sources",
        "Professional normalized sources",
        sources
      ),
      buildDatasetDictionary(
        "event_reliability",
        "Event reliability model output",
        reliability
      ),
      buildDatasetDictionary(
        "event_vulnerability",
        "Event vulnerability model output",
        vulnerability
      ),
    ],
  };
  const sourceEventIds = new Set(
    sources.map((source) => source.event_id)
  );
  const eventIds = new Set(
    events.map((event) => event.event_id)
  );
  const duplicateEventIds = [
    ...events
      .reduce((accumulator, event) => {
        accumulator.set(
          event.event_id,
          (accumulator.get(event.event_id) || 0) +
            1
        );

        return accumulator;
      }, new Map())
      .entries(),
  ]
    .filter(([, count]) => count > 1)
    .map(([eventId]) => eventId);
  const orphanSources = sources.filter(
    (source) => !eventIds.has(source.event_id)
  );
  const {
    includedYearMax,
    includedYearMin,
  } = yearRangeFor(events);
  const existingRelease = readJsonIfExists(
    professionalReleasePath
  );
  const existingAinopIndex = readJsonIfExists(
    professionalAinopBridgeIndexPath
  );
  const stableReleaseMetadata =
    existingAinopIndex?.metadata || {};
  const releaseGeneratedAt =
    stableReleaseMetadata.generated_at ||
    existingRelease?.generated_at ||
    generatedAt;
  const releaseDataCutoffDate =
    stableReleaseMetadata.data_cutoff_date ||
    existingRelease?.data_cutoff_date ||
    releaseGeneratedAt;
  const datasetVersion =
    stableReleaseMetadata.dataset_version ||
    existingRelease?.dataset_version ||
    `arcus-professional-${releaseGeneratedAt.slice(0, 10).replaceAll("-", ".")}`;
  const release = {
    data_cutoff_date: releaseDataCutoffDate,
    dataset_scope: "professional",
    dataset_version: datasetVersion,
    generated_at: releaseGeneratedAt,
    id:
      existingRelease?.id ||
      `arcus-professional-${releaseGeneratedAt.slice(0, 10)}`,
    included_year_max: includedYearMax,
    included_year_min: includedYearMin,
    latest_event_date: latestDateFor(events),
    name: "ARCUS Professional Data Release",
    total_events: events.length,
    total_sources: sources.length,
    version: generatedAt.slice(0, 10).replaceAll("-", "."),
    counts: {
      events: events.length,
      sources: sources.length,
      provinces: provinceProfiles.length,
      regions: regionProfiles.length,
      professional_events:
        professionalEvents.length,
      professional_sources:
        sources.length,
    },
    checks: [
      {
        label: "Events with linked sources",
        passed:
          events.filter((event) =>
            sourceEventIds.has(event.event_id)
          ).length === events.length,
        value: `${events.filter((event) => sourceEventIds.has(event.event_id)).length}/${events.length}`,
      },
      {
        label: "Duplicate event identifiers",
        passed: duplicateEventIds.length === 0,
        value: duplicateEventIds.length,
      },
      {
        label: "Orphan sources",
        passed: orphanSources.length === 0,
        value: orphanSources.length,
      },
      {
        label: "Professional readiness score",
        passed: readinessScore >= 80,
        value: readinessScore,
      },
    ],
    notes: [
      "Generated from ARCUS raw CSV sources through scripts/build-data.js.",
      "Professional outputs include reliability, vulnerability, territory profiles and schema documentation.",
      "External hazard layers are not included in this release.",
    ],
  };
  const externalHazardLayers = {
    generated_at: generatedAt,
    status:
      "registry-ready; geospatial ingestion pending",
    layers: [
      {
        id: "ispra-idrogeo-landslide-hazard",
        category: "landslide",
        name: "ISPRA IdroGEO landslide hazard",
        provider: "ISPRA IdroGEO",
        source_url:
          "https://developers.italia.it/it/api/ispra-idrogeo.html",
        documentation_url:
          "https://www.isprambiente.gov.it/it/banche-dati/banche-dati-folder/suolo-e-territorio/rischi-geologici-e-naturali",
        arcus_use:
          "Enrich asset screening and territorial vulnerability with landslide susceptibility and IFFI context.",
        integration_status: "planned",
        join_strategy:
          "asset coordinates intersect hazard polygons or nearest-area lookup",
        priority: "high",
      },
      {
        id: "ispra-idrogeo-flood-hazard",
        category: "flood",
        name: "ISPRA IdroGEO flood hazard",
        provider: "ISPRA IdroGEO",
        source_url:
          "https://developers.italia.it/it/api/ispra-idrogeo.html",
        documentation_url:
          "https://www.isprambiente.gov.it/it/banche-dati/banche-dati-folder/suolo-e-territorio/rischi-geologici-e-naturali",
        arcus_use:
          "Support hydraulic scenario scoring, flood exposure and asset screening near river systems.",
        integration_status: "planned",
        join_strategy:
          "asset coordinates intersect flood hazard classes or municipal/provincial aggregation",
        priority: "high",
      },
      {
        id: "ingv-mps04-seismic-hazard",
        category: "seismic",
        name: "INGV MPS04 seismic hazard",
        provider: "INGV",
        source_url:
          "https://esse1-gis.mi.ingv.it/mps04_ita.jsp",
        documentation_url:
          "https://zonesismiche.mi.ingv.it/",
        arcus_use:
          "Add seismic hazard context to territorial scoring and scenario comparison.",
        integration_status: "planned",
        join_strategy:
          "asset coordinates sampled against seismic hazard grid or zone lookup",
        priority: "high",
      },
      {
        id: "protezione-civile-meteo-hydro-alerts",
        category: "monitoring",
        name: "Protezione Civile meteo-hydro alerts",
        provider:
          "Dipartimento della Protezione Civile",
        source_url:
          "https://rischi.protezionecivile.it/it/meteo-idro/allertamento",
        documentation_url:
          "https://rischi.protezionecivile.gov.it/en/approfondimento/alert-meteo-hydro-risk/",
        arcus_use:
          "Future live monitoring signal for hydrogeological and hydraulic alert conditions.",
        integration_status: "research",
        join_strategy:
          "map alert zones to assets, provinces or regions when structured feeds are available",
        priority: "medium",
      },
      {
        id: "ispra-ithaca-capable-faults",
        category: "faults",
        name: "ISPRA ITHACA capable faults",
        provider: "ISPRA",
        source_url:
          "https://www.isprambiente.gov.it/it/banche-dati/banche-dati-folder/suolo-e-territorio/rischi-geologici-e-naturali",
        documentation_url:
          "https://www.isprambiente.gov.it/it/banche-dati/banche-dati-folder/suolo-e-territorio/rischi-geologici-e-naturali",
        arcus_use:
          "Contextual seismic/geological exposure layer for advanced professional assessments.",
        integration_status: "planned",
        join_strategy:
          "distance from asset/event coordinates to mapped capable fault segments",
        priority: "medium",
      },
    ],
  };
  const hazardGroups = [
    {
      key: "hydraulic",
      label: "Hydraulic exposure",
      causes: ["Hydraulic"],
      external_layers: [
        "ispra-idrogeo-flood-hazard",
        "protezione-civile-meteo-hydro-alerts",
      ],
    },
    {
      key: "landslide",
      label: "Landslide exposure",
      causes: ["Landslide"],
      external_layers: [
        "ispra-idrogeo-landslide-hazard",
      ],
    },
    {
      key: "seismic",
      label: "Seismic exposure",
      causes: ["Earthquake"],
      external_layers: [
        "ingv-mps04-seismic-hazard",
        "ispra-ithaca-capable-faults",
      ],
    },
    {
      key: "structural",
      label: "Structural vulnerability exposure",
      causes: [
        "Material",
        "Design and Construction",
        "Overload",
      ],
      external_layers: [],
    },
  ];
  const hazardExposurePreview = {
    generated_at: generatedAt,
    method:
      "ARCUS internal pattern proxy; external geospatial joins pending",
    status: "preview",
    hazard_groups: hazardGroups,
    provinces: provinceProfiles.map((profile) => {
      const hazards = hazardGroups.map((group) => {
        const matchedEvents = group.causes.reduce(
          (total, cause) =>
            total + (profile.causeCounts?.[cause] || 0),
          0
        );
        const share =
          profile.total > 0
            ? matchedEvents / profile.total
            : 0;
        const score = Math.min(
          100,
          Math.round(
            share * 70 +
              Math.min(profile.total * 2, 20) +
              Math.min(profile.riskScore * 0.1, 10)
          )
        );

        return {
          external_layers: group.external_layers,
          key: group.key,
          label: group.label,
          matched_events: matchedEvents,
          score,
          share: Number(share.toFixed(3)),
        };
      });
      const dominant = [...hazards].sort(
        (a, b) => b.score - a.score
      )[0];

      return {
        dominant_hazard: dominant?.key || null,
        hazards,
        province: profile.territory,
        risk_score: profile.riskScore,
        total_events: profile.total,
      };
    }),
  };

  writeJson(
    professionalManifestPath,
    manifest
  );
  writeJson(
    professionalTerritoriesPath,
    {
      generated_at: generatedAt,
      provinces: provinceProfiles,
      regions: regionProfiles,
    }
  );
  writeJson(
    professionalReliabilityPath,
    {
      generated_at: generatedAt,
      events: reliability,
    }
  );
  writeJson(
    professionalVulnerabilityPath,
    {
      generated_at: generatedAt,
      events: vulnerability,
    }
  );
  writeJson(
    professionalEventsPath,
    {
      generated_at: generatedAt,
      events: professionalEvents,
    }
  );
  writeJson(
    professionalSourcesPath,
    {
      generated_at: generatedAt,
      sources,
    }
  );
  writeJson(
    professionalModelCardsPath,
    modelCards
  );
  writeJson(
    professionalDataQualityPath,
    dataQuality
  );
  writeJson(
    professionalDataDictionaryPath,
    dataDictionary
  );
  writeJson(
    professionalReleasePath,
    release
  );
  writeJson(
    professionalExternalLayersPath,
    externalHazardLayers
  );
  writeJson(
    professionalHazardExposurePath,
    hazardExposurePreview
  );
  writeJson(
    professionalHydraulicIntelligenceAuditPath,
    hydraulicIntelligenceAudit
  );
  writeJson(
    professionalLandslideIntelligenceAuditPath,
    {
      generated_at: generatedAt,
      ...landslideIntelligenceAudit,
      production_support_contract:
        landslideRegistry.production_support_contract,
    }
  );
  writeJson(
    professionalSeismicIntelligenceAuditPath,
    {
      generated_at: generatedAt,
      ...seismicIntelligenceAudit,
      production_support_contract:
        seismicRegistry.production_support_contract,
    }
  );

  console.log(
    "Professional API data generated"
  );
  console.log(
    JSON.stringify(
      {
        hydraulic_intelligence: hydraulicIntelligenceAudit.summary,
        landslide_intelligence: landslideIntelligenceAudit,
        seismic_intelligence: seismicIntelligenceAudit,
      },
      null,
      2
    )
  );
}

/* ================================= */
/* BUILD PIPELINE */
/* ================================= */

async function buildData() {

  try {

    console.log(
      "Starting ARCUS data build..."
    );

    const normalizedResearch = normalizeResearchDataset({
      legacyEventsPath: outputEventsPath,
      masterResearchPath,
      provinceGeoJsonPath,
    });

    events.push(...normalizedResearch.events);
    sources.push(...normalizedResearch.sources);
    saveProfessionalApiData.rawEventRows =
      normalizedResearch.eventRows;
    saveProfessionalApiData.hydraulicGeometryLinkRows =
      readXlsxSheet(masterResearchPath, "HYDRAULIC_GEOMETRY_LINKS");
    saveProfessionalApiData.datasetRows =
      readXlsxSheet(masterResearchPath, "DATASETS");
    saveProfessionalApiData.normalizationWarnings =
      normalizedResearch.warnings;

    console.log(
      `Loaded Professional live dataset from MASTER_RESEARCH.xlsx: ${events.length} events, ${sources.length} sources`
    );

    const openRelease = buildOpenResearchRelease({
      legacyEventsPath: outputEventsPath,
      masterResearchPath,
      normalizedData: normalizedResearch,
      outputRoot: openReleaseRoot,
      provinceGeoJsonPath,
    });

    console.log(
      `Open Research release ${openRelease.manifest.version}: ${openRelease.events.length} events, ${openRelease.sources.length} sources`
    );

    saveJson();

    saveProfessionalApiData();

    console.log(
      "ARCUS dataset successfully updated"
    );

  } catch (error) {

    console.error(
      "Build failed:",
      error
    );
    process.exitCode = 1;
  }
}

/* ================================= */
/* RUN */
/* ================================= */

buildData();
