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
              r="1.25"
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
        "ARCUS is an infrastructure risk intelligence platform for bridge-collapse evidence, territorial hazards, asset prioritisation and risk mitigation workflows.",
      heroLabel: "Infrastructure Risk Intelligence",
      heroTitle:
        "Bridge-collapse evidence for infrastructure risk decisions.",
      heroText:
        "ARCUS connects georeferenced bridge-collapse records, source traceability, territorial hazard context and professional outputs so technical teams can move from evidence to risk assessment, asset prioritisation and mitigation planning.",
      atlasCta: "Open Atlas",
      professionalCta: "Open Professional",
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
      definitionLabel: "Definition",
      definitionTitle:
        "ARCUS turns collapse records into infrastructure risk intelligence.",
      definitionText:
        "The platform is built for technical clients who need evidence that is georeferenced, source-linked and usable in risk assessment, asset management and mitigation workflows.",
      definitionLabels: {
        is: "What ARCUS is",
        isNot: "What ARCUS is not",
      },
      definitionIs: [
        "A verified evidence base of bridge-collapse events in Italy.",
        "A territorial intelligence layer for reading hydraulic, seismic, landslide, degradation and exposure signals.",
        "A decision-support environment for prioritisation, reporting and professional screening.",
      ],
      definitionIsNot: [
        "Not a generic BI dashboard with unstructured indicators.",
        "Not an opaque AI score detached from sources and method.",
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
          title: "Infrastructure manager asset prioritisation",
          text: "Compare an asset inventory with historical events, nearby vulnerabilities and dominant mechanisms to decide what should be reviewed first.",
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
          code: "PRI",
          domain: "Intervention priority",
          role: "Evidence-based attention levels for screening, inspection planning and mitigation.",
        },
      ],
      outputsLabel: "Product Layers",
      outputsTitle:
        "Public evidence first. Professional decision support when the work becomes operational.",
      outputsText:
        "ARCUS is structured so a client can understand the evidence publicly and then move into technical workflows when outputs, exports or asset screening are needed.",
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
          text: "The operational workspace for teams that need prioritisation, reports and exportable evidence.",
          points: [
            "Territorial scenarios and priority reading",
            "Asset screening from uploaded inventories",
            "PDF, CSV and GeoJSON outputs",
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
        "Use collapse evidence to support infrastructure risk decisions.",
      finalText:
        "Explore the public Atlas or move into Professional when you need prioritisation, asset screening and exportable outputs.",
    },
    it: {
      meta:
        "ARCUS e una piattaforma di infrastructure risk intelligence per evidenze sui crolli dei ponti, hazard territoriali, priorita asset e workflow di mitigazione del rischio.",
      heroLabel: "Infrastructure Risk Intelligence",
      heroTitle:
        "Evidenze sui crolli per decisioni di rischio infrastrutturale.",
      heroText:
        "ARCUS connette record georeferenziati di crolli di ponti, tracciabilita delle fonti, contesto hazard territoriale e output professionali per passare dall'evidenza a risk assessment, priorita asset e pianificazione della mitigazione.",
      atlasCta: "Apri l'Atlante",
      professionalCta: "Apri Professional",
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
      definitionLabel: "Definizione",
      definitionTitle:
        "ARCUS trasforma i record di crollo in intelligence per il rischio infrastrutturale.",
      definitionText:
        "La piattaforma e pensata per clienti tecnici che hanno bisogno di evidenze georeferenziate, collegate alle fonti e utilizzabili in risk assessment, asset management e mitigazione.",
      definitionLabels: {
        is: "Cosa e ARCUS",
        isNot: "Cosa non e ARCUS",
      },
      definitionIs: [
        "Una base verificata di eventi di crollo dei ponti in Italia.",
        "Un layer di intelligence territoriale per leggere segnali idraulici, sismici, frane, degrado ed esposizione.",
        "Un ambiente di supporto decisionale per priorita, report e screening professionale.",
      ],
      definitionIsNot: [
        "Non e una dashboard BI generica con indicatori non strutturati.",
        "Non e uno score AI opaco separato da fonti e metodo.",
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
          title: "Prioritizzazione asset per gestori",
          text: "Confrontare un inventario ponti con eventi storici, vulnerabilita vicine e meccanismi dominanti per decidere cosa verificare prima.",
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
          code: "PRI",
          domain: "Priorita di intervento",
          role: "Livelli di attenzione evidence-based per screening, ispezioni e mitigazione.",
        },
      ],
      outputsLabel: "Layer prodotto",
      outputsTitle:
        "Prima l'evidenza pubblica. Poi il supporto decisionale quando il lavoro diventa operativo.",
      outputsText:
        "ARCUS e strutturata per far capire pubblicamente la base di evidenza e poi passare ai workflow tecnici quando servono output, export o screening asset.",
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
          text: "Il workspace operativo per team che hanno bisogno di priorita, report ed evidenza esportabile.",
          points: [
            "Scenari territoriali e lettura prioritaria",
            "Screening asset da inventari caricati",
            "Output PDF, CSV e GeoJSON",
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
        "Usa l'evidenza sui crolli per supportare decisioni di rischio infrastrutturale.",
      finalText:
        "Esplora l'Atlante pubblico o passa a Professional quando servono priorita, screening asset e output esportabili.",
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
                to="/professional"
              >
                {text.professionalCta}
              </Link>
            </div>
          </ScrollReveal>
        </div>

        <div className="home-container home-hero-metrics">
          <Metrics items={text.metrics} />
        </div>
      </section>

      <Footer />
    </main>
  );
}
