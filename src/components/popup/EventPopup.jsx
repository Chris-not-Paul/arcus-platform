import { useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Link } from "react-router-dom";
import { causeColors } from "../../utils/colors";
import useLanguage from "../../context/useLanguage";
import {
  localizedBridgeDisplayName,
  localizedCrossingName,
  localizedEventDescription,
} from "../../utils/eventDisplayLabels";
import taxonomyLabel from "../../utils/taxonomyLabels";
import {
  buildOpenEventCitation,
  buildOpenEventDossier,
  buildOpenEventResearchSummary,
  classifyOpenSource,
} from "../../utils/openEventDossier";
import { researchEventId } from "../../utils/eventIdentity";
import EventHydraulicContext from "./EventHydraulicContext";
import EventMedia from "./EventMedia";
import EventRainfallContext from "./EventRainfallContext";
import EventTerritorialContext from "./EventTerritorialContext";
import useEventContextResource from "./useEventContextResource";
import EventResourceState from "./EventResourceState";
import "./EventPopup.css";

function DossierSurface({ children, closeLabel, onClose, standalone }) {
  if (standalone) {
    return (
      <main className="arcus-event-dossier-page-shell" id="main-content">
        {children}
      </main>
    );
  }

  return createPortal(
    <div className="arcus-event-dossier-layer">
      <button
        aria-label={closeLabel}
        className="arcus-event-dossier-backdrop"
        tabIndex="-1"
        type="button"
        onClick={onClose}
      />
      {children}
    </div>,
    document.body
  );
}

function eventTitle(event, language) {
  const documentedName = localizedBridgeDisplayName(event, language);

  if (documentedName) {
    return documentedName;
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

function sourceCategory(source) {
  return classifyOpenSource(source);
}

function sourceCategoryPriority(source) {
  return {
    official: 0,
    scientific: 1,
    news: 2,
    other: 3,
  }[sourceCategory(source)];
}

function fieldAvailability(value) {
  if (value === null || value === undefined || String(value).trim() === "") {
    return "undocumented";
  }

  if (
    ["n/a", "na", "not applicable", "non applicabile"].includes(
      String(value).trim().toLowerCase()
    )
  ) {
    return "not-applicable";
  }

  return "available";
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

function evidenceTone(value) {
  const normalized = String(value || "").trim().toLowerCase();

  if (["documented", "high"].includes(normalized)) {
    return "documented";
  }

  if (["probable", "medium"].includes(normalized)) {
    return "probable";
  }

  if (normalized.includes("review")) {
    return "review";
  }

  return "unspecified";
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
        "Approximate / frazione-level": "Approximate · hamlet level",
        "Approximate / locality-level": "Approximate · locality level",
        "Approximate / site-level": "Approximate · site level",
        "Approximate / unresolved": "Approximate · unresolved",
        exact: "Exact",
        "Exact / curated": "Exact · curated",
        "Exact / external reference": "Exact · external reference",
        "Exact / same structure": "Exact · same structure",
        "Grouped / collective location": "Grouped · collective location",
        "High-confidence source match": "High-confidence source match",
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
      "Cable / hanger / pylon": "Cavo / pendino / pilone",
      "Connection / joint": "Connessione / giunto",
      "Deck / superstructure": "Impalcato / sovrastruttura",
      "Entire structure": "Intera struttura",
      "Multiple components": "Componenti multipli",
      "Pier / foundation": "Pila / fondazione",
      "Temporary works": "Opere provvisionali",
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
      "Approximate / frazione-level": "Approssimata · livello frazione",
      "Approximate / locality-level": "Approssimata · livello località",
      "Approximate / site-level": "Approssimata · livello sito",
      "Approximate / unresolved": "Approssimata · sito non risolto",
      exact: "Esatta",
      "Exact / curated": "Esatta · verificata da ARCUS",
      "Exact / external reference": "Esatta · riferimento esterno",
      "Exact / same structure": "Esatta · stessa struttura",
      "Grouped / collective location": "Raggruppata · localizzazione collettiva",
      "High-confidence source match": "Corrispondenza con fonte ad alta confidenza",
      unspecified: "Non specificata",
    },
    process: {
      "Bank erosion / embankment failure": "Erosione spondale / cedimento del rilevato",
      Bending: "Flessione",
      "Debris accumulation / obstruction": "Accumulo di detriti / ostruzione",
      "Debris flow / solid transport": "Colata detritica / trasporto solido",
      "Falsework / temporary works collapse": "Collasso di centine / opere provvisionali",
      Fatigue: "Fatica",
      Fracture: "Frattura",
      "Knocked down by external action": "Abbattimento per azione esterna",
      "Other documented mode": "Altro meccanismo documentato",
      "Other documented hydraulic process": "Altro processo idraulico documentato",
      "Overtopping / hydrodynamic action": "Sormonto / azione idrodinamica",
      Overstress: "Sovrasollecitazione",
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
      "Demolition operation": "Operazione di demolizione",
      Earthquake: "Sisma",
      "Exceptional overload": "Sovraccarico eccezionale",
      "Excavation / construction works": "Scavi / lavori di costruzione",
      "Fire / explosion": "Incendio / esplosione",
      Flood: "Piena",
      "Landslide / slope failure": "Frana / instabilità di versante",
      "Lifting / construction operation": "Sollevamento / operazione costruttiva",
      "Movable bridge operation": "Manovra del ponte mobile",
      "No identifiable external trigger": "Nessun innesco esterno identificabile",
      "Rainfall-induced landslide": "Frana indotta da precipitazioni",
      "Static load test": "Prova di carico statica",
      "Vehicle impact": "Impatto veicolare",
    },
  };

  return translations[group]?.[String(value)] || String(value);
}

function EventPopup({
  atlasMode = "open",
  event,
  episodeEvents = [],
  hazardProfile = null,
  onOpenDossier = null,
  openRelease = null,
  professionalMode = false,
  reliability = null,
  relatedSources = [],
  sharedEpisode = null,
  sourcesStatus = "available",
  standalone = false,
  vulnerability = null,
}) {
  const { language } = useLanguage();
  const [descriptionExpanded, setDescriptionExpanded] =
    useState(false);
  const [dossierExpanded, setDossierExpanded] =
    useState(standalone);
  const [activeDossierTab, setActiveDossierTab] =
    useState("event");
  const [activeContextTab, setActiveContextTab] =
    useState("rainfall");
  const [researchActionStatus, setResearchActionStatus] =
    useState(null);
  const dossierId = useId();
  const dossierTitleId = useId();
  const dossierToggleRef = useRef(null);
  const dossierRef = useRef(null);
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
    description: it ? "Descrizione del collasso" : "Record text · original language",
    eventDriven: it ? "Evento innescato" : "Event-driven",
    fatalities: it ? "Vittime" : "Fatalities",
    historicalEvidence: it
      ? "Evidenza storica del record"
      : "Historical record evidence",
    injuries: it ? "Feriti" : "Injuries",
    infrastructureUse: it ? "Uso infrastrutturale" : "Infrastructure Use",
    trigger: it ? "Trigger storico" : "Historical trigger",
    failureProcess: it ? "Processo osservato" : "Observed process",
    componentInvolved: it ? "Componente coinvolta" : "Component involved",
    evidenceLevel: it ? "Livello di evidenza" : "Evidence level",
    evidenceNote: it
      ? "La sequenza riordina esclusivamente i campi curati nel record. I passaggi mancanti non vengono ricostruiti e la concatenazione non attribuisce da sola un nesso causale definitivo. L’esito storico documentato non è una previsione per altri ponti né una stima di rischio."
      : "The sequence only reorganises curated record fields. Missing stages are not reconstructed, and the sequence does not by itself establish a definitive causal link. Documented historical outcome: this is neither a prediction for other bridges nor a risk estimate.",
    failureSequence: it ? "Dinamica del cedimento" : "Failure sequence",
    locationQuality: it ? "Qualità localizzazione" : "Location quality",
    material: it ? "Materiale" : "Material",
    na: it ? "N/D" : "N/A",
    noSources: sourcesStatus === "error"
      ? (it ? "Le fonti non sono state caricate. Usa Riprova nell’Atlas." : "Sources could not be loaded. Use Retry in the Atlas.")
      : sourcesStatus === "loading"
        ? (it ? "Caricamento delle fonti…" : "Loading sources…")
        : it
      ? "Nessuna fonte collegata a questo evento nel dataset corrente."
      : "No source is linked to this event in the current dataset.",
    partial: it ? "Parziale" : "Partial",
    notDocumented: it
      ? "Non documentato nel record"
      : "Not documented in the record",
    missingData: it ? "Dato assente" : "Missing data",
    notApplicable: it ? "Non applicabile" : "Not applicable",
    availableData: it ? "Dati disponibili" : "Available data",
    bridgeCoverageNote: it
      ? "La copertura descrive la compilazione del record, non la qualità o la sicurezza dell’opera."
      : "Coverage describes record completion, not asset quality or safety.",
    recordCoverage: it ? "Copertura del record" : "Record coverage",
    recordCoverageNote: it
      ? "La percentuale indica soltanto quanti campi del tracciato di ricerca sono compilati. Non è un voto di qualità, affidabilità o sicurezza."
      : "The percentage only states how many research fields are populated. It is not a quality, reliability or safety score.",
    availableFields: it ? "campi disponibili" : "fields available",
    missingFields: it ? "Mancanti" : "Missing",
    citableIdentity: it ? "Identità citabile" : "Citable identity",
    dataCutoff: it ? "Dati aggiornati al" : "Data cutoff",
    license: it ? "Licenza" : "Licence",
    citationLabel: it ? "Citazione del record" : "Record citation",
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
    sourceComposition: it ? "Composizione documentale" : "Document composition",
    sourceCompositionNote: it
      ? "Le categorie descrivono la provenienza delle fonti e non costituiscono un punteggio automatico di affidabilità."
      : "Categories describe source provenance and are not an automatic reliability score.",
    sourceConfidence: it ? "Confidenza delle fonti" : "Source confidence",
    copyLink: it ? "Copia link" : "Copy link",
    copyCitation: it ? "Copia citazione" : "Copy citation",
    exportDossier: it ? "Esporta record e fonti" : "Export record and sources",
    researchTools: it ? "Strumenti per la ricerca" : "Research tools",
    linkCopied: it ? "Link copiato" : "Link copied",
    citationCopied: it ? "Citazione copiata" : "Citation copied",
    dossierExported: it ? "Dossier esportato" : "Dossier exported",
    actionFailed: it ? "Operazione non riuscita" : "Action failed",
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
  const relatedEpisodeEvents = episodeEvents.filter(
    (item) => item.event_id !== event.event_id
  );
  const episodeTypeLabel = sharedEpisode?.episode_type === "flood"
    ? (it ? "Episodio alluvionale" : "Flood episode")
    : sharedEpisode?.episode_type === "earthquake"
      ? (it ? "Episodio sismico" : "Seismic episode")
      : sharedEpisode?.episode_type === "landslide"
        ? (it ? "Episodio franoso" : "Landslide episode")
        : (it ? "Episodio naturale condiviso" : "Shared natural-hazard episode");
  const sourceGroups = [
    {
      id: "official",
      label: it ? "Ufficiali / tecniche" : "Official / technical",
    },
    {
      id: "scientific",
      label: it ? "Scientifiche" : "Scientific",
    },
    {
      id: "news",
      label: it ? "Notizie" : "News",
    },
    {
      id: "other",
      label: it ? "Altre" : "Other",
    },
  ]
    .map((group) => ({
      ...group,
      count: relatedSources.filter(
        (source) => sourceCategory(source) === group.id
      ).length,
    }))
    .filter((group) => group.count > 0);
  const orderedSources = [...relatedSources].sort(
    (left, right) =>
      sourceCategoryPriority(left) - sourceCategoryPriority(right)
  );
  const recordId = researchEventId(event);
  const releaseVersion = openRelease?.version || "arcus-open-2026.5";
  const researchSummary = buildOpenEventResearchSummary({
    event,
    sources: orderedSources,
  });
  const researchGroupLabels = {
    identity: it ? "Identità e localizzazione" : "Identity and location",
    failure_mechanism: it ? "Meccanismo di cedimento" : "Failure mechanism",
    bridge_profile: it ? "Profilo del ponte" : "Bridge profile",
    observed_outcome: it ? "Esito osservato" : "Observed outcome",
  };
  const researchFieldLabels = {
    bridge_crossing_name: it ? "nome attraversamento" : "crossing name",
    bridge_crossing_type: it ? "tipo attraversamento" : "crossing type",
    collapse_severity: it ? "severità del collasso" : "collapse severity",
    component_involved: it ? "componente coinvolta" : "component involved",
    construction_year_numeric: it ? "anno di costruzione" : "construction year",
    date: it ? "data" : "date",
    destination_use: it ? "uso infrastrutturale" : "infrastructure use",
    event_id: "ID",
    failure_cause_evidence: it ? "evidenza della causa" : "cause evidence",
    failure_process: it ? "processo di cedimento" : "failure process",
    failure_trigger: it ? "innesco" : "trigger",
    injuries: it ? "feriti" : "injuries",
    latitude: it ? "latitudine" : "latitude",
    longitude: it ? "longitudine" : "longitude",
    material_type: it ? "materiale" : "material",
    municipality: it ? "comune" : "municipality",
    province: it ? "provincia" : "province",
    region: it ? "regione" : "region",
    specific_cause: it ? "causa specifica" : "specific cause",
    structural_type: it ? "tipologia strutturale" : "structural type",
    victims: it ? "vittime" : "fatalities",
  };
  const isHydraulicEvent = event.specific_cause === "Hydraulic";
  const hasCauseRelevantTerritorialContext = ["Hydraulic", "Landslide", "Earthquake"].includes(event.specific_cause);
  const hydraulicResource = useEventContextResource("hydraulic", recordId, dossierExpanded && isHydraulicEvent, event);
  const mediaResource = useEventContextResource("media", recordId, dossierExpanded, event);
  const rainfallResource = useEventContextResource("rainfall", recordId, dossierExpanded && isHydraulicEvent, event);
  const territorialResource = useEventContextResource("territorial", recordId, dossierExpanded && hasCauseRelevantTerritorialContext, event);
  const hydraulicContext = hydraulicResource.data;
  const eventMedia = mediaResource.data || [];
  const rainfallContext = rainfallResource.data;
  const territorialContext = territorialResource.data;
  const title = eventTitle(event, language);
  const descriptionText = localizedEventDescription(event, language);
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
      rawValue: event.structural_type,
      value: taxonomyLabel(
        "structuralType",
        event.structural_type,
        language
      ),
    },
    {
      label: text.material,
      rawValue: event.material_type,
      value: material,
    },
    {
      label: text.infrastructureUse,
      rawValue: event.destination_use,
      value: taxonomyLabel(
        "use",
        event.destination_use,
        language
      ),
    },
    {
      label: text.crossingType,
      rawValue: event.bridge_crossing_type,
      value: localizedValue(
        "crossingType",
        event.bridge_crossing_type,
        language
      ),
    },
    {
      label: text.crossing,
      rawValue: event.bridge_crossing_name,
      value: localizedCrossingName(event.bridge_crossing_name, language),
    },
    {
      label: text.built,
      rawValue: event.construction_year,
      value: event.construction_year,
    },
  ].map((item) => ({
    ...item,
    availability: fieldAvailability(item.rawValue),
  }));
  const profileAvailability = {
    available: profileItems.filter(
      (item) => item.availability === "available"
    ).length,
    undocumented: profileItems.filter(
      (item) => item.availability === "undocumented"
    ).length,
    notApplicable: profileItems.filter(
      (item) => item.availability === "not-applicable"
    ).length,
  };
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
  const rawEvidence =
    event.failure_cause_evidence ||
    event.hydraulic_intelligence?.evidence_level;
  const evidenceLabel =
    localizedValue("evidence", rawEvidence, language) || text.na;
  const causalSequence = [
    {
      id: "trigger",
      label: text.trigger,
      value: localizedValue(
        "trigger",
        event.failure_trigger || event.hydraulic_intelligence?.trigger,
        language
      ),
    },
    {
      id: "process",
      label: text.failureProcess,
      value: localizedValue(
        "process",
        event.failure_process || event.hydraulic_intelligence?.failure_process,
        language
      ),
    },
    {
      id: "component",
      label: text.componentInvolved,
      value: localizedValue(
        "component",
        event.component_involved || event.hydraulic_intelligence?.component_involved,
        language
      ),
    },
    {
      id: "outcome",
      label: it ? "Esito osservato" : "Observed outcome",
      value: isTotalCollapse ? text.total : text.partial,
    },
  ];
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
        event.location_precision || (event.exact_location === true
          ? "exact"
          : event.exact_location === false
            ? "approximate"
            : "unspecified"),
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
    ...(hasCauseRelevantTerritorialContext
      ? [{ id: "context", label: it ? "Contesto" : "Context" }]
      : []),
    {
      id: "bridge",
      label: it ? "Ponte" : "Bridge",
    },
    ...(eventMedia.length > 0
      ? [{ count: eventMedia.length, id: "media", label: it ? "Immagini" : "Media" }]
      : []),
    {
      count: sourceCount,
      id: "sources",
      label: it ? "Fonti e qualità" : "Sources and quality",
    },
  ];
  const visibleDossierTab = dossierTabs.some(
    (tab) => tab.id === activeDossierTab
  )
    ? activeDossierTab
    : "event";
  const contextTabs = [
    ...(isHydraulicEvent ? [{
          id: "rainfall",
          label: it ? "Meteo ricostruito" : "Reconstructed weather",
          meta: rainfallContext?.source?.dataset || (it ? "Rianalisi" : "Reanalysis"),
          resource: rainfallResource,
          absentMessage: it ? "Nessuna ricostruzione meteorologica pubblicata per questo evento." : "No weather reconstruction is published for this event.",
    },
    {
          id: "hydraulic",
          label: it ? "Verifica idrometrica" : "Hydrometric review",
          meta:
            (hydraulicContext?.status === "source_review_required"
              ? (it ? "Da verificare" : "Source review")
              : hydraulicContext?.display_badge) ||
            hydraulicContext?.sources?.[0]?.provider || (it ? "Fonti dell’evento" : "Event sources"),
          resource: hydraulicResource,
          absentMessage: it ? "Nessun dossier idrometrico pubblicato per questo evento." : "No hydrometric dossier is published for this event.",
    }] : []),
    ...(hasCauseRelevantTerritorialContext ? [{
          id: "territorial",
          label: event.specific_cause === "Hydraulic"
            ? (it ? "Contesto idraulico attuale" : "Current hydraulic context")
            : event.specific_cause === "Landslide"
              ? (it ? "Contesto franoso attuale" : "Current landslide context")
              : (it ? "Contesto sismico attuale" : "Current seismic context"),
          meta: event.specific_cause === "Earthquake" ? "INGV" : "ISPRA",
          resource: territorialResource,
          absentMessage: it ? "Il punto non è presente nel catalogo territoriale pubblicato." : "The point is not in the published territorial catalogue.",
    }] : []),
  ];
  const visibleContextTab = contextTabs.some((tab) => tab.id === activeContextTab)
    ? activeContextTab
    : contextTabs[0]?.id;
  const selectedContext = contextTabs.find((tab) => tab.id === visibleContextTab);

  useEffect(() => {
    if (!dossierExpanded || standalone) {
      return undefined;
    }

    const previousOverflow = document.body.style.overflow;
    const dossierToggle = dossierToggleRef.current;
    document.body.style.overflow = "hidden";
    dossierTabRefs.current[0]?.focus();

    const closeOnEscape = (event) => {
      if (event.key === "Escape") {
        event.stopPropagation();
        setDossierExpanded(false);
      }
      if (event.key === "Tab") {
        const controls = [...dossierRef.current.querySelectorAll(
          'button:not([disabled]), a[href], [tabindex="0"], summary'
        )].filter((element) => element.tabIndex >= 0 && element.getClientRects().length > 0);
        const first = controls[0];
        const last = controls.at(-1);
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last?.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first?.focus();
        }
      }
    };

    document.addEventListener("keydown", closeOnEscape);

    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", closeOnEscape);
      dossierToggle?.focus();
    };
  }, [dossierExpanded, standalone]);

  useEffect(() => {
    if (!researchActionStatus) {
      return undefined;
    }

    const timer = window.setTimeout(
      () => setResearchActionStatus(null),
      2400
    );

    return () => window.clearTimeout(timer);
  }, [researchActionStatus]);

  const eventPermalink = () => {
    const url = new URL(window.location.href);
    url.hash = "";

    if (standalone) {
      return url.toString();
    }

    url.search = "";
    url.searchParams.set("event", event.event_slug || recordId);
    return url.toString();
  };

  const copyResearchText = async (value, successMessage) => {
    try {
      await navigator.clipboard.writeText(value);
      setResearchActionStatus(successMessage);
    } catch {
      setResearchActionStatus(text.actionFailed);
    }
  };

  const copyEventLink = () =>
    copyResearchText(eventPermalink(), text.linkCopied);

  const copyEventCitation = () => {
    const permalink = eventPermalink();
    const citation = buildOpenEventCitation({
      event,
      permalink,
      releaseCitation: openRelease?.citation,
      releaseVersion,
    });

    return copyResearchText(citation, text.citationCopied);
  };

  const exportEventDossier = () => {
    const permalink = eventPermalink();
    const dossier = buildOpenEventDossier({
      dataCutoff: openRelease?.data_cutoff,
      event,
      license: openRelease?.license,
      permalink,
      releaseCitation: openRelease?.citation,
      releaseVersion,
      sharedEpisode,
      sources: orderedSources,
    });
    const blob = new Blob(
      [`${JSON.stringify(dossier, null, 2)}\n`],
      { type: "application/json;charset=utf-8" }
    );
    const objectUrl = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = objectUrl;
    link.download = `${recordId || "arcus-event"}-dossier.json`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(objectUrl);
    setResearchActionStatus(text.dossierExported);
  };

  const researchCitation = buildOpenEventCitation({
    event,
    permalink: eventPermalink(),
    releaseCitation: openRelease?.citation,
    releaseVersion,
  });

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
      } ${standalone ? "is-standalone" : ""}`}
    >
      {!standalone && (
        <>
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

      {descriptionText && (
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
          if (typeof onOpenDossier === "function") {
            onOpenDossier(event);
            return;
          }

          if (dossierExpanded) {
            setDossierExpanded(false);
            return;
          }

          setActiveDossierTab("event");
          setActiveContextTab(event.specific_cause === "Hydraulic" ? "hydraulic" : "territorial");
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
        </>
      )}

      {dossierExpanded && (
        <DossierSurface
          closeLabel={text.closeDossier}
          onClose={() => setDossierExpanded(false)}
          standalone={standalone}
        >
          <aside
            aria-label={`${text.publicRecord}: ${title}`}
            aria-labelledby={dossierTitleId}
            aria-modal={standalone ? undefined : "true"}
            className={`arcus-event-dossier ${standalone ? "is-page" : ""}`}
            ref={dossierRef}
            role={standalone ? "region" : "dialog"}
          >
            <header className="arcus-event-dossier-header">
              <div>
                <div className="arcus-event-dossier-kicker">
                  <span>{text.publicRecord} · {recordId || text.na}</span>
                  <span
                    className={`arcus-event-evidence-badge is-${evidenceTone(rawEvidence)}`}
                  >
                    {text.evidenceLevel}: {evidenceLabel}
                  </span>
                </div>
                <h2 id={dossierTitleId}>{title}</h2>
                <p>
                  {formatDate(event.date, language) || text.na} · {event.municipality || text.na}
                  {event.province ? `, ${event.province}` : ""}
                </p>
              </div>
              {!standalone && (
                <button
                  aria-label={text.closeDossier}
                  type="button"
                  onClick={() => setDossierExpanded(false)}
                >
                  ×
                </button>
              )}
            </header>

            {!professionalMode && (
              <div
                aria-label={text.researchTools}
                className="arcus-event-research-tools"
                role="group"
              >
                <span>{text.researchTools}</span>
                <div>
                  <button type="button" onClick={copyEventLink}>
                    {text.copyLink}
                  </button>
                  <button type="button" onClick={copyEventCitation}>
                    {text.copyCitation}
                  </button>
                  <button type="button" onClick={exportEventDossier} disabled={sourcesStatus !== "available"}>
                    {text.exportDossier} JSON
                  </button>
                </div>
                <small aria-live="polite" role="status">
                  {researchActionStatus || `${releaseVersion} · CC BY 4.0`}
                </small>
              </div>
            )}

            <nav
              aria-label={it ? "Sezioni della scheda" : "Record sections"}
              className="arcus-event-dossier-tabs"
              role="tablist"
            >
              {dossierTabs.map((tab, tabIndex) => (
                <button
                  aria-controls={`${dossierId}-panel-${tab.id}`}
                  aria-selected={visibleDossierTab === tab.id}
                  className={visibleDossierTab === tab.id ? "is-active" : ""}
                  id={`${dossierId}-tab-${tab.id}`}
                  key={tab.id}
                  ref={(element) => {
                    dossierTabRefs.current[tabIndex] = element;
                  }}
                  role="tab"
                  tabIndex={visibleDossierTab === tab.id ? 0 : -1}
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
              aria-labelledby={`${dossierId}-tab-${visibleDossierTab}`}
              className="arcus-event-dossier-content"
              id={`${dossierId}-panel-${visibleDossierTab}`}
              role="tabpanel"
            >
              {visibleDossierTab === "event" && (
                <div className="arcus-event-tab-panel is-event">
                  <div
                    className={`arcus-event-editorial-lead ${
                      eventMedia.length > 0 ? "has-media" : ""
                    }`}
                  >
                    {eventMedia.length > 0 && (
                      <EventMedia
                        assets={eventMedia.slice(0, 1)}
                        featured
                        language={language}
                      />
                    )}
                    <div className="arcus-event-editorial-copy">
                      <div className="arcus-event-editorial-label">
                        <span>{evidenceTone(rawEvidence) === "review"
                          ? (it ? "Record in verifica" : "Record under review")
                          : (it ? "Record storico" : "Historical record")}</span>
                        <strong>{cause || causeCategory || text.na}</strong>
                      </div>
                      {evidenceTone(rawEvidence) === "review" && (
                        <p className="arcus-event-editorial-review" role="note">
                          {it
                            ? "Il record richiede revisione documentale. Leggere le note e le fonti prima di utilizzare la descrizione o l’attribuzione della causa."
                            : "This record requires documentary review. Read the notes and sources before using its description or cause attribution."}
                        </p>
                      )}
                      {descriptionText ? (
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
                      ) : (
                        <p className="arcus-event-editorial-empty">
                          {text.notDocumented}
                        </p>
                      )}
                      <div className="arcus-event-editorial-stats">
                        <div>
                          <span>{text.collapse}</span>
                          <strong>{isTotalCollapse ? text.total : text.partial}</strong>
                        </div>
                        <div>
                          <span>{text.fatalities}</span>
                          <strong>{event.victims ?? 0}</strong>
                        </div>
                        <div>
                          <span>{text.injuries}</span>
                          <strong>{event.injuries ?? 0}</strong>
                        </div>
                      </div>
                    </div>
                  </div>

                  <section className="arcus-event-failure-sequence">
                    <header>
                      <div>
                        <span>{text.historicalEvidence}</span>
                        <h3>{text.failureSequence}</h3>
                      </div>
                      <strong
                        className={`arcus-event-evidence-badge is-${evidenceTone(rawEvidence)}`}
                      >
                        {evidenceLabel}
                      </strong>
                    </header>
                    <ol>
                      {causalSequence.map((item, index) => (
                        <li
                          className={item.value ? "" : "is-undocumented"}
                          key={item.id}
                        >
                          <span className="arcus-event-sequence-index">
                            {String(index + 1).padStart(2, "0")}
                          </span>
                          <div>
                            <span>{item.label}</span>
                            <strong>{item.value || text.notDocumented}</strong>
                          </div>
                        </li>
                      ))}
                    </ol>
                    <p>{text.evidenceNote}</p>
                  </section>

                  {sharedEpisode && (
                    <section className="arcus-event-shared-episode" data-shared-episode={sharedEpisode.episode_id}>
                      <header>
                        <div>
                          <span>{it ? "Controllo di indipendenza" : "Independence control"}</span>
                          <h3>{episodeTypeLabel}</h3>
                        </div>
                        <strong>{sharedEpisode.event_count} {it ? "crolli" : "collapses"}</strong>
                      </header>
                      <div className="arcus-event-shared-episode-summary">
                        <div>
                          <span>{it ? "Intervallo documentato" : "Documented interval"}</span>
                          <strong>
                            {formatDate(sharedEpisode.date_start, language) || text.na}
                            {sharedEpisode.date_end && sharedEpisode.date_end !== sharedEpisode.date_start
                              ? ` – ${formatDate(sharedEpisode.date_end, language)}`
                              : ""}
                          </strong>
                        </div>
                        <div>
                          <span>{it ? "Territori coinvolti" : "Territories involved"}</span>
                          <strong>{sharedEpisode.regions?.join(" · ") || text.na}</strong>
                        </div>
                        <div>
                          <span>{it ? "Base del raggruppamento" : "Grouping basis"}</span>
                          <strong>
                            {sharedEpisode.assignment_status === "curated_hazard_registry"
                              ? (it ? "Registro curato" : "Curated registry")
                              : (it ? "Fonti documentali condivise" : "Shared documentary sources")}
                          </strong>
                        </div>
                      </div>
                      {relatedEpisodeEvents.length > 0 && (
                        <details>
                          <summary>
                            {it
                              ? `Apri gli altri ${relatedEpisodeEvents.length} record dell’episodio`
                              : `Open the other ${relatedEpisodeEvents.length} episode records`}
                          </summary>
                          <div className="arcus-event-shared-episode-list">
                            {relatedEpisodeEvents.map((relatedEvent) => (
                              <Link
                                key={relatedEvent.event_id}
                                to={`/atlas/events/${encodeURIComponent(relatedEvent.event_slug || researchEventId(relatedEvent))}`}
                              >
                                <span>{researchEventId(relatedEvent)}</span>
                                <strong>{eventTitle(relatedEvent, language)}</strong>
                                <small>
                                  {formatDate(relatedEvent.date, language)} · {relatedEvent.municipality || text.na}
                                  {relatedEvent.province ? `, ${relatedEvent.province}` : ""}
                                </small>
                              </Link>
                            ))}
                          </div>
                        </details>
                      )}
                      <p>
                        {it
                          ? "Questi record sono letti come parte dello stesso episodio ai fini del controllo del clustering. Il raggruppamento non implica che i ponti abbiano avuto lo stesso meccanismo di cedimento e non costituisce una stima di rischio."
                          : "These records are treated as part of the same episode for clustering control. The grouping does not imply an identical bridge failure mechanism and is not a risk estimate."}
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

              {visibleDossierTab === "context" && (
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
                  <EventResourceState resource={selectedContext.resource} language={language} absentMessage={selectedContext.absentMessage} />
                  {visibleContextTab === "rainfall" && rainfallContext && (
                    <EventRainfallContext context={rainfallContext} />
                  )}
                  {visibleContextTab === "hydraulic" && hydraulicContext && (
                    <EventHydraulicContext context={hydraulicContext} />
                  )}
                  {visibleContextTab === "territorial" && territorialContext && (
                    <EventTerritorialContext
                      cause={event.specific_cause}
                      context={territorialContext}
                    />
                  )}
                </div>
              )}

              {visibleDossierTab === "bridge" && (
                <div className="arcus-event-tab-panel is-bridge">
                  <div className="arcus-event-tab-intro">
                    <span>{it ? "Profilo dell’opera" : "Asset profile"}</span>
                    <h3>{it ? "Il ponte documentato" : "The documented bridge"}</h3>
                    <p>
                      {it
                        ? "Caratteristiche disponibili nel record storico; i campi non documentati non vengono ricostruiti."
                        : "Characteristics available in the historical record; undocumented fields are not reconstructed."}
                    </p>
                    <div className="arcus-event-profile-coverage">
                      <span>{text.availableData}</span>
                      <strong>
                        {profileAvailability.available}/{profileItems.length}
                      </strong>
                      <small>{text.bridgeCoverageNote}</small>
                    </div>
                  </div>
                  <section className="arcus-event-profile">
                      {profileItems.map((item) => {
                        const displayedValue =
                          item.availability === "undocumented"
                            ? text.notDocumented
                            : item.availability === "not-applicable"
                              ? text.notApplicable
                              : item.value;

                        return (
                        <div
                          className={`is-${item.availability}`}
                          key={item.label}
                        >
                          <span>{item.label}</span>
                          <strong>{displayedValue}</strong>
                          <small className="arcus-event-field-status">
                            <i aria-hidden="true" />
                            {item.availability === "available"
                              ? (it ? "Documentato" : "Documented")
                              : item.availability === "undocumented"
                                ? text.missingData
                                : text.notApplicable}
                          </small>
                        </div>
                        );
                      })}
                      {professionalMode && (
                        <div className="is-available">
                          <span>{it ? "Hazard dominante" : "Dominant hazard"}</span>
                          <strong>{hazardLabel}</strong>
                          <small className="arcus-event-field-status">
                            <i aria-hidden="true" />
                            {it ? "Layer Professional" : "Professional layer"}
                          </small>
                        </div>
                      )}
                    </section>
                </div>
              )}

              {visibleDossierTab === "media" && (
                <div className="arcus-event-tab-panel is-media">
                  {eventMedia.length > 0 && <EventMedia assets={eventMedia} language={language} />}
                </div>
              )}

              {visibleDossierTab === "sources" && (
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
                      <div className="arcus-event-record-coverage">
                        <div className="arcus-event-record-coverage-heading">
                          <div>
                            <span>{text.recordCoverage}</span>
                            <strong>
                              {researchSummary.completeness.available_fields}/
                              {researchSummary.completeness.total_fields}
                            </strong>
                          </div>
                          <b>{researchSummary.completeness.coverage_percent}%</b>
                        </div>
                        <p>{text.recordCoverageNote}</p>
                        <div className="arcus-event-record-coverage-grid">
                          {researchSummary.completeness.groups.map((group) => (
                            <article key={group.id}>
                              <header>
                                <strong>{researchGroupLabels[group.id]}</strong>
                                <b>{group.available}/{group.total}</b>
                              </header>
                              <progress
                                aria-label={`${researchGroupLabels[group.id]}: ${group.coverage_percent}%`}
                                max="100"
                                value={group.coverage_percent}
                              />
                              <small>
                                {group.missing_fields.length > 0
                                  ? `${text.missingFields}: ${group.missing_fields.map((field) => researchFieldLabels[field] || field).join(", ")}`
                                  : `${group.available} ${text.availableFields}`}
                              </small>
                            </article>
                          ))}
                        </div>
                      </div>
                      <div className="arcus-event-citable-identity">
                        <span>{text.citableIdentity}</span>
                        <dl>
                          <div>
                            <dt>ID</dt>
                            <dd>{recordId}</dd>
                          </div>
                          <div>
                            <dt>Release</dt>
                            <dd>{releaseVersion}</dd>
                          </div>
                          <div>
                            <dt>{text.dataCutoff}</dt>
                            <dd>{openRelease?.data_cutoff || text.na}</dd>
                          </div>
                          <div>
                            <dt>{text.license}</dt>
                            <dd>{openRelease?.license?.id || "CC BY 4.0"}</dd>
                          </div>
                        </dl>
                        <div>
                          <strong>{text.citationLabel}</strong>
                          <p>{researchCitation}</p>
                        </div>
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
                      <>
                        <div className="arcus-event-source-composition">
                          <span className="arcus-event-source-composition-title">
                            {text.sourceComposition}
                          </span>
                          <div className="arcus-event-source-groups">
                            {sourceGroups.map((group) => (
                              <span
                                className={`arcus-event-source-group is-${group.id}`}
                                key={group.id}
                              >
                                <strong>{group.count}</strong>
                                {group.label}
                              </span>
                            ))}
                          </div>
                          <p>{text.sourceCompositionNote}</p>
                        </div>
                        <div className="arcus-event-source-list">
                        {orderedSources.map((source) => {
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
                      </>
                    ) : (
                      <p className="arcus-event-no-sources">{text.noSources}</p>
                    )}
                  </section>
                </div>
              )}
            </div>
          </aside>
        </DossierSurface>
      )}
    </article>
  );
}

export default EventPopup;
