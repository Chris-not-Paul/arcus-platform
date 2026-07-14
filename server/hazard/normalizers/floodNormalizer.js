export const FLOOD_PROVIDER_VERSION = "ispra-flood-wfs-v2";
export const FLOOD_CLASS_SEVERITY_ORDER = Object.freeze(["P1", "P2", "P3"]);

export const ISPRA_FLOOD_LAYERS = [
  {
    className: "P1",
    layerName: "nz1:aree_peric_idraulica_p1",
  },
  {
    className: "P2",
    layerName: "nz1:aree_peric_idraulica_p2",
  },
  {
    className: "P3",
    layerName: "nz1:aree_peric_idraulica_p3",
  },
];

export function normalizeFloodClass(value) {
  const normalized = String(value || "").trim().toUpperCase();

  return FLOOD_CLASS_SEVERITY_ORDER.includes(normalized)
    ? normalized
    : null;
}

export function highestFloodClass(classes) {
  return [...new Set(classes.map(normalizeFloodClass).filter(Boolean))]
    .sort(
      (left, right) =>
        FLOOD_CLASS_SEVERITY_ORDER.indexOf(left) -
        FLOOD_CLASS_SEVERITY_ORDER.indexOf(right)
    )
    .at(-1) || null;
}

export function floodExplanation({ highestClass, matchedClasses }) {
  if (!matchedClasses.length) {
    return [
      "The selected point does not intersect ISPRA hydraulic hazard classes P1, P2 or P3.",
      "This means official WFS data was available for the query, not that the wider area is risk-free.",
    ];
  }

  const classList = matchedClasses.join(", ");
  const missing = ["P1", "P2", "P3"].filter(
    (item) => !matchedClasses.includes(item)
  );

  return [
    `The selected point intersects ISPRA hydraulic hazard class${matchedClasses.length > 1 ? "es" : ""} ${classList}.`,
    highestClass
      ? `The highest observed hydraulic class is ${highestClass}.`
      : "No maximum class could be determined.",
    missing.length
      ? `No ${missing.join(", ")} intersection was found.`
      : "All configured hydraulic classes intersect the selected point.",
  ];
}
