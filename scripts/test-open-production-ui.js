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
  assert.equal(await page.locator(".navbar-link.coming-soon").count(), 1);
  assert.match(await page.locator(".navbar-link.coming-soon").innerText(), /professional/i);
  assert.match(await page.locator(".navbar-link.coming-soon").innerText(), /prossimamente|coming soon/i);
  assert.equal(await page.getByRole("button", { name: /Accedi|Sign in/ }).count(), 0);
  assert.equal(await page.locator('a[href="mailto:info@arcusbridges.org"]').count() > 0, true);
  assert.equal(await page.getByText("Christian Paolini", { exact: true }).count(), 1);
  assert.match(await page.locator(".about-hero h1").innerText(), /open research infrastructure|infrastruttura aperta di ricerca/i);
  assert.equal(await page.locator('a[href="https://iabse.org/TG1.5"]').count(), 1);
  assert.match(
    await page.locator(".about-hero").evaluate((element) => getComputedStyle(element).backgroundImage),
    /rgb\(23, 63, 66\)|rgb\(29, 74, 75\)/
  );
  assert.equal(
    await page.locator('link[rel="canonical"]').getAttribute("href"),
    "https://www.arcusbridges.org/about"
  );
  checks.push("public navigation and canonical contact surface");

  await page.goto(`${base}/privacy`);
  await page.getByRole("heading", { name: /Informativa sul trattamento|Privacy notice/ }).waitFor();
  assert.equal(
    await page.getByText(/Christian Paolini — (Italia|Italy)/, { exact: true }).count(),
    1
  );
  assert.equal(await page.locator('a[href="mailto:info@arcusbridges.org"]').count() > 0, true);
  assert.equal(
    await page.locator('link[rel="canonical"]').getAttribute("href"),
    "https://www.arcusbridges.org/privacy"
  );
  checks.push("public privacy notice and controller identity");

  for (const font of [
    "IBMPlexSans-Regular.woff2",
    "IBMPlexSerif-Regular.woff2",
    "IBMPlexMono-Medium.woff2",
  ]) {
    const response = await page.request.get(`${base}/fonts/ibm-plex/${font}`);
    assert.equal(response.ok(), true, `${font} not served`);
  }
  checks.push("self-hosted typography assets");

  const visualSystemPages = [
    ["/", ".home-page", ".home-hero h1", "rgb(243, 240, 232)"],
    ["/atlas", ".atlas-page", ".atlas-sidebar-brand h1", "rgb(243, 240, 232)"],
    ["/atlas/events/campobasso-2000", ".event-dossier-page", ".arcus-event-dossier-header h2", "rgb(252, 251, 247)"],
    ["/analytics", ".analytics-page", ".analytics-title", "rgb(23, 63, 66)"],
    ["/methodology", ".methodology-page", ".methodology-title", "rgb(243, 240, 232)"],
    ["/data-access", ".data-access-page", ".data-access-hero h1", "rgb(243, 240, 232)"],
    ["/publications", ".publications-page", ".publications-hero h1", "rgb(243, 240, 232)"],
    ["/contribute", ".contribute-page", ".contribute-hero h1", "rgb(243, 240, 232)"],
    ["/about", ".about-page", ".about-hero h1", "rgb(243, 240, 232)"],
    ["/privacy", ".privacy-page", ".privacy-hero h1", "rgb(243, 240, 232)"],
    ["/route-not-found", ".not-found-page", ".not-found-content h1", "rgb(23, 63, 66)"],
  ];

  for (const [path, rootSelector, headingSelector, expectedBackground] of visualSystemPages) {
    await page.goto(`${base}${path}`);
    await page.locator(rootSelector).waitFor();
    await page.locator(headingSelector).waitFor();
    const visualSystem = await page.evaluate(
      ({ rootSelector: root, headingSelector: heading }) => {
        const rootStyle = getComputedStyle(document.querySelector(root));
        const headingStyle = getComputedStyle(document.querySelector(heading));
        return {
          background: rootStyle.backgroundColor,
          bodyFont: getComputedStyle(document.body).fontFamily,
          headingFont: headingStyle.fontFamily,
          ink: rootStyle.getPropertyValue("--arcus-ink").trim(),
          night: rootStyle.getPropertyValue("--arcus-night").trim(),
          paper: rootStyle.getPropertyValue("--arcus-paper").trim(),
        };
      },
      { rootSelector, headingSelector }
    );
    assert.match(visualSystem.bodyFont, /IBM Plex Sans/);
    assert.match(visualSystem.headingFont, /IBM Plex Serif/);
    assert.equal(visualSystem.background, expectedBackground, path);
    assert.equal(visualSystem.ink.toLowerCase(), "#202826");
    assert.equal(visualSystem.night.toLowerCase(), "#173f42");
    assert.equal(visualSystem.paper.toLowerCase(), "#f3f0e8");
    await noHorizontalOverflow(page);
  }
  checks.push("shared typography and palette across every Open page");

  const sharedEditorialPages = [
    ["/analytics", ".analytics-hero", ".analytics-title", ".analytics-subtitle", ".analytics-label"],
    ["/methodology", ".methodology-hero", ".methodology-title", ".methodology-subtitle", ".methodology-label"],
    ["/data-access", ".data-access-hero", ".data-access-hero h1", ".data-access-hero p", ".data-access-label"],
    ["/publications", ".publications-hero", ".publications-hero h1", ".publications-hero p", ".publications-label"],
    ["/contribute", ".contribute-hero", ".contribute-hero h1", ".contribute-hero p", ".contribute-hero span"],
    ["/about", ".about-hero", ".about-hero h1", ".about-hero p", ".about-label"],
    ["/privacy", ".privacy-hero", ".privacy-hero h1", ".privacy-hero p", ".privacy-eyebrow"],
  ];
  let editorialReference = null;

  for (const [path, heroSelector, titleSelector, copySelector, labelSelector] of sharedEditorialPages) {
    await page.goto(`${base}${path}`);
    await page.locator(titleSelector).waitFor();
    const editorialSystem = await page.evaluate(
      ({ heroSelector: hero, titleSelector: title, copySelector: copy, labelSelector: label }) => {
        const heroStyle = getComputedStyle(document.querySelector(hero));
        const titleStyle = getComputedStyle(document.querySelector(title));
        const copyStyle = getComputedStyle(document.querySelector(copy));
        const labelStyle = getComputedStyle(document.querySelector(label));
        return {
          heroBackground: heroStyle.backgroundImage,
          titleFont: titleStyle.fontFamily,
          titleSize: titleStyle.fontSize,
          titleLineHeight: titleStyle.lineHeight,
          copyFont: copyStyle.fontFamily,
          copySize: copyStyle.fontSize,
          copyLineHeight: copyStyle.lineHeight,
          labelFont: labelStyle.fontFamily,
          labelSize: labelStyle.fontSize,
          labelColor: labelStyle.color,
          labelTracking: labelStyle.letterSpacing,
        };
      },
      { heroSelector, titleSelector, copySelector, labelSelector }
    );

    if (!editorialReference) {
      editorialReference = editorialSystem;
    } else {
      assert.deepEqual(editorialSystem, editorialReference, path);
    }
  }
  checks.push("shared Open editorial hero palette and type scale");

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
  assert.equal(await mobile.locator(".data-access-resource-card").count(), 10);

  await mobile.goto(`${base}/about`);
  await mobile.locator(".about-contact-list").waitFor();
  await noHorizontalOverflow(mobile);
  assert.equal(await mobile.locator(".about-principles article").count(), 3);
  checks.push("mobile data access and identity layouts");

  await mobile.goto(`${base}/privacy`);
  await mobile.locator(".privacy-summary").waitFor();
  await noHorizontalOverflow(mobile);
  assert.equal(await mobile.locator(".privacy-data-grid > article").count(), 4);
  assert.match(await mobile.locator("body").innerText(), /profilazione|profiling/i);
  checks.push("mobile privacy notice");

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
  assert.equal(await mobile.locator(".analytics-research-preset-grid button").count(), 7);
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
  assert.equal(await mobile.getByText("Paolini et al.", { exact: true }).count() > 0, true);
  assert.equal(await mobile.locator('a[href^="mailto:research@arcusbridges.org"]').count() > 0, true);
  checks.push("publication lineage and citation guidance");

  await mobile.goto(`${base}/contribute`);
  await mobile.locator(".contribute-editorial-boundary").waitFor();
  await noHorizontalOverflow(mobile);
  assert.equal(await mobile.locator(".contribute-editorial-boundary > div").count(), 2);
  assert.equal(await mobile.locator('a[href="/privacy"]').count() > 0, true);
  checks.push("editorial contribution boundary");

  await mobile.goto(base);
  await mobile.locator(".home-access-grid").waitFor();
  await noHorizontalOverflow(mobile);
  assert.equal(await mobile.locator(".home-access-card").count(), 4);
  assert.equal(await mobile.locator('.home-access-card a[href="/analytics"]').count(), 1);
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
