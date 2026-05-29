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

const premiumModules = {
  en: [
    "Advanced comparative analytics",
    "Data export",
    "Temporal filtering",
    "Reports",
    "API access",
    "AI insights",
    "Monitoring",
    "Institutional dashboards",
  ],
  it: [
    "Analytics comparativi avanzati",
    "Export dati",
    "Filtri temporali avanzati",
    "Report",
    "Accesso API",
    "AI insights",
    "Monitoraggio",
    "Dashboard istituzionali",
  ],
};

const accessTiers = {
  en: [
    {
      cta: "Explore Open Atlas",
      features: [
        "Public atlas",
        "Timeline and filters",
        "Popup evidence cards",
        "Heatmaps",
        "Methodology",
        "Basic statistics",
      ],
      label: "ARCUS OPEN",
      nextAction:
        "Open the atlas, filter by territory or period, and inspect the public evidence card.",
      path: "/atlas",
      price: "Open access",
      target:
        "Visibility, scientific authority, SEO reach and public engagement.",
      title: "Public Observatory",
    },
    {
      cta: "Professional roadmap",
      features: [
        "Advanced infrastructure analytics",
        "Temporal and territorial comparisons",
        "CSV / PDF / GeoJSON exports",
        "Vulnerability mapping",
        "Flood and landslide overlays",
        "Professional workspaces",
      ],
      label: "ARCUS PROFESSIONAL",
      nextAction:
        "Define a technical scenario, compare assets with historical evidence and export operational outputs.",
      path: "/professional",
      price: "Professional licence",
      target:
        "Engineering companies, infrastructure managers, consultants, concessionaires, analysts, insurers and research groups.",
      title: "Infrastructure Intelligence Workspace",
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
      nextAction:
        "Connect private datasets and configure a governed institutional dashboard.",
      path: "/enterprise",
      price: "EUR 5k-50k / year",
      target:
        "Ministries, regional governments, civil protection agencies, insurers and major operators.",
      title: "Institutional Infrastructure Intelligence",
    },
  ],
  it: [
    {
      cta: "Esplora Open Atlas",
      features: [
        "Atlante pubblico",
        "Timeline e filtri",
        "Schede evento con fonti",
        "Heatmap",
        "Metodologia",
        "Statistiche base",
      ],
      label: "ARCUS OPEN",
      nextAction:
        "Apri l'Atlante, filtra territorio o periodo e consulta la scheda pubblica con le fonti.",
      path: "/atlas",
      price: "Accesso aperto",
      target:
        "Visibilita, autorevolezza scientifica, diffusione pubblica e posizionamento SEO.",
      title: "Osservatorio Pubblico",
    },
    {
      cta: "Roadmap professional",
      features: [
        "Advanced infrastructure analytics",
        "Comparazioni temporali e territoriali",
        "Export CSV / PDF / GeoJSON",
        "Mappatura vulnerabilita",
        "Overlay alluvioni e frane",
        "Workspace professionali",
      ],
      label: "ARCUS PROFESSIONAL",
      nextAction:
        "Definisci uno scenario tecnico, confronta asset con evidenza storica ed esporta output operativi.",
      path: "/professional",
      price: "Licenza professionale",
      target:
        "Societa di ingegneria, gestori infrastrutturali, consulenti, concessionari, analisti, assicurazioni e gruppi di ricerca.",
      title: "Infrastructure Intelligence Workspace",
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
      nextAction:
        "Collega dataset privati e configura una dashboard istituzionale governata.",
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
            "Tre livelli per scalare da atlante pubblico a piattaforma istituzionale.",
          accessText:
            "ARCUS mantiene un layer Open forte per autorevolezza e diffusione; Professional trasforma il metodo in workflow operativi; Enterprise abilita ambienti istituzionali controllati.",
          premiumTitle:
            "Analytics pubblici, intelligence premium",
          premiumText:
            "Il layer pubblico costruisce reputazione scientifica e diffusione. Il layer privato estende lo stesso archivio verificato verso workflow professionali e sostenibilita economica.",
          matrixTitle:
            "Cosa resta pubblico e cosa diventa prodotto",
          matrixText:
            "La distinzione e intenzionale: il pubblico dimostra il metodo, il premium trasforma il metodo in workflow, export e decision support.",
          capability: "Capacita",
          publicLayer: "Pubblico",
          premiumLayer: "Premium",
          openWorkspace:
            "Apri Professional Workspace",
          firstAction: "Primo passo",
          validatedShare: "degli eventi validati",
          eventDrivenShare: "eventi con innesco",
          preciseShare: "con precisione geospaziale",
          fatalEvents: "eventi con vittime",
          humanImpact: "Impatto umano registrato",
          severityNote:
            "I collassi totali rappresentano la quota principale dell'archivio ARCUS attuale.",
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
            "Three levels to scale from public atlas to institutional platform.",
          accessText:
            "ARCUS preserves a strong Open layer for authority and diffusion; Professional turns the method into operational workflows; Enterprise enables controlled institutional environments.",
          premiumTitle:
            "Public Analytics, Premium Intelligence",
          premiumText:
            "The public layer builds scientific reputation and diffusion. The private layer can extend the same verified archive into professional workflows and economic sustainability.",
          matrixTitle:
            "What remains public and what becomes product",
          matrixText:
            "The distinction is intentional: the public layer proves the method, the premium layer turns it into workflows, exports and decision support.",
          capability: "Capability",
          publicLayer: "Public",
          premiumLayer: "Premium",
          openWorkspace:
            "Open Professional Workspace",
          firstAction: "First action",
          validatedShare: "of validated events",
          eventDrivenShare: "event-driven failures",
          preciseShare: "geospatial precision",
          fatalEvents: "events with fatalities",
          humanImpact: "Recorded human impact",
          severityNote:
            "Total collapse records represent the largest share of the current ARCUS archive.",
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
  const modules =
    premiumModules[language] || premiumModules.en;
  const accessMatrix =
    language === "it"
      ? [
          [
            "Atlante",
            "eventi, fonti, timeline, filtri base",
            "score, overlay hazard, scenari e workspace Professional",
          ],
          [
            "Analytics",
            "statistiche aggregate e letture scientifiche",
            "benchmark, confronti, scenari e workspace avanzati",
          ],
          [
            "Export",
            "consultazione web",
            "CSV, Excel, report HTML e snapshot progetto",
          ],
          [
            "Dati/API",
            "dataset processati e metodologia",
            "manifest, dizionario dati, release e endpoint professionali",
          ],
          [
            "Decision support",
            "contesto generale",
            "asset screening, watchlist, priorita e raccomandazioni",
          ],
        ]
      : [
          [
            "Atlas",
            "events, sources, timeline, base filters",
            "scores, hazard overlays, scenarios and Professional workspaces",
          ],
          [
            "Analytics",
            "aggregate statistics and scientific readings",
            "benchmarks, comparisons, scenarios and advanced workspaces",
          ],
          [
            "Exports",
            "web consultation",
            "CSV, Excel, HTML reports and project snapshots",
          ],
          [
            "Data/API",
            "processed datasets and methodology",
            "manifest, data dictionary, releases and professional endpoints",
          ],
          [
            "Decision support",
            "general context",
            "asset screening, watchlists, priorities and recommendations",
          ],
        ];

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
                )}% ${copy.validatedShare}`,
              },
              {
                value: analytics.partialCollapse,
                label: copy.partialCollapses,
                text: `${percentage(
                  analytics.partialCollapse,
                  analytics.totalEvents
                )}% ${copy.validatedShare}`,
              },
              {
                value: analytics.triggeredEvents,
                label: copy.triggeredEvents,
                text: `${percentage(
                  analytics.triggeredEvents,
                  analytics.totalEvents
                )}% ${copy.eventDrivenShare}`,
              },
              {
                value: analytics.exactLocations,
                label: copy.exactLocations,
                text: `${percentage(
                  analytics.exactLocations,
                  analytics.totalEvents
                )}% ${copy.preciseShare}`,
              },
              {
                value: analytics.victims,
                label: copy.fatalities,
                text: `${analytics.fatalEvents} ${copy.fatalEvents}`,
              },
              {
                value: analytics.injuries,
                label: copy.injuries,
                text: copy.humanImpact,
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
                {copy.severityNote}
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

                <div className="analytics-tier-action">
                  <span>{copy.firstAction}</span>
                  <strong>{tier.nextAction}</strong>
                </div>

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

          <div className="analytics-access-matrix">
            <div className="analytics-access-matrix-head">
              <div>
                <h3>{copy.matrixTitle}</h3>
                <p>{copy.matrixText}</p>
              </div>
            </div>

            <div className="analytics-access-row heading">
              <span>{copy.capability}</span>
              <span>{copy.publicLayer}</span>
              <span>{copy.premiumLayer}</span>
            </div>

            {accessMatrix.map(
              ([capability, publicValue, premiumValue]) => (
                <div
                  className="analytics-access-row"
                  key={capability}
                >
                  <strong>{capability}</strong>
                  <span>{publicValue}</span>
                  <span>{premiumValue}</span>
                </div>
              )
            )}
          </div>

          <div className="analytics-premium-grid">
            {modules.map((module) => (
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
            to="/professional"
          >
            {copy.openWorkspace}
          </Link>
        </div>
      </section>
    </main>
  );
}

export default AnalyticsPage;
