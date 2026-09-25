import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import { chromium } from "playwright";

// Uses the real local catalogue. Only the explicitly named failure scenarios
// intercept requests; external tiles are observed but not required by assertions.
const base = process.env.ARCUS_TEST_BASE_URL || "http://127.0.0.1:5173";
const output = path.resolve("outputs/atlas-acceptance");
await fs.mkdir(output, { recursive: true });
const browser = await chromium.launch({ headless: true });
const checks = [];
const screenshots = [];
const failures = [];
const externalFailures = new Set();
let completed = false;
const events = (await (await fetch(`${base}/api/open/events`)).json()).events;
const byId = (id) => events.find((event) => event.event_id === id);

async function waitFor(check, label) {
  for (let attempt = 0; attempt < 80; attempt++) {
    if (await check()) return;
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  throw new Error(`Timed out: ${label}`);
}
async function screenshot(page, name) {
  await page.evaluate(() => document.fonts.ready);
  if (!(await page.locator(".arcus-event-dossier").count())) {
    await waitFor(() => page.locator(".leaflet-tile").evaluateAll((tiles) =>
      tiles.length > 0 && tiles.every((tile) => tile.complete) && tiles.some((tile) => tile.naturalWidth > 0)
    ), "Map tiles loaded for screenshot");
  }
  const file = path.join(output, `${name}.png`);
  await page.screenshot({ path: file, fullPage: true });
  screenshots.push(file);
}
async function openDossier(page, event) {
  await page.goto(`${base}/atlas?event=${event.event_slug}`);
  await page.getByRole("button", { name: /Apri scheda completa/ }).click();
  await page.waitForURL(`**/atlas/events/${event.event_slug}`);
  await page.locator(".arcus-event-dossier.is-page").waitFor();
}
async function assertVisibleSelectedMarker(page) {
  await waitFor(async () => {
    const marker = await page.locator(".arcus-marker-icon.is-selected").boundingBox();
    const preview = await page.locator(".atlas-event-preview").boundingBox();
    if (!marker || !preview) return false;
    const viewport = page.viewportSize();
    const x = marker.x + marker.width / 2;
    const y = marker.y + marker.height / 2;
    return x > 0 && x < viewport.width && y > 0 && y < viewport.height &&
      !(x >= preview.x && x <= preview.x + preview.width && y >= preview.y && y <= preview.y + preview.height);
  }, "Selected marker is in view and not covered by preview");
}
async function noHorizontalOverflow(page) {
  const dimensions = await page.evaluate(() => ({
    viewport: innerWidth,
    document: document.documentElement.scrollWidth,
    dialog: document.querySelector(".arcus-event-dossier")?.getBoundingClientRect().toJSON(),
    content: document.querySelector(".arcus-event-dossier-content") && {
      width: document.querySelector(".arcus-event-dossier-content").clientWidth,
      scroll: document.querySelector(".arcus-event-dossier-content").scrollWidth,
    },
  }));
  assert.ok(dimensions.document <= dimensions.viewport + 1, JSON.stringify(dimensions));
  if (dimensions.dialog) {
    assert.ok(dimensions.dialog.left >= -1 && dimensions.dialog.right <= dimensions.viewport + 1, JSON.stringify(dimensions));
    assert.ok(dimensions.content.scroll <= dimensions.content.width + 1, JSON.stringify(dimensions));
  }
}

try {
  const context = await browser.newContext({ viewport: { width: 1280, height: 800 }, locale: "it-IT" });
  const deterministicMapTile = await fs.readFile(
    path.resolve("public/data/map-tiles/voyager/7/64/44.png")
  );
  await context.route(
    /https:\/\/server\.arcgisonline\.com\/ArcGIS\/rest\/services\/World_Street_Map\/MapServer\/tile\//,
    (route) => route.fulfill({
      body: deterministicMapTile,
      contentType: "image/png",
      status: 200,
    })
  );
  await context.addInitScript(() => localStorage.setItem("arcus-language", "it"));
  const page = await context.newPage();
  page.on("pageerror", (error) => failures.push(error.message));
  page.on("requestfailed", (request) => {
    const url = request.url();
    const error = request.failure()?.errorText || "request failed";
    if (error === "net::ERR_ABORTED") return; // cancelled navigation/StrictMode effect
    if (url.startsWith(base)) failures.push(`${error} ${url}`);
    else externalFailures.add(`${error} ${new URL(url).hostname}`);
  });
  page.on("response", (response) => {
    if (response.status() >= 400) {
      const url = response.url();
      if (url.startsWith(base)) failures.push(`${response.status()} ${url}`);
      else externalFailures.add(`${response.status()} ${new URL(url).hostname}`);
    }
  });
  const contextRequests = new Map();
  page.on("request", (request) => {
    const url = new URL(request.url());
    if (url.pathname.startsWith("/data/event-context/") || url.pathname.startsWith("/data/event-media/")) {
      contextRequests.set(url.pathname, (contextRequests.get(url.pathname) || 0) + 1);
    }
  });
  await page.goto(`${base}/atlas`);
  await page.locator(".atlas-command-grid strong").first().filter({ hasText: String(events.length) }).waitFor();
  assert.equal(contextRequests.size, 0, "Map alone does not download dossier contexts");
  await screenshot(page, "desktop-overview");
  await page.getByRole("button", { name: /Ricerca e download/ }).click();
  const csvDownload = page.waitForEvent("download");
  await page.getByRole("button", { name: "CSV della selezione" }).click();
  const csv = await csvDownload;
  assert.match(csv.suggestedFilename(), /\.csv$/);
  checks.push("Overview, collapsible tools and selection CSV download");

  const event = byId("IT18.10.03");
  await page.getByRole("button", { name: "Apri controlli Atlas" }).click();
  await page.getByLabel("Ricerca archivio", { exact: true }).fill(event.event_id);
  await page.locator(".atlas-sidebar-result-list button").filter({ hasText: event.event_id }).click();
  await page.getByRole("button", { name: /Apri scheda completa/ }).waitFor();
  await page.locator(".arcus-marker-icon.is-selected").waitFor();
  await assertVisibleSelectedMarker(page);
  assert.equal(contextRequests.size, 0, "Marker preview defers dossier data");
  await page.getByRole("button", { name: /Apri scheda completa/ }).click();
  await page.waitForURL(`**/atlas/events/${event.event_slug}`);
  const dialog = page.locator(".arcus-event-dossier.is-page");
  await dialog.waitFor();
  const sharedEpisode = dialog.locator(".arcus-event-shared-episode");
  await sharedEpisode.waitFor();
  assert.match(await sharedEpisode.innerText(), /Episodio alluvionale[\s\S]*5 crolli/i);
  assert.match(await sharedEpisode.innerText(), /Fonti documentali condivise/i);
  await sharedEpisode.locator("summary").click();
  assert.equal(await sharedEpisode.locator(".arcus-event-shared-episode-list a").count(), 4);
  await screenshot(page, "desktop-shared-episode");
  await dialog.getByRole("tab", { name: "Contesto", exact: true }).click();
  await dialog.getByRole("button", { name: /Contesto idraulico attuale/ }).click();
  await dialog.getByText("Contesto territoriale attuale", { exact: true }).waitFor();
  assert.equal(await dialog.locator(".arcus-event-territorial-grid article").count(), 1);
  assert.equal(await dialog.locator(".arcus-event-causal-separation > div").count(), 3);
  assert.match(await dialog.locator(".arcus-event-causal-separation").innerText(), /Causa documentata[\s\S]*Idraulica[\s\S]*Nesso causale automatico[\s\S]*Non inferito/i);
  assert.match(await dialog.locator(".arcus-event-territorial").innerText(), /Classe P2[\s\S]*P1, P2[\s\S]*Classe più elevata rilevata: P2/i);
  assert.doesNotMatch(await dialog.locator(".arcus-event-territorial").innerText(), /Classi variate|Classi invariate/);
  await waitFor(async () => (await dialog.getByRole("tab", { name: "Immagini", exact: true }).count()) === 0, "Empty media tab removed");
  await noHorizontalOverflow(page);
  await screenshot(page, "desktop-territorial");
  await dialog.getByRole("tab", { name: "Ponte", exact: true }).click();
  await dialog.getByRole("heading", { name: "Il ponte documentato" }).waitFor();
  await dialog.getByRole("tab", { name: /Fonti e qualità/ }).click();
  await dialog.getByText("Copertura del record", { exact: true }).waitFor();
  assert.equal(await dialog.locator(".arcus-event-record-coverage-grid article").count(), 4);
  assert.match(await dialog.locator(".arcus-event-citable-identity").innerText(), new RegExp(event.event_id.replaceAll(".", "\\.")));
  assert.match(await dialog.locator(".arcus-event-citable-identity").innerText(), /arcus-open-2026\.8/);
  await screenshot(page, "desktop-research-quality");
  const download = page.waitForEvent("download");
  await dialog.getByRole("button", { name: /Esporta record e fonti/ }).click();
  const dossierDownload = await download;
  const dossier = JSON.parse(await fs.readFile(await dossierDownload.path(), "utf8"));
  assert.equal(dossier.event.event_id, event.event_id);
  assert.ok(dossier.sources.length > 0);
  assert.ok(dossier.permalink.endsWith(`/atlas/events/${event.event_slug}`));
  assert.equal(dossier.schema_version, "arcus-open-event-dossier-v3");
  assert.equal(dossier.shared_episode.event_count, 5);
  assert.equal(dossier.shared_episode.episode_type, "flood");
  assert.equal(dossier.research_metadata.completeness.groups.length, 4);
  assert.equal(
    Object.values(dossier.research_metadata.documentary_basis.source_composition)
      .reduce((total, value) => total + value, 0),
    dossier.sources.length
  );
  await page.getByRole("link", { name: /Torna all.At[l]?ante/i }).click();
  await page.waitForURL(`**/atlas?event=${event.event_slug}`);
  await page.getByRole("button", { name: /Apri scheda completa/ }).waitFor();
  await assertVisibleSelectedMarker(page);
  const tileZoom = () => page.locator(".leaflet-tile").evaluateAll((tiles) => Math.max(...tiles.map((tile) => Number(tile.src.match(/\/tile\/(\d+)/)?.[1] || 0))));
  const zoomBefore = await tileZoom();
  await page.getByRole("button", { name: "Zoom in", exact: true }).click();
  await waitFor(async () => (await tileZoom()) > zoomBefore, "User zoom changes displayed tile level");
  await page.waitForTimeout(700);
  const userZoom = await tileZoom();
  await page.getByRole("button", { name: "Apri controlli Atlas", exact: true }).click();
  await page.waitForTimeout(700);
  await page.getByRole("button", { name: "Chiudi controlli Atlas", exact: true }).click();
  await page.waitForTimeout(700);
  assert.equal(await tileZoom(), userZoom, "Sidebar changes preserve user zoom for the selected bridge");
  checks.push("Returned Atlas selection and user zoom preserved while toggling sidebar");
  checks.push("Sidebar selection, highlighted marker, dedicated record URL, cause-relevant context, bridge/sources tabs, JSON identity and return to Atlas");

  // Change to another distant bridge within the same SPA: the index files must be shared.
  const second = byId("IT13.02.01");
  const sidebarToggle = page.getByRole("button", { name: "Apri controlli Atlas" });
  if (await sidebarToggle.count()) await sidebarToggle.click();
  await page.getByLabel("Ricerca archivio", { exact: true }).fill(second.event_id);
  await page.locator(".atlas-sidebar-result-list button").filter({ hasText: second.event_id }).click();
  await page.locator(".arcus-event-card").filter({ hasText: second.event_id }).waitFor();
  await page.getByRole("button", { name: /Apri scheda completa/ }).click();
  await page.waitForURL(`**/atlas/events/${second.event_slug}`);
  await page.locator(".arcus-event-dossier.is-page").waitFor();
  await page.getByRole("tab", { name: "Contesto", exact: true }).click();
  await page.getByRole("button", { name: /Contesto idraulico attuale/ }).click();
  await page.getByText("Contesto territoriale attuale", { exact: true }).waitFor();
  for (const [url, count] of contextRequests) {
    if (url.endsWith("index.json")) assert.equal(count, 1, `Catalogue reused: ${url}`);
  }
  checks.push("Different hydraulic event reuses the relevant parsed context catalogues");

  for (const [name, width, height] of [["tablet", 768, 1024], ["mobile", 390, 844], ["small-mobile", 360, 640]]) {
    await page.setViewportSize({ width, height });
    await page.goto(`${base}/atlas`);
    await page.locator(".leaflet-marker-icon").first().waitFor();
    await page.getByRole("button", { name: /Ricerca e download/ }).waitFor();
    await noHorizontalOverflow(page);
    // Let Leaflet complete layout and tile fade before evidence capture.
    await page.waitForTimeout(1000);
    await screenshot(page, `${name}-overview`);
    await page.goto(`${base}/atlas?event=${event.event_slug}`);
    await page.getByRole("button", { name: /Apri scheda completa/ }).waitFor();
    await assertVisibleSelectedMarker(page);
    await screenshot(page, `${name}-selection`);
    await page.getByRole("button", { name: /Apri scheda completa/ }).click();
    await page.waitForURL(`**/atlas/events/${event.event_slug}`);
    await page.locator(".arcus-event-dossier.is-page").waitFor();
    await page.locator(".arcus-event-shared-episode").waitFor();
    await noHorizontalOverflow(page);
    await screenshot(page, `${name}-shared-episode`);
    await page.getByRole("tab", { name: "Contesto", exact: true }).click();
    await page.getByRole("button", { name: /Contesto idraulico attuale/ }).click();
    await page.getByText("Contesto territoriale attuale", { exact: true }).waitFor();
    assert.equal(await page.locator(".arcus-event-territorial-grid article").count(), 1);
    await noHorizontalOverflow(page);
    await screenshot(page, `${name}-territorial`);
    await page.getByRole("tab", { name: /Fonti e qualità/ }).click();
    await page.getByText("Copertura del record", { exact: true }).waitFor();
    await noHorizontalOverflow(page);
    await screenshot(page, `${name}-research-quality`);
    checks.push(`${name} (${width}×${height}): overview, shared episode, cause-relevant context, research quality and no horizontal overflow`);
  }

  const reviewEvent = byId("IT00.10.23");
  await page.setViewportSize({ width: 1280, height: 800 });
  await openDossier(page, reviewEvent);
  await page.getByText("Record in verifica", { exact: true }).waitFor();
  await page.getByRole("button", { name: /Leggi di più/ }).click();
  assert.ok(!(await page.locator(".arcus-event-dossier.is-page .arcus-event-description").innerText()).includes("B00.10.22"));
  checks.push("Review status precedes disputed narrative; legacy reference is displayed as IT00.10.22");

  const landslideEvent = byId("IT15.04.01");
  await openDossier(page, landslideEvent);
  await page.getByRole("tab", { name: "Contesto", exact: true }).click();
  await page.getByText("Livello informativo pertinente alla causa documentata", { exact: true }).waitFor();
  assert.equal(await page.locator(".arcus-event-territorial-grid article").count(), 1);
  assert.match(await page.locator(".arcus-event-territorial-grid article").innerText(), /Pericolosità da frana/i);
  assert.match(await page.locator(".arcus-event-territorial").innerText(), /Classe P2[\s\S]*Classi ufficiali rilevate al punto: P2/i);
  assert.doesNotMatch(await page.locator(".arcus-event-territorial").innerText(), /Pericolosità idraulica|Pericolosità sismica/i);
  checks.push("Landslide dossier exposes only cause-relevant context and publishes the current official PAI class");

  const materialEvent = byId("IT11.05.01");
  await openDossier(page, materialEvent);
  assert.equal(await page.getByRole("tab", { name: "Contesto", exact: true }).count(), 0);
  await waitFor(async () => (await page.getByRole("tab", { name: "Immagini", exact: true }).count()) === 0, "Empty material-event media tab removed");
  checks.push("Non-environmental collapse dossier does not expose unrelated hazard context");

  const sourceOnlyMediaEvent = byId("IT13.10.01");
  await openDossier(page, sourceOnlyMediaEvent);
  await waitFor(
    async () => (await page.getByRole("tab", { name: "Immagini", exact: true }).count()) === 0,
    "Source-only media does not create an Images tab"
  );
  checks.push("Source-only visual references remain outside the image surface");

  const stratifiedExpectations = [
    ["Earthquake", true, /Pericolosità sismica/i],
    ["Impact", false, null],
    ["Design and Construction", false, null],
    ["Overload", false, null],
    ["Fire and Explosion", false, null],
  ];
  for (const [cause, expectsContext, expectedCopy] of stratifiedExpectations) {
    const sample = events.find((candidate) => candidate.specific_cause === cause);
    assert.ok(sample, `Missing stratified Atlas sample for ${cause}`);
    await openDossier(page, sample);
    const contextTab = page.getByRole("tab", { name: "Contesto", exact: true });
    assert.equal(await contextTab.count(), expectsContext ? 1 : 0, `${cause} context-tab relevance`);
    if (expectsContext) {
      await contextTab.click();
      await page.getByText("Livello informativo pertinente alla causa documentata", { exact: true }).waitFor();
      assert.equal(await page.locator(".arcus-event-territorial-grid article").count(), 1);
      assert.match(await page.locator(".arcus-event-territorial-grid article").innerText(), expectedCopy);
      assert.match(await page.locator(".arcus-event-causal-separation").innerText(), /Non inferito/i);
      if (cause === "Earthquake") {
        const seismicText = await page.locator(".arcus-event-territorial-grid article").innerText();
        assert.match(seismicText, /\d\.\d{3} g/);
        assert.doesNotMatch(seismicText, /(?:^|\n)Classe\s+[A-Z0-9]/i);
        assert.match(seismicText, /non una classe sismica inventata da ARCUS/i);
      }
    }
  }
  checks.push("Cause-stratified dossier audit covers all eight ARCUS cause families");

  // Controlled network failure: retains the tab, explains failure, then recovers.
  const errorPage = await context.newPage();
  let blockTerritorial = true;
  await errorPage.route("**/data/event-context/territorial/index.json", (route) => blockTerritorial
    ? route.fulfill({ status: 503, body: "Controlled acceptance-test failure" })
    : route.continue());
  await openDossier(errorPage, event);
  await errorPage.getByRole("tab", { name: "Contesto", exact: true }).click();
  await errorPage.getByRole("button", { name: /Contesto idraulico attuale/ }).click();
  await errorPage.getByText("Caricamento non riuscito", { exact: true }).waitFor();
  await screenshot(errorPage, "controlled-failure-retry");
  blockTerritorial = false;
  await errorPage.getByRole("button", { name: "Riprova", exact: true }).click();
  await errorPage.getByRole("heading", { name: "Livello informativo pertinente alla causa documentata" }).waitFor();
  checks.push("Controlled territorial HTTP 503: explicit error, retry and recovery with real local data");

  let blockEventApi = true;
  let blockStaticEvents = false;
  await errorPage.route("**/api/open/events", (route) => blockEventApi
    ? route.fulfill({ status: 503, body: "Controlled acceptance-test failure" })
    : route.continue());
  await errorPage.route("**/api/open/sources", (route) => blockEventApi
    ? route.fulfill({ status: 503, body: "Controlled acceptance-test failure" })
    : route.continue());
  await errorPage.route("**/data/open-release/events.json", (route) => blockStaticEvents
    ? route.fulfill({ status: 503, body: "Controlled acceptance-test failure" })
    : route.continue());
  await errorPage.goto(`${base}/atlas`);
  await waitFor(async () => (await errorPage.locator(".atlas-command-grid strong").first().innerText()) === String(events.length), "static event fallback");
  checks.push("Controlled event API HTTP 503: static Open release fallback preserves the real map count");

  blockStaticEvents = true;
  await errorPage.goto(`${base}/atlas`);
  await errorPage.getByText("Caricamento incompleto: eventi.", { exact: true }).waitFor();
  assert.equal(await errorPage.locator(".atlas-command-grid strong").first().innerText(), "—");
  blockEventApi = false;
  blockStaticEvents = false;
  await errorPage.getByRole("button", { name: "Riprova", exact: true }).click();
  await waitFor(async () => (await errorPage.locator(".atlas-command-grid strong").first().innerText()) === String(events.length), "event API recovery");
  checks.push("Controlled API and fallback failure: no misleading zero count, retry and recovery");

  blockEventApi = true;
  await errorPage.setViewportSize({ width: 390, height: 844 });
  await errorPage.goto(`${base}/`);
  const homeMetrics = errorPage.locator(".home-metric strong");
  await homeMetrics.nth(0).getByText(String(events.length), { exact: true }).waitFor();
  const expectedSourceCount = String((await (await fetch(`${base}/api/open/sources`)).json()).sources.length);
  await waitFor(async () => (await homeMetrics.nth(1).innerText()) === expectedSourceCount, "mobile home source metric animation");
  assert.equal(await homeMetrics.nth(1).innerText(), expectedSourceCount);
  assert.notEqual(await homeMetrics.nth(0).innerText(), "0");
  checks.push("Mobile home: API failure falls back to the public release and never presents unloaded data as zero");
  await errorPage.close();
  assert.deepEqual(failures, [], "No unexpected local HTTP failures or uncaught browser errors");
  completed = true;
  console.log(JSON.stringify({ status: "passed", checks, screenshots, externalFailures: [...externalFailures] }, null, 2));
} finally {
  await fs.writeFile(path.join(output, "results.json"), JSON.stringify({ status: completed ? "passed" : "failed", checks, screenshots, failures, externalFailures: [...externalFailures] }, null, 2));
  await browser.close();
}
