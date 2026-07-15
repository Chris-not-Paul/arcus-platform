export const SEISMIC_PROVIDER_VERSION = "ingv-mps04-grid-v1";
export const SEISMIC_MODEL = "MPS04";
export const SEISMIC_MODEL_ROLE = "reference_regulatory_model";
export const SEISMIC_ANALYSIS_MODE = "grid_sampling";
export const SEISMIC_PARAMETER = "PGA";
export const SEISMIC_UNIT = "g";
export const SEISMIC_PROBABILITY_50_YEARS = 10;
export const SEISMIC_PERCENTILE = 50;
export const SEISMIC_REFERENCE_RETURN_PERIOD_YEARS = 475;
export const SEISMIC_REQUIRED_SOURCE_CRS = "EPSG:4230";
export const SEISMIC_REQUIRED_PROCESSED_CRS = "EPSG:4326";

export const SEISMIC_SOURCE = Object.freeze({
  citation:
    "Stucchi M., Meletti C., Montaldo V., Akinci A., Faccioli E., Gasperini P., Malagnini L., Valensise G. (2004). Pericolosita sismica di riferimento per il territorio nazionale MPS04 [Data set]. Istituto Nazionale di Geofisica e Vulcanologia (INGV).",
  datasetPage:
    "http://zonesismiche.mi.ingv.it/elaborazioni/download.php",
  doi: "https://doi.org/10.13127/sh/mps04/ag",
  downloadUrl:
    "http://zonesismiche.mi.ingv.it/elaborazioni/dati/OPCM3519_1B_ag_005_txt.zip",
  licence: "Creative Commons Attribution 4.0 International (CC BY 4.0)",
  sourceName:
    "MPS04 reference seismic hazard map - ag/PGA, 50th percentile, 10% probability of exceedance in 50 years",
});

export function seismicScientificComparison(status = "not_integrated") {
  return {
    difference_from_mps04_g: null,
    difference_from_mps04_percent: null,
    model: "MPS19",
    model_role: "updated_scientific_model",
    model_version: null,
    normalized_score: null,
    reason:
      status === "available"
        ? null
        : "MPS19 remains source-discovery only until an official reproducible INGV data access path is integrated.",
    status,
  };
}

export function seismicExplanation(result = {}) {
  if (result.status === "available") {
    return [
      "INGV MPS04 PGA is reported as a probabilistic grid value for the selected project point.",
      "The value is not a bridge collapse probability, not a site-response study and not a design verification.",
      "ARCUS keeps this official seismic hazard value in shadow mode; normalized_score remains not assigned.",
    ];
  }

  if (result.status === "outside_coverage") {
    return [
      "The selected point is outside the processed MPS04 grid coverage.",
      "ARCUS does not convert missing seismic coverage into PGA zero.",
    ];
  }

  if (result.status === "configuration_error") {
    return [
      "The local processed INGV MPS04 grid is not configured.",
      "Run the documented MPS04 download/build pipeline before using seismic point exposure.",
    ];
  }

  if (result.status === "point_not_selected") {
    return [
      "The seismic exposure query was not executed because no validated project point was provided.",
    ];
  }

  if (result.status === "invalid_coordinates") {
    return [
      "The seismic exposure query was not executed because the coordinates are invalid.",
    ];
  }

  return [
    "The INGV MPS04 seismic source could not be used for this query.",
    "ARCUS does not convert source unavailability into PGA zero.",
  ];
}

export function requiredSeismicMetadata() {
  return {
    analysis_mode: SEISMIC_ANALYSIS_MODE,
    model: SEISMIC_MODEL,
    model_role: SEISMIC_MODEL_ROLE,
    probability_of_exceedance_50_years: SEISMIC_PROBABILITY_50_YEARS,
    reference_return_period_years: SEISMIC_REFERENCE_RETURN_PERIOD_YEARS,
    shaking_parameter: SEISMIC_PARAMETER,
    unit: SEISMIC_UNIT,
    percentile: SEISMIC_PERCENTILE,
  };
}
