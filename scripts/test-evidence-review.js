import assert from "node:assert/strict";
import fs from "node:fs";

const read = (p) => JSON.parse(fs.readFileSync(p, "utf8"));
const plan = read("config/curation/evidence-review-2026-10-19.json");
const oldRoot = "private-data/open/releases/arcus-open-2026.17";
const root = "public/data/open-release";
const oldEvents = read(`${oldRoot}/events.json`).events;
const events = read(`${root}/events.json`).events;
const decisions = new Map(plan.decisions.map((d) => [d.id, d]));
assert.equal(decisions.size, 27);
assert.equal(events.length, 260);
assert.deepEqual(read(`${root}/sources.json`).sources, read(`${oldRoot}/sources.json`).sources);
assert.deepEqual(read(`${root}/taxonomy.json`).taxonomy, read(`${oldRoot}/taxonomy.json`).taxonomy);
const oldById = new Map(oldEvents.map((e) => [e.event_id, e]));
const prose = new Set(["description", "description_it"]);
const counts = {};
for (const event of events) {
  const old = oldById.get(event.event_id);
  assert.ok(old, event.event_id);
  const decision = decisions.get(event.event_id);
  counts[event.failure_cause_evidence] = (counts[event.failure_cause_evidence] || 0) + 1;
  if (!decision) { assert.deepEqual(event, old, `Unrelated event changed: ${event.event_id}`); continue; }
  assert.equal(old.failure_cause_evidence, "Unspecified");
  assert.equal(event.failure_cause_evidence, decision.level);
  // Hydraulic normalized evidence may remain unspecified when no mechanism is known.
  const stable = (row) => {
    const result = structuredClone(row);
    delete result.failure_cause_evidence;
    for (const field of prose) delete result[field];
    if (result.hydraulic_intelligence) delete result.hydraulic_intelligence.evidence_level;
    return result;
  };
  assert.deepEqual(stable(event), stable(old), `Out-of-scope scientific value changed: ${event.event_id}`);
  assert.match(event.description, new RegExp(`Cause evidence: ${decision.level}\\.`));
}
assert.deepEqual(counts, { "Needs review": 44, Probable: 39, Documented: 177 });
const manifest = read(`${root}/manifest.json`);
assert.equal(manifest.version, "arcus-open-2026.18");
assert.equal(manifest.event_count, 260);
assert.equal(manifest.source_count, 1057);
assert.equal(read(`${root}/quality-audit.json`).errors.length, 0);
console.log(JSON.stringify({ passed: true, changedEvidence: decisions.size, counts, sourcesUnchanged: true, otherScientificFieldsUnchanged: true }));
