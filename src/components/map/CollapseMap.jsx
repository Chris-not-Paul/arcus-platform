import {
  MapContainer,
  Marker,
  Popup,
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
  createProfessionalAssetIcon,
  createWatchlistIcon,
} from "../../utils/markerFactory";

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
  atlasMode = "open",
  assetMarkers = [],
  eventHazards = {},
  eventReliability = {},
  eventVulnerability = {},
  filteredEvents,
  height = "100vh",
  mapStyle = "voyager",
  professionalMode = false,
  sourcesByEvent,
  sidebarOpen,
  showHeatmap,
  showEventMarkers = true,
  showAssetMarkers = false,
  showWatchlistMarkers = false,
  watchlistMarkers = [],
}) {
  const mapStyles = {
    dark: {
      attribution: "&copy; OpenStreetMap &copy; CARTO",
      key: "dark",
      url: "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png",
    },
    light: {
      attribution: "&copy; OpenStreetMap &copy; CARTO",
      key: "light",
      url: "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png",
    },
    voyager: {
      attribution: "&copy; OpenStreetMap &copy; CARTO",
      key: "voyager",
      url: "https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png",
    },
  };

  const selectedMapStyle =
    mapStyles[mapStyle] ||
    mapStyles.voyager;

  return (

    <div
      className={`atlas-map-canvas map-style-${selectedMapStyle.key}`}
      style={{
        width: "100%",
        height,

        position: "relative",

        overflow: "hidden",

        background: "#edf1f3",
      }}
    >
      <div className="atlas-map-vignette" />
      <div className="atlas-map-grid-overlay" />

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
          key={selectedMapStyle.key}

          url={selectedMapStyle.url}

          attribution={selectedMapStyle.attribution}
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

        {showHeatmap && (
          <HeatmapLayer
            events={filteredEvents}
          />
        )}

        {/* ================================= */}
        {/* CLUSTERS */}
        {/* ================================= */}

        {showEventMarkers && (
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

                    atlasMode={atlasMode}

                    hazardProfile={
                      eventHazards[
                        event.province
                      ] || null
                    }

                    professionalMode={
                      professionalMode
                    }

                    reliability={
                      eventReliability[
                        event.event_id
                      ] || null
                    }

                    relatedSources={
                      relatedSources
                    }

                    vulnerability={
                      eventVulnerability[
                        event.event_id
                      ] || null
                    }
                  />
                );
              }
            )}

          </MarkerClusterGroup>
        )}

        {showAssetMarkers &&
          assetMarkers.map((asset) => (
            <Marker
              icon={createProfessionalAssetIcon()}
              key={asset.id}
              position={[
                asset.latitude,
                asset.longitude,
              ]}
            >
              <Popup maxWidth={300}>
                <div className="professional-map-popup">
                  <span>Asset</span>
                  <strong>{asset.name}</strong>
                  <p>
                    {asset.territory} - score{" "}
                    {asset.score} -{" "}
                    {asset.priority}
                  </p>
                </div>
              </Popup>
            </Marker>
          ))}

        {showWatchlistMarkers &&
          watchlistMarkers.map((signal) => (
            <Marker
              icon={createWatchlistIcon(signal.level)}
              key={signal.event.event_id}
              position={[
                signal.event.latitude,
                signal.event.longitude,
              ]}
            >
              <Popup maxWidth={300}>
                <div className="professional-map-popup">
                  <span>{signal.level}</span>
                  <strong>
                    {signal.event.event_id} -{" "}
                    {signal.event.municipality}
                  </strong>
                  <p>{signal.rules.join(" - ")}</p>
                </div>
              </Popup>
            </Marker>
          ))}

      </MapContainer>

    </div>
  );
}

export default CollapseMap;
