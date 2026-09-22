import fs from "node:fs";
import path from "node:path";

import {
  buildOpenResearchRelease,
} from "./lib/open-research-release.js";
import { buildOpenSharedEpisodes } from "./lib/open-shared-episodes.js";

const result = buildOpenResearchRelease({
  legacyEventsPath: path.resolve("private-data/processed/events.json"),
  masterResearchPath: path.resolve("private-data/raw/MASTER_RESEARCH.xlsx"),
  outputRoot: path.resolve("private-data/open/releases"),
  provinceGeoJsonPath: path.resolve("public/data/geo/italy-provinces.geojson"),
});

const sharedEpisodes = buildOpenSharedEpisodes({
  events: result.events,
  landslideRegistry: JSON.parse(fs.readFileSync(
    path.resolve("config/collapse-intelligence/landslide-outcome-registry.json"),
    "utf8"
  )),
  release: result.manifest.version,
  seismicRegistry: JSON.parse(fs.readFileSync(
    path.resolve("config/collapse-intelligence/seismic-outcome-registry.json"),
    "utf8"
  )),
  sources: result.sources,
});

fs.writeFileSync(
  path.join(result.releaseDirectory, "episodes.json"),
  `${JSON.stringify(sharedEpisodes, null, 2)}\n`,
  "utf8"
);
result.manifest.resources.episodes = "episodes.json";
result.manifest.shared_episode_count = sharedEpisodes.summary.episode_count;
result.manifest.shared_episode_event_count = sharedEpisodes.summary.grouped_event_count;
result.manifest.known_limitations = [
  ...result.manifest.known_limitations,
  "Published shared episodes control record clustering; they do not establish an identical structural failure mechanism across bridges.",
];
fs.writeFileSync(
  path.join(result.releaseDirectory, "manifest.json"),
  `${JSON.stringify(result.manifest, null, 2)}\n`,
  "utf8"
);

const publicReleaseDirectory = path.resolve("public/data/open-release");
const publicReleaseFiles = [
  "changelog.json",
  "data-dictionary.json",
  "events.csv",
  "events.geojson",
  "events.json",
  "episodes.json",
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
  shared_episodes: sharedEpisodes.summary.episode_count,
  public_release_directory: publicReleaseDirectory,
  release: result.manifest.version,
  release_directory: result.releaseDirectory,
  sources: result.sources.length,
}, null, 2));
