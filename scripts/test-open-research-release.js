import assert from "node:assert/strict";
import fs from "node:fs";

import {
  getOpenDownload,
  getOpenEvents,
  getOpenResource,
  getOpenSources,
  getProfessionalResource,
} from "../server/dataService.js";
import {
  HYDRAULIC_MATCHER_BLOCKED_FIELDS,
} from "../src/utils/hydraulicIntelligence.js";
import {
  HYDRAULIC_GEOMETRY_SOURCE_URL,
} from "../src/utils/hydraulicGeometry.js";

const checks = [];

async function check(name, assertion) {
  await assertion();
  checks.push(name);
}

const events = await getOpenEvents();
const sources = await getOpenSources();
const manifest = await getOpenResource("manifest");
const taxonomy = await getOpenResource("taxonomy");
const audit = await getOpenResource("quality-audit");
const idMapping = await getOpenResource("id-mapping");
const professionalEvents = await getProfessionalResource("professional-events");
const professionalSources = await getProfessionalResource("professional-sources");
const professionalEventRows = Array.isArray(professionalEvents)
  ? professionalEvents
  : professionalEvents.events || [];
const professionalSourceRows = Array.isArray(professionalSources)
  ? professionalSources
  : professionalSources.sources || [];

await check("open-counts", () => {
  assert.equal(events.length, 263);
  assert.equal(sources.length, 712);
  assert.equal(manifest.event_count, 263);
  assert.equal(manifest.source_count, 712);
});

await check("professional-hydraulic-geometry-is-source-backed-and-private", () => {
  const geometryEvents = professionalEventRows.filter(
    (event) => event.hydraulic_geometry
  );
  const sourceRecordIds = geometryEvents.map(
    (event) => event.hydraulic_geometry.provenance.source_record_id
  );

  assert.equal(geometryEvents.length, 158);
  assert.equal(
    geometryEvents.filter(
      (event) => event.hydraulic_geometry.bridge_length_m !== null
    ).length,
    158
  );
  assert.equal(
    geometryEvents.filter(
      (event) => event.hydraulic_geometry.piers_in_active_riverbed !== null
    ).length,
    155
  );
  assert.equal(new Set(sourceRecordIds).size, sourceRecordIds.length);
  assert.equal(
    geometryEvents.every(
      (event) =>
        event.hydraulic_geometry.provenance.source_url ===
        HYDRAULIC_GEOMETRY_SOURCE_URL
    ),
    true
  );
  assert.equal(
    events.every((event) => !Object.hasOwn(event, "hydraulic_geometry")),
    true
  );
});

await check("versioned-release-and-fingerprint", () => {
  assert.equal(manifest.version, "arcus-open-2026.2");
  assert.match(manifest.source_workbook_fingerprint, /^sha256:[a-f0-9]{64}$/);
  assert.equal(manifest.schema_version, "arcus-open-schema-v2");
});

await check("complete-source-integrity", () => {
  const eventIds = new Set(events.map((event) => event.event_id));
  const sourceEventIds = new Set(sources.map((source) => source.event_id));
  assert.equal(events.every((event) => sourceEventIds.has(event.event_id)), true);
  assert.equal(sources.every((source) => eventIds.has(source.event_id)), true);
  assert.equal(new Set(events.map((event) => event.event_id)).size, events.length);
  assert.equal(new Set(events.map((event) => event.event_slug)).size, events.length);
  assert.equal(new Set(sources.map((source) => source.source_id)).size, sources.length);
});

await check("canonical-it-identifiers-and-legacy-mapping", () => {
  assert.equal(events.every((event) => /^IT\d{2}\.\d{2}\.\d{2}$/.test(event.event_id)), true);
  assert.equal(events.every((event) => !Object.hasOwn(event, "research_event_id")), true);
  assert.equal(sources.every((source) => !Object.hasOwn(source, "research_event_id")), true);
  assert.equal(idMapping.mappings.length, events.length);
  assert.equal(idMapping.mappings.every((item) =>
    item.legacy_event_id === `B${item.event_id.slice(2)}` && item.legacy_compatible
  ), true);
  assert.equal(audit.id_mapping.every((item) => item.legacy_compatible), true);
});

await check("taxonomy-and-evidence-classes", () => {
  assert.equal(taxonomy.taxonomy.length, 20);
  assert.equal(events.filter((event) => event.failure_cause_evidence === "Needs review").length, 8);
  assert.equal(events.filter((event) => event.failure_process).length, 172);
  assert.equal(events.filter((event) => event.component_involved).length, 166);
  assert.equal(
    events.filter((event) => event.failure_process === null)
      .every((event) => event.hydraulic_intelligence?.failure_process === null || !event.hydraulic_intelligence),
    true
  );
});

await check("url-reference-separation", () => {
  assert.equal(sources.every((source) => !source.source_url || /^https?:\/\//.test(source.source_url)), true);
  assert.equal(sources.filter((source) => source.source_reference).length, 8);
});

await check("territorial-audit", () => {
  assert.equal(audit.status, "passed");
  assert.equal(audit.errors.length, 0);
  assert.equal(audit.territorial_warnings.some((item) => item.province_raw === "Ivrea"), true);
  assert.equal(audit.territorial_warnings.some((item) => item.province_raw === "Caltanisetta"), true);
});

await check("open-contains-no-private-customer-fields", () => {
  const forbidden = ["password", "session", "customer_id", "workspace_id", "ranking", "final_priority_index"];
  assert.equal(events.every((event) => forbidden.every((field) => !Object.hasOwn(event, field))), true);
  assert.equal(sources.every((source) => !Object.hasOwn(source, "notes")), true);
});

await check("professional-is-decoupled-live-resource", () => {
  assert.notEqual(professionalEvents.events, events);
  assert.equal(professionalEventRows.length >= 263, true);
  assert.equal(professionalSourceRows.length >= 712, true);
  assert.equal(manifest.access, "public_read_only_no_account_required");
});

await check("open-is-subset-of-professional", () => {
  const professionalEventIds = new Set(professionalEventRows.map((event) => event.event_id));
  const professionalSourceIds = new Set(professionalSourceRows.map((source) => source.source_id));

  assert.equal(events.every((event) => professionalEventIds.has(`B${event.event_id.slice(2)}`)), true);
  assert.equal(sources.every((source) => professionalSourceIds.has(source.source_id)), true);
});

await check("shared-public-fields-match", () => {
  const professionalByEvent = new Map(professionalEventRows.map((event) => [event.event_id, event]));
  const professionalBySource = new Map(professionalSourceRows.map((source) => [source.source_id, source]));

  events.forEach((event) => {
    const professional = professionalByEvent.get(`B${event.event_id.slice(2)}`);
    Object.keys(event).forEach((field) => {
      if (field === "event_id") {
        return;
      }
      if (field === "hydraulic_intelligence" && professional.hydraulic_outcome_curation) {
        assert.deepEqual(
          professional.hydraulic_outcome_curation.previous_hydraulic_intelligence,
          event[field]
        );
        return;
      }
      assert.deepEqual(professional[field], event[field]);
    });
  });
  sources.forEach((source) => {
    const professional = professionalBySource.get(source.source_id);
    Object.keys(source).forEach((field) => {
      if (field !== "event_id") {
        assert.deepEqual(professional[field], source[field]);
      }
    });
  });
});

await check("professional-source-integrity", () => {
  const eventIds = new Set(professionalEventRows.map((event) => event.event_id));
  const sourceEventIds = new Set(professionalSourceRows.map((source) => source.event_id));
  assert.equal(new Set(professionalSourceRows.map((source) => source.source_id)).size, professionalSourceRows.length);
  assert.equal(professionalSourceRows.every((source) => eventIds.has(source.event_id)), true);
  assert.equal(professionalEventRows.every((event) => sourceEventIds.has(event.event_id)), true);
  assert.equal(
    professionalSourceRows.every((source) =>
      source.source_url || source.source_reference || source.source_title
    ),
    true
  );
});

await check("professional-can-advance-without-mutating-open", () => {
  const openIdsBefore = events.map((event) => event.event_id);
  const hypotheticalLiveIds = new Set([
    ...professionalEventRows.map((event) => `IT${event.event_id.slice(1)}`),
    "IT99.99.99",
  ]);

  assert.equal(openIdsBefore.every((eventId) => hypotheticalLiveIds.has(eventId)), true);
  assert.deepEqual(events.map((event) => event.event_id), openIdsBefore);
});

await check("hydraulic-outcomes-public-and-blocked-from-retrieval", () => {
  assert.equal(events.some((event) => event.hydraulic_intelligence), true);
  [
    "failure_trigger",
    "failure_process",
    "component_involved",
    "failure_cause_evidence",
    "hydraulic_intelligence",
  ].forEach((field) => assert.equal(HYDRAULIC_MATCHER_BLOCKED_FIELDS.includes(field), true));
});

await check("frontend-product-boundary", () => {
  const atlas = fs.readFileSync("src/pages/AtlasPage.jsx", "utf8");
  const analytics = fs.readFileSync("src/pages/PremiumAnalyticsPage.jsx", "utf8");
  const dataAccess = fs.readFileSync("src/pages/DataAccessPage.jsx", "utf8");
  const home = fs.readFileSync("src/pages/HomePage.jsx", "utf8");
  const popup = fs.readFileSync("src/components/popup/EventPopup.jsx", "utf8");
  const app = fs.readFileSync("src/App.jsx", "utf8");
  assert.match(atlas, /professionalResource\("professional-events"\)/);
  assert.match(atlas, /professionalResource\("professional-sources"\)/);
  assert.match(atlas, /openEvents\(\)/);
  assert.match(atlas, /setEvents\(\[\]\);[\s\S]*setSources\(\[\]\);[\s\S]*setOpenRelease\(null\);/);
  assert.match(analytics, /professionalResource\("professional-events"\)/);
  assert.doesNotMatch(analytics, /openEvents\(\)/);
  assert.match(app, /<ProfessionalGate>[\s\S]*<PremiumAnalyticsPage/);
  assert.match(popup, /source\.source_url \? \(/);
  assert.match(popup, /source\.source_reference/);
  assert.doesNotMatch(popup, /href=\{source\.source_reference\}/);
  assert.match(popup, /Documented historical outcome/);
  assert.match(atlas, /searchParams\.get\("event"\)/);
  assert.match(atlas, /focusedEvent=\{focusedEvent\}/);
  assert.doesNotMatch(atlas, /to="\/atlas\?mode=professional"/);
  assert.match(home, /to="\/data-access"/);
  [
    "sources",
    "manifest",
    "dataDictionary",
    "taxonomy",
    "qualityAudit",
    "statistics",
    "changelog",
  ].forEach((resource) => {
    assert.match(dataAccess, new RegExp(`openResourceUrls\\.${resource}`));
  });
});

await check("api-resource-and-auth-boundary", () => {
  const dataService = fs.readFileSync("server/dataService.js", "utf8");
  const server = fs.readFileSync("server/server.js", "utf8");
  const professionalRouteStart = server.indexOf('"/api/professional/resources"');
  const openBlock = server.slice(
    server.indexOf('url.pathname === "/api/open/events"'),
    professionalRouteStart
  );
  const professionalBlock = server.slice(professionalRouteStart);

  assert.match(dataService, /\["professional-sources", "professional-sources\.json"\]/);
  assert.doesNotMatch(dataService, /\["professional-sources", "\.\.\/processed\/sources\.json"\]/);
  assert.match(dataService, /fs\.readFile\(currentPath, "utf8"\)/);
  assert.doesNotMatch(dataService, /readJsonFromAbsolutePath\(path\.join\(releaseRoot, "current\.json"\)\)/);
  assert.doesNotMatch(openBlock, /isProfessionalRequestAuthorized/);
  assert.match(professionalBlock, /isProfessionalRequestAuthorized\(request, "professional:read"\)/);
});

await check("professional-analytics-do-not-read-processed-data", () => {
  [
    "scripts/analyze-collapse-intelligence.js",
    "scripts/analyze-hazard-gated-collapse-intelligence.js",
    "scripts/build-collapse-hazard-signatures.js",
    "scripts/red-team-collapse-intelligence.js",
  ].forEach((filePath) => {
    const script = fs.readFileSync(filePath, "utf8");
    assert.doesNotMatch(script, /private-data["',\s]+processed["',\s]+(events|sources)/);
  });
});

await check("workbook-not-served", () => {
  const server = fs.readFileSync("server/server.js", "utf8");
  assert.doesNotMatch(server, /MASTER_RESEARCH\.xlsx/);
  assert.doesNotMatch(server, /private-data\/raw/);
});

await check("downloads", async () => {
  const csv = await getOpenDownload("csv");
  const geojson = await getOpenDownload("geojson");
  assert.match(csv.content.toString("utf8").split("\n", 1)[0], /event_id/);
  assert.match(csv.content.toString("utf8").split("\n")[1], /"IT\d{2}\.\d{2}\.\d{2}"/);
  const parsed = JSON.parse(geojson.content.toString("utf8"));
  assert.equal(parsed.type, "FeatureCollection");
  assert.equal(parsed.features.length, 263);
  assert.equal(parsed.features.every((feature) => /^IT\d{2}\.\d{2}\.\d{2}$/.test(feature.id)), true);
});

console.log(JSON.stringify({ checks, ok: true }, null, 2));
