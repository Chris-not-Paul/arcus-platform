import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import { setTimeout as delay } from "node:timers/promises";
import { buildEventHazardHistoryPilot } from "./build-event-hazard-history-pilot.js";
import { queryIspraLandslideExposure } from "../server/hazard/providers/ispraLandslideProvider.js";
import { queryIngvSeismicExposure } from "../server/hazard/providers/ingvSeismicProvider.js";
import { contextMatchesEvent } from "../src/utils/eventContextResource.js";

const root = path.resolve("outputs/arcus-territorial-review");
const read = async (file) => JSON.parse(await fs.readFile(file, "utf8"));
const write = (file, data) => fs.writeFile(path.join(root, file), `${JSON.stringify(data, null, 2)}\n`);
const { version } = await read("public/data/open-release/manifest.json");
const { events } = await read("public/data/open-release/events.json");
const { version: localVersion } = await read("private-data/open/releases/current.json");
assert.equal(localVersion, version);
assert.deepEqual(events, (await read(`private-data/open/releases/${version}/events.json`)).events);
const previous = await read("public/data/event-context/territorial/index.json");
const historyBefore = await read("public/data/event-context/hazard-history/index.json");
const exact = events.filter((event) => event.exact_location === true);
const approximate = { status: "location_not_precise", queried_at: null };
const resolved = new Set(["available", "no_intersection", "outside_coverage"]);
const floodReleaseId = "ispra-hydraulic-2020-v5";
const now = new Date().toISOString();
const coordinates = ({ latitude, longitude }) => ({ latitude, longitude });
const output = {
  ...previous,
  release: version,
  snapshot_latest_query_at: now,
  caveat: "Official map context at the documented location; not retrospective causal proof, a safety classification or a risk score.",
  sources: {
    ...previous.sources,
    hydraulic: {
      provider: "ISPRA", source_name: "National flood hazard mosaic v5.0 (2020)",
      service_type: "Point intersection with official shapefiles",
      source_url: "https://www.isprambiente.gov.it/it/attivita/suolo-e-territorio/dissesto-idrogeologico/le-alluvioni",
    },
  },
  events: Object.fromEntries(events.map((event) => [
    event.event_id, {
      event_id: event.event_id, coordinates: coordinates(event),
      hydraulic: approximate, landslide: approximate, seismic: approximate,
    },
  ])),
};
const report = { release: version, events: events.length, exact: exact.length,
  approximate: events.length - exact.length, landslideLive: 0, landslideRetained: [],
  landslideUnresolved: [], seismicUnresolved: [], floodChanges: [], landslideChanges: [], seismicChanges: [], historyChanges: [] };

function base(source, status) {
  return {
    status,
    provider_version: source?.provider_version ?? null,
    source_dataset_version: source?.source_dataset_version ?? null,
    queried_at: source?.queried_at ?? null,
  };
}

async function refreshLandslideAndSeismic() {
  let cursor = 0;
  await Promise.all(Array.from({ length: 4 }, async () => {
    while (cursor < exact.length) {
      const event = exact[cursor++];
      const id = event.event_id;
      const item = output.events[id];
      const old = previous.events[id];
      const [land, seismic] = await Promise.all([
        queryIspraLandslideExposure(item.coordinates, {
          bypassCache: true, persistentCache: false, timeoutMs: 9000, retryAttempts: 2,
        }),
        queryIngvSeismicExposure(item.coordinates),
      ]);
      if (land.assessment_complete && land.source?.source_dataset_version === "5.0" && resolved.has(land.status)) {
        item.landslide = {
          ...base(land.source, land.status),
          attention_area: land.attention_area,
          highest_hazard_class: land.highest_hazard_class,
          matched_hazard_classes: land.matched_hazard_classes,
          verification: "live_wfs",
        };
        report.landslideLive++;
      } else if (old && contextMatchesEvent("territorial", old, event) &&
        resolved.has(old.landslide.status) && old.landslide.source_dataset_version === "5.0") {
        item.landslide = { ...old.landslide, verification: "retained_snapshot" };
        report.landslideRetained.push(id);
      } else {
        item.landslide = { ...base(land.source, "service_unreachable"), matched_hazard_classes: [], highest_hazard_class: null };
        report.landslideUnresolved.push({ id, status: land.status });
      }
      item.seismic = {
        ...base(seismic.source, seismic.status),
        pga_p50_g: seismic.pga_p50_g,
        sampling_method: seismic.sampling_method,
      };
      if (!resolved.has(seismic.status)) report.seismicUnresolved.push({ id, status: seismic.status });
      if ((report.landslideLive + report.landslideRetained.length + report.landslideUnresolved.length) % 25 === 0) {
        console.log(`PAI/INGV: ${report.landslideLive + report.landslideRetained.length + report.landslideUnresolved.length}/${exact.length}`);
      }
      await delay(150);
    }
  }));
  return output;
}

await fs.mkdir(root, { recursive: true });
const historical = await buildEventHazardHistoryPilot({
  currentContext: refreshLandslideAndSeismic(),
  outputPath: path.join(root, "history-research.json"),
  publicOutputPath: path.join(root, "history.json"),
});
for (const event of exact) {
  const id = event.event_id;
  const item = output.events[id];
  const observation = historical.events[id].hazards.hydraulic.observations.find((o) => o.release_id === floodReleaseId);
  assert.ok(observation, `Missing official hydraulic map observation: ${id}`);
  item.hydraulic = {
    status: observation.classes.length ? "available" : "no_intersection",
    highest_class: observation.highest_class,
    matched_classes: observation.classes,
    provider_version: "ispra-flood-shapefile",
    source_dataset_version: "v5.0 (2020)",
    queried_at: now,
    minimum_boundary_distance_m: observation.minimum_boundary_distance_m,
    positional_assessment: observation.positional_assessment,
  };
  const old = previous.events[id];
  const different = (a, b) => JSON.stringify(a) !== JSON.stringify(b);
  const change = (before, after) => ({ id, slug: event.event_slug, cause: event.specific_cause, before, after });
  if (different(old?.hydraulic.highest_class, item.hydraulic.highest_class) ||
    different(old?.hydraulic.status, item.hydraulic.status) ||
    different(old?.hydraulic.matched_classes, item.hydraulic.matched_classes)) {
    report.floodChanges.push(change(old?.hydraulic ?? null, item.hydraulic));
  }
  if (different(old?.landslide.highest_hazard_class, item.landslide.highest_hazard_class) ||
    different(old?.landslide.status, item.landslide.status) ||
    different(old?.landslide.matched_hazard_classes, item.landslide.matched_hazard_classes)) {
    report.landslideChanges.push(change(old?.landslide ?? null, item.landslide));
  }
  if (different(old?.seismic.pga_p50_g, item.seismic.pga_p50_g) || different(old?.seismic.status, item.seismic.status)) {
    report.seismicChanges.push(change(old?.seismic ?? null, item.seismic));
  }
  const prior = historyBefore.events[id];
  if (!prior || !contextMatchesEvent("hazard-history", prior, event)) report.historyChanges.push(id);
}
report.boundarySensitive = exact.filter(({ event_id }) => {
  const distance = output.events[event_id].hydraulic.minimum_boundary_distance_m;
  return Number.isFinite(distance) && distance <= 50;
}).map(({ event_id }) => event_id);
const fullyResolved = Object.values(output.events).filter((item) =>
  ["hydraulic", "landslide", "seismic"].every((key) => resolved.has(item[key].status))).length;
output.coverage = { events: events.length, fully_resolved_events: fullyResolved, unresolved_events: events.length - fullyResolved };
await write("territorial.json", output);
await write("report.json", report);
console.log(JSON.stringify(Object.fromEntries(Object.entries(report).map(([key, value]) => [key, Array.isArray(value) ? value.length : value])), null, 2));
