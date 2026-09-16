const encoder = new TextEncoder();

const crcTable = (() => {
  const table = new Uint32Array(256);

  for (let index = 0; index < 256; index += 1) {
    let value = index;
    for (let bit = 0; bit < 8; bit += 1) {
      value = (value & 1) ? (0xedb88320 ^ (value >>> 1)) : (value >>> 1);
    }
    table[index] = value >>> 0;
  }

  return table;
})();

function asBytes(content) {
  return content instanceof Uint8Array ? content : encoder.encode(String(content));
}

function crc32(bytes) {
  let crc = 0xffffffff;
  for (const byte of bytes) crc = crcTable[(crc ^ byte) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}

function dosTimestamp(date) {
  const year = Math.max(1980, date.getFullYear());
  return {
    date: ((year - 1980) << 9) | ((date.getMonth() + 1) << 5) | date.getDate(),
    time: (date.getHours() << 11) | (date.getMinutes() << 5) | Math.floor(date.getSeconds() / 2),
  };
}

function writeHeader(size, values) {
  const bytes = new Uint8Array(size);
  const view = new DataView(bytes.buffer);
  values.forEach(([offset, value, width]) => {
    if (width === 2) view.setUint16(offset, value, true);
    else view.setUint32(offset, value, true);
  });
  return bytes;
}

function joinBytes(parts) {
  const result = new Uint8Array(parts.reduce((total, part) => total + part.length, 0));
  let offset = 0;
  parts.forEach((part) => {
    result.set(part, offset);
    offset += part.length;
  });
  return result;
}

export default function createStoredZip(entries, createdAt = new Date()) {
  const localParts = [];
  const centralParts = [];
  const stamp = dosTimestamp(createdAt);
  let localOffset = 0;

  entries.forEach(({ content, name }) => {
    const filename = encoder.encode(name.replace(/\\/g, "/"));
    const data = asBytes(content);
    const checksum = crc32(data);
    const localHeader = writeHeader(30, [
      [0, 0x04034b50, 4], [4, 20, 2], [6, 0x0800, 2], [8, 0, 2],
      [10, stamp.time, 2], [12, stamp.date, 2], [14, checksum, 4],
      [18, data.length, 4], [22, data.length, 4], [26, filename.length, 2], [28, 0, 2],
    ]);
    const centralHeader = writeHeader(46, [
      [0, 0x02014b50, 4], [4, 20, 2], [6, 20, 2], [8, 0x0800, 2], [10, 0, 2],
      [12, stamp.time, 2], [14, stamp.date, 2], [16, checksum, 4],
      [20, data.length, 4], [24, data.length, 4], [28, filename.length, 2],
      [30, 0, 2], [32, 0, 2], [34, 0, 2], [36, 0, 2], [38, 0, 4], [42, localOffset, 4],
    ]);

    localParts.push(localHeader, filename, data);
    centralParts.push(centralHeader, filename);
    localOffset += localHeader.length + filename.length + data.length;
  });

  const centralDirectory = joinBytes(centralParts);
  const endRecord = writeHeader(22, [
    [0, 0x06054b50, 4], [4, 0, 2], [6, 0, 2], [8, entries.length, 2],
    [10, entries.length, 2], [12, centralDirectory.length, 4], [16, localOffset, 4], [20, 0, 2],
  ]);

  return joinBytes([...localParts, centralDirectory, endRecord]);
}
