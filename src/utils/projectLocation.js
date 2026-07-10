export function normalizeProvinceKey(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function usableProvinceName(value) {
  const text = String(value || "").trim();

  return text && text !== "-" ? text : "";
}

export function provinceNameFromFeature(feature) {
  const properties = feature?.properties || {};

  return (
    usableProvinceName(properties.den_uts) ||
    usableProvinceName(properties.den_cm) ||
    usableProvinceName(properties.den_prov) ||
    ""
  );
}

export function provinceCodeFromFeature(feature) {
  const properties = feature?.properties || {};
  const code =
    properties.cod_uts ??
    properties.sigla ??
    properties.cod_prov ??
    "";

  return String(code || "").trim();
}

function provinceAliasKeys(...values) {
  const aliases = new Set();

  values
    .filter(Boolean)
    .forEach((value) => {
      const key = normalizeProvinceKey(value);

      if (key) {
        aliases.add(key);
      }
    });

  const hasAlias = (value) => aliases.has(normalizeProvinceKey(value));

  if (hasAlias("Bolzano") || hasAlias("Bozen")) {
    aliases.add("bolzano");
    aliases.add("bozen");
    aliases.add("bolzano-bozen");
  }

  if (hasAlias("Reggio nell'Emilia") || hasAlias("Reggio Emilia")) {
    aliases.add("reggio-nell-emilia");
    aliases.add("reggio-emilia");
  }

  if (hasAlias("Forli'-Cesena") || hasAlias("Forli Cesena")) {
    aliases.add("forli-cesena");
    aliases.add("forli-cesena");
  }

  if (
    hasAlias("Monza e della Brianza") ||
    hasAlias("Monza e Brianza")
  ) {
    aliases.add("monza-e-della-brianza");
    aliases.add("monza-e-brianza");
    aliases.add("monza-brianza");
  }

  return [...aliases];
}

export function buildProvinceRegistry(features) {
  if (!Array.isArray(features)) {
    return [];
  }

  return features
    .map((feature) => {
      const properties = feature?.properties || {};
      const name = provinceNameFromFeature(feature);
      const code = provinceCodeFromFeature(feature);

      if (!name || !code) {
        return null;
      }

      return {
        aliases: provinceAliasKeys(
          name,
          properties.den_uts,
          properties.den_cm,
          properties.den_prov,
          properties.sigla
        ),
        code,
        feature,
        key: normalizeProvinceKey(name),
        name,
        region: properties.den_reg || "",
        sigla: properties.sigla || "",
      };
    })
    .filter(Boolean);
}

export function findProvinceInRegistry(registry, value) {
  const text = String(value || "").trim();
  const key = normalizeProvinceKey(text);

  if (!text || !Array.isArray(registry)) {
    return null;
  }

  return (
    registry.find((province) => province.code === text) ||
    registry.find((province) => province.sigla === text) ||
    registry.find((province) => province.key === key) ||
    registry.find((province) => province.aliases?.includes(key)) ||
    null
  );
}

export function provinceMatchesValue(province, value) {
  const key = normalizeProvinceKey(value);

  if (!province || !key) {
    return false;
  }

  return province.key === key || province.aliases?.includes(key);
}

export function validateProjectCoordinates({ latitude, longitude }) {
  const lat = Number(latitude);
  const lon = Number(longitude);

  if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
    return {
      error: "invalid_coordinates",
      ok: false,
    };
  }

  if (lat < -90 || lat > 90 || lon < -180 || lon > 180) {
    return {
      error: "coordinates_out_of_range",
      ok: false,
    };
  }

  return {
    latitude: lat,
    longitude: lon,
    ok: true,
  };
}

function pointOnSegment(point, start, end) {
  const tolerance = 1e-10;
  const cross =
    (point[1] - start[1]) * (end[0] - start[0]) -
    (point[0] - start[0]) * (end[1] - start[1]);

  if (Math.abs(cross) > tolerance) {
    return false;
  }

  const withinBoundingBox =
    point[0] >= Math.min(start[0], end[0]) - tolerance &&
    point[0] <= Math.max(start[0], end[0]) + tolerance &&
    point[1] >= Math.min(start[1], end[1]) - tolerance &&
    point[1] <= Math.max(start[1], end[1]) + tolerance;

  if (!withinBoundingBox) {
    return false;
  }

  const dot =
    (point[0] - start[0]) * (end[0] - start[0]) +
    (point[1] - start[1]) * (end[1] - start[1]);

  if (dot < 0) {
    return false;
  }

  const squaredLength =
    (end[0] - start[0]) ** 2 + (end[1] - start[1]) ** 2;

  return dot <= squaredLength;
}

function pointInRing(point, ring) {
  let inside = false;

  for (
    let index = 0, previous = ring.length - 1;
    index < ring.length;
    previous = index, index += 1
  ) {
    const currentPoint = ring[index];
    const previousPoint = ring[previous];

    if (pointOnSegment(point, previousPoint, currentPoint)) {
      return true;
    }

    const intersects =
      currentPoint[1] > point[1] !== previousPoint[1] > point[1] &&
      point[0] <
        ((previousPoint[0] - currentPoint[0]) *
          (point[1] - currentPoint[1])) /
          (previousPoint[1] - currentPoint[1]) +
          currentPoint[0];

    if (intersects) {
      inside = !inside;
    }
  }

  return inside;
}

function pointInPolygon(point, polygon) {
  if (!Array.isArray(polygon?.[0])) {
    return false;
  }

  if (!pointInRing(point, polygon[0])) {
    return false;
  }

  return !polygon
    .slice(1)
    .some((hole) => pointInRing(point, hole));
}

export function geometryContainsPoint(geometry, point) {
  if (!geometry || !geometry.type) {
    return false;
  }

  if (geometry.type === "Polygon") {
    return pointInPolygon(point, geometry.coordinates);
  }

  if (geometry.type === "MultiPolygon") {
    return geometry.coordinates.some((polygon) =>
      pointInPolygon(point, polygon)
    );
  }

  if (geometry.type === "GeometryCollection") {
    return (geometry.geometries || []).some((item) =>
      geometryContainsPoint(item, point)
    );
  }

  return false;
}

export function deriveProvinceForPoint(features, coordinates) {
  const validated = validateProjectCoordinates(coordinates);

  if (!validated.ok) {
    return {
      error: validated.error,
      validated: false,
    };
  }

  if (!Array.isArray(features) || features.length === 0) {
    return {
      error: "province_geometry_unavailable",
      latitude: validated.latitude,
      longitude: validated.longitude,
      validated: false,
    };
  }

  const point = [validated.longitude, validated.latitude];
  const feature = features.find((item) =>
    geometryContainsPoint(item.geometry, point)
  );

  if (!feature) {
    return {
      error: "point_outside_italy",
      latitude: validated.latitude,
      longitude: validated.longitude,
      validated: false,
    };
  }

  const derivedProvince = provinceNameFromFeature(feature);
  const derivedProvinceCode = provinceCodeFromFeature(feature);

  if (!derivedProvince || !derivedProvinceCode) {
    return {
      error: "province_not_resolved",
      latitude: validated.latitude,
      longitude: validated.longitude,
      validated: false,
    };
  }

  return {
    derivedProvince,
    derivedProvinceCode,
    derivedProvinceKey: normalizeProvinceKey(derivedProvince),
    feature,
    latitude: validated.latitude,
    longitude: validated.longitude,
    validated: true,
  };
}
