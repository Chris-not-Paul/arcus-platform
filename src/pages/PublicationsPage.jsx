import {
  useEffect,
  useState,
} from "react";

import { Link } from "react-router-dom";

import Footer from "../components/layout/Footer";
import Navbar from "../components/layout/Navbar";
import PageMeta from "../components/layout/PageMeta";

import useLanguage from "../context/useLanguage";
import { contactAddresses } from "../config/site";
import { originalDatasetCredits, hydraulicResearchCredits } from "../config/researchCredits";
import { researchLineage } from "../config/researchLineage";
import { openManifest } from "../utils/apiClient";
import {
  arcusDataset,
  asJsonLdGraph,
  dataInBriefArticle,
} from "../utils/structuredData";

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
        originalDatasetCredits.title,
      paperMeta: "Data in Brief - Elsevier",
      paperAuthors: "Paolini et al.",
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
      researchContact: "Research and citation enquiries",
      citationGuideLabel: "Citation guidance",
      citationGuideTitle: "Cite the object you actually used",
      citationGuide: [
        ["Cite the paper", "When discussing the original dataset, its construction and the scientific framework."],
        ["Cite the release", "When using ARCUS records, counts, coordinates, taxonomy or exported files from a specific version."],
        ["Cite the source works", "When using data or classifications derived from earlier studies, cite those works as well as the ARCUS release. An ARCUS record identifier does not replace the original source citation."],
      ],
      provenanceTitle: "Data provenance and scientific contributions",
      provenanceOriginal: "Original dataset · collective research",
      provenanceOriginalText: "The initial ARCUS evidence base draws on the Italian dataset published by the authors below. The underlying collection, analyses and earlier research incorporated into that dataset are collective contributions, not the exclusive work of the ARCUS curator.",
      provenanceHydraulic: "Hydraulic research and supplementary dataset",
      provenanceHydraulicText: "For records matched to the authors’ supplementary dataset S3, reused bridge lengths and hydraulic classifications are attributed to that dataset and its associated paper. They are not presented as new ARCUS analyses. A scientific-context citation alone does not confirm every detail of an event.",
      provenancePlatform: "ARCUS development and curation",
      provenancePlatformText: "Christian Paolini conceived and developed the ARCUS platform and curates its releases. Subsequent integrations, corrections and editorial reclassifications remain distinct from the source works. Responsibility for changes introduced by ARCUS rests with its curator; citing a work does not imply its authors’ involvement in, or approval of, those changes.",
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
        originalDatasetCredits.title,
      paperMeta: "Data in Brief - Elsevier",
      paperAuthors: "Paolini et al.",
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
      researchContact: "Richieste su ricerca e citazione",
      citationGuideLabel: "Guida alla citazione",
      citationGuideTitle: "Cita l’oggetto che hai realmente utilizzato",
      citationGuide: [
        ["Cita il paper", "Quando descrivi il dataset originario, la sua costruzione e il quadro scientifico."],
        ["Cita la release", "Quando utilizzi record ARCUS, conteggi, coordinate, tassonomia o file esportati da una versione precisa."],
        ["Cita i lavori di provenienza", "Quando utilizzi dati o classificazioni derivati da studi precedenti, cita quei lavori oltre alla release ARCUS. L’identificativo di una scheda ARCUS non sostituisce la citazione della fonte originaria."],
      ],
      provenanceTitle: "Provenienza dei dati e contributi scientifici",
      provenanceOriginal: "Dataset originario · ricerca collettiva",
      provenanceOriginalText: "La base informativa iniziale di ARCUS deriva dal dataset italiano pubblicato dagli autori indicati di seguito. La raccolta, le analisi e le ricerche pregresse confluite in quel dataset costituiscono contributi collettivi, non il lavoro esclusivo del curatore ARCUS.",
      provenanceHydraulic: "Ricerca idraulica e dataset supplementare",
      provenanceHydraulicText: "Nei record collegati al dataset supplementare S3 degli autori, le lunghezze e le classificazioni idrauliche riutilizzate sono attribuite a quel dataset e al relativo articolo. Non sono presentate come nuove analisi ARCUS. Una citazione di contesto scientifico, da sola, non conferma ogni dettaglio dell’evento.",
      provenancePlatform: "Sviluppo e curatela ARCUS",
      provenancePlatformText: "Christian Paolini ha ideato e sviluppato la piattaforma ARCUS e ne cura le release. Integrazioni, correzioni e riclassificazioni editoriali successive restano distinte dai lavori di provenienza. La responsabilità delle modifiche introdotte da ARCUS è del suo curatore; citare un lavoro non implica il coinvolgimento o l’approvazione dei suoi autori rispetto a tali modifiche.",
      resources: [
        ["Metodologia", "Validazione, classificazione, tassonomia e limiti dichiarati.", "/methodology"],
        ["Atlante pubblico", "Lettura geospaziale degli eventi documentati e delle fonti.", "/atlas"],
        ["Analytics", "Pattern descrittivi, filtri dichiarati ed export paper-ready.", "/analytics"],
      ],
    },
  };

  const content = copy[language] || copy.en;
  const lineage = researchLineage[language] || researchLineage.en;
  const releaseVersion =
    manifest?.version || "arcus-open-2026.17";
  const releaseCitation =
    manifest?.citation ||
    `ARCUS Open Research (${releaseVersion}). Bridge collapse events in Italy, 2000-2026.`;
  const researchSubject = encodeURIComponent(
    language === "it"
      ? `Richiesta ricerca ARCUS - ${releaseVersion}`
      : `ARCUS research enquiry - ${releaseVersion}`
  );

  return (
    <main className="publications-page" id="main-content">
      <PageMeta
        title={content.title}
        description={
          language === "it"
            ? "Pubblicazioni, release e risorse scientifiche collegate alla piattaforma ARCUS."
            : "Publications, releases and scientific resources connected to the ARCUS platform."
        }
        structuredData={asJsonLdGraph(
          dataInBriefArticle,
          arcusDataset(manifest || {})
        )}
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
              <div><dt>{language === "it" ? "Anno" : "Year"}</dt><dd>{originalDatasetCredits.year}</dd></div>
              <div><dt>{language === "it" ? "Autori" : "Authors"}</dt><dd>{content.paperAuthors}</dd></div>
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

      <section className="publications-section publications-provenance" id="scientific-provenance" aria-labelledby="provenance-heading">
        <div className="publications-container">
          <h2 id="provenance-heading">{content.provenanceTitle}</h2>
          <div className="publications-provenance-grid">
            <article>
              <h3>{content.provenanceOriginal}</h3>
              <p>{content.provenanceOriginalText}</p>
              <p className="publications-provenance-authors">{originalDatasetCredits.authors.join(", ")}</p>
              <a href={originalDatasetCredits.doi} target="_blank" rel="noreferrer">{originalDatasetCredits.title} ({originalDatasetCredits.year}) →</a>
            </article>
            <article>
              <h3>{content.provenanceHydraulic}</h3>
              <p className="publications-provenance-authors">{hydraulicResearchCredits.authors.join(", ")}</p>
              <p>{content.provenanceHydraulicText}</p>
              <a href={hydraulicResearchCredits.doi} target="_blank" rel="noreferrer">{hydraulicResearchCredits.title} ({hydraulicResearchCredits.year}) →</a>
            </article>
            <article>
              <h3>{content.provenancePlatform}</h3>
              <p>{content.provenancePlatformText}</p>
              <p>{lineage.overview}</p>
              <Link to="/methodology/#dataset-lineage">{lineage.title} →</Link>
            </article>
          </div>
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
            <a href={`mailto:${contactAddresses.research}?subject=${researchSubject}`}>
              {content.researchContact}: {contactAddresses.research}
            </a>
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
