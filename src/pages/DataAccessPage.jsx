import {
  useEffect,
  useState,
} from "react";

import { Link } from "react-router-dom";

import Footer from "../components/layout/Footer";
import Navbar from "../components/layout/Navbar";
import PageMeta from "../components/layout/PageMeta";
import ArcusPageMark from "../components/brand/ArcusPageMark";

import useLanguage from "../context/useLanguage";
import { contactAddresses } from "../config/site";
import {
  openDownloadUrls,
  openManifest,
  openResourceUrls,
} from "../utils/apiClient";
import {
  arcusDataset,
  asJsonLdGraph,
} from "../utils/structuredData";

import "../styles/data-access-page.css";

function DataAccessPage() {
  const { language } = useLanguage();
  const [manifest, setManifest] = useState(null);

  useEffect(() => {
    let active = true;

    openManifest()
      .then((data) => active && setManifest(data))
      .catch(() => active && setManifest(null));

    return () => {
      active = false;
    };
  }, []);

  const copy =
    language === "it"
      ? {
          label: "ARCUS DATA ACCESS",
          title:
            "Accesso ai dati e release pubblica di ricerca.",
          text:
            "ARCUS Open pubblica una base scientifica versionata per consultazione, citazione, didattica e analisi riproducibile, con dati, fonti, tassonomia e controlli di qualità accessibili senza account.",
          openAtlas: "Apri Atlante",
          publicTitle: "Layer Open",
          publicText:
            "ARCUS Open Research pubblica una base scientifica curata senza account, con tassonomia, metodologia, audit e download completi.",
          resourcesTitle: "Pacchetto scientifico della release",
          resourcesText:
            "Dati, fonti, schema, tassonomia e controlli di qualità sono accessibili separatamente per rendere verificabile ogni analisi.",
          citationTitle: "Citazione della release",
          citationNote:
            "Citazione versionata disponibile; il DOI persistente della release ARCUS sarà aggiunto al deposito pubblico senza sostituire il DOI della pubblicazione scientifica originaria.",
          researchContact: "Domande sulla release o sul riuso scientifico",
          licenseTitle: "Licenza e diritti",
          licenseText:
            "I metadati e le tassonomie prodotti da ARCUS sono rilasciati CC BY-NC 4.0 per il riuso non commerciale. Gli usi commerciali richiedono un’autorizzazione separata; i contenuti collegati di terze parti mantengono i rispettivi diritti.",
          releaseTitle: "Release pubblica",
          publicItems: [
            [
              "Periodo citabile",
              "2000-2026, release corrente versionata.",
            ],
            [
              "Campi esportabili",
              "Tutti i campi scientifici pubblicabili, inclusi trigger, processo, componente, evidenza, coordinate e fonti.",
            ],
            [
              "Uso previsto",
              "Ricerca, citazione, didattica, verifica metodologica e consultazione pubblica.",
            ],
          ],
        }
      : {
          label: "ARCUS DATA ACCESS",
          title:
            "Data access and public research release.",
          text:
            "ARCUS Open publishes a versioned scientific baseline for consultation, citation, teaching and reproducible analysis, with data, sources, taxonomy and quality controls available without an account.",
          openAtlas: "Open Atlas",
          publicTitle: "Open layer",
          publicText:
            "ARCUS Open Research publishes a curated scientific baseline without an account, with taxonomy, methodology, audit and complete downloads.",
          resourcesTitle: "Scientific release package",
          resourcesText:
            "Data, sources, schema, taxonomy and quality controls are available separately so that every analysis can be verified.",
          citationTitle: "Release citation",
          citationNote:
            "A versioned citation is available; the persistent DOI for the ARCUS release will be added with the public deposit without replacing the DOI of the original scientific publication.",
          researchContact: "Questions about the release or scientific reuse",
          licenseTitle: "License and rights",
          licenseText:
            "ARCUS-authored metadata and taxonomies are released under CC BY-NC 4.0 for non-commercial reuse. Commercial use requires separate permission; linked third-party content retains its original rights.",
          releaseTitle: "Public release",
          publicItems: [
            [
              "Citable period",
              "2000-2026, current versioned release.",
            ],
            [
              "Exportable fields",
              "All publishable scientific fields, including trigger, process, component, evidence, coordinates and sources.",
            ],
            [
              "Intended use",
              "Research, citation, teaching, methodological review and public consultation.",
            ],
          ],
        };

  const pageTitle = copy.title;
  const pageText = copy.text;

  const releaseVersion =
    manifest?.version || "arcus-open-2026.18";
  const releaseCitation =
    manifest?.citation ||
    `ARCUS Open Research (${releaseVersion}). Bridge collapse events in Italy, 2000-2026.`;
  const researchSubject = encodeURIComponent(
    language === "it"
      ? `Richiesta scientifica ARCUS Open - ${releaseVersion}`
      : `ARCUS Open research enquiry - ${releaseVersion}`
  );
  const releaseEventCount = manifest?.event_count ?? 260;
  const releaseSourceCount = manifest?.source_count ?? 1057;
  const releasePublicText = copy.publicText;
  const releasePublicItems = copy.publicItems.map((item, index) =>
    index === 0
      ? [
          item[0],
          language === "it"
            ? `2000-2026, release versionata ${releaseVersion}.`
            : `2000-2026, versioned release ${releaseVersion}.`,
        ]
      : item
  );
  const releaseResources = language === "it"
    ? [
        ["DATI", "Eventi CSV", "Tabella completa per analisi statistiche e riuso.", openDownloadUrls.csv],
        ["DATI", "Eventi GeoJSON", "Record georeferenziati per GIS e analisi spaziali.", openDownloadUrls.geojson],
        ["DATI", "Fonti JSON", "Metadati delle fonti collegati agli ID degli eventi.", openResourceUrls.sources],
        ["DATI", "Episodi condivisi JSON", "Gruppi multi-crollo supportati da fonti condivise o da registri curati, per il controllo del clustering.", openResourceUrls.episodes],
        ["VERSIONE", "Manifest", "Identità, data di rilascio, licenza e risorse della release.", openResourceUrls.manifest],
        ["SCHEMA", "Dizionario dati", "Campi, tipi, copertura e note di interpretazione.", openResourceUrls.dataDictionary],
        ["SCHEMA", "Tassonomia", "Valori controllati e definizioni operative pubblicate.", openResourceUrls.taxonomy],
        ["QUALITÀ", "Audit qualità", "Errori, warning e record che richiedono revisione.", openResourceUrls.qualityAudit],
        ["QUALITÀ", "Statistiche release", "Conteggi, distribuzioni e completezza dei campi.", openResourceUrls.statistics],
        ["PROVENIENZA", "Changelog", "Modifiche introdotte tra una release e la successiva.", openResourceUrls.changelog],
      ]
    : [
        ["DATA", "Events CSV", "Complete table for statistical analysis and reuse.", openDownloadUrls.csv],
        ["DATA", "Events GeoJSON", "Georeferenced records for GIS and spatial analysis.", openDownloadUrls.geojson],
        ["DATA", "Sources JSON", "Source metadata linked to event identifiers.", openResourceUrls.sources],
        ["DATA", "Shared episodes JSON", "Multi-collapse groups supported by shared sources or curated registries for clustering control.", openResourceUrls.episodes],
        ["VERSION", "Manifest", "Release identity, date, license and resource inventory.", openResourceUrls.manifest],
        ["SCHEMA", "Data dictionary", "Fields, types, coverage and interpretation notes.", openResourceUrls.dataDictionary],
        ["SCHEMA", "Taxonomy", "Published controlled values and operational definitions.", openResourceUrls.taxonomy],
        ["QUALITY", "Quality audit", "Errors, warnings and records requiring review.", openResourceUrls.qualityAudit],
        ["QUALITY", "Release statistics", "Counts, distributions and field completeness.", openResourceUrls.statistics],
        ["PROVENANCE", "Changelog", "Changes introduced between successive releases.", openResourceUrls.changelog],
      ];

  return (
    <main
      className="data-access-page"
      id="main-content"
    >
      <PageMeta
        title="ARCUS Data Access"
        description={pageText}
        structuredData={asJsonLdGraph(arcusDataset(manifest || {}))}
      />

      <Navbar />

      <section className="data-access-hero">
        <ArcusPageMark />
        <div className="data-access-container">
          <div className="data-access-label">
            {copy.label}
          </div>

          <h1>{pageTitle}</h1>
          <p>{pageText}</p>

          <div className="data-access-actions">
            <Link to="/atlas">{copy.openAtlas}</Link>
            <a href={openDownloadUrls.csv}>CSV</a>
            <a href={openDownloadUrls.geojson}>GeoJSON</a>
          </div>
        </div>
      </section>

      <section className="data-access-section">
        <div className="data-access-container data-access-split">
          <div>
            <div className="data-access-label">
              {copy.publicTitle}
            </div>
            <h2>{releasePublicText}</h2>

            <dl className="data-access-release-summary" aria-label={language === "it" ? "Riepilogo release" : "Release summary"}>
              <div>
                <dt>{language === "it" ? "Release" : "Release"}</dt>
                <dd>{releaseVersion}</dd>
              </div>
              <div>
                <dt>{language === "it" ? "Eventi" : "Events"}</dt>
                <dd>{releaseEventCount}</dd>
              </div>
              <div>
                <dt>{language === "it" ? "Record di fonte" : "Source records"}</dt>
                <dd>{releaseSourceCount}</dd>
              </div>
            </dl>
          </div>

          <div className="data-access-card-list">
            {releasePublicItems.map(([title, text]) => (
              <article key={title}>
                <span>{copy.releaseTitle}</span>
                <strong>{title}</strong>
                <p>{text}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="data-access-section">
        <div className="data-access-container">
          <div className="data-access-section-header">
            <div>
              <div className="data-access-label">
                {releaseVersion}
              </div>
              <h2>{copy.resourcesTitle}</h2>
              <p className="data-access-intro">
                {copy.resourcesText}
              </p>
            </div>
          </div>

          <div className="data-access-endpoints">
            {releaseResources.map(([category, label, description, href]) => (
              <a className="data-access-resource-card" href={href} key={label}>
                <span>{category}</span>
                <strong>{label}</strong>
                <p>{description}</p>
                <b>{language === "it" ? "Apri risorsa" : "Open resource"} ↗</b>
              </a>
            ))}
          </div>

          <div className="data-access-grid data-access-release-grid">
            <article className="data-access-release">
              <span>{copy.citationTitle}</span>
              <strong>{releaseVersion}</strong>
              <p className="data-access-citation">
                {releaseCitation}
              </p>
              <p>{copy.citationNote}</p>
              <a
                className="data-access-resource-link"
                href={`mailto:${contactAddresses.research}?subject=${researchSubject}`}
              >
                {copy.researchContact}: {contactAddresses.research}
              </a>
            </article>

            <article className="data-access-release">
              <span>{copy.licenseTitle}</span>
              <strong>
                {manifest?.license?.id || "CC-BY-NC-4.0"}
              </strong>
              <p>{copy.licenseText}</p>
              <a
                className="data-access-resource-link"
                href={
                  manifest?.license?.url ||
                  "https://creativecommons.org/licenses/by-nc/4.0/"
                }
                rel="noreferrer"
                target="_blank"
              >
                {language === "it" ? "Leggi la licenza" : "Read license"}
              </a>
            </article>
          </div>
        </div>
      </section>

      <Footer />
    </main>
  );
}

export default DataAccessPage;
