import {
  deriveProvinceForPoint,
} from "../src/utils/projectLocation.js";
import {
  buildNationalHazardAnalogueCohort,
} from "./collapseAnalogueService.js";

const ENGINE_VERSION = "arcus-mitigation-intelligence-v2";
const NATIONAL_SIGNATURE_COVERAGE_THRESHOLD = 0.8;

const HYDRAULIC_PROCESS_CATALOG = Object.freeze({
  bank_erosion_or_embankment_failure: {
    affected_components: ["abutment", "approach_embankment"],
    investigation: {
      en: "Bank, abutment and approach stability investigation",
      it: "Indagine sulla stabilita di sponda, spalle e rilevati di accesso",
    },
    monitoring: {
      en: "Define inspection triggers for bank retreat, approach erosion and post-flood deformation.",
      it: "Definire soglie ispettive per arretramento di sponda, erosione degli accessi e deformazioni post-piena.",
    },
    purpose: {
      en: "Verify whether channel migration or bank erosion can compromise abutments and approach continuity.",
      it: "Verificare se la migrazione dell'alveo o l'erosione di sponda possano compromettere spalle e continuita degli accessi.",
    },
    risk_control_theme: {
      en: "Review bank and approach resilience under the site-specific hydraulic and geomorphological context.",
      it: "Rivedere la resilienza di sponde e rilevati di accesso nel contesto idraulico e geomorfologico sito-specifico.",
    },
  },
  debris_accumulation_or_obstruction: {
    affected_components: ["pier_foundation", "deck_or_superstructure", "multiple_components"],
    investigation: {
      en: "Debris transport and obstruction assessment",
      it: "Valutazione del trasporto di detriti e del rischio di ostruzione",
    },
    monitoring: {
      en: "Define debris-clearance and post-event inspection triggers for the crossing.",
      it: "Definire soglie per la rimozione dei detriti e l'ispezione post-evento dell'attraversamento.",
    },
    purpose: {
      en: "Assess whether transported material can reduce the effective opening or concentrate hydraulic actions.",
      it: "Valutare se il materiale trasportato possa ridurre la luce efficace o concentrare le azioni idrauliche.",
    },
    risk_control_theme: {
      en: "Review obstruction management and hydraulic-opening resilience under documented debris scenarios.",
      it: "Rivedere la gestione delle ostruzioni e la resilienza della luce idraulica rispetto agli scenari documentati di trasporto solido.",
    },
  },
  debris_flow_or_solid_transport: {
    affected_components: ["pier_foundation", "deck_or_superstructure", "multiple_components"],
    investigation: {
      en: "Solid-transport and debris-flow assessment",
      it: "Valutazione del trasporto solido e delle colate detritiche",
    },
    monitoring: {
      en: "Define event-based inspection triggers for sediment accumulation, impact and opening reduction.",
      it: "Definire soglie ispettive evento-dipendenti per accumulo di sedimenti, impatto e riduzione della luce.",
    },
    purpose: {
      en: "Characterise transported material, impact pathways and possible loss of hydraulic capacity.",
      it: "Caratterizzare materiale trasportato, traiettorie di impatto e possibile perdita di capacita idraulica.",
    },
    risk_control_theme: {
      en: "Review crossing robustness and maintenance access under solid-transport scenarios.",
      it: "Rivedere robustezza dell'attraversamento e accessibilita manutentiva rispetto agli scenari di trasporto solido.",
    },
  },
  other_documented_hydraulic_process: {
    affected_components: ["multiple_components"],
    investigation: {
      en: "Case-specific hydraulic mechanism review",
      it: "Revisione sito-specifica del meccanismo idraulico",
    },
    monitoring: {
      en: "Define monitoring only after the documented mechanism has been reconciled with site conditions.",
      it: "Definire il monitoraggio solo dopo avere confrontato il meccanismo documentato con le condizioni del sito.",
    },
    purpose: {
      en: "Resolve the applicable hydraulic mechanism before selecting detailed verification activities.",
      it: "Definire il meccanismo idraulico applicabile prima di selezionare le verifiche di dettaglio.",
    },
    risk_control_theme: {
      en: "Maintain an evidence-led, mechanism-specific control pathway.",
      it: "Mantenere un percorso di controllo guidato dall'evidenza e specifico per meccanismo.",
    },
  },
  overtopping_or_hydrodynamic_action: {
    affected_components: ["deck_or_superstructure", "entire_structure", "multiple_components"],
    investigation: {
      en: "Flood level, freeboard and hydrodynamic-action assessment",
      it: "Valutazione di livelli di piena, franco e azioni idrodinamiche",
    },
    monitoring: {
      en: "Define flood-level and post-event inspection triggers for deck, bearings and approaches.",
      it: "Definire soglie di livello e ispezioni post-evento per impalcato, appoggi e accessi.",
    },
    purpose: {
      en: "Check the interaction between design flood levels, effective freeboard and exposed structural components.",
      it: "Verificare l'interazione tra livelli di piena, franco efficace e componenti strutturali esposte.",
    },
    risk_control_theme: {
      en: "Review hydraulic capacity and structural continuity under overtopping or high-flow actions.",
      it: "Rivedere capacita idraulica e continuita strutturale rispetto a sormonto o azioni di piena intensa.",
    },
  },
  scour: {
    affected_components: ["pier_foundation", "abutment", "approach_embankment"],
    investigation: {
      en: "Hydraulic, scour and foundation-support assessment",
      it: "Valutazione idraulica, dello scalzamento e del supporto fondazionale",
    },
    monitoring: {
      en: "Define post-flood inspection and scour-monitoring triggers at supports and approaches.",
      it: "Definire ispezioni post-piena e soglie di monitoraggio dello scalzamento presso supporti e accessi.",
    },
    purpose: {
      en: "Verify whether local or general scour can reduce support capacity at foundations, piers or abutments.",
      it: "Verificare se lo scalzamento locale o generalizzato possa ridurre la capacita di supporto di fondazioni, pile o spalle.",
    },
    risk_control_theme: {
      en: "Review foundation and support-zone resilience under site-specific erosive-flow conditions.",
      it: "Rivedere la resilienza di fondazioni e zone di supporto nelle condizioni sito-specifiche di flusso erosivo.",
    },
  },
});

const GENERIC_HYDRAULIC_STRATEGY = Object.freeze({
  affected_components: ["unspecified"],
  investigation: {
    en: "Site-specific hydraulic and geomorphological investigation",
    it: "Indagine idraulica e geomorfologica sito-specifica",
  },
  monitoring: {
    en: "Define monitoring and inspection triggers after the governing mechanism has been confirmed.",
    it: "Definire soglie di monitoraggio e ispezione dopo la conferma del meccanismo governante.",
  },
  purpose: {
    en: "Resolve the governing hydraulic mechanism because the current evidence does not support a more specific pathway.",
    it: "Definire il meccanismo idraulico governante poiche l'evidenza disponibile non supporta un percorso piu specifico.",
  },
  risk_control_theme: {
    en: "Keep the response mechanism-led and confirm assumptions before design decisions.",
    it: "Mantenere la risposta guidata dal meccanismo e confermare le ipotesi prima delle decisioni progettuali.",
  },
});

function normalize(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function evidenceWeight(level) {
  if (level === "documented") {
    return 1;
  }

  if (level === "probable") {
    return 0.5;
  }

  return 0;
}

function rounded(value) {
  return Number(Number(value || 0).toFixed(2));
}

function hydraulicTrack(exposure = {}) {
  const matchedClasses = Array.isArray(exposure.matched_classes)
    ? exposure.matched_classes.filter(Boolean)
    : [];
  const failedLayers = Array.isArray(exposure?.coverage?.failed_layers)
    ? exposure.coverage.failed_layers
    : [];
  const active = ["available", "partial"].includes(exposure.status) &&
    (Boolean(exposure.highest_class) || matchedClasses.length > 0);
  const assessmentComplete =
    typeof exposure.assessment_complete === "boolean"
      ? exposure.assessment_complete
      : exposure.status !== "partial";

  return {
    active,
    assessment_complete: assessmentComplete,
    decision_status: exposure.decision_status ||
      (assessmentComplete
        ? active
          ? "available_complete"
          : exposure.status || "not_queried"
        : active
          ? "available_partial"
          : "source_incomplete"),
    failed_layers: failedLayers,
    highest_class: exposure.highest_class || null,
    matched_classes: matchedClasses,
    freshness_status: exposure?.source?.freshness_status || "unavailable",
    last_known_good_layers:
      exposure?.source?.last_known_good_layers || [],
    observation_mode: exposure?.source?.observation_mode || "unavailable",
    observed_at: exposure?.source?.observed_at || null,
    provider_status: exposure.status || "not_queried",
    track: "hydraulic",
  };
}

function landslideTrack(exposure = {}) {
  const matchedClasses = Array.isArray(exposure.matched_hazard_classes)
    ? exposure.matched_hazard_classes.filter(Boolean)
    : [];

  return {
    active: ["available", "partial"].includes(exposure.status) && matchedClasses.length > 0,
    attention_only: Boolean(exposure.attention_area) && matchedClasses.length === 0,
    highest_class: exposure.highest_hazard_class || null,
    matched_classes: matchedClasses,
    provider_status: exposure.status || "not_queried",
    track: "landslide",
  };
}

function seismicTrack(exposure = {}) {
  const pga = Number(exposure.pga_p50_g);

  return {
    active: false,
    attention_only: exposure.status === "available" && Number.isFinite(pga),
    pga_p50_g: Number.isFinite(pga) ? pga : null,
    provider_status: exposure.status || "not_queried",
    track: "seismic",
  };
}

function evidenceStrength(rawCount, effectiveCount) {
  if (rawCount >= 8 && effectiveCount >= 5) {
    return "moderate";
  }

  if (rawCount >= 3 && effectiveCount >= 2) {
    return "limited";
  }

  return "insufficient";
}

function summarizeHydraulicEvidence(events, sources) {
  const sourceCountByEvent = sources.reduce((index, source) => {
    if (source?.event_id) {
      index[source.event_id] = (index[source.event_id] || 0) + 1;
    }

    return index;
  }, {});
  const processes = new Map();
  const components = new Map();
  let effectiveEvidenceCount = 0;
  let linkedSourceCount = 0;

  events.forEach((event) => {
    const intelligence = event.hydraulic_intelligence;

    if (!intelligence) {
      return;
    }

    const weight = evidenceWeight(intelligence.evidence_level);
    const process = intelligence.failure_process || "unspecified";
    const component = intelligence.component_involved || "unspecified";
    const processEntry = processes.get(process) || {
      documented_count: 0,
      effective_evidence_count: 0,
      event_ids: [],
      probable_count: 0,
      process,
      raw_count: 0,
      source_count: 0,
    };

    processEntry.raw_count += 1;
    processEntry.effective_evidence_count += weight;
    processEntry.event_ids.push(event.event_id);
    processEntry.source_count += sourceCountByEvent[event.event_id] || 0;

    if (intelligence.evidence_level === "documented") {
      processEntry.documented_count += 1;
    } else if (intelligence.evidence_level === "probable") {
      processEntry.probable_count += 1;
    }

    processes.set(process, processEntry);
    components.set(component, (components.get(component) || 0) + 1);
    effectiveEvidenceCount += weight;
    linkedSourceCount += sourceCountByEvent[event.event_id] || 0;
  });

  return {
    components: [...components.entries()]
      .map(([component, count]) => ({ component, count }))
      .sort((left, right) => right.count - left.count || left.component.localeCompare(right.component)),
    effective_evidence_count: rounded(effectiveEvidenceCount),
    event_count: events.length,
    event_ids: events
      .map((event) => event.event_id)
      .sort((left, right) => String(left).localeCompare(String(right))),
    linked_source_count: linkedSourceCount,
    processes: [...processes.values()]
      .map((item) => ({
        ...item,
        effective_evidence_count: rounded(item.effective_evidence_count),
        event_ids: [...item.event_ids].sort((left, right) =>
          String(left).localeCompare(String(right))
        ),
        evidence_strength: evidenceStrength(item.raw_count, item.effective_evidence_count),
      }))
      .sort((left, right) =>
        right.effective_evidence_count - left.effective_evidence_count ||
        right.raw_count - left.raw_count ||
        left.process.localeCompare(right.process)
      ),
  };
}

function strategyForProcess(processEvidence, index, cohortDescription) {
  const template = HYDRAULIC_PROCESS_CATALOG[processEvidence.process];

  if (!template) {
    return null;
  }

  return {
    affected_components: template.affected_components,
    applicability_conditions: [
      "Official ISPRA hydraulic exposure intersects the project point.",
      `The ${cohortDescription} contains at least three ${processEvidence.process} cases with an effective evidence count of at least two.`,
      "A qualified professional confirms that the documented mechanism is relevant to the project geometry and site conditions.",
    ],
    arcus_evidence: {
      documented_count: processEvidence.documented_count,
      effective_evidence_count: processEvidence.effective_evidence_count,
      event_ids: processEvidence.event_ids,
      probable_count: processEvidence.probable_count,
      raw_count: processEvidence.raw_count,
      source_count: processEvidence.source_count,
    },
    evidence_strength: processEvidence.evidence_strength,
    external_validation_required: true,
    hazard_track: "hydraulic",
    investigation_priority: template.investigation,
    limitations: [
      "Historical analogue outcomes are contextual evidence, not a probability for the selected site.",
      "ARCUS does not verify present asset condition or structural safety.",
      "The risk-control theme must be converted into site-specific checks by qualified professionals.",
    ],
    monitoring_consideration: template.monitoring,
    priority_order: index + 1,
    process: processEvidence.process,
    purpose: template.purpose,
    risk_control_theme: template.risk_control_theme,
    status: "expert_review_required",
    strategy_id: `hydraulic-${processEvidence.process}`,
  };
}

function genericHydraulicStrategy(summary, cohortDescription) {
  return {
    affected_components: GENERIC_HYDRAULIC_STRATEGY.affected_components,
    applicability_conditions: [
      "Official ISPRA hydraulic exposure intersects the project point.",
      `The ${cohortDescription} has usable hydraulic evidence but no individual process passes the process-specific support threshold.`,
    ],
    arcus_evidence: {
      documented_count: summary.processes.reduce((total, item) => total + item.documented_count, 0),
      effective_evidence_count: summary.effective_evidence_count,
      event_ids: summary.event_ids,
      probable_count: summary.processes.reduce((total, item) => total + item.probable_count, 0),
      raw_count: summary.event_count,
      source_count: summary.linked_source_count,
    },
    evidence_strength: "limited",
    external_validation_required: true,
    hazard_track: "hydraulic",
    investigation_priority: GENERIC_HYDRAULIC_STRATEGY.investigation,
    limitations: [
      "The available evidence does not support a process-specific pathway.",
      "Historical outcomes are contextual and do not predict project performance.",
    ],
    monitoring_consideration: GENERIC_HYDRAULIC_STRATEGY.monitoring,
    priority_order: 1,
    process: "hydraulic_process_not_resolved",
    purpose: GENERIC_HYDRAULIC_STRATEGY.purpose,
    risk_control_theme: GENERIC_HYDRAULIC_STRATEGY.risk_control_theme,
    status: "expert_review_required",
    strategy_id: "hydraulic-generic-investigation",
  };
}

export function synchronizeMitigationProjectLocation(payload = {}, provinceFeatures = []) {
  const requestedProvince = String(
    payload?.project_location?.derived_province || ""
  ).trim();
  const derived = deriveProvinceForPoint(provinceFeatures, {
    latitude: payload?.project_location?.latitude,
    longitude: payload?.project_location?.longitude,
  });

  if (!derived.validated) {
    return {
      ...payload,
      project_location: {
        ...payload.project_location,
        derived_province: "",
        error: derived.error,
        latitude: derived.latitude ?? payload?.project_location?.latitude ?? null,
        longitude: derived.longitude ?? payload?.project_location?.longitude ?? null,
        requested_province: requestedProvince || null,
        validation_source: "server_point_in_polygon",
        validated: false,
      },
    };
  }

  return {
    ...payload,
    project_location: {
      ...payload.project_location,
      derived_province: derived.derivedProvince,
      derived_province_code: derived.derivedProvinceCode,
      derived_province_key: derived.derivedProvinceKey,
      latitude: derived.latitude,
      longitude: derived.longitude,
      province_mismatch_corrected:
        Boolean(requestedProvince) && normalize(requestedProvince) !== normalize(derived.derivedProvince),
      requested_province: requestedProvince || null,
      validation_source: "server_point_in_polygon",
      validated: true,
    },
  };
}

export function buildMitigationIntelligence({
  events = [],
  historicalSignatures = [],
  payload = {},
  signatures = [],
  sources = [],
} = {}) {
  const rawLatitude = payload?.project_location?.latitude;
  const rawLongitude = payload?.project_location?.longitude;
  const latitude = Number(rawLatitude);
  const longitude = Number(rawLongitude);
  const province = String(payload?.project_location?.derived_province || "").trim();
  const locationValid = payload?.project_location?.validated === true &&
    rawLatitude !== null && rawLatitude !== undefined && rawLatitude !== "" &&
    rawLongitude !== null && rawLongitude !== undefined && rawLongitude !== "" &&
    Number.isFinite(latitude) &&
    latitude >= -90 && latitude <= 90 &&
    Number.isFinite(longitude) && longitude >= -180 && longitude <= 180 &&
    Boolean(province);
  const tracks = [
    hydraulicTrack(payload?.official_exposure?.hydraulic),
    landslideTrack(payload?.official_exposure?.landslide),
    seismicTrack(payload?.official_exposure?.seismic),
  ];
  const hydraulic = tracks[0];
  const provinceEvents = locationValid
    ? events.filter((event) => normalize(event.province) === normalize(province))
    : [];
  const nationalAnalogueCohort = buildNationalHazardAnalogueCohort({
    events,
    historicalSignatures,
    officialExposure: payload?.official_exposure,
    signatures,
  });
  const hydraulicSignatureCoverage =
    nationalAnalogueCohort.signature_coverage.total_events > 0
      ? nationalAnalogueCohort.signature_coverage.hydraulic_complete /
        nationalAnalogueCohort.signature_coverage.total_events
      : 0;
  const nationalAnalogueReady =
    nationalAnalogueCohort.available &&
    nationalAnalogueCohort.analogues.length >= 3 &&
    hydraulicSignatureCoverage >= NATIONAL_SIGNATURE_COVERAGE_THRESHOLD;
  const eventsById = new Map(
    events.map((event) => [event.event_id, event])
  );
  const selectedCohortEvents = nationalAnalogueReady
    ? nationalAnalogueCohort.analogues
        .map((analogue) => eventsById.get(analogue.event.event_id))
        .filter(Boolean)
    : provinceEvents;
  const hydraulicEvents = selectedCohortEvents.filter(
    (event) => event.hydraulic_intelligence
  );
  const evidence = summarizeHydraulicEvidence(hydraulicEvents, sources);
  const cohortDescription = nationalAnalogueReady
    ? "national current-hazard analogue cohort"
    : "point-derived provincial fallback cohort";
  const abstentionReasons = [];

  if (!locationValid) {
    abstentionReasons.push("validated_project_location_required");
  }

  if (!hydraulic.active) {
    abstentionReasons.push(
      hydraulic.provider_status === "no_intersection"
        ? "official_hydraulic_exposure_not_intersected"
        : hydraulic.provider_status === "partial" ||
            hydraulic.decision_status === "source_incomplete"
          ? "official_hydraulic_exposure_incomplete"
        : "official_hydraulic_exposure_unavailable"
    );
  }

  if (hydraulic.active && evidence.effective_evidence_count < 2) {
    abstentionReasons.push("insufficient_effective_hydraulic_evidence");
  }

  const supportedProcesses = evidence.processes.filter(
    (item) => item.raw_count >= 3 && item.effective_evidence_count >= 2
  );
  let strategies = hydraulic.active
    ? supportedProcesses
        .map((processEvidence, index) =>
          strategyForProcess(
            processEvidence,
            index,
            cohortDescription
          )
        )
        .filter(Boolean)
        .slice(0, 3)
    : [];

  if (
    hydraulic.active &&
    strategies.length === 0 &&
    evidence.effective_evidence_count >= 2
  ) {
    strategies = [
      genericHydraulicStrategy(evidence, cohortDescription),
    ];
  }

  const baseStatus = !locationValid || !hydraulic.active
    ? "abstained"
    : strategies.length
      ? supportedProcesses.length
        ? "available"
        : "limited_evidence"
      : "abstained";
  const status = !hydraulic.assessment_complete && baseStatus === "available"
    ? "available_partial"
    : !hydraulic.assessment_complete && baseStatus === "limited_evidence"
      ? "limited_evidence_partial"
      : baseStatus;
  const sourceWarnings = [
    ...(!hydraulic.assessment_complete
      ? [
        hydraulic.active
          ? "official_hydraulic_exposure_partial"
          : "official_hydraulic_exposure_incomplete",
        ]
      : []),
    ...(hydraulic.observation_mode === "persistent_cache"
      ? ["official_hydraulic_exposure_from_persistent_cache"]
      : []),
  ];

  return {
    active_hazard_tracks: tracks.filter((track) => track.active),
    abstention_reasons: status === "abstained" ? abstentionReasons : [],
    attention_tracks: tracks.filter((track) => track.attention_only),
    caveat:
      "ARCUS translates official site exposure and documented historical outcomes into investigation priorities and risk-control themes. It does not estimate collapse probability, certify safety or prescribe a design solution.",
    decision_context: {
      project_context: payload.project_context || "bridge",
      project_location: {
        derived_province: province || null,
        latitude: locationValid ? latitude : null,
        longitude: locationValid ? longitude : null,
        province_mismatch_corrected: Boolean(
          payload?.project_location?.province_mismatch_corrected
        ),
        requested_province: payload?.project_location?.requested_province || null,
        validation_source: payload?.project_location?.validation_source || "caller_validated",
        validated: locationValid,
      },
    },
    engine_version: ENGINE_VERSION,
    evidence_cohort: {
      ...evidence,
      analogue_retrieval: {
        ...nationalAnalogueCohort,
        hydraulic_signature_coverage_ratio: rounded(
          hydraulicSignatureCoverage
        ),
        minimum_coverage_ratio:
          NATIONAL_SIGNATURE_COVERAGE_THRESHOLD,
        production_ready: nationalAnalogueReady,
      },
      local_context: {
        hydraulic_event_count: provinceEvents.filter(
          (event) => event.hydraulic_intelligence
        ).length,
        province,
        role: "territorial_context_not_primary_analogue_filter",
        total_collapse_count: provinceEvents.length,
      },
      outcome_fields_read_after_context_fixed: [
        "hydraulic_intelligence.failure_process",
        "hydraulic_intelligence.component_involved",
        "hydraulic_intelligence.evidence_level",
      ],
      province,
      selection_mode: nationalAnalogueReady
        ? "national_current_hazard_signature_fixed_before_outcome_synthesis"
        : "point_derived_province_fallback_until_national_signature_coverage_ready",
    },
    forbidden_outputs: [
      "collapse_probability",
      "safe_unsafe_classification",
      "automatic_design_prescription",
      "final_priority_index_modification",
    ],
    generated_at: new Date().toISOString(),
    limitations: [
      "The production mitigation slice supports hydraulic strategies only.",
      "Landslide and seismic exposure remain contextual until equivalent curated outcome evidence is validated.",
      "Current official signatures support present-day comparability; they are not retrospective causal proof.",
      "Historical-at-event classifications are used only when an authenticated, dated source is registered. They are never reconstructed from the current class.",
      "Observed triggers and collapse processes are read only after the analogue cohort is fixed.",
      ...(nationalAnalogueReady
        ? []
        : [
            "National analogue retrieval is not used for mitigation until current hydraulic signatures cover at least 80% of the collapse database and at least three analogues are available. The point-derived provincial cohort remains an explicit fallback.",
          ]),
      "No value from this engine contributes to the Final Priority Index or Path 02 ranking.",
    ],
    source_completeness: {
      hydraulic: {
        assessment_complete: hydraulic.assessment_complete,
        decision_status: hydraulic.decision_status,
        failed_layers: hydraulic.failed_layers,
        freshness_status: hydraulic.freshness_status,
        last_known_good_layers: hydraulic.last_known_good_layers,
        matched_classes: hydraulic.matched_classes,
        observation_mode: hydraulic.observation_mode,
        observed_at: hydraulic.observed_at,
        provider_status: hydraulic.provider_status,
      },
    },
    source_warnings: sourceWarnings,
    status,
    strategies,
  };
}
