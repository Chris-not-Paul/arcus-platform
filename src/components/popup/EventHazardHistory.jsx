import useLanguage from "../../context/useLanguage";

function eventDateLabel(value, language) {
  const date = new Date(`${value}T00:00:00.000Z`);

  if (Number.isNaN(date.valueOf())) return value;

  return new Intl.DateTimeFormat(language === "it" ? "it-IT" : "en-GB", {
    day: "2-digit",
    month: "long",
    timeZone: "UTC",
    year: "numeric",
  }).format(date);
}

function relationLabel(relation, language) {
  const it = language === "it";

  return {
    before_event: it ? "Carta precedente al collasso" : "Map predating the collapse",
    after_event: it ? "Carta successiva al collasso" : "Map following the collapse",
    same_or_overlapping_reference_period: it
      ? "Periodo cartografico sovrapposto all’evento"
      : "Map period overlaps the event",
  }[relation];
}

function referencePeriodLabel(referencePeriod, language) {
  if (language === "it" && referencePeriod.label === "December 2017") {
    return "Dicembre 2017";
  }

  return referencePeriod.label.replace("-", "–");
}

function positionalLabel(observation, language) {
  const it = language === "it";
  const distance = observation.minimum_boundary_distance_m;

  if (observation.positional_assessment === "boundary_sensitive_intersection") {
    return it
      ? `Intersezione entro ${distance} m da un confine cartografico.`
      : `Intersection within ${distance} m of a mapped boundary.`;
  }

  if (observation.positional_assessment === "boundary_adjacent_no_intersection") {
    return it
      ? `Nessuna intersezione; confine cartografico a ${distance} m.`
      : `No intersection; mapped boundary at ${distance} m.`;
  }

  if (observation.positional_assessment?.includes("not_available")) {
    return it
      ? "Distanza dal confine non disponibile per questa interrogazione."
      : "Boundary distance is unavailable for this query.";
  }

  if (observation.point_status === "intersection") {
    return it
      ? "Intersezione interna rispetto alla soglia tecnica ARCUS."
      : "Interior intersection under the ARCUS technical threshold.";
  }

  return it
    ? "Nessuna intersezione e nessun confine rilevato entro la soglia tecnica ARCUS."
    : "No intersection and no boundary detected within the ARCUS technical threshold.";
}

function Observation({ language, observation, source }) {
  const it = language === "it";
  const hasClasses = observation.classes.length > 0;

  return (
    <article className={hasClasses ? "has-classes" : "has-no-intersection"}>
      <header>
        <div>
          <span>{source?.version || observation.release_id}</span>
          <strong>{referencePeriodLabel(observation.reference_period, language)}</strong>
        </div>
        <small>{relationLabel(observation.temporal_relation_to_event, language)}</small>
      </header>

      <div className="arcus-event-history-class">
        <span>{it ? "Classi alla coordinata" : "Classes at coordinate"}</span>
        <strong>
          {hasClasses
            ? observation.classes.join(" · ")
            : (it ? "Nessuna classe al punto" : "No class at point")}
        </strong>
        {hasClasses && (
          <small>
            {it ? "Classe più elevata" : "Highest class"}: {observation.highest_class}
          </small>
        )}
      </div>

      <details>
        <summary>{it ? "Dettaglio geometrico" : "Geometry detail"}</summary>
        <p>{positionalLabel(observation, language)}</p>
      </details>

      <footer>
        {source?.source_url ? (
          <a href={source.source_url} rel="noreferrer" target="_blank">
            {source.title || "ISPRA"}
          </a>
        ) : (
          <span>{source?.title || observation.release_id}</span>
        )}
      </footer>
    </article>
  );
}

function EventHazardHistory({ history }) {
  const { language } = useLanguage();
  const it = language === "it";
  const hazardEntries = Object.entries(history.hazards || {});

  return (
    <section className="arcus-event-hazard-history">
      <header>
        <div>
          <span>{it ? "Cronologia cartografica ufficiale" : "Official map chronology"}</span>
          <h3>{it ? "Classi ISPRA alla coordinata del ponte" : "ISPRA classes at the bridge coordinate"}</h3>
        </div>
        <strong>
          {it ? "Collasso" : "Collapse"} · {eventDateLabel(history.event_date, language)}
        </strong>
      </header>

      <p className="arcus-event-history-intro">
        {it
          ? "Ogni colonna riporta ciò che la relativa mosaicatura ufficiale assegna alla medesima coordinata del ponte. Non vengono interpolati valori mancanti."
          : "Each column reports what the corresponding official mosaic assigns to the same bridge coordinate. Missing values are not interpolated."}
      </p>

      {hazardEntries.map(([hazard, timeline]) => (
        <section className="arcus-event-history-hazard" key={hazard}>
          <header>
            <span>{hazard === "hydraulic" ? "ISPRA · P1/P2/P3" : "ISPRA · PAI"}</span>
            <h4>
              {hazard === "hydraulic"
                ? (it ? "Pericolosità idraulica" : "Hydraulic hazard")
                : (it ? "Pericolosità da frana" : "Landslide hazard")}
            </h4>
          </header>
          <div className="arcus-event-history-timeline">
            {timeline.observations.map((observation) => (
              <Observation
                key={observation.release_id}
                language={language}
                observation={observation}
                source={history.sources?.[observation.release_id]}
              />
            ))}
          </div>
        </section>
      ))}

      <footer className="arcus-event-history-note">
        {it
          ? "Informazione cartografica versionata alla coordinata documentata. La sequenza non attribuisce al collasso l’eventuale differenza fra le release."
          : "Versioned map information at the documented coordinate. The sequence does not attribute any release difference to the collapse."}
      </footer>
    </section>
  );
}

export default EventHazardHistory;
