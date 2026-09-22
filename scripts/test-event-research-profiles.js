import assert from "node:assert/strict";
import fs from "node:fs";

import { buildHydraulicEpisodeRegistry } from "../server/collapseEpisodeService.js";
import {
  buildEventResearchProfiles,
  researchFieldValue,
} from "../src/utils/eventResearchProfile.js";
import { readXlsxSheet } from "./lib/xlsx-reader.js";

function readCollection(filePath, key) {
  const data = JSON.parse(fs.readFileSync(filePath, "utf8"));
  return Array.isArray(data) ? data : data[key] || [];
}

const masterPath = "private-data/raw/MASTER_RESEARCH.xlsx";
const events = readCollection(
  "private-data/professional/professional-events.json",
  "events"
);
const sources = readCollection(
  "private-data/professional/professional-sources.json",
  "sources"
);
const rawRows = readXlsxSheet(masterPath, "EVENTS");
const curationRows = readXlsxSheet(masterPath, "CURATION_LOG");
const enrichmentRegistry = JSON.parse(
  fs.readFileSync("config/research/event-research-enrichment-v1.json", "utf8")
);
const researchSchema = JSON.parse(
  fs.readFileSync("config/research/event-research-schema.json", "utf8")
);
const schemaByPath = new Map(
  researchSchema.fields.map((field) => [`${field.group}.${field.key}`, field])
);
const knownEventIds = new Set(events.map((event) => event.research_event_id));

assert.equal(
  new Set(enrichmentRegistry.records.map((record) => record.event_id)).size,
  enrichmentRegistry.records.length,
  "Research enrichment records must have unique event identifiers."
);
enrichmentRegistry.records.forEach((record) => {
  assert.ok(knownEventIds.has(record.event_id), `Unknown enrichment event: ${record.event_id}`);
  assert.equal(record.review_status, "source_backed_pending_domain_review");

  Object.entries(record.fields).forEach(([fieldPath, entry]) => {
    const field = schemaByPath.get(fieldPath);
    assert.ok(field, `Unknown research enrichment field: ${fieldPath}`);
    assert.ok(["documented", "reported", "inferred_reviewed"].includes(entry.evidence_state));
    assert.ok(Array.isArray(entry.sources) && entry.sources.length > 0);
    entry.sources.forEach((source) => {
      assert.ok(source.title);
      assert.ok(source.locator);
      assert.ok(source.url.startsWith("https://"));
    });

    if (field.allowed_values) {
      assert.ok(
        field.allowed_values.includes(entry.value),
        `${fieldPath} has a value outside the controlled vocabulary.`
      );
    }
    if (["positive_integer", "non_negative_integer"].includes(field.type)) {
      assert.equal(Number.isInteger(entry.value), true);
    }
    if (["positive_number", "non_negative_number"].includes(field.type)) {
      assert.equal(Number.isFinite(entry.value), true);
    }
    if (field.type === "boolean") assert.equal(typeof entry.value, "boolean");
    if (field.type === "iso_date") assert.match(entry.value, /^\d{4}-\d{2}-\d{2}$/);
  });
});
const registry = buildHydraulicEpisodeRegistry(events, sources);
const profiles = buildEventResearchProfiles({
  curationRows,
  events,
  hydraulicEpisodeRegistry: registry,
  rawRows,
  researchEnrichments: enrichmentRegistry.records.map((record) => ({
    ...record,
    registry_version: enrichmentRegistry.registry_version,
  })),
});

assert.equal(profiles.length, events.length);
assert.equal(new Set(profiles.map((profile) => profile.event_id)).size, events.length);
assert.equal(
  profiles.filter((profile) => researchFieldValue(profile, "location_precision")).length,
  events.length
);
assert.equal(
  profiles.filter((profile) => researchFieldValue(profile, "bridge_length_m") !== null).length,
  157
);
assert.equal(
  profiles.filter((profile) => researchFieldValue(profile, "piers_in_active_riverbed") !== null).length,
  154
);
assert.equal(
  profiles.filter((profile) => researchFieldValue(profile, "episode_id")).length,
  217
);
assert.equal(
  profiles.filter((profile) => researchFieldValue(profile, "span_configuration")).length,
  4
);
assert.equal(
  profiles.filter((profile) => researchFieldValue(profile, "span_count")).length,
  3
);
assert.equal(
  profiles.filter((profile) => researchFieldValue(profile, "maximum_span_m")).length,
  2
);
assert.equal(
  profiles.filter((profile) => researchFieldValue(profile, "recovery_action")).length,
  4
);

const morandi = profiles.find((profile) => profile.event_id === "IT18.08.01");
assert.equal(morandi.bridge_configuration.span_count.value, 11);
assert.equal(
  morandi.pre_collapse_management.documented_warning_before_collapse.value,
  true
);
assert.equal(morandi.enrichment_summary.review_status, "source_backed_pending_domain_review");
assert.ok(
  morandi.bridge_configuration.span_count.provenance.sources[0].url.startsWith("https://")
);

const himera = profiles.find((profile) => profile.event_id === "IT15.04.01");
assert.equal(himera.bridge_configuration.span_count.value, 41);
assert.equal(himera.consequences_and_recovery.reopening_date.value, "2020-07-31");

const albiano = profiles.find((profile) => profile.event_id === "IT20.04.02");
assert.equal(albiano.bridge_configuration.span_count.value, 5);
assert.equal(albiano.bridge_configuration.foundation_type.value, null);
assert.equal(albiano.bridge_configuration.foundation_type.missing_state, "not_assessed");
assert.match(
  albiano.pre_collapse_management.prior_intervention_summary.value,
  /1949/
);

const grouped = profiles.find(
  (profile) => profile.record_precision.location_precision.value === "grouped_collective_location"
);
assert.ok(grouped);
assert.equal(grouped.record_precision.location_precision.evidence_state, "documented");

const geometry = profiles.find(
  (profile) => profile.bridge_configuration.bridge_length_m.value !== null
);
assert.ok(geometry.bridge_configuration.bridge_length_m.provenance?.source_record_id);
assert.equal(geometry.bridge_configuration.span_count.value, null);
assert.equal(geometry.bridge_configuration.span_count.missing_state, "not_assessed");

const withCuration = profiles.find(
  (profile) => profile.provenance_summary.curation_entry_count > 0
);
assert.ok(withCuration);
assert.ok(withCuration.provenance_summary.latest_curation_date);
assert.equal(
  "rationale" in withCuration.provenance_summary,
  false,
  "Internal curation rationale must not leak into the research profile."
);

console.log(JSON.stringify({
  episode_profiles: profiles.filter((profile) => profile.event_episode).length,
  geometry_profiles: profiles.filter(
    (profile) => profile.bridge_configuration.bridge_length_m.value !== null
  ).length,
  enriched_profiles: profiles.filter((profile) => profile.enrichment_summary).length,
  profiles: profiles.length,
  status: "passed",
}, null, 2));
