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
const dataAccess = read("src/pages/DataAccessPage.jsx");
const publications = read("src/pages/PublicationsPage.jsx");
const privacy = read("src/pages/PrivacyPage.jsx");
const siteConfig = read("src/config/site.js");
const logoHorizontalLight = read("src/assets/logo/logo-horizontal.svg");
const logoHorizontalDark = read("src/assets/logo/logo-horizontal-dark.svg");
const logoMark = read("src/assets/logo/logo-mark.svg");
const favicon = read("public/favicon.svg");
const globalStyles = read("src/index.css");
const pageMeta = read("src/components/layout/PageMeta.jsx");
const analytics = read("src/pages/AnalyticsPage.jsx");
const contributeStyles = read("src/styles/contribute-page.css");
const robots = read("public/robots.txt");
const sitemap = read("public/sitemap.xml");
const headers = read("public/_headers");
const redirects = read("public/_redirects");
const manifest = JSON.parse(read("public/data/open-release/manifest.json"));
const events = JSON.parse(read("public/data/open-release/events.json"));
const episodes = JSON.parse(read("public/data/open-release/episodes.json"));
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

check("operational contact channels", () => {
  assert.match(siteConfig, /general: "info@arcusbridges\.org"/);
  assert.match(siteConfig, /research: "research@arcusbridges\.org"/);
  assert.match(siteConfig, /contributions: "contribute@arcusbridges\.org"/);
  assert.match(siteConfig, /privacy: "info@arcusbridges\.org"/);
  assert.match(footer, /contactAddresses\.research/);
  assert.match(dataAccess, /contactAddresses\.research/);
  assert.match(publications, /contactAddresses\.research/);
  assert.match(privacy, /contactAddresses\.privacy/);
  assert.match(privacy, /Christian Paolini/);
});

check("portable ARCUS brand assets", () => {
  for (const logo of [logoHorizontalLight, logoHorizontalDark]) {
    assert.doesNotMatch(logo, /<text/);
    assert.match(logo, /aria-labelledby="title description"/);
    assert.match(logo, /M107\.44 54 105\.1 46\.96/);
  }
  assert.match(logoMark, /#A76532/);
  assert.match(favicon, /#A76532/);
  assert.doesNotMatch(favicon, /<rect width="160" height="160"/);
});

check("self-hosted ARCUS typography system", () => {
  assert.doesNotMatch(globalStyles, /fonts\.googleapis\.com/);
  assert.match(globalStyles, /--arcus-font-sans:\s*\n\s*"IBM Plex Sans"/);
  assert.match(globalStyles, /--arcus-font-display:\s*\n\s*"IBM Plex Serif"/);
  assert.match(globalStyles, /--arcus-font-mono:\s*\n\s*"IBM Plex Mono"/);
  for (const file of [
    "IBMPlexSans-Regular.woff2",
    "IBMPlexSans-SemiBold.woff2",
    "IBMPlexSerif-Regular.woff2",
    "IBMPlexMono-Regular.woff2",
    "LICENSE.txt",
  ]) {
    assert.equal(
      fs.existsSync(path.resolve("public/fonts/ibm-plex", file)),
      true,
      `${file} missing`
    );
  }
  assert.doesNotMatch(analytics, /fontFamily="Arial/);
  assert.match(analytics, /fontFamily="IBM Plex Sans, sans-serif"/);
});

check("shared ARCUS interface palette", () => {
  assert.match(contributeStyles, /background: var\(--arcus-paper\)/);
  assert.match(contributeStyles, /background: var\(--arcus-night\)/);
  assert.match(contributeStyles, /color: var\(--arcus-ink\)/);
  assert.doesNotMatch(contributeStyles, /#f2f0eb|#173f41|#c58b39/i);
  assert.match(pageMeta, /theme-color", "#f3f0e8"/);
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
    "/publications", "/contribute", "/about", "/privacy",
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
  assert.equal(manifest.version, "arcus-open-2026.6");
  assert.equal(events.events.length, manifest.event_count);
  assert.equal(sources.sources.length, manifest.source_count);
  assert.equal(
    new Set(manifest.known_limitations || []).size,
    (manifest.known_limitations || []).length,
    "Manifest limitations must not contain duplicate statements"
  );
  assert.equal(events.events.length, 261);
  assert.equal(sources.sources.length, 716);
  assert.equal(episodes.summary.episode_count, 14);
  assert.equal(episodes.summary.grouped_event_count, 108);
  assert.equal(manifest.resources.episodes, "episodes.json");
});

check("production build artifacts", () => {
  for (const file of [
    "dist/index.html",
    "dist/_headers",
    "dist/_redirects",
    "dist/robots.txt",
    "dist/sitemap.xml",
    "dist/fonts/ibm-plex/IBMPlexSans-Regular.woff2",
    "dist/fonts/ibm-plex/IBMPlexSerif-Regular.woff2",
    "dist/fonts/ibm-plex/IBMPlexMono-Regular.woff2",
    "dist/fonts/ibm-plex/LICENSE.txt",
    "dist/data/open-release/events.json",
    "dist/data/open-release/episodes.json",
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
