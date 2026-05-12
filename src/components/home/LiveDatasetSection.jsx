import "../../styles/home/live-dataset.css";

export default function LiveDatasetSection() {

  return (
    <section className="live-section">

      <div className="live-container">

        {/* LABEL */}

        <div className="live-label">
          Live Dataset Evolution
        </div>

        {/* HEADER */}

        <div className="live-header">

          <h2 className="live-title">
            A continuously expanding
            infrastructure intelligence system.
          </h2>

          <p className="live-description">
            ARCUS is designed as an evolving
            geospatial observatory integrating
            newly documented bridge failures,
            updated territorial classifications,
            and continuously validated sources.
          </p>

        </div>

        {/* LIVE STREAM */}

        <div className="live-stream">

          <div className="live-item">

            <div className="live-dot" />

            <div className="live-text">
              + 14 validated collapse events integrated — 2026
            </div>

          </div>

          <div className="live-item">

            <div className="live-dot" />

            <div className="live-text">
              Expanded hydraulic recurrence coverage across river systems
            </div>

          </div>

          <div className="live-item">

            <div className="live-dot" />

            <div className="live-text">
              Continuous institutional and technical source verification workflow
            </div>

          </div>

          <div className="live-item">

            <div className="live-dot" />

            <div className="live-text">
              Ongoing integration of territorial vulnerability intelligence
            </div>

          </div>

        </div>

      </div>

    </section>
  );
}