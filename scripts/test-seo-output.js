import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { canonicalPagePath, canonicalPageUrl } from "../src/utils/publicPageUrl.js";
import { researchLineage } from "../src/config/researchLineage.js";
import { formatPageTitle, getPublicPageMetadata, publicPageMetadata, publicPageMetadataUpdatedAt } from "../src/config/publicPageMetadata.js";

assert.equal(canonicalPagePath('/'), '/');
assert.equal(canonicalPagePath('/atlas'), '/atlas/');
assert.equal(canonicalPagePath('/atlas/'), '/atlas/');
assert.equal(canonicalPageUrl('https://www.arcusbridges.org/', '/atlas'), 'https://www.arcusbridges.org/atlas/');
assert.equal(getPublicPageMetadata('/atlas'), getPublicPageMetadata('/atlas/'));
assert.equal(getPublicPageMetadata('/atlas/events/example'), null, 'core metadata must not overwrite event dossiers');
assert.equal(getPublicPageMetadata('/admin'), null, 'core metadata must not overwrite private pages');
assert.equal(formatPageTitle('ARCUS'), 'ARCUS');
assert.equal(formatPageTitle('Event record'), 'Event record | ARCUS');

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const outputRoot = path.join(repositoryRoot, "dist");
const eventsPayload = JSON.parse(
  fs.readFileSync(path.join(repositoryRoot, "public", "data", "open-release", "events.json"), "utf8"),
);
const manifest = JSON.parse(
  fs.readFileSync(path.join(repositoryRoot, "public", "data", "open-release", "manifest.json"), "utf8"),
);

const eventPages = eventsPayload.events.map((event) => ({
  event,
  path: path.join(outputRoot, "atlas", "events", event.event_slug, "index.html"),
}));

assert.equal(eventPages.length, manifest.event_count, "event count must match the release manifest");

for (const { event, path: eventPath } of eventPages) {
  assert.ok(fs.existsSync(eventPath), `missing pre-rendered page for ${event.event_slug}`);
  const html = fs.readFileSync(eventPath, "utf8");
  assert.match(html, new RegExp(event.event_id.replaceAll(".", "\\.")), `missing event ID for ${event.event_slug}`);
  assert.ok(html.includes(`https://www.arcusbridges.org/atlas/events/${event.event_slug}`), `missing canonical URL for ${event.event_slug}`);
  assert.ok(html.includes(`<link rel="canonical" href="https://www.arcusbridges.org/atlas/events/${event.event_slug}/"`), `canonical must match the served directory URL for ${event.event_slug}`);
  assert.ok(html.includes('id="arcus-static-structured-data"'), `missing JSON-LD for ${event.event_slug}`);
  assert.ok(html.includes('data-arcus-prerendered="true"'), `missing static research content for ${event.event_slug}`);
  assert.ok(html.includes('<html lang="en"'), 'English dossier fallback must retain its correct language');
  assert.ok(html.includes('property="og:locale" content="en_GB"'), 'dossier locale must match its fallback prose');
}

for (const [route, translations] of Object.entries(publicPageMetadata)) {
  const html = fs.readFileSync(path.join(outputRoot, route, 'index.html'), 'utf8');
  const { title, description } = translations.it;
  assert.ok(html.includes('<html lang="it"'), `Italian default language missing: ${route}`);
  assert.ok(html.includes(`<title>${title}</title>`), `descriptive Italian title missing: ${route}`);
  assert.ok(html.includes(`name="description" content="${description}"`), `Italian description missing: ${route}`);
  assert.ok(html.includes(`property="og:title" content="${title}"`), `social title must agree: ${route}`);
  assert.ok(html.includes(`name="twitter:description" content="${description}"`), `social description must agree: ${route}`);
  assert.ok(html.includes('property="og:locale" content="it_IT"'), `Italian social locale missing: ${route}`);
  assert.ok(html.includes('aria-label="Navigazione principale"'), `Italian fallback navigation missing: ${route}`);
  assert.ok(translations.en.title && translations.en.description, `English metadata must remain available: ${route}`);
  assert.equal(formatPageTitle(title), title, `brand must not be duplicated: ${route}`);
}
const shell = fs.readFileSync(path.join(repositoryRoot, 'index.html'), 'utf8');
assert.ok(shell.includes(`<title>${publicPageMetadata['/'].it.title}</title>`), 'development shell and public build must agree');
assert.ok(shell.includes(publicPageMetadata['/'].it.description), 'shell description must agree with shared metadata');

const sitemap = fs.readFileSync(path.join(outputRoot, "sitemap.xml"), "utf8");
const sitemapUrlCount = (sitemap.match(/<url>/g) || []).length;
assert.equal(sitemapUrlCount, manifest.event_count + 10, "sitemap must include core pages and every event dossier");
const sitemapLocations = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map((match) => match[1]);
for (const [route] of Object.entries(publicPageMetadata)) {
  const modified = [String(manifest.generated_at).slice(0, 10), publicPageMetadataUpdatedAt].sort().at(-1);
  assert.ok(sitemap.includes(`<loc>https://www.arcusbridges.org${route}</loc><lastmod>${modified}</lastmod>`), `main page lastmod must reflect the latest data or copy update: ${route}`);
}
const atlasHtml = fs.readFileSync(path.join(outputRoot, 'atlas', 'index.html'), 'utf8');
for (const location of sitemapLocations) {
  const route = new URL(location).pathname;
  assert.ok(route.endsWith('/'), `sitemap URL must not point to a slash redirect: ${location}`);
  const html = fs.readFileSync(path.join(outputRoot, route, 'index.html'), 'utf8');
  assert.ok(html.includes(`<link rel="canonical" href="${location}"`), `sitemap and canonical disagree: ${location}`);
  if (route.startsWith('/atlas/events/')) {
    assert.ok(atlasHtml.includes(`href="${route}"`), `Atlas must link directly to the canonical dossier: ${location}`);
  }
}

const robots = fs.readFileSync(path.join(outputRoot, "robots.txt"), "utf8");
assert.match(robots, /User-agent: OAI-SearchBot\s+Allow: \//);
assert.match(robots, /User-agent: GPTBot\s+Disallow: \//);

const redirects = fs.readFileSync(path.join(outputRoot, "_redirects"), "utf8");
assert.ok(
  redirects.includes("/atlas/events/:eventSlug /atlas/events/:eventSlug/index.html 200"),
  "missing event pre-render rewrite",
);
assert.ok(
  redirects.indexOf("/atlas/events/:eventSlug") < redirects.indexOf("/* /index.html 200"),
  "event pre-render rewrite must precede the SPA fallback",
);

const datasetMetadata = JSON.parse(fs.readFileSync(path.join(outputRoot, "dataset.json"), "utf8"));
const publicationsHtml = fs.readFileSync(path.join(outputRoot, "publications", "index.html"), "utf8");
for (const author of ["Marco Civera", "Manuel D’Angelo", "Pier Francesco Giordano", "Paolo Borlenghi", "Francesco Ballio", "Bernardino Chiaia", "Maria Pina Limongelli", "Giovanni Ravazzani"]) {
  assert.ok(publicationsHtml.includes(author), `missing visible scientific credit: ${author}`);
}
assert.ok(publicationsHtml.includes('id="scientific-provenance"'), "missing crawlable provenance section");
assert.ok(publicationsHtml.includes("10.1016/j.ijdrr.2025.105607"), "missing hydraulic research DOI");
const methodologyHtml = fs.readFileSync(path.join(outputRoot, 'methodology', 'index.html'), 'utf8');
for (const text of [researchLineage.it.title, researchLineage.it.overview, researchLineage.it.limit, researchLineage.it.hydraulic, ...researchLineage.it.steps.map((step) => step.text)]) {
  assert.ok(methodologyHtml.includes(text), `missing crawlable lineage explanation: ${text}`);
}
assert.ok(methodologyHtml.includes('id="dataset-lineage"'), 'missing stable methodology lineage anchor');
assert.ok(publicationsHtml.includes('/methodology/#dataset-lineage'), 'publications must link to the record-review methodology');
assert.equal(datasetMetadata["@type"], "Dataset");
assert.equal(datasetMetadata.version, manifest.version);
assert.ok(fs.existsSync(path.join(outputRoot, "llms.txt")), "llms.txt must be deployed");
assert.ok(fs.existsSync(path.join(outputRoot, "CITATION.cff")), "CITATION.cff must be deployed");

console.log(JSON.stringify({
  eventPages: eventPages.length,
  release: manifest.version,
  sitemapUrls: sitemapUrlCount,
  status: "passed",
}, null, 2));
