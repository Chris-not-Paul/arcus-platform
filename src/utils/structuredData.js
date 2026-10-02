import { siteOrigin } from "../config/site";

const paperDoi = "https://doi.org/10.1016/j.dib.2025.112375";
const releaseBaseUrl = `${siteOrigin}/data/open-release`;

export const arcusOrganization = Object.freeze({
  "@type": "Organization",
  "@id": `${siteOrigin}/#organization`,
  name: "ARCUS — Bridge Failure Research",
  url: siteOrigin,
  logo: `${siteOrigin}/favicon.svg`,
  email: "info@arcusbridges.org",
  founder: {
    "@id": `${siteOrigin}/about#christian-paolini`,
  },
  sameAs: ["https://www.linkedin.com/company/arcusbridges/"],
});

export const arcusWebsite = Object.freeze({
  "@type": "WebSite",
  "@id": `${siteOrigin}/#website`,
  name: "ARCUS — Bridge Failure Research",
  alternateName: "ARCUS",
  url: siteOrigin,
  inLanguage: ["en", "it"],
  publisher: {
    "@id": `${siteOrigin}/#organization`,
  },
});

export const christianPaolini = Object.freeze({
  "@type": "Person",
  "@id": `${siteOrigin}/about#christian-paolini`,
  name: "Christian Paolini",
  email: "research@arcusbridges.org",
  jobTitle: "Scientific curator and ARCUS project lead",
  memberOf: {
    "@type": "Organization",
    name: "IABSE Task Group 1.5 — Performance-Based Design Founded on Lessons from Bridge Failures",
  },
  url: `${siteOrigin}/about`,
});

export function arcusDataset(manifest = {}) {
  const version = manifest.version || "arcus-open-2026.11";
  const generatedAt = manifest.generated_at || "2026-10-01T07:00:23.163Z";
  const eventCount = manifest.event_count || 261;
  const sourceCount = manifest.source_count || 718;

  return {
    "@type": "Dataset",
    "@id": `${siteOrigin}/data-access#dataset`,
    name: "ARCUS Open Research — Bridge collapse events in Italy, 2000–2026",
    alternateName: version,
    description: `Versioned research dataset of ${eventCount} documented bridge-collapse events in Italy, connected to ${sourceCount} documentary sources, explicit classifications and geospatial records.`,
    url: `${siteOrigin}/data-access`,
    version,
    dateModified: generatedAt,
    temporalCoverage: "2000/2026",
    spatialCoverage: {
      "@type": "Place",
      name: "Italy",
    },
    creator: christianPaolini,
    publisher: arcusOrganization,
    isBasedOn: paperDoi,
    license: manifest.license?.url || "https://creativecommons.org/licenses/by-nc/4.0/",
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
      {
        "@type": "DataDownload",
        name: "ARCUS events — CSV",
        contentUrl: `${releaseBaseUrl}/events.csv`,
        encodingFormat: "text/csv",
      },
      {
        "@type": "DataDownload",
        name: "ARCUS events — GeoJSON",
        contentUrl: `${releaseBaseUrl}/events.geojson`,
        encodingFormat: "application/geo+json",
      },
      {
        "@type": "DataDownload",
        name: "ARCUS documentary sources — JSON",
        contentUrl: `${releaseBaseUrl}/sources.json`,
        encodingFormat: "application/json",
      },
      {
        "@type": "DataDownload",
        name: "ARCUS release manifest — JSON",
        contentUrl: `${releaseBaseUrl}/manifest.json`,
        encodingFormat: "application/json",
      },
    ],
  };
}

export const dataInBriefArticle = Object.freeze({
  "@type": "ScholarlyArticle",
  "@id": paperDoi,
  headline: "Dataset of Bridge Collapses in Italy Spanning more than 25 years (2000–2025)",
  name: "Dataset of Bridge Collapses in Italy Spanning more than 25 years (2000–2025)",
  datePublished: "2026",
  identifier: "https://doi.org/10.1016/j.dib.2025.112375",
  url: paperDoi,
  isPartOf: {
    "@type": "Periodical",
    name: "Data in Brief",
  },
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
});

export function eventDossierStructuredData(event, relatedSources = []) {
  if (!event?.event_slug) return null;

  const name = event.bridge_name
    || (event.bridge_crossing_name ? `Bridge over ${event.bridge_crossing_name}` : null)
    || `Bridge-collapse event in ${event.municipality || event.province || "Italy"}`;
  const pageUrl = `${siteOrigin}/atlas/events/${encodeURIComponent(event.event_slug)}`;
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
  ]
    .filter(([, value]) => value !== null && value !== undefined && value !== "")
    .map(([propertyID, value]) => ({
      "@type": "PropertyValue",
      propertyID,
      value,
    }));

  return {
    "@type": "WebPage",
    "@id": `${pageUrl}#record`,
    url: pageUrl,
    name: `${name} — ARCUS event record`,
    description: event.description || `Documented bridge-collapse event in ${event.municipality || "Italy"}.`,
    isPartOf: {
      "@id": `${siteOrigin}/#website`,
    },
    mainEntity: {
      "@type": "Thing",
      "@id": `${pageUrl}#event`,
      name,
      identifier: event.event_id,
      description: event.description || undefined,
      temporalCoverage: event.date || undefined,
      location: {
        "@type": "Place",
        name: [event.municipality, event.province, event.region, "Italy"].filter(Boolean).join(", "),
        geo: Number.isFinite(Number(event.latitude)) && Number.isFinite(Number(event.longitude))
          ? {
              "@type": "GeoCoordinates",
              latitude: Number(event.latitude),
              longitude: Number(event.longitude),
            }
          : undefined,
      },
      additionalProperty: properties,
      subjectOf: relatedSources.slice(0, 50).map((source) => ({
        "@type": "CreativeWork",
        name: source.source_title || source.source_reference || source.source_id,
        identifier: source.source_id,
        url: source.source_url || undefined,
        datePublished: source.publication_date || undefined,
        inLanguage: source.language || undefined,
      })),
    },
    about: {
      "@id": `${pageUrl}#event`,
    },
    publisher: arcusOrganization,
    license: "https://creativecommons.org/licenses/by-nc/4.0/",
  };
}

export function asJsonLdGraph(...items) {
  const graph = items.flat().filter(Boolean);
  return graph.length ? { "@context": "https://schema.org", "@graph": graph } : null;
}
