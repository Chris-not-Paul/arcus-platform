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
  const episodeCount = numericEvidence(evidence.episode_count);
  const episodeEffectiveEvidence = numericEvidence(
    evidence.episode_effective_evidence_count
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
  const pointIntersectionRequired =
    analogueRetrieval.reason ===
    "official_hydraulic_point_intersection_required";
  const signatureCoverage = Math.round(
    Number(
      analogueRetrieval.hydraulic_signature_coverage_ratio || 0
    ) * 100
  );
  const analogueCount = (analogueRetrieval.analogues || []).length;
  const registryQuality = evidence.episode_registry_quality || {};
  const sourceLinkedEpisodes = numericEvidence(
    registryQuality.source_linked_episode_count
  );
  const curatedEpisodes = numericEvidence(
    registryQuality.curated_episode_count
  );
  const reviewRequiredEpisodes = numericEvidence(
    registryQuality.review_required_episode_count
  );
  const reviewRecommendedEpisodes = numericEvidence(
    registryQuality.review_recommended_episode_count
  );
  const retrievalRobustness = evidence.retrieval_robustness || {};
  const consensusProcesses = (retrievalRobustness.process_support || [])
    .filter((process) => process.consensus_reached)
    .map((process) =>
      `${displayReason(process.process)} (${process.qualifying_window_count}/${(retrievalRobustness.windows || []).length})`
    );
  const provenanceText = it
    ? `Provenienza: ${displayReason(observationMode)}; freschezza: ${displayReason(freshnessStatus)}${observedAt ? `; osservato: ${observedAt}` : ""}.`
    : `Provenance: ${displayReason(observationMode)}; freshness: ${displayReason(freshnessStatus)}${observedAt ? `; observed: ${observedAt}` : ""}.`;

  return {
    status,
    cohortText: nationalReady
      ? it
        ? `Coorte: ${analogueCount} analoghi nazionali selezionati tramite la firma ufficiale attuale; la provincia resta contesto locale. Cause e processi sono letti dopo il retrieval.`
        : `Cohort: ${analogueCount} national analogues selected by current official signature; the province remains local context. Causes and processes are read after retrieval.`
      : pointIntersectionRequired
        ? it
          ? "Coorte: nessun retrieval nazionale attivato, perche il punto non interseca una classe idraulica ufficiale. I casi provinciali restano solo contesto storico territoriale."
          : "Cohort: national retrieval was not activated because the point does not intersect an official hydraulic class. Provincial cases remain territorial historical context only."
      : it
        ? `Coorte: fallback provinciale controllato; copertura delle firme idrauliche nazionali ${signatureCoverage}% (minimo operativo 80%).`
        : `Cohort: controlled provincial fallback; national hydraulic-signature coverage ${signatureCoverage}% (80% operational minimum).`,
    evidenceText: it
      ? `Evidenza raw: ${rawEvidence}; evidenza effective: ${effectiveEvidence}; episodi idraulici indipendenti: ${episodeCount}; evidenza episode-effective: ${episodeEffectiveEvidence}.`
      : `Raw evidence: ${rawEvidence}; effective evidence: ${effectiveEvidence}; independent hydraulic episodes: ${episodeCount}; episode-effective evidence: ${episodeEffectiveEvidence}.`,
    registryQualityText: it
      ? `Qualita del registro episodi nella coorte: ${curatedEpisodes} assegnati con override curato; ${sourceLinkedEpisodes} supportati da fonti condivise; ${reviewRequiredEpisodes} da revisionare; ${reviewRecommendedEpisodes} con revisione raccomandata.`
      : `Episode-registry quality in the cohort: ${curatedEpisodes} assigned by curated override; ${sourceLinkedEpisodes} supported by shared sources; ${reviewRequiredEpisodes} requiring review; ${reviewRecommendedEpisodes} with review recommended.`,
    retrievalRobustnessText: retrievalRobustness.applied
      ? it
        ? `Robustezza retrieval 15/20/25: consenso specifico ${consensusProcesses.join(", ") || "nessuno"}; sono richieste almeno ${retrievalRobustness.minimum_supporting_windows || 2} finestre.`
        : `Retrieval robustness 15/20/25: process consensus ${consensusProcesses.join(", ") || "none"}; at least ${retrievalRobustness.minimum_supporting_windows || 2} windows are required.`
      : pointIntersectionRequired
        ? it
          ? "Robustezza retrieval: non applicabile, perche non e stata attivata alcuna coorte senza intersezione idraulica del punto."
          : "Retrieval robustness: not applicable because no cohort was activated without a point-level hydraulic intersection."
      : it
        ? "Robustezza retrieval: non applicabile al fallback provinciale."
        : "Retrieval robustness: not applicable to the provincial fallback.",
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
