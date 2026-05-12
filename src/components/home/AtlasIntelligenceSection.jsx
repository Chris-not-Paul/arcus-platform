import "../../styles/home/atlas-intelligence.css";

export default function AtlasIntelligenceSection() {

  return (
    <section className="atlas-preview-section">

      {/* HEADER */}

      <div className="atlas-preview-header">

        <div className="section-label">
          Atlas Intelligence Layer
        </div>

        <h2 className="atlas-preview-title">
          Mapping infrastructure risk
          through spatial intelligence.
        </h2>

      </div>

      {/* PANEL */}

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
              HYDRAULIC RECURRENCE
            </div>

            <div className="sidebar-text">
              River-adjacent bridge systems show
              the highest concentration of recurrent
              collapse events within the dataset.
            </div>

          </div>

          <div className="sidebar-block">

            <div className="sidebar-label">
              STRUCTURAL DEGRADATION
            </div>

            <div className="sidebar-text">
              Repeated failures reveal progressive
              vulnerability accumulation across
              aging infrastructure networks.
            </div>

          </div>

          <div className="sidebar-block">

            <div className="sidebar-label">
              MULTI-TRIGGER INTERACTIONS
            </div>

            <div className="sidebar-text">
              Hydraulic forcing, seismic activity,
              and material degradation frequently
              interact within high-risk territories.
            </div>

          </div>

          <div className="sidebar-footer">

            ARCUS transforms isolated collapse
            records into geospatial intelligence
            capable of revealing systemic
            infrastructure risk patterns.

          </div>

        </div>

      </div>

    </section>
  );
}