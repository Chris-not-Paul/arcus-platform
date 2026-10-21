import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { originalDatasetCredits, hydraulicResearchCredits } from "../src/config/researchCredits.js";
import { canonicalPagePath, canonicalPageUrl } from "../src/utils/publicPageUrl.js";
import { researchLineage } from "../src/config/researchLineage.js";
import { formatPageTitle, getPublicPageMetadata, publicPageMetadataUpdatedAt } from "../src/config/publicPageMetadata.js";

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
  inLanguage: ["it", "en"],
  publisher: { "@id": `${siteOrigin}/#organization` },
};

const person = {
  "@type": "Person",
  "@id": `${siteOrigin}/about#christian-paolini`,
  name: "Christian Paolini",
  jobTitle: "Scientific curator and ARCUS project lead",
  email: "research@arcusbridges.org",
  url: canonicalPageUrl(siteOrigin, "/about"),
};

const dataset = {
  "@type": "Dataset",
  "@id": `${siteOrigin}/data-access#dataset`,
  name: "ARCUS Open Research — Bridge collapse events in Italy, 2000–2026",
  alternateName: manifest.version,
  description: `Versioned research dataset of ${manifest.event_count} documented bridge-collapse events in Italy, connected to ${manifest.source_count} documentary sources, explicit classifications and geospatial records.`,
  url: canonicalPageUrl(siteOrigin, "/data-access"),
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

function navigation(language) {
  const labels = language === "it"
    ? ["Atlante", "Analisi", "Metodologia", "Pubblicazioni", "Dati", "Contribuisci", "Il progetto"]
    : ["Atlas", "Analytics", "Methodology", "Publications", "Data", "Contribute", "About"];
  return `<nav aria-label="${language === "it" ? "Navigazione principale" : "Primary"}">
    ${["atlas", "analytics", "methodology", "publications", "data-access", "contribute", "about"].map((route, index) => `<a href="/${route}/">${labels[index]}</a>`).join("")}
  </nav>`;
}

function staticShell(content, language) {
  return `<main class="arcus-static-document" id="main-content" data-arcus-prerendered="true">
    <header><a href="/" aria-label="ARCUS home"><strong>ARCUS — Bridge Failure Research</strong></a>${navigation(language)}</header>
    <article>${content}</article>
    <footer>ARCUS Open Research · ${escapeHtml(manifest.version)} · ${escapeHtml(manifest.license.name)}</footer>
  </main>`;
}

function pageDocument({ canonicalPath, description, graph = [], content, title, type = "website", language = "it" }) {
  const canonicalUrl = canonicalPageUrl(siteOrigin, canonicalPath);
  const fullTitle = formatPageTitle(title);
  let html = template.replace(/<html\s+lang=["'][^"']+["']/, `<html lang="${language}"`);

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
  html = replaceMeta(html, "property", "og:locale", language === "it" ? "it_IT" : "en_GB");
  html = html.replace(
    "</head>",
    `    ${fallbackStyle}\n    <script id="arcus-static-structured-data" type="application/ld+json">${safeJsonLd({
      "@context": "https://schema.org",
      "@graph": [website, organization, ...graph],
    })}</script>\n  </head>`,
  );
  html = html.replace('<div id="root"></div>', `<div id="root">${staticShell(content, language)}</div>`);
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
    inLanguage: "it",
    url: canonicalPageUrl(siteOrigin, pathname),
    isPartOf: { "@id": `${siteOrigin}/#website` },
    publisher: { "@id": `${siteOrigin}/#organization` },
  };
}

function lineageContent() {
  const text = researchLineage.it;
  return `<section id="dataset-lineage"><h2>${escapeHtml(text.title)}</h2><p>${escapeHtml(text.overview)}</p><ol>${text.steps.map((step) => `<li><h3>${escapeHtml(step.title)}</h3><p>${escapeHtml(step.text)}</p></li>`).join("")}</ol><p>${escapeHtml(text.limit)}</p><p>${escapeHtml(text.hydraulic)}</p><p><a href="/publications/#scientific-provenance">${escapeHtml(text.provenanceLink)}</a> · <a href="/data-access/">${escapeHtml(text.releaseLink)}</a></p></section>`;
}

const corePages = [
  {
    path: "/",
    graph: [],
    content: `<p>Database dei crolli dei ponti in Italia</p><h1>Evidenze sui crolli dei ponti, aperte alla ricerca.</h1><p>Esplora ${manifest.event_count} eventi georeferenziati, ${manifest.source_count} record di fonte e classificazioni esplicite attraverso un atlante pubblico e una release di ricerca consultabile e citabile.</p><p><a href="/atlas/">Apri l’Atlante</a> · <a href="/data-access/">Accedi ai dati</a></p>`,
  },
  {
    path: "/atlas",
    graph: [webPage("/atlas", getPublicPageMetadata("/atlas").title, getPublicPageMetadata("/atlas").description), {
      "@type": "ItemList",
      "@id": `${siteOrigin}/atlas#events`,
      name: "ARCUS: eventi documentati di crollo di ponti",
      numberOfItems: events.length,
      itemListElement: events.map((event, index) => ({
        "@type": "ListItem",
        position: index + 1,
        url: canonicalPageUrl(siteOrigin, `/atlas/events/${event.event_slug}`),
        name: eventName(event),
      })),
    }],
    content: `<p>Atlante ARCUS</p><h1>Eventi documentati di crollo di ponti in Italia</h1><p>Consulta ${events.length} schede di evento. Ogni scheda conserva l’identificativo ARCUS, i collegamenti alle fonti, le classificazioni e i limiti dichiarati.</p><ul class="arcus-static-grid">${events.map((event) => `<li><a href="${escapeHtml(canonicalPagePath(`/atlas/events/${event.event_slug}`))}">${escapeHtml(eventName(event))}</a><br><small>${escapeHtml([event.date, event.municipality, event.province].filter(Boolean).join(" · "))}</small></li>`).join("")}</ul>`,
  },
  {
    path: "/analytics",
    content: "<p>Analisi ARCUS</p><h1>Leggere le ricorrenze senza perdere le evidenze.</h1><p>Esplora distribuzioni descrittive e filtri dichiarati nella release pubblica corrente. Le analisi ARCUS non prevedono crolli futuri e non sostituiscono la valutazione ingegneristica.</p>",
  },
  {
    path: "/methodology",
    content: `<p>Metodo scientifico</p><h1>Come ARCUS organizza le evidenze</h1><p>ARCUS distingue documentazione degli eventi, classificazioni editoriali e informazioni non risolte. Le fonti elencate non confermano automaticamente ogni campo; più URL non costituiscono necessariamente conferme indipendenti. Il conteggio dei record di fonte include riutilizzi tra eventi e citazioni di contesto scientifico, non solo documenti unici.</p>${lineageContent()}<p>Le schede supportano la ricerca comparativa, non certificano la sicurezza strutturale né stimano probabilità di crollo. Le definizioni strutturali TC/PC di NYSDOT restano distinte dall’estensione operativa ARCUS, identificata separatamente, per il collasso fisico del rilevato di accesso. Evidenze non risolte e decisioni editoriali restano distinguibili nelle note delle schede.</p>`,
  },
  {
    path: "/data-access",
    graph: [dataset],
    content: `<p>ARCUS Open Research</p><h1>Accedi alla release di ricerca versionata.</h1><p>${escapeHtml(manifest.citation)}</p><dl><dt>Versione</dt><dd>${escapeHtml(manifest.version)}</dd><dt>Eventi</dt><dd>${manifest.event_count}</dd><dt>Record di fonte</dt><dd>${manifest.source_count}</dd><dt>Licenza</dt><dd><a href="${escapeHtml(manifest.license.url)}">${escapeHtml(manifest.license.name)}</a></dd></dl><p><a href="/data/open-release/events.csv">Eventi CSV</a> · <a href="/data/open-release/events.geojson">Eventi GeoJSON</a> · <a href="/data/open-release/manifest.json">Manifest JSON</a> · <a href="/dataset.json">Metadati del dataset</a></p>`,
  },
  {
    path: "/publications",
    graph: [article, dataset],
    content: `<p>Ricerca ARCUS</p><h1>Pubblicazioni e basi scientifiche</h1><h2>${escapeHtml(article.headline)}</h2><p>${escapeHtml(originalDatasetCredits.authors.join(", "))} · Data in Brief 64 (2026)</p><p><a href="${paperDoi}">DOI 10.1016/j.dib.2025.112375</a></p><section id="scientific-provenance"><h2>Provenienza e contributi scientifici</h2><p>Il dataset originario e le ricerche pregresse in esso confluite sono contributi collettivi, non il lavoro esclusivo del curatore ARCUS.</p><h3>${escapeHtml(hydraulicResearchCredits.title)}</h3><p>${escapeHtml(hydraulicResearchCredits.authors.join(", "))} (2025). <a href="${hydraulicResearchCredits.doi}">Articolo e dataset supplementare S3</a>.</p><p>Nei record corrispondenti, lunghezze e classificazioni idrauliche riutilizzate sono attribuite a questo lavoro. Le sole citazioni di contesto scientifico non confermano ogni dettaglio dell’evento.</p><p>Christian Paolini ha ideato e sviluppato ARCUS e ne cura le release. Le successive modifiche ARCUS restano distinte dai lavori di origine e non implicano l’approvazione dei loro autori.</p><p>${escapeHtml(researchLineage.it.overview)}</p><p>${escapeHtml(researchLineage.it.limit)}</p><a href="/methodology/#dataset-lineage">${escapeHtml(researchLineage.it.title)}</a></section><h2>Release Open corrente</h2><p>${escapeHtml(manifest.citation)}</p>`,
  },
  {
    path: "/contribute",
    content: "<p>Contribuisci ad ARCUS</p><h1>Migliora la base documentale.</h1><p>Ricercatori, professionisti e contributori informati possono proporre eventi documentati, fonti, correzioni, coordinate e classificazioni. Ogni segnalazione è sottoposta a revisione editoriale prima della pubblicazione.</p><p><a href=\"mailto:contribute@arcusbridges.org\">contribute@arcusbridges.org</a></p>",
  },
  {
    path: "/about",
    graph: [person],
    content: "<p>Identità ARCUS</p><h1>Un’infrastruttura di ricerca aperta sulle evidenze dei crolli dei ponti.</h1><p>ARCUS cura eventi documentati di crollo di ponti in una base di evidenze versionata e consultabile. Christian Paolini è il curatore scientifico e responsabile del progetto ARCUS.</p>",
  },
  {
    path: "/privacy",
    content: "<p>Governance ARCUS</p><h1>Privacy</h1><p>Consulta le informazioni sul trattamento dei dati di accesso al sito e delle informazioni inviate attraverso il processo di contribuzione.</p>",
  },
  {
    path: "/rights",
    content: `<p>Diritti e riutilizzo</p><h1>Diritti chiari per una base documentale tracciabile.</h1><p>I metadati degli eventi e le definizioni delle tassonomie prodotti da ARCUS nella release pubblica sono disponibili con licenza <a href="${escapeHtml(manifest.license.url)}">CC BY-NC 4.0</a>. Le fonti di terzi collegate conservano i rispettivi diritti.</p>`,
  },
].map((page) => ({ ...page, ...getPublicPageMetadata(page.path) }));

function eventName(event) {
  return event.bridge_name
    || (event.bridge_crossing_name ? `Bridge over ${event.bridge_crossing_name}` : null)
    || `Bridge-collapse event in ${event.municipality || event.province || "Italy"}`;
}

function eventGraph(event, eventSources) {
  const pageUrl = canonicalPageUrl(siteOrigin, `/atlas/events/${event.event_slug}`);
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

  return `<p>ARCUS Atlas record</p><h1>${escapeHtml(eventName(event))}</h1><p>${escapeHtml(event.description || "Documented bridge-collapse event.")}</p>${event.documentary_notes_en ? `<h2>Documentary notes and limitations</h2><p>${escapeHtml(event.documentary_notes_en)}</p>` : ""}<dl>${fields.map(([label, value]) => `<dt>${escapeHtml(label)}</dt><dd>${escapeHtml(value)}</dd>`).join("")}</dl><h2>Sources and scientific context (${eventSources.length})</h2>${sourceItems}<p><a href="/atlas">Return to the Atlas</a> · <a href="/contribute">Propose a correction or new evidence</a></p>`;
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
    // Dossier fallback prose is still English; do not mislabel it as Italian.
    language: "en",
  }));
}

const lastModified = String(manifest.generated_at || new Date().toISOString()).slice(0, 10);
const coreLastModified = [lastModified, publicPageMetadataUpdatedAt].sort().at(-1);
const sitemapRoutes = [
  ...corePages.map((page) => page.path),
  ...events.map((event) => `/atlas/events/${event.event_slug}`),
];
const sitemap = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${sitemapRoutes.map((route) => {
  const location = canonicalPageUrl(siteOrigin, route);
  const modified = corePages.some((page) => page.path === route) ? coreLastModified : lastModified;
  return `  <url><loc>${escapeXml(location)}</loc><lastmod>${modified}</lastmod></url>`;
}).join("\n")}\n</urlset>\n`;

fs.writeFileSync(path.join(outputRoot, "sitemap.xml"), sitemap);

console.log(`ARCUS SEO: generated ${corePages.length} core pages, ${events.length} event dossiers and ${sitemapRoutes.length} sitemap URLs.`);
