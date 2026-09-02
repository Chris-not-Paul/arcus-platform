import { useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { causeColors } from "../../utils/colors";
import useLanguage from "../../context/useLanguage";
import taxonomyLabel from "../../utils/taxonomyLabels";
import { researchEventId } from "../../utils/eventIdentity";
import EventHydraulicContext from "./EventHydraulicContext";
import EventRainfallContext from "./EventRainfallContext";
import useEventHydraulicContext from "./useEventHydraulicContext";
import useEventRainfallContext from "./useEventRainfallContext";
import "./EventPopup.css";

function eventTitle(event, language) {
  if (event.bridge_name) {
    return event.bridge_name;
  }

  if (event.bridge_crossing_name) {
    return language === "it"
      ? event.bridge_crossing_name
      : `${event.bridge_crossing_name} Bridge`;
  }

  if (event.structural_type) {
    const type = taxonomyLabel(
      "structuralType",
      event.structural_type,
      language
    );

    return language === "it"
      ? type
      : `${type} Bridge`;
  }

  return language === "it"
    ? `Ponte - ${event.municipality}`
    : `${event.municipality} Bridge`;
}

function sourceHost(source) {
  if (source.source_type) {
    return source.source_type;
  }

  try {
    return new URL(source.source_url).hostname
      .replace(/^www\./, "")
      .toUpperCase();
  } catch {
    return "SOURCE";
  }
}

function formatDate(value, language) {
  if (!value) {
    return null;
  }

  const date = new Date(`${value}T00:00:00.000Z`);

  if (Number.isNaN(date.valueOf())) {
    return value;
  }

  return new Intl.DateTimeFormat(
    language === "it" ? "it-IT" : "en-GB",
    {
      day: "2-digit",
      month: "short",
      timeZone: "UTC",
      year: "numeric",
    }
  ).format(date);
}

function localizedValue(group, value, language) {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  if (language !== "it") {
    const englishLabels = {
      boolean: {
        false: "No",
        true: "Yes",
      },
      location: {
        approximate: "Approximate",
        exact: "Exact",
        unspecified: "Unspecified",
      },
      provinceStatus: {
        coordinate_mismatch: "Mismatch to review",
        name_mismatch_coordinates_resolved: "Province resolved from coordinates",
        name_valid_coordinates_unresolved: "Coordinates unresolved",
        validated: "Consistent",
      },
    };

    return englishLabels[group]?.[String(value)] || String(value);
  }

  const translations = {
    boolean: {
      false: "No",
      true: "Sì",
    },
    causeCategory: {
      "Human-induced": "Antropica",
      Natural: "Naturale",
    },
    crossingType: {
      railway: "Ferrovia",
      road: "Strada",
      "urban area": "Area urbana",
      valley: "Valle",
      waterway: "Corso d'acqua",
    },
    component: {
      Abutment: "Spalla",
      "Approach embankment": "Rilevato di accesso",
      "Deck / superstructure": "Impalcato / sovrastruttura",
      "Entire structure": "Intera struttura",
      "Multiple components": "Componenti multipli",
      "Pier / foundation": "Pila / fondazione",
    },
    curation: {
      Flagship: "Approfondita",
      Standard: "Standard",
    },
    evidence: {
      Documented: "Documentata",
      "Needs review": "Da revisionare",
      Probable: "Probabile",
      Unspecified: "Non specificata",
    },
    location: {
      approximate: "Approssimata",
      exact: "Esatta",
      unspecified: "Non specificata",
    },
    process: {
      "Bank erosion / embankment failure": "Erosione spondale / cedimento del rilevato",
      "Debris accumulation / obstruction": "Accumulo di detriti / ostruzione",
      "Debris flow / solid transport": "Colata detritica / trasporto solido",
      "Other documented hydraulic process": "Altro processo idraulico documentato",
      "Overtopping / hydrodynamic action": "Sormonto / azione idrodinamica",
      Scour: "Scalzamento (scour)",
    },
    provinceStatus: {
      coordinate_mismatch: "Disallineamento da verificare",
      name_mismatch_coordinates_resolved: "Provincia risolta dalle coordinate",
      name_valid_coordinates_unresolved: "Coordinate non risolte",
      validated: "Coerente",
    },
    sourceConfidence: {
      High: "Alta",
      Medium: "Media",
    },
    sourceRole: {
      "Official/Technical": "Ufficiale/Tecnica",
      News: "Notizia",
      Scientific: "Scientifica",
      primary: "Primaria",
      secondary: "Secondaria",
    },
    trigger: {
      Flood: "Piena",
      "Rainfall-induced landslide": "Frana indotta da precipitazioni",
    },
  };

  return translations[group]?.[String(value)] || String(value);
}

function EventPopup({
  atlasMode = "open",
  event,
  hazardProfile = null,
  professionalMode = false,
  reliability = null,
  relatedSources = [],
  vulnerability = null,
}) {
  const { language } = useLanguage();
  const [descriptionExpanded, setDescriptionExpanded] =
    useState(false);
  const [dossierExpanded, setDossierExpanded] =
    useState(false);
  const [activeDossierTab, setActiveDossierTab] =
    useState("event");
  const [activeContextTab, setActiveContextTab] =
    useState("rainfall");
  const dossierId = useId();
  const dossierTitleId = useId();
  const dossierToggleRef = useRef(null);
  const dossierTabRefs = useRef([]);
  const it = language === "it";

  const text = {
    built: it ? "Costruito" : "Built",
    causeCategory: it ? "Famiglia della causa" : "Cause family",
    collapse: it ? "Collasso" : "Collapse",
    coordinates: it ? "Coordinate WGS84" : "WGS84 coordinates",
    crossing: it ? "Attraversamento" : "Crossing",
    crossingType: it ? "Tipo di attraversamento" : "Crossing type",
    curationLevel: it ? "Livello di curatela" : "Curation level",
    description: it ? "Descrizione evento" : "Event Description",
    eventDriven: it ? "Evento innescato" : "Event-driven",
    fatalities: it ? "Vittime" : "Fatalities",
    historicalEvidence: it
      ? "Evidenza storica documentata"
      : "Documented historical evidence",
    injuries: it ? "Feriti" : "Injuries",
    infrastructureUse: it ? "Uso infrastrutturale" : "Infrastructure Use",
    trigger: it ? "Trigger storico" : "Historical trigger",
    failureProcess: it ? "Processo osservato" : "Observed process",
    componentInvolved: it ? "Componente coinvolta" : "Component involved",
    evidenceLevel: it ? "Livello di evidenza" : "Evidence level",
    locationQuality: it ? "Qualità localizzazione" : "Location quality",
    material: it ? "Materiale" : "Material",
    na: it ? "N/D" : "N/A",
    noSources: it
      ? "Nessuna fonte collegata a questo evento nel dataset corrente."
      : "No source is linked to this event in the current dataset.",
    partial: it ? "Parziale" : "Partial",
    priorityEvent: it ? "Evento prioritario" : "Priority event",
    professionalLayer:
      atlasMode === "enterprise"
        ? it
          ? "Layer Enterprise"
          : "Enterprise layer"
        : it
          ? "Layer Professional"
          : "Professional layer",
    provinceCheck: it ? "Verifica territoriale" : "Territorial check",
    publicRecord: it ? "Scheda ricerca Open" : "Open research record",
    readMore: it ? "Leggi di più" : "Read more",
    reliability: it ? "Affidabilità" : "Reliability",
    riskReading: it ? "Lettura rischio" : "Risk reading",
    showLess: it ? "Riduci" : "Show less",
    sources: it ? "Fonti" : "Sources",
    sourceConfidence: it ? "Confidenza delle fonti" : "Source confidence",
    documented: it ? "documentate" : "documented",
    closeDossier: it ? "Chiudi approfondimento" : "Close full record",
    openDossier: it ? "Apri scheda completa" : "Open full record",
    structuralType: it ? "Tipologia strutturale" : "Structural Type",
    total: it ? "Totale" : "Total",
    vulnerabilityClass: it ? "Classe vulnerabilità" : "Vulnerability class",
  };

  const isTotalCollapse =
    event.collapse_severity === "TC";

  const material = taxonomyLabel(
    "material",
    event.material_type,
    language
  );
  const cause = taxonomyLabel(
    "cause",
    event.specific_cause,
    language
  );
  const causeCategory = localizedValue(
    "causeCategory",
    event.cause_category,
    language
  );
  const sourceCount = relatedSources.length;
  const recordId = researchEventId(event);
  const hydraulicContext = useEventHydraulicContext(recordId);
  const rainfallContext = useEventRainfallContext(recordId);
  const title = eventTitle(event, language);
  const descriptionText = String(
    event.description || ""
  );
  const descriptionLimit = 230;
  const hasLongDescription =
    descriptionText.length > descriptionLimit;
  const visibleDescription =
    hasLongDescription && !descriptionExpanded
      ? `${descriptionText.slice(0, descriptionLimit).trim()}...`
      : descriptionText;
  const previewDescription =
    descriptionText.length > 125
      ? `${descriptionText.slice(0, 125).trim()}...`
      : descriptionText;

  const profileItems = [
    {
      label: text.structuralType,
      value: taxonomyLabel(
        "structuralType",
        event.structural_type,
        language
      ),
    },
    {
      label: text.material,
      value: material,
    },
    {
      label: text.infrastructureUse,
      value: taxonomyLabel(
        "use",
        event.destination_use,
        language
      ),
    },
    {
      label: text.crossingType,
      value: localizedValue(
        "crossingType",
        event.bridge_crossing_type,
        language
      ),
    },
    {
      label: text.crossing,
      value: event.bridge_crossing_name,
    },
    {
      label: text.built,
      value: event.construction_year,
    },
  ].filter((item) => item.value);
  const outcomeItems = [
    {
      label: text.eventDriven,
      value: localizedValue("boolean", event.triggered, language),
    },
    {
      label: text.trigger,
      value: localizedValue(
        "trigger",
        event.failure_trigger || event.hydraulic_intelligence?.trigger,
        language
      ),
    },
    {
      label: text.failureProcess,
      value: localizedValue(
        "process",
        event.failure_process || event.hydraulic_intelligence?.failure_process,
        language
      ),
    },
    {
      label: text.componentInvolved,
      value: localizedValue(
        "component",
        event.component_involved || event.hydraulic_intelligence?.component_involved,
        language
      ),
    },
    {
      label: text.evidenceLevel,
      value: localizedValue(
        "evidence",
        event.failure_cause_evidence ||
          event.hydraulic_intelligence?.evidence_level,
        language
      ),
    },
  ].filter((item) => item.value);
  const previewOutcomeItems =
    outcomeItems.filter((item) => item.label !== text.eventDriven).slice(0, 3);
  const compactOutcomeItems =
    previewOutcomeItems.length > 0
      ? previewOutcomeItems
      : outcomeItems.slice(0, 1);
  const coordinateText =
    Number.isFinite(Number(event.latitude)) &&
    Number.isFinite(Number(event.longitude))
      ? `${Number(event.latitude).toFixed(5)}, ${Number(event.longitude).toFixed(5)}`
      : null;
  const qualityItems = [
    {
      label: text.locationQuality,
      value: localizedValue(
        "location",
        event.exact_location === true
          ? "exact"
          : event.exact_location === false
            ? "approximate"
            : "unspecified",
        language
      ),
    },
    {
      label: text.provinceCheck,
      value: localizedValue(
        "provinceStatus",
        event.province_validation_status,
        language
      ),
    },
    {
      label: text.sourceConfidence,
      value: localizedValue(
        "sourceConfidence",
        event.source_confidence,
        language
      ),
    },
    {
      label: text.curationLevel,
      value: localizedValue(
        "curation",
        event.curation_level,
        language
      ),
    },
    {
      label: text.coordinates,
      value: coordinateText,
    },
  ].filter((item) => item.value);

  const hazardLabel =
    hazardProfile?.public_dominant_hazard_label
      ? taxonomyLabel(
          "cause",
          hazardProfile.public_dominant_hazard_label,
          language
        )
      : text.na;
  const dossierTabs = [
    {
      id: "event",
      label: it ? "Evento" : "Event",
    },
    ...(rainfallContext || hydraulicContext
      ? [
          {
            id: "context",
            label: it ? "Contesto" : "Context",
          },
        ]
      : []),
    {
      id: "bridge",
      label: it ? "Ponte" : "Bridge",
    },
    {
      count: sourceCount,
      id: "sources",
      label: it ? "Fonti e qualità" : "Sources and quality",
    },
  ];
  const contextTabs = [
    ...(rainfallContext
      ? [{
          id: "rainfall",
          label: it ? "Pioggia" : "Rainfall",
          meta: rainfallContext.source?.dataset || "Reanalysis",
        }]
      : []),
    ...(hydraulicContext
      ? [{
          id: "hydraulic",
          label: it ? "Idraulica" : "Hydraulics",
          meta:
            (hydraulicContext.status === "source_review_required"
              ? (it ? "Da verificare" : "Source review")
              : hydraulicContext.display_badge) ||
            hydraulicContext.sources?.[0]?.provider ||
            "Official",
        }]
      : []),
  ];
  const visibleContextTab = contextTabs.some((tab) => tab.id === activeContextTab)
    ? activeContextTab
    : contextTabs[0]?.id;

  useEffect(() => {
    if (!dossierExpanded) {
      return undefined;
    }

    const previousOverflow = document.body.style.overflow;
    const dossierToggle = dossierToggleRef.current;
    document.body.style.overflow = "hidden";
    dossierTabRefs.current[0]?.focus();

    const closeOnEscape = (event) => {
      if (event.key === "Escape") {
        setDossierExpanded(false);
      }
    };

    document.addEventListener("keydown", closeOnEscape);

    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", closeOnEscape);
      dossierToggle?.focus();
    };
  }, [dossierExpanded]);

  const selectDossierTab = (tabId, tabIndex) => {
    setActiveDossierTab(tabId);
    dossierTabRefs.current[tabIndex]?.focus();
  };

  const handleDossierTabKeyDown = (event, currentIndex) => {
    let nextIndex;

    if (event.key === "ArrowRight") {
      nextIndex = (currentIndex + 1) % dossierTabs.length;
    } else if (event.key === "ArrowLeft") {
      nextIndex = (currentIndex - 1 + dossierTabs.length) % dossierTabs.length;
    } else if (event.key === "Home") {
      nextIndex = 0;
    } else if (event.key === "End") {
      nextIndex = dossierTabs.length - 1;
    } else {
      return;
    }

    event.preventDefault();
    selectDossierTab(dossierTabs[nextIndex].id, nextIndex);
  };

  return (
    <article
      className={`arcus-event-card ${
        professionalMode ? "is-professional" : ""
      }`}
    >
      <header className="arcus-event-layerbar">
        <span>
          {professionalMode
            ? text.professionalLayer
            : text.publicRecord}
        </span>
        <span>Ref. {recordId || text.na}</span>
      </header>

      <section className="arcus-event-header">
        <div className="arcus-event-taxonomy">
          <span
            className="arcus-event-taxonomy-dot"
            style={{
              "--event-cause-color":
                causeColors[event.specific_cause] ||
                "#c65345",
            }}
            aria-hidden="true"
          />
          {cause && <span>{cause}</span>}
          {cause && causeCategory && (
            <span aria-hidden="true">&middot;</span>
          )}
          {causeCategory && <span>{causeCategory}</span>}
        </div>

        <h2>{title}</h2>

        <p className="arcus-event-date">
          {formatDate(event.date, language) || text.na}
        </p>

        <p className="arcus-event-location">
          {event.municipality || text.na}
          {event.province ? `, ${event.province}` : ""}
          {event.region ? ` · ${event.region}` : ""}
        </p>
      </section>

      <section className="arcus-event-stat-grid">
        <div>
          <span>{text.collapse}</span>
          <strong
            className={
              isTotalCollapse
                ? "semantic-critical"
                : "semantic-high"
            }
          >
            {isTotalCollapse ? text.total : text.partial}
          </strong>
        </div>
        <div>
          <span>{text.fatalities}</span>
          <strong>{event.victims ?? 0}</strong>
        </div>
        <div>
          <span>{text.injuries}</span>
          <strong>{event.injuries ?? 0}</strong>
        </div>
      </section>

      {compactOutcomeItems.length > 0 && (
        <section className="arcus-event-outcomes is-preview">
          <div className="arcus-event-section-heading">
            <span>{text.historicalEvidence}</span>
          </div>
          <div className="arcus-event-outcome-grid">
            {compactOutcomeItems.map((item) => (
              <div key={item.label}>
                <span>{item.label}</span>
                <strong>{item.value}</strong>
              </div>
            ))}
          </div>
        </section>
      )}

      {event.description && (
        <section className="arcus-event-description is-preview">
          <span>{text.description}</span>
          <p>{previewDescription}</p>
        </section>
      )}

      <button
        aria-expanded={dossierExpanded}
        className="arcus-event-dossier-toggle"
        ref={dossierToggleRef}
        type="button"
        onClick={() => {
          if (dossierExpanded) {
            setDossierExpanded(false);
            return;
          }

          setActiveDossierTab("event");
          setActiveContextTab(rainfallContext ? "rainfall" : "hydraulic");
          setDossierExpanded(true);
        }}
      >
        <span>
          {dossierExpanded ? text.closeDossier : text.openDossier}
        </span>
        <small>
          {sourceCount} {text.sources.toLowerCase()} · Ref. {recordId || text.na}
        </small>
        <strong aria-hidden="true">
          {dossierExpanded ? "−" : "+"}
        </strong>
      </button>

      {dossierExpanded && createPortal(
        <div className="arcus-event-dossier-layer">
          <button
            aria-label={text.closeDossier}
            className="arcus-event-dossier-backdrop"
            tabIndex="-1"
            type="button"
            onClick={() => setDossierExpanded(false)}
          />
          <aside
            aria-label={`${text.publicRecord}: ${title}`}
            aria-labelledby={dossierTitleId}
            aria-modal="true"
            className="arcus-event-dossier"
            role="dialog"
          >
            <header className="arcus-event-dossier-header">
              <div>
                <span>{text.publicRecord} · {recordId || text.na}</span>
                <h2 id={dossierTitleId}>{title}</h2>
                <p>
                  {formatDate(event.date, language) || text.na} · {event.municipality || text.na}
                  {event.province ? `, ${event.province}` : ""}
                </p>
              </div>
              <button
                aria-label={text.closeDossier}
                type="button"
                onClick={() => setDossierExpanded(false)}
              >
                ×
              </button>
            </header>

            <nav
              aria-label={it ? "Sezioni della scheda" : "Record sections"}
              className="arcus-event-dossier-tabs"
              role="tablist"
            >
              {dossierTabs.map((tab, tabIndex) => (
                <button
                  aria-controls={`${dossierId}-panel-${tab.id}`}
                  aria-selected={activeDossierTab === tab.id}
                  className={activeDossierTab === tab.id ? "is-active" : ""}
                  id={`${dossierId}-tab-${tab.id}`}
                  key={tab.id}
                  ref={(element) => {
                    dossierTabRefs.current[tabIndex] = element;
                  }}
                  role="tab"
                  tabIndex={activeDossierTab === tab.id ? 0 : -1}
                  type="button"
                  onClick={() => selectDossierTab(tab.id, tabIndex)}
                  onKeyDown={(event) => handleDossierTabKeyDown(event, tabIndex)}
                >
                  <span>{tab.label}</span>
                  {Number.isFinite(tab.count) && <small>{tab.count}</small>}
                </button>
              ))}
            </nav>

            <div
              aria-labelledby={`${dossierId}-tab-${activeDossierTab}`}
              className="arcus-event-dossier-content"
              id={`${dossierId}-panel-${activeDossierTab}`}
              role="tabpanel"
            >
              {activeDossierTab === "event" && (
                <div className="arcus-event-tab-panel is-event">
                  {event.description && (
                    <section className="arcus-event-description">
                      <span>{text.description}</span>
                      <p>{visibleDescription}</p>
                      {hasLongDescription && (
                        <button
                          className="arcus-event-description-toggle"
                          type="button"
                          onClick={() =>
                            setDescriptionExpanded((value) => !value)
                          }
                        >
                          {descriptionExpanded ? text.showLess : text.readMore} {"->"}
                        </button>
                      )}
                    </section>
                  )}

                  {outcomeItems.length > 0 && (
                    <section className="arcus-event-outcomes">
                      <div className="arcus-event-section-heading">
                        <span>{text.historicalEvidence}</span>
                      </div>
                      <div className="arcus-event-outcome-grid">
                        {outcomeItems.map((item) => (
                          <div key={item.label}>
                            <span>{item.label}</span>
                            <strong>{item.value}</strong>
                          </div>
                        ))}
                      </div>
                      <p>
                        {it
                          ? "Esito storico osservato: non rappresenta una previsione per altri ponti né una stima di rischio."
                          : "Documented historical outcome: this is neither a prediction for other bridges nor a risk estimate."}
                      </p>
                    </section>
                  )}

                  {professionalMode && (
                    <section className="arcus-event-risk">
                      <span>{text.riskReading}</span>
                      <div className="arcus-event-risk-grid">
                        <div>
                          <small>{text.vulnerabilityClass}</small>
                          <strong className="semantic-critical">
                            {vulnerability?.class || text.na}
                          </strong>
                        </div>
                        <div>
                          <small>{text.reliability}</small>
                          <strong className="steel">
                            {reliability?.grade ? `${reliability.grade} evidence` : text.na}
                          </strong>
                        </div>
                      </div>
                      <div className="arcus-event-priority">
                        <span>{text.priorityEvent} - {recordId || text.na}</span>
                        <strong>
                          {vulnerability?.score ?? text.na}
                          {vulnerability?.score ? <sup>/100</sup> : null}
                        </strong>
                      </div>
                    </section>
                  )}
                </div>
              )}

              {activeDossierTab === "context" && (rainfallContext || hydraulicContext) && (
                <div className="arcus-event-tab-panel is-context">
                  {contextTabs.length > 1 && (
                    <div
                      aria-label={it ? "Tipo di contesto" : "Context type"}
                      className="arcus-event-context-switch"
                      role="group"
                    >
                      {contextTabs.map((tab) => (
                        <button
                          aria-pressed={visibleContextTab === tab.id}
                          className={visibleContextTab === tab.id ? "is-active" : ""}
                          key={tab.id}
                          type="button"
                          onClick={() => setActiveContextTab(tab.id)}
                        >
                          <span>{tab.label}</span>
                          <small>{tab.meta}</small>
                        </button>
                      ))}
                    </div>
                  )}
                  {visibleContextTab === "rainfall" && rainfallContext && (
                    <EventRainfallContext context={rainfallContext} />
                  )}
                  {visibleContextTab === "hydraulic" && hydraulicContext && (
                    <EventHydraulicContext context={hydraulicContext} />
                  )}
                </div>
              )}

              {activeDossierTab === "bridge" && (
                <div className="arcus-event-tab-panel is-bridge">
                  <div className="arcus-event-tab-intro">
                    <span>{it ? "Profilo dell’opera" : "Asset profile"}</span>
                    <h3>{it ? "Il ponte documentato" : "The documented bridge"}</h3>
                    <p>
                      {it
                        ? "Caratteristiche disponibili nel record storico; i campi non documentati non vengono ricostruiti."
                        : "Characteristics available in the historical record; undocumented fields are not reconstructed."}
                    </p>
                  </div>
                  {profileItems.length > 0 && (
                    <section className="arcus-event-profile">
                      {profileItems.map((item) => (
                        <div key={item.label}>
                          <span>{item.label}</span>
                          <strong>{item.value}</strong>
                        </div>
                      ))}
                      {professionalMode && (
                        <div>
                          <span>{it ? "Hazard dominante" : "Dominant hazard"}</span>
                          <strong>{hazardLabel}</strong>
                        </div>
                      )}
                    </section>
                  )}
                </div>
              )}

              {activeDossierTab === "sources" && (
                <div className="arcus-event-tab-panel is-sources">
                  {qualityItems.length > 0 && (
                    <section className="arcus-event-quality">
                      <div className="arcus-event-section-heading">
                        <span>
                          {it
                            ? "Qualità e tracciabilità del record"
                            : "Record quality and traceability"}
                        </span>
                      </div>
                      <div className="arcus-event-quality-grid">
                        {qualityItems.map((item) => (
                          <div key={item.label}>
                            <span>{item.label}</span>
                            <strong>{item.value}</strong>
                          </div>
                        ))}
                      </div>
                    </section>
                  )}

                  <section className="arcus-event-sources">
                    <div className="arcus-event-sources-label">
                      <span>{text.sources}</span>
                      <span aria-hidden="true">&middot;</span>
                      <span>{sourceCount} {text.documented}</span>
                    </div>
                    {sourceCount > 0 ? (
                      <div className="arcus-event-source-list">
                        {relatedSources.map((source) => {
                          const content = (
                            <>
                              <span className="arcus-event-source-title">
                                {source.source_title || source.source_reference || source.source_url}
                              </span>
                              <span className="arcus-event-source-meta">
                                <strong>{sourceHost(source)}</strong>
                                <span aria-hidden="true">&middot;</span>
                                <span>
                                  {localizedValue(
                                    "sourceRole",
                                    source.source_role || "Source",
                                    language
                                  )}
                                </span>
                                {source.publication_date && (
                                  <>
                                    <span aria-hidden="true">&middot;</span>
                                    <span>{formatDate(source.publication_date, language)}</span>
                                  </>
                                )}
                                {source.language && (
                                  <>
                                    <span aria-hidden="true">&middot;</span>
                                    <span>{source.language}</span>
                                  </>
                                )}
                              </span>
                              <span className="arcus-event-source-arrow" aria-hidden="true">
                                {"->"}
                              </span>
                            </>
                          );

                          return source.source_url ? (
                            <a
                              className="arcus-event-source-row"
                              href={source.source_url}
                              key={source.source_id || source.source_url}
                              target="_blank"
                              rel="noreferrer"
                            >
                              {content}
                            </a>
                          ) : (
                            <div
                              className="arcus-event-source-row is-static"
                              key={source.source_id || source.source_title}
                            >
                              {content}
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <p className="arcus-event-no-sources">{text.noSources}</p>
                    )}
                  </section>
                </div>
              )}
            </div>
          </aside>
        </div>,
        document.body
      )}
    </article>
  );
}

export default EventPopup;
