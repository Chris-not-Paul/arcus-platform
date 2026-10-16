# ARCUS Data Quality Audit

## Current candidate — 16 October 2026

`arcus-open-2026.15`: 260 unique events, 1057 unique sources, 105 taxonomy entries, 9 supported shared episodes covering 72 events. Automated structural QA: **0 errors, 64 warnings**. This is structural acceptance, not a blanket scientific validation.

Warnings: 22 hydraulic evidence reviews; 17 territorial warnings; 11 specific processes with unspecified evidence; 7 specific components without a process; 3 unrecognized hydraulic triggers; 3 unrecognized hydraulic processes; 1 invalid URL preserved as a text reference. None is silently repaired or promoted to documented evidence.

32 events retain `failure_cause_evidence=Needs review`. Scope: 104 bridge-structure, 93 multiple-component, 18 approach-embankment, 1 temporary-works and 44 unspecified records; all 260 remain accounted for. Seven archived events are excluded from the public projection. The canonical Master fingerprint is `6123cdd7e3500cd04efc1f72f6f86190dbc276cf8f56ed84c9d2a0a85cb43cb8`.

The machine-readable current findings are `public/data/open-release/quality-audit.json` and `statistics.json`. Internal derived resources have been regenerated from the same Master; a superseded Verdura-only override is archived rather than applied to the revised source data.

## Historical audit below — superseded, not the current release

The prepared `arcus-open-2026.14` release passed its structural gate with 261 unique events, 261 unique slugs, 935 unique source records, at least one source per event, no orphan sources, valid taxonomy values and canonical `ITxx.xx.xx` identifiers across events and sources. Legacy `Bxx.xx.xx` identifiers exist only in the migration mapping.

The current local Professional build contains 261 events and 935 source records. All Open events and source IDs are present after explicit identifier translation, and shared public fields are equivalent after JSON normalization. The dedicated source registry contains no orphan source, no duplicate `source_id` and no event without a source.

## Normalization rules

- XLSX columns are read by header name and cell reference, never by ordinal position.
- Dates use `YYYY-MM-DD`; numbers, booleans, nulls, whitespace and language codes are normalized.
- `construction_year` and `construction_year_raw` retain the source; `construction_year_numeric` is set only for exact four-digit years.
- Province raw value, normalized key, code and validation status are preserved.
- Only HTTP/HTTPS values become `source_url`; other references move to `source_reference`.
- No mismatch is silently corrected.

## Release findings

The audit records 73 warnings and zero blocking errors: 18 territorial warnings, 49 non-hydraulic records carrying cross-hazard failure-detail fields, 2 hydraulic Needs review evidence warnings, 2 component/process inconsistencies, 1 hydraulic trigger outside the controlled vocabulary and 1 hydraulic failure process outside the controlled vocabulary.

Territorial warnings include administrative-name variants and coordinate/province mismatches retained for review. The corrected source registry contains no text-only value misrepresented as a URL. A publication year recorded without month and day remains undated in the normalized release rather than being converted into a false Excel date.

Hydraulic coverage is 210 events. Across the full release, 213 records provide a specific process and 212 provide a specific component. Evidence classes across all events are 156 Documented, 61 Probable, 3 Needs review and 39 Unspecified. Missing values remain visible in Open statistics.

The structural-type audit removed 14 `Viaduct`, 13 `Overpass` and one `Masonry` value from the structural-system field. The revised master contains 223 beam bridges, 21 arch bridges and 6 unavailable structural-system classifications. The release gate accepts only Beam bridge, Arch bridge, Truss, Rigid-frame bridge, Cable-stayed and Suspension.

The machine-readable source is `private-data/open/releases/arcus-open-2026.14/quality-audit.json`; it is also available through the read-only Open quality-audit endpoint once deployed. Warnings require editorial review and must not trigger automatic deletion or invented corrections.

The release also publishes 14 source-supported shared hazard episodes covering
108 event records. Episode membership prevents those records from being treated
as statistically independent by default; it does not assert a common structural
failure mechanism.

Open immutability is checked with a complete release-directory fingerprint before and after Professional regeneration. Professional derived resources use `professional-events.json` and `professional-sources.json`; tests reject a fallback to processed legacy files. Hydraulic outcome fields remain excluded from FPI, Path 02, incidence, official exposure, territory profiles, asset screening and analogue retrieval.

## Atlas editorial review — 10 September 2026

The 74 warnings were triaged without modifying the immutable release or master. The decisions and unresolved cases are recorded in [Atlas acceptance](ARCUS_ATLAS_ACCEPTANCE.md). Review-state records now have a notice before their full narrative; displayed prose uses canonical IT references. An outdated rainfall context for IT00.10.41 was re-retrieved at the current coordinates, and point/grid context date and coordinate checks now prevent silent reuse after a record changes. This does not resolve the outstanding documentary questions at Bussoleno or the administrative-boundary discrepancies.
