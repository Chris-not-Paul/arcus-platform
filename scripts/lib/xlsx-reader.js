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
  return [...xml.matchAll(/<si>([\s\S]*?)<\/si>/g)].map((match) =>
    decodeXml(
      [...match[1].matchAll(/<t[^>]*>([\s\S]*?)<\/t>/g)]
        .map((item) => item[1])
        .join("")
    )
  );
}

function workbookSheets(zip) {
  const workbookXml = readEntry(zip, "xl/workbook.xml");
  const relsXml = readEntry(zip, "xl/_rels/workbook.xml.rels");
  const rels = new Map(
    [...relsXml.matchAll(/<Relationship[^>]+Id="([^"]+)"[^>]+Target="([^"]+)"/g)]
      .map((match) => [match[1], match[2]])
  );

  return [...workbookXml.matchAll(/<sheet[^>]+name="([^"]+)"[^>]+r:id="([^"]+)"/g)]
    .map((match) => ({
      name: decodeXml(match[1]),
      path: `xl/${rels.get(match[2])}`,
    }));
}

function cellValue(cellXml, sharedStrings) {
  const reference = cellXml.match(/<c[^>]*r="([^"]+)"/)?.[1] || "";
  const type = cellXml.match(/<c[^>]*t="([^"]+)"/)?.[1] || null;
  const raw = cellXml.match(/<v>([\s\S]*?)<\/v>/)?.[1] ?? null;
  const inline = cellXml.match(/<is>[\s\S]*?<t[^>]*>([\s\S]*?)<\/t>[\s\S]*?<\/is>/)?.[1] ?? null;

  return {
    index: columnIndex(reference),
    value: type === "s"
      ? sharedStrings[Number(raw)] ?? null
      : type === "b"
        ? raw === "1"
        : inline !== null
          ? decodeXml(inline)
          : raw,
  };
}

function parseSheetRows(zip, sheetPath, sharedStrings) {
  const sheetXml = readEntry(zip, sheetPath);

  return [...sheetXml.matchAll(/<row[^>]*>([\s\S]*?)<\/row>/g)]
    .map((rowMatch) => {
      const row = [];

      // Excel may encode intentionally blank cells as self-closing `<c .../>`
      // elements. Matching only paired cells can consume the following cell and
      // shift values under the wrong header, which is especially dangerous for
      // release generation. Cell references remain the authoritative position.
      [...rowMatch[1].matchAll(/<c\b[^>]*\/>|<c\b[^>]*>[\s\S]*?<\/c>/g)].forEach((cellMatch) => {
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
