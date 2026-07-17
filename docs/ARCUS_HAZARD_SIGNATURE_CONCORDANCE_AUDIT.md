# ARCUS Hazard Signature Concordance Audit

Date: 2026-07-17

Output section:

```text
private-data/professional/collapse-intelligence/hazard-gated-intelligence-analysis.json
  -> hazard_to_cause_concordance
```

## Purpose

This audit compares current official hazard signatures with documented ARCUS cause families. It is descriptive only.

It must not be interpreted as proof that a current mapped hazard caused a historical collapse.

## Current Status

Full concordance cannot yet be evaluated because the historical hazard signatures are dry-run:

| Provider | Completed |
| --- | ---: |
| ISPRA hydraulic | 0 |
| ISPRA PAI landslide | 0 |
| INGV MPS04 seismic | 0 |
| fully enriched events | 0 |

## Expected Matrix Shape

Hydraulic:

```json
{
  "documented_cause_family": "hydraulic",
  "hydraulic_signature": "P3 | P2 | P1 | no_intersection | unavailable",
  "count": 0,
  "share_within_documented_family": 0
}
```

Equivalent matrices are produced for landslide and seismic signatures.

## Interpretation Rules

The audit must highlight:

- concordant cases;
- discordant cases;
- non-informative cases;
- provider unavailable;
- territorial differences;
- possible scale/update limits in official cartography.

Discordant cases are retained. They are not automatically removed from the retrieval corpus.

## Current Decision

Concordance audit structure is implemented, but the result is not interpretable until live enrichment is approved and completed.
