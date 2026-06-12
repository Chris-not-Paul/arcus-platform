import {
  useEffect,
  useMemo,
  useState,
} from "react";

import { Link } from "react-router-dom";

import Navbar from "../components/layout/Navbar";
import PageMeta from "../components/layout/PageMeta";
import ScrollReveal from "../components/motion/ScrollReveal";

import useLanguage from "../context/useLanguage";

import logoFull from "../assets/logo/logo-full.svg";

import extractYear from "../utils/extractYear";

import "../styles/home/HomePage.css";

function formatValue(value) {
  return new Intl.NumberFormat("en-US").format(
    value
  );
}

export default function HomePage() {
  const { language } = useLanguage();
  const [events, setEvents] = useState([]);
  const [sources, setSources] = useState([]);

  useEffect(() => {
    fetch("/data/processed/events.json")
      .then((response) => response.json())
      .then(setEvents);

    fetch("/data/processed/sources.json")
      .then((response) => response.json())
      .then(setSources);
  }, []);

  const metrics = useMemo(() => {
    const years = events
      .map((event) => extractYear(event.date))
      .filter(Boolean);

    const totalCollapse = events.filter(
      (event) => event.collapse_severity === "TC"
    ).length;

    const triggered = events.filter(
      (event) => event.triggered
    ).length;

    return {
      events: events.length,
      sources: sources.length,
      totalCollapse,
      triggered,
      years:
        years.length > 0
          ? `${Math.min(...years)}-${Math.max(...years)}`
          : "-",
    };
  }, [events, sources]);

  const copy = {
    en: {
      atlasCta: "Open Atlas",
      professionalCta: "Open Professional",
      heroLabel:
        "Verified Bridge Collapse Intelligence",
      heroTitle:
        "Verified bridge-collapse intelligence for infrastructure analysis.",
      heroText:
        "ARCUS connects documented collapse events, source traceability, causes, territory and professional outputs so infrastructure evidence can be explored, compared and turned into technical decisions.",
      metrics: [
        ["Validated events", metrics.events],
        ["Documented sources", metrics.sources],
        ["Temporal coverage", metrics.years],
        ["Total collapses", metrics.totalCollapse],
      ],
      evidenceLabel: "Evidence System",
      evidenceTitle: "What ARCUS connects.",
      evidenceText:
        "ARCUS is not only a map. It is a structured evidence layer where each event remains connected to the information needed to interpret it.",
      layers: [
        [
          "Verified events",
          "Collapse records are organized by location, year, severity, trigger and failure mechanism.",
        ],
        [
          "Source traceability",
          "Each record stays connected to its documentary base: scientific, institutional, technical and verified news sources.",
        ],
        [
          "Territorial context",
          "Events become readable across provinces, regions, hazard layers and infrastructure patterns.",
        ],
        [
          "Analytical indicators",
          "Reliability, vulnerability and exposure signals help compare places and cases before deeper technical work.",
        ],
        [
          "Operational outputs",
          "Professional workflows turn the same evidence into screening, watchlists, reports and exportable files.",
        ],
      ],
      atlasLabel: "Atlas Layer",
      atlasTitle: "Start with the public evidence.",
      atlasText:
        "The public Atlas lets a user inspect where bridge collapses occurred, how they are classified and which sources support each record. It is the fastest way to understand the evidence base behind ARCUS.",
      atlasEvidence: [
        ["Cause taxonomy", "Hydraulic, impact, material, seismic and construction-related mechanisms."],
        ["Event severity", "Total and partial collapses remain readable at territorial scale."],
        ["Source traceability", "Each bridge card connects the event to its documented evidence base."],
      ],
      professionalLabel: "Professional Workspace",
      professionalTitle:
        "Move from observation to operational analysis.",
      professionalText:
        "Professional is for users who need to turn historical evidence into technical work: compare territories, screen asset inventories, generate explainable reports and export data for GIS or internal workflows.",
      professionalOutputs: [
        ["Territorial scenarios", "Compare provinces and technical stress scenarios."],
        ["Asset screening", "Upload inventories and identify priority checks."],
        ["Reports and exports", "Produce PDF, CSV and GeoJSON outputs."],
      ],
      professionalSignals: [
        ["Priority index", "82"],
        ["Evidence grade", "A/B"],
        ["Export pack", "PDF + GIS"],
      ],
      methodologyLabel: "Why It Is Credible",
      methodologyTitle:
        "Built for traceability, reproducibility and declared limits.",
      methodologyText:
        "Every record is part of a validation logic: event detection, cross-source verification, geolocation, classification and continuous revision. ARCUS supports technical screening; it does not replace inspection, diagnosis or safety certification.",
      routes: [
        ["Atlas", "/atlas"],
        ["Methodology", "/methodology"],
        ["Analytics", "/analytics"],
        ["Solutions", "/plans"],
      ],
      pathLabel: "Choose Your Use Case",
      pathTitle: "Start from the job you need to do.",
      pathText:
        "A first-time user should not have to understand the whole platform before choosing the right next step.",
      clientPaths: [
        {
          action: "Open public evidence",
          label: "Explore evidence",
          path: "/atlas",
          text: "Use the Atlas to inspect events, sources, timeline and taxonomy.",
        },
        {
          action: "Read the analytics",
          label: "Understand patterns",
          path: "/analytics",
          text: "Use Analytics to understand patterns, territories, causes and public indicators.",
        },
        {
          action: "Open Professional",
          label: "Produce outputs",
          path: "/professional",
          text: "Use Professional when you need scenarios, asset screening, reports and exportable evidence.",
        },
      ],
    },
    it: {
      atlasCta: "Apri l'Atlante",
      professionalCta: "Apri Professional",
      heroLabel:
        "Intelligence verificata sui crolli dei ponti",
      heroTitle:
        "Intelligence verificata sui crolli dei ponti per l'analisi infrastrutturale.",
      heroText:
        "ARCUS connette eventi documentati, tracciabilita delle fonti, cause, territorio e output professionali per esplorare, confrontare e trasformare l'evidenza in decisioni tecniche.",
      metrics: [
        ["Eventi validati", metrics.events],
        ["Fonti documentate", metrics.sources],
        ["Copertura temporale", metrics.years],
        ["Collassi totali", metrics.totalCollapse],
      ],
      evidenceLabel: "Sistema di evidenza",
      evidenceTitle: "Cosa connette ARCUS.",
      evidenceText:
        "ARCUS non e soltanto una mappa. E un layer di evidenza strutturata in cui ogni evento resta collegato alle informazioni necessarie per interpretarlo.",
      layers: [
        [
          "Eventi verificati",
          "I record di collasso sono organizzati per localizzazione, anno, gravita, trigger e meccanismo di cedimento.",
        ],
        [
          "Tracciabilita fonti",
          "Ogni record resta collegato alla base documentale: fonti scientifiche, istituzionali, tecniche e giornalistiche verificate.",
        ],
        [
          "Contesto territoriale",
          "Gli eventi diventano leggibili per province, regioni, layer hazard e pattern infrastrutturali.",
        ],
        [
          "Indicatori analitici",
          "Affidabilita, vulnerabilita ed esposizione aiutano a confrontare luoghi e casi prima del lavoro tecnico di dettaglio.",
        ],
        [
          "Output operativi",
          "I workflow Professional trasformano la stessa evidenza in screening, watchlist, report e file esportabili.",
        ],
      ],
      atlasLabel: "Layer Atlas",
      atlasTitle: "Parti dall'evidenza pubblica.",
      atlasText:
        "L'Atlante pubblico permette di ispezionare dove sono avvenuti i crolli, come sono classificati e quali fonti sostengono ogni record. E il modo piu rapido per capire la base di evidenza di ARCUS.",
      atlasEvidence: [
        ["Tassonomia cause", "Meccanismi idraulici, impatto, materiali, sisma e criticita progettuali/costruttive."],
        ["Gravita evento", "Collassi totali e parziali restano leggibili alla scala territoriale."],
        ["Tracciabilita fonti", "Ogni scheda ponte collega l'evento alla sua base documentale."],
      ],
      professionalLabel: "Workspace Professional",
      professionalTitle:
        "Passa dall'osservazione all'analisi operativa.",
      professionalText:
        "Professional e per chi deve trasformare l'evidenza storica in lavoro tecnico: confrontare territori, analizzare inventari asset, generare report spiegabili ed esportare dati per GIS o workflow interni.",
      professionalOutputs: [
        ["Scenari territoriali", "Confronta province e scenari di stress tecnico."],
        ["Asset screening", "Carica inventari e individua controlli prioritari."],
        ["Report ed export", "Produci output PDF, CSV e GeoJSON."],
      ],
      professionalSignals: [
        ["Priority index", "82"],
        ["Classe evidenza", "A/B"],
        ["Export pack", "PDF + GIS"],
      ],
      methodologyLabel: "Perche e credibile",
      methodologyTitle:
        "Costruito per tracciabilita, riproducibilita e limiti dichiarati.",
      methodologyText:
        "Ogni record entra in una logica di validazione: individuazione evento, verifica multi-fonte, geolocalizzazione, classificazione e revisione continua. ARCUS supporta lo screening tecnico; non sostituisce ispezioni, diagnosi strutturali o certificazioni di sicurezza.",
      routes: [
        ["Atlante", "/atlas"],
        ["Metodologia", "/methodology"],
        ["Analytics", "/analytics"],
        ["Soluzioni", "/plans"],
      ],
      pathLabel: "Scegli il caso d'uso",
      pathTitle: "Parti dal lavoro che devi fare.",
      pathText:
        "Chi entra per la prima volta non deve capire tutta la piattaforma prima di scegliere il passo giusto.",
      clientPaths: [
        {
          action: "Apri evidenze pubbliche",
          label: "Esplorare evidenze",
          path: "/atlas",
          text: "Usa l'Atlante per consultare eventi, fonti, timeline e tassonomia.",
        },
        {
          action: "Leggi gli analytics",
          label: "Capire i pattern",
          path: "/analytics",
          text: "Usa Analytics per capire pattern, territori, cause e indicatori pubblici.",
        },
        {
          action: "Apri Professional",
          label: "Produrre output",
          path: "/professional",
          text: "Usa Professional quando servono scenari, asset screening, report ed evidenza esportabile.",
        },
      ],
    },
  };

  const text = copy[language] || copy.en;

  return (
    <main
      className="home-page"
      id="main-content"
    >
      <PageMeta
        title="ARCUS"
        description={
          language === "it"
            ? "ARCUS collega eventi verificati, fonti, territorio e output professionali per l'analisi dei crolli dei ponti."
            : "ARCUS connects verified bridge-collapse events, sources, territory and professional outputs for infrastructure analysis."
        }
      />

      <Navbar />

      <section className="home-hero">
        <img
          className="home-hero-logo"
          src={logoFull}
          alt=""
          aria-hidden="true"
        />

        <div
          className="home-hero-visual"
          aria-hidden="true"
        >
          <div className="home-hero-map-grid" />

          <div className="home-hero-vector one" />
          <div className="home-hero-vector two" />
          <div className="home-hero-vector three" />

          {[
            ["2000", "Hydraulic", "34%"],
            ["2018", "Material", "A/B"],
            ["2024", "Impact", "TC"],
          ].map(([year, cause, value], index) => (
            <div
              className={`home-hero-node node-${index + 1}`}
              key={year}
            >
              <span>{year}</span>
              <strong>{cause}</strong>
              <em>{value}</em>
            </div>
          ))}
        </div>

        <div className="home-hero-shade" />

        <ScrollReveal
          className="home-container home-hero-content"
          variant="scale"
        >
          <div className="home-kicker">
            {text.heroLabel}
          </div>

          <h1>{text.heroTitle}</h1>

          <p>{text.heroText}</p>

          <div className="home-actions">
            <Link
              className="home-primary-action"
              to="/atlas"
            >
              {text.atlasCta}
            </Link>

            <Link
              className="home-secondary-action"
              to="/professional"
            >
              {text.professionalCta}
            </Link>
          </div>
        </ScrollReveal>

        <div className="home-container home-hero-metrics">
          {text.metrics.map(([label, value], index) => (
            <ScrollReveal
              as="div"
              className="home-metric"
              delay={index * 80}
              key={label}
              variant="soft"
            >
              <strong>
                {typeof value === "number"
                  ? formatValue(value)
                  : value}
              </strong>
              <span>{label}</span>
            </ScrollReveal>
          ))}
        </div>
      </section>

      <section className="home-section home-evidence">
        <ScrollReveal className="home-container home-split">
          <div>
            <div className="home-section-label">
              {text.evidenceLabel}
            </div>

            <h2>{text.evidenceTitle}</h2>
          </div>

          <p>{text.evidenceText}</p>
        </ScrollReveal>

        <div className="home-container home-layer-grid">
          {text.layers.map(([title, body], index) => (
            <ScrollReveal
              as="article"
              className="home-layer-card"
              delay={index * 70}
              key={title}
              variant="soft"
            >
              <span>
                {String(index + 1).padStart(2, "0")}
              </span>
              <h3>{title}</h3>
              <p>{body}</p>
            </ScrollReveal>
          ))}
        </div>
      </section>

      <section className="home-section home-client-path">
        <ScrollReveal className="home-container home-split">
          <div>
            <div className="home-section-label">
              {text.pathLabel}
            </div>

            <h2>{text.pathTitle}</h2>
          </div>

          <p>{text.pathText}</p>
        </ScrollReveal>

        <div className="home-container home-path-grid">
          {text.clientPaths.map((item, index) => (
            <ScrollReveal
              as="article"
              className="home-path-card"
              delay={index * 90}
              key={item.path}
              variant="scale"
            >
              <span>{item.label}</span>
              <p>{item.text}</p>
              <Link to={item.path}>
                {item.action}
              </Link>
            </ScrollReveal>
          ))}
        </div>
      </section>

      <section className="home-section home-dark-band">
        <div className="home-container home-atlas-grid">
          <ScrollReveal>
            <div className="home-section-label">
              {text.atlasLabel}
            </div>

            <h2>{text.atlasTitle}</h2>
            <p>{text.atlasText}</p>

            <Link
              className="home-atlas-link"
              to="/atlas"
            >
              {text.atlasCta}
            </Link>
          </ScrollReveal>

          <ScrollReveal
            className="home-atlas-brief"
            delay={120}
            variant="scale"
          >
            <div
              className="home-atlas-preview"
              aria-hidden="true"
            >
              <div className="home-atlas-preview-map">
                <i className="marker marker-one" />
                <i className="marker marker-two" />
                <i className="marker marker-three" />
                <i className="marker marker-four" />
                <span className="cluster">12</span>
              </div>

              <div className="home-atlas-preview-panel">
                <span>Event card</span>
                <strong>TC / Hydraulic</strong>
                <em>4 sources linked</em>
              </div>
            </div>

            <div className="home-atlas-brief-header">
              <span>ARCUS ATLAS</span>
              <strong>{metrics.events}</strong>
            </div>

            <div className="home-atlas-signal">
              <div />
              <span>
                {language === "it"
                  ? "Eventi geolocalizzati e verificati"
                  : "Geolocated and verified events"}
              </span>
            </div>

            <div className="home-atlas-evidence-list">
              {text.atlasEvidence.map(([label, body]) => (
                <article key={label}>
                  <span>{label}</span>
                  <p>{body}</p>
                </article>
              ))}
            </div>

            <div className="home-atlas-foot">
              <span>
                {metrics.triggered}{" "}
                {language === "it"
                  ? "eventi innescati"
                  : "triggered events"}
              </span>
              <span>
                {metrics.totalCollapse} TC
              </span>
            </div>
          </ScrollReveal>
        </div>
      </section>

      <section className="home-section home-professional">
        <ScrollReveal className="home-container home-split">
          <div>
            <div className="home-section-label">
              {text.professionalLabel}
            </div>

            <h2>{text.professionalTitle}</h2>
          </div>

          <div>
            <p>{text.professionalText}</p>

            <div
              className="home-professional-mockup"
              aria-hidden="true"
            >
              <div className="home-professional-topbar">
                <span>Professional Workspace</span>
                <strong>Live scenario</strong>
              </div>

              <div className="home-professional-signal-grid">
                {text.professionalSignals.map(([label, value]) => (
                  <article key={label}>
                    <span>{label}</span>
                    <strong>{value}</strong>
                  </article>
                ))}
              </div>

              <div className="home-professional-rows">
                {[
                  ["Asset screening", 84],
                  ["Source reliability", 72],
                  ["Hazard exposure", 61],
                ].map(([label, width]) => (
                  <div key={label}>
                    <span>{label}</span>
                    <i>
                      <em
                        style={{
                          width: `${width}%`,
                        }}
                      />
                    </i>
                  </div>
                ))}
              </div>
            </div>

            <div className="home-professional-grid">
              {text.professionalOutputs.map(([title, body]) => (
                <article key={title}>
                  <span>{title}</span>
                  <p>{body}</p>
                </article>
              ))}
            </div>

            <Link
              className="home-professional-link"
              to="/professional"
            >
              {text.professionalCta}
            </Link>
          </div>
        </ScrollReveal>
      </section>

      <section className="home-section home-method">
        <ScrollReveal className="home-container home-split">
          <div>
            <div className="home-section-label">
              {text.methodologyLabel}
            </div>

            <h2>{text.methodologyTitle}</h2>
          </div>

          <div>
            <p>{text.methodologyText}</p>

            <div className="home-route-grid">
              {text.routes.map(([label, path]) => (
                <Link
                  className="home-route"
                  key={path}
                  to={path}
                >
                  {label}
                </Link>
              ))}
            </div>
          </div>
        </ScrollReveal>
      </section>
    </main>
  );
}
