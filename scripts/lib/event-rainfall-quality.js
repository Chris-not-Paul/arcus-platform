const EVENT_OVERRIDES = {
  "IT04.10.01": {
    status: "event_chronology_review_required",
    severity: "review",
    rationale_it:
      "La cella CERRA riporta 0 mm nel giorno registrato e 1,2 mm nei sette giorni precedenti, mentre la scheda associa il cedimento a un evento idraulico. La cronologia delle diverse fasi del collasso e la rappresentatività della cella devono essere verificate prima di interpretare il dato.",
    rationale_en:
      "The CERRA cell reports 0 mm on the recorded day and 1.2 mm over seven days, while the event record associates the failure with hydraulic action. The chronology of the collapse stages and grid-cell representativeness require review before interpretation.",
    supporting_sources: [
      "https://www.senato.it/show-doc?id=121429&leg=14&tipodoc=Sindisp",
    ],
  },
  "IT10.06.01": {
    status: "reanalysis_not_representative",
    severity: "warning",
    rationale_it:
      "La piena è documentata dalle fonti dell’evento, ma la cella CERRA riporta 0 mm nel giorno registrato e 0,7 mm in sette giorni. Il valore puntuale non è considerato rappresentativo della forzante idrologica del bacino.",
    rationale_en:
      "Event sources document a flood, while the CERRA cell reports 0 mm on the recorded day and 0.7 mm over seven days. The point value is not considered representative of the catchment’s hydrological forcing.",
    supporting_sources: [
      "https://www.regione.piemonte.it/web/pinforma/comunicati-stampa/monchiero-riparte-dal-ponte",
      "https://notizie.provincia.cuneo.it/?p=7252",
    ],
  },
  "IT11.11.03": {
    status: "reanalysis_not_representative",
    severity: "warning",
    rationale_it:
      "Le fonti documentano il nubifragio e la piena del 22 novembre 2011, ma la cella CERRA riporta 0 mm nel giorno registrato e 0,4 mm in sette giorni. La ricostruzione puntuale non rappresenta l’evento locale.",
    rationale_en:
      "Sources document the 22 November 2011 rainstorm and flood, while the CERRA cell reports 0 mm on the recorded day and 0.4 mm over seven days. The point reconstruction does not represent the local event.",
    supporting_sources: [
      "https://iris.cnr.it/handle/20.500.14243/280277",
      "https://old.comune.barcellona-pozzo-di-gotto.me.it/wp-content/uploads/schede/ambiente/PCPC-2015/Relazione_Piano%20Comunale%20di%20Protezione%20Civile.pdf",
    ],
  },
  "IT23.05.03": {
    status: "lagged_catchment_response_supported",
    severity: "context",
    rationale_it:
      "Lo zero del 18 maggio è compatibile con una risposta ritardata del bacino: la cella ERA5 registra 115,7 mm nei tre giorni inclusa la data dell’evento, concentrati nei giorni precedenti, e le fonti regionali documentano portate ancora elevate dopo la fase pluviometrica principale.",
    rationale_en:
      "The 18 May zero is compatible with a delayed catchment response: the ERA5 cell records 115.7 mm over three days including the event date, concentrated on preceding days, and regional sources document continued high flows after the main rainfall phase.",
    supporting_sources: [
      "https://www.arpae.it/it/notizie/levento-meteo-idrogeologico-del-16-18-maggio-2023",
    ],
  },
  "IT23.05.04": {
    status: "lagged_catchment_response_supported",
    severity: "context",
    rationale_it:
      "Lo zero del 18 maggio è compatibile con una risposta ritardata del bacino: la cella ERA5 registra 97 mm nei tre giorni inclusa la data dell’evento, concentrati nei giorni precedenti, e le fonti regionali documentano portate ancora elevate dopo la fase pluviometrica principale.",
    rationale_en:
      "The 18 May zero is compatible with a delayed catchment response: the ERA5 cell records 97 mm over three days including the event date, concentrated on preceding days, and regional sources document continued high flows after the main rainfall phase.",
    supporting_sources: [
      "https://www.arpae.it/it/notizie/levento-meteo-idrogeologico-del-16-18-maggio-2023",
    ],
  },
};

export function assessEventRainfallQuality({ aggregates, eventId, source }) {
  const override = EVENT_OVERRIDES[eventId];

  if (override) {
    return {
      ...override,
      assessment_method: "event_specific_source_and_chronology_review",
      assessment_input: {
        event_calendar_day_mm: aggregates?.event_calendar_day_mm ?? null,
        event_and_previous_2_days_mm:
          aggregates?.event_and_previous_2_days_mm ?? null,
        event_and_previous_6_days_mm:
          aggregates?.event_and_previous_6_days_mm ?? null,
      },
    };
  }

  if (Number(source?.resolution_km) >= 20) {
    return {
      status: "coarse_reanalysis_context_only",
      severity: "caution",
      assessment_method: "dataset_resolution_rule",
      rationale_it:
        "La rianalisi descrive la cella di modello al punto del ponte. La risoluzione non consente di rappresentare affidabilmente massimi convettivi locali o precipitazione areale a monte.",
      rationale_en:
        "The reanalysis describes the model cell at the bridge point. Its resolution cannot reliably represent local convective maxima or upstream areal precipitation.",
    };
  }

  return {
    status: "reanalysis_context_only",
    severity: "context",
    assessment_method: "dataset_role_rule",
    rationale_it:
      "Dato descrittivo di rianalisi alla cella del ponte; non è una misura pluviometrica né una ricostruzione della precipitazione media sul bacino.",
    rationale_en:
      "Descriptive reanalysis value at the bridge grid cell; it is neither a rain-gauge observation nor a reconstruction of catchment-average precipitation.",
  };
}
