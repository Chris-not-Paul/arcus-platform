# ARCUS Data Access and Release Policy v1

Status: `implemented_in_part_remaining_decisions_under_review`
Scope: ARCUS Open, restricted research access, ARCUS Professional and internal editorial data
Effect of this document: none. It does not authorize publication or change an API boundary.

## Decision objective

ARCUS must make the Italian bridge-collapse archive useful and citable without
giving the Open surface data that are legally uncertain, editorially immature,
client-specific or part of the validated Professional workflow.

The boundary is based on the role and provenance of each datum, not on the idea
that Open is an intentionally incomplete demo. ARCUS Open is a complete research
product within its declared scope. Professional adds point-specific official
exposure, retrieval, evidence synthesis and investigation priorities.

## Governing principles

1. The public scientific identifier is `ITxx.xx.xx`.
2. `Bxx.xx.xx` is a legacy technical identifier only. It may remain in internal
   joins and migration tables but must not be the primary reference shown to a
   user or introduced in a new release schema.
3. `MASTER_RESEARCH.xlsx` remains the internal editorial source of truth and is
   never served directly.
4. Open releases are immutable, versioned and citable.
5. Publication uses explicit allowlists. A new workbook or derived field must
   fail the Open build until it receives a classification.
6. Absence, uncertainty and rejected joins remain explicit. Blank values are
   never converted into negative observations.
7. Raw observations, curatorial inference and calculated output remain
   distinguishable.
8. Third-party data are not relicensed by ARCUS. Their original rights and
   attribution follow the datum or resource.
9. Data are not retained in Professional merely to make Open artificially weak.
   A restriction requires a scientific, legal, contractual, privacy or product
   justification.
10. Retired scores and rankings are quarantined rather than reclassified as
    valuable private features.

## Access classes

### O1 — Open scientific record

Record-level data downloadable without authentication under a versioned release.
They support verification, citation, teaching and independent research.

### O2 — Open aggregate and documentation

Release-level statistics, coverage, quality summaries, methodology and known
limitations. Record-level values may be withheld when they are immature or not
authorized, while aggregate disclosure remains useful and non-misleading.

### R1 — Restricted research

Frozen, purpose-specific datasets shared with named research partners under a
data-use agreement. R1 is not the live master workbook and is not a hidden public
download. Every release has a manifest, permitted purpose, recipient, expiry,
field allowlist and citation requirements.

### P1 — Professional

Authenticated operational data and derived outputs needed to answer a project
question: official point exposure, analogue retrieval, evidence synthesis,
supported investigation priorities or abstention.

### I1 — Internal editorial and evidence vault

Source material, matching details, notes, rejected candidates, previous values,
review queues, customer data, credentials and operational logs. These data are
never exposed through Open or research downloads.

### Q0 — Quarantined or retired

Resources incompatible with the current ARCUS product definition. Q0 is not a
commercial access tier. A resource must be deleted after dependency review or
retained only as an audit artefact outside active APIs and interfaces.

## Master event-field classification

| Field or group | Proposed class | Public representation | Rationale |
|---|---|---|---|
| `event_id` in `ITxx.xx.xx` form | O1 | Canonical `event_id` | Stable scientific citation key. |
| legacy `Bxx.xx.xx` mapping | O2 | Migration table only | Required to resolve citations and old joins; never the main displayed ID. |
| `event_slug` | O1 | Stable public slug | Supports permanent event pages and shareable URLs. |
| `date` | O1 | ISO date plus localized display | Core event fact. |
| municipality, province, region | O1 | Normalized territorial fields | Required for discovery and verification. |
| province code/key/raw/status | O1 | Normalized value plus validation status | Makes territorial normalization auditable. |
| latitude, longitude, `exact_location` | O1 | WGS84 and precision flag | Core Atlas function; precision is never implied when unavailable. |
| bridge name and crossing name/type | O1 | Event record | Core bridge identity and context. |
| destination/use | O1 | Event record | Descriptive infrastructure context. |
| structural type and material | O1 | Event record | Core research variables. |
| construction year/raw/numeric | O1 | Source value and normalized value | Preserve source fidelity and machine use. |
| collapse severity | O1 | Total/partial plus canonical code | Observed historical outcome. |
| victims and injuries | O1 | Integer counts with source caveat | Publicly documented event consequence. |
| triggered and cause family/category | O1 | Canonical taxonomy value | Core classification. |
| specific cause | O1 | Canonical taxonomy value | Core classification, not a risk prediction. |
| event description | O1 | Source-linked narrative | Essential research context; editorial synthesis must remain attributable. |
| source confidence | O1 | Declared class and method link | Useful only when the grading rule is public. |
| curation level | O1 | Declared editorial status | Distinguishes depth of review without implying truth certainty. |
| hydraulic trigger/process/component/evidence | O1 | One canonical historical-outcome object | Already source-backed and valuable for learning from failures. It remains post-event evidence, never a probability. |
| duplicate flat hydraulic aliases | Q0 after migration | CSV may flatten the canonical object | JSON must not publish the same meaning twice. Preserve only during schema migration. |
| bridge length | R1 pending rights decision | Restricted record field; O2 coverage allowed | Descriptive value from a third-party supplementary dataset and ARCUS linkage. Not validated as a production retrieval feature. |
| piers in active riverbed | R1 pending rights decision | Restricted tri-state field; O2 coverage allowed | `false` is evidence; blank is unavailable. It must not be relabelled as span count. |

## Source and provenance classification

| Field or resource | Proposed class | Rule |
|---|---|---|
| source ID linked to `IT` event ID | O1 | Stable public source reference. |
| source role/type/title/URL/reference | O1 | Link, do not rehost third-party content unless authorized. |
| publication/access date and language | O1 | Required for traceability. |
| source `notes` | I1 | Editorial notes may contain uncertainty, working hypotheses or rights-sensitive detail. |
| taxonomy values and Italian definitions | O1 | Versioned with every release. |
| dataset title/authors/year/DOI/source URL | O1 | Dataset-level attribution remains public even when joined fields are restricted. |
| external file checksum | O2 | May document provenance without distributing the file. |
| `local_archive` path | I1 | Internal storage detail. |
| geometry `source_record_id` and accepted join | R1 | Research collaboration may audit the join. |
| match method, distance and confidence | R1 | ARCUS research enrichment; not needed in the general Atlas. |
| rejected matches and candidate assignments | I1 | Review evidence, not a published fact. |
| curatorial rationale and previous values | I1 | Audit history. The accepted public value may be O1 after review. |
| record-level public quality warnings | O1 when actionable | Publish warnings that help users interpret or correct a record. |
| raw source values in internal warnings | I1 | May expose rejected or unverified content. |

## Derived intelligence classification

| Resource | Proposed class | Decision |
|---|---|---|
| Open manifest, dictionary, taxonomy, changelog and quality audit | O1/O2 | Keep public and expose clearly in the Dataset page. |
| Open event/source CSV, JSON and GeoJSON | O1 | Complete within the declared Open schema. |
| hydraulic historical-outcome classification | O1 | Keep public with evidence level and non-predictive warning. |
| hydraulic geometry coverage and descriptive distributions | O2 | May be reported without releasing record-level joins. |
| hydraulic geometry record values and linkage | R1 | Remain restricted until rights and release authorization are explicit. |
| landslide curated intelligence | R1 now; candidate O1 later | Seven cases are not a reason to hide them, but the schema and evidence review must be release-grade first. |
| seismic curated intelligence | R1 now; candidate O1 later | Same rule; scarcity must be visible, not converted into false certainty. |
| episode IDs and episode membership | R1 | Share for controlled validation. Consider O1 only when the grouping method and corrections process are publishable. |
| official ISPRA/INGV point response | P1 | Project-point output with live provider status and provenance. |
| cached raw provider response | I1 | Operational cache; never a general data product. |
| analogue cohort and retrieved event IDs | P1 | Professional output, with `IT` identifiers and links back to Open records. |
| raw/effective/episode-effective evidence | P1 | Derived within the declared Professional method. |
| lessons and investigation priorities | P1 | Core Professional value; always source-linked and non-prescriptive. |
| method principles and abstention contract | O2 | Public methodology is required for credibility. |
| executable thresholds, registries and knowledge-base configuration | P1/I1 | Versioned and validated, but not automatically included in Open downloads. |
| customer project coordinates/profile/report | P1/I1 | Visible only to the authorized customer; subject to retention policy. |
| authentication, sessions, quotas and access requests | I1 | Security and personal/operational data. |

## Resources requiring quarantine review

The following current files must not be treated as valuable non-Open features
without a fresh dependency and scientific review:

| Current resource | Proposed class | Reason |
|---|---|---|
| `event-vulnerability.json` | Q0 | Synthetic vulnerability score/class conflicts with the canonical product. |
| vulnerability ranking UI/exports | Q0 | ARCUS does not rank assets or historical events as a proxy for site risk. |
| legacy provincial territory profiles used as risk rankings | Q0 | Provincial collapse context must not become site-specific risk. |
| `hazard-exposure-preview.json` when expressed as synthetic province scores | Q0 | Official point exposure must remain separate from historical provincial context. |
| `ainop-bridge-index.json` | Q0 | The denominator was explicitly excluded from the active method; naming and use remain unresolved. |
| legacy Path 01/02 scores, Final Priority Index and 70/30 outputs | Q0 | Explicitly retired by the current product definition. |
| `event-reliability.json` score/grade | review before P1 | Raw source counts and roles are defensible; the synthetic score survives only if validated and required by the active evidence contract. |

## Current implementation gaps

The repository does not yet enforce this policy. The audit found these concrete
gaps:

- the Professional API manifest still describes events as enriched with
  vulnerability models;
- the manifest still advertises provincial risk profiles, event vulnerability
  scores/classes and a province-level hazard preview;
- legacy Atlas code still contains loaders for `event-reliability`,
  `event-vulnerability`, `hazard-exposure-preview` and `territory-profiles`,
  although the public Atlas is now forced to Open mode and does not expose
  those resources;
- `ainop-bridge-index.json` is still registered as a Professional resource even
  though its denominator was excluded from the active method;
- no machine-readable field policy currently blocks an unclassified new field
  from entering a served resource.

These are migration debts, not additional Professional capabilities. They must
be resolved through dependency tests before deletion or release migration.

## Management of non-Open data

### Restricted research releases

R1 releases should be generated from an allowlist into an immutable directory
separate from both Open and Professional. Each release must contain:

- release ID and date;
- named research purpose and recipient;
- event and source counts;
- field dictionary;
- source licences and citation requirements;
- known limitations;
- checksum;
- expiry or review date;
- prohibition on redistribution unless explicitly authorized;
- corrections returned to ARCUS through the canonical editorial workflow.

Researchers must never receive `MASTER_RESEARCH.xlsx`, authentication files,
customer projects, caches, local archive paths or unreviewed editorial notes.

### Professional data

P1 data are delivered only through authenticated APIs and generated evidence
packages. Reference data and customer/project data must remain physically and
logically separate. A Professional report records the versions of the Open
release, Professional method, official-provider observation and knowledge base
used to generate it.

### Internal editorial data

I1 data remain outside public build directories and outside source-control
history when they contain credentials, personal data, licensed source files or
customer information. Access is least-privilege and changes to accepted event
facts retain an audit trail.

## Enforcement proposal

After owner approval, implement a machine-readable policy with these properties:

```json
{
  "field": "bridge_length_m",
  "classification": "R1",
  "source": "dangelo-ballio-ravazzani-2025-s3",
  "allowed_surfaces": ["restricted_research"],
  "record_level_release_authorized": false,
  "aggregate_release_authorized": true
}
```

The build and tests should then enforce:

1. every master and derived field has exactly one classification;
2. Open uses an allowlist and rejects an unknown field;
3. R1 and P1 builders use separate allowlists;
4. I1 and Q0 fields fail any served-resource build;
5. public IDs match `^IT\d{2}\.\d{2}\.\d{2}$`;
6. old `B` identifiers appear only in the versioned migration resource;
7. no customer or authentication field enters a reference-data release;
8. every third-party-derived field declares its source and release authority;
9. every release carries a schema version, changelog and checksum;
10. an API boundary test verifies authentication and field exclusion.

## Implemented release migration

`arcus-open-2026.1` remains unchanged. `arcus-open-2026.2` implements:

- `event_id = ITxx.xx.xx` as the canonical ID;
- `legacy_event_id = Bxx.xx.xx` only in `id-mapping.json` or a migration table;
- source records linked to the canonical `IT` identifier;
- one canonical JSON representation of hydraulic historical outcomes;
- a changelog that documents the identifier migration;
- permanent resolution of citations to the earlier release.

## Owner decisions before enforcement

The following proposal is ready for explicit confirmation:

1. approve `ITxx.xx.xx` as the only primary scientific identifier;
2. keep source-linked hydraulic outcome fields Open;
3. keep bridge length and active-riverbed pier presence R1 until a documented
   rights decision authorizes or rejects record-level Open publication;
4. keep landslide and seismic curation R1 until their schemas and evidence
   references pass a release-quality review;
5. keep source notes, matching details, previous values and rejected candidates
   internal;
6. quarantine synthetic vulnerability/ranking resources rather than selling them
   as Professional intelligence;
7. review whether the current reliability score is scientifically necessary or
   should also be retired.

## Recommended implementation order

1. owner approval of the seven decisions above;
2. machine-readable field policy and failing schema-drift test;
3. removal of Q0 resources from active API manifests and interfaces;
4. new Open release schema with canonical `IT` identifiers;
5. restricted-research release builder;
6. Dataset page exposing the complete Open manifest and documentation;
7. permanent event pages linked from Atlas and Professional outputs.
