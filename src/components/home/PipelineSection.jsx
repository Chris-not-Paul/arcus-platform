import useLanguage from "../../context/useLanguage";

import "../../styles/home/pipeline.css";

export default function PipelineSection() {
  const { language } = useLanguage();

  const copy = {
    en: {
      description:
        "ARCUS combines data acquisition, validation workflows, territorial classification, and geospatial interpretation into a continuously evolving analytical infrastructure.",
      label: "Analytical Pipeline",
      steps: [
        [
          "01",
          "Data Acquisition",
          "Collection of bridge collapse events from institutional archives, scientific publications, and validated technical sources.",
        ],
        [
          "02",
          "Spatial Structuring",
          "Georeferenced events are classified according to collapse mechanisms, territorial dynamics, and infrastructure typologies.",
        ],
        [
          "03",
          "Intelligence Interpretation",
          "Analytical layers reveal recurrence patterns, territorial vulnerabilities, and systemic infrastructure risk interactions.",
        ],
      ],
      title:
        "Transforming fragmented collapse records into structured spatial intelligence.",
    },
    it: {
      description:
        "ARCUS combina acquisizione dati, workflow di validazione, classificazione territoriale e interpretazione geospaziale in un'infrastruttura analitica in evoluzione continua.",
      label: "Pipeline analitica",
      steps: [
        [
          "01",
          "Acquisizione dati",
          "Raccolta degli eventi di collasso da archivi istituzionali, pubblicazioni scientifiche e fonti tecniche validate.",
        ],
        [
          "02",
          "Strutturazione spaziale",
          "Gli eventi georeferenziati sono classificati secondo meccanismi di collasso, dinamiche territoriali e tipologie infrastrutturali.",
        ],
        [
          "03",
          "Interpretazione intelligence",
          "I layer analitici rivelano ricorrenze, vulnerabilita territoriali e interazioni sistemiche del rischio infrastrutturale.",
        ],
      ],
      title:
        "Trasformare registri di collasso frammentati in intelligence spaziale strutturata.",
    },
  };

  const text = copy[language] || copy.en;

  return (
    <section className="pipeline-section">
      <div className="pipeline-header">
        <div className="section-label">
          {text.label}
        </div>

        <h2 className="pipeline-title">
          {text.title}
        </h2>

        <p className="pipeline-description">
          {text.description}
        </p>
      </div>

      <div className="pipeline-track">
        <div className="pipeline-line" />

        {text.steps.map(([index, title, body]) => (
          <div
            className="pipeline-step"
            key={index}
          >
            <div className="pipeline-index">
              {index}
            </div>

            <h3 className="pipeline-step-title">
              {title}
            </h3>

            <p className="pipeline-step-text">
              {body}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}
