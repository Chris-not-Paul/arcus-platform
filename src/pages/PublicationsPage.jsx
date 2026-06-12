import Navbar from "../components/layout/Navbar";
import PageMeta from "../components/layout/PageMeta";

import useLanguage from "../context/useLanguage";

import "../styles/publications-page.css";

function PublicationsPage() {
  const { language } = useLanguage();

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
      resources: [
        ["Metodologia", "Validazione, classificazione, tassonomia e limiti dichiarati."],
        ["Atlante pubblico", "Lettura geospaziale degli eventi documentati e delle fonti."],
        ["Analytics", "Pattern aggregati, tracciabilita delle fonti e indicatori pubblici."],
      ],
    },
  };

  const content = copy[language] || copy.en;

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
    </main>
  );
}

export default PublicationsPage;
