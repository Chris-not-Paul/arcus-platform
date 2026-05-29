import {
  useEffect,
  useMemo,
  useState,
} from "react";

import { Link } from "react-router-dom";

import Navbar from "../components/layout/Navbar";
import PageMeta from "../components/layout/PageMeta";

import useLanguage from "../context/useLanguage";

import "../styles/data-access-page.css";

function DataAccessPage() {
  const { language } = useLanguage();
  const [manifest, setManifest] = useState(null);
  const [release, setRelease] = useState(null);
  const [dictionary, setDictionary] = useState(null);

  const copy =
    language === "it"
      ? {
          label: "ARCUS DATA ACCESS",
          title:
            "Dataset, release e API pensati per uso professionale.",
          text:
            "Questa pagina chiarisce cosa e pubblico, cosa appartiene al livello Professional e quali risorse sono gia pronte per integrazioni GIS, BI e workflow tecnici.",
          publicTitle: "Dati pubblici",
          publicText:
            "Risorse ad accesso aperto per trasparenza scientifica, consultazione e diffusione.",
          professionalTitle: "Professional data layer",
          professionalText:
            "Endpoint statici versionati per score, dizionario dati, release, profili territoriali e overlay dichiarati.",
          releaseTitle: "Release controllata",
          dictionaryTitle: "Dizionario dati",
          openAtlas: "Apri Atlante",
          openProfessional: "Apri Professional",
          records: "record",
          checks: "controlli",
          fields: "campi",
          status: "Stato",
        }
      : {
          label: "ARCUS DATA ACCESS",
          title:
            "Datasets, releases and APIs designed for professional use.",
          text:
            "This page clarifies what is public, what belongs to the Professional tier and which resources are already ready for GIS, BI and technical workflow integrations.",
          publicTitle: "Public data",
          publicText:
            "Open-access resources for scientific transparency, consultation and diffusion.",
          professionalTitle: "Professional data layer",
          professionalText:
            "Versioned static endpoints for scores, data dictionary, releases, territory profiles and declared overlays.",
          releaseTitle: "Controlled release",
          dictionaryTitle: "Data dictionary",
          openAtlas: "Open Atlas",
          openProfessional: "Open Professional",
          records: "records",
          checks: "checks",
          fields: "fields",
          status: "Status",
        };

  useEffect(() => {
    Promise.all([
      fetch("/data/professional/api-manifest.json").then(
        (response) => response.json()
      ),
      fetch("/data/professional/data-release.json").then(
        (response) => response.json()
      ),
      fetch("/data/professional/data-dictionary.json").then(
        (response) => response.json()
      ),
    ]).then(([apiManifest, dataRelease, dataDictionary]) => {
      setManifest(apiManifest);
      setRelease(dataRelease);
      setDictionary(dataDictionary);
    });
  }, []);

  const publicEndpoints = useMemo(
    () => [
      {
        description:
          language === "it"
            ? "Eventi ARCUS processati e pronti per l'Atlante pubblico."
            : "Processed ARCUS events used by the public Atlas.",
        path: "/data/processed/events.json",
        resource: "events",
      },
      {
        description:
          language === "it"
            ? "Fonti documentali collegate agli eventi tramite event_id."
            : "Documentary sources linked to events through event_id.",
        path: "/data/processed/sources.json",
        resource: "sources",
      },
    ],
    [language]
  );

  const datasets = dictionary?.datasets || [];
  const endpoints = manifest?.endpoints || [];

  return (
    <main
      className="data-access-page"
      id="main-content"
    >
      <PageMeta
        title="ARCUS Data Access"
        description={copy.text}
      />

      <Navbar />

      <section className="data-access-hero">
        <div className="data-access-container">
          <div className="data-access-label">
            {copy.label}
          </div>

          <h1>{copy.title}</h1>
          <p>{copy.text}</p>

          <div className="data-access-actions">
            <Link to="/atlas">{copy.openAtlas}</Link>
            <Link to="/professional">
              {copy.openProfessional}
            </Link>
          </div>
        </div>
      </section>

      <section className="data-access-section">
        <div className="data-access-container data-access-split">
          <div>
            <div className="data-access-label">
              {copy.publicTitle}
            </div>
            <h2>{copy.publicText}</h2>
          </div>

          <div className="data-access-card-list">
            {publicEndpoints.map((endpoint) => (
              <article key={endpoint.path}>
                <span>{endpoint.resource}</span>
                <strong>{endpoint.path}</strong>
                <p>{endpoint.description}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="data-access-section dark">
        <div className="data-access-container">
          <div className="data-access-section-header">
            <div>
              <div className="data-access-label">
                {copy.professionalTitle}
              </div>
              <h2>{copy.professionalText}</h2>
            </div>

            <div className="data-access-version">
              <span>{manifest?.name || "Manifest"}</span>
              <strong>
                {manifest?.version
                  ? `v${manifest.version}`
                  : "-"}
              </strong>
            </div>
          </div>

          <div className="data-access-endpoints">
            {endpoints.map((endpoint) => (
              <article key={endpoint.path}>
                <span>{endpoint.resource}</span>
                <strong>{endpoint.path}</strong>
                <p>{endpoint.description}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="data-access-section">
        <div className="data-access-container data-access-grid">
          <article className="data-access-release">
            <span>{copy.releaseTitle}</span>
            <strong>
              {release?.version ? `v${release.version}` : "-"}
            </strong>
            <p>{release?.id || "-"}</p>

            <div className="data-access-release-stats">
              <div>
                <b>{release?.counts?.events || 0}</b>
                <em>{copy.records}</em>
              </div>
              <div>
                <b>{release?.checks?.length || 0}</b>
                <em>{copy.checks}</em>
              </div>
            </div>
          </article>

          <article className="data-access-release">
            <span>{copy.dictionaryTitle}</span>
            <strong>{datasets.length}</strong>
            <p>
              {datasets
                .slice(0, 4)
                .map((dataset) => dataset.label)
                .join(", ")}
            </p>

            <div className="data-access-release-stats">
              {datasets.slice(0, 2).map((dataset) => (
                <div key={dataset.id}>
                  <b>{dataset.fields?.length || 0}</b>
                  <em>{dataset.id} {copy.fields}</em>
                </div>
              ))}
            </div>
          </article>
        </div>
      </section>
    </main>
  );
}

export default DataAccessPage;
