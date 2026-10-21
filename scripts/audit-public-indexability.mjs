import assert from 'node:assert/strict';
import { getPublicPageMetadata } from '../src/config/publicPageMetadata.js';

// Read-only checks of the public HTML served to crawlers; no indexing guarantees.
const origin = 'https://www.arcusbridges.org';
const corePaths = ['/', '/atlas', '/analytics', '/methodology', '/data-access', '/publications', '/contribute', '/about', '/privacy', '/rights'];
const sitemapResponse = await fetch(`${origin}/sitemap.xml`);
assert.equal(sitemapResponse.status, 200, 'Sitemap must be reachable');
const sitemap = await sitemapResponse.text();
const sitemapUrls = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map((match) => match[1]);
const sitemapSet = new Set(sitemapUrls);
const paths = [...corePaths, '/atlas/events/trasta-2014'];
const reports = [];
const htmlByPath = new Map();
for (const route of paths) {
  const url = `${origin}${route}`;
  const response = await fetch(url);
  const html = await response.text();
  htmlByPath.set(route, html);
  const canonical = html.match(/<link\b(?=[^>]*\brel=["']canonical["'])[^>]*\bhref=["']([^"']+)["'][^>]*>/i)?.[1];
  const robots = html.match(/<meta\b(?=[^>]*\bname=["']robots["'])[^>]*\bcontent=["']([^"']*)["'][^>]*>/i)?.[1] || '';
  const title = html.match(/<title>([^<]*)<\/title>/i)?.[1];
  const language = html.match(/<html\b[^>]*\blang=["']([^"']+)["']/i)?.[1];
  const metadata = getPublicPageMetadata(route);
  if (metadata) {
    assert.equal(title, metadata.title, `${route}: deployed title must match the current Italian metadata`);
    assert.equal(language, 'it', `${route}: initial main-page language`);
    assert.ok(html.includes(`name="description" content="${metadata.description}"`), `${route}: deployed description`);
    assert.ok(html.includes('property="og:locale" content="it_IT"'), `${route}: deployed social locale`);
  }
  const internalLinks = [...html.matchAll(/<a\b[^>]*\bhref=["']([^"'#]+)["'][^>]*>/gi)]
    .map((match) => new URL(match[1].replaceAll('&amp;', '&'), url))
    .filter((link) => link.origin === origin)
    .map((link) => link.pathname);
  const report = { route, title, language, status: response.status, finalUrl: response.url, canonical, robots, xRobots: response.headers.get('x-robots-tag'), inSitemap: sitemapSet.has(response.url), internalLinkCount: new Set(internalLinks).size, hasStaticContent: html.includes('data-arcus-prerendered="true"') };
  reports.push(report);
  assert.equal(response.status, 200, `${route}: HTTP status`);
  assert.equal(canonical, response.url, `${route}: canonical must match the final HTTP target`);
  assert.ok(!/noindex/i.test(`${robots} ${report.xRobots || ''}`), `${route}: noindex`);
  assert.ok(report.inSitemap, `${route}: sitemap membership`);
  assert.ok(report.hasStaticContent, `${route}: static content`);
  for (const target of corePaths.filter((target) => target !== '/' && target !== '/privacy' && target !== '/rights')) {
    assert.ok(internalLinks.includes(`${target}/`), `${route}: missing direct core navigation link ${target}`);
  }
}
const atlasHtml = htmlByPath.get('/atlas');
const eventUrls = sitemapUrls.filter((url) => url.startsWith(`${origin}/atlas/events/`));
for (const eventUrl of eventUrls) {
  assert.ok(atlasHtml.includes(`href="${new URL(eventUrl).pathname}"`), `Atlas must link to ${eventUrl}`);
}
const robotsResponse = await fetch(`${origin}/robots.txt`);
const robotsText = await robotsResponse.text();
assert.equal(robotsResponse.status, 200);
assert.match(robotsText, /User-agent: \*\s+Allow: \//);
assert.ok(robotsText.includes(`Sitemap: ${origin}/sitemap.xml`));
const apexResponse = await fetch('https://arcusbridges.org/', { redirect: 'manual' });
assert.ok([301, 302, 307, 308].includes(apexResponse.status), 'Apex must redirect');
assert.equal(new URL(apexResponse.headers.get('location'), 'https://arcusbridges.org/').href, `${origin}/`);
console.log(JSON.stringify({ checkedAt: new Date().toISOString(), status: 'passed', sitemapUrls: sitemapUrls.length, eventLinksFromAtlas: eventUrls.length, apexRedirect: apexResponse.status, pages: reports }, null, 2));
