import "../../styles/home/credibility.css";

export default function CredibilitySection() {

  return (
    <section className="credibility-section">

      <div className="credibility-grid">

        {/* LEFT */}

        <div className="credibility-left">

          <div className="section-label">
            Research Infrastructure
          </div>

          <h2 className="credibility-title">
            Building a continuously evolving
            global archive of infrastructure
            failure intelligence.
          </h2>

        </div>

        {/* RIGHT */}

        <div className="credibility-right">

          <div className="credibility-item">

            <div className="credibility-meta">
              Dataset Coverage
            </div>

            <div className="credibility-value">
              Global bridge collapse events
              spanning multiple territorial,
              hydraulic, and structural contexts.
            </div>

          </div>

          <div className="credibility-item">

            <div className="credibility-meta">
              Scientific Validation
            </div>

            <div className="credibility-value">
              Multi-source verification workflow
              integrating institutional reports,
              technical publications, and
              forensic documentation.
            </div>

          </div>

          <div className="credibility-item">

            <div className="credibility-meta">
              Infrastructure Intelligence
            </div>

            <div className="credibility-value">
              Spatial interpretation framework
              designed to identify recurrence
              patterns, systemic vulnerabilities,
              and territorial risk dynamics.
            </div>

          </div>

          <div className="credibility-item">

            <div className="credibility-meta">
              Continuous Expansion
            </div>

            <div className="credibility-value">
              The ARCUS dataset evolves through
              ongoing integration of newly
              documented collapse events and
              updated analytical classifications.
            </div>

          </div>

        </div>

      </div>

    </section>
  );
}