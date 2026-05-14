import {
  MapContainer,
  TileLayer,
  ZoomControl,
  useMap,
} from "react-leaflet";

import {
  useEffect,
} from "react";

import MarkerClusterGroup from "react-leaflet-cluster";

import HeatmapLayer from "./HeatmapLayer";

import EventMarker from "./EventMarker";

import {
  createClusterCustomIcon,
} from "../../utils/clusterFactory";

/* ================================= */
/* LEAFLET RESIZE FIX */
/* ================================= */

function MapResizeController({
  sidebarOpen,
}) {

  const map = useMap();

  useEffect(() => {

    const resizeMap = () => {

      map.invalidateSize({
        animate: false,
      });

      map.setView(
        map.getCenter(),
        map.getZoom(),
        {
          animate: false,
        }
      );
    };

    resizeMap();

    const timer1 =
      setTimeout(resizeMap, 100);

    const timer2 =
      setTimeout(resizeMap, 250);

    const timer3 =
      setTimeout(resizeMap, 500);

    return () => {

      clearTimeout(timer1);
      clearTimeout(timer2);
      clearTimeout(timer3);

    };

  }, [sidebarOpen, map]);

  return null;
}

/* ================================= */
/* MAIN MAP */
/* ================================= */

function CollapseMap({
  filteredEvents,
  sourcesByEvent,
  sidebarOpen,
}) {

  return (

    <div
      style={{
        width: "100%",
        height: "100vh",

        position: "relative",

        overflow: "hidden",

        background: "#edf1f3",
      }}
    >

      <MapContainer
        center={[42.8, 12.5]}

        zoom={6.35}

        minZoom={5}

        zoomControl={false}

        preferCanvas={true}

        style={{
          width: "100%",
          height: "100%",

          position: "absolute",

          inset: 0,
        }}
      >

        {/* ================================= */}
        {/* RESIZE FIX */}
        {/* ================================= */}

        <MapResizeController
          sidebarOpen={sidebarOpen}
        />

        {/* ================================= */}
        {/* BASEMAP */}
        {/* ================================= */}

        <TileLayer
          url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"

          attribution="&copy; OpenStreetMap &copy; CARTO"
        />

        {/* ================================= */}
        {/* CONTROLS */}
        {/* ================================= */}

        <ZoomControl
          position="bottomright"
        />

        {/* ================================= */}
        {/* HEATMAP */}
        {/* ================================= */}

        <HeatmapLayer
          events={filteredEvents}
        />

        {/* ================================= */}
        {/* CLUSTERS */}
        {/* ================================= */}

        <MarkerClusterGroup
          chunkedLoading

          spiderfyOnMaxZoom={true}

          showCoverageOnHover={false}

          maxClusterRadius={38}

          animate={true}

          animateAddingMarkers={true}

          iconCreateFunction={
            createClusterCustomIcon
          }
        >

          {filteredEvents.map(
            (event) => {

              const relatedSources =
                sourcesByEvent[
                  event.event_id
                ] || [];

              return (
                <EventMarker
                  key={event.event_id}

                  event={event}

                  relatedSources={
                    relatedSources
                  }
                />
              );
            }
          )}

        </MarkerClusterGroup>

      </MapContainer>

    </div>
  );
}

export default CollapseMap;