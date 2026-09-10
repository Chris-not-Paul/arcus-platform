export function publicRecordDescription(value) {
  // Canonical public references in prose; the source text stays in the release.
  return String(value || "").replace(/\bB(\d{2}\.\d{2}\.\d{2})\b/g, "IT$1");
}

export function localizedCrossingName(value, language) {
  if (!value || language !== "it") {
    return value;
  }

  const replacements = [
    [/^Municipality of (.+)$/i, "Comune di $1"],
    [/^(.+)'s panoramic road$/i, "Strada panoramica di $1"],
    [/^(.+) railway node$/i, "Nodo ferroviario di $1"],
    [/^(.+) river$/i, "Fiume $1"],
    [/^(.+) stream$/i, "Torrente $1"],
    [/^(.+) canal$/i, "Canale $1"],
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
