export const HYDRAULIC_TAXONOMY_VERSION = "hydraulic-v1";

const EMPTY_VALUES = new Set([
  "",
  "-",
  "n/a",
  "na",
  "not available",
  "unknown",
]);

export const HYDRAULIC_INTELLIGENCE_FIELDS = [
  "hydraulic_trigger",
  "hydraulic_failure_process",
  "hydraulic_component_involved",
  "hydraulic_evidence_level",
];

export const HYDRAULIC_CANONICAL_FIELDS = [
  "hydraulic_intelligence",
];

export const HYDRAULIC_MATCHER_BLOCKED_FIELDS = [
  ...HYDRAULIC_INTELLIGENCE_FIELDS,
  ...HYDRAULIC_CANONICAL_FIELDS,
];

export const HYDRAULIC_TRIGGER_MAPPING = {
  Flood: "flood",
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
  "Pier foundation": "pier_foundation",
  Unspecified: null,
};

export const HYDRAULIC_EVIDENCE_LEVEL_MAPPING = {
  Documented: "documented",
  Probable: "probable",
  Unspecified: "unspecified",
  "Needs review": "unspecified",
};

const EVIDENCE_WEIGHTS_EXPERIMENTAL = {
  documented: 1,
  probable: 0.5,
  unspecified: 0,
};

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
    sourceValue: event.hydraulic_trigger,
    warnings,
  });
  const failureProcess = mapValue({
    eventId,
    field: "hydraulic_failure_process",
    mapping: HYDRAULIC_FAILURE_PROCESS_MAPPING,
    sourceValue: event.hydraulic_failure_process,
    warnings,
  });
  const componentInvolved = mapValue({
    eventId,
    field: "hydraulic_component_involved",
    mapping: HYDRAULIC_COMPONENT_MAPPING,
    sourceValue: event.hydraulic_component_involved,
    warnings,
  });
  let evidenceLevel = mapValue({
    eventId,
    field: "hydraulic_evidence_level",
    mapping: HYDRAULIC_EVIDENCE_LEVEL_MAPPING,
    required: true,
    sourceValue: event.hydraulic_evidence_level,
    warnings,
  });
  const rawEvidence = cleanSourceValue(event.hydraulic_evidence_level);

  if (rawEvidence === "Needs review") {
    warnings.push({
      code: "hydraulic_evidence_level_needs_review",
      event_id: eventId,
      field: "hydraulic_evidence_level",
      normalized_as: "unspecified",
      source_value: rawEvidence,
    });
  }

  if (!failureProcess) {
    evidenceLevel = "unspecified";

    if (componentInvolved) {
      warnings.push({
        code: "component_specific_but_process_unspecified",
        event_id: eventId,
      });
    }
  } else if (evidenceLevel === "unspecified") {
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
  let unspecified = 0;
  let effectiveEvidenceCount = 0;

  hydraulicEvents.forEach((event) => {
    const intelligence = event.hydraulic_intelligence;
    const evidence = intelligence.evidence_level || "unspecified";

    if (evidence === "documented") {
      documented += 1;
    } else if (evidence === "probable") {
      probable += 1;
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

  const specificMechanismCases = hydraulicEvents.length - unspecified;

  return {
    total_cases: hydraulicEvents.length,
    mechanism_documented_cases: documented,
    mechanism_probable_cases: probable,
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
