import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { buildHydraulicEpisodeRegistry } from "../server/collapseEpisodeService.js";
import {
  buildEventResearchProfiles,
  researchFieldValue,
} from "../src/utils/eventResearchProfile.js";
import { readXlsxSheet } from "./lib/xlsx-reader.js";

const masterPath = path.resolve("private-data/raw/MASTER_RESEARCH.xlsx");
const professionalEventsPath = path.resolve(
  "private-data/professional/professional-events.json"
);
const professionalSourcesPath = path.resolve(
  "private-data/professional/professional-sources.json"
);
const schemaPath = path.resolve("config/research/event-research-schema.json");
const enrichmentPath = path.resolve(
  "config/research/event-research-enrichment-v1.json"
);
const profileOutputPath = path.resolve(
  "private-data/professional/event-research-profiles.json"
);
const auditOutputPath = path.resolve(
  "private-data/professional/event-research-readiness-audit.json"
);

function readCollection(filePath, key) {
  const data = JSON.parse(fs.readFileSync(filePath, "utf8").replace(/^\uFEFF/, ""));
  return Array.isArray(data) ? data : data[key] || [];
}

function populated(value) {
  return value !== null && value !== undefined && String(value).trim() !== "";
}

function coverageStatus(count, total) {
  const ratio = total ? count / total : 0;

  if (count === 0) return "not_structured";
  if (ratio >= 0.8) return "broad_coverage";
  if (ratio >= 0.25) return "limited_coverage";
  return "sparse_coverage";
}

function learningGate(field, count) {
  const policy = field.learning_use;

  if (["excluded", "excluded_until_coded", "excluded_from_pre_event_matching", "lesson_output_only"].includes(policy)) {
    return "excluded_by_design";
  }

  if (policy === "grouped_holdout_control") {
    return count > 0 ? "available_as_independence_control" : "blocked_missing_episode_data";
  }

  if (policy === "experiment_only_pending_value_audit") {
    return count > 0 ? "experiment_only_not_production" : "blocked_missing_data";
  }

  if (policy === "candidate_feature") {
    return count > 0 ? "candidate_requires_value_audit" : "blocked_missing_structured_data";
  }

  if (policy === "candidate_feature_after_homogeneity_review") {
    return count > 0 ? "candidate_requires_homogeneity_review" : "blocked_heterogeneous_context";
  }

  return "quality_control_only";
}

function buildAudit(schema, profiles, episodeRegistry) {
  const total = profiles.length;
  const fields = schema.fields.map((field) => {
    const count = profiles.filter((profile) => populated(
      researchFieldValue(profile, field.key)
    )).length;

    return {
      analytics_use: field.analytics_use,
      atlas_use: field.atlas_use,
      available: count,
      coverage: Number((count / Math.max(total, 1)).toFixed(4)),
      coverage_status: coverageStatus(count, total),
      field: field.key,
      group: field.group,
      learning_gate: learningGate(field, count),
      learning_use: field.learning_use,
      missing: total - count,
      phase: field.phase,
      visibility: field.visibility,
    };
  });
  const byGroup = fields.reduce((index, field) => {
    const group = index[field.group] || {
      available_cells: 0,
      field_count: 0,
      possible_cells: 0,
    };
    group.available_cells += field.available;
    group.field_count += 1;
    group.possible_cells += total;
    index[field.group] = group;
    return index;
  }, {});

  Object.values(byGroup).forEach((group) => {
    group.coverage = Number(
      (group.available_cells / Math.max(group.possible_cells, 1)).toFixed(4)
    );
  });

  return {
    schema_version: schema.schema_version,
    generated_at: new Date().toISOString(),
    status: "baseline_established",
    sample_size: total,
    interpretation:
      "Coverage reports structured availability only. It is not a quality, vulnerability, safety or model-readiness score.",
    summary: {
      events_with_curation_history: profiles.filter(
        (profile) => profile.provenance_summary.curation_entry_count > 0
      ).length,
      events_with_episode_control: profiles.filter(
        (profile) => profile.event_episode?.episode_id
      ).length,
      events_with_location_precision: profiles.filter((profile) =>
        populated(profile.record_precision.location_precision.value)
      ).length,
      events_with_research_enrichment: profiles.filter(
        (profile) => profile.enrichment_summary?.applied_field_count > 0
      ).length,
      hydraulic_bridge_length_available: profiles.filter((profile) =>
        populated(profile.bridge_configuration.bridge_length_m.value)
      ).length,
      hydraulic_pier_presence_available: profiles.filter((profile) =>
        populated(profile.bridge_configuration.piers_in_active_riverbed.value)
      ).length,
      independent_hydraulic_episodes: episodeRegistry.episode_count,
      review_required_hydraulic_episodes:
        episodeRegistry.review_required_episode_count,
    },
    groups: byGroup,
    fields,
    production_learning_policy: {
      allowed_now: [
        "episode_id as a grouped holdout and evidence-independence control",
        "existing reviewed failure-chain fields under their current evidence contract"
      ],
      experiment_only: [
        "bridge_length_m",
        "piers_in_active_riverbed"
      ],
      blocked_until_populated_and_audited: fields
        .filter((field) => field.learning_gate === "blocked_missing_structured_data")
        .map((field) => field.field),
      prohibited: [
        "post-event consequences as pre-event matching inputs",
        "imputation presented as observation",
        "automatic collapse probabilities or safety classes"
      ]
    },
    recommended_sequence: [
      "Curate span configuration and span count from authoritative or reviewable sources.",
      "Curate foundation type and active-riverbed pier count without inferring absent values.",
      "Structure pre-collapse inspection, warning and intervention evidence.",
      "Structure recovery dates and service disruption as post-event outcomes.",
      "Run coverage, leakage and episode-held-out value audits before enabling any new learning feature."
    ]
  };
}

export function buildEventResearchArtifacts() {
  if (!fs.existsSync(masterPath)) {
    throw new Error(`Missing research master: ${masterPath}`);
  }

  const events = readCollection(professionalEventsPath, "events");
  const sources = readCollection(professionalSourcesPath, "sources");
  const rawRows = readXlsxSheet(masterPath, "EVENTS");
  const curationRows = readXlsxSheet(masterPath, "CURATION_LOG");
  const schema = JSON.parse(fs.readFileSync(schemaPath, "utf8"));
  const enrichmentRegistry = JSON.parse(fs.readFileSync(enrichmentPath, "utf8"));
  if (enrichmentRegistry.schema_version !== schema.schema_version) {
    throw new Error(
      `Research enrichment schema mismatch: ${enrichmentRegistry.schema_version}`
    );
  }
  const researchEnrichments = enrichmentRegistry.records.map((record) => ({
    ...record,
    registry_version: enrichmentRegistry.registry_version,
  }));
  const hydraulicEpisodeRegistry = buildHydraulicEpisodeRegistry(events, sources);
  const profiles = buildEventResearchProfiles({
    curationRows,
    events,
    hydraulicEpisodeRegistry,
    rawRows,
    researchEnrichments,
  });
  const audit = buildAudit(schema, profiles, hydraulicEpisodeRegistry);

  fs.mkdirSync(path.dirname(profileOutputPath), { recursive: true });
  fs.writeFileSync(
    profileOutputPath,
    `${JSON.stringify({
      schema_version: schema.schema_version,
      generated_at: audit.generated_at,
      profiles,
    }, null, 2)}\n`
  );
  fs.writeFileSync(auditOutputPath, `${JSON.stringify(audit, null, 2)}\n`);

  return {
    audit,
    auditOutputPath,
    profileOutputPath,
    profiles,
    schema,
  };
}

const invokedPath = process.argv[1] ? path.resolve(process.argv[1]) : null;
const modulePath = path.resolve(fileURLToPath(import.meta.url));

if (invokedPath === modulePath) {
  const result = buildEventResearchArtifacts();

  console.log(JSON.stringify({
    audit: result.auditOutputPath,
    episode_controls: result.audit.summary.events_with_episode_control,
    location_precision: result.audit.summary.events_with_location_precision,
    profiles: result.profiles.length,
    profiles_output: result.profileOutputPath,
    schema_version: result.schema.schema_version,
  }, null, 2));
}
