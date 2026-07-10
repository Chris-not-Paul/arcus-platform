import {
  FLOOD_PROVIDER_VERSION,
} from "./normalizers/floodNormalizer.js";
import {
  queryIspraFloodExposure,
  validateWgs84Point,
} from "./providers/ispraFloodProvider.js";

const CACHE_TTL_MS = 1000 * 60 * 60 * 6;
const CACHE_MAX_ITEMS = 500;
const cache = new Map();

function normalizeCoordinate(value) {
  return Number(value).toFixed(5);
}

function cacheKeyFor({ hazards, latitude, longitude }) {
  const requestedHazards = [...new Set(hazards)].sort().join(",");

  return [
    "point",
    normalizeCoordinate(latitude),
    normalizeCoordinate(longitude),
    requestedHazards,
    FLOOD_PROVIDER_VERSION,
  ].join(":");
}

function readCache(key) {
  const hit = cache.get(key);

  if (!hit) {
    return null;
  }

  if (Date.now() - hit.createdAt > CACHE_TTL_MS) {
    cache.delete(key);

    return null;
  }

  cache.delete(key);
  cache.set(key, hit);

  return {
    ...hit.value,
    cache: {
      hit: true,
      key,
      ttl_seconds: Math.round(
        (CACHE_TTL_MS - (Date.now() - hit.createdAt)) / 1000
      ),
    },
  };
}

function writeCache(key, value) {
  cache.set(key, {
    createdAt: Date.now(),
    value,
  });

  while (cache.size > CACHE_MAX_ITEMS) {
    const firstKey = cache.keys().next().value;

    cache.delete(firstKey);
  }
}

function normalizeHazards(hazards) {
  if (!Array.isArray(hazards) || hazards.length === 0) {
    return ["hydraulic"];
  }

  return [...new Set(hazards.map((hazard) => String(hazard).toLowerCase()))]
    .filter((hazard) => ["hydraulic"].includes(hazard));
}

export async function evaluatePointHazardExposure(payload, options = {}) {
  const validated = validateWgs84Point(payload || {});
  const hazards = normalizeHazards(payload?.hazards);
  const isDevelopment = process.env.NODE_ENV !== "production";
  const bypassCache = Boolean(
    options.bypassCache || (isDevelopment && payload?.bypassCache)
  );
  const query = {
    crs: "EPSG:4326",
    latitude: Number(payload?.latitude),
    longitude: Number(payload?.longitude),
  };

  if (!validated.ok) {
    return {
      hydraulic: await queryIspraFloodExposure(payload || {}, options),
      query,
    };
  }

  const key = cacheKeyFor({
    hazards,
    latitude: validated.latitude,
    longitude: validated.longitude,
  });
  const cached = bypassCache ? null : readCache(key);

  if (cached) {
    return cached;
  }

  const result = {
    cache: {
      bypass: bypassCache,
      hit: false,
      key,
      ttl_seconds: Math.round(CACHE_TTL_MS / 1000),
    },
    query: {
      crs: "EPSG:4326",
      latitude: validated.latitude,
      longitude: validated.longitude,
    },
  };

  if (hazards.includes("hydraulic")) {
    result.hydraulic = await queryIspraFloodExposure(
      {
        latitude: validated.latitude,
        longitude: validated.longitude,
      },
      options
    );
  }

  if (!bypassCache) {
    writeCache(key, result);
  }

  return result;
}

export function clearHazardExposureCache() {
  cache.clear();
}
