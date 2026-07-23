import fs from "node:fs";
import path from "node:path";

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8").replace(/^\uFEFF/, ""));
}

function rowsFromResource(resource, field) {
  return Array.isArray(resource) ? resource : resource?.[field] || [];
}

export function readProfessionalDataset(root) {
  const professionalRoot = path.join(root, "private-data", "professional");
  const eventResource = readJson(path.join(professionalRoot, "professional-events.json"));
  const sourceResource = readJson(path.join(professionalRoot, "professional-sources.json"));

  return {
    events: rowsFromResource(eventResource, "events"),
    sources: rowsFromResource(sourceResource, "sources"),
  };
}
