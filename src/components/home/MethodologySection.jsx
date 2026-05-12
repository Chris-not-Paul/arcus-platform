import "../../styles/home/methodology.css";

export default function MethodologySection() {

  return (
    <section className="methodology-section">

      {/* HEADER */}

      <div className="methodology-header">

        <div className="section-label">
          Research Methodology
        </div>

        <h2 className="methodology-title">
          Building structured collapse
          intelligence through validated
          analytical workflows.
        </h2>

      </div>

      {/* GRID */}

      <div className="methodology-grid">

        {/* CARD 01 */}

        <div className="methodology-card">

          <div className="methodology-step">
            Step 01
          </div>

          <h3 className="methodology-card-title">
            Event Collection
          </h3>

          <p className="methodology-text">

            Bridge collapse events are collected
            through institutional archives,
            scientific literature, technical
            investigations, and verified reports.

          </p>

        </div>

        {/* CARD 02 */}

        <div className="methodology-card">

          <div className="methodology-step">
            Step 02
          </div>

          <h3 className="methodology-card-title">
            Source Validation
          </h3>

          <p className="methodology-text">

            Each event undergoes multi-source
            verification to ensure consistency
            across technical documentation,
            forensic evidence, and territorial data.

          </p>

        </div>

        {/* CARD 03 */}

        <div className="methodology-card">

          <div className="methodology-step">
            Step 03
          </div>

          <h3 className="methodology-card-title">
            Spatial Classification
          </h3>

          <p className="methodology-text">

            Collapse mechanisms, environmental
            conditions, and territorial patterns
            are classified to support geospatial
            intelligence interpretation.

          </p>

        </div>

        {/* CARD 04 */}

        <div className="methodology-card">

          <div className="methodology-step">
            Step 04
          </div>

          <h3 className="methodology-card-title">
            Intelligence Integration
          </h3>

          <p className="methodology-text">

            Structured event intelligence is
            integrated into the evolving ARCUS
            observatory to reveal systemic
            infrastructure risk dynamics.

          </p>

        </div>

      </div>

    </section>
  );
}