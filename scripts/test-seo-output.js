import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

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
  assert.ok(html.includes('id="arcus-static-structured-data"'), `missing JSON-LD for ${event.event_slug}`);
  assert.ok(html.includes('data-arcus-prerendered="true"'), `missing static research content for ${event.event_slug}`);
}

const sitemap = fs.readFileSync(path.join(outputRoot, "sitemap.xml"), "utf8");
const sitemapUrlCount = (sitemap.match(/<url>/g) || []).length;
assert.equal(sitemapUrlCount, manifest.event_count + 10, "sitemap must include core pages and every event dossier");

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
