# ARCUS Open / Professional Data Boundary

Product rule: **ARCUS Open describes what happened, where, and with what evidence. ARCUS Professional evaluates what matters for a specific territory or inventory and what to do next.**

Dataset invariant: **Open Research = public versioned release; Professional = live superset + decision engine.** Every Open `event_id` and `source_id` must exist in the current Professional dataset, and shared public fields must be identical:

```text
Open event IDs ⊆ Professional event IDs
Open source IDs ⊆ Professional source IDs
```

| Layer | Content | Access |
|---|---|---|
| Editorial master | Raw editorial workbook and controlled notes | Internal only |
| Open Research release | Complete validated scientific snapshot, sources, taxonomy, downloads and descriptive analytics | Public, read-only |
| Professional live | At least all current Open records, plus inter-release updates, controlled review records, reliability/vulnerability resources, hazard services, territory profiles and operational analytics | Authenticated |
| Customer scope | Inventories, watchlists, screenings, rankings, reports and audit trails | Tenant/user governed |

Professional value does not depend on hiding public ISPRA or INGV layers. It comes from automated querying, intersection, normalization, interpretation, inventory screening, analogue synthesis, mitigation knowledge, batch/API workflows, reporting, governance and support.

Open APIs are pinned to the versioned Open release. Professional APIs read `private-data/professional/professional-events.json` and `private-data/professional/professional-sources.json` plus derived resources, and require `professional:read`. Professional resources never fall back to `private-data/processed/events.json` or `private-data/processed/sources.json`. Open never reads Professional or customer stores. The raw workbook is never served by frontend or API.

Historical Hydraulic Intelligence is public evidence. It is explicitly barred from all prioritisation and retrieval inputs and may be read only after analogue selection.
