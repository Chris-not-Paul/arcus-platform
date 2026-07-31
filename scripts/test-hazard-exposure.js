import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  clearHazardExposureCache,
  evaluatePointHazardExposure,
  queryRegisteredHazardProvider,
} from "../server/hazard/hazardExposureService.js";
import {
  queryIspraLandslideExposure,
} from "../server/hazard/providers/ispraLandslideProvider.js";
import {
  FLOOD_CLASS_SEVERITY_ORDER,
  highestFloodClass,
} from "../server/hazard/normalizers/floodNormalizer.js";
import {
  LANDSLIDE_HAZARD_ORDER,
  highestLandslideHazardClass,
  normalizeLandslideClass,
} from "../server/hazard/normalizers/landslideNormalizer.js";
import {
  queryIspraFloodExposure,
} from "../server/hazard/providers/ispraFloodProvider.js";
import {
  queryNearbyOfficialHazardContext,
} from "../server/hazard/nearbyHazardContextService.js";

const point = {
  latitude: 45,
  longitude: 7,
};
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");

function polygonFeature({ contains }) {
  const coordinates = contains
    ? [
        [
          [6.99, 44.99],
          [7.01, 44.99],
          [7.01, 45.01],
          [6.99, 45.01],
          [6.99, 44.99],
        ],
      ]
    : [
        [
          [8, 46],
          [8.1, 46],
          [8.1, 46.1],
          [8, 46.1],
          [8, 46],
        ],
      ];

  return {
    geometry: {
      coordinates,
      type: "Polygon",
    },
    properties: {},
    type: "Feature",
  };
}

function featureCollection({ contains, empty = false }) {
  return {
    features: empty ? [] : [polygonFeature({ contains })],
    type: "FeatureCollection",
  };
}

function geometryFeature(geometry) {
  return {
    geometry,
    properties: {},
    type: "Feature",
  };
}

function featureCollectionWithGeometry(geometry) {
  return {
    features: [geometryFeature(geometry)],
    type: "FeatureCollection",
  };
}

function mockHeaders(contentType) {
  return {
    get(name) {
      return name.toLowerCase() === "content-type" ? contentType : null;
    },
  };
}

function mockResponse({
  body,
  contentType = "application/json",
  ok = true,
  status = 200,
  statusText = "OK",
}) {
  return {
    headers: mockHeaders(contentType),
    ok,
    status,
    statusText,
    text: async () => body,
  };
}

function jsonResponse(payload) {
  return mockResponse({
    body: JSON.stringify(payload),
    contentType: "application/json; charset=utf-8",
  });
}

function textResponse({
  body,
  contentType = "text/plain",
  ok = true,
  status = 200,
  statusText = "OK",
}) {
  return mockResponse({
    body,
    contentType,
    ok,
    status,
    statusText,
  });
}

function layerClassFromUrl(url) {
  const layerName =
    url.searchParams.get("typeNames") || url.searchParams.get("typeName");
  const className = layerName.match(/_p([123])$/i)?.[1];

  return className ? `P${className}` : null;
}

function layerNameFromUrl(url) {
  return url.searchParams.get("typeNames") || url.searchParams.get("typeName");
}

function fetchForClasses(classes) {
  return async (url) => {
    const className = layerClassFromUrl(url);
    const contains = classes.includes(className);

    return jsonResponse(featureCollection({ contains }));
  };
}

function fetchWithoutFeatures() {
  return async () => jsonResponse(featureCollection({ empty: true }));
}

function fetchWithGeometryForClass(targetClass, geometry) {
  return async (url) =>
    jsonResponse(
      layerClassFromUrl(url) === targetClass
        ? featureCollectionWithGeometry(geometry)
        : featureCollection({ empty: true })
    );
}

async function query(fetchImpl, payload = point, options = {}) {
  if (options.clearCache !== false) {
    clearHazardExposureCache();
  }

  return evaluatePointHazardExposure(
    {
      hazards: ["hydraulic"],
      ...payload,
    },
    {
      fetchImpl,
      persistentCache: false,
      retryAttempts: options.retryAttempts ?? 1,
      retryDelayMs: options.retryDelayMs ?? 0,
      timeoutMs: options.timeoutMs || 50,
    }
  );
}

async function queryHazards(fetchImpl, hazards, payload = point, options = {}) {
  if (options.clearCache !== false) {
    clearHazardExposureCache();
  }

  return evaluatePointHazardExposure(
    {
      hazards,
      ...payload,
    },
    {
      fetchImpl,
      persistentCache: false,
      retryAttempts: options.retryAttempts ?? 1,
      retryDelayMs: options.retryDelayMs ?? 0,
      timeoutMs: options.timeoutMs || 50,
    }
  );
}

function classSummary(result) {
  return {
    highest: result.hydraulic.highest_class,
    matched: result.hydraulic.matched_classes,
    status: result.hydraulic.status,
  };
}

function firstLayer(result, className = "P1") {
  return result.hydraulic.layer_results.find(
    (item) => item.className === className
  );
}

assert.deepEqual(FLOOD_CLASS_SEVERITY_ORDER, ["P1", "P2", "P3"]);
assert.equal(highestFloodClass(["P2", "P1", "P3"]), "P3");
assert.deepEqual(LANDSLIDE_HAZARD_ORDER, ["P1", "P2", "P3", "P4"]);
assert.equal(highestLandslideHazardClass(["P2", "P4", "P1"]), "P4");
assert.equal(normalizeLandslideClass(0), "AA");
assert.equal(normalizeLandslideClass(4), "P4");

function nearbyRadiusFromUrl(url) {
  const filter = url.searchParams.get("CQL_FILTER") || "";
  const match = filter.match(/,(\d+),meters\)$/);

  return match ? Number(match[1]) : null;
}

const nearbyContextFetch = async (url) => {
  const layerName = layerNameFromUrl(url);
  const radiusM = nearbyRadiusFromUrl(url);

  if (!radiusM) {
    return jsonResponse(featureCollection({ empty: true }));
  }

  if (
    layerName === "nz1:aree_peric_idraulica_p2" &&
    radiusM >= 5_000
  ) {
    return jsonResponse({
      features: [
        {
          geometry: null,
          properties: {
            scenariop2: "Pericolosita idraulica media",
          },
          type: "Feature",
        },
      ],
      type: "FeatureCollection",
    });
  }

  if (
    layerName === "idrogeo:pericolosita_frane" &&
    radiusM >= 10_000
  ) {
    return jsonResponse({
      features: [
        {
          geometry: null,
          properties: {
            cod_per_it: 2,
          },
          type: "Feature",
        },
        {
          geometry: null,
          properties: {
            cod_per_it: 4,
          },
          type: "Feature",
        },
      ],
      type: "FeatureCollection",
    });
  }

  return jsonResponse(featureCollection({ empty: true }));
};

const nearbyHydraulic = await queryNearbyOfficialHazardContext(
  "hydraulic",
  point,
  {
    bypassCache: true,
    fetchImpl: nearbyContextFetch,
    timeoutMs: 50,
  }
);
assert.equal(nearbyHydraulic.status, "available");
assert.equal(nearbyHydraulic.point_intersection, false);
assert.equal(nearbyHydraulic.search_radius_km, 5);
assert.deepEqual(nearbyHydraulic.classes, ["P2"]);

const nearbyLandslide = await queryNearbyOfficialHazardContext(
  "landslide",
  point,
  {
    bypassCache: true,
    fetchImpl: nearbyContextFetch,
    timeoutMs: 50,
  }
);
assert.equal(nearbyLandslide.status, "available");
assert.equal(nearbyLandslide.point_intersection, false);
assert.equal(nearbyLandslide.search_radius_km, 10);
assert.deepEqual(nearbyLandslide.classes, ["P2", "P4"]);
assert.equal(nearbyLandslide.highest_hazard_class, "P4");

const contextualResult = await evaluatePointHazardExposure(
  {
    hazards: ["hydraulic", "landslide"],
    include_nearby_context: true,
    ...point,
  },
  {
    bypassCache: true,
    fetchImpl: nearbyContextFetch,
    persistentCache: false,
    retryAttempts: 1,
    timeoutMs: 50,
  }
);
assert.equal(contextualResult.hydraulic.status, "no_intersection");
assert.equal(
  contextualResult.hydraulic.presentation_status,
  "nearby_official_context"
);
assert.deepEqual(
  contextualResult.hydraulic.nearby_context.classes,
  ["P2"]
);
assert.equal(contextualResult.landslide.status, "no_intersection");
assert.equal(
  contextualResult.landslide.presentation_status,
  "nearby_official_context"
);
assert.equal(
  contextualResult.landslide.nearby_context.highest_hazard_class,
  "P4"
);

const capturedUrls = [];
let result = await query(async (url) => {
  capturedUrls.push(new URL(url.toString()));

  return jsonResponse(featureCollection({ empty: true }));
});
const p1RequestUrl = capturedUrls.find(
  (url) => layerClassFromUrl(url) === "P1"
);
assert.equal(p1RequestUrl.searchParams.get("version"), "2.0.0");
assert.equal(
  p1RequestUrl.searchParams.get("typeNames"),
  "nz1:aree_peric_idraulica_p1"
);
assert.equal(p1RequestUrl.searchParams.get("typeName"), null);
assert.equal(p1RequestUrl.searchParams.get("srsName"), "EPSG:4326");
assert.equal(
  p1RequestUrl.searchParams.get("CQL_FILTER"),
  "INTERSECTS(geom,SRID=4326;POINT(7 45))"
);
assert.equal(p1RequestUrl.searchParams.get("count"), "1");
assert.equal(p1RequestUrl.searchParams.get("propertyName"), "scenariop1");
assert.equal(p1RequestUrl.searchParams.get("bbox"), null);
assert.equal(result.hydraulic.source.request_crs, "EPSG:4326");
assert.equal(result.hydraulic.source.query_method, "server_side_point_intersection");
assert.equal(result.hydraulic.source.filter_axis_order, "longitude_latitude");
assert.equal(result.hydraulic.source.filter_crs, "EPSG:4326");
assert.equal(result.hydraulic.source.endpoint_identifier, "ispra-nz1-wfs");
assert.equal(result.hydraulic.source.source_dataset_version, null);
assert.notEqual(
  result.hydraulic.source.provider_version,
  result.hydraulic.source.source_dataset_version
);
assert.equal(firstLayer(result).request.request_crs, "EPSG:4326");
assert.equal(
  firstLayer(result).request.query_method,
  "server_side_point_intersection"
);
assert.equal(firstLayer(result).request.filter_axis_order, "longitude_latitude");
assert.equal(firstLayer(result).request.filter_geometry_property, "geom");
assert.equal(
  firstLayer(result).request.response_property,
  "scenariop1"
);

result = await query(fetchWithoutFeatures());
assert.deepEqual(classSummary(result), {
  highest: null,
  matched: [],
  status: "no_intersection",
});
assert.equal(result.hydraulic.normalized_score, null);
assert.equal(result.hydraulic.assessment_complete, true);
assert.equal(result.hydraulic.decision_status, "no_intersection");

result = await query(fetchForClasses([]));
assert.deepEqual(classSummary(result), {
  highest: null,
  matched: [],
  status: "no_intersection",
});
assert.equal(result.hydraulic.layer_results[0].feature_count, 1);

result = await query(fetchForClasses(["P1"]));
assert.deepEqual(classSummary(result), {
  highest: "P1",
  matched: ["P1"],
  status: "available",
});
assert.equal(result.hydraulic.intersects_p1, true);
assert.equal(result.hydraulic.intersects_p2, false);
assert.equal(result.hydraulic.assessment_complete, true);
assert.equal(result.hydraulic.decision_status, "available_complete");
assert.equal(firstLayer(result, "P1").response_size_bytes > 0, true);

result = await query(fetchForClasses(["P1", "P2"]));
assert.deepEqual(classSummary(result), {
  highest: "P2",
  matched: ["P1", "P2"],
  status: "available",
});

result = await query(fetchForClasses(["P1", "P2", "P3"]));
assert.deepEqual(classSummary(result), {
  highest: "P3",
  matched: ["P1", "P2", "P3"],
  status: "available",
});

result = await query(
  fetchWithGeometryForClass("P2", {
    coordinates: [
      [
        [
          [8, 46],
          [8.1, 46],
          [8.1, 46.1],
          [8, 46.1],
          [8, 46],
        ],
      ],
      [
        [
          [6.99, 44.99],
          [7.01, 44.99],
          [7.01, 45.01],
          [6.99, 45.01],
          [6.99, 44.99],
        ],
      ],
    ],
    type: "MultiPolygon",
  })
);
assert.deepEqual(classSummary(result), {
  highest: "P2",
  matched: ["P2"],
  status: "available",
});

result = await query(
  fetchWithGeometryForClass("P3", {
    coordinates: [
      [
        [6.99, 44.99],
        [7.01, 44.99],
        [7.01, 45.01],
        [6.99, 45.01],
        [6.99, 44.99],
      ],
    ],
    type: "Polygon",
  }),
  {
    latitude: 44.99,
    longitude: 7,
  }
);
assert.deepEqual(classSummary(result), {
  highest: "P3",
  matched: ["P3"],
  status: "available",
});

result = await query(
  fetchWithGeometryForClass("P1", {
    coordinates: [
      [
        [6.98, 44.98],
        [7.02, 44.98],
        [7.02, 45.02],
        [6.98, 45.02],
        [6.98, 44.98],
      ],
      [
        [6.99, 44.99],
        [7.01, 44.99],
        [7.01, 45.01],
        [6.99, 45.01],
        [6.99, 44.99],
      ],
    ],
    type: "Polygon",
  })
);
assert.deepEqual(classSummary(result), {
  highest: null,
  matched: [],
  status: "no_intersection",
});

result = await query(async () =>
  textResponse({
    body: "<ows:ExceptionReport><ows:ExceptionText>bad version</ows:ExceptionText></ows:ExceptionReport>",
    contentType: "application/xml",
  })
);
assert.equal(result.hydraulic.status, "provider_exception");
assert.equal(result.hydraulic.highest_class, null);

for (const status of [400, 404, 500]) {
  result = await query(async () =>
    textResponse({
      body: `HTTP ${status}`,
      contentType: "text/plain",
      ok: false,
      status,
      statusText: "HTTP Error",
    })
  );
  assert.equal(result.hydraulic.status, "http_error");
  assert.equal(result.hydraulic.layer_results[0].http_status, status);
}

result = await query(
  async (_url, { signal }) =>
    new Promise((resolve, reject) => {
      signal.addEventListener("abort", () => {
        const error = new Error("request timeout");

        error.name = "AbortError";
        reject(error);
      });
    }),
  point,
  {
    timeoutMs: 5,
  }
);
assert.equal(result.hydraulic.status, "request_timeout");
assert.equal(result.hydraulic.highest_class, null);
assert.equal(result.hydraulic.confidence, "source_unavailable");

result = await query(async () => {
  throw new TypeError("fetch failed");
});
assert.equal(result.hydraulic.status, "service_unreachable");
assert.equal(result.hydraulic.highest_class, null);
assert.equal(result.hydraulic.confidence, "source_unavailable");

result = await query(async () =>
  textResponse({
    body: JSON.stringify(featureCollection({ contains: true })),
    contentType: "text/plain",
  })
);
assert.equal(result.hydraulic.status, "invalid_response");
assert.equal(result.hydraulic.highest_class, null);

result = await query(async () =>
  mockResponse({
    body: "",
    contentType: "application/json",
  })
);
assert.equal(result.hydraulic.status, "invalid_response");
assert.equal(result.hydraulic.highest_class, null);

result = await query(async () =>
  mockResponse({
    body: "{not geojson",
    contentType: "application/json",
  })
);
assert.equal(result.hydraulic.status, "invalid_response");
assert.equal(result.hydraulic.highest_class, null);

const fallbackUrls = [];
result = await query(async (url) => {
  fallbackUrls.push(new URL(url.toString()));

  if (url.searchParams.get("version") === "2.0.0") {
    return textResponse({
      body: "<ows:ExceptionReport><ows:ExceptionText>typeNames unsupported</ows:ExceptionText></ows:ExceptionReport>",
      contentType: "application/xml",
    });
  }

  return fetchForClasses(["P1"])(url);
});
assert.equal(result.hydraulic.status, "available");
assert.equal(result.hydraulic.source.fallback_used, true);
assert.equal(result.hydraulic.layer_results[0].requested_version, "2.0.0");
assert.equal(result.hydraulic.layer_results[0].resolved_version, "1.1.0");
assert.equal(result.hydraulic.layer_results[0].fallback_used, true);
assert.equal(result.hydraulic.layer_results[0].original_error.status, "provider_exception");
const fallbackP1Url = fallbackUrls.find(
  (url) =>
    url.searchParams.get("version") === "1.1.0" &&
    layerClassFromUrl(url) === "P1"
);
assert.equal(fallbackP1Url.searchParams.get("typeName"), "nz1:aree_peric_idraulica_p1");
assert.equal(fallbackP1Url.searchParams.get("typeNames"), null);
assert.equal(
  fallbackP1Url.searchParams.get("CQL_FILTER"),
  "INTERSECTS(geom,SRID=4326;POINT(7 45))"
);
assert.equal(fallbackP1Url.searchParams.get("maxFeatures"), "1");
assert.equal(fallbackP1Url.searchParams.get("propertyName"), "scenariop1");
assert.equal(fallbackP1Url.searchParams.get("bbox"), null);

result = await query(async (url) => {
  const className = layerClassFromUrl(url);

  if (className === "P3") {
    return textResponse({
      body: "provider error",
      contentType: "text/plain",
      ok: false,
      status: 500,
      statusText: "Server Error",
    });
  }

  return fetchForClasses(["P1"])(url);
});
assert.equal(result.hydraulic.status, "partial");
assert.deepEqual(result.hydraulic.matched_classes, ["P1"]);
assert.equal(result.hydraulic.layer_results[2].status, "http_error");
assert.equal(result.hydraulic.assessment_complete, false);
assert.equal(result.hydraulic.decision_status, "available_partial");
assert.deepEqual(
  result.hydraulic.coverage.failed_layers.map((layer) => layer.class_name),
  ["P3"]
);

const retryCalls = new Map();
result = await query(
  async (url) => {
    const className = layerClassFromUrl(url);
    const attempt = (retryCalls.get(className) || 0) + 1;

    retryCalls.set(className, attempt);

    if (className === "P1" && attempt === 1) {
      throw new TypeError("transient fetch failure");
    }

    return fetchForClasses(["P1"])(url);
  },
  point,
  {
    retryAttempts: 2,
    retryDelayMs: 0,
  }
);
assert.equal(retryCalls.get("P1"), 2);
assert.equal(firstLayer(result, "P1").attempts, 2);
assert.equal(result.hydraulic.decision_status, "available_complete");

clearHazardExposureCache();
const layerCacheCalls = [];
const partialFirst = await evaluatePointHazardExposure(
  {
    hazards: ["hydraulic"],
    ...point,
  },
  {
    fetchImpl: async (url) => {
      const className = layerClassFromUrl(url);

      layerCacheCalls.push(`first:${className}`);

      if (className === "P3") {
        return textResponse({
          body: "temporary upstream failure",
          contentType: "text/plain",
          ok: false,
          status: 503,
          statusText: "Service Unavailable",
        });
      }

      return fetchForClasses(["P1"])(url);
    },
    retryAttempts: 1,
    retryDelayMs: 0,
    timeoutMs: 50,
  }
);
assert.equal(partialFirst.hydraulic.decision_status, "available_partial");

const recoveryCalls = [];
const completedFromLayerCache = await evaluatePointHazardExposure(
  {
    hazards: ["hydraulic"],
    ...point,
  },
  {
    fetchImpl: async (url) => {
      recoveryCalls.push(layerClassFromUrl(url));

      return fetchForClasses(["P1"])(url);
    },
    retryAttempts: 1,
    retryDelayMs: 0,
    timeoutMs: 50,
  }
);
assert.deepEqual(recoveryCalls, ["P3"]);
assert.equal(firstLayer(completedFromLayerCache, "P1").cache.hit, true);
assert.equal(firstLayer(completedFromLayerCache, "P2").cache.hit, true);
assert.equal(completedFromLayerCache.hydraulic.assessment_complete, true);
assert.equal(
  completedFromLayerCache.hydraulic.decision_status,
  "available_complete"
);

clearHazardExposureCache();
let deduplicatedFetchCalls = 0;
const delayedFetch = async (url) => {
  deduplicatedFetchCalls += 1;
  await new Promise((resolve) => setTimeout(resolve, 5));

  return fetchForClasses(["P2"])(url);
};
const concurrentResults = await Promise.all([
  queryIspraFloodExposure(point, {
    fetchImpl: delayedFetch,
    persistentCache: false,
    retryAttempts: 1,
    retryDelayMs: 0,
    timeoutMs: 50,
  }),
  queryIspraFloodExposure(point, {
    fetchImpl: delayedFetch,
    persistentCache: false,
    retryAttempts: 1,
    retryDelayMs: 0,
    timeoutMs: 50,
  }),
]);
assert.equal(deduplicatedFetchCalls, 3);
assert.equal(
  concurrentResults.some((exposure) =>
    exposure.layer_results.every((layer) => layer.cache?.deduplicated)
  ),
  true
);

const persistentCacheDirectory = fs.mkdtempSync(
  path.join(os.tmpdir(), "arcus-hydraulic-observations-")
);

try {
  clearHazardExposureCache();
  const persistedLive = await queryIspraFloodExposure(point, {
    fetchImpl: fetchForClasses(["P1"]),
    persistentCache: true,
    persistentCacheDir: persistentCacheDirectory,
    retryAttempts: 1,
    retryDelayMs: 0,
    timeoutMs: 50,
  });

  assert.equal(persistedLive.decision_status, "available_complete");
  assert.equal(
    fs.readdirSync(persistentCacheDirectory).filter(
      (fileName) => fileName.endsWith(".json")
    ).length,
    3
  );

  clearHazardExposureCache();
  let outageFetchCalls = 0;
  const persistedAfterRestart = await queryIspraFloodExposure(point, {
    fetchImpl: async () => {
      outageFetchCalls += 1;
      throw new TypeError("offline");
    },
    persistentCache: true,
    persistentCacheDir: persistentCacheDirectory,
    retryAttempts: 1,
    retryDelayMs: 0,
    timeoutMs: 50,
  });

  assert.equal(outageFetchCalls, 0);
  assert.equal(persistedAfterRestart.assessment_complete, true);
  assert.equal(
    persistedAfterRestart.source.observation_mode,
    "persistent_cache"
  );
  assert.equal(
    persistedAfterRestart.source.layer_cache.persistent_hit_count,
    3
  );
  assert.equal(
    persistedAfterRestart.layer_results.every(
      (layer) =>
        layer.cache?.tier === "persistent" &&
        layer.observation?.freshness_status === "current"
    ),
    true
  );

  clearHazardExposureCache();
  const staleReferenceTime = Date.now() + 7 * 60 * 60 * 1000;
  const staleDuringOutage = await queryIspraFloodExposure(point, {
    fetchImpl: async () => {
      throw new TypeError("offline");
    },
    nowImpl: () => staleReferenceTime,
    persistentCache: true,
    persistentCacheDir: persistentCacheDirectory,
    retryAttempts: 1,
    retryDelayMs: 0,
    timeoutMs: 50,
  });

  assert.equal(staleDuringOutage.assessment_complete, false);
  assert.equal(staleDuringOutage.decision_status, "source_incomplete");
  assert.equal(staleDuringOutage.source.last_known_good_layers.length, 3);
  assert.equal(
    staleDuringOutage.source.last_known_good_layers.every(
      (layer) => layer.freshness_status === "stale"
    ),
    true
  );
  assert.deepEqual(staleDuringOutage.matched_classes, []);

  clearHazardExposureCache();
  let bypassFetchCalls = 0;
  const bypassedPersistentCache = await queryIspraFloodExposure(point, {
    bypassCache: true,
    fetchImpl: async (url) => {
      bypassFetchCalls += 1;

      return fetchForClasses(["P2"])(url);
    },
    persistentCache: true,
    persistentCacheDir: persistentCacheDirectory,
    retryAttempts: 1,
    retryDelayMs: 0,
    timeoutMs: 50,
  });

  assert.equal(bypassFetchCalls, 3);
  assert.deepEqual(bypassedPersistentCache.matched_classes, ["P2"]);
  assert.equal(bypassedPersistentCache.source.observation_mode, "live");
} finally {
  fs.rmSync(persistentCacheDirectory, {
    force: true,
    recursive: true,
  });
}

clearHazardExposureCache();
let circuitFetchCalls = 0;
let circuitResult;

for (let attempt = 0; attempt < 4; attempt += 1) {
  circuitResult = await queryIspraFloodExposure(point, {
    bypassCache: true,
    fetchImpl: async () => {
      circuitFetchCalls += 1;

      return textResponse({
        body: "upstream unavailable",
        contentType: "text/plain",
        ok: false,
        status: 503,
        statusText: "Service Unavailable",
      });
    },
    persistentCache: false,
    retryAttempts: 1,
    retryDelayMs: 0,
    timeoutMs: 50,
  });
}

assert.equal(circuitFetchCalls, 9);
assert.equal(
  circuitResult.layer_results.every(
    (layer) => layer.status === "circuit_open"
  ),
  true
);
assert.equal(circuitResult.source.circuit_breaker.open_layer_count, 3);
assert.equal(circuitResult.decision_status, "source_incomplete");

clearHazardExposureCache();
let activeRemoteCalls = 0;
let maximumRemoteCalls = 0;
const concurrencyFetch = async () => {
  activeRemoteCalls += 1;
  maximumRemoteCalls = Math.max(maximumRemoteCalls, activeRemoteCalls);
  await new Promise((resolve) => setTimeout(resolve, 5));
  activeRemoteCalls -= 1;

  return jsonResponse(featureCollection({ empty: true }));
};

await Promise.all(
  [
    point,
    { latitude: 45.1, longitude: 7.1 },
    { latitude: 45.2, longitude: 7.2 },
  ].map((testPoint) =>
    queryIspraFloodExposure(testPoint, {
      bypassCache: true,
      fetchImpl: concurrencyFetch,
      persistentCache: false,
      retryAttempts: 1,
      retryDelayMs: 0,
      timeoutMs: 50,
    })
  )
);
assert.equal(maximumRemoteCalls <= 6, true);

result = await query(fetchForClasses(["P1"]), {
  latitude: 120,
  longitude: 7,
});
assert.equal(result.hydraulic.status, "point_not_selected");
assert.equal(result.hydraulic.highest_class, null);

clearHazardExposureCache();
const originalNodeEnv = process.env.NODE_ENV;
process.env.NODE_ENV = "development";
const cachedFirst = await evaluatePointHazardExposure(
  {
    hazards: ["hydraulic"],
    ...point,
  },
  {
    fetchImpl: fetchForClasses(["P1"]),
    timeoutMs: 50,
  }
);
const bypassedSecond = await evaluatePointHazardExposure(
  {
    bypassCache: true,
    hazards: ["hydraulic"],
    ...point,
  },
  {
    fetchImpl: fetchForClasses(["P2"]),
    timeoutMs: 50,
  }
);
process.env.NODE_ENV = originalNodeEnv;
assert.deepEqual(cachedFirst.hydraulic.matched_classes, ["P1"]);
assert.deepEqual(bypassedSecond.hydraulic.matched_classes, ["P2"]);
assert.equal(bypassedSecond.cache.hit, false);
assert.equal(bypassedSecond.cache.bypass, true);

const first = await query(fetchForClasses(["P1", "P2"]));
const second = await evaluatePointHazardExposure(
  {
    hazards: ["hydraulic"],
    ...point,
  },
  {
    fetchImpl: fetchForClasses(["P1", "P2"]),
    timeoutMs: 50,
  }
);
assert.deepEqual(classSummary(first), classSummary(second));
assert.equal(second.cache.hit, true);

assert.notEqual(
  (await query(fetchWithoutFeatures())).hydraulic.status,
  (await query(async () => {
    throw new TypeError("fetch failed");
  })).hydraulic.status
);

const landslideFeature = (code, contains = true) => ({
  geometry: polygonFeature({ contains }).geometry,
  properties: {
    cod_per_it: code,
    id: `landslide-${code}`,
  },
  type: "Feature",
});

const landslideFetch = ({
  code = 3,
  contains = true,
  failHydraulic = false,
  failLandslide = false,
  unknownClass = false,
} = {}) => async (url) => {
  const layerName = layerNameFromUrl(url);

  if (layerName === "idrogeo:pericolosita_frane") {
    if (failLandslide) {
      return textResponse({
        body: "landslide failed",
        contentType: "text/plain",
        ok: false,
        status: 500,
        statusText: "Server Error",
      });
    }

    return jsonResponse({
      features: [
        {
          ...landslideFeature(unknownClass ? 99 : code, contains),
        },
      ],
      type: "FeatureCollection",
    });
  }

  if (failHydraulic) {
    return textResponse({
      body: "hydraulic failed",
      contentType: "text/plain",
      ok: false,
      status: 500,
      statusText: "Server Error",
    });
  }

  return fetchForClasses(["P1"])(url);
};

let directLandslide = await queryIspraLandslideExposure(point, {
  fetchImpl: landslideFetch({ code: 4 }),
  persistentCache: false,
  requestId: "direct-provider-p4",
  timeoutMs: 50,
});
assert.equal(directLandslide.status, "available");
assert.deepEqual(directLandslide.matched_hazard_classes, ["P4"]);
assert.equal(directLandslide.highest_hazard_class, "P4");
assert.equal(directLandslide.normalized_score, null);

let registeredLandslide = await queryRegisteredHazardProvider(
  "landslide",
  point,
  {
    fetchImpl: landslideFetch({ code: 4 }),
    persistentCache: false,
    requestId: "registry-provider-p4",
    timeoutMs: 50,
  }
);
assert.equal(registeredLandslide.status, "available");
assert.deepEqual(registeredLandslide.matched_hazard_classes, ["P4"]);
assert.equal(registeredLandslide.highest_hazard_class, "P4");
assert.equal(registeredLandslide.normalized_score, null);

directLandslide = await queryIspraLandslideExposure(
  point.latitude,
  point.longitude
);
assert.equal(directLandslide.status, "invalid_coordinates");
assert.equal(directLandslide.error.stage, "coordinates_validated");
assert.equal(directLandslide.error.code, "signature_mismatch");
assert.equal(directLandslide.source.provider_version, "ispra-landslide-pai-wfs-v2");
assert.equal(Boolean(directLandslide.attempted_at), true);

result = await queryHazards(landslideFetch({ code: 4 }), ["landslide"]);
assert.equal(result.hydraulic, undefined);
assert.equal(result.landslide.status, "available");
assert.deepEqual(result.landslide.matched_hazard_classes, ["P4"]);
assert.equal(result.landslide.highest_hazard_class, "P4");
assert.equal(result.landslide.attention_area, false);
assert.equal(result.landslide.normalized_score, null);
assert.equal(result.landslide.source.source_dataset_version, "5.0");
assert.equal(result.landslide.source.source_reference_year, 2024);
assert.equal(result.landslide.source.filter_axis_order, "longitude_latitude");
assert.equal(result.landslide.assessment_complete, true);
assert.equal(result.landslide.decision_status, "available_complete");
const landslideRequestUrl = new URL(
  result.landslide.layer_results[0].request.url
);
assert.equal(landslideRequestUrl.searchParams.get("bbox"), null);
assert.equal(
  landslideRequestUrl.searchParams.get("CQL_FILTER"),
  "INTERSECTS(geom,SRID=4326;POINT(7 45))"
);
assert.equal(
  landslideRequestUrl.searchParams.get("propertyName"),
  "cod_per_it"
);
assert.equal(result.landslide.source.query_method, "server_side_point_intersection");
assert.equal(result.landslide.layer_results[0].response_size_bytes > 0, true);

result = await queryHazards(landslideFetch({ code: 0 }), ["landslide"]);
assert.equal(result.landslide.status, "available");
assert.deepEqual(result.landslide.matched_hazard_classes, []);
assert.deepEqual(result.landslide.matched_attention_classes, ["AA"]);
assert.equal(result.landslide.highest_hazard_class, null);
assert.equal(result.landslide.attention_area, true);
assert.equal(result.landslide.normalized_score, null);

result = await queryHazards(
  landslideFetch({ code: 3, contains: false }),
  ["landslide"]
);
assert.equal(result.landslide.status, "no_intersection");
assert.deepEqual(result.landslide.matched_hazard_classes, []);
assert.equal(result.landslide.attention_area, false);

result = await queryHazards(
  landslideFetch({ code: 3 }),
  ["hydraulic", "landslide"]
);
assert.equal(result.hydraulic.status, "available");
assert.equal(result.landslide.status, "available");
assert.notEqual(result.hydraulic.normalized_score, 0);
assert.equal(result.hydraulic.normalized_score, null);
assert.equal(result.landslide.normalized_score, null);
assert.match(result.cache.key, /hydraulic@ispra-flood-wfs-v2@source-null/);
assert.match(
  result.cache.key,
  /landslide@ispra-landslide-pai-wfs-v2@source-5\.0-2024/
);

result = await queryHazards(
  landslideFetch({ failLandslide: true }),
  ["hydraulic", "landslide"]
);
assert.equal(result.hydraulic.status, "available");
assert.equal(result.landslide.status, "http_error");

result = await queryHazards(
  landslideFetch({ failHydraulic: true, code: 2 }),
  ["hydraulic", "landslide"]
);
assert.equal(result.hydraulic.status, "http_error");
assert.equal(result.landslide.status, "available");
assert.deepEqual(result.landslide.matched_hazard_classes, ["P2"]);

result = await queryHazards(landslideFetch({ code: 4 }), ["unknown"]);
assert.equal(result.hydraulic, undefined);
assert.equal(result.landslide, undefined);

result = await queryHazards(landslideFetch({ unknownClass: true }), [
  "landslide",
]);
assert.equal(result.landslide.status, "schema_mismatch");
assert.equal(result.landslide.normalized_score, null);
assert.equal(result.landslide.assessment_complete, false);
assert.equal(result.landslide.decision_status, "source_incomplete");
assert.deepEqual(result.landslide.matched_hazard_classes, []);

clearHazardExposureCache();
let landslideRetryCalls = 0;
const landslideRetried = await queryIspraLandslideExposure(point, {
  fetchImpl: async (url) => {
    landslideRetryCalls += 1;

    if (landslideRetryCalls === 1) {
      throw new TypeError("temporary landslide outage");
    }

    return landslideFetch({ code: 2 })(url);
  },
  persistentCache: false,
  retryAttempts: 2,
  retryDelayMs: 0,
  timeoutMs: 50,
});
assert.equal(landslideRetryCalls, 2);
assert.equal(landslideRetried.decision_status, "available_complete");
assert.equal(landslideRetried.layer_results[0].attempts, 2);

clearHazardExposureCache();
let landslideDeduplicatedCalls = 0;
const delayedLandslideFetch = async (url) => {
  landslideDeduplicatedCalls += 1;
  await new Promise((resolve) => setTimeout(resolve, 5));

  return landslideFetch({ code: 3 })(url);
};
const deduplicatedLandslideResults = await Promise.all([
  queryIspraLandslideExposure(point, {
    fetchImpl: delayedLandslideFetch,
    persistentCache: false,
    retryAttempts: 1,
    timeoutMs: 50,
  }),
  queryIspraLandslideExposure(point, {
    fetchImpl: delayedLandslideFetch,
    persistentCache: false,
    retryAttempts: 1,
    timeoutMs: 50,
  }),
]);
assert.equal(landslideDeduplicatedCalls, 1);
assert.equal(
  deduplicatedLandslideResults.some(
    (exposure) => exposure.layer_results[0].cache?.deduplicated
  ),
  true
);

const landslidePersistentDirectory = fs.mkdtempSync(
  path.join(os.tmpdir(), "arcus-landslide-observations-")
);

try {
  clearHazardExposureCache();
  const persistedLandslide = await queryIspraLandslideExposure(point, {
    fetchImpl: landslideFetch({ code: 4 }),
    persistentCache: true,
    persistentCacheDir: landslidePersistentDirectory,
    retryAttempts: 1,
    timeoutMs: 50,
  });

  assert.equal(persistedLandslide.decision_status, "available_complete");
  assert.equal(
    fs.readdirSync(landslidePersistentDirectory).filter(
      (fileName) => fileName.endsWith(".json")
    ).length,
    1
  );

  clearHazardExposureCache();
  let landslideOutageCalls = 0;
  const landslideAfterRestart = await queryIspraLandslideExposure(point, {
    fetchImpl: async () => {
      landslideOutageCalls += 1;
      throw new TypeError("offline");
    },
    persistentCache: true,
    persistentCacheDir: landslidePersistentDirectory,
    retryAttempts: 1,
    timeoutMs: 50,
  });

  assert.equal(landslideOutageCalls, 0);
  assert.equal(landslideAfterRestart.assessment_complete, true);
  assert.equal(
    landslideAfterRestart.source.observation_mode,
    "persistent_cache"
  );
  assert.deepEqual(
    landslideAfterRestart.matched_hazard_classes,
    ["P4"]
  );

  clearHazardExposureCache();
  const staleLandslide = await queryIspraLandslideExposure(point, {
    fetchImpl: async () => {
      throw new TypeError("offline");
    },
    nowImpl: () => Date.now() + 7 * 60 * 60 * 1000,
    persistentCache: true,
    persistentCacheDir: landslidePersistentDirectory,
    retryAttempts: 1,
    timeoutMs: 50,
  });

  assert.equal(staleLandslide.assessment_complete, false);
  assert.equal(staleLandslide.decision_status, "source_incomplete");
  assert.deepEqual(staleLandslide.matched_hazard_classes, []);
  assert.equal(
    staleLandslide.source.last_known_good_layers[0].freshness_status,
    "stale"
  );

  clearHazardExposureCache();
  let landslideBypassCalls = 0;
  const bypassedLandslide = await queryIspraLandslideExposure(point, {
    bypassCache: true,
    fetchImpl: async (url) => {
      landslideBypassCalls += 1;
      return landslideFetch({ code: 1 })(url);
    },
    persistentCache: true,
    persistentCacheDir: landslidePersistentDirectory,
    retryAttempts: 1,
    timeoutMs: 50,
  });

  assert.equal(landslideBypassCalls, 1);
  assert.deepEqual(bypassedLandslide.matched_hazard_classes, ["P1"]);
  assert.equal(bypassedLandslide.source.observation_mode, "live");
} finally {
  fs.rmSync(landslidePersistentDirectory, {
    force: true,
    recursive: true,
  });
}

clearHazardExposureCache();
let landslideCircuitCalls = 0;
let landslideCircuitResult;

for (let attempt = 0; attempt < 4; attempt += 1) {
  landslideCircuitResult = await queryIspraLandslideExposure(point, {
    bypassCache: true,
    fetchImpl: async () => {
      landslideCircuitCalls += 1;
      return textResponse({
        body: "upstream unavailable",
        ok: false,
        status: 503,
        statusText: "Service Unavailable",
      });
    },
    persistentCache: false,
    retryAttempts: 1,
    timeoutMs: 50,
  });
}

assert.equal(landslideCircuitCalls, 3);
assert.equal(landslideCircuitResult.status, "circuit_open");
assert.equal(landslideCircuitResult.decision_status, "source_incomplete");

clearHazardExposureCache();
let activeLandslideCalls = 0;
let maximumLandslideCalls = 0;
const concurrencyLandslideFetch = async () => {
  activeLandslideCalls += 1;
  maximumLandslideCalls = Math.max(
    maximumLandslideCalls,
    activeLandslideCalls
  );
  await new Promise((resolve) => setTimeout(resolve, 5));
  activeLandslideCalls -= 1;

  return jsonResponse({
    features: [],
    type: "FeatureCollection",
  });
};

await Promise.all(
  Array.from({ length: 8 }, (_, index) =>
    queryIspraLandslideExposure(
      {
        latitude: 40 + index / 100,
        longitude: 10 + index / 100,
      },
      {
        bypassCache: true,
        fetchImpl: concurrencyLandslideFetch,
        persistentCache: false,
        retryAttempts: 1,
        timeoutMs: 50,
      }
    )
  )
);
assert.equal(maximumLandslideCalls <= 6, true);

result = await queryHazards(landslideFetch({ code: 4 }), [
  "hydraulic",
  "landslide",
]);
assert.equal(result.query.latitude, point.latitude);
assert.equal(result.query.longitude, point.longitude);
assert.deepEqual(result.query.hazards, ["hydraulic", "landslide"]);
assert.equal(result.overall_status, "available");
assert.equal(Object.hasOwn(result, "hydraulic"), true);
assert.equal(Object.hasOwn(result, "landslide"), true);
assert.equal(result.data_contract, "arcus-point-hazard-exposure-v1");
assert.equal(result.coverage.complete_response, true);
assert.equal(result.coverage.official_data_complete, true);
assert.deepEqual(result.coverage.unresolved_hazards, []);

result = await queryHazards(async (url, { signal }) => {
  if (layerClassFromUrl(url)) {
    return new Promise((resolve, reject) => {
      signal.addEventListener("abort", () => {
        const error = new Error("request timeout");

        error.name = "AbortError";
        reject(error);
      });
    });
  }

  return landslideFetch({ code: 4 })(url, { signal });
}, ["hydraulic", "landslide"], point, {
  timeoutMs: 5,
});
assert.equal(result.hydraulic.status, "request_timeout");
assert.equal(result.landslide.status, "available");
assert.equal(result.landslide.highest_hazard_class, "P4");
assert.equal(result.overall_status, "partial");

result = await queryHazards(async (url, { signal }) => {
  if (layerClassFromUrl(url)) {
    return new Promise((resolve, reject) => {
      signal.addEventListener("abort", () => {
        const error = new Error("request timeout");

        error.name = "AbortError";
        reject(error);
      });
    });
  }

  return landslideFetch({ code: 4, contains: false })(url, { signal });
}, ["hydraulic", "landslide"], point, {
  timeoutMs: 5,
});
assert.equal(result.hydraulic.status, "request_timeout");
assert.equal(result.landslide.status, "no_intersection");
assert.equal(result.overall_status, "partial");

result = await queryHazards(async (url, { signal }) => {
  if (layerNameFromUrl(url) === "idrogeo:pericolosita_frane") {
    return new Promise((resolve, reject) => {
      signal.addEventListener("abort", () => {
        const error = new Error("request timeout");

        error.name = "AbortError";
        reject(error);
      });
    });
  }

  return fetchForClasses(["P2"])(url, { signal });
}, ["hydraulic", "landslide"], point, {
  timeoutMs: 5,
});
assert.equal(result.hydraulic.status, "available");
assert.equal(result.landslide.status, "request_timeout");
assert.equal(result.overall_status, "partial");

result = await queryHazards(async (_url, { signal }) =>
  new Promise((resolve, reject) => {
    signal.addEventListener("abort", () => {
      const error = new Error("request timeout");

      error.name = "AbortError";
      reject(error);
    });
  }), ["hydraulic", "landslide"], point, {
  timeoutMs: 5,
});
assert.equal(result.hydraulic.status, "request_timeout");
assert.equal(result.landslide.status, "request_timeout");
assert.equal(result.overall_status, "request_timeout");

result = await queryHazards(async (url, { signal }) => {
  if (layerClassFromUrl(url)) {
    throw new TypeError("hydraulic network failure");
  }

  return landslideFetch({ code: 3 })(url, { signal });
}, ["hydraulic", "landslide"]);
assert.equal(result.hydraulic.status, "service_unreachable");
assert.equal(result.landslide.status, "available");
assert.equal(result.overall_status, "partial");

result = await queryHazards(async (url, { signal }) => {
  if (layerNameFromUrl(url) === "idrogeo:pericolosita_frane") {
    throw new Error("landslide provider exploded");
  }

  return fetchForClasses(["P1"])(url, { signal });
}, ["hydraulic", "landslide"]);
assert.equal(result.hydraulic.status, "available");
assert.equal(result.landslide.status, "service_unreachable");
assert.equal(result.overall_status, "partial");

const observedSignals = {
  hydraulic: new Set(),
  landslide: new Set(),
};
result = await queryHazards(async (url, { signal }) => {
  if (layerNameFromUrl(url) === "idrogeo:pericolosita_frane") {
    observedSignals.landslide.add(signal);

    return landslideFetch({ code: 2 })(url, { signal });
  }

  observedSignals.hydraulic.add(signal);

  return fetchForClasses(["P1"])(url, { signal });
}, ["hydraulic", "landslide"]);
assert.equal(result.hydraulic.status, "available");
assert.equal(result.landslide.status, "available");
assert.equal(observedSignals.hydraulic.size, 3);
assert.equal(observedSignals.landslide.size, 1);
assert.equal(
  observedSignals.hydraulic.has([...observedSignals.landslide][0]),
  false
);

result = await queryHazards(landslideFetch({ code: 4 }), [
  "hydraulic",
  "landslide",
], {
  latitude: undefined,
  longitude: undefined,
});
assert.equal(result.hydraulic.status, "point_not_selected");
assert.equal(result.landslide.status, "point_not_selected");
assert.equal(result.overall_status, "point_not_selected");

result = await evaluatePointHazardExposure({});
assert.deepEqual(result.query.hazards, [
  "hydraulic",
  "landslide",
  "seismic",
]);
assert.equal(result.hydraulic.status, "point_not_selected");
assert.equal(result.landslide.status, "point_not_selected");
assert.equal(result.seismic.status, "point_not_selected");
assert.equal(result.coverage.complete_response, true);
assert.deepEqual(result.coverage.returned_hazards, [
  "hydraulic",
  "landslide",
  "seismic",
]);

clearHazardExposureCache();
const hydraulicOnly = await evaluatePointHazardExposure(
  {
    hazards: ["hydraulic"],
    ...point,
  },
  {
    fetchImpl: fetchForClasses(["P1"]),
    timeoutMs: 50,
  }
);
const hydraulicAndLandslide = await evaluatePointHazardExposure(
  {
    hazards: ["hydraulic", "landslide"],
    ...point,
  },
  {
    fetchImpl: landslideFetch({ code: 4 }),
    timeoutMs: 50,
  }
);
const hydraulicWithNearbyContextMode = await evaluatePointHazardExposure(
  {
    hazards: ["hydraulic"],
    include_nearby_context: true,
    ...point,
  },
  {
    fetchImpl: fetchForClasses(["P1"]),
    timeoutMs: 50,
  }
);
assert.notEqual(hydraulicOnly.cache.key, hydraulicAndLandslide.cache.key);
assert.notEqual(
  hydraulicOnly.cache.key,
  hydraulicWithNearbyContextMode.cache.key
);
assert.equal(hydraulicAndLandslide.cache.hit, false);
assert.equal(hydraulicAndLandslide.landslide.status, "available");

clearHazardExposureCache();
const staleErrorCandidate = await evaluatePointHazardExposure(
  {
    hazards: ["hydraulic", "landslide"],
    ...point,
  },
  {
    fetchImpl: async (url, { signal }) => {
      if (
        layerNameFromUrl(url) === "idrogeo:pericolosita_frane" ||
        String(url).includes("pericolosita_frane")
      ) {
        throw new Error("temporary landslide failure");
      }

      return fetchForClasses(["P1"])(url, { signal });
    },
    timeoutMs: 50,
  }
);
assert.equal(staleErrorCandidate.landslide.status, "service_unreachable");
assert.equal(Boolean(staleErrorCandidate.landslide.source?.queried_at), true);

const recoveredAfterError = await evaluatePointHazardExposure(
  {
    hazards: ["hydraulic", "landslide"],
    ...point,
  },
  {
    fetchImpl: landslideFetch({ code: 4 }),
    timeoutMs: 50,
  }
);
assert.equal(recoveredAfterError.cache.hit, false);
assert.equal(recoveredAfterError.landslide.status, "available");
assert.equal(recoveredAfterError.landslide.highest_hazard_class, "P4");

clearHazardExposureCache();
const stringCoordinateResult = await evaluatePointHazardExposure(
  {
    bypassCache: true,
    hazards: ["landslide"],
    latitude: "40.10005714",
    longitude: "16.00375000",
  },
  {
    fetchImpl: async (url) => {
      if (
        layerNameFromUrl(url) === "idrogeo:pericolosita_frane" ||
        String(url).includes("pericolosita_frane")
      ) {
        return jsonResponse({
          features: [
            {
              geometry: {
                coordinates: [
                  [
                    [16.003, 40.099],
                    [16.005, 40.099],
                    [16.005, 40.101],
                    [16.003, 40.101],
                    [16.003, 40.099],
                  ],
                ],
                type: "Polygon",
              },
              properties: {
                cod_per_it: 4,
                id: "mock-p4-string",
              },
              type: "Feature",
            },
          ],
          type: "FeatureCollection",
        });
      }

      return fetchForClasses([])(url);
    },
    timeoutMs: 50,
  }
);
assert.equal(stringCoordinateResult.landslide.status, "available");
assert.equal(stringCoordinateResult.landslide.highest_hazard_class, "P4");

const professionalPageSource = fs.readFileSync(
  path.join(root, "src", "pages", "ProfessionalPage.jsx"),
  "utf8"
);
const pointInspectorSource = fs.readFileSync(
  path.join(
    root,
    "src",
    "components",
    "hazard",
    "PointHazardInspector.jsx"
  ),
  "utf8"
);
assert.match(
  professionalPageSource,
  /professionalHazardExposurePoint\(\{\s*bypassCache:\s*false,\s*hazards:\s*\["hydraulic",\s*"landslide",\s*"seismic"\]/s
);
assert.match(
  professionalPageSource,
  /setPath01LandslideExposure\(\s*result\.landslide\s*\|\|/s
);
assert.match(
  professionalPageSource,
  /exposure\.status === "partial"[\s\S]*?Partial hydraulic result/s
);
assert.match(
  professionalPageSource,
  /No intersection was found in the layers that responded\./s
);
assert.match(
  professionalPageSource,
  /frontend_response_received/s
);
assert.match(
  professionalPageSource,
  /setPath01HydraulicExposure\(\{\s*confidence:\s*"pending"[\s\S]*?status:\s*"loading"/
);
assert.match(
  professionalPageSource,
  /setPath01LandslideExposure\(\{\s*attention_area:\s*false[\s\S]*?status:\s*"loading"/
);
assert.match(
  professionalPageSource,
  /Point outcome[\s\S]*?Territorial context[\s\S]*?ISPRA PAI Landslide[\s\S]*?does not modify the Final Priority Index/
);
assert.match(
  professionalPageSource,
  /platform-map-preview-shell[\s\S]*?onPointSelect=\{[\s\S]*?commitProjectLocation/s
);
assert.match(
  professionalPageSource,
  /No ISPRA hydraulic class at selected point/
);
assert.match(
  professionalPageSource,
  /Wide-area[\s\S]*official context:[\s\S]*not assigned to the point/
);
assert.match(
  professionalPageSource,
  /Technical details and provenance/
);
assert.match(
  professionalPageSource,
  /Query completed; territorial context available/
);
assert.match(
  pointInspectorSource,
  /Risposte ricevute: \$\{returnedCount\}\/3/
);
assert.match(
  pointInspectorSource,
  /No ISPRA PAI class at selected point/
);
assert.match(
  professionalPageSource,
  /Official hydraulic and PAI landslide WFS point observations remain in shadow mode/
);

console.log(
  JSON.stringify({
    ok: true,
    checks: [
      "valid-geojson-without-feature",
      "wfs-2-server-side-point-filter",
      "source-provider-metadata",
      "feature-count-without-point-intersection",
      "valid-geojson-with-feature",
      "p1-only",
      "p1-p2",
      "p1-p2-p3",
      "multipolygon",
      "boundary-point",
      "inner-ring-hole",
      "xml-service-exception",
      "http-400",
      "http-404",
      "http-500",
      "timeout",
      "dns-network-failure",
      "unexpected-content-type",
      "empty-response",
      "invalid-geojson",
      "wfs-version-fallback",
      "wfs-11-server-side-point-filter",
      "centralized-severity-order",
      "source-dataset-version-distinct-from-provider-version",
      "metadata-filter-axis-order",
      "single-layer-error-partial",
      "hydraulic-completeness-contract",
      "hydraulic-transient-retry",
      "hydraulic-per-layer-cache-recovery",
      "hydraulic-in-flight-deduplication",
      "hydraulic-persistent-cache-restart-recovery",
      "hydraulic-stale-last-known-good-abstention",
      "hydraulic-persistent-cache-bypass",
      "hydraulic-circuit-breaker",
      "hydraulic-remote-concurrency-limit",
      "multi-hazard-registry",
      "hydraulic-only",
      "landslide-only",
      "landslide-direct-provider-signature",
      "landslide-registry-provider-signature",
      "landslide-signature-mismatch-stage",
      "hydraulic-plus-landslide",
      "landslide-p1-p4-order",
      "landslide-aa-separate",
      "landslide-no-intersection",
      "landslide-schema-mismatch",
      "landslide-server-side-point-filter",
      "landslide-completeness-contract",
      "landslide-transient-retry",
      "landslide-in-flight-deduplication",
      "landslide-persistent-cache-restart-recovery",
      "landslide-stale-last-known-good-abstention",
      "landslide-persistent-cache-bypass",
      "landslide-circuit-breaker",
      "landslide-remote-concurrency-limit",
      "multi-hazard-query-payload",
      "multi-hazard-timeout-preserves-landslide",
      "multi-hazard-timeout-preserves-no-intersection",
      "multi-hazard-landslide-timeout-preserves-hydraulic",
      "multi-hazard-both-timeout",
      "multi-hazard-provider-errors-independent",
      "separate-abort-controllers",
      "provider-exception-attempted-at",
      "point-not-selected-for-missing-point",
      "cache-key-provider-versions",
      "cache-key-hydraulic-only-distinct-from-multi-hazard",
      "technical-errors-not-cached",
      "string-coordinate-p4",
      "professional-page-multi-hazard-binding",
      "landslide-error-preserves-hydraulic",
      "hydraulic-error-preserves-landslide",
      "unknown-hazard-no-provider",
      "point-not-selected",
      "cache-bypass-development",
      "deterministic-output",
      "unavailable-distinct-from-no-hazard",
    ],
  })
);
