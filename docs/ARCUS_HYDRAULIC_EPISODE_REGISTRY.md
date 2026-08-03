# ARCUS Hydraulic Episode Registry

Status: implemented contract `arcus-hydraulic-episode-registry-v2`.

## Purpose

The registry prevents several bridges affected during the same hydraulic event
from being counted as independent repetitions. It is applied only after the
current-hazard analogue cohort is fixed. It does not determine analogue
similarity and does not contribute to the Final Priority Index.

## Assignment precedence

1. `hydraulic_episode_id` or `hydraulic_intelligence.episode_id`: authenticated
   editorial override using `hydraulic:curated:<stable-id>`. Equal IDs merge;
   different IDs remain separate. Invalid or reserved IDs fail validation.
2. Same calendar date: conservative national grouping.
3. Same normalized region within 48 hours: conservative regional grouping.
4. Otherwise: one dated singleton.
5. Undated evidence: retained at event level but excluded from independent
   episode support.

Shared event-specific source URLs or titles do not alter grouping. They provide
auditable support for a group created by the rules. Generic scientific and
journal-paper bibliography is excluded from this linkage test.

## Provenance states

| Confidence | Review status | Meaning |
|---|---|---|
| `curated_episode_assignment` | `curated` | Authenticated event-field override |
| `source_linked_documentation` | `supported_by_shared_sources` | Every event in the group is connected through shared event-specific sources |
| `dated_singleton` | `not_required_singleton` | One dated record; no merge decision |
| `temporal_regional_inference` | `rule_based_review_recommended` | Multi-record same-region fallback without shared-source support |
| `conservative_cross_region_inference` | `review_required` | Same-date cross-region fallback without shared-source support |
| `undated_not_independently_counted` | `date_required` | Event cannot establish independent repetition |

## Production audit

Run:

```powershell
npm run audit:hydraulic-episodes
```

The 2026-08-03 audit reconciles all 211 hydraulic records and reports 98
eligible episodes: 74 dated singletons, 13 source-linked groups, five inferred
same-region groups and six inferred cross-region groups. Eleven groups remain
in the explicit review queue. There are currently no curated overrides in the
production data.

An editor resolving a queued group must record an authenticated episode ID on
every affected event, retain the supporting source in the Professional source
registry and rerun the audit, mitigation tests, sensitivity analysis and full
backend tests. The absence of an override must never be described as verified
meteorological independence.

## Output contract

The API exposes registry quality for the selected cohort, including confidence
and review-status distributions, curated/source-linked counts and review queue
counts. Each process-specific strategy includes the contributing episode IDs,
event IDs, effective weight, confidence, grouping basis and review status. The
UI and Professional report display a compact registry-quality summary.
