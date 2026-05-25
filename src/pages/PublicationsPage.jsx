import Navbar from "../components/layout/Navbar";
import PageMeta from "../components/layout/PageMeta";

import useLanguage from "../context/useLanguage";

function PublicationsPage() {
  const { language } = useLanguage();

  const copy = {
    en: {
      eyebrow: "ARCUS",
      title: "Publications",
      text:
        "Research papers, conference material, presentations, and future scientific publications related to ARCUS will be collected in this section.",
    },
    it: {
      eyebrow: "ARCUS",
      title: "Pubblicazioni",
      text:
        "Articoli scientifici, materiali congressuali, presentazioni e future pubblicazioni legate ad ARCUS saranno raccolti in questa sezione.",
    },
  };

  const content = copy[language] || copy.en;

  return (
    <>
      <Navbar />

      <main
        id="main-content"
        style={{
          minHeight: "100vh",
          background: "var(--arcus-paper-warm)",
          paddingTop: "140px",
          paddingLeft: "40px",
          paddingRight: "40px",
          boxSizing: "border-box",
        }}
      >
        <PageMeta
          title={content.title}
          description={
            language === "it"
              ? "Pubblicazioni, presentazioni e materiali scientifici collegati alla piattaforma ARCUS."
              : "Publications, presentations and scientific material connected to the ARCUS platform."
          }
        />

        <div
          style={{
            maxWidth: "1200px",
            margin: "0 auto",
          }}
        >
          <div
          style={{
              fontSize: "12px",
              letterSpacing: "0.12em",
              textTransform: "uppercase",
              color: "var(--arcus-clay)",
              fontWeight: 700,
              marginBottom: "18px",
            }}
          >
            {content.eyebrow}
          </div>

          <h1
            style={{
              margin: 0,
              fontFamily: "var(--arcus-font-display)",
              fontSize: "clamp(52px, 8vw, 96px)",
              fontWeight: 700,
              lineHeight: 0.96,
              marginBottom: "24px",
              color: "var(--arcus-ink)",
            }}
          >
            {content.title}
          </h1>

          <p
            style={{
              maxWidth: "760px",
              fontSize: "18px",
              lineHeight: 1.8,
              color: "var(--arcus-ink-soft)",
            }}
          >
            {content.text}
          </p>
        </div>
      </main>
    </>
  );
}

export default PublicationsPage;
