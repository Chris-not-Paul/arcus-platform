import {
  useEffect,
  useMemo,
  useState,
} from "react";

import { Link } from "react-router-dom";

import CollapseMap from "../components/map/CollapseMap";
import Navbar from "../components/layout/Navbar";
import PageMeta from "../components/layout/PageMeta";
import useLanguage from "../context/useLanguage";
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

import "../styles/platform-levels.css";

function loadStoredWorkspaces() {
  if (typeof window === "undefined") {
    return [];
  }

  try {
    const stored = JSON.parse(
      window.localStorage.getItem(
        "arcus-professional-workspaces"
      ) || "[]"
    );

    return Array.isArray(stored) ? stored : [];
  } catch {
    return [];
  }
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
      watchlist: true,
    });
  const [scenario, setScenario] =
    useState("baseline");
  const [assetRows, setAssetRows] = useState([]);
  const [assetError, setAssetError] =
    useState("");
  const [apiManifest, setApiManifest] =
    useState(null);
  const [modelCards, setModelCards] =
    useState([]);
  const [dataQuality, setDataQuality] =
    useState(null);
  const [dataDictionary, setDataDictionary] =
    useState([]);
  const [dataRelease, setDataRelease] =
    useState(null);
  const [externalLayers, setExternalLayers] =
    useState([]);
  const [hazardExposurePreview, setHazardExposurePreview] =
    useState(null);
  const [workspaceName, setWorkspaceName] =
    useState("");
  const [savedWorkspaces, setSavedWorkspaces] =
    useState(loadStoredWorkspaces);
  const [activeEntryPath, setActiveEntryPath] =
    useState(0);
  const [activeWorkflowStep, setActiveWorkflowStep] =
    useState(0);
  const [
    manualAreaBounds,
    setManualAreaBounds,
  ] = useState(null);
  const [projectContext, setProjectContext] =
    useState("bridge");
  const [researchQuery, setResearchQuery] =
    useState("");

  useEffect(() => {
    fetch("/data/processed/events.json")
      .then((response) => response.json())
      .then(setEvents);

    fetch("/data/processed/sources.json")
      .then((response) => response.json())
      .then(setSources);

    fetch("/data/professional/api-manifest.json")
      .then((response) => response.json())
      .then(setApiManifest)
      .catch(() => setApiManifest(null));

    fetch("/data/professional/model-cards.json")
      .then((response) => response.json())
      .then((data) =>
        setModelCards(data.models || [])
      )
      .catch(() => setModelCards([]));

    fetch("/data/professional/data-quality.json")
      .then((response) => response.json())
      .then(setDataQuality)
      .catch(() => setDataQuality(null));

    fetch("/data/professional/data-dictionary.json")
      .then((response) => response.json())
      .then((data) =>
        setDataDictionary(data.datasets || [])
      )
      .catch(() => setDataDictionary([]));

    fetch("/data/professional/data-release.json")
      .then((response) => response.json())
      .then(setDataRelease)
      .catch(() => setDataRelease(null));

    fetch("/data/professional/external-hazard-layers.json")
      .then((response) => response.json())
      .then((data) =>
        setExternalLayers(data.layers || [])
      )
      .catch(() => setExternalLayers([]));

    fetch("/data/professional/hazard-exposure-preview.json")
      .then((response) => response.json())
      .then(setHazardExposurePreview)
      .catch(() => setHazardExposurePreview(null));
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
            "ARCUS Professional traduce l'archivio storico in intelligence infrastrutturale: contesto territoriale, esposizioni, precedenti e indicatori spiegabili per chi deve decidere dove approfondire prima.",
          hazard:
            "Layer di esposizione",
          hazardText:
            "Il valore Professional nasce dall'incrocio tra eventi ARCUS e overlay pubblici dichiarati: frane, alluvioni, idraulica, sismicita ed eta infrastrutturale. Le integrazioni private restano nel livello Enterprise.",
          heroLabel:
            "ARCUS PROFESSIONAL",
          heroTitle:
            "Infrastructure intelligence operativa per territori e gestori infrastrutturali.",
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
            "Endpoint JSON pronti per GIS, BI e prototipi API.",
          integrationText:
            "La pipeline ARCUS genera risorse professionali statiche: eventi arricchiti, profili territoriali, affidabilita fonti e vulnerabilita.",
          apiManifest:
            "Manifest API",
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
            "Questo modulo usa il registro degli overlay pubblici ARCUS Professional e produce una lettura provinciale di esposizione. Le connessioni live e i layer proprietari restano riservati al livello Enterprise.",
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
            "ARCUS Professional turns the historical archive into infrastructure intelligence: territorial context, exposures, precedents and explainable indicators for teams that need to know where to look first.",
          hazard:
            "Exposure Layers",
          hazardText:
            "Professional value comes from crossing ARCUS events with declared public overlays: landslides, floods, hydraulic exposure, seismicity and infrastructure age. Private integrations remain part of the Enterprise tier.",
          heroLabel:
            "ARCUS PROFESSIONAL",
          heroTitle:
            "Operational infrastructure intelligence for territories and infrastructure managers.",
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
            "JSON endpoints ready for GIS, BI and API prototypes.",
          integrationText:
            "The ARCUS pipeline generates professional static resources: enriched events, territory profiles, source reliability and vulnerability.",
          apiManifest:
            "API manifest",
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
            "This module uses the ARCUS Professional public-overlay registry and produces a province-level exposure reading. Live connections and proprietary layers remain reserved for Enterprise.",
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

  const selectedProvinceProfile =
    scenarioProvinceProfiles.find(
      (profile) =>
        profile.territory === selectedProvince
    ) || scenarioProvinceProfiles[0];

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
      (item) =>
        item.province ===
        selectedProvinceProfile.territory
    );
  }, [
    hazardExposurePreview,
    selectedProvinceProfile,
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

  const assetScreening = useMemo(
    () =>
      buildAssetScreening(
        assetRows,
        events,
        scenarioProvinceProfiles,
        vulnerabilityByEvent,
        hazardExposurePreview
      ),
    [
      assetRows,
      events,
      scenarioProvinceProfiles,
      vulnerabilityByEvent,
      hazardExposurePreview,
    ]
  );

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
      coordinates,
      score,
      technical,
      territory,
      total,
    };
  }, [assetRows]);

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
          readAssetValue(item.asset, [
            "latitude",
            "lat",
          ])
        );
        const longitude = Number(
          readAssetValue(item.asset, [
            "longitude",
            "lon",
            "lng",
          ])
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

  const selectedRecommendations = useMemo(() => {
    if (!selectedProvinceProfile) {
      return [];
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
    language,
    manualAreaBounds,
    manualAreaProvinces,
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
    openProfessionalReportPrintView("full");
  };

  const escapeHtml = (value) =>
    String(value ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");

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

  const buildProfessionalReportHtml = ({
    variant = "full",
  } = {}) => {
    if (!selectedProvinceProfile) {
      return "";
    }

    const it = language === "it";
    const isBrief = variant === "brief";
    const isPath01 = activeEntryPath === 0;
    const score =
      selectedProvinceProfile.scenarioScore ||
      selectedProvinceProfile.riskScore ||
      0;
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

    const reportAreaDescription = isPath01
      ? `${provinceContext.areaLabel}: ${selectedProvinceProfile.total} ${it ? "eventi ARCUS" : "ARCUS events"}, ${selectedProvinceProfile.sourceTotal} ${it ? "fonti documentate" : "documented sources"}. ${it ? "Meccanismo dominante" : "Dominant mechanism"}: ${selectedProvinceProfile.topCause}. ${it ? "Livello spaziale" : "Spatial level"}: ${provinceContext.spatialLevel}.`
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
      if (value >= 75) {
        return it ? "High attention" : "High attention";
      }

      if (value >= 55) {
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
          ? "Failure precedent exposure"
          : "Failure precedent exposure"
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

    const formatKpi = ({ level, driver }) =>
      `<p><span class="kpi-class"><em>${escapeHtml(level)}</em></span><span class="kpi-driver">${escapeHtml(driver)}</span></p>`;

    const compactUrl = (url) => {
      if (!url) {
        return "-";
      }

      try {
        const parsed = new URL(url);
        const path =
          parsed.pathname.length > 34
            ? `${parsed.pathname.slice(0, 34)}...`
            : parsed.pathname;

        return `${parsed.hostname}${path}`;
      } catch {
        return String(url).length > 48
          ? `${String(url).slice(0, 48)}...`
          : String(url);
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
    const mapBounds = (!isPath01 && manualAreaBounds) ||
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
    const mapPins = mapBounds
      ? mapEvents
        .slice(0, 36)
        .map((event) => {
          const width = Math.max(
            mapBounds.east - mapBounds.west,
            0.01
          );
          const height = Math.max(
            mapBounds.north - mapBounds.south,
            0.01
          );
          const left = Math.min(
            96,
            Math.max(
              4,
              ((event.longitude - mapBounds.west) / width) * 100
            )
          );
          const top = Math.min(
            92,
            Math.max(
              8,
              (1 -
                (event.latitude - mapBounds.south) / height) *
                100
            )
          );
          const severityClass =
            event.collapse_severity === "TC"
              ? "map-pin-critical"
              : event.triggered
                ? "map-pin-triggered"
                : "map-pin-context";

          return `<span class="map-pin ${severityClass}" style="left:${left.toFixed(2)}%;top:${top.toFixed(2)}%" title="${escapeHtml(event.event_id)}"></span>`;
        })
        .join("")
      : "";
    const reportMapImage =
      typeof window !== "undefined"
        ? window.localStorage.getItem(
          "arcus-path01-report-map-image"
        )
        : "";
    const reportMapFrame = reportMapImage
      ? `<figure class="map-image-frame">
        <img src="${escapeHtml(reportMapImage)}" alt="${escapeHtml(it ? "Mappa territoriale esportata da ARCUS" : "Territorial map exported from ARCUS")}" />
        <figcaption>${escapeHtml(it ? "Mappa esportata da ARCUS Professional: provincia selezionata, precedenti ARCUS e layer hazard attivi. Uso: screening territoriale, non cartografia catastale o scala progettuale." : "Map exported from ARCUS Professional: selected province, ARCUS precedents and active hazard layers. Use: territorial screening, not cadastral or design-scale mapping.")}</figcaption>
      </figure>`
      : `<div class="map-frame">
      <div class="map-grid"></div>
      <div class="map-area-box"></div>
      ${mapPins}
      <div class="map-north">N</div>
      <div class="map-scale"><span></span>${it ? "scala indicativa" : "indicative scale"}</div>
      <div class="map-legend">
        <span><i class="map-pin-critical"></i>${it ? "Crollo totale" : "Total collapse"}</span>
        <span><i class="map-pin-triggered"></i>${it ? "Evento innescato" : "Triggered event"}</span>
        <span><i class="map-pin-context"></i>${it ? "Contesto" : "Context"}</span>
      </div>
      <div class="map-caption">
        <strong>${escapeHtml(reportAreaLabel)}</strong>
        <span>${it ? "Real ARCUS map capture: provincia selezionata, eventi e contesto hazard attivo. Screening territoriale, non scala progettuale." : "Real ARCUS map capture: selected province, events and active hazard context. Territorial screening, not design scale."}</span>
      </div>
    </div>`;

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

    const precedentComponent = (event, kind) => {
      const reasons = event.similarityReasons || [];

      if (kind === "cause") {
        return reasons.some((reason) => reason.includes("mechanism"))
          ? it
            ? "match"
            : "match"
          : it
            ? "parziale"
            : "partial";
      }

      if (kind === "trigger") {
        return reasons.some((reason) => reason.includes("triggered"))
          ? it
            ? "match"
            : "match"
          : event.triggered
            ? it
              ? "presente"
              : "present"
            : it
              ? "non indicato"
              : "not stated";
      }

      if (kind === "severity") {
        return reasons.some((reason) => reason.includes("severity"))
          ? severityLabel(event.collapse_severity)
          : it
            ? "comparabile"
            : "comparable";
      }

      if (kind === "territory") {
        return reasons.some(
          (reason) =>
            reason.includes("region") ||
            reason.includes("province")
        )
          ? it
            ? "stesso contesto"
            : "same context"
          : it
            ? "contesto affine"
            : "related context";
      }

      if (kind === "evidence") {
        const rel = reliabilityByEvent[event.event_id];
        return rel?.grade ? `${rel.score || 0} / ${rel.grade}` : "0 / D";
      }

      return workflowHazardExposure?.dominant_hazard
        ? workflowHazardExposure.dominant_hazard
        : it
          ? "non disponibile"
          : "not available";
    };

    const precedentScore = (event, index) => {
      const raw = Number(event.similarityScore || 0);
      const capped = Math.min(raw || 82, 94 - index * 3);

      return Math.max(55, capped);
    };

    const similarRows = selectedSimilarEvents
      .map((event, index) => `<tr>
        <td>${precedentScore(event, index)}/100</td>
        <td>${escapeHtml(event.event_id)}</td>
        <td>${escapeHtml(event.municipality)}${event.year ? ` (${event.year})` : ""}</td>
        <td>${escapeHtml(validityText(event.specific_cause, it ? "Non classificata" : "Unclassified"))}</td>
        <td>${escapeHtml(precedentComponent(event, "trigger"))}</td>
        <td>${escapeHtml(precedentComponent(event, "severity"))}</td>
        <td>${escapeHtml(precedentComponent(event, "territory"))}</td>
        <td>${escapeHtml(precedentComponent(event, "evidence"))}</td>
        <td>${escapeHtml(precedentComponent(event, "hazard"))}</td>
      </tr>`)
      .join("");

    const recommendationRows = selectedRecommendations
      .map((item) => `<li>${escapeHtml(item)}</li>`)
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
        label: "Failure precedent exposure",
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
          ? "una forte concentrazione di precedenti storici di collasso legati al contesto idraulico"
          : "a strong concentration of hydraulic-related historical collapse precedents"
        : it
          ? `una concentrazione di precedenti storici legati a ${dominantCauseLabel}`
          : `a concentration of historical precedents linked to ${dominantCauseLabel}`;
    const decisionOutcome = it
      ? `Uso raccomandato: screening preliminare del contesto ${workflowHazardExposure?.dominant_hazard || "hazard"} prima di progettazione, due diligence o indagini sito-specifiche.`
      : `Recommended use: preliminary ${workflowHazardExposure?.dominant_hazard || "hazard"}-context screening before design, due diligence or site-specific investigation.`;
    const topFindings = [
      it
        ? `Il contesto ${workflowHazardExposure?.dominant_hazard || "hazard"} domina la lettura territoriale.`
        : `The ${workflowHazardExposure?.dominant_hazard || "hazard"} context dominates the territorial reading.`,
      it
        ? `${triggeredEvents} eventi innescati e ${totalCollapseEvents} crolli totali orientano la priorita tecnica.`
        : `${triggeredEvents} triggered events and ${totalCollapseEvents} total collapses shape the technical priority.`,
      it
        ? `Affidabilita evidenze ${reliabilityLabel.toLowerCase()} con ${workflowSourceCount} fonti collegate.`
        : `${reliabilityLabel} evidence reliability with ${workflowSourceCount} linked sources.`,
    ];
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
      ? `Gli eventi prioritari sono selezionati per severita, trigger, driver territoriale e affidabilita delle fonti. La colonna "Why flagged" rende esplicito perche ciascun precedente merita attenzione operativa.`
      : `Priority events are selected by severity, trigger, territorial driver and source reliability. The "Why flagged" column makes explicit why each precedent deserves operational attention.`;
    const comparableInterpretation = selectedSimilarEvents.length
      ? it
        ? "I precedenti comparabili condividono causa, trigger, severita o contesto territoriale. Devono essere usati come analoghi storici, non come previsioni dirette."
        : "Comparable precedents share cause, trigger, severity or territorial context. They should be used as historical analogues, not direct predictions."
      : it
        ? "Nessun analogo storico sufficientemente robusto e disponibile per questa selezione."
        : "No sufficiently robust historical analogue is available for this selection.";
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
        <td>${escapeHtml(Array.from(linkedEvents).slice(0, 4).join(", "))}${linkedEvents.size > 4 ? "..." : ""}</td>
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
    const sourceAppendixSection = `<section class="appendix-section source-appendix page-block">
      ${sectionHeading("A", it ? "SOURCE APPENDIX" : "SOURCE APPENDIX")}
      <p>${it ? `Fonti principali collegate agli eventi della provincia selezionata, deduplicate per titolo o URL. Totale fonti collegate nel briefing: ${workflowSourceCount}. La tabella completa delle fonti puo essere esportata separatamente da ARCUS Professional.` : `Main sources linked to events in the selected province, deduplicated by title or URL. Total linked sources in this briefing: ${workflowSourceCount}. The full source table can be exported separately from ARCUS Professional.`}</p>
      <table>
        <thead><tr><th>Event ID</th><th>${it ? "Titolo fonte" : "Source title"}</th><th>Type</th><th>Role</th><th>${it ? "Data" : "Date"}</th><th>URL</th></tr></thead>
        <tbody>${sourceAppendixRowsSafe}</tbody>
      </table>
    </section>`;

    const scoringSection = `<section>
      <h2>${it ? "LOGICA DI SCORING" : "SCORING LOGIC"}</h2>
      <table>
        <thead><tr><th>${it ? "Modello" : "Model"}</th><th>${it ? "Come si legge" : "How to read it"}</th></tr></thead>
        <tbody>
          <tr><td>${it ? "AffidabilitÃ  evidenza" : "Evidence reliability"}</td><td>${it ? "Volume fonti, ruolo fonte, confidenza ARCUS, precisione spaziale e tracciabilitÃ  temporale." : "Source volume, source role, ARCUS confidence, spatial precision and temporal traceability."}</td></tr>
          <tr><td>${it ? "VulnerabilitÃ " : "Vulnerability"}</td><td>${it ? "SeveritÃ , trigger, causa specifica, tipo struttura, materiale, etÃ , impatto umano e penalitÃ  evidenza." : "Severity, trigger, specific cause, structure type, material, age, human impact and evidence penalty."}</td></tr>
          <tr><td>${it ? "Hazard territoriale" : "Territorial hazard"}</td><td>${it ? "Layer pubblici dichiarati e scores ufficiali per esposizione idraulica, franosa e sismica." : "Declared public overlays and official-source scores for hydraulic, landslide and seismic exposure."}</td></tr>
          <tr><td>${it ? "Screening asset" : "Asset screening"}</td><td>${it ? "Posizione asset, eventi comparabili, corrispondenze vulnerabilitÃ , campi tecnici e contesto territoriale." : "Asset location, comparable events, vulnerability matches, technical fields and territorial context."}</td></tr>
        </tbody>
      </table>
    </section>`;

    const methodologySection = `<section class="page-block">
      ${sectionHeading("14", it ? "METHODOLOGY SNAPSHOT" : "METHODOLOGY SNAPSHOT")}
      <p>${it ? "ARCUS combina evidenze storiche di collasso, affidabilita delle fonti, rilevanza spaziale, severita, trigger, similarita causale, contesto hazard territoriale e overlay WMS pubblici. Il briefing supporta screening e prioritizzazione preliminare: non e una certificazione di sicurezza strutturale." : "ARCUS combines historical collapse evidence, source reliability, spatial relevance, severity, triggers, cause similarity, territorial hazard context and public WMS overlays. The briefing supports preliminary screening and prioritisation: it is not a structural safety certification."}</p>
      <table>
        <thead><tr><th>${it ? "Componente" : "Component"}</th><th>${it ? "Uso nel briefing" : "Use in the briefing"}</th></tr></thead>
        <tbody>
          <tr><td>${it ? "Evidenza storica" : "Historical evidence"}</td><td>${it ? "Record ARCUS documentati, cause, trigger e severita." : "Documented ARCUS records, causes, triggers and severity."}</td></tr>
          <tr><td>${it ? "Affidabilita fonti" : "Source reliability"}</td><td>${it ? "Numero, ruolo e qualita delle fonti disponibili." : "Number, role and quality of available sources."}</td></tr>
          <tr><td>${it ? "Rilevanza spaziale" : "Spatial relevance"}</td><td>${it ? "Provincia selezionata e confine amministrativo provinciale." : "Selected province and administrative provincial boundary."}</td></tr>
          <tr><td>${it ? "Contesto hazard" : "Hazard context"}</td><td>${it ? "Overlay pubblici WMS idraulici/franosi e contesto sismico." : "Public hydraulic/landslide WMS overlays and seismic context."}</td></tr>
          <tr><td>${it ? "Precedenti comparabili" : "Comparable precedents"}</td><td>${it ? "Cause match, trigger match, severita, contesto territoriale e affidabilita." : "Cause match, trigger match, severity, territorial context and reliability."}</td></tr>
        </tbody>
      </table>
    </section>
    <section>
      ${sectionHeading("15", it ? "SCORE AND CLASS LEGEND" : "SCORE AND CLASS LEGEND")}
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
    const exportVersion = "ARCUS Professional PDF-ready v0.3";
    const spatialLevel = isPath01 || !manualAreaBounds
      ? provinceContext.spatialLevel
      : it
        ? "Area custom selezionata"
        : "Custom selected area";

    // â”€â”€ CSS â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    const css = `
      @page { size: A4; margin: 18mm 16mm; }
      :root { color: #1c1713; background: #f7f0e8; font-family: Inter, Aptos, Arial, sans-serif; }
      body { margin: 0; background: #f7f0e8; color: #1c1713; }
      .report-footer { position: fixed; left: 16mm; right: 16mm; bottom: 7mm; display: flex; justify-content: space-between; gap: 18px; color: #8b7b68; font-size: 9px; letter-spacing: 0.08em; text-transform: uppercase; }
      .cover { min-height: 440px; padding: 56px 64px 48px; background: #15110f; color: #f2e8d4; border-bottom: 8px solid #c49040; page-break-after: always; display: flex; flex-direction: column; justify-content: space-between; }
      .brief-output .cover { min-height: auto; padding: 30px 42px; page-break-after: avoid; }
      .brand { color: #c49040; font-size: 36px; font-weight: 900; letter-spacing: 0.2em; }
      .path-badge { display: inline-block; margin-top: 22px; padding: 6px 12px; border: 1px solid rgba(196,144,64,0.55); color: rgba(242,232,212,0.72); font-size: 10px; font-weight: 800; letter-spacing: 0.16em; text-transform: uppercase; }
      .cover h1 { max-width: 760px; margin: 18px 0 0; font-size: 48px; line-height: 1.02; }
      .brief-output .cover h1 { font-size: 34px; }
      .meta { margin-top: 18px; color: rgba(242,232,212,0.62); font-size: 12px; letter-spacing: 0.1em; text-transform: uppercase; }
      .cover-meta-grid { display: grid; grid-template-columns: repeat(5, minmax(0, 1fr)); gap: 10px; margin-top: 42px; }
      .cover-meta-grid div { padding-top: 10px; border-top: 1px solid rgba(196,144,64,0.42); }
      .cover-meta-grid span { display: block; color: rgba(242,232,212,0.52); font-size: 9px; font-weight: 800; letter-spacing: 0.14em; text-transform: uppercase; }
      .cover-meta-grid strong { display: block; margin-top: 6px; color: #f2e8d4; font-size: 12px; line-height: 1.35; }
      main { max-width: 1040px; margin: 0 auto; padding: 42px 44px 64px; }
      .kpis { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 10px; margin: 18px 0 24px; }
      .kpi { padding: 16px; border: 1px solid #d7cab9; background: #fffaf2; box-shadow: 0 10px 26px rgba(64,49,37,0.06); }
      .kpi > span { color: #7a6548; font-size: 9px; font-weight: 900; letter-spacing: 0.12em; text-transform: uppercase; }
      .kpi strong { display: block; margin-top: 8px; color: #c49040; font-size: 28px; font-weight: 800; line-height: 1.05; }
      .kpi p { margin: 10px 0 0; font-size: 11px; line-height: 1.45; }
      .kpi-class, .kpi-driver { display: block; color: #4f463d; font-weight: 700; letter-spacing: 0; text-transform: none; }
      .kpi-class em { display: inline-block; padding: 4px 7px; background: #15110f; color: #c49040; font-style: normal; font-size: 9px; font-weight: 900; letter-spacing: 0.08em; text-transform: uppercase; }
      .kpi-driver { margin-top: 3px; color: #7a6548; font-weight: 600; }
      section { margin-top: 16px; padding: 22px 24px; border: 1px solid #d7cab9; background: rgba(255,250,242,0.9); page-break-inside: avoid; }
      .brief-page { page-break-before: avoid; }
      .executive-section { border-color: #c49040; background: #fffaf2; box-shadow: 0 14px 34px rgba(64,49,37,0.08); }
      .page-block { page-break-before: always; }
      .appendix-section { background: #fbf4ec; }
      h2 { display: flex; align-items: center; gap: 10px; margin: 0 0 14px; color: #7a6548; font-size: 10px; font-weight: 900; letter-spacing: 0.14em; text-transform: uppercase; }
      .section-number { display: inline-flex; width: 28px; height: 22px; align-items: center; justify-content: center; background: #15110f; color: #c49040; font-size: 10px; letter-spacing: 0; }
      p, li { color: #4f463d; line-height: 1.6; font-size: 13px; }
      p { margin: 0 0 10px; }
      ol, ul { margin: 0; padding-left: 20px; }
      li { margin-bottom: 6px; }
      table { width: 100%; border-collapse: collapse; font-size: 12px; margin-top: 10px; }
      th { background: #c49040; color: #15110f; text-align: left; font-size: 10px; font-weight: 800; letter-spacing: 0.1em; text-transform: uppercase; }
      th, td { border: 1px solid #d9cec1; padding: 8px 10px; vertical-align: top; }
      tr:nth-child(even) td { background: #fbf4ec; }
      .area-sketch { min-height: 160px; margin: 14px 0; display: grid; place-items: center; border: 1px dashed #c49040; background: linear-gradient(90deg,rgba(110,133,141,.10) 1px,transparent 1px),linear-gradient(rgba(110,133,141,.10) 1px,transparent 1px),#fbf4ec; background-size: 32px 32px; }
      .area-sketch > div { width: 60%; min-height: 86px; padding: 16px; border: 3px solid #c49040; background: rgba(196,144,64,.12); }
      .area-sketch span { color: #7a6548; font-size: 10px; font-weight: 800; letter-spacing: 0.1em; text-transform: uppercase; display: block; margin-bottom: 6px; }
      .area-sketch strong { display: block; color: #1c1713; font-size: 18px; margin-bottom: 4px; }
      .area-sketch p { color: #7a6548; font-size: 11px; margin: 0; }
      .note { background: #f9f2e8; border-left: 3px solid #c49040; padding: 12px 16px; margin-top: 10px; font-size: 12px; color: #4f463d; }
      .decision-box { margin-top: 18px; padding: 16px 18px; background: #15110f; color: #f2e8d4; border-left: 6px solid #c49040; font-weight: 800; line-height: 1.5; }
      .findings-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; margin-top: 16px; }
      .finding { padding: 14px; background: #f9f2e8; border: 1px solid #d7cab9; }
      .finding span { display: block; color: #c49040; font-size: 10px; font-weight: 900; letter-spacing: 0.12em; text-transform: uppercase; }
      .finding strong { display: block; margin-top: 8px; font-size: 13px; line-height: 1.45; }
      .split-two { display: grid; grid-template-columns: 0.85fr 1.15fr; gap: 16px; align-items: stretch; }
      .map-frame { position: relative; min-height: 260px; overflow: hidden; border: 1px solid #b8aa98; background: #e8e2d7; }
      .map-grid { position: absolute; inset: 0; background: linear-gradient(90deg,rgba(58,73,69,.12) 1px,transparent 1px),linear-gradient(rgba(58,73,69,.12) 1px,transparent 1px),radial-gradient(circle at 25% 40%,rgba(110,133,141,.32),transparent 18%),radial-gradient(circle at 76% 62%,rgba(196,144,64,.24),transparent 20%); background-size: 32px 32px,32px 32px,100% 100%,100% 100%; }
      .map-area-box { position: absolute; inset: 28px 42px 52px; border: 2px solid rgba(196,144,64,.9); background: rgba(196,144,64,.08); }
      .map-pin { position: absolute; width: 9px; height: 9px; margin: -4px 0 0 -4px; border-radius: 999px; box-shadow: 0 0 0 4px rgba(21,17,15,.10); }
      .map-pin-critical { background: #9b3d31; }
      .map-pin-triggered { background: #c49040; }
      .map-pin-context { background: #53676d; }
      .map-north { position: absolute; right: 18px; top: 16px; width: 30px; height: 30px; display: grid; place-items: center; background: #15110f; color: #c49040; font-weight: 900; }
      .map-scale { position: absolute; left: 18px; bottom: 62px; color: #15110f; font-size: 10px; font-weight: 800; }
      .map-scale span { display: block; width: 96px; height: 5px; margin-bottom: 4px; background: linear-gradient(90deg,#15110f 0 25%,#f2e8d4 25% 50%,#15110f 50% 75%,#f2e8d4 75% 100%); border: 1px solid #15110f; }
      .map-legend { position: absolute; top: 16px; left: 18px; display: grid; gap: 5px; padding: 8px 10px; background: rgba(255,250,242,.88); border: 1px solid #d7cab9; font-size: 10px; font-weight: 800; color: #4f463d; }
      .map-legend span { display: flex; align-items: center; gap: 6px; }
      .map-legend i { display: inline-block; width: 8px; height: 8px; border-radius: 999px; }
      .map-caption { position: absolute; left: 16px; right: 16px; bottom: 14px; display: flex; justify-content: space-between; gap: 18px; padding: 10px 12px; background: rgba(21,17,15,.88); color: #f2e8d4; font-size: 11px; }
      .map-caption strong { color: #c49040; }
      .map-image-frame { margin: 0; border: 1px solid #b8aa98; background: #fffaf2; }
      .map-image-frame img { display: block; width: 100%; height: auto; }
      .map-image-frame figcaption { padding: 10px 12px; color: #7a6548; font-size: 11px; line-height: 1.45; }
      .table-caption { margin-top: 8px; color: #7a6548; font-size: 11px; font-weight: 700; }
      .source-appendix table { font-size: 9px; }
      .source-appendix td, .source-appendix th { word-break: break-word; }
      @media print { body { background: white; } .cover, .kpi, .decision-box, .finding, th { print-color-adjust: exact; -webkit-print-color-adjust: exact; } table { page-break-inside: auto; } thead { display: table-header-group; } tr { page-break-inside: avoid; } }
    `;

    // â”€â”€ PATH-SPECIFIC BODY â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    let pathBody;

    // PATH 0 - Territory Briefing
    if (activeEntryPath === 0) {
      pathBody = `
      <section class="executive-section">
        ${sectionHeading("01", it ? "EXECUTIVE SUMMARY" : "EXECUTIVE SUMMARY")}
        <p>${it ? `La provincia selezionata mostra un livello di attenzione infrastrutturale ${classPriority(score).toLowerCase()} per nuovi interventi su ponti e pianificazione territoriale. Il segnale e guidato principalmente da ${dominantDriverPhrase}, documentati nel database ARCUS e supportati da ${workflowSourceCount} fonti collegate.` : `The selected province shows a ${classPriority(score).toLowerCase()} infrastructure attention level for new bridge interventions and territorial planning. The signal is mainly driven by ${dominantDriverPhrase}, documented in the ARCUS database and supported by ${workflowSourceCount} linked sources.`}</p>
        <div class="decision-box">${escapeHtml(decisionOutcome)}</div>
        <div class="findings-grid">
          ${topFindings.map((finding, index) => `<div class="finding"><span>${it ? "Finding" : "Finding"} ${index + 1}</span><strong>${escapeHtml(finding)}</strong></div>`).join("")}
        </div>
      </section>
      <section class="page-block">
        ${sectionHeading("02", it ? "SELECTED AREA & MAP" : "SELECTED AREA & MAP")}
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
          ${reportMapFrame}
        </div>
      </section>
      <section>
        ${sectionHeading("03", it ? "HOW TO READ THIS REPORT" : "HOW TO READ THIS REPORT")}
        <p>${it ? "ARCUS combina record storici di collasso, hazard pubblici, evidenza source-backed e analisi comparativa dei precedenti. Non produce una certificazione di sicurezza strutturale e non sostituisce ispezioni, verifiche progettuali o decisioni istituzionali." : "ARCUS combines historical collapse records, public hazards, source-backed evidence and comparative precedent analysis. It does not produce a structural safety certification and does not replace inspections, design checks or institutional decisions."}</p>
      </section>
      <section>
        ${sectionHeading("04", it ? "KEY INDICATORS" : "KEY INDICATORS")}
        <div class="kpis">
        <div class="kpi"><span>Priority index</span><strong>${score} / 100</strong>${formatKpi({ level: classPriority(score), driver: it ? `${workflowHazardExposure?.dominant_hazard || "hazard context"}, densita dei precedenti, eventi innescati e affidabilita evidenze.` : `${workflowHazardExposure?.dominant_hazard || "hazard context"}, precedent density, triggered-event concentration and evidence reliability.` })}</div>
        <div class="kpi"><span>${it ? "Affidabilita evidenze" : "Evidence reliability"}</span><strong>${Math.round(workflowReliability.average)} / 100</strong>${formatKpi({ level: reliabilityLabel, driver: it ? `${workflowSourceCount} fonti collegate e ${workflowReliability.institutionalShare}% evidenza professional-grade.` : `${workflowSourceCount} linked sources and ${workflowReliability.institutionalShare}% professional-grade evidence.` })}</div>
        <div class="kpi"><span>Failure precedent exposure</span><strong>${Math.round(workflowVulnerability.average)} / 100</strong>${formatKpi({ level: attentionClass(workflowVulnerability.average), driver: it ? `Pattern storico ${dominantCauseLabel}; indicatore source-backed, non certificazione strutturale.` : `Historical ${dominantCauseLabel} pattern; source-backed indicator, not structural certification.` })}</div>
        <div class="kpi"><span>${it ? "Eventi storici" : "Historical events"}</span><strong>${workflowEvents.length}</strong>${formatKpi({ level: `${percentage(dominantCauseCount, workflowEvents.length || 1)}% ${dominantCauseLabel}`, driver: it ? `${dominantCauseCount} occorrenze del driver dominante su ${workflowEvents.length} precedenti.` : `${dominantCauseCount} dominant-driver occurrences out of ${workflowEvents.length} precedents.` })}</div>
        </div>
      </section>
      <section>
        ${sectionHeading("05", it ? "HAZARD CONTEXT" : "HAZARD CONTEXT")}
        <p>${it ? `Layer dominante: <strong>${workflowHazardExposure?.dominant_hazard || "N/D"}</strong>. I layer WMS pubblici idraulici e franosi sono correlati ai crolli ARCUS nella provincia selezionata.` : `Dominant layer: <strong>${workflowHazardExposure?.dominant_hazard || "N/A"}</strong>. Public hydraulic and landslide WMS layers are correlated with ARCUS collapses in the selected province.`}</p>
        <table>
          <thead><tr><th>Layer</th><th>Score</th><th>${it ? "Crolli correlati" : "Matched collapses"}</th><th>Share</th></tr></thead>
          <tbody>${hazardRowsSafe}</tbody>
        </table>
        <p class="note">${escapeHtml(hazardInterpretation)}</p>
      </section>
      <section>
        ${sectionHeading("06", it ? "HISTORICAL EVIDENCE" : "HISTORICAL EVIDENCE")}
        <p>${it ? `Distribuzione delle cause ricorrenti nel contesto selezionato. I record non classificati sono mantenuti come contesto di precedente, cosi il totale resta coerente con i ${workflowEvents.length} eventi analizzati.` : `Distribution of recurring causes in the selected context. Unclassified records are retained as precedent context, so the total remains consistent with the ${workflowEvents.length} analysed events.`}</p>
        <table>
          <thead><tr><th>#</th><th>${it ? "Causa" : "Cause"}</th><th>${it ? "Occorrenze" : "Occurrences"}</th><th>Share</th></tr></thead>
          <tbody>${causeRows}</tbody>
        </table>
        <p class="note">${escapeHtml(historicalInterpretation)}</p>
      </section>
      <section>
        ${sectionHeading("07", it ? "PRIORITY EVENTS" : "PRIORITY EVENTS")}
        <table>
          <thead><tr><th>ID</th><th>${it ? "Comune" : "Municipality"}</th><th>${it ? "Severita" : "Severity"}</th><th>${it ? "Causa" : "Cause"}</th><th>${it ? "Evidenza" : "Evidence"}</th><th>${it ? "Attention indicator" : "Attention indicator"}</th><th>${it ? "Why flagged" : "Why flagged"}</th></tr></thead>
          <tbody>${eventRows}</tbody>
        </table>
        <p class="table-caption">${it ? "Nel corpo principale sono mostrati i primi 5 eventi. La tabella completa e disponibile negli export professionali." : "The main body shows the top 5 events. The full event table is available through professional exports."}</p>
        <p class="note">${escapeHtml(priorityInterpretation)}</p>
      </section>
      <section>
        ${sectionHeading("08", it ? "COMPARABLE PRECEDENTS" : "COMPARABLE PRECEDENTS")}
        <p>${it ? "Casi comparabili scomposti per causa, trigger, severita, contesto territoriale, affidabilita fonte e sovrapposizione hazard." : "Comparable cases decomposed by cause, trigger, severity, territorial context, source reliability and hazard overlap."}</p>
        <table>
          <thead><tr><th>${it ? "Similarity" : "Similarity"}</th><th>ID</th><th>${it ? "Comune" : "Municipality"}</th><th>${it ? "Causa" : "Cause"}</th><th>Trigger</th><th>${it ? "Severita" : "Severity"}</th><th>${it ? "Territorio" : "Territory"}</th><th>${it ? "Evidenza" : "Evidence"}</th><th>${it ? "Hazard overlap" : "Hazard overlap"}</th></tr></thead>
          <tbody>${similarRows || `<tr><td colspan="9">${it ? "Nessun precedente comparabile sufficientemente robusto per la provincia selezionata." : "No sufficiently robust comparable precedent for this selected province."}</td></tr>`}</tbody>
        </table>
        <p class="note">${escapeHtml(comparableInterpretation)}</p>
      </section>
      <section>
        ${sectionHeading("09", it ? "INTERPRETATION" : "INTERPRETATION")}
        <p>${it ? `Per nuovi interventi ${selectedProjectContext}, ARCUS segnala ${classPriority(score).toLowerCase()} per ${reportAreaLabel}. La lettura deriva da precedenti storici, contesto hazard e qualita dell'evidenza: non indica automaticamente una criticita strutturale, ma orienta le verifiche successive.` : `For new ${selectedProjectContext} interventions, ARCUS indicates ${classPriority(score).toLowerCase()} for ${reportAreaLabel}. The reading is derived from historical precedents, hazard context and evidence quality: it does not automatically indicate structural criticality, but guides follow-up checks.`}</p>
      </section>
      <section>
        ${sectionHeading("10", it ? "DECISION USE" : "DECISION USE")}
        <table>
          <thead><tr><th>${it ? "Can support" : "Can support"}</th><th>${it ? "Should not be used as" : "Should not be used as"}</th></tr></thead>
          <tbody><tr>
            <td>${it ? "screening territoriale preliminare, priorita di indagine, due diligence documentale, confronto con precedenti storici e impostazione di richieste tecniche successive." : "preliminary territorial screening, investigation priorities, documentary due diligence, comparison with historical precedents and framing of follow-up technical requests."}</td>
            <td>${it ? "certificazione di sicurezza strutturale, verifica progettuale, autorizzazione amministrativa, modello idraulico/geotecnico/sismico di dettaglio o sostituto di ispezioni in sito." : "structural safety certification, design verification, administrative authorisation, detailed hydraulic/geotechnical/seismic model or substitute for field inspections."}</td>
          </tr></tbody>
        </table>
      </section>
      <section>
        ${sectionHeading("11", it ? "RECOMMENDATIONS" : "RECOMMENDATIONS")}
        <ol>${recommendationRows}</ol>
      </section>
      <section>
        ${sectionHeading("12", it ? "NATIONAL BENCHMARK" : "NATIONAL BENCHMARK")}
        <table>
          <thead><tr><th>${it ? "Indicatore" : "Indicator"}</th><th>${it ? "Selezionato" : "Selected"}</th><th>${it ? "Media ARCUS" : "ARCUS average"}</th><th>Status</th></tr></thead>
          <tbody>${benchmarkRows}</tbody>
        </table>
        <p class="note">${escapeHtml(benchmarkInterpretation)}</p>
      </section>
      <section>
        ${sectionHeading("13", it ? "DATA COVERAGE & LIMITATIONS" : "DATA COVERAGE & LIMITATIONS")}
        <table>
          <thead><tr><th>${it ? "Elemento" : "Element"}</th><th>${it ? "Lettura operativa" : "Operational reading"}</th></tr></thead>
          <tbody>
            <tr><td>Spatial resolution</td><td>${it ? "Screening a livello provinciale basato sul confine amministrativo selezionato; non e site-specific salvo coordinate o asset forniti in workflow dedicati." : "Province-level screening based on the selected administrative boundary; not site-specific unless coordinates or assets are provided in dedicated workflows."}</td></tr>
            <tr><td>Hazard layers</td><td>${it ? "Layer WMS pubblici usati come contesto territoriale, non come modellazione locale idraulica, geotecnica o sismica di dettaglio." : "Public WMS layers used as territorial context, not as detailed local hydraulic, geotechnical or seismic modelling."}</td></tr>
            <tr><td>Historical records</td><td>${it ? "Basato su eventi di collasso documentati ARCUS e fonti collegate; non rappresenta tutte le condizioni strutturali esistenti." : "Based on documented ARCUS collapse events and linked sources; it does not represent all existing structural conditions."}</td></tr>
            <tr><td>Missing data</td><td>${it ? "Alcuni eventi possono non avere attributi tecnici completi, come tipologia del ponte, materiale o anno di costruzione." : "Some events may lack complete technical attributes such as bridge type, material or construction year."}</td></tr>
            <tr><td>Professional use</td><td>${it ? "Adatto a screening preliminare e prioritizzazione; richiede verifiche tecniche successive prima di decisioni progettuali o istituzionali." : "Suitable for preliminary screening and prioritisation; follow-up technical checks are required before design or institutional decisions."}</td></tr>
          </tbody>
        </table>
      </section>`;
    // PATH 1 â€” Operational Watchlist
      if (isBrief) {
        pathBody = `
        <section class="executive-section brief-page">
          ${sectionHeading("01", it ? "EXECUTIVE ONE-PAGE SUMMARY" : "EXECUTIVE ONE-PAGE SUMMARY")}
          <p>${it ? `La provincia selezionata mostra un livello di attenzione infrastrutturale ${classPriority(score).toLowerCase()} per nuovi interventi su ponti. Il segnale e guidato da ${dominantDriverPhrase}, ${workflowEvents.length} precedenti ARCUS e ${workflowSourceCount} fonti collegate.` : `The selected province shows a ${classPriority(score).toLowerCase()} infrastructure attention level for new bridge interventions. The signal is driven by ${dominantDriverPhrase}, ${workflowEvents.length} ARCUS precedents and ${workflowSourceCount} linked sources.`}</p>
          <div class="decision-box">${escapeHtml(decisionOutcome)}</div>
          <div class="findings-grid">
            ${topFindings.map((finding, index) => `<div class="finding"><span>${it ? "Finding" : "Finding"} ${index + 1}</span><strong>${escapeHtml(finding)}</strong></div>`).join("")}
          </div>
          <div class="kpis">
            <div class="kpi"><span>Priority index</span><strong>${score} / 100</strong>${formatKpi({ level: classPriority(score), driver: it ? `${workflowHazardExposure?.dominant_hazard || "hazard context"} e densita dei precedenti.` : `${workflowHazardExposure?.dominant_hazard || "hazard context"} and precedent density.` })}</div>
            <div class="kpi"><span>${it ? "Affidabilita evidenze" : "Evidence reliability"}</span><strong>${Math.round(workflowReliability.average)} / 100</strong>${formatKpi({ level: reliabilityLabel, driver: it ? `${workflowSourceCount} fonti collegate.` : `${workflowSourceCount} linked sources.` })}</div>
            <div class="kpi"><span>Failure precedent exposure</span><strong>${Math.round(workflowVulnerability.average)} / 100</strong>${formatKpi({ level: attentionClass(workflowVulnerability.average), driver: dominantCauseLabel })}</div>
            <div class="kpi"><span>${it ? "Eventi storici" : "Historical events"}</span><strong>${workflowEvents.length}</strong>${formatKpi({ level: `${percentage(dominantCauseCount, workflowEvents.length || 1)}% ${dominantCauseLabel}`, driver: it ? "Driver dominante del campione." : "Dominant sample driver." })}</div>
          </div>
        </section>
        <section>
          ${sectionHeading("02", it ? "MAP & FOLLOW-UP ACTIONS" : "MAP & FOLLOW-UP ACTIONS")}
          <div class="split-two">
            ${reportMapFrame}
            <div>
              <p>${escapeHtml(hazardInterpretation)}</p>
              <ol>${recommendationRows}</ol>
            </div>
          </div>
        </section>`;
      }
    } else if (activeEntryPath === 1) {
      const p1Count = assetScreening.filter((a) => a.priority === "Priority 1").length;
      const p2Count = assetScreening.filter((a) => a.priority === "Priority 2").length;
      const assetTableRows = assetScreening
        .map((asset) => `<tr>
          <td>${escapeHtml(asset.name || asset.asset_id)}</td>
          <td><strong>${escapeHtml(asset.priority)}</strong></td>
          <td>${escapeHtml(asset.topCause || "-")}</td>
          <td>${asset.score || 0}</td>
          <td>${escapeHtml(asset.province || "-")}</td>
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
        <div class="kpi"><span>Priority 1</span><strong>${p1Count}</strong></div>
        <div class="kpi"><span>Priority 2</span><strong>${p2Count}</strong></div>
        <div class="kpi"><span>${it ? "Segnali monitoraggio" : "Monitoring signals"}</span><strong>${monitoringSignals.length}</strong></div>
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
        <p>${it ? "Prioritizzazione automatica basata su esposizione territoriale, crolli storici vicini e meccanismi di collasso dominanti." : "Automatic prioritisation based on territorial exposure, nearby historical collapses and dominant failure mechanisms."}</p>
        <table>
          <thead><tr><th>${it ? "Asset" : "Asset"}</th><th>Priority</th><th>${it ? "Causa principale" : "Top cause"}</th><th>Score</th><th>${it ? "Provincia" : "Province"}</th></tr></thead>
          <tbody>${assetTableRows}</tbody>
        </table>
      </section>` : ""}
      ${monitoringSignals.length > 0 ? `<section>
        <h2>${it ? "CANDIDATI ALL'ISPEZIONE" : "INSPECTION CANDIDATES"}</h2>
        <p>${it ? "Asset con segnali di attenzione derivati da crolli totali, vulnerabilitÃ  critica o impatto umano nel territorio." : "Assets with attention signals derived from total collapses, critical vulnerability or human impact in the territory."}</p>
        <table>
          <thead><tr><th>ID</th><th>${it ? "Comune" : "Municipality"}</th><th>Level</th><th>${it ? "Segnali" : "Signals"}</th></tr></thead>
          <tbody>${monitoringTableRows}</tbody>
        </table>
      </section>` : ""}`;

    // PATH 2 â€” Scenario Briefing
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
        <div class="note">${it ? "Questo briefing di scenario Ã¨ basato sui precedenti storici ARCUS, non su modelli previsionali." : "This scenario briefing is based on ARCUS historical precedents, not predictive models."}</div>
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
          <thead><tr><th>ID</th><th>${it ? "Comune" : "Municipality"}</th><th>${it ? "SeveritÃ " : "Severity"}</th><th>${it ? "Causa" : "Cause"}</th><th>${it ? "Similitudine" : "Similarity"}</th></tr></thead>
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

    // PATH 3 â€” Due Diligence Package
    } else if (activeEntryPath === 3) {
      const tcCount = workflowEvents.filter((e) => e.collapse_severity === "TC").length;
      const triggeredCount = workflowEvents.filter((e) => e.triggered).length;

      pathBody = `
      <div class="kpis">
        <div class="kpi"><span>Priority index</span><strong>${score}</strong></div>
        <div class="kpi"><span>${it ? "AffidabilitÃ  evidenze" : "Evidence reliability"}</span><strong>${Math.round(workflowReliability.average)}</strong></div>
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
        <h2>${it ? "RAPPORTO TECNICO â€” CONTESTO INFRASTRUTTURALE" : "TECHNICAL REPORT â€” INFRASTRUCTURE CONTEXT"}</h2>
        <table>
          <thead><tr><th>${it ? "Indicatore" : "Indicator"}</th><th>${it ? "Valore" : "Value"}</th></tr></thead>
          <tbody>
            <tr><td>${it ? "Territorio" : "Territory"}</td><td>${escapeHtml(reportAreaLabel)}</td></tr>
            <tr><td>${it ? "Events totali ARCUS" : "Total ARCUS events"}</td><td>${workflowEvents.length}</td></tr>
            <tr><td>${it ? "Hazard dominante" : "Dominant hazard"}</td><td>${escapeHtml(workflowHazardExposure?.dominant_hazard || "-")}</td></tr>
            <tr><td>${it ? "Causa dominante" : "Dominant cause"}</td><td>${escapeHtml(selectedProvinceDrivers.causes[0]?.label || "-")}</td></tr>
            <tr><td>Priority index</td><td>${score}</td></tr>
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
          <thead><tr><th>ID</th><th>${it ? "Comune" : "Municipality"}</th><th>${it ? "SeveritÃ " : "Severity"}</th><th>${it ? "Causa" : "Cause"}</th><th>${it ? "Evidenza" : "Evidence"}</th><th>${it ? "VulnerabilitÃ " : "Vulnerability"}</th></tr></thead>
          <tbody>${eventRows}</tbody>
        </table>
      </section>
      <section>
        <h2>${it ? "APPENDICE â€” BENCHMARK NAZIONALE" : "APPENDIX â€” NATIONAL BENCHMARK"}</h2>
        <table>
          <thead><tr><th>${it ? "Indicatore" : "Indicator"}</th><th>${it ? "Selezionato" : "Selected"}</th><th>${it ? "Media ARCUS" : "ARCUS average"}</th><th>Status</th></tr></thead>
          <tbody>${benchmarkRows}</tbody>
        </table>
      </section>`;

    // PATH 4 â€” Research Output
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
          <thead><tr><th>ID</th><th>${it ? "Comune" : "Municipality"}</th><th>${it ? "Anno" : "Year"}</th><th>${it ? "SeveritÃ " : "Severity"}</th><th>${it ? "Causa" : "Cause"}</th><th>Grade</th></tr></thead>
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
    <span>ARCUS Professional - preliminary screening output</span>
    <span>${escapeHtml(reportId)}</span>
  </div>
  <header class="cover">
    <div>
      <div class="brand">ARCUS</div>
      <div class="path-badge">PATH ${pathMeta.num} - ${escapeHtml(pathMeta.name)}</div>
      <h1>${escapeHtml(isBrief ? `${pathMeta.doc} - One-Page Brief` : `${pathMeta.doc}: ${reportAreaLabel}`)}</h1>
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
    ${activeEntryPath === 0 && !isBrief ? `${methodologySection}${sourceAppendixSection}` : activeEntryPath === 0 ? "" : scoringSection}
  </main>
</body>
</html>`;
  };

  const openProfessionalReportPrintView = (
    variant = "full"
  ) => {
    if (!selectedProvinceProfile) {
      return;
    }

    const html = buildProfessionalReportHtml({
      variant,
    });
    const printableWindow = window.open(
      "",
      "_blank"
    );

    if (!printableWindow) {
    const filename = `arcus-professional-${variant}-pdf-ready-${(activeEntryPath !== 0 && manualAreaBounds ? manualAreaLabel : selectedProvinceProfile.territory)
        .toLowerCase()
        .replaceAll(" ", "-")}.html`;

      downloadFile(
        filename,
        html,
        "text/html;charset=utf-8"
      );

      return;
    }

    printableWindow.document.open();
    printableWindow.document.write(
      html.replace(
        "</body>",
        `<script>window.addEventListener("load",function(){setTimeout(function(){window.print();},350);});</script></body>`
      )
    );
    printableWindow.document.close();
  };

  const downloadProfessionalReport = () => {
    openProfessionalReportPrintView("full");
  };

  const downloadOnePageBrief = () => {
    openProfessionalReportPrintView("brief");
  };

  const exportProvinceReport = () => {
    if (!selectedProvinceProfile) {
      return;
    }

    const rows = workflowEvents.map(
      (event) => {
        const sourceCount =
          sourceCountByEvent[event.event_id] || 0;
        const reliability =
          reliabilityByEvent[event.event_id];
        const vulnerability =
          vulnerabilityByEvent[event.event_id];
        const action =
          event.collapse_severity === "TC" ||
          Number(event.victims) > 0 ||
          Number(event.injuries) > 0 ||
          vulnerability?.className === "Critical"
            ? "Immediate review"
            : sourceCount < 3 ||
                reliability?.grade === "D"
              ? "Evidence enrichment"
              : "Monitoring";

        return {
          action,
          cause: event.specific_cause,
          event_id: event.event_id,
          municipality: event.municipality,
          province: event.province,
          region: event.region,
          score:
            selectedProvinceProfile.scenarioScore ||
            selectedProvinceProfile.riskScore,
          reliability_class:
            reliability?.grade || "",
          reliability_label:
            reliability?.label || "",
          reliability_score:
            reliability?.score || 0,
          severity: event.collapse_severity,
          sources: sourceCount,
          triggered: event.triggered,
          vulnerability_class:
            vulnerability?.className || "",
          vulnerability_score:
            vulnerability?.score || 0,
        };
      }
    );

    const columns = [
      "province",
      "score",
      "event_id",
      "municipality",
      "region",
      "severity",
      "cause",
      "triggered",
      "sources",
      "reliability_score",
      "reliability_class",
      "reliability_label",
      "vulnerability_score",
      "vulnerability_class",
      "action",
    ];

    exportRowsAsCsv(
      `arcus-professional-${selectedProvinceProfile.territory}.csv`,
      columns,
      rows
    );
  };

  const exportSourceTable = () => {
    const rows = workflowEvents.flatMap((event) =>
      (sourcesByEventMap[event.event_id] || []).map(
        (source) => ({
          access_date: source.access_date,
          event_id: event.event_id,
          municipality: event.municipality,
          publication_date: source.publication_date,
          source_id: source.source_id,
          source_role: source.source_role,
          source_title: source.source_title,
          source_type: source.source_type,
          source_url: source.source_url,
        })
      )
    );

    exportRowsAsCsv(
      `arcus-professional-sources-${manualAreaLabel
        .toLowerCase()
        .replaceAll(" ", "-")}.csv`,
      [
        "event_id",
        "municipality",
        "source_id",
        "source_title",
        "source_type",
        "source_role",
        "publication_date",
        "access_date",
        "source_url",
      ],
      rows
    );
  };

  const exportGisPackage = () => {
    const features = [];

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
    const blob = new Blob([content], {
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
      "asset_id",
      "name",
      "municipality",
      "province",
      "region",
      "latitude",
      "longitude",
      "structural_type",
      "material_type",
      "construction_year",
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
        "Beam bridge",
        "Reinforced concrete",
        "1965",
      ],
      [
        "BR-002",
        "Viadotto esempio",
        "Genova",
        "Genova",
        "Liguria",
        "44.4056",
        "8.9463",
        "Truss bridge",
        "Steel",
        "1972",
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
   <Row>${spreadsheetCell("3", "Section")}${spreadsheetCell("Carica in ARCUS", "Cell")}${spreadsheetCell("La piattaforma produce ranking, priorita, casi comparabili e segnali di vulnerabilita.", "Cell")}</Row>
   <Row><Cell ss:MergeAcross="2"/></Row>
   <Row ss:Height="30">${spreadsheetCell("Field guide", "Section", "String", 2)}</Row>
   <Row>${spreadsheetCell("Required", "Section")}${spreadsheetCell("asset_id, name, province, region", "Cell")}${spreadsheetCell("Sono i campi minimi per lo screening territoriale.", "Cell")}</Row>
   <Row>${spreadsheetCell("Recommended", "Section")}${spreadsheetCell("latitude, longitude", "Cell")}${spreadsheetCell("Consentono ad ARCUS di trovare eventi entro 35 km. Usa coordinate decimali con punto.", "Cell")}</Row>
   <Row>${spreadsheetCell("Technical", "Section")}${spreadsheetCell("structural_type, material_type, construction_year", "Cell")}${spreadsheetCell("Migliorano gli indicatori con informazioni su tipologia, materiale ed eta infrastrutturale.", "Cell")}</Row>
  </Table>
 </Worksheet>
 <Worksheet ss:Name="Asset_Data">
  <Table id="asset-data">
   <Column ss:Width="85"/><Column ss:Width="170"/><Column ss:Width="130"/><Column ss:Width="130"/><Column ss:Width="115"/><Column ss:Width="90"/><Column ss:Width="90"/><Column ss:Width="145"/><Column ss:Width="145"/><Column ss:Width="105"/>
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
      asset_id: item.id,
      comparable_events:
        item.comparableEvents.length,
      high_vulnerability_matches:
        item.highVulnerabilityMatches,
      name: item.name,
      dominant_hazard:
        item.dominantHazard || "",
      hazard_score: item.hazardScore || 0,
      nearby_events: item.nearbyEvents.length,
      priority: item.priority,
      score: item.score,
      territory: item.territory,
      top_cause: item.topCause,
    }));

    downloadFile(
      "arcus-asset-screening-results.xls",
      buildAssetScreeningWorkbook(rows),
      "application/vnd.ms-excel;charset=utf-8"
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

  const persistWorkspaces = (items) => {
    setSavedWorkspaces(items);
    window.localStorage.setItem(
      "arcus-professional-workspaces",
      JSON.stringify(items)
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

    const snapshot = {
      ...buildWorkspaceSnapshot(),
      id: `workspace-${Date.now()}`,
    };

    persistWorkspaces([
      snapshot,
      ...savedWorkspaces,
    ]);
    setWorkspaceName("");
  };

  const deleteWorkspace = (id) => {
    persistWorkspaces(
      savedWorkspaces.filter(
        (workspace) => workspace.id !== id
      )
    );
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
              "Valuta contesto territoriale e infrastrutturale prima di progettazione, scelta localizzativa o due diligence preliminare.",
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
              "Prioritizza monitoraggi, sopralluoghi e approfondimenti su un inventario di ponti o asset infrastrutturali.",
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
            label: "03 / Evento estremo",
            lead:
              "Analizza esposizione e precedenti in scenari idraulici, sismici, franosi o multi-hazard.",
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
            label: "04 / Due diligence",
            lead:
              "Supporta valutazioni tecniche per investimenti, acquisizioni, concessioni e assessment preliminari.",
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
            label: "05 / Ricerca e intelligence",
            lead:
              "Usa ARCUS come infrastruttura analitica per ricerca, policy, statistiche e report evidence-based.",
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
              "Evaluate territorial and infrastructure context before design, site selection or preliminary due diligence.",
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
              "Prioritize monitoring, inspections and deeper investigations on a bridge or infrastructure inventory.",
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
            label: "03 / Extreme event",
            lead:
              "Understand exposure and historical precedents for hydraulic, seismic, landslide or multi-hazard scenarios.",
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
            label: "04 / Due diligence",
            lead:
              "Support technical evaluations for investments, acquisitions, concessions and preliminary assessments.",
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
            label: "05 / Research intelligence",
            lead:
              "Use ARCUS as an analytical infrastructure for research, policy, statistics and evidence-based reporting.",
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
          ["Atlas", "Open, Professional ed Enterprise differenziati per layer e linguaggio.", "3 livelli"],
          ["Export", "Template, screening asset, report e watchlist in formato tabellare.", "Excel/CSV"],
          ["Governance", "Model cards, limiti dichiarati, qualita dati e audit trail visibili.", `${modelCards.length} model cards`],
        ]
      : [
          ["Dataset", "Events, sources, release and data dictionary generated.", dataRelease?.version ? `v${dataRelease.version}` : "Ready"],
          ["Atlas", "Open, Professional and Enterprise differentiated by layers and language.", "3 tiers"],
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
  const projectContextOptions =
    language === "it"
      ? [
          ["bridge", "Ponte"],
          ["road", "Attraversamento stradale"],
          ["railway", "Attraversamento ferroviario"],
          ["urban", "Infrastruttura urbana"],
        ]
      : [
          ["bridge", "Bridge"],
          ["road", "Road crossing"],
          ["railway", "Railway crossing"],
          ["urban", "Urban infrastructure"],
        ];
  const selectedProjectContext =
    projectContextOptions.find(
      ([value]) => value === projectContext
    )?.[1] || projectContextOptions[0][1];
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
      layers: "aree_peric_idraulica_p3",
      opacity: 0.34,
      url: "https://sdi.isprambiente.it/geoserver/nz1/wms",
    },
    {
      attribution:
        "ISPRA IdroGEO - Inventario Fenomeni Franosi in Italia",
      id: "professional-ispra-landslides",
      layers: "frane",
      opacity: 0.38,
      url: "https://idrogeo.isprambiente.it/geoserver/idrogeo/frane/ows",
    },
  ];
  const professionalWorkflowActions =
    language === "it"
      ? [
          [
            {
              href: "#professional-risk-score",
              stage: "01",
              title: "Seleziona provincia",
              text: "Scegli la provincia da analizzare per il contesto di nuovi ponti o pianificazione territoriale.",
            },
            {
              href: "#professional-scenarios",
              scenario: "baseline",
              stage: "02",
              title: "Definisci contesto progetto",
              text: "Specifica se stai valutando ponte, attraversamento stradale, ferrovia o infrastruttura urbana.",
            },
            {
              href: "#professional-external-layers",
              stage: "03",
              title: "Attiva contesto hazard",
              text: "Sovrapponi WMS idraulico, frane, sismicita ufficiale e crolli storici ARCUS.",
            },
            {
              href: "#professional-similarity",
              stage: "04",
              title: "Leggi evidenza storica",
              text: "Evidenzia crolli vicini, cause ricorrenti, stagionalita e trigger storici.",
            },
            {
              href: "#professional-report",
              stage: "05",
              title: "Genera province briefing",
              text: "Esporta briefing provinciale, hazard summary, precedenti e note preliminari.",
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
              text: "Vai al template Excel e importa ponti o asset da monitorare.",
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
              title: "Associa asset al territorio",
              text: "ARCUS collega ogni asset a esposizione hazard e contesto territoriale.",
            },
            {
              href: "#professional-assets",
              stage: "03",
              title: "Confronta con collassi storici",
              text: "Confronta gli asset caricati con crolli simili per tipologia, causa e contesto.",
            },
            {
              href: "#professional-similarity",
              stage: "04",
              title: "Prioritizza asset",
              text: "Genera indicatori spiegabili di priorita infrastrutturale.",
            },
            {
              href: "#professional-monitoring",
              stage: "05",
              title: "Esporta watchlist",
              text: "Esporta liste prioritarie, casi comparabili, GIS export e sintesi operative.",
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
              title: "Select province",
              text: "Choose the province to screen for new bridge or territorial planning context.",
            },
            {
              href: "#professional-scenarios",
              scenario: "baseline",
              stage: "02",
              title: "Define project context",
              text: "Specify whether you are evaluating a bridge, road crossing, railway crossing or urban infrastructure.",
            },
            {
              href: "#professional-external-layers",
              stage: "03",
              title: "Activate hazard context",
              text: "Overlay hydraulic WMS, landslide WMS, seismic context and ARCUS historical collapses.",
            },
            {
              href: "#professional-similarity",
              stage: "04",
              title: "Read historical evidence",
              text: "Highlight nearby collapses, recurring causes, seasonal patterns and historical triggers.",
            },
            {
              href: "#professional-report",
              stage: "05",
              title: "Generate province briefing",
              text: "Export province-based assessment, hazard summary, precedents and preliminary notes.",
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
              text: "Go to the Excel template and import bridges or assets to monitor.",
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
              title: "Match assets with territory",
              text: "ARCUS associates each asset with hazard exposure and territorial context.",
            },
            {
              href: "#professional-assets",
              stage: "03",
              title: "Compare with historical failures",
              text: "Compare uploaded assets with similar collapses by typology, cause and context.",
            },
            {
              href: "#professional-similarity",
              stage: "04",
              title: "Prioritize assets",
              text: "Generate explainable infrastructure priority indicators.",
            },
            {
              href: "#professional-monitoring",
              stage: "05",
              title: "Export watchlist",
              text: "Export priority lists, comparable cases, GIS outputs and operational summaries.",
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
    setActiveWorkflowStep(0);
    setManualAreaBounds(null);
  };

  const activeWorkflowAction =
    professionalWorkflowActions[activeWorkflowStep] ||
    professionalWorkflowActions[0];

  const pathPacketRows =
    language === "it"
      ? [
          [
            "Path",
            activePath.label.replace(/^\d+\s\/\s/, ""),
          ],
          [
            "Territorio",
            manualAreaLabel,
          ],
          [
            "Contesto progetto",
            selectedProjectContext,
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
            workflowHazardExposure?.dominant_hazard ||
              "-",
          ],
          [
            "Precedenti",
            `${selectedSimilarEvents.length || selectedProvinceEvents.length} disponibili`,
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
            "Territory",
            manualAreaLabel,
          ],
          [
            "Project context",
            selectedProjectContext,
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
            workflowHazardExposure?.dominant_hazard ||
              "-",
          ],
          [
            "Precedents",
            `${selectedSimilarEvents.length || selectedProvinceEvents.length} available`,
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
                accept=".csv,.json"
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
                  setSelectedProvince(event.target.value)
                }
                value={
                  selectedProvinceProfile?.territory ||
                  ""
                }
              >
                {scenarioProvinceProfiles.map((profile) => (
                  <option
                    key={profile.territory}
                    value={profile.territory}
                  >
                    {profile.territory} -{" "}
                    {profile.scenarioScore ||
                      profile.riskScore}
                  </option>
                ))}
              </select>
            </label>

            <div>
              <b>
                {language === "it"
                  ? activeEntryPath !== 0 && manualAreaBounds
                    ? "Area manuale"
                    : "Indice attuale"
                  : activeEntryPath !== 0 && manualAreaBounds
                    ? "Manual area"
                    : "Current index"}
              </b>
              <strong>
                {activeEntryPath !== 0 && manualAreaBounds
                  ? manualAreaEvents.length
                  : selectedProvinceProfile?.scenarioScore ||
                    selectedProvinceProfile?.riskScore ||
                    0}
              </strong>
              <em>
                {activeEntryPath !== 0 && manualAreaBounds
                  ? manualAreaLabel
                  : selectedProvinceProfile?.topCause ||
                    "-"}
              </em>
            </div>
          </div>

          <div className="platform-map-selection-tools">
            <p>
              {activeEntryPath === 0
                ? language === "it"
                  ? "Path 01 lavora a livello provinciale per produrre un briefing preliminare coerente e confrontabile."
                  : "Path 01 works at province level to produce a consistent and comparable preliminary briefing."
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
              onSelectionBoundsChange={
                activeEntryPath === 0
                  ? undefined
                  : setManualAreaBounds
              }
              selectionBounds={
                activeEntryPath === 0
                  ? null
                  : manualAreaBounds
              }
              selectionEnabled={activeEntryPath !== 0}
              selectionLabel={manualAreaLabel}
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
                  ? "Priority index"
                  : "Priority index"}
              </span>
              <strong>
                {activeEntryPath !== 0 && manualAreaBounds
                  ? manualAreaEvents.length
                  : selectedProvinceProfile?.scenarioScore ||
                    selectedProvinceProfile?.riskScore ||
                    0}
              </strong>
              <p>
                {activeEntryPath !== 0 && manualAreaBounds
                  ? manualAreaLabel
                  : selectedProvinceProfile?.territory ||
                    "-"}
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

            <div className="platform-context-options">
              {projectContextOptions.map(
                ([value, label]) => (
                  <button
                    className={
                      projectContext === value
                        ? "active"
                        : ""
                    }
                    key={value}
                    onClick={() =>
                      setProjectContext(value)
                    }
                    type="button"
                  >
                    {label}
                  </button>
                )
              )}
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
                    ? "Contesto progetto"
                    : "Project context"}
                </span>
                <strong
                  style={{
                    fontSize: "18px",
                    lineHeight: "1.2",
                    marginTop: "10px",
                  }}
                >
                  {selectedProjectContext}
                </strong>
                <p>
                  {language === "it"
                    ? "Usato nelle note del briefing"
                    : "Used in briefing notes"}
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

            <div className="platform-workflow-map">
              <CollapseMap
                filteredEvents={workflowEvents}
                height="360px"
                professionalMode
                publicWmsOverlays={
                  professionalWmsOverlays
                }
                selectionBounds={manualAreaBounds}
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
            {(workflowHazardExposure?.hazards || [])
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
                <article key={asset.asset_id}>
                  <div>
                    <strong>{asset.name}</strong>
                    <span>{asset.province}</span>
                  </div>
                  <div>
                    <b>{asset.priority_score}</b>
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
      // Path 0 â€” New Territory: Read Historical Evidence
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
                .slice(0, 2)
                .map((item) => (
                  <article key={item.label}>
                    <span>
                      {language === "it"
                        ? "Causa ricorrente"
                        : "Recurring cause"}
                    </span>
                    <strong>{item.value}</strong>
                    <p>{item.label}</p>
                  </article>
                ))}

              <article>
                <span>
                  {language === "it"
                    ? "Pattern innescato"
                    : "Triggered pattern"}
                </span>
                <strong>
                  {percentage(
                    selectedProvinceProfile?.triggered || 0,
                    selectedProvinceProfile?.total || 1
                  )}%
                </strong>
                <p>
                  {language === "it"
                    ? "eventi con trigger esterno"
                    : "events with external trigger"}
                </p>
              </article>

              <article>
                <span>
                  {language === "it"
                    ? "Affidabilita fonti"
                    : "Evidence reliability"}
                </span>
                <strong>
                  {Math.round(workflowReliability.average)}
                </strong>
                <p>
                  {workflowReliability.institutionalShare}%{" "}
                  professional-grade
                </p>
              </article>
            </div>

            <div className="platform-table">
              {(selectedSimilarEvents.length
                ? selectedSimilarEvents
                : workflowEvents
              )
                .slice(0, 3)
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

      // Path 1 â€” Existing Assets: Prioritize Assets
      if (activeEntryPath === 1) {
        const p1Count = assetScreening.filter(
          (item) => item.priority === "Priority 1"
        ).length;
        const p2Count = assetScreening.filter(
          (item) => item.priority === "Priority 2"
        ).length;

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
                <span>Priority 1</span>
                <strong>{p1Count}</strong>
                <p>
                  {language === "it"
                    ? "attenzione immediata"
                    : "immediate attention"}
                </p>
              </article>

              <article>
                <span>Priority 2</span>
                <strong>{p2Count}</strong>
                <p>
                  {language === "it"
                    ? "monitoraggio attivo"
                    : "active monitoring"}
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

              <article>
                <span>
                  {language === "it"
                    ? "Gap tecnici"
                    : "Technical gaps"}
                </span>
                <strong>
                  {assetInventoryAudit.total -
                    assetInventoryAudit.technical}
                </strong>
                <p>
                  {language === "it"
                    ? "asset senza dati tecnici"
                    : "assets missing technical data"}
                </p>
              </article>
            </div>

            {assetScreening.length > 0 && (
              <div className="platform-table">
                {assetScreening.slice(0, 3).map((item) => (
                  <article key={item.id}>
                    <div>
                      <strong>{item.name}</strong>
                      <span>
                        {item.priority} â€” {item.topCause}
                      </span>
                    </div>
                    <div>
                      <b>{item.score}</b>
                      <span>{copy.screeningScore}</span>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </div>
        );
      }

      // Paths 2, 3, 4 â€” Compare / Identify Patterns / Build Evidence Set
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

    // Final step â€” path-specific export panel
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
            "Priority 1",
            `${
              assetScreening.filter(
                (item) => item.priority === "Priority 1"
              ).length
            } assets`,
          ],
          [
            language === "it"
              ? "Segnali monitoraggio"
              : "Monitoring signals",
            String(monitoringSignals.length),
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
                  label: copy.assetExport,
                  onClick: exportAssetScreening,
                },
              ]
            : []),
          ...(monitoringSignals.length > 0
            ? [
                {
                  label: copy.monitoringExport,
                  onClick: exportMonitoringWatchlist,
                },
              ]
            : []),
          {
            label: copy.downloadReport,
            onClick: downloadProfessionalReport,
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
            `${Math.round(workflowReliability.average)}/100`,
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
      className="platform-page professional-compact-mode"
      id="main-content"
    >
      <PageMeta
        title="ARCUS Professional"
        description={copy.description}
      />

      <Navbar />

      <section className="platform-hero">
        <div className="platform-grid" />

        <div className="platform-container">
          <div className="platform-label">
            {copy.heroLabel}
          </div>

          <h1>{copy.heroTitle}</h1>
          <p>{copy.description}</p>

          <div className="platform-actions">
            <a href="#professional-workflow">
              {language === "it"
                ? "Scegli workflow"
                : "Choose workflow"}
            </a>
            <Link to="/plans">
              {language === "it"
                ? "Confronta piani"
                : "Compare plans"}
            </Link>
            <Link to="/atlas?mode=professional">
              {copy.atlas}
            </Link>
          </div>

          <div className="platform-kpis">
            <div>
              <strong>
                {formatValue(events.length)}
              </strong>
              <span>{copy.kpiEvents}</span>
            </div>
            <div>
              <strong>{profiles.length}</strong>
              <span>{copy.kpiRegions}</span>
            </div>
            <div>
              <strong>
                {formatValue(sources.length)}
              </strong>
              <span>{copy.kpiSources}</span>
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
          <div className="platform-use-case-header">
            <div>
              <div className="platform-label">
                {language === "it"
                  ? "CASI OPERATIVI"
                  : "OPERATIONAL USE CASES"}
              </div>

              <h2>
                {language === "it"
                  ? "Scegli il path operativo piu vicino al tuo caso."
                  : "Choose the operational path closest to your case."}
              </h2>
            </div>

            <p>
              {language === "it"
                ? "Professional non e una mappa premium: e un workspace di infrastructure intelligence costruito intorno a evidenza storica, correlazione hazard, analytics spiegabili e contesto territoriale."
                : "Professional is not a premium map subscription: it is an infrastructure intelligence workspace built around historical evidence, hazard correlation, explainable analytics and territorial context."}
            </p>
          </div>

          <div className="platform-use-case-grid">
            {professionalUseCases.map((item, index) => (
              <article
                className={
                  activeEntryPath === index
                    ? "active"
                    : ""
                }
                key={item.label}
              >
                <span>{item.label}</span>
                <p>{item.lead}</p>

                <div>
                  {item.steps.map((step) => (
                    <em key={step}>{step}</em>
                  ))}
                </div>

                <button
                  aria-label={`${item.label}: ${
                    language === "it"
                      ? "seleziona path"
                      : "select path"
                  }`}
                  onClick={() =>
                    resetProfessionalPath(index)
                  }
                  type="button"
                >
                  {language === "it"
                    ? "Seleziona path"
                    : "Select path"}
                </button>
              </article>
            ))}
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

              <div>
                {professionalWorkflowActions.map(
                  (action, index) => (
                    <button
                      className={
                        activeWorkflowStep === index
                          ? "active"
                          : ""
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
                    professionalWorkflowActions.length - 1
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
                      setSelectedProvince("");
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
                      setSelectedProvince(
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
              filteredEvents={selectedProvinceEvents}
              height="560px"
              sidebarOpen={false}
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
                        <span>{item.priority}</span>
                        <strong>{item.name}</strong>
                        <p>
                          {item.territory} -{" "}
                          {item.topCause} -{" "}
                          {item.dominantHazard ||
                            "hazard n/a"}
                        </p>
                      </div>

                      <div>
                        <b>{item.score}</b>
                        <em>{copy.screeningScore}</em>
                      </div>
                    </article>
                  ))}
              </div>

              <div className="platform-asset-detail">
                <span>{copy.topAsset}</span>
                <h3>{assetScreening[0].name}</h3>

                <div className="platform-asset-score">
                  {assetScreening[0].score}
                </div>

                <div className="platform-asset-hazard">
                  <span>{copy.assetHazard}</span>
                  <strong>
                    {assetScreening[0].dominantHazard ||
                      "-"}
                  </strong>
                  <b>
                    {assetScreening[0].hazardScore || 0}
                  </b>
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
              <a
                href="/data/professional/api-manifest.json"
                target="_blank"
                rel="noreferrer"
              >
                /data/professional/api-manifest.json
              </a>
            </div>
          </div>

          <div className="platform-api-grid">
            {(apiManifest?.endpoints || [
              {
                description:
                  "Curated bridge-collapse events enriched with professional models.",
                path: "/data/professional/professional-events.json",
                resource: "professional_events",
              },
              {
                description:
                  "Regional and provincial risk profiles.",
                path: "/data/professional/territory-profiles.json",
                resource: "territory_profiles",
              },
              {
                description:
                  "Event-level evidence reliability scores.",
                path: "/data/professional/event-reliability.json",
                resource: "event_reliability",
              },
              {
                description:
                  "Event-level vulnerability scores.",
                path: "/data/professional/event-vulnerability.json",
                resource: "event_vulnerability",
              },
            ]).map((endpoint) => (
              <article key={endpoint.resource}>
                <span>{endpoint.resource}</span>
                <p>{endpoint.description}</p>
                <a
                  href={endpoint.path}
                  target="_blank"
                  rel="noreferrer"
                >
                  {endpoint.path}
                </a>
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

            <a
              href="/data/professional/model-cards.json"
              target="_blank"
              rel="noreferrer"
            >
              /data/professional/model-cards.json
            </a>
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
              <a
                href="/data/professional/data-quality.json"
                target="_blank"
                rel="noreferrer"
              >
                /data/professional/data-quality.json
              </a>
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

            <a
              href="/data/professional/data-dictionary.json"
              target="_blank"
              rel="noreferrer"
            >
              /data/professional/data-dictionary.json
            </a>
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
              <a
                href="/data/professional/data-release.json"
                target="_blank"
                rel="noreferrer"
              >
                /data/professional/data-release.json
              </a>
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

            <a
              href="/data/professional/external-hazard-layers.json"
              target="_blank"
              rel="noreferrer"
            >
              /data/professional/external-hazard-layers.json
            </a>
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
              <a
                href="/data/professional/hazard-exposure-preview.json"
                target="_blank"
                rel="noreferrer"
              >
                /data/professional/hazard-exposure-preview.json
              </a>
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
              type="button"
              onClick={printProfessionalReport}
            >
              {language === "it"
                ? "Download Full PDF"
                : "Download Full PDF"}
            </button>

            <button
              type="button"
              onClick={downloadOnePageBrief}
            >
              {language === "it"
                ? "One-Page Brief"
                : "One-Page Brief"}
            </button>

            <button
              type="button"
              onClick={exportProvinceReport}
            >
              {language === "it"
                ? "Event Table"
                : "Event Table"}
            </button>

            <button
              type="button"
              onClick={exportSourceTable}
            >
              {language === "it"
                ? "Source Table"
                : "Source Table"}
            </button>

            <button
              type="button"
              onClick={exportGisPackage}
            >
              {language === "it"
                ? "GIS Package"
                : "GIS Package"}
            </button>
          </div>

          <div className="platform-report-grid">
            <article className="platform-report-summary">
              <span>Priority index</span>
              <strong>
                {selectedProvinceProfile?.scenarioScore ||
                  selectedProvinceProfile?.riskScore ||
                  0}
              </strong>
              <p>
                {selectedProvinceProfile
                  ? `${selectedProvinceProfile.total} events in the ARCUS archive, ${selectedProvinceProfile.sourceTotal} documented sources, top mechanism: ${selectedProvinceProfile.topCause}.`
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

