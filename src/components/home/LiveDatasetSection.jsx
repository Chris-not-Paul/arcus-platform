import useLanguage from "../../context/useLanguage";

import "../../styles/home/live-dataset.css";

export default function LiveDatasetSection() {
  const { language } = useLanguage();

  const copy = {
    en: {
      description:
        "ARCUS is designed as an evolving geospatial observatory integrating newly documented bridge failures, updated territorial classifications, and continuously validated sources.",
      label: "Live Dataset Evolution",
      title:
        "A continuously expanding infrastructure intelligence system.",
      updates: [
        "+ 14 validated collapse events integrated - 2026",
        "Expanded hydraulic recurrence coverage across river systems",
        "Continuous institutional and technical source verification workflow",
        "Ongoing integration of territorial vulnerability intelligence",
      ],
    },
    it: {
      description:
        "ARCUS e progettato come osservatorio geospaziale in evoluzione, capace di integrare nuovi collassi documentati, classificazioni territoriali aggiornate e fonti costantemente validate.",
      label: "Evoluzione del dataset",
      title:
        "Un sistema di intelligence infrastrutturale in continua espansione.",
      updates: [
        "+ 14 eventi di collasso validati integrati - 2026",
        "Copertura idraulica estesa sui sistemi fluviali",
        "Verifica continua delle fonti istituzionali e tecniche",
        "Integrazione progressiva dell'intelligence sulle vulnerabilita territoriali",
      ],
    },
  };

  const text = copy[language] || copy.en;

  return (
    <section className="live-section">
      <div className="live-container">
        <div className="live-label">
          {text.label}
        </div>

        <div className="live-header">
          <h2 className="live-title">
            {text.title}
          </h2>

          <p className="live-description">
            {text.description}
          </p>
        </div>

        <div className="live-stream">
          {text.updates.map((update) => (
            <div
              className="live-item"
              key={update}
            >
              <div className="live-dot" />

              <div className="live-text">
                {update}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
