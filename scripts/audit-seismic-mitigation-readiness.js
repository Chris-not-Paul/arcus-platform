import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import {
  SEISMIC_CORE_FIELDS,
  summarizeSeismicRegistry,
  validateSeismicOutcomeRegistry,
} from "../src/utils/seismicIntelligence.js";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const INTELLIGENCE_DIR = path.join(
  ROOT,
  "private-data",
  "professional",
  "collapse-intelligence"
);
const OUTPUT_PATH = path.join(
  INTELLIGENCE_DIR,
  "seismic-mitigation-readiness.json"
);

function readJson(filePath, fallback) {
  if (!fs.existsSync(filePath)) {
    return fallback;
  }

  return JSON.parse(fs.readFileSync(filePath, "utf8").replace(/^\uFEFF/, ""));
}

function hasValue(value) {
  return value !== null && value !== undefined && String(value).trim() !== "";
}

function currentMps04Summary(signature) {
  const seismic = signature?.seismic || {};

  return {
    pga_p50_g: Number.isFinite(Number(seismic.pga_p50_g))
      ? Number(seismic.pga_p50_g)
      : null,
    provider_version: seismic.provider_version || null,
    sampling_method: seismic.sampling_method || null,
    source_dataset_version: seismic.source_dataset_version || null,
    status: seismic.status || "missing",
  };
}

export function isSeismicOutcomeCandidate(event) {
  return String(event?.specific_cause || "").trim().toLowerCase() === "earthquake";
}

export function auditSeismicMitigationReadiness({
  events,
  knowledgeBase,
  registry,
  signatures,
  sources,
}) {
  const registryValidation = validateSeismicOutcomeRegistry(registry);

  if (!registryValidation.ok) {
    throw new Error(
      `Invalid seismic outcome registry: ${JSON.stringify(registryValidation.errors)}`
    );
  }

  const databaseCandidates = events.filter(isSeismicOutcomeCandidate);
  const databaseIds = new Set(databaseCandidates.map((event) => event.event_id));
  const registryIds = new Set((registry.cases || []).map((entry) => entry.event_id));
  const missingRegistryCases = [...databaseIds].filter((eventId) => !registryIds.has(eventId));
  const unknownRegistryCases = [...registryIds].filter((eventId) => !databaseIds.has(eventId));

  if (missingRegistryCases.length || unknownRegistryCases.length) {
    throw new Error(
      `Seismic registry coverage mismatch: ${JSON.stringify({ missingRegistryCases, unknownRegistryCases })}`
    );
  }

  const eventsById = new Map(events.map((event) => [event.event_id, event]));
  const signaturesById = new Map(signatures.map((signature) => [signature.event_id, signature]));
  const sourcesById = new Map();
  sources.forEach((source) => {
    const linked = sourcesById.get(source.event_id) || [];
    linked.push(source);
    sourcesById.set(source.event_id, linked);
  });

  const candidateCases = (registry.cases || []).map((entry) => {
    const event = eventsById.get(entry.event_id);
    const intelligence = entry.seismic_intelligence || {};
    const missingCoreFields = SEISMIC_CORE_FIELDS.filter(
      (field) => !hasValue(intelligence[field])
    );
    const linkedSources = sourcesById.get(entry.event_id) || [];

    return {
      collapse_severity: event.collapse_severity || null,
      current_mps04: currentMps04Summary(signaturesById.get(entry.event_id)),
      curation_status: entry.curation_status,
      date: event.date || null,
      episode_id: entry.episode_id,
      event_id: entry.event_id,
      learning_eligibility: entry.learning_eligibility,
      missing_core_fields: missingCoreFields,
      outcome_status: entry.outcome_status,
      province: event.province || null,
      seismic_intelligence_status:
        missingCoreFields.length === 0 ? "core_complete" : "not_curated",
      source_roles: [...new Set(linkedSources.map((source) => source.source_role))].sort(),
    };
  });
  const eligible = candidateCases.filter(
    (row) => row.learning_eligibility === "eligible"
  );
  const eligibleEpisodes = new Set(
    eligible.map((row) => row.episode_id).filter(Boolean)
  );
  const contract = registry.production_support_contract || {};
  const cohortMinimum = contract.cohort_activation_minimum || {};
  const weights = contract.evidence_weights || {};
  const episodeWeights = new Map();
  (registry.cases || [])
    .filter((entry) => entry.learning_eligibility === "eligible")
    .forEach((entry) => {
      const weight = Number(weights[entry.seismic_intelligence?.evidence_level] || 0);
      episodeWeights.set(
        entry.episode_id,
        Math.max(episodeWeights.get(entry.episode_id) || 0, weight)
      );
    });
  const episodeEffectiveEvidence = [...episodeWeights.values()].reduce(
    (total, weight) => total + weight,
    0
  );
  const seismicKnowledge = knowledgeBase?.entries?.find(
    (entry) => entry.hazard_family === "seismic"
  );
  const blockers = [
    eligibleEpisodes.size < Number(cohortMinimum.independent_episodes || 0)
      ? "The eligible seismic cohort contains fewer independent episodes than the provisional abstention barrier."
      : null,
    episodeEffectiveEvidence < Number(cohortMinimum.episode_effective_evidence || 0)
      ? "Episode-effective seismic evidence remains below the provisional abstention barrier."
      : null,
    seismicKnowledge?.status !== "validated" ||
    seismicKnowledge?.external_validation_required !== false
      ? "The seismic knowledge-base entry is draft and requires external engineering validation."
      : null,
    contract.status !== "expert_validated"
      ? "The seismic support contract is not expert validated."
      : null,
  ].filter(Boolean);

  return {
    candidate_cases: candidateCases,
    caveats: [
      "The three ARCUS earthquake records belong to the same 6 April 2009 L'Aquila earthquake and are not independent replications.",
      "Current MPS04 PGA is a reference hazard value, not recorded shaking at the collapse date and not collapse probability.",
      "Fossa retains competing structural and geotechnical mechanism interpretations and is excluded from process-specific learning.",
      "Missing bridge identity or mechanism remains missing and is not inferred from coordinates, PGA or regional earthquake damage.",
    ],
    coverage: {
      candidate_cases: candidateCases.length,
      core_taxonomy_complete: candidateCases.filter(
        (row) => row.seismic_intelligence_status === "core_complete"
      ).length,
      current_mps04_available: candidateCases.filter(
        (row) => row.current_mps04.status === "available"
      ).length,
      eligible_cases: eligible.length,
      eligible_independent_episodes: eligibleEpisodes.size,
      episode_effective_evidence: episodeEffectiveEvidence,
      excluded_insufficient_evidence_cases: candidateCases.filter(
        (row) => String(row.curation_status).startsWith("excluded_insufficient_")
      ).length,
      multicausal_or_disputed_cases: candidateCases.filter((row) =>
        String(row.curation_status).includes("multicausal") ||
        String(row.curation_status).includes("disputed")
      ).length,
      single_historical_episode: new Set(
        (registry.cases || []).map((entry) => entry.episode_id).filter(Boolean)
      ).size === 1,
    },
    decision: blockers.length
      ? "not_ready_for_collapse_learned_seismic_strategies"
      : "ready_for_expert_validation",
    gate: {
      allowed_now: [
        "Show current INGV MPS04 point exposure with provenance and limitations.",
        "Curate source-backed earthquake-associated bridge outcomes and episode independence.",
        "Return explicit abstention with zero collapse-learned seismic strategies.",
      ],
      blocked_now: [
        "Automatic seismic attention or retrofit-priority assignment.",
        "Treating current MPS04 PGA as historical recorded shaking or collapse probability.",
        "Counting multiple bridges from the L'Aquila earthquake as independent seismic episodes.",
        "Process-specific seismic mitigation strategies without repeated source-backed mechanisms and expert validation.",
      ],
      blockers,
    },
    generated_at: new Date().toISOString(),
    registry_summary: summarizeSeismicRegistry(registry),
    registry_validation: registryValidation,
    required_core_fields: SEISMIC_CORE_FIELDS,
    schema_version: "arcus-seismic-mitigation-readiness-v1",
  };
}

export function loadAndAuditSeismicMitigationReadiness() {
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
  const knowledgeBase = readJson(
    path.join(ROOT, "config", "collapse-intelligence", "mitigation-knowledge-base.json"),
    { entries: [] }
  );
  const registry = readJson(
    path.join(ROOT, "config", "collapse-intelligence", "seismic-outcome-registry.json"),
    { cases: [] }
  );

  return auditSeismicMitigationReadiness({
    events: eventPayload.events || [],
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
  const audit = loadAndAuditSeismicMitigationReadiness();

  fs.mkdirSync(INTELLIGENCE_DIR, { recursive: true });
  fs.writeFileSync(OUTPUT_PATH, `${JSON.stringify(audit, null, 2)}\n`, "utf8");
  console.log(JSON.stringify(audit, null, 2));
}
