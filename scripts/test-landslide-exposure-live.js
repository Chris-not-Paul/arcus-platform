import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { queryIspraLandslideExposure } from "../server/hazard/providers/ispraLandslideProvider.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const outputPath = path.join(
  root,
  "docs",
  "assets",
  "landslide-validation",
  "live-results.json"
);
const describeFeatureTypeUrl =
  "https://idrogeo.isprambiente.it/geoserver/idrogeo/ows" +
  "?service=WFS&version=2.0.0&request=DescribeFeatureType" +
  "&typeNames=idrogeo%3Apericolosita_frane";
const MAX_RESPONSE_SIZE_BYTES = 16 * 1024;

const cases = [
  {
    expected: "AA",
    latitude: 36.82837857142857,
    longitude: 14.7271,
    name: "AA attention area",
    province: "Ragusa",
  },
  {
    expected: "P1",
    latitude: 43.50846428571429,
    longitude: 10.338285714285714,
    name: "P1 moderate hazard",
    province: "Livorno",
  },
  {
    expected: "P2",
    latitude: 44.40296071428571,
    longitude: 9.538971428571427,
    name: "P2 medium hazard",
    province: "Genova",
  },
  {
    expected: "P3",
    latitude: 38.922574999999995,
    longitude: 8.785432142857143,
    name: "P3 high hazard",
    province: "Sud Sardegna",
  },
  {
    expected: "P4",
    latitude: 40.100057142857146,
    longitude: 16.003749999999997,
    name: "P4 very high hazard",
    province: "Potenza",
  },
  {
    expected: null,
    latitude: 45.2897,
    longitude: 7.94194,
    name: "Torino no-intersection control",
    province: "Torino",
  },
];

function compactResult(testCase, result) {
  const layer = result.layer_results?.[0] || {};
  const matched = new Set(result.matched_hazard_classes || []);

  return {
    expected_layer: testCase.expected,
    highest_class: result.highest_hazard_class,
    latitude: testCase.latitude,
    longitude: testCase.longitude,
    matched_attention_classes: result.matched_attention_classes || [],
    matched_classes: result.matched_hazard_classes || [],
    name: testCase.name,
    overall_status: result.status,
    assessment_complete: result.assessment_complete,
    decision_status: result.decision_status,
    p1: {
      feature_count: layer.feature_count ?? null,
      intersects: matched.has("P1"),
      status: matched.has("P1") ? "available" : "no_intersection",
    },
    p2: {
      feature_count: layer.feature_count ?? null,
      intersects: matched.has("P2"),
      status: matched.has("P2") ? "available" : "no_intersection",
    },
    p3: {
      feature_count: layer.feature_count ?? null,
      intersects: matched.has("P3"),
      status: matched.has("P3") ? "available" : "no_intersection",
    },
    p4: {
      feature_count: layer.feature_count ?? null,
      intersects: matched.has("P4"),
      status: matched.has("P4") ? "available" : "no_intersection",
    },
    province: testCase.province,
    provider: result.source?.provider || null,
    queried_at: result.source?.queried_at || null,
    source_dataset_version: result.source?.source_dataset_version || null,
    wfs: {
      feature_count: layer.feature_count ?? null,
      intersects: layer.intersects ?? null,
      layer: layer.layer || null,
      request_url: layer.request?.url || null,
      response_size_bytes: layer.response_size_bytes ?? null,
      duration_ms: layer.duration_ms ?? null,
      status: layer.status || null,
    },
  };
}

function assertCase(testCase, result) {
  assert.equal(result.normalized_score, null);
  assert.equal(result.source?.source_dataset_version, "5.0");
  assert.equal(result.source?.source_reference_year, 2024);
  assert.equal(result.assessment_complete, true);
  assert.equal(
    result.source?.query_method,
    "server_side_point_intersection"
  );
  assert.equal(
    result.layer_results?.[0]?.response_size_bytes <=
      MAX_RESPONSE_SIZE_BYTES,
    true
  );
  const requestUrl = new URL(result.layer_results?.[0]?.request?.url);

  assert.equal(requestUrl.searchParams.get("bbox"), null);
  assert.equal(requestUrl.searchParams.get("propertyName"), "cod_per_it");
  assert.match(
    requestUrl.searchParams.get("CQL_FILTER") || "",
    /^INTERSECTS\(geom,SRID=4326;POINT\(/
  );

  if (testCase.expected === null) {
    assert.equal(result.status, "no_intersection");
    assert.equal(result.decision_status, "no_intersection");
    assert.equal(result.highest_hazard_class, null);
    assert.deepEqual(result.matched_hazard_classes, []);
    return;
  }

  assert.equal(result.status, "available");
  assert.equal(result.decision_status, "available_complete");

  if (testCase.expected === "AA") {
    assert.equal(result.attention_area, true);
    assert.ok(result.matched_attention_classes.includes("AA"));
    assert.equal(result.highest_hazard_class, null);
    return;
  }

  assert.ok(
    result.matched_hazard_classes.includes(testCase.expected),
    `${testCase.name} did not include ${testCase.expected}`
  );
  assert.equal(result.highest_hazard_class, testCase.expected);
}

const results = [];
const schemaResponse = await fetch(describeFeatureTypeUrl, {
  headers: {
    Accept: "application/xml, text/xml",
  },
});
const schemaText = await schemaResponse.text();

assert.equal(schemaResponse.ok, true);
assert.match(schemaText, /name=["']geom["']/i);
assert.match(schemaText, /name=["']cod_per_it["']/i);

for (const testCase of cases) {
  const result = await queryIspraLandslideExposure({
    latitude: testCase.latitude,
    longitude: testCase.longitude,
  }, {
    bypassCache: true,
    persistentCache: false,
  });

  assertCase(testCase, result);
  results.push(compactResult(testCase, result));
}

fs.mkdirSync(path.dirname(outputPath), { recursive: true });
fs.writeFileSync(
  outputPath,
  `${JSON.stringify(
    {
      generated_at: new Date().toISOString(),
      schema_probe: {
        class_attribute: "cod_per_it",
        geometry_attribute: "geom",
        ok: true,
        url: describeFeatureTypeUrl,
      },
      results,
    },
    null,
    2
  )}\n`
);

console.log(
  `ISPRA PAI landslide live validation passed (${results.length} cases).`
);
console.log(outputPath);
