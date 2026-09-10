import fs from "node:fs";

const SUPPORTED_POLYGON_TYPES = new Set([5, 15, 25]);
const SHAPEFILE_WINDOW_BYTES = 32 * 1024 * 1024;

function readExactly(fileDescriptor, buffer, position) {
  let offset = 0;

  while (offset < buffer.length) {
    const bytesRead = fs.readSync(
      fileDescriptor,
      buffer,
      offset,
      buffer.length - offset,
      position + offset
    );

    if (!bytesRead) {
      throw new Error(`Unexpected end of file at byte ${position + offset}`);
    }

    offset += bytesRead;
  }
}

function pointToSegmentDistance(point, start, end) {
  const dx = end[0] - start[0];
  const dy = end[1] - start[1];

  if (dx === 0 && dy === 0) {
    return Math.hypot(point[0] - start[0], point[1] - start[1]);
  }

  const ratio = Math.max(
    0,
    Math.min(
      1,
      ((point[0] - start[0]) * dx + (point[1] - start[1]) * dy) /
        (dx * dx + dy * dy)
    )
  );
  const closest = [start[0] + ratio * dx, start[1] + ratio * dy];

  return Math.hypot(point[0] - closest[0], point[1] - closest[1]);
}

function segmentMayBeWithinTolerance(point, start, end, tolerance) {
  return (
    point[0] >= Math.min(start[0], end[0]) - tolerance &&
    point[0] <= Math.max(start[0], end[0]) + tolerance &&
    point[1] >= Math.min(start[1], end[1]) - tolerance &&
    point[1] <= Math.max(start[1], end[1]) + tolerance
  );
}

function assessPolygonBuffer(candidates, body, parts, numberOfPoints, pointOffset, tolerance) {
  const assessments = candidates.map((candidate) => ({
    candidate,
    inside: false,
    minimumBoundaryDistance: Number.POSITIVE_INFINITY,
  }));

  function readPoint(index) {
    const offset = pointOffset + index * 16;
    return [body.readDoubleLE(offset), body.readDoubleLE(offset + 8)];
  }

  for (let partIndex = 0; partIndex < parts.length; partIndex += 1) {
    const startIndex = parts[partIndex];
    const endIndex = parts[partIndex + 1] ?? numberOfPoints;

    if (endIndex - startIndex < 3) continue;

    const ringInside = assessments.map(() => false);
    let previousPoint = readPoint(endIndex - 1);

    for (let index = startIndex; index < endIndex; index += 1) {
      const currentPoint = readPoint(index);

      for (let candidateIndex = 0; candidateIndex < assessments.length; candidateIndex += 1) {
        const assessment = assessments[candidateIndex];
        const point = assessment.candidate.projected;
        const crossesRay =
          currentPoint[1] > point[1] !== previousPoint[1] > point[1] &&
          point[0] <
            ((previousPoint[0] - currentPoint[0]) * (point[1] - currentPoint[1])) /
              (previousPoint[1] - currentPoint[1]) +
              currentPoint[0];

        if (crossesRay) ringInside[candidateIndex] = !ringInside[candidateIndex];

        if (segmentMayBeWithinTolerance(point, previousPoint, currentPoint, tolerance)) {
          assessment.minimumBoundaryDistance = Math.min(
            assessment.minimumBoundaryDistance,
            pointToSegmentDistance(point, previousPoint, currentPoint)
          );
        }
      }

      previousPoint = currentPoint;
    }

    for (let candidateIndex = 0; candidateIndex < assessments.length; candidateIndex += 1) {
      if (ringInside[candidateIndex]) {
        assessments[candidateIndex].inside = !assessments[candidateIndex].inside;
      }
    }
  }

  for (const assessment of assessments) {
    if (assessment.minimumBoundaryDistance <= 1e-7) assessment.inside = true;
  }

  return assessments;
}

function parseDbfHeader(dbfPath) {
  const descriptor = fs.openSync(dbfPath, "r");
  const header = Buffer.alloc(32);
  readExactly(descriptor, header, 0);
  const recordCount = header.readUInt32LE(4);
  const headerLength = header.readUInt16LE(8);
  const recordLength = header.readUInt16LE(10);
  const fieldsBuffer = Buffer.alloc(headerLength - 33);
  readExactly(descriptor, fieldsBuffer, 32);
  const fields = [];
  let fieldOffset = 1;

  for (let offset = 0; offset + 32 <= fieldsBuffer.length; offset += 32) {
    const descriptorBuffer = fieldsBuffer.subarray(offset, offset + 32);
    const name = descriptorBuffer
      .subarray(0, 11)
      .toString("latin1")
      .replace(/\0.*$/, "")
      .trim();

    if (!name) break;

    const length = descriptorBuffer.readUInt8(16);
    fields.push({
      length,
      name,
      offset: fieldOffset,
      type: String.fromCharCode(descriptorBuffer.readUInt8(11)),
    });
    fieldOffset += length;
  }

  return { descriptor, fields, headerLength, recordCount, recordLength };
}

function readDbfRecord(dbf, recordIndex) {
  if (!dbf || recordIndex >= dbf.recordCount) return {};

  const buffer = Buffer.alloc(dbf.recordLength);
  readExactly(
    dbf.descriptor,
    buffer,
    dbf.headerLength + recordIndex * dbf.recordLength
  );

  return Object.fromEntries(
    dbf.fields.map((field) => {
      const raw = buffer
        .subarray(field.offset, field.offset + field.length)
        .toString("latin1")
        .trim();
      return [field.name, raw || null];
    })
  );
}

function withinExpandedBounds(point, bounds, tolerance) {
  return (
    point[0] >= bounds[0] - tolerance &&
    point[0] <= bounds[2] + tolerance &&
    point[1] >= bounds[1] - tolerance &&
    point[1] <= bounds[3] + tolerance
  );
}

export function queryPolygonShapefile({
  candidates,
  classResolver,
  dbfPath = null,
  onProgress = null,
  shpPath,
  toleranceMeters = 25,
}) {
  const results = new Map(
    candidates.map((candidate) => [
      candidate.id,
      {
        classes: new Set(),
        minimum_boundary_distance_m: Number.POSITIVE_INFINITY,
      },
    ])
  );
  const shpDescriptor = fs.openSync(shpPath, "r");
  const dbf = dbfPath ? parseDbfHeader(dbfPath) : null;
  const fileSize = fs.fstatSync(shpDescriptor).size;
  const fileHeader = Buffer.alloc(100);
  const shxPath = shpPath.replace(/\.shp$/i, ".shx");
  const shx = fs.readFileSync(shxPath);
  readExactly(shpDescriptor, fileHeader, 0);

  if (
    fileHeader.readInt32BE(0) !== 9994 ||
    shx.length < 100 ||
    shx.readInt32BE(0) !== 9994 ||
    (shx.length - 100) % 8 !== 0
  ) {
    throw new Error(`Invalid shapefile header: ${shpPath}`);
  }

  const recordCount = (shx.length - 100) / 8;

  if (dbf && dbf.recordCount !== recordCount) {
    throw new Error(
      `SHP/DBF record-count mismatch for ${shpPath}: ${recordCount}/${dbf.recordCount}`
    );
  }

  let activeWindow = null;

  function readShapePrefix(contentPosition, contentLength) {
    const prefixLength = Math.min(contentLength, 44);
    const windowStart =
      Math.floor(contentPosition / SHAPEFILE_WINDOW_BYTES) * SHAPEFILE_WINDOW_BYTES;

    if (!activeWindow || activeWindow.start !== windowStart) {
      const length = Math.min(SHAPEFILE_WINDOW_BYTES, fileSize - windowStart);
      const buffer = Buffer.allocUnsafe(length);
      readExactly(shpDescriptor, buffer, windowStart);
      activeWindow = { buffer, start: windowStart };
    }

    const relativePosition = contentPosition - activeWindow.start;

    if (relativePosition + prefixLength <= activeWindow.buffer.length) {
      return activeWindow.buffer.subarray(relativePosition, relativePosition + prefixLength);
    }

    const prefix = Buffer.allocUnsafe(prefixLength);
    readExactly(shpDescriptor, prefix, contentPosition);
    return prefix;
  }

  try {
    for (let recordIndex = 0; recordIndex < recordCount; recordIndex += 1) {
      const indexOffset = 100 + recordIndex * 8;
      const recordPosition = shx.readInt32BE(indexOffset) * 2;
      const contentLength = shx.readInt32BE(indexOffset + 4) * 2;
      const contentPosition = recordPosition + 8;

      if (contentLength < 4 || contentPosition + contentLength > fileSize) {
        throw new Error(`Invalid record ${recordIndex + 1} in ${shpPath}`);
      }

      const shapeTypeBuffer = readShapePrefix(contentPosition, contentLength);
      const shapeType = shapeTypeBuffer.readInt32LE(0);

      if (shapeType !== 0 && !SUPPORTED_POLYGON_TYPES.has(shapeType)) {
        throw new Error(`Unsupported polygon shape type ${shapeType} in ${shpPath}`);
      }

      if (SUPPORTED_POLYGON_TYPES.has(shapeType) && contentLength >= 44) {
        const bounds = [
          shapeTypeBuffer.readDoubleLE(4),
          shapeTypeBuffer.readDoubleLE(12),
          shapeTypeBuffer.readDoubleLE(20),
          shapeTypeBuffer.readDoubleLE(28),
        ];
        const possibleCandidates = candidates.filter((candidate) =>
          withinExpandedBounds(candidate.projected, bounds, toleranceMeters)
        );

        if (possibleCandidates.length) {
          const body = Buffer.allocUnsafe(contentLength);
          readExactly(shpDescriptor, body, contentPosition);
          const numberOfParts = body.readInt32LE(36);
          const numberOfPoints = body.readInt32LE(40);
          const pointOffset = 44 + numberOfParts * 4;
          const requiredLength = pointOffset + numberOfPoints * 16;

          if (
            numberOfParts < 1 ||
            numberOfPoints < 3 ||
            requiredLength > body.length
          ) {
            throw new Error(`Invalid polygon record ${recordIndex + 1} in ${shpPath}`);
          }

          const parts = Array.from({ length: numberOfParts }, (_, index) =>
            body.readInt32LE(44 + index * 4)
          );
          const properties = dbf ? readDbfRecord(dbf, recordIndex) : {};
          const resolvedClass = classResolver(properties);
          const assessments = assessPolygonBuffer(
            possibleCandidates,
            body,
            parts,
            numberOfPoints,
            pointOffset,
            toleranceMeters
          );

          for (const assessment of assessments) {
            const result = results.get(assessment.candidate.id);

            result.minimum_boundary_distance_m = Math.min(
              result.minimum_boundary_distance_m,
              assessment.minimumBoundaryDistance
            );

            if (assessment.inside && resolvedClass) {
              result.classes.add(resolvedClass);
            }
          }
        }
      }

      if (onProgress && ((recordIndex + 1) % 100000 === 0 || recordIndex + 1 === recordCount)) {
        onProgress({ processed: recordIndex + 1, total: recordCount });
      }
    }
  } finally {
    fs.closeSync(shpDescriptor);
    if (dbf) fs.closeSync(dbf.descriptor);
  }

  return Object.fromEntries(
    [...results.entries()].map(([id, result]) => [
      id,
      {
        classes: [...result.classes],
        minimum_boundary_distance_m: Number.isFinite(result.minimum_boundary_distance_m)
          ? Number(result.minimum_boundary_distance_m.toFixed(2))
          : null,
      },
    ])
  );
}
