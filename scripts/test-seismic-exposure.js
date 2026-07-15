import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import {
  evaluatePointHazardExposure,
  queryRegisteredHazardProvider,
} from "../server/hazard/hazardExposureService.js";
import { queryIngvSeismicExposure } from "../server/hazard/providers/ingvSeismicProvider.js";

const tmpRoot = await fs.mkdtemp(path.join(os.tmpdir(), "arcus-seismic-"));
const manifestPath = path.join(tmpRoot, "mps04-manifest.json");
const gridPath = path.join(tmpRoot, "mps04-grid.json");

async function writeFixture({
  manifestOverrides = {},
  nodes,
} = {}) {
  const manifest = {
    coordinate_transform_applied: true,
    coverage_bbox_wgs84: {
      east: 12.1,
      north: 45.1,
      south: 44.9,
      west: 11.9,
    },
    dataset_version: "MPS04-test-fixture",
    doi: "https://doi.org/10.13127/sh/mps04/ag",
    grid_spacing_degrees: 0.05,
    licence: "test fixture",
    max_nearest_node_distance_m: 12000,
    model: "MPS04",
    percentile: 50,
    probability_of_exceedance_50_years: 10,
    processed_checksum_sha256: "fixture-processed",
    processed_crs: "EPSG:4326",
    reference_ground_condition: "test rigid/reference ground",
    reference_return_period_years: 475,
    shaking_parameter: "PGA",
    source_checksum_sha256: "fixture-source",
    source_crs: "EPSG:4230",
    source_name: "MPS04 test fixture",
    source_url: "fixture://mps04",
    transform_library: "proj4",
    transform_method: "EPSG:4230 -> EPSG:4326",
    unit: "g",
    ...manifestOverrides,
  };
  const grid = {
    metadata: {
      model: "MPS04",
      node_count: nodes.length,
    },
    nodes,
  };

  await fs.writeFile(manifestPath, JSON.stringify(manifest, null, 2), "utf8");
  await fs.writeFile(gridPath, JSON.stringify(grid, null, 2), "utf8");
}

const validNodes = [
  {
    id: "A",
    latitude: 45,
    longitude: 12,
    pga_p16_g: 0.04,
    pga_p50_g: 0.1,
    pga_p84_g: 0.16,
    source_latitude: 45.001,
    source_longitude: 12.001,
  },
  {
    id: "B",
    latitude: 45,
    longitude: 12.05,
    pga_p16_g: 0.05,
    pga_p50_g: 0.12,
    pga_p84_g: 0.19,
    source_latitude: 45.001,
    source_longitude: 12.051,
  },
  {
    id: "C",
    latitude: 45.05,
    longitude: 12,
    pga_p16_g: 0.06,
    pga_p50_g: 0.14,
    pga_p84_g: 0.22,
    source_latitude: 45.051,
    source_longitude: 12.001,
  },
  {
    id: "D",
    latitude: 45.05,
    longitude: 12.05,
    pga_p16_g: 0,
    pga_p50_g: 0,
    pga_p84_g: 0.02,
    source_latitude: 45.051,
    source_longitude: 12.051,
  },
];

async function main() {
  await writeFixture({ nodes: validNodes });

  let result = await queryIngvSeismicExposure(
    {
      latitude: 45,
      longitude: 12,
    },
    {
      gridPath,
      manifestPath,
    }
  );

  assert.equal(result.status, "available");
  assert.equal(result.analysis_mode, "grid_sampling");
  assert.equal(result.model, "MPS04");
  assert.equal(result.model_role, "reference_regulatory_model");
  assert.equal(result.shaking_parameter, "PGA");
  assert.equal(result.probability_of_exceedance_50_years, 10);
  assert.equal(result.percentile, 50);
  assert.equal(result.unit, "g");
  assert.equal(result.pga_p50_g, 0.1);
  assert.equal(result.pga_p16_g, 0.04);
  assert.equal(result.pga_p84_g, 0.16);
  assert.equal(result.normalized_score, null);
  assert.equal(result.interpolated, false);
  assert.equal(result.sampling_method, "nearest_grid_node");
  assert.equal(result.nearest_node.id, "A");
  assert.equal(result.surrounding_nodes.length, 4);
  assert.equal(result.source.source_crs, "EPSG:4230");
  assert.equal(result.source.processed_crs, "EPSG:4326");
  assert.equal(result.source.coordinate_transform_applied, true);
  assert.equal(result.scientific_comparison.status, "not_integrated");

  result = await queryIngvSeismicExposure(
    {
      latitude: 45.0499,
      longitude: 12.0499,
    },
    {
      gridPath,
      manifestPath,
    }
  );
  assert.equal(result.status, "available");
  assert.equal(result.pga_p50_g, 0);
  assert.equal(result.nearest_node.id, "D");
  assert.equal(result.normalized_score, null);

  result = await queryIngvSeismicExposure(
    {
      latitude: 46.5,
      longitude: 12,
    },
    {
      gridPath,
      manifestPath,
    }
  );
  assert.equal(result.status, "outside_coverage");
  assert.equal(result.pga_p50_g, null);
  assert.equal(result.normalized_score, null);

  result = await queryIngvSeismicExposure(
    {
      latitude: "north",
      longitude: 12,
    },
    {
      gridPath,
      manifestPath,
    }
  );
  assert.equal(result.status, "invalid_coordinates");

  result = await queryIngvSeismicExposure(
    {
      latitude: 45,
      longitude: 12,
    },
    {
      gridPath: path.join(tmpRoot, "missing-grid.json"),
      manifestPath,
    }
  );
  assert.equal(result.status, "configuration_error");

  await writeFixture({
    manifestOverrides: {
      unit: "m/s2",
    },
    nodes: validNodes,
  });
  result = await queryIngvSeismicExposure(
    {
      latitude: 45,
      longitude: 12,
    },
    {
      gridPath,
      manifestPath,
    }
  );
  assert.equal(result.status, "schema_mismatch");

  await writeFixture({
    manifestOverrides: {
      unit: "g",
    },
    nodes: [
      validNodes[0],
      {
        ...validNodes[0],
        id: "duplicate",
      },
    ],
  });
  result = await queryIngvSeismicExposure(
    {
      latitude: 45,
      longitude: 12,
    },
    {
      gridPath,
      manifestPath,
    }
  );
  assert.equal(result.status, "schema_mismatch");

  await writeFixture({ nodes: validNodes });
  result = await queryRegisteredHazardProvider(
    "seismic",
    {
      latitude: 45,
      longitude: 12,
    },
    {
      gridPath,
      manifestPath,
      requestId: "seismic-registry-test",
    }
  );
  assert.equal(result.status, "available");
  assert.equal(result.pga_p50_g, 0.1);

  result = await evaluatePointHazardExposure(
    {
      hazards: ["seismic"],
      latitude: 45,
      longitude: 12,
      bypassCache: true,
    },
    {
      gridPath,
      manifestPath,
      requestId: "seismic-service-test",
    }
  );
  assert.equal(result.seismic.status, "available");
  assert.equal(result.seismic.pga_p50_g, 0.1);
  assert.match(result.cache.key, /seismic@ingv-mps04-grid-v1@/);
  assert.match(result.cache.key, /grid_sampling/);

  const withSeismic = await evaluatePointHazardExposure(
    {
      hazards: ["hydraulic", "landslide", "seismic"],
      latitude: 45,
      longitude: 12,
      bypassCache: true,
    },
    {
      fetchImpl: async () => ({
        headers: new Map([["content-type", "application/json"]]),
        ok: true,
        status: 200,
        statusText: "OK",
        text: async () => JSON.stringify({
          features: [],
          type: "FeatureCollection",
        }),
      }),
      gridPath,
      manifestPath,
      requestId: "seismic-multi-test",
    }
  );

  assert.equal(withSeismic.hydraulic.status, "no_intersection");
  assert.equal(withSeismic.landslide.status, "no_intersection");
  assert.equal(withSeismic.seismic.status, "available");
  assert.equal(withSeismic.seismic.normalized_score, null);
  assert.equal(withSeismic.overall_status, "available");

  const withoutSeismic = await evaluatePointHazardExposure(
    {
      hazards: ["hydraulic", "landslide"],
      latitude: 45,
      longitude: 12,
      bypassCache: true,
    },
    {
      fetchImpl: async () => ({
        headers: new Map([["content-type", "application/json"]]),
        ok: true,
        status: 200,
        statusText: "OK",
        text: async () => JSON.stringify({
          features: [],
          type: "FeatureCollection",
        }),
      }),
      requestId: "seismic-cache-key-test",
    }
  );

  assert.notEqual(withSeismic.cache.key, withoutSeismic.cache.key);
  assert.equal(Object.hasOwn(withoutSeismic, "seismic"), false);

  console.log("INGV MPS04 seismic deterministic tests passed.");
}

try {
  await main();
} finally {
  await fs.rm(tmpRoot, { force: true, recursive: true });
}
