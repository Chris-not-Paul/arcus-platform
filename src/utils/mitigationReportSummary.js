function numericEvidence(value) {
  const number = Number(value);

  return Number.isFinite(number) ? number : 0;
}

function displayReason(value) {
  return String(value || "")
    .replaceAll("_", " ")
    .trim();
}

export function buildMitigationReportSummary(
  intelligence,
  { language = "en" } = {}
) {
  const it = language === "it";
  const status = String(intelligence?.status || "not_available");
  const evidence = intelligence?.evidence_cohort || {};
  const rawEvidence = numericEvidence(evidence.event_count);
  const effectiveEvidence = numericEvidence(
    evidence.effective_evidence_count
  );
  const strategies = (intelligence?.strategies || [])
    .map((strategy) =>
      strategy?.investigation_priority?.[language] ||
      strategy?.investigation_priority?.en ||
      strategy?.strategy_id
    )
    .filter(Boolean);
  const abstentionReasons = (intelligence?.abstention_reasons || [])
    .map(displayReason)
    .filter(Boolean);
  const hydraulicCompleteness =
    intelligence?.source_completeness?.hydraulic || {};
  const failedLayers = (hydraulicCompleteness.failed_layers || [])
    .map((layer) => layer?.class_name || layer?.className)
    .filter(Boolean);
  const assessmentComplete =
    hydraulicCompleteness.assessment_complete !== false;
  const observationMode =
    hydraulicCompleteness.observation_mode || "unavailable";
  const freshnessStatus =
    hydraulicCompleteness.freshness_status || "unavailable";
  const observedAt = hydraulicCompleteness.observed_at || null;
  const analogueRetrieval = evidence.analogue_retrieval || {};
  const nationalReady = analogueRetrieval.production_ready === true;
  const signatureCoverage = Math.round(
    Number(
      analogueRetrieval.hydraulic_signature_coverage_ratio || 0
    ) * 100
  );
  const analogueCount = (analogueRetrieval.analogues || []).length;
  const provenanceText = it
    ? `Provenienza: ${displayReason(observationMode)}; freschezza: ${displayReason(freshnessStatus)}${observedAt ? `; osservato: ${observedAt}` : ""}.`
    : `Provenance: ${displayReason(observationMode)}; freshness: ${displayReason(freshnessStatus)}${observedAt ? `; observed: ${observedAt}` : ""}.`;

  return {
    status,
    cohortText: nationalReady
      ? it
        ? `Coorte: ${analogueCount} analoghi nazionali selezionati tramite la firma ufficiale attuale; la provincia resta contesto locale. Cause e processi sono letti dopo il retrieval.`
        : `Cohort: ${analogueCount} national analogues selected by current official signature; the province remains local context. Causes and processes are read after retrieval.`
      : it
        ? `Coorte: fallback provinciale controllato; copertura delle firme idrauliche nazionali ${signatureCoverage}% (minimo operativo 80%).`
        : `Cohort: controlled provincial fallback; national hydraulic-signature coverage ${signatureCoverage}% (80% operational minimum).`,
    evidenceText: it
      ? `Evidenza raw: ${rawEvidence}; evidenza effective: ${effectiveEvidence}.`
      : `Raw evidence: ${rawEvidence}; effective evidence: ${effectiveEvidence}.`,
    outcomeText: strategies.length
      ? it
        ? `Strategie: ${strategies.join("; ")}.`
        : `Strategies: ${strategies.join("; ")}.`
      : status === "abstained"
        ? it
          ? `Astensione: ${abstentionReasons.join("; ") || "supporto insufficiente"}; zero strategie.`
          : `Abstention: ${abstentionReasons.join("; ") || "insufficient support"}; zero strategies.`
        : it
          ? "Strategie: nessuna."
          : "Strategies: none.",
    sourceText: assessmentComplete
      ? it
        ? `Copertura ISPRA: completa. ${provenanceText}`
        : `ISPRA coverage: complete. ${provenanceText}`
      : it
        ? `Copertura ISPRA: parziale; layer non completati: ${failedLayers.join(", ") || "non specificati"}. ${provenanceText}`
        : `ISPRA coverage: partial; incomplete layers: ${failedLayers.join(", ") || "not specified"}. ${provenanceText}`,
    warningText: it
      ? "Output non prescrittivo: le strategie non modificano il Final Priority Index e richiedono la validazione di professionisti qualificati."
      : "Non-prescriptive output: strategies do not modify the Final Priority Index and require validation by qualified professionals.",
  };
}
