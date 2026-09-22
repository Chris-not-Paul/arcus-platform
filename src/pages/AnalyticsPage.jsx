import {
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import {
  Link,
  useSearchParams,
} from "react-router-dom";

import Footer from "../components/layout/Footer";
import Navbar from "../components/layout/Navbar";
import PageMeta from "../components/layout/PageMeta";

import useLanguage from "../context/useLanguage";

import extractYear from "../utils/extractYear";
import createStoredZip from "../utils/createStoredZip";
import { classifyOpenSource } from "../utils/openEventDossier";
import {
  openEpisodes,
  openEvents,
  openManifest,
  openSources,
} from "../utils/apiClient";

import "../styles/analytics/analytics-page.css";

function percentage(value, total) {
  if (!total) {
    return 0;
  }

  return Math.round((value / total) * 100);
}

function formatValue(value) {
  return new Intl.NumberFormat("en-US").format(
    value
  );
}

function formatEpisodeDate(value, language) {
  const parts = String(value || "").match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!parts) return value || "—";
  return new Intl.DateTimeFormat(language === "it" ? "it-IT" : "en-GB", {
    day: "numeric",
    month: "short",
    timeZone: "UTC",
    year: "numeric",
  }).format(new Date(Date.UTC(Number(parts[1]), Number(parts[2]) - 1, Number(parts[3]))));
}

function uniqueValues(items, key) {
  return [...new Set(items.map((item) => item[key]).filter(Boolean))]
    .sort((a, b) => String(a).localeCompare(String(b), "it"));
}

function hasAnalyticalValue(value) {
  if (value === null || value === undefined || value === "") return false;

  const normalized = String(value).trim().toLowerCase();
  return !["unspecified", "unknown", "not documented", "n/a", "-"].includes(normalized);
}

function downloadClientFile(content, filename, type) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");

  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

function chartFilenamePart(value) {
  return String(value || "chart")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function csvCell(value) {
  return `"${String(value ?? "").replace(/"/g, '""')}"`;
}

function csvRows(rows) {
  return `${rows.map((row) => row.map(csvCell).join(",")).join("\n")}\n`;
}

function objectsCsv(items) {
  if (!items.length) return "";
  const columns = [...new Set(items.flatMap((item) => Object.keys(item)))];
  return csvRows([
    columns,
    ...items.map((item) => columns.map((column) => {
      const value = item[column];
      return value && typeof value === "object" ? JSON.stringify(value) : value;
    })),
  ]);
}

async function sha256(content) {
  const bytes = content instanceof Uint8Array ? content : new TextEncoder().encode(String(content));
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

function dateParts(dateValue) {
  const match = String(dateValue || "").match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return { day: null, month: null, year: extractYear(dateValue) };
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const parsed = new Date(Date.UTC(year, month - 1, day));
  const valid = parsed.getUTCFullYear() === year && parsed.getUTCMonth() === month - 1 && parsed.getUTCDate() === day;
  if (!valid) return { day: null, month: null, year };
  return { day, month, year };
}

function derivedDimension(event, dimension, language) {
  const { month, year } = dateParts(event.date);
  const months = language === "it"
    ? ["Gennaio", "Febbraio", "Marzo", "Aprile", "Maggio", "Giugno", "Luglio", "Agosto", "Settembre", "Ottobre", "Novembre", "Dicembre"]
    : ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

  if (dimension === "year") return { key: year ? String(year) : null, label: year ? String(year) : null, order: year };
  if (dimension === "month") return month ? { key: String(month).padStart(2, "0"), label: months[month - 1], order: month } : null;
  if (dimension === "season") {
    if (!month) return null;
    if ([12, 1, 2].includes(month)) return { key: "winter", label: language === "it" ? "Inverno" : "Winter", order: 1 };
    if ([3, 4, 5].includes(month)) return { key: "spring", label: language === "it" ? "Primavera" : "Spring", order: 2 };
    if ([6, 7, 8].includes(month)) return { key: "summer", label: language === "it" ? "Estate" : "Summer", order: 3 };
    return { key: "autumn", label: language === "it" ? "Autunno" : "Autumn", order: 4 };
  }
  if (dimension === "five_year_period" && year) {
    const start = Math.floor(year / 5) * 5;
    return { key: String(start), label: `${start}–${start + 4}`, order: start };
  }
  if (dimension === "decade" && year) {
    const start = Math.floor(year / 10) * 10;
    return { key: String(start), label: `${start}–${start + 9}`, order: start };
  }
  if (dimension === "bridge_age") {
    const constructionYear = Number(event.construction_year_numeric);
    if (!year || !Number.isFinite(constructionYear) || constructionYear > year) return null;
    const age = year - constructionYear;
    if (age < 25) return { key: "0-24", label: "0–24", order: 1 };
    if (age < 50) return { key: "25-49", label: "25–49", order: 2 };
    if (age < 75) return { key: "50-74", label: "50–74", order: 3 };
    if (age < 100) return { key: "75-99", label: "75–99", order: 4 };
    return { key: "100-plus", label: "≥100", order: 5 };
  }
  if (dimension === "failure_trigger" && event.failure_trigger) {
    const labelsIt = {
      Earthquake: "Sisma",
      Flood: "Alluvione / piena",
      "Landslide / slope failure": "Frana / instabilità di versante",
      "Rainfall-induced landslide": "Frana indotta da precipitazioni",
    };
    return {
      key: String(event.failure_trigger),
      label: language === "it" ? labelsIt[event.failure_trigger] || String(event.failure_trigger) : String(event.failure_trigger),
      order: null,
    };
  }
  return null;
}

function dimensionValue(event, dimension, missingLabel, language) {
  const derived = derivedDimension(event, dimension, language);
  const rawValue = derived?.label ?? event[dimension];
  const missing = !hasAnalyticalValue(rawValue);

  return {
    key: missing ? "__missing__" : derived?.key || String(rawValue),
    label: missing ? missingLabel : derived?.label || String(rawValue),
    missing,
    order: missing ? null : derived?.order ?? null,
  };
}

function buildDimensionRows(items, dimension, missingLabel, language) {
  const counts = new Map();

  items.forEach((event) => {
    const value = dimensionValue(event, dimension, missingLabel, language);
    const current = counts.get(value.key) || { ...value, value: 0 };
    current.value += 1;
    counts.set(value.key, current);
  });

  return [...counts.values()].sort((a, b) => {
    if (a.missing !== b.missing) return a.missing ? 1 : -1;
    if (Number.isFinite(a.order) && Number.isFinite(b.order)) return a.order - b.order;
    return b.value - a.value || a.label.localeCompare(b.label, language === "it" ? "it" : "en");
  });
}

function roundMetric(value, digits = 3) {
  if (!Number.isFinite(value)) return null;
  return Number(value.toFixed(digits));
}

function distributionDiagnostics(rows) {
  const counts = rows.filter((row) => !row.missing && row.value > 0).map((row) => row.value);
  const total = counts.reduce((sum, value) => sum + value, 0);
  const categoryCount = counts.length;

  if (!total) return { categoryCount, effectiveCategories: null, normalizedEntropy: null, topShare: null };
  const probabilities = counts.map((value) => value / total);
  const entropy = -probabilities.reduce((sum, value) => sum + value * Math.log(value), 0);

  return {
    categoryCount,
    effectiveCategories: roundMetric(Math.exp(entropy), 2),
    normalizedEntropy: roundMetric(categoryCount > 1 ? entropy / Math.log(categoryCount) : 0),
    topShare: roundMetric(Math.max(...probabilities)),
  };
}

function comparisonDistributionDiagnostics(rows, totalA, totalB) {
  if (!totalA || !totalB || !rows.length) return { jensenShannon: null, totalVariation: null };

  let jensenShannon = 0;
  let totalVariation = 0;
  rows.forEach((row) => {
    const a = row.a / totalA;
    const b = row.b / totalB;
    const midpoint = (a + b) / 2;
    if (a > 0) jensenShannon += 0.5 * a * Math.log2(a / midpoint);
    if (b > 0) jensenShannon += 0.5 * b * Math.log2(b / midpoint);
    totalVariation += Math.abs(a - b);
  });

  return {
    jensenShannon: roundMetric(jensenShannon),
    totalVariation: roundMetric(totalVariation / 2),
  };
}

function crossTabDiagnostics(crossTab) {
  const rows = crossTab.rows.filter((row) => !row.missing);
  const columns = crossTab.columns.filter((column) => !column.missing);
  const initialMatrix = rows.map((row) => columns.map((column) => row.columns.get(column.key) || 0));
  const initialRowTotals = initialMatrix.map((row) => row.reduce((sum, value) => sum + value, 0));
  const initialColumnTotals = columns.map((_, columnIndex) => initialMatrix.reduce((sum, row) => sum + row[columnIndex], 0));
  const activeRows = initialRowTotals.map((value, index) => value > 0 ? index : null).filter((index) => index !== null);
  const activeColumns = initialColumnTotals.map((value, index) => value > 0 ? index : null).filter((index) => index !== null);
  const matrix = activeRows.map((rowIndex) => activeColumns.map((columnIndex) => initialMatrix[rowIndex][columnIndex]));
  const rowTotals = matrix.map((row) => row.reduce((sum, value) => sum + value, 0));
  const columnTotals = activeColumns.map((_, columnIndex) => matrix.reduce((sum, row) => sum + row[columnIndex], 0));
  const total = rowTotals.reduce((sum, value) => sum + value, 0);

  if (!total || matrix.length < 2 || activeColumns.length < 2) {
    return { cramersV: null, effectiveRecords: total, expectedBelowFive: null, expectedCellCount: matrix.length * activeColumns.length };
  }

  let chiSquared = 0;
  let expectedBelowFive = 0;
  matrix.forEach((row, rowIndex) => row.forEach((observed, columnIndex) => {
    const expected = (rowTotals[rowIndex] * columnTotals[columnIndex]) / total;
    if (expected < 5) expectedBelowFive += 1;
    if (expected > 0) chiSquared += ((observed - expected) ** 2) / expected;
  }));
  const denominator = total * Math.min(matrix.length - 1, activeColumns.length - 1);

  return {
    chiSquared: roundMetric(chiSquared),
    cramersV: denominator > 0 ? roundMetric(Math.sqrt(chiSquared / denominator)) : null,
    effectiveRecords: total,
    expectedBelowFive,
    expectedCellCount: matrix.length * activeColumns.length,
  };
}

function sourceDepthDiagnostics(cohortEvents, cohortSources) {
  const emptyResult = {
    eventCoverage: { noSources: 0, official: 0, scientific: 0 },
    median: null,
    roleCounts: { news: 0, official: 0, other: 0, scientific: 0 },
    singleSourceShare: null,
    sourceTypes: 0,
    threePlusShare: null,
  };
  if (!cohortEvents.length) return emptyResult;
  const counts = new Map(cohortEvents.map((event) => [event.event_id, 0]));
  const eventsByRole = {
    news: new Set(),
    official: new Set(),
    other: new Set(),
    scientific: new Set(),
  };
  const roleCounts = { ...emptyResult.roleCounts };
  cohortSources.forEach((source) => {
    if (counts.has(source.event_id)) counts.set(source.event_id, counts.get(source.event_id) + 1);
    const role = classifyOpenSource(source);
    roleCounts[role] += 1;
    if (counts.has(source.event_id)) eventsByRole[role].add(source.event_id);
  });
  const sortedCounts = [...counts.values()].sort((a, b) => a - b);
  const middle = Math.floor(sortedCounts.length / 2);
  const median = sortedCounts.length % 2
    ? sortedCounts[middle]
    : (sortedCounts[middle - 1] + sortedCounts[middle]) / 2;

  return {
    eventCoverage: {
      noSources: sortedCounts.filter((value) => value === 0).length,
      official: eventsByRole.official.size,
      scientific: eventsByRole.scientific.size,
    },
    median: roundMetric(median, 1),
    roleCounts,
    singleSourceShare: roundMetric(sortedCounts.filter((value) => value === 1).length / sortedCounts.length),
    sourceTypes: new Set(cohortSources.map((source) => source.source_type).filter(Boolean)).size,
    threePlusShare: roundMetric(sortedCounts.filter((value) => value >= 3).length / sortedCounts.length),
  };
}

function AnalyticsResearchChart({
  language,
  onSelectRow,
  rows,
  selectedKey,
  svgRef,
  title,
  total,
}) {
  if (!rows.length) {
    return (
      <p className="analytics-chart-empty">
        {language === "it"
          ? "Nessun dato rappresentabile per la coorte corrente. Una selezione vuota non equivale a rischio nullo."
          : "No data can be charted for the current cohort. An empty selection does not mean zero risk."}
      </p>
    );
  }

  const width = 960;
  const rowHeight = 46;
  const labelWidth = 270;
  const chartWidth = 540;
  const height = Math.max(156, rows.length * rowHeight + 70);
  const maxValue = Math.max(...rows.map((row) => row.value), 1);

  return (
    <div className="analytics-chart-scroll">
      <svg
        aria-label={`${title}. n=${total}`}
        className="analytics-research-chart"
        data-analytics-chart-svg
        preserveAspectRatio="xMinYMin meet"
        ref={svgRef}
        role="img"
        viewBox={`0 0 ${width} ${height}`}
        xmlns="http://www.w3.org/2000/svg"
      >
        <title>{`${title}. n=${total}`}</title>
        <rect fill="#ffffff" height={height} width={width} />
        <text fill="#173b3c" fontFamily="Arial, sans-serif" fontSize="20" fontWeight="700" x="18" y="30">
          {title}
        </text>
        <text fill="#5f6f70" fontFamily="Arial, sans-serif" fontSize="12" x="18" y="51">
          {language === "it" ? `Record documentati · n=${total}` : `Documented records · n=${total}`}
        </text>

        {rows.map((row, index) => {
          const y = 73 + index * rowHeight;
          const barWidth = (row.value / maxValue) * chartWidth;
          const label = row.label.length > 36 ? `${row.label.slice(0, 33)}…` : row.label;

          return (
            <g
              className={selectedKey === row.key ? "is-selected" : ""}
              data-chart-value={row.value}
              key={row.key}
              onClick={() => onSelectRow?.(row)}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") onSelectRow?.(row);
              }}
              role="button"
              tabIndex="0"
            >
              <title>{`${row.label}: ${row.value} (${percentage(row.value, total)}%)`}</title>
              <text fill="#263b3c" fontFamily="Arial, sans-serif" fontSize="13" x="18" y={y + 17}>
                {label}
              </text>
              <rect fill="#e5ecea" height="18" rx="2" width={chartWidth} x={labelWidth} y={y + 2} />
              <rect fill="#c49040" height="18" rx="2" width={Math.max(2, barWidth)} x={labelWidth} y={y + 2} />
              <text fill="#263b3c" fontFamily="Arial, sans-serif" fontSize="12" fontWeight="700" x={labelWidth + chartWidth + 18} y={y + 16}>
                {formatValue(row.value)}
              </text>
              <text fill="#637576" fontFamily="Arial, sans-serif" fontSize="11" x={labelWidth + chartWidth + 70} y={y + 16}>
                {percentage(row.value, total)}%
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

function AnalyticsComparisonChart({ language, onSelectRow, rows, selectedSlice, svgRef, title }) {
  if (!rows.length) {
    return (
      <p className="analytics-chart-empty">
        {language === "it" ? "Nessun dato confrontabile nelle coorti correnti." : "No comparable data in the current cohorts."}
      </p>
    );
  }

  const width = 960;
  const rowHeight = 64;
  const labelWidth = 250;
  const chartWidth = 520;
  const height = Math.max(190, rows.length * rowHeight + 92);
  const maxShare = Math.max(...rows.flatMap((row) => [row.aShare, row.bShare]), 1);

  return (
    <div className="analytics-chart-scroll">
      <svg
        aria-label={title}
        className="analytics-research-chart analytics-comparison-chart"
        data-analytics-chart-svg
        preserveAspectRatio="xMinYMin meet"
        ref={svgRef}
        role="img"
        viewBox={`0 0 ${width} ${height}`}
        xmlns="http://www.w3.org/2000/svg"
      >
        <title>{title}</title>
        <rect fill="#ffffff" height={height} width={width} />
        <text fill="#173b3c" fontFamily="Arial, sans-serif" fontSize="20" fontWeight="700" x="18" y="30">{title}</text>
        <rect fill="#c49040" height="8" rx="2" width="24" x="18" y="49" />
        <text fill="#5f6f70" fontFamily="Arial, sans-serif" fontSize="11" x="50" y="57">{language === "it" ? "Coorte A" : "Cohort A"}</text>
        <rect fill="#76918b" height="8" rx="2" width="24" x="122" y="49" />
        <text fill="#5f6f70" fontFamily="Arial, sans-serif" fontSize="11" x="154" y="57">{language === "it" ? "Coorte B" : "Cohort B"}</text>

        {rows.map((row, index) => {
          const y = 78 + index * rowHeight;
          const label = row.label.length > 32 ? `${row.label.slice(0, 29)}…` : row.label;
          return (
            <g key={row.key}>
              <text fill="#263b3c" fontFamily="Arial, sans-serif" fontSize="13" x="18" y={y + 25}>{label}</text>
              {[
                { cohort: "A", color: "#c49040", count: row.a, share: row.aShare, y: y + 3 },
                { cohort: "B", color: "#76918b", count: row.b, share: row.bShare, y: y + 28 },
              ].map((bar) => (
                <g
                  className={selectedSlice?.cohort === bar.cohort && selectedSlice?.rowKey === row.key ? "is-selected" : ""}
                  data-cohort={bar.cohort}
                  data-chart-value={bar.count}
                  key={bar.cohort}
                  onClick={() => onSelectRow?.(row, bar.cohort)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") onSelectRow?.(row, bar.cohort);
                  }}
                  role="button"
                  tabIndex="0"
                >
                  <title>{`${bar.cohort}: ${row.label}, ${bar.count} (${bar.share}%)`}</title>
                  <rect fill="#e5ecea" height="17" rx="2" width={chartWidth} x={labelWidth} y={bar.y} />
                  <rect fill={bar.color} height="17" rx="2" width={Math.max(bar.count ? 2 : 0, (bar.share / maxShare) * chartWidth)} x={labelWidth} y={bar.y} />
                  <text fill="#263b3c" fontFamily="Arial, sans-serif" fontSize="11" fontWeight="700" x={labelWidth + chartWidth + 16} y={bar.y + 13}>{formatValue(bar.count)}</text>
                  <text fill="#637576" fontFamily="Arial, sans-serif" fontSize="10" x={labelWidth + chartWidth + 64} y={bar.y + 13}>{bar.share}%</text>
                </g>
              ))}
            </g>
          );
        })}
      </svg>
    </div>
  );
}

const DEFAULT_FILTERS = Object.freeze({
  cause: "All",
  evidence: "All",
  period: "release",
  region: "All",
  severity: "All",
});

const CHART_DIMENSION_KEYS = Object.freeze([
  "year",
  "month",
  "season",
  "five_year_period",
  "decade",
  "specific_cause",
  "failure_trigger",
  "region",
  "collapse_severity",
  "structural_type",
  "material_type",
  "destination_use",
  "failure_cause_evidence",
  "failure_process",
  "component_involved",
  "bridge_age",
]);

const RESEARCH_PRESETS = Object.freeze([
  {
    id: "hydraulic-common-trend",
    title: { it: "Idraulica · periodo comune", en: "Hydraulic · common period" },
    description: { it: "Evoluzione annuale dei collassi idraulici documentati nel 2000–2022.", en: "Annual distribution of documented hydraulic collapses in 2000–2022." },
    analysisMode: "distribution",
    chartDimension: "year",
    chartView: "bars",
    filters: { ...DEFAULT_FILTERS, cause: "Hydraulic", period: "common" },
  },
  {
    id: "hydraulic-seasonality",
    title: { it: "Stagionalità idraulica", en: "Hydraulic seasonality" },
    description: { it: "Collassi idraulici per stagione meteorologica, con date non complete separate.", en: "Hydraulic collapses by meteorological season, with incomplete dates kept separate." },
    analysisMode: "distribution",
    chartDimension: "season",
    chartView: "bars",
    filters: { ...DEFAULT_FILTERS, cause: "Hydraulic" },
  },
  {
    id: "hydraulic-shared-episodes",
    title: { it: "Episodi alluvionali", en: "Flood episodes" },
    description: { it: "Raggruppa i crolli idraulici e attiva il controllo degli episodi multi-crollo documentati.", en: "Groups hydraulic collapses and activates the documented multi-collapse episode control." },
    analysisMode: "distribution",
    chartDimension: "failure_trigger",
    chartView: "bars",
    filters: { ...DEFAULT_FILTERS, cause: "Hydraulic" },
  },
  {
    id: "season-cause",
    title: { it: "Stagione × causa", en: "Season × cause" },
    description: { it: "Incrocio tra stagioni meteorologiche e cause specifiche documentate.", en: "Cross-tabulation of meteorological seasons and documented specific causes." },
    analysisMode: "crosstab",
    chartDimension: "season",
    columnDimension: "specific_cause",
    filters: DEFAULT_FILTERS,
  },
  {
    id: "cause-severity",
    title: { it: "Causa × severità", en: "Cause × severity" },
    description: { it: "Incrocio descrittivo fra causa specifica e classe dell’esito.", en: "Descriptive cross-tabulation of specific cause and outcome class." },
    analysisMode: "crosstab",
    chartDimension: "specific_cause",
    columnDimension: "collapse_severity",
    filters: DEFAULT_FILTERS,
  },
  {
    id: "evidence-audit",
    title: { it: "Audit dell’evidenza", en: "Evidence audit" },
    description: { it: "Copertura delle classi di evidenza assegnate alle cause di cedimento.", en: "Coverage of evidence classes assigned to failure causes." },
    analysisMode: "distribution",
    chartDimension: "failure_cause_evidence",
    chartView: "bars",
    filters: DEFAULT_FILTERS,
  },
  {
    id: "hydraulic-landslide-process",
    title: { it: "Idraulica ↔ frana", en: "Hydraulic ↔ landslide" },
    description: { it: "Confronto descrittivo, a coorti disgiunte, dei processi di cedimento.", en: "Descriptive comparison of failure processes in disjoint cohorts." },
    analysisMode: "comparison",
    chartDimension: "failure_process",
    chartView: "bars",
    filters: { ...DEFAULT_FILTERS, cause: "Hydraulic" },
    comparisonFilters: { ...DEFAULT_FILTERS, cause: "Landslide" },
  },
]);

function initialFilters(searchParams) {
  const period = ["release", "common", "custom"].includes(searchParams.get("period"))
    ? searchParams.get("period")
    : DEFAULT_FILTERS.period;

  return {
    cause: searchParams.get("cause") || DEFAULT_FILTERS.cause,
    evidence: searchParams.get("evidence") || DEFAULT_FILTERS.evidence,
    period,
    region: searchParams.get("region") || DEFAULT_FILTERS.region,
    severity: searchParams.get("severity") || DEFAULT_FILTERS.severity,
    yearFrom: searchParams.get("from") || "2000",
    yearTo: searchParams.get("to") || "2022",
  };
}

function initialComparisonFilters(searchParams) {
  const period = ["release", "common", "custom"].includes(searchParams.get("bperiod"))
    ? searchParams.get("bperiod")
    : DEFAULT_FILTERS.period;

  return {
    cause: searchParams.get("bcause") || DEFAULT_FILTERS.cause,
    evidence: searchParams.get("bevidence") || DEFAULT_FILTERS.evidence,
    period,
    region: searchParams.get("bregion") || DEFAULT_FILTERS.region,
    severity: searchParams.get("bseverity") || DEFAULT_FILTERS.severity,
    yearFrom: searchParams.get("bfrom") || "2000",
    yearTo: searchParams.get("bto") || "2022",
  };
}

function eventMatchesCohort(event, filters, startYear, endYear, validPeriod) {
  const year = extractYear(event.date);
  if (!validPeriod || !year || year < startYear || year > endYear) return false;
  if (filters.cause !== "All" && event.specific_cause !== filters.cause) return false;
  if (filters.region !== "All" && event.region !== filters.region) return false;
  if (filters.severity !== "All" && event.collapse_severity !== filters.severity) return false;
  if (filters.evidence !== "All" && (event.failure_cause_evidence || "Unspecified") !== filters.evidence) return false;
  return true;
}

function AnalyticsCoverageList({ fields, language }) {
  return (
    <div className="analytics-coverage-list">
      {fields.map((field) => (
        <div className="analytics-coverage-row" key={field.label}>
          <div>
            <strong>{field.label}</strong>
            <span>
              {formatValue(field.available)} {language === "it" ? "disponibili" : "available"}
              {" · "}
              {formatValue(field.missing)} {language === "it" ? "mancanti" : "missing"}
            </span>
          </div>
          <b>{percentage(field.available, field.total)}%</b>
        </div>
      ))}
    </div>
  );
}

function AnalyticsPage() {
  const { language } = useLanguage();

  const copy = language === "it"
    ? {
        atlas: "Atlante",
        briefingTitle: "Console di ricerca sui collassi documentati.",
        publicSubtitle: "Definisci una coorte, interroga le variabili e scarica risultati riproducibili dalla release Open di ARCUS.",
        heroNote: "Analisi descrittive dei record osservati, con denominatori e dati mancanti espliciti. Nessuna frequenza viene presentata come probabilità di collasso.",
        heroPreviewTitle: "Release di ricerca",
        lockedTag: "ARCUS OPEN RESEARCH",
        methodCta: "Protocollo metodologico",
      }
    : {
        atlas: "Atlas",
        briefingTitle: "Research console for documented bridge collapses.",
        publicSubtitle: "Define a cohort, query its variables and download reproducible results from the ARCUS Open release.",
        heroNote: "Descriptive analysis of observed records, with explicit denominators and missing data. No frequency is presented as collapse probability.",
        heroPreviewTitle: "Research release",
        lockedTag: "ARCUS OPEN RESEARCH",
        methodCta: "Method protocol",
      };

  const [searchParams, setSearchParams] = useSearchParams();
  const [events, setEvents] = useState([]);
  const [episodes, setEpisodes] = useState(null);
  const [sources, setSources] = useState([]);
  const [manifest, setManifest] = useState(null);
  const [loadState, setLoadState] = useState("loading");
  const [loadAttempt, setLoadAttempt] = useState(0);
  const [workspaceStep, setWorkspaceStep] = useState(() => {
    const requestedStep = Number(searchParams.get("step"));
    return [1, 2, 3].includes(requestedStep) ? requestedStep : 1;
  });
  const [analysisPath, setAnalysisPath] = useState(() => (
    searchParams.get("path") === "custom" ? "custom" : "guided"
  ));
  const [filters, setFilters] = useState(() => initialFilters(searchParams));
  const [chartDimension, setChartDimension] = useState(() => {
    const requestedDimension = searchParams.get("group");
    return CHART_DIMENSION_KEYS.includes(requestedDimension) ? requestedDimension : "specific_cause";
  });
  const [chartView, setChartView] = useState(() => searchParams.get("view") === "table" ? "table" : "bars");
  const [analysisMode, setAnalysisMode] = useState(() => {
    const requestedMode = searchParams.get("analysis");
    return ["crosstab", "comparison"].includes(requestedMode) ? requestedMode : "distribution";
  });
  const [comparisonFilters, setComparisonFilters] = useState(() => initialComparisonFilters(searchParams));
  const [selectedSlice, setSelectedSlice] = useState(null);
  const [activePreset, setActivePreset] = useState(null);
  const [packageState, setPackageState] = useState("idle");
  const [captionState, setCaptionState] = useState("idle");
  const [workspaceNavigationVisible, setWorkspaceNavigationVisible] = useState(false);
  const [columnDimension, setColumnDimension] = useState(() => {
    const requestedDimension = searchParams.get("column");
    const requestedRow = searchParams.get("group") || "specific_cause";
    return CHART_DIMENSION_KEYS.includes(requestedDimension) && requestedDimension !== requestedRow
      ? requestedDimension
      : "collapse_severity";
  });
  const chartSvgRef = useRef(null);
  const workspaceSectionRef = useRef(null);

  useEffect(() => {
    let cancelled = false;

    Promise.all([openEvents(), openSources(), openManifest(), openEpisodes().catch(() => null)])
      .then(([nextEvents, nextSources, nextManifest, nextEpisodes]) => {
        if (cancelled) return;
        setEvents(nextEvents);
        setSources(nextSources);
        setManifest(nextManifest);
        setEpisodes(nextEpisodes);
        setLoadState("available");
      })
      .catch(() => {
        if (cancelled) return;
        setEvents([]);
        setSources([]);
        setManifest(null);
        setEpisodes(null);
        setLoadState("error");
      });

    return () => {
      cancelled = true;
    };
  }, [loadAttempt]);

  useEffect(() => {
    const section = workspaceSectionRef.current;
    if (!section || typeof IntersectionObserver === "undefined") return undefined;

    const observer = new IntersectionObserver(([entry]) => {
      setWorkspaceNavigationVisible(entry.isIntersecting);
    }, { rootMargin: "-64px 0px -48px", threshold: 0 });

    observer.observe(section);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const nextParams = new URLSearchParams();

    if (filters.period !== DEFAULT_FILTERS.period) nextParams.set("period", filters.period);
    if (filters.period === "custom") {
      nextParams.set("from", filters.yearFrom);
      nextParams.set("to", filters.yearTo);
    }
    if (filters.cause !== DEFAULT_FILTERS.cause) nextParams.set("cause", filters.cause);
    if (filters.region !== DEFAULT_FILTERS.region) nextParams.set("region", filters.region);
    if (filters.severity !== DEFAULT_FILTERS.severity) nextParams.set("severity", filters.severity);
    if (filters.evidence !== DEFAULT_FILTERS.evidence) nextParams.set("evidence", filters.evidence);
    if (chartDimension !== "specific_cause") nextParams.set("group", chartDimension);
    if (chartView !== "bars") nextParams.set("view", chartView);
    if (analysisMode !== "distribution") nextParams.set("analysis", analysisMode);
    if (analysisMode === "crosstab" && columnDimension !== "collapse_severity") nextParams.set("column", columnDimension);
    if (analysisMode === "comparison") {
      if (comparisonFilters.period !== DEFAULT_FILTERS.period) nextParams.set("bperiod", comparisonFilters.period);
      if (comparisonFilters.period === "custom") {
        nextParams.set("bfrom", comparisonFilters.yearFrom);
        nextParams.set("bto", comparisonFilters.yearTo);
      }
      if (comparisonFilters.cause !== DEFAULT_FILTERS.cause) nextParams.set("bcause", comparisonFilters.cause);
      if (comparisonFilters.region !== DEFAULT_FILTERS.region) nextParams.set("bregion", comparisonFilters.region);
      if (comparisonFilters.severity !== DEFAULT_FILTERS.severity) nextParams.set("bseverity", comparisonFilters.severity);
      if (comparisonFilters.evidence !== DEFAULT_FILTERS.evidence) nextParams.set("bevidence", comparisonFilters.evidence);
    }
    if (workspaceStep !== 1) nextParams.set("step", String(workspaceStep));
    if (analysisPath === "custom") nextParams.set("path", "custom");

    setSearchParams(nextParams, { replace: true });
  }, [analysisMode, analysisPath, chartDimension, chartView, columnDimension, comparisonFilters, filters, setSearchParams, workspaceStep]);

  const releaseYears = useMemo(
    () => events.map((event) => extractYear(event.date)).filter(Boolean),
    [events]
  );
  const releaseStart = releaseYears.length ? Math.min(...releaseYears) : 2000;
  const releaseEnd = releaseYears.length ? Math.max(...releaseYears) : 2026;
  const requestedFrom = Number(filters.yearFrom);
  const requestedTo = Number(filters.yearTo);
  const analysisStart = filters.period === "common"
    ? Math.max(releaseStart, 2000)
    : filters.period === "custom" && Number.isFinite(requestedFrom)
      ? Math.max(releaseStart, Math.min(requestedFrom, releaseEnd))
      : releaseStart;
  const analysisEnd = filters.period === "common"
    ? Math.min(releaseEnd, 2022)
    : filters.period === "custom" && Number.isFinite(requestedTo)
      ? Math.max(releaseStart, Math.min(requestedTo, releaseEnd))
      : releaseEnd;
  const validPeriod = analysisStart <= analysisEnd;

  const filterOptions = useMemo(() => ({
    causes: uniqueValues(events, "specific_cause"),
    evidence: uniqueValues(events, "failure_cause_evidence"),
    regions: uniqueValues(events, "region"),
    severities: uniqueValues(events, "collapse_severity"),
  }), [events]);

  const filteredEvents = useMemo(
    () => events.filter((event) => eventMatchesCohort(event, filters, analysisStart, analysisEnd, validPeriod)),
    [analysisEnd, analysisStart, events, filters, validPeriod]
  );

  const filteredEventIds = useMemo(
    () => new Set(filteredEvents.map((event) => event.event_id)),
    [filteredEvents]
  );
  const filteredSources = useMemo(
    () => sources.filter((source) => filteredEventIds.has(source.event_id)),
    [filteredEventIds, sources]
  );
  const comparisonRequestedFrom = Number(comparisonFilters.yearFrom);
  const comparisonRequestedTo = Number(comparisonFilters.yearTo);
  const comparisonStart = comparisonFilters.period === "common"
    ? Math.max(releaseStart, 2000)
    : comparisonFilters.period === "custom" && Number.isFinite(comparisonRequestedFrom)
      ? Math.max(releaseStart, Math.min(comparisonRequestedFrom, releaseEnd))
      : releaseStart;
  const comparisonEnd = comparisonFilters.period === "common"
    ? Math.min(releaseEnd, 2022)
    : comparisonFilters.period === "custom" && Number.isFinite(comparisonRequestedTo)
      ? Math.max(releaseStart, Math.min(comparisonRequestedTo, releaseEnd))
      : releaseEnd;
  const validComparisonPeriod = comparisonStart <= comparisonEnd;
  const comparisonEvents = useMemo(
    () => events.filter((event) => eventMatchesCohort(event, comparisonFilters, comparisonStart, comparisonEnd, validComparisonPeriod)),
    [comparisonEnd, comparisonFilters, comparisonStart, events, validComparisonPeriod]
  );
  const comparisonEventIds = useMemo(
    () => new Set(comparisonEvents.map((event) => event.event_id)),
    [comparisonEvents]
  );
  const comparisonSources = useMemo(
    () => sources.filter((source) => comparisonEventIds.has(source.event_id)),
    [comparisonEventIds, sources]
  );
  const comparisonEventsWithSources = useMemo(
    () => new Set(comparisonSources.map((source) => source.event_id)).size,
    [comparisonSources]
  );
  const comparisonOverlap = useMemo(
    () => comparisonEvents.filter((event) => filteredEventIds.has(event.event_id)).length,
    [comparisonEvents, filteredEventIds]
  );

  const analytics = useMemo(() => {
    const totalEvents = filteredEvents.length;
    const totalSources = filteredSources.length;
    const exactLocations = filteredEvents.filter((event) => event.exact_location).length;
    const eventsWithSources = new Set(filteredSources.map((source) => source.event_id)).size;
    const coverageFields = [
      [language === "it" ? "Causa specifica" : "Specific cause", "specific_cause"],
      [language === "it" ? "Regione" : "Region", "region"],
      [language === "it" ? "Tipologia strutturale" : "Structural type", "structural_type"],
      [language === "it" ? "Materiale" : "Material", "material_type"],
      [language === "it" ? "Uso infrastrutturale" : "Infrastructure use", "destination_use"],
      [language === "it" ? "Anno di costruzione" : "Construction year", "construction_year_numeric"],
    ].map(([label, key]) => {
      const available = filteredEvents.filter((event) => hasAnalyticalValue(event[key])).length;
      return { available, label, missing: totalEvents - available, total: totalEvents };
    });

    return {
      coverageFields,
      eventsWithSources,
      exactLocations,
      totalEvents,
      totalSources,
    };
  }, [filteredEvents, filteredSources, language]);

  const periodLabel = `${analysisStart}-${analysisEnd}`;
  const activeFilterCount = [filters.cause, filters.region, filters.severity, filters.evidence]
    .filter((value) => value !== "All").length + (filters.period === "release" ? 0 : 1);
  const hasReleaseData = loadState === "available" && events.length > 0;

  const chartDimensions = useMemo(() => [
    { key: "year", label: language === "it" ? "Anno dell’evento" : "Event year" },
    { key: "month", label: language === "it" ? "Mese dell’evento" : "Event month", definition: language === "it" ? "Derivato esclusivamente da date complete documentate." : "Derived exclusively from documented complete dates." },
    { key: "season", label: language === "it" ? "Stagione meteorologica" : "Meteorological season", definition: language === "it" ? "Emisfero nord: inverno dic–feb, primavera mar–mag, estate giu–ago, autunno set–nov." : "Northern Hemisphere: winter Dec–Feb, spring Mar–May, summer Jun–Aug, autumn Sep–Nov." },
    { key: "five_year_period", label: language === "it" ? "Periodo quinquennale" : "Five-year period", definition: language === "it" ? "Intervalli di calendario consecutivi, non medie mobili." : "Consecutive calendar intervals, not rolling averages." },
    { key: "decade", label: language === "it" ? "Decennio" : "Decade", definition: language === "it" ? "Intervalli di calendario di dieci anni." : "Ten-year calendar intervals." },
    { key: "specific_cause", label: language === "it" ? "Causa" : "Cause" },
    { key: "failure_trigger", label: language === "it" ? "Evento innescante" : "Triggering event" },
    { key: "region", label: language === "it" ? "Regione" : "Region" },
    { key: "collapse_severity", label: language === "it" ? "Severità" : "Severity" },
    { key: "structural_type", label: language === "it" ? "Tipologia strutturale" : "Structural type" },
    { key: "material_type", label: language === "it" ? "Materiale" : "Material" },
    { key: "destination_use", label: language === "it" ? "Uso infrastrutturale" : "Infrastructure use" },
    { key: "failure_cause_evidence", label: language === "it" ? "Evidenza della causa" : "Cause evidence" },
    { key: "failure_process", label: language === "it" ? "Processo di cedimento" : "Failure process" },
    { key: "component_involved", label: language === "it" ? "Componente coinvolta" : "Component involved" },
    { key: "bridge_age", label: language === "it" ? "Età al collasso" : "Age at collapse", definition: language === "it" ? "Anno dell’evento meno anno di costruzione; classi in anni e mancanti espliciti." : "Event year minus construction year; age bands in years with explicit missing values." },
  ], [language]);
  const validChartDimension = chartDimensions.some((dimension) => dimension.key === chartDimension)
    ? chartDimension
    : "specific_cause";
  const selectedChartDimension = chartDimensions.find((dimension) => dimension.key === validChartDimension);
  const validColumnDimension = chartDimensions.some((dimension) => dimension.key === columnDimension)
    ? columnDimension
    : "collapse_severity";
  const selectedColumnDimension = chartDimensions.find((dimension) => dimension.key === validColumnDimension);
  const chartMissingLabel = language === "it" ? "Non documentato" : "Not documented";
  const chartRows = useMemo(
    () => buildDimensionRows(filteredEvents, validChartDimension, chartMissingLabel, language),
    [chartMissingLabel, filteredEvents, language, validChartDimension]
  );
  const chartAvailable = chartRows
    .filter((row) => !row.missing)
    .reduce((total, row) => total + row.value, 0);
  const chartMissing = chartRows.find((row) => row.missing)?.value || 0;
  const temporalSensitivity = useMemo(() => {
    if (analysisMode !== "distribution" || !["month", "season"].includes(validChartDimension)) return null;
    const groups = new Map();
    const allDates = new Set();

    filteredEvents.forEach((event) => {
      const value = dimensionValue(event, validChartDimension, chartMissingLabel, language);
      const current = groups.get(value.key) || { dateCounts: new Map(), key: value.key, label: value.label, records: 0 };
      current.records += 1;
      const parts = dateParts(event.date);
      if (parts.day && parts.month && parts.year) {
        const date = String(event.date);
        current.dateCounts.set(date, (current.dateCounts.get(date) || 0) + 1);
        allDates.add(date);
      }
      groups.set(value.key, current);
    });

    const rows = chartRows.map((chartRow) => {
      const group = groups.get(chartRow.key);
      const dateCounts = group?.dateCounts || new Map();
      return {
        distinctDateShare: percentage(dateCounts.size, allDates.size),
        distinctDates: dateCounts.size,
        key: chartRow.key,
        label: chartRow.label,
        maxRecordsSameDate: dateCounts.size ? Math.max(...dateCounts.values()) : 0,
        recordShare: percentage(chartRow.value, filteredEvents.length),
        records: chartRow.value,
      };
    });

    return {
      rows,
      totalDistinctDates: allDates.size,
      totalRecords: filteredEvents.length,
    };
  }, [analysisMode, chartMissingLabel, chartRows, filteredEvents, language, validChartDimension]);
  const sharedEpisodeSensitivity = useMemo(() => {
    if (!episodes?.episodes?.length || !filteredEvents.length) return null;

    const selectedIds = new Set(filteredEvents.map((event) => event.event_id));
    const rows = episodes.episodes
      .map((episode) => ({
        ...episode,
        cohort_event_ids: (episode.event_ids || []).filter((eventId) => selectedIds.has(eventId)),
      }))
      .filter((episode) => episode.cohort_event_ids.length > 1)
      .map((episode) => ({
        ...episode,
        cohort_event_count: episode.cohort_event_ids.length,
      }))
      .sort((left, right) =>
        right.cohort_event_count - left.cohort_event_count ||
        String(left.date_start || "").localeCompare(String(right.date_start || ""))
      );

    if (!rows.length) return null;

    const groupedRecords = rows.reduce((total, episode) => total + episode.cohort_event_count, 0);
    const duplicateRecords = rows.reduce((total, episode) => total + episode.cohort_event_count - 1, 0);

    return {
      collapsedUnitCount: filteredEvents.length - duplicateRecords,
      episodeCount: rows.length,
      groupedRecords,
      largestEpisode: Math.max(...rows.map((episode) => episode.cohort_event_count)),
      rows,
    };
  }, [episodes, filteredEvents]);
  const chartTitle = language === "it"
    ? `Distribuzione per ${selectedChartDimension.label.toLowerCase()}`
    : `Distribution by ${selectedChartDimension.label.toLowerCase()}`;
  const comparisonDimensionRows = useMemo(
    () => buildDimensionRows(comparisonEvents, validChartDimension, chartMissingLabel, language),
    [chartMissingLabel, comparisonEvents, language, validChartDimension]
  );
  const comparisonChartMissing = comparisonDimensionRows.find((row) => row.missing)?.value || 0;
  const comparisonRows = useMemo(() => {
    const aRows = new Map(chartRows.map((row) => [row.key, row]));
    const bRows = new Map(comparisonDimensionRows.map((row) => [row.key, row]));
    const keys = [...new Set([...aRows.keys(), ...bRows.keys()])];

    return keys.map((key) => {
      const aRow = aRows.get(key);
      const bRow = bRows.get(key);
      const a = aRow?.value || 0;
      const b = bRow?.value || 0;
      return {
        a,
        aShare: percentage(a, filteredEvents.length),
        b,
        bShare: percentage(b, comparisonEvents.length),
        key,
        label: aRow?.label || bRow?.label || key,
        missing: Boolean(aRow?.missing || bRow?.missing),
        order: aRow?.order ?? bRow?.order ?? null,
      };
    }).sort((a, b) => {
      if (a.missing !== b.missing) return a.missing ? 1 : -1;
      if (Number.isFinite(a.order) && Number.isFinite(b.order)) return a.order - b.order;
      return (b.a + b.b) - (a.a + a.b) || a.label.localeCompare(b.label, language === "it" ? "it" : "en");
    });
  }, [chartRows, comparisonDimensionRows, comparisonEvents.length, filteredEvents.length, language]);
  const comparisonTitle = language === "it"
    ? `Confronto A/B per ${selectedChartDimension.label.toLowerCase()}`
    : `A/B comparison by ${selectedChartDimension.label.toLowerCase()}`;
  const crossTab = useMemo(() => {
    const rowMap = new Map();
    const columnMap = new Map();

    filteredEvents.forEach((event) => {
      const row = dimensionValue(event, validChartDimension, chartMissingLabel, language);
      const column = dimensionValue(event, validColumnDimension, chartMissingLabel, language);
      const rowEntry = rowMap.get(row.key) || { ...row, columns: new Map(), total: 0 };
      const columnEntry = columnMap.get(column.key) || { ...column, total: 0 };

      rowEntry.columns.set(column.key, (rowEntry.columns.get(column.key) || 0) + 1);
      rowEntry.total += 1;
      columnEntry.total += 1;
      rowMap.set(row.key, rowEntry);
      columnMap.set(column.key, columnEntry);
    });

    const sortDimensionEntries = (items) => items.sort((a, b) => {
      if (a.missing !== b.missing) return a.missing ? 1 : -1;
      if (Number.isFinite(a.order) && Number.isFinite(b.order)) return a.order - b.order;
      return b.total - a.total || a.label.localeCompare(b.label, language === "it" ? "it" : "en");
    });

    return {
      columns: sortDimensionEntries([...columnMap.values()]),
      rows: sortDimensionEntries([...rowMap.values()]),
    };
  }, [chartMissingLabel, filteredEvents, language, validChartDimension, validColumnDimension]);
  const crossTabTitle = language === "it"
    ? `${selectedChartDimension.label} × ${selectedColumnDimension.label}`
    : `${selectedChartDimension.label} × ${selectedColumnDimension.label}`;
  const crossTabMax = Math.max(
    ...crossTab.rows.flatMap((row) => crossTab.columns.map((column) => row.columns.get(column.key) || 0)),
    1
  );
  const crossTabColumnMissing = crossTab.columns.find((column) => column.missing)?.total || 0;
  const crossTabCellCount = crossTab.rows.length * crossTab.columns.length;
  const crossTabNonZeroCells = crossTab.rows.reduce(
    (total, row) => total + crossTab.columns.filter((column) => (row.columns.get(column.key) || 0) > 0).length,
    0
  );
  const crossTabDensity = percentage(crossTabNonZeroCells, crossTabCellCount);
  const selectedSliceEvents = useMemo(() => {
    if (!selectedSlice) return filteredEvents;
    const baseEvents = selectedSlice.cohort === "B" ? comparisonEvents : filteredEvents;

    return baseEvents.filter((event) => {
      const row = dimensionValue(event, validChartDimension, chartMissingLabel, language);
      if (row.key !== selectedSlice.rowKey) return false;
      if (!selectedSlice.columnKey) return true;
      return dimensionValue(event, validColumnDimension, chartMissingLabel, language).key === selectedSlice.columnKey;
    });
  }, [chartMissingLabel, comparisonEvents, filteredEvents, language, selectedSlice, validChartDimension, validColumnDimension]);
  const recordPreview = [...selectedSliceEvents]
    .sort((a, b) => String(b.date).localeCompare(String(a.date)))
    .slice(0, 6);
  const selectedSliceLabel = selectedSlice
    ? [
        selectedSlice.cohort ? `${language === "it" ? "Coorte" : "Cohort"} ${selectedSlice.cohort}` : null,
        selectedSlice.rowLabel,
        selectedSlice.columnLabel,
      ].filter(Boolean).join(" · ")
    : null;
  const hasAnalyticalOutput = analysisMode === "comparison" ? comparisonRows.length > 0 : chartRows.length > 0;
  const distributionStats = distributionDiagnostics(chartRows);
  const comparisonStats = comparisonDistributionDiagnostics(comparisonRows, filteredEvents.length, comparisonEvents.length);
  const crossStats = crossTabDiagnostics(crossTab);
  const sourceDepthA = sourceDepthDiagnostics(filteredEvents, filteredSources);
  const sourceDepthB = sourceDepthDiagnostics(comparisonEvents, comparisonSources);
  const advancedDiagnostics = analysisMode === "comparison"
    ? [
        {
          key: "jensen_shannon_divergence",
          label: "Jensen–Shannon",
          value: comparisonStats.jensenShannon ?? "—",
          formula: "JSD(PA, PB) · 0–1",
          detail: language === "it" ? "distanza simmetrica fra distribuzioni" : "symmetric distance between distributions",
        },
        {
          key: "total_variation_distance",
          label: language === "it" ? "Variazione totale" : "Total variation",
          value: comparisonStats.totalVariation ?? "—",
          formula: "½ Σ |pA − pB| · 0–1",
          detail: language === "it" ? "quota minima da riallocare tra categorie" : "minimum share reallocated across categories",
        },
        {
          key: "record_overlap",
          label: language === "it" ? "Sovrapposizione record" : "Record overlap",
          value: comparisonOverlap,
          formula: "|A ∩ B|",
          detail: comparisonOverlap > 0
            ? (language === "it" ? "le coorti non sono indipendenti" : "cohorts are not independent")
            : (language === "it" ? "coorti disgiunte" : "disjoint cohorts"),
          caution: comparisonOverlap > 0,
        },
        {
          key: "median_sources",
          label: language === "it" ? "Mediana fonti/evento" : "Median sources/event",
          value: `${sourceDepthA.median ?? "—"} A · ${sourceDepthB.median ?? "—"} B`,
          formula: "median(nsources)",
          detail: language === "it" ? "volume documentale, non affidabilità" : "documentary volume, not reliability",
        },
      ]
    : analysisMode === "crosstab"
      ? [
          {
            key: "cramers_v",
            label: "V di Cramér",
            value: crossStats.cramersV ?? "—",
            formula: "√[χ² / n·min(r−1,c−1)]",
            detail: language === "it" ? "associazione descrittiva nel database; nessun p-value" : "descriptive database association; no p-value",
          },
          {
            key: "small_expected_cells",
            label: language === "it" ? "Celle attese < 5" : "Expected cells < 5",
            value: crossStats.expectedBelowFive === null ? "—" : `${crossStats.expectedBelowFive}/${crossStats.expectedCellCount}`,
            formula: "Eij = ri·cj / n",
            detail: language === "it" ? "diagnostica di sparsità, non test d’ipotesi" : "sparsity diagnostic, not a hypothesis test",
            caution: crossStats.expectedBelowFive > 0,
          },
          {
            key: "effective_records",
            label: language === "it" ? "n analitico" : "Analytical n",
            value: crossStats.effectiveRecords,
            formula: "n senza categorie mancanti",
            detail: language === "it" ? "mancanti esclusi solo dalla misura V" : "missing excluded only from V",
          },
          {
            key: "median_sources",
            label: language === "it" ? "Mediana fonti/evento" : "Median sources/event",
            value: sourceDepthA.median ?? "—",
            formula: "median(nsources)",
            detail: `${Math.round((sourceDepthA.threePlusShare || 0) * 100)}% ${language === "it" ? "con ≥3 fonti; non misura affidabilità" : "with ≥3 sources; not a reliability measure"}`,
          },
        ]
      : [
          {
            key: "normalized_entropy",
            label: language === "it" ? "Entropia normalizzata" : "Normalized entropy",
            value: distributionStats.normalizedEntropy ?? "—",
            formula: "H / ln(k) · 0–1",
            detail: language === "it" ? "dispersione fra categorie, senza mancanti" : "dispersion across categories, excluding missing",
          },
          {
            key: "effective_categories",
            label: language === "it" ? "Categorie effettive" : "Effective categories",
            value: distributionStats.effectiveCategories ?? "—",
            formula: "exp(H)",
            detail: `${distributionStats.categoryCount} ${language === "it" ? "categorie osservate" : "observed categories"}`,
          },
          {
            key: "top_category_share",
            label: language === "it" ? "Quota categoria principale" : "Top-category share",
            value: distributionStats.topShare === null ? "—" : `${Math.round(distributionStats.topShare * 100)}%`,
            formula: "max(ni) / nvalid",
            detail: language === "it" ? "concentrazione descrittiva" : "descriptive concentration",
          },
          {
            key: "source_depth",
            label: language === "it" ? "Mediana fonti/evento" : "Median sources/event",
            value: sourceDepthA.median ?? "—",
            formula: "median(nsources)",
            detail: `${Math.round((sourceDepthA.singleSourceShare || 0) * 100)}% ${language === "it" ? "con una fonte; non misura affidabilità" : "with one source; not a reliability measure"}`,
            caution: (sourceDepthA.singleSourceShare || 0) > 0.5,
          },
        ];
  const topChartRow = [...chartRows]
    .filter((row) => !row.missing)
    .sort((a, b) => b.value - a.value)[0] || null;
  const topTemporalRow = temporalSensitivity?.rows.find((row) => row.key === topChartRow?.key) || null;
  const largestComparisonDifference = [...comparisonRows]
    .filter((row) => !row.missing)
    .sort((a, b) => Math.abs(b.aShare - b.bShare) - Math.abs(a.aShare - a.bShare))[0] || null;
  const figureCaption = (() => {
    const release = manifest?.version || (language === "it" ? "release non dichiarata" : "release not declared");
    const boundary = language === "it"
      ? "I conteggi descrivono i record documentati in ARCUS e non rappresentano rischio, probabilità o prevalenza nazionale."
      : "Counts describe documented ARCUS records and do not represent risk, probability or national prevalence.";

    if (analysisMode === "comparison") {
      const difference = largestComparisonDifference
        ? language === "it"
          ? `${largestComparisonDifference.label}: ${largestComparisonDifference.aShare}% in A e ${largestComparisonDifference.bShare}% in B (Δ ${largestComparisonDifference.aShare - largestComparisonDifference.bShare > 0 ? "+" : ""}${largestComparisonDifference.aShare - largestComparisonDifference.bShare} punti percentuali).`
          : `${largestComparisonDifference.label}: ${largestComparisonDifference.aShare}% in A and ${largestComparisonDifference.bShare}% in B (Δ ${largestComparisonDifference.aShare - largestComparisonDifference.bShare > 0 ? "+" : ""}${largestComparisonDifference.aShare - largestComparisonDifference.bShare} percentage points).`
        : (language === "it" ? "Nessuna categoria confrontabile." : "No comparable category.");
      return language === "it"
        ? `ARCUS Open ${release}. Confronto descrittivo per ${selectedChartDimension.label.toLowerCase()} tra la coorte A (n=${filteredEvents.length}) e la coorte B (n=${comparisonEvents.length}); record condivisi: ${comparisonOverlap}; Jensen–Shannon: ${comparisonStats.jensenShannon ?? "n.d."}, variazione totale: ${comparisonStats.totalVariation ?? "n.d."}. Massima differenza osservata — ${difference} ${boundary}`
        : `ARCUS Open ${release}. Descriptive comparison by ${selectedChartDimension.label.toLowerCase()} between cohort A (n=${filteredEvents.length}) and cohort B (n=${comparisonEvents.length}); shared records: ${comparisonOverlap}; Jensen–Shannon: ${comparisonStats.jensenShannon ?? "n/a"}, total variation: ${comparisonStats.totalVariation ?? "n/a"}. Largest observed difference — ${difference} ${boundary}`;
    }

    if (analysisMode === "crosstab") {
      return language === "it"
        ? `ARCUS Open ${release}. Tavola descrittiva ${selectedChartDimension.label} × ${selectedColumnDimension.label} per la coorte selezionata (n=${analytics.totalEvents}); V di Cramér: ${crossStats.cramersV ?? "n.d."}; ${crossTabNonZeroCells} celle non vuote su ${crossTabCellCount}, densità ${crossTabDensity}%. Mancanti: ${chartMissing} sulla variabile di riga e ${crossTabColumnMissing} sulla variabile di colonna. ${boundary}`
        : `ARCUS Open ${release}. Descriptive ${selectedChartDimension.label} × ${selectedColumnDimension.label} table for the selected cohort (n=${analytics.totalEvents}); Cramér’s V: ${crossStats.cramersV ?? "n/a"}; ${crossTabNonZeroCells} non-empty cells out of ${crossTabCellCount}, density ${crossTabDensity}%. Missing: ${chartMissing} in the row variable and ${crossTabColumnMissing} in the column variable. ${boundary}`;
    }

    const leading = topChartRow
      ? `${topChartRow.label} (n=${topChartRow.value}; ${percentage(topChartRow.value, analytics.totalEvents)}%)`
      : (language === "it" ? "nessuna categoria disponibile" : "no available category");
    const dateSensitivity = topTemporalRow
      ? language === "it"
        ? ` Sensibilità per date documentate distinte: ${topTemporalRow.label} comprende ${topTemporalRow.distinctDates}/${temporalSensitivity.totalDistinctDates} date (${topTemporalRow.distinctDateShare}%); una data non equivale necessariamente a un episodio indipendente.`
        : ` Distinct documented-date sensitivity: ${topTemporalRow.label} includes ${topTemporalRow.distinctDates}/${temporalSensitivity.totalDistinctDates} dates (${topTemporalRow.distinctDateShare}%); one date does not necessarily equal one independent episode.`
      : "";
    return language === "it"
      ? `ARCUS Open ${release}. Distribuzione per ${selectedChartDimension.label.toLowerCase()} nella coorte selezionata (n=${analytics.totalEvents}, periodo ${periodLabel}). Categoria più rappresentata: ${leading}; entropia normalizzata: ${distributionStats.normalizedEntropy ?? "n.d."}; valori mancanti: ${chartMissing}.${dateSensitivity} ${boundary}`
      : `ARCUS Open ${release}. Distribution by ${selectedChartDimension.label.toLowerCase()} in the selected cohort (n=${analytics.totalEvents}, period ${periodLabel}). Most represented category: ${leading}; normalized entropy: ${distributionStats.normalizedEntropy ?? "n/a"}; missing values: ${chartMissing}.${dateSensitivity} ${boundary}`;
  })();
  const interpretationChecks = [
    {
      label: language === "it" ? "Base osservata" : "Observed base",
      value: analysisMode === "comparison" ? `nA ${filteredEvents.length} · nB ${comparisonEvents.length}` : `n ${analytics.totalEvents}`,
      detail: (analysisMode === "comparison" ? Math.min(filteredEvents.length, comparisonEvents.length) : analytics.totalEvents) < 10
        ? (language === "it" ? "campione molto piccolo" : "very small sample")
        : (language === "it" ? "denominatore dichiarato" : "denominator declared"),
      caution: (analysisMode === "comparison" ? Math.min(filteredEvents.length, comparisonEvents.length) : analytics.totalEvents) < 10,
    },
    {
      label: language === "it" ? "Copertura fonti" : "Source coverage",
      value: analysisMode === "comparison"
        ? `${percentage(analytics.eventsWithSources, analytics.totalEvents)}% A · ${percentage(comparisonEventsWithSources, comparisonEvents.length)}% B`
        : `${percentage(analytics.eventsWithSources, analytics.totalEvents)}%`,
      detail: language === "it" ? "record con almeno una fonte" : "records with at least one source",
    },
    {
      label: language === "it" ? "Completezza variabile" : "Variable completeness",
      value: analysisMode === "comparison"
        ? `${percentage(filteredEvents.length - chartMissing, filteredEvents.length)}% A · ${percentage(comparisonEvents.length - comparisonChartMissing, comparisonEvents.length)}% B`
        : `${percentage(chartAvailable, analytics.totalEvents)}%`,
      detail: selectedChartDimension.label,
      caution: chartMissing > 0 || (analysisMode === "comparison" && comparisonChartMissing > 0),
    },
    {
      label: language === "it" ? "Struttura analisi" : "Analysis structure",
      value: analysisMode === "comparison"
        ? `${comparisonOverlap} ${language === "it" ? "condivisi" : "shared"}`
        : analysisMode === "crosstab"
          ? `${crossTabDensity}% ${language === "it" ? "densità" : "density"}`
          : `${chartRows.length} ${language === "it" ? "gruppi" : "groups"}`,
      detail: analysisMode === "comparison"
        ? (comparisonOverlap > 0 ? (language === "it" ? "coorti non indipendenti" : "cohorts not independent") : (language === "it" ? "coorti disgiunte" : "disjoint cohorts"))
        : analysisMode === "crosstab"
          ? (language === "it" ? "celle non vuote / celle totali" : "non-empty / total cells")
          : (language === "it" ? "mancanti mantenuti separati" : "missing kept separate"),
      caution: analysisMode === "comparison" && comparisonOverlap > 0,
    },
  ];

  function chartQueryManifest() {
    return {
      product: "ARCUS Open Research Explorer",
      release: manifest?.version || null,
      generated_at: new Date().toISOString(),
      query: {
        period: filters.period,
        year_from: analysisStart,
        year_to: analysisEnd,
        cause: filters.cause,
        region: filters.region,
        severity: filters.severity,
        cause_evidence: filters.evidence,
      },
      comparison_query: analysisMode === "comparison" ? {
        period: comparisonFilters.period,
        year_from: comparisonStart,
        year_to: comparisonEnd,
        cause: comparisonFilters.cause,
        region: comparisonFilters.region,
        severity: comparisonFilters.severity,
        cause_evidence: comparisonFilters.evidence,
      } : null,
      chart: {
        analysis_mode: analysisMode,
        dimension: validChartDimension,
        dimension_definition: selectedChartDimension.definition || null,
        column_dimension: analysisMode === "crosstab" ? validColumnDimension : null,
        column_dimension_definition: analysisMode === "crosstab" ? selectedColumnDimension.definition || null : null,
        metric: "documented_records",
        view: analysisMode === "crosstab" ? "contingency_table" : chartView,
      },
      denominators: {
        records: analytics.totalEvents,
        linked_sources: analytics.totalSources,
        records_with_sources: analytics.eventsWithSources,
        comparison_records: analysisMode === "comparison" ? comparisonEvents.length : null,
        comparison_linked_sources: analysisMode === "comparison" ? comparisonSources.length : null,
        shared_records: analysisMode === "comparison" ? comparisonOverlap : null,
      },
      completeness: {
        dimension_available: chartAvailable,
        dimension_missing: chartMissing,
      },
      advanced_diagnostics: {
        scope: "descriptive_only",
        distribution: analysisMode === "distribution" ? distributionStats : null,
        contingency: analysisMode === "crosstab" ? {
          ...crossStats,
          missing_categories_excluded_from_cramers_v: true,
          hypothesis_test_performed: false,
        } : null,
        comparison: analysisMode === "comparison" ? {
          ...comparisonStats,
          shared_records: comparisonOverlap,
          cohorts_independent: comparisonOverlap === 0,
        } : null,
        source_depth: {
          cohort_a: sourceDepthA,
          cohort_b: analysisMode === "comparison" ? sourceDepthB : null,
        },
      },
      temporal_sensitivity: temporalSensitivity ? {
        unit: "distinct_documented_dates",
        independent_episode_claim: false,
        total_distinct_dates: temporalSensitivity.totalDistinctDates,
        rows: temporalSensitivity.rows.map((row) => ({
          key: row.key,
          label: row.label,
          records: row.records,
          record_share_percent: row.recordShare,
          distinct_dates: row.distinctDates,
          distinct_date_share_percent: row.distinctDateShare,
          maximum_records_on_one_date: row.maxRecordsSameDate,
        })),
      } : null,
      shared_episode_sensitivity: sharedEpisodeSensitivity ? {
        unit: "published_shared_hazard_episode",
        independent_mechanism_claim: false,
        grouped_records: sharedEpisodeSensitivity.groupedRecords,
        published_episode_count: sharedEpisodeSensitivity.episodeCount,
        units_after_grouping: sharedEpisodeSensitivity.collapsedUnitCount,
        rows: sharedEpisodeSensitivity.rows.map((episode) => ({
          date_end: episode.date_end,
          date_start: episode.date_start,
          episode_id: episode.episode_id,
          episode_type: episode.episode_type,
          records_in_cohort: episode.cohort_event_count,
          event_ids: episode.cohort_event_ids,
          regions: episode.regions,
        })),
      } : null,
      groups: chartRows.map((row) => ({
        key: row.key,
        label: row.label,
        missing: row.missing,
        records: row.value,
        share_of_cohort_percent: percentage(row.value, analytics.totalEvents),
      })),
      contingency_table: analysisMode === "crosstab" ? {
        columns: crossTab.columns.map((column) => ({ key: column.key, label: column.label, total: column.total })),
        rows: crossTab.rows.map((row) => ({
          key: row.key,
          label: row.label,
          total: row.total,
          values: Object.fromEntries(crossTab.columns.map((column) => [column.key, row.columns.get(column.key) || 0])),
        })),
      } : null,
      comparison: analysisMode === "comparison" ? comparisonRows.map((row) => ({
        key: row.key,
        label: row.label,
        cohort_a_records: row.a,
        cohort_a_share_percent: row.aShare,
        cohort_b_records: row.b,
        cohort_b_share_percent: row.bShare,
        difference_percentage_points: row.aShare - row.bShare,
      })) : null,
      limitations: [
        "Counts describe documented ARCUS records, not the Italian bridge inventory.",
        "Observed frequencies are not estimates of collapse risk, probability or national prevalence.",
        "Missing values are retained as an explicit group and are not imputed.",
        "Advanced diagnostics describe the curated database only; no population inference or hypothesis test is performed.",
        "Source counts measure documentary volume, not source independence, reliability or causal certainty.",
        ...(temporalSensitivity ? ["Distinct documented dates are a clustering sensitivity measure and are not asserted to be independent hazard episodes."] : []),
        ...(sharedEpisodeSensitivity ? ["Published shared episodes are a clustering control; they do not establish an identical structural failure mechanism across member records."] : []),
        ...(analysisMode === "comparison" && comparisonOverlap > 0
          ? [`Cohorts overlap by ${comparisonOverlap} records and must not be interpreted as independent samples.`]
          : []),
      ],
    };
  }

  function downloadChart() {
    if (!chartSvgRef.current || !hasAnalyticalOutput) return;

    const serialized = new XMLSerializer().serializeToString(chartSvgRef.current);
    const filename = `arcus-${chartFilenamePart(manifest?.version)}-${chartFilenamePart(validChartDimension)}-${analysisStart}-${analysisEnd}.svg`;
    downloadClientFile(`<?xml version="1.0" encoding="UTF-8"?>\n${serialized}`, filename, "image/svg+xml;charset=utf-8");
  }

  function downloadChartManifest() {
    const filename = `arcus-${chartFilenamePart(manifest?.version)}-${chartFilenamePart(validChartDimension)}-${analysisStart}-${analysisEnd}-manifest.json`;
    downloadClientFile(`${JSON.stringify(chartQueryManifest(), null, 2)}\n`, filename, "application/json;charset=utf-8");
  }

  function chartDataRows() {
    if (analysisMode === "comparison") {
      return [
        [selectedChartDimension.label, "Cohort A records", "Cohort A share (%)", "Cohort B records", "Cohort B share (%)", "Difference (percentage points)"],
        ...comparisonRows.map((row) => [row.label, row.a, row.aShare, row.b, row.bShare, row.aShare - row.bShare]),
      ];
    }
    if (analysisMode === "crosstab") {
      return [
        [selectedChartDimension.label, ...crossTab.columns.map((column) => column.label), "Total"],
        ...crossTab.rows.map((row) => [
          row.label,
          ...crossTab.columns.map((column) => row.columns.get(column.key) || 0),
          row.total,
        ]),
        ["Total", ...crossTab.columns.map((column) => column.total), analytics.totalEvents],
      ];
    }

    if (temporalSensitivity) {
      return [
        [selectedChartDimension.label, "Records", "Record share (%)", "Distinct documented dates", "Distinct-date share (%)", "Maximum records on one date"],
        ...temporalSensitivity.rows.map((row) => [
          row.label,
          row.records,
          row.recordShare,
          row.distinctDates,
          row.distinctDateShare,
          row.maxRecordsSameDate,
        ]),
      ];
    }

    return [
      [selectedChartDimension.label, "Records", "Share of cohort (%)", "Missing"],
      ...chartRows.map((row) => [row.label, row.value, percentage(row.value, analytics.totalEvents), row.missing]),
    ];
  }

  function downloadChartData() {
    const filename = `arcus-${chartFilenamePart(manifest?.version)}-${chartFilenamePart(validChartDimension)}-${analysisStart}-${analysisEnd}.csv`;
    downloadClientFile(csvRows(chartDataRows()), filename, "text/csv;charset=utf-8");
  }

  async function copyFigureCaption() {
    try {
      await navigator.clipboard.writeText(figureCaption);
      setCaptionState("copied");
    } catch (error) {
      console.error("ARCUS figure caption copy failed", error);
      setCaptionState("error");
    }
  }

  function downloadFigureCaption() {
    const filename = `arcus-${chartFilenamePart(manifest?.version)}-${chartFilenamePart(validChartDimension)}-${analysisStart}-${analysisEnd}-caption.txt`;
    downloadClientFile(`${figureCaption}\n`, filename, "text/plain;charset=utf-8");
  }

  async function downloadResearchPackage() {
    if (!hasAnalyticalOutput || packageState === "preparing") return;
    setPackageState("preparing");

    try {
      const generatedAt = new Date();
      const eventMap = new Map();
      const packageBaseEvents = selectedSlice
        ? selectedSliceEvents
        : analysisMode === "comparison"
          ? [...filteredEvents, ...comparisonEvents]
          : filteredEvents;

      packageBaseEvents.forEach((event) => {
        const membership = [
          filteredEventIds.has(event.event_id) ? "A" : null,
          analysisMode === "comparison" && comparisonEventIds.has(event.event_id) ? "B" : null,
        ].filter(Boolean).join("+");
        eventMap.set(event.event_id, { cohort_membership: membership || "A", ...event });
      });

      const packageEvents = [...eventMap.values()];
      const packageEventIds = new Set(packageEvents.map((event) => event.event_id));
      const packageSources = sources.filter((source) => packageEventIds.has(source.event_id));
      const aggregateCsv = csvRows(chartDataRows());
      const recordsCsv = objectsCsv(packageEvents);
      const sourcesCsv = objectsCsv(packageSources);
      const readme = `# ARCUS Open Research Package\n\nGenerated: ${generatedAt.toISOString()}\nRelease: ${manifest?.version || "not declared"}\nAnalysis: ${analysisMode}\nRecord scope: ${selectedSlice ? "selected analytical result" : analysisMode === "comparison" ? "union of cohorts A and B" : "cohort A"}\nRecords included: ${packageEvents.length}\nSources included: ${packageSources.length}\n\n## Contents\n\n- manifest.json — query, denominators, completeness, limitations and SHA-256 checksums.\n- aggregate.csv — values represented by the current analysis.\n- figure-caption.txt — generated descriptive caption with interpretation boundary.\n- records.csv — public ARCUS records behind the current result, including cohort membership.\n- sources.csv — public source records linked to the included events.\n${sharedEpisodeSensitivity ? "- shared-episodes.json — published multi-collapse episode groups intersecting the current cohort.\n" : ""}- citation.txt — release and citation guidance.\n${chartSvgRef.current && analysisMode !== "crosstab" && chartView === "bars" ? "- figure.svg — current vector figure.\n" : ""}\n## Interpretation boundary\n\nThese files describe documented ARCUS collapse records. They do not represent the Italian bridge inventory and must not be used as estimates of collapse risk, probability or national prevalence. Missing values are retained and are not imputed. A/B percentage-point differences are descriptive; overlapping cohorts are not independent samples. Source counts measure documentary volume, not source independence, reliability or causal certainty. Published shared episodes control clustering but do not prove an identical failure mechanism.\n`;
      const citation = `ARCUS Open Research Release ${manifest?.version || "version not declared"}.\nResearch package generated ${generatedAt.toISOString()}.\nUse the formal dataset citation supplied on the ARCUS Data Access page; this query package does not replace the canonical release citation.\n`;
      const packageFiles = [
        { name: "README.md", content: readme },
        { name: "aggregate.csv", content: aggregateCsv },
        { name: "figure-caption.txt", content: `${figureCaption}\n` },
        { name: "records.csv", content: recordsCsv },
        { name: "sources.csv", content: sourcesCsv },
        { name: "citation.txt", content: citation },
      ];

      if (sharedEpisodeSensitivity) {
        packageFiles.push({
          name: "shared-episodes.json",
          content: `${JSON.stringify({
            caveat: episodes?.methodology?.caveat || null,
            episodes: sharedEpisodeSensitivity.rows.map((episode) => ({
              assignment_status: episode.assignment_status,
              date_end: episode.date_end,
              date_start: episode.date_start,
              episode_id: episode.episode_id,
              episode_type: episode.episode_type,
              event_ids_in_cohort: episode.cohort_event_ids,
              regions: episode.regions,
            })),
            release: episodes?.release || manifest?.version || null,
          }, null, 2)}\n`,
        });
      }

      if (chartSvgRef.current && analysisMode !== "crosstab" && chartView === "bars") {
        packageFiles.push({
          name: "figure.svg",
          content: `<?xml version="1.0" encoding="UTF-8"?>\n${new XMLSerializer().serializeToString(chartSvgRef.current)}`,
        });
      }

      const fileInventory = await Promise.all(packageFiles.map(async (file) => ({
        bytes: new TextEncoder().encode(file.content).length,
        name: file.name,
        sha256: await sha256(file.content),
      })));
      const packageManifest = {
        ...chartQueryManifest(),
        package: {
          format: "ARCUS Open Research Package 1.0",
          generated_at: generatedAt.toISOString(),
          record_scope: selectedSlice ? "selected_result" : analysisMode === "comparison" ? "cohort_union" : "cohort_a",
          records_included: packageEvents.length,
          sources_included: packageSources.length,
          selection: selectedSlice ? {
            cohort: selectedSlice.cohort || "A",
            row_key: selectedSlice.rowKey,
            row_label: selectedSlice.rowLabel,
            column_key: selectedSlice.columnKey || null,
            column_label: selectedSlice.columnLabel || null,
          } : null,
          files: fileInventory,
        },
      };
      packageFiles.push({ name: "manifest.json", content: `${JSON.stringify(packageManifest, null, 2)}\n` });

      const zip = createStoredZip(packageFiles, generatedAt);
      const filename = `arcus-research-package-${chartFilenamePart(manifest?.version)}-${analysisMode}-${analysisStart}-${analysisEnd}.zip`;
      downloadClientFile(zip, filename, "application/zip");
      setPackageState("ready");
    } catch (error) {
      console.error("ARCUS research package generation failed", error);
      setPackageState("error");
    }
  }

  function updateFilter(key, value) {
    setFilters((current) => ({ ...current, [key]: value }));
    setActivePreset(null);
    setCaptionState("idle");
    setSelectedSlice(null);
  }

  function updateComparisonFilter(key, value) {
    setComparisonFilters((current) => ({ ...current, [key]: value }));
    setActivePreset(null);
    setCaptionState("idle");
    setSelectedSlice(null);
  }

  function updateChartDimension(value) {
    setChartDimension(value);
    setActivePreset(null);
    setCaptionState("idle");
    setSelectedSlice(null);
    if (analysisMode === "crosstab" && columnDimension === value) {
      setColumnDimension(value === "collapse_severity" ? "specific_cause" : "collapse_severity");
    }
  }

  function resetFilters() {
    setFilters({
      ...DEFAULT_FILTERS,
      yearFrom: String(releaseStart),
      yearTo: String(Math.min(releaseEnd, 2022)),
    });
    setSelectedSlice(null);
    setActivePreset(null);
    setCaptionState("idle");
  }

  function changeAnalysisMode(mode) {
    setAnalysisMode(mode);
    setActivePreset(null);
    setCaptionState("idle");
    setSelectedSlice(null);
  }

  function copyCohortAToB() {
    setComparisonFilters({ ...filters });
    setActivePreset(null);
    setCaptionState("idle");
    setSelectedSlice(null);
  }

  function applyResearchPreset(preset) {
    const years = {
      yearFrom: String(preset.filters.period === "common" ? Math.max(releaseStart, 2000) : releaseStart),
      yearTo: String(preset.filters.period === "common" ? Math.min(releaseEnd, 2022) : releaseEnd),
    };
    setFilters({ ...preset.filters, ...years });
    setAnalysisMode(preset.analysisMode);
    setChartDimension(preset.chartDimension);
    setChartView(preset.chartView || "table");
    if (preset.columnDimension) setColumnDimension(preset.columnDimension);
    if (preset.comparisonFilters) setComparisonFilters({ ...preset.comparisonFilters, ...years });
    setSelectedSlice(null);
    setActivePreset(preset.id);
    setPackageState("idle");
    setCaptionState("idle");
    setAnalysisPath("guided");
  }

  function changeWorkspaceStep(step) {
    setWorkspaceStep(step);
    window.requestAnimationFrame(() => {
      document.querySelector(".analytics-workspace-index")?.scrollIntoView({
        behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth",
        block: "start",
      });
    });
  }

  const heroPreviewItems = language === "it"
    ? [
        ["Release completa", hasReleaseData ? `${formatValue(events.length)} eventi e ${formatValue(sources.length)} fonti, senza account.` : "Caricamento della release verificata…"],
        ["Versione citabile", manifest?.version || "Manifest in caricamento"],
        ["Riproducibilità", "CSV, GeoJSON, tassonomia e audit di qualità."],
      ]
    : [
        ["Complete release", hasReleaseData ? `${formatValue(events.length)} events and ${formatValue(sources.length)} sources, without an account.` : "Loading the verified release…"],
        ["Citable version", manifest?.version || "Loading manifest"],
        ["Reproducibility", "CSV, GeoJSON, taxonomy and quality audit."],
      ];

  return (
    <main
      className="analytics-page"
      id="main-content"
    >
      <PageMeta
        title="Analytics"
        description={
          language === "it"
            ? "Console di ricerca ARCUS per costruire coorti, analizzare variabili e scaricare risultati riproducibili sui collassi documentati dei ponti."
            : "ARCUS research console for building cohorts, analysing variables and downloading reproducible results on documented bridge collapses."
        }
      />

      <Navbar />

      {loadState === "error" && (
        <div className="analytics-data-error" role="alert">
          <span>
            {language === "it"
              ? "La release Open non è disponibile: ARCUS non mostra conteggi pari a zero al posto dei dati mancanti."
              : "The Open release is unavailable: ARCUS does not show zero counts in place of missing data."}
          </span>
          <button type="button" onClick={() => {
            setLoadState("loading");
            setLoadAttempt((attempt) => attempt + 1);
          }}>
            {language === "it" ? "Riprova" : "Retry"}
          </button>
        </div>
      )}

      <section className="analytics-hero analytics-section">
        <div className="analytics-hero-grid" />
        <div className="analytics-hero-overlay" />

        <div className="analytics-container">
          <div className="analytics-hero-layout">
            <div className="analytics-hero-copy">
          <div className="analytics-label">
            ARCUS ANALYTICS
          </div>

          <h1 className="analytics-title">
            {copy.briefingTitle}
          </h1>

          <p className="analytics-subtitle">
            {copy.publicSubtitle}
          </p>

          <div className="analytics-hero-note">
            {copy.heroNote}
          </div>

          <div className="analytics-hero-actions">
            <Link
              className="analytics-primary-link"
              to="/atlas"
            >
              {copy.atlas}
            </Link>

            <Link
              className="analytics-secondary-link"
              to="/methodology"
            >
              {copy.methodCta}
            </Link>
          </div>

            </div>

            <aside className="analytics-hero-pro-preview">
              <span>{copy.lockedTag}</span>
              <h2>{copy.heroPreviewTitle}</h2>

              <div>
                {heroPreviewItems.map(
                  ([title, detail]) => (
                    <article key={title}>
                      <strong>{title}</strong>
                      <p>{detail}</p>
                    </article>
                  )
                )}
              </div>
            </aside>
          </div>

        </div>
      </section>

      <section className="analytics-section analytics-explorer-section" ref={workspaceSectionRef}>
        <div className="analytics-container">
          <div className="analytics-section-header">
            <div className="analytics-section-label">ARCUS OPEN RESEARCH EXPLORER · STEP 0{workspaceStep}</div>
            <h2 className="analytics-section-title">
              {workspaceStep === 1
                ? (language === "it" ? "Costruisci una coorte verificabile." : "Build a verifiable cohort.")
                : workspaceStep === 2
                  ? (language === "it" ? "Progetta un’analisi riproducibile." : "Design a reproducible analysis.")
                  : (language === "it" ? "Leggi l’evidenza dietro la figura." : "Read the evidence behind the figure.")}
            </h2>
            <p className="analytics-section-description">
              {workspaceStep === 1
                ? (language === "it"
                    ? "Definisci il campione attraverso periodo, causa, territorio ed evidenza. Numerosità, fonti e dati mancanti restano sempre dichiarati."
                    : "Define the sample through period, cause, territory and evidence. Sample size, sources and missing data always remain explicit.")
                : workspaceStep === 2
                  ? (language === "it"
                      ? "Scegli una domanda guidata o configura variabili e confronto. Tutte le scelte restano salvate nell’URL."
                      : "Choose a guided question or configure variables and comparison. Every choice remains stored in the URL.")
                  : (language === "it"
                      ? "Esamina il risultato insieme a denominatore, diagnostica descrittiva, completezza e record sottostanti."
                      : "Inspect the result together with its denominator, descriptive diagnostics, completeness and underlying records.")}
            </p>
          </div>

          <nav className="analytics-workspace-index" aria-label={language === "it" ? "Indice della console di ricerca" : "Research console index"}>
            <button aria-current={workspaceStep === 1 ? "step" : undefined} className={workspaceStep === 1 ? "is-active" : workspaceStep > 1 ? "is-complete" : ""} onClick={() => changeWorkspaceStep(1)} type="button">
              <span>01</span>
              <strong>{language === "it" ? "Definisci la coorte" : "Define the cohort"}</strong>
              <small>{language === "it" ? "Periodo, causa, regione ed evidenza" : "Period, cause, region and evidence"}</small>
            </button>
            <button aria-current={workspaceStep === 2 ? "step" : undefined} className={workspaceStep === 2 ? "is-active" : workspaceStep > 2 ? "is-complete" : ""} onClick={() => changeWorkspaceStep(2)} type="button">
              <span>02</span>
              <strong>{language === "it" ? "Costruisci l’analisi" : "Build the analysis"}</strong>
              <small>{language === "it" ? "Preset, variabili e figura" : "Presets, variables and figure"}</small>
            </button>
            <button aria-current={workspaceStep === 3 ? "step" : undefined} className={workspaceStep === 3 ? "is-active" : ""} onClick={() => changeWorkspaceStep(3)} type="button">
              <span>03</span>
              <strong>{language === "it" ? "Verifica l’evidenza" : "Verify the evidence"}</strong>
              <small>{language === "it" ? "Completezza e record sottostanti" : "Completeness and underlying records"}</small>
            </button>
          </nav>

          <div className={`analytics-mobile-step-nav ${workspaceNavigationVisible ? "is-visible" : ""}`} aria-label={language === "it" ? "Navigazione fra gli step" : "Step navigation"}>
            {workspaceStep > 1 ? (
              <button className="is-back" onClick={() => changeWorkspaceStep(workspaceStep - 1)} type="button">
                <span aria-hidden="true">←</span>{language === "it" ? "Indietro" : "Back"}
              </button>
            ) : <span />}
            <strong>0{workspaceStep} / 03</strong>
            {workspaceStep < 3 ? (
              <button disabled={workspaceStep === 1 && (!validPeriod || loadState !== "available")} onClick={() => changeWorkspaceStep(workspaceStep + 1)} type="button">
                {workspaceStep === 1
                  ? (language === "it" ? "Analisi" : "Analysis")
                  : (language === "it" ? "Risultati" : "Results")}<span aria-hidden="true">→</span>
              </button>
            ) : <span />}
          </div>

          {workspaceStep === 1 && <div className="analytics-explorer-shell" id="analytics-cohort-builder">
            <div className="analytics-filter-cohort-heading">
              <span>{analysisMode === "comparison" ? (language === "it" ? "Coorte A" : "Cohort A") : (language === "it" ? "Definizione della coorte" : "Cohort definition")}</span>
              <strong>{analysisMode === "comparison" ? (language === "it" ? "Filtri della coorte di riferimento" : "Reference cohort filters") : (language === "it" ? "Costruisci il campione analitico" : "Build the analytical sample")}</strong>
            </div>
            <div className="analytics-filter-grid">
              <label>
                <span>{language === "it" ? "Periodo" : "Period"}</span>
                <select value={filters.period} onChange={(event) => updateFilter("period", event.target.value)}>
                  <option value="release">{language === "it" ? `Release completa (${releaseStart}–${releaseEnd})` : `Complete release (${releaseStart}–${releaseEnd})`}</option>
                  <option value="common">{language === "it" ? "Periodo del paper (2000–2022)" : "Paper period (2000–2022)"}</option>
                  <option value="custom">{language === "it" ? "Intervallo personalizzato" : "Custom range"}</option>
                </select>
              </label>

              <label>
                <span>{language === "it" ? "Causa" : "Cause"}</span>
                <select value={filters.cause} onChange={(event) => updateFilter("cause", event.target.value)}>
                  <option value="All">{language === "it" ? "Tutte le cause" : "All causes"}</option>
                  {filters.cause !== "All" && !filterOptions.causes.includes(filters.cause) && <option value={filters.cause}>{filters.cause}</option>}
                  {filterOptions.causes.map((value) => <option value={value} key={value}>{value}</option>)}
                </select>
              </label>

              <label>
                <span>{language === "it" ? "Regione" : "Region"}</span>
                <select value={filters.region} onChange={(event) => updateFilter("region", event.target.value)}>
                  <option value="All">{language === "it" ? "Tutte le regioni" : "All regions"}</option>
                  {filters.region !== "All" && !filterOptions.regions.includes(filters.region) && <option value={filters.region}>{filters.region}</option>}
                  {filterOptions.regions.map((value) => <option value={value} key={value}>{value}</option>)}
                </select>
              </label>

              <label>
                <span>{language === "it" ? "Severità" : "Severity"}</span>
                <select value={filters.severity} onChange={(event) => updateFilter("severity", event.target.value)}>
                  <option value="All">{language === "it" ? "Tutte le severità" : "All severities"}</option>
                  {filters.severity !== "All" && !filterOptions.severities.includes(filters.severity) && <option value={filters.severity}>{filters.severity}</option>}
                  {filterOptions.severities.map((value) => <option value={value} key={value}>{value}</option>)}
                </select>
              </label>

              <label>
                <span>{language === "it" ? "Evidenza della causa" : "Cause evidence"}</span>
                <select value={filters.evidence} onChange={(event) => updateFilter("evidence", event.target.value)}>
                  <option value="All">{language === "it" ? "Tutti i livelli" : "All levels"}</option>
                  {filters.evidence !== "All" && !filterOptions.evidence.includes(filters.evidence) && <option value={filters.evidence}>{filters.evidence}</option>}
                  {filterOptions.evidence.map((value) => <option value={value} key={value}>{value}</option>)}
                </select>
              </label>

              <div className="analytics-unit-control" aria-label={language === "it" ? "Unità di analisi" : "Unit of analysis"}>
                <span>{language === "it" ? "Unità di analisi" : "Unit of analysis"}</span>
                <strong>{language === "it" ? "Record documentati" : "Documented records"}</strong>
                <small>
                  {language === "it"
                    ? "Gli episodi multi-crollo supportati sono pubblicati come controllo di clustering, non come sostituti automatici dei record."
                    : "Supported multi-collapse episodes are published as a clustering control, not as automatic record replacements."}
                </small>
              </div>
            </div>

            {filters.period === "custom" && (
              <div className="analytics-custom-period">
                <label>
                  <span>{language === "it" ? "Dal" : "From"}</span>
                  <input type="number" min={releaseStart} max={releaseEnd} value={filters.yearFrom} onChange={(event) => updateFilter("yearFrom", event.target.value)} />
                </label>
                <label>
                  <span>{language === "it" ? "Al" : "To"}</span>
                  <input type="number" min={releaseStart} max={releaseEnd} value={filters.yearTo} onChange={(event) => updateFilter("yearTo", event.target.value)} />
                </label>
                {!validPeriod && <p>{language === "it" ? "L’anno iniziale deve precedere quello finale." : "The start year must precede the end year."}</p>}
              </div>
            )}

            <div className="analytics-filter-footer">
              <span>{activeFilterCount} {language === "it" ? "filtri attivi · stato conservato nell’URL" : "active filters · state retained in the URL"}</span>
              <button type="button" onClick={resetFilters}>{language === "it" ? "Azzera filtri" : "Reset filters"}</button>
            </div>
          </div>}

          <div className={`analytics-cohort-summary ${workspaceStep > 1 ? "is-compact" : ""}`} aria-live="polite">
            <div>
              <span>{language === "it" ? "Coorte corrente" : "Current cohort"}</span>
              <strong>{loadState === "available" ? formatValue(analytics.totalEvents) : "—"}</strong>
              <small>{language === "it" ? "record documentati" : "documented records"}</small>
            </div>
            <div>
              <span>{language === "it" ? "Fonti collegate" : "Linked sources"}</span>
              <strong>{loadState === "available" ? formatValue(analytics.totalSources) : "—"}</strong>
              <small>{analytics.eventsWithSources} / {analytics.totalEvents} {language === "it" ? "record con fonti" : "records with sources"}</small>
            </div>
            <div>
              <span>{language === "it" ? "Periodo applicato" : "Applied period"}</span>
              <strong>{validPeriod ? periodLabel : "—"}</strong>
              <small>{filters.period === "common" ? (language === "it" ? "comparabilità del paper" : "paper comparability") : (language === "it" ? "filtro della release" : "release filter")}</small>
            </div>
            <div>
              <span>{language === "it" ? "Precisione puntuale" : "Point precision"}</span>
              <strong>{percentage(analytics.exactLocations, analytics.totalEvents)}%</strong>
              <small>{analytics.exactLocations} / {analytics.totalEvents} {language === "it" ? "localizzazioni precise" : "exact locations"}</small>
            </div>
          </div>

          {analytics.totalEvents > 0 && analytics.totalEvents < 10 && (
            <p className="analytics-cohort-warning" role="status">
              {language === "it"
                ? `Coorte molto piccola (n=${analytics.totalEvents}): i conteggi restano consultabili, ma confronti percentuali e incroci devono essere interpretati con particolare cautela.`
                : `Very small cohort (n=${analytics.totalEvents}): counts remain available, but percentages and cross-tabulations require particular caution.`}
            </p>
          )}

          {workspaceStep === 1 && (
            <div className="analytics-workspace-actions is-forward">
              <p>{language === "it" ? "La coorte è pronta. Nel passaggio successivo puoi scegliere la domanda analitica e le variabili da rappresentare." : "The cohort is ready. In the next step you can choose the analytical question and variables to represent."}</p>
              <button disabled={!validPeriod || loadState !== "available"} onClick={() => changeWorkspaceStep(2)} type="button">
                {language === "it" ? "Continua all’analisi" : "Continue to analysis"}<span aria-hidden="true">→</span>
              </button>
            </div>
          )}

          {workspaceStep >= 2 && <section className={`analytics-chart-builder is-workspace-step-${workspaceStep}`} aria-labelledby="analytics-chart-builder-title">
            <div className="analytics-chart-builder-heading">
              <div>
                <span>ARCUS CHART BUILDER</span>
                <h3 id="analytics-chart-builder-title">
                  {language === "it" ? "Trasforma la coorte in una figura verificabile." : "Turn the cohort into a verifiable figure."}
                </h3>
                <p>
                  {language === "it"
                    ? "Il grafico usa gli stessi filtri della pagina. La metrica resta fissata ai record documentati; dati mancanti e denominatore non vengono nascosti."
                    : "The chart uses the same page filters. The metric remains fixed to documented records; missing data and the denominator are never hidden."}
                </p>
              </div>
              <div className="analytics-chart-contract">
                <span>{language === "it" ? "Contratto analitico" : "Analytical contract"}</span>
                <strong>{language === "it" ? "Conteggi osservati" : "Observed counts"}</strong>
                <small>{language === "it" ? "Nessuna normalizzazione o inferenza" : "No normalization or inference"}</small>
              </div>
            </div>

            <div className="analytics-analysis-path" role="tablist" aria-label={language === "it" ? "Modalità di costruzione dell’analisi" : "Analysis building mode"}>
              <button aria-selected={analysisPath === "guided"} className={analysisPath === "guided" ? "is-active" : ""} onClick={() => setAnalysisPath("guided")} role="tab" type="button">
                <span>01</span>
                <strong>{language === "it" ? "Domande guidate" : "Guided questions"}</strong>
                <small>{language === "it" ? "Preset dichiarati e riproducibili" : "Declared, reproducible presets"}</small>
              </button>
              <button aria-selected={analysisPath === "custom"} className={analysisPath === "custom" ? "is-active" : ""} onClick={() => setAnalysisPath("custom")} role="tab" type="button">
                <span>02</span>
                <strong>{language === "it" ? "Configurazione libera" : "Custom configuration"}</strong>
                <small>{language === "it" ? "Variabili, incroci e confronto A/B" : "Variables, cross-tabs and A/B comparison"}</small>
              </button>
            </div>

            {analysisPath === "guided" && <section className="analytics-research-presets" aria-labelledby="analytics-research-presets-title">
              <div className="analytics-research-presets-heading">
                <div>
                  <span>GUIDED RESEARCH QUERIES</span>
                  <h4 id="analytics-research-presets-title">
                    {language === "it" ? "Preset descrittivi, dichiarati e modificabili" : "Declared, editable descriptive presets"}
                  </h4>
                </div>
                <p>
                  {language === "it"
                    ? "Ogni preset formula una domanda riproducibile: applica filtri e variabili, senza attribuire significato inferenziale ai conteggi."
                    : "Each preset defines a reproducible question by applying filters and variables, without assigning inferential meaning to counts."}
                </p>
              </div>
              <div className="analytics-research-preset-grid">
                {RESEARCH_PRESETS.map((preset) => (
                  <button
                    aria-pressed={activePreset === preset.id}
                    className={activePreset === preset.id ? "is-active" : ""}
                    data-research-preset={preset.id}
                    key={preset.id}
                    onClick={() => applyResearchPreset(preset)}
                    type="button"
                  >
                    <span>{preset.analysisMode === "crosstab" ? "2 VAR" : preset.analysisMode === "comparison" ? "A / B" : "1 VAR"}</span>
                    <strong>{preset.title[language]}</strong>
                    <small>{preset.description[language]}</small>
                  </button>
                ))}
              </div>
              <p className="analytics-guided-path-note">
                {activePreset
                  ? (language === "it" ? "Preset applicato. Puoi generare i risultati oppure scegliere un’altra domanda." : "Preset applied. You can generate the results or choose another question.")
                  : (language === "it" ? "Seleziona una domanda. Senza preset, ARCUS mantiene la distribuzione predefinita per causa." : "Select a question. Without a preset, ARCUS retains the default distribution by cause.")}
              </p>
            </section>}

            {analysisPath === "custom" && <><fieldset className="analytics-analysis-mode">
              <legend>{language === "it" ? "Tipo di analisi" : "Analysis type"}</legend>
              <button
                aria-pressed={analysisMode === "distribution"}
                className={analysisMode === "distribution" ? "is-active" : ""}
                onClick={() => changeAnalysisMode("distribution")}
                type="button"
              >
                <strong>{language === "it" ? "Distribuzione" : "Distribution"}</strong>
                <small>{language === "it" ? "Una variabile, conteggi e quote" : "One variable, counts and shares"}</small>
              </button>
              <button
                aria-pressed={analysisMode === "crosstab"}
                className={analysisMode === "crosstab" ? "is-active" : ""}
                onClick={() => changeAnalysisMode("crosstab")}
                type="button"
              >
                <strong>{language === "it" ? "Tavola di contingenza" : "Contingency table"}</strong>
                  <small>{language === "it" ? "Incrocio descrittivo fra due variabili" : "Descriptive cross-tabulation of two variables"}</small>
                </button>
              <button
                aria-pressed={analysisMode === "comparison"}
                className={analysisMode === "comparison" ? "is-active" : ""}
                onClick={() => changeAnalysisMode("comparison")}
                type="button"
              >
                <strong>{language === "it" ? "Confronto A/B" : "A/B comparison"}</strong>
                <small>{language === "it" ? "Due coorti, quote e differenze descrittive" : "Two cohorts, shares and descriptive differences"}</small>
              </button>
            </fieldset>

            {analysisMode === "comparison" && (
              <section className="analytics-comparison-cohort" aria-label={language === "it" ? "Definizione coorte B" : "Cohort B definition"}>
                <div className="analytics-comparison-cohort-head">
                  <div>
                    <span>{language === "it" ? "Coorte B" : "Cohort B"}</span>
                    <strong>{language === "it" ? "Definisci il termine di confronto" : "Define the comparison cohort"}</strong>
                  </div>
                  <button onClick={copyCohortAToB} type="button">
                    {language === "it" ? "Copia impostazioni A" : "Copy cohort A settings"}
                  </button>
                </div>

                <div className="analytics-comparison-filter-grid">
                  <label>
                    <span>{language === "it" ? "Periodo B" : "Period B"}</span>
                    <select value={comparisonFilters.period} onChange={(event) => updateComparisonFilter("period", event.target.value)}>
                      <option value="release">{language === "it" ? `Release completa (${releaseStart}–${releaseEnd})` : `Complete release (${releaseStart}–${releaseEnd})`}</option>
                      <option value="common">{language === "it" ? "Periodo del paper (2000–2022)" : "Paper period (2000–2022)"}</option>
                      <option value="custom">{language === "it" ? "Intervallo personalizzato" : "Custom range"}</option>
                    </select>
                  </label>
                  <label>
                    <span>{language === "it" ? "Causa B" : "Cause B"}</span>
                    <select value={comparisonFilters.cause} onChange={(event) => updateComparisonFilter("cause", event.target.value)}>
                      <option value="All">{language === "it" ? "Tutte le cause" : "All causes"}</option>
                      {comparisonFilters.cause !== "All" && !filterOptions.causes.includes(comparisonFilters.cause) && <option value={comparisonFilters.cause}>{comparisonFilters.cause}</option>}
                      {filterOptions.causes.map((value) => <option value={value} key={value}>{value}</option>)}
                    </select>
                  </label>
                  <label>
                    <span>{language === "it" ? "Regione B" : "Region B"}</span>
                    <select value={comparisonFilters.region} onChange={(event) => updateComparisonFilter("region", event.target.value)}>
                      <option value="All">{language === "it" ? "Tutte le regioni" : "All regions"}</option>
                      {comparisonFilters.region !== "All" && !filterOptions.regions.includes(comparisonFilters.region) && <option value={comparisonFilters.region}>{comparisonFilters.region}</option>}
                      {filterOptions.regions.map((value) => <option value={value} key={value}>{value}</option>)}
                    </select>
                  </label>
                  <label>
                    <span>{language === "it" ? "Severità B" : "Severity B"}</span>
                    <select value={comparisonFilters.severity} onChange={(event) => updateComparisonFilter("severity", event.target.value)}>
                      <option value="All">{language === "it" ? "Tutte le severità" : "All severities"}</option>
                      {comparisonFilters.severity !== "All" && !filterOptions.severities.includes(comparisonFilters.severity) && <option value={comparisonFilters.severity}>{comparisonFilters.severity}</option>}
                      {filterOptions.severities.map((value) => <option value={value} key={value}>{value}</option>)}
                    </select>
                  </label>
                  <label>
                    <span>{language === "it" ? "Evidenza B" : "Evidence B"}</span>
                    <select value={comparisonFilters.evidence} onChange={(event) => updateComparisonFilter("evidence", event.target.value)}>
                      <option value="All">{language === "it" ? "Tutti i livelli" : "All levels"}</option>
                      {comparisonFilters.evidence !== "All" && !filterOptions.evidence.includes(comparisonFilters.evidence) && <option value={comparisonFilters.evidence}>{comparisonFilters.evidence}</option>}
                      {filterOptions.evidence.map((value) => <option value={value} key={value}>{value}</option>)}
                    </select>
                  </label>
                </div>

                {comparisonFilters.period === "custom" && (
                  <div className="analytics-custom-period analytics-comparison-period">
                    <label>
                      <span>{language === "it" ? "Dal B" : "From B"}</span>
                      <input type="number" min={releaseStart} max={releaseEnd} value={comparisonFilters.yearFrom} onChange={(event) => updateComparisonFilter("yearFrom", event.target.value)} />
                    </label>
                    <label>
                      <span>{language === "it" ? "Al B" : "To B"}</span>
                      <input type="number" min={releaseStart} max={releaseEnd} value={comparisonFilters.yearTo} onChange={(event) => updateComparisonFilter("yearTo", event.target.value)} />
                    </label>
                    {!validComparisonPeriod && <p>{language === "it" ? "L’anno iniziale B deve precedere quello finale." : "Cohort B start year must precede its end year."}</p>}
                  </div>
                )}

                <div className="analytics-comparison-summary">
                  <div><span>{language === "it" ? "Coorte A" : "Cohort A"}</span><strong>{formatValue(filteredEvents.length)}</strong><small>{analysisStart}–{analysisEnd}</small></div>
                  <div><span>{language === "it" ? "Coorte B" : "Cohort B"}</span><strong>{formatValue(comparisonEvents.length)}</strong><small>{comparisonStart}–{comparisonEnd}</small></div>
                  <div className={comparisonOverlap > 0 ? "is-overlapping" : ""}>
                    <span>{language === "it" ? "Record condivisi" : "Shared records"}</span>
                    <strong data-comparison-overlap>{formatValue(comparisonOverlap)}</strong>
                    <small>{comparisonOverlap > 0
                      ? (language === "it" ? "coorti non indipendenti" : "cohorts are not independent")
                      : (language === "it" ? "coorti disgiunte" : "disjoint cohorts")}</small>
                  </div>
                  <p>{language === "it" ? "Le differenze sono espresse in punti percentuali fra quote interne alle due coorti. Non sono rapporti di rischio." : "Differences are percentage-point differences between within-cohort shares. They are not risk ratios."}</p>
                </div>
              </section>
            )}

            <div className="analytics-chart-controls">
              <label>
                <span>{analysisMode === "crosstab" ? (language === "it" ? "Variabile di riga" : "Row variable") : analysisMode === "comparison" ? (language === "it" ? "Confronta per" : "Compare by") : (language === "it" ? "Raggruppa per" : "Group by")}</span>
                <select
                  className="analytics-chart-dimension"
                  value={validChartDimension}
                  onChange={(event) => updateChartDimension(event.target.value)}
                >
                  {chartDimensions.map((dimension) => (
                    <option key={dimension.key} value={dimension.key}>{dimension.label}</option>
                  ))}
                </select>
              </label>

              {analysisMode === "crosstab" ? (
                <label>
                  <span>{language === "it" ? "Variabile di colonna" : "Column variable"}</span>
                  <select
                    className="analytics-chart-column-dimension"
                    value={validColumnDimension}
                    onChange={(event) => {
                      setColumnDimension(event.target.value);
                      setSelectedSlice(null);
                      setActivePreset(null);
                    }}
                  >
                    {chartDimensions
                      .filter((dimension) => dimension.key !== validChartDimension)
                      .map((dimension) => (
                        <option key={dimension.key} value={dimension.key}>{dimension.label}</option>
                      ))}
                  </select>
                </label>
              ) : (
                <div className="analytics-chart-metric">
                  <span>{language === "it" ? "Metrica" : "Metric"}</span>
                  <strong>{language === "it" ? "Record documentati" : "Documented records"}</strong>
                  <small>{language === "it" ? "Unità non intercambiabile con il numero di fonti" : "Not interchangeable with source count"}</small>
                </div>
              )}

              {analysisMode !== "crosstab" ? (
                <fieldset className="analytics-chart-view">
                  <legend>{language === "it" ? "Vista" : "View"}</legend>
                  <button
                    aria-pressed={chartView === "bars"}
                    className={chartView === "bars" ? "is-active" : ""}
                    onClick={() => {
                      setChartView("bars");
                      setActivePreset(null);
                    }}
                    type="button"
                  >
                    {language === "it" ? "Barre" : "Bars"}
                  </button>
                  <button
                    aria-pressed={chartView === "table"}
                    className={chartView === "table" ? "is-active" : ""}
                    onClick={() => {
                      setChartView("table");
                      setActivePreset(null);
                    }}
                    type="button"
                  >
                    {language === "it" ? "Tabella" : "Table"}
                  </button>
                </fieldset>
              ) : (
                <div className="analytics-chart-metric">
                  <span>{language === "it" ? "Metrica nelle celle" : "Cell metric"}</span>
                  <strong>{language === "it" ? "Record documentati" : "Documented records"}</strong>
                  <small>{language === "it" ? "Conteggio e percentuale sulla riga" : "Count and row percentage"}</small>
                </div>
              )}
            </div></>}

            <section className="analytics-interpretation-checks" aria-label={language === "it" ? "Controlli di interpretazione" : "Interpretation checks"}>
              <div className="analytics-interpretation-checks-heading">
                <span>{language === "it" ? "Controlli di interpretazione" : "Interpretation checks"}</span>
                <small>{language === "it" ? "Controlli descrittivi, non un punteggio di qualità" : "Descriptive checks, not a quality score"}</small>
              </div>
              <div className="analytics-interpretation-check-grid">
                {interpretationChecks.map((check) => (
                  <article className={check.caution ? "is-caution" : ""} key={check.label}>
                    <span>{check.label}</span>
                    <strong>{check.value}</strong>
                    <small>{check.detail}</small>
                  </article>
                ))}
              </div>
            </section>

            {workspaceStep === 2 && (
              <div className="analytics-workspace-actions">
                <button className="is-back" onClick={() => changeWorkspaceStep(1)} type="button">
                  <span aria-hidden="true">←</span>{language === "it" ? "Modifica coorte" : "Edit cohort"}
                </button>
                <p>{language === "it" ? "La configurazione è pronta. Prosegui per esaminare figura, diagnostica, completezza e record sottostanti." : "The configuration is ready. Continue to inspect the figure, diagnostics, completeness and underlying records."}</p>
                <button onClick={() => changeWorkspaceStep(3)} type="button">
                  {language === "it" ? "Genera risultati" : "Generate results"}<span aria-hidden="true">→</span>
                </button>
              </div>
            )}

            <div className="analytics-chart-output">
              {workspaceStep === 3 && (
                <div className="analytics-results-intro">
                  <span>STEP 03 / RESEARCH OUTPUT</span>
                  <h3>{language === "it" ? "Esamina, verifica ed esporta." : "Inspect, verify and export."}</h3>
                  <p>{language === "it" ? "La figura è accompagnata da denominatore, controlli descrittivi e record che compongono il risultato." : "The figure is accompanied by its denominator, descriptive checks and the records behind the result."}</p>
                </div>
              )}
              <div className="analytics-chart-output-meta">
                <div>
                  <span>{language === "it" ? "Figura corrente" : "Current figure"}</span>
                  <h4>{analysisMode === "crosstab" ? crossTabTitle : analysisMode === "comparison" ? comparisonTitle : chartTitle}</h4>
                </div>
                <div className="analytics-chart-denominator">
                  <span>{analysisMode === "comparison" ? `nA=${formatValue(filteredEvents.length)} · nB=${formatValue(comparisonEvents.length)}` : `n=${formatValue(analytics.totalEvents)}`}</span>
                  <small>
                    {analysisMode === "comparison"
                      ? (language === "it" ? "Quote calcolate separatamente nelle due coorti" : "Shares calculated separately within each cohort")
                      : analysisMode === "crosstab"
                      ? (language === "it"
                          ? `Mancanti: riga ${formatValue(chartMissing)} · colonna ${formatValue(crossTabColumnMissing)}`
                          : `Missing: row ${formatValue(chartMissing)} · column ${formatValue(crossTabColumnMissing)}`)
                      : <>{formatValue(chartAvailable)} {language === "it" ? "disponibili" : "available"}{" · "}{formatValue(chartMissing)} {language === "it" ? "mancanti" : "missing"}</>}
                  </small>
                </div>
              </div>

              {(selectedChartDimension.definition || (analysisMode === "crosstab" && selectedColumnDimension.definition)) && (
                <p className="analytics-chart-dimension-definition">
                  <strong>{language === "it" ? "Definizione:" : "Definition:"}</strong>{" "}
                  {[selectedChartDimension.definition, analysisMode === "crosstab" ? selectedColumnDimension.definition : null].filter(Boolean).join(" · ")}
                </p>
              )}

              {analysisMode === "comparison" && chartView === "bars" ? (
                <AnalyticsComparisonChart
                  language={language}
                  onSelectRow={(row, cohort) => setSelectedSlice({ cohort, rowKey: row.key, rowLabel: row.label })}
                  rows={comparisonRows}
                  selectedSlice={selectedSlice}
                  svgRef={chartSvgRef}
                  title={comparisonTitle}
                />
              ) : analysisMode === "comparison" && comparisonRows.length > 0 ? (
                <div className="analytics-chart-table-wrap">
                  <table className="analytics-chart-table analytics-comparison-table">
                    <caption>{comparisonTitle}</caption>
                    <thead>
                      <tr>
                        <th scope="col">{selectedChartDimension.label}</th>
                        <th scope="col">A · n</th>
                        <th scope="col">A · %</th>
                        <th scope="col">B · n</th>
                        <th scope="col">B · %</th>
                        <th scope="col">Δ pp</th>
                      </tr>
                    </thead>
                    <tbody>
                      {comparisonRows.map((row) => (
                        <tr key={row.key}>
                          <th scope="row">{row.label}</th>
                          <td><button onClick={() => setSelectedSlice({ cohort: "A", rowKey: row.key, rowLabel: row.label })} type="button">{formatValue(row.a)}</button></td>
                          <td>{row.aShare}%</td>
                          <td><button onClick={() => setSelectedSlice({ cohort: "B", rowKey: row.key, rowLabel: row.label })} type="button">{formatValue(row.b)}</button></td>
                          <td>{row.bShare}%</td>
                          <td>{row.aShare - row.bShare > 0 ? "+" : ""}{row.aShare - row.bShare}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : analysisMode === "comparison" ? (
                <p className="analytics-chart-empty">
                  {language === "it" ? "Nessun dato confrontabile nelle coorti correnti." : "No comparable data in the current cohorts."}
                </p>
              ) : analysisMode === "crosstab" && crossTab.rows.length > 0 ? (
                <div className="analytics-chart-table-wrap analytics-crosstab-wrap">
                  <table className="analytics-chart-table analytics-crosstab">
                    <caption>{crossTabTitle}. n={analytics.totalEvents}</caption>
                    <thead>
                      <tr>
                        <th scope="col">{selectedChartDimension.label}</th>
                        {crossTab.columns.map((column) => <th scope="col" key={column.key}>{column.label}</th>)}
                        <th scope="col">{language === "it" ? "Totale riga" : "Row total"}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {crossTab.rows.map((row) => (
                        <tr data-crosstab-row={row.key} key={row.key}>
                          <th scope="row">{row.label}</th>
                          {crossTab.columns.map((column) => {
                            const value = row.columns.get(column.key) || 0;
                            const strength = value / crossTabMax;
                            return (
                              <td key={column.key} style={{ backgroundColor: `rgba(196, 144, 64, ${0.025 + strength * 0.36})` }}>
                                <button
                                  data-chart-value={value}
                                  onClick={() => setSelectedSlice({
                                    cohort: "A",
                                    columnKey: column.key,
                                    columnLabel: column.label,
                                    rowKey: row.key,
                                    rowLabel: row.label,
                                  })}
                                  type="button"
                                >
                                  <strong>{formatValue(value)}</strong>
                                  <small>{percentage(value, row.total)}%</small>
                                </button>
                              </td>
                            );
                          })}
                          <td className="analytics-crosstab-total">{formatValue(row.total)}</td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr>
                        <th scope="row">{language === "it" ? "Totale colonna" : "Column total"}</th>
                        {crossTab.columns.map((column) => <td key={column.key}>{formatValue(column.total)}</td>)}
                        <td>{formatValue(analytics.totalEvents)}</td>
                      </tr>
                    </tfoot>
                  </table>
                  <p className="analytics-crosstab-note">
                    {language === "it"
                      ? `${crossTabNonZeroCells} celle non vuote su ${crossTabCellCount} (${crossTabDensity}%). Le percentuali mostrate nelle celle sono calcolate sul totale della rispettiva riga.`
                      : `${crossTabNonZeroCells} non-empty cells out of ${crossTabCellCount} (${crossTabDensity}%). Cell percentages use the corresponding row total as denominator.`}
                  </p>
                </div>
              ) : analysisMode === "crosstab" ? (
                <p className="analytics-chart-empty">
                  {language === "it"
                    ? "Nessun dato rappresentabile per la coorte corrente. Una selezione vuota non equivale a rischio nullo."
                    : "No data can be charted for the current cohort. An empty selection does not mean zero risk."}
                </p>
              ) : chartView === "bars" ? (
                <AnalyticsResearchChart
                  language={language}
                  onSelectRow={(row) => setSelectedSlice({ cohort: "A", rowKey: row.key, rowLabel: row.label })}
                  rows={chartRows}
                  selectedKey={selectedSlice?.cohort === "A" ? selectedSlice.rowKey : null}
                  svgRef={chartSvgRef}
                  title={chartTitle}
                  total={analytics.totalEvents}
                />
              ) : chartRows.length > 0 ? (
                <div className="analytics-chart-table-wrap">
                  <table className="analytics-chart-table">
                    <caption>{chartTitle}. n={analytics.totalEvents}</caption>
                    <thead>
                      <tr>
                        <th scope="col">{selectedChartDimension.label}</th>
                        <th scope="col">{language === "it" ? "Record" : "Records"}</th>
                        <th scope="col">{language === "it" ? "Quota della coorte" : "Cohort share"}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {chartRows.map((row) => (
                        <tr data-chart-value={row.value} key={row.key}>
                          <th scope="row"><button onClick={() => setSelectedSlice({ cohort: "A", rowKey: row.key, rowLabel: row.label })} type="button">{row.label}</button></th>
                          <td>{formatValue(row.value)}</td>
                          <td>{percentage(row.value, analytics.totalEvents)}%</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="analytics-chart-empty">
                  {language === "it"
                    ? "Nessun dato rappresentabile per la coorte corrente. Una selezione vuota non equivale a rischio nullo."
                    : "No data can be charted for the current cohort. An empty selection does not mean zero risk."}
                </p>
              )}

              {temporalSensitivity && hasAnalyticalOutput && (
                <details className="analytics-temporal-sensitivity analytics-result-disclosure" aria-labelledby="analytics-temporal-sensitivity-title">
                  <summary className="analytics-temporal-sensitivity-heading">
                    <div>
                      <span>CLUSTERING SENSITIVITY</span>
                      <h5 id="analytics-temporal-sensitivity-title">
                        {language === "it" ? "Record e date documentate distinte" : "Records and distinct documented dates"}
                      </h5>
                    </div>
                    <strong data-temporal-total-dates>{temporalSensitivity.totalDistinctDates} {language === "it" ? "date" : "dates"}</strong>
                  </summary>
                  <div className="analytics-chart-table-wrap">
                    <table className="analytics-chart-table analytics-temporal-table">
                      <thead>
                        <tr>
                          <th scope="col">{selectedChartDimension.label}</th>
                          <th scope="col">{language === "it" ? "Record" : "Records"}</th>
                          <th scope="col">%</th>
                          <th scope="col">{language === "it" ? "Date distinte" : "Distinct dates"}</th>
                          <th scope="col">%</th>
                          <th scope="col">{language === "it" ? "Max stessa data" : "Max same date"}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {temporalSensitivity.rows.map((row) => (
                          <tr data-temporal-row={row.key} key={row.key}>
                            <th scope="row">{row.label}</th>
                            <td>{row.records}</td>
                            <td>{row.recordShare}%</td>
                            <td>{row.distinctDates}</td>
                            <td>{row.distinctDateShare}%</td>
                            <td>{row.maxRecordsSameDate}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <p>
                    {language === "it"
                      ? "La seconda lettura riduce l’effetto di più ponti registrati nella stessa giornata. È una sensibilità al clustering: una data distinta non viene interpretata come episodio idraulico indipendente."
                      : "The second reading reduces the effect of multiple bridges recorded on the same day. It is a clustering sensitivity: a distinct date is not interpreted as an independent hydraulic episode."}
                  </p>
                </details>
              )}

              {sharedEpisodeSensitivity && hasAnalyticalOutput && (
                <details className="analytics-shared-episodes analytics-result-disclosure" open>
                  <summary className="analytics-shared-episodes-heading">
                    <div>
                      <span>DOCUMENTED EPISODE CONTROL</span>
                      <h5>
                        {language === "it"
                          ? "Crolli riconducibili allo stesso episodio"
                          : "Collapses linked to the same episode"}
                      </h5>
                    </div>
                    <strong data-shared-episode-count>
                      {sharedEpisodeSensitivity.episodeCount} {language === "it" ? "episodi" : "episodes"}
                    </strong>
                  </summary>
                  <div className="analytics-shared-episodes-metrics">
                    <div>
                      <span>{language === "it" ? "Record raggruppati" : "Grouped records"}</span>
                      <strong>{sharedEpisodeSensitivity.groupedRecords}</strong>
                    </div>
                    <div>
                      <span>{language === "it" ? "Unità dopo il controllo" : "Units after control"}</span>
                      <strong>{sharedEpisodeSensitivity.collapsedUnitCount}</strong>
                    </div>
                    <div>
                      <span>{language === "it" ? "Gruppo più esteso" : "Largest group"}</span>
                      <strong>{sharedEpisodeSensitivity.largestEpisode}</strong>
                    </div>
                  </div>
                  <div className="analytics-shared-episode-list">
                    {sharedEpisodeSensitivity.rows.map((episode) => (
                      <article data-episode-type={episode.episode_type} key={episode.episode_id}>
                        <div>
                          <span>
                            {episode.episode_type === "flood"
                              ? (language === "it" ? "Alluvione" : "Flood")
                              : episode.episode_type === "earthquake"
                                ? (language === "it" ? "Sisma" : "Earthquake")
                                : episode.episode_type === "landslide"
                                  ? (language === "it" ? "Frana" : "Landslide")
                                  : (language === "it" ? "Evento naturale" : "Natural hazard")}
                          </span>
                          <strong>{formatEpisodeDate(episode.date_start, language)}</strong>
                          <small>{episode.regions.join(" · ")}</small>
                        </div>
                        <b>{episode.cohort_event_count} {language === "it" ? "record" : "records"}</b>
                      </article>
                    ))}
                  </div>
                  <p>
                    {language === "it"
                      ? `Nella coorte selezionata i ${filteredEvents.length} record corrispondono a ${sharedEpisodeSensitivity.collapsedUnitCount} unità se ciascun episodio pubblicato viene contato una sola volta. È una lettura di sensibilità: il raggruppamento è limitato a episodi multi-crollo supportati da fonti condivise o da registri curati e non dimostra uno stesso meccanismo strutturale.`
                      : `In the selected cohort, ${filteredEvents.length} records correspond to ${sharedEpisodeSensitivity.collapsedUnitCount} units when each published episode is counted once. This is a sensitivity reading: grouping is limited to multi-collapse episodes supported by shared sources or curated registries and does not demonstrate an identical structural mechanism.`}
                  </p>
                </details>
              )}

              {hasAnalyticalOutput && (
                <details className="analytics-advanced-diagnostics analytics-result-disclosure" aria-labelledby="analytics-advanced-diagnostics-title">
                  <summary className="analytics-advanced-diagnostics-heading">
                    <div>
                      <span>ADVANCED DESCRIPTIVE DIAGNOSTICS</span>
                      <h5 id="analytics-advanced-diagnostics-title">
                        {analysisMode === "comparison"
                          ? (language === "it" ? "Quanto differiscono le distribuzioni osservate" : "How the observed distributions differ")
                          : analysisMode === "crosstab"
                            ? (language === "it" ? "Struttura dell’associazione osservata" : "Structure of the observed association")
                            : (language === "it" ? "Concentrazione e profondità documentale" : "Concentration and documentary depth")}
                      </h5>
                    </div>
                    <p>
                      {language === "it"
                        ? "Misure calcolate sui record della release. ARCUS non applica soglie qualitative, p-value o inferenze sulla popolazione dei ponti."
                        : "Measures calculated on release records. ARCUS applies no qualitative thresholds, p-values or inference to the bridge population."}
                    </p>
                  </summary>
                  <div className="analytics-advanced-diagnostic-grid">
                    {advancedDiagnostics.map((diagnostic) => (
                      <article className={diagnostic.caution ? "is-caution" : ""} data-diagnostic={diagnostic.key} key={diagnostic.key}>
                        <span>{diagnostic.label}</span>
                        <strong>{diagnostic.value}</strong>
                        <code>{diagnostic.formula}</code>
                        <small>{diagnostic.detail}</small>
                      </article>
                    ))}
                  </div>
                  <p className="analytics-advanced-diagnostics-note">
                    {analysisMode === "comparison"
                      ? (language === "it" ? "Jensen–Shannon e variazione totale valgono 0 per distribuzioni identiche e tendono a 1 al crescere della separazione." : "Jensen–Shannon and total variation equal 0 for identical distributions and approach 1 as separation increases.")
                      : analysisMode === "crosstab"
                        ? (language === "it" ? "La V di Cramér varia fra 0 e 1. Le celle attese piccole sono dichiarate perché rendono fragile qualsiasi lettura inferenziale, che qui non viene eseguita." : "Cramér’s V ranges from 0 to 1. Small expected cells are disclosed because they weaken inferential readings, which are not performed here.")
                        : (language === "it" ? "L’entropia normalizzata vale 0 per massima concentrazione e 1 per distribuzione uniforme; le categorie mancanti restano escluse dal calcolo." : "Normalized entropy equals 0 at maximum concentration and 1 for a uniform distribution; missing categories remain excluded from the calculation.")}
                  </p>
                </details>
              )}

              {hasAnalyticalOutput && (
                <aside className="analytics-figure-caption">
                  <div>
                    <span>{language === "it" ? "Didascalia verificabile" : "Verifiable caption"}</span>
                    <strong>{language === "it" ? "Sintesi descrittiva pronta per figura o appendice" : "Descriptive summary ready for a figure or appendix"}</strong>
                  </div>
                  <p data-figure-caption>{figureCaption}</p>
                  <div>
                    <button onClick={copyFigureCaption} type="button">
                      {captionState === "copied"
                        ? (language === "it" ? "Copiata" : "Copied")
                        : (language === "it" ? "Copia testo" : "Copy text")}
                    </button>
                    <button onClick={downloadFigureCaption} type="button">
                      {language === "it" ? "Scarica TXT" : "Download TXT"}
                    </button>
                  </div>
                  {captionState === "error" && (
                    <small role="alert">{language === "it" ? "Il browser non consente la copia: usa il download TXT." : "The browser blocked copying: use the TXT download."}</small>
                  )}
                </aside>
              )}

              <div className="analytics-chart-actions">
                <button disabled={analysisMode === "crosstab" || chartView !== "bars" || !hasAnalyticalOutput} onClick={downloadChart} type="button">
                  {language === "it" ? "Scarica figura SVG" : "Download SVG figure"}
                </button>
                <button disabled={!hasAnalyticalOutput} onClick={downloadChartData} type="button">
                  {language === "it" ? "Scarica dati CSV" : "Download CSV data"}
                </button>
                <button disabled={!hasAnalyticalOutput} onClick={downloadChartManifest} type="button">
                  {language === "it" ? "Scarica manifest query" : "Download query manifest"}
                </button>
                <button
                  className="analytics-package-download"
                  data-package-state={packageState}
                  disabled={!hasAnalyticalOutput || packageState === "preparing"}
                  onClick={downloadResearchPackage}
                  type="button"
                >
                  {packageState === "preparing"
                    ? (language === "it" ? "Preparo il pacchetto…" : "Preparing package…")
                    : (language === "it" ? "Scarica Research Package" : "Download Research Package")}
                </button>
                <p>
                  {language === "it"
                    ? "Il pacchetto ZIP riunisce manifest, aggregati, record, fonti, citazione, checksum e — quando disponibile — figura SVG."
                    : "The ZIP package combines the manifest, aggregates, records, sources, citation, checksums and—when available—the SVG figure."}
                </p>
              </div>
              {packageState === "error" && (
                <p className="analytics-package-error" role="alert">
                  {language === "it" ? "Impossibile generare il pacchetto nel browser. I download singoli restano disponibili." : "The browser could not generate the package. Individual downloads remain available."}
                </p>
              )}
            </div>
          </section>}

          {workspaceStep === 3 && <div className="analytics-explorer-detail-grid" id="analytics-evidence-panels">
            <details className="analytics-panel analytics-result-disclosure">
              <summary className="analytics-panel-heading">
                <div>
                  <span>{language === "it" ? "Completezza" : "Completeness"}</span>
                  <h3>{language === "it" ? "Copertura dei campi nella coorte" : "Field coverage in the cohort"}</h3>
                </div>
                <b>n={analytics.totalEvents}</b>
              </summary>
              <AnalyticsCoverageList fields={analytics.coverageFields} language={language} />
            </details>

            <details className="analytics-panel analytics-documentary-basis analytics-result-disclosure">
              <summary className="analytics-panel-heading">
                <div>
                  <span>{language === "it" ? "Base documentale" : "Documentary basis"}</span>
                  <h3>{language === "it" ? "Provenienza delle fonti nella coorte" : "Source provenance in the cohort"}</h3>
                </div>
                <b>n={formatValue(analytics.totalSources)}</b>
              </summary>
              <div className="analytics-source-role-grid">
                {[
                  ["official", language === "it" ? "Ufficiali / tecniche" : "Official / technical"],
                  ["scientific", language === "it" ? "Scientifiche" : "Scientific"],
                  ["news", language === "it" ? "Notizie" : "News"],
                  ["other", language === "it" ? "Altre" : "Other"],
                ].map(([role, label]) => (
                  <article key={role}>
                    <span>{label}</span>
                    <strong>{formatValue(sourceDepthA.roleCounts[role])}</strong>
                    <small>{percentage(sourceDepthA.roleCounts[role], analytics.totalSources)}% {language === "it" ? "delle fonti" : "of sources"}</small>
                  </article>
                ))}
              </div>
              <div className="analytics-source-event-coverage">
                <div>
                  <span>{language === "it" ? "Record con fonte ufficiale / tecnica" : "Records with official / technical source"}</span>
                  <strong>{sourceDepthA.eventCoverage.official}/{analytics.totalEvents}</strong>
                  <b>{percentage(sourceDepthA.eventCoverage.official, analytics.totalEvents)}%</b>
                </div>
                <div>
                  <span>{language === "it" ? "Record con fonte scientifica" : "Records with scientific source"}</span>
                  <strong>{sourceDepthA.eventCoverage.scientific}/{analytics.totalEvents}</strong>
                  <b>{percentage(sourceDepthA.eventCoverage.scientific, analytics.totalEvents)}%</b>
                </div>
                <div>
                  <span>{language === "it" ? "Record senza fonti collegate" : "Records without linked sources"}</span>
                  <strong>{sourceDepthA.eventCoverage.noSources}/{analytics.totalEvents}</strong>
                  <b>{percentage(sourceDepthA.eventCoverage.noSources, analytics.totalEvents)}%</b>
                </div>
              </div>
              <p className="analytics-source-boundary">
                {language === "it"
                  ? "Le categorie descrivono la provenienza editoriale. Il numero di fonti non misura indipendenza, affidabilità o certezza causale e non viene trasformato in un punteggio."
                  : "Categories describe editorial provenance. Source counts do not measure independence, reliability or causal certainty and are not converted into a score."}
              </p>
            </details>

            <details className="analytics-panel analytics-cohort-records analytics-result-disclosure is-wide">
              <summary className="analytics-panel-heading">
                <div>
                  <span>ARCUS ATLAS</span>
                  <h3>{selectedSliceLabel || (language === "it" ? "Record che compongono il risultato" : "Records behind the result")}</h3>
                </div>
                <div className="analytics-record-result-meta">
                  <b data-record-total>{formatValue(selectedSliceEvents.length)}</b>
                  {selectedSlice && (
                    <button onClick={() => setSelectedSlice(null)} type="button">
                      {language === "it" ? "Mostra intera coorte" : "Show full cohort"}
                    </button>
                  )}
                </div>
              </summary>
              {recordPreview.length > 0 ? (
                <div className="analytics-record-links">
                  {recordPreview.map((event) => (
                    <Link to={`/atlas?event=${encodeURIComponent(event.event_slug)}`} key={event.event_id}>
                      <span>{event.event_id}</span>
                      <strong>{event.bridge_name || event.bridge_crossing_name || event.municipality || event.province}</strong>
                      <small>{extractYear(event.date)} · {event.region} · {event.specific_cause}</small>
                    </Link>
                  ))}
                  {selectedSliceEvents.length > recordPreview.length && (
                    <p>
                      +{formatValue(selectedSliceEvents.length - recordPreview.length)} {selectedSlice
                        ? (language === "it" ? "record nel risultato selezionato" : "records in the selected result")
                        : (language === "it" ? "record nella coorte" : "records in the cohort")}
                    </p>
                  )}
                </div>
              ) : (
                <p>{language === "it" ? "Nessun record soddisfa questa combinazione. Modifica i filtri: ARCUS non converte una coorte vuota in uno zero di rischio." : "No records match this combination. Change the filters: ARCUS does not convert an empty cohort into zero risk."}</p>
              )}
            </details>
          </div>}

          {workspaceStep === 3 && (
            <div className="analytics-workspace-actions is-results">
              <button className="is-back" onClick={() => changeWorkspaceStep(2)} type="button">
                <span aria-hidden="true">←</span>{language === "it" ? "Modifica analisi" : "Edit analysis"}
              </button>
              <p>{language === "it" ? "Filtri, analisi e vista restano salvati nell’URL: puoi tornare ai passaggi precedenti senza perdere il lavoro." : "Filters, analysis and view remain stored in the URL: you can return to previous steps without losing your work."}</p>
            </div>
          )}

          {workspaceStep === 3 && <p className="analytics-cohort-boundary">
            {language === "it"
              ? "La coorte descrive i collassi documentati in ARCUS. Non rappresenta il parco ponti italiano e non costituisce una stima di rischio, frequenza o probabilità di collasso."
              : "The cohort describes collapses documented in ARCUS. It does not represent the Italian bridge inventory and is not an estimate of collapse risk, frequency or probability."}
          </p>}
        </div>
      </section>

      <section className="analytics-research-boundary">
        <div className="analytics-container analytics-research-boundary-inner">
          <div>
            <span>ARCUS OPEN RESEARCH PROTOCOL</span>
            <h2>
              {language === "it"
                ? "Risultati leggibili solo insieme a fonti, completezza e limiti."
                : "Results must be read together with sources, completeness and limitations."}
            </h2>
            <p>
              {language === "it"
                ? "La console descrive i record documentati nella release ARCUS. Non rappresenta il parco ponti italiano e non produce stime di rischio, probabilità di collasso o prevalenza nazionale."
                : "The console describes records documented in the ARCUS release. It does not represent the Italian bridge inventory or estimate collapse risk, probability or national prevalence."}
            </p>
          </div>
          <div className="analytics-research-boundary-meta">
            <div>
              <span>{language === "it" ? "Release citabile" : "Citable release"}</span>
              <strong>{manifest?.version || "—"}</strong>
            </div>
            <div className="analytics-hero-actions">
              <Link className="analytics-secondary-link" to="/data-access">
                {language === "it" ? "Dati e download" : "Data and downloads"}
              </Link>
              <Link className="analytics-secondary-link" to="/methodology">
                {language === "it" ? "Protocollo metodologico" : "Method protocol"}
              </Link>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </main>
  );
}

export default AnalyticsPage;
