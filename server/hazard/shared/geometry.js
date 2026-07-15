export function validateWgs84Point({ latitude, longitude }) {
  const lat = Number(latitude);
  const lon = Number(longitude);

  if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
    return {
      ok: false,
      error: "coordinates_not_numeric",
    };
  }

  if (lat < -90 || lat > 90 || lon < -180 || lon > 180) {
    return {
      ok: false,
      error: "coordinates_out_of_range",
    };
  }

  return {
    latitude: lat,
    longitude: lon,
    ok: true,
  };
}

function pointOnSegment(point, start, end) {
  const minX = Math.min(start[0], end[0]);
  const maxX = Math.max(start[0], end[0]);
  const minY = Math.min(start[1], end[1]);
  const maxY = Math.max(start[1], end[1]);

  if (
    point[0] < minX - 1e-10 ||
    point[0] > maxX + 1e-10 ||
    point[1] < minY - 1e-10 ||
    point[1] > maxY + 1e-10
  ) {
    return false;
  }

  const cross =
    (point[1] - start[1]) * (end[0] - start[0]) -
    (point[0] - start[0]) * (end[1] - start[1]);

  if (Math.abs(cross) > 1e-10) {
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

export function geometryIntersectsPoint(geometry, point) {
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
      geometryIntersectsPoint(item, point)
    );
  }

  return false;
}

export function featureCollectionIntersections(payload, point) {
  if (payload?.type !== "FeatureCollection" || !Array.isArray(payload.features)) {
    const error = new Error("invalid_geojson");

    error.code = "invalid_geojson";
    throw error;
  }

  return payload.features.filter((feature) =>
    geometryIntersectsPoint(feature.geometry, point)
  );
}
