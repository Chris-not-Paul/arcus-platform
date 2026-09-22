# ARCUS Data Quality Audit

The active `arcus-open-2026.5` release passed its structural gate with 261 unique events, 261 unique slugs, 716 unique sources, at least one source per event, no orphan sources, valid taxonomy values and canonical `ITxx.xx.xx` identifiers across events and sources. Legacy `Bxx.xx.xx` identifiers exist only in the migration mapping.

The current Professional live build contains 261 events and 716 sources. All 261 Open events and all 716 Open source IDs are present in Professional after explicit identifier translation, and shared public fields are equivalent after JSON normalization. The dedicated Professional source registry contains no orphan source, no duplicate `source_id` and no event without a source.

## Normalization rules

- XLSX columns are read by header name and cell reference, never by ordinal position.
- Dates use `YYYY-MM-DD`; numbers, booleans, nulls, whitespace and language codes are normalized.
- `construction_year` and `construction_year_raw` retain the source; `construction_year_numeric` is set only for exact four-digit years.
- Province raw value, normalized key, code and validation status are preserved.
- Only HTTP/HTTPS values become `source_url`; other references move to `source_reference`.
- No mismatch is silently corrected.

## Release findings

The audit records 74 warnings and zero blocking errors. They comprise 20 territorial warnings, 50 non-hydraulic records carrying cross-hazard failure-detail fields, 2 hydraulic Needs review evidence warnings, 1 component/process inconsistency and 1 hydraulic trigger outside the hydraulic trigger vocabulary.

Territorial warnings include administrative-name variants and coordinate/province mismatches retained for review. The corrected source registry contains no text-only value misrepresented as a URL. A publication year recorded without month and day remains undated in the normalized release rather than being converted into a false Excel date.

Hydraulic coverage remains 211 events, with 172 specific processes and 166 specific components. Evidence classes are 126 Documented, 46 Probable, 2 Needs review and 37 Unspecified. Missing values remain visible in Open statistics.

The structural-type audit removed 14 `Viaduct`, 13 `Overpass` and one `Masonry` value from the structural-system field. The revised master extends source-supported editorial classification: 225 records are now identified as beam bridges, 21 as arch bridges and only 6 structural systems remain unavailable. The release gate continues to accept only Beam bridge, Arch bridge, Truss, Frame, Cable-stayed and Suspension.

The machine-readable source is `private-data/open/releases/arcus-open-2026.5/quality-audit.json`; it is also available through the read-only Open quality-audit endpoint. Warnings require editorial review and must not trigger automatic deletion or invented corrections.

Open immutability is checked with a complete release-directory fingerprint before and after Professional regeneration. Professional derived resources use `professional-events.json` and `professional-sources.json`; tests reject a fallback to processed legacy files. Hydraulic outcome fields remain excluded from FPI, Path 02, incidence, official exposure, territory profiles, asset screening and analogue retrieval.

## Atlas editorial review — 10 September 2026

The 74 warnings were triaged without modifying the immutable release or master. The decisions and unresolved cases are recorded in [Atlas acceptance](ARCUS_ATLAS_ACCEPTANCE.md). Review-state records now have a notice before their full narrative; displayed prose uses canonical IT references. An outdated rainfall context for IT00.10.41 was re-retrieved at the current coordinates, and point/grid context date and coordinate checks now prevent silent reuse after a record changes. This does not resolve the outstanding documentary questions at Bussoleno or the administrative-boundary discrepancies.
