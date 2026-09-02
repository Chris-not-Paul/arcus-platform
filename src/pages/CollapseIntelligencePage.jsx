import {
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import CollapseMap from "../components/map/CollapseMap";
import PointHazardInspector from "../components/hazard/PointHazardInspector";
import Navbar from "../components/layout/Navbar";
import PageMeta from "../components/layout/PageMeta";
import useLanguage from "../context/useLanguage";
import {
  professionalHazardExposurePoint,
  professionalMitigationIntelligence,
  professionalResource,
} from "../utils/apiClient";
import {
  deriveProvinceForPoint,
} from "../utils/projectLocation";
import {
  buildMitigationReportSummary,
} from "../utils/mitigationReportSummary";
import {
  buildCollapseIntelligenceReportModel,
  downloadCollapseIntelligencePdf,
} from "../utils/collapseIntelligenceReport";
import {
  PROJECT_BRIDGE_PROFILE_OPTIONS,
} from "../utils/projectBridgeProfile";

import "../styles/collapse-intelligence.css";

function displayCode(value) {
  return String(value || "-").replaceAll("_", " ");
}

function localized(value, language) {
  return value?.[language] || value?.en || value?.it || "-";
}

function sourcesByEvent(sources) {
  return sources.reduce((index, source) => {
    const eventId = source.event_id;

    if (!eventId) {
      return index;
    }

    index[eventId] ||= [];
    index[eventId].push(source);
    return index;
  }, {});
}

const EMPTY_PROJECT_BRIDGE_PROFILE = Object.freeze({
  bridge_crossing_type: "",
  bridge_length_m: "",
  destination_use: "",
  material_type: "",
  piers_in_active_riverbed: "",
  structural_type: "",
});

function supportCard(support, domain, language) {
  const evidence = support?.evidence || {};
  const it = language === "it";

  return {
    domain,
    episodes:
      evidence.independent_episodes ??
      evidence.episode_count ??
      0,
    evidence:
      evidence.episode_effective_evidence ??
      evidence.episode_effective_evidence_count ??
      0,
    reasons: (support?.abstention_reasons || []).map(displayCode),
    status: displayCode(support?.status || "not available"),
    text:
      support?.status === "abstained"
        ? it
          ? "ARCUS dichiara il limite e non genera strategie apprese dai collassi."
          : "ARCUS declares the limit and does not generate collapse-learned strategies."
        : it
          ? "Supporto evidenziale disponibile."
          : "Evidence support available.",
  };
}

export default function CollapseIntelligencePage() {
  const { language } = useLanguage();
  const it = language === "it";
  const requestRef = useRef(0);
  const [events, setEvents] = useState([]);
  const [sources, setSources] = useState([]);
  const [provinceFeatures, setProvinceFeatures] = useState([]);
  const [point, setPoint] = useState(null);
  const [exposure, setExposure] = useState(null);
  const [intelligence, setIntelligence] = useState(null);
  const [projectBridgeProfile, setProjectBridgeProfile] = useState({
    ...EMPTY_PROJECT_BRIDGE_PROFILE,
  });
  const [projectProfileDirty, setProjectProfileDirty] = useState(false);
  const [status, setStatus] = useState("idle");
  const [error, setError] = useState("");

  useEffect(() => {
    professionalResource("professional-events")
      .then((data) => setEvents(Array.isArray(data.events) ? data.events : []))
      .catch(() => setEvents([]));

    professionalResource("professional-sources")
      .then((data) => setSources(Array.isArray(data) ? data : data.sources || []))
      .catch(() => setSources([]));

    fetch("/data/geo/italy-provinces.geojson")
      .then((response) => {
        if (!response.ok) {
          throw new Error("province_geometry_unavailable");
        }

        return response.json();
      })
      .then((data) => setProvinceFeatures(data.features || []))
      .catch(() => setProvinceFeatures([]));
  }, []);

  const eventSources = useMemo(() => sourcesByEvent(sources), [sources]);
  const reportSummary = useMemo(
    () => buildMitigationReportSummary(intelligence, { language }),
    [intelligence, language]
  );
  const reportModel = useMemo(
    () => intelligence && point
      ? buildCollapseIntelligenceReportModel({
          eventSources,
          exposure,
          intelligence,
          language,
          point,
          reportSummary,
        })
      : null,
    [eventSources, exposure, intelligence, language, point, reportSummary]
  );
  const analogues =
    intelligence?.evidence_cohort?.analogue_retrieval?.analogues || [];
  const projectProfileResult = intelligence?.project_bridge_profile || {};
  const projectProfileFields = projectProfileResult.match_fields_provided || [];
  const strategies = intelligence?.strategies || [];
  const evidence = intelligence?.evidence_cohort || {};
  const failureLearning = intelligence?.failure_learning_matrix || {};
  const failureLearningContractAvailable = Boolean(
    failureLearning.matrix_version
  );
  const failureLearningStatus = failureLearningContractAvailable
    ? failureLearning.status || "abstained"
    : "contract_unavailable";
  const failureLearningRows = Array.isArray(failureLearning.rows)
    ? failureLearning.rows
    : [];
  const domainSupport = [
    supportCard(intelligence?.landslide_support, it ? "Frane" : "Landslide", language),
    supportCard(intelligence?.seismic_support, it ? "Sisma" : "Seismic", language),
  ];

  const queryPoint = async (selectedPoint) => {
    const requestId = requestRef.current + 1;
    requestRef.current = requestId;
    const derived = deriveProvinceForPoint(provinceFeatures, selectedPoint);

    setExposure(null);
    setIntelligence(null);
    setError("");

    if (!derived.validated) {
      setPoint({
        ...selectedPoint,
        derivedProvince: "",
        validated: false,
      });
      setStatus("blocked");
      setError(
        it
          ? "Il punto non ricade in una provincia italiana verificabile oppure la geometria provinciale non è disponibile."
          : "The point is not inside a verifiable Italian province, or province geometry is unavailable."
      );
      return;
    }

    const projectPoint = {
      derivedProvince: derived.derivedProvince,
      derivedProvinceCode: derived.derivedProvinceCode,
      latitude: derived.latitude,
      longitude: derived.longitude,
      validated: true,
    };

    setPoint(projectPoint);
    setStatus("loading");

    try {
      const officialExposure = await professionalHazardExposurePoint({
        bypassCache: false,
        hazards: ["hydraulic", "landslide", "seismic"],
        include_nearby_context: true,
        latitude: projectPoint.latitude,
        longitude: projectPoint.longitude,
      });

      if (requestRef.current !== requestId) {
        return;
      }

      setExposure(officialExposure);

      const mitigation = await professionalMitigationIntelligence({
        official_exposure: {
          hydraulic: officialExposure.hydraulic || null,
          landslide: officialExposure.landslide || null,
          seismic: officialExposure.seismic || null,
        },
        project_context: "bridge",
        project_bridge_profile: projectBridgeProfile,
        project_location: {
          derived_province: projectPoint.derivedProvince,
          latitude: projectPoint.latitude,
          longitude: projectPoint.longitude,
          validated: true,
        },
      });

      if (requestRef.current !== requestId) {
        return;
      }

      setIntelligence(mitigation);
      setProjectProfileDirty(false);
      setStatus("ready");
    } catch (queryError) {
      if (requestRef.current !== requestId) {
        return;
      }

      setStatus("error");
      setError(
        it
          ? "Il servizio ufficiale o il motore Collapse Intelligence non è raggiungibile. Il dato mancante non viene trasformato in rischio zero."
          : "The official service or Collapse Intelligence engine is unavailable. Missing data is not converted into zero risk."
      );
      console.error("ARCUS Collapse Intelligence query failed", queryError);
    }
  };

  const updateProjectBridgeProfile = (field, value) => {
    setProjectBridgeProfile((current) => ({
      ...current,
      [field]: value,
    }));
    setProjectProfileDirty(Boolean(intelligence));
  };

  const downloadEvidencePackage = () => {
    if (!reportModel) {
      return;
    }

    const payload = {
      generated_at: reportModel.generatedAt,
      official_exposure: exposure,
      product: reportModel.product,
      report_model: reportModel,
      result: intelligence,
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], {
      type: "application/json;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `arcus-collapse-intelligence-${Number(point.latitude).toFixed(4)}-${Number(point.longitude).toFixed(4)}.json`;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  const downloadPdf = async () => {
    if (!reportModel) {
      return;
    }

    try {
      await downloadCollapseIntelligencePdf(reportModel);
    } catch (pdfError) {
      setError(
        it
          ? "Il PDF non è stato generato. L'evidence package JSON resta disponibile."
          : "The PDF could not be generated. The JSON evidence package remains available."
      );
      console.error("ARCUS Collapse Intelligence PDF failed", pdfError);
    }
  };

  return (
    <main className="collapse-intelligence-page" id="main-content">
      <PageMeta
        title="ARCUS Collapse Intelligence"
        description={
          it
            ? "Lezioni tracciabili dai collassi passati per orientare verifiche e mitigazione senza produrre prescrizioni automatiche."
            : "Traceable lessons from past collapses to guide investigation and mitigation without automatic prescriptions."
        }
      />
      <Navbar />

      <header className="collapse-intelligence-hero">
        <div className="platform-container">
          <span>ARCUS PROFESSIONAL</span>
          <h1>Collapse Intelligence<br />Lessons from Failures</h1>
          <p>
            {it
              ? "Seleziona un punto. ARCUS legge l’esposizione ufficiale, recupera collassi comparabili su scala nazionale e mostra soltanto le lezioni sostenute dall’evidenza disponibile."
              : "Select a point. ARCUS reads official exposure, retrieves comparable collapses nationally and shows only lessons supported by the available evidence."}
          </p>
          <div className="collapse-intelligence-boundary">
            <b>{it ? "Confine del prodotto" : "Product boundary"}</b>
            <span>
              {it
                ? "Nessuna probabilità di collasso, classe safe/unsafe, ranking patrimoniale o prescrizione automatica."
                : "No collapse probability, safe/unsafe class, portfolio ordering or automatic prescription."}
            </span>
          </div>
        </div>
      </header>

      <section className="collapse-intelligence-workspace">
        <div className="platform-container">
          <div className="collapse-intelligence-step-heading">
            <span>01 / {it ? "PUNTO PROGETTO" : "PROJECT POINT"}</span>
            <h2>{it ? "Interroga il contesto reale" : "Query the real context"}</h2>
            <p>
              {it
                ? "Clicca sulla mappa italiana. La provincia è sempre derivata dal punto, mai dalla selezione preliminare del client."
                : "Click the Italian map. Province is always derived from the point, never from a preliminary client selection."}
            </p>
          </div>

          <section className="collapse-intelligence-project-profile">
            <header>
              <div>
                <span>PROJECT BRIDGE PROFILE V1</span>
                <h3>{it ? "Caratteristiche dichiarate del ponte" : "Declared bridge characteristics"}</h3>
              </div>
              <strong>{it ? "FACOLTATIVO" : "OPTIONAL"}</strong>
            </header>
            <p>
              {it
                ? "Compila solo i campi conosciuti. Materiale, tipologia, attraversamento e destinazione d’uso intervengono come spareggio non pesato dopo la firma idraulica. Lunghezza e pile in alveo restano descrittive. Nessun dato mancante viene inferito."
                : "Enter only known fields. Material, structure, crossing and use act as an unweighted tie-breaker after the hydraulic signature. Length and riverbed piers remain descriptive. No missing value is inferred."}
            </p>
            <div className="collapse-intelligence-project-profile-fields">
              {[
                ["bridge_crossing_type", it ? "Tipo di attraversamento" : "Crossing type"],
                ["material_type", it ? "Materiale" : "Material"],
                ["structural_type", it ? "Tipologia strutturale" : "Structural type"],
                ["destination_use", it ? "Destinazione d’uso" : "Use"],
              ].map(([field, label]) => (
                <label htmlFor={`project-bridge-profile-${field}`} key={field}>
                  <span>{label}</span>
                  <select
                    disabled={status === "loading"}
                    id={`project-bridge-profile-${field}`}
                    onChange={(event) => updateProjectBridgeProfile(field, event.target.value)}
                    value={projectBridgeProfile[field]}
                  >
                    <option value="">{it ? "Non dichiarato" : "Not declared"}</option>
                    {PROJECT_BRIDGE_PROFILE_OPTIONS[field].map((option) => (
                      <option key={option} value={option}>{displayCode(option)}</option>
                    ))}
                  </select>
                </label>
              ))}
              <label htmlFor="project-bridge-profile-bridge-length-m">
                <span>{it ? "Lunghezza indicativa (m) — descrittiva" : "Indicative length (m) — descriptive"}</span>
                <input
                  disabled={status === "loading"}
                  id="project-bridge-profile-bridge-length-m"
                  inputMode="decimal"
                  max="10000"
                  min="0"
                  onChange={(event) => updateProjectBridgeProfile("bridge_length_m", event.target.value)}
                  type="number"
                  value={projectBridgeProfile.bridge_length_m}
                />
              </label>
              <label htmlFor="project-bridge-profile-piers-in-active-riverbed">
                <span>{it ? "Pile in alveo attivo — descrittivo" : "Piers in active riverbed — descriptive"}</span>
                <select
                  disabled={status === "loading"}
                  id="project-bridge-profile-piers-in-active-riverbed"
                  onChange={(event) => updateProjectBridgeProfile("piers_in_active_riverbed", event.target.value)}
                  value={projectBridgeProfile.piers_in_active_riverbed}
                >
                  <option value="">{it ? "Non dichiarato" : "Not declared"}</option>
                  <option value="true">{it ? "Sì" : "Yes"}</option>
                  <option value="false">No</option>
                </select>
              </label>
            </div>
            {projectProfileDirty && point ? (
              <button
                className="collapse-intelligence-profile-refresh"
                disabled={status === "loading"}
                onClick={() => queryPoint(point)}
                type="button"
              >
                {it ? "Aggiorna analisi con il profilo" : "Refresh analysis with profile"}
              </button>
            ) : null}
          </section>

          <div className="collapse-intelligence-map">
            <CollapseMap
              filteredEvents={events}
              height="520px"
              onPointSelect={queryPoint}
              professionalMode
              selectedPoint={point}
              showEventMarkers
              showHeatmap={false}
              sidebarOpen={false}
              sourcesByEvent={eventSources}
            />
          </div>

          {point ? (
            <div className="collapse-intelligence-location">
              <div>
                <span>{it ? "Coordinate" : "Coordinates"}</span>
                <strong>{Number(point.latitude).toFixed(6)}, {Number(point.longitude).toFixed(6)}</strong>
              </div>
              <div>
                <span>{it ? "Provincia derivata" : "Derived province"}</span>
                <strong>{point.derivedProvince || "-"}</strong>
              </div>
              <div>
                <span>{it ? "Stato" : "Status"}</span>
                <strong>{displayCode(status)}</strong>
              </div>
            </div>
          ) : null}

          {error ? <p className="collapse-intelligence-error">{error}</p> : null}

          <PointHazardInspector
            exposure={exposure}
            language={language}
            onRetry={() => point && queryPoint(point)}
            point={point}
            status={status}
          />
        </div>
      </section>

      {intelligence ? (
        <section className="collapse-intelligence-results">
          <div className="platform-container">
            <div className="collapse-intelligence-step-heading">
              <span>02 / {it ? "LEZIONI DAI COLLASSI" : "LESSONS FROM FAILURES"}</span>
              <h2>{it ? "Dall’evidenza alle priorità d’indagine" : "From evidence to investigation priorities"}</h2>
              <p>{reportSummary.cohortText}</p>
            </div>

            <section className="collapse-intelligence-profile-result">
              <span>PROJECT BRIDGE PROFILE V1</span>
              <strong>{displayCode(projectProfileResult.matching_mode || "hydraulic_signature_only")}</strong>
              <p>{reportSummary.projectProfileText}</p>
              {projectProfileFields.length ? (
                <div>
                  {projectProfileFields.map((field) => (
                    <b key={field}>
                      {displayCode(field)}: {displayCode(projectProfileResult.provided_fields?.[field])}
                    </b>
                  ))}
                </div>
              ) : null}
            </section>

            <div className="collapse-intelligence-evidence-strip">
              <article><span>{it ? "Stato" : "Status"}</span><strong>{displayCode(intelligence.status)}</strong></article>
              <article><span>{it ? "Evidenza raw" : "Raw evidence"}</span><strong>{evidence.event_count || 0}</strong></article>
              <article><span>{it ? "Evidenza effective" : "Effective evidence"}</span><strong>{evidence.effective_evidence_count || 0}</strong></article>
              <article><span>{it ? "Episodi indipendenti" : "Independent episodes"}</span><strong>{evidence.episode_count || 0}</strong></article>
              <article><span>{it ? "Analoghi" : "Analogues"}</span><strong>{analogues.length}</strong></article>
            </div>

            <div className="collapse-intelligence-result-grid">
              <article className="collapse-intelligence-main-result">
                <header>
                  <span>{it ? "Output sostenuto" : "Supported output"}</span>
                  <strong>{strategies.length ? `${strategies.length} ${it ? "priorità" : "priorities"}` : (it ? "Astensione" : "Abstained")}</strong>
                </header>

                {strategies.length ? strategies.map((strategy) => (
                  <section key={strategy.strategy_id}>
                    <span>{displayCode(strategy.process)}</span>
                    <h3>{strategy.investigation_priority?.[language] || strategy.investigation_priority?.en || strategy.strategy_id}</h3>
                    <p>{strategy.purpose?.[language] || strategy.purpose?.en}</p>
                    <dl>
                      <div><dt>{it ? "Casi" : "Cases"}</dt><dd>{strategy.arcus_evidence?.raw_count || 0}</dd></div>
                      <div><dt>{it ? "Evidenza effective" : "Effective evidence"}</dt><dd>{strategy.arcus_evidence?.effective_evidence_count || 0}</dd></div>
                      <div><dt>{it ? "Episodi" : "Episodes"}</dt><dd>{strategy.arcus_evidence?.episode_count || 0}</dd></div>
                    </dl>
                    <p className="collapse-intelligence-control-theme">
                      <b>{it ? "Tema di controllo: " : "Risk-control theme: "}</b>
                      {strategy.risk_control_theme?.[language] || strategy.risk_control_theme?.en || "-"}
                    </p>
                  </section>
                )) : (
                  <div className="collapse-intelligence-abstention">
                    <h3>{it ? "Nessuna strategia generata" : "No strategy generated"}</h3>
                    <p>{reportSummary.outcomeText}</p>
                    <p>{it
                      ? "L’astensione è un risultato corretto: evita di trasformare assenza di intersezione o supporto insufficiente in una falsa raccomandazione."
                      : "Abstention is a valid result: it avoids turning no intersection or insufficient support into a false recommendation."}</p>
                  </div>
                )}
              </article>

              <aside className="collapse-intelligence-side-result">
                <h3>{it ? "Qualità e limiti" : "Quality and limits"}</h3>
                <p>{reportSummary.evidenceText}</p>
                <p>{reportSummary.registryQualityText}</p>
                <p>{reportSummary.retrievalRobustnessText}</p>
                <p>{reportSummary.sourceText}</p>
              </aside>
            </div>

            <section className="collapse-intelligence-learning-matrix">
              <header>
                <div>
                  <span>FAILURE LEARNING MATRIX V1</span>
                  <h3>{it ? "Cosa insegnano i collassi comparabili" : "What comparable collapses teach"}</h3>
                </div>
                <strong data-status={failureLearningStatus}>
                  {displayCode(failureLearningStatus)}
                </strong>
              </header>

              <div className="collapse-intelligence-learning-summary">
                <div><span>{it ? "Righe osservate" : "Observed rows"}</span><b>{failureLearning.row_count || 0}</b></div>
                <div><span>{it ? "Priorità qualificate" : "Qualified priorities"}</span><b>{failureLearning.qualified_priority_count || 0}</b></div>
                <div><span>{it ? "Episodi" : "Episodes"}</span><b>{failureLearning.evidence_summary?.episode_count || 0}</b></div>
                <div><span>Episode-effective</span><b>{failureLearning.evidence_summary?.episode_effective_evidence_count || 0}</b></div>
              </div>

              {failureLearningContractAvailable && failureLearningRows.length ? (
                <div className="collapse-intelligence-learning-rows">
                  {failureLearningRows.map((row) => {
                    const geometry = row.geometry_context || {};
                    const components = (row.affected_components || [])
                      .slice(0, 3)
                      .map((item) => `${displayCode(item.component)} (${item.raw_count})`)
                      .join(", ");

                    return (
                      <article key={row.matrix_row_id} data-learning-status={row.learning_status}>
                        <div className="collapse-intelligence-learning-row-heading">
                          <span>{displayCode(row.learning_status)}</span>
                          <h4>{displayCode(row.process)}</h4>
                        </div>
                        <p>{localized(row.learning_statement, language)}</p>
                        <dl>
                          <div><dt>{it ? "Casi" : "Cases"}</dt><dd>{row.evidence?.raw_count || 0}</dd></div>
                          <div><dt>{it ? "Effective" : "Effective"}</dt><dd>{row.evidence?.effective_evidence_count || 0}</dd></div>
                          <div><dt>{it ? "Episodi" : "Episodes"}</dt><dd>{row.evidence?.episode_count || 0}</dd></div>
                        </dl>
                        <p><b>{it ? "Componenti osservati: " : "Observed components: "}</b>{components || "-"}</p>
                        <p><b>{it ? "Domanda d’indagine: " : "Investigation question: "}</b>{localized(row.investigation_question, language)}</p>
                        {row.investigation_priority ? (
                          <p className="collapse-intelligence-learning-priority">
                            <b>{it ? "Priorità sostenuta: " : "Supported priority: "}</b>
                            {localized(row.investigation_priority, language)}
                          </p>
                        ) : null}
                        {geometry.geometry_event_count ? (
                          <small>
                            {it ? "Geometria descrittiva della coorte" : "Descriptive cohort geometry"}: {geometry.geometry_event_count} {it ? "casi" : "cases"}; {it ? "lunghezza mediana" : "median length"} {geometry.bridge_length_m?.median ?? "-"} m; {it ? "pile in alveo" : "piers in active riverbed"} {geometry.piers_in_active_riverbed?.true_count || 0}/{geometry.piers_in_active_riverbed?.available_count || 0}. {it ? "Non usata per selezione o qualificazione." : "Not used for selection or qualification."}
                          </small>
                        ) : null}
                      </article>
                    );
                  })}
                </div>
              ) : (
                <div className="collapse-intelligence-learning-empty">
                  <h4>{failureLearningContractAvailable
                    ? (it ? "Matrice in astensione" : "Matrix abstained")
                    : (it ? "Contratto matrice non disponibile" : "Matrix contract unavailable")}</h4>
                  <p>{failureLearningContractAvailable
                    ? (it
                        ? "Senza esposizione ufficiale attiva o supporto utilizzabile ARCUS non trasforma il contesto storico in una lezione progettuale."
                        : "Without active official exposure or usable support, ARCUS does not turn historical context into a project lesson.")
                    : (it
                        ? "La risposta API attiva non espone la Failure Learning Matrix v1. ARCUS non converte questa mancanza di contratto in un’astensione ingegneristica."
                        : "The active API response does not expose Failure Learning Matrix v1. ARCUS does not convert this contract gap into an engineering abstention.")}</p>
                </div>
              )}

              <footer>
                <p>{failureLearning.caveat || (it
                  ? "Nessuna interpretazione ingegneristica viene generata senza il contratto v1 completo."
                  : "No engineering interpretation is generated without the complete v1 contract.")}</p>
              </footer>
            </section>

            {analogues.length ? (
              <div className="collapse-intelligence-analogues">
                <header>
                  <span>{it ? "COORTE NAZIONALE" : "NATIONAL COHORT"}</span>
                  <h3>{it ? "Collassi comparabili recuperati" : "Retrieved comparable collapses"}</h3>
                </header>
                <ol>
                  {analogues.slice(0, 8).map((analogue) => (
                    <li key={analogue.event?.event_id || analogue.retrieval_rank}>
                      <b>#{analogue.retrieval_rank} {analogue.event?.municipality || "-"}, {analogue.event?.province || "-"}</b>
                      <span>{it ? "Evento" : "Event"} {analogue.event?.event_id || "-"}</span>
                      {projectProfileResult.match_field_count > 0 ? (
                        <span>
                          {it ? "Corrispondenze profilo" : "Profile matches"}: {analogue.retrieval_comparison?.project_bridge_profile?.exact_match_count || 0}/{analogue.retrieval_comparison?.project_bridge_profile?.compared_field_count || 0}
                        </span>
                      ) : null}
                    </li>
                  ))}
                </ol>
                <p>{it
                  ? "La firma hazard attuale serve alla comparabilità; non ricostruisce automaticamente la pericolosità all’anno del collasso e non dimostra la causa."
                  : "The current hazard signature supports comparability; it does not automatically reconstruct hazard at collapse time or prove causation."}</p>
              </div>
            ) : null}

            <div className="collapse-intelligence-domain-support">
              {domainSupport.map((item) => (
                <article key={item.domain}>
                  <span>{item.domain}</span>
                  <strong>{item.status}</strong>
                  <p>{item.text}</p>
                  <small>{item.reasons.join("; ") || (it ? "Nessun motivo aggiuntivo" : "No additional reason")}</small>
                </article>
              ))}
            </div>

            <footer className="collapse-intelligence-output-footer">
              <p>{reportSummary.warningText}</p>
              <div>
                <button onClick={downloadPdf} type="button">
                  {it ? "Scarica report PDF" : "Download PDF report"}
                </button>
                <button onClick={downloadEvidencePackage} type="button">
                  {it ? "Scarica JSON" : "Download JSON"}
                </button>
              </div>
            </footer>
          </div>
        </section>
      ) : null}
    </main>
  );
}
