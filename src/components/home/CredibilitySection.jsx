import "../../styles/home/credibility.css";
import useLanguage from "../../context/useLanguage";

export default function CredibilitySection() {
  const { language } = useLanguage();

  const copy = {
    en: {
      label: "Research Infrastructure",
      title:
        "Building a continuously evolving global archive of infrastructure failure intelligence.",
      items: [
        [
          "Dataset Coverage",
          "Global bridge collapse events spanning multiple territorial, hydraulic, and structural contexts.",
        ],
        [
          "Scientific Validation",
          "Multi-source verification workflow integrating institutional reports, technical publications, and forensic documentation.",
        ],
        [
          "Infrastructure Intelligence",
          "Spatial interpretation framework designed to identify recurrence patterns, systemic vulnerabilities, and territorial risk dynamics.",
        ],
        [
          "Continuous Expansion",
          "The ARCUS dataset evolves through ongoing integration of newly documented collapse events and updated analytical classifications.",
        ],
      ],
    },
    it: {
      label: "Infrastruttura di ricerca",
      title:
        "Costruire un archivio in evoluzione continua per l'intelligence sui cedimenti infrastrutturali.",
      items: [
        [
          "Copertura del dataset",
          "Eventi di collasso dei ponti letti attraverso contesti territoriali, idraulici e strutturali differenti.",
        ],
        [
          "Validazione scientifica",
          "Workflow di verifica multi-fonte basato su report istituzionali, pubblicazioni tecniche e documentazione forense.",
        ],
        [
          "Intelligence infrastrutturale",
          "Un framework spaziale pensato per individuare ricorrenze, vulnerabilita sistemiche e dinamiche territoriali di rischio.",
        ],
        [
          "Espansione continua",
          "Il dataset ARCUS cresce con l'integrazione di nuovi eventi documentati e classificazioni analitiche aggiornate.",
        ],
      ],
    },
  };

  const text = copy[language] || copy.en;

  return (
    <section className="credibility-section">

      <div className="credibility-grid">

        {/* LEFT */}

        <div className="credibility-left">

          <div className="section-label">
            {text.label}
          </div>

          <h2 className="credibility-title">
            {text.title}
          </h2>

        </div>

        {/* RIGHT */}

        <div className="credibility-right">

          {text.items.map(([label, value]) => (
            <div
              className="credibility-item"
              key={label}
            >
              <div className="credibility-meta">
                {label}
              </div>

              <div className="credibility-value">
                {value}
              </div>
            </div>
          ))}

        </div>

      </div>

    </section>
  );
}
