import assert from "node:assert/strict";
import { mkdir, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { chromium } from "playwright";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const BASE_URL = process.env.ARCUS_TEST_BASE_URL || "http://127.0.0.1:5173";
const OUTPUT_DIR = path.join(ROOT, "outputs", "research-plus-acceptance");

async function readJson(relativePath) {
  return JSON.parse(await readFile(path.join(ROOT, relativePath), "utf8"));
}

const resources = {
  "data-release": await readJson("private-data/professional/data-release.json"),
  "event-research-profiles": await readJson(
    "private-data/professional/event-research-profiles.json"
  ),
  "event-research-readiness-audit": await readJson(
    "private-data/professional/event-research-readiness-audit.json"
  ),
  "professional-events": await readJson(
    "private-data/professional/professional-events.json"
  ),
  "professional-sources": await readJson(
    "private-data/professional/professional-sources.json"
  ),
};

await mkdir(OUTPUT_DIR, { recursive: true });

const browser = await chromium.launch({ headless: true });
const checks = [];

try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  const consoleErrors = [];
  const failedRequests = [];

  page.on("console", (message) => {
    if (message.type() === "error") consoleErrors.push(message.text());
  });
  page.on("requestfailed", (request) => {
    failedRequests.push(`${request.method()} ${request.url()}: ${request.failure()?.errorText}`);
  });

  await page.addInitScript(() => localStorage.setItem("arcus-language", "it"));
  await page.route("**/api/auth/session", (route) => route.fulfill({
    contentType: "application/json",
    json: {
      authenticated: true,
      permissions: ["professional:read"],
      username: "research-ui-test",
    },
    status: 200,
  }));
  await page.route("**/api/professional/*", (route) => {
    const resource = route.request().url().split("/api/professional/")[1]?.split("?")[0];
    const payload = resources[resource];

    if (!payload) return route.continue();
    return route.fulfill({ contentType: "application/json", json: payload, status: 200 });
  });

  await page.goto(`${BASE_URL}/analytics/pro`, { waitUntil: "networkidle" });
  await page.getByRole("button", { name: "Copertura dati" }).click();

  const module = page.locator('[data-research-module="coverage"]');
  await module.waitFor();
  assert.match(await module.innerText(), /Cosa è davvero confrontabile nella coorte/i);
  assert.match(await module.innerText(), /Solo l.identificativo di episodio/i);
  assert.ok(await module.locator("tbody tr").count() >= 10);
  checks.push("research data readiness module renders the controlled schema");

  const pilotTable = module.locator(".research-enrichment-table");
  assert.equal(await pilotTable.locator("tbody tr").count(), 1);
  assert.match(await pilotTable.innerText(), /IT13\.02\.01/);
  checks.push("active hydraulic cohort exposes only its source-backed pilot case");

  const cohortProfiles = resources["event-research-profiles"].profiles.filter(
    (profile) => profile.event?.specific_cause?.value === "Hydraulic"
  ).length;
  assert.match(await module.innerText(), new RegExp(`\\b${cohortProfiles}\\b`));
  checks.push("default hydraulic cohort reconciles with research profiles");

  const episodeRow = module.locator("tbody tr").filter({ hasText: "episode_id" });
  assert.match(await episodeRow.innerText(), /available_as_independence_control/);
  const geometryRow = module.locator("tbody tr").filter({ hasText: "bridge_length_m" });
  assert.match(await geometryRow.innerText(), /experiment_only_not_production/);
  checks.push("learning gates remain visible and conservative");

  await page.getByLabel("Famiglia di causa").selectOption("All");
  assert.equal(await pilotTable.locator("tbody tr").count(), 4);
  assert.match(await pilotTable.innerText(), /IT15\.04\.01/);
  assert.match(await pilotTable.innerText(), /IT18\.08\.01/);
  assert.match(await pilotTable.innerText(), /IT20\.04\.02/);
  checks.push("all-cause cohort reconciles the four controlled enrichment records");

  await page.screenshot({
    fullPage: true,
    path: path.join(OUTPUT_DIR, "desktop-data-readiness.png"),
  });

  await page.setViewportSize({ width: 390, height: 844 });
  await page.reload({ waitUntil: "networkidle" });
  await page.getByRole("button", { name: "Copertura dati" }).click();
  await page.locator('[data-research-module="coverage"]').waitFor();
  assert.equal(
    await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1),
    true
  );
  checks.push("mobile research workbench has no page-level horizontal overflow");
  await page.screenshot({
    fullPage: true,
    path: path.join(OUTPUT_DIR, "mobile-data-readiness.png"),
  });

  assert.deepEqual(consoleErrors, []);
  assert.deepEqual(failedRequests, []);
  checks.push("no browser console errors or failed requests");

  console.log(JSON.stringify({
    checks,
    screenshots: [
      path.join(OUTPUT_DIR, "desktop-data-readiness.png"),
      path.join(OUTPUT_DIR, "mobile-data-readiness.png"),
    ],
    status: "passed",
  }, null, 2));
} finally {
  await browser.close();
}
