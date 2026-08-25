import {
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import {
  Link,
} from "react-router-dom";

import CollapseMap from "../components/map/CollapseMap";
import PointHazardInspector from "../components/hazard/PointHazardInspector";
import Navbar from "../components/layout/Navbar";
import PageMeta from "../components/layout/PageMeta";
import useLanguage from "../context/useLanguage";
import arcusLogoFullLight from "../assets/logo/logo-full-light.svg";
import {
  buildTerritoryProfiles,
  buildSourceReliabilityByEvent,
  buildVulnerabilityByEvent,
  buildAssetScreening,
  buildSourceCountByEvent,
  countBy,
  findAssetSimilarEvents,
  findSimilarEvents,
  formatValue,
  percentage,
  summarizeReliability,
  summarizeVulnerability,
} from "../utils/analytics";
import {
  completeProfessionalReport,
  createProfessionalWorkspace,
  deleteProfessionalWorkspace,
  downloadProfessionalExport,
  professionalHazardExposurePoint,
  professionalMitigationIntelligence,
  professionalWorkspaces,
  professionalResource,
  registerProfessionalReport,
} from "../utils/apiClient";
import {
  buildProvinceRegistry,
  deriveProvinceForPoint,
  findProvinceInRegistry,
  normalizeProvinceKey,
  provinceMatchesValue,
} from "../utils/projectLocation";
import {
  buildMitigationReportSummary,
} from "../utils/mitigationReportSummary";

import "../styles/platform-levels.css";

let htmlToImageModulePromise = null;
let jsPdfModulePromise = null;

async function loadToPng() {
  htmlToImageModulePromise ||= import("html-to-image");

  return (await htmlToImageModulePromise).toPng;
}

async function loadJsPDF() {
  jsPdfModulePromise ||= import("jspdf");

  return (await jsPdfModulePromise).jsPDF;
}

function cleanDisplayText(value) {
  return String(value ?? "")
    .replaceAll("ÃƒÂ¬", "ì")
    .replaceAll("ÃƒÂ²", "ò")
    .replaceAll("ÃƒÂ ", "à")
    .replaceAll("ÃƒÂ¨", "è")
    .replaceAll("ÃƒÂ©", "é")
    .replaceAll("ÃƒÂ¹", "ù")
    .replaceAll("Ã¬", "ì")
    .replaceAll("Ã²", "ò")
    .replaceAll("Ã ", "à")
    .replaceAll("Ã¨", "è")
    .replaceAll("Ã©", "é")
    .replaceAll("Ã¹", "ù")
    .replaceAll("â€“", "-")
    .replaceAll("â€”", "-")
    .replaceAll("â€™", "'")
    .replaceAll("â€œ", '"')
    .replaceAll("â€", '"')
    .replaceAll("Caltanisetta", "Caltanissetta");
}

function traceFrontendHazardStage({
  hazard,
  latitude,
  longitude,
  requestId,
  stage,
}) {
  if (!import.meta.env.DEV) {
    return;
  }

  console.info(
    `[arcus-hazard-trace] ${JSON.stringify({
      duration_ms: null,
      error: null,
      hazard,
      latitude: Number.isFinite(Number(latitude)) ? Number(latitude) : null,
      longitude: Number.isFinite(Number(longitude)) ? Number(longitude) : null,
      provider_version: null,
      request_id: requestId || "unknown",
      stage,
    })}`
  );
}

function evidenceGradeFromScore(value) {
  const score = Number(value) || 0;

  if (score >= 82) {
    return "A";
  }

  if (score >= 68) {
    return "B";
  }

  if (score >= 50) {
    return "C";
  }

  return "D";
}

function hasNearbyOfficialContext(exposure) {
  return (
    exposure?.nearby_context?.status === "available" &&
    Array.isArray(exposure.nearby_context.classes) &&
    exposure.nearby_context.classes.length > 0
  );
}

function nearbyContextScope(radiusKm, language) {
  if (Number(radiusKm) >= 25) {
    return language === "it" ? "di area vasta" : "wide-area";
  }

  return language === "it" ? "vicino" : "nearby";
}

function nearbyContextLabel(exposure, language) {
  if (!hasNearbyOfficialContext(exposure)) {
    return "";
  }

  const nearby = exposure.nearby_context;
  const classes = nearby.classes.join(", ");
  const scope = nearbyContextScope(nearby.search_radius_km, language);

  return language === "it"
    ? `Contesto ufficiale ${scope}: ${classes} entro ${nearby.search_radius_km} km; non attribuito al punto.`
    : `${scope === "wide-area" ? "Wide-area" : "Nearby"} official context: ${classes} within ${nearby.search_radius_km} km; not assigned to the point.`;
}

function exposureStatusLabel(exposure, language) {
  if (!exposure) {
    return language === "it"
      ? "In attesa del punto progetto"
      : "Awaiting project point";
  }

  if (hasNearbyOfficialContext(exposure)) {
    return language === "it"
      ? "Interrogazione completata; contesto territoriale disponibile"
      : "Query completed; territorial context available";
  }

  const labels =
    language === "it"
      ? {
          available: "Dato ufficiale disponibile",
          invalid_coordinates: "Coordinate non valide",
          loading: "Interrogazione in corso",
          no_intersection:
            "Interrogazione completata; nessuna classe al punto",
          partial: "Risposta ufficiale parziale",
          provider_exception: "Errore del provider",
          request_timeout: "Timeout del provider",
          service_unreachable: "Provider temporaneamente non raggiungibile",
          source_unavailable: "Sorgente temporaneamente non disponibile",
        }
      : {
          available: "Official data available",
          invalid_coordinates: "Invalid coordinates",
          loading: "Query in progress",
          no_intersection: "Query completed; no class at the point",
          partial: "Partial official response",
          provider_exception: "Provider error",
          request_timeout: "Provider timeout",
          service_unreachable: "Provider temporarily unreachable",
          source_unavailable: "Source temporarily unavailable",
        };

  return labels[exposure.status] || String(exposure.status || "-").replaceAll("_", " ");
}

function assessmentStatusLabel(exposure, language) {
  if (!exposure) {
    return "-";
  }

  if (exposure.assessment_complete === false) {
    return language === "it" ? "incompleta" : "incomplete";
  }

  return language === "it" ? "completa" : "complete";
}

function liveProviderStatusLabel(exposure, language) {
  const status = exposure?.source?.live_provider_status;

  if (
    status === "no_intersection" ||
    (hasNearbyOfficialContext(exposure) && exposure?.assessment_complete !== false)
  ) {
    return language === "it"
      ? "Interrogazione completata"
      : "Query completed";
  }

  return String(status || "-").replaceAll("_", " ");
}

function analysisModeLabel(exposure, language) {
  if (hasNearbyOfficialContext(exposure)) {
    return language === "it"
      ? "Verifica puntuale + contesto territoriale"
      : "Point check + territorial context";
  }

  if (exposure?.source?.analysis_mode === "point_intersection") {
    return language === "it"
      ? "Verifica puntuale dei perimetri"
      : "Point perimeter check";
  }

  return String(exposure?.source?.analysis_mode || "-").replaceAll("_", " ");
}

export default function ProfessionalPage() {
  const { language } = useLanguage();
  const [events, setEvents] = useState([]);
  const [sources, setSources] = useState([]);
  const [
    selectedProvince,
    setSelectedProvince,
  ] = useState("");
  const [activeModule, setActiveModule] =
    useState("professional-hotspots");
  const [professionalMapLayers, setProfessionalMapLayers] =
    useState({
      assets: true,
      events: true,
      heatmap: true,
      hydraulic: true,
      landslide: true,
      seismic: true,
      watchlist: true,
    });
  const [scenario, setScenario] =
    useState("baseline");
  const [assetRows, setAssetRows] = useState([]);
  const [assetError, setAssetError] =
    useState("");
  const [assetSession, setAssetSession] = useState({
    fileName: "",
    uploadedAt: "",
  });
  const [path02ReadingMode] =
    useState("monitoring_priority");
  const [apiManifest, setApiManifest] =
    useState(null);
  const [modelCards, setModelCards] =
    useState([]);
  const [dataQuality, setDataQuality] =
    useState(null);
  const [isPreparingReport, setIsPreparingReport] =
    useState(false);
  const [exportStatus, setExportStatus] = useState("");
  const [dataDictionary, setDataDictionary] =
    useState([]);
  const [dataRelease, setDataRelease] =
    useState(null);
  const [externalLayers, setExternalLayers] =
    useState([]);
  const [hazardExposurePreview, setHazardExposurePreview] =
    useState(null);
  const [ainopBridgeIndex, setAinopBridgeIndex] =
    useState(null);
  const [workspaceName, setWorkspaceName] =
    useState("");
  const [savedWorkspaces, setSavedWorkspaces] =
    useState([]);
  const [activeEntryPath, setActiveEntryPath] =
    useState(0);
  const [
    hasSelectedProfessionalPath,
    setHasSelectedProfessionalPath,
  ] = useState(false);
  const [activeWorkflowStep, setActiveWorkflowStep] =
    useState(0);
  const [
    manualAreaBounds,
    setManualAreaBounds,
  ] = useState(null);
  const [provinceGeoFeatures, setProvinceGeoFeatures] =
    useState([]);
  const [provinceGeometryStatus, setProvinceGeometryStatus] =
    useState("loading");
  const [projectLocation, setProjectLocation] = useState({
    derivedProvince: "",
    derivedProvinceCode: "",
    derivedProvinceKey: "",
    derivedProvinceName: "",
    latitude: "",
    longitude: "",
    selectionSource: "",
    validated: false,
  });
  const activeHazardRequestRef = useRef("");
  const [
    path01ExposureStatus,
    setPath01ExposureStatus,
  ] = useState("idle");
  const [
    path01HydraulicExposure,
    setPath01HydraulicExposure,
  ] = useState(null);
  const [
    path01LandslideExposure,
    setPath01LandslideExposure,
  ] = useState(null);
  const [
    path01SeismicExposure,
    setPath01SeismicExposure,
  ] = useState(null);
  const [
    path01MitigationIntelligence,
    setPath01MitigationIntelligence,
  ] = useState(null);
  const [
    path02ExposureStatus,
    setPath02ExposureStatus,
  ] = useState("idle");
  const [
    path02HydraulicExposure,
    setPath02HydraulicExposure,
  ] = useState(null);
  const projectContext = "bridge";
  const [researchQuery, setResearchQuery] =
    useState("");

  useEffect(() => {
    professionalWorkspaces()
      .then(setSavedWorkspaces)
      .catch(() => setSavedWorkspaces([]));
  }, []);

  useEffect(() => {
    fetch("/data/geo/italy-provinces.geojson")
      .then((response) => {
        if (!response.ok) {
          throw new Error("province_geometry_unavailable");
        }

        return response.json();
      })
      .then((geojson) => {
        setProvinceGeoFeatures(
          Array.isArray(geojson.features)
            ? geojson.features
            : []
        );
        setProvinceGeometryStatus("ready");
      })
      .catch(() => {
        setProvinceGeoFeatures([]);
        setProvinceGeometryStatus("error");
      });
  }, []);

  useEffect(() => {
    professionalResource("professional-events")
      .then((data) =>
        setEvents(Array.isArray(data.events) ? data.events : [])
      )
      .catch(() => setEvents([]));

    professionalResource("professional-sources")
      .then((data) =>
        setSources(Array.isArray(data) ? data : data.sources || [])
      )
      .catch(() => setSources([]));

    professionalResource("api-manifest")
      .then(setApiManifest)
      .catch(() => setApiManifest(null));

    professionalResource("model-cards")
      .then((data) =>
        setModelCards(data.models || [])
      )
      .catch(() => setModelCards([]));

    professionalResource("data-quality")
      .then(setDataQuality)
      .catch(() => setDataQuality(null));

    professionalResource("data-dictionary")
      .then((data) =>
        setDataDictionary(data.datasets || [])
      )
      .catch(() => setDataDictionary([]));

    professionalResource("data-release")
      .then(setDataRelease)
      .catch(() => setDataRelease(null));

    professionalResource("external-hazard-layers")
      .then((data) =>
        setExternalLayers(data.layers || [])
      )
      .catch(() => setExternalLayers([]));

    professionalResource("hazard-exposure-preview")
      .then(setHazardExposurePreview)
      .catch(() => setHazardExposurePreview(null));

    professionalResource("ainop-bridge-index")
      .then(setAinopBridgeIndex)
      .catch(() => setAinopBridgeIndex(null));
  }, []);

  useEffect(() => {
    const moduleIds = [
      "professional-hotspots",
      "professional-risk-score",
      "professional-scenarios",
      "professional-map",
      "professional-assets",
      "professional-similarity",
      "professional-api",
      "professional-monitoring",
      "professional-governance",
      "professional-quality",
      "professional-report",
    ];
    const sections = moduleIds
      .map((id) => document.getElementById(id))
      .filter(Boolean);

    if (!sections.length) {
      return undefined;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort(
            (a, b) =>
              b.intersectionRatio -
              a.intersectionRatio
          )[0];

        if (visible?.target?.id) {
          setActiveModule(visible.target.id);
        }
      },
      {
        rootMargin: "-22% 0px -62% 0px",
        threshold: [0.01, 0.12, 0.3],
      }
    );

    sections.forEach((section) =>
      observer.observe(section)
    );

    return () => observer.disconnect();
  }, []);

  const copy =
    language === "it"
      ? {
          atlas: "Apri Atlante",
          cta: "Vai al workspace Professional",
          description:
            "ARCUS Professional trasforma evidenze verificate di collasso, hazard territoriali e inventari asset in ranking di priorita, scenari tecnici e report esportabili.",
          hazard:
            "Layer di esposizione",
          hazardText:
            "Il valore Professional nasce dall'incrocio tra eventi ARCUS e overlay pubblici dichiarati: frane, alluvioni, idraulica, sismicita ed eta infrastrutturale. Le integrazioni private possono essere valutate come sviluppo dedicato.",
          heroLabel:
            "ARCUS PROFESSIONAL",
          heroTitle:
            "Workspace operativo per decisioni sul rischio ponte.",
          hotspot:
            "Hotspot territoriali",
          kpiEvents:
            "eventi nel modello",
          kpiRegions:
            "regioni profilate",
          kpiSources:
            "fonti integrate",
          report:
            "Report operativo",
          reportText:
            "Output pensato per societa di ingegneria, concessionari e utility: ranking di priorita, benchmark territoriali, evidenza documentale e raccomandazioni.",
          scenario:
            "Scenario operativo",
          scenarioText:
            "Ricalibra il ranking dando piu peso ai territori coerenti con uno scenario tecnico e con gli overlay pubblici gia dichiarati nel registro Professional.",
          province:
            "Priorita provinciali",
          provinceTitle:
            "Infrastructure Priority Index per provincia",
          scoreBreakdown:
            "Composizione dell'indicatore",
          selectedTerritory:
            "Territorio selezionato",
          reportTitle:
            "Report operativo provincia",
          priorityEvents:
            "Eventi prioritari",
          recommendations:
            "Raccomandazioni preliminari",
          printReport:
            "Stampa report",
          downloadReport:
            "Scarica report",
          exportReport:
            "Esporta CSV",
          actionMatrix:
            "Matrice azioni",
          benchmark:
            "Benchmark nazionale",
          reliability:
            "Affidabilita evidenze",
          reliabilityText:
            "Indicatore calcolato su volume fonti, autorevolezza, confidenza ARCUS, precisione spaziale e tracciabilita temporale.",
          reliabilityBenchmark:
            "Eventi professional-grade",
          reliabilityWeak:
            "eventi con evidenza debole",
          vulnerability:
            "Contesto di vulnerabilita",
          vulnerabilityText:
            "Lettura contestuale basata su severita, trigger, causa, tipologia strutturale, eta, impatto umano e solidita dell'evidenza.",
          vulnerabilityBenchmark:
            "Eventi High/Critical",
          dominantClass:
            "Classe dominante",
          assetScreening:
            "Asset screening",
          assetScreeningTitle:
            "Carica un inventario e ottieni priorita operative.",
          assetScreeningText:
            "Importa un CSV con ponti o asset infrastrutturali. ARCUS li confronta con territorio, eventi storici, vulnerabilita e meccanismi dominanti.",
          assetUpload:
            "Carica CSV asset",
          assetTemplate:
            "Scarica template Excel",
          assetExport:
            "Esporta screening Excel",
          assetEmpty:
            "Nessun asset caricato. Usa il template CSV per testare il workflow.",
          assetComparable:
            "eventi comparabili",
          assetNearby:
            "eventi entro 35 km",
          topAsset:
            "Asset prioritario",
          screeningScore:
            "priority index",
          highCriticalMatches:
            "casi storici High/Critical",
          assetHazard:
            "hazard dominante",
          assetAudit:
            "Qualita inventario",
          coordinatesReady:
            "con coordinate",
          territoryReady:
            "con territorio",
          technicalReady:
            "con dati tecnici",
          ageReady:
            "con anno costruzione",
          similarity:
            "Motore similarita",
          similarityTitle:
            "Casi storici comparabili, con motivazione tecnica.",
          similarityText:
            "ARCUS confronta causa, severita, tipologia, materiale, trigger e contesto territoriale per trasformare il database in una banca di precedenti.",
          assetPrecedents:
            "Precedenti per asset",
          eventPrecedents:
            "Precedenti per evento",
          integration:
            "Layer integrazione",
          integrationTitle:
            "Layer dati controllato per GIS, BI e integrazioni tecniche.",
          integrationText:
            "La pipeline ARCUS produce risorse professionali versionate per report, analisi territoriali e integrazioni autorizzate. L'accesso e contestuale al workflow Professional, non un download bulk del database live.",
          apiManifest:
            "Accesso controllato",
          monitoringLayer:
            "Monitoraggio",
          monitoringTitle:
            "Watchlist operativa per priorita e follow-up.",
          monitoringText:
            "ARCUS identifica eventi e territori che richiedono revisione, arricchimento evidenze o monitoraggio periodico in base a vulnerabilita, severita, trigger e affidabilita documentale.",
          monitoringExport:
            "Esporta watchlist Excel",
          monitoringRules:
            "Regole attive",
          monitoringQueue:
            "Coda monitoraggio",
          workspace:
            "Workspace",
          workspaceTitle:
            "Salva analisi territoriali come progetti riapribili.",
          workspaceText:
            "Crea snapshot locali con indicatori, contesto di vulnerabilita, affidabilita, watchlist e scenario attivo. In una fase successiva questo layer diventera multiutente.",
          workspacePlaceholder:
            "Nome progetto o cliente",
          saveWorkspace:
            "Salva progetto",
          exportWorkspace:
            "Esporta JSON",
          deleteWorkspace:
            "Elimina",
          savedProjects:
            "Progetti salvati",
          noProjects:
            "Nessun progetto salvato in questo browser.",
          governance:
            "Model governance",
          governanceTitle:
            "Modelli dichiarati, versionati e verificabili.",
          governanceText:
            "ARCUS Professional espone model cards per spiegare input, output, limiti e stato degli indicatori. Questo rende la piattaforma piu trasparente per enti, tecnici e partner.",
          modelInputs:
            "Input principali",
          modelLimits:
            "Limiti dichiarati",
          quality:
            "Data quality",
          qualityTitle:
            "Copertura e readiness del dataset professionale.",
          qualityText:
            "ARCUS espone un audit dei dati per distinguere campi robusti, aree da completare e criticita da considerare prima dell'uso professionale.",
          readiness:
            "Readiness",
          coverage:
            "Copertura campi",
          watchItems:
            "Elementi da monitorare",
          scenarioMatrix:
            "Matrice scenari",
          scenarioMatrixTitle:
            "Confronto rapido delle priorita operative per scenario.",
          scenarioMatrixText:
            "La matrice mostra come cambiano i territori prioritari quando ARCUS ricalibra il ranking verso stress idraulico, frane, sismicita, vulnerabilita strutturale o impatti.",
          baselineScore:
            "baseline",
          scenarioScore:
            "scenario",
          mapPreview:
            "Mappa Professional",
          mapPreviewTitle:
            "Vista geospaziale del territorio selezionato.",
          mapPreviewText:
            "La mappa mostra gli eventi ARCUS della provincia selezionata con popup, fonti e classificazioni gia collegate al dataset operativo.",
          mapEvents:
            "Eventi",
          mapHeatmap:
            "Densita",
          mapAssets:
            "Asset",
          mapWatchlist:
            "Watchlist",
          dictionary:
            "Dizionario dati",
          dictionaryTitle:
            "Schema tecnico per dataset, API e integrazioni.",
          dictionaryText:
            "Ogni risorsa ARCUS espone campi, tipi, copertura e stato required/opzionale. Questo facilita integrazioni GIS, BI, audit e sviluppo API.",
          fields:
            "campi",
          records:
            "record",
          release:
            "Data release",
          releaseTitle:
            "Versione dati tracciabile e controllata.",
          releaseText:
            "Ogni build professionale espone una release con conteggi, controlli qualita e note operative. Questo consente audit, confronto tra versioni e reporting riproducibile.",
          releaseChecks:
            "Controlli release",
          externalLayers:
            "Layer esterni",
          externalLayersTitle:
            "Registro ufficiale degli overlay pubblici ARCUS Professional.",
          externalLayersText:
            "Modulo Professional dedicato agli overlay pubblici e istituzionali: IdroGEO/ISPRA, INGV e Protezione Civile. Ogni layer e dichiarato con fonte, priorita, stato operativo e strategia di join.",
          provider:
            "Fonte",
          joinStrategy:
            "Strategia join",
          hazardPreview:
            "Public hazard overlays",
          hazardPreviewTitle:
            "Profilo esposizione pronto per i join geospaziali.",
          hazardPreviewText:
            "Questo modulo usa il registro degli overlay pubblici ARCUS Professional e produce una lettura provinciale di esposizione. Le connessioni live e i layer proprietari restano possibili estensioni dedicate.",
          dominantHazard:
            "Hazard dominante",
          aboveAverage:
            "sopra media",
          belowAverage:
            "sotto media",
          alignedAverage:
            "in linea",
          immediateReview:
            "Revisione immediata",
          evidenceEnrichment:
            "Arricchimento evidenze",
          monitoring:
            "Monitoraggio",
          watchlist:
            "Watchlist prioritaria",
        }
      : {
          atlas: "Open Atlas",
          cta: "Open Professional workspace",
          description:
            "ARCUS Professional converts verified collapse evidence, territorial hazards and asset inventories into priority rankings, scenario readings and exportable technical reports.",
          hazard:
            "Exposure Layers",
          hazardText:
            "Professional value comes from crossing ARCUS events with declared public overlays: landslides, floods, hydraulic exposure, seismicity and infrastructure age. Private integrations can be evaluated as dedicated extensions.",
          heroLabel:
            "ARCUS PROFESSIONAL",
          heroTitle:
            "Operational workspace for bridge-risk decisions.",
          hotspot:
            "Territorial Hotspots",
          kpiEvents:
            "events in model",
          kpiRegions:
            "profiled regions",
          kpiSources:
            "integrated sources",
          report:
            "Operational Report",
          reportText:
            "Output designed for engineering companies, concessionaires and utilities: priority rankings, territorial benchmarks, documented evidence and recommendations.",
          scenario:
            "Operational scenario",
          scenarioText:
            "Recalibrate the ranking by giving more weight to territories aligned with a technical scenario and with public overlays declared in the Professional registry.",
          province:
            "Provincial priorities",
          provinceTitle:
            "Infrastructure Priority Index by province",
          scoreBreakdown:
            "Indicator composition",
          selectedTerritory:
            "Selected territory",
          reportTitle:
            "Provincial operational report",
          priorityEvents:
            "Priority events",
          recommendations:
            "Preliminary recommendations",
          printReport:
            "Print report",
          downloadReport:
            "Download report",
          exportReport:
            "Export CSV",
          actionMatrix:
            "Action matrix",
          benchmark:
            "National benchmark",
          reliability:
            "Evidence reliability",
          reliabilityText:
            "Indicator calculated from source volume, authority, ARCUS confidence, spatial precision and temporal traceability.",
          reliabilityBenchmark:
            "Professional-grade events",
          reliabilityWeak:
            "weak-evidence events",
          vulnerability:
            "Vulnerability context",
          vulnerabilityText:
            "Contextual reading based on severity, trigger, cause, structural typology, age, human impact and evidence strength.",
          vulnerabilityBenchmark:
            "High/Critical events",
          dominantClass:
            "Dominant class",
          assetScreening:
            "Asset screening",
          assetScreeningTitle:
            "Upload an inventory and get operational priorities.",
          assetScreeningText:
            "Import a CSV with bridges or infrastructure assets. ARCUS compares them with territory, historical events, vulnerability and dominant mechanisms.",
          assetUpload:
            "Upload asset CSV",
          assetTemplate:
            "Download Excel template",
          assetExport:
            "Export Excel screening",
          assetEmpty:
            "No assets uploaded. Use the CSV template to test the workflow.",
          assetComparable:
            "comparable events",
          assetNearby:
            "events within 35 km",
          topAsset:
            "Top asset",
          screeningScore:
            "priority index",
          highCriticalMatches:
            "High/Critical historical matches",
          assetHazard:
            "dominant hazard",
          assetAudit:
            "Inventory quality",
          coordinatesReady:
            "with coordinates",
          territoryReady:
            "with territory",
          technicalReady:
            "with technical data",
          ageReady:
            "with construction year",
          similarity:
            "Similarity engine",
          similarityTitle:
            "Comparable historical cases, with technical reasoning.",
          similarityText:
            "ARCUS compares cause, severity, typology, material, trigger and territorial context to turn the database into precedent intelligence.",
          assetPrecedents:
            "Asset precedents",
          eventPrecedents:
            "Event precedents",
          integration:
            "Integration layer",
          integrationTitle:
            "Controlled data layer for GIS, BI and technical integrations.",
          integrationText:
            "The ARCUS pipeline produces versioned professional resources for reports, territorial analysis and authorised integrations. Access is contextual to the Professional workflow, not a bulk download of the live database.",
          apiManifest:
            "Controlled access",
          monitoringLayer:
            "Monitoring",
          monitoringTitle:
            "Operational watchlist for priorities and follow-up.",
          monitoringText:
            "ARCUS identifies events and territories requiring review, evidence enrichment or periodic monitoring based on vulnerability, severity, trigger and source reliability.",
          monitoringExport:
            "Export Excel watchlist",
          monitoringRules:
            "Active rules",
          monitoringQueue:
            "Monitoring queue",
          workspace:
            "Workspace",
          workspaceTitle:
            "Save territorial analyses as reopenable projects.",
          workspaceText:
            "Create local snapshots with indicators, vulnerability context, reliability, watchlist and active scenario. Later this layer can become multi-user.",
          workspacePlaceholder:
            "Project or client name",
          saveWorkspace:
            "Save project",
          exportWorkspace:
            "Export JSON",
          deleteWorkspace:
            "Delete",
          savedProjects:
            "Saved projects",
          noProjects:
            "No projects saved in this browser.",
          governance:
            "Model governance",
          governanceTitle:
            "Declared, versioned and auditable models.",
          governanceText:
            "ARCUS Professional exposes model cards describing inputs, outputs, limitations and indicator status. This makes the platform more transparent for institutions, engineers and partners.",
          modelInputs:
            "Main inputs",
          modelLimits:
            "Declared limitations",
          quality:
            "Data quality",
          qualityTitle:
            "Coverage and readiness of the professional dataset.",
          qualityText:
            "ARCUS exposes a data audit to distinguish robust fields, completion gaps and issues to consider before professional use.",
          readiness:
            "Readiness",
          coverage:
            "Field coverage",
          watchItems:
            "Watch items",
          scenarioMatrix:
            "Scenario matrix",
          scenarioMatrixTitle:
            "Fast comparison of operational priorities by scenario.",
          scenarioMatrixText:
            "The matrix shows how priority territories change when ARCUS recalibrates the ranking toward hydraulic stress, landslides, seismicity, structural vulnerability or impacts.",
          baselineScore:
            "baseline",
          scenarioScore:
            "scenario",
          mapPreview:
            "Professional map",
          mapPreviewTitle:
            "Geospatial view of the selected territory.",
          mapPreviewText:
            "The map shows ARCUS events for the selected province with popups, sources and classifications connected to the operational dataset.",
          mapEvents:
            "Events",
          mapHeatmap:
            "Density",
          mapAssets:
            "Assets",
          mapWatchlist:
            "Watchlist",
          dictionary:
            "Data dictionary",
          dictionaryTitle:
            "Technical schema for datasets, APIs and integrations.",
          dictionaryText:
            "Each ARCUS resource exposes fields, types, coverage and required/optional status. This supports GIS, BI, audit and API development.",
          fields:
            "fields",
          records:
            "records",
          release:
            "Data release",
          releaseTitle:
            "Traceable and controlled data version.",
          releaseText:
            "Each professional build exposes a release with counts, quality checks and operational notes. This enables audit, version comparison and reproducible reporting.",
          releaseChecks:
            "Release checks",
          externalLayers:
            "External layers",
          externalLayersTitle:
            "Official public overlay registry for ARCUS Professional.",
          externalLayersText:
            "Professional module for public and institutional overlays: IdroGEO/ISPRA, INGV and Civil Protection. Each layer is declared with source, priority, operational status and join strategy.",
          provider:
            "Provider",
          joinStrategy:
            "Join strategy",
          hazardPreview:
            "Public hazard overlays",
          hazardPreviewTitle:
            "Exposure profile ready for geospatial joins.",
          hazardPreviewText:
            "This module uses the ARCUS Professional public-overlay registry and produces a province-level exposure reading. Live connections and proprietary layers remain possible dedicated extensions.",
          dominantHazard:
            "Dominant hazard",
          aboveAverage:
            "above average",
          belowAverage:
            "below average",
          alignedAverage:
            "aligned",
          immediateReview:
            "Immediate review",
          evidenceEnrichment:
            "Evidence enrichment",
          monitoring:
            "Monitoring",
          watchlist:
            "Priority Watchlist",
        };

  const profiles = useMemo(
    () =>
      buildTerritoryProfiles(
        events,
        sources,
        "region"
      ),
    [events, sources]
  );

  const provinceProfiles = useMemo(
    () =>
      buildTerritoryProfiles(
        events,
        sources,
        "province"
      ),
    [events, sources]
  );

  const scenarios = useMemo(
    () => [
      {
        causes: [],
        label:
          language === "it"
            ? "Baseline ARCUS"
            : "ARCUS baseline",
        value: "baseline",
      },
      {
        causes: ["Hydraulic"],
        label:
          language === "it"
            ? "Stress idraulico"
            : "Hydraulic stress",
        value: "hydraulic",
      },
      {
        causes: ["Landslide"],
        label:
          language === "it"
            ? "Frane e versanti"
            : "Landslide exposure",
        value: "landslide",
      },
      {
        causes: ["Earthquake"],
        label:
          language === "it"
            ? "Scenario sismico"
            : "Seismic scenario",
        value: "earthquake",
      },
      {
        causes: [
          "Material",
          "Design and Construction",
          "Overload",
        ],
        label:
          language === "it"
            ? "Vulnerabilita strutturale"
            : "Structural vulnerability",
        value: "structural",
      },
      {
        causes: ["Impact"],
        label:
          language === "it"
            ? "Impatto e interferenze"
            : "Impact and interference",
        value: "impact",
      },
    ],
    [language]
  );

  const activeScenario =
    scenarios.find(
      (item) => item.value === scenario
    ) || scenarios[0];

  const scenarioProvinceProfiles = useMemo(() => {
    return provinceProfiles
      .map((profile) => {
        const scenarioEvents =
          activeScenario.causes.reduce(
            (total, cause) =>
              total +
              (profile.causeCounts?.[cause] || 0),
            0
          );
        const scenarioShare =
          profile.total > 0
            ? scenarioEvents / profile.total
            : 0;
        const scenarioBoost =
          activeScenario.value === "baseline"
            ? 0
            : Math.round(scenarioShare * 20);

        return {
          ...profile,
          scenarioBoost,
          scenarioEvents,
          scenarioScore: Math.min(
            100,
            profile.riskScore + scenarioBoost
          ),
          scenarioShare,
        };
      })
      .sort(
        (a, b) =>
          b.scenarioScore - a.scenarioScore
      );
  }, [activeScenario, provinceProfiles]);

  const alphabeticalProvinceProfiles = useMemo(
    () =>
      [...scenarioProvinceProfiles].sort((a, b) =>
        cleanDisplayText(a.territory).localeCompare(
          cleanDisplayText(b.territory),
          language === "it" ? "it" : "en",
          { sensitivity: "base" }
        )
      ),
    [language, scenarioProvinceProfiles]
  );

  const provinceRegistry = useMemo(
    () =>
      buildProvinceRegistry(provinceGeoFeatures).sort((a, b) =>
        cleanDisplayText(a.name).localeCompare(
          cleanDisplayText(b.name),
          language === "it" ? "it" : "en",
          { sensitivity: "base" }
        )
      ),
    [language, provinceGeoFeatures]
  );

  const scenarioMatrix = useMemo(() => {
    return scenarios
      .filter((item) => item.value !== "baseline")
      .map((item) => {
        const profilesForScenario =
          provinceProfiles
            .map((profile) => {
              const scenarioEvents =
                item.causes.reduce(
                  (total, cause) =>
                    total +
                    (profile.causeCounts?.[
                      cause
                    ] || 0),
                  0
                );
              const scenarioShare =
                profile.total > 0
                  ? scenarioEvents / profile.total
                  : 0;
              const scenarioBoost =
                Math.round(scenarioShare * 20);

              return {
                ...profile,
                scenarioBoost,
                scenarioEvents,
                scenarioScore: Math.min(
                  100,
                  profile.riskScore +
                    scenarioBoost
                ),
              };
            })
            .sort(
              (a, b) =>
                b.scenarioScore -
                a.scenarioScore
            );

        return {
          ...item,
          topProfiles:
            profilesForScenario.slice(0, 4),
        };
      });
  }, [provinceProfiles, scenarios]);

  const selectedProvinceRegistryItem =
    findProvinceInRegistry(
      provinceRegistry,
      projectLocation.validated
        ? projectLocation.derivedProvinceCode ||
            projectLocation.derivedProvince ||
            projectLocation.derivedProvinceName
        : selectedProvince
    ) ||
    findProvinceInRegistry(provinceRegistry, selectedProvince) ||
    provinceRegistry[0] ||
    null;

  const selectedProvinceName =
    selectedProvinceRegistryItem?.name ||
    selectedProvince ||
    "";
  const selectedProvinceCode =
    selectedProvinceRegistryItem?.code ||
    projectLocation.derivedProvinceCode ||
    "";

  const matchedSelectedProvinceProfile = useMemo(
    () =>
      scenarioProvinceProfiles.find((profile) =>
        selectedProvinceRegistryItem
          ? provinceMatchesValue(
              selectedProvinceRegistryItem,
              profile.territory
            )
          : normalizeProvinceKey(profile.territory) ===
            normalizeProvinceKey(selectedProvinceName)
      ) || null,
    [
      scenarioProvinceProfiles,
      selectedProvinceName,
      selectedProvinceRegistryItem,
    ]
  );

  const selectedProvinceProfile = useMemo(
    () =>
      matchedSelectedProvinceProfile || {
      avgSources: 0,
      causeCounts: {},
      exactLocations: 0,
      firstYear: null,
      injuries: 0,
      riskScore: null,
      scenarioBoost: null,
      scenarioEvents: 0,
      scenarioScore: null,
      scoreBreakdown: [],
      sourceTotal: 0,
      territory: selectedProvinceName,
      topCause: "unavailable",
      total: 0,
      totalCollapse: 0,
      triggered: 0,
      victims: 0,
      },
    [
      matchedSelectedProvinceProfile,
      selectedProvinceName,
    ]
  );
  const selectedProvinceHasArcusProfile =
    Boolean(matchedSelectedProvinceProfile);

  const sourceCountByEvent = useMemo(
    () => buildSourceCountByEvent(sources),
    [sources]
  );

  const sourcesByEventMap = useMemo(
    () =>
      sources.reduce((accumulator, source) => {
        if (!accumulator[source.event_id]) {
          accumulator[source.event_id] = [];
        }

        accumulator[source.event_id].push(source);

        return accumulator;
      }, {}),
    [sources]
  );

  const reliabilityByEvent = useMemo(
    () =>
      buildSourceReliabilityByEvent(
        events,
        sources
      ),
    [events, sources]
  );

  const vulnerabilityByEvent = useMemo(
    () =>
      buildVulnerabilityByEvent(
        events,
        reliabilityByEvent
      ),
    [events, reliabilityByEvent]
  );

  const selectedProvinceEvents = useMemo(() => {
    if (!selectedProvinceProfile) {
      return [];
    }

    return events
      .filter(
        (event) =>
          event.province ===
          selectedProvinceProfile.territory
      )
      .sort(
        (a, b) =>
          (a.collapse_severity === "TC" ? -1 : 1) -
            (b.collapse_severity === "TC"
              ? -1
              : 1) ||
          (Number(b.victims) || 0) -
            (Number(a.victims) || 0) ||
          (sourceCountByEvent[b.event_id] || 0) -
            (sourceCountByEvent[a.event_id] || 0)
      );
  }, [
    events,
    selectedProvinceProfile,
    sourceCountByEvent,
  ]);

  const manualAreaEvents = useMemo(() => {
    if (!manualAreaBounds) {
      return [];
    }

    return events
      .filter((event) => {
        const latitude = Number(event.latitude);
        const longitude = Number(event.longitude);

        return (
          Number.isFinite(latitude) &&
          Number.isFinite(longitude) &&
          latitude >= manualAreaBounds.south &&
          latitude <= manualAreaBounds.north &&
          longitude >= manualAreaBounds.west &&
          longitude <= manualAreaBounds.east
        );
      })
      .sort(
        (a, b) =>
          (a.collapse_severity === "TC" ? -1 : 1) -
            (b.collapse_severity === "TC"
              ? -1
              : 1) ||
          (Number(b.victims) || 0) -
            (Number(a.victims) || 0) ||
          (sourceCountByEvent[b.event_id] || 0) -
            (sourceCountByEvent[a.event_id] || 0)
      );
  }, [
    events,
    manualAreaBounds,
    sourceCountByEvent,
  ]);

  const manualAreaProvinces = useMemo(
    () =>
      [
        ...new Set(
          manualAreaEvents
            .map((event) => event.province)
            .filter(Boolean)
        ),
      ].sort(),
    [manualAreaEvents]
  );

  const workflowEvents =
    activeEntryPath !== 0 &&
    manualAreaBounds &&
    manualAreaEvents.length
      ? manualAreaEvents
      : selectedProvinceEvents;

  const selectedReliability = useMemo(
    () =>
      summarizeReliability(
        selectedProvinceEvents,
        reliabilityByEvent
      ),
    [
      selectedProvinceEvents,
      reliabilityByEvent,
    ]
  );

  const selectedVulnerability = useMemo(
    () =>
      summarizeVulnerability(
        selectedProvinceEvents,
        vulnerabilityByEvent
      ),
    [
      selectedProvinceEvents,
      vulnerabilityByEvent,
    ]
  );

  const workflowReliability = useMemo(
    () =>
      summarizeReliability(
        workflowEvents,
        reliabilityByEvent
      ),
    [
      workflowEvents,
      reliabilityByEvent,
    ]
  );

  const workflowVulnerability = useMemo(
    () =>
      summarizeVulnerability(
        workflowEvents,
        vulnerabilityByEvent
      ),
    [
      workflowEvents,
      vulnerabilityByEvent,
    ]
  );

  const selectedHazardExposure = useMemo(() => {
    if (!selectedProvinceProfile) {
      return null;
    }

    return hazardExposurePreview?.provinces?.find(
      (item) => {
        if (!selectedProvinceRegistryItem) {
          return (
            normalizeProvinceKey(item.province) ===
            normalizeProvinceKey(selectedProvinceProfile.territory)
          );
        }

        return provinceMatchesValue(
          selectedProvinceRegistryItem,
          item.province
        );
      }
    );
  }, [
    hazardExposurePreview,
    selectedProvinceProfile,
    selectedProvinceRegistryItem,
  ]);

  const workflowHazardExposure = useMemo(() => {
    if (!manualAreaProvinces.length) {
      return selectedHazardExposure;
    }

    const provinceHazards =
      hazardExposurePreview?.provinces?.filter(
        (item) =>
          manualAreaProvinces.includes(item.province)
      ) || [];
    const hazardGroups =
      hazardExposurePreview?.hazard_groups || [];

    const hazardIndex = {};

    hazardGroups.forEach((group) => {
      hazardIndex[group.key] = {
        external_layers: group.external_layers || [],
        key: group.key,
        label: group.label,
        matched_events: workflowEvents.filter(
          (event) =>
            (group.causes || []).includes(
              event.specific_cause
            )
        ).length,
        score: 0,
        share: workflowEvents.length
          ? workflowEvents.filter((event) =>
              (group.causes || []).includes(
                event.specific_cause
              )
            ).length / workflowEvents.length
          : 0,
      };
    });

    provinceHazards.forEach((province) => {
      (province.hazards || []).forEach((hazard) => {
        if (!hazardIndex[hazard.key]) {
          hazardIndex[hazard.key] = {
            external_layers:
              hazard.external_layers || [],
            key: hazard.key,
            label: hazard.label,
            matched_events: 0,
            score: 0,
            share: 0,
          };
        }

        hazardIndex[hazard.key].score = Math.max(
          hazardIndex[hazard.key].score,
          Number(hazard.score || 0)
        );
      });
    });

    const hazards = Object.values(hazardIndex).sort(
      (a, b) => b.score - a.score
    );

    return {
      dominant_hazard:
        hazards[0]?.key || "not available",
      hazards,
      province:
        manualAreaProvinces.join(", "),
    };
  }, [
    hazardExposurePreview,
    manualAreaProvinces,
    selectedHazardExposure,
    workflowEvents,
  ]);

  const assetRowsForScreening = useMemo(() => {
    const hasValue = (asset, keys) =>
      keys.some((key) => {
        const value = asset[key];
        return (
          value !== null &&
          value !== undefined &&
          String(value).trim() !== ""
        );
      });
    const validCoordinate = (asset, keys, min, max) => {
      const key = keys.find((item) => hasValue(asset, [item]));
      const value = key ? Number(String(asset[key]).replace(",", ".")) : NaN;

      return Number.isFinite(value) && value >= min && value <= max;
    };

    return assetRows.filter(
      (asset) =>
        hasValue(asset, ["bridge_id", "asset_id", "id", "code", "codice"]) &&
        validCoordinate(asset, ["latitude", "lat"], -90, 90) &&
        validCoordinate(asset, ["longitude", "lon", "lng"], -180, 180) &&
        hasValue(asset, ["province_declared", "province", "provincia"]) &&
        hasValue(asset, [
          "municipality_declared",
          "municipality",
          "comune",
        ])
    );
  }, [assetRows]);

  const assetScreening = useMemo(
    () =>
      buildAssetScreening(
        assetRowsForScreening,
        events,
        scenarioProvinceProfiles,
        vulnerabilityByEvent,
        hazardExposurePreview,
        reliabilityByEvent
      ),
    [
      assetRowsForScreening,
      events,
      scenarioProvinceProfiles,
      vulnerabilityByEvent,
      hazardExposurePreview,
      reliabilityByEvent,
    ]
  );
  const getEventEvidenceGrade = (event) =>
    reliabilityByEvent[event?.event_id]?.grade || "D";
  const getAssetEvidenceGrade = (item) =>
    item?.evidenceClass ||
    (item?.nearestEvent
      ? getEventEvidenceGrade(item.nearestEvent)
      : item?.comparableEvents?.length
        ? getEventEvidenceGrade(item.comparableEvents[0])
        : "D");

  const assetInventoryAudit = useMemo(() => {
    const total = assetRows.length;
    const hasValue = (asset, keys) =>
      keys.some((key) => {
        const value = asset[key];
        return (
          value !== null &&
          value !== undefined &&
          String(value).trim() !== ""
        );
      });
    const knownProvinceKeys = new Set(
      scenarioProvinceProfiles.map((profile) =>
        cleanDisplayText(profile.territory || "")
          .normalize("NFD")
          .replace(/[\u0300-\u036f]/g, "")
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, " ")
          .trim()
      )
    );
    const validCoordinate = (asset, keys, min, max) => {
      const key = keys.find((item) => hasValue(asset, [item]));
      const value = key ? Number(String(asset[key]).replace(",", ".")) : NaN;

      return Number.isFinite(value) && value >= min && value <= max;
    };
    const hasRequiredFields = (asset) =>
      hasValue(asset, ["bridge_id", "asset_id", "id", "code", "codice"]) &&
      validCoordinate(asset, ["latitude", "lat"], -90, 90) &&
      validCoordinate(asset, ["longitude", "lon", "lng"], -180, 180) &&
      hasValue(asset, ["province_declared", "province", "provincia"]) &&
      hasValue(asset, [
        "municipality_declared",
        "municipality",
        "comune",
      ]);
    const mandatory = assetRows.filter(hasRequiredFields).length;
    const blocked = Math.max(0, total - mandatory);
    const provinceWarnings = assetRows.filter((asset) => {
      const province =
        asset.province_declared || asset.province || asset.provincia || "";
      const key = cleanDisplayText(province)
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, " ")
        .trim();

      return key && !knownProvinceKeys.has(key);
    }).length;
    const coordinates = assetRows.filter(
      (asset) =>
        hasValue(asset, ["latitude", "lat"]) &&
        hasValue(asset, [
          "longitude",
          "lon",
          "lng",
        ])
    ).length;
    const territory = assetRows.filter(
      (asset) =>
        hasValue(asset, [
          "province",
          "provincia",
        ]) ||
        hasValue(asset, ["region", "regione"])
    ).length;
    const technical = assetRows.filter(
      (asset) =>
        hasValue(asset, [
          "structural_type",
          "structure",
          "typology",
          "tipologia",
        ]) ||
        hasValue(asset, [
          "material_type",
          "material",
          "materiale",
        ])
    ).length;
    const age = assetRows.filter((asset) =>
      hasValue(asset, [
        "construction_year",
        "year",
        "anno",
      ])
    ).length;
    const score = total
      ? Math.round(
          ((coordinates / total) * 0.32 +
            (territory / total) * 0.32 +
            (technical / total) * 0.22 +
            (age / total) * 0.14) *
            100
        )
      : 0;

    return {
      age,
      blocked,
      coordinates,
      mandatory,
      provinceWarnings,
      score,
      technical,
      territory,
      total,
      warnings: provinceWarnings,
    };
  }, [assetRows, scenarioProvinceProfiles]);

  const professionalAssetMapMarkers = useMemo(() => {
    const readAssetValue = (asset, keys) => {
      const key = keys.find(
        (item) =>
          asset[item] !== undefined &&
          asset[item] !== ""
      );

      return key ? asset[key] : "";
    };

    return assetScreening
      .map((item) => {
        const latitude = Number(
          String(
            readAssetValue(item.asset, [
              "latitude",
              "lat",
            ])
          ).replace(",", ".")
        );
        const longitude = Number(
          String(
            readAssetValue(item.asset, [
              "longitude",
              "lon",
              "lng",
            ])
          ).replace(",", ".")
        );

        if (
          !Number.isFinite(latitude) ||
          !Number.isFinite(longitude)
        ) {
          return null;
        }

        return {
          id: item.id,
          latitude,
          longitude,
          name: item.name,
          priority: item.priority,
          score: item.score,
          territory: item.territory,
        };
      })
      .filter(Boolean);
  }, [assetScreening]);

  const topAssetSimilarEvents = useMemo(
    () =>
      findAssetSimilarEvents(
        assetScreening[0],
        events,
        vulnerabilityByEvent,
        5
      ),
    [
      assetScreening,
      events,
      vulnerabilityByEvent,
    ]
  );

  const assetAttentionSummary = useMemo(() => {
    const summary = {
      batchOne: 0,
      batchThree: 0,
      batchTwo: 0,
      dominantHazard: "-",
      hazardCounts: [],
      immediate: 0,
      ordinary: 0,
      programmed: 0,
      sourceCount: 0,
    };

    assetScreening.forEach((item) => {
      if (item.attentionLevel === "Immediate attention") {
        summary.immediate += 1;
        if (item.actionTier === "Batch 1 - check first") {
          summary.batchOne += 1;
        } else if (item.actionTier === "Batch 2 - next immediate") {
          summary.batchTwo += 1;
        } else if (
          item.actionTier === "Batch 3 - complete immediate queue"
        ) {
          summary.batchThree += 1;
        }
      } else if (item.attentionLevel === "Programmed attention") {
        summary.programmed += 1;
      } else {
        summary.ordinary += 1;
      }

      item.comparableEvents.slice(0, 3).forEach((event) => {
        summary.sourceCount += sourceCountByEvent[event.event_id] || 0;
      });
    });

    summary.hazardCounts = countBy(
      assetScreening.map((item) => ({
        hazard: item.hazardProfileLabel || item.dominantHazard || "Contextual",
      })),
      "hazard"
    ).map(([label, value]) => ({ label, value }));
    summary.dominantHazard = summary.hazardCounts[0]?.label || "-";

    return summary;
  }, [assetScreening, sourceCountByEvent]);

  const path02DecisionMessage = useMemo(() => {
    const total = assetScreening.length;
    const dominant = assetAttentionSummary.dominantHazard;
    const firstBatch = assetScreening
      .filter((item) => item.actionTier === "Batch 1 - check first")
      .slice(0, 3)
      .map((item) => item.id)
      .join(", ");

    if (language === "it") {
      if (!total) {
        return "Carica un inventario ponti per generare una watchlist operativa fondata su esposizione territoriale e precedenti ARCUS.";
      }

      if (path02ReadingMode === "vulnerability_assessment") {
        const immediateShare = percentage(
          assetAttentionSummary.immediate,
          total
        );
        return `${immediateShare}% del portafoglio caricato ricade in attenzione immediata. Il profilo dominante e ${dominant}; il report descrive distribuzione del rischio, benchmark di contesto e gap dati prima delle decisioni di due diligence.`;
      }

      return `${assetAttentionSummary.immediate} asset richiedono attenzione immediata su ${total}. Il profilo dominante e ${dominant}; se le risorse sono limitate, partire dal Batch 1 (${firstBatch || "top score"}), poi completare gli altri asset immediati per score e contesto ARCUS.`;
    }

    if (!total) {
      return "Upload a bridge inventory to generate an operational watchlist grounded in territorial exposure and ARCUS precedents.";
    }

    if (path02ReadingMode === "vulnerability_assessment") {
      const immediateShare = percentage(
        assetAttentionSummary.immediate,
        total
      );
      return `${immediateShare}% of the uploaded portfolio falls in immediate attention. The dominant profile is ${dominant}; the report describes risk distribution, contextual benchmark and data gaps before due-diligence decisions.`;
    }

    return `${assetAttentionSummary.immediate} assets require immediate attention out of ${total}. The dominant profile is ${dominant}; if resources are constrained, start with Batch 1 (${firstBatch || "top score"}), then complete the remaining immediate assets by score and ARCUS context.`;
  }, [
    assetAttentionSummary,
    assetScreening,
    language,
    path02ReadingMode,
  ]);

  const selectedProvinceDrivers = useMemo(() => {
    if (!workflowEvents.length) {
      return {
        causes: [],
        materials: [],
        structures: [],
      };
    }

    return {
      causes: countBy(workflowEvents, "specific_cause")
        .slice(0, 3)
        .map(([label, value]) => ({ label, value })),
      materials: countBy(workflowEvents, "material_type")
        .slice(0, 3)
        .map(([label, value]) => ({ label, value })),
      structures: countBy(workflowEvents, "structural_type")
        .slice(0, 3)
        .map(([label, value]) => ({ label, value })),
    };
  }, [workflowEvents]);

  const priorityMunicipalities = useMemo(() => {
    const dominantCause = selectedProvinceDrivers.causes[0]?.label;

    return workflowEvents
      .filter(
        (event) =>
          event.collapse_severity === "TC" ||
          (dominantCause &&
            event.specific_cause === dominantCause)
      )
      .map((event) => event.municipality)
      .filter(Boolean)
      .filter(
        (municipality, index, all) =>
          all.indexOf(municipality) === index
      )
      .slice(0, 5);
  }, [selectedProvinceDrivers, workflowEvents]);

  const projectDesignFocus = useMemo(() => {
    const it = language === "it";
    const province =
      selectedProvinceProfile?.territory ||
      (it ? "provincia selezionata" : "selected province");
    const dominantCause =
      selectedProvinceDrivers.causes[0]?.label ||
      selectedProvinceProfile?.topCause ||
      (it ? "non classificata" : "unclassified");
    const dominantHazard =
      workflowHazardExposure?.dominant_hazard ||
      dominantCause;
    const driverText = String(dominantHazard || "").toLowerCase();
    const causeText = String(dominantCause || "").toLowerCase();
    const isHydraulic =
      driverText.includes("hydraulic") ||
      causeText.includes("hydraulic") ||
      causeText.includes("idraul");
    const contextLabels = it
      ? {
          bridge: "ponte",
          road: "attraversamento stradale",
          railway: "attraversamento ferroviario",
          urban: "infrastruttura urbana",
        }
      : {
          bridge: "Bridge",
          road: "Road Crossing",
          railway: "Railway Crossing",
          urban: "Urban Infrastructure",
        };
    const contextLabel =
      contextLabels[projectContext] || contextLabels.bridge;
    const clusters =
      priorityMunicipalities.length > 0
        ? priorityMunicipalities.join(", ")
        : province;
    const hydraulicFocus = it
      ? {
          bridge: [
            "Compatibilita idraulica preliminare",
            "Suscettibilita a scalzamento",
            "Esposizione di fondazioni, pile e spalle",
            "Dinamica dell'alveo e trasporto solido",
            "Scenari di piena, detriti e accessibilita ispettiva",
          ],
          road: [
            "Interruzione del collegamento in piena",
            "Capacita del drenaggio e smaltimento locale",
            "Tombini, attraversamenti minori e opere idrauliche secondarie",
            "Erosione di rilevati e scarpate",
            "Continuita stradale e accessi alternativi",
          ],
          railway: [
            "Continuita dell'esercizio ferroviario",
            "Stabilita di rilevati e sede ferroviaria",
            "Aperture idrauliche e luci libere",
            "Scalzamento in prossimita di supporti",
            "Conseguenze di interruzione del servizio",
          ],
          urban: [
            "Drenaggio locale e capacita di deflusso",
            "Sottopassi, attraversamenti minori e punti depressi",
            "Corridoi di propagazione della piena",
            "Interazione con aree costruite e reti esistenti",
            "Manutenzione e coordinamento con protezione civile",
          ],
        }
      : {
          bridge: [
            "Preliminary hydraulic compatibility",
            "Scour susceptibility",
            "Foundation, pier and abutment exposure",
            "Riverbed dynamics and sediment/debris transport",
            "Flood/debris scenarios and inspection accessibility",
          ],
          road: [
            "Flood-related road interruption",
            "Drainage capacity and local runoff",
            "Culverts, minor crossings and secondary hydraulic works",
            "Embankment and slope erosion",
            "Road continuity and alternative access",
          ],
          railway: [
            "Rail service continuity",
            "Embankment and track-bed stability",
            "Hydraulic openings and free spans",
            "Scour near supports",
            "Service-interruption consequences",
          ],
          urban: [
            "Local drainage and runoff capacity",
            "Underpasses, minor crossings and low points",
            "Flood-routing corridors",
            "Interaction with built-up areas and existing networks",
            "Maintenance and civil-protection coordination",
          ],
        };
    const fallbackFocus = it
      ? [
          "Coerenza tra precedenti storici e layer hazard pubblici",
          "Verifiche sito-specifiche coerenti con il driver dominante",
          "Lettura del pattern storico nella provincia",
          "Qualita e completezza delle fonti prima di decisioni istituzionali",
        ]
      : [
          "Consistency between historical precedents and public hazard layers",
          "Site-specific checks aligned with the dominant driver",
          "Historical-pattern reading inside the province",
          "Source quality and completeness before institutional decisions",
        ];
    const focusItems =
      isHydraulic && hydraulicFocus[projectContext]
        ? hydraulicFocus[projectContext]
        : fallbackFocus;
    const recommendations = isHydraulic
      ? it
        ? [
            "Usare la mappa Step 3 per identificare il segnale dominante Hydraulic.",
            "Leggere lo scenario storico concentrato documentato e usare mappa/appendice solo come riferimento ai casi.",
            "Richiedere il pacchetto tecnico minimo.",
            "Commissionare verifiche idrauliche e geotecniche sito-specifiche.",
            "Usare export CSV e GeoJSON per il coordinamento tecnico.",
          ]
        : [
            "Use the Step 3 exposure indicators to identify the dominant Hydraulic signal.",
            "Review the documented concentrated historical scenario and use the map/appendix only as case reference.",
            "Request the minimum technical data package.",
            "Commission site-specific hydraulic and geotechnical checks.",
            "Use CSV and GeoJSON exports for technical coordination.",
          ]
      : it
        ? [
            "Usare la mappa Step 3 per identificare il segnale dominante.",
            "Leggere il pattern storico documentato e usare i casi singoli come riferimento in mappa/appendice.",
            "Richiedere il pacchetto tecnico minimo.",
            "Commissionare verifiche sito-specifiche coerenti con il driver dominante.",
            "Usare export CSV e GeoJSON per il coordinamento tecnico.",
          ]
        : [
            "Use the Step 3 exposure indicators to identify the dominant territorial signal.",
            "Read the documented historical pattern and use individual cases as map/appendix references.",
            "Request the minimum technical data package.",
            "Commission site-specific checks aligned with the dominant driver.",
            "Use CSV and GeoJSON exports for technical coordination.",
          ];
    const paragraph = it
      ? `ARCUS reading: per la provincia di ${province}, il segnale ${dominantCause} non definisce una soluzione progettuale. Traduce evidenze storiche, hazard territoriali e pattern locali in campi di attenzione da verificare prima di progettazione, due diligence, ispezioni o pianificazione tecnica.`
      : `ARCUS reading: for the province of ${province}, the ${dominantCause} signal does not define a design solution. It translates historical evidence, territorial hazards and local patterns into attention fields to verify before design, due diligence, inspections or technical planning.`;

    return {
      clusters,
      contextLabel,
      dominantCause,
      dominantHazard,
      focusItems,
      isHydraulic,
      paragraph,
      recommendations,
    };
  }, [
    language,
    priorityMunicipalities,
    projectContext,
    selectedProvinceDrivers,
    selectedProvinceProfile,
    workflowHazardExposure,
  ]);

  const selectedRecommendations = useMemo(() => {
    if (!selectedProvinceProfile) {
      return [];
    }

    if (activeEntryPath === 0) {
      const strategies = path01MitigationIntelligence?.strategies || [];

      if (strategies.length) {
        return strategies.map((strategy) => {
          const investigation =
            strategy.investigation_priority?.[language] ||
            strategy.investigation_priority?.en ||
            strategy.strategy_id;
          const purpose =
            strategy.purpose?.[language] ||
            strategy.purpose?.en ||
            "";

          return [investigation, purpose].filter(Boolean).join(". ");
        });
      }

      if (
        path01MitigationIntelligence &&
        !["loading", "available", "limited_evidence"].includes(
          path01MitigationIntelligence.status
        )
      ) {
        return [
          language === "it"
            ? "Nessuna strategia automatica emessa: l'esposizione ufficiale o il supporto documentale non consentono una sintesi affidabile. E richiesta una valutazione tecnica sito-specifica."
            : "No automated strategy was issued: official exposure or documentary support is insufficient for a reliable synthesis. A site-specific technical assessment is required.",
        ];
      }

      return [];
    }

    if (projectDesignFocus.recommendations.length) {
      return projectDesignFocus.recommendations;
    }

    const highSeverity =
      percentage(
        workflowEvents.filter(
          (event) =>
            event.collapse_severity === "TC"
        ).length,
        workflowEvents.length || 1
      ) >= 50;
    const highTrigger =
      percentage(
        workflowEvents.filter((event) => event.triggered)
          .length,
        workflowEvents.length || 1
      ) >= 50;
    const weakEvidence =
      workflowReliability.average < 55;
    const dominantHazard =
      workflowHazardExposure?.dominant_hazard;
    const dominantCause =
      selectedProvinceDrivers.causes[0]?.label;
    const locationHint =
      manualAreaBounds
        ? manualAreaProvinces.length
          ? manualAreaProvinces.join(", ")
          : selectedProvinceProfile.territory
        : selectedProvinceProfile.territory;
    const comparableClusters = workflowEvents
      .filter(
        (event) =>
          event.collapse_severity === "TC" ||
          event.specific_cause === dominantCause
      )
      .map((event) => event.municipality)
      .filter(Boolean)
      .filter(
        (municipality, index, all) =>
          all.indexOf(municipality) === index
      )
      .slice(0, 5);
    const clusterText =
      comparableClusters.length > 0
        ? comparableClusters.join(", ")
        : locationHint;

    return [
      dominantHazard === "hydraulic"
        ? language === "it"
          ? `Per nuovi attraversamenti o interventi su ponti in ${locationHint}, avviare una revisione preliminare del contesto idraulico focalizzata su esposizione ad alluvione, configurazioni sensibili a scalzamento e precedenti idraulici vicini.`
          : `For new crossings or bridge interventions in ${locationHint}, start a preliminary hydraulic-context review focused on flood exposure, scour-sensitive configurations and nearby historical hydraulic failures.`
        : dominantHazard === "landslide"
          ? language === "it"
            ? `Per nuovi attraversamenti o interventi in ${locationHint}, integrare gia in fase preliminare verifiche geotecniche e di stabilita dei versanti nelle aree con precedenti o overlay franosi rilevanti.`
            : `For new crossings or interventions in ${locationHint}, include geotechnical and slope-stability checks from the preliminary phase where precedents or landslide overlays are relevant.`
          : language === "it"
            ? `Usare il briefing come pacchetto di screening preliminare per decidere dove avviare indagini sito-specifiche in ${locationHint}.`
            : `Use this briefing as a preliminary screening package to decide where site-specific investigations should start in ${locationHint}.`,
      highSeverity
        ? language === "it"
          ? `Confrontare il nuovo intervento con i collassi totali documentati e con i cluster ricorrenti in ${clusterText}.`
          : `Compare the planned intervention with documented total-collapse cases and recurrent clusters in ${clusterText}.`
        : language === "it"
          ? `Leggere i pattern locali di collasso parziale insieme ai layer hazard pubblici prima di chiudere le scelte preliminari di tracciato o configurazione.`
          : `Read local partial-collapse patterns together with public hazard layers before freezing preliminary alignment or configuration choices.`,
      highTrigger
        ? language === "it"
          ? "Usare i layer WMS pubblici come primo screening territoriale, poi commissionare verifiche idrauliche, geotecniche o sismiche sito-specifiche dove la densita dei precedenti e alta."
          : "Use public WMS layers as first-level territorial screening, then commission site-specific hydraulic, geotechnical or seismic checks where historical precedent density is high."
        : language === "it"
          ? "Integrare tipologia strutturale, materiale e anno di costruzione appena disponibili per trasformare lo screening territoriale in valutazione asset-specifica."
          : "Add structure type, material and construction year as soon as available to turn territorial screening into asset-specific assessment.",
      weakEvidence
        ? language === "it"
          ? "Rafforzare la copertura documentale prima di usare il briefing in contesti istituzionali o decisionali."
          : "Strengthen documentary coverage before using this briefing in institutional or decision-making contexts."
        : language === "it"
          ? "Usare questo report come pacchetto source-backed per riunioni di progettazione preliminare, due diligence documentale o pianificazione di indagini tecniche."
          : "Use this report as a source-backed package for early design meetings, documentary due diligence or technical investigation planning.",
    ];
  }, [
    activeEntryPath,
    language,
    manualAreaBounds,
    manualAreaProvinces,
    projectDesignFocus,
    path01MitigationIntelligence,
    selectedProvinceDrivers,
    selectedProvinceProfile,
    workflowEvents,
    workflowHazardExposure,
    workflowReliability,
  ]);

  const selectedActionMatrix = useMemo(() => {
    return workflowEvents.reduce(
      (matrix, event) => {
        const sourceCount =
          sourceCountByEvent[event.event_id] || 0;
        const reliability =
          reliabilityByEvent[event.event_id];
        const vulnerability =
          vulnerabilityByEvent[event.event_id];
        const humanImpact =
          Number(event.victims) > 0 ||
          Number(event.injuries) > 0;

        if (
          event.collapse_severity === "TC" ||
          humanImpact ||
          vulnerability?.className === "Critical"
        ) {
          matrix.immediate.push(event);
        } else if (
          sourceCount < 3 ||
          reliability?.grade === "D"
        ) {
          matrix.evidence.push(event);
        } else {
          matrix.monitoring.push(event);
        }

        return matrix;
      },
      {
        evidence: [],
        immediate: [],
        monitoring: [],
      }
    );
  }, [
    workflowEvents,
    reliabilityByEvent,
    vulnerabilityByEvent,
    sourceCountByEvent,
  ]);

  const referenceEvent =
    selectedActionMatrix.immediate[0] ||
    workflowEvents[0];

  const selectedSimilarEvents = useMemo(
    () =>
      findSimilarEvents(
        referenceEvent,
        events,
        5
      ),
    [events, referenceEvent]
  );

  const historicalAnalogueOutcomes = useMemo(() => {
    const countValues = (field) => Object.entries(
      selectedSimilarEvents.reduce((index, event) => {
        const value = event.hydraulic_intelligence?.[field] || "unspecified";
        index[value] = (index[value] || 0) + 1;
        return index;
      }, {})
    ).sort((left, right) => right[1] - left[1]);

    return {
      analogueCount: selectedSimilarEvents.length,
      components: countValues("component_involved"),
      evidence: countValues("evidence_level"),
      processes: countValues("failure_process"),
      sourceCount: selectedSimilarEvents.reduce(
        (total, event) => total + (sourceCountByEvent[event.event_id] || 0),
        0
      ),
    };
  }, [selectedSimilarEvents, sourceCountByEvent]);

  const monitoringSignals = useMemo(() => {
    return selectedProvinceEvents
      .map((event) => {
        const reliability =
          reliabilityByEvent[event.event_id];
        const vulnerability =
          vulnerabilityByEvent[event.event_id];
        const humanImpact =
          Number(event.victims) > 0 ||
          Number(event.injuries) > 0;
        const rules = [];

        if (
          vulnerability?.className === "Critical"
        ) {
          rules.push("critical vulnerability");
        }

        if (
          vulnerability?.className === "High"
        ) {
          rules.push("high vulnerability");
        }

        if (
          event.collapse_severity === "TC"
        ) {
          rules.push("total collapse precedent");
        }

        if (event.triggered) {
          rules.push("triggered event");
        }

        if (reliability?.grade === "D") {
          rules.push("weak evidence");
        }

        if (humanImpact) {
          rules.push("human impact");
        }

        const level =
          vulnerability?.className === "Critical" ||
          humanImpact ||
          event.collapse_severity === "TC"
            ? "Critical"
            : vulnerability?.className === "High" ||
                reliability?.grade === "D"
              ? "High"
              : event.triggered
                ? "Watch"
                : "Monitor";

        return {
          event,
          level,
          reliability,
          rules,
          vulnerability,
        };
      })
      .filter((signal) => signal.rules.length)
      .sort((a, b) => {
        const rank = {
          Critical: 4,
          High: 3,
          Watch: 2,
          Monitor: 1,
        };

        return rank[b.level] - rank[a.level];
      });
  }, [
    selectedProvinceEvents,
    reliabilityByEvent,
    vulnerabilityByEvent,
  ]);

  const monitoringRuleCards = useMemo(() => {
    const countRule = (rule) =>
      monitoringSignals.filter((signal) =>
        signal.rules.includes(rule)
      ).length;

    return [
      [
        "Critical vulnerability",
        countRule("critical vulnerability"),
      ],
      [
        "Total collapse precedents",
        countRule("total collapse precedent"),
      ],
      [
        "Triggered events",
        countRule("triggered event"),
      ],
      [
        "Weak evidence",
        countRule("weak evidence"),
      ],
    ];
  }, [monitoringSignals]);

  const nationalBenchmark = useMemo(() => {
    const total = events.length || 1;
    const totalCollapse =
      events.filter(
        (event) =>
          event.collapse_severity === "TC"
      ).length;
    const triggered =
      events.filter((event) => event.triggered)
        .length;
    const humanImpact =
      events.filter(
        (event) =>
          Number(event.victims) > 0 ||
          Number(event.injuries) > 0
      ).length;
    const reliabilitySummary =
      summarizeReliability(
        events,
        reliabilityByEvent
      );
    const vulnerabilitySummary =
      summarizeVulnerability(
        events,
        vulnerabilityByEvent
      );

    return {
      avgSources:
        sources.length / Math.max(events.length, 1),
      humanImpactShare: percentage(
        humanImpact,
        total
      ),
      totalCollapseShare: percentage(
        totalCollapse,
        total
      ),
      triggeredShare: percentage(
        triggered,
        total
      ),
      reliabilityShare:
        reliabilitySummary.institutionalShare,
      vulnerabilityShare: percentage(
        vulnerabilitySummary.highOrCritical,
        total
      ),
    };
  }, [
    events,
    sources,
    reliabilityByEvent,
    vulnerabilityByEvent,
  ]);

  const selectedBenchmark = useMemo(() => {
    if (!selectedProvinceProfile) {
      return [];
    }

    const humanImpactEvents =
      selectedProvinceEvents.filter(
        (event) =>
          Number(event.victims) > 0 ||
          Number(event.injuries) > 0
      ).length;

    const rows = [
      {
        key: "tc",
        label: "Total collapse share",
        national:
          nationalBenchmark.totalCollapseShare,
        selected: percentage(
          selectedProvinceProfile.totalCollapse,
          selectedProvinceProfile.total
        ),
        suffix: "%",
      },
      {
        key: "triggered",
        label: "Triggered-event share",
        national:
          nationalBenchmark.triggeredShare,
        selected: percentage(
          selectedProvinceProfile.triggered,
          selectedProvinceProfile.total
        ),
        suffix: "%",
      },
      {
        key: "sources",
        label: "Sources per event",
        national: Number(
          nationalBenchmark.avgSources.toFixed(1)
        ),
        selected: Number(
          selectedProvinceProfile.avgSources.toFixed(
            1
          )
        ),
        suffix: "",
      },
      {
        key: "impact",
        label: "Human-impact events",
        national:
          nationalBenchmark.humanImpactShare,
        selected: percentage(
          humanImpactEvents,
          selectedProvinceProfile.total
        ),
        suffix: "%",
      },
      {
        key: "reliability",
        label: copy.reliabilityBenchmark,
        national:
          nationalBenchmark.reliabilityShare,
        selected:
          selectedReliability.institutionalShare,
        suffix: "%",
      },
      {
        key: "vulnerability",
        label: copy.vulnerabilityBenchmark,
        national:
          nationalBenchmark.vulnerabilityShare,
        selected: percentage(
          selectedVulnerability.highOrCritical,
          selectedProvinceProfile.total
        ),
        suffix: "%",
      },
    ];

    return rows.map((row) => {
      const delta = Number(
        (row.selected - row.national).toFixed(1)
      );
      const status =
        Math.abs(delta) < 2
          ? "aligned"
          : delta > 0
            ? "above"
            : "below";

      return {
        ...row,
        delta,
        status,
      };
    });
  }, [
    nationalBenchmark,
    copy.reliabilityBenchmark,
    copy.vulnerabilityBenchmark,
    selectedProvinceEvents,
    selectedProvinceProfile,
    selectedReliability,
    selectedVulnerability,
  ]);

  const printProfessionalReport = () => {
    void downloadReportPdf("full");
  };

  const escapeHtml = (value) =>
    cleanDisplayText(value)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");

  const titleCaseLabel = (value) =>
    cleanDisplayText(value || "")
      .replace(/[_-]+/g, " ")
      .replace(/\s+/g, " ")
      .trim()
      .replace(/\b\w/g, (letter) => letter.toUpperCase());

  const driverDisplayLabel = (value) =>
    titleCaseLabel(String(value || "").replace(/\s*exposure\s*$/i, ""));

  const exportRowsAsCsv = (
    filename,
    columns,
    rows
  ) => {
    const escape = (value) =>
      `"${String(value ?? "").replaceAll(
        '"',
        '""'
      )}"`;
    const csv = [
      "\uFEFFsep=;",
      columns.join(";"),
      ...rows.map((row) =>
        columns
          .map((column) => escape(row[column]))
          .join(";")
      ),
    ].join("\n");

    downloadFile(filename, csv);
  };

  const waitForReportMapFrame = (
    iframe,
    { requireTiles = false, timeoutMs = 16000 } = {}
  ) =>
    new Promise((resolve, reject) => {
      const startedAt = Date.now();
      const checkReady = () => {
        const frameDocument = iframe.contentDocument;
        const hasLoadedTiles =
          frameDocument?.querySelectorAll(".leaflet-tile-loaded")
            .length > 0;
        const hasVectorMap =
          frameDocument?.querySelector(
            ".leaflet-overlay-pane svg path, .leaflet-marker-pane img, .leaflet-marker-icon"
          );

        if (
          frameDocument?.querySelector(
            ".atlas-map-export-ready"
          ) &&
          (requireTiles ? hasLoadedTiles : hasLoadedTiles || hasVectorMap)
        ) {
          window.setTimeout(resolve, 900);
          return;
        }

        if (Date.now() - startedAt > timeoutMs) {
          reject(
            new Error(
              "ARCUS report map export timed out"
            )
          );
          return;
        }

        window.setTimeout(checkReady, 180);
      };

      checkReady();
    });

  const capturePath01ReportMapImageAttempt = async ({
    localTiles = true,
    timeoutMs = 16000,
  } = {}) => {
    if (
      typeof window === "undefined" ||
      !selectedProvinceProfile
    ) {
      return "";
    }

    const territory =
      activeEntryPath !== 0 && manualAreaBounds
        ? manualAreaLabel
        : selectedProvinceProfile.territory;
    const mapUrl = `${window.location.origin}/professional/atlas-export/path01?province=${encodeURIComponent(territory)}&context=${encodeURIComponent(selectedProjectContext)}&clean=1&embed=1&localTiles=${localTiles ? "1" : "0"}`;
    const iframe = document.createElement("iframe");

    iframe.setAttribute(
      "title",
      "ARCUS report map raster export"
    );
    iframe.style.position = "fixed";
    iframe.style.left = "0";
    iframe.style.top = "0";
    iframe.style.width = "900px";
    iframe.style.height = "760px";
    iframe.style.border = "0";
    iframe.style.opacity = "0";
    iframe.style.pointerEvents = "none";
    iframe.style.zIndex = "-1";
    iframe.src = mapUrl;
    document.body.appendChild(iframe);

    try {
      await waitForReportMapFrame(iframe, {
        requireTiles: true,
        timeoutMs,
      });
      iframe.contentWindow?.dispatchEvent(
        new Event("resize")
      );
      await new Promise((resolve) =>
        window.setTimeout(resolve, 900)
      );

      const mapNode =
        iframe.contentDocument?.querySelector(
          "#atlas-export-map"
        );

      if (!mapNode) {
        return "";
      }

      const toPng = await loadToPng();

      return await toPng(mapNode, {
        backgroundColor: "#f3f1ea",
        cacheBust: !localTiles,
        height: 760,
        pixelRatio: 2,
        width: 900,
      });
    } catch (error) {
      console.warn(
        `ARCUS map PNG export failed (${localTiles ? "local" : "remote"} tiles)`,
        error
      );
      return "";
    } finally {
      iframe.remove();
    }
  };

  const capturePath01ReportMapImage = async () => {
    const localImage = await capturePath01ReportMapImageAttempt({
      localTiles: true,
      timeoutMs: 6500,
    });

    if (localImage) {
      return localImage;
    }

    return capturePath01ReportMapImageAttempt({
      localTiles: false,
      timeoutMs: 18000,
    });
  };

  const captureCurrentProfessionalMapImage = async () => {
    if (typeof document === "undefined") {
      return "";
    }

    const mapNode = document.querySelector(
      "#professional-map .platform-map-preview-shell"
    );

    if (!mapNode) {
      return "";
    }

    try {
      await new Promise((resolve) =>
        window.setTimeout(resolve, 500)
      );

      const toPng = await loadToPng();

      return await toPng(mapNode, {
        backgroundColor: "#ffffff",
        cacheBust: true,
        pixelRatio: 1.6,
      });
    } catch (error) {
      console.warn("ARCUS current map export failed", error);
      return "";
    }
  };

  const createFallbackPath01MapImage = async () => {
    if (
      typeof window === "undefined" ||
      !selectedProvinceProfile
    ) {
      return "";
    }

    try {
      const territory =
        activeEntryPath !== 0 && manualAreaBounds
          ? manualAreaLabel
          : selectedProvinceProfile.territory;
      const geoJson = await fetch(
        "/data/geo/italy-provinces.geojson"
      ).then((response) => response.json());
      const selectedKey = normalizeProvinceKey(territory);
      const feature = geoJson?.features?.find((item) => {
        const properties = item?.properties || {};
        return [
          properties.den_uts,
          properties.den_cm,
          properties.den_prov,
          properties.sigla,
        ].some(
          (value) =>
            normalizeProvinceKey(value) === selectedKey
        );
      });

      const rings = [];
      const collectRings = (coordinates) => {
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

        coordinates.forEach(collectRings);
      };

      collectRings(feature?.geometry?.coordinates);

      const fallbackEvents = workflowEvents
        .map((event) => ({
          latitude: Number(event.latitude),
          longitude: Number(event.longitude),
        }))
        .filter(
          (point) =>
            Number.isFinite(point.latitude) &&
            Number.isFinite(point.longitude)
        );
      const geometryPoints = rings.flat();
      const boundsPoints = [
        ...geometryPoints.map((point) => ({
          longitude: Number(point[0]),
          latitude: Number(point[1]),
        })),
        ...fallbackEvents,
      ].filter(
        (point) =>
          Number.isFinite(point.latitude) &&
          Number.isFinite(point.longitude)
      );

      if (!boundsPoints.length) {
        return "";
      }

      const bounds = {
        east: Math.max(
          ...boundsPoints.map((point) => point.longitude)
        ),
        north: Math.max(
          ...boundsPoints.map((point) => point.latitude)
        ),
        south: Math.min(
          ...boundsPoints.map((point) => point.latitude)
        ),
        west: Math.min(
          ...boundsPoints.map((point) => point.longitude)
        ),
      };
      const canvas = document.createElement("canvas");
      const width = 900;
      const height = 760;
      const padding = 58;
      const context = canvas.getContext("2d");

      canvas.width = width * 2;
      canvas.height = height * 2;

      if (!context) {
        return "";
      }

      context.scale(2, 2);
      context.fillStyle = "#f3f1ea";
      context.fillRect(0, 0, width, height);

      for (let index = 0; index < 9; index += 1) {
        context.strokeStyle =
          index % 2 === 0
            ? "rgba(143,111,61,0.08)"
            : "rgba(63,107,120,0.07)";
        context.lineWidth = 1;
        context.beginPath();
        context.moveTo(0, 80 + index * 78);
        context.bezierCurveTo(
          260,
          40 + index * 82,
          520,
          130 + index * 70,
          width,
          70 + index * 78
        );
        context.stroke();
      }

      const lonSpan = Math.max(bounds.east - bounds.west, 0.08);
      const latSpan = Math.max(bounds.north - bounds.south, 0.08);
      const scale = Math.min(
        (width - padding * 2) / lonSpan,
        (height - padding * 2) / latSpan
      );
      const drawWidth = lonSpan * scale;
      const drawHeight = latSpan * scale;
      const offsetX = (width - drawWidth) / 2;
      const offsetY = (height - drawHeight) / 2;
      const project = (longitude, latitude) => ({
        x: offsetX + (longitude - bounds.west) * scale,
        y: offsetY + (bounds.north - latitude) * scale,
      });

      if (rings.length) {
        context.fillStyle = "rgba(196,144,64,0.10)";
        context.strokeStyle = "#8f6f3d";
        context.lineWidth = 3;
        rings.forEach((ring) => {
          context.beginPath();
          ring.forEach((point, index) => {
            const projected = project(
              Number(point[0]),
              Number(point[1])
            );

            if (index === 0) {
              context.moveTo(projected.x, projected.y);
              return;
            }

            context.lineTo(projected.x, projected.y);
          });
          context.closePath();
          context.fill();
          context.stroke();
        });
      }

      fallbackEvents.forEach((event, index) => {
        const projected = project(event.longitude, event.latitude);
        context.beginPath();
        context.fillStyle = "rgba(28,30,30,0.72)";
        context.arc(projected.x, projected.y, 12, 0, Math.PI * 2);
        context.fill();
        context.strokeStyle = "rgba(255,255,255,0.88)";
        context.lineWidth = 2;
        context.stroke();
        context.fillStyle = "#ffffff";
        context.font = "700 9px Arial, sans-serif";
        context.textAlign = "center";
        context.textBaseline = "middle";
        context.fillText(String(index + 1), projected.x, projected.y);
      });

      context.fillStyle = "#8f6f3d";
      context.font = "800 15px Arial, sans-serif";
      context.textAlign = "left";
      context.textBaseline = "alphabetic";
      context.fillText(
        `${cleanDisplayText(territory).toUpperCase()} / ARCUS PROVINCE EXTRACT`,
        28,
        height - 24
      );

      return canvas.toDataURL("image/png");
    } catch (error) {
      console.warn("ARCUS fallback map export failed", error);
      return "";
    }
  };

  const createFallbackPath02AssetMapImage = async ({
    numbered = true,
    markers = professionalAssetMapMarkers,
  } = {}) => {
    if (
      typeof document === "undefined" ||
      !markers.length
    ) {
      return "";
    }

    try {
      const points = markers
        .map((asset) => ({
          ...asset,
          latitude: Number(asset.latitude),
          longitude: Number(asset.longitude),
        }))
        .filter(
          (asset) =>
            Number.isFinite(asset.latitude) &&
            Number.isFinite(asset.longitude)
        );

      if (!points.length) {
        return "";
      }

      const width = 900;
      const height = 760;
      const canvas = document.createElement("canvas");
      const context = canvas.getContext("2d");

      canvas.width = width * 2;
      canvas.height = height * 2;

      if (!context) {
        return "";
      }

      context.scale(2, 2);
      context.fillStyle = "#f3f1ea";
      context.fillRect(0, 0, width, height);

      const rawBounds = {
        east: Math.max(...points.map((point) => point.longitude)),
        north: Math.max(...points.map((point) => point.latitude)),
        south: Math.min(...points.map((point) => point.latitude)),
        west: Math.min(...points.map((point) => point.longitude)),
      };
      const lonSpan = Math.max(rawBounds.east - rawBounds.west, 0.12);
      const latSpan = Math.max(rawBounds.north - rawBounds.south, 0.12);
      const bounds = {
        east: rawBounds.east + lonSpan * 0.18,
        north: rawBounds.north + latSpan * 0.2,
        south: rawBounds.south - latSpan * 0.2,
        west: rawBounds.west - lonSpan * 0.18,
      };
      const mercatorX = (longitude, zoom) =>
        ((longitude + 180) / 360) * 256 * 2 ** zoom;
      const mercatorY = (latitude, zoom) => {
        const clampedLat = Math.max(
          -85.05112878,
          Math.min(85.05112878, latitude)
        );
        const rad = (clampedLat * Math.PI) / 180;

        return (
          ((1 -
            Math.log(Math.tan(rad) + 1 / Math.cos(rad)) /
              Math.PI) /
            2) *
          256 *
          2 ** zoom
        );
      };
      const zoom = (() => {
        for (let candidate = 11; candidate >= 6; candidate -= 1) {
          const pixelWidth =
            mercatorX(bounds.east, candidate) -
            mercatorX(bounds.west, candidate);
          const pixelHeight =
            mercatorY(bounds.south, candidate) -
            mercatorY(bounds.north, candidate);

          if (pixelWidth <= width - 80 && pixelHeight <= height - 100) {
            return candidate;
          }
        }

        return 6;
      })();
      const centerX =
        (mercatorX(bounds.east, zoom) + mercatorX(bounds.west, zoom)) /
        2;
      const centerY =
        (mercatorY(bounds.north, zoom) + mercatorY(bounds.south, zoom)) /
        2;
      const viewport = {
        left: centerX - width / 2,
        top: centerY - height / 2,
      };
      const loadTile = (tileX, tileY) =>
        new Promise((resolve) => {
          const image = new Image();

          image.onload = () => resolve(image);
          image.onerror = () => resolve(null);
          image.src = `/data/map-tiles/voyager/${zoom}/${tileX}/${tileY}.png`;
        });
      const tileMinX = Math.floor(viewport.left / 256);
      const tileMaxX = Math.floor((viewport.left + width) / 256);
      const tileMinY = Math.floor(viewport.top / 256);
      const tileMaxY = Math.floor((viewport.top + height) / 256);
      const tileJobs = [];

      for (let tileX = tileMinX; tileX <= tileMaxX; tileX += 1) {
        for (let tileY = tileMinY; tileY <= tileMaxY; tileY += 1) {
          tileJobs.push({ tileX, tileY, image: loadTile(tileX, tileY) });
        }
      }

      const loadedTiles = await Promise.all(
        tileJobs.map(async (tile) => ({
          ...tile,
          image: await tile.image,
        }))
      );

      loadedTiles.forEach((tile) => {
        if (!tile.image) {
          return;
        }

        context.drawImage(
          tile.image,
          tile.tileX * 256 - viewport.left,
          tile.tileY * 256 - viewport.top,
          256,
          256
        );
      });

      if (!loadedTiles.some((tile) => tile.image)) {
        for (let index = 0; index < 9; index += 1) {
          context.strokeStyle =
            index % 2 === 0
              ? "rgba(143,111,61,0.08)"
              : "rgba(63,107,120,0.07)";
          context.lineWidth = 1;
          context.beginPath();
          context.moveTo(0, 80 + index * 78);
          context.bezierCurveTo(
            260,
            40 + index * 82,
            520,
            130 + index * 70,
            width,
            70 + index * 78
          );
          context.stroke();
        }
      }

      const project = (longitude, latitude) => ({
        x: mercatorX(longitude, zoom) - viewport.left,
        y: mercatorY(latitude, zoom) - viewport.top,
      });

      points.forEach((asset, index) => {
        const projected = project(asset.longitude, asset.latitude);

        context.beginPath();
        context.fillStyle =
          asset.priority === "Immediate attention"
            ? "rgba(137,53,38,0.88)"
            : asset.priority === "Programmed attention"
              ? "rgba(196,144,64,0.88)"
              : "rgba(63,107,120,0.86)";
        context.arc(projected.x, projected.y, 13, 0, Math.PI * 2);
        context.fill();
        context.strokeStyle = "rgba(255,255,255,0.95)";
        context.lineWidth = 3;
        context.stroke();
        if (numbered) {
          context.fillStyle = "#ffffff";
          context.font = "800 9px Arial, sans-serif";
          context.textAlign = "center";
          context.textBaseline = "middle";
          context.fillText(String(index + 1), projected.x, projected.y);
        }
      });

      context.fillStyle = "rgba(255,255,255,0.90)";
      context.fillRect(20, height - 58, 450, 34);
      context.fillStyle = "#8f6f3d";
      context.font = "800 14px Arial, sans-serif";
      context.textAlign = "left";
      context.textBaseline = "alphabetic";
      context.fillText(
        `${assetSession.fileName || "PATH 02 ASSET INVENTORY"} / ARCUS ASSET MAP`,
        32,
        height - 36
      );

      return canvas.toDataURL("image/png");
    } catch (error) {
      console.warn("ARCUS Path 02 fallback map export failed", error);
      return "";
    }
  };

  const buildProfessionalReportHtml = ({
    mapImage = "",
    variant = "full",
  } = {}) => {
    if (!selectedProvinceProfile) {
      return "";
    }

    const it = language === "it";
    const isBrief = variant === "brief";
    const isPath01 = activeEntryPath === 0;
    const scoreSource =
      selectedProvinceProfile.scenarioScore ??
      selectedProvinceProfile.riskScore ??
      null;
    const score = Number.isFinite(Number(scoreSource))
      ? Number(scoreSource)
      : null;
    const scoreLabel = Number.isFinite(score) ? String(score) : "N/A";
    const today = new Date().toLocaleDateString("it-IT");
    const provinceContext = {
      areaLabel: selectedProvinceProfile.territory,
      generatedOn: today,
      geometrySource: it
        ? "Confine amministrativo provinciale"
        : "Administrative provincial boundary",
      projectContext: selectedProjectContext,
      provinceCode: selectedProvinceProfile.province_code || "",
      region:
        selectedProvinceEvents.find(Boolean)?.region ||
        selectedProvinceProfile.region ||
        "-",
      selectionType: "Province",
      spatialLevel: it
        ? "Livello provinciale"
        : "Province level",
    };
    const reportAreaLabel = isPath01
      ? provinceContext.areaLabel
      : manualAreaLabel;
    const provinceList = isPath01
      ? provinceContext.areaLabel
      : manualAreaBounds
        ? manualAreaProvinces.join(", ") || reportAreaLabel
        : selectedProvinceProfile.territory;

    const projectPointReportText =
      isPath01 && projectLocation.validated
        ? it
          ? ` Punto progetto: ${formatExposureCoordinate(projectLocation.latitude)}, ${formatExposureCoordinate(projectLocation.longitude)}.`
          : ` Project point: ${formatExposureCoordinate(projectLocation.latitude)}, ${formatExposureCoordinate(projectLocation.longitude)}.`
        : "";
    const arcusProfileCaveat =
      isPath01 && !selectedProvinceHasArcusProfile
        ? " No documented cases in the current ARCUS release. This does not imply absence of territorial hazard."
        : "";
    const reportAreaDescription = isPath01
      ? `${provinceContext.areaLabel}: ${selectedProvinceProfile.total} ${it ? "eventi ARCUS" : "ARCUS events"}, ${selectedProvinceProfile.sourceTotal} ${it ? "fonti documentate" : "documented sources"}. ${it ? "Meccanismo dominante" : "Dominant mechanism"}: ${selectedProvinceProfile.topCause}. ${it ? "Livello spaziale" : "Spatial level"}: ${provinceContext.spatialLevel}.${projectPointReportText}${arcusProfileCaveat}`
      : manualAreaBounds
        ? `${manualAreaEvents.length} ${it ? "eventi ARCUS nell'area selezionata" : "ARCUS events inside the selected area"} - ${it ? "Province" : "Provinces"}: ${provinceList}. ${it ? "Coordinate" : "Bounds"}: N ${manualAreaBounds.north.toFixed(3)}, S ${manualAreaBounds.south.toFixed(3)}, E ${manualAreaBounds.east.toFixed(3)}, W ${manualAreaBounds.west.toFixed(3)}.`
        : `${selectedProvinceProfile.territory}: ${selectedProvinceProfile.total} ${it ? "eventi ARCUS" : "ARCUS events"}, ${selectedProvinceProfile.sourceTotal} ${it ? "fonti documentate" : "documented sources"}. ${it ? "Meccanismo dominante" : "Dominant mechanism"}: ${selectedProvinceProfile.topCause}.`;

    const severityLabel = (code) =>
      ({
        TC: it ? "Crollo Totale" : "Total Collapse",
        PC: it ? "Crollo Parziale" : "Partial Collapse",
        SC: it ? "Compromissione Strutturale" : "Structural Compromise",
      })[code] || code;

    const classPriority = (value) => {
      const numericValue = Number(value);

      if (!Number.isFinite(numericValue)) {
        return it ? "Non disponibile" : "Unavailable";
      }

      if (numericValue >= 75) {
        return it ? "High attention" : "High attention";
      }

      if (numericValue >= 55) {
        return it ? "Moderate attention" : "Moderate attention";
      }

      return it ? "Low attention" : "Low attention";
    };

    const evidenceClass = (value) => {
      if (value >= 85) {
        return it ? "Very high" : "Very high";
      }

      if (value >= 70) {
        return it ? "High" : "High";
      }

      if (value >= 50) {
        return it ? "Medium" : "Medium";
      }

      return it ? "Low" : "Low";
    };

    const attentionClass = (value) => {
      if (value >= 80) {
        return it ? "Critical" : "Critical";
      }

      if (value >= 65) {
        return it ? "High" : "High";
      }

      if (value >= 45) {
        return it ? "Medium" : "Medium";
      }

      return it ? "Low" : "Low";
    };

    const reportHazardLabel = (label) =>
      label === "Structural vulnerability exposure"
        ? it
          ? "Structural Vulnerability Exposure"
          : "Structural Vulnerability Exposure"
        : label;

    const validityText = (value, fallback = "-") =>
      value === null ||
      value === undefined ||
      value === "" ||
      (typeof value === "number" && !Number.isFinite(value))
        ? fallback
        : value;
    const sectionHeading = (number, label) =>
      `<h2><span class="section-number">${number}</span>${escapeHtml(label)}</h2>`;
    const normalizeReportText = (value) =>
      String(value || "")
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, " ")
        .trim();
    const selectedAinopBridgeIndex =
      ainopBridgeIndex?.provinces?.find(
        (item) =>
          normalizeReportText(item.province) ===
          normalizeReportText(reportAreaLabel)
      );
    const collapseRateNumerator =
      selectedAinopBridgeIndex?.numerator_count ??
      selectedAinopBridgeIndex?.arcus_cases ??
      workflowEvents.length;
    const collapseRateNationalReference =
      selectedAinopBridgeIndex?.national_rate_per_100 ??
      selectedAinopBridgeIndex?.national_rate_per_100_ainop_bridges ??
      ainopBridgeIndex?.metadata?.national_rate_per_100_ainop_bridges ??
      null;
    const collapseRateDatasetVersion =
      selectedAinopBridgeIndex?.dataset_version ??
      ainopBridgeIndex?.metadata?.dataset_version ??
      "N/A";
    const collapseRateDataCutoff =
      selectedAinopBridgeIndex?.data_cutoff_date ??
      ainopBridgeIndex?.metadata?.data_cutoff_date ??
      "N/A";
    const collapseRateLatestEventDate =
      selectedAinopBridgeIndex?.latest_event_date ??
      ainopBridgeIndex?.metadata?.latest_event_date ??
      "N/A";
    const collapseRateIncludedYearMax =
      selectedAinopBridgeIndex?.included_year_max ??
      ainopBridgeIndex?.metadata?.included_year_max ??
      "N/A";
    const ainopIndexText =
      selectedAinopBridgeIndex?.ainop_bridges_total
        ? it
          ? `Collapse Rate ARCUS/AINOP: ${collapseRateNumerator} casi ARCUS documentati su ${selectedAinopBridgeIndex.ainop_bridges_total} ponti AINOP; ${selectedAinopBridgeIndex.collapse_rate_per_100_ainop_bridges} casi ogni 100 ponti; ${selectedAinopBridgeIndex.relative_to_national}x il tasso nazionale ARCUS/AINOP (${collapseRateNationalReference ?? "N/A"} ogni 100). Dataset: ${collapseRateDatasetVersion}; aggiornato al ${collapseRateDataCutoff}; ultimo evento incluso ${collapseRateLatestEventDate}; anno massimo ${collapseRateIncludedYearMax}.`
          : `ARCUS/AINOP Collapse Rate: ${collapseRateNumerator} documented ARCUS cases over ${selectedAinopBridgeIndex.ainop_bridges_total} AINOP bridges; ${selectedAinopBridgeIndex.collapse_rate_per_100_ainop_bridges} cases per 100 bridges; ${selectedAinopBridgeIndex.relative_to_national}x the national ARCUS/AINOP rate (${collapseRateNationalReference ?? "N/A"} per 100). Dataset: ${collapseRateDatasetVersion}; updated through ${collapseRateDataCutoff}; latest included event ${collapseRateLatestEventDate}; max included year ${collapseRateIncludedYearMax}.`
        : it
          ? "Collapse Rate ARCUS/AINOP non disponibile per questa provincia."
          : "ARCUS/AINOP Collapse Rate not available for this province.";
    const collapseRateAvailable =
      Number(selectedAinopBridgeIndex?.ainop_bridges_total || 0) > 0 &&
      Number.isFinite(
        Number(selectedAinopBridgeIndex?.collapse_rate_per_100_ainop_bridges)
      );
    const collapseRatePer100 = collapseRateAvailable
      ? String(selectedAinopBridgeIndex.collapse_rate_per_100_ainop_bridges)
      : "N/A";
    const collapseRateMultiplier =
      collapseRateAvailable &&
      Number.isFinite(Number(selectedAinopBridgeIndex?.relative_to_national))
        ? `${selectedAinopBridgeIndex.relative_to_national}x`
        : "N/A";
    const collapseRateConfidence = String(
      selectedAinopBridgeIndex?.collapse_rate_confidence || "unavailable"
    ).replaceAll("_", " ");
    const collapseRateReason =
      selectedAinopBridgeIndex?.collapse_rate_confidence_reason ||
      (it
        ? "Nessun denominatore AINOP disponibile per questa provincia."
        : "No AINOP bridge denominator available for this province.");
    const collapseRateRank = Number(
      selectedAinopBridgeIndex?.national_rank_by_rate
    );
    const collapseRatePercentile = Number(
      selectedAinopBridgeIndex?.percentile_by_rate
    );
    const collapseRateInterpretation = collapseRateAvailable
      ? it
        ? Number.isFinite(collapseRatePercentile) &&
          collapseRatePercentile >= 80
          ? `Questo posiziona ${reportAreaLabel} tra le province con il piu alto tasso di collasso documentato in Italia${Number.isFinite(collapseRateRank) ? ` (rank nazionale ${collapseRateRank})` : ""}.`
          : Number.isFinite(collapseRatePercentile) &&
              collapseRatePercentile <= 40
            ? `Questo posiziona ${reportAreaLabel} sotto la fascia alta della distribuzione nazionale ARCUS/AINOP.`
            : `Questo posiziona ${reportAreaLabel} in una fascia intermedia della distribuzione nazionale ARCUS/AINOP.`
        : Number.isFinite(collapseRatePercentile) &&
            collapseRatePercentile >= 80
          ? `This places ${reportAreaLabel} among the provinces with the highest documented collapse rate in Italy${Number.isFinite(collapseRateRank) ? ` (national rank ${collapseRateRank})` : ""}.`
          : Number.isFinite(collapseRatePercentile) &&
              collapseRatePercentile <= 40
            ? `This places ${reportAreaLabel} below the high-rate band of the national ARCUS/AINOP distribution.`
            : `This places ${reportAreaLabel} in the middle band of the national ARCUS/AINOP distribution.`
      : it
        ? "Interpretazione non disponibile: manca un denominatore AINOP utilizzabile."
        : "Interpretation unavailable: no usable AINOP denominator is available.";
    const collapseRateScore = collapseRateAvailable
      ? Math.min(
          100,
          Math.round(
            Number(selectedAinopBridgeIndex.relative_to_national) *
              16.67
          )
        )
      : null;
    const exposurePrioritySource =
      workflowHazardExposure?.score ?? score;
    const exposurePriorityScore = Number.isFinite(
      Number(exposurePrioritySource)
    )
      ? Math.round(Number(exposurePrioritySource))
      : null;
    const finalPriorityIndex =
      Number.isFinite(exposurePriorityScore) &&
      Number.isFinite(collapseRateScore)
        ? Math.round(
            exposurePriorityScore * 0.7 +
              collapseRateScore * 0.3
          )
        : null;
    const finalPriorityIndexLabel = Number.isFinite(finalPriorityIndex)
      ? String(finalPriorityIndex)
      : "N/A";
    const exposurePriorityScoreLabel = Number.isFinite(exposurePriorityScore)
      ? String(exposurePriorityScore)
      : "N/A";
    const reportIntentSentence = it
      ? "Il report usa un linguaggio orientato a screening territoriale, priorita di approfondimento e verifiche tecniche successive."
      : "The report uses language focused on territorial screening, follow-up priorities and subsequent technical checks.";

    const formatKpi = ({ level, driver }) =>
      `<p><span class="kpi-class"><em>${escapeHtml(level)}</em></span><span class="kpi-driver">${escapeHtml(driver)}</span></p>`;

    const compactUrl = (url) => {
      if (!url) {
        return "-";
      }

      try {
        const parsed = new URL(url);
        const host = parsed.hostname.replace(/^www\./, "");
        const extension = parsed.pathname.split(".").pop()?.toUpperCase();

        return extension && extension.length <= 5
          ? `${host} / ${extension}`
          : host;
      } catch {
        return it ? "Fonte esterna" : "External source";
      }
    };

    const selectedAreaSketch = !isPath01 && manualAreaBounds
      ? `<div class="area-sketch"><div><span>${it ? "Selezione manuale mappa" : "Manual map selection"}</span><strong>${escapeHtml(reportAreaLabel)}</strong><p>N ${manualAreaBounds.north.toFixed(3)} / S ${manualAreaBounds.south.toFixed(3)} / E ${manualAreaBounds.east.toFixed(3)} / W ${manualAreaBounds.west.toFixed(3)}</p></div></div>`
      : "";
    const mapEvents = workflowEvents
      .map((event) => ({
        ...event,
        latitude: Number(event.latitude),
        longitude: Number(event.longitude),
      }))
      .filter(
        (event) =>
          Number.isFinite(event.latitude) &&
          Number.isFinite(event.longitude)
      );
    const rawMapBounds = (!isPath01 && manualAreaBounds) ||
      (mapEvents.length
        ? {
          east: Math.max(
            ...mapEvents.map((event) => event.longitude)
          ),
          north: Math.max(
            ...mapEvents.map((event) => event.latitude)
          ),
          south: Math.min(
            ...mapEvents.map((event) => event.latitude)
          ),
          west: Math.min(
            ...mapEvents.map((event) => event.longitude)
          ),
        }
        : null);
    const mapBounds = rawMapBounds
      ? (() => {
        const lonSpan = Math.max(
          rawMapBounds.east - rawMapBounds.west,
          0.08
        );
        const latSpan = Math.max(
          rawMapBounds.north - rawMapBounds.south,
          0.08
        );
        const lonPad = lonSpan * 0.14;
        const latPad = latSpan * 0.16;

        return {
          east: rawMapBounds.east + lonPad,
          north: rawMapBounds.north + latPad,
          south: rawMapBounds.south - latPad,
          west: rawMapBounds.west - lonPad,
        };
      })()
      : null;
    const mercatorX = (longitude, zoom) =>
      ((longitude + 180) / 360) *
      256 *
      2 ** zoom;
    const mercatorY = (latitude, zoom) => {
      const clampedLat = Math.max(
        -85.05112878,
        Math.min(85.05112878, latitude)
      );
      const rad = (clampedLat * Math.PI) / 180;

      return (
        ((1 -
          Math.log(Math.tan(rad) + 1 / Math.cos(rad)) /
            Math.PI) /
          2) *
        256 *
        2 ** zoom
      );
    };
    const atlasZoom = mapBounds
      ? (() => {
        for (let zoom = 12; zoom >= 5; zoom -= 1) {
          const width =
            mercatorX(mapBounds.east, zoom) -
            mercatorX(mapBounds.west, zoom);
          const height =
            mercatorY(mapBounds.south, zoom) -
            mercatorY(mapBounds.north, zoom);

          if (width <= 650 && height <= 320) {
            return zoom;
          }
        }

        return 5;
      })()
      : 7;
    const atlasViewport = mapBounds
      ? (() => {
        const centerX =
          (mercatorX(mapBounds.east, atlasZoom) +
            mercatorX(mapBounds.west, atlasZoom)) /
          2;
        const centerY =
          (mercatorY(mapBounds.north, atlasZoom) +
            mercatorY(mapBounds.south, atlasZoom)) /
          2;

        return {
          left: centerX - 400,
          top: centerY - 215,
          zoom: atlasZoom,
        };
      })()
      : null;
    const atlasTileImages = atlasViewport
      ? (() => {
        const tileMinX = Math.floor(atlasViewport.left / 256);
        const tileMaxX = Math.floor(
          (atlasViewport.left + 800) / 256
        );
        const tileMinY = Math.floor(atlasViewport.top / 256);
        const tileMaxY = Math.floor(
          (atlasViewport.top + 430) / 256
        );
        const maxTile = 2 ** atlasViewport.zoom;
        const tiles = [];

        for (let tileX = tileMinX; tileX <= tileMaxX; tileX += 1) {
          for (let tileY = tileMinY; tileY <= tileMaxY; tileY += 1) {
            if (
              tileY < 0 ||
              tileY >= maxTile
            ) {
              continue;
            }

            const wrappedTileX =
              ((tileX % maxTile) + maxTile) % maxTile;
            const x = tileX * 256 - atlasViewport.left;
            const y = tileY * 256 - atlasViewport.top;

            if (x < 0 || y < 0 || x + 256 > 800 || y + 256 > 430) {
              continue;
            }

            tiles.push(
              `<image href="https://a.basemaps.cartocdn.com/rastertiles/voyager/${atlasViewport.zoom}/${wrappedTileX}/${tileY}.png" x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="256" height="256" opacity="0.82" preserveAspectRatio="none" clip-path="url(#atlas-map-clip)"></image>`
            );
          }
        }

        return tiles.join("");
      })()
      : "";
    const projectMapPoint = (event) => {
      if (!atlasViewport) {
        return {
          x: 0,
          y: 0,
        };
      }

      return {
        x: Math.min(
          760,
          Math.max(
            40,
            mercatorX(event.longitude, atlasViewport.zoom) -
              atlasViewport.left
          )
        ),
        y: Math.min(
          392,
          Math.max(
            38,
            mercatorY(event.latitude, atlasViewport.zoom) -
              atlasViewport.top
          )
        ),
      };
    };
    const selectedProvincePolygon = rawMapBounds
      ? (() => {
        const corners = [
          {
            latitude: rawMapBounds.north,
            longitude: rawMapBounds.west,
          },
          {
            latitude: rawMapBounds.north,
            longitude: rawMapBounds.east,
          },
          {
            latitude: rawMapBounds.south,
            longitude: rawMapBounds.east,
          },
          {
            latitude: rawMapBounds.south,
            longitude: rawMapBounds.west,
          },
        ];

        return corners
          .map((corner) => {
            const point = projectMapPoint(corner);
            return `${point.x.toFixed(1)},${point.y.toFixed(1)}`;
          })
          .join(" ");
      })()
      : "";
    const priorityMapRefs = new Map(
      workflowEvents
        .slice(0, 3)
        .map((event, index) => [
          event.event_id,
          {
            index,
            ref: `P${index + 1}`,
          },
        ])
    );
    const atlasMapPins = mapBounds
      ? mapEvents
        .slice(0, 90)
        .map((event) => {
          const point = projectMapPoint(event);
          const isCritical = event.collapse_severity === "TC";
          const isTriggered = Boolean(event.triggered);
          const priorityRef = priorityMapRefs.get(event.event_id);
          const priorityOffsets = [
            { x: 17, y: -34 },
            { x: -42, y: -12 },
            { x: 17, y: 22 },
          ];
          const priorityOffset =
            priorityRef ? priorityOffsets[priorityRef.index] || priorityOffsets[0] : null;
          const color = isCritical
            ? "#9B3D31"
            : isTriggered
              ? "#C49040"
              : "#53676D";
          const radius = isCritical ? 6.2 : 5.2;

          return `<g class="atlas-point">
            <circle cx="${point.x.toFixed(1)}" cy="${point.y.toFixed(1)}" r="${(radius + 4).toFixed(1)}" fill="${color}" opacity="0.16"></circle>
            <circle cx="${point.x.toFixed(1)}" cy="${point.y.toFixed(1)}" r="${radius}" fill="${color}" stroke="#fffaf2" stroke-width="1.6"></circle>
            ${priorityRef ? `<g class="atlas-priority-label" transform="translate(${(point.x + priorityOffset.x).toFixed(1)} ${(point.y + priorityOffset.y).toFixed(1)})"><rect width="29" height="18" rx="2"></rect><text x="14.5" y="13" text-anchor="middle">${priorityRef.ref}</text></g>` : ""}
            <title>${escapeHtml(`${event.event_id} - ${event.municipality || "-"}${event.year ? ` (${event.year})` : ""}`)}</title>
          </g>`;
        })
        .join("")
      : "";
    const atlasBoundsLabel = mapBounds
      ? `N ${mapBounds.north.toFixed(3)} / S ${mapBounds.south.toFixed(3)} / E ${mapBounds.east.toFixed(3)} / W ${mapBounds.west.toFixed(3)}`
      : "-";
    const storedReportMapImage =
      typeof window !== "undefined"
        ? window.localStorage.getItem(
          "arcus-path01-report-map-image"
        )
        : "";
    const reportMapImage =
      mapImage || storedReportMapImage || "";
    const fullMapNote = it
      ? "La mappa PDF mostra i casi ARCUS georeferenziati nella provincia selezionata. Gli overlay hazard sono sintetizzati dagli indicatori di esposizione sotto. Il controllo interattivo completo dei layer e disponibile in ARCUS Professional Atlas."
      : "The PDF map shows ARCUS georeferenced cases within the selected province. Hazard overlays are summarised through the exposure indicators below. Full interactive layer control is available in ARCUS Professional Atlas.";
    const briefMapNote = it
      ? "Mappa statica dei casi ARCUS. Vista interattiva completa in Professional Atlas."
      : "Static ARCUS cases map. Full interactive view available in Professional Atlas.";
    const reportMapFrame = reportMapImage
      ? `<figure class="map-image-frame">
        <img src="${escapeHtml(reportMapImage)}" alt="${escapeHtml(it ? "Mappa territoriale esportata da ARCUS" : "Territorial map exported from ARCUS")}" />
        <figcaption>${escapeHtml(isBrief ? briefMapNote : fullMapNote)}</figcaption>
      </figure>`
      : `<figure class="atlas-extract">
        <svg class="atlas-map-svg" viewBox="0 0 800 430" role="img" aria-label="${escapeHtml(it ? "Estratto ARCUS Atlas della provincia selezionata" : "ARCUS Atlas extract for the selected province")}">
          <defs>
            <pattern id="atlas-grid" width="40" height="40" patternUnits="userSpaceOnUse">
              <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#d2c6b8" stroke-width="1" opacity="0.55"></path>
            </pattern>
            <linearGradient id="atlas-bg" x1="0" x2="1" y1="0" y2="1">
              <stop offset="0" stop-color="#f7efe3"></stop>
              <stop offset="1" stop-color="#e2ddd1"></stop>
            </linearGradient>
            <clipPath id="atlas-map-clip"><rect width="800" height="430"></rect></clipPath>
          </defs>
          <rect width="800" height="430" fill="url(#atlas-bg)"></rect>
          ${atlasTileImages}
          <rect width="800" height="430" fill="url(#atlas-grid)"></rect>
          <path d="M40 300 C150 255 205 270 310 218 S505 168 760 116" fill="none" stroke="#6e858d" stroke-width="8" stroke-linecap="round" opacity="0.16"></path>
          <path d="M32 314 C155 265 215 282 320 226 S510 180 770 126" fill="none" stroke="#6e858d" stroke-width="2" stroke-linecap="round" opacity="0.55"></path>
          ${selectedProvincePolygon ? `<polygon points="${selectedProvincePolygon}" fill="#c49040" opacity="0.10" stroke="#c49040" stroke-width="2.2" stroke-dasharray="8 6"></polygon>` : ""}
          ${atlasMapPins}
          <g class="atlas-north">
            <rect x="732" y="18" width="36" height="36" rx="2"></rect>
            <text x="750" y="42" text-anchor="middle">N</text>
          </g>
          <g class="atlas-scale">
            <rect x="28" y="374" width="112" height="8" fill="#5f6e75"></rect>
            <rect x="56" y="374" width="28" height="8" fill="#fffaf2"></rect>
            <rect x="112" y="374" width="28" height="8" fill="#fffaf2"></rect>
            <text x="28" y="398">${escapeHtml(it ? "scala indicativa" : "indicative scale")}</text>
          </g>
          <g class="atlas-title">
            <text x="28" y="34">${escapeHtml(reportAreaLabel)}</text>
            <text x="28" y="54">${mapEvents.length} ${escapeHtml(it ? "casi ARCUS georeferenziati" : "georeferenced ARCUS cases")}</text>
          </g>
        </svg>
        <figcaption>
          <strong>${escapeHtml(it ? "ARCUS Atlas extract" : "ARCUS Atlas extract")}</strong>
          ${escapeHtml(`${isBrief ? briefMapNote : fullMapNote} Bounds: ${atlasBoundsLabel}.`)}
        </figcaption>
      </figure>`;
    const reportMapLegend = "";

    const hazardData = (workflowHazardExposure?.hazards || [])
      .filter(
        (h) =>
          h &&
          h.label &&
          Number.isFinite(Number(h.score)) &&
          Number.isFinite(Number(h.matched_events)) &&
            Number.isFinite(Number(h.share))
      )
      .map((h) => ({
        ...h,
        label: reportHazardLabel(h.label),
        matched_events: Number(h.matched_events),
        score: Number(h.score),
        share: Number(h.share),
      }))
      .sort((a, b) => b.share - a.share);
    const hazardRows = hazardData
      .map((h) => `<tr><td>${escapeHtml(h.label)}</td><td>${h.score}</td><td>${h.matched_events}</td><td>${Math.round(h.share * 100)}%</td></tr>`)
      .join("");
    const hazardRowsSafe =
      hazardRows ||
      `<tr><td colspan="4">${it ? "Nessun overlay hazard statisticamente leggibile per la provincia selezionata." : "No statistically readable hazard overlay for the selected province."}</td></tr>`;

    const isHydraulicEvent = (event) =>
      String(event.specific_cause || "")
        .toLowerCase()
        .includes("hydraulic") ||
      String(event.trigger_category || "")
        .toLowerCase()
        .includes("hydraulic");

    const eventAttention = (event) => {
      const rel = reliabilityByEvent[event.event_id];
      const vul = vulnerabilityByEvent[event.event_id];
      const hasImpact =
        Number(event.victims) > 0 ||
        Number(event.injuries) > 0;
      const points =
        (event.collapse_severity === "TC" ? 34 : 0) +
        (hasImpact ? 20 : 0) +
        (event.triggered ? 14 : 0) +
        (isHydraulicEvent(event) ? 12 : 0) +
        (rel?.grade === "A" ? 10 : rel?.grade === "B" ? 7 : 0) +
        (vul?.className === "Critical" ? 12 : vul?.className === "High" ? 8 : 0);

      if (points >= 64) {
        return it ? "Critical attention" : "Critical attention";
      }

      if (points >= 44) {
        return it ? "High attention" : "High attention";
      }

      if (points >= 24) {
        return it ? "Monitor" : "Monitor";
      }

      return it ? "Context record" : "Context record";
    };

    const whyFlagged = (event) => {
      const rel = reliabilityByEvent[event.event_id];
      const reasons = [];

      if (event.collapse_severity === "TC") {
        reasons.push(it ? "crollo totale" : "total collapse");
      }

      if (isHydraulicEvent(event)) {
        reasons.push(it ? "driver idraulico" : "hydraulic driver");
      }

      if (event.triggered) {
        reasons.push(it ? "evento innescato" : "triggered event");
      }

      if (Number(event.victims) > 0 || Number(event.injuries) > 0) {
        reasons.push(it ? "impatto umano" : "human impact");
      }

      if (rel?.grade === "A" || rel?.grade === "B") {
        reasons.push(it ? `evidenza ${rel.grade}` : `evidence ${rel.grade}`);
      }

      if (workflowHazardExposure?.dominant_hazard) {
        reasons.push(
          it
            ? `contesto ${workflowHazardExposure.dominant_hazard}`
            : `${workflowHazardExposure.dominant_hazard} context`
        );
      }

      return reasons.slice(0, 4).join(", ") || (it ? "precedente territoriale documentato" : "documented territorial precedent");
    };

    const eventRows = workflowEvents.slice(0, 5)
      .map((event) => {
        const rel = reliabilityByEvent[event.event_id];
        return `<tr>
          <td>${escapeHtml(event.event_id)}</td>
          <td>${escapeHtml(event.municipality)}${event.year ? ` (${event.year})` : ""}</td>
          <td>${escapeHtml(severityLabel(event.collapse_severity))}</td>
          <td>${escapeHtml(validityText(event.specific_cause, it ? "Non classificata" : "Unclassified"))}</td>
          <td>${rel?.score || 0} / ${escapeHtml(rel?.grade || "D")}</td>
          <td>${escapeHtml(eventAttention(event))}</td>
          <td>${escapeHtml(whyFlagged(event))}</td>
        </tr>`;
      }).join("");

    const recommendationRows = selectedRecommendations
      .map((item) => `<li>${escapeHtml(item)}</li>`)
      .join("");
    const mitigationEvidence = path01MitigationIntelligence?.evidence_cohort;
    const mitigationStatus = String(
      path01MitigationIntelligence?.status || "not available"
    ).replaceAll("_", " ");
    const mitigationUsesNationalAnalogues =
      mitigationEvidence?.analogue_retrieval?.production_ready === true;
    const mitigationPointIntersectionRequired =
      mitigationEvidence?.analogue_retrieval?.reason ===
      "official_hydraulic_point_intersection_required";
    const mitigationEvidenceSummary = mitigationEvidence
      ? it
        ? `${mitigationEvidence.event_count || 0} casi idraulici nella ${mitigationUsesNationalAnalogues ? "coorte nazionale di analoghi" : "coorte provinciale di fallback"}; ${mitigationEvidence.episode_count || 0} episodi idraulici indipendenti; ${mitigationEvidence.effective_evidence_count || 0} casi effettivi pesati; ${mitigationEvidence.episode_effective_evidence_count || 0} evidenza episode-effective; ${mitigationEvidence.linked_source_count || 0} fonti collegate.`
        : `${mitigationEvidence.event_count || 0} hydraulic cases in the ${mitigationUsesNationalAnalogues ? "national analogue cohort" : "provincial fallback cohort"}; ${mitigationEvidence.episode_count || 0} independent hydraulic episodes; ${mitigationEvidence.effective_evidence_count || 0} effective weighted cases; ${mitigationEvidence.episode_effective_evidence_count || 0} episode-effective evidence; ${mitigationEvidence.linked_source_count || 0} linked sources.`
      : it
        ? "Sintesi di evidenza non disponibile."
        : "Evidence synthesis unavailable.";
    const mitigationRegistryQuality =
      mitigationEvidence?.episode_registry_quality || {};
    const mitigationRegistrySummary = it
      ? `${mitigationRegistryQuality.curated_episode_count || 0} episodi con override curato; ${mitigationRegistryQuality.source_linked_episode_count || 0} supportati da fonti condivise; ${mitigationRegistryQuality.review_required_episode_count || 0} da revisionare; ${mitigationRegistryQuality.review_recommended_episode_count || 0} con revisione raccomandata.`
      : `${mitigationRegistryQuality.curated_episode_count || 0} episodes with curated override; ${mitigationRegistryQuality.source_linked_episode_count || 0} supported by shared sources; ${mitigationRegistryQuality.review_required_episode_count || 0} requiring review; ${mitigationRegistryQuality.review_recommended_episode_count || 0} with review recommended.`;
    const mitigationRetrievalRobustness =
      mitigationEvidence?.retrieval_robustness;
    const mitigationRobustnessSummary = mitigationRetrievalRobustness?.applied
      ? it
        ? `Consenso su finestre annidate 15/20/25; almeno ${mitigationRetrievalRobustness.minimum_supporting_windows || 2} finestre devono qualificare lo stesso processo.`
        : `Consensus across nested 15/20/25 windows; at least ${mitigationRetrievalRobustness.minimum_supporting_windows || 2} windows must qualify the same process.`
      : mitigationPointIntersectionRequired
        ? it
          ? "Controllo 15/20/25 non applicabile: senza intersezione idraulica del punto non viene attivata alcuna coorte."
          : "The 15/20/25 control is not applicable: no cohort is activated without a point-level hydraulic intersection."
      : it
        ? "Controllo 15/20/25 non applicabile al fallback provinciale."
        : "The 15/20/25 control is not applicable to the provincial fallback.";
    const mitigationAnalogueRetrieval =
      mitigationEvidence?.analogue_retrieval;
    const mitigationSignatureCoverage = Math.round(
      Number(
        mitigationAnalogueRetrieval
          ?.hydraulic_signature_coverage_ratio || 0
      ) * 100
    );
    const mitigationCohortSummary = mitigationUsesNationalAnalogues
      ? it
        ? `${mitigationAnalogueRetrieval?.analogues?.length || 0} analoghi selezionati sull'intero database nazionale tramite la firma hazard ufficiale attuale. La provincia derivata dal punto resta contesto territoriale e non e un filtro di retrieval.`
        : `${mitigationAnalogueRetrieval?.analogues?.length || 0} analogues selected across the national database by current official hazard signature. The point-derived province remains territorial context and is not a retrieval filter.`
      : mitigationPointIntersectionRequired
        ? it
          ? "Nessun retrieval nazionale attivato: il punto non interseca una classe idraulica ufficiale. I casi provinciali restano esclusivamente contesto storico territoriale."
          : "No national retrieval activated: the point does not intersect an official hydraulic class. Provincial cases remain territorial historical context only."
      : it
        ? `Fallback provinciale controllato: copertura delle firme idrauliche ufficiali attuali ${mitigationSignatureCoverage}% (soglia di attivazione nazionale 80%).`
        : `Controlled provincial fallback: current official hydraulic-signature coverage ${mitigationSignatureCoverage}% (80% national activation threshold).`;
    const mitigationTemporalCaveat = it
      ? "La firma ufficiale attuale descrive comparabilita presente, non ricostruisce retroattivamente la classe all'anno del collasso e non dimostra causalita. La classe storica e mostrata solo se proviene da una fonte datata autenticata; trigger e processi sono letti soltanto dopo avere fissato la coorte."
      : "The current official signature describes present-day comparability; it neither reconstructs the class at the collapse year nor proves causality. A historical class is shown only from an authenticated dated source; triggers and processes are read only after the cohort is fixed.";
    const mitigationAnalogueRows =
      mitigationUsesNationalAnalogues
        ? (mitigationAnalogueRetrieval?.analogues || [])
          .slice(0, 5)
          .map((analogue) => {
            const currentHydraulic =
              analogue.current_official_signature?.hydraulic;
            const historical =
              analogue.temporal_evidence?.historical_at_event;
            const pgaDelta =
              analogue.retrieval_comparison?.seismic?.pga_delta_g;

            return `<tr>
              <td>${escapeHtml(analogue.retrieval_rank)}</td>
              <td>${escapeHtml(analogue.event?.event_id || "-")}</td>
              <td>${escapeHtml([analogue.event?.municipality, analogue.event?.province].filter(Boolean).join(", ") || "-")}</td>
              <td>${escapeHtml(currentHydraulic?.highest_class || currentHydraulic?.matched_classes?.join(", ") || "-")}</td>
              <td>${escapeHtml(pgaDelta === null || pgaDelta === undefined ? "-" : Number(pgaDelta).toFixed(5))}</td>
              <td>${escapeHtml(String(historical?.status || "not_available_not_reconstructed").replaceAll("_", " "))}</td>
            </tr>`;
          })
          .join("")
        : "";
    const officialPointCoordinates = projectLocation.validated
      ? `${formatExposureCoordinate(projectLocation.latitude)}, ${formatExposureCoordinate(projectLocation.longitude)}`
      : "-";
    const officialHydraulicPointOutcome =
      path01HydraulicExposure?.matched_classes?.length
        ? `${it ? "Classi al punto" : "Classes at point"}: ${path01HydraulicExposure.matched_classes.join(", ")}`
        : it
          ? "Nessuna classe idraulica ISPRA interseca il punto"
          : "No ISPRA hydraulic class intersects the point";
    const officialHydraulicNearbyContext =
      nearbyContextLabel(path01HydraulicExposure, language) ||
      (it ? "Nessun contesto separato riportato" : "No separate context reported");
    const officialLandslidePointClasses = [
      ...(path01LandslideExposure?.matched_hazard_classes || []),
      ...(path01LandslideExposure?.matched_attention_classes || []),
    ].join(", ");
    const officialLandslidePointOutcome = officialLandslidePointClasses
      ? `${it ? "Classi al punto" : "Classes at point"}: ${officialLandslidePointClasses}`
      : it
        ? "Nessuna classe PAI ISPRA interseca il punto"
        : "No ISPRA PAI class intersects the point";
    const officialLandslideNearbyContext =
      nearbyContextLabel(path01LandslideExposure, language) ||
      (it ? "Nessun contesto separato riportato" : "No separate context reported");
    const officialPointExposureTable = `
      <table>
        <thead><tr><th>Hazard</th><th>${it ? "Esito puntuale" : "Point outcome"}</th><th>${it ? "Contesto territoriale" : "Territorial context"}</th><th>${it ? "Valutazione" : "Assessment"}</th><th>${it ? "Ruolo" : "Role"}</th></tr></thead>
        <tbody>
          <tr>
            <td>ISPRA Hydraulic</td>
            <td>${escapeHtml(officialHydraulicPointOutcome)}</td>
            <td>${escapeHtml(officialHydraulicNearbyContext)}</td>
            <td>${escapeHtml(`${exposureStatusLabel(path01HydraulicExposure, language)}; ${assessmentStatusLabel(path01HydraulicExposure, language)}`)}</td>
            <td>Shadow mode; ${it ? "non modifica il Final Priority Index" : "does not modify the Final Priority Index"}</td>
          </tr>
          <tr>
            <td>ISPRA PAI Landslide</td>
            <td>${escapeHtml(officialLandslidePointOutcome)}</td>
            <td>${escapeHtml(officialLandslideNearbyContext)}</td>
            <td>${escapeHtml(`${exposureStatusLabel(path01LandslideExposure, language)}; ${assessmentStatusLabel(path01LandslideExposure, language)}`)}</td>
            <td>Shadow mode; ${it ? "non modifica il Final Priority Index" : "does not modify the Final Priority Index"}</td>
          </tr>
        </tbody>
      </table>
      <p class="note">${escapeHtml(it ? `Punto progetto: ${officialPointCoordinates}. Le osservazioni ufficiali sono separate dai proxy storici ARCUS; una sorgente incompleta non e interpretata come assenza di hazard.` : `Project point: ${officialPointCoordinates}. Official observations remain separate from ARCUS historical proxies; an incomplete source is not interpreted as absence of hazard.`)}</p>`;
    const designFocusRows = projectDesignFocus.focusItems
      .map((item) => `<li>${escapeHtml(item)}</li>`)
      .join("");
    const designFocusBadges = projectDesignFocus.focusItems
      .slice(0, 6)
      .map((item) => `<span>${escapeHtml(item)}</span>`)
      .join("");
    const scoreLegendRows = `
      <tr><td>A</td><td>${it ? "Alta affidabilita: piu fonti, preferibilmente istituzionali o tecniche." : "High reliability: multiple sources, preferably institutional or technical."}</td></tr>
      <tr><td>B</td><td>${it ? "Affidabilita media: evento documentato ma con copertura o varieta fonti limitata." : "Medium reliability: documented event with limited coverage or source variety."}</td></tr>
      <tr><td>C</td><td>${it ? "Affidabilita limitata: evidenza locale, incompleta o da rafforzare." : "Limited reliability: local, incomplete or to-be-strengthened evidence."}</td></tr>
      <tr><td>Critical</td><td>${it ? "Massima attenzione: forte evidenza storica e/o territoriale." : "Maximum attention: strong historical and/or territorial evidence."}</td></tr>
      <tr><td>High</td><td>${it ? "Attenzione elevata: evidenza significativa ma non necessariamente completa." : "High attention: significant evidence but not necessarily complete."}</td></tr>
      <tr><td>Medium / Low</td><td>${it ? "Attenzione moderata o bassa, da leggere insieme ai dati disponibili." : "Moderate or low attention, to be read together with available data."}</td></tr>
    `;

    const validHistoricalCauses = selectedProvinceDrivers.causes.filter(
      (item) =>
        item &&
        item.label &&
        Number.isFinite(Number(item.value)) &&
        workflowEvents.length > 0
    );

    const validHistoricalTotal = validHistoricalCauses.reduce(
      (total, item) => total + Number(item.value || 0),
      0
    );
    const otherHistoricalCount = Math.max(
      0,
      workflowEvents.length - validHistoricalTotal
    );
    const causeRows = validHistoricalCauses.length
      ? [
        ...validHistoricalCauses,
        ...(otherHistoricalCount
          ? [
            {
              label: it
                ? "Other / failure precedent context"
                : "Other / failure precedent context",
              value: otherHistoricalCount,
            },
          ]
          : []),
      ]
        .map((c, i) => `<tr>
        <td>${i + 1}</td>
        <td>${escapeHtml(c.label)}</td>
        <td>${Number(c.value)}</td>
        <td>${Math.round((Number(c.value) / Math.max(workflowEvents.length, 1)) * 100)}%</td>
      </tr>`)
        .join("")
      : `<tr><td colspan="4">${it ? "Distribuzione cause non statisticamente affidabile per la provincia selezionata." : "No statistically reliable cause distribution available for this selected province."}</td></tr>`;

    const workflowSourceCount = workflowEvents.reduce(
      (total, event) =>
        total +
        (sourcesByEventMap[event.event_id] || []).length,
      0
    );
    const humanImpactEvents = workflowEvents.filter(
      (event) =>
        Number(event.victims) > 0 ||
        Number(event.injuries) > 0
    ).length;
    const triggeredEvents = workflowEvents.filter(
      (event) => event.triggered
    ).length;
    const totalCollapseEvents = workflowEvents.filter(
      (event) => event.collapse_severity === "TC"
    ).length;
    const reportBenchmark = [
      {
        label: "Total collapse share",
        national: nationalBenchmark.totalCollapseShare,
        selected: percentage(
          totalCollapseEvents,
          workflowEvents.length || 1
        ),
        suffix: "%",
      },
      {
        label: "Triggered-event share",
        national: nationalBenchmark.triggeredShare,
        selected: percentage(
          triggeredEvents,
          workflowEvents.length || 1
        ),
        suffix: "%",
      },
      {
        label: "Sources per event",
        national: Number(
          nationalBenchmark.avgSources.toFixed(1)
        ),
        selected: Number(
          (
            workflowSourceCount /
            Math.max(workflowEvents.length, 1)
          ).toFixed(1)
        ),
        suffix: "",
      },
      {
        label: "Human-impact events",
        national: nationalBenchmark.humanImpactShare,
        selected: percentage(
          humanImpactEvents,
          workflowEvents.length || 1
        ),
        suffix: "%",
      },
      {
        label: it
          ? "Professional-grade sources"
          : "Professional-grade sources",
        national: nationalBenchmark.reliabilityShare,
        selected: workflowReliability.institutionalShare,
        suffix: "%",
      },
      {
        label: "Structural Vulnerability Exposure",
        national: nationalBenchmark.vulnerabilityShare,
        selected: percentage(
          workflowVulnerability.highOrCritical,
          workflowEvents.length || 1
        ),
        suffix: "%",
      },
    ].map((row) => {
      const delta = Number(
        (row.selected - row.national).toFixed(1)
      );
      const status =
        Math.abs(delta) < 2
          ? "aligned"
          : delta > 0
            ? "above"
            : "below";

      return {
        ...row,
        status,
      };
    });
    const benchmarkRows = reportBenchmark
      .map((item) => `<tr>
        <td>${escapeHtml(item.label)}</td>
        <td>${item.selected}${escapeHtml(item.suffix)}</td>
        <td>${item.national}${escapeHtml(item.suffix)}</td>
        <td>${escapeHtml(item.status)}</td>
      </tr>`)
      .join("");
    const dominantCauseLabel =
      validHistoricalCauses[0]?.label ||
      selectedProvinceProfile.topCause ||
      (it ? "non classificata" : "unclassified");
    const dominantCauseCount =
      validHistoricalCauses[0]?.value || 0;
    const reliabilityLabel = evidenceClass(
      workflowReliability.average
    );
    const dominantDriverPhrase =
      dominantCauseLabel &&
      dominantCauseLabel.toLowerCase().includes("hydraulic")
        ? it
          ? "una forte concentrazione di casi ARCUS storici legati al contesto idraulico"
          : "a strong concentration of hydraulic-related historical ARCUS cases"
        : it
          ? `una concentrazione di casi ARCUS storici legati a ${dominantCauseLabel}`
          : `a concentration of historical ARCUS cases linked to ${dominantCauseLabel}`;
    const attentionAdjective =
      !Number.isFinite(score)
        ? it
          ? "non disponibile"
          : "unavailable"
        : score >= 75
        ? it
          ? "alta"
          : "high"
        : score >= 55
          ? it
            ? "media"
            : "medium"
          : it
            ? "moderata"
            : "moderate";
    const decisionOutcome = it
      ? `Uso raccomandato: screening preliminare provinciale per interventi ${projectDesignFocus.contextLabel}, prima di progettazione, due diligence o indagini sito-specifiche.`
      : `Recommended use: province-level preliminary screening for ${projectDesignFocus.contextLabel} interventions, before design, due diligence or site-specific investigation.`;
    const topFindings = [
      it
        ? "Asset: primo database sistematico di ponti crollati in Italia dal 2000 ad oggi."
        : "Asset: first systematic database of collapsed bridges in Italy from 2000 to today.",
      it
        ? `Il contesto ${workflowHazardExposure?.dominant_hazard || "hazard"} domina la lettura territoriale.`
        : `The ${workflowHazardExposure?.dominant_hazard || "hazard"} context dominates the territorial reading.`,
      collapseRateAvailable
        ? it
          ? `Collapse Rate: ${collapseRateMultiplier} il tasso nazionale ARCUS/AINOP, separato dal Priority Index.`
          : `Collapse Rate: ${collapseRateMultiplier} the national ARCUS/AINOP rate, separate from Priority Index.`
        : it
          ? "Collapse Rate ARCUS/AINOP non disponibile: leggere solo il Priority Index e le evidenze ARCUS."
          : "ARCUS/AINOP Collapse Rate unavailable: read Priority Index and ARCUS evidence only.",
      it
        ? `${triggeredEvents} eventi innescati e ${totalCollapseEvents} crolli totali orientano la priorita tecnica.`
        : `${triggeredEvents} triggered events and ${totalCollapseEvents} total collapses shape the technical priority.`,
      it
        ? `Affidabilita evidenze ${reliabilityLabel.toLowerCase()} con ${workflowSourceCount} fonti collegate.`
        : `${reliabilityLabel} evidence reliability with ${workflowSourceCount} linked sources.`,
    ];
    const priorityReportRefs = workflowEvents
      .slice(0, 3)
      .map((event, index) => `P${index + 1} ${event.municipality || "-"}`)
      .join(", ");
    const eventYears = workflowEvents
      .map((event) =>
        Number(
          String(event.date || event.year || "").slice(0, 4)
        )
      )
      .filter(Number.isFinite);
    const evidenceYearRange = eventYears.length
      ? Math.min(...eventYears) === Math.max(...eventYears)
        ? String(Math.min(...eventYears))
        : `${Math.min(...eventYears)}-${Math.max(...eventYears)}`
      : "-";
    const evidenceYearSpan = eventYears.length
      ? Math.max(
        1,
        Math.max(...eventYears) -
          Math.min(...eventYears) +
          1
      )
      : null;
    const evidenceWindowLabel = eventYears.length
      ? it
        ? `${evidenceYearRange} (${evidenceYearSpan} anni di evidenza)`
        : `${evidenceYearRange} (${evidenceYearSpan} years of evidence)`
      : it
        ? "Finestra storica non disponibile"
        : "Historical evidence window unavailable";
    const priorityTopThree = workflowEvents.slice(0, 3);
    const priorityDates = new Set(
      priorityTopThree
        .map((event) => event.date)
        .filter(Boolean)
    );
    const priorityTriggerNote =
      priorityTopThree.length >= 3 && priorityDates.size === 1
          ? it
            ? `Nota: i casi selezionati condividono la stessa data evento (${Array.from(priorityDates)[0]}). Leggerli come cluster di trigger prima di interpretare la frequenza.`
            : `Note: the selected cases share the same event date (${Array.from(priorityDates)[0]}). Treat them as a clustered trigger signal before interpreting recurrence frequency.`
          : "";
    const databaseClaim = it
      ? "ARCUS si basa sul primo database sistematico di ponti crollati in Italia dal 2000 ad oggi. Il valore non e aggregare mappe: e tradurre evidenza storica documentata in intelligence infrastrutturale operativa."
      : "ARCUS is based on the first systematic database of collapsed bridges in Italy from 2000 to today. The value is not map aggregation: it is the translation of documented collapse evidence into operational infrastructure intelligence.";
    const benchmarkCriticalRows = reportBenchmark.filter(
      (item) => item.status === "above"
    );
    const benchmarkInterpretation =
      benchmarkCriticalRows.length > 0
        ? it
          ? `Rispetto alla baseline nazionale ARCUS, la provincia selezionata risulta sopra media per ${benchmarkCriticalRows.map((item) => item.label).join(", ")}. Se la quota di eventi innescati e superiore alla media, il briefing va usato per anticipare verifiche su contesto idraulico, geotecnico e condizioni territoriali prima della progettazione sito-specifica.`
          : `Compared with the national ARCUS baseline, the selected province is above average for ${benchmarkCriticalRows.map((item) => item.label).join(", ")}. If triggered-event share is above average, the briefing should be used to anticipate hydraulic, geotechnical and territorial-context checks before site-specific design.`
        : it
          ? "Rispetto alla baseline nazionale ARCUS, la provincia selezionata non mostra scostamenti estremi sui principali indicatori; la lettura resta guidata dal contesto locale e dalla qualita delle fonti."
          : "Compared with the national ARCUS baseline, the selected province does not show extreme deviations across the main indicators; interpretation remains driven by local context and source quality.";
    const dominantHazardRow = hazardData[0];
    const hazardInterpretation = dominantHazardRow
      ? it
        ? `La provincia selezionata e dominata da ${dominantHazardRow.label.toLowerCase()}: ${dominantHazardRow.matched_events} crolli correlati su ${workflowEvents.length} eventi analizzati (${Math.round(dominantHazardRow.share * 100)}%). Gli altri layer vanno letti come contesto secondario di screening preliminare.`
        : `The selected province is mainly driven by ${dominantHazardRow.label.toLowerCase()}: ${dominantHazardRow.matched_events} matched collapses out of ${workflowEvents.length} analysed events (${Math.round(dominantHazardRow.share * 100)}%). Other layers should be read as secondary preliminary-screening context.`
      : it
        ? "Nessun layer hazard risulta sufficientemente leggibile per una interpretazione automatica robusta."
        : "No hazard layer is sufficiently readable for a robust automated interpretation.";
    const historicalInterpretation = validHistoricalCauses.length
      ? it
        ? `L'evidenza storica conferma un pattern concentrato: ${dominantCauseLabel} rappresenta il ${percentage(dominantCauseCount, workflowEvents.length || 1)}% del campione selezionato. Nel campione sono presenti ${totalCollapseEvents} crolli totali e ${triggeredEvents} eventi innescati.`
        : `Historical evidence confirms a concentrated pattern: ${dominantCauseLabel} represents ${percentage(dominantCauseCount, workflowEvents.length || 1)}% of the selected sample. The sample includes ${totalCollapseEvents} total collapses and ${triggeredEvents} triggered events.`
      : it
        ? "La distribuzione storica non e abbastanza completa per una lettura causale robusta."
        : "The historical distribution is not complete enough for a robust causal reading.";
    const priorityInterpretation = it
      ? "I casi ARCUS selezionati non sono una classifica operativa autonoma: sono riferimenti per mappa, appendice ed export che supportano la lettura del pattern storico."
      : "Selected ARCUS cases are not a standalone operational ranking: they are map, appendix and export references that support the historical-pattern reading.";
    const exposureLabel =
      workflowHazardExposure?.dominant_hazard ||
      dominantCauseLabel ||
      (it ? "contesto hazard" : "hazard context");
    const displayDriverLabel = driverDisplayLabel(exposureLabel);
    const exposureScore =
      dominantHazardRow?.score ||
      Math.round(workflowHazardExposure?.score || 0);
    const flagReasons = [
      databaseClaim,
      it
        ? `Esposizione dominante: ${displayDriverLabel} (${exposureScore || "-"} / 100).`
        : `Dominant exposure: ${displayDriverLabel} (${exposureScore || "-"} / 100).`,
      it
        ? `Severita storica: ${totalCollapseEvents} crolli totali e ${triggeredEvents} eventi innescati.`
        : `Historical severity: ${totalCollapseEvents} total collapses and ${triggeredEvents} triggered events.`,
      it
        ? `Arco temporale evidenze: ${evidenceWindowLabel}.`
        : `Evidence window: ${evidenceWindowLabel}.`,
      it
        ? `Casi in mappa/appendice: ${priorityReportRefs || "selezione ARCUS"}.`
        : `Map/appendix cases: ${priorityReportRefs || "ARCUS selection"}.`,
      it
        ? `Pacchetto evidenze: ${workflowSourceCount} fonti collegate al segnale.`
        : `Evidence package: ${workflowSourceCount} linked sources supporting the signal.`,
    ];
    const hazardBars = hazardData.length
      ? `<div class="mini-bars">${hazardData.map((hazard) => {
        const value = Math.max(0, Math.min(100, Number(hazard.score || 0)));

        return `<div class="mini-bar">
          <span>${escapeHtml(hazard.label)}</span>
          <i><b style="width:${value}%"></b></i>
          <strong>${value}</strong>
        </div>`;
      }).join("")}</div>`
      : `<div class="mini-bars"><div class="mini-bar"><span>${escapeHtml(displayDriverLabel)}</span><i><b style="width:100%"></b></i><strong>${exposureScore || "-"}</strong></div></div>`;
    const requestDataByContext = {
      bridge: it
        ? [
          "Studio idraulico preliminare o modello idraulico",
          "Rilievo alveo / batimetria dove rilevante",
          "Indagine geotecnica e concetto fondazionale",
          "Livelli storici di piena",
          "Vincoli di accessibilita ispettiva",
        ]
        : [
          "Hydraulic model or preliminary hydraulic study",
          "Riverbed survey / bathymetry where relevant",
          "Geotechnical investigation and foundation concept",
          "Historical flood levels",
          "Inspection accessibility constraints",
        ],
      road: it
        ? [
          "Layout drenaggio stradale",
          "Inventario tombini e attraversamenti minori",
          "Geometria rilevati e scarpate",
          "Mappatura aree allagabili",
          "Storico interruzioni e manutenzioni locali",
        ]
        : [
          "Road drainage layout",
          "Culvert and minor crossing inventory",
          "Road embankment and slope geometry",
          "Flood-prone area mapping",
          "Historical interruption and local maintenance records",
        ],
      railway: it
        ? [
          "Tracciato ferroviario e geometria rilevati",
          "Dati aperture idrauliche",
          "Inventario ponti/tombini ferroviari",
          "Storico interruzioni del servizio",
          "Record ispettivi",
        ]
        : [
          "Railway alignment and embankment geometry",
          "Hydraulic opening data",
          "Railway bridge/culvert inventory",
          "Historical service interruption records",
          "Inspection records",
        ],
      urban: it
        ? [
          "Rete drenaggio urbano",
          "Inventario sottopassi e attraversamenti minori",
          "Record locali di allagamento",
          "Piani di protezione civile",
          "Storico manutenzioni",
        ]
        : [
          "Urban drainage network",
          "Underpass and minor crossing inventory",
          "Local flood records",
          "Civil protection plans",
          "Maintenance records",
        ],
    };
    const dataToRequest =
      requestDataByContext[projectContext] ||
      requestDataByContext.bridge;
    const actionCards = selectedRecommendations
      .slice(0, 4)
      .map((item, index) => `<article class="action-card">
        <span>${it ? "Azione" : "Action"} ${index + 1}</span>
        <b>${escapeHtml(item)}</b>
      </article>`)
      .join("");
    const dataCards = dataToRequest
      .slice(0, 5)
      .map((item, index) => `<article class="data-card">
        <span>${it ? "Dato" : "Data"} ${index + 1}</span>
        <b>${escapeHtml(item)}</b>
      </article>`)
      .join("");
    const priorityCards = workflowEvents
      .slice(0, 3)
      .map((event, index) => {
        const rel = reliabilityByEvent[event.event_id];

        return `<article class="precedent-card">
          <div><span class="map-ref">P${index + 1}</span></div>
          <div>
            <strong>${escapeHtml(event.event_id)} - ${escapeHtml(event.municipality || "-")}</strong>
            <span>${escapeHtml(event.year || event.date || "-")} / ${escapeHtml(validityText(event.specific_cause, "-"))}</span>
          </div>
          <span>${escapeHtml(severityLabel(event.collapse_severity))} / ${rel?.grade || "D"}</span>
        </article>`;
      })
      .join("");
    const limitationCards = [
      it
        ? "Screening provinciale: non scala progettuale."
        : "Province-level screening: not design scale.",
      it
        ? "ARCUS non certifica sicurezza strutturale o condizione asset."
        : "ARCUS does not certify structural safety or asset condition.",
      it
        ? "Gli overlay pubblici orientano priorita e devono essere seguiti da verifiche sito-specifiche."
        : "Public overlays guide priorities and must be followed by site-specific checks.",
    ]
      .map((item) => `<div>${escapeHtml(item)}</div>`)
      .join("");
    const sourceGroups = new Map();

    workflowEvents.forEach((event) => {
      (sourcesByEventMap[event.event_id] || []).forEach((source) => {
        const key =
          source.source_url ||
          source.source_title ||
          source.source_id;

        if (!key) {
          return;
        }

        if (!sourceGroups.has(key)) {
          sourceGroups.set(key, {
            events: new Set(),
            source,
          });
        }

        sourceGroups.get(key).events.add(event.event_id);
      });
    });

    const sourceAppendixRows = Array.from(sourceGroups.values())
      .slice(0, 24)
      .map(({ events: linkedEvents, source }) => `<tr>
        <td>${escapeHtml(Array.from(linkedEvents).slice(0, 4).join(", "))}${linkedEvents.size > 4 ? ` +${linkedEvents.size - 4} more` : ""}</td>
        <td>${escapeHtml(validityText(source.source_title, it ? "Fonte senza titolo" : "Untitled source"))}</td>
        <td>${escapeHtml(validityText(source.source_type, "-"))}</td>
        <td>${escapeHtml(validityText(source.source_role, "-"))}</td>
        <td>${escapeHtml(validityText(source.publication_date, "-"))}</td>
        <td>${source.source_url ? `<a href="${escapeHtml(source.source_url)}">${escapeHtml(compactUrl(source.source_url))}</a>` : "-"}</td>
      </tr>`)
      .join("");
    const sourceAppendixRowsSafe =
      sourceAppendixRows ||
      `<tr><td colspan="6">${it ? "Nessuna fonte collegata agli eventi della provincia selezionata." : "No sources linked to events in the selected province."}</td></tr>`;
    const sourceAppendixCards = Array.from(sourceGroups.values())
      .slice(0, 8)
      .map(({ events: linkedEvents, source }) => `<article class="source-card">
        <span>${escapeHtml(Array.from(linkedEvents).slice(0, 3).join(", "))}${linkedEvents.size > 3 ? ` +${linkedEvents.size - 3} more` : ""} / ${escapeHtml(validityText(source.source_type, "-"))}</span>
        <strong>${escapeHtml(validityText(source.source_title, it ? "Fonte senza titolo" : "Untitled source"))}</strong>
        ${source.source_url ? `<a href="${escapeHtml(source.source_url)}">${escapeHtml(compactUrl(source.source_url))}</a>` : ""}
      </article>`)
      .join("");
    const sourceAppendixSection = `<section class="appendix-section source-appendix page-block">
      ${sectionHeading("A", it ? "SOURCE APPENDIX" : "SOURCE APPENDIX")}
      <p>${it ? `Fonti principali collegate agli eventi della provincia selezionata, deduplicate per titolo o URL. Totale fonti collegate nel briefing: ${workflowSourceCount}. La tabella completa delle fonti puo essere esportata separatamente da ARCUS Professional.` : `Main sources linked to events in the selected province, deduplicated by title or URL. Total linked sources in this briefing: ${workflowSourceCount}. The full source table can be exported separately from ARCUS Professional.`}</p>
      <div class="source-cards">${sourceAppendixCards || sourceAppendixRowsSafe}</div>
    </section>`;

    const scoringSection = `<section>
      <h2>${it ? "LOGICA DI SCORING" : "SCORING LOGIC"}</h2>
      <table>
        <thead><tr><th>${it ? "Modello" : "Model"}</th><th>${it ? "Come si legge" : "How to read it"}</th></tr></thead>
        <tbody>
          <tr><td>${it ? "Affidabilita evidenza" : "Evidence reliability"}</td><td>${it ? "Volume fonti, ruolo fonte, confidenza ARCUS, precisione spaziale e tracciabilita temporale." : "Source volume, source role, ARCUS confidence, spatial precision and temporal traceability."}</td></tr>
          <tr><td>${it ? "Vulnerabilita" : "Vulnerability"}</td><td>${it ? "Severita, trigger, causa specifica, tipo struttura, materiale, eta, impatto umano e penalita evidenza." : "Severity, trigger, specific cause, structure type, material, age, human impact and evidence penalty."}</td></tr>
          <tr><td>${it ? "Hazard territoriale" : "Territorial hazard"}</td><td>${it ? "Provider WFS pubblici dichiarati per l'esposizione puntuale idraulica e PAI frane; overlay WMS solo come controllo visuale." : "Declared public WFS providers for point-level hydraulic and PAI landslide exposure; WMS overlays remain visual checks only."}</td></tr>
          <tr><td>${it ? "Screening asset" : "Asset screening"}</td><td>${it ? "Posizione asset, eventi comparabili, corrispondenze vulnerabilita, campi tecnici e contesto territoriale." : "Asset location, comparable events, vulnerability matches, technical fields and territorial context."}</td></tr>
        </tbody>
      </table>
    </section>`;

    const methodologySection = `<section class="page-block">
      ${sectionHeading("15", it ? "METHODOLOGY SNAPSHOT" : "METHODOLOGY SNAPSHOT")}
      <p>${it ? "ARCUS combina evidenze storiche di collasso, affidabilita delle fonti, rilevanza spaziale, severita, trigger, similarita causale, contesto hazard territoriale e overlay WMS pubblici. Il briefing supporta screening e prioritizzazione preliminare: non e una certificazione di sicurezza strutturale." : "ARCUS combines historical collapse evidence, source reliability, spatial relevance, severity, triggers, cause similarity, territorial hazard context and public WMS overlays. The briefing supports preliminary screening and prioritisation: it is not a structural safety certification."}</p>
      <table>
        <thead><tr><th>${it ? "Componente" : "Component"}</th><th>${it ? "Uso nel briefing" : "Use in the briefing"}</th></tr></thead>
        <tbody>
          <tr><td>${it ? "Evidenza storica" : "Historical evidence"}</td><td>${it ? "Record ARCUS documentati, cause, trigger e severita." : "Documented ARCUS records, causes, triggers and severity."}</td></tr>
          <tr><td>${it ? "Affidabilita fonti" : "Source reliability"}</td><td>${it ? "Numero, ruolo e qualita delle fonti disponibili." : "Number, role and quality of available sources."}</td></tr>
          <tr><td>${it ? "Rilevanza spaziale" : "Spatial relevance"}</td><td>${it ? "Provincia selezionata e confine amministrativo provinciale." : "Selected province and administrative provincial boundary."}</td></tr>
          <tr><td>${it ? "Contesto hazard" : "Hazard context"}</td><td>${it ? "Esposizione puntuale ufficiale via WFS dove disponibile; WMS idraulici/frane solo come layer visuali di controllo." : "Official point exposure through WFS where available; hydraulic/landslide WMS only as visual control layers."}</td></tr>
          <tr><td>${it ? "Pattern storico ARCUS" : "ARCUS historical pattern"}</td><td>${it ? "Lettura del trigger dominante, della concentrazione temporale, della geomorfologia coinvolta e della qualita delle fonti. I casi singoli restano riferimento in mappa, appendice ed export." : "Reading of dominant trigger, temporal concentration, involved geomorphology and source quality. Individual cases remain references in the map, appendix and exports."}</td></tr>
        </tbody>
      </table>
    </section>
    <section>
      ${sectionHeading("16", it ? "SCORE AND CLASS LEGEND" : "SCORE AND CLASS LEGEND")}
      <table>
        <thead><tr><th>${it ? "Classe" : "Class"}</th><th>${it ? "Interpretazione" : "Interpretation"}</th></tr></thead>
        <tbody>${scoreLegendRows}</tbody>
      </table>
    </section>`;

    const pathMeta = [
      { num: "01", name: it ? "Nuovo Territorio" : "New Territory",       doc: it ? "Briefing Territoriale"       : "Territory Briefing"       },
      { num: "02", name: it ? "Asset Esistenti"  : "Existing Assets",     doc: it ? "Watchlist Operativa"         : "Operational Watchlist"     },
      { num: "03", name: it ? "Evento Estremo"   : "Extreme Event",       doc: it ? "Briefing Scenario"           : "Scenario Briefing"         },
      { num: "04", name: it ? "Due Diligence"    : "Due Diligence",       doc: it ? "Pacchetto Due Diligence"     : "Due Diligence Package"     },
      { num: "05", name: it ? "Research Intel."  : "Research Intel.",     doc: it ? "Output Ricerca"              : "Research Output"           },
    ][activeEntryPath];
    const reportSlug = reportAreaLabel
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");
    const reportId = `ARCUS-P${pathMeta.num}-${new Date()
      .toISOString()
      .slice(0, 10)
      .replaceAll("-", "")}-${reportSlug || "territory"}`;
    const exportVersion = "ARCUS Professional v1.0-preview";
    const spatialLevel = isPath01 || !manualAreaBounds
      ? provinceContext.spatialLevel
      : it
        ? "Area custom selezionata"
        : "Custom selected area";

    // CSS
    const css = `
      @page { size: A4; margin: 15mm 14mm; }
      * { box-sizing: border-box; }
      :root { color: #2f3437; background: #f8f7f2; font-family: Inter, Aptos, Arial, sans-serif; }
      body { margin: 0; background: #f8f7f2; color: #2f3437; }
      .report-footer { position: fixed; left: 14mm; right: 14mm; bottom: 6mm; display: flex; align-items: center; justify-content: space-between; gap: 18px; color: #7b817a; font-size: 8.5px; letter-spacing: 0.08em; text-transform: uppercase; }
      .report-footer span { white-space: nowrap; }
      .footer-logo { width: 18px; height: 18px; opacity: 0.55; margin-right: 7px; vertical-align: middle; }
      .cover { min-height: 680px; padding: 50px 58px 44px; position: relative; overflow: hidden; background: linear-gradient(180deg,#ffffff 0%,#f8f7f2 72%,#eef0eb 100%); color: #24313a; border: 1px solid #d9ddd5; border-top: 7px solid #9f7a3f; page-break-after: always; display: flex; flex-direction: column; justify-content: space-between; }
      .cover::before { content: ""; position: absolute; inset: 0; background: linear-gradient(90deg,rgba(47,64,72,.045) 1px,transparent 1px),linear-gradient(rgba(47,64,72,.035) 1px,transparent 1px); background-size: 52px 52px; opacity: .46; }
      .cover::after { content: ""; position: absolute; right: -80px; top: -110px; width: 330px; height: 330px; border: 1px solid rgba(159,122,63,.18); border-radius: 999px; background: radial-gradient(circle,rgba(159,122,63,.07),transparent 62%); }
      .cover > * { position: relative; z-index: 1; }
      .brief-output .cover { min-height: auto; padding: 30px 42px; page-break-after: avoid; }
      .brief-output .cover, .brief-output .report-footer { display: none; }
      .brief-output main { max-width: none; padding: 0; }
      .cover-logo { width: 188px; height: auto; display: block; margin-bottom: 34px; filter: saturate(1.12) contrast(1.08); }
      .brand { color: #9f7a3f; font-size: 36px; font-weight: 900; letter-spacing: 0.2em; }
      .path-badge { display: inline-block; margin-top: 0; padding: 7px 12px; border: 1px solid rgba(159,122,63,0.42); color: #6e5a31; background: rgba(159,122,63,.08); font-size: 10px; font-weight: 900; letter-spacing: 0.16em; text-transform: uppercase; }
      .cover h1 { max-width: 760px; margin: 22px 0 0; color: #24313a; font-family: Georgia, serif; font-size: 52px; line-height: 1.03; letter-spacing: 0; }
      .cover-subtitle { max-width: 650px; margin-top: 18px; color: #58615b; font-size: 15px; line-height: 1.58; text-align: justify; }
      .brief-output .cover h1 { font-size: 34px; }
      .meta { margin-top: 18px; color: #6f7770; font-size: 12px; font-weight: 800; letter-spacing: 0.1em; text-transform: uppercase; }
      .cover-meta-grid { display: grid; grid-template-columns: repeat(5, minmax(0, 1fr)); gap: 10px; margin-top: 40px; }
      .cover-meta-grid div { padding: 12px 10px; border: 1px solid #d9ddd5; background: rgba(255,255,255,.64); }
      .cover-meta-grid span { display: block; color: #8b6f3f; font-size: 9px; font-weight: 900; letter-spacing: 0.14em; text-transform: uppercase; }
      .cover-meta-grid strong { display: block; margin-top: 6px; color: #24313a; font-size: 12px; line-height: 1.35; }
      main { max-width: 1040px; margin: 0 auto; padding: 32px 38px 70px; }
      .kpis { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 10px; margin: 18px 0 24px; }
      .kpi { min-height: 118px; display: grid; grid-template-rows: auto auto 1fr; padding: 14px 15px; border: 1px solid #d9ddd5; background: #ffffff; box-shadow: none; }
      .kpi > span { color: #68736d; font-size: 8.8px; font-weight: 900; letter-spacing: 0.12em; text-transform: uppercase; }
      .kpi strong { display: flex; align-items: flex-end; min-height: 38px; margin-top: 8px; color: #8f6f3d; font-size: 27px; font-weight: 800; line-height: 1.05; }
      .kpi p { margin: 9px 0 0; font-size: 10.8px; line-height: 1.42; text-align: left; }
      .kpi-class, .kpi-driver { display: block; color: #46515a; font-weight: 700; letter-spacing: 0; text-transform: none; }
      .kpi-class em { display: inline-block; padding: 4px 7px; background: #eef0eb; border: 1px solid #d9ddd5; color: #6e5a31; font-style: normal; font-size: 8.8px; font-weight: 900; letter-spacing: 0.08em; text-transform: uppercase; }
      .kpi-driver { margin-top: 3px; color: #68736d; font-weight: 600; }
      .index-layer-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 10px; margin: 14px 0 12px; }
      .index-layer-card { min-height: 142px; padding: 14px 16px; border: 1px solid #d9ddd5; background: #ffffff; border-top: 4px solid #9f7a3f; }
      .index-layer-card span { display: block; color: #68736d; font-size: 8.8px; font-weight: 900; letter-spacing: .12em; text-transform: uppercase; }
      .index-layer-card strong { display: block; margin-top: 7px; color: #24313a; font-size: 16px; line-height: 1.15; }
      .index-layer-card b { display: block; margin-top: 9px; color: #8f6f3d; font-size: 24px; line-height: 1.05; }
      .index-layer-card p { margin-top: 9px; font-size: 11px; line-height: 1.45; text-align: justify; }
      .confidence-pill { display: inline-block; margin-top: 8px; padding: 4px 7px; background: #eef0eb; border: 1px solid #d9ddd5; color: #6e5a31; font-size: 8.8px; font-weight: 900; letter-spacing: .08em; text-transform: uppercase; }
      section { margin-top: 13px; padding: 18px 20px; border: 1px solid #d9ddd5; background: rgba(255,255,255,0.94); break-inside: avoid; page-break-inside: avoid; overflow-wrap: anywhere; }
      .brief-page { page-break-before: avoid; }
      .brief-sheet { width: 178mm; min-height: 260mm; display: grid; grid-template-rows: auto auto 1fr auto; gap: 6px; margin: 0; padding: 0; border: 0; background: transparent; box-shadow: none; }
      .brief-sheet-head { display: grid; grid-template-columns: 112px 1fr 182px; gap: 14px; align-items: start; padding-bottom: 8px; border-bottom: 2px solid #7f8a84; }
      .brief-sheet-head .cover-logo { width: 92px; margin: 0; }
      .brief-sheet-head h1 { color: #24313a; font-family: Georgia, serif; font-size: 24px; line-height: 1.02; margin: 2px 0 0; }
      .brief-sheet-head p { margin: 5px 0 0; color: #58615b; font-size: 8.7px; line-height: 1.3; text-align: justify; }
      .brief-meta { display: grid; grid-template-columns: repeat(2, 1fr); gap: 5px; }
      .brief-meta div { padding: 6px 7px; border: 1px solid #d9ddd5; background: #ffffff; }
      .brief-meta span, .brief-kicker, .brief-box span { display: block; color: #8f6f3d; font-size: 7.4px; font-weight: 900; letter-spacing: .13em; text-transform: uppercase; }
      .brief-meta strong { display: block; margin-top: 3px; color: #24313a; font-size: 8.4px; line-height: 1.2; }
      .brief-top { display: grid; grid-template-columns: 1.04fr .96fr; gap: 8px; }
      .brief-panel { margin: 0; padding: 8px 9px; border: 1px solid #d9ddd5; background: rgba(255,255,255,.94); }
      .brief-panel h2 { margin: 0 0 6px; color: #24313a; font-family: Georgia, serif; font-size: 15px; line-height: 1.05; letter-spacing: 0; text-transform: none; }
      .brief-panel h2 span { margin-right: 6px; color: #8f6f3d; font-family: Arial, sans-serif; font-size: 8px; letter-spacing: .14em; }
      .brief-map .map-image-frame figcaption, .brief-map .atlas-extract figcaption { display: none; }
      .brief-map .map-image-frame img { height: 56mm; aspect-ratio: 900 / 760; object-fit: contain; max-height: none; background: #f3f1ea; }
      .brief-map .report-map-legend { gap: 4px 7px; margin-top: 5px; padding: 5px 6px; font-size: 7.2px; line-height: 1.2; }
      .brief-map .report-map-legend i { width: 6px; height: 6px; box-shadow: 0 0 0 2px rgba(47,52,55,.10); }
      .brief-signal { background: #f7f7f1; color: #24313a; border-color: #9f7a3f; box-shadow: inset 0 0 0 2px rgba(159,122,63,.08); }
      .brief-signal h2, .brief-signal p, .brief-signal li { color: #4f463d; }
      .brief-signal > strong { color: #24313a; }
      .brief-signal p { margin: 6px 0 0; font-size: 8.6px; line-height: 1.36; }
      .brief-kpi-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 5px; margin-top: 8px; }
      .brief-kpi { padding: 7px; border: 1px solid rgba(159,122,63,.32); background: #f8f7f2; }
      .brief-kpi span { display: block; color: #8f6f3d; font-size: 7px; font-weight: 900; letter-spacing: .12em; text-transform: uppercase; }
      .brief-kpi strong { display: block; margin-top: 4px; color: #24313a; font-size: 15px; line-height: 1; }
      .brief-bottom { display: grid; grid-template-columns: .92fr 1.16fr .92fr; gap: 7px; }
      .brief-box { margin: 0; padding: 7px 8px; border: 1px solid #d9ddd5; background: #ffffff; }
      .brief-box h3 { margin: 0 0 6px; color: #24313a; font-family: Georgia, serif; font-size: 13.5px; line-height: 1.05; }
      .brief-case-note { margin: 0 0 5px; color: #4f463d; font-size: 7.6px; line-height: 1.24; font-weight: 700; overflow-wrap: anywhere; }
      .brief-limit-note { margin: 7px 0 0; padding-top: 6px; border-top: 1px solid #d9ddd5; color: #6e5a31; font-size: 7.2px; line-height: 1.24; font-weight: 800; overflow-wrap: anywhere; }
      .brief-box ul, .brief-box ol { margin: 0; padding-left: 15px; }
      .brief-box li { margin-bottom: 3px; color: #4f463d; font-size: 8px; line-height: 1.27; overflow-wrap: anywhere; }
      .brief-limit { background: #f8f7f2; border-left: 4px solid #9f7a3f; }
      .brief-export { display: flex; align-items: center; justify-content: space-between; gap: 8px; padding-top: 6px; border-top: 1px solid #d9ddd5; color: #6e5a31; font-size: 7.2px; font-weight: 800; letter-spacing: .08em; text-transform: uppercase; }
      .brief-export strong { color: #24313a; }
      .executive-section { border-color: #9f7a3f; background: #ffffff; box-shadow: none; }
      .page-block { break-before: auto; page-break-before: auto; }
      .report-map-section { break-after: auto; page-break-after: auto; }
      .hazard-section { break-before: auto; page-break-before: auto; }
      .appendix-section { background: #f8f7f2; }
      h2 { display: flex; align-items: center; gap: 10px; margin: 0 0 14px; color: #6e5a31; font-size: 10px; font-weight: 900; letter-spacing: 0.14em; text-transform: uppercase; break-after: avoid; page-break-after: avoid; }
      .section-number { display: inline-flex; width: 28px; height: 22px; align-items: center; justify-content: center; background: #eef0eb; border: 1px solid #d9ddd5; color: #8f6f3d; font-size: 10px; letter-spacing: 0; }
      p, li { color: #46515a; line-height: 1.58; font-size: 13px; text-align: justify; overflow-wrap: anywhere; }
      p { margin: 0 0 10px; }
      ol, ul { margin: 0; padding-left: 20px; }
      li { margin-bottom: 6px; }
      table { width: 100%; border-collapse: collapse; font-size: 12px; margin-top: 10px; }
      th { background: #e5e3da; color: #24313a; text-align: left; font-size: 10px; font-weight: 800; letter-spacing: 0.1em; text-transform: uppercase; }
      th, td { border: 1px solid #d9ddd5; padding: 8px 10px; vertical-align: top; overflow-wrap: anywhere; }
      td { text-align: left; }
      tr:nth-child(even) td { background: #f8f7f2; }
      .area-sketch { min-height: 160px; margin: 14px 0; display: grid; place-items: center; border: 1px dashed #9f7a3f; background: linear-gradient(90deg,rgba(110,133,141,.10) 1px,transparent 1px),linear-gradient(rgba(110,133,141,.10) 1px,transparent 1px),#f8f7f2; background-size: 32px 32px; }
      .area-sketch > div { width: 60%; min-height: 86px; padding: 16px; border: 3px solid #9f7a3f; background: rgba(159,122,63,.10); }
      .area-sketch span { color: #6e5a31; font-size: 10px; font-weight: 800; letter-spacing: 0.1em; text-transform: uppercase; display: block; margin-bottom: 6px; }
      .area-sketch strong { display: block; color: #24313a; font-size: 18px; margin-bottom: 4px; }
      .area-sketch p { color: #6e5a31; font-size: 11px; margin: 0; }
      .note { background: #f8f7f2; border-left: 3px solid #9f7a3f; padding: 12px 16px; margin-top: 10px; font-size: 12px; color: #46515a; }
      .decision-box { margin-top: 18px; padding: 15px 17px; background: #eef0eb; color: #24313a; border: 1px solid #d9ddd5; border-left: 6px solid #9f7a3f; font-weight: 800; line-height: 1.5; text-align: justify; }
      .asset-statement { padding: 12px 14px; border: 1px solid rgba(159,122,63,.42); background: #f8f7f2; color: #24313a; font-weight: 800; }
      .flag-box { margin-top: 16px; padding: 16px 18px; border: 1px solid #d9ddd5; border-top: 4px solid #9f7a3f; background: #ffffff; color: #46515a; box-shadow: none; }
      .flag-box span { display: block; color: #8f6f3d; font-size: 9px; font-weight: 900; letter-spacing: .14em; text-transform: uppercase; }
      .flag-box ul { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 6px 16px; margin: 10px 0 0; padding-left: 17px; }
      .flag-box li { color: #46515a; font-size: 11px; line-height: 1.42; margin-bottom: 4px; }
      .findings-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; margin-top: 16px; }
      .finding { padding: 14px; background: #f8f7f2; border: 1px solid #d9ddd5; }
      .finding span { display: block; color: #8f6f3d; font-size: 10px; font-weight: 900; letter-spacing: 0.12em; text-transform: uppercase; }
      .finding strong { display: block; margin-top: 8px; font-size: 13px; line-height: 1.45; }
      .signal-band { display: grid; grid-template-columns: 1.05fr .95fr; gap: 12px; margin-top: 12px; }
      .operational-grid { display: grid; grid-template-columns: 1.05fr .95fr; gap: 10px; margin-top: 12px; }
      .operational-grid .reading-card { grid-column: 1 / -1; background: #eef0eb; color: #24313a; border-color: #d9ddd5; border-left: 5px solid #9f7a3f; }
      .operational-grid .reading-card strong, .operational-grid .reading-card p { color: #24313a; }
      .attention-badges { display: flex; flex-wrap: wrap; gap: 7px; margin-top: 10px; }
      .attention-badges span { display: inline-flex; align-items: center; padding: 6px 8px; border: 1px solid #d9ddd5; background: #f8f7f2; color: #46515a; font-size: 10px; font-weight: 800; letter-spacing: 0; text-transform: none; }
      .signal-card, .action-card, .data-card { padding: 14px; border: 1px solid #d9ddd5; background: #ffffff; }
      .signal-card.dark { background: #eef0eb; color: #24313a; border-color: #d9ddd5; border-left: 5px solid #9f7a3f; }
      .signal-card.dark p, .signal-card.dark li { color: #24313a; }
      .signal-card span, .action-card span, .data-card span { display: block; color: #8f6f3d; font-size: 9px; font-weight: 900; letter-spacing: .13em; text-transform: uppercase; }
      .signal-card strong { display: block; margin-top: 7px; color: #24313a; font-size: 17px; line-height: 1.25; }
      .signal-card.dark strong { color: #24313a; }
      .signal-card p { margin: 8px 0 0; }
      .action-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px; margin-top: 12px; }
      .action-card b, .data-card b { display: block; margin-top: 5px; color: #24313a; font-size: 13px; line-height: 1.35; }
      .data-grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 8px; margin-top: 12px; }
      .data-card { min-height: 84px; background: #ffffff; border-top: 4px solid #9f7a3f; }
      .data-card b { font-size: 12px; }
      .limitation-strip { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; margin-top: 12px; }
      .limitation-strip div { padding: 10px 12px; background: #f8f7f2; border-left: 3px solid #9f7a3f; color: #46515a; font-size: 10.5px; line-height: 1.45; }
      .precedent-list { display: grid; gap: 8px; margin-top: 12px; }
      .precedent-card { display: grid; grid-template-columns: 46px 1fr 90px; gap: 10px; align-items: center; padding: 10px 12px; border: 1px solid #d9ddd5; background: #ffffff; }
      .precedent-card .map-ref { display: inline-block; min-width: 34px; padding: 4px 6px; background: #eef0eb; border: 1px solid #d9ddd5; color: #8f6f3d; font-weight: 900; text-align: center; }
      .precedent-card strong { color: #24313a; font-size: 12px; }
      .precedent-card span { color: #6e5a31; font-size: 10px; font-weight: 800; }
      .source-cards { display: grid; grid-template-columns: repeat(2, 1fr); gap: 8px; margin-top: 12px; }
      .source-card { padding: 10px 12px; border: 1px solid #d9ddd5; background: #ffffff; }
      .source-card strong { display: block; color: #24313a; font-size: 11px; line-height: 1.35; }
      .source-card span { color: #6e5a31; font-size: 9px; font-weight: 800; letter-spacing: .08em; text-transform: uppercase; }
      .source-card a { display: block; margin-top: 6px; color: #6e5a31; font-size: 9px; word-break: break-all; }
      .mini-bars { display: grid; gap: 7px; margin-top: 12px; }
      .mini-bar { display: grid; grid-template-columns: 150px 1fr 42px; align-items: center; gap: 8px; color: #4f463d; font-size: 10px; font-weight: 800; }
      .mini-bar i { display: block; height: 8px; background: #eadfcc; }
      .mini-bar b { display: block; height: 8px; background: #c49040; }
      .split-two { display: grid; grid-template-columns: 0.85fr 1.15fr; gap: 16px; align-items: stretch; }
      .report-map-section .split-two { grid-template-columns: 1fr; }
      .report-map-section .map-image-frame img { height: 430px; object-fit: contain; background: #f3f1ea; }
      .report-map-section .atlas-map-svg { min-height: 360px; }
      .atlas-extract { position: relative; margin: 0; border: 1px solid #d9ddd5; background: #ffffff; overflow: hidden; }
      .atlas-map-svg { display: block; width: 100%; height: auto; min-height: 260px; }
      .atlas-title text:first-child { fill: #24313a; font-size: 22px; font-weight: 900; font-family: Georgia, serif; }
      .atlas-title text:last-child { fill: #6e5b45; font-size: 12px; font-weight: 800; letter-spacing: 0.08em; text-transform: uppercase; }
      .atlas-label { fill: #24313a; font-size: 10px; font-weight: 900; paint-order: stroke; stroke: #ffffff; stroke-width: 3px; stroke-linejoin: round; }
      .atlas-north rect { fill: #eef0eb; stroke: #d9ddd5; stroke-width: 1px; }
      .atlas-north text { fill: #8f6f3d; font-size: 18px; font-weight: 900; }
      .atlas-priority-label rect { fill: #eef0eb; stroke: #d9ddd5; stroke-width: 1.2px; }
      .atlas-priority-label text { fill: #8f6f3d; font-size: 11px; font-weight: 900; letter-spacing: 0.08em; }
      .atlas-scale text { fill: #24313a; font-size: 10px; font-weight: 800; letter-spacing: 0.06em; text-transform: uppercase; }
      .atlas-extract figcaption { padding: 10px 12px; color: #6e5b45; font-size: 11px; line-height: 1.45; border-top: 1px solid #d9ddd5; }
      .atlas-extract figcaption strong { color: #24313a; margin-right: 6px; }
      .atlas-legend { display: flex; flex-wrap: wrap; gap: 8px 14px; padding: 0 12px 12px; color: #46515a; font-size: 10px; font-weight: 900; letter-spacing: 0.06em; text-transform: uppercase; }
      .atlas-legend span { display: inline-flex; align-items: center; gap: 6px; }
      .atlas-legend i { display: inline-block; width: 9px; height: 9px; border-radius: 999px; box-shadow: 0 0 0 3px rgba(47,52,55,.10); }
      .legend-critical { background: #9b3d31; }
      .legend-triggered { background: #c49040; }
      .legend-context { background: #53676d; }
      .legend-hydraulic { background: #3F6B78; }
      .legend-landslide { background: #B56A1D; }
      .legend-seismic { background: #6E858D; }
      .map-frame { position: relative; min-height: 260px; overflow: hidden; border: 1px solid #d9ddd5; background: #eef0eb; }
      .map-grid { position: absolute; inset: 0; background: linear-gradient(90deg,rgba(58,73,69,.12) 1px,transparent 1px),linear-gradient(rgba(58,73,69,.12) 1px,transparent 1px),radial-gradient(circle at 25% 40%,rgba(110,133,141,.32),transparent 18%),radial-gradient(circle at 76% 62%,rgba(196,144,64,.24),transparent 20%); background-size: 32px 32px,32px 32px,100% 100%,100% 100%; }
      .map-area-box { position: absolute; inset: 28px 42px 52px; border: 2px solid rgba(196,144,64,.9); background: rgba(196,144,64,.08); }
      .map-pin { position: absolute; width: 9px; height: 9px; margin: -4px 0 0 -4px; border-radius: 999px; box-shadow: 0 0 0 4px rgba(47,52,55,.10); }
      .map-pin-critical { background: #9b3d31; }
      .map-pin-triggered { background: #c49040; }
      .map-pin-context { background: #53676d; }
      .map-north { position: absolute; right: 18px; top: 16px; width: 30px; height: 30px; display: grid; place-items: center; background: #eef0eb; border: 1px solid #d9ddd5; color: #8f6f3d; font-weight: 900; }
      .map-scale { position: absolute; left: 18px; bottom: 62px; color: #24313a; font-size: 10px; font-weight: 800; }
      .map-scale span { display: block; width: 96px; height: 5px; margin-bottom: 4px; background: linear-gradient(90deg,#5f6e75 0 25%,#f8f7f2 25% 50%,#5f6e75 50% 75%,#f8f7f2 75% 100%); border: 1px solid #5f6e75; }
      .map-legend { position: absolute; top: 16px; left: 18px; display: grid; gap: 5px; padding: 8px 10px; background: rgba(255,255,255,.9); border: 1px solid #d9ddd5; font-size: 10px; font-weight: 800; color: #46515a; }
      .map-legend span { display: flex; align-items: center; gap: 6px; }
      .map-legend i { display: inline-block; width: 8px; height: 8px; border-radius: 999px; }
      .map-caption { position: absolute; left: 16px; right: 16px; bottom: 14px; display: flex; justify-content: space-between; gap: 18px; padding: 10px 12px; background: rgba(255,255,255,.9); border: 1px solid #d9ddd5; color: #46515a; font-size: 11px; }
      .map-caption strong { color: #8f6f3d; }
      .map-image-frame { margin: 0; border: 1px solid #d9ddd5; background: #ffffff; break-inside: avoid; page-break-inside: avoid; }
      .map-image-frame img { display: block; width: 100%; height: auto; }
      .map-image-frame iframe { display: block; width: 100%; aspect-ratio: 900 / 760; border: 0; background: #e9e2d8; }
      .map-image-frame figcaption { padding: 10px 12px; color: #6e5a31; font-size: 11px; line-height: 1.42; overflow-wrap: anywhere; }
      .brief-map .map-image-frame iframe { aspect-ratio: 900 / 760; }
      .report-map-legend { display: flex; flex-wrap: wrap; gap: 8px 14px; margin-top: 10px; padding: 9px 11px; border: 1px solid #d9ddd5; background: #ffffff; color: #46515a; font-size: 10px; font-weight: 900; letter-spacing: .06em; text-transform: uppercase; break-inside: avoid; page-break-inside: avoid; }
      .report-map-legend span { display: inline-flex; align-items: center; gap: 6px; }
      .report-map-legend i { width: 9px; height: 9px; display: inline-block; border-radius: 999px; box-shadow: 0 0 0 3px rgba(47,52,55,.10); }
      .legend-critical { background: #9b3d31; }
      .legend-triggered { background: #c49040; }
      .legend-context { background: #53676d; }
      .legend-hydraulic { background: #3F6B78; }
      .legend-landslide { background: #B56A1D; }
      .legend-seismic { background: #6E858D; }
      .table-caption { margin-top: 8px; color: #6e5a31; font-size: 11px; font-weight: 700; text-align: left; }
      .source-appendix table { font-size: 9px; }
      .source-appendix td, .source-appendix th { word-break: break-word; }
      @media print { body { background: white; } .cover, .kpi, .decision-box, .flag-box, .finding, th, .report-map-legend, .report-map-legend i, .atlas-point circle, .atlas-priority-label rect, .map-pin, .signal-card.dark, .mini-bar b, .precedent-card .map-ref { print-color-adjust: exact; -webkit-print-color-adjust: exact; } table { page-break-inside: auto; } thead { display: table-header-group; } tr { page-break-inside: avoid; } }
    `;

    // Path-specific body
    let pathBody;

    // PATH 0 - Territory Briefing
    if (activeEntryPath === 0) {
      pathBody = `
      <section class="executive-section">
        ${sectionHeading("01", it ? "EXECUTIVE SUMMARY" : "EXECUTIVE SUMMARY")}
        <p>${it ? `La provincia selezionata richiede attenzione ${attentionAdjective} per nuovi interventi ${projectDesignFocus.contextLabel} e pianificazione territoriale. Il segnale e guidato principalmente da ${dominantDriverPhrase}, documentati nel database ARCUS e supportati da ${workflowSourceCount} fonti collegate.` : `The selected province requires ${attentionAdjective} attention for new ${projectDesignFocus.contextLabel} interventions and territorial planning. The signal is mainly driven by ${dominantDriverPhrase}, documented in the ARCUS database and supported by ${workflowSourceCount} linked sources.`}</p>
        <div class="decision-box">${escapeHtml(decisionOutcome)}</div>
        <div class="findings-grid">
          ${topFindings.map((finding, index) => `<div class="finding"><span>${it ? "Finding" : "Finding"} ${index + 1}</span><strong>${escapeHtml(finding)}</strong></div>`).join("")}
        </div>
        <div class="flag-box">
          <span>${it ? "Why ARCUS flags this" : "Why ARCUS flags this"}</span>
          <ul>${flagReasons.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>
        </div>
      </section>
      <section class="page-block report-map-section">
        ${sectionHeading("02", it ? "SELECTED PROVINCE & REAL MAP" : "SELECTED PROVINCE & REAL MAP")}
        <div class="split-two">
          <div>
            <p>${escapeHtml(reportAreaDescription)}</p>
            ${selectedAreaSketch}
            <table>
              <thead><tr><th>${it ? "Selection type" : "Selection type"}</th><th>${it ? "Provincia" : "Province"}</th><th>${it ? "Regione" : "Region"}</th><th>${it ? "Project context" : "Project context"}</th><th>${it ? "Generato" : "Generated"}</th></tr></thead>
              <tbody><tr><td>${escapeHtml(provinceContext.selectionType)}</td><td>${escapeHtml(provinceContext.areaLabel)}</td><td>${escapeHtml(provinceContext.region)}</td><td>${escapeHtml(provinceContext.projectContext)}</td><td>${provinceContext.generatedOn}</td></tr></tbody>
            </table>
            <p class="table-caption">${it ? `Fonte geometria: ${provinceContext.geometrySource}. Regione: ${provinceContext.region}.` : `Geometry source: ${provinceContext.geometrySource}. Region: ${provinceContext.region}.`}</p>
          </div>
          <div>
            ${reportMapFrame}
            ${reportMapLegend}
          </div>
        </div>
      </section>
      <section>
        ${sectionHeading("03", it ? "HOW TO READ THIS REPORT" : "HOW TO READ THIS REPORT")}
        <p>${it ? "ARCUS parte dalla provincia selezionata, legge tutti i record ARCUS disponibili per quell'area amministrativa, identifica il pattern territoriale dominante e lo traduce in verifiche operative successive. E screening provinciale, non certificazione di sicurezza strutturale." : "ARCUS starts from the selected province, reads all ARCUS records available for that administrative area, identifies the dominant territorial pattern and translates that signal into operational next checks. This is province-level screening, not structural safety certification."}</p>
      </section>
      <section>
        ${sectionHeading("04", it ? "KEY INDICATORS" : "KEY INDICATORS")}
        <div class="kpis">
        <div class="kpi"><span>Priority Index</span><strong>${scoreLabel} / 100</strong>${formatKpi({ level: classPriority(score), driver: it ? `${workflowHazardExposure?.dominant_hazard || "hazard context"}, densita casi ARCUS, eventi innescati e affidabilita evidenze.` : `${workflowHazardExposure?.dominant_hazard || "hazard context"}, ARCUS case density, triggered-event concentration and evidence reliability.` })}</div>
        <div class="kpi"><span>${it ? "Affidabilita Evidenze" : "Evidence Reliability"}</span><strong>${evidenceGradeFromScore(workflowReliability.average)} / ${Math.round(workflowReliability.average)} / 100</strong>${formatKpi({ level: reliabilityLabel, driver: it ? `${workflowSourceCount} fonti collegate e ${workflowReliability.institutionalShare}% evidenza professional-grade.` : `${workflowSourceCount} linked sources and ${workflowReliability.institutionalShare}% professional-grade evidence.` })}</div>
        <div class="kpi"><span>Failure Precedent Exposure</span><strong>${Math.round(workflowVulnerability.average)} / 100</strong>${formatKpi({ level: attentionClass(workflowVulnerability.average), driver: it ? `Pattern storico ${dominantCauseLabel}; indicatore source-backed, non certificazione strutturale.` : `Historical ${dominantCauseLabel} pattern; source-backed indicator, not structural certification.` })}</div>
        <div class="kpi"><span>${it ? "Eventi Storici" : "Historical Events"}</span><strong>${workflowEvents.length}</strong>${formatKpi({ level: `${percentage(dominantCauseCount, workflowEvents.length || 1)}% ${dominantCauseLabel}`, driver: it ? `${dominantCauseCount} occorrenze del driver dominante su ${workflowEvents.length} casi.` : `${dominantCauseCount} dominant-driver occurrences out of ${workflowEvents.length} cases.` })}</div>
        </div>
      </section>
      <section class="hazard-section">
        ${sectionHeading("05", it ? "HAZARD CONTEXT" : "HAZARD CONTEXT")}
        <p>${it ? `Layer dominante: <strong>${workflowHazardExposure?.dominant_hazard || "N/D"}</strong>. I layer WMS pubblici idraulici e franosi sono correlati ai crolli ARCUS nella provincia selezionata.` : `Dominant layer: <strong>${workflowHazardExposure?.dominant_hazard || "N/A"}</strong>. Public hydraulic and landslide WMS layers are correlated with ARCUS collapses in the selected province.`}</p>
        <table>
          <thead><tr><th>Layer</th><th>Score</th><th>${it ? "Crolli correlati" : "Matched collapses"}</th><th>Share</th></tr></thead>
          <tbody>${hazardRowsSafe}</tbody>
        </table>
        ${officialPointExposureTable}
        <p class="note">${escapeHtml(hazardInterpretation)}</p>
      </section>
      <section>
        ${sectionHeading("06", it ? "HISTORICAL EVIDENCE" : "HISTORICAL EVIDENCE")}
        <p>${it ? `Distribuzione delle cause ricorrenti nel contesto selezionato. I record non classificati sono mantenuti nel set provinciale, cosi il totale resta coerente con i ${workflowEvents.length} eventi analizzati.` : `Distribution of recurring causes in the selected context. Unclassified records are retained in the provincial set, so the total remains consistent with the ${workflowEvents.length} analysed events.`}</p>
        <table>
          <thead><tr><th>#</th><th>${it ? "Causa" : "Cause"}</th><th>${it ? "Occorrenze" : "Occurrences"}</th><th>Share</th></tr></thead>
          <tbody>${causeRows}</tbody>
        </table>
        <p class="note">${escapeHtml(historicalInterpretation)}</p>
      </section>
      <section>
        ${sectionHeading("07", it ? "PRIORITY ARCUS CASES" : "PRIORITY ARCUS CASES")}
        <table>
          <thead><tr><th>ID</th><th>${it ? "Comune" : "Municipality"}</th><th>${it ? "Severita" : "Severity"}</th><th>${it ? "Causa" : "Cause"}</th><th>${it ? "Evidenza" : "Evidence"}</th><th>${it ? "Attention indicator" : "Attention indicator"}</th><th>${it ? "Why flagged" : "Why flagged"}</th></tr></thead>
          <tbody>${eventRows}</tbody>
        </table>
        <p class="table-caption">${it ? "Nel corpo principale sono mostrati i primi 5 eventi. La tabella completa e disponibile negli export professionali." : "The main body shows the top 5 events. The full event table is available through professional exports."}</p>
        <p class="note">${escapeHtml(priorityInterpretation)}</p>
      </section>
      <section>
        ${sectionHeading("08", it ? "TERRITORIAL PATTERN INTERPRETATION" : "TERRITORIAL PATTERN INTERPRETATION")}
        <p>${it ? "La provincia selezionata contiene tutti i record ARCUS disponibili per quell'area amministrativa. Nel corpo principale i casi singoli servono a spiegare il pattern storico documentato; la consultazione dettagliata resta in mappa, appendice ed export." : "The selected province contains all ARCUS records available for that administrative area. In the main body, individual cases explain the documented historical pattern; detailed review remains in the map, appendix and exports."}</p>
      </section>
      <section>
        ${sectionHeading("09", it ? "INTERPRETATION" : "INTERPRETATION")}
        <p>${it ? `Per nuovi interventi ${selectedProjectContext}, ARCUS segnala ${classPriority(score).toLowerCase()} per ${reportAreaLabel}. La lettura deriva dai casi ARCUS provinciali, dal contesto hazard e dalla qualita dell'evidenza: non indica automaticamente una criticita strutturale, ma orienta le verifiche successive.` : `For new ${selectedProjectContext} interventions, ARCUS indicates ${classPriority(score).toLowerCase()} for ${reportAreaLabel}. The reading is derived from provincial ARCUS cases, hazard context and evidence quality: it does not automatically indicate structural criticality, but guides follow-up checks.`}</p>
      </section>
      <section>
        ${sectionHeading("10", it ? "PROJECT-CONTEXT DESIGN FOCUS" : "PROJECT-CONTEXT DESIGN FOCUS")}
        <table>
          <tbody>
            <tr><td>${it ? "Contesto progettuale" : "Project context"}</td><td>${escapeHtml(projectDesignFocus.contextLabel)}</td></tr>
            <tr><td>${it ? "Driver dominante" : "Dominant driver"}</td><td>${escapeHtml(projectDesignFocus.dominantCause)}</td></tr>
            <tr><td>${it ? "Comuni / Casi Prioritari" : "Priority Municipalities / Cases"}</td><td>${escapeHtml(projectDesignFocus.clusters)}</td></tr>
          </tbody>
        </table>
        <p>${escapeHtml(projectDesignFocus.paragraph)}</p>
        <ul>${designFocusRows}</ul>
        <p class="note">${it ? "Punti di attenzione preliminari: non sono prescrizioni progettuali e devono essere trasformati in verifiche sito-specifiche da professionisti abilitati." : "Preliminary attention points: these are not design prescriptions and must be translated into site-specific checks by qualified professionals."}</p>
      </section>
      <section>
        ${sectionHeading("11", it ? "DECISION USE" : "DECISION USE")}
        <table>
          <thead><tr><th>${it ? "Can support" : "Can support"}</th><th>${it ? "Should not be used as" : "Should not be used as"}</th></tr></thead>
          <tbody><tr>
            <td>${it ? "screening territoriale preliminare, priorita di indagine, due diligence documentale, lettura del pattern storico ARCUS e impostazione di richieste tecniche successive." : "preliminary territorial screening, investigation priorities, documentary due diligence, ARCUS historical-pattern reading and framing of follow-up technical requests."}</td>
            <td>${it ? "certificazione di sicurezza strutturale, verifica progettuale, autorizzazione amministrativa, modello idraulico/geotecnico/sismico di dettaglio o sostituto di ispezioni in sito." : "structural safety certification, design verification, administrative authorisation, detailed hydraulic/geotechnical/seismic model or substitute for field inspections."}</td>
          </tr></tbody>
        </table>
      </section>
      <section>
        ${sectionHeading("12", it ? "MITIGATION INTELLIGENCE" : "MITIGATION INTELLIGENCE")}
        <p><strong>Status:</strong> ${escapeHtml(mitigationStatus)}. ${escapeHtml(mitigationEvidenceSummary)}</p>
        <p><strong>${it ? "Base di evidenza" : "Evidence basis"}:</strong> ${escapeHtml(mitigationCohortSummary)}</p>
        <p><strong>${it ? "Registro episodi" : "Episode registry"}:</strong> ${escapeHtml(mitigationRegistrySummary)}</p>
        <p><strong>${it ? "Robustezza retrieval" : "Retrieval robustness"}:</strong> ${escapeHtml(mitigationRobustnessSummary)}</p>
        ${mitigationAnalogueRows ? `
          <table>
            <thead><tr>
              <th>Rank</th>
              <th>Event ID</th>
              <th>${it ? "Localita" : "Location"}</th>
              <th>${it ? "Classe idraulica attuale" : "Current hydraulic class"}</th>
              <th>${it ? "Delta PGA (g)" : "PGA delta (g)"}</th>
              <th>${it ? "Classe storica al collasso" : "Historical class at collapse"}</th>
            </tr></thead>
            <tbody>${mitigationAnalogueRows}</tbody>
          </table>` : ""}
        <ol>${recommendationRows}</ol>
        <p class="note">${escapeHtml(mitigationTemporalCaveat)}</p>
        <p class="note">${it ? "Output non prescrittivo: non modifica il Final Priority Index e richiede validazione tecnica sito-specifica." : "Non-prescriptive output: it does not modify the Final Priority Index and requires site-specific technical validation."}</p>
      </section>
      <section>
        ${sectionHeading("13", it ? "NATIONAL BENCHMARK" : "NATIONAL BENCHMARK")}
        <table>
          <thead><tr><th>${it ? "Indicatore" : "Indicator"}</th><th>${it ? "Selezionato" : "Selected"}</th><th>${it ? "Media ARCUS" : "ARCUS average"}</th><th>Status</th></tr></thead>
          <tbody>${benchmarkRows}</tbody>
        </table>
        <p class="note">${escapeHtml(benchmarkInterpretation)}</p>
      </section>
      <section>
        ${sectionHeading("14", it ? "DATA COVERAGE & LIMITATIONS" : "DATA COVERAGE & LIMITATIONS")}
        <table>
          <thead><tr><th>${it ? "Elemento" : "Element"}</th><th>${it ? "Lettura operativa" : "Operational reading"}</th></tr></thead>
          <tbody>
            <tr><td>Spatial resolution</td><td>${it ? "L'esposizione ufficiale e valutata sul punto progetto validato; la provincia derivata dal punto descrive il contesto storico locale. Quando il gate di copertura e soddisfatto, gli analoghi sono ricercati sull'intero database nazionale senza filtro geografico." : "Official exposure is assessed at the validated project point; the point-derived province describes local historical context. When the coverage gate is met, analogues are retrieved across the national database with no geographic filter."}</td></tr>
            <tr><td>Hazard layers</td><td>${it ? "Provider WFS pubblici usati per l'esposizione puntuale ufficiale idraulica e PAI frane quando il punto e validato; WMS usato solo come riferimento visuale, non come modello locale idraulico, geotecnico o sismico di dettaglio." : "Public WFS providers used for official point-level hydraulic and PAI landslide exposure when the project point is validated; WMS is used only as a visual reference, not as detailed local hydraulic, geotechnical or seismic modelling."}</td></tr>
            <tr><td>Historical records</td><td>${it ? "Gli esiti di collasso ARCUS sono separati dalle firme hazard ufficiali attuali. La classe all'anno del collasso e riportata solo quando supportata da una fonte storica datata; la classe attuale non viene retrodatata." : "ARCUS collapse outcomes are separated from current official hazard signatures. The class at the collapse year is reported only when supported by a dated historical source; the current class is never back-cast."}</td></tr>
            <tr><td>Missing data</td><td>${it ? "Alcuni eventi possono non avere attributi tecnici completi, come tipologia del ponte, materiale o anno di costruzione." : "Some events may lack complete technical attributes such as bridge type, material or construction year."}</td></tr>
            <tr><td>Professional use</td><td>${it ? "Adatto a screening preliminare e prioritizzazione; richiede verifiche tecniche successive prima di decisioni progettuali o istituzionali." : "Suitable for preliminary screening and prioritisation; follow-up technical checks are required before design or institutional decisions."}</td></tr>
          </tbody>
        </table>
      </section>`;
    // Path 1 - Operational Watchlist
      if (!isBrief) {
        pathBody = `
      <section class="executive-section">
        ${sectionHeading("01", it ? "EXECUTIVE SUMMARY" : "EXECUTIVE SUMMARY")}
        <p class="asset-statement">${escapeHtml(databaseClaim)}</p>
        <p>${it ? `ARCUS identifica ${workflowEvents.length} casi documentati nella provincia selezionata e traduce gli indicatori di esposizione Step 3 in azioni operative per interventi ${projectDesignFocus.contextLabel}. La mappa PDF mostra i casi ARCUS; il contributo dei layer hazard e sintetizzato dagli indicatori sotto. Il segnale territoriale dominante e <strong>${escapeHtml(displayDriverLabel)}</strong>; il driver storico principale e <strong>${escapeHtml(dominantCauseLabel)}</strong>.` : `ARCUS identifies ${workflowEvents.length} documented cases in the selected province and translates the Step 3 exposure indicators into operational actions for ${projectDesignFocus.contextLabel} interventions. The PDF map shows ARCUS cases; the hazard-layer contribution is summarised through the indicators below. The dominant territorial signal is <strong>${escapeHtml(displayDriverLabel)}</strong>; the leading historical driver is <strong>${escapeHtml(dominantCauseLabel)}</strong>.`}</p>
        <div class="decision-box">${escapeHtml(decisionOutcome)}</div>
        <p class="note">${it ? `Il valore non e la lista dei casi: e capire se ${escapeHtml(reportAreaLabel)} ha gia mostrato vulnerabilita concentrata in condizioni estreme o rischio distribuito nel tempo.` : `The value is not the case list: it is understanding whether ${escapeHtml(reportAreaLabel)} has already shown concentrated vulnerability under extreme conditions or risk distributed over time.`}</p>
        <div class="findings-grid">
          ${topFindings.map((finding, index) => `<div class="finding"><span>${it ? "Finding" : "Finding"} ${index + 1}</span><strong>${escapeHtml(finding)}</strong></div>`).join("")}
        </div>
        <div class="flag-box">
          <span>${it ? "Why ARCUS flags this" : "Why ARCUS flags this"}</span>
          <ul>${flagReasons.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>
        </div>
      </section>
      <section class="page-block report-map-section">
        ${sectionHeading("02", it ? "ARCUS CASES MAP" : "ARCUS CASES MAP")}
        ${reportMapFrame}
        ${reportMapLegend}
        <p class="note">${escapeHtml(it ? "Mappa statica dei casi ARCUS - vista interattiva completa disponibile in Professional Atlas." : "Static ARCUS cases map - full interactive view available in Professional Atlas.")}</p>
      </section>
      <section>
        ${sectionHeading("03", it ? "HOW TO READ" : "HOW TO READ")}
        <p>${it ? "ARCUS non produce uno score generico: legge cosa e successo ai ponti italiani dal 2000 ad oggi, perche e successo, e cosa controllare prima di decidere." : "ARCUS does not produce a generic score: it reads what happened to Italian bridges from 2000 to today, why it happened, and what to check before deciding."}</p>
        <p class="note">${escapeHtml(reportIntentSentence)} ${it ? "Il Priority Index appare alla fine: e la sintesi della lettura, non il punto di partenza." : "The Priority Index appears at the end: it is the conclusion of the reading, not the starting point."}</p>
        <div class="signal-band">
          <article class="signal-card dark">
            <span>${it ? "Configurazione report" : "Report configuration"}</span>
            <strong>${escapeHtml(selectedPath01Intent.label)}</strong>
            <p>${escapeHtml(selectedPath01Intent.text)}</p>
          </article>
          <article class="signal-card">
            <span>${it ? "Base dati" : "Evidence base"}</span>
            <strong>${workflowEvents.length} ARCUS events</strong>
            <p>${escapeHtml(databaseClaim)}</p>
          </article>
        </div>
      </section>
      <section>
        ${sectionHeading("04", it ? "BLOCCO 1 / TERRITORIO" : "BLOCK 1 / TERRITORY")}
        <p>${escapeHtml(territoryReading)}</p>
        <p class="note">${it ? "Le esposizioni ufficiali WFS restano separate dai proxy storici ARCUS. In questa fase non vengono fuse in un numero unico." : "Official WFS exposures remain separate from ARCUS historical proxies. At this stage they are not merged into a single number."}</p>
        ${officialPointExposureTable}
        ${hazardBars}
      </section>
      <section>
        ${sectionHeading("05", it ? "BLOCCO 2 / PATRIMONIO" : "BLOCK 2 / HERITAGE")}
        <div class="index-layer-grid">
          <article class="index-layer-card">
            <span>${it ? "Vulnerabilita storica patrimonio" : "Heritage vulnerability"}</span>
            <strong>Collapse Rate</strong>
            <b>${escapeHtml(collapseRateMultiplier)}</b>
            <p>${collapseRateAvailable
              ? escapeHtml(it
                ? `${collapseRateNumerator} casi ARCUS documentati; denominatore ${selectedAinopBridgeIndex.ainop_bridges_total} ponti censiti; tasso provinciale ${collapseRatePer100} ogni 100; riferimento nazionale ${collapseRateNationalReference ?? "N/A"} ogni 100.`
                : `${collapseRateNumerator} documented ARCUS cases; denominator ${selectedAinopBridgeIndex.ainop_bridges_total} counted bridges; provincial rate ${collapseRatePer100} per 100; national reference ${collapseRateNationalReference ?? "N/A"} per 100.`)
              : escapeHtml(it ? "Denominatore AINOP non disponibile." : "AINOP denominator unavailable.")}</p>
            <i class="confidence-pill">${it ? "Confidenza denominatore" : "Denominator confidence"}: ${escapeHtml(collapseRateConfidence)}</i>
          </article>
          <article class="index-layer-card">
            <span>${it ? "Copertura AINOP" : "AINOP coverage"}</span>
            <strong>${escapeHtml(collapseRateConfidence)}</strong>
            <b>${selectedAinopBridgeIndex?.ainop_bridges_total || "N/A"}</b>
            <p>${escapeHtml(`${collapseRateReason} Dataset: ${collapseRateDatasetVersion}; data cutoff: ${collapseRateDataCutoff}; latest included event: ${collapseRateLatestEventDate}; latest included year: ${collapseRateIncludedYearMax}.`)}</p>
          </article>
        </div>
        <p class="note">${escapeHtml(collapseRateInterpretation)}</p>
        <p class="note">${escapeHtml(ainopIndexText)}</p>
      </section>
      <section>
        ${sectionHeading("06", it ? "BLOCCO 3 / PATTERN STORICO" : "BLOCK 3 / HISTORICAL PATTERN")}
        <div class="kpis">
          <div class="kpi"><span>${it ? "Trigger dominante" : "Dominant trigger"}</span><strong>${historicalPatternReading.dominantCauseShare}%</strong>${formatKpi({ level: historicalPatternReading.dominantCause, driver: it ? "quota sul campione provinciale ARCUS" : "share of the provincial ARCUS sample" })}</div>
          <div class="kpi"><span>${it ? "Distribuzione temporale" : "Temporal distribution"}</span><strong style="font-size:18px">${escapeHtml(historicalPatternReading.type)}</strong>${formatKpi({ level: evidenceYearRange, driver: historicalPatternReading.temporal })}</div>
          <div class="kpi"><span>${it ? "Geomorfologia" : "Geomorphology"}</span><strong style="font-size:18px">${escapeHtml(displayDriverLabel)}</strong>${formatKpi({ level: dominantCauseLabel, driver: historicalPatternReading.geomorphologyHint })}</div>
          <div class="kpi"><span>${it ? "Affidabilita" : "Reliability"}</span><strong>${evidenceGradeFromScore(workflowReliability.average)} / ${Math.round(workflowReliability.average)} / 100</strong>${formatKpi({ level: reliabilityLabel, driver: `${workflowSourceCount} ${it ? "fonti collegate" : "linked sources"}` })}</div>
        </div>
        ${priorityTriggerNote ? `<p class="note">${escapeHtml(priorityTriggerNote)}</p>` : ""}
        <p class="note">${it ? "I casi individuali restano consultabili sulla mappa e in appendice: nel corpo principale ARCUS espone il pattern, non una classifica di casi." : "Individual cases remain available on the map and in the appendix: the main report presents the pattern, not a case ranking."}</p>
      </section>
      <section>
        ${sectionHeading("07", it ? "BLOCCO 4 / AZIONI" : "BLOCK 4 / ACTIONS")}
        <div class="operational-grid">
          <article class="signal-card reading-card">
            <span>${it ? "ARCUS Reading" : "ARCUS Reading"}</span>
            <p>${escapeHtml(projectDesignFocus.paragraph)} ${escapeHtml(reportIntentSentence)}</p>
          </article>
          <article class="signal-card">
            <span>${it ? "Attention Points" : "Attention Points"}</span>
            <div class="attention-badges">${designFocusBadges || designFocusRows}</div>
          </article>
          <article class="signal-card">
            <span>${it ? "Data requests" : "Data requests"}</span>
            <strong>${escapeHtml(dataToRequest.slice(0, 3).join("; "))}</strong>
          </article>
        </div>
        <div class="action-grid">${actionCards}</div>
        <div class="data-grid">${dataCards}</div>
        <ol>${recommendationRows}</ol>
      </section>
      <section>
        ${sectionHeading("08", it ? "PRIORITY INDEX CONCLUSIVO" : "FINAL PRIORITY INDEX")}
        <div class="kpis">
          <div class="kpi"><span>Priority Index</span><strong>${finalPriorityIndexLabel} / 100</strong>${formatKpi({ level: classPriority(finalPriorityIndex), driver: it ? "Sintesi finale dopo territorio, patrimonio, pattern e azioni." : "Final synthesis after territory, heritage, pattern and actions." })}</div>
          <div class="kpi"><span>${it ? "Esposizione territoriale" : "Territorial exposure"}</span><strong>${exposurePriorityScoreLabel} / 100</strong>${formatKpi({ level: displayDriverLabel, driver: it ? "Layer idraulico, frana e sismico letti separatamente." : "Hydraulic, landslide and seismic layers read separately." })}</div>
          <div class="kpi"><span>Collapse Rate</span><strong>${escapeHtml(collapseRateMultiplier)}</strong>${formatKpi({ level: it ? `Confidenza denominatore: ${collapseRateConfidence}` : `Denominator confidence: ${collapseRateConfidence}`, driver: it ? "Segnale ARCUS/AINOP sul patrimonio ponte." : "ARCUS/AINOP bridge-stock signal." })}</div>
          <div class="kpi"><span>${it ? "Pattern storico" : "Historical pattern"}</span><strong style="font-size:18px">${escapeHtml(historicalPatternReading.type)}</strong>${formatKpi({ level: dominantCauseLabel, driver: historicalPatternReading.temporal })}</div>
        </div>
        <p class="note">${it ? "Il Priority Index segue la metodologia corrente documentata. Le osservazioni puntuali ufficiali WFS idraulica e PAI frane restano in shadow mode, sono riportate separatamente e non modificano il Final Priority Index." : "The Priority Index follows the current documented methodology. Official hydraulic and PAI landslide WFS point observations remain in shadow mode, are reported separately and do not modify the Final Priority Index."}</p>
      </section>
      <section>
        ${sectionHeading("09", it ? "DATA COVERAGE & LIMITATIONS" : "DATA COVERAGE & LIMITATIONS")}
        <div class="limitation-strip">${limitationCards}</div>
        <p class="note">${it ? `ARCUS riporta oggi la finestra provinciale ${escapeHtml(evidenceWindowLabel)}. Il Collapse Rate e un indicatore derivato ARCUS/AINOP: AINOP e alimentato da enti proprietari o gestori e puo sottorappresentare asset locali, soprattutto nei piccoli comuni montani. Per questa provincia la confidenza del denominatore e ${escapeHtml(collapseRateConfidence)}: ${escapeHtml(collapseRateReason)}` : `ARCUS currently reports the provincial evidence window as ${escapeHtml(evidenceWindowLabel)}. The Collapse Rate is a derived ARCUS/AINOP indicator: AINOP is fed by owners/managers and may under-represent local assets, especially in small mountain municipalities. For this province the denominator confidence is ${escapeHtml(collapseRateConfidence)}: ${escapeHtml(collapseRateReason)}`}</p>
      </section>
      <section>
        ${sectionHeading("10", it ? "APPENDICE CASI ARCUS" : "ARCUS CASE APPENDIX")}
        <p>${it ? "Anteprima dei casi ARCUS piu rilevanti. La mappa e gli export CSV/GeoJSON restano il livello corretto per consultare i casi singoli." : "Preview of the most relevant ARCUS cases. The map and CSV/GeoJSON exports remain the correct level for individual case review."}</p>
        <div class="precedent-list">${priorityCards}</div>
      </section>`;
      }

      if (isBrief) {
        const briefFindings = [
          it
            ? "Asset: primo database sistematico di ponti crollati in Italia dal 2000 ad oggi."
            : "Asset: first systematic database of collapsed bridges in Italy from 2000 to today.",
          it
            ? `Pattern: ${historicalPatternReading.type}; ${historicalPatternReading.temporal}`
            : `Pattern: ${historicalPatternReading.type}; ${historicalPatternReading.temporal}`,
          collapseRateAvailable
            ? it
              ? `Collapse Rate: ${collapseRateMultiplier} tasso nazionale ARCUS/AINOP. ${collapseRateInterpretation}`
              : `Collapse Rate: ${collapseRateMultiplier} national ARCUS/AINOP rate. ${collapseRateInterpretation}`
            : it
              ? `Arco evidenze: ${evidenceWindowLabel}.`
              : `Evidence window: ${evidenceWindowLabel}.`,
          it
            ? "Azione: verifiche sito-specifiche prima delle decisioni progettuali."
            : "Action: run site-specific checks before design decisions.",
        ];
        const nextChecks = [
          it
            ? "Tradurre il segnale provinciale in verifiche sito-specifiche."
            : "Translate the province signal into site-specific checks.",
          it
            ? "Valutare lo scenario storico concentrato/distribuito prima di definire le verifiche."
            : "Evaluate the concentrated/distributed historical scenario before defining checks.",
          it
            ? `Verificare in sito le assunzioni ${displayDriverLabel}.`
            : `Check ${displayDriverLabel} assumptions on site.`,
          it
            ? "Usare i layer WMS solo come contesto di screening."
            : "Use WMS overlays as screening context only.",
          it
            ? "Documentare i limiti prima delle decisioni."
            : "Document limits before design decisions.",
        ];
        const signalSentence = it
          ? `Segnale provinciale ${displayDriverLabel}. Usarlo per impostare verifiche ${projectDesignFocus.contextLabel}; confermare con dati sito-specifici. ARCUS traduce storia documentata dei collassi in prossimi controlli operativi.`
          : `Province-level ${displayDriverLabel} signal. Use it to frame ${projectDesignFocus.contextLabel} checks; confirm with site-specific data. ARCUS translates documented collapse history into operational next checks.`;
        const briefLimitations = [
          it
            ? "Screening provinciale, non scala progettuale."
            : "Province-level screening only, not design scale.",
          it
            ? "ARCUS non certifica sicurezza strutturale o condizione asset."
            : "ARCUS does not certify structural safety or asset condition.",
          it
            ? `Confidenza del denominatore Collapse Rate: ${collapseRateConfidence}. ${collapseRateReason}`
            : `Collapse Rate denominator confidence: ${collapseRateConfidence}. ${collapseRateReason}`,
        ];

        pathBody = `
        <section class="brief-page brief-sheet">
          <header class="brief-sheet-head">
            <div><img class="cover-logo" src="${arcusLogoFullLight}" alt="ARCUS" /></div>
            <div>
              <span class="brief-kicker">Path 01 / ${it ? "Nuovo territorio" : "New territory"}</span>
              <h1>${escapeHtml(pathMeta.doc)}: ${escapeHtml(reportAreaLabel)}</h1>
              <p>${escapeHtml(it ? `Screening professionale provinciale per ${projectDesignFocus.contextLabel}, basato sull'evidenza storica ARCUS dei ponti crollati in Italia. Il dettaglio analitico resta nel report completo e negli export.` : `Province-level professional screening for ${projectDesignFocus.contextLabel}, built on ARCUS' Italian bridge-collapse evidence base. Full analytical detail remains in the full report and exports.`)}</p>
            </div>
            <div class="brief-meta">
              <div><span>Report ID</span><strong>${escapeHtml(reportId)}</strong></div>
              <div><span>${it ? "Contesto" : "Context"}</span><strong>${escapeHtml(projectDesignFocus.contextLabel)}</strong></div>
              <div><span>${it ? "Driver" : "Driver"}</span><strong>${escapeHtml(displayDriverLabel)}</strong></div>
              <div><span>${it ? "Data" : "Date"}</span><strong>${today}</strong></div>
            </div>
          </header>
          <div class="brief-top">
            <article class="brief-panel brief-map">
              <h2><span>01</span>${it ? "ARCUS Cases Map" : "ARCUS Cases Map"}</h2>
              ${reportMapFrame}
              ${reportMapLegend}
              <p class="brief-map-note">${escapeHtml(briefMapNote)}</p>
            </article>
            <article class="brief-panel brief-signal">
              <h2><span>02</span>${it ? "Executive Signal" : "Executive Signal"}</h2>
              <strong>${escapeHtml(displayDriverLabel)} / ${escapeHtml(projectDesignFocus.contextLabel)}</strong>
              <p>${escapeHtml(signalSentence)}</p>
              <div class="brief-kpi-grid">
                <div class="brief-kpi"><span>${it ? "Final Priority Index" : "Final Priority Index"}</span><strong>${finalPriorityIndexLabel}</strong></div>
                <div class="brief-kpi"><span>Collapse Rate</span><strong>${escapeHtml(collapseRateMultiplier)}</strong></div>
                <div class="brief-kpi"><span>${it ? "Confidenza denominatore" : "Denominator confidence"}</span><strong>${escapeHtml(collapseRateConfidence)}</strong></div>
                <div class="brief-kpi"><span>${it ? "Eventi Storici" : "Historical Events"}</span><strong>${workflowEvents.length}</strong></div>
              </div>
              ${hazardBars}
            </article>
          </div>
          <div class="brief-bottom">
            <article class="brief-box">
              <span>${it ? "3 Evidenze Chiave" : "3 Key Findings"}</span>
              <h3>${it ? "Perche conta" : "Why It Matters"}</h3>
              <p class="brief-case-note">${escapeHtml(it ? `Il messaggio decisionale e il pattern storico: ${historicalPatternReading.type}. I casi singoli restano nel full PDF, in mappa e negli export.` : `The decision message is the historical pattern: ${historicalPatternReading.type}. Individual cases remain in the full PDF, map and exports.`)} ${priorityTriggerNote ? escapeHtml(priorityTriggerNote) : ""}</p>
              <ul>${briefFindings.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>
            </article>
            <article class="brief-box">
              <span>${it ? "Checks" : "Checks"}</span>
              <h3>${it ? "Cosa verificare" : "What To Check"}</h3>
              <ol>${nextChecks.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ol>
            </article>
            <article class="brief-box brief-limit">
              <span>${it ? "Data to Request" : "Data to Request"}</span>
              <h3>${it ? "Prima delle decisioni" : "Before Decisions"}</h3>
              <ul>${dataToRequest.slice(0, 5).map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>
              <p class="brief-limit-note">${escapeHtml(briefLimitations.join(" "))}</p>
            </article>
          </div>
          <footer class="brief-export">
            <span><strong>Export package</strong>: Full PDF / events CSV / sources CSV / GeoJSON</span>
            <span>ARCUS Professional / Path 01</span>
          </footer>
        </section>`;
      }
    } else if (activeEntryPath === 1) {
      const assetTableRows = assetScreening
        .map((asset) => `<tr>
          <td>${escapeHtml(asset.name || asset.id)}</td>
          <td><strong>${escapeHtml(asset.attentionLevel)}</strong></td>
          <td>${escapeHtml(asset.hazardProfileLabel || "-")}</td>
          <td>${asset.score || 0}</td>
          <td>${asset.proximityScore || 0}</td>
        </tr>`)
        .join("");
      const monitoringTableRows = monitoringSignals.slice(0, 12)
        .map((signal) => `<tr>
          <td>${escapeHtml(signal.event?.event_id)}</td>
          <td>${escapeHtml(signal.event?.municipality)}</td>
          <td><strong>${escapeHtml(signal.level)}</strong></td>
          <td>${escapeHtml(signal.rules.join(", "))}</td>
        </tr>`)
        .join("");

      pathBody = `
      <div class="kpis">
        <div class="kpi"><span>${it ? "Asset valutati" : "Assessed assets"}</span><strong>${assetScreening.length}</strong></div>
        <div class="kpi"><span>${it ? "Attenzione immediata" : "Immediate attention"}</span><strong>${assetAttentionSummary.immediate}</strong></div>
        <div class="kpi"><span>${it ? "Attenzione programmata" : "Programmed attention"}</span><strong>${assetAttentionSummary.programmed}</strong></div>
        <div class="kpi"><span>${it ? "Hazard dominante" : "Dominant hazard"}</span><strong>${escapeHtml(assetAttentionSummary.dominantHazard)}</strong></div>
      </div>
      <section>
        <h2>${it ? "SINTESI INVENTARIO" : "INVENTORY SUMMARY"}</h2>
        <p>${it ? `Inventario caricato: ${assetRows.length} asset. Valutati: ${assetScreening.length}. Qualita inventario: ${assetInventoryAudit.score}/100.` : `Uploaded inventory: ${assetRows.length} assets. Assessed: ${assetScreening.length}. Inventory quality: ${assetInventoryAudit.score}/100.`}</p>
        <div class="note">${it ? `Gap tecnici: ${assetInventoryAudit.total - assetInventoryAudit.technical} asset senza dati tecnici completi.` : `Technical gaps: ${assetInventoryAudit.total - assetInventoryAudit.technical} assets missing complete technical data.`}</div>
      </section>
      <section>
        <h2>${it ? "ESPOSIZIONE HAZARD TERRITORIALE" : "TERRITORIAL HAZARD EXPOSURE"}</h2>
        <p>${it ? "Esposizione idraulica, franosa e sismica per il territorio degli asset caricati." : "Hydraulic, landslide and seismic exposure for the territory of uploaded assets."}</p>
        <table>
          <thead><tr><th>Layer</th><th>Score</th><th>${it ? "Crolli correlati" : "Matched collapses"}</th><th>Share</th></tr></thead>
          <tbody>${hazardRows}</tbody>
        </table>
      </section>
      ${assetScreening.length > 0 ? `<section>
        <h2>${it ? "SCREENING ASSET" : "ASSET SCREENING"}</h2>
        <p>${it ? "Watchlist automatica basata su Asset Priority Score, Hazard Profile, Proximity Score e precedenti ARCUS comparabili." : "Automatic watchlist based on Asset Priority Score, Hazard Profile, Proximity Score and comparable ARCUS precedents."}</p>
        <table>
          <thead><tr><th>${it ? "Asset" : "Asset"}</th><th>${it ? "Livello" : "Level"}</th><th>Hazard Profile</th><th>Score</th><th>Proximity</th></tr></thead>
          <tbody>${assetTableRows}</tbody>
        </table>
      </section>` : ""}
      ${monitoringSignals.length > 0 ? `<section>
        <h2>${it ? "CANDIDATI ALL'ISPEZIONE" : "INSPECTION CANDIDATES"}</h2>
        <p>${it ? "Asset con segnali di attenzione derivati da crolli totali, vulnerabilita critica o impatto umano nel territorio." : "Assets with attention signals derived from total collapses, critical vulnerability or human impact in the territory."}</p>
        <table>
          <thead><tr><th>ID</th><th>${it ? "Comune" : "Municipality"}</th><th>Level</th><th>${it ? "Segnali" : "Signals"}</th></tr></thead>
          <tbody>${monitoringTableRows}</tbody>
        </table>
      </section>` : ""}`;

    // Path 2 - Scenario Briefing
    } else if (activeEntryPath === 2) {
      const areaEvents = manualAreaBounds ? manualAreaEvents : workflowEvents;
      const analogueRows = (selectedSimilarEvents.length > 0 ? selectedSimilarEvents : areaEvents)
        .slice(0, 8)
        .map((event) => `<tr>
          <td>${escapeHtml(event.event_id)}</td>
          <td>${escapeHtml(event.municipality)}${event.year ? ` (${event.year})` : ""}</td>
          <td>${escapeHtml(severityLabel(event.collapse_severity))}</td>
          <td>${escapeHtml(event.specific_cause)}</td>
          <td>${event.similarityScore ? `${event.similarityScore}/100` : "-"}</td>
        </tr>`)
        .join("");

      pathBody = `
      <div class="kpis">
        <div class="kpi"><span>Scenario</span><strong style="font-size:18px;margin-top:12px">${escapeHtml(activeScenario?.label || "-")}</strong></div>
        <div class="kpi"><span>${it ? "Crolli nell'area" : "Area collapses"}</span><strong>${areaEvents.length}</strong></div>
        <div class="kpi"><span>${it ? "Hazard dominante" : "Dominant hazard"}</span><strong style="font-size:14px;margin-top:12px">${escapeHtml(workflowHazardExposure?.dominant_hazard || "-")}</strong></div>
        <div class="kpi"><span>${it ? "Analoghi storici" : "Historical analogues"}</span><strong>${selectedSimilarEvents.length || areaEvents.length}</strong></div>
      </div>
      <section>
        <h2>${it ? "SINTESI SCENARIO" : "SCENARIO SUMMARY"}</h2>
        <p>${it ? `Scenario analizzato: <strong>${activeScenario?.label || "-"}</strong>. Area: ${reportAreaLabel}. ${areaEvents.length} eventi ARCUS nel contesto.` : `Analyzed scenario: <strong>${activeScenario?.label || "-"}</strong>. Area: ${reportAreaLabel}. ${areaEvents.length} ARCUS events in context.`}</p>
        <div class="note">${it ? "Questo briefing di scenario e basato sui precedenti storici ARCUS, non su modelli previsionali." : "This scenario briefing is based on ARCUS historical precedents, not predictive models."}</div>
      </section>
      ${manualAreaBounds ? `<section>
        <h2>${it ? "AREA / CORRIDOIO" : "AREA / CORRIDOR"}</h2>
        ${selectedAreaSketch}
      </section>` : ""}
      <section>
        <h2>${it ? "ESPOSIZIONE HAZARD" : "HAZARD EXPOSURE"}</h2>
        <p>${it ? "Layer scenario-specifici sovrapposti agli eventi di crollo ARCUS nell'area selezionata." : "Scenario-specific layers overlaid with ARCUS collapse events in the selected area."}</p>
        <table>
          <thead><tr><th>Layer</th><th>Score</th><th>${it ? "Crolli correlati" : "Matched collapses"}</th><th>Share</th></tr></thead>
          <tbody>${hazardRows}</tbody>
        </table>
      </section>
      <section>
        <h2>${it ? "ANALOGHI STORICI" : "HISTORICAL ANALOGUES"}</h2>
        <p>${it ? "Precedenti storici per meccanismo, causa e contesto comparabile allo scenario analizzato." : "Historical precedents by comparable mechanism, cause and context to the analyzed scenario."}</p>
        <table>
          <thead><tr><th>ID</th><th>${it ? "Comune" : "Municipality"}</th><th>${it ? "Severita" : "Severity"}</th><th>${it ? "Causa" : "Cause"}</th><th>${it ? "Similitudine" : "Similarity"}</th></tr></thead>
          <tbody>${analogueRows}</tbody>
        </table>
      </section>
      <section>
        <h2>${it ? "MECCANISMI RICORRENTI" : "RECURRING MECHANISMS"}</h2>
        <table>
          <thead><tr><th>#</th><th>${it ? "Causa" : "Cause"}</th><th>${it ? "Occorrenze" : "Occurrences"}</th><th>Share</th></tr></thead>
          <tbody>${causeRows}</tbody>
        </table>
      </section>
      <section>
        <h2>${it ? "RACCOMANDAZIONI OPERATIVE" : "OPERATIONAL RECOMMENDATIONS"}</h2>
        <ol>${recommendationRows}</ol>
      </section>`;

    // Path 3 - Due Diligence Package
    } else if (activeEntryPath === 3) {
      const tcCount = workflowEvents.filter((e) => e.collapse_severity === "TC").length;
      const triggeredCount = workflowEvents.filter((e) => e.triggered).length;

      pathBody = `
      <div class="kpis">
        <div class="kpi"><span>Priority index</span><strong>${scoreLabel}</strong></div>
        <div class="kpi"><span>${it ? "Affidabilita evidenze" : "Evidence reliability"}</span><strong>${evidenceGradeFromScore(workflowReliability.average)} / ${Math.round(workflowReliability.average)}</strong></div>
        <div class="kpi"><span>${it ? "Cause dominanti" : "Dominant causes"}</span><strong>${selectedProvinceDrivers.causes.length}</strong></div>
        <div class="kpi"><span>${it ? "Fonti professionali" : "Professional sources"}</span><strong>${workflowReliability.institutionalShare}%</strong></div>
      </div>
      <section>
        <h2>${it ? "EXECUTIVE SUMMARY" : "EXECUTIVE SUMMARY"}</h2>
        <p>${escapeHtml(reportAreaDescription)}</p>
        <p>${it ? `Pattern critici: ${tcCount} crolli totali, ${triggeredCount} eventi innescati su ${workflowEvents.length} totali. Meccanismo dominante: ${selectedProvinceProfile.topCause || "-"}.` : `Critical patterns: ${tcCount} total collapses, ${triggeredCount} triggered events out of ${workflowEvents.length} total. Dominant mechanism: ${selectedProvinceProfile.topCause || "-"}.`}</p>
        <div class="note">${it ? "Documento di due diligence generato da ARCUS. Non sostituisce perizie tecniche o valutazioni di rischio certificabili." : "Due diligence document generated by ARCUS. Does not replace certified technical assessments or risk evaluations."}</div>
      </section>
      <section>
        <h2>${it ? "RAPPORTO TECNICO - CONTESTO INFRASTRUTTURALE" : "TECHNICAL REPORT - INFRASTRUCTURE CONTEXT"}</h2>
        <table>
          <thead><tr><th>${it ? "Indicatore" : "Indicator"}</th><th>${it ? "Valore" : "Value"}</th></tr></thead>
          <tbody>
            <tr><td>${it ? "Territorio" : "Territory"}</td><td>${escapeHtml(reportAreaLabel)}</td></tr>
            <tr><td>${it ? "Events totali ARCUS" : "Total ARCUS events"}</td><td>${workflowEvents.length}</td></tr>
            <tr><td>${it ? "Hazard dominante" : "Dominant hazard"}</td><td>${escapeHtml(workflowHazardExposure?.dominant_hazard || "-")}</td></tr>
            <tr><td>${it ? "Causa dominante" : "Dominant cause"}</td><td>${escapeHtml(selectedProvinceDrivers.causes[0]?.label || "-")}</td></tr>
            <tr><td>Priority index</td><td>${scoreLabel}</td></tr>
            <tr><td>${it ? "Crolli totali (TC)" : "Total collapses (TC)"}</td><td>${tcCount}</td></tr>
            <tr><td>${it ? "Events innescati" : "Triggered events"}</td><td>${triggeredCount}</td></tr>
          </tbody>
        </table>
      </section>
      <section>
        <h2>${it ? "PANORAMICA MULTI-HAZARD" : "MULTI-HAZARD OVERVIEW"}</h2>
        <table>
          <thead><tr><th>Layer</th><th>Score</th><th>${it ? "Events correlati" : "Matched events"}</th><th>Share</th></tr></thead>
          <tbody>${hazardRows}</tbody>
        </table>
      </section>
      <section>
        <h2>${it ? "PATTERN CRITICI" : "CRITICAL PATTERNS"}</h2>
        <p>${it ? "Ricorrenze idrauliche, forza dell'evidenza e gap documentali identificati nel territorio." : "Hydraulic recurrence, evidence strength and data gaps identified in the territory."}</p>
        <table>
          <thead><tr><th>#</th><th>${it ? "Causa" : "Cause"}</th><th>${it ? "Occorrenze" : "Occurrences"}</th><th>Share</th></tr></thead>
          <tbody>${causeRows}</tbody>
        </table>
      </section>
      <section>
        <h2>${it ? "PACCHETTO EVIDENZE" : "EVIDENCE PACKAGE"}</h2>
        <table>
          <thead><tr><th>ID</th><th>${it ? "Comune" : "Municipality"}</th><th>${it ? "Severita" : "Severity"}</th><th>${it ? "Causa" : "Cause"}</th><th>${it ? "Evidenza" : "Evidence"}</th><th>${it ? "Vulnerabilita" : "Vulnerability"}</th></tr></thead>
          <tbody>${eventRows}</tbody>
        </table>
      </section>
      <section>
        <h2>${it ? "APPENDICE - BENCHMARK NAZIONALE" : "APPENDIX - NATIONAL BENCHMARK"}</h2>
        <table>
          <thead><tr><th>${it ? "Indicatore" : "Indicator"}</th><th>${it ? "Selezionato" : "Selected"}</th><th>${it ? "Media ARCUS" : "ARCUS average"}</th><th>Status</th></tr></thead>
          <tbody>${benchmarkRows}</tbody>
        </table>
      </section>`;

    // Path 4 - Research Output
    } else {
      const topCauseRows = causeRanking.slice(0, 10)
        .map((c, i) => `<tr>
          <td>${i + 1}</td>
          <td>${escapeHtml(c.label)}</td>
          <td>${c.value}</td>
          <td>${Math.round((c.value / Math.max(events.length, 1)) * 100)}%</td>
        </tr>`)
        .join("");
      const regionalRows = profiles.slice(0, 15)
        .map((p) => `<tr>
          <td>${escapeHtml(p.territory)}</td>
          <td>${p.total}</td>
          <td>${escapeHtml(p.topCause || "-")}</td>
          <td>${p.riskScore || 0}</td>
        </tr>`)
        .join("");
      const citationRows = workflowEvents.slice(0, 20)
        .map((event) => {
          const rel = reliabilityByEvent[event.event_id];
          return `<tr>
            <td>${escapeHtml(event.event_id)}</td>
            <td>${escapeHtml(event.municipality)}</td>
            <td>${event.year || "-"}</td>
            <td>${escapeHtml(severityLabel(event.collapse_severity))}</td>
            <td>${escapeHtml(event.specific_cause)}</td>
            <td>${escapeHtml(rel?.grade || "D")}</td>
          </tr>`;
        })
        .join("");

      pathBody = `
      <div class="kpis">
        <div class="kpi"><span>${it ? "Dataset interrogato" : "Dataset queried"}</span><strong>${events.length}</strong></div>
        <div class="kpi"><span>${it ? "Fonti documentali" : "Documentary sources"}</span><strong>${sources.length}</strong></div>
        <div class="kpi"><span>${it ? "Causa principale" : "Top cause"}</span><strong style="font-size:13px;margin-top:10px">${escapeHtml(causeRanking[0]?.label || "-")}</strong></div>
        <div class="kpi"><span>${it ? "Regioni coperte" : "Regions covered"}</span><strong>${profiles.length}</strong></div>
      </div>
      ${researchQuery ? `<section>
        <h2>${it ? "QUERY DI RICERCA" : "RESEARCH QUERY"}</h2>
        <p><em>"${escapeHtml(researchQuery)}"</em></p>
      </section>` : ""}
      <section>
        <h2>${it ? "SINTESI DATASET" : "DATASET SUMMARY"}</h2>
        <p>${it ? `Dataset ARCUS: ${events.length} eventi da ${sources.length} fonti documentali su ${profiles.length} territori. Causa principale per frequenza: ${causeRanking[0]?.label || "-"} (${causeRanking[0]?.value || 0} eventi).` : `ARCUS dataset: ${events.length} events from ${sources.length} documentary sources across ${profiles.length} territories. Top cause by frequency: ${causeRanking[0]?.label || "-"} (${causeRanking[0]?.value || 0} events).`}</p>
      </section>
      <section>
        <h2>${it ? "DISTRIBUZIONE CAUSE" : "CAUSE DISTRIBUTION"}</h2>
        <table>
          <thead><tr><th>#</th><th>${it ? "Causa" : "Cause"}</th><th>${it ? "Occorrenze" : "Occurrences"}</th><th>Share</th></tr></thead>
          <tbody>${topCauseRows}</tbody>
        </table>
      </section>
      <section>
        <h2>${it ? "DISTRIBUZIONE REGIONALE" : "REGIONAL DISTRIBUTION"}</h2>
        <table>
          <thead><tr><th>${it ? "Territorio" : "Territory"}</th><th>${it ? "Events" : "Events"}</th><th>${it ? "Causa dominante" : "Top cause"}</th><th>Risk score</th></tr></thead>
          <tbody>${regionalRows}</tbody>
        </table>
      </section>
      <section>
        <h2>${it ? "TABELLA CITABILE" : "CITATION-READY TABLE"}</h2>
        <p>${it ? "Formato adatto per citazione accademica o tecnica. Grading ARCUS: A = istituzionale, B = tecnico, C = documentale, D = generico." : "Format suitable for academic or technical citation. ARCUS grading: A = institutional, B = technical, C = documentary, D = generic."}</p>
        <table>
          <thead><tr><th>ID</th><th>${it ? "Comune" : "Municipality"}</th><th>${it ? "Anno" : "Year"}</th><th>${it ? "Severita" : "Severity"}</th><th>${it ? "Causa" : "Cause"}</th><th>Grade</th></tr></thead>
          <tbody>${citationRows}</tbody>
        </table>
      </section>`;
    }

    return `<!doctype html>
<html lang="${language}">
<head>
  <meta charset="UTF-8" />
  <title>ARCUS - ${escapeHtml(pathMeta.doc)}: ${escapeHtml(reportAreaLabel)}</title>
  <style>${css}</style>
</head>
<body class="${isBrief ? "brief-output" : "full-output"}">
  <div class="report-footer">
    <span>ARCUS Professional</span>
    <span>Path ${pathMeta.num} / ${escapeHtml(pathMeta.name)}</span>
    <span>${escapeHtml(reportId)}</span>
  </div>
  <header class="cover">
    <div>
      <img class="cover-logo" src="${arcusLogoFullLight}" alt="ARCUS" />
      <div class="path-badge">PATH ${pathMeta.num} - ${escapeHtml(pathMeta.name)}</div>
      <h1>${escapeHtml(isBrief ? `${pathMeta.doc} - One-Page Brief` : `${pathMeta.doc}: ${reportAreaLabel}`)}</h1>
      <p class="cover-subtitle">${escapeHtml(it ? "Briefing preliminare professionale a scala provinciale: evidenza storica, mappa Atlas, focus progettuale e prossimi controlli operativi." : "Professional province-level preliminary briefing: historical evidence, Atlas map, project-context focus and operational next checks.")}</p>
      <div class="meta">Infrastructure intelligence / ${it ? "generato il" : "generated"} ${today}</div>
    </div>
    <div class="cover-meta-grid">
      <div><span>Report ID</span><strong>${escapeHtml(reportId)}</strong></div>
      <div><span>${it ? "Versione" : "Version"}</span><strong>${escapeHtml(exportVersion)}</strong></div>
      <div><span>${it ? "Analisi" : "Analysis"}</span><strong>${escapeHtml(pathMeta.doc)}</strong></div>
      <div><span>${it ? "Scala" : "Spatial level"}</span><strong>${escapeHtml(spatialLevel)}</strong></div>
      <div><span>${it ? "Generato da" : "Generated by"}</span><strong>ARCUS Professional</strong></div>
    </div>
  </header>
  <main>
    ${pathBody}
    ${activeEntryPath === 0 && !isBrief ? `${sourceAppendixSection}${methodologySection}` : activeEntryPath === 0 ? "" : scoringSection}
  </main>
</body>
</html>`;
  };

  const loadPdfLogoDataUrl = async () => {
    if (typeof window === "undefined") {
      return "";
    }

    const image = new Image();
    image.crossOrigin = "anonymous";
    try {
      const svg = await fetch(arcusLogoFullLight).then((response) =>
        response.text()
      );
      const whiteLogoSvg = svg.replace(
        /<rect width="320" height="230" fill="[^"]+"\/>/,
        '<rect width="320" height="230" fill="#FFFFFF"/>'
      );
      image.src = `data:image/svg+xml;base64,${window.btoa(
        unescape(encodeURIComponent(whiteLogoSvg))
      )}`;
    } catch {
      image.src = arcusLogoFullLight;
    }

    await new Promise((resolve) => {
      image.onload = resolve;
      image.onerror = resolve;
    });

    if (!image.naturalWidth || !image.naturalHeight) {
      return "";
    }

    const canvas = document.createElement("canvas");
    const scale = 3;
    canvas.width = image.naturalWidth * scale;
    canvas.height = image.naturalHeight * scale;

    const context = canvas.getContext("2d");
    if (!context) {
      return "";
    }

    context.fillStyle = "#ffffff";
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.drawImage(image, 0, 0, canvas.width, canvas.height);

    return canvas.toDataURL("image/png");
  };

  const loadImageSize = async (src) => {
    if (!src?.startsWith("data:image")) {
      return null;
    }

    const image = new Image();
    image.src = src;

    await new Promise((resolve) => {
      image.onload = resolve;
      image.onerror = resolve;
    });

    if (!image.naturalWidth || !image.naturalHeight) {
      return null;
    }

    return {
      height: image.naturalHeight,
      width: image.naturalWidth,
    };
  };

  const saveStructuredReportPdf = async ({
    filename,
    logoImage,
    mapImage,
    mapImageSize,
    reportReference = "",
    variant = "full",
  }) => {
    const jsPDF = await loadJsPDF();
    const pdf = new jsPDF({
      compress: false,
      format: "a4",
      orientation: "portrait",
      unit: "mm",
    });
    const it = language === "it";
    const palette = {
      accent: [143, 111, 61],
      border: [217, 221, 213],
      ink: [36, 49, 58],
      muted: [92, 103, 102],
      paper: [248, 247, 242],
      panel: [255, 255, 255],
      soft: [238, 240, 235],
    };
    const margin = 16;
    const pageWidth = 210;
    const pageHeight = 297;
    const bottom = 280;
    const contentWidth = pageWidth - margin * 2;
    const today = new Date().toLocaleDateString(
      language === "it" ? "it-IT" : "en-US",
      {
        day: "2-digit",
        month: "short",
        year: "numeric",
      }
    );
    const reportArea =
      cleanDisplayText(
        activeEntryPath === 1
          ? assetSession.fileName || "Path 02 Asset Inventory"
          : activeEntryPath !== 0 && manualAreaBounds
          ? manualAreaLabel
          : selectedProvinceProfile?.territory || "Territory"
      );
    const pdfEvidenceYears = workflowEvents
      .map((event) =>
        Number(String(event.date || event.year || "").slice(0, 4))
      )
      .filter(Number.isFinite);
    const pdfEvidenceYearRange = pdfEvidenceYears.length
      ? Math.min(...pdfEvidenceYears) === Math.max(...pdfEvidenceYears)
        ? String(Math.min(...pdfEvidenceYears))
        : `${Math.min(...pdfEvidenceYears)}-${Math.max(...pdfEvidenceYears)}`
      : "";
    const dominantCause =
      selectedProvinceDrivers.causes[0]?.label ||
      selectedProvinceProfile?.topCause ||
      "-";
    const evidenceSources = workflowEvents.reduce(
      (total, event) =>
        total + (sourceCountByEvent[event.event_id] || 0),
      0
    );
    const pdfMunicipalityCount = new Set(
      workflowEvents
        .map((event) => event.municipality)
        .filter(Boolean)
    ).size;
    const reliabilityValue = Math.round(
      workflowReliability?.average || 0
    );
    const eventEvidenceGrade = (event) =>
      reliabilityByEvent[event?.event_id]?.grade || "D";
    const reliabilityGrade = evidenceGradeFromScore(reliabilityValue);
    const hazardLabel =
      workflowHazardExposure?.dominant_hazard ||
      dominantCause ||
      "hazard";
    const collapseRateRank = Number(
      selectedAinopProvinceIndex?.national_rank_by_rate
    );
    const collapseRateRankLabel = Number.isFinite(collapseRateRank)
      ? it
        ? `rank nazionale ${collapseRateRank}`
        : `national rank ${collapseRateRank}`
      : "";
    const collapseRateRankSentence = collapseRateRankLabel
      ? it
        ? `${reportArea} e ${collapseRateRankLabel} per tasso ARCUS/AINOP documentato.`
        : `${reportArea} is ${collapseRateRankLabel} by documented ARCUS/AINOP collapse rate.`
      : "";
    const pdfSeverityLabel = (code) =>
      ({
        TC: it ? "Crollo Totale" : "Total Collapse",
        PC: it ? "Crollo Parziale" : "Partial Collapse",
        SC: it
          ? "Compromissione Strutturale"
          : "Structural Compromise",
      })[code] || code || "-";
    const collapseInterpretation =
      selectedCollapseRateAvailable
        ? it
          ? `Il tasso ${selectedCollapseRateMultiplier} rispetto alla media nazionale posiziona ${reportArea} tra le province con vulnerabilita storica documentata superiore al benchmark ARCUS/AINOP.${collapseRateRankSentence ? ` ${collapseRateRankSentence}` : ""}`
          : `The ${selectedCollapseRateMultiplier} rate versus the national average places ${reportArea} among the provinces with documented historical vulnerability above the ARCUS/AINOP benchmark.${collapseRateRankSentence ? ` ${collapseRateRankSentence}` : ""}`
        : it
          ? "Collapse Rate non disponibile: denominatore AINOP insufficiente o copertura non validata per questa provincia."
          : "Collapse Rate unavailable: AINOP denominator is insufficient or coverage is not validated for this province.";
    const eventClusterNote =
      historicalPatternReading.topDateCount >= 2
          ? it
            ? `I ${historicalPatternReading.topDateCount} casi concentrati nella data ${historicalPatternReading.topDate} vanno letti come cluster di evento, non come eventi indipendenti ricorrenti.`
            : `The ${historicalPatternReading.topDateCount} cases concentrated on ${historicalPatternReading.topDate} should be read as an event cluster, not as independent recurring events.`
          : "";
    const collapseConfidenceNote = selectedCollapseRateAvailable
      ? it
        ? `Confidenza del denominatore Collapse Rate: ${selectedCollapseRateConfidence}. Il denominatore AINOP deve essere letto come copertura disponibile del censimento ponti, non come inventario perfetto del patrimonio.`
        : `Collapse Rate denominator confidence: ${selectedCollapseRateConfidence}. The AINOP denominator should be read as available bridge-census coverage, not as a perfect inventory of the bridge stock.`
      : it
        ? "Confidenza del denominatore Collapse Rate non disponibile per copertura AINOP insufficiente."
        : "Collapse Rate denominator confidence unavailable because AINOP coverage is insufficient.";
    const mitigationReportSummary = buildMitigationReportSummary(
      path01MitigationIntelligence,
      { language }
    );
    let y = margin;

    const setFill = (color) => pdf.setFillColor(...color);
    const setDraw = (color) => pdf.setDrawColor(...color);
    const setText = (color) => pdf.setTextColor(...color);
    const clean = (value) =>
      cleanDisplayText(value)
        .replace(/<[^>]+>/g, " ")
        .replace(/\s+/g, " ")
        .trim();
    const isHydraulicDominant = String(
      hazardLabel || dominantCause
    )
      .toLowerCase()
      .includes("hydraulic");
    const hasClusteredHistoricalPattern =
      historicalPatternReading.isConcentrated ||
      historicalPatternReading.isClusteredEvent;
    const technicalDataRequestAction = isHydraulicDominant
      ? `For hydraulic-triggered collapses in ${reportArea}, priority data includes: hydraulic model with TR100/TR200 flood scenarios, preliminary scour depth estimate at piers, riverbed/bathymetry evidence at crossings and debris-transport indicators where mountain, confined-channel or minor-torrent basins are involved.`
      : `Request the minimum technical data package for the dominant ${hazardLabel} signal: local hazard study, asset geometry, foundation/abutment exposure, inspection history and source-backed site constraints.`;
    const geomorphologyCheckAction = isHydraulicDominant
      ? `Differentiate checks by geomorphology in ${reportArea}: torrential, confined or steep watercourses require scour susceptibility and debris-transport checks; lowland river crossings require flood level verification, inundation duration and backwater sensitivity.`
      : `Commission site-specific checks calibrated to the dominant ${hazardLabel} context and local geomorphology before moving from provincial screening to design assumptions.`;
    const pdfActionRows = selectedRecommendations
      .map((item) =>
        clean(item)
          .replace(
            /Use the Step 3 exposure indicators/i,
            "Use the territorial exposure indicators"
          )
          .replace(
            /Usare la mappa Step 3/i,
            "Usare gli indicatori territoriali di esposizione"
          )
      )
      .slice(0, 5);
    pdfActionRows[1] = hasClusteredHistoricalPattern
      ? it
        ? "Leggere lo scenario storico concentrato documentato e usare mappa/appendice solo come riferimento ai casi."
        : "Review the documented concentrated historical scenario and use the map/appendix only as case reference."
      : it
        ? "Leggere il pattern storico distribuito e usare i casi singoli come riferimento in mappa/appendice."
        : "Read the documented distributed historical pattern and use individual cases as map/appendix references.";
    pdfActionRows[2] = technicalDataRequestAction;
    pdfActionRows[3] = geomorphologyCheckAction;
    const briefActionRows = [...pdfActionRows];
    briefActionRows[2] = isHydraulicDominant
      ? "Request TR100/TR200 hydraulic model, preliminary scour estimate, riverbed/bathymetry evidence and debris-transport indicators where relevant."
      : `Request the minimum technical data package for the dominant ${hazardLabel} signal before site-specific design assumptions.`;
    briefActionRows[3] = isHydraulicDominant
      ? "Differentiate checks by geomorphology: torrential/confined channels require scour/debris checks; lowland crossings require flood level and duration checks."
      : `Commission site-specific checks calibrated to the dominant ${hazardLabel} context and local geomorphology.`;
    const dataRequestSummary = isHydraulicDominant
      ? "TR100/TR200 hydraulic model; preliminary scour depth; riverbed/bathymetry evidence; debris transport indicators where relevant."
      : "Local hazard study; asset geometry and foundations; inspection history; source-backed site constraints.";
    const hydraulicMethodologyNote = it
      ? "Hydraulic cause category: ARCUS uses 'hydraulic' as the documented trigger when sources confirm a flood or high-water event as the proximate cause. Mechanism-level classification - scour, bank erosion, debris impact, overtopping - is applied only where primary technical sources provide sufficient engineering evidence."
      : "Hydraulic cause category: ARCUS uses 'hydraulic' as the documented trigger when sources confirm a flood or high-water event as the proximate cause. Mechanism-level classification - scour, bank erosion, debris impact, overtopping - is applied only where primary technical sources provide sufficient engineering evidence.";
    const formatPdfDate = (value) => {
      if (!value) {
        return "-";
      }

      const date = new Date(value);
      if (Number.isNaN(date.getTime())) {
        return clean(value);
      }

      return date.toLocaleDateString(it ? "it-IT" : "en-US", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      });
    };
    const addFooter = () => {
      const pages = pdf.internal.getNumberOfPages();
      setDraw(palette.border);
      pdf.setLineWidth(0.2);
      pdf.line(margin, 284, pageWidth - margin, 284);
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(7.5);
      setText(palette.muted);
      pdf.text("ARCUS Professional", margin, 289);
      pdf.text(
        `Path ${activeEntryPath + 1} / ${reportArea}`,
        pageWidth / 2,
        289,
        { align: "center" }
      );
      if (reportReference) {
        pdf.setFont("courier", "normal");
        pdf.setFontSize(5.5);
        pdf.text(
          reportReference,
          pageWidth - margin - 10,
          289,
          { align: "right" }
        );
      }
      pdf.text(String(pages), pageWidth - margin, 289, {
        align: "right",
      });
    };
    const newPage = () => {
      addFooter();
      pdf.addPage();
      y = margin;
    };
    const ensure = (height) => {
      if (y + height > bottom) {
        newPage();
      }
    };
    const drawText = (
      text,
      x,
      startY,
      width,
      {
        align = "left",
        color = palette.ink,
        font = "normal",
        lineHeight = 5,
        size = 10,
      } = {}
    ) => {
      pdf.setFont("helvetica", font);
      pdf.setFontSize(size);
      setText(color);
      const lines = pdf.splitTextToSize(clean(text), width);
      lines.forEach((line, index) => {
        pdf.text(line, x, startY + index * lineHeight, {
          align,
          maxWidth: width,
        });
      });
      return lines.length * lineHeight;
    };
    const drawJustifiedText = (
      text,
      x,
      startY,
      width,
      {
        color = palette.muted,
        font = "normal",
        justifyLastLine = false,
        lineHeight = 4.5,
        maxLines = Infinity,
        size = 8.4,
      } = {}
    ) => {
      pdf.setFont("helvetica", font);
      pdf.setFontSize(size);
      setText(color);

      const lines = pdf
        .splitTextToSize(clean(text), width)
        .slice(0, maxLines);

      lines.forEach((line, index) => {
        const isLast = index === lines.length - 1;
        const words = clean(line).split(/\s+/).filter(Boolean);
        const shouldJustify =
          words.length > 1 &&
          (!isLast || justifyLastLine) &&
          pdf.getTextWidth(words.join(" ")) > width * 0.55;

        if (!shouldJustify) {
          pdf.text(words.join(" "), x, startY + index * lineHeight, {
            maxWidth: width,
          });
          return;
        }

        const wordsWidth = words.reduce(
          (total, word) => total + pdf.getTextWidth(word),
          0
        );
        const gap = (width - wordsWidth) / (words.length - 1);
        let cursorX = x;

        words.forEach((word, wordIndex) => {
          pdf.text(word, cursorX, startY + index * lineHeight);
          cursorX +=
            pdf.getTextWidth(word) +
            (wordIndex < words.length - 1 ? gap : 0);
        });
      });

      return lines.length * lineHeight;
    };
    const heading = (number, title, reserve = 18) => {
      const topGap = y > margin + 2 ? 5 : 0;

      ensure(reserve + topGap);
      y += topGap;
      setFill(palette.soft);
      setDraw(palette.border);
      pdf.roundedRect(margin, y - 1, 10, 8, 1, 1, "FD");
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(8);
      setText(palette.accent);
      pdf.text(String(number).padStart(2, "0"), margin + 5, y + 4, {
        align: "center",
      });
      pdf.setFontSize(10);
      setText(palette.accent);
      pdf.text(String(title).toUpperCase(), margin + 14, y + 4);
      y += 11;
    };
    const paragraph = (text, options = {}) => {
      const width = options.width || contentWidth;
      const lineHeight = options.lineHeight || 5;
      const lines = pdf.splitTextToSize(clean(text), width);
      ensure(lines.length * lineHeight + 3);
      drawJustifiedText(text, options.x || margin, y, width, {
        color: options.color || palette.muted,
        font: options.font || "normal",
        lineHeight,
        size: options.size || 9.5,
      });
      y += lines.length * lineHeight + 4;
    };
    const box = ({
      accent = false,
      height,
      text,
      title,
      value,
      width = contentWidth,
      x = margin,
    }) => {
      ensure(height);
      setFill(accent ? palette.soft : palette.panel);
      setDraw(accent ? palette.accent : palette.border);
      pdf.roundedRect(x, y, width, height, 1.4, 1.4, "FD");
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(7.5);
      setText(palette.accent);
      const titleLines = pdf
        .splitTextToSize(clean(title).toUpperCase(), width - 8)
        .slice(0, 1);
      pdf.text(titleLines, x + 4, y + 6);
      let valueLineCount = 0;
      if (value) {
        pdf.setFontSize(String(value).length > 18 ? 10.5 : 14);
        setText(palette.ink);
        const valueLines = pdf
          .splitTextToSize(clean(value), width - 8)
          .slice(0, 2);
        valueLineCount = valueLines.length;
        pdf.text(valueLines, x + 4, y + 15);
      }
      if (text) {
        pdf.setFont("helvetica", "normal");
        pdf.setFontSize(8.1);
        setText(palette.muted);
        const textY = y + (value ? 17 + valueLineCount * 5 : 13);
        const maxLines = Math.max(
          1,
          Math.floor((height - (textY - y) - 4) / 4.1)
        );
        const textLines = pdf
          .splitTextToSize(clean(text), width - 8)
          .slice(0, maxLines);

        if (
          textLines.length === maxLines &&
          pdf.splitTextToSize(clean(text), width - 8).length >
            maxLines
        ) {
          textLines[maxLines - 1] = `${textLines[
            maxLines - 1
          ].replace(/\s+\S*$/, "")}...`;
        }

        drawJustifiedText(textLines.join(" "), x + 4, textY, width - 8, {
          color: palette.muted,
          lineHeight: 4.1,
          maxLines,
          size: 8.1,
        });
      }
    };
    const kpiGrid = (items) => {
      const gap = 4;
      const cardWidth = (contentWidth - gap * 3) / 4;
      const cardHeight = 43;
      const startY = y;
      items.slice(0, 4).forEach((item, index) => {
        box({
          height: cardHeight,
          text: item.text,
          title: item.title,
          value: item.value,
          width: cardWidth,
          x: margin + index * (cardWidth + gap),
        });
      });
      y = startY + cardHeight + 6;
    };
    const compactKpiGrid = (items) => {
      const gap = 3;
      const cardWidth = (contentWidth - gap * 3) / 4;
      const cardHeight = 29;
      const startY = y;

      items.slice(0, 4).forEach((item, index) => {
        const x = margin + index * (cardWidth + gap);
        setFill(palette.panel);
        setDraw(palette.border);
        pdf.roundedRect(x, startY, cardWidth, cardHeight, 1.2, 1.2, "FD");
        pdf.setFont("helvetica", "bold");
        pdf.setFontSize(6.6);
        setText(palette.accent);
        pdf.text(clean(item.title).toUpperCase(), x + 3, startY + 5);
        pdf.setFontSize(String(item.value).length > 12 ? 9.5 : 12);
        setText(palette.ink);
        pdf.text(clean(item.value), x + 3, startY + 14);
        pdf.setFont("helvetica", "normal");
        pdf.setFontSize(7);
        setText(palette.muted);
        pdf.text(
          pdf.splitTextToSize(clean(item.text), cardWidth - 6).slice(0, 2),
          x + 3,
          startY + 22
        );
      });

      y = startY + cardHeight + 5;
    };
    const bulletList = (items) => {
      items.filter(Boolean).forEach((item) => {
        ensure(10);
        setFill(palette.accent);
        pdf.circle(margin + 1.8, y - 1.5, 1.1, "F");
        const used = drawText(item, margin + 6, y, contentWidth - 6, {
          color: palette.muted,
          lineHeight: 4.5,
          size: 9,
        });
        y += Math.max(used, 5) + 2;
      });
      y += 2;
    };
    const compactBulletList = (items) => {
      items.filter(Boolean).forEach((item) => {
        ensure(8);
        setFill(palette.accent);
        pdf.circle(margin + 1.6, y - 1.2, 0.9, "F");
        const used = drawText(item, margin + 5.5, y, contentWidth - 5.5, {
          color: palette.muted,
          lineHeight: 4,
          size: 8.1,
        });
        y += Math.max(used, 4.5) + 1;
      });
      y += 1;
    };
    const table = (
      columns,
      rows,
      {
        columnWeights,
        cellPaddingX = 2.2,
        fontSize = 7.3,
        headerHeight = 8,
        lineHeight = 3.6,
        maxLines = 4,
        minRowHeight = 11,
        rowPadding = 7.2,
      } = {}
    ) => {
      const weights =
        columnWeights?.length === columns.length
          ? columnWeights
          : columns.map(() => 1);
      const totalWeight = weights.reduce((total, weight) => total + weight, 0);
      const colWidths = weights.map(
        (weight) => (contentWidth * weight) / totalWeight
      );
      const colXs = colWidths.reduce(
        (positions, width, index) => [
          ...positions,
          index === 0 ? margin : positions[index - 1] + colWidths[index - 1],
        ],
        []
      );
      const ellipsize = (value, width) => {
        const text = clean(value);

        if (pdf.getTextWidth(text) <= width) {
          return text;
        }

        let shortened = text;

        while (
          shortened.length > 0 &&
          pdf.getTextWidth(`${shortened}...`) > width
        ) {
          shortened = shortened.slice(0, -1).trimEnd();
        }

        return shortened ? `${shortened}...` : "...";
      };
      const normalizeCellLines = (cell, width) => {
        const availableWidth = Math.max(8, width - cellPaddingX * 2);
        const allLines = pdf.splitTextToSize(clean(cell), availableWidth);
        const lines = allLines.slice(0, maxLines);

        if (allLines.length > maxLines && lines.length) {
          lines[lines.length - 1] = ellipsize(
            lines[lines.length - 1].replace(/\s+\S*$/, "").trim() ||
              lines[lines.length - 1],
            availableWidth
          );
        }

        return lines.length ? lines : ["-"];
      };
      const drawHeader = () => {
        ensure(headerHeight + 8);
        setFill(palette.soft);
        setDraw(palette.border);
        pdf.rect(margin, y, contentWidth, headerHeight, "FD");
        pdf.setFont("helvetica", "bold");
        pdf.setFontSize(7.2);
        setText(palette.ink);
        columns.forEach((column, index) => {
          const headerText = ellipsize(
            clean(column).toUpperCase(),
            colWidths[index] - cellPaddingX * 2
          );
          pdf.text(
            headerText,
            colXs[index] + cellPaddingX,
            y + headerHeight - 3
          );
        });
        y += headerHeight;
      };

      drawHeader();
      rows.forEach((row, rowIndex) => {
        const cellLines = row.map((cell, index) =>
          normalizeCellLines(cell, colWidths[index])
        );
        const maxCellLines = Math.max(
          1,
          Math.max(...cellLines.map((lines) => lines.length))
        );
        const rowHeight = Math.max(
          minRowHeight,
          maxCellLines * lineHeight + rowPadding
        );

        if (y + rowHeight > bottom) {
          newPage();
          drawHeader();
        }

        setFill(rowIndex % 2 === 0 ? [255, 255, 255] : palette.panel);
        setDraw(palette.border);
        pdf.rect(margin, y, contentWidth, rowHeight, "FD");
        pdf.setFont("helvetica", "normal");
        pdf.setFontSize(fontSize);
        setText(palette.muted);
        cellLines.forEach((lines, index) => {
          const textStartY =
            y +
            (rowHeight - (lines.length - 1) * lineHeight) / 2 +
            1.2;

          lines.forEach((line, lineIndex) => {
            pdf.text(
              line,
              colXs[index] + cellPaddingX,
              textStartY + lineIndex * lineHeight,
              { maxWidth: colWidths[index] - cellPaddingX * 2 }
            );
          });
        });
        y += rowHeight;
      });
      y += 5;
    };
    const fullTextBox = ({
      accent = false,
      minHeight = 24,
      text,
      title,
      width = contentWidth,
      x = margin,
    }) => {
      const bodyStartOffset = title ? 12.8 : 6.2;
      const lineHeight = 4.8;
      const lines = pdf.splitTextToSize(clean(text), width - 7);
      const height = Math.max(
        minHeight,
        bodyStartOffset + lines.length * lineHeight + 6
      );
      ensure(height);
      setFill(accent ? palette.soft : palette.panel);
      setDraw(accent ? palette.accent : palette.border);
      pdf.roundedRect(x, y, width, height, 1.4, 1.4, "FD");

      if (title) {
        pdf.setFont("helvetica", "bold");
        pdf.setFontSize(7.5);
        setText(palette.accent);
        pdf.text(clean(title).toUpperCase(), x + 3.5, y + 5.5);
      }

      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(8.4);
      setText(palette.muted);
      drawJustifiedText(lines.join(" "), x + 3.5, y + bodyStartOffset, width - 7, {
        color: palette.muted,
        lineHeight,
        size: 8.4,
      });
      y += height + 5;
    };
    const addLogo = (x, logoY, width, height) => {
      setFill(palette.panel);
      setDraw(palette.accent);
      pdf.setLineWidth(0.35);
      pdf.roundedRect(x, logoY, width, height, 1.6, 1.6, "FD");

      if (logoImage) {
        const inset = 2.2;
        pdf.addImage(
          logoImage,
          "PNG",
          x + inset,
          logoY + inset,
          width - inset * 2,
          height - inset * 2,
          undefined,
          "FAST"
        );
        return;
      }

      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(20);
      setText(palette.accent);
      pdf.text("ARCUS", x + width / 2, logoY + height / 2 + 3, {
        align: "center",
      });
    };
    const getMapFrameMetrics = (height = 82, width = contentWidth) => {
      const naturalRatio =
        mapImageSize?.width && mapImageSize?.height
          ? mapImageSize.width / mapImageSize.height
          : 900 / 760;
      const innerHeight = height - 13;
      const maxInnerWidth = width - 6;
      let drawWidth = maxInnerWidth;
      let drawHeight = drawWidth / naturalRatio;

      if (drawHeight > innerHeight) {
        drawHeight = innerHeight;
        drawWidth = drawHeight * naturalRatio;
      }

      const frameWidth =
        drawWidth < maxInnerWidth * 0.9
          ? Math.min(width, Math.max(drawWidth + 6, 58))
          : width;

      return {
        drawHeight,
        drawWidth,
        frameWidth,
        isNarrow: frameWidth < width * 0.82,
      };
    };
    const addMap = (
      height = 82,
      {
        advance = true,
        caption = `${reportArea.toUpperCase()} / ARCUS ATLAS EXTRACT`,
        forceMessage = false,
        message = it
          ? "Mappa non disponibile: il PDF resta valido come report analitico."
          : "Map unavailable: the PDF remains valid as analytical report.",
        width = contentWidth,
        x = margin,
      } = {}
    ) => {
      if (advance) {
        ensure(height + 11);
      }

      let frameX = x;
      let frameWidth = width;
      let imagePlacement = null;

      if (!forceMessage && mapImage?.startsWith("data:image")) {
        const naturalRatio =
          mapImageSize?.width && mapImageSize?.height
            ? mapImageSize.width / mapImageSize.height
            : 900 / 760;
        const innerHeight = height - 13;
        const metrics = getMapFrameMetrics(height, width);
        frameWidth = metrics.frameWidth;
        if (frameWidth < width) {
          frameX = x + (width - frameWidth) / 2;
        }

        const innerX = frameX + 3;
        const innerY = y + 3;
        const innerWidth = frameWidth - 6;

        let drawWidth = innerWidth;
        let drawHeight = drawWidth / naturalRatio;
        if (drawHeight > innerHeight) {
          drawHeight = innerHeight;
          drawWidth = drawHeight * naturalRatio;
        }

        imagePlacement = {
          drawHeight,
          drawWidth,
          drawX: innerX + (innerWidth - drawWidth) / 2,
          drawY: innerY + (innerHeight - drawHeight) / 2,
          innerHeight,
          innerWidth,
          innerX,
          innerY,
        };
      }

      setFill(palette.panel);
      setDraw(palette.border);
      pdf.roundedRect(frameX, y, frameWidth, height, 1.5, 1.5, "FD");
      if (mapImage?.startsWith("data:image")) {
        try {
          setFill([246, 246, 241]);
          pdf.rect(
            imagePlacement.innerX,
            imagePlacement.innerY,
            imagePlacement.innerWidth,
            imagePlacement.innerHeight,
            "F"
          );
          pdf.addImage(
            mapImage,
            mapImage.includes("jpeg") ? "JPEG" : "PNG",
            imagePlacement.drawX,
            imagePlacement.drawY,
            imagePlacement.drawWidth,
            imagePlacement.drawHeight,
            undefined,
            "FAST"
          );
        } catch {
          drawText(
            it
              ? "Mappa non incorporabile in questa sessione."
            : "Map cannot be embedded in this session.",
            frameX + 6,
            y + 18,
            frameWidth - 12,
            { color: palette.muted, size: 9 }
          );
        }
      } else {
        drawText(
          message,
          x + 6,
          y + 18,
          width - 12,
          { color: palette.muted, size: 9 }
        );
      }
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(7.5);
      setText(palette.accent);
      pdf.text(
        caption,
        frameX + 4,
        y + height - 3.5
      );

      if (advance) {
        y += height + 9;
      }

      return { frameWidth, height };
    };
    const cover = () => {
      setFill([255, 255, 255]);
      pdf.rect(0, 0, pageWidth, pageHeight, "F");
      setFill(palette.accent);
      pdf.rect(margin, 8, contentWidth, 0.7, "F");
      setFill(palette.panel);
      setDraw(palette.border);
      pdf.roundedRect(14, 16, 182, 262, 2, 2, "FD");
      addLogo(24, 28, 54, 39);
      pdf.setFont("times", "bold");
      pdf.setFontSize(27);
      setText(palette.ink);
      const title = variant === "brief"
        ? it
          ? "Territory Briefing / One-Page"
          : "Territory Briefing / One-Page"
        : it
          ? "Territory Briefing"
          : "Territory Briefing";
      pdf.text(pdf.splitTextToSize(`${title}: ${reportArea}`, 142), 27, 84);
      drawText(
        it
          ? "Screening professionale a scala provinciale basato su evidenza storica ARCUS, esposizione territoriale, Collapse Rate ARCUS/AINOP e lettura del pattern storico."
          : "Professional province-level screening based on ARCUS historical evidence, territorial exposure, ARCUS/AINOP Collapse Rate and historical-pattern reading.",
        27,
        122,
        142,
        { color: palette.muted, lineHeight: 5.4, size: 10.2 }
      );
      const coverSignalY = 146;
      const coverSignalWidth = 42;
      [
        ["Priority", `${selectedFinalPriorityIndexLabel}/100`],
        [
          "Collapse",
          collapseRateRankLabel
            ? `${selectedCollapseRateMultiplier} / ${collapseRateRankLabel}`
            : selectedCollapseRateMultiplier,
        ],
        ["Events", String(workflowEvents.length)],
      ].forEach(([label, value], index) => {
        const x = 27 + index * (coverSignalWidth + 6);
        setFill(palette.soft);
        setDraw(palette.border);
        pdf.roundedRect(
          x,
          coverSignalY,
          coverSignalWidth,
          18,
          1,
          1,
          "FD"
        );
        pdf.setFont("helvetica", "bold");
        pdf.setFontSize(6.4);
        setText(palette.accent);
        pdf.text(label.toUpperCase(), x + 3, coverSignalY + 5);
        pdf.setFontSize(String(value).length > 16 ? 8 : 10);
        setText(palette.ink);
        pdf.text(clean(value), x + 3, coverSignalY + 12);
      });
      setFill(palette.panel);
      setDraw(palette.accent);
      pdf.roundedRect(27, 170, 134, 20, 1.2, 1.2, "FD");
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(6.5);
      setText(palette.accent);
      pdf.text(
        (it ? "MESSAGGIO DECISIONALE" : "DECISION MESSAGE"),
        31,
        176
      );
      drawText(
        historicalPatternReading.type,
        31,
        184,
        126,
        { color: palette.ink, font: "bold", lineHeight: 4.2, size: 9.2 }
      );
      const meta = [
        ["Report date", today],
        ["Context", projectDesignFocus.contextLabel],
        ["Province", reportArea],
        ["Output", selectedPath01Intent?.label || "Path 1"],
        [
          it ? "Finestra evidenza" : "Evidence window",
          pdfEvidenceYearRange
            ? pdfEvidenceYearRange
            : it
              ? "2000-oggi"
              : "2000-today",
        ],
      ];
      meta.forEach(([label, value], index) => {
        const isWide = index === 4;
        const x = isWide ? 27 : 27 + (index % 2) * 72;
        const yy = index < 4 ? 198 + Math.floor(index / 2) * 21 : 240;
        const boxWidth = isWide ? 134 : 62;
        setFill(palette.soft);
        setDraw(palette.border);
        pdf.roundedRect(x, yy, boxWidth, 15, 1, 1, "FD");
        pdf.setFont("helvetica", "bold");
        pdf.setFontSize(6.5);
        setText(palette.accent);
        pdf.text(label.toUpperCase(), x + 3, yy + 5);
        pdf.setFontSize(8);
        setText(palette.ink);
        pdf.text(
          pdf.splitTextToSize(clean(value), boxWidth - 8).slice(0, 2),
          x + 3,
          yy + 10
        );
      });
      setFill(palette.panel);
      setDraw(palette.border);
      pdf.roundedRect(27, 260, 134, 16, 1.2, 1.2, "FD");
      drawText(
        it
          ? "ARCUS nasce dal primo database sistematico dei ponti crollati in Italia dal 2000 a oggi: il report non classifica soltanto casi, ma legge pattern storici documentati per orientare controlli preliminari."
          : "ARCUS is built on the first systematic database of collapsed bridges in Italy from 2000 to today: the report does not merely rank cases, it reads documented historical patterns to guide preliminary checks.",
        31,
        266,
        126,
        { color: palette.muted, lineHeight: 3.5, size: 7 }
      );
      addFooter();
      pdf.addPage();
      y = margin;
    };
    const summaryText = it
      ? `La provincia selezionata richiede uno screening preliminare per interventi ${projectDesignFocus.contextLabel}. Il valore ARCUS non e la lista dei casi: e capire se ${reportArea} ha gia mostrato vulnerabilita concentrata in condizioni estreme o un rischio distribuito nel tempo.`
      : `The selected province requires preliminary screening for ${projectDesignFocus.contextLabel} interventions. The value is not the case list: it is understanding whether ${reportArea} has already shown concentrated vulnerability under extreme conditions or risk distributed over time.`;
    const eventRows = workflowEvents.slice(0, 7).map((event) => [
      event.event_id,
      formatPdfDate(event.date || event.event_date || event.collapse_date),
      `${event.municipality || "-"}${event.year ? ` (${event.year})` : ""}`,
      pdfSeverityLabel(event.collapse_severity),
      eventEvidenceGrade(event),
      event.specific_cause || "-",
    ]);

    const path02DataPackage = (hazard) => {
      const value = String(hazard || "").toLowerCase();

      if (value.includes("multi")) {
        return "Integrated hydraulic, geotechnical and structural inspection plan; foundation details; last inspection reports; local hazard studies.";
      }

      if (value.includes("hydraulic") && value.includes("torrential")) {
        return "TR100/TR200 hydraulic model; preliminary scour depth at piers; riverbed/bathymetry evidence; debris transport indicators; post-event inspection log.";
      }

      if (value.includes("hydraulic")) {
        return "TR100/TR200 flood levels; residual freeboard; abutment and access embankment condition; inundation duration and backwater sensitivity.";
      }

      if (value.includes("landslide")) {
        return "Updated PAI landslide perimeter; slope movement indicators; drainage condition upstream; abutment crack/movement log.";
      }

      if (value.includes("seismic")) {
        return "Structural drawings; bearing and restraint condition; year/design code; vulnerability assessment for pre-1980 bridges in zones 1 or 2.";
      }

      return "Asset geometry, inspection history, foundation/abutment exposure, local hazard study and source-backed site constraints.";
    };
    const path02BriefDataPackage = (hazard) => {
      const value = String(hazard || "").toLowerCase();

      if (value.includes("multi")) {
        return "Integrated inspection plan; foundation details; local hazard studies.";
      }

      if (value.includes("hydraulic") && value.includes("torrential")) {
        return "TR100/TR200 model; scour estimate; bathymetry; debris indicators.";
      }

      if (value.includes("hydraulic")) {
        return "TR100/TR200 levels; freeboard; abutments; inundation duration.";
      }

      if (value.includes("landslide")) {
        return "Updated PAI perimeter; slope movement; drainage and abutment logs.";
      }

      if (value.includes("seismic")) {
        return "Drawings; bearings/restraints; design code; seismic vulnerability screen.";
      }

      return "Geometry, inspection history, foundation exposure and local hazard study.";
    };
    const path02AttentionLabel = (label) =>
      it
        ? ({
            "Immediate attention": "Attenzione immediata",
            "Ordinary monitoring": "Monitoraggio ordinario",
            "Programmed attention": "Attenzione programmata",
          }[label] || label)
        : label;
    const path02ActionTierLabel = (label) =>
      it
        ? ({
            "Annual inspection plan": "Piano annuale",
            "Batch 1 - check first": "Batch 1 - prima verifica",
            "Batch 2 - next immediate": "Batch 2 - immediati successivi",
            "Batch 3 - complete immediate queue":
              "Batch 3 - completare coda immediata",
            "Ordinary monitoring cycle": "Ciclo ordinario",
          }[label] || label)
        : label;
    const path02ProximityLabel = (item) => {
      const distance =
        item.nearestEvent?.distance !== undefined
          ? `${item.nearestEvent.distance.toFixed(1)} km`
          : "";
      const band = item.proximityBand || "No spatial precedent";

      return distance ? `${band} / ${distance}` : band;
    };
    const path02TableProximityLabel = (item) => {
      const distance =
        item.nearestEvent?.distance !== undefined
          ? `${item.nearestEvent.distance.toFixed(1)} km`
          : "";
      const band =
        {
          "Direct local signal": "Direct",
          "Distant context": "Distant",
          "High proximity": "High",
          "Medium proximity": "Medium",
          "No spatial precedent": "No precedent",
          "Provincial context": "Provincial",
        }[item.proximityBand] ||
        item.proximityBand ||
        "No precedent";

      return distance ? `${band} / ${distance}` : band;
    };
    const path02BriefConfidenceNote = selectedCollapseRateAvailable
      ? it
        ? `Confidenza del denominatore Collapse Rate: ${selectedCollapseRateConfidence}. ${assetInventoryAudit.blocked} record caricati bloccati per campi obbligatori incompleti.`
        : `Collapse Rate denominator confidence: ${selectedCollapseRateConfidence}. ${assetInventoryAudit.blocked} uploaded records were blocked for incomplete required fields.`
      : it
        ? `Collapse Rate non disponibile. ${assetInventoryAudit.blocked} record caricati bloccati per campi obbligatori incompleti.`
        : `Collapse Rate unavailable. ${assetInventoryAudit.blocked} uploaded records were blocked for incomplete required fields.`;
    const path02TopRows = assetScreening.slice(0, 12).map((item) => [
      item.id,
      item.municipality || item.territory || "-",
      `${item.score || 0} / ${getAssetEvidenceGrade(item)}`,
      item.hazardProfileLabel || item.dominantHazard || "-",
      path02ActionTierLabel(item.actionTier),
      path02TableProximityLabel(item),
    ]);
    const path02BriefRows = assetScreening.slice(0, 5).map((item) => [
      `#${item.actionRank} ${item.id}`,
      item.municipality || item.territory || "-",
      `${item.score || 0}/${getAssetEvidenceGrade(item)}`,
      path02ActionTierLabel(item.actionTier),
    ]);
    const path02CriticalAssets = (
      assetScreening.filter(
        (item) => item.attentionLevel === "Immediate attention"
      ).length
        ? assetScreening.filter(
            (item) => item.attentionLevel === "Immediate attention"
          )
        : assetScreening.slice(0, 5)
    ).slice(0, 5);
    const path02ClusterRows = assetAttentionSummary.hazardCounts
      .slice(0, 5)
      .map((item) => [
        item.label,
        String(item.value),
        path02DataPackage(item.label),
      ]);
    const path02Coordinates = assetScreening
      .map((item) => ({
        latitude: Number(String(item.latitude).replace(",", ".")),
        longitude: Number(String(item.longitude).replace(",", ".")),
        province: item.territory,
      }))
      .filter(
        (item) =>
          Number.isFinite(item.latitude) &&
          Number.isFinite(item.longitude)
      );
    const path02LatSpan = path02Coordinates.length
      ? Math.max(...path02Coordinates.map((item) => item.latitude)) -
        Math.min(...path02Coordinates.map((item) => item.latitude))
      : 0;
    const path02LonSpan = path02Coordinates.length
      ? Math.max(...path02Coordinates.map((item) => item.longitude)) -
        Math.min(...path02Coordinates.map((item) => item.longitude))
      : 0;
    const path02ApproxSpanKm = Math.round(
      Math.sqrt(
        (path02LatSpan * 111) ** 2 +
          (path02LonSpan * 85) ** 2
      )
    );
    const path02ProvinceCount = new Set(
      path02Coordinates.map((item) => item.province).filter(Boolean)
    ).size;
    const path02ProvinceList = [
      ...new Set(path02Coordinates.map((item) => item.province).filter(Boolean)),
    ];
    const path02MapIsUseful =
      path02Coordinates.length > 0 &&
      path02ApproxSpanKm <= 320 &&
      path02ProvinceCount <= 5;
    const path02MapMessage = it
      ? "La distribuzione degli asset supera la scala utile di una singola mappa: usa Asset Table e GIS Package per il dettaglio geografico completo."
      : "Asset distribution exceeds single-map scale: see Asset Table and GIS Package exports for full geographic detail.";
    const path02DistributionText = it
      ? `${assetScreening.length} asset distribuiti su ${path02ProvinceCount} province: ${path02ProvinceList.slice(0, 9).join(", ")}${path02ProvinceList.length > 9 ? "..." : ""}. L'estensione approssimativa del dataset e ${path02ApproxSpanKm} km; per questo il dettaglio geografico completo e demandato ad Asset Table e GIS Package.`
      : `${assetScreening.length} assets across ${path02ProvinceCount} provinces: ${path02ProvinceList.slice(0, 9).join(", ")}${path02ProvinceList.length > 9 ? "..." : ""}. Approximate dataset span is ${path02ApproxSpanKm} km; full geographic detail is provided through Asset Table and GIS Package exports.`;
    const path02IsVulnerabilityAssessment =
      path02ReadingMode === "vulnerability_assessment";
    const path02ReportTitle = path02IsVulnerabilityAssessment
      ? "Portfolio Vulnerability Assessment"
      : "Asset Watchlist & Monitoring Priority";
    const path02HazardDistributionRows = assetAttentionSummary.hazardCounts
      .slice(0, 6)
      .map((item) => [
        item.label,
        String(item.value),
        `${percentage(item.value, assetScreening.length || 1)}%`,
      ]);
    const path02AttentionDistributionRows = [
      ["Immediate attention", assetAttentionSummary.immediate],
      ["Programmed attention", assetAttentionSummary.programmed],
      ["Ordinary monitoring", assetAttentionSummary.ordinary],
    ].map(([label, value]) => [
      path02AttentionLabel(label),
      String(value),
      `${percentage(value, assetScreening.length || 1)}%`,
    ]);

    if (activeEntryPath === 1) {
      const uploadedDate = assetSession.uploadedAt
        ? formatPdfDate(assetSession.uploadedAt)
        : today;
      const fileName = assetSession.fileName || "ARCUS asset inventory";
      const reportId = `P02-${new Date()
        .toISOString()
        .slice(0, 10)
        .replaceAll("-", "")}-${String(assetScreening.length).padStart(
        3,
        "0"
      )}`;
      const contextCollapseRate = selectedCollapseRateAvailable
        ? selectedCollapseRateMultiplier
        : "N/A";

      if (variant === "brief") {
        setFill([255, 255, 255]);
        pdf.rect(0, 0, pageWidth, pageHeight, "F");
        setFill(palette.accent);
        pdf.rect(margin, 8, contentWidth, 0.7, "F");
        addLogo(margin, 12, 34, 24);
        const drawBriefBox = ({
          accent = false,
          height,
          text,
          title,
          width,
          x,
          yy,
        }) => {
          setFill(accent ? palette.soft : palette.panel);
          setDraw(accent ? palette.accent : palette.border);
          pdf.roundedRect(x, yy, width, height, 1.2, 1.2, "FD");
          pdf.setFont("helvetica", "bold");
          pdf.setFontSize(6.5);
          setText(palette.accent);
          pdf.text(clean(title).toUpperCase(), x + 3, yy + 5);
          pdf.setFont("helvetica", "normal");
          pdf.setFontSize(7.1);
          setText(palette.muted);
          drawJustifiedText(clean(text), x + 3, yy + 12, width - 6, {
            color: palette.muted,
            lineHeight: 3.8,
            maxLines: Math.floor((height - 11) / 3.8),
            size: 7.1,
          });
        };
        const drawBriefTable = (x, yy, width, rows) => {
          const colWidths = [0.35, 0.28, 0.16, 0.21].map(
            (share) => share * width
          );
          const briefCellPadding = 1.6;
          const briefEllipsize = (value, availableWidth) => {
            const text = clean(value);

            if (pdf.getTextWidth(text) <= availableWidth) {
              return text;
            }

            let shortened = text;

            while (
              shortened.length > 0 &&
              pdf.getTextWidth(`${shortened}...`) > availableWidth
            ) {
              shortened = shortened.slice(0, -1).trimEnd();
            }

            return shortened ? `${shortened}...` : "...";
          };
          const headers = [
            "Priority",
            it ? "Comune" : "Municipality",
            "Score",
            it ? "Azione" : "Action",
          ];
          let cx = x;

          setFill(palette.soft);
          setDraw(palette.border);
          pdf.rect(x, yy, width, 7, "FD");
          pdf.setFont("helvetica", "bold");
          pdf.setFontSize(5.8);
          setText(palette.accent);
          headers.forEach((header, index) => {
            pdf.text(
              briefEllipsize(
                header.toUpperCase(),
                colWidths[index] - briefCellPadding * 2
              ),
              cx + briefCellPadding,
              yy + 4.8
            );
            cx += colWidths[index];
          });

          rows.slice(0, 5).forEach((row, rowIndex) => {
            const rowHeight = 8.4;
            const rowY = yy + 7 + rowIndex * rowHeight;
            cx = x;
            setDraw(palette.border);
            setFill(rowIndex % 2 === 0 ? [255, 255, 255] : palette.panel);
            pdf.rect(x, rowY, width, rowHeight, "FD");
            pdf.setFont("helvetica", "normal");
            pdf.setFontSize(6.1);
            setText(palette.ink);
            [row[0], row[1], row[2], row[3]].forEach((cell, index) => {
              pdf.text(
                briefEllipsize(
                  cell,
                  colWidths[index] - briefCellPadding * 2
                ),
                cx + briefCellPadding,
                rowY + 5.2
              );
              cx += colWidths[index];
            });
          });
        };
        pdf.setFont("helvetica", "bold");
        pdf.setFontSize(19);
        setText(palette.ink);
        pdf.text(
          path02IsVulnerabilityAssessment
            ? "Portfolio Vulnerability"
            : "Asset Watchlist",
          logoImage ? 52 : margin,
          21
        );
        pdf.setFontSize(8);
        setText(palette.accent);
        pdf.text(
          "ARCUS PROFESSIONAL / PATH 02 ONE-PAGE BRIEF",
          logoImage ? 52 : margin,
          28
        );
        pdf.setFont("helvetica", "normal");
        pdf.setFontSize(8.3);
        setText(palette.muted);
        pdf.text(
          pdf.splitTextToSize(clean(path02DecisionMessage), contentWidth).slice(0, 3),
          margin,
          43
        );
        y = 57;
        compactKpiGrid([
          {
            text: it ? "asset validi analizzati" : "valid assets assessed",
            title: it ? "Asset" : "Assets",
            value: String(assetScreening.length),
          },
          {
            text: it ? "da controllare prima" : "to check first",
            title: it ? "Immediati" : "Immediate",
            value: String(assetAttentionSummary.immediate),
          },
          {
            text: it
              ? "prima sequenza operativa"
              : "first operating batch",
            title: "Batch 1",
            value: String(assetAttentionSummary.batchOne),
          },
          {
            text: it ? "contesto provinciale" : "provincial context",
            title: "Collapse Rate",
            value: contextCollapseRate,
          },
        ]);
        y = 89;
        if (path02MapIsUseful) {
          addMap(68, {
            advance: false,
            caption: `PATH 02 / ${reportId} / TOP 5 BY PRIORITY`,
          });
        } else {
          drawBriefBox({
            accent: true,
            height: 68,
            title: `Asset distribution / ${reportId}`,
            text: `${path02MapMessage} ${path02DistributionText}`,
            width: contentWidth,
            x: margin,
            yy: y,
          });
        }
        drawBriefTable(
          margin,
          163,
          contentWidth,
          path02BriefRows
        );
        drawBriefBox({
          accent: true,
          height: 31,
          title: it
            ? path02IsVulnerabilityAssessment
              ? "Lettura dominante del portafoglio"
              : "Raccomandazione dominante"
            : path02IsVulnerabilityAssessment
              ? "Dominant Portfolio Reading"
              : "Dominant Monitoring Recommendation",
          text: it
            ? `Prima Batch 1 (${assetAttentionSummary.batchOne}), poi Batch 2 (${assetAttentionSummary.batchTwo}). Proximity provinciale puo restare immediate se hazard, vulnerabilita e comparabili sono alti.`
            : `Batch 1 first (${assetAttentionSummary.batchOne}), then Batch 2 (${assetAttentionSummary.batchTwo}). Provincial-context proximity can remain immediate when hazard, vulnerability and comparables are high.`,
          width: contentWidth,
          x: margin,
          yy: 214,
        });
        drawBriefBox({
          height: 25,
          title: path02IsVulnerabilityAssessment
            ? "Data Gaps To Close"
            : "Data Request Package",
          text: path02BriefDataPackage(assetAttentionSummary.dominantHazard),
          width: (contentWidth - 6) / 2,
          x: margin,
          yy: 247,
        });
        drawBriefBox({
          height: 25,
          title: it ? "Nota di confidenza" : "Confidence Note",
          text: path02BriefConfidenceNote,
          width: (contentWidth - 6) / 2,
          x: margin + (contentWidth + 6) / 2,
          yy: 247,
        });
        addFooter();
        pdf.save(filename);
        return;
      }

      setFill([255, 255, 255]);
      pdf.rect(0, 0, pageWidth, pageHeight, "F");
      setFill(palette.accent);
      pdf.rect(margin, 8, contentWidth, 0.7, "F");
      setFill(palette.panel);
      setDraw(palette.border);
      pdf.roundedRect(14, 16, 182, 262, 2, 2, "FD");
      addLogo(24, 28, 54, 39);
      pdf.setFont("times", "bold");
      pdf.setFontSize(26);
      setText(palette.ink);
      pdf.text(
        pdf.splitTextToSize(path02ReportTitle, 142),
        27,
        84
      );
      drawText(
        path02IsVulnerabilityAssessment
          ? "ARCUS Path 02 reads the uploaded bridge portfolio as a risk distribution: hazard profile shares, attention levels, contextual collapse-rate benchmark and data gaps for due diligence."
          : "ARCUS Path 02 crosses the uploaded bridge inventory with documented Italian bridge-collapse evidence, territorial hazard context and proximity to ARCUS precedents to produce a prioritized monitoring watchlist.",
        27,
        116,
        142,
        { color: palette.muted, lineHeight: 5.2, size: 9.6 }
      );
      [
        ["Assets", String(assetScreening.length)],
        ["Immediate", String(assetAttentionSummary.immediate)],
        ["Dominant", assetAttentionSummary.dominantHazard],
      ].forEach(([label, value], index) => {
        const cardX = 27 + index * 46;
        setFill(palette.soft);
        setDraw(palette.border);
        pdf.roundedRect(cardX, 146, 40, 20, 1, 1, "FD");
        pdf.setFont("helvetica", "bold");
        pdf.setFontSize(6.4);
        setText(palette.accent);
        pdf.text(label.toUpperCase(), cardX + 3, 152);
        pdf.setFontSize(String(value).length > 14 ? 7.4 : 11);
        setText(palette.ink);
        pdf.text(
          pdf.splitTextToSize(clean(value), 34).slice(0, 2),
          cardX + 3,
          159
        );
      });
      setFill(palette.panel);
      setDraw(palette.accent);
      pdf.roundedRect(27, 174, 134, 28, 1.2, 1.2, "FD");
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(6.5);
      setText(palette.accent);
      pdf.text(it ? "MESSAGGIO DECISIONALE" : "DECISION MESSAGE", 31, 180);
      drawText(path02DecisionMessage, 31, 188, 126, {
        color: palette.ink,
        lineHeight: 4,
        size: 8.2,
      });
      [
        ["Report ID", reportId],
        ["File", fileName],
        ["Upload", uploadedDate],
        ["Mode", selectedPath02ReadingMode],
        [
          "Output",
          path02IsVulnerabilityAssessment
            ? "Assessment / PDF / CSV / GeoJSON"
            : "Watchlist / PDF / CSV / GeoJSON",
        ],
      ].forEach(([label, value], index) => {
        const isWide = index === 4;
        const boxX = isWide ? 27 : 27 + (index % 2) * 72;
        const boxY = index < 4 ? 212 + Math.floor(index / 2) * 19 : 252;
        const boxW = isWide ? 134 : 62;
        setFill(palette.soft);
        setDraw(palette.border);
        pdf.roundedRect(boxX, boxY, boxW, 14, 1, 1, "FD");
        pdf.setFont("helvetica", "bold");
        pdf.setFontSize(6.3);
        setText(palette.accent);
        pdf.text(label.toUpperCase(), boxX + 3, boxY + 5);
        pdf.setFontSize(7.4);
        setText(palette.ink);
        pdf.text(
          pdf.splitTextToSize(clean(value), boxW - 8).slice(0, 2),
          boxX + 3,
          boxY + 10
        );
      });
      addFooter();
      pdf.addPage();
      y = margin;

      heading("01", "Executive Summary", 78);
      paragraph(path02DecisionMessage);
      compactKpiGrid([
        {
          text: it ? "record validi" : "valid records",
          title: it ? "Asset analizzati" : "Assessed assets",
          value: String(assetScreening.length),
        },
        {
          text: it ? "prima stagione di rischio" : "next risk season",
          title: it ? "Attenzione immediata" : "Immediate attention",
          value: String(assetAttentionSummary.immediate),
        },
        {
          text: it ? "piano annuale" : "annual plan",
          title: it ? "Attenzione programmata" : "Programmed attention",
          value: String(assetAttentionSummary.programmed),
        },
        {
          text: it ? "contesto provincia" : "province context",
          title: "Collapse Rate",
          value: contextCollapseRate,
        },
      ]);
      table(
        [
          path02IsVulnerabilityAssessment
            ? "Portfolio band"
            : it
              ? "Livello"
              : "Level",
          it ? "Asset" : "Assets",
          path02IsVulnerabilityAssessment
            ? "Portfolio reading"
            : it
              ? "Azione"
              : "Action",
        ],
        [
          [
            path02AttentionLabel("Immediate attention"),
            String(assetAttentionSummary.immediate),
            path02IsVulnerabilityAssessment
              ? `${percentage(
                  assetAttentionSummary.immediate,
                  assetScreening.length || 1
                )}% of the uploaded portfolio shows the highest attention band.`
              : it
                ? "Ispezione prima della prossima stagione di rischio."
                : "Inspect before the next risk season.",
          ],
          [
            path02AttentionLabel("Programmed attention"),
            String(assetAttentionSummary.programmed),
            path02IsVulnerabilityAssessment
              ? `${percentage(
                  assetAttentionSummary.programmed,
                  assetScreening.length || 1
                )}% of the uploaded portfolio sits in the annual-priority band.`
              : it
                ? "Inserire nel piano annuale con priorita."
                : "Include in the annual inspection plan with priority.",
          ],
          [
            path02AttentionLabel("Ordinary monitoring"),
            String(assetAttentionSummary.ordinary),
            path02IsVulnerabilityAssessment
              ? `${percentage(
                  assetAttentionSummary.ordinary,
                  assetScreening.length || 1
                )}% of the uploaded portfolio remains in the ordinary-monitoring band.`
              : it
                ? "Mantenere ciclo ordinario e arricchire dati tecnici."
                : "Maintain ordinary cycle and enrich technical data.",
          ],
        ],
        { columnWeights: [0.8, 0.45, 1.75], maxLines: 3 }
      );

      heading("02", "Asset Map", path02MapIsUseful ? 108 : 56);
      paragraph(
        path02MapIsUseful
          ? it
            ? "La mappa mostra i top 5 asset per Asset Priority Score. La distribuzione completa resta disponibile in Asset Table e GIS Package."
            : "Map shows top 5 assets by Asset Priority Score. Full distribution is available in Asset Table and GIS Package exports."
          : path02MapMessage
      );
      if (path02MapIsUseful) {
        addMap(102, {
          caption: `PATH 02 / ${reportId} / TOP 5 BY PRIORITY`,
        });
      } else {
        fullTextBox({
          accent: true,
          title: `Asset Distribution / ${reportId}`,
          text: `${path02MapMessage} ${path02DistributionText}`,
        });
      }

      heading("03", "Prioritized Watchlist", 90);
      paragraph(
        it
          ? "Nota di lettura: la Proximity e uno dei segnali dello score, non il criterio decisivo. Un asset con proximity 'Provincial context' puo restare in Immediate attention quando esposizione territoriale, profilo hazard, vulnerabilita comparabili, eta o tipologia mantengono alto l'Asset Priority Score. A parita di score, i batch sono ordinati per classe evidenza, fascia proximity e distanza ARCUS esatta nella fascia."
          : "Reading note: Proximity is one signal inside the score, not the decisive criterion. An asset with 'Provincial context' proximity can remain in Immediate attention when territorial exposure, hazard profile, comparable vulnerability, age or typology keep the Asset Priority Score high. For tied scores, batches are ordered by evidence class, proximity band and exact ARCUS distance within the band.",
        { lineHeight: 4.2, size: 8.1 }
      );
      table(
        [
          "ID",
          it ? "Comune" : "Municipality",
          "Score",
          "Hazard Profile",
          it ? "Batch operativo" : "Action Tier",
          "Proximity",
        ],
        path02TopRows,
        {
          columnWeights: [0.78, 0.95, 0.45, 1, 1.05, 0.82],
          fontSize: 6.5,
          maxLines: 2,
          minRowHeight: 9,
        }
      );

      if (path02IsVulnerabilityAssessment) {
        heading("04", "Portfolio Vulnerability Snapshot", 96);
        table(
          ["Hazard Profile", it ? "Asset" : "Assets", "Share"],
          path02HazardDistributionRows.length
            ? path02HazardDistributionRows
            : [["-", "0", "0%"]],
          {
            columnWeights: [1.2, 0.55, 0.55],
            fontSize: 7,
            maxLines: 3,
            minRowHeight: 10,
          }
        );
        table(
          [it ? "Livello" : "Attention Level", it ? "Asset" : "Assets", "Share"],
          path02AttentionDistributionRows,
          {
            columnWeights: [1.2, 0.55, 0.55],
            fontSize: 7,
            maxLines: 3,
            minRowHeight: 10,
          }
        );

        heading("05", "Context Benchmark And Data Gaps", 72);
        table(
          [it ? "Elemento" : "Element", it ? "Lettura" : "Reading"],
          [
            [
              "Collapse Rate Context",
              selectedCollapseRateAvailable
                ? `${contextCollapseRate} versus national ARCUS/AINOP benchmark; ${collapseConfidenceNote}`
                : "No usable AINOP denominator is available for a contextual Collapse Rate benchmark.",
            ],
            [
              "Portfolio Concentration",
              `${assetAttentionSummary.dominantHazard} is the dominant profile across ${percentage(
                assetAttentionSummary.hazardCounts[0]?.value || 0,
                assetScreening.length || 1
              )}% of assessed assets.`,
            ],
            [
              "Inventory Completeness",
              `${assetInventoryAudit.mandatory}/${assetInventoryAudit.total} records entered scoring; ${assetInventoryAudit.blocked} blocked records and ${assetInventoryAudit.warnings} territory warnings.`,
            ],
          ],
          {
            columnWeights: [0.65, 1.35],
            fontSize: 6.8,
            maxLines: 6,
            minRowHeight: 13,
          }
        );
      } else {
        fullTextBox({
          accent: true,
          minHeight: 29,
          title: it
            ? "Sequenza operativa del portafoglio"
            : "Portfolio Action Sequence",
          text: it
            ? `Partire dal Batch 1 (${assetAttentionSummary.batchOne} asset con score piu alto e contesto ARCUS piu rilevante), quindi completare Batch 2 (${assetAttentionSummary.batchTwo}) e Batch 3 (${assetAttentionSummary.batchThree}). La classe Immediate attention resta il perimetro urgente; i batch definiscono l'ordine operativo quando budget o squadre sono limitati.`
            : `Start with Batch 1 (${assetAttentionSummary.batchOne} highest-score assets with the strongest ARCUS context), then complete Batch 2 (${assetAttentionSummary.batchTwo}) and Batch 3 (${assetAttentionSummary.batchThree}). Immediate attention remains the urgent perimeter; batches define the operating order when budget or crews are constrained.`,
        });
        heading("04", "Critical Asset Sheets", 58);
        path02CriticalAssets.forEach((item) => {
          fullTextBox({
            accent: item.attentionLevel === "Immediate attention",
            title: `${item.id} / ${item.name} / ${item.score} / Evidence ${getAssetEvidenceGrade(item)}`,
            text: `${path02ActionTierLabel(item.actionTier)} within ${path02AttentionLabel(
              item.attentionLevel
            )}. Hazard Profile: ${item.hazardProfileLabel}. Proximity: ${path02ProximityLabel(
              item
            )}. Nearest ARCUS case: ${
              item.nearestEventSummary || "not available"
            } (evidence ${getAssetEvidenceGrade(item)}). ${item.monitoringRecommendation}`,
          });
        });

        heading("05", "Risk-Cluster Recommendations", 82);
        table(
          [
            "Hazard Profile",
            it ? "Asset" : "Assets",
            "Data Request Package",
          ],
          path02ClusterRows.length
            ? path02ClusterRows
            : [["-", "0", path02DataPackage("")]],
          {
            columnWeights: [0.8, 0.35, 1.85],
            fontSize: 6.8,
            maxLines: 6,
            minRowHeight: 14,
          }
        );
      }

      heading("06", "Methodology Snapshot", 92);
      table(
        [it ? "Elemento" : "Element", it ? "Significato" : "Meaning"],
        [
          [
            "Asset Priority Score",
            "Single-asset score (0-100) combining territorial exposure, dominant hazard, ARCUS proximity, comparable failures and available technical fields. It is distinct from the provincial Path 01 Priority Index.",
          ],
          [
            "Proximity Score",
            "Displayed with an operative band, not as false precision: <=500m direct signal, 500m-2km high, 2-10km medium, above 10km provincial context.",
          ],
          [
            "Action Tier",
            "A sequencing layer inside the attention class. If many assets are all immediate, Batch 1 identifies the first checks under constrained capacity. Ordering uses Asset Priority Score, evidence class, proximity band and exact ARCUS distance within the band.",
          ],
          [
            "Hazard Profile",
            "Dominant asset-level profile: Hydraulic, Landslide, Seismic or Multi-hazard. Hydraulic profiles are differentiated as torrential/confined or lowland/plain when evidence allows.",
          ],
          ["Hydraulic Cause Category", hydraulicMethodologyNote],
          [
            "AINOP Coverage",
            collapseConfidenceNote,
          ],
          [
            "Inventory Validation",
            `${assetInventoryAudit.mandatory}/${assetInventoryAudit.total} uploaded records had all required fields. ${assetInventoryAudit.blocked} records were blocked from scoring; ${assetInventoryAudit.warnings} province labels require verification.`,
          ],
          [
            "Evidence Classes",
            "A = primary institutional/technical source; B = reliable technical or media source; C = generic documentary evidence; D = weak evidence to strengthen. The class is shown next to asset scores and nearest ARCUS precedents.",
          ],
        ],
        {
          columnWeights: [0.52, 1.48],
          fontSize: 6.6,
          maxLines: 8,
          minRowHeight: 9,
        }
      );
      addFooter();
      pdf.save(filename);
      return;
    }

    if (variant === "brief") {
      setFill([255, 255, 255]);
      pdf.rect(0, 0, pageWidth, pageHeight, "F");
      setFill(palette.accent);
      pdf.rect(margin, 8, contentWidth, 0.7, "F");
      addLogo(margin, 12, 34, 24);
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(20);
      setText(palette.ink);
      pdf.text(`${reportArea}`, logoImage ? 52 : margin, 21);
      pdf.setFontSize(8);
      setText(palette.accent);
      pdf.text(
        "ARCUS PROFESSIONAL / ONE-PAGE TERRITORY BRIEFING",
        logoImage ? 52 : margin,
        28
      );
      y = 42;
      paragraph(summaryText, { size: 9.2, lineHeight: 4.7 });
      compactKpiGrid([
        {
          text: it ? "esposizione territoriale" : "territorial exposure",
          title: "Priority Index",
          value: `${selectedFinalPriorityIndexLabel}/100`,
        },
        {
          text: collapseRateRankLabel || (it ? `confidenza denominatore ${selectedCollapseRateConfidence}` : `denominator confidence ${selectedCollapseRateConfidence}`),
          title: "Collapse Rate",
          value: selectedCollapseRateMultiplier,
        },
        {
          text: it ? "casi ARCUS nel campione" : "ARCUS cases in sample",
          title: it ? "Eventi" : "Events",
          value: String(workflowEvents.length),
        },
        {
          text: it ? "fonti collegate" : "linked sources",
          title: it ? "Evidenza" : "Evidence",
          value: `${reliabilityGrade} / ${evidenceSources}`,
        },
      ]);
      ensure(82);
      const sideStartY = y;
      const nominalMapColumnWidth = 96;
      const briefMapMetrics = getMapFrameMetrics(76, nominalMapColumnWidth);
      const mapColumnWidth = Math.max(78, briefMapMetrics.frameWidth);
      addMap(76, {
        advance: false,
        width: mapColumnWidth,
        x: margin,
      });
      box({
        accent: true,
        height: 76,
        title: it ? "Messaggio decisionale" : "Decision Message",
        value: historicalPatternReading.type,
        text: `${historicalPatternReading.temporal} ${collapseInterpretation}`,
        width: contentWidth - mapColumnWidth - 7,
        x: margin + mapColumnWidth + 7,
      });
      y = sideStartY + 84;
      heading("01", it ? "Prossime azioni" : "Next Actions");
      compactBulletList(briefActionRows.slice(0, 4));
      y = y <= 214 ? 218 : y + 4;
      const miniStartY = y;
      box({
        height: 32,
        title: it ? "Data request package" : "Data request package",
        text: dataRequestSummary,
        width: (contentWidth - 6) / 2,
      });
      box({
        height: 32,
        title: it ? "Nota confidenza" : "Confidence note",
        text: collapseConfidenceNote,
        width: (contentWidth - 6) / 2,
        x: margin + (contentWidth + 6) / 2,
      });
      y = miniStartY + 38;
      addFooter();
      pdf.save(filename);
      return;
    }

    cover();
    heading("01", "Executive Summary");
    paragraph(summaryText);
    box({
      accent: true,
      height: 42,
      title: it ? "Uso raccomandato" : "Recommended use",
      text: projectDesignFocus.paragraph,
    });
    y += 48;
    kpiGrid([
      {
        text: it ? "indice di esposizione + lettura heritage" : "exposure index + heritage reading",
        title: "Priority Index",
        value: `${selectedFinalPriorityIndexLabel}/100`,
      },
      {
        text: selectedCollapseRateAvailable
          ? it
            ? `benchmark nazionale ARCUS/AINOP; confidenza denominatore ${selectedCollapseRateConfidence}`
            : `ARCUS/AINOP national benchmark; denominator confidence ${selectedCollapseRateConfidence}`
          : collapseConfidenceNote,
        title: "Collapse Rate",
        value: selectedCollapseRateMultiplier,
      },
      {
        text: it ? `${dominantCause} dominante` : `${dominantCause} dominant`,
        title: it ? "Eventi Storici" : "Historical Events",
        value: String(workflowEvents.length),
      },
      {
        text: it ? `${evidenceSources} fonti collegate` : `${evidenceSources} linked sources`,
        title: it ? "Affidabilita" : "Reliability",
        value: `${reliabilityGrade} / ${reliabilityValue}`,
      },
    ]);
    fullTextBox({
      accent: true,
      title: it
        ? "Interpretazione Collapse Rate"
        : "Collapse Rate interpretation",
      text: `${collapseInterpretation} ${collapseConfidenceNote}`,
    });
    newPage();
    heading(
      "02",
      it ? "Territory Reading & Map" : "Territory Reading & Map",
      188
    );
    const fullMapHeight = 92;
    const fullMapMetrics = getMapFrameMetrics(fullMapHeight, contentWidth);
    const canUseMapSideLayout =
      fullMapMetrics.isNarrow &&
      contentWidth - fullMapMetrics.frameWidth - 8 >= 62;

    if (canUseMapSideLayout) {
      ensure(fullMapHeight + 10);
      const mapBlockY = y;
      addMap(fullMapHeight, {
        advance: false,
        width: fullMapMetrics.frameWidth,
        x: margin,
      });
      const sideX = margin + fullMapMetrics.frameWidth + 8;
      const sideWidth = contentWidth - fullMapMetrics.frameWidth - 8;

      y = mapBlockY;
      box({
        height: 42,
        title: it ? "Geomorfologia e contesto" : "Geomorphology and context",
        text: territoryReading,
        width: sideWidth,
        x: sideX,
      });
      y = mapBlockY + 48;
      box({
        accent: true,
        height: 44,
        title: it ? "Lettura mappa" : "Map reading",
        text: it
          ? `La mappa localizza ${workflowEvents.length} casi ARCUS in ${pdfMunicipalityCount || 1} comuni e va letta insieme al pattern storico: ${historicalPatternReading.type}. Data dominante: ${historicalPatternReading.topDate || "n.d."}.`
          : `The map locates ${workflowEvents.length} ARCUS cases across ${pdfMunicipalityCount || 1} municipalities and should be read with the historical pattern: ${historicalPatternReading.type}. Dominant date: ${historicalPatternReading.topDate || "n/a"}.`,
        width: sideWidth,
        x: sideX,
      });
      y = mapBlockY + fullMapHeight + 9;
    } else {
      fullTextBox({
        title: it ? "Geomorfologia e contesto" : "Geomorphology and context",
        text: territoryReading,
      });
      addMap(fullMapHeight);
    }
    heading(
      "03",
      it ? "Historical Failure Context" : "Historical Failure Context",
      68
    );
    fullTextBox({
      accent: true,
      title: it ? "Pattern storico" : "Historical pattern",
      text: `${historicalPatternReading.type}. ${historicalPatternReading.temporal} ${eventClusterNote}`,
    });
    const patternStartY = y;
    const readingQuantitativeNote =
      hasClusteredHistoricalPattern
        ? historicalPatternReading.topDateShare >= 45
          ? `${historicalPatternReading.topDateShare}% in one flood scenario; check extreme single-event design scenarios.`
          : `${historicalPatternReading.topDateCount} cases on ${historicalPatternReading.topDate}; treat as an event cluster before reading recurrence.`
        : `${historicalPatternReading.topDateShare}% on the most recurrent date; read as distributed temporal risk plus local event clusters.`;
    box({
      height: 42,
      title: it ? "Trigger dominante" : "Dominant trigger",
      value: `${historicalPatternReading.dominantCauseShare}%`,
      text: dominantCause,
      width: (contentWidth - 8) / 3,
    });
    box({
      height: 42,
      title: "Hazard",
      value: hazardLabel,
      text: it ? "segnale territoriale dominante" : "dominant territorial signal",
      width: (contentWidth - 8) / 3,
      x: margin + (contentWidth + 4) / 3,
    });
    box({
      height: 42,
      title: it ? "Lettura" : "Reading",
      value:
        hasClusteredHistoricalPattern
          ? it
            ? "evento unico"
            : "single event"
          : it
            ? "rischio distribuito"
            : "distributed risk",
      text: readingQuantitativeNote,
      width: (contentWidth - 8) / 3,
      x: margin + ((contentWidth + 4) / 3) * 2,
    });
    y = patternStartY + 50;
    heading("04", it ? "Actions" : "Actions", 60);
    if (activeEntryPath === 0) {
      fullTextBox({
        accent: true,
        title: `Mitigation intelligence - ${mitigationReportSummary.status}`,
        text: [
          mitigationReportSummary.evidenceText,
          mitigationReportSummary.landslideSupportText,
          mitigationReportSummary.seismicSupportText,
          mitigationReportSummary.registryQualityText,
          mitigationReportSummary.retrievalRobustnessText,
          mitigationReportSummary.cohortText,
          mitigationReportSummary.outcomeText,
          mitigationReportSummary.sourceText,
          mitigationReportSummary.warningText,
        ].join(" "),
      });
    }
    bulletList(pdfActionRows);
    fullTextBox({
      title: it ? "Pacchetto dati richiesto" : "Data request package",
      text: dataRequestSummary,
    });
    fullTextBox({
      title: it ? "Nota confidenza denominatore Collapse Rate" : "Collapse Rate denominator confidence note",
      text: collapseConfidenceNote,
    });
    newPage();
    heading("05", it ? "Event Reference Appendix" : "Event Reference Appendix");
    paragraph(
      it
        ? "La lista seguente e un riferimento documentale, non una classifica operativa P1/P2/P3. Il messaggio decisionale resta il pattern storico provinciale."
        : "The following list is a documentary reference, not an operational P1/P2/P3 ranking. The decision message remains the provincial historical pattern.",
      { size: 8.8 }
    );
    table(
      ["ID", it ? "Data" : "Date", it ? "Comune" : "Municipality", it ? "Severita" : "Severity", "Evidence", it ? "Causa" : "Cause"],
      eventRows,
      {
        columnWeights: [0.58, 0.72, 1.05, 1, 0.5, 0.85],
        fontSize: 6.7,
        maxLines: 3,
        minRowHeight: 9,
      }
    );
    heading("06", "Methodology Snapshot");
    table(
      [it ? "Layer" : "Layer", it ? "Significato" : "Meaning"],
      [
        [
          "Priority Index",
          it
            ? "Indice di esposizione territoriale: sintetizza hazard dominante, densita casi ARCUS, concentrazione di eventi e affidabilita delle evidenze. Non misura direttamente la vulnerabilita storica del patrimonio ponte."
            : "Territorial exposure index: synthesizes dominant hazard, ARCUS case density, event concentration and evidence reliability. It does not directly measure historical bridge-stock vulnerability.",
        ],
        [
          "Collapse Rate",
          it
            ? `Rapporto tra casi ARCUS e ponti censiti AINOP nella provincia. Valore: ${selectedCollapseRateMultiplier}${collapseRateRankLabel ? `, ${collapseRateRankLabel}` : ""}; da leggere separatamente dal Priority Index.`
            : `Ratio between ARCUS cases and AINOP counted bridges in the province. Value: ${selectedCollapseRateMultiplier}${collapseRateRankLabel ? `, ${collapseRateRankLabel}` : ""}; it should be read separately from the Priority Index.`,
        ],
        [
          it ? "Why Separate" : "Why Separate",
          it
            ? "Priority Index indica dove il territorio espone a pericolosita elevate; Collapse Rate indica dove il patrimonio ponte ha mostrato vulnerabilita storica superiore o inferiore alla media nazionale."
            : "Priority Index indicates where the territory has elevated hazard exposure; Collapse Rate indicates where the bridge stock has shown historical vulnerability above or below the national average.",
        ],
        [
          "Historical Failure Context",
          it
            ? "Lettura del pattern storico: evento concentrato o rischio distribuito nel tempo."
            : "Historical-pattern reading: concentrated event or distributed risk over time.",
        ],
        [
          "Hydraulic Cause Category",
          hydraulicMethodologyNote,
        ],
        [
          "Evidence Window",
          it
            ? "Periodo osservato: database ARCUS dei ponti crollati in Italia dal 2000 a oggi; gli eventi ravvicinati nella stessa finestra temporale sono letti come scenario, non duplicati decisionali."
            : "Observed period: ARCUS database of collapsed bridges in Italy from 2000 to today; close events in the same time window are read as one scenario, not decision duplicates.",
        ],
        [
          "AINOP Coverage",
          it
            ? `Il Collapse Rate usa i ponti censiti AINOP come denominatore provinciale. Confidenza: ${selectedCollapseRateConfidence}; possibili sottocensimenti locali possono gonfiare il rapporto.`
            : `Collapse Rate uses AINOP counted bridges as provincial denominator. Confidence: ${selectedCollapseRateConfidence}; local undercounting may inflate the ratio.`,
        ],
        [
          "Evidence Classes",
          it
            ? "A = fonte istituzionale/tecnica primaria; B = fonte tecnica o media affidabile; C = evidenza documentale generica; D = evidenza debole da rafforzare. La lettera e riportata accanto agli score e ai casi in appendice."
            : "A = primary institutional/technical source; B = reliable technical or media source; C = generic documentary evidence; D = weak evidence to strengthen. The letter is displayed next to scores and appendix cases.",
        ],
      ],
      {
        columnWeights: [0.52, 1.48],
        fontSize: 6.6,
        headerHeight: 7,
        lineHeight: 3.05,
        maxLines: 8,
        minRowHeight: 9,
        rowPadding: 4,
      }
    );
    addFooter();
    pdf.save(filename);
  };

  const downloadReportPdf = async (
    variant = "full"
  ) => {
    if (
      !selectedProvinceProfile ||
      isPreparingReport ||
      (activeEntryPath === 0 && !path01LocationValidated)
    ) {
      return;
    }

    setIsPreparingReport(true);

    try {
      const reportArea =
        activeEntryPath === 1
          ? assetSession.fileName || "path02-asset-inventory"
          : activeEntryPath !== 0 && manualAreaBounds
          ? manualAreaLabel
          : selectedProvinceProfile.territory;
      const reportJob = await registerProfessionalReport({
        path: `path-${activeEntryPath + 1}`,
        territory: reportArea,
        variant,
      }).catch(() => null);
      let mapImage =
        activeEntryPath === 0
          ? await capturePath01ReportMapImage()
          : activeEntryPath === 1
            ? await captureCurrentProfessionalMapImage()
          : "";

      if (activeEntryPath === 0 && !mapImage) {
        mapImage = await createFallbackPath01MapImage();
      }

      if (activeEntryPath === 1 && !mapImage) {
        mapImage = await createFallbackPath02AssetMapImage({
          numbered: variant !== "brief",
          markers: assetScreening
            .slice(0, 5)
            .map((item) =>
              professionalAssetMapMarkers.find(
                (marker) => marker.id === item.id
              )
            )
            .filter(Boolean),
        });
      }

      if (mapImage) {
        window.localStorage.setItem(
          "arcus-path01-report-map-image",
          mapImage
        );
      }

      if (
        window.localStorage.getItem("arcus-debug-report-html") ===
        "1"
      ) {
        window.localStorage.setItem(
          "arcus-debug-report-html-output",
          buildProfessionalReportHtml({
            mapImage,
            variant,
          })
        );
      }

      const slug =
        cleanDisplayText(reportArea || "territory")
          .toLowerCase()
          .normalize("NFD")
          .replace(/[\u0300-\u036f]/g, "")
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/^-|-$/g, "") || "territory";
      const filename = `arcus-professional-${variant}-${slug}.pdf`;
      const [logoImage, mapImageSize] = await Promise.all([
        loadPdfLogoDataUrl(),
        loadImageSize(mapImage),
      ]);

      await saveStructuredReportPdf({
        filename,
        logoImage,
        mapImage,
        mapImageSize,
        reportReference: reportJob?.reference || "",
        variant,
      });

      if (reportJob?.reference) {
        await completeProfessionalReport(reportJob.reference, {
          filename,
          outputType: "pdf",
          variant,
        }).catch(() => null);
      }
    } finally {
      setIsPreparingReport(false);
    }
  };

  const downloadProfessionalReport = () => {
    void downloadReportPdf("full");
  };

  const downloadOnePageBrief = () => {
    void downloadReportPdf("brief");
  };

  const downloadControlledExport = async (payload) => {
    setExportStatus("");

    try {
      const { blob, filename } = await downloadProfessionalExport(payload);

      downloadFile(filename, blob, blob.type);
      setExportStatus(
        language === "it"
          ? "Output preparato dal server ARCUS."
          : "Output prepared by the ARCUS server."
      );
    } catch {
      setExportStatus(
        language === "it"
          ? "Non riesco a preparare questo output. Riprova tra poco."
          : "This output could not be prepared. Please try again shortly."
      );
    }
  };

  const exportProvinceReport = () => {
    if (
      !selectedProvinceProfile ||
      (activeEntryPath === 0 && !path01LocationValidated)
    ) {
      return;
    }

    void downloadControlledExport({
      scope: {
        province: selectedProvinceProfile.territory,
      },
      type: "territory-brief",
    });
  };

  const exportSourceTable = () => {
    if (activeEntryPath === 0 && !path01LocationValidated) {
      return;
    }

    const sourceEvents =
      activeEntryPath === 1
        ? assetScreening
            .filter(
              (item) =>
                item.attentionLevel === "Immediate attention"
            )
            .flatMap((item) =>
              item.comparableEvents.slice(0, 5).map((event) => ({
                ...event,
                asset_id: item.id,
                asset_name: item.name,
              }))
            )
        : workflowEvents;
    void downloadControlledExport({
      scope: {
        eventIds: sourceEvents
          .map((event) => event.event_id)
          .filter(Boolean)
          .slice(0, 25),
      },
      type: "evidence-register",
    });
  };

  const exportGisPackage = () => {
    if (activeEntryPath === 0 && !path01LocationValidated) {
      return;
    }

    const features = [];

    if (activeEntryPath === 1) {
      professionalAssetMapMarkers.forEach((asset) => {
        const screening = assetScreening.find(
          (item) => item.id === asset.id
        );

        features.push({
          geometry: {
            coordinates: [asset.longitude, asset.latitude],
            type: "Point",
          },
          properties: {
            action_rank: screening?.actionRank || "",
            action_tier: screening?.actionTier || "",
            asset_priority_score: screening?.score || asset.score,
            attention_level: screening?.attentionLevel || asset.priority,
            bridge_id: asset.id,
            hazard_profile:
              screening?.hazardProfileLabel ||
              screening?.dominantHazard ||
              "",
            evidence_class:
              screening ? getAssetEvidenceGrade(screening) : "",
            monitoring_recommendation:
              screening?.monitoringRecommendation || "",
            name: asset.name,
            nearest_arcus_event:
              screening?.nearestEvent?.event_id || "",
            nearest_arcus_summary:
              screening?.nearestEventSummary || "",
            proximity_band:
              screening?.proximityBand || "",
            proximity_score: screening?.proximityScore || 0,
            territory: asset.territory,
            type: "path02_existing_asset",
          },
          type: "Feature",
        });
      });

      downloadFile(
        `arcus-path02-assets-${(assetSession.fileName || manualAreaLabel)
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/^-|-$/g, "")}.geojson`,
        JSON.stringify(
          {
            features,
            metadata: {
              generated_at: new Date().toISOString(),
              source: "ARCUS Professional / Path 02",
              use: "Existing-asset watchlist export; not cadastral or design-scale mapping.",
            },
            type: "FeatureCollection",
          },
          null,
          2
        ),
        "application/geo+json;charset=utf-8"
      );
      return;
    }

    if (selectedProvinceProfile?.territory) {
      void downloadControlledExport({
        scope: {
          province: selectedProvinceProfile.territory,
        },
        type: "gis-summary",
      });
      return;
    }

    if (activeEntryPath !== 0 && manualAreaBounds) {
      features.push({
        geometry: {
          coordinates: [
            [
              [
                manualAreaBounds.west,
                manualAreaBounds.south,
              ],
              [
                manualAreaBounds.east,
                manualAreaBounds.south,
              ],
              [
                manualAreaBounds.east,
                manualAreaBounds.north,
              ],
              [
                manualAreaBounds.west,
                manualAreaBounds.north,
              ],
              [
                manualAreaBounds.west,
                manualAreaBounds.south,
              ],
            ],
          ],
          type: "Polygon",
        },
        properties: {
          id: "selected_area",
          label: manualAreaLabel,
          type: "arcus_selected_area",
        },
        type: "Feature",
      });
    }

    workflowEvents.forEach((event) => {
      const latitude = Number(event.latitude);
      const longitude = Number(event.longitude);

      if (
        !Number.isFinite(latitude) ||
        !Number.isFinite(longitude)
      ) {
        return;
      }

      features.push({
        geometry: {
          coordinates: [longitude, latitude],
          type: "Point",
        },
        properties: {
          cause: event.specific_cause,
          event_id: event.event_id,
          municipality: event.municipality,
          province: event.province,
          severity: event.collapse_severity,
          triggered: event.triggered,
          year: event.year,
        },
        type: "Feature",
      });
    });

    downloadFile(
      `arcus-professional-gis-${manualAreaLabel
        .toLowerCase()
        .replaceAll(" ", "-")}.geojson`,
      JSON.stringify(
        {
          features,
          metadata: {
            generated_at: new Date().toISOString(),
            source: "ARCUS Professional",
            use: "Territorial screening export; not cadastral or design-scale mapping.",
          },
          type: "FeatureCollection",
        },
        null,
        2
      ),
      "application/geo+json;charset=utf-8"
    );
  };

  const parseCsvLine = (line, delimiter = ",") => {
    const values = [];
    let current = "";
    let quoted = false;

    for (let index = 0; index < line.length; index += 1) {
      const character = line[index];
      const nextCharacter = line[index + 1];

      if (character === '"' && quoted && nextCharacter === '"') {
        current += '"';
        index += 1;
      } else if (character === '"') {
        quoted = !quoted;
      } else if (
        character === delimiter &&
        !quoted
      ) {
        values.push(current.trim());
        current = "";
      } else {
        current += character;
      }
    }

    values.push(current.trim());

    return values;
  };

  const parseAssetCsv = (text) => {
    const lines = text
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean);

    if (lines.length < 2) {
      return [];
    }

    const delimiter =
      lines.some((line) => line.startsWith("sep=;")) ||
      (lines[0].split(";").length >
        lines[0].split(",").length)
        ? ";"
        : ",";
    const contentLines = lines.filter(
      (line) =>
        !line.toLowerCase().startsWith("sep=")
    );
    const headerIndex = contentLines.findIndex(
      (line) => {
        const cells = parseCsvLine(
          line,
          delimiter
        ).map((cell) =>
          cell
            .trim()
            .toLowerCase()
            .replaceAll(" ", "_")
        );

        return (
          cells.includes("bridge_id") ||
          cells.includes("asset_id") ||
          cells.includes("id")
        );
      }
    );

    if (
      headerIndex < 0 ||
      contentLines.length <= headerIndex + 1
    ) {
      return [];
    }

    const headers = parseCsvLine(
      contentLines[headerIndex],
      delimiter
    ).map(
      (header) =>
        header
          .trim()
          .toLowerCase()
          .replaceAll(" ", "_")
    );

    return contentLines
      .slice(headerIndex + 1)
      .map((line) => {
        const values = parseCsvLine(
          line,
          delimiter
        );

        return headers.reduce(
          (asset, header, index) => ({
            ...asset,
            [header]: values[index] || "",
          }),
          {}
        );
      });
  };

  const normalizeAssetHeader = (value) =>
    value
      .trim()
      .toLowerCase()
      .replaceAll(" ", "_");

  const parseAssetTableRows = (rows) => {
    const headerIndex = rows.findIndex((row) => {
      const cells = row.map(normalizeAssetHeader);

      return (
        cells.includes("bridge_id") ||
        cells.includes("asset_id") ||
        cells.includes("id")
      );
    });

    if (
      headerIndex < 0 ||
      rows.length <= headerIndex + 1
    ) {
      return [];
    }

    const headers = rows[headerIndex].map(
      normalizeAssetHeader
    );

    return rows
      .slice(headerIndex + 1)
      .filter((row) =>
        row.some((cell) => cell.trim())
      )
      .map((row) =>
        headers.reduce(
          (asset, header, index) => ({
            ...asset,
            [header]: row[index] || "",
          }),
          {}
        )
      );
  };

  const parseAssetWorkbookHtml = (text) => {
    const parser = new DOMParser();
    const document = parser.parseFromString(
      text,
      "text/html"
    );
    const tables = [
      ...document.querySelectorAll("table"),
    ];
    const assetTable =
      tables.find(
        (table) => table.id === "asset-data"
      ) ||
      tables.find((table) =>
        table.textContent
          ?.toLowerCase()
          .includes("asset_id")
      );

    if (!assetTable) {
      return [];
    }

    const rows = [
      ...assetTable.querySelectorAll("tr"),
    ].map((row) =>
      [...row.children].map((cell) =>
        cell.textContent.trim()
      )
    );

    return parseAssetTableRows(rows);
  };

  const parseAssetSpreadsheetXml = (text) => {
    const parser = new DOMParser();
    const document = parser.parseFromString(
      text,
      "text/xml"
    );
    const worksheets = [
      ...document.getElementsByTagNameNS(
        "*",
        "Worksheet"
      ),
    ];
    const worksheet =
      worksheets.find(
        (sheet) =>
          sheet.getAttribute("ss:Name") ===
            "Asset_Data" ||
          sheet.getAttribute("Name") ===
            "Asset_Data"
      ) || worksheets[worksheets.length - 1];

    if (!worksheet) {
      return [];
    }

    const rows = [
      ...worksheet.getElementsByTagNameNS(
        "*",
        "Row"
      ),
    ].map((row) =>
      [
        ...row.getElementsByTagNameNS(
          "*",
          "Cell"
        ),
      ].map((cell) => {
        const data =
          cell.getElementsByTagNameNS(
            "*",
            "Data"
          )[0];

        return data?.textContent.trim() || "";
      })
    );

    return parseAssetTableRows(rows);
  };

  const parseAssetFile = (text) => {
    if (/<Workbook[\s>]/i.test(text)) {
      return parseAssetSpreadsheetXml(text);
    }

    if (/<table[\s>]/i.test(text)) {
      return parseAssetWorkbookHtml(text);
    }

    return parseAssetCsv(text);
  };

  const handleAssetUpload = (event) => {
    const file = event.target.files?.[0];

    setAssetError("");

    if (!file) {
      return;
    }

    setAssetSession({
      fileName: file.name,
      uploadedAt: new Date().toISOString(),
    });

    if (
      !/\.(csv|xls|html?)$/i.test(file.name)
    ) {
      setAssetError(
        language === "it"
          ? "Per questa versione carica un file CSV o il template Excel ARCUS."
          : "Upload a CSV file or the ARCUS Excel template."
      );
      return;
    }

    const reader = new FileReader();

    reader.onload = () => {
      try {
        const rows = parseAssetFile(
          String(reader.result || "")
        );

        if (!rows.length) {
          setAssetError(
            language === "it"
              ? "Il CSV non contiene righe asset valide."
              : "The CSV does not contain valid asset rows."
          );
          return;
        }

        setAssetRows(rows);
      } catch {
        setAssetError(
          language === "it"
            ? "Non riesco a leggere questo CSV."
            : "This CSV could not be read."
        );
      }
    };

    reader.readAsText(file);
  };

  const downloadFile = (
    filename,
    content,
    type = "text/csv;charset=utf-8"
  ) => {
    const blob =
      content instanceof Blob
        ? content
        : new Blob([content], {
            type,
          });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = filename;
    link.click();

    URL.revokeObjectURL(url);
  };

  const escapeXml = (value) =>
    String(value ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;");

  const spreadsheetCell = (
    value,
    styleId = "Cell",
    type = "String",
    mergeAcross = 0
  ) =>
    `<Cell ss:StyleID="${styleId}"${
      mergeAcross
        ? ` ss:MergeAcross="${mergeAcross}"`
        : ""
    }><Data ss:Type="${type}">${escapeXml(value)}</Data></Cell>`;

  const spreadsheetEmptyCells = (count) =>
    Array.from({ length: count }, () =>
      spreadsheetCell("", "Cell")
    ).join("");

  const buildAssetTemplateWorkbook = () => {
    const headers = [
      "bridge_id",
      "name",
      "municipality_declared",
      "province_declared",
      "region",
      "lat",
      "lon",
      "structural_type",
      "construction_year",
      "last_inspection_date",
      "underwater_inspection",
    ];
    const rows = [
      [
        "BR-001",
        "Ponte dimostrativo",
        "Campobasso",
        "Campobasso",
        "Molise",
        "41.7396",
        "14.7401",
        "beam",
        "1965",
        "2024-04-15",
        "no",
      ],
      [
        "BR-002",
        "Viadotto esempio",
        "Genova",
        "Genova",
        "Liguria",
        "44.4056",
        "8.9463",
        "arch",
        "1972",
        "2023-11-02",
        "yes",
      ],
      [
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
      ],
      [
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
      ],
      [
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
      ],
    ];

    return `<?xml version="1.0"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:o="urn:schemas-microsoft-com:office:office"
 xmlns:x="urn:schemas-microsoft-com:office:excel"
 xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:html="http://www.w3.org/TR/REC-html40">
 <Styles>
  <Style ss:ID="Default" ss:Name="Normal">
   <Alignment ss:Vertical="Center"/>
   <Font ss:FontName="Aptos" ss:Size="11" ss:Color="#1C1713"/>
  </Style>
  <Style ss:ID="Brand">
   <Alignment ss:Horizontal="Left" ss:Vertical="Center"/>
   <Font ss:FontName="Aptos Display" ss:Size="30" ss:Bold="1" ss:Color="#C49040"/>
   <Interior ss:Color="#15110F" ss:Pattern="Solid"/>
  </Style>
  <Style ss:ID="BrandBlock">
   <Alignment ss:Horizontal="Center" ss:Vertical="Center"/>
   <Font ss:FontName="Aptos" ss:Size="8" ss:Color="#C49040"/>
   <Interior ss:Color="#15110F" ss:Pattern="Solid"/>
  </Style>
  <Style ss:ID="BrandSub">
   <Alignment ss:Horizontal="Left" ss:Vertical="Center"/>
   <Font ss:FontName="Aptos" ss:Size="11" ss:Color="#F2E8D4"/>
   <Interior ss:Color="#15110F" ss:Pattern="Solid"/>
  </Style>
  <Style ss:ID="MutedDark">
   <Alignment ss:Horizontal="Left" ss:Vertical="Center" ss:WrapText="1"/>
   <Font ss:FontName="Aptos" ss:Size="10" ss:Color="#D8CCBB"/>
   <Interior ss:Color="#211C18" ss:Pattern="Solid"/>
  </Style>
  <Style ss:ID="Section">
   <Font ss:FontName="Aptos" ss:Size="12" ss:Bold="1" ss:Color="#1C1713"/>
   <Interior ss:Color="#E9E1D6" ss:Pattern="Solid"/>
   <Borders>
    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#C49040"/>
   </Borders>
  </Style>
  <Style ss:ID="Header">
   <Alignment ss:Horizontal="Center" ss:Vertical="Center" ss:WrapText="1"/>
   <Font ss:FontName="Aptos" ss:Size="10" ss:Bold="1" ss:Color="#15110F"/>
   <Interior ss:Color="#C49040" ss:Pattern="Solid"/>
   <Borders>
    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#15110F"/>
    <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#8D7A62"/>
    <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#8D7A62"/>
    <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#15110F"/>
   </Borders>
  </Style>
  <Style ss:ID="RequiredHeader">
   <Alignment ss:Horizontal="Center" ss:Vertical="Center" ss:WrapText="1"/>
   <Font ss:FontName="Aptos" ss:Size="10" ss:Bold="1" ss:Color="#15110F"/>
   <Interior ss:Color="#D4A04C" ss:Pattern="Solid"/>
   <Borders>
    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="2" ss:Color="#15110F"/>
    <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#8D7A62"/>
    <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#8D7A62"/>
    <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#15110F"/>
   </Borders>
  </Style>
  <Style ss:ID="Cell">
   <Alignment ss:Vertical="Center" ss:WrapText="1"/>
   <Font ss:FontName="Aptos" ss:Size="10" ss:Color="#1C1713"/>
   <Interior ss:Color="#FFF8F2" ss:Pattern="Solid"/>
   <Borders>
    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#D9CEC1"/>
    <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#D9CEC1"/>
    <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#D9CEC1"/>
    <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#D9CEC1"/>
   </Borders>
  </Style>
  <Style ss:ID="SoftCell">
   <Alignment ss:Vertical="Center" ss:WrapText="1"/>
   <Font ss:FontName="Aptos" ss:Size="10" ss:Color="#1C1713"/>
   <Interior ss:Color="#FBF4EC" ss:Pattern="Solid"/>
   <Borders>
    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#D9CEC1"/>
    <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#D9CEC1"/>
    <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#D9CEC1"/>
    <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#D9CEC1"/>
   </Borders>
  </Style>
  <Style ss:ID="Note">
   <Alignment ss:Vertical="Center" ss:WrapText="1"/>
   <Font ss:FontName="Aptos" ss:Size="10" ss:Color="#6E858D"/>
   <Interior ss:Color="#F3EFE8" ss:Pattern="Solid"/>
   <Borders>
    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#D9CEC1"/>
    <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#D9CEC1"/>
    <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#D9CEC1"/>
    <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#D9CEC1"/>
   </Borders>
  </Style>
  <Style ss:ID="Example">
   <Alignment ss:Vertical="Center" ss:WrapText="1"/>
   <Font ss:FontName="Aptos" ss:Size="10" ss:Color="#1C1713"/>
   <Interior ss:Color="#F3EFE8" ss:Pattern="Solid"/>
   <Borders>
    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#D9CEC1"/>
    <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#D9CEC1"/>
    <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#D9CEC1"/>
    <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#D9CEC1"/>
   </Borders>
  </Style>
 </Styles>
 <Worksheet ss:Name="Instructions">
  <Table>
   <Column ss:Width="96"/><Column ss:Width="190"/><Column ss:Width="430"/>
   <Row ss:Height="58">${spreadsheetCell("", "BrandBlock")}${spreadsheetCell("ARCUS", "Brand", "String", 1)}</Row>
   <Row ss:Height="28">${spreadsheetCell("", "MutedDark")}${spreadsheetCell("Professional Asset Screening Template", "BrandSub", "String", 1)}</Row>
   <Row ss:Height="34">${spreadsheetCell("", "MutedDark")}${spreadsheetCell("Infrastructure intelligence input workbook", "MutedDark", "String", 1)}</Row>
   <Row><Cell ss:MergeAcross="2"/></Row>
   <Row ss:Height="30">${spreadsheetCell("Workflow", "Section", "String", 2)}</Row>
   <Row>${spreadsheetCell("1", "Section")}${spreadsheetCell("Compila Asset_Data", "Cell")}${spreadsheetCell("Inserisci un ponte o asset per riga mantenendo le intestazioni originali.", "Cell")}</Row>
   <Row>${spreadsheetCell("2", "Section")}${spreadsheetCell("Salva il file", "Cell")}${spreadsheetCell("Puoi ricaricare questo template ARCUS oppure esportare un CSV con le stesse colonne.", "Cell")}</Row>
   <Row>${spreadsheetCell("3", "Section")}${spreadsheetCell("Carica in ARCUS", "Cell")}${spreadsheetCell("La piattaforma produce Asset Priority Score, Hazard Profile, Proximity Score e watchlist operativa.", "Cell")}</Row>
   <Row><Cell ss:MergeAcross="2"/></Row>
   <Row ss:Height="30">${spreadsheetCell("Field guide", "Section", "String", 2)}</Row>
   <Row>${spreadsheetCell("Required", "Section")}${spreadsheetCell("bridge_id, lat, lon, province_declared, municipality_declared", "Cell")}${spreadsheetCell("Sono i campi obbligatori: senza questi il record resta bloccato e non entra nello scoring.", "Cell")}</Row>
   <Row>${spreadsheetCell("Recommended", "Section")}${spreadsheetCell("construction_year, structural_type", "Cell")}${spreadsheetCell("Migliorano Asset Priority Score e Hazard Profile. Usa arch / beam / suspended quando possibile.", "Cell")}</Row>
   <Row>${spreadsheetCell("Optional", "Section")}${spreadsheetCell("last_inspection_date, underwater_inspection", "Cell")}${spreadsheetCell("Sbloccano raccomandazioni di monitoraggio piu specifiche, soprattutto in contesto idraulico.", "Cell")}</Row>
  </Table>
 </Worksheet>
 <Worksheet ss:Name="Asset_Data">
  <Table id="asset-data">
   <Column ss:Width="85"/><Column ss:Width="170"/><Column ss:Width="130"/><Column ss:Width="130"/><Column ss:Width="115"/><Column ss:Width="90"/><Column ss:Width="90"/><Column ss:Width="110"/><Column ss:Width="105"/><Column ss:Width="118"/><Column ss:Width="125"/>
   <Row ss:Height="44">${spreadsheetCell("", "BrandBlock")}${spreadsheetCell("ARCUS Professional - Asset Data", "Brand", "String", 8)}</Row>
   <Row ss:Height="24">${spreadsheetCell("", "MutedDark")}${spreadsheetCell("Compila le righe sotto. Le prime due righe sono esempi e possono essere sostituite.", "MutedDark", "String", 8)}</Row>
   <Row>${headers.map((header, index) => spreadsheetCell(header, index <= 4 ? "RequiredHeader" : "Header")).join("")}</Row>
   ${rows
     .map(
       (row, rowIndex) =>
         `<Row>${row
           .map((cell) =>
             spreadsheetCell(
               cell,
               rowIndex < 2
                 ? "Example"
                 : rowIndex % 2 === 0
                   ? "SoftCell"
                   : "Cell"
             )
           )
           .join("")}</Row>`
     )
     .join("")}
   <Row>${spreadsheetEmptyCells(headers.length)}</Row>
   <Row>${spreadsheetEmptyCells(headers.length)}</Row>
   <Row>${spreadsheetEmptyCells(headers.length)}</Row>
  </Table>
  <WorksheetOptions xmlns="urn:schemas-microsoft-com:office:excel">
   <FreezePanes/>
   <FrozenNoSplit/>
   <SplitHorizontal>3</SplitHorizontal>
   <TopRowBottomPane>3</TopRowBottomPane>
   <ActivePane>2</ActivePane>
  </WorksheetOptions>
 </Worksheet>
</Workbook>`;
  };

  const buildMonitoringWorkbook = (rows) => {
    const headers = [
      "territory",
      "event_id",
      "municipality",
      "level",
      "rules",
      "severity",
      "cause",
      "reliability_score",
      "reliability_class",
      "vulnerability_score",
      "vulnerability_class",
    ];
    const dataRows = rows.map((row) =>
      headers.map((header) => row[header])
    );

    return `<?xml version="1.0"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:o="urn:schemas-microsoft-com:office:office"
 xmlns:x="urn:schemas-microsoft-com:office:excel"
 xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:html="http://www.w3.org/TR/REC-html40">
 <Styles>
  <Style ss:ID="Default" ss:Name="Normal">
   <Alignment ss:Vertical="Center"/>
   <Font ss:FontName="Aptos" ss:Size="11" ss:Color="#1C1713"/>
  </Style>
  <Style ss:ID="Brand">
   <Alignment ss:Horizontal="Left" ss:Vertical="Center"/>
   <Font ss:FontName="Aptos Display" ss:Size="28" ss:Bold="1" ss:Color="#C49040"/>
   <Interior ss:Color="#15110F" ss:Pattern="Solid"/>
  </Style>
  <Style ss:ID="BrandBlock">
   <Interior ss:Color="#15110F" ss:Pattern="Solid"/>
  </Style>
  <Style ss:ID="BrandSub">
   <Alignment ss:Horizontal="Left" ss:Vertical="Center"/>
   <Font ss:FontName="Aptos" ss:Size="11" ss:Color="#F2E8D4"/>
   <Interior ss:Color="#15110F" ss:Pattern="Solid"/>
  </Style>
  <Style ss:ID="Header">
   <Alignment ss:Horizontal="Center" ss:Vertical="Center" ss:WrapText="1"/>
   <Font ss:FontName="Aptos" ss:Size="10" ss:Bold="1" ss:Color="#15110F"/>
   <Interior ss:Color="#C49040" ss:Pattern="Solid"/>
   <Borders>
    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="2" ss:Color="#15110F"/>
    <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#8D7A62"/>
    <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#8D7A62"/>
    <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#15110F"/>
   </Borders>
  </Style>
  <Style ss:ID="Cell">
   <Alignment ss:Vertical="Center" ss:WrapText="1"/>
   <Font ss:FontName="Aptos" ss:Size="10" ss:Color="#1C1713"/>
   <Interior ss:Color="#FFF8F2" ss:Pattern="Solid"/>
   <Borders>
    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#D9CEC1"/>
    <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#D9CEC1"/>
    <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#D9CEC1"/>
    <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#D9CEC1"/>
   </Borders>
  </Style>
  <Style ss:ID="SoftCell">
   <Alignment ss:Vertical="Center" ss:WrapText="1"/>
   <Font ss:FontName="Aptos" ss:Size="10" ss:Color="#1C1713"/>
   <Interior ss:Color="#FBF4EC" ss:Pattern="Solid"/>
   <Borders>
    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#D9CEC1"/>
    <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#D9CEC1"/>
    <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#D9CEC1"/>
    <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#D9CEC1"/>
   </Borders>
  </Style>
  <Style ss:ID="Critical">
   <Alignment ss:Vertical="Center" ss:WrapText="1"/>
   <Font ss:FontName="Aptos" ss:Size="10" ss:Bold="1" ss:Color="#893526"/>
   <Interior ss:Color="#F4E4DF" ss:Pattern="Solid"/>
   <Borders>
    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#D9CEC1"/>
    <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#D9CEC1"/>
    <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#D9CEC1"/>
    <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#D9CEC1"/>
   </Borders>
  </Style>
 </Styles>
 <Worksheet ss:Name="Summary">
  <Table>
   <Column ss:Width="110"/><Column ss:Width="220"/><Column ss:Width="430"/>
   <Row ss:Height="48">${spreadsheetCell("", "BrandBlock")}${spreadsheetCell("ARCUS Monitoring Watchlist", "Brand", "String", 1)}</Row>
   <Row ss:Height="28">${spreadsheetCell("", "BrandBlock")}${spreadsheetCell("Professional follow-up export", "BrandSub", "String", 1)}</Row>
   <Row><Cell ss:MergeAcross="2"/></Row>
   <Row>${spreadsheetCell("Territory", "Header")}${spreadsheetCell(selectedProvinceProfile?.territory || "-", "Cell", "String", 1)}</Row>
   <Row>${spreadsheetCell("Signals", "Header")}${spreadsheetCell(rows.length, "Cell", "Number", 1)}</Row>
   <Row>${spreadsheetCell("Generated", "Header")}${spreadsheetCell(new Date().toLocaleDateString("it-IT"), "Cell", "String", 1)}</Row>
   <Row>${spreadsheetCell("Purpose", "Header")}${spreadsheetCell("Operational queue for review, evidence enrichment and periodic monitoring.", "Cell", "String", 1)}</Row>
  </Table>
 </Worksheet>
 <Worksheet ss:Name="Watchlist_Data">
  <Table>
   <Column ss:Width="120"/><Column ss:Width="92"/><Column ss:Width="135"/><Column ss:Width="86"/><Column ss:Width="260"/><Column ss:Width="80"/><Column ss:Width="125"/><Column ss:Width="95"/><Column ss:Width="90"/><Column ss:Width="105"/><Column ss:Width="105"/>
   <Row ss:Height="42">${spreadsheetCell("", "BrandBlock")}${spreadsheetCell("ARCUS Monitoring Watchlist - Data", "Brand", "String", 9)}</Row>
   <Row>${headers.map((header) => spreadsheetCell(header, "Header")).join("")}</Row>
   ${dataRows
     .map(
       (row, rowIndex) =>
         `<Row>${row
           .map((cell, cellIndex) =>
             spreadsheetCell(
               cell,
               cellIndex === 3 &&
                 String(cell).toLowerCase() ===
                   "critical"
                 ? "Critical"
                 : rowIndex % 2 === 0
                   ? "SoftCell"
                   : "Cell"
             )
           )
           .join("")}</Row>`
     )
     .join("")}
  </Table>
  <WorksheetOptions xmlns="urn:schemas-microsoft-com:office:excel">
   <FreezePanes/>
   <FrozenNoSplit/>
   <SplitHorizontal>2</SplitHorizontal>
   <TopRowBottomPane>2</TopRowBottomPane>
   <ActivePane>2</ActivePane>
  </WorksheetOptions>
 </Worksheet>
</Workbook>`;
  };

  // eslint-disable-next-line no-unused-vars
  const buildAssetScreeningWorkbook = (rows) => {
    const headers = [
      "asset_id",
      "name",
      "territory",
      "score",
      "priority",
      "top_cause",
      "dominant_hazard",
      "hazard_score",
      "comparable_events",
      "nearby_events",
      "high_vulnerability_matches",
    ];
    const dataRows = rows.map((row) =>
      headers.map((header) => row[header])
    );

    return `<?xml version="1.0"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:o="urn:schemas-microsoft-com:office:office"
 xmlns:x="urn:schemas-microsoft-com:office:excel"
 xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:html="http://www.w3.org/TR/REC-html40">
 <Styles>
  <Style ss:ID="Default" ss:Name="Normal">
   <Alignment ss:Vertical="Center"/>
   <Font ss:FontName="Aptos" ss:Size="11" ss:Color="#1C1713"/>
  </Style>
  <Style ss:ID="Brand">
   <Alignment ss:Horizontal="Left" ss:Vertical="Center"/>
   <Font ss:FontName="Aptos Display" ss:Size="28" ss:Bold="1" ss:Color="#C49040"/>
   <Interior ss:Color="#15110F" ss:Pattern="Solid"/>
  </Style>
  <Style ss:ID="BrandBlock">
   <Interior ss:Color="#15110F" ss:Pattern="Solid"/>
  </Style>
  <Style ss:ID="BrandSub">
   <Alignment ss:Horizontal="Left" ss:Vertical="Center"/>
   <Font ss:FontName="Aptos" ss:Size="11" ss:Color="#F2E8D4"/>
   <Interior ss:Color="#15110F" ss:Pattern="Solid"/>
  </Style>
  <Style ss:ID="Header">
   <Alignment ss:Horizontal="Center" ss:Vertical="Center" ss:WrapText="1"/>
   <Font ss:FontName="Aptos" ss:Size="10" ss:Bold="1" ss:Color="#15110F"/>
   <Interior ss:Color="#C49040" ss:Pattern="Solid"/>
   <Borders>
    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="2" ss:Color="#15110F"/>
    <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#8D7A62"/>
    <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#8D7A62"/>
    <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#15110F"/>
   </Borders>
  </Style>
  <Style ss:ID="Cell">
   <Alignment ss:Vertical="Center" ss:WrapText="1"/>
   <Font ss:FontName="Aptos" ss:Size="10" ss:Color="#1C1713"/>
   <Interior ss:Color="#FFF8F2" ss:Pattern="Solid"/>
   <Borders>
    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#D9CEC1"/>
    <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#D9CEC1"/>
    <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#D9CEC1"/>
    <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#D9CEC1"/>
   </Borders>
  </Style>
  <Style ss:ID="SoftCell">
   <Alignment ss:Vertical="Center" ss:WrapText="1"/>
   <Font ss:FontName="Aptos" ss:Size="10" ss:Color="#1C1713"/>
   <Interior ss:Color="#FBF4EC" ss:Pattern="Solid"/>
   <Borders>
    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#D9CEC1"/>
    <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#D9CEC1"/>
    <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#D9CEC1"/>
    <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#D9CEC1"/>
   </Borders>
  </Style>
  <Style ss:ID="Priority">
   <Alignment ss:Vertical="Center" ss:WrapText="1"/>
   <Font ss:FontName="Aptos" ss:Size="10" ss:Bold="1" ss:Color="#893526"/>
   <Interior ss:Color="#F4E4DF" ss:Pattern="Solid"/>
   <Borders>
    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#D9CEC1"/>
    <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#D9CEC1"/>
    <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#D9CEC1"/>
    <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#D9CEC1"/>
   </Borders>
  </Style>
 </Styles>
 <Worksheet ss:Name="Summary">
  <Table>
   <Column ss:Width="132"/><Column ss:Width="220"/><Column ss:Width="430"/>
   <Row ss:Height="48">${spreadsheetCell("", "BrandBlock")}${spreadsheetCell("ARCUS Asset Screening Results", "Brand", "String", 1)}</Row>
   <Row ss:Height="28">${spreadsheetCell("", "BrandBlock")}${spreadsheetCell("Professional asset prioritization export", "BrandSub", "String", 1)}</Row>
   <Row><Cell ss:MergeAcross="2"/></Row>
   <Row>${spreadsheetCell("Assets", "Header")}${spreadsheetCell(rows.length, "Cell", "Number", 1)}</Row>
   <Row>${spreadsheetCell("Inventory quality", "Header")}${spreadsheetCell(assetInventoryAudit.score, "Cell", "Number", 1)}</Row>
   <Row>${spreadsheetCell("Coordinates", "Header")}${spreadsheetCell(`${assetInventoryAudit.coordinates}/${assetInventoryAudit.total}`, "Cell", "String", 1)}</Row>
   <Row>${spreadsheetCell("Technical data", "Header")}${spreadsheetCell(`${assetInventoryAudit.technical}/${assetInventoryAudit.total}`, "Cell", "String", 1)}</Row>
   <Row>${spreadsheetCell("Generated", "Header")}${spreadsheetCell(new Date().toLocaleDateString("it-IT"), "Cell", "String", 1)}</Row>
  </Table>
 </Worksheet>
 <Worksheet ss:Name="Screening_Data">
  <Table>
   <Column ss:Width="85"/><Column ss:Width="170"/><Column ss:Width="130"/><Column ss:Width="70"/><Column ss:Width="95"/><Column ss:Width="125"/><Column ss:Width="120"/><Column ss:Width="85"/><Column ss:Width="105"/><Column ss:Width="95"/><Column ss:Width="130"/>
   <Row ss:Height="42">${spreadsheetCell("", "BrandBlock")}${spreadsheetCell("ARCUS Asset Screening - Data", "Brand", "String", 9)}</Row>
   <Row>${headers.map((header) => spreadsheetCell(header, "Header")).join("")}</Row>
   ${dataRows
     .map(
       (row, rowIndex) =>
         `<Row>${row
           .map((cell, cellIndex) =>
             spreadsheetCell(
               cell,
               cellIndex === 4 &&
                 String(cell).toLowerCase() ===
                   "priority 1"
                 ? "Priority"
                 : rowIndex % 2 === 0
                   ? "SoftCell"
                   : "Cell"
             )
           )
           .join("")}</Row>`
     )
     .join("")}
  </Table>
  <WorksheetOptions xmlns="urn:schemas-microsoft-com:office:excel">
   <FreezePanes/>
   <FrozenNoSplit/>
   <SplitHorizontal>2</SplitHorizontal>
   <TopRowBottomPane>2</TopRowBottomPane>
   <ActivePane>2</ActivePane>
  </WorksheetOptions>
 </Worksheet>
</Workbook>`;
  };

  const downloadAssetTemplate = () => {
    downloadFile(
      "arcus-professional-asset-template.xls",
      buildAssetTemplateWorkbook(),
      "application/vnd.ms-excel;charset=utf-8"
    );
  };

  const exportAssetScreening = () => {
    if (!assetScreening.length) {
      return;
    }

    const rows = assetScreening.map((item) => ({
      action_rank: item.actionRank,
      action_tier: item.actionTier,
      attention_level: item.attentionLevel,
      bridge_id: item.id,
      comparable_events:
        item.comparableEvents.length,
      hazard_profile:
        item.hazardProfileLabel || item.dominantHazard || "",
      evidence_class: getAssetEvidenceGrade(item),
      hazard_score: item.hazardScore || 0,
      high_vulnerability_matches:
        item.highVulnerabilityMatches,
      monitoring_recommendation:
        item.monitoringRecommendation,
      municipality: item.municipality || "",
      name: item.name,
      nearest_arcus_event:
        item.nearestEvent?.event_id || "",
      nearest_arcus_summary:
        item.nearestEventSummary || "",
      nearest_arcus_km:
        item.nearestEvent?.distance !== undefined
          ? item.nearestEvent.distance.toFixed(2)
          : "",
      proximity_band: item.proximityBand || "",
      priority_score: item.score,
      proximity_score: item.proximityScore || 0,
      territory: item.territory,
      top_cause: item.topCause,
    }));

    exportRowsAsCsv(
      "arcus-path02-asset-table.csv",
      [
        "bridge_id",
        "name",
        "municipality",
        "territory",
        "action_rank",
        "priority_score",
        "evidence_class",
        "action_tier",
        "hazard_profile",
        "attention_level",
        "proximity_band",
        "proximity_score",
        "nearest_arcus_event",
        "nearest_arcus_summary",
        "nearest_arcus_km",
        "top_cause",
        "hazard_score",
        "comparable_events",
        "high_vulnerability_matches",
        "monitoring_recommendation",
      ],
      rows
    );
  };

  const exportMonitoringWatchlist = () => {
    if (!monitoringSignals.length) {
      return;
    }

    const rows = monitoringSignals.map(
      (signal) => ({
        cause: signal.event.specific_cause,
        event_id: signal.event.event_id,
        level: signal.level,
        municipality: signal.event.municipality,
        reliability_class:
          signal.reliability?.grade || "",
        reliability_score:
          signal.reliability?.score || 0,
        rules: signal.rules.join("; "),
        severity:
          signal.event.collapse_severity,
        territory:
          selectedProvinceProfile?.territory ||
          "",
        vulnerability_class:
          signal.vulnerability?.className || "",
        vulnerability_score:
          signal.vulnerability?.score || 0,
      })
    );

    downloadFile(
      `arcus-monitoring-watchlist-${selectedProvinceProfile?.territory || "territory"}.xls`,
      buildMonitoringWorkbook(rows),
      "application/vnd.ms-excel;charset=utf-8"
    );
  };

  const buildWorkspaceSnapshot = () => ({
    created_at: new Date().toISOString(),
    monitoring_count: monitoringSignals.length,
    name:
      workspaceName.trim() ||
      `${selectedProvinceProfile?.territory || "ARCUS"} workspace`,
    scenario,
    territory:
      selectedProvinceProfile?.territory || "",
    top_cause:
      selectedProvinceProfile?.topCause || "",
    total_events:
      selectedProvinceProfile?.total || 0,
    risk_score:
      selectedProvinceProfile?.scenarioScore ||
      selectedProvinceProfile?.riskScore ||
      0,
    reliability_score: Math.round(
      selectedReliability.average
    ),
    vulnerability_score: Math.round(
      selectedVulnerability.average
    ),
    vulnerability_class:
      selectedVulnerability.dominantClass,
    watchlist: monitoringSignals
      .slice(0, 20)
      .map((signal) => ({
        event_id: signal.event.event_id,
        level: signal.level,
        municipality: signal.event.municipality,
        rules: signal.rules,
      })),
  });

  const saveWorkspaceSnapshot = () => {
    if (!selectedProvinceProfile) {
      return;
    }

    const snapshot = buildWorkspaceSnapshot();

    createProfessionalWorkspace(snapshot)
      .then((workspace) => {
        setSavedWorkspaces((items) => [workspace, ...items]);
        setWorkspaceName("");
      })
      .catch(() => {
        setExportStatus(
          language === "it"
            ? "Il workspace non e stato salvato. Verifica la sessione e riprova."
            : "The workspace was not saved. Check the session and try again."
        );
      });
  };

  const deleteWorkspace = (id) => {
    deleteProfessionalWorkspace(id)
      .then(() => {
        setSavedWorkspaces((items) =>
          items.filter((workspace) => workspace.id !== id)
        );
      })
      .catch(() => {
        setExportStatus(
          language === "it"
            ? "Il workspace non e stato eliminato. Riprova."
            : "The workspace was not deleted. Please try again."
        );
      });
  };

  const exportWorkspace = (workspace) => {
    downloadFile(
      `${workspace.name
        .toLowerCase()
        .replaceAll(" ", "-")}.json`,
      JSON.stringify(workspace, null, 2),
      "application/json;charset=utf-8"
    );
  };

  const topProfile = profiles[0];
  const hazards = useMemo(
    () => [
      ["Hydraulic exposure", "Flood and river-crossing risk overlay"],
      ["Landslide exposure", "Slope instability and terrain context"],
      ["Aging lens", "Material, structure and construction-year profile"],
      ["Hotspot detection", "Recurring event concentration by territory"],
    ],
    []
  );

  const causeRanking = countBy(
    events,
    "specific_cause"
  ).slice(0, 5);

  const professionalNav = [
    ["Workflow", "#professional-workflow"],
    ["Context", "#professional-hotspots"],
    ["Priority index", "#professional-risk-score"],
    ["Scenarios", "#professional-scenarios"],
    ["Map", "#professional-map"],
    ["Assets", "#professional-assets"],
    ["Similarity", "#professional-similarity"],
    ["API", "#professional-api"],
    ["Monitoring", "#professional-monitoring"],
    ["Governance", "#professional-governance"],
    ["Quality", "#professional-quality"],
    ["Report", "#professional-report"],
  ];

  const demoWorkflow =
    language === "it"
      ? [
          [
            "1. Selezione territorio",
            "ARCUS individua provincia, hotspot, indicatore e driver principali.",
            "#professional-risk-score",
            `${selectedProvinceProfile?.territory || "Territorio"} - index ${selectedProvinceProfile?.riskScore || "-"}`,
          ],
          [
            "2. Screening asset",
            "Il gestore carica l'inventario e ottiene priorita motivate.",
            "#professional-assets",
            `${assetScreening.length || 0} asset valutati`,
          ],
          [
            "3. Precedenti comparabili",
            "La piattaforma collega eventi storici simili per causa, struttura e contesto.",
            "#professional-similarity",
            `${selectedProvinceEvents.length} eventi nel contesto`,
          ],
          [
            "4. Watchlist operativa",
            "Gli eventi critici entrano in una coda di revisione, arricchimento o monitoraggio.",
            "#professional-monitoring",
            `${monitoringSignals.length} elementi in coda`,
          ],
        ]
      : [
          [
            "1. Territory selection",
            "ARCUS identifies province, hotspots, index and main context drivers.",
            "#professional-risk-score",
            `${selectedProvinceProfile?.territory || "Territory"} - index ${selectedProvinceProfile?.riskScore || "-"}`,
          ],
          [
            "2. Asset screening",
            "The operator uploads an inventory and receives explainable priorities.",
            "#professional-assets",
            `${assetScreening.length || 0} assessed assets`,
          ],
          [
            "3. Comparable precedents",
            "The platform links similar historical cases by cause, structure and context.",
            "#professional-similarity",
            `${selectedProvinceEvents.length} contextual events`,
          ],
          [
            "4. Operational watchlist",
            "Critical events enter a review, enrichment or monitoring queue.",
            "#professional-monitoring",
            `${monitoringSignals.length} queued items`,
          ],
        ];

  const operatingPath =
    language === "it"
      ? [
          [
            "01",
            "Apri il livello Professional dell'Atlante",
            "Il cliente vede subito la stessa mappa pubblica, ma con indicatori, hazard territoriali, priorita e layer dichiarati.",
            "Professional Atlas",
            "/atlas?mode=professional",
            "Apri mappa",
          ],
          [
            "02",
            "Seleziona territorio e scenario",
            "Provincia, ranking, hotspot e driver cambiano in modo controllato in base allo scenario tecnico scelto.",
            "Priority index",
            "#professional-risk-score",
            "Vai all'indice",
          ],
          [
            "03",
            "Carica l'inventario asset",
            "Ponti e opere vengono confrontati con eventi storici, materiali, tipologie, cause e contesto territoriale.",
            "Asset screening",
            "#professional-assets",
            "Carica asset",
          ],
          [
            "04",
            "Leggi precedenti e motivazioni",
            "Ogni priorita e accompagnata da evidenze, casi comparabili, affidabilita fonti e limiti dichiarati.",
            "Explainability",
            "#professional-similarity",
            "Vedi precedenti",
          ],
          [
            "05",
            "Esporta report e dati",
            "Il lavoro termina in report, Excel, watchlist e snapshot progetto riutilizzabili in riunioni tecniche.",
            "Operational output",
            "#professional-report",
            "Vai al report",
          ],
        ]
      : [
          [
            "01",
            "Open the Professional Atlas layer",
            "The client starts from the public map, extended with indicators, territorial hazards, priorities and declared layers.",
            "Professional Atlas",
            "/atlas?mode=professional",
            "Open map",
          ],
          [
            "02",
            "Select territory and scenario",
            "Province ranking, hotspots and drivers update in a controlled way according to the selected technical scenario.",
            "Priority index",
            "#professional-risk-score",
            "Go to score",
          ],
          [
            "03",
            "Upload the asset inventory",
            "Bridges and assets are compared with historical events, materials, typologies, causes and territorial context.",
            "Asset screening",
            "#professional-assets",
            "Upload assets",
          ],
          [
            "04",
            "Review precedents and reasons",
            "Each priority is explained through evidence, comparable cases, source reliability and declared limitations.",
            "Explainability",
            "#professional-similarity",
            "View precedents",
          ],
          [
            "05",
            "Export reports and data",
            "The workflow ends in reports, Excel files, watchlists and reusable project snapshots for technical meetings.",
            "Operational output",
            "#professional-report",
            "Go to report",
          ],
        ];

  const professionalUseCases =
    language === "it"
      ? [
          {
            action: "Valuta area",
            center:
              "Atlas + scenario comparison + territorial context",
            core:
              "Territorial Infrastructure Intelligence",
            href: "#professional-risk-score",
            insight:
              "Evidenzia se il territorio presenta precedenti idraulici, franosi, sismici o pattern ricorrenti prima di un nuovo intervento.",
            label: "01 / Nuovo territorio",
            lead:
              "Non hai ancora un asset specifico: valuta territorio, sito, corridoio o provincia prima di progettazione, acquisizione o screening post-evento.",
            output:
              "Briefing tecnico territoriale",
            steps: [
              "territorio",
              "hazard",
              "precedenti",
              "briefing",
            ],
          },
          {
            action: "Carica inventario",
            center:
              "Asset upload + precedent matching + watchlist",
            core:
              "Evidence-Based Asset Prioritization",
            href: "#professional-assets",
            insight:
              "Ordina gli asset in base a contesto territoriale, precedenti comparabili, esposizione e qualita dell'inventario.",
            label: "02 / Asset esistenti",
            lead:
              "Hai gia ponti o infrastrutture: prioritizza monitoraggi, sopralluoghi e approfondimenti su un inventario operativo.",
            output:
              "Watchlist e screening asset",
            steps: [
              "inventario",
              "precedenti",
              "esposizione",
              "watchlist",
            ],
          },
          {
            action: "Analizza scenario",
            center:
              "Hazard scenario + overlays + trigger analysis",
            core:
              "Territorial Resilience Intelligence",
            href: "#professional-scenarios",
            insight:
              "Confronta esposizione e precedenti durante scenari estremi o multi-hazard per supportare resilienza e pianificazione.",
            label: "Evento estremo",
            lead:
              "Modalita urgente che rientra in Nuovo territorio o Asset esistenti: analizza esposizione e precedenti dopo un trigger idraulico, sismico, franoso o multi-hazard.",
            output:
              "Resilience briefing",
            steps: [
              "scenario",
              "overlay",
              "trigger",
              "resilienza",
            ],
          },
          {
            action: "Avvia due diligence",
            center:
              "Area/corridor assessment + reports + evidence review",
            core:
              "Infrastructure Context Intelligence",
            href: "#professional-report",
            insight:
              "Sintetizza hazard, storia dei collassi, pattern territoriali e fonti per supportare valutazioni preliminari.",
            label: "Due diligence",
            lead:
              "Variante di Nuovo territorio quando la domanda e investimento, acquisizione, concessione o assessment preliminare.",
            output:
              "Report tecnico esportabile",
            steps: [
              "area",
              "hazard",
              "pattern",
              "report",
            ],
          },
          {
            action: "Esplora dati",
            center:
              "Analytics + API manifest + data dictionary",
            core:
              "Infrastructure Failure Intelligence",
            href: "#professional-api",
            insight:
              "Trasforma database, cause, distribuzioni geospaziali e trigger in evidenza analitica riutilizzabile.",
            label: "Ricerca",
            lead:
              "Vista analitica separata per ricerca, policy, statistiche e report evidence-based sul database storico ARCUS.",
            output:
              "Dataset, export e report evidence-based",
            steps: [
              "database",
              "cause",
              "statistiche",
              "export",
            ],
          },
        ]
      : [
          {
            action: "Screen area",
            center:
              "Atlas + scenario comparison + territorial context",
            core:
              "Territorial Infrastructure Intelligence",
            href: "#professional-risk-score",
            insight:
              "Highlights whether the territory shows hydraulic, landslide, seismic or recurring historical patterns before a new intervention.",
            label: "01 / New territory",
            lead:
              "No specific asset yet: evaluate a territory, site, corridor or province before design, acquisition or post-event screening.",
            output:
              "Territorial technical briefing",
            steps: [
              "territory",
              "hazards",
              "precedents",
              "briefing",
            ],
          },
          {
            action: "Upload inventory",
            center:
              "Asset upload + precedent matching + watchlist",
            core:
              "Evidence-Based Asset Prioritization",
            href: "#professional-assets",
            insight:
              "Ranks assets using territorial context, comparable precedents, exposure and inventory quality.",
            label: "02 / Existing assets",
            lead:
              "You already have bridges or infrastructure: prioritize monitoring, inspections and deeper investigations on an operational inventory.",
            output:
              "Watchlist and asset screening",
            steps: [
              "inventory",
              "precedents",
              "exposure",
              "watchlist",
            ],
          },
          {
            action: "Analyze scenario",
            center:
              "Hazard scenario + overlays + trigger analysis",
            core:
              "Territorial Resilience Intelligence",
            href: "#professional-scenarios",
            insight:
              "Compares exposure and precedents during extreme or multi-hazard scenarios to support resilience planning.",
            label: "Extreme event",
            lead:
              "Urgent mode inside New territory or Existing assets: understand exposure and precedents after a hydraulic, seismic, landslide or multi-hazard trigger.",
            output:
              "Resilience briefing",
            steps: [
              "scenario",
              "overlays",
              "triggers",
              "resilience",
            ],
          },
          {
            action: "Start due diligence",
            center:
              "Area/corridor assessment + reports + evidence review",
            core:
              "Infrastructure Context Intelligence",
            href: "#professional-report",
            insight:
              "Summarizes hazards, collapse history, territorial patterns and sources for preliminary technical evaluations.",
            label: "Due diligence",
            lead:
              "New territory variant for investment, acquisition, concession or preliminary technical assessment questions.",
            output:
              "Exportable technical report",
            steps: [
              "area",
              "hazards",
              "patterns",
              "report",
            ],
          },
          {
            action: "Explore data",
            center:
              "Analytics + API manifest + data dictionary",
            core:
              "Infrastructure Failure Intelligence",
            href: "#professional-api",
            insight:
              "Turns the database, causes, geospatial distributions and triggers into reusable analytical evidence.",
            label: "Research",
            lead:
              "Separate analytical view for research, policy, statistics and evidence-based reporting on the ARCUS historical database.",
            output:
              "Datasets, exports and evidence-based reports",
            steps: [
              "database",
              "causes",
              "statistics",
              "exports",
            ],
          },
        ];

  const externalSourcePlaybook =
    language === "it"
      ? [
          ["Declare", "Fonte, licenza, copertura, frequenza di aggiornamento e limiti."],
          ["Join", "Collegamento per provincia, buffer geografico, hazard class o evento."],
          ["Validate", "Controllo coerenza con eventi ARCUS, outlier e record incompleti."],
          ["Publish", "Versionamento della release e separazione tra dato ARCUS e dato esterno."],
        ]
      : [
          ["Declare", "Source, licence, coverage, update frequency and limitations."],
          ["Join", "Connection by province, geographic buffer, hazard class or event."],
          ["Validate", "Consistency checks against ARCUS events, outliers and incomplete records."],
          ["Publish", "Release versioning and separation between ARCUS and external data."],
        ];

  const publicationReadiness =
    language === "it"
      ? [
          ["Dataset", "Eventi, fonti, release e dizionario dati generati.", dataRelease?.version ? `v${dataRelease.version}` : "Ready"],
          ["Atlas", "Open e Professional differenziati per layer e linguaggio.", "2 livelli"],
          ["Export", "Template, screening asset, report e watchlist in formato tabellare.", "Excel/CSV"],
          ["Governance", "Model cards, limiti dichiarati, qualita dati e audit trail visibili.", `${modelCards.length} model cards`],
        ]
      : [
          ["Dataset", "Events, sources, release and data dictionary generated.", dataRelease?.version ? `v${dataRelease.version}` : "Ready"],
          ["Atlas", "Open and Professional differentiated by layers and language.", "2 tiers"],
          ["Export", "Templates, asset screening, reports and watchlists in tabular format.", "Excel/CSV"],
          ["Governance", "Model cards, declared limitations, data quality and audit trail visible.", `${modelCards.length} model cards`],
        ];

  const externalLayerSummary =
    useMemo(() => {
      const highPriority = externalLayers.filter(
        (layer) =>
          String(layer.priority).toLowerCase() ===
          "high"
      ).length;

      const declaredProviders = new Set(
        externalLayers
          .map((layer) => layer.provider)
          .filter(Boolean)
      ).size;

      return {
        declaredProviders,
        highPriority,
        total: externalLayers.length,
      };
    }, [externalLayers]);

  const activePath =
    professionalUseCases[activeEntryPath] ||
    professionalUseCases[0];
  const professionalPrimaryUseCases = professionalUseCases
    .map((item, index) => ({
      ...item,
      entryHint:
        index === 0
          ? language === "it"
            ? "Non hai un inventario specifico o vuoi capire prima il contesto territoriale? Parti da qui."
            : "No specific inventory yet, or need to understand the territorial context first? Start here."
          : language === "it"
            ? "Hai gia una lista di ponti, asset o tratte da verificare? Caricala qui."
            : "Already have a list of bridges, assets or routes to review? Upload it here.",
      index,
    }))
    .slice(0, 2);
  const selectedProjectContext =
    language === "it" ? "Ponte" : "Bridge";
  const selectedAinopProvinceIndex =
    ainopBridgeIndex?.provinces?.find(
      (item) => {
        if (!selectedProvinceRegistryItem) {
          return (
            normalizeProvinceKey(item.province) ===
            normalizeProvinceKey(selectedProvinceProfile?.territory)
          );
        }

        return provinceMatchesValue(
          selectedProvinceRegistryItem,
          item.province
        );
      }
    );
  const selectedPath01Intent =
    language === "it"
      ? {
          label: "Briefing territoriale",
          text: "Lettura preliminare di evidenze storiche, hazard e priorita di approfondimento per la provincia selezionata.",
        }
      : {
          label: "Territorial briefing",
          text: "Preliminary reading of historical evidence, hazards and follow-up priorities for the selected province.",
        };
  const selectedPath02ReadingMode =
    path02ReadingMode === "vulnerability_assessment"
      ? language === "it"
        ? "Vulnerability assessment"
        : "Vulnerability assessment"
      : language === "it"
        ? "Monitoring priority"
        : "Monitoring priority";
  const selectedCollapseRateAvailable =
    Number(selectedAinopProvinceIndex?.ainop_bridges_total || 0) >
      0 &&
    Number.isFinite(
      Number(
        selectedAinopProvinceIndex?.collapse_rate_per_100_ainop_bridges
      )
    );
  const selectedCollapseRateMultiplier =
    selectedCollapseRateAvailable &&
    Number.isFinite(
      Number(selectedAinopProvinceIndex?.relative_to_national)
    )
      ? `${selectedAinopProvinceIndex.relative_to_national}x`
      : "N/A";
  const selectedCollapseRatePer100 = selectedCollapseRateAvailable
    ? selectedAinopProvinceIndex.collapse_rate_per_100_ainop_bridges
    : "N/A";
  const selectedCollapseRateNumerator =
    selectedAinopProvinceIndex?.numerator_count ??
    selectedAinopProvinceIndex?.arcus_cases ??
    workflowEvents.length;
  const selectedCollapseRateNationalReference =
    selectedAinopProvinceIndex?.national_rate_per_100 ??
    selectedAinopProvinceIndex?.national_rate_per_100_ainop_bridges ??
    ainopBridgeIndex?.metadata?.national_rate_per_100_ainop_bridges ??
    "N/A";
  const selectedCollapseRateDatasetVersion =
    selectedAinopProvinceIndex?.dataset_version ??
    ainopBridgeIndex?.metadata?.dataset_version ??
    "N/A";
  const selectedCollapseRateDataCutoff =
    selectedAinopProvinceIndex?.data_cutoff_date ??
    ainopBridgeIndex?.metadata?.data_cutoff_date ??
    "N/A";
  const selectedCollapseRateLatestEventDate =
    selectedAinopProvinceIndex?.latest_event_date ??
    ainopBridgeIndex?.metadata?.latest_event_date ??
    "N/A";
  const selectedCollapseRateIncludedYearMax =
    selectedAinopProvinceIndex?.included_year_max ??
    ainopBridgeIndex?.metadata?.included_year_max ??
    "N/A";
  const selectedCollapseRateConfidence = String(
    selectedAinopProvinceIndex?.collapse_rate_confidence ||
      "unavailable"
  ).replaceAll("_", " ");
  const selectedCollapseRateScore =
    selectedCollapseRateAvailable &&
    Number.isFinite(
      Number(selectedAinopProvinceIndex?.relative_to_national)
    )
      ? Math.min(
          100,
          Math.round(
            Number(selectedAinopProvinceIndex.relative_to_national) *
              16.67
          )
        )
      : null;
  const selectedExposurePrioritySource =
    workflowHazardExposure?.score ??
    selectedProvinceProfile?.scenarioScore ??
    selectedProvinceProfile?.riskScore ??
    null;
  const selectedExposurePriorityScore =
    selectedExposurePrioritySource === null ||
    selectedExposurePrioritySource === undefined
      ? null
      : Math.round(Number(selectedExposurePrioritySource));
  const selectedFinalPriorityIndex =
    Number.isFinite(selectedExposurePriorityScore) &&
    Number.isFinite(selectedCollapseRateScore)
      ? Math.round(
          selectedExposurePriorityScore * 0.7 +
            selectedCollapseRateScore * 0.3
        )
      : null;
  const selectedFinalPriorityIndexLabel = Number.isFinite(
    selectedFinalPriorityIndex
  )
    ? String(selectedFinalPriorityIndex)
    : "N/A";
  const territoryReading = (() => {
    const province =
      selectedProvinceProfile?.territory ||
      (language === "it"
        ? "provincia selezionata"
        : "selected province");
    const hazard =
      workflowHazardExposure?.dominant_hazard ||
      selectedProvinceProfile?.topCause ||
      "hazard";
    const hazardText = String(hazard).toLowerCase();
    const eventCount = workflowEvents.length;
    const municipalities = new Set(
      workflowEvents
        .map((event) => event.municipality)
        .filter(Boolean)
    ).size;
    const isHydraulic =
      hazardText.includes("hydraulic") ||
      hazardText.includes("idraul");

    if (language === "it") {
      if (isHydraulic) {
        return `${province} mostra un profilo idraulico da leggere per contesti geomorfologici, non come segnale uniforme: ${eventCount} eventi ARCUS distribuiti in ${municipalities || 1} comuni indicano che corsi d'acqua confinati o torrentizi, attraversamenti vallivi e aste di pianura devono essere distinti nella fase di verifica.`;
      }

      return `${province} mostra un profilo territoriale eterogeneo: ${eventCount} eventi ARCUS distribuiti in ${municipalities || 1} comuni indicano che il driver ${hazard} va letto insieme a morfologia locale, reticolo idrografico, versanti e continuita degli attraversamenti.`;
    }

    if (isHydraulic) {
      return `${province} shows a hydraulic profile that should be read by geomorphological setting, not as a uniform signal: ${eventCount} ARCUS events across ${municipalities || 1} municipalities indicate that confined or torrential watercourses, valley crossings and lowland river reaches must be separated during verification.`;
    }

    return `${province} shows a heterogeneous territorial profile: ${eventCount} ARCUS events across ${municipalities || 1} municipalities indicate that the ${hazard} driver must be read together with local morphology, drainage network, slopes and crossing continuity.`;
  })();
  const historicalPatternReading = (() => {
    const dateCounts = countBy(workflowEvents, "date");
    const topDate = dateCounts[0];
    const topDateShare = topDate
      ? percentage(topDate[1], workflowEvents.length || 1)
      : 0;
    const dominantCause =
      selectedProvinceDrivers.causes[0]?.label ||
      selectedProvinceProfile?.topCause ||
      "-";
    const dominantCauseShare = percentage(
      selectedProvinceDrivers.causes[0]?.value || 0,
      workflowEvents.length || 1
    );
    const topDateCount = topDate?.[1] || 0;
    const causeText = String(dominantCause).toLowerCase();
    const isHydraulicPattern =
      causeText.includes("hydraulic") ||
      causeText.includes("idraul");
    const isConcentrated = topDateShare >= 45;
    const isClusteredEvent = topDateCount >= 2;
    const eventScenario = isHydraulicPattern
      ? language === "it"
        ? "scenario di piena/alluvione"
        : "flood/extreme-hydraulic scenario"
      : language === "it"
        ? "scenario di evento critico"
        : "critical-event scenario";
    const geomorphologyHint =
      isHydraulicPattern
        ? language === "it"
          ? "prevalentemente legato a corsi d'acqua, dinamiche di piena, scalzamento e trasporto solido."
          : "mainly tied to watercourses, flood dynamics, scour and sediment/debris transport."
        : language === "it"
          ? "da leggere insieme a morfologia locale, versanti, fondazioni e condizioni di esercizio."
          : "to be read together with local morphology, slopes, foundations and operating conditions.";

    return {
      dominantCause,
      dominantCauseShare,
      geomorphologyHint,
      isClusteredEvent,
      isConcentrated,
      topDate: topDate?.[0] || "",
      topDateCount,
      topDateShare,
      temporal:
        language === "it"
          ? isConcentrated
            ? `collassi concentrati in un singolo ${eventScenario} (${topDate?.[0] || "data ricorrente"}, ${topDateShare}%).`
            : isClusteredEvent
              ? `cluster di ${topDateCount} collassi nella stessa data (${topDate?.[0]}): leggere come ${eventScenario}, non come casi indipendenti.`
              : `rischio storico distribuito su piu eventi e date (${topDateShare}% nel giorno piu ricorrente).`
          : isConcentrated
            ? `collapses concentrated in a single ${eventScenario} (${topDate?.[0] || "recurrent date"}, ${topDateShare}%).`
            : isClusteredEvent
              ? `cluster of ${topDateCount} collapses on the same date (${topDate?.[0]}): read as a ${eventScenario}, not as independent cases.`
              : `historical risk distributed across multiple events and dates (${topDateShare}% on the most recurrent date).`,
      type: isConcentrated || isClusteredEvent
        ? language === "it"
          ? isHydraulicPattern
            ? "Scenario alluvionale concentrato"
            : "Evento critico concentrato"
          : isHydraulicPattern
            ? "Concentrated flood scenario"
            : "Concentrated critical event"
        : language === "it"
          ? "Rischio cronico distribuito"
          : "Distributed chronic risk",
    };
  })();
  const manualAreaLabel =
    activeEntryPath !== 0 &&
    manualAreaBounds &&
    manualAreaProvinces.length
      ? manualAreaProvinces.length === 1
        ? manualAreaProvinces[0]
        : `${manualAreaProvinces.join(", ")} (${
            manualAreaProvinces.length
          } ${
            language === "it"
              ? "province"
              : "provinces"
          })`
      : selectedProvinceProfile?.territory || "-";
  const professionalWmsOverlays = [
    {
      attribution:
        "ISPRA SDI - Aree pericolosita idraulica P3",
      id: "professional-ispra-flood-p3",
      layerKey: "hydraulic",
      layers: "aree_peric_idraulica_p3",
      opacity: 0.34,
      url: "https://sdi.isprambiente.it/geoserver/nz1/wms",
    },
    {
      attribution:
        "ISPRA IdroGEO - Pericolosita frane PAI v.5.0 (2024)",
      id: "professional-ispra-landslide-pai",
      layerKey: "landslide",
      layers: "idrogeo:pericolosita_frane",
      opacity: 0.42,
      url: "https://idrogeo.isprambiente.it/geoserver/idrogeo/wms",
    },
  ];
  const activeProfessionalHazardLayers = {
    hydraulic: Boolean(professionalMapLayers.hydraulic),
    landslide: Boolean(professionalMapLayers.landslide),
    seismic: Boolean(professionalMapLayers.seismic),
  };
  const activeProfessionalWmsOverlays = professionalWmsOverlays.filter(
    (overlay) => activeProfessionalHazardLayers[overlay.layerKey]
  );
  const formatExposureCoordinate = (value) =>
    Number.isFinite(Number(value))
      ? Number(value).toFixed(5)
      : "";
  const activePath01ExposurePoint = {
    latitude: projectLocation.latitude,
    longitude: projectLocation.longitude,
  };
  const path01LocationValidated = Boolean(projectLocation.validated);
  const projectLocationStatusMessage = () => {
    if (path01LocationValidated) {
      return language === "it"
        ? "Punto progetto validato e provincia sincronizzata."
        : "Project point validated and province synchronized.";
    }

    if (projectLocation.error === "point_outside_italy") {
      return language === "it"
        ? "Il punto selezionato non ricade in una provincia italiana."
        : "The selected point does not fall within an Italian province.";
    }

    if (projectLocation.error === "province_geometry_unavailable") {
      return language === "it"
        ? "Geometria provinciale non disponibile: non posso validare il punto."
        : "Province geometry is unavailable: the point cannot be validated.";
    }

    if (projectLocation.error === "province_not_resolved") {
      return language === "it"
        ? "Il punto ricade in una geometria provinciale non collegata a un profilo ARCUS."
        : "The point falls in a province geometry that is not linked to an ARCUS profile.";
    }

    if (
      projectLocation.error === "invalid_coordinates" ||
      projectLocation.error === "coordinates_out_of_range"
    ) {
      return language === "it"
        ? "Coordinate non valide."
        : "Invalid coordinates.";
    }

    return language === "it"
      ? "Seleziona un punto progetto nella provincia scelta."
      : "Select a project point within the chosen province";
  };
  const clearProjectLocationForProvinceChange = (province) => {
    const registryProvince =
      findProvinceInRegistry(provinceRegistry, province);

    activeHazardRequestRef.current = "";
    setSelectedProvince(registryProvince?.name || province);
    setProjectLocation({
      derivedProvince: "",
      derivedProvinceCode: "",
      derivedProvinceKey: "",
      derivedProvinceName: "",
      latitude: "",
      longitude: "",
      selectionSource: "province_change",
      validated: false,
    });
    setPath01HydraulicExposure(null);
    setPath01LandslideExposure(null);
    setPath01SeismicExposure(null);
    setPath01MitigationIntelligence(null);
    setPath01ExposureStatus("idle");
  };
  const hydraulicExposureLabel = (exposure) => {
    if (!exposure) {
      return language === "it"
        ? "Punto non selezionato"
        : "No point selected";
    }

    if (exposure.status === "partial") {
      return language === "it"
        ? "Risultato idraulico parziale"
        : "Partial hydraulic result";
    }

    if (exposure.status === "available") {
      return exposure.highest_class
        ? exposure.highest_class
        : language === "it"
          ? "Dato ISPRA disponibile senza classe ordinata"
          : "ISPRA data available without an ordered class";
    }

    if (exposure.status === "no_intersection") {
      if (hasNearbyOfficialContext(exposure)) {
        return language === "it"
          ? "Nessuna classe idraulica ISPRA al punto"
          : "No ISPRA hydraulic class at selected point";
      }

      return language === "it"
        ? "Nessuna classe idraulica ISPRA interseca il punto"
        : "No ISPRA hydraulic class intersects the point";
    }

    if (exposure.status === "invalid_coordinates") {
      return language === "it"
        ? "Coordinate non valide"
        : "Invalid coordinates";
    }

    return exposure.status || "unavailable";
  };
  const hydraulicPartialExplanation = (exposure) => {
    if (exposure?.status !== "partial") {
      return "";
    }

    if (exposure.matched_classes?.length) {
      return language === "it"
        ? `Intersezione osservata nei layer ${exposure.matched_classes.join(", ")}; uno o piu layer ISPRA non hanno completato la valutazione.`
        : `Intersection observed in ${exposure.matched_classes.join(", ")}; one or more ISPRA layers did not complete the assessment.`;
    }

    return language === "it"
      ? "Nessuna intersezione e stata trovata nei layer che hanno risposto. Uno o piu layer configurati non hanno potuto essere valutati."
      : "No intersection was found in the layers that responded. One or more configured layers could not be evaluated.";
  };
  const hydraulicLayerStatusItems = (exposure) =>
    Array.isArray(exposure?.layer_results)
      ? exposure.layer_results.map((layer) => ({
          className: layer.className || layer.class_name || "-",
          failed:
            !["available", "no_intersection"].includes(layer.status),
          status: layer.status || "unknown",
        }))
      : [];
  const mitigationAbstentionMessage = (intelligence) => {
    const reasons = intelligence?.abstention_reasons || [];

    if (reasons.includes("official_hydraulic_exposure_incomplete")) {
      return language === "it"
        ? "ARCUS si astiene: la valutazione ISPRA e incompleta e i layer mancanti non possono essere interpretati come assenza di pericolosita. Nessuna prescrizione viene generata."
        : "ARCUS abstains: the ISPRA assessment is incomplete and failed layers cannot be interpreted as absence of hazard. No prescription is generated.";
    }

    if (reasons.includes("official_hydraulic_exposure_unavailable")) {
      return language === "it"
        ? "ARCUS si astiene: l'esposizione idraulica ufficiale non e disponibile. Nessuna prescrizione viene generata."
        : "ARCUS abstains: official hydraulic exposure is unavailable. No prescription is generated.";
    }

    if (reasons.includes("official_hydraulic_exposure_not_intersected")) {
      if (
        path01HydraulicExposure?.nearby_context?.status === "available"
      ) {
        return language === "it"
          ? `Il punto e fuori dai perimetri idraulici classificati. ARCUS mostra comunque il contesto ISPRA ufficiale entro ${path01HydraulicExposure.nearby_context.search_radius_km} km, ma non lo usa come se fosse una classe attribuita al punto e non genera prescrizioni automatiche.`
          : `The point is outside classified hydraulic perimeters. ARCUS still shows official ISPRA context within ${path01HydraulicExposure.nearby_context.search_radius_km} km, but does not treat it as a class assigned to the point or generate automatic prescriptions.`;
      }

      return language === "it"
        ? "Il punto e fuori dai perimetri idraulici classificati ISPRA. Nessuna prescrizione automatica viene generata."
        : "The point is outside ISPRA classified hydraulic perimeters. No automatic prescription is generated.";
    }

    return language === "it"
      ? "ARCUS si astiene: l'evidenza provinciale non supera la soglia minima di supporto. Nessuna prescrizione viene generata."
      : "ARCUS abstains: provincial evidence does not meet the minimum support threshold. No prescription is generated.";
  };
  const landslideExposureLabel = (exposure) => {
    if (!exposure) {
      return language === "it"
        ? "Punto non selezionato"
        : "No point selected";
    }

    if (exposure.status === "available" || exposure.status === "partial") {
      if (exposure.highest_hazard_class) {
        return exposure.highest_hazard_class;
      }

      if (exposure.attention_area) {
        return "AA";
      }

      return language === "it"
        ? "Nessuna classe PAI"
        : "No PAI class";
    }

    if (exposure.status === "no_intersection") {
      if (hasNearbyOfficialContext(exposure)) {
        return language === "it"
          ? "Nessuna classe PAI ISPRA al punto"
          : "No ISPRA PAI class at selected point";
      }

      return language === "it"
        ? "Nessuna classe PAI ISPRA interseca il punto"
        : "No ISPRA PAI class intersects the point";
    }

    if (exposure.status === "invalid_coordinates") {
      return language === "it"
        ? "Coordinate non valide"
        : "Invalid coordinates";
    }

    return exposure.status || "unavailable";
  };
  const landslideCompletenessExplanation = (exposure) => {
    if (!exposure || exposure.assessment_complete !== false) {
      return "";
    }

    return language === "it"
      ? "Valutazione PAI incompleta: ARCUS non interpreta l'indisponibilita della sorgente come assenza di pericolosita. Un'eventuale osservazione precedente e mostrata solo come contesto."
      : "Incomplete PAI assessment: ARCUS does not interpret source unavailability as absence of hazard. Any previous observation is shown as context only.";
  };
  const seismicExposureLabel = (exposure) => {
    if (!exposure) {
      return language === "it"
        ? "Punto non selezionato"
        : "No point selected";
    }

    if (exposure.status === "available" && hasSeismicPga(exposure)) {
      return `${Number(exposure.pga_p50_g).toFixed(3)} g`;
    }

    if (exposure.status === "configuration_error") {
      return language === "it"
        ? "Griglia MPS04 non configurata"
        : "MPS04 grid not configured";
    }

    if (exposure.status === "outside_coverage") {
      return language === "it"
        ? "Fuori copertura MPS04"
        : "Outside MPS04 coverage";
    }

    if (exposure.status === "invalid_coordinates") {
      return language === "it"
        ? "Coordinate non valide"
        : "Invalid coordinates";
    }

    return exposure.status || "unavailable";
  };
  const hasSeismicPga = (exposure) =>
    exposure?.pga_p50_g !== null &&
    exposure?.pga_p50_g !== undefined &&
    exposure?.pga_p50_g !== "" &&
    Number.isFinite(Number(exposure.pga_p50_g));
  const commitProjectLocation = async (
    latitude,
    longitude,
    selectionSource = "manual"
  ) => {
    const point = {
      latitude,
      longitude,
      selectionSource,
    };
    const derived = deriveProvinceForPoint(provinceGeoFeatures, point);

    if (!derived.validated) {
      setProjectLocation({
        derivedProvince: "",
        derivedProvinceCode: "",
        derivedProvinceKey: "",
        derivedProvinceName: "",
        error:
          provinceGeometryStatus === "error" ||
          provinceGeometryStatus === "loading"
            ? "province_geometry_unavailable"
            : derived.error,
        latitude: derived.latitude ?? point?.latitude ?? "",
        longitude: derived.longitude ?? point?.longitude ?? "",
        selectionSource: point?.selectionSource || "manual",
        validated: false,
      });
      setPath01HydraulicExposure(null);
      setPath01LandslideExposure(null);
      setPath01SeismicExposure(null);
      setPath01MitigationIntelligence(null);
      setPath01ExposureStatus("blocked");

      return;
    }

    const registryProvince =
      findProvinceInRegistry(
        provinceRegistry,
        derived.derivedProvinceCode
      ) ||
      findProvinceInRegistry(provinceRegistry, derived.derivedProvince);
    const derivedProvinceName =
      registryProvince?.name || derived.derivedProvince;
    const derivedProvinceCode =
      registryProvince?.code || derived.derivedProvinceCode;
    const derivedProvinceKey =
      registryProvince?.key || derived.derivedProvinceKey;

    setProjectLocation({
      derivedProvince: derivedProvinceName,
      derivedProvinceCode,
      derivedProvinceKey,
      derivedProvinceName,
      error: "",
      latitude: derived.latitude,
      longitude: derived.longitude,
      selectionSource,
      validated: true,
    });
    setSelectedProvince(derivedProvinceName);
    setPath01HydraulicExposure({
      confidence: "pending",
      highest_class: null,
      matched_classes: [],
      normalized_score: null,
      status: "loading",
    });
    setPath01LandslideExposure({
      attention_area: false,
      confidence: "pending",
      highest_hazard_class: null,
      matched_attention_classes: [],
      matched_hazard_classes: [],
      normalized_score: null,
      status: "loading",
    });
    setPath01SeismicExposure({
      confidence: "pending",
      model: "MPS04",
      model_role: "reference_regulatory_model",
      nearest_node: null,
      normalized_score: null,
      pga_p50_g: null,
      status: "loading",
      unit: "g",
    });
    setPath01MitigationIntelligence({
      status: "loading",
      strategies: [],
    });
    setPath01ExposureStatus("loading");
    const exposureRequestToken = `${Date.now()}-${derived.latitude}-${derived.longitude}`;

    activeHazardRequestRef.current = exposureRequestToken;

    try {
      const result = await professionalHazardExposurePoint({
        bypassCache: false,
        hazards: ["hydraulic", "landslide", "seismic"],
        include_nearby_context: true,
        latitude: derived.latitude,
        longitude: derived.longitude,
      });

      ["hydraulic", "landslide", "seismic"].forEach((hazard) => {
        traceFrontendHazardStage({
          hazard,
          latitude: derived.latitude,
          longitude: derived.longitude,
          requestId: result.request_id || result.query?.request_id,
          stage: "frontend_response_received",
        });
      });

      if (activeHazardRequestRef.current !== exposureRequestToken) {
        return;
      }

      setPath01HydraulicExposure(
        result.hydraulic || {
          confidence: "source_unavailable",
          highest_class: null,
          matched_classes: [],
          normalized_score: null,
          status: "provider_exception",
        }
      );
      setPath01LandslideExposure(
        result.landslide || {
          attention_area: false,
          confidence: "source_unavailable",
          highest_hazard_class: null,
          matched_attention_classes: [],
          matched_hazard_classes: [],
          normalized_score: null,
          status: "provider_exception",
        }
      );
      setPath01SeismicExposure(
        result.seismic || {
          confidence: "source_unavailable",
          error: {
            code: "provider_not_returned",
            message:
              "The API response did not include the seismic provider result. Restart the ARCUS API backend if the seismic provider was added after the server started.",
            retryable: true,
            stage: "frontend_response_mapped",
          },
          model: "MPS04",
          model_role: "reference_regulatory_model",
          nearest_node: null,
          normalized_score: null,
          pga_p16_g: null,
          pga_p50_g: null,
          pga_p84_g: null,
          sampling_method: "nearest_grid_node",
          source: {
            provider: "INGV",
            service_type: "local_grid",
          },
          status: "source_unavailable",
          unit: "g",
        }
      );
      try {
        const mitigation = await professionalMitigationIntelligence({
          official_exposure: {
            hydraulic: result.hydraulic || null,
            landslide: result.landslide || null,
            seismic: result.seismic || null,
          },
          project_context: projectContext,
          project_location: {
            derived_province: derivedProvinceName,
            latitude: derived.latitude,
            longitude: derived.longitude,
            validated: true,
          },
        });

        if (activeHazardRequestRef.current === exposureRequestToken) {
          setPath01MitigationIntelligence(mitigation);
        }
      } catch {
        if (activeHazardRequestRef.current === exposureRequestToken) {
          setPath01MitigationIntelligence({
            error: "service_unreachable",
            status: "unavailable",
            strategies: [],
          });
        }
      }
      setPath01ExposureStatus("ready");
      ["hydraulic", "landslide", "seismic"].forEach((hazard) => {
        traceFrontendHazardStage({
          hazard,
          latitude: derived.latitude,
          longitude: derived.longitude,
          requestId: result.request_id || result.query?.request_id,
          stage: "frontend_state_updated",
        });
      });
    } catch {
      if (activeHazardRequestRef.current !== exposureRequestToken) {
        return;
      }

      setPath01HydraulicExposure({
        confidence: "source_unavailable",
        explanation: [
          language === "it"
            ? "La sorgente ufficiale non e disponibile in questa sessione."
            : "The official source is not available in this session.",
        ],
        highest_class: null,
        matched_classes: [],
        normalized_score: null,
        status: "service_unreachable",
      });
      setPath01LandslideExposure({
        attention_area: false,
        confidence: "source_unavailable",
        explanation: [
          language === "it"
            ? "La sorgente ufficiale PAI non e disponibile in questa sessione."
            : "The official PAI source is not available in this session.",
        ],
        highest_hazard_class: null,
        matched_attention_classes: [],
        matched_hazard_classes: [],
        normalized_score: null,
        status: "service_unreachable",
      });
      setPath01SeismicExposure({
        confidence: "source_unavailable",
        explanation: [
          language === "it"
            ? "La griglia locale INGV MPS04 non e disponibile in questa sessione."
            : "The local INGV MPS04 grid is not available in this session.",
        ],
        model: "MPS04",
        model_role: "reference_regulatory_model",
        nearest_node: null,
        normalized_score: null,
        pga_p16_g: null,
        pga_p50_g: null,
        pga_p84_g: null,
        sampling_method: "nearest_grid_node",
        source: {
          provider: "INGV",
          service_type: "local_grid",
        },
        status: "source_unavailable",
        unit: "g",
      });
      setPath01MitigationIntelligence({
        error: "official_exposure_unavailable",
        status: "unavailable",
        strategies: [],
      });
      setPath01ExposureStatus("service_unreachable");
    }
  };
  const topAssetForExposure = assetScreening[0] || null;
  const queryPath02HydraulicExposure = async () => {
    if (!topAssetForExposure) {
      return;
    }

    setPath02ExposureStatus("loading");

    try {
      const result = await professionalHazardExposurePoint({
        hazards: ["hydraulic"],
        latitude: Number(topAssetForExposure.latitude),
        longitude: Number(topAssetForExposure.longitude),
      });

      setPath02HydraulicExposure(result.hydraulic || null);
      setPath02ExposureStatus("ready");
    } catch {
      setPath02HydraulicExposure({
        confidence: "source_unavailable",
        explanation: [
          language === "it"
            ? "La sorgente ufficiale non e disponibile in questa sessione."
            : "The official source is not available in this session.",
        ],
        highest_class: null,
        matched_classes: [],
        normalized_score: null,
        status: "service_unreachable",
      });
      setPath02ExposureStatus("error");
    }
  };
  const professionalWorkflowActions =
    language === "it"
      ? [
          [
            {
              href: "#professional-risk-score",
              stage: "01",
              title: "Definisci localizzazione progetto",
              text: "Usa la provincia per navigare il contesto, poi seleziona il punto progetto che sincronizza statistiche, denominatore e report.",
            },
            {
              href: "#professional-scenarios",
              scenario: "baseline",
              stage: "02",
              title: "Conferma e anteprima",
              text: "Verifica contesto d'uso, provincia selezionata e segnali disponibili prima della lettura territoriale.",
            },
            {
              href: "#professional-external-layers",
              stage: "03",
              title: "Leggi territorio e layer",
              text: "Leggi contesto geomorfologico sintetico e layer WMS idraulico, frane e sismicita come esposizioni separate.",
            },
            {
              href: "#professional-similarity",
              stage: "04",
              title: "Leggi pattern storico",
              text: "Distingui evento catastrofico concentrato, rischio distribuito, trigger dominante e geomorfologia coinvolta.",
            },
            {
              href: "#professional-report",
              stage: "05",
              title: "Genera report",
              text: "Esporta territorio, patrimonio, pattern storico, azioni e Priority Index conclusivo.",
            },
          ],
          [
            {
              href: "#professional-assets",
              mapLayers: {
                assets: true,
                events: true,
                heatmap: true,
                watchlist: true,
              },
              stage: "01",
              title: "Carica inventario",
              text: "Carica il file CSV/Excel dei ponti in gestione e valida campi obbligatori, avvisi e record bloccati.",
            },
            {
              href: "#professional-map",
              mapLayers: {
                assets: true,
                events: true,
                heatmap: true,
                watchlist: true,
              },
              stage: "02",
              title: "Conferma e anteprima",
              text: "Verifica file caricato, contesto d'uso e record validi prima del calcolo degli score.",
            },
            {
              href: "#professional-assets",
              stage: "03",
              title: "Processa e calcola score",
              text: "Calcola Asset Priority Score, Hazard Profile e Proximity Score per ogni ponte valido.",
            },
            {
              href: "#professional-similarity",
              stage: "04",
              title: "Leggi watchlist",
              text: "Esplora watchlist prioritizzata, asset critici e precedenti ARCUS comparabili.",
            },
            {
              href: "#professional-monitoring",
              stage: "05",
              title: "Genera report",
              text: "Esporta Full PDF, One-Page Brief, Asset Table, Source Table e GIS Package.",
            },
          ],
          [
            {
              href: "#professional-scenarios",
              scenario: "hydraulic",
              stage: "01",
              title: "Seleziona tipo evento",
              text: "Scegli flood, frana, sisma o scenario multi-hazard.",
            },
            {
              href: "#professional-map",
              mapLayers: {
                assets: true,
                events: true,
                heatmap: true,
                watchlist: true,
              },
              stage: "02",
              title: "Seleziona area o corridoio",
              text: "Definisci l'area geografica di analisi prima di attivare lo scenario.",
            },
            {
              href: "#professional-risk-score",
              scenario: "landslide",
              stage: "03",
              title: "Attiva layer scenario",
              text: "Mostra layer hazard rilevanti e crolli storici ARCUS correlati.",
            },
            {
              href: "#professional-similarity",
              stage: "04",
              title: "Confronta scenari storici",
              text: "Identifica fallimenti analoghi e pattern ricorrenti.",
            },
            {
              href: "#professional-report",
              stage: "05",
              title: "Genera scenario briefing",
              text: "Esporta esposizione evento estremo, mappe scenario e note di resilienza.",
            },
          ],
          [
            {
              href: "#professional-risk-score",
              stage: "01",
              title: "Definisci area due diligence",
              text: "Seleziona territorio, corridoio o sistema infrastrutturale in valutazione.",
            },
            {
              href: "#professional-hazard-preview",
              stage: "02",
              title: "Leggi contesto infrastrutturale",
              text: "ARCUS fornisce esposizione hazard, fallimenti storici e intelligence territoriale.",
            },
            {
              href: "#professional-hotspots",
              stage: "03",
              title: "Identifica pattern critici",
              text: "Evidenzia vulnerabilita ricorrenti e pattern infrastrutturali.",
            },
            {
              href: "#professional-governance",
              stage: "04",
              title: "Costruisci evidence package",
              text: "Seleziona mappe, eventi, grafici e fonti da includere.",
            },
            {
              href: "#professional-report",
              stage: "05",
              title: "Esporta due diligence",
              text: "Genera un pacchetto tecnico source-backed per valutazioni e concessioni.",
            },
          ],
          [
            {
              href: "#professional-api",
              stage: "01",
              title: "Definisci query",
              text: "Imposta filtri, periodi, cause e categorie infrastrutturali.",
            },
            {
              href: "#professional-quality",
              stage: "02",
              title: "Esplora dataset",
              text: "ARCUS mostra analytics statistiche e geospaziali.",
            },
            {
              href: "#professional-dictionary",
              stage: "03",
              title: "Confronta pattern",
              text: "Confronta regioni, cause, stagioni e meccanismi di collasso.",
            },
            {
              href: "#professional-scenarios",
              stage: "04",
              title: "Costruisci evidence set",
              text: "Seleziona grafici, mappe, eventi e output analitici.",
            },
            {
              href: "#professional-report",
              stage: "05",
              title: "Esporta research output",
              text: "Genera dataset, figure, mappe e report research-ready.",
            },
          ],
        ][activeEntryPath] || []
      : [
          [
            {
              href: "#professional-risk-score",
              stage: "01",
              title: "Define project location",
              text: "Use the province to navigate the context, then select the project point that synchronizes statistics, denominator and report.",
            },
            {
              href: "#professional-scenarios",
              scenario: "baseline",
              stage: "02",
              title: "Confirm and preview",
              text: "Review use context, selected province and available signals before the territory reading.",
            },
            {
              href: "#professional-external-layers",
              stage: "03",
              title: "Read territory and layers",
              text: "Read synthetic geomorphological context and hydraulic, landslide and seismic WMS as separate exposures.",
            },
            {
              href: "#professional-similarity",
              stage: "04",
              title: "Read historical pattern",
              text: "Distinguish concentrated catastrophic event, distributed risk, dominant trigger and involved geomorphology.",
            },
            {
              href: "#professional-report",
              stage: "05",
              title: "Generate report",
              text: "Export territory, heritage, historical pattern, actions and final Priority Index.",
            },
          ],
          [
            {
              href: "#professional-assets",
              mapLayers: {
                assets: true,
                events: true,
                heatmap: true,
                watchlist: true,
              },
              stage: "01",
              title: "Upload inventory",
              text: "Upload the CSV/Excel bridge inventory and validate required fields, warnings and blocked records.",
            },
            {
              href: "#professional-map",
              mapLayers: {
                assets: true,
                events: true,
                heatmap: true,
                watchlist: true,
              },
              stage: "02",
              title: "Confirm and preview",
              text: "Review uploaded file, use context and valid records before score processing.",
            },
            {
              href: "#professional-assets",
              stage: "03",
              title: "Process and score",
              text: "Calculate Asset Priority Score, Hazard Profile and Proximity Score for every valid bridge.",
            },
            {
              href: "#professional-similarity",
              stage: "04",
              title: "Read watchlist",
              text: "Explore the prioritized watchlist, critical assets and comparable ARCUS precedents.",
            },
            {
              href: "#professional-monitoring",
              stage: "05",
              title: "Generate report",
              text: "Export Full PDF, One-Page Brief, Asset Table, Source Table and GIS Package.",
            },
          ],
          [
            {
              href: "#professional-scenarios",
              scenario: "hydraulic",
              stage: "01",
              title: "Select event type",
              text: "Choose flood, landslide, earthquake or multi-hazard scenario.",
            },
            {
              href: "#professional-map",
              mapLayers: {
                assets: true,
                events: true,
                heatmap: true,
                watchlist: true,
              },
              stage: "02",
              title: "Select area or corridor",
              text: "Define the geographical area of analysis before activating the scenario.",
            },
            {
              href: "#professional-risk-score",
              scenario: "landslide",
              stage: "03",
              title: "Activate scenario layers",
              text: "Display relevant hazard layers and correlated ARCUS historical collapses.",
            },
            {
              href: "#professional-similarity",
              stage: "04",
              title: "Compare historical scenarios",
              text: "Identify analogous failures and recurring patterns.",
            },
            {
              href: "#professional-report",
              stage: "05",
              title: "Generate scenario briefing",
              text: "Export extreme-event exposure, scenario maps and resilience notes.",
            },
          ],
          [
            {
              href: "#professional-risk-score",
              stage: "01",
              title: "Define due diligence area",
              text: "Select a territory, corridor or infrastructure system under evaluation.",
            },
            {
              href: "#professional-hazard-preview",
              stage: "02",
              title: "Read infrastructure context",
              text: "ARCUS provides hazard exposure, historical failures and territorial intelligence.",
            },
            {
              href: "#professional-hotspots",
              stage: "03",
              title: "Identify critical patterns",
              text: "Highlight recurring vulnerabilities and infrastructure patterns.",
            },
            {
              href: "#professional-governance",
              stage: "04",
              title: "Build evidence package",
              text: "Select maps, events, graphics and sources to include.",
            },
            {
              href: "#professional-report",
              stage: "05",
              title: "Export due diligence",
              text: "Generate a source-backed technical package for evaluations and concessions.",
            },
          ],
          [
            {
              href: "#professional-api",
              stage: "01",
              title: "Define research query",
              text: "Set filters, periods, causes and infrastructure categories.",
            },
            {
              href: "#professional-quality",
              stage: "02",
              title: "Explore dataset",
              text: "ARCUS displays statistical and geospatial analytics.",
            },
            {
              href: "#professional-dictionary",
              stage: "03",
              title: "Compare patterns",
              text: "Compare regions, causes, seasons and collapse mechanisms.",
            },
            {
              href: "#professional-scenarios",
              stage: "04",
              title: "Build evidence set",
              text: "Select charts, maps, events and analytical outputs.",
            },
            {
              href: "#professional-report",
              stage: "05",
              title: "Export research output",
              text: "Generate datasets, figures, maps and research-ready reports.",
            },
          ],
        ][activeEntryPath] || [];
  const activePathOutputs =
    professionalWorkflowActions
      .slice(-1)
      .map((action) => action.text);

  const activateWorkflowAction = (
    action,
    stepIndex = 0
  ) => {
    setActiveWorkflowStep(stepIndex);

    if (action.scenario) {
      setScenario(action.scenario);
    }

    if (action.mapLayers) {
      setProfessionalMapLayers((current) => ({
        ...current,
        ...action.mapLayers,
      }));
    }

    const targetId = action.href?.replace("#", "");

    if (targetId) {
      setActiveModule(targetId);
    }
  };

  const resetProfessionalPath = (index) => {
    setActiveEntryPath(index);
    setHasSelectedProfessionalPath(true);
    setActiveWorkflowStep(0);
    setManualAreaBounds(null);
    setProjectLocation({
      derivedProvince: "",
      derivedProvinceCode: "",
      derivedProvinceKey: "",
      derivedProvinceName: "",
      latitude: "",
      longitude: "",
      selectionSource: "",
      validated: false,
    });
    setPath01HydraulicExposure(null);
    setPath01LandslideExposure(null);
    setPath01SeismicExposure(null);
    setPath01MitigationIntelligence(null);
    setPath01ExposureStatus("idle");
  };

  const activeWorkflowAction =
    professionalWorkflowActions[activeWorkflowStep] ||
    professionalWorkflowActions[0];
  const path01RequiresValidatedLocation = activeEntryPath === 0;
  const path01CanProceed =
    !path01RequiresValidatedLocation || path01LocationValidated;
  const professionalMapResizeSignal = [
    hasSelectedProfessionalPath ? "open" : "locked",
    activeEntryPath,
    activeWorkflowStep,
  ].join("-");

  const pathPacketRows =
    language === "it"
      ? [
          [
            "Path",
            activePath.label.replace(/^\d+\s\/\s/, ""),
          ],
          [
            activeEntryPath === 1 ? "File caricato" : "Territorio",
            activeEntryPath === 1
              ? assetSession.fileName || "-"
              : activeEntryPath === 0
                ? path01LocationValidated
                  ? projectLocation.derivedProvince
                  : `Provincial context: ${selectedProvinceProfile?.territory || "-"}`
                : manualAreaLabel,
          ],
          [
            activeEntryPath === 1 ? "Modalita" : "Contesto progetto",
            activeEntryPath === 1
              ? selectedPath02ReadingMode
              : selectedProjectContext,
          ],
          [
            "Punto progetto",
            activeEntryPath === 0
              ? path01LocationValidated
                ? `${formatExposureCoordinate(projectLocation.latitude)}, ${formatExposureCoordinate(projectLocation.longitude)}`
                : "richiesto"
              : "-",
          ],
          [
            "Scenario",
            activeScenario?.label || "-",
          ],
          [
            "Step",
            `${activeWorkflowStep + 1}/${operatingPath.length}`,
          ],
          [
            "Asset",
            `${assetRows.length} caricati / ${assetScreening.length} valutati`,
          ],
          [
            "Hazard dominante",
            activeEntryPath === 1
              ? assetAttentionSummary.dominantHazard
              : workflowHazardExposure?.dominant_hazard ||
                "-",
          ],
          [
            activeEntryPath === 1 ? "Attenzione immediata" : "Precedenti",
            activeEntryPath === 1
              ? `${assetAttentionSummary.immediate} asset`
              : `${selectedSimilarEvents.length || selectedProvinceEvents.length} disponibili`,
          ],
          [
            "Output",
            activePathOutputs[0] || activePath.output,
          ],
        ]
      : [
          [
            "Path",
            activePath.label.replace(/^\d+\s\/\s/, ""),
          ],
          [
            activeEntryPath === 1 ? "Uploaded file" : "Territory",
            activeEntryPath === 1
              ? assetSession.fileName || "-"
              : activeEntryPath === 0
                ? path01LocationValidated
                  ? projectLocation.derivedProvince
                  : `Provincial context: ${selectedProvinceProfile?.territory || "-"}`
                : manualAreaLabel,
          ],
          [
            activeEntryPath === 1 ? "Mode" : "Project context",
            activeEntryPath === 1
              ? selectedPath02ReadingMode
              : selectedProjectContext,
          ],
          [
            "Project point",
            activeEntryPath === 0
              ? path01LocationValidated
                ? `${formatExposureCoordinate(projectLocation.latitude)}, ${formatExposureCoordinate(projectLocation.longitude)}`
                : "required"
              : "-",
          ],
          [
            "Scenario",
            activeScenario?.label || "-",
          ],
          [
            "Step",
            `${activeWorkflowStep + 1}/${operatingPath.length}`,
          ],
          [
            "Assets",
            `${assetRows.length} uploaded / ${assetScreening.length} assessed`,
          ],
          [
            "Dominant hazard",
            activeEntryPath === 1
              ? assetAttentionSummary.dominantHazard
              : workflowHazardExposure?.dominant_hazard ||
                "-",
          ],
          [
            activeEntryPath === 1
              ? "Immediate attention"
              : language === "it"
                ? "Casi mappa/appendice"
                : "Map/appendix cases",
            activeEntryPath === 1
              ? `${assetAttentionSummary.immediate} assets`
              : `${
                  selectedSimilarEvents.length ||
                  Math.min(5, selectedProvinceEvents.length)
                } ${
                  language === "it" ? "selezionati su" : "selected of"
                } ${workflowEvents.length}`,
          ],
          [
            "Output",
            activePathOutputs[0] || activePath.output,
          ],
        ];

  const renderWorkflowStepPanel = () => {
    if (!activeWorkflowAction) {
      return null;
    }

    if (activeEntryPath === 1 && activeWorkflowStep === 0) {
      return (
        <div className="platform-workflow-panel">
          <div>
            <span>{activeWorkflowAction.stage}</span>
            <h3>{activeWorkflowAction.title}</h3>
            <p>{activeWorkflowAction.text}</p>
          </div>

          <div className="platform-inline-actions">
            <button
              onClick={downloadAssetTemplate}
              type="button"
            >
              {copy.assetTemplate}
            </button>
            <label>
              {copy.assetUpload}
              <input
                accept=".csv,.xls,.html,text/csv,application/vnd.ms-excel"
                onChange={handleAssetUpload}
                type="file"
              />
            </label>
          </div>

          {assetError && (
            <p className="platform-form-error">
              {assetError}
            </p>
          )}

          <div className="platform-workflow-output-header">
            {language === "it" ? "ARCUS mostra" : "ARCUS shows"}
          </div>

          <div className="platform-workflow-evidence">
            <article>
              <span>
                {language === "it"
                  ? "Qualita inventario"
                  : "Inventory quality"}
              </span>
              <strong>{assetInventoryAudit.score}</strong>
              <p>
                {language === "it"
                  ? "readiness score"
                  : "readiness score"}
              </p>
            </article>

            <article>
              <span>
                {language === "it"
                  ? "Asset caricati"
                  : "Uploaded assets"}
              </span>
              <strong>{assetRows.length}</strong>
              <p>
                {language === "it"
                  ? "nel tuo inventario"
                  : "in your inventory"}
              </p>
            </article>

            <article>
              <span>
                {language === "it"
                  ? "Dataset ARCUS"
                  : "ARCUS dataset"}
              </span>
              <strong>{events.length}</strong>
              <p>
                {language === "it"
                  ? "eventi per confronto"
                  : "events for comparison"}
              </p>
            </article>

            <article>
              <span>
                {language === "it"
                  ? "Fonti documentali"
                  : "Documentary sources"}
              </span>
              <strong>{sources.length}</strong>
              <p>
                {language === "it"
                  ? "nella base dati"
                  : "in the database"}
              </p>
            </article>
          </div>
        </div>
      );
    }

    if (activeEntryPath === 2 && activeWorkflowStep === 0) {
      return (
        <div className="platform-workflow-panel">
          <div>
            <span>{activeWorkflowAction.stage}</span>
            <h3>{activeWorkflowAction.title}</h3>
            <p>{activeWorkflowAction.text}</p>
          </div>

          <div className="platform-scenario-options">
            {scenarios
              .filter((item) =>
                [
                  "hydraulic",
                  "landslide",
                  "earthquake",
                  "baseline",
                ].includes(item.value)
              )
              .map((item) => (
                <button
                  className={
                    scenario === item.value
                      ? "active"
                      : ""
                  }
                  key={item.value}
                  onClick={() =>
                    setScenario(item.value)
                  }
                  type="button"
                >
                  {item.label}
                </button>
              ))}
          </div>

          <div className="platform-workflow-output-header">
            {language === "it" ? "ARCUS mostra" : "ARCUS shows"}
          </div>

          <div className="platform-workflow-evidence">
            <article>
              <span>
                {language === "it"
                  ? "Scenario attivo"
                  : "Active scenario"}
              </span>
              <strong
                style={{
                  fontSize: "18px",
                  lineHeight: "1.2",
                  marginTop: "10px",
                }}
              >
                {activeScenario?.label || "-"}
              </strong>
              <p>
                {language === "it"
                  ? "tipo di evento analizzato"
                  : "event type analyzed"}
              </p>
            </article>

            <article>
              <span>
                {language === "it"
                  ? "Hazard dominante"
                  : "Dominant hazard"}
              </span>
              <strong>
                {workflowHazardExposure?.dominant_hazard ||
                  "-"}
              </strong>
              <p>
                {language === "it"
                  ? "nel database ARCUS"
                  : "in ARCUS database"}
              </p>
            </article>

            <article>
              <span>
                {language === "it"
                  ? "Copertura eventi"
                  : "Event coverage"}
              </span>
              <strong>{events.length}</strong>
              <p>
                {language === "it"
                  ? "eventi totali ARCUS"
                  : "total ARCUS events"}
              </p>
            </article>
          </div>
        </div>
      );
    }

    if (activeEntryPath === 4 && activeWorkflowStep === 0) {
      return (
        <div className="platform-workflow-panel">
          <div>
            <span>{activeWorkflowAction.stage}</span>
            <h3>{activeWorkflowAction.title}</h3>
            <p>{activeWorkflowAction.text}</p>
          </div>

          <label className="platform-query-field">
            {language === "it"
              ? "Query di ricerca"
              : "Research query"}
            <input
              onChange={(event) =>
                setResearchQuery(event.target.value)
              }
              placeholder={
                language === "it"
                  ? "es. collassi idraulici su ponti in calcestruzzo dopo il 1990"
                  : "e.g. hydraulic collapses on concrete bridges after 1990"
              }
              type="text"
              value={researchQuery}
            />
          </label>

          <div className="platform-workflow-output-header">
            {language === "it" ? "ARCUS mostra" : "ARCUS shows"}
          </div>

          <div className="platform-workflow-evidence">
            <article>
              <span>Dataset</span>
              <strong>{events.length}</strong>
              <p>
                {language === "it"
                  ? "eventi ARCUS interrogabili"
                  : "queryable ARCUS events"}
              </p>
            </article>
            <article>
              <span>Sources</span>
              <strong>{sources.length}</strong>
              <p>
                {language === "it"
                  ? "fonti documentali"
                  : "documentary sources"}
              </p>
            </article>
          </div>
        </div>
      );
    }

    if (activeWorkflowStep === 0) {
      return (
        <div className="platform-workflow-panel">
          <div>
            <span>{activeWorkflowAction.stage}</span>
            <h3>{activeWorkflowAction.title}</h3>
            <p>{activeWorkflowAction.text}</p>
          </div>

            <div className="platform-field-grid">
              <label>
                {language === "it"
                  ? activeEntryPath === 0
                  ? "Provincia"
                  : "Area di lavoro"
                : activeEntryPath === 0
                  ? "Province"
                  : "Working area"}
              <select
                onChange={(event) =>
                  activeEntryPath === 0
                    ? clearProjectLocationForProvinceChange(
                        event.target.value
                      )
                    : setSelectedProvince(event.target.value)
                }
                value={
                  activeEntryPath === 0
                    ? selectedProvinceRegistryItem?.code || ""
                    : selectedProvinceProfile?.territory || ""
                }
              >
                {activeEntryPath === 0
                  ? provinceRegistry.map((province) => (
                      <option
                        key={province.code}
                        value={province.code}
                      >
                        {cleanDisplayText(province.name)}
                      </option>
                    ))
                  : alphabeticalProvinceProfiles.map((profile) => (
                      <option
                        key={profile.territory}
                        value={profile.territory}
                      >
                        {cleanDisplayText(profile.territory)}
                      </option>
                    ))}
              </select>
            </label>

            <div>
              <b>
                {language === "it"
                  ? activeEntryPath !== 0 && manualAreaBounds
                    ? "Area manuale"
                    : path01LocationValidated
                      ? "Provincia derivata dal punto"
                      : "Provincial context"
                  : activeEntryPath !== 0 && manualAreaBounds
                    ? "Manual area"
                    : path01LocationValidated
                      ? "Point-derived province"
                      : "Provincial context"}
              </b>
              <strong>
                {activeEntryPath !== 0 && manualAreaBounds
                  ? manualAreaEvents.length
                  : workflowEvents.length}
              </strong>
              <em>
                {activeEntryPath !== 0 && manualAreaBounds
                  ? manualAreaLabel
                  : language === "it"
                    ? "eventi ARCUS nel perimetro"
                    : "ARCUS events in scope"}
              </em>
            </div>
          </div>

          <div className="platform-map-selection-tools">
            <p>
              {activeEntryPath === 0
                ? language === "it"
                  ? "La provincia qui e solo contesto preliminare. Il report si sblocca quando selezioni un punto progetto validato dentro una provincia italiana."
                  : "The province here is preliminary context only. The report unlocks after you select a validated project point inside an Italian province."
                : language === "it"
                  ? "Trascina il mouse sulla mappa per disegnare un'area di analisi. ARCUS usera i crolli dentro il rettangolo e, se intercetta piu province, le riportera nel report finale."
                  : "Drag on the map to draw an analysis area. ARCUS will use collapses inside the rectangle and, if it crosses multiple provinces, include them in the final report."}
            </p>
            {activeEntryPath !== 0 && manualAreaBounds && (
              <button
                onClick={() => setManualAreaBounds(null)}
                type="button"
              >
                {language === "it"
                  ? "Cancella area"
                  : "Clear area"}
              </button>
            )}
          </div>

          <div className="platform-workflow-map">
            <CollapseMap
              filteredEvents={
                activeEntryPath !== 0 && manualAreaBounds
                  ? manualAreaEvents
                  : selectedProvinceEvents
              }
              height="300px"
              onPointSelect={
                activeEntryPath === 0
                  ? (point) =>
                      commitProjectLocation(
                        point.latitude,
                        point.longitude,
                        "map"
                      )
                  : undefined
              }
              onSelectionBoundsChange={
                activeEntryPath === 0
                  ? undefined
                  : setManualAreaBounds
              }
              selectedPoint={
                activeEntryPath === 0 &&
                Number.isFinite(Number(projectLocation.latitude)) &&
                Number.isFinite(Number(projectLocation.longitude))
                  ? projectLocation
                  : null
              }
              selectionBounds={
                activeEntryPath === 0
                  ? null
                  : manualAreaBounds
              }
              selectionEnabled={activeEntryPath !== 0}
              selectionLabel={manualAreaLabel}
              resizeSignal={professionalMapResizeSignal}
              sidebarOpen={false}
              showEventMarkers
              showHeatmap
              sourcesByEvent={sourcesByEventMap}
            />
          </div>

          {activeEntryPath === 0 && (
            <div className="platform-official-exposure">
              <div>
                <span>Project location</span>
                <strong>
                  {path01LocationValidated
                    ? projectLocation.derivedProvince
                    : language === "it"
                      ? "Punto richiesto"
                      : "Point required"}
                </strong>
                <p>
                  {projectLocationStatusMessage()}
                </p>
              </div>

              <div className="platform-coordinate-query">
                <label>
                  Latitude
                  <input
                    onChange={(event) => {
                      setPath01HydraulicExposure(null);
                      setPath01LandslideExposure(null);
                      setPath01SeismicExposure(null);
                      setPath01MitigationIntelligence(null);
                      setPath01ExposureStatus("idle");
                      setProjectLocation((current) => ({
                        ...current,
                        derivedProvince: "",
                        derivedProvinceCode: "",
                        derivedProvinceKey: "",
                        derivedProvinceName: "",
                        error: "",
                        latitude: event.target.value,
                        selectionSource: "manual",
                        validated: false,
                      }));
                    }}
                    placeholder="45.07030"
                    type="number"
                    value={formatExposureCoordinate(
                      activePath01ExposurePoint.latitude
                    )}
                  />
                </label>
                <label>
                  Longitude
                  <input
                    onChange={(event) => {
                      setPath01HydraulicExposure(null);
                      setPath01LandslideExposure(null);
                      setPath01SeismicExposure(null);
                      setPath01MitigationIntelligence(null);
                      setPath01ExposureStatus("idle");
                      setProjectLocation((current) => ({
                        ...current,
                        derivedProvince: "",
                        derivedProvinceCode: "",
                        derivedProvinceKey: "",
                        derivedProvinceName: "",
                        error: "",
                        longitude: event.target.value,
                        selectionSource: "manual",
                        validated: false,
                      }));
                    }}
                    placeholder="7.68690"
                    type="number"
                    value={formatExposureCoordinate(
                      activePath01ExposurePoint.longitude
                    )}
                  />
                </label>
                <button
                  disabled={
                    path01ExposureStatus === "loading" ||
                    provinceGeometryStatus === "loading"
                  }
                  onClick={() =>
                    commitProjectLocation(
                      activePath01ExposurePoint.latitude,
                      activePath01ExposurePoint.longitude,
                      "manual"
                    )
                  }
                  type="button"
                >
                  {path01ExposureStatus === "loading"
                    ? language === "it"
                      ? "Interrogo ISPRA"
                      : "Querying ISPRA"
                    : language === "it"
                      ? "Verifica punto"
                      : "Check point"}
                </button>
              </div>

              <div className="platform-project-location-grid">
                <article>
                  <span>Latitude</span>
                  <strong>
                    {formatExposureCoordinate(projectLocation.latitude) || "-"}
                  </strong>
                </article>
                <article>
                  <span>Longitude</span>
                  <strong>
                    {formatExposureCoordinate(projectLocation.longitude) || "-"}
                  </strong>
                </article>
                <article>
                  <span>
                    {language === "it"
                      ? "Provincia derivata"
                      : "Derived province"}
                  </span>
                  <strong>
                    {projectLocation.derivedProvince || "-"}
                  </strong>
                </article>
                <article>
                  <span>
                    {language === "it"
                      ? "Codice provincia"
                      : "Province code"}
                  </span>
                  <strong>{selectedProvinceCode || "-"}</strong>
                </article>
                <article>
                  <span>Municipality</span>
                  <strong>-</strong>
                </article>
              </div>

              <div className="platform-exposure-split">
                <article>
                  <span>Hydraulic hazard</span>
                  <strong>
                    {hydraulicExposureLabel(path01HydraulicExposure)}
                  </strong>
                  <p>
                    {hydraulicPartialExplanation(path01HydraulicExposure) ||
                      (language === "it"
                        ? "Dato WFS ISPRA P1/P2/P3 riferito al punto progetto. Non entra ancora nel Final Priority Index."
                        : "ISPRA P1/P2/P3 WFS data for the project point. It is not yet used in the Final Priority Index.")}
                  </p>
                  <div className="platform-exposure-summary">
                    <span>
                      {language === "it" ? "Esito" : "Outcome"}:{" "}
                      {exposureStatusLabel(
                        path01HydraulicExposure,
                        language
                      )}
                    </span>
                    <span>
                      {language === "it"
                        ? "Classi attribuite al punto"
                        : "Classes assigned to the point"}
                      :{" "}
                      {path01HydraulicExposure?.matched_classes?.length
                        ? path01HydraulicExposure.matched_classes.join(", ")
                        : path01HydraulicExposure
                          ? language === "it"
                            ? "nessuna"
                            : "none"
                          : "-"}
                    </span>
                    {hasNearbyOfficialContext(path01HydraulicExposure) ? (
                      <span className="platform-exposure-context">
                        {nearbyContextLabel(
                          path01HydraulicExposure,
                          language
                        )}
                      </span>
                    ) : null}
                    <span>
                      {language === "it" ? "Ruolo" : "Role"}:{" "}
                      {language === "it"
                        ? "informativo; non modifica il Final Priority Index"
                        : "informational; does not modify the Final Priority Index"}
                    </span>
                  </div>
                  <details className="platform-exposure-details">
                    <summary>
                      {language === "it"
                        ? "Dettagli tecnici e provenienza"
                        : "Technical details and provenance"}
                    </summary>
                    <div className="platform-exposure-meta">
                      <span>
                        Internal status:{" "}
                        {path01HydraulicExposure?.presentation_status ||
                          path01HydraulicExposure?.status ||
                          "-"}
                      </span>
                      <span>
                        Assessment:{" "}
                        {assessmentStatusLabel(
                          path01HydraulicExposure,
                          language
                        )}
                      </span>
                      <span>
                        Source:{" "}
                        {path01HydraulicExposure?.source
                          ? `${path01HydraulicExposure.source.provider} ${path01HydraulicExposure.source.service_type}`
                          : "ISPRA WFS"}
                      </span>
                      <span>
                        Observation mode:{" "}
                        {path01HydraulicExposure?.source?.observation_mode ||
                          "-"}
                      </span>
                      <span>
                        Freshness:{" "}
                        {path01HydraulicExposure?.source?.freshness_status ||
                          "-"}
                      </span>
                      <span>
                        Observed at:{" "}
                        {path01HydraulicExposure?.source?.observed_at || "-"}
                      </span>
                      <span>
                        Live provider:{" "}
                        {liveProviderStatusLabel(
                          path01HydraulicExposure,
                          language
                        )}
                      </span>
                      <span>
                        Query timestamp:{" "}
                        {path01HydraulicExposure?.source?.queried_at ||
                          path01HydraulicExposure?.attempted_at ||
                          "-"}
                      </span>
                      {hasNearbyOfficialContext(path01HydraulicExposure) ? (
                        <span>
                          Layer query: P1, P2, P3{" "}
                          {language === "it" ? "completata" : "completed"}
                        </span>
                      ) : (
                        hydraulicLayerStatusItems(path01HydraulicExposure).map(
                          (layer) => (
                            <span key={`${layer.className}-${layer.status}`}>
                              {layer.className}: {layer.status}
                              {layer.failed ? " - failed" : ""}
                            </span>
                          )
                        )
                      )}
                      {path01HydraulicExposure?.source
                        ?.last_known_good_layers?.length ? (
                          <span>
                            Last known good only:{" "}
                            {path01HydraulicExposure.source
                              .last_known_good_layers
                              .map(
                                (layer) =>
                                  `${layer.class_name} (${layer.status}, ${layer.freshness_status})`
                              )
                              .join(", ")}
                          </span>
                        ) : null}
                      <span>Normalized score: not assigned</span>
                    </div>
                  </details>
                </article>

                <article>
                  <span>Landslide hazard - ISPRA PAI</span>
                  <strong>
                    {landslideExposureLabel(path01LandslideExposure)}
                  </strong>
                  <p>
                    {landslideCompletenessExplanation(
                      path01LandslideExposure
                    ) ||
                      (language === "it"
                        ? "Mosaicatura PAI ISPRA v. 5.0 - 2024 al punto progetto. AA e riportata separatamente; nessun punteggio e assegnato."
                        : "ISPRA PAI mosaic v. 5.0 - 2024 at the project point. AA is reported separately; no score is assigned.")}
                  </p>
                  <div className="platform-exposure-summary">
                    <span>
                      {language === "it" ? "Esito" : "Outcome"}:{" "}
                      {exposureStatusLabel(
                        path01LandslideExposure,
                        language
                      )}
                    </span>
                    <span>
                      {language === "it"
                        ? "Classi attribuite al punto"
                        : "Classes assigned to the point"}
                      :{" "}
                      {path01LandslideExposure?.matched_hazard_classes?.length
                        ? path01LandslideExposure.matched_hazard_classes.join(
                            ", "
                          )
                        : path01LandslideExposure?.attention_area
                          ? path01LandslideExposure.matched_attention_classes?.join(
                              ", "
                            ) || "AA"
                          : path01LandslideExposure
                            ? language === "it"
                              ? "nessuna"
                              : "none"
                            : "-"}
                    </span>
                    {hasNearbyOfficialContext(path01LandslideExposure) ? (
                      <span className="platform-exposure-context">
                        {nearbyContextLabel(
                          path01LandslideExposure,
                          language
                        )}
                      </span>
                    ) : null}
                    <span>
                      {language === "it" ? "Ruolo" : "Role"}:{" "}
                      {language === "it"
                        ? "informativo; nessun punteggio normalizzato assegnato"
                        : "informational; no normalized score assigned"}
                    </span>
                  </div>
                  <details className="platform-exposure-details">
                    <summary>
                      {language === "it"
                        ? "Dettagli tecnici e provenienza"
                        : "Technical details and provenance"}
                    </summary>
                    <div className="platform-exposure-meta">
                      <span>
                        Internal status:{" "}
                        {path01LandslideExposure?.presentation_status ||
                          path01LandslideExposure?.status ||
                          "-"}
                      </span>
                      <span>
                        Assessment:{" "}
                        {assessmentStatusLabel(
                          path01LandslideExposure,
                          language
                        )}
                      </span>
                      <span>
                        Source:{" "}
                        {path01LandslideExposure?.source
                          ? `${path01LandslideExposure.source.provider} ${path01LandslideExposure.source.service_type}`
                          : "ISPRA PAI WFS"}
                      </span>
                      <span>
                        Version:{" "}
                        {path01LandslideExposure?.source
                          ?.source_dataset_version
                          ? `v. ${path01LandslideExposure.source.source_dataset_version} - ${path01LandslideExposure.source.source_reference_year}`
                          : "-"}
                      </span>
                      <span>
                        Observation mode:{" "}
                        {path01LandslideExposure?.source?.observation_mode ||
                          "-"}
                      </span>
                      <span>
                        Freshness:{" "}
                        {path01LandslideExposure?.source?.freshness_status ||
                          "-"}
                      </span>
                      <span>
                        Observed at:{" "}
                        {path01LandslideExposure?.source?.observed_at || "-"}
                      </span>
                      <span>
                        Live provider:{" "}
                        {liveProviderStatusLabel(
                          path01LandslideExposure,
                          language
                        )}
                      </span>
                      <span>
                        Query timestamp:{" "}
                        {path01LandslideExposure?.source?.queried_at ||
                          path01LandslideExposure?.attempted_at ||
                          "-"}
                      </span>
                      <span>
                        Attention area:{" "}
                        {path01LandslideExposure?.attention_area
                          ? path01LandslideExposure.matched_attention_classes?.join(
                              ", "
                            ) || "AA"
                          : "No"}
                      </span>
                      <span>
                        Analysis mode:{" "}
                        {analysisModeLabel(
                          path01LandslideExposure,
                          language
                        )}
                      </span>
                      {path01LandslideExposure?.source
                        ?.last_known_good_layers?.length ? (
                        <span>
                          Last known good only:{" "}
                          {path01LandslideExposure.source
                            .last_known_good_layers
                            .map(
                              (layer) =>
                                `${[
                                  ...(layer.matched_hazard_classes || []),
                                  ...(layer.matched_attention_classes || []),
                                ].join(", ") || "no intersection"} (${layer.status}, ${layer.freshness_status})`
                            )
                            .join(", ")}
                        </span>
                      ) : null}
                      <span>Normalized score: not assigned</span>
                    </div>
                  </details>
                </article>

                <article>
                  <span>Seismic hazard - INGV MPS04</span>
                  <strong>
                    {seismicExposureLabel(path01SeismicExposure)}
                  </strong>
                  <p>
                    {language === "it"
                      ? "PGA mediana MPS04, probabilita di superamento 10% in 50 anni, su suolo di riferimento del modello. Non e probabilita di collasso e non entra nel Final Priority Index."
                      : "MPS04 median PGA, 10% probability of exceedance in 50 years, on the model reference ground. It is not collapse probability and is not used in the Final Priority Index."}
                  </p>
                  <div className="platform-exposure-meta">
                    <span>
                      Status:{" "}
                      {path01SeismicExposure?.status ||
                        (language === "it"
                          ? "punto non selezionato"
                          : "point not selected")}
                    </span>
                    <span>Model: {path01SeismicExposure?.model || "MPS04"}</span>
                    <span>
                      Role:{" "}
                      {path01SeismicExposure?.model_role ||
                        "reference_regulatory_model"}
                    </span>
                    <span>
                      PGA median:{" "}
                      {hasSeismicPga(path01SeismicExposure)
                        ? `${Number(path01SeismicExposure.pga_p50_g).toFixed(3)} g`
                        : "-"}
                    </span>
                    <span>
                      Probability:{" "}
                      {path01SeismicExposure?.probability_of_exceedance_50_years ||
                        10}
                      % in 50 years
                    </span>
                    <span>
                      Percentile: {path01SeismicExposure?.percentile || 50}th
                    </span>
                    <span>
                      Reference ground:{" "}
                      {path01SeismicExposure?.reference_ground_condition ||
                        path01SeismicExposure?.source?.reference_ground_condition ||
                        "-"}
                    </span>
                    <span>
                      Sampling:{" "}
                      {path01SeismicExposure?.sampling_method ||
                        "nearest_grid_node"}
                    </span>
                    <span>
                      Nearest node distance:{" "}
                      {Number.isFinite(
                        Number(path01SeismicExposure?.nearest_node?.distance_m)
                      )
                        ? `${Math.round(path01SeismicExposure.nearest_node.distance_m)} m`
                        : "-"}
                    </span>
                    <span>
                      Dataset:{" "}
                      {path01SeismicExposure?.source?.source_dataset_version ||
                        "MPS04-OPCM3519"}
                    </span>
                    <span>
                      Source:{" "}
                      {path01SeismicExposure?.source
                        ? `${path01SeismicExposure.source.provider} ${path01SeismicExposure.source.service_type}`
                        : "INGV local_grid"}
                    </span>
                    <span>
                      Timestamp:{" "}
                      {path01SeismicExposure?.source?.queried_at ||
                        path01SeismicExposure?.attempted_at ||
                        "-"}
                    </span>
                    <span>Normalized score: not assigned</span>
                  </div>
                </article>

                <article>
                  <span>
                    {language === "it"
                      ? "Contesto storico provinciale"
                      : "Provincial historical context"}
                  </span>
                  <strong>{workflowEvents.length}</strong>
                  <p>
                    {language === "it"
                      ? "Collassi ARCUS, Historical Collapse Incidence e denominatore ponti restano separati dal dato ufficiale del punto."
                      : "ARCUS collapses, Historical Collapse Incidence and bridge denominator remain separate from the official point exposure."}
                  </p>
                  <div className="platform-exposure-meta">
                    <span>
                      ARCUS collapses: {workflowEvents.length}
                    </span>
                    <span>
                      Index numerator: {selectedCollapseRateNumerator}
                    </span>
                    {!selectedProvinceHasArcusProfile && (
                      <span>
                        {language === "it"
                          ? "No documented cases in the current ARCUS release. This does not imply absence of territorial hazard."
                          : "No documented cases in the current ARCUS release. This does not imply absence of territorial hazard."}
                      </span>
                    )}
                    <span>
                      Historical Collapse Incidence:{" "}
                      {selectedCollapseRateMultiplier}
                    </span>
                    <span>
                      Provincial rate: {selectedCollapseRatePer100}
                    </span>
                    <span>
                      National reference:{" "}
                      {selectedCollapseRateNationalReference}
                    </span>
                    <span>
                      Denominator:{" "}
                      {selectedAinopProvinceIndex?.ainop_bridges_total ||
                        "N/A"}
                    </span>
                    <span>
                      Dataset: {selectedCollapseRateDatasetVersion}
                    </span>
                    <span>
                      Data updated through:{" "}
                      {selectedCollapseRateDataCutoff}
                    </span>
                    <span>
                      Latest included event:{" "}
                      {selectedCollapseRateLatestEventDate}
                    </span>
                    <span>
                      Latest included year:{" "}
                      {selectedCollapseRateIncludedYearMax}
                    </span>
                    <span>
                      Denominator confidence:{" "}
                      {selectedCollapseRateConfidence}
                    </span>
                  </div>
                </article>
              </div>
            </div>
          )}

          <div className="platform-workflow-output-header">
            {language === "it" ? "ARCUS mostra" : "ARCUS shows"}
          </div>

          <div className="platform-workflow-evidence">
            <article>
              <span>
                {language === "it"
                  ? activeEntryPath === 0
                    ? "Crolli nella provincia"
                    : "Crolli nell'area"
                  : activeEntryPath === 0
                    ? "Province collapses"
                    : "Area collapses"}
              </span>
              <strong>{workflowEvents.length}</strong>
              <p>
                {language === "it"
                  ? "eventi storici ARCUS"
                  : "ARCUS historical events"}
              </p>
            </article>

            <article>
              <span>
                {language === "it"
                  ? "Causa dominante"
                  : "Top cause"}
              </span>
              <strong>
                {selectedProvinceDrivers.causes[0]?.value ||
                  0}
              </strong>
              <p>
                {selectedProvinceDrivers.causes[0]?.label ||
                  "-"}
              </p>
            </article>

            <article>
              <span>
                {language === "it"
                  ? "Layer hazard"
                  : "Hazard layers"}
              </span>
              <strong>{externalLayers.length}</strong>
              <p>
                {language === "it"
                  ? "overlay pubblici dichiarati"
                  : "declared public overlays"}
              </p>
            </article>

            <article>
              <span>
                {language === "it"
                  ? "Copertura patrimonio"
                  : "Asset denominator"}
              </span>
              <strong>
                {selectedAinopProvinceIndex?.ainop_bridges_total ||
                  "N/A"}
              </strong>
              <p>
                {language === "it"
                  ? "ponti censiti AINOP"
                  : "AINOP counted bridges"}
              </p>
            </article>
          </div>
        </div>
      );
    }

    if (activeWorkflowStep === 1) {
      if (activeEntryPath === 0) {
        return (
          <div className="platform-workflow-panel">
            <div>
              <span>{activeWorkflowAction.stage}</span>
              <h3>{activeWorkflowAction.title}</h3>
              <p>{activeWorkflowAction.text}</p>
            </div>

            <div className="platform-context-summary">
              <span>
                {language === "it"
                  ? "Conferma contesto"
                  : "Context confirmation"}
              </span>
              <strong>{selectedPath01Intent.label}</strong>
              <p>
                {language === "it"
                  ? "ARCUS produce una sola lettura territoriale basata su evidenza storica, hazard e priorita di approfondimento."
                  : "ARCUS produces one territorial reading based on historical evidence, hazards and follow-up priorities."}
              </p>
            </div>

            <div className="platform-workflow-output-header">
              {language === "it" ? "ARCUS mostra" : "ARCUS shows"}
            </div>

            <div className="platform-workflow-evidence">
              <article>
                <span>
                  {language === "it" ? "Provincia" : "Province"}
                </span>
                <strong>
                  {selectedProvinceProfile?.total || 0}
                </strong>
                <p>
                  {selectedProvinceProfile?.territory}
                </p>
              </article>

              <article>
                <span>
                  {language === "it"
                    ? "Configurazione output"
                    : "Output configuration"}
                </span>
                <strong
                  style={{
                    fontSize: "18px",
                    lineHeight: "1.2",
                    marginTop: "10px",
                  }}
                >
                  {selectedPath01Intent.label}
                </strong>
                <p>
                  {language === "it"
                    ? "cambia il linguaggio del report"
                    : "changes report language"}
                </p>
              </article>

              <article>
                <span>
                  {language === "it"
                    ? "Cause confrontabili"
                    : "Comparable causes"}
                </span>
                <strong>
                  {selectedProvinceDrivers.causes.length}
                </strong>
                <p>
                  {language === "it"
                    ? "meccanismi nel contesto"
                    : "mechanisms in context"}
                </p>
              </article>

              <article>
                <span>
                  {language === "it"
                    ? "Fonti documentate"
                    : "Documented sources"}
                </span>
                <strong>
                  {workflowEvents.reduce(
                    (total, event) =>
                      total +
                      (sourcesByEventMap[event.event_id]
                        ?.length || 0),
                    0
                  )}
                </strong>
                <p>
                  {language === "it"
                    ? "per la provincia selezionata"
                    : "for the selected province"}
                </p>
              </article>
            </div>
          </div>
        );
      }

      if (activeEntryPath === 1) {
        return (
          <div className="platform-workflow-panel">
            <div>
              <span>{activeWorkflowAction.stage}</span>
              <h3>{activeWorkflowAction.title}</h3>
              <p>{activeWorkflowAction.text}</p>
            </div>

            <div className="platform-context-summary">
              <span>
                {language === "it"
                  ? "Conferma contesto"
                  : "Context confirmation"}
              </span>
              <strong>{selectedPath02ReadingMode}</strong>
              <p>
                {language === "it"
                  ? "ARCUS produrra una sola lettura del patrimonio. Il contesto d'uso e stato dichiarato nello step di upload e orienta il formato del report."
                  : "ARCUS will produce one asset-stock reading. The use context was declared during upload and frames the report format."}
              </p>
            </div>

            <div className="platform-workflow-output-header">
              {language === "it" ? "ARCUS mostra" : "ARCUS shows"}
            </div>

            <div className="platform-workflow-evidence">
              <article>
                <span>
                  {language === "it"
                    ? "Record validi"
                    : "Valid records"}
                </span>
                <strong>{assetScreening.length}</strong>
                <p>
                  {language === "it"
                    ? "entrano nello scoring"
                    : "enter scoring"}
                </p>
              </article>
              <article>
                <span>
                  {language === "it"
                    ? "Record bloccati"
                    : "Blocked records"}
                </span>
                <strong>{assetInventoryAudit.blocked}</strong>
                <p>
                  {language === "it"
                    ? "campi obbligatori mancanti"
                    : "missing required fields"}
                </p>
              </article>
              <article>
                <span>
                  {language === "it"
                    ? "Avvisi"
                    : "Warnings"}
                </span>
                <strong>{assetInventoryAudit.warnings}</strong>
                <p>
                  {language === "it"
                    ? "province da verificare"
                    : "provinces to verify"}
                </p>
              </article>
            </div>
          </div>
        );
      }

      if (activeEntryPath === 2) {
        return (
          <div className="platform-workflow-panel">
            <div>
              <span>{activeWorkflowAction.stage}</span>
              <h3>{activeWorkflowAction.title}</h3>
              <p>{activeWorkflowAction.text}</p>
            </div>

            <div className="platform-map-selection-tools">
              <p>
                {language === "it"
                  ? "Trascina il mouse sulla mappa per definire l'area o il corridoio di scenario."
                  : "Drag on the map to define the scenario area or corridor."}
              </p>
              {manualAreaBounds && (
                <button
                  onClick={() =>
                    setManualAreaBounds(null)
                  }
                  type="button"
                >
                  {language === "it"
                    ? "Cancella area"
                    : "Clear area"}
                </button>
              )}
            </div>

            <div className="platform-workflow-map">
              <CollapseMap
                filteredEvents={
                  manualAreaBounds
                    ? manualAreaEvents
                    : selectedProvinceEvents
                }
                height="360px"
                onSelectionBoundsChange={
                  setManualAreaBounds
                }
                selectionBounds={manualAreaBounds}
                selectionEnabled
                selectionLabel={manualAreaLabel}
                resizeSignal={professionalMapResizeSignal}
                sidebarOpen={false}
                showEventMarkers
                showHeatmap
                sourcesByEvent={sourcesByEventMap}
              />
            </div>

            <div className="platform-workflow-output-header">
              {language === "it" ? "ARCUS mostra" : "ARCUS shows"}
            </div>

            <div className="platform-workflow-evidence">
              <article>
                <span>
                  {language === "it"
                    ? "Crolli nell'area"
                    : "Area collapses"}
                </span>
                <strong>
                  {manualAreaBounds
                    ? manualAreaEvents.length
                    : workflowEvents.length}
                </strong>
                <p>
                  {language === "it"
                    ? "eventi nello scenario"
                    : "events in scenario"}
                </p>
              </article>

              <article>
                <span>
                  {language === "it"
                    ? "Scenario"
                    : "Scenario"}
                </span>
                <strong
                  style={{
                    fontSize: "18px",
                    lineHeight: "1.2",
                    marginTop: "10px",
                  }}
                >
                  {activeScenario?.label || "-"}
                </strong>
                <p>
                  {language === "it"
                    ? "tipo di analisi"
                    : "analysis type"}
                </p>
              </article>

              <article>
                <span>
                  {language === "it"
                    ? "Hazard dominante"
                    : "Dominant hazard"}
                </span>
                <strong>
                  {workflowHazardExposure?.dominant_hazard ||
                    "-"}
                </strong>
                <p>
                  {language === "it"
                    ? "nel contesto scenario"
                    : "in scenario context"}
                </p>
              </article>
            </div>
          </div>
        );
      }

      if (activeEntryPath === 3) {
        return (
          <div className="platform-workflow-panel">
            <div>
              <span>{activeWorkflowAction.stage}</span>
              <h3>{activeWorkflowAction.title}</h3>
              <p>{activeWorkflowAction.text}</p>
            </div>

            <div className="platform-workflow-output-header">
              {language === "it" ? "ARCUS mostra" : "ARCUS shows"}
            </div>

            <div className="platform-workflow-evidence">
              {(workflowHazardExposure?.hazards || [])
                .slice(0, 4)
                .map((hazard) => (
                  <article key={hazard.label}>
                    <span>{hazard.label}</span>
                    <strong>{hazard.score}</strong>
                    <p>
                      {hazard.matched_events}{" "}
                      {language === "it"
                        ? "eventi nel contesto"
                        : "events in context"}
                    </p>
                  </article>
                ))}
            </div>
          </div>
        );
      }

      if (activeEntryPath === 4) {
        return (
          <div className="platform-workflow-panel">
            <div>
              <span>{activeWorkflowAction.stage}</span>
              <h3>{activeWorkflowAction.title}</h3>
              <p>{activeWorkflowAction.text}</p>
            </div>

            <div className="platform-workflow-output-header">
              {language === "it" ? "ARCUS mostra" : "ARCUS shows"}
            </div>

            <div className="platform-workflow-evidence">
              {causeRanking.slice(0, 4).map((item) => (
                <article key={item.label}>
                  <span>{item.label}</span>
                  <strong>{item.value}</strong>
                  <p>
                    {language === "it"
                      ? "eventi nel dataset"
                      : "events in dataset"}
                  </p>
                </article>
              ))}
            </div>
          </div>
        );
      }

      return (
        <div className="platform-workflow-panel">
          <div>
            <span>{activeWorkflowAction.stage}</span>
            <h3>{activeWorkflowAction.title}</h3>
            <p>{activeWorkflowAction.text}</p>
          </div>

          <div className="platform-scenario-options">
            {scenarios.map((item) => (
              <button
                className={
                  scenario === item.value
                    ? "active"
                    : ""
                }
                key={item.value}
                onClick={() =>
                  setScenario(item.value)
                }
                type="button"
              >
                {item.label}
              </button>
            ))}
          </div>

          <div className="platform-workflow-map">
            <CollapseMap
              assetMarkers={professionalAssetMapMarkers}
              filteredEvents={selectedProvinceEvents}
              height="340px"
              resizeSignal={professionalMapResizeSignal}
              sidebarOpen={false}
              showAssetMarkers={professionalMapLayers.assets}
              showEventMarkers={professionalMapLayers.events}
              showHeatmap={professionalMapLayers.heatmap}
              showWatchlistMarkers={
                professionalMapLayers.watchlist
              }
              sourcesByEvent={sourcesByEventMap}
              watchlistMarkers={monitoringSignals}
            />
          </div>

          <div className="platform-workflow-output-header">
            {language === "it" ? "ARCUS mostra" : "ARCUS shows"}
          </div>

          <div className="platform-workflow-evidence">
            {(workflowHazardExposure?.hazards || [])
              .slice(0, 4)
              .map((hazard) => (
                <article key={hazard.label}>
                  <span>{hazard.label}</span>
                  <strong>{hazard.score}</strong>
                  <p>
                    {hazard.matched_events}{" "}
                    {language === "it"
                      ? "eventi correlati all'asset"
                      : "events correlated to asset"}
                  </p>
                </article>
              ))}
          </div>
        </div>
      );
    }

    if (activeWorkflowStep === 2) {
      if (activeEntryPath === 0) {
        return (
          <div className="platform-workflow-panel">
            <div>
              <span>{activeWorkflowAction.stage}</span>
              <h3>{activeWorkflowAction.title}</h3>
              <p>{activeWorkflowAction.text}</p>
            </div>

            <div className="platform-territory-reading">
              <span>
                {language === "it"
                  ? "Lettura del territorio"
                  : "Territory reading"}
              </span>
              <p>{territoryReading}</p>
            </div>

            <div className="platform-workflow-map">
              <CollapseMap
                filteredEvents={workflowEvents}
                height="360px"
                professionalMode
                activeHazardOverlays={
                  activeProfessionalHazardLayers
                }
                publicWmsOverlays={
                  activeProfessionalWmsOverlays
                }
                resizeSignal={professionalMapResizeSignal}
                selectionBounds={manualAreaBounds}
                sidebarOpen={false}
                showEventMarkers
                showHeatmap
                sourcesByEvent={sourcesByEventMap}
              />
            </div>

            <div className="platform-atlas-cta">
              <div>
                <strong>
                  {language === "it"
                    ? "Esplora la mappa completa"
                    : "Explore the full map"}
                </strong>
                <p>
                  {language === "it"
                    ? "Il report include una mappa statica provinciale dei casi ARCUS. Apri Professional Atlas per il controllo interattivo dei layer e l'esplorazione nazionale."
                    : "This report includes a static provincial ARCUS cases map. Open Professional Atlas for full interactive layer control and national-scale exploration."}
                </p>
              </div>
              <a href="/atlas">
                {language === "it"
                  ? "Open in Professional Atlas"
                  : "Open in Professional Atlas"}
              </a>
            </div>

            <div className="platform-workflow-output-header">
              {language === "it" ? "ARCUS mostra" : "ARCUS shows"}
            </div>

            <div className="platform-workflow-evidence">
              {(workflowHazardExposure?.hazards || [])
                .slice(0, 4)
                .map((hazard) => (
                  <article key={hazard.label}>
                    <span>{hazard.label}</span>
                    <strong>{hazard.score}</strong>
                    <p>
                      {hazard.matched_events}{" "}
                      {language === "it"
                        ? "crolli ARCUS correlati a layer pubblici"
                        : "ARCUS collapses correlated with public layers"}
                    </p>
                  </article>
                ))}
            </div>
          </div>
        );
      }

      return (
        <div className="platform-workflow-panel">
          <div>
            <span>{activeWorkflowAction.stage}</span>
            <h3>{activeWorkflowAction.title}</h3>
            <p>{activeWorkflowAction.text}</p>
          </div>

          <div className="platform-workflow-output-header">
            {language === "it" ? "ARCUS mostra" : "ARCUS shows"}
          </div>

          <div className="platform-workflow-evidence">
            {activeEntryPath === 1
              ? [
                  [
                    language === "it"
                      ? "Attenzione immediata"
                      : "Immediate attention",
                    assetAttentionSummary.immediate,
                    language === "it"
                      ? "asset da controllare prima"
                      : "assets to check first",
                  ],
                  [
                    language === "it"
                      ? "Batch 1"
                      : "Batch 1",
                    assetAttentionSummary.batchOne,
                    language === "it"
                      ? "asset da controllare per primi"
                      : "assets to inspect first",
                  ],
                  [
                    language === "it"
                      ? "Hazard dominante"
                      : "Dominant hazard",
                    assetAttentionSummary.dominantHazard,
                    language === "it"
                      ? "nel patrimonio caricato"
                      : "in uploaded stock",
                  ],
                ].map(([label, value, text]) => (
                  <article key={label}>
                    <span>{label}</span>
                    <strong>{value}</strong>
                    <p>{text}</p>
                  </article>
                ))
              : (workflowHazardExposure?.hazards || [])
                  .slice(0, 4)
                  .map((hazard) => (
                    <article key={hazard.label}>
                      <span>{hazard.label}</span>
                      <strong>{hazard.score}</strong>
                      <p>
                        {hazard.matched_events}{" "}
                        {language === "it"
                          ? "eventi collegati"
                          : "linked events"}
                      </p>
                    </article>
                  ))}
          </div>

          {activeEntryPath === 1 && (
            <div className="platform-table">
              {assetScreening.slice(0, 4).map((asset) => (
                <article key={asset.id}>
                  <div>
                    <strong>{asset.name}</strong>
                    <span>
                      {asset.territory} -{" "}
                      {asset.hazardProfileLabel}
                    </span>
                  </div>
                  <div>
                    <b>
                      {asset.score}/{getAssetEvidenceGrade(asset)}
                    </b>
                    <span>{copy.screeningScore}</span>
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>
      );
    }

    if (activeWorkflowStep === 3) {
      // Path 0 - New Territory: Read Historical Evidence
      if (activeEntryPath === 0) {
        return (
          <div className="platform-workflow-panel">
            <div>
              <span>{activeWorkflowAction.stage}</span>
              <h3>{activeWorkflowAction.title}</h3>
              <p>{activeWorkflowAction.text}</p>
            </div>

            <div className="platform-workflow-output-header">
              {language === "it" ? "ARCUS mostra" : "ARCUS shows"}
            </div>

            <div className="platform-workflow-evidence">
              {selectedProvinceDrivers.causes
                .slice(0, 1)
                .map((item) => (
                  <article key={item.label}>
                    <span>
                      {language === "it"
                        ? "Trigger dominante"
                        : "Dominant trigger"}
                    </span>
                    <strong>
                      {percentage(
                        item.value,
                        workflowEvents.length || 1
                      )}
                      %
                    </strong>
                    <p>{item.label}</p>
                  </article>
                ))}

              <article>
                <span>
                  {language === "it"
                    ? "Pattern temporale"
                    : "Temporal pattern"}
                </span>
                <strong
                  style={{
                    fontSize: "18px",
                    lineHeight: "1.2",
                  }}
                >
                  {historicalPatternReading.type}
                </strong>
                <p>{historicalPatternReading.temporal}</p>
              </article>

              <article>
                <span>
                  {language === "it"
                    ? "Geomorfologia coinvolta"
                    : "Involved geomorphology"}
                </span>
                <strong
                  style={{
                    fontSize: "18px",
                    lineHeight: "1.2",
                  }}
                >
                  {historicalPatternReading.dominantCause}
                </strong>
                <p>{historicalPatternReading.geomorphologyHint}</p>
              </article>

              <article>
                <span>
                  {language === "it"
                    ? "Affidabilita fonti"
                    : "Evidence reliability"}
                </span>
                <strong>
                  {evidenceGradeFromScore(workflowReliability.average)} /{" "}
                  {Math.round(workflowReliability.average)}
                </strong>
                <p>
                  {workflowReliability.institutionalShare}%{" "}
                  professional-grade
                </p>
              </article>
            </div>

            <div className="platform-pattern-reading">
              <strong>
                {language === "it"
                  ? "Lettura ARCUS"
                  : "ARCUS reading"}
              </strong>
              <p>
                {language === "it"
                  ? `Il valore non e la lista dei casi: e capire se ${selectedProvinceProfile?.territory || "la provincia"} ha gia mostrato vulnerabilita concentrata in condizioni estreme o un rischio distribuito nel tempo. I casi individuali restano sulla mappa e nell'appendice del PDF.`
                  : `The value is not the case list: it is understanding whether ${selectedProvinceProfile?.territory || "the province"} has already shown concentrated vulnerability under extreme conditions or risk distributed over time. Individual cases remain on the map and in the PDF appendix.`}
              </p>
            </div>

            <div className="platform-mitigation-intelligence">
              <header>
                <div>
                  <span>
                    {language === "it"
                      ? "Mitigation intelligence"
                      : "Mitigation intelligence"}
                  </span>
                  <strong>
                    {language === "it"
                      ? "Dal dato documentato alle priorita di verifica"
                      : "From documented evidence to investigation priorities"}
                  </strong>
                </div>
                <em data-status={path01MitigationIntelligence?.status || "idle"}>
                  {(path01MitigationIntelligence?.status || "not available")
                    .replaceAll("_", " ")}
                </em>
              </header>

              {path01MitigationIntelligence?.status === "loading" && (
                <p>
                  {language === "it"
                    ? "ARCUS sta confrontando la firma ufficiale del punto con i collassi documentati."
                    : "ARCUS is comparing the official point signature with documented collapses."}
                </p>
              )}

              {path01MitigationIntelligence?.evidence_cohort
                ?.analogue_retrieval && (
                <section className="platform-analogue-cohort">
                  <div>
                    <span>
                      {language === "it"
                        ? "Base dell'evidenza"
                        : "Evidence basis"}
                    </span>
                    <strong>
                      {path01MitigationIntelligence.evidence_cohort
                        .analogue_retrieval.production_ready
                        ? language === "it"
                          ? "Analoghi nazionali per firma di pericolosita attuale"
                          : "National analogues by current hazard signature"
                        : path01MitigationIntelligence.evidence_cohort
                            .analogue_retrieval.reason ===
                          "official_hydraulic_point_intersection_required"
                          ? language === "it"
                            ? "Nessuna coorte: punto fuori dai perimetri idraulici"
                            : "No cohort: point outside hydraulic perimeters"
                        : language === "it"
                          ? "Fallback provinciale controllato"
                          : "Controlled provincial fallback"}
                    </strong>
                    <p>
                      {path01MitigationIntelligence.evidence_cohort
                        .analogue_retrieval.production_ready
                        ? language === "it"
                          ? "La provincia resta contesto locale; non limita la ricerca degli analoghi. Cause, processi e componenti vengono letti solo dopo avere fissato la coorte."
                          : "The province remains local context and does not restrict analogue retrieval. Causes, processes and components are read only after the cohort is fixed."
                        : path01MitigationIntelligence.evidence_cohort
                            .analogue_retrieval.reason ===
                          "official_hydraulic_point_intersection_required"
                          ? language === "it"
                            ? "Il retrieval nazionale non viene attivato senza una classe idraulica assegnata al punto. I casi provinciali restano solo contesto storico; la vicinanza a perimetri ufficiali non viene trasformata in intersezione."
                            : "National retrieval is not activated without a hydraulic class assigned to the point. Provincial cases remain historical context only; proximity to official perimeters is not converted into intersection."
                        : language === "it"
                          ? "Il motore nazionale resta disattivato finche le firme idrauliche ufficiali non coprono almeno l'80% del database. Nessun dato mancante viene trasformato in somiglianza."
                          : "The national engine remains disabled until official hydraulic signatures cover at least 80% of the database. Missing data is never converted into similarity."}
                    </p>
                  </div>
                  <dl>
                    <div>
                      <dt>
                        {language === "it"
                          ? "Copertura firme"
                          : "Signature coverage"}
                      </dt>
                      <dd>
                        {Math.round(
                          Number(
                            path01MitigationIntelligence.evidence_cohort
                              .analogue_retrieval
                              .hydraulic_signature_coverage_ratio || 0
                          ) * 100
                        )}
                        %
                      </dd>
                    </div>
                    <div>
                      <dt>
                        {language === "it"
                          ? "Contesto locale"
                          : "Local context"}
                      </dt>
                      <dd>
                        {path01MitigationIntelligence.evidence_cohort
                          .local_context?.total_collapse_count || 0}{" "}
                        {language === "it" ? "collassi" : "collapses"}
                      </dd>
                    </div>
                    <div>
                      <dt>
                        {language === "it"
                          ? "Analoghi recuperati"
                          : "Retrieved analogues"}
                      </dt>
                      <dd>
                        {path01MitigationIntelligence.evidence_cohort
                          .analogue_retrieval.analogues?.length || 0}
                      </dd>
                    </div>
                    <div>
                      <dt>
                        {language === "it"
                          ? "Episodi indipendenti"
                          : "Independent episodes"}
                      </dt>
                      <dd>
                        {path01MitigationIntelligence.evidence_cohort
                          .episode_count || 0}
                      </dd>
                    </div>
                    <div>
                      <dt>
                        {language === "it"
                          ? "Revisione episodi"
                          : "Episode review"}
                      </dt>
                      <dd>
                        {(path01MitigationIntelligence.evidence_cohort
                          .episode_registry_quality
                          ?.review_required_episode_count || 0) +
                          (path01MitigationIntelligence.evidence_cohort
                            .episode_registry_quality
                            ?.review_recommended_episode_count || 0)}
                      </dd>
                    </div>
                  </dl>
                  {path01MitigationIntelligence.evidence_cohort
                    .analogue_retrieval.production_ready &&
                  path01MitigationIntelligence.evidence_cohort
                    .analogue_retrieval.analogues?.length ? (
                    <ol>
                      {path01MitigationIntelligence.evidence_cohort
                        .analogue_retrieval.analogues.slice(0, 5)
                        .map((analogue) => (
                          <li key={analogue.event.event_id}>
                            <b>
                              #{analogue.retrieval_rank}{" "}
                              {analogue.event.municipality || "-"},{" "}
                              {analogue.event.province || "-"}
                            </b>
                            <span>
                              {language === "it"
                                ? "Classe idraulica attuale"
                                : "Current hydraulic class"}
                              :{" "}
                              {analogue.current_official_signature
                                ?.hydraulic?.highest_class || "-"}
                              {" · PGA Δ "}
                              {analogue.retrieval_comparison?.seismic
                                ?.pga_delta_g ?? "-"}{" "}
                              g
                            </span>
                          </li>
                        ))}
                    </ol>
                  ) : null}
                  <small>
                    {language === "it"
                      ? "La firma attuale serve alla comparabilita nazionale; non ricostruisce la pericolosita storica e non prova la causa del collasso."
                      : "The current signature supports national comparability; it does not reconstruct historical hazard or prove collapse causation."}
                  </small>
                  <small>
                    {language === "it"
                      ? `${path01MitigationIntelligence.evidence_cohort.episode_registry_quality?.curated_episode_count || 0} episodi con override curato; ${path01MitigationIntelligence.evidence_cohort.episode_registry_quality?.source_linked_episode_count || 0} supportati da fonti condivise; i raggruppamenti inferiti restano esplicitamente revisionabili.`
                      : `${path01MitigationIntelligence.evidence_cohort.episode_registry_quality?.curated_episode_count || 0} episodes with curated override; ${path01MitigationIntelligence.evidence_cohort.episode_registry_quality?.source_linked_episode_count || 0} supported by shared sources; inferred groups remain explicitly reviewable.`}
                  </small>
                  {path01MitigationIntelligence.evidence_cohort
                    .retrieval_robustness?.applied && (
                    <small>
                      {language === "it"
                        ? `Consenso retrieval 15/20/25: ${path01MitigationIntelligence.evidence_cohort.retrieval_robustness.process_support.filter((process) => process.consensus_reached).map((process) => `${process.process.replaceAll("_", " ")} (${process.qualifying_window_count}/${process.total_window_count})`).join(", ") || "nessun processo specifico"}.`
                        : `Retrieval consensus 15/20/25: ${path01MitigationIntelligence.evidence_cohort.retrieval_robustness.process_support.filter((process) => process.consensus_reached).map((process) => `${process.process.replaceAll("_", " ")} (${process.qualifying_window_count}/${process.total_window_count})`).join(", ") || "no specific process"}.`}
                    </small>
                  )}
                </section>
              )}

              {path01MitigationIntelligence?.landslide_support && (
                <section className="platform-analogue-cohort">
                  <div>
                    <span>
                      {language === "it"
                        ? "Support contract frane"
                        : "Landslide support contract"}
                    </span>
                    <strong>
                      {path01MitigationIntelligence.landslide_support.status
                        .replaceAll("_", " ")}
                    </strong>
                    <p>
                      {language === "it"
                        ? "Il motore rende esplicita l'astensione: la coorte disponibile non autorizza strategie apprese dai collassi e non assegna classi di attenzione Livello 2 o Livello 3."
                        : "The engine makes abstention explicit: the available cohort does not support collapse-learned strategies and does not assign Level 2 or Level 3 attention classes."}
                    </p>
                    <small>
                      {(path01MitigationIntelligence.landslide_support
                        .abstention_reasons || [])
                        .map((reason) => reason.replaceAll("_", " "))
                        .join("; ") ||
                        (language === "it"
                          ? "support contract non attivo"
                          : "support contract inactive")}
                    </small>
                  </div>
                  <dl>
                    <div>
                      <dt>{language === "it" ? "Casi eleggibili" : "Eligible cases"}</dt>
                      <dd>
                        {path01MitigationIntelligence.landslide_support
                          .evidence?.eligible_cases || 0}
                      </dd>
                    </div>
                    <div>
                      <dt>{language === "it" ? "Episodi" : "Episodes"}</dt>
                      <dd>
                        {path01MitigationIntelligence.landslide_support
                          .evidence?.independent_episodes || 0}
                      </dd>
                    </div>
                    <div>
                      <dt>Episode-effective</dt>
                      <dd>
                        {path01MitigationIntelligence.landslide_support
                          .evidence?.episode_effective_evidence || 0}
                      </dd>
                    </div>
                    <div>
                      <dt>{language === "it" ? "Strategie" : "Strategies"}</dt>
                      <dd>0</dd>
                    </div>
                  </dl>
                </section>
              )}

              {path01MitigationIntelligence?.seismic_support && (
                <section className="platform-analogue-cohort">
                  <div>
                    <span>
                      {language === "it"
                        ? "Support contract sismico"
                        : "Seismic support contract"}
                    </span>
                    <strong>
                      {path01MitigationIntelligence.seismic_support.status
                        .replaceAll("_", " ")}
                    </strong>
                    <p>
                      {language === "it"
                        ? "I tre casi ARCUS appartengono al terremoto dell'Aquila del 2009 e non costituiscono tre repliche indipendenti. Il motore mantiene quindi l'astensione e non assegna priorita automatiche di adeguamento sismico."
                        : "The three ARCUS cases belong to the 2009 L'Aquila earthquake and are not three independent replications. The engine therefore abstains and does not assign automatic seismic retrofit priorities."}
                    </p>
                    <small>
                      {(path01MitigationIntelligence.seismic_support
                        .abstention_reasons || [])
                        .map((reason) => reason.replaceAll("_", " "))
                        .join("; ") ||
                        (language === "it"
                          ? "support contract non attivo"
                          : "support contract inactive")}
                    </small>
                  </div>
                  <dl>
                    <div>
                      <dt>{language === "it" ? "Casi registrati" : "Registered cases"}</dt>
                      <dd>
                        {path01MitigationIntelligence.seismic_support
                          .evidence?.registered_seismic_cases || 0}
                      </dd>
                    </div>
                    <div>
                      <dt>{language === "it" ? "Casi eleggibili" : "Eligible cases"}</dt>
                      <dd>
                        {path01MitigationIntelligence.seismic_support
                          .evidence?.eligible_cases || 0}
                      </dd>
                    </div>
                    <div>
                      <dt>{language === "it" ? "Episodi" : "Episodes"}</dt>
                      <dd>
                        {path01MitigationIntelligence.seismic_support
                          .evidence?.independent_episodes || 0}
                      </dd>
                    </div>
                    <div>
                      <dt>{language === "it" ? "Strategie" : "Strategies"}</dt>
                      <dd>0</dd>
                    </div>
                  </dl>
                </section>
              )}

              {path01MitigationIntelligence?.source_completeness?.hydraulic
                ?.assessment_complete === false &&
                (path01MitigationIntelligence?.strategies || []).length > 0 && (
                  <p>
                    {language === "it"
                      ? "Strategie basate esclusivamente sui layer ISPRA che hanno risposto; i layer non completati restano una limitazione esplicita."
                      : "Strategies are based only on the ISPRA layers that responded; incomplete layers remain an explicit limitation."}
                  </p>
                )}

              {(path01MitigationIntelligence?.strategies || []).map(
                (strategy) => (
                  <article key={strategy.strategy_id}>
                    <div>
                      <span>
                        {language === "it"
                          ? `Priorita ${strategy.priority_order}`
                          : `Priority ${strategy.priority_order}`}
                      </span>
                      <strong>
                        {strategy.investigation_priority?.[language] ||
                          strategy.investigation_priority?.en ||
                          strategy.strategy_id}
                      </strong>
                      <p>
                        {strategy.purpose?.[language] ||
                          strategy.purpose?.en}
                      </p>
                    </div>
                    <dl>
                      <div>
                        <dt>{language === "it" ? "Processo" : "Process"}</dt>
                        <dd>{strategy.process.replaceAll("_", " ")}</dd>
                      </div>
                      <div>
                        <dt>{language === "it" ? "Evidenza" : "Evidence"}</dt>
                        <dd>
                          {strategy.arcus_evidence.raw_count} {language === "it" ? "casi" : "cases"} / {" "}
                          {strategy.arcus_evidence.episode_count || 0} {language === "it" ? "episodi" : "episodes"} / {" "}
                          {strategy.arcus_evidence.episode_effective_evidence_count || 0} {language === "it" ? "episode-effective" : "episode-effective"}
                          {strategy.arcus_evidence.retrieval_window_support
                            ? ` / ${strategy.arcus_evidence.retrieval_window_support.qualifying_window_count || 0}/${strategy.arcus_evidence.retrieval_window_support.total_window_count || 0} ${language === "it" ? "finestre retrieval" : "retrieval windows"}`
                            : ""}
                        </dd>
                      </div>
                      <div>
                        <dt>{language === "it" ? "Tema di controllo" : "Risk-control theme"}</dt>
                        <dd>
                          {strategy.risk_control_theme?.[language] ||
                            strategy.risk_control_theme?.en}
                        </dd>
                      </div>
                      <div>
                        <dt>{language === "it" ? "Monitoraggio" : "Monitoring"}</dt>
                        <dd>
                          {strategy.monitoring_consideration?.[language] ||
                            strategy.monitoring_consideration?.en}
                        </dd>
                      </div>
                    </dl>
                  </article>
                )
              )}

              {path01MitigationIntelligence &&
                path01MitigationIntelligence.status !== "loading" &&
                !(path01MitigationIntelligence.strategies || []).length && (
                  <p>
                    {mitigationAbstentionMessage(
                      path01MitigationIntelligence
                    )}
                  </p>
                )}

              <footer>
                <span>
                  {path01MitigationIntelligence?.evidence_cohort
                    ?.event_count || 0} {language === "it" ? "casi idraulici" : "hydraulic cases"} / {" "}
                  {path01MitigationIntelligence?.evidence_cohort
                    ?.episode_count || 0} {language === "it" ? "episodi indipendenti" : "independent episodes"}
                </span>
                <p>
                  {language === "it"
                    ? "Le strategie non modificano il Final Priority Index e richiedono validazione da parte di professionisti qualificati."
                    : "Strategies do not modify the Final Priority Index and require validation by qualified professionals."}
                </p>
              </footer>
            </div>
          </div>
        );
      }

      // Path 1 - Existing Assets: Prioritize Assets
      if (activeEntryPath === 1) {
        return (
          <div className="platform-workflow-panel">
            <div>
              <span>{activeWorkflowAction.stage}</span>
              <h3>{activeWorkflowAction.title}</h3>
              <p>{activeWorkflowAction.text}</p>
            </div>

            <div className="platform-workflow-output-header">
              {language === "it" ? "ARCUS mostra" : "ARCUS shows"}
            </div>

            <div className="platform-workflow-evidence">
              <article>
                <span>
                  {language === "it"
                    ? "Attenzione immediata"
                    : "Immediate attention"}
                </span>
                <strong>{assetAttentionSummary.immediate}</strong>
                <p>
                  {language === "it"
                    ? "ispezione prima della prossima stagione di rischio"
                    : "inspection before next risk season"}
                </p>
              </article>

              <article>
                <span>
                  {language === "it"
                    ? "Attenzione programmata"
                    : "Programmed attention"}
                </span>
                <strong>{assetAttentionSummary.programmed}</strong>
                <p>
                  {language === "it"
                    ? "da inserire nel piano annuale"
                    : "to add to annual plan"}
                </p>
              </article>

              <article>
                <span>
                  {language === "it"
                    ? "Hazard dominante"
                    : "Dominant hazard"}
                </span>
                <strong
                  style={{
                    fontSize: "18px",
                    lineHeight: "1.2",
                  }}
                >
                  {assetAttentionSummary.dominantHazard}
                </strong>
                <p>
                  {language === "it"
                    ? "nel patrimonio caricato"
                    : "in uploaded stock"}
                </p>
              </article>

              <article>
                <span>
                  {language === "it"
                    ? "Qualita inventario"
                    : "Inventory quality"}
                </span>
                <strong>{assetInventoryAudit.score}</strong>
                <p>readiness score</p>
              </article>
            </div>

            {assetScreening.length > 0 && (
              <div className="platform-table">
                {assetScreening.slice(0, 5).map((item) => (
                  <article key={item.id}>
                    <div>
                      <strong>{item.name}</strong>
                      <span>
                        {item.attentionLevel} -{" "}
                        {item.hazardProfileLabel} - proximity{" "}
                        {item.proximityScore}
                      </span>
                    </div>
                    <div>
                      <b>
                        {item.score}/{getAssetEvidenceGrade(item)}
                      </b>
                      <span>{copy.screeningScore}</span>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </div>
        );
      }

      // Paths 2, 3, 4 - Compare / Identify Patterns / Build Evidence Set
      return (
        <div className="platform-workflow-panel">
          <div>
            <span>{activeWorkflowAction.stage}</span>
            <h3>{activeWorkflowAction.title}</h3>
            <p>{activeWorkflowAction.text}</p>
          </div>

          <div className="platform-workflow-output-header">
            {language === "it" ? "ARCUS mostra" : "ARCUS shows"}
          </div>

          <div className="platform-workflow-evidence">
            {selectedProvinceDrivers.causes
              .slice(0, 3)
              .map((item) => (
                <article key={item.label}>
                  <span>
                    {language === "it" ? "Causa" : "Cause"}
                  </span>
                  <strong>{item.value}</strong>
                  <p>{item.label}</p>
                </article>
              ))}

            <article>
              <span>
                {language === "it"
                  ? "Precedenti"
                  : "Precedents"}
              </span>
              <strong>
                {selectedSimilarEvents.length ||
                  workflowEvents.length}
              </strong>
              <p>
                {language === "it"
                  ? "casi comparabili"
                  : "comparable cases"}
              </p>
            </article>
          </div>

          <div className="platform-table">
            {(selectedSimilarEvents.length
              ? selectedSimilarEvents
              : workflowEvents
            )
              .slice(0, 4)
              .map((event) => (
                <article key={event.event_id}>
                  <div>
                    <strong>
                      {event.municipality}
                      {event.year ? ` (${event.year})` : ""}
                    </strong>
                    <span>{event.specific_cause}</span>
                  </div>
                  <div>
                    <b>{event.event_id}</b>
                    <span>
                      {event.similarityScore
                        ? `${event.similarityScore} sim`
                        : event.collapse_severity}
                    </span>
                  </div>
                </article>
              ))}
          </div>
        </div>
      );
    }

    // Final step - path-specific export panel
    const exportSummaries = {
      // Path 0: Generate Territory Briefing
      0: {
        items: [
          [
            language === "it"
              ? "Territorio analizzato"
              : "Analyzed territory",
            manualAreaLabel,
          ],
            [
              language === "it"
                ? "Priority Index conclusivo"
                : "Final Priority Index",
              selectedFinalPriorityIndexLabel,
            ],
          [
            language === "it"
              ? "Hazard dominante"
              : "Dominant hazard",
            workflowHazardExposure?.dominant_hazard || "-",
          ],
          [
            language === "it"
              ? "Evidenze storiche"
              : "Historical evidence",
            `${workflowEvents.length} events`,
          ],
        ],
        actions: [
          {
            label:
              language === "it"
                ? "Download Full PDF"
                : "Download Full PDF",
            onClick: downloadProfessionalReport,
          },
          {
            label:
              language === "it"
                ? "Download One-Page Brief"
                : "Download One-Page Brief",
            onClick: downloadOnePageBrief,
          },
          {
            label:
              language === "it"
                ? "Export Event Table"
                : "Export Event Table",
            onClick: exportProvinceReport,
          },
          {
            label:
              language === "it"
                ? "Export Source Table"
                : "Export Source Table",
            onClick: exportSourceTable,
          },
          {
            label:
              language === "it"
                ? "Export GIS Package"
                : "Export GIS Package",
            onClick: exportGisPackage,
          },
        ],
      },
      // Path 1: Export Watchlist
      1: {
        items: [
          [
            language === "it"
              ? "Asset valutati"
              : "Assessed assets",
            String(assetScreening.length),
          ],
          [
            language === "it"
              ? "Attenzione immediata"
              : "Immediate attention",
            `${assetAttentionSummary.immediate} assets`,
          ],
          [
            language === "it"
              ? "Hazard dominante"
              : "Dominant hazard",
            assetAttentionSummary.dominantHazard,
          ],
          [
            language === "it"
              ? "Qualita inventario"
              : "Inventory quality",
            `${assetInventoryAudit.score}/100`,
          ],
        ],
        actions: [
          ...(assetScreening.length > 0
            ? [
                {
                  label:
                    language === "it"
                      ? "Export Asset Table"
                      : "Export Asset Table",
                  onClick: exportAssetScreening,
                },
              ]
            : []),
          {
            label:
              language === "it"
                ? "Export Source Table"
                : "Export Source Table",
            onClick: exportSourceTable,
          },
          {
            label:
              language === "it"
                ? "Export GIS Package"
                : "Export GIS Package",
            onClick: exportGisPackage,
          },
          {
            label:
              language === "it"
                ? "Download Full PDF"
                : "Download Full PDF",
            onClick: downloadProfessionalReport,
          },
          {
            label:
              language === "it"
                ? "Download One-Page Brief"
                : "Download One-Page Brief",
            onClick: downloadOnePageBrief,
          },
        ],
      },
      // Path 2: Generate Scenario Briefing
      2: {
        items: [
          [
            language === "it" ? "Scenario" : "Scenario",
            activeScenario?.label || "-",
          ],
          [
            language === "it"
              ? "Area analizzata"
              : "Analyzed area",
            manualAreaLabel,
          ],
          [
            language === "it"
              ? "Hazard dominante"
              : "Dominant hazard",
            workflowHazardExposure?.dominant_hazard || "-",
          ],
          [
            language === "it"
              ? "Analoghi storici"
              : "Historical analogues",
            `${
              selectedSimilarEvents.length ||
              workflowEvents.length
            }`,
          ],
        ],
        actions: [
          {
            label: copy.downloadReport,
            onClick: downloadProfessionalReport,
          },
          {
            label: copy.exportReport,
            onClick: exportProvinceReport,
          },
        ],
      },
      // Path 3: Export Due Diligence
      3: {
        items: [
          [
            language === "it"
              ? "Territorio"
              : "Territory",
            manualAreaLabel,
          ],
          [
            language === "it"
              ? "Priority index"
              : "Priority index",
            String(
              selectedProvinceProfile?.scenarioScore ||
                selectedProvinceProfile?.riskScore ||
                0
            ),
          ],
          [
            language === "it"
              ? "Cause dominanti"
              : "Dominant causes",
            selectedProvinceDrivers.causes
              .slice(0, 2)
              .map((item) => item.label)
              .join(", ") || "-",
          ],
          [
            language === "it"
              ? "Affidabilita evidenze"
              : "Evidence reliability",
            `${evidenceGradeFromScore(workflowReliability.average)} / ${Math.round(workflowReliability.average)}/100`,
          ],
        ],
        actions: [
          {
            label: copy.downloadReport,
            onClick: downloadProfessionalReport,
          },
          {
            label: copy.exportReport,
            onClick: exportProvinceReport,
          },
        ],
      },
      // Path 4: Export Research Output
      4: {
        items: [
          [
            language === "it"
              ? "Dataset interrogato"
              : "Dataset queried",
            `${events.length} events`,
          ],
          [
            language === "it"
              ? "Fonti documentali"
              : "Documentary sources",
            String(sources.length),
          ],
          [
            language === "it"
              ? "Causa principale"
              : "Top cause",
            causeRanking[0]?.label || "-",
          ],
          [
            language === "it"
              ? "Regioni coperte"
              : "Regions covered",
            String(profiles.length),
          ],
        ],
        actions: [
          {
            label: copy.downloadReport,
            onClick: downloadProfessionalReport,
          },
          {
            label: copy.exportReport,
            onClick: exportProvinceReport,
          },
        ],
      },
    };

    const currentExport =
      exportSummaries[activeEntryPath] ||
      exportSummaries[0];

    return (
      <div className="platform-workflow-panel">
        <div>
          <span>{activeWorkflowAction.stage}</span>
          <h3>{activeWorkflowAction.title}</h3>
          <p>{activeWorkflowAction.text}</p>
        </div>

        <div className="platform-workflow-output-header">
          {language === "it"
            ? "ARCUS mostra"
            : "ARCUS shows"}
        </div>

        <div className="platform-workflow-evidence">
          {currentExport.items.map(([label, value]) => (
            <article key={label}>
              <span>{label}</span>
              <strong
                style={{
                  fontSize: "18px",
                  lineHeight: "1.2",
                  marginTop: "10px",
                }}
              >
                {value}
              </strong>
            </article>
          ))}
        </div>

        <div className="platform-inline-actions">
          {currentExport.actions.map(
            ({ label, onClick }) => (
              <button
                key={label}
                disabled={!path01CanProceed}
                onClick={onClick}
                type="button"
              >
                {label}
              </button>
            )
          )}
        </div>
      </div>
    );
  };

  return (
    <main
      className={`platform-page professional-compact-mode ${
        hasSelectedProfessionalPath
          ? "professional-path-open"
          : "professional-path-locked"
      }`}
      id="main-content"
    >
      <PageMeta
        title="ARCUS Professional"
        description={copy.description}
      />

      <Navbar />
      <section className="platform-hero platform-professional-command-hero">
        <div className="platform-grid" />

        <div className="platform-container platform-guided-shell">
          <header className="platform-guided-header">
            <div>
              <div className="platform-label">
                {copy.heroLabel}
              </div>

              <h1>
                {language === "it"
                  ? "Cosa devi decidere oggi?"
                  : "What do you need to decide today?"}
              </h1>
              <p>
                {language === "it"
                  ? "Scegli il punto di ingresso. ARCUS apre solo il percorso coerente con la decisione che devi prendere."
                  : "Choose your entry point. ARCUS opens only the workflow aligned with the decision you need to make."}
              </p>
            </div>
          </header>

          <div className="platform-guided-board">
            <div className="platform-guided-choice-grid">
              {professionalPrimaryUseCases.map((item) => (
                <article
                  className={
                    hasSelectedProfessionalPath &&
                    activeEntryPath === item.index
                      ? "active"
                      : ""
                  }
                  key={item.label}
                >
                  <button
                    onClick={() => {
                      resetProfessionalPath(item.index);
                      window.setTimeout(() => {
                        document
                          .getElementById(
                            "professional-workflow"
                          )
                          ?.scrollIntoView({
                            behavior: "smooth",
                            block: "start",
                          });
                      }, 80);
                    }}
                    type="button"
                  >
                    <span>{item.label}</span>
                    <strong>{item.action}</strong>
                    <p>{item.entryHint}</p>
                    <em>{item.output}</em>
                  </button>
                </article>
              ))}
            </div>
          </div>
        </div>
      </section>

      <nav
        className="platform-module-nav"
        aria-label="Professional modules"
      >
        <div className="platform-container">
          {professionalNav.map(([label, href]) => (
            <a
              className={
                activeModule === href.slice(1)
                  ? "active"
                  : ""
              }
              href={href}
              key={href}
            >
              {label}
            </a>
          ))}
        </div>
      </nav>

      <section
        className="platform-section platform-client-route-section"
        id="professional-workflow"
      >
        <div className="platform-container">
          <div className="platform-console-entry">
            <div>
              <div className="platform-label">
                {language === "it"
                  ? "CONSOLE OPERATIVA"
                  : "OPERATIONAL CONSOLE"}
              </div>

              <h2>
                {language === "it"
                  ? `${activePath.label}: dalla domanda al pacchetto esportabile.`
                  : `${activePath.label}: from question to exportable package.`}
              </h2>

              <p>
                {language === "it"
                  ? "La scelta iniziale imposta il contesto, ma il lavoro resta nello stesso ambiente: selezioni il territorio o l'asset, leggi il profilo di rischio, controlli le evidenze e generi il pacchetto operativo."
                  : "The initial choice sets the context, but the work stays inside one environment: select the territory or asset, read the risk profile, review the evidence and generate the operational package."}
              </p>

              <button
                className="platform-path-change"
                onClick={() => {
                  setHasSelectedProfessionalPath(false);
                  setActiveWorkflowStep(0);
                  window.scrollTo({
                    top: 0,
                    behavior: "smooth",
                  });
                }}
                type="button"
              >
                {language === "it"
                  ? "Cambia percorso"
                  : "Change path"}
              </button>
            </div>

            <aside className="platform-console-entry-panel">
              {[
                [
                  language === "it"
                    ? "Evidence base"
                    : "Evidence base",
                  formatValue(events.length),
                  language === "it"
                    ? "eventi nel modello"
                    : "events in model",
                ],
                [
                  language === "it"
                    ? "Contesto"
                    : "Context",
                  selectedProjectContext,
                  language === "it"
                    ? "dominio selezionato"
                    : "selected domain",
                ],
                [
                  language === "it"
                    ? "Output"
                    : "Output",
                  "PDF / CSV / GIS",
                  language === "it"
                    ? "report e dati esportabili"
                    : "reports and exportable data",
                ],
              ].map(([label, value, text]) => (
                <article key={label}>
                  <span>{label}</span>
                  <strong>{value}</strong>
                  <p>{text}</p>
                </article>
              ))}
            </aside>
          </div>

          <div className="platform-path-runner">
            <aside className="platform-path-steps">
              <span>
                {language === "it"
                  ? "Path attivo"
                  : "Active path"}
              </span>
              <strong>{activePath.label}</strong>
              <p>{activePath.insight}</p>
              <p className="platform-active-context">
                {language === "it"
                  ? `Contesto fisso: ${selectedProjectContext}`
                  : `Fixed context: ${selectedProjectContext}`}
              </p>

              <div>
                {professionalWorkflowActions.map(
                  (action, index) => (
                    <button
                      className={
                        activeWorkflowStep === index
                          ? "active"
                          : ""
                      }
                      disabled={
                        activeEntryPath === 0 &&
                        index > 0 &&
                        !path01LocationValidated
                      }
                      key={`${action.stage}-${action.title}`}
                      onClick={() =>
                        activateWorkflowAction(
                          action,
                          index
                        )
                      }
                      type="button"
                    >
                      <b>{action.stage}</b>
                      <span>{action.title}</span>
                    </button>
                  )
                )}
              </div>
            </aside>

            <article className="platform-path-console">
              {renderWorkflowStepPanel()}

              <div className="platform-path-console-footer">
                <button
                  disabled={activeWorkflowStep === 0}
                  onClick={() =>
                    setActiveWorkflowStep((current) =>
                      Math.max(current - 1, 0)
                    )
                  }
                  type="button"
                >
                  {language === "it"
                    ? "Indietro"
                    : "Back"}
                </button>

                <button
                  disabled={
                    activeWorkflowStep >=
                      professionalWorkflowActions.length - 1 ||
                    !path01CanProceed
                  }
                  onClick={() =>
                    setActiveWorkflowStep((current) =>
                      Math.min(
                        current + 1,
                        professionalWorkflowActions.length - 1
                      )
                    )
                  }
                  type="button"
                >
                  {language === "it"
                    ? "Prossimo step"
                    : "Next step"}
                </button>
              </div>
            </article>

            <aside className="platform-path-packet">
              <span>
                {language === "it"
                  ? "Pacchetto in costruzione"
                  : "Working package"}
              </span>
              <strong>
                {language === "it"
                  ? "Report ARCUS"
                  : "ARCUS report"}
              </strong>

              <dl>
                {pathPacketRows.map(([label, value]) => (
                  <div key={label}>
                    <dt>{label}</dt>
                    <dd>{value}</dd>
                  </div>
                ))}
              </dl>

              <button
                disabled={!path01CanProceed}
                onClick={downloadProfessionalReport}
                type="button"
              >
                {copy.downloadReport}
              </button>
            </aside>
          </div>
        </div>
      </section>

      <section
        className="platform-section"
        id="professional-hotspots"
      >
        <div className="platform-container platform-split">
          <div>
            <div className="platform-label">
              {copy.hotspot}
            </div>
            <h2>
              Territory ranking built for operational priority.
            </h2>
          </div>

          <div className="platform-table">
            {profiles.slice(0, 7).map((profile) => (
              <article key={profile.territory}>
                <div>
                  <strong>
                    {profile.territory}
                  </strong>
                  <span>
                    {profile.total} events -{" "}
                    {profile.topCause}
                  </span>
                </div>
                <div>
                  <b>{profile.riskScore}</b>
                  <span>priority index</span>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section
        className="platform-section platform-professional-tool"
        id="professional-risk-score"
      >
        <div className="platform-container platform-split">
          <div>
            <div className="platform-label">
              {copy.province}
            </div>

            <h2>{copy.provinceTitle}</h2>

            <p>
              {language === "it"
                ? "Lo score combina evidenza ARCUS e overlay pubblici Professional: ricorrenza eventi, quota di collassi totali, eventi innescati, impatto umano, forza documentale ed esposizione hazard territoriale."
                : "The score combines ARCUS evidence and Professional public overlays: event recurrence, total-collapse share, triggered events, human impact, evidence strength and territorial hazard exposure."}
            </p>
          </div>

          <div className="platform-tool-grid">
            <div className="platform-scenario-panel">
              <span>{copy.scenario}</span>
              <p>{copy.scenarioText}</p>

              <div className="platform-scenario-options">
                {scenarios.map((item) => (
                  <button
                    className={
                      scenario === item.value
                        ? "active"
                        : ""
                    }
                    key={item.value}
                    onClick={() => {
                      setScenario(item.value);
                      if (activeEntryPath === 0) {
                        clearProjectLocationForProvinceChange("");
                      } else {
                        setSelectedProvince("");
                      }
                    }}
                    type="button"
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="platform-table platform-table-interactive">
              {scenarioProvinceProfiles
                .slice(0, 10)
                .map((profile) => (
                  <button
                    className={
                      profile.territory ===
                      selectedProvinceProfile?.territory
                        ? "active"
                        : ""
                    }
                    key={profile.territory}
                    onClick={() =>
                      activeEntryPath === 0
                        ? clearProjectLocationForProvinceChange(
                            profile.territory
                          )
                        : setSelectedProvince(
                            profile.territory
                          )
                    }
                    type="button"
                  >
                    <div>
                      <strong>
                        {profile.territory}
                      </strong>
                      <span>
                        {profile.total} events -{" "}
                        {profile.topCause}
                      </span>
                    </div>
                    <div>
                      <b>{profile.scenarioScore}</b>
                      <span>
                        {scenario === "baseline"
                          ? "priority index"
                          : `+${profile.scenarioBoost} scenario`}
                      </span>
                    </div>
                  </button>
                ))}
            </div>

            <article className="platform-score-card">
              <span>{copy.selectedTerritory}</span>

              <h3>
                {selectedProvinceProfile?.territory ||
                  "-"}
              </h3>

              <div className="platform-score-value">
                {selectedProvinceProfile?.scenarioScore ||
                  0}
              </div>

              <p>
                {selectedProvinceProfile
                  ? `${selectedProvinceProfile.total} events, ${percentage(
                      selectedProvinceProfile.totalCollapse,
                      selectedProvinceProfile.total
                    )}% total collapses, ${percentage(
                      selectedProvinceProfile.triggered,
                      selectedProvinceProfile.total
                    )}% triggered events, ${selectedProvinceProfile.avgSources.toFixed(
                      1
                    )} sources per event. ${
                      scenario === "baseline"
                        ? ""
                        : `${selectedProvinceProfile.scenarioEvents} events match the active scenario.`
                    }`
                  : "-"}
              </p>

              <div className="platform-score-breakdown">
                <strong>
                  {copy.scoreBreakdown}
                </strong>

                {selectedProvinceProfile?.scoreBreakdown.map(
                  (item) => (
                    <div
                      className="platform-score-row"
                      key={item.key}
                    >
                      <div>
                        <span>{item.label}</span>
                        <b>
                          {item.value}/{item.max}
                        </b>
                      </div>

                      <div className="platform-score-track">
                        <i
                          style={{
                            width: `${Math.min(
                              100,
                              (item.value /
                                item.max) *
                                100
                            )}%`,
                          }}
                        />
                      </div>
                    </div>
                  )
                )}
              </div>
            </article>

            <article>
              <span>{language === "it" ? "Outcome degli analoghi storici" : "Historical analogue outcomes"}</span>
              <h3>{historicalAnalogueOutcomes.analogueCount} {language === "it" ? "analoghi" : "analogues"}</h3>
              <p>
                {language === "it" ? "Processi osservati" : "Observed processes"}: {historicalAnalogueOutcomes.processes.map(([value, count]) => `${value} (${count})`).join(", ") || "-"}
              </p>
              <p>
                {language === "it" ? "Componenti coinvolte" : "Components involved"}: {historicalAnalogueOutcomes.components.map(([value, count]) => `${value} (${count})`).join(", ") || "-"}
              </p>
              <p>
                {language === "it" ? "Livelli di evidenza" : "Evidence levels"}: {historicalAnalogueOutcomes.evidence.map(([value, count]) => `${value} (${count})`).join(", ") || "-"}
              </p>
              <p>{historicalAnalogueOutcomes.sourceCount} {language === "it" ? "fonti collegate" : "linked sources"}</p>
              <em>
                {language === "it"
                  ? "Gli outcome sono letti dopo il retrieval e non modificano selezione, similarity score o ranking. Evidenza storica contestuale; validazione tecnica esterna richiesta."
                  : "Outcomes are read after retrieval and do not change selection, similarity score or ranking. Contextual historical evidence; external technical validation required."}
              </em>
            </article>
          </div>
        </div>
      </section>

      <section
        className="platform-section platform-scenario-matrix-section"
        id="professional-scenarios"
      >
        <div className="platform-container">
          <div className="platform-scenario-matrix-header">
            <div>
              <div className="platform-label">
                {copy.scenarioMatrix}
              </div>

              <h2>{copy.scenarioMatrixTitle}</h2>
              <p>{copy.scenarioMatrixText}</p>
            </div>
          </div>

          <div className="platform-scenario-matrix">
            {scenarioMatrix.map((item) => (
              <article key={item.value}>
                <div className="platform-scenario-matrix-title">
                  <span>{item.label}</span>
                  <b>{item.causes.join(" / ")}</b>
                </div>

                <div className="platform-scenario-matrix-list">
                  {item.topProfiles.map((profile) => (
                    <div key={profile.territory}>
                      <strong>
                        {profile.territory}
                      </strong>

                      <p>
                        {profile.total} events -{" "}
                        {profile.scenarioEvents}{" "}
                        scenario matches
                      </p>

                      <div>
                        <span>
                          {copy.baselineScore}:{" "}
                          {profile.riskScore}
                        </span>
                        <span>
                          {copy.scenarioScore}:{" "}
                          {profile.scenarioScore}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section
        className="platform-section platform-map-preview-section"
        id="professional-map"
      >
        <div className="platform-container">
          <div className="platform-map-preview-header">
            <div>
              <div className="platform-label">
                {copy.mapPreview}
              </div>

              <h2>{copy.mapPreviewTitle}</h2>
              <p>{copy.mapPreviewText}</p>
            </div>

            <div className="platform-map-actions">
              <div className="platform-map-layer-toggles">
                {[
                  ["events", copy.mapEvents],
                  ["heatmap", copy.mapHeatmap],
                  ["hydraulic", "Hydraulic"],
                  ["landslide", "Landslide"],
                  ["seismic", "Seismic"],
                  ["assets", copy.mapAssets],
                  ["watchlist", copy.mapWatchlist],
                ].map(([key, label]) => (
                  <button
                    className={
                      professionalMapLayers[key]
                        ? "active"
                        : ""
                    }
                    key={key}
                    onClick={() =>
                      setProfessionalMapLayers(
                        (current) => ({
                          ...current,
                          [key]: !current[key],
                        })
                      )
                    }
                    type="button"
                  >
                    {label}
                  </button>
                ))}
              </div>

              <Link to="/atlas?mode=professional">
                {copy.atlas}
              </Link>
            </div>
          </div>

          <div className="platform-map-preview-shell">
            <CollapseMap
              assetMarkers={professionalAssetMapMarkers}
              activeHazardOverlays={
                activeProfessionalHazardLayers
              }
              filteredEvents={selectedProvinceEvents}
              height="560px"
              professionalMode
              onPointSelect={
                activeEntryPath === 0
                  ? (point) =>
                      commitProjectLocation(
                        point.latitude,
                        point.longitude,
                        "map"
                      )
                  : undefined
              }
              publicWmsOverlays={
                activeProfessionalWmsOverlays
              }
              resizeSignal={professionalMapResizeSignal}
              sidebarOpen={false}
              selectedPoint={
                activeEntryPath === 0 && path01LocationValidated
                  ? projectLocation
                  : null
              }
              showAssetMarkers={
                professionalMapLayers.assets
              }
              showEventMarkers={
                professionalMapLayers.events
              }
              showHeatmap={
                professionalMapLayers.heatmap
              }
              showWatchlistMarkers={
                professionalMapLayers.watchlist
              }
              sourcesByEvent={sourcesByEventMap}
              watchlistMarkers={monitoringSignals}
            />
            {activeEntryPath === 0 && path01LocationValidated ? (
              <PointHazardInspector
                className="embedded"
                exposure={{
                  hydraulic: path01HydraulicExposure,
                  landslide: path01LandslideExposure,
                  seismic: path01SeismicExposure,
                }}
                language={language}
                onRetry={() =>
                  commitProjectLocation(
                    projectLocation.latitude,
                    projectLocation.longitude,
                    "map_retry"
                  )
                }
                point={projectLocation}
                status={path01ExposureStatus}
              />
            ) : null}
          </div>
        </div>
      </section>

      <section className="platform-section platform-demo-story-section">
        <div className="platform-container">
          <div className="platform-section-header">
            <div>
              <div className="platform-label">
                {language === "it"
                  ? "Demo operativa"
                  : "Operational demo"}
              </div>
              <h2>
                {language === "it"
                  ? "Un percorso unico dalla mappa al report."
                  : "One workflow from map to report."}
              </h2>
              <p>
                {language === "it"
                  ? "Questa e la sequenza che puo essere mostrata a un ente: non singole funzioni isolate, ma una pipeline decisionale completa."
                  : "This is the sequence to present to an institution: not isolated features, but a complete decision pipeline."}
              </p>
            </div>

            <Link to="/atlas?mode=professional">
              {copy.atlas}
            </Link>
          </div>

          <div className="platform-workflow-strip">
            {demoWorkflow.map(([title, text, href, output]) => (
              <article key={title}>
                <span>{title}</span>
                <p>{text}</p>
                <em>{output}</em>
                <a href={href}>
                  {language === "it"
                    ? "Apri modulo"
                    : "Open module"}
                </a>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section
        className="platform-section platform-asset-screening"
        id="professional-assets"
      >
        <div className="platform-container">
          <div className="platform-asset-header">
            <div>
              <div className="platform-label">
                {copy.assetScreening}
              </div>

              <h2>{copy.assetScreeningTitle}</h2>
              <p>{copy.assetScreeningText}</p>
            </div>

            <div className="platform-asset-actions">
              <label>
                {copy.assetUpload}
                <input
                  accept=".csv,.xls,.html,text/csv,application/vnd.ms-excel"
                  onChange={handleAssetUpload}
                  type="file"
                />
              </label>

              <button
                onClick={downloadAssetTemplate}
                type="button"
              >
                {copy.assetTemplate}
              </button>

              <button
                disabled={!assetScreening.length}
                onClick={exportAssetScreening}
                type="button"
              >
                {copy.assetExport}
              </button>
            </div>
          </div>

          {assetError ? (
            <p className="platform-asset-error">
              {assetError}
            </p>
          ) : null}

          {assetScreening.length ? (
            <>
              <div className="platform-asset-audit">
                <div>
                  <span>{copy.assetAudit}</span>
                  <strong>
                    {assetInventoryAudit.score}
                  </strong>
                </div>

                {[
                  [
                    copy.coordinatesReady,
                    assetInventoryAudit.coordinates,
                  ],
                  [
                    copy.territoryReady,
                    assetInventoryAudit.territory,
                  ],
                  [
                    copy.technicalReady,
                    assetInventoryAudit.technical,
                  ],
                  [
                    copy.ageReady,
                    assetInventoryAudit.age,
                  ],
                ].map(([label, value]) => (
                  <article key={label}>
                    <b>{value}</b>
                    <span>
                      {label} /{" "}
                      {assetInventoryAudit.total}
                    </span>
                  </article>
                ))}
              </div>

              <div className="platform-asset-grid">
              <div className="platform-asset-list">
                {assetScreening
                  .slice(0, 8)
                  .map((item) => (
                    <article key={item.id}>
                      <div>
                        <span>{item.actionTier}</span>
                        <strong>{item.name}</strong>
                        <p>
                          {item.territory} -{" "}
                          {item.hazardProfileLabel} -{" "}
                          {item.proximityBand}
                        </p>
                      </div>

                      <div>
                        <b>
                          {item.score}/{getAssetEvidenceGrade(item)}
                        </b>
                        <em>{copy.screeningScore}</em>
                      </div>
                    </article>
                  ))}
              </div>

              <div className="platform-asset-detail">
                <span>{copy.topAsset}</span>
                <h3>{assetScreening[0].name}</h3>

                <div className="platform-asset-score">
                  {assetScreening[0].score}/
                  {getAssetEvidenceGrade(assetScreening[0])}
                </div>

                <div className="platform-asset-hazard">
                  <span>{copy.assetHazard}</span>
                  <strong>
                    {assetScreening[0].hazardProfileLabel ||
                      assetScreening[0].dominantHazard ||
                      "-"}
                  </strong>
                  <b>
                    {assetScreening[0].hazardScore || 0}
                  </b>
                </div>

                <div className="platform-official-exposure compact">
                  <div>
                    <span>Official geospatial exposure</span>
                    <strong>
                      {hydraulicExposureLabel(path02HydraulicExposure)}
                    </strong>
                    <p>
                      {language === "it"
                        ? "Interrogazione singolo asset in shadow mode. Il ranking Path 02 resta basato sul modello corrente."
                        : "Single-asset query in shadow mode. Path 02 ranking remains based on the current model."}
                    </p>
                  </div>

                  <button
                    disabled={
                      path02ExposureStatus === "loading" ||
                      !Number.isFinite(
                        Number(assetScreening[0].latitude)
                      ) ||
                      !Number.isFinite(
                        Number(assetScreening[0].longitude)
                      )
                    }
                    onClick={queryPath02HydraulicExposure}
                    type="button"
                  >
                    {path02ExposureStatus === "loading"
                      ? language === "it"
                        ? "Interrogo ISPRA"
                        : "Querying ISPRA"
                      : language === "it"
                        ? "Verifica asset"
                        : "Check asset"}
                  </button>

                  <div className="platform-exposure-comparison">
                    <span>
                      Real hydraulic exposure:{" "}
                      <strong>
                        {hydraulicExposureLabel(path02HydraulicExposure)}
                      </strong>
                    </span>
                    <span>
                      Current ARCUS historical proxy:{" "}
                      <strong>
                        {assetScreening[0].hazardProfileLabel ||
                          assetScreening[0].dominantHazard ||
                          "-"}{" "}
                        / {assetScreening[0].hazardScore || 0}
                      </strong>
                    </span>
                    <span>
                      Source status:{" "}
                      <strong>
                        {path02HydraulicExposure?.status || "-"}
                      </strong>
                    </span>
                  </div>
                </div>

                <p>
                  {assetScreening[0].territory} has{" "}
                  {
                    assetScreening[0]
                      .comparableEvents.length
                  }{" "}
                  {copy.assetComparable},{" "}
                  {assetScreening[0].nearbyEvents.length}{" "}
                  {copy.assetNearby},{" "}
                  {
                    assetScreening[0]
                      .highVulnerabilityMatches
                  }{" "}
                  {copy.highCriticalMatches}.
                </p>
                <p>
                  {assetScreening[0].actionTier}. Nearest ARCUS case:{" "}
                  {assetScreening[0].nearestEventSummary}.
                </p>
                <p>
                  {assetScreening[0].monitoringRecommendation}
                </p>

                <div className="platform-asset-events">
                  {assetScreening[0].comparableEvents
                    .slice(0, 4)
                    .map((event) => (
                      <div key={event.event_id}>
                        <strong>
                          {event.event_id}
                        </strong>
                        <span>
                          {event.municipality} -{" "}
                          {event.specific_cause} -{" "}
                          {
                            vulnerabilityByEvent[
                              event.event_id
                            ]?.className
                          }
                        </span>
                      </div>
                    ))}
                </div>
              </div>
            </div>
            </>
          ) : (
            <div className="platform-asset-empty">
              {copy.assetEmpty}
            </div>
          )}
        </div>
      </section>

      <section
        className="platform-section platform-similarity-section"
        id="professional-similarity"
      >
        <div className="platform-container platform-split">
          <div>
            <div className="platform-label">
              {copy.similarity}
            </div>

            <h2>{copy.similarityTitle}</h2>
            <p>{copy.similarityText}</p>
          </div>

          <div className="platform-similarity-grid">
            <article>
              <span>{copy.assetPrecedents}</span>
              <h3>
                {assetScreening[0]?.name ||
                  "Asset screening"}
              </h3>

              {topAssetSimilarEvents.length ? (
                <div className="platform-similarity-list">
                  {topAssetSimilarEvents.map(
                    (event) => (
                      <div key={event.event_id}>
                        <b>
                          {event.similarityScore}
                        </b>
                        <div>
                          <strong>
                            {event.event_id} -{" "}
                            {event.municipality}
                          </strong>
                          <p>
                            {event.specific_cause} /{" "}
                            {event.collapse_severity}
                          </p>
                          <em>
                            {event.similarityReasons
                              .slice(0, 3)
                              .join(" - ")}
                          </em>
                        </div>
                      </div>
                    )
                  )}
                </div>
              ) : (
                <p>{copy.assetEmpty}</p>
              )}
            </article>

            <article>
              <span>{copy.eventPrecedents}</span>
              <h3>
                {referenceEvent?.event_id || "-"}
              </h3>

              <div className="platform-similarity-list">
                {selectedSimilarEvents.map(
                  (event) => (
                    <div key={event.event_id}>
                      <b>{event.similarityScore}</b>
                      <div>
                        <strong>
                          {event.event_id} -{" "}
                          {event.municipality}
                        </strong>
                        <p>
                          {event.specific_cause} /{" "}
                          {event.collapse_severity}
                        </p>
                        <em>
                          {event.similarityReasons
                            .slice(0, 3)
                            .join(" - ")}
                        </em>
                      </div>
                    </div>
                  )
                )}
              </div>
            </article>
          </div>
        </div>
      </section>

      <section
        className="platform-section platform-integration-section"
        id="professional-api"
      >
        <div className="platform-container platform-split">
          <div>
            <div className="platform-label">
              {copy.integration}
            </div>

            <h2>{copy.integrationTitle}</h2>
            <p>{copy.integrationText}</p>

            <div className="platform-api-meta">
              <span>{copy.apiManifest}</span>
              <strong>
                {apiManifest?.version || "0.1.0"}
              </strong>
              <em className="platform-api-access">
                {language === "it"
                  ? "Disponibile dentro workflow Professional autorizzati"
                  : "Available inside authorised Professional workflows"}
              </em>
            </div>
          </div>

          <div className="platform-api-grid">
            {(apiManifest?.endpoints || [
              {
                description:
                  "Curated bridge-collapse events enriched with professional models.",
                resource: "professional_events",
              },
              {
                description:
                  "Regional and provincial risk profiles.",
                resource: "territory_profiles",
              },
              {
                description:
                  "Event-level evidence reliability scores.",
                resource: "event_reliability",
              },
              {
                description:
                  "Event-level vulnerability scores.",
                resource: "event_vulnerability",
              },
            ]).map((endpoint) => (
              <article key={endpoint.resource}>
                <span>{endpoint.resource}</span>
                <p>{endpoint.description}</p>
                <em className="platform-api-access">
                  {language === "it"
                    ? "Accesso controllato"
                    : "Controlled access"}
                </em>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section
        className="platform-section platform-monitoring-section"
        id="professional-monitoring"
      >
        <div className="platform-container">
          <div className="platform-monitoring-header">
            <div>
              <div className="platform-label">
                {copy.monitoringLayer}
              </div>

              <h2>{copy.monitoringTitle}</h2>
              <p>{copy.monitoringText}</p>
            </div>

            <button
              type="button"
              onClick={exportMonitoringWatchlist}
              disabled={!monitoringSignals.length}
            >
              {copy.monitoringExport}
            </button>
          </div>

          <div className="platform-monitoring-grid">
            <div className="platform-monitoring-rules">
              <span>{copy.monitoringRules}</span>

              {monitoringRuleCards.map(
                ([label, value]) => (
                  <article key={label}>
                    <strong>{value}</strong>
                    <p>{label}</p>
                  </article>
                )
              )}
            </div>

            <div className="platform-monitoring-queue">
              <span>{copy.monitoringQueue}</span>

              {monitoringSignals
                .slice(0, 8)
                .map((signal) => (
                  <article key={signal.event.event_id}>
                    <div>
                      <b>{signal.level}</b>
                      <strong>
                        {signal.event.event_id} -{" "}
                        {signal.event.municipality}
                      </strong>
                      <p>
                        {signal.event.specific_cause} /{" "}
                        {
                          signal.event
                            .collapse_severity
                        }
                      </p>
                    </div>

                    <em>
                      {signal.rules
                        .slice(0, 3)
                        .join(" - ")}
                    </em>
                  </article>
                ))}
            </div>
          </div>
        </div>
      </section>

      <section
        className="platform-section platform-workspace-section"
        id="professional-workspace"
      >
        <div className="platform-container platform-split">
          <div>
            <div className="platform-label">
              {copy.workspace}
            </div>

            <h2>{copy.workspaceTitle}</h2>
            <p>{copy.workspaceText}</p>

            <div className="platform-workspace-form">
              <input
                type="text"
                value={workspaceName}
                onChange={(event) =>
                  setWorkspaceName(
                    event.target.value
                  )
                }
                placeholder={
                  copy.workspacePlaceholder
                }
              />

              <button
                type="button"
                onClick={saveWorkspaceSnapshot}
              >
                {copy.saveWorkspace}
              </button>
            </div>
          </div>

          <div className="platform-workspace-list">
            <span>{copy.savedProjects}</span>

            {savedWorkspaces.length ? (
              savedWorkspaces.map((workspace) => (
                <article key={workspace.id}>
                  <div>
                    <strong>
                      {workspace.name}
                    </strong>
                    <p>
                      {workspace.territory} -{" "}
                      {workspace.scenario} -{" "}
                      {workspace.total_events} events
                    </p>
                  </div>

                  <div className="platform-workspace-metrics">
                    <b>{workspace.risk_score}</b>
                    <em>priority</em>
                    <b>
                      {
                        workspace.vulnerability_score
                      }
                    </b>
                    <em>vulnerability</em>
                  </div>

                  <div className="platform-workspace-actions">
                    <button
                      type="button"
                      onClick={() =>
                        exportWorkspace(workspace)
                      }
                    >
                      {copy.exportWorkspace}
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        deleteWorkspace(
                          workspace.id
                        )
                      }
                    >
                      {copy.deleteWorkspace}
                    </button>
                  </div>
                </article>
              ))
            ) : (
              <div className="platform-workspace-empty">
                {copy.noProjects}
              </div>
            )}
          </div>
        </div>
      </section>

      <section
        className="platform-section platform-governance-section"
        id="professional-governance"
      >
        <div className="platform-container">
          <div className="platform-governance-header">
            <div>
              <div className="platform-label">
                {copy.governance}
              </div>

              <h2>{copy.governanceTitle}</h2>
              <p>{copy.governanceText}</p>
            </div>

            <em className="platform-api-access">
              {language === "it"
                ? "Accesso controllato"
                : "Controlled access"}
            </em>
          </div>

          <div className="platform-model-grid">
            {modelCards.map((model) => (
              <article key={model.id}>
                <div>
                  <span>{model.status}</span>
                  <b>v{model.version}</b>
                </div>

                <h3>{model.name}</h3>
                <p>{model.output}</p>

                <strong>{copy.modelInputs}</strong>
                <ul>
                  {model.inputs
                    .slice(0, 5)
                    .map((input) => (
                      <li key={input}>{input}</li>
                    ))}
                </ul>

                <strong>{copy.modelLimits}</strong>
                <ul>
                  {model.limitations
                    .slice(0, 3)
                    .map((limit) => (
                      <li key={limit}>{limit}</li>
                    ))}
                </ul>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section
        className="platform-section platform-quality-section"
        id="professional-quality"
      >
        <div className="platform-container platform-split">
          <div>
            <div className="platform-label">
              {copy.quality}
            </div>

            <h2>{copy.qualityTitle}</h2>
            <p>{copy.qualityText}</p>

            <div className="platform-quality-score">
              <span>{copy.readiness}</span>
              <strong>
                {dataQuality?.readiness_score || 0}
              </strong>
              <em className="platform-api-access">
                {language === "it"
                  ? "Accesso controllato"
                  : "Controlled access"}
              </em>
            </div>
          </div>

          <div className="platform-quality-panel">
            <div className="platform-quality-summary">
              {[
                [
                  "Events",
                  dataQuality?.summary?.events || 0,
                ],
                [
                  "Sources",
                  dataQuality?.summary?.sources || 0,
                ],
                [
                  "Avg sources",
                  dataQuality?.summary
                    ?.avg_sources_per_event || 0,
                ],
                [
                  "No sources",
                  dataQuality?.summary
                    ?.events_without_sources || 0,
                ],
              ].map(([label, value]) => (
                <article key={label}>
                  <span>{label}</span>
                  <strong>{value}</strong>
                </article>
              ))}
            </div>

            <div className="platform-quality-coverage">
              <span>{copy.coverage}</span>

              {(dataQuality?.field_coverage || [])
                .slice(0, 8)
                .map((item) => (
                  <div key={item.field}>
                    <p>{item.field}</p>
                    <b>{item.coverage}%</b>
                    <i>
                      <em
                        style={{
                          width: `${item.coverage}%`,
                        }}
                      />
                    </i>
                  </div>
                ))}
            </div>

            <div className="platform-quality-watch">
              <span>{copy.watchItems}</span>

              {(dataQuality?.watch_items || []).map(
                (item) => (
                  <article key={item.label}>
                    <strong>{item.value}</strong>
                    <p>{item.label}</p>
                  </article>
                )
              )}
            </div>
          </div>
        </div>
      </section>

      <section
        className="platform-section platform-dictionary-section"
        id="professional-dictionary"
      >
        <div className="platform-container">
          <div className="platform-dictionary-header">
            <div>
              <div className="platform-label">
                {copy.dictionary}
              </div>

              <h2>{copy.dictionaryTitle}</h2>
              <p>{copy.dictionaryText}</p>
            </div>

            <em className="platform-api-access">
              {language === "it"
                ? "Accesso controllato"
                : "Controlled access"}
            </em>
          </div>

          <div className="platform-dictionary-grid">
            {dataDictionary.map((dataset) => (
              <article key={dataset.id}>
                <div>
                  <span>{dataset.id}</span>
                  <b>
                    {dataset.records} {copy.records}
                  </b>
                </div>

                <h3>{dataset.label}</h3>
                <p>
                  {dataset.fields.length}{" "}
                  {copy.fields}
                </p>

                <div className="platform-dictionary-fields">
                  {dataset.fields
                    .slice(0, 5)
                    .map((field) => (
                      <div key={field.field}>
                        <strong>
                          {field.field}
                        </strong>
                        <span>
                          {field.type} -{" "}
                          {field.coverage}%
                        </span>
                      </div>
                    ))}
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section
        className="platform-section platform-release-section"
        id="professional-release"
      >
        <div className="platform-container platform-split">
          <div>
            <div className="platform-label">
              {copy.release}
            </div>

            <h2>{copy.releaseTitle}</h2>
            <p>{copy.releaseText}</p>

            <div className="platform-release-meta">
              <span>{dataRelease?.id || "-"}</span>
              <strong>
                v{dataRelease?.version || "0.1.0"}
              </strong>
              <em className="platform-api-access">
                {language === "it"
                  ? "Accesso controllato"
                  : "Controlled access"}
              </em>
            </div>
          </div>

          <div className="platform-release-panel">
            <div className="platform-release-counts">
              {Object.entries(
                dataRelease?.counts || {}
              ).map(([label, value]) => (
                <article key={label}>
                  <span>{label}</span>
                  <strong>{value}</strong>
                </article>
              ))}
            </div>

            <div className="platform-release-checks">
              <span>{copy.releaseChecks}</span>

              {(dataRelease?.checks || []).map(
                (check) => (
                  <article
                    className={
                      check.passed ? "passed" : "failed"
                    }
                    key={check.label}
                  >
                    <b>
                      {check.passed ? "PASS" : "CHECK"}
                    </b>
                    <strong>{check.label}</strong>
                    <em>{check.value}</em>
                  </article>
                )
              )}
            </div>
          </div>
        </div>
      </section>

      <section className="platform-section platform-publication-readiness">
        <div className="platform-container">
          <div className="platform-section-header">
            <div>
              <div className="platform-label">
                {language === "it"
                  ? "Publication readiness"
                  : "Publication readiness"}
              </div>
              <h2>
                {language === "it"
                  ? "Checklist per presentare ARCUS a un ente."
                  : "Checklist for presenting ARCUS to an institution."}
              </h2>
              <p>
                {language === "it"
                  ? "Questa sezione serve come controllo di insieme: cosa e gia dimostrabile oggi e cosa puo essere approfondito nella fase successiva."
                  : "This section is a system-level check: what is demonstrable today and what can be deepened in the next phase."}
              </p>
            </div>
          </div>

          <div className="platform-readiness-grid">
            {publicationReadiness.map(([title, text, status]) => (
              <article key={title}>
                <span>{status}</span>
                <strong>{title}</strong>
                <p>{text}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section
        className="platform-section platform-external-section"
        id="professional-external-layers"
      >
        <div className="platform-container">
          <div className="platform-external-header">
            <div>
              <div className="platform-label">
                {copy.externalLayers}
              </div>

              <h2>{copy.externalLayersTitle}</h2>
              <p>{copy.externalLayersText}</p>
            </div>

            <em className="platform-api-access">
              {language === "it"
                ? "Accesso controllato"
                : "Controlled access"}
            </em>
          </div>

          <div className="platform-external-grid">
            {externalLayers.map((layer) => (
              <article key={layer.id}>
                <div>
                  <span>{layer.category}</span>
                  <b>{layer.priority}</b>
                </div>

                <h3>{layer.name}</h3>

                <p>{layer.arcus_use}</p>

                <dl>
                  <dt>{copy.provider}</dt>
                  <dd>{layer.provider}</dd>
                  <dt>Status</dt>
                  <dd>{layer.integration_status}</dd>
                  <dt>{copy.joinStrategy}</dt>
                  <dd>{layer.join_strategy}</dd>
                </dl>

                <div className="platform-external-links">
                  <a
                    href={layer.source_url}
                    target="_blank"
                    rel="noreferrer"
                  >
                    source
                  </a>
                  <a
                    href={layer.documentation_url}
                    target="_blank"
                    rel="noreferrer"
                  >
                    docs
                  </a>
                </div>
              </article>
            ))}
          </div>

          <div className="platform-source-summary">
            <article>
              <span>Registered layers</span>
              <strong>{externalLayerSummary.total}</strong>
            </article>
            <article>
              <span>High priority</span>
              <strong>{externalLayerSummary.highPriority}</strong>
            </article>
            <article>
              <span>Providers</span>
              <strong>
                {externalLayerSummary.declaredProviders}
              </strong>
            </article>
          </div>

          <div className="platform-source-playbook">
            {externalSourcePlaybook.map(([title, text]) => (
              <article key={title}>
                <span>{title}</span>
                <p>{text}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section
        className="platform-section platform-hazard-preview-section"
        id="professional-hazard-preview"
      >
        <div className="platform-container platform-split">
          <div>
            <div className="platform-label">
              {copy.hazardPreview}
            </div>

            <h2>{copy.hazardPreviewTitle}</h2>
            <p>{copy.hazardPreviewText}</p>

            <div className="platform-hazard-meta">
              <span>{copy.dominantHazard}</span>
              <strong>
                {selectedHazardExposure?.dominant_hazard ||
                  "-"}
              </strong>
              <em className="platform-api-access">
                {language === "it"
                  ? "Accesso controllato"
                  : "Controlled access"}
              </em>
            </div>
          </div>

          <div className="platform-hazard-bars">
            {(selectedHazardExposure?.hazards || []).map(
              (hazard) => (
                <article key={hazard.key}>
                  <div>
                    <strong>{hazard.label}</strong>
                    <b>{hazard.score}</b>
                  </div>

                  <i>
                    <em
                      style={{
                        width: `${hazard.score}%`,
                      }}
                    />
                  </i>

                  <p>
                    {hazard.matched_events} matching
                    events -{" "}
                    {Math.round(hazard.share * 100)}%
                    share
                  </p>
                </article>
              )
            )}
          </div>
        </div>
      </section>

      <section
        className="platform-section platform-report-section"
        id="professional-report"
      >
        <div className="platform-container">
          <div className="platform-report-header">
            <div>
              <div className="platform-label">
                {copy.reportTitle}
              </div>

              <h2>
                {selectedProvinceProfile?.territory ||
                  "-"}
              </h2>
            </div>

            <button
              disabled={isPreparingReport || !path01CanProceed}
              type="button"
              onClick={printProfessionalReport}
            >
              {isPreparingReport
                ? language === "it"
                  ? "Preparazione PDF..."
                  : "Preparing PDF..."
                : language === "it"
                ? "Download Full PDF Report"
                : "Download Full PDF Report"}
            </button>

            <button
              disabled={isPreparingReport || !path01CanProceed}
              type="button"
              onClick={downloadOnePageBrief}
            >
              {isPreparingReport
                ? language === "it"
                  ? "Preparazione PDF..."
                  : "Preparing PDF..."
                : language === "it"
                ? "Download One-Page Brief"
                : "Download One-Page Brief"}
            </button>

            <button
              disabled={!path01CanProceed}
              type="button"
              onClick={exportProvinceReport}
            >
              {language === "it"
                ? "Export Events CSV"
                : "Export Events CSV"}
            </button>

            <button
              disabled={!path01CanProceed}
              type="button"
              onClick={exportSourceTable}
            >
              {language === "it"
                ? "Export Sources CSV"
                : "Export Sources CSV"}
            </button>

            <button
              disabled={!path01CanProceed}
              type="button"
              onClick={exportGisPackage}
            >
              {language === "it"
                ? "Export GeoJSON"
                : "Export GeoJSON"}
            </button>

            {exportStatus && (
              <p
                aria-live="polite"
                className="platform-export-status"
              >
                {exportStatus}
              </p>
            )}
          </div>

          <div className="platform-atlas-cta report">
            <div>
              <strong>
                {language === "it"
                  ? "PDF e Atlas hanno ruoli diversi"
                  : "PDF and Atlas have different roles"}
              </strong>
              <p>
                {language === "it"
                  ? "La mappa PDF mostra i casi ARCUS nella provincia selezionata. Gli indicatori sintetizzano i layer hazard. Apri Professional Atlas per accendere/spegnere Hydraulic, Landslide e Seismic su scala nazionale."
                  : "The PDF map shows ARCUS cases in the selected province. Exposure indicators synthesise the hazard layers. Open Professional Atlas to turn Hydraulic, Landslide and Seismic layers on or off at national scale."}
              </p>
            </div>
            <a href="/atlas">
              {language === "it"
                ? "Explore full map in Atlas"
                : "Explore full map in Atlas"}
            </a>
          </div>

          <div className="platform-report-grid">
            <article className="platform-report-summary">
              <span>
                {language === "it"
                  ? "Priority Index conclusivo"
                  : "Final Priority Index"}
              </span>
              <strong>
                {selectedFinalPriorityIndexLabel}
              </strong>
              <p>
                {selectedProvinceProfile
                  ? language === "it"
                    ? `${selectedProvinceProfile.total} eventi ARCUS, Collapse Rate ${selectedCollapseRateMultiplier}, confidenza denominatore ${selectedCollapseRateConfidence}.`
                    : `${selectedProvinceProfile.total} ARCUS events, Collapse Rate ${selectedCollapseRateMultiplier}, denominator confidence ${selectedCollapseRateConfidence}.`
                  : "-"}
              </p>
            </article>

            <article className="platform-evidence-card">
              <span>{copy.reliability}</span>
              <strong>
                {Math.round(
                  selectedReliability.average
                )}
              </strong>
              <p>{copy.reliabilityText}</p>

              <div className="platform-evidence-grades">
                {["A", "B", "C", "D"].map(
                  (grade) => (
                    <div key={grade}>
                      <b>{grade}</b>
                      <em>
                        {selectedReliability
                          .gradeCounts[grade] || 0}
                      </em>
                    </div>
                  )
                )}
              </div>
            </article>

            <article className="platform-vulnerability-card">
              <span>{copy.vulnerability}</span>
              <strong>
                {Math.round(
                  selectedVulnerability.average
                )}
              </strong>
              <p>
                {copy.vulnerabilityText}{" "}
                {copy.dominantClass}:{" "}
                {
                  selectedVulnerability.dominantClass
                }
                .
              </p>

              <div className="platform-vulnerability-classes">
                {[
                  "Critical",
                  "High",
                  "Medium",
                  "Low",
                ].map((className) => (
                  <div
                    className={`vulnerability-${className.toLowerCase()}`}
                    key={className}
                  >
                    <b>{className}</b>
                    <em>
                      {selectedVulnerability
                        .classCounts[className] || 0}
                    </em>
                  </div>
                ))}
              </div>
            </article>

            <article>
              <span>Official geospatial exposure</span>
              <ul>
                <li>
                  <b>Hydraulic hazard</b>
                  <em>
                    {hydraulicExposureLabel(path01HydraulicExposure)}
                  </em>
                </li>
                <li>
                  <b>
                    {language === "it"
                      ? "Classi idrauliche al punto"
                      : "Hydraulic classes at the point"}
                  </b>
                  <em>
                    {path01HydraulicExposure?.matched_classes?.length
                      ? path01HydraulicExposure.matched_classes.join(", ")
                      : language === "it"
                        ? "Nessuna classe attribuita al punto"
                        : "No class assigned to the point"}
                  </em>
                </li>
                <li>
                  <b>
                    {language === "it"
                      ? "Contesto idraulico territoriale"
                      : "Hydraulic territorial context"}
                  </b>
                  <em>
                    {nearbyContextLabel(
                      path01HydraulicExposure,
                      language
                    ) || "-"}
                  </em>
                </li>
                <li>
                  <b>Official landslide hazard - ISPRA PAI</b>
                  <em>
                    {landslideExposureLabel(path01LandslideExposure)}
                  </em>
                </li>
                <li>
                  <b>Landslide assessment status</b>
                  <em>
                    {exposureStatusLabel(
                      path01LandslideExposure,
                      language
                    )}
                    {" / "}
                    {assessmentStatusLabel(
                      path01LandslideExposure,
                      language
                    )}
                  </em>
                </li>
                <li>
                  <b>
                    {language === "it"
                      ? "Classi PAI al punto"
                      : "PAI classes at the point"}
                  </b>
                  <em>
                    {path01LandslideExposure?.matched_hazard_classes?.length
                      ? path01LandslideExposure.matched_hazard_classes.join(", ")
                      : language === "it"
                        ? "Nessuna classe attribuita al punto"
                        : "No class assigned to the point"}
                  </em>
                </li>
                <li>
                  <b>
                    {language === "it"
                      ? "Contesto PAI territoriale"
                      : "PAI territorial context"}
                  </b>
                  <em>
                    {nearbyContextLabel(
                      path01LandslideExposure,
                      language
                    ) || "-"}
                  </em>
                </li>
                <li>
                  <b>Landslide observation provenance</b>
                  <em>
                    {path01LandslideExposure?.source?.observation_mode || "-"}
                    {" / "}
                    {path01LandslideExposure?.source?.freshness_status || "-"}
                    {" / "}
                    {path01LandslideExposure?.source?.observed_at || "-"}
                  </em>
                </li>
                <li>
                  <b>Landslide scoring role</b>
                  <em>Shadow mode; does not modify Final Priority Index</em>
                </li>
                <li>
                  <b>Attention area</b>
                  <em>
                    {path01LandslideExposure?.attention_area
                      ? path01LandslideExposure.matched_attention_classes?.join(", ") || "AA"
                      : "No"}
                  </em>
                </li>
                <li>
                  <b>Official seismic hazard - INGV MPS04</b>
                  <em>{seismicExposureLabel(path01SeismicExposure)}</em>
                </li>
                <li>
                  <b>MPS04 PGA p50</b>
                  <em>
                    {hasSeismicPga(path01SeismicExposure)
                      ? `${Number(path01SeismicExposure.pga_p50_g).toFixed(3)} g`
                      : "unavailable"}
                  </em>
                </li>
                <li>
                  <b>Seismic sampling</b>
                  <em>
                    {path01SeismicExposure?.sampling_method ||
                      "nearest_grid_node"}
                  </em>
                </li>
                <li>
                  <b>Normalized score</b>
                  <em>not assigned</em>
                </li>
              </ul>
            </article>

            <article>
              <span>Risk drivers</span>
              <ul>
                {[
                  ...selectedProvinceDrivers.causes,
                  ...selectedProvinceDrivers.materials,
                  ...selectedProvinceDrivers.structures,
                ]
                  .slice(0, 6)
                  .map((item) => (
                    <li key={item.label}>
                      <b>{item.label}</b>
                      <em>{item.value}</em>
                    </li>
                  ))}
              </ul>
            </article>

            <article>
              <span>{copy.recommendations}</span>
              <ol>
                {selectedRecommendations.map(
                  (recommendation) => (
                    <li key={recommendation}>
                      {recommendation}
                    </li>
                  )
                )}
              </ol>
            </article>

            <article>
              <span>
                {language === "it"
                  ? "Contenuto report"
                  : "Report contents"}
              </span>
              <ul>
                <li>
                  <b>
                    {language === "it"
                      ? "Sintesi"
                      : "Summary"}
                  </b>
                  <em>
                    {language === "it"
                      ? "priorita e lettura operativa"
                      : "priorities and operational reading"}
                  </em>
                </li>
                <li>
                  <b>Hazard</b>
                  <em>
                    {selectedHazardExposure?.dominant_hazard ||
                      "-"}
                  </em>
                </li>
                <li>
                  <b>Models</b>
                  <em>
                    {language === "it"
                      ? "indicatori e limiti dichiarati"
                      : "scores and declared limits"}
                  </em>
                </li>
              </ul>
            </article>
          </div>

          <div className="platform-benchmark">
            <div className="platform-label">
              {copy.benchmark}
            </div>

            {selectedBenchmark.map((item) => (
              <article
                className={item.status}
                key={item.key}
              >
                <span>{item.label}</span>

                <div>
                  <strong>
                    {item.selected}
                    {item.suffix}
                  </strong>
                  <small>
                    ARCUS avg {item.national}
                    {item.suffix}
                  </small>
                </div>

                <em>
                  {item.status === "above"
                    ? copy.aboveAverage
                    : item.status === "below"
                      ? copy.belowAverage
                      : copy.alignedAverage}
                </em>
              </article>
            ))}
          </div>

          <div className="platform-report-events">
            <div className="platform-label">
              {copy.priorityEvents}
            </div>

            {selectedProvinceEvents
              .slice(0, 6)
              .map((event) => (
                <article key={event.event_id}>
                  <div>
                    <strong>
                      {event.bridge_name ||
                        event.bridge_crossing_name ||
                        event.municipality}
                    </strong>
                    <span>
                      {event.event_id} -{" "}
                      {event.municipality},{" "}
                      {event.region}
                    </span>
                  </div>

                  <div>
                    <b>{event.collapse_severity}</b>
                  <span>
                    {event.specific_cause} -{" "}
                      {sourceCountByEvent[
                        event.event_id
                      ] || 0}{" "}
                      sources -{" "}
                      {reliabilityByEvent[
                        event.event_id
                      ]?.grade || "D"}
                      -grade -{" "}
                      {vulnerabilityByEvent[
                        event.event_id
                      ]?.className || "Low"}{" "}
                      vulnerability
                  </span>
                </div>
              </article>
              ))}
          </div>

          <div className="platform-action-matrix">
            <div className="platform-label">
              {copy.actionMatrix}
            </div>

            {[
              [
                copy.immediateReview,
                selectedActionMatrix.immediate,
              ],
              [
                copy.evidenceEnrichment,
                selectedActionMatrix.evidence,
              ],
              [
                copy.monitoring,
                selectedActionMatrix.monitoring,
              ],
            ].map(([label, items]) => (
              <article key={label}>
                <div>
                  <strong>{label}</strong>
                  <span>
                    {items.length}{" "}
                    {language === "it"
                      ? "eventi"
                      : "events"}
                  </span>
                </div>

                <ul>
                  {items
                    .slice(0, 4)
                    .map((event) => (
                      <li key={event.event_id}>
                        {event.municipality} -{" "}
                        {event.collapse_severity} -{" "}
                        {event.specific_cause}
                      </li>
                    ))}
                </ul>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="platform-section platform-dark">
        <div className="platform-container platform-split">
          <div>
            <div className="platform-label">
              {copy.hazard}
            </div>
            <h2>
              GIS layers that make the archive actionable.
            </h2>
            <p>{copy.hazardText}</p>
          </div>

          <div className="platform-card-grid">
            {hazards.map(([title, text]) => (
              <article key={title}>
                <span>{title}</span>
                <p>{text}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="platform-section">
        <div className="platform-container platform-three">
          <article className="platform-panel">
            <span>{copy.watchlist}</span>
            <h3>
              {topProfile?.territory || "-"}
            </h3>
            <p>
              {topProfile
                ? `${topProfile.total} events, ${percentage(
                    topProfile.totalCollapse,
                    topProfile.total
                  )}% total collapses, ${topProfile.avgSources.toFixed(
                    1
                  )} sources per event.`
                : "-"}
            </p>
          </article>

          <article className="platform-panel">
            <span>Dominant mechanisms</span>
            <h3>{causeRanking[0]?.[0] || "-"}</h3>
            <p>
              {causeRanking
                .map(
                  ([cause, value]) =>
                    `${cause}: ${value}`
                )
                .join(" - ")}
            </p>
          </article>

          <article className="platform-panel">
            <span>{copy.report}</span>
            <h3>Decision-ready output</h3>
            <p>{copy.reportText}</p>
          </article>
        </div>
      </section>
    </main>
  );
}

