import { Link } from "react-router-dom";

import "../../styles/home/hero.css";

export default function HeroSection() {

  return (
    <section className="hero-section">

      {/* BACKGROUND GLOW */}

      <div className="hero-glow" />

      {/* CONTENT */}

      <div className="hero-content">

        <div className="hero-label">
          Global Infrastructure Failure Observatory
        </div>

        <h1 className="hero-title">
          ARCUS
        </h1>

        <div className="hero-atlas-label">
          Atlas
        </div>

        <div className="hero-subtitle">
          Geospatial intelligence for bridge collapse analysis
        </div>

        {/* MANIFESTO */}

        <div className="hero-manifesto">

          <span>
            Infrastructure failures
          </span>

          <span className="manifesto-accent">
            leave patterns.
          </span>

          <span>
            ARCUS ATLAS reveals them.
          </span>

        </div>

        {/* DESCRIPTION */}

        <p className="hero-description">

          ARCUS is a continuously evolving
          geospatial observatory dedicated to the
          documentation, classification, and spatial
          interpretation of bridge collapse events
          across global infrastructure systems.

        </p>

        {/* ACTIONS */}

        <div className="hero-actions">

          <Link
            to="/atlas"
            className="primary-button"
          >
            Explore Atlas
          </Link>

          <Link
            to="/methodology"
            className="secondary-button"
          >
            Methodology
          </Link>

        </div>

      </div>
    </section>
  );
}