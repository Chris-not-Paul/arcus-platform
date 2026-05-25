import { Link } from "react-router-dom";

import Navbar from "../components/layout/Navbar";
import PageMeta from "../components/layout/PageMeta";
import useLanguage from "../context/useLanguage";

import "../styles/not-found.css";

export default function NotFoundPage() {
  const { language } = useLanguage();

  const copy = {
    en: {
      eyebrow: "ARCUS / 404",
      title: "This route is not part of the observatory.",
      text:
        "The requested page is unavailable or has moved. Return to the ARCUS entry point or open the Atlas to continue exploring the dataset.",
      home: "Back to ARCUS",
      atlas: "Open Atlas",
      meta:
        "ARCUS page not found. Return to the infrastructure failure observatory or open the Atlas.",
    },
    it: {
      eyebrow: "ARCUS / 404",
      title:
        "Questa rotta non fa parte dell'osservatorio.",
      text:
        "La pagina richiesta non e disponibile o e stata spostata. Torna all'ingresso di ARCUS oppure apri l'Atlante per continuare a esplorare il dataset.",
      home: "Torna ad ARCUS",
      atlas: "Apri l'Atlante",
      meta:
        "Pagina ARCUS non trovata. Torna all'osservatorio sui cedimenti infrastrutturali oppure apri l'Atlante.",
    },
  };

  const content = copy[language] || copy.en;

  return (
    <main
      className="not-found-page"
      id="main-content"
    >
      <PageMeta
        title="404"
        description={content.meta}
      />

      <Navbar />

      <section className="not-found-hero">
        <div className="not-found-grid" />

        <div className="not-found-content">
          <div className="not-found-eyebrow">
            {content.eyebrow}
          </div>

          <h1>{content.title}</h1>

          <p>{content.text}</p>

          <div className="not-found-actions">
            <Link to="/">{content.home}</Link>
            <Link to="/atlas">{content.atlas}</Link>
          </div>
        </div>
      </section>
    </main>
  );
}
