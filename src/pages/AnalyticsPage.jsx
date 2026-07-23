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
import {
  openEvents,
  openSources,
} from "../utils/apiClient";

import "../styles/analytics/analytics-page.css";

const premiumModules = {
  en: [
    {
      label: "Professional",
      title: "Provincial normalized collapse ratio",
      text: "Compares documented collapses with an internal bridge-stock denominator to move beyond absolute event counts.",
      output: "Priority ranking",
    },
    {
      label: "Hazard overlays",
      title: "ISPRA / INGV territorial intersection",
      text: "Reads ARCUS events against declared public layers for hydraulic, landslide and seismic exposure.",
      output: "Hazard profile",
    },
    {
      label: "Scenario matrix",
      title: "Hydraulic, landslide, seismic and structural scenarios",
      text: "Recalibrates territory priority when a technical team wants to stress one risk domain.",
      output: "Scenario benchmark",
    },
    {
      label: "Asset analytics",
      title: "Inventory screening and precedent matching",
      text: "Compares uploaded bridge inventories with historical evidence, territorial context and similar cases.",
      output: "Asset watchlist",
    },
    {
      label: "Export package",
      title: "PDF, CSV, Excel, GeoJSON and GIS outputs",
      text: "Turns the analytical reading into reusable material for meetings, audits and technical coordination.",
      output: "Professional report",
    },
    {
      label: "Governance",
      title: "Model cards, release and data dictionary",
      text: "Documents inputs, output meaning, limitations, data readiness and versioned professional resources.",
      output: "Audit trail",
    },
  ],
  it: [
    {
      label: "Professional",
      title: "Rapporto provinciale normalizzato",
      text: "Confronta i crolli documentati con un denominatore interno di stock ponti per superare il semplice conteggio assoluto.",
      output: "Ranking priorita",
    },
    {
      label: "Overlay hazard",
      title: "Intersezione territoriale ISPRA / INGV",
      text: "Legge gli eventi ARCUS rispetto a layer pubblici dichiarati per esposizione idraulica, frane e sismicita.",
      output: "Profilo hazard",
    },
    {
      label: "Matrice scenari",
      title: "Scenari idraulici, frane, sismici e strutturali",
      text: "Ricalibra la priorita territoriale quando un team tecnico vuole stressare un dominio di rischio.",
      output: "Benchmark scenario",
    },
    {
      label: "Asset analytics",
      title: "Screening inventari e precedenti comparabili",
      text: "Confronta inventari ponti caricati con evidenza storica, contesto territoriale e casi simili.",
      output: "Watchlist asset",
    },
    {
      label: "Export package",
      title: "Output PDF, CSV, Excel, GeoJSON e GIS",
      text: "Trasforma la lettura analitica in materiale riutilizzabile per riunioni, audit e coordinamento tecnico.",
      output: "Report Professional",
    },
    {
      label: "Governance",
      title: "Model cards, release e dizionario dati",
      text: "Documenta input, significato degli output, limiti, readiness dati e risorse professionali versionate.",
      output: "Audit trail",
    },
  ],
};

const accessTiers = {
  en: [
    {
      cta: "Explore Open Atlas",
      features: [
        "Public atlas",
        "Aggregate indicators",
        "Failure taxonomy",
        "Temporal blocks",
        "Source traceability",
        "Scientific methodology",
      ],
      label: "ARCUS OPEN",
      nextAction:
        "Open the atlas, filter by territory or period, and inspect the public evidence card.",
      path: "/atlas",
      price: "Open evidence layer",
      target:
        "Scientific authority, public evidence reading and transparent dataset interpretation.",
      title: "Public Observatory",
    },
    {
      cta: "Professional roadmap",
      features: [
        "Normalized provincial ratios",
        "Hazard overlay intersections",
        "Scenario recalibration",
        "Asset inventory screening",
        "PDF / CSV / Excel / GeoJSON exports",
        "Model cards and data releases",
      ],
      label: "ARCUS PROFESSIONAL",
      nextAction:
        "Define a technical scenario, compare assets with historical evidence and export operational outputs.",
      path: "/professional",
      price: "Operational intelligence layer",
      target:
        "Engineering companies, infrastructure managers, concessionaires, public authorities, analysts and research groups.",
      title: "Infrastructure Intelligence Workspace",
    },
  ],
  it: [
    {
      cta: "Esplora Open Atlas",
      features: [
        "Atlante pubblico",
        "Indicatori aggregati",
        "Tassonomia cedimenti",
        "Blocchi temporali",
        "Tracciabilita fonti",
        "Metodologia scientifica",
      ],
      label: "ARCUS OPEN",
      nextAction:
        "Apri l'Atlante, filtra territorio o periodo e consulta la scheda pubblica con le fonti.",
      path: "/atlas",
      price: "Layer evidenza open",
      target:
        "Autorevolezza scientifica, lettura pubblica dell'evidenza e interpretazione trasparente del dataset.",
      title: "Osservatorio Pubblico",
    },
    {
      cta: "Roadmap professional",
      features: [
        "Rapporti provinciali normalizzati",
        "Intersezione overlay hazard",
        "Ricalibrazione scenari",
        "Screening inventari asset",
        "Export PDF / CSV / Excel / GeoJSON",
        "Model cards e data release",
      ],
      label: "ARCUS PROFESSIONAL",
      nextAction:
        "Definisci uno scenario tecnico, confronta asset con evidenza storica ed esporta output operativi.",
      path: "/professional",
      price: "Layer intelligence operativa",
      target:
        "Societa di ingegneria, gestori infrastrutturali, concessionari, enti pubblici, analisti e gruppi di ricerca.",
      title: "Infrastructure Intelligence Workspace",
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
            "Analytics pubblici da evidenze verificate di collasso.",
          publicSubtitle:
            "Questa pagina espone letture aggregate del dataset ARCUS: pattern temporali, cause, distribuzione territoriale, profilo infrastrutturale e tracciabilita delle fonti.",
          heroNote:
            "Layer pubblico: dataset, fonti, tassonomia e pattern aggregati. Le letture operative restano separate per non confondere osservatorio e decision support.",
          heroPreviewTitle:
            "Estensione operativa",
          heroPreviewItems: [
            ["Priority ranking", "Province e aree ordinate per attenzione tecnica."],
            ["Asset watchlist", "Inventari ponti confrontati con precedenti e hazard."],
            ["Export package", "PDF, CSV, Excel, GeoJSON e pacchetto GIS."],
          ],
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
          advancedLabel:
            "ADVANCED ANALYTICS",
          accessArchitecture:
            "ARCHITETTURA DI ACCESSO",
          accessTitle:
            "Due livelli per passare dall'atlante pubblico al workspace operativo.",
          accessText:
            "ARCUS mantiene un layer Open forte per autorevolezza e diffusione; Professional trasforma il metodo in workflow operativi, export e supporto decisionale.",
          premiumTitle:
            "Dagli analytics pubblici all'intelligence Professional",
          premiumText:
            "Il layer pubblico rende leggibili i pattern aggregati. Il layer Professional applica lo stesso metodo a scenari, province, asset, overlay hazard e output esportabili.",
          advancedTitle:
            "Gli analytics avanzati richiedono contesto operativo.",
          advancedText:
            "Quando una lettura deve diventare ranking, report, screening asset o pacchetto GIS, ARCUS passa dal briefing pubblico al workspace Professional.",
          outputPreviewLabel:
            "OUTPUT SBLOCCABILI",
          outputPreviewTitle:
            "Le domande operative che Analytics pubblico non deve fingere di chiudere.",
          outputPreviewText:
            "Professional prende gli stessi dati verificati e li trasforma in risposte esportabili per tavoli tecnici, inventari asset e pianificazione.",
          outputPreviewItems: [
            {
              question: "Quali province meritano priorita?",
              output: "Ranking normalizzato",
              detail: "Classi di attenzione, benchmark nazionale e rapporto provinciale di collasso.",
            },
            {
              question: "Quali asset devo verificare prima?",
              output: "Asset watchlist",
              detail: "Upload inventario, eventi comparabili, hazard dominante e score operativo.",
            },
            {
              question: "Cosa posso portare in riunione?",
              output: "Report package",
              detail: "Full PDF, one-page brief, tabelle fonti, CSV eventi, Excel e GeoJSON.",
            },
          ],
          lockedTag:
            "Layer Professional",
          methodCta:
            "Leggi metodologia",
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
            "Public analytics from verified bridge-collapse evidence.",
          publicSubtitle:
            "This page exposes aggregate readings from the ARCUS dataset: temporal patterns, causes, territorial distribution, infrastructure profile and source traceability.",
          heroNote:
            "Public layer: dataset, sources, taxonomy and aggregate patterns. Operational readings remain separated so the observatory does not blur into decision support.",
          heroPreviewTitle:
            "Operational extension",
          heroPreviewItems: [
            ["Priority ranking", "Provinces and areas ordered by technical attention."],
            ["Asset watchlist", "Bridge inventories compared with precedents and hazards."],
            ["Export package", "PDF, CSV, Excel, GeoJSON and GIS package."],
          ],
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
          advancedLabel:
            "ADVANCED ANALYTICS",
          accessArchitecture:
            "ACCESS ARCHITECTURE",
          accessTitle:
            "Two levels to move from public atlas to operational workspace.",
          accessText:
            "ARCUS preserves a strong Open layer for authority and diffusion; Professional turns the method into operational workflows, exports and decision support.",
          premiumTitle:
            "From public analytics to Professional intelligence",
          premiumText:
            "The public layer makes aggregate patterns readable. The Professional layer applies the same method to scenarios, provinces, assets, hazard overlays and exportable outputs.",
          advancedTitle:
            "Advanced analytics require operational context.",
          advancedText:
            "When a reading must become a ranking, report, asset screening or GIS package, ARCUS moves from public briefing to the Professional workspace.",
          outputPreviewLabel:
            "UNLOCKED OUTPUTS",
          outputPreviewTitle:
            "The operational questions public analytics should not pretend to close.",
          outputPreviewText:
            "Professional takes the same verified evidence and turns it into exportable answers for technical meetings, asset inventories and planning.",
          outputPreviewItems: [
            {
              question: "Which provinces deserve priority?",
              output: "Normalized ranking",
              detail: "Attention classes, national benchmark and provincial collapse ratio.",
            },
            {
              question: "Which assets should be reviewed first?",
              output: "Asset watchlist",
              detail: "Inventory upload, comparable events, dominant hazard and operational score.",
            },
            {
              question: "What can I bring to a technical meeting?",
              output: "Report package",
              detail: "Full PDF, one-page brief, source tables, event CSV, Excel and GeoJSON.",
            },
          ],
          lockedTag:
            "Professional layer",
          methodCta:
            "Read methodology",
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
    openEvents()
      .then(setEvents);

    openSources()
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

    const hydraulicEvents = events.filter(
      (event) => event.specific_cause === "Hydraulic"
    );
    const processes = countBy(
      hydraulicEvents,
      (event) => event.failure_process || "Unspecified"
    );
    const components = countBy(
      hydraulicEvents,
      (event) => event.component_involved || "Unspecified"
    );
    const evidenceLevels = countBy(
      hydraulicEvents,
      (event) => event.failure_cause_evidence || "Unspecified"
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
      components,
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
      processes,
      periods: Object.entries(periodMap),
      regions,
      sourceRoles,
      structuralTypes,
      totalCollapse,
      totalEvents,
      totalSources,
      triggeredEvents,
      evidenceLevels,
      hydraulicSampleSize: hydraulicEvents.length,
      missingProcess: hydraulicEvents.filter((event) => !event.failure_process).length,
      missingComponent: hydraulicEvents.filter((event) => !event.component_involved).length,
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
            "eventi, fonti, timeline e filtri base",
            "mappa Professional, layer hazard, selezioni area e report",
          ],
          [
            "Analytics",
            "statistiche aggregate, tassonomia e pattern scientifici",
            "ranking normalizzati, benchmark, scenari e priority index",
          ],
          [
            "Export",
            "consultazione web",
            "Full PDF, One-Page Brief, CSV, Excel, GeoJSON e GIS package",
          ],
          [
            "Dati/API",
            "dataset processati e metodologia",
            "manifest, dizionario dati, release, model cards ed endpoint professionali",
          ],
          [
            "Decision support",
            "contesto generale",
            "asset screening, watchlist, priorita, raccomandazioni e audit",
          ],
        ]
      : [
          [
            "Atlas",
            "events, sources, timeline and base filters",
            "Professional map, hazard layers, area selections and reports",
          ],
          [
            "Analytics",
            "aggregate statistics, taxonomy and scientific patterns",
            "normalized rankings, benchmarks, scenarios and priority index",
          ],
          [
            "Exports",
            "web consultation",
            "Full PDF, One-Page Brief, CSV, Excel, GeoJSON and GIS package",
          ],
          [
            "Data/API",
            "processed datasets and methodology",
            "manifest, data dictionary, releases, model cards and professional endpoints",
          ],
          [
            "Decision support",
            "general context",
            "asset screening, watchlists, priorities, recommendations and audit",
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
          <div className="analytics-hero-layout">
            <div className="analytics-hero-copy">
          <div className="analytics-label">
            ARCUS ANALYTICS
          </div>

          <h1 className="analytics-title">
            {copy.briefingTitle}
          </h1>

          <p className="analytics-subtitle">
            {copy.publicSubtitle}
          </p>

          <div className="analytics-hero-note">
            {copy.heroNote}
          </div>

          <div className="analytics-hero-actions">
            <Link
              className="analytics-primary-link"
              to="/atlas"
            >
              {copy.atlas}
            </Link>

            <Link
              className="analytics-secondary-link"
              to="/methodology"
            >
              {copy.methodCta}
            </Link>
          </div>

            </div>

            <aside className="analytics-hero-pro-preview">
              <span>{copy.lockedTag}</span>
              <h2>{copy.heroPreviewTitle}</h2>

              <div>
                {copy.heroPreviewItems.map(
                  ([title, detail]) => (
                    <article key={title}>
                      <strong>{title}</strong>
                      <p>{detail}</p>
                    </article>
                  )
                )}
              </div>
            </aside>
          </div>

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

          <div className="analytics-panel-grid three">
            <div className="analytics-panel">
              <h3>{language === "it" ? "Processi osservati" : "Observed processes"}</h3>
              <AnalyticsBarList
                items={analytics.processes}
                total={analytics.hydraulicSampleSize}
                label={copy.events}
              />
              <p>{analytics.missingProcess} {language === "it" ? "record senza processo specifico" : "records without a specific process"}</p>
            </div>
            <div className="analytics-panel">
              <h3>{language === "it" ? "Componenti coinvolte" : "Components involved"}</h3>
              <AnalyticsBarList
                items={analytics.components}
                total={analytics.hydraulicSampleSize}
                label={copy.events}
              />
              <p>{analytics.missingComponent} {language === "it" ? "record senza componente specifica" : "records without a specific component"}</p>
            </div>
            <div className="analytics-panel">
              <h3>{language === "it" ? "Livello di evidenza" : "Evidence level"}</h3>
              <AnalyticsBarList
                items={analytics.evidenceLevels}
                total={analytics.hydraulicSampleSize}
                label={copy.events}
              />
              <p>
                n={analytics.hydraulicSampleSize}. {language === "it"
                  ? "Frequenze osservate nel database, non probabilita di collasso."
                  : "Observed database frequencies, not collapse probabilities."}
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

          <div className="analytics-pro-briefing">
            <div>
              <span>{copy.lockedTag}</span>
              <h3>{copy.advancedTitle}</h3>
              <p>{copy.advancedText}</p>
            </div>

            <Link
              className="analytics-pro-briefing-link"
              to="/professional"
            >
              {copy.openWorkspace}
            </Link>
          </div>

          <div className="analytics-output-preview">
            <div className="analytics-output-preview-head">
              <span>{copy.outputPreviewLabel}</span>
              <h3>{copy.outputPreviewTitle}</h3>
              <p>{copy.outputPreviewText}</p>
            </div>

            <div className="analytics-output-preview-grid">
              {copy.outputPreviewItems.map((item) => (
                <article key={item.question}>
                  <span>{item.output}</span>
                  <h4>{item.question}</h4>
                  <p>{item.detail}</p>
                </article>
              ))}
            </div>
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

          <div className="analytics-section-header compact">
            <div className="analytics-section-label">
              {copy.advancedLabel}
            </div>

            <h2 className="analytics-section-title">
              {copy.advancedTitle}
            </h2>

            <p className="analytics-section-description">
              {copy.advancedText}
            </p>
          </div>

          <div className="analytics-premium-grid">
            {modules.map((module) => (
              <article
                className="analytics-premium-card"
                key={module.title}
              >
                <span>{module.label}</span>
                <h3>{module.title}</h3>
                <p>{module.text}</p>
                <strong>{module.output}</strong>
              </article>
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
