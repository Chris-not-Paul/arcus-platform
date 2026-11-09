import useLanguage from "../../context/useLanguage";
import { rainfallChronology } from "../../utils/rainfallChronology";
import "./EventRainfallChart.css";

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

function RainfallChart({ daily, chronology, language }) {
  const it = language === "it";
  const locale = it ? "it-IT" : "en-GB";
  const format = (value) => value.toLocaleString(locale, { maximumFractionDigits: 1 });
  const peak = daily.reduce((largest, item) =>
    item.precipitation_mm > largest.precipitation_mm ? item : largest);
  const roughStep = Math.max(peak.precipitation_mm / 4, 1);
  const magnitude = 10 ** Math.floor(Math.log10(roughStep));
  const step = [1, 2, 2.5, 5, 10].find((value) => value * magnitude >= roughStep) * magnitude;
  const axisMax = step * 4;
  const inWindow = (date) => chronology.kind !== "reference" && date >= chronology.start && date <= chronology.end;
  const windowStart = daily.findIndex(({ date }) => inWindow(date));
  const windowDays = daily.filter(({ date }) => inWindow(date)).length;
  const showTick = (index, date) => index === 0 || index === daily.length - 1 ||
    date === chronology.start || date === chronology.end || index % Math.ceil(daily.length / 4) === 0;

  return (
    <figure className="arcus-rainfall-figure">
      <figcaption>
        <div>
          <span>{it ? "Serie giornaliera · rianalisi" : "Daily series · reanalysis"}</span>
          <strong>{formatDay(daily[0].date, language)} – {formatDay(daily.at(-1).date, language)}</strong>
        </div>
        <div className="arcus-rainfall-peak">
          <span>{it ? "Massimo giornaliero stimato" : "Estimated daily maximum"}</span>
          <strong>{format(peak.precipitation_mm)} <small>mm</small></strong>
          {peak.precipitation_mm > 0 && <small>{formatDay(peak.date, language)}</small>}
        </div>
      </figcaption>
      <div className="arcus-rainfall-plot" role="img"
        aria-label={it ? "Precipitazioni giornaliere stimate in millimetri. I valori sono disponibili nella tabella sotto il grafico." : "Estimated daily precipitation in millimetres. Values are available in the table below the chart."}>
        <div className="arcus-rainfall-scale" aria-hidden="true">
          {[4, 3, 2, 1, 0].map((tick) => <span key={tick} style={{ top: `${(4 - tick) * 25}%` }}>{format(step * tick)}</span>)}
        </div>
        <div className="arcus-rainfall-grid" aria-hidden="true">
          {windowDays > 0 && (
            <div className="arcus-rainfall-window"
              style={{ insetInlineStart: `${100 * windowStart / daily.length}%`, width: `${100 * windowDays / daily.length}%` }} />
          )}
          {[0, 25, 50, 75, 100].map((position) => <i key={position} style={{ top: `${position}%` }} />)}
          <div className="arcus-event-rainfall-chart"
            style={{ gridTemplateColumns: `repeat(${daily.length}, minmax(0, 1fr))` }}>
            {daily.map((item, index) => (
              <div className={inWindow(item.date) ? "is-event-day" : ""} data-date={item.date}
                key={item.date} title={`${formatDay(item.date, language)}: ${format(item.precipitation_mm)} mm`}>
                <span className="arcus-event-rainfall-bar"
                  style={{ height: `${100 * item.precipitation_mm / axisMax}%` }} />
                {showTick(index, item.date) && <small>{item.date.slice(-2)}</small>}
              </div>
            ))}
          </div>
        </div>
      </div>
      <div className="arcus-rainfall-legend">
        <span><i />{it ? "Precipitazione stimata (mm)" : "Estimated precipitation (mm)"}</span>
        {windowDays > 0 && <span><i className="is-window" />{chronology.kind === "interval"
          ? (it ? "Intervallo del cedimento" : "Failure interval")
          : (it ? "Data riportata" : "Recorded date")}</span>}
      </div>
      <details className="arcus-rainfall-values">
        <summary>{it ? "Valori giornalieri" : "Daily values"}</summary>
        <table>
          <thead><tr><th scope="col">{it ? "Data" : "Date"}</th><th scope="col">{it ? "Stima (mm)" : "Estimate (mm)"}</th></tr></thead>
          <tbody>
            {daily.map((item) => <tr key={item.date}><th scope="row"><time dateTime={item.date}>{formatDay(item.date, language)}</time></th><td>{format(item.precipitation_mm)}</td></tr>)}
          </tbody>
        </table>
      </details>
    </figure>
  );
}

function EventRainfallContext({ context, event }) {
  const { language } = useLanguage();
  const it = language === "it";

  const chronology = rainfallChronology(event);
  const interval = chronology.kind === "interval";
  const dated = chronology.kind === "day";
  const incompleteInterval = interval && context.daily.at(-1).date < chronology.end;
  const aggregates = context.aggregates;
  const source = context.source;
  const coarseGrid = source.resolution_km >= 20;
  const quality = context.quality_assessment;
  const qualityNeedsAttention = [
    "reanalysis_not_representative",
    "event_chronology_review_required",
    "lagged_catchment_response_supported",
    "regional_report_available",
  ].includes(quality?.status);
  const quantitativeContextAvailable =
    quality?.status !== "reanalysis_not_representative";
  const eventDayIsDry =
    aggregates.event_calendar_day_mm === 0 &&
    aggregates.event_and_previous_2_days_mm > 0;

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
    regional_report_available: it ? "Riscontro sul contesto regionale" : "Regional event documentation",
  }[quality?.status];

  return (
    <section className="arcus-event-rainfall">
      <header>
        <div>
          <span>{it ? "Contesto meteorologico ricostruito" : "Reconstructed meteorological context"}</span>
          <h3>{it ? "Precipitazioni intorno al cedimento" : "Precipitation around the failure"}</h3>
        </div>
        <strong>{source.dataset} · ~{source.resolution_km} km</strong>
      </header>

      <p className="arcus-event-rainfall-intro">
        {it
          ? "Stima da rianalisi nella cella di modello associata al sito. Le cumulate usano giorni di calendario locali: non sono misure al ponte e non dimostrano il nesso causale."
          : "Reanalysis estimate at the model grid cell associated with the site. Accumulations use local calendar days: they are not bridge rain-gauge measurements and do not prove causation."}
      </p>
      {event.exact_location !== true && (
        <p className="arcus-event-rainfall-intro">
          {it ? "Posizione approssimativa: la cella rappresenta l’intorno del sito." : "Approximate location: the grid cell represents the vicinity of the site."}
        </p>
      )}

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

      {coarseGrid && (
        <p className="arcus-event-rainfall-resolution-warning">
          <strong>{it ? "Contesto a bassa risoluzione" : "Coarse-resolution context"}</strong>
          {it
            ? " La cella ERA5 al punto del ponte può non intercettare i massimi convettivi o la pioggia caduta a monte nel bacino. Il valore non rappresenta la precipitazione areale che ha generato la piena."
            : " The ERA5 cell at the bridge point may miss convective maxima or upstream catchment rainfall. The value does not represent the areal precipitation that generated the flood."}
        </p>
      )}

      {quantitativeContextAvailable && (
        <>
          <p className="arcus-event-rainfall-chronology">
            {interval
              ? `${it ? "Intervallo documentato del cedimento" : "Documented failure interval"}: ${formatDay(chronology.start, language)} – ${formatDay(chronology.end, language)}`
              : dated
                ? `${it ? "Data riportata nella scheda" : "Date recorded in the dossier"}: ${formatDay(chronology.start, language)}`
                : `${it ? "Data di riferimento, non giorno accertato del cedimento" : "Reference date, not an established failure day"}: ${formatDay(chronology.start, language)}`}
            {incompleteInterval && (it ? " · serie parziale rispetto all’intervallo" : " · series does not cover the full interval")}
          </p>
          <RainfallChart daily={context.daily} chronology={chronology} language={language} />
          {dated && eventDayIsDry && (
            <p className="arcus-event-rainfall-zero-note">
              <strong>
                {it
                  ? "0 mm nella cella del ponte il giorno civile dell’evento."
                  : "0 mm in the bridge grid cell on the event calendar day."}
              </strong>
              {it
                ? ` Nei tre giorni considerati la rianalisi registra ${aggregates.event_and_previous_2_days_mm.toLocaleString("it-IT", { maximumFractionDigits: 1 })} mm: lo zero giornaliero non dimostra assenza di forzante idrologica nel bacino.`
                : ` Across the three-day window, reanalysis records ${aggregates.event_and_previous_2_days_mm.toLocaleString("en-GB", { maximumFractionDigits: 1 })} mm: the daily zero does not demonstrate absence of hydrological forcing in the catchment.`}
            </p>
          )}

          <div className={`arcus-event-rainfall-metrics${dated ? "" : " is-three"}`}>
            {dated && (
              <Metric
                label={it ? "Cella ponte · data registrata" : "Bridge cell · recorded date"}
                language={language}
                value={aggregates.event_calendar_day_mm}
              />
            )}
            <Metric
              label={it ? "3 giorni fino alla data di riferimento" : "3 days through the reference date"}
              language={language}
              value={aggregates.event_and_previous_2_days_mm}
            />
            <Metric
              label={it ? "7 giorni fino alla data di riferimento" : "7 days through the reference date"}
              language={language}
              value={aggregates.event_and_previous_6_days_mm}
            />
            <Metric
              label={it ? "Totale della serie mostrata" : "Total for the series shown"}
              language={language}
              value={aggregates.full_period_mm}
            />
          </div>

        </>
      )}

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
