import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const CONTEXT_ROOT = path.join(
  ROOT,
  "public",
  "data",
  "event-context",
  "rainfall"
);
const index = JSON.parse(
  fs.readFileSync(path.join(CONTEXT_ROOT, "index.json"), "utf8")
);

assert.equal(index.schema_version, "arcus-event-rainfall-index-v1");
assert.ok(Object.keys(index.events).length > 0);

for (const [eventId, entry] of Object.entries(index.events)) {
  const context = JSON.parse(
    fs.readFileSync(path.join(CONTEXT_ROOT, entry.file), "utf8")
  );
  const values = context.daily.map((item) => item.precipitation_mm);
  const sum = (items) =>
    Number(items.reduce((total, value) => total + value, 0).toFixed(1));

  assert.equal(context.schema_version, "arcus-event-rainfall-context-v1");
  assert.equal(context.event_id, eventId);
  assert.equal(context.status, "context_available");
  assert.ok(context.daily.length >= 7);
  assert.equal(context.daily.at(-1).date, context.event_date);
  assert.ok(values.every((value) => Number.isFinite(value) && value >= 0));
  assert.deepEqual(
    [...context.daily.map((item) => item.date)].sort(),
    context.daily.map((item) => item.date)
  );
  assert.equal(
    context.aggregates.event_calendar_day_mm,
    sum(values.slice(-1))
  );
  assert.equal(
    context.aggregates.event_and_previous_2_days_mm,
    sum(values.slice(-3))
  );
  assert.equal(
    context.aggregates.event_and_previous_6_days_mm,
    sum(values.slice(-7))
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
