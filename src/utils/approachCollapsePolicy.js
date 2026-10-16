// ARCUS operational extension, not a replacement for NYSDOT's structural definitions.
export const APPROACH_EXTENSION_STATUSES = Object.freeze([
  "Applicable",
  "Needs review",
  "Not applicable",
  "Not assessed",
]);

// Descriptive grouping only: it neither changes TC/PC nor validates damage.
// Keep missing and multi-component records out of the structural-only group.
export function collapseScope(event = {}) {
  event ??= {};
  const component = String(event.component_involved ?? event.hydraulic_intelligence?.component_involved ?? "")
    .trim().toLowerCase().replaceAll("_", " ");
  if (component === "approach embankment") return "approach_embankment";
  if (component === "multiple components") return "multiple_components";
  if (component === "temporary works") return "temporary_works";
  if (["abutment", "pier / foundation", "pier foundation", "deck / superstructure", "deck superstructure",
    "cable / hanger / pylon", "cable hanger pylon", "connection / joint", "connection joint", "entire structure"].includes(component)) {
    return "bridge_structure";
  }
  if (event.approach_extension_status === "Applicable") return "approach_embankment";
  return "unspecified";
}

export function collapseScopeLabel(scope, language = "en") {
  const labels = {
    approach_embankment: ["Rilevato d’accesso", "Approach embankment"],
    bridge_structure: ["Struttura del ponte", "Bridge structure"],
    multiple_components: ["Più componenti", "Multiple components"],
    temporary_works: ["Opere provvisionali", "Temporary works"],
    unspecified: ["Ambito non specificato", "Scope unspecified"],
  };
  return (labels[scope] || labels.unspecified)[language === "it" ? 0 : 1];
}

export function collapseScopeNote(event, language = "en") {
  if (collapseScope(event) !== "approach_embankment") return null;
  return language === "it"
    ? "Il caso è incluso nel totale ARCUS e riguarda il rilevato d’accesso. Non indica necessariamente il crollo della campata; TC/PC descrive l’esito operativo dell’accesso."
    : "This record is included in the ARCUS total and concerns the approach embankment. It does not necessarily indicate span collapse; TC/PC describes the operational outcome at the approach.";
}

export function evaluateApproachExtension(evidence = {}) {
  const { physicalCollapseDocumented, directlyConnectedToBridge,
    allLanesPhysicallyInterrupted, destructiveAdjacentAbutmentCollapse,
    partialAccessRemains, immediateLifeDanger } = evidence;

  if (physicalCollapseDocumented === false || directlyConnectedToBridge === false) {
    return { status: "Not applicable", severity: null };
  }
  if (physicalCollapseDocumented !== true || directlyConnectedToBridge !== true) {
    return { status: "Needs review", severity: null };
  }
  if (allLanesPhysicallyInterrupted === true || destructiveAdjacentAbutmentCollapse === true) {
    return { status: "Applicable", severity: "TC" };
  }
  if (partialAccessRemains === true && immediateLifeDanger === true) {
    return { status: "Applicable", severity: "PC" };
  }
  // Physical approach collapse is established, but severity is not inferred from closure alone.
  return { status: "Applicable", severity: null };
}

export function approachExtensionNote(status, language = "en") {
  if (status === "Applicable") {
    return language === "it"
      ? "Crollo fisico del rilevato d’accesso: caso incluso nell’estensione operativa ARCUS, distinta dalle definizioni strutturali NYSDOT. TC/PC richiede evidenza sull’estensione del danno e sulla transitabilità; questa indicazione non dimostra il crollo della campata."
      : "Physical collapse of a bridge approach embankment: included under the ARCUS operational extension, distinct from NYSDOT's structural definitions. TC/PC requires evidence of damage extent and passability; this label does not establish span collapse.";
  }
  if (status === "Needs review") {
    return language === "it"
      ? "Il record resta incluso nel dataset ARCUS. Il crollo fisico del rilevato e il suo collegamento diretto con il ponte restano da verificare; questa indicazione non attesta il crollo della campata."
      : "The record remains included in the ARCUS dataset. Physical embankment collapse and its direct connection to the bridge remain under review; this label does not establish span collapse.";
  }
  return null;
}
