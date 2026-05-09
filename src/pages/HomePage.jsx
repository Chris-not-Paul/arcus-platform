import Navbar from "../components/layout/Navbar";

function HomePage() {
  return (
    <>
      <Navbar />

      <main
        style={{
          minHeight: "100vh",
          background: "#18181a",
          color: "white",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "120px 40px",
          boxSizing: "border-box",
        }}
      >
        <div
          style={{
            maxWidth: "1100px",
            width: "100%",
          }}
        >
          {/* LABEL */}

          <div
            style={{
              fontSize: "12px",
              letterSpacing: "0.18em",
              textTransform: "uppercase",
              opacity: 0.58,
              marginBottom: "22px",
            }}
          >
            Geospatial Infrastructure
            Intelligence
          </div>

          {/* TITLE */}

          <h1
            style={{
              margin: 0,
              fontSize: "clamp(82px, 14vw, 180px)",
              lineHeight: 0.9,
              fontWeight: 800,
              letterSpacing: "-0.04em",
              marginBottom: "24px",
            }}
          >
            ARCUS
          </h1>

          {/* SUBTITLE */}

          <div
            style={{
              fontSize: "28px",
              fontWeight: 500,
              color: "rgba(255,255,255,0.78)",
              marginBottom: "30px",
            }}
          >
            Infrastructure Failure
            Observatory
          </div>

          {/* MANIFESTO */}

          <div
            style={{
              fontSize: "34px",
              lineHeight: 1.25,
              fontWeight: 600,
              maxWidth: "780px",
              marginBottom: "32px",
            }}
          >
            Understanding past failures
            is essential to prevent
            future ones.
          </div>

          {/* DESCRIPTION */}

          <p
            style={{
              maxWidth: "760px",
              fontSize: "18px",
              lineHeight: 1.8,
              color:
                "rgba(255,255,255,0.68)",
              marginBottom: "46px",
            }}
          >
            ARCUS is a data-driven
            platform focused on the
            systematic analysis of
            bridge collapse events,
            infrastructure
            vulnerabilities, and risk
            patterns through
            geospatial intelligence and
            spatiotemporal analytics.
          </p>

          {/* CTA */}

          <div
            style={{
              display: "flex",
              gap: "18px",
              flexWrap: "wrap",
            }}
          >
            <a
              href="/atlas"
              style={{
                padding: "16px 28px",
                borderRadius: "999px",
                background: "white",
                color: "#18181a",
                textDecoration: "none",
                fontWeight: 700,
                fontSize: "14px",
                letterSpacing: "0.04em",
                textTransform:
                  "uppercase",
              }}
            >
              Explore the Atlas
            </a>

            <a
              href="/methodology"
              style={{
                padding: "16px 28px",
                borderRadius: "999px",
                border:
                  "1px solid rgba(255,255,255,0.16)",
                color: "white",
                textDecoration: "none",
                fontWeight: 700,
                fontSize: "14px",
                letterSpacing: "0.04em",
                textTransform:
                  "uppercase",
              }}
            >
              View Methodology
            </a>
          </div>
        </div>
      </main>
    </>
  );
}

export default HomePage;