import useLanguage from "../../context/useLanguage";

import "../../styles/home/atlas-intelligence.css";

export default function AtlasIntelligenceSection() {
  const { language } = useLanguage();

  const copy = {
    en: {
      footer:
        "ARCUS transforms isolated collapse records into geospatial intelligence capable of revealing systemic infrastructure risk patterns.",
      label: "Atlas Intelligence Layer",
      micro: [
        "HYDRAULIC SCOUR",
        "STRUCTURAL FATIGUE",
        "HIGH RECURRENCE",
        "SEISMIC VULNERABILITY",
      ],
      panels: [
        [
          "HYDRAULIC RECURRENCE",
          "River-adjacent bridge systems show the highest concentration of recurrent collapse events within the dataset.",
        ],
        [
          "STRUCTURAL DEGRADATION",
          "Repeated failures reveal progressive vulnerability accumulation across aging infrastructure networks.",
        ],
        [
          "MULTI-TRIGGER INTERACTIONS",
          "Hydraulic forcing, seismic activity, and material degradation frequently interact within high-risk territories.",
        ],
      ],
      title:
        "Mapping infrastructure risk through spatial intelligence.",
    },
    it: {
      footer:
        "ARCUS trasforma eventi di collasso isolati in intelligence geospaziale, capace di rivelare pattern sistemici di rischio infrastrutturale.",
      label: "Layer di intelligence dell'Atlante",
      micro: [
        "SCALZAMENTO IDRAULICO",
        "FATICA STRUTTURALE",
        "ALTA RICORRENZA",
        "VULNERABILITA SISMICA",
      ],
      panels: [
        [
          "RICORRENZA IDRAULICA",
          "I sistemi di ponti prossimi ai corsi d'acqua mostrano la piu alta concentrazione di eventi ricorrenti nel dataset.",
        ],
        [
          "DEGRADO STRUTTURALE",
          "I cedimenti ripetuti evidenziano accumuli progressivi di vulnerabilita nelle reti infrastrutturali mature.",
        ],
        [
          "INTERAZIONI MULTI-INNESCO",
          "Forzanti idrauliche, sismicita e degrado dei materiali possono interagire nei territori a rischio elevato.",
        ],
      ],
      title:
        "Mappare il rischio infrastrutturale attraverso l'intelligence spaziale.",
    },
  };

  const text = copy[language] || copy.en;

  return (
    <section className="atlas-preview-section">
      <div className="atlas-preview-header">
        <div className="section-label">
          {text.label}
        </div>

        <h2 className="atlas-preview-title">
          {text.title}
        </h2>
      </div>

      <div className="atlas-intelligence-panel">
        <div className="intelligence-field">
          <div className="intelligence-grid" />
          <div className="signal-line signal-1" />
          <div className="signal-line signal-2" />
          <div className="signal-line signal-3" />
          <div className="signal-line signal-4" />
          <div className="cluster-node cluster-1" />
          <div className="cluster-node cluster-2" />
          <div className="cluster-node cluster-3" />
          <div className="cluster-node cluster-4" />

          {text.micro.map((label, index) => (
            <div
              className={`micro-label label-${index + 1}`}
              key={label}
            >
              {label}
            </div>
          ))}

          <div className="intelligence-core">
            <div className="core-ring ring-1" />
            <div className="core-ring ring-2" />
            <div className="core-ring ring-3" />
            <div className="core-center" />
          </div>
        </div>

        <div className="intelligence-sidebar">
          {text.panels.map(([label, body]) => (
            <div
              className="sidebar-block"
              key={label}
            >
              <div className="sidebar-label">
                {label}
              </div>

              <div className="sidebar-text">
                {body}
              </div>
            </div>
          ))}

          <div className="sidebar-footer">
            {text.footer}
          </div>
        </div>
      </div>
    </section>
  );
}
