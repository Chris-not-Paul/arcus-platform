# ARCUS Mitigation Intelligence v3

Status: implemented and deterministically validated with explicit scientific
limitations.

Engine version: `arcus-mitigation-intelligence-v3`.

## Purpose

Version 3 preserves the national current-hazard analogue retrieval introduced
in v2 and adds an independence control for hydraulic collapse evidence. Its
purpose is to avoid treating several bridges damaged or collapsed during the
same flood as independent repetitions of a failure process.

This engine produces investigation priorities only. It does not estimate
collapse probability, classify an asset as safe or unsafe, prescribe a design
solution, create a normalized mitigation score, or contribute to the Final
Priority Index or Path 02.

## Hydraulic episode registry v2

The registry groups hydraulic collapse records through deterministic connected
components and exposes the basis of every assignment:

- an authenticated `hydraulic_episode_id` (or the compatible nested alias)
  overrides the fallback rule;
- shared event-specific documentary sources identify source-linked groupings,
  while scientific/journal bibliography is excluded from linkage;

- records on the same calendar date belong to one national episode;
- records no more than 48 hours apart in the same normalized region belong to
  one episode;
- transitive links remain in the same component;
- an undated record remains in raw/event-effective evidence but is excluded
  from independent-episode support.

Curated IDs can merge records across dates and can keep records with the same
date in separate episodes. The same-date national rule is deliberately
conservative because a date alone
cannot prove that two records arose from independent storms. The registry is an
independence control, not a meteorological reanalysis and not proof of common
causation. Each episode exposes `confidence`, `grouping_basis`,
`review_status`, `source_linkage` and `independence_eligible`. These fields are
also propagated to the API strategy evidence, UI and reports.

The 2026-08-03 national audit registers all 211 hydraulic records exactly once:
98 eligible episodes, 74 dated singletons and 24 multi-bridge episodes. Thirteen
episodes have shared-source support; five same-region inferred groups have
review recommended and six cross-region inferred groups require review. No
human-curated episode override is currently present in the production dataset.

## Evidence accounting

ARCUS continues to expose event-level values:

- raw cases;
- event-effective evidence with weights `documented = 1`, `probable = 0.5`,
  `needs_review/unspecified = 0`.

It now also exposes:

- independent episode count;
- supported episode count;
- episode-effective evidence;
- episode IDs and the contributing event IDs.

For each failure process, the contribution of one episode is capped at the
largest event-level evidence weight observed for that process in the episode.
Ten bridge collapses from the same documented flood can therefore contribute at
most one episode-effective unit to that process.

## Decision thresholds

| Decision | Event basis | Independent-episode basis | Output |
|---|---|---|---|
| Process-specific strategy | raw `>= 3`, event-effective `>= 2` | episodes `>= 5`, episode-effective `>= 4` | `available` |
| Generic usable cohort | event-effective `>= 2` | supported episodes `>= 2`, episode-effective `>= 2` | `limited_evidence` |
| Insufficient independent support | any | below generic basis | `abstained` |

The process-specific threshold includes one fully weighted episode of margin
above the former repeatability basis. A process shown as `available` is thus not
supported only by the minimum three repetitions. Process ranking still follows
evidence strength, episode-effective support, event-effective support, raw
count and the deterministic process name tie-breaker.

For a national cohort, passing the evidence threshold in the baseline top-20
window is necessary but not sufficient. The same process must qualify in at
least two of the nested top-15, top-20 and top-25 windows. This consensus gate
does not change any evidence weight or process threshold; it prevents a
strategy from being created only because of one arbitrary top-k boundary. The
API exposes every provisional window result and the final process consensus.

## Sensitivity audit

Run:

```powershell
npm run analyze:mitigation-episodes
```

The audit uses three deterministic current-signature archetypes. They are not
new live ISPRA point observations. Every selected hydraulic case is removed in
turn while the current-hazard signature remains in the retrieval database. The
retrieved analogue order must remain unchanged, proving that collapse outcomes
do not leak into cohort selection.

Latest 263-record audit:

| Archetype | Hydraulic cases | Independent episodes | Episode-effective | Status | Strategies | Retrieval/status/strategy stability |
|---|---:|---:|---:|---|---|---:|
| P1 | 10 | 9 | 7.5 | `limited_evidence` | generic investigation | 100% / 100% / 100% |
| P2 | 14 | 12 | 10 | `available` | scour | 100% / 100% / 100% |
| P3 | 19 | 12 | 10 | `available` | scour | 100% / 100% / 100% |

The result is intentionally narrower than the pre-sensitivity output. P1 has
substantial overall evidence but no individual process reaches robust repeated
episode support. P2 and P3 retain scour; weaker bank-erosion and overtopping
signals remain visible in the evidence distribution but do not become automatic
process-specific priorities.

The expanded stress audit found that the provisional top-k result changes at
one boundary for P1 and P2. The new 15/20/25 consensus resolves that algorithmic
sensitivity: P1 has scour support in only one window and remains generic; P2
has scour support in two windows; P3 has scour support in all three. PGA
perturbations of `+/-0.02 g` and a landslide-context perturbation preserve P1
and P2 decisions. P3 changes under the `+0.02 g` scenario because the hazard
signature retrieves a materially different cohort (Jaccard 0.176); this is
reported as genuine input sensitivity, not hidden or treated as numerical
noise.

## UI and report contract

Professional Path 01 and its report display event-level and episode-level
evidence separately. A strategy shows cases, independent episodes and
episode-effective support, episode provenance and its 15/20/25 retrieval-window
support. The report repeats status, strategies or abstention,
the non-prescriptive warning and the statement that Mitigation Intelligence
does not modify the Final Priority Index.

## Residual limitations

- Eleven inferred multi-record groups remain in the explicit editorial review
  queue; no authenticated national meteorological event identifier is yet
  stored on every record.
- Current ISPRA/INGV signatures support present-day analogue comparison and do
  not reconstruct the class or loading at the collapse date.
- No authenticated historical-at-event hazard class is currently registered.
- The production strategy slice remains hydraulic-only. Landslide and seismic
  are retrieval context, not independent mitigation strategy generators.
- Leave-one-out stability reduces single-record sensitivity but cannot validate
  causal transportability to a specific bridge or replace site investigation.
