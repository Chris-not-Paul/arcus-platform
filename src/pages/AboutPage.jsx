import Footer from "../components/layout/Footer";
import Navbar from "../components/layout/Navbar";
import PageMeta from "../components/layout/PageMeta";

import useLanguage from "../context/useLanguage";

import "../styles/about-page.css";

function AboutPage() {
  const { language } = useLanguage();

  const copy = {
    en: {
      eyebrow: "ARCUS IDENTITY",
      title: "Scientific infrastructure intelligence, built from verified collapse evidence.",
      lead:
        "ARCUS is a research infrastructure for observing, classifying and interpreting bridge collapse events. It connects documented records, source traceability, geospatial context and professional analytics in one coherent system.",
      missionLabel: "What ARCUS Does",
      missionTitle:
        "It turns fragmented collapse records into structured evidence.",
      missionText:
        "Bridge failure information is often scattered across technical reports, public authorities, scientific publications and verified news archives. ARCUS organizes that evidence so researchers and professionals can read patterns, compare territories and produce transparent outputs.",
      audienceLabel: "Who It Serves",
      audienceTitle:
        "A common evidence layer for research and technical decisions.",
      pillars: [
        [
          "Verified archive",
          "Events are organized with dates, location, severity, causes, triggers and documented sources.",
        ],
        [
          "Scientific method",
          "The methodology makes validation, classification and limits explicit instead of hiding uncertainty.",
        ],
        [
          "Operational workspace",
          "Professional turns the archive into comparable failures, supported lessons, explicit abstention and traceable evidence packages.",
        ],
      ],
      audiences: [
        "Researchers and universities",
        "Engineering companies and consultants",
        "Infrastructure managers and concessionaires",
        "Analysts, insurers and technical stakeholders",
      ],
      principles: [
        ["Traceability", "Every analytical output should remain connected to the evidence behind it."],
        ["Reproducibility", "Methods, releases and model limits should be readable and auditable."],
        ["Decision support", "ARCUS supports technical screening; it does not replace inspections, structural diagnosis or safety certification."],
      ],
    },
    it: {
      eyebrow: "IDENTITA ARCUS",
      title: "Infrastructure intelligence scientifica, costruita da evidenze di collasso verificate.",
      lead:
        "ARCUS e un'infrastruttura di ricerca per osservare, classificare e interpretare i crolli dei ponti. Connette record documentati, tracciabilita delle fonti, contesto geospaziale e analytics professionali in un sistema coerente.",
      missionLabel: "Cosa Fa ARCUS",
      missionTitle:
        "Trasforma registri frammentati in evidenza strutturata.",
      missionText:
        "Le informazioni sui cedimenti sono spesso disperse tra report tecnici, autorita pubbliche, pubblicazioni scientifiche e archivi stampa verificati. ARCUS organizza questa evidenza per leggere pattern, confrontare territori e produrre output trasparenti.",
      audienceLabel: "A Chi Serve",
      audienceTitle:
        "Un layer comune di evidenza per ricerca e decisioni tecniche.",
      pillars: [
        [
          "Archivio verificato",
          "Gli eventi sono organizzati con date, localizzazione, gravita, cause, trigger e fonti documentate.",
        ],
        [
          "Metodo scientifico",
          "La metodologia rende espliciti validazione, classificazione e limiti invece di nascondere l'incertezza.",
        ],
        [
          "Workspace operativo",
          "Professional trasforma l'archivio in collassi comparabili, lezioni sostenute, astensione esplicita ed evidence package tracciabili.",
        ],
      ],
      audiences: [
        "Ricercatori e universita",
        "Societa di ingegneria e consulenti",
        "Gestori infrastrutturali e concessionari",
        "Analisti, assicurazioni e stakeholder tecnici",
      ],
      principles: [
        ["Tracciabilita", "Ogni output analitico deve restare collegato all'evidenza che lo sostiene."],
        ["Riproducibilita", "Metodi, release e limiti dei modelli devono essere leggibili e verificabili."],
        ["Supporto decisionale", "ARCUS supporta lo screening tecnico; non sostituisce ispezioni, diagnosi strutturali o certificazioni di sicurezza."],
      ],
    },
  };

  const content = copy[language] || copy.en;

  return (
    <main className="about-page" id="main-content">
      <PageMeta
        title={content.title}
        description={
          language === "it"
            ? "Identita e visione strategica di ARCUS, osservatorio scientifico dedicato ai cedimenti infrastrutturali."
            : "ARCUS identity and strategic vision, a scientific observatory dedicated to infrastructure failure intelligence."
        }
      />

      <Navbar />

      <section className="about-hero">
        <div className="about-container">
          <div className="about-label">{content.eyebrow}</div>
          <h1>{content.title}</h1>
          <p>{content.lead}</p>
        </div>
      </section>

      <section className="about-section">
        <div className="about-container about-split">
          <div>
            <div className="about-label">{content.missionLabel}</div>
            <h2>{content.missionTitle}</h2>
          </div>
          <p>{content.missionText}</p>
        </div>

        <div className="about-container about-pillar-grid">
          {content.pillars.map(([title, text]) => (
            <article key={title}>
              <span>{title}</span>
              <p>{text}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="about-section about-dark">
        <div className="about-container about-split">
          <div>
            <div className="about-label">{content.audienceLabel}</div>
            <h2>{content.audienceTitle}</h2>
          </div>
          <div className="about-audience-list">
            {content.audiences.map((item) => (
              <span key={item}>{item}</span>
            ))}
          </div>
        </div>
      </section>

      <section className="about-section">
        <div className="about-container about-principles">
          {content.principles.map(([title, text]) => (
            <article key={title}>
              <span>{title}</span>
              <p>{text}</p>
            </article>
          ))}
        </div>
      </section>

      <Footer />
    </main>
  );
}

export default AboutPage;
