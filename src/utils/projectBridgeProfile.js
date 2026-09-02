export const PROJECT_BRIDGE_PROFILE_VERSION =
  "arcus-project-bridge-profile-v1";

export const PROJECT_BRIDGE_PROFILE_MATCH_FIELDS = Object.freeze([
  "bridge_crossing_type",
  "material_type",
  "structural_type",
  "destination_use",
]);

export const PROJECT_BRIDGE_PROFILE_DESCRIPTIVE_FIELDS = Object.freeze([
  "bridge_length_m",
  "piers_in_active_riverbed",
]);

export const PROJECT_BRIDGE_PROFILE_OPTIONS = Object.freeze({
  bridge_crossing_type: Object.freeze([
    "waterway",
    "road",
    "railway",
    "urban area",
    "valley",
  ]),
  destination_use: Object.freeze([
    "National",
    "Motorway",
    "Provincial/Regional",
    "Municipal",
    "Railway",
    "Cycle-pedestrian",
  ]),
  material_type: Object.freeze([
    "Reinforced concrete",
    "Prestressed concrete",
    "Steel",
    "Masonry",
    "Timber",
  ]),
  structural_type: Object.freeze([
    "Beam bridge",
    "Arch bridge",
    "Truss",
    "Frame",
    "Viaduct",
    "Overpass",
    "Masonry",
    "Cable-stayed",
    "Suspension",
  ]),
});

function normalizedKey(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function canonicalOption(field, value) {
  const key = normalizedKey(value);

  if (!key) {
    return null;
  }

  return PROJECT_BRIDGE_PROFILE_OPTIONS[field]?.find(
    (option) => normalizedKey(option) === key
  ) || null;
}

function positiveLength(value) {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  const number = Number(value);

  return Number.isFinite(number) && number > 0 && number <= 10000
    ? Number(number.toFixed(2))
    : null;
}

function optionalBoolean(value) {
  if (value === true || value === false) {
    return value;
  }

  const key = normalizedKey(value);

  if (["true", "yes", "1"].includes(key)) {
    return true;
  }

  if (["false", "no", "0"].includes(key)) {
    return false;
  }

  return null;
}

function rawProfile(input = {}) {
  return input?.provided_fields && typeof input.provided_fields === "object"
    ? input.provided_fields
    : input;
}

export function normalizeProjectBridgeProfile(input = {}) {
  const raw = rawProfile(input);
  const providedFields = {};
  const invalidFields = [];

  PROJECT_BRIDGE_PROFILE_MATCH_FIELDS.forEach((field) => {
    const supplied = raw?.[field];

    if (supplied === null || supplied === undefined || supplied === "") {
      return;
    }

    const canonical = canonicalOption(field, supplied);

    if (canonical) {
      providedFields[field] = canonical;
    } else {
      invalidFields.push({ field, reason: "value_outside_v1_vocabulary" });
    }
  });

  const rawLength = raw?.bridge_length_m;
  const bridgeLength = positiveLength(rawLength);

  if (rawLength !== null && rawLength !== undefined && rawLength !== "") {
    if (bridgeLength === null) {
      invalidFields.push({
        field: "bridge_length_m",
        reason: "value_must_be_positive_and_at_most_10000_m",
      });
    } else {
      providedFields.bridge_length_m = bridgeLength;
    }
  }

  const rawPiers = raw?.piers_in_active_riverbed;
  const piers = optionalBoolean(rawPiers);

  if (rawPiers !== null && rawPiers !== undefined && rawPiers !== "") {
    if (piers === null) {
      invalidFields.push({
        field: "piers_in_active_riverbed",
        reason: "value_must_be_boolean",
      });
    } else {
      providedFields.piers_in_active_riverbed = piers;
    }
  }

  const matchFieldsProvided = PROJECT_BRIDGE_PROFILE_MATCH_FIELDS.filter(
    (field) => Object.hasOwn(providedFields, field)
  );
  const descriptiveFieldsProvided =
    PROJECT_BRIDGE_PROFILE_DESCRIPTIVE_FIELDS.filter(
      (field) => Object.hasOwn(providedFields, field)
    );

  return {
    descriptive_field_count: descriptiveFieldsProvided.length,
    descriptive_fields_provided: descriptiveFieldsProvided,
    invalid_fields: invalidFields,
    match_field_count: matchFieldsProvided.length,
    match_fields_provided: matchFieldsProvided,
    matching_mode: matchFieldsProvided.length
      ? "hydraulic_signature_then_unweighted_project_profile_tie_breaker"
      : "hydraulic_signature_only",
    profile_version: PROJECT_BRIDGE_PROFILE_VERSION,
    provided_field_count:
      matchFieldsProvided.length + descriptiveFieldsProvided.length,
    provided_fields: providedFields,
    selection_boundary: {
      descriptive_fields_used_for_selection: [],
      inventory_denominators_used: false,
      matching_fields_used: matchFieldsProvided,
      modifies_evidence_thresholds: false,
      modifies_failure_learning_qualification: false,
      outcome_fields_used: [],
    },
  };
}

export function normalizeHistoricalBridgeProfile(event = {}) {
  return normalizeProjectBridgeProfile({
    bridge_crossing_type: event.bridge_crossing_type,
    destination_use: event.destination_use,
    material_type: event.material_type,
    structural_type: event.structural_type,
  }).provided_fields;
}

export function compareProjectBridgeProfile(profileInput, event = {}) {
  const profile = normalizeProjectBridgeProfile(profileInput);
  const candidate = normalizeHistoricalBridgeProfile(event);
  const fields = {};
  let comparedFieldCount = 0;
  let exactMatchCount = 0;

  profile.match_fields_provided.forEach((field) => {
    const targetValue = profile.provided_fields[field];
    const candidateValue = candidate[field] || null;
    const comparable = candidateValue !== null;
    const exact = comparable &&
      normalizedKey(targetValue) === normalizedKey(candidateValue);

    if (comparable) {
      comparedFieldCount += 1;
    }

    if (exact) {
      exactMatchCount += 1;
    }

    fields[field] = {
      candidate_value: candidateValue,
      comparable,
      exact,
      target_value: targetValue,
    };
  });

  return {
    compared_field_count: comparedFieldCount,
    exact_match_count: exactMatchCount,
    exact_match_ratio: comparedFieldCount
      ? Number((exactMatchCount / comparedFieldCount).toFixed(4))
      : null,
    fields,
    role: "unweighted_tie_breaker_after_hydraulic_signature",
  };
}
