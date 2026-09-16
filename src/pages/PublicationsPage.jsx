import {
  useEffect,
  useState,
} from "react";

import { Link } from "react-router-dom";

import Footer from "../components/layout/Footer";
import Navbar from "../components/layout/Navbar";
import PageMeta from "../components/layout/PageMeta";

import useLanguage from "../context/useLanguage";
import { professionalEnabled } from "../config/site";
import { openManifest } from "../utils/apiClient";

import "../styles/publications-page.css";

function PublicationsPage() {
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

  const copy = {
    en: {
      eyebrow: "ARCUS RESEARCH",
      title: "Publications and Scientific Basis",
      text:
        "The scientific lineage of ARCUS: the peer-reviewed dataset, the evolving Open release and the research objects required to reproduce an analysis.",
      primaryLabel: "Peer-reviewed dataset",
      paperTitle:
        "Dataset of bridge collapses in Italy from 2000 to 2025",
      paperMeta: "Data in Brief - Elsevier",
      paperText:
        "The article documents the original Italian bridge-collapse dataset and its harmonisation framework. ARCUS Open continues that research object through explicit versions, source traceability and quality controls.",
      openPaper: "Open DOI",
      resourcesLabel: "Research Assets",
      releaseLabel: "Current Open release",
      releaseTitle: "A versioned and auditable research object",
      releaseText:
        "The current ARCUS release has its own citation, manifest, data dictionary, changelog and quality audit. A persistent release DOI will be added with the public repository deposit.",
      releaseAction: "Open release package",
      relationLabel: "Research lineage",
      relationText:
        "The paper and the Open release are related but not interchangeable: the first documents the scientific foundation; the second identifies the exact data snapshot used in an analysis.",
      citationGuideLabel: "Citation guidance",
      citationGuideTitle: "Cite the object you actually used",
      citationGuide: [
        ["Cite the paper", "When discussing the original dataset, its construction and the scientific framework."],
        ["Cite the release", "When using ARCUS records, counts, coordinates, taxonomy or exported files from a specific version."],
        ["Cite both", "When an analysis uses the current release and also relies on the methodological lineage of the published dataset."],
      ],
      resources: [
        ["Methodology", "Validation, classification, taxonomy and known limitations.", "/methodology"],
        ["Public Atlas", "Geospatial reading of documented collapse events and source evidence.", "/atlas"],
        ["Analytics", "Descriptive patterns, declared filters and paper-ready exports.", "/analytics"],
      ],
    },
    it: {
      eyebrow: "RICERCA ARCUS",
      title: "Pubblicazioni e Base Scientifica",
      text:
        "La linea scientifica di ARCUS: il dataset peer-reviewed, la release Open in evoluzione e gli oggetti di ricerca necessari per riprodurre un’analisi.",
      primaryLabel: "Dataset peer-reviewed",
      paperTitle:
        "Dataset of bridge collapses in Italy from 2000 to 2025",
      paperMeta: "Data in Brief - Elsevier",
      paperText:
        "L’articolo documenta il dataset originario sui collassi dei ponti italiani e il relativo quadro di armonizzazione. ARCUS Open prosegue quell’oggetto di ricerca attraverso versioni esplicite, tracciabilità delle fonti e controlli di qualità.",
      openPaper: "Apri DOI",
      resourcesLabel: "Asset di ricerca",
      releaseLabel: "Release Open corrente",
      releaseTitle: "Un oggetto di ricerca versionato e verificabile",
      releaseText:
        "La release ARCUS corrente dispone di citazione, manifest, dizionario dati, changelog e audit di qualità. Il DOI persistente della release sarà aggiunto con il deposito nel repository pubblico.",
      releaseAction: "Apri il pacchetto della release",
      relationLabel: "Linea di ricerca",
      relationText:
        "Paper e release Open sono collegati ma non intercambiabili: il primo documenta la base scientifica, la seconda identifica l’esatta fotografia dei dati impiegata in un’analisi.",
      citationGuideLabel: "Guida alla citazione",
      citationGuideTitle: "Cita l’oggetto che hai realmente utilizzato",
      citationGuide: [
        ["Cita il paper", "Quando descrivi il dataset originario, la sua costruzione e il quadro scientifico."],
        ["Cita la release", "Quando utilizzi record ARCUS, conteggi, coordinate, tassonomia o file esportati da una versione precisa."],
        ["Cita entrambi", "Quando l’analisi usa la release corrente e richiama anche la linea metodologica del dataset pubblicato."],
      ],
      resources: [
        ["Metodologia", "Validazione, classificazione, tassonomia e limiti dichiarati.", "/methodology"],
        ["Atlante pubblico", "Lettura geospaziale degli eventi documentati e delle fonti.", "/atlas"],
        ["Analytics", "Pattern descrittivi, filtri dichiarati ed export paper-ready.", "/analytics"],
      ],
    },
  };

  const baseContent = copy[language] || copy.en;
  const content = professionalEnabled
    ? baseContent
    : {
        ...baseContent,
        text: baseContent.text,
        paperText: baseContent.paperText,
      };
  const releaseVersion =
    manifest?.version || "arcus-open-2026.3";
  const releaseCitation =
    manifest?.citation ||
    `ARCUS Open Research (${releaseVersion}). Bridge collapse events in Italy, 2000-2026.`;

  return (
    <main className="publications-page" id="main-content">
      <PageMeta
        title={content.title}
        description={
          language === "it"
            ? "Pubblicazioni, presentazioni e materiali scientifici collegati alla piattaforma ARCUS."
            : "Publications, presentations and scientific material connected to the ARCUS platform."
        }
      />

      <Navbar />

      <section className="publications-hero">
        <div className="publications-container">
          <div className="publications-label">{content.eyebrow}</div>
          <h1>{content.title}</h1>
          <p>{content.text}</p>
        </div>
      </section>

      <section className="publications-section">
        <div className="publications-container publications-feature">
          <article>
            <span>{content.primaryLabel}</span>
            <h2>{content.paperTitle}</h2>
            <strong>{content.paperMeta}</strong>
            <p>{content.paperText}</p>
            <dl className="publications-paper-facts">
              <div><dt>{language === "it" ? "Anno" : "Year"}</dt><dd>2025</dd></div>
              <div><dt>{language === "it" ? "Tipo" : "Type"}</dt><dd>{language === "it" ? "Data article" : "Data article"}</dd></div>
              <div><dt>DOI</dt><dd>10.1016/j.dib.2025.112375</dd></div>
            </dl>
            <a
              href="https://doi.org/10.1016/j.dib.2025.112375"
              target="_blank"
              rel="noreferrer"
            >
              {content.openPaper}
            </a>
          </article>

          <aside>
            <span>{content.relationLabel}</span>
            <p>{content.relationText}</p>
          </aside>
        </div>
      </section>

      <section className="publications-section publications-release-section">
        <div className="publications-container publications-release-grid">
          <article>
            <span>{content.releaseLabel}</span>
            <h2>{content.releaseTitle}</h2>
            <strong>{releaseVersion}</strong>
            <p>{content.releaseText}</p>
            <Link to="/data-access">
              {content.releaseAction}
            </Link>
          </article>

          <aside>
            <span>{language === "it" ? "Citazione" : "Citation"}</span>
            <p>{releaseCitation}</p>
          </aside>
        </div>

        <div className="publications-container publications-citation-guide">
          <div>
            <span>{content.citationGuideLabel}</span>
            <h2>{content.citationGuideTitle}</h2>
          </div>
          <div className="publications-citation-options">
            {content.citationGuide.map(([title, text], index) => (
              <article key={title}>
                <b>{String(index + 1).padStart(2, "0")}</b>
                <strong>{title}</strong>
                <p>{text}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="publications-section publications-dark">
        <div className="publications-container">
          <div className="publications-label">
            {content.resourcesLabel}
          </div>
          <div className="publications-grid">
            {content.resources.map(([title, text, path]) => (
              <Link key={title} to={path}>
                <span>{title}</span>
                <p>{text}</p>
                <b aria-hidden="true">↗</b>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <Footer />
    </main>
  );
}

export default PublicationsPage;
