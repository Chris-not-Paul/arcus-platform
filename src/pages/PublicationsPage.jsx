import {
  useEffect,
  useState,
} from "react";

import { Link } from "react-router-dom";

import Footer from "../components/layout/Footer";
import Navbar from "../components/layout/Navbar";
import PageMeta from "../components/layout/PageMeta";

import useLanguage from "../context/useLanguage";
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
        "ARCUS is grounded in a documented research dataset and a transparent classification method. This section collects the scientific material that supports the observatory and its professional outputs.",
      primaryLabel: "Peer-reviewed dataset",
      paperTitle:
        "Dataset of bridge collapses in Italy from 2000 to 2025",
      paperMeta: "Data in Brief - Elsevier",
      paperText:
        "The published dataset is the scientific base for the public Atlas, methodology, analytics and Professional workspace.",
      openPaper: "Open DOI",
      resourcesLabel: "Research Assets",
      releaseLabel: "Current Open release",
      releaseTitle: "A versioned and auditable research object",
      releaseText:
        "The current ARCUS release has its own citation, manifest, data dictionary, changelog and quality audit. A persistent release DOI will be added with the public repository deposit.",
      releaseAction: "Open release package",
      resources: [
        ["Methodology", "Validation, classification, taxonomy and known limitations."],
        ["Public Atlas", "Geospatial reading of documented collapse events and source evidence."],
        ["Analytics", "Aggregate patterns, source traceability and public indicators."],
      ],
    },
    it: {
      eyebrow: "RICERCA ARCUS",
      title: "Pubblicazioni e Base Scientifica",
      text:
        "ARCUS nasce da un dataset di ricerca documentato e da un metodo di classificazione trasparente. Questa sezione raccoglie i materiali scientifici che sostengono l'osservatorio e gli output professionali.",
      primaryLabel: "Dataset peer-reviewed",
      paperTitle:
        "Dataset of bridge collapses in Italy from 2000 to 2025",
      paperMeta: "Data in Brief - Elsevier",
      paperText:
        "Il dataset pubblicato e la base scientifica per Atlante pubblico, metodologia, analytics e workspace Professional.",
      openPaper: "Apri DOI",
      resourcesLabel: "Asset di ricerca",
      releaseLabel: "Release Open corrente",
      releaseTitle: "Un oggetto di ricerca versionato e verificabile",
      releaseText:
        "La release ARCUS corrente dispone di citazione, manifest, dizionario dati, changelog e audit di qualità. Il DOI persistente della release sarà aggiunto con il deposito nel repository pubblico.",
      releaseAction: "Apri il pacchetto della release",
      resources: [
        ["Metodologia", "Validazione, classificazione, tassonomia e limiti dichiarati."],
        ["Atlante pubblico", "Lettura geospaziale degli eventi documentati e delle fonti."],
        ["Analytics", "Pattern aggregati, tracciabilita delle fonti e indicatori pubblici."],
      ],
    },
  };

  const content = copy[language] || copy.en;
  const releaseVersion =
    manifest?.version || "arcus-open-2026.2";
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
            <a
              href="https://doi.org/10.1016/j.dib.2025.112375"
              target="_blank"
              rel="noreferrer"
            >
              {content.openPaper}
            </a>
          </article>
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
      </section>

      <section className="publications-section publications-dark">
        <div className="publications-container">
          <div className="publications-label">
            {content.resourcesLabel}
          </div>
          <div className="publications-grid">
            {content.resources.map(([title, text]) => (
              <article key={title}>
                <span>{title}</span>
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

export default PublicationsPage;
