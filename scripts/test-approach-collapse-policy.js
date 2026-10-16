import assert from "node:assert/strict";
import { evaluateApproachExtension, approachExtensionNote } from "../src/utils/approachCollapsePolicy.js";
import { localizedEventDescription } from "../src/utils/eventDisplayLabels.js";
import { buildOpenEventDossier } from "../src/utils/openEventDossier.js";

const physical = { physicalCollapseDocumented: true, directlyConnectedToBridge: true };
assert.deepEqual(evaluateApproachExtension({ ...physical, allLanesPhysicallyInterrupted: true }), { status: "Applicable", severity: "TC" });
assert.equal(evaluateApproachExtension({ ...physical, destructiveAdjacentAbutmentCollapse: true }).severity, "TC");
assert.equal(evaluateApproachExtension({ ...physical, partialAccessRemains: true, immediateLifeDanger: true }).severity, "PC");
assert.deepEqual(evaluateApproachExtension(physical), { status: "Applicable", severity: null });
// Closure, component labels, flooding and retaining-wall damage do not establish approach collapse.
assert.equal(evaluateApproachExtension({ allLanesPhysicallyInterrupted: true }).severity, null);
assert.equal(evaluateApproachExtension({ physicalCollapseDocumented: false, directlyConnectedToBridge: true, allLanesPhysicallyInterrupted: true }).status, "Not applicable");
assert.equal(evaluateApproachExtension({ ...physical, directlyConnectedToBridge: false }).status, "Not applicable");
assert.equal(evaluateApproachExtension({ ...physical, partialAccessRemains: true }).severity, null);
assert.equal(evaluateApproachExtension({ component_involved: "Approach embankment" }).status, "Needs review");
assert.equal(approachExtensionNote("Not assessed", "it"), null);
const event = { event_id: "IT12.11.03", event_slug: "manciano-2012", date: "2012-11-12", municipality: "Manciano", collapse_severity: "PC", approach_extension_status: "Applicable", description: "Approach collapse; bridge span collapse not established." };
assert.match(localizedEventDescription(event, "it"), /cedimento del rilevato d’accesso/);
assert.doesNotMatch(localizedEventDescription(event, "it"), /si è verificato un crollo parziale/);
assert.match(localizedEventDescription(event, "en"), /not establish span collapse/);
const dossier=buildOpenEventDossier({ event, sources: [] });
assert.equal(dossier.event.approach_extension_status, "Applicable");
console.log("Approach-collapse policy: boundary, presentation and dossier tests passed.");
