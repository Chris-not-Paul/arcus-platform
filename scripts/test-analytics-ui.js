import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import AdmZip from "adm-zip";
import { chromium } from "playwright";

const base = process.env.ARCUS_TEST_BASE_URL || "http://127.0.0.1:5173";
const events = (await (await fetch(`${base}/api/open/events`)).json()).events;
const sources = (await (await fetch(`${base}/api/open/sources`)).json()).sources;
const commonHydraulic = events.filter((event) => {
  const year = Number(String(event.date || "").slice(0, 4));
  return year >= 2000 && year <= 2022 && event.specific_cause === "Hydraulic";
});
const commonHydraulicIds = new Set(commonHydraulic.map((event) => event.event_id));
const commonHydraulicSources = sources.filter((source) => commonHydraulicIds.has(source.event_id));
const hydraulicEvents = events.filter((event) => event.specific_cause === "Hydraulic");
const hydraulicSeasonCounts = hydraulicEvents.reduce((counts, event) => {
  const month = Number(String(event.date || "").slice(5, 7));
  const season = [12, 1, 2].includes(month) ? "Inverno"
    : [3, 4, 5].includes(month) ? "Primavera"
      : [6, 7, 8].includes(month) ? "Estate"
        : month >= 9 && month <= 11 ? "Autunno" : "Non documentato";
  counts.set(season, (counts.get(season) || 0) + 1);
  return counts;
}, new Map());
const hydraulicSeasonDates = hydraulicEvents.reduce((dates, event) => {
  const month = Number(String(event.date || "").slice(5, 7));
  const season = [12, 1, 2].includes(month) ? "winter"
    : [3, 4, 5].includes(month) ? "spring"
      : [6, 7, 8].includes(month) ? "summer" : "autumn";
  if (!dates.has(season)) dates.set(season, new Set());
  dates.get(season).add(event.date);
  return dates;
}, new Map());
const hydraulicDistinctDates = new Set(hydraulicEvents.map((event) => event.date));
const commonEvents = events.filter((event) => {
  const year = Number(String(event.date || "").slice(0, 4));
  return year >= 2000 && year <= 2022;
});
const commonCauses = [...new Set(commonEvents.map((event) => event.specific_cause).filter(Boolean))];
const commonRegions = [...new Set(commonEvents.map((event) => event.region).filter(Boolean))];
const regionCounts = [...events.reduce((counts, event) => {
  if (event.region) counts.set(event.region, (counts.get(event.region) || 0) + 1);
  return counts;
}, new Map()).values()];
const regionTotal = regionCounts.reduce((total, value) => total + value, 0);
const regionEntropy = -regionCounts.reduce((sum, value) => {
  const share = value / regionTotal;
  return sum + share * Math.log(share);
}, 0) / Math.log(regionCounts.length);
const emptyPair = commonCauses
  .flatMap((cause) => commonRegions.map((region) => ({ cause, region })))
  .find(({ cause, region }) => !commonEvents.some((event) => event.specific_cause === cause && event.region === region));

const browser = await chromium.launch({ headless: true });

try {
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  await page.addInitScript(() => localStorage.setItem("arcus-language", "it"));
  await page.goto(`${base}/analytics`);

  const goToWorkspaceStep = async (step) => {
    await page.locator(".analytics-workspace-index button").nth(step - 1).click();
    await page.locator(".analytics-workspace-index button").nth(step - 1).getAttribute("aria-current").then((value) => {
      assert.equal(value, "step");
    });
  };

  await page.locator(".analytics-filter-grid select").first().waitFor();
  await page.locator(".analytics-hero-pro-preview").getByText(new RegExp(`${events.length} eventi e ${sources.length} fonti`)).waitFor();
  const releaseCardText = await page.locator(".analytics-hero-pro-preview").innerText();
  assert.match(releaseCardText, new RegExp(`${events.length} eventi e ${sources.length} fonti`));
  const selects = page.locator(".analytics-filter-grid select");
  await selects.nth(0).selectOption("common");
  await selects.nth(1).selectOption("Hydraulic");

  await page.waitForURL(/period=common.*cause=Hydraulic/);
  const cohortStats = page.locator(".analytics-cohort-summary > div");
  assert.equal(await cohortStats.nth(0).locator("strong").innerText(), String(commonHydraulic.length));
  assert.equal(await cohortStats.nth(1).locator("strong").innerText(), String(commonHydraulicSources.length));
  assert.equal(await cohortStats.nth(2).locator("strong").innerText(), "2000-2022");
  const preservedUrl = page.url();
  await page.reload();
  assert.equal(page.url(), preservedUrl);
  await cohortStats.nth(0).locator("strong").getByText(String(commonHydraulic.length), { exact: true }).waitFor();
  assert.equal(await selects.nth(0).inputValue(), "common");
  assert.equal(await selects.nth(1).inputValue(), "Hydraulic");
  assert.equal(await cohortStats.nth(0).locator("strong").innerText(), String(commonHydraulic.length));

  await goToWorkspaceStep(3);
  assert.match(await page.locator(".analytics-cohort-boundary").innerText(), /non costituisce una stima di rischio/i);
  await page.locator(".analytics-explorer-detail-grid details").nth(0).locator("summary").click();
  await page.locator(".analytics-explorer-detail-grid details").nth(1).locator("summary").click();
  const constructionCoverage = page.locator(".analytics-coverage-row").filter({ hasText: "Anno di costruzione" });
  assert.match(await constructionCoverage.innerText(), /mancanti/);
  assert.ok(await page.locator(".analytics-record-links a").count() > 0);

  await goToWorkspaceStep(2);
  const chartBuilder = page.locator(".analytics-chart-builder");
  await chartBuilder.getByText("Trasforma la coorte in una figura verificabile.").waitFor();
  assert.equal(
    await chartBuilder.locator(".analytics-research-chart > rect").first().getAttribute("fill"),
    "#ffffff"
  );
  assert.match(await chartBuilder.innerText(), /record documentati/i);
  assert.match(await chartBuilder.innerText(), /nessuna normalizzazione o inferenza/i);
  const initialChartTotal = await chartBuilder.locator("[data-chart-value]").evaluateAll((rows) => (
    rows.reduce((total, row) => total + Number(row.getAttribute("data-chart-value")), 0)
  ));
  assert.equal(initialChartTotal, commonHydraulic.length);

  const seasonalityPreset = chartBuilder.locator('[data-research-preset="hydraulic-seasonality"]');
  await seasonalityPreset.click();
  await page.waitForURL(/cause=Hydraulic.*group=season/);
  assert.equal(await seasonalityPreset.getAttribute("aria-pressed"), "true");
  assert.equal(await cohortStats.nth(0).locator("strong").innerText(), String(hydraulicEvents.length));
  await goToWorkspaceStep(3);
  await chartBuilder.locator(".analytics-temporal-sensitivity > summary").click();
  const seasonLabels = await chartBuilder.locator('.analytics-research-chart g[role="button"] > text:first-of-type').allTextContents();
  assert.deepEqual(seasonLabels, ["Inverno", "Primavera", "Estate", "Autunno"].filter((season) => hydraulicSeasonCounts.has(season)));
  const seasonTotal = await chartBuilder.locator("[data-chart-value]").evaluateAll((rows) => rows.reduce(
    (total, row) => total + Number(row.getAttribute("data-chart-value")), 0
  ));
  assert.equal(seasonTotal, hydraulicEvents.length);
  assert.match(await chartBuilder.locator(".analytics-chart-dimension-definition").innerText(), /inverno dic–feb/i);
  const autumnSensitivity = chartBuilder.locator('[data-temporal-row="autumn"]');
  assert.equal(Number(await autumnSensitivity.locator("td").nth(0).innerText()), hydraulicSeasonCounts.get("Autunno"));
  assert.equal(Number(await autumnSensitivity.locator("td").nth(2).innerText()), hydraulicSeasonDates.get("autumn").size);
  assert.match(await chartBuilder.locator("[data-temporal-total-dates]").innerText(), new RegExp(`^${hydraulicDistinctDates.size} date`, "i"));
  assert.match(await chartBuilder.locator("[data-figure-caption]").innerText(), new RegExp(`${hydraulicSeasonDates.get("autumn").size}/${hydraulicDistinctDates.size} date`));

  const seasonManifestPromise = page.waitForEvent("download");
  await chartBuilder.getByRole("button", { name: "Scarica manifest query" }).click();
  const seasonManifestDownload = await seasonManifestPromise;
  const seasonManifest = JSON.parse(await readFile(await seasonManifestDownload.path(), "utf8"));
  assert.equal(seasonManifest.chart.dimension, "season");
  assert.match(seasonManifest.chart.dimension_definition, /inverno dic–feb/i);
  assert.equal(seasonManifest.temporal_sensitivity.total_distinct_dates, hydraulicDistinctDates.size);
  assert.equal(seasonManifest.temporal_sensitivity.independent_episode_claim, false);

  await goToWorkspaceStep(2);
  const hydraulicPreset = chartBuilder.locator('[data-research-preset="hydraulic-common-trend"]');
  await hydraulicPreset.click();
  await page.waitForURL(/period=common.*cause=Hydraulic.*group=year/);
  assert.equal(await hydraulicPreset.getAttribute("aria-pressed"), "true");
  assert.equal(await cohortStats.nth(0).locator("strong").innerText(), String(commonHydraulic.length));

  assert.ok(emptyPair, "Expected at least one empty cause-region pair in the common period");
  await goToWorkspaceStep(1);
  await selects.nth(1).selectOption(emptyPair.cause);
  await selects.nth(2).selectOption(emptyPair.region);
  assert.equal(await cohortStats.nth(0).locator("strong").innerText(), "0");
  await goToWorkspaceStep(3);
  await page.locator(".analytics-cohort-records > summary").click();
  assert.match(await page.locator(".analytics-cohort-records").innerText(), /non converte una coorte vuota in uno zero di rischio/i);
  assert.ok(await page.locator(".analytics-chart-empty").count() >= 1);

  await goToWorkspaceStep(1);
  await page.getByRole("button", { name: "Azzera filtri" }).click();
  assert.equal(await cohortStats.nth(0).locator("strong").innerText(), String(events.length));
  assert.equal(new URL(page.url()).searchParams.has("cause"), false);
  assert.equal(new URL(page.url()).searchParams.has("period"), false);
  assert.equal(new URL(page.url()).searchParams.get("group"), "year");

  await goToWorkspaceStep(2);
  await chartBuilder.getByRole("tab", { name: /Configurazione libera/ }).click();
  const dimensionSelect = chartBuilder.locator(".analytics-chart-dimension");
  await dimensionSelect.selectOption("region");
  await chartBuilder.getByRole("button", { name: "Tabella" }).click();
  await page.waitForURL(/group=region.*view=table/);
  await goToWorkspaceStep(3);
  const tableTotal = await chartBuilder.locator(".analytics-chart-table tbody [data-chart-value]").evaluateAll((rows) => (
    rows.reduce((total, row) => total + Number(row.getAttribute("data-chart-value")), 0)
  ));
  assert.equal(tableTotal, events.length);

  const csvDownloadPromise = page.waitForEvent("download");
  await chartBuilder.getByRole("button", { name: "Scarica dati CSV" }).click();
  const csvDownload = await csvDownloadPromise;
  const csv = await readFile(await csvDownload.path(), "utf8");
  assert.match(csv, /"Regione","Records","Share of cohort \(%\)","Missing"/);

  const manifestDownloadPromise = page.waitForEvent("download");
  await chartBuilder.getByRole("button", { name: "Scarica manifest query" }).click();
  const manifestDownload = await manifestDownloadPromise;
  const chartManifest = JSON.parse(await readFile(await manifestDownload.path(), "utf8"));
  assert.equal(chartManifest.chart.dimension, "region");
  assert.equal(chartManifest.chart.metric, "documented_records");
  assert.equal(chartManifest.denominators.records, events.length);
  assert.equal(chartManifest.groups.reduce((total, group) => total + group.records, 0), events.length);
  assert.ok(chartManifest.limitations.some((value) => /not estimates of collapse risk/i.test(value)));
  assert.equal(chartManifest.advanced_diagnostics.scope, "descriptive_only");
  assert.equal(chartManifest.advanced_diagnostics.distribution.normalizedEntropy, Number(regionEntropy.toFixed(3)));
  await chartBuilder.locator(".analytics-advanced-diagnostics").evaluate((details) => { details.open = true; });
  assert.equal(Number(await chartBuilder.locator('[data-diagnostic="normalized_entropy"] strong').innerText()), Number(regionEntropy.toFixed(3)));

  await goToWorkspaceStep(2);
  await chartBuilder.getByRole("button", { name: "Barre" }).click();
  await goToWorkspaceStep(3);
  const svgDownloadPromise = page.waitForEvent("download");
  await chartBuilder.getByRole("button", { name: "Scarica figura SVG" }).click();
  const svgDownload = await svgDownloadPromise;
  const svg = await readFile(await svgDownload.path(), "utf8");
  assert.match(svg, /<svg/);
  assert.match(svg, /Distribuzione per regione/);
  const figureCaption = await chartBuilder.locator("[data-figure-caption]").innerText();
  assert.match(figureCaption, /Distribuzione per regione/i);
  assert.match(figureCaption, new RegExp(`n=${events.length}`));
  assert.match(figureCaption, /non rappresentano rischio, probabilità o prevalenza nazionale/i);
  assert.equal(await chartBuilder.locator(".analytics-interpretation-check-grid article").count(), 4);

  const packageDownloadPromise = page.waitForEvent("download");
  await chartBuilder.getByRole("button", { name: "Scarica Research Package" }).click();
  const packageDownload = await packageDownloadPromise;
  const archive = new AdmZip(await packageDownload.path());
  const archiveNames = archive.getEntries().map((entry) => entry.entryName).sort();
  assert.deepEqual(archiveNames, ["README.md", "aggregate.csv", "citation.txt", "figure-caption.txt", "figure.svg", "manifest.json", "records.csv", "sources.csv"]);
  const packageManifest = JSON.parse(archive.readAsText("manifest.json"));
  assert.equal(packageManifest.package.format, "ARCUS Open Research Package 1.0");
  assert.equal(packageManifest.package.records_included, events.length);
  assert.equal(packageManifest.package.files.length, 7);
  assert.ok(packageManifest.package.files.every((file) => /^[a-f0-9]{64}$/.test(file.sha256)));
  assert.match(archive.readAsText("README.md"), /must not be used as estimates of collapse risk/i);
  assert.equal(archive.readAsText("figure-caption.txt").trim(), figureCaption);

  await goToWorkspaceStep(2);
  await chartBuilder.getByRole("button", { name: /Tavola di contingenza/ }).click();
  await page.waitForURL(/group=region.*analysis=crosstab/);
  await goToWorkspaceStep(3);
  const crossTabCellsTotal = await chartBuilder.locator(".analytics-crosstab tbody [data-chart-value]").evaluateAll((cells) => (
    cells.reduce((total, cell) => total + Number(cell.getAttribute("data-chart-value")), 0)
  ));
  assert.equal(crossTabCellsTotal, events.length);
  assert.match(await chartBuilder.locator(".analytics-chart-output-meta h4").innerText(), /Regione × Severità/);

  const firstNonZeroCell = chartBuilder.locator('.analytics-crosstab tbody [data-chart-value]:not([data-chart-value="0"])').first();
  const selectedCellCount = Number(await firstNonZeroCell.getAttribute("data-chart-value"));
  await firstNonZeroCell.click();
  assert.equal(Number(await page.locator("[data-record-total]").innerText()), selectedCellCount);
  await page.locator(".analytics-cohort-records > summary").click();
  await page.getByRole("button", { name: "Mostra intera coorte" }).click();
  assert.equal(Number(await page.locator("[data-record-total]").innerText()), events.length);

  const crossManifestDownloadPromise = page.waitForEvent("download");
  await chartBuilder.getByRole("button", { name: "Scarica manifest query" }).click();
  const crossManifestDownload = await crossManifestDownloadPromise;
  const crossManifest = JSON.parse(await readFile(await crossManifestDownload.path(), "utf8"));
  assert.equal(crossManifest.chart.analysis_mode, "crosstab");
  assert.equal(crossManifest.chart.dimension, "region");
  assert.equal(crossManifest.chart.column_dimension, "collapse_severity");
  assert.equal(crossManifest.contingency_table.rows.reduce((total, row) => total + row.total, 0), events.length);
  assert.ok(crossManifest.advanced_diagnostics.contingency.cramersV >= 0 && crossManifest.advanced_diagnostics.contingency.cramersV <= 1);
  assert.equal(crossManifest.advanced_diagnostics.contingency.hypothesis_test_performed, false);
  await chartBuilder.locator(".analytics-advanced-diagnostics").evaluate((details) => { details.open = true; });
  assert.match(await chartBuilder.locator('[data-diagnostic="cramers_v"] code').innerText(), /χ²/);

  const crossCsvDownloadPromise = page.waitForEvent("download");
  await chartBuilder.getByRole("button", { name: "Scarica dati CSV" }).click();
  const crossCsvDownload = await crossCsvDownloadPromise;
  const crossCsv = await readFile(await crossCsvDownload.path(), "utf8");
  assert.match(crossCsv, /^"Regione","TC","PC","Total"/);

  const chartUrl = page.url();
  await page.reload();
  assert.equal(page.url(), chartUrl);
  assert.equal(await dimensionSelect.inputValue(), "region");
  assert.equal(await chartBuilder.getByRole("button", { name: /Tavola di contingenza/, includeHidden: true }).getAttribute("aria-pressed"), "true");

  await goToWorkspaceStep(2);
  await chartBuilder.getByRole("button", { name: /Confronto A\/B/ }).click();
  await dimensionSelect.selectOption("specific_cause");
  const comparisonSelects = chartBuilder.locator(".analytics-comparison-filter-grid select");
  await comparisonSelects.nth(1).selectOption("Hydraulic");
  await page.waitForURL(/analysis=comparison.*bcause=Hydraulic/);
  await goToWorkspaceStep(3);
  const cohortATotal = await chartBuilder.locator('[data-cohort="A"]').evaluateAll((bars) => (
    bars.reduce((total, bar) => total + Number(bar.getAttribute("data-chart-value")), 0)
  ));
  const cohortBTotal = await chartBuilder.locator('[data-cohort="B"]').evaluateAll((bars) => (
    bars.reduce((total, bar) => total + Number(bar.getAttribute("data-chart-value")), 0)
  ));
  assert.equal(cohortATotal, events.length);
  assert.equal(cohortBTotal, hydraulicEvents.length);
  assert.equal(Number(await chartBuilder.locator("[data-comparison-overlap]").innerText()), hydraulicEvents.length);

  const hydraulicBBar = chartBuilder.locator(`[data-cohort="B"][data-chart-value="${hydraulicEvents.length}"]`);
  await hydraulicBBar.click();
  assert.equal(Number(await page.locator("[data-record-total]").innerText()), hydraulicEvents.length);

  const comparisonManifestPromise = page.waitForEvent("download");
  await chartBuilder.getByRole("button", { name: "Scarica manifest query" }).click();
  const comparisonManifestDownload = await comparisonManifestPromise;
  const comparisonManifest = JSON.parse(await readFile(await comparisonManifestDownload.path(), "utf8"));
  assert.equal(comparisonManifest.chart.analysis_mode, "comparison");
  assert.equal(comparisonManifest.comparison_query.cause, "Hydraulic");
  assert.equal(comparisonManifest.denominators.comparison_records, hydraulicEvents.length);
  assert.equal(comparisonManifest.denominators.shared_records, hydraulicEvents.length);
  assert.match(comparisonManifest.limitations.join(" "), /must not be interpreted as independent samples/);
  assert.ok(comparisonManifest.advanced_diagnostics.comparison.jensenShannon >= 0 && comparisonManifest.advanced_diagnostics.comparison.jensenShannon <= 1);
  assert.ok(comparisonManifest.advanced_diagnostics.comparison.totalVariation >= 0 && comparisonManifest.advanced_diagnostics.comparison.totalVariation <= 1);
  assert.equal(comparisonManifest.advanced_diagnostics.comparison.cohorts_independent, false);

  const comparisonUrl = page.url();
  await page.reload();
  assert.equal(page.url(), comparisonUrl);
  assert.equal(await comparisonSelects.nth(1).inputValue(), "Hydraulic");
  assert.equal(await chartBuilder.getByRole("button", { name: /Confronto A\/B/, includeHidden: true }).getAttribute("aria-pressed"), "true");

  await page.setViewportSize({ width: 390, height: 844 });
  const dimensions = await page.evaluate(() => ({
    document: document.documentElement.scrollWidth,
    viewport: innerWidth,
  }));
  assert.ok(dimensions.document <= dimensions.viewport + 1, JSON.stringify(dimensions));

  console.log(JSON.stringify({
    checks: [
      "release totals",
      "common-period hydraulic cohort",
      "cohort-linked source denominator",
      "URL persistence after reload",
      "missingness disclosure",
      "Atlas record links",
      "controlled chart dimension and denominator",
      "guided research preset",
      "meteorological season derivation and ordering",
      "distinct-date clustering sensitivity",
      "chart values reconcile with cohort",
      "query manifest download",
      "CSV data download",
      "SVG figure download",
      "dynamic verifiable figure caption",
      "interpretation checks",
      "entropy and documentary-depth diagnostics",
      "checksummed ZIP research package",
      "two-variable contingency table",
      "Cramer's V with sparsity diagnostics",
      "cross-tab totals reconcile with cohort",
      "cell-to-record drill-down",
      "two-cohort A/B comparison",
      "Jensen-Shannon and total-variation diagnostics",
      "comparison totals reconcile independently",
      "comparison manifest and URL persistence",
      "chart URL persistence",
      "empty cohort is not presented as zero risk",
      "filter reset",
      "mobile horizontal overflow",
      "progressive three-step workspace and URL persistence",
    ],
    commonHydraulicEvents: commonHydraulic.length,
    commonHydraulicSources: commonHydraulicSources.length,
    status: "passed",
  }, null, 2));
} finally {
  await browser.close();
}
