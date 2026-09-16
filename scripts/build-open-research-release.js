import fs from "node:fs";
import path from "node:path";

import {
  buildOpenResearchRelease,
} from "./lib/open-research-release.js";

const result = buildOpenResearchRelease({
  legacyEventsPath: path.resolve("private-data/processed/events.json"),
  masterResearchPath: path.resolve("private-data/raw/MASTER_RESEARCH.xlsx"),
  outputRoot: path.resolve("private-data/open/releases"),
  provinceGeoJsonPath: path.resolve("public/data/geo/italy-provinces.geojson"),
});

const publicReleaseDirectory = path.resolve("public/data/open-release");
const publicReleaseFiles = [
  "changelog.json",
  "data-dictionary.json",
  "events.csv",
  "events.geojson",
  "events.json",
  "id-mapping.json",
  "manifest.json",
  "quality-audit.json",
  "sources.json",
  "statistics.json",
  "taxonomy.json",
];

fs.mkdirSync(publicReleaseDirectory, { recursive: true });
publicReleaseFiles.forEach((fileName) => {
  fs.copyFileSync(
    path.join(result.releaseDirectory, fileName),
    path.join(publicReleaseDirectory, fileName)
  );
});

console.log(JSON.stringify({
  audit_status: result.audit.status,
  events: result.events.length,
  public_release_directory: publicReleaseDirectory,
  release: result.manifest.version,
  release_directory: result.releaseDirectory,
  sources: result.sources.length,
}, null, 2));
