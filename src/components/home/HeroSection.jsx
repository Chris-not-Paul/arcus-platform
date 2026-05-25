import { Link } from "react-router-dom";

import useLanguage from "../../context/useLanguage";

import "../../styles/home/hero.css";

export default function HeroSection() {
  const { language } = useLanguage();

  const copy = {
    en: {
      description:
        "ARCUS is a continuously evolving geospatial observatory dedicated to the documentation, classification, and spatial interpretation of bridge collapse events across global infrastructure systems.",
      explore: "Explore Atlas",
      label:
        "Global Infrastructure Failure Observatory",
      methodology: "Methodology",
      manifestoA: "Infrastructure failures",
      manifestoB: "leave patterns.",
      manifestoC: "ARCUS ATLAS reveals them.",
      subtitle:
        "Geospatial intelligence for bridge collapse analysis",
    },
    it: {
      description:
        "ARCUS e un osservatorio geospaziale in continua evoluzione dedicato alla documentazione, classificazione e interpretazione spaziale degli eventi di collasso dei ponti.",
      explore: "Esplora l'Atlante",
      label:
        "Osservatorio globale sui cedimenti infrastrutturali",
      methodology: "Metodologia",
      manifestoA: "I cedimenti infrastrutturali",
      manifestoB: "lasciano tracce.",
      manifestoC: "ARCUS ATLAS le rende leggibili.",
      subtitle:
        "Intelligence geospaziale per l'analisi dei crolli dei ponti",
    },
  };

  const text = copy[language] || copy.en;

  return (
    <section className="hero-section">

      {/* BACKGROUND GLOW */}

      <div className="hero-glow" />

      {/* CONTENT */}

      <div className="hero-content">

        <div className="hero-label">
          {text.label}
        </div>

        <h1 className="hero-title">
          ARCUS
        </h1>

        <div className="hero-atlas-label">
          Atlas
        </div>

        <div className="hero-subtitle">
          {text.subtitle}
        </div>

        {/* MANIFESTO */}

        <div className="hero-manifesto">

          <span>
            {text.manifestoA}
          </span>

          <span className="manifesto-accent">
            {text.manifestoB}
          </span>

          <span>
            {text.manifestoC}
          </span>

        </div>

        {/* DESCRIPTION */}

        <p className="hero-description">

          {text.description}

        </p>

        {/* ACTIONS */}

        <div className="hero-actions">

          <Link
            to="/atlas"
            className="primary-button"
          >
            {text.explore}
          </Link>

          <Link
            to="/methodology"
            className="secondary-button"
          >
            {text.methodology}
          </Link>

        </div>

      </div>
    </section>
  );
}
