export const LANDSLIDE_PROVIDER_VERSION = "ispra-landslide-pai-wfs-v2";
export const LANDSLIDE_HAZARD_ORDER = Object.freeze(["P1", "P2", "P3", "P4"]);
export const LANDSLIDE_ATTENTION_CLASS = "AA";

export const LANDSLIDE_CLASS_BY_CODE = Object.freeze({
  0: "AA",
  1: "P1",
  2: "P2",
  3: "P3",
  4: "P4",
});

export function normalizeLandslideClass(value) {
  const raw = String(value ?? "").trim().toUpperCase();
  const fromCode = LANDSLIDE_CLASS_BY_CODE[raw];

  if (fromCode) {
    return fromCode;
  }

  if (raw === LANDSLIDE_ATTENTION_CLASS) {
    return LANDSLIDE_ATTENTION_CLASS;
  }

  if (LANDSLIDE_HAZARD_ORDER.includes(raw)) {
    return raw;
  }

  return null;
}

export function highestLandslideHazardClass(classes) {
  return [...new Set(classes.map(normalizeLandslideClass).filter(Boolean))]
    .filter((item) => LANDSLIDE_HAZARD_ORDER.includes(item))
    .sort(
      (left, right) =>
        LANDSLIDE_HAZARD_ORDER.indexOf(left) -
        LANDSLIDE_HAZARD_ORDER.indexOf(right)
    )
    .at(-1) || null;
}

export function landslideExplanation({
  attentionArea,
  highestHazardClass,
  matchedAttentionClasses,
  matchedHazardClasses,
  status,
}) {
  if (status && !["available", "no_intersection"].includes(status)) {
    return [
      "The ISPRA PAI landslide source could not be used for this query.",
      "ARCUS does not convert source unavailability into zero landslide hazard.",
    ];
  }

  if (!matchedHazardClasses.length && !attentionArea) {
    return [
      "No PAI landslide hazard polygon intersection was found at the selected point.",
      "This does not demonstrate absence of local slope instability or landslide susceptibility outside mapped PAI polygons.",
    ];
  }

  const explanation = [];

  if (matchedHazardClasses.length) {
    explanation.push(
      `The selected point intersects ISPRA PAI landslide class${matchedHazardClasses.length > 1 ? "es" : ""} ${matchedHazardClasses.join(", ")}.`
    );
    explanation.push(
      highestHazardClass
        ? `The highest observed PAI landslide class is ${highestHazardClass}.`
        : "No ordered PAI class could be determined."
    );
  }

  if (attentionArea) {
    explanation.push(
      `The selected point also intersects attention area class ${matchedAttentionClasses.join(", ")}.`
    );
    explanation.push(
      "Attention areas are reported separately and are not ordered inside the P1-P4 hazard scale."
    );
  }

  return explanation;
}
