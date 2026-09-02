import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const EVENTS_PATH = path.join(
  ROOT,
  "private-data",
  "professional",
  "professional-events.json"
);
const INDEX_PATH = path.join(
  ROOT,
  "public",
  "data",
  "event-context",
  "rainfall",
  "index.json"
);
const BUILDER_PATH = path.join(ROOT, "scripts", "build-event-weather-context.js");

function argument(name, fallback = null) {
  const prefix = `--${name}=`;
  const inline = process.argv.find((value) => value.startsWith(prefix));
  if (inline) return inline.slice(prefix.length);
  const index = process.argv.indexOf(`--${name}`);
  return index >= 0 ? process.argv[index + 1] : fallback;
}

function publicEventId(value) {
  return String(value || "").replace(/^B(?=\d)/, "IT");
}

function sleep(milliseconds) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

const eventResource = JSON.parse(fs.readFileSync(EVENTS_PATH, "utf8"));
const events = Array.isArray(eventResource)
  ? eventResource
  : eventResource.events || [];
const index = fs.existsSync(INDEX_PATH)
  ? JSON.parse(fs.readFileSync(INDEX_PATH, "utf8"))
  : { events: {} };
const model = String(argument("model", "cerra")).toLowerCase();
const days = Math.max(7, Math.min(31, Number(argument("days", 14))));
const delayMs = Math.max(0, Number(argument("delay-ms", 250)));
const requestedLimit = Number(argument("limit", Number.POSITIVE_INFINITY));
const coverageEnd = model === "cerra" ? "2021-06-30" : "9999-12-31";
const coverageStart = model === "cerra" ? "1985-01-01" : "1940-01-01";

const candidates = events
  .filter(
    (event) =>
      (event.hydraulic_intelligence || event.specific_cause === "Hydraulic") &&
      event.exact_location === true &&
      Number.isFinite(event.latitude) &&
      Number.isFinite(event.longitude) &&
      /^\d{4}-\d{2}-\d{2}$/.test(String(event.date || "")) &&
      event.date >= coverageStart &&
      event.date <= coverageEnd
  )
  .map((event) => ({
    date: event.date,
    eventId: publicEventId(event.event_id),
    sourceConfidence: event.source_confidence,
  }))
  .filter((event) => !index.events?.[event.eventId])
  .sort((left, right) => {
    const rank = { High: 0, Medium: 1, Low: 2 };
    return (
      (rank[left.sourceConfidence] ?? 3) - (rank[right.sourceConfidence] ?? 3) ||
      right.date.localeCompare(left.date)
    );
  })
  .slice(0, requestedLimit);

const failures = [];
let completed = 0;

for (const candidate of candidates) {
  const result = spawnSync(
    process.execPath,
    [
      BUILDER_PATH,
      "--event",
      candidate.eventId,
      "--model",
      model,
      "--days",
      String(days),
    ],
    { cwd: ROOT, encoding: "utf8" }
  );

  if (result.status === 0) {
    completed += 1;
    console.log(result.stdout.trim());
  } else {
    const message = (result.stderr || result.stdout || "unknown error").trim();
    failures.push({ event_id: candidate.eventId, message });
    console.error(`${candidate.eventId}: ${message}`);
  }

  if (delayMs > 0) await sleep(delayMs);
}

console.log(
  JSON.stringify(
    {
      batch_version: "arcus-event-rainfall-batch-v1",
      candidates: candidates.length,
      completed,
      failed: failures.length,
      failures,
      model,
    },
    null,
    2
  )
);

if (failures.length > 0) process.exitCode = 1;
