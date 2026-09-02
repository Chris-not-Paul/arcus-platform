# ARCUS Product Definition

## Decision baseline

**Canonical product name:** ARCUS Collapse Intelligence — Lessons from Failures

**Product thesis:** transform the proprietary Italian bridge-collapse database from a static archive into a traceable learning system that helps qualified professionals decide what to investigate, monitor and challenge.

This document supersedes previous product definitions based on Path 01, Path 02, provincial rankings, asset ranking, Infrastructure/Final Priority Indexes and BMS-like portfolio management.

## Product identity

ARCUS is an evidence infrastructure for learning from documented bridge failures.

Its defensible advantage is not a generic score. It is the combination of:

- a uniquely rich, georeferenced Italian bridge-collapse database;
- event-level documentary sources and technical classifications;
- explicit evidence quality and uncertainty;
- official point exposure from ISPRA and INGV;
- transparent retrieval of comparable failures;
- source-linked lessons and investigation priorities;
- explicit abstention when the evidence does not support a conclusion.

ARCUS supports professional judgement. It does not replace it.

## Product surfaces

### ARCUS Atlas

The public evidence layer remains available to:

- explore georeferenced collapse events;
- inspect event records and sources;
- understand the taxonomy and methodology;
- communicate the value and coverage of the database;
- build trust through transparent evidence.

### ARCUS Professional

Professional has one workflow only: **Collapse Intelligence — Lessons from Failures**.

The user selects a project point. ARCUS then:

1. derives the location and province from the point;
2. queries official hydraulic, landslide and seismic exposure;
3. keeps point exposure separate from nearby and provincial context;
4. retrieves comparable collapse cases on a declared basis;
5. measures raw, effective and episode-effective evidence;
6. exposes analogue cases and evidence limitations;
7. returns supported investigation priorities and risk-control themes, or abstains;
8. produces a traceable, non-prescriptive evidence package.

## Core professional question

> Given the verified official exposure and context of a selected project point, what lessons and investigation priorities are supported by documented bridge failures, and where must ARCUS abstain?

ARCUS does not answer:

- whether the selected bridge is safe or unsafe;
- the probability that it will collapse;
- which asset in a portfolio must receive funding first;
- which retrofit or design solution must be adopted automatically;
- whether no official point intersection means no real-world hazard.

## Evidence model

### 1. Project point

The point is the authoritative spatial input. Province and municipality must be derived from it. A preliminary client selection must never override the derived location.

### 2. Official exposure

Hydraulic, landslide and seismic observations remain separate:

- ISPRA hydraulic classes describe official intersection at the point;
- ISPRA PAI classes and attention areas describe landslide context at the point;
- INGV MPS04 PGA is a regulatory/reference hazard value, not collapse probability;
- nearby official context is informative but is never assigned to the point;
- service unavailability is never converted into zero risk.

### 3. Analogue retrieval

Comparable collapses may be retrieved nationally when the declared signature and coverage contract permit it. Retrieval is based on information available for comparison and must disclose that:

- current official hazard signatures do not reconstruct historical hazard automatically;
- similarity does not prove causation;
- causes and processes are interpreted only after the cohort is fixed;
- repeated records from the same episode must not inflate independent evidence;
- retrieval windows and sensitivity must remain auditable.

### 4. Evidence strength

ARCUS distinguishes:

- raw cases;
- evidence-weighted cases;
- independent episodes;
- episode-effective evidence;
- source-linked and curated episode assignments;
- records requiring review.

Sparse records are not discarded and are not enriched with invented facts. They are used according to an evidence role:

- **Learning-grade:** sufficiently documented for process-specific lessons;
- **Context-grade:** useful for broader patterns or generic investigation themes;
- **Record-grade:** retained as part of the historical archive but not used to generate a lesson.

### 5. Output contract

Each supported lesson must expose:

- investigation priority;
- failure process or evidence basis;
- purpose;
- risk-control theme;
- monitoring consideration;
- raw and effective evidence;
- independent episodes;
- analogue cases;
- applicability conditions;
- external validation requirement;
- source and provenance limits.

If the contract is not met, ARCUS returns explicit abstention and zero strategies.

## Domain readiness

### Hydraulic

Hydraulic Collapse Intelligence is the first operational domain because the current database supports the strongest evidence base. It can return process-specific priorities, a controlled generic fallback or abstention according to the documented thresholds.

### Landslide

Official ISPRA PAI exposure remains operational. Collapse-learned landslide strategies remain abstained until the independent, adequately documented event base satisfies the support contract.

### Seismic

Official INGV MPS04 exposure remains operational. Collapse-learned seismic strategies remain abstained while the few registered cases belong to an insufficient number of independent earthquake episodes.

Abstention is a product feature: it prevents false certainty.

## Global IABSE database

The global IABSE bridge-collapse database may later support:

- external validation of Italian lessons;
- discovery of rare mechanisms absent from the Italian record;
- sensitivity analysis across different infrastructure and governance contexts;
- a clearly labelled international reference cohort.

It must remain logically and legally separate unless permissions, governance, taxonomy mapping and provenance allow its use. It must never be silently pooled with the proprietary ARCUS Italian evidence base.

## Explicitly retired from the product

The following are outside the canonical ARCUS product and must not appear in the active Professional UI, client reports or product claims:

- Path 01 and Path 02 as client-facing product names;
- uploaded asset portfolio ranking;
- asset watchlists generated by a synthetic priority score;
- Infrastructure Priority Index;
- Final Priority Index and 70/30 formulas;
- L0–L4 point-screening classes;
- normalized mitigation scores;
- provincial ranking presented as site-specific risk;
- collapse probability;
- safe/unsafe classifications;
- automatic inspection, retrofit or funding prescriptions;
- claims that nearby official context is assigned to the selected point.

Historical implementations may remain temporarily quarantined only to preserve audit history while the new workflow reaches feature parity. They are not active product capabilities and must be deleted once no validated dependency remains.

## Reports and exports

The canonical Professional evidence package must contain:

- project coordinates and point-derived province;
- official provider status and provenance;
- hydraulic, landslide and seismic point results;
- a clear distinction between point intersection and nearby context;
- retrieval basis and signature coverage;
- raw, effective and episode-effective evidence;
- retrieved analogues with event identifiers;
- supported lessons or explicit abstention;
- landslide and seismic support status;
- non-prescriptive warning;
- generation timestamp and release identifiers where available.

The first clean implementation exports this contract as a structured JSON evidence package. A redesigned PDF may be added only from this contract, without reintroducing retired scores or rankings.

## Scientific and communication rules

ARCUS must always:

- lead with evidence rather than numerical theatre;
- distinguish observation, inference and recommendation;
- link important claims to events and sources;
- show uncertainty and missing evidence;
- keep official exposure separate from historical collapse context;
- state when a result relies on current rather than historical hazard signatures;
- abstain when support is insufficient;
- require validation by qualified professionals.

## Current architecture boundary

Active routes:

- `/atlas`: public evidence archive;
- `/professional`: Collapse Intelligence — Lessons from Failures;
- methodology, analytics and publication pages supporting the evidence base.

Removed legacy implementation:

- the former multi-path Professional workspace and Path 01 report-map route have been removed;
- Path 01 priority, screening and calibration utilities have been removed;
- obsolete Path 01 test, audit, validation and export commands have been removed;
- historical methodology documents remain only as superseded audit records and are not product specifications.

## Acceptance criteria for the clean product

The reset is complete when:

1. no active client surface offers Path 02 or synthetic asset ranking;
2. no canonical report contains Final Priority Index or L0–L4 screening;
3. Professional starts directly from a map point;
4. province is derived from the point;
5. official provider status is explicit;
6. analogue retrieval and its limits are visible;
7. supported lessons expose their evidence basis;
8. unsupported domains abstain explicitly;
9. every export is non-prescriptive and source-aware;
10. legacy client code and obsolete tests are absent from the active repository surface.
