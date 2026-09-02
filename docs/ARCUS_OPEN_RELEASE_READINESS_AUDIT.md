# ARCUS Open Release Readiness Audit

Status: `release_candidate_verified_public_deposit_pending`
Audit date: 2026-08-31
Target: public ARCUS Open launch by October 2026

## Objective

Assess whether ARCUS Open can be presented to researchers as a complete,
credible and reproducible scientific product. This audit covers the public
homepage, Atlas, event records, Analytics, Methodology, Publications, Data
Access and the versioned Open release. It does not validate ARCUS Professional.

## Current strengths

- 263 georeferenced events and 712 source records are exposed without an
  account through the immutable `arcus-open-2026.2` release.
- The release includes events, sources, taxonomy, data dictionary, changelog,
  statistics, quality audit, identifier mapping, CSV and GeoJSON.
- Event cards expose the public `ITxx.xx.xx` reference, location, event date,
  severity, consequences, bridge descriptors, curation status, coordinates,
  description and linked sources.
- Atlas filters cover time, cause, severity, trigger, process, component,
  evidence, region, province, structural type and material.
- Public Analytics distinguishes observed database frequencies from collapse
  probabilities.
- Automated Open release, product-scope and lint checks pass at audit baseline.
- No console warnings or errors were observed during the manual browser audit.

## Findings and actions

| Priority | Finding | Risk | Action |
|---|---|---|---|
| P0 | Public CSV and GeoJSON used legacy `Bxx.xx.xx` as `event_id`, while the UI showed `ITxx.xx.xx`. | Citations and joins could use two competing primary identifiers. | **Completed.** `arcus-open-2026.2` uses canonical `ITxx.xx.xx` IDs across events, sources, CSV, GeoJSON and JSON; `B` exists only in the migration mapping. `2026.1` was not overwritten. |
| P0 | The Atlas exposed a legacy Professional mode with vulnerability scores and territorial priority output retired by the canonical product definition. | Reintroduces scientifically unsupported product claims and confuses Open with Professional. | **Completed.** The mode is absent from the active public Atlas surface; Professional remains a separate point-based workflow. |
| P0 | Homepage event links used `?event=<slug>`, but Atlas ignored the parameter. | Public event references were not shareable and homepage map links did not open the intended record. | **Completed.** The slug resolves, focuses the event and opens its evidence card. |
| P0 | Filtering the Atlas to one event could leave the marker under fixed panels or absent from the cluster layer. | A successful search appeared empty. | **Completed.** The cluster is rebuilt for the filtered set; a single result is focused and opened automatically. |
| P1 | Data Access linked only the event CSV and GeoJSON despite claiming sources, taxonomy, audit and complete downloads. | The scientific package was technically available but practically undiscoverable. | **Completed.** Sources, manifest, dictionary, taxonomy, audit, statistics and changelog are directly linked with citation and license scope. |
| P1 | Publications showed only the original Data in Brief paper and did not distinguish it from the evolving ARCUS release. | Users could cite the paper but not the exact data snapshot used. | **Partially completed.** The current versioned release and provisional citation are distinct from the paper; the persistent release DOI remains pending public deposit. |
| P1 | Analytics contained a long two-tier promotional comparison, labelled advanced output as Premium and understated Open downloads. | Contradicted the Open/Research/Professional strategy and diluted scientific content. | **Completed.** Analytics now focuses on descriptive results, limitations, reproducibility and data/methodology links. |
| P1 | The homepage led with operational risk decisions rather than the public research value. | Universities could read ARCUS primarily as consulting software. | **Completed.** The public entry point now leads with the Italian bridge-collapse evidence base, Open Atlas, sources and citable release. |
| P2 | Footer and Data Access navigation were inconsistent across scientific pages. | Provenance and supporting pages were harder to discover. | **Completed.** Scientific pages use the common footer and Data Access is a top-level navigation item. |
| P2 | Several event descriptions and bridge names remain in English while the surrounding UI is Italian. | Bilingual records can appear editorially inconsistent. | Preserve source fidelity for now; later expose record-language metadata and translated editorial abstracts without silently rewriting evidence. |

## Identifier release rule

`arcus-open-2026.1` remains immutable and reproducible. Its identifier schema
was not corrected in place. The October publication candidate is
`arcus-open-2026.2`, which implements these rules:

1. `event_id` is the canonical `ITxx.xx.xx` scientific identifier.
2. `event_slug` is the stable human-readable deep-link key.
3. the old `Bxx.xx.xx` value is absent from the event record or explicitly
   named `legacy_arcus_id` only when migration compatibility is required;
4. `id-mapping.json` documents previous identifiers and release provenance;
5. every source record references the canonical IT identifier;
6. UI, CSV, GeoJSON, JSON and citation examples use the same identifier.

## October minimum release contract

ARCUS Open is ready for public launch only when:

1. the current event release and sources are downloadable without login;
2. a researcher can reach and share a stable event card;
3. the release has a stable citation, license, schema and known limitations;
4. the public identifier is consistent across every format;
5. Atlas search never produces a visually empty single-result state;
6. no retired score, ranking or Professional Atlas mode appears publicly;
7. Analytics claims remain descriptive and expose the sample denominator;
8. methodology and provenance are reachable from every main public surface;
9. the Open release tests, product-scope tests, lint and production build pass;
10. desktop and mobile browser acceptance is complete.

## Manual UI acceptance

Acceptance was repeated on 2026-08-31 against the local application after the
remediation pass.

| Surface | Check | Observed result |
|---|---|---|
| Homepage | Open-first positioning, Atlas/Data calls to action and research boundaries | Coherent on desktop and mobile; no horizontal overflow. |
| Atlas deep link | `/atlas?event=morandi-genoa-2018` | Focused `Ponte Morandi`, opened `IT18.08.01` and exposed its three documented sources. |
| Atlas search | Search for `IT18.08.01` | One event, one visible marker and the matching evidence card opened automatically. |
| Atlas product boundary | Public controls and copy | No legacy Professional Atlas mode or retired territorial score was exposed. |
| Data Access | Release package, citation and rights | CSV, GeoJSON, sources, manifest, dictionary, taxonomy, audit, statistics and changelog were discoverable. |
| Identifier consistency | Active `arcus-open-2026.2` API and Atlas popup | Public records used `ITxx.xx.xx`; no legacy `B` identifier appeared in the UI. |
| Analytics | Public claims and access | No Premium/two-tier promotion; observed frequencies remained explicitly distinct from probabilities. |
| Responsive | Homepage and event deep link at 390 x 844 | No horizontal overflow; the targeted event card remained reachable. |
| Browser diagnostics | Console warnings and errors | None observed. |

Automated verification completed successfully with `test:open-release`,
`test:product-scope`, `test:backend`, `lint`, `build` and `git diff --check`.
The build emitted only non-blocking plugin timing diagnostics;
`git diff --check` emitted existing line-ending notices and no whitespace
errors.

## Publication handoff

The release candidate is generated locally under the ignored `private-data`
tree and selected by `private-data/open/releases/current.json`. It is not a Git
publication mechanism. Public launch therefore requires a controlled deposit
of the generated `arcus-open-2026.2` package in the chosen research repository,
recording the resulting persistent identifier without committing the internal
master workbook.

## Current judgement

`release_candidate_ready_for_public_deposit`

The code, Open UI and schema-v2 release candidate now satisfy the technical
acceptance contract. Public launch still requires the repository deposit and
persistent release citation, plus the owner's final publication and rights
review. These are release-governance tasks rather than evidence-model defects.
