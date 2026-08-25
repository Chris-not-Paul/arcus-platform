export const HYDRAULIC_TAXONOMY_VERSION = "hydraulic-v2";

const EMPTY_VALUES = new Set([
  "",
  "-",
  "n/a",
  "na",
  "not available",
  "unknown",
]);

export const HYDRAULIC_INTELLIGENCE_FIELDS = [
  "failure_trigger",
  "failure_process",
  "component_involved",
  "failure_cause_evidence",
  "hydraulic_trigger",
  "hydraulic_failure_process",
  "hydraulic_component_involved",
  "hydraulic_evidence_level",
];

export const HYDRAULIC_CANONICAL_FIELDS = [
  "hydraulic_intelligence",
  "hydraulic_outcome_curation",
];

export const HYDRAULIC_MATCHER_BLOCKED_FIELDS = [
  ...HYDRAULIC_INTELLIGENCE_FIELDS,
  ...HYDRAULIC_CANONICAL_FIELDS,
];

export const HYDRAULIC_TRIGGER_MAPPING = {
  Flood: "flood",
  "Rainfall-induced landslide": "rainfall_induced_landslide",
  "Hydraulic event - unspecified": "hydraulic_event_unspecified",
  "Hydraulic event – unspecified": "hydraulic_event_unspecified",
};

export const HYDRAULIC_FAILURE_PROCESS_MAPPING = {
  "Bank erosion / embankment failure": "bank_erosion_or_embankment_failure",
  "Debris accumulation": "debris_accumulation_or_obstruction",
  "Debris accumulation / obstruction": "debris_accumulation_or_obstruction",
  "Debris flow / solid transport": "debris_flow_or_solid_transport",
  "Other documented hydraulic process": "other_documented_hydraulic_process",
  "Overtopping / hydrodynamic action": "overtopping_or_hydrodynamic_action",
  Scour: "scour",
  Unspecified: null,
};

export const HYDRAULIC_COMPONENT_MAPPING = {
  "Pier / foundation": "pier_foundation",
  "Pier foundation": "pier_foundation",
  Abutment: "abutment",
  "Approach embankment": "approach_embankment",
  "Deck / superstructure": "deck_or_superstructure",
  "Entire structure": "entire_structure",
  "Multiple components": "multiple_components",
  Unspecified: null,
};

export const HYDRAULIC_EVIDENCE_LEVEL_MAPPING = {
  Documented: "documented",
  Probable: "probable",
  Unspecified: "unspecified",
  "Needs review": "needs_review",
};

const EVIDENCE_WEIGHTS_EXPERIMENTAL = {
  documented: 1,
  probable: 0.5,
  needs_review: 0,
  unspecified: 0,
};

const HYDRAULIC_NORMALIZED_VALUES = Object.freeze({
  component_involved: new Set(Object.values(HYDRAULIC_COMPONENT_MAPPING).filter(Boolean)),
  evidence_level: new Set(Object.values(HYDRAULIC_EVIDENCE_LEVEL_MAPPING)),
  failure_process: new Set(Object.values(HYDRAULIC_FAILURE_PROCESS_MAPPING).filter(Boolean)),
  trigger: new Set(Object.values(HYDRAULIC_TRIGGER_MAPPING)),
});

const OVERRIDE_STATUS = "accepted_probable_secondary";
const OVERRIDE_SCOPE = "professional_only";

function sameHydraulicIntelligence(left = {}, right = {}) {
  return [
    "component_involved",
    "evidence_level",
    "failure_process",
    "taxonomy_version",
    "trigger",
  ].every((field) => (left?.[field] ?? null) === (right?.[field] ?? null));
}

export function validateHydraulicOutcomeOverrides(registry = {}) {
  const errors = [];
  const overrides = Array.isArray(registry.overrides) ? registry.overrides : [];
  const seen = new Set();

  overrides.forEach((entry) => {
    const eventId = String(entry?.event_id || "").trim();

    if (!eventId) {
      errors.push({ code: "missing_event_id" });
      return;
    }
    if (seen.has(eventId)) {
      errors.push({ code: "duplicate_event_id", event_id: eventId });
    }
    seen.add(eventId);

    if (entry.scope !== OVERRIDE_SCOPE) {
      errors.push({ code: "invalid_scope", event_id: eventId, value: entry.scope || null });
    }
    if (entry.status !== OVERRIDE_STATUS) {
      errors.push({ code: "invalid_status", event_id: eventId, value: entry.status || null });
    }
    if (entry.hydraulic_intelligence?.evidence_level !== "probable") {
      errors.push({ code: "secondary_override_must_be_probable", event_id: eventId });
    }
    if (entry.hydraulic_intelligence?.taxonomy_version !== HYDRAULIC_TAXONOMY_VERSION) {
      errors.push({ code: "invalid_taxonomy_version", event_id: eventId });
    }

    Object.entries(HYDRAULIC_NORMALIZED_VALUES).forEach(([field, allowed]) => {
      if (!allowed.has(entry.hydraulic_intelligence?.[field])) {
        errors.push({ code: "invalid_normalized_value", event_id: eventId, field });
      }
    });

    if (!entry.previous_hydraulic_intelligence) {
      errors.push({ code: "missing_previous_intelligence", event_id: eventId });
    }
    if (!entry.provenance?.source_role || !entry.provenance?.verification_status) {
      errors.push({ code: "missing_provenance", event_id: eventId });
    }
    if (!entry.rationale) {
      errors.push({ code: "missing_rationale", event_id: eventId });
    }
  });

  return {
    errors,
    ok: errors.length === 0,
    override_count: overrides.length,
    schema_version: registry.schema_version || null,
  };
}

export function applyHydraulicOutcomeOverrides(events = [], registry = {}) {
  const validation = validateHydraulicOutcomeOverrides(registry);

  if (!validation.ok) {
    throw new Error(`Invalid hydraulic outcome overrides: ${JSON.stringify(validation.errors)}`);
  }

  const eventIds = new Set(events.map((event) => event.event_id));
  const missingEvents = registry.overrides
    .map((entry) => entry.event_id)
    .filter((eventId) => !eventIds.has(eventId));

  if (missingEvents.length) {
    throw new Error(`Hydraulic outcome overrides reference missing events: ${missingEvents.join(", ")}`);
  }

  const byEvent = new Map(registry.overrides.map((entry) => [entry.event_id, entry]));

  return events.map((event) => {
    const override = byEvent.get(event.event_id);

    if (!override) {
      return event;
    }
    if (!event.hydraulic_intelligence) {
      throw new Error(`Hydraulic outcome override targets non-hydraulic event: ${event.event_id}`);
    }
    if (!sameHydraulicIntelligence(
      event.hydraulic_intelligence,
      override.previous_hydraulic_intelligence
    )) {
      throw new Error(`Hydraulic source values changed before override: ${event.event_id}`);
    }

    return {
      ...event,
      hydraulic_intelligence: { ...override.hydraulic_intelligence },
      hydraulic_outcome_curation: {
        applied: true,
        previous_hydraulic_intelligence: { ...override.previous_hydraulic_intelligence },
        provenance: { ...override.provenance },
        rationale: override.rationale,
        registry_schema_version: registry.schema_version,
        status: override.status,
      },
    };
  });
}

function normalizeCause(value) {
  return String(value || "").trim().toLowerCase();
}

function cleanSourceValue(value) {
  if (value === undefined || value === null) {
    return null;
  }

  const trimmed = String(value).trim();

  if (EMPTY_VALUES.has(trimmed.toLowerCase())) {
    return null;
  }

  return trimmed;
}

function hasHydraulicSourceValues(event) {
  return HYDRAULIC_INTELLIGENCE_FIELDS.some(
    (field) => cleanSourceValue(event?.[field]) !== null
  );
}

function firstDefined(event, ...fields) {
  return fields
    .map((field) => event?.[field])
    .find((value) => cleanSourceValue(value) !== null) ?? null;
}

function mapValue({
  eventId,
  field,
  mapping,
  required = false,
  sourceValue,
  warnings,
}) {
  const cleaned = cleanSourceValue(sourceValue);

  if (cleaned === null) {
    if (required) {
      warnings.push({
        code: `${field}_missing`,
        event_id: eventId || null,
        field,
        source_value: sourceValue ?? null,
      });
    }

    return null;
  }

  if (!Object.hasOwn(mapping, cleaned)) {
    warnings.push({
      code: `${field}_unrecognized`,
      event_id: eventId || null,
      field,
      source_value: cleaned,
    });

    return null;
  }

  return mapping[cleaned];
}

export function normalizeHydraulicIntelligence(event = {}, options = {}) {
  const warnings = [];
  const eventId = event.event_id || null;
  const primaryCause =
    event.primary_cause ||
    event.specific_cause ||
    event.cause_category;
  const isHydraulic = normalizeCause(primaryCause) === "hydraulic";

  if (!isHydraulic) {
    if (hasHydraulicSourceValues(event)) {
      warnings.push({
        code: "non_hydraulic_with_hydraulic_fields",
        event_id: eventId,
      });
    }

    return {
      hydraulic_intelligence: null,
      warnings,
    };
  }

  const trigger = mapValue({
    eventId,
    field: "hydraulic_trigger",
    mapping: HYDRAULIC_TRIGGER_MAPPING,
    required: true,
    sourceValue: firstDefined(event, "failure_trigger", "hydraulic_trigger"),
    warnings,
  });
  const failureProcess = mapValue({
    eventId,
    field: "hydraulic_failure_process",
    mapping: HYDRAULIC_FAILURE_PROCESS_MAPPING,
    sourceValue: firstDefined(event, "failure_process", "hydraulic_failure_process"),
    warnings,
  });
  const componentInvolved = mapValue({
    eventId,
    field: "hydraulic_component_involved",
    mapping: HYDRAULIC_COMPONENT_MAPPING,
    sourceValue: firstDefined(event, "component_involved", "hydraulic_component_involved"),
    warnings,
  });
  let evidenceLevel = mapValue({
    eventId,
    field: "hydraulic_evidence_level",
    mapping: HYDRAULIC_EVIDENCE_LEVEL_MAPPING,
    required: true,
    sourceValue: firstDefined(event, "failure_cause_evidence", "hydraulic_evidence_level"),
    warnings,
  });
  const rawEvidence = cleanSourceValue(
    firstDefined(event, "failure_cause_evidence", "hydraulic_evidence_level")
  );

  if (rawEvidence === "Needs review") {
    warnings.push({
      code: "hydraulic_evidence_level_needs_review",
      event_id: eventId,
      field: "hydraulic_evidence_level",
      normalized_as: "needs_review",
      source_value: rawEvidence,
    });
  }

  if (!failureProcess) {
    if (evidenceLevel !== "needs_review") {
      evidenceLevel = "unspecified";
    }

    if (componentInvolved) {
      warnings.push({
        code: "component_specific_but_process_unspecified",
        event_id: eventId,
      });
    }
  } else if (["unspecified", "needs_review"].includes(evidenceLevel)) {
    warnings.push({
      code: "specific_process_with_unspecified_evidence",
      event_id: eventId,
      failure_process: failureProcess,
    });
  }

  if (!evidenceLevel) {
    evidenceLevel = "unspecified";
  }

  const hydraulic_intelligence = {
    trigger,
    failure_process: failureProcess,
    component_involved: componentInvolved,
    evidence_level: evidenceLevel,
    taxonomy_version: options.taxonomyVersion || HYDRAULIC_TAXONOMY_VERSION,
  };

  return {
    hydraulic_intelligence,
    warnings,
  };
}

export function stripHydraulicSourceFields(event = {}) {
  const next = { ...event };

  HYDRAULIC_INTELLIGENCE_FIELDS.forEach((field) => {
    delete next[field];
  });

  return next;
}

export function hydraulicEvidenceWeight(evidenceLevel) {
  return EVIDENCE_WEIGHTS_EXPERIMENTAL[evidenceLevel] ?? 0;
}

export function summarizeHydraulicCohort(events = []) {
  const hydraulicEvents = events.filter((event) => event.hydraulic_intelligence);
  const failureProcesses = new Map();
  const components = new Map();
  let documented = 0;
  let probable = 0;
  let needsReview = 0;
  let unspecified = 0;
  let effectiveEvidenceCount = 0;

  hydraulicEvents.forEach((event) => {
    const intelligence = event.hydraulic_intelligence;
    const evidence = intelligence.evidence_level || "unspecified";

    if (evidence === "documented") {
      documented += 1;
    } else if (evidence === "probable") {
      probable += 1;
    } else if (evidence === "needs_review") {
      needsReview += 1;
    } else {
      unspecified += 1;
    }

    effectiveEvidenceCount += hydraulicEvidenceWeight(evidence);

    if (intelligence.failure_process) {
      const current = failureProcesses.get(intelligence.failure_process) || {
        documented_count: 0,
        effective_evidence_count: 0,
        probable_count: 0,
        process: intelligence.failure_process,
        raw_count: 0,
      };

      current.raw_count += 1;
      current.effective_evidence_count += hydraulicEvidenceWeight(evidence);

      if (evidence === "documented") {
        current.documented_count += 1;
      }

      if (evidence === "probable") {
        current.probable_count += 1;
      }

      failureProcesses.set(intelligence.failure_process, current);
    }

    if (intelligence.component_involved) {
      components.set(
        intelligence.component_involved,
        (components.get(intelligence.component_involved) || 0) + 1
      );
    }
  });

  const specificMechanismCases = hydraulicEvents.length - unspecified - needsReview;

  return {
    total_cases: hydraulicEvents.length,
    mechanism_documented_cases: documented,
    mechanism_probable_cases: probable,
    mechanism_needs_review_cases: needsReview,
    mechanism_unspecified_cases: unspecified,
    mechanism_documentation_coverage: hydraulicEvents.length
      ? Number((specificMechanismCases / hydraulicEvents.length).toFixed(4))
      : 0,
    failure_processes: [...failureProcesses.values()]
      .map((item) => ({
        ...item,
        effective_evidence_count: Number(item.effective_evidence_count.toFixed(2)),
      }))
      .sort((left, right) => right.raw_count - left.raw_count),
    components_involved: [...components.entries()]
      .map(([component, count]) => ({ component, count }))
      .sort((left, right) => right.count - left.count),
    effective_evidence_count: Number(effectiveEvidenceCount.toFixed(2)),
    limitations: [
      unspecified > 0
        ? `${unspecified} hydraulic analogue case(s) have unspecified mechanism evidence.`
        : null,
      "Shares are within the documented analogue cohort, not site or collapse probabilities.",
      "Evidence weighting is experimental and not used for official hazard exposure.",
    ].filter(Boolean),
  };
}
