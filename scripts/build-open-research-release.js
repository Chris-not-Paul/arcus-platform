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

console.log(JSON.stringify({
  audit_status: result.audit.status,
  events: result.events.length,
  release: result.manifest.version,
  release_directory: result.releaseDirectory,
  sources: result.sources.length,
}, null, 2));
