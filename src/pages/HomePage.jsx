import {
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import { Link } from "react-router-dom";

import Navbar from "../components/layout/Navbar";
import Footer from "../components/layout/Footer";
import PageMeta from "../components/layout/PageMeta";
import ScrollReveal from "../components/motion/ScrollReveal";

import useLanguage from "../context/useLanguage";

import extractYear from "../utils/extractYear";
import {
  openEvents,
  openSources,
} from "../utils/apiClient";

import "../styles/home/HomePage.css";

function formatValue(value) {
  return new Intl.NumberFormat("en-US").format(
    value
  );
}

function formatEventYear(date) {
  return extractYear(date) || "n.d.";
}

const ITALY_MAP_BOUNDS = {
  maxLat: 47.4,
  maxLon: 18.8,
  minLat: 36.2,
  minLon: 6.1,
};

function projectCoordinate(longitude, latitude) {
  const horizontalPadding = 10;
  const verticalPadding = 6;

  const x =
    horizontalPadding +
    ((longitude - ITALY_MAP_BOUNDS.minLon) /
      (ITALY_MAP_BOUNDS.maxLon - ITALY_MAP_BOUNDS.minLon)) *
      (100 - horizontalPadding * 2);
  const y =
    verticalPadding +
    (1 -
      (latitude - ITALY_MAP_BOUNDS.minLat) /
        (ITALY_MAP_BOUNDS.maxLat - ITALY_MAP_BOUNDS.minLat)) *
      (100 - verticalPadding * 2);

  return {
    x: Math.max(0, Math.min(100, x)),
    y: Math.max(0, Math.min(100, y)),
  };
}

function projectItalyPoint(event) {
  return projectCoordinate(
    event.longitude,
    event.latitude
  );
}

function collectGeometryRings(geometry) {
  const rings = [];

  const visit = (coordinates) => {
    if (!Array.isArray(coordinates)) {
      return;
    }

    if (
      coordinates.length > 2 &&
      coordinates.every(
        (point) =>
          Array.isArray(point) &&
          Number.isFinite(Number(point[0])) &&
          Number.isFinite(Number(point[1]))
      )
    ) {
      rings.push(coordinates);
      return;
    }

    coordinates.forEach(visit);
  };

  visit(geometry?.coordinates);

  return rings;
}

function geometryToSvgPath(geometry) {
  return collectGeometryRings(geometry)
    .map((ring) =>
      ring
        .map((point, index) => {
          const projected = projectCoordinate(
            Number(point[0]),
            Number(point[1])
          );

          return `${index === 0 ? "M" : "L"} ${projected.x.toFixed(
            2
          )} ${projected.y.toFixed(2)}`;
        })
        .join(" ")
    )
    .filter(Boolean)
    .map((path) => `${path} Z`)
    .join(" ");
}

function HeroMapBackdrop({
  events,
  provinceFeatures,
  title,
}) {
  const [activeSlug, setActiveSlug] = useState(null);
  const points = useMemo(
    () =>
      events
        .filter(
          (event) =>
            Number.isFinite(event.latitude) &&
            Number.isFinite(event.longitude)
        )
        .map((event) => ({
          ...event,
          ...projectItalyPoint(event),
        })),
    [events]
  );

  const provincePaths = useMemo(
    () =>
      provinceFeatures
        .map((feature, index) => ({
          id:
            feature?.properties?.cod_uts ||
            feature?.properties?.sigla ||
            `province-${index}`,
          path: geometryToSvgPath(feature?.geometry),
        }))
        .filter((feature) => feature.path),
    [provinceFeatures]
  );

  const highlightedEvents = useMemo(() => {
    const preferredSlugs = [
      "morandi-genoa-2018",
      "annone-ss36-2016",
      "carasco-2013",
      "laino-borgo-2015",
      "aulla-2011-1",
    ];

    const bySlug = new Map(
      points.map((event) => [event.event_slug, event])
    );

    return preferredSlugs
      .map((slug) => bySlug.get(slug))
      .filter(Boolean)
      .slice(0, 5);
  }, [points]);

  const activeEvent =
    highlightedEvents.find(
      (event) => event.event_slug === activeSlug
    ) || highlightedEvents[0];

  const openAtlasEvent = (event) => {
    if (!event?.event_slug) {
      return;
    }

    window.location.assign(
      `/atlas?event=${encodeURIComponent(event.event_slug)}`
    );
  };

  return (
    <div
      aria-label="Interactive preview of ARCUS Atlas bridge-collapse records"
      className="home-hero-map"
    >
      <svg
        aria-label={title}
        role="img"
        viewBox="0 0 100 100"
      >
        <g className="home-hero-map-grid">
          {[10, 22, 34, 46, 58, 70, 82, 94].map(
            (value) => (
              <line
                key={`v-${value}`}
                x1={value}
                x2={value}
                y1="0"
                y2="100"
              />
            )
          )}
          {[12, 24, 36, 48, 60, 72, 84, 96].map(
            (value) => (
              <line
                key={`h-${value}`}
                x1="0"
                x2="100"
                y1={value}
                y2={value}
              />
            )
          )}
        </g>

        <g className="home-hero-map-boundaries">
          {provincePaths.map((feature) => (
            <path
              d={feature.path}
              key={feature.id}
            />
          ))}
        </g>

        <g className="home-hero-map-points">
          {points.map((event) => (
            <circle
              className={
                event.collapse_severity === "TC"
                  ? "is-total"
                  : "is-partial"
              }
              cx={event.x}
              cy={event.y}
              key={event.event_id}
              r={
                event.collapse_severity === "TC"
                  ? 0.52
                  : 0.32
              }
            />
          ))}
        </g>

        <g className="home-hero-map-hotspots">
          {highlightedEvents.map((event) => (
            <circle
              aria-label={`${event.bridge_name || event.bridge_crossing_name || event.municipality}, ${formatEventYear(event.date)}`}
              className={
                event.event_slug === activeEvent?.event_slug
                  ? "is-active"
                  : ""
              }
              cx={event.x}
              cy={event.y}
              key={event.event_id}
              onClick={() => openAtlasEvent(event)}
              onFocus={() => setActiveSlug(event.event_slug)}
              onKeyDown={(keyboardEvent) => {
                if (
                  keyboardEvent.key === "Enter" ||
                  keyboardEvent.key === " "
                ) {
                  keyboardEvent.preventDefault();
                  openAtlasEvent(event);
                }
              }}
              onMouseEnter={() =>
                setActiveSlug(event.event_slug)
              }
              r="0.72"
              role="link"
              tabIndex="0"
            />
          ))}
        </g>
      </svg>

      <div className="home-hero-map-label">
        <span>Atlas evidence layer</span>
        <strong>
          {activeEvent
            ? activeEvent.bridge_name ||
              activeEvent.bridge_crossing_name ||
              activeEvent.municipality
            : formatValue(points.length)}
        </strong>
        <p>
          {activeEvent
            ? `${activeEvent.municipality}, ${formatEventYear(
                activeEvent.date
              )} · ${activeEvent.specific_cause}`
            : "verified georeferenced records"}
        </p>
      </div>
    </div>
  );
}

function AnimatedNumber({ value }) {
  const [displayValue, setDisplayValue] = useState(0);
  const elementRef = useRef(null);

  useEffect(() => {
    if (typeof value !== "number") {
      return undefined;
    }

    const element = elementRef.current;

    if (!element) {
      return undefined;
    }

    const reduceMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;

    let animationFrame = 0;
    let startTime = 0;
    let startTimeout = 0;
    const duration = 1500;

    const animate = (timestamp) => {
      if (!startTime) {
        startTime = timestamp;
      }

      const progress = Math.min(
        (timestamp - startTime) / duration,
        1
      );
      const eased = 1 - (1 - progress) ** 3;

      setDisplayValue(Math.round(value * eased));

      if (progress < 1) {
        animationFrame = window.requestAnimationFrame(animate);
      }
    };

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) {
          return;
        }

        if (reduceMotion) {
          setDisplayValue(value);
          observer.disconnect();
          return;
        }

        const introSafeDelay = Math.max(
          120,
          4800 - performance.now()
        );

        startTimeout = window.setTimeout(() => {
          setDisplayValue(0);
          animationFrame =
            window.requestAnimationFrame(animate);
        }, introSafeDelay);

        observer.disconnect();
      },
      {
        rootMargin: "0px",
        threshold: 0.12,
      }
    );

    observer.observe(element);

    return () => {
      observer.disconnect();
      window.clearTimeout(startTimeout);
      window.cancelAnimationFrame(animationFrame);
    };
  }, [value]);

  return (
    <span ref={elementRef}>
      {formatValue(displayValue)}
    </span>
  );
}

function Metrics({ items }) {
  return (
    <div className="home-metrics">
      {items.map(([label, value], index) => (
        <ScrollReveal
          as="article"
          className="home-metric"
          delay={index * 60}
          key={label}
          variant="soft"
        >
          <strong>
            {typeof value === "number"
              ? <AnimatedNumber value={value} />
              : value}
          </strong>
          <span>{label}</span>
        </ScrollReveal>
      ))}
    </div>
  );
}

export default function HomePage() {
  const { language } = useLanguage();
  const [events, setEvents] = useState([]);
  const [provinceFeatures, setProvinceFeatures] =
    useState([]);
  const [sources, setSources] = useState([]);

  useEffect(() => {
    openEvents()
      .then(setEvents);

    openSources()
      .then(setSources);

    fetch("/data/geo/italy-provinces.geojson")
      .then((response) => response.json())
      .then((geoJson) =>
        setProvinceFeatures(geoJson?.features || [])
      );
  }, []);

  const metrics = useMemo(() => {
    const years = events
      .map((event) => extractYear(event.date))
      .filter(Boolean);

    const totalCollapse = events.filter(
      (event) => event.collapse_severity === "TC"
    ).length;

    return {
      events: events.length,
      sources: sources.length,
      totalCollapse,
      years:
        years.length > 0
          ? `${Math.min(...years)}-${Math.max(...years)}`
          : "-",
    };
  }, [events, sources]);

  const copy = {
    en: {
      meta:
        "ARCUS is an open, versioned and source-linked research infrastructure for documented bridge collapses in Italy.",
      heroLabel: "Italian Bridge Collapse Database",
      heroTitle:
        "Bridge-collapse evidence, open to research.",
      heroText:
        "Explore georeferenced events, documentary sources and explicit classifications through a public Atlas and a complete, citable research release.",
      atlasCta: "Open Atlas",
      dataCta: "Access the data",
      mapLabel: "Georeferenced evidence",
      mapTitle: "Italian bridge-collapse records, rendered from ARCUS data.",
      mapStatus: "Live dataset",
      mapCalloutLabel: "Verified events",
      mapCalloutText:
        "Each point is positioned from latitude and longitude stored in the ARCUS event record.",
      mapStats: [
        ["Events", metrics.events],
        ["Total collapses", metrics.totalCollapse],
        ["Sources", metrics.sources],
      ],
      mapNote:
        "The map is a homepage projection of the ARCUS evidence base, not a decorative illustration.",
      heroProof:
        `${formatValue(metrics.events)} verified events · source-linked records · Italian territorial layer`,
      metrics: [
        ["Verified events", metrics.events],
        ["Documented sources", metrics.sources],
        ["Observed period", metrics.years],
        ["Total collapses", metrics.totalCollapse],
      ],
      accessLabel: "Open research access",
      accessTitle: "Evidence, data and method.",
      accessText:
        "Three public entry points to explore, reuse and verify the ARCUS evidence base.",
      accessCards: [
        {
          code: "01",
          title: "Explore the Atlas",
          text: "Navigate georeferenced collapse events and inspect the evidence attached to each record.",
          action: "Open Atlas",
          path: "/atlas",
        },
        {
          code: "02",
          title: "Access research data",
          text: "Download the versioned public release, data dictionary and citation information.",
          action: "Access data",
          path: "/data-access",
        },
        {
          code: "03",
          title: "Review the method",
          text: "Read the taxonomy, evidence classes, quality controls and declared limitations.",
          action: "Read methodology",
          path: "/methodology",
        },
      ],
      boundaryLabel: "Scientific boundary",
      boundaryTitle: "Documented evidence, not a prediction.",
      boundaryText:
        "ARCUS describes historical bridge-collapse records and their documentary basis. It does not estimate the probability of collapse, certify safety or replace inspections and structural diagnosis.",
      boundaryAction: "Method and limitations",
      definitionLabel: "Definition",
      definitionTitle:
        "A research infrastructure built for verification.",
      definitionText:
        "ARCUS makes documented bridge-collapse evidence explorable, downloadable and auditable while keeping observations separate from interpretation.",
      definitionLabels: {
        is: "What ARCUS is",
        isNot: "What ARCUS is not",
      },
      definitionIs: [
        "A verified, georeferenced evidence base of bridge-collapse events in Italy.",
        "A versioned release with sources, taxonomy, data dictionary and quality audit.",
        "A public foundation for reproducible research and learning from failures.",
      ],
      definitionIsNot: [
        "Not an estimate of collapse probability or territorial risk.",
        "Not an asset ranking or an opaque synthetic score.",
        "Not a substitute for inspections, structural diagnosis or safety certification.",
      ],
      scenariosLabel: "Concrete Use Cases",
      scenariosTitle:
        "Practical scenarios for institutions, managers and technical teams.",
      scenariosText:
        "ARCUS is useful when a team must move from scattered evidence to a defensible operational reading.",
      scenarios: [
        {
          label: "01",
          title: "Public authority territorial screening",
          text: "Identify provinces, corridors or municipalities where collapse evidence and territorial hazards justify deeper checks or mitigation planning.",
        },
        {
          label: "02",
          title: "Comparable-failure investigation",
          text: "Start from a project point, retrieve nationally comparable collapses and inspect why each case entered the evidence cohort.",
        },
        {
          label: "03",
          title: "Engineering firm preliminary assessment",
          text: "Use source-linked precedents and hazard context to prepare technical notes, client reports and early-stage risk narratives.",
        },
        {
          label: "04",
          title: "Research and policy analysis",
          text: "Explore classified failure patterns across time, territory, causes and source reliability without losing the underlying evidence trail.",
        },
      ],
      domainsLabel: "Risk Domains",
      domainsTitle:
        "The risk model is explicit, not decorative.",
      domainsText:
        "ARCUS presents the signals separately so a client can understand the technical basis of each reading.",
      domains: [
        {
          code: "HYD",
          domain: "Hydraulic vulnerability",
          role: "Flooding, river dynamics, scour and hydraulic triggers linked to documented collapses.",
        },
        {
          code: "SEI",
          domain: "Seismic exposure",
          role: "Territorial seismic context used as a layer for vulnerability interpretation.",
        },
        {
          code: "LND",
          domain: "Landslide susceptibility",
          role: "Slope instability and geomorphological conditions around infrastructure corridors.",
        },
        {
          code: "DEG",
          domain: "Degradation and failure mechanisms",
          role: "Materials, age, deterioration patterns and classified causes of failure.",
        },
        {
          code: "EXP",
          domain: "Territorial exposure",
          role: "Collapse density, recurrence, affected corridors and local criticality.",
        },
        {
          code: "LES",
          domain: "Lessons from failures",
          role: "Source-linked investigation priorities, risk-control themes and explicit abstention when support is insufficient.",
        },
      ],
      outputsLabel: "Product Layers",
      outputsTitle:
        "Public evidence first. Professional decision support when the work becomes operational.",
      outputsText:
        "ARCUS lets a client inspect the evidence publicly and then move into a single Professional workflow for comparable failures, lessons and traceable exports.",
      outputs: [
        {
          label: "Open Layer",
          title: "ARCUS Atlas",
          text: "The public evidence layer for exploring verified collapse events and the method behind the database.",
          points: [
            "Georeferenced collapse events",
            "Cause, severity and time filters",
            "Source traceability per record",
          ],
          action: "Explore Atlas",
          path: "/atlas",
        },
        {
          label: "Professional Layer",
          title: "ARCUS Professional",
          text: "Collapse Intelligence — Lessons from Failures: the operational workspace for traceable learning from documented collapses.",
          points: [
            "Official ISPRA and INGV point exposure",
            "National analogue retrieval with evidence limits",
            "Supported investigation priorities or abstention",
          ],
          action: "Open Professional",
          path: "/professional",
        },
      ],
      methodLabel: "Scientific Reliability",
      methodTitle:
        "Traceable method, declared limits, defensible outputs.",
      methodText:
        "ARCUS supports screening and decision preparation. It does not replace inspections, structural diagnosis or safety certification. This limit is part of the product's credibility.",
      methodAction: "Read Methodology",
      methodRows: [
        {
          label: "Validation",
          title: "Cross-source verification",
          text: "Events are checked against documentary sources and classified through a consistent taxonomy.",
        },
        {
          label: "Reproducibility",
          title: "Explicit classification logic",
          text: "Location, cause, severity and reliability signals remain readable and reviewable.",
        },
        {
          label: "Use limit",
          title: "Screening, not certification",
          text: "ARCUS helps decide where to focus attention before inspections and engineering diagnosis.",
        },
      ],
      finalTitle:
        "Start from the evidence, inspect the sources, reproduce the analysis.",
      finalText:
        "Explore the Atlas or download the current ARCUS Open Research release with its citation, schema and declared limitations.",
    },
    it: {
      meta:
        "ARCUS è un'infrastruttura di ricerca aperta, versionata e collegata alle fonti sui crolli documentati dei ponti in Italia.",
      heroLabel: "Italian Bridge Collapse Database",
      heroTitle:
        "Evidenze sui crolli dei ponti, aperte alla ricerca.",
      heroText:
        "Esplora eventi georeferenziati, fonti documentali e classificazioni esplicite attraverso un Atlante pubblico e una release di ricerca completa e citabile.",
      atlasCta: "Apri l'Atlante",
      dataCta: "Accedi ai dati",
      mapLabel: "Evidenza georeferenziata",
      mapTitle: "Crolli dei ponti in Italia, renderizzati dai dati ARCUS.",
      mapStatus: "Dataset attivo",
      mapCalloutLabel: "Eventi verificati",
      mapCalloutText:
        "Ogni punto e posizionato da latitudine e longitudine presenti nel record ARCUS.",
      mapStats: [
        ["Eventi", metrics.events],
        ["Collassi totali", metrics.totalCollapse],
        ["Fonti", metrics.sources],
      ],
      mapNote:
        "La mappa e una proiezione homepage della base di evidenza ARCUS, non un'illustrazione decorativa.",
      heroProof:
        `${formatValue(metrics.events)} eventi verificati · record collegati alle fonti · layer territoriale Italia`,
      metrics: [
        ["Eventi verificati", metrics.events],
        ["Fonti documentate", metrics.sources],
        ["Periodo osservato", metrics.years],
        ["Collassi totali", metrics.totalCollapse],
      ],
      accessLabel: "Accesso Open Research",
      accessTitle: "Evidenze, dati e metodo.",
      accessText:
        "Tre ingressi pubblici per esplorare, riutilizzare e verificare la base di evidenza ARCUS.",
      accessCards: [
        {
          code: "01",
          title: "Esplora l'Atlante",
          text: "Naviga gli eventi di crollo georeferenziati e consulta le evidenze associate a ogni record.",
          action: "Apri l'Atlante",
          path: "/atlas",
        },
        {
          code: "02",
          title: "Accedi ai dati di ricerca",
          text: "Scarica la release pubblica versionata, il dizionario dati e le informazioni di citazione.",
          action: "Accedi ai dati",
          path: "/data-access",
        },
        {
          code: "03",
          title: "Verifica il metodo",
          text: "Consulta tassonomia, classi di evidenza, controlli di qualità e limitazioni dichiarate.",
          action: "Leggi la metodologia",
          path: "/methodology",
        },
      ],
      boundaryLabel: "Confine scientifico",
      boundaryTitle: "Evidenza documentata, non previsione.",
      boundaryText:
        "ARCUS descrive eventi storici di crollo e la relativa base documentale. Non stima la probabilità di collasso, non certifica la sicurezza e non sostituisce ispezioni o diagnosi strutturali.",
      boundaryAction: "Metodo e limitazioni",
      definitionLabel: "Definizione",
      definitionTitle:
        "Un'infrastruttura di ricerca costruita per essere verificata.",
      definitionText:
        "ARCUS rende esplorabili, scaricabili e verificabili le evidenze documentate sui crolli, mantenendo separate osservazione e interpretazione.",
      definitionLabels: {
        is: "Cosa e ARCUS",
        isNot: "Cosa non e ARCUS",
      },
      definitionIs: [
        "Una base verificata di eventi di crollo dei ponti in Italia.",
        "Una release versionata con fonti, tassonomia, dizionario dati e audit di qualità.",
        "Una base pubblica per ricerca riproducibile e apprendimento dai collassi.",
      ],
      definitionIsNot: [
        "Non stima la probabilità di collasso o il rischio territoriale.",
        "Non classifica patrimoni e non produce score sintetici opachi.",
        "Non sostituisce ispezioni, diagnosi strutturali o certificazioni di sicurezza.",
      ],
      scenariosLabel: "Casi d'uso concreti",
      scenariosTitle:
        "Scenari pratici per enti, gestori e team tecnici.",
      scenariosText:
        "ARCUS serve quando un team deve passare da evidenze disperse a una lettura operativa difendibile.",
      scenarios: [
        {
          label: "01",
          title: "Screening territoriale per enti pubblici",
          text: "Individuare province, corridoi o comuni in cui evidenza di crollo e hazard territoriali giustificano controlli o mitigazione.",
        },
        {
          label: "02",
          title: "Indagine sui collassi comparabili",
          text: "Partire da un punto progetto, recuperare collassi comparabili su scala nazionale e verificare perche ogni caso entra nella coorte evidenziale.",
        },
        {
          label: "03",
          title: "Assessment preliminare per societa di ingegneria",
          text: "Usare precedenti collegati alle fonti e contesto hazard per preparare note tecniche, report cliente e narrative di rischio iniziali.",
        },
        {
          label: "04",
          title: "Analisi ricerca e policy",
          text: "Esplorare pattern di cedimento per tempo, territorio, cause e affidabilita delle fonti senza perdere la traccia documentale.",
        },
      ],
      domainsLabel: "Domini di rischio",
      domainsTitle:
        "Il modello di rischio e esplicito, non decorativo.",
      domainsText:
        "ARCUS presenta i segnali separatamente, cosi il cliente capisce la base tecnica di ogni lettura.",
      domains: [
        {
          code: "HYD",
          domain: "Vulnerabilita idraulica",
          role: "Alluvioni, dinamiche fluviali, scalzamento e trigger idraulici collegati a crolli documentati.",
        },
        {
          code: "SEI",
          domain: "Esposizione sismica",
          role: "Contesto sismico territoriale usato come layer di interpretazione della vulnerabilita.",
        },
        {
          code: "LND",
          domain: "Suscettibilita da frana",
          role: "Instabilita dei versanti e condizioni geomorfologiche intorno ai corridoi infrastrutturali.",
        },
        {
          code: "DEG",
          domain: "Degrado e meccanismi di cedimento",
          role: "Materiali, eta, deterioramento e cause classificate di collasso.",
        },
        {
          code: "EXP",
          domain: "Esposizione territoriale",
          role: "Densita dei crolli, ricorrenza, corridoi interessati e criticita locale.",
        },
        {
          code: "LES",
          domain: "Lessons from failures",
          role: "Priorita d'indagine collegate alle fonti, temi di controllo e astensione esplicita quando il supporto e insufficiente.",
        },
      ],
      outputsLabel: "Layer prodotto",
      outputsTitle:
        "Prima l'evidenza pubblica. Poi il supporto decisionale quando il lavoro diventa operativo.",
      outputsText:
        "ARCUS permette di comprendere pubblicamente la base di evidenza e poi passare a un unico workflow Professional per collassi comparabili, lezioni ed export tracciabili.",
      outputs: [
        {
          label: "Open Layer",
          title: "ARCUS Atlas",
          text: "Il layer pubblico per esplorare eventi di crollo verificati e il metodo dietro al database.",
          points: [
            "Eventi georeferenziati di crollo",
            "Filtri per causa, gravita e periodo",
            "Tracciabilita fonti per record",
          ],
          action: "Apri l'Atlante",
          path: "/atlas",
        },
        {
          label: "Professional Layer",
          title: "ARCUS Professional",
          text: "Collapse Intelligence — Lessons from Failures: il workspace operativo per imparare in modo tracciabile dai collassi documentati.",
          points: [
            "Esposizione ufficiale ISPRA e INGV al punto",
            "Retrieval nazionale di analoghi con limiti dichiarati",
            "Priorita d'indagine sostenute oppure astensione",
          ],
          action: "Apri Professional",
          path: "/professional",
        },
      ],
      methodLabel: "Affidabilita scientifica",
      methodTitle:
        "Metodo tracciabile, limiti dichiarati, output difendibili.",
      methodText:
        "ARCUS supporta screening e preparazione della decisione. Non sostituisce ispezioni, diagnosi strutturali o certificazioni di sicurezza. Questo limite fa parte della credibilita del prodotto.",
      methodAction: "Leggi la metodologia",
      methodRows: [
        {
          label: "Validazione",
          title: "Verifica multi-fonte",
          text: "Gli eventi sono controllati su fonti documentali e classificati con tassonomia coerente.",
        },
        {
          label: "Riproducibilita",
          title: "Logica di classificazione esplicita",
          text: "Localizzazione, causa, gravita e affidabilita restano leggibili e revisionabili.",
        },
        {
          label: "Limite d'uso",
          title: "Screening, non certificazione",
          text: "ARCUS aiuta a decidere dove concentrare attenzione prima di ispezioni e diagnosi ingegneristiche.",
        },
      ],
      finalTitle:
        "Parti dall'evidenza, verifica le fonti, riproduci l'analisi.",
      finalText:
        "Esplora l'Atlante oppure scarica la release ARCUS Open Research corrente con citazione, schema e limiti dichiarati.",
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
        description={text.meta}
      />

      <Navbar />

      <section className="home-hero">
        <HeroMapBackdrop
          events={events}
          provinceFeatures={provinceFeatures}
          title={text.mapTitle}
        />

        <div className="home-hero-shade" />

        <div className="home-container home-hero-content">
          <ScrollReveal className="home-hero-copy">
            <span className="home-kicker">
              {text.heroLabel}
            </span>
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
                to="/data-access"
              >
                {text.dataCta}
              </Link>
            </div>
          </ScrollReveal>
        </div>

        <div className="home-container home-hero-metrics">
          <Metrics items={text.metrics} />
        </div>
      </section>

      <section className="home-access-section">
        <div className="home-container">
          <ScrollReveal className="home-access-heading">
            <div>
              <span>{text.accessLabel}</span>
              <h2>{text.accessTitle}</h2>
            </div>
            <p>{text.accessText}</p>
          </ScrollReveal>

          <div className="home-access-grid">
            {text.accessCards.map((card, index) => (
              <ScrollReveal
                as="article"
                className="home-access-card"
                delay={index * 70}
                key={card.code}
                variant="soft"
              >
                <span>{card.code}</span>
                <h3>{card.title}</h3>
                <p>{card.text}</p>
                <Link to={card.path}>{card.action} →</Link>
              </ScrollReveal>
            ))}
          </div>

          <ScrollReveal
            as="aside"
            className="home-boundary"
            variant="soft"
          >
            <span>{text.boundaryLabel}</span>
            <h2>{text.boundaryTitle}</h2>
            <p>{text.boundaryText}</p>
            <Link to="/methodology">
              {text.boundaryAction} →
            </Link>
          </ScrollReveal>
        </div>
      </section>

      <Footer />
    </main>
  );
}
