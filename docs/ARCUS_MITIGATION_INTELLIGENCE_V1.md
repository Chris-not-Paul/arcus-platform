# ARCUS Mitigation Intelligence v1

Status: production vertical slice with mandatory expert review.

Engine version: `arcus-mitigation-intelligence-v1`.

## Decision question

The engine answers:

> Given the official hazard exposure at a validated project point, which investigation priorities, risk-control themes and monitoring considerations are supported by documented ARCUS outcomes in the point-derived province?

It does not answer whether a bridge is safe, estimate collapse probability, modify the Final Priority Index or prescribe a design solution.

## Runtime chain

```text
Validated project point
  -> point-derived province
  -> official ISPRA / INGV exposure already returned by ARCUS providers
  -> active and attention hazard tracks
  -> provincial evidence cohort fixed
  -> documented outcome fields read after the cohort is fixed
  -> evidence support check
  -> investigation priority + risk-control theme + monitoring consideration
  -> expert review required
```

The first supported production slice is hydraulic. Landslide and seismic remain contextual until equivalent curated outcome fields and validation are available.

## Inputs

- validated latitude and longitude;
- province derived again server-side from the project point and the official ARCUS province geometry;
- official hydraulic, landslide and seismic provider responses;
- project context;
- Professional events and sources;
- curated `hydraulic_intelligence` outcome fields.

The master workbook and Open Research release are not served to the engine directly. Runtime data comes from the authenticated Professional resources.

## Hydraulic activation

The hydraulic track is active only when:

- the provider status is `available` or `partial`; and
- at least one ISPRA class is matched, or `highest_class` is present.

`no_intersection`, missing provider output and provider errors do not activate a mitigation pathway.

Provider completeness remains separate from activation:

- a complete official intersection can produce `available`;
- a partial official response with at least one observed intersection can produce `available_partial` (or `limited_evidence_partial` for the generic fallback);
- a partial response with no observed intersection produces abstention with `official_hydraulic_exposure_incomplete`;
- only a complete three-layer response without intersections is treated as `official_hydraulic_exposure_not_intersected`.

Strategies emitted from a partial official response are based only on the responding layers. Failed P1/P2/P3 layers remain explicit in `source_completeness.hydraulic.failed_layers`, the UI and the report.

Complete observations served from the persistent Hydraulic cache retain their
official matched classes but are explicitly labelled through
`source_completeness.hydraulic.observation_mode`,
`freshness_status` and `observed_at`. Mitigation Intelligence adds
`official_hydraulic_exposure_from_persistent_cache` to `source_warnings`.
An expired observation is never used to activate the track: it remains
`last_known_good` context while the current result abstains as
`official_hydraulic_exposure_incomplete`.

MPS04 PGA remains an attention track. No engineering low/medium/high PGA threshold is introduced by this engine.

## Evidence weighting

The evidence weight is used only to decide whether a mitigation theme is sufficiently supported. It is not a risk score.

| Evidence level | Weight |
| --- | ---: |
| Documented | 1.0 |
| Probable | 0.5 |
| Needs review | 0.0 |
| Unspecified | 0.0 |

A process-specific pathway requires:

- at least 3 cases for the same curated hydraulic process; and
- an effective evidence count of at least 2.0.

Evidence strength is labelled:

- `moderate`: at least 8 cases and effective count at least 5;
- `limited`: at least 3 cases and effective count at least 2;
- `insufficient`: below those values.

If the hydraulic cohort has an effective count of at least 2 but no individual process passes the process-specific threshold, the engine issues only a generic hydraulic investigation pathway with `limited_evidence` status.

## Supported hydraulic processes

- scour;
- bank erosion or embankment failure;
- debris accumulation or obstruction;
- debris flow or solid transport;
- overtopping or hydrodynamic action;
- other documented hydraulic process.

Every emitted strategy contains the supporting event IDs, raw and effective counts, linked-source count, affected-component themes, applicability conditions, limitations and `external_validation_required: true`.

## Abstention

The engine abstains when:

- the project location is not validated;
- official hydraulic exposure does not intersect the point;
- the hydraulic provider is unavailable;
- effective hydraulic evidence is below the minimum support threshold.

Provider incompleteness is not converted into `no_intersection` or zero hazard. It has its own abstention reason, `official_hydraulic_exposure_incomplete`.

An abstention is an expected scientific output, not an application error.

## API

Authenticated endpoint:

```text
POST /api/professional/mitigation-intelligence
```

The endpoint requires `professional:read` and CSRF protection for cookie sessions. It records an audit event with engine version, status, active tracks and strategy count.

## Separation from scoring

The engine does not call or modify:

- `buildTerritoryProfiles`;
- `buildAssetScreening`;
- Historical Collapse Incidence;
- the 70/30 Final Priority Index formula;
- Path 02 ranking;
- hazard provider normalization.

Its output is a separate evidence-to-action layer shown in Path 01 and included in the Path 01 report.
