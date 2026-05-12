import {
  MapContainer,
  TileLayer,
  ZoomControl,
} from "react-leaflet";

import MarkerClusterGroup from "react-leaflet-cluster";

import HeatmapLayer from "./HeatmapLayer";

import EventMarker from "./EventMarker";

import { createClusterCustomIcon } from "../../utils/clusterFactory";

function CollapseMap({
  filteredEvents,
  sourcesByEvent,
}) {
  return (
    <MapContainer
      center={[42.8, 12.5]}
      zoom={6.35}
      minZoom={5}
      zoomControl={false}
      style={{
        height: "100vh",
        width: "100%",
        flex: 1,
      }}
    >
      <ZoomControl position="bottomright" />

      <TileLayer
        url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
        attribution="&copy; OpenStreetMap &copy; CARTO"
      />

      <HeatmapLayer
        events={filteredEvents}
      />

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
        {filteredEvents.map((event) => {
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
        })}
      </MarkerClusterGroup>
    </MapContainer>
  );
}

export default CollapseMap;