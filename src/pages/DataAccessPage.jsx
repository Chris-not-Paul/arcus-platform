import { Link } from "react-router-dom";

import Navbar from "../components/layout/Navbar";
import PageMeta from "../components/layout/PageMeta";

import useLanguage from "../context/useLanguage";
import { openDownloadUrls } from "../utils/apiClient";

import "../styles/data-access-page.css";

function DataAccessPage() {
  const { language } = useLanguage();

  const copy =
    language === "it"
      ? {
          label: "ARCUS DATA ACCESS",
          title:
            "Accesso ai dati, release pubblica e livello Professional.",
          text:
            "ARCUS separa la base scientifica pubblica dalla base dati operativa aggiornata. Il layer Open consente consultazione, citazione e analisi trasparente; il livello Professional produce output tecnici controllati senza esporre il database live in bulk.",
          openAtlas: "Apri Atlante",
          openProfessional: "Apri Professional",
          publicTitle: "Layer Open",
          publicText:
            "ARCUS Open Research 2026.1 pubblica 263 eventi validati e 712 fonti consultabili senza account, con tassonomia, metodologia, audit e download completi.",
          professionalTitle: "Layer Professional",
          professionalText:
            "Il database ARCUS aggiornato alimenta workflow, report, screening territoriali e package GIS controllati. Non viene distribuito come copia integrale del DB.",
          policyTitle: "Regola di accesso",
          policyText:
            "Open dimostra e rende verificabile la base scientifica. Professional trasforma quella base in intelligence operativa, con export contestuali legati a territorio, scenario o asset inventory.",
          releaseTitle: "Release pubblica",
          liveTitle: "Evidence base live",
          outputTitle: "Output Professional",
          publicItems: [
            [
              "Periodo citabile",
              "2000-2026, release versionata arcus-open-2026.1.",
            ],
            [
              "Campi esportabili",
              "Tutti i campi scientifici pubblicabili, inclusi trigger, processo, componente, evidenza, coordinate e fonti.",
            ],
            [
              "Uso previsto",
              "Ricerca, citazione, didattica, verifica metodologica e consultazione pubblica.",
            ],
          ],
          professionalItems: [
            [
              "Screening territoriale",
              "Brief provinciale, pattern storico, contesto hazard e priorita di attenzione.",
            ],
            [
              "Asset workflow",
              "Import inventario, confronto con evidenza storica, watchlist e ranking operativo.",
            ],
            [
              "Export controllati",
              "PDF, one-page brief, CSV contestuali, fonti collegate e pacchetti GIS riferiti allo scenario analizzato.",
            ],
          ],
          policyItems: [
            [
              "Nessun bulk dump del live DB",
              "La release Open e completa; il dataset live inter-release, gli inventari cliente e i risultati operativi restano separati.",
            ],
            [
              "Estratti contestuali",
              "Gli export Professional sono legati a una provincia, uno scenario o un set di asset, non alla replica completa del database.",
            ],
            [
              "Fonti dichiarate",
              "Le fonti pubbliche e i layer territoriali dichiarabili restano tracciabili nel metodo e nei report.",
            ],
          ],
        }
      : {
          label: "ARCUS DATA ACCESS",
          title:
            "Data access, public release and Professional layer.",
          text:
            "ARCUS separates the public scientific baseline from the updated operational evidence base. The Open layer supports consultation, citation and transparent analysis; Professional produces controlled technical outputs without exposing the live database in bulk.",
          openAtlas: "Open Atlas",
          openProfessional: "Open Professional",
          publicTitle: "Open layer",
          publicText:
            "ARCUS Open Research 2026.1 publishes 263 validated events and 712 sources without an account, with taxonomy, methodology, audit and complete downloads.",
          professionalTitle: "Professional layer",
          professionalText:
            "The updated ARCUS database powers workflows, reports, territorial screening and controlled GIS packages. It is not distributed as a full database copy.",
          policyTitle: "Access rule",
          policyText:
            "Open proves and makes the scientific base verifiable. Professional turns that base into operational intelligence, with contextual exports tied to territory, scenario or asset inventory.",
          releaseTitle: "Public release",
          liveTitle: "Live evidence base",
          outputTitle: "Professional outputs",
          publicItems: [
            [
              "Citable period",
              "2000-2026, versioned release arcus-open-2026.1.",
            ],
            [
              "Exportable fields",
              "All publishable scientific fields, including trigger, process, component, evidence, coordinates and sources.",
            ],
            [
              "Intended use",
              "Research, citation, teaching, methodological review and public consultation.",
            ],
          ],
          professionalItems: [
            [
              "Territorial screening",
              "Province brief, historical pattern, hazard context and priority reading.",
            ],
            [
              "Asset workflow",
              "Inventory import, comparison with historical evidence, watchlist and operational ranking.",
            ],
            [
              "Controlled exports",
              "PDF, one-page brief, contextual CSV, linked sources and GIS packages for the analysed scenario.",
            ],
          ],
          policyItems: [
            [
              "No live DB bulk dump",
              "The Open release is complete; the inter-release live dataset, client inventories and operational results remain separate.",
            ],
            [
              "Contextual extracts",
              "Professional exports are tied to a province, scenario or asset set, not to a complete database replica.",
            ],
            [
              "Declared sources",
              "Public sources and declared territorial layers remain traceable in the method and reports.",
            ],
          ],
        };

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
            <a href={openDownloadUrls.csv}>CSV</a>
            <a href={openDownloadUrls.geojson}>GeoJSON</a>
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
            {copy.publicItems.map(([title, text]) => (
              <article key={title}>
                <span>{copy.releaseTitle}</span>
                <strong>{title}</strong>
                <p>{text}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="data-access-section dark">
        <div className="data-access-container data-access-split">
          <div>
            <div className="data-access-label">
              {copy.professionalTitle}
            </div>
            <h2>{copy.professionalText}</h2>
          </div>

          <div className="data-access-card-list data-access-dark-list">
            {copy.professionalItems.map(([title, text]) => (
              <article key={title}>
                <span>{copy.liveTitle}</span>
                <strong>{title}</strong>
                <p>{text}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="data-access-section">
        <div className="data-access-container data-access-split">
          <div>
            <div className="data-access-label">
              {copy.policyTitle}
            </div>
            <h2>{copy.policyText}</h2>
          </div>

          <div className="data-access-card-list">
            {copy.policyItems.map(([title, text]) => (
              <article key={title}>
                <span>{copy.outputTitle}</span>
                <strong>{title}</strong>
                <p>{text}</p>
              </article>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}

export default DataAccessPage;
