import {
  useEffect,
  useMemo,
  useState,
} from "react";

import { Link } from "react-router-dom";

import Navbar from "../components/layout/Navbar";
import PageMeta from "../components/layout/PageMeta";

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
      briefingCta: "View Analytics",
      heroLabel:
        "Scientific Infrastructure Failure Observatory",
      heroTitle:
        "Bridge collapse intelligence, built as a research infrastructure.",
      heroText:
        "ARCUS transforms verified collapse records, source traceability and geospatial evidence into an observatory for infrastructure failure analysis.",
      metrics: [
        ["Validated events", metrics.events],
        ["Documented sources", metrics.sources],
        ["Temporal coverage", metrics.years],
        ["Total collapses", metrics.totalCollapse],
      ],
      evidenceLabel: "Evidence System",
      evidenceTitle:
        "From fragmented records to structured infrastructure intelligence.",
      evidenceText:
        "The platform connects event classification, territorial context, source validation and analytical interpretation. It is designed for researchers, institutions and professional stakeholders who need more than a static map.",
      layers: [
        [
          "Public Observatory",
          "Atlas, methodology, dataset overview and selected analytics create scientific credibility and public diffusion.",
        ],
        [
          "Professional Workspace",
          "Advanced analytics, hazard overlays, saved workspaces, exports and explainable outputs create the operational layer.",
        ],
        [
          "Enterprise Platform",
          "Private data integration, governance, enterprise APIs and institutional dashboards create the strategic layer.",
        ],
      ],
      atlasLabel: "Atlas Layer",
      atlasTitle:
        "A national failure observatory, not just a map.",
      atlasText:
        "The Atlas turns each bridge collapse into a traceable spatial record: location, cause, severity, trigger mechanism and source evidence remain connected in one analytical surface.",
      atlasEvidence: [
        ["Cause taxonomy", "Hydraulic, impact, material, seismic and construction-related mechanisms."],
        ["Event severity", "Total and partial collapses remain readable at territorial scale."],
        ["Source traceability", "Each bridge card connects the event to its documented evidence base."],
      ],
      methodologyLabel: "Methodology",
      methodologyTitle:
        "Designed for traceability, reproducibility and long-term credibility.",
      methodologyText:
        "Every record is part of a validation logic: event detection, cross-source verification, geolocation, classification and continuous revision.",
      routes: [
        ["Atlas", "/atlas"],
        ["Methodology", "/methodology"],
        ["Analytics", "/analytics"],
        ["Plans", "/plans"],
      ],
      pathLabel: "Choose Your Path",
      pathTitle:
        "Start from the question you need ARCUS to answer.",
      pathText:
        "A first-time user should not have to understand the whole platform before taking the right next step. ARCUS separates public discovery, research analysis, operational screening and institutional integration.",
      clientPaths: [
        {
          action: "Open public evidence",
          label: "I want to explore the observatory",
          path: "/atlas",
          text: "Use the Atlas to inspect events, sources, timeline and taxonomy.",
        },
        {
          action: "Read the analytics",
          label: "I need a data overview",
          path: "/analytics",
          text: "Use Analytics to understand patterns, territories, causes and public indicators.",
        },
        {
          action: "Compare plans",
          label: "I manage assets or territories",
          path: "/plans",
          text: "Compare Open, Professional and Enterprise before entering the operational workspace.",
        },
        {
          action: "Evaluate Enterprise",
          label: "I represent an institution",
          path: "/enterprise",
          text: "Use Enterprise when private datasets, governance and custom dashboards are required.",
        },
      ],
    },
    it: {
      atlasCta: "Apri l'Atlante",
      briefingCta: "Vedi gli analytics",
      heroLabel:
        "Osservatorio scientifico sui cedimenti infrastrutturali",
      heroTitle:
        "Intelligence sui crolli dei ponti, costruita come infrastruttura di ricerca.",
      heroText:
        "ARCUS trasforma eventi verificati, tracciabilita delle fonti ed evidenza geospaziale in un osservatorio per l'analisi dei cedimenti infrastrutturali.",
      metrics: [
        ["Eventi validati", metrics.events],
        ["Fonti documentate", metrics.sources],
        ["Copertura temporale", metrics.years],
        ["Collassi totali", metrics.totalCollapse],
      ],
      evidenceLabel: "Sistema di evidenza",
      evidenceTitle:
        "Da registri frammentati a intelligence infrastrutturale strutturata.",
      evidenceText:
        "La piattaforma collega classificazione degli eventi, contesto territoriale, validazione delle fonti e interpretazione analitica. E pensata per ricercatori, enti e stakeholder professionali che hanno bisogno di piu di una mappa statica.",
      layers: [
        [
          "Osservatorio pubblico",
          "Atlante, metodologia, panoramica dataset e analytics selezionati costruiscono credibilita scientifica e diffusione pubblica.",
        ],
        [
          "Workspace professionale",
          "Analytics avanzati, overlay hazard, workspace salvati, export e output spiegabili costruiscono il layer operativo.",
        ],
        [
          "Piattaforma Enterprise",
          "Dati privati, governance, API enterprise e dashboard istituzionali costruiscono il livello strategico.",
        ],
      ],
      atlasLabel: "Layer Atlas",
      atlasTitle:
        "Un osservatorio nazionale dei cedimenti, non solo una mappa.",
      atlasText:
        "L'Atlante trasforma ogni collasso in un record spaziale tracciabile: localizzazione, causa, gravita, meccanismo di innesco e fonti restano connessi in un'unica superficie analitica.",
      atlasEvidence: [
        ["Tassonomia cause", "Meccanismi idraulici, impatto, materiali, sisma e criticita progettuali/costruttive."],
        ["Gravita evento", "Collassi totali e parziali restano leggibili alla scala territoriale."],
        ["Tracciabilita fonti", "Ogni scheda ponte collega l'evento alla sua base documentale."],
      ],
      methodologyLabel: "Metodologia",
      methodologyTitle:
        "Progettato per tracciabilita, riproducibilita e credibilita nel tempo.",
      methodologyText:
        "Ogni record entra in una logica di validazione: individuazione evento, verifica multi-fonte, geolocalizzazione, classificazione e revisione continua.",
      routes: [
        ["Atlante", "/atlas"],
        ["Metodologia", "/methodology"],
        ["Analytics", "/analytics"],
        ["Piani", "/plans"],
      ],
      pathLabel: "Scegli il percorso",
      pathTitle:
        "Parti dalla domanda a cui ARCUS deve rispondere.",
      pathText:
        "Chi entra per la prima volta non deve capire tutta la piattaforma prima di scegliere. ARCUS separa scoperta pubblica, analisi dati, screening operativo e integrazione istituzionale.",
      clientPaths: [
        {
          action: "Apri evidenze pubbliche",
          label: "Voglio esplorare l'osservatorio",
          path: "/atlas",
          text: "Usa l'Atlante per consultare eventi, fonti, timeline e tassonomia.",
        },
        {
          action: "Leggi gli analytics",
          label: "Mi serve una lettura dei dati",
          path: "/analytics",
          text: "Usa Analytics per capire pattern, territori, cause e indicatori pubblici.",
        },
        {
          action: "Confronta i piani",
          label: "Gestisco asset o territori",
          path: "/plans",
          text: "Confronta Open, Professional ed Enterprise prima di entrare nel workspace operativo.",
        },
        {
          action: "Valuta Enterprise",
          label: "Rappresento un ente",
          path: "/enterprise",
          text: "Usa Enterprise quando servono dati privati, governance e dashboard su misura.",
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
            ? "ARCUS e un osservatorio scientifico sui crolli dei ponti, con atlante geospaziale, metodologia verificabile e analytics infrastrutturali."
            : "ARCUS is a scientific bridge collapse observatory with a geospatial atlas, verifiable methodology and infrastructure analytics."
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

        <div className="home-hero-shade" />

        <div className="home-container home-hero-content">
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
              to="/analytics"
            >
              {text.briefingCta}
            </Link>
          </div>
        </div>

        <div className="home-container home-hero-metrics">
          {text.metrics.map(([label, value]) => (
            <div
              className="home-metric"
              key={label}
            >
              <strong>
                {typeof value === "number"
                  ? formatValue(value)
                  : value}
              </strong>
              <span>{label}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="home-section home-client-path">
        <div className="home-container home-split">
          <div>
            <div className="home-section-label">
              {text.pathLabel}
            </div>

            <h2>{text.pathTitle}</h2>
          </div>

          <p>{text.pathText}</p>
        </div>

        <div className="home-container home-path-grid">
          {text.clientPaths.map((item) => (
            <article
              className="home-path-card"
              key={item.path}
            >
              <span>{item.label}</span>
              <p>{item.text}</p>
              <Link to={item.path}>
                {item.action}
              </Link>
            </article>
          ))}
        </div>
      </section>

      <section className="home-section home-evidence">
        <div className="home-container home-split">
          <div>
            <div className="home-section-label">
              {text.evidenceLabel}
            </div>

            <h2>{text.evidenceTitle}</h2>
          </div>

          <p>{text.evidenceText}</p>
        </div>

        <div className="home-container home-layer-grid">
          {text.layers.map(([title, body]) => (
            <article
              className="home-layer-card"
              key={title}
            >
              <h3>{title}</h3>
              <p>{body}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="home-section home-dark-band">
        <div className="home-container home-atlas-grid">
          <div>
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
          </div>

          <div className="home-atlas-brief">
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
          </div>
        </div>
      </section>

      <section className="home-section home-method">
        <div className="home-container home-split">
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
        </div>
      </section>
    </main>
  );
}
