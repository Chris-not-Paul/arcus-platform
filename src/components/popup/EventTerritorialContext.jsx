import useLanguage from "../../context/useLanguage";

function dateLabel(value, language) {
  if (!value) {
    return null;
  }

  const date = new Date(value);

  if (Number.isNaN(date.valueOf())) {
    return value;
  }

  return new Intl.DateTimeFormat(language === "it" ? "it-IT" : "en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
}

function statusCopy(result, language) {
  const it = language === "it";

  if (result?.status === "available") {
    return {
      label: it ? "Dato ufficiale disponibile" : "Official data available",
      tone: "available",
    };
  }

  if (result?.status === "no_intersection") {
    return {
      label: it ? "Interrogazione completata" : "Query completed",
      tone: "no-intersection",
    };
  }

  if (result?.status === "outside_coverage") {
    return {
      label: it ? "Fuori copertura del modello" : "Outside model coverage",
      tone: "outside",
    };
  }

  return {
    label: it ? "Non determinato nello snapshot" : "Not determined in snapshot",
    tone: "unresolved",
  };
}

function hydraulicValue(result, language) {
  if (result?.status === "available") {
    const highestClass = result.highest_class;

    if (highestClass) {
      return language === "it"
        ? `Classe ${highestClass}`
        : `Class ${highestClass}`;
    }

    return language === "it" ? "Intersezione registrata" : "Intersection recorded";
  }

  if (result?.status === "no_intersection") {
    return language === "it"
      ? "Nessuna intersezione registrata"
      : "No intersection recorded";
  }

  return language === "it" ? "Non determinato" : "Not determined";
}

function landslideValue(result, language) {
  if (result?.status === "available") {
    return language === "it" ? "Intersezione registrata" : "Intersection recorded";
  }

  if (result?.status === "no_intersection") {
    return language === "it"
      ? "Nessuna intersezione registrata"
      : "No intersection recorded";
  }

  return language === "it" ? "Non determinato" : "Not determined";
}

function seismicValue(result, language) {
  if (result?.status === "available" && Number.isFinite(Number(result.pga_p50_g))) {
    return `${Number(result.pga_p50_g).toFixed(3)} g`;
  }

  if (result?.status === "outside_coverage") {
    return language === "it" ? "Fuori copertura" : "Outside coverage";
  }

  return language === "it" ? "Non determinato" : "Not determined";
}

function detailCopy(key, result, language) {
  const it = language === "it";

  if (key === "hydraulic") {
    if (result.status === "available") {
      const matchedClasses = Array.isArray(result.matched_classes)
        ? result.matched_classes.filter(Boolean)
        : [];
      const classes = matchedClasses.length > 0
        ? matchedClasses.join(", ")
        : (it ? "non specificate" : "not specified");
      const highestClass = result.highest_class || (it ? "non specificata" : "not specified");

      return it
        ? `Classi ufficiali rilevate al punto: ${classes}. Classe più elevata rilevata: ${highestClass}.`
        : `Official classes recorded at the point: ${classes}. Highest recorded class: ${highestClass}.`;
    }

    if (result.status === "no_intersection") {
      return it
        ? "L’assenza di intersezione non certifica assenza di pericolo idraulico."
        : "No intersection does not certify absence of hydraulic hazard.";
    }

    return it
      ? "La fonte non ha restituito un esito utilizzabile: ARCUS non introduce un valore sostitutivo."
      : "The source returned no usable outcome: ARCUS does not introduce a substitute value.";
  }

  if (key === "landslide") {
    if (result.status === "available") {
      return it
        ? "Il punto ricade nel mosaico PAI consultato. La classe non viene pubblicata nella scheda Atlas."
        : "The point intersects the consulted PAI mosaic. The class is not published in the Atlas dossier.";
    }

    if (result.status === "no_intersection") {
      return it
        ? "L’assenza di intersezione non certifica stabilità del versante."
        : "No intersection does not certify slope stability.";
    }

    return it
      ? "La fonte non ha restituito un esito utilizzabile: ARCUS non introduce un valore sostitutivo."
      : "The source returned no usable outcome: ARCUS does not introduce a substitute value.";
  }

  return result.status === "available"
    ? (it
        ? "PGA mediana MPS04, 10% di probabilità di superamento in 50 anni."
        : "MPS04 median PGA, 10% probability of exceedance in 50 years.")
    : (it
        ? "Il valore non viene sostituito con uno zero o con una stima ARCUS."
        : "The value is not replaced by zero or an ARCUS estimate.");
}

function EventTerritorialContext({ cause, context }) {
  const { language } = useLanguage();
  const it = language === "it";
  const cards = [
    {
      key: "hydraulic",
      label: it ? "Pericolosità idraulica" : "Hydraulic hazard",
      provider: "ISPRA · mosaico nazionale",
      result: context.hydraulic,
      value: hydraulicValue(context.hydraulic, language),
    },
    {
      key: "landslide",
      label: it ? "Pericolosità da frana" : "Landslide hazard",
      provider: "ISPRA · PAI v.5.0",
      result: context.landslide,
      value: landslideValue(context.landslide, language),
    },
    {
      key: "seismic",
      label: it ? "Pericolosità sismica" : "Seismic hazard",
      provider: "INGV · MPS04",
      result: context.seismic,
      value: seismicValue(context.seismic, language),
    },
  ].filter((card) => ({ Hydraulic: "hydraulic", Landslide: "landslide", Earthquake: "seismic" }[cause] === card.key));
  const causeLabel = {
    Hydraulic: it ? "Idraulica" : "Hydraulic",
    Landslide: it ? "Frana" : "Landslide",
    Earthquake: it ? "Sisma" : "Earthquake",
  }[cause] || cause;
  const currentStatus = statusCopy(cards[0]?.result, language).label;

  return (
    <section className="arcus-event-territorial">
      <header>
        <div>
          <span>{it ? "Contesto territoriale attuale" : "Current territorial context"}</span>
          <h3>{it ? "Livello informativo pertinente alla causa documentata" : "Layer relevant to the documented cause"}</h3>
        </div>
        <strong>
          {it ? "Catalogo" : "Catalogue"} {dateLabel(context.snapshot_latest_query_at, language)}
        </strong>
      </header>

      <p className="arcus-event-territorial-intro">
        {it
          ? "La scheda mostra soltanto il contesto ufficiale pertinente alla causa documentata. Il dato è corrente: non ricostruisce la pericolosità alla data dell’evento e non prova il nesso causale."
          : "The dossier shows only the official context relevant to the documented cause. The value is current: it does not reconstruct hazard at the event date or prove causation."}
      </p>

      <div className="arcus-event-causal-separation" role="note">
        <div>
          <span>{it ? "Causa documentata" : "Documented cause"}</span>
          <strong>{causeLabel}</strong>
        </div>
        <div>
          <span>{it ? "Livello corrente pertinente" : "Relevant current layer"}</span>
          <strong>{currentStatus}</strong>
        </div>
        <div>
          <span>{it ? "Nesso causale automatico" : "Automatic causal link"}</span>
          <strong>{it ? "Non inferito" : "Not inferred"}</strong>
        </div>
      </div>

      <div className="arcus-event-territorial-grid">
        {cards.map((card) => {
          const status = statusCopy(card.result, language);
          const queriedAt = dateLabel(card.result?.queried_at, language);

          return (
            <article className={`is-${status.tone}`} key={card.key}>
              <div className="arcus-event-territorial-card-heading">
                <span>{card.label}</span>
                <small>{card.provider}</small>
              </div>
              <strong>{card.value}</strong>
              <p>{detailCopy(card.key, card.result, language)}</p>
              <footer>
                <span>{status.label}</span>
                {queriedAt ? <time dateTime={card.result.queried_at}>{queriedAt}</time> : null}
              </footer>
            </article>
          );
        })}
      </div>

      <div className="arcus-event-territorial-disclaimer">
        <strong>{it ? "Separazione delle evidenze" : "Evidence separation"}</strong>
        <p>
          {it
            ? "Contesto territoriale corrente, non evidenza storica dell’evento. Le classi mostrate descrivono l’intersezione cartografica attuale al punto; non ricostruiscono la classe alla data del collasso e non producono un punteggio o una valutazione di sicurezza."
            : "Current territorial context, not historical event evidence. The displayed classes describe the current map intersection at the point; they do not reconstruct the class at the collapse date or produce a score or safety assessment."}
        </p>
      </div>

      <footer className="arcus-event-territorial-sources">
        {Object.entries(context.sources || {}).filter(([key]) => (
          ({ Hydraulic: "hydraulic", Landslide: "landslide", Earthquake: "seismic" }[cause] === key)
        )).map(([key, source]) => (
          <a href={source.source_url} key={key} rel="noreferrer" target="_blank">
            {source.provider} · {{
              hydraulic: it ? "Mosaico nazionale della pericolosità idraulica" : "National hydraulic hazard mosaic",
              landslide: it ? "Pericolosità da frana PAI v.5.0" : "PAI landslide hazard v.5.0",
              seismic: it ? "Modello di pericolosità MPS04" : "MPS04 hazard model",
            }[key] || source.source_name}
          </a>
        ))}
        <small>
          {it
            ? "Dati ufficiali soggetti ai termini e agli obblighi di attribuzione dei rispettivi fornitori."
            : "Official data remain subject to each provider’s terms and attribution requirements."}
        </small>
      </footer>
    </section>
  );
}

export default EventTerritorialContext;
