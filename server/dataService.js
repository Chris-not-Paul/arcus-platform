import fs from "node:fs/promises";
import path from "node:path";

import {
  privateDataDir,
} from "./config.js";

const jsonCache = new Map();

const professionalResources = new Map([
  ["api-manifest", "api-manifest.json"],
  ["model-cards", "model-cards.json"],
  ["data-quality", "data-quality.json"],
  ["data-dictionary", "data-dictionary.json"],
  ["data-release", "data-release.json"],
  ["professional-sources", "professional-sources.json"],
  ["professional-events", "professional-events.json"],
  ["external-hazard-layers", "external-hazard-layers.json"],
  ["hazard-exposure-preview", "hazard-exposure-preview.json"],
  ["hydraulic-intelligence-audit", "hydraulic-intelligence-audit.json"],
  ["ainop-bridge-index", "ainop-bridge-index.json"],
  ["event-reliability", "event-reliability.json"],
  ["event-vulnerability", "event-vulnerability.json"],
  ["territory-profiles", "territory-profiles.json"],
  ["collapse-intelligence", "collapse-intelligence/collapse-intelligence-analysis.json"],
]);

const openResources = new Map([
  ["manifest", "manifest.json"],
  ["events", "events.json"],
  ["sources", "sources.json"],
  ["taxonomy", "taxonomy.json"],
  ["data-dictionary", "data-dictionary.json"],
  ["changelog", "changelog.json"],
  ["statistics", "statistics.json"],
  ["quality-audit", "quality-audit.json"],
  ["id-mapping", "id-mapping.json"],
]);

const openDownloads = new Map([
  ["csv", { contentType: "text/csv; charset=utf-8", fileName: "events.csv" }],
  ["geojson", { contentType: "application/geo+json; charset=utf-8", fileName: "events.geojson" }],
]);

async function getOpenReleaseContext() {
  const releaseRoot = path.join(privateDataDir, "open", "releases");
  const current = await readJsonFromAbsolutePath(path.join(releaseRoot, "current.json"));
  const releaseDirectory = path.join(releaseRoot, current.version);

  return {
    releaseDirectory,
    version: current.version,
  };
}

async function readJson(relativePath) {
  const absolutePath = path.join(
    privateDataDir,
    relativePath
  );

  if (jsonCache.has(absolutePath)) {
    return jsonCache.get(absolutePath);
  }

  const content = await fs.readFile(
    absolutePath,
    "utf8"
  );
  const data = JSON.parse(content);

  jsonCache.set(absolutePath, data);

  return data;
}

async function readJsonFromAbsolutePath(absolutePath) {
  if (jsonCache.has(absolutePath)) {
    return jsonCache.get(absolutePath);
  }

  const content = await fs.readFile(absolutePath, "utf8");
  const data = JSON.parse(content);

  jsonCache.set(absolutePath, data);

  return data;
}

export async function getPrivateEvents() {
  return readJson("processed/events.json");
}

export async function getPrivateSources() {
  return readJson("processed/sources.json");
}

export async function getOpenEvents() {
  const resource = await getOpenResource("events");

  return resource?.events || [];
}

export async function getOpenSources() {
  const resource = await getOpenResource("sources");

  return resource?.sources || [];
}

export async function getOpenResource(resource) {
  const fileName = openResources.get(resource);

  if (!fileName) {
    return null;
  }

  const context = await getOpenReleaseContext();

  return readJsonFromAbsolutePath(path.join(context.releaseDirectory, fileName));
}

export async function getOpenDownload(format) {
  const download = openDownloads.get(format);

  if (!download) {
    return null;
  }

  const context = await getOpenReleaseContext();
  const manifest = await getOpenResource("manifest");

  return {
    content: await fs.readFile(path.join(context.releaseDirectory, download.fileName)),
    contentType: download.contentType,
    filename: `${context.version}-${download.fileName}`,
    version: manifest.version,
  };
}

export function getOpenResourceNames() {
  return [...openResources.keys()];
}

export async function getProfessionalResource(resource) {
  const fileName =
    professionalResources.get(resource);

  if (!fileName) {
    return null;
  }

  return readJson(
    path.join("professional", fileName)
  );
}

export function getProfessionalResourceNames() {
  return [...professionalResources.keys()];
}
