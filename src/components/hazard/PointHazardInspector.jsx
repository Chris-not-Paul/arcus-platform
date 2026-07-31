import "../../styles/hazard-point-inspector.css";

const HAZARDS = ["hydraulic", "landslide", "seismic"];

function finiteNumber(value) {
  const number = Number(value);

  return Number.isFinite(number) ? number : null;
}

function nearbyContextText(result, language) {
  const nearby = result?.nearby_context;

  if (nearby?.status !== "available" || !nearby.classes?.length) {
    return "";
  }

  const classes = nearby.classes.join(", ");
  const isWideArea = Number(nearby.search_radius_km) >= 25;

  if (language === "it") {
    return `Contesto ufficiale ${isWideArea ? "di area vasta" : "vicino"}: ${classes} entro ${nearby.search_radius_km} km; non attribuito al punto.`;
  }

  return `${isWideArea ? "Wide-area" : "Nearby"} official context: ${classes} within ${nearby.search_radius_km} km; not assigned to the point.`;
}

function sourceStatus(result, language) {
  if (
    result?.presentation_status === "nearby_official_context" &&
    result?.nearby_context?.status === "available"
  ) {
    return language === "it"
      ? "interrogazione completata; contesto territoriale disponibile"
      : "query completed; territorial context available";
  }

  const status = result?.status || "not_returned";
  const labels = language === "it"
    ? {
        available: "dato ufficiale disponibile",
        no_intersection: "dato ufficiale disponibile: nessuna intersezione",
        partial: "risposta ufficiale parziale",
        outside_coverage: "fuori copertura del modello",
        loading: "interrogazione in corso",
        not_returned: "risposta non ricevuta",
        provider_exception: "errore del provider",
        request_timeout: "timeout del provider",
        service_unreachable: "provider temporaneamente non raggiungibile",
        source_unavailable: "sorgente temporaneamente non disponibile",
      }
    : {
        available: "official data available",
        no_intersection: "official data available: no intersection",
        partial: "partial official response",
        outside_coverage: "outside model coverage",
        loading: "query in progress",
        not_returned: "response not returned",
        provider_exception: "provider error",
        request_timeout: "provider timeout",
        service_unreachable: "provider temporarily unreachable",
        source_unavailable: "source temporarily unavailable",
      };

  return labels[status] || status.replaceAll("_", " ");
}

function hydraulicValue(result, language) {
  const classes = Array.isArray(result?.matched_classes)
    ? result.matched_classes
    : [];
  const nearby = result?.nearby_context;

  if (classes.length) {
    return result?.highest_class
      ? `${classes.join(", ")} · max ${result.highest_class}`
      : classes.join(", ");
  }

  if (nearby?.status === "available" && nearby.classes?.length) {
    return language === "it"
      ? "Nessuna classe idraulica ISPRA al punto"
      : "No ISPRA hydraulic class at selected point";
  }

  if (result?.status === "no_intersection") {
    return language === "it"
      ? "Nessuna classe P1/P2/P3"
      : "No P1/P2/P3 class";
  }

  if (result?.status === "loading") {
    return language === "it" ? "Interrogazione ISPRA…" : "Querying ISPRA…";
  }

  return language === "it"
    ? "Esito ufficiale non determinabile ora"
    : "Official outcome cannot be determined now";
}

function landslideValue(result, language) {
  const hazardClasses = Array.isArray(result?.matched_hazard_classes)
    ? result.matched_hazard_classes
    : [];
  const attentionClasses = Array.isArray(result?.matched_attention_classes)
    ? result.matched_attention_classes
    : [];
  const classes = [...hazardClasses, ...attentionClasses];
  const nearby = result?.nearby_context;

  if (classes.length) {
    return result?.highest_hazard_class
      ? `${classes.join(", ")} · max ${result.highest_hazard_class}`
      : classes.join(", ");
  }

  if (nearby?.status === "available" && nearby.classes?.length) {
    return language === "it"
      ? "Nessuna classe PAI ISPRA al punto"
      : "No ISPRA PAI class at selected point";
  }

  if (result?.status === "no_intersection") {
    return language === "it"
      ? "Nessuna classe PAI/AA"
      : "No PAI/AA class";
  }

  if (result?.status === "loading") {
    return language === "it" ? "Interrogazione ISPRA…" : "Querying ISPRA…";
  }

  return language === "it"
    ? "Esito ufficiale non determinabile ora"
    : "Official outcome cannot be determined now";
}

function seismicValue(result, language) {
  const pga = finiteNumber(result?.pga_p50_g);

  if (pga !== null) {
    return `${pga.toFixed(4)} g`;
  }

  if (result?.status === "loading") {
    return language === "it" ? "Interrogazione MPS04…" : "Querying MPS04…";
  }

  if (result?.status === "outside_coverage") {
    return language === "it"
      ? "Fuori copertura MPS04"
      : "Outside MPS04 coverage";
  }

  return language === "it"
    ? "PGA ufficiale non determinabile ora"
    : "Official PGA cannot be determined now";
}

function hazardRows(exposure, language) {
  return [
    {
      detail:
        language === "it"
          ? "Classi di pericolosità idraulica ISPRA P1/P2/P3"
          : "ISPRA hydraulic hazard classes P1/P2/P3",
      key: "hydraulic",
      label: language === "it" ? "Idraulica" : "Hydraulic",
      nearbyContext: nearbyContextText(exposure?.hydraulic, language),
      result: exposure?.hydraulic,
      value: hydraulicValue(exposure?.hydraulic, language),
    },
    {
      detail:
        language === "it"
          ? "Mosaicatura ISPRA PAI v.5.0 e aree di attenzione"
          : "ISPRA PAI v.5.0 mosaic and attention areas",
      key: "landslide",
      label: language === "it" ? "Frane" : "Landslide",
      nearbyContext: nearbyContextText(exposure?.landslide, language),
      result: exposure?.landslide,
      value: landslideValue(exposure?.landslide, language),
    },
    {
      detail:
        language === "it"
          ? "PGA mediana MPS04, 10% di superamento in 50 anni"
          : "MPS04 median PGA, 10% exceedance in 50 years",
      key: "seismic",
      label: language === "it" ? "Sismica" : "Seismic",
      nearbyContext: "",
      result: exposure?.seismic,
      value: seismicValue(exposure?.seismic, language),
    },
  ];
}

export default function PointHazardInspector({
  className = "",
  exposure,
  language = "en",
  onClose,
  onRetry,
  point,
  status = "idle",
}) {
  if (!point) {
    return null;
  }

  const rows = hazardRows(exposure, language);
  const returnedCount = HAZARDS.filter(
    (hazard) => Boolean(exposure?.[hazard])
  ).length;
  const isLoading = status === "loading";

  return (
    <aside
      aria-live="polite"
      className={`point-hazard-inspector ${className}`.trim()}
    >
      <header>
        <div>
          <span>
            {language === "it"
              ? "Esposizione ufficiale al punto"
              : "Official point exposure"}
          </span>
          <strong>
            {Number(point.latitude).toFixed(5)},{" "}
            {Number(point.longitude).toFixed(5)}
          </strong>
        </div>
        {onClose ? (
          <button
            aria-label={language === "it" ? "Chiudi" : "Close"}
            onClick={onClose}
            type="button"
          >
            ×
          </button>
        ) : null}
      </header>

      <div className="point-hazard-response-count">
        <span>
          {isLoading
            ? language === "it"
              ? "Interrogazione dei tre provider in corso"
              : "Querying all three providers"
            : language === "it"
              ? `Risposte ricevute: ${returnedCount}/3`
              : `Responses received: ${returnedCount}/3`}
        </span>
        {!isLoading && returnedCount < 3 && onRetry ? (
          <button onClick={onRetry} type="button">
            {language === "it" ? "Riprova" : "Retry"}
          </button>
        ) : null}
      </div>

      <div className="point-hazard-grid">
        {rows.map((row) => (
          <article
            className={`point-hazard-card hazard-${row.key}`}
            key={row.key}
          >
            <span>{row.label}</span>
            <strong>{row.value}</strong>
            {row.nearbyContext ? (
              <p className="point-hazard-nearby-context">
                {row.nearbyContext}
              </p>
            ) : null}
            <p>{row.detail}</p>
            <em>{sourceStatus(row.result, language)}</em>
          </article>
        ))}
      </div>

      <p className="point-hazard-disclaimer">
        {language === "it"
          ? "L'assenza di una classe al punto è un esito del dato ufficiale, non una certificazione di assenza del rischio. Il contesto vicino resta separato e le indisponibilità della sorgente non vengono trasformate in rischio zero."
          : "The absence of a class at the point is an official-data outcome, not certification that risk is absent. Nearby context remains separate and source outages are never converted into zero risk."}
      </p>
    </aside>
  );
}
