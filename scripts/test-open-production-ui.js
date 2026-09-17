import assert from "node:assert/strict";
import { chromium } from "playwright";

const base = process.env.ARCUS_OPEN_PREVIEW_URL || "http://127.0.0.1:4175";
const browser = await chromium.launch({ headless: true });
const checks = [];

async function noHorizontalOverflow(page) {
  const dimensions = await page.evaluate(() => ({
    document: document.documentElement.scrollWidth,
    viewport: window.innerWidth,
  }));
  assert.ok(dimensions.document <= dimensions.viewport + 1, JSON.stringify(dimensions));
}

try {
  const context = await browser.newContext({
    locale: "it-IT",
    viewport: { width: 1280, height: 800 },
  });
  const page = await context.newPage();

  await page.goto(`${base}/about`);
  await page.locator('a[href="mailto:info@arcusbridges.org"]').first().waitFor();
  const typography = await page.evaluate(() => ({
    body: getComputedStyle(document.body).fontFamily,
    heading: getComputedStyle(document.querySelector("h1")).fontFamily,
  }));
  assert.match(typography.body, /IBM Plex Sans/);
  assert.match(typography.heading, /IBM Plex Serif/);
  assert.equal(await page.getByRole("link", { name: "Professional", exact: true }).count(), 0);
  assert.equal(await page.getByRole("button", { name: /Accedi|Sign in/ }).count(), 0);
  assert.equal(await page.locator('a[href="mailto:info@arcusbridges.org"]').count() > 0, true);
  assert.equal(
    await page.locator('link[rel="canonical"]').getAttribute("href"),
    "https://www.arcusbridges.org/about"
  );
  checks.push("public navigation and canonical contact surface");

  for (const font of [
    "IBMPlexSans-Regular.woff2",
    "IBMPlexSerif-Regular.woff2",
    "IBMPlexMono-Medium.woff2",
  ]) {
    const response = await page.request.get(`${base}/fonts/ibm-plex/${font}`);
    assert.equal(response.ok(), true, `${font} not served`);
  }
  checks.push("self-hosted typography assets");

  await page.goto(`${base}/contribute`);
  await page.locator('a[href^="mailto:contribute@arcusbridges.org"]').waitFor();
  assert.equal(await page.locator("form.contribute-form").count(), 0);
  assert.equal(await page.locator('a[href^="mailto:contribute@arcusbridges.org"]').count(), 1);
  checks.push("static editorial contribution channel");

  await page.goto(`${base}/data-access`);
  await page.getByRole("link", { name: "CSV", exact: true }).waitFor();
  assert.equal(await page.getByRole("link", { name: /Professional/ }).count(), 0);
  assert.equal(await page.getByRole("link", { name: "CSV", exact: true }).count(), 1);
  assert.equal(await page.getByRole("link", { name: "GeoJSON", exact: true }).count(), 1);
  assert.equal(await page.locator('a[href^="mailto:research@arcusbridges.org"]').count() > 0, true);
  checks.push("public data package without inactive product access");

  await page.goto(`${base}/professional`);
  await page.getByText("ARCUS / 404", { exact: true }).waitFor();
  assert.equal(
    await page.locator('meta[name="robots"]').getAttribute("content"),
    "noindex, nofollow"
  );
  checks.push("private route unavailable and non-indexable");

  await page.goto(`${base}/atlas`);
  await page.waitForFunction(() => {
    const value = document.querySelector(".atlas-command-grid strong")?.textContent?.trim();
    return value === "261";
  });
  assert.equal(await page.locator("body").innerText().then((text) => text.includes("261")), true);
  checks.push("Atlas reads the static 261-event release without an API");

  const mobile = await context.newPage();
  await mobile.setViewportSize({ width: 390, height: 844 });
  await mobile.goto(`${base}/contribute`);
  await mobile.locator('a[href^="mailto:contribute@arcusbridges.org"]').waitFor();
  await noHorizontalOverflow(mobile);
  assert.equal(await mobile.locator('a[href^="mailto:contribute@arcusbridges.org"]').count(), 1);
  checks.push("mobile Open contribution surface");

  await mobile.goto(`${base}/data-access`);
  await mobile.locator(".data-access-release-summary").waitFor();
  await noHorizontalOverflow(mobile);
  assert.match(await mobile.locator(".data-access-release-summary").innerText(), /261/);
  assert.match(await mobile.locator(".data-access-release-summary").innerText(), /716/);
  assert.equal(await mobile.locator(".data-access-resource-card").count(), 9);

  await mobile.goto(`${base}/about`);
  await mobile.locator(".about-contact-list").waitFor();
  await noHorizontalOverflow(mobile);
  assert.equal(await mobile.locator(".about-principles article").count(), 3);
  checks.push("mobile data access and identity layouts");

  await mobile.goto(`${base}/methodology`);
  await mobile.getByRole("heading", { name: /Come ARCUS costruisce l.evidenza|How ARCUS builds evidence/ }).waitFor();
  await noHorizontalOverflow(mobile);
  assert.equal((await mobile.locator("body").innerText()).includes("Professional"), false);
  assert.equal(
    await mobile.locator(".methodology-section-title").first().evaluate((element) => getComputedStyle(element).opacity),
    "1"
  );
  checks.push("Open methodology content and always-visible mobile layout");

  await mobile.goto(`${base}/analytics`);
  await mobile.locator(".analytics-workspace-index").waitFor();
  await mobile.locator(".analytics-cohort-summary strong").first().getByText("261", { exact: true }).waitFor();
  await noHorizontalOverflow(mobile);
  assert.equal(await mobile.locator(".analytics-workspace-index button").count(), 3);
  assert.equal(await mobile.locator(".analytics-mobile-step-nav").count(), 1);
  await mobile.locator(".analytics-workspace-index button").nth(1).click();
  await mobile.waitForURL(/step=2/);
  assert.equal(await mobile.locator(".analytics-research-preset-grid button").count(), 6);
  await mobile.getByRole("tab", { name: /Configurazione libera|Custom configuration/ }).click();
  await mobile.waitForURL(/path=custom/);
  assert.equal(await mobile.locator(".analytics-analysis-mode button").count(), 3);
  assert.equal((await mobile.locator("body").innerText()).includes("Professional"), false);
  checks.push("mobile Open analytics workflow and research controls");

  await mobile.goto(`${base}/publications`);
  await mobile.locator(".publications-citation-guide").waitFor();
  await noHorizontalOverflow(mobile);
  assert.equal(await mobile.locator(".publications-citation-options article").count(), 3);
  assert.equal(await mobile.locator(".publications-grid a").count(), 3);
  assert.equal(await mobile.locator('a[href^="mailto:research@arcusbridges.org"]').count() > 0, true);
  checks.push("publication lineage and citation guidance");

  await mobile.goto(`${base}/contribute`);
  await mobile.locator(".contribute-editorial-boundary").waitFor();
  await noHorizontalOverflow(mobile);
  assert.equal(await mobile.locator(".contribute-editorial-boundary > div").count(), 2);
  checks.push("editorial contribution boundary");

  await mobile.goto(base);
  await mobile.locator(".home-access-grid").waitFor();
  await noHorizontalOverflow(mobile);
  assert.equal(await mobile.locator(".home-access-card").count(), 3);
  assert.equal((await mobile.locator("body").innerText()).includes("Professional"), false);
  checks.push("Open homepage scope and mobile layout");

  const sitemapResponse = await page.request.get(`${base}/sitemap.xml`);
  assert.equal(sitemapResponse.ok(), true);
  assert.match(await sitemapResponse.text(), /https:\/\/www\.arcusbridges\.org\/atlas/);
  checks.push("production sitemap served");

  console.log(JSON.stringify({ checks, status: "passed" }, null, 2));
} finally {
  await browser.close();
}
