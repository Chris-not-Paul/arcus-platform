import Navbar from "../components/layout/Navbar";

function PublicationsPage() {
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
            Publications
          </h1>

          <p
            style={{
              maxWidth: "760px",
              fontSize: "18px",
              lineHeight: 1.8,
              color: "#5f646b",
            }}
          >
            Research papers,
            conference material,
            presentations, and future
            scientific publications
            related to ARCUS will be
            collected in this section.
          </p>
        </div>
      </main>
    </>
  );
}

export default PublicationsPage;