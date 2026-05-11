import { Link } from "react-router-dom";

import Navbar from "../components/layout/Navbar";

import "./HomePage.css";

function HomePage() {
  return (
    <>
      <Navbar />

      <main className="home-page">
        {/* HERO */}

        <section className="hero-section">
          {/* BACKGROUND GLOW */}

          <div className="hero-glow" />

          <div className="hero-content">
            {/* LABEL */}

            <div className="hero-label">
              Geospatial Infrastructure
              Intelligence
            </div>

            {/* TITLE */}

            <h1 className="hero-title">
              ARCUS
            </h1>

            <div className="hero-atlas-label">
              Atlas
            </div>  
            
            {/* SUBTITLE */}

            <div className="hero-subtitle">
              Infrastructure Failure
              Observatory
            </div>

            {/* MANIFESTO */}

            <div className="hero-manifesto">
              <span>
                Infrastructure failures
                leave patterns.
              </span>

              <span className="manifesto-accent">
                ARCUS ATLAS
                reveals them.
              </span>
            </div>

            {/* DESCRIPTION */}

            <p className="hero-description">
              ARCUS is a data-driven
              platform focused on the
              systematic analysis of
              bridge collapse events,
              infrastructure
              vulnerabilities, and risk
              patterns through
              geospatial intelligence
              and spatiotemporal
              analytics.
            </p>

            {/* CTA */}

            <div className="hero-actions">
              <Link
                to="/atlas"
                className="primary-button"
              >
                Explore the Atlas
              </Link>

              <a
                href="#methodology"
                className="secondary-button"
              >
                View Methodology
              </a>
            </div>
          </div>
        </section>

        {/* DATASET OVERVIEW */}

        <section className="overview-section">
          <div className="overview-grid">
            {/* CARD 1 */}

            <div className="overview-card">
              <div className="overview-number">
                250+
              </div>

              <div className="overview-text">
                Georeferenced collapse
                events collected across
                the Italian territory.
              </div>
            </div>

            {/* CARD 2 */}

            <div className="overview-card">
              <div className="overview-number">
                20+
              </div>

              <div className="overview-text">
                Distinct triggering
                mechanisms and failure
                typologies analyzed.
              </div>
            </div>

            {/* CARD 3 */}

            <div className="overview-card">
              <div className="overview-number">
                100%
              </div>

              <div className="overview-text">
                Events validated through
                technical reports,
                scientific literature,
                and institutional
                sources.
              </div>
            </div>
          </div>
        </section>

        {/* SCIENTIFIC CREDIBILITY */}

        <section className="credibility-section">
          <div className="credibility-grid">

            {/* LEFT */}

            <div className="credibility-left">
              <div className="section-label">
                Research Infrastructure
              </div>

              <h2 className="credibility-title">
                Validated collapse
                intelligence.
              </h2>
            </div>

            {/* RIGHT */}

            <div className="credibility-right">

              <div className="credibility-item">
                <div className="credibility-meta">
                  Observed period
                </div>

                <div className="credibility-value">
                  2000 — 2025
                </div>
              </div>

              <div className="credibility-item">
                <div className="credibility-meta">
                  Validated events
                </div>

                <div className="credibility-value">
                  250+
                </div>
              </div>

              <div className="credibility-item">
                <div className="credibility-meta">
                  Territorial focus
                </div>

                <div className="credibility-value">
                  Italian infrastructure network
                </div>
              </div>

              <div className="credibility-item">
                <div className="credibility-meta">
                  Source verification
                </div>

                <div className="credibility-value">
                  Institutional + scientific
                </div>
              </div>

              <div className="credibility-item">
                <div className="credibility-meta">
                  Classification framework
                </div>

                <div className="credibility-value">
                  Multi-factor event taxonomy
                </div>
              </div>

            </div>
          </div>
        </section>


        {/* WHY ARCUS */}

        <section className="why-section">
          <div className="why-grid">
            {/* LEFT */}

            <div className="why-left">
              <div className="section-label">
                Why ARCUS Matters
              </div>

              <h2 className="why-title">
                Infrastructure failures
                are not isolated events.
              </h2>
            </div>

            {/* RIGHT */}

            <div className="why-right">
              <p className="why-text">
                Bridge collapses often
                emerge from recurring
                systemic patterns
                involving hydraulic
                hazards, structural
                degradation, seismic
                events, maintenance
                deficiencies, and
                progressive risk
                accumulation.
              </p>

              <p className="why-text">
                ARCUS aims to transform
                historical collapse data
                into actionable
                infrastructure
                intelligence capable of
                supporting engineering
                decisions, risk
                mitigation strategies,
                and future
                resilience-oriented
                policies.
              </p>
            </div>
          </div>
        </section>

        {/* ATLAS INTELLIGENCE LAYER */}

        <section className="atlas-preview-section">
          <div className="atlas-preview-header">
            <div className="section-label">
              Atlas Intelligence Layer
            </div>

            <h2 className="atlas-preview-title">
              Mapping infrastructure risk
              through spatial intelligence.
            </h2>
          </div>

          {/* INTELLIGENCE PANEL */}

          <div className="atlas-intelligence-panel">

            {/* LEFT FIELD */}

            <div className="intelligence-field">

              {/* GRID */}

              <div className="intelligence-grid" />

              {/* SIGNAL LINES */}

              <div className="signal-line signal-1" />
              <div className="signal-line signal-2" />
              <div className="signal-line signal-3" />
              <div className="signal-line signal-4" />

              {/* CLUSTERS */}

              <div className="cluster-node cluster-1" />
              <div className="cluster-node cluster-2" />
              <div className="cluster-node cluster-3" />
              <div className="cluster-node cluster-4" />
              

              {/* MICRO LABELS */}

              <div className="micro-label label-1">
                HYDRAULIC SCOUR
              </div>

              <div className="micro-label label-2">
                STRUCTURAL FATIGUE
              </div>

              <div className="micro-label label-3">
                HIGH RECURRENCE
              </div>

              <div className="micro-label label-4">
                SEISMIC VULNERABILITY
              </div>

              {/* CENTRAL CORE */}

              <div className="intelligence-core">
                <div className="core-ring ring-1" />
                <div className="core-ring ring-2" />
                <div className="core-ring ring-3" />

                <div className="core-center" />
              </div>
            </div>

            {/* RIGHT SIDEBAR */}

            <div className="intelligence-sidebar">

              <div className="sidebar-block">
                <div className="sidebar-label">
                  Observed period
                </div>

                <div className="sidebar-value">
                  2000—2025
                </div>
              </div>

              <div className="sidebar-block">
                <div className="sidebar-label">
                  Validated events
                </div>

                <div className="sidebar-value">
                  250+
                </div>
              </div>

              <div className="sidebar-block">
                <div className="sidebar-label">
                  Dominant collapse mechanism
                </div>

                <div className="sidebar-value">
                  Hydraulic phenomena
                </div>
              </div>

              <div className="sidebar-block">
                <div className="sidebar-label">
                  Triggered events
                </div>

                <div className="sidebar-value">
                  92%
                </div>
              </div>

              <div className="sidebar-block">
                <div className="sidebar-label">
                  Total collapse share
                </div>

                <div className="sidebar-value">
                  80%
                </div>
              </div>

              <div className="sidebar-block">
                <div className="sidebar-label">
                  Primary territorial pattern
                </div>

                <div className="sidebar-value">
                  Northern river corridors
                </div>
              </div>

              <div className="sidebar-footer">
                Spatial intelligence derived
                from georeferenced bridge
                collapse events, triggering
                mechanisms, and territorial
                recurrence patterns.
              </div>

            </div>
          </div>    
          </section>

        {/* METHODOLOGY */}

        <section
          id="methodology"
          className="methodology-section"
        >
          <div className="methodology-header">
            <div className="section-label">
              Scientific Methodology
            </div>

            <h2 className="methodology-title">
              A structured framework
              for infrastructure
              failure analysis.
            </h2>
          </div>

          {/* GRID */}

          <div className="methodology-grid">
            {/* STEP 1 */}

            <div className="methodology-card">
              <div className="methodology-step">
                01
              </div>

              <h3 className="methodology-card-title">
                Event Collection
              </h3>

              <p className="methodology-text">
                Collapse events are
                collected from
                institutional reports,
                scientific literature,
                technical
                investigations, and
                verified news archives.
              </p>
            </div>

            {/* STEP 2 */}

            <div className="methodology-card">
              <div className="methodology-step">
                02
              </div>

              <h3 className="methodology-card-title">
                Data Validation
              </h3>

              <p className="methodology-text">
                Each event undergoes
                source verification,
                temporal normalization,
                geospatial validation,
                and metadata
                consistency checks.
              </p>
            </div>

            {/* STEP 3 */}

            <div className="methodology-card">
              <div className="methodology-step">
                03
              </div>

              <h3 className="methodology-card-title">
                Failure Classification
              </h3>

              <p className="methodology-text">
                Events are categorized
                according to triggering
                mechanisms, collapse
                severity, structural
                typology, and
                contextual hazard
                conditions.
              </p>
            </div>

            {/* STEP 4 */}

            <div className="methodology-card">
              <div className="methodology-step">
                04
              </div>

              <h3 className="methodology-card-title">
                Spatial Intelligence
              </h3>

              <p className="methodology-text">
                Geospatial analysis
                enables the
                identification of risk
                clusters, recurring
                patterns, and
                territorial
                vulnerability trends.
              </p>
            </div>
          </div>
        </section>
      </main>
    </>
  );
}

export default HomePage;