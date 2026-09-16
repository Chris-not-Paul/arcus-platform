import assert from "node:assert/strict";
import fs from "node:fs";

import {
  ANALOGUE_FEATURES,
  buildAnalogueSensitivity,
  buildEpisodeCalibration,
  buildEpisodeSensitivity,
  buildFailureChains,
  buildResearchEpisodes,
  buildReferenceHydraulicEpisodes,
  compareEpisodeRegistries,
  buildRobustnessScenarios,
  retrieveAnalogues,
  rowsToCsv,
} from "../src/utils/researchWorkbench.js";

function event(id, date, latitude, longitude, overrides = {}) {
  return {
    collapse_severity: "TC",
    component_involved: "Pier foundation",
    date,
    destination_use: "National",
    event_id: id,
    failure_cause_evidence: "Documented",
    failure_process: "Scour",
    failure_trigger: "Flood",
    hydraulic_intelligence: { failure_process: "scour" },
    latitude,
    longitude,
    material_type: "Reinforced concrete",
    region: "Liguria",
    research_event_id: id.replace("B", "IT"),
    source_confidence: "High",
    specific_cause: "Hydraulic",
    structural_type: "Beam bridge",
    ...overrides,
  };
}

const fixture = [
  event("B01.01.01", "2020-10-02", 44.4, 8.9),
  event("B01.01.02", "2020-10-03", 44.5, 9.0),
  event("B01.01.03", "2020-10-03", 38.1, 13.3, {
    component_involved: "Approach embankment",
    failure_process: "Overtopping",
    region: "Sicilia",
  }),
  event("B01.01.04", "2021-01-01", 44.4, 8.9, {
    failure_cause_evidence: "Unspecified",
    source_confidence: "Medium",
  }),
];
const sources = fixture.map((item, index) => ({
  event_id: item.event_id,
  source_id: `SRC${index}`,
  source_role: index === 3 ? "News" : "Official/Technical",
}));

const registry = buildResearchEpisodes(fixture, {
  maximumDistanceKm: 150,
  maximumGapDays: 2,
});
assert.equal(registry.eventCount, 4);
assert.equal(registry.episodes.length, 3);
assert.equal(registry.episodes[0].eventCount, 2);
assert.equal(registry.multiEventEpisodeCount, 1);
assert.equal(registry.eventToEpisode["B01.01.01"], registry.eventToEpisode["B01.01.02"]);
assert.notEqual(registry.eventToEpisode["B01.01.02"], registry.eventToEpisode["B01.01.03"]);

const sensitivity = buildEpisodeSensitivity(fixture);
assert.deepEqual(sensitivity.map((item) => item.key), ["strict", "reference", "broad"]);
assert.ok(sensitivity.every((item) => item.episodeCount > 0));

const reference = buildReferenceHydraulicEpisodes(fixture);
const concordance = compareEpisodeRegistries(registry, reference);
assert.equal(reference.episodes.length, 2);
assert.equal(concordance.commonEventCount, 4);
assert.ok(concordance.f1 > 0 && concordance.f1 < 1);
const calibration = buildEpisodeCalibration(fixture);
assert.equal(calibration.rows.length, 16);
assert.ok(calibration.best.f1 > 0);

const chains = buildFailureChains(fixture, registry.eventToEpisode);
assert.equal(chains[0].count, 3);
assert.equal(chains[0].episodeCount, 2);

const analogues = retrieveAnalogues(fixture[0], fixture, {
  eventToEpisode: registry.eventToEpisode,
  excludeSameEpisode: true,
  features: ANALOGUE_FEATURES,
});
assert.equal(analogues.some((result) => result.candidate.event_id === "B01.01.02"), false);
assert.equal(analogues[0].candidate.event_id, "B01.01.04");
assert.ok(analogues[0].score >= 80);
assert.ok(analogues[0].coverage > 0);
assert.ok(analogues[0].equivalentCandidateCount >= 1);
const analogueSensitivity = buildAnalogueSensitivity(fixture[0], fixture, {
  eventToEpisode: registry.eventToEpisode,
  excludeSameEpisode: true,
  features: ANALOGUE_FEATURES,
  topK: 2,
});
assert.equal(analogueSensitivity.rows.length, ANALOGUE_FEATURES.length);
assert.ok(analogueSensitivity.meanRetention >= 0);

const robustness = buildRobustnessScenarios(fixture, sources, registry);
assert.equal(robustness.scenarios.length, 5);
assert.equal(robustness.scenarios.find((item) => item.key === "confidence").count, 3);
assert.equal(robustness.scenarios.find((item) => item.key === "technical").count, 3);
assert.ok(robustness.leaveOneEpisodeOutStability !== null);

const csv = rowsToCsv(["event_id", "note"], [{ event_id: "IT01", note: 'a "quote"' }]);
assert.match(csv, /"a ""quote"""/);

const page = fs.readFileSync("src/pages/PremiumAnalyticsPage.jsx", "utf8");
assert.match(page, /ARCUS \/ RESEARCH PLUS/);
assert.match(page, /EPISODE INTELLIGENCE/);
assert.match(page, /FAILURE CHAIN EXPLORER/);
assert.match(page, /ANALOGUE CASE LAB/);
assert.match(page, /ROBUSTNESS & SENSITIVITY/);
assert.match(page, /REPRODUCIBLE RESEARCH NOTEBOOK/);
assert.match(page, /METHOD CONCORDANCE/);
assert.match(page, /LEAVE-ONE-FEATURE-OUT/);
assert.match(page, /professionalResource\("professional-events"\)/);
assert.doesNotMatch(page, /vulnerability/i);
assert.doesNotMatch(page, /probability score/i);

console.log("Research Plus workbench tests passed.");
