import fs from "fs";
import path from "path";
import csv from "csv-parser";
import {
  buildSourceReliabilityByEvent,
  buildTerritoryProfiles,
  buildVulnerabilityByEvent,
} from "../src/utils/analytics.js";

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

const outputEventsPath = path.resolve(
  "public/data/processed/events.json"
);

const outputSourcesPath = path.resolve(
  "public/data/processed/sources.json"
);

const professionalDataDir = path.resolve(
  "public/data/professional"
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

/* ================================= */
/* LOAD EVENTS */
/* ================================= */

function loadEvents() {

  return new Promise(
    (resolve, reject) => {

      fs.createReadStream(
        eventsCsvPath
      )

        .pipe(
          csv({
            separator: ";",
          })
        )

        .on("data", (row) => {

          const processed =
            processRow(row);

          if (processed) {
            events.push(processed);
          }
        })

        .on("end", () => {

          console.log(
            `Loaded ${events.length} events`
          );

          resolve();
        })

        .on("error", reject);
    }
  );
}

/* ================================= */
/* LOAD SOURCES */
/* ================================= */

function loadSources() {

  return new Promise(
    (resolve, reject) => {

      fs.createReadStream(
        sourcesCsvPath
      )

        .pipe(
          csv({
            separator: ";",
          })
        )

        .on("data", (row) => {

          const processed =
            processRow(row);

          if (processed) {
            sources.push(processed);
          }
        })

        .on("end", () => {

          console.log(
            `Loaded ${sources.length} sources`
          );

          resolve();
        })

        .on("error", reject);
    }
  );
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

function saveProfessionalApiData() {

  if (!fs.existsSync(professionalDataDir)) {
    fs.mkdirSync(
      professionalDataDir,
      { recursive: true }
    );
  }

  const generatedAt =
    new Date().toISOString();
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
  const professionalEvents = events.map(
    (event) => ({
      ...event,
      reliability:
        reliabilityByEvent[event.event_id],
      vulnerability:
        vulnerabilityByEvent[event.event_id],
    })
  );
  const manifest = {
    generated_at: generatedAt,
    name: "ARCUS Professional API Manifest",
    version: "0.1.0",
    endpoints: [
      {
        description:
          "Curated bridge-collapse events enriched with reliability and vulnerability models.",
        path: "/data/professional/professional-events.json",
        resource: "professional_events",
      },
      {
        description:
          "Regional and provincial risk profiles generated from ARCUS event and source data.",
        path: "/data/professional/territory-profiles.json",
        resource: "territory_profiles",
      },
      {
        description:
          "Event-level evidence reliability scores and classes.",
        path: "/data/professional/event-reliability.json",
        resource: "event_reliability",
      },
      {
        description:
          "Event-level vulnerability scores and classes.",
        path: "/data/professional/event-vulnerability.json",
        resource: "event_vulnerability",
      },
      {
        description:
          "Versioned model cards describing ARCUS Professional scoring logic, inputs and limitations.",
        path: "/data/professional/model-cards.json",
        resource: "model_cards",
      },
      {
        description:
          "Dataset completeness, coverage and professional-readiness audit.",
        path: "/data/professional/data-quality.json",
        resource: "data_quality",
      },
      {
        description:
          "Machine-readable data dictionary describing fields, types and coverage for ARCUS datasets.",
        path: "/data/professional/data-dictionary.json",
        resource: "data_dictionary",
      },
      {
        description:
          "Versioned data release metadata, counts and quality checks.",
        path: "/data/professional/data-release.json",
        resource: "data_release",
      },
      {
        description:
          "Registry of external hazard layers planned for ARCUS Professional enrichment.",
        path: "/data/professional/external-hazard-layers.json",
        resource: "external_hazard_layers",
      },
      {
        description:
          "Province-level hazard exposure preview prepared for future external layer joins.",
        path: "/data/professional/hazard-exposure-preview.json",
        resource: "hazard_exposure_preview",
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
  const release = {
    generated_at: generatedAt,
    id: `arcus-professional-${generatedAt.slice(0, 10)}`,
    name: "ARCUS Professional Data Release",
    version: "0.1.0",
    counts: {
      events: events.length,
      sources: sources.length,
      provinces: provinceProfiles.length,
      regions: regionProfiles.length,
      professional_events:
        professionalEvents.length,
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

  console.log(
    "Professional API data generated"
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

    await loadEvents();

    await loadSources();

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
  }
}

/* ================================= */
/* RUN */
/* ================================= */

buildData();
