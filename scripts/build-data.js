import fs from "fs";
import path from "path";
import csv from "csv-parser";

/* ================================= */
/* DATA CONTAINERS */
/* ================================= */

const events = [];

const sources = [];

/* ================================= */
/* PATHS */
/* ================================= */

const eventsCsvPath = path.resolve(
  "public/data/raw/EVENTS.csv"
);

const sourcesCsvPath = path.resolve(
  "public/data/raw/SOURCES.csv"
);

const outputEventsPath = path.resolve(
  "public/data/processed/events.json"
);

const outputSourcesPath = path.resolve(
  "public/data/processed/sources.json"
);

/* ================================= */
/* VALUE PARSER */
/* ================================= */

function parseValue(value) {

  if (
    value === undefined ||
    value === null
  ) {
    return null;
  }

  const trimmed =
    String(value).trim();

  if (trimmed === "") {
    return null;
  }

  if (trimmed === "TRUE") {
    return true;
  }

  if (trimmed === "FALSE") {
    return false;
  }

  const normalized =
    trimmed.replace(",", ".");

  const numeric =
    Number(normalized);

  if (
    !isNaN(numeric) &&
    trimmed !== ""
  ) {
    return numeric;
  }

  return normalized.trim();
}

function cleanKey(key) {

  return String(key)
    .replace(/^\uFEFF/, "")
    .replace(/^ï»¿/, "")
    .trim();
}

/* ================================= */
/* ROW PROCESSING */
/* ================================= */

function processRow(row) {

  const processed = {};

  Object.keys(row).forEach(
    (key) => {

      const cleanKeyValue =
        cleanKey(key);

      if (!cleanKeyValue) {
        return;
      }

      processed[cleanKeyValue] =
        parseValue(row[key]);
    }
  );

  const hasValues =
    Object.values(processed).some(
      (value) => value !== null
    );

  if (!hasValues) {
    return null;
  }

  return processed;
}

/* ================================= */
/* LOAD EVENTS */
/* ================================= */

function loadEvents() {

  return new Promise(
    (resolve, reject) => {

      fs.createReadStream(
        eventsCsvPath
      )

        .pipe(
          csv({
            separator: ";",
          })
        )

        .on("data", (row) => {

          const processed =
            processRow(row);

          if (processed) {
            events.push(processed);
          }
        })

        .on("end", () => {

          console.log(
            `Loaded ${events.length} events`
          );

          resolve();
        })

        .on("error", reject);
    }
  );
}

/* ================================= */
/* LOAD SOURCES */
/* ================================= */

function loadSources() {

  return new Promise(
    (resolve, reject) => {

      fs.createReadStream(
        sourcesCsvPath
      )

        .pipe(
          csv({
            separator: ";",
          })
        )

        .on("data", (row) => {

          const processed =
            processRow(row);

          if (processed) {
            sources.push(processed);
          }
        })

        .on("end", () => {

          console.log(
            `Loaded ${sources.length} sources`
          );

          resolve();
        })

        .on("error", reject);
    }
  );
}

/* ================================= */
/* SAVE JSON */
/* ================================= */

function saveJson() {

  fs.writeFileSync(
    outputEventsPath,
    JSON.stringify(
      events,
      null,
      2
    )
  );

  fs.writeFileSync(
    outputSourcesPath,
    JSON.stringify(
      sources,
      null,
      2
    )
  );

  console.log(
    "JSON files generated"
  );
}

/* ================================= */
/* BUILD PIPELINE */
/* ================================= */

async function buildData() {

  try {

    console.log(
      "Starting ARCUS data build..."
    );

    await loadEvents();

    await loadSources();

    saveJson();

    console.log(
      "ARCUS dataset successfully updated"
    );

  } catch (error) {

    console.error(
      "Build failed:",
      error
    );
  }
}

/* ================================= */
/* RUN */
/* ================================= */

buildData();
