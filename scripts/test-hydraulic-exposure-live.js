import {
  clearIspraFloodLayerCache,
  queryIspraFloodExposure,
} from "../server/hazard/providers/ispraFloodProvider.js";
import {
  ISPRA_FLOOD_LAYERS,
} from "../server/hazard/normalizers/floodNormalizer.js";

const MAX_LAYER_RESPONSE_BYTES = 5000;
const WFS_URL = "https://sdi.isprambiente.it/geoserver/nz1/wfs";

const CASES = [
  {
    coordinates: {
      latitude: 38.94973151,
      longitude: 8.72300141,
    },
    expected: {
      decision_status: "available_complete",
      matched_classes: ["P1"],
    },
    name: "P1 only",
  },
  {
    coordinates: {
      latitude: 38.9434071,
      longitude: 8.91222919,
    },
    expected: {
      decision_status: "available_complete",
      matched_classes: ["P1", "P2"],
    },
    name: "P1 and P2",
  },
  {
    coordinates: {
      latitude: 37.67112259,
      longitude: 12.58006927,
    },
    expected: {
      decision_status: "available_complete",
      matched_classes: ["P1", "P2", "P3"],
    },
    name: "P1, P2 and P3",
  },
  {
    coordinates: {
      latitude: 45.2897,
      longitude: 7.94194,
    },
    expected: {
      decision_status: "no_intersection",
      matched_classes: [],
    },
    name: "Torino no intersection",
  },
];

function layerSummary(layer) {
  return {
    attempts: layer.attempts || 1,
    cache_hit: Boolean(layer.cache?.hit),
    class_name: layer.className,
    duration_ms: layer.duration_ms,
    feature_count: layer.feature_count,
    http_status: layer.http_status,
    intersects: layer.intersects,
    payload_bounded:
      Number.isFinite(layer.response_size_bytes) &&
      layer.response_size_bytes <= MAX_LAYER_RESPONSE_BYTES,
    query_method: layer.request?.query_method,
    response_size_bytes: layer.response_size_bytes,
    status: layer.status,
  };
}

function sameClasses(actual, expected) {
  return JSON.stringify(actual || []) === JSON.stringify(expected || []);
}

clearIspraFloodLayerCache();

const schemaResults = [];

for (const layer of ISPRA_FLOOD_LAYERS) {
  const schemaUrl = new URL(WFS_URL);

  schemaUrl.searchParams.set("service", "WFS");
  schemaUrl.searchParams.set("version", "2.0.0");
  schemaUrl.searchParams.set("request", "DescribeFeatureType");
  schemaUrl.searchParams.set("typeNames", layer.layerName);

  try {
    const response = await fetch(schemaUrl, {
      headers: {
        Accept: "application/xml, text/xml",
      },
      signal: AbortSignal.timeout(15000),
    });
    const body = await response.text();
    const geometryPresent = new RegExp(
      `name=["']${layer.geometryName}["']`
    ).test(body);
    const attributePresent = new RegExp(
      `name=["']${layer.attributeName}["']`
    ).test(body);

    schemaResults.push({
      attribute: layer.attributeName,
      attribute_present: attributePresent,
      class_name: layer.className,
      geometry: layer.geometryName,
      geometry_present: geometryPresent,
      http_status: response.status,
      layer: layer.layerName,
      passed: response.ok && geometryPresent && attributePresent,
      response_size_bytes: new TextEncoder().encode(body).byteLength,
    });
  } catch (error) {
    schemaResults.push({
      attribute: layer.attributeName,
      attribute_present: false,
      class_name: layer.className,
      error: error?.message || "schema_probe_failed",
      geometry: layer.geometryName,
      geometry_present: false,
      http_status: null,
      layer: layer.layerName,
      passed: false,
      response_size_bytes: null,
    });
  }
}

const schemaProbePassed = schemaResults.every((result) => result.passed);
const results = [];

for (const testCase of CASES) {
  const exposure = await queryIspraFloodExposure(testCase.coordinates, {
    persistentCache: false,
    retryAttempts: 2,
    retryDelayMs: 200,
    timeoutMs: 15000,
  });
  const layersAreBounded = exposure.layer_results?.every(
    (layer) =>
      layer.request?.query_method === "server_side_point_intersection" &&
      Number.isFinite(layer.response_size_bytes) &&
      layer.response_size_bytes <= MAX_LAYER_RESPONSE_BYTES
  );
  const passed =
    exposure.assessment_complete === true &&
    exposure.decision_status === testCase.expected.decision_status &&
    layersAreBounded &&
    sameClasses(
      exposure.matched_classes,
      testCase.expected.matched_classes
    );

  results.push({
    assessment_complete: exposure.assessment_complete,
    coordinates: testCase.coordinates,
    decision_status: exposure.decision_status,
    expected: testCase.expected,
    failed_layers: exposure.coverage?.failed_layers || [],
    highest_class: exposure.highest_class,
    layers: (exposure.layer_results || []).map(layerSummary),
    matched_classes: exposure.matched_classes,
    name: testCase.name,
    passed,
    provider_status: exposure.status,
  });
}

const cacheProbe = await queryIspraFloodExposure(CASES[1].coordinates, {
  persistentCache: false,
  retryAttempts: 2,
  retryDelayMs: 200,
  timeoutMs: 15000,
});
const cacheProbePassed =
  cacheProbe.source?.layer_cache?.hit_count === 3 &&
  cacheProbe.layer_results?.every((layer) => layer.cache?.hit);

const output = {
  cache_probe: {
    decision_status: cacheProbe.decision_status,
    layer_cache: cacheProbe.source?.layer_cache,
    passed: cacheProbePassed,
  },
  generated_at: new Date().toISOString(),
  max_layer_response_bytes: MAX_LAYER_RESPONSE_BYTES,
  schema_probe: {
    passed: schemaProbePassed,
    results: schemaResults,
  },
  judgement:
    results.every((result) => result.passed) &&
    cacheProbePassed &&
    schemaProbePassed
      ? "live_hydraulic_ready"
      : "live_hydraulic_with_limitations",
  results,
};

console.log(JSON.stringify(output, null, 2));

if (
  output.judgement !== "live_hydraulic_ready"
) {
  process.exitCode = 1;
}
