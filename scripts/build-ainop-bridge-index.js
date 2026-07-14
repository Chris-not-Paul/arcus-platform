import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { publicReleaseEndYear } from "../server/config.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");

const defaultIndexPath = path.join(
  root,
  "private-data",
  "professional",
  "ainop-bridge-index.json"
);
const defaultEventsPath = path.join(
  root,
  "private-data",
  "processed",
  "events.json"
);
const defaultReleasePath = path.join(
  root,
  "private-data",
  "professional",
  "data-release.json"
);
const defaultSourcesPath = path.join(
  root,
  "private-data",
  "processed",
  "sources.json"
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
      eventsPath: defaultEventsPath,
      dataCutoffDate: "",
      generatedAt: new Date().toISOString(),
      indexPath: defaultIndexPath,
      releaseEndYear: publicReleaseEndYear,
      releasePath: defaultReleasePath,
      scope: "professional",
      sourcesPath: defaultSourcesPath,
      write: true,
    }
  );
}

export function normalizeProvinceKey(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function yearFromDate(value) {
  const match = String(value || "").match(/\d{4}/);

  return match ? Number(match[0]) : null;
}

function round(value, decimals) {
  if (!Number.isFinite(Number(value))) {
    return null;
  }

  const factor = 10 ** decimals;

  return Math.round(Number(value) * factor) / factor;
}

function confidenceForDenominator(denominator) {
  if (denominator >= 300) {
    return {
      confidence: "high",
      reason:
        "AINOP denominator is broad enough for provincial relative benchmarking.",
    };
  }

  if (denominator >= 100) {
    return {
      confidence: "medium",
      reason:
        "AINOP denominator is usable but should be read with coverage caution.",
    };
  }

  if (denominator >= 25) {
    return {
      confidence: "low",
      reason:
        "AINOP denominator is limited; treat the provincial rate as indicative only.",
    };
  }

  if (denominator >= 1) {
    return {
      confidence: "very_low",
      reason:
        "AINOP denominator is very small; the rate is highly sensitive to single events.",
    };
  }

  return {
    confidence: "unavailable",
    reason: "No AINOP bridge denominator available for this province.",
  };
}

function scopedEventsFor(events, { releaseEndYear, scope }) {
  if (scope === "open") {
    return events.filter((event) => {
      const year = yearFromDate(event.date);

      return year && year <= releaseEndYear;
    });
  }

  return events.filter((event) => Boolean(yearFromDate(event.date)));
}

function latestDateFor(events) {
  return events
    .map((event) => String(event.date || ""))
    .filter(Boolean)
    .sort()
    .at(-1) || null;
}

function yearRangeFor(events) {
  const years = events.map((event) => yearFromDate(event.date)).filter(Boolean);

  return {
    includedYearMax: years.length ? Math.max(...years) : null,
    includedYearMin: years.length ? Math.min(...years) : null,
  };
}

function countEventsByProvince(events, { releaseEndYear, scope }) {
  const counts = new Map();
  const scopedEvents = scopedEventsFor(events, {
    releaseEndYear,
    scope,
  });

  scopedEvents.forEach((event) => {
    const key = normalizeProvinceKey(event.province);

    if (!key) {
      return;
    }

    counts.set(key, (counts.get(key) || 0) + 1);
  });

  return {
    counts,
    scopedEvents,
  };
}

function datasetVersionFor({ generatedAt, release, releaseEndYear, scope }) {
  const releaseVersion = release?.version || "current";

  if (scope === "open") {
    return `arcus-public-2000-${releaseEndYear}-ainop-${releaseVersion}`;
  }

  return `arcus-professional-${String(generatedAt).slice(0, 10).replaceAll("-", ".")}`;
}

function rankedAvailableRecords(records) {
  return records
    .filter((item) =>
      Number.isFinite(Number(item.collapse_rate_per_100_ainop_bridges))
    )
    .sort((left, right) => {
      const rateDelta =
        Number(right.collapse_rate_per_100_ainop_bridges) -
        Number(left.collapse_rate_per_100_ainop_bridges);

      if (rateDelta !== 0) {
        return rateDelta;
      }

      return String(left.province).localeCompare(String(right.province));
    });
}

function applyRankings(records) {
  const ranked = rankedAvailableRecords(records);
  const denominator = Math.max(1, ranked.length - 1);

  ranked.forEach((record, index) => {
    record.national_rank_by_rate = index + 1;
    record.percentile_by_rate = round(
      ((ranked.length - index - 1) / denominator) * 100,
      1
    );
  });
}

export function buildAinopBridgeIndex({
  currentIndex,
  events,
  generatedAt,
  release = {},
  releaseEndYear,
  scope = "professional",
  sources = [],
}) {
  const { counts, scopedEvents } = countEventsByProvince(
    events,
    {
      releaseEndYear,
      scope,
    }
  );
  const dataCutoffDate = release?.data_cutoff_date || generatedAt;
  const latestEventDate = latestDateFor(scopedEvents);
  const { includedYearMax, includedYearMin } = yearRangeFor(scopedEvents);
  const datasetVersion = datasetVersionFor({
    generatedAt,
    release,
    releaseEndYear,
    scope,
  });
  const denominatorByProvince = new Map();

  currentIndex.provinces.forEach((province) => {
    denominatorByProvince.set(normalizeProvinceKey(province.province), province);
  });

  counts.forEach((_count, key) => {
    if (!denominatorByProvince.has(key)) {
      const event = scopedEvents.find(
        (item) => normalizeProvinceKey(item.province) === key
      );

      denominatorByProvince.set(key, {
        ainop_bridges_total: 0,
        ainop_rail_bridges: 0,
        ainop_road_bridges: 0,
        province: event?.province || key,
        province_key: key,
      });
    }
  });

  const totalRoad = [...denominatorByProvince.values()].reduce(
    (sum, item) => sum + Number(item.ainop_road_bridges || 0),
    0
  );
  const totalRail = [...denominatorByProvince.values()].reduce(
    (sum, item) => sum + Number(item.ainop_rail_bridges || 0),
    0
  );
  const totalDenominator = totalRoad + totalRail;
  const totalCases = scopedEvents.length;
  const nationalRate = totalDenominator
    ? round((totalCases / totalDenominator) * 100, 3)
    : null;
  const records = [...denominatorByProvince.values()]
    .map((province) => {
      const provinceKey = normalizeProvinceKey(
        province.province_key || province.province
      );
      const numerator = counts.get(provinceKey) || 0;
      const road = Number(province.ainop_road_bridges || 0);
      const rail = Number(province.ainop_rail_bridges || 0);
      const denominator = Number(
        province.ainop_bridges_total || road + rail || 0
      );
      const rate = denominator
        ? round((numerator / denominator) * 100, 3)
        : null;
      const relative =
        rate !== null && nationalRate
          ? round(rate / nationalRate, 2)
          : null;
      const { confidence, reason } =
        confidenceForDenominator(denominator);
      const numeratorEvidenceConfidence = numerator ? "documented" : "none";

      return {
        province: province.province,
        province_key: provinceKey,
        arcus_cases: numerator,
        numerator_count: numerator,
        denominator_count: denominator,
        ainop_bridges_total: denominator,
        ainop_road_bridges: road,
        ainop_rail_bridges: rail,
        collapse_rate_per_100_ainop_bridges: rate,
        provincial_rate_per_100: rate,
        national_rate_per_100: nationalRate,
        national_rate_per_100_ainop_bridges: nationalRate,
        relative_to_national: relative,
        coverage_flag: denominator ? "available" : "no_ainop_denominator",
        collapse_rate_label: "Collapse Rate",
        collapse_rate_unit: "ARCUS cases per 100 AINOP bridges",
        data_cutoff_date: dataCutoffDate,
        dataset_scope: scope,
        release_end_year: releaseEndYear,
        dataset_version: datasetVersion,
        generated_at: generatedAt,
        included_year_max: includedYearMax,
        included_year_min: includedYearMin,
        latest_event_date: latestEventDate,
        confidence,
        denominator_confidence: confidence,
        denominator_confidence_reason: reason,
        confidence_type: "denominator_sample_size",
        numerator_evidence_confidence: numeratorEvidenceConfidence,
        overall_data_confidence: null,
        collapse_rate_confidence: confidence,
        collapse_rate_confidence_reason: reason,
      };
    })
    .sort((left, right) =>
      String(left.province).localeCompare(String(right.province))
    );

  applyRankings(records);

  const numeratorSum = records.reduce(
    (sum, item) => sum + Number(item.numerator_count || 0),
    0
  );

  if (numeratorSum !== totalCases) {
    throw new Error(
      `AINOP index numerator mismatch: records sum ${numeratorSum}, scoped events ${totalCases}.`
    );
  }

  return {
    metadata: {
      ...currentIndex.metadata,
      data_cutoff_date: dataCutoffDate,
      dataset_scope: scope,
      generated_at: generatedAt,
      dataset_version: datasetVersion,
      included_year_max: includedYearMax,
      included_year_min: includedYearMin,
      latest_event_date: latestEventDate,
      release_end_year: releaseEndYear,
      source_release: release?.id || null,
      total_events: totalCases,
      total_sources: Array.isArray(sources) ? sources.length : null,
      total_ainop_road_bridges: totalRoad,
      total_ainop_rail_bridges: totalRail,
      total_ainop_bridges: totalDenominator,
      total_arcus_cases: totalCases,
      numerator_source: scope === "open"
        ? "private-data/processed/events.json filtered by publicReleaseEndYear"
        : "private-data/processed/events.json full curated Professional scope",
      denominator_source:
        "Existing ARCUS Professional AINOP denominator fields in ainop-bridge-index.json",
      national_rate_per_100_ainop_bridges: nationalRate,
      formula:
        "provincial_rate = ARCUS cases in province / AINOP bridges counted in province * 100; relative_to_national = provincial_rate / national_rate",
      consistency_checks: {
        numerator_sum_matches_scope: true,
        numerator_sum: numeratorSum,
        scoped_event_count: totalCases,
      },
    },
    provinces: records,
  };
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8").replace(/^\uFEFF/, ""));
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const currentIndex = readJson(args.indexPath);
  const events = readJson(args.eventsPath);
  const sources = fs.existsSync(args.sourcesPath)
    ? readJson(args.sourcesPath)
    : [];
  const release = fs.existsSync(args.releasePath)
    ? readJson(args.releasePath)
    : {};
  const scope = String(args.scope || "professional").toLowerCase();

  if (!["open", "professional"].includes(scope)) {
    throw new Error("--scope must be either professional or open");
  }

  const nextIndex = buildAinopBridgeIndex({
    currentIndex,
    events,
    generatedAt: args.generatedAt,
    release,
    ...(args.dataCutoffDate
      ? {
          release: {
            ...release,
            data_cutoff_date: args.dataCutoffDate,
          },
        }
      : {}),
    releaseEndYear: Number(args.releaseEndYear),
    scope,
    sources,
  });

  if (args.write !== false && args.write !== "false") {
    fs.writeFileSync(
      args.indexPath,
      `${JSON.stringify(nextIndex, null, 2)}\n`,
      "utf8"
    );
  }

  const torino = nextIndex.provinces.find(
    (item) => normalizeProvinceKey(item.province) === "torino"
  );

  console.log(
    JSON.stringify(
      {
        generated_at: nextIndex.metadata.generated_at,
        data_cutoff_date: nextIndex.metadata.data_cutoff_date,
        dataset_scope: nextIndex.metadata.dataset_scope,
        dataset_version: nextIndex.metadata.dataset_version,
        included_year_max: nextIndex.metadata.included_year_max,
        latest_event_date: nextIndex.metadata.latest_event_date,
        national_rate_per_100:
          nextIndex.metadata.national_rate_per_100_ainop_bridges,
        release_end_year: nextIndex.metadata.release_end_year,
        torino,
        total_arcus_cases: nextIndex.metadata.total_arcus_cases,
      },
      null,
      2
    )
  );
}

if (
  process.argv[1] &&
  fileURLToPath(import.meta.url) === path.resolve(process.argv[1])
) {
  main();
}
