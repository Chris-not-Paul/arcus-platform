import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { evaluatePointHazardExposure } from "../server/hazard/hazardExposureService.js";
import { CURRENT_CONTEXT_CAVEAT } from "./analyze-collapse-intelligence.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, "..");
const OUTPUT_DIR = path.join(
  ROOT,
  "private-data",
  "professional",
  "collapse-intelligence"
);
const SIGNATURES_PATH = path.join(OUTPUT_DIR, "collapse-hazard-signatures.json");
const MANIFEST_PATH = path.join(OUTPUT_DIR, "collapse-hazard-signatures-manifest.json");
const ERRORS_PATH = path.join(OUTPUT_DIR, "collapse-hazard-signatures-errors.json");
const CACHE_PATH = path.join(OUTPUT_DIR, "collapse-hazard-signatures-cache.json");

function parseArgs(argv = process.argv.slice(2)) {
  const options = {
    bypassCache: false,
    dryRun: false,
    eventId: null,
    limit: null,
    outputDir: OUTPUT_DIR,
    resume: false,
    retry: 2,
    rateLimitMs: 250,
  };

  argv.forEach((argument) => {
    if (argument === "--dry-run") {
      options.dryRun = true;
    } else if (argument === "--resume") {
      options.resume = true;
    } else if (argument === "--bypass-cache") {
      options.bypassCache = true;
    } else if (argument.startsWith("--event-id=")) {
      options.eventId = argument.split("=").slice(1).join("=");
    } else if (argument.startsWith("--limit=")) {
      options.limit = Number(argument.split("=")[1]);
    } else if (argument.startsWith("--output=")) {
      options.outputDir = path.resolve(argument.split("=").slice(1).join("="));
    }
  });

  return options;
}

function readJson(filePath, fallback) {
  if (!fs.existsSync(filePath)) {
    return fallback;
  }

  return JSON.parse(fs.readFileSync(filePath, "utf8").replace(/^\uFEFF/, ""));
}

function writeJson(filePath, value) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(`${filePath}.tmp`, JSON.stringify(value, null, 2), "utf8");
  fs.renameSync(`${filePath}.tmp`, filePath);
}

function validCoordinate(event) {
  return Number.isFinite(Number(event.latitude)) &&
    Number.isFinite(Number(event.longitude));
}

function cacheKey(event) {
  return [
    event.event_id,
    Number(event.latitude).toFixed(5),
    Number(event.longitude).toFixed(5),
    "hydraulic-landslide-seismic",
  ].join(":");
}

function dryRunSignature(event) {
  return {
    coordinates: {
      latitude: Number(event.latitude),
      longitude: Number(event.longitude),
    },
    event_id: event.event_id,
    hydraulic: {
      highest_class: null,
      matched_classes: [],
      provider_version: "ispra-flood-wfs-v2",
      queried_at: null,
      source_dataset_version: null,
      status: "not_queried_dry_run",
    },
    landslide: {
      attention_area: false,
      highest_hazard_class: null,
      matched_hazard_classes: [],
      provider_version: "ispra-landslide-pai-wfs-v1",
      queried_at: null,
      source_dataset_version: "5.0",
      status: "not_queried_dry_run",
    },
    seismic: {
      national_percentile: null,
      pga_p50_g: null,
      provider_version: "ingv-mps04-local-grid-v1",
      queried_at: null,
      sampling_method: "nearest_grid_node",
      source_dataset_version: "MPS04-OPCM3519-1B-ag-005-local-grid",
      status: "not_queried_dry_run",
    },
  };
}

function normalizeSignature(event, exposure) {
  return {
    coordinates: {
      latitude: Number(event.latitude),
      longitude: Number(event.longitude),
    },
    event_id: event.event_id,
    hydraulic: {
      highest_class: exposure.hydraulic?.highest_class || null,
      matched_classes: exposure.hydraulic?.matched_classes || [],
      provider_version: exposure.hydraulic?.source?.provider_version || null,
      queried_at: exposure.hydraulic?.source?.queried_at || null,
      source_dataset_version: exposure.hydraulic?.source?.source_dataset_version || null,
      status: exposure.hydraulic?.status || "not_requested",
    },
    landslide: {
      attention_area: Boolean(exposure.landslide?.attention_area),
      highest_hazard_class: exposure.landslide?.highest_hazard_class || null,
      matched_hazard_classes: exposure.landslide?.matched_hazard_classes || [],
      provider_version: exposure.landslide?.source?.provider_version || null,
      queried_at: exposure.landslide?.source?.queried_at || null,
      source_dataset_version: exposure.landslide?.source?.source_dataset_version || null,
      status: exposure.landslide?.status || "not_requested",
    },
    seismic: {
      national_percentile: null,
      pga_p50_g: exposure.seismic?.pga_p50_g ?? null,
      provider_version: exposure.seismic?.source?.provider_version || null,
      queried_at: exposure.seismic?.source?.queried_at || null,
      sampling_method: exposure.seismic?.sampling_method || null,
      source_dataset_version: exposure.seismic?.source?.source_dataset_version || null,
      status: exposure.seismic?.status || "not_requested",
    },
  };
}

async function sleep(ms) {
  await new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

async function queryWithRetry(event, options) {
  let lastError = null;

  for (let attempt = 0; attempt <= options.retry; attempt += 1) {
    try {
      const exposure = await evaluatePointHazardExposure(
        {
          bypassCache: options.bypassCache,
          hazards: ["hydraulic", "landslide", "seismic"],
          latitude: event.latitude,
          longitude: event.longitude,
        },
        {
          requestId: `collapse-signature:${event.event_id}`,
        }
      );

      return normalizeSignature(event, exposure);
    } catch (error) {
      lastError = error;
      await sleep(options.rateLimitMs * (attempt + 1));
    }
  }

  throw lastError;
}

export async function buildCollapseHazardSignatures(options = {}) {
  const resolved = {
    ...parseArgs([]),
    ...options,
  };
  const outputDir = resolved.outputDir || OUTPUT_DIR;
  const signaturesPath = path.join(outputDir, path.basename(SIGNATURES_PATH));
  const manifestPath = path.join(outputDir, path.basename(MANIFEST_PATH));
  const errorsPath = path.join(outputDir, path.basename(ERRORS_PATH));
  const cachePath = path.join(outputDir, path.basename(CACHE_PATH));
  const events = readJson(path.join(ROOT, "private-data", "processed", "events.json"), []);
  const existing = resolved.resume ? readJson(signaturesPath, { signatures: [] }) : { signatures: [] };
  const cache = resolved.bypassCache ? {} : readJson(cachePath, {});
  const existingById = new Map((existing.signatures || []).map((item) => [item.event_id, item]));
  const filtered = events
    .filter((event) => !resolved.eventId || event.event_id === resolved.eventId)
    .filter(validCoordinate)
    .slice(0, resolved.limit || undefined);
  const signatures = [];
  const errors = [];

  for (const event of filtered) {
    if (resolved.resume && existingById.has(event.event_id)) {
      signatures.push(existingById.get(event.event_id));
      continue;
    }

    const key = cacheKey(event);

    if (!resolved.bypassCache && cache[key]) {
      signatures.push(cache[key]);
      continue;
    }

    try {
      const signature = resolved.dryRun
        ? dryRunSignature(event)
        : await queryWithRetry(event, resolved);

      signatures.push(signature);
      cache[key] = signature;
      await sleep(resolved.dryRun ? 0 : resolved.rateLimitMs);
    } catch (error) {
      errors.push({
        event_id: event.event_id,
        message: error?.message || String(error),
        name: error?.name || "Error",
      });
    }
  }

  const output = {
    caveat: CURRENT_CONTEXT_CAVEAT,
    signatures: signatures.sort((left, right) => left.event_id.localeCompare(right.event_id)),
  };
  const manifest = {
    caveat: CURRENT_CONTEXT_CAVEAT,
    dry_run: resolved.dryRun,
    eligible_events: filtered.length,
    errors: errors.length,
    provider_versions: {
      hydraulic: "ispra-flood-wfs-v2",
      landslide: "ispra-landslide-pai-wfs-v1",
      seismic: "ingv-mps04-local-grid-v1",
    },
    signatures: signatures.length,
  };

  writeJson(signaturesPath, output);
  writeJson(manifestPath, manifest);
  writeJson(errorsPath, { errors });
  writeJson(cachePath, cache);

  return {
    errors,
    manifest,
    signatures: output.signatures,
  };
}

if (process.argv[1] && path.resolve(process.argv[1]) === __filename) {
  const options = parseArgs();
  const result = await buildCollapseHazardSignatures(options);

  console.log(
    JSON.stringify(
      {
        dry_run: result.manifest.dry_run,
        eligible_events: result.manifest.eligible_events,
        errors: result.errors.length,
        signatures: result.signatures.length,
      },
      null,
      2
    )
  );
}
