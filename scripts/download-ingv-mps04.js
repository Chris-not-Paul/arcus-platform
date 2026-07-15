import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";

import { privateDataDir } from "../server/config.js";
import { SEISMIC_SOURCE } from "../server/hazard/normalizers/seismicNormalizer.js";

const outputDir = path.join(privateDataDir, "raw", "ingv", "mps04");
const outputPath = path.join(outputDir, "OPCM3519_1B_ag_005_txt.zip");

async function sha256(filePath) {
  const hash = crypto.createHash("sha256");
  const buffer = await fs.readFile(filePath);

  hash.update(buffer);

  return hash.digest("hex");
}

async function main() {
  await fs.mkdir(outputDir, { recursive: true });

  const response = await fetch(SEISMIC_SOURCE.downloadUrl, {
    headers: {
      Accept: "application/zip, application/octet-stream, */*",
    },
  });

  if (!response.ok) {
    throw new Error(
      `INGV MPS04 download failed: ${response.status} ${response.statusText}`
    );
  }

  const body = Buffer.from(await response.arrayBuffer());

  await fs.writeFile(outputPath, body);

  const checksum = await sha256(outputPath);
  const manifest = {
    checksum_sha256: checksum,
    downloaded_at: new Date().toISOString(),
    licence: SEISMIC_SOURCE.licence,
    model: "MPS04",
    output_path: outputPath,
    source_dataset_page: SEISMIC_SOURCE.datasetPage,
    source_doi: SEISMIC_SOURCE.doi,
    source_url: SEISMIC_SOURCE.downloadUrl,
  };
  const manifestPath = path.join(outputDir, "download-manifest.json");

  await fs.writeFile(
    manifestPath,
    `${JSON.stringify(manifest, null, 2)}\n`,
    "utf8"
  );
  console.log(JSON.stringify(manifest, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
