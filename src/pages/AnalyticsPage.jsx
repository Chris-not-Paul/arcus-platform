import {
  useEffect,
  useMemo,
  useState,
} from "react";

import { Link } from "react-router-dom";

import Navbar from "../components/layout/Navbar";
import PageMeta from "../components/layout/PageMeta";

import useLanguage from "../context/useLanguage";

import extractYear from "../utils/extractYear";

import "../styles/analytics/analytics-page.css";

const premiumModules = [
  "Advanced comparative analytics",
  "Data export",
  "Temporal filtering",
  "Reports",
  "API access",
  "AI insights",
  "Monitoring",
  "Institutional dashboards",
];

const accessTiers = {
  en: [
    {
      cta: "Explore public atlas",
      features: [
        "Public atlas",
        "Timeline and filters",
        "Popup evidence cards",
        "Heatmaps",
        "Methodology",
        "Basic statistics",
      ],
      label: "Free / Public",
      path: "/atlas",
      price: "Open access",
      target:
        "Visibility, scientific authority, SEO reach and public engagement.",
      title: "Public Observatory",
    },
    {
      cta: "Open Pro workspace",
      features: [
        "Advanced analytics",
        "CSV exports",
        "API access",
        "AI-generated summaries",
        "Regional dashboards",
        "Comparative analytics",
      ],
      label: "ARCUS PRO",
      path: "/analytics/pro",
      price: "EUR 19-49 / month",
      target:
        "Researchers, journalists, students, consultants and small engineering firms.",
      title: "Research & Professional Access",
    },
    {
      cta: "Professional roadmap",
      features: [
        "Vulnerability mapping",
        "Flood and landslide overlays",
        "Infrastructure aging analytics",
        "Hotspot detection",
        "Advanced GIS layers",
        "Collaborative workspaces",
      ],
      label: "ARCUS PROFESSIONAL",
      path: "/professional",
      price: "EUR 199-599 / month",
      target:
        "Engineering companies, concessionaires, utilities and infrastructure managers.",
      title: "Operational Risk Intelligence",
    },
    {
      cta: "Institutional vision",
      features: [
        "Private dashboards",
        "Predictive maintenance tools",
        "Asset prioritization",
        "Enterprise APIs",
        "Custom integrations",
        "Consulting services",
      ],
      label: "ENTERPRISE / GOVERNMENT",
      path: "/enterprise",
      price: "EUR 5k-50k / year",
      target:
        "Ministries, regional governments, civil protection agencies, insurers and major operators.",
      title: "Institutional Infrastructure Intelligence",
    },
  ],
  it: [
    {
      cta: "Esplora l'Atlante pubblico",
      features: [
        "Atlante pubblico",
        "Timeline e filtri",
        "Schede evento con fonti",
        "Heatmap",
        "Metodologia",
        "Statistiche base",
      ],
      label: "Free / Pubblico",
      path: "/atlas",
      price: "Accesso aperto",
      target:
        "Visibilita, autorevolezza scientifica, diffusione pubblica e posizionamento SEO.",
      title: "Osservatorio Pubblico",
    },
    {
      cta: "Apri workspace Pro",
      features: [
        "Analytics avanzati",
        "Export CSV",
        "Accesso API",
        "Sintesi generate da AI",
        "Dashboard regionali",
        "Comparative analytics",
      ],
      label: "ARCUS PRO",
      path: "/analytics/pro",
      price: "EUR 19-49 / mese",
      target:
        "Ricercatori, giornalisti, studenti, consulenti e piccoli studi di ingegneria.",
      title: "Accesso Ricerca e Professionisti",
    },
    {
      cta: "Roadmap professional",
      features: [
        "Mappatura vulnerabilita",
        "Overlay alluvioni e frane",
        "Analytics eta infrastrutturale",
        "Hotspot detection",
        "Layer GIS avanzati",
        "Workspace collaborativi",
      ],
      label: "ARCUS PROFESSIONAL",
      path: "/professional",
      price: "EUR 199-599 / mese",
      target:
        "Societa di ingegneria, concessionari, utility e gestori infrastrutturali.",
      title: "Risk Intelligence Operativa",
    },
    {
      cta: "Visione istituzionale",
      features: [
        "Dashboard private",
        "Predictive maintenance",
        "Prioritizzazione asset",
        "API enterprise",
        "Integrazioni custom",
        "Servizi di consulenza",
      ],
      label: "Enterprise / Government",
      path: "/enterprise",
      price: "EUR 5k-50k / anno",
      target:
        "Ministeri, regioni, protezione civile, assicurazioni e grandi operatori infrastrutturali.",
      title: "Intelligence Infrastrutturale Istituzionale",
    },
  ],
};

function countBy(items, getter) {
  return Object.entries(
    items.reduce((accumulator, item) => {
      const value =
        typeof getter === "function"
          ? getter(item)
          : item[getter];

      if (!value) {
        return accumulator;
      }

      accumulator[value] =
        (accumulator[value] || 0) + 1;

      return accumulator;
    }, {})
  ).sort((a, b) => b[1] - a[1]);
}

function sumBy(items, getter) {
  return items.reduce(
    (total, item) =>
      total + (Number(getter(item)) || 0),
    0
  );
}

function percentage(value, total) {
  if (!total) {
    return 0;
  }

  return Math.round((value / total) * 100);
}

function formatValue(value) {
  return new Intl.NumberFormat("en-US").format(
    value
  );
}

function AnalyticsBarList({
  items,
  total,
  label,
}) {
  const maxValue =
    Math.max(...items.map((item) => item[1]), 1);

  return (
    <div className="analytics-bar-list">
      {items.map(([name, value]) => (
        <div
          className="analytics-bar-row"
          key={name}
        >
          <div className="analytics-bar-meta">
            <span>{name}</span>
            <strong>
              {formatValue(value)}
              {label ? ` ${label}` : ""}
            </strong>
          </div>

          <div className="analytics-bar-track">
            <div
              className="analytics-bar-fill"
              style={{
                width: `${Math.max(
                  4,
                  (value / maxValue) * 100
                )}%`,
              }}
            />
          </div>

          <div className="analytics-bar-share">
            {percentage(value, total)}%
          </div>
        </div>
      ))}
    </div>
  );
}

function AnalyticsPage() {
  const { language } = useLanguage();

  const copy =
    language === "it"
      ? {
          atlas: "Atlante",
          briefingTitle:
            "Briefing di Intelligence Infrastrutturale",
          publicSubtitle:
            "Analytics pubblici dall'osservatorio ARCUS sui collassi, progettati per leggere dati verificati sui cedimenti infrastrutturali come un sistema di intelligence scientifica.",
          validatedEvents: "eventi validati",
          documentedSources: "fonti documentate",
          temporalCoverage: "copertura temporale",
          snapshot: "QUADRO OSSERVATORIO",
          snapshotTitle:
            "I dati di collasso come evidenza tecnica",
          snapshotText:
            "ARCUS e una piattaforma scientifica di infrastructure intelligence dedicata all'osservazione, classificazione e analisi dei fenomeni di collasso dei ponti. Il layer pubblico espone risultati selezionati dell'archivio curato, preservando gli strumenti avanzati per l'accesso professionale.",
          totalCollapses: "Collassi totali",
          partialCollapses: "Collassi parziali",
          triggeredEvents: "Eventi innescati",
          exactLocations: "Localizzazioni precise",
          fatalities: "Vittime",
          injuries: "Feriti",
          failureTaxonomy: "TASSONOMIA DEI CEDIMENTI",
          mechanismsTitle:
            "Meccanismi di collasso dominanti",
          mechanismsText:
            "Il dataset e fortemente segnato da dinamiche idrauliche e naturali, mentre le cause antropiche restano un segnale piu contenuto ma analiticamente rilevante.",
          specificCause:
            "Distribuzione delle cause specifiche",
          severityStructure:
            "Struttura della gravita",
          spatiotemporal: "LETTURA SPAZIO-TEMPORALE",
          whereWhen:
            "Dove e quando gli eventi si concentrano",
          temporalBlocks: "Blocchi temporali",
          leadingRegions: "Regioni principali",
          infrastructureProfile:
            "PROFILO INFRASTRUTTURALE",
          structuralPatterns:
            "Pattern strutturali e di rete",
          materials: "Materiali",
          structuralTypes: "Tipologie strutturali",
          infrastructureUse: "Uso infrastrutturale",
          sourceTraceability:
            "TRACCIABILITA DELLE FONTI",
          evidenceReliability:
            "Base documentale e affidabilita",
          evidenceText:
            "ARCUS privilegia riproducibilita e tracciabilita attraverso fonti scientifiche, istituzionali, tecniche e giornalistiche verificate.",
          sourceRoles: "Ruolo delle fonti",
          confidenceLevel: "Livello di confidenza",
          openCore: "MODELLO OPEN CORE",
          accessArchitecture:
            "ARCHITETTURA DI ACCESSO",
          accessTitle:
            "Quattro livelli per scalare da osservatorio pubblico a piattaforma istituzionale.",
          accessText:
            "ARCUS mantiene un layer pubblico forte per autorevolezza e diffusione, mentre i livelli Pro, Professional ed Enterprise costruiscono sostenibilita economica e strumenti operativi per stakeholder avanzati.",
          premiumTitle:
            "Analytics pubblici, intelligence premium",
          premiumText:
            "Il layer pubblico costruisce reputazione scientifica e diffusione. Il layer privato estende lo stesso archivio verificato verso workflow professionali e sostenibilita economica.",
          openWorkspace:
            "Apri Advanced Analytics Workspace",
          events: "eventi",
          sources: "fonti",
        }
      : {
          atlas: "Atlas",
          briefingTitle:
            "Infrastructure Intelligence Briefing",
          publicSubtitle:
            "Public analytics from the ARCUS collapse observatory, designed to read verified infrastructure failure records as a scientific intelligence system.",
          validatedEvents: "validated events",
          documentedSources: "documented sources",
          temporalCoverage: "temporal coverage",
          snapshot: "OBSERVATORY SNAPSHOT",
          snapshotTitle:
            "Collapse Data as Technical Evidence",
          snapshotText:
            "ARCUS is a scientific infrastructure intelligence platform dedicated to the observation, classification and analysis of bridge collapse phenomena. The public analytics layer exposes selected results from the curated archive while preserving advanced tools for professional access.",
          totalCollapses: "Total collapses",
          partialCollapses: "Partial collapses",
          triggeredEvents: "Triggered events",
          exactLocations: "Exact locations",
          fatalities: "Fatalities",
          injuries: "Injuries",
          failureTaxonomy: "FAILURE TAXONOMY",
          mechanismsTitle:
            "Dominant Collapse Mechanisms",
          mechanismsText:
            "The dataset is strongly shaped by hydraulic and natural-event dynamics, while human-induced causes remain a smaller but analytically important signal.",
          specificCause:
            "Specific Cause Distribution",
          severityStructure: "Severity Structure",
          spatiotemporal: "SPATIOTEMPORAL VIEW",
          whereWhen:
            "Where and When Events Concentrate",
          temporalBlocks: "Temporal Blocks",
          leadingRegions: "Leading Regions",
          infrastructureProfile:
            "INFRASTRUCTURE PROFILE",
          structuralPatterns:
            "Structural and Network Patterns",
          materials: "Materials",
          structuralTypes: "Structural Types",
          infrastructureUse: "Infrastructure Use",
          sourceTraceability:
            "SOURCE TRACEABILITY",
          evidenceReliability:
            "Evidence Base and Reliability",
          evidenceText:
            "ARCUS prioritizes reproducibility and source traceability through scientific, institutional, technical and verified journalistic records.",
          sourceRoles: "Source Roles",
          confidenceLevel: "Confidence Level",
          openCore: "OPEN CORE MODEL",
          accessArchitecture:
            "ACCESS ARCHITECTURE",
          accessTitle:
            "Four levels to scale from public observatory to institutional platform.",
          accessText:
            "ARCUS preserves a strong public layer for authority and diffusion, while Pro, Professional and Enterprise tiers create economic sustainability and operational tools for advanced stakeholders.",
          premiumTitle:
            "Public Analytics, Premium Intelligence",
          premiumText:
            "The public layer builds scientific reputation and diffusion. The private layer can extend the same verified archive into professional workflows and economic sustainability.",
          openWorkspace:
            "Open Advanced Analytics Workspace",
          events: "events",
          sources: "sources",
        };

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

  const analytics = useMemo(() => {
    const years = events
      .map((event) => extractYear(event.date))
      .filter(Boolean);

    const minYear =
      years.length > 0 ? Math.min(...years) : null;

    const maxYear =
      years.length > 0 ? Math.max(...years) : null;

    const totalEvents = events.length;
    const totalSources = sources.length;

    const severity = countBy(
      events,
      "collapse_severity"
    );

    const causes = countBy(
      events,
      "specific_cause"
    );

    const regions = countBy(
      events,
      "region"
    ).slice(0, 8);

    const materials = countBy(
      events,
      "material_type"
    ).slice(0, 5);

    const structuralTypes = countBy(
      events,
      "structural_type"
    ).slice(0, 5);

    const destinationUse = countBy(
      events,
      "destination_use"
    );

    const sourceRoles = countBy(
      sources,
      "source_role"
    );

    const confidence = countBy(
      events,
      (event) =>
        String(event.source_confidence || "")
          .toLowerCase()
          .replace(/^./, (letter) =>
            letter.toUpperCase()
          )
    );

    const periods = [
      ["2000-2004", 0],
      ["2005-2009", 0],
      ["2010-2014", 0],
      ["2015-2019", 0],
      ["2020-2024", 0],
      ["2025-2026", 0],
    ];

    const periodMap =
      Object.fromEntries(periods);

    events.forEach((event) => {
      const year = extractYear(event.date);

      if (!year) {
        return;
      }

      if (year < 2005) {
        periodMap["2000-2004"] += 1;
      } else if (year < 2010) {
        periodMap["2005-2009"] += 1;
      } else if (year < 2015) {
        periodMap["2010-2014"] += 1;
      } else if (year < 2020) {
        periodMap["2015-2019"] += 1;
      } else if (year < 2025) {
        periodMap["2020-2024"] += 1;
      } else {
        periodMap["2025-2026"] += 1;
      }
    });

    const triggeredEvents =
      events.filter((event) => event.triggered)
        .length;

    const totalCollapse =
      severity.find(([key]) => key === "TC")?.[1] ||
      0;

    const partialCollapse =
      severity.find(([key]) => key === "PC")?.[1] ||
      0;

    const exactLocations =
      events.filter((event) => event.exact_location)
        .length;

    return {
      causes,
      confidence,
      destinationUse,
      exactLocations,
      fatalEvents: events.filter(
        (event) => Number(event.victims) > 0
      ).length,
      injuries: sumBy(
        events,
        (event) => event.injuries
      ),
      materials,
      maxYear,
      minYear,
      partialCollapse,
      periods: Object.entries(periodMap),
      regions,
      sourceRoles,
      structuralTypes,
      totalCollapse,
      totalEvents,
      totalSources,
      triggeredEvents,
      victims: sumBy(
        events,
        (event) => event.victims
      ),
    };
  }, [events, sources]);

  const hasData = analytics.totalEvents > 0;
  const tiers = accessTiers[language] || accessTiers.en;

  return (
    <main
      className="analytics-page"
      id="main-content"
    >
      <PageMeta
        title="Analytics"
        description={
          language === "it"
            ? "Analytics pubblici ARCUS: indicatori, pattern temporali, tassonomie e sintesi sul dataset verificato dei crolli dei ponti."
            : "ARCUS public analytics: indicators, temporal patterns, taxonomies and summaries from the verified bridge collapse dataset."
        }
      />

      <Navbar />

      <section className="analytics-hero analytics-section">
        <div className="analytics-hero-grid" />
        <div className="analytics-hero-overlay" />

        <div className="analytics-container">
          <div className="analytics-label">
            ARCUS ANALYTICS
          </div>

          <h1 className="analytics-title">
            {copy.briefingTitle}
          </h1>

          <p className="analytics-subtitle">
            {copy.publicSubtitle}
          </p>

          <div className="analytics-hero-stats">
            <div className="analytics-stat">
              <span>
                {formatValue(
                  analytics.totalEvents
                )}
              </span>
              <strong>{copy.validatedEvents}</strong>
            </div>

            <div className="analytics-stat">
              <span>
                {formatValue(
                  analytics.totalSources
                )}
              </span>
              <strong>{copy.documentedSources}</strong>
            </div>

            <div className="analytics-stat">
              <span>
                {hasData
                  ? `${analytics.minYear}-${analytics.maxYear}`
                  : "-"}
              </span>
              <strong>{copy.temporalCoverage}</strong>
            </div>
          </div>
        </div>
      </section>

      <section className="analytics-section analytics-light">
        <div className="analytics-container analytics-split">
          <div>
            <div className="analytics-section-label">
              {copy.snapshot}
            </div>

            <h2 className="analytics-section-title">
              {copy.snapshotTitle}
            </h2>
          </div>

          <div className="analytics-body-text">
            {copy.snapshotText}
          </div>
        </div>

        <div className="analytics-container">
          <div className="analytics-kpi-grid">
            {[
              {
                value: analytics.totalCollapse,
                label: copy.totalCollapses,
                text: `${percentage(
                  analytics.totalCollapse,
                  analytics.totalEvents
                )}% of validated events`,
              },
              {
                value: analytics.partialCollapse,
                label: copy.partialCollapses,
                text: `${percentage(
                  analytics.partialCollapse,
                  analytics.totalEvents
                )}% of validated events`,
              },
              {
                value: analytics.triggeredEvents,
                label: copy.triggeredEvents,
                text: `${percentage(
                  analytics.triggeredEvents,
                  analytics.totalEvents
                )}% event-driven failures`,
              },
              {
                value: analytics.exactLocations,
                label: copy.exactLocations,
                text: `${percentage(
                  analytics.exactLocations,
                  analytics.totalEvents
                )}% geospatial precision`,
              },
              {
                value: analytics.victims,
                label: copy.fatalities,
                text: `${analytics.fatalEvents} events with fatalities`,
              },
              {
                value: analytics.injuries,
                label: copy.injuries,
                text: "Recorded human impact",
              },
            ].map((item) => (
              <div
                className="analytics-kpi-card"
                key={item.label}
              >
                <div className="analytics-kpi-value">
                  {formatValue(item.value)}
                </div>

                <div className="analytics-kpi-label">
                  {item.label}
                </div>

                <p>{item.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="analytics-section analytics-dark">
        <div className="analytics-container">
          <div className="analytics-section-header">
            <div className="analytics-section-label">
              {copy.failureTaxonomy}
            </div>

            <h2 className="analytics-section-title">
              {copy.mechanismsTitle}
            </h2>

            <p className="analytics-section-description">
              {copy.mechanismsText}
            </p>
          </div>

          <div className="analytics-panel-grid">
            <div className="analytics-panel wide">
              <h3>{copy.specificCause}</h3>

              <AnalyticsBarList
                items={analytics.causes}
                total={analytics.totalEvents}
                label={copy.events}
              />
            </div>

            <div className="analytics-panel">
              <h3>{copy.severityStructure}</h3>

              <div className="analytics-ratio">
                <div
                  style={{
                    width: `${percentage(
                      analytics.totalCollapse,
                      analytics.totalEvents
                    )}%`,
                  }}
                >
                  TC
                </div>
                <div
                  style={{
                    width: `${percentage(
                      analytics.partialCollapse,
                      analytics.totalEvents
                    )}%`,
                  }}
                >
                  PC
                </div>
              </div>

              <p>
                Total collapse records represent the
                largest share of the current ARCUS
                archive.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="analytics-section analytics-light">
        <div className="analytics-container">
          <div className="analytics-section-header">
            <div className="analytics-section-label">
              {copy.spatiotemporal}
            </div>

            <h2 className="analytics-section-title">
              {copy.whereWhen}
            </h2>
          </div>

          <div className="analytics-panel-grid">
            <div className="analytics-panel light">
              <h3>{copy.temporalBlocks}</h3>

              <AnalyticsBarList
                items={analytics.periods}
                total={analytics.totalEvents}
                label={copy.events}
              />
            </div>

            <div className="analytics-panel light">
              <h3>{copy.leadingRegions}</h3>

              <AnalyticsBarList
                items={analytics.regions}
                total={analytics.totalEvents}
                label={copy.events}
              />
            </div>
          </div>
        </div>
      </section>

      <section className="analytics-section analytics-dark">
        <div className="analytics-container">
          <div className="analytics-section-header">
            <div className="analytics-section-label">
              {copy.infrastructureProfile}
            </div>

            <h2 className="analytics-section-title">
              {copy.structuralPatterns}
            </h2>
          </div>

          <div className="analytics-panel-grid three">
            <div className="analytics-panel">
              <h3>{copy.materials}</h3>

              <AnalyticsBarList
                items={analytics.materials}
                total={analytics.totalEvents}
              />
            </div>

            <div className="analytics-panel">
              <h3>{copy.structuralTypes}</h3>

              <AnalyticsBarList
                items={analytics.structuralTypes}
                total={analytics.totalEvents}
              />
            </div>

            <div className="analytics-panel">
              <h3>{copy.infrastructureUse}</h3>

              <AnalyticsBarList
                items={analytics.destinationUse}
                total={analytics.totalEvents}
              />
            </div>
          </div>
        </div>
      </section>

      <section className="analytics-section analytics-light">
        <div className="analytics-container">
          <div className="analytics-section-header">
            <div className="analytics-section-label">
              {copy.sourceTraceability}
            </div>

            <h2 className="analytics-section-title">
              {copy.evidenceReliability}
            </h2>

            <p className="analytics-section-description light">
              {copy.evidenceText}
            </p>
          </div>

          <div className="analytics-panel-grid">
            <div className="analytics-panel light">
              <h3>{copy.sourceRoles}</h3>

              <AnalyticsBarList
                items={analytics.sourceRoles}
                total={analytics.totalSources}
                label={copy.sources}
              />
            </div>

            <div className="analytics-panel light">
              <h3>{copy.confidenceLevel}</h3>

              <AnalyticsBarList
                items={analytics.confidence}
                total={analytics.totalEvents}
                label={copy.events}
              />
            </div>
          </div>
        </div>
      </section>

      <section className="analytics-section analytics-dark">
        <div className="analytics-container">
          <div className="analytics-section-header">
            <div className="analytics-section-label">
              {copy.openCore}
            </div>

            <h2 className="analytics-section-title">
              {copy.premiumTitle}
            </h2>

            <p className="analytics-section-description">
              {copy.premiumText}
            </p>
          </div>

          <div className="analytics-tier-grid">
            {tiers.map((tier) => (
              <article
                className="analytics-tier-card"
                key={tier.label}
              >
                <div className="analytics-tier-label">
                  {tier.label}
                </div>

                <h3>{tier.title}</h3>

                <div className="analytics-tier-price">
                  {tier.price}
                </div>

                <p>{tier.target}</p>

                <ul>
                  {tier.features.map((feature) => (
                    <li key={feature}>{feature}</li>
                  ))}
                </ul>

                <Link
                  className="analytics-tier-link"
                  to={tier.path}
                >
                  {tier.cta}
                </Link>
              </article>
            ))}
          </div>

          <div className="analytics-section-header compact">
            <div className="analytics-section-label">
              {copy.accessArchitecture}
            </div>

            <h2 className="analytics-section-title">
              {copy.accessTitle}
            </h2>

            <p className="analytics-section-description">
              {copy.accessText}
            </p>
          </div>

          <div className="analytics-premium-grid">
            {premiumModules.map((module) => (
              <div
                className="analytics-premium-card"
                key={module}
              >
                {module}
              </div>
            ))}
          </div>

          <Link
            className="analytics-pro-link"
            to="/analytics/pro"
          >
            {copy.openWorkspace}
          </Link>
        </div>
      </section>
    </main>
  );
}

export default AnalyticsPage;
