import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import { setTimeout as delay } from "node:timers/promises";
import { contextMatchesEvent } from "../src/utils/eventContextResource.js";
import { calendarOffset, rainfallChronology } from "../src/utils/rainfallChronology.js";
import { assessEventRainfallQuality } from "./lib/event-rainfall-quality.js";

const root = "public/data/event-context/rainfall";
const pilot = process.argv.includes("--pilot");
const output = path.resolve(`outputs/arcus-rainfall-${pilot ? "pilot" : "review"}`);
const read = async (file) => JSON.parse(await fs.readFile(file, "utf8"));
const write = (file, value) => fs.writeFile(file, `${JSON.stringify(value, null, 2)}\n`);
const original = await read(path.join(root, "index.json"));
const { events } = await read("public/data/open-release/events.json");
const pilotIds = new Set(["IT23.05.03", "IT23.05.04"]);
const wanted = events.filter((e) => e.specific_cause === "Hydraulic" && (!pilot || pilotIds.has(e.event_id)));
const index = { ...original, events: {} };
const report = { reviewed: wanted.length, retained: [], refreshed: [], reusedPilot: [], unresolved: [], failed: [] };
const sum = (rows) => Number(rows.reduce((total, row) => total + row.precipitation_mm, 0).toFixed(1));
const arpaeReport = "https://www.arpae.it/it/notizie/rapporto_idro_meteo_20230516-18.pdf";

function km(a, b) {
  const rad = Math.PI / 180;
  const h = Math.sin((b.latitude - a.latitude) * rad / 2) ** 2 +
    Math.cos(a.latitude * rad) * Math.cos(b.latitude * rad) *
    Math.sin((b.longitude - a.longitude) * rad / 2) ** 2;
  return Number((12742 * Math.asin(Math.min(1, Math.sqrt(h)))).toFixed(1));
}

async function reconstruct(event, chronology, previous) {
  const start = calendarOffset(chronology.start, -13);
  const end = chronology.end;
  const model = end <= "2021-06-30" ? "cerra" : "era5";
  const dataset = model === "cerra" ? "CERRA" : "ERA5";
  const requested = { latitude: event.latitude, longitude: event.longitude };
  const query = new URLSearchParams({
    ...requested, start_date: start, end_date: end, daily: "precipitation_sum", models: model, timezone: "Europe/Rome",
  });
  const url = `https://archive-api.open-meteo.com/v1/archive?${query}`;
  const response = await fetch(url, { signal: AbortSignal.timeout(18000) });
  if (!response.ok) throw new Error(`Open-Meteo HTTP ${response.status}`);
  const payload = await response.json();
  const expectedDays = Math.round((Date.parse(end) - Date.parse(start)) / 86400000) + 1;
  const times = payload.daily?.time;
  const values = payload.daily?.precipitation_sum;
  assert.equal(payload.daily_units?.precipitation_sum, "mm");
  assert.equal(payload.timezone, "Europe/Rome");
  assert.equal(times?.length, expectedDays);
  assert.equal(values?.length, expectedDays);
  assert.ok(times.every((d, i) => d === calendarOffset(start, i)), "Missing or unordered calendar days");
  assert.ok(values.every((v) => Number.isFinite(v) && v >= 0), "Invalid precipitation values");
  assert.ok(Number.isFinite(payload.latitude) && Number.isFinite(payload.longitude), "Missing model grid location");
  const daily = times.map((date, i) => ({ date, precipitation_mm: Number(values[i].toFixed(1)) }));
  const throughReference = daily.filter((row) => row.date <= chronology.start);
  const aggregates = {
    event_calendar_day_mm: throughReference.at(-1).precipitation_mm,
    event_and_previous_2_days_mm: sum(throughReference.slice(-3)),
    event_and_previous_6_days_mm: sum(throughReference.slice(-7)),
    full_period_mm: sum(daily),
  };
  const source = {
    attribution_url: "https://open-meteo.com/", provider: "Open-Meteo",
    upstream_provider: "Copernicus Climate Change Service / ECMWF", upstream_url: "https://cds.climate.copernicus.eu/",
    coverage: model === "cerra" ? "1985-01-01/2021-06-30" : "1940-present",
    dataset, model_key: model, resolution_km: model === "cerra" ? 5.5 : 25,
    product_type: "reanalysis", licence: "CC BY 4.0",
  };
  // Prior hand-reviewed warnings remain conservative; never copy a numerical rationale
  // to a refreshed grid cell or calendar window.
  let quality = assessEventRainfallQuality({ eventId: null, aggregates, source });
  if (pilotIds.has(event.event_id)) quality = {
    ...quality, status: "regional_report_available", severity: "context",
    rationale_it: "Arpae documenta l’episodio di piena del 16–18 maggio. Il rapporto regionale non è una misura alla cella del ponte e non stabilisce il giorno esatto del cedimento.",
    rationale_en: "Arpae documents the 16–18 May flood episode. The regional report is not a measurement at the bridge grid cell and does not establish the exact failure day.",
    supporting_sources: [arpaeReport],
  };
  else if (["reanalysis_not_representative", "event_chronology_review_required"].includes(previous?.quality_assessment?.status)) {
    quality = {
      ...previous.quality_assessment, assessment_input: undefined,
      rationale_it: "La serie è stata aggiornata, ma la rappresentatività della cella o la cronologia richiedono ancora una verifica documentale.",
      rationale_en: "The series was refreshed, but grid representativeness or event chronology still requires documentary review.",
    };
  }
  const grid = { latitude: payload.latitude, longitude: payload.longitude, elevation_m: payload.elevation ?? null };
  return {
    schema_version: "arcus-event-rainfall-context-v1", event_id: event.event_id, event_date: event.date,
    status: "context_available", requested_location: requested, grid_location: { ...grid, distance_from_event_km: km(requested, grid) },
    period: { start_date: start, end_date: end, timezone: payload.timezone }, daily, aggregates, source,
    quality_assessment: quality,
    provenance: {
      retrieval_url: url, retrieved_at: new Date().toISOString(),
      transformation: "Daily values retained; 1/3/7-day aggregates end on the recorded reference date. The full-period aggregate includes all plotted dates.",
    },
    caveats: [
      "Reanalysis grid-cell estimate, not an observation at the bridge or a catchment average.",
      "Calendar days are used; the collapse time is not known.",
      "Meteorological context does not prove collapse causation.",
    ],
  };
}

await fs.mkdir(output, { recursive: true });
const completed = await Promise.all(wanted.map(async (event) => {
  const id = event.event_id;
  const entry = original.events[id];
  const previous = entry ? await read(path.join(root, entry.file)) : null;
  const chronology = rainfallChronology(event);
  const matches = previous && contextMatchesEvent("rainfall", previous, event);
  if (!pilotIds.has(id) && matches && (previous.daily.at(-1).date >= chronology.end || event.exact_location !== true)) {
    report.retained.push(id);
    return [id, previous];
  }
  if (event.exact_location !== true || !Number.isFinite(event.latitude) || !Number.isFinite(event.longitude)) {
    report.unresolved.push({ id, reason: "approximate_location" });
    return null;
  }
  if (!pilot && pilotIds.has(id)) {
    const c = await read(`outputs/arcus-rainfall-pilot/${id}.json`);
    assert.ok(contextMatchesEvent("rainfall", c, event) && c.daily.at(-1).date >= chronology.end);
    report.reusedPilot.push(id);
    return [id, c];
  }
  return { id, event, chronology, previous };
}));
const jobs = completed.filter((item) => item && !Array.isArray(item));
const rows = completed.filter(Array.isArray);
let cursor = 0;
await Promise.all(Array.from({ length: Math.min(3, jobs.length) }, async () => {
  while (cursor < jobs.length) {
    const { id, event, chronology, previous } = jobs[cursor++];
    try {
      const context = await reconstruct(event, chronology, previous);
      assert.ok(contextMatchesEvent("rainfall", context, event));
      rows.push([id, context]);
      report.refreshed.push(id);
    } catch (error) {
      report.failed.push({ id, reason: error.cause?.code || error.message });
    }
    await delay(300);
  }
}));
const qualityCounts = {};
for (const [id, context] of rows.sort(([a], [b]) => a.localeCompare(b))) {
  await write(path.join(output, `${id}.json`), context);
  index.events[id] = { dataset: context.source.dataset, event_date: context.event_date, file: `${id}.json`, product_type: context.source.product_type, status: context.status };
  const status = context.quality_assessment.status;
  qualityCounts[status] = (qualityCounts[status] || 0) + 1;
}
index.updated_at = new Date().toISOString();
index.quality_assessment = { assessed_events: rows.length, counts: qualityCounts, method: "Reanalysis scope and documentary checks" };
await write(path.join(output, "index.json"), index);
await write(path.join(output, "report.json"), report);
console.log(JSON.stringify({
  output, reviewed: wanted.length, ready: rows.length, retained: report.retained.length,
  refreshed: report.refreshed.length, reusedPilot: report.reusedPilot.length, unresolved: report.unresolved.length, failed: report.failed,
}, null, 2));
if (report.failed.length) process.exitCode = 1;
