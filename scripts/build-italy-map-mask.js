import fs from "node:fs";
import path from "node:path";

import polygonClipping from "polygon-clipping";

const projectRoot = process.cwd();
const sourcePath = path.join(
  projectRoot,
  "public",
  "data",
  "geo",
  "italy-provinces.geojson"
);
const outputPath = path.join(
  projectRoot,
  "public",
  "data",
  "geo",
  "italy-focus-mask.geojson"
);
const regionOutputPath = path.join(
  projectRoot,
  "public",
  "data",
  "geo",
  "italy-regions-simplified.geojson"
);

const source = JSON.parse(fs.readFileSync(sourcePath, "utf8"));

function asPolygonClippingGeometry(geometry) {
  if (geometry?.type === "Polygon") {
    return geometry.coordinates;
  }

  if (geometry?.type === "MultiPolygon") {
    return geometry.coordinates;
  }

  return null;
}

const provinceGeometries = source.features
  .map((feature) => asPolygonClippingGeometry(feature.geometry))
  .filter(Boolean);

if (!provinceGeometries.length) {
  throw new Error("No province polygons available for the Italy focus mask.");
}

const italyGeometry = polygonClipping.union(...provinceGeometries);

function squaredDistanceToSegment(point, start, end) {
  let x = start[0];
  let y = start[1];
  let dx = end[0] - x;
  let dy = end[1] - y;

  if (dx !== 0 || dy !== 0) {
    const t = (
      (point[0] - x) * dx +
      (point[1] - y) * dy
    ) / (dx * dx + dy * dy);

    if (t > 1) {
      x = end[0];
      y = end[1];
    } else if (t > 0) {
      x += dx * t;
      y += dy * t;
    }
  }

  dx = point[0] - x;
  dy = point[1] - y;

  return dx * dx + dy * dy;
}

function simplifySection(points, first, last, toleranceSquared, output) {
  let furthestDistance = toleranceSquared;
  let furthestIndex = null;

  for (let index = first + 1; index < last; index += 1) {
    const distance = squaredDistanceToSegment(
      points[index],
      points[first],
      points[last]
    );

    if (distance > furthestDistance) {
      furthestDistance = distance;
      furthestIndex = index;
    }
  }

  if (furthestIndex === null) {
    return;
  }

  if (furthestIndex - first > 1) {
    simplifySection(points, first, furthestIndex, toleranceSquared, output);
  }

  output.push(points[furthestIndex]);

  if (last - furthestIndex > 1) {
    simplifySection(points, furthestIndex, last, toleranceSquared, output);
  }
}

function simplifyRing(ring, tolerance = 0.0012) {
  if (!Array.isArray(ring) || ring.length <= 5) {
    return ring;
  }

  const openRing = ring.slice(0, -1);
  const output = [openRing[0]];

  simplifySection(
    openRing,
    0,
    openRing.length - 1,
    tolerance * tolerance,
    output
  );

  output.push(openRing[openRing.length - 1]);

  const rounded = output.map(([longitude, latitude]) => ([
    Number(longitude.toFixed(5)),
    Number(latitude.toFixed(5)),
  ]));

  rounded.push([...rounded[0]]);

  return rounded;
}

const worldRing = [
  [-180, -85],
  [180, -85],
  [180, 85],
  [-180, 85],
  [-180, -85],
];

const italyExteriorRings = italyGeometry
  .map((polygon) => polygon[0])
  .filter((ring) => Array.isArray(ring) && ring.length >= 4)
  .map((ring) => simplifyRing(ring));

const focusMask = {
  type: "Feature",
  properties: {
    role: "arcus_italy_focus_mask",
    source: "derived_from_italy_provinces",
  },
  geometry: {
    type: "Polygon",
    coordinates: [worldRing, ...italyExteriorRings],
  },
};

const provincesByRegion = new Map();

source.features.forEach((feature) => {
  const geometry = asPolygonClippingGeometry(feature.geometry);

  if (!geometry) {
    return;
  }

  const regionCode = String(feature.properties?.cod_reg ?? "");
  const regionName = String(feature.properties?.den_reg ?? "");
  const regionKey = `${regionCode}:${regionName}`;
  const region = provincesByRegion.get(regionKey) || {
    code: regionCode,
    geometries: [],
    name: regionName,
  };

  region.geometries.push(geometry);
  provincesByRegion.set(regionKey, region);
});

const regionFeatures = [...provincesByRegion.values()]
  .sort((left, right) => Number(left.code) - Number(right.code))
  .map((region) => {
    const geometry = polygonClipping.union(...region.geometries);

    return {
      type: "Feature",
      properties: {
        cod_reg: region.code,
        den_reg: region.name,
      },
      geometry: {
        type: "MultiPolygon",
        coordinates: geometry.map((polygon) => (
          polygon.map((ring) => simplifyRing(ring, 0.0026))
        )),
      },
    };
  });

const regionBoundaries = {
  type: "FeatureCollection",
  features: regionFeatures,
};

fs.writeFileSync(
  outputPath,
  `${JSON.stringify(focusMask)}\n`,
  "utf8"
);

fs.writeFileSync(
  regionOutputPath,
  `${JSON.stringify(regionBoundaries)}\n`,
  "utf8"
);

const outputSize = fs.statSync(outputPath).size;
const regionOutputSize = fs.statSync(regionOutputPath).size;

console.log(JSON.stringify({
  sourceFeatures: source.features.length,
  italyExteriorRings: italyExteriorRings.length,
  outputPath,
  outputSize,
  regionFeatures: regionFeatures.length,
  regionOutputPath,
  regionOutputSize,
}, null, 2));
