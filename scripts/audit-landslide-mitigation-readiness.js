import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import {
  LANDSLIDE_CORE_FIELDS,
  summarizeLandslideRegistry,
  validateLandslideOutcomeRegistry,
} from "../src/utils/landslideIntelligence.js";

export { LANDSLIDE_CORE_FIELDS } from "../src/utils/landslideIntelligence.js";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const INTELLIGENCE_DIR = path.join(
  ROOT,
  "private-data",
  "professional",
  "collapse-intelligence"
);
const OUTPUT_PATH = path.join(
  INTELLIGENCE_DIR,
  "landslide-mitigation-readiness.json"
);

const COMPLETE_SIGNATURE_STATUSES = new Set([
  "available",
  "no_intersection",
  "outside_coverage",
  "partial",
]);

function readJson(filePath, fallback) {
  if (!fs.existsSync(filePath)) {
    return fallback;
  }

  return JSON.parse(fs.readFileSync(filePath, "utf8").replace(/^\uFEFF/, ""));
}

function hasValue(value) {
  return value !== null && value !== undefined && String(value).trim() !== "";
}

function countBy(items, getter) {
  const counts = {};

  items.forEach((item) => {
    const key = getter(item) || "unspecified";
    counts[key] = (counts[key] || 0) + 1;
  });

  return Object.fromEntries(
    Object.entries(counts).sort(
      ([leftKey, leftCount], [rightKey, rightCount]) =>
        rightCount - leftCount || leftKey.localeCompare(rightKey)
    )
  );
}

export function isLandslideOutcomeCandidate(event) {
  const primaryCause = String(event?.specific_cause || "").trim().toLowerCase();
  const trigger = String(event?.failure_trigger || "").trim().toLowerCase();

  return primaryCause === "landslide" || trigger.includes("landslide");
}

function candidateBasis(event) {
  return String(event?.specific_cause || "").trim().toLowerCase() === "landslide"
    ? "primary_cause"
    : "documented_trigger";
}

function currentPaiSummary(signature) {
  const landslide = signature?.landslide || {};

  return {
    attention_area: landslide.attention_area === true,
    classes: Array.isArray(landslide.matched_hazard_classes)
      ? landslide.matched_hazard_classes
      : [],
    highest_class: landslide.highest_hazard_class || null,
    status: landslide.status || "missing",
  };
}

export function auditLandslideMitigationReadiness({
  events,
  registry,
  signatures,
  sources,
  historicalSignatures = [],
  knowledgeBase,
}) {
  const registryValidation = validateLandslideOutcomeRegistry(registry);

  if (!registryValidation.ok) {
    throw new Error(
      `Invalid landslide outcome registry: ${JSON.stringify(registryValidation.errors)}`
    );
  }

  const eventsById = new Map(events.map((event) => [event.event_id, event]));
  const missingRegistryEvents = (registry.cases || [])
    .map((entry) => entry.event_id)
    .filter((eventId) => !eventsById.has(eventId));

  if (missingRegistryEvents.length) {
    throw new Error(
      `Landslide registry references missing Professional events: ${missingRegistryEvents.join(", ")}`
    );
  }
  const signaturesByEvent = new Map(
    signatures.map((signature) => [signature.event_id, signature])
  );
  const sourcesByEvent = new Map();

  sources.forEach((source) => {
    const eventSources = sourcesByEvent.get(source.event_id) || [];
    eventSources.push(source);
    sourcesByEvent.set(source.event_id, eventSources);
  });

  const candidates = (registry.cases || []).map((entry) => ({
    entry,
    event: eventsById.get(entry.event_id),
  }));
  const candidateRows = candidates.map(({ entry, event }) => {
    const eventSources = sourcesByEvent.get(event.event_id) || [];
    const intelligence = entry.landslide_intelligence || null;
    const missingFields = LANDSLIDE_CORE_FIELDS.filter(
      (field) => !hasValue(intelligence?.[field])
    );
    const signature = currentPaiSummary(signaturesByEvent.get(event.event_id));

    return {
      current_pai: signature,
      date: event.date || null,
      event_id: event.event_id,
      landslide_basis: candidateBasis(event),
      curation_status: entry.curation_status,
      episode_id: entry.episode_id,
      learning_eligibility: entry.learning_eligibility,
      landslide_intelligence_status:
        missingFields.length === 0 ? "core_complete" : "not_curated",
      missing_core_fields: missingFields,
      outcome_status: entry.outcome_status,
      province: event.province || null,
      source_roles: [...new Set(eventSources.map((source) => source.source_role))].sort(),
    };
  });

  const currentComplete = candidateRows.filter((row) =>
    COMPLETE_SIGNATURE_STATUSES.has(row.current_pai.status)
  );
  const currentIntersections = candidateRows.filter(
    (row) => row.current_pai.status === "available"
  );
  const coreComplete = candidateRows.filter(
    (row) => row.landslide_intelligence_status === "core_complete"
  );
  const eligible = candidateRows.filter(
    (row) => row.learning_eligibility === "eligible"
  );
  const eligibleEpisodes = new Set(
    eligible.map((row) => row.episode_id).filter(Boolean)
  );
  const officialSourced = candidateRows.filter((row) =>
    row.source_roles.includes("Official/Technical")
  );
  const historicalAvailable = historicalSignatures.filter((signature) => {
    if (!candidateRows.some((row) => row.event_id === signature.event_id)) {
      return false;
    }

    return (
      signature?.historical_at_event?.status === "available_documented" ||
      signature?.status === "available_documented"
    );
  });
  const landslideKnowledge = knowledgeBase?.entries?.find(
    (entry) => entry.hazard_family === "landslide"
  );
  const knowledgeReady = Boolean(
    landslideKnowledge?.status === "validated" &&
      landslideKnowledge?.external_validation_required === false &&
      landslideKnowledge?.external_engineering_basis?.length > 0
  );
  const blockers = [
    eligible.length === 0
      ? "No candidate outcome is eligible for collapse-learned landslide analysis."
      : null,
    !knowledgeReady
      ? "The landslide knowledge-base entry is draft and has no expert-validated engineering basis."
      : null,
    registry.production_support_contract?.status !== "expert_validated"
      ? "No expert-approved production support threshold exists yet for the small landslide episode cohort."
      : null,
  ].filter(Boolean);

  return {
    candidate_cases: candidateRows,
    caveats: [
      "Current ISPRA PAI signatures describe the present-day project point and are not retrospective proof of the collapse mechanism.",
      "A no_intersection result means no PAI/AA polygon was assigned to that coordinate; it is not evidence of no landslide susceptibility.",
      "PAI class alone does not establish bridge-landslide interaction, vulnerability, severity or a Level 2/Level 3 attention class.",
      "Outcome fields are excluded from analogue selection and may be used only after the cohort has been selected from independent project and hazard features.",
      "Missing historical PAI classifications are retained as a limitation and do not invalidate source-backed mechanism curation.",
    ],
    coverage: {
      candidate_cases: candidateRows.length,
      core_taxonomy_complete: coreComplete.length,
      current_pai_complete: currentComplete.length,
      current_pai_intersections: currentIntersections.length,
      historical_pai_at_event: historicalAvailable.length,
      eligible_cases: eligible.length,
      eligible_independent_episodes: eligibleEpisodes.size,
      excluded_insufficient_evidence_cases: candidateRows.filter(
        (row) => String(row.curation_status || "").startsWith("excluded_insufficient_")
      ).length,
      disputed_cases: candidateRows.filter((row) => row.curation_status === "disputed").length,
      multicausal_cases: candidateRows.filter(
        (row) => row.curation_status === "curated_multicausal"
      ).length,
      needs_review_cases: candidateRows.filter((row) => row.curation_status === "needs_review").length,
      reclassified_cross_hazard_cases: candidateRows.filter(
        (row) => row.curation_status === "reclassified_cross_hazard"
      ).length,
      official_or_technical_source_cases: officialSourced.length,
      primary_landslide_cause_cases: candidateRows.filter(
        (row) => row.landslide_basis === "primary_cause"
      ).length,
      trigger_mediated_cases: candidateRows.filter(
        (row) => row.landslide_basis === "documented_trigger"
      ).length,
    },
    current_pai_class_distribution: countBy(candidateRows, (row) => {
      if (row.current_pai.attention_area) {
        return "AA";
      }

      return row.current_pai.highest_class || row.current_pai.status;
    }),
    decision: blockers.length
      ? "not_ready_for_collapse_learned_strategies"
      : "ready_for_expert_validation",
    gate: {
      allowed_now: [
        "Show official current PAI exposure and nearby context with provenance.",
        "Curate and audit historical landslide outcomes and their sources.",
        "Return an explicit abstention for collapse-learned landslide strategies.",
      ],
      blocked_now: [
        "Automatic Level 2 or Level 3 attention-class assignment.",
        "Treating current PAI class as the class at collapse time.",
        "Process-specific or prescriptive landslide mitigation strategies.",
        "Interpreting no_intersection as absence of landslide susceptibility.",
      ],
      blockers,
    },
    generated_at: new Date().toISOString(),
    registry_summary: summarizeLandslideRegistry(registry),
    registry_validation: registryValidation,
    required_core_fields: LANDSLIDE_CORE_FIELDS,
    schema_version: "arcus-landslide-mitigation-readiness-v3",
  };
}

export function loadAndAuditLandslideMitigationReadiness() {
  const eventPayload = readJson(
    path.join(ROOT, "private-data", "professional", "professional-events.json"),
    { events: [] }
  );
  const sourcePayload = readJson(
    path.join(ROOT, "private-data", "professional", "professional-sources.json"),
    { sources: [] }
  );
  const signaturePayload = readJson(
    path.join(INTELLIGENCE_DIR, "collapse-hazard-signatures.json"),
    { signatures: [] }
  );
  const historicalPayload = readJson(
    path.join(INTELLIGENCE_DIR, "historical-hazard-signatures.json"),
    { signatures: [] }
  );
  const knowledgeBase = readJson(
    path.join(ROOT, "config", "collapse-intelligence", "mitigation-knowledge-base.json"),
    { entries: [] }
  );
  const registry = readJson(
    path.join(ROOT, "config", "collapse-intelligence", "landslide-outcome-registry.json"),
    { cases: [] }
  );

  return auditLandslideMitigationReadiness({
    events: eventPayload.events || [],
    historicalSignatures: historicalPayload.signatures || [],
    knowledgeBase,
    registry,
    signatures: signaturePayload.signatures || [],
    sources: sourcePayload.sources || [],
  });
}

function isDirectExecution() {
  return process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;
}

if (isDirectExecution()) {
  const audit = loadAndAuditLandslideMitigationReadiness();

  fs.mkdirSync(INTELLIGENCE_DIR, { recursive: true });
  fs.writeFileSync(OUTPUT_PATH, `${JSON.stringify(audit, null, 2)}\n`, "utf8");
  console.log(JSON.stringify(audit, null, 2));
}
