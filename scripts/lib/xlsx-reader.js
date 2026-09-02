import AdmZip from "adm-zip";

function decodeXml(value = "") {
  return String(value)
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, "\"")
    .replace(/&apos;/g, "'");
}

function columnIndex(reference = "") {
  const match = String(reference).match(/[A-Z]+/);

  if (!match) {
    return -1;
  }

  return [...match[0]].reduce(
    (total, character) => total * 26 + character.charCodeAt(0) - 64,
    0
  ) - 1;
}

function excelDateToIso(value) {
  const serial = Number(value);

  if (!Number.isFinite(serial)) {
    return value;
  }

  const epoch = Date.UTC(1899, 11, 30);
  const date = new Date(epoch + serial * 86400000);

  return date.toISOString().slice(0, 10);
}

function readEntry(zip, name) {
  const entry = zip.getEntry(name);

  if (!entry) {
    return "";
  }

  return entry.getData().toString("utf8");
}

function parseSharedStrings(xml) {
  return [...xml.matchAll(/<(?:[\w.-]+:)?si\b[^>]*>([\s\S]*?)<\/(?:[\w.-]+:)?si>/g)].map((match) =>
    decodeXml(
      [...match[1].matchAll(/<(?:[\w.-]+:)?t\b[^>]*>([\s\S]*?)<\/(?:[\w.-]+:)?t>/g)]
        .map((item) => item[1])
        .join("")
    )
  );
}

function workbookSheets(zip) {
  const workbookXml = readEntry(zip, "xl/workbook.xml");
  const relsXml = readEntry(zip, "xl/_rels/workbook.xml.rels");
  const attributes = (tag) => Object.fromEntries(
    [...tag.matchAll(/([\w:.-]+)="([^"]*)"/g)]
      .map((match) => [match[1], decodeXml(match[2])])
  );
  const rels = new Map(
    [...relsXml.matchAll(/<Relationship\b[^>]*\/?\s*>/g)]
      .map((match) => attributes(match[0]))
      .filter((item) => item.Id && item.Target)
      .map((item) => {
        const target = item.Target.startsWith("/")
          ? item.Target.slice(1)
          : item.Target.startsWith("xl/")
            ? item.Target
            : `xl/${item.Target}`;

        return [item.Id, target];
      })
  );

  return [...workbookXml.matchAll(/<(?:[\w.-]+:)?sheet\b[^>]*\/?\s*>/g)]
    .map((match) => attributes(match[0]))
    .filter((item) => item.name && item["r:id"] && rels.has(item["r:id"]))
    .map((item) => ({
      name: item.name,
      path: rels.get(item["r:id"]),
    }));
}

function cellValue(cellXml, sharedStrings) {
  const cellTag = cellXml.match(/<(?:[\w.-]+:)?c\b[^>]*\/?\s*>/)?.[0] || "";
  const attributes = Object.fromEntries(
    [...cellTag.matchAll(/([\w:.-]+)="([^"]*)"/g)]
      .map((match) => [match[1], decodeXml(match[2])])
  );
  const reference = attributes.r || "";
  const type = attributes.t || null;
  const raw = cellXml.match(/<(?:[\w.-]+:)?v\b[^>]*>([\s\S]*?)<\/(?:[\w.-]+:)?v>/)?.[1] ?? null;
  const inline = cellXml.match(/<(?:[\w.-]+:)?is\b[^>]*>[\s\S]*?<(?:[\w.-]+:)?t\b[^>]*>([\s\S]*?)<\/(?:[\w.-]+:)?t>[\s\S]*?<\/(?:[\w.-]+:)?is>/)?.[1] ?? null;

  return {
    index: columnIndex(reference),
    value: type === "s"
      ? sharedStrings[Number(raw)] ?? null
      : type === "b"
        ? raw === "1"
        : type === "str"
          ? decodeXml(raw)
        : inline !== null
          ? decodeXml(inline)
          : raw,
  };
}

function parseSheetRows(zip, sheetPath, sharedStrings) {
  const sheetXml = readEntry(zip, sheetPath);

  return [...sheetXml.matchAll(/<(?:[\w.-]+:)?row\b[^>]*>([\s\S]*?)<\/(?:[\w.-]+:)?row>/g)]
    .map((rowMatch) => {
      const row = [];

      // Excel may encode intentionally blank cells as self-closing `<c .../>`
      // elements. Matching only paired cells can consume the following cell and
      // shift values under the wrong header, which is especially dangerous for
      // release generation. Cell references remain the authoritative position.
      [...rowMatch[1].matchAll(/<(?:[\w.-]+:)?c\b[^>]*\/>|<(?:[\w.-]+:)?c\b[^>]*>[\s\S]*?<\/(?:[\w.-]+:)?c>/g)].forEach((cellMatch) => {
        const cell = cellValue(cellMatch[0], sharedStrings);

        if (cell.index >= 0) {
          row[cell.index] = cell.value;
        }
      });

      return row;
    });
}

function isDateField(field) {
  return ["date", "publication_date", "accessed_at", "access_date"].includes(field);
}

function rowHasValues(row) {
  return row.some(
    (value) => value !== undefined && value !== null && String(value).trim() !== ""
  );
}

function rowsToObjects(rows) {
  const headers = (rows[0] || []).map((header) => String(header || "").trim());

  return rows
    .slice(1)
    .filter(rowHasValues)
    .map((row) => {
      const item = {};

      headers.forEach((header, index) => {
        if (!header) {
          return;
        }

        const raw = row[index] ?? null;
        item[header] = isDateField(header) && raw !== null && /^\d+(\.\d+)?$/.test(String(raw))
          ? excelDateToIso(raw)
          : raw;
      });

      return item;
    });
}

export function readXlsxSheet(filePath, sheetName) {
  const zip = new AdmZip(filePath);
  const sharedStrings = parseSharedStrings(readEntry(zip, "xl/sharedStrings.xml"));
  const sheet = workbookSheets(zip).find((item) => item.name === sheetName);

  if (!sheet) {
    throw new Error(`Sheet not found in workbook: ${sheetName}`);
  }

  return rowsToObjects(parseSheetRows(zip, sheet.path, sharedStrings));
}

export function readXlsxHeaders(filePath, sheetName) {
  const zip = new AdmZip(filePath);
  const sharedStrings = parseSharedStrings(readEntry(zip, "xl/sharedStrings.xml"));
  const sheet = workbookSheets(zip).find((item) => item.name === sheetName);

  if (!sheet) {
    throw new Error(`Sheet not found in workbook: ${sheetName}`);
  }

  return (parseSheetRows(zip, sheet.path, sharedStrings)[0] || [])
    .map((header) => String(header || "").trim())
    .filter(Boolean);
}
