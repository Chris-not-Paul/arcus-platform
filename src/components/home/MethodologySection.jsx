import useLanguage from "../../context/useLanguage";

import "../../styles/home/methodology.css";

export default function MethodologySection() {
  const { language } = useLanguage();

  const copy = {
    en: {
      label: "Research Methodology",
      steps: [
        [
          "Step 01",
          "Event Collection",
          "Bridge collapse events are collected through institutional archives, scientific literature, technical investigations, and verified reports.",
        ],
        [
          "Step 02",
          "Source Validation",
          "Each event undergoes multi-source verification to ensure consistency across technical documentation, forensic evidence, and territorial data.",
        ],
        [
          "Step 03",
          "Spatial Classification",
          "Collapse mechanisms, environmental conditions, and territorial patterns are classified to support geospatial intelligence interpretation.",
        ],
        [
          "Step 04",
          "Intelligence Integration",
          "Structured event intelligence is integrated into the evolving ARCUS observatory to reveal systemic infrastructure risk dynamics.",
        ],
      ],
      title:
        "Building structured collapse intelligence through validated analytical workflows.",
    },
    it: {
      label: "Metodologia di ricerca",
      steps: [
        [
          "Fase 01",
          "Raccolta degli eventi",
          "Gli eventi di collasso dei ponti sono raccolti da archivi istituzionali, letteratura scientifica, indagini tecniche e report verificati.",
        ],
        [
          "Fase 02",
          "Validazione delle fonti",
          "Ogni evento e sottoposto a verifica multi-fonte per garantire coerenza tra documentazione tecnica, evidenze disponibili e dati territoriali.",
        ],
        [
          "Fase 03",
          "Classificazione spaziale",
          "Meccanismi di collasso, condizioni ambientali e pattern territoriali sono classificati per supportare l'interpretazione geospaziale.",
        ],
        [
          "Fase 04",
          "Integrazione intelligence",
          "L'intelligence strutturata sugli eventi viene integrata nell'osservatorio ARCUS per leggere dinamiche sistemiche di rischio infrastrutturale.",
        ],
      ],
      title:
        "Costruire intelligence strutturata sui collassi attraverso workflow analitici validati.",
    },
  };

  const text = copy[language] || copy.en;

  return (
    <section className="methodology-section">
      <div className="methodology-header">
        <div className="section-label">
          {text.label}
        </div>

        <h2 className="methodology-title">
          {text.title}
        </h2>
      </div>

      <div className="methodology-grid">
        {text.steps.map(([step, title, body]) => (
          <div
            className="methodology-card"
            key={step}
          >
            <div className="methodology-step">
              {step}
            </div>

            <h3 className="methodology-card-title">
              {title}
            </h3>

            <p className="methodology-text">
              {body}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}
