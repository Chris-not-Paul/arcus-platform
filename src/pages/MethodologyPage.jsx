import "../styles/methodology/methodologypage.css";

function MethodologyPage() {
  return (
    <div className="methodology-page">

      {/* HERO */}

      <section className="methodology-hero methodology-section">

        <div className="methodology-hero-overlay" />

        <div className="methodology-hero-grid" />

        <div className="methodology-container">

          <div className="methodology-label">
            ARCUS RESEARCH FRAMEWORK
          </div>

          <h1 className="methodology-title">
            Methodology & Classification System
          </h1>

          <p className="methodology-subtitle">
            A transparent framework for identifying,
            validating, classifying and geolocating
            bridge collapse events across the Italian
            infrastructure network.
          </p>

          <div className="methodology-hero-stats">

            <div className="methodology-stat">
              <span className="methodology-stat-value">
                2000–2025
              </span>

              <span className="methodology-stat-label">
                Temporal Coverage
              </span>
            </div>

            <div className="methodology-stat">
              <span className="methodology-stat-value">
                Multi-Source
              </span>

              <span className="methodology-stat-label">
                Validation Framework
              </span>
            </div>

            <div className="methodology-stat">
              <span className="methodology-stat-value">
                WGS84
              </span>

              <span className="methodology-stat-label">
                Geospatial Standard
              </span>
            </div>

          </div>

          <a
            className="methodology-paper-card"
            href="https://doi.org/10.1016/j.dib.2025.112375"
            target="_blank"
            rel="noreferrer"
          >

            <div className="methodology-paper-label">
              RELATED PUBLICATION
            </div>

            <div className="methodology-paper-title">
              Dataset of bridge collapses in Italy
              from 2000 to 2025
            </div>

            <div className="methodology-paper-meta">
              Data in Brief · Elsevier
            </div>

            <div className="methodology-paper-authors">
              Paolini et al.
            </div>

          </a>

        </div>
      </section>

      {/* WHY ARCUS EXISTS */}

      <section className="methodology-section methodology-light">

        <div className="methodology-container methodology-split">

          <div className="methodology-split-left">

            <div className="methodology-section-label">
              CONTEXT
            </div>

            <h2 className="methodology-section-title">
              Why ARCUS Exists
            </h2>

          </div>

          <div className="methodology-split-right">

            <p>
              Information regarding bridge collapse
              events is often fragmented across
              institutional archives, scientific
              publications, technical reports and
              journalistic sources.
            </p>

            <p>
              ARCUS was conceived to provide a
              structured and continuously evolving
              research infrastructure capable of
              improving the accessibility,
              consistency and interpretability of
              bridge collapse information across
              Italy.
            </p>

            <p>
              The framework harmonizes historical
              records, technical classifications,
              source traceability and geospatial
              information into a unified database
              architecture designed for research,
              analysis and infrastructure
              intelligence applications.
            </p>

          </div>

        </div>

      </section>

      {/* WORKFLOW */}

      <section className="methodology-section methodology-dark">

        <div className="methodology-container">

          <div className="methodology-section-header">

            <div className="methodology-section-label">
              OPERATIONAL WORKFLOW
            </div>

            <h2 className="methodology-section-title">
              Data Collection Pipeline
            </h2>

            <p className="methodology-section-description">
              Each event included in ARCUS follows
              a structured multi-step validation and
              classification workflow.
            </p>

          </div>

          <div className="workflow-grid">

            {[
              {
                number: "01",
                title: "Event Detection",
                text:
                  "Keyword-based searches across news archives, institutional reports and technical repositories.",
              },
              {
                number: "02",
                title: "Screening",
                text:
                  "Removal of demolitions, non-collapse events and unverified records.",
              },
              {
                number: "03",
                title: "Cross-Source Validation",
                text:
                  "Verification through technical reports, authorities, scientific papers and independent sources.",
              },
              {
                number: "04",
                title: "Geospatial Localization",
                text:
                  "WGS84 coordinate assignment and municipality-level spatial standardization.",
              },
              {
                number: "05",
                title: "Event Classification",
                text:
                  "Severity, trigger mechanism and specific collapse cause assignment.",
              },
              {
                number: "06",
                title: "Continuous Revision",
                text:
                  "Iterative review and metadata enrichment through evolving research activities.",
              },
            ].map((step) => (
              <div
                className="workflow-card"
                key={step.number}
              >
                <div className="workflow-number">
                  {step.number}
                </div>

                <div className="workflow-title">
                  {step.title}
                </div>

                <div className="workflow-text">
                  {step.text}
                </div>
              </div>
            ))}

          </div>

        </div>

      </section>

      {/* CLASSIFICATION */}

      <section className="methodology-section methodology-light">

        <div className="methodology-container">

          <div className="methodology-section-header">

            <div className="methodology-section-label">
              EVENT TAXONOMY
            </div>

            <h2 className="methodology-section-title">
              Classification System
            </h2>

          </div>

          <div className="classification-grid">

            <div className="classification-card">
              <div className="classification-title">
                Severity
              </div>

              <div className="classification-tags">
                <span>TC · Total Collapse</span>
                <span>PC · Partial Collapse</span>
              </div>
            </div>

            <div className="classification-card">
              <div className="classification-title">
                Mechanism
              </div>

              <div className="classification-tags">
                <span>Triggered</span>
                <span>Not-Triggered</span>
              </div>
            </div>

            <div className="classification-card">
              <div className="classification-title">
                General Cause
              </div>

              <div className="classification-tags">
                <span>Natural</span>
                <span>Human-Induced</span>
              </div>
            </div>

            <div className="classification-card">
              <div className="classification-title">
                Specific Causes
              </div>

              <div className="classification-tags">

                <span className="taxonomy-hydraulic">
                  Hydraulic
                </span>

                <span className="taxonomy-material">
                  Material
                </span>

                <span className="taxonomy-earthquake">
                  Earthquake
                </span>

                <span className="taxonomy-impact">
                  Impact
                </span>

                <span className="taxonomy-landslide">
                  Landslide
                </span>

                <span className="taxonomy-overload">
                  Overload
                </span>

                <span className="taxonomy-design">
                  Design & Construction
                </span>

                <span className="taxonomy-fire">
                  Fire & Explosion
                </span>

              </div>
            </div>

          </div>

        </div>

      </section>

      {/* SOURCE VALIDATION */}

      <section className="methodology-section methodology-light">

        <div className="methodology-container">

          <div className="methodology-section-header">

            <div className="methodology-section-label">
              VALIDATION FRAMEWORK
            </div>

            <h2 className="methodology-section-title">
              Source Hierarchy & Traceability
            </h2>

          </div>

          <div className="source-grid">

            {[
              {
                tier: "TIER 01",
                label: "Official Authorities",
              },
              {
                tier: "TIER 02",
                label: "Technical Reports",
              },
              {
                tier: "TIER 03",
                label: "Scientific Publications",
              },
              {
                tier: "TIER 04",
                label: "Verified News Archives",
              },
              {
                tier: "TIER 05",
                label: "Local Corroborated Sources",
              },
            ].map((item) => (
              <div
                className="source-card"
                key={item}
              >

                <div className="source-tier">
                  {item.tier}
                </div>

                {item.label}

              </div>
            ))}

          </div>

          <div className="methodology-body-text">
            Each event undergoes cross-source
            verification and consistency checks
            between technical, scientific,
            institutional and journalistic records.
            Source traceability metadata are stored
            within the ARCUS architecture to improve
            transparency, reproducibility and future
            database revisions.
          </div>

        </div>

      </section>

      {/* ARCUS EXTENSIONS */}

      <section className="methodology-section methodology-dark">

        <div className="methodology-container">

          <div className="methodology-section-header">

            <div className="methodology-section-label">
              ARCUS EXTENSIONS
            </div>

            <h2 className="methodology-section-title">
              Beyond the Original Dataset
            </h2>

          </div>

          <div className="extensions-grid">

            {[
              "Source traceability architecture",
              "Metadata enrichment system",
              "Multi-source event documentation",
              "Geospatial standardization",
              "Continuous update framework",
              "Infrastructure intelligence integration",
            ].map((item) => (
              <div
                className="extension-card"
                key={item}
              >
                {item}
              </div>
            ))}

          </div>

        </div>

      </section>

      {/* LIMITATIONS */}

      <section className="methodology-section methodology-light">

        <div className="methodology-container methodology-narrow">

          <div className="methodology-section-header">

            <div className="methodology-section-label">
              LIMITATIONS & UNCERTAINTY
            </div>

            <h2 className="methodology-section-title">
              Data Completeness
            </h2>

          </div>

          <div className="methodology-body-text">

            Historical bridge collapse records are
            inherently heterogeneous and often
            affected by incomplete documentation,
            inconsistent reporting quality and
            varying levels of technical detail.

            <br />
            <br />

            Earlier decades may present
            underreporting biases, especially for
            localized events occurring outside major
            urban areas. In some cases, spatial
            information is limited to municipality-
            level accuracy due to the absence of
            reliable georeferenced documentation.

          </div>

        </div>

      </section>

      {/* REFERENCES */}

      <section className="methodology-section methodology-footer">

        <div className="methodology-container methodology-narrow">

          <div className="methodology-section-label">
            REFERENCES
          </div>

          <h2 className="methodology-section-title">
            Research Framework
          </h2>

          <div className="reference-card">

            <a
            className="reference-card"
            href="https://doi.org/10.1016/j.dib.2025.112375"
            target="_blank"
            rel="noreferrer"
          >

            <div className="reference-paper-label">
              RELATED PUBLICATION
            </div>

            <div className="reference-paper-title">
              Dataset of bridge collapses in Italy
              from 2000 to 2025
            </div>

            <div className="reference-paper-meta">
              Data in Brief · Elsevier
            </div>

            <div className="reference-authors">
              Paolini et al.
            </div>

          </a>

          </div>

        </div>

      </section>

    </div>
  );
}

export default MethodologyPage;