import {
  queryIngvSeismicExposure,
} from "../server/hazard/providers/ingvSeismicProvider.js";

const cases = [
  {
    label: "low-reference-area",
    latitude: 45.0703,
    longitude: 7.6869,
  },
  {
    label: "intermediate-reference-area",
    latitude: 43.6167,
    longitude: 13.5167,
  },
  {
    label: "higher-reference-area",
    latitude: 38.1113,
    longitude: 15.6473,
  },
  {
    label: "outside-coverage",
    latitude: 52,
    longitude: 7,
  },
];

const results = [];

for (const item of cases) {
  const result = await queryIngvSeismicExposure({
    latitude: item.latitude,
    longitude: item.longitude,
  });

  results.push({
    label: item.label,
    latitude: item.latitude,
    longitude: item.longitude,
    nearest_node: result.nearest_node,
    pga_p50_g: result.pga_p50_g,
    source_dataset_version: result.source?.source_dataset_version || null,
    status: result.status,
  });

  if (result.status === "configuration_error") {
    console.log(
      JSON.stringify(
        {
          message:
            "INGV MPS04 local grid is not configured. Run npm run download:ingv-mps04 and npm run build:ingv-mps04-grid before live seismic validation.",
          results,
        },
        null,
        2
      )
    );
    process.exit(0);
  }
}

const available = results.filter((item) => item.status === "available");
const outside = results.find((item) => item.label === "outside-coverage");

if (available.length < 3) {
  console.error(JSON.stringify({ results }, null, 2));
  throw new Error("Expected at least three available MPS04 live cases.");
}

if (outside?.status !== "outside_coverage") {
  console.error(JSON.stringify({ results }, null, 2));
  throw new Error("Expected the outside coverage live case to remain outside_coverage.");
}

console.log(JSON.stringify({ results }, null, 2));
