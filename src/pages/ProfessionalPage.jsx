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
          cta: "Vai al workspace Pro",
          description:
            "ARCUS Professional traduce l'archivio storico in intelligence territoriale: hotspot, esposizioni, priorita e report operativi per chi deve decidere dove guardare prima.",
          hazard:
            "Layer di esposizione",
          hazardText:
            "Il valore Professional nasce dall'incrocio tra eventi ARCUS e layer GIS pubblici o proprietari: frane, alluvioni, idraulica, sismicita, eta infrastrutturale.",
          heroLabel:
            "ARCUS PROFESSIONAL",
          heroTitle:
            "Risk intelligence operativa per territori e gestori infrastrutturali.",
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
            "Ricalibra il ranking dando piu peso ai territori coerenti con uno scenario di rischio. In v2 questo modulo sara collegato a layer hazard esterni.",
          province:
            "Priorita provinciali",
          provinceTitle:
            "Risk score operativo per provincia",
          scoreBreakdown:
            "Breakdown del punteggio",
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
            "Punteggio calcolato su volume fonti, autorevolezza, confidenza ARCUS, precisione spaziale e tracciabilita temporale.",
          reliabilityBenchmark:
            "Eventi professional-grade",
          reliabilityWeak:
            "eventi con evidenza debole",
          vulnerability:
            "Vulnerabilita territoriale",
          vulnerabilityText:
            "Classificazione basata su severita, trigger, causa, tipologia strutturale, eta, impatto umano e solidita dell'evidenza.",
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
            "screening score",
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
            "Crea snapshot locali con score, vulnerabilita, affidabilita, watchlist e scenario attivo. In una fase successiva questo layer diventera multiutente.",
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
            "ARCUS Professional espone model cards per spiegare input, output, limiti e stato dei modelli di scoring. Questo rende la piattaforma piu trasparente per enti, tecnici e partner.",
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
            "Registro fonti hazard per arricchire ARCUS Professional.",
          externalLayersText:
            "Primo collegamento governato a fonti esterne ufficiali: IdroGEO/ISPRA, INGV e Protezione Civile. I layer sono dichiarati con priorita, stato e strategia di integrazione.",
          provider:
            "Fonte",
          joinStrategy:
            "Strategia join",
          hazardPreview:
            "Hazard preview",
          hazardPreviewTitle:
            "Profilo esposizione pronto per i join geospaziali.",
          hazardPreviewText:
            "Questo preview usa i pattern ARCUS come proxy interno. La struttura e gia pronta per sostituire o pesare gli indici con layer ISPRA, INGV e Protezione Civile.",
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
          cta: "Open Pro workspace",
          description:
            "ARCUS Professional turns the historical archive into territorial intelligence: hotspots, exposures, priorities and operational reports for teams that need to know where to look first.",
          hazard:
            "Exposure Layers",
          hazardText:
            "Professional value comes from crossing ARCUS events with public or proprietary GIS layers: landslides, floods, hydraulic exposure, seismicity and infrastructure age.",
          heroLabel:
            "ARCUS PROFESSIONAL",
          heroTitle:
            "Operational risk intelligence for territories and infrastructure managers.",
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
            "Recalibrate the ranking by giving more weight to territories aligned with a risk scenario. In v2 this module will connect to external hazard layers.",
          province:
            "Provincial priorities",
          provinceTitle:
            "Operational risk score by province",
          scoreBreakdown:
            "Score breakdown",
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
            "Score calculated from source volume, authority, ARCUS confidence, spatial precision and temporal traceability.",
          reliabilityBenchmark:
            "Professional-grade events",
          reliabilityWeak:
            "weak-evidence events",
          vulnerability:
            "Territorial vulnerability",
          vulnerabilityText:
            "Classification based on severity, trigger, cause, structural typology, age, human impact and evidence strength.",
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
            "screening score",
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
            "Create local snapshots with score, vulnerability, reliability, watchlist and active scenario. Later this layer can become multi-user.",
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
            "ARCUS Professional exposes model cards describing inputs, outputs, limitations and scoring status. This makes the platform more transparent for institutions, engineers and partners.",
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
            "Hazard source registry for ARCUS Professional enrichment.",
          externalLayersText:
            "First governed connection to official external sources: IdroGEO/ISPRA, INGV and Civil Protection. Layers are declared with priority, status and integration strategy.",
          provider:
            "Provider",
          joinStrategy:
            "Join strategy",
          hazardPreview:
            "Hazard preview",
          hazardPreviewTitle:
            "Exposure profile ready for geospatial joins.",
          hazardPreviewText:
            "This preview uses ARCUS patterns as an internal proxy. The structure is ready to replace or weight indexes with ISPRA, INGV and Civil Protection layers.",
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
    if (!selectedProvinceEvents.length) {
      return {
        causes: [],
        materials: [],
        structures: [],
      };
    }

    return {
      causes: countBy(
        selectedProvinceEvents,
        "specific_cause"
      ).slice(0, 3),
      materials: countBy(
        selectedProvinceEvents,
        "material_type"
      ).slice(0, 3),
      structures: countBy(
        selectedProvinceEvents,
        "structural_type"
      ).slice(0, 3),
    };
  }, [selectedProvinceEvents]);

  const selectedRecommendations = useMemo(() => {
    if (!selectedProvinceProfile) {
      return [];
    }

    const highSeverity =
      percentage(
        selectedProvinceProfile.totalCollapse,
        selectedProvinceProfile.total
      ) >= 50;
    const highTrigger =
      percentage(
        selectedProvinceProfile.triggered,
        selectedProvinceProfile.total
      ) >= 50;
    const weakEvidence =
      selectedProvinceProfile.avgSources < 3;

    return [
      highSeverity
        ? language === "it"
          ? "Prioritizzare la revisione dei casi di collasso totale e delle tipologie strutturali comparabili."
          : "Prioritize review of total-collapse cases and comparable structural typologies."
        : language === "it"
          ? "Mantenere il monitoraggio sui pattern di collasso parziale e sui meccanismi locali ricorrenti."
          : "Maintain monitoring on partial-collapse patterns and recurring local mechanisms.",
      highTrigger
        ? language === "it"
          ? "Incrociare i casi innescati con layer idraulici, franosi e di esposizione a eventi estremi."
          : "Cross-check event-driven cases with hydraulic, landslide and extreme-weather exposure layers."
        : language === "it"
          ? "Usare layer strutturali, materici e manutentivi per affinare i segnali di vulnerabilita non innescata."
          : "Use structural, material and maintenance-history overlays to refine non-triggered vulnerability signals.",
      weakEvidence
        ? language === "it"
          ? "Rafforzare la copertura documentale prima dell'uso in reporting istituzionale."
          : "Strengthen evidence coverage before using this territory for institutional reporting."
        : language === "it"
          ? "La base documentale e adatta a un briefing professionale preliminare."
          : "Evidence base is suitable for a preliminary professional briefing.",
    ];
  }, [language, selectedProvinceProfile]);

  const selectedActionMatrix = useMemo(() => {
    return selectedProvinceEvents.reduce(
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
    selectedProvinceEvents,
    reliabilityByEvent,
    vulnerabilityByEvent,
    sourceCountByEvent,
  ]);

  const referenceEvent =
    selectedActionMatrix.immediate[0] ||
    selectedProvinceEvents[0];

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
    window.print();
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

  const buildProfessionalReportHtml = () => {
    if (!selectedProvinceProfile) {
      return "";
    }

    const score =
      selectedProvinceProfile.scenarioScore ||
      selectedProvinceProfile.riskScore ||
      0;
    const eventRows = selectedProvinceEvents
      .slice(0, 12)
      .map((event) => {
        const reliability =
          reliabilityByEvent[event.event_id];
        const vulnerability =
          vulnerabilityByEvent[event.event_id];

        return `
          <tr>
            <td>${escapeHtml(event.event_id)}</td>
            <td>${escapeHtml(event.municipality)}</td>
            <td>${escapeHtml(event.collapse_severity)}</td>
            <td>${escapeHtml(event.specific_cause)}</td>
            <td>${reliability?.score || 0} / ${escapeHtml(reliability?.grade || "D")}</td>
            <td>${vulnerability?.score || 0} / ${escapeHtml(vulnerability?.className || "Low")}</td>
          </tr>
        `;
      })
      .join("");
    const similarRows = selectedSimilarEvents
      .map(
        (event) => `
          <tr>
            <td>${event.similarityScore}</td>
            <td>${escapeHtml(event.event_id)}</td>
            <td>${escapeHtml(event.municipality)}</td>
            <td>${escapeHtml(event.specific_cause)}</td>
            <td>${escapeHtml(event.similarityReasons.slice(0, 3).join(", "))}</td>
          </tr>
        `
      )
      .join("");
    const recommendationRows =
      selectedRecommendations
        .map(
          (item) =>
            `<li>${escapeHtml(item)}</li>`
        )
        .join("");
    const benchmarkRows = selectedBenchmark
      .map(
        (item) => `
          <tr>
            <td>${escapeHtml(item.label)}</td>
            <td>${item.selected}${escapeHtml(item.suffix)}</td>
            <td>${item.national}${escapeHtml(item.suffix)}</td>
            <td>${escapeHtml(item.status)}</td>
          </tr>
        `
      )
      .join("");

    return `<!doctype html>
<html lang="${language}">
<head>
  <meta charset="utf-8" />
  <title>ARCUS Professional Report - ${escapeHtml(selectedProvinceProfile.territory)}</title>
  <style>
    :root {
      color: #1c1713;
      background: #fff8f2;
      font-family: Inter, Aptos, Arial, sans-serif;
    }
    body {
      margin: 0;
      background: #fff8f2;
      color: #1c1713;
    }
    .cover {
      padding: 44px 52px;
      background: #15110f;
      color: #f2e8d4;
    }
    .brand {
      color: #c49040;
      font-size: 34px;
      font-weight: 800;
      letter-spacing: 0.18em;
    }
    .cover h1 {
      max-width: 780px;
      margin: 42px 0 0;
      font-size: 52px;
      line-height: 0.98;
    }
    .meta {
      margin-top: 20px;
      color: rgba(242,232,212,0.72);
      font-size: 13px;
      letter-spacing: 0.08em;
      text-transform: uppercase;
    }
    main {
      padding: 42px 52px 54px;
    }
    .kpis {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 12px;
      margin-bottom: 32px;
    }
    .kpi, section {
      border: 1px solid #d9cec1;
      background: rgba(255,255,255,0.54);
    }
    .kpi {
      padding: 18px;
    }
    .kpi span, h2 {
      color: #7a6548;
      font-size: 11px;
      font-weight: 800;
      letter-spacing: 0.12em;
      text-transform: uppercase;
    }
    .kpi strong {
      display: block;
      margin-top: 10px;
      color: #c49040;
      font-size: 34px;
    }
    section {
      margin-top: 18px;
      padding: 24px;
      page-break-inside: avoid;
    }
    h2 {
      margin: 0 0 16px;
    }
    p, li {
      color: #4f463d;
      line-height: 1.55;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      font-size: 12px;
    }
    th {
      background: #c49040;
      color: #15110f;
      text-align: left;
    }
    th, td {
      border: 1px solid #d9cec1;
      padding: 9px;
      vertical-align: top;
    }
    tr:nth-child(even) td {
      background: #fbf4ec;
    }
    @media print {
      body { background: white; }
      .cover { print-color-adjust: exact; -webkit-print-color-adjust: exact; }
    }
  </style>
</head>
<body>
  <header class="cover">
    <div class="brand">ARCUS</div>
    <h1>Professional Operational Report: ${escapeHtml(selectedProvinceProfile.territory)}</h1>
    <div class="meta">Infrastructure intelligence / generated ${new Date().toLocaleDateString("it-IT")}</div>
  </header>
  <main>
    <div class="kpis">
      <div class="kpi"><span>Risk score</span><strong>${score}</strong></div>
      <div class="kpi"><span>Evidence reliability</span><strong>${Math.round(selectedReliability.average)}</strong></div>
      <div class="kpi"><span>Vulnerability</span><strong>${Math.round(selectedVulnerability.average)}</strong></div>
      <div class="kpi"><span>Events</span><strong>${selectedProvinceProfile.total}</strong></div>
    </div>
    <section>
      <h2>Executive summary</h2>
      <p>${escapeHtml(selectedProvinceProfile.territory)} includes ${selectedProvinceProfile.total} ARCUS events, ${selectedProvinceProfile.sourceTotal} documented sources and a dominant mechanism classified as ${escapeHtml(selectedProvinceProfile.topCause)}. The current scenario score is ${score}.</p>
    </section>
    <section>
      <h2>Recommendations</h2>
      <ol>${recommendationRows}</ol>
    </section>
    <section>
      <h2>Benchmark</h2>
      <table>
        <thead><tr><th>Indicator</th><th>Selected</th><th>ARCUS average</th><th>Status</th></tr></thead>
        <tbody>${benchmarkRows}</tbody>
      </table>
    </section>
    <section>
      <h2>Priority events</h2>
      <table>
        <thead><tr><th>ID</th><th>Municipality</th><th>Severity</th><th>Cause</th><th>Evidence</th><th>Vulnerability</th></tr></thead>
        <tbody>${eventRows}</tbody>
      </table>
    </section>
    <section>
      <h2>Comparable precedents</h2>
      <table>
        <thead><tr><th>Similarity</th><th>ID</th><th>Municipality</th><th>Cause</th><th>Reasons</th></tr></thead>
        <tbody>${similarRows}</tbody>
      </table>
    </section>
  </main>
</body>
</html>`;
  };

  const downloadProfessionalReport = () => {
    if (!selectedProvinceProfile) {
      return;
    }

    const filename = `arcus-professional-report-${selectedProvinceProfile.territory
      .toLowerCase()
      .replaceAll(" ", "-")}.html`;

    downloadFile(
      filename,
      buildProfessionalReportHtml(),
      "text/html;charset=utf-8"
    );
  };

  const exportProvinceReport = () => {
    if (!selectedProvinceProfile) {
      return;
    }

    const rows = selectedProvinceEvents.map(
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
   <Row>${spreadsheetCell("Technical", "Section")}${spreadsheetCell("structural_type, material_type, construction_year", "Cell")}${spreadsheetCell("Migliorano lo score con informazioni su tipologia, materiale ed eta infrastrutturale.", "Cell")}</Row>
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

  const causeRanking = useMemo(
    () =>
      countBy(events, "specific_cause").slice(0, 5),
    [events]
  );

  const professionalNav = [
    ["Hotspots", "#professional-hotspots"],
    ["Risk score", "#professional-risk-score"],
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

  return (
    <main
      className="platform-page"
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
            <Link to="/analytics/pro">
              {copy.cta}
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
                  <span>risk score</span>
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
              This v1 score is calculated from ARCUS data
              only: event recurrence, total-collapse share,
              triggered-event share, human impact and
              evidence strength. Hazard overlays will become
              an additional score component in v2.
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
                          ? "risk score"
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
                    <em>risk</em>
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
              {copy.printReport}
            </button>

            <button
              type="button"
              onClick={downloadProfessionalReport}
            >
              {copy.downloadReport}
            </button>

            <button
              type="button"
              onClick={exportProvinceReport}
            >
              {copy.exportReport}
            </button>
          </div>

          <div className="platform-report-grid">
            <article className="platform-report-summary">
              <span>Risk score</span>
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
                  .map(([label, value]) => (
                    <li key={label}>
                      <b>{label}</b>
                      <em>{value}</em>
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
