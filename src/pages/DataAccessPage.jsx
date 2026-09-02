import {
  useEffect,
  useState,
} from "react";

import { Link } from "react-router-dom";

import Footer from "../components/layout/Footer";
import Navbar from "../components/layout/Navbar";
import PageMeta from "../components/layout/PageMeta";

import useLanguage from "../context/useLanguage";
import {
  openDownloadUrls,
  openManifest,
  openResourceUrls,
} from "../utils/apiClient";

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
            "Accesso ai dati, release pubblica e livello Professional.",
          text:
            "ARCUS separa la base scientifica pubblica dalla base dati operativa aggiornata. Il layer Open consente consultazione, citazione e analisi trasparente; il livello Professional produce output tecnici controllati senza esporre il database live in bulk.",
          openAtlas: "Apri Atlante",
          openProfessional: "Apri Professional",
          publicTitle: "Layer Open",
          publicText:
            "ARCUS Open Research pubblica la base scientifica validata senza account, con tassonomia, metodologia, audit e download completi.",
          resourcesTitle: "Pacchetto scientifico della release",
          resourcesText:
            "Dati, fonti, schema, tassonomia e controlli di qualità sono accessibili separatamente per rendere verificabile ogni analisi.",
          citationTitle: "Citazione della release",
          citationNote:
            "Citazione versionata disponibile; il DOI persistente della release ARCUS sarà aggiunto al deposito pubblico senza sostituire il DOI della pubblicazione scientifica originaria.",
          licenseTitle: "Licenza e diritti",
          licenseText:
            "I metadati e le tassonomie prodotti da ARCUS sono rilasciati CC BY 4.0. I contenuti collegati di terze parti mantengono i rispettivi diritti.",
          professionalTitle: "Layer Professional",
          professionalText:
            "Il database ARCUS aggiornato alimenta Collapse Intelligence, retrieval di analoghi e evidence package contestuali. Non viene distribuito come copia integrale del DB.",
          policyTitle: "Regola di accesso",
          policyText:
            "Open rende verificabile la base scientifica. Professional applica quella base a un punto progetto, con export contestuali di esposizione ufficiale, analoghi, lezioni e limiti.",
          releaseTitle: "Release pubblica",
          liveTitle: "Evidence base live",
          outputTitle: "Output Professional",
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
          professionalItems: [
            [
              "Punto progetto verificato",
              "Provincia derivata dal punto ed esposizione ufficiale ISPRA/INGV separata dal contesto vicino.",
            ],
            [
              "Lessons from Failures",
              "Collassi comparabili, forza dell'evidenza, priorita d'indagine oppure astensione.",
            ],
            [
              "Export controllati",
              "Evidence package contestuale con fonti, provenienza, limiti e avvertenza non prescrittiva.",
            ],
          ],
          policyItems: [
            [
              "Nessun bulk dump del live DB",
              "La release Open e completa; il dataset live inter-release, gli inventari cliente e i risultati operativi restano separati.",
            ],
            [
              "Estratti contestuali",
              "Gli export Professional sono legati a un punto progetto e alla relativa coorte evidenziale, non alla replica completa del database.",
            ],
            [
              "Fonti dichiarate",
              "Le fonti pubbliche e i layer territoriali dichiarabili restano tracciabili nel metodo e nei report.",
            ],
          ],
        }
      : {
          label: "ARCUS DATA ACCESS",
          title:
            "Data access, public release and Professional layer.",
          text:
            "ARCUS separates the public scientific baseline from the updated operational evidence base. The Open layer supports consultation, citation and transparent analysis; Professional produces controlled technical outputs without exposing the live database in bulk.",
          openAtlas: "Open Atlas",
          openProfessional: "Open Professional",
          publicTitle: "Open layer",
          publicText:
            "ARCUS Open Research publishes the validated scientific baseline without an account, with taxonomy, methodology, audit and complete downloads.",
          resourcesTitle: "Scientific release package",
          resourcesText:
            "Data, sources, schema, taxonomy and quality controls are available separately so that every analysis can be verified.",
          citationTitle: "Release citation",
          citationNote:
            "A versioned citation is available; the persistent DOI for the ARCUS release will be added with the public deposit without replacing the DOI of the original scientific publication.",
          licenseTitle: "License and rights",
          licenseText:
            "ARCUS-authored metadata and taxonomies are released under CC BY 4.0. Linked third-party content retains its original rights.",
          professionalTitle: "Professional layer",
          professionalText:
            "The updated ARCUS database powers Collapse Intelligence, analogue retrieval and contextual evidence packages. It is not distributed as a full database copy.",
          policyTitle: "Access rule",
          policyText:
            "Open makes the scientific base verifiable. Professional applies it to a project point, with contextual exports covering official exposure, analogues, lessons and limitations.",
          releaseTitle: "Public release",
          liveTitle: "Live evidence base",
          outputTitle: "Professional outputs",
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
          professionalItems: [
            [
              "Verified project point",
              "Point-derived province and official ISPRA/INGV exposure kept separate from nearby context.",
            ],
            [
              "Lessons from Failures",
              "Comparable collapses, evidence strength, investigation priorities or abstention.",
            ],
            [
              "Controlled exports",
              "Contextual evidence package with sources, provenance, limits and a non-prescriptive warning.",
            ],
          ],
          policyItems: [
            [
              "No live DB bulk dump",
              "The Open release is complete; the inter-release live dataset, client inventories and operational results remain separate.",
            ],
            [
              "Contextual extracts",
              "Professional exports are tied to a project point and its evidence cohort, not to a complete database replica.",
            ],
            [
              "Declared sources",
              "Public sources and declared territorial layers remain traceable in the method and reports.",
            ],
          ],
        };

  const releaseVersion =
    manifest?.version || "arcus-open-2026.2";
  const releaseCitation =
    manifest?.citation ||
    `ARCUS Open Research (${releaseVersion}). Bridge collapse events in Italy, 2000-2026.`;
  const releaseEventCount = manifest?.event_count ?? 263;
  const releaseSourceCount = manifest?.source_count ?? 712;
  const releasePublicText = language === "it"
    ? `${copy.publicText} La release ${releaseVersion} contiene ${releaseEventCount} eventi e ${releaseSourceCount} fonti.`
    : `${copy.publicText} Release ${releaseVersion} contains ${releaseEventCount} events and ${releaseSourceCount} sources.`;
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
  const releaseResources = [
    [language === "it" ? "Eventi CSV" : "Events CSV", openDownloadUrls.csv],
    [language === "it" ? "Eventi GeoJSON" : "Events GeoJSON", openDownloadUrls.geojson],
    [language === "it" ? "Fonti JSON" : "Sources JSON", openResourceUrls.sources],
    ["Manifest", openResourceUrls.manifest],
    [language === "it" ? "Dizionario dati" : "Data dictionary", openResourceUrls.dataDictionary],
    [language === "it" ? "Tassonomia" : "Taxonomy", openResourceUrls.taxonomy],
    [language === "it" ? "Audit qualità" : "Quality audit", openResourceUrls.qualityAudit],
    [language === "it" ? "Statistiche release" : "Release statistics", openResourceUrls.statistics],
    ["Changelog", openResourceUrls.changelog],
  ];

  return (
    <main
      className="data-access-page"
      id="main-content"
    >
      <PageMeta
        title="ARCUS Data Access"
        description={copy.text}
      />

      <Navbar />

      <section className="data-access-hero">
        <div className="data-access-container">
          <div className="data-access-label">
            {copy.label}
          </div>

          <h1>{copy.title}</h1>
          <p>{copy.text}</p>

          <div className="data-access-actions">
            <Link to="/atlas">{copy.openAtlas}</Link>
            <a href={openDownloadUrls.csv}>CSV</a>
            <a href={openDownloadUrls.geojson}>GeoJSON</a>
            <Link to="/professional">
              {copy.openProfessional}
            </Link>
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
            {releaseResources.map(([label, href]) => (
              <article key={label}>
                <span>Open · no account</span>
                <strong>{label}</strong>
                <a
                  className="data-access-resource-link"
                  href={href}
                >
                  {language === "it" ? "Apri risorsa" : "Open resource"}
                </a>
              </article>
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
            </article>

            <article className="data-access-release">
              <span>{copy.licenseTitle}</span>
              <strong>
                {manifest?.license?.id || "CC BY 4.0"}
              </strong>
              <p>{copy.licenseText}</p>
              <a
                className="data-access-resource-link"
                href={
                  manifest?.license?.url ||
                  "https://creativecommons.org/licenses/by/4.0/"
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

      <section className="data-access-section dark">
        <div className="data-access-container data-access-split">
          <div>
            <div className="data-access-label">
              {copy.professionalTitle}
            </div>
            <h2>{copy.professionalText}</h2>
          </div>

          <div className="data-access-card-list data-access-dark-list">
            {copy.professionalItems.map(([title, text]) => (
              <article key={title}>
                <span>{copy.liveTitle}</span>
                <strong>{title}</strong>
                <p>{text}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="data-access-section">
        <div className="data-access-container data-access-split">
          <div>
            <div className="data-access-label">
              {copy.policyTitle}
            </div>
            <h2>{copy.policyText}</h2>
          </div>

          <div className="data-access-card-list">
            {copy.policyItems.map(([title, text]) => (
              <article key={title}>
                <span>{copy.outputTitle}</span>
                <strong>{title}</strong>
                <p>{text}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <Footer />
    </main>
  );
}

export default DataAccessPage;
