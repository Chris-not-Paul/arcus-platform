import "../../styles/home/breathing.css";
import useLanguage from "../../context/useLanguage";

export default function BreathingSection() {
  const { language } = useLanguage();

  const text =
    language === "it"
      ? {
          line:
            "I cedimenti infrastrutturali non sono anomalie isolate.",
          subline:
            "Sono segnali ricorrenti nello spazio, inscritti nei sistemi territoriali.",
        }
      : {
          line:
            "Infrastructure failures are not isolated anomalies.",
          subline:
            "They are spatially recurring signals embedded within territorial systems.",
        };

  return (
    <section className="breathing-section">

      {/* TECHNICAL LINE */}

      <div className="breathing-line">

        <div className="breathing-pulse" />

      </div>

      {/* TEXT */}

      <div className="breathing-text">

        {text.line}

      </div>

      <div className="breathing-subtext">

        {text.subline}

      </div>

    </section>
  );
}
