import Navbar from "../components/layout/Navbar";
import PageMeta from "../components/layout/PageMeta";

import useLanguage from "../context/useLanguage";

function AboutPage() {
  const { language } = useLanguage();

  const copy = {
    en: {
      eyebrow: "ARCUS IDENTITY",
      title: "Scientific Infrastructure Intelligence",
      text:
        "ARCUS is an infrastructure failure observatory dedicated to the observation, classification and analysis of bridge collapse phenomena. The platform combines scientific methodology, source traceability, geospatial intelligence and future professional analytics.",
    },
    it: {
      eyebrow: "IDENTITA ARCUS",
      title:
        "Intelligence Scientifica per le Infrastrutture",
      text:
        "ARCUS e un osservatorio sui cedimenti infrastrutturali dedicato all'osservazione, classificazione e analisi dei fenomeni di collasso dei ponti. La piattaforma combina metodologia scientifica, tracciabilita delle fonti, intelligence geospaziale e futuri strumenti professionali di analisi.",
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
          background: "var(--arcus-paper)",
          boxSizing: "border-box",
          padding: "170px 40px 90px",
        }}
      >
        <PageMeta
          title={content.title}
          description={
            language === "it"
              ? "Identita e visione strategica di ARCUS, osservatorio scientifico dedicato ai cedimenti infrastrutturali."
              : "ARCUS identity and strategic vision, a scientific observatory dedicated to infrastructure failure intelligence."
          }
        />

        <div
          style={{
            margin: "0 auto",
            maxWidth: "1100px",
          }}
        >
          <div
          style={{
              color: "var(--arcus-clay)",
              fontSize: "11px",
              fontWeight: 700,
              letterSpacing: "0.12em",
              marginBottom: "22px",
              textTransform: "uppercase",
            }}
          >
            {content.eyebrow}
          </div>

          <h1
          style={{
              color: "var(--arcus-ink)",
              fontFamily: "var(--arcus-font-display)",
              fontSize: "clamp(52px, 8vw, 98px)",
              fontWeight: 700,
              letterSpacing: 0,
              lineHeight: 0.96,
              margin: 0,
              maxWidth: "900px",
            }}
          >
            {content.title}
          </h1>

          <p
          style={{
              color: "var(--arcus-ink-soft)",
              fontSize: "20px",
              lineHeight: 1.85,
              marginTop: "34px",
              maxWidth: "780px",
            }}
          >
            {content.text}
          </p>
        </div>
      </main>
    </>
  );
}

export default AboutPage;
