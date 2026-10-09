import { Link } from "react-router-dom";

import useLanguage from "../../context/useLanguage";
import masterLogo from "../../assets/institutional/master-logo-transparent.png";

import "./PatronageBlock.css";

const MASTER_URL = "https://associazionemaster.it/";

function PatronageBlock({ detailed = false }) {
  const { language } = useLanguage();

  const copy = language === "it"
    ? {
        label: "Patrocinio istituzionale",
        prefix: "Con il patrocinio di",
        name: "MASTER",
        fullName: "Materials and Structures, Testing and Research",
        compactTitle:
          "Un progetto indipendente, con riconoscimento istituzionale.",
        compactText:
          "L’Associazione MASTER patrocina l’intera piattaforma ARCUS. La curatela scientifica e la responsabilità editoriale restano indipendenti.",
        compactAction: "Approfondisci il patrocinio",
        text:
          "Il patrocinio riguarda l’intera piattaforma ARCUS e ne riconosce la coerenza con la promozione della sicurezza e della ricerca nell’ingegneria civile.",
        note:
          "La curatela scientifica e la responsabilità editoriale di ARCUS restano indipendenti; il patrocinio non costituisce validazione dei singoli record o risultati analitici.",
        action: "Visita Associazione MASTER",
      }
    : {
        label: "Institutional patronage",
        prefix: "With the institutional patronage of",
        name: "MASTER Association",
        fullName: "Materials and Structures, Testing and Research",
        compactTitle:
          "An independent project with institutional recognition.",
        compactText:
          "The MASTER Association grants its patronage to the ARCUS platform as a whole. Scientific stewardship and editorial responsibility remain independent.",
        compactAction: "About the patronage",
        text:
          "The patronage covers the ARCUS platform as a whole and recognises its alignment with the promotion of safety and research in civil engineering.",
        note:
          "ARCUS retains independent scientific stewardship and editorial responsibility; the patronage does not validate individual records or analytical results.",
        action: "Visit the MASTER Association",
      };

  return (
    <section
      aria-label={copy.label}
      className={`arcus-patronage ${detailed ? "is-detailed" : "is-compact"}`}
      id={detailed ? "institutional-patronage" : undefined}
    >
      <div className="arcus-patronage-inner">
        {detailed ? (
          <>
            <div className="arcus-patronage-heading">
              <span>{copy.label}</span>
              <p>{copy.prefix}</p>
              <a
                aria-label={`${copy.name} — ${copy.fullName}`}
                className="arcus-patronage-logo-link"
                href={MASTER_URL}
                rel="noreferrer"
                target="_blank"
              >
                <img
                  alt={`${copy.name} — ${copy.fullName}`}
                  className="arcus-patronage-logo"
                  src={masterLogo}
                />
              </a>
            </div>

            <div className="arcus-patronage-detail">
              <p>{copy.text}</p>
              <small>{copy.note}</small>
              <a href={MASTER_URL} rel="noreferrer" target="_blank">
                {copy.action} ↗
              </a>
            </div>
          </>
        ) : (
          <>
            <div className="arcus-patronage-story">
              <span>{copy.label}</span>
              <h2>{copy.compactTitle}</h2>
              <p>{copy.compactText}</p>
              <Link to="/about#institutional-patronage">
                {copy.compactAction} →
              </Link>
            </div>

            <div className="arcus-patronage-mark">
              <span>{copy.prefix}</span>
              <a
                aria-label={`${copy.name} — ${copy.fullName}`}
                className="arcus-patronage-logo-link"
                href={MASTER_URL}
                rel="noreferrer"
                target="_blank"
              >
                <img
                  alt={`${copy.name} — ${copy.fullName}`}
                  className="arcus-patronage-logo"
                  src={masterLogo}
                />
              </a>
            </div>
          </>
        )}
      </div>
    </section>
  );
}

export default PatronageBlock;
