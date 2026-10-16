import assert from "node:assert/strict";
import fs from "node:fs";
import { buildPublicEventCopy } from "../src/utils/publicEventCopy.js";

const read = (p) => JSON.parse(fs.readFileSync(p, "utf8"));
const previous = read("private-data/open/releases/arcus-open-2026.15/events.json").events;
const current = read("private-data/open/releases/arcus-open-2026.16/events.json").events;
const oldById = new Map(previous.map((e) => [e.event_id, e]));
const textFields = new Set(["description", "description_it", "documentary_notes_it", "documentary_notes_en"]);
assert.equal(current.length, 260);
for (const e of current) {
  const old = oldById.get(e.event_id);
  assert.ok(old, `New membership: ${e.event_id}`);
  const values = (row) => Object.fromEntries(Object.entries(row).filter(([key]) => !textFields.has(key)));
  assert.deepEqual(values(e), values(old), `Non-editorial value changed: ${e.event_id}`);
  assert.deepEqual(buildPublicEventCopy(old), Object.fromEntries([...textFields].map((field) => [field, e[field]])), `Non-deterministic public copy: ${e.event_id}`);
  for (const field of textFields) {
    assert.equal(typeof e[field], "string");
    assert.doesNotMatch(e[field], /\?|curator acceptance|reviewed audit|Verify|Punti da verificare|Foglio\d|The TC\/PC coding question|later confirmation|Date convention \(curator/i, `${e.event_id}: ${field}`);
  }
  assert.doesNotMatch(e.documentary_notes_it, /\bThe (?:record|historic|bridge)|This record|These source classifications/);
}
assert.deepEqual(read("private-data/open/releases/arcus-open-2026.16/sources.json").sources, read("private-data/open/releases/arcus-open-2026.15/sources.json").sources);
const byId = new Map(current.map((e) => [e.event_id, e]));
assert.match(byId.get("IT14.11.01").documentary_notes_it, /sormonto non è specificato/);
assert.match(byId.get("IT14.11.01").documentary_notes_it, /giorno esatto.*due campate/);
assert.match(byId.get("IT14.11.01").description_it, /Nel periodo di novembre 2014/);
assert.doesNotMatch(byId.get("IT14.11.01").description_it, /In data 10/);
assert.match(byId.get("IT09.04.05").documentary_notes_it, /assenza di gravi danni/);
assert.match(byId.get("IT20.11.02").documentary_notes_it, /ANAS.*assenza di particolari anomalie/);
assert.match(byId.get("IT20.11.04").documentary_notes_it, /non sono trasferite/);
assert.match(byId.get("IT20.10.04").documentary_notes_it, /diversa classificazione/);
console.log(JSON.stringify({ passed: true, events: current.length, sourcesUnchanged: true, scientificFieldsUnchanged: true, bilingualNotes: true, workingLogAbsent: true, keyConflictsPreserved: true }));
