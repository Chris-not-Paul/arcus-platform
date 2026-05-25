import "../../styles/home/why.css";
import useLanguage from "../../context/useLanguage";

export default function WhySection() {
  const { language } = useLanguage();

  const copy = {
    en: {
      label: "Why ARCUS Matters",
      paragraphs: [
        "Bridge collapses frequently emerge from recurring territorial dynamics, hydraulic forcing conditions, structural degradation processes, and overlapping systemic vulnerabilities.",
        "ARCUS transforms fragmented failure records into a coherent geospatial intelligence framework capable of revealing spatial recurrence patterns across infrastructure systems.",
        "By integrating technical sources, collapse mechanisms, and territorial context, the platform supports a more analytical understanding of systemic infrastructure risk evolution.",
      ],
      title:
        "Infrastructure failures are rarely isolated anomalies.",
    },
    it: {
      label: "Perche ARCUS conta",
      paragraphs: [
        "I crolli dei ponti spesso emergono da dinamiche territoriali ricorrenti, sollecitazioni idrauliche, processi di degrado strutturale e vulnerabilita sistemiche sovrapposte.",
        "ARCUS trasforma registri frammentati di cedimento in un framework coerente di intelligence geospaziale, capace di leggere ricorrenze spaziali nei sistemi infrastrutturali.",
        "Integrando fonti tecniche, meccanismi di collasso e contesto territoriale, la piattaforma supporta una comprensione piu analitica dell'evoluzione del rischio infrastrutturale.",
      ],
      title:
        "I cedimenti infrastrutturali raramente sono anomalie isolate.",
    },
  };

  const text = copy[language] || copy.en;

  return (
    <section className="why-section">

      <div className="why-grid">

        {/* LEFT */}

        <div className="why-left">

          <div className="section-label">
            {text.label}
          </div>

          <h2 className="why-title">
            {text.title}
          </h2>

        </div>

        {/* RIGHT */}

        <div className="why-right">

          {text.paragraphs.map((paragraph) => (
            <p
              className="why-text"
              key={paragraph}
            >
              {paragraph}
            </p>
          ))}

        </div>

      </div>

    </section>
  );
}
