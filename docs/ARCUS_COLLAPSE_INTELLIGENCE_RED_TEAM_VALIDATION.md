# ARCUS Collapse Intelligence Red-Team Validation

Date: 2026-07-17

Scope: independent adversarial validation of the current ARCUS Collapse Intelligence Workbench implementation in the current branch.

Private machine-readable output: `private-data/professional/collapse-intelligence/collapse-intelligence-red-team-validation.json`.

This validation does not modify UI, Final Priority Index, Path 02, official providers, report graphics, production JSON, or scoring formulas.

## 1. Original Metrics

The existing workbench reports:

| Validation | Total | Evaluated | Abstained | Top-1 | Top-3 |
| --- | ---: | ---: | ---: | ---: | ---: |
| Leave-one-out | 253 | 253 | 0 | 0.822 | 0.874 |
| Temporal holdout 2018 | 77 | 73 | 4 | 1.000 | 1.000 |
| Geographical holdout | 80 | 80 | 0 | 1.000 | 1.000 |

The original metrics are retrospective pattern-retrieval metrics, not collapse prediction accuracy.

## 2. Reproduced Metrics

The red-team implementation recomputes metrics from raw events using fold-specific candidate sets and explicit denominators.

| Metric | Value |
| --- | ---: |
| Total cases | 253 |
| Excluded cases | 3 |
| Exclusion reason | unknown_or_unspecified_cause |
| Eligible cases | 250 |
| Evaluated cases | 250 |
| Abstained cases | 0 |
| Top-1 hits | 202 |
| Top-1 evaluated | 0.808 |
| Top-1 all eligible | 0.808 |
| Top-3 hits | 228 |
| Top-3 evaluated | 0.912 |
| Top-3 all eligible | 0.912 |
| Bootstrap CI, top-1 | 0.752-0.860 |

Reproducibility decision: the original aggregate top-1 value is not reproduced exactly. The reproduced top-1 equals the majority-class baseline, so the original aggregate metric is not sufficient evidence of model value.

## 3. Class Distribution

| Class | Support |
| --- | ---: |
| hydraulic | 202 |
| impact | 11 |
| design_construction | 12 |
| seismic | 3 |
| deterioration_maintenance | 12 |
| landslide_ground_movement | 6 |
| overload | 4 |
| unknown_unspecified | 3 |

Number of mapped classes: 8.

Majority class: `hydraulic`, 202 / 253 = 0.7984 of all records and 202 / 250 = 0.808 of eligible records.

Classes with low support:

- Less than 3 cases: 0.
- Less than 5 cases: 3.
- Less than 10 cases: 4.
- Unspecified cases: 3.
- Multiple-cause cases: 0 in the current mapping.

Top-3 remains formally discriminative because there are more than three mapped classes, but it is heavily affected by class imbalance.

## 4. Baselines

| Model | Top1 all | Top1 eval | Macro F1 | Balanced |
| --- | ---: | ---: | ---: | ---: |
| majority_class | 0.808 | 0.808 | 0.1117 | 0.125 |
| stratified_random | 0.764 | 0.764 | 0.137 | 0.1387 |
| province_majority | 0.752 | 0.752 | 0.2577 | 0.2717 |
| region_majority | 0.812 | 0.812 | 0.1562 | 0.1579 |
| project_feature | 0.808 | 0.808 | 0.112 | 0.125 |
| hci_only | 0.752 | 0.752 | 0.2577 | 0.2717 |

The full red-team method does not outperform the majority-class baseline on top-1 all-eligible accuracy.

## 5. Confusion Matrix And Class Metrics

The full method predicts the hydraulic majority class for every evaluated case.

| Actual class | Predicted hydraulic |
| --- | ---: |
| design_construction | 12 |
| deterioration_maintenance | 12 |
| hydraulic | 202 |
| impact | 11 |
| landslide_ground_movement | 6 |
| overload | 4 |
| seismic | 3 |

| Metric | Value |
| --- | ---: |
| Macro-F1 | 0.1117 |
| Weighted-F1 | 0.7222 |
| Balanced accuracy | 0.125 |
| Matthews correlation coefficient | null |

Per-class result: hydraulic has recall 1.0 and F1 0.8938; every other class has recall 0 and F1 0.

## 6. Leakage Audit

Allowed matching features are limited to:

- `bridge_crossing_type`
- `destination_use`
- `material_type`
- `structural_type`
- `province`, only outside province holdout and with low weight
- `region`, only outside region holdout and with low weight

Blocked features include:

- `cause_category`
- `specific_cause`
- `triggered`
- `failure_mechanism`
- `failed_component`
- `collapse_severity`
- `victims`
- `injuries`
- `description`
- `source_title`
- `source_text`
- `source_keywords`
- `event_id`
- `date`
- `bridge_name`
- `bridge_crossing_name`
- `latitude`
- `longitude`
- `waterway`

No direct use of narrative or outcome fields is present in the red-team matcher. Remaining risk is indirect: geography and project fields can still encode class imbalance, but the current failure mode is mainly non-discriminative majority prediction rather than direct target leakage.

## 7. Fold-Specific Recomputations

Leave-one-out:

- Target removed from candidates: yes.
- Target removed from fold statistics: yes.
- Unknown/unspecified classes excluded from evaluation: 3.
- Candidate statistics are recomputed inside each fold.

Temporal holdout:

- Only events at or before the cutoff are used as candidates.
- Future events are excluded from candidate statistics.

Geographical holdout:

- Province feature is disabled for leave-one-province-out.
- Region feature is disabled for leave-one-region-out and macro-area holdouts.

## 8. Ablation

| Model | Coverage | Top1 all | Macro F1 | Balanced | Delta full |
| --- | ---: | ---: | ---: | ---: | ---: |
| hazard_only | 0 | 0 | 0 | 0 | -0.808 |
| project_profile_only | 1 | 0.808 | 0.112 | 0.125 | 0 |
| territorial_context_only | 0.984 | 0.8 | 0.1622 | 0.1612 | -0.008 |
| hazard_project | 1 | 0.808 | 0.112 | 0.125 | 0 |
| hazard_territory | 0.984 | 0.8 | 0.1622 | 0.1612 | -0.008 |
| project_territory | 1 | 0.808 | 0.1117 | 0.125 | 0 |
| full | 1 | 0.808 | 0.1117 | 0.125 | 0 |
| full_without_geography | 1 | 0.808 | 0.1117 | 0.125 | 0 |
| full_without_cause_specific_incidence | 1 | 0.808 | 0.1117 | 0.125 | 0 |
| full_without_mps04 | 1 | 0.808 | 0.1117 | 0.125 | 0 |
| full_without_material | 1 | 0.816 | 0.1507 | 0.1477 | 0.008 |
| full_without_structural_typology | 1 | 0.808 | 0.1117 | 0.125 | 0 |

Hazard-only abstains because official hazard signatures are dry-run/pending for this dataset. The current full method does not show additive discriminative value over simple baselines.

## 9. Randomization Tests

| Test | Top1 all | Macro F1 | Balanced | Note |
| --- | ---: | ---: | ---: | --- |
| cause_specific_incidence_permuted | - | - | - | Cause-specific incidence is not active as production input. |
| coordinate_randomized_within_region | - | - | - | Coordinates are blocked from matching. |
| hazard_signatures_permuted | - | - | - | Hazard signatures are dry-run/pending. |
| project_profile_shuffled | 0.808 | 0.1117 | 0.125 | No degradation. |
| province_shuffled | 0.808 | 0.1117 | 0.125 | No degradation. |
| shuffled_causes | 0.808 | 0.1277 | 0.1429 | No degradation on top-1. |

This is a negative finding. The shuffled-label control should degrade if the matcher were learning a discriminative relationship. The absence of degradation indicates that the aggregate metric is dominated by the hydraulic majority class.

## 10. Duplicate And Near-Duplicate Audit

| Group type | Groups |
| --- | ---: |
| Exact coordinate groups | 0 |
| Same date and locality groups | 19 |
| Same crossing groups | 24 |
| Same source title across multiple events | 35 |

Policy required before production validation: near-duplicate groups must be kept inside the same fold. The red-team output includes sample groups in the private JSON.

## 11. Temporal Holdout

| Cutoff | Training | Validation | Top1 all | Macro F1 | Balanced |
| --- | ---: | ---: | ---: | ---: | ---: |
| 2015 | 149 | 104 | 0.7327 | 0.1057 | 0.125 |
| 2018 | 176 | 77 | 0.7237 | 0.105 | 0.125 |
| 2020 | 204 | 49 | 0.7292 | 0.1054 | 0.125 |

The previously reported perfect temporal holdout is not reproduced in the stricter red-team setup. The temporal result remains consistent with hydraulic-majority behavior rather than robust multi-class discrimination.

## 12. Geographical Holdout

Macro-area holdout:

| Area | Eligible | Top1 all | Macro F1 | Balanced |
| --- | ---: | ---: | ---: | ---: |
| Centro | 40 | 0.75 | 0.1071 | 0.125 |
| Isole | 30 | 0.7 | 0.1029 | 0.125 |
| Nord | 138 | 0.8478 | 0.1156 | 0.125 |
| Sud | 42 | 0.8095 | 0.1118 | 0.125 |

Region holdout:

| Region | Eligible | Top1 all | Macro F1 | Balanced |
| --- | ---: | ---: | ---: | ---: |
| Abruzzo | 9 | 0.4444 | 0.0769 | 0.125 |
| Basilicata | 2 | 1 | 0.125 | 0.125 |
| Calabria | 16 | 0.8125 | 0.1121 | 0.125 |
| Campania | 7 | 1 | 0.125 | 0.125 |
| Emilia-Romagna | 20 | 0.8 | 0.1111 | 0.125 |
| Friuli-Venezia Giulia | 4 | 0.75 | 0.1071 | 0.125 |
| Lazio | 5 | 0.2 | 0.0417 | 0.125 |
| Liguria | 18 | 0.7222 | 0.1083 | 0.125 |
| Lombardia | 10 | 0.5 | 0.0833 | 0.125 |
| Marche | 15 | 0.9333 | 0.1207 | 0.125 |
| Molise | 4 | 1 | 0.125 | 0.125 |
| Piemonte | 70 | 0.9429 | 0.1213 | 0.125 |
| Puglia | 4 | 1 | 0.125 | 0.125 |
| Sardegna | 15 | 0.9333 | 0.1207 | 0.125 |
| Sicilia | 15 | 0.4667 | 0.0796 | 0.125 |
| Toscana | 18 | 0.7778 | 0.1094 | 0.125 |
| Trentino-Alto Adige (Trentino-Sudtirol) | 5 | 0.8 | 0.1111 | 0.125 |
| Umbria | 2 | 0.5 | 0.0833 | 0.125 |
| Valle d'Aosta (Valle d'Aoste) | 5 | 1 | 0.125 | 0.125 |
| Veneto | 6 | 0.8333 | 0.1136 | 0.125 |

Province-level holdout is available in the private JSON under `geographical_holdout.by_province`.

## 13. Abstention Policy

| Policy | Coverage | Top1 all | Top1 evaluated | Macro F1 | False-certainty risk |
| --- | ---: | ---: | ---: | ---: | --- |
| permissive | 1 | 0.808 | 0.808 | 0.1117 | high |
| balanced | 1 | 0.808 | 0.808 | 0.1117 | medium |
| conservative | 1 | 0.808 | 0.808 | 0.1117 | lower coverage, lower false certainty |

The abstention policies do not materially change the result because the current similarity setup almost always returns enough candidates.

## 14. Hazard Enrichment Status

| Counter | Value |
| --- | ---: |
| Events eligible for enrichment | 253 |
| Dry-run events | 253 |
| Seismic enriched | 0 |
| Hydraulic enriched live | 0 |
| Landslide enriched live | 0 |
| Fully enriched | 0 |
| Partially enriched | 0 |
| Failed | 0 |
| Pending | 253 |

The dataset must not be described as fully hazard-enriched. The current status is coordinate-valid/dry-run for the collapse intelligence corpus.

## 15. Territorial Reconciliation

Unresolved territorial denominator records: 13.

| Source name | Denominator | Mapping confidence | Required decision |
| --- | ---: | --- | --- |
| Ascoli | null | none | manual territorial governance decision required |
| Bolzano/Bozen | 2595 | none | manual territorial governance decision required |
| Caltanisetta | null | none | manual territorial governance decision required |
| Cesena | null | none | manual territorial governance decision required |
| Forli Cesena | null | none | manual territorial governance decision required |
| Ivrea | null | none | manual territorial governance decision required |
| Monza e Brianza | null | none | manual territorial governance decision required |
| Nord-Est Sardegna | 76 | none | manual territorial governance decision required |
| Olbia | null | none | manual territorial governance decision required |
| Pesaro Urbino | null | none | manual territorial governance decision required |
| Reggio Calabria | 10 | none | manual territorial governance decision required |
| Valle d'Aosta/Vallee d'Aoste | 506 | none | manual territorial governance decision required |
| Verbania | null | none | manual territorial governance decision required |

Current territorial units: 107. Duplicate current units: 0. Missing current units: 13. Estimated unresolved denominator share: 0.0708.

The unresolved denominator records should remain excluded from official percentile governance until a documented crosswalk policy is approved.

## 16. Value-Add Benchmark

| Benchmark | Result |
| --- | --- |
| Public hazard only | Not computable as discriminative matcher because hazard signatures are dry-run/pending. |
| Public hazard + general HCI | Top1 all 0.752, macro-F1 0.2577, balanced accuracy 0.2717. |
| Public hazard + cause-specific HCI | Experimental; not active as validated matcher. |
| ARCUS project-informed analogue model | Top1 all 0.808, macro-F1 0.112, balanced accuracy 0.125. |
| ARCUS full intelligence model | Top1 all 0.808, macro-F1 0.1117, balanced accuracy 0.125. |

Value-add decision: not demonstrated for production. ARCUS has a promising data foundation, but the current analogue metric does not yet show robust discriminative value beyond the hydraulic majority baseline.

## 17. Mitigation Validity

| Check | Result |
| --- | --- |
| Entries | 13 |
| All draft | yes |
| Missing external basis | 13 |
| No validated recommendations | yes |
| Requires external validation | yes |

Mitigation content must remain framed as draft investigation knowledge, not as validated engineering recommendation.

## 18. Criticalities

- The reproduced full method does not exceed the majority-class baseline on all eligible cases.
- Macro-F1 and balanced accuracy show that aggregate accuracy is dominated by the hydraulic majority class.
- Official hazard enrichment is still dry-run/pending for the collapse intelligence dataset.
- Unresolved territorial denominator records remain outside official percentile governance.
- The shuffled-label control does not degrade as expected; this indicates a non-discriminative majority-class metric.
- Hazard-only ablation abstains because hazard signatures are not live-enriched.

## 19. Final Decision

Decision: `promising but validation incomplete`.

ARCUS Collapse Intelligence is credible as a research/prototype workbench and as a structured evidence base. It is not production-ready as a validated predictive or discriminative intelligence model. Before stronger claims, it needs live hazard enrichment, fold-level group holdout governance, documented territorial reconciliation, and a matcher that improves macro-F1 and balanced accuracy beyond simple baselines.
