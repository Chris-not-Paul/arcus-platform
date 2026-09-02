import fs from "node:fs";
import path from "node:path";
import { assessEventRainfallQuality } from "./lib/event-rainfall-quality.js";

const ROOT = process.cwd();
const EVENTS_PATH = path.join(
  ROOT,
  "private-data",
  "professional",
  "professional-events.json"
);
const OUTPUT_ROOT = path.join(
  ROOT,
  "public",
  "data",
  "event-context",
  "rainfall"
);
const ALLOWED_MODELS = new Map([
  [
    "cerra",
    {
      coverage: "1985-01-01/2021-06-30",
      dataset: "CERRA",
      resolutionKm: 5.5,
    },
  ],
  [
    "era5",
    {
      coverage: "1940-present",
      dataset: "ERA5",
      resolutionKm: 25,
    },
  ],
]);

function argument(name) {
  const prefix = `--${name}=`;
  const inline = process.argv.find((value) => value.startsWith(prefix));

  if (inline) {
    return inline.slice(prefix.length);
  }

  const index = process.argv.indexOf(`--${name}`);
  return index >= 0 ? process.argv[index + 1] : null;
}

function publicEventId(value) {
  return String(value || "").replace(/^B(?=\d)/, "IT");
}

function dateOffset(value, days) {
  const date = new Date(`${value}T00:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

function roundedSum(values) {
  return Number(
    values.reduce((sum, value) => sum + (Number(value) || 0), 0).toFixed(1)
  );
}

function distanceKm(first, second) {
  const radius = 6371;
  const radians = (degrees) => (degrees * Math.PI) / 180;
  const deltaLatitude = radians(second.latitude - first.latitude);
  const deltaLongitude = radians(second.longitude - first.longitude);
  const latitudeA = radians(first.latitude);
  const latitudeB = radians(second.latitude);
  const a =
    Math.sin(deltaLatitude / 2) ** 2 +
    Math.cos(latitudeA) *
      Math.cos(latitudeB) *
      Math.sin(deltaLongitude / 2) ** 2;

  return Number((2 * radius * Math.asin(Math.sqrt(a))).toFixed(1));
}

function readEvents() {
  const payload = JSON.parse(fs.readFileSync(EVENTS_PATH, "utf8"));
  return Array.isArray(payload) ? payload : payload.events || [];
}

function buildIndexEntry(context) {
  return {
    dataset: context.source.dataset,
    event_date: context.event_date,
    file: `${context.event_id}.json`,
    product_type: context.source.product_type,
    status: context.status,
  };
}

async function main() {
  const requestedId = publicEventId(argument("event"));
  const modelKey = String(argument("model") || "").toLowerCase();
  const days = Math.max(7, Math.min(31, Number(argument("days") || 14)));
  const model = ALLOWED_MODELS.get(modelKey);

  if (!requestedId || !model) {
    throw new Error(
      "Usage: npm run build:event-weather-context -- --event ITxx.xx.xx --model cerra|era5 [--days 14]"
    );
  }

  const event = readEvents().find(
    (candidate) => publicEventId(candidate.event_id) === requestedId
  );

  if (!event) {
    throw new Error(`Unknown event: ${requestedId}`);
  }

  if (!event.date || !Number.isFinite(Number(event.latitude)) || !Number.isFinite(Number(event.longitude))) {
    throw new Error(`Event ${requestedId} lacks a usable date or coordinate`);
  }

  const startDate = dateOffset(event.date, -(days - 1));
  const query = new URLSearchParams({
    daily: "precipitation_sum",
    end_date: event.date,
    latitude: String(event.latitude),
    longitude: String(event.longitude),
    models: modelKey,
    start_date: startDate,
    timezone: "Europe/Rome",
  });
  const retrievalUrl = `https://archive-api.open-meteo.com/v1/archive?${query}`;
  const response = await fetch(retrievalUrl, {
    headers: {
      "User-Agent": "ARCUS-event-context-builder/1.0",
    },
  });

  if (!response.ok) {
    throw new Error(`Weather provider returned ${response.status}`);
  }

  const payload = await response.json();
  const times = payload.daily?.time || [];
  const precipitation = payload.daily?.precipitation_sum || [];

  if (
    times.length !== days ||
    precipitation.length !== days ||
    precipitation.some((value) => !Number.isFinite(Number(value)))
  ) {
    throw new Error(
      `${model.dataset} did not return a complete ${days}-day precipitation series for ${requestedId}`
    );
  }

  const daily = times.map((date, index) => ({
    date,
    precipitation_mm: Number(Number(precipitation[index]).toFixed(1)),
  }));
  const values = daily.map((item) => item.precipitation_mm);
  const requestedLocation = {
    latitude: Number(event.latitude),
    longitude: Number(event.longitude),
  };
  const gridLocation = {
    elevation_m: Number(payload.elevation),
    latitude: Number(payload.latitude),
    longitude: Number(payload.longitude),
  };
  const context = {
    schema_version: "arcus-event-rainfall-context-v1",
    event_id: requestedId,
    event_date: event.date,
    status: "context_available",
    requested_location: requestedLocation,
    grid_location: {
      ...gridLocation,
      distance_from_event_km: distanceKm(requestedLocation, gridLocation),
    },
    period: {
      end_date: event.date,
      start_date: startDate,
      timezone: payload.timezone || "Europe/Rome",
    },
    daily,
    aggregates: {
      event_calendar_day_mm: roundedSum(values.slice(-1)),
      event_and_previous_2_days_mm: roundedSum(values.slice(-3)),
      event_and_previous_6_days_mm: roundedSum(values.slice(-7)),
      full_period_mm: roundedSum(values),
    },
    source: {
      attribution_url: "https://open-meteo.com/",
      coverage: model.coverage,
      dataset: model.dataset,
      licence: "CC BY 4.0",
      model_key: modelKey,
      product_type: "reanalysis",
      provider: "Open-Meteo",
      resolution_km: model.resolutionKm,
      upstream_provider: "Copernicus Climate Change Service / ECMWF",
      upstream_url: "https://cds.climate.copernicus.eu/",
    },
    quality_assessment: assessEventRainfallQuality({
      aggregates: {
        event_calendar_day_mm: roundedSum(values.slice(-1)),
        event_and_previous_2_days_mm: roundedSum(values.slice(-3)),
        event_and_previous_6_days_mm: roundedSum(values.slice(-7)),
      },
      eventId: requestedId,
      source: {
        dataset: model.dataset,
        resolution_km: model.resolutionKm,
      },
    }),
    provenance: {
      retrieved_at: new Date().toISOString(),
      retrieval_url: retrievalUrl,
      transformation: "Daily values retained; ARCUS sums include the event calendar day.",
    },
    caveats: [
      "Reanalysis estimate at the nearest model grid cell; not a rain-gauge observation at the bridge.",
      "The collapse time is unavailable, therefore accumulations use calendar days rather than rolling event-time windows.",
      "Meteorological context does not prove collapse causation.",
    ],
  };

  fs.mkdirSync(OUTPUT_ROOT, { recursive: true });
  fs.writeFileSync(
    path.join(OUTPUT_ROOT, `${requestedId}.json`),
    `${JSON.stringify(context, null, 2)}\n`
  );

  const indexPath = path.join(OUTPUT_ROOT, "index.json");
  const index = fs.existsSync(indexPath)
    ? JSON.parse(fs.readFileSync(indexPath, "utf8"))
    : {
        schema_version: "arcus-event-rainfall-index-v1",
        events: {},
      };
  index.events[requestedId] = buildIndexEntry(context);
  index.updated_at = context.provenance.retrieved_at;
  fs.writeFileSync(indexPath, `${JSON.stringify(index, null, 2)}\n`);

  console.log(
    `Built ${model.dataset} rainfall context for ${requestedId}: ${context.aggregates.event_calendar_day_mm} mm on event day`
  );
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
