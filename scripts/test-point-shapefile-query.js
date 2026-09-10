import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import { queryPolygonShapefile } from "./lib/point-shapefile-query.js";

function buildHeader({ bounds, fileLengthWords }) {
  const header = Buffer.alloc(100);
  header.writeInt32BE(9994, 0);
  header.writeInt32BE(fileLengthWords, 24);
  header.writeInt32LE(1000, 28);
  header.writeInt32LE(5, 32);
  bounds.forEach((value, index) => header.writeDoubleLE(value, 36 + index * 8));
  return header;
}

function buildPolygonContent(parts) {
  const points = parts.flat();
  const xs = points.map(([x]) => x);
  const ys = points.map(([, y]) => y);
  const bounds = [Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys)];
  const content = Buffer.alloc(44 + parts.length * 4 + points.length * 16);

  content.writeInt32LE(5, 0);
  bounds.forEach((value, index) => content.writeDoubleLE(value, 4 + index * 8));
  content.writeInt32LE(parts.length, 36);
  content.writeInt32LE(points.length, 40);

  let pointIndex = 0;
  parts.forEach((part, partIndex) => {
    content.writeInt32LE(pointIndex, 44 + partIndex * 4);
    pointIndex += part.length;
  });

  const pointOffset = 44 + parts.length * 4;
  points.forEach(([x, y], index) => {
    content.writeDoubleLE(x, pointOffset + index * 16);
    content.writeDoubleLE(y, pointOffset + index * 16 + 8);
  });

  return { bounds, content };
}

function writeSinglePolygonShapefile(directory) {
  const outer = [
    [0, 0],
    [0, 10],
    [10, 10],
    [10, 0],
    [0, 0],
  ];
  const hole = [
    [4, 4],
    [6, 4],
    [6, 6],
    [4, 6],
    [4, 4],
  ];
  const { bounds, content } = buildPolygonContent([outer, hole]);
  const recordHeader = Buffer.alloc(8);
  recordHeader.writeInt32BE(1, 0);
  recordHeader.writeInt32BE(content.length / 2, 4);

  const shpPath = path.join(directory, "synthetic.shp");
  const shpLength = 100 + recordHeader.length + content.length;
  fs.writeFileSync(
    shpPath,
    Buffer.concat([
      buildHeader({ bounds, fileLengthWords: shpLength / 2 }),
      recordHeader,
      content,
    ])
  );

  const indexRecord = Buffer.alloc(8);
  indexRecord.writeInt32BE(50, 0);
  indexRecord.writeInt32BE(content.length / 2, 4);
  fs.writeFileSync(
    path.join(directory, "synthetic.shx"),
    Buffer.concat([
      buildHeader({ bounds, fileLengthWords: 54 }),
      indexRecord,
    ])
  );

  return shpPath;
}

const temporaryDirectory = fs.mkdtempSync(path.join(os.tmpdir(), "arcus-shapefile-test-"));

try {
  const shpPath = writeSinglePolygonShapefile(temporaryDirectory);
  const results = queryPolygonShapefile({
    candidates: [
      { id: "inside", projected: [2, 2] },
      { id: "hole", projected: [5, 5] },
      { id: "outside", projected: [20, 20] },
      { id: "near-boundary", projected: [12, 5] },
      { id: "on-boundary", projected: [0, 5] },
    ],
    classResolver: () => "P2",
    shpPath,
    toleranceMeters: 3,
  });

  assert.deepEqual(results.inside.classes, ["P2"]);
  assert.deepEqual(results.hole.classes, []);
  assert.deepEqual(results.outside.classes, []);
  assert.equal(results.outside.minimum_boundary_distance_m, null);
  assert.deepEqual(results["near-boundary"].classes, []);
  assert.equal(results["near-boundary"].minimum_boundary_distance_m, 2);
  assert.deepEqual(results["on-boundary"].classes, ["P2"]);
  assert.equal(results["on-boundary"].minimum_boundary_distance_m, 0);

  console.log("Validated polygon inclusion, holes, proximity, and boundary handling");
} finally {
  fs.rmSync(temporaryDirectory, { force: true, recursive: true });
}
