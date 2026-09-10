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
    return result.highest_class || result.matched_classes?.join(", ") || "—";
  }

  if (result?.status === "no_intersection") {
    return language === "it"
      ? "Nessuna classe al punto"
      : "No class at point";
  }

  return language === "it" ? "Non determinato" : "Not determined";
}

function landslideValue(result, language) {
  if (result?.status === "available") {
    return result.highest_hazard_class || (result.attention_area ? "AA" : "—");
  }

  if (result?.status === "no_intersection") {
    return language === "it"
      ? "Nessuna classe al punto"
      : "No class at point";
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
      return `${it ? "Classi intersecate" : "Intersected classes"}: ${result.matched_classes?.join(", ") || "—"}`;
    }

    if (result.status === "no_intersection") {
      return it
        ? "L’assenza di intersezione non certifica assenza di pericolo idraulico."
        : "No intersection does not certify absence of hydraulic hazard.";
    }

    return it
      ? "La fonte non ha restituito un esito utilizzabile: ARCUS non assegna una classe sostitutiva."
      : "The source returned no usable outcome: ARCUS does not assign a substitute class.";
  }

  if (key === "landslide") {
    if (result.status === "available") {
      const classes = result.matched_hazard_classes?.join(", ") || "—";
      return `${it ? "Classi intersecate" : "Intersected classes"}: ${classes}${result.attention_area ? " · AA" : ""}`;
    }

    if (result.status === "no_intersection") {
      return it
        ? "L’assenza di intersezione non certifica stabilità del versante."
        : "No intersection does not certify slope stability.";
    }

    return it
      ? "La fonte non ha restituito un esito utilizzabile: ARCUS non assegna una classe sostitutiva."
      : "The source returned no usable outcome: ARCUS does not assign a substitute class.";
  }

  return result.status === "available"
    ? (it
        ? "PGA mediana MPS04, 10% di probabilità di superamento in 50 anni."
        : "MPS04 median PGA, 10% probability of exceedance in 50 years.")
    : (it
        ? "Il valore non viene sostituito con uno zero o con una stima ARCUS."
        : "The value is not replaced by zero or an ARCUS estimate.");
}

function periodLabel(period, language) {
  if (!period) return "—";
  if (language === "it" && period.label === "December 2017") return "Dicembre 2017";
  return period.label.replace("-", "–");
}

function classMembershipLabel(classes, language) {
  return classes?.length
    ? classes.join(" · ")
    : (language === "it" ? "nessuna classe" : "no class");
}

function evolutionCopy(summary, language) {
  const it = language === "it";

  if (!summary) return null;

  if (["changed", "unchanged"].includes(summary.status)) {
    return {
      detail: `${periodLabel(summary.baseline_reference_period, language)}: ${classMembershipLabel(summary.baseline_classes, language)} → ${periodLabel(summary.current_reference_period, language)}: ${classMembershipLabel(summary.current_classes, language)}`,
      label: summary.status === "changed"
        ? (it ? "Classi variate" : "Classes changed")
        : (it ? "Classi invariate" : "Classes unchanged"),
      tone: summary.status,
    };
  }

  const reason = {
    current_release_observation_unavailable: it
      ? "Interrogazione della release corrente non disponibile."
      : "Current-release query unavailable.",
    no_post_event_release: it
      ? "Nessuna release corrente successiva al collasso."
      : "No current release follows the collapse.",
    no_pre_event_release: it
      ? "Nessuna release disponibile precedente al collasso."
      : "No available release predates the collapse.",
  }[summary.reason];

  return {
    detail: reason || (it ? "Confronto temporale non disponibile." : "Temporal comparison unavailable."),
    label: it ? "Non confrontabile" : "Not comparable",
    tone: "not-comparable",
  };
}

function EventTerritorialContext({ context, history = null }) {
  const { language } = useLanguage();
  const it = language === "it";
  const cards = [
    {
      key: "hydraulic",
      label: it ? "Pericolosità idraulica" : "Hydraulic hazard",
      provider: "ISPRA · P1/P2/P3",
      result: context.hydraulic,
      value: hydraulicValue(context.hydraulic, language),
      evolution: history?.hazards?.hydraulic?.comparison_summary,
    },
    {
      key: "landslide",
      label: it ? "Pericolosità da frana" : "Landslide hazard",
      provider: "ISPRA · PAI v.5.0",
      result: context.landslide,
      value: landslideValue(context.landslide, language),
      evolution: history?.hazards?.landslide?.comparison_summary,
    },
    {
      key: "seismic",
      label: it ? "Pericolosità sismica" : "Seismic hazard",
      provider: "INGV · MPS04",
      result: context.seismic,
      value: seismicValue(context.seismic, language),
    },
  ];

  return (
    <section className="arcus-event-territorial">
      <header>
        <div>
          <span>{it ? "Contesto territoriale attuale" : "Current territorial context"}</span>
          <h3>{it ? "Layer ufficiali alla localizzazione documentata" : "Official layers at the documented location"}</h3>
        </div>
        <strong>
          {it ? "Catalogo" : "Catalogue"} {dateLabel(context.snapshot_latest_query_at, language)}
        </strong>
      </header>

      <p className="arcus-event-territorial-intro">
        {it
          ? "Questa lettura descrive i layer acquisiti alla data indicata nel punto del collasso. Non ricostruisce la pericolosità alla data dell’evento e non prova la causa storica."
          : "This reading describes layers retrieved on the stated date at the collapse point. It does not reconstruct hazard at the event date or prove the historical cause."}
      </p>

      <div className="arcus-event-territorial-grid">
        {cards.map((card) => {
          const status = statusCopy(card.result, language);
          const queriedAt = dateLabel(card.result?.queried_at, language);
          const evolution = evolutionCopy(card.evolution, language);

          return (
            <article className={`is-${status.tone}`} key={card.key}>
              <div className="arcus-event-territorial-card-heading">
                <span>{card.label}</span>
                <small>{card.provider}</small>
              </div>
              <strong>{card.value}</strong>
              <p>{detailCopy(card.key, card.result, language)}</p>
              {evolution && (
                <div className={`arcus-event-territorial-evolution is-${evolution.tone}`}>
                  <span>{it ? "Evoluzione cartografica" : "Map evolution"}</span>
                  <strong>{evolution.label}</strong>
                  <small>{evolution.detail}</small>
                </div>
              )}
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
            ? "Contesto territoriale corrente, non evidenza storica dell’evento. Nessun valore modifica il record del collasso, assegna una classe di sicurezza o produce un punteggio normalizzato."
            : "Current territorial context, not historical event evidence. No value changes the collapse record, assigns a safety class or produces a normalized score."}
        </p>
      </div>

      <footer className="arcus-event-territorial-sources">
        {Object.entries(context.sources || {}).map(([key, source]) => (
          <a href={source.source_url} key={key} rel="noreferrer" target="_blank">
            {source.provider} · {{
              hydraulic: it ? "Pericolosità idraulica P1/P2/P3" : "Hydraulic hazard P1/P2/P3",
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
