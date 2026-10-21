// Shared by crawlable HTML and React so hydration and language changes agree.
export const publicPageMetadataUpdatedAt = "2026-10-21";

export const publicPageMetadata = {
  "/": {
    it: {
      title: "ARCUS | Database dei crolli dei ponti in Italia",
      description: "Esplora i crolli documentati dei ponti in Italia: mappa degli eventi, fonti, classificazioni e dati di ricerca consultabili e citabili con ARCUS.",
    },
    en: {
      title: "ARCUS | Bridge Collapse Database in Italy",
      description: "Explore documented bridge collapses in Italy: an event atlas, sources, classifications and citable research data through ARCUS.",
    },
  },
  "/atlas/": {
    it: { title: "Atlante dei crolli dei ponti in Italia | ARCUS", description: "Consulta la mappa dei crolli documentati dei ponti in Italia, con schede degli eventi, date, classificazioni, fonti e limiti delle evidenze." },
    en: { title: "Bridge Collapse Atlas of Italy | ARCUS", description: "Browse the map of documented bridge collapses in Italy, with event records, dates, classifications, sources and evidence limitations." },
  },
  "/analytics/": {
    it: { title: "Analisi dei crolli dei ponti in Italia | ARCUS", description: "Esplora le distribuzioni degli eventi documentati in ARCUS, con filtri espliciti e limiti delle evidenze. Analisi descrittive, non previsioni di crollo." },
    en: { title: "Bridge Collapse Analytics | ARCUS", description: "Explore distributions of documented ARCUS events with explicit filters and evidence limitations. Descriptive analysis, not failure prediction." },
  },
  "/methodology/": {
    it: { title: "Metodologia, fonti e qualità dei dati | ARCUS", description: "Come ARCUS revisiona i dati sui crolli dei ponti: provenienza, classificazioni, localizzazione, incertezze e responsabilità delle release di ricerca." },
    en: { title: "Methodology, Sources and Data Quality | ARCUS", description: "How ARCUS reviews bridge-collapse data: provenance, classifications, geolocation, uncertainty and responsibility for research releases." },
  },
  "/data-access/": {
    it: { title: "Dataset dei crolli dei ponti: accesso e citazione | ARCUS", description: "Accedi alla release pubblica ARCUS: eventi, fonti, schema e tassonomie. Consulta le versioni e le indicazioni per citare e riutilizzare i dati." },
    en: { title: "Bridge Collapse Dataset: Access and Citation | ARCUS", description: "Access the ARCUS public release: events, sources, schema and taxonomies. Find versions and guidance on citing and reusing the data." },
  },
  "/publications/": {
    it: { title: "Pubblicazioni e provenienza scientifica | ARCUS", description: "Il dataset originario su Data in Brief, gli studi utilizzati e la release ARCUS: pubblicazioni, attribuzione dei contributi e indicazioni di citazione." },
    en: { title: "Publications and Scientific Provenance | ARCUS", description: "The original Data in Brief dataset, reused studies and the ARCUS release: publications, research credits and citation guidance." },
  },
  "/contribute/": {
    it: { title: "Contribuisci: segnala eventi, fonti e correzioni | ARCUS", description: "Proponi un evento documentato, una fonte o una correzione sui crolli dei ponti. I contributi ad ARCUS sono sottoposti a revisione prima della pubblicazione." },
    en: { title: "Contribute Events, Sources and Corrections | ARCUS", description: "Propose a documented bridge-collapse event, source or correction. Contributions to ARCUS undergo editorial review before publication." },
  },
  "/about/": {
    it: { title: "Il progetto ARCUS: identità e curatela scientifica", description: "Scopri ARCUS, l’infrastruttura di ricerca aperta sui crolli documentati dei ponti: identità del progetto, curatela scientifica e principi editoriali." },
    en: { title: "About ARCUS: Identity and Scientific Stewardship", description: "Learn about ARCUS, an open research infrastructure for documented bridge collapses: project identity, scientific stewardship and editorial principles." },
  },
  "/privacy/": {
    it: { title: "Privacy e trattamento dei dati | ARCUS", description: "Informazioni sul trattamento dei dati di navigazione e dei dati inviati da chi contribuisce alla piattaforma ARCUS." },
    en: { title: "Privacy and Data Processing | ARCUS", description: "Information about website access data and information submitted by contributors to the ARCUS platform." },
  },
  "/rights/": {
    it: { title: "Diritti, licenza e riutilizzo dei dati | ARCUS", description: "Licenza CC BY-NC 4.0 per i dati ARCUS, requisiti di attribuzione e limiti del riutilizzo delle fonti e dei materiali di terzi." },
    en: { title: "Rights, Licensing and Data Reuse | ARCUS", description: "ARCUS data under CC BY-NC 4.0, attribution requirements and reuse boundaries for third-party sources and materials." },
  },
};

export function getPublicPageMetadata(pathname, language = "it") {
  const route = `${String(pathname).replace(/\/+$/, "")}/`;
  return publicPageMetadata[route]?.[language === "en" ? "en" : "it"] || null;
}

export function formatPageTitle(title) {
  return /\bARCUS\b/.test(title) ? title : `${title} | ARCUS`;
}
