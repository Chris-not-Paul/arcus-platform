import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const currentFile = fileURLToPath(import.meta.url);
const repositoryRoot = path.resolve(path.dirname(currentFile), "..");
const publicRoot = path.join(repositoryRoot, "public");
const outputRoot = path.join(repositoryRoot, "dist");
const siteOrigin = "https://www.arcusbridges.org";
const paperDoi = "https://doi.org/10.1016/j.dib.2025.112375";

const readJson = (filePath) => JSON.parse(fs.readFileSync(filePath, "utf8"));
const manifest = readJson(path.join(publicRoot, "data", "open-release", "manifest.json"));
const { events } = readJson(path.join(publicRoot, "data", "open-release", "events.json"));
const { sources } = readJson(path.join(publicRoot, "data", "open-release", "sources.json"));
const templatePath = path.join(outputRoot, "index.html");

if (!fs.existsSync(templatePath)) {
  throw new Error("ARCUS SEO build requires dist/index.html. Run it after vite build.");
}

const template = fs.readFileSync(templatePath, "utf8");
const sourceGroups = new Map();

for (const source of sources) {
  const group = sourceGroups.get(source.event_id) || [];
  group.push(source);
  sourceGroups.set(source.event_id, group);
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function escapeXml(value) {
  return escapeHtml(value);
}

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function safeJsonLd(value) {
  return JSON.stringify(value).replaceAll("<", "\\u003c");
}

function concise(value, maxLength = 158) {
  const normalized = String(value || "").replace(/\s+/g, " ").trim();
  if (normalized.length <= maxLength) return normalized;
  return `${normalized.slice(0, maxLength - 1).replace(/\s+\S*$/, "")}…`;
}

function replaceMeta(html, attribute, key, content) {
  const expression = new RegExp(
    `<meta\\b(?=[^>]*\\b${attribute}=["']${escapeRegex(key)}["'])[^>]*>`,
    "i",
  );
  const replacement = `<meta ${attribute}="${escapeHtml(key)}" content="${escapeHtml(content)}" />`;
  return expression.test(html)
    ? html.replace(expression, replacement)
    : html.replace("</head>", `    ${replacement}\n  </head>`);
}

function replaceCanonical(html, canonicalUrl) {
  const expression = /<link\b(?=[^>]*\brel=["']canonical["'])[^>]*>/i;
  const replacement = `<link rel="canonical" href="${escapeHtml(canonicalUrl)}" />`;
  return expression.test(html)
    ? html.replace(expression, replacement)
    : html.replace("</head>", `    ${replacement}\n  </head>`);
}

const organization = {
  "@type": "Organization",
  "@id": `${siteOrigin}/#organization`,
  name: "ARCUS — Bridge Failure Research",
  url: siteOrigin,
  logo: `${siteOrigin}/favicon.svg`,
  email: "info@arcusbridges.org",
  founder: { "@id": `${siteOrigin}/about#christian-paolini` },
  sameAs: ["https://www.linkedin.com/company/arcusbridges/"],
};

const website = {
  "@type": "WebSite",
  "@id": `${siteOrigin}/#website`,
  name: "ARCUS — Bridge Failure Research",
  alternateName: "ARCUS",
  url: siteOrigin,
  inLanguage: ["en", "it"],
  publisher: { "@id": `${siteOrigin}/#organization` },
};

const person = {
  "@type": "Person",
  "@id": `${siteOrigin}/about#christian-paolini`,
  name: "Christian Paolini",
  jobTitle: "Scientific curator and ARCUS project lead",
  email: "research@arcusbridges.org",
  url: `${siteOrigin}/about`,
};

const dataset = {
  "@type": "Dataset",
  "@id": `${siteOrigin}/data-access#dataset`,
  name: "ARCUS Open Research — Bridge collapse events in Italy, 2000–2026",
  alternateName: manifest.version,
  description: `Versioned research dataset of ${manifest.event_count} documented bridge-collapse events in Italy, connected to ${manifest.source_count} documentary sources, explicit classifications and geospatial records.`,
  url: `${siteOrigin}/data-access`,
  version: manifest.version,
  dateModified: manifest.generated_at,
  temporalCoverage: "2000/2026",
  spatialCoverage: { "@type": "Place", name: "Italy" },
  creator: person,
  publisher: organization,
  isBasedOn: paperDoi,
  license: manifest.license.url,
  conditionsOfAccess: "Public read-only access; no account required. Non-commercial reuse under CC BY-NC 4.0.",
  keywords: [
    "bridge collapse",
    "bridge failure",
    "structural engineering",
    "infrastructure safety",
    "Italy",
    "open research data",
  ],
  distribution: [
    ["ARCUS events — CSV", "events.csv", "text/csv"],
    ["ARCUS events — GeoJSON", "events.geojson", "application/geo+json"],
    ["ARCUS documentary sources — JSON", "sources.json", "application/json"],
    ["ARCUS release manifest — JSON", "manifest.json", "application/json"],
  ].map(([name, fileName, encodingFormat]) => ({
    "@type": "DataDownload",
    name,
    contentUrl: `${siteOrigin}/data/open-release/${fileName}`,
    encodingFormat,
  })),
};

const article = {
  "@type": "ScholarlyArticle",
  "@id": paperDoi,
  headline: "Dataset of Bridge Collapses in Italy Spanning more than 25 years (2000–2025)",
  datePublished: "2026",
  identifier: paperDoi,
  url: paperDoi,
  isPartOf: { "@type": "Periodical", name: "Data in Brief" },
  author: [
    "Christian Paolini",
    "Marco Civera",
    "Manuel D’Angelo",
    "Pier Francesco Giordano",
    "Paolo Borlenghi",
    "Francesco Ballio",
    "Bernardino Chiaia",
    "Maria Pina Limongelli",
  ].map((name) => ({ "@type": "Person", name })),
};

const fallbackStyle = `
<style id="arcus-static-style">
  .arcus-static-document{min-height:100vh;background:#f3f0e8;color:#173f40;font:16px/1.65 Inter,Arial,sans-serif;padding:2rem clamp(1.25rem,5vw,5rem)}
  .arcus-static-document>*{max-width:1120px;margin-inline:auto}.arcus-static-document header{border-bottom:1px solid #cfc9bc;padding-bottom:1rem}
  .arcus-static-document nav{display:flex;flex-wrap:wrap;gap:.65rem 1.2rem;margin-top:1rem}.arcus-static-document a{color:#9d5d25}
  .arcus-static-document h1,.arcus-static-document h2{font-family:Georgia,serif;font-weight:500;line-height:1.12}.arcus-static-document h1{font-size:clamp(2.25rem,6vw,4.75rem);max-width:18ch}
  .arcus-static-document article{padding-block:3rem}.arcus-static-document dl{display:grid;grid-template-columns:minmax(10rem,16rem) 1fr;gap:.5rem 1.5rem}
  .arcus-static-document dt{font-weight:700}.arcus-static-document dd{margin:0}.arcus-static-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(15rem,1fr));gap:.75rem 1.5rem;padding:0}
  .arcus-static-grid li{list-style:none;border-top:1px solid #cfc9bc;padding-top:.55rem}.arcus-static-document footer{border-top:1px solid #cfc9bc;padding-top:1rem;color:#526463;font-size:.9rem}
</style>`;

function navigation() {
  return `<nav aria-label="Primary">
    <a href="/atlas">Atlas</a><a href="/analytics">Analytics</a><a href="/methodology">Methodology</a>
    <a href="/publications">Publications</a><a href="/data-access">Data</a><a href="/contribute">Contribute</a><a href="/about">About</a>
  </nav>`;
}

function staticShell(content) {
  return `<main class="arcus-static-document" id="main-content" data-arcus-prerendered="true">
    <header><a href="/" aria-label="ARCUS home"><strong>ARCUS — Bridge Failure Research</strong></a>${navigation()}</header>
    <article>${content}</article>
    <footer>ARCUS Open Research · ${escapeHtml(manifest.version)} · ${escapeHtml(manifest.license.name)}</footer>
  </main>`;
}

function pageDocument({ canonicalPath, description, graph = [], content, title, type = "website" }) {
  const canonicalUrl = canonicalPath === "/" ? `${siteOrigin}/` : `${siteOrigin}${canonicalPath}`;
  const fullTitle = title === "ARCUS" ? title : `${title} | ARCUS`;
  let html = template.replace(/<html\s+lang=["'][^"']+["']/, '<html lang="en"');

  html = html.replace(/<title>[^<]*<\/title>/i, `<title>${escapeHtml(fullTitle)}</title>`);
  html = replaceCanonical(html, canonicalUrl);
  html = replaceMeta(html, "name", "description", description);
  html = replaceMeta(html, "name", "robots", "index, follow");
  html = replaceMeta(html, "name", "twitter:title", fullTitle);
  html = replaceMeta(html, "name", "twitter:description", description);
  html = replaceMeta(html, "property", "og:title", fullTitle);
  html = replaceMeta(html, "property", "og:description", description);
  html = replaceMeta(html, "property", "og:type", type);
  html = replaceMeta(html, "property", "og:url", canonicalUrl);
  html = html.replace(
    "</head>",
    `    ${fallbackStyle}\n    <script id="arcus-static-structured-data" type="application/ld+json">${safeJsonLd({
      "@context": "https://schema.org",
      "@graph": [website, organization, ...graph],
    })}</script>\n  </head>`,
  );
  html = html.replace('<div id="root"></div>', `<div id="root">${staticShell(content)}</div>`);
  return html;
}

function writeRoute(routePath, html) {
  if (routePath === "/") {
    fs.writeFileSync(templatePath, html);
    return;
  }
  const targetDirectory = path.join(outputRoot, ...routePath.split("/").filter(Boolean));
  fs.mkdirSync(targetDirectory, { recursive: true });
  fs.writeFileSync(path.join(targetDirectory, "index.html"), html);
}

function webPage(pathname, name, description) {
  return {
    "@type": "WebPage",
    "@id": `${siteOrigin}${pathname}#webpage`,
    name,
    description,
    url: `${siteOrigin}${pathname}`,
    isPartOf: { "@id": `${siteOrigin}/#website` },
    publisher: { "@id": `${siteOrigin}/#organization` },
  };
}

const corePages = [
  {
    path: "/",
    title: "ARCUS",
    description: "ARCUS is an open research infrastructure for documented bridge-collapse events, sources, classifications and reproducible analysis in Italy.",
    graph: [],
    content: `<p>Italian Bridge Collapse Database</p><h1>Bridge-collapse evidence, open to research.</h1><p>Explore ${manifest.event_count} georeferenced events, ${manifest.source_count} documentary sources and explicit classifications through a public Atlas and a complete, citable research release.</p><p><a href="/atlas">Open the Atlas</a> · <a href="/data-access">Access the data</a></p>`,
  },
  {
    path: "/atlas",
    title: "Bridge Collapse Atlas",
    description: "ARCUS geospatial atlas of documented bridge collapses, with taxonomies, timeline and inspectable documentary sources.",
    graph: [webPage("/atlas", "ARCUS Bridge Collapse Atlas", "Geospatial atlas of documented bridge-collapse events in Italy."), {
      "@type": "ItemList",
      "@id": `${siteOrigin}/atlas#events`,
      name: "ARCUS documented bridge-collapse events",
      numberOfItems: events.length,
      itemListElement: events.map((event, index) => ({
        "@type": "ListItem",
        position: index + 1,
        url: `${siteOrigin}/atlas/events/${event.event_slug}`,
        name: eventName(event),
      })),
    }],
    content: `<p>ARCUS Atlas</p><h1>Documented bridge-collapse events in Italy</h1><p>Browse ${events.length} event records. Each dossier preserves its ARCUS identifier, source links, classifications and declared limits.</p><ul class="arcus-static-grid">${events.map((event) => `<li><a href="/atlas/events/${escapeHtml(event.event_slug)}">${escapeHtml(eventName(event))}</a><br><small>${escapeHtml([event.date, event.municipality, event.province].filter(Boolean).join(" · "))}</small></li>`).join("")}</ul>`,
  },
  {
    path: "/analytics",
    title: "ARCUS Analytics",
    description: "Descriptive analysis of documented bridge-collapse events with declared filters, evidence limits and reproducible outputs.",
    content: "<p>ARCUS Analytics</p><h1>Read patterns without losing the evidence.</h1><p>Explore descriptive distributions and declared filters across the current public release. ARCUS Analytics does not predict future failures or replace engineering assessment.</p>",
  },
  {
    path: "/methodology",
    title: "ARCUS Methodology",
    description: "ARCUS methodology for event identity, source validation, geolocation, classification, uncertainty and versioned research releases.",
    content: "<p>Scientific method</p><h1>Validation, classification and uncertainty remain explicit.</h1><p>ARCUS connects every analytical result to event records and documentary evidence, preserving provenance, uncertainty and known limitations.</p>",
  },
  {
    path: "/data-access",
    title: "ARCUS Data Access",
    description: `Access the ${manifest.version} public research release: ${manifest.event_count} documented events, ${manifest.source_count} sources, schema, taxonomy and quality audit.`,
    graph: [dataset],
    content: `<p>ARCUS Open Research</p><h1>Access the versioned research release.</h1><p>${escapeHtml(manifest.citation)}</p><dl><dt>Version</dt><dd>${escapeHtml(manifest.version)}</dd><dt>Events</dt><dd>${manifest.event_count}</dd><dt>Sources</dt><dd>${manifest.source_count}</dd><dt>Licence</dt><dd><a href="${escapeHtml(manifest.license.url)}">${escapeHtml(manifest.license.name)}</a></dd></dl><p><a href="/data/open-release/events.csv">Events CSV</a> · <a href="/data/open-release/events.geojson">Events GeoJSON</a> · <a href="/data/open-release/manifest.json">Manifest JSON</a> · <a href="/dataset.json">Dataset metadata</a></p>`,
  },
  {
    path: "/publications",
    title: "Publications and Scientific Basis",
    description: "Peer-reviewed publication, current ARCUS release and citation guidance for the ARCUS bridge-collapse research infrastructure.",
    graph: [article, dataset],
    content: `<p>ARCUS Research</p><h1>Publications and scientific basis</h1><h2>${escapeHtml(article.headline)}</h2><p>Paolini et al. · Data in Brief 64 (2026)</p><p><a href="${paperDoi}">DOI 10.1016/j.dib.2025.112375</a></p><h2>Current Open release</h2><p>${escapeHtml(manifest.citation)}</p>`,
  },
  {
    path: "/contribute",
    title: "Contribute Evidence",
    description: "Submit a documented event, source, correction, coordinate or classification for ARCUS editorial review.",
    content: "<p>Contribute to ARCUS</p><h1>Improve the evidence base.</h1><p>Researchers, practitioners and informed contributors can propose documented events, sources, corrections, coordinates and classifications. Every submission enters editorial review before publication.</p><p><a href=\"mailto:contribute@arcusbridges.org\">contribute@arcusbridges.org</a></p>",
  },
  {
    path: "/about",
    title: "About ARCUS",
    description: "Identity, scientific stewardship and principles of ARCUS, an independent open research infrastructure for documented bridge collapses.",
    graph: [person],
    content: "<p>ARCUS identity</p><h1>An open research infrastructure for bridge-collapse evidence.</h1><p>ARCUS curates documented bridge-collapse events as a versioned, inspectable evidence base. Christian Paolini is the scientific curator and ARCUS project lead.</p>",
  },
  {
    path: "/privacy",
    title: "Privacy",
    description: "ARCUS privacy information for website visitors and evidence contributors.",
    content: "<p>ARCUS governance</p><h1>Privacy</h1><p>Read how ARCUS handles website access data and information submitted through the contribution process.</p>",
  },
  {
    path: "/rights",
    title: "Rights and Reuse",
    description: "ARCUS rights, CC BY-NC 4.0 data licence, third-party source boundaries and attribution requirements.",
    content: `<p>Rights and reuse</p><h1>Clear rights for a traceable evidence base.</h1><p>ARCUS-authored event metadata and taxonomy definitions in the public release are licensed under <a href="${escapeHtml(manifest.license.url)}">CC BY-NC 4.0</a>. Linked third-party sources retain their original rights.</p>`,
  },
];

function eventName(event) {
  return event.bridge_name
    || (event.bridge_crossing_name ? `Bridge over ${event.bridge_crossing_name}` : null)
    || `Bridge-collapse event in ${event.municipality || event.province || "Italy"}`;
}

function eventGraph(event, eventSources) {
  const pageUrl = `${siteOrigin}/atlas/events/${event.event_slug}`;
  const properties = [
    ["ARCUS event identifier", event.event_id],
    ["Collapse severity", event.collapse_severity],
    ["Structural type", event.structural_type],
    ["Material", event.material_type],
    ["Cause category", event.cause_category],
    ["Specific cause", event.specific_cause],
    ["Failure trigger", event.failure_trigger],
    ["Failure process", event.failure_process],
    ["Component involved", event.component_involved],
    ["Source confidence", event.source_confidence],
  ].filter(([, value]) => value !== null && value !== undefined && value !== "")
    .map(([propertyID, value]) => ({ "@type": "PropertyValue", propertyID, value }));

  return {
    "@type": "WebPage",
    "@id": `${pageUrl}#record`,
    url: pageUrl,
    name: `${eventName(event)} — ARCUS event record`,
    description: event.description,
    isPartOf: { "@id": `${siteOrigin}/#website` },
    mainEntity: {
      "@type": "Thing",
      "@id": `${pageUrl}#event`,
      name: eventName(event),
      identifier: event.event_id,
      description: event.description,
      temporalCoverage: event.date,
      location: {
        "@type": "Place",
        name: [event.municipality, event.province, event.region, "Italy"].filter(Boolean).join(", "),
        geo: Number.isFinite(Number(event.latitude)) && Number.isFinite(Number(event.longitude))
          ? { "@type": "GeoCoordinates", latitude: Number(event.latitude), longitude: Number(event.longitude) }
          : undefined,
      },
      additionalProperty: properties,
      subjectOf: eventSources.map((source) => ({
        "@type": "CreativeWork",
        name: source.source_title || source.source_reference || source.source_id,
        identifier: source.source_id,
        url: source.source_url || undefined,
        datePublished: source.publication_date || undefined,
        inLanguage: source.language || undefined,
      })),
    },
    publisher: organization,
    license: manifest.license.url,
  };
}

function eventContent(event, eventSources) {
  const fields = [
    ["ARCUS ID", event.event_id],
    ["Date", event.date],
    ["Municipality", event.municipality],
    ["Province", event.province],
    ["Region", event.region],
    ["Coordinates", Number.isFinite(Number(event.latitude)) && Number.isFinite(Number(event.longitude)) ? `${event.latitude}, ${event.longitude}${event.exact_location ? " · exact location" : " · approximate location"}` : null],
    ["Crossing", event.bridge_crossing_name],
    ["Use", event.destination_use],
    ["Severity", event.collapse_severity],
    ["Structural type", event.structural_type],
    ["Material", event.material_type],
    ["Construction year", event.construction_year],
    ["Cause category", event.cause_category],
    ["Specific cause", event.specific_cause],
    ["Failure trigger", event.failure_trigger],
    ["Failure process", event.failure_process],
    ["Component involved", event.component_involved],
    ["Cause evidence", event.failure_cause_evidence],
    ["Source confidence", event.source_confidence],
    ["Victims", event.victims],
    ["Injuries", event.injuries],
  ].filter(([, value]) => value !== null && value !== undefined && value !== "");

  const sourceItems = eventSources.length
    ? `<ol>${eventSources.map((source) => {
        const label = source.source_title || source.source_reference || source.source_id;
        const meta = [source.source_role, source.source_type, source.publication_date].filter(Boolean).join(" · ");
        return `<li>${source.source_url ? `<a href="${escapeHtml(source.source_url)}" rel="noreferrer">${escapeHtml(label)}</a>` : escapeHtml(label)}${meta ? ` <small>(${escapeHtml(meta)})</small>` : ""}</li>`;
      }).join("")}</ol>`
    : "<p>No documentary source is published for this record in the current release.</p>";

  return `<p>ARCUS Atlas record</p><h1>${escapeHtml(eventName(event))}</h1><p>${escapeHtml(event.description || "Documented bridge-collapse event.")}</p><dl>${fields.map(([label, value]) => `<dt>${escapeHtml(label)}</dt><dd>${escapeHtml(value)}</dd>`).join("")}</dl><h2>Documentary sources (${eventSources.length})</h2>${sourceItems}<p><a href="/atlas">Return to the Atlas</a> · <a href="/contribute">Propose a correction or new evidence</a></p>`;
}

for (const page of corePages) {
  const graph = page.graph || [webPage(page.path, page.title, page.description)];
  writeRoute(page.path, pageDocument({
    canonicalPath: page.path,
    description: page.description,
    graph,
    content: page.content,
    title: page.title,
  }));
}

for (const event of events) {
  const eventSources = sourceGroups.get(event.event_id) || [];
  const name = eventName(event);
  const place = [event.municipality, event.province].filter(Boolean).join(", ");
  const description = concise(`${name}: documented bridge-collapse event ${event.date ? `on ${event.date}` : ""}${place ? ` in ${place}` : ""}. ARCUS ID ${event.event_id}; ${eventSources.length} linked documentary source${eventSources.length === 1 ? "" : "s"}.`);

  writeRoute(`/atlas/events/${event.event_slug}`, pageDocument({
    canonicalPath: `/atlas/events/${event.event_slug}`,
    description,
    graph: [eventGraph(event, eventSources)],
    content: eventContent(event, eventSources),
    title: name,
    type: "article",
  }));
}

const lastModified = String(manifest.generated_at || new Date().toISOString()).slice(0, 10);
const sitemapRoutes = [
  ...corePages.map((page) => page.path),
  ...events.map((event) => `/atlas/events/${event.event_slug}`),
];
const sitemap = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${sitemapRoutes.map((route) => {
  const location = route === "/" ? `${siteOrigin}/` : `${siteOrigin}${route}`;
  return `  <url><loc>${escapeXml(location)}</loc><lastmod>${lastModified}</lastmod></url>`;
}).join("\n")}\n</urlset>\n`;

fs.writeFileSync(path.join(outputRoot, "sitemap.xml"), sitemap);

console.log(`ARCUS SEO: generated ${corePages.length} core pages, ${events.length} event dossiers and ${sitemapRoutes.length} sitemap URLs.`);
