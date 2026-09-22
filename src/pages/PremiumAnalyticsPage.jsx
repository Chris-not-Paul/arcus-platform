import { useEffect, useMemo, useState } from "react";

import Navbar from "../components/layout/Navbar";
import PageMeta from "../components/layout/PageMeta";
import useLanguage from "../context/useLanguage";
import { professionalResource } from "../utils/apiClient";
import createStoredZip from "../utils/createStoredZip";
import { researchFieldValue } from "../utils/eventResearchProfile";
import {
  ANALOGUE_FEATURES,
  buildAnalogueSensitivity,
  buildEpisodeCalibration,
  buildEpisodeSensitivity,
  buildFailureChains,
  buildResearchEpisodes,
  buildRobustnessScenarios,
  retrieveAnalogues,
  rowsToCsv,
} from "../utils/researchWorkbench";

import "../styles/analytics/premium-analytics-page.css";

const ALL = "All";
const NOTEBOOK_KEY = "arcus-research-plus-notebooks-v1";

function publicEventId(event) {
  return event?.research_event_id || event?.event_id || "—";
}

function eventName(event) {
  return event?.bridge_name || event?.bridge_crossing_name || event?.municipality || publicEventId(event);
}

function analogueRank(results, index) {
  const current = results[index];
  return results.findIndex((result) =>
    result.score === current.score && result.coverage === current.coverage
  ) + 1;
}

function downloadFile(content, filename, type) {
  const blob = content instanceof Blob ? content : new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

async function sha256(content) {
  if (!globalThis.crypto?.subtle) return null;
  const bytes = new TextEncoder().encode(String(content));
  const digest = await globalThis.crypto.subtle.digest("SHA-256", bytes);
  return [...new Uint8Array(digest)].map((value) => value.toString(16).padStart(2, "0")).join("");
}

function unique(items, key) {
  return [ALL, ...new Set(items.map((item) => item[key]).filter(Boolean).sort())];
}

function FilterSelect({ label, onChange, options, value }) {
  return (
    <label className="research-filter">
      <span>{label}</span>
      <select onChange={(event) => onChange(event.target.value)} value={value}>
        {options.map((option) => <option key={option} value={option}>{option}</option>)}
      </select>
    </label>
  );
}

function ModuleHeading({ eyebrow, title, text }) {
  return (
    <header className="research-module-heading">
      <span>{eyebrow}</span>
      <h3>{title}</h3>
      <p>{text}</p>
    </header>
  );
}

function EmptyState({ children }) {
  return <p className="research-empty">{children}</p>;
}

function PremiumAnalyticsPage() {
  const { language } = useLanguage();
  const italian = language === "it";
  const t = (it, en) => italian ? it : en;
  const [events, setEvents] = useState([]);
  const [sources, setSources] = useState([]);
  const [release, setRelease] = useState(null);
  const [researchProfiles, setResearchProfiles] = useState([]);
  const [researchAudit, setResearchAudit] = useState(null);
  const [loadError, setLoadError] = useState(false);
  const [module, setModule] = useState("episodes");
  const [filters, setFilters] = useState({
    cause: "Hydraulic",
    confidence: ALL,
    fromYear: 2000,
    region: ALL,
    toYear: 2026,
  });
  const [episodeSettings, setEpisodeSettings] = useState({
    maximumDistanceKm: 150,
    maximumGapDays: 2,
  });
  const [targetId, setTargetId] = useState("");
  const [enabledFeatureKeys, setEnabledFeatureKeys] = useState(
    ANALOGUE_FEATURES.map((feature) => feature.key)
  );
  const [excludeSameEpisode, setExcludeSameEpisode] = useState(true);
  const [notebookTitle, setNotebookTitle] = useState("");
  const [notebookNotes, setNotebookNotes] = useState("");
  const [savedNotebooks, setSavedNotebooks] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem(NOTEBOOK_KEY) || "[]");
    } catch {
      return [];
    }
  });
  const [packageStatus, setPackageStatus] = useState("idle");

  useEffect(() => {
    Promise.all([
      professionalResource("professional-events"),
      professionalResource("professional-sources"),
      professionalResource("data-release"),
      professionalResource("event-research-profiles"),
      professionalResource("event-research-readiness-audit"),
    ])
      .then(([eventResource, sourceResource, dataRelease, profileResource, readinessAudit]) => {
        setEvents(Array.isArray(eventResource) ? eventResource : eventResource?.events || []);
        setSources(Array.isArray(sourceResource) ? sourceResource : sourceResource?.sources || []);
        setRelease(dataRelease?.release || dataRelease || null);
        setResearchProfiles(
          Array.isArray(profileResource) ? profileResource : profileResource?.profiles || []
        );
        setResearchAudit(readinessAudit || null);
      })
      .catch(() => setLoadError(true));
  }, []);

  const yearRange = useMemo(() => {
    const years = events.map((event) => Number(String(event.date || "").slice(0, 4))).filter(Number.isFinite);
    return {
      max: years.length ? Math.max(...years) : 2026,
      min: years.length ? Math.min(...years) : 2000,
    };
  }, [events]);

  const filteredEvents = useMemo(() => events.filter((event) => {
    const year = Number(String(event.date || "").slice(0, 4));
    return (
      (filters.cause === ALL || event.specific_cause === filters.cause) &&
      (filters.region === ALL || event.region === filters.region) &&
      (filters.confidence === ALL || event.source_confidence === filters.confidence) &&
      (!Number.isFinite(year) || (year >= filters.fromYear && year <= filters.toYear))
    );
  }), [events, filters]);

  const hydraulicEvents = useMemo(
    () => filteredEvents.filter((event) => event.hydraulic_intelligence),
    [filteredEvents]
  );
  const episodeRegistry = useMemo(
    () => buildResearchEpisodes(hydraulicEvents, episodeSettings),
    [episodeSettings, hydraulicEvents]
  );
  const episodeSensitivity = useMemo(
    () => buildEpisodeSensitivity(hydraulicEvents),
    [hydraulicEvents]
  );
  const episodeCalibration = useMemo(
    () => buildEpisodeCalibration(hydraulicEvents),
    [hydraulicEvents]
  );
  const chains = useMemo(
    () => buildFailureChains(filteredEvents, episodeRegistry.eventToEpisode),
    [episodeRegistry.eventToEpisode, filteredEvents]
  );
  const selectedTarget = useMemo(
    () => filteredEvents.find((event) => event.event_id === targetId) || filteredEvents[0] || null,
    [filteredEvents, targetId]
  );
  const analogueFeatures = useMemo(
    () => ANALOGUE_FEATURES.filter((feature) => enabledFeatureKeys.includes(feature.key)),
    [enabledFeatureKeys]
  );
  const analogues = useMemo(
    () => retrieveAnalogues(selectedTarget, filteredEvents, {
      eventToEpisode: episodeRegistry.eventToEpisode,
      excludeSameEpisode,
      features: analogueFeatures,
      minimumComparableFeatures: 2,
    }).slice(0, 8),
    [analogueFeatures, episodeRegistry.eventToEpisode, excludeSameEpisode, filteredEvents, selectedTarget]
  );
  const analogueSensitivity = useMemo(
    () => buildAnalogueSensitivity(selectedTarget, filteredEvents, {
      eventToEpisode: episodeRegistry.eventToEpisode,
      excludeSameEpisode,
      features: analogueFeatures,
      minimumComparableFeatures: 2,
      topK: 5,
    }),
    [analogueFeatures, episodeRegistry.eventToEpisode, excludeSameEpisode, filteredEvents, selectedTarget]
  );
  const robustness = useMemo(
    () => buildRobustnessScenarios(filteredEvents, sources, episodeRegistry),
    [episodeRegistry, filteredEvents, sources]
  );
  const filteredSources = useMemo(() => {
    const ids = new Set(filteredEvents.map((event) => event.event_id));
    return sources.filter((source) => ids.has(source.event_id));
  }, [filteredEvents, sources]);
  const filteredResearchProfiles = useMemo(() => {
    const ids = new Set(filteredEvents.map(publicEventId));
    return researchProfiles.filter((profile) => ids.has(profile.event_id));
  }, [filteredEvents, researchProfiles]);
  const researchCoverageRows = useMemo(() =>
    (researchAudit?.fields || []).map((field) => {
      const available = filteredResearchProfiles.filter((profile) => {
        const value = researchFieldValue(profile, field.field);
        return value !== null && value !== undefined && String(value).trim() !== "";
      }).length;

      return {
        ...field,
        available,
        coverage: filteredResearchProfiles.length
          ? Math.round((available / filteredResearchProfiles.length) * 1000) / 10
          : 0,
        missing: filteredResearchProfiles.length - available,
      };
    }),
  [filteredResearchProfiles, researchAudit]);
  const enrichedResearchProfiles = useMemo(() => {
    const eventsById = new Map(filteredEvents.map((event) => [publicEventId(event), event]));
    return filteredResearchProfiles
      .filter((profile) => profile.enrichment_summary?.applied_field_count > 0)
      .map((profile) => ({
        event: eventsById.get(profile.event_id) || null,
        profile,
      }))
      .sort((a, b) => a.profile.event_id.localeCompare(b.profile.event_id));
  }, [filteredEvents, filteredResearchProfiles]);

  const setFilter = (key, value) => setFilters((current) => ({
    ...current,
    [key]: ["fromYear", "toYear"].includes(key) ? Number(value) : value,
  }));

  const resetFilters = () => setFilters({
    cause: "Hydraulic",
    confidence: ALL,
    fromYear: yearRange.min,
    region: ALL,
    toYear: yearRange.max,
  });

  const toggleFeature = (key) => setEnabledFeatureKeys((current) =>
    current.includes(key)
      ? current.filter((item) => item !== key)
      : [...current, key]
  );

  const analysisState = () => ({
    episode_settings: episodeSettings,
    filters,
    module,
    analogue: {
      enabled_features: enabledFeatureKeys,
      exclude_same_episode: excludeSameEpisode,
      target_event_id: selectedTarget ? publicEventId(selectedTarget) : null,
    },
  });

  const saveNotebook = () => {
    const notebook = {
      created_at: new Date().toISOString(),
      id: globalThis.crypto?.randomUUID?.() || String(Date.now()),
      notes: notebookNotes.trim(),
      state: analysisState(),
      title: notebookTitle.trim() || t("Analisi senza titolo", "Untitled analysis"),
    };
    const next = [notebook, ...savedNotebooks].slice(0, 12);
    localStorage.setItem(NOTEBOOK_KEY, JSON.stringify(next));
    setSavedNotebooks(next);
    setNotebookTitle("");
    setNotebookNotes("");
  };

  const restoreNotebook = (notebook) => {
    setFilters(notebook.state.filters);
    setEpisodeSettings(notebook.state.episode_settings);
    setModule(notebook.state.module);
    setEnabledFeatureKeys(notebook.state.analogue.enabled_features);
    setExcludeSameEpisode(notebook.state.analogue.exclude_same_episode);
    const target = events.find((event) => publicEventId(event) === notebook.state.analogue.target_event_id);
    setTargetId(target?.event_id || "");
    setNotebookTitle(notebook.title);
    setNotebookNotes(notebook.notes);
  };

  const deleteNotebook = (id) => {
    const next = savedNotebooks.filter((notebook) => notebook.id !== id);
    localStorage.setItem(NOTEBOOK_KEY, JSON.stringify(next));
    setSavedNotebooks(next);
  };

  const downloadResearchPackage = async () => {
    setPackageStatus("working");
    try {
      const generatedAt = new Date();
      const episodeRows = episodeRegistry.episodes.map((episode) => ({
        confidence: episode.confidence,
        end_date: episode.endDate,
        episode_id: episode.id,
        event_count: episode.eventCount,
        event_ids: episode.eventIds.join(" | "),
        regions: episode.regions.join(" | "),
        start_date: episode.startDate,
      }));
      const chainRows = chains.map((chain) => ({
        component: chain.component,
        event_count: chain.count,
        event_ids: chain.eventIds.join(" | "),
        independent_episode_count: chain.episodeCount,
        process: chain.process,
        share_percent: chain.share,
        trigger: chain.trigger,
      }));
      const analogueRows = analogues.map((result, index) => ({
        coverage_percent: result.coverage,
        feature_comparison: result.contributions.map((item) =>
          `${item.label}:${item.matched ? "match" : "different"}:${item.target ?? ""}->${item.value ?? ""}`
        ).join(" | "),
        matched_features: result.contributions.filter((item) => item.matched).map((item) => item.label).join(" | "),
        equivalent_candidate_count: result.equivalentCandidateCount,
        rank: analogueRank(analogues, index),
        research_event_id: publicEventId(result.candidate),
        similarity_percent: result.score,
      }));
      const eventRows = filteredEvents.map((event) => ({
        component_involved: event.component_involved,
        date: event.date,
        event_id: publicEventId(event),
        failure_cause_evidence: event.failure_cause_evidence,
        failure_process: event.failure_process,
        failure_trigger: event.failure_trigger,
        material_type: event.material_type,
        region: event.region,
        specific_cause: event.specific_cause,
        structural_type: event.structural_type,
      }));
      const sourceRows = filteredSources.map((source) => ({
        access_date: source.access_date,
        event_id: source.research_event_id || source.event_id,
        publication_date: source.publication_date,
        source_id: source.source_id,
        source_role: source.source_role,
        source_title: source.source_title,
        source_type: source.source_type,
        source_url: source.source_url,
      }));
      const robustnessRows = robustness.scenarios.map((scenario) => ({
        leading_process: scenario.top?.label,
        leading_share_percent: scenario.top?.share,
        record_count: scenario.count,
        record_retention_percent: scenario.retention,
        scenario: scenario.label,
        top_category_retained: scenario.topRetained,
      }));
      const calibrationRows = episodeCalibration.rows.map((row) => ({
        candidate_episode_count: row.candidateEpisodeCount,
        maximum_distance_km: row.maximumDistanceKm,
        maximum_gap_days: row.maximumGapDays,
        pair_f1: row.f1,
        pair_precision: row.precision,
        pair_recall: row.recall,
        reference_episode_count: row.referenceEpisodeCount,
      }));
      const analogueSensitivityRows = analogueSensitivity.rows.map((row) => ({
        removed_feature: row.removedFeatureLabel,
        retained_top_k: row.retained,
        retention_percent: row.retention,
        top_k: analogueSensitivity.topK,
      }));
      const coverageRows = researchCoverageRows.map((field) => ({
        analytics_use: field.analytics_use,
        available: field.available,
        coverage_percent: field.coverage,
        field: field.field,
        group: field.group,
        learning_gate: field.learning_gate,
        missing: field.missing,
        phase: field.phase,
        visibility: field.visibility,
      }));
      const files = [
        {
          name: "episodes.csv",
          content: rowsToCsv(["episode_id", "start_date", "end_date", "event_count", "regions", "confidence", "event_ids"], episodeRows),
        },
        {
          name: "failure-chains.csv",
          content: rowsToCsv(["trigger", "process", "component", "event_count", "share_percent", "independent_episode_count", "event_ids"], chainRows),
        },
        {
          name: "analogues.csv",
          content: rowsToCsv(["rank", "research_event_id", "similarity_percent", "coverage_percent", "equivalent_candidate_count", "matched_features", "feature_comparison"], analogueRows),
        },
        {
          name: "records.csv",
          content: rowsToCsv(["event_id", "date", "region", "specific_cause", "failure_trigger", "failure_process", "component_involved", "failure_cause_evidence", "structural_type", "material_type"], eventRows),
        },
        {
          name: "sources.csv",
          content: rowsToCsv(["source_id", "event_id", "source_role", "source_type", "source_title", "source_url", "publication_date", "access_date"], sourceRows),
        },
        {
          name: "robustness.csv",
          content: rowsToCsv(["scenario", "record_count", "record_retention_percent", "leading_process", "leading_share_percent", "top_category_retained"], robustnessRows),
        },
        {
          name: "episode-calibration.csv",
          content: rowsToCsv(["maximum_gap_days", "maximum_distance_km", "candidate_episode_count", "reference_episode_count", "pair_precision", "pair_recall", "pair_f1"], calibrationRows),
        },
        {
          name: "analogue-sensitivity.csv",
          content: rowsToCsv(["removed_feature", "top_k", "retained_top_k", "retention_percent"], analogueSensitivityRows),
        },
        {
          name: "research-field-coverage.csv",
          content: rowsToCsv(["group", "field", "phase", "available", "missing", "coverage_percent", "visibility", "analytics_use", "learning_gate"], coverageRows),
        },
        {
          name: "research-profiles.json",
          content: `${JSON.stringify({
            schema_version: researchAudit?.schema_version || null,
            profiles: filteredResearchProfiles,
          }, null, 2)}\n`,
        },
        {
          name: "notebook.json",
          content: `${JSON.stringify({
            notes: notebookNotes.trim() || null,
            state: analysisState(),
            title: notebookTitle.trim() || null,
          }, null, 2)}\n`,
        },
        {
          name: "methods.md",
          content: `# ARCUS Research Plus methods\n\nEpisode groups are rule-based sensitivity constructs using a maximum temporal gap of ${episodeSettings.maximumGapDays} days and maximum spatial distance of ${episodeSettings.maximumDistanceKm} km. Curated episode identifiers take precedence. Similarity is a transparent weighted exact-match measure calculated only across comparable populated fields. Robustness scenarios are descriptive filters. None of these outputs estimates bridge risk, collapse probability, causal effect or national prevalence.\n`,
        },
      ];
      const checksums = {};
      for (const file of files) checksums[file.name] = await sha256(file.content);
      const manifest = {
        analysis_state: analysisState(),
        checksums_sha256: checksums,
        dataset: release?.datasetVersion || release?.dataset_version || release?.version || null,
        denominators: {
          cohort_records: filteredEvents.length,
          linked_sources: filteredSources.length,
          research_episodes: episodeRegistry.episodes.length,
        },
        generated_at: generatedAt.toISOString(),
        limitations: [
          "ARCUS records are documented historical failures, not a bridge inventory denominator.",
          "Inferred episodes are sensitivity constructs and do not prove common meteorological causation.",
          "Analogue similarity is descriptive and is not a probability or safety classification.",
          "Missing values are not imputed.",
        ],
        product: "ARCUS Research Plus — Failure Research Workbench",
        schema_version: "research-package-v1",
      };
      files.push({ name: "manifest.json", content: `${JSON.stringify(manifest, null, 2)}\n` });
      const zip = createStoredZip(files, generatedAt);
      downloadFile(new Blob([zip], { type: "application/zip" }), `arcus-research-plus-${generatedAt.toISOString().slice(0, 10)}.zip`, "application/zip");
      setPackageStatus("done");
    } catch {
      setPackageStatus("error");
    }
  };

  const moduleDefinitions = [
    { id: "episodes", index: "01", label: t("Episodi", "Episodes") },
    { id: "chains", index: "02", label: t("Catene", "Chains") },
    { id: "analogues", index: "03", label: t("Casi analoghi", "Analogues") },
    { id: "robustness", index: "04", label: t("Robustezza", "Robustness") },
    { id: "coverage", index: "05", label: t("Copertura dati", "Data coverage") },
    { id: "notebook", index: "06", label: "Notebook" },
  ];

  return (
    <div className="research-page" id="main-content">
      <PageMeta
        title="ARCUS Research Plus"
        description={t(
          "Workbench ARCUS per analisi riproducibili sui collassi documentati.",
          "ARCUS workbench for reproducible analysis of documented bridge collapses."
        )}
      />
      <Navbar />

      <div className="research-shell">
        <aside className="research-sidebar">
          <div className="research-brand">
            <span>ARCUS / RESEARCH PLUS</span>
            <h1>Failure Research Workbench</h1>
            <p>{t(
              "Episodi, catene documentate, casi analoghi e verifiche di sensibilità in un ambiente riproducibile.",
              "Episodes, documented chains, analogue cases and sensitivity checks in a reproducible environment."
            )}</p>
          </div>

          <div className="research-release-card">
            <span>{t("Release controllata", "Controlled release")}</span>
            <strong>{release?.datasetVersion || release?.dataset_version || release?.version || t("Caricamento…", "Loading…")}</strong>
            <small>{events.length} {t("record", "records")} · {sources.length} {t("fonti", "sources")}</small>
          </div>

          <div className="research-filter-grid">
            <FilterSelect label={t("Famiglia di causa", "Cause family")} onChange={(value) => setFilter("cause", value)} options={unique(events, "specific_cause")} value={filters.cause} />
            <FilterSelect label={t("Regione", "Region")} onChange={(value) => setFilter("region", value)} options={unique(events, "region")} value={filters.region} />
            <FilterSelect label={t("Confidenza fonti", "Source confidence")} onChange={(value) => setFilter("confidence", value)} options={unique(events, "source_confidence")} value={filters.confidence} />
            <div className="research-year-grid">
              <label className="research-filter">
                <span>{t("Da", "From")}</span>
                <input max={filters.toYear} min={yearRange.min} onChange={(event) => setFilter("fromYear", event.target.value)} type="number" value={filters.fromYear} />
              </label>
              <label className="research-filter">
                <span>{t("A", "To")}</span>
                <input max={yearRange.max} min={filters.fromYear} onChange={(event) => setFilter("toYear", event.target.value)} type="number" value={filters.toYear} />
              </label>
            </div>
          </div>
          <button className="research-reset" onClick={resetFilters} type="button">{t("Ripristina coorte idraulica", "Reset hydraulic cohort")}</button>

          <nav className="research-module-nav" aria-label={t("Moduli di ricerca", "Research modules")}>
            {moduleDefinitions.map((item) => (
              <button className={module === item.id ? "is-active" : ""} key={item.id} onClick={() => setModule(item.id)} type="button">
                <span>{item.index}</span><strong>{item.label}</strong>
              </button>
            ))}
          </nav>
        </aside>

        <main className="research-main">
          <header className="research-topbar">
            <div>
              <span>CONTROLLED RESEARCH ENVIRONMENT</span>
              <h2>{moduleDefinitions.find((item) => item.id === module)?.label}</h2>
            </div>
            <div className="research-boundary">
              <strong>n = {filteredEvents.length}</strong>
              <span>{t("collassi documentati · non rischio", "documented collapses · not risk")}</span>
            </div>
          </header>

          {loadError && <div className="research-alert is-error">{t("Impossibile caricare la release controllata.", "Unable to load the controlled release.")}</div>}

          {module === "episodes" && (
            <section className="research-module" data-research-module="episodes">
              <ModuleHeading
                eyebrow="EPISODE INTELLIGENCE"
                title={t("Dal numero di ponti al numero di episodi", "From bridge counts to episode counts")}
                text={t(
                  "Verifica quanto una lettura cambia quando più collassi vicini nel tempo e nello spazio vengono trattati come possibile episodio comune.",
                  "Test how a reading changes when collapses close in time and space are treated as a possible shared episode."
                )}
              />
              {hydraulicEvents.length ? <>
                <div className="research-control-band">
                  <label>
                    <span>{t("Finestra temporale", "Temporal window")}</span>
                    <strong>{episodeSettings.maximumGapDays} {t("giorni", "days")}</strong>
                    <input max="5" min="0" onChange={(event) => setEpisodeSettings((current) => ({ ...current, maximumGapDays: Number(event.target.value) }))} type="range" value={episodeSettings.maximumGapDays} />
                  </label>
                  <label>
                    <span>{t("Distanza massima", "Maximum distance")}</span>
                    <strong>{episodeSettings.maximumDistanceKm} km</strong>
                    <input max="400" min="25" onChange={(event) => setEpisodeSettings((current) => ({ ...current, maximumDistanceKm: Number(event.target.value) }))} step="25" type="range" value={episodeSettings.maximumDistanceKm} />
                  </label>
                </div>
                <div className="research-kpi-grid">
                  <article><strong>{episodeRegistry.eventCount}</strong><span>{t("record idraulici datati", "dated hydraulic records")}</span></article>
                  <article><strong>{episodeRegistry.episodes.length}</strong><span>{t("episodi di ricerca", "research episodes")}</span></article>
                  <article><strong>{episodeRegistry.multiEventEpisodeCount}</strong><span>{t("episodi multi-collasso", "multi-collapse episodes")}</span></article>
                  <article><strong>{episodeRegistry.episodes[0]?.eventCount || 0}</strong><span>{t("massimo record/episodio", "maximum records/episode")}</span></article>
                </div>
                <div className="research-grid two">
                  <article className="research-panel">
                    <h4>{t("Sensibilità alle soglie", "Threshold sensitivity")}</h4>
                    <div className="research-table-wrap">
                      <table>
                        <thead><tr><th>{t("Scenario", "Scenario")}</th><th>{t("Soglie", "Thresholds")}</th><th>{t("Episodi", "Episodes")}</th><th>{t("Max", "Max")}</th></tr></thead>
                        <tbody>{episodeSensitivity.map((scenario) => (
                          <tr key={scenario.key}><th>{scenario.label}</th><td>{scenario.maximumGapDays} d · {scenario.maximumDistanceKm} km</td><td>{scenario.episodeCount}</td><td>{scenario.largestEpisode}</td></tr>
                        ))}</tbody>
                      </table>
                    </div>
                  </article>
                  <article className="research-panel">
                    <h4>{t("Episodi più estesi", "Largest inferred episodes")}</h4>
                    <div className="research-episode-list">
                      {episodeRegistry.episodes.slice(0, 6).map((episode) => (
                        <div key={episode.id}>
                          <strong>{episode.eventCount} {t("ponti", "bridges")}</strong>
                          <span>{episode.startDate}{episode.endDate !== episode.startDate ? ` → ${episode.endDate}` : ""}</span>
                          <small>{episode.regions.join(" · ")} · {episode.confidence}</small>
                        </div>
                      ))}
                    </div>
                  </article>
                </div>
                <article className="research-panel research-calibration-panel">
                  <div className="research-calibration-heading">
                    <div>
                      <span>METHOD CONCORDANCE</span>
                      <h4>{t("Confronto con il registro controllato ARCUS", "Comparison with the controlled ARCUS registry")}</h4>
                    </div>
                    <div>
                      <strong>{episodeCalibration.reference.episodes.length}</strong>
                      <span>{t("episodi nel riferimento", "episodes in reference")}</span>
                    </div>
                  </div>
                  <div className="research-table-wrap">
                    <table>
                      <thead><tr><th>{t("Finestra", "Window")}</th><th>{t("Distanza", "Distance")}</th><th>{t("Episodi", "Episodes")}</th><th>{t("Precisione coppie", "Pair precision")}</th><th>{t("Richiamo coppie", "Pair recall")}</th><th>F1</th></tr></thead>
                      <tbody>{episodeCalibration.rows.map((row) => {
                        const isBest = episodeCalibration.best?.maximumGapDays === row.maximumGapDays && episodeCalibration.best?.maximumDistanceKm === row.maximumDistanceKm;
                        const isCurrent = episodeSettings.maximumGapDays === row.maximumGapDays && episodeSettings.maximumDistanceKm === row.maximumDistanceKm;
                        return (
                          <tr className={isBest ? "is-best" : isCurrent ? "is-current" : ""} key={`${row.maximumGapDays}-${row.maximumDistanceKm}`}>
                            <th>{row.maximumGapDays} d {isCurrent && <small>{t("corrente", "current")}</small>}</th><td>{row.maximumDistanceKm} km</td><td>{row.candidateEpisodeCount}</td><td>{Math.round(row.precision * 1000) / 10}%</td><td>{Math.round(row.recall * 1000) / 10}%</td><td><strong>{row.f1.toFixed(3)}</strong>{isBest && <small>{t(" migliore concordanza", " best concordance")}</small>}</td>
                          </tr>
                        );
                      })}</tbody>
                    </table>
                  </div>
                  <p>{t("La F1 confronta le coppie di record assegnate allo stesso episodio dai due metodi. Misura concordanza con il registro corrente, non accuratezza rispetto a una verità meteorologica.", "F1 compares record pairs assigned to the same episode by both methods. It measures agreement with the current registry, not accuracy against meteorological ground truth.")}</p>
                </article>
                <p className="research-method-note">{t(
                  "Le aggregazioni sono costrutti di sensibilità deterministici. Non dimostrano che i ponti condividano la stessa piena o la stessa causa meteorologica.",
                  "Groups are deterministic sensitivity constructs. They do not prove that bridges shared the same flood or meteorological cause."
                )}</p>
              </> : <EmptyState>{t("Questo modulo richiede una coorte contenente casi idraulici datati.", "This module requires a cohort containing dated hydraulic cases.")}</EmptyState>}
            </section>
          )}

          {module === "chains" && (
            <section className="research-module" data-research-module="chains">
              <ModuleHeading
                eyebrow="FAILURE CHAIN EXPLORER"
                title={t("Come sono documentate le sequenze di cedimento", "How failure sequences are documented")}
                text={t("Collega innesco, processo e componente senza trasformare l’associazione osservata in causalità automatica.", "Connect trigger, process and component without turning observed association into automatic causality.")}
              />
              {chains.length ? <>
                <div className="research-chain-legend"><span>{t("Innesco", "Trigger")}</span><span>{t("Processo", "Process")}</span><span>{t("Componente", "Component")}</span><span>{t("Evidenza", "Evidence")}</span></div>
                <div className="research-chain-list">
                  {chains.slice(0, 18).map((chain) => (
                    <article key={`${chain.trigger}-${chain.process}-${chain.component}`}>
                      <div>{chain.trigger}</div><i>→</i><div>{chain.process}</div><i>→</i><div>{chain.component}</div>
                      <aside><strong>{chain.count}</strong><span>{chain.share}%</span><small>{chain.episodeCount === null ? "—" : `${chain.episodeCount} ep.`}</small></aside>
                    </article>
                  ))}
                </div>
                <p className="research-method-note">{t("I valori “Not documented” restano visibili: ARCUS non completa né imputa passaggi mancanti.", "“Not documented” values remain visible: ARCUS does not complete or impute missing links.")}</p>
              </> : <EmptyState>{t("Nessuna catena disponibile per la coorte corrente.", "No chains are available for the current cohort.")}</EmptyState>}
            </section>
          )}

          {module === "analogues" && (
            <section className="research-module" data-research-module="analogues">
              <ModuleHeading
                eyebrow="ANALOGUE CASE LAB"
                title={t("Confrontabilità spiegata, non black box", "Explained comparability, not a black box")}
                text={t("Scegli un caso e controlla quali caratteristiche producono la similarità. Il risultato non è una previsione.", "Choose a case and inspect which characteristics produce similarity. The result is not a prediction.")}
              />
              {selectedTarget ? <>
                <div className="research-analogue-controls">
                  <label className="research-filter">
                    <span>{t("Caso indice", "Index case")}</span>
                    <select onChange={(event) => setTargetId(event.target.value)} value={selectedTarget.event_id}>
                      {filteredEvents.map((event) => <option key={event.event_id} value={event.event_id}>{publicEventId(event)} · {eventName(event)} · {event.date}</option>)}
                    </select>
                  </label>
                  <label className="research-switch"><input checked={excludeSameEpisode} onChange={(event) => setExcludeSameEpisode(event.target.checked)} type="checkbox" /><span>{t("Escludi lo stesso episodio", "Exclude same episode")}</span></label>
                </div>
                <div className="research-feature-grid">
                  {ANALOGUE_FEATURES.map((feature) => (
                    <label className={enabledFeatureKeys.includes(feature.key) ? "is-enabled" : ""} key={feature.key}>
                      <input checked={enabledFeatureKeys.includes(feature.key)} onChange={() => toggleFeature(feature.key)} type="checkbox" />
                      <span>{feature.label}</span><small>w {feature.weight}</small>
                    </label>
                  ))}
                </div>
                {analogueFeatures.length < 2 ? <div className="research-alert">{t("Attiva almeno due variabili confrontabili.", "Enable at least two comparable variables.")}</div> : (
                  <>
                    <div className="research-analogue-list">
                      {analogues.map((result, index) => (
                        <article key={result.candidate.event_id}>
                          <div className="research-analogue-rank">{String(analogueRank(analogues, index)).padStart(2, "0")}</div>
                          <div className="research-analogue-event">
                            <span>{publicEventId(result.candidate)} · {result.candidate.date}</span>
                            <h4>{eventName(result.candidate)}</h4>
                            <p>{result.candidate.municipality} · {result.candidate.region}</p>
                            <div>{result.contributions.map((item) => <em className={item.matched ? "is-match" : ""} key={item.key}>{item.label}: {item.matched ? "=" : "≠"}</em>)}</div>
                          </div>
                          <aside><strong>{result.score}%</strong><span>{t("similarità", "similarity")}</span><small>{result.coverage}% {t("copertura", "coverage")}</small><small className={result.equivalentCandidateCount > 1 ? "is-caution" : ""}>{result.equivalentCandidateCount} {t("candidati equivalenti", "equivalent candidates")}</small></aside>
                        </article>
                      ))}
                    </div>
                    <section className="research-analogue-sensitivity">
                      <header>
                        <div><span>LEAVE-ONE-FEATURE-OUT</span><h4>{t("Stabilità dei primi cinque analoghi", "Top-five analogue stability")}</h4></div>
                        <div><strong>{analogueSensitivity.meanRetention ?? "—"}%</strong><span>{t("ritenzione media", "mean retention")}</span><small className={(analogueSensitivity.minimumRetention ?? 100) < 60 ? "is-caution" : ""}>min {analogueSensitivity.minimumRetention ?? "—"}%</small></div>
                      </header>
                      <div className="research-feature-sensitivity-grid">
                        {analogueSensitivity.rows.map((row) => (
                          <article key={row.removedFeatureKey}><span>{row.removedFeatureLabel}</span><strong>{row.retention}%</strong><small>{row.retained}/{analogueSensitivity.baseCount} {t("analoghi mantenuti", "analogues retained")}</small></article>
                        ))}
                      </div>
                      <p>{t("Ogni prova rimuove una variabile e ricalcola i primi cinque casi. Una bassa ritenzione segnala che il risultato dipende fortemente da quella scelta metodologica.", "Each run removes one variable and recalculates the top five cases. Low retention indicates that the result depends strongly on that methodological choice.")}</p>
                    </section>
                  </>
                )}
                <p className="research-method-note">{t("La percentuale è un confronto pesato sui soli campi popolati in entrambi i casi. Non misura rischio, sicurezza o probabilità di collasso.", "The percentage is a weighted comparison across fields populated in both cases. It does not measure risk, safety or collapse probability.")}</p>
              </> : <EmptyState>{t("Nessun caso nella coorte corrente.", "No case in the current cohort.")}</EmptyState>}
            </section>
          )}

          {module === "robustness" && (
            <section className="research-module" data-research-module="robustness">
              <ModuleHeading
                eyebrow="ROBUSTNESS & SENSITIVITY"
                title={t("Quali letture sopravvivono a criteri più severi", "Which readings survive stricter criteria")}
                text={t("Confronta il processo più rappresentato quando cambiano qualità dell’evidenza, fonti e indipendenza degli episodi.", "Compare the most represented process as evidence quality, sources and episode independence change.")}
              />
              {filteredEvents.length ? <>
                <div className="research-robustness-summary">
                  <div><span>{t("Processo di riferimento", "Reference process")}</span><strong>{robustness.baseTop?.label || "—"}</strong><small>{robustness.baseTop ? `${robustness.baseTop.count} record · ${robustness.baseTop.share}%` : t("non documentato", "not documented")}</small></div>
                  <div><span>LEAVE-ONE-EPISODE-OUT</span><strong>{robustness.leaveOneEpisodeOutStability === null ? "—" : `${robustness.leaveOneEpisodeOutStability}%`}</strong><small>{t("stabilità della categoria principale", "stability of the leading category")}</small></div>
                </div>
                <div className="research-table-wrap research-robustness-table">
                  <table>
                    <thead><tr><th>{t("Scenario", "Scenario")}</th><th>n</th><th>{t("Ritenzione", "Retention")}</th><th>{t("Processo principale", "Leading process")}</th><th>{t("Esito", "Outcome")}</th></tr></thead>
                    <tbody>{robustness.scenarios.map((scenario) => (
                      <tr key={scenario.key}><th>{scenario.label}</th><td>{scenario.count}</td><td>{scenario.retention}%</td><td>{scenario.top?.label || "—"}{scenario.top ? ` · ${scenario.top.share}%` : ""}</td><td><span className={scenario.topRetained ? "research-status is-stable" : "research-status is-sensitive"}>{scenario.topRetained ? t("stabile", "stable") : t("sensibile", "sensitive")}</span></td></tr>
                    ))}</tbody>
                  </table>
                </div>
                <p className="research-method-note">{t("“Stabile” significa soltanto che rimane la categoria più frequente nel database sotto lo scenario indicato. Non costituisce validazione statistica o ingegneristica.", "“Stable” only means that the category remains the most frequent in the database under the stated scenario. It is not statistical or engineering validation.")}</p>
              </> : <EmptyState>{t("Nessun record da sottoporre a sensibilità.", "No records are available for sensitivity checks.")}</EmptyState>}
            </section>
          )}

          {module === "coverage" && (
            <section className="research-module" data-research-module="coverage">
              <ModuleHeading
                eyebrow="RESEARCH DATA READINESS"
                title={t("Cosa è davvero confrontabile nella coorte", "What is genuinely comparable in the cohort")}
                text={t(
                  "Misura la disponibilità dei campi strutturati senza trasformare la completezza in una valutazione delle condizioni o della sicurezza del ponte.",
                  "Measure structured field availability without turning completeness into an asset-condition or safety assessment."
                )}
              />
              {researchAudit && filteredResearchProfiles.length ? <>
                <div className="research-kpi-grid">
                  <article><strong>{filteredResearchProfiles.length}</strong><span>{t("profili nella coorte", "profiles in cohort")}</span></article>
                  <article><strong>{researchCoverageRows.filter((field) => field.coverage >= 80).length}</strong><span>{t("campi con copertura ≥80%", "fields with ≥80% coverage")}</span></article>
                  <article><strong>{researchCoverageRows.filter((field) => field.available === 0).length}</strong><span>{t("campi non ancora strutturati", "fields not yet structured")}</span></article>
                  <article><strong>{researchCoverageRows.find((field) => field.field === "episode_id")?.available || 0}</strong><span>{t("record con controllo episodio", "records with episode control")}</span></article>
                </div>
                <div className="research-table-wrap research-robustness-table">
                  <table>
                    <thead>
                      <tr>
                        <th>{t("Gruppo", "Group")}</th>
                        <th>{t("Campo", "Field")}</th>
                        <th>{t("Fase", "Phase")}</th>
                        <th>{t("Disponibili", "Available")}</th>
                        <th>{t("Copertura", "Coverage")}</th>
                        <th>{t("Uso nel learning", "Learning use")}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {researchCoverageRows.map((field) => (
                        <tr key={field.field}>
                          <th>{field.group}</th>
                          <td>{field.field}</td>
                          <td>{field.phase}</td>
                          <td>{field.available}/{filteredResearchProfiles.length}</td>
                          <td><strong>{field.coverage}%</strong></td>
                          <td>{field.learning_gate}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="research-enrichment-heading">
                  <span>CONTROLLED ENRICHMENT PILOT</span>
                  <h4>{t("Casi con nuova strutturazione documentale", "Cases with newly structured evidence")}</h4>
                  <p>{t(
                    "Sono mostrati soltanto i casi compresi nella coorte attiva. I valori sono collegati alle fonti ma restano esclusi dal learning di produzione fino alla revisione specialistica.",
                    "Only cases in the active cohort are shown. Values are source-linked but remain outside production learning until domain review."
                  )}</p>
                </div>
                {enrichedResearchProfiles.length ? (
                  <div className="research-table-wrap research-enrichment-table">
                    <table>
                      <thead>
                        <tr>
                          <th>{t("Evento", "Event")}</th>
                          <th>{t("Ponte", "Bridge")}</th>
                          <th>{t("Causa", "Cause")}</th>
                          <th>{t("Campi strutturati", "Structured fields")}</th>
                          <th>{t("Revisione", "Review")}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {enrichedResearchProfiles.map(({ event, profile }) => (
                          <tr key={profile.event_id}>
                            <th>{profile.event_id}</th>
                            <td>{event ? eventName(event) : "—"}</td>
                            <td>{event?.specific_cause || "—"}</td>
                            <td>{profile.enrichment_summary.applied_field_count}</td>
                            <td>{t("fonti strutturate · revisione specialistica richiesta", "source-structured · domain review required")}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p className="research-empty research-enrichment-empty">{t(
                    "La coorte attiva non contiene ancora casi del pilota documentale.",
                    "The active cohort does not yet include documentary pilot cases."
                  )}</p>
                )}
                <p className="research-method-note">{t(
                  "Solo l’identificativo di episodio è già ammesso come controllo di indipendenza. Lunghezza e presenza di pile in alveo restano descrittive e sperimentali; gli altri nuovi campi non entreranno nel motore finché non saranno popolati, verificati e sottoposti a un value audit separato.",
                  "Only episode identity is currently admitted as an independence control. Bridge length and active-riverbed pier presence remain descriptive and experimental; other new fields will not enter the engine until they are populated, verified and pass a separate value audit."
                )}</p>
              </> : <EmptyState>{t("Il profilo di readiness della ricerca non è disponibile.", "The research readiness profile is unavailable.")}</EmptyState>}
            </section>
          )}

          {module === "notebook" && (
            <section className="research-module" data-research-module="notebook">
              <ModuleHeading
                eyebrow="REPRODUCIBLE RESEARCH NOTEBOOK"
                title={t("Salva il ragionamento insieme al risultato", "Save the reasoning with the result")}
                text={t("Conserva filtri, soglie e configurazione; esporta dati, metodi, risultati e checksum in un unico pacchetto.", "Preserve filters, thresholds and configuration; export data, methods, results and checksums in one package.")}
              />
              <div className="research-notebook-grid">
                <div className="research-panel research-notebook-editor">
                  <label><span>{t("Titolo dell’analisi", "Analysis title")}</span><input onChange={(event) => setNotebookTitle(event.target.value)} placeholder={t("Es. sensibilità degli episodi idraulici", "E.g. hydraulic episode sensitivity")} value={notebookTitle} /></label>
                  <label><span>{t("Nota metodologica", "Method note")}</span><textarea onChange={(event) => setNotebookNotes(event.target.value)} placeholder={t("Ipotesi, scelte e limiti da ricordare…", "Assumptions, choices and limitations to retain…")} rows="7" value={notebookNotes} /></label>
                  <button disabled={!filteredEvents.length} onClick={saveNotebook} type="button">{t("Salva configurazione", "Save configuration")}</button>
                </div>
                <div className="research-panel research-package-card">
                  <span>RESEARCH PACKAGE / ZIP</span>
                  <strong>{filteredEvents.length} {t("record", "records")}</strong>
                  <p>{t("Manifest, checksum SHA-256, record, fonti, catene, episodi, analoghi, robustezza e metodo. I dati mancanti restano mancanti.", "Manifest, SHA-256 checksums, records, sources, chains, episodes, analogues, robustness and method. Missing data remain missing.")}</p>
                  <button disabled={!filteredEvents.length || packageStatus === "working"} onClick={downloadResearchPackage} type="button">{packageStatus === "working" ? t("Preparazione…", "Preparing…") : t("Scarica pacchetto riproducibile", "Download reproducible package")}</button>
                  {packageStatus === "done" && <small role="status">{t("Pacchetto generato.", "Package generated.")}</small>}
                  {packageStatus === "error" && <small className="is-error" role="alert">{t("Generazione non riuscita.", "Package generation failed.")}</small>}
                </div>
              </div>
              <div className="research-saved-list">
                <h4>{t("Analisi salvate nel browser", "Analyses saved in this browser")}</h4>
                {savedNotebooks.length ? savedNotebooks.map((notebook) => (
                  <article key={notebook.id}>
                    <div><strong>{notebook.title}</strong><span>{new Date(notebook.created_at).toLocaleString(language)}</span><p>{notebook.notes || t("Nessuna nota", "No notes")}</p></div>
                    <aside><button onClick={() => restoreNotebook(notebook)} type="button">{t("Ripristina", "Restore")}</button><button onClick={() => deleteNotebook(notebook.id)} type="button">{t("Elimina", "Delete")}</button></aside>
                  </article>
                )) : <EmptyState>{t("Nessuna configurazione salvata.", "No saved configuration.")}</EmptyState>}
              </div>
            </section>
          )}

          <footer className="research-footer-boundary">
            <strong>{t("Confine interpretativo", "Interpretation boundary")}</strong>
            <p>{t(
              "ARCUS descrive collassi documentati e la loro evidenza. Non rappresenta l’inventario dei ponti italiani e non stima probabilità, sicurezza, causalità o prevalenza nazionale.",
              "ARCUS describes documented collapses and their evidence. It does not represent the Italian bridge inventory and does not estimate probability, safety, causality or national prevalence."
            )}</p>
          </footer>
        </main>
      </div>
    </div>
  );
}

export default PremiumAnalyticsPage;
