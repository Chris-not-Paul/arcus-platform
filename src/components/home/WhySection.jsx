import "../../styles/home/why.css";

export default function WhySection() {

  return (
    <section className="why-section">

      <div className="why-grid">

        {/* LEFT */}

        <div className="why-left">

          <div className="section-label">
            Why ARCUS Matters
          </div>

          <h2 className="why-title">
            Infrastructure failures are
            rarely isolated anomalies.
          </h2>

        </div>

        {/* RIGHT */}

        <div className="why-right">

          <p className="why-text">

            Bridge collapses frequently emerge
            from recurring territorial dynamics,
            hydraulic forcing conditions,
            structural degradation processes,
            and overlapping systemic vulnerabilities.

          </p>

          <p className="why-text">

            ARCUS transforms fragmented failure
            records into a coherent geospatial
            intelligence framework capable of
            revealing spatial recurrence patterns
            across infrastructure systems.

          </p>

          <p className="why-text">

            By integrating technical sources,
            collapse mechanisms, and territorial
            context, the platform supports a more
            analytical understanding of systemic
            infrastructure risk evolution.

          </p>

        </div>

      </div>

    </section>
  );
}