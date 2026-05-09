import { useEffect } from "react";

import { useMap } from "react-leaflet";

import L from "leaflet";

import "leaflet.heat";

function HeatmapLayer({ events }) {
  const map = useMap();

  useEffect(() => {
    if (!events.length) return;

    const heatPoints = events.map((event) => [
      event.latitude,
      event.longitude,
      1,
    ]);

    const heatLayer = L.heatLayer(heatPoints, {
      radius: 15,
      blur: 11,
      maxZoom: 5,
      minOpacity: 0.1,

      gradient: {
        0.2: "#7c8db5",
        0.4: "#9b8fb9",
        0.6: "#b57b8a",
        0.8: "#b15d5d",
        1.0: "#8f3d3d",
      },
    });

    const updateHeatmapVisibility = () => {
      const zoom = map.getZoom();

      if (zoom <= 5) {
        if (!map.hasLayer(heatLayer)) {
          map.addLayer(heatLayer);
        }
      } else {
        if (map.hasLayer(heatLayer)) {
          map.removeLayer(heatLayer);
        }
      }
    };

    updateHeatmapVisibility();

    map.on("zoomend", updateHeatmapVisibility);

    return () => {
      map.off("zoomend", updateHeatmapVisibility);

      if (map.hasLayer(heatLayer)) {
        map.removeLayer(heatLayer);
      }
    };
  }, [events, map]);

  return null;
}

export default HeatmapLayer;