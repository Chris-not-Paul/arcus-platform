import fs from "node:fs/promises";
import path from "node:path";

import {
  privateDataDir,
  publicReleaseEndYear,
} from "./config.js";

const jsonCache = new Map();

const professionalResources = new Map([
  ["api-manifest", "api-manifest.json"],
  ["model-cards", "model-cards.json"],
  ["data-quality", "data-quality.json"],
  ["data-dictionary", "data-dictionary.json"],
  ["data-release", "data-release.json"],
  ["external-hazard-layers", "external-hazard-layers.json"],
  ["hazard-exposure-preview", "hazard-exposure-preview.json"],
  ["ainop-bridge-index", "ainop-bridge-index.json"],
  ["event-reliability", "event-reliability.json"],
  ["event-vulnerability", "event-vulnerability.json"],
  ["territory-profiles", "territory-profiles.json"],
]);

function yearFromDate(value) {
  const match = String(value || "").match(/\d{4}/);

  return match ? Number(match[0]) : null;
}

function sanitizeOpenEvent(event) {
  return {
    event_id: event.event_id,
    event_slug: event.event_slug,
    date: event.date,
    municipality: event.municipality,
    province: event.province,
    region: event.region,
    latitude: event.latitude,
    longitude: event.longitude,
    bridge_crossing_type: event.bridge_crossing_type,
    bridge_crossing_name: event.bridge_crossing_name,
    destination_use: event.destination_use,
    collapse_severity: event.collapse_severity,
    victims: event.victims,
    injuries: event.injuries,
    triggered: event.triggered,
    cause_category: event.cause_category,
    specific_cause: event.specific_cause,
    source_confidence: event.source_confidence,
    exact_location: event.exact_location,
    bridge_name: event.bridge_name,
    structural_type: event.structural_type,
    material_type: event.material_type,
    construction_year: event.construction_year,
    curation_level: event.curation_level,
    description: event.description,
  };
}

function sanitizeOpenSource(source, publicEventIds) {
  if (!publicEventIds.has(source.event_id)) {
    return null;
  }

  return {
    source_id: source.source_id,
    event_id: source.event_id,
    source_type: source.source_type,
    source_name: source.source_name,
    title: source.title,
    source_url: source.source_url,
    publication_date: source.publication_date,
    accessed_at: source.accessed_at,
    language: source.language,
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

export async function getPrivateEvents() {
  return readJson("processed/events.json");
}

export async function getPrivateSources() {
  return readJson("processed/sources.json");
}

export async function getOpenEvents() {
  const events = await getPrivateEvents();

  return events
    .filter((event) => {
      const year = yearFromDate(event.date);

      return year && year <= publicReleaseEndYear;
    })
    .map(sanitizeOpenEvent);
}

export async function getOpenSources() {
  const events = await getOpenEvents();
  const publicEventIds = new Set(
    events.map((event) => event.event_id)
  );
  const sources = await getPrivateSources();

  return sources
    .map((source) =>
      sanitizeOpenSource(source, publicEventIds)
    )
    .filter(Boolean);
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
