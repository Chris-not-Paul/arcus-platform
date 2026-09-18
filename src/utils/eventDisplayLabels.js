export function publicRecordDescription(value) {
  // Canonical public references in prose; the source text stays in the release.
  return String(value || "").replace(/\bB(\d{2}\.\d{2}\.\d{2})\b/g, "IT$1");
}

const italianDescriptionLabels = {
  cause: {
    "Design and Construction": "progettuale o costruttiva",
    Earthquake: "sismica",
    "Fire and Explosion": "incendio o esplosione",
    Hydraulic: "idraulica",
    Impact: "impatto",
    Landslide: "frana o instabilità di versante",
    Material: "degrado o difetto dei materiali",
    Overload: "sovraccarico",
  },
  component: {
    Abutment: "la spalla",
    "Approach embankment": "il rilevato di accesso",
    "Cable / hanger / pylon": "un cavo, un pendino o un pilone",
    "Connection / joint": "una connessione o un giunto",
    "Deck / superstructure": "l’impalcato o la sovrastruttura",
    "Entire structure": "l’intera struttura",
    "Multiple components": "più componenti",
    "Pier / foundation": "una pila o la fondazione",
    "Temporary works": "le opere provvisionali",
  },
  evidence: {
    Documented: "L’attribuzione causale è documentata.",
    "Needs review": "L’attribuzione causale deve essere sottoposta a revisione.",
    Probable: "L’attribuzione causale è considerata probabile.",
    Unspecified: "L’attribuzione causale non è specificata nel record.",
    documented: "L’attribuzione causale è documentata.",
    probable: "L’attribuzione causale è considerata probabile.",
    unspecified: "L’attribuzione causale non è specificata nel record.",
  },
  process: {
    "Bank erosion / embankment failure": "erosione spondale o cedimento del rilevato",
    Bending: "flessione",
    "Debris accumulation / obstruction": "accumulo di detriti o ostruzione",
    "Debris flow / solid transport": "colata detritica o trasporto solido",
    "Falsework / temporary works collapse": "collasso di centine o opere provvisionali",
    Fatigue: "fatica",
    Fracture: "frattura",
    "Knocked down by external action": "abbattimento per azione esterna",
    "Other documented mode": "un altro meccanismo documentato",
    "Other documented hydraulic process": "un altro processo idraulico documentato",
    "Overtopping / hydrodynamic action": "sormonto o azione idrodinamica",
    Overstress: "sovrasollecitazione",
    Scour: "scalzamento",
  },
  trigger: {
    "Demolition operation": "un’operazione di demolizione",
    Earthquake: "un sisma",
    "Exceptional overload": "un sovraccarico eccezionale",
    "Excavation / construction works": "scavi o lavori di costruzione",
    "Fire / explosion": "un incendio o un’esplosione",
    Flood: "una piena",
    flood: "una piena",
    "Landslide / slope failure": "una frana o un’instabilità di versante",
    "Lifting / construction operation": "un’operazione di sollevamento o costruzione",
    "Movable bridge operation": "la manovra di un ponte mobile",
    "No identifiable external trigger": "nessun evento esterno identificabile",
    "Rainfall-induced landslide": "una frana indotta dalle precipitazioni",
    "Static load test": "una prova di carico statica",
    "Vehicle impact": "un impatto veicolare",
  },
};

function italianEventDate(value) {
  if (!value) {
    return null;
  }

  const date = new Date(`${value}T00:00:00.000Z`);

  if (Number.isNaN(date.valueOf())) {
    return value;
  }

  return new Intl.DateTimeFormat("it-IT", {
    day: "numeric",
    month: "long",
    timeZone: "UTC",
    year: "numeric",
  }).format(date);
}

function italianCount(value, singular, plural) {
  return `${value} ${value === 1 ? singular : plural}`;
}

export function localizedEventDescription(event, language) {
  const original = publicRecordDescription(event?.description || "");

  if (language !== "it") {
    return original;
  }

  if (event?.description_it) {
    return publicRecordDescription(event.description_it);
  }

  const sentences = [];
  const date = italianEventDate(event?.date);
  const place = event?.municipality
    ? `nel territorio di ${event.municipality}${event.province ? ` (provincia di ${event.province})` : ""}`
    : event?.province
      ? `in provincia di ${event.province}`
      : "in una località non specificata nel record";
  const severity = event?.collapse_severity === "TC"
    ? "crollo totale"
    : event?.collapse_severity === "PC"
      ? "crollo parziale"
      : "cedimento";
  const bridgeName = localizedBridgeDisplayName(event, "it");
  const opening = `${date ? `In data ${date}` : "In data non specificata"}, ${place}, si è verificato un ${severity}`;

  sentences.push(
    `${opening}${bridgeName ? ` che ha interessato l’opera «${bridgeName}»` : " di un ponte"}.`
  );

  const cause = italianDescriptionLabels.cause[event?.specific_cause];
  if (cause) {
    sentences.push(`La causa è classificata come ${cause}.`);
  }

  const triggerValue = event?.failure_trigger || event?.hydraulic_intelligence?.trigger;
  const trigger = italianDescriptionLabels.trigger[triggerValue];
  if (trigger) {
    sentences.push(`Il record identifica come evento innescante ${trigger}.`);
  }

  const processValue = event?.failure_process || event?.hydraulic_intelligence?.failure_process;
  const process = italianDescriptionLabels.process[processValue];
  if (process) {
    sentences.push(`Il processo osservato è ${process}.`);
  }

  const componentValue = event?.component_involved || event?.hydraulic_intelligence?.component_involved;
  const component = italianDescriptionLabels.component[componentValue];
  if (component) {
    sentences.push(`La componente coinvolta è ${component}.`);
  }

  const victims = Number(event?.victims || 0);
  const injuries = Number(event?.injuries || 0);
  if (victims === 0 && injuries === 0) {
    sentences.push("Nel record non risultano vittime o feriti.");
  } else {
    sentences.push(
      `Il record riporta ${italianCount(victims, "vittima", "vittime")} e ${italianCount(injuries, "ferito", "feriti")}.`
    );
  }

  const evidenceValue = event?.failure_cause_evidence || event?.hydraulic_intelligence?.evidence_level;
  const evidence = italianDescriptionLabels.evidence[evidenceValue];
  if (evidence) {
    sentences.push(evidence);
  }

  return sentences.join(" ");
}

export function localizedCrossingName(value, language) {
  if (!value || language !== "it") {
    return value;
  }

  const replacements = [
    [/^Municipality of (.+)$/i, "Comune di $1"],
    [/^(.+)'s panoramic road$/i, "Strada panoramica di $1"],
    [/^(.+) railway node$/i, "Nodo ferroviario di $1"],
    [/^(.+?) river(\s*\(.+\))?$/i, "Fiume $1$2"],
    [/^(.+?) stream(\s*\(.+\))?$/i, "Torrente $1$2"],
    [/^(.+?) canal(\s*\(.+\))?$/i, "Canale $1$2"],
  ];

  for (const [pattern, replacement] of replacements) {
    if (pattern.test(value)) {
      return value.replace(pattern, replacement);
    }
  }

  return value;
}

export function localizedBridgeDisplayName(event, language) {
  if (event?.bridge_name) {
    if (language === "it") {
      const translatedNames = {
        "Barberino bridge": "Ponte di Barberino",
        "A4 Milano–Torino bridge over Dora Baltea": "Ponte dell’A4 Milano–Torino sulla Dora Baltea",
      };
      return translatedNames[event.bridge_name] || event.bridge_name;
    }
    return event.bridge_name;
  }

  if (!event?.bridge_crossing_name) {
    return null;
  }

  const crossingName = localizedCrossingName(
    event.bridge_crossing_name,
    language
  );

  if (
    language === "it" &&
    /^(Fiume|Torrente|Rio|Canale)\b/i.test(crossingName)
  ) {
    return `Ponte sul ${crossingName}`;
  }

  if (
    language !== "it" &&
    /(river|stream|canal)\b$/i.test(event.bridge_crossing_name)
  ) {
    return `Bridge over ${event.bridge_crossing_name}`;
  }

  return crossingName;
}

const filterValueTranslations = {
  component: {
    Abutment: "Spalla",
    "Approach embankment": "Rilevato di accesso",
    "Cable / hanger / pylon": "Cavo / pendino / pilone",
    "Connection / joint": "Connessione / giunto",
    "Deck / superstructure": "Impalcato / sovrastruttura",
    "Entire structure": "Intera struttura",
    "Multiple components": "Componenti multipli",
    "Pier / foundation": "Pila / fondazione",
    "Temporary works": "Opere provvisionali",
  },
  evidence: {
    Documented: "Documentata",
    "Needs review": "Da revisionare",
    Probable: "Probabile",
    Unspecified: "Non specificata",
  },
  process: {
    "Bank erosion / embankment failure": "Erosione spondale / cedimento del rilevato",
    Bending: "Flessione",
    "Debris accumulation / obstruction": "Accumulo di detriti / ostruzione",
    "Debris flow / solid transport": "Colata detritica / trasporto solido",
    "Falsework / temporary works collapse": "Collasso di centine / opere provvisionali",
    Fatigue: "Fatica",
    Fracture: "Frattura",
    "Knocked down by external action": "Abbattimento per azione esterna",
    "Other documented mode": "Altro meccanismo documentato",
    "Other documented hydraulic process": "Altro processo idraulico documentato",
    "Overtopping / hydrodynamic action": "Sormonto / azione idrodinamica",
    Overstress: "Sovrasollecitazione",
    Scour: "Scalzamento (scour)",
    Unspecified: "Non specificato",
  },
};

export function localizedEventFilterValue(group, value, language) {
  if (!value || language !== "it") {
    return value;
  }

  if (value === "Unspecified") {
    return group === "evidence" ? "Non specificata" : "Non specificato";
  }

  return filterValueTranslations[group]?.[value] || value;
}
