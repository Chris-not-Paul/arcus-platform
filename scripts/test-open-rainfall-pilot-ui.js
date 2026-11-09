import assert from "node:assert/strict";
import { chromium } from "playwright";

const base = process.env.ARCUS_OPEN_PREVIEW_URL || "http://127.0.0.1:5194";
const browser = await chromium.launch({ headless: true });
try {
  const page = await browser.newPage({ locale: "it-IT", viewport: { width: 1200, height: 900 } });
  if (process.env.ARCUS_RAINFALL_PILOT_FIXTURES === "1") {
    await page.route("**/data/event-context/rainfall/*.json", (route) => {
      const name = new URL(route.request().url()).pathname.split("/").at(-1);
      return route.fulfill({ path: `outputs/arcus-rainfall-pilot/${name}`, contentType: "application/json" });
    });
  }
  for (const [slug, days] of [
    ["gambellara-2023", ["2023-05-17", "2023-05-18"]],
    ["prada-2023", ["2023-05-18"]],
  ]) {
    await page.goto(`${base}/atlas/events/${slug}/`);
    await page.getByRole("tab", { name: "Contesto", exact: true }).click();
    await page.getByRole("button", { name: /Meteo ricostruito/i }).click();
    const panel = page.locator(".arcus-event-rainfall");
    await panel.waitFor();
    assert.deepEqual(await panel.locator(".is-event-day").evaluateAll((nodes) => nodes.map((n) => n.dataset.date)), days);
    assert.equal(await panel.locator(".arcus-event-rainfall-metrics > div").count(), days.length > 1 ? 3 : 4);
    assert.match(await panel.locator(".arcus-event-rainfall-intro").first().innerText(), /non sono misure al ponte/);
    assert.equal(await panel.locator('a[href*="arpae.it"]').count(), 1);
    assert.equal(await panel.locator('[data-date="2023-05-18"] .arcus-event-rainfall-bar').evaluate((n) => n.style.height), "0%");
    assert.equal(await panel.locator(".arcus-rainfall-scale span").count(), 5);
    const width = parseFloat(await panel.locator(".arcus-rainfall-window").evaluate((n) => n.style.width));
    const barCount = await panel.locator(".arcus-event-rainfall-chart > div").count();
    assert.ok(Math.abs(width - 100 * days.length / barCount) < 0.01);
    const values = panel.locator(".arcus-rainfall-values");
    await values.locator("summary").click();
    assert.equal(await values.locator("tbody tr:visible").count(), barCount);
    await values.locator("summary").click();
    if (process.env.ARCUS_RAINFALL_SCREENSHOTS === "1") {
      await panel.locator(".arcus-rainfall-figure").screenshot({
        path: `outputs/arcus-rainfall-design/${slug}.png`, animations: "disabled",
      });
    }
  }
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(`${base}/atlas/events/gambellara-2023/`);
  await page.getByRole("tab", { name: "Contesto", exact: true }).click();
  await page.getByRole("button", { name: /Meteo ricostruito/i }).click();
  assert.ok(await page.locator(".arcus-event-rainfall-chart").evaluate((n) =>
    n.getBoundingClientRect().right <= document.documentElement.clientWidth));
  if (process.env.ARCUS_RAINFALL_SCREENSHOTS === "1") {
    await page.locator(".arcus-rainfall-figure").screenshot({
      path: "outputs/arcus-rainfall-design/gambellara-mobile.png", animations: "disabled",
    });
  }
  if (process.env.ARCUS_RAINFALL_PILOT_FIXTURES !== "1") {
    const openRainfall = async (slug) => {
      await page.goto(`${base}/atlas/events/${slug}/`);
      await page.getByRole("tab", { name: "Contesto", exact: true }).click();
      await page.getByRole("button", { name: /Meteo ricostruito/i }).click();
    };

    await openRainfall("felleto-2000");
    await page.getByText(/Data di riferimento, non giorno accertato/).waitFor();
    await page.locator(".arcus-rainfall-figure").waitFor();
    assert.equal(await page.locator(".arcus-rainfall-window").count(), 0);

    await openRainfall("monchiero-2010");
    await page.getByText("Ricostruzione non rappresentativa", { exact: true }).waitFor();
    assert.equal(await page.locator(".arcus-rainfall-figure").count(), 0);

    await openRainfall("riolo-terme-ponte-dei-crivellari-2023");
    await page.getByText("Nessuna ricostruzione meteorologica pubblicata per questo evento.").waitFor();
    assert.equal(await page.locator(".arcus-rainfall-figure").count(), 0);
  }
  console.log("Rainfall chart, chronology and fallback states passed in the browser");
} finally {
  await browser.close();
}
