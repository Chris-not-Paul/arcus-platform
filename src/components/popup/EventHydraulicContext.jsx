import useLanguage from "../../context/useLanguage";

function formatNumber(value, language, maximumFractionDigits = 1) {
  return Number(value).toLocaleString(language === "it" ? "it-IT" : "en-GB", {
    maximumFractionDigits,
  });
}

function formatDate(value, language) {
  if (!value) return "—";
  return new Intl.DateTimeFormat(language === "it" ? "it-IT" : "en-GB").format(
    new Date(`${value}T00:00:00Z`)
  );
}

function observationLabel(observation, it) {
  const labels = {
    discharge: it ? "Portata riferita" : "Reported discharge",
    danger_level: it ? "Soglia di pericolo" : "Danger threshold",
    stage_lower_bound: it ? "Livello minimo raggiunto" : "Minimum stage reached",
    stage_peak: it ? "Colmo idrometrico" : "Hydrometric peak",
    stage_above_danger_level: it
      ? "Superamento livello di pericolo"
      : "Above danger level",
  };
  return labels[observation.parameter] || observation.parameter;
}

function processLabel(process, it) {
  const labels = {
    bank_erosion: it ? "Erosione di sponda" : "Bank erosion",
    bed_erosion: it ? "Erosione del fondo alveo" : "Riverbed erosion",
    high_flow_velocity: it ? "Velocità elevate" : "High flow velocity",
    local_erosion: it ? "Erosione locale" : "Local erosion",
    pier_instability: it ? "Instabilità della pila" : "Pier instability",
    rapid_flood_response: it ? "Piena repentina" : "Rapid flood response",
    record_flood_peak: it ? "Colmo eccezionale" : "Exceptional flood peak",
    solid_transport: it ? "Trasporto solido" : "Solid transport",
    bank_erosion_or_embankment_failure: it ? "Erosione di sponda o rilevato" : "Bank or embankment erosion",
    overtopping_or_hydrodynamic_action: it ? "Sormonto o azione idrodinamica" : "Overtopping or hydrodynamic action",
    scour: it ? "Scalzamento" : "Scour",
    debris_flow_or_solid_transport: it ? "Colata detritica o trasporto solido" : "Debris flow or solid transport",
    debris_accumulation_or_obstruction: it ? "Accumulo di detriti o ostruzione" : "Debris accumulation or obstruction",
    other_documented_hydraulic_process: it ? "Altro processo idraulico documentato" : "Other documented hydraulic process",
  };
  return labels[process] || process;
}

function componentLabel(component, it) {
  const labels = {
    abutment: it ? "Spalla" : "Abutment",
    approach_embankment: it ? "Rilevato di accesso" : "Approach embankment",
    deck_or_superstructure: it ? "Impalcato o sovrastruttura" : "Deck or superstructure",
    entire_structure: it ? "Intera struttura" : "Entire structure",
    multiple_components: it ? "Componenti multipli" : "Multiple components",
    pier_foundation: it ? "Pila o fondazione" : "Pier or foundation",
  };
  return labels[component] || component;
}

function evidenceLabel(level, it) {
  const labels = {
    documented: it ? "Documentato" : "Documented",
    probable: it ? "Probabile" : "Probable",
    needs_review: it ? "Da verificare" : "Needs review",
    unspecified: it ? "Non specificato" : "Unspecified",
  };
  return labels[level] || level;
}

function ObservationPanel({ context, language, it }) {
  const hydrometry = context.event_hydrometry;
  const observations = hydrometry.observations || [];
  const hasLowerBound = observations.some((observation) => observation.operator === ">");
  const bridgeStation =
    hydrometry.interpretation === "station_installed_on_event_bridge_incomplete_peak";

  if (hydrometry.observation_status !== "observed") return null;

  return (
    <article className="arcus-event-hydraulic-observations">
      <div className="arcus-event-hydraulic-card-heading">
        <span>{it ? "Evidenza osservata" : "Observed evidence"}</span>
        <h4>{it ? "Misure riferite dalla stazione" : "Station measurements reported"}</h4>
        <p>
          {hasLowerBound
            ? (it
                ? "Valori pubblicati nel rapporto d’evento. Il simbolo > indica una soglia superata, non il valore di picco esatto."
                : "Values published in the event report. The > symbol denotes an exceeded threshold, not the exact peak value.")
            : (it
                ? "Valori pubblicati nel rapporto ufficiale dell’evento."
                : "Values published in the official event report.")}
        </p>
      </div>

      <div className="arcus-event-observation-values">
        {observations.map((observation) => (
          <div key={`${observation.station_code}-${observation.parameter}`}>
            <span>{observationLabel(observation, it)}</span>
            <strong>
              {observation.operator || ""}
              {formatNumber(
                observation.value,
                language,
                Number.isInteger(observation.value) ? 0 : 2
              )} <small>{observation.unit}</small>
            </strong>
          </div>
        ))}
      </div>

      <p className="arcus-event-hydraulic-warning">
        {bridgeStation
          ? (it
              ? "Il sensore era installato sul ponte. Il colmo effettivo ha superato la finestra di misura e lo strumento è stato distrutto: il valore mostrato è un limite inferiore."
              : "The sensor was installed on the bridge. The actual peak exceeded the measurement window and the instrument was destroyed: the displayed value is a lower bound.")
          : (it
              ? "La stazione descrive la piena nel bacino; i valori non sono misure alla sezione del ponte collassato."
              : "The station describes the basin flood; values were not measured at the collapsed bridge section.")}
      </p>
    </article>
  );
}

function ModelledFlowPanel({ watercourse, language, it }) {
  if (!watercourse) return null;

  const flows = watercourse.design_flows || [];
  const maximumFlow = Math.max(...flows.map((item) => item.discharge_m3s), 1);

  return (
    <article className="arcus-event-hydraulic-flows">
      <div className="arcus-event-hydraulic-card-heading">
        <span>{it ? "Riferimento modellato" : "Modelled reference"}</span>
        <h4>{watercourse.watercourse}</h4>
        <p>
          {it
            ? `Portate di progetto pubblicate per un bacino di ${formatNumber(watercourse.catchment_area_km2, language, 2)} km². Non sono le portate transitate nel collasso.`
            : `Published design flows for a ${formatNumber(watercourse.catchment_area_km2, language, 2)} km² catchment. These are not event discharges.`}
        </p>
      </div>

      <div
        aria-label={it ? "Portate di progetto per tempo di ritorno" : "Design flows by return period"}
        className="arcus-event-flow-chart"
        role="img"
      >
        {flows.map((item) => (
          <div key={item.return_period_years}>
            <span>Q{item.return_period_years}</span>
            <span className="arcus-event-flow-track">
              <span
                className="arcus-event-flow-bar"
                style={{ width: `${(item.discharge_m3s / maximumFlow) * 100}%` }}
              />
            </span>
            <strong>{formatNumber(item.discharge_m3s, language, 2)} <small>m³/s</small></strong>
          </div>
        ))}
      </div>

      <p className="arcus-event-hydraulic-warning">
        {it
          ? "Il tempo di ritorno dell’evento non viene assegnato: richiederebbe una ricostruzione idrologica dedicata."
          : "No return period is assigned to the event: that would require a dedicated hydrological reconstruction."}
      </p>
    </article>
  );
}

function HydrometryGapPanel({ hydrometry, it }) {
  const status = hydrometry.network_status;

  return (
    <article className="arcus-event-hydraulic-gap">
      <div className="arcus-event-hydraulic-card-heading">
        <span>{it ? "Qualità della misura" : "Measurement quality"}</span>
        <h4>{it ? "Perdita strumentale durante la piena" : "Instrument loss during the flood"}</h4>
        <p>
          {it
            ? "Il rapporto ufficiale documenta che l’onda di piena ha interrotto la rete prima che fosse registrato il colmo. ARCUS non completa la serie per interpolazione."
            : "The official report documents that the flood wave interrupted the network before the peak was recorded. ARCUS does not fill the series by interpolation."}
        </p>
      </div>
      {status && (
        <dl className="arcus-event-hydraulic-gap-facts">
          <div>
            <dt>{it ? "Ambito" : "Scope"}</dt>
            <dd>{status.network}</dd>
          </div>
          <div>
            <dt>{it ? "Esito" : "Outcome"}</dt>
            <dd>{it ? status.summary_it : status.summary_en}</dd>
          </div>
        </dl>
      )}
      <p className="arcus-event-hydraulic-warning">
        {it
          ? "L’assenza del colmo osservato non implica assenza di piena: descrive un limite della catena di misura."
          : "The missing observed peak does not imply absence of flooding: it describes a limitation of the measurement chain."}
      </p>
    </article>
  );
}

function HydrometryReviewPanel({ context, it }) {
  const evidence = context.process_evidence || {};

  return (
    <article className="arcus-event-hydraulic-gap">
      <div className="arcus-event-hydraulic-card-heading">
        <span>{it ? "Copertura idrometrica" : "Hydrometric coverage"}</span>
        <h4>{it ? "Verifica evento-specifica necessaria" : "Event-specific review required"}</h4>
        <p>
          {it
            ? "Il dossier collega il collasso alle fonti disponibili, ma non ha ancora identificato una misura idrometrica compatibile con questa sezione e questa data. Nessun valore viene stimato o trasferito da stazioni soltanto vicine."
            : "The dossier links the collapse to its available sources, but has not yet identified a hydrometric observation compatible with this section and date. No value is estimated or transferred from merely nearby stations."}
        </p>
      </div>
      <dl className="arcus-event-hydraulic-gap-facts">
        <div>
          <dt>{it ? "Processo nel database" : "Database process"}</dt>
          <dd>{evidence.failure_process ? processLabel(evidence.failure_process, it) : "—"}</dd>
        </div>
        <div>
          <dt>{it ? "Componente" : "Component"}</dt>
          <dd>{evidence.component_involved ? componentLabel(evidence.component_involved, it) : "—"}</dd>
        </div>
        <div>
          <dt>{it ? "Livello di evidenza" : "Evidence level"}</dt>
          <dd>{evidenceLabel(evidence.evidence_level || "unspecified", it)}</dd>
        </div>
      </dl>
      <p className="arcus-event-hydraulic-warning">
        {it
          ? "Stato incompleto dichiarato: le fonti dell’evento non equivalgono a una serie di livello o portata alla sezione del ponte."
          : "Declared incomplete status: event sources are not equivalent to a stage or discharge series at the bridge section."}
      </p>
    </article>
  );
}

function StationPanel({ station, referenceSection, language, it }) {
  if (!station) return null;

  const relationship = station.relationship === "upstream_basin_reference_station"
    ? (it ? "Stazione a monte nel bacino" : "Upstream basin station")
    : station.relationship === "same_watercourse_local_station"
      ? (it ? "Stazione locale sul corso d’acqua" : "Local same-river station")
      : station.relationship === "installed_on_event_bridge"
        ? (it ? "Sensore installato sul ponte" : "Sensor installed on the bridge")
      : (it ? "Sezione ufficiale vicina" : "Nearby official section");

  return (
    <article className="arcus-event-hydraulic-station">
      <div className="arcus-event-hydraulic-card-heading">
        <span>{relationship}</span>
        <h4>{station.name}</h4>
        <p>{station.location}</p>
      </div>

      <dl>
        {station.distance_from_event_km != null ? (
          <div>
            <dt>{it ? "Distanza dal punto" : "Distance from event"}</dt>
            <dd>{formatNumber(station.distance_from_event_km, language)} km</dd>
          </div>
        ) : (
          <div>
            <dt>{it ? "Distanza dal punto" : "Distance from event"}</dt>
            <dd>{it ? "Non calcolabile" : "Not computable"}</dd>
          </div>
        )}
        {station.observations_start_date && (
          <div>
            <dt>{it ? "Inizio osservazioni" : "Observations since"}</dt>
            <dd>{formatDate(station.observations_start_date, language)}</dd>
          </div>
        )}
        {station.reference_section?.catchment_area_km2 != null && (
          <div>
            <dt>{it ? "Bacino alla sezione" : "Section catchment"}</dt>
            <dd>{formatNumber(station.reference_section.catchment_area_km2, language)} km²</dd>
          </div>
        )}
        <div>
          <dt>
            {station.station_code
              ? (it ? "Codice stazione" : "Station code")
              : (it ? "Riferimento stazione" : "Station reference")}
          </dt>
          <dd>{station.station_code || station.station_reference}</dd>
        </div>
      </dl>

      {referenceSection?.design_levels?.length > 0 && (
        <div className="arcus-event-reference-levels">
          <span>{it ? "Livelli modellati alla sezione di riferimento" : "Modelled levels at the reference section"}</span>
          <div>
            {referenceSection.design_levels
              .filter((item) => item.return_period_years >= 50)
              .map((item) => (
                <span key={item.return_period_years}>
                  <small>Tr {item.return_period_years}</small>
                  <strong>{formatNumber(item.stage_m, language, 2)} m</strong>
                </span>
              ))}
          </div>
        </div>
      )}
    </article>
  );
}

function EventHydraulicContext({ context }) {
  const { language } = useLanguage();
  const it = language === "it";
  const station = context.reference_station;
  const watercourse = context.modelled_event_watercourse;
  const referenceSection = context.modelled_reference_section;
  const observed = context.event_hydrometry.observation_status === "observed";
  const networkFailure =
    context.event_hydrometry.reason_code === "monitoring_network_failed_during_flood";
  const reviewRequired =
    context.event_hydrometry.observation_status === "not_verified";
  const bridgeStation =
    context.event_hydrometry.interpretation ===
    "station_installed_on_event_bridge_incomplete_peak";
  const sourceBadge =
    (context.status === "source_review_required"
      ? (it ? "Da verificare" : "Source review")
      : context.display_badge) ||
    context.sources[0]?.provider ||
    "Hydraulic context";

  return (
    <section className="arcus-event-hydraulic">
      <header>
        <div>
          <span>{it ? "Dossier idraulico dell’evento" : "Event hydraulic dossier"}</span>
          <h3>{it ? "Dalla pioggia alla risposta del bacino" : "From rainfall to catchment response"}</h3>
        </div>
        <strong>{sourceBadge}</strong>
      </header>

      <div className={`arcus-event-hydraulic-availability${observed ? " is-observed" : ""}`}>
        <div>
          <span>{it ? "Idrometria dell’evento" : "Event hydrometry"}</span>
          <strong>
            {observed
              ? bridgeStation
                ? (it ? "Piena osservata alla sezione del ponte" : "Flood observed at the bridge section")
                : (it ? "Piena osservata nel bacino" : "Flood observed in the basin")
              : networkFailure
                ? (it ? "Colmo non registrato: rete interrotta" : "Peak not recorded: network interrupted")
              : reviewRequired
                ? (it ? "Idrometria non ancora verificata" : "Hydrometry not yet verified")
                : (it ? `Nessuna misura osservata nel ${context.event_date.slice(0, 4)}` : `No observed measurement in ${context.event_date.slice(0, 4)}`)}
          </strong>
        </div>
        <p>
          {observed
            ? bridgeStation
              ? (it
                  ? "Il sensore era installato sul manufatto e ha registrato la crescita della piena fino alla perdita della stazione."
                  : "The sensor was installed on the asset and recorded the rising flood until the station was lost.")
              : (it
                ? station.distance_from_event_km != null
                  ? "Il rapporto ufficiale documenta la risposta del bacino tramite una stazione temporalmente attiva. ARCUS mantiene esplicita la distanza dalla sezione del ponte."
                  : "Il rapporto ufficiale documenta una misura sullo stesso corso d’acqua. La posizione del ponte è approssimata, quindi ARCUS non calcola una distanza artificiale."
                : station.distance_from_event_km != null
                  ? "The official report documents the basin response through a station active at the event date. ARCUS explicitly retains its distance from the bridge section."
                  : "The official report documents a measurement on the same river. The bridge position is approximate, so ARCUS does not compute an artificial distance.")
            : networkFailure
              ? (it
                  ? "La rete era attiva, ma l’evento ha sormontato o danneggiato i sensori del bacino. ARCUS mostra il motivo del dato mancante senza ricostruire il colmo."
                  : "The network was active, but the event overtopped or damaged basin sensors. ARCUS shows why the data are missing without reconstructing the peak.")
              : reviewRequired
                ? (it
                    ? "Le fonti disponibili documentano il collasso, ma il collegamento con una stazione o una sezione idraulica deve ancora essere verificato."
                    : "Available sources document the collapse, but linkage to a gauge or hydraulic section still requires verification.")
              : (it
                  ? `La sezione ufficiale vicina ha iniziato le osservazioni il ${formatDate(station?.observations_start_date, language)}. ARCUS non ricostruisce livelli, portate o idrogrammi mancanti.`
                  : `The nearby official section began observations on ${formatDate(station?.observations_start_date, language)}. ARCUS does not reconstruct missing stages, discharges or hydrographs.`)}
        </p>
      </div>

      <div className="arcus-event-hydraulic-grid">
        {observed ? (
          <ObservationPanel context={context} language={language} it={it} />
        ) : watercourse ? (
          <ModelledFlowPanel watercourse={watercourse} language={language} it={it} />
        ) : networkFailure ? (
          <HydrometryGapPanel hydrometry={context.event_hydrometry} it={it} />
        ) : (
          <HydrometryReviewPanel context={context} it={it} />
        )}
        <StationPanel
          station={station}
          referenceSection={referenceSection}
          language={language}
          it={it}
        />
      </div>

      {watercourse?.mapping_status === "review_required_due_to_source_reach_code_inconsistency" && (
        <p className="arcus-event-hydraulic-curation-note">
          <strong>{it ? "Nota di curatela" : "Curation note"}</strong>
          {it
            ? " Lo studio usa codici di tratto non coerenti tra testo e tabella. I valori sono riportati come pubblicati, ma non alimentano calcoli ARCUS finché la corrispondenza cartografica non viene verificata."
            : " The study uses inconsistent reach codes between narrative and table. Values are shown as published, but do not feed ARCUS calculations until the map correspondence is verified."}
        </p>
      )}

      {context.curation_note && (
        <p className="arcus-event-hydraulic-curation-note">
          <strong>{it ? "Limite interpretativo" : "Interpretive limit"}</strong>
          {it ? ` ${context.curation_note.it}` : ` ${context.curation_note.en}`}
        </p>
      )}

      {context.documented_basin_processes.length > 0 && (
        <div className="arcus-event-hydraulic-processes">
          <span>{it ? "Processi documentati" : "Documented processes"}</span>
          <div>
            {context.documented_basin_processes.map((process) => (
              <strong key={process}>{processLabel(process, it)}</strong>
            ))}
          </div>
        </div>
      )}

      <footer>
        <span>{it ? "Fonti del dossier" : "Dossier sources"}</span>
        {context.sources.map((source) =>
          source.url ? (
            <a href={source.url} key={source.source_id} target="_blank" rel="noreferrer">
              {source.provider}
            </a>
          ) : (
            <span key={source.source_id}>{source.provider}</span>
          )
        )}
        <span aria-hidden="true">·</span>
        <span>
          {it
            ? "Misure, modelli e interpretazioni mantenuti separati"
            : "Measurements, models and interpretations kept separate"}
        </span>
      </footer>
    </section>
  );
}

export default EventHydraulicContext;
