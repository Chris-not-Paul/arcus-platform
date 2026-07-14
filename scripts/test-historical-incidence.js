import assert from "node:assert/strict";
import fs from "node:fs";

import {
  buildAinopBridgeIndex,
  normalizeProvinceKey,
} from "./build-ainop-bridge-index.js";
import { publicReleaseEndYear } from "../server/config.js";

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8").replace(/^\uFEFF/, ""));
}

function yearFromDate(value) {
  const match = String(value || "").match(/\d{4}/);

  return match ? Number(match[0]) : null;
}

function round(value, decimals) {
  const factor = 10 ** decimals;

  return Math.round(Number(value) * factor) / factor;
}

function eventsForProvince(events, province, scope = "professional") {
  const key = normalizeProvinceKey(province);

  return events.filter(
    (event) =>
      normalizeProvinceKey(event.province) === key &&
      (scope === "professional" ||
        yearFromDate(event.date) <= publicReleaseEndYear)
  );
}

function provinceRecord(index, province) {
  const key = normalizeProvinceKey(province);

  return index.provinces.find(
    (item) => normalizeProvinceKey(item.province) === key
  );
}

function validateRecord(record) {
  const denominator = Number(record.denominator_count);
  const numerator = Number(record.numerator_count);

  if (denominator > 0) {
    assert.equal(
      record.provincial_rate_per_100,
      round((numerator / denominator) * 100, 3)
    );
    assert.equal(
      record.collapse_rate_per_100_ainop_bridges,
      record.provincial_rate_per_100
    );
    assert.equal(
      record.relative_to_national,
      round(
        record.provincial_rate_per_100 /
          record.national_rate_per_100,
        2
      )
    );
  } else {
    assert.equal(record.provincial_rate_per_100, null);
    assert.equal(record.relative_to_national, null);
  }
}

function assertCoherentIndexRecord(record) {
  const denominator = Number(record.denominator_count);
  const numerator = Number(record.numerator_count);
  const rate = record.provincial_rate_per_100;
  const national = record.national_rate_per_100;

  if (denominator > 0 && rate !== round((numerator / denominator) * 100, 3)) {
    throw new Error("provincial_rate_incoherent");
  }

  if (
    denominator > 0 &&
    record.relative_to_national !== round(rate / national, 2)
  ) {
    throw new Error("relative_to_national_incoherent");
  }
}

const index = readJson("private-data/professional/ainop-bridge-index.json");
const events = readJson("private-data/processed/events.json");
const sources = readJson("private-data/processed/sources.json");
const release = readJson("private-data/professional/data-release.json");
const openScopedEvents = events.filter(
  (event) => yearFromDate(event.date) <= publicReleaseEndYear
);
const professionalScopedEvents = events.filter((event) =>
  Boolean(yearFromDate(event.date))
);
const events2026 = events.filter((event) => yearFromDate(event.date) === 2026);
const torino = provinceRecord(index, "Torino");
const torinoEvents = eventsForProvince(events, "Torino");

assert.equal(torinoEvents.length, 40);
assert.equal(torino.numerator_count, 40);
assert.equal(torino.arcus_cases, torino.numerator_count);
assert.equal(torino.denominator_count, 1285);
assert.equal(torino.ainop_bridges_total, torino.denominator_count);
assert.equal(torino.provincial_rate_per_100, 3.113);
assert.equal(torino.collapse_rate_per_100_ainop_bridges, 3.113);
assert.equal(torino.national_rate_per_100, 0.562);
assert.equal(torino.relative_to_national, 5.54);
assert.equal(torino.dataset_scope, "professional");
assert.equal(torino.dataset_version, "arcus-professional-2026.07.10");
assert.equal(torino.data_cutoff_date, "2026-07-10T14:20:00.000Z");
assert.equal(torino.latest_event_date, "2026-04-02");
assert.equal(torino.included_year_max, 2026);
assert.equal(torino.release_end_year, publicReleaseEndYear);
assert.equal(index.metadata.release_end_year, publicReleaseEndYear);
assert.equal(index.metadata.dataset_scope, "professional");
assert.equal(index.metadata.total_arcus_cases, professionalScopedEvents.length);
assert.equal(index.metadata.total_arcus_cases, 253);
assert.equal(index.metadata.total_sources, sources.length);
assert.equal(index.metadata.national_rate_per_100_ainop_bridges, 0.562);
assert.equal(events2026.length, 1);
assert.equal(torino.dataset_version, index.metadata.dataset_version);
assert.equal(torino.generated_at, index.metadata.generated_at);
assert.equal(torino.confidence, "high");
assert.equal(torino.denominator_confidence, "high");
assert.equal(
  torino.denominator_confidence_reason,
  "AINOP denominator is broad enough for provincial relative benchmarking."
);
assert.equal(torino.confidence_type, "denominator_sample_size");
assert.equal(torino.numerator_evidence_confidence, "documented");
assert.equal(torino.overall_data_confidence, null);
validateRecord(torino);

const torinoDisplayedCases = torinoEvents.length;
const torinoReportNumerator = torino.numerator_count;
const torinoExportNumerator = torino.numerator_count;

assert.equal(torinoDisplayedCases, torino.numerator_count);
assert.equal(torinoReportNumerator, torino.numerator_count);
assert.equal(torinoExportNumerator, torino.numerator_count);
assert.equal(torino.ainop_bridges_total, torino.denominator_count);

const arezzo = provinceRecord(index, "Arezzo");
assert.equal(arezzo.numerator_count, 0);
assert.equal(arezzo.denominator_count > 0, true);
assert.equal(arezzo.provincial_rate_per_100, 0);
assert.equal(arezzo.relative_to_national, 0);
validateRecord(arezzo);

const agrigento = provinceRecord(index, "Agrigento");
assert.equal(agrigento.numerator_count, 2);
assert.equal(agrigento.denominator_count, 0);
assert.equal(agrigento.provincial_rate_per_100, null);
assert.equal(agrigento.relative_to_national, null);
assert.equal(agrigento.confidence, "unavailable");
assert.equal(agrigento.denominator_confidence, "unavailable");
assert.equal(agrigento.confidence_type, "denominator_sample_size");
assert.equal(agrigento.numerator_evidence_confidence, "documented");
assert.equal(agrigento.overall_data_confidence, null);
validateRecord(agrigento);

const ancona = provinceRecord(index, "Ancona");
assert.notEqual(ancona.numerator_count, torino.numerator_count);
assert.equal(eventsForProvince(events, "Ancona").length, ancona.numerator_count);

const campobasso = provinceRecord(index, "Campobasso");
const openRebuilt = buildAinopBridgeIndex({
  currentIndex: index,
  events,
  generatedAt: "2026-07-10T14:20:00.000Z",
  release,
  releaseEndYear: publicReleaseEndYear,
  scope: "open",
  sources,
});
const openCampobasso = provinceRecord(openRebuilt, "Campobasso");
const openTorino = provinceRecord(openRebuilt, "Torino");

assert.equal(openRebuilt.metadata.dataset_scope, "open");
assert.equal(openRebuilt.metadata.total_arcus_cases, openScopedEvents.length);
assert.equal(openRebuilt.metadata.total_arcus_cases, 252);
assert.equal(openRebuilt.metadata.included_year_max, 2025);
assert.equal(openRebuilt.metadata.national_rate_per_100_ainop_bridges, 0.56);
assert.equal(openTorino.relative_to_national, 5.56);
assert.equal(campobasso.numerator_count, openCampobasso.numerator_count + 1);
assert.equal(events2026[0].province, "Campobasso");

const rebuilt = buildAinopBridgeIndex({
  currentIndex: index,
  events,
  generatedAt: "2026-07-10T14:20:00.000Z",
  release,
  releaseEndYear: publicReleaseEndYear,
  scope: "professional",
  sources,
});
const rebuiltTorino = provinceRecord(rebuilt, "Torino");
assert.deepEqual(rebuiltTorino, torino);

assert.throws(
  () =>
    assertCoherentIndexRecord({
      ...torino,
      relative_to_national: 5.82,
    }),
  /relative_to_national_incoherent/
);

assert.equal(
  fs.readFileSync("src/pages/ProfessionalPage.jsx", "utf8").includes(
    "selectedCollapseRateNumerator"
  ),
  true
);
assert.equal(
  fs.readFileSync("scripts/export-path01-report.js", "utf8").includes(
    "numerator_count"
  ),
  true
);
assert.equal(
  fs.readFileSync("src/pages/ProfessionalPage.jsx", "utf8").includes(
    "openEvents("
  ),
  false
);
assert.equal(
  fs.readFileSync("src/pages/ReportMapPath01.jsx", "utf8").includes(
    "openEvents("
  ),
  false
);
assert.equal(
  fs.readFileSync("scripts/export-path01-report.js", "utf8").includes(
    "Release:"
  ),
  false
);

console.log(
  JSON.stringify({
    ok: true,
    checks: [
      "displayed-cases-equal-numerator-count",
      "ui-report-export-share-numerator",
      "professional-page-does-not-use-open-events",
      "report-map-does-not-use-open-events",
      "report-does-not-display-fixed-release-end-year",
      "denominator-same-ui-report",
      "open-scope-applies-public-release-end-year",
      "professional-scope-includes-post-2025-events",
      "event-2026-included-provincial-numerator",
      "event-2026-included-national-rate",
      "event-2026-excluded-open-scope",
      "dataset-version-coherent",
      "data-cutoff-date-present",
      "latest-event-date-derived",
      "included-year-max-derived",
      "provincial-rate-recalculable",
      "relative-to-national-recalculable",
      "professional-total-events",
      "no-cross-province-record-reuse",
      "zero-case-province",
      "missing-denominator-province",
      "torino-consistent-values",
      "denominator-confidence-typed",
      "overall-data-confidence-null",
      "incoherent-json-rejected",
      "deterministic-rebuild",
    ],
  })
);
