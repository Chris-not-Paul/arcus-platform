import assert from "node:assert/strict";
import { collapseScope, collapseScopeLabel, collapseScopeNote } from "../src/utils/approachCollapsePolicy.js";
import { localizedEventDescription } from "../src/utils/eventDisplayLabels.js";
import { buildOpenEventDossier } from "../src/utils/openEventDossier.js";

const fixtures = [
  { component_involved: "Approach embankment", collapse_severity: "TC", approach_extension_status: "Applicable" },
  { component_involved: "Approach embankment", collapse_severity: "PC", approach_extension_status: "Needs review" },
  { component_involved: "Deck / superstructure", collapse_severity: "TC" },
  { component_involved: "Abutment", collapse_severity: "PC" },
  { component_involved: "Multiple components", collapse_severity: "TC" },
  { component_involved: "Temporary works", collapse_severity: "TC" },
  { component_involved: null, collapse_severity: "PC" },
];
const before = structuredClone(fixtures);
assert.match(localizedEventDescription({ victims: null, injuries: null }, "it"), /vittime non documentato/);
assert.doesNotMatch(localizedEventDescription({ victims: null, injuries: null }, "it"), /non risultano vittime/);
assert.match(localizedEventDescription({ victims: 0, injuries: 0 }, "it"), /non risultano vittime/);
assert.deepEqual(fixtures.map(collapseScope), ["approach_embankment", "approach_embankment", "bridge_structure", "bridge_structure", "multiple_components", "temporary_works", "unspecified"]);
assert.deepEqual(fixtures, before, "Descriptive scope must not mutate raw records or TC/PC");
assert.equal(collapseScope(), "unspecified");assert.equal(collapseScope(null), "unspecified");
assert.equal(collapseScope({ approach_extension_status: "Not assessed" }), "unspecified");
assert.equal(collapseScope({ approach_extension_status: "Needs review" }), "unspecified");
assert.equal(collapseScope({ approach_extension_status: "Applicable" }), "approach_embankment");
assert.equal(collapseScope({ component_involved: "Multiple components", approach_extension_status: "Applicable" }), "multiple_components");
assert.equal(collapseScope({ component_involved: "Unspecified", collapse_scope: "bridge_structure" }), "unspecified", "Do not trust an unverifiable/stale derived field");
assert.equal(collapseScope({ failure_process: "Bank erosion / embankment failure" }), "unspecified", "A process is not proof of the affected component");
assert.equal(collapseScope({ hydraulic_intelligence: { component_involved: "approach_embankment" } }), "approach_embankment");
assert.equal(collapseScope({ hydraulic_intelligence: { component_involved: "pier_foundation" } }), "bridge_structure");
assert.equal(collapseScopeLabel("approach_embankment", "it"), "Rilevato d’accesso");
assert.equal(collapseScopeLabel("bridge_structure", "en"), "Bridge structure");
assert.match(collapseScopeNote(fixtures[1], "it"), /incluso nel totale ARCUS/);
assert.match(collapseScopeNote(fixtures[1], "en"), /does not necessarily indicate span collapse/);
assert.equal(collapseScopeNote(fixtures[6], "it"), null);
assert.match(localizedEventDescription({ ...fixtures[1], date: "2016-03-18", municipality: "Test" }, "it"), /cedimento del rilevato d’accesso/);
const dossier=buildOpenEventDossier({ event: { ...fixtures[1], event_id: "IT00.00.01", bridge_length_m: 99 }, sources: [] });
assert.equal(dossier.event.collapse_scope,"approach_embankment");assert.equal(dossier.event.collapse_severity,"PC");
assert.equal(Object.hasOwn(dossier.event,"bridge_length_m"),false,"Keep private geometry out of the public dossier");
const counts=fixtures.reduce((out,e)=>{const scope=collapseScope(e);out[scope]=(out[scope]||0)+1;return out;},{});
assert.equal(Object.values(counts).reduce((a,b)=>a+b,0),fixtures.length,"Disjoint grouping must retain every record exactly once");
console.log("Failure scope: component grouping, missing-data boundary, inclusion, TC/PC preservation and public dossier tests passed.");
