import {
  useEffect,
  useMemo,
  useState,
} from "react";

import { Link } from "react-router-dom";

import Footer from "../components/layout/Footer";
import Navbar from "../components/layout/Navbar";
import PageMeta from "../components/layout/PageMeta";

import useLanguage from "../context/useLanguage";

import extractYear from "../utils/extractYear";
import {
  openEvents,
  openSources,
} from "../utils/apiClient";

import "../styles/analytics/analytics-page.css";

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
            "Contratto Open",
          heroPreviewItems: [
            ["Release completa", "263 eventi e 712 fonti, senza account."],
            ["Tracciabilità", "Manifest, schema, tassonomia e audit di qualità."],
            ["Riproducibilità", "CSV e GeoJSON associati a una versione citabile."],
          ],
          validatedEvents: "eventi validati",
          documentedSources: "fonti documentate",
          temporalCoverage: "copertura temporale",
          snapshot: "QUADRO OSSERVATORIO",
          snapshotTitle:
            "I dati di collasso come evidenza tecnica",
          snapshotText:
            "ARCUS e una piattaforma scientifica dedicata all'osservazione, classificazione e analisi dei fenomeni di collasso dei ponti. Gli analytics descrivono l'intera release Open corrente e restano collegati ai record, alle fonti e ai limiti dichiarati.",
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
            "Il layer pubblico rende leggibili i pattern aggregati. Professional applica lo stesso contratto evidenziale a un punto progetto, all'esposizione ufficiale e ai collassi comparabili.",
          advancedTitle:
            "Gli analytics avanzati richiedono contesto operativo.",
          advancedText:
            "Quando una lettura pubblica deve diventare un package Lessons from Failures specifico per un punto e collegato alle fonti, ARCUS passa al workspace Professional.",
          outputPreviewLabel:
            "OUTPUT SBLOCCABILI",
          outputPreviewTitle:
            "Le domande operative che Analytics pubblico non deve fingere di chiudere.",
          outputPreviewText:
            "Professional collega gli stessi dati verificati a un punto progetto, all'esposizione ufficiale, ai collassi comparabili e alle priorita d'indagine sostenute.",
          outputPreviewItems: [
            {
              question: "Quali collassi documentati sono comparabili?",
              output: "Coorte nazionale di analoghi",
              detail: "Base di retrieval, identificativi evento, copertura e limiti dichiarati.",
            },
            {
              question: "Cosa sostiene l'evidenza disponibile?",
              output: "Lezioni oppure astensione",
              detail: "Priorita d'indagine, evidenza raw/effective ed episodi indipendenti.",
            },
            {
              question: "Cosa posso portare in riunione?",
              output: "Report package",
              detail: "Full PDF, one-page brief, tabelle fonti, CSV eventi, Excel e GeoJSON.",
            },
          ],
          lockedTag:
            "ARCUS Open Research",
          methodCta:
            "Leggi metodologia",
          matrixTitle:
            "Cosa resta pubblico e cosa diventa prodotto",
          matrixText:
            "La distinzione e intenzionale: il pubblico espone l'archivio, mentre Professional applica lo stesso contratto evidenziale a un punto progetto verificato.",
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
            "Open contract",
          heroPreviewItems: [
            ["Complete release", "263 events and 712 sources, without an account."],
            ["Traceability", "Manifest, schema, taxonomy and quality audit."],
            ["Reproducibility", "CSV and GeoJSON tied to a citable version."],
          ],
          validatedEvents: "validated events",
          documentedSources: "documented sources",
          temporalCoverage: "temporal coverage",
          snapshot: "OBSERVATORY SNAPSHOT",
          snapshotTitle:
            "Collapse Data as Technical Evidence",
          snapshotText:
            "ARCUS is a scientific platform dedicated to observing, classifying and analysing bridge-collapse phenomena. These analytics describe the complete current Open release and remain connected to records, sources and declared limitations.",
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
            "When a public reading must become a point-specific, source-aware Lessons from Failures package, ARCUS moves to the Professional workspace.",
          outputPreviewLabel:
            "UNLOCKED OUTPUTS",
          outputPreviewTitle:
            "The operational questions public analytics should not pretend to close.",
          outputPreviewText:
            "Professional takes the same verified evidence and connects a project point to official exposure, comparable failures and supported investigation priorities.",
          outputPreviewItems: [
            {
              question: "Which documented failures are comparable?",
              output: "National analogue cohort",
              detail: "Declared retrieval basis, event identifiers, coverage and evidence limits.",
            },
            {
              question: "What do the failures support?",
              output: "Lessons or abstention",
              detail: "Investigation priorities, raw/effective evidence and independent episodes.",
            },
            {
              question: "What can I bring to a technical meeting?",
              output: "Report package",
              detail: "Full PDF, one-page brief, source tables, event CSV, Excel and GeoJSON.",
            },
          ],
          lockedTag:
            "ARCUS Open Research",
          methodCta:
            "Read methodology",
          matrixTitle:
            "What remains public and what becomes product",
          matrixText:
            "The distinction is intentional: the public layer exposes the archive, while Professional applies the same evidence contract to a verified project point.",
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
              ARCUS OPEN RESEARCH
            </div>

            <h2 className="analytics-section-title">
              {language === "it"
                ? "Frequenze osservate, non probabilità di collasso."
                : "Observed frequencies, not collapse probabilities."}
            </h2>

            <p className="analytics-section-description">
              {language === "it"
                ? "Questi analytics descrivono la copertura documentale della release ARCUS. Ogni valore deve essere letto insieme a tassonomia, qualità delle fonti, completezza e limiti del campione."
                : "These analytics describe the documentary coverage of the ARCUS release. Every value must be read together with the taxonomy, source quality, completeness and sample limitations."}
            </p>
          </div>

          <div className="analytics-pro-briefing">
            <div>
              <span>
                {language === "it" ? "Riproducibilità" : "Reproducibility"}
              </span>
              <h3>
                {language === "it"
                  ? "Scarica la release e verifica il metodo."
                  : "Download the release and inspect the method."}
              </h3>
              <p>
                {language === "it"
                  ? "CSV, GeoJSON, fonti, manifest, dizionario dati, tassonomia e audit sono disponibili senza account."
                  : "CSV, GeoJSON, sources, manifest, data dictionary, taxonomy and audit are available without an account."}
              </p>
            </div>

            <div className="analytics-hero-actions">
              <Link
                className="analytics-pro-briefing-link"
                to="/data-access"
              >
                {language === "it" ? "Apri dati" : "Open data"}
              </Link>
              <Link
                className="analytics-pro-briefing-link"
                to="/methodology"
              >
                {language === "it" ? "Leggi il metodo" : "Read method"}
              </Link>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </main>
  );
}

export default AnalyticsPage;
