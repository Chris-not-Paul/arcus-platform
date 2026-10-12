import assert from "node:assert/strict";
import { chromium } from "playwright";

const base = process.env.ARCUS_OPEN_PREVIEW_URL || "http://127.0.0.1:4175";
const browser = await chromium.launch({ headless: true });

try {
  const context = await browser.newContext({ locale: "en-US" });
  const page = await context.newPage();

  await page.goto(`${base}/about`);
  await page.locator(".navbar-language button.active").waitFor();
  assert.equal(await page.locator(".navbar-language button.active").innerText(), "IT");
  assert.equal(await page.evaluate(() => document.documentElement.lang), "it");
  assert.equal(await page.evaluate(() => localStorage.getItem("arcus-language")), "it");
  assert.equal(await page.locator('meta[property="og:locale"]').getAttribute("content"), "it_IT");

  await page.locator(".navbar-language button").filter({ hasText: "EN" }).click();
  assert.equal(await page.locator(".navbar-language button.active").innerText(), "EN");
  await page.reload();
  await page.locator(".navbar-language button.active").waitFor();
  assert.equal(await page.locator(".navbar-language button.active").innerText(), "EN");
  assert.equal(await page.evaluate(() => document.documentElement.lang), "en");
  assert.equal(await page.locator('meta[property="og:locale"]').getAttribute("content"), "en_GB");

  const newVisitor = await browser.newContext({ locale: "en-US" });
  const home = await newVisitor.newPage();
  await home.goto(base);
  await home.locator(".intro-caption").waitFor();
  assert.match(await home.locator(".intro-caption").innerText(), /CARICAMENTO DELLE EVIDENZE/);
  assert.equal(await home.locator(".navbar-language button.active").innerText(), "IT");

  console.log("ARCUS default Italian, English preference, and intro: passed");
} finally {
  await browser.close();
}
