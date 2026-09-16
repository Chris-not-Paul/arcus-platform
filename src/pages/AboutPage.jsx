import Footer from "../components/layout/Footer";
import Navbar from "../components/layout/Navbar";
import PageMeta from "../components/layout/PageMeta";

import useLanguage from "../context/useLanguage";
import {
  contactAddresses,
  professionalEnabled,
} from "../config/site";

import "../styles/about-page.css";

function AboutPage() {
  const { language } = useLanguage();

  const copy = {
    en: {
      eyebrow: "ARCUS IDENTITY",
      title: "A public research infrastructure for bridge-collapse evidence.",
      lead:
        "ARCUS curates documented bridge-collapse events as a versioned, inspectable evidence base. It connects records, sources, geolocation, taxonomy and reproducible analysis without hiding uncertainty.",
      missionLabel: "What ARCUS Does",
      missionTitle:
        "It preserves evidence and makes it reusable.",
      missionText:
        "Bridge-failure information is fragmented across technical reports, public records, scientific publications, news archives and local sources. ARCUS resolves event identity, preserves provenance and publishes explicit classifications so every result can be checked against the underlying evidence.",
      audienceLabel: "Who It Serves",
      audienceTitle:
        "For people who need to inspect the evidence, not just a dashboard.",
      pillars: [
        [
          "Open evidence base",
          "Events, coordinates, classifications and source metadata are published in a citable release.",
        ],
        [
          "Scientific method",
          "The methodology makes validation, classification and limits explicit instead of hiding uncertainty.",
        ],
        [
          "Continuous curation",
          "Corrections, new documents and qualified contributions enter editorial review and remain traceable across releases.",
        ],
      ],
      audiences: [
        "Researchers and universities",
        "Bridge and structural engineering community",
        "Infrastructure authorities and public institutions",
        "Educators, analysts and technical communicators",
      ],
      principlesLabel: "Scientific Commitments",
      principlesTitle: "Credibility depends on restraint.",
      principlesLead: "ARCUS is designed to show what the records support, where they remain incomplete and which conclusions they cannot justify.",
      principles: [
        ["Traceability", "Every analytical output should remain connected to the evidence behind it."],
        ["Reproducibility", "Methods, releases and model limits should be readable and auditable."],
        ["Scientific restraint", "Historical records do not by themselves predict collapse, certify safety or replace inspections and structural assessment."],
      ],
    },
    it: {
      eyebrow: "IDENTITÀ ARCUS",
      title: "Un’infrastruttura pubblica di ricerca sulle evidenze di collasso dei ponti.",
      lead:
        "ARCUS cura eventi documentati di collasso dei ponti come base di evidenza versionata e ispezionabile. Connette record, fonti, geolocalizzazione, tassonomia e analisi riproducibili senza nascondere l’incertezza.",
      missionLabel: "Cosa Fa ARCUS",
      missionTitle:
        "Conserva l’evidenza e la rende riutilizzabile.",
      missionText:
        "Le informazioni sui cedimenti sono disperse tra relazioni tecniche, atti pubblici, pubblicazioni scientifiche, archivi stampa e fonti locali. ARCUS risolve l’identità degli eventi, conserva la provenienza e pubblica classificazioni esplicite affinché ogni risultato possa essere verificato sull’evidenza sottostante.",
      audienceLabel: "A Chi Serve",
      audienceTitle:
        "Per chi deve esaminare l’evidenza, non soltanto osservare una dashboard.",
      pillars: [
        [
          "Base di evidenza Open",
          "Eventi, coordinate, classificazioni e metadati delle fonti sono pubblicati in una release citabile.",
        ],
        [
          "Metodo scientifico",
          "La metodologia rende espliciti validazione, classificazione e limiti invece di nascondere l'incertezza.",
        ],
        [
          "Curatela continua",
          "Correzioni, nuovi documenti e contributi qualificati entrano in revisione editoriale e restano tracciabili tra le release.",
        ],
      ],
      audiences: [
        "Ricercatori e università",
        "Comunità dell’ingegneria dei ponti e strutturale",
        "Gestori infrastrutturali e istituzioni pubbliche",
        "Docenti, analisti e comunicatori tecnici",
      ],
      principlesLabel: "IMPEGNI SCIENTIFICI",
      principlesTitle: "La credibilità richiede misura.",
      principlesLead: "ARCUS è progettato per mostrare ciò che i record sostengono, dove rimangono incompleti e quali conclusioni non possono giustificare.",
      principles: [
        ["Tracciabilità", "Ogni risultato analitico deve restare collegato all’evidenza che lo sostiene."],
        ["Riproducibilità", "Metodi, release e limiti devono essere leggibili, versionati e verificabili."],
        ["Misura scientifica", "I record storici non predicono da soli il collasso, non certificano la sicurezza e non sostituiscono ispezioni o valutazioni strutturali."],
      ],
    },
  };

  const baseContent = copy[language] || copy.en;
  const content = professionalEnabled
    ? baseContent
    : {
        ...baseContent,
        lead: baseContent.lead,
        pillars: [
          ...baseContent.pillars,
          language === "it"
            ? ["Strumenti Open", "Atlante, Analytics e release scaricabile rendono consultabili record, pattern e limiti senza richiedere un account."]
            : ["Open tools", "The Atlas, Analytics and downloadable release make records, patterns and limitations accessible without an account."],
        ],
      };

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
        <div className="about-container about-principles-intro">
          <div>
            <div className="about-label">{content.principlesLabel}</div>
            <h2>{content.principlesTitle}</h2>
          </div>
          <p>{content.principlesLead}</p>
        </div>
        <div className="about-container about-principles">
          {content.principles.map(([title, text], index) => (
            <article key={title}>
              <b>{String(index + 1).padStart(2, "0")}</b>
              <span>{title}</span>
              <p>{text}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="about-section about-contact">
        <div className="about-container about-split">
          <div>
            <div className="about-label">
              {language === "it" ? "CONTATTI" : "CONTACT"}
            </div>
            <h2>
              {language === "it"
                ? "Ricerca, dati e collaborazione."
                : "Research, data and collaboration."}
            </h2>
          </div>
          <div className="about-contact-list">
            <p>
              {language === "it"
                ? "Scegli il canale più adatto: le proposte documentali vengono revisionate prima di qualunque integrazione nella release."
                : "Choose the most appropriate channel: documented submissions are reviewed before any integration into a release."}
            </p>
            <a href={`mailto:${contactAddresses.general}`}>
              <span>{language === "it" ? "Informazioni" : "General"}</span>
              {contactAddresses.general}
            </a>
            <a href={`mailto:${contactAddresses.research}`}>
              <span>Research</span>
              {contactAddresses.research}
            </a>
            <a href={`mailto:${contactAddresses.contributions}`}>
              <span>{language === "it" ? "Contributi" : "Contributions"}</span>
              {contactAddresses.contributions}
            </a>
          </div>
        </div>
      </section>

      <Footer />
    </main>
  );
}

export default AboutPage;
