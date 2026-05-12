import "../../styles/home/pipeline.css";

export default function PipelineSection() {

  return (
    <section className="pipeline-section">

      {/* HEADER */}

      <div className="pipeline-header">

        <div className="section-label">
          Analytical Pipeline
        </div>

        <h2 className="pipeline-title">
          Transforming fragmented collapse
          records into structured spatial
          intelligence.
        </h2>

        <p className="pipeline-description">

          ARCUS combines data acquisition,
          validation workflows, territorial
          classification, and geospatial
          interpretation into a continuously
          evolving analytical infrastructure.

        </p>

      </div>

      {/* PIPELINE TRACK */}

      <div className="pipeline-track">

        <div className="pipeline-line" />

        {/* STEP 01 */}

        <div className="pipeline-step">

          <div className="pipeline-index">
            01
          </div>

          <h3 className="pipeline-step-title">
            Data Acquisition
          </h3>

          <p className="pipeline-step-text">

            Collection of bridge collapse events
            from institutional archives,
            scientific publications,
            and validated technical sources.

          </p>

        </div>

        {/* STEP 02 */}

        <div className="pipeline-step">

          <div className="pipeline-index">
            02
          </div>

          <h3 className="pipeline-step-title">
            Spatial Structuring
          </h3>

          <p className="pipeline-step-text">

            Georeferenced events are classified
            according to collapse mechanisms,
            territorial dynamics,
            and infrastructure typologies.

          </p>

        </div>

        {/* STEP 03 */}

        <div className="pipeline-step">

          <div className="pipeline-index">
            03
          </div>

          <h3 className="pipeline-step-title">
            Intelligence Interpretation
          </h3>

          <p className="pipeline-step-text">

            Analytical layers reveal recurrence
            patterns, territorial vulnerabilities,
            and systemic infrastructure
            risk interactions.

          </p>

        </div>

      </div>

    </section>
  );
}