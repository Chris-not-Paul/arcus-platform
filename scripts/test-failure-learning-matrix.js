import assert from "node:assert/strict";
import fs from "node:fs";

import {
  buildHydraulicFailureLearningMatrix,
} from "../server/mitigationIntelligenceService.js";

const events = [
  {
    event_id: "B01",
    hydraulic_geometry: {
      bridge_length_m: 80,
      piers_in_active_riverbed: true,
    },
    hydraulic_intelligence: {
      component_involved: "pier_foundation",
      evidence_level: "documented",
      failure_process: "scour",
    },
  },
  {
    event_id: "B02",
    hydraulic_geometry: {
      bridge_length_m: 40,
      piers_in_active_riverbed: false,
    },
    hydraulic_intelligence: {
      component_involved: "abutment",
      evidence_level: "probable",
      failure_process: "scour",
    },
  },
  {
    event_id: "B03",
    hydraulic_intelligence: {
      component_involved: "deck_or_superstructure",
      evidence_level: "documented",
      failure_process: "overtopping_or_hydrodynamic_action",
    },
  },
  {
    event_id: "B04",
    hydraulic_intelligence: {
      component_involved: null,
      evidence_level: "unspecified",
      failure_process: null,
    },
  },
];
const episodeRegistry = {
  event_to_episode: {
    B01: "episode:1",
    B02: "episode:2",
    B03: "episode:3",
    B04: "episode:4",
  },
};
const processes = [
  {
    documented_count: 1,
    effective_evidence_count: 1.5,
    episode_count: 2,
    episode_effective_evidence_count: 1.5,
    episode_ids: ["episode:1", "episode:2"],
    evidence_strength: "limited",
    event_ids: ["B01", "B02"],
    probable_count: 1,
    process: "scour",
    raw_count: 2,
    source_count: 4,
  },
  {
    documented_count: 1,
    effective_evidence_count: 1,
    episode_count: 1,
    episode_effective_evidence_count: 1,
    episode_ids: ["episode:3"],
    evidence_strength: "insufficient",
    event_ids: ["B03"],
    probable_count: 0,
    process: "overtopping_or_hydrodynamic_action",
    raw_count: 1,
    source_count: 2,
  },
  {
    documented_count: 0,
    effective_evidence_count: 0,
    episode_count: 1,
    episode_effective_evidence_count: 0,
    episode_ids: ["episode:4"],
    evidence_strength: "insufficient",
    event_ids: ["B04"],
    probable_count: 0,
    process: "unspecified",
    raw_count: 1,
    source_count: 1,
  },
];
const evidence = {
  effective_evidence_count: 2.5,
  episode_count: 4,
  episode_effective_evidence_count: 2.5,
  event_count: 4,
  processes,
};

const available = buildHydraulicFailureLearningMatrix({
  cohortEvents: events,
  evidence,
  episodeRegistry,
  intelligenceStatus: "available",
  selectionMode: "test_fixed_cohort",
  supportedProcesses: [processes[0]],
});

assert.equal(available.matrix_version, "arcus-failure-learning-matrix-v1");
assert.equal(available.status, "available");
assert.equal(available.row_count, 3);
assert.equal(available.qualified_priority_count, 1);
assert.equal(available.cohort_contract.cohort_fixed_before_outcome_read, true);
assert.equal(available.cohort_contract.geometry_used_for_qualification, false);
assert.equal(available.rows[0].process, "scour");
assert.equal(
  available.rows[0].learning_status,
  "qualified_investigation_priority"
);
assert.equal(available.rows[0].geometry_context.bridge_length_m.median, 60);
assert.equal(
  available.rows[0].geometry_context.piers_in_active_riverbed.true_share,
  0.5
);
assert.equal(available.rows[0].affected_components.length, 2);
assert.equal(
  available.rows.find((row) => row.process === "unspecified")
    .learning_status,
  "mechanism_unresolved"
);

const limited = buildHydraulicFailureLearningMatrix({
  cohortEvents: events,
  evidence,
  episodeRegistry,
  intelligenceStatus: "limited_evidence",
  selectionMode: "test_fixed_cohort",
  supportedProcesses: [],
});

assert.equal(limited.status, "limited_evidence");
assert.equal(limited.qualified_priority_count, 0);
assert.equal(Boolean(limited.generic_investigation_priority?.en), true);
assert.equal(
  limited.rows.every((row) => row.qualification.qualified === false),
  true
);

const abstained = buildHydraulicFailureLearningMatrix({
  abstentionReasons: ["official_hydraulic_exposure_not_intersected"],
  cohortEvents: events,
  evidence,
  episodeRegistry,
  intelligenceStatus: "abstained",
  selectionMode: "context_only",
  supportedProcesses: [processes[0]],
});

assert.equal(abstained.status, "abstained");
assert.equal(abstained.row_count, 0);
assert.equal(abstained.qualified_priority_count, 0);
assert.deepEqual(abstained.abstention_reasons, [
  "official_hydraulic_exposure_not_intersected",
]);
assert.equal(
  abstained.forbidden_interpretations.includes("collapse_probability"),
  true
);

const pageSource = fs.readFileSync(
  "src/pages/CollapseIntelligencePage.jsx",
  "utf8"
);
const reportSource = fs.readFileSync(
  "src/utils/collapseIntelligenceReport.js",
  "utf8"
);

assert.match(pageSource, /failure_learning_matrix/);
assert.match(pageSource, /FAILURE LEARNING MATRIX V1/);
assert.match(pageSource, /contract_unavailable/);
assert.match(pageSource, /does not convert this contract gap/);
assert.match(reportSource, /failureLearning/);
assert.match(reportSource, /Failure Learning Matrix v1/);

console.log("Failure Learning Matrix tests passed.");
