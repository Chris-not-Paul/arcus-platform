import AdmZip from "adm-zip";
import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import proj4 from "proj4";

import { privateDataDir } from "../server/config.js";
import {
  SEISMIC_PERCENTILE,
  SEISMIC_PROBABILITY_50_YEARS,
  SEISMIC_REFERENCE_RETURN_PERIOD_YEARS,
  SEISMIC_REQUIRED_PROCESSED_CRS,
  SEISMIC_REQUIRED_SOURCE_CRS,
  SEISMIC_SOURCE,
} from "../server/hazard/normalizers/seismicNormalizer.js";

const processingScriptVersion = "build-ingv-mps04-grid-v1";
const rawZipPath = path.join(
  privateDataDir,
  "raw",
  "ingv",
  "mps04",
  "OPCM3519_1B_ag_005_txt.zip"
);
const outputDir = path.join(privateDataDir, "professional", "seismic");
const outputGridPath = path.join(outputDir, "mps04-grid.json");
const outputManifestPath = path.join(outputDir, "mps04-manifest.json");

proj4.defs(
  SEISMIC_REQUIRED_SOURCE_CRS,
  "+proj=longlat +ellps=intl +towgs84=-87,-98,-121,0,0,0,0 +no_defs +type=crs"
);

function parseArgs(argv) {
  return argv.reduce(
    (args, item) => {
      if (!item.startsWith("--")) {
        return args;
      }

      const [key, ...valueParts] = item.slice(2).split("=");
      args[key] = valueParts.join("=") || true;
      return args;
    },
    {
      input: rawZipPath,
      grid: outputGridPath,
      manifest: outputManifestPath,
    }
  );
}

async function sha256File(filePath) {
  const hash = crypto.createHash("sha256");
  const buffer = await fs.readFile(filePath);

  hash.update(buffer);

  return hash.digest("hex");
}

function sha256Text(value) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

function extractTextFromZip(zipPath) {
  const zip = new AdmZip(zipPath);
  const entries = zip
    .getEntries()
    .filter((entry) => !entry.isDirectory && /\.txt$/i.test(entry.entryName));

  if (entries.length !== 1) {
    throw new Error(
      `Expected exactly one MPS04 txt file in ZIP, found ${entries.length}.`
    );
  }

  return {
    entryName: entries[0].entryName,
    text: entries[0].getData().toString("utf8"),
  };
}

function parseMps04Txt(text) {
  const lines = String(text || "")
    .replace(/^\uFEFF/, "")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  const header = lines.shift();

  if (!/^id\s+lon\s+lat\s+ag\s+16perc\s+84perc$/i.test(header || "")) {
    throw new Error(`Unexpected MPS04 TXT header: ${header || ""}`);
  }

  const nodes = lines.map((line) => {
    const parts = line.split(/\s+/);

    if (parts.length !== 6) {
      throw new Error(`Invalid MPS04 TXT row: ${line}`);
    }

    const [id, lon, lat, ag, p16, p84] = parts;
    const sourceLongitude = Number(lon);
    const sourceLatitude = Number(lat);
    const [longitude, latitude] = proj4(
      SEISMIC_REQUIRED_SOURCE_CRS,
      SEISMIC_REQUIRED_PROCESSED_CRS,
      [sourceLongitude, sourceLatitude]
    );

    return {
      id,
      latitude: Number(latitude.toFixed(7)),
      longitude: Number(longitude.toFixed(7)),
      pga_p16_g: Number(Number(p16).toFixed(5)),
      pga_p50_g: Number(Number(ag).toFixed(5)),
      pga_p84_g: Number(Number(p84).toFixed(5)),
      source_latitude: sourceLatitude,
      source_longitude: sourceLongitude,
    };
  });

  const nodeKeys = new Set();

  nodes.forEach((node) => {
    const key = `${node.latitude}:${node.longitude}`;

    if (
      !Number.isFinite(node.latitude) ||
      !Number.isFinite(node.longitude) ||
      !Number.isFinite(node.pga_p50_g) ||
      !Number.isFinite(node.pga_p16_g) ||
      !Number.isFinite(node.pga_p84_g)
    ) {
      throw new Error(`Invalid numeric MPS04 node: ${node.id}`);
    }

    if (nodeKeys.has(key)) {
      throw new Error(`Duplicate transformed MPS04 node: ${key}`);
    }

    nodeKeys.add(key);
  });

  return nodes;
}

function bboxForNodes(nodes) {
  return {
    east: Math.max(...nodes.map((node) => node.longitude)),
    north: Math.max(...nodes.map((node) => node.latitude)),
    south: Math.min(...nodes.map((node) => node.latitude)),
    west: Math.min(...nodes.map((node) => node.longitude)),
  };
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const inputPath = path.resolve(args.input);
  const gridPath = path.resolve(args.grid);
  const manifestPath = path.resolve(args.manifest);
  const { entryName, text } = extractTextFromZip(inputPath);
  const nodes = parseMps04Txt(text);
  const sourceChecksum = await sha256File(inputPath);
  const grid = {
    metadata: {
      analysis_mode: "grid_sampling",
      generated_at: new Date().toISOString(),
      model: "MPS04",
      node_count: nodes.length,
      processed_crs: SEISMIC_REQUIRED_PROCESSED_CRS,
      source_crs: SEISMIC_REQUIRED_SOURCE_CRS,
    },
    nodes,
  };
  const gridJson = `${JSON.stringify(grid, null, 2)}\n`;
  const processedChecksum = sha256Text(gridJson);
  const manifest = {
    coordinate_transform_applied: true,
    coverage_bbox_wgs84: bboxForNodes(nodes),
    dataset_version: "MPS04-OPCM3519-1B-ag-005",
    doi: SEISMIC_SOURCE.doi,
    downloaded_at: null,
    grid_spacing_degrees: 0.05,
    input_zip_entry: entryName,
    licence: SEISMIC_SOURCE.licence,
    max_nearest_node_distance_m: 9000,
    model: "MPS04",
    node_count: nodes.length,
    percentile: SEISMIC_PERCENTILE,
    probability_of_exceedance_50_years: SEISMIC_PROBABILITY_50_YEARS,
    processed_checksum_sha256: processedChecksum,
    processed_crs: SEISMIC_REQUIRED_PROCESSED_CRS,
    processing_script_version: processingScriptVersion,
    reference_ground_condition:
      "rigid/reference ground condition as documented by the MPS04 source",
    reference_return_period_years: SEISMIC_REFERENCE_RETURN_PERIOD_YEARS,
    shaking_parameter: "PGA",
    source_checksum_sha256: sourceChecksum,
    source_crs: SEISMIC_REQUIRED_SOURCE_CRS,
    source_name: SEISMIC_SOURCE.sourceName,
    source_url: SEISMIC_SOURCE.downloadUrl,
    transform_accuracy_note:
      "ED50 to WGS84 conversion is performed with proj4 using an explicit EPSG:4230 seven-parameter definition. Site-scale design use requires authoritative geodetic review.",
    transform_library: "proj4",
    transform_method: "EPSG:4230 -> EPSG:4326",
    unit: "g",
  };

  await fs.mkdir(path.dirname(gridPath), { recursive: true });
  await fs.mkdir(path.dirname(manifestPath), { recursive: true });
  await fs.writeFile(gridPath, gridJson, "utf8");
  await fs.writeFile(
    manifestPath,
    `${JSON.stringify(manifest, null, 2)}\n`,
    "utf8"
  );
  console.log(
    JSON.stringify(
      {
        grid_path: gridPath,
        manifest_path: manifestPath,
        node_count: nodes.length,
        processed_checksum_sha256: processedChecksum,
        source_checksum_sha256: sourceChecksum,
      },
      null,
      2
    )
  );
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
