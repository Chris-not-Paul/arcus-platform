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
- `hydraulic_debris_obstruction_or_solid_transport`;
- `hydraulic_overtopping_or_hydrodynamic_action`;
- `hydraulic_other_documented_process`;
- `hydraulic_flood_action_unspecified`;
- `hydraulic_unspecified`.

## Hydraulic Intelligence Taxonomy

The Hydraulic family now has a separate curated outcome taxonomy, version `hydraulic-v1`, generated from the values actually present in `MASTER_RESEARCH.xlsx`.

It keeps four dimensions separate:

- hydraulic trigger;
- hydraulic failure process;
- hydraulic component;
- evidence level.

Current failure-process values:

- `bank_erosion_or_embankment_failure`;
- `debris_accumulation_or_obstruction`;
- `debris_flow_or_solid_transport`;
- `other_documented_hydraulic_process`;
- `overtopping_or_hydrodynamic_action`;
- `scour`.

`Unspecified` source values become `null` for process and component. `Needs review` evidence is normalized as `unspecified` with an audit warning.

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

The new Hydraulic Intelligence fields reduce the need for narrative inference on Hydraulic cases, but they remain outcome features and cannot enter similarity scoring.
