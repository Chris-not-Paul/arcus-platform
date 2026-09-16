import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const read = (file) => fs.readFileSync(path.resolve(file), "utf8");
const checks = [];

function check(label, assertion) {
  assertion();
  checks.push(label);
}

const environment = read(".env.open");
const app = read("src/App.jsx");
const navbar = read("src/components/layout/Navbar.jsx");
const footer = read("src/components/layout/Footer.jsx");
const contribute = read("src/pages/ContributePage.jsx");
const pageMeta = read("src/components/layout/PageMeta.jsx");
const robots = read("public/robots.txt");
const sitemap = read("public/sitemap.xml");
const headers = read("public/_headers");
const redirects = read("public/_redirects");
const manifest = JSON.parse(read("public/data/open-release/manifest.json"));
const events = JSON.parse(read("public/data/open-release/events.json"));
const sources = JSON.parse(read("public/data/open-release/sources.json"));

check("open release feature boundary", () => {
  assert.match(environment, /VITE_ARCUS_RELEASE_CHANNEL=open/);
  assert.match(environment, /VITE_ARCUS_ENABLE_ACCOUNTS=false/);
  assert.match(environment, /VITE_ARCUS_ENABLE_CONTRIBUTION_FORM=false/);
  assert.match(environment, /VITE_ARCUS_ENABLE_PROFESSIONAL=false/);
  assert.match(app, /professionalEnabled/);
  assert.match(navbar, /accountsEnabled/);
  assert.match(footer, /professionalEnabled/);
});

check("static contribution channel", () => {
  assert.match(contribute, /contributionFormEnabled/);
  assert.match(contribute, /contactAddresses\.contributions/);
  assert.match(contribute, /mailto:/);
});

check("canonical metadata", () => {
  assert.match(pageMeta, /canonical/);
  assert.match(pageMeta, /og:url/);
  assert.match(pageMeta, /robots/);
  assert.match(pageMeta, /twitter:card/);
});

check("crawlable public surface", () => {
  for (const route of [
    "/atlas", "/analytics", "/methodology", "/data-access",
    "/publications", "/contribute", "/about",
  ]) {
    assert.match(sitemap, new RegExp(`<loc>https://www\\.arcusbridges\\.org${route}</loc>`));
  }
  assert.match(robots, /Sitemap: https:\/\/www\.arcusbridges\.org\/sitemap\.xml/);
  assert.match(robots, /Disallow: \/professional/);
});

check("portable hosting controls", () => {
  assert.equal(redirects.trim(), "/* /index.html 200");
  assert.match(headers, /X-Content-Type-Options: nosniff/);
  assert.match(headers, /X-Frame-Options: DENY/);
  assert.match(headers, /Permissions-Policy:/);
});

check("public release integrity", () => {
  assert.equal(manifest.version, "arcus-open-2026.3");
  assert.equal(events.events.length, manifest.event_count);
  assert.equal(sources.sources.length, manifest.source_count);
  assert.equal(events.events.length, 261);
  assert.equal(sources.sources.length, 716);
});

check("production build artifacts", () => {
  for (const file of [
    "dist/index.html",
    "dist/_headers",
    "dist/_redirects",
    "dist/robots.txt",
    "dist/sitemap.xml",
    "dist/data/open-release/events.json",
    "dist/data/open-release/sources.json",
  ]) {
    assert.equal(fs.existsSync(path.resolve(file)), true, `${file} missing`);
  }
});

console.log(JSON.stringify({
  checks,
  events: events.events.length,
  release: manifest.version,
  sources: sources.sources.length,
  status: "passed",
}, null, 2));
