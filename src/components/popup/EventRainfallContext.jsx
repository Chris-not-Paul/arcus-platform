import { useMemo } from "react";
import useLanguage from "../../context/useLanguage";

function formatDay(value, language) {
  const date = new Date(`${value}T00:00:00.000Z`);

  return new Intl.DateTimeFormat(language === "it" ? "it-IT" : "en-GB", {
    day: "2-digit",
    month: "short",
    timeZone: "UTC",
  }).format(date);
}

function Metric({ label, language, value }) {
  return (
    <div>
      <span>{label}</span>
      <strong>
        {Number(value).toLocaleString(language === "it" ? "it-IT" : "en-GB", {
          maximumFractionDigits: 1,
        })}
      </strong>
      <small>mm</small>
    </div>
  );
}

function EventRainfallContext({ context }) {
  const { language } = useLanguage();
  const it = language === "it";

  const maximum = useMemo(
    () => Math.max(...(context?.daily || []).map((item) => item.precipitation_mm), 1),
    [context]
  );

  const eventDate = context.event_date;
  const aggregates = context.aggregates;
  const source = context.source;
  const coarseGrid = source.resolution_km >= 20;
  const quality = context.quality_assessment;
  const qualityNeedsAttention = [
    "reanalysis_not_representative",
    "event_chronology_review_required",
    "lagged_catchment_response_supported",
  ].includes(quality?.status);

  const qualityTitle = {
    reanalysis_not_representative: it
      ? "Ricostruzione non rappresentativa"
      : "Reconstruction not representative",
    event_chronology_review_required: it
      ? "Cronologia da verificare"
      : "Chronology requires review",
    lagged_catchment_response_supported: it
      ? "Risposta idraulica ritardata plausibile"
      : "Plausible delayed hydraulic response",
  }[quality?.status];

  return (
    <section className="arcus-event-rainfall">
      <header>
        <div>
          <span>{it ? "Contesto meteorologico ricostruito" : "Reconstructed meteorological context"}</span>
          <h3>{it ? "Precipitazione antecedente" : "Antecedent precipitation"}</h3>
        </div>
        <strong>{source.dataset} · ~{source.resolution_km} km</strong>
      </header>

      <p className="arcus-event-rainfall-intro">
        {it
          ? "Stima da rianalisi nella cella di modello più vicina. Le cumulate usano giorni di calendario locali: non sono misure al ponte e non dimostrano il nesso causale."
          : "Reanalysis estimate at the nearest model grid cell. Accumulations use local calendar days: they are not bridge rain-gauge measurements and do not prove causation."}
      </p>

      {qualityNeedsAttention && (
        <p className={`arcus-event-rainfall-quality is-${quality.severity}`}>
          <strong>{qualityTitle}</strong>
          {` ${it ? quality.rationale_it : quality.rationale_en}`}
          {quality.supporting_sources?.map((url, index) => (
            <a href={url} key={url} target="_blank" rel="noreferrer">
              {it ? `Fonte ${index + 1}` : `Source ${index + 1}`}
            </a>
          ))}
        </p>
      )}

      {coarseGrid && quality?.status !== "lagged_catchment_response_supported" && (
        <p className="arcus-event-rainfall-resolution-warning">
          <strong>{it ? "Contesto a bassa risoluzione" : "Coarse-resolution context"}</strong>
          {it
            ? " La cella ERA5 al punto del ponte può non intercettare i massimi convettivi o la pioggia caduta a monte nel bacino. Il valore non rappresenta la precipitazione areale che ha generato la piena."
            : " The ERA5 cell at the bridge point may miss convective maxima or upstream catchment rainfall. The value does not represent the areal precipitation that generated the flood."}
        </p>
      )}

      <div className="arcus-event-rainfall-metrics">
        <Metric
          label={it ? "Cella ponte · giorno civile" : "Bridge cell · calendar day"}
          language={language}
          value={aggregates.event_calendar_day_mm}
        />
        <Metric
          label={it ? "3 giorni, incluso evento" : "3 days, incl. event"}
          language={language}
          value={aggregates.event_and_previous_2_days_mm}
        />
        <Metric
          label={it ? "7 giorni, incluso evento" : "7 days, incl. event"}
          language={language}
          value={aggregates.event_and_previous_6_days_mm}
        />
        <Metric
          label={it ? "14 giorni, incluso evento" : "14 days, incl. event"}
          language={language}
          value={aggregates.full_period_mm}
        />
      </div>

      <div
        aria-label={it ? "Grafico delle precipitazioni giornaliere" : "Daily precipitation chart"}
        className="arcus-event-rainfall-chart"
        role="img"
        style={{
          gridTemplateColumns: `repeat(${context.daily.length}, minmax(0, 1fr))`,
        }}
      >
        {context.daily.map((item, index) => {
          const eventDay = item.date === eventDate;

          return (
            <div className={eventDay ? "is-event-day" : ""} key={item.date}>
              <span className="arcus-event-rainfall-value">
                {item.precipitation_mm > 0 ? item.precipitation_mm : ""}
              </span>
              <span className="arcus-event-rainfall-bar-track">
                <span
                  className="arcus-event-rainfall-bar"
                  style={{ height: `${Math.max(2, (item.precipitation_mm / maximum) * 100)}%` }}
                  title={`${formatDay(item.date, language)}: ${item.precipitation_mm} mm`}
                />
              </span>
              <small>
                {index === 0 || eventDay || index === context.daily.length - 1
                  ? formatDay(item.date, language)
                  : ""}
              </small>
            </div>
          );
        })}
      </div>

      <footer>
        <span>
          {it ? "Cella modello" : "Model cell"}: {context.grid_location.distance_from_event_km} km
        </span>
        <span aria-hidden="true">·</span>
        <a href={source.attribution_url} target="_blank" rel="noreferrer">
          {it ? "Dati meteo: Open-Meteo" : "Weather data: Open-Meteo"}
        </a>
        <span aria-hidden="true">·</span>
        <a href={source.upstream_url} target="_blank" rel="noreferrer">
          Copernicus / ECMWF
        </a>
      </footer>
    </section>
  );
}

export default EventRainfallContext;
