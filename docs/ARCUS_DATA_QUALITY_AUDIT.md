# ARCUS Data Quality Audit

The `arcus-open-2026.1` release passed its structural gate with 263 unique events, 263 unique slugs, 712 unique sources, at least one source per event, no orphan sources, valid taxonomy values and deterministic IT-to-B mapping.

The current Professional live build contains 263 events and 712 sources. All 263 Open event IDs and all 712 Open source IDs are present in Professional, and shared public fields are byte-equivalent after JSON normalization. The dedicated Professional source registry contains no orphan source, no duplicate `source_id` and no event without a source.

## Normalization rules

- XLSX columns are read by header name and cell reference, never by ordinal position.
- Dates use `YYYY-MM-DD`; numbers, booleans, nulls, whitespace and language codes are normalized.
- `construction_year` and `construction_year_raw` retain the source; `construction_year_numeric` is set only for exact four-digit years.
- Province raw value, normalized key, code and validation status are preserved.
- Only HTTP/HTTPS values become `source_url`; other references move to `source_reference`.
- No mismatch is silently corrected.

## Release findings

The audit records 41 warnings and zero blocking errors. They comprise 19 territorial warnings, 8 non-URL source references, 8 Needs review evidence warnings, 5 specific processes with weak/unspecified evidence and 1 component/process inconsistency.

Territorial warnings include the expected `Ivrea` and `Caltanisetta` cases, administrative-name variants, four coordinate/province mismatches and one point outside the available province geometry. Eight text-only references remain valid source records but are not links.

Hydraulic coverage is 172 specific processes and 166 specific components. Evidence classes are 124 Documented, 43 Probable, 8 Needs review and 36 Unspecified. Missing values remain visible in Open statistics.

The machine-readable source is `private-data/open/releases/arcus-open-2026.1/quality-audit.json`; it is also available through the read-only Open quality-audit endpoint. Warnings require editorial review and must not trigger automatic deletion or invented corrections.

Open immutability is checked with a complete release-directory fingerprint before and after Professional regeneration. Professional derived resources use `professional-events.json` and `professional-sources.json`; tests reject a fallback to processed legacy files. Hydraulic outcome fields remain excluded from FPI, Path 02, incidence, official exposure, territory profiles, asset screening and analogue retrieval.
