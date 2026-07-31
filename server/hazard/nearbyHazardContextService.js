import {
  ISPRA_FLOOD_LAYERS,
  highestFloodClass,
} from "./normalizers/floodNormalizer.js";
import {
  highestLandslideHazardClass,
  normalizeLandslideClass,
} from "./normalizers/landslideNormalizer.js";

const FLOOD_WFS_URL = "https://sdi.isprambiente.it/geoserver/nz1/wfs";
const LANDSLIDE_WFS_URL =
  "https://idrogeo.isprambiente.it/geoserver/idrogeo/ows";
const LANDSLIDE_LAYER = "idrogeo:pericolosita_frane";
const LANDSLIDE_CLASS_ATTRIBUTE = "cod_per_it";
const SEARCH_RADII_M = Object.freeze([
  1_000,
  5_000,
  10_000,
  25_000,
  50_000,
  100_000,
  200_000,
]);
const REQUEST_TIMEOUT_MS = 12_000;
const CACHE_TTL_MS = 1000 * 60 * 60 * 6;
const CACHE_MAX_ITEMS = 1000;
const cache = new Map();

function cacheKey(hazard, point) {
  return [
    hazard,
    Number(point.latitude).toFixed(4),
    Number(point.longitude).toFixed(4),
  ].join(":");
}

function readCache(key) {
  const item = cache.get(key);

  if (!item || Date.now() - item.created_at > CACHE_TTL_MS) {
    cache.delete(key);
    return null;
  }

  return {
    ...item.value,
    cache: {
      hit: true,
      ttl_seconds: Math.max(
        0,
        Math.round(
          (CACHE_TTL_MS - (Date.now() - item.created_at)) / 1000
        )
      ),
    },
  };
}

function writeCache(key, value) {
  cache.set(key, {
    created_at: Date.now(),
    value,
  });

  while (cache.size > CACHE_MAX_ITEMS) {
    cache.delete(cache.keys().next().value);
  }
}

function nearbyUrl({
  attributeName,
  layerName,
  point,
  radiusM,
  serviceUrl,
}) {
  const url = new URL(serviceUrl);

  url.searchParams.set("service", "WFS");
  url.searchParams.set("version", "2.0.0");
  url.searchParams.set("request", "GetFeature");
  url.searchParams.set("typeNames", layerName);
  url.searchParams.set("outputFormat", "application/json");
  url.searchParams.set("srsName", "EPSG:4326");
  url.searchParams.set("count", layerName === LANDSLIDE_LAYER ? "25" : "1");
  url.searchParams.set("propertyName", attributeName);
  url.searchParams.set(
    "CQL_FILTER",
    `DWITHIN(geom,SRID=4326;POINT(${point.longitude} ${point.latitude}),${radiusM},meters)`
  );

  return url;
}

async function fetchFeatureCollection(url, {
  fetchImpl,
  timeoutMs,
}) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetchImpl(url, {
      headers: {
        Accept: "application/json, application/geo+json",
      },
      signal: controller.signal,
    });

    if (!response.ok) {
      const error = new Error(`http_${response.status}`);

      error.code = "nearby_context_http_error";
      throw error;
    }

    const payload = JSON.parse(await response.text());

    if (
      payload?.type !== "FeatureCollection" ||
      !Array.isArray(payload.features)
    ) {
      const error = new Error("invalid_nearby_context_response");

      error.code = "invalid_nearby_context_response";
      throw error;
    }

    return payload;
  } finally {
    clearTimeout(timeout);
  }
}

function baseContext({ hazard, point, radiusM }) {
  return {
    distance_basis: "within_search_radius_not_exact_distance",
    hazard,
    point_intersection: false,
    query: {
      crs: "EPSG:4326",
      latitude: point.latitude,
      longitude: point.longitude,
    },
    search_radius_km: radiusM / 1000,
    search_radius_m: radiusM,
    status: "available",
  };
}

async function queryHydraulicContext(point, options) {
  for (const radiusM of SEARCH_RADII_M) {
    const results = await Promise.allSettled(
      ISPRA_FLOOD_LAYERS.map(async (layer) => {
        const payload = await fetchFeatureCollection(
          nearbyUrl({
            attributeName: layer.attributeName,
            layerName: layer.layerName,
            point,
            radiusM,
            serviceUrl: options.floodServiceUrl,
          }),
          options
        );

        return payload.features.length ? layer.className : null;
      })
    );
    const classes = [
      ...new Set(
        results
          .filter((item) => item.status === "fulfilled")
          .map((item) => item.value)
          .filter(Boolean)
      ),
    ];

    if (classes.length) {
      return {
        ...baseContext({
          hazard: "hydraulic",
          point,
          radiusM,
        }),
        classes,
        highest_class: highestFloodClass(classes),
        source: {
          provider: "ISPRA",
          query_method: "server_side_nearby_dwithin",
          service_type: "WFS",
          service_url: options.floodServiceUrl,
        },
      };
    }
  }

  return {
    hazard: "hydraulic",
    point_intersection: false,
    search_radius_km: SEARCH_RADII_M.at(-1) / 1000,
    status: "not_found_within_search_limit",
  };
}

async function queryLandslideContext(point, options) {
  for (const radiusM of SEARCH_RADII_M) {
    let payload;

    try {
      payload = await fetchFeatureCollection(
        nearbyUrl({
          attributeName: LANDSLIDE_CLASS_ATTRIBUTE,
          layerName: LANDSLIDE_LAYER,
          point,
          radiusM,
          serviceUrl: options.landslideServiceUrl,
        }),
        options
      );
    } catch {
      continue;
    }

    const classes = [
      ...new Set(
        payload.features
          .map((feature) =>
            normalizeLandslideClass(
              feature?.properties?.[LANDSLIDE_CLASS_ATTRIBUTE]
            )
          )
          .filter(Boolean)
      ),
    ];

    if (classes.length) {
      const matchedAttentionClasses = classes.filter(
        (item) => item === "AA"
      );
      const matchedHazardClasses = classes.filter(
        (item) => item !== "AA"
      );

      return {
        ...baseContext({
          hazard: "landslide",
          point,
          radiusM,
        }),
        attention_area: matchedAttentionClasses.length > 0,
        classes,
        highest_hazard_class:
          highestLandslideHazardClass(matchedHazardClasses),
        matched_attention_classes: matchedAttentionClasses,
        matched_hazard_classes: matchedHazardClasses,
        source: {
          provider: "ISPRA",
          query_method: "server_side_nearby_dwithin",
          service_type: "WFS",
          service_url: options.landslideServiceUrl,
          source_dataset_version: "5.0",
          source_reference_year: 2024,
        },
      };
    }
  }

  return {
    hazard: "landslide",
    point_intersection: false,
    search_radius_km: SEARCH_RADII_M.at(-1) / 1000,
    status: "not_found_within_search_limit",
  };
}

export async function queryNearbyOfficialHazardContext(
  hazard,
  point,
  {
    bypassCache = false,
    fetchImpl = globalThis.fetch,
    floodServiceUrl = FLOOD_WFS_URL,
    landslideServiceUrl = LANDSLIDE_WFS_URL,
    timeoutMs = REQUEST_TIMEOUT_MS,
  } = {}
) {
  if (!["hydraulic", "landslide"].includes(hazard)) {
    return null;
  }

  const key = cacheKey(hazard, point);
  const cached = bypassCache ? null : readCache(key);

  if (cached) {
    return cached;
  }

  const options = {
    fetchImpl,
    floodServiceUrl,
    landslideServiceUrl,
    timeoutMs,
  };
  const context = hazard === "hydraulic"
    ? await queryHydraulicContext(point, options)
    : await queryLandslideContext(point, options);

  if (!bypassCache && context?.status === "available") {
    writeCache(key, context);
  }

  return context;
}

export async function enrichNoIntersectionWithNearbyContext(
  results,
  point,
  options = {}
) {
  const hazards = ["hydraulic", "landslide"].filter(
    (hazard) => results?.[hazard]?.status === "no_intersection"
  );

  await Promise.all(
    hazards.map(async (hazard) => {
      try {
        const nearbyContext = await queryNearbyOfficialHazardContext(
          hazard,
          point,
          options
        );

        results[hazard] = {
          ...results[hazard],
          nearby_context: nearbyContext,
          presentation_status:
            nearbyContext?.status === "available"
              ? "nearby_official_context"
              : "official_point_outside_mapped_hazard",
        };
      } catch (error) {
        results[hazard] = {
          ...results[hazard],
          nearby_context: {
            error: error?.message || "nearby_context_unavailable",
            status: "unavailable",
          },
          presentation_status: "official_point_outside_mapped_hazard",
        };
      }
    })
  );

  return results;
}

export function clearNearbyHazardContextCache() {
  cache.clear();
}

export const NEARBY_CONTEXT_SEARCH_RADII_M = SEARCH_RADII_M;
