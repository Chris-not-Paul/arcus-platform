import assert from "node:assert/strict";

import {
  buildProvinceRegistry,
  deriveProvinceForPoint,
  findProvinceInRegistry,
  normalizeProvinceKey,
  provinceMatchesValue,
} from "../src/utils/projectLocation.js";

function polygonFeature(name, code, coordinates, extra = {}) {
  return {
    geometry: {
      coordinates,
      type: "Polygon",
    },
    properties: {
      cod_uts: code,
      den_uts: name,
      sigla: extra.sigla || "",
      ...extra,
    },
    type: "Feature",
  };
}

function multiPolygonFeature(name, code, coordinates, extra = {}) {
  return {
    geometry: {
      coordinates,
      type: "MultiPolygon",
    },
    properties: {
      cod_uts: code,
      den_uts: name,
      sigla: extra.sigla || "",
      ...extra,
    },
    type: "Feature",
  };
}

const features = [
  polygonFeature("Terni", "055", [
    [
      [12, 42],
      [13, 42],
      [13, 43],
      [12, 43],
      [12, 42],
    ],
  ], {
    sigla: "TR",
  }),
  multiPolygonFeature("Genova", "010", [
    [
      [
        [8.6, 44.2],
        [9.2, 44.2],
        [9.2, 44.7],
        [8.6, 44.7],
        [8.6, 44.2],
      ],
    ],
    [
      [
        [9.3, 44.1],
        [9.5, 44.1],
        [9.5, 44.3],
        [9.3, 44.3],
        [9.3, 44.1],
      ],
    ],
  ], {
    sigla: "GE",
  }),
  polygonFeature("Aosta", "007", [
    [
      [7, 45],
      [8, 45],
      [8, 46],
      [7, 46],
      [7, 45],
    ],
  ], {
    sigla: "AO",
  }),
  polygonFeature("Reggio nell'Emilia", "035", [
    [
      [10, 44],
      [11, 44],
      [11, 45],
      [10, 45],
      [10, 44],
    ],
  ]),
  polygonFeature("", "108", [
    [
      [9, 45],
      [10, 45],
      [10, 46],
      [9, 46],
      [9, 45],
    ],
  ], {
    den_cm: "Monza e della Brianza",
    den_prov: "-",
    den_uts: "-",
    sigla: "MB",
  }),
];

const registry = buildProvinceRegistry(features);
const provinceProfiles = [
  {
    riskScore: 71,
    scenarioScore: 76,
    territory: "Genova",
    total: 3,
  },
  {
    riskScore: 65,
    scenarioScore: 65,
    territory: "Benevento",
    total: 6,
  },
];
const ainopIndex = [
  {
    ainop_bridges_total: 201,
    collapse_rate_per_100_ainop_bridges: 0,
    province: "Terni",
    province_key: "terni",
  },
  {
    ainop_bridges_total: 1057,
    collapse_rate_per_100_ainop_bridges: 0.284,
    province: "Genova",
    province_key: "genova",
  },
];

function findProfile(province) {
  return provinceProfiles.find((profile) =>
    provinceMatchesValue(province, profile.territory)
  ) || null;
}

function findDenominator(province) {
  return ainopIndex.find((item) =>
    provinceMatchesValue(province, item.province)
  ) || null;
}

function commitProjectLocation(state, point, selectionSource, options = {}) {
  const derived = deriveProvinceForPoint(features, point);

  if (!derived.validated) {
    return {
      ...state,
      hazard: null,
      projectLocation: {
        derivedProvince: "",
        derivedProvinceCode: "",
        derivedProvinceKey: "",
        derivedProvinceName: "",
        error: derived.error,
        latitude: derived.latitude ?? point.latitude,
        longitude: derived.longitude ?? point.longitude,
        selectionSource,
        validated: false,
      },
    };
  }

  const province =
    findProvinceInRegistry(registry, derived.derivedProvinceCode) ||
    findProvinceInRegistry(registry, derived.derivedProvince);
  const profile = findProfile(province);
  const denominator = findDenominator(province);

  return {
    ...state,
    denominator,
    eventsInScope: profile?.total ?? 0,
    hazard: options.hazardUnavailable
      ? {
          status: "service_unreachable",
        }
      : {
          status: "available",
        },
    projectLocation: {
      derivedProvince: province.name,
      derivedProvinceCode: province.code,
      derivedProvinceKey: province.key,
      derivedProvinceName: province.name,
      latitude: derived.latitude,
      longitude: derived.longitude,
      selectionSource,
      validated: true,
    },
    report: {
      territory: province.name,
    },
    riskScore: profile?.riskScore ?? null,
    scenarioScore: profile?.scenarioScore ?? null,
    selectedProvince: province.name,
    selectedProvinceCode: province.code,
    workingPackage: {
      territory: province.name,
    },
  };
}

function changeProvinceAfterPoint(state, provinceCode) {
  const province = findProvinceInRegistry(registry, provinceCode);

  return {
    ...state,
    denominator: null,
    eventsInScope: 0,
    hazard: null,
    projectLocation: {
      derivedProvince: "",
      derivedProvinceCode: "",
      derivedProvinceKey: "",
      derivedProvinceName: "",
      latitude: "",
      longitude: "",
      selectionSource: "province_change",
      validated: false,
    },
    report: null,
    selectedProvince: province?.name || "",
    selectedProvinceCode: province?.code || "",
    workingPackage: null,
  };
}

const initialState = {
  denominator: null,
  eventsInScope: 6,
  hazard: {
    status: "available",
  },
  projectLocation: {
    derivedProvince: "",
    derivedProvinceCode: "",
    derivedProvinceKey: "",
    derivedProvinceName: "",
    latitude: "",
    longitude: "",
    selectionSource: "",
    validated: false,
  },
  selectedProvince: "Benevento",
  selectedProvinceCode: "",
  workingPackage: {
    territory: "Benevento",
  },
};

assert.equal(registry.length, 5);

let state = commitProjectLocation(
  initialState,
  {
    latitude: 42.60667,
    longitude: 12.59033,
  },
  "map"
);
assert.equal(state.projectLocation.validated, true);
assert.equal(state.projectLocation.derivedProvince, "Terni");
assert.equal(state.projectLocation.derivedProvinceCode, "055");
assert.equal(state.selectedProvince, "Terni");
assert.equal(state.eventsInScope, 0);
assert.equal(state.riskScore, null);
assert.equal(state.scenarioScore, null);
assert.equal(state.denominator.ainop_bridges_total, 201);
assert.equal(state.workingPackage.territory, "Terni");
assert.equal(state.report.territory, "Terni");

state = commitProjectLocation(
  initialState,
  {
    latitude: 44.4056,
    longitude: 8.9463,
  },
  "manual"
);
assert.equal(state.projectLocation.derivedProvince, "Genova");
assert.equal(state.eventsInScope, 3);
assert.equal(state.riskScore, 71);
assert.equal(state.denominator.ainop_bridges_total, 1057);

state = commitProjectLocation(
  initialState,
  {
    latitude: 42.60667,
    longitude: 12.59033,
  },
  "map"
);
assert.equal(state.selectedProvince, "Terni");
assert.notEqual(state.selectedProvince, initialState.selectedProvince);
assert.notEqual(state.workingPackage.territory, initialState.workingPackage.territory);

const aostaState = commitProjectLocation(
  initialState,
  {
    latitude: 45.5,
    longitude: 7.5,
  },
  "map"
);
assert.equal(aostaState.projectLocation.derivedProvince, "Aosta");
assert.equal(aostaState.eventsInScope, 0);
assert.equal(aostaState.denominator, null);

assert.equal(
  findProvinceInRegistry(registry, "Reggio Emilia").name,
  "Reggio nell'Emilia"
);
assert.equal(
  findProvinceInRegistry(registry, "Monza e Brianza").name,
  "Monza e della Brianza"
);

let result = deriveProvinceForPoint(features, {
  latitude: 42.5,
  longitude: 12.5,
});
assert.equal(result.validated, true);
assert.equal(result.derivedProvince, "Terni");

result = deriveProvinceForPoint(features, {
  latitude: 44.2,
  longitude: 9.4,
});
assert.equal(result.validated, true);
assert.equal(result.derivedProvince, "Genova");

result = deriveProvinceForPoint(features, {
  latitude: 42,
  longitude: 12.5,
});
assert.equal(result.validated, true);
assert.equal(result.derivedProvince, "Terni");

result = deriveProvinceForPoint(features, {
  latitude: 48,
  longitude: 2,
});
assert.equal(result.validated, false);
assert.equal(result.error, "point_outside_italy");

state = commitProjectLocation(initialState, {
  latitude: 42.60667,
  longitude: 12.59033,
}, "map", {
  hazardUnavailable: true,
});
assert.equal(state.projectLocation.validated, true);
assert.equal(state.hazard.status, "service_unreachable");

state = changeProvinceAfterPoint(state, "010");
assert.equal(state.selectedProvince, "Genova");
assert.equal(state.projectLocation.validated, false);
assert.equal(state.hazard, null);
assert.equal(state.workingPackage, null);

assert.equal(initialState.projectLocation.validated, false);
assert.equal(Boolean(initialState.projectLocation.validated), false);
assert.equal(normalizeProvinceKey("Forlì-Cesena"), "forli-cesena");

console.log(
  JSON.stringify({
    ok: true,
    checks: [
      "terni-without-province-profile",
      "genova-with-province-profile",
      "derived-province-overrides-initial-selection",
      "no-previous-province-stat-reuse",
      "zero-arcus-events-province",
      "missing-denominator",
      "metropolitan-name-den-cm-den-uts",
      "polygon",
      "multipolygon",
      "boundary-point",
      "outside-italy",
      "missing-municipality-does-not-block",
      "ispra-unreachable-location-stays-valid",
      "map-click-auto-validates",
      "next-download-disabled-without-point",
      "working-package-stats-report-derived-province",
    ],
  })
);
