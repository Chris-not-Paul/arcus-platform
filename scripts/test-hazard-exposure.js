import assert from "node:assert/strict";

import {
  clearHazardExposureCache,
  evaluatePointHazardExposure,
} from "../server/hazard/hazardExposureService.js";
import {
  FLOOD_CLASS_SEVERITY_ORDER,
  highestFloodClass,
} from "../server/hazard/normalizers/floodNormalizer.js";

const point = {
  latitude: 45,
  longitude: 7,
};

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
  p1RequestUrl.searchParams.get("bbox"),
  "6.99988,44.99988,7.00012,45.00012,EPSG:4326"
);
assert.equal(result.hydraulic.source.request_crs, "EPSG:4326");
assert.equal(result.hydraulic.source.bbox_axis_order, "longitude_latitude");
assert.equal(
  result.hydraulic.source.bbox_parameter_order,
  "west_south_east_north"
);
assert.equal(result.hydraulic.source.endpoint_identifier, "ispra-nz1-wfs");
assert.equal(result.hydraulic.source.source_dataset_version, null);
assert.notEqual(
  result.hydraulic.source.provider_version,
  result.hydraulic.source.source_dataset_version
);
assert.equal(firstLayer(result).request.request_crs, "EPSG:4326");
assert.equal(firstLayer(result).request.bbox_axis_order, "longitude_latitude");
assert.equal(
  firstLayer(result).request.bbox_parameter_order,
  "west_south_east_north"
);

result = await query(fetchWithoutFeatures());
assert.deepEqual(classSummary(result), {
  highest: null,
  matched: [],
  status: "no_intersection",
});
assert.equal(result.hydraulic.normalized_score, null);

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
  fallbackP1Url.searchParams.get("bbox"),
  "6.99988,44.99988,7.00012,45.00012,EPSG:4326"
);

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

result = await query(fetchForClasses(["P1"]), {
  latitude: 120,
  longitude: 7,
});
assert.equal(result.hydraulic.status, "invalid_coordinates");
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

console.log(
  JSON.stringify({
    ok: true,
    checks: [
      "valid-geojson-without-feature",
      "wfs-2-url-bbox-order",
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
      "wfs-11-url-bbox-order",
      "centralized-severity-order",
      "source-dataset-version-distinct-from-provider-version",
      "metadata-bbox-axis-order",
      "single-layer-error-partial",
      "invalid-coordinates",
      "cache-bypass-development",
      "deterministic-output",
      "unavailable-distinct-from-no-hazard",
    ],
  })
);
