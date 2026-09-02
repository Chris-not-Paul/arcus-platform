function textValue(value, fallback = "-") {
  if (value === null || value === undefined || value === "") {
    return fallback;
  }

  return String(value);
}

function displayCode(value) {
  return textValue(value).replaceAll("_", " ");
}

function finiteNumber(value) {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  const number = Number(value);

  return Number.isFinite(number) ? number : null;
}

function coordinateText(point) {
  const latitude = finiteNumber(point?.latitude);
  const longitude = finiteNumber(point?.longitude);

  return latitude === null || longitude === null
    ? "not available"
    : `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`;
}

function hydraulicClasses(exposure) {
  const classes = Array.isArray(exposure?.matched_classes)
    ? exposure.matched_classes
    : [];

  return classes.length ? classes.join(", ") : "none assigned to point";
}

function landslideClasses(exposure) {
  const hazard = Array.isArray(exposure?.matched_hazard_classes)
    ? exposure.matched_hazard_classes
    : [];
  const attention = Array.isArray(exposure?.matched_attention_classes)
    ? exposure.matched_attention_classes
    : [];
  const classes = [...hazard, ...attention];

  return classes.length ? classes.join(", ") : "none assigned to point";
}

function nearbyContext(exposure) {
  const nearby = exposure?.nearby_context;

  if (nearby?.status !== "available" || !nearby.classes?.length) {
    return "none reported";
  }

  return `${nearby.classes.join(", ")} within ${nearby.search_radius_km} km; not assigned to point`;
}

function eventSourceRows(analogue, eventSources) {
  const eventId = analogue?.event?.event_id;

  return (eventSources?.[eventId] || []).map((source) => ({
    eventId,
    role: textValue(source.source_role || source.role),
    title: textValue(source.title || source.source_title || source.publisher),
    url: textValue(source.url || source.source_url, ""),
  }));
}

function localized(value, language) {
  return value?.[language] || value?.en || value?.it || "-";
}

export function buildCollapseIntelligenceReportModel({
  eventSources = {},
  exposure,
  generatedAt = new Date().toISOString(),
  intelligence,
  language = "en",
  point,
  reportSummary,
}) {
  const it = language === "it";
  const hydraulic = exposure?.hydraulic || {};
  const landslide = exposure?.landslide || {};
  const seismic = exposure?.seismic || {};
  const evidence = intelligence?.evidence_cohort || {};
  const retrieval = evidence.analogue_retrieval || {};
  const analogues = Array.isArray(retrieval.analogues)
    ? retrieval.analogues
    : [];
  const strategies = Array.isArray(intelligence?.strategies)
    ? intelligence.strategies
    : [];
  const failureLearning = intelligence?.failure_learning_matrix || {};
  const failureLearningRows = Array.isArray(failureLearning.rows)
    ? failureLearning.rows
    : [];
  const failureLearningContractAvailable = Boolean(
    failureLearning.matrix_version
  );
  const projectBridgeProfile = intelligence?.project_bridge_profile || {};
  const projectBridgeProfileFields = projectBridgeProfile.provided_fields || {};
  const pga = finiteNumber(seismic.pga_p50_g);
  const sourceRows = analogues.flatMap((analogue) =>
    eventSourceRows(analogue, eventSources)
  );

  return {
    product: "ARCUS Collapse Intelligence - Lessons from Failures",
    generatedAt,
    language,
    project: {
      coordinates: coordinateText(point),
      latitude: finiteNumber(point?.latitude),
      longitude: finiteNumber(point?.longitude),
      province: textValue(point?.derivedProvince),
      provinceCode: textValue(point?.derivedProvinceCode),
      validated: point?.validated === true,
    },
    projectBridgeProfile: {
      descriptiveFields: (projectBridgeProfile.descriptive_fields_provided || [])
        .map((field) => ({
          field: displayCode(field),
          value: textValue(projectBridgeProfileFields[field]),
        })),
      invalidFields: (projectBridgeProfile.invalid_fields || []).map(
        (item) => `${displayCode(item.field)}: ${displayCode(item.reason)}`
      ),
      matchFields: (projectBridgeProfile.match_fields_provided || [])
        .map((field) => ({
          field: displayCode(field),
          value: textValue(projectBridgeProfileFields[field]),
        })),
      matchingMode: displayCode(
        projectBridgeProfile.matching_mode || "hydraulic_signature_only"
      ),
      thresholdsModified:
        projectBridgeProfile.selection_boundary
          ?.modifies_evidence_thresholds === true,
      version: textValue(projectBridgeProfile.profile_version),
    },
    officialExposure: [
      {
        domain: it ? "Idraulica ISPRA" : "ISPRA hydraulic",
        status: displayCode(hydraulic.status),
        pointValue: hydraulicClasses(hydraulic),
        highestClass: textValue(hydraulic.highest_class),
        nearbyContext: nearbyContext(hydraulic),
        provenance: `${displayCode(hydraulic.source?.observation_mode || hydraulic.observation_mode)} / ${displayCode(hydraulic.freshness_status || hydraulic.source?.freshness_status)}`,
      },
      {
        domain: it ? "Frane ISPRA PAI" : "ISPRA PAI landslide",
        status: displayCode(landslide.status),
        pointValue: landslideClasses(landslide),
        highestClass: textValue(landslide.highest_hazard_class),
        nearbyContext: nearbyContext(landslide),
        provenance: `${displayCode(landslide.source?.observation_mode || landslide.observation_mode)} / ${displayCode(landslide.freshness_status || landslide.source?.freshness_status)}`,
      },
      {
        domain: it ? "Sisma INGV MPS04" : "INGV MPS04 seismic",
        status: displayCode(seismic.status),
        pointValue: pga === null ? "not available" : `${pga.toFixed(4)} g`,
        highestClass: "not assigned",
        nearbyContext: "not applicable",
        provenance: `${displayCode(seismic.sampling_method)} / ${displayCode(seismic.source?.provider || "INGV")}`,
      },
    ],
    intelligence: {
      status: displayCode(intelligence?.status),
      selectionMode: displayCode(evidence.selection_mode),
      rawEvidence: finiteNumber(evidence.event_count) || 0,
      effectiveEvidence: finiteNumber(evidence.effective_evidence_count) || 0,
      independentEpisodes: finiteNumber(evidence.episode_count) || 0,
      episodeEffectiveEvidence:
        finiteNumber(evidence.episode_effective_evidence_count) || 0,
      analogueCount: analogues.length,
      signatureCoveragePercent: Math.round(
        (finiteNumber(retrieval.hydraulic_signature_coverage_ratio) || 0) * 100
      ),
      abstentionReasons: (intelligence?.abstention_reasons || []).map(displayCode),
    },
    failureLearning: {
      abstentionReasons: (failureLearning.abstention_reasons || []).map(
        displayCode
      ),
      caveat: textValue(
        failureLearning.caveat,
        it
          ? "Nessuna interpretazione ingegneristica viene generata senza il contratto Failure Learning Matrix v1 completo."
          : "No engineering interpretation is generated without the complete Failure Learning Matrix v1 contract."
      ),
      contractAvailable: failureLearningContractAvailable,
      cohortFixedBeforeOutcomeRead:
        failureLearning.cohort_contract?.cohort_fixed_before_outcome_read ===
        true,
      genericInvestigationPriority: failureLearning.generic_investigation_priority
        ? localized(failureLearning.generic_investigation_priority, language)
        : null,
      geometryUsedForQualification:
        failureLearning.cohort_contract?.geometry_used_for_qualification ===
        true,
      qualifiedPriorityCount:
        finiteNumber(failureLearning.qualified_priority_count) || 0,
      rowCount: finiteNumber(failureLearning.row_count) || 0,
      status: displayCode(
        failureLearningContractAvailable
          ? failureLearning.status || "abstained"
          : "contract_unavailable"
      ),
      version: textValue(failureLearning.matrix_version),
      rows: failureLearningRows.map((row) => ({
        components: (row.affected_components || []).map((component) => ({
          effectiveEvidence:
            finiteNumber(component.effective_evidence_count) || 0,
          episodeCount: finiteNumber(component.episode_count) || 0,
          name: displayCode(component.component),
          rawCount: finiteNumber(component.raw_count) || 0,
        })),
        evidence: {
          effectiveEvidence:
            finiteNumber(row.evidence?.effective_evidence_count) || 0,
          episodeCount: finiteNumber(row.evidence?.episode_count) || 0,
          episodeEffectiveEvidence:
            finiteNumber(row.evidence?.episode_effective_evidence_count) || 0,
          rawCount: finiteNumber(row.evidence?.raw_count) || 0,
        },
        geometry: {
          eventCount:
            finiteNumber(row.geometry_context?.geometry_event_count) || 0,
          medianLengthM: finiteNumber(
            row.geometry_context?.bridge_length_m?.median
          ),
          pierAvailableCount:
            finiteNumber(
              row.geometry_context?.piers_in_active_riverbed
                ?.available_count
            ) || 0,
          pierTrueCount:
            finiteNumber(
              row.geometry_context?.piers_in_active_riverbed?.true_count
            ) || 0,
          role: displayCode(row.geometry_context?.role),
        },
        investigationPriority: row.investigation_priority
          ? localized(row.investigation_priority, language)
          : null,
        investigationQuestion: localized(
          row.investigation_question,
          language
        ),
        learningStatement: localized(row.learning_statement, language),
        learningStatus: displayCode(row.learning_status),
        process: displayCode(row.process),
        qualified: row.qualification?.qualified === true,
      })),
    },
    strategies: strategies.map((strategy) => ({
      id: strategy.strategy_id,
      process: displayCode(strategy.process),
      priority: localized(strategy.investigation_priority, language),
      purpose: localized(strategy.purpose, language),
      riskControlTheme: localized(strategy.risk_control_theme, language),
      monitoring: localized(strategy.monitoring_consideration, language),
      applicability: (strategy.applicability_conditions || []).map((item) =>
        typeof item === "string" ? displayCode(item) : localized(item, language)
      ),
      rawEvidence: finiteNumber(strategy.arcus_evidence?.raw_count) || 0,
      effectiveEvidence:
        finiteNumber(strategy.arcus_evidence?.effective_evidence_count) || 0,
      independentEpisodes:
        finiteNumber(strategy.arcus_evidence?.episode_count) || 0,
      externalValidationRequired: strategy.external_validation_required === true,
    })),
    analogues: analogues.map((analogue) => ({
      rank: finiteNumber(analogue.retrieval_rank),
      eventId: textValue(analogue.event?.event_id),
      municipality: textValue(analogue.event?.municipality),
      province: textValue(analogue.event?.province),
      hydraulicClass: textValue(
        analogue.current_official_signature?.hydraulic?.highest_class
      ),
      profileComparedFields:
        finiteNumber(
          analogue.retrieval_comparison?.project_bridge_profile
            ?.compared_field_count
        ) || 0,
      profileExactMatches:
        finiteNumber(
          analogue.retrieval_comparison?.project_bridge_profile
            ?.exact_match_count
        ) || 0,
      sourceCount: (eventSources?.[analogue.event?.event_id] || []).length,
    })),
    sources: sourceRows,
    domainSupport: [
      {
        domain: it ? "Frane" : "Landslide",
        status: displayCode(intelligence?.landslide_support?.status),
        reasons: (intelligence?.landslide_support?.abstention_reasons || []).map(
          displayCode
        ),
      },
      {
        domain: it ? "Sisma" : "Seismic",
        status: displayCode(intelligence?.seismic_support?.status),
        reasons: (intelligence?.seismic_support?.abstention_reasons || []).map(
          displayCode
        ),
      },
    ],
    narrative: {
      cohort: reportSummary?.cohortText || "-",
      evidence: reportSummary?.evidenceText || "-",
      outcome: reportSummary?.outcomeText || "-",
      provenance: reportSummary?.sourceText || "-",
      registryQuality: reportSummary?.registryQualityText || "-",
      retrievalRobustness: reportSummary?.retrievalRobustnessText || "-",
    },
    warnings: [
      reportSummary?.warningText ||
        (it
          ? "Output non prescrittivo soggetto a validazione professionale."
          : "Non-prescriptive output subject to professional validation."),
      it
        ? "La firma hazard attuale supporta la comparabilita; non ricostruisce automaticamente la pericolosita all'anno del collasso e non dimostra la causa."
        : "The current hazard signature supports comparability; it does not automatically reconstruct hazard at collapse time or prove causation.",
      it
        ? "L'assenza di intersezione ufficiale al punto non certifica assenza di rischio reale."
        : "No official point intersection does not certify absence of real-world risk.",
    ],
  };
}

function createPdfWriter(pdf) {
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const margin = 16;
  const contentWidth = pageWidth - margin * 2;
  let y = 18;

  const ensureSpace = (height = 10) => {
    if (y + height <= pageHeight - 17) {
      return;
    }

    pdf.addPage();
    y = 18;
  };

  const line = (text, {
    color = [47, 45, 42],
    font = "helvetica",
    size = 9,
    style = "normal",
    gap = 2,
    indent = 0,
  } = {}) => {
    pdf.setFont(font, style);
    pdf.setFontSize(size);
    pdf.setTextColor(...color);
    const lines = pdf.splitTextToSize(textValue(text), contentWidth - indent);
    const height = lines.length * (size * 0.42 + 1.2);
    ensureSpace(height + gap);
    pdf.text(lines, margin + indent, y);
    y += height + gap;
  };

  const rule = () => {
    ensureSpace(6);
    pdf.setDrawColor(188, 137, 56);
    pdf.setLineWidth(0.5);
    pdf.line(margin, y, pageWidth - margin, y);
    y += 6;
  };

  const section = (title) => {
    ensureSpace(14);
    y += 3;
    line(title.toUpperCase(), {
      color: [166, 107, 29],
      size: 10,
      style: "bold",
      gap: 4,
    });
  };

  const keyValue = (key, value) => {
    line(`${key}: ${textValue(value)}`, { size: 8.5, gap: 1.3 });
  };

  return {
    keyValue,
    line,
    margin,
    pageHeight,
    pageWidth,
    rule,
    section,
  };
}

export async function downloadCollapseIntelligencePdf(model) {
  const { jsPDF } = await import("jspdf");
  const pdf = new jsPDF({
    format: "a4",
    orientation: "portrait",
    unit: "mm",
  });
  const writer = createPdfWriter(pdf);
  const it = model.language === "it";

  pdf.setFillColor(35, 33, 33);
  pdf.rect(0, 0, writer.pageWidth, 49, "F");
  writer.line("ARCUS PROFESSIONAL", {
    color: [200, 146, 60],
    size: 9,
    style: "bold",
  });
  writer.line("COLLAPSE INTELLIGENCE", {
    color: [248, 244, 236],
    size: 22,
    style: "bold",
    gap: 0,
  });
  writer.line("LESSONS FROM FAILURES", {
    color: [218, 213, 204],
    size: 13,
    style: "normal",
    gap: 11,
  });

  writer.section(it ? "Punto progetto" : "Project point");
  writer.keyValue(it ? "Coordinate" : "Coordinates", model.project.coordinates);
  writer.keyValue(it ? "Provincia derivata" : "Derived province", model.project.province);
  writer.keyValue(it ? "Codice provincia" : "Province code", model.project.provinceCode);
  writer.keyValue(it ? "Localizzazione verificata" : "Location validated", model.project.validated ? "yes" : "no");
  writer.keyValue(it ? "Generato" : "Generated", model.generatedAt);

  writer.section("Project Bridge Profile v1");
  writer.keyValue(it ? "Modalita" : "Mode", model.projectBridgeProfile.matchingMode);
  writer.keyValue(
    it ? "Campi di matching" : "Matching fields",
    model.projectBridgeProfile.matchFields
      .map((item) => `${item.field}: ${item.value}`)
      .join("; ") || (it ? "nessuno dichiarato" : "none declared")
  );
  writer.keyValue(
    it ? "Campi descrittivi" : "Descriptive fields",
    model.projectBridgeProfile.descriptiveFields
      .map((item) => `${item.field}: ${item.value}`)
      .join("; ") || (it ? "nessuno dichiarato" : "none declared")
  );
  writer.keyValue(
    it ? "Soglie modificate" : "Thresholds modified",
    model.projectBridgeProfile.thresholdsModified ? "yes" : "no"
  );
  writer.line(
    it
      ? "I campi dichiarati non escludono analoghi e non modificano la qualificazione della matrice. I valori mancanti non sono imputati."
      : "Declared fields do not exclude analogues or modify matrix qualification. Missing values are not imputed.",
    { color: [89, 84, 77], size: 8 }
  );

  writer.section(it ? "Esposizione ufficiale al punto" : "Official point exposure");
  model.officialExposure.forEach((item) => {
    writer.line(item.domain, { size: 10, style: "bold", gap: 1 });
    writer.keyValue(it ? "Stato" : "Status", item.status);
    writer.keyValue(it ? "Valore al punto" : "Point value", item.pointValue);
    writer.keyValue(it ? "Classe massima" : "Highest class", item.highestClass);
    writer.keyValue(it ? "Contesto vicino" : "Nearby context", item.nearbyContext);
    writer.keyValue(it ? "Provenienza" : "Provenance", item.provenance);
    writer.line("", { gap: 1 });
  });

  writer.section(it ? "Base evidenziale" : "Evidence basis");
  writer.keyValue(it ? "Stato finale" : "Final status", model.intelligence.status);
  writer.keyValue(it ? "Modalita coorte" : "Cohort mode", model.intelligence.selectionMode);
  writer.keyValue(it ? "Evidenza raw" : "Raw evidence", model.intelligence.rawEvidence);
  writer.keyValue(it ? "Evidenza effective" : "Effective evidence", model.intelligence.effectiveEvidence);
  writer.keyValue(it ? "Episodi indipendenti" : "Independent episodes", model.intelligence.independentEpisodes);
  writer.keyValue("Episode-effective", model.intelligence.episodeEffectiveEvidence);
  writer.keyValue(it ? "Analoghi recuperati" : "Retrieved analogues", model.intelligence.analogueCount);
  writer.keyValue(it ? "Copertura firme" : "Signature coverage", `${model.intelligence.signatureCoveragePercent}%`);
  writer.line(model.narrative.cohort, { color: [89, 84, 77], size: 8.5, gap: 2 });
  writer.line(model.narrative.retrievalRobustness, { color: [89, 84, 77], size: 8.5 });

  writer.section("Failure Learning Matrix v1");
  writer.keyValue(it ? "Stato matrice" : "Matrix status", model.failureLearning.status);
  writer.keyValue(it ? "Versione" : "Version", model.failureLearning.version);
  writer.keyValue(
    it ? "Priorita qualificate" : "Qualified priorities",
    model.failureLearning.qualifiedPriorityCount
  );
  writer.keyValue(
    it ? "Coorte fissata prima degli esiti" : "Cohort fixed before outcomes",
    model.failureLearning.cohortFixedBeforeOutcomeRead ? "yes" : "no"
  );
  writer.keyValue(
    it ? "Geometria usata per qualificare" : "Geometry used for qualification",
    model.failureLearning.geometryUsedForQualification ? "yes" : "no"
  );

  if (!model.failureLearning.rows.length) {
    writer.line(it ? "MATRICE IN ASTENSIONE" : "MATRIX ABSTAINED", {
      color: [154, 55, 44],
      size: 11,
      style: "bold",
    });
    writer.keyValue(
      it ? "Motivi" : "Reasons",
      model.failureLearning.abstentionReasons.join("; ") || "insufficient support"
    );
  } else {
    model.failureLearning.rows.forEach((row, index) => {
      writer.line(`${index + 1}. ${row.process} - ${row.learningStatus}`, {
        size: 9.5,
        style: "bold",
        gap: 1,
      });
      writer.line(row.learningStatement, { size: 8.3, gap: 1 });
      writer.keyValue(
        it ? "Evidenza" : "Evidence",
        `${row.evidence.rawCount} raw / ${row.evidence.effectiveEvidence} effective / ${row.evidence.episodeCount} episodes / ${row.evidence.episodeEffectiveEvidence} episode-effective`
      );
      writer.keyValue(
        it ? "Componenti osservati" : "Observed components",
        row.components
          .slice(0, 3)
          .map((component) => `${component.name} (${component.rawCount})`)
          .join(", ") || "none resolved"
      );
      writer.line(
        `${it ? "Domanda d'indagine" : "Investigation question"}: ${row.investigationQuestion}`,
        { size: 8.3, gap: 1 }
      );
      if (row.investigationPriority) {
        writer.line(
          `${it ? "Priorita sostenuta" : "Supported priority"}: ${row.investigationPriority}`,
          { color: [166, 107, 29], size: 8.5, style: "bold", gap: 1 }
        );
      }
      if (row.geometry.eventCount) {
        writer.line(
          `${it ? "Geometria descrittiva" : "Descriptive geometry"}: ${row.geometry.eventCount} ${it ? "casi" : "cases"}; ${it ? "lunghezza mediana" : "median length"} ${row.geometry.medianLengthM ?? "-"} m; ${it ? "pile in alveo" : "piers in active riverbed"} ${row.geometry.pierTrueCount}/${row.geometry.pierAvailableCount}. ${it ? "Non usata per selezione o qualificazione." : "Not used for selection or qualification."}`,
          { color: [89, 84, 77], size: 7.8, gap: 2 }
        );
      }
    });
  }
  if (model.failureLearning.genericInvestigationPriority) {
    writer.keyValue(
      it ? "Priorita generica" : "Generic priority",
      model.failureLearning.genericInvestigationPriority
    );
  }
  writer.line(model.failureLearning.caveat, {
    color: [89, 84, 77],
    size: 8,
  });

  writer.section(it ? "Lezioni e priorita d'indagine" : "Lessons and investigation priorities");
  if (!model.strategies.length) {
    writer.line(it ? "ASTENSIONE - ZERO STRATEGIE" : "ABSTAINED - ZERO STRATEGIES", {
      color: [154, 55, 44],
      size: 12,
      style: "bold",
    });
    writer.line(model.narrative.outcome, { size: 9 });
    writer.keyValue(
      it ? "Motivi" : "Reasons",
      model.intelligence.abstentionReasons.join("; ") || "insufficient support"
    );
  } else {
    model.strategies.forEach((strategy, index) => {
      writer.line(`${index + 1}. ${strategy.priority}`, {
        color: [47, 45, 42],
        size: 11,
        style: "bold",
        gap: 2,
      });
      writer.keyValue(it ? "Processo" : "Process", strategy.process);
      writer.line(strategy.purpose, { size: 8.5, gap: 1 });
      writer.keyValue(it ? "Tema di controllo" : "Risk-control theme", strategy.riskControlTheme);
      writer.keyValue(it ? "Monitoraggio" : "Monitoring", strategy.monitoring);
      writer.keyValue(
        it ? "Evidenza" : "Evidence",
        `${strategy.rawEvidence} raw / ${strategy.effectiveEvidence} effective / ${strategy.independentEpisodes} episodes`
      );
      writer.keyValue(
        it ? "Validazione esterna richiesta" : "External validation required",
        strategy.externalValidationRequired ? "yes" : "no"
      );
      writer.line("", { gap: 1 });
    });
  }

  writer.section(it ? "Collassi comparabili" : "Comparable collapses");
  if (!model.analogues.length) {
    writer.line(it ? "Nessun analogo recuperato." : "No analogue retrieved.");
  } else {
    model.analogues.forEach((analogue) => {
      writer.line(
        `#${analogue.rank || "-"} ${analogue.eventId} - ${analogue.municipality}, ${analogue.province}`,
        { size: 9, style: "bold", gap: 1 }
      );
      writer.line(
        `${it ? "Classe idraulica attuale" : "Current hydraulic class"}: ${analogue.hydraulicClass}; ${it ? "corrispondenze profilo" : "profile matches"}: ${analogue.profileExactMatches}/${analogue.profileComparedFields}; ${it ? "fonti" : "sources"}: ${analogue.sourceCount}`,
        { color: [89, 84, 77], size: 8, gap: 2 }
      );
    });
  }

  writer.section(it ? "Supporto per dominio" : "Domain support");
  model.domainSupport.forEach((support) => {
    writer.line(`${support.domain}: ${support.status}`, { size: 9, style: "bold", gap: 1 });
    writer.line(support.reasons.join("; ") || "no additional reason", {
      color: [89, 84, 77],
      size: 8,
    });
  });

  writer.section(it ? "Fonti degli analoghi" : "Analogue sources");
  if (!model.sources.length) {
    writer.line(it ? "Nessuna fonte aggiuntiva inclusa." : "No additional source included.");
  } else {
    model.sources.slice(0, 40).forEach((source) => {
      writer.line(`${source.eventId} - ${source.title}`, { size: 8, style: "bold", gap: 0.8 });
      writer.line(`${source.role}${source.url ? ` - ${source.url}` : ""}`, {
        color: [89, 84, 77],
        size: 7,
        gap: 1.5,
      });
    });
  }

  writer.section(it ? "Limiti e avvertenze" : "Limitations and warnings");
  model.warnings.forEach((warning) => {
    writer.line(`- ${warning}`, { size: 8.5, indent: 2 });
  });
  writer.line(model.narrative.provenance, { color: [89, 84, 77], size: 8 });
  writer.line(model.narrative.registryQuality, { color: [89, 84, 77], size: 8 });

  const pageCount = pdf.getNumberOfPages();
  for (let page = 1; page <= pageCount; page += 1) {
    pdf.setPage(page);
    pdf.setDrawColor(190, 184, 175);
    pdf.line(16, writer.pageHeight - 12, writer.pageWidth - 16, writer.pageHeight - 12);
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(7);
    pdf.setTextColor(100, 96, 90);
    pdf.text("ARCUS Collapse Intelligence - non-prescriptive evidence package", 16, writer.pageHeight - 7);
    pdf.text(`${page}/${pageCount}`, writer.pageWidth - 23, writer.pageHeight - 7);
  }

  const province = model.project.province
    .toLowerCase()
    .replaceAll(/[^a-z0-9]+/g, "-")
    .replaceAll(/^-|-$/g, "") || "project-point";
  pdf.save(`arcus-collapse-intelligence-${province}.pdf`);
}
