import assert from "node:assert/strict";
import path from "node:path";

import {
  enrichEventsWithHydraulicGeometry,
  HYDRAULIC_GEOMETRY_DATASET_ID,
  HYDRAULIC_GEOMETRY_SOURCE_URL,
  normalizeHydraulicGeometry,
} from "../src/utils/hydraulicGeometry.js";
import {
  readXlsxHeaders,
  readXlsxSheet,
} from "./lib/xlsx-reader.js";

const validEventRow = {
  event_id: "IT00.10.01",
  bridge_length_m: 42,
  piers_in_active_riverbed: true,
};
const validLinkRow = {
  event_id: "IT00.10.01",
  dataset_id: HYDRAULIC_GEOMETRY_DATASET_ID,
  source_record_id: "P018",
  match_method: "coordinate_year",
  match_distance_m: 0,
  match_confidence: "high",
};
const validDatasetRow = {
  dataset_id: HYDRAULIC_GEOMETRY_DATASET_ID,
  source_url: HYDRAULIC_GEOMETRY_SOURCE_URL,
};

const normalized = normalizeHydraulicGeometry(
  validEventRow,
  validLinkRow,
  validDatasetRow
);
assert.deepEqual(normalized.warnings, []);
assert.equal(normalized.hydraulic_geometry.bridge_length_m, 42);
assert.equal(normalized.hydraulic_geometry.piers_in_active_riverbed, true);
assert.equal(
  normalized.hydraulic_geometry.provenance.source_record_id,
  "P018"
);

const noPiers = normalizeHydraulicGeometry(
  { ...validEventRow, piers_in_active_riverbed: false },
  validLinkRow,
  validDatasetRow
);
assert.equal(noPiers.hydraulic_geometry.piers_in_active_riverbed, false);

const invalid = normalizeHydraulicGeometry(
  { ...validEventRow, bridge_length_m: 0 },
  validLinkRow,
  validDatasetRow
);
assert.equal(invalid.hydraulic_geometry, null);
assert.ok(invalid.warnings.includes("invalid_bridge_length_m"));

const enriched = enrichEventsWithHydraulicGeometry(
  [
    {
      event_id: "B00.10.01",
      research_event_id: "IT00.10.01",
      specific_cause: "Hydraulic",
    },
    {
      event_id: "B00.10.02",
      research_event_id: "IT00.10.02",
      specific_cause: "Earthquake",
    },
  ],
  [validEventRow],
  [validLinkRow],
  [validDatasetRow]
);
assert.equal(enriched[0].hydraulic_geometry.bridge_length_m, 42);
assert.equal(enriched[1].hydraulic_geometry, null);

const masterPath = path.resolve("private-data/raw/MASTER_RESEARCH.xlsx");
const eventHeaders = readXlsxHeaders(masterPath, "EVENTS");
const linkRows = readXlsxSheet(masterPath, "HYDRAULIC_GEOMETRY_LINKS");
const datasetRows = readXlsxSheet(masterPath, "DATASETS");
const forbiddenEventHeaders = [
  "hydraulic_geometry_source_record_id",
  "hydraulic_geometry_match_method",
  "hydraulic_geometry_match_distance_m",
  "hydraulic_geometry_match_confidence",
  "hydraulic_geometry_source_url",
];

assert.equal(eventHeaders.includes("bridge_length_m"), true);
assert.equal(eventHeaders.includes("piers_in_active_riverbed"), true);
assert.equal(eventHeaders.indexOf("bridge_length_m"), 15);
assert.equal(eventHeaders.indexOf("piers_in_active_riverbed"), 16);
assert.equal(
  forbiddenEventHeaders.every((header) => !eventHeaders.includes(header)),
  true
);
assert.equal(linkRows.length, 158);
assert.equal(
  new Set(linkRows.map((row) => row.source_record_id)).size,
  linkRows.length
);
assert.equal(datasetRows.length, 1);
assert.equal(datasetRows[0].dataset_id, HYDRAULIC_GEOMETRY_DATASET_ID);
assert.equal(datasetRows[0].source_url, HYDRAULIC_GEOMETRY_SOURCE_URL);

console.log("Hydraulic geometry tests passed.");
