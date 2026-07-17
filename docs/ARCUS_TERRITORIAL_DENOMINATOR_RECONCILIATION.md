# ARCUS Territorial Denominator Reconciliation

Crosswalk:

```text
config/geography/province-crosswalk.json
```

## Source

- AINOP bridge denominator records: 118.
- Current province/UTS geometries: `public/data/geo/italy-provinces.geojson`.

## Result

| Mapping type | Count |
|---|---:|
| exact | 105 |
| alias | 0 |
| historical | 0 |
| unresolved | 13 |

## Rule

Do not aggregate or redistribute denominators silently.

Each crosswalk record contains:

```json
{
  "source_name": "...",
  "current_unit_code": "...",
  "current_unit_name": "...",
  "mapping_type": "exact | alias | historical | aggregate | unresolved",
  "notes": "..."
}
```

## Unresolved Records

Unresolved records require manual review before percentile or cause-specific incidence methods are used as production evidence.

Typical reasons:

- historical or changed administrative naming;
- record not present in the current UTS geometry file;
- denominator exists without current geometry match.

## Production Constraint

Cause-specific percentiles and territorial rates must declare whether they use:

- source AINOP name;
- current UTS name/code;
- unresolved source name.

No denominator should be moved to another territorial unit without a documented rule.
