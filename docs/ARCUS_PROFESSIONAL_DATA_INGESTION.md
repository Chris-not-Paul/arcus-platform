# ARCUS Professional Data Ingestion

ARCUS Professional is a live, authenticated operational layer. It may advance beyond the latest Open cutoff through controlled editorial updates and reviewed records.

The normalized `EVENTS`, `SOURCES` and taxonomy sheets from `MASTER_RESEARCH.xlsx` are the common in-memory input for both products. Open writes a versioned immutable snapshot; Professional writes the live superset. The current baseline is 263 Professional events and 712 Professional sources.

Inputs include the curated live event/source dataset, event reliability, event vulnerability, public ISPRA/INGV hazard services, territorial profiles, publishable denominator-derived indicators, asset inventories supplied by authorised customers and mitigation knowledge with explicit validation status.

Professional ingestion must:

1. enforce `Open event IDs ⊆ Professional event IDs` and `Open source IDs ⊆ Professional source IDs`;
2. preserve stable `event_id`, `research_event_id`, `event_slug` and record provenance;
3. validate schemas, source links, orphan sources, source uniqueness and at least one source per event;
4. preserve invalid URLs losslessly as `source_reference`;
5. separate provider cache from durable normalized results;
6. keep customer inventories tenant-scoped;
7. record dataset and methodology versions in every output;
8. retain audit trails for uploads, screening, ranking and exports;
9. require authentication for all Professional resources.

Professional Atlas loads `professional-events`, `professional-sources`, reliability, vulnerability, hazard exposure and territory profiles. Advanced Analytics uses the authenticated Professional resources, never Open API fallbacks.

`professional-events` resolves to `private-data/professional/professional-events.json`; `professional-sources` resolves to `private-data/professional/professional-sources.json`. Derived Collapse Intelligence, analogue outcome summaries, AINOP incidence, data quality and territorial resources consume these Professional files rather than the processed legacy files.

Historical analogue outcomes may inform contextual mitigation evidence after retrieval. They cannot change analogue selection, asset vulnerability or priority scores. Strategies must declare hazard domain, observed mechanism, affected component, category, evidence references, applicability, limitations and external validation required.
