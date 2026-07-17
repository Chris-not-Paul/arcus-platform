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
const PROVIDER_VERSIONS = {
  hydraulic: "ispra-flood-wfs-v2",
  landslide: "ispra-landslide-pai-wfs-v1",
  seismic: "ingv-mps04-local-grid-v1",
};
const SEMANTIC_COMPLETION_STATUSES = new Set([
  "available",
  "no_intersection",
  "outside_coverage",
]);

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
    concurrency: 1,
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
    } else if (argument.startsWith("--retry=")) {
      options.retry = Number(argument.split("=")[1]);
    } else if (argument.startsWith("--rate-limit-ms=")) {
      options.rateLimitMs = Number(argument.split("=")[1]);
    } else if (argument.startsWith("--concurrency=")) {
      options.concurrency = Number(argument.split("=")[1]);
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
    PROVIDER_VERSIONS.hydraulic,
    PROVIDER_VERSIONS.landslide,
    PROVIDER_VERSIONS.seismic,
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
      provider_version: PROVIDER_VERSIONS.hydraulic,
      queried_at: null,
      source_dataset_version: null,
      status: "not_queried_dry_run",
    },
    landslide: {
      attention_area: false,
      highest_hazard_class: null,
      matched_hazard_classes: [],
      provider_version: PROVIDER_VERSIONS.landslide,
      queried_at: null,
      source_dataset_version: "5.0",
      status: "not_queried_dry_run",
    },
    seismic: {
      national_percentile: null,
      pga_p50_g: null,
      provider_version: PROVIDER_VERSIONS.seismic,
      queried_at: null,
      sampling_method: "nearest_grid_node",
      source_dataset_version: "MPS04-OPCM3519-1B-ag-005-local-grid",
      status: "not_queried_dry_run",
    },
  };
}

function isDryRunSignature(signature) {
  return [
    signature?.hydraulic?.status,
    signature?.landslide?.status,
    signature?.seismic?.status,
  ].some((status) => status === "not_queried_dry_run");
}

function providerCompleted(result) {
  return SEMANTIC_COMPLETION_STATUSES.has(result?.status);
}

function enrichmentCounters({ eligibleEvents, errors, signatures }) {
  const dryRunEvents = signatures.filter(isDryRunSignature).length;
  const hydraulicCompleted = signatures.filter((item) => providerCompleted(item.hydraulic)).length;
  const landslideCompleted = signatures.filter((item) => providerCompleted(item.landslide)).length;
  const seismicCompleted = signatures.filter((item) => providerCompleted(item.seismic)).length;
  const fullyEnriched = signatures.filter((item) =>
    providerCompleted(item.hydraulic) &&
    providerCompleted(item.landslide) &&
    providerCompleted(item.seismic)
  ).length;
  const partiallyEnriched = signatures.filter((item) =>
    !isDryRunSignature(item) &&
    !(
      providerCompleted(item.hydraulic) &&
      providerCompleted(item.landslide) &&
      providerCompleted(item.seismic)
    ) &&
    (
      providerCompleted(item.hydraulic) ||
      providerCompleted(item.landslide) ||
      providerCompleted(item.seismic)
    )
  ).length;

  return {
    dry_run_events: dryRunEvents,
    eligible_events: eligibleEvents,
    failed: errors.length,
    fully_enriched: fullyEnriched,
    hydraulic_completed: hydraulicCompleted,
    landslide_completed: landslideCompleted,
    partially_enriched: partiallyEnriched,
    pending: Math.max(eligibleEvents - fullyEnriched - partiallyEnriched - errors.length, 0),
    seismic_completed: seismicCompleted,
    total_events: eligibleEvents,
  };
}

function canResumeSignature(signature, options) {
  if (!signature) {
    return false;
  }

  if (!options.dryRun && isDryRunSignature(signature)) {
    return false;
  }

  return true;
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

  const concurrency = Math.max(1, Number(resolved.concurrency) || 1);
  let cursor = 0;

  async function processEvent(event) {
    const existingSignature = existingById.get(event.event_id);

    if (resolved.resume && canResumeSignature(existingSignature, resolved)) {
      return {
        signature: existingSignature,
      };
    }

    const key = cacheKey(event);

    if (!resolved.bypassCache && cache[key]) {
      if (canResumeSignature(cache[key], resolved)) {
        return {
          signature: cache[key],
        };
      }
    }

    try {
      const signature = resolved.dryRun
        ? dryRunSignature(event)
        : await queryWithRetry(event, resolved);

      cache[key] = signature;
      await sleep(resolved.dryRun ? 0 : resolved.rateLimitMs);

      return {
        signature,
      };
    } catch (error) {
      return {
        error: {
          event_id: event.event_id,
          message: error?.message || String(error),
          name: error?.name || "Error",
        },
      };
    }
  }

  async function worker() {
    while (cursor < filtered.length) {
      const event = filtered[cursor];

      cursor += 1;
      const result = await processEvent(event);

      if (result.signature) {
        signatures.push(result.signature);
      }

      if (result.error) {
        errors.push(result.error);
      }
    }
  }

  await Promise.all(
    Array.from({ length: Math.min(concurrency, filtered.length) }, () => worker())
  );

  const output = {
    caveat: CURRENT_CONTEXT_CAVEAT,
    signatures: signatures.sort((left, right) => left.event_id.localeCompare(right.event_id)),
  };
  const manifest = {
    caveat: CURRENT_CONTEXT_CAVEAT,
    concurrency,
    dry_run: resolved.dryRun,
    ...enrichmentCounters({
      eligibleEvents: filtered.length,
      errors,
      signatures,
    }),
    errors: errors.length,
    provider_versions: PROVIDER_VERSIONS,
    rate_limit_ms: resolved.rateLimitMs,
    retry: resolved.retry,
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
