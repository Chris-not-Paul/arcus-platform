import {
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  Link,
  useNavigate,
  useSearchParams,
} from "react-router-dom";

import "../styles/atlas/atlas-page.css";

import useLanguage from "../context/useLanguage";
import logoMark from "../assets/logo/logo-mark.svg";

import { causeColors } from "../utils/colors";
import extractYear from "../utils/extractYear";
import { researchEventId } from "../utils/eventIdentity";
import taxonomyLabel from "../utils/taxonomyLabels";
import {
  openEvents,
  openDownloadUrls,
  openManifest,
  openSources,
  professionalResource,
} from "../utils/apiClient";

/* LAYOUT */

import Sidebar from "../components/layout/Sidebar";
import PageMeta from "../components/layout/PageMeta";

/* MAP */

import CollapseMap from "../components/map/CollapseMap";

const publicHazardKeys = [
  "hydraulic",
  "landslide",
  "seismic",
];

const hazardCauseLabels = {
  hydraulic: "Hydraulic",
  landslide: "Landslide",
  seismic: "Earthquake",
};

const PUBLIC_RELEASE_END_YEAR = 2026;

function enrichPublicHazardProfile(profile) {
  const publicHazards =
    (profile.hazards || [])
      .filter((hazard) =>
        publicHazardKeys.includes(hazard.key)
      )
      .map((hazard) => ({
        ...hazard,
        score: Number(hazard.score || 0),
      }));

  const dominant =
    [...publicHazards].sort(
      (a, b) => b.score - a.score
    )[0] || null;

  const integratedScore =
    publicHazards.length
      ? Math.round(
          publicHazards.reduce(
            (total, hazard) =>
              total + hazard.score,
            0
          ) / publicHazards.length
        )
      : null;

  return {
    ...profile,
    public_dominant_hazard:
      dominant?.key || null,
    public_dominant_hazard_label:
      dominant
        ? hazardCauseLabels[dominant.key] ||
          dominant.label
        : null,
    public_dominant_hazard_score:
      dominant?.score ?? null,
    public_hazard_score: integratedScore,
    public_hazards: publicHazards,
  };
}

function normalizeEvent(event) {

  return {
    ...event,
    event_id:
      event.event_id ??
      event["\uFEFFevent_id"] ??
      event["ï»¿event_id"],
  };
}

function normalizeSource(source) {

  return {
    ...source,
    source_id:
      source.source_id ??
      source["\uFEFFsource_id"] ??
      source["ï»¿source_id"],
  };
}

function csvCell(value) {
  const text =
    value === null || value === undefined
      ? ""
      : String(value);

  return `"${text.replaceAll('"', '""')}"`;
}

function downloadCsv(filename, headers, rows) {
  const csv = [
    headers.map(csvCell).join(","),
    ...rows.map((row) =>
      headers
        .map((header) => csvCell(row[header]))
        .join(",")
    ),
  ].join("\n");

  const blob = new Blob([csv], {
    type: "text/csv;charset=utf-8",
  });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");

  anchor.href = url;
  anchor.download = filename;
  anchor.click();

  URL.revokeObjectURL(url);
}

function AtlasPage() {
  const { language } = useLanguage();
  const navigate = useNavigate();
  const [searchParams] =
    useSearchParams();
  const requestedEventSlug =
    searchParams.get("event");
  // The Atlas is the public evidence archive. Professional starts from its
  // dedicated point-based workflow and no longer exposes the retired Atlas
  // scoring layers.
  const atlasMode = "open";
  const isProfessionalMode =
    atlasMode === "professional";
  const isEnterpriseMode =
    atlasMode === "enterprise";
  const isEnhancedMode =
    isProfessionalMode ||
    isEnterpriseMode;

  const homeLabel =
    language === "it"
      ? "Torna ad ARCUS"
      : "Back to ARCUS";

  const atlasText = {
    currentView:
      language === "it"
        ? "Vista corrente"
        : "Current view",
    documentedSources:
      language === "it"
        ? "Fonti documentate"
        : "Documented sources",
    researchUse:
      language === "it"
        ? "Uso ricerca"
        : "Research use",
    citeDataset:
      language === "it"
        ? "Citazione"
        : "Cite dataset",
    methodology:
      language === "it"
        ? "Metodo"
        : "Method",
    dataAccess:
      language === "it"
        ? "Dati"
        : "Data access",
    downloadCsv:
      language === "it"
        ? "CSV public release"
         : "Public release CSV",
    downloadGeoJson:
      language === "it"
        ? "GeoJSON public release"
        : "Public release GeoJSON",
    researchCoverage:
      language === "it"
        ? "Release Open Research completa, versionata e citabile. Le frequenze descrivono il database storico e non sono probabilita di collasso."
        : "Complete, versioned and citable Open Research release. Frequencies describe the historical database and are not collapse probabilities.",
    failureAtlas:
      language === "it"
        ? "Atlante dei cedimenti"
        : "Failure atlas",
    liveDataset:
      language === "it"
        ? "Release pubblica"
        : "Public release",
    markerColors:
      language === "it"
        ? "Colori marker"
        : "Marker colors",
    causeColorMode:
      language === "it"
        ? "Causa del cedimento"
        : "Failure cause",
    vulnerabilityColorMode:
      language === "it"
        ? "Classe di vulnerabilita"
        : "Vulnerability class",
    clusterHint:
      language === "it"
        ? "Cerchio numerato = eventi aggregati nello stesso livello di zoom."
        : "Numbered circle = events grouped at the current zoom level.",
    totalCollapse:
      language === "it"
        ? "Collassi totali"
        : "Total collapses",
    partialCollapse:
      language === "it"
        ? "Collassi parziali"
        : "Partial collapses",
    reset:
      language === "it"
        ? "Reset filtri"
        : "Reset filters",
    openAtlas:
      language === "it"
        ? "Open"
        : "Open",
    professionalAtlas:
      language === "it"
        ? "Professional"
        : "Professional",
    enterpriseAtlas:
      language === "it"
        ? "Enterprise"
        : "Enterprise",
    openDescription:
      language === "it"
        ? "Dataset pubblico, timeline, tassonomie e fonti documentate."
        : "Public dataset, timeline, taxonomies and documented sources.",
    professionalDescription:
      language === "it"
        ? "Layer operativi con affidabilita fonti, vulnerabilita, overlay hazard pubblici e priorita territoriali."
        : "Operational layers with evidence reliability, vulnerability, public hazard overlays and territorial priorities.",
    enterpriseDescription:
      language === "it"
        ? "Vista istituzionale per dashboard dedicate, monitoraggio e workspace multi-ente."
        : "Institutional view for dedicated dashboards, monitoring and multi-organization workspaces.",
    professionalLayers:
      language === "it"
        ? "Layer Professional"
        : "Professional layers",
    outputActions:
      language === "it"
        ? "Output operativi"
        : "Operational outputs",
    createBrief:
      language === "it"
        ? "Crea brief"
        : "Create brief",
    exportPriority:
      language === "it"
        ? "Esporta priorita"
        : "Export priority",
    openConsole:
      language === "it"
        ? "Console"
        : "Console",
    enterpriseDashboard:
      language === "it"
        ? "Dashboard Enterprise"
        : "Enterprise dashboard",
    institutionalReadiness:
      language === "it"
        ? "Readiness istituzionale"
        : "Institutional readiness",
    monitoredTerritories:
      language === "it"
        ? "Territori monitorati"
        : "Monitored territories",
    integrationQueue:
      language === "it"
        ? "Coda integrazione"
        : "Integration queue",
    territorialPriorities:
      language === "it"
        ? "Priorita territoriali"
        : "Territorial priorities",
    risk:
      language === "it"
        ? "rischio"
        : "risk",
    reliability:
      language === "it"
        ? "Affidabilita"
        : "Reliability",
    vulnerability:
      language === "it"
        ? "Vulnerabilita"
        : "Vulnerability",
    hazard:
      language === "it"
        ? "Hazard"
        : "Hazard",
    externalOverlays:
      language === "it"
        ? "Overlay pubblici"
        : "Public overlays",
    overlayPreview:
      language === "it"
        ? "Fonti ISPRA/INGV"
        : "ISPRA/INGV sources",
    hydraulicOverlay:
      language === "it"
        ? "Idraulica WMS"
        : "Hydraulic WMS",
    landslideOverlay:
      language === "it"
        ? "Frane WMS"
        : "Landslide WMS",
    seismicOverlay:
      language === "it"
        ? "Sismica MPS04"
        : "MPS04 seismic",
    highCritical:
      language === "it"
        ? "High/Critical"
        : "High/Critical",
    critical:
      language === "it"
        ? "Critica"
        : "Critical",
    high:
      language === "it"
        ? "Alta"
        : "High",
    medium:
      language === "it"
        ? "Media"
        : "Medium",
    low:
      language === "it"
        ? "Bassa"
        : "Low",
    evidenceGrade:
      language === "it"
        ? "Evidenza A/B"
        : "A/B evidence",
    priorityEvents:
      language === "it"
        ? "Eventi prioritari"
        : "Priority events",
    dominantHazard:
      language === "it"
        ? "Hazard dominante"
        : "Dominant hazard",
    year:
      language === "it"
        ? "Timeline"
        : "Timeline",
  };

  /* ================================= */
  /* STATE */
  /* ================================= */

  const [events, setEvents] =
    useState([]);

  const [sources, setSources] =
    useState([]);

  const [openRelease, setOpenRelease] =
    useState(null);

  const [causeFilter, setCauseFilter] =
    useState("All");

  const [processFilter, setProcessFilter] = useState("All");
  const [componentFilter, setComponentFilter] = useState("All");
  const [evidenceFilter, setEvidenceFilter] = useState("All");
  const [regionFilter, setRegionFilter] = useState("All");
  const [provinceFilter, setProvinceFilter] = useState("All");
  const [structureFilter, setStructureFilter] = useState("All");
  const [materialFilter, setMaterialFilter] = useState("All");

  const [searchQuery, setSearchQuery] =
    useState("");

  const [
    severityFilter,
    setSeverityFilter,
  ] = useState("All");

  const [
    triggeredFilter,
    setTriggeredFilter,
  ] = useState("All");

  const [sidebarOpen, setSidebarOpen] =
    useState(false);

  const [yearFilter, setYearFilter] =
    useState(PUBLIC_RELEASE_END_YEAR);

  const [
    showReliabilityLayer,
    setShowReliabilityLayer,
  ] = useState(true);
  const [
    showVulnerabilityLayer,
    setShowVulnerabilityLayer,
  ] = useState(true);
  const [
    showHazardLayer,
    setShowHazardLayer,
  ] = useState(false);
  const [
    activeHazardOverlays,
    setActiveHazardOverlays,
  ] = useState({
    hydraulic: true,
    landslide: false,
    seismic: false,
  });
  const [
    eventReliability,
    setEventReliability,
  ] = useState({});
  const [
    eventVulnerability,
    setEventVulnerability,
  ] = useState({});
  const [
    hazardExposurePreview,
    setHazardExposurePreview,
  ] = useState(null);
  const [
    territoryProfiles,
    setTerritoryProfiles,
  ] = useState([]);

  /* ================================= */
  /* DATA LOADING */
  /* ================================= */

  const mapStyle = isEnterpriseMode
    ? "dark"
    : "voyager";

  useEffect(() => {
    let cancelled = false;

    Promise.resolve().then(() => {
      if (!cancelled) {
        setEvents([]);
        setSources([]);
        setOpenRelease(null);
      }
    });

    if (isEnhancedMode) {
      professionalResource("professional-events")
        .then((data) => {
          if (!cancelled) {
            setEvents((data.events || []).map(normalizeEvent));
          }
        })
        .catch((error) => {
          if (!cancelled) {
            setEvents([]);
          }
          if (!cancelled && error.status === 401) {
            navigate("/professional/login", { replace: true });
          }
        });
      professionalResource("professional-sources")
        .then((data) => {
          if (!cancelled) {
            setSources((Array.isArray(data) ? data : data.sources || []).map(normalizeSource));
          }
        })
        .catch(() => {
          if (!cancelled) {
            setSources([]);
          }
        });
    } else {
      openEvents()
        .then((data) => {
          if (!cancelled) {
            setEvents(data.map(normalizeEvent));
          }
        })
        .catch(() => {
          if (!cancelled) {
            setEvents([]);
          }
        });
      openSources()
        .then((data) => {
          if (!cancelled) {
            setSources(data.map(normalizeSource));
          }
        })
        .catch(() => {
          if (!cancelled) {
            setSources([]);
          }
        });
      openManifest()
        .then((data) => {
          if (!cancelled) {
            setOpenRelease(data);
          }
        })
        .catch(() => {
          if (!cancelled) {
            setOpenRelease(null);
          }
        });
    }

    return () => {
      cancelled = true;
    };
  }, [isEnhancedMode, navigate]);

  useEffect(() => {
    let cancelled = false;

    if (!isEnhancedMode) {
      Promise.resolve().then(() => {
        if (!cancelled) {
          setEventReliability({});
          setEventVulnerability({});
          setHazardExposurePreview(null);
          setTerritoryProfiles([]);
        }
      });

      return () => {
        cancelled = true;
      };
    }

    professionalResource("event-reliability")
      .then((data) => {
        const index = {};

        (data.events || []).forEach((item) => {
          index[item.event_id] = item;
        });

        if (!cancelled) {
          setEventReliability(index);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setEventReliability({});
        }
      });

    professionalResource("event-vulnerability")
      .then((data) => {
        const index = {};

        (data.events || []).forEach((item) => {
          index[item.event_id] = item;
        });

        if (!cancelled) {
          setEventVulnerability(index);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setEventVulnerability({});
        }
      });

    professionalResource("hazard-exposure-preview")
      .then((data) => {
        if (!cancelled) {
          setHazardExposurePreview(data);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setHazardExposurePreview(null);
        }
      });

    professionalResource("territory-profiles")
      .then((data) =>
        !cancelled && setTerritoryProfiles(
          data.provinces || []
        )
      )
      .catch(() => {
        if (!cancelled) {
          setTerritoryProfiles([]);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [isEnhancedMode]);

  /* ================================= */
  /* YEARS */
  /* ================================= */

  const atlasEvents = useMemo(() => {
    return events;
  }, [events]);

  const minYear = useMemo(() => {

    if (!atlasEvents.length) {
      return 2000;
    }

    const years = atlasEvents
      .map((e) =>
        extractYear(e.date)
      )
      .filter(Boolean);

    return Math.min(...years);

  }, [atlasEvents]);

  const maxYear = useMemo(() => {

    if (!atlasEvents.length) {
      return PUBLIC_RELEASE_END_YEAR;
    }

    const years = atlasEvents
      .map((e) =>
        extractYear(e.date)
      )
      .filter(Boolean);

    return Math.max(...years);

  }, [atlasEvents]);

  const activeYearFilter = Math.min(
    yearFilter,
    maxYear
  );

  /* ================================= */
  /* SOURCES INDEX */
  /* ================================= */

  const sourcesByEvent =
    useMemo(() => {

      const map = {};

      sources.forEach((source) => {

        if (
          !map[source.event_id]
        ) {
          map[source.event_id] = [];
        }

        map[
          source.event_id
        ].push(source);

      });

      return map;

    }, [sources]);

  /* ================================= */
  /* FILTERED EVENTS */
  /* ================================= */

  const filteredEvents =
    useMemo(() => {

      const query =
        searchQuery.trim().toLowerCase();

      return atlasEvents.filter(
        (event) => {

          const causeMatch =
            causeFilter === "All" ||
            event.specific_cause ===
              causeFilter;

          const severityMatch =
            severityFilter === "All" ||
            event.collapse_severity ===
              severityFilter;

          const processMatch = processFilter === "All" ||
            (event.failure_process || "Unspecified") === processFilter;
          const componentMatch = componentFilter === "All" ||
            (event.component_involved || "Unspecified") === componentFilter;
          const evidenceMatch = evidenceFilter === "All" ||
            (event.failure_cause_evidence || "Unspecified") === evidenceFilter;
          const regionMatch = regionFilter === "All" || event.region === regionFilter;
          const provinceMatch = provinceFilter === "All" || event.province === provinceFilter;
          const structureMatch = structureFilter === "All" ||
            (event.structural_type || "Unspecified") === structureFilter;
          const materialMatch = materialFilter === "All" ||
            (event.material_type || "Unspecified") === materialFilter;

          const triggeredMatch =
            triggeredFilter === "All" ||
            String(event.triggered)
              .toUpperCase() ===
              triggeredFilter;

          const eventYear =
            extractYear(event.date);

          const yearMatch =
            !eventYear ||
            eventYear <= activeYearFilter;

          const searchMatch =
            !query ||
            [
              event.event_id,
              event.research_event_id,
              event.bridge_name,
              event.bridge_crossing_name,
              event.municipality,
              event.province,
              event.region,
              event.specific_cause,
            ]
              .filter(Boolean)
              .some((value) =>
                String(value)
                  .toLowerCase()
                  .includes(query)
              );

          return (
            causeMatch &&
            severityMatch &&
            processMatch &&
            componentMatch &&
            evidenceMatch &&
            regionMatch &&
            provinceMatch &&
            structureMatch &&
            materialMatch &&
            triggeredMatch &&
            yearMatch &&
            searchMatch
          );
        }
      );

    }, [
      atlasEvents,
      searchQuery,
      causeFilter,
      severityFilter,
      processFilter,
      componentFilter,
      evidenceFilter,
      regionFilter,
      provinceFilter,
      structureFilter,
      materialFilter,
      triggeredFilter,
      activeYearFilter,
    ]);

  const focusedEvent = useMemo(() => {
    if (requestedEventSlug) {
      return atlasEvents.find(
        (event) =>
          event.event_slug === requestedEventSlug
      ) || null;
    }

    return filteredEvents.length === 1
      ? filteredEvents[0]
      : null;
  }, [atlasEvents, filteredEvents, requestedEventSlug]);

  const resetAtlasFilters = () => {
    setSearchQuery("");
    setCauseFilter("All");
    setSeverityFilter("All");
    setProcessFilter("All");
    setComponentFilter("All");
    setEvidenceFilter("All");
    setRegionFilter("All");
    setProvinceFilter("All");
    setStructureFilter("All");
    setMaterialFilter("All");
    setTriggeredFilter("All");
    setYearFilter(maxYear);
  };

  const handleDownloadFilteredCsv = () => {
    const headers = [
      "event_id",
      "bridge_name",
      "municipality",
      "province",
      "region",
      "date",
      "year",
      "collapse_severity",
      "cause_category",
      "specific_cause",
      "triggered",
      "victims",
      "injuries",
      "source_count",
      "release",
    ];

    const publicReleaseEvents = filteredEvents.filter(
      (event) => {
        const eventYear = extractYear(event.date);

        return (
          eventYear &&
          eventYear <= PUBLIC_RELEASE_END_YEAR
        );
      }
    );

    const rows = publicReleaseEvents.map((event) => ({
      event_id: researchEventId(event),
      bridge_name:
        event.bridge_name ||
        event.bridge_crossing_name ||
        "",
      municipality: event.municipality,
      province: event.province,
      region: event.region,
      date: event.date,
      year: extractYear(event.date),
      collapse_severity: event.collapse_severity,
      cause_category: event.cause_category,
      specific_cause: event.specific_cause,
      triggered: event.triggered,
      victims: event.victims ?? 0,
      injuries: event.injuries ?? 0,
      source_count:
        sourcesByEvent[event.event_id]?.length || 0,
      release: openRelease?.version || "arcus-open-2026.2",
    }));

    downloadCsv(
      `${openRelease?.version || "arcus-open-2026.2"}-filtered-${activeYearFilter}.csv`,
      headers,
      rows
    );
  };

  /* ================================= */
  /* STATS */
  /* ================================= */

  const totalTC =
    filteredEvents.filter(
      (e) =>
        e.collapse_severity === "TC"
    ).length;

  const totalPC =
    filteredEvents.filter(
      (e) =>
        e.collapse_severity === "PC"
    ).length;

  const totalTriggered =
    filteredEvents.filter(
      (e) => e.triggered
    ).length;

  const visibleSourceCount =
    useMemo(() => {
      return filteredEvents.reduce(
        (total, event) =>
          total +
          (
            sourcesByEvent[event.event_id]
              ?.length || 0
          ),
        0
      );
    }, [filteredEvents, sourcesByEvent]);

  const professionalStats =
    useMemo(() => {
      const visibleIds = new Set(
        filteredEvents.map((event) => event.event_id)
      );

      const visibleVulnerability =
        Object.values(eventVulnerability)
          .filter((item) =>
            visibleIds.has(item.event_id)
          );

      const visibleReliability =
        Object.values(eventReliability)
          .filter((item) =>
            visibleIds.has(item.event_id)
          );

      const highCritical =
        visibleVulnerability.filter((item) =>
          ["High", "Critical"].includes(item.class)
        ).length;

      const evidenceAB =
        visibleReliability.filter((item) =>
          ["A", "B"].includes(item.grade)
        ).length;

      const priorityEvents =
        filteredEvents
          .map((event) => ({
            event,
            reliability:
              eventReliability[event.event_id],
            vulnerability:
              eventVulnerability[event.event_id],
          }))
          .filter((item) =>
            item.vulnerability ||
            item.reliability
          )
          .sort((a, b) => {
            const aScore =
              a.vulnerability?.score || 0;
            const bScore =
              b.vulnerability?.score || 0;

            return bScore - aScore;
          })
          .slice(0, 5);

      const visibleProvinces = new Set(
        filteredEvents
          .map((event) => event.province)
          .filter(Boolean)
      );

      const dominantHazards =
        hazardExposurePreview?.provinces
          ?.filter((province) =>
            visibleProvinces.has(province.province)
          )
          ?.map(enrichPublicHazardProfile)
          ?.sort(
            (a, b) =>
              (
                b.public_hazard_score || 0
              ) -
              (
                a.public_hazard_score || 0
              )
          ) || [];

      return {
        evidenceAB,
        highCritical,
        priorityEvents,
        topHazard:
          dominantHazards[0] || null,
      };
    }, [
      filteredEvents,
      eventReliability,
      eventVulnerability,
      hazardExposurePreview,
    ]);

  const handleExportPriorityCsv = () => {
    const headers = [
      "event_id",
      "municipality",
      "province",
      "region",
      "vulnerability_class",
      "vulnerability_score",
      "reliability_grade",
      "reliability_score",
      "source_count",
    ];

    const rows = professionalStats.priorityEvents.map(
      ({ event, reliability, vulnerability }) => ({
        event_id: researchEventId(event),
        municipality: event.municipality,
        province: event.province,
        region: event.region,
        vulnerability_class:
          vulnerability?.class || "",
        vulnerability_score:
          vulnerability?.score ?? "",
        reliability_grade:
          reliability?.grade || "",
        reliability_score:
          reliability?.score ?? "",
        source_count:
          sourcesByEvent[event.event_id]?.length || 0,
      })
    );

    downloadCsv(
      `arcus-priority-events-${activeYearFilter}.csv`,
      headers,
      rows
    );
  };

  const hazardByProvince =
    useMemo(() => {
      const index = {};

      (
        hazardExposurePreview?.provinces || []
      ).forEach((province) => {
        index[province.province] =
          enrichPublicHazardProfile(province);
      });

      return index;
    }, [hazardExposurePreview]);

  const enterpriseStats =
    useMemo(() => {
      const visibleProvinces = new Set(
        filteredEvents
          .map((event) => event.province)
          .filter(Boolean)
      );

      const visibleProfiles =
        territoryProfiles
          .filter((profile) =>
            visibleProvinces.has(profile.territory)
          )
          .sort(
            (a, b) =>
              (b.riskScore || 0) -
              (a.riskScore || 0)
          );

      const readiness =
        filteredEvents.length
          ? Math.round(
              (
                visibleSourceCount /
                Math.max(filteredEvents.length * 3, 1)
              ) * 100
            )
          : 0;

      return {
        integrationQueue:
          visibleProfiles.filter(
            (profile) => profile.riskScore >= 70
          ).length,
        monitoredTerritories:
          visibleProfiles.length,
        priorities:
          visibleProfiles.slice(0, 5),
        readiness:
          Math.min(readiness, 100),
      };
    }, [
      filteredEvents,
      territoryProfiles,
      visibleSourceCount,
    ]);

  const atlasModeCopy =
    isEnterpriseMode
      ? {
          label:
            atlasText.enterpriseAtlas,
          description:
            atlasText.enterpriseDescription,
        }
      : isProfessionalMode
        ? {
            label:
              atlasText.professionalAtlas,
            description:
              atlasText.professionalDescription,
          }
        : {
            label:
              atlasText.openAtlas,
            description:
              atlasText.openDescription,
          };

  /* ================================= */
  /* CAUSES */
  /* ================================= */

  const uniqueCauses = [

    "All",

    ...new Set(
      events
        .map(
          (e) =>
            e.specific_cause
        )
        .filter(Boolean)
    ),

  ];

  const valuesForFilter = (field) => [
    "All",
    ...new Set(
      events.map((event) => event[field] || "Unspecified").sort()
    ),
  ];
  const buildAdditionalFilter = (id, label, value, onChange, field) => ({
    id,
    label,
    value,
    onChange,
    options: valuesForFilter(field).map((option) => ({
      label: option === "All"
        ? (language === "it" ? "Tutti" : "All")
        : option,
      value: option,
    })),
  });
  const additionalFilters = [
    buildAdditionalFilter("process", language === "it" ? "Processo" : "Process", processFilter, setProcessFilter, "failure_process"),
    buildAdditionalFilter("component", language === "it" ? "Componente" : "Component", componentFilter, setComponentFilter, "component_involved"),
    buildAdditionalFilter("evidence", language === "it" ? "Livello evidenza" : "Evidence level", evidenceFilter, setEvidenceFilter, "failure_cause_evidence"),
    buildAdditionalFilter("region", language === "it" ? "Regione" : "Region", regionFilter, setRegionFilter, "region"),
    buildAdditionalFilter("province", language === "it" ? "Provincia" : "Province", provinceFilter, setProvinceFilter, "province"),
    buildAdditionalFilter("structure", language === "it" ? "Struttura" : "Structure", structureFilter, setStructureFilter, "structural_type"),
    buildAdditionalFilter("material", language === "it" ? "Materiale" : "Material", materialFilter, setMaterialFilter, "material_type"),
  ];

  const markerLegendItems =
    isEnhancedMode
      ? [
          ["Critical", atlasText.critical, "#893526"],
          ["High", atlasText.high, "#B9781F"],
          ["Medium", atlasText.medium, "#6E858D"],
          ["Low", atlasText.low, "#4F6B82"],
        ]
      : uniqueCauses
          .filter((cause) => cause !== "All")
          .map((cause) => [
            cause,
            taxonomyLabel("cause", cause, language),
            causeColors[cause] || "#4f6b82",
          ]);

  const hazardOverlayControls = [
    ["hydraulic", atlasText.hydraulicOverlay],
    ["landslide", atlasText.landslideOverlay],
    ["seismic", atlasText.seismicOverlay],
  ];

  const publicWmsOverlays = [
    activeHazardOverlays.hydraulic
      ? {
          attribution:
            "ISPRA SDI - Aree pericolosita idraulica P3",
          id: "ispra-flood-p3",
          layers: "aree_peric_idraulica_p3",
          opacity: 0.38,
          url: "https://sdi.isprambiente.it/geoserver/nz1/wms",
        }
      : null,
    activeHazardOverlays.landslide
      ? {
          attribution:
            "ISPRA IdroGEO - Pericolosita frane PAI v.5.0 (2024)",
          id: "ispra-idrogeo-landslide-pai",
          layers: "idrogeo:pericolosita_frane",
          opacity: 0.42,
          url: "https://idrogeo.isprambiente.it/geoserver/idrogeo/wms",
        }
      : null,
  ].filter(Boolean);

  /* ================================= */
  /* PAGE */
  /* ================================= */

  return (

    <div
      className={`atlas-page ${
        sidebarOpen
          ? "sidebar-open"
          : "sidebar-closed"
      }`}
      id="main-content"
    >
      <PageMeta
        title="Atlas"
        description={
          language === "it"
            ? "Atlante geospaziale ARCUS dei crolli dei ponti, con eventi verificati, tassonomie, timeline e fonti documentate."
            : "ARCUS geospatial atlas of bridge collapses, with verified events, taxonomies, timeline and documented sources."
        }
      />

      {/* ================================= */}
      {/* SIDEBAR */}
      {/* ================================= */}

      <Link
        className="atlas-home-link"
        to="/"
      >
        <img
          src={logoMark}
          alt=""
          aria-hidden="true"
        />
        <span>{homeLabel}</span>
      </Link>

      <aside className="atlas-command-panel">
        <div className="atlas-command-kicker">
          ARCUS ATLAS / {atlasModeCopy.label}
        </div>

        <div className="atlas-command-title">
          {atlasText.failureAtlas}
        </div>

        <p className="atlas-command-description">
          {atlasModeCopy.description}
        </p>

        <div className="atlas-command-grid">
          <div>
            <span>{atlasText.currentView}</span>
            <strong>
              {filteredEvents.length}
            </strong>
          </div>

          <div>
            <span>
              {atlasText.documentedSources}
            </span>
            <strong>
              {visibleSourceCount}
            </strong>
          </div>

          <div>
            <span>{atlasText.year}</span>
            <strong>{activeYearFilter}</strong>
          </div>
        </div>

        {!isProfessionalMode && (
          <div className="atlas-research-actions">
            <span>{atlasText.researchUse}</span>

            <div>
              <Link to="/publications">
                {atlasText.citeDataset}
              </Link>
              <Link to="/methodology">
                {atlasText.methodology}
              </Link>
              <Link to="/data-access">
                {atlasText.dataAccess}
              </Link>
              <button
                type="button"
                onClick={handleDownloadFilteredCsv}
              >
                {atlasText.downloadCsv}
              </button>
              <a href={openDownloadUrls.csv} download>
                {language === "it" ? "CSV completo" : "Complete CSV"}
              </a>
              <a href={openDownloadUrls.geojson} download>
                {atlasText.downloadGeoJson}
              </a>
            </div>

            <small>
              {atlasText.researchCoverage}
            </small>
          </div>
        )}

        <button
          className="atlas-command-reset"
          type="button"
          onClick={resetAtlasFilters}
        >
          {atlasText.reset}
        </button>
      </aside>

      {isProfessionalMode && (
        <aside className="atlas-professional-panel">
          <div className="atlas-professional-heading">
            <span>
              {atlasText.professionalLayers}
            </span>
            <strong>{atlasModeCopy.label}</strong>
          </div>

          <div className="atlas-professional-toggles">
            <button
              className={
                showReliabilityLayer ? "active" : ""
              }
              type="button"
              onClick={() =>
                setShowReliabilityLayer((value) => !value)
              }
            >
              {atlasText.reliability}
            </button>
            <button
              className={
                showVulnerabilityLayer ? "active" : ""
              }
              type="button"
              onClick={() =>
                setShowVulnerabilityLayer((value) => !value)
              }
            >
              {atlasText.vulnerability}
            </button>
            <button
              className={
                showHazardLayer ? "active" : ""
              }
              type="button"
              onClick={() =>
                setShowHazardLayer((value) => !value)
              }
            >
              {atlasText.hazard}
            </button>
          </div>

          {showHazardLayer && (
            <div className="atlas-external-overlays">
              <div>
                <span>
                  {atlasText.externalOverlays}
                </span>
                <strong>
                  {atlasText.overlayPreview}
                </strong>
              </div>

              <div className="atlas-overlay-buttons">
                {hazardOverlayControls.map(
                  ([key, label]) => (
                    <button
                      className={
                        activeHazardOverlays[key]
                          ? "active"
                          : ""
                      }
                      key={key}
                      type="button"
                      onClick={() =>
                        setActiveHazardOverlays(
                          (current) => ({
                            ...current,
                            [key]: !current[key],
                          })
                        )
                      }
                    >
                      {label}
                    </button>
                  )
                )}
              </div>
            </div>
          )}

          <div className="atlas-professional-metrics">
            {showVulnerabilityLayer && (
              <div className="atlas-professional-metric metric-critical">
                <span>
                  {atlasText.highCritical}
                </span>
                <strong>
                  {professionalStats.highCritical}
                </strong>
              </div>
            )}
            {showReliabilityLayer && (
              <div className="atlas-professional-metric metric-evidence">
                <span>
                  {atlasText.evidenceGrade}
                </span>
                <strong>
                  {professionalStats.evidenceAB}
                </strong>
              </div>
            )}
            {showHazardLayer && (
              <div className="atlas-professional-metric metric-hazard">
                <span>
                  {atlasText.dominantHazard}
                </span>
                <strong>
                  {professionalStats.topHazard
                    ?.public_dominant_hazard_label
                    ? taxonomyLabel(
                        "cause",
                        professionalStats.topHazard
                          .public_dominant_hazard_label,
                        language
                      )
                    : "-"}
                </strong>
              </div>
            )}
          </div>

          <div className="atlas-professional-list">
            <span>
              {atlasText.priorityEvents}
            </span>

            {professionalStats.priorityEvents.map(
              ({
                event,
                reliability,
                vulnerability,
              }) => (
                <div
                  className="atlas-professional-event"
                  key={event.event_id}
                >
                  <div>
                    <strong>
                      {researchEventId(event)}
                    </strong>
                    <small>
                      {event.municipality ||
                        event.province ||
                        event.region}
                    </small>
                  </div>
                  <div>
                    {showVulnerabilityLayer && (
                      <em
                        className={`atlas-priority-badge severity-${String(
                          vulnerability?.class || "unknown"
                        ).toLowerCase()}`}
                      >
                        {vulnerability?.class || "-"}{" "}
                        {vulnerability?.score ??
                          "-"}
                      </em>
                    )}
                    {showReliabilityLayer && (
                      <em className="atlas-priority-badge evidence">
                        {reliability?.grade ||
                          "-"}
                      </em>
                    )}
                  </div>
                </div>
              )
            )}
          </div>

          <div className="atlas-professional-actions">
            <span>{atlasText.outputActions}</span>

            <div>
              <Link to="/professional">
                {atlasText.openConsole}
              </Link>
              <Link to="/professional">
                {atlasText.createBrief}
              </Link>
              <button
                type="button"
                onClick={handleExportPriorityCsv}
              >
                {atlasText.exportPriority}
              </button>
            </div>
          </div>
        </aside>
      )}

      {isEnterpriseMode && (
        <aside className="atlas-professional-panel atlas-enterprise-panel">
          <div className="atlas-professional-heading">
            <span>
              {atlasText.enterpriseDashboard}
            </span>
            <strong>{atlasModeCopy.label}</strong>
          </div>

          <div className="atlas-professional-metrics">
            <div>
              <span>
                {atlasText.monitoredTerritories}
              </span>
              <strong>
                {enterpriseStats.monitoredTerritories}
              </strong>
            </div>
            <div>
              <span>
                {atlasText.institutionalReadiness}
              </span>
              <strong>
                {enterpriseStats.readiness}%
              </strong>
            </div>
            <div>
              <span>
                {atlasText.integrationQueue}
              </span>
              <strong>
                {enterpriseStats.integrationQueue}
              </strong>
            </div>
          </div>

          <div className="atlas-professional-list">
            <span>
              {atlasText.territorialPriorities}
            </span>

            {enterpriseStats.priorities.map(
              (profile) => (
                <div
                  className="atlas-professional-event"
                  key={profile.territory}
                >
                  <div>
                    <strong>
                      {profile.territory}
                    </strong>
                    <small>
                      {profile.total} eventi -{" "}
                      {profile.topCause}
                    </small>
                  </div>
                  <div>
                    <em>
                      {profile.riskScore}{" "}
                      {atlasText.risk}
                    </em>
                    <em>
                      {profile.sourceTotal} fonti
                    </em>
                  </div>
                </div>
              )
            )}
          </div>
        </aside>
      )}

      <aside className="atlas-map-legend">
        <div className="atlas-map-summary">
          <span>{atlasText.liveDataset}</span>
          <div>
            <strong>{totalTC}</strong>
            {atlasText.totalCollapse}
          </div>
          <div>
            <strong>{totalPC}</strong>
            {atlasText.partialCollapse}
          </div>
        </div>

        <div className="atlas-color-legend">
          <span>
            {atlasText.markerColors} /{" "}
            {isEnhancedMode
              ? atlasText.vulnerabilityColorMode
              : atlasText.causeColorMode}
          </span>

          <ul>
            {markerLegendItems.map(([key, label, color]) => (
              <li key={key}>
                <i
                  style={{
                    background: color,
                    boxShadow: `0 0 0 3px ${color}24`,
                  }}
                />
                {label}
              </li>
            ))}
          </ul>

          <p>
            <i />
            {atlasText.clusterHint}
          </p>
        </div>
      </aside>

      <Sidebar

        sidebarOpen={
          sidebarOpen
        }

        setSidebarOpen={
          setSidebarOpen
        }

        filteredEvents={
          filteredEvents
        }

        totalTriggered={
          totalTriggered
        }

        totalTC={totalTC}

        totalPC={totalPC}

        yearFilter={activeYearFilter}

        setYearFilter={
          setYearFilter
        }

        minYear={minYear}

        maxYear={maxYear}

        causeFilter={
          causeFilter
        }

        setCauseFilter={
          setCauseFilter
        }

        severityFilter={
          severityFilter
        }

        setSeverityFilter={
          setSeverityFilter
        }

        triggeredFilter={
          triggeredFilter
        }

        setTriggeredFilter={
          setTriggeredFilter
        }

        searchQuery={searchQuery}

        setSearchQuery={setSearchQuery}

        uniqueCauses={
          uniqueCauses
        }
        additionalFilters={additionalFilters}
      />

      {/* ================================= */}
      {/* MAP */}
      {/* ================================= */}

      <div
        className="atlas-map-shell"
        style={{
          position: "absolute",

          inset: 0,

          zIndex: 1,
        }}
      >

        <CollapseMap

          activeHazardOverlays={
            showHazardLayer || isEnterpriseMode
              ? {}
              : {}
          }

          atlasMode={atlasMode}

          eventHazards={
            showHazardLayer || isEnterpriseMode
              ? hazardByProvince
              : {}
          }

          eventReliability={
            showReliabilityLayer || isEnterpriseMode
              ? eventReliability
              : {}
          }

          eventVulnerability={
            showVulnerabilityLayer || isEnterpriseMode
              ? eventVulnerability
              : {}
          }

          filteredEvents={
            filteredEvents
          }

          focusedEvent={focusedEvent}

          mapStyle={mapStyle}

          professionalMode={
            isEnhancedMode
          }

          publicWmsOverlays={
            showHazardLayer || isEnterpriseMode
              ? publicWmsOverlays
              : []
          }

          sourcesByEvent={
            sourcesByEvent
          }

          sidebarOpen={
            sidebarOpen
          }

        />

      </div>

    </div>
  );
}

export default AtlasPage;
