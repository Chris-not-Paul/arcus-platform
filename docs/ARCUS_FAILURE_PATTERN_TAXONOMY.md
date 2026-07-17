# ARCUS Failure Pattern Taxonomy

Versioned mapping:

```text
config/collapse-intelligence/failure-pattern-taxonomy.json
```

## Principle

The taxonomy is built from real ARCUS fields and narrative cues. It does not invent a documented mechanism when sources do not support it.

Confidence levels used in the mapping:

```text
documented
probable
unspecified
```

Current automatic mapping uses `probable` when a narrative cue exists and `unspecified` where detail is not present. Expert curation is required before production use.

## Cause Families

Current families:

- hydraulic;
- landslide_ground_movement;
- seismic;
- design_construction;
- impact;
- deterioration_maintenance;
- overload;
- unknown_unspecified.

## Example Pattern Families

Hydraulic:

- `hydraulic_scour_or_foundation_loss`;
- `hydraulic_approach_or_embankment_damage`;
- `hydraulic_flood_action_unspecified`;
- `hydraulic_unspecified`.

Landslide / ground movement:

- `landslide_slope_instability`;
- `ground_movement_unspecified`.

Seismic:

- `seismic_bearing_or_unseating`;
- `seismic_pier_or_superstructure_damage`;
- `seismic_unspecified`.

Other:

- `design_or_construction_deficiency`;
- `deterioration_or_material_degradation`;
- `impact_road_vehicle_collision`;
- `overload_or_excess_action`;
- `unspecified_total_collapse`;
- `unspecified_partial_collapse`.

## Required Future Fields

To increase precision:

- component involved;
- failure mechanism;
- foundation involvement;
- approach embankment involvement;
- waterway name/context;
- debris obstruction;
- scour evidence;
- slope movement evidence;
- source confidence for mechanism assignment.
