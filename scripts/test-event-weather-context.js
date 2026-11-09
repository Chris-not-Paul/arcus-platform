import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { contextMatchesEvent } from "../src/utils/eventContextResource.js";
import { calendarOffset, rainfallChronology } from "../src/utils/rainfallChronology.js";

const ROOT = process.cwd();
const CONTEXT_ROOT = process.env.ARCUS_RAINFALL_TEST_ROOT || path.join(
  ROOT,
  "public",
  "data",
  "event-context",
  "rainfall"
);
const index = JSON.parse(
  fs.readFileSync(path.join(CONTEXT_ROOT, "index.json"), "utf8")
);
const eventById = new Map(JSON.parse(
  fs.readFileSync("public/data/open-release/events.json", "utf8")
).events.map((event) => [event.event_id, event]));
const pilotEvent = eventById.get("IT23.05.04");
assert.deepEqual(rainfallChronology(pilotEvent), {
  kind: "interval", start: "2023-05-17", end: "2023-05-18",
});
assert.equal(rainfallChronology(eventById.get("IT23.05.03")).kind, "day");
assert.equal(rainfallChronology(eventById.get("IT00.10.06")).kind, "reference");

assert.equal(index.schema_version, "arcus-event-rainfall-index-v1");
assert.ok(Object.keys(index.events).length > 0);

for (const [eventId, entry] of Object.entries(index.events)) {
  const context = JSON.parse(
    fs.readFileSync(path.join(CONTEXT_ROOT, entry.file), "utf8")
  );
  const values = context.daily.map((item) => item.precipitation_mm);
  const throughReference = context.daily.filter((item) => item.date <= context.event_date)
    .map((item) => item.precipitation_mm);
  const sum = (items) =>
    Number(items.reduce((total, value) => total + value, 0).toFixed(1));

  assert.equal(context.schema_version, "arcus-event-rainfall-context-v1");
  assert.equal(context.event_id, eventId);
  assert.equal(context.status, "context_available");
  assert.ok(context.daily.length >= 7);
  assert.ok(context.daily.some((day) => day.date === context.event_date));
  assert.equal(context.daily.at(-1).date, context.period.end_date);
  assert.equal(context.daily[0].date, context.period.start_date);
  assert.ok(context.daily.every((day, i) => day.date === calendarOffset(context.period.start_date, i)));
  if (process.env.ARCUS_RAINFALL_TEST_ROOT) {
    const event = eventById.get(eventId);
    assert.equal(event?.specific_cause, "Hydraulic");
    assert.ok(contextMatchesEvent("rainfall", context, event), `Stale coordinates or date: ${eventId}`);
    if (event.exact_location) assert.ok(context.period.end_date >= rainfallChronology(event).end);
  }
  assert.ok(values.every((value) => Number.isFinite(value) && value >= 0));
  assert.deepEqual(
    [...context.daily.map((item) => item.date)].sort(),
    context.daily.map((item) => item.date)
  );
  assert.equal(
    context.aggregates.event_calendar_day_mm,
    sum(throughReference.slice(-1))
  );
  assert.equal(
    context.aggregates.event_and_previous_2_days_mm,
    sum(throughReference.slice(-3))
  );
  assert.equal(
    context.aggregates.event_and_previous_6_days_mm,
    sum(throughReference.slice(-7))
  );
  assert.equal(context.aggregates.full_period_mm, sum(values));
  assert.equal(context.source.product_type, "reanalysis");
  assert.ok(context.source.dataset);
  assert.ok(context.source.resolution_km > 0);
  assert.ok(context.quality_assessment?.status);
  assert.ok(context.quality_assessment?.assessment_method);
  assert.ok(context.quality_assessment?.rationale_it);
  assert.ok(context.quality_assessment?.rationale_en);
  if (context.quality_assessment?.assessment_input) {
    assert.equal(
      context.quality_assessment.assessment_input.event_calendar_day_mm,
      context.aggregates.event_calendar_day_mm
    );
    assert.equal(
      context.quality_assessment.assessment_input.event_and_previous_2_days_mm,
      context.aggregates.event_and_previous_2_days_mm
    );
    assert.equal(
      context.quality_assessment.assessment_input.event_and_previous_6_days_mm,
      context.aggregates.event_and_previous_6_days_mm
    );
  }
  assert.ok(context.grid_location.distance_from_event_km >= 0);
  assert.ok(context.caveats.length >= 3);
}

console.log(
  `Validated ${Object.keys(index.events).length} event rainfall context record(s)`
);
