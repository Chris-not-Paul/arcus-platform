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
  if (!(await page.getByRole("dialog").count())) {
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
  await page.getByRole("dialog").waitFor();
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
    dialog: document.querySelector('[role="dialog"]')?.getBoundingClientRect().toJSON(),
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
  const dialog = page.getByRole("dialog");
  await dialog.getByRole("tab", { name: "Contesto", exact: true }).click();
  await dialog.getByRole("button", { name: /Territorio attuale/ }).click();
  await dialog.getByText("Classi variate", { exact: true }).waitFor();
  await dialog.getByText("Classi invariate", { exact: true }).waitFor();
  await noHorizontalOverflow(page);
  await screenshot(page, "desktop-territorial");
  await dialog.getByRole("button", { name: /Classi nel tempo/ }).click();
  await dialog.getByRole("heading", { name: "Classi ISPRA alla coordinata del ponte" }).waitFor();
  await dialog.getByRole("tab", { name: "Ponte", exact: true }).click();
  await dialog.getByRole("heading", { name: "Il ponte documentato" }).waitFor();
  await dialog.getByRole("tab", { name: /Fonti e qualità/ }).click();
  const download = page.waitForEvent("download");
  await dialog.getByRole("button", { name: /Esporta record e fonti/ }).click();
  const dossierDownload = await download;
  const dossier = JSON.parse(await fs.readFile(await dossierDownload.path(), "utf8"));
  assert.equal(dossier.event.event_id, event.event_id);
  assert.ok(dossier.sources.length > 0);
  assert.ok(dossier.permalink.endsWith(`event=${event.event_slug}`));
  for (let index = 0; index < 30; index++) {
    await page.keyboard.press("Tab");
    assert.ok(await dialog.evaluate((element) => element.contains(document.activeElement)), "Keyboard focus remains inside the dossier");
  }
  await page.keyboard.press("Escape");
  await dialog.waitFor({ state: "hidden" });
  assert.ok(await page.getByRole("button", { name: /Apri scheda completa/ }).evaluate((element) => element === document.activeElement));
  await page.getByRole("button", { name: "Chiudi scheda evento", exact: true }).click();
  await page.getByRole("button", { name: /Ricerca e download/ }).click();
  const marker = page.locator('.arcus-marker-icon[title="Ponte sul Torrente Fersina"]');
  await marker.click();
  await assertVisibleSelectedMarker(page);
  const tileZoom = () => page.locator(".leaflet-tile").evaluateAll((tiles) => Math.max(...tiles.map((tile) => Number(tile.src.match(/\/tile\/(\d+)/)?.[1] || 0))));
  const zoomBefore = await tileZoom();
  await page.getByRole("button", { name: "Zoom in", exact: true }).click();
  await waitFor(async () => (await tileZoom()) > zoomBefore, "User zoom changes displayed tile level");
  await page.waitForTimeout(700);
  const userZoom = await tileZoom();
  await page.getByRole("button", { name: "Chiudi controlli Atlas", exact: true }).click();
  await page.getByRole("button", { name: "Apri controlli Atlas", exact: true }).click();
  await page.waitForTimeout(700);
  assert.equal(await tileZoom(), userZoom, "Sidebar changes preserve user zoom for the selected bridge");
  checks.push("Direct marker selection and user zoom preserved while toggling sidebar");
  checks.push("Sidebar selection, highlighted marker, context/history/bridge/sources tabs, JSON identity, keyboard focus and Escape");

  // Change to another distant bridge within the same SPA: the index files must be shared.
  const second = byId("IT13.02.01");
  const sidebarToggle = page.getByRole("button", { name: "Apri controlli Atlas" });
  if (await sidebarToggle.count()) await sidebarToggle.click();
  await page.getByLabel("Ricerca archivio", { exact: true }).fill(second.event_id);
  await page.locator(".atlas-sidebar-result-list button").filter({ hasText: second.event_id }).click();
  await page.locator(".arcus-event-card").filter({ hasText: second.event_id }).waitFor();
  await page.getByRole("button", { name: /Apri scheda completa/ }).click();
  await page.getByRole("tab", { name: "Contesto", exact: true }).click();
  await page.getByRole("button", { name: /Territorio attuale/ }).click();
  await page.getByText("Contesto territoriale attuale", { exact: true }).waitFor();
  for (const [url, count] of contextRequests) {
    if (url.endsWith("index.json")) assert.equal(count, 1, `Catalogue reused: ${url}`);
  }
  checks.push("Different event in same session reuses all five parsed catalogues");

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
    await page.getByRole("tab", { name: "Contesto", exact: true }).click();
    await page.getByRole("button", { name: /Territorio attuale/ }).click();
    await page.getByText("Classi variate", { exact: true }).waitFor();
    await noHorizontalOverflow(page);
    await screenshot(page, `${name}-territorial`);
    await page.getByRole("button", { name: /Classi nel tempo/ }).click();
    await page.getByRole("heading", { name: "Classi ISPRA alla coordinata del ponte" }).waitFor();
    await noHorizontalOverflow(page);
    checks.push(`${name} (${width}×${height}): overview, dossier, current/history panels, no horizontal overflow`);
  }

  const reviewEvent = byId("IT00.10.23");
  await page.setViewportSize({ width: 1280, height: 800 });
  await openDossier(page, reviewEvent);
  await page.getByText("Record in verifica", { exact: true }).waitFor();
  await page.getByRole("button", { name: /Leggi di più/ }).click();
  assert.ok(!(await page.getByRole("dialog").locator(".arcus-event-description").innerText()).includes("B00.10.22"));
  checks.push("Review status precedes disputed narrative; legacy reference is displayed as IT00.10.22");

  const approximate = byId("IT20.10.18");
  await openDossier(page, approximate);
  await page.getByRole("tab", { name: "Contesto", exact: true }).click();
  await page.getByRole("button", { name: /Classi nel tempo/ }).click();
  await page.getByText(/Localizzazione approssimata: la cronologia/).waitFor();
  checks.push("Approximate coordinate produces explicit coverage message without class assignment");

  // Controlled network failure: retains the tab, explains failure, then recovers.
  const errorPage = await context.newPage();
  let blockHistory = true;
  await errorPage.route("**/data/event-context/hazard-history/index.json", (route) => blockHistory
    ? route.fulfill({ status: 503, body: "Controlled acceptance-test failure" })
    : route.continue());
  await openDossier(errorPage, event);
  await errorPage.getByRole("tab", { name: "Contesto", exact: true }).click();
  await errorPage.getByRole("button", { name: /Classi nel tempo/ }).click();
  await errorPage.getByText("Caricamento non riuscito", { exact: true }).waitFor();
  await screenshot(errorPage, "controlled-failure-retry");
  blockHistory = false;
  await errorPage.getByRole("button", { name: "Riprova", exact: true }).click();
  await errorPage.getByRole("heading", { name: "Classi ISPRA alla coordinata del ponte" }).waitFor();
  checks.push("Controlled history HTTP 503: explicit error, retry and recovery with real local data");

  let blockEvents = true;
  await errorPage.route("**/api/open/events", (route) => blockEvents
    ? route.fulfill({ status: 503, body: "Controlled acceptance-test failure" })
    : route.continue());
  await errorPage.goto(`${base}/atlas`);
  await errorPage.getByText("Caricamento incompleto: eventi.", { exact: true }).waitFor();
  assert.equal(await errorPage.locator(".atlas-command-grid strong").first().innerText(), "—");
  blockEvents = false;
  await errorPage.getByRole("button", { name: "Riprova", exact: true }).click();
  await waitFor(async () => (await errorPage.locator(".atlas-command-grid strong").first().innerText()) === String(events.length), "event API recovery");
  checks.push("Controlled event API HTTP 503: no misleading zero count, retry and recovery");
  await errorPage.close();
  assert.deepEqual(failures, [], "No unexpected local HTTP failures or uncaught browser errors");
  completed = true;
  console.log(JSON.stringify({ status: "passed", checks, screenshots, externalFailures: [...externalFailures] }, null, 2));
} finally {
  await fs.writeFile(path.join(output, "results.json"), JSON.stringify({ status: completed ? "passed" : "failed", checks, screenshots, failures, externalFailures: [...externalFailures] }, null, 2));
  await browser.close();
}
