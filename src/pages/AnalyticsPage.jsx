import Navbar from "../components/layout/Navbar";

function AnalyticsPage() {
  return (
    <>
      <Navbar />

      <main
        style={{
          minHeight: "100vh",
          background: "#ece8e2",
          paddingTop: "140px",
          paddingLeft: "40px",
          paddingRight: "40px",
          boxSizing: "border-box",
        }}
      >
        <div
          style={{
            maxWidth: "1200px",
            margin: "0 auto",
          }}
        >
          <div
            style={{
              fontSize: "12px",
              letterSpacing: "0.18em",
              textTransform: "uppercase",
              opacity: 0.5,
              marginBottom: "18px",
            }}
          >
            ARCUS
          </div>

          <h1
            style={{
              margin: 0,
              fontSize: "72px",
              lineHeight: 1,
              marginBottom: "24px",
              color: "#1b1b1d",
            }}
          >
            Analytics
          </h1>

          <p
            style={{
              maxWidth: "760px",
              fontSize: "18px",
              lineHeight: 1.8,
              color: "#5f646b",
            }}
          >
            Dynamic charts,
            spatiotemporal analysis,
            collapse trends, risk
            indicators, and advanced
            infrastructure intelligence
            tools will be integrated in
            future versions of ARCUS.
          </p>
        </div>
      </main>
    </>
  );
}

export default AnalyticsPage;