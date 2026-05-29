import {
  MapContainer,
  CircleMarker,
  Marker,
  Popup,
  Rectangle,
  TileLayer,
  Tooltip,
  WMSTileLayer,
  ZoomControl,
  useMap,
  useMapEvents,
} from "react-leaflet";

import {
  useEffect,
  useMemo,
  useState,
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

const hazardOverlayColors = {
  hydraulic: "#3F6B78",
  landslide: "#B56A1D",
  seismic: "#6E858D",
  structural: "#C49040",
};

function HazardExposureOverlay({
  activeHazardOverlays,
  events,
  hazardProfiles,
}) {
  const overlayPoints = useMemo(() => {
    const provinceIndex = {};

    events.forEach((event) => {
      const latitude = Number(event.latitude);
      const longitude = Number(event.longitude);

      if (
        !event.province ||
        !Number.isFinite(latitude) ||
        !Number.isFinite(longitude)
      ) {
        return;
      }

      if (!provinceIndex[event.province]) {
        provinceIndex[event.province] = {
          count: 0,
          latitude: 0,
          longitude: 0,
          province: event.province,
        };
      }

      provinceIndex[event.province].count += 1;
      provinceIndex[event.province].latitude += latitude;
      provinceIndex[event.province].longitude += longitude;
    });

    return Object.values(provinceIndex)
      .map((province) => {
        const profile =
          hazardProfiles[province.province];

        if (!profile) {
          return null;
        }

        const activeHazards =
          (profile.hazards || [])
            .filter(
              (hazard) =>
                activeHazardOverlays[hazard.key] &&
                Number(hazard.score) > 0
            )
            .sort(
              (a, b) =>
                Number(b.score || 0) -
                Number(a.score || 0)
            );

        if (!activeHazards.length) {
          return null;
        }

        const dominant = activeHazards[0];
        const score = Number(dominant.score || 0);

        return {
          color:
            hazardOverlayColors[dominant.key] ||
            hazardOverlayColors.structural,
          count: province.count,
          label: dominant.label,
          latitude:
            province.latitude / province.count,
          longitude:
            province.longitude / province.count,
          province: province.province,
          radius:
            10 + Math.min(22, score / 4.5),
          score,
        };
      })
      .filter(Boolean);
  }, [activeHazardOverlays, events, hazardProfiles]);

  return (
    <>
      {overlayPoints.map((point) => (
        <CircleMarker
          center={[
            point.latitude,
            point.longitude,
          ]}
          fillColor={point.color}
          fillOpacity={0.16}
          key={`${point.province}-${point.label}`}
          opacity={0.72}
          radius={point.radius}
          stroke
          color={point.color}
          weight={1.4}
        >
          <Tooltip direction="top">
            <div className="arcus-hazard-tooltip">
              <strong>{point.province}</strong>
              <span>
                {point.label}: {point.score}/100
              </span>
              <small>
                {point.count} ARCUS events
              </small>
            </div>
          </Tooltip>
        </CircleMarker>
      ))}
    </>
  );
}

function AreaSelectionController({
  enabled,
  label,
  onSelectionBoundsChange,
  selectionBounds,
}) {
  const map = useMap();
  const [draftStart, setDraftStart] =
    useState(null);
  const [draftBounds, setDraftBounds] =
    useState(null);

  const normalizeBounds = (start, end) => ({
    east: Math.max(start.lng, end.lng),
    north: Math.max(start.lat, end.lat),
    south: Math.min(start.lat, end.lat),
    west: Math.min(start.lng, end.lng),
  });

  useEffect(() => {
    if (!enabled) {
      map.dragging.enable();

      const timer = setTimeout(() => {
        setDraftStart(null);
        setDraftBounds(null);
      }, 0);

      return () => clearTimeout(timer);
    }

    return undefined;
  }, [enabled, map]);

  useMapEvents({
    mousedown(event) {
      if (!enabled) {
        return;
      }

      map.dragging.disable();
      setDraftStart(event.latlng);
      setDraftBounds(null);
    },
    mousemove(event) {
      if (!enabled || !draftStart) {
        return;
      }

      setDraftBounds(
        normalizeBounds(draftStart, event.latlng)
      );
    },
    mouseup(event) {
      if (!enabled || !draftStart) {
        return;
      }

      const bounds = normalizeBounds(
        draftStart,
        event.latlng
      );

      setDraftStart(null);
      setDraftBounds(null);
      map.dragging.enable();

      if (
        Math.abs(bounds.north - bounds.south) >
          0.02 &&
        Math.abs(bounds.east - bounds.west) > 0.02
      ) {
        onSelectionBoundsChange?.(bounds);
      }
    },
  });

  const activeBounds =
    draftBounds || selectionBounds;

  if (!activeBounds) {
    return null;
  }

  return (
    <Rectangle
      bounds={[
        [activeBounds.south, activeBounds.west],
        [activeBounds.north, activeBounds.east],
      ]}
      color="#C49040"
      dashArray="8 6"
      fillColor="#C49040"
      fillOpacity={0.12}
      weight={2}
    >
      <Tooltip direction="top" sticky>
        {label || "Selected area"}
      </Tooltip>
    </Rectangle>
  );
}

/* ================================= */
/* MAIN MAP */
/* ================================= */

function CollapseMap({
  activeHazardOverlays = {},
  atlasMode = "open",
  assetMarkers = [],
  eventHazards = {},
  eventReliability = {},
  eventVulnerability = {},
  filteredEvents,
  height = "100vh",
  mapStyle = "voyager",
  professionalMode = false,
  publicWmsOverlays = [],
  onSelectionBoundsChange,
  selectionBounds = null,
  selectionEnabled = false,
  selectionLabel,
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

        <AreaSelectionController
          enabled={selectionEnabled}
          label={selectionLabel}
          onSelectionBoundsChange={
            onSelectionBoundsChange
          }
          selectionBounds={selectionBounds}
        />

        {/* ================================= */}
        {/* BASEMAP */}
        {/* ================================= */}

        <TileLayer
          key={selectedMapStyle.key}

          url={selectedMapStyle.url}

          attribution={selectedMapStyle.attribution}
        />

        {professionalMode &&
          publicWmsOverlays.map((overlay) => (
            <WMSTileLayer
              attribution={overlay.attribution}
              format="image/png"
              keepBuffer={1}
              key={overlay.id}
              layers={overlay.layers}
              opacity={overlay.opacity ?? 0.42}
              transparent
              updateWhenIdle
              updateWhenZooming={false}
              url={overlay.url}
              version={overlay.version || "1.3.0"}
            />
          ))}

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

        {professionalMode &&
          Object.values(activeHazardOverlays).some(Boolean) && (
            <HazardExposureOverlay
              activeHazardOverlays={activeHazardOverlays}
              events={filteredEvents}
              hazardProfiles={eventHazards}
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

            maxClusterRadius={34}

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
